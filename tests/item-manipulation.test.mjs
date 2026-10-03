import test from 'node:test'
import assert from 'node:assert/strict'
import { corners, createInitialPlan } from '../src/model.ts'
import { exampleProject } from '../src/projects.ts'
import { createWorkspaceStore } from '../src/workspace/store.ts'
import {
  moveFromDrag,
  resizeFromDrag,
  RESIZE_HANDLES,
  transformItem,
} from '../src/editor/itemManipulation.ts'

const item = { ...createInitialPlan().items[0], x: 100, z: 100, width: 60, depth: 84, rotation: 0 }
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.0001, `${a} != ${b}`)

test('moving uses the original grab offset, with inch or fractional snapping', () => {
  assert.deepEqual(moveFromDrag(item, [12.37, -4.52], true), {
    x: 112,
    z: 95,
    width: 60,
    depth: 84,
  })
  assert.deepEqual(moveFromDrag(item, [12.37, -4.52], false), {
    x: 112.37,
    z: 95.48,
    width: 60,
    depth: 84,
  })
  assert.equal(moveFromDrag(item, [10000, -10000], true).x, 5000)
  assert.equal(moveFromDrag(item, [10000, -10000], true).z, -5000)
})

test('edge grips resize one dimension and keep the opposite edge fixed', () => {
  const width = resizeFromDrag(item, RESIZE_HANDLES[3], [12, 30], true)
  assert.deepEqual(width, { x: 106, z: 100, width: 72, depth: 84 })
  near(width.x - width.width / 2, item.x - item.width / 2)
  const depth = resizeFromDrag(item, RESIZE_HANDLES[1], [40, -8], true)
  assert.deepEqual(depth, { x: 100, z: 96, width: 60, depth: 92 })
  near(depth.z + depth.depth / 2, item.z + item.depth / 2)
})

test('every corner resizes along rotated local axes and anchors its opposite corner', () => {
  for (const rotation of [0, 30, 90, 135, 270]) {
    const original = { ...item, rotation }
    const c = Math.cos((rotation * Math.PI) / 180),
      s = Math.sin((rotation * Math.PI) / 180)
    for (const index of [0, 2, 4, 6]) {
      const handle = RESIZE_HANDLES[index]
      const dx = handle.x * 12,
        dz = handle.z * 8
      const resized = resizeFromDrag(original, handle, [c * dx + s * dz, -s * dx + c * dz], false)
      assert.equal(resized.width, 72)
      assert.equal(resized.depth, 92)
      const opposite = (index / 2 + 2) % 4
      const before = corners(original)[opposite],
        after = corners({ ...original, ...resized })[opposite]
      near(before[0], after[0])
      near(before[1], after[1])
    }
  }
})

test('handles cannot flip an item or exceed valid dimension limits', () => {
  const minimum = resizeFromDrag(item, RESIZE_HANDLES[4], [-1000, -1000], true)
  assert.equal(minimum.width, 0.25)
  assert.equal(minimum.depth, 0.25)
  near(minimum.x - minimum.width / 2, item.x - item.width / 2)
  const maximum = resizeFromDrag(item, RESIZE_HANDLES[4], [2000, 2000], true)
  assert.equal(maximum.width, 1200)
  assert.equal(maximum.depth, 1200)
})

test('dragging between rooms updates the assignment, and locked items cannot change', () => {
  const plan = createInitialPlan(),
    original = plan.items[0]
  const room = plan.rooms.find((r) => r.id !== original.roomId)
  const patch = {
    x: room.x + room.width / 2,
    z: room.z + room.depth / 2,
    width: original.width,
    depth: original.depth,
  }
  assert.equal(transformItem(plan, original.id, patch).items[0].roomId, room.id)
  const outside = { ...patch, x: -4000, z: -4000 }
  assert.equal(transformItem(plan, original.id, outside).items[0].roomId, original.roomId)
  const locked = { ...plan, items: [{ ...original, locked: true }] }
  assert.deepEqual(transformItem(locked, original.id, patch), locked)
})

test('a resize gesture creates one undo step and preserves height, rotation and elevation', () => {
  const project = exampleProject()
  const store = createWorkspaceStore({
    version: 2,
    activeProjectId: project.id,
    projects: [project],
  })
  const original = project.floors[0].plan.items[0]
  const before = store.getSnapshot().present
  store.beginTransaction()
  for (let dx = 1; dx <= 12; dx++) {
    const patch = resizeFromDrag(original, RESIZE_HANDLES[4], [dx, 8], true)
    store.preview((w) => ({
      ...w,
      projects: [
        {
          ...project,
          floors: project.floors.map((f, i) =>
            i ? f : { ...f, plan: transformItem(f.plan, original.id, patch) },
          ),
        },
      ],
    }))
  }
  store.endTransaction()
  assert.equal(store.getSnapshot().past.length, 1)
  const after = store.getSnapshot().present
  const resized = after.projects[0].floors[0].plan.items[0]
  assert.equal(resized.height, original.height)
  assert.equal(resized.rotation, original.rotation)
  assert.equal(resized.elevation, original.elevation)
  assert.notEqual(resized.width, original.width)
  store.undo()
  assert.deepEqual(store.getSnapshot().present, before)
  store.redo()
  assert.deepEqual(store.getSnapshot().present, after)
})
