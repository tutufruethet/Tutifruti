import type { Briefing, CtaTarget, Page, Plan, Section } from "@/lib/schema";
import { LIMITS, PlanSchema, SectionSchema } from "@/lib/schema";
import { newId, noTarget, nowIso } from "@/lib/schema/factory";
import { describeIssues } from "@/lib/schema/migrate";
import { slugify } from "@/lib/generator/demo";
import { syncMaterials } from "@/lib/plan/materials";
import type { AiPlan } from "./schema";
import type { z } from "zod";
import type { AiCtaSchema, AiSectionSchema } from "./schema";

const clip = (s: string | null | undefined, n: number) => (s ?? "").trim().slice(0, n);

function cleanSlug(slug: string, fallback: string) {
  const parts = slug
    .split("/")
    .map((p) => slugify(p))
    .filter((p) => p && p !== "pagina");
  const s = `/${parts.join("/")}`;
  return s === "/" && fallback !== "home" ? `/${slugify(fallback)}` : s;
}

type Refs = { pages: Map<string, string>; sections: Map<string, string> };

function target(cta: z.infer<typeof AiCtaSchema>, refs: Refs): CtaTarget {
  const t = noTarget();
  t.type = cta.targetType;
  if (cta.targetType === "page" || cta.targetType === "section") t.pageId = refs.pages.get(cta.targetPageRef ?? "") ?? null;
  if (cta.targetType === "section") t.sectionId = refs.sections.get(cta.targetSectionRef ?? "") ?? null;
  if (cta.targetType === "external") t.url = clip(cta.url, 500);
  if ((t.type === "page" || t.type === "section") && !t.pageId) return noTarget();
  return t;
}

export function toSection(s: z.infer<typeof AiSectionSchema>, id: string, refs: Refs): Section {
  return {
    id,
    kind: s.kind,
    name: clip(s.name, LIMITS.short) || s.kind,
    goal: clip(s.goal, LIMITS.medium),
    title: clip(s.title, LIMITS.medium),
    body: clip(s.body, LIMITS.long),
    contentNeeded: s.contentNeeded.map((c) => clip(c, LIMITS.short)).filter(Boolean).slice(0, LIMITS.list),
    cta: s.cta ? { label: clip(s.cta.label, LIMITS.short), target: target(s.cta, refs) } : null,
    visual: clip(s.visual, LIMITS.medium),
    mobile: clip(s.mobile, LIMITS.medium),
    afterSubmit: s.kind === "formulario" ? clip(s.afterSubmit, LIMITS.medium) : "",
    origin: "ia",
    edited: false,
  };
}

export type NormalizeResult = { ok: true; plan: Plan } | { ok: false; error: string };

/** Converte a resposta da IA no formato do editor e valida com o schema completo. */
export function normalizeAiPlan(ai: AiPlan, briefing: Briefing, model: string): NormalizeResult {
  const refs: Refs = { pages: new Map(), sections: new Map() };
  const aiPages = ai.pages.slice(0, LIMITS.pages);
  for (const p of aiPages) {
    refs.pages.set(p.ref, newId("pag"));
    for (const s of p.sections.slice(0, LIMITS.sections)) refs.sections.set(s.ref, newId("sec"));
  }
  const usedSlugs = new Set<string>();
  const pages: Page[] = aiPages.map((p) => {
    let slug = cleanSlug(p.slug, p.ref);
    while (usedSlugs.has(slug)) slug = `${slug}-2`;
    usedSlugs.add(slug);
    return {
      id: refs.pages.get(p.ref)!,
      name: clip(p.name, LIMITS.short) || "Página",
      slug,
      goal: clip(p.goal, LIMITS.medium),
      parentId: p.parentRef ? (refs.pages.get(p.parentRef) ?? null) : null,
      inMenu: p.inMenu,
      relatedPageIds: p.relatedRefs.map((r) => refs.pages.get(r)).filter((x): x is string => !!x),
      sections: p.sections.slice(0, LIMITS.sections).map((s) => toSection(s, refs.sections.get(s.ref)!, refs)),
      origin: "ia",
      edited: false,
    };
  });
  for (const p of pages) if (p.parentId === p.id) p.parentId = null;

  const plan: Plan = {
    generation: { mode: "ia", model, generatedAt: nowIso() },
    overview: {
      siteType: ai.siteType,
      rationale: clip(ai.rationale, LIMITS.long),
      assumptions: ai.assumptions.slice(0, LIMITS.list).map((a) => ({ id: newId("hip"), text: clip(a.text, LIMITS.medium), kind: a.kind, status: "aberta" as const })),
    },
    pages,
    journeys: ai.journeys.slice(0, 12).map((j) => ({
      id: newId("jor"),
      name: clip(j.name, LIMITS.short),
      source: clip(j.source, LIMITS.short),
      entryPageId: refs.pages.get(j.entryPageRef) ?? null,
      steps: j.steps
        .map((st) => ({ pageId: refs.pages.get(st.pageRef) ?? "", sectionId: st.sectionRef ? (refs.sections.get(st.sectionRef) ?? null) : null }))
        .filter((st) => st.pageId)
        .slice(0, 12),
      action: clip(j.action, LIMITS.short),
      actionTarget: target(j.actionTarget, refs),
      notes: "",
    })),
    materials: [],
    requirements: ai.requirements.slice(0, 80).map((r) => ({ id: newId("req"), category: r.category, title: clip(r.title, LIMITS.short), detail: clip(r.detail, LIMITS.medium), origin: "ia" as const })),
  };
  plan.materials = syncMaterials(plan, briefing);
  const parsed = PlanSchema.safeParse(plan);
  if (!parsed.success) return { ok: false, error: `A resposta da IA não passou na validação: ${describeIssues(parsed.error, 3).join("; ")}` };
  if (!parsed.data.pages.length) return { ok: false, error: "A IA não devolveu nenhuma página." };
  return { ok: true, plan: parsed.data };
}

/** Converte uma seção regenerada, mantendo o id e resolvendo destinos pelo plano atual. */
export function normalizeAiSection(s: z.infer<typeof AiSectionSchema>, keepId: string, plan: Plan): Section | null {
  const refs: Refs = { pages: new Map(), sections: new Map() };
  for (const p of plan.pages) {
    refs.pages.set(p.id, p.id);
    for (const sec of p.sections) refs.sections.set(sec.id, sec.id);
  }
  const parsed = SectionSchema.safeParse(toSection(s, keepId, refs));
  return parsed.success ? parsed.data : null;
}
