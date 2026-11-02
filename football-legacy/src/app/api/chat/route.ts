/**
 * Modo IA avançada do Vestiário (opcional).
 * A chave fica só no servidor (ANTHROPIC_API_KEY ou credencial do ambiente).
 * O motor local continua decidindo intenções, relações e memórias; o modelo
 * só reescreve as falas dos personagens a partir de fatos reais da carreira.
 */
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = process.env.FL_AI_MODEL || "claude-opus-5-5";
const MAX_PER_MINUTE = Number(process.env.FL_AI_RATE_PER_MIN || 20);
const enabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) && process.env.FL_AI_DISABLED !== "1";

// limite simples por IP (memória do processo)
const hits = new Map<string, number[]>();
function allowed(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= MAX_PER_MINUTE) return false;
  list.push(now);
  hits.set(ip, list);
  return true;
}

interface Profile { id: string; name: string; persona: string; style: string; relation: string; memories: string[] }
interface Body { facts: string[]; profiles: Profile[]; recent: { from: string; text: string }[]; message: string; draft: Record<string, string[]> }

const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);

const SYSTEM = `Você escreve mensagens de jogadores de futebol fictícios num app de mensagens do vestiário, dentro de um jogo.
Regras:
- Português do Brasil informal, como amigos de time conversando no celular. Mensagens curtas (1 a 2 balões, até ~25 palavras cada).
- Cada personagem mantém a personalidade e o estilo de escrita descritos. Nunca soe como assistente: nada de listas, formalidade, "como posso ajudar" ou explicações longas.
- Eles podem discordar, provocar, brincar, aconselhar e fazer perguntas, conforme a personalidade e a relação.
- Use apenas os fatos fornecidos sobre a carreira. Não invente resultados, placares, transferências, propostas, lesões ou valores. Se o usuário afirmar algo que os fatos não confirmam, o personagem pode duvidar ou tratar como boato.
- O rascunho de cada personagem indica a reação decidida pelo jogo; mantenha a mesma intenção e o mesmo tom, só deixe mais natural.
- Responda apenas pelos personagens listados, usando o id de cada um.`;

export async function GET() {
  return NextResponse.json({ available: enabled(), model: enabled() ? MODEL : null });
}

export async function POST(req: Request) {
  if (!enabled()) return NextResponse.json({ error: "IA avançada não configurada" }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowed(ip)) return NextResponse.json({ error: "Muitas mensagens. Tente em instantes." }, { status: 429 });
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const profiles = (body.profiles ?? []).slice(0, 3);
  if (!profiles.length) return NextResponse.json({ replies: {} });
  const ids = profiles.map((p) => clip(p.id, 20));
  const prompt = [
    "FATOS DA CARREIRA:", ...(body.facts ?? []).slice(0, 14).map((f) => `- ${clip(f, 300)}`),
    "", "PERSONAGENS:",
    ...profiles.map((p) => `- id ${clip(p.id, 20)} · ${clip(p.name, 40)}: ${clip(p.persona, 400)} Estilo: ${clip(p.style, 300)} Relação com o usuário: ${clip(p.relation, 120)}. Memórias: ${(p.memories ?? []).slice(0, 6).map((m) => clip(m, 160)).join(" | ") || "nenhuma"}`),
    "", "CONVERSA RECENTE:", ...(body.recent ?? []).slice(-10).map((m) => `${clip(m.from, 30)}: ${clip(m.text, 300)}`),
    "", `NOVA MENSAGEM DO USUÁRIO: ${clip(body.message, 500)}`,
    "", "RASCUNHOS (reação decidida pelo jogo):", ...ids.map((id) => `${id}: ${(body.draft?.[id] ?? []).map((l) => clip(l, 200)).join(" / ")}`),
  ].join("\n");
  const schema = {
    type: "object",
    properties: {
      replies: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string", enum: ids }, lines: { type: "array", items: { type: "string" } } },
          required: ["id", "lines"],
          additionalProperties: false,
        },
      },
    },
    required: ["replies"],
    additionalProperties: false,
  };
  try {
    const client = new Anthropic();
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    if (res.stop_reason === "refusal") return NextResponse.json({ error: "recusado" }, { status: 422 });
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return NextResponse.json({ error: "sem resposta" }, { status: 502 });
    const parsed = JSON.parse(text.text) as { replies: { id: string; lines: string[] }[] };
    const replies: Record<string, string[]> = {};
    for (const r of parsed.replies ?? []) if (ids.includes(r.id)) replies[r.id] = (r.lines ?? []).slice(0, 3).map((l) => clip(l, 280)).filter(Boolean);
    return NextResponse.json({ replies });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "limite da API" }, { status: 429 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: `erro da API (${e.status})` }, { status: 502 });
    if (e instanceof SyntaxError) return NextResponse.json({ error: "resposta inválida" }, { status: 502 });
    return NextResponse.json({ error: "falha de conexão" }, { status: 502 });
  }
}
