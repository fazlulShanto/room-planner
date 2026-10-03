import { CATALOG, type ItemKind } from './catalog.ts'
export { CATALOG, type ItemKind } from './catalog.ts'

// All stored dimensions are inches. Conversion to meters happens only in the renderer.
export type Point = [number, number]
export type Room = {
  id: string
  name: string
  x: number
  z: number
  width: number
  depth: number
  color: string
  estimated?: boolean
  outline?: Point[]
  type?: 'room' | 'kitchen' | 'bathroom' | 'corridor'
}
export type Wall = { id: string; from: Point; to: Point; thickness: number }
export type Opening = {
  id: string
  name: string
  roomId: string
  wallId: string
  kind: 'door' | 'window' | 'passage'
  hinge?: 'start' | 'end'
  center: number
  width: number
  height: number
  sill: number
  swing: 1 | -1
}
export type Item = {
  id: string
  name: string
  kind: ItemKind
  roomId: string
  x: number
  z: number
  width: number
  depth: number
  height: number
  elevation: number
  rotation: number
  color: string
  locked: boolean
  chaiseSide?: 'left' | 'right'
  seatDepthRatio?: number
  chaiseWidthRatio?: number
}
export type LightingSettings = { hour: number; shadows: boolean }
export type RoomFinishes = { wall: string; ceiling: string; floor: string }
export type Plan = {
  version: 1
  name: string
  ceiling: number
  rooms: Room[]
  walls: Wall[]
  openings: Opening[]
  items: Item[]
  finishes?: Record<string, Partial<RoomFinishes>>
  lighting?: LightingSettings
  walkHeight?: number
  autoRooms?: boolean
}
export type WallBlock = {
  x: number
  z: number
  width: number
  depth: number
  height: number
  elevation: number
  rotation: number
}
export type Issue = {
  itemId: string
  kind: 'overlap' | 'wall' | 'door' | 'outside' | 'ceiling'
  message: string
}
export type Unit = 'imperial' | 'in' | 'cm'
export const METERS_PER_INCH = 0.0254
export const m = (inches: number) => inches * METERS_PER_INCH
export const round = (n: number, places = 2) => Number(n.toFixed(places))
export const normalizedAngle = (n: number) => ((n % 360) + 360) % 360
export function formatDimension(n: number, unit: Unit = 'imperial'): string {
  if (unit === 'cm') return `${round(n * 2.54, 1)} cm`
  if (unit === 'in') return `${round(n)}″`
  const total = round(Math.abs(n)),
    feet = Math.floor(total / 12),
    inches = round(total - feet * 12)
  return `${n < 0 ? '−' : ''}${feet ? `${feet}′` : ''}${inches || !feet ? `${feet ? ' ' : ''}${inches}″` : ''}`
}

export function createInitialPlan(): Plan {
  const wall = (id: string, from: Point, to: Point, thickness = 6): Wall => ({
    id,
    from,
    to,
    thickness,
  })
  const opening = (
    id: string,
    name: string,
    roomId: string,
    wallId: string,
    center: number,
    width: number,
    kind: Opening['kind'],
    swing: 1 | -1 = 1,
  ): Opening => ({
    id,
    name,
    roomId,
    wallId,
    center,
    width,
    kind,
    swing,
    height: kind === 'window' ? 48 : 82,
    sill: kind === 'window' ? 30 : 0,
  })
  const bed = (
    id: string,
    roomId: string,
    name: string,
    width: number,
    x: number,
    z: number,
    rotation: number,
    color: string,
  ): Item => ({
    id,
    roomId,
    name,
    kind: 'bed',
    width,
    depth: 84,
    height: 36,
    x,
    z,
    rotation,
    elevation: 0,
    color,
    locked: false,
  })
  return {
    version: 1,
    name: 'Our home',
    ceiling: 102,
    rooms: [
      { id: 'kitchen', name: 'Kitchen', x: 0, z: 0, width: 96, depth: 67, color: '#ddd7c9' },
      {
        id: 'bath1',
        name: 'Washroom 1',
        x: 109.2,
        z: 0,
        width: 96.8,
        depth: 67,
        color: '#cbdad6',
        estimated: true,
      },
      { id: 'room3', name: 'Room 3', x: 0, z: 73, width: 206, depth: 141, color: '#e2ceaf' },
      { id: 'room2', name: 'Room 2', x: 0, z: 220, width: 120, depth: 97, color: '#e4d1b5' },
      { id: 'room1', name: 'Room 1', x: 0, z: 323, width: 120, depth: 125, color: '#ddc9ac' },
      { id: 'hall', name: 'Corridor', x: 126, z: 220, width: 35, depth: 228, color: '#ddd8cc' },
      {
        id: 'bath2',
        name: 'Washroom 2',
        x: 167,
        z: 220,
        width: 60,
        depth: 97,
        color: '#cbdad6',
        estimated: true,
      },
    ],
    walls: [
      wall('north', [-3, -3], [209, -3]),
      wall('east-upper', [209, -3], [209, 217]),
      wall('bath2-north', [209, 217], [230, 217]),
      wall('bath2-east', [230, 217], [230, 320]),
      wall('bath2-south', [164, 320], [230, 320]),
      wall('hall-east', [164, 320], [164, 451]),
      wall('south', [-3, 451], [164, 451]),
      wall('west', [-3, -3], [-3, 451]),
      wall('kitchen-front', [-3, 70], [209, 70]),
      wall('room3-south', [-3, 217], [209, 217]),
      wall('bedroom-east', [123, 217], [123, 451]),
      wall('bedroom-middle', [-3, 320], [123, 320]),
      wall('bath2-west', [164, 217], [164, 320]),
      wall('pier', [102.6, -3], [102.6, 70], 13.2),
    ],
    openings: [
      opening('kitchen-door', 'Kitchen opening', 'kitchen', 'kitchen-front', 82.5, 33, 'passage'),
      opening('bath1-door', 'Washroom 1 door', 'bath1', 'kitchen-front', 125.7, 27, 'door'),
      opening('room3-door', 'Room 3 door', 'room3', 'room3-south', 146.5, 36, 'door'),
      opening('room2-door', 'Room 2 door', 'room2', 'bedroom-east', 79.5, 35, 'door'),
      {
        ...opening('room1-door', 'Room 1 door', 'room1', 'bedroom-east', 130.5, 37, 'door'),
        hinge: 'end',
      },
      opening('bath2-door', 'Washroom 2 door', 'bath2', 'bath2-west', 81, 30, 'door', -1),
      opening('entrance', 'Entrance door', 'hall', 'hall-east', 105, 32, 'door'),
      opening('kitchen-window', 'Kitchen window', 'kitchen', 'north', 51, 36, 'window'),
      opening('room3-window', 'Room 3 window', 'room3', 'west', 146.5, 72, 'window'),
      opening('room2-window', 'Room 2 window', 'room2', 'west', 271.5, 48, 'window'),
      opening('room1-window', 'Room 1 window', 'room1', 'west', 388.5, 60, 'window'),
    ],
    items: [
      bed('bed-room3', 'room3', 'Room 3 bed', 60, 43, 143.5, 90, '#879e87'),
      bed('bed-room2', 'room2', 'Room 2 bed', 72, 37, 263, 0, '#ad8c77'),
      bed('bed-room1', 'room1', 'Room 1 bed', 60, 48, 405, 180, '#8b9eaa'),
    ],
  }
}

export function wallLength(wall: Wall): number {
  return Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1])
}
export function wallPoint(wall: Wall, along: number): Point {
  const len = wallLength(wall)
  return [
    wall.from[0] + ((wall.to[0] - wall.from[0]) * along) / len,
    wall.from[1] + ((wall.to[1] - wall.from[1]) * along) / len,
  ]
}
export function wallAngle(wall: Wall): number {
  return (-Math.atan2(wall.to[1] - wall.from[1], wall.to[0] - wall.from[0]) * 180) / Math.PI
}
export function wallBlocks(wall: Wall, openings: Opening[], ceiling: number): WallBlock[] {
  const len = wallLength(wall),
    cuts = openings.filter((o) => o.wallId === wall.id).sort((a, b) => a.center - b.center)
  const result: WallBlock[] = []
  const add = (start: number, end: number, elevation: number, height: number) => {
    if (end - start < 0.001 || height < 0.001) return
    const [x, z] = wallPoint(wall, (start + end) / 2)
    result.push({
      x,
      z,
      width: end - start,
      depth: wall.thickness,
      elevation,
      height,
      rotation: wallAngle(wall),
    })
  }
  let cursor = 0
  for (const opening of cuts) {
    const start = Math.max(cursor, opening.center - opening.width / 2),
      end = Math.min(len, opening.center + opening.width / 2)
    add(cursor, start, 0, ceiling)
    add(start, end, 0, Math.min(opening.sill, ceiling))
    add(start, end, opening.sill + opening.height, ceiling - opening.sill - opening.height)
    cursor = end
  }
  add(cursor, len, 0, ceiling)
  return result
}

type Rect = Pick<Item, 'x' | 'z' | 'width' | 'depth' | 'rotation'>
export function corners(rect: Rect): Point[] {
  const a = (rect.rotation * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a)
  return (
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as Point[]
  ).map(([dx, dz]) => {
    const x = (dx * rect.width) / 2,
      z = (dz * rect.depth) / 2
    return [rect.x + c * x + s * z, rect.z - s * x + c * z]
  })
}
export function sectionalDimensions(item: Item) {
  return {
    bodyDepth: item.depth * (item.seatDepthRatio ?? 6 / 11),
    returnWidth: item.width * (item.chaiseWidthRatio ?? 1 / 3),
    side: item.chaiseSide ?? 'left',
  }
}
export function itemFootprints(item: Item): Rect[] {
  if (item.kind !== 'sofa-corner') return [item]
  const { bodyDepth, returnWidth, side } = sectionalDimensions(item)
  const a = (item.rotation * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a)
  const rect = (x: number, z: number, width: number, depth: number): Rect => ({
    x: item.x + c * x + s * z,
    z: item.z - s * x + c * z,
    width,
    depth,
    rotation: item.rotation,
  })
  return [
    rect(0, (bodyDepth - item.depth) / 2, item.width, bodyDepth),
    rect(
      ((side === 'left' ? -1 : 1) * (item.width - returnWidth)) / 2,
      bodyDepth / 2,
      returnWidth,
      item.depth - bodyDepth,
    ),
  ]
}
export function localItemOutline(item: Item): Point[] {
  const w = item.width / 2,
    d = item.depth / 2
  if (item.kind !== 'sofa-corner')
    return [
      [-w, -d],
      [w, -d],
      [w, d],
      [-w, d],
    ]
  const { bodyDepth, returnWidth, side } = sectionalDimensions(item)
  const points: Point[] = [
    [-w, -d],
    [w, -d],
    [w, -d + bodyDepth],
    [-w + returnWidth, -d + bodyDepth],
    [-w + returnWidth, d],
    [-w, d],
  ]
  return side === 'left' ? points : points.map(([x, z]) => [-x, z])
}
export function rectanglesOverlap(a: Rect, b: Rect): boolean {
  const ca = corners(a),
    cb = corners(b)
  for (const polygon of [ca, cb]) {
    for (let i = 0; i < 2; i++) {
      const p = polygon[i],
        q = polygon[i + 1],
        axis: Point = [q[1] - p[1], p[0] - q[0]]
      const len = Math.hypot(...axis),
        normal = axis.map((n) => n / len)
      const pa = ca.map((v) => v[0] * normal[0] + v[1] * normal[1]),
        pb = cb.map((v) => v[0] * normal[0] + v[1] * normal[1])
      if (Math.max(...pa) <= Math.min(...pb) + 0.05 || Math.max(...pb) <= Math.min(...pa) + 0.05)
        return false
    }
  }
  return true
}
function heightOverlap(
  a: Pick<Item, 'height' | 'elevation'>,
  b: Pick<Item, 'height' | 'elevation'>,
) {
  return a.elevation < b.elevation + b.height - 0.05 && b.elevation < a.elevation + a.height - 0.05
}
// Hinge choice mirrors the leaf along the opening; swing chooses the side of the wall.
// Missing hinge values in older layouts retain their original start-edge attachment.
export function doorLeaf(opening: Opening) {
  if (opening.kind !== 'door') return null
  const direction = opening.hinge === 'end' ? -1 : 1
  return {
    hingeOffset: (-direction * opening.width) / 2,
    direction,
    rotation: (-opening.swing * direction * Math.PI) / 2,
  }
}
export function hingeSideLabels(wall: Wall) {
  const dx = wall.to[0] - wall.from[0],
    dz = wall.to[1] - wall.from[1]
  const labels =
    Math.abs(dx) > Math.abs(dz)
      ? dx > 0
        ? ['Left', 'Right']
        : ['Right', 'Left']
      : dz > 0
        ? ['Top', 'Bottom']
        : ['Bottom', 'Top']
  return { start: labels[0], end: labels[1] }
}
export function doorClearance(opening: Opening, wall: Wall): Rect {
  const [x, z] = wallPoint(wall, opening.center),
    a = (wallAngle(wall) * Math.PI) / 180
  const offset = (opening.width / 2 + wall.thickness / 2) * opening.swing
  return {
    x: x + Math.sin(a) * offset,
    z: z + Math.cos(a) * offset,
    width: opening.width,
    depth: opening.width,
    rotation: wallAngle(wall),
  }
}
// Only thin rugs on the floor permit furniture and walking over them.
export const isFloorRug = (item: Item) =>
  item.kind === 'rug' && item.elevation === 0 && item.height <= 1

export function checkItem(item: Item, plan: Plan): Issue[] {
  const issues: Issue[] = [],
    room = plan.rooms.find((r) => r.id === item.roomId),
    footprints = itemFootprints(item)
  const issue = (kind: Issue['kind'], message: string) =>
    issues.push({ itemId: item.id, kind, message })
  if (!room || corners(item).some(([x, z]) => !roomContains(room, x, z)))
    issue('outside', 'Extends outside its room')
  if (item.elevation + item.height > plan.ceiling + 0.05)
    issue('ceiling', 'Extends above the ceiling')
  for (const other of plan.items) {
    if (
      other.id !== item.id &&
      !isFloorRug(item) &&
      !isFloorRug(other) &&
      heightOverlap(item, other) &&
      footprints.some((a) => itemFootprints(other).some((b) => rectanglesOverlap(a, b)))
    )
      issue('overlap', `Overlaps ${other.name}`)
  }
  if (
    plan.walls.some((w) =>
      wallBlocks(w, plan.openings, plan.ceiling).some(
        (b) => heightOverlap(item, b) && footprints.some((a) => rectanglesOverlap(a, b)),
      ),
    )
  )
    issue('wall', 'Intersects a wall')
  for (const o of plan.openings.filter((o) => o.kind === 'door')) {
    const wall = plan.walls.find((w) => w.id === o.wallId)
    if (
      wall &&
      !isFloorRug(item) &&
      item.elevation < o.height &&
      footprints.some((a) => rectanglesOverlap(a, doorClearance(o, wall)))
    )
      issue('door', `In ${o.name.toLowerCase()} swing area`)
  }
  return issues
}
export function checkPlan(plan: Plan): Issue[] {
  return plan.items.flatMap((item) => checkItem(item, plan))
}

export function placeNewItem(plan: Plan, kind: ItemKind, roomId: string): Item {
  const preset = CATALOG.find((p) => p.kind === kind)!,
    room =
      plan.rooms.find((r) => r.id === roomId) ||
      plan.rooms.find((r) => r.id === 'room3') ||
      plan.rooms[0]
  if (!room) throw new Error('Draw a closed room before adding furniture.')
  const { description: _description, category: _category, ...properties } = preset
  const item: Item = {
    ...properties,
    id: crypto.randomUUID(),
    roomId: room.id,
    x: room.x + room.width / 2,
    z: room.z + room.depth / 2,
    rotation: 0,
    locked: false,
  }
  const candidates: Point[] = []
  // Start wall cabinets and mirrors flush with the north interior wall, then try other free positions.
  if (kind === 'cabinet' || kind === 'mirror') {
    for (let x = room.x + item.width / 2; x <= room.x + room.width - item.width / 2; x += 6)
      candidates.push([x, room.z + item.depth / 2])
  }
  candidates.push([item.x, item.z])
  for (let z = room.z + item.depth / 2 + 1; z <= room.z + room.depth - item.depth / 2; z += 6) {
    for (let x = room.x + item.width / 2 + 1; x <= room.x + room.width - item.width / 2; x += 6)
      candidates.push([x, z])
  }
  const location = candidates.find(([x, z]) => checkItem({ ...item, x, z }, plan).length === 0)
  return location ? { ...item, x: location[0], z: location[1] } : item
}

export function openingLimits(
  opening: Opening,
  plan: Plan,
): { min: number; max: number; maxWidth: number } {
  const wall = plan.walls.find((w) => w.id === opening.wallId)!,
    room = plan.rooms.find((r) => r.id === opening.roomId)!
  const horizontal = Math.abs(wall.to[0] - wall.from[0]) > Math.abs(wall.to[1] - wall.from[1])
  if (!room || room.outline || plan.autoRooms)
    return {
      min: opening.width / 2,
      max: wallLength(wall) - opening.width / 2,
      maxWidth: wallLength(wall),
    }
  const start = horizontal ? room.x - wall.from[0] : room.z - wall.from[1]
  const end = start + (horizontal ? room.width : room.depth)
  return { min: start + opening.width / 2, max: end - opening.width / 2, maxWidth: end - start }
}

export function parsePlan(input: string): Plan {
  if (input.length > 2_000_000) throw new Error('This layout file is too large.')
  return validatePlan(JSON.parse(input))
}

// Editing and importing share the same invariants. This does not clone or mutate
// the plan, so rejected edits can leave the current workspace and history intact.
export function validatePlan(input: unknown): Plan {
  const p = input as Plan
  const finite = (n: unknown, min: number, max: number) =>
    typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
  const text = (s: unknown) => typeof s === 'string' && s.length > 0 && s.length <= 120
  const color = (s: unknown) => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s)
  const unique = (list: { id: string }[]) =>
    list.every((v) => text(v.id)) && new Set(list.map((v) => v.id)).size === list.length
  if (
    !p ||
    typeof p !== 'object' ||
    Array.isArray(p) ||
    p.version !== 1 ||
    !text(p.name) ||
    !finite(p.ceiling, 24, 600)
  )
    throw new Error('This is not a supported Roomwise layout.')
  if (
    ![p.rooms, p.walls, p.openings, p.items].every(
      (v) =>
        Array.isArray(v) &&
        v.length <= 500 &&
        v.every((i) => i && typeof i === 'object' && !Array.isArray(i)) &&
        unique(v),
    )
  )
    throw new Error('The layout contains invalid or duplicate records.')
  if (p.autoRooms !== undefined && typeof p.autoRooms !== 'boolean')
    throw new Error('Invalid room detection setting.')
  for (const r of p.rooms)
    if (
      !text(r.name) ||
      !finite(r.x, -5000, 5000) ||
      !finite(r.z, -5000, 5000) ||
      !finite(r.width, 1, 5000) ||
      !finite(r.depth, 1, 5000) ||
      !color(r.color)
    )
      throw new Error('A room has invalid dimensions.')
  for (const r of p.rooms) {
    if (r.type !== undefined && !['room', 'kitchen', 'bathroom', 'corridor'].includes(r.type))
      throw new Error('Invalid room type.')
    if (
      r.outline !== undefined &&
      (!Array.isArray(r.outline) ||
        r.outline.length < 3 ||
        r.outline.length > 500 ||
        r.outline.some(
          (v) => !Array.isArray(v) || v.length !== 2 || !v.every((n) => finite(n, -5000, 5000)),
        ))
    )
      throw new Error('Invalid room outline.')
  }
  if (p.walkHeight !== undefined && !finite(p.walkHeight, 12, 96))
    throw new Error('Walking camera height must be between 12 and 96 inches.')
  if (
    p.lighting !== undefined &&
    (!p.lighting ||
      typeof p.lighting !== 'object' ||
      Array.isArray(p.lighting) ||
      !finite(p.lighting.hour, 0, 24) ||
      typeof p.lighting.shadows !== 'boolean')
  )
    throw new Error('Lighting needs a time between 0 and 24 hours and a shadow setting.')
  if (p.finishes !== undefined) {
    if (!p.finishes || typeof p.finishes !== 'object' || Array.isArray(p.finishes))
      throw new Error('Room colors must be a room-to-finish map.')
    for (const [roomId, finish] of Object.entries(p.finishes)) {
      if (
        !p.rooms.some((r) => r.id === roomId) ||
        !finish ||
        typeof finish !== 'object' ||
        Array.isArray(finish) ||
        Object.entries(finish).some(
          ([surface, value]) => !['wall', 'ceiling', 'floor'].includes(surface) || !color(value),
        )
      )
        throw new Error('A room has invalid finish colors.')
    }
  }
  for (const w of p.walls)
    if (
      ![w.from, w.to].every(
        (v) => Array.isArray(v) && v.length === 2 && v.every((n) => finite(n, -5000, 5000)),
      ) ||
      !finite(w.thickness, 0.25, 120) ||
      wallLength(w) < 0.25
    )
      throw new Error('A wall has invalid dimensions.')
  for (const o of p.openings) {
    const wall = p.walls.find((w) => w.id === o.wallId)
    if (
      !text(o.name) ||
      !wall ||
      (o.roomId !== '' && !p.rooms.some((r) => r.id === o.roomId)) ||
      !['window', 'door', 'passage'].includes(o.kind) ||
      (o.hinge !== undefined && !['start', 'end'].includes(o.hinge)) ||
      !finite(o.width, 0.25, 1200) ||
      !finite(o.height, 0.25, p.ceiling) ||
      !finite(o.sill, 0, p.ceiling) ||
      o.sill + o.height > p.ceiling + 0.05 ||
      !finite(o.center, o.width / 2, wallLength(wall) - o.width / 2) ||
      ![1, -1].includes(o.swing)
    )
      throw new Error('An opening has invalid dimensions or placement.')
  }
  for (const wall of p.walls) {
    const openings = p.openings
      .filter((o) => o.wallId === wall.id)
      .sort((a, b) => a.center - b.center)
    if (
      openings.some(
        (o, i) =>
          i > 0 &&
          o.center - o.width / 2 < openings[i - 1].center + openings[i - 1].width / 2 - 0.05,
      )
    )
      throw new Error('Two openings overlap on the same wall.')
  }
  for (const i of p.items)
    if (
      !text(i.name) ||
      !CATALOG.some((c) => c.kind === i.kind) ||
      (i.roomId !== '' && !p.rooms.some((r) => r.id === i.roomId)) ||
      !finite(i.x, -5000, 5000) ||
      !finite(i.z, -5000, 5000) ||
      ![i.width, i.depth, i.height].every((n) => finite(n, 0.25, 1200)) ||
      !finite(i.elevation, 0, 1200) ||
      !finite(i.rotation, -36000, 36000) ||
      typeof i.locked !== 'boolean' ||
      !color(i.color)
    )
      throw new Error('A furniture item has invalid dimensions.')
  for (const i of p.items) {
    if (
      (i.chaiseSide !== undefined && !['left', 'right'].includes(i.chaiseSide)) ||
      (i.seatDepthRatio !== undefined && !finite(i.seatDepthRatio, 0.05, 0.95)) ||
      (i.chaiseWidthRatio !== undefined && !finite(i.chaiseWidthRatio, 0.05, 0.95))
    )
      throw new Error('A sofa has invalid shape dimensions.')
  }
  return p
}

export function roomOutline(room: Room): Point[] {
  return (
    room.outline ?? [
      [room.x, room.z],
      [room.x + room.width, room.z],
      [room.x + room.width, room.z + room.depth],
      [room.x, room.z + room.depth],
    ]
  )
}
export function pointInPolygon(points: Point[], x: number, z: number) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, az] = points[j],
      [bx, bz] = points[i],
      dx = bx - ax,
      dz = bz - az
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)))
    if (Math.hypot(x - ax - t * dx, z - az - t * dz) < 0.05) return true
    if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside
  }
  return inside
}
export const roomContains = (room: Room, x: number, z: number) =>
  pointInPolygon(roomOutline(room), x, z)
export const roomType = (room: Room) =>
  room.type ??
  (room.id.startsWith('bath')
    ? 'bathroom'
    : room.id === 'kitchen'
      ? 'kitchen'
      : room.id === 'hall'
        ? 'corridor'
        : 'room')
export function planBounds(plan: Plan) {
  const points = [...plan.walls.flatMap((w) => [w.from, w.to]), ...plan.rooms.flatMap(roomOutline)]
  if (!points.length) return { minX: -120, minZ: -120, maxX: 360, maxZ: 360 }
  return {
    minX: Math.min(...points.map((p) => p[0])) - 6,
    minZ: Math.min(...points.map((p) => p[1])) - 6,
    maxX: Math.max(...points.map((p) => p[0])) + 6,
    maxZ: Math.max(...points.map((p) => p[1])) + 6,
  }
}
