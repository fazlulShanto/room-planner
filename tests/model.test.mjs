import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createInitialPlan,
  parsePlan,
  rectanglesOverlap,
  checkItem,
  checkPlan,
  wallBlocks,
  wallPoint,
  formatDimension,
  m,
  corners,
  placeNewItem,
} from '../src/model.ts'

test('the three beds use the actual user dimensions, not Construct presets', () => {
  assert.deepEqual(
    createInitialPlan().items.map((i) => [i.roomId, i.width, i.depth]),
    [
      ['room3', 60, 84],
      ['room2', 72, 84],
      ['room1', 60, 84],
    ],
  )
})
test('clear room dimensions and corridor match the supplied sketch', () => {
  const plan = createInitialPlan()
  assert.deepEqual(
    plan.rooms.filter((r) => r.id.startsWith('room')).map((r) => [r.width, r.depth]),
    [
      [206, 141],
      [120, 97],
      [120, 125],
    ],
  )
  assert.equal(plan.rooms.find((r) => r.id === 'hall').width, 35)
  assert.equal(plan.walls.find((w) => w.id === 'pier').thickness, 13.2)
})
test('windows retain their measured sizes and corrected west wall placement', () => {
  const windows = createInitialPlan().openings.filter((o) => o.kind === 'window')
  assert.deepEqual(
    windows.map((o) => [o.width, o.height, o.sill]),
    [
      [36, 48, 30],
      [72, 48, 30],
      [48, 48, 30],
      [60, 48, 30],
    ],
  )
  assert.ok(windows.filter((o) => o.roomId.startsWith('room')).every((o) => o.wallId === 'west'))
})
test('serialized plans round-trip without unit conversion or dimension drift', () => {
  const plan = createInitialPlan()
  plan.items[0].width = 60.125
  assert.deepEqual(parsePlan(JSON.stringify(plan)), plan)
  assert.equal(m(84), 2.1336)
})
test('initial furniture fits without wall, door, or furniture intersections', () => {
  assert.deepEqual(checkPlan(createInitialPlan()), [])
})
test('rotated rectangles use separating axes rather than an oversized bounding box', () => {
  const rect = { x: 0, z: 0, width: 60, depth: 12, rotation: 45 }
  assert.equal(rectanglesOverlap(rect, { ...rect, x: 0, z: 40 }), false)
  assert.equal(rectanglesOverlap(rect, { ...rect, x: 2, z: 2 }), true)
  assert.ok(Math.abs(corners({ ...rect, rotation: 90 })[0][0] + 6) < 1e-9)
})
test('elevated cabinets may overlap furniture footprints without colliding', () => {
  const plan = createInitialPlan(),
    bed = plan.items[0]
  const cabinet = {
    ...bed,
    id: 'wall-cabinet',
    kind: 'cabinet',
    name: 'Cabinet',
    width: 24,
    depth: 12,
    height: 30,
    elevation: 54,
  }
  assert.equal(
    checkItem(cabinet, plan).some((i) => i.kind === 'overlap'),
    false,
  )
  assert.equal(
    checkItem({ ...cabinet, elevation: 12 }, plan).some((i) => i.kind === 'overlap'),
    true,
  )
})
test('out-of-room items and items above the ceiling are reported', () => {
  const plan = createInitialPlan()
  const issues = checkItem({ ...plan.items[0], x: -100, height: 150 }, plan)
  assert.ok(issues.some((i) => i.kind === 'outside'))
  assert.ok(issues.some((i) => i.kind === 'ceiling'))
})
test('an item placed in an entry door swing is flagged', () => {
  const plan = createInitialPlan()
  const issues = checkItem(
    { ...plan.items[0], id: 'test', roomId: 'hall', x: 147, z: 425, width: 12, depth: 12 },
    plan,
  )
  assert.ok(issues.some((i) => i.kind === 'door'))
})
test('window wall blocks leave an exact 48 inch vertical opening', () => {
  const plan = createInitialPlan(),
    wall = plan.walls.find((w) => w.id === 'north')
  const blocks = wallBlocks(wall, plan.openings, plan.ceiling)
  const below = blocks.find((b) => b.width === 36 && b.elevation === 0)
  const above = blocks.find((b) => b.width === 36 && b.elevation === 78)
  assert.equal(below.height, 30)
  assert.equal(above.height, 24)
  assert.deepEqual(wallPoint(wall, 51), [48, -3])
})
test('custom item presets place into free space where space is available', () => {
  const plan = createInitialPlan(),
    desk = placeNewItem(plan, 'desk', 'room3')
  assert.deepEqual(checkItem(desk, plan), [])
})
test('malformed, oversized and invalid imported geometry is rejected', () => {
  assert.throws(() => parsePlan('{}'))
  const plan = createInitialPlan()
  plan.items[0].width = -1
  assert.throws(() => parsePlan(JSON.stringify(plan)))
  plan.items[0].width = 60
  plan.items[0].roomId = 'missing-room'
  assert.throws(() => parsePlan(JSON.stringify(plan)))
  assert.throws(() => parsePlan(' '.repeat(2_000_001)))
})
test('duplicate IDs and overlapping imported openings are rejected', () => {
  const plan = createInitialPlan()
  plan.items.push({ ...plan.items[0] })
  assert.throws(() => parsePlan(JSON.stringify(plan)))
  plan.items.pop()
  plan.openings[1].center = plan.openings[0].center
  assert.throws(() => parsePlan(JSON.stringify(plan)))
})
test('feet-and-inches labels preserve fractional measurements', () => {
  assert.equal(formatDimension(84), '7′')
  assert.equal(formatDimension(13.2), '1′ 1.2″')
  assert.equal(formatDimension(60, 'cm'), '152.4 cm')
})

test('a new wall cabinet starts at the room wall with an editable mounting height', () => {
  const plan = createInitialPlan(),
    cabinet = placeNewItem(plan, 'cabinet', 'room3')
  assert.equal(cabinet.z - cabinet.depth / 2, plan.rooms.find((r) => r.id === 'room3').z)
  assert.equal(cabinet.elevation, 54)
  assert.deepEqual(checkItem(cabinet, plan), [])
})
