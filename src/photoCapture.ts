import * as THREE from 'three'
import { PHOTO_ASPECT, PHOTO_HEIGHT, PHOTO_WIDTH } from './photo.ts'

/** Export the scene at a fixed resolution, restoring the live renderer even if encoding fails. */
export async function capturePhoto(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): Promise<Blob> {
  if (renderer.getContext().isContextLost())
    throw new Error('3D is unavailable. Reopen the photo preview to try again.')
  const size = renderer.getSize(new THREE.Vector2())
  const ratio = renderer.getPixelRatio()
  const photoCamera = camera.clone()
  photoCamera.aspect = PHOTO_ASPECT
  photoCamera.updateProjectionMatrix()
  try {
    renderer.setPixelRatio(1)
    renderer.setSize(PHOTO_WIDTH, PHOTO_HEIGHT, false)
    renderer.render(scene, photoCamera)
    return await new Promise<Blob>((resolve, reject) => {
      renderer.domElement.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not create the photo. Please try again.'))
      }, 'image/png')
    })
  } finally {
    renderer.setPixelRatio(ratio)
    renderer.setSize(size.x, size.y, false)
    renderer.render(scene, camera)
  }
}
