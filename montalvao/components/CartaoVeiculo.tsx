import Link from "next/link";
import type { Veiculo } from "@/lib/veiculos";
import { ehDemonstracao, precoOuConsulta, resumoVeiculo } from "@/lib/veiculos";
import { Foto } from "@/components/Foto";
import { SeloDemo } from "@/components/Selos";

type Props = {
  v: Veiculo;
  sizes: string;
  grande?: boolean;
  prioridade?: boolean;
  nivelTitulo?: "h2" | "h3";
  className?: string;
};

/** Card de veículo: foto grande, nome, só atributos confirmados e preço ou "Consulte condições". O card inteiro é o link. */
export function CartaoVeiculo({ v, sizes, grande = false, prioridade = false, nivelTitulo = "h3", className = "" }: Props) {
  const Titulo = nivelTitulo;
  const resumo = resumoVeiculo(v);
  return (
    <article className={`grupo-foto relative flex flex-col ${className}`}>
      <div className="foto-moldura zoom-suave aspect-[4/5]">
        <Foto id={v.fotos[0]} sizes={sizes} prioridade={prioridade} alt="" />
        {ehDemonstracao(v) && <SeloDemo className="absolute left-3 top-3" />}
      </div>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="rotulo text-tx-2">{v.marca}</p>
          <Titulo className={`titulo mt-2 ${grande ? "text-[clamp(1.75rem,3vw,2.5rem)]" : "text-[1.625rem]"}`}>
            <Link href={`/veiculos/${v.slug}/`} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-[var(--foco)]">
              {v.modelo ? (
                <>
                  <span className="sr-only">{v.marca} </span>
                  {v.modelo}
                </>
              ) : (
                v.marca
              )}
            </Link>
          </Titulo>
          {(v.versao || !v.modelo) && <p className="mt-1.5 text-[1rem] text-tx-2">{v.versao ?? "Modelo e versão a confirmar"}</p>}
          {resumo.length > 0 && <p className="mt-1 text-[0.9375rem] text-tx-2">{resumo.join(" · ")}</p>}
        </div>
        <p className={v.preco != null ? "titulo text-[1.375rem] tabular-nums" : "pt-1 text-[0.9375rem] font-medium text-tx-2"}>
          {precoOuConsulta(v)}
        </p>
      </div>

      <span aria-hidden="true" className="link-seta mt-3 self-start text-[0.9375rem] text-acento">
        Ver veículo <span className="seta">→</span>
      </span>
    </article>
  );
}
