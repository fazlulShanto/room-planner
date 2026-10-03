import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { m, type Plan } from './model'
import { canCloseDoor, createWalkSpace, DOOR_REACH, walkDelta, type WalkInput } from './walk'

export type WalkLook = 'drag' | 'mouse' | 'locked'
export type WalkActions = { mouseLook: () => void; dragLook: () => void; toggleDoor: () => void }
export type WalkControlsProps = {
  plan: Plan
  roomId: string
  fitKey: number
  input: WalkInput
  eyeHeight: number
  closedDoors: ReadonlySet<string>
  actionsRef: RefObject<WalkActions | null>
  onLookChange: (look: WalkLook) => void
  onDoorTarget: (id: string | null) => void
  onDoorToggle: (id: string) => void
  onExit: () => void
  onMessage: (message: string) => void
}
const movementKeys = new Set([
  'w',
  'a',
  's',
  'd',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'q',
  'e',
  'shift',
])

export default function WalkControls(props: WalkControlsProps) {
  const { plan, roomId, fitKey, input, eyeHeight, closedDoors } = props
  const { camera, gl, scene } = useThree()
  const space = useMemo(
    () => createWalkSpace(plan, eyeHeight, closedDoors),
    [plan.rooms, plan.walls, plan.openings, plan.items, plan.ceiling, eyeHeight, closedDoors],
  )
  const latest = useRef({ props, space })
  latest.current = { props, space }
  const keys = useRef(new Set<string>())
  const aim = useRef({ yaw: 0.35, pitch: -0.06 })
  const look = useRef<WalkLook>('drag')
  const targetDoor = useRef<string | null>(null)
  const raycaster = useMemo(() => new THREE.Raycaster(undefined, undefined, 0, m(DOOR_REACH)), [])
  const center = useMemo(() => new THREE.Vector2(), [])
  useEffect(() => {
    const [x, z] = latest.current.space.start(roomId)
    camera.position.set(m(x), m(latest.current.props.eyeHeight), m(z))
    aim.current = { yaw: 0.35, pitch: -0.06 }
    camera.rotation.set(aim.current.pitch, aim.current.yaw, 0, 'YXZ')
    keys.current.clear()
  }, [camera, roomId, fitKey])
  useEffect(() => {
    const canvas = gl.domElement
    let active = true,
      captureAttempt = 0,
      ignoreEscapeUntil = 0
    let drag: { id: number; x: number; y: number } | null = null
    let hover: { x: number; y: number } | null = null
    const editable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
    const turn = (dx: number, dy: number) => {
      aim.current.yaw -= dx * 0.0035
      aim.current.pitch = Math.max(-1.25, Math.min(1.25, aim.current.pitch - dy * 0.0035))
    }
    const clear = () => {
      keys.current.clear()
      drag = null
      hover = null
    }
    const setLook = (mode: WalkLook) => {
      look.current = mode
      clear()
      canvas.style.cursor = mode === 'drag' ? 'grab' : 'crosshair'
      latest.current.props.onLookChange(mode)
    }
    const release = () => {
      captureAttempt++
      setLook('drag')
      if (document.pointerLockElement === canvas) document.exitPointerLock()
    }
    const capture = () => {
      const attempt = ++captureAttempt
      setLook('mouse')
      canvas.focus()
      // Pointer lock must be requested synchronously from the user's click.
      // Unsupported embedded browsers retain hover-based mouse look.
      if (!canvas.requestPointerLock) return
      try {
        Promise.resolve(canvas.requestPointerLock()).catch(() => {
          if (active && attempt === captureAttempt && look.current !== 'drag') setLook('mouse')
        })
      } catch {
        if (active && attempt === captureAttempt) setLook('mouse')
      }
    }
    const toggleDoor = () => {
      const id = targetDoor.current,
        current = latest.current.props
      if (!id) return
      if (
        !current.closedDoors.has(id) &&
        !canCloseDoor(current.plan, id, [camera.position.x / 0.0254, camera.position.z / 0.0254])
      ) {
        current.onMessage('Step clear of the doorway before closing it.')
        return
      }
      current.onDoorToggle(id)
    }
    const actions = { mouseLook: capture, dragLook: release, toggleDoor }
    props.actionsRef.current = actions
    const down = (e: KeyboardEvent) => {
      if (e.defaultPrevented || editable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'escape') {
        e.preventDefault()
        if (e.repeat) return
        if (look.current !== 'drag' || document.pointerLockElement === canvas) {
          ignoreEscapeUntil = performance.now() + 300
          release()
        } else if (performance.now() > ignoreEscapeUntil) latest.current.props.onExit()
        return
      }
      if (key === 'f') {
        e.preventDefault()
        if (!e.repeat) toggleDoor()
        return
      }
      if (movementKeys.has(key)) {
        e.preventDefault()
        if (!keys.current.has(key) && key !== 'shift') {
          if (key === 'q' || key === 'e') aim.current.yaw += key === 'q' ? 0.06 : -0.06
          else {
            const forward = ['w', 'arrowup'].includes(key)
              ? 1
              : ['s', 'arrowdown'].includes(key)
                ? -1
                : 0
            const strafe = ['d', 'arrowright'].includes(key)
              ? 1
              : ['a', 'arrowleft'].includes(key)
                ? -1
                : 0
            const [dx, dz] = walkDelta(aim.current.yaw, forward, strafe, 3)
            const [x, z] = latest.current.space.move(
              [camera.position.x / 0.0254, camera.position.z / 0.0254],
              dx,
              dz,
            )
            camera.position.set(m(x), m(latest.current.props.eyeHeight), m(z))
          }
        }
        keys.current.add(key)
      }
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    const lockChange = () => {
      if (!active) return
      if (document.pointerLockElement === canvas) {
        if (look.current === 'drag') document.exitPointerLock()
        else setLook('locked')
      } else if (look.current === 'locked') {
        ignoreEscapeUntil = performance.now() + 300
        setLook('drag')
      }
    }
    const lockError = () => {
      if (active && look.current !== 'drag') setLook('mouse')
    }
    const mouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) turn(e.movementX, e.movementY)
    }
    const pointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || drag || document.pointerLockElement === canvas) return
      if (look.current === 'mouse' && e.pointerType === 'mouse') {
        capture()
        return
      }
      canvas.focus()
      canvas.setPointerCapture(e.pointerId)
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY }
      canvas.style.cursor = 'grabbing'
    }
    const pointerMove = (e: PointerEvent) => {
      if (document.pointerLockElement === canvas) return
      if (drag?.id === e.pointerId) {
        turn(e.clientX - drag.x, e.clientY - drag.y)
        drag.x = e.clientX
        drag.y = e.clientY
      } else if (look.current === 'mouse' && e.pointerType === 'mouse') {
        if (hover) turn(e.clientX - hover.x, e.clientY - hover.y)
        hover = { x: e.clientX, y: e.clientY }
      }
    }
    const pointerUp = (e: PointerEvent) => {
      if (drag?.id !== e.pointerId) return
      drag = null
      canvas.style.cursor = look.current === 'drag' ? 'grab' : 'crosshair'
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    }
    const leave = () => {
      hover = null
    }
    canvas.tabIndex = 0
    canvas.setAttribute(
      'aria-label',
      'Walk through your home. WASD or arrows to move. F opens or closes the door at the crosshair. Enable Mouse look for free looking, or drag to look.',
    )
    canvas.style.cursor = 'grab'
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    document.addEventListener('focusin', clear)
    document.addEventListener('pointerlockchange', lockChange)
    document.addEventListener('pointerlockerror', lockError)
    document.addEventListener('mousemove', mouseMove)
    canvas.addEventListener('pointerdown', pointerDown)
    canvas.addEventListener('pointermove', pointerMove)
    canvas.addEventListener('pointerup', pointerUp)
    canvas.addEventListener('pointercancel', pointerUp)
    canvas.addEventListener('pointerleave', leave)
    return () => {
      active = false
      captureAttempt++
      clear()
      canvas.style.cursor = 'auto'
      if (document.pointerLockElement === canvas) document.exitPointerLock()
      if (props.actionsRef.current === actions) props.actionsRef.current = null
      latest.current.props.onLookChange('drag')
      latest.current.props.onDoorTarget(null)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
      document.removeEventListener('focusin', clear)
      document.removeEventListener('pointerlockchange', lockChange)
      document.removeEventListener('pointerlockerror', lockError)
      document.removeEventListener('mousemove', mouseMove)
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('pointercancel', pointerUp)
      canvas.removeEventListener('pointerleave', leave)
    }
  }, [gl.domElement, camera, props.actionsRef])
  useFrame((_, delta) => {
    const k = keys.current,
      has = (...names: string[]) => (names.some((n) => k.has(n)) ? 1 : 0)
    const elapsed = Math.min(delta, 0.05)
    aim.current.yaw += (has('q') - has('e') + input.turn) * elapsed * 1.45
    const forward = has('w', 'arrowup') - has('s', 'arrowdown') + input.forward
    const strafe = has('d', 'arrowright') - has('a', 'arrowleft') + input.strafe
    const [dx, dz] = walkDelta(
      aim.current.yaw,
      forward,
      strafe,
      (k.has('shift') ? 90 : 48) * elapsed,
    )
    const [x, z] = space.move([camera.position.x / 0.0254, camera.position.z / 0.0254], dx, dz)
    camera.position.set(m(x), m(eyeHeight), m(z))
    camera.rotation.set(aim.current.pitch, aim.current.yaw, 0, 'YXZ')
    camera.updateMatrixWorld()
    raycaster.setFromCamera(center, camera)
    const hit = raycaster.intersectObjects(scene.children, true).find((hit) => {
      if (!(hit.object instanceof THREE.Mesh)) return false
      const materials = Array.isArray(hit.object.material)
        ? hit.object.material
        : [hit.object.material]
      return (
        hit.object.userData.walkDoorTarget ||
        materials.some((material) => material.visible && material.opacity > 0)
      )
    })
    let doorId: string | null = null
    for (let object = hit?.object; object; object = object.parent ?? undefined) {
      if (object.userData.walkDoorId) {
        doorId = object.userData.walkDoorId
        break
      }
    }
    if (targetDoor.current !== doorId) {
      targetDoor.current = doorId
      latest.current.props.onDoorTarget(doorId)
    }
  })
  return null
}
