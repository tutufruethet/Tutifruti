import { describe, expect, it } from "vitest";
import { agentChat, AGENT_THREAD, ensureAgents, hireAgent, requestSearch } from "../career/agent";
import { advanceDay } from "../season/advance";
import { playerCareer, coachCareer } from "./helpers";

describe("agente", () => {
  it("agente de elite recusa jogador desconhecido; agente comum aceita", () => {
    const g = playerCareer(71);
    const agents = ensureAgents(g);
    const star = agents.find((a) => a.style === "Estrela")!;
    const cheap = agents.find((a) => a.style === "Iniciante")!;
    expect(hireAgent(g, star.id, "salario")).toMatch(/só agencia/);
    expect(hireAgent(g, cheap.id, "salario")).toMatch(/agora é seu agente/);
    expect(g.user.agent?.agentId).toBe(cheap.id);
  });

  it("procura clube e traz propostas reais com salário negociado", () => {
    const g = playerCareer(72);
    const a = ensureAgents(g).find((x) => x.style === "Raiz" || x.style === "Paizão")!;
    g.players[g.user.playerId!].reputation = 50;
    hireAgent(g, a.id, "salario");
    requestSearch(g);
    const until = g.user.agent!.searchUntil!;
    while (g.day <= until) { const r = advanceDay(g); if (r.stop === "match") advanceDay(g, { autoplayUser: true }); }
    const offers = g.offers.filter((o) => o.viaAgent);
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) { expect(g.clubs[o.fromClubId]).toBeDefined(); expect(o.wage).toBeGreaterThan(0); }
    expect(g.chat.threads[AGENT_THREAD].messages.length).toBeGreaterThan(1);
  });

  it("cobra comissão semanal e responde comandos no chat", () => {
    const g = playerCareer(73);
    const a = ensureAgents(g).find((x) => x.style === "Iniciante")!;
    hireAgent(g, a.id, "minutos");
    const money = g.user.money;
    for (let i = 0; i < 10; i++) { const r = advanceDay(g); if (r.stop === "match") advanceDay(g, { autoplayUser: true }); }
    expect(g.user.agent!.earned).toBeGreaterThan(0);
    agentChat(g, "quanto eu tô valendo?");
    const last = g.chat.threads[AGENT_THREAD].messages.at(-1)!;
    expect(last.from).toBe("agente");
    expect(last.text).toMatch(/valor de mercado/);
    void money;
  });

  it("no modo treinador, procura emprego", () => {
    const g = coachCareer(74);
    const a = ensureAgents(g).find((x) => x.style !== "Estrela")!;
    expect(hireAgent(g, a.id, "salario")).toMatch(/agora é seu agente/);
    requestSearch(g);
    const until = g.user.agent!.searchUntil!;
    while (g.day <= until) { const r = advanceDay(g); if (r.stop === "match") advanceDay(g, { autoplayUser: true }); }
    expect(g.user.agent!.reports.length).toBeGreaterThan(1);
  });
});
