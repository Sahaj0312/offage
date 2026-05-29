# Offage — a walkable 3D office agent orchestrator

A first-person 3D office in the browser where **every desk is an AI agent**. Walk around,
watch agents think / work / finish (animation, monitor output, status glow all driven by
one `AgentStatus`), get close to anyone to inspect or assign a task, and open the
orchestration board to see the whole fleet at a glance.

Offage is **local-first**: you run it on your machine and it drives the agent tools you've
*already authenticated*. It runs fully on **Claude** (Claude Agent SDK — same auth as `claude`)
**or Codex** (OpenAI Codex SDK — same auth as `codex`); pick with `--provider`. Offage never
sees your credentials. The 3D office is just the render + control surface over a small local
orchestrator.

The entire pipeline — the team **planner**, the **Manager** (lead agent), and the **workers** —
runs on your chosen provider, behind a small `Brain` + `AgentRuntime` seam, so the 3D office,
worktree isolation, Manager loop, and autonomous mode are identical either way.

## The `offage` command (recommended)

Run it like `claude` / `codex` — it checks your Claude login, asks what you want to build,
has **Claude design a team of agents** for the goal, then opens a 3D office already staffed
and working:

```bash
npm install
npm run offage           # or, once published:  npx offage
```

```
   ▟█▙ ▒▒▒  Offage
   ▜█▛ a walkable 3D office for your AI agents

✓ Logged in — Claude Code v2.1.x, model claude-sonnet-4-6

  What would you like to build today?
  › add a dark-mode toggle and tests

✓ Claude assembled a team of 2.
  1. Builder · Feature Implementer
  2. Tester  · Test Author
✓ Your office is ready.

  ● 2 agents at work in /path/to/your/project
  Enter your office: http://localhost:8787   ← click it
```

If you're not logged in, it tells you to run `claude` (or set `ANTHROPIC_API_KEY`) and
retries. A **live feed** of every agent's output (tool calls, text, done/error) streams to
your terminal so you can see them working, while the office shows it in 3D.

Agents work in the directory you launched from. They're **read-only by default** (explore &
plan); add `--write` so they can actually create/edit files.

| Flag | What it does |
|------|--------------|
| `--write` (`--build`) | Let agents create & edit files (adds `Write`/`Edit`). Needed to actually build something. |
| `--bash` | Also allow shell commands (with `--write`). Off by default. |
| `--read-only` | Force explore-only (no file changes). |
| `--workdir <dir>` | Where agents operate (default: current directory). Use a fresh folder for build tasks. |
| `--isolate` / `--no-isolate` | Per-agent git worktree isolation. Default: on for multi-agent `--write`. |
| `--auto` | Autonomous: the Manager keeps delegating rounds until the goal is met, then reports. |
| `--max-rounds <n>` | Cap on autonomous rounds (default 6). |
| `--max-turns <n>` | Per-agent turn budget (default 30). Raise for big builds. |
| `--provider claude\|codex` | Which backend runs everything. Default: Claude (or `provider` in config). |
| `--model <id>` | e.g. `--model opus` (Claude) or `--model gpt-5-codex` (Codex). Omit for the provider default. |
| `--goal "…"` | Skip the prompt. |
| `--mock` | Scripted demo team, no auth/cost. |
| `--port <n>` · `--no-open` · `--config <path>` | Server port · don't auto-open browser · config file. |

> **Tip:** to actually build a project, run in a fresh directory with `--write`:
> `cd ~/projects/new-site && offage --write`

### The Manager (lead agent)

You don't just fire off a team and watch — there's a **Manager**, the lead agent you converse
with (like the main agent in Claude Code). After the team finishes a round, the Manager
**synthesizes** what they did and reports back; your follow-ups go *through* the Manager, which
**delegates** new tasks to the team. It runs as a `manager`-kind agent at the head-of-room desk.

- **In the terminal:** after the office opens, you get a `you ›` prompt. Type a follow-up
  ("make the earth bigger and add clouds") → the Manager assigns it to the team, waits, and
  summarizes. `/quit` to exit.
- **In the office:** walk up to the **Manager's desk** and press `E` to chat in a panel — same
  conversation, same delegation.
- **Autonomous mode (`--auto`):** instead of one round per message, the Manager keeps delegating
  follow-up rounds on its own until it judges the goal met (capped by `--max-rounds`), then reports
  back and waits for you. Hands-off.

Tasks are **capability-aware**: the planner and Manager are told what the team can do (read-only,
`--write`, or `--write --bash`), so they never assign work the agents can't perform (e.g. they
won't tell write-only agents to run tests or `git push`).

### Multi-agent isolation (git worktrees)

When Claude picks a team of 2+ agents and `--write` is on, each agent works in its **own git
worktree on its own branch**, so concurrent agents never clobber the same file. When an agent
finishes, its branch is committed and **merged back into your working directory** automatically
(the workdir is `git init`-ed if needed). If two agents change the same file in conflicting
ways, the merge is left on that agent's `offage/<name>-N` branch for you to resolve, and a
notice is shown. Disable with `--no-isolate`.

## Other ways to run

```bash
npm run dev          # http://localhost:5173 — pure offline demo (add /?mock to force)
npm run serve        # build UI + run orchestrator on one port (uses offage.config.json)
npm run dev:all      # Vite (5173) + orchestrator (8787) with hot reload
npm run typecheck    # frontend + server + cli
```

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
  │            ▼                                │             ├ ClaudeAgentSdkRuntime
  │      zustand store  src/store/useStore      │             └ CodexRuntime
  │            │ (one-way)                      │                (+ runIsolated worktree helper)
  │      ┌─────┴─────┐                          │  config          server/config.ts
  │      ▼           ▼                          │   (offage.config.json / ~/.offage)
  │  R3F scene    DOM HUD                       │
  │  src/scene/   src/hud/                      │
  └─────────────────────────────────────────────┘

  cli/index.ts ─ banner → Brain.probeAuth() → "what to build?" →
                 planTeam(Brain) for a 1–6 agent roster → startServer() with that roster →
                 Manager + Coordinator drive rounds → auto-assigns each agent its first task

  Brain (server/brain/)  — planner + Manager + auth, per provider:
    ├ ClaudeBrain   (Claude Agent SDK)
    └ CodexBrain    (OpenAI Codex SDK, native outputSchema)
```

The roster is dynamic: the provider decides how many agents the goal needs (capped at the 6
desk slots) and the office renders exactly that many desks — only staffed desks block movement.

The 3D scene only ever reads from an `AgentSource`. `WebSocketAgentSource` and
`MockAgentSource` implement the same interface, so the scene is identical whether data is
live or mocked — and it auto-falls-back to mock if no orchestrator is running.

`AgentStatus` (`idle | thinking | working | done | error`) is the single source of truth:
`lib/statusVisuals.ts` maps it to color / glow / icon, consumed by the character animation,
monitor, status bubble, info panel, and orchestration board alike.

### Adding another provider

Two small seams, both provider-agnostic above them:
- **Workers:** implement one `AgentRuntime` (`server/runtime/types.ts`) — reuse `runIsolated`
  for worktree handling — and select it in `makeOrchestrator` (`server/serve.ts`).
- **Brain (planner/Manager/auth):** implement one `Brain` (`server/brain/types.ts`).

Wire both to a new `provider` value. No frontend or scene changes. Claude and Codex are the
two reference implementations.

## Assets

Runs on primitive placeholders today. Drop CC0 glTF assets into `public/models/` and
`public/anim/` (Kenney furniture, Quaternius characters, Mixamo animations) and load them
behind the existing component APIs — see those folders' READMEs.

## Out of scope for v1

Realistic humans, lip-sync, pathfinding NPCs, multiplayer, persistence, hosted multi-user,
mobile/touch controls.
