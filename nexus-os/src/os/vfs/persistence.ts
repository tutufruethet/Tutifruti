import type { VfsStorage } from '@/services/persistence/stores';
import type { MemoryFileSystem } from './memory';
import { dirname, ROOT } from './path';
import type { VfsChange, VfsNode } from './types';

export interface VfsPersistence {
  /** Espera todas as gravações pendentes. */
  flush(): Promise<void>;
  /** Para de gravar (ao sair do perfil). */
  detach(): void;
}

/**
 * Grava no armazenamento cada mudança do VFS em memória (write-through).
 * As gravações entram numa fila em ordem, para que "criar e logo apagar" nunca
 * chegue invertido ao IndexedDB.
 */
export function attachVfsPersistence(
  fs: MemoryFileSystem,
  storage: VfsStorage,
  onError: (error: unknown) => void,
): VfsPersistence {
  let chain: Promise<void> = Promise.resolve();
  const enqueue = (task: () => Promise<void>) => {
    chain = chain.then(task).catch(onError);
  };

  async function parentOf(node: VfsNode): Promise<VfsNode[]> {
    if (node.path === ROOT) return [];
    const parent = await fs.stat(dirname(node.path));
    return parent && parent.path !== ROOT ? [parent] : [];
  }

  function handle(change: VfsChange) {
    const { node } = change;
    if (change.type === 'created' || change.type === 'updated') {
      const content = node.kind === 'file' ? fs.rawContent(node.id) : undefined;
      enqueue(async () => {
        await storage.putNodes([node, ...(await parentOf(node))]);
        if (content !== undefined) await storage.putContent(node.id, content);
      });
    } else if (change.type === 'removed') {
      enqueue(async () => {
        await storage.deleteNodes(node.path, { contents: true });
        await storage.putNodes(await parentOf(node));
      });
    } else {
      // Movido: o conteúdo continua com o mesmo id; só os caminhos mudam.
      const moved = fs.nodesUnder(node.path);
      enqueue(async () => {
        await storage.deleteNodes(change.from, { contents: false });
        await storage.putNodes(moved);
        await storage.putNodes(await parentOf(node));
      });
    }
  }

  const stop = fs.watch(ROOT, handle);
  return {
    flush: () => chain,
    detach: stop,
  };
}

/** Carrega o VFS salvo para a memória. Devolve `false` se não havia nada salvo. */
export async function hydrateFileSystem(fs: MemoryFileSystem, storage: VfsStorage): Promise<boolean> {
  const snapshot = await storage.loadAll();
  fs.restore(snapshot);
  return snapshot.nodes.length > 0;
}
