'use client';

import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { useEffect, useEffectEvent, useRef } from 'react';
import { color } from '@/design/tokens';
import type { AppProps } from '@/os/apps/types';
import { HOME } from '@/os/vfs/seed';
import { useReducedMotion } from '@/settings/motion';
import { TerminalSession } from './session';

/** Terminal com xterm.js sobre o interpretador virtual (nada roda no computador real). */
export default function TerminalApp({ bridge }: AppProps) {
  const container = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const readMotion = useEffectEvent(() => reducedMotion);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const fontFamily = getComputedStyle(element).getPropertyValue('--font-jetbrains-mono').trim() || 'monospace';
    const term = new Terminal({
      fontFamily,
      fontSize: 13,
      lineHeight: 1.25,
      cursorStyle: 'bar',
      cursorBlink: !readMotion(),
      scrollback: 2000,
      theme: {
        background: color.ink,
        foreground: color.paper,
        cursor: color.signal,
        cursorAccent: color.ink,
        selectionBackground: 'rgba(0, 217, 255, 0.28)',
        black: color.ink,
        brightBlack: color.slate,
        cyan: color.signal,
        brightCyan: color.signal,
        white: color.paper,
        brightWhite: color.paper,
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(element);

    const safeFit = () => {
      try {
        fit.fit();
      } catch {
        // Janela minimizada (sem tamanho): o ResizeObserver ajusta quando voltar.
      }
    };
    safeFit();

    // A medida das células depende da fonte; refaz quando a mono termina de carregar.
    void document.fonts?.ready.then(() => {
      term.options.fontFamily = fontFamily;
      safeFit();
    });

    const session = new TerminalSession(bridge.fs, HOME, {
      write: (data) => term.write(data),
      clear: () => term.clear(),
    });
    session.start();
    const input = term.onData((data) => {
      void session.input(data);
    });

    const observer = new ResizeObserver(() => safeFit());
    observer.observe(element);
    term.focus();

    return () => {
      observer.disconnect();
      input.dispose();
      term.dispose();
    };
  }, [bridge.fs]);

  return (
    <div data-testid="terminal-app" className="h-full bg-ink px-2 pb-1 pt-2">
      <div ref={container} className="h-full" />
    </div>
  );
}
