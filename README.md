# Offage — a walkable 3D office agent orchestrator

A first-person 3D office in the browser where **every desk is an AI agent**. Walk around,
watch agents think / work / finish (animation, monitor output, status glow all driven by
one `AgentStatus`), get close to anyone to inspect or assign a task, and open the
orchestration board to see the whole fleet at a glance.

Offage is **local-first**: you run it on your machine and it drives the agent tools you've
*already authenticated* (Claude Agent SDK uses the same auth as `claude` — your subscription
login or `ANTHROPIC_API_KEY`). Offage never sees your credentials. The 3D office is just the
render + control surface over a small local orchestrator.

## Quick start

```bash
npm install

# 1) Pure demo, no server — scripted agents, works offline:
npm run dev                      # http://localhost:5173  (mock data)

# 2) Live, single command — builds UI + runs the local orchestrator on one port:
npm run serve                    # opens http://localhost:8787
#    or, once published:  npx offage

# 3) Dev with hot reload + a live orchestrator side by side:
npm run dev:all                  # Vite on 5173 + orchestrator on 8787

npm run typecheck                # frontend + server
```

By default the orchestrator runs the **mock** provider (no auth needed). Point it at real
agents with a config file (see below).

## Configure (per user)

Copy `offage.config.example.json` to `offage.config.json` (or `~/.offage/config.json`):

```json
{
  "provider": "claude-agent-sdk",
  "workdir": "~/projects/your-repo",
  "allowedTools": ["Read", "Grep", "Glob", "WebSearch", "WebFetch"],
  "concurrency": 3,
  "agents": [
    { "name": "Scout", "role": "Research", "deskId": "d1", "systemPrompt": "..." }
  ]
}
```

- **`provider`** — `claude-agent-sdk` (real Claude agents) or `mock` (scripted demo).
- **`allowedTools`** — defaults to **read-only** tools, so agents can explore but not edit
  files or run shell commands. Widen this deliberately (e.g. add `Edit`, `Bash`).
- **`agents`** — your roster; each entry becomes a desk + person in the office (desks
  `d1`..`d6` exist in the scene layout). Add per-agent `systemPrompt` / `allowedTools`.

Agents on the real provider sit **idle until you assign them a task** in-world (walk up,
press `E`, type a task) — that's the operator interaction.

CLI flags: `--config <path>`, `--port <n>`, `--serve-dist`, `--no-open`.

## Controls

- **Click** to enter (locks the cursor) · **WASD / arrows** move · **mouse** look
- **E** inspect / task the nearest agent · **M** orchestration board · **Esc** release cursor

## Architecture

```
              shared/agent.ts  (Agent, AgentStatus, WS protocol — one source of truth)
                       │
  ┌────────────────────┴───────────────────────┐
  │ FRONTEND (browser)                          │  SERVER (local Node, optional)
  │                                             │
  │ AgentSource (interface)  src/agents/types   │  WebSocketServer        server/index.ts
  │  ├ MockAgentSource        (offline demo)    │   └ Orchestrator         server/orchestrator
  │  └ WebSocketAgentSource ──┼── ws ───────────┼──▶  ├ MockOrchestrator   (scripted)
  │       (falls back to mock if no server)     │     └ TaskOrchestrator   (task-driven)
  │            │ subscribe()                    │          └ AgentRuntime  server/runtime/
  │            ▼                                │              └ ClaudeAgentSdkRuntime
  │      zustand store  src/store/useStore      │                 (uses your claude auth)
  │            │ (one-way)                      │  config          server/config.ts
  │      ┌─────┴─────┐                          │   (offage.config.json / ~/.offage)
  │      ▼           ▼                          │
  │  R3F scene    DOM HUD                       │
  │  src/scene/   src/hud/                      │
  └─────────────────────────────────────────────┘
```

The 3D scene only ever reads from an `AgentSource`. `WebSocketAgentSource` and
`MockAgentSource` implement the same interface, so the scene is identical whether data is
live or mocked — and it auto-falls-back to mock if no orchestrator is running.

`AgentStatus` (`idle | thinking | working | done | error`) is the single source of truth:
`lib/statusVisuals.ts` maps it to color / glow / icon, consumed by the character animation,
monitor, status bubble, info panel, and orchestration board alike.

### Adding another provider

Implement one `AgentRuntime` (`server/runtime/types.ts`) — e.g. a Codex CLI or
OpenAI adapter — and select it in `server/index.ts` by `config.provider`. No frontend or
scene changes.

## Assets

Runs on primitive placeholders today. Drop CC0 glTF assets into `public/models/` and
`public/anim/` (Kenney furniture, Quaternius characters, Mixamo animations) and load them
behind the existing component APIs — see those folders' READMEs.

## Out of scope for v1

Realistic humans, lip-sync, pathfinding NPCs, multiplayer, persistence, hosted multi-user,
mobile/touch controls.
