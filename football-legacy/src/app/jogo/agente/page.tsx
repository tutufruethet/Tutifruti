"use client";
import Link from "next/link";
import { useG, useGame } from "@/store/game";
import { agentAccepts, currentAgent, ensureAgents, fireAgent, GOAL_LABEL, hireAgent, requestSearch, setAgentGoal } from "@/engine/career/agent";
import { formatDate, formatMoney } from "@/engine/world/players";
import { teamName } from "@/engine/season/schedule";
import type { AgentGoal } from "@/engine/types";
import { Bar, Crest, PageTitle, Section, Stat } from "@/components/ui";

const GOALS = Object.keys(GOAL_LABEL) as AgentGoal[];
const NET: Record<string, string> = { AS: "América do Sul", EU: "Europa", global: "Mundo todo" };

export default function AgentePage() {
  const g = useG();
  const act = useGame((s) => s.act);
  const toast = useGame((s) => s.showToast);
  const agents = ensureAgents(g);
  const a = currentAgent(g);
  const h = g.user.agent;
  const coach = g.user.mode === "coach";
  const me = g.user.playerId ? g.players[g.user.playerId] : undefined;
  const offers = g.offers.filter((o) => o.viaAgent && o.status === "pendente");

  return (
    <div>
      <PageTitle kicker="(08) Agente" title={a ? a.name : "Agente"} meta={a ? <><span>{a.style}</span><span>Comissão {Math.round(a.commission * 100)}% do salário</span><span>Rede: {NET[a.network]}</span></> : <span>{coach ? "Um agente procura clubes que querem um treinador." : "Contrate um empresário para procurar clubes e negociar por você."}</span>} />

      {a && h ? (
        <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
          <div className="space-y-10 lg:col-span-7">
            <Section idx="A" title={coach ? "Procurar emprego" : "Procurar clube"}>
              {!coach && (
                <>
                  <div className="label mb-2">Objetivo</div>
                  <div className="mb-5 flex flex-wrap gap-2">{GOALS.map((x) => <button key={x} className="chip" data-on={h.goal === x} onClick={() => act((gg) => setAgentGoal(gg, x))}>{GOAL_LABEL[x]}</button>)}</div>
                </>
              )}
              {h.searchUntil && h.searchUntil > g.day ? (
                <p className="text-[15px]"><span className="text-accent">Procurando…</span> retorno em {h.searchUntil - g.day} dia(s) ({formatDate(h.searchUntil)}). Avance o tempo.</p>
              ) : (
                <button className="btn btn-primary" onClick={() => { const m = act((gg) => requestSearch(gg)); if (m) toast(m); }}>{coach ? "Procurar clubes que precisam de técnico" : "Procurar clube agora"} →</button>
              )}
              <p className="dim mt-3 text-xs leading-relaxed">
                {coach ? "Os contatos dele aumentam suas chances de receber propostas de emprego." : `Quanto maior a reputação do agente, mais propostas e clubes maiores. A negociação dele melhora o salário em até ${Math.round(a.negotiation / 4)}%. Propostas chegam em Transferências → Propostas.`}
              </p>
              {offers.length > 0 && (
                <ul className="mt-5">
                  {offers.map((o) => (
                    <li key={o.id} className="flex items-center gap-3 border-b line py-2.5 text-sm">
                      <Crest g={g} id={o.fromClubId} size={20} />
                      <span className="min-w-0 flex-1 truncate">{teamName(g, o.fromClubId)} · <span className="num">{formatMoney(o.wage)}/sem</span> · {o.role}</span>
                      <Link className="btn btn-sm" href="/jogo/transferencias?aba=propostas">Ver</Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section idx="B" title="Relatórios">
              {h.reports.length === 0 ? <p className="dim text-sm">Nada ainda.</p> : (
                <ul>{h.reports.slice(0, 12).map((r, i) => <li key={i} className="border-b line py-2.5 text-sm"><div className="label">{formatDate(r.day)}</div><div className="mt-1">{r.text}</div></li>)}</ul>
              )}
              <Link href="/jogo/vestiario?t=agente" className="btn btn-sm mt-4">Conversar com o agente</Link>
            </Section>
          </div>
          <div className="space-y-10 lg:col-span-5">
            <Section idx="C" title="Contrato com o agente">
              <div className="grid grid-cols-2 gap-6">
                <Stat label="Reputação" value={a.rep} />
                <Stat label="Negociação" value={a.negotiation} />
                <Stat label="Propostas trazidas" value={h.offersFound} />
                <Stat label="Comissões pagas" value={formatMoney(h.earned)} />
              </div>
              <p className="dim mt-5 text-sm">{a.bio}</p>
              <p className="dim mt-2 text-xs">Desde {formatDate(h.hiredDay)}.</p>
              <button className="btn btn-sm btn-ghost dim mt-5" onClick={() => { if (confirm(`Dispensar ${a.name}?`)) act((gg) => fireAgent(gg)); }}>Dispensar agente</button>
            </Section>
          </div>
        </div>
      ) : null}

      <Section idx={a ? "D" : "A"} title={a ? "Outros agentes" : "Escolha um agente"} className="mt-12">
        <ul className="grid gap-px border line sm:grid-cols-2 lg:grid-cols-3">
          {agents.filter((x) => x.id !== a?.id).map((x) => {
            const acc = agentAccepts(g, x);
            return (
              <li key={x.id} className="surface flex flex-col p-5">
                <div className="label">{x.style}</div>
                <div className="mt-2 text-xl">{x.name}</div>
                <p className="dim mt-2 flex-1 text-xs leading-relaxed">{x.bio}</p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="grid grid-cols-[90px_1fr_28px] items-center gap-2"><span className="dim">Reputação</span><Bar value={x.rep} accent /><span className="num text-right">{x.rep}</span></div>
                  <div className="grid grid-cols-[90px_1fr_28px] items-center gap-2"><span className="dim">Negociação</span><Bar value={x.negotiation} /><span className="num text-right">{x.negotiation}</span></div>
                  <div className="flex justify-between"><span className="dim">Comissão</span><span className="num">{Math.round(x.commission * 100)}%{me ? ` · ${formatMoney(Math.round(me.contract.wage * x.commission))}/sem` : ""}</span></div>
                  <div className="flex justify-between"><span className="dim">Rede</span><span>{NET[x.network]}</span></div>
                </div>
                <button className="btn btn-sm mt-4" disabled={!acc.ok} title={acc.reason} onClick={() => { const m = act((gg) => hireAgent(gg, x.id, gg.user.agent?.goal ?? "salario")); if (m) toast(m); }}>{acc.ok ? (a ? "Trocar para este" : "Contratar") : "Não te aceita ainda"}</button>
                {!acc.ok && <p className="dim mt-2 text-[11px]">{acc.reason}</p>}
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
