"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NATIONS, POS_LABEL, POSITIONS } from "@/engine/constants";
import { createCareer, startingOvr } from "@/engine/game";
import { createWorld } from "@/engine/world/generate";
import { PLAY_STYLES } from "@/engine/world/players";
import { clubAvgOvr } from "@/engine/market/transfers";
import type { Foot, GameState, NationId, Pos } from "@/engine/types";
import { useGame } from "@/store/game";
import { localBackend } from "@/store/persist";
import { Crest } from "@/components/ui";

const STYLE_HINT: Record<string, string> = {
  Artilheiro: "finalização e cabeceio",
  Velocista: "velocidade e drible",
  Armador: "passe e visão",
  Driblador: "drible acima de tudo",
  Muralha: "marcação e físico",
  "Box-to-box": "fôlego para o campo todo",
  Maestro: "visão e cabeça fria",
  Reflexos: "goleiro de reflexos rápidos",
};

export default function Nova() {
  const router = useRouter();
  const setGame = useGame((s) => s.setGame);
  const [seed, setSeed] = useState(0);
  const [world, setWorld] = useState<GameState | null>(null);
  useEffect(() => {
    const s = (Date.now() % 2147483647) >>> 0;
    setSeed(s);
    setWorld(createWorld(s));
  }, []);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"player" | "coach">("player");
  const [name, setName] = useState("");
  const [last, setLast] = useState("");
  const [nation, setNation] = useState<NationId>("BRA");
  const [age, setAge] = useState(17);
  const [pos, setPos] = useState<Pos>("ATA");
  const [foot, setFoot] = useState<Foot>("D");
  const [height, setHeight] = useState(180);
  const [style, setStyle] = useState("Artilheiro");
  const [leagueId, setLeagueId] = useState("L-BRA-2");
  const [clubId, setClubId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const leagues = useMemo(() => NATIONS.flatMap((n) => n.leagues.map((l) => ({ id: `L-${n.id}-${l.tier}`, name: l.name, nation: n.name }))), []);
  const clubs = useMemo(
    () => !world ? [] : Object.values(world.clubs).filter((c) => c.leagueId === leagueId).map((c) => ({ c, avg: Math.round(clubAvgOvr(world, c, 11)) })).sort((a, b) => b.c.reputation - a.c.reputation),
    [world, leagueId],
  );
  const myOvr = startingOvr(age);
  const styles = pos === "GOL" ? ["Reflexos"] : PLAY_STYLES.filter((s) => s !== "Reflexos");
  const nameOk = name.trim().length >= 2 && (mode === "coach" || last.trim().length >= 2);

  async function start() {
    if (!clubId || busy || !world) return;
    setBusy(true);
    const g = createCareer(
      mode === "player"
        ? { mode, name: name.trim(), last: last.trim(), nation, age, pos, foot, height, style, clubId, seed }
        : { mode, name: name.trim(), nation, clubId, seed },
      world,
    );
    await localBackend.save(g);
    setGame(g);
    router.push("/jogo");
  }

  const steps = ["Modo", "Identidade", "Clube"];
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 pb-28 pt-6 sm:px-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="label hover:text-paper">← Football Legacy</Link>
        <div className="flex gap-4">
          {steps.map((s, i) => (
            <span key={s} className={`label ${i === step ? "text-accent" : ""}`}>({String(i + 1).padStart(2, "0")}) {s}</span>
          ))}
        </div>
      </div>

      {step === 0 && (
        <section className="pt-[8vh]">
          <h1 className="display rise text-[clamp(2.6rem,9vw,7rem)]">Como você<br />quer começar?</h1>
          <div className="rise rise-1 mt-10 grid gap-px border line sm:grid-cols-2">
            {([
              ["player", "Jogador", "Crie um atleta de overall 55–68. Treine, dispute posição, ganhe convocações, receba propostas e construa amizades no vestiário."],
              ["coach", "Treinador", "Assuma qualquer clube. Escale, contrate, venda, cumpra metas da diretoria — ou seja demitido."],
            ] as const).map(([id, t, d]) => (
              <button key={id} onClick={() => { setMode(id); setStep(1); setLeagueId(id === "player" ? "L-BRA-2" : "L-BRA-1"); }} className="group surface p-6 text-left transition-colors duration-500 hover:bg-white/5 sm:p-8">
                <div className="label">{id === "player" ? "(A)" : "(B)"}</div>
                <div className="display mt-3 text-4xl transition-colors duration-500 group-hover:text-accent sm:text-5xl">{t}</div>
                <p className="dim mt-4 max-w-sm text-sm leading-relaxed">{d}</p>
                <div className="mt-6 text-sm">Escolher →</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="rise pt-[6vh]">
          <h1 className="display text-[clamp(2.4rem,8vw,6rem)]">{mode === "player" ? "Seu atleta" : "Seu nome no banco"}</h1>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <label className="block"><span className="label">Nome</span><input className="input mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === "player" ? "Ex.: Caio" : "Ex.: Prof. Caio Brandão"} maxLength={24} /></label>
            {mode === "player" && <label className="block"><span className="label">Sobrenome</span><input className="input mt-2" value={last} onChange={(e) => setLast(e.target.value)} placeholder="Ex.: Brandão" maxLength={20} /></label>}
            <label className="block"><span className="label">Nacionalidade</span>
              <select className="input mt-2" value={nation} onChange={(e) => setNation(e.target.value as NationId)}>
                {NATIONS.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </label>
            {mode === "player" && (
              <>
                <label className="block"><span className="label">Idade · {age} anos</span>
                  <input type="range" min={16} max={22} value={age} onChange={(e) => setAge(+e.target.value)} className="mt-4 w-full accent-[#3ee27f]" />
                  <span className="dim text-xs">Mais novo: overall menor, potencial maior. Overall inicial ≈ {myOvr}.</span>
                </label>
                <div><span className="label">Posição</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {POSITIONS.map((p) => <button key={p} className="chip" data-on={pos === p} onClick={() => { setPos(p); setStyle(p === "GOL" ? "Reflexos" : style === "Reflexos" ? "Artilheiro" : style); }}>{POS_LABEL[p]}</button>)}
                  </div>
                </div>
                <div><span className="label">Estilo de jogo</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {styles.map((s) => <button key={s} className="chip" data-on={style === s} onClick={() => setStyle(s)}>{s}</button>)}
                  </div>
                  <span className="dim mt-1 block text-xs">{STYLE_HINT[style]}</span>
                </div>
                <div><span className="label">Pé dominante</span>
                  <div className="mt-2 flex gap-2">
                    {([["D", "Direito"], ["E", "Esquerdo"], ["A", "Ambidestro"]] as const).map(([f, l]) => <button key={f} className="chip" data-on={foot === f} onClick={() => setFoot(f)}>{l}</button>)}
                  </div>
                </div>
                <label className="block"><span className="label">Altura · {height} cm</span>
                  <input type="range" min={162} max={198} value={height} onChange={(e) => setHeight(+e.target.value)} className="mt-4 w-full accent-[#3ee27f]" />
                </label>
              </>
            )}
          </div>
          <div className="mt-10 flex gap-3">
            <button className="btn" onClick={() => setStep(0)}>← Voltar</button>
            <button className="btn btn-primary" disabled={!nameOk} onClick={() => setStep(2)}>Escolher clube →</button>
          </div>
        </section>
      )}

      {step === 2 && !world && <p className="dim pt-[10vh]">Gerando o universo…</p>}
      {step === 2 && world && (
        <section className="rise pt-[6vh]">
          <h1 className="display text-[clamp(2.4rem,8vw,6rem)]">Onde tudo começa</h1>
          <p className="dim mt-4 max-w-lg text-sm">
            {mode === "player" ? `Seu overall inicial é cerca de ${myOvr}. Em clubes com média parecida você briga por vaga; em clubes grandes, começa no banco.` : "Clubes grandes cobram título; pequenos só querem não cair. A reputação do clube define as metas da diretoria."}
          </p>
          <div className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {leagues.map((l) => <button key={l.id} className="chip shrink-0" data-on={leagueId === l.id} onClick={() => { setLeagueId(l.id); setClubId(null); }}>{l.name}</button>)}
          </div>
          <table className="t mt-6">
            <thead><tr><th>Clube</th><th className="text-right">Média</th><th className="hidden text-right sm:table-cell">Reputação</th><th className="text-right">{mode === "player" ? "Chance de jogar" : "Expectativa"}</th></tr></thead>
            <tbody>
              {clubs.map(({ c, avg }, i) => {
                const chance = myOvr >= avg ? "Alta" : myOvr >= avg - 5 ? "Média" : "Baixa";
                const exp = i < 2 ? "Título" : i < 5 ? "Top 4" : i < 10 ? "Meio" : "Não cair";
                return (
                  <tr key={c.id} onClick={() => setClubId(c.id)} className={`cursor-pointer ${clubId === c.id ? "me" : ""}`}>
                    <td><span className="flex items-center gap-2"><Crest g={world} id={c.id} size={20} />{c.name}</span></td>
                    <td className="num text-right">{avg}</td>
                    <td className="num hidden text-right sm:table-cell">{Math.round(c.reputation)}</td>
                    <td className="text-right">{mode === "player" ? chance : exp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="sticky bottom-0 -mx-4 mt-8 flex gap-3 border-t line bg-ink px-4 py-4 sm:mx-0 sm:px-0">
            <button className="btn" onClick={() => setStep(1)}>← Voltar</button>
            <button className="btn btn-primary" disabled={!clubId || busy} onClick={start}>{busy ? "Criando o universo…" : clubId ? `Começar no ${world.clubs[clubId].name} →` : "Escolha um clube"}</button>
          </div>
        </section>
      )}
    </main>
  );
}
