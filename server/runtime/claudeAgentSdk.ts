import { query } from '@anthropic-ai/claude-agent-sdk';
import type { AgentConfig, OffageConfig } from '../config';
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
  constructor(private cfg: OffageConfig) {}

  async run(
    agent: AgentConfig,
    task: string,
    emit: (e: RuntimeEvent) => void,
    controller: AbortController,
  ) {
    const allowedTools = agent.allowedTools ?? this.cfg.allowedTools;
    const allowed = new Set(allowedTools);
    emit({ status: 'thinking', task, progress: 0, appendOutput: `> ${task}` });

    let progress = 0;
    try {
      const stream = query({
        prompt: task,
        options: {
          cwd: this.cfg.workdir,
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
          if (msg.is_error || msg.subtype !== 'success') {
            emit({
              status: 'error',
              progress: 1,
              appendOutput: `> ERROR: ${msg.subtype ?? 'failed'}`,
            });
          } else {
            emit({
              status: 'done',
              progress: 1,
              appendOutput: ['> ' + firstLine(msg.result || 'complete'), '> task complete ✓'],
            });
          }
        }
      }
    } catch (err) {
      emit({
        status: 'error',
        progress: 1,
        appendOutput: `> ERROR: ${(err as Error).message}`,
      });
    }
  }
}
