"use client";
import { useG } from "@/store/game";
import { teamName } from "@/engine/season/schedule";
import { formatDate, shortName } from "@/engine/world/players";
import type { GameState, MatchEvent } from "@/engine/types";
import { Crest, Modal } from "./ui";

function eventText(g: GameState, e: MatchEvent) {
  if (e.text) return e.text;
  const p = e.playerId ? g.players[e.playerId] : undefined;
  const a = e.assistId ? g.players[e.assistId] : undefined;
  if (e.type === "red") return `Expulso: ${p ? shortName(p) : "jogador"}`;
  return `Gol de ${p ? shortName(p) : "?"}${a ? ` (assistência de ${shortName(a)})` : ""}${e.type === "pen_goal" ? " de pênalti" : ""}`;
}

export function MatchReport({ fixtureId, onClose }: { fixtureId: string; onClose: () => void }) {
  const g = useG();
  const f = g.fixtures[fixtureId];
  if (!f?.result) return null;
  const r = f.result;
  const meId = g.user.playerId;
  return (
    <Modal wide onClose={onClose}>
      <div className="label">{g.comps[f.compId]?.name} · {f.round} · {formatDate(f.day)}</div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center justify-end gap-3 text-right"><span className="truncate text-lg">{teamName(g, f.homeId)}</span><Crest g={g} id={f.homeId} size={34} /></div>
        <div className="score text-5xl">{r.hg}<span className="faint">–</span>{r.ag}</div>
        <div className="flex items-center gap-3"><Crest g={g} id={f.awayId} size={34} /><span className="truncate text-lg">{teamName(g, f.awayId)}</span></div>
      </div>
      {r.pens && <p className="num dim mt-2 text-center text-sm">Pênaltis {r.pens[0]}–{r.pens[1]}</p>}
      {r.lines.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4 text-center text-sm">
          <div><div className="label">Posse</div><div className="num">{r.poss[0]}% · {r.poss[1]}%</div></div>
          <div><div className="label">Finalizações</div><div className="num">{r.shots[0]} · {r.shots[1]}</div></div>
          <div><div className="label">No alvo</div><div className="num">{r.sot[0]} · {r.sot[1]}</div></div>
        </div>
      )}
      <ol className="mt-6">
        {r.events.filter((e) => e.type !== "info" || e.min >= 90).map((e, i) => (
          <li key={i} className="flex gap-3 border-b line py-1.5 text-[13px]"><span className={`num w-8 text-right ${e.type === "goal" || e.type === "pen_goal" ? "text-accent" : "faint"}`}>{e.min}&apos;</span><span>{eventText(g, e)}</span></li>
        ))}
      </ol>
      {r.lines.length > 0 && (
        <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
          {[0, 1].map((si) => (
            <ol key={si}>{r.lines.filter((l) => l.side === si && l.minutes > 0).sort((a, b) => b.rating - a.rating).map((l) => g.players[l.playerId] && (
              <li key={l.playerId} className={`flex gap-2 border-b line py-1 text-[13px] ${l.playerId === meId ? "text-accent" : ""}`}><span className="truncate">{shortName(g.players[l.playerId])}{r.motm === l.playerId ? " ★" : ""}</span><span className="dim text-xs">{l.goals ? `${l.goals}G ` : ""}{l.assists ? `${l.assists}A` : ""}</span><span className="num ml-auto">{l.rating.toFixed(1)}</span></li>
            ))}</ol>
          ))}
        </div>
      )}
      {r.lines.length === 0 && <p className="dim mt-4 text-xs">Jogos sem o seu time guardam só gols e expulsões.</p>}
    </Modal>
  );
}

