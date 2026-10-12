import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOsShortcuts } from '@/os/keyboard/use-os-shortcuts';
import { useOs } from './os-context';
import { OsRoot } from './OsRoot';
import { FLUID_VIEWPORT, MONITOR_VIEWPORT, htmlDistanceFactor } from './viewport';

function ShortcutProbe({ onHit }: { onHit: () => void }) {
  const { root } = useOs();
  useOsShortcuts(root, { 'mod+k': onHit, j: onHit });
  return <input aria-label="campo" />;
}

describe('OsRoot', () => {
  it('no modo fixo usa a resolução lógica do monitor', () => {
    const { container } = render(
      <OsRoot viewport={MONITOR_VIEWPORT}>
        <p>conteúdo</p>
      </OsRoot>,
    );
    const root = container.querySelector<HTMLElement>('[data-os-root]');
    expect(root?.dataset.osViewport).toBe('fixed');
    expect(root?.style.width).toBe('1280px');
    expect(root?.style.height).toBe('800px');
  });

  it('monta menus dentro da camada de portal do OS', async () => {
    const user = userEvent.setup();
    render(
      <OsRoot viewport={FLUID_VIEWPORT}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Abrir</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </OsRoot>,
    );
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    const menu = await screen.findByRole('menu');
    expect(menu.closest('[data-os-portal]')).not.toBeNull();
    expect(menu.closest('[data-os-root]')).not.toBeNull();
  });

  it('monta diálogos dentro da camada de portal do OS', async () => {
    const user = userEvent.setup();
    render(
      <OsRoot viewport={FLUID_VIEWPORT}>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Diálogo</Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Título</DialogTitle>
          </DialogContent>
        </Dialog>
      </OsRoot>,
    );
    await user.click(screen.getByRole('button', { name: 'Diálogo' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.closest('[data-os-portal]')).not.toBeNull();
    expect(dialog.className).toContain('absolute');
  });

  it('atalhos só disparam com o foco dentro do OS', () => {
    const onHit = vi.fn();
    render(
      <>
        <OsRoot viewport={FLUID_VIEWPORT}>
          <ShortcutProbe onHit={onHit} />
        </OsRoot>
        <button type="button">fora</button>
      </>,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'fora' }), { key: 'k', ctrlKey: true });
    expect(onHit).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'campo' }), { key: 'k', ctrlKey: true });
    expect(onHit).toHaveBeenCalledTimes(1);
  });

  it('atalhos sem modificador não disparam em campos de texto', () => {
    const onHit = vi.fn();
    render(
      <OsRoot viewport={FLUID_VIEWPORT}>
        <ShortcutProbe onHit={onHit} />
      </OsRoot>,
    );
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'campo' }), { key: 'j' });
    expect(onHit).not.toHaveBeenCalled();
  });
});

describe('htmlDistanceFactor', () => {
  it('converte a largura do DOM na largura da tela 3D', () => {
    // 1280px precisam virar 0,96 m: cada px vale distanceFactor/400 m.
    const factor = htmlDistanceFactor(0.96, 1280);
    expect(factor).toBeCloseTo(0.3, 6);
    expect((1280 * factor) / 400).toBeCloseTo(0.96, 6);
  });

  it('recusa larguras inválidas', () => {
    expect(() => htmlDistanceFactor(0, 1280)).toThrow();
  });
});
