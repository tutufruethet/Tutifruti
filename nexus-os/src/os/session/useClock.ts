'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 1000);
  return () => window.clearInterval(id);
}

/** Texto formatado da hora atual, atualizado a cada segundo (vazio no servidor). */
export function useClockText(format: Intl.DateTimeFormat): string {
  return useSyncExternalStore(
    subscribe,
    () => format.format(new Date()),
    () => '',
  );
}
