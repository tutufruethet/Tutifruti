/**
 * Atalhos de teclado do OS. `mod` aceita Ctrl ou ⌘ (Cmd), então o mesmo atalho
 * funciona em Windows, Linux e macOS sem detectar plataforma.
 */
export interface Shortcut {
  readonly key: string;
  readonly mod: boolean;
  readonly shift: boolean;
  readonly alt: boolean;
}

type KeyEventLike = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'> &
  Partial<Pick<KeyboardEvent, 'code'>>;

const KEY_ALIASES: Readonly<Record<string, string>> = {
  esc: 'escape',
  space: ' ',
  plus: '+',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
};

const MOD_NAMES = new Set(['mod', 'ctrl', 'control', 'meta', 'cmd']);
const ALT_NAMES = new Set(['alt', 'option']);

export function parseShortcut(combo: string): Shortcut {
  const parts = combo
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  let key = '';
  let mod = false;
  let shift = false;
  let alt = false;

  for (const part of parts) {
    if (MOD_NAMES.has(part)) mod = true;
    else if (part === 'shift') shift = true;
    else if (ALT_NAMES.has(part)) alt = true;
    else if (key) throw new Error(`Atalho com mais de uma tecla: "${combo}"`);
    else key = KEY_ALIASES[part] ?? part;
  }

  if (!key) throw new Error(`Atalho sem tecla: "${combo}"`);
  return { key, mod, shift, alt };
}

/**
 * Código físico da tecla. No macOS, Option+letra produz outro caractere
 * (Option+W vira "∑"), então atalhos com Alt também conferem `event.code`.
 */
function codeFor(key: string): string | null {
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  return null;
}

export function matchesShortcut(event: KeyEventLike, shortcut: Shortcut): boolean {
  const keyMatches = event.key.toLowerCase() === shortcut.key || (event.code != null && event.code === codeFor(shortcut.key));
  return (
    keyMatches &&
    (event.ctrlKey || event.metaKey) === shortcut.mod &&
    event.shiftKey === shortcut.shift &&
    event.altKey === shortcut.alt
  );
}

export function hasModifier(shortcut: Shortcut): boolean {
  return shortcut.mod || shortcut.alt;
}

const KEY_LABELS: Readonly<Record<string, string>> = {
  escape: 'Esc',
  ' ': 'Espaço',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  enter: 'Enter',
};

/** Rótulos para exibir num `<Kbd>`: "mod+k" → ["Ctrl/⌘", "K"]. */
export function shortcutLabels(combo: string): string[] {
  const shortcut = parseShortcut(combo);
  const labels: string[] = [];
  if (shortcut.mod) labels.push('Ctrl/⌘');
  if (shortcut.alt) labels.push('Alt');
  if (shortcut.shift) labels.push('Shift');
  labels.push(KEY_LABELS[shortcut.key] ?? shortcut.key.toUpperCase());
  return labels;
}
