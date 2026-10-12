'use client';

import { useState, type KeyboardEvent } from 'react';
import { appRegistry } from '@/apps/catalog';
import { Icon, isIconName } from '@/components/ui/icon';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/cn';
import { openApp } from '@/os/apps/launch';
import { useDesktopStore } from './desktop-store';
import { filterApps } from './launcher-search';

/** Menu de apps: busca + lista navegável por setas. Enter abre. */
export function LauncherPanel() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const setPanel = useDesktopStore((state) => state.setPanel);
  const results = filterApps(appRegistry.list(), query);
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  function launch(index: number) {
    const app = results[index];
    if (!app) return;
    setPanel(null);
    openApp(app.id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((activeIndex + 1) % Math.max(results.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((activeIndex - 1 + results.length) % Math.max(results.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      launch(activeIndex);
    }
  }

  return (
    <div data-testid="launcher" className="flex w-[22rem] max-w-[calc(100cqw-1rem)] flex-col">
      <label className="flex items-center gap-2 border-b border-line px-3">
        <Icon name="search" className="text-slate" />
        <input
          data-testid="launcher-search"
          aria-label="Buscar apps"
          aria-controls="launcher-results"
          aria-activedescendant={results[activeIndex] ? `launcher-${results[activeIndex].id}` : undefined}
          placeholder="Buscar apps"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-11 w-full bg-transparent text-base text-paper outline-none placeholder:text-paper/40"
        />
      </label>
      <ul id="launcher-results" role="listbox" aria-label="Apps" className="max-h-80 overflow-y-auto py-1">
        {results.length === 0 ? <li className="px-3 py-3 text-sm text-paper/56">Nenhum app encontrado.</li> : null}
        {results.map((app, index) => (
          <li
            key={app.id}
            id={`launcher-${app.id}`}
            role="option"
            aria-selected={index === activeIndex}
            data-testid={`launcher-app-${app.id}`}
            onPointerMove={() => setActive(index)}
            onClick={() => launch(index)}
            className={cn(
              'flex cursor-default items-center gap-3 px-3 py-2',
              index === activeIndex ? 'text-paper' : 'text-paper/56',
            )}
          >
            <Icon name={isIconName(app.icon) ? app.icon : 'file'} />
            <span className="text-sm">{app.name}</span>
            <span className="ml-auto truncate text-xs text-slate">{app.description}</span>
          </li>
        ))}
      </ul>
      <p className="type-label flex items-center gap-2 border-t border-line px-3 py-2 text-slate">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd> navega · <Kbd>Enter</Kbd> abre · <Kbd>Esc</Kbd> fecha
      </p>
    </div>
  );
}
