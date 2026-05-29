# Offage — a walkable 3D office agent orchestrator

A first-person 3D office in the browser where **every desk is an AI agent**. Walk around,
watch agents think / work / finish (animation, monitor output, status glow all driven by
one `AgentStatus`), get close to anyone to inspect or assign a task, and open the
orchestration board to see the whole fleet at a glance.

**v1 is a fully mocked visual prototype** — no backend. The scene reads only from an
`AgentSource` interface; `MockAgentSource` runs a scripted simulation. Going live later =
implement one `LiveAgentSource` (e.g. WebSocket → Claude Agent SDK / any orchestrator) and
swap a single line in `App.tsx`. No scene changes.

## Run

```bash
npm install
npm run dev      # opens http://localhost:5173
npm run typecheck
```

## Controls

- **Click** to enter (locks the cursor) · **WASD / arrows** move · **mouse** look
- **E** inspect the agent you're standing near · **M** orchestration board · **Esc** release cursor

## Architecture

```
AgentSource (interface)         src/agents/types.ts
  └ MockAgentSource             src/agents/MockAgentSource.ts   ← swap for LiveAgentSource
        │ subscribe()
        ▼
  zustand store                 src/store/useStore.ts
        │ (one-way)
   ┌────┴─────┐
   ▼          ▼
 R3F scene   DOM HUD
 src/scene/  src/hud/
```

`AgentStatus` (`idle | thinking | working | done | error`) is the single source of truth:
`lib/statusVisuals.ts` maps it to color / glow / icon, consumed by the character animation,
monitor, status bubble, info panel, and orchestration board alike.

## Assets

Runs on primitive placeholders today. Drop CC0 glTF assets into `public/models/` and
`public/anim/` (Kenney furniture, Quaternius characters, Mixamo animations) and load them
behind the existing component APIs — see those folders' READMEs.

## Out of scope for v1

Real agent backend, realistic humans, lip-sync, pathfinding NPCs, multiplayer,
persistence, mobile/touch controls.
