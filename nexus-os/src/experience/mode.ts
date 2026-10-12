import { create } from 'zustand';

/** Os dois caminhos (estudo: mundos-e-navegacao): quarto 3D ou desktop 2D direto. */
export type ExperienceMode = '3d' | '2d';

export function parseModeParam(search: string): ExperienceMode | null {
  const value = new URLSearchParams(search).get('mode');
  return value === '3d' || value === '2d' ? value : null;
}

export function hasDebugParam(search: string): boolean {
  return new URLSearchParams(search).has('debug');
}

/**
 * Prioridade: escolha na interface > parâmetro `?mode=` > automático.
 * Sem WebGL2, sempre 2D (fallback).
 */
export function resolveMode({
  chosen,
  fromUrl,
  webgl2,
}: {
  chosen: ExperienceMode | null;
  fromUrl: ExperienceMode | null;
  webgl2: boolean;
}): ExperienceMode {
  const wanted = chosen ?? fromUrl ?? '3d';
  return wanted === '3d' && !webgl2 ? '2d' : wanted;
}

interface ModeState {
  chosen: ExperienceMode | null;
  choose: (mode: ExperienceMode) => void;
}

export const useModeStore = create<ModeState>()((set) => ({
  chosen: null,
  choose: (mode) => set({ chosen: mode }),
}));
