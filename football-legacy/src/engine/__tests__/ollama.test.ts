import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { ollamaModels, ollamaReplies } from "@/lib/ollama";
import { parseAIReplies, type AIRequest } from "../chat/aiPrompt";
import { planTurn, ensureTeamThread } from "../chat/chat";
import { playerCareer } from "./helpers";

let server: http.Server;
let url = "";
let lastBody: Record<string, unknown> | null = null;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === "/api/tags") { res.end(JSON.stringify({ models: [{ name: "llama3.2:latest" }] })); return; }
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      lastBody = JSON.parse(data);
      const ids = ((lastBody!.format as { properties: { replies: { items: { properties: { id: { enum: string[] } } } } } }).properties.replies.items.properties.id.enum);
      res.end(JSON.stringify({ message: { role: "assistant", content: JSON.stringify({ replies: ids.map((id) => ({ id, lines: ["kkkk tá maluco, mano?"] })) }) } }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

describe("Ollama", () => {
  it("lista modelos", async () => {
    expect(await ollamaModels(url)).toEqual(["llama3.2:latest"]);
  });

  it("manda fatos, personalidades e schema JSON, e devolve falas por personagem", async () => {
    const g = playerCareer(61);
    const t = ensureTeamThread(g)!;
    const plan = planTurn(g, t.id, "Mano, tô pensando em sair do clube");
    const req: AIRequest = { facts: plan.facts, profiles: plan.profiles, recent: plan.recent, message: plan.text, draft: Object.fromEntries(plan.responders.map((r) => [r.id, r.lines])) };
    const out = await ollamaReplies(url, "llama3.2:latest", req);
    expect(lastBody!.model).toBe("llama3.2:latest");
    expect(lastBody!.stream).toBe(false);
    const msgs = lastBody!.messages as { role: string; content: string }[];
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].content).toContain("Não existe nenhuma proposta real");
    expect(Object.keys(out!)).toEqual(plan.responders.map((r) => r.id));
  });

  it("tolera texto em volta do JSON e ignora ids inventados", () => {
    const r = parseAIReplies('Claro! {"replies":[{"id":"p1","lines":["oi"]},{"id":"pX","lines":["intruso"]}]} fim', ["p1"]);
    expect(r).toEqual({ p1: ["oi"] });
    expect(parseAIReplies("sem json", ["p1"])).toBeNull();
  });

  it("falha de conexão não quebra (o jogo cai para o modo local)", async () => {
    await expect(ollamaModels("http://127.0.0.1:1", 500)).rejects.toBeTruthy();
  });
});
