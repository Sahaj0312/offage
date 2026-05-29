import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Agent as AgentData } from '../agents/types';
import type { DeskSlot } from './layout';
import { statusVisual } from '../lib/statusVisuals';
import { Monitor } from './Monitor';
import { StatusBubble } from './StatusBubble';
import { useStore } from '../store/useStore';

const TINTS = ['#e08a8a', '#8ab4e0', '#8ae0a8', '#e0c98a', '#c08ae0', '#8ae0d8'];

function tintFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** A full workstation: desk + chair + seated character + monitor + status. */
export function Agent({ data, slot }: { data: AgentData; slot: DeskSlot }) {
  const v = statusVisual(data.status);
  const tint = tintFor(data.id);
  const focused = useStore((s) => s.focusedAgentId === data.id);
  const torso = useRef<THREE.Group>(null);
  const t = useRef(0);
  const active = data.status === 'working' || data.status === 'thinking';

  useFrame((_, delta) => {
    t.current += delta;
    if (torso.current) {
      // subtle typing/lean animation while active
      const amt = active ? 1 : 0.15;
      torso.current.rotation.x = Math.sin(t.current * (active ? 6 : 1.5)) * 0.04 * amt;
    }
  });

  return (
    <group position={slot.position} rotation={[0, slot.rotation, 0]}>
      {/* Desk top */}
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.08, 1.1]} />
        <meshStandardMaterial color="#caa37a" />
      </mesh>
      {/* Desk legs */}
      {([
        [-1, -0.5],
        [1, -0.5],
        [-1, 0.5],
        [1, 0.5],
      ] as const).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} castShadow>
          <boxGeometry args={[0.08, 0.72, 0.08]} />
          <meshStandardMaterial color="#8a6e4e" />
        </mesh>
      ))}

      {/* Chair */}
      <group position={[0, 0, 0.7]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.5, 0.08, 0.5]} />
          <meshStandardMaterial color="#2c3340" />
        </mesh>
        <mesh position={[0, 0.85, 0.22]} castShadow>
          <boxGeometry args={[0.5, 0.6, 0.08]} />
          <meshStandardMaterial color="#2c3340" />
        </mesh>
      </group>

      {/* Seated character (placeholder primitives; swap for glTF later) */}
      <group ref={torso} position={[0, 0, 0.6]}>
        {/* hips */}
        <mesh position={[0, 0.62, 0]} castShadow>
          <boxGeometry args={[0.42, 0.3, 0.42]} />
          <meshStandardMaterial color="#33405a" />
        </mesh>
        {/* torso */}
        <mesh position={[0, 1.0, -0.02]} castShadow>
          <capsuleGeometry args={[0.24, 0.4, 6, 12]} />
          <meshStandardMaterial color={tint} />
        </mesh>
        {/* head */}
        <mesh position={[0, 1.5, -0.02]} castShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#e8c9a8" />
        </mesh>
        {/* arms reaching to desk */}
        {[-0.28, 0.28].map((x) => (
          <mesh key={x} position={[x, 1.0, -0.32]} rotation={[-0.8, 0, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.45, 4, 8]} />
            <meshStandardMaterial color={tint} />
          </mesh>
        ))}
      </group>

      <Monitor agent={data} />
      <StatusBubble status={data.status} />

      {/* Name label */}
      <Html position={[0, 2.0, 0.3]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            whiteSpace: 'nowrap',
            fontSize: 13,
            fontWeight: 600,
            color: '#e6edf6',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          {data.name}
        </div>
      </Html>

      {/* Focus ring on the floor when the player is near */}
      {focused && (
        <mesh position={[0, 0.03, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.7, 32]} />
          <meshBasicMaterial color={v.color} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
