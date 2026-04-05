import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';

// Função de onda (FBM)
function wave(x, z, t) {
  let y = 0;
  y += Math.sin(x * 0.4 + t) * Math.cos(z * 0.4 + t * 0.8) * 0.3;
  y += Math.sin(x * 0.8 - t * 1.2) * 0.2;
  y += Math.cos(z * 0.6 + t * 1.1) * 0.15;
  y += Math.sin((x * 1.2 + z * 0.9) * 0.8 + t * 1.5) * 0.1;
  return y;
}

export default function WaterWithCaustics({
  size = 40,
  segments = 128,
  waterLevel = 0,
  waveHeight = 0.5,
  waveSpeed = 0.8,
  waterColor = '#5cb8d4',
  causticStrength = 0.4,
  causticScale = 2.0,
  causticSpeed = 0.5
}) {
  const meshRef = useRef();
  const { clock } = useThree();
  
  // Geometria com ondulação
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [size, segments]);

  // Animação das ondas (vertex shader)
  useFrame(() => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * waveSpeed;
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length / 3; i++) {
      const x = positions[i * 3];
      const z = positions[i * 3 + 2];
      const y = wave(x, z, t) * waveHeight;
      positions[i * 3 + 1] = y + waterLevel;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  // Textura de cáusticas animada (canvas 2D -> THREE.Texture)
  const [causticTexture, setCausticTexture] = useState(null);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    
    const animateCaustics = () => {
      const t = performance.now() * 0.002 * causticSpeed;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Desenha padrão de manchas (cáusticas)
      const cellSize = 40 * causticScale;
      for (let i = 0; i < 200; i++) {
        const x = (Math.sin(i * 0.7 + t) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(i * 0.3 + t * 1.2) * 0.5 + 0.5) * canvas.height;
        const r = 8 + Math.sin(i * 0.9 + t) * 4;
        const intensity = 0.3 + Math.sin(i * 1.4 + t * 2) * 0.3;
        const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
        grad.addColorStop(0, `rgba(255, 255, 200, ${intensity})`);
        grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      texture.needsUpdate = true;
      requestAnimationFrame(animateCaustics);
    };
    animateCaustics();
    setCausticTexture(texture);
  }, [causticScale, causticSpeed]);

  return (
    <>
      {/* Superfície da água (transparente, com reflexo/refração) */}
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        <meshPhysicalMaterial
          color={waterColor}
          metalness={0.9}
          roughness={0.25}
          transmission={0.92}
          thickness={0.8}
          ior={1.33}
          attenuationColor="#0a3542"
          attenuationDistance={1.5}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Fundo com cáusticas (projetadas no chão) */}
      <mesh position={[0, -2, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size + 5, size + 5]} />
        <meshStandardMaterial color="#c2a575" roughness={0.6}>
          {causticTexture && (
            <canvasTexture attach="map" args={[causticTexture.image]} 
              repeat={new THREE.Vector2(4, 4)} 
              offset={new THREE.Vector2(0, 0)} 
              rotation={0}
            />
          )}
        </meshStandardMaterial>
      </mesh>
    </>
  );
}