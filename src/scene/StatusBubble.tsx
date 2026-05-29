import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentStatus } from '../agents/types';
import { statusVisual } from '../lib/statusVisuals';

/**
 * A clean, modern status pill floating above the worker — a colored dot + label,
 * like a UI badge. No neon/bloom; reads as part of a real product's HUD.
 */
export function StatusBubble({ status }: { status: AgentStatus }) {
  const v = statusVisual(status);
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  const animated = status === 'thinking' || status === 'working';

  useFrame((_, dt) => {
    t.current += dt;
    if (group.current) group.current.position.y = 2.62 + Math.sin(t.current * 2) * 0.04;
  });

  return (
    <group ref={group} position={[0, 2.62, 0.2]}>
      <Billboard>
        <Html center distanceFactor={9} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              background: 'rgba(255,255,255,0.92)',
              color: '#26303d',
              fontWeight: 700,
              fontSize: 11,
              padding: '3px 9px 3px 7px',
              borderRadius: 999,
              boxShadow: '0 3px 10px rgba(0,0,0,0.18)',
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: v.color,
                boxShadow: animated ? `0 0 0 0 ${v.color}` : 'none',
                animation: animated ? 'sbpulse 1.2s ease-out infinite' : 'none',
              }}
            />
            {v.label}
          </div>
          <style>{`@keyframes sbpulse{0%{box-shadow:0 0 0 0 ${v.color}99}70%{box-shadow:0 0 0 7px ${v.color}00}100%{box-shadow:0 0 0 0 ${v.color}00}}`}</style>
        </Html>
      </Billboard>
    </group>
  );
}
