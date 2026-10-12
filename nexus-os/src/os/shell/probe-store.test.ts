import { beforeEach, describe, expect, it } from 'vitest';
import { useProbeStore } from './probe-store';

describe('probe-store', () => {
  beforeEach(() => {
    useProbeStore.setState({ text: '', lastMenuItem: null, shortcutCount: 0, events: [] });
  });

  it('registra escolhas de menu e atalhos no log, do mais novo ao mais antigo', () => {
    const { chooseMenuItem, registerShortcut } = useProbeStore.getState();
    chooseMenuItem('Beta');
    registerShortcut('Ctrl/⌘ K');
    const state = useProbeStore.getState();
    expect(state.lastMenuItem).toBe('Beta');
    expect(state.shortcutCount).toBe(1);
    expect(state.events.map((e) => e.label)).toEqual(['atalho → Ctrl/⌘ K', 'menu → Beta']);
  });

  it('mantém só os últimos 4 eventos', () => {
    const { log } = useProbeStore.getState();
    for (const label of ['a', 'b', 'c', 'd', 'e']) log(label);
    expect(useProbeStore.getState().events.map((e) => e.label)).toEqual(['e', 'd', 'c', 'b']);
  });
});
