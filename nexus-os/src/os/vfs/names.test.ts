// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatBytes } from '@/lib/format';
import { MemoryFileSystem } from './memory';
import { splitExtension, uniqueName } from './names';
import type { VfsPath } from './types';

describe('uniqueName', () => {
  it('numera quando o nome já existe', async () => {
    const fs = new MemoryFileSystem();
    const dir = '/' as VfsPath;
    expect(await uniqueName(fs, dir, 'nota.md')).toBe('nota.md');
    await fs.writeText('/nota.md' as VfsPath, '');
    await fs.writeText('/nota (2).md' as VfsPath, '');
    expect(await uniqueName(fs, dir, 'nota.md')).toBe('nota (3).md');
  });

  it('separa a extensão sem estragar arquivos ocultos', () => {
    expect(splitExtension('a.tar.gz')).toEqual(['a.tar', '.gz']);
    expect(splitExtension('.env')).toEqual(['.env', '']);
    expect(splitExtension('LEIA-ME')).toEqual(['LEIA-ME', '']);
  });
});

describe('formatBytes', () => {
  it('formata em pt-BR', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(20 * 1024 * 1024)).toBe('20 MB');
  });
});
