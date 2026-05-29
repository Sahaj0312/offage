import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentStatus } from '../agents/types';
import { statusVisual } from '../lib/statusVisuals';

/**
 * Floating status indicator above the agent's head: an HDR emissive disc (so it
 * blooms) with the status glyph, bobbing and pulsing while active.
 */
export function StatusBubble({ status }: { status: AgentStatus }) {
  const v = statusVisual(status);
  const group = useRef<THREE.Group>(null);
  const disc = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const animated = status === 'thinking' || status === 'working';

  useFrame((_, delta) => {
    t.current += delta;
    if (group.current) group.current.position.y = 2.55 + Math.sin(t.current * 2) * 0.05;
    if (disc.current) {
      const pulse = animated ? 1 + Math.sin(t.current * 5) * 0.12 : 1;
      disc.current.scale.setScalar(pulse);
      (disc.current.material as THREE.MeshStandardMaterial).emissiveIntensity = animated
        ? 2 + Math.sin(t.current * 5) * 0.8
        : 1.6;
    }
  });

  return (
    <group ref={group} position={[0, 2.55, 0.2]}>
      <Billboard>
        {/* glowing disc (HDR → blooms) */}
        <mesh ref={disc}>
          <circleGeometry args={[0.17, 32]} />
          <meshStandardMaterial color={v.color} emissive={v.glow} emissiveIntensity={2} toneMapped={false} />
        </mesh>
        {/* thin dark ring for contrast */}
        <mesh position={[0, 0, -0.001]}>
          <ringGeometry args={[0.17, 0.2, 32]} />
          <meshBasicMaterial color="#05070c" />
        </mesh>
        {/* glyph */}
        <Html center distanceFactor={7} position={[0, 0, 0.01]} style={{ pointerEvents: 'none' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#05080d', lineHeight: 1 }}>{v.icon}</div>
        </Html>
      </Billboard>
    </group>
  );
}
