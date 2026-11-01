import { describe, expect, it } from "vitest";
import { createWorld } from "../world/generate";
import { createMatch, finalizeMatch, simulateToEnd } from "../match/engine";
import type { Fixture, GameState } from "../types";

function fx(g: GameState, h: string, a: string, i: number, tie = false): Fixture {
  const f: Fixture = { id: `t${i}`, compId: "L-ING-1", season: 0, day: 0, homeId: h, awayId: a, round: "teste", played: false, importance: 1, tieId: tie ? `x-${i}` : undefined };
  g.fixtures[f.id] = f;
  return f;
}

describe("motor de partidas", () => {
  const g = createWorld(2024);
  const ing = Object.values(g.clubs).filter((c) => c.leagueId === "L-ING-1").sort((a, b) => b.reputation - a.reputation);
  const second = Object.values(g.clubs).filter((c) => c.leagueId === "L-ING-2").sort((a, b) => a.reputation - b.reputation);

  it("é determinístico para a mesma semente", () => {
    const f = fx(g, ing[0].id, ing[5].id, 1);
    const r1 = finalizeMatch(g, simulateToEnd(g, createMatch(g, f)));
    const r2 = finalizeMatch(g, simulateToEnd(g, createMatch(g, f)));
    expect([r1.hg, r1.ag, r1.shots]).toEqual([r2.hg, r2.ag, r2.shots]);
  });

  it("produz placares plausíveis e vantagem de mando", () => {
    let goals = 0, home = 0, draw = 0, n = 0;
    for (let i = 0; i < 400; i++) {
      const h = ing[i % 16], a = ing[(i * 7 + 3) % 16];
      if (h.id === a.id) continue;
      const r = finalizeMatch(g, simulateToEnd(g, createMatch(g, fx(g, h.id, a.id, 100 + i))));
      goals += r.hg + r.ag; n++;
      if (r.hg > r.ag) home++; else if (r.hg === r.ag) draw++;
    }
    const avg = goals / n;
    expect(avg).toBeGreaterThan(2.0);
    expect(avg).toBeLessThan(3.4);
    expect(home / n).toBeGreaterThan(0.36);
    expect(home / n).toBeLessThan(0.58);
    expect(draw / n).toBeGreaterThan(0.12);
  });

  it("o mais forte vence mais, mas não sempre", () => {
    let w = 0, l = 0, n = 0;
    for (let i = 0; i < 300; i++) {
      const r = finalizeMatch(g, simulateToEnd(g, createMatch(g, fx(g, second[i % 5].id, ing[i % 3].id, 1000 + i))));
      n++;
      if (r.ag > r.hg) w++; else if (r.ag < r.hg) l++;
    }
    expect(w / n).toBeGreaterThan(0.55);
    expect(w / n).toBeLessThan(0.93);
    expect(l).toBeGreaterThan(0);
  });

  it("mata-mata sempre tem vencedor", () => {
    for (let i = 0; i < 60; i++) {
      const r = finalizeMatch(g, simulateToEnd(g, createMatch(g, fx(g, ing[2].id, ing[3].id, 5000 + i, true))));
      if (r.hg === r.ag) {
        expect(r.pens).toBeDefined();
        expect(r.pens![0]).not.toBe(r.pens![1]);
      }
    }
  });

  it("estatísticas batem com eventos", () => {
    const r = finalizeMatch(g, simulateToEnd(g, createMatch(g, fx(g, ing[1].id, ing[9].id, 9000))));
    const goals = r.events.filter((e) => e.type === "goal" || e.type === "pen_goal");
    expect(goals.filter((e) => e.side === 0).length).toBe(r.hg);
    expect(goals.filter((e) => e.side === 1).length).toBe(r.ag);
    const lineGoals = r.lines.reduce((s, l) => s + l.goals, 0);
    expect(lineGoals).toBe(r.hg + r.ag);
    expect(r.poss[0] + r.poss[1]).toBe(100);
    expect(r.sot[0]).toBeLessThanOrEqual(r.shots[0]);
  });
});
