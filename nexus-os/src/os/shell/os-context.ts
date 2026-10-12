'use client';

import { createContext, useContext } from 'react';
import type { OsViewport } from './viewport';

export interface OsContextValue {
  /** Elemento raiz do OS (`[data-os-root]`). `null` até montar. */
  readonly root: HTMLElement | null;
  readonly viewport: OsViewport;
}

export const OsContext = createContext<OsContextValue | null>(null);

export function useOs(): OsContextValue {
  const value = useContext(OsContext);
  if (!value) throw new Error('useOs() precisa estar dentro de <OsRoot>');
  return value;
}
