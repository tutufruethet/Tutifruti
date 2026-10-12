import { create } from 'zustand';
import type { AppManifest, Size } from '@/os/apps/types';
import {
  closeWindow,
  createWindowManagerState,
  cycleWindows,
  focusWindow,
  minimizeWindow,
  moveWindow,
  openWindow,
  resizeWindow,
  restoreWindows,
  type SavedWindow,
  setDesktopSize,
  toggleMaximize,
} from './logic';
import type { Bounds, WindowManagerState } from './types';

interface WindowManagerActions {
  open: (manifest: AppManifest, options?: { title?: string; launchArgs?: Readonly<Record<string, string>> }) => string;
  close: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, bounds: Bounds) => void;
  setDesktopSize: (size: Size) => void;
  cycle: () => void;
  reset: () => void;
  /** Reabre janelas salvas no perfil. */
  restore: (saved: readonly SavedWindow[], manifestFor: (appId: AppManifest['id']) => AppManifest | undefined) => void;
}

export type WindowManagerStore = WindowManagerState & WindowManagerActions;

/** Tamanho inicial do desktop no monitor (1280×800 menos a barra de tarefas). */
const INITIAL_DESKTOP: Size = { width: 1280, height: 756 };

let sequence = 0;

export const useWindowStore = create<WindowManagerStore>()((set, get) => ({
  ...createWindowManagerState(INITIAL_DESKTOP),
  open: (manifest, options) => {
    sequence += 1;
    const result = openWindow(get(), manifest, { id: `w${sequence}`, ...options });
    set(result.state);
    return result.id;
  },
  close: (id) => set((state) => closeWindow(state, id)),
  focus: (id) => set((state) => focusWindow(state, id)),
  minimize: (id) => set((state) => minimizeWindow(state, id)),
  toggleMaximize: (id) => set((state) => toggleMaximize(state, id)),
  move: (id, x, y) => set((state) => moveWindow(state, id, x, y)),
  resize: (id, bounds) => set((state) => resizeWindow(state, id, bounds)),
  setDesktopSize: (size) => set((state) => setDesktopSize(state, size)),
  cycle: () => set((state) => cycleWindows(state)),
  reset: () => set(createWindowManagerState(get().desktop)),
  restore: (saved, manifestFor) =>
    set((state) =>
      restoreWindows(state, saved, manifestFor, () => {
        sequence += 1;
        return `w${sequence}`;
      }),
    ),
}));
