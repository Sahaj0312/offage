import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_WS_PORT } from '../shared/agent';
import type { AgentConfig, OffageConfig } from '../server/config';
import { loadConfig } from '../server/config';
import { probeAuth } from '../server/auth';
import { planTeam, type TeamPlan } from '../server/planner';
import { makeOrchestrator, startServer } from '../server/serve';
import type { Orchestrator } from '../server/orchestrator';
import { Manager } from '../server/manager';
import { Coordinator } from '../server/coordinator';
import type { ChatRole } from '../shared/agent';
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
    sp.succeed(`Logged in — Claude Code v${info.version} · model ${c.bold(info.model)}`);
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

const FEED_COLORS = [c.cyan, c.green, c.magenta, c.yellow, c.blue];

/** Print a live, colored feed of each agent's output + status to the terminal. */
function attachFeed(orchestrator: Orchestrator) {
  const seen = new Map<string, number>();
  const lastStatus = new Map<string, string>();
  orchestrator.onChange((agents) => {
    agents.forEach((a, i) => {
      if (a.kind === 'manager') return; // the Manager is shown via the chat, not the worker feed
      const tag = FEED_COLORS[i % FEED_COLORS.length](a.name.padEnd(9));
      const prev = seen.get(a.id) ?? 0;
      if (a.output.length > prev) {
        for (const line of a.output.slice(prev)) {
          process.stdout.write(`  ${tag} ${c.dim(line.replace(/^>\s?/, ''))}\n`);
        }
        seen.set(a.id, a.output.length);
      }
      if (lastStatus.get(a.id) !== a.status) {
        lastStatus.set(a.id, a.status);
        if (a.status === 'done') process.stdout.write(`  ${tag} ${c.green('● done')}\n`);
        else if (a.status === 'error') process.stdout.write(`  ${tag} ${c.red('● error')}\n`);
      }
    });
  });
}

/** Print a Manager/system chat line in the terminal ('user' is echoed by readline). */
function printChat(role: ChatRole, text: string) {
  if (role === 'user') return;
  if (role === 'system') console.log(`  ${c.yellow(text)}`);
  else console.log(`\n  ${c.cyan('⊹ Manager')}  ${text}`);
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
  const cfg: OffageConfig = {
    ...config,
    model: arg('--model') ?? config.model,
    workdir: arg('--workdir') ? resolve(process.cwd(), arg('--workdir') as string) : config.workdir,
    maxTurns: Number(arg('--max-turns') ?? config.maxTurns),
  };

  // Agents spawn with cwd = workdir; a missing dir makes the SDK fail to launch.
  // Create it so `--workdir ~/new-project` just works.
  if (!MOCK) {
    try {
      mkdirSync(cfg.workdir, { recursive: true });
    } catch (err) {
      console.error(c.red(`\n  Can't use workdir ${cfg.workdir}: ${(err as Error).message}\n`));
      process.exit(1);
    }
  }

  if (!MOCK && !(await ensureAuth(cfg))) process.exit(1);

  const goal = await getGoal();
  if (!goal) {
    console.log(c.dim('\n  No goal given — see you next time.\n'));
    process.exit(0);
  }

  // Agent tool capabilities (computed before planning so tasks match what agents
  // can actually do). bypassPermissions ignores the allowlist, so disallowedTools
  // is what enforces these limits.
  const READ = ['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch'];
  const WRITE = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'];
  const canWrite = (has('--write') || has('--build')) && !has('--read-only');
  const canBash = canWrite && has('--bash');
  const allowedTools = [...READ, ...(canWrite ? WRITE : []), ...(canBash ? ['Bash'] : [])];
  const disallowedTools = [...(canWrite ? [] : WRITE), ...(canBash ? [] : ['Bash'])];
  const caps = { write: canWrite, bash: canBash };

  // Plan the team.
  let plan: TeamPlan;
  if (MOCK) {
    plan = MOCK_PLAN;
  } else {
    const sp = spinner('Claude is assembling your team…');
    try {
      plan = await planTeam(goal, cfg, caps);
      sp.succeed(`Claude assembled a team of ${c.bold(String(plan.agents.length))}.`);
    } catch (err) {
      sp.fail(`Planning failed: ${(err as Error).message}`);
      process.exit(1);
    }
  }
  printTeam(plan);

  const workers = rosterFromPlan(plan);
  const useManager = !MOCK;
  // The Manager is a 'manager'-kind agent at its own desk; workers are the rest.
  const agents = useManager
    ? [...workers, { id: 'manager', name: 'Manager', role: 'Lead — coordinates the team', deskId: 'manager', kind: 'manager' as const }]
    : workers;

  // Isolate concurrent writers in their own git worktrees so they can't collide.
  // Default on for multi-agent --write builds; --isolate / --no-isolate to force.
  const isolate = has('--isolate')
    ? true
    : has('--no-isolate')
      ? false
      : !MOCK && canWrite && workers.length > 1;

  const runConfig: OffageConfig = {
    ...cfg,
    provider: MOCK ? 'mock' : 'claude-agent-sdk',
    agents,
    allowedTools,
    disallowedTools,
    isolate,
    concurrency: Math.max(workers.length, cfg.concurrency),
  };

  const orchestrator = makeOrchestrator(runConfig);

  // Wire up the lead agent (Manager) + coordinator before serving, so in-world
  // chat messages can route straight to it.
  const autonomous = has('--auto');
  const maxRounds = Number(arg('--max-rounds') ?? 6);
  let coordinator: Coordinator | null = null;
  if (useManager) {
    const manager = new Manager(cfg, goal, plan.agents.map((a) => ({ name: a.name, role: a.role })), caps);
    const nameToId = new Map(workers.map((w) => [w.name.toLowerCase(), w.id]));
    coordinator = new Coordinator(orchestrator, manager, nameToId, autonomous, maxRounds);
  }

  const sp = spinner('Loading your office…');
  const server = await startServer({
    orchestrator,
    port: PORT,
    serveDist: true,
    open: !NO_OPEN,
    onMessage: (text) => coordinator?.userTurn(text),
  });
  sp.succeed('Your office is ready.');

  // Mirror the Manager conversation to the terminal and to every browser.
  coordinator?.onChat((role, text) => {
    printChat(role, text);
    server.broadcast({ type: 'chat', role, text });
  });

  const link = hyperlink(server.url);
  const count = `${workers.length} ${workers.length === 1 ? 'agent' : 'agents'}`;
  console.log(`\n  ${c.green('●')} ${c.bold(count)} at work in ${MOCK ? c.dim('(mock)') : c.dim(runConfig.workdir)}`);
  if (!MOCK) {
    console.log(
      canWrite
        ? `  ${c.yellow('⚠ agents can create & edit files' + (has('--bash') ? ' and run commands' : '') + ' in this directory')}`
        : `  ${c.dim('read-only: agents will explore & plan but not write files. Re-run with --write to let them build.')}`,
    );
    if (isolate)
      console.log(
        `  ${c.dim('⎇ isolation on: each agent works on its own git branch, merged into the workdir when done')}`,
      );
    if (autonomous)
      console.log(`  ${c.dim(`↻ autonomous: the Manager keeps delegating until the goal is met (up to ${maxRounds} rounds)`)}`);
  }
  console.log(
    `  ${c.bold('Enter your office:')} ${c.cyan(link)}` +
      `\n  ${c.dim('Walk: WASD + mouse · Inspect/assign: E · Manager desk: chat · Quit: Ctrl+C')}\n`,
  );

  // Stream a live feed to the terminal, then send each worker off on its first task.
  console.log(c.dim('  live activity ─────────────────────────────'));
  attachFeed(orchestrator);
  workers.forEach((w, i) => orchestrator.assign(w.id, plan.agents[i].task));

  const shutdown = () => {
    console.log(c.dim('\n  Closing the office. Bye!\n'));
    server.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);

  if (coordinator) {
    // Manager waits for the first round, summarizes, then we converse.
    await coordinator.runInitialRound(workers.map((w) => w.id));
    const rl = readline.createInterface({ input: stdin, output: stdout });
    rl.on('SIGINT', () => {
      rl.close();
      shutdown();
    });
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const text = (await rl.question(c.cyan('\nyou › '))).trim();
      if (!text) continue;
      if (text === '/quit' || text === '/exit') break;
      await coordinator.userTurn(text);
    }
    rl.close();
    shutdown();
  } else {
    process.on('SIGINT', shutdown);
  }
}

main().catch((err) => {
  console.error(c.red('\n  offage crashed: ') + (err as Error).message);
  process.exit(1);
});
