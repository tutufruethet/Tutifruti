import { describe, expect, it } from 'vitest';
import { MemoryFileSystem } from '@/os/vfs/memory';
import { attachVfsPersistence, hydrateFileSystem } from '@/os/vfs/persistence';
import type { VfsPath } from '@/os/vfs/types';
import {
  createIdbKeyValueStore,
  createIdbVfsStorage,
  createMemoryKeyValueStore,
  deleteProfileDb,
  openProfileDb,
} from './stores';

const p = (value: string) => value as VfsPath;
let counter = 0;
const uniqueProfile = () => `teste-${Date.now()}-${(counter += 1)}`;

async function tree(fs: MemoryFileSystem) {
  const { nodes } = fs.snapshot();
  const entries: string[] = [];
  for (const node of nodes) {
    if (node.path === '/') continue;
    entries.push(node.kind === 'file' ? `${node.path}=${await fs.readText(node.path)}` : `${node.path}/`);
  }
  return entries.sort();
}

describe('chave-valor', () => {
  it('IndexedDB e memória têm o mesmo comportamento', async () => {
    const profile = uniqueProfile();
    const db = await openProfileDb(profile);
    for (const store of [createIdbKeyValueStore<{ n: number }>(db), createMemoryKeyValueStore<{ n: number }>()]) {
      await store.set('settings', { n: 1 });
      await store.set('session:windows', { n: 2 });
      expect(await store.get('settings')).toEqual({ n: 1 });
      expect(await store.keys('session:')).toEqual(['session:windows']);
      await store.delete('settings');
      expect(await store.get('settings')).toBeUndefined();
    }
    db.close();
    await deleteProfileDb(profile);
  });
});

describe('persistência do VFS', () => {
  it('cada mudança vai para o IndexedDB e volta igual ao recarregar', async () => {
    const profile = uniqueProfile();
    const db = await openProfileDb(profile);
    const storage = createIdbVfsStorage(db);
    const errors: unknown[] = [];

    const fs = new MemoryFileSystem();
    const persistence = attachVfsPersistence(fs, storage, (error) => errors.push(error));
    await fs.writeText(p('/home/nexus/Notas/a.md'), 'primeira', { createParents: true });
    await fs.writeText(p('/home/nexus/Notas/a.md'), 'editada');
    await fs.mkdir(p('/home/nexus/Projetos/nexus'), { recursive: true });
    await fs.writeText(p('/home/nexus/Projetos/nexus/plano.txt'), 'fase 3');
    await fs.move(p('/home/nexus/Projetos'), p('/home/nexus/Trabalho'));
    await fs.writeText(p('/home/nexus/lixo.txt'), 'x');
    await fs.remove(p('/home/nexus/lixo.txt'));
    await persistence.flush();
    expect(errors).toEqual([]);

    const reloaded = new MemoryFileSystem();
    expect(await hydrateFileSystem(reloaded, createIdbVfsStorage(db))).toBe(true);
    expect(await tree(reloaded)).toEqual(await tree(fs));
    expect(await reloaded.readText(p('/home/nexus/Trabalho/nexus/plano.txt'))).toBe('fase 3');
    expect(await reloaded.stat(p('/home/nexus/Projetos'))).toBeNull();

    persistence.detach();
    db.close();
    await deleteProfileDb(profile);
  });

  it('apagar uma pasta remove os arquivos dela do armazenamento', async () => {
    const profile = uniqueProfile();
    const db = await openProfileDb(profile);
    const storage = createIdbVfsStorage(db);
    const fs = new MemoryFileSystem();
    const persistence = attachVfsPersistence(fs, storage, () => {});
    await fs.writeText(p('/a/b.txt'), 'b', { createParents: true });
    await fs.remove(p('/a'), { recursive: true });
    await persistence.flush();
    const snapshot = await storage.loadAll();
    expect(snapshot.nodes).toHaveLength(0);
    expect(snapshot.contents.size).toBe(0);
    db.close();
    await deleteProfileDb(profile);
  });

  it('perfis diferentes não enxergam os dados um do outro', async () => {
    const [one, two] = [uniqueProfile(), uniqueProfile()];
    const dbOne = await openProfileDb(one);
    const dbTwo = await openProfileDb(two);
    const fs = new MemoryFileSystem();
    const persistence = attachVfsPersistence(fs, createIdbVfsStorage(dbOne), () => {});
    await fs.writeText(p('/segredo.txt'), 's');
    await persistence.flush();
    expect((await createIdbVfsStorage(dbTwo).loadAll()).nodes).toHaveLength(0);
    dbOne.close();
    dbTwo.close();
    await deleteProfileDb(one);
    await deleteProfileDb(two);
  });
});
