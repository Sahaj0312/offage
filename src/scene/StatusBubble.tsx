import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentStatus } from '../agents/types';
import { statusVisual } from '../lib/statusVisuals';

/** Floating billboard above the agent's head, pulsing with their status. */
export function StatusBubble({ status }: { status: AgentStatus }) {
  const v = statusVisual(status);
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (ref.current) {
      const bob = Math.sin(t.current * 2) * 0.05;
      ref.current.position.y = 2.35 + bob;
    }
  });

  const animated = status === 'thinking' || status === 'working';

  return (
    <group ref={ref} position={[0, 2.35, 0.3]}>
      <Html center distanceFactor={6} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: v.color,
            color: '#05080d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 800,
            boxShadow: `0 0 16px ${v.color}, 0 0 4px ${v.color}`,
            animation: animated ? 'pulse 1.1s ease-in-out infinite' : 'none',
          }}
        >
          {v.icon}
        </div>
        <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.18);opacity:0.85} }`}</style>
      </Html>
    </group>
  );
}
