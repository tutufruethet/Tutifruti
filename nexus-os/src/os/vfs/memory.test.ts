// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryFileSystem, mimeFromName } from './memory';
import { VfsError, type VfsPath } from './types';

const p = (value: string) => value as VfsPath;

async function expectVfsError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(VfsError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe('MemoryFileSystem', () => {
  let fs: MemoryFileSystem;

  beforeEach(() => {
    fs = new MemoryFileSystem({ now: () => 1000 });
  });

  it('cria pastas e arquivos e lista em ordem natural', async () => {
    await fs.mkdir(p('/docs'));
    await fs.writeText(p('/docs/nota 10.md'), 'b');
    await fs.writeText(p('/docs/nota 2.md'), 'a');
    const names = (await fs.list(p('/docs'))).map((node) => node.name);
    expect(names).toEqual(['nota 2.md', 'nota 10.md']);
    expect(await fs.readText(p('/docs/nota 2.md'))).toBe('a');
  });

  it('mkdir recursivo e erros de pasta', async () => {
    await expectVfsError(fs.mkdir(p('/a/b')), 'ENOENT');
    await fs.mkdir(p('/a/b/c'), { recursive: true });
    expect((await fs.stat(p('/a/b')))?.kind).toBe('directory');
    await expectVfsError(fs.mkdir(p('/a')), 'EEXIST');
    await expect(fs.mkdir(p('/a'), { recursive: true })).resolves.toMatchObject({ path: '/a' });
  });

  it('writeText sobrescreve, mantém o id e calcula tamanho em bytes', async () => {
    const first = await fs.writeText(p('/olá.txt'), 'oi');
    const second = await fs.writeText(p('/olá.txt'), 'ção');
    expect(second.id).toBe(first.id);
    expect(second.size).toBe(5);
    expect(second.mime).toBe('text/plain');
  });

  it('writeText com createParents cria as pastas no caminho', async () => {
    await fs.writeText(p('/x/y/z.md'), '#', { createParents: true });
    expect((await fs.stat(p('/x/y')))?.kind).toBe('directory');
  });

  it('não escreve em pasta nem lê pasta como arquivo', async () => {
    await fs.mkdir(p('/pasta'));
    await expectVfsError(fs.writeText(p('/pasta'), 'x'), 'EISDIR');
    await expectVfsError(fs.readText(p('/pasta')), 'EISDIR');
    await expectVfsError(fs.readText(p('/nada.txt')), 'ENOENT');
  });

  it('copia arquivos e pastas inteiras', async () => {
    await fs.writeText(p('/src/a.txt'), 'A', { createParents: true });
    await fs.writeText(p('/src/sub/b.txt'), 'B', { createParents: true });
    await fs.copy(p('/src'), p('/dst'));
    expect(await fs.readText(p('/dst/sub/b.txt'))).toBe('B');
    expect(await fs.readText(p('/src/a.txt'))).toBe('A');
  });

  it('copiar para uma pasta existente coloca o item dentro dela', async () => {
    await fs.writeText(p('/a.txt'), 'A');
    await fs.mkdir(p('/destino'));
    await fs.copy(p('/a.txt'), p('/destino'));
    expect(await fs.readText(p('/destino/a.txt'))).toBe('A');
  });

  it('move renomeia e atualiza os caminhos dos filhos', async () => {
    await fs.writeText(p('/velho/sub/arquivo.md'), 'x', { createParents: true });
    await fs.move(p('/velho'), p('/novo'));
    expect(await fs.stat(p('/velho'))).toBeNull();
    expect(await fs.readText(p('/novo/sub/arquivo.md'))).toBe('x');
    expect((await fs.list(p('/novo'))).map((n) => n.path)).toEqual(['/novo/sub']);
  });

  it('não move pasta para dentro dela mesma nem sobrescreve destino', async () => {
    await fs.mkdir(p('/a/b'), { recursive: true });
    await expectVfsError(fs.move(p('/a'), p('/a/b/c')), 'EINVAL');
    await fs.writeText(p('/x.txt'), '1');
    await fs.writeText(p('/y.txt'), '2');
    await expectVfsError(fs.move(p('/x.txt'), p('/y.txt')), 'EEXIST');
  });

  it('remove exige recursive para pasta com conteúdo e protege a raiz', async () => {
    await fs.writeText(p('/cheia/a.txt'), 'a', { createParents: true });
    await expectVfsError(fs.remove(p('/cheia')), 'ENOTEMPTY');
    await fs.remove(p('/cheia'), { recursive: true });
    expect(await fs.stat(p('/cheia/a.txt'))).toBeNull();
    await expectVfsError(fs.remove(p('/')), 'EACCES');
  });

  it('busca por nome e conteúdo, sem acento e sem caixa', async () => {
    await expect(fs.search('reuniao')).resolves.toHaveLength(0);
    await fs.mkdir(p('/notas'));
    await fs.writeText(p('/notas/Reunião.md'), 'Pauta do PROJETO');
    await fs.writeText(p('/notas/outra.md'), 'nada');
    expect((await fs.search('reuniao')).map((n) => n.name)).toEqual(['Reunião.md']);
    expect((await fs.search('projeto')).map((n) => n.name)).toEqual(['Reunião.md']);
  });

  it('avisa quem observa a pasta', async () => {
    await fs.mkdir(p('/obs'));
    const listener = vi.fn();
    const stop = fs.watch(p('/obs'), listener);
    await fs.writeText(p('/obs/a.txt'), 'a');
    await fs.writeText(p('/fora.txt'), 'b');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({ type: 'created', node: { path: '/obs/a.txt' } });
    stop();
    await fs.writeText(p('/obs/b.txt'), 'b');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('respeita a cota de espaço', async () => {
    const small = new MemoryFileSystem({ quotaBytes: 4 });
    await small.writeText(p('/a.txt'), '1234');
    await expectVfsError(small.writeText(p('/b.txt'), '5'), 'EQUOTA');
  });

  it('guarda blobs importados', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });
    const file = await fs.writeBlob(p('/foto.png'), blob);
    expect(file.mime).toBe('image/png');
    expect(await (await fs.readBlob(p('/foto.png'))).text()).toBe('png');
  });
});

describe('snapshot e restore', () => {
  it('restaura a árvore e o conteúdo em outra instância', async () => {
    const source = new MemoryFileSystem();
    await source.writeText(p('/a/b/nota.md'), 'oi', { createParents: true });
    await source.writeBlob(p('/a/foto.png'), new Blob(['x'], { type: 'image/png' }));
    const target = new MemoryFileSystem();
    target.restore(source.snapshot());
    expect(await target.readText(p('/a/b/nota.md'))).toBe('oi');
    expect((await target.list(p('/a'))).map((n) => n.name)).toEqual(['b', 'foto.png']);
  });

  it('ignora registros órfãos e clear deixa só a raiz', async () => {
    const fs = new MemoryFileSystem();
    fs.restore({
      nodes: [{ kind: 'directory', id: 'x', name: 'sem-pai', path: p('/nao/existe'), parentId: 'y', createdAt: 0, updatedAt: 0 }],
      contents: new Map(),
    });
    expect(await fs.stat(p('/nao/existe'))).toBeNull();
    await fs.writeText(p('/a.txt'), 'a');
    fs.clear();
    expect(await fs.list(p('/'))).toHaveLength(0);
  });
});

describe('mimeFromName', () => {
  it('deduz pelo nome e cai para binário', () => {
    expect(mimeFromName('a.MD')).toBe('text/markdown');
    expect(mimeFromName('sem-extensao')).toBe('application/octet-stream');
  });
});
