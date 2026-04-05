import { useThree } from '@react-three/fiber'
import { CausticsLight } from './CausticsLight'

export function SceneEffects({ waterLevel }) {
  const { scene } = useThree()

  return (
    <>
      <CausticsLight scene={scene} waterLevel={waterLevel} />
    </>
  )
}