import { beforeEach, describe, expect, it } from 'vitest';
import { unreadCount, useNotificationStore } from './store';

describe('notificações', () => {
  beforeEach(() => useNotificationStore.getState().clear());

  it('notifica, mostra como toast e conta não lidas', () => {
    const { notify } = useNotificationStore.getState();
    const id = notify({ title: 'Arquivo importado', source: 'files' });
    const state = useNotificationStore.getState();
    expect(state.items[0]).toMatchObject({ id, title: 'Arquivo importado', tone: 'info', read: false });
    expect(state.toasts).toEqual([id]);
    expect(unreadCount(state.items)).toBe(1);
  });

  it('limita a 3 toasts e mantém o histórico', () => {
    const { notify } = useNotificationStore.getState();
    for (let i = 0; i < 5; i += 1) notify({ title: `n${i}`, source: 'teste' });
    const state = useNotificationStore.getState();
    expect(state.toasts).toHaveLength(3);
    expect(state.items).toHaveLength(5);
  });

  it('fechar o toast não apaga do histórico; dispensar apaga', () => {
    const { notify, dismissToast, dismiss, markAllRead } = useNotificationStore.getState();
    const id = notify({ title: 'x', source: 'teste' });
    dismissToast(id);
    expect(useNotificationStore.getState().items).toHaveLength(1);
    markAllRead();
    expect(unreadCount(useNotificationStore.getState().items)).toBe(0);
    dismiss(id);
    expect(useNotificationStore.getState().items).toHaveLength(0);
  });
});
