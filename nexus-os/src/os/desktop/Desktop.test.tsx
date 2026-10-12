import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { OsRoot } from '@/os/shell/OsRoot';
import { MONITOR_VIEWPORT } from '@/os/shell/viewport';
import { useWindowStore } from '@/os/window-manager/store';
import { useSettingsStore } from '@/settings/store';
import { Desktop } from './Desktop';

function renderDesktop() {
  return render(
    <OsRoot viewport={MONITOR_VIEWPORT} reducedMotion>
      <Desktop />
    </OsRoot>,
  );
}

async function waitForDesktop(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector('[data-desktop-ready]')).not.toBeNull(), { timeout: 4000 });
}

describe('Desktop', () => {
  beforeAll(() => {
    // Sem cortina nem esperas artificiais no teste.
    useSettingsStore.getState().update({ motion: 'reduced' });
  });

  it('dá boot, monta o sistema de arquivos e abre o Files pelo ícone', async () => {
    const user = userEvent.setup();
    const { container } = renderDesktop();
    await waitForDesktop(container);

    await user.click(screen.getByTestId('desktop-icon-files'));
    const files = await screen.findByTestId('files-app', undefined, { timeout: 4000 });
    expect(await within(files).findByText('LEIA-ME.md')).toBeInTheDocument();
    expect(within(files).getAllByText('Documentos').length).toBeGreaterThan(0);
  });

  it('a barra de tarefas lista a janela e Alt+W fecha a janela em foco', async () => {
    const { container } = renderDesktop();
    await waitForDesktop(container);
    useWindowStore.getState().reset();

    fireEvent.click(screen.getByTestId('desktop-icon-settings'));
    await screen.findByTestId('settings-app', undefined, { timeout: 4000 });
    const [win] = useWindowStore.getState().windows;
    expect(screen.getByTestId(`taskbar-window-${win!.id}`)).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId('settings-app'), { key: 'w', code: 'KeyW', altKey: true });
    await waitFor(() => expect(useWindowStore.getState().windows).toHaveLength(0));
  });

  it('o menu de apps abre com Ctrl+K dentro do OS e abre o app escolhido', async () => {
    const user = userEvent.setup();
    const { container } = renderDesktop();
    await waitForDesktop(container);
    useWindowStore.getState().reset();

    fireEvent.keyDown(screen.getByTestId('taskbar'), { key: 'k', ctrlKey: true });
    const launcher = await screen.findByTestId('launcher');
    expect(launcher.closest('[data-os-portal]')).not.toBeNull();

    await user.type(within(launcher).getByTestId('launcher-search'), 'set{Enter}');
    await screen.findByTestId('settings-app', undefined, { timeout: 4000 });
    expect(useWindowStore.getState().windows.map((w) => w.appId)).toEqual(['settings']);
  });
});
