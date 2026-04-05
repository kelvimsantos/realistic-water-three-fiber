import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef } from 'react'

import { WaterPlane } from './components/WaterShader'
import { UnderwaterEffect } from './components/UnderwaterEffect'
import { WaterVolume } from './components/WaterVolume'
import { CausticsLight } from './components/CausticsLight'
import { WaterGlass } from './components/WaterGlass'  
import { AboveWaterFog } from './components/AboveWaterFog'
import { WaterSurfacePRO } from './components/WaterSurface_PRO'
import { SceneEffects } from './components/SceneEffects'


//let toggleDive = false
//
//window.addEventListener('keydown', (e) => {
//  if (e.key === 'Shift') toggleDive = true
//})

/* ===================================================== */
/* 🧍 PLAYER COMPLETO (SEM REMOVER SUA LÓGICA) */
/* ===================================================== */
//function Player({ waterRef }) {
//  const ref = useRef()
//  const lastPos = useRef(new THREE.Vector3())
//  const rippleCooldown = useRef(0)
//
//  const [isDiving, setIsDiving] = useState(false)
//
//  useFrame((state, delta) => {
//    if (!ref.current || !waterRef.current) return
//
//    const pos = ref.current.position
//
//    // 🔥 TOGGLE MERGULHO
//    if (toggleDive) {
//      setIsDiving(prev => !prev)
//      toggleDive = false
//    }
//
//    /* ===================================================== */
//    /* 🌊 DETECÇÃO DE SUPERFÍCIE (SEU CÓDIGO ORIGINAL) */
//    /* ===================================================== */
//    const isNearSurface =
//      pos.y <= waterRef.current.waterLevel + 0.2 &&
//      pos.y >= waterRef.current.waterLevel - 0.5
//
//    const speed = pos.distanceTo(lastPos.current)
//
//    rippleCooldown.current -= delta
//
//    if (isNearSurface && speed > 0.02 && rippleCooldown.current <= 0) {
//      waterRef.current.addRipple(pos.clone())
//      rippleCooldown.current = 0.15
//    }
//
//    /* ===================================================== */
//    /* 🟢 SURFACE MODE (NOVO - NÃO QUEBRA NADA) */
//    /* ===================================================== */
//    if (!isDiving) {
//      const targetY = waterRef.current.waterLevel
//
//      // 🔥 fixa na superfície suavemente
//      pos.y = THREE.MathUtils.damp(
//        pos.y,
//        targetY,
//        6,
//        delta
//      )
//
//      // 🔥 leve flutuação (opcional realista)
//      pos.y += Math.sin(state.clock.elapsedTime * 2) * 0.02
//    }
//
//    /* ===================================================== */
//    /* 🔵 UNDERWATER MODE */
//    /* ===================================================== */
//    else {
//      // aqui você pode expandir depois (gravidade, nado etc)
//    }
//
//    // 🔥 ESSENCIAL (SEU)
//    lastPos.current.copy(pos)
//  })
//
//  return (
//    <mesh ref={ref} position={[0, 1, 0]}>
//      <boxGeometry args={[1, 2, 1]} />
//      <meshStandardMaterial color="orange" />
//    </mesh>
//  )
//}


function App() {
  const waterRef = useRef()
        //exemplo de como usar no player ao aplicar ripple
          //function Player({ waterRef }) {
          //  const ref = useRef()
          //  const lastPos = useRef(new THREE.Vector3())
          //  const rippleCooldown = useRef(0)
          //
          //  useFrame((_, delta) => {
          //    if (!ref.current || !waterRef.current) return
          //    const pos = ref.current.position
          //    // 📏 DETECTA SE ESTÁ NA ÁGUA (superfície)
          //    const isNearSurface =
          //      pos.y <= waterRef.current.waterLevel + 0.2 &&
          //      pos.y >= waterRef.current.waterLevel - 0.5
          //    // 🚶 VELOCIDADE REAL
          //    const speed = pos.distanceTo(lastPos.current)
          //    // ⏱️ COOLDOWN (evita spam infinito)
          //    rippleCooldown.current -= delta
          //    if (isNearSurface && speed > 0.02 && rippleCooldown.current <= 0) {
          //      // 💥 cria ripple
          //      waterRef.current.addRipple(pos.clone())
          //      // 🔥 controla frequência
          //      rippleCooldown.current = 0.15
          //    }
          //    // 🔥 SEMPRE atualiza posição (ESSENCIAL)
          //    lastPos.current.copy(pos)
          //  })
          //  return (
          //    <mesh ref={ref} position={[0, 1, 0]}>
          //      <boxGeometry args={[1, 2, 1]} />
          //      <meshStandardMaterial color="orange" />
          //    </mesh>
          //  )
          //}

  // 🔥 bounds dinâmico (volume da água baseado no plano)
  const size = waterRef.current?.size || 45 
  const waterLevel = waterRef.current?.waterLevel || 0

  const bounds = {
    min: { x: -size / 2, y: waterLevel - 5, z: -size / 2 },
    max: { x: size / 2, y: waterLevel, z: size / 2 }
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [10, 5, 10], fov: 55 }} shadows gl={{ depthTexture: true }}>
        <OrbitControls />

        {/* 💡 Luz ambiente */}
        <ambientLight intensity={0.6} />

        {/* ☀️ Luz principal (importante pra caustics depois) */}
        <directionalLight position={[5, 1, 5]} intensity={1} castShadow />

          {/* 🔥 AQUI */}
        <SceneEffects waterLevel={0} />

        {/* 🏖️ Fundo arenoso */}
        <mesh position={[0, -5, 0]} receiveShadow>
          <boxGeometry args={[50, 0.5, 50]} />
          <meshStandardMaterial color="#c2a575" roughness={0.8} />
        </mesh>

        {/* 📦 Cubo */}
        <mesh position={[2, 1, 2]}  rotation={[2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.5, 8.5, 4.5]} />
          <meshStandardMaterial color="#ff8844" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* ⚪ Esfera */}
        <mesh position={[-2, 1.2, -1]} castShadow>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial color="#44aa88" />
        </mesh>

        {/* 🌊 ÁGUA NOVA (PRO) */}
        <WaterSurfacePRO
          ref={waterRef}

          // 📏 TAMANHO DO PLANO
          size={45}
          waterLevel={0}

          // 🌊 FORÇA GERAL DAS ONDAS (quanto mais alto = mais agressivo)
          waveIntensity={4.2}

            // 🔥 NOVO → controle da velocidade do ripple
          rippleSpeed = {0.2}


          // ⏱️ velocidade das ondas
          waveSpeed={0.8}

          // 👁️ TRANSPARÊNCIA
          opacity={0.4} // menor = mais transparente

          // 🔍 REFRAÇÃO (distorção do que está atrás)
          refractionStrength={0.07}

          // ☀️ REFLEXO DO SKY
          reflectionStrength={0.4}

          // ✨ FRESNEL (brilho nas bordas)
          fresnelStrength={5.2}

          // 🎨 COR DA ÁGUA
          shallowColor="#5cb8d4" // raso
          deepColor="#0a3542"    // profundo

         

          // 🌊 CONTROLE AVANÇADO DE ONDA (se implementar depois no shader)
          waveAmplitude={5.3}   // altura da onda
          waveFrequency={5.0}   // quantidade de ondas
          waveScale={0.2}       // escala geral
        />

        

        {/* 🌊 Água antiga (mantida como fallback)
        <WaterPlane
          ref={waterRef} // 🔥 ESSENCIAL
          size={45}
          segments={256}
          waterLevel={0}
          waveHeight={0.55}
          waveSpeed={0.85}
          opacity={0.45}
          refractionStrength={0.03}
          reflectivity={0.4}
          shallowColor="#5cb8d4"
          deepColor="#0a3542"
        />
        */}

        {/* 🌊 Volume automático */}
       
        <WaterVolume bounds={bounds} />  

        {/* 🎥 Efeito subaquático */}
        <UnderwaterEffect
          bounds={bounds}
          distortionStrength={0.02}
          fogDensity={1.2}   // 🔥 aumenta = água mais densa
          colorShift={0.25}  // 🔥 mais azul
        />

        {/* ☀️ Caustics (luz na água) */}
        

        {/* 🧊 Vidro do aquário */}
        <WaterGlass
          size={size}
          waterLevel={waterLevel} 
          depth={5}
        />

      </Canvas>
    </div>
  )
}

export default App