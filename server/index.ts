import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '../shared/agent';
import { DEFAULT_WS_PORT } from '../shared/agent';
import { loadConfig } from './config';
import { MockOrchestrator, TaskOrchestrator, type Orchestrator } from './orchestrator';
import { ClaudeAgentSdkRuntime } from './runtime/claudeAgentSdk';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = resolve(__dirname, '../dist');

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (flag: string) => process.argv.includes(flag);

const port = Number(arg('--port') ?? process.env.OFFAGE_PORT ?? DEFAULT_WS_PORT);
const serveDist = has('--serve-dist') || has('--serve');
const noOpen = has('--no-open');

const { config, source } = loadConfig(arg('--config'));

function makeOrchestrator(): Orchestrator {
  if (config.provider === 'claude-agent-sdk') {
    return new TaskOrchestrator(config.agents, new ClaudeAgentSdkRuntime(config), config.concurrency);
  }
  return new MockOrchestrator(config.agents);
}
const orchestrator = makeOrchestrator();

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

async function serveStatic(req: IncomingMessage, res: ServerResponse) {
  if (!serveDist || !existsSync(DIST)) {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('Offage orchestrator running. Open the Vite dev server (5173) or run with --serve-dist.');
    return;
  }
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let filePath = join(DIST, normalize(urlPath));
  if (!filePath.startsWith(DIST)) filePath = join(DIST, 'index.html'); // traversal guard
  if (urlPath === '/' || !existsSync(filePath)) filePath = join(DIST, 'index.html');
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}

const http = createServer(serveStatic);
const wss = new WebSocketServer({ server: http });

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

wss.on('connection', (ws) => {
  const unsub = orchestrator.onChange((agents) =>
    send(ws, { type: 'snapshot', agents, provider: orchestrator.provider }),
  );
  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === 'task') orchestrator.assign(msg.agentId, msg.task);
  });
  ws.on('close', unsub);
});

orchestrator.start();

http.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`\n  Offage orchestrator`);
  console.log(`  provider : ${orchestrator.provider}`);
  console.log(`  config   : ${source}`);
  console.log(`  workdir  : ${config.workdir}`);
  console.log(`  agents   : ${config.agents.map((a) => a.name).join(', ')}`);
  console.log(`  ws/http  : ${url}\n`);
  if (serveDist) {
    console.log(`  → open ${url}`);
    if (!noOpen && process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore' }).unref();
  } else {
    console.log(`  → run the UI with: npm run dev  (connects here automatically)`);
  }
});

const shutdown = () => {
  orchestrator.stop();
  http.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
