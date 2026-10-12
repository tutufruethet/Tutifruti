import type { CSSProperties } from 'react';

/**
 * Wallpapers do sistema, feitos em CSS (sem imagem para baixar). Seguem a regra
 * do estudo: fundo escuro, linhas finas, e cor só como brilho de canto.
 */
export interface Wallpaper {
  readonly id: string;
  readonly name: string;
  readonly style: CSSProperties;
  /** Wordmark gigante no rodapé (estudo: detalhes-de-acabamento). */
  readonly wordmark: boolean;
}

const LINE = 'rgb(234 241 255 / 0.045)';

export const WALLPAPERS: readonly Wallpaper[] = [
  {
    id: 'nexus-grid',
    name: 'Grade',
    wordmark: true,
    style: {
      backgroundColor: '#07090F',
      backgroundImage: `linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px)`,
      backgroundSize: '48px 48px',
    },
  },
  {
    id: 'horizon',
    name: 'Horizonte',
    wordmark: false,
    style: {
      backgroundColor: '#07090F',
      backgroundImage: 'radial-gradient(120% 55% at 50% 115%, rgb(0 123 255 / 0.3), transparent 62%)',
    },
  },
  {
    id: 'violet-corner',
    name: 'Canto violeta',
    wordmark: true,
    style: {
      backgroundColor: '#07090F',
      backgroundImage: 'radial-gradient(60% 60% at 100% 0%, rgb(114 87 255 / 0.22), transparent 70%)',
    },
  },
  {
    id: 'void',
    name: 'Vazio',
    wordmark: false,
    style: { backgroundColor: '#07090F' },
  },
];

export function findWallpaper(id: string): Wallpaper {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === id) ?? WALLPAPERS[0]!;
}
