import { openingLimits, round, wallLength, type Opening, type Plan, type Point } from '../model.ts'

/** Project pointer movement onto the wall, preserving where the opening was grabbed. */
export function openingCenterFromDrag(
  plan: Plan,
  opening: Opening,
  delta: Point,
  snap: boolean,
): number {
  const wall = plan.walls.find((w) => w.id === opening.wallId)
  if (!wall) return opening.center
  const length = wallLength(wall)
  const distance =
    (delta[0] * (wall.to[0] - wall.from[0]) + delta[1] * (wall.to[1] - wall.from[1])) / length
  const step = snap ? 1 : 0.01
  const desired = round(Math.round((opening.center + distance) / step) * step)
  const limits = openingLimits(opening, plan)
  let min = Math.max(opening.width / 2, limits.min)
  let max = Math.min(length - opening.width / 2, limits.max)
  // Stop at neighbors instead of jumping across or overlapping them during a fast drag.
  for (const other of plan.openings) {
    if (other.id === opening.id || other.wallId !== opening.wallId) continue
    const clearance = (opening.width + other.width) / 2
    if (other.center < opening.center) min = Math.max(min, other.center + clearance)
    else max = Math.min(max, other.center - clearance)
  }
  return min <= max ? Math.max(min, Math.min(max, desired)) : opening.center
}
