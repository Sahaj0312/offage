import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import type { PointerLockControls as PLC } from 'three-stdlib';
import * as THREE from 'three';
import { buildObstacles, resolvePosition } from '../lib/collision';
import { DESK_SLOTS, EYE_HEIGHT, PLAYER_SPAWN } from './layout';
import { useStore } from '../store/useStore';

const SPEED = 6; // units / second
const PLAYER_RADIUS = 0.45;
const FOCUS_RADIUS = 3.4; // how close to a desk before the agent is "focused"

function useKeyboard() {
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);
  return keys;
}

export function Player({ controlsRef }: { controlsRef: React.MutableRefObject<PLC | null> }) {
  const { camera } = useThree();
  const keys = useKeyboard();
  const obstacles = useMemo(() => buildObstacles(), []);
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.position.set(...PLAYER_SPAWN);
  }, [camera]);

  useFrame((_, delta) => {
    const k = keys.current;
    const move = new THREE.Vector2(
      (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0),
      (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0),
    );

    if (move.lengthSq() > 0) {
      move.normalize();
      camera.getWorldDirection(forward.current);
      forward.current.y = 0;
      forward.current.normalize();
      right.current.crossVectors(forward.current, camera.up).normalize();

      const step = SPEED * delta;
      let x = camera.position.x + (forward.current.x * move.x + right.current.x * move.y) * step;
      let z = camera.position.z + (forward.current.z * move.x + right.current.z * move.y) * step;
      [x, z] = resolvePosition(x, z, PLAYER_RADIUS, obstacles);
      camera.position.x = x;
      camera.position.z = z;
    }
    camera.position.y = EYE_HEIGHT;

    // Proximity: focus the nearest desk's agent if within range.
    let nearestDesk: string | null = null;
    let best = FOCUS_RADIUS * FOCUS_RADIUS;
    for (const d of DESK_SLOTS) {
      const dx = camera.position.x - d.position[0];
      const dz = camera.position.z - d.position[2];
      const dist = dx * dx + dz * dz;
      if (dist < best) {
        best = dist;
        nearestDesk = d.id;
      }
    }
    const agents = useStore.getState().agents;
    const focusId = nearestDesk ? agents.find((a) => a.deskId === nearestDesk)?.id ?? null : null;
    useStore.getState().setFocused(focusId);
  });

  return <PointerLockControls ref={controlsRef as never} />;
}
