/**
 * Escala entre px da tela e px do OS. No monitor 3D o DOM do OS é escalado
 * (e projetado) pelo Drei; arrastar uma janela 100 px na tela move menos (ou
 * mais) no espaço do OS. Com a câmera de frente (ADR-010), a escala é uniforme.
 */
export function osScale(root: HTMLElement | null): { x: number; y: number } {
  if (!root) return { x: 1, y: 1 };
  const rect = root.getBoundingClientRect();
  const x = root.offsetWidth > 0 ? rect.width / root.offsetWidth : 1;
  const y = root.offsetHeight > 0 ? rect.height / root.offsetHeight : 1;
  return { x: x || 1, y: y || 1 };
}

/**
 * Arrasto com captura de ponteiro, entregando o deslocamento já em px do OS.
 * Retorna sem efeito para botões que não sejam o principal.
 */
export function startPointerDrag(
  event: { clientX: number; clientY: number; pointerId: number; button: number; currentTarget: EventTarget },
  root: HTMLElement | null,
  onMove: (dx: number, dy: number) => void,
  onEnd?: () => void,
): void {
  if (event.button !== 0) return;
  const target = event.currentTarget as HTMLElement;
  const scale = osScale(root);
  const startX = event.clientX;
  const startY = event.clientY;

  const move = (moveEvent: PointerEvent) => {
    onMove((moveEvent.clientX - startX) / scale.x, (moveEvent.clientY - startY) / scale.y);
  };
  const end = () => {
    target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerup', end);
    target.removeEventListener('pointercancel', end);
    onEnd?.();
  };

  try {
    target.setPointerCapture(event.pointerId);
  } catch {
    // jsdom e alguns navegadores antigos não suportam captura.
  }
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', end);
  target.addEventListener('pointercancel', end);
}
