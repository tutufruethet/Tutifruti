import { create } from 'zustand';
import { parseSettings, type Settings } from './schema';

interface SettingsState {
  settings: Settings;
  /** Aplica uma alteração parcial, validada pelo schema. */
  update: (patch: Partial<Settings>) => void;
}

/** Em memória na Fase 1; a Fase 3 liga a persistência. */
export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: parseSettings({}),
  update: (patch) => set((state) => ({ settings: parseSettings({ ...state.settings, ...patch }) })),
}));
