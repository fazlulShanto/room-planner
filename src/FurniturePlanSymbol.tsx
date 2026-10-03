import { additionalFurnitureParts } from './additionalFurniture'
import type { Item } from './model'

// Project the same parts used in 3D, with the highest surfaces drawn last.
export default function FurniturePlanSymbol({ item }: { item: Item }) {
  const parts = additionalFurnitureParts(item)
  if (!parts) return null
  return (
    <g pointerEvents="none">
      {parts
        .sort((a, b) => a.position[1] + a.size[1] / 2 - b.position[1] - b.size[1] / 2)
        .map((part, i) => {
          const [width, , depth] = part.size
          const [x, , z] = part.position
          const style = { fill: part.color, opacity: part.opacity ?? 1 }
          return part.shape === 'cylinder' || part.shape === 'ellipsoid' ? (
            <ellipse key={i} cx={x} cy={z} rx={width / 2} ry={depth / 2} {...style} />
          ) : (
            <rect
              key={i}
              x={x - width / 2}
              y={z - depth / 2}
              width={width}
              height={depth}
              rx={Math.min(width, depth) * 0.06}
              {...style}
            />
          )
        })}
    </g>
  )
}
