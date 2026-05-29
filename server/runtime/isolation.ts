import { firstLine, type RuntimeEvent } from './types';
import type { AgentConfig } from '../config';
import { WorktreeManager, type Worktree } from '../worktree';

export interface Outcome {
  status: 'done' | 'error';
  lines: string[];
}

/**
 * Shared per-agent lifecycle used by every worker runtime (Claude, Codex, …):
 *   thinking → (acquire isolated git worktree) → run the body in that cwd →
 *   merge the work back BEFORE reporting 'done' (so a completed agent is never
 *   interrupted) → emit the terminal status.
 *
 * `body(cwd)` runs the provider-specific agent, emits intermediate 'working'
 * events, and returns the terminal Outcome — or null if it ended without a
 * terminal result (e.g. aborted), in which case isolated work is discarded.
 */
export async function runIsolated(opts: {
  mgr: WorktreeManager | null;
  agent: AgentConfig;
  task: string;
  defaultCwd: string;
  controller: AbortController;
  emit: (e: RuntimeEvent) => void;
  body: (cwd: string) => Promise<Outcome | null>;
}): Promise<void> {
  const { mgr, agent, task, defaultCwd, controller, emit, body } = opts;
  emit({ status: 'thinking', task, progress: 0, appendOutput: `> ${task}` });

  let wt: Worktree | null = null;
  let cwd = defaultCwd;
  if (mgr) {
    try {
      wt = await mgr.acquire(agent.name);
      cwd = wt.path;
      emit({ appendOutput: `> isolated workspace · branch ${wt.branch}` });
    } catch (e) {
      emit({ appendOutput: `> (isolation unavailable: ${(e as Error).message})` });
    }
  }

  let outcome: Outcome | null = null;
  try {
    outcome = await body(cwd);
  } catch (err) {
    outcome = { status: 'error', lines: [`> ERROR: ${(err as Error).message}`] };
  }

  // Aborted before reaching a terminal result (re-tasked / shut down): drop the
  // isolated work and leave state to whatever caused the abort.
  if (!outcome && controller.signal.aborted) {
    if (mgr && wt) await mgr.discard(wt).catch(() => {});
    return;
  }
  if (!outcome) outcome = { status: 'error', lines: ['> ERROR: ended without a result'] };

  // Merge the agent's isolated work back FIRST, then report the terminal status.
  const lines = [...outcome.lines];
  if (mgr && wt) {
    try {
      const res = await mgr.finalize(wt, `offage: ${agent.name} — ${firstLine(task, 60)}`);
      lines.push(res.conflict ? `> ⚠ merge conflict — work kept on branch ${res.branch}` : `> merged into ${mgr.base}`);
    } catch (e) {
      lines.push(`> (merge failed: ${(e as Error).message})`);
    }
  }
  emit({ status: outcome.status, progress: 1, appendOutput: lines });
}
