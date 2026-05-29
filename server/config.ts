import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';

export type ProviderKind = 'claude-agent-sdk' | 'mock';

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  deskId: string;
  kind?: 'worker' | 'manager';
  /** optional per-agent system prompt appended to the runtime's base prompt */
  systemPrompt?: string;
  /** optional per-agent tool allowlist override */
  allowedTools?: string[];
}

export interface OffageConfig {
  provider: ProviderKind;
  /** directory agents operate in (read-only by default) */
  workdir: string;
  model?: string;
  /** default tool allowlist — read-only tools by default for safety */
  allowedTools: string[];
  /** tools to hard-block (enforced even under bypassPermissions) */
  disallowedTools?: string[];
  /** run each agent in its own git worktree + branch, merged back on completion */
  isolate?: boolean;
  /** how many agents may run concurrently */
  concurrency: number;
  maxTurns: number;
  agents: AgentConfig[];
}

// Built-in roster mirrors the demo office (desks d1..d6 exist in the scene layout).
const DEFAULT_AGENTS: AgentConfig[] = [
  { id: 'a1', name: 'Scout', role: 'Research & retrieval', deskId: 'd1' },
  { id: 'a2', name: 'Drafter', role: 'Writes first-pass code', deskId: 'd2' },
  { id: 'a3', name: 'Critic', role: 'Reviews & refutes', deskId: 'd3' },
  { id: 'a4', name: 'Wrangler', role: 'Data extraction', deskId: 'd4' },
  { id: 'a5', name: 'Tester', role: 'Runs & verifies', deskId: 'd5' },
  { id: 'a6', name: 'Synth', role: 'Synthesizes results', deskId: 'd6' },
];

// Read-only tools: agents can explore but not edit/run, a safe default for a
// "watch the office work" experience. Widen this in your config deliberately.
const READ_ONLY_TOOLS = ['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch'];

const DEFAULTS: OffageConfig = {
  provider: 'mock',
  workdir: process.cwd(),
  allowedTools: READ_ONLY_TOOLS,
  concurrency: 3,
  maxTurns: 30,
  agents: DEFAULT_AGENTS,
};

function expandHome(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}

/** Locate a config file: explicit path, then ./offage.config.json, then ~/.offage/config.json. */
function findConfigPath(explicit?: string): string | null {
  const candidates = [
    explicit,
    join(process.cwd(), 'offage.config.json'),
    join(homedir(), '.offage', 'config.json'),
  ].filter(Boolean) as string[];
  return candidates.find((p) => existsSync(p)) ?? null;
}

export function loadConfig(explicitPath?: string): { config: OffageConfig; source: string } {
  const path = findConfigPath(explicitPath);
  let fileCfg: Partial<OffageConfig> = {};
  let source = 'built-in defaults';
  if (path) {
    try {
      fileCfg = JSON.parse(readFileSync(path, 'utf8')) as Partial<OffageConfig>;
      source = path;
    } catch (err) {
      console.warn(`[offage] failed to parse ${path}: ${(err as Error).message} — using defaults`);
    }
  }

  const agents = (fileCfg.agents ?? DEFAULTS.agents).map((a, i) => ({
    ...a,
    id: a.id ?? `a${i + 1}`,
    deskId: a.deskId ?? `d${i + 1}`,
  }));

  const config: OffageConfig = {
    provider: fileCfg.provider ?? DEFAULTS.provider,
    workdir: resolve(expandHome(fileCfg.workdir ?? DEFAULTS.workdir)),
    model: fileCfg.model ?? DEFAULTS.model,
    allowedTools: fileCfg.allowedTools ?? DEFAULTS.allowedTools,
    disallowedTools: fileCfg.disallowedTools ?? DEFAULTS.disallowedTools,
    isolate: fileCfg.isolate ?? DEFAULTS.isolate,
    concurrency: fileCfg.concurrency ?? DEFAULTS.concurrency,
    maxTurns: fileCfg.maxTurns ?? DEFAULTS.maxTurns,
    agents,
  };
  return { config, source };
}

export { READ_ONLY_TOOLS };
