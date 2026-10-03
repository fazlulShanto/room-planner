import test from 'node:test'
import assert from 'node:assert/strict'
import { createRoomwiseTools } from '../src/webmcp/tools.ts'
import { registerTools } from '../src/webmcp/registration.ts'
import { createWorkspaceStore } from '../src/workspace/store.ts'
import { addFloor, createProject, exampleProject } from '../src/projects.ts'

function setup(project = createProject()) {
  const store = createWorkspaceStore({
    version: 2,
    activeProjectId: project.id,
    projects: [project],
  })
  let visibleFloorId = project.floors[0].id
  const edits = []
  const tools = createRoomwiseTools(
    store,
    () => visibleFloorId,
    (edit) => {
      visibleFloorId = edit.floorId
      edits.push(edit)
    },
  )
  const call = (name, input = {}, client) =>
    tools.find((tool) => tool.name === `roomwise_${name}`).execute(input, client)
  const target = { projectId: project.id, floorId: visibleFloorId }
  const edit = (name, input = {}) => call(name, { ...target, ...input })
  const addRoom = (extra = {}) =>
    edit('add_room', {
      x: 0,
      z: 0,
      width: 144,
      depth: 120,
      name: 'Living room',
      ...extra,
    })
  return { store, tools, call, edit, addRoom, target, edits }
}

test('an agent can build, furnish, resize, paint and undo a room through the shared store', async () => {
  const { store, call, edit, addRoom, target, edits } = setup()
  const initial = store.getSnapshot().present
  const created = await addRoom()
  assert.equal(created.ok, true)
  const room = created.result.plan.rooms[0]
  assert.deepEqual([room.x, room.z, room.width, room.depth], [0, 0, 144, 120])
  assert.equal(room.name, 'Living room')
  const catalog = await call('search_catalog', { query: 'sofa' })
  assert.ok(catalog.result.items.length > 0)
  const added = await edit('add_item', {
    kind: catalog.result.items[0].kind,
    roomId: room.id,
    properties: { x: 72, z: 60, width: 60.125, color: '#112233' },
  })
  assert.equal(added.ok, true)
  const item = added.result.plan.items[0]
  assert.equal(item.width, 60.125)
  assert.equal(item.color, '#112233')
  assert.equal(store.getSnapshot().past.length, 2)
  const moved = await edit('update_item', { itemId: item.id, changes: { x: 70, rotation: 90 } })
  assert.equal(moved.ok, true)
  assert.equal(moved.result.plan.items[0].x, 70)
  const painted = await edit('set_room_finish', {
    roomId: room.id,
    surface: 'wall',
    color: '#FFAA00',
  })
  assert.equal(painted.result.plan.finishes[room.id].wall, '#ffaa00')
  assert.equal(store.getSnapshot().past.length, 4)
  assert.equal(edits.length, 4)
  for (let n = 0; n < 4; n++)
    assert.equal((await call('undo', { projectId: target.projectId })).ok, true)
  assert.deepEqual(store.getSnapshot().present, initial)
  for (let n = 0; n < 4; n++) await call('redo', { projectId: target.projectId })
  assert.deepEqual((await call('get_layout')).result.plan, painted.result.plan)
})

test('back-to-back tool calls and manual edits use fresh state without React renders', async () => {
  const { store, call, edit, target } = setup(exampleProject())
  const roomId = (await call('get_layout')).result.plan.rooms[0].id
  const responses = await Promise.all([
    edit('add_item', { kind: 'bed', roomId }),
    edit('add_item', { kind: 'chair', roomId }),
  ])
  assert.ok(responses.every((r) => r.ok))
  assert.equal((await call('get_layout')).result.plan.items.length, 5)
  store.commit((w) => ({
    ...w,
    projects: w.projects.map((p) => ({ ...p, name: 'Manual rename' })),
  }))
  assert.equal((await call('get_layout')).result.projectName, 'Manual rename')
  await call('undo', { projectId: target.projectId })
  assert.notEqual((await call('get_layout')).result.projectName, 'Manual rename')
})

test('malformed inputs cannot corrupt state or discard redo', async () => {
  const { store, call, edit, target } = setup(exampleProject())
  const item = (await call('get_layout')).result.plan.items[0]
  await edit('update_item', { itemId: item.id, changes: { x: item.x + 1 } })
  await call('undo', { projectId: target.projectId })
  const before = store.getSnapshot()
  const invalid = [
    null,
    [],
    {},
    { ...target, itemId: item.id, changes: {} },
    { ...target, itemId: item.id, changes: { width: NaN } },
    { ...target, itemId: item.id, changes: { depth: Infinity } },
    { ...target, itemId: item.id, changes: { x: '12' } },
    { ...target, itemId: item.id, changes: { width: 0 } },
    { ...target, itemId: item.id, changes: { color: 'red' } },
    { ...target, itemId: item.id, changes: { roomId: 'missing' } },
    { ...target, itemId: item.id, changes: { locked: 'false' } },
    { ...target, itemId: item.id, changes: { id: 'replacement' } },
    { ...target, itemId: 'missing', changes: { x: 12 } },
    { ...target, floorId: 'missing', itemId: item.id, changes: { x: 12 } },
    { ...target, itemId: item.id, changes: { name: ' ' } },
    { ...target, itemId: item.id, changes: { name: 'a'.repeat(121) } },
    { ...target, itemId: item.id, changes: JSON.parse('{"__proto__":{"polluted":true}}') },
  ]
  for (const input of invalid) {
    const result = await call('update_item', input)
    assert.equal(result.ok, false, JSON.stringify(input))
    assert.ok(result.error)
    assert.equal(store.getSnapshot(), before)
  }
  assert.equal((await edit('add_item', { roomId: item.roomId, kind: 'unknown' })).ok, false)
  assert.equal((await edit('add_item', { roomId: 'missing', kind: 'bed' })).ok, false)
  assert.equal(store.getSnapshot(), before)
})

test('locked furniture needs a separate unlock before editing or removal', async () => {
  const { call, edit, target } = setup(exampleProject())
  const itemId = (await call('get_layout')).result.plan.items[0].id
  await edit('update_item', { itemId, changes: { locked: true } })
  assert.equal((await edit('update_item', { itemId, changes: { x: 12, locked: false } })).ok, false)
  assert.equal((await edit('remove_item', { itemId })).ok, false)
  assert.equal((await edit('update_item', { itemId, changes: { locked: false } })).ok, true)
  assert.equal((await edit('remove_item', { itemId })).ok, true)
  assert.equal((await call('get_layout')).result.plan.items.length, 2)
  await call('undo', { projectId: target.projectId })
  assert.equal((await call('get_layout')).result.plan.items.length, 3)
})

test('placement conflicts are returned as warnings while invalid edits are rejected', async () => {
  const { edit, addRoom } = setup()
  const roomId = (await addRoom()).result.plan.rooms[0].id
  const result = await edit('add_item', { kind: 'bed', roomId, properties: { x: 1000, z: 1000 } })
  assert.equal(result.ok, true)
  assert.ok(result.result.issues.some((issue) => issue.kind === 'outside'))
})

test('tools isolate floors and reject stale project IDs after a person switches projects', async () => {
  const project = addFloor(exampleProject())
  const { store, edit, call, target, edits } = setup(project)
  const original = store.getSnapshot().present.projects[0].floors[0].plan
  const otherFloor = project.floors[1].id
  const result = await edit('add_room', { floorId: otherFloor, x: 0, z: 0, width: 144, depth: 120 })
  assert.equal(result.ok, true)
  assert.equal(edits[0].floorId, otherFloor)
  assert.equal((await call('get_layout')).result.floorId, otherFloor)
  assert.deepEqual(store.getSnapshot().present.projects[0].floors[0].plan, original)
  const otherProject = createProject()
  store.commit((w) => ({
    ...w,
    activeProjectId: otherProject.id,
    projects: [...w.projects, otherProject],
  }))
  const before = store.getSnapshot()
  assert.equal((await edit('remove_item', { itemId: original.items[0].id })).ok, false)
  assert.equal((await call('undo', { projectId: target.projectId })).ok, false)
  assert.equal(store.getSnapshot(), before)
  assert.equal((await call('get_layout')).result.projectId, otherProject.id)
})

test('read tools have no side effects and returned objects cannot mutate source state', async () => {
  const { store, tools, call, edits } = setup(exampleProject())
  const before = store.getSnapshot()
  const layout = await call('get_layout')
  layout.result.plan.items[0].width = 999
  const catalog = await call('search_catalog')
  catalog.result.items[0].width = 999
  assert.notEqual((await call('get_layout')).result.plan.items[0].width, 999)
  assert.notEqual((await call('search_catalog')).result.items[0].width, 999)
  assert.equal(store.getSnapshot(), before)
  assert.equal(edits.length, 0)
  assert.deepEqual(
    tools.filter((t) => t.annotations.readOnlyHint).map((t) => t.name),
    ['roomwise_get_layout', 'roomwise_search_catalog'],
  )
  assert.equal(new Set(tools.map((t) => t.name)).size, tools.length)
})

test('room dimensions, shared walls and failed room creation preserve atomic history', async () => {
  const { store, addRoom } = setup()
  await addRoom()
  const before = store.getSnapshot()
  assert.equal((await addRoom()).ok, false)
  assert.equal(store.getSnapshot(), before)
  const adjacent = await addRoom({ x: 150, name: 'Bedroom' })
  assert.equal(adjacent.ok, true)
  assert.equal(adjacent.result.plan.rooms.length, 2)
  assert.equal(adjacent.result.plan.walls.length, 7)
  const after = store.getSnapshot()
  assert.equal((await addRoom({ x: 4800, width: 144 })).ok, true)
  store.undo()
  assert.deepEqual(store.getSnapshot().present, after.present)
  const beforeInvalid = store.getSnapshot()
  assert.equal((await addRoom({ x: 4900, width: 2400 })).ok, false)
  assert.equal(store.getSnapshot(), beforeInvalid)
})

test('opening tools share fit, overlap validation, deletion and undo behavior', async () => {
  const { store, edit, call, addRoom, target } = setup()
  const wallId = (await addRoom()).result.plan.walls[0].id
  const added = await edit('add_opening', { wallId, kind: 'door', center: 60, width: 32 })
  assert.equal(added.ok, true)
  const openingId = added.result.plan.openings[0].id
  const before = store.getSnapshot()
  assert.equal((await edit('add_opening', { wallId, kind: 'window', center: 60 })).ok, false)
  assert.equal((await edit('update_opening', { openingId, changes: { width: 1000 } })).ok, false)
  assert.equal((await edit('update_opening', { openingId, changes: { sill: 100 } })).ok, false)
  assert.equal((await edit('remove_opening', { openingId: 'missing' })).ok, false)
  assert.equal(store.getSnapshot(), before)
  const changed = await edit('update_opening', {
    openingId,
    changes: { center: 0, hinge: 'end', swing: -1 },
  })
  assert.equal(changed.ok, true)
  assert.equal(changed.result.plan.openings[0].center, 16)
  assert.equal(changed.result.plan.openings[0].hinge, 'end')
  assert.equal((await edit('remove_opening', { openingId })).result.plan.openings.length, 0)
  assert.equal((await call('undo', { projectId: target.projectId })).result.plan.openings.length, 1)
})

test('washrooms cannot be painted and cancelled actions do not edit', async () => {
  const { store, edit, call, target } = setup(exampleProject())
  const before = store.getSnapshot()
  assert.equal(
    (await edit('set_room_finish', { roomId: 'bath1', surface: 'wall', color: '#123456' })).ok,
    false,
  )
  const controller = new AbortController()
  controller.abort()
  const result = await call(
    'remove_item',
    { ...target, itemId: 'bed-room3' },
    { signal: controller.signal },
  )
  assert.equal(result.ok, false)
  assert.equal(store.getSnapshot(), before)
})

function mockContext(failAt = -1) {
  const registered = new Map()
  let count = 0
  return {
    registered,
    async registerTool(tool, { signal }) {
      signal.throwIfAborted()
      if (count++ === failAt) throw new Error('Registration refused')
      assert.equal(registered.has(tool.name), false, 'duplicate registration')
      registered.set(tool.name, tool)
      signal.addEventListener('abort', () => registered.delete(tool.name), { once: true })
    },
  }
}

test('registration uses abort signals for cleanup and remounting', async () => {
  const { tools } = setup()
  const context = mockContext()
  const first = new AbortController()
  await registerTools(context, tools, first)
  assert.equal(context.registered.size, tools.length)
  first.abort()
  assert.equal(context.registered.size, 0)
  const second = new AbortController()
  await registerTools(context, tools, second)
  assert.equal(context.registered.size, tools.length)
  second.abort()
  assert.equal(context.registered.size, 0)
})

test('partial registration failure and unmount during registration leave no tools behind', async () => {
  const { tools } = setup()
  const context = mockContext(3)
  const controller = new AbortController()
  await assert.rejects(registerTools(context, tools, controller), /Registration refused/)
  assert.equal(context.registered.size, 0)
  assert.equal(controller.signal.aborted, true)
  const pendingContext = mockContext()
  const pendingController = new AbortController()
  const pending = registerTools(pendingContext, tools, pendingController)
  pendingController.abort()
  await assert.rejects(pending)
  assert.equal(pendingContext.registered.size, 0)
  await assert.rejects(registerTools(pendingContext, tools, pendingController))
  assert.equal(pendingContext.registered.size, 0)
})
