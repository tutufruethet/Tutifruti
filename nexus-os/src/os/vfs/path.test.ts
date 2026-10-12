import { describe, expect, it } from 'vitest';
import { basename, dirname, isSameOrDescendant, isValidName, joinPath, resolvePath, ROOT } from './path';
import { VfsError, type VfsPath } from './types';

const p = (value: string) => value as VfsPath;

describe('resolvePath', () => {
  it('normaliza caminhos absolutos', () => {
    expect(resolvePath('/home//nexus/./docs/')).toBe('/home/nexus/docs');
    expect(resolvePath('/')).toBe('/');
  });

  it('resolve relativo ao diretório atual', () => {
    expect(resolvePath('docs', p('/home/nexus'))).toBe('/home/nexus/docs');
    expect(resolvePath('../outro', p('/home/nexus'))).toBe('/home/outro');
  });

  it('não sobe acima da raiz', () => {
    expect(resolvePath('../../..', p('/home'))).toBe('/');
  });

  it('recusa nomes inválidos com VfsError', () => {
    expect(() => resolvePath('/a/b\\c')).toThrow(VfsError);
    expect(() => resolvePath(`/${'x'.repeat(256)}`)).toThrow(VfsError);
  });
});

describe('utilitários', () => {
  it('dirname, basename e join', () => {
    expect(dirname(p('/home/nexus/notas.md'))).toBe('/home/nexus');
    expect(dirname(ROOT)).toBe('/');
    expect(basename(p('/home/nexus/notas.md'))).toBe('notas.md');
    expect(joinPath(p('/home'), 'nexus', 'notas.md')).toBe('/home/nexus/notas.md');
  });

  it('isSameOrDescendant não confunde prefixos', () => {
    expect(isSameOrDescendant(p('/home/nexus/docs'), p('/home/nexus'))).toBe(true);
    expect(isSameOrDescendant(p('/home/nexus2'), p('/home/nexus'))).toBe(false);
    expect(isSameOrDescendant(p('/qualquer'), ROOT)).toBe(true);
  });

  it('isValidName', () => {
    expect(isValidName('notas.md')).toBe(true);
    expect(isValidName('..')).toBe(false);
    expect(isValidName('')).toBe(false);
  });
});
