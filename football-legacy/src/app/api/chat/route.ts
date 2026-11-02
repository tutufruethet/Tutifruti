/**
 * Modo IA avançada do Vestiário (opcional), pelo servidor.
 * Provedores:
 *   - "ollama": modelo local/self-hosted. Defina OLLAMA_URL (e OLLAMA_MODEL).
 *   - "anthropic": Claude, com ANTHROPIC_API_KEY. A chave nunca vai ao navegador.
 * FL_AI_PROVIDER escolhe; sem ele, usa Ollama se OLLAMA_URL existir, senão Claude se houver chave.
 * O motor local continua decidindo intenções, relações e memórias; o modelo
 * só reescreve as falas a partir de fatos reais da carreira.
 * (O Ollama também pode ser chamado direto do navegador; ver Configurações.)
 */
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { AI_SYSTEM, aiIds, aiSchema, buildAIPrompt, parseAIReplies, type AIRequest } from "@/engine/chat/aiPrompt";
import { ollamaReplies } from "@/lib/ollama";

export const runtime = "nodejs";

const MAX_PER_MINUTE = Number(process.env.FL_AI_RATE_PER_MIN || 20);
const OLLAMA_URL = process.env.OLLAMA_URL || "";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const CLAUDE_MODEL = process.env.FL_AI_MODEL || "claude-opus-5-5";

function provider(): "ollama" | "anthropic" | null {
  if (process.env.FL_AI_DISABLED === "1") return null;
  const want = process.env.FL_AI_PROVIDER;
  const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  if (want === "ollama") return "ollama";
  if (want === "anthropic") return hasKey ? "anthropic" : null;
  if (OLLAMA_URL) return "ollama";
  return hasKey ? "anthropic" : null;
}

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

export async function GET() {
  const p = provider();
  return NextResponse.json({ available: !!p, provider: p, model: p === "ollama" ? OLLAMA_MODEL : p === "anthropic" ? CLAUDE_MODEL : null });
}

async function claudeReplies(body: AIRequest, ids: string[]) {
  const client = new Anthropic();
  const res = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: aiSchema(ids) } },
    system: AI_SYSTEM,
    messages: [{ role: "user", content: buildAIPrompt(body) }],
  });
  if (res.stop_reason === "refusal") return null;
  const text = res.content.find((b) => b.type === "text");
  return text && text.type === "text" ? parseAIReplies(text.text, ids) : null;
}

export async function POST(req: Request) {
  const p = provider();
  if (!p) return NextResponse.json({ error: "IA avançada não configurada" }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowed(ip)) return NextResponse.json({ error: "Muitas mensagens. Tente em instantes." }, { status: 429 });
  let body: AIRequest;
  try { body = (await req.json()) as AIRequest; } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const ids = aiIds(body);
  if (!ids.length) return NextResponse.json({ replies: {} });
  try {
    const replies = p === "ollama" ? await ollamaReplies(OLLAMA_URL || "http://localhost:11434", OLLAMA_MODEL, body) : await claudeReplies(body, ids);
    if (!replies) return NextResponse.json({ error: "resposta inválida" }, { status: 502 });
    return NextResponse.json({ replies });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "limite da API" }, { status: 429 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: `erro da API (${e.status})` }, { status: 502 });
    return NextResponse.json({ error: "falha de conexão com o modelo" }, { status: 502 });
  }
}
