"use client";
import { useMemo, useState } from "react";
import { useG, useGame } from "@/store/game";
import { FORMATIONS, FORMATION_COORDS, POS_LABEL, POSITIONS } from "@/engine/constants";
import { autoLineup, validateLineup } from "@/engine/match/lineup";
import { contractRenewalTerms, releasePlayer, renewContract } from "@/engine/market/transfers";
import { getRel, USER_COACH_ID } from "@/engine/chemistry/relations";
import { formatMoney, posRating, shortName } from "@/engine/world/players";
import { withRng } from "@/engine/season/advance";
import type { Mentality, Player } from "@/engine/types";
import { age, myClub, potentialRange } from "@/lib/view";
import { Bar, Modal, PageTitle, Section, Tabs } from "@/components/ui";

const MENT = ["Retranca", "Defensivo", "Equilibrado", "Ofensivo", "Ataque total"];

export default function Elenco() {
  const g = useG();
  const act = useGame((s) => s.act);
  const toast = useGame((s) => s.showToast);
  const club = myClub(g);
  const [tab, setTab] = useState<"elenco" | "escalacao">(g.user.mode === "coach" ? "escalacao" : "elenco");
  const [sel, setSel] = useState<number | null>(null);
  const [renew, setRenew] = useState<Player | null>(null);
  const [wage, setWage] = useState(0);
  const coach = g.user.mode === "coach" && !g.user.unemployed;
  const meRef = g.user.mode === "player" ? g.user.playerId : USER_COACH_ID;
  const lineup = useMemo(() => (club ? validateLineup(g, club.squad, club.tactic.formation, club.lineup) : { xi: [], bench: [] }), [g, club, club?.lineup, club?.tactic.formation]);
  if (!club) return <PageTitle kicker="(06) Elenco" title="Sem clube" />;
  const slots = FORMATIONS[club.tactic.formation];
  const coords = FORMATION_COORDS[club.tactic.formation];
  const squad = club.squad.map((id) => g.players[id]).filter(Boolean).sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || b.ovr - a.ovr);

  const setXI = (xi: string[]) => act((gg) => { gg.clubs[club.id].lineup = xi; });
  const place = (pid: string) => {
    if (sel === null) return;
    const xi = [...lineup.xi];
    const existing = xi.indexOf(pid);
    if (existing >= 0) [xi[existing], xi[sel]] = [xi[sel], xi[existing]];
    else xi[sel] = pid;
    setXI(xi);
    setSel(null);
  };

  return (
    <div>
      <PageTitle kicker="(06) Elenco" title={club.name} meta={<><span>{squad.length} jogadores</span><span>Esquema {club.tactic.formation}</span><span>Entrosamento {Math.round(club.cohesion)}</span></>} />
      <Tabs value={tab} onChange={setTab} items={[{ id: "escalacao", label: coach ? "Escalação e tática" : "Time provável" }, { id: "elenco", label: "Elenco completo" }]} />

      {tab === "escalacao" && (
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            {coach && (
              <div className="mb-6 space-y-3">
                <div className="flex flex-wrap gap-2">{Object.keys(FORMATIONS).map((f) => <button key={f} className="chip" data-on={club.tactic.formation === f} onClick={() => act((gg) => { const c = gg.clubs[club.id]; c.tactic.formation = f; c.lineup = autoLineup(gg, c.squad, f).xi; })}>{f}</button>)}</div>
                <div className="flex flex-wrap gap-2">{MENT.map((m, i) => <button key={m} className="chip" data-on={club.tactic.mentality === i - 2} onClick={() => act((gg) => { gg.clubs[club.id].tactic.mentality = (i - 2) as Mentality; })}>{m}</button>)}</div>
                <div className="flex flex-wrap gap-2">{["Pressão baixa", "Pressão média", "Pressão alta"].map((m, i) => <button key={m} className="chip" data-on={club.tactic.pressing === i} onClick={() => act((gg) => { gg.clubs[club.id].tactic.pressing = i as 0 | 1 | 2; })}>{m}</button>)}</div>
                <button className="btn btn-sm" onClick={() => setXI(autoLineup(g, club.squad, club.tactic.formation).xi)}>Escalar automaticamente</button>
              </div>
            )}
            {/* campinho */}
            <div className="relative mx-auto aspect-[3/4] w-full max-w-md border line surface">
              <div className="absolute inset-x-0 top-1/2 border-t line" />
              <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border line" />
              <div className="absolute bottom-0 left-1/2 h-14 w-40 -translate-x-1/2 border-x border-t line" />
              {lineup.xi.map((id, i) => {
                const p = g.players[id];
                const [x, y] = coords[i] ?? [50, 50];
                const out = p && p.pos !== slots[i] && !p.alt.includes(slots[i]);
                return (
                  <button key={`${id}-${i}`} disabled={!coach} onClick={() => setSel(sel === i ? null : i)} className="absolute flex -translate-x-1/2 translate-y-1/2 flex-col items-center gap-0.5" style={{ left: `${x}%`, bottom: `${y}%` }}>
                    <span className={`num grid h-9 w-9 place-items-center rounded-full border text-[12px] transition-colors duration-300 ${sel === i ? "border-accent bg-accent text-ink" : p?.isUser ? "border-accent text-accent bg-ink" : "line bg-ink"}`}>{p ? Math.round(posRating(p, slots[i])) : "—"}</span>
                    <span className={`max-w-[72px] truncate text-[10.5px] ${out ? "faint" : ""}`}>{p ? shortName(p) : "vago"}</span>
                    <span className="label text-[8.5px]">{slots[i]}</span>
                  </button>
                );
              })}
            </div>
            {coach && <p className="dim mt-3 text-center text-xs">{sel === null ? "Toque numa posição e depois num jogador da lista para trocar." : `Escolha quem joga de ${POS_LABEL[slots[sel]].toLowerCase()}.`}</p>}
          </div>
          <div className="lg:col-span-6">
            <div className="label mb-2">{sel !== null ? `Opções para ${slots[sel]}` : "Banco e reservas"}</div>
            <ul>
              {squad
                .filter((p) => sel !== null || !lineup.xi.includes(p.id))
                .sort((a, b) => (sel !== null ? posRating(b, slots[sel]) - posRating(a, slots[sel]) : 0))
                .map((p) => (
                  <li key={p.id}>
                    <button disabled={!coach || sel === null || !!p.injury || p.suspended > 0} onClick={() => place(p.id)} className="flex w-full items-center gap-3 border-b line py-2 text-left text-sm transition-colors duration-300 enabled:hover:bg-white/5 disabled:cursor-default">
                      <span className="num faint w-8">{p.pos}</span>
                      <span className={`flex-1 truncate ${p.isUser ? "text-accent" : ""}`}>{p.first} {p.last}</span>
                      {p.injury && <span className="text-xs">lesão {p.injury.days}d</span>}
                      {p.suspended > 0 && <span className="text-xs">suspenso</span>}
                      {lineup.bench.includes(p.id) && sel === null && <span className="label text-[9px]">banco</span>}
                      <span className="num w-10 text-right">{sel !== null ? Math.round(posRating(p, slots[sel])) : p.ovr}</span>
                      <span className="w-14"><Bar value={p.fitness} /></span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "elenco" && (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="t min-w-[720px]">
            <thead><tr><th>Pos</th><th>Jogador</th><th className="text-right">Idade</th><th className="text-right">OVR</th><th className="text-right">Pot.</th><th>Físico</th><th>Moral</th><th className="text-right">J/G/A</th><th className="text-right">Valor</th><th className="text-right">Contrato</th>{g.user.mode === "player" && <th>Amizade</th>}{coach && <th />}</tr></thead>
            <tbody>
              {squad.map((p) => {
                const r = getRel(g, meRef ?? "", p.id);
                return (
                  <tr key={p.id} className={p.isUser ? "me" : ""}>
                    <td className="num faint">{p.pos}</td>
                    <td><span className="truncate">{p.first} {p.last}</span>{p.injury && <span className="dim ml-2 text-xs">+{p.injury.days}d</span>}{p.listed && <span className="dim ml-2 text-xs">à venda</span>}</td>
                    <td className="num text-right">{age(g, p)}</td>
                    <td className="num text-right">{p.ovr}</td>
                    <td className="num text-right dim">{potentialRange(g, p)}</td>
                    <td className="w-20"><Bar value={p.fitness} /></td>
                    <td className="w-20"><Bar value={p.morale} /></td>
                    <td className="num text-right">{p.stats.apps}/{p.stats.goals}/{p.stats.assists}</td>
                    <td className="num text-right">{formatMoney(p.value)}</td>
                    <td className={`num text-right ${p.contract.until <= g.season ? "text-accent" : ""}`}>{2027 + p.contract.until}</td>
                    {g.user.mode === "player" && <td className="w-20">{!p.isUser && r ? <Bar value={r.friendship} accent /> : null}</td>}
                    {coach && (
                      <td className="text-right">
                        <span className="inline-flex gap-1">
                          <button className="btn btn-sm" onClick={() => { setRenew(p); setWage(contractRenewalTerms(g, p).wage); }}>Renovar</button>
                          <button className="btn btn-sm" onClick={() => act((gg) => { gg.players[p.id].listed = !gg.players[p.id].listed; })}>{p.listed ? "Tirar da venda" : "Vender"}</button>
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {renew && (
        <Modal onClose={() => setRenew(null)}>
          <div className="label">Renovação de contrato</div>
          <h2 className="mt-2 text-2xl">{renew.first} {renew.last}</h2>
          <p className="dim mt-2 text-sm">Salário atual {formatMoney(renew.contract.wage)}/sem · contrato até {2027 + renew.contract.until}. Pedido do jogador: cerca de {formatMoney(contractRenewalTerms(g, renew).wage)}/sem.</p>
          <label className="mt-5 block"><span className="label">Sua oferta (semanal) · {formatMoney(wage)}</span>
            <input type="range" min={Math.round(renew.contract.wage * 0.6)} max={Math.round(contractRenewalTerms(g, renew).wage * 1.5)} step={100} value={wage} onChange={(e) => setWage(+e.target.value)} className="mt-3 w-full accent-[#3ee27f]" />
          </label>
          <div className="mt-6 flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((y) => (
              <button key={y} className="btn" onClick={() => { const r = act((gg) => withRng(gg, (rng) => renewContract(gg, rng, renew.id, wage, y))); if (r) toast(r.msg); setRenew(null); }}>{y} temporada{y > 1 ? "s" : ""}</button>
            ))}
          </div>
          <button className="btn btn-sm btn-ghost dim mt-4" onClick={() => { if (confirm(`Dispensar ${renew.first} ${renew.last}? Ele vira agente livre.`)) { act((gg) => releasePlayer(gg, renew.id)); setRenew(null); } }}>Dispensar jogador</button>
        </Modal>
      )}
      <Section title="Como funciona" className="mt-12">
        <p className="dim max-w-2xl text-sm leading-relaxed">
          {coach ? "O número em cada posição é o rendimento do jogador ali (fora da posição ele perde de 3% a 20%). Cansaço e moral pesam no jogo. Jogadores com contrato no fim em verde precisam renovar até o fim da temporada ou saem de graça." : "O técnico escala pelo rendimento na posição, condição física, forma recente e pela relação com cada um. Treine bem, jogue bem e a vaga aparece."}
        </p>
      </Section>
    </div>
  );
}
