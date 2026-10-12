/**
 * Contrato do sistema de arquivos virtual. A implementação (IndexedDB local +
 * sincronização com Supabase Storage) entra na Fase 3. Files, Terminal, Notes e
 * Code Studio falam só com esta interface (via `SystemBridge.fs`).
 */
export type VfsPath = string & { readonly __brand: 'VfsPath' };

export type VfsNodeKind = 'file' | 'directory';

interface VfsNodeBase {
  readonly id: string;
  readonly name: string;
  readonly path: VfsPath;
  readonly parentId: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface VfsFile extends VfsNodeBase {
  readonly kind: 'file';
  readonly mime: string;
  readonly size: number;
}

export interface VfsDirectory extends VfsNodeBase {
  readonly kind: 'directory';
}

export type VfsNode = VfsFile | VfsDirectory;

export type VfsErrorCode = 'ENOENT' | 'EEXIST' | 'ENOTDIR' | 'EISDIR' | 'ENOTEMPTY' | 'EINVAL' | 'EACCES' | 'EQUOTA';

export class VfsError extends Error {
  constructor(
    readonly code: VfsErrorCode,
    message: string,
    readonly path?: string,
  ) {
    super(message);
    this.name = 'VfsError';
  }
}

export type VfsChange =
  | { readonly type: 'created' | 'updated' | 'removed'; readonly node: VfsNode }
  | { readonly type: 'moved'; readonly node: VfsNode; readonly from: VfsPath };

export interface VirtualFileSystem {
  stat(path: VfsPath): Promise<VfsNode | null>;
  list(path: VfsPath): Promise<readonly VfsNode[]>;
  readText(path: VfsPath): Promise<string>;
  readBlob(path: VfsPath): Promise<Blob>;
  writeText(path: VfsPath, content: string, options?: { createParents?: boolean }): Promise<VfsFile>;
  writeBlob(path: VfsPath, content: Blob, options?: { createParents?: boolean }): Promise<VfsFile>;
  mkdir(path: VfsPath, options?: { recursive?: boolean }): Promise<VfsDirectory>;
  copy(from: VfsPath, to: VfsPath): Promise<VfsNode>;
  move(from: VfsPath, to: VfsPath): Promise<VfsNode>;
  remove(path: VfsPath, options?: { recursive?: boolean }): Promise<void>;
  search(query: string, options?: { root?: VfsPath; limit?: number }): Promise<readonly VfsNode[]>;
  /** Observa mudanças sob `path`. Retorna a função para parar de observar. */
  watch(path: VfsPath, listener: (change: VfsChange) => void): () => void;
}
