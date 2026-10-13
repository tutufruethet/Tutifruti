"use client";

import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong border border-accent disabled:bg-accent/50 disabled:border-transparent",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink-3 hover:bg-ground",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink border border-transparent",
  quiet: "text-accent hover:bg-accent-soft border border-transparent",
  danger: "bg-surface text-danger border border-line-strong hover:border-danger hover:bg-danger-soft",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; icon?: ReactNode; busy?: boolean }
>(function Button({ variant = "secondary", size = "md", icon, busy, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap select-none",
        "transition-[background-color,border-color,color] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-10 px-3.5 text-sm",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {busy ? <Spinner /> : icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-grid size-8 place-items-center rounded-md text-ink-2 hover:bg-sunken hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent",
        "transition-colors duration-150",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("size-4 animate-spin motion-reduce:animate-none", className)} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Rótulo + controle + ajuda + erro, ligados por id. */
export function Field({
  label,
  hint,
  error,
  optional,
  children,
  className,
  id: givenId,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
  className?: string;
  id?: string;
}) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-3">opcional</span>}
      </label>
      {children({ id, "aria-describedby": [hintId, errId].filter(Boolean).join(" ") || undefined, "aria-invalid": error ? true : undefined })}
      {hint && (
        <p id={hintId} className="text-[13px] leading-snug text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-[13px] font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "accent" | "ok" | "warn" | "danger"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-sunken text-ink-2",
    accent: "bg-accent-soft text-accent-strong",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>{children}</span>;
}

/** Diálogo modal nativo: foco preso, Esc fecha, foco volta ao gatilho. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        "m-auto w-[calc(100%-2rem)] rounded-lg border border-line bg-surface p-0 text-ink shadow-[0_12px_40px_-12px_rgb(29_34_40/0.35)] backdrop:backdrop-blur-[1px]",
        wide ? "max-w-3xl" : "max-w-lg",
      )}
    >
      {open && (
        <div className="anim-rise flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description && <div className="mt-1 text-sm text-ink-2">{description}</div>}
            </div>
            <IconButton label="Fechar" onClick={onClose} className="-mr-1.5 -mt-1">
              <X className="size-4" />
            </IconButton>
          </div>
          {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-ground/60 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/** Grupo de opções exclusivas com aparência de botões segmentados (radio nativo por baixo). */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  legend,
  size = "md",
}: {
  name: string;
  value: T | null;
  options: readonly { key: T; label: string }[];
  onChange: (v: T) => void;
  legend: string;
  size?: "sm" | "md";
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex flex-wrap rounded-md border border-line-strong bg-surface p-0.5">
        {options.map((o) => (
          <label
            key={o.key}
            className={cx(
              "cursor-pointer rounded-[5px] font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
              size === "sm" ? "px-2 py-1 text-[13px]" : "px-3 py-1.5 text-sm",
              value === o.key ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken",
            )}
          >
            <input type="radio" className="sr-only" name={name} value={o.key} checked={value === o.key} onChange={() => onChange(o.key)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Panel({ children, className, as: Tag = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div" | "aside" } & Record<string, unknown>) {
  return (
    <Tag className={cx("rounded-lg border border-line bg-surface", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-line-strong bg-surface/60 px-5 py-6">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="max-w-prose text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
