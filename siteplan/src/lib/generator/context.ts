import type { Briefing, Cta } from "@/lib/schema";
import { labelOf, GOALS, type GoalKey } from "@/lib/schema/catalog";
import { noTarget } from "@/lib/schema/factory";
import { segmentLabel } from "@/lib/schema/segments";
import { PROFILES, type SegmentProfile } from "./profiles";

export const lines = (text: string) =>
  text
    .split(/\n|;/)
    .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);

/** Marca o que só o cliente pode fornecer. O texto aparece no editor e no prompt. */
export const pending = (what: string) => `[Pendente: ${what}]`;

export const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
export const upperFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const firstSentence = (s: string) => (s.split(/(?<=[.!?])\s/)[0] ?? s).trim();

export function listPt(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

export type Channel = "whatsapp" | "form" | "shop";

export type GenContext = {
  b: Briefing;
  profile: SegmentProfile;
  name: string;
  segment: string;
  offerings: string[];
  diffs: string[];
  objections: string[];
  objectionsAreHypotheses: boolean;
  region: string;
  goal: GoalKey | null;
  goalLabel: string;
  offer: string;
  channel: Channel;
  has: (key: keyof Briefing["features"]["needs"]) => boolean;
  material: (key: keyof Briefing["content"]["items"]) => "disponivel" | "pendente" | "na";
};

export function buildContext(b: Briefing): GenContext {
  const profile = PROFILES[b.business.segment] ?? PROFILES.outro;
  const ownObjections = lines(b.audience.objections);
  const goal = b.goals.primary;
  const has = (k: keyof Briefing["features"]["needs"]) => b.features.needs[k] === "sim";
  let channel: Channel = "form";
  if (goal === "vendas" && has("pagamento")) channel = "shop";
  else if (goal === "whatsapp" || (has("whatsapp") && goal !== "leads" && goal !== "inscricoes")) channel = "whatsapp";
  return {
    b,
    profile,
    name: b.business.companyName.trim() || "a empresa",
    segment: segmentLabel(b.business.segment, b.business.segmentOther),
    offerings: lines(b.business.offerings).slice(0, 12),
    diffs: lines(b.business.differentiators).slice(0, 6),
    objections: ownObjections.length ? ownObjections.slice(0, 8) : profile.objections,
    objectionsAreHypotheses: ownObjections.length === 0,
    region: b.business.region.trim(),
    goal,
    goalLabel: goal === "outro" ? b.goals.other || "Outro objetivo" : labelOf(GOALS, goal),
    offer: b.goals.offer.trim(),
    channel,
    has,
    material: (k) => b.content.items[k]?.status ?? "pendente",
  };
}

/** Núcleo curto da oferta para caber num botão: "Avaliação com plano…" → "avaliação". */
export function shortOffer(offer: string) {
  const o = offer.trim();
  if (o.length <= 24) return lowerFirst(o);
  return lowerFirst(o.split(/\s+(?:com|de|do|da|para|e|no|na|em|sem)\s+/i)[0].slice(0, 24));
}

/** Rótulo do botão principal, ligado ao objetivo e à oferta. */
export function primaryCtaLabel(ctx: GenContext): string {
  const { goal, profile } = ctx;
  const offer = shortOffer(ctx.offer);
  switch (goal) {
    case "whatsapp":
      return offer ? `Pedir ${offer} pelo WhatsApp` : "Conversar pelo WhatsApp";
    case "agendamento":
      return `Agendar ${profile.visit}`;
    case "leads":
      return offer ? `Quero ${offer}` : "Quero ser contatado";
    case "vendas":
      return `Ver ${profile.services}`;
    case "inscricoes":
      return "Fazer inscrição";
    case "portfolio":
      return "Pedir orçamento";
    case "autoridade":
      return `Agendar ${profile.visit}`;
    case "servicos":
      return ctx.channel === "whatsapp" ? "Pedir orçamento pelo WhatsApp" : "Pedir orçamento";
    default:
      return "Entrar em contato";
  }
}

export const ctaOf = (label: string, target: Cta["target"] = noTarget()): Cta => ({ label, target });
