import { useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { m, roomOutline, roomType, roomContains, planBounds, type Plan, type Room } from './model'
import { DEFAULT_WALL_COLOR, finishedWallBlocks, roomFinishes } from './finishes'

function surfaceTexture(kind: 'stone' | 'bath' | 'kitchen' | 'plaster', baseColor?: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')!
  let seed = 57
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  ctx.fillStyle =
    baseColor ??
    (kind === 'bath'
      ? '#a5bcc3'
      : kind === 'kitchen'
        ? '#d7d6ce'
        : kind === 'plaster'
          ? '#e4dfd4'
          : '#eeeae2')
  ctx.fillRect(0, 0, 512, 512)
  if (kind === 'bath' || kind === 'kitchen') {
    const colors = baseColor
      ? [1, 0.97, 1.015, 0.985].map(
          (shade) => `#${new THREE.Color(baseColor).multiplyScalar(shade).getHexString()}`,
        )
      : kind === 'bath'
        ? ['#aec3c9', '#b7cbd0', '#a7bfc6', '#b2c7cc']
        : ['#e0dfd7', '#deded6', '#e5e3dc', '#dcdcd4']
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        ctx.fillStyle = colors[y * 2 + x]
        ctx.fillRect(x * 256 + 2, y * 256 + 2, 252, 252)
        ctx.strokeStyle = '#ffffff35'
        ctx.lineWidth = 1
        ctx.strokeRect(x * 256 + 3, y * 256 + 3, 250, 250)
      }
  }
  for (let i = 0; i < (kind === 'stone' ? 19000 : 25000); i++) {
    const alpha = kind === 'plaster' ? 0.045 : kind === 'stone' ? 0.12 : 0.05
    ctx.fillStyle =
      i % 3 ? `rgba(78,83,78,${alpha * random()})` : `rgba(255,255,255,${alpha * 2 * random()})`
    const size = kind === 'stone' ? 0.7 + random() * 2 : 0.5 + random()
    ctx.fillRect(random() * 512, random() * 512, size, size)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  return texture
}

export function RoomFloor({ room, floorColor }: { room: Room; floorColor?: string }) {
  const kind =
    roomType(room) === 'bathroom' ? 'bath' : roomType(room) === 'kitchen' ? 'kitchen' : 'stone'
  const texture = useMemo(() => {
    const t = surfaceTexture(kind, floorColor),
      repeatSize = kind === 'bath' ? 24 : 48
    t.repeat.set(
      room.outline ? 1 / m(repeatSize) : room.width / repeatSize,
      room.outline ? 1 / m(repeatSize) : room.depth / repeatSize,
    )
    return t
  }, [kind, floorColor, room.width, room.depth, room.outline])
  useEffect(() => () => texture.dispose(), [texture])
  const shape = useMemo(() => {
    const points = roomOutline(room).map(
      ([x, z]) => new THREE.Vector2(m(x - room.x), -m(z - room.z)),
    )
    return new THREE.Shape(points)
  }, [room])
  if (room.outline)
    return (
      <group position={[m(room.x), 0, m(room.z)]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.195, 0]} receiveShadow castShadow>
          <extrudeGeometry args={[shape, { depth: 0.19, bevelEnabled: false }]} />
          <meshStandardMaterial color="#b5b1a6" roughness={0.85} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial map={texture} roughness={0.48} />
        </mesh>
      </group>
    )
  return (
    <group position={[m(room.x + room.width / 2), 0, m(room.z + room.depth / 2)]}>
      <mesh position={[0, -0.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[m(room.width + 6), 0.19, m(room.depth + 6)]} />
        <meshStandardMaterial color="#b5b1a6" roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[m(room.width), m(room.depth)]} />
        <meshStandardMaterial
          map={texture}
          bumpMap={texture}
          bumpScale={kind === 'stone' ? 0.001 : 0.002}
          roughness={kind === 'stone' ? 0.48 : 0.32}
        />
      </mesh>
    </group>
  )
}

export function useWallHeights(plan: Plan, mode: 'cut' | 'full' | 'none', walk: boolean) {
  const { camera } = useThree()
  const [quadrant, setQuadrant] = useState([1, 1])
  useFrame(() => {
    if (walk || mode !== 'cut') return
    const bounds = planBounds(plan)
    const x = camera.position.x >= m((bounds.minX + bounds.maxX) / 2) ? 1 : -1,
      z = camera.position.z >= m((bounds.minZ + bounds.maxZ) / 2) ? 1 : -1
    if (x !== quadrant[0] || z !== quadrant[1]) setQuadrant([x, z])
  })
  return new Map(
    plan.walls.map((w) => {
      const dx = w.to[0] - w.from[0],
        dz = w.to[1] - w.from[1],
        len = Math.hypot(dx, dz)
      const x = (w.from[0] + w.to[0]) / 2,
        z = (w.from[1] + w.to[1]) / 2,
        offset = w.thickness / 2 + 0.1
      const positive = plan.rooms.some((r) =>
        roomContains(r, x - (dz / len) * offset, z + (dx / len) * offset),
      )
      const negative = plan.rooms.some((r) =>
        roomContains(r, x + (dz / len) * offset, z - (dx / len) * offset),
      )
      const facing = (-dz * quadrant[0] + dx * quadrant[1]) / len
      const back = positive !== negative && (positive ? facing > 0 : facing < 0)
      return [w.id, walk || mode === 'full' || back ? plan.ceiling : 36]
    }),
  )
}

export function WallStructure({ plan, heights }: { plan: Plan; heights: Map<string, number> }) {
  const texture = useMemo(() => surfaceTexture('plaster', '#ffffff'), [])
  useEffect(() => () => texture.dispose(), [texture])
  const materials = useMemo(() => {
    const colors = new Set([
      DEFAULT_WALL_COLOR,
      ...plan.rooms.map((room) => roomFinishes(plan, room).wall),
    ])
    const paints = new Map(
      [...colors].map((color) => [
        color,
        new THREE.MeshStandardMaterial({ map: texture, color, roughness: 0.92 }),
      ]),
    )
    const section = new THREE.MeshStandardMaterial({ color: '#978773', roughness: 0.82 })
    return { paints, section }
  }, [texture, plan.rooms, plan.finishes])
  useEffect(
    () => () => {
      materials.paints.forEach((material) => material.dispose())
      materials.section.dispose()
    },
    [materials],
  )
  return (
    <>
      {plan.walls.flatMap((w) => {
        const heightLimit = heights.get(w.id) || plan.ceiling
        return finishedWallBlocks(plan, w).map((b, i) => {
          const height = Math.min(b.height, heightLimit - b.elevation)
          if (height <= 0) return null
          return (
            <group
              key={`${w.id}-${i}`}
              position={[m(b.x), m(b.elevation), m(b.z)]}
              rotation={[0, (b.rotation * Math.PI) / 180, 0]}
            >
              <mesh
                position={[0, m(height) / 2, 0]}
                material={[
                  materials.paints.get(DEFAULT_WALL_COLOR)!,
                  materials.paints.get(DEFAULT_WALL_COLOR)!,
                  materials.section,
                  materials.paints.get(DEFAULT_WALL_COLOR)!,
                  materials.paints.get(b.positiveColor)!,
                  materials.paints.get(b.negativeColor)!,
                ]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[m(b.width), m(height), m(b.depth)]} />
              </mesh>
              {b.elevation === 0 &&
                [-1, 1].map((side) => (
                  <mesh
                    key={side}
                    position={[0, m(1.75), side * (m(b.depth) / 2 + 0.003)]}
                    castShadow
                    receiveShadow
                  >
                    <boxGeometry args={[m(b.width), m(3.5), 0.012]} />
                    <meshStandardMaterial color="#c8c1b3" roughness={0.7} />
                  </mesh>
                ))}
            </group>
          )
        })
      })}
    </>
  )
}

export function RoomCeiling({
  room,
  height,
  color,
}: {
  room: Room
  height: number
  color: string
}) {
  const shape = useMemo(
    () => new THREE.Shape(roomOutline(room).map(([x, z]) => new THREE.Vector2(m(x), m(z)))),
    [room],
  )
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, m(height), 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.95} />
    </mesh>
  )
}
