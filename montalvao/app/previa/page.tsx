import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loja } from "@/content/loja";
import { faq } from "@/content/faq";
import { veiculos } from "@/content/veiculos";
import { PREVIA } from "@/lib/modo";
import { DOMINIO_CONFIGURADO } from "@/lib/site";
import { numeroWhatsApp } from "@/lib/whatsapp";
import { nomeVeiculo } from "@/lib/veiculos";

export const metadata: Metadata = {
  title: "Pendências da prévia",
  robots: { index: false, follow: false },
};

/** Lista, gerada a partir do conteúdo, do que falta para publicar. Só existe na prévia. */
export default function Previa() {
  if (!PREVIA) notFound();

  const loja_ = [
    { item: "Número de WhatsApp", ok: Boolean(numeroWhatsApp()), efeito: "Ativa todos os botões de conversa, o formulário e o botão flutuante." },
    { item: "Telefone", ok: Boolean(loja.telefone), efeito: "Aparece em Contato e no rodapé." },
    { item: "Instagram da loja", ok: Boolean(loja.instagram), efeito: "Aparece em Contato e no rodapé." },
    { item: "Endereço", ok: Boolean(loja.endereco), efeito: "Aparece em Contato, na página A Montalvão e nos dados estruturados." },
    { item: "Link de rota (Google Maps)", ok: Boolean(loja.mapsUrl), efeito: "Ativa o botão “Como chegar”." },
    { item: "Horário de atendimento", ok: Boolean(loja.horarios?.length), efeito: "Aparece em Contato." },
    { item: "Logo oficial (SVG ou PNG em alta)", ok: Boolean(loja.logoOficial), efeito: "Substitui o wordmark tipográfico provisório." },
    { item: "Domínio do site", ok: DOMINIO_CONFIGURADO, efeito: "Usado no link enviado pelo WhatsApp, no Open Graph e no sitemap." },
    { item: "Revisão da política de privacidade", ok: false, efeito: "Confirmar com a loja o responsável pelos dados e o canal para pedidos da LGPD." },
  ];

  const faqPendente = faq.filter((p) => !p.publicar);

  return (
    <>
      <section className="escuro pb-14 pt-[calc(var(--altura-cabecalho)+4rem)]">
        <div className="envelope">
          <p className="rotulo text-ouro">Só na prévia</p>
          <h1 className="display mt-6 text-[clamp(2.75rem,6vw,5.5rem)]">O que falta para publicar.</h1>
          <p className="mt-6 max-w-2xl text-tx-2">
            Esta página é gerada a partir do conteúdo do site e some na versão pública. Itens com selo “Demonstração” ou
            “Pendente” não aparecem para o público até serem confirmados.
          </p>
        </div>
      </section>
      <section className="claro pb-24 pt-14">
        <div className="envelope grid gap-16">
          <Grupo titulo="Dados da loja" nota="Edite em content/loja.ts.">
            {loja_.map((l) => (
              <Linha key={l.item} ok={l.ok} titulo={l.item} texto={l.efeito} />
            ))}
          </Grupo>

          <Grupo titulo="Veículos" nota="Edite em content/veiculos.ts. Com dados confirmados, troque publicado para true.">
            {veiculos.map((v) => (
              <Linha
                key={v.slug}
                ok={v.publicado}
                titulo={`${nomeVeiculo(v)}${v.modelo ? "" : " (modelo a confirmar)"}`}
                texto={`${v.fonte} Falta: ${v.pendencias.join(", ").toLowerCase()}.`}
                link={`/veiculos/${v.slug}/`}
              />
            ))}
          </Grupo>

          <Grupo titulo="Perguntas frequentes" nota="Edite em content/faq.ts. Com a resposta confirmada, troque publicar para true.">
            {faqPendente.map((p) => (
              <Linha key={p.pergunta} ok={false} titulo={p.pergunta} texto="Resposta comercial depende de confirmação da loja." />
            ))}
          </Grupo>
        </div>
      </section>
    </>
  );
}

function Grupo({ titulo, nota, children }: { titulo: string; nota: string; children: React.ReactNode }) {
  return (
    <div className="grade gap-y-6">
      <div className="col-span-4 lg:col-span-4">
        <h2 className="titulo text-[2rem]">{titulo}</h2>
        <p className="mt-2 text-[0.9375rem] text-tx-2">{nota}</p>
      </div>
      <ul className="col-span-4 border-t border-linha lg:col-span-8">{children}</ul>
    </div>
  );
}

function Linha({ ok, titulo, texto, link }: { ok: boolean; titulo: string; texto: string; link?: string }) {
  return (
    <li className="grid grid-cols-[6.5rem_1fr] gap-4 border-b border-linha py-4">
      <span className={`selo self-start ${ok ? "border border-tx text-tx" : "selo-demo"}`}>{ok ? "Pronto" : "Pendente"}</span>
      <div>
        <p className="font-semibold">{link ? <Link href={link} className="underline decoration-1 underline-offset-4">{titulo}</Link> : titulo}</p>
        <p className="mt-1 text-[0.9375rem] text-tx-2">{texto}</p>
      </div>
    </li>
  );
}
