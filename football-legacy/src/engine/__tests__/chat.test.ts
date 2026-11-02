import { describe, expect, it } from "vitest";
import { analyze, normalize } from "../chat/intents";
import { dmId, ensureDm, ensureTeamThread, planTurn, sendMessage } from "../chat/chat";
import { getRel } from "../chemistry/relations";
import { hasMemory } from "../chat/memory";
import { acceptOffer } from "../market/transfers";
import { processChatTriggers } from "../chat/triggers";
import { Rng } from "../rng";
import type { PersonalityType } from "../types";
import { playerCareer } from "./helpers";

describe("compreensão de mensagens", () => {
  const g = playerCareer(41);
  it("normaliza gírias, abreviações e letras repetidas", () => {
    expect(normalize("Maanoooo, vc ta bem?")).toContain("mano");
    expect(normalize("vc tá bem")).toContain("voce esta");
    expect(normalize("KKKKKKK")).toContain("kkk");
  });
  it("entende intenção mesmo com erro de digitação", () => {
    expect(analyze(g, "Mano, tô pensando em sair do clube", []).top).toBe("sair_clube");
    expect(analyze(g, "recebi uma propsta", []).top).toBe("proposta");
    expect(analyze(g, "esse jogo vai ser facil kkkk", []).top).toBe("jogo_facil");
    expect(analyze(g, "foi mal irmão", []).top).toBe("desculpa");
    expect(analyze(g, "ja assinei com outro clube", []).top).toBe("assinei");
    expect(analyze(g, "parabéns pelo niver!!", []).top).toBe("aniversario");
  });
  it("extrai valores em dinheiro", () => {
    const a = analyze(g, "tão oferecendo 20 milhões", []);
    expect(a.money).toBe(20_000_000);
  });
});

describe("personagens", () => {
  it("cada personalidade responde diferente à mesma mensagem", () => {
    const g = playerCareer(43);
    const club = g.clubs[g.user.clubId!];
    const types: PersonalityType[] = ["brincalhao", "leal", "ambicioso", "timido", "arrogante", "lider", "emocional", "competitivo"];
    const answers = new Set<string>();
    types.forEach((t, i) => {
      const p = g.players[club.squad[i]];
      if (p.isUser) return;
      p.persona.type = t;
      ensureDm(g, p.id);
      const out = sendMessage(g, dmId(p.id), "Mano, tô pensando em sair do clube");
      expect(out.length).toBeGreaterThan(0);
      answers.add(out.map((m) => m.text.toLowerCase()).join(" "));
    });
    expect(answers.size).toBeGreaterThanOrEqual(6);
  });

  it("não inventa proposta: sem proposta real, reage como rumor", () => {
    const g = playerCareer(44);
    const p = g.players[g.clubs[g.user.clubId!].squad[0]];
    ensureDm(g, p.id);
    expect(g.offers.filter((o) => o.direction === "user" && o.status === "pendente").length).toBe(0);
    const plan = planTurn(g, dmId(p.id), "recebi uma proposta do Real Madrid");
    expect(plan.facts.join(" ")).toContain("Não existe nenhuma proposta real");
    expect(plan.responders[0].reply.id.startsWith("prop_rumor")).toBe(true);
  });

  it("lembra da promessa e reage à saída sem aviso", () => {
    const g = playerCareer(45);
    const meId = g.user.playerId!;
    const club = g.clubs[g.user.clubId!];
    const friend = g.players[club.squad.find((id) => id !== meId)!];
    friend.persona.type = "leal";
    const rel = getRel(g, meId, friend.id)!;
    rel.friendship = 80;
    const buyer = Object.values(g.clubs).find((c) => c.id !== club.id)!;
    g.offers.push({ id: "oZ", playerId: meId, fromClubId: buyer.id, toClubId: club.id, fee: 50_000_000, wage: 40_000, years: 3, role: "titular", day: g.day, expires: g.day + 5, status: "pendente", direction: "user" });
    acceptOffer(g, "oZ");
    const trustBefore = rel.trust;
    processChatTriggers(g, new Rng(3));
    expect(g.chat.threads[dmId(friend.id)].messages.length).toBeGreaterThan(0);
    expect(hasMemory(g, friend.id, "saiu_sem_avisar") || hasMemory(g, friend.id, "quebrou_promessa")).toBeTruthy();
    expect(rel.trust).toBeLessThan(trustBefore);
    // pedir desculpas reaproxima, com variação limitada
    g.day += 1;
    const out = sendMessage(g, dmId(friend.id), "foi mal irmão");
    expect(out.length).toBeGreaterThan(0);
    expect(hasMemory(g, friend.id, "reconciliacao")).toBeTruthy();
  });

  it("grupo: mais de um responde e o cauteloso contradiz o confiante com dado real", () => {
    const g = playerCareer(46);
    const t = ensureTeamThread(g)!;
    const [a, b] = t.members.map((id) => g.players[id]);
    a.persona.type = "brincalhao"; a.persona.extro = 1;
    b.persona.type = "lider"; b.persona.extro = 1;
    t.members = [a.id, b.id];
    const plan = planTurn(g, t.id, "Mano, esse jogo vai ser fácil");
    expect(plan.responders.length).toBe(2);
    const ids = plan.responders.map((r) => r.reply.id);
    expect(ids.some((x) => x.startsWith("facil_conf"))).toBe(true);
    expect(ids.some((x) => x.startsWith("facil_cautela"))).toBe(true);
  });

  it("relação não muda de forma exagerada numa conversa", () => {
    const g = playerCareer(47);
    const p = g.players[g.clubs[g.user.clubId!].squad[1]];
    ensureDm(g, p.id);
    const before = getRel(g, g.user.playerId!, p.id)!.friendship;
    for (let i = 0; i < 10; i++) sendMessage(g, dmId(p.id), "jogou muito, craque");
    const after = getRel(g, g.user.playerId!, p.id)!.friendship;
    expect(after - before).toBeLessThanOrEqual(8.5);
  });

  it("evita repetir a mesma fala seguidamente", () => {
    const g = playerCareer(48);
    const p = g.players[g.clubs[g.user.clubId!].squad[2]];
    p.persona.type = "brincalhao";
    ensureDm(g, p.id);
    const a = planTurn(g, dmId(p.id), "eai");
    sendMessage(g, dmId(p.id), "eai");
    const b = planTurn(g, dmId(p.id), "eai");
    expect(a.responders[0].reply.id === b.responders[0].reply.id && a.responders[0].lines.join() === b.responders[0].lines.join()).toBe(false);
  });
});
