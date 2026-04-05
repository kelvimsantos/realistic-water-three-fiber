export const TestCube = () => {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[1,1,1]} />
      <meshStandardMaterial color="red" />
    </mesh>
  )
}