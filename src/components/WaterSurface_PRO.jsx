import { useFrame, useThree } from '@react-three/fiber'
import { useFBO, useTexture } from '@react-three/drei'
import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'

const MAX_RIPPLES = 8

export const WaterSurfacePRO = forwardRef(function WaterSurfacePRO({
  size = 40,
  waterLevel = 0,

  waveIntensity = 1.0,
  waveSpeed = 0.8,

  opacity = 0.35,
  refractionStrength = 0.06,
  reflectionStrength = 0.35,
  fresnelStrength = 2.0,

  shallowColor = '#5cb8d4',
  deepColor = '#0a3542'
}, ref) {

  const meshRef = useRef()
  const { gl, scene, camera } = useThree()
  const target = useFBO()

  const normalMap = useTexture('/textures/waternormals.jpg')
  const skyTexture = useTexture('/textures/ypos.jpg')

  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping

  useImperativeHandle(ref, () => ({
    size,
    waterLevel
  }))

  // 🔥 ARRAY DE RIPPLES (cada um independente)
  const ripples = useRef([])

  const uniforms = useMemo(() => ({
    uTexture: { value: null },
    uTime: { value: 0 },

    uNormalMap: { value: normalMap },
    uSky: { value: skyTexture },

    uOpacity: { value: opacity },
    uRefraction: { value: refractionStrength *5 },
    uReflection: { value: reflectionStrength *5 },
    uFresnel: { value: fresnelStrength },

    uWaveIntensity: { value: waveIntensity },

    uShallow: { value: new THREE.Color(shallowColor) },
    uDeep: { value: new THREE.Color(deepColor) },

    // 🔥 MULTI RIPPLE
    uRippleCenters: { value: Array(MAX_RIPPLES).fill(new THREE.Vector2()) },
    uRippleTimes: { value: new Float32Array(MAX_RIPPLES) }

  }), [])

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    side: THREE.DoubleSide,

    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;

      uniform float uTime;
      uniform float uWaveIntensity;

      uniform vec2 uRippleCenters[${MAX_RIPPLES}];
      uniform float uRippleTimes[${MAX_RIPPLES}];

      void main() {
        vUv = uv;

        vec3 pos = position;
        float time = uTime;

        // 🌊 ONDAS BASE (inalteradas)
        float waveLarge =
            sin(pos.x * 0.15 + time * 1.0) +
            cos(pos.y * 0.15 + time * 0.9);

        float waveMedium =
            sin(pos.x * 0.4 + time * 1.5) +
            cos(pos.y * 0.35 + time * 1.3);

        float waveSmall =
            sin(pos.x * 1.2 + time * 2.5) +
            cos(pos.y * 1.1 + time * 2.2);

        float height =
            waveLarge * 0.6 +
            waveMedium * 0.3 +
            waveSmall * 0.1;

        height *= 0.25 * uWaveIntensity;

        pos.z += height;

        // 🔥 MULTI RIPPLES (cada um independente)
        for(int i = 0; i < ${MAX_RIPPLES}; i++) {

          float t = uRippleTimes[i];

          if(t < 2.0) {

            float dist = distance(vUv, uRippleCenters[i]);

            float life =
              smoothstep(0.0, 0.2, t) *
              (1.0 - smoothstep(1.0, 2.0, t));

            float wave = sin(dist * 120.0 - t * 10.0);

            float ring =
              smoothstep(t * 0.2, t * 0.2 + 0.02, dist) -
              smoothstep(t * 0.2 + 0.02, t * 0.2 + 0.04, dist);

            float ripple = wave * ring * life;

            pos.z += ripple * 0.3;
          }
        }

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;

        vNormal = normalize(normalMatrix * normal);

        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,

    fragmentShader: `

      uniform sampler2D uTexture;
      uniform sampler2D uNormalMap;
      uniform sampler2D uSky;

      uniform float uTime;
      uniform float uOpacity;
      uniform float uRefraction;
      uniform float uReflection;
      uniform float uFresnel;
      uniform float uWaveIntensity;

      uniform vec3 uShallow;
      uniform vec3 uDeep;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;

      void main() {

        vec2 uv1 = vUv * 4.0 + vec2(uTime * 0.05, uTime * 0.08);
        vec2 uv2 = vUv * 8.0 - vec2(uTime * 0.03, uTime * 0.04);

        vec3 n1 = texture2D(uNormalMap, uv1).rgb;
        vec3 n2 = texture2D(uNormalMap, uv2).rgb;

        vec3 normal = normalize((n1 + n2 - 1.0) * uWaveIntensity);

        vec2 refractUV = vUv + normal.xy * uRefraction;
        vec3 refracted = texture2D(uTexture, refractUV).rgb;

        float depth = clamp(vWorldPos.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 waterColor = mix(uDeep, uShallow, depth);

        vec2 skyUV = vec2(
          0.5 + normal.x * 0.3,
          0.5 + normal.y * 0.3
        );

        vec3 sky = texture2D(uSky, skyUV).rgb;

        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnelFactor = pow(1.0 - dot(viewDir, normal), uFresnel);

        float reflectionMix = clamp(fresnelFactor * uReflection, 0.0, 1.0);

        vec3 finalColor = mix(refracted, waterColor, 0.5);
        finalColor = mix(finalColor, sky, reflectionMix * 1.5);

        gl_FragColor = vec4(finalColor, uOpacity);
      }
    `
  }), [])

  useFrame((state, delta) => {
    if (!meshRef.current) return

    material.uniforms.uTime.value = state.clock.elapsedTime

    // 🔥 atualiza cada ripple
    ripples.current.forEach(r => {
      r.time += delta
    })

    // remove mortos
    ripples.current = ripples.current.filter(r => r.time < 2.0)

    // envia pro shader
    for (let i = 0; i < MAX_RIPPLES; i++) {
      if (ripples.current[i]) {
        material.uniforms.uRippleCenters.value[i] = ripples.current[i].pos
        material.uniforms.uRippleTimes.value[i] = ripples.current[i].time
      } else {
        material.uniforms.uRippleTimes.value[i] = 999
      }
    }

    // refração
    meshRef.current.visible = false
    gl.setRenderTarget(target)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    meshRef.current.visible = true

    material.uniforms.uTexture.value = target.texture
  })

  return (
    <mesh
      ref={meshRef}
      position={[0, waterLevel, 0]}
      rotation={[-Math.PI / 2, 0, 0]}

      onPointerDown={(e) => {
        if (!e.uv) return

        // 🔥 cria novo ripple (NÃO substitui)
        ripples.current.push({
          pos: new THREE.Vector2(e.uv.x, e.uv.y),
          time: 0
        })

        // limite
        if (ripples.current.length > MAX_RIPPLES) {
          ripples.current.shift()
        }
      }}
    >
      <planeGeometry args={[size, size, 128, 128]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
})