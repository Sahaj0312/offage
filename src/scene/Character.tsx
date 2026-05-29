import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// Distinct stylized looks, chosen deterministically per agent id.
const SHIRTS = ['#e8736b', '#5b9be8', '#54c98a', '#e8b84b', '#b07be8', '#3fc9c2'];
const SKINS = ['#f1c8a6', '#e0a880', '#c98a5e', '#a86a44'];
const HAIRS = ['#2b2824', '#3a2a1c', '#1c1c22', '#5a3a26', '#6e6e78', '#caa15a'];

function pick<T>(arr: T[], id: string, salt: number): T {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

export interface CharacterProps {
  id: string;
  /** working/thinking → typing + livelier; else calm idle */
  active: boolean;
  /** raise + wave the right arm (Manager asking for attention) */
  attention?: boolean;
}

/**
 * A stylized low-poly office worker, seated, built from rounded primitives and
 * animated procedurally — breathing, idle sway, head glances, and fast typing
 * taps when active. No external rig needed; reads great under bloom + soft light.
 */
export function Character({ id, active, attention }: CharacterProps) {
  const shirt = pick(SHIRTS, id, 1);
  const skin = pick(SKINS, id, 7);
  const hair = pick(HAIRS, id, 13);
  const hairStyle = (() => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) >>> 0;
    return h % 3; // 0 short, 1 cap, 2 tall
  })();

  const upper = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lHand = useRef<THREE.Group>(null);
  const rHand = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  const t = useRef(Math.random() * 10);

  useFrame((_, delta) => {
    t.current += delta;
    const time = t.current;

    // breathing — subtle vertical + scale on the upper body
    if (upper.current) {
      const breath = Math.sin(time * (active ? 2.2 : 1.3)) * 0.012;
      upper.current.position.y = breath;
      upper.current.rotation.z = Math.sin(time * 0.7) * (active ? 0.012 : 0.03);
      upper.current.rotation.x = active ? 0.06 + Math.sin(time * 5) * 0.015 : Math.sin(time * 0.9) * 0.02;
    }
    // head — occasional slow glances, small bob
    if (head.current) {
      head.current.rotation.y = Math.sin(time * 0.4) * 0.35 + Math.sin(time * 0.13) * 0.2;
      head.current.rotation.x = Math.sin(time * 1.1) * 0.04;
    }
    // typing — alternating fast hand taps while active
    if (active && lHand.current && rHand.current) {
      lHand.current.position.y = -0.02 + Math.max(0, Math.sin(time * 14)) * 0.05;
      rHand.current.position.y = -0.02 + Math.max(0, Math.sin(time * 14 + 1.6)) * 0.05;
    }
    // attention wave overrides the right arm
    if (attention && rArm.current) {
      rArm.current.rotation.z = -2.1 + Math.sin(time * 9) * 0.35;
      rArm.current.rotation.x = 0;
    }
  });

  // Factories (not shared element instances) so each mesh gets its own material.
  const matSkin = () => <meshStandardMaterial color={skin} roughness={0.6} />;
  const matShirt = () => <meshStandardMaterial color={shirt} roughness={0.7} />;
  const matHair = () => <meshStandardMaterial color={hair} roughness={0.85} />;
  const matPants = () => <meshStandardMaterial color="#2c3550" roughness={0.8} />;

  return (
    <group>
      {/* ---- lower body (seated): thighs forward, shins down ---- */}
      <group position={[0, 0.5, 0.04]}>
        {[-0.16, 0.16].map((x) => (
          <group key={x}>
            {/* thigh */}
            <mesh position={[x, 0.02, 0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <capsuleGeometry args={[0.12, 0.34, 6, 12]} />
              {matPants()}
            </mesh>
            {/* shin */}
            <mesh position={[x, -0.26, 0.34]} castShadow>
              <capsuleGeometry args={[0.1, 0.32, 6, 12]} />
              {matPants()}
            </mesh>
            {/* shoe */}
            <mesh position={[x, -0.46, 0.44]} castShadow>
              <RoundedBox args={[0.16, 0.1, 0.26]} radius={0.04}>
                <meshStandardMaterial color="#15181f" roughness={0.5} />
              </RoundedBox>
            </mesh>
          </group>
        ))}
      </group>

      {/* ---- upper body ---- */}
      <group ref={upper} position={[0, 0.78, 0]}>
        {/* hips/seat join */}
        <RoundedBox args={[0.44, 0.22, 0.32]} radius={0.08} position={[0, -0.02, 0.04]} castShadow>
          {matPants()}
        </RoundedBox>
        {/* torso (tapered shirt) */}
        <mesh position={[0, 0.26, 0]} castShadow>
          <capsuleGeometry args={[0.21, 0.3, 8, 16]} />
          {matShirt()}
        </mesh>
        {/* shoulders */}
        <mesh position={[0, 0.42, 0]} castShadow>
          <sphereGeometry args={[0.235, 16, 16]} />
          {matShirt()}
        </mesh>

        {/* neck + head */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.1, 12]} />
          {matSkin()}
        </mesh>
        <group ref={head} position={[0, 0.72, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.18, 24, 24]} />
            {matSkin()}
          </mesh>
          {/* eyes */}
          {[-0.07, 0.07].map((x) => (
            <mesh key={x} position={[x, 0.02, 0.16]}>
              <sphereGeometry args={[0.025, 10, 10]} />
              <meshStandardMaterial color="#1a1a22" roughness={0.3} />
            </mesh>
          ))}
          {/* hair */}
          {hairStyle === 0 && (
            <mesh position={[0, 0.07, -0.01]} castShadow>
              <sphereGeometry args={[0.19, 20, 20, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
              {matHair()}
            </mesh>
          )}
          {hairStyle === 1 && (
            <mesh position={[0, 0.12, 0]} castShadow>
              <sphereGeometry args={[0.185, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
              {matHair()}
            </mesh>
          )}
          {hairStyle === 2 && (
            <mesh position={[0, 0.16, -0.02]} castShadow>
              <coneGeometry args={[0.19, 0.28, 14]} />
              {matHair()}
            </mesh>
          )}
        </group>

        {/* ---- left arm (rests/types on desk) ---- */}
        <group position={[-0.24, 0.34, 0]} rotation={[0, 0, -0.15]}>
          <mesh position={[0, -0.02, 0.0]} rotation={[0, 0, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.18, 6, 12]} />
            {matShirt()}
          </mesh>
          {/* forearm angled forward to the desk */}
          <mesh position={[-0.02, -0.2, 0.2]} rotation={[-1.15, 0, 0]} castShadow>
            <capsuleGeometry args={[0.06, 0.26, 6, 12]} />
            {matSkin()}
          </mesh>
          <group ref={lHand} position={[-0.02, -0.3, 0.4]}>
            <mesh castShadow>
              <sphereGeometry args={[0.07, 12, 12]} />
              {matSkin()}
            </mesh>
          </group>
        </group>

        {/* ---- right arm (types, or raises to wave) ---- */}
        <group ref={rArm} position={[0.24, 0.34, 0]} rotation={[0, 0, 0.15]}>
          <mesh position={[0, -0.02, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.18, 6, 12]} />
            {matShirt()}
          </mesh>
          {attention ? (
            <>
              {/* forearm up */}
              <mesh position={[0, 0.22, 0]} castShadow>
                <capsuleGeometry args={[0.06, 0.26, 6, 12]} />
                {matSkin()}
              </mesh>
              <mesh position={[0, 0.42, 0]} castShadow>
                <sphereGeometry args={[0.08, 12, 12]} />
                {matSkin()}
              </mesh>
            </>
          ) : (
            <>
              <mesh position={[0.02, -0.2, 0.2]} rotation={[-1.15, 0, 0]} castShadow>
                <capsuleGeometry args={[0.06, 0.26, 6, 12]} />
                {matSkin()}
              </mesh>
              <group ref={rHand} position={[0.02, -0.3, 0.4]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.07, 12, 12]} />
                  {matSkin()}
                </mesh>
              </group>
            </>
          )}
        </group>
      </group>
    </group>
  );
}
