import { m, roomContains, type Plan, type Point } from './model.ts'
import { createWalkSpace, walkEyeHeight } from './walk.ts'

export const PHOTO_WIDTH = 1920
export const PHOTO_HEIGHT = 1080
export const PHOTO_ASPECT = PHOTO_WIDTH / PHOTO_HEIGHT
export const PHOTO_FOV = 110
export const PHOTO_CORNERS = ['Top left', 'Top right', 'Bottom right', 'Bottom left'] as const
export type PhotoPose = { position: [number, number, number]; target: [number, number, number] }

export function photoVerticalFov(horizontalFov: number) {
  return (2 * Math.atan(Math.tan((horizontalFov * Math.PI) / 360) / PHOTO_ASPECT) * 180) / Math.PI
}

/** Find a clear camera position near the requested corner, including in polygonal rooms. */
export function roomPhotoPose(plan: Plan, roomId: string, corner: number): PhotoPose | null {
  const room = plan.rooms.find((r) => r.id === roomId)
  if (!room) return null
  const height = walkEyeHeight(plan)
  const space = createWalkSpace(plan, height)
  const desired: Point = [
    room.x + ([1, 2].includes(corner) ? room.width - 12 : 12),
    room.z + (corner >= 2 ? room.depth - 12 : 12),
  ]
  let best: Point | null = null
  let distance = Infinity
  const consider = (x: number, z: number) => {
    const next = Math.hypot(x - desired[0], z - desired[1])
    if (next < distance && roomContains(room, x, z) && space.canStand(x, z)) {
      best = [x, z]
      distance = next
    }
  }
  consider(...desired)
  consider(room.x + room.width / 2, room.z + room.depth / 2)
  const step = Math.max(8, Math.max(room.width, room.depth) / 80)
  for (let z = room.z + 9; z < room.z + room.depth - 8; z += step)
    for (let x = room.x + 9; x < room.x + room.width - 8; x += step) consider(x, z)
  if (!best) return null
  return {
    position: [m(best[0]), m(height), m(best[1])],
    target: [m(room.x + room.width / 2), m(height - 8), m(room.z + room.depth / 2)],
  }
}

export function roomPhotoFilename(project: string, floor: string, room: string) {
  const safe = (name: string) =>
    name
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'room'
  return `${[project, floor, room].map(safe).join('-')}-wide-angle.png`
}
