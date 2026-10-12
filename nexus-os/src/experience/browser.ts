'use client';

import { useSyncExternalStore } from 'react';

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/** `true` quando a aba está escondida: a cena para de renderizar. */
export function usePageHidden(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false,
  );
}

function subscribeLocation(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}

/** `location.search` sem precisar de Suspense (`useSearchParams`) no export estático. */
export function useLocationSearch(): string {
  return useSyncExternalStore(
    subscribeLocation,
    () => window.location.search,
    () => '',
  );
}
