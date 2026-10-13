import { z } from "zod";
import {
  CONTENT_KEYS,
  CTA_TARGET_KEYS,
  FEATURE_KEYS,
  GOAL_KEYS,
  MATERIAL_OWNER_KEYS,
  MATERIAL_STATUS_KEYS,
  REQUIREMENT_CATEGORY_KEYS,
  SECTION_KIND_KEYS,
  SITE_TYPE_KEYS,
  STAGE_KEYS,
  STYLE_KEYS,
  TRAFFIC_KEYS,
} from "./catalog";
import { SEGMENT_KEYS } from "./segments";

// Mensagens de validação padrão em português.
z.config(z.locales.ptBR());

/** Versão do formato salvo e exportado. Suba ao mudar o formato e escreva a migração em `migrate.ts`. */
export const SCHEMA_VERSION = 1;

// Limites de tamanho: protegem o armazenamento local, a exportação e o envio à IA.
export const LIMITS = {
  short: 160,
  medium: 600,
  long: 3000,
  list: 40,
  pages: 40,
  sections: 30,
  importBytes: 2_000_000,
  prompt: 60_000,
} as const;

const short = z.string().max(LIMITS.short, `Use no máximo ${LIMITS.short} caracteres.`);
const medium = z.string().max(LIMITS.medium, `Use no máximo ${LIMITS.medium} caracteres.`);
const long = z.string().max(LIMITS.long, `Use no máximo ${LIMITS.long} caracteres.`);
export const IdSchema = z.string().regex(/^[a-zA-Z0-9_-]{4,64}$/, "Identificador inválido.");
const isoDate = z.string().datetime({ offset: true });

// ── Briefing ────────────────────────────────────────────────────────────

const availability = z.enum(["disponivel", "pendente", "na"]);
const featureNeed = z.enum(["sim", "avaliar", "nao"]);

export const ReferenceSchema = z.object({
  id: IdSchema,
  url: z
    .string()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Informe um endereço que comece com http:// ou https://."),
  note: medium,
});

export const BriefingSchema = z.object({
  business: z.object({
    companyName: z.string().trim().min(1, "Informe o nome da empresa.").max(LIMITS.short),
    segment: z.enum(SEGMENT_KEYS),
    segmentOther: short,
    description: long,
    offerings: long, // um por linha
    region: short,
    differentiators: long, // um por linha
    stage: z.enum(STAGE_KEYS).nullable(),
  }),
  audience: z.object({
    idealClient: long,
    problem: long,
    objections: long, // uma por linha
    decisionFactors: long,
    trafficSources: z.array(z.enum(TRAFFIC_KEYS)).max(TRAFFIC_KEYS.length),
    trafficOther: short,
  }),
  goals: z.object({
    primary: z.enum(GOAL_KEYS).nullable(),
    secondary: z.array(z.enum(GOAL_KEYS)).max(GOAL_KEYS.length),
    other: medium,
    conversionAction: medium,
    offer: medium,
  }),
  content: z.object({
    items: z.record(z.enum(CONTENT_KEYS), z.object({ status: availability, note: medium })),
    contact: z.object({
      whatsapp: short,
      phone: short,
      email: short,
      address: medium,
      hours: short,
    }),
  }),
  visual: z.object({
    style: z.enum(STYLE_KEYS).nullable(),
    styleNotes: medium,
    colors: medium,
    references: z.array(ReferenceSchema).max(12),
    theme: z.enum(["claro", "escuro", "indiferente"]),
    motion: z.enum(["nenhuma", "sutil", "moderada", "expressiva"]),
    avoid: medium,
  }),
  features: z.object({
    needs: z.record(z.enum(FEATURE_KEYS), featureNeed),
    integrations: medium,
    languages: short,
    deadline: short,
    budget: short,
    technology: short,
    hosting: medium,
  }),
});
export type Briefing = z.infer<typeof BriefingSchema>;

// ── Planejamento ────────────────────────────────────────────────────────

export const CtaTargetSchema = z.object({
  type: z.enum(CTA_TARGET_KEYS),
  pageId: IdSchema.nullable(),
  sectionId: IdSchema.nullable(),
  url: z.string().max(500),
});
export type CtaTarget = z.infer<typeof CtaTargetSchema>;

export const CtaSchema = z.object({
  label: short,
  target: CtaTargetSchema,
});
export type Cta = z.infer<typeof CtaSchema>;

/** De onde veio o conteúdo de um item. "usuario" nunca é sobrescrito sem confirmação. */
export const OriginSchema = z.enum(["demo", "ia", "usuario", "biblioteca"]);
export type Origin = z.infer<typeof OriginSchema>;

export const SectionSchema = z.object({
  id: IdSchema,
  kind: z.enum(SECTION_KIND_KEYS),
  name: short,
  goal: medium,
  title: medium,
  body: long,
  contentNeeded: z.array(short).max(LIMITS.list),
  cta: CtaSchema.nullable(),
  visual: medium,
  mobile: medium,
  afterSubmit: medium, // só para formulários: o que acontece depois do envio
  origin: OriginSchema,
  edited: z.boolean(),
});
export type Section = z.infer<typeof SectionSchema>;

export const PageSchema = z.object({
  id: IdSchema,
  name: short,
  slug: z.string().max(120).regex(/^\/[a-z0-9\-/]*$/, "Use só letras minúsculas, números, hífens e barras, começando com /."),
  goal: medium,
  parentId: IdSchema.nullable(),
  inMenu: z.boolean(),
  relatedPageIds: z.array(IdSchema).max(LIMITS.pages),
  sections: z.array(SectionSchema).max(LIMITS.sections),
  origin: OriginSchema,
  edited: z.boolean(),
});
export type Page = z.infer<typeof PageSchema>;

export const JourneyStepSchema = z.object({
  pageId: IdSchema,
  sectionId: IdSchema.nullable(),
});

export const JourneySchema = z.object({
  id: IdSchema,
  name: short,
  source: short,
  entryPageId: IdSchema.nullable(),
  steps: z.array(JourneyStepSchema).max(12),
  action: short,
  actionTarget: CtaTargetSchema,
  notes: medium,
});
export type Journey = z.infer<typeof JourneySchema>;

export const MaterialSchema = z.object({
  id: IdSchema,
  /** Chave estável para materiais automáticos: preserva status quando a lista é recalculada. */
  key: z.string().max(300),
  label: short,
  pageId: IdSchema.nullable(),
  sectionId: IdSchema.nullable(),
  owner: z.enum(MATERIAL_OWNER_KEYS),
  status: z.enum(MATERIAL_STATUS_KEYS),
  note: medium,
  origin: z.enum(["auto", "manual"]),
});
export type Material = z.infer<typeof MaterialSchema>;

export const RequirementSchema = z.object({
  id: IdSchema,
  category: z.enum(REQUIREMENT_CATEGORY_KEYS),
  title: short,
  detail: medium,
  origin: OriginSchema,
});
export type Requirement = z.infer<typeof RequirementSchema>;

export const AssumptionSchema = z.object({
  id: IdSchema,
  text: medium,
  kind: z.enum(["sugestao", "hipotese"]),
  status: z.enum(["aberta", "confirmada", "descartada"]),
});
export type Assumption = z.infer<typeof AssumptionSchema>;

export const OverviewSchema = z.object({
  siteType: z.enum(SITE_TYPE_KEYS),
  rationale: long,
  assumptions: z.array(AssumptionSchema).max(LIMITS.list),
});
export type Overview = z.infer<typeof OverviewSchema>;

export const GenerationSchema = z.object({
  mode: z.enum(["demo", "ia"]),
  model: z.string().max(80).nullable(),
  generatedAt: isoDate,
});
export type Generation = z.infer<typeof GenerationSchema>;

export const PlanSchema = z.object({
  generation: GenerationSchema,
  overview: OverviewSchema,
  pages: z.array(PageSchema).max(LIMITS.pages),
  journeys: z.array(JourneySchema).max(12),
  materials: z.array(MaterialSchema).max(300),
  requirements: z.array(RequirementSchema).max(80),
});
export type Plan = z.infer<typeof PlanSchema>;

export const DevPromptSchema = z.object({
  text: z.string().max(LIMITS.prompt),
  edited: z.boolean(),
  generatedAt: isoDate,
  /** Carimbo do planejamento usado: indica quando o prompt ficou desatualizado. */
  planUpdatedAt: isoDate,
});
export type DevPrompt = z.infer<typeof DevPromptSchema>;

export const ProjectSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: IdSchema,
  name: z.string().trim().min(1, "Dê um nome ao projeto.").max(LIMITS.short),
  status: z.enum(["briefing", "planejamento", "pronto"]),
  createdAt: isoDate,
  updatedAt: isoDate,
  planUpdatedAt: isoDate.nullable(),
  briefingStep: z.number().int().min(0).max(5),
  briefing: BriefingSchema.extend({
    // O briefing salvo pode estar incompleto; a obrigatoriedade vale só ao avançar etapas.
    business: BriefingSchema.shape.business.extend({ companyName: z.string().max(LIMITS.short) }),
  }),
  plan: PlanSchema.nullable(),
  devPrompt: DevPromptSchema.nullable(),
});
export type Project = z.infer<typeof ProjectSchema>;

export type ProjectSummary = Pick<Project, "id" | "name" | "status" | "createdAt" | "updatedAt"> & {
  segment: string;
  pageCount: number;
};

/** Envelope de exportação em JSON. */
export const ExportEnvelopeSchema = z.object({
  format: z.literal("siteplan-project"),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  project: z.unknown(),
});
