/**
 * Medidas do quarto em metros. A geometria da Fase 1 é provisória (blocos);
 * a Fase 4 troca por modelos GLB mantendo estes pontos de referência.
 */
export type Vec3 = readonly [number, number, number];

export const ROOM = {
  backWallZ: -1.05,
  leftWallX: -1.7,
  height: 2.8,
} as const;

export const DESK = {
  top: 0.74,
  width: 1.6,
  depth: 0.7,
  thickness: 0.04,
  centerZ: -0.66,
} as const;

/** Tela 16:10 do monitor. O DOM do OS (1280×800) é mapeado nela. */
export const MONITOR = {
  screenWidth: 0.96,
  screenHeight: 0.6,
  center: [0, 1.16, -0.82] as Vec3,
} as const;

export const CAMERA = {
  fov: 38,
  overview: {
    position: [1.05, 1.42, 1.3] as Vec3,
    target: [0, 1.0, -0.7] as Vec3,
  },
  /** Fração da viewport que a tela ocupa quando o monitor está em foco. */
  focusFill: 0.92,
} as const;
