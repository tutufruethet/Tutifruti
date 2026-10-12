import { isTextMime } from '@/os/vfs/memory';
import { dirname, resolvePath } from '@/os/vfs/path';
import { VfsError, type VfsPath, type VirtualFileSystem } from '@/os/vfs/types';

/**
 * Interpretador do Terminal. Só fala com o sistema de arquivos virtual:
 * não existe caminho, por desenho, para executar comandos do computador real.
 */
export interface ShellContext {
  readonly fs: VirtualFileSystem;
  readonly cwd: VfsPath;
  readonly home: VfsPath;
}

export interface CommandResult {
  readonly output: readonly string[];
  readonly cwd: VfsPath;
  readonly clear?: boolean;
  readonly exitCode: number;
}

export const ANSI = {
  reset: '\x1b[0m',
  accent: '\x1b[36m',
  muted: '\x1b[90m',
  bold: '\x1b[1m',
} as const;

const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

export const COMMANDS: Readonly<Record<string, string>> = {
  help: 'mostra esta ajuda',
  ls: 'lista a pasta: ls [caminho]',
  cd: 'muda de pasta: cd [caminho] (sem argumento: ~)',
  pwd: 'mostra a pasta atual',
  mkdir: 'cria pastas: mkdir [-p] pasta...',
  touch: 'cria arquivos vazios: touch arquivo...',
  cat: 'mostra o conteúdo: cat arquivo...',
  cp: 'copia: cp [-r] origem destino',
  mv: 'move ou renomeia: mv origem destino',
  rm: 'apaga: rm [-r] caminho...',
  echo: 'escreve texto: echo texto [> arquivo | >> arquivo]',
  clear: 'limpa a tela',
};

/** Divide a linha em palavras, respeitando aspas simples/duplas e barra invertida. */
export function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let hasToken = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (quote) {
      if (char === quote) quote = null;
      else if (char === '\\' && quote === '"' && i + 1 < line.length) current += line[++i] ?? '';
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      hasToken = true;
    } else if (char === '\\' && i + 1 < line.length) {
      current += line[++i] ?? '';
      hasToken = true;
    } else if (/\s/.test(char)) {
      if (hasToken) tokens.push(current);
      current = '';
      hasToken = false;
    } else {
      current += char;
      hasToken = true;
    }
  }
  if (quote) throw new SyntaxError('aspas sem fechar');
  if (hasToken) tokens.push(current);
  return tokens;
}

/** "~" vira a pasta pessoal; exibição faz o caminho inverso. */
export function expandHome(token: string, home: VfsPath): string {
  if (token === '~') return home;
  if (token.startsWith('~/')) return `${home}${token.slice(1)}`;
  return token;
}

export function displayPath(path: VfsPath, home: VfsPath): string {
  if (path === home) return '~';
  return path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

function splitFlags(args: readonly string[]): { flags: Set<string>; rest: string[] } {
  const flags = new Set<string>();
  const rest: string[] = [];
  for (const arg of args) {
    if (/^-[a-zA-Z]+$/.test(arg)) for (const flag of arg.slice(1)) flags.add(flag);
    else rest.push(arg);
  }
  return { flags, rest };
}

function describeError(command: string, error: unknown): string {
  if (error instanceof VfsError) {
    const reasons: Record<string, string> = {
      ENOENT: 'não existe',
      EEXIST: 'já existe',
      ENOTDIR: 'não é uma pasta',
      EISDIR: 'é uma pasta',
      ENOTEMPTY: 'pasta não vazia (use -r)',
      EINVAL: 'operação inválida',
      EACCES: 'sem permissão',
      EQUOTA: 'sem espaço',
    };
    return `${command}: ${error.path ?? ''}: ${reasons[error.code] ?? error.message}`;
  }
  return `${command}: ${error instanceof Error ? error.message : String(error)}`;
}

type Handler = (args: readonly string[], ctx: ShellContext) => Promise<CommandResult>;

const ok = (ctx: ShellContext, output: readonly string[] = []): CommandResult => ({ output, cwd: ctx.cwd, exitCode: 0 });

const handlers: Readonly<Record<string, Handler>> = {
  help: async (_args, ctx) =>
    ok(ctx, [
      `${ANSI.bold}Comandos${ANSI.reset}`,
      ...Object.entries(COMMANDS).map(([name, text]) => `  ${ANSI.accent}${name.padEnd(6)}${ANSI.reset} ${text}`),
      `${ANSI.muted}Tudo acontece no sistema de arquivos virtual do NEXUS.${ANSI.reset}`,
    ]),

  pwd: async (_args, ctx) => ok(ctx, [ctx.cwd]),

  clear: async (_args, ctx) => ({ ...ok(ctx), clear: true }),

  echo: async (args, ctx) => ok(ctx, [args.join(' ')]),

  ls: async (args, ctx) => {
    const { rest } = splitFlags(args);
    const targets = rest.length > 0 ? rest : ['.'];
    const output: string[] = [];
    for (const target of targets) {
      const path = resolvePath(target, ctx.cwd);
      const node = await ctx.fs.stat(path);
      if (!node) throw new VfsError('ENOENT', 'não existe', path);
      if (targets.length > 1) output.push(`${path}:`);
      if (node.kind === 'file') {
        output.push(node.name);
        continue;
      }
      const children = await ctx.fs.list(path);
      const names = children.map((child) =>
        child.kind === 'directory' ? `${ANSI.accent}${child.name}/${ANSI.reset}` : child.name,
      );
      if (names.length > 0) output.push(names.join('  '));
    }
    return ok(ctx, output);
  },

  cd: async (args, ctx) => {
    const target = resolvePath(args[0] ?? ctx.home, ctx.cwd);
    const node = await ctx.fs.stat(target);
    if (!node) throw new VfsError('ENOENT', 'não existe', target);
    if (node.kind !== 'directory') throw new VfsError('ENOTDIR', 'não é uma pasta', target);
    return { output: [], cwd: target, exitCode: 0 };
  },

  mkdir: async (args, ctx) => {
    const { flags, rest } = splitFlags(args);
    if (rest.length === 0) throw new Error('falta o nome da pasta');
    for (const name of rest) await ctx.fs.mkdir(resolvePath(name, ctx.cwd), { recursive: flags.has('p') });
    return ok(ctx);
  },

  touch: async (args, ctx) => {
    if (args.length === 0) throw new Error('falta o nome do arquivo');
    for (const name of args) {
      const path = resolvePath(name, ctx.cwd);
      const node = await ctx.fs.stat(path);
      if (!node) await ctx.fs.writeText(path, '');
      else if (node.kind === 'file') await ctx.fs.writeText(path, await ctx.fs.readText(path));
    }
    return ok(ctx);
  },

  cat: async (args, ctx) => {
    if (args.length === 0) throw new Error('falta o arquivo');
    const output: string[] = [];
    for (const name of args) {
      const path = resolvePath(name, ctx.cwd);
      const node = await ctx.fs.stat(path);
      if (node?.kind === 'file' && !isTextMime(node.mime)) {
        output.push(`cat: ${path}: arquivo binário (${node.mime})`);
        continue;
      }
      const text = await ctx.fs.readText(path);
      output.push(...text.replace(/\n$/, '').split('\n'));
    }
    return ok(ctx, output);
  },

  cp: async (args, ctx) => {
    const { flags, rest } = splitFlags(args);
    if (rest.length !== 2) throw new Error('uso: cp [-r] origem destino');
    const from = resolvePath(rest[0]!, ctx.cwd);
    const node = await ctx.fs.stat(from);
    if (node?.kind === 'directory' && !flags.has('r')) throw new Error(`${from} é uma pasta (use -r)`);
    await ctx.fs.copy(from, resolvePath(rest[1]!, ctx.cwd));
    return ok(ctx);
  },

  mv: async (args, ctx) => {
    if (args.length !== 2) throw new Error('uso: mv origem destino');
    const from = resolvePath(args[0]!, ctx.cwd);
    const moved = await ctx.fs.move(from, resolvePath(args[1]!, ctx.cwd));
    // Se a pasta atual foi movida, acompanha o novo caminho.
    const cwd = ctx.cwd === from || ctx.cwd.startsWith(`${from}/`) ? (`${moved.path}${ctx.cwd.slice(from.length)}` as VfsPath) : ctx.cwd;
    return { output: [], cwd, exitCode: 0 };
  },

  rm: async (args, ctx) => {
    const { flags, rest } = splitFlags(args);
    if (rest.length === 0) throw new Error('falta o caminho');
    let cwd = ctx.cwd;
    for (const name of rest) {
      const path = resolvePath(name, ctx.cwd);
      await ctx.fs.remove(path, { recursive: flags.has('r') || flags.has('R') });
      if (cwd === path || cwd.startsWith(`${path}/`)) cwd = dirname(path);
    }
    return { output: [], cwd, exitCode: 0 };
  },
};

/** Executa uma linha. Suporta redirecionamento `>` e `>>` para arquivo. */
export async function runCommand(line: string, ctx: ShellContext): Promise<CommandResult> {
  let tokens: string[];
  try {
    tokens = tokenize(line).map((token) => expandHome(token, ctx.home));
  } catch (error) {
    return { output: [describeError('nexus', error)], cwd: ctx.cwd, exitCode: 2 };
  }
  if (tokens.length === 0) return ok(ctx);

  let redirect: { path: VfsPath; append: boolean } | null = null;
  const redirectAt = tokens.findIndex((token) => token === '>' || token === '>>');
  if (redirectAt >= 0) {
    const file = tokens[redirectAt + 1];
    if (!file) return { output: ['nexus: falta o arquivo depois de >'], cwd: ctx.cwd, exitCode: 2 };
    redirect = { path: resolvePath(file, ctx.cwd), append: tokens[redirectAt] === '>>' };
    tokens = tokens.slice(0, redirectAt);
  }

  const [command, ...args] = tokens;
  if (!command) return ok(ctx);
  const handler = handlers[command];
  if (!handler) {
    return { output: [`${command}: comando não encontrado. Digite ${ANSI.accent}help${ANSI.reset}.`], cwd: ctx.cwd, exitCode: 127 };
  }

  try {
    const result = await handler(args, ctx);
    if (!redirect) return result;
    const plain = result.output.map((text) => text.replace(ANSI_PATTERN, '')).join('\n');
    const previous =
      redirect.append && (await ctx.fs.stat(redirect.path)) ? await ctx.fs.readText(redirect.path) : '';
    await ctx.fs.writeText(redirect.path, `${previous}${plain}${plain ? '\n' : ''}`);
    return { ...result, output: [] };
  } catch (error) {
    return { output: [describeError(command, error)], cwd: ctx.cwd, exitCode: 1 };
  }
}

/** Completa o último termo da linha com nomes da pasta (Tab). */
export async function complete(line: string, ctx: ShellContext): Promise<string[]> {
  const lastSpace = line.lastIndexOf(' ');
  const partial = line.slice(lastSpace + 1);
  if (lastSpace < 0) return Object.keys(COMMANDS).filter((name) => name.startsWith(partial));
  const expanded = expandHome(partial, ctx.home);
  const dirPart = expanded.includes('/') ? expanded.slice(0, expanded.lastIndexOf('/') + 1) : '';
  const namePart = expanded.slice(dirPart.length);
  try {
    const directory = resolvePath(dirPart || '.', ctx.cwd);
    const children = await ctx.fs.list(directory);
    return children
      .filter((child) => child.name.startsWith(namePart))
      .map((child) => `${partial.slice(0, partial.length - namePart.length)}${child.name}${child.kind === 'directory' ? '/' : ''}`);
  } catch {
    return [];
  }
}

