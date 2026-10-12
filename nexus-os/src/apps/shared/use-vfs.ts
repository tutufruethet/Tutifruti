'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import type { VfsPath, VirtualFileSystem } from '@/os/vfs/types';

export interface VfsQuery<T> {
  readonly data: T | undefined;
  readonly error: Error | null;
  readonly loading: boolean;
}

/**
 * Carrega dados do VFS e recarrega quando algo muda sob `watchPath`.
 * `key` identifica a consulta (ex.: pasta atual + busca); mudou, recarrega.
 */
export function useVfsQuery<T>(
  fs: VirtualFileSystem,
  watchPath: VfsPath,
  key: string,
  load: () => Promise<T>,
): VfsQuery<T> {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ key: string; data: T | undefined; error: Error | null }>({
    key: '',
    data: undefined,
    error: null,
  });
  const runLoad = useEffectEvent(load);

  useEffect(() => fs.watch(watchPath, () => setVersion((value) => value + 1)), [fs, watchPath]);

  useEffect(() => {
    let alive = true;
    runLoad().then(
      (data) => {
        if (alive) setState({ key, data, error: null });
      },
      (error: unknown) => {
        if (alive) setState({ key, data: undefined, error: error instanceof Error ? error : new Error(String(error)) });
      },
    );
    return () => {
      alive = false;
    };
  }, [key, version]);

  return { data: state.data, error: state.error, loading: state.key !== key };
}
