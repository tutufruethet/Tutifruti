// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryFileSystem } from '@/os/vfs/memory';
import type { VfsPath } from '@/os/vfs/types';
import { complete, displayPath, runCommand, tokenize, type ShellContext } from './interpreter';
import { TerminalSession } from './session';

const HOME = '/home/nexus' as VfsPath;
const ESC = String.fromCharCode(27);
const strip = (text: string) => text.replaceAll(new RegExp(`${ESC}\\[[0-9;]*[A-Za-z]`, 'g'), '');

let fs: MemoryFileSystem;
let ctx: ShellContext;

beforeEach(async () => {
  fs = new MemoryFileSystem();
  await fs.mkdir(HOME, { recursive: true });
  ctx = { fs, cwd: HOME, home: HOME };
});

async function run(line: string) {
  const result = await runCommand(line, ctx);
  ctx = { ...ctx, cwd: result.cwd };
  return { ...result, text: strip(result.output.join('\n')) };
}

describe('tokenize', () => {
  it('respeita aspas e barra invertida', () => {
    expect(tokenize(`mkdir "Minhas fotos" 'a b' c\\ d`)).toEqual(['mkdir', 'Minhas fotos', 'a b', 'c d']);
    expect(tokenize('echo ""')).toEqual(['echo', '']);
  });

  it('acusa aspas sem fechar', () => {
    expect(() => tokenize('echo "oi')).toThrow();
  });
});

describe('comandos', () => {
  it('mkdir, cd, pwd e ls', async () => {
    await run('mkdir -p projetos/nexus');
    await run('touch notas.txt');
    expect((await run('ls')).text).toBe('notas.txt  projetos/'.split('  ').sort().join('  '));
    await run('cd projetos/nexus');
    expect((await run('pwd')).text).toBe('/home/nexus/projetos/nexus');
    await run('cd ..');
    await run('cd ~');
    expect(ctx.cwd).toBe(HOME);
  });

  it('echo com > e >>, cat, cp, mv, rm', async () => {
    await run('echo primeira linha > a.txt');
    await run('echo segunda >> a.txt');
    expect((await run('cat a.txt')).text).toBe('primeira linha\nsegunda');
    await run('cp a.txt b.txt');
    await run('mv b.txt c.txt');
    expect((await run('ls')).text).toBe('a.txt  c.txt');
    await run('rm a.txt c.txt');
    expect((await run('ls')).text).toBe('');
  });

  it('rm e cp de pasta exigem -r', async () => {
    await run('mkdir pasta');
    await run('touch pasta/x');
    expect((await run('rm pasta')).exitCode).toBe(1);
    expect((await run('cp pasta copia')).exitCode).toBe(1);
    expect((await run('cp -r pasta copia')).exitCode).toBe(0);
    expect((await run('rm -r pasta')).exitCode).toBe(0);
  });

  it('erros são mensagens, não exceções', async () => {
    const missing = await run('cat nada.txt');
    expect(missing.exitCode).toBe(1);
    expect(missing.text).toContain('não existe');
    const unknown = await run('sudo rm -rf /');
    expect(unknown.exitCode).toBe(127);
    expect(unknown.text).toContain('comando não encontrado');
  });

  it('help lista todos os comandos pedidos', async () => {
    const text = (await run('help')).text;
    for (const name of ['help', 'ls', 'cd', 'pwd', 'mkdir', 'touch', 'cat', 'cp', 'mv', 'rm', 'clear']) {
      expect(text).toContain(name);
    }
  });

  it('clear pede para limpar a tela', async () => {
    expect((await run('clear')).clear).toBe(true);
  });

  it('completa nomes com Tab', async () => {
    await run('mkdir Documentos');
    expect(await complete('cd Doc', ctx)).toEqual(['Documentos/']);
    expect(await complete('mk', ctx)).toEqual(['mkdir']);
  });

  it('mostra ~ no lugar da pasta pessoal', () => {
    expect(displayPath('/home/nexus/a' as VfsPath, HOME)).toBe('~/a');
    expect(displayPath('/tmp' as VfsPath, HOME)).toBe('/tmp');
  });
});

describe('TerminalSession', () => {
  function setup() {
    let screen = '';
    let clears = 0;
    const session = new TerminalSession(fs, HOME, {
      write: (data) => {
        screen += data;
      },
      clear: () => {
        clears += 1;
      },
    });
    return { session, read: () => strip(screen), clears: () => clears };
  }

  it('executa o que foi digitado e mostra o prompt de novo', async () => {
    const { session, read } = setup();
    session.start();
    await session.input('mkdir teste\r');
    await session.input('ls\r');
    expect(read()).toContain('teste/');
    expect(read().trimEnd().endsWith('nexus:~$')).toBe(true);
  });

  it('histórico com setas e edição com backspace', async () => {
    const { session, read } = setup();
    session.start();
    await session.input('pwd\r');
    await session.input('\x1b[A');
    await session.input('\r');
    expect(read().match(/\/home\/nexus/g)).toHaveLength(2);
    await session.input('lsx\x7f\r');
    expect(read()).not.toContain('comando não encontrado');
  });

  it('Ctrl+C descarta a linha e Ctrl+L limpa a tela', async () => {
    const { session, read, clears } = setup();
    session.start();
    await session.input('rm -r /\x03');
    expect(read()).toContain('^C');
    await session.input('\x0c');
    expect(clears()).toBe(1);
  });
});
