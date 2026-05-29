import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { Agent as AgentData } from '../agents/types';
import type { DeskSlot } from './layout';
import { statusVisual } from '../lib/statusVisuals';
import { Monitor } from './Monitor';
import { StatusBubble } from './StatusBubble';
import { Character } from './Character';
import { useStore } from '../store/useStore';

// Friendly chair colors per desk, for a casual startup feel.
const CHAIR_COLORS = ['#3f8ad6', '#e0584f', '#46b68f', '#efb53e', '#9b5fd0', '#ef8a3e', '#566273'];
function chairColor(id: string) {
  let h = 5;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CHAIR_COLORS[h % CHAIR_COLORS.length];
}

/** A simple office chair (seat, back, post, 5-star base, armrests). */
function Chair({ color }: { color: string }) {
  return (
    <group position={[0, 0, 0.62]}>
      <RoundedBox args={[0.54, 0.12, 0.52]} radius={0.05} position={[0, 0.5, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[0.52, 0.66, 0.12]} radius={0.06} position={[0, 0.86, 0.24]} castShadow>
        <meshStandardMaterial color={color} roughness={0.7} />
      </RoundedBox>
      {[-0.31, 0.31].map((x) => (
        <RoundedBox key={x} args={[0.08, 0.06, 0.34]} radius={0.03} position={[x, 0.62, 0.02]} castShadow>
          <meshStandardMaterial color="#2b3038" roughness={0.6} />
        </RoundedBox>
      ))}
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.42, 12]} />
        <meshStandardMaterial color="#3a3f47" metalness={0.5} roughness={0.5} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.22, 0.06, Math.sin(a) * 0.22]} rotation={[0, -a, 0]} castShadow>
            <boxGeometry args={[0.36, 0.05, 0.06]} />
            <meshStandardMaterial color="#2b3038" metalness={0.5} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Desk clutter: keyboard, mouse, mug. */
function DeskProps() {
  return (
    <group>
      <RoundedBox args={[0.62, 0.03, 0.22]} radius={0.012} position={[0, 0.8, 0.18]} castShadow>
        <meshStandardMaterial color="#2b2f36" roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.1, 0.03, 0.15]} radius={0.012} position={[0.45, 0.8, 0.18]} castShadow>
        <meshStandardMaterial color="#2b2f36" roughness={0.5} />
      </RoundedBox>
      <group position={[-0.7, 0.81, 0.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.13, 14]} />
          <meshStandardMaterial color="#f0efe9" roughness={0.4} />
        </mesh>
        <mesh position={[0.07, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.04, 0.012, 8, 16]} />
          <meshStandardMaterial color="#f0efe9" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/** Clean floating "needs you" tag above the Manager when it wants attention. */
function AttentionTag() {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) ref.current.position.y = 2.95 + Math.sin(t.current * 3) * 0.04;
  });
  return (
    <group ref={ref} position={[0, 2.95, 0.2]}>
      <Billboard>
        <Html center distanceFactor={9} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              whiteSpace: 'nowrap',
              background: '#f4a431',
              color: '#3a2400',
              fontWeight: 800,
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 999,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              border: '1px solid #ffd07a',
            }}
          >
            🙋 needs you
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

/** A full workstation: desk + chair + seated worker + monitor + status. */
export function Agent({ data, slot }: { data: AgentData; slot: DeskSlot }) {
  const v = statusVisual(data.status);
  const focused = useStore((s) => s.focusedAgentId === data.id);
  const attention = useStore((s) => s.managerAttention) && data.kind === 'manager';
  const active = data.status === 'working' || data.status === 'thinking';
  const ring = useRef<THREE.Mesh>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (ring.current && focused) {
      const s = 1 + Math.sin(t.current * 3) * 0.04;
      ring.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={slot.position} rotation={[0, slot.rotation, 0]}>
      {/* Desk: light wood top on white panel legs */}
      <RoundedBox args={[2.3, 0.08, 1.15]} radius={0.03} position={[0, 0.76, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#c79a63" roughness={0.5} />
      </RoundedBox>
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} position={[x, 0.38, 0]} castShadow>
          <boxGeometry args={[0.07, 0.76, 1.0]} />
          <meshStandardMaterial color="#e8e6e0" roughness={0.5} metalness={0.1} />
        </mesh>
      ))}

      <Chair color={chairColor(data.id)} />
      <DeskProps />

      {/* Seated worker (Mii-style), sitting on the chair */}
      <group position={[0, 0, 0.5]}>
        <Character id={data.id} active={active} attention={attention} />
      </group>

      <Monitor agent={data} />
      {attention && <AttentionTag />}
      <StatusBubble status={data.status} />

      {/* Name + role label */}
      <Billboard position={[0, 2.3, 0.2]}>
        <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#26303d', textShadow: '0 1px 2px rgba(255,255,255,0.6)' }}>
              {data.name}
            </div>
            <div style={{ fontSize: 9, color: '#5a6675', textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>{data.role}</div>
          </div>
        </Html>
      </Billboard>

      {/* Subtle focus ring on the floor when the player is near */}
      {focused && (
        <mesh ref={ring} position={[0, 0.04, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.45, 1.6, 48]} />
          <meshStandardMaterial color={v.color} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
