'use client';

import dynamic from 'next/dynamic';
import { OsRoot } from '@/os/shell/OsRoot';
import { Desktop } from '@/os/desktop/Desktop';
import { FLUID_VIEWPORT } from '@/os/shell/viewport';
import { useReducedMotion } from '@/settings/motion';
import { useLocationSearch } from './browser';
import { useClientCapabilities } from './capabilities';
import { Hud } from './Hud';
import { parseModeParam, resolveMode, useModeStore } from './mode';

const Room3D = dynamic(() => import('@/engine/Room3D'), {
  ssr: false,
  loading: () => <StatusLine>Carregando o quarto</StatusLine>,
});

function StatusLine({ children }: { children: string }) {
  return (
    <div className="type-label flex h-full items-center justify-center text-slate" role="status">
      {children}
    </div>
  );
}

/**
 * Entrada da experiência: escolhe entre o quarto 3D (padrão, com WebGL2) e o
 * desktop 2D (fallback e atalho). O OS é o mesmo componente nos dois.
 */
export function Experience() {
  const capabilities = useClientCapabilities();
  const search = useLocationSearch();
  const chosen = useModeStore((state) => state.chosen);
  const reducedMotion = useReducedMotion();

  if (!capabilities) {
    return (
      <main className="h-dvh">
        <StatusLine>Iniciando</StatusLine>
      </main>
    );
  }

  const mode = resolveMode({ chosen, fromUrl: parseModeParam(search), webgl2: capabilities.webgl2 });

  if (mode === '3d') {
    return (
      <main data-mode="3d" className="relative h-dvh w-full overflow-hidden">
        <h1 className="sr-only">NEXUS OS — quarto 3D</h1>
        <div className="absolute inset-0">
          <Room3D />
        </div>
        <Hud mode="3d" capabilities={capabilities} />
      </main>
    );
  }

  return (
    <main data-mode="2d" className="flex h-dvh w-full flex-col overflow-hidden">
      <Hud mode="2d" capabilities={capabilities} />
      <div className="min-h-0 flex-1">
        <OsRoot viewport={FLUID_VIEWPORT} reducedMotion={reducedMotion}>
          <Desktop />
        </OsRoot>
      </div>
    </main>
  );
}
