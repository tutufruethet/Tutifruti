/**
 * Tokens do NEXUS OS: fonte única de verdade para cor, tipo, movimento e camadas.
 * O CSS (`src/app/globals.css`) espelha estes valores no `@theme` do Tailwind;
 * `tokens.test.ts` garante que os dois não se desencontrem.
 *
 * Regra do estudo (estudo/regras/cor-e-paleta.md): 3 neutros + 1 acento.
 * A paleta do briefing tem 5 cores; azul elétrico e roxo viram **luz** na cena 3D
 * (cor da luz e cor da sombra), não cores de interface.
 */

export const color = {
  /** Fundo. Preto profundo do briefing. */
  ink: '#07090F',
  /** Texto principal. Branco suave do briefing. */
  paper: '#EAF1FF',
  /** Texto secundário e metadados. Neutro derivado (contraste ≥ 4,5 sobre ink). */
  slate: '#7C869C',
  /** Único acento da interface. Ciano do briefing. */
  signal: '#00D9FF',
} as const;

/** Cores de luz, só para a cena 3D. */
export const light = {
  /** Fitas RGB e luz do gabinete. */
  electric: '#007BFF',
  /** Cor da sombra (luz hemisférica de baixo): nunca preta. */
  violet: '#7257FF',
  /** Brilho do monitor. */
  cyan: '#00D9FF',
} as const;

/** Opacidades de `paper` usadas para hierarquia (em vez de novas cores). */
export const emphasis = {
  line: 0.12,
  muted: 0.56,
  strong: 1,
} as const;

/** Escala de tipo com razão 1,2 a partir de 14px (estudo/regras/tipografia.md). */
export const typeScale = {
  base: 14,
  ratio: 1.2,
  /** Rótulos em caixa alta, mono, tracking +0,08em. Fora da escala de propósito. */
  label: 12,
} as const;

export function typeStep(step: number): number {
  return Math.round(typeScale.base * typeScale.ratio ** step * 100) / 100;
}

/**
 * Movimento: um easing só (expo-out). Duas durações por contexto:
 * `ui` para menus e hover (um SO precisa responder rápido) e `scene`
 * para entradas e transições de câmera (cinema).
 */
export const motion = {
  ease: [0.16, 1, 0.3, 1] as const,
  easeCss: 'cubic-bezier(0.16, 1, 0.3, 1)',
  duration: {
    ui: 0.18,
    panel: 0.32,
    scene: 1.0,
  },
  stagger: 0.07,
} as const;

/** Camadas (z-index) do shell. Janelas usam a faixa `window` + ordem de foco. */
export const layer = {
  desktop: 0,
  window: 100,
  taskbar: 1000,
  overlay: 2000,
  notification: 3000,
  system: 4000,
} as const;

/** Resolução lógica do OS dentro do monitor 3D (16:10). */
export const monitorViewport = { width: 1280, height: 800 } as const;

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) throw new Error(`Cor inválida: ${hex}`);
  const r = channelToLinear(parseInt(value.slice(0, 2), 16));
  const g = channelToLinear(parseInt(value.slice(2, 4), 16));
  const b = channelToLinear(parseInt(value.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG entre duas cores hex. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
