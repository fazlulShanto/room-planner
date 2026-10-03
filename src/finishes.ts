import {
  roomType,
  roomContains,
  wallAngle,
  wallBlocks,
  wallLength,
  wallPoint,
  type Plan,
  type Room,
  type RoomFinishes,
  type Wall,
  type WallBlock,
} from './model.ts'

export const DEFAULT_WALL_COLOR = '#e4dfd4'
export const DEFAULT_CEILING_COLOR = '#f1eee6'
export const canColorRoom = (room: Room) => roomType(room) !== 'bathroom'
export const finishRooms = (plan: Plan, roomId: string) =>
  plan.rooms.filter((r) => canColorRoom(r) && (roomId === 'all' || roomId === r.id))
export function roomFinishes(plan: Plan, room: Room): RoomFinishes {
  return {
    wall: DEFAULT_WALL_COLOR,
    ceiling: DEFAULT_CEILING_COLOR,
    floor:
      roomType(room) === 'bathroom'
        ? '#a5bcc3'
        : roomType(room) === 'kitchen'
          ? '#e0dfd7'
          : '#eeeae2',
    ...(canColorRoom(room) ? plan.finishes?.[room.id] : undefined),
  }
}
export function setRoomFinish(
  plan: Plan,
  roomId: string,
  surface: keyof RoomFinishes,
  color: string,
): Plan {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return plan
  const targets = finishRooms(plan, roomId)
  if (!targets.length) return plan
  const finishes = { ...plan.finishes }
  for (const room of targets)
    finishes[room.id] = { ...finishes[room.id], [surface]: color.toLowerCase() }
  return { ...plan, finishes }
}
export function resetRoomFinishes(plan: Plan, roomId: string): Plan {
  const finishes = { ...plan.finishes }
  for (const room of finishRooms(plan, roomId)) delete finishes[room.id]
  return { ...plan, finishes }
}
export function sharedFinish(
  plan: Plan,
  roomId: string,
  surface: keyof RoomFinishes,
): string | undefined {
  const values = new Set(finishRooms(plan, roomId).map((room) => roomFinishes(plan, room)[surface]))
  return values.size === 1 ? [...values][0] : undefined
}

export type FinishedWallBlock = WallBlock & { positiveColor: string; negativeColor: string }
// Split at room boundaries on both faces, so a shared wall can have two independent paints.
export function finishedWallBlocks(plan: Plan, wall: Wall): FinishedWallBlock[] {
  const length = wallLength(wall),
    ux = (wall.to[0] - wall.from[0]) / length,
    uz = (wall.to[1] - wall.from[1]) / length
  const a = (wallAngle(wall) * Math.PI) / 180,
    nx = Math.sin(a),
    nz = Math.cos(a)
  const offset = wall.thickness / 2 + 0.02,
    cuts = new Set([0, length])
  for (const side of [-1, 1]) {
    const origin = [wall.from[0] + nx * offset * side, wall.from[1] + nz * offset * side]
    for (const room of plan.rooms) {
      let enter = 0,
        exit = length
      for (const [position, direction, min, max] of [
        [origin[0], ux, room.x, room.x + room.width],
        [origin[1], uz, room.z, room.z + room.depth],
      ]) {
        if (Math.abs(direction) < 1e-8) {
          if (position < min || position > max) {
            exit = -1
            break
          }
        } else {
          const start = (min - position) / direction,
            end = (max - position) / direction
          enter = Math.max(enter, Math.min(start, end))
          exit = Math.min(exit, Math.max(start, end))
        }
      }
      if (exit - enter > 0.001) {
        cuts.add(enter)
        cuts.add(exit)
      }
    }
  }
  const paint = (x: number, z: number, side: number) => {
    const px = x + nx * offset * side,
      pz = z + nz * offset * side
    const room = plan.rooms.find((r) => roomContains(r, px, pz))
    return room ? roomFinishes(plan, room).wall : DEFAULT_WALL_COLOR
  }
  return wallBlocks(wall, plan.openings, plan.ceiling).flatMap((block) => {
    const center = (block.x - wall.from[0]) * ux + (block.z - wall.from[1]) * uz
    const start = center - block.width / 2,
      end = center + block.width / 2
    const stops = [
      start,
      ...[...cuts].filter((n) => n > start + 0.001 && n < end - 0.001),
      end,
    ].sort((a, b) => a - b)
    return stops.slice(1).map((stop, i) => {
      const [x, z] = wallPoint(wall, (stops[i] + stop) / 2)
      return {
        ...block,
        x,
        z,
        width: stop - stops[i],
        positiveColor: paint(x, z, 1),
        negativeColor: paint(x, z, -1),
      }
    })
  })
}
