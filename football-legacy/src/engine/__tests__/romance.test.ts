import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import { commitRomance, createFan, fanThreadId, goOnDate, maybeNewFan, partnerOf, planRomance, romance, romanceWeekly } from "../social/romance";
import type { GameState } from "../types";
import { playerCareer, run } from "./helpers";

function talk(g: GameState, fanId: string, text: string) {
  const p = planRomance(g, fanThreadId(fanId), text)!;
  commitRomance(g, p);
  return p.lines.join(" ");
}

function newFan(g: GameState, rng = new Rng(5)) {
  const f = createFan(g, rng);
  romance(g).fans.push(f);
  return f;
}

describe("vida pessoal", () => {
  it("fãs aparecem com a fama e são sempre adultas", () => {
    const g = playerCareer(81);
    g.players[g.user.playerId!].reputation = 80;
    const rng = new Rng(9);
    for (let i = 0; i < 40; i++) maybeNewFan(g, rng, 0.3);
    const fans = romance(g).fans;
    expect(fans.length).toBeGreaterThan(0);
    expect(fans.length).toBeLessThanOrEqual(5);
    for (const f of fans) { expect(f.age).toBeGreaterThanOrEqual(20); expect(g.chat.threads[fanThreadId(f.id)].messages.length).toBeGreaterThan(0); }
  });

  it("conversa sobe atração; grosseria derruba", () => {
    const g = playerCareer(82);
    const f = newFan(g);
    const a0 = f.attraction;
    talk(g, f.id, "oi! o que voce faz da vida?");
    expect(f.stage).toBe("conversando");
    expect(f.attraction).toBeGreaterThan(a0);
    const a1 = f.attraction;
    const reply = talk(g, f.id, "manda nudes");
    expect(f.attraction).toBeLessThan(a1 - 10);
    expect(reply.toLowerCase()).toMatch(/respeito|calma|diferente/);
  });

  it("encontros levam a ficar e a namorar; namoro dá moral e notícia", () => {
    const g = playerCareer(83);
    g.user.money = 100_000;
    const f = newFan(g);
    f.attraction = 70; f.affection = 30; f.stage = "conversando";
    const rng = new Rng(3);
    for (let i = 0; i < 4; i++) { g.day += 4; goOnDate(g, f.id, "jantar", rng); }
    expect(f.dates).toBe(4);
    expect(["ficando", "conversando"]).toContain(f.stage);
    f.affection = Math.max(f.affection, 70); f.trust = 60;
    const me = g.players[g.user.playerId!];
    const morale = me.morale;
    talk(g, f.id, "quer namorar comigo?");
    expect(partnerOf(g)?.id).toBe(f.id);
    expect(f.stage).toBe("namorando");
    expect(me.morale).toBeGreaterThan(morale);
    expect(g.news.some((n) => n.title.includes("assume namoro"))).toBe(true);
  });

  it("pedido cedo demais é recusado", () => {
    const g = playerCareer(84);
    const f = newFan(g);
    talk(g, f.id, "quer namorar comigo?");
    expect(partnerOf(g)).toBeUndefined();
  });

  it("namorando, flertar com outra pode gerar ciúme e término", () => {
    const g = playerCareer(85);
    const p = newFan(g); p.stage = "namorando"; p.vibe = "ciumenta"; p.trust = 30; p.affection = 60;
    romance(g).partnerId = p.id;
    let found = false;
    for (let i = 0; i < 30 && !found; i++) {
      const other = newFan(g, new Rng(100 + i));
      g.day++;
      talk(g, other.id, "tu é linda demais");
      found = p.trust < 30;
    }
    expect(found).toBe(true);
  });

  it("noivado vira casamento com o tempo", () => {
    const g = playerCareer(86);
    const p = newFan(g); p.stage = "namorando"; p.affection = 95; p.trust = 80; p.stageDay = g.day - 120;
    romance(g).partnerId = p.id;
    talk(g, p.id, "casa comigo?");
    expect(p.stage).toBe("noivos");
    g.day = romance(g).weddingDay! + 1;
    romanceWeekly(g, new Rng(1));
    expect(p.stage).toBe("casados");
    expect(g.history.milestones.some((m) => m.text.startsWith("Casou com"))).toBe(true);
  });

  it("uma temporada com a vida pessoal ativa não quebra o jogo", () => {
    const g = playerCareer(87);
    g.players[g.user.playerId!].reputation = 70;
    run(g, 120);
    for (const f of romance(g).fans) expect(g.chat.threads[fanThreadId(f.id)]).toBeDefined();
  });
});
