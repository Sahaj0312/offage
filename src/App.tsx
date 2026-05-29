import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { PointerLockControls as PLC } from 'three-stdlib';
import { Lights } from './scene/Lights';
import { Office } from './scene/Office';
import { DeskCluster } from './scene/DeskCluster';
import { Player } from './scene/Player';
import { Crosshair } from './hud/Crosshair';
import { ControlsHint } from './hud/ControlsHint';
import { InfoPanel } from './hud/InfoPanel';
import { Whiteboard } from './hud/Whiteboard';
import { useStore } from './store/useStore';
import { createAgentSource } from './agents/createAgentSource';

export default function App() {
  const controlsRef = useRef<PLC | null>(null);
  const [locked, setLocked] = useState(false);

  const setSource = useStore((s) => s.setSource);
  const setAgents = useStore((s) => s.setAgents);
  const select = useStore((s) => s.select);
  const toggleWhiteboard = useStore((s) => s.toggleWhiteboard);

  // --- wire the mock agent source into the store (swap for LiveAgentSource later) ---
  useEffect(() => {
    const source = createAgentSource();
    setSource(source);
    const unsub = source.subscribe((agents) => setAgents(agents));
    const unsubChat = source.onChat((role, text) => useStore.getState().pushChat(role, text));
    source.start();
    return () => {
      unsub();
      unsubChat();
      source.stop();
    };
  }, [setSource, setAgents]);

  // --- pointer lock = walking mode; unlocking always returns to a UI/overlay ---
  useEffect(() => {
    const onChange = () => {
      const isLocked = !!document.pointerLockElement;
      setLocked(isLocked);
      if (isLocked) {
        // entering walk mode closes any open panel/overlay
        useStore.getState().select(null);
        if (useStore.getState().whiteboardOpen) useStore.getState().toggleWhiteboard();
      }
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  // --- key actions: E inspect focused agent, M orchestration board ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = document.activeElement?.tagName === 'INPUT';
      if (typing) return;
      const st = useStore.getState();
      if (e.code === 'KeyE' && st.focusedAgentId) {
        select(st.focusedAgentId);
        controlsRef.current?.unlock();
      } else if (e.code === 'KeyM') {
        const opening = !st.whiteboardOpen;
        st.select(null);
        toggleWhiteboard();
        if (opening) controlsRef.current?.unlock();
        else controlsRef.current?.lock();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [select, toggleWhiteboard]);

  const selectedId = useStore((s) => s.selectedAgentId);
  const whiteboardOpen = useStore((s) => s.whiteboardOpen);
  const managerAttention = useStore((s) => s.managerAttention);
  const showStart = !locked && !selectedId && !whiteboardOpen;

  const relock = () => controlsRef.current?.lock();

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 70, near: 0.1, far: 200, position: [0, 1.65, 12.5] }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color('#d7e3ee');
          scene.fog = new THREE.Fog('#d7e3ee', 34, 64);
        }}
      >
        <Lights />
        <Office />
        <DeskCluster />
        <Player controlsRef={controlsRef} />
      </Canvas>

      <div className="hud">
        {locked && <Crosshair />}
        {locked && <ControlsHint />}
        {locked && managerAttention && (
          <div className="mgr-alert">🙋 Manager has an update — head of the room</div>
        )}

        {selectedId && <InfoPanel onClose={relock} />}
        {whiteboardOpen && <Whiteboard onClose={relock} />}

        {showStart && (
          <div id="enter-office" className="start-overlay" onClick={relock}>
            <h1>Offage</h1>
            <p>
              A walkable 3D office where every desk is an AI agent. Watch them think, work,
              and finish — walk up to anyone to inspect or assign a task.
            </p>
            <div className="cta">Click to enter · WASD + mouse to move</div>
          </div>
        )}
      </div>
    </>
  );
}
