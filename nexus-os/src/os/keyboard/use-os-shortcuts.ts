'use client';

import { useEffect, useEffectEvent } from 'react';
import { isEditableTarget } from './scope';
import { hasModifier, matchesShortcut, parseShortcut } from './shortcuts';

export type ShortcutHandler = (event: KeyboardEvent) => void;

/**
 * Registra atalhos no elemento raiz do OS. Só disparam quando o foco está
 * dentro do OS. Atalhos sem Ctrl/⌘/Alt não disparam em campos de texto.
 */
export function useOsShortcuts(root: HTMLElement | null, bindings: Readonly<Record<string, ShortcutHandler>>): void {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    for (const [combo, handler] of Object.entries(bindings)) {
      const shortcut = parseShortcut(combo);
      if (!matchesShortcut(event, shortcut)) continue;
      if (!hasModifier(shortcut) && isEditableTarget(event.target)) continue;
      event.preventDefault();
      handler(event);
      return;
    }
  });

  useEffect(() => {
    if (!root) return;
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    root.addEventListener('keydown', listener);
    return () => root.removeEventListener('keydown', listener);
  }, [root]);
}
