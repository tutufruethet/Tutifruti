import type { Briefing } from "@/lib/schema";
import { CONTENT_ITEMS } from "@/lib/schema/catalog";

export type Gap = { step: number; label: string; level: "obrigatorio" | "importante" | "recomendado"; why: string };

export const BRIEFING_STEPS = [
  { key: "negocio", label: "Negócio" },
  { key: "publico", label: "Público" },
  { key: "objetivo", label: "Objetivo" },
  { key: "conteudo", label: "Conteúdo e confiança" },
  { key: "visual", label: "Visual" },
  { key: "funcionalidades", label: "Funcionalidades" },
] as const;

/** Lacunas do briefing, em ordem de impacto no planejamento. */
export function briefingGaps(b: Briefing): Gap[] {
  const g: Gap[] = [];
  const empty = (s: string) => !s.trim();
  if (empty(b.business.companyName)) g.push({ step: 0, label: "Nome da empresa", level: "obrigatorio", why: "Aparece nos títulos e no prompt." });
  if (b.business.segment === "outro" && empty(b.business.segmentOther))
    g.push({ step: 0, label: "Segmento", level: "importante", why: "Sem segmento, o modo demonstração usa um modelo genérico." });
  if (!b.goals.primary) g.push({ step: 2, label: "Objetivo principal", level: "obrigatorio", why: "Define o tipo de site, os botões e as jornadas." });
  if (empty(b.business.offerings)) g.push({ step: 0, label: "Produtos ou serviços", level: "importante", why: "Sem eles, a seção de serviços fica vazia." });
  if (empty(b.audience.idealClient)) g.push({ step: 1, label: "Cliente ideal", level: "importante", why: "Orienta o tom e as escolhas de conteúdo." });
  if (empty(b.goals.conversionAction)) g.push({ step: 2, label: "O que conta como conversão", level: "importante", why: "Define o fim de cada jornada." });
  if (empty(b.goals.offer)) g.push({ step: 2, label: "Oferta", level: "recomendado", why: "Dá um motivo concreto para clicar." });
  if (empty(b.business.region)) g.push({ step: 0, label: "Região de atuação", level: "recomendado", why: "Importante para negócios locais e para a busca." });
  if (empty(b.business.differentiators)) g.push({ step: 0, label: "Diferenciais", level: "recomendado", why: "Sem eles, a seção de diferenciais fica pendente." });
  if (empty(b.audience.problem)) g.push({ step: 1, label: "Problema do cliente", level: "recomendado", why: "Permite a seção de problema e solução." });
  if (empty(b.audience.objections)) g.push({ step: 1, label: "Dúvidas e objeções", level: "recomendado", why: "Sem elas, as perguntas frequentes usam hipóteses do segmento." });
  if (!b.audience.trafficSources.length) g.push({ step: 1, label: "Origem do tráfego", level: "recomendado", why: "Define as páginas de entrada das jornadas." });
  const wantsWa = b.goals.primary === "whatsapp" || b.features.needs.whatsapp === "sim";
  if (wantsWa && empty(b.content.contact.whatsapp))
    g.push({ step: 3, label: "Número de WhatsApp", level: "importante", why: "A conversão principal depende dele." });
  if (!b.visual.style) g.push({ step: 4, label: "Estilo visual", level: "recomendado", why: "Sem estilo, o prompt usa uma direção sóbria." });
  return g;
}

export function pendingMaterials(b: Briefing) {
  return CONTENT_ITEMS.filter((c) => b.content.items[c.key]?.status === "pendente").map((c) => c.label);
}
