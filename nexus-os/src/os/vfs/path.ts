import { VfsError, type VfsPath } from './types';

/**
 * Caminhos do VFS: absolutos, separados por "/", sem "." nem "..", sem barra
 * no fim (exceto a raiz). Funções puras, usadas pelo Terminal (`cd`, `mv`...)
 * e pelo Files.
 */
export const ROOT: VfsPath = '/' as VfsPath;
export const MAX_NAME_LENGTH = 255;
const NUL = String.fromCharCode(0);

function hasForbiddenChar(name: string): boolean {
  return name.includes(NUL) || name.includes('/') || name.includes('\\');
}

export function isValidName(name: string): boolean {
  return name.length > 0 && name.length <= MAX_NAME_LENGTH && name !== '.' && name !== '..' && !hasForbiddenChar(name);
}

/** Resolve `input` (absoluto ou relativo a `cwd`) para um caminho normalizado. */
export function resolvePath(input: string, cwd: VfsPath = ROOT): VfsPath {
  const raw = input.trim();
  if (raw.includes(NUL)) throw new VfsError('EINVAL', 'Caminho com caractere nulo', input);
  const start = raw.startsWith('/') ? [] : segments(cwd);
  const parts = [...start];
  for (const part of raw.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      parts.pop();
      continue;
    }
    if (!isValidName(part)) throw new VfsError('EINVAL', `Nome inválido: "${part}"`, input);
    parts.push(part);
  }
  return (`/${parts.join('/')}`) as VfsPath;
}

export function segments(path: VfsPath): string[] {
  return path.split('/').filter(Boolean);
}

export function joinPath(base: VfsPath, ...names: string[]): VfsPath {
  return resolvePath(names.join('/'), base);
}

export function dirname(path: VfsPath): VfsPath {
  const parts = segments(path);
  parts.pop();
  return (`/${parts.join('/')}`) as VfsPath;
}

export function basename(path: VfsPath): string {
  return segments(path).at(-1) ?? '';
}

/** `true` se `ancestor` contém `path` (ou é o próprio). Impede mover pasta para dentro dela mesma. */
export function isSameOrDescendant(path: VfsPath, ancestor: VfsPath): boolean {
  if (ancestor === ROOT) return true;
  return path === ancestor || path.startsWith(`${ancestor}/`);
}
