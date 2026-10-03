import test from 'node:test'
import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import { createInitialPlan, m } from '../src/model.ts'
import { createDollhouseCamera, fitDollhouseCamera } from '../src/camera.ts'

test('dollhouse view uses perspective so nearer walls appear larger', () => {
  const plan = createInitialPlan(),
    camera = createDollhouseCamera()
  fitDollhouseCamera(camera, plan, 'all', { width: 900, height: 700 })
  const wallHeight = (z) => {
    const bottom = new Vector3(m(0), 0, m(z)).project(camera)
    const top = new Vector3(m(0), m(102), m(z)).project(camera)
    return bottom.distanceTo(top)
  }
  const ratio = wallHeight(440) / wallHeight(10)
  assert.ok(
    ratio > 1.1,
    `near/far wall scale is ${ratio}; a flat projection reads as a sheared model`,
  )
})

test('fit view includes full-height walls on narrow and wide canvases', () => {
  const plan = createInitialPlan()
  for (const size of [
    { width: 400, height: 800 },
    { width: 1300, height: 600 },
  ]) {
    const camera = createDollhouseCamera()
    fitDollhouseCamera(camera, plan, 'all', size)
    for (const wall of plan.walls)
      for (const [x, z] of [wall.from, wall.to])
        for (const y of [0, plan.ceiling]) {
          const p = new Vector3(m(x), m(y), m(z)).project(camera)
          assert.ok(
            Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95,
            `wall ${wall.id} clipped at ${p.x}, ${p.y}`,
          )
        }
  }
})

test('focusing a room frames its complete height without changing plan dimensions', () => {
  const plan = createInitialPlan(),
    original = JSON.stringify(plan)
  for (const room of plan.rooms) {
    const camera = createDollhouseCamera()
    fitDollhouseCamera(camera, plan, room.id, { width: 650, height: 700 })
    for (const x of [room.x, room.x + room.width])
      for (const z of [room.z, room.z + room.depth])
        for (const y of [0, plan.ceiling]) {
          const point = new Vector3(m(x), m(y), m(z)).project(camera)
          assert.ok(Math.abs(point.x) < 0.95 && Math.abs(point.y) < 0.95, room.id)
        }
  }
  assert.equal(JSON.stringify(plan), original)
})
