'use client';

import { useSyncExternalStore } from 'react';
import { useSettingsStore } from './store';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

/**
 * Movimento reduzido efetivo: a escolha em Settings vence; "sistema" segue o
 * `prefers-reduced-motion` do aparelho.
 */
export function useReducedMotion(): boolean {
  const preference = useSettingsStore((state) => state.settings.motion);
  const system = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
  if (preference === 'reduced') return true;
  if (preference === 'full') return false;
  return system;
}
