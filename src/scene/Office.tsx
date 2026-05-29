import { RoundedBox, Sparkles } from '@react-three/drei';
import { ROOM_HALF, WALL_HEIGHT } from './layout';

const SIZE = ROOM_HALF * 2;

/** Leafy potted plant — startups love them. */
function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.32, 0.6, 18]} />
        <meshStandardMaterial color="#c9c2b6" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.06, 18]} />
        <meshStandardMaterial color="#3a2c1e" roughness={1} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.16, 0.95, Math.sin(a) * 0.16]}
            rotation={[0.5 * Math.cos(a), a, 0.5 * Math.sin(a)]}
            castShadow
          >
            <coneGeometry args={[0.13, 0.95, 5]} />
            <meshStandardMaterial color={i % 2 ? '#4f9d5e' : '#3f8a52'} flatShading roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

/** A lounge sofa for the breakout corner. */
function Sofa({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[2.4, 0.4, 0.9]} radius={0.1} position={[0, 0.35, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#5b6b7e" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[2.4, 0.6, 0.25]} radius={0.1} position={[0, 0.7, -0.33]} castShadow>
        <meshStandardMaterial color="#64748a" roughness={0.9} />
      </RoundedBox>
      {[-0.95, 0.95].map((x) => (
        <RoundedBox key={x} args={[0.25, 0.5, 0.9]} radius={0.08} position={[x, 0.6, 0]} castShadow>
          <meshStandardMaterial color="#64748a" roughness={0.9} />
        </RoundedBox>
      ))}
      {[-0.55, 0.55].map((x) => (
        <RoundedBox key={x} args={[1.0, 0.18, 0.8]} radius={0.06} position={[x, 0.62, 0.02]}>
          <meshStandardMaterial color="#7c8aa0" roughness={0.95} />
        </RoundedBox>
      ))}
    </group>
  );
}

export function Office() {
  return (
    <group>
      {/* Light wood floor (matte, realistic) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#c8a778" roughness={0.72} metalness={0} />
      </mesh>
      {/* plank seams */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-ROOM_HALF + 1 + i * 2, 0.004, 0]}>
          <planeGeometry args={[0.03, SIZE]} />
          <meshStandardMaterial color="#a98a5f" roughness={0.9} transparent opacity={0.5} />
        </mesh>
      ))}
      {/* breakout-area rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-9.5, 0.01, 9.5]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#b9aa92" roughness={1} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#f3f1ec" roughness={1} />
      </mesh>
      {/* soft recessed ceiling lights (gentle, not HDR) */}
      {[-8, 0, 8].map((z) =>
        [-7, 7].map((x) => (
          <mesh key={`${x}-${z}`} position={[x, WALL_HEIGHT - 0.04, z]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.6, 1.0]} />
            <meshStandardMaterial color="#ffffff" emissive={0xffffff} emissiveIntensity={0.5} />
          </mesh>
        )),
      )}

      {/* Three solid walls (warm white) */}
      {([
        { p: [0, WALL_HEIGHT / 2, ROOM_HALF], r: 0, color: '#eceae3' },
        { p: [-ROOM_HALF, WALL_HEIGHT / 2, 0], r: Math.PI / 2, color: '#e6e3db' },
        { p: [ROOM_HALF, WALL_HEIGHT / 2, 0], r: Math.PI / 2, color: '#b9745a' /* brick accent */ },
      ] as const).map((w, i) => (
        <mesh key={i} position={w.p as [number, number, number]} rotation={[0, w.r, 0]} receiveShadow>
          <boxGeometry args={[SIZE, WALL_HEIGHT, 0.3]} />
          <meshStandardMaterial color={w.color} roughness={0.95} />
        </mesh>
      ))}

      {/* Back wall = floor-to-ceiling windows with daylight */}
      <WindowWall />

      {/* Greenery */}
      <Plant position={[12, 0, 12]} scale={1.2} />
      <Plant position={[-12, 0, -12]} />
      <Plant position={[12.4, 0, -8]} scale={0.9} />
      <Plant position={[-7, 0, 12.5]} scale={1.1} />

      {/* Breakout lounge corner */}
      <Sofa position={[-10.5, 0, 9.5]} rotation={0.4} />
      <RoundedBox args={[1.1, 0.4, 0.7]} radius={0.05} position={[-8.8, 0.2, 10.2]} castShadow>
        <meshStandardMaterial color="#8a6a48" roughness={0.6} />
      </RoundedBox>

      {/* Water cooler */}
      <group position={[11.6, 0, 4]}>
        <RoundedBox args={[0.55, 1.0, 0.55]} radius={0.05} position={[0, 0.5, 0]} castShadow>
          <meshStandardMaterial color="#dfe3e6" roughness={0.5} />
        </RoundedBox>
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.46, 16]} />
          <meshStandardMaterial color="#9fd0ff" transparent opacity={0.55} roughness={0.2} />
        </mesh>
      </group>

      {/* very light dust in the sunbeams */}
      <Sparkles count={40} scale={[SIZE - 4, WALL_HEIGHT, SIZE - 4]} position={[0, WALL_HEIGHT / 2, 0]} size={1.5} speed={0.15} opacity={0.25} color="#ffffff" />
    </group>
  );
}

/** Floor-to-ceiling window wall (back) with mullions and bright daylight beyond. */
function WindowWall() {
  const z = -ROOM_HALF;
  const cols = 7;
  const colW = SIZE / cols;
  return (
    <group position={[0, 0, z]}>
      {/* bright sky beyond the glass (soft, not HDR) */}
      <mesh position={[0, WALL_HEIGHT / 2, -0.5]}>
        <planeGeometry args={[SIZE, WALL_HEIGHT * 1.2]} />
        <meshStandardMaterial color="#eaf3ff" emissive={0xdcebff} emissiveIntensity={0.7} />
      </mesh>
      {/* faint distant buildings for depth */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[-ROOM_HALF + 2 + i * 3, 1.6 + (i % 3) * 0.6, -1.2]}>
          <boxGeometry args={[1.8, 3.2 + (i % 3) * 1.2, 0.3]} />
          <meshStandardMaterial color="#c4d2e0" roughness={1} />
        </mesh>
      ))}
      {/* glass */}
      <mesh position={[0, WALL_HEIGHT / 2, 0]}>
        <planeGeometry args={[SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial color="#cfe2f5" transparent opacity={0.12} roughness={0.05} metalness={0.1} />
      </mesh>
      {/* frame: vertical mullions */}
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <mesh key={`v${i}`} position={[-ROOM_HALF + i * colW, WALL_HEIGHT / 2, 0.04]} castShadow>
          <boxGeometry args={[0.1, WALL_HEIGHT, 0.1]} />
          <meshStandardMaterial color="#3b3f44" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
      {/* frame: horizontal rails */}
      {[0.05, WALL_HEIGHT * 0.5, WALL_HEIGHT - 0.05].map((y, i) => (
        <mesh key={`h${i}`} position={[0, y, 0.04]} castShadow>
          <boxGeometry args={[SIZE, 0.12, 0.1]} />
          <meshStandardMaterial color="#3b3f44" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
