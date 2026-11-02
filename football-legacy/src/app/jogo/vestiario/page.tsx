"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useG, useGame } from "@/store/game";
import { contacts, dmId, ensureDm, ensureGroupThread, ensureTeamThread, markRead, meId, unreadCount } from "@/engine/chat/chat";
import { friendsOf, getRel, groupAvgChem, levelLabel } from "@/engine/chemistry/relations";
import { POS_LABEL } from "@/engine/constants";
import { formatShortDate } from "@/engine/world/players";
import type { ChatThread, GameState } from "@/engine/types";
import { Avatar, Bar, PageTitle, Tabs } from "@/components/ui";

const TYPE_LABEL: Record<string, string> = { brincalhao: "Brincalhão", competitivo: "Competitivo", timido: "Tímido", leal: "Leal", ambicioso: "Ambicioso", arrogante: "Arrogante", lider: "Líder", emocional: "Emocional" };

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function lastMsg(t: ChatThread) {
  return t.messages[t.messages.length - 1];
}

function ThreadAvatar({ g, t }: { g: GameState; t: ChatThread }) {
  const ps = t.members.map((m) => g.players[m]).filter(Boolean);
  if (t.kind === "dm" && ps[0]) return <Avatar p={ps[0]} size={40} />;
  return (
    <div className="relative h-10 w-10 shrink-0">
      {ps.slice(0, 2).map((p, i) => <div key={p.id} className="absolute" style={{ left: i * 12, top: i * 8 }}><Avatar p={p} size={28} /></div>)}
    </div>
  );
}

function Conversations() {
  const g = useG();
  const act = useGame((s) => s.act);
  const send = useGame((s) => s.send);
  const typingUntil = useGame((s) => s.typingUntil);
  const params = useSearchParams();
  const router = useRouter();
  const open = params.get("t");
  const [text, setText] = useState("");
  const [picking, setPicking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const me = meId(g);

  useEffect(() => { if (!g.chat.threads[open ?? ""] && g.user.clubId) act((gg) => { ensureTeamThread(gg); }); }, [act, g, open]);
  const threads = Object.values(g.chat.threads)
    .filter((t) => t.messages.length > 0 || t.id === open)
    .sort((a, b) => (lastMsg(b)?.id ?? 0) - (lastMsg(a)?.id ?? 0));
  const t = open ? g.chat.threads[open] : undefined;
  const pendingTyping = Object.entries(typingUntil).filter(([k]) => t && k.startsWith(`${t.id}:`));
  const now = useNow(pendingTyping.some(([, v]) => v > Date.now()));
  const hidden = new Set(pendingTyping.filter(([, v]) => v > now).map(([k]) => Number(k.split(":").pop())));
  const visible = t ? t.messages.filter((m) => !hidden.has(m.id)) : [];
  const typer = t ? t.messages.find((m) => hidden.has(m.id)) : undefined;

  useEffect(() => { if (t && unreadCount(g, t) > 0 && hidden.size === 0) act((gg) => markRead(gg, t.id)); });
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [visible.length, typer?.id, open]);

  const go = (id: string) => router.push(`/jogo/vestiario?t=${encodeURIComponent(id)}`);
  const openDm = (pid: string) => { act((gg) => { ensureDm(gg, pid); }); setPicking(false); go(dmId(pid)); };

  const other = t?.kind === "dm" ? g.players[t.members[0]] : undefined;
  const rel = other ? getRel(g, me, other.id) : undefined;
  const group = t?.groupId ? g.groups.find((x) => x.id === t.groupId) : undefined;
  const suggestions = useMemo(() => {
    const s = ["E aí, tudo bem?", "Esse jogo vai ser fácil", "Viu o último jogo?"];
    if (g.user.mode === "player") s.push("Tô pensando em sair do clube", "Tô cansado de ficar no banco");
    if (other?.persona.birthday === ((g.day % 364) + 364) % 364) s.unshift("Parabéns pelo aniversário!");
    if (g.decisions.some((d) => d.kind === "conselho_amigo" && d.data?.playerId === other?.id)) s.unshift("Fica, a gente tá construindo algo", "Vai, é tua chance");
    if (group) s.push(`Bora chamar a gente de "${group.name}"?`);
    return s.slice(0, 5);
  }, [g, other, group]);

  const submit = async (msg: string) => {
    if (!t || !msg.trim()) return;
    setText("");
    await send(t.id, msg);
  };

  return (
    <div className="grid h-[calc(100dvh-210px)] min-h-[460px] border line lg:grid-cols-[320px_1fr]">
      {/* lista */}
      <div className={`flex min-h-0 flex-col border-r line ${t ? "hidden lg:flex" : "flex"}`}>
        <div className="flex items-center justify-between border-b line px-4 py-3">
          <span className="label">Conversas</span>
          <button className="btn btn-sm" onClick={() => setPicking((x) => !x)}>{picking ? "Fechar" : "Nova"}</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
          {picking ? contacts(g).map((p) => {
            const r = getRel(g, me, p.id);
            return (
              <button key={p.id} onClick={() => openDm(p.id)} className="flex w-full items-center gap-3 border-b line px-4 py-2.5 text-left transition-colors duration-300 hover:bg-white/5">
                <Avatar p={p} size={34} />
                <div className="min-w-0 flex-1"><div className="truncate text-sm">{p.first} {p.last}</div><div className="dim truncate text-xs">{POS_LABEL[p.pos]} · {p.clubId === g.user.clubId ? "companheiro" : "ex-companheiro"}</div></div>
                {r && <span className="num faint text-xs">{Math.round(r.friendship)}</span>}
              </button>
            );
          }) : threads.map((th) => {
            const lm = lastMsg(th);
            const u = unreadCount(g, th);
            return (
              <button key={th.id} onClick={() => go(th.id)} className={`flex w-full items-center gap-3 border-b line px-4 py-3 text-left transition-colors duration-300 hover:bg-white/5 ${th.id === open ? "surface-2" : ""}`}>
                <ThreadAvatar g={g} t={th} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2"><span className="truncate text-sm">{th.name}</span>{lm && <span className="num faint shrink-0 text-[10px]">{formatShortDate(lm.day)}</span>}</div>
                  <div className={`truncate text-xs ${u ? "text-paper" : "dim"}`}>{lm ? `${lm.from === "me" ? "Você: " : th.kind === "group" && g.players[lm.from] ? `${g.players[lm.from].first}: ` : ""}${lm.text}` : "Sem mensagens"}</div>
                </div>
                {u > 0 && <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] text-ink">{u}</span>}
              </button>
            );
          })}
          {!picking && threads.length === 0 && <p className="dim p-4 text-sm">Ninguém mandou mensagem ainda. Toque em “Nova”.</p>}
        </div>
      </div>

      {/* conversa */}
      <div className={`min-h-0 flex-col ${t ? "flex" : "hidden lg:flex"}`}>
        {!t ? <div className="dim grid flex-1 place-items-center text-sm">Escolha uma conversa.</div> : (
          <>
            <div className="border-b line px-4 py-3">
              <div className="flex items-center gap-3">
                <button className="btn btn-sm btn-ghost lg:hidden" onClick={() => router.push("/jogo/vestiario")} aria-label="Voltar">←</button>
                <ThreadAvatar g={g} t={t} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px]">{t.name}</div>
                  <div className="dim truncate text-xs">
                    {other ? `${TYPE_LABEL[other.persona.type]} · ${POS_LABEL[other.pos]} · ${other.clubId ? g.clubs[other.clubId].short : "sem clube"}` : t.members.map((m) => g.players[m]?.first).join(", ")}
                    {group ? ` · ${levelLabel(group.level, group.members.length)}` : ""}
                  </div>
                </div>
              </div>
              {rel && (
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {([["Amizade", rel.friendship, true], ["Confiança", rel.trust, false], ["Entrosamento", rel.chemistry, false], ["Rivalidade", rel.rivalry, false]] as const).map(([l, v, ac]) => (
                    <div key={l}><div className="label text-[9.5px]">{l}</div><Bar value={v} accent={ac} className="mt-1.5" /><div className="num faint mt-0.5 text-[10px]">{Math.round(v)}</div></div>
                  ))}
                </div>
              )}
              {group && <div className="mt-3 flex items-center gap-3"><div className="label text-[9.5px]">Entrosamento do grupo</div><Bar value={groupAvgChem(g, group)} accent className="flex-1" /><span className="num faint text-[10px]">{Math.round(groupAvgChem(g, group))}</span></div>}
            </div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4 scroll-thin">
              {visible.map((m, i) => {
                const mine = m.from === "me";
                const sys = m.from === "sys";
                const p = g.players[m.from];
                const prev = visible[i - 1];
                const showName = t.kind === "group" && !mine && !sys && prev?.from !== m.from;
                const dayChange = !prev || prev.day !== m.day;
                return (
                  <div key={m.id}>
                    {dayChange && <div className="label py-2 text-center text-[10px]">{formatShortDate(m.day)}</div>}
                    {sys ? <div className="dim text-center text-xs">{m.text}</div> : (
                      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`rise max-w-[82%] rounded-2xl px-3.5 py-2 text-[14.5px] leading-snug ${mine ? "rounded-br-sm bg-paper/[.13]" : "rounded-bl-sm border line surface"}`}>
                          {showName && p && <div className="mb-0.5 text-[11px] text-accent/90">{p.first}</div>}
                          {m.text}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {typer && g.players[typer.from] && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="typing rounded-2xl border line surface px-3 py-2.5"><i /><i /><i /></div>
                  <span className="dim text-xs">{g.players[typer.from].first} está digitando…</span>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div className="border-t line px-3 pb-3 pt-2">
              <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
                {suggestions.map((s) => <button key={s} className="chip shrink-0" onClick={() => submit(s)}>{s}</button>)}
              </div>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void submit(text); }}>
                <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Mensagem" maxLength={300} aria-label="Mensagem" />
                <button className="btn btn-primary" disabled={!text.trim()}>Enviar</button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Friends() {
  const g = useG();
  const act = useGame((s) => s.act);
  const router = useRouter();
  const me = meId(g);
  const list = friendsOf(g, me).filter((f) => !f.p.retired);
  return (
    <table className="t">
      <thead><tr><th>Jogador</th><th className="hidden sm:table-cell">Personalidade</th><th>Amizade</th><th className="hidden sm:table-cell">Confiança</th><th className="hidden md:table-cell">Entrosamento</th><th className="hidden md:table-cell">Rivalidade</th><th /></tr></thead>
      <tbody>
        {list.map(({ id, rel, p }) => (
          <tr key={id}>
            <td><span className="flex items-center gap-2"><Avatar p={p} size={26} /><span className="truncate">{p.first} {p.last}</span>{p.clubId !== g.user.clubId && <span className="faint text-xs">ex</span>}</span></td>
            <td className="dim hidden sm:table-cell">{TYPE_LABEL[p.persona.type]}</td>
            <td className="w-28"><Bar value={rel.friendship} accent /></td>
            <td className="hidden w-24 sm:table-cell"><Bar value={rel.trust} /></td>
            <td className="hidden w-24 md:table-cell"><Bar value={rel.chemistry} /></td>
            <td className="hidden w-24 md:table-cell"><Bar value={rel.rivalry} /></td>
            <td className="text-right"><button className="btn btn-sm" onClick={() => { act((gg) => { ensureDm(gg, id); }); router.push(`/jogo/vestiario?t=${dmId(id)}`); }}>Conversar</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Groups() {
  const g = useG();
  const act = useGame((s) => s.act);
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const list = [...g.groups].sort((a, b) => Number(b.active) - Number(a.active) || b.goals - a.goals);
  if (!list.length) return <p className="dim max-w-lg text-sm leading-relaxed">Nenhuma dupla ou trio ainda. Eles nascem sozinhos: joguem juntos, combinem gols, conversem. Entrosamento acima de ~60 com amizade e gols combinados forma uma dupla; três jogadores entrosados entre si formam um trio.</p>;
  return (
    <ul className="grid gap-px border line sm:grid-cols-2">
      {list.map((gr) => (
        <li key={gr.id} className={`surface p-5 ${gr.active ? "" : "opacity-60"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="label">{levelLabel(gr.level, gr.members.length)} · {gr.active ? gr.clubName : "desfeito"}</div>
              {editing === gr.id ? (
                <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); act((gg) => { const x = gg.groups.find((y) => y.id === gr.id)!; x.name = name.trim() || x.name; x.custom = true; ensureGroupThread(gg, gr.id); }); setEditing(null); }}>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={28} autoFocus /><button className="btn">Salvar</button>
                </form>
              ) : <div className="display mt-2 text-3xl">{gr.name}</div>}
            </div>
            {gr.active && editing !== gr.id && <button className="btn btn-sm btn-ghost dim" onClick={() => { setEditing(gr.id); setName(gr.name); }}>Renomear</button>}
          </div>
          <div className="mt-4 flex gap-2">{gr.members.map((m) => g.players[m] && <div key={m} className="flex items-center gap-1.5 text-xs"><Avatar p={g.players[m]} size={24} ring={g.players[m].isUser} />{g.players[m].first}</div>)}</div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            <div><div className="label text-[9.5px]">Jogos</div><div className="num">{gr.matches}</div></div>
            <div><div className="label text-[9.5px]">Gols juntos</div><div className="num">{gr.goals}</div></div>
            <div><div className="label text-[9.5px]">Títulos</div><div className="num">{gr.titles}</div></div>
            <div><div className="label text-[9.5px]">Temporadas</div><div className="num">{gr.seasons.length}</div></div>
          </div>
          <Bar value={gr.active ? groupAvgChem(g, gr) : gr.peakChem} accent className="mt-4" />
          {gr.active && g.chat.threads[`grp:${gr.id}`] && <button className="btn btn-sm mt-4" onClick={() => router.push(`/jogo/vestiario?t=grp:${gr.id}`)}>Abrir grupo</button>}
        </li>
      ))}
    </ul>
  );
}

function Inner() {
  const g = useG();
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("aba") as "conversas" | "amigos" | "grupos") ?? "conversas";
  const setTab = (v: string) => router.push(`/jogo/vestiario?aba=${v}`);
  return (
    <div>
      <PageTitle kicker="(10) Vestiário" title="Vestiário" meta={<><span>{unreadCount(g)} não lidas</span><span>{g.groups.filter((x) => x.active).length} duplas e trios ativos</span><span>{g.settings.advancedAI ? "IA avançada ligada" : "Modo local (offline)"}</span></>} />
      <Tabs value={tab} onChange={setTab} items={[{ id: "conversas", label: "Conversas", badge: unreadCount(g) }, { id: "amigos", label: "Amigos" }, { id: "grupos", label: "Duplas e trios" }]} />
      {tab === "conversas" && <Conversations />}
      {tab === "amigos" && <Friends />}
      {tab === "grupos" && <Groups />}
    </div>
  );
}

export default function Vestiario() {
  return <Suspense><Inner /></Suspense>;
}
