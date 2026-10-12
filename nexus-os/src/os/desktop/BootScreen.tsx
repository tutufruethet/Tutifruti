'use client';

import { useEffect, useState } from 'react';
import { layer } from '@/design/tokens';
import { cn } from '@/lib/cn';
import { useSessionStore } from '@/os/session/store';
import { ScrambleText } from './ScrambleText';

const HOLD_MS = 350;

/**
 * Tela de boot: contador 0→100 com as etapas reais do boot; quando termina,
 * sobe como uma cortina (estudo: detalhes-de-acabamento).
 */
export function BootScreen({ reducedMotion }: { reducedMotion: boolean }) {
  const phase = useSessionStore((state) => state.phase);
  const progress = useSessionStore((state) => state.progress);
  const log = useSessionStore((state) => state.log);
  const dismissBoot = useSessionStore((state) => state.dismissBoot);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (reducedMotion) {
      dismissBoot();
      return;
    }
    const timer = window.setTimeout(() => setLeaving(true), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion, dismissBoot]);

  return (
    <div
      data-testid="boot-screen"
      aria-busy={phase !== 'ready'}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && leaving) dismissBoot();
      }}
      className={cn(
        'absolute inset-0 flex flex-col justify-between bg-ink px-[clamp(1rem,3cqw,2.5rem)] py-[clamp(1rem,2.4cqw,2rem)]',
        'transition-transform duration-(--duration-scene) ease-expo',
        leaving && '-translate-y-full',
      )}
      style={{ zIndex: layer.system }}
    >
      <p className="type-label flex justify-between text-slate">
        <span>(00) — NEXUS OS</span>
        <span>Boot</span>
      </p>

      <h2 className="type-display">
        <ScrambleText text="NEXUS" disabled={reducedMotion} />
      </h2>

      <div className="grid items-end gap-6 @3xl:grid-cols-12">
        <ol aria-live="polite" className="type-label flex flex-col gap-1.5 text-slate @3xl:col-span-8">
          {log.map((line) => (
            <li key={line} className="text-paper/70">
              <span className="text-signal">✓</span> {line}
            </li>
          ))}
          {phase !== 'ready' ? <li>…</li> : null}
        </ol>
        <p
          data-testid="boot-progress"
          className="text-right text-[clamp(3rem,10cqw,8rem)] font-medium leading-none tracking-[-0.04em] tabular-nums @3xl:col-span-4"
        >
          {String(progress).padStart(3, '0')}
        </p>
      </div>
    </div>
  );
}
