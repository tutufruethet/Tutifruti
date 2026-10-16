"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconePausar, IconeTocar } from "@/components/Icones";

type Props = {
  /** Botão secundário (WhatsApp), renderizado no servidor. */
  ctaSecundario: React.ReactNode;
};

/**
 * Abertura com o vídeo real da loja. O vídeo é vertical: no desktop fica num painel alto ao lado do texto;
 * no celular vira fundo, com overlay para leitura.
 * - Só toca com JS, sem `prefers-reduced-motion` e sem economia de dados; senão fica o poster.
 * - Pausa fora da tela. O botão de pausa vale até a pessoa tocar de novo.
 */
export function Abertura({ ctaSecundario }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const midia = useRef<HTMLDivElement>(null);
  const texto = useRef<HTMLDivElement>(null);
  const [tocando, setTocando] = useState(false);
  const [podeTocar, setPodeTocar] = useState(false);
  const pausadoPelaPessoa = useRef(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)");
    const economia = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduzir.matches || economia) return;
    setPodeTocar(true);

    const tocar = () => v.play().then(() => setTocando(true)).catch(() => setTocando(false));
    const observador = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !pausadoPelaPessoa.current) tocar();
      else if (!e.isIntersecting) v.pause();
    });
    observador.observe(v);
    const aoPausar = () => setTocando(false);
    const aoTocar = () => setTocando(true);
    v.addEventListener("pause", aoPausar);
    v.addEventListener("play", aoTocar);
    return () => {
      observador.disconnect();
      v.removeEventListener("pause", aoPausar);
      v.removeEventListener("play", aoTocar);
    };
  }, []);

  // Profundidade sutil na rolagem: o vídeo desce mais devagar que o texto.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    const aoRolar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight * 1.2);
        if (midia.current) midia.current.style.transform = `translate3d(0, ${y * 0.18}px, 0)`;
        if (texto.current) texto.current.style.transform = `translate3d(0, ${y * -0.06}px, 0)`;
      });
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("scroll", aoRolar);
    };
  }, []);

  function alternar() {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      pausadoPelaPessoa.current = false;
      v.play().catch(() => undefined);
    } else {
      pausadoPelaPessoa.current = true;
      v.pause();
    }
  }

  return (
    <section aria-labelledby="titulo-abertura" className="escuro relative isolate overflow-hidden">
      <div className="envelope relative grid min-h-[max(40rem,100svh)] grid-cols-1 lg:min-h-[max(44rem,100svh)] lg:grid-cols-12 lg:gap-x-5">
        {/* Mídia: fundo no celular, painel no desktop */}
        <div className="absolute inset-x-0 top-0 -z-10 h-[max(26rem,68svh)] lg:relative lg:inset-auto lg:z-0 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:flex lg:h-auto lg:items-center lg:justify-end lg:pb-10 lg:pt-[calc(var(--altura-cabecalho)+2rem)]">
          <div ref={midia} className="relative h-full w-full will-change-transform lg:aspect-[760/1460] lg:h-[min(82svh,54rem)] lg:w-auto">
            <video
              ref={video}
              className="absolute inset-0 h-full w-full object-cover object-[50%_80%] lg:object-[50%_35%]"
              poster="/midia/abertura-poster-760.webp"
              muted
              loop
              playsInline
              preload="none"
              aria-label="Vídeo gravado no showroom da Montalvão: um homem apresenta um Nissan March prata entre outros carros."
            >
              <source src="/midia/abertura-480-av1.mp4" type='video/mp4; codecs="av01.0.04M.08"' media="(max-width: 63.99rem)" />
              <source src="/midia/abertura-480.mp4" type='video/mp4; codecs="avc1.64001F"' media="(max-width: 63.99rem)" />
              <source src="/midia/abertura-720-av1.mp4" type='video/mp4; codecs="av01.0.05M.08"' />
              <source src="/midia/abertura-720.mp4" type='video/mp4; codecs="avc1.640020"' />
            </video>
            {/* Overlay de leitura no celular; borda sutil no desktop */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_top,#0d0d0d_0%,rgb(13_13_13/0.82)_24%,rgb(13_13_13/0.15)_58%,rgb(13_13_13/0.55)_100%)] lg:bg-none lg:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
            />
          </div>
        </div>

        {/* Texto */}
        <div
          ref={texto}
          className="abertura-texto relative flex flex-col justify-end pb-[max(2rem,env(safe-area-inset-bottom))] pt-[calc(var(--altura-cabecalho)+14rem)] sm:pt-[calc(var(--altura-cabecalho)+18rem)] lg:pt-[calc(var(--altura-cabecalho)+3rem)] will-change-transform lg:col-span-7 lg:col-start-1 lg:row-start-1 lg:justify-center lg:pb-16"
        >
          <p className="rotulo flex items-center gap-3 text-papel/80" data-entrar style={{ "--atraso": 0 } as React.CSSProperties}>
            <span className="h-px w-8 bg-ouro" aria-hidden="true" />
            <span>
              <span className="hidden sm:inline">Montalvão Motors · </span>Loja de veículos
            </span>
          </p>
          <h1 id="titulo-abertura" className="display mt-5 text-[clamp(2.25rem,9.6vw,3.25rem)] sm:text-[clamp(3rem,7.6vw,4.5rem)] lg:mt-6 lg:text-[clamp(3.6rem,6.1vw,6.5rem)]">
            <span className="linha-mascara">
              <span style={{ "--atraso": 0 } as React.CSSProperties}>Seu próximo carro </span>
            </span>
            <span className="linha-mascara">
              <span style={{ "--atraso": 1 } as React.CSSProperties}>começa com uma </span>
            </span>
            <span className="linha-mascara">
              <span style={{ "--atraso": 2 } as React.CSSProperties}>
                boa <span className="text-ouro">conversa.</span>
              </span>
            </span>
          </h1>
          <p className="mt-5 max-w-[34rem] text-[1.0625rem] leading-relaxed text-papel/85 sm:text-[1.125rem] lg:mt-7 lg:text-[1.1875rem]" data-entrar style={{ "--atraso": 3 } as React.CSSProperties}>
            Conheça a Montalvão, explore os veículos e fale com nossa equipe sobre o que você procura.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:mt-9" data-entrar style={{ "--atraso": 4 } as React.CSSProperties}>
            <Link href="/veiculos/" className="botao botao-cheio">
              Explorar veículos
              <span aria-hidden="true">→</span>
            </Link>
            {ctaSecundario}
          </div>

          <div className="mt-12 hidden items-center gap-6 text-papel/70 lg:flex" data-entrar style={{ "--atraso": 5 } as React.CSSProperties}>
            <span className="rotulo">Role para conhecer ↓</span>
          </div>
        </div>

        {podeTocar && (
          <button
            type="button"
            onClick={alternar}
            aria-label={tocando ? "Pausar vídeo de fundo" : "Reproduzir vídeo de fundo"}
            className="absolute right-[var(--margem)] top-[calc(var(--altura-cabecalho)+0.75rem)] z-10 inline-flex size-11 items-center justify-center rounded-full border border-white/25 bg-preto/50 text-papel transition-colors duration-300 hover:bg-preto/80 lg:bottom-12 lg:top-auto"
          >
            {tocando ? <IconePausar /> : <IconeTocar />}
          </button>
        )}
      </div>
    </section>
  );
}
