import { create } from 'zustand';

/**
 * Estado da superfície de teste da Fase 1. Fica numa store Zustand (fora da
 * árvore React) para provar que o estado do OS sobrevive à troca entre o
 * monitor 3D e a tela cheia 2D, que montam raízes React diferentes.
 */
export interface ProbeEvent {
  readonly id: number;
  readonly label: string;
}

interface ProbeState {
  text: string;
  lastMenuItem: string | null;
  shortcutCount: number;
  events: readonly ProbeEvent[];
  setText: (text: string) => void;
  chooseMenuItem: (item: string) => void;
  registerShortcut: (combo: string) => void;
  log: (label: string) => void;
}

const MAX_EVENTS = 4;
let nextEventId = 1;

function append(events: readonly ProbeEvent[], label: string): readonly ProbeEvent[] {
  return [{ id: nextEventId++, label }, ...events].slice(0, MAX_EVENTS);
}

export const useProbeStore = create<ProbeState>()((set) => ({
  text: '',
  lastMenuItem: null,
  shortcutCount: 0,
  events: [],
  setText: (text) => set({ text }),
  chooseMenuItem: (item) => set((state) => ({ lastMenuItem: item, events: append(state.events, `menu → ${item}`) })),
  registerShortcut: (combo) =>
    set((state) => ({ shortcutCount: state.shortcutCount + 1, events: append(state.events, `atalho → ${combo}`) })),
  log: (label) => set((state) => ({ events: append(state.events, label) })),
}));
