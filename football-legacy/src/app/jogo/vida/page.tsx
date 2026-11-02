"use client";
import Link from "next/link";
import { useState } from "react";
import { useG, useGame } from "@/store/game";
import { askOut, breakUp, DATES, fanThreadId, giveGift, goOnDate, ignoreFan, partnerOf, propose, romance, STAGE_LABEL, VIBE_LABEL } from "@/engine/social/romance";
import { withRng } from "@/engine/season/advance";
import { formatDate, formatMoney } from "@/engine/world/players";
import type { Fan } from "@/engine/types";
import { Avatar, Bar, PageTitle, Section } from "@/components/ui";

const GIFTS = [{ id: "flores", label: "Flores", cost: 150 }, { id: "perfume", label: "Perfume", cost: 900 }, { id: "joia", label: "Joia", cost: 8000 }];

function FanCard({ f, partner }: { f: Fan; partner: boolean }) {
  const g = useG();
  const act = useGame((s) => s.act);
  const toast = useGame((s) => s.showToast);
  const [open, setOpen] = useState(partner);
  const [first, last] = [f.name.split(" ")[0], f.name.split(" ")[1] ?? ""];
  const close = ["namorando", "noivos", "casados"].includes(f.stage);
  const run = (fn: () => string | void) => { const m = act(() => fn()); if (m) toast(m); };
  return (
    <li className={`surface p-5 ${f.stage === "ex" ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-4">
        <Avatar p={{ id: f.id, first, last }} size={48} ring={partner} />
        <div className="min-w-0 flex-1">
          <div className="label">{STAGE_LABEL[f.stage]}{partner ? " · ❤️" : ""}</div>
          <div className="mt-1 text-xl">{f.name} <span className="dim text-sm">{f.age}</span></div>
          <div className="dim text-sm">{f.job} · {f.city} · {VIBE_LABEL[f.vibe]}{f.famous ? " · famosa" : ""}</div>
          <div className="dim mt-1 text-xs">Curte {f.likes.join(", ")}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {([["Atração", f.attraction, true], ["Carinho", f.affection, false], ["Confiança", f.trust, false]] as const).map(([l, v, ac]) => (
          <div key={l}><div className="label text-[9.5px]">{l}</div><Bar value={v} accent={ac} className="mt-1.5" /><div className="num faint mt-0.5 text-[10px]">{Math.round(v)}</div></div>
        ))}
      </div>
      {f.stage !== "ex" && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="btn btn-sm btn-primary" href={`/jogo/vestiario?t=${encodeURIComponent(fanThreadId(f.id))}`}>Conversar</Link>
            {f.stage !== "fa" && <button className="btn btn-sm" onClick={() => setOpen((o) => !o)}>{open ? "Fechar" : "Encontro e presente"}</button>}
            {(f.stage === "ficando" || f.stage === "conversando") && <button className="btn btn-sm" onClick={() => run(() => withRng(g, (r) => askOut(g, f.id, r)))}>Pedir em namoro</button>}
            {f.stage === "namorando" && <button className="btn btn-sm" onClick={() => run(() => propose(g, f.id))}>Pedir em casamento 💍</button>}
            {f.stage === "fa" && <button className="btn btn-sm btn-ghost dim" onClick={() => act((gg) => ignoreFan(gg, f.id))}>Ignorar</button>}
            {close && <button className="btn btn-sm btn-ghost dim" onClick={() => { if (confirm(`Terminar com ${first}?`)) act((gg) => withRng(gg, (r) => breakUp(gg, f, r, "voce"))); }}>Terminar</button>}
          </div>
          {open && f.stage !== "fa" && (
            <div className="mt-4 border-t line pt-4">
              <div className="label mb-2">Encontro · seu dinheiro: {formatMoney(g.user.money)}</div>
              <div className="flex flex-wrap gap-2">
                {DATES.filter((d) => d.id !== "viagem" || close).map((d) => (
                  <button key={d.id} className="chip" onClick={() => run(() => withRng(g, (r) => goOnDate(g, f.id, d.id, r)))}>{d.label}{d.cost ? ` · ${formatMoney(d.cost)}` : ""}{f.likes.includes(d.like) ? " ★" : ""}</button>
                ))}
              </div>
              <div className="label mb-2 mt-4">Presente</div>
              <div className="flex flex-wrap gap-2">{GIFTS.map((x) => <button key={x.id} className="chip" onClick={() => run(() => withRng(g, (r) => giveGift(g, f.id, x.id, r)))}>{x.label} · {formatMoney(x.cost)}</button>)}</div>
              <p className="dim mt-3 text-xs">★ = ela curte. Sair na véspera de jogo cansa e o técnico pode descobrir.</p>
            </div>
          )}
        </>
      )}
    </li>
  );
}

export default function Vida() {
  const g = useG();
  const r = romance(g);
  const p = partnerOf(g);
  const others = r.fans.filter((f) => f.id !== p?.id).sort((a, b) => (a.stage === "ex" ? 1 : 0) - (b.stage === "ex" ? 1 : 0) || b.affection - a.affection);
  return (
    <div>
      <PageTitle kicker="(11) Vida pessoal" title={p ? `${p.name.split(" ")[0]} ❤️` : "Vida pessoal"} meta={<>
        <span>{p ? `${STAGE_LABEL[p.stage]} desde ${formatDate(p.stageDay)}` : "Solteiro"}</span>
        <span>{r.fans.filter((f) => f.stage !== "ex").length} contatos</span>
        <span>Patrimônio {formatMoney(g.user.money)}</span>
        {r.weddingDay && <span className="text-accent">Casamento em {formatDate(r.weddingDay)}</span>}
      </>} />
      <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          {p && <Section idx="A" title="Relacionamento"><ul className="border line"><FanCard f={p} partner /></ul></Section>}
          <Section idx={p ? "B" : "A"} title="Fãs e contatos">
            {others.length === 0 ? (
              <p className="dim max-w-lg text-sm leading-relaxed">Ninguém mandou mensagem ainda. Fãs aparecem conforme sua fama cresce: gols, vitórias grandes e títulos chamam atenção. Elas escrevem pelo Vestiário.</p>
            ) : <ul className="grid gap-px border line sm:grid-cols-2">{others.map((f) => <FanCard key={f.id} f={f} partner={false} />)}</ul>}
          </Section>
        </div>
        <div className="lg:col-span-4">
          <Section idx="C" title="Como funciona">
            <ul className="dim space-y-2 text-sm leading-relaxed">
              <li>Converse no Vestiário: elogio, interesse pela vida dela e respeito sobem a atração. Grosseria derruba tudo.</li>
              <li>Com atração alta ela topa sair. Encontros bons viram “ficando”.</li>
              <li>Depois de alguns encontros e carinho alto, peça em namoro. Com o tempo, casamento.</li>
              <li>Namorando, flertar com outra pode virar crise de ciúme.</li>
              <li>Namoro feliz dá moral; sumir por dias esfria a relação.</li>
            </ul>
          </Section>
          <Section idx="D" title="Diário" className="mt-10">
            {r.log.length === 0 ? <p className="dim text-sm">Nada ainda.</p> : <ul>{r.log.slice(0, 12).map((x, i) => <li key={i} className="border-b line py-2 text-sm"><span className="num faint mr-2 text-xs">{formatDate(x.day).slice(0, 6)}</span>{x.text}</li>)}</ul>}
          </Section>
        </div>
      </div>
    </div>
  );
}
