'use client';

import { appRegistry } from '@/apps/catalog';
import { Icon, isIconName } from '@/components/ui/icon';
import { openApp } from '@/os/apps/launch';

/** Atalhos no desktop: pequenos, em coluna, rótulo legível (sem ícones gigantes). */
export function DesktopIcons() {
  return (
    <nav aria-label="Apps no desktop" className="absolute left-3 top-3 flex flex-col gap-1">
      {appRegistry.list().map((app) => (
        <button
          key={app.id}
          type="button"
          data-testid={`desktop-icon-${app.id}`}
          onClick={() => openApp(app.id)}
          className="group flex w-28 items-center gap-2 px-2 py-1.5 text-left text-sm text-paper/70 transition-colors duration-(--duration-ui) ease-expo hover:bg-paper/[0.06] hover:text-paper focus-visible:outline-1 focus-visible:outline-signal"
        >
          <Icon name={isIconName(app.icon) ? app.icon : 'file'} className="text-slate group-hover:text-paper" />
          {app.name}
        </button>
      ))}
    </nav>
  );
}
