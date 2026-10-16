"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconeWhatsApp } from "@/components/Icones";

/**
 * Atalho discreto para o WhatsApp. Só existe com número confirmado (href vem do servidor).
 * Na página do veículo não aparece: lá a barra fixa já tem o botão de interesse.
 * Na home, aparece depois da abertura, que já tem o próprio botão.
 */
export function BotaoFlutuante({ href }: { href: string }) {
  const pathname = usePathname();
  const [visivel, setVisivel] = useState(pathname !== "/");
  const naPaginaDeVeiculo = /^\/veiculos\/[^/]+\/?$/.test(pathname);

  useEffect(() => {
    if (pathname !== "/") {
      setVisivel(true);
      return;
    }
    const aoRolar = () => setVisivel(window.scrollY > window.innerHeight * 0.8);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, [pathname]);

  if (naPaginaDeVeiculo) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar no WhatsApp (abre o WhatsApp)"
      className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex size-14 items-center justify-center gap-2 rounded-full border border-white/15 bg-grafite text-papel shadow-[0_10px_30px_-12px_rgb(0_0_0/0.6)] transition-[opacity,transform,background-color] duration-500 ease-expo hover:bg-[#222] sm:right-6 lg:h-12 lg:w-auto lg:px-5 ${
        visivel ? "opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
      tabIndex={visivel ? 0 : -1}
    >
      <IconeWhatsApp className="size-6 lg:size-5" />
      <span className="hidden text-[0.9375rem] font-semibold lg:inline">WhatsApp</span>
    </a>
  );
}
