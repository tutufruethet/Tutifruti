'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { shortcutLabels } from '@/os/keyboard/shortcuts';
import { useOsShortcuts } from '@/os/keyboard/use-os-shortcuts';
import { Clock } from './Clock';
import { useOs } from './os-context';
import { useProbeStore } from './probe-store';

const PROBE_SHORTCUT = 'mod+k';
const MENU_ITEMS = ['Alfa', 'Beta', 'Gama'] as const;

/**
 * Superfície de teste da Fase 1 (não é o desktop). Cada linha prova uma regra
 * do shell, igual no monitor 3D e em tela cheia. O desktop real chega na Fase 2.
 */
export function ShellProbe() {
  const { root, viewport } = useOs();
  const text = useProbeStore((s) => s.text);
  const setText = useProbeStore((s) => s.setText);
  const lastMenuItem = useProbeStore((s) => s.lastMenuItem);
  const chooseMenuItem = useProbeStore((s) => s.chooseMenuItem);
  const shortcutCount = useProbeStore((s) => s.shortcutCount);
  const registerShortcut = useProbeStore((s) => s.registerShortcut);
  const log = useProbeStore((s) => s.log);
  const events = useProbeStore((s) => s.events);

  useOsShortcuts(root, { [PROBE_SHORTCUT]: () => registerShortcut('Ctrl/⌘ K') });

  return (
    <div className="flex h-full flex-col overflow-y-auto px-[clamp(1rem,3cqw,2.5rem)] py-[clamp(1rem,2.4cqw,2rem)]">
      <header className="type-label grid grid-cols-2 gap-4 text-slate @3xl:grid-cols-12">
        <span className="@3xl:col-span-4">(00) — NEXUS OS</span>
        <span className="hidden @3xl:col-span-5 @3xl:block">Fase 1 · superfície de teste do shell</span>
        <span className="text-right @3xl:col-span-3">
          {viewport.mode === 'fixed' ? `Monitor ${viewport.width}×${viewport.height}` : 'Tela cheia'} ·{' '}
          <Clock className="text-paper" />
        </span>
      </header>

      <div className="mt-[clamp(1.5rem,5cqw,4rem)] grid gap-4 @3xl:grid-cols-12">
        <h1 className="type-display @3xl:col-span-8">
          Nexus<span className="text-signal">.</span>
        </h1>
        <p className="max-w-[34ch] self-end text-base text-paper/60 @3xl:col-span-4">
          Cada linha abaixo prova uma regra do shell. O desktop de verdade entra na Fase 2.
        </p>
      </div>

      <ol className="mt-[clamp(1.5rem,4cqw,3rem)] border-t border-line">
        <ProbeRow index="01" title="Teclado" detail="O foco fica no OS. As teclas do quarto não disparam aqui.">
          <div className="flex w-full items-end gap-4">
            <Input
              data-testid="probe-input"
              aria-label="Campo de teste"
              placeholder="Digite algo"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <output data-testid="probe-echo" className="type-label w-24 shrink-0 truncate pb-2 text-right text-slate">
              {text || '—'}
            </output>
          </div>
        </ProbeRow>

        <ProbeRow index="02" title="Menu" detail="Abre na camada do OS, não no body da página.">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="probe-menu-trigger" size="sm">
                Abrir menu <span aria-hidden>↓</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent data-testid="probe-menu">
              <DropdownMenuLabel>Itens de teste</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {MENU_ITEMS.map((item) => (
                <DropdownMenuItem key={item} onSelect={() => chooseMenuItem(item)}>
                  {item}
                  {lastMenuItem === item ? <span className="text-signal">●</span> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span data-testid="probe-menu-value" className="type-label text-slate">
            {lastMenuItem ?? 'nenhum'}
          </span>
        </ProbeRow>

        <ProbeRow index="03" title="Diálogo" detail="Cobre só a área do OS.">
          <Dialog onOpenChange={(open) => log(open ? 'diálogo aberto' : 'diálogo fechado')}>
            <DialogTrigger asChild>
              <Button data-testid="probe-dialog-trigger" size="sm">
                Abrir diálogo
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="probe-dialog">
              <DialogTitle>Diálogo de teste</DialogTitle>
              <DialogDescription>
                Este diálogo cobre só o OS. Feche com Esc ou com o botão abaixo.
              </DialogDescription>
              <div className="mt-6 flex justify-end">
                <DialogClose asChild>
                  <Button variant="primary" size="sm">
                    Fechar
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </ProbeRow>

        <ProbeRow index="04" title="Atalho" detail="Só vale com o foco dentro do OS.">
          <span className="flex items-center gap-1">
            {shortcutLabels(PROBE_SHORTCUT).map((label) => (
              <Kbd key={label}>{label}</Kbd>
            ))}
          </span>
          <span className="type-label text-slate">
            Recebidos <span data-testid="probe-shortcut-count" className="text-paper">{shortcutCount}</span>
          </span>
        </ProbeRow>

        <ProbeRow index="05" title="Dica" detail="O tooltip também fica preso ao OS.">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button data-testid="probe-tooltip-trigger" variant="ghost" size="sm">
                Passe o mouse ↗
              </Button>
            </TooltipTrigger>
            <TooltipContent data-testid="probe-tooltip">Dica dentro do OS</TooltipContent>
          </Tooltip>
        </ProbeRow>
      </ol>

      <footer className="type-label mt-auto grid gap-2 pt-6 text-slate @3xl:grid-cols-12">
        <ol data-testid="probe-log" aria-label="Últimos eventos" className="flex flex-wrap gap-x-4 @3xl:col-span-8">
          {events.length === 0 ? <li>Sem eventos</li> : null}
          {events.map((event, i) => (
            <li key={event.id} className={i === 0 ? 'text-paper' : undefined}>
              {event.label}
            </li>
          ))}
        </ol>
        <span className="@3xl:col-span-4 @3xl:text-right">Estado sobrevive à troca 3D ↔ 2D</span>
      </footer>
    </div>
  );
}

function ProbeRow({
  index,
  title,
  detail,
  children,
}: {
  index: string;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] items-center gap-x-4 gap-y-3 border-b border-line py-3 @3xl:grid-cols-12">
      <span className="type-label text-slate @3xl:col-span-1">({index})</span>
      <span className="text-lg font-medium tracking-[-0.02em] @3xl:col-span-2">{title}</span>
      <span className="col-span-2 text-sm text-paper/56 @3xl:col-span-4">{detail}</span>
      <div className="col-span-2 flex min-h-9 items-center justify-between gap-4 @3xl:col-span-5">{children}</div>
    </li>
  );
}
