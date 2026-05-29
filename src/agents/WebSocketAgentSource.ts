import type { Agent, AgentSource } from './types';
import type { ClientMessage, ServerMessage } from '../../shared/agent';
import { DEFAULT_WS_PORT } from '../../shared/agent';

function resolveWsUrl(): string {
  const q = new URLSearchParams(location.search).get('ws');
  if (q) return q;
  const env = import.meta.env.VITE_OFFAGE_WS as string | undefined;
  if (env) return env;
  // Vite dev server: talk to the standalone orchestrator on its default port.
  if (location.port === '5173') return `ws://${location.hostname}:${DEFAULT_WS_PORT}`;
  // Served by the orchestrator itself: same origin.
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
}

/**
 * Talks to the local orchestrator over WebSocket. If it can't connect (e.g. the
 * UI is opened standalone with no server running), it transparently falls back
 * to the provided source so the office still works as a demo.
 */
export class WebSocketAgentSource implements AgentSource {
  private ws: WebSocket | null = null;
  private agents: Agent[] = [];
  private listeners = new Set<(a: Agent[]) => void>();
  private usingFallback = false;
  private connected = false;
  private url: string;

  constructor(private fallback: AgentSource, url = resolveWsUrl()) {
    this.url = url;
  }

  getAgents() {
    return this.usingFallback ? this.fallback.getAgents() : this.agents;
  }

  subscribe(cb: (a: Agent[]) => void) {
    this.listeners.add(cb);
    cb(this.getAgents());
    return () => this.listeners.delete(cb);
  }

  private emit(a: Agent[]) {
    this.agents = a;
    for (const cb of this.listeners) cb(a);
  }

  start() {
    let settled = false;
    const useFallback = (why: string) => {
      if (settled) return;
      settled = true;
      this.usingFallback = true;
      console.warn(`[offage] ${why} — using offline mock.`);
      this.fallback.subscribe((a) => this.emit(a));
      this.fallback.start();
    };

    try {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      const timeout = setTimeout(() => useFallback(`no orchestrator at ${this.url}`), 1500);
      ws.onopen = () => {
        clearTimeout(timeout);
        settled = true;
        this.connected = true;
        ws.send(JSON.stringify({ type: 'hello' } satisfies ClientMessage));
      };
      ws.onmessage = (ev) => {
        const msg: ServerMessage = JSON.parse(ev.data);
        if (msg.type === 'snapshot') this.emit(msg.agents);
      };
      ws.onerror = () => {
        clearTimeout(timeout);
        useFallback(`connection error to ${this.url}`);
      };
      ws.onclose = () => {
        this.connected = false;
        if (!settled) useFallback(`could not reach ${this.url}`);
      };
    } catch {
      useFallback(`invalid ws url ${this.url}`);
    }
  }

  sendTask(agentId: string, task: string) {
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify({ type: 'task', agentId, task } satisfies ClientMessage));
    } else {
      this.fallback.sendTask(agentId, task);
    }
  }

  stop() {
    this.ws?.close();
    if (this.usingFallback) this.fallback.stop();
  }
}
