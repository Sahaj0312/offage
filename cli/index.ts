import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { DEFAULT_WS_PORT } from '../shared/agent';
import type { AgentConfig, OffageConfig } from '../server/config';
import { loadConfig } from '../server/config';
import { probeAuth } from '../server/auth';
import { planTeam, type TeamPlan } from '../server/planner';
import { makeOrchestrator, startServer } from '../server/serve';
import { banner, c, hyperlink, spinner } from './ui';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (flag: string) => process.argv.includes(flag);

const MOCK = has('--mock');
const NO_OPEN = has('--no-open');
const PORT = Number(arg('--port') ?? process.env.OFFAGE_PORT ?? DEFAULT_WS_PORT);

// A canned team for the no-auth demo path (--mock).
const MOCK_PLAN: TeamPlan = {
  summary: 'Demo team (mock mode — no real agents).',
  agents: [
    { name: 'Scout', role: 'Research', systemPrompt: '', task: 'Map the codebase' },
    { name: 'Drafter', role: 'Implementation', systemPrompt: '', task: 'Write the feature' },
    { name: 'Critic', role: 'Review', systemPrompt: '', task: 'Review the diff' },
    { name: 'Tester', role: 'Verification', systemPrompt: '', task: 'Run the tests' },
  ],
};

async function getGoal(): Promise<string> {
  const fromArg = arg('--goal');
  if (fromArg) return fromArg;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(c.bold('\n  What would you like to build today?\n  ') + c.cyan('› '));
  rl.close();
  return answer.trim();
}

async function ensureAuth(config: OffageConfig): Promise<boolean> {
  const sp = spinner('Checking your Claude login…');
  let info = await probeAuth(config.model);
  if (info) {
    sp.succeed(`Logged in — Claude Code v${info.version}, model ${info.model} ${c.dim(`(${info.apiKeySource})`)}`);
    return true;
  }
  sp.fail('Not logged in to Claude.');
  console.log(
    `\n  ${c.yellow('Offage uses your Claude login (it never sees your credentials).')}` +
      `\n  Log in by running ${c.bold('claude')} in another terminal, or set ${c.bold('ANTHROPIC_API_KEY')}.\n`,
  );
  const rl = readline.createInterface({ input: stdin, output: stdout });
  await rl.question(c.dim('  Press Enter to retry once you have logged in… '));
  rl.close();
  const sp2 = spinner('Re-checking…');
  info = await probeAuth(config.model);
  if (info) {
    sp2.succeed(`Logged in — Claude Code v${info.version}, model ${info.model}`);
    return true;
  }
  sp2.fail('Still not logged in. Exiting.');
  return false;
}

function rosterFromPlan(plan: TeamPlan): AgentConfig[] {
  return plan.agents.map((a, i) => ({
    id: `a${i + 1}`,
    name: a.name,
    role: a.role,
    deskId: `d${i + 1}`,
    ...(a.systemPrompt ? { systemPrompt: a.systemPrompt } : {}),
  }));
}

function printTeam(plan: TeamPlan) {
  console.log(`\n  ${c.dim(plan.summary)}\n`);
  plan.agents.forEach((a, i) => {
    console.log(`  ${c.cyan(`${i + 1}.`)} ${c.bold(a.name)} ${c.dim('· ' + a.role)}`);
    console.log(`     ${c.dim(a.task)}`);
  });
}

async function main() {
  console.log(banner());
  const { config } = loadConfig(arg('--config'));

  if (!MOCK && !(await ensureAuth(config))) process.exit(1);

  const goal = await getGoal();
  if (!goal) {
    console.log(c.dim('\n  No goal given — see you next time.\n'));
    process.exit(0);
  }

  // Plan the team.
  let plan: TeamPlan;
  if (MOCK) {
    plan = MOCK_PLAN;
  } else {
    const sp = spinner('Claude is assembling your team…');
    try {
      plan = await planTeam(goal, config);
      sp.succeed(`Claude assembled a team of ${c.bold(String(plan.agents.length))}.`);
    } catch (err) {
      sp.fail(`Planning failed: ${(err as Error).message}`);
      process.exit(1);
    }
  }
  printTeam(plan);

  // Build the run config and boot the office.
  const roster = rosterFromPlan(plan);
  const runConfig: OffageConfig = {
    ...config,
    provider: MOCK ? 'mock' : 'claude-agent-sdk',
    agents: roster,
    concurrency: Math.max(roster.length, config.concurrency),
  };

  const sp = spinner('Loading your office…');
  const orchestrator = makeOrchestrator(runConfig);
  const server = await startServer({ orchestrator, port: PORT, serveDist: true, open: !NO_OPEN });

  // Send each agent off on its first task — the office opens already working.
  plan.agents.forEach((a, i) => orchestrator.assign(`a${i + 1}`, a.task));
  sp.succeed('Your office is ready.');

  const link = hyperlink(server.url);
  console.log(
    `\n  ${c.green('●')} ${c.bold(roster.length + (roster.length === 1 ? ' agent' : ' agents'))} at work in ` +
      `${MOCK ? c.dim('(mock)') : c.dim(runConfig.workdir)}` +
      `\n  ${c.bold('Enter your office:')} ${c.cyan(link)}` +
      `\n  ${c.dim('Walk: WASD + mouse · Inspect/assign: E · Orchestration board: M · Quit: Ctrl+C')}\n`,
  );

  const shutdown = () => {
    console.log(c.dim('\n  Closing the office. Bye!\n'));
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(c.red('\n  offage crashed: ') + (err as Error).message);
  process.exit(1);
});
