'use client';

import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { appComponents } from '@/apps/catalog';
import { systemBridge } from '@/system/virtual-bridge';
import type { AppManifest } from './types';

class AppErrorBoundary extends Component<{ name: string; children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Um app com erro não derruba o OS: o erro fica contido na janela.
    console.warn(`[${this.props.name}]`, error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div role="alert" className="flex h-full flex-col justify-center gap-2 p-6">
          <p className="type-label text-slate">Erro no app</p>
          <p className="text-sm text-paper/70">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppLoading({ name }: { name: string }) {
  return (
    <div className="type-label flex h-full items-center justify-center text-slate" role="status">
      Abrindo {name}
    </div>
  );
}

/** Carrega o app sob demanda e entrega a SystemBridge. */
export function AppHost({
  manifest,
  windowId,
  launchArgs,
}: {
  manifest: AppManifest;
  windowId: string;
  launchArgs?: Readonly<Record<string, string>>;
}) {
  const App = appComponents[manifest.id];
  if (!App) return null;
  return (
    <AppErrorBoundary name={manifest.name}>
      <Suspense fallback={<AppLoading name={manifest.name} />}>
        <App windowId={windowId} bridge={systemBridge} launchArgs={launchArgs} />
      </Suspense>
    </AppErrorBoundary>
  );
}
