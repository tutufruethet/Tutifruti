/**
 * Presets gráficos. Cada nível liga ou desliga o que custa caro.
 * `postprocessing` é a chave que a Fase 4 vai ler para o bloom;
 * na Fase 1 ainda não existe pós-processamento na cena.
 */
export const QUALITY_LEVELS = ['low', 'medium', 'high', 'ultra'] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];

export interface QualityPreset {
  readonly level: QualityLevel;
  /** Teto do devicePixelRatio do canvas (estudo: 1,5–2). */
  readonly maxDpr: number;
  readonly shadows: boolean;
  readonly shadowMapSize: number;
  readonly antialias: boolean;
  readonly postprocessing: boolean;
}

export const QUALITY_PRESETS: Readonly<Record<QualityLevel, QualityPreset>> = {
  low: { level: 'low', maxDpr: 1, shadows: false, shadowMapSize: 512, antialias: false, postprocessing: false },
  medium: { level: 'medium', maxDpr: 1.5, shadows: true, shadowMapSize: 1024, antialias: true, postprocessing: false },
  high: { level: 'high', maxDpr: 2, shadows: true, shadowMapSize: 2048, antialias: true, postprocessing: true },
  ultra: { level: 'ultra', maxDpr: 2, shadows: true, shadowMapSize: 4096, antialias: true, postprocessing: true },
};

export interface DeviceHints {
  readonly coarsePointer: boolean;
  readonly hardwareConcurrency?: number;
  /** GB, da Device Memory API (só Chromium). */
  readonly deviceMemory?: number;
}

/** Sugestão inicial para o modo "auto". `ultra` só por escolha explícita. */
export function suggestQuality(hints: DeviceHints): QualityLevel {
  const cores = hints.hardwareConcurrency ?? 4;
  const memory = hints.deviceMemory ?? 8;
  if (hints.coarsePointer) return memory >= 6 && cores >= 8 ? 'medium' : 'low';
  if (cores >= 8 && memory >= 8) return 'high';
  if (cores >= 4 && memory >= 4) return 'medium';
  return 'low';
}

export function resolveQuality(setting: QualityLevel | 'auto', hints: DeviceHints): QualityPreset {
  return QUALITY_PRESETS[setting === 'auto' ? suggestQuality(hints) : setting];
}
