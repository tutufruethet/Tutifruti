import { create } from 'zustand';
import { appRegistry } from '@/apps/catalog';
import { useNotificationStore } from '@/os/notifications/store';
import { seedFileSystem } from '@/os/vfs/seed';
import { memoryFileSystem } from '@/system/virtual-bridge';

/**
 * Boot do OS. Cada etapa faz trabalho real (montar o sistema de arquivos,
 * conferir o registro de apps); o tempo mínimo por etapa só existe para a
 * tela de boot ser legível, e some com movimento reduzido.
 * Roda uma vez por aba: trocar 3D ↔ 2D não reinicia o sistema.
 */
export type BootPhase = 'off' | 'booting' | 'ready';

interface SessionState {
  phase: BootPhase;
  progress: number;
  log: readonly string[];
  /** A cortina da tela de boot já saiu. */
  bootDismissed: boolean;
  boot: (options: { reducedMotion: boolean }) => Promise<void>;
  dismissBoot: () => void;
}

const STEP_MIN_MS = 260;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  phase: 'off',
  progress: 0,
  log: [],
  bootDismissed: false,
  dismissBoot: () => set({ bootDismissed: true }),
  boot: async ({ reducedMotion }) => {
    if (get().phase !== 'off') return;
    set({ phase: 'booting', progress: 0, log: [] });

    const steps: readonly [string, () => Promise<unknown> | unknown][] = [
      ['Montando o sistema de arquivos virtual', () => seedFileSystem(memoryFileSystem)],
      [`Registro de apps verificado (${appRegistry.list().length})`, () => appRegistry.list()],
      ['Gerenciador de janelas pronto', () => undefined],
    ];

    for (const [index, [label, run]] of steps.entries()) {
      const started = Date.now();
      await run();
      const elapsed = Date.now() - started;
      if (!reducedMotion && elapsed < STEP_MIN_MS) await wait(STEP_MIN_MS - elapsed);
      set((state) => ({ log: [...state.log, label], progress: Math.round(((index + 1) / steps.length) * 100) }));
    }

    set({ phase: 'ready', bootDismissed: reducedMotion });
    useNotificationStore.getState().notify({
      title: 'Bem-vindo ao NEXUS OS',
      body: 'Ctrl/⌘ K abre o menu de apps.',
      source: 'sistema',
    });
  },
}));
