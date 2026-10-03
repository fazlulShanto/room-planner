import {
  roomContains,
  itemFootprints,
  wallBlocks,
  wallPoint,
  wallAngle,
  type Plan,
  type Point,
} from './model.ts'

export const WALK_EYE_HEIGHT = 65
export const WALK_RADIUS = 8
export const DOOR_REACH = 120
export function walkEyeHeight(plan: Plan, requested = plan.walkHeight ?? WALK_EYE_HEIGHT) {
  return Math.max(12, Math.min(requested, 96, plan.ceiling - 2))
}
export function closedDoorObstacle(plan: Plan, id: string): Obstacle | null {
  const door = plan.openings.find((o) => o.id === id && o.kind === 'door')
  if (!door) return null
  const wall = plan.walls.find((w) => w.id === door.wallId)!
  const [x, z] = wallPoint(wall, door.center)
  return { x, z, width: door.width, depth: 1.5, rotation: wallAngle(wall) }
}
export function canCloseDoor(plan: Plan, id: string, position: Point) {
  const obstacle = closedDoorObstacle(plan, id)
  return !!obstacle && !touches(...position, WALK_RADIUS, obstacle)
}
export type WalkInput = { forward: number; strafe: number; turn: number }
export const STILL: WalkInput = { forward: 0, strafe: 0, turn: 0 }
type Obstacle = { x: number; z: number; width: number; depth: number; rotation: number }

function touches(x: number, z: number, radius: number, rect: Obstacle): boolean {
  const a = (rect.rotation * Math.PI) / 180,
    dx = x - rect.x,
    dz = z - rect.z
  const localX = Math.cos(a) * dx - Math.sin(a) * dz
  const localZ = Math.sin(a) * dx + Math.cos(a) * dz
  const gapX = Math.max(Math.abs(localX) - rect.width / 2, 0)
  const gapZ = Math.max(Math.abs(localZ) - rect.depth / 2, 0)
  return gapX * gapX + gapZ * gapZ < radius * radius - 0.01
}

// Built once per layout change, rather than reconstructing walls on every frame.
export function createWalkSpace(
  plan: Plan,
  eyeHeight = walkEyeHeight(plan),
  closedDoors: ReadonlySet<string> = new Set(),
) {
  const obstacles: Obstacle[] = [
    ...[...closedDoors].flatMap((id) => {
      const obstacle = closedDoorObstacle(plan, id)
      return obstacle ? [obstacle] : []
    }),
    ...plan.walls
      .flatMap((w) => wallBlocks(w, plan.openings, plan.ceiling))
      .filter((b) => b.elevation < eyeHeight && b.elevation + b.height > 0),
    ...plan.items
      .filter((i) => i.elevation < eyeHeight && i.elevation + i.height > 0)
      .flatMap(itemFootprints),
  ]
  const thresholds = plan.openings
    .filter((o) => o.kind !== 'window' && o.sill === 0 && o.height >= eyeHeight)
    .map((o) => {
      const wall = plan.walls.find((w) => w.id === o.wallId)!,
        [x, z] = wallPoint(wall, o.center)
      return { x, z, width: o.width, depth: wall.thickness + 0.2, rotation: wallAngle(wall) }
    })
  const contains = (x: number, z: number, r: Obstacle) => {
    const a = (r.rotation * Math.PI) / 180,
      dx = x - r.x,
      dz = z - r.z
    return (
      Math.abs(Math.cos(a) * dx - Math.sin(a) * dz) <= r.width / 2 + 0.01 &&
      Math.abs(Math.sin(a) * dx + Math.cos(a) * dz) <= r.depth / 2 + 0.01
    )
  }
  function canStand(x: number, z: number) {
    const onFloor =
      plan.rooms.some((r) => roomContains(r, x, z)) || thresholds.some((r) => contains(x, z, r))
    return onFloor && !obstacles.some((r) => touches(x, z, WALK_RADIUS, r))
  }
  function move(position: Point, dx: number, dz: number): Point {
    let [x, z] = position
    // Substeps stop fast frames from tunneling through thin walls; separate axes allow sliding.
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 2))
    for (let n = 0; n < steps; n++) {
      if (canStand(x + dx / steps, z)) x += dx / steps
      if (canStand(x, z + dz / steps)) z += dz / steps
    }
    return [x, z]
  }
  function start(roomId: string): Point {
    const room =
      plan.rooms.find((r) => r.id === roomId) ||
      plan.rooms.find((r) => r.id === 'room3') ||
      plan.rooms[0]
    if (!room) return [0, 0]
    const candidates: Point[] = [
      [room.x + room.width * 0.68, room.z + room.depth * 0.72],
      [room.x + room.width / 2, room.z + room.depth / 2],
    ]
    for (let z = room.z + WALK_RADIUS + 1; z < room.z + room.depth - WALK_RADIUS; z += 8)
      for (let x = room.x + WALK_RADIUS + 1; x < room.x + room.width - WALK_RADIUS; x += 8)
        candidates.push([x, z])
    return (
      candidates.find(([x, z]) => canStand(x, z)) || [
        room.x + room.width / 2,
        room.z + room.depth / 2,
      ]
    )
  }
  return { canStand, move, start }
}

export function walkDelta(yaw: number, forward: number, strafe: number, distance: number): Point {
  const length = Math.max(1, Math.hypot(forward, strafe))
  return [
    ((strafe * Math.cos(yaw) - forward * Math.sin(yaw)) / length) * distance,
    ((-forward * Math.cos(yaw) - strafe * Math.sin(yaw)) / length) * distance,
  ]
}
