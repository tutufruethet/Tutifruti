import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <section className="escuro flex min-h-[80svh] items-end pb-20 pt-[calc(var(--altura-cabecalho)+4rem)]">
      <div className="envelope">
        <p className="rotulo text-tx-2">Erro 404</p>
        <h1 className="display mt-6 max-w-[16ch] text-[clamp(2.75rem,7vw,6rem)]">Esta página não está aqui.</h1>
        <p className="mt-6 max-w-lg text-tx-2">O endereço pode ter mudado ou o veículo pode ter saído do catálogo.</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/veiculos/" className="botao botao-cheio">
            Ver veículos <span aria-hidden="true">→</span>
          </Link>
          <Link href="/" className="botao botao-linha">
            Voltar ao início
          </Link>
        </div>
      </div>
    </section>
  );
}
