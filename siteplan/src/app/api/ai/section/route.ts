import { z } from "zod";
import { BriefingSchema, PlanSchema } from "@/lib/schema";
import { describeIssues } from "@/lib/schema/migrate";
import { AiSectionResultSchema } from "@/lib/ai/schema";
import { normalizeAiSection } from "@/lib/ai/normalize";
import { sectionUserMessage, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { AiError, aiEnabled, structured } from "@/lib/ai/server";
import { jsonError, rateLimited, readJson } from "@/lib/ai/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({
  briefing: BriefingSchema,
  plan: PlanSchema,
  pageId: z.string().max(64),
  sectionId: z.string().max(64),
  instruction: z.string().max(300).default(""),
});

export async function POST(req: Request) {
  if (!aiEnabled()) return jsonError("Nenhuma chave de IA configurada no servidor.", 503);
  if (rateLimited(req, 30)) return jsonError("Muitas regenerações seguidas. Aguarde alguns minutos.", 429);
  let raw: unknown;
  try {
    raw = await readJson(req, 600_000);
  } catch {
    return jsonError("Pedido inválido ou grande demais.", 400);
  }
  const body = Body.safeParse(raw);
  if (!body.success) return jsonError("Dados inválidos.", 400, describeIssues(body.error));
  const { briefing, plan, pageId, sectionId, instruction } = body.data;
  const page = plan.pages.find((p) => p.id === pageId);
  const section = page?.sections.find((s) => s.id === sectionId);
  if (!page || !section) return jsonError("Seção não encontrada.", 404);
  try {
    const ai = await structured(AiSectionResultSchema, SYSTEM_PROMPT, sectionUserMessage(briefing, plan, page, section, instruction), 8_000);
    if (ai.section.kind !== section.kind) return jsonError("A IA mudou o tipo da seção; tente de novo.", 502);
    const next = normalizeAiSection(ai.section, section.id, plan);
    if (!next) return jsonError("A sugestão da IA não passou na validação.", 502);
    return Response.json({ section: next, note: ai.note.slice(0, 300) });
  } catch (e) {
    if (e instanceof AiError) return jsonError(e.message, e.status);
    return jsonError("Erro inesperado na geração.", 500);
  }
}
