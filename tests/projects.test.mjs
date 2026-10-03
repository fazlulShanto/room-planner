import test from 'node:test'
import assert from 'node:assert/strict'
import { createInitialPlan, parsePlan, validatePlan } from '../src/model.ts'
import {
  addFloor,
  blankPlan,
  createProject,
  LEGACY_KEY,
  loadWorkspace,
  parseProject,
  validateProject,
  validateWorkspace,
  WORKSPACE_KEY,
} from '../src/projects.ts'

const workspaceFor = (project) => ({ version: 2, activeProjectId: project.id, projects: [project] })
function memoryStorage(initial = {}, rejectWrite = () => false) {
  const values = new Map(Object.entries(initial)),
    writes = []
  return {
    values,
    writes,
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      writes.push(key)
      if (rejectWrite(key, value)) throw new Error('Storage quota exceeded')
      values.set(key, value)
    },
  }
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

test('valid edits use the same invariant checks as imported plans without mutating the plan', () => {
  const plan = freeze(createInitialPlan())
  assert.equal(validatePlan(plan), plan)
  const project = freeze(createProject(plan)),
    workspace = freeze(workspaceFor(project))
  assert.equal(validateProject(project), project)
  assert.equal(validateWorkspace(workspace), workspace)
  assert.deepEqual(parsePlan(JSON.stringify(plan)), plan)
  assert.deepEqual(parseProject(JSON.stringify(project)), project)
})

test('invalid furniture edits are rejected before they can become saved workspace data', () => {
  for (const patch of [
    { name: '' },
    { x: 5001 },
    { z: -5001 },
    { width: 0 },
    { roomId: 'missing' },
    { rotation: Infinity },
  ]) {
    const plan = createInitialPlan()
    plan.items[0] = { ...plan.items[0], ...patch }
    assert.throws(() => validatePlan(plan))
    assert.throws(() => validateWorkspace(workspaceFor(createProject(plan))))
    assert.throws(() => parsePlan(JSON.stringify(plan)))
  }
})

test('the maximum number of furniture items survives saving and the next add is rejected', () => {
  const plan = createInitialPlan(),
    item = plan.items[0]
  plan.items = Array.from({ length: 500 }, (_, index) => ({ ...item, id: `item-${index}` }))
  const workspace = workspaceFor(createProject(plan))
  assert.equal(validateWorkspace(workspace), workspace)
  const saved = JSON.stringify(workspace),
    result = loadWorkspace(memoryStorage({ [WORKSPACE_KEY]: saved }))
  assert.deepEqual(result.workspace, workspace)
  assert.equal(result.canSave, true)
  assert.equal(result.message, '')
  plan.items.push({ ...item, id: 'one-too-many' })
  assert.throws(() => validatePlan(plan), /invalid or duplicate records/)
})

test('plan names and duplicate IDs are validated for in-memory edits', () => {
  const plan = createInitialPlan()
  assert.throws(() => validatePlan({ ...plan, name: '' }), /supported Roomwise layout/)
  assert.throws(
    () => validatePlan({ ...plan, items: [...plan.items, { ...plan.items[0] }] }),
    /duplicate/,
  )
})

test('project and floor edits reject empty names, missing floors and duplicate floor IDs', () => {
  const project = addFloor(createProject(createInitialPlan()))
  for (const next of [
    { ...project, name: '' },
    { ...project, floors: [] },
    { ...project, floors: project.floors.map((floor) => ({ ...floor, name: ' ' })) },
    { ...project, floors: [project.floors[0], { ...project.floors[1], id: project.floors[0].id }] },
  ])
    assert.throws(() => validateProject(next))
})

test('workspace edits reject duplicate projects, too many projects and a missing active project', () => {
  const project = createProject(),
    workspace = workspaceFor(project)
  assert.throws(
    () => validateWorkspace({ ...workspace, projects: [project, project] }),
    /duplicate/,
  )
  assert.throws(
    () => validateWorkspace({ ...workspace, activeProjectId: 'missing' }),
    /active project/,
  )
  const projects = Array.from({ length: 20 }, () => createProject())
  assert.equal(
    validateWorkspace({ ...workspace, activeProjectId: projects[0].id, projects }).projects.length,
    20,
  )
  assert.throws(() => validateWorkspace({ ...workspace, projects: [...projects, createProject()] }))
})

test('multiple floors round-trip with finishes and lighting and copied plans remain independent', () => {
  const plan = createInitialPlan()
  plan.finishes = { room3: { wall: '#aabbcc', floor: '#ccbbaa' } }
  plan.lighting = { hour: 18.5, shadows: true }
  plan.walkHeight = 62
  const project = createProject(plan),
    next = addFloor(project, project.floors[0])
  next.floors[1].plan.items[0].width = 60.125
  assert.equal(project.floors[0].plan.items[0].width, 60)
  const workspace = workspaceFor(next),
    result = loadWorkspace(memoryStorage({ [WORKSPACE_KEY]: JSON.stringify(workspace) }))
  assert.deepEqual(parseProject(JSON.stringify(next)), next)
  assert.deepEqual(result.workspace, workspace)
  assert.equal(result.canSave, true)
})

test('the existing version one layout import remains supported', () => {
  const plan = createInitialPlan(),
    project = parseProject(JSON.stringify(plan))
  assert.equal(project.version, 2)
  assert.equal(project.name, plan.name)
  assert.deepEqual(project.floors[0].plan, plan)
  assert.equal(project.floors[0].name, 'Ground floor')
})

test('project imports retain the size limit for each nested floor plan', () => {
  const project = createProject({ ...blankPlan(), extension: 'x'.repeat(2_000_000) })
  const saved = JSON.stringify(project)
  assert.ok(saved.length < 20_000_000)
  assert.equal(validateProject(project), project)
  assert.throws(() => parseProject(saved), /layout file is too large/)
})

test('a valid legacy layout loads into a workspace without modifying browser storage', () => {
  const plan = createInitialPlan(),
    saved = JSON.stringify(plan),
    storage = memoryStorage({ [LEGACY_KEY]: saved })
  const result = loadWorkspace(storage)
  assert.deepEqual(result.workspace.projects[0].floors[0].plan, plan)
  assert.equal(result.canSave, true)
  assert.equal(result.message, '')
  assert.deepEqual(storage.writes, [])
  assert.equal(storage.values.get(LEGACY_KEY), saved)
})

test('first run returns a valid blank workspace', () => {
  const storage = memoryStorage(),
    result = loadWorkspace(storage)
  assert.equal(validateWorkspace(result.workspace), result.workspace)
  assert.deepEqual(result.workspace.projects[0].floors[0].plan, blankPlan())
  assert.equal(result.canSave, true)
  assert.equal(result.message, '')
  assert.deepEqual(storage.writes, [])
})

test('corrupt workspaces are preserved byte for byte before the blank fallback can be saved', () => {
  const project = createProject(),
    workspace = workspaceFor(project)
  const invalidProject = {
    ...project,
    floors: [{ ...project.floors[0], plan: { ...blankPlan(), ceiling: -1 } }],
  }
  for (const saved of [
    'not JSON',
    'null',
    JSON.stringify({ ...workspace, activeProjectId: 'missing' }),
    JSON.stringify({ ...workspace, projects: [project, project] }),
    JSON.stringify(workspaceFor(invalidProject)),
  ]) {
    const storage = memoryStorage({ [WORKSPACE_KEY]: saved }),
      result = loadWorkspace(storage)
    assert.equal(storage.values.get(`${WORKSPACE_KEY}-recovery`), saved)
    assert.equal(storage.values.get(WORKSPACE_KEY), saved)
    assert.deepEqual(storage.writes, [`${WORKSPACE_KEY}-recovery`])
    assert.equal(validateWorkspace(result.workspace), result.workspace)
    assert.equal(result.canSave, true)
    assert.match(result.message, /recovery copy was kept/)
  }
})

test('a recovery quota failure blocks autosave and leaves the unreadable original intact', () => {
  const saved = '{broken workspace',
    storage = memoryStorage({ [WORKSPACE_KEY]: saved }, (key) => key.endsWith('-recovery'))
  const result = loadWorkspace(storage)
  assert.equal(result.canSave, false)
  assert.match(result.message, /Autosave is paused to preserve the original/)
  assert.equal(storage.values.get(WORKSPACE_KEY), saved)
  assert.equal(storage.values.has(`${WORKSPACE_KEY}-recovery`), false)
  assert.deepEqual(storage.writes, [`${WORKSPACE_KEY}-recovery`])
  assert.equal(validateWorkspace(result.workspace), result.workspace)
})

test('valid legacy fallback does not re-enable autosave after workspace recovery fails', () => {
  const saved = 'broken workspace',
    plan = createInitialPlan()
  const storage = memoryStorage(
    { [WORKSPACE_KEY]: saved, [LEGACY_KEY]: JSON.stringify(plan) },
    (key) => key === `${WORKSPACE_KEY}-recovery`,
  )
  const result = loadWorkspace(storage)
  assert.deepEqual(result.workspace.projects[0].floors[0].plan, plan)
  assert.equal(result.canSave, false)
  assert.match(result.message, /Autosave is paused/)
  assert.equal(storage.values.get(WORKSPACE_KEY), saved)
})

test('later successful legacy recovery does not hide an earlier blocked workspace recovery', () => {
  const storage = memoryStorage(
    { [WORKSPACE_KEY]: 'broken workspace', [LEGACY_KEY]: 'broken layout' },
    (key) => key === `${WORKSPACE_KEY}-recovery`,
  )
  const result = loadWorkspace(storage)
  assert.equal(result.canSave, false)
  assert.match(result.message, /Saved workspace.*Autosave is paused/)
  assert.equal(storage.values.get(`${LEGACY_KEY}-recovery`), 'broken layout')
})

test('invalid legacy layouts keep recovery copies and a failed copy blocks autosave', () => {
  const saved = 'broken layout'
  const successful = memoryStorage({ [LEGACY_KEY]: saved }),
    recovered = loadWorkspace(successful)
  assert.equal(successful.values.get(`${LEGACY_KEY}-recovery`), saved)
  assert.equal(recovered.canSave, true)
  assert.match(recovered.message, /recovery copy was kept/)
  const failed = memoryStorage({ [LEGACY_KEY]: saved }, () => true),
    blocked = loadWorkspace(failed)
  assert.equal(blocked.canSave, false)
  assert.match(blocked.message, /Autosave is paused/)
  assert.equal(failed.values.get(LEGACY_KEY), saved)
})

test('unavailable storage blocks autosave instead of silently initializing a saved blank workspace', () => {
  const result = loadWorkspace({
    getItem() {
      throw new Error('Storage disabled')
    },
    setItem() {
      assert.fail('Cannot save after a failed read')
    },
  })
  assert.equal(result.canSave, false)
  assert.match(result.message, /Browser storage is unavailable/)
  assert.match(result.message, /Autosave is paused/)
  assert.equal(validateWorkspace(result.workspace), result.workspace)
})
