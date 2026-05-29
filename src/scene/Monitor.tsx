import { Html } from '@react-three/drei';
import type { Agent } from '../agents/types';
import { statusVisual } from '../lib/statusVisuals';

/**
 * The physical monitor + a live screen showing the agent's recent output.
 * Local orientation: screen faces +z (toward the approaching player / over the
 * seated character's shoulder).
 */
export function Monitor({ agent }: { agent: Agent }) {
  const v = statusVisual(agent.status);
  const lastLines = agent.output.slice(-6);

  return (
    <group position={[0, 0.74, -0.45]}>
      {/* stand */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.16, 0.1, 0.16]} />
        <meshStandardMaterial color="#20262f" />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.06, 0.4, 0.06]} />
        <meshStandardMaterial color="#20262f" />
      </mesh>
      {/* bezel */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[1.18, 0.72, 0.06]} />
        <meshStandardMaterial color="#11151c" />
      </mesh>
      {/* screen glow plane */}
      <mesh position={[0, 0.62, 0.035]}>
        <planeGeometry args={[1.06, 0.6]} />
        <meshStandardMaterial color="#05080d" emissive={v.glow} emissiveIntensity={0.25} />
      </mesh>
      {/* live text via Html, mapped onto the screen face */}
      <Html
        transform
        position={[0, 0.62, 0.04]}
        distanceFactor={1.1}
        occlude
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            width: 250,
            height: 140,
            background: '#05080d',
            border: `1px solid ${v.color}55`,
            borderRadius: 4,
            padding: '8px 10px',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            lineHeight: 1.5,
            color: '#9fd0a8',
            overflow: 'hidden',
            boxShadow: `inset 0 0 30px ${v.color}22`,
          }}
        >
          <div style={{ color: v.color, fontWeight: 700, marginBottom: 4 }}>
            {agent.name} — {v.label}
          </div>
          {lastLines.length === 0 ? (
            <div style={{ color: '#3a4560' }}>idle…</div>
          ) : (
            lastLines.map((l, i) => (
              <div key={i} style={{ opacity: 0.5 + (0.5 * (i + 1)) / lastLines.length }}>
                {l}
              </div>
            ))
          )}
        </div>
      </Html>
    </group>
  );
}
