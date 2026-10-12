'use client';

import { useSyncExternalStore } from 'react';

const formatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 1000);
  return () => window.clearInterval(id);
}

function getSnapshot() {
  return formatter.format(new Date());
}

function getServerSnapshot() {
  return '--:--';
}

/** Relógio local (atualiza a cada segundo, mostra horas e minutos). */
export function Clock({ className }: { className?: string }) {
  const time = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <time className={className} suppressHydrationWarning>
      {time}
    </time>
  );
}
