import type { AgentStatus } from '../../shared/agent';
import type { AgentConfig } from '../config';

/** An incremental update produced while an agent runs a task. */
export interface RuntimeEvent {
  status?: AgentStatus;
  /** absolute progress 0..1 */
  progress?: number;
  task?: string | null;
  /** one or more log/output lines to append to the agent's monitor */
  appendOutput?: string | string[];
}

/**
 * A pluggable agent backend. Implementations stream a task to completion,
 * emitting RuntimeEvents. The orchestrator maps those onto agent state and
 * broadcasts to the office.
 */
export interface AgentRuntime {
  readonly name: string;
  run(
    agent: AgentConfig,
    task: string,
    emit: (e: RuntimeEvent) => void,
    controller: AbortController,
  ): Promise<void>;
  /** Optional teardown (e.g. remove leftover git worktrees) on shutdown. */
  cleanup?(): Promise<void>;
}

export function firstLine(text: string, max = 80): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > max ? line.slice(0, max - 1) + '…' : line;
}
