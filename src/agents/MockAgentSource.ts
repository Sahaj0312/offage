import type { Agent, AgentSource } from './types';

const SEED: Omit<Agent, 'status' | 'task' | 'progress' | 'output'>[] = [
  { id: 'a1', name: 'Scout', role: 'Research & retrieval', deskId: 'd1' },
  { id: 'a2', name: 'Drafter', role: 'Writes first-pass code', deskId: 'd2' },
  { id: 'a3', name: 'Critic', role: 'Reviews & refutes', deskId: 'd3' },
  { id: 'a4', name: 'Wrangler', role: 'Data extraction', deskId: 'd4' },
  { id: 'a5', name: 'Tester', role: 'Runs & verifies', deskId: 'd5' },
  { id: 'a6', name: 'Synth', role: 'Synthesizes results', deskId: 'd6' },
];

const TASKS = [
  'Searching docs for auth flow',
  'Refactoring the payments module',
  'Reviewing PR #482 for race conditions',
  'Extracting fields from 1.2k records',
  'Running the integration suite',
  'Merging findings into a report',
  'Tracing a flaky test',
  'Summarizing the design thread',
];

const LOG_SNIPPETS = [
  '> reading src/index.ts',
  '> 3 candidates found',
  '> applying patch...',
  '> tokens: 4,210',
  '> tool: grep "useEffect"',
  '> hypothesis confirmed',
  '> 12 files scanned',
  '> retry 1/3',
  '> writing summary.md',
  '> assertion passed',
];

// Deterministic pseudo-random so the demo is stable across reloads (no Math.random
// seeding issues, and easy to reason about).
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MockAgentSource implements AgentSource {
  private agents: Agent[];
  private listeners = new Set<(a: Agent[]) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private rand = mulberry32(1337);
  private tick = 0;

  constructor() {
    this.agents = SEED.map((s, i) => ({
      ...s,
      status: i % 2 === 0 ? 'working' : 'idle',
      task: i % 2 === 0 ? TASKS[i % TASKS.length] : null,
      progress: i % 2 === 0 ? 0.2 : 0,
      output: i % 2 === 0 ? ['> session started'] : [],
    }));
  }

  getAgents() {
    return this.agents;
  }

  subscribe(cb: (a: Agent[]) => void) {
    this.listeners.add(cb);
    cb(this.agents);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    // hand out a fresh array reference so React/zustand detect the change
    this.agents = this.agents.map((a) => ({ ...a }));
    for (const cb of this.listeners) cb(this.agents);
  }

  // The mock has no real Manager; messages/chat are no-ops.
  sendMessage(_text: string) {}
  onChat(_cb: (role: 'user' | 'manager' | 'system', text: string) => void) {
    return () => {};
  }

  sendTask(agentId: string, task: string) {
    const a = this.agents.find((x) => x.id === agentId);
    if (!a) return;
    a.status = 'thinking';
    a.task = task;
    a.progress = 0;
    a.output = ['> task assigned by operator', `> "${task}"`];
    this.emit();
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.step(), 1100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Advance the scripted simulation by one tick. */
  private step() {
    this.tick++;
    for (const a of this.agents) {
      const r = this.rand();
      switch (a.status) {
        case 'idle':
          if (r < 0.25) {
            a.status = 'thinking';
            a.task = TASKS[Math.floor(this.rand() * TASKS.length)];
            a.progress = 0;
            a.output = ['> picking up task', `> "${a.task}"`];
          }
          break;
        case 'thinking':
          a.output = pushLog(a.output, this.pickLog());
          if (r < 0.6) a.status = 'working';
          break;
        case 'working':
          a.progress = Math.min(1, a.progress + 0.12 + this.rand() * 0.12);
          a.output = pushLog(a.output, this.pickLog());
          if (a.progress >= 1) {
            a.status = r < 0.12 ? 'error' : 'done';
            a.output = pushLog(
              a.output,
              a.status === 'error' ? '> ERROR: unhandled exception' : '> task complete ✓',
            );
          }
          break;
        case 'done':
        case 'error':
          if (r < 0.4) {
            a.status = 'idle';
            a.task = null;
            a.progress = 0;
          }
          break;
      }
    }
    this.emit();
  }

  private pickLog() {
    return LOG_SNIPPETS[Math.floor(this.rand() * LOG_SNIPPETS.length)];
  }
}

function pushLog(log: string[], line: string): string[] {
  const next = [...log, line];
  return next.length > 40 ? next.slice(next.length - 40) : next;
}

export type { AgentSource };
