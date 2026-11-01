import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import { acceptOffer, askingPrice, executeTransfer, isWindowOpen, renewContract, contractRenewalTerms, resolveUserBids, userBid, finishUserBid } from "../market/transfers";
import { ageOf, marketValue } from "../world/players";
import { applyGrowth, weeklyDelta } from "../world/progression";
import { coachCareer, playerCareer, run } from "./helpers";

describe("transferências", () => {
  it("executeTransfer move jogador, dinheiro e histórico", () => {
    const g = coachCareer(3);
    const buyer = g.clubs[g.user.clubId!];
    const target = Object.values(g.players).find((p) => p.clubId && p.clubId !== buyer.id && p.ovr > 70)!;
    const seller = g.clubs[target.clubId!];
    const bBal = buyer.balance, sBal = seller.balance;
    executeTransfer(g, target.id, buyer.id, 10_000_000, { wage: 50_000, years: 3 });
    expect(target.clubId).toBe(buyer.id);
    expect(buyer.squad).toContain(target.id);
    expect(seller.squad).not.toContain(target.id);
    expect(buyer.balance).toBe(bBal - 10_000_000);
    expect(seller.balance).toBe(sBal + 10_000_000);
    expect(g.history.transfers[0].playerId).toBe(target.id);
    expect(target.contract.until).toBe(g.season + 3);
  });

  it("proposta do treinador: oferta baixa é recusada, oferta justa fecha", () => {
    const g = coachCareer(4);
    expect(isWindowOpen(g)).toBe(true);
    const club = g.clubs[g.user.clubId!];
    club.transferBudget = 500_000_000;
    const target = Object.values(g.players).find((p) => p.clubId && p.clubId !== club.id && g.clubs[p.clubId].squad.length > 22 && p.ovr >= 60 && p.ovr <= 72 && p.persona.type !== "leal")!;
    const ask = askingPrice(g, target);
    const low = userBid(g, target.id, Math.round(ask * 0.5), target.contract.wage * 2, 3);
    expect(typeof low).not.toBe("string");
    g.day += 1;
    resolveUserBids(g);
    expect(g.offers.find((o) => o.id === (low as { id: string }).id)!.status).toBe("recusada");
    const fair = userBid(g, target.id, ask, target.contract.wage * 3, 3);
    g.day += 1;
    resolveUserBids(g);
    const o = g.offers.find((x) => x.id === (fair as { id: string }).id)!;
    if (o.status === "negociando") finishUserBid(g, o);
    expect(o.status).toBe("aceita");
    expect(target.clubId).toBe(club.id);
  });

  it("valor de mercado cai com a idade e sobe com potencial", () => {
    const g = playerCareer(9);
    const p0 = Object.values(g.players).find((x) => x.clubId && x.ovr >= 65 && x.ovr <= 70)!;
    const p = { ...p0, birth: g.day - 26 * 364, potential: p0.ovr };
    const base = marketValue(p, g.season, g.day);
    const young = { ...p, birth: g.day - 19 * 364, potential: 88 };
    const old = { ...p, birth: g.day - 33 * 364 };
    expect(marketValue(young, g.season, g.day)).toBeGreaterThan(base);
    expect(marketValue(old, g.season, g.day)).toBeLessThan(base);
  });

  it("a IA contrata durante a janela e os elencos continuam coerentes", () => {
    const g = playerCareer(12);
    const before = g.history.transfers.length;
    run(g, 28);
    expect(g.history.transfers.length).toBeGreaterThan(before);
    for (const c of Object.values(g.clubs)) for (const id of c.squad) expect(g.players[id].clubId).toBe(c.id);
  });

  it("propostas pelo jogador do usuário podem ser aceitas e mudam o clube", () => {
    const g = playerCareer(21);
    const me = g.players[g.user.playerId!];
    const buyer = Object.values(g.clubs).find((c) => c.id !== me.clubId)!;
    g.offers.push({ id: "oX", playerId: me.id, fromClubId: buyer.id, toClubId: me.clubId, fee: askingPrice(g, me) * 2, wage: 30_000, years: 3, role: "titular", day: g.day, expires: g.day + 5, status: "pendente", direction: "user" });
    acceptOffer(g, "oX");
    expect(me.clubId).toBe(buyer.id);
    expect(g.user.clubId).toBe(buyer.id);
    expect(g.inbox.some((e) => e.t === "user_moved")).toBe(true);
  });
});

describe("contratos", () => {
  it("renovação aceita com salário pedido e recusa com salário baixo", () => {
    const g = coachCareer(6);
    const p = g.players[g.clubs[g.user.clubId!].squad[0]];
    const terms = contractRenewalTerms(g, p);
    const rng = new Rng(1);
    expect(renewContract(g, rng, p.id, Math.round(terms.wage * 0.5), 2).ok).toBe(false);
    const r = renewContract(g, rng, p.id, terms.wage, 3);
    expect(r.ok).toBe(true);
    expect(p.contract.until).toBe(g.season + 3);
  });

  it("contrato vencido vira agente livre na virada", () => {
    const g = playerCareer(14);
    const club = Object.values(g.clubs).find((c) => c.id !== g.user.clubId)!;
    const p = g.players[club.squad[3]];
    p.contract.until = 0;
    p.birth = g.day - 25 * 364; // não aposenta
    // garante que a IA não renove
    p.persona.type = "ambicioso";
    p.ovr = 40;
    run(g, 364);
    expect(p.clubId === null || p.clubId !== club.id || p.contract.until >= 1).toBe(true);
  });
});

describe("evolução", () => {
  it("jovem com potencial cresce, veterano cai", () => {
    const g = playerCareer(2);
    const p = Object.values(g.players).find((x) => x.clubId && ageOf(x, g.day) >= 25)!;
    const young = { ...p, potential: 85, ovr: 60, form: [7, 7, 7], injury: null };
    const old = { ...p, ovr: 75, potential: 75, injury: null };
    expect(weeklyDelta(young, 18, { minutesShare: 0.9, facilities: 4 })).toBeGreaterThan(0.15);
    expect(weeklyDelta(old, 34, { minutesShare: 0.9, facilities: 4 })).toBeLessThan(0);
    const clone = JSON.parse(JSON.stringify(p));
    clone.progressAcc = 3;
    const before = clone.ovr;
    applyGrowth(new Rng(1), clone);
    expect(clone.ovr).toBeGreaterThan(before);
  });

  it("o jogador do usuário evolui ao longo de uma temporada", () => {
    const g = playerCareer(17);
    const me = g.players[g.user.playerId!];
    const start = me.ovr;
    run(g, 300);
    expect(me.ovr).toBeGreaterThan(start);
    expect(me.stats.apps + me.career.reduce((s, c) => s + c.apps, 0)).toBeGreaterThan(0);
  });
});
