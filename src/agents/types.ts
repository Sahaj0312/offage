// Re-export the canonical model so the whole frontend keeps importing from here,
// while the single source of truth lives in shared/ (used by the server too).
export type { Agent, AgentStatus } from '../../shared/agent';

import type { Agent } from '../../shared/agent';

/**
 * The single contract the entire 3D scene reads from. v1 ships MockAgentSource;
 * WebSocketAgentSource talks to the local orchestrator over the same interface,
 * so swapping them is a one-line change with zero scene changes.
 */
export interface AgentSource {
  getAgents(): Agent[];
  subscribe(cb: (agents: Agent[]) => void): () => void;
  sendTask(agentId: string, task: string): void;
  start(): void;
  stop(): void;
}
