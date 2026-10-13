import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

// Integração com a API da Anthropic. Só roda no servidor: a chave nunca chega ao navegador.

export const AI_MODEL = process.env.SITEPLAN_AI_MODEL?.trim() || "claude-opus-5-5";

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 5 * 60_000, maxRetries: 1 });
  return client;
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

/**
 * Pede uma resposta estruturada. O formato é imposto pela API (structured outputs) e
 * validado de novo aqui com Zod antes de seguir para a normalização.
 */
export async function structured<S extends z.ZodType>(schema: S, system: string, user: string, maxTokens = 32_000): Promise<z.infer<S>> {
  try {
    const stream = getClient().beta.messages.stream({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      // Se o modelo recusar por política, a API tenta de novo com o modelo indicado para a categoria.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") throw new AiError("A IA recusou este pedido. Revise o briefing ou use o modo demonstração.", 422);
    if (message.stop_reason === "max_tokens") throw new AiError("A resposta da IA ficou grande demais e foi cortada. Tente com menos serviços ou páginas.", 502);
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    let data: unknown;
    try {
      data = message.parsed_output ?? JSON.parse(text);
    } catch {
      throw new AiError("A IA devolveu um formato inválido.");
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new AiError("A resposta da IA não segue o formato esperado.");
    return parsed.data;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AiError("A chave de IA configurada no servidor é inválida.", 500);
    if (e instanceof Anthropic.RateLimitError) throw new AiError("Limite de uso da IA atingido. Tente de novo em alguns minutos.", 429);
    if (e instanceof Anthropic.APIConnectionError) throw new AiError("Não foi possível conectar ao provedor de IA.", 503);
    if (e instanceof Anthropic.APIError) throw new AiError(`O provedor de IA respondeu com erro (${e.status ?? "sem status"}).`);
    throw new AiError("Erro inesperado na geração com IA.", 500);
  }
}
