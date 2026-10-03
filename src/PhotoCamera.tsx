import { useEffect, useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { photoVerticalFov, type PhotoPose } from './photo'
import { capturePhoto } from './photoCapture'

export type PhotoCapture = () => Promise<Blob>
export type PhotoSettings = {
  pose: PhotoPose
  fov: number
  onReady: (capture: PhotoCapture | null) => void
}

export default function PhotoCamera({ pose, fov, onReady }: PhotoSettings) {
  const { camera, gl, scene, invalidate } = useThree()
  const aim = useRef({ yaw: 0, pitch: 0 })
  useLayoutEffect(() => {
    camera.position.set(...pose.position)
    camera.lookAt(...pose.target)
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
    aim.current = { yaw: euler.y, pitch: euler.x }
    camera.updateMatrixWorld(true)
    invalidate()
  }, [camera, pose, invalidate])
  useLayoutEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera
    perspective.fov = photoVerticalFov(fov)
    perspective.updateProjectionMatrix()
    invalidate()
  }, [camera, fov, invalidate])
  useEffect(() => {
    onReady(() => capturePhoto(gl, scene, camera as THREE.PerspectiveCamera))
    return () => onReady(null)
  }, [camera, gl, scene, onReady])
  useEffect(() => {
    const canvas = gl.domElement
    canvas.style.cursor = 'grab'
    let drag: { pointer: number; x: number; y: number } | null = null
    const stop = () => {
      const pointer = drag?.pointer
      drag = null
      if (pointer !== undefined && canvas.hasPointerCapture(pointer))
        canvas.releasePointerCapture(pointer)
      canvas.style.cursor = 'grab'
    }
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !e.isPrimary || drag) return
      drag = { pointer: e.pointerId, x: e.clientX, y: e.clientY }
      canvas.setPointerCapture(e.pointerId)
      canvas.style.cursor = 'grabbing'
    }
    const move = (e: PointerEvent) => {
      if (!drag || drag.pointer !== e.pointerId) return
      aim.current.yaw -= (e.clientX - drag.x) * 0.004
      aim.current.pitch = THREE.MathUtils.clamp(
        aim.current.pitch - (e.clientY - drag.y) * 0.004,
        -1.2,
        1.2,
      )
      drag.x = e.clientX
      drag.y = e.clientY
      camera.rotation.set(aim.current.pitch, aim.current.yaw, 0, 'YXZ')
      invalidate()
    }
    const up = (e: PointerEvent) => {
      if (drag?.pointer === e.pointerId) stop()
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('lostpointercapture', up)
    window.addEventListener('blur', stop)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('lostpointercapture', up)
      window.removeEventListener('blur', stop)
      stop()
    }
  }, [camera, gl, invalidate])
  return null
}
