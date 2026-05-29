export function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={[0xbcd2ff, 0x202838, 0.6]} />
      <directionalLight
        position={[10, 18, 8]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={50}
      />
      {/* soft fill from the opposite side */}
      <directionalLight position={[-12, 10, -10]} intensity={0.35} />
    </>
  );
}
