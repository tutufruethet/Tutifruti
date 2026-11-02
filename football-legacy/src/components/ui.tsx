"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import type { GameState, Player } from "@/engine/types";
import { teamColors, teamShort } from "@/engine/season/schedule";

/** Escudo procedural (SVG): formato fixo, padrão e cores do clube. */
export function Crest({ g, id, size = 28 }: { g: GameState; id: string; size?: number }) {
  const [c1, c2] = teamColors(g, id);
  const short = teamShort(g, id);
  const club = g.clubs[id];
  const pattern = club?.pattern ?? "liso";
  const clip = `crest-${id}`;
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 40 44" aria-label={short} role="img" className="shrink-0">
      <defs>
        <clipPath id={clip}><path d="M4 3h32v19c0 10-7 16-16 19C11 38 4 32 4 22z" /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="40" height="44" fill={c1} />
        {pattern === "listras" && [8, 18, 28].map((x) => <rect key={x} x={x} width="5" height="44" fill={c2} />)}
        {pattern === "faixa" && <path d="M-4 30 L44 6 L44 16 L-4 40z" fill={c2} />}
        {pattern === "metade" && <rect x="20" width="20" height="44" fill={c2} />}
        {pattern === "cruz" && <><rect x="16" width="8" height="44" fill={c2} /><rect y="14" width="40" height="8" fill={c2} /></>}
        {id.startsWith("N-") && <rect y="28" width="40" height="16" fill={c2} />}
      </g>
      <path d="M4 3h32v19c0 10-7 16-16 19C11 38 4 32 4 22z" fill="none" stroke="rgba(236,235,230,.28)" strokeWidth="1.5" />
    </svg>
  );
}

export function Avatar({ p, size = 36, ring }: { p: Pick<Player, "first" | "last" | "id">; size?: number; ring?: boolean }) {
  const ini = `${p.first.charAt(0)}${p.last.replace(/^(de |van |da )/, "").charAt(0)}`.toUpperCase();
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full surface-2 num ${ring ? "ring-1 ring-accent" : ""}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {ini}
    </div>
  );
}

export function Bar({ value, max = 100, accent, className = "" }: { value: number; max?: number; accent?: boolean; className?: string }) {
  return (
    <div className={`bar ${accent ? "accent" : ""} ${className}`}>
      <i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="label">{label}</div>
      <div className={`num mt-1 text-2xl ${accent ? "text-accent" : ""}`}>{value}</div>
      {sub && <div className="dim mt-0.5 text-xs">{sub}</div>}
    </div>
  );
}

/** Cabeçalho de seção com índice tipográfico, como metadados nos cantos. */
export function Section({ idx, title, right, children, className = "" }: { idx?: string; title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border-t line pt-4 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="flex items-baseline gap-3 text-[15px] font-medium">
          {idx && <span className="label">({idx})</span>}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function PageTitle({ kicker, title, meta }: { kicker: string; title: ReactNode; meta?: ReactNode }) {
  return (
    <header className="mb-8 rise">
      <div className="label">{kicker}</div>
      <h1 className="display mt-2 text-[clamp(2.4rem,7vw,5.5rem)] break-words">{title}</h1>
      {meta && <div className="dim mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">{meta}</div>}
    </header>
  );
}

export function FormDots({ form }: { form: ("V" | "E" | "D")[] }) {
  return (
    <span className="inline-flex gap-1">
      {form.map((f, i) => (
        <span
          key={i}
          title={f === "V" ? "Vitória" : f === "E" ? "Empate" : "Derrota"}
          className={`num grid h-5 w-5 place-items-center rounded-[3px] text-[10px] ${f === "V" ? "bg-accent text-ink" : f === "E" ? "surface-2" : "border line faint"}`}
        >
          {f}
        </span>
      ))}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="dim py-6 text-sm">{children}</p>;
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; badge?: number }[] }) {
  return (
    <div className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto border-b line px-4 sm:mx-0 sm:px-0">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`relative shrink-0 px-3 py-2.5 text-sm transition-colors duration-300 ${value === it.id ? "text-paper" : "dim hover:text-paper"}`}
        >
          {it.label}
          {!!it.badge && <span className="num ml-1.5 text-accent">{it.badge}</span>}
          {value === it.id && <span className="absolute inset-x-3 -bottom-px h-px bg-accent" />}
        </button>
      ))}
    </div>
  );
}

export function TeamLink({ g, id, short }: { g: GameState; id: string; short?: boolean }) {
  const name = id.startsWith("N-") ? g.nations[id.slice(2)]?.name : short ? g.clubs[id]?.short : g.clubs[id]?.name;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Crest g={g} id={id} size={18} />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function Arrow({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 text-sm dim transition-colors duration-300 hover:text-paper">
      {children} <span className="transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose?: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/80 backdrop-blur-sm sm:place-items-center" onClick={onClose}>
      <div
        className={`rise max-h-[92dvh] w-full overflow-y-auto border line bg-ink p-5 scroll-thin sm:rounded-md sm:p-7 ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
