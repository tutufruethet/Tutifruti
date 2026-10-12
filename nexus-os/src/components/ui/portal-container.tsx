'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Onde os componentes de UI montam seus portais (menus, diálogos, dicas).
 * Dentro do OS, aponta para a camada `[data-os-portal]` do próprio OS: assim um
 * menu aberto no monitor 3D continua dentro do monitor, em vez de "vazar" para
 * o `document.body`. Fora do OS, fica `null` e o Radix usa o body.
 */
const PortalContainerContext = createContext<HTMLElement | null>(null);

export function PortalContainerProvider({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: ReactNode;
}) {
  return <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>;
}

export function usePortalContainer(): HTMLElement | null {
  return useContext(PortalContainerContext);
}
