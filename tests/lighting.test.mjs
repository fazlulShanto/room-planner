import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LIGHTING, formatTime, lightingAt, parseTime } from '../src/lighting.ts'
import { createInitialPlan, parsePlan } from '../src/model.ts'
const at = (hour, shadows = true) => lightingAt({ hour, shadows })

test('night always disables sunlight and cast shadows from 19:00 through 04:59', () => {
  for (const hour of [0, 4 + 59 / 60, 19, 21, 23.75, 24]) {
    assert.equal(at(hour).night, true)
    assert.equal(at(hour).sunIntensity, 0)
    assert.equal(at(hour).castShadow, false)
  }
  for (const hour of [5, 8, 12, 18 + 59 / 60]) {
    assert.equal(at(hour).night, false)
    assert.ok(at(hour).sunIntensity > 0)
    assert.equal(at(hour).castShadow, true)
  }
})
test('sun crosses the home during the day with shorter shadows and stronger light at noon', () => {
  const morning = at(8),
    noon = at(12),
    evening = at(16)
  assert.ok(morning.sunPosition[0] > 0)
  assert.ok(Math.abs(noon.sunPosition[0]) < 1e-10)
  assert.ok(evening.sunPosition[0] < 0)
  const shadowLength = (light) =>
    Math.hypot(light.sunPosition[0], light.sunPosition[2]) / light.sunPosition[1]
  assert.ok(shadowLength(morning) > shadowLength(noon))
  assert.ok(shadowLength(evening) > shadowLength(noon))
  assert.ok(noon.sunIntensity > morning.sunIntensity)
  assert.ok(noon.daylight > evening.daylight)
})
test('the manual shadow switch leaves daylight illumination on and survives night', () => {
  const off = { hour: 12, shadows: false }
  assert.equal(lightingAt(off).castShadow, false)
  assert.equal(lightingAt(off).sunIntensity, at(12).sunIntensity)
  assert.equal(lightingAt({ ...off, hour: 21 }).castShadow, false)
  assert.equal(lightingAt({ ...off, hour: 8 }).castShadow, false)
})
test('the 24-hour clock formats quarter hours and wraps midnight', () => {
  for (const [hour, clock] of [
    [0, '00:00'],
    [5, '05:00'],
    [12.25, '12:15'],
    [18.75, '18:45'],
    [19, '19:00'],
    [24, '00:00'],
  ])
    assert.equal(formatTime(hour), clock)
})
test('old layouts retain a daylight default and lighting round-trips without changing geometry', () => {
  const plan = createInitialPlan()
  assert.equal(parsePlan(JSON.stringify(plan)).lighting, undefined)
  assert.deepEqual(DEFAULT_LIGHTING, { hour: 12, shadows: true })
  const edited = { ...plan, lighting: { hour: 21, shadows: false } }
  const restored = parsePlan(JSON.stringify(edited))
  assert.deepEqual(restored, edited)
  assert.deepEqual(restored.rooms, plan.rooms)
  assert.deepEqual(restored.items, plan.items)
})
test('invalid saved lighting is rejected', () => {
  for (const lighting of [
    null,
    [],
    {},
    { hour: -1, shadows: true },
    { hour: 25, shadows: true },
    { hour: '12', shadows: true },
    { hour: 12, shadows: 'false' },
  ]) {
    assert.throws(() => parsePlan(JSON.stringify({ ...createInitialPlan(), lighting })))
  }
})

test('typed 24-hour times accept exact boundaries and reject invalid clock values', () => {
  assert.equal(parseTime('05:00'), 5)
  assert.equal(parseTime('19:00'), 19)
  assert.equal(parseTime('24:00'), 24)
  assert.equal(parseTime('23:59'), 23 + 59 / 60)
  for (const value of ['', '5:00', '12:60', '24:01', '99:99', '12pm'])
    assert.equal(parseTime(value), null)
})
