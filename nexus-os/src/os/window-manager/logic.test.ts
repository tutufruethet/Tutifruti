import { describe, expect, it } from 'vitest';
import type { AppId, AppManifest } from '@/os/apps/types';
import {
  clampBounds,
  closeWindow,
  createWindowManagerState,
  cycleWindows,
  effectiveDisplay,
  focusWindow,
  minimizeWindow,
  moveWindow,
  openWindow,
  resizeFromEdge,
  setDesktopSize,
  toggleMaximize,
} from './logic';

function manifest(id: string, overrides: Partial<AppManifest['window']> = {}): AppManifest {
  return {
    id: id as AppId,
    name: id,
    description: '',
    category: 'system',
    icon: id,
    permissions: [],
    load: async () => ({ default: () => null }),
    window: {
      defaultSize: { width: 600, height: 400 },
      minSize: { width: 320, height: 200 },
      resizable: true,
      singleInstance: false,
      ...overrides,
    },
  };
}

const desktop = { width: 1280, height: 756 };

function openTwo() {
  let state = createWindowManagerState(desktop);
  state = openWindow(state, manifest('files'), { id: 'a' }).state;
  state = openWindow(state, manifest('notes'), { id: 'b' }).state;
  return state;
}

describe('abrir e focar', () => {
  it('a janela nova fica na frente e com foco', () => {
    const state = openTwo();
    expect(state.focusedId).toBe('b');
    const [a, b] = state.windows;
    expect(b!.z).toBeGreaterThan(a!.z);
  });

  it('janelas em cascata não se sobrepõem exatamente', () => {
    const [a, b] = openTwo().windows;
    expect(a!.bounds).not.toEqual(b!.bounds);
  });

  it('app de instância única reaproveita a janela e atualiza os argumentos', () => {
    let state = createWindowManagerState(desktop);
    const single = manifest('settings', { singleInstance: true });
    state = openWindow(state, single, { id: 'x' }).state;
    state = openWindow(state, manifest('files'), { id: 'y' }).state;
    const result = openWindow(state, single, { id: 'z', launchArgs: { section: 'sobre' } });
    expect(result.id).toBe('x');
    expect(result.state.windows).toHaveLength(2);
    expect(result.state.focusedId).toBe('x');
    expect(result.state.windows.find((w) => w.id === 'x')?.launchArgs).toEqual({ section: 'sobre' });
  });

  it('focar traz para a frente', () => {
    const state = focusWindow(openTwo(), 'a');
    expect(state.focusedId).toBe('a');
    expect(state.windows.find((w) => w.id === 'a')!.z).toBe(state.nextZ - 1);
  });
});

describe('fechar e minimizar', () => {
  it('fechar a janela focada passa o foco para a de trás', () => {
    const state = closeWindow(openTwo(), 'b');
    expect(state.windows.map((w) => w.id)).toEqual(['a']);
    expect(state.focusedId).toBe('a');
  });

  it('minimizar tira o foco e focar restaura o estado anterior', () => {
    let state = toggleMaximize(openTwo(), 'b');
    state = minimizeWindow(state, 'b');
    expect(state.windows.find((w) => w.id === 'b')!.display).toBe('minimized');
    expect(state.focusedId).toBe('a');
    state = focusWindow(state, 'b');
    expect(state.windows.find((w) => w.id === 'b')!.display).toBe('maximized');
  });

  it('alternar janelas percorre todas', () => {
    let state = openTwo();
    state = cycleWindows(state);
    expect(state.focusedId).toBe('a');
    state = cycleWindows(state);
    expect(state.focusedId).toBe('b');
  });
});

describe('maximizar, mover e redimensionar', () => {
  it('maximizar alterna e respeita apps sem redimensionamento', () => {
    let state = createWindowManagerState(desktop);
    state = openWindow(state, manifest('fixo', { resizable: false }), { id: 'f' }).state;
    expect(toggleMaximize(state, 'f').windows[0]!.display).toBe('normal');
    state = openWindow(state, manifest('livre'), { id: 'l' }).state;
    state = toggleMaximize(state, 'l');
    expect(state.windows[1]!.display).toBe('maximized');
    expect(toggleMaximize(state, 'l').windows[1]!.display).toBe('normal');
  });

  it('mover mantém a barra de título alcançável', () => {
    const state = moveWindow(openTwo(), 'a', -5000, -300);
    const { bounds } = state.windows[0]!;
    expect(bounds.y).toBe(0);
    expect(bounds.x + bounds.width).toBeGreaterThanOrEqual(96);
  });

  it('redimensionar pela borda esquerda mantém a direita parada e respeita o mínimo', () => {
    const start = { x: 100, y: 100, width: 600, height: 400 };
    const bigger = resizeFromEdge(start, 'w', -50, 0, { width: 320, height: 200 });
    expect(bigger).toEqual({ x: 50, y: 100, width: 650, height: 400 });
    const tooSmall = resizeFromEdge(start, 'nw', 1000, 1000, { width: 320, height: 200 });
    expect(tooSmall).toEqual({ x: 380, y: 300, width: 320, height: 200 });
  });

  it('clampBounds nunca deixa a janela maior que o desktop', () => {
    const bounds = clampBounds({ x: 0, y: 0, width: 5000, height: 5000 }, { width: 320, height: 200 }, desktop);
    expect(bounds.width).toBe(desktop.width);
    expect(bounds.height).toBe(desktop.height);
  });
});

describe('desktop compacto', () => {
  it('em tela estreita, janelas normais aparecem maximizadas', () => {
    let state = openTwo();
    state = setDesktopSize(state, { width: 375, height: 700 });
    expect(effectiveDisplay(state.windows[0]!, state.desktop)).toBe('maximized');
    expect(state.windows[0]!.bounds.width).toBeLessThanOrEqual(375);
  });
});
