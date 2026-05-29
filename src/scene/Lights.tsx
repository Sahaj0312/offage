import { Environment, Lightformer } from '@react-three/drei';

/**
 * Lightweight "late-night office" lighting tuned to run on integrated GPUs:
 * just an ambient base, a hemisphere tint, one shadow-casting key, and one cheap
 * fill — no per-desk point lights (the glow comes from emissive materials + bloom)
 * and no PCSS soft shadows. An image-based Environment built from in-scene
 * Lightformers (no external HDR download) gives the floor/props their sheen.
 */
export function Lights() {
  return (
    <>
      {/* brighter ambient base so workers read without extra dynamic lights */}
      <ambientLight intensity={0.45} />
      <hemisphereLight args={[0x9fc0ff, 0x0a0e16, 0.5]} />

      {/* single shadow-casting key (1024 map — cheap) */}
      <directionalLight
        position={[8, 16, 10]}
        intensity={1.5}
        color={0xcfe2ff}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0004}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={50}
      />
      {/* warm fill from the opposite side (no shadow) */}
      <directionalLight position={[-12, 8, -8]} intensity={0.5} color={0xffb070} />

      <Environment resolution={128} frames={1} background={false}>
        <Lightformer intensity={2.2} form="rect" position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[18, 18, 1]} color="#aec6ff" />
        <Lightformer intensity={1.8} form="rect" position={[-10, 4, 0]} rotation={[0, Math.PI / 2, 0]} scale={[12, 6, 1]} color="#3a6cff" />
        <Lightformer intensity={1.4} form="rect" position={[10, 4, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[12, 6, 1]} color="#ff8a5c" />
        <Lightformer intensity={1.2} form="rect" position={[0, 3, -12]} rotation={[0, 0, 0]} scale={[16, 5, 1]} color="#7fa0ff" />
      </Environment>
    </>
  );
}
