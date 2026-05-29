import { query } from '@anthropic-ai/claude-agent-sdk';
import type { AuthInfo, Brain } from './types';

/**
 * Claude brain: planner / Manager / auth backed by the Claude Agent SDK. Auth is
 * resolved like the `claude` CLI (subscription login or ANTHROPIC_API_KEY).
 * Claude has no native output-schema here, so `complete` ignores `schema` and the
 * caller parses JSON from the text (prompts already instruct JSON-only).
 */
export class ClaudeBrain implements Brain {
  readonly provider = 'claude';
  constructor(private model?: string) {}

  async probeAuth(): Promise<AuthInfo | null> {
    try {
      const stream = query({
        prompt: 'Reply with: ok',
        options: { maxTurns: 1, allowedTools: [], ...(this.model ? { model: this.model } : {}) },
      });
      let info: AuthInfo | null = null;
      for await (const msg of stream) {
        if (msg.type === 'system' && msg.subtype === 'init') {
          info = { label: `Claude Code v${msg.claude_code_version} · model ${msg.model}` };
        }
      }
      return info;
    } catch {
      return null;
    }
  }

  async complete(system: string, prompt: string, _schema?: object): Promise<string> {
    let text = '';
    const stream = query({
      prompt,
      options: {
        systemPrompt: system,
        allowedTools: [],
        maxTurns: 8, // headroom for thinking + transient retries
        ...(this.model ? { model: this.model } : {}),
      },
    });
    for await (const msg of stream) {
      if (msg.type === 'assistant') {
        for (const b of msg.message.content) if (b.type === 'text') text += b.text;
      } else if (msg.type === 'result' && msg.subtype === 'success' && msg.result) {
        text = msg.result;
      }
    }
    return text;
  }
}
