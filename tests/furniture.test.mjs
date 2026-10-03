import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CATALOG,
  createInitialPlan,
  placeNewItem,
  parsePlan,
  checkItem,
  corners,
  itemFootprints,
  localItemOutline,
} from '../src/model.ts'
import { createWalkSpace } from '../src/walk.ts'
import { homeFurnitureParts } from '../src/homeFurniture.ts'

const kinds = [
  'almirah',
  'dressing',
  'wardrobe',
  'rack',
  'sofa-one',
  'sofa-two',
  'sofa-corner',
  'tea-table',
  'chair',
  'cabinet',
]
test('chair starts with the reference dimensions converted accurately from centimeters', () => {
  const plan = createInitialPlan(),
    item = placeNewItem(plan, 'chair', 'room3')
  for (const [actual, cm] of [
    [item.width, 41],
    [item.depth, 45],
    [item.height, 100],
  ])
    assert.ok(Math.abs(actual * 2.54 - cm) < 1e-8)
  assert.deepEqual(checkItem(item, plan), [])
})
test('RFL rack adds at the supplied 20 × 12 × 27 inch dimensions', () => {
  const plan = createInitialPlan(),
    before = JSON.stringify(plan),
    item = placeNewItem(plan, 'rack', 'room3')
  assert.deepEqual([item.width, item.depth, item.height, item.elevation], [20, 12, 27, 0])
  assert.deepEqual(checkItem(item, plan), [])
  assert.equal(JSON.stringify(plan), before)
})
test('all new presets can be added, resized, rotated, and saved without changing existing furniture', () => {
  for (const kind of kinds) {
    const plan = createInitialPlan(),
      existing = structuredClone(plan.items)
    const item = placeNewItem(plan, kind, 'room3')
    assert.equal(item.kind, kind)
    assert.ok(CATALOG.some((c) => c.kind === kind))
    assert.deepEqual(checkItem(item, plan), [])
    plan.items.push({
      ...item,
      width: 20.5,
      depth: 12.25,
      height: 61.75,
      rotation: 90,
      elevation: 3,
    })
    const restored = parsePlan(JSON.stringify(plan))
    assert.deepEqual(restored.items.slice(0, -1), existing)
    assert.deepEqual(restored.items.at(-1), plan.items.at(-1))
    const outline = corners(restored.items.at(-1))
    assert.ok(
      Math.abs(
        Math.max(...outline.map((p) => p[0])) - Math.min(...outline.map((p) => p[0])) - 12.25,
      ) < 1e-8,
    )
  }
})
test('visible furniture parts including handles, feet and mirror stay inside edited dimensions', () => {
  for (const kind of kinds)
    for (const [width, depth, height] of [
      [0.25, 0.25, 0.25],
      [20, 12, 27],
      [93.5, 8.75, 110],
      [8, 60, 15],
    ]) {
      const item = { ...placeNewItem(createInitialPlan(), kind, 'room3'), width, depth, height }
      const parts = homeFurnitureParts(item)
      assert.ok(parts.length > 5, kind)
      for (const part of parts) {
        const extents = [width, height, depth]
        part.size.forEach((size, axis) => {
          assert.ok(size > 0 && Number.isFinite(size), kind)
          const min = axis === 1 ? 0 : -extents[axis] / 2
          const max = axis === 1 ? extents[axis] : extents[axis] / 2
          assert.ok(part.position[axis] - size / 2 >= min - 1e-8, `${kind}: minimum ${axis}`)
          assert.ok(part.position[axis] + size / 2 <= max + 1e-8, `${kind}: maximum ${axis}`)
        })
      }
    }
})

function seatingPlan(chaiseSide = 'left', rotation = 0) {
  const plan = createInitialPlan()
  const sofa = {
    ...placeNewItem(plan, 'sofa-corner', 'room3'),
    x: 100,
    z: 150,
    chaiseSide,
    rotation,
  }
  plan.items = [sofa]
  return { plan, sofa }
}
test('a tea table fits in the L-shaped opening but is flagged when the return switches sides', () => {
  for (const rotation of [0, 90, 180, 270]) {
    const { plan, sofa } = seatingPlan('left', rotation)
    const a = (rotation * Math.PI) / 180
    const table = {
      ...placeNewItem(plan, 'tea-table', 'room3'),
      width: 20,
      depth: 12,
      x: sofa.x + 16 * Math.cos(a) + 18 * Math.sin(a),
      z: sofa.z - 16 * Math.sin(a) + 18 * Math.cos(a),
      rotation,
    }
    assert.equal(
      checkItem(table, plan).some((i) => i.kind === 'overlap'),
      false,
    )
    sofa.chaiseSide = 'right'
    assert.equal(
      checkItem(table, plan).some((i) => i.kind === 'overlap'),
      true,
    )
  }
})
test('walk mode can enter the open corner and cannot pass through the sofa return', () => {
  const { plan, sofa } = seatingPlan()
  assert.equal(createWalkSpace(plan).canStand(116, 170), true)
  assert.equal(createWalkSpace(plan).canStand(67, 170), false)
  sofa.chaiseSide = 'right'
  assert.equal(createWalkSpace(plan).canStand(116, 170), false)
  assert.equal(createWalkSpace(plan).canStand(67, 170), true)
})
test('corner sofa shape, visible parts, and measured footprint agree after custom sizing', () => {
  for (const chaiseSide of ['left', 'right'])
    for (const ratio of [0.05, 0.4, 0.95]) {
      const { sofa } = seatingPlan(chaiseSide)
      Object.assign(sofa, {
        x: 0,
        z: 0,
        width: 110,
        depth: 80,
        seatDepthRatio: ratio,
        chaiseWidthRatio: ratio,
      })
      const footprint = itemFootprints(sofa)
      const outline = localItemOutline(sofa)
      const area =
        Math.abs(
          outline.reduce((sum, [x, z], i) => {
            const [nx, nz] = outline[(i + 1) % outline.length]
            return sum + x * nz - nx * z
          }, 0),
        ) / 2
      assert.ok(Math.abs(area - footprint.reduce((sum, r) => sum + r.width * r.depth, 0)) < 1e-6)
      for (const p of homeFurnitureParts(sofa))
        for (const dx of [-1, 1])
          for (const dz of [-1, 1]) {
            const x = p.position[0] + (dx * p.size[0]) / 2,
              z = p.position[2] + (dz * p.size[2]) / 2
            assert.ok(
              footprint.some(
                (r) =>
                  Math.abs(x - r.x) <= r.width / 2 + 1e-7 &&
                  Math.abs(z - r.z) <= r.depth / 2 + 1e-7,
              ),
              `part outside ${chaiseSide} footprint at ${x},${z}`,
            )
          }
    }
})
test('custom sofa shape persists and invalid ratios cannot enter saved layouts', () => {
  const { plan, sofa } = seatingPlan('right')
  Object.assign(sofa, { seatDepthRatio: 0.4, chaiseWidthRatio: 0.45 })
  assert.deepEqual(parsePlan(JSON.stringify(plan)), plan)
  sofa.seatDepthRatio = 1.5
  assert.throws(() => parsePlan(JSON.stringify(plan)))
})
