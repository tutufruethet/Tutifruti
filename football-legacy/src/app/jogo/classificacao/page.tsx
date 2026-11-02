"use client";
import { useState } from "react";
import { useG } from "@/store/game";
import { sortTable, teamName } from "@/engine/season/schedule";
import { shortName } from "@/engine/world/players";
import type { Competition, GameState, TableRow } from "@/engine/types";
import { scorers } from "@/lib/view";
import { Crest, Empty, FormDots, PageTitle, Section } from "@/components/ui";

function Table({ g, rows, comp }: { g: GameState; rows: TableRow[]; comp?: Competition }) {
  const n = rows.length;
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="t min-w-[560px]">
        <thead><tr><th className="w-6">#</th><th>Clube</th><th className="text-right">J</th><th className="text-right">V</th><th className="text-right">E</th><th className="text-right">D</th><th className="text-right">Saldo</th><th className="text-right">Pts</th><th className="hidden sm:table-cell">Forma</th></tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const zone = comp?.promote && i < comp.promote ? "acesso" : comp?.relegate && i >= n - comp.relegate ? "queda" : "";
            const mine = r.clubId === g.user.clubId || r.clubId === `N-${g.user.nation}`;
            return (
              <tr key={r.clubId} className={mine ? "me" : ""}>
                <td className={`num ${zone === "acesso" || (comp?.tier === 1 && i === 0) ? "text-accent" : zone === "queda" ? "faint" : "dim"}`}>{i + 1}</td>
                <td><span className="flex items-center gap-2"><Crest g={g} id={r.clubId} size={18} /><span className="truncate">{teamName(g, r.clubId)}</span>{zone === "queda" && <span className="faint text-[10px]">↓</span>}{zone === "acesso" && <span className="text-[10px] text-accent">↑</span>}</span></td>
                <td className="num text-right">{r.p}</td><td className="num text-right">{r.w}</td><td className="num text-right">{r.d}</td><td className="num text-right">{r.l}</td>
                <td className="num text-right">{r.gf - r.ga > 0 ? "+" : ""}{r.gf - r.ga}</td>
                <td className="num text-right">{r.pts}</td>
                <td className="hidden sm:table-cell"><FormDots form={r.form} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Bracket({ g, comp }: { g: GameState; comp: Competition }) {
  const fx = Object.values(g.fixtures).filter((f) => f.compId === comp.id && f.tieId).sort((a, b) => a.day - b.day || a.tieId!.localeCompare(b.tieId!, undefined, { numeric: true }));
  const rounds = [...new Set(fx.map((f) => f.round))];
  if (!rounds.length) return <Empty>{comp.ko?.pendingFrom ? "O mata-mata começa depois da fase de grupos." : "Chaveamento ainda não definido."}</Empty>;
  return (
    <div className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {rounds.map((r) => (
        <div key={r} className="min-w-[220px]">
          <div className="label mb-2">{r}</div>
          <ul className="space-y-2">
            {fx.filter((f) => f.round === r).map((f) => (
              <li key={f.id} className="border line p-2 text-[13px]">
                {[f.homeId, f.awayId].map((id, i) => {
                  const score = f.result ? (i === 0 ? f.result.hg : f.result.ag) : null;
                  const pen = f.result?.pens?.[i];
                  const won = f.result && ((i === 0 && (f.result.hg > f.result.ag || (f.result.pens && f.result.pens[0] > f.result.pens[1]))) || (i === 1 && (f.result.ag > f.result.hg || (f.result.pens && f.result.pens[1] > f.result.pens[0]))));
                  return (
                    <div key={id} className={`flex items-center gap-2 py-0.5 ${won ? "" : f.result ? "dim" : ""} ${id === g.user.clubId ? "text-accent" : ""}`}>
                      <Crest g={g} id={id} size={14} /><span className="flex-1 truncate">{teamName(g, id)}</span>
                      <span className="num">{score ?? "–"}{pen !== undefined ? ` (${pen})` : ""}</span>
                    </div>
                  );
                })}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function Classificacao() {
  const g = useG();
  const comps = Object.values(g.comps).filter((c) => c.type !== "friendly");
  const myLeague = g.user.clubId ? g.clubs[g.user.clubId].leagueId : comps[0].id;
  const [id, setId] = useState(myLeague);
  const comp = g.comps[id] ?? comps[0];
  const champs = g.history.champions.filter((c) => c.compId === comp.id);
  const top = scorers(g, comp.id, "g", 10);
  const assists = scorers(g, comp.id, "a", 5);
  const groups = (c: typeof comps) => c.sort((a, b) => (a.type === "league" ? 0 : 1) - (b.type === "league" ? 0 : 1));
  return (
    <div>
      <PageTitle kicker="(05) Classificação" title={comp.name} meta={<><span>{comp.stage}</span>{comp.winnerId && <span className="text-accent">Campeão: {teamName(g, comp.winnerId)}</span>}</>} />
      <div className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {groups(comps).map((c) => <button key={c.id} className="chip shrink-0" data-on={c.id === comp.id} onClick={() => setId(c.id)}>{c.name}</button>)}
      </div>
      <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          {comp.type === "league" && <Table g={g} rows={sortTable([...comp.table])} comp={comp} />}
          {comp.groups?.map((gr) => <Section key={gr.name} title={gr.name}><Table g={g} rows={sortTable([...gr.table])} /></Section>)}
          {comp.ko && <Section title="Mata-mata"><Bracket g={g} comp={comp} /></Section>}
        </div>
        <div className="space-y-12 lg:col-span-4">
          <Section idx="A" title="Artilharia">
            {top.length === 0 ? <Empty>Sem gols ainda.</Empty> : (
              <ol>{top.map((p, i) => <li key={p.id} className={`flex items-center gap-3 border-b line py-2 text-sm ${p.isUser ? "text-accent" : ""}`}><span className="num faint w-5">{i + 1}</span><span className="flex-1 truncate">{shortName(p)} <span className="faint text-xs">{p.clubId ? g.clubs[p.clubId]?.short : ""}</span></span><span className="num">{p.compStats[comp.id].g}</span></li>)}</ol>
            )}
          </Section>
          <Section idx="B" title="Assistências">
            {assists.length === 0 ? <Empty>Sem assistências ainda.</Empty> : (
              <ol>{assists.map((p, i) => <li key={p.id} className={`flex items-center gap-3 border-b line py-2 text-sm ${p.isUser ? "text-accent" : ""}`}><span className="num faint w-5">{i + 1}</span><span className="flex-1 truncate">{shortName(p)}</span><span className="num">{p.compStats[comp.id].a}</span></li>)}</ol>
            )}
          </Section>
          <Section idx="C" title="Campeões">
            {champs.length === 0 ? <Empty>Primeira edição em andamento.</Empty> : (
              <ul>{champs.map((c) => <li key={c.season} className="flex justify-between gap-3 border-b line py-2 text-sm"><span className="num dim">{2026 + c.season}/{(27 + c.season) % 100}</span><span className="truncate">{c.winnerName}</span></li>)}</ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
