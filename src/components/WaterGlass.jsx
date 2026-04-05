import * as THREE from 'three'

export function WaterGlass({ size = 40, waterLevel = 0, depth = 5 }) {
  return (
    <mesh
      position={[0, waterLevel - depth / 2, 0]}
      renderOrder={1} // 🔥 força ordem de render
    >
      <boxGeometry args={[size, depth, size]} />

      <meshPhysicalMaterial
        color="#ffffff"
        transparent
        opacity={0.08}

        transmission={1}
        roughness={0}
        metalness={0}
        thickness={1.5}
        ior={1.33}

        depthWrite={false}   // 🔥 ESSENCIAL
        depthTest={true}     // mantém teste

        side={THREE.DoubleSide}
      />
    </mesh>
  )
}