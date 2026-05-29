/**
 * Canonical agent model + WebSocket protocol, shared by the frontend and the
 * local orchestrator server so both sides speak exactly the same shapes.
 */

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
  /** 'manager' is the lead agent you converse with; everyone else is a worker. */
  kind?: 'worker' | 'manager';
}

export type ChatRole = 'user' | 'manager' | 'system';

// ---- WebSocket protocol -----------------------------------------------------

/** Server -> client. */
export type ServerMessage =
  | { type: 'snapshot'; agents: Agent[]; provider: string }
  | { type: 'chat'; role: ChatRole; text: string }
  | { type: 'notice'; level: 'info' | 'warn' | 'error'; text: string };

/** Client -> server. */
export type ClientMessage =
  | { type: 'hello' }
  | { type: 'task'; agentId: string; task: string }
  | { type: 'message'; text: string };

export const DEFAULT_WS_PORT = 8787;
