'use client';

import { useEffect, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_';

/** Letras aleatórias que se resolvem na palavra, da esquerda para a direita (Active Theory). */
export function ScrambleText({
  text,
  durationMs = 700,
  disabled = false,
  className,
}: {
  text: string;
  durationMs?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [frame, setFrame] = useState<string | null>(null);

  useEffect(() => {
    if (disabled) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const resolved = Math.floor(progress * text.length);
      const next = text
        .split('')
        .map((char, index) =>
          index < resolved || char === ' ' ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        )
        .join('');
      setFrame(progress >= 1 ? null : next);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, durationMs, disabled]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{frame ?? text}</span>
    </span>
  );
}
