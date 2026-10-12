import { describe, expect, it } from 'vitest';
import { QUALITY_LEVELS, QUALITY_PRESETS, resolveQuality, suggestQuality } from './quality';

describe('presets gráficos', () => {
  it('o custo cresce de low para ultra', () => {
    const presets = QUALITY_LEVELS.map((level) => QUALITY_PRESETS[level]);
    for (let i = 1; i < presets.length; i += 1) {
      const previous = presets[i - 1]!;
      const current = presets[i]!;
      expect(current.maxDpr).toBeGreaterThanOrEqual(previous.maxDpr);
      expect(current.shadowMapSize).toBeGreaterThanOrEqual(previous.shadowMapSize);
    }
  });

  it('nenhum preset passa de DPR 2', () => {
    for (const level of QUALITY_LEVELS) expect(QUALITY_PRESETS[level].maxDpr).toBeLessThanOrEqual(2);
  });

  it('low desliga sombras e antialias', () => {
    expect(QUALITY_PRESETS.low.shadows).toBe(false);
    expect(QUALITY_PRESETS.low.antialias).toBe(false);
  });
});

describe('suggestQuality', () => {
  it('celular simples fica em low', () => {
    expect(suggestQuality({ coarsePointer: true, hardwareConcurrency: 6, deviceMemory: 4 })).toBe('low');
  });

  it('celular forte fica em medium, nunca acima', () => {
    expect(suggestQuality({ coarsePointer: true, hardwareConcurrency: 8, deviceMemory: 8 })).toBe('medium');
  });

  it('desktop forte fica em high; ultra só por escolha', () => {
    expect(suggestQuality({ coarsePointer: false, hardwareConcurrency: 16, deviceMemory: 8 })).toBe('high');
    expect(resolveQuality('ultra', { coarsePointer: true }).level).toBe('ultra');
  });

  it('sem dicas, assume desktop médio', () => {
    expect(suggestQuality({ coarsePointer: false })).toBe('medium');
  });
});
