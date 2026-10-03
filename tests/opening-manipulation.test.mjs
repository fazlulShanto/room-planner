import test from 'node:test'
import assert from 'node:assert/strict'
import { createInitialPlan, openingLimits, parsePlan, wallPoint } from '../src/model.ts'
import { blankPlan, createProject } from '../src/projects.ts'
import { createWorkspaceStore } from '../src/workspace/store.ts'
import { changeOpening } from '../src/editor/planCommands.ts'
import { openingCenterFromDrag } from '../src/editor/openingManipulation.ts'

function fixture(from = [0, 0], to = [200, 0], kind = 'window') {
  const wall = { id: 'wall', from, to, thickness: 6 }
  const opening = {
    id: 'opening',
    name: 'Test opening',
    roomId: '',
    wallId: wall.id,
    kind,
    center: 80,
    width: 32,
    height: 48,
    sill: 36,
    swing: 1,
    hinge: 'end',
  }
  return { ...blankPlan(), walls: [wall], openings: [opening] }
}

test('doors, windows and passages move only along their wall and retain their geometry', () => {
  for (const kind of ['door', 'window', 'passage']) {
    const plan = fixture([0, 0], [200, 0], kind),
      opening = plan.openings[0]
    const center = openingCenterFromDrag(plan, opening, [12, 700], true)
    assert.equal(center, 92)
    const next = changeOpening(plan, opening.id, { center })
    assert.deepEqual(next.openings[0], { ...opening, center: 92 })
    assert.deepEqual(parsePlan(JSON.stringify(next)), next)
    assert.equal(plan.openings[0].center, 80)
  }
})

test('vertical, reversed and angled walls preserve drag direction and grab offset', () => {
  for (const [from, to, delta] of [
    [
      [0, 0],
      [0, 200],
      [50, 12],
    ],
    [
      [200, 0],
      [0, 0],
      [-12, 50],
    ],
    [
      [0, 200],
      [0, 0],
      [50, -12],
    ],
    [
      [0, 0],
      [120, 160],
      [7.2, 9.6],
    ],
  ]) {
    const plan = fixture(from, to),
      opening = plan.openings[0]
    assert.equal(openingCenterFromDrag(plan, opening, delta, false), 92)
    assert.equal(openingCenterFromDrag(plan, opening, [0, 0], false), 80)
  }
})

test('snapping supports whole and fractional inches, while ends always contain the opening', () => {
  const plan = fixture(),
    opening = plan.openings[0]
  assert.equal(openingCenterFromDrag(plan, opening, [12.37, 0], true), 92)
  assert.equal(openingCenterFromDrag(plan, opening, [12.37, 0], false), 92.37)
  assert.equal(openingCenterFromDrag(plan, opening, [-1000, 0], true), 16)
  assert.equal(openingCenterFromDrag(plan, opening, [1000, 0], true), 184)
  opening.width = 33.25
  assert.equal(openingCenterFromDrag(plan, opening, [-1000, 0], true), 16.625)
})

test('fast drags stop at neighbors on either side instead of jumping over them', () => {
  const plan = fixture(),
    opening = plan.openings[0]
  plan.openings.push(
    { ...opening, id: 'left', center: 30, width: 20 },
    { ...opening, id: 'right', center: 150, width: 40 },
  )
  assert.equal(openingCenterFromDrag(plan, opening, [-1000, 0], true), 56)
  assert.equal(openingCenterFromDrag(plan, opening, [1000, 0], true), 114)
  for (const delta of [-1000, 1000]) {
    const center = openingCenterFromDrag(plan, opening, [delta, 0], true)
    assert.doesNotThrow(() =>
      parsePlan(JSON.stringify(changeOpening(plan, opening.id, { center }))),
    )
  }
  // Returning the pointer from a boundary uses the original grab position.
  assert.equal(openingCenterFromDrag(plan, opening, [3, 0], true), 83)
})

test('legacy room limits keep openings within the assigned room on a shared wall', () => {
  const plan = createInitialPlan()
  for (const opening of plan.openings) {
    const wall = plan.walls.find((w) => w.id === opening.wallId)
    const [x, z] = wallPoint(wall, 100)
    const delta = [x - wall.from[0], z - wall.from[1]]
    const limits = openingLimits(opening, plan)
    for (const direction of [-100, 100]) {
      const center = openingCenterFromDrag(
        plan,
        opening,
        delta.map((n) => n * direction),
        true,
      )
      assert.ok(center >= limits.min && center <= limits.max)
      assert.doesNotThrow(() => changeOpening(plan, opening.id, { center }))
    }
  }
})

test('opening drag previews form one undo step and leave other floors unchanged', () => {
  const plan = fixture(),
    project = createProject(plan)
  project.floors.push({ ...project.floors[0], id: 'other-floor', name: 'Other floor' })
  const initial = { version: 2, activeProjectId: project.id, projects: [project] }
  const store = createWorkspaceStore(initial),
    opening = plan.openings[0]
  store.beginTransaction()
  for (let dx = 1; dx <= 12; dx++) {
    store.preview((w) => ({
      ...w,
      projects: [
        {
          ...project,
          floors: project.floors.map((floor, i) =>
            i
              ? floor
              : {
                  ...floor,
                  plan: changeOpening(floor.plan, opening.id, {
                    center: openingCenterFromDrag(floor.plan, opening, [dx, 0], true),
                  }),
                },
          ),
        },
      ],
    }))
  }
  store.endTransaction()
  const moved = store.getSnapshot().present
  assert.equal(store.getSnapshot().past.length, 1)
  assert.equal(moved.projects[0].floors[0].plan.openings[0].center, 92)
  assert.deepEqual(moved.projects[0].floors[1], project.floors[1])
  store.undo()
  assert.deepEqual(store.getSnapshot().present, initial)
  store.redo()
  assert.deepEqual(store.getSnapshot().present, moved)
})
