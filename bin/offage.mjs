#!/usr/bin/env node
/**
 * `offage` launcher: builds the UI if needed, then starts the local orchestrator
 * serving the office on one port. Delegates to tsx so the TS server runs directly.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function run(cmd, cmdArgs) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, cmdArgs, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`))));
  });
}

const distIndex = resolve(root, 'dist', 'index.html');
if (!existsSync(distIndex)) {
  console.log('[offage] building UI (first run)…');
  await run('npm', ['run', 'build']);
}

await run('npx', ['tsx', 'server/index.ts', '--serve-dist', ...args]);
