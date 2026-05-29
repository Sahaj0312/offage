/** Tiny dependency-free terminal UI helpers: colors, spinner, hyperlinks. */

const ESC = '\x1b[';
const wrap = (code: string) => (s: string) => `${ESC}${code}m${s}${ESC}0m`;

export const c = {
  dim: wrap('2'),
  bold: wrap('1'),
  cyan: wrap('36'),
  magenta: wrap('35'),
  green: wrap('32'),
  red: wrap('31'),
  yellow: wrap('33'),
  blue: wrap('34'),
};

/** OSC 8 terminal hyperlink (falls back to showing the URL in dumb terminals). */
export function hyperlink(url: string, label?: string): string {
  return `\x1b]8;;${url}\x07${label ?? url}\x1b]8;;\x07`;
}

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export interface Spinner {
  setText(text: string): void;
  succeed(text?: string): void;
  fail(text?: string): void;
  stop(): void;
}

/** A single-line spinner. Animates on a TTY; prints a static line otherwise. */
export function spinner(initial: string): Spinner {
  let text = initial;
  const isTTY = process.stdout.isTTY;
  let i = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const render = () => {
    process.stdout.write(`\r${ESC}2K${c.cyan(FRAMES[i])} ${text}`);
    i = (i + 1) % FRAMES.length;
  };

  if (isTTY) {
    render();
    timer = setInterval(render, 80);
  } else {
    process.stdout.write(`… ${text}\n`);
  }

  const finish = (symbol: string, finalText?: string) => {
    if (timer) clearInterval(timer);
    timer = null;
    if (isTTY) process.stdout.write(`\r${ESC}2K${symbol} ${finalText ?? text}\n`);
    else if (finalText) process.stdout.write(`${finalText}\n`);
  };

  return {
    setText: (t) => {
      text = t;
      if (!isTTY) process.stdout.write(`… ${t}\n`);
    },
    succeed: (t) => finish(c.green('✓'), t),
    fail: (t) => finish(c.red('✗'), t),
    stop: () => {
      if (timer) clearInterval(timer);
      timer = null;
      if (isTTY) process.stdout.write(`\r${ESC}2K`);
    },
  };
}

export const banner = () =>
  [
    '',
    c.cyan('   ▟█▙ ▒▒▒  Offage'),
    c.dim('   ▜█▛ a walkable 3D office for your AI agents'),
    '',
  ].join('\n');
