import test from 'node:test'
import assert from 'node:assert/strict'
import { createInitialPlan, parsePlan } from '../src/model.ts'
import {
  createWalkSpace,
  walkDelta,
  WALK_EYE_HEIGHT,
  walkEyeHeight,
  canCloseDoor,
} from '../src/walk.ts'

test('walk starts at a clear position in each measured room', () => {
  const plan = createInitialPlan(),
    space = createWalkSpace(plan)
  assert.equal(WALK_EYE_HEIGHT, 65)
  for (const room of plan.rooms) assert.ok(space.canStand(...space.start(room.id)), room.name)
})
test('walking can pass through a door threshold between rooms', () => {
  const space = createWalkSpace(createInitialPlan())
  assert.ok(space.canStand(143.5, 217))
  assert.deepEqual(space.move([143.5, 205], 0, 30), [143.5, 235])
  assert.deepEqual(space.move([110, 296.5], 32, 0), [142, 296.5])
})
test('solid walls, window sills, furniture, and the outside are impassable', () => {
  const space = createWalkSpace(createInitialPlan())
  for (const point of [
    [-3, 143.5],
    [43, 143.5],
    [209, 143.5],
    [-100, 150],
  ])
    assert.equal(space.canStand(...point), false)
})
test('long movement cannot tunnel through a wall, and can slide along it', () => {
  const space = createWalkSpace(createInitialPlan())
  const [x, z] = space.move([180, 100], 1000, 0)
  assert.ok(x <= 198.01)
  assert.equal(z, 100)
  const slid = space.move([x, z], 20, 30)
  assert.ok(slid[0] <= 198.01)
  assert.ok(Math.abs(slid[1] - 130) < 0.001)
})
test('walking respects head clearance below mounted cabinets', () => {
  const plan = createInitialPlan(),
    space = createWalkSpace(plan)
  const [x, z] = space.start('room3')
  plan.items.push({
    ...plan.items[0],
    id: 'cabinet-test',
    kind: 'cabinet',
    x,
    z,
    width: 24,
    depth: 24,
    height: 20,
    elevation: 80,
  })
  assert.ok(createWalkSpace(plan).canStand(x, z))
  plan.items.at(-1).elevation = 54
  assert.equal(createWalkSpace(plan).canStand(x, z), false)
})
test('walking follows camera yaw without faster diagonal movement', () => {
  assert.deepEqual(walkDelta(0, 1, 0, 48), [0, -48])
  const right = walkDelta(Math.PI / 2, 1, 0, 48)
  assert.ok(Math.abs(right[0] + 48) < 0.001)
  assert.ok(Math.abs(right[1]) < 0.001)
  assert.ok(Math.abs(Math.hypot(...walkDelta(0.8, 1, 1, 48)) - 48) < 0.001)
})

test('walking height defaults to 5 feet 5 inches, saves, and stays below the ceiling', () => {
  const plan = createInitialPlan()
  assert.equal(walkEyeHeight(plan), 65)
  plan.walkHeight = 74
  assert.equal(walkEyeHeight(parsePlan(JSON.stringify(plan))), 74)
  assert.equal(walkEyeHeight({ ...plan, ceiling: 60 }), 58)
  assert.throws(() => parsePlan(JSON.stringify({ ...plan, walkHeight: 200 })))
})
test('head clearance follows the selected eye height', () => {
  const plan = createInitialPlan(),
    [x, z] = createWalkSpace(plan).start('room3')
  plan.items.push({
    ...plan.items[0],
    id: 'overhead',
    kind: 'cabinet',
    x,
    z,
    width: 24,
    depth: 24,
    height: 20,
    elevation: 60,
  })
  assert.equal(createWalkSpace(plan, 42).canStand(x, z), true)
  assert.equal(createWalkSpace(plan, 74).canStand(x, z), false)
})
test('closing a door blocks its threshold and opening it restores passage', () => {
  const plan = createInitialPlan(),
    closed = new Set(['room3-door'])
  assert.equal(createWalkSpace(plan, 65, closed).canStand(143.5, 217), false)
  const stopped = createWalkSpace(plan, 65, closed).move([143.5, 205], 0, 30)
  assert.ok(stopped[1] < 210)
  assert.deepEqual(createWalkSpace(plan, 65, new Set()).move([143.5, 205], 0, 30), [143.5, 235])
  assert.equal(canCloseDoor(plan, 'room3-door', [143.5, 217]), false)
  assert.equal(canCloseDoor(plan, 'room3-door', [143.5, 200]), true)
  assert.equal(canCloseDoor(plan, 'kitchen-door', [20, 100]), false)
})
