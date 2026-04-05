import { useMemo } from 'react'
import * as THREE from 'three'

export function WaterVolume({
  bounds = {
    min: { x: -10, y: -2, z: -10 },
    max: { x: 10, y: 0, z: 10 }
  },
  color = '#2f9bbf',
  density = 0.15
}) {
  const size = useMemo(() => {
    return [
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y,
      bounds.max.z - bounds.min.z
    ]
  }, [bounds])

  const position = useMemo(() => {
    return [
      (bounds.min.x + bounds.max.x) / 2,
      (bounds.min.y + bounds.max.y) / 2,
      (bounds.min.z + bounds.max.z) / 2
    ]
  }, [bounds])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uDensity: { value: density }
      },
      vertexShader: `
        varying vec3 vWorldPos;

        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPos = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uDensity;

        varying vec3 vWorldPos;

        void main() {
          float depth = gl_FragCoord.z / gl_FragCoord.w;

          float fog = 1.0 - exp(-depth * uDensity);

          vec3 finalColor = mix(vec3(0.0), uColor, fog);

          gl_FragColor = vec4(finalColor, fog * 0.6);
        }
      `
    })
  }, [])

  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}