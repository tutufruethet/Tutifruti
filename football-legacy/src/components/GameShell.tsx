"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useGame } from "@/store/game";
import { lastSaveId, localBackend } from "@/store/persist";
import { formatDate, seasonLabel } from "@/engine/world/players";
import { nextUserFixture, userFixtureToday } from "@/engine/season/queries";
import { teamName } from "@/engine/season/schedule";
import { unreadCount } from "@/engine/chat/chat";
import { MatchView, PreMatch } from "./MatchView";
import { Overlays } from "./Overlays";

export const NAV = [
  { href: "/jogo", label: "Painel" },
  { href: "/jogo/meu", label: "Meu jogador", coach: "Meu clube" },
  { href: "/jogo/calendario", label: "Calendário" },
  { href: "/jogo/partidas", label: "Partidas" },
  { href: "/jogo/classificacao", label: "Classificação" },
  { href: "/jogo/elenco", label: "Elenco" },
  { href: "/jogo/transferencias", label: "Transferências" },
  { href: "/jogo/agente", label: "Agente" },
  { href: "/jogo/treino", label: "Treino" },
  { href: "/jogo/noticias", label: "Notícias" },
  { href: "/jogo/vestiario", label: "Vestiário" },
  { href: "/jogo/estatisticas", label: "Estatísticas" },
  { href: "/jogo/historico", label: "Histórico" },
  { href: "/jogo/config", label: "Configurações" },
];

const MOBILE = ["/jogo", "/jogo/partidas", "/jogo/vestiario", "/jogo/elenco"];

export function GameShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const game = useGame((s) => s.game);
  useGame((s) => s.v);
  const setGame = useGame((s) => s.setGame);
  const advance = useGame((s) => s.advance);
  const pending = useGame((s) => s.pendingMatch);
  const live = useGame((s) => s.live);
  const saving = useGame((s) => s.saving);
  const toast = useGame((s) => s.toast);
  const checkAI = useGame((s) => s.checkAI);
  const [booting, setBooting] = useState(!game);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (game) { setBooting(false); return; }
    void (async () => {
      const id = await lastSaveId();
      const g = id ? await localBackend.load(id) : null;
      if (g) setGame(g);
      else router.replace("/");
      setBooting(false);
    })();
  }, [game, router, setGame]);

  useEffect(() => { void checkAI(); }, [checkAI]);
  useEffect(() => setMore(false), [path]);

  if (booting || !game) return <div className="grid min-h-dvh place-items-center"><span className="label">Carregando carreira…</span></div>;

  const g = game;
  const club = g.user.clubId ? g.clubs[g.user.clubId] : undefined;
  const today = userFixtureToday(g);
  const next = nextUserFixture(g);
  const unread = unreadCount(g);
  const opp = next ? teamName(g, next.homeId === g.user.clubId || next.homeId === `N-${g.user.nation}` ? next.awayId : next.homeId) : "";
  const inDays = next ? next.day - g.day : 0;
  const blocked = (g.user.retired && g.user.mode === "player") || !!live;

  const nav = NAV.map((n) => ({ ...n, label: g.user.mode === "coach" && n.coach ? n.coach : n.label }));
  const isActive = (href: string) => (href === "/jogo" ? path === "/jogo" : path.startsWith(href));

  const advanceBtns = (
    <div className="flex items-center gap-2">
      <button className="btn btn-sm" disabled={blocked || !!today} onClick={() => advance("dia")} title="Avançar um dia">+1 dia</button>
      <button className="btn btn-sm hidden sm:inline-flex" disabled={blocked || !!today} onClick={() => advance("semana")} title="Avançar uma semana">+1 semana</button>
      {today ? (
        <button className="btn btn-sm btn-primary" disabled={blocked} onClick={() => useGame.setState({ pendingMatch: today.id })}>Jogo hoje →</button>
      ) : (
        <button className="btn btn-sm btn-primary" disabled={blocked} onClick={() => advance("proximo")} title="Avança até o próximo compromisso, parando em decisões e propostas">
          <span className="sm:hidden">Avançar →</span><span className="hidden sm:inline">Próximo compromisso →</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[220px_1fr]">
      {/* navegação lateral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r line px-5 py-6 lg:flex">
        <Link href="/" className="display text-xl">Football<br /><span className="text-accent">Legacy</span></Link>
        <nav className="mt-8 flex-1 overflow-y-auto no-scrollbar">
          {nav.map((n, i) => (
            <Link key={n.href} href={n.href} className={`group flex items-baseline gap-3 py-1.5 text-[14px] transition-colors duration-300 ${isActive(n.href) ? "text-paper" : "dim hover:text-paper"}`}>
              <span className={`num w-6 text-[10px] ${isActive(n.href) ? "text-accent" : "faint"}`}>{String(i + 1).padStart(2, "0")}</span>
              {n.label}
              {n.href === "/jogo/vestiario" && unread > 0 && <span className="num ml-auto text-[11px] text-accent">{unread}</span>}
            </Link>
          ))}
        </nav>
        <div className="label leading-relaxed">{saving ? "Salvando…" : "Salvo automaticamente"}</div>
      </aside>

      <div className="min-w-0">
        {/* barra superior */}
        <header className="sticky top-0 z-30 border-b line bg-ink/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-8">
            <div className="min-w-0">
              <div className="num truncate text-[13px]">{formatDate(g.day, true)} <span className="faint">· {seasonLabel(g.season)}</span></div>
              <div className="dim truncate text-xs">
                {g.user.retired && g.user.mode === "player" ? "Carreira encerrada" : today ? <>Hoje: <span className="text-accent">jogo contra {opp}</span></> : next ? `Próximo: ${opp} ${inDays === 1 ? "amanhã" : `em ${inDays} dias`}` : club ? club.name : "Sem clube"}
              </div>
            </div>
            {advanceBtns}
          </div>
        </header>

        <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-6 sm:px-8 lg:pb-16">{children}</main>
      </div>

      {/* navegação inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t line bg-ink/95 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {MOBILE.map((href) => {
          const n = nav.find((x) => x.href === href)!;
          return (
            <Link key={href} href={href} className={`relative py-3 text-center text-[12px] ${isActive(href) ? "text-paper" : "dim"}`}>
              {isActive(href) && <span className="absolute inset-x-6 top-0 h-px bg-accent" />}
              {n.label === "Classificação" ? "Tabela" : n.label}
              {href === "/jogo/vestiario" && unread > 0 && <span className="num ml-1 text-accent">{unread}</span>}
            </Link>
          );
        })}
        <button className={`py-3 text-[12px] ${more ? "text-paper" : "dim"}`} onClick={() => setMore((m) => !m)}>Mais</button>
      </nav>
      {more && (
        <div className="fixed inset-0 z-30 bg-ink/80 lg:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-0 bottom-[52px] border-t line bg-ink px-4 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-x-6">
              {nav.filter((n) => !MOBILE.includes(n.href)).map((n) => (
                <Link key={n.href} href={n.href} className={`border-b line py-3 text-[15px] ${isActive(n.href) ? "text-accent" : ""}`}>{n.label}</Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {pending && !live && <PreMatch fixtureId={pending} />}
      {live && <MatchView />}
      <Overlays />
      {toast && <div className="rise fixed bottom-20 left-1/2 z-[60] w-[min(92vw,420px)] -translate-x-1/2 border line bg-ink px-4 py-3 text-sm lg:bottom-6">{toast}</div>}
    </div>
  );
}
