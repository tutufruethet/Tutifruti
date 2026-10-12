import type { AppManifest, Size } from '@/os/apps/types';
import type { Bounds, ResizeEdge, WindowManagerState, WindowState } from './types';

/**
 * Regras do gerenciador de janelas como funções puras (estado → estado).
 * A store Zustand só as aplica; os testes as exercitam direto.
 */
export const COMPACT_BREAKPOINT = 640;
export const TITLE_BAR_HEIGHT = 36;
/** Quanto da janela precisa continuar visível ao arrastar para fora. */
const KEEP_VISIBLE = 96;
const CASCADE_STEP = 28;
const CASCADE_SLOTS = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function isCompact(desktop: Size): boolean {
  return desktop.width < COMPACT_BREAKPOINT;
}

export function createWindowManagerState(desktop: Size): WindowManagerState {
  return { windows: [], focusedId: null, nextZ: 1, desktop };
}

export function clampBounds(bounds: Bounds, minSize: Size, desktop: Size): Bounds {
  const width = Math.round(clamp(bounds.width, Math.min(minSize.width, desktop.width), desktop.width));
  const height = Math.round(clamp(bounds.height, Math.min(minSize.height, desktop.height), desktop.height));
  return {
    width,
    height,
    x: Math.round(clamp(bounds.x, KEEP_VISIBLE - width, desktop.width - KEEP_VISIBLE)),
    y: Math.round(clamp(bounds.y, 0, desktop.height - TITLE_BAR_HEIGHT)),
  };
}

/** Janela visível mais à frente, opcionalmente ignorando uma. */
export function topVisibleWindow(windows: readonly WindowState[], excludeId?: string): WindowState | undefined {
  let top: WindowState | undefined;
  for (const window of windows) {
    if (window.id === excludeId || window.display === 'minimized') continue;
    if (!top || window.z > top.z) top = window;
  }
  return top;
}

function update(state: WindowManagerState, id: string, change: (window: WindowState) => WindowState): WindowManagerState {
  return { ...state, windows: state.windows.map((window) => (window.id === id ? change(window) : window)) };
}

export function focusWindow(state: WindowManagerState, id: string): WindowManagerState {
  const target = state.windows.find((window) => window.id === id);
  if (!target) return state;
  if (state.focusedId === id && target.display !== 'minimized' && target.z === state.nextZ - 1) return state;
  const focused = update(state, id, (window) => ({
    ...window,
    z: state.nextZ,
    display: window.display === 'minimized' ? window.previousDisplay : window.display,
  }));
  return { ...focused, focusedId: id, nextZ: state.nextZ + 1 };
}

export interface OpenOptions {
  readonly id: string;
  readonly title?: string;
  readonly launchArgs?: Readonly<Record<string, string>>;
}

export function openWindow(
  state: WindowManagerState,
  manifest: AppManifest,
  options: OpenOptions,
): { state: WindowManagerState; id: string } {
  if (manifest.window.singleInstance) {
    const existing = state.windows.find((window) => window.appId === manifest.id);
    if (existing) {
      const withArgs = options.launchArgs
        ? update(state, existing.id, (window) => ({ ...window, launchArgs: options.launchArgs }))
        : state;
      return { state: focusWindow(withArgs, existing.id), id: existing.id };
    }
  }

  const { desktop } = state;
  const { defaultSize, minSize } = manifest.window;
  const slot = state.windows.length % CASCADE_SLOTS;
  const width = Math.min(defaultSize.width, desktop.width);
  const height = Math.min(defaultSize.height, desktop.height);
  const bounds = clampBounds(
    {
      width,
      height,
      x: Math.round((desktop.width - width) / 2) + (slot - 2) * CASCADE_STEP,
      y: Math.round((desktop.height - height) / 3) + slot * CASCADE_STEP,
    },
    minSize,
    desktop,
  );

  const window: WindowState = {
    id: options.id,
    appId: manifest.id,
    title: options.title ?? manifest.name,
    bounds,
    minSize,
    resizable: manifest.window.resizable,
    display: 'normal',
    previousDisplay: 'normal',
    z: state.nextZ,
    launchArgs: options.launchArgs,
  };

  return {
    state: { ...state, windows: [...state.windows, window], focusedId: window.id, nextZ: state.nextZ + 1 },
    id: window.id,
  };
}

export function closeWindow(state: WindowManagerState, id: string): WindowManagerState {
  const windows = state.windows.filter((window) => window.id !== id);
  const focusedId = state.focusedId === id ? (topVisibleWindow(windows)?.id ?? null) : state.focusedId;
  return { ...state, windows, focusedId };
}

export function minimizeWindow(state: WindowManagerState, id: string): WindowManagerState {
  const target = state.windows.find((window) => window.id === id);
  if (!target || target.display === 'minimized') return state;
  const minimized = update(state, id, (window) => ({
    ...window,
    previousDisplay: window.display === 'maximized' ? 'maximized' : 'normal',
    display: 'minimized',
  }));
  const focusedId = state.focusedId === id ? (topVisibleWindow(minimized.windows, id)?.id ?? null) : state.focusedId;
  return { ...minimized, focusedId };
}

export function toggleMaximize(state: WindowManagerState, id: string): WindowManagerState {
  const target = state.windows.find((window) => window.id === id);
  if (!target || !target.resizable) return focusWindow(state, id);
  const toggled = update(state, id, (window) => ({
    ...window,
    display: window.display === 'maximized' ? 'normal' : 'maximized',
  }));
  return focusWindow(toggled, id);
}

export function moveWindow(state: WindowManagerState, id: string, x: number, y: number): WindowManagerState {
  return update(state, id, (window) =>
    window.display === 'normal' ? { ...window, bounds: clampBounds({ ...window.bounds, x, y }, window.minSize, state.desktop) } : window,
  );
}

export function resizeWindow(state: WindowManagerState, id: string, bounds: Bounds): WindowManagerState {
  return update(state, id, (window) =>
    window.display === 'normal' && window.resizable
      ? { ...window, bounds: clampBounds(bounds, window.minSize, state.desktop) }
      : window,
  );
}

/**
 * Novo retângulo ao arrastar uma borda. A borda oposta fica parada, inclusive
 * quando o tamanho mínimo impede de encolher mais.
 */
export function resizeFromEdge(start: Bounds, edge: ResizeEdge, dx: number, dy: number, minSize: Size): Bounds {
  let { x, y, width, height } = start;
  if (edge.includes('e')) width = Math.max(minSize.width, start.width + dx);
  if (edge.includes('s')) height = Math.max(minSize.height, start.height + dy);
  if (edge.includes('w')) {
    width = Math.max(minSize.width, start.width - dx);
    x = start.x + start.width - width;
  }
  if (edge.includes('n')) {
    height = Math.max(minSize.height, start.height - dy);
    y = start.y + start.height - height;
  }
  return { x, y, width, height };
}

export function setDesktopSize(state: WindowManagerState, desktop: Size): WindowManagerState {
  if (desktop.width === state.desktop.width && desktop.height === state.desktop.height) return state;
  return {
    ...state,
    desktop,
    windows: state.windows.map((window) => ({ ...window, bounds: clampBounds(window.bounds, window.minSize, desktop) })),
  };
}

/** Traz para a frente a janela visível que está mais ao fundo (alterna entre todas). */
export function cycleWindows(state: WindowManagerState): WindowManagerState {
  const visible = state.windows.filter((window) => window.display !== 'minimized');
  if (visible.length === 0) {
    const lastMinimized = state.windows.at(-1);
    return lastMinimized ? focusWindow(state, lastMinimized.id) : state;
  }
  const bottom = visible.reduce((lowest, window) => (window.z < lowest.z ? window : lowest));
  return focusWindow(state, bottom.id);
}

/** Exibição efetiva: em telas compactas, toda janela normal ocupa o desktop inteiro. */
export function effectiveDisplay(window: WindowState, desktop: Size) {
  return isCompact(desktop) && window.display === 'normal' ? 'maximized' : window.display;
}

/** Janela como fica salva no perfil (sem id nem ordem absoluta). */
export interface SavedWindow {
  readonly appId: AppManifest['id'];
  readonly title: string;
  readonly bounds: Bounds;
  readonly display: WindowState['display'];
  readonly launchArgs?: Readonly<Record<string, string>>;
}

export function toSavedWindows(state: WindowManagerState): SavedWindow[] {
  return [...state.windows]
    .sort((a, b) => a.z - b.z)
    .map(({ appId, title, bounds, display, launchArgs }) => ({ appId, title, bounds, display, launchArgs }));
}

/**
 * Reabre as janelas salvas, de trás para a frente. Apps que não existem mais
 * são ignorados; tamanhos são ajustados ao desktop atual.
 */
export function restoreWindows(
  state: WindowManagerState,
  saved: readonly SavedWindow[],
  manifestFor: (appId: AppManifest['id']) => AppManifest | undefined,
  makeId: () => string,
): WindowManagerState {
  let next = state;
  for (const entry of saved) {
    const manifest = manifestFor(entry.appId);
    if (!manifest) continue;
    const opened = openWindow(next, manifest, { id: makeId(), title: entry.title, launchArgs: entry.launchArgs });
    const display = entry.display;
    next = update(opened.state, opened.id, (window) => ({
      ...window,
      bounds: clampBounds(entry.bounds, window.minSize, next.desktop),
      display,
      previousDisplay: display === 'maximized' ? 'maximized' : 'normal',
    }));
  }
  const top = topVisibleWindow(next.windows);
  return { ...next, focusedId: top?.id ?? null };
}
