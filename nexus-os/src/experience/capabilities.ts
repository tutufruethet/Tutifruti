'use client';

import { useSyncExternalStore } from 'react';
import type { DeviceHints } from '@/engine/quality';

export interface ClientCapabilities extends DeviceHints {
  readonly webgl2: boolean;
  readonly reducedMotion: boolean;
  /** Tela estreita (< 768px): focar o monitor leva ao desktop 2D. */
  readonly narrow: boolean;
}

const QUERIES = {
  reducedMotion: '(prefers-reduced-motion: reduce)',
  coarsePointer: '(pointer: coarse)',
  narrow: '(max-width: 767px)',
} as const;

function detectWebGL2(doc: Document): boolean {
  try {
    const canvas = doc.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function detectCapabilities(win: Window): ClientCapabilities {
  const nav = win.navigator as Navigator & { deviceMemory?: number };
  return {
    webgl2: detectWebGL2(win.document),
    reducedMotion: win.matchMedia(QUERIES.reducedMotion).matches,
    coarsePointer: win.matchMedia(QUERIES.coarsePointer).matches,
    narrow: win.matchMedia(QUERIES.narrow).matches,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
  };
}

let cached: ClientCapabilities | null = null;

function subscribe(onChange: () => void) {
  const lists = Object.values(QUERIES).map((query) => window.matchMedia(query));
  const handle = () => {
    cached = null;
    onChange();
  };
  for (const list of lists) list.addEventListener('change', handle);
  return () => {
    for (const list of lists) list.removeEventListener('change', handle);
  };
}

function getSnapshot(): ClientCapabilities {
  cached ??= detectCapabilities(window);
  return cached;
}

function getServerSnapshot(): ClientCapabilities | null {
  return null;
}

/** Capacidades do navegador. `null` no servidor e no primeiro paint. */
export function useClientCapabilities(): ClientCapabilities | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
