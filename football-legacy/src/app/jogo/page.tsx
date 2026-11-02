"use client";
import Link from "next/link";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useG, useGame } from "@/store/game";
import { nextUserFixture } from "@/engine/season/queries";
import { teamName } from "@/engine/season/schedule";
import { formatDate, formatMoney, seasonLabel } from "@/engine/world/players";
import { acceptJob } from "@/engine/career/coach";
import { unreadCount } from "@/engine/chat/chat";
import { FOCUS_LABEL } from "@/engine/world/progression";
import { me, myClub, positionHistory, resultFor, table, userResults } from "@/lib/view";
import { Arrow, Bar, Crest, FormDots, Section, Stat } from "@/components/ui";

export default function Painel() {
  const g = useG();
  const act = useGame((s) => s.act);
  const club = myClub(g);
  const p = me(g);
  const next = nextUserFixture(g);
  const results = userResults(g, 5);
  const teamId = g.user.clubId ?? "";
  const lg = club ? g.comps[club.leagueId] : undefined;
  const t = lg ? table(g, lg.id) : [];
  const pos = t.findIndex((r) => r.clubId === teamId) + 1;
  const row = t[pos - 1];
  const hist = lg && club ? positionHistory(g, lg.id, club.id) : [];
  const unread = unreadCount(g);
  const offers = g.offers.filter((o) => (o.direction === "user" || o.direction === "out") && o.status === "pendente");
  const ovrSeries = p ? [...p.career.map((c) => ({ x: seasonLabel(c.season), v: c.ovr })), { x: "Agora", v: p.ovr }] : [];

  return (
    <div>
      <header className="rise mb-10">
        <div className="label">(01) Painel · {g.user.mode === "player" ? "Modo jogador" : "Modo treinador"}</div>
        <h1 className="display mt-2 text-[clamp(2.6rem,8vw,6.5rem)] break-words">{g.user.mode === "player" && p ? `${p.first} ${p.last}` : club?.name ?? g.user.name}</h1>
        <div className="dim mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {club ? <span className="flex items-center gap-2"><Crest g={g} id={club.id} size={16} />{g.user.mode === "player" ? club.name : `Técnico ${g.user.name}`}</span> : <span>Sem clube</span>}
          {lg && pos > 0 && <span>{pos}º na {lg.name}</span>}
          <span>{seasonLabel(g.season)}</span>
          {p && <span>Overall <span className="num text-paper">{p.ovr}</span></span>}
          {g.user.mode === "coach" && <span>Reputação <span className="num text-paper">{Math.round(g.user.reputation)}</span></span>}
        </div>
      </header>

      {g.user.mode === "coach" && g.user.unemployed && (
        <Section idx="!" title="Você está sem clube" className="mb-10">
          {g.user.jobOffers.length === 0 ? <p className="dim text-sm">Avance o tempo: clubes procuram treinadores toda semana.</p> : (
            <ul>{g.user.jobOffers.map((o) => (
              <li key={o.clubId} className="flex items-center gap-3 border-b line py-2.5">
                <Crest g={g} id={o.clubId} size={22} /><span className="flex-1 truncate">{g.clubs[o.clubId].name} <span className="dim text-xs">· {g.comps[g.clubs[o.clubId].leagueId]?.name} · rep. {Math.round(g.clubs[o.clubId].reputation)}</span></span>
                <button className="btn btn-sm btn-primary" onClick={() => act((gg) => acceptJob(gg, o.clubId))}>Aceitar</button>
              </li>
            ))}</ul>
          )}
        </Section>
      )}

      <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-7">
          {/* próximo jogo */}
          <Section idx="A" title="Próximo jogo" right={<Arrow href="/jogo/calendario">Calendário</Arrow>}>
            {next ? (
              <div className="rise">
                <div className="label">{g.comps[next.compId]?.name} · {next.round} · {formatDate(next.day, true)}</div>
                <div className="mt-4 flex items-center gap-4">
                  <Crest g={g} id={next.homeId} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xl sm:text-2xl">{teamName(g, next.homeId)} <span className="faint">×</span> {teamName(g, next.awayId)}</div>
                    <div className="dim mt-1 text-sm">{next.day === g.day ? "Hoje" : next.day - g.day === 1 ? "Amanhã" : `Em ${next.day - g.day} dias`}{next.importance >= 2 ? " · jogo grande" : ""}{next.isNational ? " · seleção" : ""}</div>
                  </div>
                  <Crest g={g} id={next.awayId} size={40} />
                </div>
                {next.day === g.day && <button className="btn btn-primary mt-5" onClick={() => useGame.setState({ pendingMatch: next.id })}>Ir para o jogo →</button>}
              </div>
            ) : <p className="dim text-sm">Nenhum jogo marcado agora.</p>}
          </Section>

          {/* decisões e propostas */}
          {(g.decisions.length > 0 || offers.length > 0) && (
            <Section idx="B" title="Pede sua atenção">
              <ul>
                {g.decisions.map((d) => <li key={d.id} className="border-b line py-2.5 text-[15px]"><span className="text-accent">●</span> {d.title} <span className="dim text-xs">· decide até {formatDate(d.expires)}</span></li>)}
                {offers.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 border-b line py-2.5 text-[15px]">
                    <Crest g={g} id={o.fromClubId} size={18} />
                    <span className="flex-1 truncate">{o.direction === "user" ? `Proposta do ${teamName(g, o.fromClubId)}` : `${teamName(g, o.fromClubId)} quer ${g.players[o.playerId]?.first} ${g.players[o.playerId]?.last}`} <span className="dim text-xs">· {formatMoney(o.fee)}</span></span>
                    <Arrow href="/jogo/transferencias?aba=propostas">Ver</Arrow>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* evolução */}
          <Section idx="C" title={p ? "Evolução do overall" : "Posição na liga"}>
            <div className="h-48 w-full">
              <ResponsiveContainer>
                {p ? (
                  <LineChart data={ovrSeries} margin={{ left: -24, right: 8, top: 8 }}>
                    <CartesianGrid stroke="rgba(236,235,230,.06)" vertical={false} />
                    <XAxis dataKey="x" tick={{ fill: "#8b8f8a", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={["dataMin - 3", "dataMax + 3"]} tick={{ fill: "#8b8f8a", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0e100f", border: "1px solid rgba(236,235,230,.15)", fontSize: 12 }} />
                    <Line type="monotone" dataKey="v" name="Overall" stroke="#3ee27f" strokeWidth={2} dot={{ r: 3, fill: "#3ee27f" }} />
                  </LineChart>
                ) : (
                  <LineChart data={hist} margin={{ left: -24, right: 8, top: 8 }}>
                    <CartesianGrid stroke="rgba(236,235,230,.06)" vertical={false} />
                    <XAxis dataKey="round" tick={{ fill: "#8b8f8a", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis reversed domain={[1, lg?.teamIds.length ?? 16]} allowDecimals={false} tick={{ fill: "#8b8f8a", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0e100f", border: "1px solid rgba(236,235,230,.15)", fontSize: 12 }} />
                    <Line type="monotone" dataKey="pos" name="Posição" stroke="#3ee27f" strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
            {p && hist.length === 0 && <p className="dim text-xs">A curva ganha um ponto a cada fim de temporada.</p>}
          </Section>

          {/* notícias */}
          <Section idx="D" title="Notícias" right={<Arrow href="/jogo/noticias">Todas</Arrow>}>
            <ul>
              {g.news.slice(0, 6).map((n) => (
                <li key={n.id} className="border-b line py-3">
                  <div className="label">{formatDate(n.day)} · {n.tag}</div>
                  <div className={`mt-1 text-[15px] ${n.importance >= 3 ? "text-paper" : ""}`}>{n.title}</div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="space-y-12 lg:col-span-5">
          {/* status */}
          <Section idx="E" title={p ? "Seu momento" : "Diretoria"}>
            {p ? (
              <div className="grid grid-cols-2 gap-6">
                <Stat label="Jogos / gols" value={`${p.stats.apps} / ${p.stats.goals}`} sub={`${p.stats.assists} assistências`} />
                <Stat label="Nota média" value={p.stats.apps ? (p.stats.ratingSum / p.stats.apps).toFixed(2) : "—"} sub={`${p.stats.starts} como titular`} />
                <div><div className="label">Condição</div><Bar value={p.fitness} className="mt-3" /><div className="num dim mt-1 text-xs">{Math.round(p.fitness)}%{p.injury ? ` · ${p.injury.name}` : ""}</div></div>
                <div><div className="label">Moral</div><Bar value={p.morale} className="mt-3" /><div className="num dim mt-1 text-xs">{Math.round(p.morale)}</div></div>
                <div><div className="label">Relação c/ técnico</div><Bar value={g.user.coachRelation} accent className="mt-3" /><div className="num dim mt-1 text-xs">{Math.round(g.user.coachRelation)}</div></div>
                <div><div className="label">Treino</div><div className="mt-1.5 text-sm">{FOCUS_LABEL[g.user.training.focus]} · {["leve", "normal", "intenso"][g.user.training.intensity]}</div></div>
              </div>
            ) : (
              <div className="space-y-5">
                <div><div className="label">Confiança da diretoria</div><Bar value={g.user.boardConfidence} accent className="mt-3" /><div className="num dim mt-1 text-xs">{Math.round(g.user.boardConfidence)} / 100{g.user.boardConfidence < 25 ? " · cargo em risco" : ""}</div></div>
                <ul>{g.user.objectives.map((o) => <li key={o.id} className="flex justify-between gap-3 border-b line py-2 text-sm"><span>{o.text}</span><span className={o.status === "cumprido" ? "text-accent" : o.status === "falhou" ? "faint line-through" : "dim"}>{o.status}</span></li>)}</ul>
                {club && <div className="grid grid-cols-2 gap-6"><Stat label="Caixa" value={formatMoney(club.balance)} /><Stat label="Para contratar" value={formatMoney(club.transferBudget)} /></div>}
              </div>
            )}
          </Section>

          {/* campanha */}
          {lg && row && (
            <Section idx="F" title={lg.name} right={<Arrow href="/jogo/classificacao">Tabela</Arrow>}>
              <div className="mb-4 flex items-center justify-between">
                <div className="num text-4xl">{pos}º</div>
                <div className="text-right"><div className="num">{row.pts} pts · {row.w}V {row.d}E {row.l}D</div><div className="mt-1"><FormDots form={results.map((f) => resultFor(g, f, teamId)).reverse()} /></div></div>
              </div>
              <table className="t">
                <tbody>
                  {t.slice(Math.max(0, Math.min(pos - 3, t.length - 5)), Math.max(0, Math.min(pos - 3, t.length - 5)) + 5).map((r) => (
                    <tr key={r.clubId} className={r.clubId === teamId ? "me" : ""}>
                      <td className="num w-6 faint">{t.indexOf(r) + 1}</td>
                      <td><span className="flex items-center gap-2"><Crest g={g} id={r.clubId} size={16} /><span className="truncate">{g.clubs[r.clubId].name}</span></span></td>
                      <td className="num text-right">{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* resultados */}
          <Section idx="G" title="Últimos resultados" right={<Arrow href="/jogo/partidas">Partidas</Arrow>}>
            {results.length === 0 ? <p className="dim text-sm">A temporada ainda não começou para você.</p> : (
              <ul>{results.map((f) => {
                const tid = f.homeId === teamId || f.awayId === teamId ? teamId : f.homeId.startsWith("N-") && g.user.playerId && f.homeId === `N-${g.players[g.user.playerId].nation}` ? f.homeId : f.awayId;
                const r = resultFor(g, f, tid);
                return (
                  <li key={f.id}>
                    <Link href={`/jogo/partidas?jogo=${f.id}`} className="flex items-center gap-3 border-b line py-2 text-sm transition-colors duration-300 hover:text-accent">
                      <span className={`num grid h-5 w-5 place-items-center rounded-[3px] text-[10px] ${r === "V" ? "bg-accent text-ink" : r === "E" ? "surface-2" : "border line faint"}`}>{r}</span>
                      <span className="flex-1 truncate">{teamName(g, f.homeId)} <span className="num">{f.result!.hg}–{f.result!.ag}</span> {teamName(g, f.awayId)}</span>
                      <span className="dim text-xs">{formatDate(f.day).slice(0, 6)}</span>
                    </Link>
                  </li>
                );
              })}</ul>
            )}
          </Section>

          {/* vestiário */}
          <Section idx="H" title="Vestiário" right={<Arrow href="/jogo/vestiario">Abrir</Arrow>}>
            <p className="text-sm">{unread > 0 ? <><span className="text-accent">{unread}</span> mensagem(ns) não lida(s).</> : "Nenhuma mensagem nova."}</p>
            {g.groups.filter((x) => x.active).slice(0, 3).map((gr) => <p key={gr.id} className="dim mt-2 text-xs">{gr.name} · {gr.goals} gols combinados</p>)}
          </Section>
        </div>
      </div>
    </div>
  );
}
