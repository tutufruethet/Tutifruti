import type { z } from "zod";
import { emptyBriefing } from "./factory";
import { ExportEnvelopeSchema, LIMITS, ProjectSchema, SCHEMA_VERSION, type Project } from "./index";

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Migrações por versão: a chave é a versão de origem.
 * Ao criar a versão 2, adicione `1: (raw) => ({ ...raw, novoCampo: ..., schemaVersion: 2 })`.
 */
const MIGRATIONS: Record<number, Migration> = {};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Completa campos ausentes do briefing com os valores vazios, sem sobrescrever os existentes. */
function fillDefaults(target: unknown, defaults: unknown): unknown {
  if (!isObject(defaults)) return target === undefined ? defaults : target;
  if (!isObject(target)) return target === undefined ? defaults : target;
  const out: Record<string, unknown> = { ...target };
  for (const [k, v] of Object.entries(defaults)) out[k] = fillDefaults(target[k], v);
  return out;
}

export type ImportResult = { ok: true; project: Project } | { ok: false; error: string; details: string[] };

const FIELD_NAMES: Record<string, string> = {
  briefing: "briefing",
  plan: "planejamento",
  pages: "páginas",
  sections: "seções",
  journeys: "jornadas",
  materials: "materiais",
  requirements: "requisitos",
  business: "negócio",
  audience: "público",
  goals: "objetivos",
  visual: "visual",
  features: "funcionalidades",
  name: "nome",
  status: "status",
  createdAt: "data de criação",
  updatedAt: "data de atualização",
  planUpdatedAt: "data do planejamento",
  briefingStep: "etapa do briefing",
  title: "título",
  body: "texto",
  slug: "endereço",
  cta: "CTA",
  target: "destino",
  label: "rótulo",
  goal: "objetivo",
};

export function describeIssues(error: z.ZodError, max = 6): string[] {
  return error.issues.slice(0, max).map((i) => {
    const path = i.path.map((p) => (typeof p === "number" ? `#${p + 1}` : (FIELD_NAMES[String(p)] ?? String(p)))).join(" › ");
    return path ? `${path}: ${i.message}` : i.message;
  });
}

/** Valida um projeto vindo de fora (arquivo importado ou armazenamento antigo) e aplica migrações. */
export function parseProject(input: unknown): ImportResult {
  if (!isObject(input)) return { ok: false, error: "O arquivo não contém um projeto do SitePlan.", details: [] };
  let raw: Record<string, unknown> = { ...input };
  let version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : NaN;
  if (!Number.isInteger(version)) {
    return { ok: false, error: "O projeto não informa a versão do formato (schemaVersion).", details: [] };
  }
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Este arquivo usa a versão ${version} do formato, mais nova que a suportada (${SCHEMA_VERSION}). Atualize o SitePlan.`,
      details: [],
    };
  }
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return { ok: false, error: `Não há migração da versão ${version} do formato.`, details: [] };
    raw = step(raw);
    version = raw.schemaVersion as number;
  }
  raw.briefing = fillDefaults(raw.briefing, emptyBriefing());
  const parsed = ProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "O projeto tem dados inválidos ou incompletos.", details: describeIssues(parsed.error) };
  }
  return { ok: true, project: parsed.data };
}

/** Lê o texto de um arquivo JSON exportado. */
export function parseExportFile(text: string): ImportResult {
  if (text.length > LIMITS.importBytes) {
    return { ok: false, error: `Arquivo grande demais. O limite é ${Math.round(LIMITS.importBytes / 1_000_000)} MB.`, details: [] };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "O arquivo não é um JSON válido.", details: [] };
  }
  const env = ExportEnvelopeSchema.safeParse(data);
  if (!env.success) {
    return {
      ok: false,
      error: "Este JSON não foi exportado pelo SitePlan (faltam os campos format, schemaVersion ou project).",
      details: [],
    };
  }
  if (isObject(env.data.project) && env.data.project.schemaVersion === undefined) {
    env.data.project.schemaVersion = env.data.schemaVersion;
  }
  return parseProject(env.data.project);
}
