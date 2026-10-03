import { useEffect, useMemo, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Point } from '../model'
import type { SceneProps } from '../Scene'

/** Shared pointer capture, projection and undo lifecycle for objects in the 3D scene. */
export function useSceneDrag<T>({
  id,
  props,
  disabled = false,
  setDragging,
  onMove,
}: {
  id: string
  props: SceneProps
  disabled?: boolean
  setDragging: (dragging: boolean) => void
  onMove: (original: T, delta: Point) => void
}) {
  const drag = useRef<{
    pointer: number
    original: T
    start: THREE.Vector3
    clientX: number
    clientY: number
    moved?: boolean
  } | null>(null)
  const latest = useRef({ props, onMove })
  latest.current = { props, onMove }
  const { gl, camera } = useThree()
  const plane = useMemo(() => new THREE.Plane(), [])
  const point = useMemo(() => new THREE.Vector3(), [])
  function stop() {
    const d = drag.current
    if (!d) return
    drag.current = null
    setDragging(false)
    gl.domElement.style.cursor = 'auto'
    if (gl.domElement.hasPointerCapture(d.pointer)) gl.domElement.releasePointerCapture(d.pointer)
    latest.current.props.onDragEnd()
  }
  useEffect(() => {
    const element = gl.domElement
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d || d.pointer !== e.pointerId) return
      if (!d.moved && Math.hypot(e.clientX - d.clientX, e.clientY - d.clientY) < 3) return
      d.moved = true
      const rect = element.getBoundingClientRect()
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)
      if (!raycaster.ray.intersectPlane(plane, point)) return
      latest.current.onMove(d.original, [
        (point.x - d.start.x) / 0.0254,
        (point.z - d.start.z) / 0.0254,
      ])
    }
    const up = (e: PointerEvent) => {
      if (drag.current?.pointer === e.pointerId) stop()
    }
    const blur = () => stop()
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointercancel', up)
    element.addEventListener('lostpointercapture', up)
    window.addEventListener('blur', blur)
    return () => {
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointercancel', up)
      element.removeEventListener('lostpointercapture', up)
      window.removeEventListener('blur', blur)
      stop()
    }
  }, [gl, camera, plane, point])
  useEffect(() => {
    if (props.tool !== 'move' || props.walk || disabled || props.selected !== id) stop()
  }, [props.tool, props.walk, disabled, props.selected, id])
  function start(e: ThreeEvent<PointerEvent>, original: T, axis?: THREE.Vector3) {
    if (props.walk || e.button !== 0 || !e.isPrimary || drag.current) return
    e.stopPropagation()
    props.onSelect(id)
    if (props.tool !== 'move' || disabled) return
    // Furniture follows a horizontal plane at the grab height. Wall openings follow
    // a plane containing the wall axis, facing the pointer ray to avoid grazing angles.
    plane.normal.set(0, 1, 0)
    if (axis) {
      plane.normal.copy(e.ray.direction).addScaledVector(axis, -e.ray.direction.dot(axis))
      if (plane.normal.lengthSq() < 1e-8) return
      plane.normal.normalize()
    }
    plane.setFromNormalAndCoplanarPoint(plane.normal, e.point)
    if (!e.ray.intersectPlane(plane, point)) return
    drag.current = {
      pointer: e.pointerId,
      original,
      start: point.clone(),
      clientX: e.clientX,
      clientY: e.clientY,
    }
    gl.domElement.setPointerCapture(e.pointerId)
    setDragging(true)
    gl.domElement.style.cursor = 'grabbing'
    props.onDragStart()
  }
  return { start, isDragging: () => drag.current !== null }
}
