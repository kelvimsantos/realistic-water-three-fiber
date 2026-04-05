import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { OrbitControls } from "@react-three/drei"
import vertexShader from "../shaders/water/vertex.glsl?raw"
import fragmentShader from "../shaders/water/fragment.glsl?raw"
export default function Experience() {
  const mesh = useRef()

  useFrame((state) => {
    mesh.current.material.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} />

      <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20, 256, 256]} />
        <shaderMaterial
          transparent
          uniforms={{
            uTime: { value: 0 },
            uDepthColor: { value: new THREE.Color("#186691") },
            uSurfaceColor: { value: new THREE.Color("#9bd8ff") },
          }}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>

      <OrbitControls />
    </>
  )
}