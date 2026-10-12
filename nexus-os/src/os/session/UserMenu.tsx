'use client';

import { Kbd } from '@/components/ui/kbd';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { initials } from './profiles';
import { useSessionStore } from './store';

const KIND_LABELS = {
  local: 'Perfil local · salvo neste navegador',
  guest: 'Convidado · nada é salvo',
  cloud: 'Conta na nuvem',
} as const;

const item = 'flex w-full items-center justify-between gap-6 px-4 py-2 text-left text-sm text-paper/70 hover:text-paper';

/** Menu do usuário na barra de tarefas: quem está logado, bloquear e sair. */
export function UserMenu({ triggerClassName }: { triggerClassName: string }) {
  const profile = useSessionStore((state) => state.profile);
  const lock = useSessionStore((state) => state.lock);
  const signOut = useSessionStore((state) => state.signOut);
  if (!profile) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" data-testid="user-menu-button" aria-label={`Usuário: ${profile.name}`} className={triggerClassName}>
          <span className="type-label flex size-6 items-center justify-center bg-paper text-[10px] text-ink">
            {initials(profile.name)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-64 p-0">
        <div data-testid="user-menu" className="flex flex-col">
          <div className="border-b border-line px-4 py-3">
            <p className="text-base text-paper">{profile.name}</p>
            <p className="type-label mt-1 text-slate">{KIND_LABELS[profile.kind]}</p>
          </div>
          <div className="py-1">
            <PopoverClose asChild>
              <button type="button" data-testid="lock-button" onClick={lock} className={item}>
                Bloquear <Kbd>Alt L</Kbd>
              </button>
            </PopoverClose>
            <PopoverClose asChild>
              <button type="button" data-testid="sign-out-button" onClick={() => void signOut()} className={item}>
                Sair {profile.kind === 'guest' ? '(apaga tudo)' : null}
              </button>
            </PopoverClose>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
