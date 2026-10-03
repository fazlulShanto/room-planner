import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkspaceStore } from '../src/workspace/store.ts'
import { createProject, exampleProject, parseProject, addFloor } from '../src/projects.ts'
import { changeItem, changeOpening, duplicateItem } from '../src/editor/planCommands.ts'

function setup() {
  const project = exampleProject()
  const initial = { version: 2, activeProjectId: project.id, projects: [project] }
  const store = createWorkspaceStore(initial)
  const edit = (update) => (workspace) => ({
    ...workspace,
    projects: workspace.projects.map((p) =>
      p.id === project.id
        ? {
            ...p,
            floors: p.floors.map((floor, i) =>
              i === 0 ? { ...floor, plan: update(floor.plan) } : floor,
            ),
          }
        : p,
    ),
  })
  return { store, initial, project, edit }
}
const planOf = (workspace) => workspace.projects[0].floors[0].plan

test('edits, undo, redo and exported projects retain exact measurements', () => {
  const { store, initial, edit } = setup()
  store.commit(edit((p) => changeItem(p, p.items[0].id, { width: 61.125 })))
  const changed = store.getSnapshot().present
  assert.equal(planOf(changed).items[0].width, 61.125)
  assert.deepEqual(parseProject(JSON.stringify(changed.projects[0])), changed.projects[0])
  store.undo()
  assert.equal(store.getSnapshot().present, initial)
  store.redo()
  assert.equal(store.getSnapshot().present, changed)
})

test('no-op edits preserve redo and do not notify subscribers', () => {
  const { store, edit } = setup()
  store.commit(edit((p) => ({ ...p, ceiling: 110 })))
  store.undo()
  const before = store.getSnapshot()
  let notifications = 0
  const unsubscribe = store.subscribe(() => notifications++)
  store.commit((w) => structuredClone(w))
  assert.equal(store.getSnapshot(), before)
  assert.equal(notifications, 0)
  store.redo()
  assert.equal(notifications, 1)
  unsubscribe()
  store.undo()
  assert.equal(notifications, 1)
})

test('many drag previews produce one undo step and discard old redo', () => {
  const { store, initial, edit } = setup()
  store.commit(edit((p) => ({ ...p, ceiling: 120 })))
  store.undo()
  store.beginTransaction()
  for (let x = 100; x < 120; x++) store.preview(edit((p) => changeItem(p, p.items[0].id, { x })))
  assert.equal(store.getSnapshot().past.length, 0)
  store.endTransaction()
  assert.equal(store.getSnapshot().past.length, 1)
  assert.equal(store.getSnapshot().future.length, 0)
  const moved = store.getSnapshot().present
  store.undo()
  assert.equal(store.getSnapshot().present, initial)
  store.redo()
  assert.equal(store.getSnapshot().present, moved)
})

test('a cancelled or unchanged drag does not add history', () => {
  const { store, initial } = setup()
  store.beginTransaction()
  store.preview((w) => structuredClone(w))
  store.endTransaction()
  assert.equal(store.getSnapshot().present, initial)
  assert.equal(store.getSnapshot().past.length, 0)
})

test('undo during a drag finalizes it, and late pointer events are ignored', () => {
  const { store, initial, edit } = setup()
  store.beginTransaction()
  store.preview(edit((p) => changeItem(p, p.items[0].id, { x: 111 })))
  store.undo()
  assert.equal(store.getSnapshot().present, initial)
  store.preview(edit((p) => changeItem(p, p.items[0].id, { x: 222 })))
  store.endTransaction()
  assert.equal(store.getSnapshot().present, initial)
  store.redo()
  assert.equal(planOf(store.getSnapshot().present).items[0].x, 111)
})

test('invalid keyboard, duplication and drag changes never enter history or saved state', () => {
  const { store, edit } = setup()
  store.commit(edit((p) => changeItem(p, p.items[0].id, { x: 5000 })))
  const before = store.getSnapshot()
  assert.throws(() => store.commit(edit((p) => changeItem(p, p.items[0].id, { x: 5001 }))))
  assert.throws(() =>
    store.commit(edit((p) => ({ ...p, items: [...p.items, duplicateItem(p.items[0])] }))),
  )
  assert.equal(store.getSnapshot(), before)
  store.beginTransaction()
  assert.throws(() => store.preview(edit((p) => changeItem(p, p.items[0].id, { z: Infinity }))))
  store.endTransaction()
  assert.equal(store.getSnapshot(), before)
})

test('history is bounded and a fresh edit clears the redo branch', () => {
  const { store, edit } = setup()
  for (let n = 0; n < 70; n++) store.commit(edit((p) => ({ ...p, ceiling: 110 + n })))
  assert.equal(store.getSnapshot().past.length, 60)
  store.undo()
  store.commit(edit((p) => ({ ...p, ceiling: 200 })))
  assert.equal(store.getSnapshot().future.length, 0)
  assert.equal(store.getSnapshot().past.length, 60)
})

test('project and floor edits remain isolated and undoable', () => {
  const { store, project } = setup()
  const other = createProject()
  store.commit((w) => ({ ...w, activeProjectId: other.id, projects: [...w.projects, other] }))
  store.commit((w) => ({
    ...w,
    projects: w.projects.map((p) => (p.id === other.id ? addFloor(p) : p)),
  }))
  assert.equal(store.getSnapshot().present.projects[0], project)
  assert.equal(store.getSnapshot().present.projects[1].floors.length, 2)
  store.undo()
  assert.equal(store.getSnapshot().present.projects[1].floors.length, 1)
  store.undo()
  assert.equal(store.getSnapshot().present.activeProjectId, project.id)
})

test('opening edits clamp to their wall, reject overlap and preserve undo on failure', () => {
  const { store, edit } = setup()
  const first = planOf(store.getSnapshot().present).openings[0]
  store.commit(edit((p) => changeOpening(p, first.id, { center: -100 })))
  assert.equal(planOf(store.getSnapshot().present).openings[0].center, 19.5)
  const before = store.getSnapshot()
  assert.throws(() => store.commit(edit((p) => changeOpening(p, first.id, { width: 1000 }))))
  assert.equal(store.getSnapshot(), before)
  const sameWall = planOf(before.present).openings.find(
    (o) => o.wallId === first.wallId && o.id !== first.id,
  )
  assert.throws(() =>
    store.commit(edit((p) => changeOpening(p, sameWall.id, { roomId: '', center: 20 }))),
  )
  assert.equal(store.getSnapshot(), before)
})
