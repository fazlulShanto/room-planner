import {
  pointInPolygon,
  roomContains,
  wallLength,
  wallPoint,
  round,
  type Opening,
  type Plan,
  type Point,
  type Room,
  type Wall,
} from './model.ts'

const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0]
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]]
const key = (p: Point) => `${round(p[0], 4)},${round(p[1], 4)}`
export const polygonArea = (p: Point[]) =>
  p.reduce((sum, a, i) => sum + cross(a, p[(i + 1) % p.length]), 0) / 2
export function projectToWall(point: Point, wall: Wall) {
  const dx = wall.to[0] - wall.from[0],
    dz = wall.to[1] - wall.from[1],
    length = wallLength(wall)
  const along = Math.max(
    0,
    Math.min(length, ((point[0] - wall.from[0]) * dx + (point[1] - wall.from[1]) * dz) / length),
  )
  const projected = wallPoint(wall, along)
  return { point: projected, along, distance: Math.hypot(...sub(point, projected)) }
}
export function snapBuildingPoint(point: Point, walls: Wall[], step = 1, tolerance = 8): Point {
  const endpoints = walls
    .flatMap((w) => [w.from, w.to])
    .sort((a, b) => Math.hypot(...sub(point, a)) - Math.hypot(...sub(point, b)))
  if (endpoints[0] && Math.hypot(...sub(point, endpoints[0])) <= tolerance) return [...endpoints[0]]
  const edges = walls.map((w) => projectToWall(point, w)).sort((a, b) => a.distance - b.distance)
  if (edges[0]?.distance <= tolerance) return edges[0].point.map((n) => round(n, 4)) as Point
  return point.map((n) => Math.max(-4900, Math.min(4900, Math.round(n / step) * step))) as Point
}
// Split a planar wall graph at intersections, then trace each bounded face.
// Wall records stay intact, so openings keep their positions along their original wall.
export function detectRooms(walls: Wall[], previous: Room[]): Room[] {
  const stops = walls.map(() => [0, 1])
  walls.forEach((a, i) =>
    walls.slice(i + 1).forEach((b, offset) => {
      const j = i + 1 + offset,
        r = sub(a.to, a.from),
        s = sub(b.to, b.from),
        q = sub(b.from, a.from),
        den = cross(r, s)
      if (Math.abs(den) > 1e-7) {
        const t = cross(q, s) / den,
          u = cross(q, r) / den
        if (t >= -1e-7 && t <= 1 + 1e-7 && u >= -1e-7 && u <= 1 + 1e-7) {
          stops[i].push(Math.max(0, Math.min(1, t)))
          stops[j].push(Math.max(0, Math.min(1, u)))
        }
      } else {
        for (const point of [b.from, b.to]) {
          const p = projectToWall(point, a)
          if (p.distance < 0.001) stops[i].push(p.along / wallLength(a))
        }
        for (const point of [a.from, a.to]) {
          const p = projectToWall(point, b)
          if (p.distance < 0.001) stops[j].push(p.along / wallLength(b))
        }
      }
    }),
  )
  type Edge = { from: Point; to: Point; thickness: number; used: boolean; reverse?: Edge }
  const outgoing = new Map<string, Edge[]>(),
    seen = new Set<string>(),
    edges: Edge[] = []
  const put = (edge: Edge) => {
    edges.push(edge)
    outgoing.set(key(edge.from), [...(outgoing.get(key(edge.from)) ?? []), edge])
  }
  walls.forEach((wall, i) => {
    const values = [...new Set(stops[i].map((n) => round(n, 7)))].sort((a, b) => a - b)
    for (let k = 1; k < values.length; k++) {
      const from = wallPoint(wall, values[k - 1] * wallLength(wall)).map((n) =>
        round(n, 4),
      ) as Point
      const to = wallPoint(wall, values[k] * wallLength(wall)).map((n) => round(n, 4)) as Point
      if (Math.hypot(...sub(to, from)) < 0.01) continue
      const id = [key(from), key(to)].sort().join('|')
      if (seen.has(id)) continue
      seen.add(id)
      const a: Edge = { from, to, thickness: wall.thickness, used: false },
        b: Edge = { from: to, to: from, thickness: wall.thickness, used: false }
      a.reverse = b
      b.reverse = a
      put(a)
      put(b)
    }
  })
  outgoing.forEach((list) =>
    list.sort(
      (a, b) =>
        Math.atan2(a.to[1] - a.from[1], a.to[0] - a.from[0]) -
        Math.atan2(b.to[1] - b.from[1], b.to[0] - b.from[0]),
    ),
  )
  const rooms: Room[] = [],
    usedRooms = new Set<string>()
  for (const first of edges) {
    if (first.used) continue
    const path: Edge[] = []
    let edge = first
    while (!edge.used) {
      edge.used = true
      path.push(edge)
      const list = outgoing.get(key(edge.to))!,
        back = list.indexOf(edge.reverse!)
      edge = list[(back - 1 + list.length) % list.length]
    }
    if (edge !== first) continue
    // Interior wall stubs traverse in both directions; remove them from the floor boundary.
    let changed = true
    while (changed && path.length > 2) {
      changed = false
      for (let i = 0; i < path.length; i++) {
        const j = (i + 1) % path.length
        if (path[i].reverse === path[j]) {
          if (j === 0) {
            path.pop()
            path.shift()
          } else path.splice(i, 2)
          changed = true
          break
        }
      }
    }
    const raw = path.map((e) => e.from)
    if (path.length < 3 || polygonArea(raw) < 144) continue
    const lines = path.map((e) => {
      const v = sub(e.to, e.from),
        len = Math.hypot(...v),
        t = e.thickness / 2
      return { v, p: [e.from[0] - (v[1] / len) * t, e.from[1] + (v[0] / len) * t] as Point }
    })
    const outline = lines.map((b, i): Point => {
      const a = lines[(i - 1 + lines.length) % lines.length],
        den = cross(a.v, b.v)
      if (Math.abs(den) < 1e-7) return b.p
      const t = cross(sub(b.p, a.p), b.v) / den
      return [round(a.p[0] + a.v[0] * t, 4), round(a.p[1] + a.v[1] * t, 4)]
    })
    if (
      polygonArea(outline) < 36 ||
      outline.some(
        (p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || !pointInPolygon(raw, ...p),
      )
    )
      continue
    const x = Math.min(...outline.map((p) => p[0])),
      z = Math.min(...outline.map((p) => p[1])),
      width = Math.max(...outline.map((p) => p[0])) - x,
      depth = Math.max(...outline.map((p) => p[1])) - z
    const old =
      previous.find(
        (r) => !usedRooms.has(r.id) && pointInPolygon(raw, r.x + r.width / 2, r.z + r.depth / 2),
      ) ??
      previous.find((r) => !usedRooms.has(r.id) && roomContains(r, x + width / 2, z + depth / 2))
    if (old) usedRooms.add(old.id)
    rooms.push({
      ...(old ?? {
        id: crypto.randomUUID(),
        name: `Room ${rooms.length + 1}`,
        color: '#ddd8cc',
        type: 'room' as const,
      }),
      x,
      z,
      width,
      depth,
      outline,
    })
  }
  return rooms
}
export function rebuildRooms(plan: Plan): Plan {
  const rooms = detectRooms(plan.walls, plan.rooms)
  const roomFor = (x: number, z: number, old: string) =>
    rooms.find((r) => roomContains(r, x, z))?.id ??
    (rooms.some((r) => r.id === old) ? old : (rooms[0]?.id ?? ''))
  return {
    ...plan,
    autoRooms: true,
    rooms,
    finishes: Object.fromEntries(
      Object.entries(plan.finishes ?? {}).filter(([id]) => rooms.some((r) => r.id === id)),
    ),
    items: plan.items.map((item) => ({ ...item, roomId: roomFor(item.x, item.z, item.roomId) })),
    openings: plan.openings.map((o) => {
      const [x, z] = wallPoint(
        plan.walls.find((w) => w.id === o.wallId)!,
        o.center,
      )
      return { ...o, roomId: roomFor(x, z, o.roomId) }
    }),
  }
}
export function addWalls(plan: Plan, segments: [Point, Point][], thickness: number): Plan {
  const walls = [...plan.walls]
  for (const [from, to] of segments) {
    const vector = sub(to, from),
      length = Math.hypot(...vector)
    if (length < 6) continue
    const unit: Point = [vector[0] / length, vector[1] / length]
    let gaps: [number, number][] = [[0, length]]
    // Reuse shared walls, including their openings, when adjoining rooms overlap an edge.
    for (const wall of walls) {
      const a = sub(wall.from, from),
        b = sub(wall.to, from)
      if (Math.abs(cross(a, unit)) > 0.001 || Math.abs(cross(b, unit)) > 0.001) continue
      const distances = [a[0] * unit[0] + a[1] * unit[1], b[0] * unit[0] + b[1] * unit[1]]
      const start = Math.min(...distances),
        end = Math.max(...distances)
      gaps = gaps.flatMap(([lo, hi]): [number, number][] =>
        end <= lo || start >= hi
          ? [[lo, hi]]
          : [
              ...(start > lo ? [[lo, start] as [number, number]] : []),
              ...(end < hi ? [[end, hi] as [number, number]] : []),
            ],
      )
    }
    for (const [lo, hi] of gaps)
      if (hi - lo >= 0.25)
        walls.push({
          id: crypto.randomUUID(),
          thickness,
          from: [round(from[0] + unit[0] * lo, 4), round(from[1] + unit[1] * lo, 4)],
          to: [round(from[0] + unit[0] * hi, 4), round(from[1] + unit[1] * hi, 4)],
        })
  }
  if (walls.length > 500) throw new Error('A floor can have up to 500 walls.')
  return rebuildRooms({ ...plan, walls })
}
export function changeWall(plan: Plan, id: string, patch: Partial<Wall>): Plan {
  const old = plan.walls.find((w) => w.id === id)!,
    next = { ...old, ...patch },
    length = wallLength(next)
  if (
    !Number.isFinite(length) ||
    length < 6 ||
    next.thickness < 0.25 ||
    next.thickness > 120 ||
    [...next.from, ...next.to].some((n) => !Number.isFinite(n) || Math.abs(n) > 4900)
  )
    throw new Error('Use a wall at least 6 inches long, within the drawing grid.')
  const ratio = length / wallLength(old)
  const openings = plan.openings.map((o) =>
    o.wallId === id ? { ...o, center: o.center * ratio } : o,
  )
  const cuts = openings.filter((o) => o.wallId === id).sort((a, b) => a.center - b.center)
  if (
    cuts.some(
      (o, i) =>
        o.center < o.width / 2 ||
        o.center + o.width / 2 > length ||
        (i > 0 && o.center - o.width / 2 < cuts[i - 1].center + cuts[i - 1].width / 2),
    )
  )
    throw new Error('Move or resize the openings before shortening this wall.')
  // Move joined endpoints with the edited wall to keep rooms closed.
  const walls = plan.walls.map((w) =>
    w.id === id
      ? next
      : {
          ...w,
          from:
            key(w.from) === key(old.from)
              ? next.from
              : key(w.from) === key(old.to)
                ? next.to
                : w.from,
          to: key(w.to) === key(old.from) ? next.from : key(w.to) === key(old.to) ? next.to : w.to,
        },
  )
  if (walls.some((w) => wallLength(w) < 6))
    throw new Error('This change would collapse a connected wall.')
  // Other joined walls can change length too; never leave their openings outside the wall.
  for (const w of walls)
    if (openings.some((o) => o.wallId === w.id && o.center + o.width / 2 > wallLength(w)))
      throw new Error('A connected wall is too short for its openings.')
  return rebuildRooms({ ...plan, walls, openings })
}
export function removeWall(plan: Plan, id: string) {
  return rebuildRooms({
    ...plan,
    walls: plan.walls.filter((w) => w.id !== id),
    openings: plan.openings.filter((o) => o.wallId !== id),
  })
}
export function addOpeningAt(
  plan: Plan,
  wall: Wall,
  point: Point,
  kind: Opening['kind'],
  width = kind === 'window' ? 48 : 32,
): Plan {
  if (width > wallLength(wall)) throw new Error('This wall is too short for the opening.')
  const center = Math.max(
    width / 2,
    Math.min(wallLength(wall) - width / 2, projectToWall(point, wall).along),
  )
  if (
    plan.openings.some(
      (o) => o.wallId === wall.id && Math.abs(o.center - center) < (o.width + width) / 2 + 1,
    )
  )
    throw new Error('Leave space between openings on this wall.')
  const sill = kind === 'window' ? Math.min(30, plan.ceiling / 3) : 0,
    height = Math.min(kind === 'window' ? 48 : 82, plan.ceiling - sill)
  const [x, z] = wallPoint(wall, center),
    room =
      plan.rooms.find((r) => roomContains(r, x, z)) ??
      plan.rooms
        .slice()
        .sort(
          (a, b) =>
            Math.hypot(a.x + a.width / 2 - x, a.z + a.depth / 2 - z) -
            Math.hypot(b.x + b.width / 2 - x, b.z + b.depth / 2 - z),
        )[0]
  return {
    ...plan,
    openings: [
      ...plan.openings,
      {
        id: crypto.randomUUID(),
        name: kind === 'window' ? 'Window' : kind === 'passage' ? 'Open passage' : 'Door',
        kind,
        wallId: wall.id,
        roomId: room?.id ?? '',
        width,
        center,
        sill,
        height,
        swing: 1,
      },
    ],
  }
}
