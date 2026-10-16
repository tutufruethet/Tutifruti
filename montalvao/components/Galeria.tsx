"use client";

import { useRef, useState } from "react";

type Foto = { id: string; alt: string; largura: number; altura: number; avif: string; webp: string; src: string; cor: string };

/**
 * Galeria do veículo. Recebe só fotos do mesmo exemplar.
 * Com uma foto, mostra a foto e nada mais (não simula galeria).
 */
export function Galeria({ fotos, nome }: { fotos: Foto[]; nome: string }) {
  const [atual, setAtual] = useState(0);
  const miniaturas = useRef<HTMLDivElement>(null);
  const f = fotos[atual];
  const varias = fotos.length > 1;

  function ir(i: number) {
    const n = (i + fotos.length) % fotos.length;
    setAtual(n);
    miniaturas.current?.querySelectorAll<HTMLButtonElement>("button")[n]?.focus();
  }

  return (
    <figure aria-roledescription={varias ? "galeria" : undefined} aria-label={varias ? `Fotos do ${nome}` : undefined} data-galeria>
      <div className="relative overflow-hidden bg-black/30" style={{ aspectRatio: `${f.largura} / ${f.altura}`, maxHeight: "78svh" }}>
        <picture key={f.id}>
          <source type="image/avif" srcSet={f.avif} sizes="(min-width: 64rem) 56vw, 100vw" />
          <img
            src={f.src}
            srcSet={f.webp}
            sizes="(min-width: 64rem) 56vw, 100vw"
            width={f.largura}
            height={f.altura}
            alt={f.alt}
            fetchPriority={atual === 0 ? "high" : undefined}
            className="mx-auto h-full w-full object-contain"
            style={{ backgroundColor: f.cor }}
          />
        </picture>
        {varias && (
          <p className="rotulo absolute bottom-3 right-3 bg-preto/80 px-2.5 py-1.5 text-papel" aria-live="polite" data-galeria-contador>
            Foto {atual + 1} de {fotos.length}
          </p>
        )}
      </div>

      {varias && (
        <div
          ref={miniaturas}
          role="group"
          aria-label="Escolher foto"
          className="mt-3 flex gap-3"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") ir(atual + 1);
            if (e.key === "ArrowLeft") ir(atual - 1);
          }}
        >
          {fotos.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setAtual(i)}
              aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
              aria-current={i === atual ? "true" : undefined}
              data-miniatura={i}
              data-alt={m.alt}
              data-largura={m.largura}
              data-altura={m.altura}
              className="relative size-20 overflow-hidden opacity-60 transition-opacity duration-300 hover:opacity-100 aria-[current=true]:opacity-100 aria-[current=true]:outline aria-[current=true]:outline-1 aria-[current=true]:outline-offset-2 aria-[current=true]:outline-papel sm:size-24"
            >
              <picture>
                <source type="image/avif" srcSet={m.avif} sizes="96px" />
                <img src={m.src} srcSet={m.webp} sizes="96px" alt="" width={m.largura} height={m.altura} loading="lazy" className="h-full w-full object-cover" style={{ backgroundColor: m.cor }} />
              </picture>
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
