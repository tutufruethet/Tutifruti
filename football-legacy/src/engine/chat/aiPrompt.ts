/**
 * Prompt e formato de resposta do modo IA avançada, compartilhados entre a
 * rota do servidor (Claude ou Ollama) e o Ollama chamado direto do navegador.
 * O modelo só reescreve as falas; regras, relações e memória ficam no motor.
 */
export interface AIProfile { id: string; name: string; persona: string; style: string; relation: string; memories: string[] }
export interface AIRequest { facts: string[]; profiles: AIProfile[]; recent: { from: string; text: string }[]; message: string; draft: Record<string, string[]> }

export const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);

export const AI_SYSTEM = `Você escreve mensagens de jogadores de futebol fictícios num app de mensagens do vestiário, dentro de um jogo.
Regras:
- Português do Brasil informal, como amigos de time conversando no celular. Mensagens curtas (1 a 2 balões, até ~25 palavras cada).
- Cada personagem mantém a personalidade e o estilo de escrita descritos. Nunca soe como assistente: nada de listas, formalidade, "como posso ajudar" ou explicações longas.
- Eles podem discordar, provocar, brincar, aconselhar e fazer perguntas, conforme a personalidade e a relação.
- Use apenas os fatos fornecidos sobre a carreira. Não invente resultados, placares, transferências, propostas, lesões ou valores. Se o usuário afirmar algo que os fatos não confirmam, o personagem pode duvidar ou tratar como boato.
- O rascunho de cada personagem indica a reação decidida pelo jogo; mantenha a mesma intenção e o mesmo tom, só deixe mais natural.
- Responda apenas pelos personagens listados, usando o id de cada um, no formato JSON pedido.`;

export function aiIds(body: AIRequest): string[] {
  return (body.profiles ?? []).slice(0, 3).map((p) => clip(p.id, 20));
}

export function buildAIPrompt(body: AIRequest): string {
  const profiles = (body.profiles ?? []).slice(0, 3);
  const ids = aiIds(body);
  return [
    "FATOS DA CARREIRA:", ...(body.facts ?? []).slice(0, 14).map((f) => `- ${clip(f, 300)}`),
    "", "PERSONAGENS:",
    ...profiles.map((p) => `- id ${clip(p.id, 20)} · ${clip(p.name, 40)}: ${clip(p.persona, 400)} Estilo: ${clip(p.style, 300)} Relação com o usuário: ${clip(p.relation, 120)}. Memórias: ${(p.memories ?? []).slice(0, 6).map((m) => clip(m, 160)).join(" | ") || "nenhuma"}`),
    "", "CONVERSA RECENTE:", ...(body.recent ?? []).slice(-10).map((m) => `${clip(m.from, 30)}: ${clip(m.text, 300)}`),
    "", `NOVA MENSAGEM DO USUÁRIO: ${clip(body.message, 500)}`,
    "", "RASCUNHOS (reação decidida pelo jogo):", ...ids.map((id) => `${id}: ${(body.draft?.[id] ?? []).map((l) => clip(l, 200)).join(" / ")}`),
    "", `Responda só com JSON: {"replies":[{"id":"<id>","lines":["mensagem"]}]} com um item para cada id: ${ids.join(", ")}.`,
  ].join("\n");
}

export function aiSchema(ids: string[]) {
  return {
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
}

/** Lê a resposta do modelo; tolera texto em volta do JSON (modelos locais). Retorna null se não der. */
export function parseAIReplies(text: string, ids: string[]): Record<string, string[]> | null {
  let raw = text.trim();
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  raw = raw.slice(a, b + 1);
  try {
    const parsed = JSON.parse(raw) as { replies?: { id?: unknown; lines?: unknown }[] };
    const out: Record<string, string[]> = {};
    for (const r of parsed.replies ?? []) {
      const id = String(r.id ?? "");
      if (!ids.includes(id)) continue;
      const lines = (Array.isArray(r.lines) ? r.lines : [r.lines]).map((l) => clip(l, 280).trim()).filter(Boolean).slice(0, 3);
      if (lines.length) out[id] = lines;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}
