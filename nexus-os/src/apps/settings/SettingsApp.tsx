'use client';

import type { ReactNode } from 'react';
import { appRegistry } from '@/apps/catalog';
import { Kbd } from '@/components/ui/kbd';
import { QUALITY_LEVELS } from '@/engine/quality';
import { cn } from '@/lib/cn';
import type { AppProps } from '@/os/apps/types';
import { DESKTOP_SHORTCUTS } from '@/os/desktop/shortcuts';
import { WALLPAPERS } from '@/os/desktop/wallpapers';
import { shortcutLabels } from '@/os/keyboard/shortcuts';
import type { GraphicsQualitySetting, Settings } from '@/settings/schema';
import { useSettingsStore } from '@/settings/store';
import { DataSection } from './DataSection';

const QUALITY_LABELS: Record<GraphicsQualitySetting, string> = {
  auto: 'Automática',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  ultra: 'Ultra',
};

const MOTION_LABELS: Record<Settings['motion'], string> = {
  system: 'Seguir o sistema',
  reduced: 'Reduzido',
  full: 'Completo',
};

export default function SettingsApp({ bridge }: AppProps) {
  const settings = useSettingsStore((state) => state.settings);
  const update = useSettingsStore((state) => state.update);

  return (
    <div data-testid="settings-app" className="@container h-full overflow-y-auto px-6 py-5 text-sm">
      <p className="type-label text-slate">As alterações são salvas no perfil automaticamente.</p>

      <Section index="01" title="Aparência">
        <p className="mb-3 text-paper/56">Wallpaper</p>
        <div role="radiogroup" aria-label="Wallpaper" className="grid grid-cols-2 gap-3 @lg:grid-cols-4">
          {WALLPAPERS.map((wallpaper) => {
            const active = settings.wallpaper === wallpaper.id;
            return (
              <button
                key={wallpaper.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`wallpaper-${wallpaper.id}`}
                onClick={() => update({ wallpaper: wallpaper.id })}
                className="text-left"
              >
                <span
                  aria-hidden
                  className={cn('block aspect-[16/10] border', active ? 'border-signal' : 'border-line')}
                  style={wallpaper.style}
                />
                <span className={cn('mt-1.5 block', active ? 'text-paper' : 'text-paper/56')}>{wallpaper.name}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section index="02" title="Gráficos">
        <p className="mb-3 text-paper/56">Qualidade do quarto 3D. Automática escolhe pelo aparelho.</p>
        <Choice
          label="Qualidade gráfica"
          value={settings.graphicsQuality}
          options={(['auto', ...QUALITY_LEVELS] as const).map((value) => ({ value, label: QUALITY_LABELS[value] }))}
          onChange={(graphicsQuality) => update({ graphicsQuality })}
        />
      </Section>

      <Section index="03" title="Movimento">
        <p className="mb-3 text-paper/56">Reduzido desliga animações, a cortina do boot e o voo da câmera.</p>
        <Choice
          label="Movimento"
          value={settings.motion}
          options={(['system', 'reduced', 'full'] as const).map((value) => ({ value, label: MOTION_LABELS[value] }))}
          onChange={(motion) => update({ motion })}
        />
      </Section>

      <Section index="04" title="Atalhos">
        <dl className="divide-y divide-line border-y border-line">
          {DESKTOP_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.combo} className="flex items-center justify-between py-2">
              <dt className="text-paper/70">{shortcut.label}</dt>
              <dd className="flex gap-1">
                {shortcutLabels(shortcut.combo).map((label) => (
                  <Kbd key={label}>{label}</Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section index="05" title="Dados e privacidade">
        <DataSection bridge={bridge} />
      </Section>

      <Section index="06" title="Sobre">
        <dl className="grid grid-cols-[10rem_1fr] gap-y-2">
          <dt className="text-paper/56">Versão</dt>
          <dd>0.3.0 · Fase 3</dd>
          <dt className="text-paper/56">Ponte do sistema</dt>
          <dd>{bridge.kind === 'virtual' ? 'Virtual (nada acessa o computador real)' : 'Nativa'}</dd>
          <dt className="text-paper/56">Armazenamento</dt>
          <dd>IndexedDB deste navegador (convidado: só memória)</dd>
          <dt className="text-paper/56">Apps instalados</dt>
          <dd>{appRegistry.list().map((app) => app.name).join(', ')}</dd>
        </dl>
      </Section>
    </div>
  );
}

function Section({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-8 first-of-type:mt-6">
      <h3 className="mb-3 flex items-baseline gap-3 text-lg font-medium tracking-[-0.02em]">
        <span className="type-label text-slate">({index})</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap border border-line">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-8 px-3 transition-colors duration-(--duration-ui) ease-expo',
            option.value === value ? 'bg-paper text-ink' : 'text-paper/56 hover:text-paper',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
