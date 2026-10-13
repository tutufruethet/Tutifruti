import { z } from "zod";
import { BriefingSchema } from "@/lib/schema";
import { describeIssues } from "@/lib/schema/migrate";
import { AiPlanSchema } from "@/lib/ai/schema";
import { normalizeAiPlan } from "@/lib/ai/normalize";
import { planUserMessage, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { AI_MODEL, AiError, aiEnabled, structured } from "@/lib/ai/server";
import { jsonError, rateLimited, readJson } from "@/lib/ai/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const Body = z.object({ briefing: BriefingSchema });

export async function POST(req: Request) {
  if (!aiEnabled()) return jsonError("Nenhuma chave de IA configurada no servidor. Use o modo demonstração.", 503);
  if (rateLimited(req)) return jsonError("Muitas gerações seguidas. Aguarde alguns minutos.", 429);
  let raw: unknown;
  try {
    raw = await readJson(req);
  } catch {
    return jsonError("Pedido inválido ou grande demais.", 400);
  }
  const body = Body.safeParse(raw);
  if (!body.success) return jsonError("O briefing tem campos inválidos.", 400, describeIssues(body.error));
  try {
    const ai = await structured(AiPlanSchema, SYSTEM_PROMPT, planUserMessage(body.data.briefing));
    const result = normalizeAiPlan(ai, body.data.briefing, AI_MODEL);
    if (!result.ok) return jsonError(result.error, 502);
    return Response.json({ plan: result.plan });
  } catch (e) {
    if (e instanceof AiError) return jsonError(e.message, e.status);
    return jsonError("Erro inesperado na geração.", 500);
  }
}
