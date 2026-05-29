export type AgentStatus = 'idle' | 'thinking' | 'working' | 'done' | 'error';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  task: string | null;
  progress: number; // 0..1
  output: string[]; // recent log/output lines, newest last
  deskId: string;
}

/**
 * The single contract the entire 3D scene reads from. v1 ships MockAgentSource;
 * a future LiveAgentSource (WebSocket -> real orchestrator) implements the same
 * interface and drops in with zero scene changes.
 */
export interface AgentSource {
  getAgents(): Agent[];
  subscribe(cb: (agents: Agent[]) => void): () => void;
  sendTask(agentId: string, task: string): void;
  start(): void;
  stop(): void;
}
