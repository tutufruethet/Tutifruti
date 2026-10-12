import { create } from 'zustand';

/** Painéis da barra de tarefas: só um aberto por vez. */
export type DesktopPanel = 'launcher' | 'notifications' | 'calendar' | null;

interface DesktopState {
  panel: DesktopPanel;
  setPanel: (panel: DesktopPanel) => void;
  togglePanel: (panel: Exclude<DesktopPanel, null>) => void;
}

export const useDesktopStore = create<DesktopState>()((set) => ({
  panel: null,
  setPanel: (panel) => set({ panel }),
  togglePanel: (panel) => set((state) => ({ panel: state.panel === panel ? null : panel })),
}));
