import { z } from "zod";
import { CTA_TARGET_KEYS, REQUIREMENT_CATEGORY_KEYS, SECTION_KIND_KEYS, SITE_TYPE_KEYS } from "@/lib/schema/catalog";

// Formato que a IA devolve. É mais simples que o do editor (referências por "ref" em vez de ids)
// e passa por normalização e pela validação completa do PlanSchema antes de chegar ao editor.

export const AiCtaSchema = z.object({
  label: z.string(),
  targetType: z.enum(CTA_TARGET_KEYS),
  targetPageRef: z.string().nullable().describe("ref da página de destino, quando targetType for page ou section"),
  targetSectionRef: z.string().nullable().describe("ref da seção de destino, quando targetType for section"),
  url: z.string().nullable(),
});

export const AiSectionSchema = z.object({
  ref: z.string().describe("identificador curto e único da seção, ex.: home-hero"),
  kind: z.enum(SECTION_KIND_KEYS),
  name: z.string(),
  goal: z.string().describe("função da seção no projeto"),
  title: z.string(),
  body: z.string(),
  contentNeeded: z.array(z.string()),
  cta: AiCtaSchema.nullable(),
  visual: z.string().describe("composição visual concreta"),
  mobile: z.string(),
  afterSubmit: z.string().describe("só para formulários: o que acontece depois do envio; vazio nos demais"),
});

export const AiPageSchema = z.object({
  ref: z.string().describe("identificador curto e único da página, ex.: home"),
  name: z.string(),
  slug: z.string().describe("começa com /, só minúsculas, números e hífens"),
  goal: z.string(),
  parentRef: z.string().nullable(),
  inMenu: z.boolean(),
  relatedRefs: z.array(z.string()),
  sections: z.array(AiSectionSchema),
});

export const AiPlanSchema = z.object({
  siteType: z.enum(SITE_TYPE_KEYS),
  rationale: z.string(),
  assumptions: z.array(z.object({ text: z.string(), kind: z.enum(["sugestao", "hipotese"]) })),
  pages: z.array(AiPageSchema),
  journeys: z.array(
    z.object({
      name: z.string(),
      source: z.string(),
      entryPageRef: z.string(),
      steps: z.array(z.object({ pageRef: z.string(), sectionRef: z.string().nullable() })),
      action: z.string(),
      actionTarget: AiCtaSchema,
    }),
  ),
  requirements: z.array(z.object({ category: z.enum(REQUIREMENT_CATEGORY_KEYS), title: z.string(), detail: z.string() })),
});
export type AiPlan = z.infer<typeof AiPlanSchema>;

export const AiSectionResultSchema = z.object({ section: AiSectionSchema, note: z.string().describe("o que mudou e por quê, em uma frase") });
export type AiSectionResult = z.infer<typeof AiSectionResultSchema>;
