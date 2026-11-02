"use client";
import { useG, useGame } from "@/store/game";
import { ATTR_KEYS, ATTR_LABEL, POS_LABEL } from "@/engine/constants";
import { avgRating, formatMoney, seasonLabel } from "@/engine/world/players";
import { acceptJob } from "@/engine/career/coach";
import { clubAvgOvr } from "@/engine/market/transfers";
import { age, me, myClub, potentialRange } from "@/lib/view";
import { Bar, Crest, PageTitle, Section, Stat } from "@/components/ui";

function PlayerView() {
  const g = useG();
  const act = useGame((s) => s.act);
  const p = me(g)!;
  const club = myClub(g);
  const s = p.stats;
  return (
    <div>
      <PageTitle kicker="(02) Meu jogador" title={`${p.first} ${p.last}`} meta={<>
        <span>{POS_LABEL[p.pos]}</span><span>{age(g, p)} anos</span><span>{g.nations[p.nation].name}</span><span>{p.height} cm · pé {p.foot === "D" ? "direito" : p.foot === "E" ? "esquerdo" : "ambidestro"}</span>{p.style && <span>{p.style}</span>}
      </>} />
      <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-7">
          <Section idx="A" title="Atributos">
            <div className="mb-6 grid grid-cols-3 gap-6">
              <Stat label="Overall" value={p.ovr} accent />
              <Stat label="Potencial" value={potentialRange(g, p)} sub="estimativa" />
              <Stat label="Valor" value={formatMoney(p.value)} />
            </div>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {ATTR_KEYS.filter((k) => p.pos === "GOL" || k !== "gol").map((k) => (
                <div key={k} className="grid grid-cols-[110px_1fr_28px] items-center gap-3 text-sm">
                  <span className="dim">{ATTR_LABEL[k]}</span><Bar value={p.attrs[k]} accent={p.attrs[k] >= 75} /><span className="num text-right">{p.attrs[k]}</span>
                </div>
              ))}
            </div>
          </Section>
          <Section idx="B" title="Carreira">
            <table className="t">
              <thead><tr><th>Temporada</th><th>Clube</th><th className="text-right">J</th><th className="text-right">G</th><th className="text-right">A</th><th className="text-right">Nota</th><th className="text-right">OVR</th></tr></thead>
              <tbody>
                {[...p.career].reverse().map((c) => <tr key={c.season}><td className="num">{seasonLabel(c.season)}</td><td className="truncate">{c.clubName}</td><td className="num text-right">{c.apps}</td><td className="num text-right">{c.goals}</td><td className="num text-right">{c.assists}</td><td className="num text-right">{c.rating ? c.rating.toFixed(2) : "—"}</td><td className="num text-right">{c.ovr}</td></tr>)}
                <tr className="me"><td className="num">{seasonLabel(g.season)}</td><td>{club?.name ?? "—"}</td><td className="num text-right">{s.apps}</td><td className="num text-right">{s.goals}</td><td className="num text-right">{s.assists}</td><td className="num text-right">{s.apps ? avgRating(p).toFixed(2) : "—"}</td><td className="num text-right">{p.ovr}</td></tr>
              </tbody>
            </table>
            <div className="dim mt-4 text-xs">Seleção: {p.intl.caps} jogos, {p.intl.goals} gols.</div>
          </Section>
        </div>
        <div className="space-y-12 lg:col-span-5">
          <Section idx="C" title="Contrato e imagem">
            <div className="grid grid-cols-2 gap-6">
              <Stat label="Salário" value={formatMoney(p.contract.wage)} sub="por semana" />
              <Stat label="Contrato até" value={club ? `${2027 + p.contract.until}` : "—"} sub={club?.name} />
              <Stat label="Patrimônio" value={formatMoney(g.user.money)} />
              <Stat label="Reputação" value={Math.round(p.reputation)} sub="0–100" />
            </div>
            <div className="mt-6 space-y-4">
              <div><div className="label">Relação com o técnico ({club?.coachName ?? "—"})</div><Bar value={g.user.coachRelation} accent className="mt-2" /></div>
              <div><div className="label">Moral</div><Bar value={p.morale} className="mt-2" /></div>
              <div><div className="label">Condição física</div><Bar value={p.fitness} className="mt-2" /></div>
            </div>
            {club && (
              <label className="mt-6 flex items-center gap-3 text-sm">
                <input type="checkbox" checked={!!g.user.wantsTransfer} onChange={(e) => act((gg) => { gg.user.wantsTransfer = e.target.checked; if (e.target.checked) gg.user.coachRelation = Math.max(0, gg.user.coachRelation - 3); })} className="accent-[#3ee27f]" />
                Pedir para ser negociado (mais propostas; o técnico não gosta)
              </label>
            )}
          </Section>
          <Section idx="D" title="Conquistas pessoais">
            {p.trophies.length === 0 ? <p className="dim text-sm">Ainda nenhuma. A primeira taça muda tudo.</p> : <ul className="space-y-1 text-sm">{[...p.trophies].reverse().map((t, i) => <li key={i} className="border-b line py-1.5">{t}</li>)}</ul>}
          </Section>
        </div>
      </div>
    </div>
  );
}

function ClubView() {
  const g = useG();
  const act = useGame((s) => s.act);
  const club = myClub(g);
  if (!club) {
    return (
      <div>
        <PageTitle kicker="(02) Meu clube" title="Sem clube" meta={<span>Reputação {Math.round(g.user.reputation)}</span>} />
        <Section title="Propostas de emprego">
          {g.user.jobOffers.length === 0 ? <p className="dim text-sm">Nenhuma ainda. Avance o tempo.</p> : g.user.jobOffers.map((o) => (
            <div key={o.clubId} className="flex items-center gap-3 border-b line py-2.5"><Crest g={g} id={o.clubId} size={22} /><span className="flex-1">{g.clubs[o.clubId].name}</span><button className="btn btn-sm btn-primary" onClick={() => act((gg) => acceptJob(gg, o.clubId))}>Aceitar</button></div>
          ))}
        </Section>
      </div>
    );
  }
  const wages = club.squad.reduce((s, id) => s + (g.players[id]?.contract.wage ?? 0), 0);
  return (
    <div>
      <PageTitle kicker="(02) Meu clube" title={club.name} meta={<><span>{club.city}</span><span>Fundado em {club.founded}</span><span>Estádio para {club.stadium.toLocaleString("pt-BR")}</span><span>{g.comps[club.leagueId]?.name}</span></>} />
      <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-7">
          <Section idx="A" title="Finanças">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Stat label="Caixa" value={formatMoney(club.balance)} />
              <Stat label="Orçamento" value={formatMoney(club.transferBudget)} sub="transferências" />
              <Stat label="Folha" value={formatMoney(wages)} sub="por semana" />
              <Stat label="Teto salarial" value={formatMoney(club.wageBudget)} sub={wages > club.wageBudget ? "estourado" : "por semana"} />
            </div>
          </Section>
          <Section idx="B" title="Objetivos da diretoria">
            <ul>{g.user.objectives.map((o) => <li key={o.id} className="flex justify-between gap-3 border-b line py-2.5 text-[15px]"><span>{o.text}</span><span className={o.status === "cumprido" ? "text-accent" : "dim"}>{o.status}</span></li>)}</ul>
            <div className="mt-5"><div className="label">Confiança</div><Bar value={g.user.boardConfidence} accent className="mt-2" /></div>
          </Section>
          <Section idx="C" title="Sala de troféus">
            {Object.keys(club.trophies).length === 0 ? <p className="dim text-sm">Prateleira vazia por enquanto.</p> : <ul>{Object.entries(club.trophies).map(([k, v]) => <li key={k} className="flex justify-between border-b line py-2 text-sm"><span>{k}</span><span className="num">{v}×</span></li>)}</ul>}
          </Section>
        </div>
        <div className="space-y-12 lg:col-span-5">
          <Section idx="D" title="Você">
            <div className="grid grid-cols-2 gap-6">
              <Stat label="Reputação" value={Math.round(g.user.reputation)} />
              <Stat label="Campanha" value={`${g.user.coachRecord.w}V ${g.user.coachRecord.d}E ${g.user.coachRecord.l}D`} />
              <Stat label="Temporadas no clube" value={g.user.seasonsAtClub + 1} />
              <Stat label="Demissões" value={g.user.firedCount} />
            </div>
          </Section>
          <Section idx="E" title="Clube">
            <div className="grid grid-cols-2 gap-6">
              <Stat label="Reputação" value={Math.round(club.reputation)} />
              <Stat label="Média do elenco" value={Math.round(clubAvgOvr(g, club, 11))} />
              <Stat label="Estrutura de treino" value={`${club.facilities}/5`} />
              <Stat label="Categoria de base" value={`${club.academy}/5`} />
            </div>
            <div className="mt-5"><div className="label">Entrosamento coletivo</div><Bar value={club.cohesion} className="mt-2" /></div>
            {club.rivals[0] && <p className="dim mt-5 text-sm">Rival: {g.clubs[club.rivals[0]]?.name}</p>}
          </Section>
          {g.user.jobOffers.length > 0 && (
            <Section idx="F" title="Outros clubes querem você">
              {g.user.jobOffers.map((o) => (
                <div key={o.clubId} className="flex items-center gap-3 border-b line py-2.5"><Crest g={g} id={o.clubId} size={22} /><span className="flex-1 truncate">{g.clubs[o.clubId].name}</span><button className="btn btn-sm" onClick={() => { if (confirm(`Deixar o ${club.name} e assumir o ${g.clubs[o.clubId].name}?`)) act((gg) => acceptJob(gg, o.clubId)); }}>Aceitar</button></div>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Meu() {
  const g = useG();
  return g.user.mode === "player" && me(g) ? <PlayerView /> : <ClubView />;
}
