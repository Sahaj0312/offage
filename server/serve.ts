import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { WebSocketServer } from 'ws';
import type { ClientMessage, ServerMessage } from '../shared/agent';
import type { OffageConfig } from './config';
import { MockOrchestrator, TaskOrchestrator, type Orchestrator } from './orchestrator';
import { ClaudeAgentSdkRuntime } from './runtime/claudeAgentSdk';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = resolve(__dirname, '../dist');

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

/** Pick the orchestrator implementation for a config's provider. */
export function makeOrchestrator(config: OffageConfig): Orchestrator {
  if (config.provider === 'claude-agent-sdk') {
    return new TaskOrchestrator(config.agents, new ClaudeAgentSdkRuntime(config), config.concurrency);
  }
  return new MockOrchestrator(config.agents);
}

async function serveStatic(req: IncomingMessage, res: ServerResponse, serveDist: boolean) {
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

export interface StartedServer {
  url: string;
  port: number;
  orchestrator: Orchestrator;
  close(): void;
}

/** Boot the HTTP + WebSocket server for an orchestrator. Returns once listening. */
export function startServer(opts: {
  orchestrator: Orchestrator;
  port: number;
  serveDist: boolean;
  open?: boolean;
}): Promise<StartedServer> {
  const { orchestrator, port, serveDist } = opts;
  return new Promise((resolveStarted) => {
    const http = createServer((req, res) => serveStatic(req, res, serveDist));
    const wss = new WebSocketServer({ server: http });

    wss.on('connection', (ws) => {
      const send = (msg: ServerMessage) => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
      };
      const unsub = orchestrator.onChange((agents) =>
        send({ type: 'snapshot', agents, provider: orchestrator.provider }),
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
      if (opts.open && process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore' }).unref();
      resolveStarted({
        url,
        port,
        orchestrator,
        close: () => {
          orchestrator.stop();
          wss.close();
          http.close();
        },
      });
    });
  });
}
