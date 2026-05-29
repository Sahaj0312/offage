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

/** True when focus is in a text field, so movement keys shouldn't drive the camera. */
function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

function useKeyboard() {
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Don't capture movement keys while typing in a panel (chat / task input).
      if (isTyping()) return;
      keys.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    // If a field gains focus, release any held keys so the player can't keep gliding.
    const onFocusIn = () => {
      if (isTyping()) keys.current = {};
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('focusin', onFocusIn);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('focusin', onFocusIn);
    };
  }, []);
  return keys;
}

export function Player({ controlsRef }: { controlsRef: React.MutableRefObject<PLC | null> }) {
  const { camera } = useThree();
  const keys = useKeyboard();
  // Only desks that are actually staffed block movement / can be focused, so a
  // smaller (Claude-chosen) team doesn't leave invisible walls in empty slots.
  const occupiedDesks = useStore((s) => s.agents.map((a) => a.deskId).join(','));
  const obstacles = useMemo(
    () => buildObstacles(occupiedDesks ? occupiedDesks.split(',') : []),
    [occupiedDesks],
  );
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.position.set(...PLAYER_SPAWN);
  }, [camera]);

  useFrame((_, delta) => {
    const k = keys.current;
    // No walking while typing in a panel, even if a key is somehow still held.
    const move = isTyping()
      ? new THREE.Vector2(0, 0)
      : new THREE.Vector2(
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

    // Proximity: focus the nearest *staffed* desk's agent if within range.
    const agents = useStore.getState().agents;
    let focusId: string | null = null;
    let best = FOCUS_RADIUS * FOCUS_RADIUS;
    for (const d of DESK_SLOTS) {
      const agent = agents.find((a) => a.deskId === d.id);
      if (!agent) continue;
      const dx = camera.position.x - d.position[0];
      const dz = camera.position.z - d.position[2];
      const dist = dx * dx + dz * dz;
      if (dist < best) {
        best = dist;
        focusId = agent.id;
      }
    }
    useStore.getState().setFocused(focusId);
  });

  // selector scopes drei's click-to-lock to the start overlay only; without it
  // drei binds the handler to the whole document, so clicking the task input
  // would re-lock the pointer and close the panel. We lock/unlock manually elsewhere.
  return <PointerLockControls ref={controlsRef as never} selector="#enter-office" />;
}
