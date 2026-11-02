"use client";
import { useState } from "react";
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useG } from "@/store/game";
import { avgRating, seasonLabel, shortName } from "@/engine/world/players";
import type { Player } from "@/engine/types";
import { me, myClub } from "@/lib/view";
import { PageTitle, Section } from "@/components/ui";

type Key = "goals" | "assists" | "rating" | "motm";
const LABEL: Record<Key, string> = { goals: "Gols", assists: "Assistências", rating: "Nota média", motm: "Melhor em campo" };

export default function Estatisticas() {
  const g = useG();
  const [scope, setScope] = useState<"liga" | "mundo" | "clube">("liga");
  const [key, setKey] = useState<Key>("goals");
  const club = myClub(g);
  const p = me(g);
  let pool = Object.values(g.players).filter((x) => !x.retired && x.clubId && x.stats.apps > 0);
  if (scope === "liga" && club) pool = pool.filter((x) => g.clubs[x.clubId!]?.leagueId === club.leagueId);
  if (scope === "clube" && club) pool = pool.filter((x) => x.clubId === club.id);
  const val = (x: Player) => (key === "rating" ? (x.stats.apps >= 5 ? avgRating(x) : 0) : x.stats[key]);
  const top = [...pool].sort((a, b) => val(b) - val(a)).slice(0, 15);
  const series: Record<string, string | number>[] = p ? [...p.career.map((c) => ({ s: seasonLabel(c.season), gols: c.goals, assist: c.assists })), { s: seasonLabel(g.season), gols: p.stats.goals, assist: p.stats.assists }] : g.history.userSeasons.slice().reverse().map((s) => ({ s: seasonLabel(s.season), pos: s.pos }));
  return (
    <div>
      <PageTitle kicker="(11) Estatísticas" title="Números" meta={<span>Temporada {seasonLabel(g.season)}</span>} />
      <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="mb-4 flex flex-wrap gap-2">
            {(["liga", "mundo", "clube"] as const).map((s) => <button key={s} className="chip" data-on={scope === s} onClick={() => setScope(s)}>{s === "liga" ? "Minha liga" : s === "mundo" ? "Todas as ligas" : "Meu clube"}</button>)}
            <span className="mx-1" />
            {(Object.keys(LABEL) as Key[]).map((k) => <button key={k} className="chip" data-on={key === k} onClick={() => setKey(k)}>{LABEL[k]}</button>)}
          </div>
          <table className="t">
            <thead><tr><th className="w-6">#</th><th>Jogador</th><th>Clube</th><th className="text-right">J</th><th className="text-right">{LABEL[key]}</th></tr></thead>
            <tbody>{top.map((x, i) => (
              <tr key={x.id} className={x.isUser ? "me" : ""}><td className="num faint">{i + 1}</td><td className="truncate">{shortName(x)}</td><td className="dim">{g.clubs[x.clubId!]?.short}</td><td className="num text-right">{x.stats.apps}</td><td className="num text-right">{key === "rating" ? val(x).toFixed(2) : val(x)}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="lg:col-span-5">
          <Section idx="A" title={p ? "Gols e assistências por temporada" : "Campanhas"}>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={series} margin={{ left: -24, right: 8, top: 8 }}>
                  <CartesianGrid stroke="rgba(236,235,230,.06)" vertical={false} />
                  <XAxis dataKey="s" tick={{ fill: "#8b8f8a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8b8f8a", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} reversed={!p} />
                  <Tooltip contentStyle={{ background: "#0e100f", border: "1px solid rgba(236,235,230,.15)", fontSize: 12 }} cursor={{ fill: "rgba(236,235,230,.04)" }} />
                  {p ? <><RBar dataKey="gols" name="Gols" fill="#3ee27f" /><RBar dataKey="assist" name="Assistências" fill="rgba(236,235,230,.45)" /></> : <RBar dataKey="pos" name="Posição" fill="#3ee27f" />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
          {p && (
            <Section idx="B" title="Esta temporada" className="mt-10">
              <div className="grid grid-cols-3 gap-y-5 text-sm">
                {([["Jogos", p.stats.apps], ["Titular", p.stats.starts], ["Minutos", p.stats.minutes], ["Gols", p.stats.goals], ["Assist.", p.stats.assists], ["Nota", p.stats.apps ? avgRating(p).toFixed(2) : "—"], ["Melhor em campo", p.stats.motm], ["Amarelos", p.stats.yellows], ["Vermelhos", p.stats.reds]] as const).map(([l, v]) => <div key={l}><div className="label">{l}</div><div className="num mt-1 text-xl">{v}</div></div>)}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
