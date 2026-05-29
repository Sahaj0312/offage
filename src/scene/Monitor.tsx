import { Html, RoundedBox } from '@react-three/drei';
import type { Agent } from '../agents/types';
import { statusVisual } from '../lib/statusVisuals';

/**
 * The physical monitor + a live screen showing the agent's recent output. The
 * screen and a thin rim are status-tinted and HDR (toneMapped=false) so they
 * bloom, and a small point light spills the screen glow onto the desk + face.
 */
export function Monitor({ agent }: { agent: Agent }) {
  const v = statusVisual(agent.status);
  const lastLines = agent.output.slice(-7);

  return (
    <group position={[0, 0.79, -0.42]}>
      {/* stand */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.03, 16]} />
        <meshStandardMaterial color="#15181f" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.26, 0]} castShadow>
        <boxGeometry args={[0.06, 0.42, 0.05]} />
        <meshStandardMaterial color="#1b1f29" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* bezel */}
      <RoundedBox args={[1.24, 0.76, 0.05]} radius={0.025} position={[0, 0.64, 0]} castShadow>
        <meshStandardMaterial color="#0c0f15" roughness={0.4} metalness={0.3} />
      </RoundedBox>
      {/* glowing status rim (HDR → blooms) */}
      <mesh position={[0, 0.64, 0.027]}>
        <planeGeometry args={[1.2, 0.72]} />
        <meshStandardMaterial color={v.color} emissive={v.glow} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* screen base */}
      <mesh position={[0, 0.64, 0.03]}>
        <planeGeometry args={[1.12, 0.64]} />
        <meshStandardMaterial color="#05080d" emissive={v.glow} emissiveIntensity={0.4} toneMapped={false} />
      </mesh>

      {/* live text mapped onto the screen */}
      <Html transform position={[0, 0.64, 0.035]} distanceFactor={1.1} occlude style={{ pointerEvents: 'none' }}>
        <div
          style={{
            width: 250,
            height: 142,
            background: 'linear-gradient(160deg, #060a11, #0a0f1a)',
            border: `1px solid ${v.color}66`,
            borderRadius: 5,
            padding: '8px 10px',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            lineHeight: 1.5,
            color: '#9fd0a8',
            overflow: 'hidden',
            boxShadow: `inset 0 0 28px ${v.color}33`,
          }}
        >
          <div style={{ color: v.color, fontWeight: 700, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>{agent.name}</span>
            <span>{v.label}</span>
          </div>
          {lastLines.length === 0 ? (
            <div style={{ color: '#3a4560' }}>idle…</div>
          ) : (
            lastLines.map((l, i) => (
              <div key={i} style={{ opacity: 0.45 + (0.55 * (i + 1)) / lastLines.length, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {l}
              </div>
            ))
          )}
        </div>
      </Html>
    </group>
  );
}
