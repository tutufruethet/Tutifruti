"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { IconeFechar, IconeFiltros } from "@/components/Icones";

/** Dados mínimos de cada veículo para filtrar no navegador. O card já vem renderizado do servidor. */
export type ItemCatalogo = {
  slug: string;
  marca: string;
  busca: string;
  carroceria: string | null;
  preco: number | null;
  ano: number | null;
  ordem: number;
};

type Opcao = { valor: string; rotulo: string; quantidade: number };

type Props = {
  itens: ItemCatalogo[];
  cards: Record<string, React.ReactNode>;
  marcas: Opcao[];
  carrocerias: Opcao[];
  ordenacoes: { valor: string; rotulo: string }[];
  vazio: React.ReactNode;
};

type Filtros = { q: string; marca: string; carroceria: string; ordem: string };

const VAZIO: Filtros = { q: "", marca: "", carroceria: "", ordem: "" };
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function lerUrl(): Filtros {
  const p = new URLSearchParams(window.location.search);
  return { q: p.get("q") ?? "", marca: p.get("marca") ?? "", carroceria: p.get("carroceria") ?? "", ordem: p.get("ordem") ?? "" };
}

const plural = (n: number) => `${n} ${n === 1 ? "veículo" : "veículos"}`;

/**
 * Catálogo com busca, filtros e ordenação. O HTML estático já sai com todos os controles e todos os veículos
 * (estado inicial); o filtro roda no navegador e fica salvo na URL (?q=, ?marca=, ?carroceria=, ?ordem=).
 */
export function Catalogo({ itens, cards, marcas, carrocerias, ordenacoes, vazio }: Props) {
  const id = useId();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [filtros, setFiltros] = useState<Filtros>(VAZIO);
  const [texto, setTexto] = useState("");

  // Estado inicial e voltar/avançar do navegador vêm da URL.
  useEffect(() => {
    const sincronizar = () => {
      const f = lerUrl();
      setFiltros(f);
      setTexto(f.q);
    };
    sincronizar();
    window.addEventListener("popstate", sincronizar);
    return () => window.removeEventListener("popstate", sincronizar);
  }, []);

  const atual = useRef(filtros);
  atual.current = filtros;

  const atualizar = useCallback((mudancas: Partial<Filtros>, empilhar = true) => {
    const novo = { ...atual.current, ...mudancas };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(novo)) if (v) p.set(k, v);
    const qs = p.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      // Filtro escolhido entra no histórico; digitação na busca só substitui.
      if (empilhar) window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    }
    atual.current = novo;
    setFiltros(novo);
  }, []);

  // A busca filtra com um pequeno atraso para não reescrever a URL a cada tecla.
  useEffect(() => {
    if (texto.trim() === filtros.q) return;
    const t = setTimeout(() => atualizar({ q: texto.trim() }, false), 250);
    return () => clearTimeout(t);
  }, [texto, filtros.q, atualizar]);

  const { q, marca, carroceria, ordem } = filtros;

  const { ordenados, visiveis } = useMemo(() => {
    const termo = normalizar(q);
    const passa = (i: ItemCatalogo) =>
      (!termo || termo.split(/\s+/).every((p) => i.busca.includes(p))) && (!marca || i.marca === marca) && (!carroceria || i.carroceria === carroceria);
    const porNumero = (campo: "preco" | "ano", dir: 1 | -1) => (a: ItemCatalogo, b: ItemCatalogo) => {
      const va = a[campo];
      const vb = b[campo];
      if (va == null && vb == null) return a.ordem - b.ordem;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * dir;
    };
    let lista = [...itens];
    if (ordem === "menor-preco") lista.sort(porNumero("preco", 1));
    else if (ordem === "maior-preco") lista.sort(porNumero("preco", -1));
    else if (ordem === "mais-novo") lista.sort(porNumero("ano", -1));
    else if (ordem === "mais-antigo") lista.sort(porNumero("ano", 1));
    else lista = lista.sort((a, b) => a.ordem - b.ordem);
    return { ordenados: lista, visiveis: new Set(lista.filter(passa).map((i) => i.slug)) };
  }, [itens, q, marca, carroceria, ordem]);

  const total = visiveis.size;
  const filtrosAtivos = [marca, carroceria].filter(Boolean).length;
  const algumFiltro = Boolean(q || marca || carroceria);
  const rotuloMarca = marcas.find((m) => m.valor === marca)?.rotulo;
  const rotuloCarroceria = carrocerias.find((c) => c.valor === carroceria)?.rotulo;
  const temFiltros = marcas.length > 1 || carrocerias.length > 1;

  const limpar = () => {
    setTexto("");
    atualizar({ q: "", marca: "", carroceria: "" });
  };

  const grupos = (prefixo: string) => (
    <div className="grid gap-10">
      {marcas.length > 1 && (
        <fieldset>
          <legend className="rotulo text-tx-2">Marca</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {[{ valor: "", rotulo: "Todas", quantidade: itens.length }, ...marcas].map((m) => (
              <Chip key={m.valor || "todas"} nome={`${prefixo}-marca`} filtro="marca" valor={m.valor} checado={marca === m.valor} onChange={() => atualizar({ marca: m.valor })}>
                {m.rotulo} <span className="text-tx-2">{m.quantidade}</span>
              </Chip>
            ))}
          </div>
        </fieldset>
      )}
      {carrocerias.length > 1 && (
        <fieldset>
          <legend className="rotulo text-tx-2">Carroceria</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {[{ valor: "", rotulo: "Todas", quantidade: itens.length }, ...carrocerias].map((c) => (
              <Chip key={c.valor || "todas"} nome={`${prefixo}-carroceria`} filtro="carroceria" valor={c.valor} checado={carroceria === c.valor} onChange={() => atualizar({ carroceria: c.valor })}>
                {c.rotulo} <span className="text-tx-2">{c.quantidade}</span>
              </Chip>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );

  return (
    <div className="grade gap-y-10" data-catalogo>
      {/* Barra: busca + filtros (celular) + ordenação */}
      <div className="col-span-4 lg:col-span-12">
        <div className={`flex flex-col gap-3 lg:flex-row lg:items-end ${ordenacoes.length ? "lg:gap-5" : "lg:gap-0"}`}>
          <div className="min-w-0 flex-1">
            <label htmlFor={`${id}-busca`} className="rotulo text-tx-2">
              Buscar por marca ou modelo
            </label>
            <input
              id={`${id}-busca`}
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex.: Creta, Nissan"
              autoComplete="off"
              enterKeyHint="search"
              data-cat-busca
              className="mt-3 block min-h-[3.25rem] w-full rounded-[2px] border border-linha bg-papel px-4 text-[1.0625rem] text-tx placeholder:text-tx-2/70 transition-colors hover:border-tx-2 focus:border-tx focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
            />
          </div>
          <div className="flex gap-3">
            {temFiltros && (
              <button type="button" onClick={() => dialogo.current?.showModal()} className="botao botao-linha flex-1 lg:hidden" aria-haspopup="dialog" data-cat-abrir>
                <IconeFiltros />
                <span>
                  Filtros<span data-cat-ativos>{filtrosAtivos ? ` (${filtrosAtivos})` : ""}</span>
                </span>
              </button>
            )}
            {ordenacoes.length > 0 && (
              <div className="flex-1 lg:w-60 lg:flex-none">
                <label htmlFor={`${id}-ordem`} className="rotulo sr-only text-tx-2 lg:not-sr-only lg:block">
                  Ordenar
                </label>
                <select
                  id={`${id}-ordem`}
                  value={ordem}
                  onChange={(e) => atualizar({ ordem: e.target.value })}
                  data-cat-ordem
                  className="block min-h-[3.25rem] w-full appearance-none rounded-[2px] border border-linha bg-papel px-4 text-[1rem] font-semibold lg:mt-3"
                >
                  <option value="">Ordenar: destaque</option>
                  {ordenacoes.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtros fixos no desktop */}
      {temFiltros && (
        <aside aria-label="Filtros" className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-[calc(var(--altura-cabecalho)+1.5rem)]">{grupos("lateral")}</div>
        </aside>
      )}

      <div className={`col-span-4 ${temFiltros ? "lg:col-span-9" : "lg:col-span-12"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-linha pb-4">
          <p aria-live="polite" className="text-[1rem] font-semibold" data-cat-contagem>
            {plural(total)}
            {rotuloMarca ? ` · ${rotuloMarca}` : ""}
            {rotuloCarroceria ? ` · ${rotuloCarroceria}` : ""}
            {q ? ` · “${q}”` : ""}
          </p>
          <button type="button" onClick={limpar} hidden={!algumFiltro} className="link-seta text-[0.9375rem]" data-cat-limpar>
            Limpar filtros
          </button>
        </div>

        <ul hidden={total === 0} className={`mt-10 grid gap-x-5 gap-y-16 sm:grid-cols-2 ${temFiltros ? "xl:grid-cols-3" : "lg:grid-cols-3"}`} data-cat-lista>
          {ordenados.map((i) => (
            <li
              key={i.slug}
              hidden={!visiveis.has(i.slug)}
              data-slug={i.slug}
              data-marca={i.marca}
              data-carroceria={i.carroceria ?? ""}
              data-busca={i.busca}
              data-preco={i.preco ?? ""}
              data-ano={i.ano ?? ""}
              data-ordem={i.ordem}
            >
              {cards[i.slug]}
            </li>
          ))}
        </ul>

        <div hidden={total > 0} className="mt-12 max-w-2xl" data-cat-vazio>
          <p className="titulo text-[1.75rem]">Nenhum veículo com esses filtros.</p>
          <p className="mt-3 text-tx-2">
            Tente outra busca ou{" "}
            <button type="button" onClick={limpar} className="font-semibold text-tx underline decoration-1 underline-offset-4" data-cat-limpar-vazio>
              limpe os filtros
            </button>
            . O estoque muda com frequência: se você procura algo específico, conte para a equipe.
          </p>
          <div className="mt-6">{vazio}</div>
        </div>
      </div>

      {/* Filtros no celular: folha de baixo, com foco preso pelo <dialog> nativo */}
      {temFiltros && (
        <dialog
          ref={dialogo}
          className="folha claro lg:hidden"
          aria-labelledby={`${id}-titulo-filtros`}
          onClick={(e) => e.target === dialogo.current && dialogo.current?.close()}
          data-cat-dialogo
        >
          <div className="flex max-h-[88svh] flex-col">
            <div className="flex items-center justify-between border-b border-linha px-5 py-4">
              <h2 id={`${id}-titulo-filtros`} className="titulo text-[1.5rem]">
                Filtros
              </h2>
              <button type="button" onClick={() => dialogo.current?.close()} className="-mr-2 inline-flex size-11 items-center justify-center" aria-label="Fechar filtros" data-cat-fechar>
                <IconeFechar />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-6">{grupos("folha")}</div>
            <div className="flex gap-3 border-t border-linha px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <button type="button" hidden={filtrosAtivos === 0} onClick={() => atualizar({ marca: "", carroceria: "" })} className="botao botao-linha flex-1" data-cat-limpar-folha>
                Limpar
              </button>
              <button type="button" onClick={() => dialogo.current?.close()} className="botao botao-cheio flex-[2]" data-cat-fechar>
                <span>
                  Ver <span data-cat-total>{plural(total)}</span>
                </span>
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

function Chip({ nome, filtro, valor, checado, onChange, children }: { nome: string; filtro: string; valor: string; checado: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-linha px-4 text-[0.9375rem] font-medium transition-colors duration-300 hover:border-tx-2 has-[:checked]:border-tx has-[:checked]:bg-tx has-[:checked]:text-fundo has-[:checked]:[&_span]:text-fundo/70 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--foco)]">
      <input type="radio" name={nome} checked={checado} onChange={onChange} className="sr-only" data-cat-filtro={filtro} value={valor} />
      {children}
    </label>
  );
}
