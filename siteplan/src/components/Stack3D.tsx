"use client";

import { useEffect, useRef } from "react";

/**
 * Pilha isométrica de quatro planos (briefing → páginas → seções → prompt), em CSS 3D.
 * Um único gesto: as camadas se afastam e inclinam com o ponteiro. Sem WebGL, sem biblioteca.
 */
const LAYERS = [
  { label: "Prompt", kind: "prompt" },
  { label: "Seções", kind: "sections" },
  { label: "Páginas", kind: "pages" },
  { label: "Briefing", kind: "brief" },
] as const;

function Content({ kind }: { kind: (typeof LAYERS)[number]["kind"] }) {
  if (kind === "brief")
    return (
      <div className="grid gap-[7px] p-[14px]">
        {[70, 45, 85, 55].map((w, i) => (
          <div key={i} className="grid gap-[4px]">
            <div className="wire-bar !h-[4px] !bg-ink-3/50" style={{ width: `${w * 0.5}%` }} />
            <div className="h-[10px] rounded-[3px] border border-line-strong bg-surface" />
          </div>
        ))}
      </div>
    );
  if (kind === "pages")
    return (
      <div className="relative h-full p-[14px]">
        <div className="mx-auto h-[16px] w-[38%] rounded-[3px] bg-accent" />
        <div className="mx-auto h-[12px] w-px bg-line-strong" />
        <div className="mx-[16%] h-px bg-line-strong" />
        <div className="flex justify-between px-[10%]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="h-[10px] w-px bg-line-strong" />
              <div className="h-[14px] w-[44px] rounded-[3px] border border-line-strong bg-surface" />
            </div>
          ))}
        </div>
      </div>
    );
  if (kind === "sections")
    return (
      <div className="grid gap-[6px] p-[14px]">
        <div className="h-[30px] rounded-[3px] bg-accent-soft ring-1 ring-accent-line" />
        <div className="grid grid-cols-3 gap-[6px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[22px] rounded-[3px] bg-sunken ring-1 ring-line" />
          ))}
        </div>
        <div className="h-[18px] rounded-[3px] bg-sunken ring-1 ring-line" />
      </div>
    );
  return (
    <div className="grid gap-[6px] p-[14px]">
      {[92, 80, 88, 60, 84, 40].map((w, i) => (
        <div key={i} className="wire-bar !h-[4px]" style={{ width: `${w}%`, background: i === 0 ? "var(--color-ink-2)" : undefined }} />
      ))}
    </div>
  );
}

export function Stack3D({ className = "" }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduce) {
      el.style.setProperty("--spread", "1");
      return;
    }
    let raf = 0;
    let visible = true;
    const target = { x: 0, y: 0, s: 0.55 };
    const cur = { x: 0, y: 0, s: 0 };
    const tick = () => {
      // lerp: o movimento segue o ponteiro com atraso, nunca colado.
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      cur.s += (target.s - cur.s) * 0.08;
      el.style.setProperty("--rx", `${(cur.y * 6).toFixed(2)}deg`);
      el.style.setProperty("--rz", `${(cur.x * 6).toFixed(2)}deg`);
      el.style.setProperty("--spread", cur.s.toFixed(3));
      if (visible) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 1.5)));
      target.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.5)));
    };
    const onEnter = () => (target.s = 1);
    const onLeave = () => {
      target.s = 0.55;
      target.x = 0;
      target.y = 0;
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    if (fine) {
      window.addEventListener("pointermove", onMove, { passive: true });
      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointerleave", onLeave);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={root} aria-hidden="true" className={`relative select-none [perspective:1100px] ${className}`} style={{ ["--spread" as string]: 0 }}>
      <div
        className="absolute top-1/2 left-1/2 h-[150px] w-[210px] [transform-style:preserve-3d]"
        style={{ transform: "translate(-50%, -50%) rotateX(calc(56deg + var(--rx, 0deg))) rotateZ(calc(-42deg + var(--rz, 0deg)))" }}
      >
        {LAYERS.map((l, i) => {
          const z = (LAYERS.length - 1 - i) * 1;
          return (
            <div
              key={l.kind}
              className="absolute inset-0 rounded-[6px] border border-line-strong bg-surface"
              style={{
                transform: `translateZ(calc(${z} * (14px + 30px * var(--spread))))`,
                boxShadow: "0 18px 28px -18px rgb(37 87 214 / 0.35)",
              }}
            >
              <Content kind={l.kind} />
            </div>
          );
        })}
      </div>
      <p className="absolute inset-x-0 bottom-0 text-center text-xs text-ink-3">Briefing → páginas → seções → prompt</p>
    </div>
  );
}
