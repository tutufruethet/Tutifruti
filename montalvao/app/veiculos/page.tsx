import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { mensagens } from "@/content/loja";
import { PREVIA } from "@/lib/modo";
import { veiculosVisiveis, contarPor, nomeVeiculo, rotuloCarroceria, ano } from "@/lib/veiculos";
import { Catalogo, type ItemCatalogo } from "@/components/Catalogo";
import { CartaoVeiculo } from "@/components/CartaoVeiculo";
import { CtaWhatsApp } from "@/components/CtaWhatsApp";

export const metadata: Metadata = {
  title: "Veículos",
  description: "Veja os veículos da Montalvão Motors, com fotos feitas na loja. Busque por marca ou modelo e fale com a equipe.",
  alternates: { canonical: "/veiculos/" },
};

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function PaginaVeiculos() {
  const lista = veiculosVisiveis;
  const itens: ItemCatalogo[] = lista.map((v, i) => {
    const a = ano(v);
    return {
      slug: v.slug,
      marca: v.marca,
      busca: normalizar(nomeVeiculo(v)),
      carroceria: v.carroceria,
      preco: v.preco,
      ano: v.anoModelo ?? v.anoFabricacao ?? (typeof a === "number" ? a : null),
      ordem: i,
    };
  });

  const sizes = "(min-width: 80rem) 24vw, (min-width: 40rem) 46vw, 100vw";
  const cards = Object.fromEntries(lista.map((v, i) => [v.slug, <CartaoVeiculo key={v.slug} v={v} sizes={sizes} nivelTitulo="h2" prioridade={i < 2} />]));

  const marcas = contarPor(lista, (v) => v.marca).map(([valor, quantidade]) => ({ valor, rotulo: valor, quantidade }));
  const carrocerias = contarPor(lista, (v) => v.carroceria).map(([valor, quantidade]) => ({
    valor,
    rotulo: rotuloCarroceria[valor].singular,
    quantidade,
  }));

  // Ordenação só aparece quando o campo existe em pelo menos dois veículos.
  const ordenacoes = [
    ...(itens.filter((i) => i.preco != null).length >= 2
      ? [
          { valor: "menor-preco", rotulo: "Menor preço" },
          { valor: "maior-preco", rotulo: "Maior preço" },
        ]
      : []),
    ...(itens.filter((i) => i.ano != null).length >= 2
      ? [
          { valor: "mais-novo", rotulo: "Mais novo" },
          { valor: "mais-antigo", rotulo: "Mais antigo" },
        ]
      : []),
  ];

  const vazio = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <CtaWhatsApp mensagem={mensagens.geral} rotulo="Contar o que procuro" />
      <Link href="/#contato" className="botao botao-linha">
        Ver contatos
      </Link>
    </div>
  );

  return (
    <>
      <section aria-labelledby="titulo-veiculos" className="escuro pb-14 pt-[calc(var(--altura-cabecalho)+4rem)] lg:pb-20 lg:pt-[calc(var(--altura-cabecalho)+6rem)]">
        <div className="envelope grade items-end gap-y-6">
          <div className="col-span-4 lg:col-span-7">
            <p className="rotulo text-tx-2">Catálogo</p>
            <h1 id="titulo-veiculos" className="display mt-6 text-[clamp(3rem,8vw,7rem)]">
              Veículos.
            </h1>
          </div>
          <div className="col-span-4 lg:col-span-4 lg:col-start-9">
            <p className="text-tx-2">
              Fotos feitas na própria loja. Antes de ir até lá, confirme com a equipe se o veículo continua disponível.
            </p>
            {PREVIA && lista.some((v) => !v.publicado) && (
              <p className="mt-4 border-l-2 border-acento pl-4 text-[0.9375rem] text-tx-2">
                <strong className="text-tx">Prévia:</strong> os itens com selo “Demonstração” não aparecem no site público.
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Lista de veículos" className="claro pb-24 pt-10 lg:pb-32 lg:pt-14">
        <div className="envelope">
          {lista.length ? (
            <Suspense
              fallback={
                <ul className="grid gap-x-5 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
                  {lista.map((v) => (
                    <li key={v.slug}>{cards[v.slug]}</li>
                  ))}
                </ul>
              }
            >
              <Catalogo itens={itens} cards={cards} marcas={marcas} carrocerias={carrocerias} ordenacoes={ordenacoes} vazio={vazio} />
            </Suspense>
          ) : (
            <div className="max-w-2xl py-10">
              <p className="titulo text-[2rem]">O catálogo está sendo atualizado.</p>
              <p className="mt-3 text-tx-2">Fale com a equipe para saber quais veículos estão na loja hoje.</p>
              <div className="mt-6">{vazio}</div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
