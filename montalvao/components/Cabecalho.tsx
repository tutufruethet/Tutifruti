"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { IconeFechar, IconeMenu } from "@/components/Icones";
import { PREVIA } from "@/lib/modo";

const LINKS = [
  { href: "/", rotulo: "Início" },
  { href: "/veiculos/", rotulo: "Veículos" },
  { href: "/a-montalvao/", rotulo: "A Montalvão" },
  { href: "/#contato", rotulo: "Contato" },
];

function ativo(pathname: string, href: string) {
  if (href.includes("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href.replace(/\/$/, ""));
}

export function Cabecalho() {
  const pathname = usePathname();
  const [rolado, setRolado] = useState(false);
  const [escondido, setEscondido] = useState(false);
  const [aberto, setAberto] = useState(false);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const cabecalho = useRef<HTMLElement>(null);

  // Fundo legível depois de rolar; esconde ao descer e volta ao subir.
  useEffect(() => {
    let ultimo = window.scrollY;
    let pendente = false;
    const aoRolar = () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setRolado(y > 16);
        const dentro = cabecalho.current?.contains(document.activeElement);
        if (!dentro) setEscondido(y > 480 && y > ultimo + 4 ? true : y < ultimo - 4 ? false : (v) => v);
        ultimo = y;
        pendente = false;
      });
    };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  const fechar = useCallback((devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) botaoMenu.current?.focus();
  }, []);

  // Fecha o menu ao trocar de página.
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  // Menu aberto: o resto da página fica inerte, a rolagem trava e Esc fecha.
  useEffect(() => {
    const pagina = document.getElementById("pagina");
    if (!aberto) return;
    pagina?.setAttribute("inert", "");
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    painel.current?.querySelector<HTMLElement>("a")?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      if (e.key === "Tab" && cabecalho.current) {
        const focaveis = [...cabecalho.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")].filter((el) => el.offsetParent !== null);
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      pagina?.removeAttribute("inert");
      document.documentElement.style.overflow = overflow;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, fechar]);

  const solido = rolado || aberto;

  return (
    <header
      ref={cabecalho}
      className={`fixed inset-x-0 top-0 z-50 text-papel transition-[transform,background-color,border-color] duration-700 ease-expo ${
        escondido && !aberto ? "-translate-y-full" : ""
      } ${solido ? "border-b border-white/10 bg-preto/95" : "border-b border-transparent bg-transparent"}`}
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-papel focus:px-4 focus:py-3 focus:text-preto"
      >
        Pular para o conteúdo
      </a>

      <div className="envelope flex h-[var(--altura-cabecalho)] items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Montalvão Motors, página inicial" className="-m-2 p-2">
            <Wordmark />
          </Link>
          {PREVIA && (
            <Link href="/previa/" className="selo selo-demo lg:hidden" aria-label="Prévia: ver pendências">
              Prévia
            </Link>
          )}
        </div>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={ativo(pathname, l.href) ? "page" : undefined}
                  className="relative py-3 text-[0.9375rem] font-medium text-papel/75 transition-colors duration-300 hover:text-papel aria-[current=page]:text-papel after:absolute after:inset-x-0 after:bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-ouro after:transition-transform after:duration-500 after:ease-expo hover:after:scale-x-100 aria-[current=page]:after:scale-x-100"
                >
                  {l.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link href="/#contato" className="botao botao-linha hidden min-h-11 px-5 text-[0.9375rem] lg:inline-flex">
          Falar com a Montalvão
        </Link>

        <button
          ref={botaoMenu}
          type="button"
          className="-mr-2 inline-flex min-h-11 items-center gap-2.5 px-2 text-[0.9375rem] font-medium lg:hidden"
          aria-expanded={aberto}
          aria-controls="menu-movel"
          onClick={() => (aberto ? fechar() : setAberto(true))}
        >
          {aberto ? "Fechar" : "Menu"}
          {aberto ? <IconeFechar /> : <IconeMenu />}
        </button>
      </div>

      <div
        id="menu-movel"
        ref={painel}
        hidden={!aberto}
        className="fixed inset-x-0 bottom-0 top-[var(--altura-cabecalho)] overflow-y-auto bg-preto lg:hidden"
      >
        <nav aria-label="Menu" className="envelope flex min-h-full flex-col justify-between pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
          <ul className="border-t border-white/10">
            {LINKS.map((l, i) => (
              <li key={l.href} className="border-b border-white/10">
                <Link
                  href={l.href}
                  onClick={() => fechar(false)}
                  aria-current={ativo(pathname, l.href) ? "page" : undefined}
                  className="titulo flex items-baseline justify-between py-5 text-[2rem] aria-[current=page]:text-ouro"
                >
                  {l.rotulo}
                  <span className="rotulo text-papel/50">0{i + 1}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/#contato" onClick={() => fechar(false)} className="botao botao-cheio mt-10 w-full bg-papel text-preto">
            Falar com a Montalvão
          </Link>
        </nav>
      </div>
    </header>
  );
}
