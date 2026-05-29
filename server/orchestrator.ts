import type { Agent } from '../shared/agent';
import type { AgentConfig } from './config';
import type { AgentRuntime, RuntimeEvent } from './runtime/types';

export interface Orchestrator {
  readonly provider: string;
  getAgents(): Agent[];
  onChange(cb: (agents: Agent[]) => void): () => void;
  assign(agentId: string, task: string): void;
  start(): void;
  stop(): void;
}

function initialAgents(roster: AgentConfig[]): Agent[] {
  return roster.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    deskId: a.deskId,
    status: 'idle',
    task: null,
    progress: 0,
    output: [],
  }));
}

function pushLogs(log: string[], add: string | string[]): string[] {
  const next = [...log, ...(Array.isArray(add) ? add : [add])];
  return next.length > 40 ? next.slice(next.length - 40) : next;
}

abstract class BaseOrchestrator implements Orchestrator {
  abstract readonly provider: string;
  protected agents = new Map<string, Agent>();
  protected configs = new Map<string, AgentConfig>();
  protected order: string[];
  private listeners = new Set<(a: Agent[]) => void>();

  constructor(roster: AgentConfig[]) {
    this.order = roster.map((a) => a.id);
    for (const a of roster) this.configs.set(a.id, a);
    for (const a of initialAgents(roster)) this.agents.set(a.id, a);
  }

  getAgents(): Agent[] {
    return this.order.map((id) => ({ ...this.agents.get(id)! }));
  }

  onChange(cb: (a: Agent[]) => void) {
    this.listeners.add(cb);
    cb(this.getAgents());
    return () => this.listeners.delete(cb);
  }

  protected broadcast() {
    const snap = this.getAgents();
    for (const cb of this.listeners) cb(snap);
  }

  protected apply(id: string, e: RuntimeEvent) {
    const a = this.agents.get(id);
    if (!a) return;
    if (e.status) a.status = e.status;
    if (e.task !== undefined) a.task = e.task;
    if (typeof e.progress === 'number') a.progress = e.progress;
    if (e.appendOutput) a.output = pushLogs(a.output, e.appendOutput);
    this.broadcast();
  }

  abstract assign(agentId: string, task: string): void;
  abstract start(): void;
  abstract stop(): void;
}

/** Task-driven orchestrator backed by a real AgentRuntime (e.g. Claude Agent SDK). */
export class TaskOrchestrator extends BaseOrchestrator {
  readonly provider: string;
  private running = new Set<string>();
  private controllers = new Map<string, AbortController>();
  private queue: { agentId: string; task: string }[] = [];

  constructor(roster: AgentConfig[], private runtime: AgentRuntime, private concurrency: number) {
    super(roster);
    this.provider = runtime.name;
  }

  start() {
    this.broadcast();
  }

  stop() {
    for (const c of this.controllers.values()) c.abort();
    this.controllers.clear();
    this.running.clear();
  }

  assign(agentId: string, task: string) {
    if (!this.agents.has(agentId)) return;
    // restart cleanly if this agent is mid-task
    if (this.running.has(agentId)) {
      this.controllers.get(agentId)?.abort();
      this.controllers.delete(agentId);
      this.running.delete(agentId);
    }
    this.apply(agentId, { status: 'thinking', task, progress: 0, appendOutput: '> task assigned by operator' });
    if (this.running.size < this.concurrency) this.startRun(agentId, task);
    else {
      this.queue = this.queue.filter((q) => q.agentId !== agentId);
      this.queue.push({ agentId, task });
    }
  }

  private startRun(agentId: string, task: string) {
    const cfg = this.configs.get(agentId)!;
    const controller = new AbortController();
    this.controllers.set(agentId, controller);
    this.running.add(agentId);

    this.runtime
      .run(cfg, task, (e) => this.apply(agentId, e), controller)
      .catch((err) => this.apply(agentId, { status: 'error', appendOutput: `> ERROR: ${err.message}`, progress: 1 }))
      .finally(() => {
        this.running.delete(agentId);
        this.controllers.delete(agentId);
        this.drain();
      });
  }

  private drain() {
    while (this.running.size < this.concurrency && this.queue.length) {
      const next = this.queue.shift()!;
      this.startRun(next.agentId, next.task);
    }
  }
}

// ---- Mock orchestrator: self-driven scripted activity, no backend/auth ------

const TASKS = [
  'Searching docs for auth flow',
  'Refactoring the payments module',
  'Reviewing PR #482 for race conditions',
  'Extracting fields from 1.2k records',
  'Running the integration suite',
  'Merging findings into a report',
];
const LOGS = [
  '> reading src/index.ts',
  '> 3 candidates found',
  '> applying patch...',
  '> tool: grep "useEffect"',
  '> hypothesis confirmed',
  '> 12 files scanned',
  '> retry 1/3',
  '> assertion passed',
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MockOrchestrator extends BaseOrchestrator {
  readonly provider = 'mock';
  private timer: ReturnType<typeof setInterval> | null = null;
  private rand = mulberry32(1337);

  start() {
    if (this.timer) return;
    this.broadcast();
    this.timer = setInterval(() => this.step(), 1100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  assign(agentId: string, task: string) {
    this.apply(agentId, { status: 'thinking', task, progress: 0, appendOutput: ['> task assigned by operator', `> "${task}"`] });
  }

  private step() {
    for (const id of this.order) {
      const a = this.agents.get(id)!;
      const r = this.rand();
      switch (a.status) {
        case 'idle':
          if (r < 0.25)
            this.apply(id, { status: 'thinking', task: TASKS[Math.floor(this.rand() * TASKS.length)], progress: 0, appendOutput: '> picking up task' });
          break;
        case 'thinking':
          this.apply(id, { appendOutput: LOGS[Math.floor(this.rand() * LOGS.length)], ...(r < 0.6 ? { status: 'working' as const } : {}) });
          break;
        case 'working': {
          const progress = Math.min(1, a.progress + 0.12 + this.rand() * 0.12);
          if (progress >= 1)
            this.apply(id, { progress: 1, status: r < 0.12 ? 'error' : 'done', appendOutput: r < 0.12 ? '> ERROR: unhandled exception' : '> task complete ✓' });
          else this.apply(id, { progress, appendOutput: LOGS[Math.floor(this.rand() * LOGS.length)] });
          break;
        }
        case 'done':
        case 'error':
          if (r < 0.4) this.apply(id, { status: 'idle', task: null, progress: 0 });
          break;
      }
    }
  }
}
