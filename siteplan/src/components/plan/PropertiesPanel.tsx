"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx, IconButton } from "@/components/ui";

/**
 * Painel contextual: coluna fixa à direita no desktop; folha inferior no celular,
 * aberta quando algo é selecionado.
 */
export function PropertiesPanel({
  title,
  open,
  onClose,
  children,
  empty,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  empty?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    if (!mq.matches) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      {open && <button type="button" aria-label="Fechar propriedades" className="fixed inset-0 z-40 bg-ink/30 lg:hidden" onClick={onClose} />}
      <aside
        aria-label={title}
        className={cx(
          "flex-col bg-surface",
          "lg:sticky lg:top-14 lg:flex lg:h-[calc(100dvh-56px)] lg:w-[360px] lg:shrink-0 lg:border-l lg:border-line",
          open
            ? "fixed inset-x-0 bottom-0 z-50 flex max-h-[86dvh] rounded-t-xl border-t border-line shadow-[0_-12px_40px_-16px_rgb(29_34_40/0.4)] [animation:sheet-up_280ms_var(--ease-out)] lg:static lg:max-h-none lg:rounded-none lg:border-t-0 lg:shadow-none lg:[animation:none]"
            : "hidden",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <IconButton label="Fechar propriedades" className="lg:hidden" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children ?? empty}</div>
      </aside>
    </>
  );
}
