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

/** A pulsing amber beacon + light above the head when the Manager needs you. */
function AttentionBeacon() {
  const bulb = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    const f = (Math.sin(t.current * 6) + 1) / 2; // fast 0..1 flash
    if (bulb.current) {
      (bulb.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1 + f * 5;
      bulb.current.scale.setScalar(0.85 + f * 0.5);
    }
    if (light.current) light.current.intensity = f * 14;
  });
  return (
    <group position={[0, 2.95, 0.1]}>
      <mesh ref={bulb}>
        <sphereGeometry args={[0.14, 20, 20]} />
        <meshStandardMaterial color="#ffe08a" emissive={0xffb300} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <pointLight ref={light} color={0xffb300} distance={8} intensity={6} />
    </group>
  );
}

/** A stylized office chair (seat, back, post, 5-star base, armrests). */
function Chair() {
  return (
    <group position={[0, 0, 0.62]}>
      <RoundedBox args={[0.54, 0.12, 0.52]} radius={0.05} position={[0, 0.5, 0]} castShadow>
        <meshStandardMaterial color="#23293a" roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.52, 0.66, 0.12]} radius={0.06} position={[0, 0.86, 0.24]} castShadow>
        <meshStandardMaterial color="#23293a" roughness={0.6} />
      </RoundedBox>
      {[-0.31, 0.31].map((x) => (
        <RoundedBox key={x} args={[0.08, 0.06, 0.34]} radius={0.03} position={[x, 0.62, 0.02]} castShadow>
          <meshStandardMaterial color="#1b2030" roughness={0.6} />
        </RoundedBox>
      ))}
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.42, 12]} />
        <meshStandardMaterial color="#15181f" metalness={0.6} roughness={0.4} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.22, 0.06, Math.sin(a) * 0.22]} rotation={[0, -a, 0]} castShadow>
            <boxGeometry args={[0.36, 0.05, 0.06]} />
            <meshStandardMaterial color="#15181f" metalness={0.6} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Desk clutter: keyboard, mouse, mug. */
function DeskProps({ tint }: { tint: string }) {
  return (
    <group>
      <RoundedBox args={[0.62, 0.03, 0.22]} radius={0.012} position={[0, 0.78, 0.18]} castShadow>
        <meshStandardMaterial color="#1b1f29" roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.1, 0.03, 0.15]} radius={0.012} position={[0.45, 0.78, 0.18]} castShadow>
        <meshStandardMaterial color="#1b1f29" roughness={0.5} />
      </RoundedBox>
      {/* mug with a status-tinted rim */}
      <group position={[-0.7, 0.79, 0.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.13, 14]} />
          <meshStandardMaterial color={tint} roughness={0.5} />
        </mesh>
        <mesh position={[0.07, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.04, 0.012, 8, 16]} />
          <meshStandardMaterial color={tint} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/** A full workstation: desk + chair + seated character + monitor + status. */
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
      {/* Desk: rounded top on a panel base */}
      <RoundedBox args={[2.3, 0.1, 1.15]} radius={0.04} position={[0, 0.74, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#3a2f26" roughness={0.45} metalness={0.1} />
      </RoundedBox>
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} position={[x, 0.36, 0]} castShadow>
          <boxGeometry args={[0.08, 0.72, 1.0]} />
          <meshStandardMaterial color="#26201a" roughness={0.6} />
        </mesh>
      ))}
      {/* status-tinted under-desk glow strip */}
      <mesh position={[0, 0.69, 0.56]}>
        <boxGeometry args={[2.1, 0.02, 0.02]} />
        <meshStandardMaterial color={v.color} emissive={v.glow} emissiveIntensity={v.intensity * 2.5} toneMapped={false} />
      </mesh>

      <Chair />
      <DeskProps tint={v.color} />

      {/* Seated worker */}
      <group position={[0, 0, 0.52]}>
        <Character id={data.id} active={active} attention={attention} />
      </group>

      <Monitor agent={data} />
      {attention && <AttentionBeacon />}
      <StatusBubble status={data.status} />

      {/* Name + role label */}
      <Billboard position={[0, 2.25, 0.3]}>
        <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#eaf1fb', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              {data.name}
            </div>
            <div style={{ fontSize: 9, color: v.color, textShadow: '0 1px 3px rgba(0,0,0,0.9)', letterSpacing: 0.3 }}>
              {data.role}
            </div>
          </div>
        </Html>
      </Billboard>

      {/* Glowing focus ring on the floor when the player is near */}
      {focused && (
        <mesh ref={ring} position={[0, 0.03, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.45, 1.62, 48]} />
          <meshStandardMaterial color={v.color} emissive={v.glow} emissiveIntensity={2.5} toneMapped={false} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
