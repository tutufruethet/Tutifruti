import Link from "next/link";
import { loja } from "@/content/loja";
import { PREVIA } from "@/lib/modo";
import { Wordmark } from "@/components/Wordmark";
import { canaisDaLoja } from "@/components/SecaoContato";

const NAV = [
  { href: "/", rotulo: "Início" },
  { href: "/veiculos/", rotulo: "Veículos" },
  { href: "/a-montalvao/", rotulo: "A Montalvão" },
  { href: "/#contato", rotulo: "Contato" },
];

export function Rodape() {
  const canais = canaisDaLoja().filter((c) => c.conteudo);
  return (
    <footer className="escuro overflow-hidden border-t border-linha pb-[max(2rem,env(safe-area-inset-bottom))] pt-20">
      <div className="envelope grade gap-y-12">
        <nav aria-label="Rodapé" className="col-span-2 lg:col-span-3">
          <p className="rotulo text-tx-2">Navegação</p>
          <ul className="mt-4 grid">
            {NAV.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="link-seta text-[1.0625rem] font-medium">
                  {l.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="col-span-2 lg:col-span-4 lg:col-start-5">
          <p className="rotulo text-tx-2">Atendimento</p>
          {canais.length ? (
            <ul className="mt-4 grid gap-3">
              {canais.map((c) => (
                <li key={c.rotulo}>
                  <span className="sr-only">{c.rotulo}: </span>
                  {c.conteudo}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-tx-2">
              {PREVIA ? (
                <>
                  Canais pendentes.{" "}
                  <Link href="/previa/" className="text-acento underline decoration-1 underline-offset-4">
                    Ver pendências
                  </Link>
                </>
              ) : (
                <Link href="/#contato" className="link-seta text-tx">
                  Fale com a equipe <span className="seta" aria-hidden="true">→</span>
                </Link>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="envelope mt-20 @container" aria-hidden="true">
        <Wordmark tamanho="grande" className="w-full text-papel" />
      </div>

      <div className="envelope mt-12 flex flex-col gap-3 border-t border-linha pt-6 text-[0.9375rem] text-tx-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {loja.nome}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {PREVIA && <span className="text-acento">Prévia: conteúdo ainda não publicado</span>}
          <Link href="/privacidade/" className="link-seta">
            Política de privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
