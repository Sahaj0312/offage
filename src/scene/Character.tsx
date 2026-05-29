import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// Friendly Wii-Mii palette, chosen deterministically per agent id.
const SHIRTS = ['#e0584f', '#3f8ad6', '#46b68f', '#efb53e', '#9b5fd0', '#ef8a3e', '#3fb6ad'];
const SKINS = ['#f3c1a0', '#e6ad81', '#c98e63', '#a06a44'];
const HAIRS = ['#2c2520', '#3f2a18', '#16161c', '#5e3a22', '#7c7c86', '#caa24f'];
const PANTS = ['#3a4250', '#42352a', '#2f3a44', '#4a4a52'];

function idx(id: string, salt: number, mod: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}

export interface CharacterProps {
  id: string;
  active: boolean;
  attention?: boolean;
}

/**
 * A Wii-Mii-style office worker: big rounded head, simple egg torso, mitten hands,
 * friendly flat colors and a tiny face. Seated naturally in the chair — butt on the
 * seat, thighs forward, shins down, feet on the floor, hands resting on the desk.
 * Faces -z (toward the monitor); subtle procedural breathing / typing / head motion.
 */
export function Character({ id, active, attention }: CharacterProps) {
  const shirt = SHIRTS[idx(id, 1, SHIRTS.length)];
  const skin = SKINS[idx(id, 7, SKINS.length)];
  const hair = HAIRS[idx(id, 13, HAIRS.length)];
  const pants = PANTS[idx(id, 19, PANTS.length)];
  const hairStyle = idx(id, 23, 3);

  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lHand = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  const rHand = useRef<THREE.Group>(null);
  const t = useRef(idx(id, 31, 100) / 10);

  useFrame((_, dt) => {
    t.current += dt;
    const time = t.current;
    if (torso.current) {
      const breath = 1 + Math.sin(time * (active ? 2.2 : 1.4)) * 0.012;
      torso.current.scale.y = breath;
      torso.current.rotation.z = Math.sin(time * 0.6) * 0.015;
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(time * 0.35) * 0.3 + Math.sin(time * 0.11) * 0.15;
      head.current.rotation.x = Math.sin(time * 0.9) * 0.03;
    }
    // typing taps when active
    if (active && lHand.current) lHand.current.position.y = 0.8 + Math.max(0, Math.sin(time * 13)) * 0.04;
    if (active && rHand.current && !attention) rHand.current.position.y = 0.8 + Math.max(0, Math.sin(time * 13 + 1.7)) * 0.04;
    // attention: the right arm is posed up; swing it side-to-side to wave
    if (attention && rArm.current) rArm.current.rotation.z = Math.sin(time * 8) * 0.4;
  });

  const skinMat = () => <meshStandardMaterial color={skin} roughness={0.55} />;
  const shirtMat = () => <meshStandardMaterial color={shirt} roughness={0.7} />;
  const pantsMat = () => <meshStandardMaterial color={pants} roughness={0.8} />;
  const hairMat = () => <meshStandardMaterial color={hair} roughness={0.8} />;

  return (
    <group>
      {/* ---- legs (seated): thighs forward to knees, shins down to feet ---- */}
      {[-0.13, 0.13].map((x) => (
        <group key={x}>
          {/* thigh: hip(z 0) → knee(z -0.34), resting at seat height */}
          <mesh position={[x, 0.52, -0.17]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.12, 0.3, 6, 12]} />
            {pantsMat()}
          </mesh>
          {/* shin: knee(y 0.5) → foot(y 0.1) */}
          <mesh position={[x, 0.3, -0.34]} castShadow>
            <capsuleGeometry args={[0.1, 0.34, 6, 12]} />
            {pantsMat()}
          </mesh>
          {/* shoe */}
          <mesh position={[x, 0.07, -0.42]} castShadow>
            <RoundedBox args={[0.17, 0.12, 0.28]} radius={0.05}>
              <meshStandardMaterial color="#37312b" roughness={0.6} />
            </RoundedBox>
          </mesh>
        </group>
      ))}

      {/* ---- torso (egg-shaped, anchored at the hips) ---- */}
      <group ref={torso} position={[0, 0.55, 0]}>
        <mesh position={[0, 0.24, 0]} castShadow>
          <capsuleGeometry args={[0.24, 0.26, 10, 18]} />
          {shirtMat()}
        </mesh>
        {/* shoulders */}
        <mesh position={[0, 0.42, 0]} castShadow>
          <sphereGeometry args={[0.25, 18, 16]} />
          {shirtMat()}
        </mesh>

        {/* ---- big Mii head ---- */}
        <group ref={head} position={[0, 0.78, 0]}>
          <mesh castShadow scale={[1, 1.06, 0.96]}>
            <sphereGeometry args={[0.27, 28, 28]} />
            {skinMat()}
          </mesh>
          {/* eyes (face is on -z) */}
          {[-0.1, 0.1].map((x) => (
            <mesh key={x} position={[x, 0.03, -0.25]} scale={[0.7, 1.1, 0.6]}>
              <sphereGeometry args={[0.035, 12, 12]} />
              <meshStandardMaterial color="#2a2622" roughness={0.3} />
            </mesh>
          ))}
          {/* mouth */}
          <mesh position={[0, -0.09, -0.255]}>
            <boxGeometry args={[0.08, 0.018, 0.02]} />
            <meshStandardMaterial color="#7a4a44" roughness={0.6} />
          </mesh>
          {/* hair */}
          {hairStyle === 0 && (
            <mesh position={[0, 0.06, 0.02]} castShadow>
              <sphereGeometry args={[0.285, 22, 22, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
              {hairMat()}
            </mesh>
          )}
          {hairStyle === 1 && (
            <mesh position={[0, 0.13, 0.01]} castShadow>
              <sphereGeometry args={[0.28, 22, 22, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
              {hairMat()}
            </mesh>
          )}
          {hairStyle === 2 && (
            <>
              <mesh position={[0, 0.05, 0.04]} castShadow>
                <sphereGeometry args={[0.285, 22, 22, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
                {hairMat()}
              </mesh>
              {/* little bun */}
              <mesh position={[0, 0.28, 0.08]} castShadow>
                <sphereGeometry args={[0.1, 14, 14]} />
                {hairMat()}
              </mesh>
            </>
          )}
        </group>

        {/* ---- left arm: shoulder → hand resting on the desk (-z) ---- */}
        <group position={[-0.24, 0.38, 0]}>
          <mesh position={[-0.02, -0.05, -0.18]} rotation={[-1.2, 0, 0.1]} castShadow>
            <capsuleGeometry args={[0.075, 0.34, 6, 12]} />
            {shirtMat()}
          </mesh>
          <group ref={lHand} position={[-0.05, 0.8 - 0.55, -0.42]}>
            <mesh castShadow scale={[1, 0.7, 1.2]}>
              <sphereGeometry args={[0.1, 14, 14]} />
              {skinMat()}
            </mesh>
          </group>
        </group>

        {/* ---- right arm: types, or raises to wave ---- */}
        <group ref={rArm} position={[0.24, 0.38, 0]}>
          {attention ? (
            <>
              <mesh position={[0.05, 0.18, 0]} rotation={[0, 0, -0.2]} castShadow>
                <capsuleGeometry args={[0.075, 0.36, 6, 12]} />
                {shirtMat()}
              </mesh>
              <mesh position={[0.1, 0.4, 0]} castShadow>
                <sphereGeometry args={[0.1, 14, 14]} />
                {skinMat()}
              </mesh>
            </>
          ) : (
            <>
              <mesh position={[0.02, -0.05, -0.18]} rotation={[-1.2, 0, -0.1]} castShadow>
                <capsuleGeometry args={[0.075, 0.34, 6, 12]} />
                {shirtMat()}
              </mesh>
              <group ref={rHand} position={[0.05, 0.8 - 0.55, -0.42]}>
                <mesh castShadow scale={[1, 0.7, 1.2]}>
                  <sphereGeometry args={[0.1, 14, 14]} />
                  {skinMat()}
                </mesh>
              </group>
            </>
          )}
        </group>
      </group>
    </group>
  );
}
