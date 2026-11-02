/**
 * Cliente do Ollama (modelo de linguagem rodando no computador do usuário).
 * Funciona tanto no servidor (rota /api/chat) quanto direto do navegador.
 * API: POST {url}/api/chat com format = JSON schema; GET {url}/api/tags lista modelos.
 */
import { AI_SYSTEM, aiIds, aiSchema, buildAIPrompt, parseAIReplies, type AIRequest } from "@/engine/chat/aiPrompt";

export const OLLAMA_DEFAULT_URL = "http://localhost:11434";

const trimUrl = (u: string) => (u || OLLAMA_DEFAULT_URL).replace(/\/+$/, "");

export async function ollamaModels(url: string, timeoutMs = 4000): Promise<string[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${trimUrl(url)}/api/tags`, { signal: ctrl.signal });
    if (!r.ok) return [];
    const d = (await r.json()) as { models?: { name?: string }[] };
    return (d.models ?? []).map((m) => m.name ?? "").filter(Boolean);
  } finally {
    clearTimeout(t);
  }
}

export async function ollamaReplies(url: string, model: string, body: AIRequest, timeoutMs = 60000): Promise<Record<string, string[]> | null> {
  const ids = aiIds(body);
  if (!ids.length || !model) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${trimUrl(url)}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        stream: false,
        format: aiSchema(ids),
        options: { temperature: 0.8, num_predict: 400 },
        messages: [
          { role: "system", content: AI_SYSTEM },
          { role: "user", content: buildAIPrompt(body) },
        ],
      }),
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { message?: { content?: string } };
    return parseAIReplies(d.message?.content ?? "", ids);
  } finally {
    clearTimeout(t);
  }
}
