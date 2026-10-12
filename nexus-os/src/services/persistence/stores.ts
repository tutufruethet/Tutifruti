import type { VfsContent, VfsSnapshot } from '@/os/vfs/memory';
import type { VfsNode, VfsPath } from '@/os/vfs/types';
import { deleteDatabase, openDatabase, request, withStore } from './idb';
import type { KeyValueStore } from './types';

/**
 * Bancos IndexedDB do NEXUS:
 * - `nexus-os`: dados do aparelho (lista de perfis, último perfil).
 * - `nexus-os:<perfil>`: dados de um perfil (VFS, preferências, janelas).
 * Perfis diferentes nunca compartilham banco.
 */
export const DEVICE_DB = 'nexus-os';
export const profileDbName = (profileId: string) => `nexus-os:${profileId}`;

const KV = 'kv';
const NODES = 'vfs-nodes';
const CONTENTS = 'vfs-contents';

export function openDeviceDb(): Promise<IDBDatabase> {
  return openDatabase(DEVICE_DB, 1, (db) => {
    if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
  });
}

export function openProfileDb(profileId: string): Promise<IDBDatabase> {
  return openDatabase(profileDbName(profileId), 1, (db) => {
    if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
    if (!db.objectStoreNames.contains(NODES)) db.createObjectStore(NODES, { keyPath: 'path' });
    if (!db.objectStoreNames.contains(CONTENTS)) db.createObjectStore(CONTENTS);
  });
}

export function deleteProfileDb(profileId: string): Promise<void> {
  return deleteDatabase(profileDbName(profileId));
}

export function createIdbKeyValueStore<T>(db: IDBDatabase): KeyValueStore<T> {
  return {
    driver: 'indexeddb',
    get: (key) => withStore(db, KV, 'readonly', (tx) => request(tx.objectStore(KV).get(key)) as Promise<T | undefined>),
    set: (key, value) =>
      withStore(db, KV, 'readwrite', async (tx) => {
        await request(tx.objectStore(KV).put(value, key));
      }),
    delete: (key) =>
      withStore(db, KV, 'readwrite', async (tx) => {
        await request(tx.objectStore(KV).delete(key));
      }),
    keys: (prefix = '') =>
      withStore(db, KV, 'readonly', async (tx) => {
        const keys = await request(tx.objectStore(KV).getAllKeys());
        return keys.map(String).filter((key) => key.startsWith(prefix));
      }),
  };
}

export function createMemoryKeyValueStore<T>(): KeyValueStore<T> {
  const map = new Map<string, T>();
  return {
    driver: 'memory',
    get: async (key) => map.get(key),
    set: async (key, value) => {
      map.set(key, value);
    },
    delete: async (key) => {
      map.delete(key);
    },
    keys: async (prefix = '') => [...map.keys()].filter((key) => key.startsWith(prefix)),
  };
}

/** Onde o VFS de um perfil é gravado. */
export interface VfsStorage {
  loadAll(): Promise<VfsSnapshot>;
  putNodes(nodes: readonly VfsNode[]): Promise<void>;
  putContent(id: string, content: VfsContent): Promise<void>;
  /** Apaga o nó em `path` e tudo abaixo; com `contents`, apaga também os arquivos. */
  deleteNodes(path: VfsPath, options: { contents: boolean }): Promise<void>;
}

function subtreeRanges(path: VfsPath): IDBKeyRange[] {
  if (path === '/') return [IDBKeyRange.lowerBound('/')];
  return [IDBKeyRange.only(path), IDBKeyRange.bound(`${path}/`, `${path}/￿`)];
}

export function createIdbVfsStorage(db: IDBDatabase): VfsStorage {
  return {
    loadAll: () =>
      withStore(db, [NODES, CONTENTS], 'readonly', async (tx) => {
        const nodes = (await request(tx.objectStore(NODES).getAll())) as VfsNode[];
        const keys = await request(tx.objectStore(CONTENTS).getAllKeys());
        const values = (await request(tx.objectStore(CONTENTS).getAll())) as VfsContent[];
        const contents = new Map<string, VfsContent>();
        keys.forEach((key, index) => {
          const value = values[index];
          if (value !== undefined) contents.set(String(key), value);
        });
        return { nodes, contents };
      }),
    putNodes: (nodes) =>
      withStore(db, NODES, 'readwrite', async (tx) => {
        const store = tx.objectStore(NODES);
        for (const node of nodes) await request(store.put(node));
      }),
    putContent: (id, content) =>
      withStore(db, CONTENTS, 'readwrite', async (tx) => {
        await request(tx.objectStore(CONTENTS).put(content, id));
      }),
    deleteNodes: (path, { contents }) =>
      withStore(db, [NODES, CONTENTS], 'readwrite', async (tx) => {
        const nodeStore = tx.objectStore(NODES);
        const contentStore = tx.objectStore(CONTENTS);
        for (const range of subtreeRanges(path)) {
          const found = (await request(nodeStore.getAll(range))) as VfsNode[];
          for (const node of found) {
            await request(nodeStore.delete(node.path));
            if (contents && node.kind === 'file') await request(contentStore.delete(node.id));
          }
        }
      }),
  };
}
