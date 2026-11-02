"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/store/game";
import { resolveDecision } from "@/engine/career/decisions";
import { startCoachAfterRetirement } from "@/engine/career/coach";
import { levelLabel } from "@/engine/chemistry/relations";
import { withRng } from "@/engine/season/advance";
import { ensureGroupThread } from "@/engine/chat/chat";
import { seasonLabel } from "@/engine/world/players";
import { Avatar, Modal } from "./ui";

export function Overlays() {
  const router = useRouter();
  const g = useGame((s) => s.game)!;
  useGame((s) => s.v);
  const act = useGame((s) => s.act);
  const toast = useGame((s) => s.showToast);
  const live = useGame((s) => s.live);
  const pending = useGame((s) => s.pendingMatch);
  const [snoozed, setSnoozed] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  if (live || pending) return null;

  // aposentadoria
  if (g.user.retired && g.user.mode === "player") {
    const me = g.user.playerId ? g.players[g.user.playerId] : undefined;
    const goals = me ? me.career.reduce((s, c) => s + c.goals, 0) : 0;
    const apps = me ? me.career.reduce((s, c) => s + c.apps, 0) : 0;
    const titles = g.history.milestones.filter((m) => m.text.startsWith("Título")).length;
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-ink">
        <div className="mx-auto max-w-4xl px-4 py-[10vh] sm:px-8">
          <div className="label">Fim de carreira · Hall da Fama</div>
          <h1 className="display rise mt-3 text-[clamp(3rem,11vw,8rem)]">{g.user.name}</h1>
          <div className="rise rise-1 mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div><div className="label">Legado</div><div className="num mt-1 text-4xl text-accent">{g.user.legacyScore}</div></div>
            <div><div className="label">Jogos</div><div className="num mt-1 text-4xl">{apps}</div></div>
            <div><div className="label">Gols</div><div className="num mt-1 text-4xl">{goals}</div></div>
            <div><div className="label">Títulos</div><div className="num mt-1 text-4xl">{titles}</div></div>
          </div>
          <ol className="rise rise-2 mt-10">
            {g.history.milestones.slice(0, 12).map((m, i) => <li key={i} className="border-t line py-2 text-sm">{m.text}</li>)}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={() => act((gg) => withRng(gg, (r) => startCoachAfterRetirement(gg, r)))}>Virar treinador neste universo →</button>
            <button className="btn" onClick={() => router.push("/")}>Voltar ao início</button>
          </div>
        </div>
      </div>
    );
  }

  // resumo de temporada
  const sum = g.seasonSummary;
  if (sum && g.user.pendingSummary === sum.season) {
    const us = g.history.userSeasons.find((s) => s.season === sum.season);
    return (
      <Modal wide>
        <div className="label">Temporada {seasonLabel(sum.season)} encerrada</div>
        <h2 className="display mt-2 text-4xl sm:text-5xl">Fim de temporada</h2>
        {us && (
          <p className="mt-4 text-[15px]">
            {us.clubName}: {us.pos ? `${us.pos}º na ${us.league}` : us.league}
            {us.apps !== undefined && ` · ${us.apps} jogos, ${us.goals} gols, ${us.assists} assistências, nota ${us.rating?.toFixed(2)}`}
            {us.record && ` · ${us.record.w}V ${us.record.d}E ${us.record.l}D na carreira`}
          </p>
        )}
        {us && us.trophies.length > 0 && <p className="mt-2 text-accent">Títulos: {us.trophies.join(", ")}</p>}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="label mb-2">Campeões</div>
            <ul className="space-y-1 text-[13px]">{sum.champions.map((c) => <li key={c.comp} className="flex justify-between gap-3 border-b line py-1"><span className="dim truncate">{c.comp}</span><span className="truncate">{c.club}</span></li>)}</ul>
          </div>
          <div>
            <div className="label mb-2">Prêmios</div>
            <ul className="space-y-1 text-[13px]">{sum.awards.slice(0, 12).map((a) => <li key={a.award} className="border-b line py-1"><div className="dim text-[11px]">{a.award}</div><div>{a.name} <span className="faint">· {a.club}</span></div></li>)}</ul>
          </div>
        </div>
        {(sum.promoted.length > 0 || sum.relegated.length > 0) && <p className="dim mt-4 text-xs">Sobem: {sum.promoted.join(", ")}. Caem: {sum.relegated.join(", ")}.</p>}
        <button className="btn btn-primary mt-6 w-full" onClick={() => act((gg) => { gg.user.pendingSummary = undefined; })}>Seguir para a pré-temporada →</button>
      </Modal>
    );
  }

  // celebração de dupla/trio
  const cel = g.celebrations.find((c) => g.groups.some((x) => x.id === c.groupId));
  const gr = cel ? g.groups.find((x) => x.id === cel.groupId) : undefined;
  if (cel && gr) {
    const close = () => act((gg) => { gg.celebrations = gg.celebrations.filter((c) => !(c.groupId === cel.groupId && c.day === cel.day && c.kind === cel.kind)); });
    const title = cel.kind === "formado" ? (gr.members.length === 3 ? "Nasce um trio" : "Nasce uma dupla") : cel.kind === "nivel" ? levelLabel(gr.level, gr.members.length) : cel.kind === "fim" ? "Fim de uma era" : "Reencontro histórico";
    return (
      <Modal onClose={close}>
        <div className="label text-accent">Football Chemistry</div>
        <h2 className="display rise mt-3 text-5xl">{title}</h2>
        <div className="rise rise-1 mt-6 flex items-center gap-3">
          {gr.members.map((m) => g.players[m] && <div key={m} className="flex flex-col items-center gap-1"><Avatar p={g.players[m]} size={52} ring={g.players[m].isUser} /><span className="text-xs">{g.players[m].first}</span></div>)}
        </div>
        <p className="dim rise rise-2 mt-5 text-sm">{gr.name} · {gr.clubName} · {gr.goals} gols combinados em {gr.matches} jogos juntos.</p>
        {cel.kind === "formado" && (
          <div className="mt-5 flex gap-2">
            <input className="input" placeholder={`Batizar (sugestão: ${gr.name})`} value={newName} maxLength={28} onChange={(e) => setNewName(e.target.value)} />
            <button className="btn" disabled={newName.trim().length < 2} onClick={() => { act((gg) => { const x = gg.groups.find((y) => y.id === gr.id); if (x) { x.name = newName.trim(); x.custom = true; } ensureGroupThread(gg, gr.id); }); setNewName(""); }}>Batizar</button>
          </div>
        )}
        <div className="mt-6 flex gap-2">
          <button className="btn btn-primary flex-1" onClick={close}>Fechar</button>
          {cel.kind !== "fim" && <button className="btn" onClick={() => { close(); router.push("/jogo/vestiario"); }}>Abrir no Vestiário</button>}
        </div>
      </Modal>
    );
  }

  // decisões narrativas
  const d = g.decisions.find((x) => !snoozed.includes(x.id));
  if (d) {
    return (
      <Modal>
        <div className="label">Decisão · vence em {Math.max(0, d.expires - g.day)} dia(s)</div>
        <h2 className="mt-2 text-2xl font-medium">{d.title}</h2>
        <p className="dim mt-3 text-[15px] leading-relaxed">{d.body}</p>
        <div className="mt-6 grid gap-2">
          {d.options.map((o) => (
            <button key={o.id} className="btn h-auto justify-between py-3 text-left" onClick={() => {
              const msg = act((gg) => withRng(gg, (r) => resolveDecision(gg, r, d.id, o.id)));
              if (msg) toast(msg);
            }}>
              <span className="whitespace-normal">{o.label}</span>{o.hint && <span className="dim ml-3 shrink-0 text-xs">{o.hint}</span>}
            </button>
          ))}
        </div>
        <button className="btn btn-sm btn-ghost mt-3 dim" onClick={() => setSnoozed((s) => [...s, d.id])}>Decidir depois</button>
      </Modal>
    );
  }
  return null;
}
