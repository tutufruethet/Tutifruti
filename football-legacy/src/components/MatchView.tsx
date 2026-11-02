"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/store/game";
import { createMatch, finalizeMatch, makeSub, resolveDecision, setTactic, stepMinute, type MatchState } from "@/engine/match/engine";
import { FORMATIONS, POS_LABEL } from "@/engine/constants";
import { shortName } from "@/engine/world/players";
import type { GameState, Mentality } from "@/engine/types";
import { Crest, Modal } from "./ui";

const MENT = ["Retranca", "Defensivo", "Equilibrado", "Ofensivo", "Tudo ao ataque"];

export function PreMatch({ fixtureId }: { fixtureId: string }) {
  const router = useRouter();
  const g = useGame((s) => s.game)!;
  const playInstant = useGame((s) => s.playInstant);
  const startLive = useGame((s) => s.startLive);
  const fx = g.fixtures[fixtureId];
  const preview = useMemo(() => (fx ? createMatch(g, fx) : null), [g, fx]);
  if (!fx || !preview) return null;
  const comp = g.comps[fx.compId];
  const meId = g.user.playerId;
  const myStatus = meId ? (preview.sides.some((s) => s.xi.some((x) => x.id === meId)) ? "Titular" : preview.sides.some((s) => s.bench.includes(meId)) ? "No banco" : "Fora da lista") : null;
  return (
    <Modal wide onClose={() => useGame.setState({ pendingMatch: null })}>
      <div className="label">{comp?.name} · {fx.round}{fx.neutral ? " · campo neutro" : ""}</div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {preview.sides.map((s, i) => (
          <div key={s.teamId} className={`flex items-center gap-3 ${i === 1 ? "order-3 flex-row-reverse text-right" : ""}`}>
            <Crest g={g} id={s.teamId} size={40} />
            <div className="min-w-0"><div className="display truncate text-2xl sm:text-3xl">{s.short}</div><div className="dim truncate text-xs">{s.name}</div></div>
          </div>
        ))}
        <div className="order-2 num faint text-center">×</div>
      </div>
      {myStatus && <p className="mt-4 text-sm">Você: <span className={myStatus === "Titular" ? "text-accent" : "dim"}>{myStatus}</span>{myStatus !== "Titular" && " — pode entrar no segundo tempo."}</p>}
      <div className="mt-5 grid grid-cols-2 gap-4 text-[13px]">
        {preview.sides.map((s) => (
          <ol key={s.teamId} className="space-y-0.5">
            <li className="label mb-1">{s.tactic.formation}</li>
            {s.xi.map((x) => (
              <li key={x.id} className={`flex gap-2 ${x.id === meId ? "text-accent" : ""}`}><span className="num faint w-8">{x.slot}</span><span className="truncate">{shortName(g.players[x.id])}</span><span className="num faint ml-auto">{g.players[x.id].ovr}</span></li>
            ))}
          </ol>
        ))}
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        <button className="btn" onClick={() => playInstant(fixtureId)}>Instantânea</button>
        <button className="btn" onClick={() => startLive(fixtureId, "ao_vivo")}>Ao vivo</button>
        <button className="btn btn-primary" onClick={() => startLive(fixtureId, "interativa")}>Interativa</button>
      </div>
      <p className="dim mt-3 text-xs">
        {g.user.mode === "coach" ? "Interativa: mude tática e faça substituições durante o jogo." : "Interativa: você decide os lances em que a bola chega em você."}
      </p>
      {g.user.mode === "coach" && <button className="btn btn-sm btn-ghost mt-2 dim" onClick={() => { useGame.setState({ pendingMatch: null }); router.push("/jogo/elenco"); }}>Ajustar escalação antes →</button>}
    </Modal>
  );
}

function useTicker(g: GameState, ms: MatchState, running: boolean, speed: number) {
  const tick = useGame((s) => s.tickLive);
  const ref = useRef(ms);
  ref.current = ms;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const m = ref.current;
      if (m.finished || m.pending) return;
      stepMinute(g, m);
      tick();
    }, 620 / speed);
    return () => clearInterval(id);
  }, [g, running, speed, tick]);
}

export function MatchView() {
  const g = useGame((s) => s.game)!;
  const live = useGame((s) => s.live)!;
  useGame((s) => s.v);
  const tick = useGame((s) => s.tickLive);
  const finish = useGame((s) => s.finishLive);
  const setSettings = useGame((s) => s.setSettings);
  const ms = live.ms;
  const [paused, setPaused] = useState(false);
  const [panel, setPanel] = useState(false);
  const [subOut, setSubOut] = useState<string | null>(null);
  const speed = g.settings.matchSpeed;
  useTicker(g, ms, !paused && !panel && !ms.finished && !ms.pending, speed);
  const [h, a] = ms.sides;
  const side = ms.userSide;
  const interactive = live.mode === "interativa";
  const total = Math.max(1, ms.poss[0] + ms.poss[1]);
  const p0 = Math.round((ms.poss[0] / total) * 100);
  const final = useMemo(() => (ms.finished ? finalizeMatch(g, ms) : null), [g, ms, ms.finished]);
  const meId = g.user.playerId;

  const skip = () => {
    let guard = 0;
    while (!ms.finished && guard++ < 200) {
      if (ms.pending) resolveDecision(g, ms, ms.pending.options[0].id);
      stepMinute(g, ms);
    }
    tick();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-5 sm:px-8">
        <div className="flex items-center justify-between">
          <div className="label flex items-center gap-2">{!ms.finished && <span className="live-dot" />}{g.comps[ms.compId]?.name ?? "Partida"} · {live.mode === "interativa" ? "Interativa" : "Ao vivo"}</div>
          <div className="flex gap-1">
            {([1, 2, 4] as const).map((s) => <button key={s} className="chip" data-on={speed === s} onClick={() => setSettings({ matchSpeed: s })}>{s}×</button>)}
          </div>
        </div>
        {/* placar */}
        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
          <div className="flex items-center justify-end gap-3 text-right"><div className="min-w-0"><div className="display truncate text-2xl sm:text-4xl">{h.short}</div><div className="dim hidden truncate text-xs sm:block">{h.name}</div></div><Crest g={g} id={h.teamId} size={44} /></div>
          <div className="text-center">
            <div className="score text-[clamp(3rem,12vw,6.5rem)] leading-none">{ms.score[0]}<span className="faint">–</span>{ms.score[1]}</div>
            <div className="num mt-2 text-sm text-accent">{ms.finished ? "Fim" : `${ms.minute}'`}{ms.pens ? ` · pên. ${ms.pens[0]}–${ms.pens[1]}` : ""}</div>
          </div>
          <div className="flex items-center gap-3"><Crest g={g} id={a.teamId} size={44} /><div className="min-w-0"><div className="display truncate text-2xl sm:text-4xl">{a.short}</div><div className="dim hidden truncate text-xs sm:block">{a.name}</div></div></div>
        </div>
        {/* barra de tempo e estatísticas */}
        <div className="bar accent mt-6"><i style={{ width: `${Math.min(100, (ms.minute / 90) * 100)}%` }} /></div>
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div><div className="label">Posse</div><div className="num mt-1">{p0}% · {100 - p0}%</div></div>
          <div><div className="label">Finalizações</div><div className="num mt-1">{ms.shots[0]} · {ms.shots[1]}</div></div>
          <div><div className="label">No alvo</div><div className="num mt-1">{ms.sot[0]} · {ms.sot[1]}</div></div>
        </div>

        {/* decisão do jogador */}
        {ms.pending && (
          <div className="rise mt-8 border border-accent p-5">
            <div className="label text-accent">Sua decisão</div>
            <p className="mt-2 text-lg">{ms.pending.text}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {ms.pending.options.map((o) => (
                <button key={o.id} className="btn justify-between" onClick={() => { resolveDecision(g, ms, o.id); tick(); }}>
                  <span>{o.label}</span><span className="dim text-xs">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* controles */}
        <div className="mt-8 flex flex-wrap gap-2">
          {!ms.finished && <button className="btn btn-sm" onClick={() => setPaused((p) => !p)}>{paused ? "Continuar" : "Pausar"}</button>}
          {!ms.finished && interactive && side !== null && <button className="btn btn-sm" onClick={() => setPanel(true)}>Tática e substituições</button>}
          {!ms.finished && <button className="btn btn-sm" onClick={skip}>Simular até o fim</button>}
          {ms.finished && <button className="btn btn-primary" onClick={finish}>Continuar carreira →</button>}
        </div>

        {/* notas no fim */}
        {final && (
          <div className="rise mt-8">
            <div className="label mb-2">Notas</div>
            <div className="grid gap-x-8 sm:grid-cols-2">
              {[0, 1].map((si) => (
                <ol key={si}>
                  {final.lines.filter((l) => l.side === si && l.minutes > 0).sort((x, y) => y.rating - x.rating).map((l) => (
                    <li key={l.playerId} className={`flex items-center gap-2 border-b line py-1.5 text-[13px] ${l.playerId === meId ? "text-accent" : ""}`}>
                      <span className="truncate">{shortName(g.players[l.playerId])}{final.motm === l.playerId ? " ★" : ""}</span>
                      <span className="dim text-xs">{l.goals ? `${l.goals}G ` : ""}{l.assists ? `${l.assists}A` : ""}</span>
                      <span className="num ml-auto">{l.rating.toFixed(1)}</span>
                    </li>
                  ))}
                </ol>
              ))}
            </div>
          </div>
        )}

        {/* narração */}
        <div className="mt-8">
          <div className="label mb-2">Lance a lance</div>
          <ol>
            {[...ms.events].reverse().map((e, i) => {
              const big = e.type === "goal" || e.type === "pen_goal";
              return (
                <li key={`${e.min}-${i}-${e.type}`} className={`flex gap-4 border-b line py-2 text-[14px] ${i === 0 ? "rise" : ""}`}>
                  <span className={`num w-8 shrink-0 text-right ${big ? "text-accent" : "faint"}`}>{e.min}&apos;</span>
                  <span className={big ? "text-paper" : e.type === "info" || e.type === "sub" ? "dim" : ""}>{e.text}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {panel && side !== null && (
        <Modal wide onClose={() => { setPanel(false); setSubOut(null); }}>
          <div className="label">Tática</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.keys(FORMATIONS).map((f) => <button key={f} className="chip" data-on={ms.sides[side].tactic.formation === f} onClick={() => { setTactic(g, ms, side, { formation: f }); tick(); }}>{f}</button>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {MENT.map((m, i) => <button key={m} className="chip" data-on={ms.sides[side].tactic.mentality === i - 2} onClick={() => { setTactic(g, ms, side, { mentality: (i - 2) as Mentality }); tick(); }}>{m}</button>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["Pressão baixa", "Pressão média", "Pressão alta"] as const).map((m, i) => <button key={m} className="chip" data-on={ms.sides[side].tactic.pressing === i} onClick={() => { setTactic(g, ms, side, { pressing: i as 0 | 1 | 2 }); tick(); }}>{m}</button>)}
          </div>
          <div className="label mt-6">Substituições · restam {ms.sides[side].subsLeft}</div>
          <p className="dim mt-1 text-xs">{subOut ? "Agora escolha quem entra." : "Escolha quem sai (condição física ao lado)."}</p>
          <div className="mt-3 grid gap-6 sm:grid-cols-2">
            <ol>
              {ms.sides[side].xi.map((x) => (
                <li key={x.id}>
                  <button className={`flex w-full items-center gap-2 border-b line py-1.5 text-left text-[13px] ${subOut === x.id ? "text-accent" : ""}`} onClick={() => setSubOut(x.id)}>
                    <span className="num faint w-8">{x.slot}</span><span className="truncate">{shortName(g.players[x.id])}</span>
                    {ms.lines[x.id]?.injured && <span className="text-xs">lesionado</span>}
                    <span className="num faint ml-auto">{Math.round(ms.fit[x.id] ?? 0)}%</span>
                  </button>
                </li>
              ))}
            </ol>
            <ol>
              {ms.sides[side].bench.map((id) => (
                <li key={id}>
                  <button disabled={!subOut || ms.sides[side].subsLeft <= 0} className="flex w-full items-center gap-2 border-b line py-1.5 text-left text-[13px] disabled:opacity-50" onClick={() => { if (subOut && makeSub(g, ms, side, subOut, id)) { setSubOut(null); tick(); } }}>
                    <span className="num faint w-8">{g.players[id].pos}</span><span className="truncate">{shortName(g.players[id])}</span><span className="num faint ml-auto">{g.players[id].ovr}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <button className="btn btn-primary mt-6 w-full" onClick={() => { setPanel(false); setSubOut(null); }}>Voltar ao jogo</button>
          <p className="dim mt-2 text-xs">{POS_LABEL.GOL} só substitui {POS_LABEL.GOL.toLowerCase()}. O jogo fica pausado enquanto este painel está aberto.</p>
        </Modal>
      )}
    </div>
  );
}
