import { Codex, type SandboxMode } from '@openai/codex-sdk';
import type { AgentConfig, OffageConfig } from '../config';
import { WorktreeManager } from '../worktree';
import { firstLine, type AgentRuntime, type RuntimeEvent } from './types';
import { runIsolated, type Outcome } from './isolation';

/**
 * Map Offage's tool capabilities (derived from the allowedTools list the CLI
 * builds from --write/--bash) onto Codex's sandbox model:
 *   read-only       — explore only, no file writes
 *   workspace-write — create/edit files in the workspace (local cmds allowed)
 *   danger-full-access — full access incl. network/git (our --bash tier)
 */
function sandboxFor(allowed: string[]): SandboxMode {
  if (allowed.includes('Bash')) return 'danger-full-access';
  if (allowed.includes('Write')) return 'workspace-write';
  return 'read-only';
}

/**
 * Drives an agent via the OpenAI Codex SDK. Auth is resolved like the `codex`
 * CLI (ChatGPT login or CODEX_API_KEY) — Offage never sees credentials.
 * approvalPolicy:'never' makes it fully non-interactive; the sandbox enforces
 * what it can touch.
 */
export class CodexRuntime implements AgentRuntime {
  readonly name = 'codex';
  private codex = new Codex();
  private wtPromise?: Promise<WorktreeManager | null>;
  constructor(private cfg: OffageConfig) {}

  private worktrees(): Promise<WorktreeManager | null> {
    if (!this.cfg.isolate) return Promise.resolve(null);
    if (!this.wtPromise) this.wtPromise = WorktreeManager.create(this.cfg.workdir, String(process.pid));
    return this.wtPromise;
  }

  async cleanup() {
    const mgr = this.wtPromise ? await this.wtPromise : null;
    if (mgr) await mgr.cleanup();
  }

  async run(agent: AgentConfig, task: string, emit: (e: RuntimeEvent) => void, controller: AbortController) {
    const allowedTools = agent.allowedTools ?? this.cfg.allowedTools;
    const sandboxMode = sandboxFor(allowedTools);
    const mgr = await this.worktrees();

    await runIsolated({
      mgr,
      agent,
      task,
      defaultCwd: this.cfg.workdir,
      controller,
      emit,
      body: async (cwd): Promise<Outcome | null> => {
        const thread = this.codex.startThread({
          workingDirectory: cwd,
          sandboxMode,
          approvalPolicy: 'never',
          skipGitRepoCheck: true,
          ...(this.cfg.model ? { model: this.cfg.model } : {}),
        });
        // Prepend the agent's role (Codex has no separate system-prompt option).
        const prompt = agent.systemPrompt ? `${agent.systemPrompt}\n\n${task}` : task;
        const { events } = await thread.runStreamed(prompt, { signal: controller.signal });

        let progress = 0;
        let outcome: Outcome | null = null;
        for await (const ev of events) {
          if (controller.signal.aborted) break;
          if (ev.type === 'item.completed') {
            const it = ev.item as Record<string, unknown> & { type: string };
            const line = codexItemLine(it);
            if (line) {
              progress = Math.min(0.9, progress + 0.1);
              emit({ status: 'working', progress, appendOutput: line });
            }
          } else if (ev.type === 'turn.completed') {
            outcome = { status: 'done', lines: ['> task complete ✓'] };
          } else if (ev.type === 'turn.failed' || ev.type === 'error') {
            const msg = ev.type === 'error' ? ev.message : JSON.stringify((ev as { error?: unknown }).error ?? 'failed');
            outcome = { status: 'error', lines: [`> ERROR: ${firstLine(msg, 120)}`] };
          }
        }
        return outcome;
      },
    });
  }
}

/** Render a Codex thread item as a single monitor/feed line. */
function codexItemLine(it: Record<string, unknown> & { type: string }): string | null {
  switch (it.type) {
    case 'agent_message':
      return typeof it.text === 'string' && it.text.trim() ? '> ' + firstLine(it.text, 160) : null;
    case 'command_execution':
      return '> ' + firstLine(`tool: $ ${String(it.command ?? '')}`, 90);
    case 'file_change': {
      const changes = (it.changes as { path: string; kind: string }[]) ?? [];
      const names = changes.map((c) => `${c.kind} ${c.path.split('/').pop()}`).join(', ');
      return '> ' + firstLine(`edit: ${names}`, 90);
    }
    case 'mcp_tool_call':
      return `> tool: ${String(it.server ?? '')}/${String(it.tool ?? '')}`;
    case 'web_search':
      return '> ' + firstLine(`search: ${String(it.query ?? '')}`, 90);
    default:
      return null; // reasoning, todo_list, etc. — keep the feed focused
  }
}
