"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useG, useGame } from "@/store/game";
import { POS_LABEL, POSITIONS } from "@/engine/constants";
import { acceptOffer, askingPrice, isWindowOpen, negotiateOffer, rejectOffer, userBid, wageDemand, windowLabel } from "@/engine/market/transfers";
import { formatDate, formatMoney } from "@/engine/world/players";
import { teamName } from "@/engine/season/schedule";
import { withRng } from "@/engine/season/advance";
import type { Player, Pos } from "@/engine/types";
import { age, myClub, potentialRange } from "@/lib/view";
import { Crest, Empty, Modal, PageTitle, Tabs } from "@/components/ui";

type Tab = "mercado" | "propostas" | "promessas" | "livres" | "movimentacoes";

function PlayerRows({ list, onPick, coach }: { list: Player[]; onPick: (p: Player) => void; coach: boolean }) {
  const g = useG();
  if (!list.length) return <Empty>Ninguém com esses filtros.</Empty>;
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="t min-w-[640px]">
        <thead><tr><th>Pos</th><th>Jogador</th><th className="text-right">Idade</th><th className="text-right">OVR</th><th className="text-right">Pot.</th><th>Clube</th><th className="text-right">Valor</th><th className="text-right">Salário</th>{coach && <th />}</tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id}>
              <td className="num faint">{p.pos}</td>
              <td className="truncate">{p.first} {p.last} <span className="faint text-xs">{p.nation}</span></td>
              <td className="num text-right">{age(g, p)}</td>
              <td className="num text-right">{p.ovr}</td>
              <td className="num text-right dim">{potentialRange(g, p)}</td>
              <td>{p.clubId ? <span className="flex items-center gap-2"><Crest g={g} id={p.clubId} size={14} /><span className="truncate">{g.clubs[p.clubId].short}</span></span> : <span className="dim">livre</span>}</td>
              <td className="num text-right">{formatMoney(p.value)}</td>
              <td className="num text-right dim">{formatMoney(p.contract.wage)}</td>
              {coach && <td className="text-right"><button className="btn btn-sm" onClick={() => onPick(p)}>Proposta</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Inner() {
  const g = useG();
  const act = useGame((s) => s.act);
  const toast = useGame((s) => s.showToast);
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("aba") as Tab) || "mercado";
  const club = myClub(g);
  const coach = g.user.mode === "coach" && !g.user.unemployed && !!club;
  const [pos, setPos] = useState<Pos | "">("");
  const [maxPrice, setMaxPrice] = useState(0);
  const [maxAge, setMaxAge] = useState(40);
  const [q, setQ] = useState("");
  const [fits, setFits] = useState(true);
  const [pick, setPick] = useState<Player | null>(null);
  const [fee, setFee] = useState(0);
  const [wage, setWage] = useState(0);
  const [years, setYears] = useState(3);

  const pool = useMemo(() => Object.values(g.players).filter((p) => !p.retired && !p.isUser && p.clubId !== g.user.clubId), [g, g.day]);
  const filtered = (base: Player[]) => base
    .filter((p) => (!pos || p.pos === pos) && age(g, p) <= maxAge && (!maxPrice || p.value <= maxPrice) && (!q || `${p.first} ${p.last}`.toLowerCase().includes(q.toLowerCase())))
    .filter((p) => !coach || !fits || !club || !p.clubId || askingPrice(g, p) <= club.transferBudget)
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 80);
  const market = filtered(pool.filter((p) => p.clubId));
  const youth = filtered(pool.filter((p) => age(g, p) <= 20 && p.potential >= 72)).sort((a, b) => b.potential - a.potential);
  const free = filtered(pool.filter((p) => !p.clubId));

  const userOffers = g.offers.filter((o) => o.direction === "user").sort((a, b) => b.day - a.day);
  const outOffers = g.offers.filter((o) => o.direction === "out").sort((a, b) => b.day - a.day);
  const inOffers = g.offers.filter((o) => o.direction === "in").sort((a, b) => b.day - a.day);
  const pendingCount = g.offers.filter((o) => o.status === "pendente" || o.status === "negociando").length;

  const openBid = (p: Player) => {
    setPick(p);
    setFee(p.clubId ? askingPrice(g, p) : 0);
    setWage(club ? wageDemand(g, p, club) : p.contract.wage);
    setYears(3);
  };

  const status = (s: string) => <span className={s === "aceita" ? "text-accent" : s === "pendente" || s === "negociando" ? "" : "faint"}>{s}</span>;

  return (
    <div>
      <PageTitle kicker="(07) Transferências" title="Mercado" meta={<><span className={isWindowOpen(g) ? "text-accent" : ""}>{windowLabel(g)}</span>{club && coach && <span>Orçamento {formatMoney(club.transferBudget)}</span>}</>} />
      <Tabs value={tab} onChange={(v) => router.push(`/jogo/transferencias?aba=${v}`)} items={[
        { id: "mercado", label: "Mercado" }, { id: "propostas", label: "Propostas", badge: pendingCount }, { id: "promessas", label: "Jovens promessas" }, { id: "livres", label: "Agentes livres" }, { id: "movimentacoes", label: "Movimentações" },
      ]} />

      {(tab === "mercado" || tab === "promessas" || tab === "livres") && (
        <div className="mb-5 flex flex-wrap gap-2">
          <input className="input max-w-[220px]" placeholder="Buscar nome" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input max-w-[160px]" value={pos} onChange={(e) => setPos(e.target.value as Pos | "")}><option value="">Todas posições</option>{POSITIONS.map((p) => <option key={p} value={p}>{POS_LABEL[p]}</option>)}</select>
          <select className="input max-w-[160px]" value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)}>
            <option value={0}>Qualquer valor</option>{[1e6, 5e6, 15e6, 40e6, 80e6].map((v) => <option key={v} value={v}>até {formatMoney(v)}</option>)}
          </select>
          {coach && <label className="chip h-10 cursor-pointer gap-2" data-on={fits}><input type="checkbox" className="accent-[#3ee27f]" checked={fits} onChange={(e) => setFits(e.target.checked)} />Cabe no orçamento</label>}
          <select className="input max-w-[140px]" value={maxAge} onChange={(e) => setMaxAge(+e.target.value)}>{[40, 30, 25, 21, 19].map((v) => <option key={v} value={v}>{v === 40 ? "Qualquer idade" : `até ${v} anos`}</option>)}</select>
        </div>
      )}
      {tab === "mercado" && <PlayerRows list={market} onPick={openBid} coach={coach} />}
      {tab === "promessas" && <><p className="dim mb-4 text-sm">Potencial estimado pelos olheiros (quanto melhor a base do seu clube, mais precisa a faixa).</p><PlayerRows list={youth} onPick={openBid} coach={coach} /></>}
      {tab === "livres" && <PlayerRows list={free} onPick={openBid} coach={coach} />}

      {tab === "propostas" && (
        <div className="space-y-10">
          {g.user.mode === "player" && (
            <div>
              <div className="label mb-2">Propostas por você</div>
              {userOffers.length === 0 ? <Empty>Nenhuma proposta. Jogue bem, ganhe fama ou peça para ser negociado em “Meu jogador”.</Empty> : (
                <ul>{userOffers.map((o) => (
                  <li key={o.id} className="border-b line py-4">
                    <div className="flex items-center gap-3"><Crest g={g} id={o.fromClubId} size={28} /><div className="min-w-0 flex-1"><div className="truncate">{teamName(g, o.fromClubId)} <span className="dim text-xs">· {g.comps[g.clubs[o.fromClubId].leagueId]?.name}</span>{o.viaAgent && <span className="text-xs text-accent"> · via agente</span>}</div><div className="dim text-xs">{formatDate(o.day)} · vence {formatDate(o.expires)} · {status(o.status)}</div></div></div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div><div className="label">Transferência</div><div className="num">{formatMoney(o.fee)}</div></div>
                      <div><div className="label">Salário</div><div className="num">{formatMoney(o.wage)}/sem</div></div>
                      <div><div className="label">Contrato</div><div className="num">{o.years} temp.</div></div>
                      <div><div className="label">Papel</div><div>{o.role}</div></div>
                    </div>
                    {o.note && <p className="dim mt-2 text-xs">{o.note}</p>}
                    {o.status === "pendente" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button className="btn btn-sm btn-primary" onClick={() => { const m = act((gg) => acceptOffer(gg, o.id)); if (m) toast(m); }}>Aceitar</button>
                        <button className="btn btn-sm" onClick={() => { const m = act((gg) => withRng(gg, (r) => negotiateOffer(gg, r, o.id, 10))); if (m) toast(m); }}>Pedir +10%</button>
                        <button className="btn btn-sm" onClick={() => { const m = act((gg) => withRng(gg, (r) => negotiateOffer(gg, r, o.id, 25))); if (m) toast(m); }}>Pedir +25%</button>
                        <button className="btn btn-sm btn-ghost dim" onClick={() => act((gg) => rejectOffer(gg, o.id))}>Recusar</button>
                      </div>
                    )}
                  </li>
                ))}</ul>
              )}
            </div>
          )}
          {g.user.mode === "coach" && (
            <>
              <div>
                <div className="label mb-2">Recebidas (outros clubes querem seus jogadores)</div>
                {outOffers.length === 0 ? <Empty>Nenhuma no momento. Coloque jogadores à venda no Elenco para atrair propostas.</Empty> : (
                  <ul>{outOffers.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center gap-3 border-b line py-3 text-sm">
                      <Crest g={g} id={o.fromClubId} size={20} />
                      <span className="min-w-0 flex-1 truncate">{teamName(g, o.fromClubId)} quer <b className="font-medium">{g.players[o.playerId]?.first} {g.players[o.playerId]?.last}</b> por <span className="num">{formatMoney(o.fee)}</span> <span className="dim">(valor {formatMoney(g.players[o.playerId]?.value ?? 0)})</span></span>
                      {status(o.status)}
                      {o.status === "pendente" && <><button className="btn btn-sm btn-primary" onClick={() => { const m = act((gg) => acceptOffer(gg, o.id)); if (m) toast(m); }}>Vender</button><button className="btn btn-sm" onClick={() => act((gg) => rejectOffer(gg, o.id))}>Recusar</button></>}
                    </li>
                  ))}</ul>
                )}
              </div>
              <div>
                <div className="label mb-2">Enviadas</div>
                {inOffers.length === 0 ? <Empty>Você ainda não fez propostas.</Empty> : (
                  <ul>{inOffers.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center gap-3 border-b line py-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{g.players[o.playerId]?.first} {g.players[o.playerId]?.last} · <span className="num">{formatMoney(o.counter && o.status === "negociando" ? o.counter : o.fee)}</span> <span className="dim">{o.note}</span></span>
                      {status(o.status)}
                      {o.status === "negociando" && <><button className="btn btn-sm btn-primary" onClick={() => { const m = act((gg) => acceptOffer(gg, o.id)); if (m) toast(m); }}>Pagar {formatMoney(o.counter ?? o.fee)}</button><button className="btn btn-sm" onClick={() => act((gg) => rejectOffer(gg, o.id))}>Desistir</button></>}
                    </li>
                  ))}</ul>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "movimentacoes" && (
        <ul>{g.history.transfers.slice(0, 80).map((t, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-3 border-b line py-2.5 text-sm">
            <span className="num faint w-16">{formatDate(t.day).slice(0, 6)}</span>
            <span className="min-w-0 flex-1 truncate">{t.name} <span className="dim">{t.fromName} → {t.toName}</span></span>
            <span className="num">{t.fee ? formatMoney(t.fee) : "livre"}</span>
          </li>
        ))}</ul>
      )}

      {pick && club && (
        <Modal onClose={() => setPick(null)}>
          <div className="label">Proposta</div>
          <h2 className="mt-2 text-2xl">{pick.first} {pick.last}</h2>
          <p className="dim mt-1 text-sm">{POS_LABEL[pick.pos]} · {age(g, pick)} anos · OVR {pick.ovr} · {pick.clubId ? `${g.clubs[pick.clubId].name} pede cerca de ${formatMoney(askingPrice(g, pick))}` : "agente livre"}</p>
          {pick.clubId && (
            <label className="mt-5 block"><span className="label">Valor · {formatMoney(fee)}</span>
              <input type="range" min={Math.round(pick.value * 0.4)} max={Math.max(Math.round(askingPrice(g, pick) * 1.6), 100000)} step={50000} value={fee} onChange={(e) => setFee(+e.target.value)} className="mt-3 w-full accent-[#3ee27f]" />
            </label>
          )}
          <label className="mt-4 block"><span className="label">Salário semanal · {formatMoney(wage)} (pede {formatMoney(wageDemand(g, pick, club))})</span>
            <input type="range" min={Math.round(wageDemand(g, pick, club) * 0.6)} max={Math.round(wageDemand(g, pick, club) * 1.8)} step={100} value={wage} onChange={(e) => setWage(+e.target.value)} className="mt-3 w-full accent-[#3ee27f]" />
          </label>
          <div className="mt-4 flex gap-2">{[1, 2, 3, 4, 5].map((y) => <button key={y} className="chip" data-on={years === y} onClick={() => setYears(y)}>{y} temp.</button>)}</div>
          <button className="btn btn-primary mt-6 w-full" disabled={fee > club.transferBudget} onClick={() => {
            const r = act((gg) => userBid(gg, pick.id, fee, wage, years));
            if (typeof r === "string") toast(r); else { toast("Proposta enviada. A resposta chega amanhã."); setPick(null); }
          }}>{fee > club.transferBudget ? "Acima do orçamento" : "Enviar proposta"}</button>
        </Modal>
      )}
    </div>
  );
}

export default function Transferencias() {
  return <Suspense><Inner /></Suspense>;
}
