import { create } from 'zustand';
import type { NotificationInput, NotificationService, NotificationTone } from '@/system/bridge';

export interface NotificationItem {
  readonly id: string;
  readonly title: string;
  readonly body?: string;
  readonly tone: NotificationTone;
  readonly source: string;
  readonly createdAt: number;
  readonly read: boolean;
}

const MAX_ITEMS = 50;
const MAX_TOASTS = 3;

interface NotificationState {
  items: readonly NotificationItem[];
  /** Ids exibidos como aviso temporário (toast). */
  toasts: readonly string[];
  notify: (input: NotificationInput) => string;
  dismiss: (id: string) => void;
  dismissToast: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

let sequence = 0;

export const useNotificationStore = create<NotificationState>()((set) => ({
  items: [],
  toasts: [],
  notify: (input) => {
    sequence += 1;
    const item: NotificationItem = {
      id: `n${sequence}`,
      title: input.title,
      body: input.body,
      tone: input.tone ?? 'info',
      source: input.source,
      createdAt: Date.now(),
      read: false,
    };
    set((state) => ({
      items: [item, ...state.items].slice(0, MAX_ITEMS),
      toasts: [item.id, ...state.toasts].slice(0, MAX_TOASTS),
    }));
    return item.id;
  },
  dismiss: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      toasts: state.toasts.filter((toast) => toast !== id),
    })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast !== id) })),
  markAllRead: () => set((state) => ({ items: state.items.map((item) => ({ ...item, read: true })) })),
  clear: () => set({ items: [], toasts: [] }),
}));

export function unreadCount(items: readonly NotificationItem[]): number {
  return items.reduce((count, item) => count + (item.read ? 0 : 1), 0);
}

/** Adaptador da store para o contrato da `SystemBridge`. */
export const notificationService: NotificationService = {
  notify: async (input) => useNotificationStore.getState().notify(input),
  dismiss: async (id) => useNotificationStore.getState().dismiss(id),
};
