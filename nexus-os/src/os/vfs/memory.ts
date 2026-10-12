import { basename, dirname, isSameOrDescendant, resolvePath, ROOT, segments } from './path';
import {
  VfsError,
  type VfsChange,
  type VfsDirectory,
  type VfsFile,
  type VfsNode,
  type VfsPath,
  type VirtualFileSystem,
} from './types';

/**
 * Sistema de arquivos virtual em memória. Implementa o contrato completo;
 * a Fase 3 adiciona um driver IndexedDB/Supabase com a mesma interface.
 * Nada aqui toca o disco do computador.
 */
/** Conteúdo de arquivo: texto ou binário (importado). */
export type VfsContent = string | Blob;
type Content = VfsContent;

export interface VfsSnapshot {
  /** Nós em ordem de profundidade: pais antes dos filhos. */
  readonly nodes: readonly VfsNode[];
  readonly contents: ReadonlyMap<string, VfsContent>;
}

interface Watcher {
  readonly path: VfsPath;
  readonly listener: (change: VfsChange) => void;
}

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  md: 'text/markdown',
  txt: 'text/plain',
  json: 'application/json',
  js: 'text/javascript',
  ts: 'text/typescript',
  tsx: 'text/typescript',
  css: 'text/css',
  html: 'text/html',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  pdf: 'application/pdf',
};

export function mimeFromName(name: string): string {
  const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined;
  return (extension && MIME_BY_EXTENSION[extension]) || 'application/octet-stream';
}

export function isTextMime(mime: string): boolean {
  return mime.startsWith('text/') || mime === 'application/json' || mime === 'image/svg+xml';
}

function normalizeForSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

const encoder = new TextEncoder();

function sizeOf(content: Content): number {
  return typeof content === 'string' ? encoder.encode(content).length : content.size;
}

let fallbackId = 0;

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  fallbackId += 1;
  return `node-${Date.now().toString(36)}-${fallbackId}`;
}

export interface MemoryFileSystemOptions {
  /** Relógio injetável para testes. */
  readonly now?: () => number;
  /** Limite total de bytes (proteção contra importações gigantes). */
  readonly quotaBytes?: number;
}

export class MemoryFileSystem implements VirtualFileSystem {
  private readonly nodes = new Map<VfsPath, VfsNode>();
  private readonly contents = new Map<string, Content>();
  private readonly watchers = new Set<Watcher>();
  private readonly now: () => number;
  private readonly quotaBytes: number;

  constructor(options: MemoryFileSystemOptions = {}) {
    this.now = options.now ?? Date.now;
    this.quotaBytes = options.quotaBytes ?? 50 * 1024 * 1024;
    const time = this.now();
    this.nodes.set(ROOT, {
      kind: 'directory',
      id: 'root',
      name: '',
      path: ROOT,
      parentId: null,
      createdAt: time,
      updatedAt: time,
    });
  }

  /** Conteúdo bruto de um arquivo pelo id (usado pela camada de persistência). */
  rawContent(id: string): VfsContent | undefined {
    return this.contents.get(id);
  }

  /** O nó e todos os descendentes, pais antes dos filhos. */
  nodesUnder(path: VfsPath): VfsNode[] {
    const target = resolvePath(path);
    return [...this.nodes.values()]
      .filter((node) => isSameOrDescendant(node.path, target))
      .sort((a, b) => segments(a.path).length - segments(b.path).length);
  }

  snapshot(): VfsSnapshot {
    return { nodes: this.nodesUnder(ROOT), contents: new Map(this.contents) };
  }

  /**
   * Substitui todo o conteúdo (ao entrar num perfil). Não avisa observadores:
   * acontece antes de qualquer app abrir.
   */
  restore(snapshot: VfsSnapshot): void {
    const root = this.nodes.get(ROOT);
    this.nodes.clear();
    this.contents.clear();
    if (root) this.nodes.set(ROOT, root);
    const ordered = [...snapshot.nodes].sort((a, b) => segments(a.path).length - segments(b.path).length);
    for (const node of ordered) {
      if (node.path === ROOT) continue;
      const parent = this.nodes.get(dirname(node.path));
      if (!parent || parent.kind !== 'directory') continue; // registro órfão: ignora
      this.nodes.set(node.path, { ...node, parentId: parent.id });
      if (node.kind === 'file') this.contents.set(node.id, snapshot.contents.get(node.id) ?? '');
    }
  }

  /** Esvazia tudo, mantendo só a raiz (ao sair do perfil). */
  clear(): void {
    this.restore({ nodes: [], contents: new Map() });
  }

  /** Bytes usados por todos os arquivos. */
  usedBytes(): number {
    let total = 0;
    for (const node of this.nodes.values()) if (node.kind === 'file') total += node.size;
    return total;
  }

  async usage(): Promise<{ usedBytes: number; quotaBytes: number }> {
    return { usedBytes: this.usedBytes(), quotaBytes: this.quotaBytes };
  }

  async stat(path: VfsPath): Promise<VfsNode | null> {
    return this.nodes.get(resolvePath(path)) ?? null;
  }

  async list(path: VfsPath): Promise<readonly VfsNode[]> {
    const directory = this.requireDirectory(resolvePath(path));
    return [...this.nodes.values()]
      .filter((node) => node.parentId === directory.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));
  }

  async readText(path: VfsPath): Promise<string> {
    const content = this.contents.get(this.requireFile(resolvePath(path)).id) ?? '';
    return typeof content === 'string' ? content : content.text();
  }

  async readBlob(path: VfsPath): Promise<Blob> {
    const file = this.requireFile(resolvePath(path));
    const content = this.contents.get(file.id) ?? '';
    return typeof content === 'string' ? new Blob([content], { type: file.mime }) : content;
  }

  async writeText(path: VfsPath, content: string, options?: { createParents?: boolean }): Promise<VfsFile> {
    return this.write(resolvePath(path), content, options?.createParents ?? false);
  }

  async writeBlob(path: VfsPath, content: Blob, options?: { createParents?: boolean }): Promise<VfsFile> {
    return this.write(resolvePath(path), content, options?.createParents ?? false);
  }

  async mkdir(path: VfsPath, options?: { recursive?: boolean }): Promise<VfsDirectory> {
    const target = resolvePath(path);
    const existing = this.nodes.get(target);
    if (existing) {
      if (existing.kind === 'directory' && options?.recursive) return existing;
      throw new VfsError('EEXIST', `Já existe: ${target}`, target);
    }
    const parentPath = dirname(target);
    if (!this.nodes.has(parentPath)) {
      if (!options?.recursive) throw new VfsError('ENOENT', `Pasta não encontrada: ${parentPath}`, parentPath);
      await this.mkdir(parentPath, { recursive: true });
    }
    const parent = this.requireDirectory(parentPath);
    const time = this.now();
    const directory: VfsDirectory = {
      kind: 'directory',
      id: newId(),
      name: basename(target),
      path: target,
      parentId: parent.id,
      createdAt: time,
      updatedAt: time,
    };
    this.nodes.set(target, directory);
    this.touchParent(parent);
    this.emit({ type: 'created', node: directory });
    return directory;
  }

  async copy(from: VfsPath, to: VfsPath): Promise<VfsNode> {
    const source = this.requireNode(resolvePath(from));
    const target = this.prepareDestination(source, resolvePath(to));
    if (source.kind === 'file') {
      const content = this.contents.get(source.id) ?? '';
      return this.write(target, content, false);
    }
    const copy = await this.mkdir(target);
    for (const child of await this.list(source.path)) {
      await this.copy(child.path, resolvePath(child.name, target));
    }
    return copy;
  }

  async move(from: VfsPath, to: VfsPath): Promise<VfsNode> {
    const source = this.requireNode(resolvePath(from));
    const target = this.prepareDestination(source, resolvePath(to));
    const newParent = this.requireDirectory(dirname(target));
    const oldParent = this.nodes.get(dirname(source.path));
    const time = this.now();

    const affected = [...this.nodes.values()].filter((node) => isSameOrDescendant(node.path, source.path));
    for (const node of affected) this.nodes.delete(node.path);
    let moved: VfsNode = source;
    for (const node of affected) {
      const suffix = node.path.slice(source.path.length);
      const nextPath = `${target}${suffix}` as VfsPath;
      const updated: VfsNode =
        node.id === source.id
          ? { ...node, name: basename(target), path: nextPath, parentId: newParent.id, updatedAt: time }
          : { ...node, path: nextPath };
      this.nodes.set(nextPath, updated);
      if (node.id === source.id) moved = updated;
    }
    if (oldParent?.kind === 'directory') this.touchParent(oldParent);
    this.touchParent(newParent);
    this.emit({ type: 'moved', node: moved, from: source.path });
    return moved;
  }

  async remove(path: VfsPath, options?: { recursive?: boolean }): Promise<void> {
    const target = resolvePath(path);
    if (target === ROOT) throw new VfsError('EACCES', 'A raiz não pode ser removida', target);
    const node = this.requireNode(target);
    const descendants = [...this.nodes.values()].filter(
      (other) => other.path !== target && isSameOrDescendant(other.path, target),
    );
    if (node.kind === 'directory' && descendants.length > 0 && !options?.recursive) {
      throw new VfsError('ENOTEMPTY', `A pasta não está vazia: ${target}`, target);
    }
    for (const other of [node, ...descendants]) {
      this.nodes.delete(other.path);
      this.contents.delete(other.id);
    }
    const parent = this.nodes.get(dirname(target));
    if (parent?.kind === 'directory') this.touchParent(parent);
    this.emit({ type: 'removed', node });
  }

  async search(query: string, options?: { root?: VfsPath; limit?: number }): Promise<readonly VfsNode[]> {
    const needle = normalizeForSearch(query.trim());
    if (!needle) return [];
    const root = resolvePath(options?.root ?? ROOT);
    const limit = options?.limit ?? 50;
    const results: VfsNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.path === ROOT || !isSameOrDescendant(node.path, root)) continue;
      let match = normalizeForSearch(node.name).includes(needle);
      if (!match && node.kind === 'file' && isTextMime(node.mime)) {
        const content = this.contents.get(node.id);
        match = typeof content === 'string' && normalizeForSearch(content).includes(needle);
      }
      if (match) results.push(node);
      if (results.length >= limit) break;
    }
    return results.sort((a, b) => a.path.localeCompare(b.path, 'pt-BR'));
  }

  watch(path: VfsPath, listener: (change: VfsChange) => void): () => void {
    const watcher: Watcher = { path: resolvePath(path), listener };
    this.watchers.add(watcher);
    return () => {
      this.watchers.delete(watcher);
    };
  }

  private write(target: VfsPath, content: Content, createParents: boolean): VfsFile {
    if (target === ROOT) throw new VfsError('EISDIR', 'A raiz é uma pasta', target);
    const existing = this.nodes.get(target);
    if (existing?.kind === 'directory') throw new VfsError('EISDIR', `É uma pasta: ${target}`, target);

    const parentPath = dirname(target);
    if (!this.nodes.has(parentPath)) {
      if (!createParents) throw new VfsError('ENOENT', `Pasta não encontrada: ${parentPath}`, parentPath);
      this.mkdirSync(parentPath);
    }
    const parent = this.requireDirectory(parentPath);

    const size = sizeOf(content);
    const previous = existing?.kind === 'file' ? existing.size : 0;
    if (this.usedBytes() - previous + size > this.quotaBytes) {
      throw new VfsError('EQUOTA', 'Espaço do sistema de arquivos esgotado', target);
    }

    const time = this.now();
    const name = basename(target);
    const file: VfsFile = {
      kind: 'file',
      id: existing?.id ?? newId(),
      name,
      path: target,
      parentId: parent.id,
      mime: typeof content === 'string' || !content.type ? mimeFromName(name) : content.type,
      size,
      createdAt: existing?.createdAt ?? time,
      updatedAt: time,
    };
    this.nodes.set(target, file);
    this.contents.set(file.id, content);
    this.touchParent(parent);
    this.emit({ type: existing ? 'updated' : 'created', node: file });
    return file;
  }

  /** Cria pastas intermediárias de forma síncrona (usado por writes com `createParents`). */
  private mkdirSync(path: VfsPath): void {
    let current = ROOT;
    for (const part of segments(path)) {
      const next = resolvePath(part, current);
      const existing = this.nodes.get(next);
      if (existing && existing.kind !== 'directory') throw new VfsError('ENOTDIR', `Não é uma pasta: ${next}`, next);
      if (!existing) {
        const parent = this.requireDirectory(current);
        const time = this.now();
        const directory: VfsDirectory = {
          kind: 'directory',
          id: newId(),
          name: part,
          path: next,
          parentId: parent.id,
          createdAt: time,
          updatedAt: time,
        };
        this.nodes.set(next, directory);
        this.emit({ type: 'created', node: directory });
      }
      current = next;
    }
  }

  /** Valida o destino de cópia/movimento; se for uma pasta existente, o item vai para dentro dela. */
  private prepareDestination(source: VfsNode, requested: VfsPath): VfsPath {
    const existing = this.nodes.get(requested);
    const target = existing?.kind === 'directory' ? resolvePath(source.name, requested) : requested;
    if (target === source.path) throw new VfsError('EINVAL', 'Origem e destino são iguais', target);
    if (source.kind === 'directory' && isSameOrDescendant(target, source.path)) {
      throw new VfsError('EINVAL', 'Uma pasta não pode ir para dentro dela mesma', target);
    }
    if (this.nodes.has(target)) throw new VfsError('EEXIST', `Já existe: ${target}`, target);
    this.requireDirectory(dirname(target));
    return target;
  }

  private touchParent(parent: VfsDirectory): void {
    this.nodes.set(parent.path, { ...parent, updatedAt: this.now() });
  }

  private requireNode(path: VfsPath): VfsNode {
    const node = this.nodes.get(path);
    if (!node) throw new VfsError('ENOENT', `Não encontrado: ${path}`, path);
    return node;
  }

  private requireDirectory(path: VfsPath): VfsDirectory {
    const node = this.requireNode(path);
    if (node.kind !== 'directory') throw new VfsError('ENOTDIR', `Não é uma pasta: ${path}`, path);
    return node;
  }

  private requireFile(path: VfsPath): VfsFile {
    const node = this.requireNode(path);
    if (node.kind !== 'file') throw new VfsError('EISDIR', `É uma pasta: ${path}`, path);
    return node;
  }

  private emit(change: VfsChange): void {
    for (const watcher of this.watchers) {
      const touches =
        isSameOrDescendant(change.node.path, watcher.path) ||
        (change.type === 'moved' && isSameOrDescendant(change.from, watcher.path));
      if (touches) watcher.listener(change);
    }
  }
}
