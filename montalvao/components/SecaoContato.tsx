import { loja, mensagens } from "@/content/loja";
import { PREVIA } from "@/lib/modo";
import { numeroWhatsApp, linkWhatsApp } from "@/lib/whatsapp";
import { urlAbsoluta } from "@/lib/site";
import { veiculosVisiveis, nomeVeiculo } from "@/lib/veiculos";
import { FormularioContato } from "@/components/FormularioContato";
import { SeloPendente } from "@/components/Selos";

function formatarWhatsApp(numero: string) {
  const local = numero.replace(/^55/, "");
  const ddd = local.slice(0, 2);
  const resto = local.slice(2);
  return `(${ddd}) ${resto.slice(0, resto.length - 4)}-${resto.slice(-4)}`;
}

type Canal = { rotulo: string; conteudo: React.ReactNode | null };

export function canaisDaLoja(): Canal[] {
  const numero = numeroWhatsApp();
  const wa = linkWhatsApp(mensagens.geral);
  return [
    {
      rotulo: "WhatsApp",
      conteudo: numero && wa ? (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="link-seta">
          {formatarWhatsApp(numero)} <span className="seta" aria-hidden="true">↗</span>
        </a>
      ) : null,
    },
    {
      rotulo: "Telefone",
      conteudo: loja.telefone ? (
        <a href={`tel:+55${loja.telefone.replace(/\D/g, "")}`} className="link-seta">
          {loja.telefone}
        </a>
      ) : null,
    },
    {
      rotulo: "Instagram",
      conteudo: loja.instagram ? (
        <a href={`https://www.instagram.com/${loja.instagram}/`} target="_blank" rel="noopener noreferrer" className="link-seta">
          @{loja.instagram} <span className="seta" aria-hidden="true">↗</span>
        </a>
      ) : null,
    },
    {
      rotulo: "Endereço",
      conteudo: loja.endereco ? (
        <span className="flex flex-col items-start gap-1">
          <span>
            {loja.endereco.logradouro} · {loja.endereco.bairro}
            <br />
            {loja.endereco.cidade}/{loja.endereco.uf}
            {loja.endereco.cep ? ` · CEP ${loja.endereco.cep}` : ""}
          </span>
          {loja.mapsUrl && (
            <a href={loja.mapsUrl} target="_blank" rel="noopener noreferrer" className="link-seta text-acento">
              Como chegar <span className="seta" aria-hidden="true">↗</span>
            </a>
          )}
        </span>
      ) : null,
    },
    {
      rotulo: "Horário",
      conteudo: loja.horarios?.length ? (
        <span className="flex flex-col">
          {loja.horarios.map((h) => (
            <span key={h.dias}>
              {h.dias}: {h.horas}
            </span>
          ))}
        </span>
      ) : null,
    },
  ];
}

export function ListaCanais({ className = "" }: { className?: string }) {
  const canais = canaisDaLoja().filter((c) => PREVIA || c.conteudo);
  if (!canais.length) {
    return <p className={`text-tx-2 ${className}`}>Os canais de atendimento estão sendo atualizados.</p>;
  }
  return (
    <dl className={`border-t border-linha ${className}`}>
      {canais.map((c) => (
        <div key={c.rotulo} className="grid grid-cols-[7rem_1fr] items-baseline gap-4 border-b border-linha py-4 sm:grid-cols-[9rem_1fr]">
          <dt className="rotulo text-tx-2">{c.rotulo}</dt>
          <dd className="min-w-0 text-[1.0625rem]">{c.conteudo ?? <SeloPendente texto="Pendente" />}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SecaoContato({ indice = "08" }: { indice?: string }) {
  const numero = numeroWhatsApp();
  const mostrarFormulario = Boolean(numero) || PREVIA;
  const opcoes = veiculosVisiveis
    .filter((v) => v.modelo)
    .map((v) => ({ valor: v.slug, rotulo: nomeVeiculo(v), url: urlAbsoluta(`/veiculos/${v.slug}/`) }));

  return (
    <section id="contato" aria-labelledby="titulo-contato" className="escuro grafite secao">
      <div className="envelope grade gap-y-14">
        <div className="col-span-4 lg:col-span-5">
          <p className="rotulo text-tx-2" data-revelar>
            ({indice}) Contato
          </p>
          <h2 id="titulo-contato" className="titulo mt-6 text-[clamp(2.5rem,5.4vw,4.75rem)]" data-revelar>
            Fale com a Montalvão.
          </h2>
          <p className="texto-longo mt-6 text-[1.125rem] text-tx-2" data-revelar>
            Conte o que você procura, tire suas dúvidas sobre um veículo e combine o melhor momento para conhecer a loja.
          </p>
          <ListaCanais className="mt-12" />
        </div>

        <div className="col-span-4 lg:col-span-6 lg:col-start-7">
          {mostrarFormulario ? (
            <div className="border-t border-linha pt-8 lg:border-t-0 lg:pt-0">
              <h3 className="titulo text-[1.75rem]">Começar a conversa</h3>
              <p className="mb-8 mt-3 text-tx-2">Preencha o essencial. O resto você conversa direto com a equipe.</p>
              <FormularioContato numero={numero} veiculos={opcoes} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
