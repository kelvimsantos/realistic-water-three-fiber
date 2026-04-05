import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

export function UnderwaterEffect({
  distortionStrength = 0.02,
  fogDensity = 0.04,
  colorShift = 0.15,

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
        uTime: { value: 0 },
        uIsUnderwater: { value: 0 },
        uDistortion: { value: distortionStrength },
        uFogDensity: { value: fogDensity },
        uColorShift: { value: colorShift },
        uDepthFactor: { value: 0 } // 🔥 NOVO
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
        uniform float uTime;
        uniform int uIsUnderwater;
        uniform float uDistortion;
        uniform float uFogDensity;
        uniform float uColorShift;
        uniform float uDepthFactor;

        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;

          if (uIsUnderwater == 1) {
            uv.x += sin(uv.y * 10.0 + uTime * 1.2) * uDistortion;
            uv.y += cos(uv.x * 10.0 + uTime * 1.4) * uDistortion;
          }

          vec3 color = texture2D(uTexture, uv).rgb;

          if (uIsUnderwater == 1) {

            // 🔥 FOG VOLUMÉTRICO BASEADO EM PROFUNDIDADE REAL
            float fogAmount = 1.0 - exp(-uDepthFactor * uFogDensity * 3.0);

           // vec3 waterColor = vec3(0.0, 0.35, 0.45);
          vec3 waterColor = vec3(0.0, 0.12, 0.18); // 🔥 azul bem mais escuro

            color = mix(color, waterColor, fogAmount);

            // 🎨 absorção mais forte com profundidade
            color.b += uColorShift * uDepthFactor;
            color.g += uColorShift * 0.5 * uDepthFactor;
            color.r *= (1.0 - uColorShift * uDepthFactor);
          }

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false
    })
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return

    const camPos = camera.position

    const minY = bounds.min.y
    const maxY = bounds.max.y

    const isInsideVolume =
      camPos.x > bounds.min.x &&
      camPos.x < bounds.max.x &&
      camPos.y > minY &&
      camPos.y < maxY &&
      camPos.z > bounds.min.z &&
      camPos.z < bounds.max.z

    const isUnderwater = isInsideVolume ? 1 : 0

    // 🔥 PROFUNDIDADE REAL DA CÂMERA
    let depthFactor = 0
    if (isInsideVolume) {
      depthFactor = (maxY - camPos.y) / (maxY - minY)
      depthFactor = THREE.MathUtils.clamp(depthFactor, 0, 1)
    }

    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uIsUnderwater.value = isUnderwater
    material.uniforms.uDepthFactor.value = depthFactor

    // 🔥 FIX FEEDBACK LOOP
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