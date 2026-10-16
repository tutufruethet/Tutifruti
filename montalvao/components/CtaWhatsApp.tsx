import { linkWhatsApp } from "@/lib/whatsapp";
import { PREVIA } from "@/lib/modo";
import { IconeWhatsApp } from "@/components/Icones";

type Props = {
  mensagem: string;
  rotulo: string;
  variante?: "cheio" | "linha";
  className?: string;
};

/**
 * Botão de conversa no WhatsApp com a mensagem já escrita.
 * Sem número confirmado: na prévia aparece desativado e marcado como pendente; no público não aparece.
 * Nunca aponta para um destino falso.
 */
export function CtaWhatsApp({ mensagem, rotulo, variante = "cheio", className = "" }: Props) {
  const href = linkWhatsApp(mensagem);

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`botao botao-${variante} ${className}`}>
        <IconeWhatsApp />
        {rotulo}
        <span className="sr-only"> (abre o WhatsApp)</span>
      </a>
    );
  }

  if (!PREVIA) return null;

  return (
    <span role="link" aria-disabled="true" className={`botao relative ${className}`} title="O número de WhatsApp da loja ainda não foi informado">
      <IconeWhatsApp />
      {rotulo}
      <span className="absolute -top-2.5 right-3 bg-fundo px-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-acento">
        Número pendente
      </span>
    </span>
  );
}
