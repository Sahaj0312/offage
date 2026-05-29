import { query } from '@anthropic-ai/claude-agent-sdk';
import type { AgentConfig, OffageConfig } from '../config';
import { WorktreeManager, type Worktree } from '../worktree';
import { firstLine, type AgentRuntime, type RuntimeEvent } from './types';

/** Turn a tool call into a readable one-liner, e.g. `tool: Write src/index.html`. */
function toolSummary(name: string, input: unknown): string {
  const o = (input ?? {}) as Record<string, unknown>;
  const arg =
    o.file_path ?? o.path ?? o.pattern ?? o.command ?? o.query ?? o.url ?? o.prompt ?? '';
  const detail = typeof arg === 'string' && arg ? ' ' + firstLine(arg, 70) : '';
  return `tool: ${name}${detail}`;
}

/**
 * Drives a Claude agent via the Claude Agent SDK. Auth is resolved by the SDK
 * exactly like the `claude` CLI (local subscription login, or ANTHROPIC_API_KEY)
 * — Offage never sees credentials.
 *
 * Tools default to the read-only allowlist from config, so `bypassPermissions`
 * is safe: the agent can explore but cannot edit files or run shell commands
 * unless you deliberately widen `allowedTools`.
 */
export class ClaudeAgentSdkRuntime implements AgentRuntime {
  readonly name = 'claude-agent-sdk';
  private wtPromise?: Promise<WorktreeManager | null>;
  constructor(private cfg: OffageConfig) {}

  /** Lazily create one WorktreeManager for the whole session (null if disabled). */
  private worktrees(): Promise<WorktreeManager | null> {
    if (!this.cfg.isolate) return Promise.resolve(null);
    if (!this.wtPromise) this.wtPromise = WorktreeManager.create(this.cfg.workdir, String(process.pid));
    return this.wtPromise;
  }

  async cleanup() {
    const mgr = this.wtPromise ? await this.wtPromise : null;
    if (mgr) await mgr.cleanup();
  }

  async run(
    agent: AgentConfig,
    task: string,
    emit: (e: RuntimeEvent) => void,
    controller: AbortController,
  ) {
    const allowedTools = agent.allowedTools ?? this.cfg.allowedTools;
    const allowed = new Set(allowedTools);
    emit({ status: 'thinking', task, progress: 0, appendOutput: `> ${task}` });

    // Isolated worktree per agent (when enabled and git is available).
    const mgr = await this.worktrees();
    let wt: Worktree | null = null;
    let cwd = this.cfg.workdir;
    if (mgr) {
      try {
        wt = await mgr.acquire(agent.name);
        cwd = wt.path;
        emit({ appendOutput: `> isolated workspace · branch ${wt.branch}` });
      } catch (e) {
        emit({ appendOutput: `> (isolation unavailable: ${(e as Error).message})` });
      }
    }

    let progress = 0;
    let outcome: { status: 'done' | 'error'; lines: string[] } | null = null;
    let completed = false;
    try {
      const stream = query({
        prompt: task,
        options: {
          cwd,
          allowedTools,
          ...(this.cfg.disallowedTools?.length ? { disallowedTools: this.cfg.disallowedTools } : {}),
          maxTurns: this.cfg.maxTurns,
          abortController: controller,
          ...(this.cfg.model ? { model: this.cfg.model } : {}),
          // Keep Claude Code's default prompt (so the agent knows its cwd, env, and
          // how to use tools) and append this agent's role on top.
          systemPrompt: { type: 'preset', preset: 'claude_code', append: agent.systemPrompt ?? '' },
          // Enforce the toolset as a true allow-list: anything not permitted is
          // denied here (no prompt, no hang). This catches shell-capable tools the
          // agent might reach for (Bash, Monitor, …), not just the obvious ones.
          permissionMode: 'default',
          canUseTool: async (toolName: string, input: Record<string, unknown>) =>
            allowed.has(toolName)
              ? { behavior: 'allow', updatedInput: input }
              : {
                  behavior: 'deny',
                  message: `Offage: the "${toolName}" tool is disabled in this office. Allowed tools: ${allowedTools.join(', ')}.`,
                },
        },
      });

      for await (const msg of stream) {
        if (controller.signal.aborted) break;

        if (msg.type === 'assistant') {
          const lines: string[] = [];
          for (const block of msg.message.content) {
            if (block.type === 'text' && block.text.trim()) {
              lines.push('> ' + firstLine(block.text, 160));
            } else if (block.type === 'tool_use') {
              lines.push('> ' + toolSummary(block.name, (block as { input?: unknown }).input));
            }
          }
          progress = Math.min(0.9, progress + 0.12);
          emit({ status: 'working', progress, ...(lines.length ? { appendOutput: lines } : {}) });
        } else if (msg.type === 'result') {
          outcome =
            msg.is_error || msg.subtype !== 'success'
              ? { status: 'error', lines: [`> ERROR: ${msg.subtype ?? 'failed'}`] }
              : {
                  status: 'done',
                  lines: ['> ' + firstLine(msg.result || 'complete'), '> task complete ✓'],
                };
        }
      }
      completed = true;
    } catch (err) {
      outcome = { status: 'error', lines: [`> ERROR: ${(err as Error).message}`] };
    }

    // Aborted before finishing (re-tasked or shut down mid-run): drop the isolated
    // work and leave state to whatever assignment caused the abort.
    if (controller.signal.aborted && !completed) {
      if (mgr && wt) await mgr.discard(wt).catch(() => {});
      return;
    }

    // Merge the agent's isolated work back FIRST, then report the terminal status —
    // so a 'done' status always means the work is already merged (no shutdown race).
    const lines = [...(outcome?.lines ?? [])];
    if (mgr && wt) {
      try {
        const res = await mgr.finalize(wt, `offage: ${agent.name} — ${firstLine(task, 60)}`);
        lines.push(
          res.conflict
            ? `> ⚠ merge conflict — work kept on branch ${res.branch}`
            : `> merged into ${mgr.base}`,
        );
      } catch (e) {
        lines.push(`> (merge failed: ${(e as Error).message})`);
      }
    }
    emit({ status: outcome?.status ?? 'done', progress: 1, appendOutput: lines });
  }
}
