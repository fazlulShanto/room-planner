import test from 'node:test'
import assert from 'node:assert/strict'
import { createInitialPlan, parsePlan, wallBlocks } from '../src/model.ts'
import {
  DEFAULT_WALL_COLOR,
  DEFAULT_CEILING_COLOR,
  roomFinishes,
  setRoomFinish,
  resetRoomFinishes,
  sharedFinish,
  finishedWallBlocks,
} from '../src/finishes.ts'

test('old saved layouts keep the original wall, ceiling, and floor defaults', () => {
  const plan = parsePlan(JSON.stringify(createInitialPlan()))
  const room = plan.rooms.find((r) => r.id === 'room3')
  assert.deepEqual(roomFinishes(plan, room), {
    wall: DEFAULT_WALL_COLOR,
    ceiling: DEFAULT_CEILING_COLOR,
    floor: '#eeeae2',
  })
  assert.equal(plan.finishes, undefined)
})
test('painting all other rooms preserves washrooms and the complete measured layout', () => {
  const original = createInitialPlan()
  let plan = original
  for (const surface of ['wall', 'ceiling', 'floor'])
    plan = setRoomFinish(plan, 'all', surface, '#c4d6df')
  assert.equal(plan.rooms, original.rooms)
  assert.equal(plan.walls, original.walls)
  assert.equal(plan.openings, original.openings)
  assert.equal(plan.items, original.items)
  for (const room of plan.rooms) {
    if (room.id.startsWith('bath')) {
      assert.equal(plan.finishes[room.id], undefined)
      assert.deepEqual(roomFinishes(plan, room), roomFinishes(original, room))
    } else
      assert.deepEqual(roomFinishes(plan, room), {
        wall: '#c4d6df',
        ceiling: '#c4d6df',
        floor: '#c4d6df',
      })
  }
  assert.equal(setRoomFinish(plan, 'bath1', 'wall', '#ffffff'), plan)
})
test('single-room colors remain independent, show mixed values, and reset by scope', () => {
  let plan = setRoomFinish(createInitialPlan(), 'all', 'wall', '#C8D3C0')
  assert.equal(sharedFinish(plan, 'all', 'wall'), '#c8d3c0')
  plan = setRoomFinish(plan, 'room1', 'wall', '#c6a28b')
  assert.equal(sharedFinish(plan, 'all', 'wall'), undefined)
  assert.equal(sharedFinish(plan, 'room1', 'wall'), '#c6a28b')
  plan = resetRoomFinishes(plan, 'room1')
  assert.equal(sharedFinish(plan, 'room1', 'wall'), DEFAULT_WALL_COLOR)
  assert.equal(sharedFinish(plan, 'kitchen', 'wall'), '#c8d3c0')
})
test('shared kitchen and washroom walls receive paint only on the correct room faces', () => {
  let plan = setRoomFinish(createInitialPlan(), 'room3', 'wall', '#c8d3c0')
  plan = setRoomFinish(plan, 'kitchen', 'wall', '#c6a28b')
  const wall = plan.walls.find((w) => w.id === 'kitchen-front')
  const blocks = finishedWallBlocks(plan, wall).filter((b) => b.elevation === 0)
  const kitchen = blocks.find((b) => b.x > 5 && b.x < 60)
  const bath = blocks.find((b) => b.x > 140 && b.x < 206)
  assert.equal(kitchen.positiveColor, '#c8d3c0')
  assert.equal(kitchen.negativeColor, '#c6a28b')
  assert.equal(bath.positiveColor, '#c8d3c0')
  assert.equal(bath.negativeColor, DEFAULT_WALL_COLOR)
  const pier = finishedWallBlocks(
    plan,
    plan.walls.find((w) => w.id === 'pier'),
  ).find((b) => b.z > 5 && b.z < 67)
  assert.equal(pier.positiveColor, '#c6a28b')
  assert.equal(pier.negativeColor, DEFAULT_WALL_COLOR)
})
test('a continuous exterior wall can show different room paints without changing wall volume or openings', () => {
  const plan = setRoomFinish(createInitialPlan(), 'room1', 'wall', '#c6a28b')
  for (const wall of plan.walls) {
    const volume = (blocks) => blocks.reduce((sum, b) => sum + b.width * b.depth * b.height, 0)
    assert.ok(
      Math.abs(
        volume(finishedWallBlocks(plan, wall)) -
          volume(wallBlocks(wall, plan.openings, plan.ceiling)),
      ) < 0.001,
    )
  }
  const west = finishedWallBlocks(
    plan,
    plan.walls.find((w) => w.id === 'west'),
  )
  assert.equal(west.find((b) => b.z > 330 && b.z < 350).negativeColor, '#c6a28b')
  assert.equal(west.find((b) => b.z > 80 && b.z < 110).negativeColor, DEFAULT_WALL_COLOR)
})
test('colors round-trip through saved JSON while malformed finishes are rejected', () => {
  const plan = setRoomFinish(createInitialPlan(), 'room1', 'ceiling', '#d5c1a7')
  assert.deepEqual(parsePlan(JSON.stringify(plan)), plan)
  for (const finishes of [
    null,
    [],
    { missing: { wall: '#ffffff' } },
    { room1: { wall: 'red' } },
    { room1: { floor: 42 } },
    { room1: { unknown: '#ffffff' } },
  ]) {
    assert.throws(() => parsePlan(JSON.stringify({ ...plan, finishes })))
  }
})
