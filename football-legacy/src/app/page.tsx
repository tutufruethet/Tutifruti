"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { hallOfFame, localBackend, type HallEntry, type SaveMeta } from "@/store/persist";
import { useGame } from "@/store/game";
import { seasonLabel, formatDate } from "@/engine/world/players";

export default function Home() {
  const router = useRouter();
  const setGame = useGame((s) => s.setGame);
  const [saves, setSaves] = useState<SaveMeta[] | null>(null);
  const [hof, setHof] = useState<HallEntry[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    void localBackend.list().then(setSaves).catch(() => setSaves([]));
    void hallOfFame().then(setHof).catch(() => {});
  }, []);

  async function open(id: string) {
    setLoading(id);
    const g = await localBackend.load(id);
    if (g) { setGame(g); router.push("/jogo"); } else setLoading(null);
  }
  async function remove(id: string) {
    if (!confirm("Apagar este salvamento? Não dá para desfazer.")) return;
    await localBackend.remove(id);
    setSaves(await localBackend.list());
  }

  const last = saves?.[0];
  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-4 pb-24 pt-6 sm:px-8">
      <div className="flex items-center justify-between">
        <span className="label">Football Legacy · v0.1</span>
        <span className="label hidden sm:block">Simulador de carreira · offline</span>
      </div>
      <section className="pt-[14vh]">
        <h1 className="display rise text-[clamp(3.2rem,13vw,11rem)]">
          Football<br /><span className="text-accent">Legacy</span>
        </h1>
        <p className="dim rise rise-1 mt-6 max-w-md text-[15px] leading-relaxed">
          Comece como promessa desconhecida ou treinador de clube pequeno. Decisões com consequência, temporadas infinitas e um vestiário que lembra de tudo.
        </p>
        <div className="rise rise-2 mt-8 flex flex-wrap gap-3">
          {last && (
            <button className="btn btn-primary" onClick={() => open(last.id)} disabled={!!loading}>
              {loading === last.id ? "Carregando…" : `Continuar: ${last.name}`} →
            </button>
          )}
          <Link href="/nova" className={`btn ${last ? "" : "btn-primary"}`}>Nova carreira</Link>
        </div>
      </section>

      <section className="rise rise-3 mt-24 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-7">
          <div className="label mb-3">(01) Salvamentos</div>
          {saves === null && <p className="dim text-sm">Lendo salvamentos…</p>}
          {saves?.length === 0 && <p className="dim text-sm">Nenhuma carreira salva ainda. O jogo salva sozinho a cada avanço.</p>}
          <ul>
            {saves?.map((s) => (
              <li key={s.id} className="group flex items-center gap-4 border-t line py-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => open(s.id)} disabled={!!loading}>
                  <div className="truncate text-[15px] transition-colors duration-300 group-hover:text-accent">{s.name}</div>
                  <div className="dim mt-0.5 text-xs">{s.mode === "player" ? "Jogador" : "Treinador"} · {s.club} · {seasonLabel(s.season)} · {formatDate(s.day)}</div>
                </button>
                <button className="btn btn-sm btn-ghost dim" onClick={() => remove(s.id)} aria-label={`Apagar ${s.name}`}>Apagar</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-5">
          <div className="label mb-3">(02) Hall da Fama</div>
          {hof.length === 0 ? (
            <p className="dim text-sm">Carreiras encerradas entram aqui com a pontuação de legado.</p>
          ) : (
            <ol>
              {hof.slice(0, 8).map((h, i) => (
                <li key={h.id} className="flex items-baseline gap-3 border-t line py-2.5 text-sm">
                  <span className="num faint w-5">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{h.name}<span className="dim"> · {h.mode === "player" ? `${h.goals ?? 0} gols` : "treinador"} · {h.titles} títulos</span></span>
                  <span className="num text-accent">{h.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}
