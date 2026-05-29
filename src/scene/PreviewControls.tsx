import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OC } from 'three-stdlib';

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

/**
 * Free-roam inspect mode used by ?preview: OrbitControls for mouse-look + zoom +
 * pan, plus WASD/arrows to fly the camera (Space / Shift for up / down). Moving
 * translates both the camera and the orbit pivot so look-around keeps working.
 */
export function PreviewControls() {
  const controls = useRef<OC>(null);
  const keys = useRef<Record<string, boolean>>({});
  const { camera } = useThree();
  const fwd = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const delta = useRef(new THREE.Vector3());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!isTyping()) keys.current[e.code] = true;
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

  useFrame((_, dt) => {
    const k = keys.current;
    const c = controls.current;
    if (!c || isTyping()) return;
    const f = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
    const s = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);
    const up = (k['Space'] ? 1 : 0) - (k['ShiftLeft'] || k['ShiftRight'] ? 1 : 0);
    if (!f && !s && !up) return;

    camera.getWorldDirection(fwd.current);
    fwd.current.y = 0;
    fwd.current.normalize();
    right.current.crossVectors(fwd.current, camera.up).normalize();

    const speed = 8 * dt;
    delta.current
      .set(0, 0, 0)
      .addScaledVector(fwd.current, f * speed)
      .addScaledVector(right.current, s * speed);
    delta.current.y += up * speed;

    camera.position.add(delta.current);
    c.target.add(delta.current);
    c.update();
  });

  return (
    <OrbitControls
      ref={controls as never}
      makeDefault
      target={[0, 1, -2]}
      enablePan
      enableZoom
      minDistance={1}
      maxDistance={40}
      maxPolarAngle={Math.PI / 2 - 0.03}
    />
  );
}
