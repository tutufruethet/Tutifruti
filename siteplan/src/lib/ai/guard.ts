import "server-only";

const hits = new Map<string, number[]>();

/** Limite simples por IP em memória: protege a chave de uso abusivo em instâncias únicas. */
export function rateLimited(req: Request, max = 8, windowMs = 10 * 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

/** Lê o corpo JSON com limite de tamanho. */
export async function readJson(req: Request, maxBytes = 300_000): Promise<unknown> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new Error("too-large");
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("too-large");
  return JSON.parse(text);
}

export const jsonError = (message: string, status: number, details?: string[]) =>
  Response.json({ error: message, details }, { status });
