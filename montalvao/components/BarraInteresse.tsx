"use client";

import { useEffect, useRef, useState } from "react";
import { IconeWhatsApp } from "@/components/Icones";

/**
 * Barra fixa no celular com o botão de interesse, para quem rola a ficha.
 * Só aparece depois que o botão principal sai da tela; é o único botão fixo da página.
 */
export function BarraInteresse({ href, nome, preco, alvoId }: { href: string; nome: string; preco: string; alvoId: string }) {
  const [visivel, setVisivel] = useState(false);
  const barra = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alvo = document.getElementById(alvoId);
    if (!alvo) return;
    const obs = new IntersectionObserver(([e]) => setVisivel(!e.isIntersecting && e.boundingClientRect.top < 0));
    obs.observe(alvo);
    return () => obs.disconnect();
  }, [alvoId]);

  useEffect(() => {
    const raiz = document.documentElement;
    if (visivel && barra.current) raiz.style.setProperty("--barra-fixa", `${barra.current.offsetHeight}px`);
    else raiz.style.removeProperty("--barra-fixa");
    return () => {
      raiz.style.removeProperty("--barra-fixa");
    };
  }, [visivel]);

  return (
    <div
      ref={barra}
      aria-hidden={!visivel}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-preto/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-papel transition-transform duration-500 ease-expo lg:hidden ${
        visivel ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="envelope flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[0.9375rem] font-semibold">{nome}</p>
          <p className="text-[0.875rem] text-papel/70">{preco}</p>
        </div>
        <a href={href} target="_blank" rel="noopener noreferrer" tabIndex={visivel ? 0 : -1} className="botao botao-cheio shrink-0 px-5">
          <IconeWhatsApp />
          Tenho interesse
          <span className="sr-only"> neste veículo (abre o WhatsApp)</span>
        </a>
      </div>
    </div>
  );
}
