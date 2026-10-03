import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createInitialPlan,
  doorLeaf,
  hingeSideLabels,
  wallBlocks,
  checkItem,
  parsePlan,
} from '../src/model.ts'
import { createWalkSpace } from '../src/walk.ts'

test('kitchen starts as an open passage and Room 1 hinges away from the dividing wall', () => {
  const plan = createInitialPlan(),
    kitchen = plan.openings.find((o) => o.id === 'kitchen-door'),
    bedroom = plan.openings.find((o) => o.id === 'room1-door')
  assert.equal(kitchen.kind, 'passage')
  assert.equal(kitchen.width, 33)
  assert.equal(doorLeaf(kitchen), null)
  assert.equal(bedroom.hinge, 'end')
  assert.equal(bedroom.swing, 1)
})

test('either hinge opens into the same side of the wall, in both swing directions', () => {
  const original = createInitialPlan().openings.find((o) => o.id === 'room1-door')
  for (const swing of [1, -1])
    for (const hinge of ['start', 'end']) {
      const leaf = doorLeaf({ ...original, hinge, swing })
      // Project the 3D leaf tip after rotation; the 2D leaf uses the same hinge and swing.
      const x = leaf.hingeOffset + Math.cos(leaf.rotation) * leaf.direction * original.width
      const z = -Math.sin(leaf.rotation) * leaf.direction * original.width
      assert.ok(Math.abs(x - (hinge === 'end' ? 18.5 : -18.5)) < 1e-9)
      assert.ok(Math.abs(z - swing * original.width) < 1e-9)
    }
  assert.equal(hingeSideLabels({ from: [123, 217], to: [123, 451] }).end, 'Bottom')
  assert.equal(hingeSideLabels({ from: [50, 0], to: [0, 0] }).start, 'Right')
})

test('removing a door keeps its exact wall opening and removes only its swing warning', () => {
  const plan = createInitialPlan(),
    opening = plan.openings.find((o) => o.id === 'room1-door'),
    wall = plan.walls.find((w) => w.id === opening.wallId)
  const blocks = wallBlocks(wall, plan.openings, plan.ceiling)
  const item = {
    ...plan.items[0],
    id: 'clearance-test',
    roomId: 'room1',
    x: 105,
    z: 347.5,
    width: 8,
    depth: 8,
    height: 24,
  }
  assert.ok(checkItem(item, plan).some((i) => i.kind === 'door'))
  opening.kind = 'passage'
  assert.deepEqual(wallBlocks(wall, plan.openings, plan.ceiling), blocks)
  assert.equal(
    checkItem(item, plan).some((i) => i.kind === 'door'),
    false,
  )
  assert.equal(doorLeaf(opening), null)
  opening.kind = 'door'
  assert.equal(doorLeaf(opening).hingeOffset, 18.5)
})

test('walk mode crosses doorless kitchen openings', () => {
  const space = createWalkSpace(createInitialPlan())
  assert.ok(space.canStand(79.5, 70))
  assert.deepEqual(space.move([79.5, 55], 0, 30), [79.5, 85])
})

test('older saved doors retain their original hinge while new door settings round-trip', () => {
  const plan = createInitialPlan(),
    room1 = plan.openings.find((o) => o.id === 'room1-door')
  delete room1.hinge
  const loaded = parsePlan(JSON.stringify(plan))
  assert.equal(doorLeaf(loaded.openings.find((o) => o.id === room1.id)).hingeOffset, -18.5)
  room1.hinge = 'end'
  assert.deepEqual(parsePlan(JSON.stringify(plan)), plan)
})

test('imports reject invalid hinge sides and opening types', () => {
  const plan = createInitialPlan()
  plan.openings[0].hinge = 'diagonal'
  assert.throws(() => parsePlan(JSON.stringify(plan)))
  delete plan.openings[0].hinge
  plan.openings[0].kind = 'missing'
  assert.throws(() => parsePlan(JSON.stringify(plan)))
})
