import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';

// Função de ondas (FBM com múltiplas frequências)
function computeWaveHeight(x, z, t) {
  let y = 0;
  y += Math.sin(x * 0.4 + t) * Math.cos(z * 0.4 + t * 0.7) * 0.25;
  y += Math.sin(x * 0.8 - t * 1.2) * 0.15;
  y += Math.cos(z * 0.6 + t * 1.1) * 0.15;
  y += Math.sin((x * 1.2 + z * 0.9) * 0.8 + t * 1.5) * 0.1;
  y += Math.sin(x * 2.5 + t * 2.0) * Math.cos(z * 2.0 + t) * 0.07;
  return y;
}

export default function RealisticWater({
  size = 40,
  segments = 256,
  waterLevel = 0,
  waveHeightAmount = 0.5,  // renamed to avoid conflict
  waveSpeed = 0.8,
  waterColor = '#5cb8d4',
  shallowColor = '#7ec8e0',
  deepColor = '#1a5a6e',
  transparency = 0.92,
  roughness = 0.25,
  metalness = 0.85,
  ior = 1.33,
  attenuationDistance = 1.8,
  causticStrength = 0.5,
  causticScale = 2.0,
  causticSpeed = 0.6,
  envMap = null
}) {
  const meshRef = useRef();
  const { clock, scene, camera, gl } = useThree();
  
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [size, segments]);

  useFrame(() => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * waveSpeed;
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length / 3; i++) {
      const x = positions[i * 3];
      const z = positions[i * 3 + 2];
      const y = computeWaveHeight(x, z, t) * waveHeightAmount;
      positions[i * 3 + 1] = y + waterLevel;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  const [causticTexture, setCausticTexture] = useState(null);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    
    let animationId;
    const animate = () => {
      const t = performance.now() * 0.001 * causticSpeed;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const numSpots = 180;
      for (let i = 0; i < numSpots; i++) {
        const angle = i * 0.3 + t;
        const radius = 0.4 + Math.sin(i * 0.7 + t) * 0.2;
        const x = (Math.sin(angle) * radius + 0.5) * canvas.width;
        const y = (Math.cos(angle * 1.3) * radius + 0.5) * canvas.height;
        const sizeSpot = 15 + Math.sin(i * 0.9 + t * 2) * 8;
        const intensity = 0.3 + Math.sin(i * 1.2 + t * 1.5) * 0.25;
        
        const grad = ctx.createRadialGradient(x, y, 2, x, y, sizeSpot);
        grad.addColorStop(0, `rgba(255, 240, 180, ${intensity * causticStrength})`);
        grad.addColorStop(1, 'rgba(255, 240, 180, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, sizeSpot, 0, Math.PI * 2);
        ctx.fill();
      }
      texture.needsUpdate = true;
      animationId = requestAnimationFrame(animate);
    };
    animate();
    setCausticTexture(texture);
    return () => cancelAnimationFrame(animationId);
  }, [causticStrength, causticScale, causticSpeed]);

  const causticPlaneRef = useRef();
  useFrame(() => {
    if (causticPlaneRef.current && causticTexture) {
      causticTexture.offset.x += 0.002;
      causticTexture.offset.y += 0.001;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        <meshPhysicalMaterial
          color={waterColor}
          roughness={roughness}
          metalness={metalness}
          transmission={transparency}
          thickness={0.5}
          ior={ior}
          attenuationColor={deepColor}
          attenuationDistance={attenuationDistance}
          transparent
          side={THREE.DoubleSide}
          envMap={envMap}
        />
      </mesh>

      <mesh 
        ref={causticPlaneRef}
        position={[0, waterLevel - 1.5, 0]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow
      >
        <planeGeometry args={[size + 2, size + 2]} />
        <meshStandardMaterial color="#c2a575" roughness={0.7} metalness={0.1}>
          {causticTexture && <canvasTexture attach="map" args={[causticTexture.image]} />}
        </meshStandardMaterial>
      </mesh>
    </group>
  );
}