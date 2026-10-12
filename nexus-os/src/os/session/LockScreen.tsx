'use client';

import { Button } from '@/components/ui/button';
import { layer } from '@/design/tokens';
import { initials } from './profiles';
import { useSessionStore } from './store';
import { useClockText } from './useClock';

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Tela de bloqueio: esconde o que está aberto sem fechar nada. Perfis locais
 * não têm senha, então desbloquear é um clique (honesto: é uma cortina, não um cofre).
 */
export function LockScreen() {
  const profile = useSessionStore((state) => state.profile);
  const unlock = useSessionStore((state) => state.unlock);
  const signOut = useSessionStore((state) => state.signOut);
  const time = useClockText(timeFormat);
  const date = useClockText(dateFormat);

  return (
    <div
      data-testid="lock-screen"
      className="absolute inset-0 flex flex-col justify-between bg-ink px-[clamp(1rem,3cqw,2.5rem)] py-[clamp(1rem,2.4cqw,2rem)]"
      style={{ zIndex: layer.system }}
    >
      <p className="type-label flex flex-wrap justify-between gap-x-4 gap-y-1 text-slate">
        <span>(—) — Bloqueado</span>
        <span className="first-letter:uppercase">{date}</span>
      </p>
      <p className="type-display tabular-nums" suppressHydrationWarning>
        {time || '—'}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <span className="type-label flex size-9 items-center justify-center bg-paper text-ink">
          {initials(profile?.name ?? '?')}
        </span>
        <span className="text-base">{profile?.name}</span>
        <Button data-testid="unlock" variant="primary" size="md" autoFocus onClick={unlock}>
          Desbloquear
        </Button>
        <Button variant="ghost" size="md" onClick={() => void signOut()}>
          Trocar de perfil
        </Button>
      </div>
    </div>
  );
}
