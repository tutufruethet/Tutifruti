'use client';

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { layer } from '@/design/tokens';
import { cn } from '@/lib/cn';
import { startPointerDrag } from '@/os/shell/coords';
import { useOs } from '@/os/shell/os-context';
import { effectiveDisplay, isCompact, resizeFromEdge } from './logic';
import { useWindowStore } from './store';
import type { ResizeEdge, WindowState } from './types';

const EDGES: readonly { edge: ResizeEdge; className: string }[] = [
  { edge: 'n', className: 'inset-x-2 -top-1 h-2 cursor-ns-resize' },
  { edge: 's', className: 'inset-x-2 -bottom-1 h-2 cursor-ns-resize' },
  { edge: 'e', className: 'inset-y-2 -right-1 w-2 cursor-ew-resize' },
  { edge: 'w', className: 'inset-y-2 -left-1 w-2 cursor-ew-resize' },
  { edge: 'ne', className: '-right-1 -top-1 size-3 cursor-nesw-resize' },
  { edge: 'nw', className: '-left-1 -top-1 size-3 cursor-nwse-resize' },
  { edge: 'se', className: '-bottom-1 -right-1 size-3 cursor-nwse-resize' },
  { edge: 'sw', className: '-bottom-1 -left-1 size-3 cursor-nesw-resize' },
];

function stop(event: ReactPointerEvent) {
  event.stopPropagation();
}

export function AppWindow({
  window: win,
  icon,
  focused,
  children,
}: {
  window: WindowState;
  icon: IconName;
  focused: boolean;
  children: ReactNode;
}) {
  const { root } = useOs();
  const desktop = useWindowStore((state) => state.desktop);
  const display = effectiveDisplay(win, desktop);
  const compact = isCompact(desktop);
  const maximized = display === 'maximized';
  const ref = useRef<HTMLElement>(null);

  // Ao abrir, o foco do teclado vai para a janela (o app pode puxar para um campo).
  useEffect(() => {
    const node = ref.current;
    if (node && !node.contains(document.activeElement)) node.focus({ preventScroll: true });
  }, []);

  const { focus, close, minimize, toggleMaximize, move, resize } = useWindowStore.getState();

  function onTitlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (display !== 'normal' || compact) return;
    const start = win.bounds;
    startPointerDrag(event, root, (dx, dy) => move(win.id, start.x + dx, start.y + dy));
  }

  function onEdgePointerDown(edge: ResizeEdge, event: ReactPointerEvent<HTMLElement>) {
    event.stopPropagation();
    const start = win.bounds;
    startPointerDrag(event, root, (dx, dy) => resize(win.id, resizeFromEdge(start, edge, dx, dy, win.minSize)));
  }

  const { x, y, width, height } = win.bounds;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={win.title}
      data-window-id={win.id}
      data-app-id={win.appId}
      data-display={display}
      data-focused={focused || undefined}
      data-bounds={`${x},${y},${width},${height}`}
      onPointerDownCapture={() => focus(win.id)}
      onFocusCapture={() => focus(win.id)}
      className={cn(
        'absolute flex flex-col border bg-ink outline-none',
        focused ? 'border-paper/24' : 'border-line',
        display === 'minimized' && 'hidden',
      )}
      style={{
        zIndex: layer.window + win.z,
        ...(maximized ? { left: 0, top: 0, width: '100%', height: '100%' } : { left: x, top: y, width, height }),
      }}
    >
      <header
        onPointerDown={onTitlePointerDown}
        onDoubleClick={() => toggleMaximize(win.id)}
        className={cn(
          'flex h-9 shrink-0 touch-none select-none items-center gap-2 border-b border-line pl-3 pr-1',
          display === 'normal' && !compact && 'cursor-grab active:cursor-grabbing',
        )}
      >
        <Icon name={icon} className={focused ? 'text-paper' : 'text-slate'} />
        <h2 className={cn('min-w-0 flex-1 truncate text-sm', focused ? 'text-paper' : 'text-paper/56')}>{win.title}</h2>
        <div className="flex items-center" onPointerDown={stop} onDoubleClick={(event) => event.stopPropagation()}>
          <WindowButton label="Minimizar" icon="minimize" onClick={() => minimize(win.id)} />
          {win.resizable && !compact ? (
            <WindowButton
              label={maximized ? 'Restaurar' : 'Maximizar'}
              icon={maximized ? 'restore' : 'maximize'}
              onClick={() => toggleMaximize(win.id)}
            />
          ) : null}
          <WindowButton label="Fechar" icon="close" onClick={() => close(win.id)} />
        </div>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
      {display === 'normal' && win.resizable && !compact
        ? EDGES.map(({ edge, className }) => (
            <div
              key={edge}
              aria-hidden
              data-resize={edge}
              onPointerDown={(event) => onEdgePointerDown(edge, event)}
              className={cn('absolute touch-none', className)}
            />
          ))
        : null}
    </section>
  );
}

function WindowButton({ label, icon, onClick }: { label: string; icon: IconName; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center text-paper/56 transition-colors duration-(--duration-ui) ease-expo hover:text-paper focus-visible:outline-1 focus-visible:outline-signal"
    >
      <Icon name={icon} />
    </button>
  );
}
