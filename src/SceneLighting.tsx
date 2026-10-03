import { useMemo } from 'react'
import * as THREE from 'three'
import { m, planBounds, type LightingSettings, type Plan } from './model'
import { lightingAt } from './lighting'

export default function SceneLighting({
  plan,
  settings,
  walk,
}: {
  plan: Plan
  settings: LightingSettings
  walk: boolean
}) {
  const light = lightingAt(settings)
  const target = useMemo(() => {
    const { minX: x1, maxX: x2, minZ: z1, maxZ: z2 } = planBounds(plan)
    const object = new THREE.Object3D()
    object.position.set(m((x1 + x2) / 2), 0, m((z1 + z2) / 2))
    return object
  }, [plan.rooms, plan.walls])
  const sunColor = new THREE.Color('#ffc185').lerp(new THREE.Color('#fff9ec'), light.daylight)
  return (
    <>
      <ambientLight
        intensity={light.ambientIntensity}
        color={light.night ? '#fff4e5' : '#ffffff'}
      />
      <hemisphereLight
        args={[light.night ? '#fff4e5' : '#f7f6f0', '#8d968e', light.hemisphereIntensity]}
      />
      <primitive object={target} />
      <directionalLight
        position={[
          target.position.x + light.sunPosition[0],
          light.sunPosition[1],
          target.position.z + light.sunPosition[2],
        ]}
        target={target}
        color={sunColor}
        intensity={light.sunIntensity}
        castShadow={light.castShadow}
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={0.1}
        shadow-camera-far={60}
        shadow-normalBias={0.018}
        shadow-bias={-0.00015}
        shadow-radius={3}
      />
      <directionalLight position={[10, 8, 12]} intensity={light.night ? 0 : 0.65} color="#dce7f3" />
      {(light.night || walk) &&
        plan.rooms.map((room) => (
          <pointLight
            key={room.id}
            position={[m(room.x + room.width / 2), m(plan.ceiling - 8), m(room.z + room.depth / 2)]}
            intensity={light.night ? 14 : 4}
            distance={m(Math.max(room.width, room.depth) * 1.5)}
            decay={2}
            color="#fff5df"
            castShadow={false}
          />
        ))}
    </>
  )
}
