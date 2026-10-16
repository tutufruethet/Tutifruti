import type { Metadata } from "next";
import Link from "next/link";
import { loja } from "@/content/loja";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o site da Montalvão Motors trata as informações de quem o visita.",
  alternates: { canonical: "/privacidade/" },
};

// Texto ajustado ao que o site faz hoje: sem cookies, sem rastreamento e sem servidor de formulário.
// Se entrar analytics, pixel, chat ou formulário com envio, esta página precisa ser revista.
export default function Privacidade() {
  return (
    <>
      <section className="escuro pb-14 pt-[calc(var(--altura-cabecalho)+4rem)] lg:pt-[calc(var(--altura-cabecalho)+6rem)]">
        <div className="envelope">
          <p className="rotulo text-tx-2">Privacidade</p>
          <h1 className="display mt-6 text-[clamp(2.75rem,6vw,5.5rem)]">Política de privacidade.</h1>
        </div>
      </section>
      <section className="claro pb-24 pt-14 lg:pb-32">
        <div className="envelope grade">
          <div className="col-span-4 grid gap-10 text-[1.0625rem] lg:col-span-7 lg:col-start-3">
            <Bloco titulo="O que este site coleta">
              <p>
                O site da {loja.nome} não usa cookies, não tem ferramentas de rastreamento ou estatística e não guarda o que você
                escreve.
              </p>
              <p>
                Como acontece com qualquer site, o serviço de hospedagem pode registrar dados técnicos de acesso, como endereço IP e
                navegador, por segurança e funcionamento.
              </p>
            </Bloco>
            <Bloco titulo="Formulário de contato">
              <p>
                O formulário só monta uma mensagem no seu próprio aparelho e abre o WhatsApp com esse texto. Nada é enviado para um
                servidor do site. A mensagem só chega à loja se você decidir enviá-la no WhatsApp.
              </p>
              <p>A partir daí, a conversa acontece no WhatsApp e segue as regras de privacidade do próprio aplicativo.</p>
            </Bloco>
            <Bloco titulo="Links externos">
              <p>
                Botões de WhatsApp, Instagram ou mapas levam a serviços de outras empresas, que têm as próprias políticas de
                privacidade.
              </p>
            </Bloco>
            <Bloco titulo="Seus direitos">
              <p>
                Pela Lei Geral de Proteção de Dados (LGPD), você pode pedir à loja informações sobre os dados que ela tenha a seu
                respeito, além de correção ou exclusão. Use os{" "}
                <Link href="/#contato" className="font-semibold underline decoration-1 underline-offset-4">
                  canais de contato
                </Link>
                .
              </p>
            </Bloco>
          </div>
        </div>
      </section>
    </>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-linha pt-6">
      <h2 className="titulo text-[1.75rem]">{titulo}</h2>
      <div className="mt-4 grid gap-4 text-tx-2">{children}</div>
    </div>
  );
}
