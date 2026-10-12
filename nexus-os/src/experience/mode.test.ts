import { describe, expect, it } from 'vitest';
import { hasDebugParam, parseModeParam, resolveMode } from './mode';

describe('resolveMode', () => {
  it('padrão é o quarto 3D', () => {
    expect(resolveMode({ chosen: null, fromUrl: null, webgl2: true })).toBe('3d');
  });

  it('sem WebGL2 cai para o desktop 2D, mesmo se pedirem 3D', () => {
    expect(resolveMode({ chosen: '3d', fromUrl: '3d', webgl2: false })).toBe('2d');
  });

  it('a escolha na interface vence o parâmetro da URL', () => {
    expect(resolveMode({ chosen: '2d', fromUrl: '3d', webgl2: true })).toBe('2d');
    expect(resolveMode({ chosen: null, fromUrl: '2d', webgl2: true })).toBe('2d');
  });
});

describe('parâmetros de URL', () => {
  it('lê ?mode e ?debug', () => {
    expect(parseModeParam('?mode=2d')).toBe('2d');
    expect(parseModeParam('?mode=vr')).toBeNull();
    expect(hasDebugParam('?mode=3d&debug')).toBe(true);
    expect(hasDebugParam('')).toBe(false);
  });
});
