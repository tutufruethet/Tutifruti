/**
 * Escopo de teclado: o OS escuta teclas no próprio root (não na `window`), e o
 * quarto 3D ignora teclas que nascem dentro do OS ou em campos de texto.
 * Assim, digitar "f" num campo do OS nunca move a câmera.
 */
export const OS_ROOT_ATTRIBUTE = 'data-os-root';
export const OS_ROOT_SELECTOR = `[${OS_ROOT_ATTRIBUTE}]`;

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'color', 'file', 'image']);

function asElement(target: EventTarget | null): Element | null {
  return typeof Element !== 'undefined' && target instanceof Element ? target : null;
}

export function isWithinOs(target: EventTarget | null): boolean {
  return asElement(target)?.closest(OS_ROOT_SELECTOR) != null;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  const element = asElement(target);
  if (!element) return false;
  if (element.closest('[contenteditable=""], [contenteditable="true"]')) return true;
  const tag = element.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !NON_TEXT_INPUTS.has((element as HTMLInputElement).type);
  return false;
}

type RoomKeyEvent = Pick<KeyboardEvent, 'target' | 'defaultPrevented' | 'ctrlKey' | 'metaKey' | 'altKey'>;

/** O quarto 3D só trata teclas sem modificador, fora do OS e fora de campos de texto. */
export function shouldRoomHandleKey(event: RoomKeyEvent): boolean {
  if (event.defaultPrevented) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return !isWithinOs(event.target) && !isEditableTarget(event.target);
}
