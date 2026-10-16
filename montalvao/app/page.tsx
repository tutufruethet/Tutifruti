import Link from "next/link";
import { loja, mensagens } from "@/content/loja";
import { faq } from "@/content/faq";
import { PREVIA } from "@/lib/modo";
import { SITE_URL } from "@/lib/site";
import { numeroWhatsApp } from "@/lib/whatsapp";
import { veiculosVisiveis, rotuloCarroceria, type Carroceria } from "@/lib/veiculos";
import { Abertura } from "@/components/Abertura";
import { CartaoVeiculo } from "@/components/CartaoVeiculo";
import { CtaWhatsApp } from "@/components/CtaWhatsApp";
import { Foto } from "@/components/Foto";
import { SecaoContato } from "@/components/SecaoContato";

export default function Inicio() {
  return (
    <>
      <Abertura ctaSecundario={<CtaWhatsApp mensagem={mensagens.geral} rotulo="Conversar no WhatsApp" variante="linha" />} />
      <Destaques />
      <AMontalvao />
      <Rotina />
      <Passos />
      <Showroom />
      <Duvidas />
      <SecaoContato indice="07" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados()).replace(/</g, "\\u003c") }}
      />
    </>
  );
}

/** Só com dados confirmados: nome e site sempre; endereço e telefone quando existirem. */
function dadosEstruturados() {
  const dados: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: loja.nome,
    url: SITE_URL,
    image: `${SITE_URL}/midia/og.jpg`,
  };
  if (loja.telefone) dados.telephone = loja.telefone;
  if (loja.endereco)
    dados.address = {
      "@type": "PostalAddress",
      streetAddress: loja.endereco.logradouro,
      addressLocality: loja.endereco.cidade,
      addressRegion: loja.endereco.uf,
      postalCode: loja.endereco.cep,
      addressCountry: "BR",
    };
  if (loja.instagram) dados.sameAs = [`https://www.instagram.com/${loja.instagram}/`];
  return dados;
}

function Rotulo({ indice, children }: { indice: string; children: React.ReactNode }) {
  return (
    <p className="rotulo text-tx-2" data-revelar>
      ({indice}) {children}
    </p>
  );
}

/* (01) Veículos em destaque */
function Destaques() {
  const destaques = veiculosVisiveis.filter((v) => v.destaque).slice(0, 3);
  const temDemo = destaques.some((v) => !v.publicado);
  const [principal, ...outros] = destaques;
  return (
    <section aria-labelledby="titulo-destaques" className="claro secao">
      <div className="envelope grade gap-y-14 lg:gap-y-16">
        <div className="col-span-4 lg:col-span-5 lg:col-start-8 lg:row-start-1">
          <Rotulo indice="01">Em destaque</Rotulo>
          <h2 id="titulo-destaques" className="titulo mt-6 text-[clamp(2.5rem,5vw,4.5rem)]" data-revelar>
            Veículos em destaque.
          </h2>
          <p className="mt-6 max-w-md text-tx-2" data-revelar>
            Fotos feitas na própria loja. O estoque muda, então confirme a disponibilidade com a equipe antes da visita.
          </p>
          {veiculosVisiveis.length > 0 && (
            <div className="mt-4" data-revelar>
              <Link href="/veiculos/" className="link-seta">
                Ver todos os veículos ({veiculosVisiveis.length}) <span className="seta" aria-hidden="true">→</span>
              </Link>
            </div>
          )}
          {PREVIA && temDemo && (
            <p className="mt-8 max-w-md border-l-2 border-acento pl-4 text-[0.9375rem] text-tx-2">
              <strong className="text-tx">Prévia:</strong> veículos de demonstração montados com fotos e tarjas de posts da loja.
              Disponibilidade, preço e ficha precisam ser confirmados antes de publicar.
            </p>
          )}
        </div>

        {principal ? (
          <>
            <CartaoVeiculo
              v={principal}
              grande
              sizes="(min-width: 64rem) 46vw, 100vw"
              className="col-span-4 lg:col-span-6 lg:col-start-1 lg:row-span-2 lg:row-start-1"
            />
            {outros.length > 0 && (
              <div className="col-span-4 grid items-start gap-x-5 gap-y-14 md:grid-cols-2 lg:col-span-6 lg:col-start-7 lg:row-start-2 lg:self-end">
                {outros.map((v) => (
                  <CartaoVeiculo key={v.slug} v={v} sizes="(min-width: 64rem) 22vw, (min-width: 48rem) 46vw, 100vw" />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="col-span-4 border-t border-linha pt-10 lg:col-span-6 lg:row-start-1">
            <p className="titulo text-[1.75rem]">O catálogo está sendo atualizado.</p>
            <p className="mt-3 max-w-xl text-tx-2">Fale com a equipe para saber quais veículos estão na loja hoje.</p>
            <div className="mt-6">
              <CtaWhatsApp mensagem={mensagens.geral} rotulo="Perguntar à equipe" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* (02) A Montalvão */
function AMontalvao() {
  return (
    <section aria-labelledby="titulo-montalvao" className="escuro grafite secao overflow-hidden">
      <div className="envelope grade items-center gap-y-12">
        <div className="col-span-4 lg:col-span-6" data-revelar>
          <div className="foto-moldura aspect-[4/5]">
            <Foto id="hyundai" sizes="(min-width: 64rem) 46vw, 100vw" />
          </div>
        </div>
        <div className="col-span-4 lg:col-span-5 lg:col-start-8">
          <Rotulo indice="02">A Montalvão</Rotulo>
          <h2 id="titulo-montalvao" className="titulo mt-6 text-[clamp(2.5rem,4.8vw,4.25rem)]" data-revelar>
            Uma loja para ver o carro de perto.
          </h2>
          <div className="mt-8 grid gap-5 text-[1.125rem] text-tx-2" data-revelar>
            <p className="texto-longo">
              A Montalvão Motors recebe você num showroom coberto e bem iluminado, com os carros lado a lado para comparar com calma.
            </p>
            <p className="texto-longo">
              O atendimento começa numa conversa: você conta o que procura, tira as dúvidas e combina a hora de ver o carro pessoalmente.
            </p>
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap" data-revelar>
            <Link href="/a-montalvao/" className="botao botao-cheio">
              Conhecer a Montalvão <span aria-hidden="true">→</span>
            </Link>
            <CtaWhatsApp mensagem={mensagens.geral} rotulo="Falar com a equipe" variante="linha" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* (03) Uma escolha para sua rotina */
const ROTINA: { titulo: string; texto: string; carroceria: Carroceria }[] = [
  { titulo: "Praticidade no dia a dia", texto: "Para a rotina na cidade, comece pelos hatches.", carroceria: "hatch" },
  { titulo: "Espaço para a família", texto: "Mais lugar para passageiros e bagagem: veja os SUVs.", carroceria: "suv" },
  { titulo: "Conforto para viajar", texto: "Para pegar estrada, os sedãs são um bom ponto de partida.", carroceria: "seda" },
];

function Rotina() {
  // Sem veículos no site, a seção só levaria a listas vazias.
  if (!veiculosVisiveis.length) return null;
  return (
    <section aria-labelledby="titulo-rotina" className="claro secao">
      <div className="envelope grade gap-y-12">
        <div className="col-span-4 lg:col-span-4">
          <Rotulo indice="03">Para sua rotina</Rotulo>
          <h2 id="titulo-rotina" className="titulo mt-6 text-[clamp(2.5rem,4.6vw,4rem)]" data-revelar>
            Comece pelo que você precisa.
          </h2>
        </div>
        <ul className="col-span-4 border-t border-linha lg:col-span-7 lg:col-start-6">
          {ROTINA.map((r, i) => {
            const quantidade = veiculosVisiveis.filter((v) => v.carroceria === r.carroceria).length;
            const rotulo = rotuloCarroceria[r.carroceria].noMeioDaFrase;
            return (
              <li key={r.carroceria} className="group relative border-b border-linha" data-revelar style={{ "--atraso": i } as React.CSSProperties}>
                <div className="grid gap-3 py-8 transition-[padding] duration-700 ease-expo sm:grid-cols-[1fr_auto] sm:items-end sm:gap-8 lg:py-10 lg:group-hover:pl-3">
                  <div>
                    <h3 className="titulo text-[clamp(1.625rem,2.6vw,2.25rem)]">{r.titulo}</h3>
                    <p className="mt-2 text-tx-2">{r.texto}</p>
                  </div>
                  {quantidade > 0 ? (
                    <Link
                      href={`/veiculos/?carroceria=${r.carroceria}`}
                      className="link-seta after:absolute after:inset-0 after:content-['']"
                    >
                      Ver {rotulo} ({quantidade}) <span className="seta" aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <span className="flex flex-col items-start gap-1 sm:items-end">
                      <span className="text-[0.9375rem] text-tx-2">Nenhum {rotuloCarroceria[r.carroceria].singular === "SUV" ? "SUV" : rotuloCarroceria[r.carroceria].singular.toLowerCase()} no site agora.</span>
                      <Link href="/#contato" className="link-seta">
                        Perguntar à equipe <span className="seta" aria-hidden="true">→</span>
                      </Link>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* (04) Como seguir com o atendimento */
const PASSOS = [
  { titulo: "Explore os veículos", texto: "Veja as fotos e as informações de cada carro aqui no site, no seu tempo." },
  { titulo: "Tire suas dúvidas", texto: "Fale com a equipe e pergunte o que quiser sobre o veículo que chamou sua atenção." },
  { titulo: "Combine uma visita", texto: "Marque o melhor momento para ver o carro de perto, na loja." },
];

function Passos() {
  return (
    <section aria-labelledby="titulo-passos" className="escuro secao">
      <div className="envelope">
        <div className="grade gap-y-6">
          <div className="col-span-4 lg:col-span-7">
            <Rotulo indice="04">Como funciona</Rotulo>
            <h2 id="titulo-passos" className="titulo mt-6 text-[clamp(2.5rem,5vw,4.5rem)]" data-revelar>
              Três passos até a sua visita.
            </h2>
          </div>
        </div>
        <ol className="mt-16 grid gap-x-5 gap-y-12 lg:mt-24 lg:grid-cols-3">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="border-t border-linha pt-6" data-revelar style={{ "--atraso": i } as React.CSSProperties}>
              <span className="titulo block text-[clamp(3rem,6vw,5.5rem)] text-ouro" aria-hidden="true">
                0{i + 1}
              </span>
              <h3 className="titulo mt-6 text-[1.75rem]">{p.titulo}</h3>
              <p className="mt-3 max-w-[22rem] text-tx-2">{p.texto}</p>
            </li>
          ))}
        </ol>
        <div className="mt-16 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:mt-20" data-revelar>
          <Link href="/veiculos/" className="botao botao-cheio">
            Explorar veículos <span aria-hidden="true">→</span>
          </Link>
          <CtaWhatsApp mensagem={mensagens.geral} rotulo="Tirar uma dúvida" variante="linha" />
        </div>
      </div>
    </section>
  );
}

/* (05) Conheça o showroom */
function Showroom() {
  return (
    <section aria-labelledby="titulo-showroom" className="claro secao">
      <div className="envelope">
        <div className="grade items-end gap-y-6">
          <div className="col-span-4 lg:col-span-7">
            <Rotulo indice="05">Showroom</Rotulo>
            <h2 id="titulo-showroom" className="titulo mt-6 text-[clamp(2.5rem,5.4vw,4.75rem)]" data-revelar>
              Conheça o showroom.
            </h2>
          </div>
          <p className="col-span-4 text-tx-2 lg:col-span-4 lg:col-start-9" data-revelar>
            Estrutura coberta, luz linear no teto, uma luminária em colmeia e os carros expostos lado a lado.
          </p>
        </div>

        <div className="grade mt-14 gap-y-5 lg:mt-20">
          <figure className="col-span-4 lg:col-span-7 lg:row-span-2" data-revelar>
            <div className="foto-moldura aspect-[948/935]">
              <Foto id="salao" sizes="(min-width: 64rem) 56vw, 100vw" />
            </div>
            <figcaption className="rotulo mt-3 text-tx-2">Salão de exposição</figcaption>
          </figure>
          <figure className="col-span-4 lg:col-span-5" data-revelar style={{ "--atraso": 1 } as React.CSSProperties}>
            <div className="foto-moldura aspect-[950/520]">
              <Foto id="hexagonos" sizes="(min-width: 64rem) 40vw, 100vw" />
            </div>
            <figcaption className="rotulo mt-3 text-tx-2">Luminária em colmeia</figcaption>
          </figure>
          <figure className="col-span-3 col-start-2 lg:col-span-3 lg:col-start-10" data-revelar style={{ "--atraso": 2 } as React.CSSProperties}>
            <div className="foto-moldura aspect-[4/5]">
              <Foto id="laco" sizes="(min-width: 64rem) 24vw, 75vw" />
            </div>
            <figcaption className="rotulo mt-3 text-tx-2">Dia a dia na loja</figcaption>
          </figure>
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4" data-revelar>
          <Link href="/a-montalvao/" className="link-seta">
            Mais sobre o espaço <span className="seta" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* (06) Dúvidas frequentes */
function Duvidas() {
  const temWhatsApp = Boolean(numeroWhatsApp());
  const perguntas = faq.filter((p) => (p.requer === "whatsapp" && !temWhatsApp ? PREVIA : true)).filter((p) => PREVIA || p.publicar);
  return (
    <section aria-labelledby="titulo-duvidas" className="claro papel-2 secao">
      <div className="envelope grade gap-y-12">
        <div className="col-span-4 lg:col-span-4">
          <Rotulo indice="06">Dúvidas</Rotulo>
          <h2 id="titulo-duvidas" className="titulo mt-6 text-[clamp(2.5rem,4.6vw,4rem)]" data-revelar>
            Dúvidas frequentes.
          </h2>
          <p className="mt-6 text-tx-2" data-revelar>
            Não encontrou sua pergunta?{" "}
            <Link href="/#contato" className="font-semibold text-tx underline decoration-1 underline-offset-4">
              Fale com a equipe
            </Link>
            .
          </p>
        </div>
        <div className="col-span-4 border-t border-linha lg:col-span-7 lg:col-start-6">
          {perguntas.map((p) => {
            const pendente = !p.publicar || (p.requer === "whatsapp" && !temWhatsApp);
            return (
              <details key={p.pergunta} className="pergunta border-b border-linha">
                <summary className="flex min-h-11 items-start justify-between gap-6 py-6 text-[1.1875rem] font-semibold leading-snug">
                  <span>
                    {p.pergunta}
                    {pendente && <span className="selo selo-pendente ml-3 align-middle">Pendente</span>}
                  </span>
                  <span className="sinal mt-0.5 text-[1.5rem] font-normal leading-none text-acento" aria-hidden="true">
                    +
                  </span>
                </summary>
                <div className="pb-7 pr-10 text-tx-2">
                  <p className="texto-longo">{p.resposta}</p>
                  {pendente && (
                    <p className="mt-3 text-[0.9375rem] text-acento">
                      {p.publicar ? "Depende do número de WhatsApp: só aparece no site público quando ele estiver configurado." : "Não aparece no site público até a loja confirmar a resposta."}
                    </p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
