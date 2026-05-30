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
import { CommandConsole } from './hud/CommandConsole';
import { WorkerChat } from './hud/WorkerChat';
import { Whiteboard } from './hud/Whiteboard';
import { useStore } from './store/useStore';
import { createAgentSource } from './agents/createAgentSource';

export default function App() {
  const controlsRef = useRef<PLC | null>(null);
  const [locked, setLocked] = useState(false);

  const setSource = useStore((s) => s.setSource);
  const setAgents = useStore((s) => s.setAgents);

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

  // --- pointer lock = walking mode; entering it closes any open panel/overlay ---
  useEffect(() => {
    const onChange = () => {
      const isLocked = !!document.pointerLockElement;
      setLocked(isLocked);
      if (isLocked) {
        const st = useStore.getState();
        st.select(null);
        st.closeConsole();
        if (st.whiteboardOpen) st.toggleWhiteboard();
      }
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  const consoleOpen = useStore((s) => s.consoleOpen);
  const selectedId = useStore((s) => s.selectedAgentId);
  const whiteboardOpen = useStore((s) => s.whiteboardOpen);
  const managerAttention = useStore((s) => s.managerAttention);
  const anyPanel = consoleOpen || !!selectedId || whiteboardOpen;

  // A panel being open ⇔ the pointer is unlocked (so you can type / use the mouse).
  useEffect(() => {
    if (anyPanel && document.pointerLockElement) controlsRef.current?.unlock();
  }, [anyPanel]);

  // --- key actions ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState();

      // ⌘K / Ctrl+K toggles the Manager console from anywhere (even while typing).
      if ((e.metaKey || e.ctrlKey) && (e.code === 'KeyK' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        if (st.consoleOpen) controlsRef.current?.lock();
        else st.openConsole();
        return;
      }
      // Esc closes whatever panel is open and returns to walking.
      if (e.code === 'Escape') {
        if (st.consoleOpen || st.selectedAgentId || st.whiteboardOpen) controlsRef.current?.lock();
        return;
      }

      const el = document.activeElement as HTMLElement | null;
      const typing = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable;
      if (typing) return;

      if (e.code === 'KeyE' && st.focusedAgentId) {
        const ag = st.agentById(st.focusedAgentId);
        if (ag?.kind === 'manager') st.openConsole();
        else st.select(st.focusedAgentId); // worker easter-egg chat
      } else if (e.code === 'KeyM') {
        const opening = !st.whiteboardOpen;
        st.select(null);
        st.closeConsole();
        st.toggleWhiteboard();
        if (!opening) controlsRef.current?.lock();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showStart = !locked && !anyPanel;
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
          <div className="mgr-alert" onClick={() => useStore.getState().openConsole()}>
            🙋 Your Manager has an update — press <kbd>⌘K</kbd> to talk
          </div>
        )}

        {consoleOpen && <CommandConsole onClose={relock} />}
        {selectedId && <WorkerChat onClose={relock} />}
        {whiteboardOpen && <Whiteboard onClose={relock} />}

        {showStart && (
          <div id="enter-office" className="start-overlay" onClick={relock}>
            <h1>Offage</h1>
            <p>
              A walkable 3D office where every desk is an AI agent. Talk to your Manager with{' '}
              <kbd>⌘K</kbd> to drive the whole build — or walk up to anyone and see what they're up to.
            </p>
            <div className="cta">Click to enter · WASD + mouse · ⌘K to talk</div>
          </div>
        )}
      </div>
    </>
  );
}
