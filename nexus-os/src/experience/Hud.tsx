'use client';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { QUALITY_LEVELS } from '@/engine/quality';
import { useRoomStore } from '@/engine/room-store';
import { cn } from '@/lib/cn';
import { useSettingsStore } from '@/settings/store';
import type { GraphicsQualitySetting } from '@/settings/schema';
import type { ClientCapabilities } from './capabilities';
import { type ExperienceMode, useModeStore } from './mode';

const QUALITY_LABELS: Record<GraphicsQualitySetting, string> = {
  auto: 'Auto',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  ultra: 'Ultra',
};

const QUALITY_OPTIONS: readonly GraphicsQualitySetting[] = ['auto', ...QUALITY_LEVELS];

/**
 * Camada da página (fora do OS): os dois caminhos (quarto 3D / desktop 2D),
 * qualidade gráfica e a saída óbvia do monitor.
 */
export function Hud({ mode, capabilities }: { mode: ExperienceMode; capabilities: ClientCapabilities }) {
  const choose = useModeStore((state) => state.choose);
  const quality = useSettingsStore((state) => state.settings.graphicsQuality);
  const updateSettings = useSettingsStore((state) => state.update);
  const phase = useRoomStore((state) => state.phase);
  const focused = useRoomStore((state) => state.focused);
  const requestFocus = useRoomStore((state) => state.requestFocus);
  const releaseFocus = useRoomStore((state) => state.releaseFocus);
  const in3d = mode === '3d';

  function enterMonitor() {
    // Em tela estreita, 1280px de OS dentro do monitor ficariam ilegíveis: vai para o desktop 2D.
    if (capabilities.narrow) choose('2d');
    else requestFocus();
  }

  return (
    <>
      <header
        className={cn(
          'pointer-events-none z-[100] flex items-start justify-between gap-4 px-[clamp(1rem,3vw,2.5rem)] py-4',
          in3d ? 'absolute inset-x-0 top-0' : 'relative border-b border-line',
        )}
      >
        <div className="type-label pointer-events-auto flex items-center gap-3 text-paper">
          <span>Nexus</span>
          <span className="hidden text-slate sm:inline">{in3d ? '(01) — Quarto' : '(02) — Desktop'}</span>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <nav aria-label="Modo de experiência" className="flex border border-line">
            <ModeButton active={in3d} disabled={!capabilities.webgl2} onClick={() => choose('3d')}>
              Quarto 3D
            </ModeButton>
            <ModeButton active={!in3d} onClick={() => choose('2d')}>
              Desktop 2D
            </ModeButton>
          </nav>
          {in3d ? (
            <label className="type-label hidden h-8 items-center gap-2 border border-line px-2 text-slate sm:flex">
              <span>Qualidade</span>
              <select
                data-testid="quality-select"
                aria-label="Qualidade gráfica"
                value={quality}
                onChange={(event) =>
                  updateSettings({ graphicsQuality: event.target.value as GraphicsQualitySetting })
                }
                className="bg-ink text-paper outline-none"
              >
                {QUALITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {QUALITY_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </header>

      {in3d ? (
        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-[100] flex items-end justify-between gap-4 px-[clamp(1rem,3vw,2.5rem)] py-4">
          <p
            data-testid="placeholder-notice"
            className={cn('type-label min-w-0 text-slate', focused && 'invisible')}
          >
            Geometria provisória<span className="hidden sm:inline"> · os modelos GLB entram na Fase 4</span>
          </p>
          <div className="pointer-events-auto flex shrink-0 items-center gap-4">
            {focused ? null : (
              <span className="type-label hidden items-center gap-2 text-slate [@media(hover:hover)_and_(min-width:64rem)]:flex">
                Arraste para orbitar · <Kbd>F</Kbd> foca · <Kbd>Esc</Kbd> sai
              </span>
            )}
            {focused ? (
              <Button data-testid="leave-monitor" size="sm" onClick={releaseFocus}>
                Sair do monitor
              </Button>
            ) : (
              <Button data-testid="enter-monitor" variant="primary" size="sm" onClick={enterMonitor}>
                Usar o computador <span aria-hidden>↗</span>
              </Button>
            )}
          </div>
        </footer>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {phase === 'focused' ? 'Monitor em foco' : ''}
      </span>
    </>
  );
}

function ModeButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={disabled ? 'WebGL2 indisponível neste navegador' : undefined}
      onClick={onClick}
      className={cn(
        'type-label h-8 px-3 transition-colors duration-(--duration-ui) ease-expo',
        active ? 'bg-paper text-ink' : 'text-paper/60 hover:text-paper',
        'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      {children}
    </button>
  );
}
