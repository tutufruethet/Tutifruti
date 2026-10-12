'use client';

import { Icon } from '@/components/ui/icon';
import { useNotificationStore } from '@/os/notifications/store';

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function NotificationPanel() {
  const items = useNotificationStore((state) => state.items);
  const dismiss = useNotificationStore((state) => state.dismiss);
  const clear = useNotificationStore((state) => state.clear);

  return (
    <div data-testid="notification-center" className="flex w-80 max-w-[calc(100cqw-1rem)] flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="type-label text-slate">Notificações</h3>
        {items.length > 0 ? (
          <button type="button" onClick={clear} className="type-label text-paper/56 hover:text-paper">
            Limpar
          </button>
        ) : null}
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-paper/56">Nada por aqui.</p>
      ) : (
        <ol className="max-h-96 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="group flex gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-paper">{item.title}</p>
                {item.body ? <p className="mt-0.5 text-sm text-paper/56">{item.body}</p> : null}
                <p className="type-label mt-1 text-slate">
                  {item.source} · {timeFormat.format(item.createdAt)}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Dispensar: ${item.title}`}
                onClick={() => dismiss(item.id)}
                className="flex size-7 items-center justify-center text-paper/40 hover:text-paper"
              >
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
