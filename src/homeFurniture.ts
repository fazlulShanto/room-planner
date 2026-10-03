import { sectionalDimensions, type Item } from './model.ts'

type Vec3 = [number, number, number]
export type FurniturePart = {
  size: Vec3
  position: Vec3
  color: string
  roughness: number
  metalness: number
  rounded: boolean
  opacity?: number
}

// Parts use the full item's inch dimensions, including feet, handles, and mirror.
// Normalized proportions keep the visible model inside its measured footprint when resized.
export function homeFurnitureParts(item: Item): FurniturePart[] | null {
  if (
    ![
      'almirah',
      'dressing',
      'wardrobe',
      'rack',
      'sofa-one',
      'sofa-two',
      'sofa-corner',
      'tea-table',
      'chair',
      'cabinet',
    ].includes(item.kind)
  )
    return null
  const parts: FurniturePart[] = []
  const box = (
    size: Vec3,
    position: Vec3,
    color = item.color,
    roughness = 0.65,
    metalness = 0,
    rounded = false,
    opacity = 1,
  ) => {
    parts.push({
      size: [size[0] * item.width, size[1] * item.height, size[2] * item.depth],
      position: [position[0] * item.width, position[1] * item.height, position[2] * item.depth],
      color,
      roughness,
      metalness,
      rounded,
      opacity,
    })
  }
  const feet = (color: string) => {
    for (const x of [-0.42, 0.42])
      for (const z of [-0.39, 0.39]) box([0.09, 0.08, 0.14], [x, 0.04, z], color)
  }
  if (item.kind === 'cabinet') {
    // A shallow framed glass cabinet; all trim and handles stay within the entered size.
    box([0.96, 0.96, 0.04], [0, 0.5, -0.48], item.color, 0.7)
    for (const side of [-1, 1])
      box([0.025, 0.95, 0.92], [side * 0.4675, 0.5, -0.02], item.color, 0.55)
    for (const y of [0.012, 0.988]) box([1, 0.024, 0.97], [0, y, -0.015], item.color, 0.45)
    for (const y of [0.041, 0.959]) box([0.975, 0.022, 0.945], [0, y, -0.0225], item.color, 0.52)
    for (const y of [0.35, 0.65]) box([0.935, 0.018, 0.81], [0, y, -0.035], item.color, 0.58)
    const count = Math.max(1, Math.min(6, Math.round(item.width / 22)))
    const bay = 0.94 / count,
      door = bay - 0.008
    const stile = Math.min(0.85 / item.width, door * 0.11),
      rail = Math.min(1.4 / item.height, 0.1)
    for (let n = 0; n < count; n++) {
      const x = -0.47 + bay * (n + 0.5)
      for (const side of [-1, 1]) {
        box([stile, 0.9, 0.045], [x + (side * (door - stile)) / 2, 0.5, 0.435], item.color, 0.45)
        box(
          [door - 2 * stile, rail, 0.045],
          [x, 0.5 + side * (0.45 - rail / 2), 0.435],
          item.color,
          0.45,
        )
      }
      box(
        [door - 2 * stile, 0.9 - 2 * rail, 0.012],
        [x, 0.5, 0.427],
        '#9eafb0',
        0.14,
        0.15,
        false,
        0.24,
      )
      const handleX = x + (n % 2 === 0 ? 1 : -1) * (door / 2 - stile / 2)
      box(
        [Math.min(0.4 / item.width, stile * 0.55), 0.15, 0.04],
        [handleX, 0.42, 0.48],
        '#78694f',
        0.28,
        0.65,
        true,
      )
    }
  } else if (item.kind === 'chair') {
    // Reference: 41 × 45 × 100 cm, with a 45 cm seat and 37 cm back.
    // The seat and back proportions follow the edited overall dimensions.
    const backWidth = 37 / 41
    box([1, 0.03, 1], [0, 0.435, 0], item.color, 0.48, 0, true)
    for (const side of [-1, 1]) {
      box([0.075, 0.42, 0.1], [side * 0.405, 0.21, 0.415], item.color, 0.58)
      box([0.075, 1, 0.12], [side * (backWidth / 2 - 0.0375), 0.5, -0.44], item.color, 0.52)
      box([0.055, 0.07, 0.83], [side * 0.405, 0.385, 0], item.color, 0.6)
      box([0.045, 0.035, 0.83], [side * 0.405, 0.19, 0], item.color, 0.6)
    }
    box([0.81, 0.07, 0.055], [0, 0.385, 0.415], item.color, 0.6)
    box([0.81, 0.04, 0.05], [0, 0.17, 0.415], item.color, 0.6)
    box([backWidth, 0.055, 0.12], [0, 0.9525, -0.44], item.color, 0.48)
    box([backWidth - 0.15, 0.035, 0.09], [0, 0.52, -0.44], item.color, 0.55)
    for (let n = 0; n < 6; n++) {
      box([0.042, 0.388, 0.048], [(n - 2.5) * 0.123, 0.7315, -0.44], item.color, 0.55)
    }
  } else if (item.kind === 'tea-table') {
    box([1, 0.1, 1], [0, 0.95, 0], item.color, 0.42, 0, true)
    box([0.85, 0.055, 0.8], [0, 0.24, 0], item.color, 0.6)
    for (const x of [-0.41, 0.41])
      for (const z of [-0.37, 0.37]) box([0.065, 0.9, 0.09], [x, 0.45, z], '#71583f')
  } else if (item.kind.startsWith('sofa-')) {
    const corner = item.kind === 'sofa-corner'
    const shape = sectionalDimensions(item)
    const b = corner ? shape.bodyDepth / item.depth : 1
    const r = shape.returnWidth / item.width
    const side = shape.side === 'left' ? -1 : 1
    const arm = corner ? Math.min(0.08, r * 0.3) : 0.09
    const center = -0.5 + b / 2
    box([1, 0.22, b], [0, 0.22, center], item.color, 0.95, 0, true)
    box([1, 0.67, b * 0.14], [0, 0.665, -0.5 + b * 0.07], item.color, 0.95, 0, true)
    for (const x of [-1, 1]) {
      const deep = corner && x === side ? 1 : b
      box(
        [arm, 0.49, deep],
        [x * (0.5 - arm / 2), 0.405, -0.5 + deep / 2],
        item.color,
        0.9,
        0,
        true,
      )
      for (const z of [-0.5 + b * 0.13, -0.5 + b * 0.85])
        box([arm * 0.65, 0.11, b * 0.09], [x * (0.5 - arm), 0.055, z], '#625344')
    }
    const count = item.kind === 'sofa-one' ? 1 : item.kind === 'sofa-two' ? 2 : 3
    const cushion = (1 - 2 * arm) / count
    for (let i = 0; i < count; i++) {
      const x = -0.5 + arm + cushion * (i + 0.5)
      box([cushion * 0.96, 0.18, b * 0.7], [x, 0.41, -0.5 + b * 0.58], item.color, 1, 0, true)
      box([cushion * 0.94, 0.42, b * 0.16], [x, 0.735, -0.5 + b * 0.21], item.color, 1, 0, true)
    }
    if (corner) {
      const x = side * (0.5 - r / 2)
      box([r, 0.22, 1 - b], [x, 0.22, b / 2], item.color, 0.95, 0, true)
      box(
        [r - arm * 1.4, 0.18, (1 - b) * 0.96],
        [x - side * arm * 0.3, 0.41, b / 2],
        item.color,
        1,
        0,
        true,
      )
      for (const offset of [-1, 1])
        box(
          [arm * 0.65, 0.11, (1 - b) * 0.1],
          [x + offset * (r / 2 - arm), 0.055, 0.5 - (1 - b) * 0.12],
          '#625344',
        )
    }
  } else if (item.kind === 'almirah') {
    feet('#4c5b5c')
    box([1, 0.92, 0.94], [0, 0.54, -0.03], '#526767', 0.38, 0.45)
    for (const side of [-1, 1]) {
      box([0.47, 0.86, 0.045], [side * 0.245, 0.54, 0.4575], item.color, 0.34, 0.4, true)
      // Pressed door panels and ventilation slots distinguish the steel cupboard.
      box([0.36, 0.65, 0.014], [side * 0.245, 0.55, 0.487], item.color, 0.42, 0.3)
      for (const y of [0.83, 0.85, 0.87])
        box([0.2, 0.005, 0.004], [side * 0.245, y, 0.497], '#4c6263')
      box([0.022, 0.13, 0.02], [side * 0.055, 0.51, 0.49], '#d1d7d1', 0.22, 0.75, true)
    }
    box([0.028, 0.022, 0.014], [0.09, 0.41, 0.49], '#3a4548', 0.3, 0.6)
  } else if (item.kind === 'wardrobe') {
    box([0.94, 0.07, 0.92], [0, 0.035, -0.02], '#66513e')
    box([1, 0.91, 0.93], [0, 0.525, -0.035], '#735a43')
    box([1, 0.03, 1], [0, 0.985, 0], item.color, 0.55)
    for (const x of [-0.326, 0, 0.326]) {
      box([0.312, 0.86, 0.045], [x, 0.525, 0.4425], item.color, 0.55, 0, true)
      box([0.265, 0.66, 0.018], [x, 0.55, 0.474], item.color, 0.65)
      box([0.02, 0.115, 0.025], [x + 0.095, 0.49, 0.4875], '#ceba92', 0.25, 0.65, true)
    }
  } else if (item.kind === 'dressing') {
    feet('#705039')
    box([0.96, 0.34, 0.91], [0, 0.25, 0], '#806043')
    box([1, 0.035, 1], [0, 0.4375, 0], item.color, 0.4, 0, true)
    box([0.29, 0.3, 0.035], [-0.32, 0.25, 0.4625], item.color, 0.55, 0, true)
    box([0.022, 0.075, 0.022], [-0.23, 0.27, 0.488], '#d6bf96', 0.2, 0.65)
    for (const y of [0.15, 0.25, 0.35]) {
      box([0.6, 0.09, 0.035], [0.15, y, 0.4625], item.color, 0.55, 0, true)
      box([0.13, 0.014, 0.022], [0.15, y, 0.488], '#d6bf96', 0.2, 0.65, true)
    }
    // The entered height includes the mirror; a cool inset suggests glass without a costly live reflection.
    box([0.8, 0.54, 0.085], [0, 0.73, -0.4575], item.color, 0.45, 0, true)
    box([0.7, 0.46, 0.014], [0, 0.73, -0.408], '#b7cdd0', 0.15, 0.32)
    box([0.008, 0.43, 0.003], [-0.33, 0.73, -0.3995], '#f2f5ed', 0.2)
    box([0.65, 0.007, 0.003], [0, 0.942, -0.3995], '#e2ece9', 0.2)
  } else {
    // Three molded trays, open slats, and four slim posts form the plastic utility rack.
    for (const x of [-0.45, 0.45])
      for (const z of [-0.43, 0.43]) {
        box([0.085, 1, 0.13], [x, 0.5, z], item.color, 0.37, 0, true)
      }
    for (const y of [0.07, 0.49, 0.91]) {
      for (const z of [-0.465, 0.465])
        box([1, 0.07, 0.07], [0, y + 0.01, z], item.color, 0.37, 0, true)
      for (const x of [-0.475, 0.475])
        box([0.05, 0.08, 0.88], [x, y + 0.01, 0], item.color, 0.37, 0, true)
      for (let n = 0; n < 8; n++)
        box([0.1, 0.024, 0.87], [-0.385 + n * 0.11, y - 0.015, 0], item.color, 0.42, 0, true)
    }
  }
  return parts
}
