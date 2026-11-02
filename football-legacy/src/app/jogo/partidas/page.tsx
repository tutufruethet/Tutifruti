"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useG, useGame } from "@/store/game";
import { teamName } from "@/engine/season/schedule";
import { isUserFixture } from "@/engine/season/apply";
import { formatDate } from "@/engine/world/players";
import { Crest, Empty, PageTitle } from "@/components/ui";
import { MatchReport } from "@/components/MatchReport";

function Inner() {
  const g = useG();
  const params = useSearchParams();
  const router = useRouter();
  const open = params.get("jogo");
  const comps = Object.values(g.comps).filter((c) => Object.values(g.fixtures).some((f) => f.compId === c.id));
  const myLeague = g.user.clubId ? g.clubs[g.user.clubId].leagueId : comps[0]?.id;
  const [compId, setCompId] = useState(myLeague);
  const fixtures = Object.values(g.fixtures).filter((f) => f.compId === compId).sort((a, b) => a.day - b.day);
  const rounds = [...new Set(fixtures.map((f) => f.round))];
  const current = fixtures.find((f) => !f.played)?.round ?? rounds[rounds.length - 1];
  const [round, setRound] = useState<string | null>(null);
  const r = round && rounds.includes(round) ? round : current;
  const idx = rounds.indexOf(r ?? "");
  const list = fixtures.filter((f) => f.round === r);
  const today = Object.values(g.fixtures).find((f) => f.day === g.day && !f.played && isUserFixture(g, f));

  return (
    <div>
      <PageTitle kicker="(04) Partidas" title="Rodadas" meta={today ? <button className="btn btn-sm btn-primary" onClick={() => useGame.setState({ pendingMatch: today.id })}>Seu jogo de hoje →</button> : <span>Toque num jogo encerrado para ver o relatório.</span>} />
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {comps.map((c) => <button key={c.id} className="chip shrink-0" data-on={c.id === compId} onClick={() => { setCompId(c.id); setRound(null); }}>{c.name}</button>)}
      </div>
      <div className="mb-4 flex items-center justify-between">
        <button className="btn btn-sm" disabled={idx <= 0} onClick={() => setRound(rounds[idx - 1])}>←</button>
        <div className="text-center"><div className="text-[15px]">{r ?? "—"}</div>{list[0] && <div className="dim text-xs">{formatDate(list[0].day, true)}</div>}</div>
        <button className="btn btn-sm" disabled={idx >= rounds.length - 1} onClick={() => setRound(rounds[idx + 1])}>→</button>
      </div>
      {list.length === 0 ? <Empty>Sem jogos nesta competição ainda.</Empty> : (
        <ul>
          {list.map((f) => {
            const mine = isUserFixture(g, f);
            return (
              <li key={f.id}>
                <button disabled={!f.played} onClick={() => router.push(`/jogo/partidas?jogo=${f.id}`)} className={`grid w-full grid-cols-[1fr_64px_1fr] items-center gap-3 border-b line py-3 text-sm transition-colors duration-300 enabled:hover:bg-white/5 ${mine ? "text-accent" : ""}`}>
                  <span className="flex items-center justify-end gap-2 text-right"><span className="truncate">{teamName(g, f.homeId)}</span><Crest g={g} id={f.homeId} size={18} /></span>
                  <span className="num text-center">{f.played ? `${f.result!.hg}–${f.result!.ag}${f.result!.pens ? "*" : ""}` : formatDate(f.day).slice(0, 6)}</span>
                  <span className="flex items-center gap-2"><Crest g={g} id={f.awayId} size={18} /><span className="truncate">{teamName(g, f.awayId)}</span></span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && <MatchReport fixtureId={open} onClose={() => router.push("/jogo/partidas")} />}
    </div>
  );
}

export default function Partidas() {
  return <Suspense><Inner /></Suspense>;
}
