import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

interface GitResult {
  code: number;
  stdout: string;
  stderr: string;
}

// Identity + settings so commits work in fresh/unconfigured repos and never block.
const GIT_CFG = [
  '-c',
  'user.name=Offage',
  '-c',
  'user.email=offage@local',
  '-c',
  'commit.gpgsign=false',
];

function git(args: string[], cwd: string): Promise<GitResult> {
  return new Promise((resolve) => {
    const p = spawn('git', args, {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_EDITOR: 'true' },
    });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', (e) => resolve({ code: 127, stdout, stderr: String(e) }));
    p.on('close', (code) => {
      if (process.env.OFFAGE_WT_DEBUG)
        console.error(`[wt] git ${args.join(' ')} (cwd=${cwd}) -> code ${code} ${stderr.trim()}`);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

export interface Worktree {
  path: string;
  branch: string;
}

export interface MergeResult {
  merged: boolean;
  conflict: boolean;
  branch: string;
}

/**
 * Gives each agent its own git worktree + branch so concurrent agents never
 * collide on the same files, then merges each agent's branch back into the base
 * working directory when it finishes. All base-repo mutations are serialized.
 */
export class WorktreeManager {
  private counter = 0;
  private chain: Promise<unknown> = Promise.resolve();
  private worktreeRoot: string;

  private constructor(
    private baseDir: string,
    private baseBranch: string,
    sessionId: string,
  ) {
    // realpath so the path matches git's canonical record (/tmp -> /private/tmp on
    // macOS); otherwise `git worktree remove <path>` fails with "not a working tree".
    this.worktreeRoot = join(realpathSync(tmpdir()), `offage-wt-${sessionId}`);
  }

  get base() {
    return this.baseBranch;
  }

  /** Serialize base-repo git plumbing (worktree add / merge / branch ops). */
  private lock<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.chain.then(() => fn());
    this.chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  /** Prepare the base dir as a git repo with a HEAD; returns null if git is unusable. */
  static async create(baseDir: string, sessionId: string): Promise<WorktreeManager | null> {
    if ((await git(['--version'], baseDir)).code !== 0) return null;

    const inside = (await git(['rev-parse', '--is-inside-work-tree'], baseDir)).stdout.trim();
    if (inside !== 'true') {
      if ((await git(['init'], baseDir)).code !== 0) return null;
    }

    // Worktrees require at least one commit (a HEAD).
    const hasHead = (await git(['rev-parse', '--verify', 'HEAD'], baseDir)).code === 0;
    if (!hasHead) {
      await git(['add', '-A'], baseDir);
      const commit = await git([...GIT_CFG, 'commit', '-m', 'offage: base', '--allow-empty'], baseDir);
      if (commit.code !== 0) return null;
    }

    const branch =
      (await git(['rev-parse', '--abbrev-ref', 'HEAD'], baseDir)).stdout.trim() || 'main';
    return new WorktreeManager(baseDir, branch, sessionId);
  }

  /** Create an isolated worktree on a fresh branch for an agent. */
  async acquire(label: string): Promise<Worktree> {
    const safe = label.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'agent';
    const id = ++this.counter;
    const branch = `offage/${safe}-${id}`;
    const path = join(this.worktreeRoot, `${safe}-${id}`);
    await mkdir(this.worktreeRoot, { recursive: true });
    const r = await this.lock(() =>
      git(['worktree', 'add', '-b', branch, path, this.baseBranch], this.baseDir),
    );
    if (r.code !== 0) throw new Error(r.stderr.trim() || 'git worktree add failed');
    return { path, branch };
  }

  /** Commit the agent's work and merge its branch back into the base dir. */
  async finalize(wt: Worktree, message: string): Promise<MergeResult> {
    // Commit happens in the agent's own worktree (no base contention).
    await git(['add', '-A'], wt.path);
    const dirty = (await git(['status', '--porcelain'], wt.path)).stdout.trim();
    if (dirty) await git([...GIT_CFG, 'commit', '-m', message], wt.path);

    return this.lock(async () => {
      const merge = await git(
        [...GIT_CFG, 'merge', '--no-ff', '--no-edit', wt.branch],
        this.baseDir,
      );
      const conflict = merge.code !== 0;
      if (conflict) await git(['merge', '--abort'], this.baseDir);

      await git(['worktree', 'remove', '--force', wt.path], this.baseDir);
      // Keep the branch around on conflict so the user can recover the work.
      if (!conflict) await git(['branch', '-D', wt.branch], this.baseDir);
      return { merged: !conflict, conflict, branch: wt.branch };
    });
  }

  /** Throw away a worktree without merging (e.g. the run was aborted). */
  async discard(wt: Worktree): Promise<void> {
    await this.lock(async () => {
      await git(['worktree', 'remove', '--force', wt.path], this.baseDir);
      await git(['branch', '-D', wt.branch], this.baseDir);
    });
  }

  async cleanup(): Promise<void> {
    await this.lock(() => git(['worktree', 'prune'], this.baseDir));
    try {
      await rm(this.worktreeRoot, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
}
