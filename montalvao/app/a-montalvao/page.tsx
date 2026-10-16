import type { Metadata } from "next";
import Link from "next/link";
import { mensagens } from "@/content/loja";
import { Foto } from "@/components/Foto";
import { CtaWhatsApp } from "@/components/CtaWhatsApp";
import { ListaCanais } from "@/components/SecaoContato";

export const metadata: Metadata = {
  title: "A Montalvão",
  description: "Conheça a Montalvão Motors: showroom coberto, iluminação linear e geométrica e atendimento que começa numa conversa.",
  alternates: { canonical: "/a-montalvao/" },
};

const ESPACO = [
  { titulo: "Estrutura coberta", texto: "Os carros ficam expostos sob o mesmo teto, e você olha cada um com calma." },
  { titulo: "Luz linear e em colmeia", texto: "Lâmpadas lineares e uma luminária em colmeia iluminam o salão por cima dos carros." },
  { titulo: "Carros lado a lado", texto: "Dá para comparar modelos diferentes na mesma visita, um ao lado do outro." },
];

export default function PaginaMontalvao() {
  return (
    <>
      <section aria-labelledby="titulo-pagina" className="escuro pb-20 pt-[calc(var(--altura-cabecalho)+4rem)] lg:pb-32 lg:pt-[calc(var(--altura-cabecalho)+6rem)]">
        <div className="envelope">
          <p className="rotulo text-tx-2">A Montalvão</p>
          <h1 id="titulo-pagina" className="display mt-6 max-w-[14ch] text-[clamp(3rem,8vw,7.5rem)]">
            Conheça a Montalvão.
          </h1>
          <div className="grade mt-14 gap-y-10 lg:mt-20">
            <div className="col-span-4 lg:col-span-8" data-revelar>
              <div className="foto-moldura aspect-[4/3]">
                <Foto id="salao" sizes="(min-width: 64rem) 62vw, 100vw" prioridade posicao="50% 45%" />
              </div>
            </div>
            <div className="col-span-4 self-end lg:col-span-3 lg:col-start-10" data-revelar>
              <p className="text-[1.1875rem] leading-relaxed">
                A Montalvão Motors é uma loja de veículos com showroom coberto, iluminação linear e geométrica e carros de vários
                modelos expostos lado a lado.
              </p>
              <p className="mt-5 text-tx-2">Aqui você vê o carro de perto antes de decidir, e a conversa com a equipe vem primeiro.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-espaco" className="claro secao">
        <div className="envelope">
          <div className="grade gap-y-6">
            <div className="col-span-4 lg:col-span-7">
              <p className="rotulo text-tx-2" data-revelar>
                (01) O espaço
              </p>
              <h2 id="titulo-espaco" className="titulo mt-6 text-[clamp(2.5rem,5vw,4.5rem)]" data-revelar>
                Um salão para olhar cada detalhe.
              </h2>
            </div>
          </div>

          <div className="grade mt-14 gap-y-12 lg:mt-20">
            <div className="col-span-4 lg:col-span-7" data-revelar>
              <div className="foto-moldura aspect-[950/520]">
                <Foto id="hexagonos" sizes="(min-width: 64rem) 56vw, 100vw" />
              </div>
            </div>
            <ol className="col-span-4 border-t border-linha lg:col-span-4 lg:col-start-9">
              {ESPACO.map((e, i) => (
                <li key={e.titulo} className="border-b border-linha py-6" data-revelar style={{ "--atraso": i } as React.CSSProperties}>
                  <h3 className="titulo flex items-baseline gap-4 text-[1.5rem]">
                    <span className="rotulo text-acento" aria-hidden="true">
                      0{i + 1}
                    </span>
                    {e.titulo}
                  </h3>
                  <p className="mt-2 text-tx-2">{e.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-atendimento" className="escuro grafite secao">
        <div className="envelope grade items-center gap-y-12">
          <div className="col-span-4 lg:col-span-5">
            <p className="rotulo text-tx-2" data-revelar>
              (02) O atendimento
            </p>
            <h2 id="titulo-atendimento" className="titulo mt-6 text-[clamp(2.5rem,4.6vw,4rem)]" data-revelar>
              Atendimento direto com a equipe.
            </h2>
            <div className="mt-8 grid gap-5 text-[1.125rem] text-tx-2" data-revelar>
              <p className="texto-longo">
                Você conta o que procura, como é a sua rotina e quanto pretende investir. Com isso, fica mais fácil saber quais carros
                da loja valem a sua visita.
              </p>
              <p className="texto-longo">Quando quiser ver um carro, combine o horário com a equipe e venha olhar de perto.</p>
            </div>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap" data-revelar>
              <CtaWhatsApp mensagem={mensagens.geral} rotulo="Conversar com a equipe" />
              <Link href="/veiculos/" className="botao botao-linha">
                Ver veículos <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="col-span-4 grid grid-cols-2 gap-5 lg:col-span-6 lg:col-start-7">
            <div className="foto-moldura aspect-[4/5]" data-revelar>
              <Foto id="laco" sizes="(min-width: 64rem) 24vw, 50vw" />
            </div>
            <div className="foto-moldura mt-16 aspect-[4/5]" data-revelar style={{ "--atraso": 1 } as React.CSSProperties}>
              <Foto id="renault" sizes="(min-width: 64rem) 24vw, 50vw" />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-visita" className="claro papel-2 secao">
        <div className="envelope grade gap-y-12">
          <div className="col-span-4 lg:col-span-5">
            <p className="rotulo text-tx-2" data-revelar>
              (03) Visita
            </p>
            <h2 id="titulo-visita" className="titulo mt-6 text-[clamp(2.5rem,4.6vw,4rem)]" data-revelar>
              Venha conhecer a loja.
            </h2>
            <p className="mt-6 max-w-md text-tx-2" data-revelar>
              Antes de sair de casa, confirme com a equipe se o carro que você quer ver está disponível.
            </p>
            <div className="mt-8" data-revelar>
              <CtaWhatsApp mensagem="Olá! Conheci a Montalvão pelo site e gostaria de combinar uma visita à loja." rotulo="Combinar uma visita" />
            </div>
          </div>
          <div className="col-span-4 lg:col-span-6 lg:col-start-7">
            <ListaCanais />
          </div>
        </div>
      </section>
    </>
  );
}
