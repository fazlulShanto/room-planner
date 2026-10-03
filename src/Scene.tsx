import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import WalkControls, { type WalkControlsProps } from './WalkControls'
import SceneLighting from './SceneLighting'
import { createDollhouseCamera, fitDollhouseCamera } from './camera'
import { canColorRoom, roomFinishes } from './finishes'
import { RoomFloor, RoomCeiling, WallStructure, useWallHeights } from './Architecture'
import { homeFurnitureParts, type FurniturePart } from './homeFurniture'
import type { WalkInput } from './walk'
import { useSceneDrag } from './editor/useSceneDrag'
import { openingCenterFromDrag } from './editor/openingManipulation'
import {
  moveFromDrag,
  resizeFromDrag,
  RESIZE_HANDLES,
  type ItemTransform,
  type ResizeHandle,
} from './editor/itemManipulation'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import {
  m,
  doorLeaf,
  localItemOutline,
  wallAngle,
  wallPoint,
  type Item,
  type Opening,
  type Wall,
  type LightingSettings,
  type Plan,
  type Room,
} from './model'

export type SceneProps = {
  plan: Plan
  stackedFloors?: { id: string; plan: Plan; elevation: number }[]
  lighting: LightingSettings
  walk: boolean
  walkInput: WalkInput
  walkControls: Omit<WalkControlsProps, 'plan' | 'roomId' | 'fitKey' | 'input'>
  selected: string | null
  roomId: string
  tool: 'orbit' | 'move'
  wallMode: 'cut' | 'full' | 'none'
  grid: boolean
  snap: boolean
  fitKey: number
  onSelect: (id: string | null) => void
  onTransform: (id: string, patch: ItemTransform) => void
  onMoveOpening: (id: string, center: number) => void
  onDragStart: () => void
  onDragEnd: () => void
  issueIds: Set<string>
}
function Box({
  size,
  position = [0, 0, 0],
  color,
  roughness = 0.75,
  metalness = 0,
  rounded = false,
  opacity = 1,
}: {
  size: [number, number, number]
  position?: [number, number, number]
  color: string
  roughness?: number
  metalness?: number
  rounded?: boolean
  opacity?: number
}) {
  const geometry = useMemo(
    () =>
      rounded
        ? new RoundedBoxGeometry(...size, 3, Math.min(0.035, ...size.map((n) => n / 5)))
        : new THREE.BoxGeometry(...size),
    [rounded, ...size],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh position={position} geometry={geometry} castShadow={opacity === 1} receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  )
}
function Bed({ item }: { item: Item }) {
  const w = m(item.width),
    d = m(item.depth),
    h = m(item.height)
  return (
    <>
      <Box size={[w, h * 0.28, d]} position={[0, h * 0.2, 0]} color="#a08060" rounded />
      <Box
        size={[w * 0.95, h * 0.28, d * 0.96]}
        position={[0, h * 0.48, 0]}
        color="#f6f3e9"
        rounded
      />
      <Box
        size={[w * 0.97, h * 0.045, d * 0.55]}
        position={[0, h * 0.643, d * 0.18]}
        color={item.color}
        rounded
      />
      <Box
        size={[w * 0.97, h * 0.22, d * 0.026]}
        position={[0, h * 0.51, d * 0.462]}
        color={item.color}
      />
      <Box
        size={[w, h, Math.min(0.055, d * 0.03)]}
        position={[0, h / 2, -d / 2 + Math.min(0.055, d * 0.03) / 2]}
        color="#ad9376"
        rounded
      />
      {[-1, 1].map((side) => (
        <Box
          key={side}
          size={[w * 0.37, h * 0.1, d * 0.19]}
          position={[side * w * 0.225, h * 0.68, -d * 0.29]}
          color="#fdfbf4"
          rounded
        />
      ))}
    </>
  )
}
function FurniturePartMesh({ part }: { part: FurniturePart }) {
  const size = part.size.map(m) as [number, number, number]
  const position = part.position.map(m) as [number, number, number]
  if (!part.shape || part.shape === 'box') return <Box {...part} size={size} position={position} />
  return (
    <mesh position={position} scale={size} castShadow receiveShadow>
      {part.shape === 'cylinder' ? (
        <cylinderGeometry args={[0.5, 0.5, 1, 24]} />
      ) : (
        <sphereGeometry args={[0.5, 20, 12]} />
      )}
      <meshStandardMaterial
        color={part.color}
        roughness={part.roughness}
        metalness={part.metalness}
      />
    </mesh>
  )
}
function FurnitureShape({ item }: { item: Item }) {
  const w = m(item.width),
    d = m(item.depth),
    h = m(item.height)
  const homeParts = homeFurnitureParts(item)
  if (homeParts)
    return (
      <>
        {homeParts.map((part, i) => (
          <FurniturePartMesh key={i} part={part} />
        ))}
      </>
    )
  if (item.kind === 'bed') return <Bed item={item} />
  if (item.kind === 'desk' || item.kind === 'dining')
    return (
      <>
        <Box
          size={[w, Math.min(0.07, h * 0.12), d]}
          position={[0, h - Math.min(0.07, h * 0.12) / 2, 0]}
          color={item.color}
          rounded
        />
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <Box
              key={`${x}${z}`}
              size={[Math.min(0.045, w * 0.1), h * 0.94, Math.min(0.045, d * 0.1)]}
              position={[x * w * 0.41, h * 0.47, z * d * 0.36]}
              color="#66594c"
            />
          )),
        )}
        {item.kind === 'desk' && (
          <Box
            size={[w * 0.33, h * 0.14, d * 0.75]}
            position={[w * 0.26, h * 0.81, 0]}
            color={item.color}
            rounded
          />
        )}
      </>
    )
  if (item.kind === 'fridge')
    return (
      <>
        <Box
          size={[w, h, d]}
          position={[0, h / 2, 0]}
          color={item.color}
          rounded
          roughness={0.42}
        />
        <Box
          size={[w * 0.96, h * 0.007, 0.01]}
          position={[0, h * 0.72, d / 2 - 0.006]}
          color="#6e7b7a"
        />
        {[0.51, 0.84].map((y) => (
          <Box
            key={y}
            size={[w * 0.035, h * 0.14, d * 0.025]}
            position={[w * 0.35, h * y, d / 2 - d * 0.0125]}
            color="#5b6867"
            rounded
          />
        ))}
      </>
    )
  if (item.kind === 'washer')
    return (
      <>
        <Box size={[w, h, d]} position={[0, h / 2, 0]} color={item.color} rounded />
        <Box
          size={[w * 0.9, h * 0.13, 0.015]}
          position={[0, h * 0.87, d / 2 - 0.008]}
          color="#c4cecb"
        />
        <mesh position={[0, h * 0.44, d / 2 - 0.012]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[Math.min(w, h) * 0.31, Math.min(w, h) * 0.31, 0.025, 40]} />
          <meshStandardMaterial color="#333f40" roughness={0.3} />
        </mesh>
        <mesh position={[0, h * 0.44, d / 2 - Math.min(w, h) * 0.027]}>
          <torusGeometry args={[Math.min(w, h) * 0.32, Math.min(w, h) * 0.027, 8, 40]} />
          <meshStandardMaterial color="#b5c0bf" metalness={0.6} roughness={0.25} />
        </mesh>
      </>
    )
  return <Box size={[w, h, d]} position={[0, h / 2, 0]} color={item.color} rounded />
}
function ItemOutline({ item, color }: { item: Item; color: string }) {
  const geometry = useMemo(() => {
    const outline = localItemOutline(item),
      vertices: number[] = []
    const line = (a: number[], b: number[]) => vertices.push(...a, ...b)
    for (let i = 0; i < outline.length; i++) {
      const [x, z] = outline[i],
        [nx, nz] = outline[(i + 1) % outline.length]
      for (const y of [-0.012, m(item.height) + 0.012]) line([m(x), y, m(z)], [m(nx), y, m(nz)])
      line([m(x), -0.012, m(z)], [m(x), m(item.height) + 0.012, m(z)])
    }
    return new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    )
  }, [
    item.kind,
    item.width,
    item.depth,
    item.height,
    item.chaiseSide,
    item.chaiseWidthRatio,
    item.seatDepthRatio,
  ])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.85} />
    </lineSegments>
  )
}
function ResizeGrip({
  item,
  handle,
  onPointerDown,
}: {
  item: Item
  handle: ResizeHandle
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void
}) {
  const mesh = useRef<THREE.Mesh>(null)
  const { camera, viewport, size, gl } = useThree()
  const worldPosition = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    if (!mesh.current) return
    mesh.current.getWorldPosition(worldPosition)
    // Keep grips usable when zooming out or changing the canvas size.
    mesh.current.scale.setScalar(
      (viewport.getCurrentViewport(camera, worldPosition).height / size.height) * 12,
    )
  })
  return (
    <mesh
      ref={mesh}
      position={[
        m((handle.x * item.width) / 2),
        m(item.height) + 0.02,
        m((handle.z * item.depth) / 2),
      ]}
      renderOrder={10}
      onPointerDown={onPointerDown}
      onPointerOver={(e) => {
        e.stopPropagation()
        gl.domElement.style.cursor = 'crosshair'
      }}
    >
      <boxGeometry args={[1, 0.45, 1]} />
      <meshBasicMaterial color="#2e9470" depthTest={false} depthWrite={false} />
    </mesh>
  )
}
function Furniture({
  item,
  props,
  setDragging,
}: {
  item: Item
  props: SceneProps
  setDragging: (v: boolean) => void
}) {
  const { gl } = useThree()
  const gesture = useSceneDrag<{ item: Item; handle?: ResizeHandle }>({
    id: item.id,
    props,
    disabled: item.locked,
    setDragging,
    onMove: (original, delta) =>
      props.onTransform(
        original.item.id,
        original.handle
          ? resizeFromDrag(original.item, original.handle, delta, props.snap)
          : moveFromDrag(original.item, delta, props.snap),
      ),
  })
  return (
    <group
      position={[m(item.x), m(item.elevation), m(item.z)]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      onPointerDown={(e) => gesture.start(e, { item })}
      onPointerOver={(e) => {
        if (props.walk) return
        e.stopPropagation()
        if (!gesture.isDragging())
          gl.domElement.style.cursor = props.tool === 'move' && !item.locked ? 'grab' : 'pointer'
      }}
      onPointerOut={() => {
        if (!props.walk && !gesture.isDragging()) gl.domElement.style.cursor = 'auto'
      }}
    >
      <FurnitureShape item={item} />
      {(props.selected === item.id || props.issueIds.has(item.id)) && (
        <ItemOutline item={item} color={props.issueIds.has(item.id) ? '#b46142' : '#276e54'} />
      )}
      {props.selected === item.id &&
        props.tool === 'move' &&
        !item.locked &&
        !props.walk &&
        RESIZE_HANDLES.map((handle, index) => (
          <ResizeGrip
            key={index}
            item={item}
            handle={handle}
            onPointerDown={(e) => gesture.start(e, { item, handle })}
          />
        ))}
    </group>
  )
}
function FloorLabel({ room }: { room: Room }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 100
    const ctx = c.getContext('2d')!
    ctx.font = '500 34px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#6b685e'
    ctx.fillText(room.name, 256, 56)
    const texture = new THREE.CanvasTexture(c)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [room.name])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh
      position={[m(room.x + room.width / 2), 0.006, m(room.z + room.depth * 0.54)]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[Math.min(1.6, m(room.width * 0.85)), 0.28]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  )
}
function OpeningObject({
  opening,
  wall,
  props,
  setDragging,
  children,
}: {
  opening: Opening
  wall: Wall
  props: SceneProps
  setDragging: (dragging: boolean) => void
  children: ReactNode
}) {
  const { gl } = useThree()
  const [x, z] = wallPoint(wall, opening.center)
  const axis = useMemo(
    () => new THREE.Vector3(wall.to[0] - wall.from[0], 0, wall.to[1] - wall.from[1]).normalize(),
    [wall],
  )
  const gesture = useSceneDrag<Opening>({
    id: opening.id,
    props,
    setDragging,
    onMove: (original, delta) =>
      props.onMoveOpening(
        original.id,
        openingCenterFromDrag(props.plan, original, delta, props.snap),
      ),
  })
  return (
    <group
      userData={opening.kind === 'door' ? { walkDoorId: opening.id } : {}}
      position={[m(x), m(opening.sill), m(z)]}
      rotation={[0, (wallAngle(wall) * Math.PI) / 180, 0]}
      onPointerDown={(e) => gesture.start(e, opening, axis)}
      onPointerOver={(e) => {
        if (props.walk) return
        e.stopPropagation()
        if (!gesture.isDragging())
          gl.domElement.style.cursor = props.tool === 'move' ? 'grab' : 'pointer'
      }}
      onPointerOut={() => {
        if (!props.walk && !gesture.isDragging()) gl.domElement.style.cursor = 'auto'
      }}
    >
      {children}
      {!props.walk && props.tool === 'move' && opening.kind === 'door' && (
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[m(opening.width), 0.04, m(wall.thickness) + 0.08]} />
          <meshBasicMaterial
            color="#3d876a"
            transparent
            opacity={props.selected === opening.id ? 0.5 : 0.18}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
function Walls({
  props,
  setDragging,
}: {
  props: SceneProps
  setDragging: (dragging: boolean) => void
}) {
  const heights = useWallHeights(props.plan, props.wallMode, props.walk)
  if (props.wallMode === 'none' && !props.walk) return null
  return (
    <>
      <WallStructure plan={props.plan} heights={heights} />
      {props.plan.openings.map((o) => {
        const wall = props.plan.walls.find((w) => w.id === o.wallId)!
        const w = m(o.width),
          h = m(
            Math.min(o.height, Math.max(0, (heights.get(wall.id) || props.plan.ceiling) - o.sill)),
          ),
          thick = m(wall.thickness),
          selected = props.selected === o.id,
          leaf = doorLeaf(o)
        if (h <= 0) return null
        return (
          <OpeningObject key={o.id} opening={o} wall={wall} props={props} setDragging={setDragging}>
            {props.walk && o.kind === 'door' && (
              <mesh position={[0, h / 2, 0]} userData={{ walkDoorTarget: true }}>
                <boxGeometry args={[w, h, 0.006]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            )}
            {o.kind === 'window' ? (
              <>
                <Box
                  size={[w, h, 0.014]}
                  position={[0, h / 2, 0]}
                  color={selected ? '#75b7a1' : '#506e83'}
                  opacity={0.55}
                  roughness={0.1}
                />
                {[-1, 1].map((side) => (
                  <Box
                    key={side}
                    size={[0.025, h, 0.045]}
                    position={[side * (w / 2 - 0.0125), h / 2, 0]}
                    color={selected ? '#2c765b' : '#34414a'}
                  />
                ))}
                {[0, h].map((y) => (
                  <Box
                    key={y}
                    size={[w, 0.028, 0.06]}
                    position={[0, y, 0]}
                    color={selected ? '#2c765b' : '#34414a'}
                  />
                ))}
                <Box size={[0.025, h, 0.04]} position={[0, h / 2, 0]} color="#34414a" />
                <Box
                  size={[w + 0.035, 0.028, thick + 0.04]}
                  position={[0, -0.014, 0]}
                  color="#e9e5d9"
                />
              </>
            ) : leaf ? (
              <>
                {props.wallMode === 'full' && (
                  <Box
                    size={[w + 0.03, 0.04, thick + 0.014]}
                    position={[0, h + 0.02, 0]}
                    color="#bda98b"
                  />
                )}
                <group
                  position={[m(leaf.hingeOffset), 0, 0]}
                  rotation={[
                    0,
                    props.walk && props.walkControls.closedDoors.has(o.id) ? 0 : leaf.rotation,
                    0,
                  ]}
                >
                  <Box
                    size={[w, props.wallMode === 'cut' ? 0.045 : h, 0.038]}
                    position={[
                      (leaf.direction * w) / 2,
                      props.wallMode === 'cut' ? 0.023 : h / 2,
                      0,
                    ]}
                    color={selected ? '#3d876a' : '#bea381'}
                  />
                </group>
              </>
            ) : (
              <>
                <mesh position={[0, h / 2, 0]}>
                  <boxGeometry args={[w, h, thick]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
                {selected && !props.walk && (
                  <Box size={[w, 0.012, thick]} position={[0, 0.006, 0]} color="#3d876a" />
                )}
              </>
            )}
          </OpeningObject>
        )
      })}
    </>
  )
}
function CameraControls({ props, dragging }: { props: SceneProps; dragging: boolean }) {
  const { camera, gl, size, invalidate } = useThree()
  const controlsRef = useRef<OrbitControls | null>(null)
  const sizeRef = useRef(size)
  sizeRef.current = size
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    controlsRef.current = controls
    controls.enableDamping = true
    controls.dampingFactor = 0.13
    controls.maxPolarAngle = Math.PI / 2.02
    controls.minPolarAngle = 0.12
    controls.minDistance = 0.8
    controls.maxDistance = 120
    const onChange = () => invalidate()
    controls.addEventListener('change', onChange)
    controls.target.copy(fitDollhouseCamera(camera, props.plan, props.roomId, sizeRef.current))
    controls.update()
    invalidate()
    return () => {
      controls.removeEventListener('change', onChange)
      controls.dispose()
      controlsRef.current = null
    }
  }, [camera, gl.domElement, invalidate, props.roomId, props.fitKey, props.plan.rooms])
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !dragging
      controlsRef.current.enableRotate = props.tool === 'orbit'
      invalidate()
    }
  }, [dragging, props.tool, invalidate])
  useFrame(() => {
    const controls = controlsRef.current
    if (controls) {
      controls.enabled = !dragging
      controls.enableRotate = props.tool === 'orbit'
      if (controls.update()) invalidate()
    }
  })
  return null
}
function FloorContent({
  props,
  setDragging,
}: {
  props: SceneProps
  setDragging: (dragging: boolean) => void
}) {
  return (
    <>
      {props.plan.rooms.map((room) => (
        <group key={room.id}>
          <RoomFloor
            room={room}
            floorColor={canColorRoom(room) ? props.plan.finishes?.[room.id]?.floor : undefined}
          />
          {!props.walk && <FloorLabel room={room} />}
          {props.walk && (
            <RoomCeiling
              room={room}
              height={props.plan.ceiling}
              color={roomFinishes(props.plan, room).ceiling}
            />
          )}
        </group>
      ))}
      <Walls props={props} setDragging={setDragging} />
      {props.plan.items.map((item) => (
        <Furniture key={item.id} item={item} props={props} setDragging={setDragging} />
      ))}
    </>
  )
}
function World({ props }: { props: SceneProps }) {
  const [dragging, setDragging] = useState(false)
  const overview = useMemo(
    () =>
      props.stackedFloors
        ? {
            ...props.plan,
            rooms: props.stackedFloors.flatMap((f) => f.plan.rooms),
            walls: props.stackedFloors.flatMap((f) => f.plan.walls),
            ceiling: Math.max(...props.stackedFloors.map((f) => f.elevation + f.plan.ceiling)),
          }
        : props.plan,
    [props.plan, props.stackedFloors],
  )
  return (
    <>
      <color attach="background" args={['#25292d']} />
      {props.walk ? (
        <WalkControls
          {...props.walkControls}
          plan={props.plan}
          roomId={props.roomId}
          fitKey={props.fitKey}
          input={props.walkInput}
        />
      ) : (
        <CameraControls props={{ ...props, plan: overview }} dragging={dragging} />
      )}
      <SceneLighting plan={overview} settings={props.lighting} walk={props.walk} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, -0.22, 5]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#24292e" roughness={1} />
      </mesh>
      {props.grid && (
        <gridHelper args={[152.4, 500, '#58636b', '#3a4147']} position={[3, -0.213, 5]} />
      )}
      {props.stackedFloors ? (
        props.stackedFloors.map((f) => (
          <group key={f.id} position={[0, m(f.elevation), 0]}>
            <FloorContent
              props={{
                ...props,
                plan: f.plan,
                selected: null,
                tool: 'orbit',
                onSelect: () => {},
                onTransform: () => {},
                onMoveOpening: () => {},
              }}
              setDragging={setDragging}
            />
          </group>
        ))
      ) : (
        <FloorContent props={props} setDragging={setDragging} />
      )}
    </>
  )
}
export default function Scene(props: SceneProps) {
  const viewCamera = useMemo(
    () => (props.walk ? new THREE.PerspectiveCamera(68, 1, 0.035, 100) : createDollhouseCamera()),
    [props.walk],
  )
  return (
    <Canvas
      key={props.walk ? 'walk' : 'perspective-overview'}
      shadows
      camera={viewCamera}
      dpr={[1, 2]}
      frameloop={props.walk ? 'always' : 'demand'}
      gl={{
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1,
      }}
      onPointerMissed={() => {
        if (!props.walk) props.onSelect(null)
      }}
    >
      <World props={props} />
    </Canvas>
  )
}
