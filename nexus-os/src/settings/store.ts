import { create } from 'zustand';
import { parseSettings, type Settings } from './schema';

interface SettingsState {
  settings: Settings;
  /** Aplica uma alteração parcial, validada pelo schema. */
  update: (patch: Partial<Settings>) => void;
  /** Troca tudo por dados vindos do armazenamento (validados; campos ruins voltam ao padrão). */
  replace: (input: unknown) => void;
  reset: () => void;
}

/** A sessão (os/session) carrega e salva estas preferências por perfil. */
export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: parseSettings({}),
  update: (patch) => set((state) => ({ settings: parseSettings({ ...state.settings, ...patch }) })),
  replace: (input) => set({ settings: parseSettings(input) }),
  reset: () => set({ settings: parseSettings({}) }),
}));
