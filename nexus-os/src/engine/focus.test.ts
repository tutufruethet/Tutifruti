import { describe, expect, it } from 'vitest';
import { focusDistance, viewportFraction } from './focus';

const screen = { width: 0.96, height: 0.6 };

function fractions(fovDeg: number, aspect: number, distance: number) {
  const halfV = (fovDeg * Math.PI) / 360;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  return {
    vertical: viewportFraction(screen.height, distance, halfV),
    horizontal: viewportFraction(screen.width, distance, halfH),
  };
}

describe('focusDistance', () => {
  it('em tela larga, a altura limita e ocupa exatamente o fill', () => {
    const d = focusDistance({ ...screen, fovDeg: 38, aspect: 16 / 9, fill: 0.9 });
    const f = fractions(38, 16 / 9, d);
    expect(f.vertical).toBeCloseTo(0.9, 6);
    expect(f.horizontal).toBeLessThanOrEqual(0.9 + 1e-9);
  });

  it('em tela retrato, a largura limita', () => {
    const d = focusDistance({ ...screen, fovDeg: 38, aspect: 375 / 812, fill: 0.9 });
    const f = fractions(38, 375 / 812, d);
    expect(f.horizontal).toBeCloseTo(0.9, 6);
    expect(f.vertical).toBeLessThanOrEqual(0.9 + 1e-9);
  });

  it('recusa parâmetros inválidos', () => {
    expect(() => focusDistance({ ...screen, fovDeg: 38, aspect: 1, fill: 1.5 })).toThrow();
  });
});
