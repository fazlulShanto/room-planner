import type { Item } from './model.ts'
import type { FurniturePart } from './homeFurniture.ts'

// Each part uses a fraction of the item's full width, height, and depth.
// This keeps details inside the measured envelope even with unusual custom sizes.
export function additionalFurnitureParts(item: Item): FurniturePart[] | null {
  const parts: FurniturePart[] = []
  type Vec3 = [number, number, number]
  const part = (
    size: Vec3,
    position: Vec3,
    color = item.color,
    shape: FurniturePart['shape'] = 'box',
    opacity = 1,
  ) => {
    parts.push({
      size: [size[0] * item.width, size[1] * item.height, size[2] * item.depth],
      position: [position[0] * item.width, position[1] * item.height, position[2] * item.depth],
      color,
      shape,
      opacity,
      roughness: opacity < 1 ? 0.15 : 0.65,
      metalness: color === metal ? 0.65 : 0,
      rounded: shape === 'box',
    })
  }
  const wood = '#79604a',
    metal = '#768587',
    dark = '#39484b',
    white = '#eeeee5'
  const legs = (height: number, top = height, x = 0.41, z = 0.4) => {
    for (const sideX of [-x, x])
      for (const sideZ of [-z, z])
        part([0.065, height, 0.065], [sideX, top - height / 2, sideZ], wood)
  }
  const handle = (x: number, y: number, width = 0.18) =>
    part([width, 0.025, 0.035], [x, y, 0.4825], metal)
  const doors = (bottom = 0.1, top = 0.88, count = 2) => {
    for (let n = 0; n < count; n++) {
      const x = -0.47 + (0.94 / count) * (n + 0.5)
      part([0.94 / count - 0.012, top - bottom, 0.04], [x, (top + bottom) / 2, 0.445])
      handle(x, top - 0.09, Math.min(0.18, 0.65 / count))
    }
  }
  const cabinet = (top = 0.92) => {
    part([0.9, 0.08, 0.86], [0, 0.04, 0], wood)
    part([0.98, top - 0.08, 0.92], [0, (top + 0.08) / 2, -0.04])
    part([1, 0.04, 1], [0, top + 0.02, 0], white)
  }
  const tap = (y: number, z = -0.3) => {
    part([0.035, 1 - y, 0.035], [0, (1 + y) / 2, z], metal)
    part([0.04, 0.025, 0.23], [0, 0.9875, z + 0.1], metal)
    part([0.04, 0.07, 0.035], [0, 0.965, z + 0.2], metal)
  }
  const basin = (y: number, width: number, depth: number, x = 0) => {
    part([width, 0.025, depth], [x, y, 0.02], metal)
    part([width * 0.88, 0.026, depth * 0.83], [x, y + 0.005, 0.02], dark)
    part([width * 0.7, 0.027, depth * 0.65], [x, y + 0.008, 0.02], '#b3c5c6')
    part([0.045, 0.03, 0.045], [x, y + 0.01, 0.06], metal, 'cylinder')
  }

  switch (item.kind) {
    case 'nightstand':
    case 'dresser': {
      legs(0.12)
      part([1, 0.88, 0.94], [0, 0.56, -0.03])
      const rows = item.kind === 'nightstand' ? 2 : 3
      const columns = item.kind === 'nightstand' ? 1 : 2
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
          const x = -0.48 + (0.96 / columns) * (col + 0.5)
          const y = 0.15 + (0.8 / rows) * (row + 0.5)
          part([0.96 / columns - 0.025, 0.8 / rows - 0.025, 0.045], [x, y, 0.4525])
          handle(x, y)
        }
      break
    }
    case 'bookcase':
    case 'shoe-rack': {
      const shelves = item.kind === 'bookcase' ? 5 : 3
      for (const x of [-0.475, 0.475]) part([0.05, 1, 1], [x, 0.5, 0])
      if (item.kind === 'bookcase') part([0.9, 1, 0.035], [0, 0.5, -0.4825])
      for (let n = 0; n < shelves; n++)
        part([0.9, 0.028, 0.96], [0, 0.05 + n * (0.91 / (shelves - 1)), 0])
      break
    }
    case 'pantry':
      cabinet(0.96)
      doors(0.1, 0.52)
      doors(0.54, 0.94)
      break
    case 'tv-unit':
      legs(0.15)
      for (const y of [0.18, 0.97]) part([1, 0.06, 0.96], [0, y, -0.02])
      part([1, 0.76, 0.04], [0, 0.57, -0.48])
      for (const x of [-0.48, -0.17, 0.17, 0.48]) part([0.035, 0.76, 0.92], [x, 0.57, 0])
      for (const x of [-0.33, 0.33]) {
        part([0.29, 0.71, 0.04], [x, 0.56, 0.445])
        handle(x, 0.75, 0.12)
      }
      part([0.3, 0.035, 0.88], [0, 0.57, 0])
      break
    case 'side-table':
    case 'console-table':
    case 'work-desk':
      legs(0.94)
      part([1, 0.06, 1], [0, 0.97, 0])
      if (item.kind === 'console-table') part([0.94, 0.035, 0.87], [0, 0.22, 0])
      if (item.kind === 'work-desk') {
        part([0.29, 0.78, 0.85], [0.3, 0.52, 0])
        for (const y of [0.28, 0.53, 0.78]) {
          part([0.27, 0.225, 0.035], [0.3, y, 0.4475])
          handle(0.3, y, 0.12)
        }
      }
      break
    case 'ottoman':
    case 'bench':
      legs(item.kind === 'bench' ? 0.7 : 0.2)
      part(
        [0.97, item.kind === 'bench' ? 0.17 : 0.55, 0.94],
        [0, item.kind === 'bench' ? 0.735 : 0.465, 0],
      )
      part([1, 0.2, 1], [0, 0.9, 0])
      break
    case 'office-chair':
      part([0.12, 0.38, 0.12], [0, 0.24, 0], metal, 'cylinder')
      part([0.94, 0.045, 0.1], [0, 0.065, 0], dark)
      part([0.1, 0.045, 0.94], [0, 0.065, 0], dark)
      for (const [x, z] of [
        [-0.43, 0],
        [0.43, 0],
        [0, -0.43],
        [0, 0.43],
      ])
        part([0.13, 0.08, 0.13], [x, 0.04, z], dark, 'ellipsoid')
      part([0.82, 0.12, 0.8], [0, 0.46, 0.04])
      part([0.76, 0.48, 0.12], [0, 0.76, -0.38])
      for (const x of [-0.46, 0.46]) {
        part([0.04, 0.21, 0.04], [x, 0.565, 0.05], metal)
        part([0.08, 0.045, 0.52], [x, 0.685, 0.05], dark)
      }
      break
    case 'bar-stool':
      legs(0.91)
      part([1, 0.09, 1], [0, 0.955, 0], item.color, 'cylinder')
      for (const x of [-0.41, 0.41]) part([0.035, 0.035, 0.84], [x, 0.32, 0], metal)
      for (const z of [-0.4, 0.4]) part([0.84, 0.035, 0.035], [0, 0.32, z], metal)
      break
    case 'crib':
      legs(1, 1, 0.46, 0.46)
      part([0.88, 0.06, 0.88], [0, 0.28, 0], wood)
      part([0.88, 0.1, 0.88], [0, 0.36, 0], white)
      for (const x of [-0.46, 0.46]) {
        for (const y of [0.43, 0.96]) part([0.06, 0.05, 1], [x, y, 0])
        for (let n = 0; n < 11; n++) part([0.03, 0.5, 0.024], [x, 0.69, -0.4 + n * 0.08])
      }
      for (const z of [-0.47, 0.47]) part([0.94, 0.63, 0.06], [0, 0.665, z])
      break
    case 'bunk-bed':
      legs(1, 1, 0.45, 0.46)
      for (const y of [0.19, 0.69]) {
        part([0.96, 0.055, 0.96], [0, y, 0])
        part([0.88, 0.075, 0.87], [0, y + 0.065, 0], white)
        part([0.88, 0.012, 0.53], [0, y + 0.109, 0.14], '#8ca6a3')
        part([0.64, 0.045, 0.17], [0, y + 0.12, -0.3], white)
      }
      for (const x of [-0.45, 0.45])
        for (const y of [0.84, 0.97]) part([0.05, 0.035, 0.96], [x, y, 0])
      for (const x of [0.02, 0.33]) part([0.04, 0.72, 0.04], [x, 0.36, 0.48])
      for (const y of [0.12, 0.27, 0.42, 0.57, 0.7]) part([0.35, 0.025, 0.04], [0.175, y, 0.48])
      break
    case 'kitchen-base':
    case 'kitchen-island':
      cabinet(0.96)
      doors(0.1, 0.92, item.kind === 'kitchen-island' ? 3 : 2)
      break
    case 'kitchen-sink':
    case 'bathroom-vanity':
      cabinet(0.8)
      doors(0.1, 0.77)
      basin(
        0.845,
        item.kind === 'kitchen-sink' ? 0.52 : 0.78,
        0.64,
        item.kind === 'kitchen-sink' ? -0.14 : 0,
      )
      if (item.kind === 'kitchen-sink')
        for (const x of [0.19, 0.25, 0.31, 0.37, 0.43])
          part([0.008, 0.015, 0.56], [x, 0.846, 0.02], metal)
      tap(0.85, -0.36)
      break
    case 'stove':
      part([0.98, 0.96, 0.96], [0, 0.48, -0.02])
      part([1, 0.04, 1], [0, 0.98, 0], dark)
      for (const x of [-0.25, 0.25])
        for (const z of [-0.23, 0.23]) {
          part([0.32, 0.014, 0.32], [x, 0.993, z], metal, 'cylinder')
          part([0.23, 0.016, 0.23], [x, 0.992, z], dark, 'cylinder')
        }
      part([0.82, 0.55, 0.03], [0, 0.4, 0.465], dark)
      part([0.65, 0.38, 0.012], [0, 0.4, 0.486], '#657d82')
      handle(0, 0.72, 0.75)
      for (const x of [-0.3, -0.1, 0.1, 0.3])
        part([0.09, 0.06, 0.025], [x, 0.855, 0.48], dark, 'ellipsoid')
      break
    case 'dishwasher':
      cabinet(0.96)
      part([0.94, 0.72, 0.035], [0, 0.46, 0.4575])
      part([0.94, 0.12, 0.035], [0, 0.88, 0.4575], dark)
      handle(0, 0.76, 0.65)
      part([0.22, 0.045, 0.015], [0.2, 0.88, 0.483], '#a5bbb7')
      break
    case 'microwave':
      part([1, 1, 0.93], [0, 0.5, -0.035])
      part([0.76, 0.8, 0.035], [-0.08, 0.5, 0.4475], dark)
      part([0.6, 0.61, 0.02], [-0.1, 0.5, 0.48], '#64787a')
      part([0.035, 0.65, 0.035], [0.25, 0.5, 0.4825], metal)
      part([0.14, 0.17, 0.02], [0.39, 0.76, 0.47], dark)
      for (const y of [0.25, 0.42, 0.55]) part([0.085, 0.07, 0.025], [0.39, y, 0.48], dark)
      break
    case 'toilet':
      part([0.59, 0.38, 0.58], [0, 0.19, 0.12], item.color, 'ellipsoid')
      part([0.94, 0.27, 0.74], [0, 0.45, 0.12], item.color, 'ellipsoid')
      part([0.76, 0.035, 0.58], [0, 0.581, 0.15], '#c0cfcc', 'cylinder')
      part([0.56, 0.036, 0.42], [0, 0.585, 0.15], '#718b8e', 'cylinder')
      part([0.86, 0.66, 0.28], [0, 0.64, -0.36])
      part([0.9, 0.035, 0.32], [0, 0.9825, -0.34])
      part([0.11, 0.015, 0.1], [0.2, 0.9925, -0.34], metal, 'cylinder')
      break
    case 'squat-toilet':
      // A low pan with an inset well and treaded footrests; no seat or cistern.
      part([1, 0.2, 1], [0, 0.1, 0])
      part([0.48, 0.025, 0.78], [0, 0.2125, 0], '#a6bbbc', 'cylinder')
      part([0.36, 0.025, 0.65], [0, 0.2375, 0.02], '#647f83', 'cylinder')
      part([0.2, 0.025, 0.24], [0, 0.2625, 0.19], dark, 'cylinder')
      for (const x of [-0.345, 0.345]) {
        part([0.25, 0.64, 0.7], [x, 0.52, 0])
        for (let n = 0; n < 7; n++) part([0.21, 0.16, 0.025], [x, 0.92, -0.27 + n * 0.09])
      }
      break
    case 'bathtub':
      part([0.88, 0.18, 0.9], [0, 0.09, 0])
      part([1, 0.84, 1], [0, 0.58, 0])
      part([0.84, 0.035, 0.85], [0, 0.967, 0], '#a6bbbc')
      part([0.73, 0.038, 0.75], [0, 0.968, 0], '#d7e1de')
      part([0.09, 0.014, 0.055], [0, 0.993, -0.27], metal, 'cylinder')
      break
    case 'shower':
      part([1, 0.045, 1], [0, 0.0225, 0], white)
      part([0.86, 0.008, 0.86], [0, 0.049, 0], '#c8d6d2')
      part([0.12, 0.005, 0.12], [0, 0.055, 0], metal, 'cylinder')
      for (const x of [-0.48, 0.48]) {
        for (const z of [-0.48, 0.48]) part([0.025, 0.955, 0.025], [x, 0.5225, z], metal)
        part([0.012, 0.93, 0.94], [x, 0.515, 0], item.color, 'box', 0.2)
      }
      part([0.94, 0.93, 0.012], [0, 0.515, -0.48], item.color, 'box', 0.25)
      part([0.025, 0.74, 0.025], [0, 0.52, -0.42], metal)
      part([0.025, 0.02, 0.3], [0, 0.9, -0.28], metal)
      part([0.28, 0.02, 0.25], [0, 0.885, -0.12], metal)
      break
    case 'floor-lamp':
    case 'table-lamp':
      part([0.65, 0.045, 0.65], [0, 0.0225, 0], metal, 'cylinder')
      part([0.075, 0.77, 0.075], [0, 0.43, 0], metal, 'cylinder')
      part([1, 0.22, 1], [0, 0.875, 0], item.color, 'cylinder')
      part([0.93, 0.018, 0.93], [0, 0.991, 0], white, 'cylinder')
      break
    case 'plant':
      part([0.6, 0.27, 0.6], [0, 0.135, 0], item.color, 'cylinder')
      part([0.63, 0.04, 0.63], [0, 0.25, 0], item.color, 'cylinder')
      part([0.53, 0.02, 0.53], [0, 0.267, 0], '#53483b', 'cylinder')
      part([0.045, 0.66, 0.045], [0, 0.6, 0], wood, 'cylinder')
      for (const [x, y, z, size] of [
        [-0.22, 0.48, 0.1, 0.48],
        [0.24, 0.55, -0.12, 0.48],
        [-0.16, 0.68, -0.24, 0.44],
        [0.13, 0.77, 0.21, 0.5],
        [0, 0.88, 0, 0.42],
      ])
        part([size, 0.24, size], [x, y, z], y > 0.7 ? '#7c9c65' : '#527b52', 'ellipsoid')
      break
    case 'rug':
      part([1, 0.8, 1], [0, 0.4, 0])
      part([0.9, 0.1, 0.93], [0, 0.85, 0], '#dfd4be')
      part([0.85, 0.1, 0.89], [0, 0.95, 0])
      break
    case 'mirror':
      part([1, 1, 0.8], [0, 0.5, -0.1])
      part([0.88, 0.92, 0.12], [0, 0.5, 0.36], '#b8d2d6')
      part([0.015, 0.84, 0.02], [-0.4, 0.5, 0.43], '#f4f5ec')
      break
    case 'coat-rack':
      part([0.85, 0.04, 0.12], [0, 0.02, 0], wood)
      part([0.12, 0.04, 0.85], [0, 0.02, 0], wood)
      part([0.09, 0.96, 0.09], [0, 0.52, 0], item.color, 'cylinder')
      for (const y of [0.65, 0.85]) {
        part([0.9, 0.025, 0.055], [0, y, 0])
        part([0.055, 0.025, 0.9], [0, y, 0])
        for (const [x, z] of [
          [-0.43, 0],
          [0.43, 0],
          [0, -0.43],
          [0, 0.43],
        ])
          part([0.045, 0.07, 0.045], [x, y + 0.035, z])
      }
      break
    case 'laundry-basket':
      part([0.9, 0.04, 0.9], [0, 0.02, 0])
      for (const y of [0.14, 0.32, 0.5, 0.68, 0.86, 0.97]) {
        for (const x of [-0.46, 0.46]) part([0.06, 0.05, 0.98], [x, y, 0])
        for (const z of [-0.46, 0.46]) part([0.98, 0.05, 0.06], [0, y, z])
      }
      for (const x of [-0.44, 0.44])
        for (const z of [-0.44, 0.44]) part([0.055, 1, 0.055], [x, 0.5, z])
      break
    default:
      return null
  }
  return parts
}
