import { roomContains, round, type Item, type Plan, type Point } from '../model.ts'

export type ItemTransform = Pick<Item, 'x' | 'z' | 'width' | 'depth'>
export type ResizeHandle = { x: -1 | 0 | 1; z: -1 | 0 | 1; label: string }

export const RESIZE_HANDLES: ResizeHandle[] = [
  { x: -1, z: -1, label: 'Resize width and depth' },
  { x: 0, z: -1, label: 'Resize depth' },
  { x: 1, z: -1, label: 'Resize width and depth' },
  { x: 1, z: 0, label: 'Resize width' },
  { x: 1, z: 1, label: 'Resize width and depth' },
  { x: 0, z: 1, label: 'Resize depth' },
  { x: -1, z: 1, label: 'Resize width and depth' },
  { x: -1, z: 0, label: 'Resize width' },
]

const snapped = (value: number, snap: boolean) =>
  round(Math.round(value / (snap ? 1 : 0.01)) * (snap ? 1 : 0.01))

/** Delta is measured from pointer-down, so grabbing off-center never jumps. */
export function moveFromDrag(item: Item, delta: Point, snap: boolean): ItemTransform {
  return {
    x: Math.max(-5000, Math.min(5000, snapped(item.x + delta[0], snap))),
    z: Math.max(-5000, Math.min(5000, snapped(item.z + delta[1], snap))),
    width: item.width,
    depth: item.depth,
  }
}

/** Resize in the item's local axes, keeping the opposite edge/corner fixed. */
export function resizeFromDrag(
  item: Item,
  handle: ResizeHandle,
  delta: Point,
  snap: boolean,
): ItemTransform {
  const angle = (item.rotation * Math.PI) / 180,
    c = Math.cos(angle),
    s = Math.sin(angle),
    dx = c * delta[0] - s * delta[1],
    dz = s * delta[0] + c * delta[1]
  const dimension = (value: number) => Math.max(0.25, Math.min(1200, snapped(value, snap)))
  const width = handle.x ? dimension(item.width + handle.x * dx) : item.width,
    depth = handle.z ? dimension(item.depth + handle.z * dz) : item.depth,
    shiftX = (handle.x * (width - item.width)) / 2,
    shiftZ = (handle.z * (depth - item.depth)) / 2
  return {
    x: round(item.x + c * shiftX + s * shiftZ, 4),
    z: round(item.z - s * shiftX + c * shiftZ, 4),
    width,
    depth,
  }
}

export function transformItem(plan: Plan, id: string, patch: ItemTransform): Plan {
  return {
    ...plan,
    items: plan.items.map((item) => {
      if (item.id !== id || item.locked) return item
      const room =
        plan.rooms.find((r) => r.id === item.roomId && roomContains(r, patch.x, patch.z)) ??
        plan.rooms.find((r) => roomContains(r, patch.x, patch.z))
      return { ...item, ...patch, roomId: room?.id ?? item.roomId }
    }),
  }
}
