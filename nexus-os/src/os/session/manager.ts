import { z } from 'zod';
import { appRegistry } from '@/apps/catalog';
import { debounceTask, type DebouncedTask } from '@/lib/debounce';
import { useNotificationStore } from '@/os/notifications/store';
import { attachVfsPersistence, hydrateFileSystem, type VfsPersistence } from '@/os/vfs/persistence';
import { seedFileSystem } from '@/os/vfs/seed';
import type { SavedWindow } from '@/os/window-manager/logic';
import { useWindowStore } from '@/os/window-manager/store';
import type { CloudBackend } from '@/services/auth/cloud';
import {
  createIdbKeyValueStore,
  createIdbVfsStorage,
  createMemoryKeyValueStore,
  deleteProfileDb,
  openDeviceDb,
  openProfileDb,
} from '@/services/persistence/stores';
import type { KeyValueStore, Versioned } from '@/services/persistence/types';
import { useSettingsStore } from '@/settings/store';
import { memoryFileSystem } from '@/system/virtual-bridge';
import { createProfileRegistry, type Profile, type ProfileRegistry } from './profiles';

/**
 * Ciclo de vida de uma sessão: abrir o armazenamento do perfil, carregar
 * arquivos, preferências e janelas, gravar cada mudança e, ao sair, gravar o
 * que falta e limpar a memória. Convidado nunca toca o IndexedDB.
 */
const SETTINGS_KEY = 'settings';
const WINDOWS_KEY = 'session:windows';
const SETTINGS_VERSION = 1;
const WINDOWS_VERSION = 1;
const SAVE_DELAY_MS = 400;

const SavedWindowsSchema = z.array(
  z.object({
    appId: z.string().min(1).max(64),
    title: z.string().max(200),
    bounds: z.object({ x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive() }),
    display: z.enum(['normal', 'minimized', 'maximized']),
    launchArgs: z.record(z.string(), z.string()).optional(),
  }),
);

function newId(): string {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function reportStorageError(error: unknown) {
  console.warn('[persistência]', error);
  useNotificationStore.getState().notify({
    title: 'Não foi possível salvar',
    body: 'A última alteração pode não ter sido gravada neste aparelho.',
    tone: 'error',
    source: 'sistema',
  });
}

interface Device {
  readonly available: boolean;
  readonly profiles: ProfileRegistry;
}

let device: Device | null = null;

/** Abre o banco do aparelho. Sem IndexedDB, tudo funciona em memória. */
export async function openDevice(): Promise<Device> {
  if (device) return device;
  try {
    const db = await openDeviceDb();
    device = { available: true, profiles: createProfileRegistry(createIdbKeyValueStore(db), newId) };
  } catch (error) {
    console.warn('[persistência] IndexedDB indisponível; usando memória.', error);
    device = { available: false, profiles: createProfileRegistry(createMemoryKeyValueStore(), newId) };
  }
  return device;
}

interface ActiveSession {
  readonly profile: Profile;
  readonly db: IDBDatabase | null;
  readonly vfs: VfsPersistence | null;
  readonly savers: readonly DebouncedTask<unknown>[];
  readonly unsubscribe: readonly (() => void)[];
}

let active: ActiveSession | null = null;

export function activeProfile(): Profile | null {
  return active?.profile ?? null;
}

async function loadSettings(kv: KeyValueStore<unknown>, cloud: CloudBackend | null, profile: Profile) {
  const local = (await kv.get(SETTINGS_KEY)) as Versioned<unknown> | undefined;
  let data = local?.data;
  if (cloud && profile.kind === 'cloud') {
    try {
      const remote = await cloud.loadSettings(profile.id);
      if (remote && remote.updatedAt > (local?.updatedAt ?? 0)) data = remote.data;
    } catch (error) {
      console.warn('[nuvem] não foi possível ler as preferências', error);
    }
  }
  useSettingsStore.getState().replace(data ?? {});
}

/** Entra num perfil. Devolve `firstRun` quando o perfil ainda não tinha dados. */
export async function startSession(profile: Profile, cloud: CloudBackend | null): Promise<{ firstRun: boolean }> {
  if (active) await endSession({ forget: false });
  const { available, profiles } = await openDevice();
  const persistent = available && profile.kind !== 'guest';

  const db = persistent ? await openProfileDb(profile.id) : null;
  const kv: KeyValueStore<unknown> = db ? createIdbKeyValueStore(db) : createMemoryKeyValueStore();

  // Arquivos: carrega o salvo, completa a estrutura inicial e passa a gravar cada mudança.
  let firstRun = true;
  let vfs: VfsPersistence | null = null;
  if (db) {
    const storage = createIdbVfsStorage(db);
    firstRun = !(await hydrateFileSystem(memoryFileSystem, storage));
    vfs = attachVfsPersistence(memoryFileSystem, storage, reportStorageError);
  } else {
    memoryFileSystem.clear();
  }
  await seedFileSystem(memoryFileSystem);

  await loadSettings(kv, cloud, profile);

  const savedWindows = SavedWindowsSchema.safeParse(((await kv.get(WINDOWS_KEY)) as Versioned<unknown> | undefined)?.data);
  useWindowStore.getState().reset();
  if (savedWindows.success) {
    useWindowStore.getState().restore(savedWindows.data as SavedWindow[], (appId) => appRegistry.get(appId));
  }

  const settingsSaver = debounceTask<unknown>(async (data) => {
    const record: Versioned<unknown> = { version: SETTINGS_VERSION, data, updatedAt: Date.now() };
    await kv.set(SETTINGS_KEY, record);
    if (cloud && profile.kind === 'cloud') await cloud.saveSettings(profile.id, data);
  }, SAVE_DELAY_MS, reportStorageError);
  const windowsSaver = debounceTask<unknown>(async (data) => {
    await kv.set(WINDOWS_KEY, { version: WINDOWS_VERSION, data, updatedAt: Date.now() } satisfies Versioned<unknown>);
  }, SAVE_DELAY_MS, reportStorageError);

  const unsubscribe = [
    useSettingsStore.subscribe((state, previous) => {
      if (state.settings !== previous.settings) settingsSaver.schedule(state.settings);
    }),
    useWindowStore.subscribe((state, previous) => {
      if (state.windows !== previous.windows) {
        windowsSaver.schedule(
          [...state.windows]
            .sort((a, b) => a.z - b.z)
            .map(({ appId, title, bounds, display, launchArgs }) => ({ appId, title, bounds, display, launchArgs })),
        );
      }
    }),
  ];

  if (profile.kind !== 'guest') {
    await profiles.upsert(profile);
    await profiles.setLastProfileId(profile.id);
  }

  active = { profile, db, vfs, savers: [settingsSaver, windowsSaver], unsubscribe };
  return { firstRun };
}

/** Grava o que estiver pendente sem sair (ex.: antes de exportar um backup). */
export async function flushSession(): Promise<void> {
  if (!active) return;
  await Promise.all(active.savers.map((saver) => saver.flush()));
  await active.vfs?.flush();
}

/** Sai do perfil: grava o pendente, para de observar e limpa a memória. */
export async function endSession({ forget }: { forget: boolean }): Promise<void> {
  const session = active;
  if (!session) return;
  await flushSession();
  for (const stop of session.unsubscribe) stop();
  session.vfs?.detach();
  session.db?.close();
  active = null;

  useWindowStore.getState().reset();
  memoryFileSystem.clear();
  useSettingsStore.getState().reset();
  if (forget) await (await openDevice()).profiles.setLastProfileId(null);
}

/** Apaga todos os dados do perfil atual neste aparelho e sai. */
export async function deleteActiveProfileData(): Promise<void> {
  const session = active;
  if (!session) return;
  const { profiles } = await openDevice();
  for (const stop of session.unsubscribe) stop();
  for (const saver of session.savers) saver.cancel();
  session.vfs?.detach();
  session.db?.close();
  active = null;
  if (session.profile.kind !== 'guest') {
    await deleteProfileDb(session.profile.id);
    if (session.profile.kind === 'local') await profiles.remove(session.profile.id);
    else await profiles.setLastProfileId(null);
  }
  useWindowStore.getState().reset();
  memoryFileSystem.clear();
  useSettingsStore.getState().reset();
}

/** Só para testes: esquece o aparelho aberto. */
export function resetSessionManagerForTests() {
  device = null;
  active = null;
}
