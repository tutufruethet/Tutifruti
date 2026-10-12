// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup, restoreBackup } from './backup';
import { MemoryFileSystem } from './memory';
import type { VfsPath } from './types';

const p = (value: string) => value as VfsPath;

describe('backup', () => {
  it('ida e volta: texto, binário e pastas vazias', async () => {
    const source = new MemoryFileSystem();
    await source.writeText(p('/home/nexus/Notas/ideia.md'), 'ação ✓', { createParents: true });
    await source.writeBlob(p('/home/nexus/foto.png'), new Blob([new Uint8Array([0, 255, 128])], { type: 'image/png' }));
    await source.mkdir(p('/home/nexus/Vazia'));

    const backup = await createBackup(source, { wallpaper: 'void' }, new Date('2026-10-12T12:00:00Z'));
    const text = JSON.stringify(backup);
    const target = new MemoryFileSystem();
    const result = await restoreBackup(target, parseBackup(text));

    expect(result).toEqual({ files: 2, folders: 4 });
    expect(await target.readText(p('/home/nexus/Notas/ideia.md'))).toBe('ação ✓');
    const bytes = new Uint8Array(await (await target.readBlob(p('/home/nexus/foto.png'))).arrayBuffer());
    expect([...bytes]).toEqual([0, 255, 128]);
    expect((await target.stat(p('/home/nexus/Vazia')))?.kind).toBe('directory');
    expect(parseBackup(text).settings).toEqual({ wallpaper: 'void' });
  });

  it('recusa arquivos que não são backup do NEXUS', () => {
    expect(() => parseBackup('não é json')).toThrow('JSON');
    expect(() => parseBackup(JSON.stringify({ format: 'outro' }))).toThrow('backup do NEXUS');
  });

  it('importar sobrescreve caminhos iguais e mantém o resto', async () => {
    const fs = new MemoryFileSystem();
    await fs.writeText(p('/a.txt'), 'antigo');
    await fs.writeText(p('/b.txt'), 'fica');
    await restoreBackup(fs, {
      format: 'nexus-os-backup',
      version: 1,
      exportedAt: '',
      entries: [{ kind: 'file', path: '/a.txt', mime: 'text/plain', encoding: 'text', content: 'novo' }],
    });
    expect(await fs.readText(p('/a.txt'))).toBe('novo');
    expect(await fs.readText(p('/b.txt'))).toBe('fica');
  });
});
