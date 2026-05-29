import { DEFAULT_WS_PORT } from '../shared/agent';
import { loadConfig } from './config';
import { makeOrchestrator, startServer } from './serve';

/**
 * Non-interactive entry: load config, start the orchestrator + server.
 * Used by `npm run server` / `serve` / `dev:all`. The polished interactive
 * experience lives in cli/index.ts (the `offage` command).
 */

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (flag: string) => process.argv.includes(flag);

const port = Number(arg('--port') ?? process.env.OFFAGE_PORT ?? DEFAULT_WS_PORT);
const serveDist = has('--serve-dist') || has('--serve');
const open = serveDist && !has('--no-open');

const { config, source } = loadConfig(arg('--config'));
const orchestrator = makeOrchestrator(config);

startServer({ orchestrator, port, serveDist, open }).then((server) => {
  console.log(`\n  Offage orchestrator`);
  console.log(`  provider : ${orchestrator.provider}`);
  console.log(`  config   : ${source}`);
  console.log(`  workdir  : ${config.workdir}`);
  console.log(`  agents   : ${config.agents.map((a) => a.name).join(', ')}`);
  console.log(`  ws/http  : ${server.url}\n`);
  console.log(serveDist ? `  → open ${server.url}` : `  → run the UI with: npm run dev  (connects here automatically)`);

  const shutdown = () => {
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
});
