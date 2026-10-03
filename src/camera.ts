import * as THREE from 'three'
import { m, planBounds, type Plan } from './model.ts'

export type ViewSize = { width: number; height: number }
// A restrained perspective lens gives depth without wide-angle stretching.
export const DOLLHOUSE_FOV = 40
export function createDollhouseCamera() {
  return new THREE.PerspectiveCamera(DOLLHOUSE_FOV, 1, 0.05, 250)
}

export function fitDollhouseCamera(
  camera: THREE.Camera,
  plan: Plan,
  roomId: string,
  size: ViewSize,
) {
  const room = plan.rooms.find((r) => r.id === roomId)
  const bounds = planBounds(plan)
  const minX = room ? room.x - 6 : bounds.minX,
    maxX = room ? room.x + room.width + 6 : bounds.maxX
  const minZ = room ? room.z - 6 : bounds.minZ,
    maxZ = room ? room.z + room.depth + 6 : bounds.maxZ
  const target = new THREE.Vector3(
    m((minX + maxX) / 2),
    m(plan.ceiling * 0.35),
    m((minZ + maxZ) / 2),
  )
  const perspective = camera as THREE.PerspectiveCamera
  perspective.aspect = Math.max(1, size.width) / Math.max(1, size.height)
  perspective.zoom = 1
  const direction = new THREE.Vector3(8, 12, 11).normalize()
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize()
  const up = new THREE.Vector3().crossVectors(direction, right)
  const tanY = Math.tan(THREE.MathUtils.degToRad(perspective.fov / 2)),
    tanX = tanY * perspective.aspect
  let distance = 1
  // Fit the complete 3D bounds, not just the floor footprint, in camera space.
  for (const x of [minX, maxX])
    for (const z of [minZ, maxZ])
      for (const y of [0, plan.ceiling]) {
        const relative = new THREE.Vector3(m(x), m(y), m(z)).sub(target)
        const screenExtent = Math.max(
          Math.abs(relative.dot(right)) / tanX,
          Math.abs(relative.dot(up)) / tanY,
        )
        distance = Math.max(distance, relative.dot(direction) + screenExtent * 1.13)
      }
  camera.position.copy(target).addScaledVector(direction, distance)
  camera.lookAt(target)
  perspective.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  return target
}
