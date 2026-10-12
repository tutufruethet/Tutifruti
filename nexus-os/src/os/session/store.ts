import { create } from 'zustand';
import { appRegistry } from '@/apps/catalog';
import { useNotificationStore } from '@/os/notifications/store';
import { useWindowStore } from '@/os/window-manager/store';
import { EmailSchema, getCloudBackend, isCloudConfigured } from '@/services/auth/cloud';
import {
  activeProfile,
  deleteActiveProfileData,
  endSession,
  openDevice,
  startSession,
} from './manager';
import { cleanProfileName, GUEST_PROFILE, type Profile } from './profiles';

/**
 * Sessão do OS:
 * off → booting → login → starting → ready ⇄ locked
 * O boot roda uma vez por aba; trocar 3D ↔ 2D não reinicia nada.
 */
export type SessionPhase = 'off' | 'booting' | 'login' | 'starting' | 'ready' | 'locked';

interface SessionState {
  phase: SessionPhase;
  progress: number;
  log: readonly string[];
  /** A cortina da tela de boot já saiu. */
  bootDismissed: boolean;
  profile: Profile | null;
  profiles: readonly Profile[];
  storageAvailable: boolean;
  cloudConfigured: boolean;
  /** E-mail para o qual um link de entrada foi enviado. */
  magicLinkSentTo: string | null;
  error: string | null;
  boot: (options: { reducedMotion: boolean }) => Promise<void>;
  dismissBoot: () => void;
  signIn: (profile: Profile) => Promise<void>;
  signInGuest: () => Promise<void>;
  createProfile: (name: string) => Promise<void>;
  requestMagicLink: (email: string) => Promise<void>;
  lock: () => void;
  unlock: () => void;
  signOut: () => Promise<void>;
  deleteProfileData: () => Promise<void>;
}

const STEP_MIN_MS = 260;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function redirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

export const useSessionStore = create<SessionState>()((set, get) => {
  async function refreshProfiles() {
    const { profiles } = await openDevice();
    set({ profiles: await profiles.list() });
  }

  /** Perfil a retomar ao abrir: conta na nuvem ativa, ou o último perfil local. */
  async function resumableProfile(): Promise<Profile | null> {
    const cloud = await getCloudBackend();
    if (cloud) {
      try {
        const user = await cloud.getUser();
        if (user) return { id: user.id, name: user.name ?? user.email ?? 'Conta', kind: 'cloud', createdAt: Date.now() };
      } catch (error) {
        console.warn('[nuvem] sessão indisponível', error);
      }
    }
    const { profiles } = await openDevice();
    const lastId = await profiles.lastProfileId();
    return (await profiles.list()).find((profile) => profile.id === lastId) ?? null;
  }

  return {
    phase: 'off',
    progress: 0,
    log: [],
    bootDismissed: false,
    profile: null,
    profiles: [],
    storageAvailable: true,
    cloudConfigured: isCloudConfigured(),
    magicLinkSentTo: null,
    error: null,
    dismissBoot: () => set({ bootDismissed: true }),

    boot: async ({ reducedMotion }) => {
      if (get().phase !== 'off') return;
      set({ phase: 'booting', progress: 0, log: [] });

      const found: { profile: Profile | null } = { profile: null };
      const steps: readonly [() => string, () => Promise<unknown> | unknown][] = [
        [
          () => (get().storageAvailable ? 'Armazenamento deste aparelho aberto' : 'Sem IndexedDB: usando memória'),
          async () => {
            const { available } = await openDevice();
            set({ storageAvailable: available });
          },
        ],
        [() => `Registro de apps verificado (${appRegistry.list().length})`, () => appRegistry.list()],
        [
          () => (found.profile ? `Sessão de ${found.profile.name} encontrada` : 'Nenhuma sessão aberta'),
          async () => {
            found.profile = await resumableProfile();
          },
        ],
      ];

      for (const [index, [label, run]] of steps.entries()) {
        const started = Date.now();
        await run();
        const elapsed = Date.now() - started;
        if (!reducedMotion && elapsed < STEP_MIN_MS) await wait(STEP_MIN_MS - elapsed);
        set((state) => ({ log: [...state.log, label()], progress: Math.round(((index + 1) / steps.length) * 100) }));
      }

      await refreshProfiles();
      set({ bootDismissed: reducedMotion });
      if (found.profile) await get().signIn(found.profile);
      else set({ phase: 'login' });
    },

    signIn: async (profile) => {
      set({ phase: 'starting', error: null });
      try {
        const cloud = profile.kind === 'cloud' ? await getCloudBackend() : null;
        const { firstRun } = await startSession(profile, cloud);
        set({ phase: 'ready', profile, magicLinkSentTo: null });
        const notify = useNotificationStore.getState().notify;
        if (profile.kind === 'guest') {
          notify({ title: 'Modo convidado', body: 'Nada é salvo neste aparelho. Ctrl/⌘ K abre o menu de apps.', source: 'sistema' });
        } else if (firstRun) {
          notify({ title: `Olá, ${profile.name}`, body: 'Seus arquivos e preferências ficam salvos neste aparelho.', source: 'sistema' });
        }
      } catch (error) {
        await endSession({ forget: false }).catch(() => undefined);
        await refreshProfiles();
        set({ phase: 'login', profile: null, error: `Não foi possível entrar: ${message(error)}` });
      }
    },

    signInGuest: () => get().signIn(GUEST_PROFILE),

    createProfile: async (name) => {
      try {
        const { profiles } = await openDevice();
        const profile = await profiles.createLocal(cleanProfileName(name));
        await refreshProfiles();
        await get().signIn(profile);
      } catch (error) {
        set({ error: message(error) });
      }
    },

    requestMagicLink: async (email) => {
      const parsed = EmailSchema.safeParse(email.trim());
      if (!parsed.success) {
        set({ error: 'Digite um e-mail válido.' });
        return;
      }
      try {
        const cloud = await getCloudBackend();
        if (!cloud) throw new Error('a conta na nuvem não está configurada');
        await cloud.sendMagicLink(parsed.data, redirectUrl());
        set({ magicLinkSentTo: parsed.data, error: null });
      } catch (error) {
        set({ error: `Não foi possível enviar o link: ${message(error)}` });
      }
    },

    lock: () => {
      if (get().phase === 'ready') set({ phase: 'locked' });
    },

    unlock: () => {
      if (get().phase === 'locked') set({ phase: 'ready' });
    },

    signOut: async () => {
      const profile = activeProfile();
      set({ phase: 'starting' });
      await endSession({ forget: true });
      if (profile?.kind === 'cloud') {
        const cloud = await getCloudBackend();
        await cloud?.signOut().catch((error: unknown) => console.warn('[nuvem]', error));
      }
      useWindowStore.getState().reset();
      await refreshProfiles();
      set({ phase: 'login', profile: null, error: null });
    },

    deleteProfileData: async () => {
      set({ phase: 'starting' });
      await deleteActiveProfileData();
      await refreshProfiles();
      set({ phase: 'login', profile: null, error: null });
    },
  };
});
