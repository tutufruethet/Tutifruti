import { describe, expect, it } from 'vitest';
import { nextCameraPhase } from './room-store';

describe('nextCameraPhase', () => {
  it('pedir foco inicia a transição e termina em focused', () => {
    expect(nextCameraPhase('free', true, false)).toBe('focusing');
    expect(nextCameraPhase('focusing', true, false)).toBe('focusing');
    expect(nextCameraPhase('focusing', true, true)).toBe('focused');
  });

  it('soltar o foco volta para free passando por leaving', () => {
    expect(nextCameraPhase('focused', false, false)).toBe('leaving');
    expect(nextCameraPhase('leaving', false, true)).toBe('free');
  });

  it('mudar de ideia no meio da transição inverte o caminho', () => {
    expect(nextCameraPhase('focusing', false, false)).toBe('leaving');
    expect(nextCameraPhase('leaving', true, false)).toBe('focusing');
  });

  it('sem pedido, free continua free', () => {
    expect(nextCameraPhase('free', false, true)).toBe('free');
  });
});
