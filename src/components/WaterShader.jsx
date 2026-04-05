import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { useRef, useMemo, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'

// Ondas (mantido igual)
function fbmNoise(x, z, t) {
  let value = 0
  let amplitude = 0.5
  let frequency = 0.4
  for (let i = 0; i < 5; i++) {
    value += amplitude * Math.sin(x * frequency + t) * Math.cos(z * frequency + t * 0.8)
    value += amplitude * 0.6 * Math.sin(x * frequency * 2.3 - t * 1.2) * Math.sin(z * frequency * 1.9 + t)
    amplitude *= 0.5
    frequency *= 2.1
  }
  return value / 1.5
}

// 🔥 AGORA COM forwardRef
export const WaterPlane = forwardRef(function WaterPlane({
  size = 40,
  segments = 256,
  waterLevel = 0,
  waveHeight = 0.7,
  waveSpeed = 0.9,
  opacity = 0.65,
  refractionStrength = 0.03,
  reflectivity = 0.4,
  shallowColor = '#5cb8d4',
  deepColor = '#0a3542'
}, ref) {

  const meshRef = useRef()
  const { clock, camera, gl, scene } = useThree()
  const target = useFBO(gl.domElement.width, gl.domElement.height)

  // 🔥 EXPÕE DADOS PRA OUTROS SISTEMAS
  useImperativeHandle(ref, () => ({
    mesh: meshRef.current,
    size,
    waterLevel
  }))

  // Cubemap
  const [envMap, setEnvMap] = useState(null)
  useEffect(() => {
    const urls = [
      '/textures/xpos.jpg',
      '/textures/xneg.jpg',
      '/textures/ypos.jpg',
      '/textures/yneg.jpg',
      '/textures/zpos.jpg',
      '/textures/zneg.jpg'
    ].filter(url => url && url !== '')

    if (urls.length === 6) {
      new THREE.CubeTextureLoader().load(urls, (tex) => setEnvMap(tex))
    } else {
      console.warn('Cubemap incompleta, usando reflexo ambiente')
      setEnvMap(null)
    }
  }, [])

  // Geometria
  const { geometry, origX, origZ } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position.array
    const xCoords = []
    const zCoords = []

    for (let i = 0; i < positions.length / 3; i++) {
      xCoords.push(positions[i * 3])
      zCoords.push(positions[i * 3 + 2])
    }

    return { geometry: geo, origX: xCoords, origZ: zCoords }
  }, [size, segments])

  // Ondas
  useFrame(() => {
    if (!meshRef.current) return

    const t = clock.getElapsedTime() * waveSpeed
    const positions = geometry.attributes.position.array

    for (let i = 0; i < positions.length / 3; i++) {
      const x = origX[i]
      const z = origZ[i]

      let y = fbmNoise(x, z, t) * waveHeight
      y += Math.sin(x * 1.8 + t) * Math.cos(z * 1.2 + t * 1.1) * 0.1
      y += Math.sin(x * 3.2 - t * 2.0) * 0.05

      positions[i * 3 + 1] = y + waterLevel
    }

    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
  })

  // Vertex shader
  const vertexShader = `
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;

    void main() {
      vUv = uv;
      vElevation = position.y;

      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vWorldNormal = normalize(normalMatrix * normal);

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `

  // Fragment shader
  const fragmentShader = `
    uniform sampler2D uScreenTexture;
    uniform samplerCube uEnvMap;
    uniform float uTime;
    uniform float uOpacity;
    uniform float uRefractionStrength;
    uniform float uReflectivity;
    uniform int uHasEnvMap;
    uniform vec3 uShallowColor;
    uniform vec3 uDeepColor;

    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;

    void main() {

      vec2 distortedUv = vUv;
      distortedUv.x += sin(vElevation * 15.0 + uTime) * uRefractionStrength;
      distortedUv.y += cos(vElevation * 15.0 + uTime * 1.2) * uRefractionStrength;

      float depthFactor = clamp((vElevation + 0.8) / 1.6, 0.0, 1.0);
      vec3 waterColor = mix(uDeepColor, uShallowColor, depthFactor);

      float foam = smoothstep(0.4, 0.7, vElevation) * 0.8;
      waterColor = mix(waterColor, vec3(0.95, 0.98, 1.0), foam);

      vec3 reflectColor;
      if (uHasEnvMap == 1) {
        vec3 viewDir = normalize(vWorldPosition - cameraPosition);
        vec3 reflectDir = reflect(viewDir, vWorldNormal);
        reflectColor = textureCube(uEnvMap, reflectDir).rgb;
      } else {
        reflectColor = vec3(0.4, 0.65, 0.9);
      }

      waterColor = mix(waterColor, reflectColor, uReflectivity);

      vec3 bgColor = texture(uScreenTexture, distortedUv).rgb;

      vec3 finalColor = mix(bgColor, waterColor, uOpacity);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `

  const uniforms = useMemo(() => ({
    uScreenTexture: { value: null },
    uEnvMap: { value: envMap },
    uTime: { value: 0 },
    uOpacity: { value: opacity },
    uRefractionStrength: { value: refractionStrength },
    uReflectivity: { value: reflectivity },
    uHasEnvMap: { value: envMap ? 1 : 0 },
    uShallowColor: { value: new THREE.Color(shallowColor) },
    uDeepColor: { value: new THREE.Color(deepColor) }
  }), [opacity, refractionStrength, reflectivity, envMap, shallowColor, deepColor])

  // Captura da cena sem a água
  useFrame((state) => {
    if (!meshRef.current) return

    meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime

    const originalVisible = meshRef.current.visible
    meshRef.current.visible = false

    state.gl.setRenderTarget(target)
    state.gl.render(state.scene, state.camera)
    state.gl.setRenderTarget(null)

    meshRef.current.visible = originalVisible
    meshRef.current.material.uniforms.uScreenTexture.value = target.texture
  })

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
})