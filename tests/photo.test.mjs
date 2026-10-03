import test from 'node:test'
import assert from 'node:assert/strict'
import { PerspectiveCamera, Scene } from 'three'
import { createInitialPlan, METERS_PER_INCH, roomContains } from '../src/model.ts'
import { createWalkSpace, walkEyeHeight } from '../src/walk.ts'
import { PHOTO_ASPECT, photoVerticalFov, roomPhotoPose, roomPhotoFilename } from '../src/photo.ts'
import { capturePhoto } from '../src/photoCapture.ts'

test('photo corners keep the camera inside the selected room and clear of furniture', () => {
  const plan = createInitialPlan()
  const before = JSON.stringify(plan)
  const space = createWalkSpace(plan)
  for (const room of plan.rooms) {
    for (let corner = 0; corner < 4; corner++) {
      const pose = roomPhotoPose(plan, room.id, corner)
      assert.ok(pose, `${room.name}, corner ${corner}`)
      const [x, y, z] = pose.position.map((n) => n / METERS_PER_INCH)
      assert.ok(roomContains(room, x, z))
      assert.ok(space.canStand(x, z))
      assert.equal(y, walkEyeHeight(plan))
    }
  }
  assert.equal(JSON.stringify(plan), before)
  assert.equal(roomPhotoPose(plan, 'missing-room', 0), null)
})

test('photo camera avoids the missing corner of a polygonal room', () => {
  const room = {
    id: 'l',
    name: 'L-shaped room',
    x: 0,
    z: 0,
    width: 180,
    depth: 180,
    color: '#ffffff',
    outline: [
      [0, 0],
      [180, 0],
      [180, 60],
      [60, 60],
      [60, 180],
      [0, 180],
    ],
  }
  const plan = { ...createInitialPlan(), rooms: [room], walls: [], openings: [], items: [] }
  const pose = roomPhotoPose(plan, room.id, 2)
  const [x, , z] = pose.position.map((n) => n / METERS_PER_INCH)
  assert.ok(roomContains(room, x, z))
  assert.ok(x <= 60 || z <= 60)
})

test('a room fully blocked with furniture has no photo position', () => {
  const plan = createInitialPlan()
  const room = plan.rooms[0]
  plan.items.push({
    ...plan.items[0],
    id: 'blocker',
    roomId: room.id,
    x: room.x + room.width / 2,
    z: room.z + room.depth / 2,
    width: room.width,
    depth: room.depth,
    height: plan.ceiling,
    elevation: 0,
    rotation: 0,
  })
  assert.equal(roomPhotoPose(plan, room.id, 0), null)
})

test('wide-angle lens retains its horizontal angle in a 16:9 image', () => {
  for (const horizontal of [75, 110, 120]) {
    const vertical = photoVerticalFov(horizontal)
    const recovered =
      (2 * Math.atan(Math.tan((vertical * Math.PI) / 360) * PHOTO_ASPECT) * 180) / Math.PI
    assert.ok(Math.abs(recovered - horizontal) < 0.0001)
  }
  assert.ok(photoVerticalFov(120) > photoVerticalFov(75))
})

test('photo filenames include project, floor and room without path separators', () => {
  assert.equal(
    roomPhotoFilename('Our home', 'Ground floor', 'Room 3'),
    'Our-home-Ground-floor-Room-3-wide-angle.png',
  )
  assert.equal(
    roomPhotoFilename('Home/one', 'Floor:1', 'A\\B'),
    'Home-one-Floor-1-A-B-wide-angle.png',
  )
})

function rendererFixture(fail = false) {
  const dimensions = { x: 640, y: 360, ratio: 2 }
  const frames = []
  const blob = new Blob(['photo'], { type: 'image/png' })
  const renderer = {
    getContext: () => ({ isContextLost: () => false }),
    getSize: (v) => v.set(dimensions.x, dimensions.y),
    getPixelRatio: () => dimensions.ratio,
    setPixelRatio: (ratio) => {
      dimensions.ratio = ratio
    },
    setSize: (x, y) => {
      dimensions.x = x
      dimensions.y = y
    },
    render: (scene, camera) => frames.push({ ...dimensions, camera, scene }),
    domElement: {
      toBlob: (callback, type) => {
        assert.equal(type, 'image/png')
        callback(fail ? null : blob)
      },
    },
  }
  return { renderer, dimensions, frames, blob }
}

test('capture exports full HD and restores the live renderer and camera', async () => {
  const { renderer, dimensions, frames, blob } = rendererFixture()
  const camera = new PerspectiveCamera(70, 2, 0.035, 100)
  camera.position.set(1, 2, 3)
  const scene = new Scene()
  assert.equal(await capturePhoto(renderer, scene, camera), blob)
  assert.deepEqual(dimensions, { x: 640, y: 360, ratio: 2 })
  assert.equal(frames[0].x, 1920)
  assert.equal(frames[0].y, 1080)
  assert.equal(frames[0].ratio, 1)
  assert.equal(frames[0].camera.aspect, PHOTO_ASPECT)
  assert.deepEqual(frames[0].camera.position.toArray(), [1, 2, 3])
  assert.equal(camera.aspect, 2)
  assert.equal(frames[1].camera, camera)
})

test('capture restores the preview after an encoding failure', async () => {
  const { renderer, dimensions } = rendererFixture(true)
  await assert.rejects(
    capturePhoto(renderer, new Scene(), new PerspectiveCamera()),
    /Could not create/,
  )
  assert.deepEqual(dimensions, { x: 640, y: 360, ratio: 2 })
})

test('capture reports a lost graphics context instead of exporting a blank image', async () => {
  const { renderer, frames } = rendererFixture()
  renderer.getContext = () => ({ isContextLost: () => true })
  await assert.rejects(
    capturePhoto(renderer, new Scene(), new PerspectiveCamera()),
    /3D is unavailable/,
  )
  assert.equal(frames.length, 0)
})
