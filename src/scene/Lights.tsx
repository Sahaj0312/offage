import { Environment, Lightformer } from '@react-three/drei';
import { ROOM_HALF, WALL_HEIGHT } from './layout';

/**
 * Bright, natural daytime lighting for an open-plan office — soft and neutral, no
 * neon. A sky/ground hemisphere + ambient base, one warm "sun" through the window
 * wall casting soft shadows, and a gentle fill. An Environment built from neutral
 * white Lightformers (no external HDR download) gives materials soft realistic
 * highlights. Lightweight: two directionals + ambient + hemisphere.
 */
export function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <hemisphereLight args={[0xdCEBFF, 0xb8ad98, 0.7]} />

      {/* sun coming through the window wall (back), warm, soft shadows */}
      <directionalLight
        position={[6, 14, -12]}
        intensity={2.1}
        color={0xfff2e0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0004}
        shadow-radius={4}
        shadow-camera-left={-ROOM_HALF}
        shadow-camera-right={ROOM_HALF}
        shadow-camera-top={ROOM_HALF}
        shadow-camera-bottom={-ROOM_HALF}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />
      {/* soft sky fill from above-front so nothing is muddy */}
      <directionalLight position={[-8, 12, 10]} intensity={0.5} color={0xeaf2ff} />

      <Environment resolution={128} frames={1} background={false}>
        <Lightformer intensity={1.6} form="rect" position={[0, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[22, 22, 1]} color="#ffffff" />
        <Lightformer intensity={2} form="rect" position={[0, 4, -ROOM_HALF]} rotation={[0, 0, 0]} scale={[22, 8, 1]} color="#eaf3ff" />
        <Lightformer intensity={0.8} form="rect" position={[ROOM_HALF, 4, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[16, 8, 1]} color="#fff4e8" />
      </Environment>
    </>
  );
}
