"use client";
import { useEffect, useState } from "react";
import { useG } from "@/store/game";
import { ACHIEVEMENTS } from "@/engine/career/achievements";
import { levelLabel } from "@/engine/chemistry/relations";
import { legacyScore } from "@/engine/career/player";
import { formatDate, seasonLabel } from "@/engine/world/players";
import { hallOfFame, type HallEntry } from "@/store/persist";
import { PageTitle, Section, Tabs } from "@/components/ui";

type Tab = "carreira" | "legado" | "trios" | "mundo";

export default function Historico() {
  const g = useG();
  const [tab, setTab] = useState<Tab>("carreira");
  const [hof, setHof] = useState<HallEntry[]>([]);
  useEffect(() => { void hallOfFame().then(setHof); }, []);
  const titles = g.history.milestones.filter((m) => m.text.startsWith("Título"));
  const unlocked = ACHIEVEMENTS.filter((a) => !a.mode || a.mode === g.user.mode);
  const trios = [...g.groups].sort((a, b) => b.goals + b.titles * 10 - (a.goals + a.titles * 10));
  return (
    <div>
      <PageTitle kicker="(12) Histórico e troféus" title="Legado" meta={<><span>Pontuação de legado <span className="num text-accent">{legacyScore(g)}</span></span><span>{titles.length} títulos</span><span>{Object.keys(g.achievements).length}/{unlocked.length} conquistas</span></>} />
      <Tabs value={tab} onChange={setTab} items={[{ id: "carreira", label: "Carreira" }, { id: "legado", label: "Conquistas" }, { id: "trios", label: "Maiores duplas e trios" }, { id: "mundo", label: "Campeões e prêmios" }]} />
      {tab === "carreira" && (
        <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Section idx="A" title="Temporadas">
              {g.history.userSeasons.length === 0 ? <p className="dim text-sm">A primeira temporada ainda está em andamento.</p> : (
                <table className="t"><thead><tr><th>Temporada</th><th>Clube</th><th className="text-right">Pos.</th>{g.user.mode === "player" && <><th className="text-right">J</th><th className="text-right">G</th><th className="text-right">Nota</th></>}<th>Títulos</th></tr></thead>
                  <tbody>{g.history.userSeasons.map((s) => (
                    <tr key={s.season}><td className="num">{seasonLabel(s.season)}</td><td className="truncate">{s.clubName}</td><td className="num text-right">{s.pos || "—"}</td>{g.user.mode === "player" && <><td className="num text-right">{s.apps}</td><td className="num text-right">{s.goals}</td><td className="num text-right">{s.rating?.toFixed(2)}</td></>}<td className="text-accent">{s.trophies.join(", ")}</td></tr>
                  ))}</tbody></table>
              )}
            </Section>
            <Section idx="B" title="Recordes" className="mt-10">
              {g.history.records.length === 0 ? <p className="dim text-sm">Recordes aparecem no fim de cada temporada.</p> : g.history.records.map((r) => <div key={r.label} className="flex justify-between border-b line py-2 text-sm"><span>{r.label}</span><span className="num">{r.value} · {r.holder} ({seasonLabel(r.season)})</span></div>)}
            </Section>
          </div>
          <div className="lg:col-span-5">
            <Section idx="C" title="Linha do tempo">
              <ol>{g.history.milestones.map((m, i) => <li key={i} className="flex gap-3 border-b line py-2 text-sm"><span className="num faint w-24 shrink-0">{formatDate(m.day)}</span><span className={m.text.startsWith("Título") ? "text-accent" : ""}>{m.text}</span></li>)}</ol>
            </Section>
          </div>
        </div>
      )}
      {tab === "legado" && (
        <div>
          <ul className="grid gap-px border line sm:grid-cols-2 lg:grid-cols-3">
            {unlocked.map((a) => {
              const day = g.achievements[a.id];
              return (
                <li key={a.id} className={`surface p-4 ${day === undefined ? "opacity-45" : ""}`}>
                  <div className={`text-[15px] ${day !== undefined ? "text-accent" : ""}`}>{a.name}</div>
                  <div className="dim mt-1 text-xs">{a.desc}</div>
                  {day !== undefined && <div className="label mt-2">{formatDate(day)}</div>}
                </li>
              );
            })}
          </ul>
          <Section title="Hall da Fama (todas as carreiras)" className="mt-12">
            {hof.length === 0 ? <p className="dim text-sm">Carreiras encerradas aparecem aqui.</p> : hof.map((h, i) => <div key={h.id} className="flex gap-3 border-b line py-2 text-sm"><span className="num faint w-5">{i + 1}</span><span className="flex-1">{h.name} <span className="dim">· {h.seasons} temporadas · {h.titles} títulos{h.goals !== undefined ? ` · ${h.goals} gols` : ""}</span></span><span className="num text-accent">{h.score}</span></div>)}
          </Section>
        </div>
      )}
      {tab === "trios" && (
        trios.length === 0 ? <p className="dim text-sm">Nenhuma dupla ou trio formado ainda.</p> : (
          <table className="t"><thead><tr><th>#</th><th>Nome</th><th>Integrantes</th><th>Nível</th><th className="text-right">Jogos</th><th className="text-right">Gols</th><th className="text-right">Títulos</th><th className="text-right">Temp.</th></tr></thead>
            <tbody>{trios.map((gr, i) => (
              <tr key={gr.id}><td className="num faint">{i + 1}</td><td>{gr.name}{!gr.active && <span className="faint text-xs"> · desfeito</span>}{gr.reunions > 0 && <span className="text-xs text-accent"> · reencontro</span>}</td><td className="dim truncate">{gr.members.map((m) => g.players[m]?.first ?? "?").join(", ")}</td><td>{levelLabel(gr.level, gr.members.length)}</td><td className="num text-right">{gr.matches}</td><td className="num text-right">{gr.goals}</td><td className="num text-right">{gr.titles}</td><td className="num text-right">{gr.seasons.length}</td></tr>
            ))}</tbody></table>
        )
      )}
      {tab === "mundo" && (
        <div className="grid gap-x-10 gap-y-12 lg:grid-cols-2">
          <Section idx="A" title="Campeões">
            <ul>{g.history.champions.slice(0, 80).map((c, i) => <li key={i} className="flex justify-between gap-3 border-b line py-2 text-sm"><span className="dim truncate">{seasonLabel(c.season)} · {c.compName}</span><span className={`truncate ${c.winnerId === g.user.clubId ? "text-accent" : ""}`}>{c.winnerName}</span></li>)}</ul>
          </Section>
          <Section idx="B" title="Prêmios">
            <ul>{g.history.awards.slice(0, 80).map((a, i) => <li key={i} className="border-b line py-2 text-sm"><div className="dim text-xs">{seasonLabel(a.season)} · {a.award}</div><div className={a.playerId === g.user.playerId || a.name === g.user.name ? "text-accent" : ""}>{a.name} <span className="faint">· {a.clubName} · {a.detail}</span></div></li>)}</ul>
          </Section>
        </div>
      )}
    </div>
  );
}
