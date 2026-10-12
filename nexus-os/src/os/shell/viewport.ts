import { monitorViewport } from '@/design/tokens';

/**
 * Como o OS ocupa o espaço:
 * - `fixed`: resolução lógica fixa (dentro do monitor 3D). O Drei escala o DOM.
 * - `fluid`: ocupa o container (tela cheia, tablet, celular).
 * Componentes do OS leem o tamanho do container (unidades `cqw`, container
 * queries), nunca da `window`, para funcionar igual nos dois modos.
 */
export type OsViewport =
  | { readonly mode: 'fixed'; readonly width: number; readonly height: number }
  | { readonly mode: 'fluid' };

export const MONITOR_VIEWPORT: OsViewport = { mode: 'fixed', ...monitorViewport };
export const FLUID_VIEWPORT: OsViewport = { mode: 'fluid' };

/**
 * `distanceFactor` do `<Html transform>` do Drei para que `cssWidth` px do DOM
 * ocupem exatamente `worldWidth` unidades da cena. No Drei, 1px do DOM vale
 * `distanceFactor / 400` unidades.
 */
export function htmlDistanceFactor(worldWidth: number, cssWidth: number): number {
  if (worldWidth <= 0 || cssWidth <= 0) throw new Error('Larguras precisam ser positivas');
  return (400 * worldWidth) / cssWidth;
}
