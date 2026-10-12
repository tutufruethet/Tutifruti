import { describe, expect, it } from 'vitest';
import { focusDistance, overviewDistance, viewportFraction } from './focus';

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

describe('overviewDistance', () => {
  const frame = { width: 1.3, height: 1.0 };

  it('em tela larga mantém a distância padrão', () => {
    expect(overviewDistance({ baseDistance: 2.3, frame, fovDeg: 38, aspect: 1440 / 900 })).toBe(2.3);
  });

  it('em celular em retrato afasta a câmera para o monitor caber', () => {
    const distance = overviewDistance({ baseDistance: 2.3, frame, fovDeg: 38, aspect: 375 / 812 });
    expect(distance).toBeGreaterThan(2.3);
    const halfH = Math.atan(Math.tan((38 * Math.PI) / 360) * (375 / 812));
    expect(viewportFraction(frame.width, distance, halfH)).toBeCloseTo(0.9, 6);
  });
});
