'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { layer } from '@/design/tokens';
import { cn } from '@/lib/cn';
import { initials, type Profile } from './profiles';
import { useSessionStore } from './store';
import { useClockText } from './useClock';

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Tela de entrada: perfis locais (sem senha, dados neste navegador),
 * convidado (só memória) e, se configurada, conta na nuvem por link no e-mail.
 */
export function LoginScreen() {
  const phase = useSessionStore((state) => state.phase);
  const profiles = useSessionStore((state) => state.profiles);
  const storageAvailable = useSessionStore((state) => state.storageAvailable);
  const cloudConfigured = useSessionStore((state) => state.cloudConfigured);
  const magicLinkSentTo = useSessionStore((state) => state.magicLinkSentTo);
  const error = useSessionStore((state) => state.error);
  const { signIn, signInGuest, createProfile, requestMagicLink } = useSessionStore.getState();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const time = useClockText(timeFormat);
  const date = useClockText(dateFormat);
  const busy = phase === 'starting';
  const localProfiles = profiles.filter((profile) => profile.kind === 'local');

  function submitProfile(event: FormEvent) {
    event.preventDefault();
    if (name.trim()) void createProfile(name);
  }

  function submitEmail(event: FormEvent) {
    event.preventDefault();
    void requestMagicLink(email);
  }

  return (
    <div
      data-testid="login-screen"
      aria-busy={busy}
      className="absolute inset-0 overflow-y-auto bg-ink px-[clamp(1rem,3cqw,2.5rem)] py-[clamp(1rem,2.4cqw,2rem)]"
      style={{ zIndex: layer.system }}
    >
      <div className="flex min-h-full flex-col">
        <p className="type-label flex flex-wrap justify-between gap-x-4 gap-y-1 text-slate">
          <span>(01) — Entrar</span>
          <span className="first-letter:uppercase">{date}</span>
        </p>

        <div className="mt-[clamp(1.5rem,5cqw,4rem)] grid flex-1 gap-10 @3xl:grid-cols-12">
          <div className="@3xl:col-span-6">
            <p className="type-display tabular-nums" suppressHydrationWarning>
              {time || '—'}
            </p>
            <p className="mt-4 max-w-[32ch] text-base text-paper/56">
              Escolha quem está usando o NEXUS. Cada perfil tem seus próprios arquivos, notas e preferências.
            </p>
          </div>

          <div className="flex flex-col gap-8 @3xl:col-span-5 @3xl:col-start-8">
            <section aria-labelledby="login-profiles">
              <h2 id="login-profiles" className="type-label mb-2 text-slate">
                Perfis neste navegador
              </h2>
              <ul className="border-t border-line">
                {localProfiles.map((profile) => (
                  <li key={profile.id}>
                    <ProfileRow profile={profile} disabled={busy} onClick={() => void signIn(profile)} />
                  </li>
                ))}
                <li>
                  <form onSubmit={submitProfile} className="flex items-center gap-3 border-b border-line py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center border border-dashed border-line text-slate">
                      <Icon name="plus" />
                    </span>
                    <input
                      data-testid="login-new-profile"
                      aria-label="Nome do novo perfil"
                      placeholder={storageAvailable ? 'Novo perfil: seu nome' : 'Sem armazenamento neste navegador'}
                      disabled={!storageAvailable || busy}
                      maxLength={40}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-paper/40 disabled:opacity-40"
                    />
                    <Button type="submit" size="sm" variant="primary" disabled={!name.trim() || busy}>
                      Criar
                    </Button>
                  </form>
                </li>
                <li>
                  <button
                    type="button"
                    data-testid="login-guest"
                    disabled={busy}
                    onClick={() => void signInGuest()}
                    className="group flex w-full items-center gap-3 border-b border-line py-3 text-left disabled:opacity-40"
                  >
                    <span className="type-label flex size-9 shrink-0 items-center justify-center border border-line text-slate">
                      —
                    </span>
                    <span className="flex-1">
                      <span className="block text-base">Convidado</span>
                      <span className="block text-sm text-paper/56">Nada é salvo. Some quando você sair.</span>
                    </span>
                    <span aria-hidden className="text-slate transition-colors group-hover:text-paper">
                      ↗
                    </span>
                  </button>
                </li>
              </ul>
            </section>

            <section aria-labelledby="login-cloud">
              <h2 id="login-cloud" className="type-label mb-2 text-slate">
                Conta na nuvem
              </h2>
              {cloudConfigured ? (
                magicLinkSentTo ? (
                  <p data-testid="login-link-sent" className="text-sm text-paper/70">
                    Enviamos um link para <span className="text-paper">{magicLinkSentTo}</span>. Abra-o neste navegador
                    para entrar.
                  </p>
                ) : (
                  <form onSubmit={submitEmail} className="flex items-center gap-3 border-y border-line py-3">
                    <input
                      type="email"
                      aria-label="E-mail"
                      placeholder="seu@email.com"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-paper/40"
                    />
                    <Button type="submit" size="sm" disabled={!email.trim() || busy}>
                      Receber link
                    </Button>
                  </form>
                )
              ) : (
                <p className="text-sm text-paper/56">
                  Desativada nesta instalação. Para ligar, configure o Supabase (veja a documentação do projeto).
                </p>
              )}
            </section>

            {error ? (
              <p role="alert" className="text-sm">
                <span className="text-signal">Erro:</span> {error}
              </p>
            ) : null}
          </div>
        </div>

        <p className="type-label mt-8 text-slate">
          Perfis locais não têm senha: os dados ficam no IndexedDB deste navegador.
        </p>
      </div>
    </div>
  );
}

function ProfileRow({ profile, disabled, onClick }: { profile: Profile; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid={`login-profile-${profile.name}`}
      disabled={disabled}
      onClick={onClick}
      className={cn('group flex w-full items-center gap-3 border-b border-line py-3 text-left disabled:opacity-40')}
    >
      <span className="type-label flex size-9 shrink-0 items-center justify-center bg-paper text-ink">
        {initials(profile.name)}
      </span>
      <span className="flex-1">
        <span className="block text-base">{profile.name}</span>
        <span className="block text-sm text-paper/56">Perfil local</span>
      </span>
      <span aria-hidden className="text-slate transition-colors group-hover:text-paper">
        ↗
      </span>
    </button>
  );
}
