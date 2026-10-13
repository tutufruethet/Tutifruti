"use client";

import { useEffect, useState } from "react";

export type AiStatus = { enabled: boolean; model: string | null };
let cache: Promise<AiStatus> | null = null;

/** Consulta o servidor uma vez por sessão: a chave nunca é exposta, só se ela existe. */
export function useAiStatus(): AiStatus | null {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    cache ??= fetch("/api/ai/status")
      .then((r) => (r.ok ? r.json() : { enabled: false, model: null }))
      .catch(() => ({ enabled: false, model: null }));
    let alive = true;
    cache.then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);
  return status;
}
