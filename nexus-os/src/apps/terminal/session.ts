import type { VfsPath, VirtualFileSystem } from '@/os/vfs/types';
import { ANSI, complete, displayPath, runCommand } from './interpreter';

/** Saída do terminal (o xterm.js na interface, um coletor nos testes). */
export interface TerminalOutput {
  write(data: string): void;
  clear(): void;
}

const KEYS = {
  enter: '\r',
  backspace: '\x7f',
  ctrlC: '\x03',
  ctrlL: '\x0c',
  ctrlU: '\x15',
  tab: '\t',
  up: '\x1b[A',
  down: '\x1b[B',
  right: '\x1b[C',
  left: '\x1b[D',
  home: '\x1b[H',
  end: '\x1b[F',
  delete: '\x1b[3~',
} as const;

const ESCAPES = [KEYS.up, KEYS.down, KEYS.right, KEYS.left, KEYS.home, KEYS.end, KEYS.delete] as const;
const MAX_HISTORY = 100;

/**
 * Edição de linha (cursor, histórico, Tab, Ctrl+C/L/U) sobre o interpretador.
 * Não depende do xterm: recebe os bytes digitados e escreve a resposta.
 */
export class TerminalSession {
  private line = '';
  private cursor = 0;
  private readonly history: string[] = [];
  private historyIndex: number | null = null;
  private busy = false;
  private cwd: VfsPath;

  constructor(
    private readonly fs: VirtualFileSystem,
    private readonly home: VfsPath,
    private readonly output: TerminalOutput,
  ) {
    this.cwd = home;
  }

  get currentDirectory(): VfsPath {
    return this.cwd;
  }

  start(): void {
    this.output.write(`${ANSI.bold}NEXUS OS${ANSI.reset} ${ANSI.muted}terminal virtual · digite help${ANSI.reset}\r\n`);
    this.output.write(this.prompt());
  }

  async input(data: string): Promise<void> {
    let index = 0;
    while (index < data.length) {
      const escape = ESCAPES.find((sequence) => data.startsWith(sequence, index));
      if (escape) {
        this.handleEscape(escape);
        index += escape.length;
        continue;
      }
      const char = data[index]!;
      index += 1;
      if (this.busy) continue;
      if (char === KEYS.enter) await this.submit();
      else if (char === KEYS.backspace) this.backspace();
      else if (char === KEYS.ctrlC) this.cancel();
      else if (char === KEYS.ctrlL) this.clearScreen();
      else if (char === KEYS.ctrlU) this.setLine('');
      else if (char === KEYS.tab) await this.complete();
      else if (char >= ' ' && char !== '\x7f') this.insert(char);
    }
  }

  private prompt(): string {
    return `${ANSI.accent}nexus${ANSI.reset}:${ANSI.muted}${displayPath(this.cwd, this.home)}${ANSI.reset}$ `;
  }

  private redraw(): void {
    const back = this.line.length - this.cursor;
    this.output.write(`\r\x1b[K${this.prompt()}${this.line}${back > 0 ? `\x1b[${back}D` : ''}`);
  }

  private setLine(line: string): void {
    this.line = line;
    this.cursor = line.length;
    this.redraw();
  }

  private insert(text: string): void {
    this.line = this.line.slice(0, this.cursor) + text + this.line.slice(this.cursor);
    this.cursor += text.length;
    if (this.cursor === this.line.length) this.output.write(text);
    else this.redraw();
  }

  private backspace(): void {
    if (this.cursor === 0) return;
    this.line = this.line.slice(0, this.cursor - 1) + this.line.slice(this.cursor);
    this.cursor -= 1;
    this.redraw();
  }

  private handleEscape(sequence: (typeof ESCAPES)[number]): void {
    if (this.busy) return;
    switch (sequence) {
      case KEYS.left:
        if (this.cursor > 0) {
          this.cursor -= 1;
          this.output.write(KEYS.left);
        }
        break;
      case KEYS.right:
        if (this.cursor < this.line.length) {
          this.cursor += 1;
          this.output.write(KEYS.right);
        }
        break;
      case KEYS.home:
        this.cursor = 0;
        this.redraw();
        break;
      case KEYS.end:
        this.cursor = this.line.length;
        this.redraw();
        break;
      case KEYS.delete:
        if (this.cursor < this.line.length) {
          this.line = this.line.slice(0, this.cursor) + this.line.slice(this.cursor + 1);
          this.redraw();
        }
        break;
      case KEYS.up:
        this.browseHistory(-1);
        break;
      case KEYS.down:
        this.browseHistory(1);
        break;
    }
  }

  private browseHistory(direction: -1 | 1): void {
    if (this.history.length === 0) return;
    const start = this.historyIndex ?? this.history.length;
    const next = Math.min(Math.max(start + direction, 0), this.history.length);
    this.historyIndex = next === this.history.length ? null : next;
    this.setLine(this.historyIndex === null ? '' : (this.history[this.historyIndex] ?? ''));
  }

  private cancel(): void {
    this.output.write('^C\r\n');
    this.line = '';
    this.cursor = 0;
    this.historyIndex = null;
    this.output.write(this.prompt());
  }

  private clearScreen(): void {
    this.output.clear();
    this.redraw();
  }

  private async complete(): Promise<void> {
    const options = await complete(this.line.slice(0, this.cursor), { fs: this.fs, cwd: this.cwd, home: this.home });
    if (options.length === 1) {
      const lastSpace = this.line.lastIndexOf(' ', this.cursor - 1);
      const head = this.line.slice(0, lastSpace + 1);
      const suffix = options[0]!.endsWith('/') ? '' : ' ';
      this.line = `${head}${options[0]}${suffix}${this.line.slice(this.cursor)}`;
      this.cursor = head.length + options[0]!.length + suffix.length;
      this.redraw();
    } else if (options.length > 1) {
      this.output.write(`\r\n${options.join('  ')}\r\n`);
      this.redraw();
    }
  }

  private async submit(): Promise<void> {
    const line = this.line;
    this.output.write('\r\n');
    this.line = '';
    this.cursor = 0;
    this.historyIndex = null;
    if (line.trim()) {
      if (this.history.at(-1) !== line) this.history.push(line);
      if (this.history.length > MAX_HISTORY) this.history.shift();
      this.busy = true;
      try {
        const result = await runCommand(line, { fs: this.fs, cwd: this.cwd, home: this.home });
        this.cwd = result.cwd;
        if (result.clear) this.output.clear();
        else if (result.output.length > 0) this.output.write(`${result.output.join('\r\n')}\r\n`);
      } finally {
        this.busy = false;
      }
    }
    this.output.write(this.prompt());
  }
}
