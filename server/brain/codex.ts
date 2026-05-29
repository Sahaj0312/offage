import { Codex } from '@openai/codex-sdk';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AuthInfo, Brain } from './types';

/**
 * Codex brain: planner / Manager / auth backed by the OpenAI Codex SDK. Auth is
 * resolved like the `codex` CLI (ChatGPT login in ~/.codex/auth.json, or
 * CODEX_API_KEY). Codex supports native structured output via `outputSchema`,
 * so `complete` passes the schema through when given (schemas must be strict:
 * every object has additionalProperties:false and lists all keys in `required`).
 */
export class CodexBrain implements Brain {
  readonly provider = 'codex';
  private codex = new Codex();
  constructor(private model?: string) {}

  async probeAuth(): Promise<AuthInfo | null> {
    // A real call is the reliable check, but it costs a turn; first do a cheap
    // local credential check and only then confirm with a tiny read-only run.
    const hasCreds = !!process.env.CODEX_API_KEY || existsSync(join(homedir(), '.codex', 'auth.json'));
    if (!hasCreds) return null;
    try {
      const thread = this.codex.startThread({
        sandboxMode: 'read-only',
        approvalPolicy: 'never',
        skipGitRepoCheck: true,
        ...(this.model ? { model: this.model } : {}),
      });
      await thread.run('Reply with: ok');
      return { label: `Codex SDK${this.model ? ` · model ${this.model}` : ''}` };
    } catch {
      return null;
    }
  }

  async complete(system: string, prompt: string, schema?: object): Promise<string> {
    const thread = this.codex.startThread({
      sandboxMode: 'read-only',
      approvalPolicy: 'never',
      skipGitRepoCheck: true,
      ...(this.model ? { model: this.model } : {}),
    });
    // Codex has no separate system-prompt option; prepend it to the input.
    const turn = await thread.run(`${system}\n\n${prompt}`, schema ? { outputSchema: schema } : undefined);
    return turn.finalResponse;
  }
}
