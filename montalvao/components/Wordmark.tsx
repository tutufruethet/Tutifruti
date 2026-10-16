import { loja } from "@/content/loja";

/**
 * Wordmark tipográfico provisório. A versão "grande" ocupa a largura do container (precisa de um pai com @container):
 * "MONTALVÃO" mede 7,79em nesta fonte, então 12,7cqi ≈ 99% da largura.
 * A logo oficial (faixas + "MONTALVÃO MOTORS") só aparece
 * nas placas das fotos, em baixa resolução; quando a loja enviar o arquivo, configure loja.logoOficial.
 */
export function Wordmark({ className = "", tamanho = "normal" }: { className?: string; tamanho?: "normal" | "grande" }) {
  if (loja.logoOficial) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={loja.logoOficial} alt={loja.nome} className={className} />;
  }
  const grande = tamanho === "grande";
  return (
    <span className={`inline-flex flex-col items-start leading-none ${className}`} aria-label={loja.nome} role="img">
      <span
        aria-hidden="true"
        className={grande ? "text-[length:12.7cqi] font-bold tracking-[-0.03em]" : "text-[1.25rem] font-bold tracking-[0.01em]"}
        style={{ fontStretch: "125%" }}
      >
        MONTALVÃO
      </span>
      <span
        aria-hidden="true"
        className={grande ? "mt-[0.4em] self-end text-[length:max(0.75rem,2.1cqi)] font-medium tracking-[0.5em] -mr-[0.5em]" : "mt-[0.3rem] self-end text-[0.625rem] font-medium tracking-[0.42em] text-tx-2"}
        style={{ fontStretch: "125%" }}
      >
        MOTORS
      </span>
    </span>
  );
}
