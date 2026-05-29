import { Html, RoundedBox } from '@react-three/drei';
import type { Agent } from '../agents/types';
import { statusVisual } from '../lib/statusVisuals';

/**
 * A normal desktop monitor showing the agent's recent output. Realistic (no neon
 * glow): a matte bezel and a lit-but-not-blooming screen with the live log text.
 */
export function Monitor({ agent }: { agent: Agent }) {
  const v = statusVisual(agent.status);
  const lastLines = agent.output.slice(-7);

  return (
    <group position={[0, 0.8, -0.42]}>
      {/* stand */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.03, 16]} />
        <meshStandardMaterial color="#2a2e35" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.26, 0]} castShadow>
        <boxGeometry args={[0.06, 0.42, 0.05]} />
        <meshStandardMaterial color="#2a2e35" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* bezel */}
      <RoundedBox args={[1.24, 0.76, 0.05]} radius={0.02} position={[0, 0.64, 0]} castShadow>
        <meshStandardMaterial color="#26282d" roughness={0.5} metalness={0.2} />
      </RoundedBox>
      {/* screen surface (gently lit, not HDR) */}
      <mesh position={[0, 0.64, 0.028]}>
        <planeGeometry args={[1.14, 0.66]} />
        <meshStandardMaterial color="#0d1320" emissive={0x0d1320} emissiveIntensity={0.6} roughness={0.3} />
      </mesh>

      {/* live text mapped onto the screen */}
      <Html transform position={[0, 0.64, 0.032]} distanceFactor={1.1} occlude style={{ pointerEvents: 'none' }}>
        <div
          style={{
            width: 252,
            height: 146,
            background: '#0d1320',
            borderRadius: 3,
            padding: '8px 10px',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            lineHeight: 1.5,
            color: '#9fd0a8',
            overflow: 'hidden',
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
