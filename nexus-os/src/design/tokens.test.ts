import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { color, contrastRatio, motion, typeStep } from './tokens';

// O Vitest roda a partir da raiz do projeto (nexus-os/).
const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8').toLowerCase();

describe('paleta', () => {
  it('texto principal tem contraste AAA sobre o fundo', () => {
    expect(contrastRatio(color.paper, color.ink)).toBeGreaterThanOrEqual(7);
  });

  it('texto secundário e acento passam AA sobre o fundo', () => {
    expect(contrastRatio(color.slate, color.ink)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color.signal, color.ink)).toBeGreaterThanOrEqual(4.5);
  });

  it('texto escuro sobre o acento (botão principal) passa AA', () => {
    expect(contrastRatio(color.ink, color.signal)).toBeGreaterThanOrEqual(4.5);
  });

  it('a interface tem 3 neutros e 1 acento', () => {
    expect(Object.keys(color)).toHaveLength(4);
  });

  it('o CSS espelha os tokens de cor', () => {
    expect(css).toContain(`--color-ink: ${color.ink.toLowerCase()}`);
    expect(css).toContain(`--color-paper: ${color.paper.toLowerCase()}`);
    expect(css).toContain(`--color-slate: ${color.slate.toLowerCase()}`);
    expect(css).toContain(`--color-signal: ${color.signal.toLowerCase()}`);
  });

  it('o CSS remove a paleta padrão do Tailwind', () => {
    expect(css).toContain('--color-*: initial');
  });
});

describe('movimento', () => {
  it('o CSS usa o mesmo easing dos tokens', () => {
    expect(css).toContain(`--ease-expo: ${motion.easeCss}`);
  });
});

describe('escala de tipo', () => {
  it('segue a razão 1,2 a partir de 14px', () => {
    expect(typeStep(0)).toBe(14);
    expect(typeStep(1)).toBe(16.8);
    expect(typeStep(2)).toBe(20.16);
    expect(typeStep(-1)).toBeCloseTo(11.67, 2);
  });
});
