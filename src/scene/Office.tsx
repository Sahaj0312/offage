import { ROOM_HALF, WALL_HEIGHT } from './layout';

const SIZE = ROOM_HALF * 2;

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.5, 12]} />
        <meshStandardMaterial color="#caa37a" />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#3f8f5a" flatShading />
      </mesh>
    </group>
  );
}

export function Office() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#2a3245" />
      </mesh>
      {/* Subtle floor grid accent */}
      <gridHelper args={[SIZE, SIZE / 2, 0x3a4560, 0x323b52]} position={[0, 0.02, 0]} />

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#161b27" />
      </mesh>

      {/* Walls (4) */}
      {([
        { p: [0, WALL_HEIGHT / 2, -ROOM_HALF], r: 0 },
        { p: [0, WALL_HEIGHT / 2, ROOM_HALF], r: 0 },
        { p: [-ROOM_HALF, WALL_HEIGHT / 2, 0], r: Math.PI / 2 },
        { p: [ROOM_HALF, WALL_HEIGHT / 2, 0], r: Math.PI / 2 },
      ] as const).map((w, i) => (
        <mesh key={i} position={w.p as [number, number, number]} rotation={[0, w.r, 0]} receiveShadow>
          <boxGeometry args={[SIZE, WALL_HEIGHT, 0.3]} />
          <meshStandardMaterial color="#39435c" />
        </mesh>
      ))}

      {/* Ceiling light panels */}
      {[-8, 0, 8].map((z) =>
        [-7, 7].map((x) => (
          <mesh key={`${x}-${z}`} position={[x, WALL_HEIGHT - 0.05, z]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3, 1.2]} />
            <meshStandardMaterial color="#dfe9ff" emissive={0xbcd2ff} emissiveIntensity={0.8} />
          </mesh>
        )),
      )}

      {/* Glass meeting room in the back-left corner (two transparent panes) */}
      <mesh position={[-9.5, WALL_HEIGHT / 2, -9.5]} castShadow>
        <boxGeometry args={[0.1, WALL_HEIGHT, 8]} />
        <meshPhysicalMaterial color="#9fd0ff" transparent opacity={0.16} roughness={0} metalness={0} />
      </mesh>
      <mesh position={[-9.5, WALL_HEIGHT / 2, -9.5]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[0.1, WALL_HEIGHT, 8]} />
        <meshPhysicalMaterial color="#9fd0ff" transparent opacity={0.16} roughness={0} metalness={0} />
      </mesh>

      {/* Props */}
      <Plant position={[12, 0, 12]} />
      <Plant position={[-12, 0, 12]} />
      <Plant position={[12, 0, -12]} />
      {/* Water cooler */}
      <group position={[11.5, 0, 0]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.6, 1.1, 0.6]} />
          <meshStandardMaterial color="#dfe7f2" />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.5, 12]} />
          <meshPhysicalMaterial color="#7fc6ff" transparent opacity={0.5} />
        </mesh>
      </group>
    </group>
  );
}
