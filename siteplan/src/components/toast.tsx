"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, CircleAlert, Info, X } from "lucide-react";
import { cx } from "./ui";

type Toast = { id: number; tone: "ok" | "error" | "info"; message: string; action?: { label: string; run: () => void }; duration: number };
type ToastApi = { show: (t: Omit<Toast, "id" | "duration"> & { duration?: number }) => void };

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback<ToastApi["show"]>(
    (t) => {
      const id = ++seq.current;
      const duration = t.duration ?? (t.action ? 8000 : 4000);
      setToasts((list) => [...list.slice(-2), { ...t, id, duration }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ show }), [show]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label="Notificações"
        className="pointer-events-none fixed inset-x-3 bottom-20 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end print:hidden"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cx(
              "anim-rise pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border bg-ink px-3.5 py-2.5 text-sm text-white shadow-[0_10px_30px_-10px_rgb(29_34_40/0.5)]",
              "border-ink",
            )}
          >
            {t.tone === "ok" ? (
              <Check className="size-4 shrink-0 text-[#8fd6ae]" aria-hidden />
            ) : t.tone === "error" ? (
              <CircleAlert className="size-4 shrink-0 text-[#ffb4ae]" aria-hidden />
            ) : (
              <Info className="size-4 shrink-0 text-[#b7c8f5]" aria-hidden />
            )}
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="rounded px-2 py-1 font-semibold text-[#b7c8f5] hover:bg-white/10"
                onClick={() => {
                  t.action!.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Fechar notificação" className="rounded p-1 text-white/60 hover:text-white" onClick={() => dismiss(t.id)}>
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast fora do ToastProvider");
  return c;
}
