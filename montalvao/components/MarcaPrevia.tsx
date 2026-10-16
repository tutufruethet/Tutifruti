import Link from "next/link";
import { PREVIA } from "@/lib/modo";

/** Selo fixo de prévia no desktop, com atalho para a lista de pendências. No celular o selo fica no cabeçalho. */
export function MarcaPrevia() {
  if (!PREVIA) return null;
  return (
    <Link
      href="/previa/"
      className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-6 z-40 hidden lg:inline-flex min-h-11 items-center gap-2 rounded-full border border-ouro/60 bg-preto/95 py-2 pl-3 pr-4 text-[0.8125rem] font-semibold text-papel shadow-[0_10px_30px_-12px_rgb(0_0_0/0.6)]"
    >
      <span className="size-2 rounded-full bg-ouro" aria-hidden="true" />
      Prévia · ver pendências
    </Link>
  );
}
