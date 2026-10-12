'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { PortalContainerProvider } from '@/components/ui/portal-container';
import { TooltipProvider } from '@/components/ui/tooltip';
import { layer } from '@/design/tokens';
import { cn } from '@/lib/cn';
import { OsContext } from './os-context';
import type { OsViewport } from './viewport';

export interface OsRootProps {
  viewport: OsViewport;
  children: ReactNode;
  className?: string;
  label?: string;
}

/**
 * Raiz do sistema operacional. É autossuficiente (traz os próprios providers)
 * porque, dentro do monitor 3D, o `<Html>` do Drei renderiza numa raiz React
 * separada, onde contextos de fora não chegam. Estado compartilhado mora em
 * stores Zustand, que funcionam nas duas raízes.
 */
export function OsRoot({ viewport, children, className, label = 'NEXUS OS' }: OsRootProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  const value = useMemo(() => ({ root, viewport }), [root, viewport]);
  const fixed = viewport.mode === 'fixed';

  return (
    <div
      ref={setRoot}
      data-os-root=""
      data-os-viewport={viewport.mode}
      role="region"
      aria-label={label}
      className={cn(
        '@container relative isolate overflow-hidden bg-ink font-sans text-paper',
        !fixed && 'h-full w-full',
        className,
      )}
      style={fixed ? { width: viewport.width, height: viewport.height } : undefined}
    >
      <OsContext.Provider value={value}>
        <PortalContainerProvider container={portal}>
          <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        </PortalContainerProvider>
      </OsContext.Provider>
      <div
        ref={setPortal}
        data-os-portal=""
        className="pointer-events-none absolute inset-0 *:pointer-events-auto"
        style={{ zIndex: layer.overlay }}
      />
    </div>
  );
}
