import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

export function AboveWaterFog({
  fogStrength = 0.15,
  fogColor = [0.6, 0.7, 0.8],

  bounds = {
    min: { x: -20, y: -5, z: -20 },
    max: { x: 20, y: 0, z: 20 }
  }
}) {
  const { gl, scene, camera, size } = useThree()
  const target = useFBO(size.width, size.height)
  const meshRef = useRef()

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uFogStrength: { value: fogStrength },
        uFogColor: { value: new THREE.Color(...fogColor) },
        uIsAboveWater: { value: 1 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uFogStrength;
        uniform vec3 uFogColor;
        uniform int uIsAboveWater;

        varying vec2 vUv;

        void main() {
          vec3 color = texture2D(uTexture, vUv).rgb;

          if (uIsAboveWater == 1) {
            float dist = length(vec3(gl_FragCoord.xy * 0.001, gl_FragCoord.z));

            float fog = exp(-dist * uFogStrength);

            color = mix(uFogColor, color, fog);
          }

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false
    })
  }, [])

  useFrame(() => {
    if (!meshRef.current) return

    const camY = camera.position.y

    const isAboveWater = camY > bounds.max.y ? 1 : 0

    material.uniforms.uIsAboveWater.value = isAboveWater

    // 🔥 evitar feedback loop
    const wasVisible = meshRef.current.visible
    meshRef.current.visible = false

    gl.setRenderTarget(target)
    gl.render(scene, camera)
    gl.setRenderTarget(null)

    meshRef.current.visible = wasVisible

    material.uniforms.uTexture.value = target.texture
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}