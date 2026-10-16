import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { mensagens } from "@/content/loja";
import { PREVIA } from "@/lib/modo";
import { urlAbsoluta, SITE_URL } from "@/lib/site";
import { linkWhatsApp } from "@/lib/whatsapp";
import { foto, srcFoto } from "@/lib/midia";
import {
  veiculosVisiveis,
  buscarVeiculo,
  nomeVeiculo,
  fichaTecnica,
  precoOuConsulta,
  sugestoes,
  ehDemonstracao,
  ano,
  rotuloCarroceria,
  type Veiculo,
} from "@/lib/veiculos";
import { Galeria } from "@/components/Galeria";
import { CtaWhatsApp } from "@/components/CtaWhatsApp";
import { CartaoVeiculo } from "@/components/CartaoVeiculo";
import { BarraInteresse } from "@/components/BarraInteresse";
import { SeloDemo, SeloPendente } from "@/components/Selos";

export const dynamicParams = false;

// Sem veículos visíveis (ex.: build público antes de confirmar o estoque), gera só uma página 404 de reserva,
// porque o export estático exige ao menos um parâmetro.
const RESERVA = "_sem-veiculos";

export function generateStaticParams() {
  return veiculosVisiveis.length ? veiculosVisiveis.map((v) => ({ slug: v.slug })) : [{ slug: RESERVA }];
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const v = buscarVeiculo(slug);
  if (!v) return { title: "Veículo não encontrado", robots: { index: false } };
  const nome = nomeVeiculo(v);
  const partes = [ano(v), v.preco != null ? precoOuConsulta(v) : null].filter(Boolean).join(" · ");
  const descricao = `${nome}${partes ? ` (${partes})` : ""} na Montalvão Motors. Veja as fotos e fale com a equipe para consultar disponibilidade e condições.`;
  const capa = foto(v.fotos[0]);
  return {
    title: nome,
    description: descricao,
    alternates: { canonical: `/veiculos/${v.slug}/` },
    openGraph: {
      title: `${nome} · Montalvão Motors`,
      description: descricao,
      images: [{ url: srcFoto(v.fotos[0], capa.larguras[capa.larguras.length - 1], "webp"), width: capa.largura, height: capa.altura, alt: capa.alt }],
    },
    // Demonstração nunca é indexada, mesmo que o modo mude por engano.
    robots: ehDemonstracao(v) ? { index: false, follow: false } : undefined,
  };
}

function dadosEstruturados(v: Veiculo, url: string) {
  const dados: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: nomeVeiculo(v),
    url,
    brand: { "@type": "Brand", name: v.marca },
    image: v.fotos.map((id) => `${SITE_URL}${srcFoto(id, foto(id).larguras.at(-1)!, "webp")}`),
  };
  if (v.modelo) dados.model = v.modelo;
  if (v.anoModelo) dados.vehicleModelDate = String(v.anoModelo);
  if (v.km != null) dados.mileageFromOdometer = { "@type": "QuantitativeValue", value: v.km, unitCode: "KMT" };
  if (v.cambio) dados.vehicleTransmission = v.cambio;
  if (v.combustivel) dados.fuelType = v.combustivel;
  if (v.cor) dados.color = v.cor;
  if (v.carroceria) dados.bodyType = rotuloCarroceria[v.carroceria].singular;
  // Oferta só com preço confirmado e disponibilidade confirmada.
  if (v.preco != null && v.situacao === "disponivel") {
    dados.offers = { "@type": "Offer", price: v.preco, priceCurrency: "BRL", availability: "https://schema.org/InStock", url };
  }
  return dados;
}

export default async function PaginaVeiculo({ params }: Params) {
  const { slug } = await params;
  const v = buscarVeiculo(slug);
  if (!v) notFound();

  const nome = nomeVeiculo(v);
  const url = urlAbsoluta(`/veiculos/${v.slug}/`);
  const linkInteresse = linkWhatsApp(mensagens.veiculo(nome, url));
  const ficha = fichaTecnica(v).filter((l) => PREVIA || l.valor);
  const outros = sugestoes(v);
  const demo = ehDemonstracao(v);
  const linhaApoio = [v.versao, ano(v)].filter(Boolean).join(" · ");

  const fotos = v.fotos.map((id) => {
    const info = foto(id);
    return {
      id,
      alt: info.alt,
      largura: info.largura,
      altura: info.altura,
      cor: info.cor,
      avif: info.larguras.map((l) => `${srcFoto(id, l, "avif")} ${l}w`).join(", "),
      webp: info.larguras.map((l) => `${srcFoto(id, l, "webp")} ${l}w`).join(", "),
      src: srcFoto(id, info.larguras.at(-1)!, "webp"),
    };
  });

  return (
    <>
      <section aria-labelledby="titulo-veiculo" className="escuro pb-16 pt-[calc(var(--altura-cabecalho)+1.5rem)] lg:pb-24 lg:pt-[calc(var(--altura-cabecalho)+2.5rem)]">
        <div className="envelope">
          <nav aria-label="Você está em" className="text-[0.9375rem] text-tx-2">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/veiculos/" className="link-seta min-h-0 py-2">
                  Veículos
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-tx">
                {nome}
              </li>
            </ol>
          </nav>

          {demo && PREVIA && (
            <div className="mt-6 flex flex-col gap-2 border border-dashed border-ouro/70 p-4 text-[0.9375rem] sm:flex-row sm:items-start sm:gap-4">
              <SeloDemo className="self-start" />
              <p className="text-tx-2">
                <strong className="text-tx">Não será publicado até a loja confirmar.</strong> Origem dos dados: {v.fonte}
                {v.pendencias.length > 0 && <> Falta confirmar: {v.pendencias.join(", ").toLowerCase()}.</>}
              </p>
            </div>
          )}

          <div className="grade mt-8 gap-y-10 lg:mt-10">
            <div className="col-span-4 lg:col-span-7">
              <Galeria fotos={fotos} nome={nome} />
            </div>

            <div className="col-span-4 lg:col-span-4 lg:col-start-9">
              <div className="lg:sticky lg:top-[calc(var(--altura-cabecalho)+2rem)]">
                <p className="rotulo text-tx-2">{v.marca}</p>
                <h1 id="titulo-veiculo" className="display mt-4 text-[clamp(2.75rem,5vw,4.5rem)]">
                  {v.modelo ? (
                    <>
                      <span className="sr-only">{v.marca} </span>
                      {v.modelo}
                    </>
                  ) : (
                    v.marca
                  )}
                </h1>
                {linhaApoio && <p className="mt-3 text-[1.1875rem] text-tx-2">{linhaApoio}</p>}
                {!v.modelo && <p className="mt-3 text-[1.1875rem] text-tx-2">Modelo e versão a confirmar</p>}

                <div className="mt-8 border-y border-linha py-6">
                  <p className="rotulo text-tx-2">{v.preco != null ? "Preço" : "Valor"}</p>
                  <p className={v.preco != null ? "titulo mt-2 text-[2.5rem] tabular-nums" : "titulo mt-2 text-[1.75rem]"}>{precoOuConsulta(v)}</p>
                  <p className="mt-2 text-[0.9375rem] text-tx-2">Disponibilidade e condições confirmadas no atendimento.</p>
                </div>

                <div id="acoes-veiculo" className="mt-8 flex flex-col gap-3">
                  <CtaWhatsApp mensagem={mensagens.veiculo(nome, url)} rotulo="Tenho interesse neste veículo" className="w-full" />
                  <CtaWhatsApp mensagem={mensagens.visitaVeiculo(nome, url)} rotulo="Combinar uma visita" variante="linha" className="w-full" />
                  {!linkInteresse && !PREVIA && (
                    <Link href="/#contato" className="botao botao-cheio w-full">
                      Falar com a Montalvão
                    </Link>
                  )}
                </div>

                {PREVIA && !linkInteresse && (
                  <details className="pergunta mt-6 text-[0.9375rem] text-tx-2">
                    <summary className="flex min-h-11 items-center gap-2 font-semibold text-tx">
                      <span className="sinal text-acento" aria-hidden="true">
                        +
                      </span>
                      Ver a mensagem que o botão vai enviar
                    </summary>
                    <p className="mt-2 border-l-2 border-acento pl-4">{mensagens.veiculo(nome, url)}</p>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-ficha" className="claro secao">
        <div className="envelope grade gap-y-10">
          <div className="col-span-4 lg:col-span-4">
            <p className="rotulo text-tx-2">Ficha técnica</p>
            <h2 id="titulo-ficha" className="titulo mt-6 text-[clamp(2.25rem,4vw,3.5rem)]">
              Informações do veículo.
            </h2>
            <p className="mt-6 max-w-sm text-tx-2">Só mostramos o que foi confirmado. Ficou alguma dúvida? Pergunte à equipe.</p>
          </div>
          <dl className="col-span-4 border-t border-linha lg:col-span-7 lg:col-start-6">
            {ficha.map((l) => (
              <div key={l.rotulo} className="grid grid-cols-2 gap-4 border-b border-linha py-4 sm:grid-cols-[14rem_1fr]">
                <dt className="text-tx-2">{l.rotulo}</dt>
                <dd className="font-semibold">{l.valor ?? <SeloPendente texto="A confirmar" />}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {outros.length > 0 && (
        <section aria-labelledby="titulo-outros" className="claro papel-2 secao">
          <div className="envelope">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 id="titulo-outros" className="titulo text-[clamp(2.25rem,4vw,3.5rem)]">
                Outros veículos.
              </h2>
              <Link href="/veiculos/" className="link-seta">
                Ver catálogo completo <span className="seta" aria-hidden="true">→</span>
              </Link>
            </div>
            <ul className="mt-12 grid gap-x-5 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
              {outros.map((o) => (
                <li key={o.slug}>
                  <CartaoVeiculo v={o} sizes="(min-width: 64rem) 30vw, (min-width: 40rem) 46vw, 100vw" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {linkInteresse && <BarraInteresse href={linkInteresse} nome={nome} preco={precoOuConsulta(v)} alvoId="acoes-veiculo" />}

      {!demo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados(v, url)).replace(/</g, "\\u003c") }}
        />
      )}
    </>
  );
}
