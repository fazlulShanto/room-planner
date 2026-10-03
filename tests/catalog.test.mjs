import test from 'node:test'
import assert from 'node:assert/strict'
import { CATALOG, CATALOG_CATEGORIES, filterCatalog } from '../src/catalog.ts'
import { createInitialPlan, placeNewItem, parsePlan, checkItem } from '../src/model.ts'
import { additionalFurnitureParts } from '../src/additionalFurniture.ts'
import { homeFurnitureParts } from '../src/homeFurniture.ts'
import { createWalkSpace } from '../src/walk.ts'
import { exampleProject, parseProject } from '../src/projects.ts'
import { createWorkspaceStore } from '../src/workspace/store.ts'
import { changeItem, duplicateItem } from '../src/editor/planCommands.ts'

test('every catalog item is discoverable by category and by name', () => {
  assert.equal(CATALOG.length, 49)
  assert.equal(new Set(CATALOG.map((p) => p.kind)).size, CATALOG.length)
  const grouped = CATALOG_CATEGORIES.flatMap((category) => filterCatalog('', category))
  assert.equal(grouped.length, CATALOG.length)
  for (const preset of CATALOG) {
    assert.ok(grouped.includes(preset), preset.kind)
    assert.ok(filterCatalog(preset.name).includes(preset), preset.kind)
  }
  assert.deepEqual(
    filterCatalog('  SINK   cabinet ').map((p) => p.kind),
    ['kitchen-sink'],
  )
  assert.equal(filterCatalog('lamp', 'Decor & utility').length, 2)
  assert.equal(filterCatalog('lamp', 'Bathroom').length, 0)
  assert.equal(filterCatalog('unmatched furniture').length, 0)
})

test('every preset can be placed, edited, duplicated, and imported without changing existing items', () => {
  for (const preset of CATALOG) {
    const plan = createInitialPlan()
    const existing = structuredClone(plan.items)
    const item = placeNewItem(plan, preset.kind, 'room3')
    assert.deepEqual(plan.items, existing)
    assert.equal(item.category, undefined, 'catalog metadata stays out of saved items')
    assert.equal(item.description, undefined)
    const added = { ...plan, items: [...plan.items, item] }
    const edited = changeItem(added, item.id, {
      width: 27.25,
      depth: 14.5,
      height: 35.75,
      elevation: 4,
      rotation: 90,
      color: '#aabbcc',
    })
    const duplicate = duplicateItem(edited.items.find((entry) => entry.id === item.id))
    const duplicated = { ...edited, items: [...edited.items, duplicate] }
    const restored = parsePlan(JSON.stringify(duplicated))
    assert.deepEqual(restored.items.slice(0, existing.length), existing)
    assert.equal(restored.items.at(-1).kind, preset.kind)
    assert.equal(restored.items.at(-1).width, 27.25)
    assert.notEqual(restored.items.at(-1).id, item.id)
    assert.deepEqual(restored, duplicated)
  }
})

test('all 33 additional models fit their dimensions at preset, minimum, and extreme sizes', () => {
  const plan = createInitialPlan()
  let count = 0
  for (const preset of CATALOG) {
    const original = placeNewItem(plan, preset.kind, 'room3')
    if (!additionalFurnitureParts(original)) continue
    count++
    for (const [width, depth, height] of [
      [preset.width, preset.depth, preset.height],
      [0.25, 0.25, 0.25],
      [1200, 0.25, 37],
      [8, 1200, 0.25],
      [93.5, 8.75, 110],
    ]) {
      const parts = homeFurnitureParts({ ...original, width, depth, height })
      assert.ok(parts.length >= 3, preset.kind)
      for (const part of parts) {
        const extents = [width, height, depth]
        part.size.forEach((size, axis) => {
          assert.ok(Number.isFinite(size) && size > 0, `${preset.kind}: invalid size`)
          const min = axis === 1 ? 0 : -extents[axis] / 2
          const max = axis === 1 ? extents[axis] : extents[axis] / 2
          assert.ok(part.position[axis] - size / 2 >= min - 1e-8, `${preset.kind}: min ${axis}`)
          assert.ok(part.position[axis] + size / 2 <= max + 1e-8, `${preset.kind}: max ${axis}`)
        })
      }
    }
  }
  assert.equal(count, 33)
})

test('new catalog kinds survive workspace validation, project export, undo and redo', () => {
  const project = exampleProject()
  const original = { version: 2, activeProjectId: project.id, projects: [project] }
  const store = createWorkspaceStore(original)
  const plan = project.floors[0].plan
  const items = CATALOG.map((p) => placeNewItem(plan, p.kind, plan.rooms[0].id))
  const changed = {
    ...original,
    projects: [
      {
        ...project,
        floors: project.floors.map((f, i) =>
          i === 0 ? { ...f, plan: { ...f.plan, items: [...f.plan.items, ...items] } } : f,
        ),
      },
    ],
  }
  store.commit(() => changed)
  assert.deepEqual(parseProject(JSON.stringify(changed.projects[0])), changed.projects[0])
  store.undo()
  assert.deepEqual(store.getSnapshot().present, original)
  store.redo()
  assert.deepEqual(store.getSnapshot().present, changed)
})

test('thin floor rugs permit overlapping furniture and walking; raised or thick rugs remain solid', () => {
  const plan = createInitialPlan()
  plan.items = []
  const rug = { ...placeNewItem(plan, 'rug', 'room3'), x: 100, z: 150 }
  const table = { ...placeNewItem(plan, 'tea-table', 'room3'), x: 100, z: 150 }
  plan.items = [rug, table]
  assert.equal(
    checkItem(rug, plan).some((i) => i.kind === 'overlap'),
    false,
  )
  assert.equal(
    checkItem(table, plan).some((i) => i.kind === 'overlap'),
    false,
  )
  plan.items = [rug]
  assert.equal(createWalkSpace(plan).canStand(100, 150), true)
  for (const patch of [{ height: 2 }, { elevation: 12 }]) {
    const solid = { ...rug, ...patch }
    plan.items = [solid]
    assert.equal(createWalkSpace(plan).canStand(100, 150), false)
    assert.equal(
      checkItem(table, plan).some((i) => i.kind === 'overlap'),
      true,
    )
  }
})

test('lamps and countertop appliances start above their supporting furniture', () => {
  const plan = createInitialPlan()
  const pairs = [
    ['table-lamp', 'nightstand'],
    ['microwave', 'kitchen-base'],
  ]
  for (const [topKind, baseKind] of pairs) {
    const base = placeNewItem(plan, baseKind, 'room3')
    const top = { ...placeNewItem(plan, topKind, 'room3'), x: base.x, z: base.z }
    assert.equal(top.elevation, base.height)
    const stacked = { ...plan, items: [base, top] }
    assert.equal(
      checkItem(top, stacked).some((i) => i.kind === 'overlap'),
      false,
    )
    assert.equal(
      checkItem(base, stacked).some((i) => i.kind === 'overlap'),
      false,
    )
  }
})

test('squat toilet pan starts on the floor with a low bowl and paired footrests', () => {
  const item = placeNewItem(createInitialPlan(), 'squat-toilet', 'bath2')
  assert.deepEqual([item.width, item.depth, item.height, item.elevation], [24, 28, 3, 0])
  assert.equal(filterCatalog('pan toilet', 'Bathroom')[0].kind, 'squat-toilet')
  const parts = homeFurnitureParts(item)
  for (const side of [-1, 1]) {
    assert.ok(parts.some((p) => Math.sign(p.position[0]) === side && p.position[1] > 2))
  }
  assert.ok(parts.some((p) => p.shape === 'cylinder' && p.position[0] === 0))
})
