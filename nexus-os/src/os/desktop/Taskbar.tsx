'use client';

import { useSyncExternalStore } from 'react';
import { appRegistry } from '@/apps/catalog';
import { Icon, isIconName } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { layer } from '@/design/tokens';
import { cn } from '@/lib/cn';
import { unreadCount, useNotificationStore } from '@/os/notifications/store';
import { UserMenu } from '@/os/session/UserMenu';
import { isCompact, topVisibleWindow } from '@/os/window-manager/logic';
import { useWindowStore } from '@/os/window-manager/store';
import type { WindowState } from '@/os/window-manager/types';
import { CalendarPanel } from './CalendarPanel';
import { type DesktopPanel, useDesktopStore } from './desktop-store';
import { LauncherPanel } from './LauncherPanel';
import { NotificationPanel } from './NotificationPanel';

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

function subscribeMinute(onChange: () => void) {
  const id = window.setInterval(onChange, 1000);
  return () => window.clearInterval(id);
}

function useNow(format: Intl.DateTimeFormat): string {
  return useSyncExternalStore(
    subscribeMinute,
    () => format.format(new Date()),
    () => '',
  );
}

function usePanel(panel: Exclude<DesktopPanel, null>) {
  const open = useDesktopStore((state) => state.panel === panel);
  const setPanel = useDesktopStore((state) => state.setPanel);
  return { open, onOpenChange: (next: boolean) => setPanel(next ? panel : null) };
}

const trayButton =
  'flex h-9 items-center gap-2 px-2.5 text-sm text-paper/70 transition-colors duration-(--duration-ui) ease-expo hover:text-paper data-[state=open]:text-paper';

export function Taskbar() {
  const windows = useWindowStore((state) => state.windows);
  const focusedId = useWindowStore((state) => state.focusedId);
  const compact = useWindowStore((state) => isCompact(state.desktop));
  const unread = useNotificationStore((state) => unreadCount(state.items));
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const launcher = usePanel('launcher');
  const notifications = usePanel('notifications');
  const calendar = usePanel('calendar');
  const time = useNow(timeFormat);
  const date = useNow(dateFormat);

  return (
    <footer
      data-testid="taskbar"
      className="relative flex h-11 shrink-0 items-center gap-1 border-t border-line bg-ink/90 px-1.5"
      style={{ zIndex: layer.taskbar }}
    >
      <Popover {...launcher}>
        <PopoverTrigger asChild>
          <button type="button" data-testid="launcher-button" aria-label="Menu de apps" className={trayButton}>
            <Icon name="grid" />
            {compact ? null : <span className="type-label">Nexus</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className="p-0">
          <LauncherPanel />
        </PopoverContent>
      </Popover>

      <span aria-hidden className="mx-1 h-5 w-px bg-line" />

      <nav aria-label="Janelas abertas" className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {windows.map((win) => (
          <TaskbarWindow key={win.id} window={win} focused={win.id === focusedId} compact={compact} windows={windows} />
        ))}
      </nav>

      <Popover
        open={notifications.open}
        onOpenChange={(next) => {
          notifications.onOpenChange(next);
          if (next) markAllRead();
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="notifications-button"
            aria-label={unread > 0 ? `Notificações (${unread} novas)` : 'Notificações'}
            className={trayButton}
          >
            <Icon name="bell" />
            {unread > 0 ? <span className="type-label text-signal">{unread}</span> : null}
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="p-0">
          <NotificationPanel />
        </PopoverContent>
      </Popover>

      <UserMenu triggerClassName={trayButton} />

      <Popover {...calendar}>
        <PopoverTrigger asChild>
          <button type="button" data-testid="clock-button" aria-label="Relógio e calendário" className={trayButton}>
            {compact ? null : <span className="text-paper/56 first-letter:uppercase">{date}</span>}
            <time className="tabular-nums text-paper" suppressHydrationWarning>
              {time}
            </time>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="p-0">
          <CalendarPanel />
        </PopoverContent>
      </Popover>
    </footer>
  );
}

function TaskbarWindow({
  window: win,
  focused,
  compact,
  windows,
}: {
  window: WindowState;
  focused: boolean;
  compact: boolean;
  windows: readonly WindowState[];
}) {
  const manifest = appRegistry.get(win.appId);
  const minimized = win.display === 'minimized';
  const active = focused && !minimized && topVisibleWindow(windows)?.id === win.id;

  function onClick() {
    const { focus, minimize } = useWindowStore.getState();
    if (active) minimize(win.id);
    else focus(win.id);
  }

  return (
    <button
      type="button"
      data-testid={`taskbar-window-${win.id}`}
      aria-pressed={active}
      aria-label={compact ? win.title : undefined}
      title={win.title}
      onClick={onClick}
      className={cn(
        'relative flex h-9 min-w-0 max-w-44 shrink-0 items-center gap-2 px-2.5 text-sm transition-colors duration-(--duration-ui) ease-expo',
        active ? 'text-paper' : minimized ? 'text-paper/40 hover:text-paper' : 'text-paper/70 hover:text-paper',
      )}
    >
      <Icon name={manifest && isIconName(manifest.icon) ? manifest.icon : 'file'} />
      {compact ? null : <span className="truncate">{win.title}</span>}
      <span
        aria-hidden
        className={cn('absolute inset-x-2.5 bottom-0 h-0.5', active ? 'bg-paper' : minimized ? 'bg-transparent' : 'bg-paper/24')}
      />
    </button>
  );
}
