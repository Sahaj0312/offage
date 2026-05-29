/**
 * The "brain" is the reasoning LLM behind the non-worker parts of Offage: the
 * team planner, the Manager (lead agent), and the login check. It is separate
 * from the worker AgentRuntime so the whole system can run on Claude OR Codex.
 */

export interface AuthInfo {
  /** human-readable one-liner, e.g. "Claude Code v2.1, model …" */
  label: string;
}

export interface Brain {
  /** 'claude' | 'codex' */
  readonly provider: string;
  /** Detect whether this provider is authenticated locally; null if not. */
  probeAuth(): Promise<AuthInfo | null>;
  /**
   * One-shot text completion. `schema` (a strict JSON schema) is used natively
   * where supported (Codex outputSchema); otherwise the prompt instructs JSON
   * and the caller parses defensively.
   */
  complete(system: string, prompt: string, schema?: object): Promise<string>;
}
