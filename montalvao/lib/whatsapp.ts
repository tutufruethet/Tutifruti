import { loja } from "@/content/loja";

/** Número só com dígitos, ou null se não houver um número completo (DDI + DDD + telefone). */
export function numeroWhatsApp(): string | null {
  const numero = (loja.whatsapp ?? "").replace(/\D/g, "");
  return numero.length >= 12 ? numero : null;
}

/** Link wa.me com a mensagem codificada, ou null quando o número ainda não foi confirmado. */
export function linkWhatsApp(mensagem: string): string | null {
  const numero = numeroWhatsApp();
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
