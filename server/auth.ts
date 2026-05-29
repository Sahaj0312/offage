import { query } from '@anthropic-ai/claude-agent-sdk';

export interface AuthInfo {
  version: string;
  model: string;
  apiKeySource: string;
}

/**
 * Detects whether the Claude Agent SDK can authenticate (same auth as the
 * `claude` CLI: subscription login or ANTHROPIC_API_KEY). Runs a minimal 1-turn
 * query and reads the SDK's init handshake. Returns null if not authenticated.
 */
export async function probeAuth(model?: string): Promise<AuthInfo | null> {
  try {
    const stream = query({
      prompt: 'Reply with: ok',
      options: { maxTurns: 1, allowedTools: [], ...(model ? { model } : {}) },
    });
    let info: AuthInfo | null = null;
    for await (const msg of stream) {
      if (msg.type === 'system' && msg.subtype === 'init') {
        info = {
          version: msg.claude_code_version,
          model: msg.model,
          apiKeySource: msg.apiKeySource,
        };
      }
    }
    return info;
  } catch {
    return null;
  }
}
