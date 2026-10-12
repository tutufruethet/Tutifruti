import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationStore } from '@/os/notifications/store';
import { useWindowStore } from '@/os/window-manager/store';
import type { CloudBackend } from '@/services/auth/cloud';
import { createMemoryKeyValueStore, openProfileDb } from '@/services/persistence/stores';
import { useSettingsStore } from '@/settings/store';
import { memoryFileSystem } from '@/system/virtual-bridge';
import { appRegistry } from '@/apps/catalog';
import type { VfsPath } from '@/os/vfs/types';
import { deleteActiveProfileData, endSession, openDevice, startSession } from './manager';
import { cleanProfileName, createProfileRegistry, GUEST_PROFILE, initials, type Profile } from './profiles';

const p = (value: string) => value as VfsPath;
let counter = 0;

async function newLocalProfile(): Promise<Profile> {
  const { profiles } = await openDevice();
  counter += 1;
  return profiles.createLocal(`Pessoa ${counter} ${Date.now()}`);
}

beforeEach(async () => {
  await endSession({ forget: true });
  useNotificationStore.getState().clear();
});

describe('perfis', () => {
  it('cria, recusa nome repetido e lembra o último', async () => {
    let id = 0;
    const registry = createProfileRegistry(createMemoryKeyValueStore(), () => `id${(id += 1)}`);
    const ana = await registry.createLocal('  Ana   Souza ');
    expect(ana).toMatchObject({ id: 'local-id1', name: 'Ana Souza', kind: 'local' });
    await expect(registry.createLocal('ana souza')).rejects.toThrow('Já existe');
    await expect(registry.createLocal('   ')).rejects.toThrow();
    await registry.setLastProfileId(ana.id);
    expect(await registry.lastProfileId()).toBe(ana.id);
    await registry.remove(ana.id);
    expect(await registry.list()).toEqual([]);
    expect(await registry.lastProfileId()).toBeNull();
  });

  it('iniciais e limpeza de nome', () => {
    expect(initials('Ana Souza')).toBe('AS');
    expect(initials('nexus')).toBe('NE');
    expect(cleanProfileName(`  ${'x'.repeat(60)} `)).toHaveLength(40);
  });
});

describe('sessão local', () => {
  it('arquivos, preferências e janelas voltam ao entrar de novo', async () => {
    const profile = await newLocalProfile();
    const { firstRun } = await startSession(profile, null);
    expect(firstRun).toBe(true);
    expect(await memoryFileSystem.stat(p('/home/nexus/LEIA-ME.md'))).not.toBeNull();

    await memoryFileSystem.writeText(p('/home/nexus/Notas/fase3.md'), 'persistiu');
    useSettingsStore.getState().update({ wallpaper: 'void' });
    useWindowStore.getState().open(appRegistry.require('notes' as never));
    await endSession({ forget: false });

    expect(await memoryFileSystem.stat(p('/home/nexus/Notas/fase3.md'))).toBeNull();
    expect(useSettingsStore.getState().settings.wallpaper).toBe('nexus-grid');
    expect(useWindowStore.getState().windows).toHaveLength(0);

    const again = await startSession(profile, null);
    expect(again.firstRun).toBe(false);
    expect(await memoryFileSystem.readText(p('/home/nexus/Notas/fase3.md'))).toBe('persistiu');
    expect(useSettingsStore.getState().settings.wallpaper).toBe('void');
    expect(useWindowStore.getState().windows.map((w) => w.appId)).toEqual(['notes']);
  });

  it('perfis diferentes não compartilham arquivos', async () => {
    const one = await newLocalProfile();
    const two = await newLocalProfile();
    await startSession(one, null);
    await memoryFileSystem.writeText(p('/home/nexus/so-do-um.txt'), '1');
    await startSession(two, null);
    expect(await memoryFileSystem.stat(p('/home/nexus/so-do-um.txt'))).toBeNull();
  });

  it('apagar os dados remove o banco e o perfil da lista', async () => {
    const profile = await newLocalProfile();
    await startSession(profile, null);
    await memoryFileSystem.writeText(p('/home/nexus/a.txt'), 'a');
    await deleteActiveProfileData();
    const { profiles } = await openDevice();
    expect((await profiles.list()).some((item) => item.id === profile.id)).toBe(false);
    const db = await openProfileDb(profile.id);
    expect(db.objectStoreNames.length).toBeGreaterThan(0);
    const tx = db.transaction('vfs-nodes', 'readonly');
    const count = await new Promise<number>((resolve) => {
      const request = tx.objectStore('vfs-nodes').count();
      request.onsuccess = () => resolve(request.result);
    });
    expect(count).toBe(0);
    db.close();
  });
});

describe('convidado', () => {
  it('nada sobrevive ao sair', async () => {
    await startSession(GUEST_PROFILE, null);
    await memoryFileSystem.writeText(p('/home/nexus/temporario.txt'), 't');
    await endSession({ forget: true });
    await startSession(GUEST_PROFILE, null);
    expect(await memoryFileSystem.stat(p('/home/nexus/temporario.txt'))).toBeNull();
  });
});

describe('conta na nuvem (backend simulado)', () => {
  function fakeCloud(remote: { data: unknown; updatedAt: number } | null) {
    const saved: unknown[] = [];
    const backend: CloudBackend = {
      provider: 'supabase',
      getUser: async () => ({ id: 'u1', email: 'a@b.com', name: 'Ana' }),
      sendMagicLink: vi.fn(async () => undefined),
      signOut: vi.fn(async () => undefined),
      loadSettings: async () => remote,
      saveSettings: async (_id, data) => {
        saved.push(data);
      },
    };
    return { backend, saved };
  }

  it('preferências mais novas na nuvem vencem e mudanças sobem', async () => {
    const { backend, saved } = fakeCloud({ data: { wallpaper: 'horizon' }, updatedAt: Date.now() + 1000 });
    const profile: Profile = { id: `cloud-${Date.now()}`, name: 'Ana', kind: 'cloud', createdAt: 0 };
    await startSession(profile, backend);
    expect(useSettingsStore.getState().settings.wallpaper).toBe('horizon');
    useSettingsStore.getState().update({ wallpaper: 'void' });
    await endSession({ forget: false });
    expect(saved.at(-1)).toMatchObject({ wallpaper: 'void' });
  });
});
