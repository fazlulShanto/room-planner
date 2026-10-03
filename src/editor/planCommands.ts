import { openingLimits, wallLength, type Plan, type Item, type Opening } from '../model.ts'

export function changeItem(plan: Plan, id: string, patch: Partial<Item>): Plan {
  return {
    ...plan,
    items: plan.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }
}

export function duplicateItem(item: Item): Item {
  return {
    ...item,
    id: crypto.randomUUID(),
    name: `${item.name} copy`.slice(0, 120),
    x: item.x + 12,
    z: item.z + 12,
    locked: false,
  }
}

export function changeOpening(p: Plan, id: string, patch: Partial<Opening>): Plan {
  if (!p.openings.some((o) => o.id === id)) return p
  const original = p.openings.find((o) => o.id === id)!,
    next = { ...original, ...patch }
  const wall = p.walls.find((w) => w.id === next.wallId)!,
    limits = openingLimits(next, p)
  if (
    next.width > limits.maxWidth ||
    next.width <= 0 ||
    next.height <= 0 ||
    next.sill < 0 ||
    next.sill + next.height > p.ceiling
  ) {
    throw new Error('This opening must fit within its room wall and below the ceiling.')
  }
  next.center = Math.max(limits.min, Math.min(limits.max, next.center))
  if (
    p.openings.some(
      (o) =>
        o.id !== id &&
        o.wallId === next.wallId &&
        Math.abs(o.center - next.center) < (o.width + next.width) / 2 - 0.05,
    )
  ) {
    throw new Error('That size or position would overlap another opening.')
  }
  if (next.center + next.width / 2 > wallLength(wall)) return p
  return {
    ...p,
    openings: p.openings.map((o) => (o.id === id ? next : o)),
  }
}
