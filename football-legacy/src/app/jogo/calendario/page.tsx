"use client";
import { useRouter } from "next/navigation";
import { useG } from "@/store/game";
import { userFixtures } from "@/engine/season/queries";
import { teamName } from "@/engine/season/schedule";
import { dateOf, formatDate } from "@/engine/world/players";
import { WINDOW_WEEKS } from "@/engine/constants";
import { resultFor } from "@/lib/view";
import { Crest, PageTitle } from "@/components/ui";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function Calendario() {
  const g = useG();
  const router = useRouter();
  const list = userFixtures(g);
  const byMonth = new Map<string, typeof list>();
  for (const f of list) {
    const d = dateOf(f.day);
    const k = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k)!.push(f);
  }
  const s0 = g.season * 364;
  return (
    <div>
      <PageTitle kicker="(03) Calendário" title="Temporada" meta={<><span>{list.filter((f) => f.played).length} de {list.length} jogos disputados</span><span>Janelas: {WINDOW_WEEKS.map(([a, b]) => `${formatDate(s0 + a * 7).slice(0, 6)}–${formatDate(s0 + b * 7 + 6).slice(0, 6)}`).join(" · ")}</span></>} />
      {[...byMonth.entries()].map(([m, fs]) => (
        <section key={m} className="mb-10">
          <div className="label mb-2">{m}</div>
          <ul>
            {fs.map((f) => {
              const tid = f.homeId === g.user.clubId || f.awayId === g.user.clubId ? g.user.clubId! : f.homeId.startsWith("N-") && f.homeId === `N-${g.user.nation}` ? f.homeId : f.awayId;
              const res = f.played ? resultFor(g, f, tid) : null;
              const isToday = f.day === g.day;
              return (
                <li key={f.id}>
                  <button disabled={!f.played} onClick={() => router.push(`/jogo/partidas?jogo=${f.id}`)} className={`flex w-full items-center gap-3 border-b line py-2.5 text-left text-sm transition-colors duration-300 enabled:hover:bg-white/5 ${isToday ? "text-accent" : f.day < g.day ? "" : ""}`}>
                    <span className="num faint w-24 shrink-0">{formatDate(f.day, true).replace(/ \d{4}$/, "")}</span>
                    <span className="dim hidden w-40 shrink-0 truncate sm:block">{g.comps[f.compId]?.short} · {f.round.replace(/ ·.*/, "")}</span>
                    <span className="flex min-w-0 flex-1 items-center gap-2"><Crest g={g} id={f.homeId} size={16} /><span className="truncate">{teamName(g, f.homeId)}</span><span className="num shrink-0">{f.played ? `${f.result!.hg}–${f.result!.ag}` : "×"}</span><span className="truncate">{teamName(g, f.awayId)}</span><Crest g={g} id={f.awayId} size={16} /></span>
                    {res && <span className={`num grid h-5 w-5 shrink-0 place-items-center rounded-[3px] text-[10px] ${res === "V" ? "bg-accent text-ink" : res === "E" ? "surface-2" : "border line faint"}`}>{res}</span>}
                    {isToday && !f.played && <span className="label text-accent">hoje</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
