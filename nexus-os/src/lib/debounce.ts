export interface DebouncedTask<T> {
  schedule: (value: T) => void;
  /** Executa já o que estiver pendente e espera terminar. */
  flush: () => Promise<void>;
  cancel: () => void;
}

/** Agrupa chamadas seguidas e executa só a última, depois de `ms`. */
export function debounceTask<T>(
  run: (value: T) => Promise<void> | void,
  ms: number,
  onError: (error: unknown) => void = (error) => console.warn(error),
): DebouncedTask<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { value: T } | null = null;
  let running: Promise<void> = Promise.resolve();

  const execute = () => {
    timer = null;
    if (!pending) return running;
    const { value } = pending;
    pending = null;
    running = running.then(() => run(value)).catch(onError);
    return running;
  };

  return {
    schedule(value) {
      pending = { value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void execute(), ms);
    },
    flush() {
      if (timer) clearTimeout(timer);
      return execute();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}
