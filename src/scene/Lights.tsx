import { Environment, Lightformer, SoftShadows } from '@react-three/drei';

/**
 * Moody "late-night office" lighting. A cool key + warm fill + two neon accent
 * lights, soft shadows, and an image-based Environment built from in-scene
 * Lightformers (no external HDR download — works offline) so the glossy floor and
 * monitors pick up rich reflections.
 */
export function Lights() {
  return (
    <>
      <SoftShadows size={28} samples={12} focus={0.9} />

      {/* low ambient base so shadows stay rich */}
      <ambientLight intensity={0.18} />
      <hemisphereLight args={[0x9fc0ff, 0x0a0e16, 0.35]} />

      {/* cool key light from high front-left, casts the shadows */}
      <directionalLight
        position={[8, 16, 10]}
        intensity={1.4}
        color={0xcfe2ff}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0003}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />
      {/* warm fill from the opposite side */}
      <directionalLight position={[-12, 8, -8]} intensity={0.4} color={0xffb070} />

      {/* neon accent pools (these don't bloom themselves; the emissive strips do) */}
      <pointLight position={[-11, 3, -11]} intensity={40} distance={22} color={0x5fb0ff} />
      <pointLight position={[11, 3, 11]} intensity={36} distance={22} color={0xc08bff} />

      <Environment resolution={256} frames={1} background={false}>
        {/* bright soft ceiling = top reflections on floor/monitors */}
        <Lightformer intensity={2.4} form="rect" position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[18, 18, 1]} color="#aec6ff" />
        {/* cool + warm side cards */}
        <Lightformer intensity={2} form="rect" position={[-10, 4, 0]} rotation={[0, Math.PI / 2, 0]} scale={[12, 6, 1]} color="#3a6cff" />
        <Lightformer intensity={1.6} form="rect" position={[10, 4, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[12, 6, 1]} color="#ff8a5c" />
        <Lightformer intensity={1.4} form="rect" position={[0, 3, -12]} rotation={[0, 0, 0]} scale={[16, 5, 1]} color="#7fa0ff" />
      </Environment>
    </>
  );
}
