import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addWalls,
  addOpeningAt,
  changeWall,
  removeWall,
  detectRooms,
  snapBuildingPoint,
} from '../src/building.ts'
import {
  blankPlan,
  createProject,
  addFloor,
  parseProject,
  loadWorkspace,
  WORKSPACE_KEY,
  LEGACY_KEY,
  floorElevations,
} from '../src/projects.ts'
import {
  createInitialPlan,
  parsePlan,
  placeNewItem,
  roomContains,
  checkPlan,
} from '../src/model.ts'
import { createWalkSpace } from '../src/walk.ts'
import { createDollhouseCamera, fitDollhouseCamera } from '../src/camera.ts'
const rectangle = (w = 240, d = 180) =>
  addWalls(
    blankPlan(),
    [
      [
        [0, 0],
        [w, 0],
      ],
      [
        [w, 0],
        [w, d],
      ],
      [
        [w, d],
        [0, d],
      ],
      [
        [0, d],
        [0, 0],
      ],
    ],
    6,
  )
test('blank floors save and render a finite camera without rooms or walls', () => {
  const p = blankPlan()
  assert.deepEqual(parsePlan(JSON.stringify(p)), p)
  const c = createDollhouseCamera()
  fitDollhouseCamera(c, p, 'all', { width: 800, height: 600 })
  assert.ok(c.position.toArray().every(Number.isFinite))
  assert.deepEqual(createWalkSpace(p).start('all'), [0, 0])
})
test('closing walls creates a room with clear interior dimensions and stable finishes', () => {
  const p = rectangle()
  assert.equal(p.rooms.length, 1)
  assert.deepEqual([p.rooms[0].width, p.rooms[0].depth], [234, 174])
  p.rooms[0].name = 'Living room'
  p.finishes = { [p.rooms[0].id]: { wall: '#112233' } }
  const next = addWalls(
    p,
    [
      [
        [240, 180],
        [300, 180],
      ],
    ],
    6,
  )
  assert.equal(next.rooms[0].id, p.rooms[0].id)
  assert.equal(next.rooms[0].name, 'Living room')
  assert.deepEqual(next.finishes, p.finishes)
  const bed = placeNewItem(p, 'bed', p.rooms[0].id)
  p.items.push(bed)
  assert.deepEqual(checkPlan(p), [])
})
test('T junctions split rooms and removing a partition merges them without losing furniture', () => {
  let p = rectangle()
  p.items.push(placeNewItem(p, 'chair', p.rooms[0].id))
  p = addWalls(
    p,
    [
      [
        [120, 0],
        [120, 180],
      ],
    ],
    6,
  )
  assert.equal(p.rooms.length, 2)
  assert.ok(p.rooms.every((r) => r.width === 114))
  assert.equal(parsePlan(JSON.stringify(p)).items.length, 1)
  p = removeWall(p, p.walls.at(-1).id)
  assert.equal(p.rooms.length, 1)
  assert.equal(p.items.length, 1)
})
test('angled and L-shaped rooms have usable polygon floors and correct walking bounds', () => {
  const pts = [
    [0, 0],
    [240, 0],
    [240, 90],
    [120, 90],
    [120, 180],
    [0, 180],
  ]
  const p = addWalls(
    blankPlan(),
    pts.map((a, i) => [a, pts[(i + 1) % pts.length]]),
    6,
  )
  assert.equal(p.rooms.length, 1)
  assert.equal(roomContains(p.rooms[0], 200, 140), false)
  assert.equal(createWalkSpace(p).canStand(200, 140), false)
  assert.equal(createWalkSpace(p).canStand(60, 140), true)
  const triangle = addWalls(
    blankPlan(),
    [
      [
        [0, 0],
        [240, 0],
      ],
      [
        [240, 0],
        [120, 180],
      ],
      [
        [120, 180],
        [0, 0],
      ],
    ],
    6,
  )
  assert.equal(triangle.rooms.length, 1)
})
test('legacy measured walls detect the same rooms without changing their dimensions', () => {
  const p = createInitialPlan(),
    rooms = detectRooms(p.walls, p.rooms)
  for (const old of p.rooms) {
    const room = rooms.find((r) => r.id === old.id)
    assert.ok(room)
    assert.ok(Math.abs(room.width - old.width) < 0.001)
    assert.ok(Math.abs(room.depth - old.depth) < 0.001)
  }
})
test('wall openings fit reversed walls, reject overlaps, and disappear with their host wall', () => {
  let p = rectangle(),
    wall = p.walls[2]
  p = addOpeningAt(p, wall, [120, 180], 'door', 36)
  assert.equal(p.openings.length, 1)
  assert.throws(() => addOpeningAt(p, wall, [120, 180], 'window', 48))
  assert.throws(() => changeWall(p, wall.id, { to: [220, 180] }))
  assert.equal(parsePlan(JSON.stringify(p)).openings.length, 1)
  p = removeWall(p, wall.id)
  assert.equal(p.openings.length, 0)
  assert.equal(p.rooms.length, 0)
  assert.deepEqual(parsePlan(JSON.stringify(p)), p)
})
test('editing a shared endpoint keeps the room closed and endpoint snapping joins walls', () => {
  const p = rectangle(),
    next = changeWall(p, p.walls[0].id, { to: [260, 0] })
  assert.deepEqual(next.walls[1].from, [260, 0])
  assert.equal(next.rooms.length, 1)
  assert.deepEqual(snapBuildingPoint([242, 2], p.walls, 1, 8), [240, 0])
})
test('legacy storage migrates without altering the original layout or recovery copy', () => {
  const original = createInitialPlan()
  original.items[0].width = 61.25
  const data = new Map([[LEGACY_KEY, JSON.stringify(original)]])
  const storage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }
  const { workspace } = loadWorkspace(storage)
  assert.deepEqual(workspace.projects[0].floors[0].plan, original)
  assert.equal(data.get(LEGACY_KEY), JSON.stringify(original))
  storage.setItem(WORKSPACE_KEY, JSON.stringify(workspace))
  assert.deepEqual(loadWorkspace(storage).workspace, workspace)
})
test('multiple floors remain independent through duplication and full project export/import', () => {
  let p = createProject(rectangle())
  p = addFloor(p, p.floors[0])
  p = addFloor(p)
  p.floors[1].plan.rooms[0].name = 'Upstairs bedroom'
  assert.notEqual(p.floors[0].plan.rooms[0].name, p.floors[1].plan.rooms[0].name)
  assert.equal(p.floors[2].plan.walls.length, 0)
  assert.deepEqual(parseProject(JSON.stringify(p)), p)
  assert.deepEqual(
    floorElevations(p).map((f) => f.elevation),
    [0, 116, 232],
  )
  p.floors[1].id = p.floors[0].id
  assert.throws(() => parseProject(JSON.stringify(p)))
})

test('adjoining rooms reuse whole or partial shared walls without duplicating doors', () => {
  let p = rectangle()
  p = addOpeningAt(p, p.walls[1], [240, 90], 'door', 36)
  const shared = p.walls[1]
  p = addWalls(
    p,
    [
      [
        [240, 0],
        [360, 0],
      ],
      [
        [360, 0],
        [360, 180],
      ],
      [
        [360, 180],
        [240, 180],
      ],
      [
        [240, 180],
        [240, 0],
      ],
    ],
    6,
  )
  assert.equal(p.walls.length, 7)
  assert.equal(p.rooms.length, 2)
  assert.equal(p.openings[0].wallId, shared.id)
  const extended = addWalls(
    p,
    [
      [
        [240, 240],
        [240, -60],
      ],
    ],
    6,
  )
  assert.equal(extended.walls.length, 9)
  assert.equal(extended.rooms.length, 2)
  assert.deepEqual(parsePlan(JSON.stringify(extended)), extended)
})
