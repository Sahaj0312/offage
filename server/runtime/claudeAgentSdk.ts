import { query } from '@anthropic-ai/claude-agent-sdk';
import type { AgentConfig, OffageConfig } from '../config';
import { WorktreeManager } from '../worktree';
import { firstLine, type AgentRuntime, type RuntimeEvent } from './types';
import { runIsolated, type Outcome } from './isolation';

/** Turn a tool call into a readable one-liner, e.g. `tool: Write src/index.html`. */
function toolSummary(name: string, input: unknown): string {
  const o = (input ?? {}) as Record<string, unknown>;
  const arg = o.file_path ?? o.path ?? o.pattern ?? o.command ?? o.query ?? o.url ?? o.prompt ?? '';
  const detail = typeof arg === 'string' && arg ? ' ' + firstLine(arg, 70) : '';
  return `tool: ${name}${detail}`;
}

/**
 * Drives a Claude agent via the Claude Agent SDK. Auth is resolved by the SDK
 * exactly like the `claude` CLI (subscription login or ANTHROPIC_API_KEY) — Offage
 * never sees credentials. The toolset is enforced as a true allow-list via
 * canUseTool, so read-only / --write / --bash modes actually hold.
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

  async run(agent: AgentConfig, task: string, emit: (e: RuntimeEvent) => void, controller: AbortController) {
    const allowedTools = agent.allowedTools ?? this.cfg.allowedTools;
    const allowed = new Set(allowedTools);
    const mgr = await this.worktrees();

    await runIsolated({
      mgr,
      agent,
      task,
      defaultCwd: this.cfg.workdir,
      controller,
      emit,
      body: async (cwd): Promise<Outcome | null> => {
        let progress = 0;
        let outcome: Outcome | null = null;
        const stream = query({
          prompt: task,
          options: {
            cwd,
            allowedTools,
            maxTurns: this.cfg.maxTurns,
            abortController: controller,
            ...(this.cfg.model ? { model: this.cfg.model } : {}),
            // Keep Claude Code's default prompt (cwd/env/tooling) + this agent's role.
            systemPrompt: { type: 'preset', preset: 'claude_code', append: agent.systemPrompt ?? '' },
            // Enforce the toolset as an allow-list: deny anything not permitted (no
            // prompt, no hang) — catches shell-capable tools like Bash/Monitor too.
            permissionMode: 'default',
            canUseTool: async (toolName: string, input: Record<string, unknown>) =>
              allowed.has(toolName)
                ? { behavior: 'allow', updatedInput: input }
                : {
                    behavior: 'deny',
                    message: `Offage: the "${toolName}" tool is disabled in this office. Allowed: ${allowedTools.join(', ')}.`,
                  },
          },
        });

        for await (const msg of stream) {
          if (controller.signal.aborted) break;
          if (msg.type === 'assistant') {
            const lines: string[] = [];
            for (const block of msg.message.content) {
              if (block.type === 'text' && block.text.trim()) lines.push('> ' + firstLine(block.text, 160));
              else if (block.type === 'tool_use') lines.push('> ' + toolSummary(block.name, (block as { input?: unknown }).input));
            }
            progress = Math.min(0.9, progress + 0.12);
            emit({ status: 'working', progress, ...(lines.length ? { appendOutput: lines } : {}) });
          } else if (msg.type === 'result') {
            outcome =
              msg.is_error || msg.subtype !== 'success'
                ? { status: 'error', lines: [`> ERROR: ${msg.subtype ?? 'failed'}`] }
                : { status: 'done', lines: ['> ' + firstLine(msg.result || 'complete'), '> task complete ✓'] };
          }
        }
        return outcome;
      },
    });
  }
}
