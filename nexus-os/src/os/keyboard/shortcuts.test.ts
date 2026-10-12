import { describe, expect, it } from 'vitest';
import { isEditableTarget, isWithinOs, shouldRoomHandleKey } from './scope';
import { matchesShortcut, parseShortcut, shortcutLabels } from './shortcuts';

function keyEvent(key: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {}) {
  return { key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mods };
}

describe('parseShortcut', () => {
  it('lê modificadores e tecla', () => {
    expect(parseShortcut('mod+k')).toEqual({ key: 'k', mod: true, shift: false, alt: false });
    expect(parseShortcut('Shift + Alt + N')).toEqual({ key: 'n', mod: false, shift: true, alt: true });
    expect(parseShortcut('esc')).toEqual({ key: 'escape', mod: false, shift: false, alt: false });
  });

  it('recusa atalho sem tecla ou com duas teclas', () => {
    expect(() => parseShortcut('mod+shift')).toThrow();
    expect(() => parseShortcut('a+b')).toThrow();
  });
});

describe('matchesShortcut', () => {
  const modK = parseShortcut('mod+k');

  it('aceita Ctrl ou ⌘ como mod', () => {
    expect(matchesShortcut(keyEvent('k', { ctrlKey: true }), modK)).toBe(true);
    expect(matchesShortcut(keyEvent('K', { metaKey: true }), modK)).toBe(true);
  });

  it('com Alt no macOS, reconhece pela tecla física', () => {
    const altW = parseShortcut('alt+w');
    expect(matchesShortcut({ ...keyEvent('∑', { altKey: true }), code: 'KeyW' }, altW)).toBe(true);
    expect(matchesShortcut({ ...keyEvent('∑', { altKey: true }), code: 'KeyQ' }, altW)).toBe(false);
  });

  it('exige os modificadores exatos', () => {
    expect(matchesShortcut(keyEvent('k'), modK)).toBe(false);
    expect(matchesShortcut(keyEvent('k', { ctrlKey: true, shiftKey: true }), modK)).toBe(false);
  });
});

describe('shortcutLabels', () => {
  it('formata para exibição', () => {
    expect(shortcutLabels('mod+k')).toEqual(['Ctrl/⌘', 'K']);
    expect(shortcutLabels('esc')).toEqual(['Esc']);
  });
});

describe('escopo de teclado', () => {
  function setup() {
    document.body.innerHTML = `
      <div data-os-root><input id="os-input" /><button id="os-button"></button></div>
      <input id="page-input" />
      <input id="page-check" type="checkbox" />
      <div id="page-div"></div>
      <div contenteditable="true"><span id="editable-child"></span></div>`;
    return (id: string) => document.getElementById(id);
  }

  it('reconhece alvos dentro do OS', () => {
    const byId = setup();
    expect(isWithinOs(byId('os-input'))).toBe(true);
    expect(isWithinOs(byId('page-div'))).toBe(false);
    expect(isWithinOs(null)).toBe(false);
  });

  it('reconhece campos editáveis', () => {
    const byId = setup();
    expect(isEditableTarget(byId('page-input'))).toBe(true);
    expect(isEditableTarget(byId('page-check'))).toBe(false);
    expect(isEditableTarget(byId('editable-child'))).toBe(true);
    expect(isEditableTarget(byId('page-div'))).toBe(false);
  });

  it('o quarto ignora teclas do OS, de campos e com modificador', () => {
    const byId = setup();
    const base = { defaultPrevented: false, ctrlKey: false, metaKey: false, altKey: false };
    expect(shouldRoomHandleKey({ ...base, target: byId('page-div') })).toBe(true);
    expect(shouldRoomHandleKey({ ...base, target: byId('os-button') })).toBe(false);
    expect(shouldRoomHandleKey({ ...base, target: byId('page-input') })).toBe(false);
    expect(shouldRoomHandleKey({ ...base, target: byId('page-div'), ctrlKey: true })).toBe(false);
    expect(shouldRoomHandleKey({ ...base, target: byId('page-div'), defaultPrevented: true })).toBe(false);
  });
});
