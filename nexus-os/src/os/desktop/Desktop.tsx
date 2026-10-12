'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { appRegistry } from '@/apps/catalog';
import { isIconName } from '@/components/ui/icon';
import { AppHost } from '@/os/apps/AppHost';
import { useOsShortcuts } from '@/os/keyboard/use-os-shortcuts';
import { useSessionStore } from '@/os/session/store';
import { useOs } from '@/os/shell/os-context';
import { AppWindow } from '@/os/window-manager/AppWindow';
import { useWindowStore } from '@/os/window-manager/store';
import { useReducedMotion } from '@/settings/motion';
import { BootScreen } from './BootScreen';
import { useDesktopStore } from './desktop-store';
import { DesktopIcons } from './DesktopIcons';
import { Taskbar } from './Taskbar';
import { Toasts } from './Toasts';
import { WallpaperLayer } from './Wallpaper';

function withFocused(action: (id: string) => void) {
  return () => {
    const { focusedId } = useWindowStore.getState();
    if (focusedId) action(focusedId);
  };
}

/** O desktop do NEXUS OS: wallpaper, janelas, barra de tarefas, avisos e boot. */
export function Desktop() {
  const { root } = useOs();
  const reducedMotion = useReducedMotion();
  const phase = useSessionStore((state) => state.phase);
  const bootDismissed = useSessionStore((state) => state.bootDismissed);
  const windows = useWindowStore((state) => state.windows);
  const focusedId = useWindowStore((state) => state.focusedId);
  const [area, setArea] = useState<HTMLDivElement | null>(null);

  const startBoot = useEffectEvent(() => {
    void useSessionStore.getState().boot({ reducedMotion });
  });
  useEffect(() => {
    startBoot();
  }, []);

  // O tamanho do desktop vem do container (resolução fixa no monitor, fluida em tela cheia).
  useEffect(() => {
    if (!area) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      useWindowStore.getState().setDesktopSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, [area]);

  const { close, minimize, toggleMaximize, cycle } = useWindowStore.getState();
  useOsShortcuts(root, {
    'mod+k': () => useDesktopStore.getState().togglePanel('launcher'),
    'alt+w': withFocused(close),
    'alt+m': withFocused(minimize),
    'alt+up': withFocused(toggleMaximize),
    'alt+j': cycle,
  });

  return (
    <div
      data-desktop=""
      data-desktop-ready={phase === 'ready' && bootDismissed ? '' : undefined}
      className="relative flex h-full flex-col overflow-hidden"
    >
      <WallpaperLayer />
      <div ref={setArea} data-testid="desktop-area" className="relative isolate min-h-0 flex-1">
        <DesktopIcons />
        {windows.map((win) => {
          const manifest = appRegistry.get(win.appId);
          if (!manifest) return null;
          return (
            <AppWindow
              key={win.id}
              window={win}
              icon={isIconName(manifest.icon) ? manifest.icon : 'file'}
              focused={win.id === focusedId}
            >
              <AppHost manifest={manifest} windowId={win.id} launchArgs={win.launchArgs} />
            </AppWindow>
          );
        })}
      </div>
      <Taskbar />
      <Toasts />
      {bootDismissed ? null : <BootScreen reducedMotion={reducedMotion} />}
    </div>
  );
}
