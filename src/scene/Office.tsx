import { Html, RoundedBox, Sparkles } from '@react-three/drei';
import { ROOM_HALF, WALL_HEIGHT } from './layout';

const SIZE = ROOM_HALF * 2;

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#b07a4e" roughness={0.8} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[Math.cos((i / 5) * Math.PI * 2) * 0.18, 0.95, Math.sin((i / 5) * Math.PI * 2) * 0.18]}
          rotation={[0.4 * Math.cos(i), i, 0.4 * Math.sin(i)]}
          castShadow
        >
          <coneGeometry args={[0.16, 0.9, 6]} />
          <meshStandardMaterial color="#3f9f6a" flatShading roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** A thin emissive neon strip (HDR → blooms). */
function Neon({
  position,
  rotation = [0, 0, 0],
  length = 6,
  color = '#5fb0ff',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  length?: number;
  color?: string;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[length, 0.08, 0.08]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
    </mesh>
  );
}

export function Office() {
  return (
    <group>
      {/* Glossy floor — cheap: reflects the Environment via metalness (no per-frame
          reflection render). Reads as polished dark concrete catching the neon. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#0b0f18" metalness={0.7} roughness={0.42} envMapIntensity={0.9} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#0c111b" roughness={1} />
      </mesh>

      {/* Walls */}
      {([
        { p: [0, WALL_HEIGHT / 2, -ROOM_HALF], r: 0 },
        { p: [0, WALL_HEIGHT / 2, ROOM_HALF], r: 0 },
        { p: [-ROOM_HALF, WALL_HEIGHT / 2, 0], r: Math.PI / 2 },
        { p: [ROOM_HALF, WALL_HEIGHT / 2, 0], r: Math.PI / 2 },
      ] as const).map((w, i) => (
        <mesh key={i} position={w.p as [number, number, number]} rotation={[0, w.r, 0]} receiveShadow>
          <boxGeometry args={[SIZE, WALL_HEIGHT, 0.3]} />
          <meshStandardMaterial color="#171d2b" roughness={0.9} metalness={0.1} />
        </mesh>
      ))}

      {/* Recessed ceiling light panels (HDR → soft bloom) */}
      {[-8, 0, 8].map((z) =>
        [-7, 7].map((x) => (
          <mesh key={`${x}-${z}`} position={[x, WALL_HEIGHT - 0.06, z]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.2, 1.3]} />
            <meshStandardMaterial color="#dfe9ff" emissive={0xcfe0ff} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        )),
      )}

      {/* Neon trim: cool along the back, magenta accent on the sides */}
      <Neon position={[0, WALL_HEIGHT - 0.4, -ROOM_HALF + 0.2]} length={SIZE - 2} color="#5fb0ff" />
      <Neon position={[-ROOM_HALF + 0.2, 0.06, 0]} rotation={[0, Math.PI / 2, 0]} length={SIZE - 2} color="#c08bff" />
      <Neon position={[ROOM_HALF - 0.2, 0.06, 0]} rotation={[0, Math.PI / 2, 0]} length={SIZE - 2} color="#5fb0ff" />

      {/* Glowing OFFAGE wordmark on the back wall */}
      <Html
        transform
        position={[0, WALL_HEIGHT - 1.2, -ROOM_HALF + 0.25]}
        distanceFactor={6}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 64,
            letterSpacing: 14,
            color: '#bfe2ff',
            textShadow: '0 0 18px #4aa6ff, 0 0 40px #2a7fff',
            whiteSpace: 'nowrap',
          }}
        >
          OFFAGE
        </div>
      </Html>
      {/* a glowing underline bar so the sign still blooms in 3D */}
      <mesh position={[0, WALL_HEIGHT - 1.7, -ROOM_HALF + 0.22]}>
        <boxGeometry args={[5, 0.05, 0.05]} />
        <meshStandardMaterial color="#4aa6ff" emissive={0x4aa6ff} emissiveIntensity={3} toneMapped={false} />
      </mesh>

      {/* Night-skyline window backdrop behind the back wall */}
      <Skyline />

      {/* Glass meeting room (back-left) */}
      <mesh position={[-9.5, WALL_HEIGHT / 2, -9.5]} castShadow>
        <boxGeometry args={[0.06, WALL_HEIGHT, 8]} />
        <meshPhysicalMaterial color="#9fd0ff" transparent opacity={0.12} roughness={0.05} metalness={0} transmission={0.6} />
      </mesh>
      <mesh position={[-9.5, WALL_HEIGHT / 2, -9.5]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[0.06, WALL_HEIGHT, 8]} />
        <meshPhysicalMaterial color="#9fd0ff" transparent opacity={0.12} roughness={0.05} metalness={0} transmission={0.6} />
      </mesh>

      {/* Rug under the desk pods to warm the space */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 1]} receiveShadow>
        <planeGeometry args={[20, 24]} />
        <meshStandardMaterial color="#141a28" roughness={1} />
      </mesh>

      {/* Props */}
      <Plant position={[12, 0, 12]} />
      <Plant position={[-12, 0, 12]} />
      <Plant position={[12, 0, -12]} />
      <group position={[11.5, 0, 0]}>
        <RoundedBox args={[0.6, 1.1, 0.6]} radius={0.06} position={[0, 0.55, 0]} castShadow>
          <meshStandardMaterial color="#dfe7f2" roughness={0.5} />
        </RoundedBox>
        <mesh position={[0, 1.32, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.5, 16]} />
          <meshPhysicalMaterial color="#7fc6ff" transparent opacity={0.5} roughness={0.1} transmission={0.5} />
        </mesh>
      </group>

      {/* Floating dust motes catching the light (cheap point sprites) */}
      <Sparkles count={50} scale={[SIZE - 2, WALL_HEIGHT, SIZE - 2]} position={[0, WALL_HEIGHT / 2, 0]} size={2} speed={0.25} opacity={0.5} color="#bcd2ff" />
    </group>
  );
}

/** A simple emissive city skyline seen "through" the back wall. */
function Skyline() {
  const buildings = [];
  let x = -ROOM_HALF + 1;
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  while (x < ROOM_HALF - 1) {
    const w = 0.8 + rand() * 1.4;
    const h = 1.5 + rand() * 5;
    buildings.push({ x: x + w / 2, w, h, lit: rand() > 0.4 });
    x += w + 0.2 + rand() * 0.4;
  }
  return (
    <group position={[0, 0, -ROOM_HALF - 3]}>
      {/* sky gradient backdrop */}
      <mesh position={[0, WALL_HEIGHT, 0]}>
        <planeGeometry args={[SIZE * 2.4, WALL_HEIGHT * 4]} />
        <meshBasicMaterial color="#0a1430" />
      </mesh>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, 0]}>
          <boxGeometry args={[b.w, b.h, 0.4]} />
          <meshStandardMaterial
            color="#0e1830"
            emissive={b.lit ? 0x2a3f70 : 0x101830}
            emissiveIntensity={b.lit ? 0.8 : 0.2}
          />
        </mesh>
      ))}
    </group>
  );
}
