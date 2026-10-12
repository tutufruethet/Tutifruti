'use client';

import { useEffect } from 'react';
import { Icon } from '@/components/ui/icon';
import { layer } from '@/design/tokens';
import { type NotificationItem, useNotificationStore } from '@/os/notifications/store';

const TOAST_MS = 5000;

export function Toasts() {
  const toasts = useNotificationStore((state) => state.toasts);
  const items = useNotificationStore((state) => state.items);
  const visible = toasts
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is NotificationItem => item !== undefined);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="toasts"
      className="pointer-events-none absolute bottom-14 right-3 flex w-80 max-w-[calc(100%-1.5rem)] flex-col-reverse gap-2"
      style={{ zIndex: layer.notification }}
    >
      {visible.map((item) => (
        <Toast key={item.id} item={item} />
      ))}
    </div>
  );
}

function Toast({ item }: { item: NotificationItem }) {
  const dismissToast = useNotificationStore((state) => state.dismissToast);

  useEffect(() => {
    const timer = window.setTimeout(() => dismissToast(item.id), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [item.id, dismissToast]);

  return (
    <div className="pointer-events-auto flex animate-pop gap-3 border border-line bg-ink px-4 py-3">
      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 bg-signal" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-paper">{item.title}</p>
        {item.body ? <p className="mt-0.5 text-sm text-paper/56">{item.body}</p> : null}
      </div>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => dismissToast(item.id)}
        className="flex size-6 items-center justify-center text-paper/40 hover:text-paper"
      >
        <Icon name="close" />
      </button>
    </div>
  );
}
