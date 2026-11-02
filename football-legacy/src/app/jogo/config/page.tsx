"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useG, useGame } from "@/store/game";
import { localBackend } from "@/store/persist";
import type { GameState } from "@/engine/types";
import { formatDate } from "@/engine/world/players";
import { PageTitle, Section } from "@/components/ui";

function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 border-b line py-3.5">
      <span><span className="text-[15px]">{label}</span>{desc && <span className="dim mt-0.5 block text-xs">{desc}</span>}</span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-[#3ee27f]" />
    </label>
  );
}

export default function Config() {
  const g = useG();
  const router = useRouter();
  const set = useGame((s) => s.setSettings);
  const saveNow = useGame((s) => s.saveNow);
  const setGame = useGame((s) => s.setGame);
  const toast = useGame((s) => s.showToast);
  const aiStatus = useGame((s) => s.aiStatus);
  const lastSavedAt = useGame((s) => s.lastSavedAt);
  const act = useGame((s) => s.act);
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(g.name);
  const s = g.settings;

  const exportSave = () => {
    const blob = new Blob([JSON.stringify(g)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `football-legacy-${g.name.replace(/[^\w-]+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importSave = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as GameState;
      if (!data.players || !data.clubs || data.schema !== 1) throw new Error("formato");
      await localBackend.save(data);
      setGame(data);
      toast("Carreira importada.");
      router.push("/jogo");
    } catch { toast("Arquivo inválido."); }
  };

  return (
    <div className="max-w-3xl">
      <PageTitle kicker="(13) Configurações" title="Ajustes" meta={<span>{lastSavedAt ? `Último salvamento ${new Date(lastSavedAt).toLocaleTimeString("pt-BR")}` : "Salvamento automático a cada avanço"}</span>} />
      <Section idx="A" title="Jogo">
        <Toggle on={s.autosave} onChange={(v) => set({ autosave: v })} label="Salvamento automático" desc="Grava no navegador (IndexedDB) depois de cada ação." />
        <Toggle on={s.typingAnimation} onChange={(v) => set({ typingAnimation: v })} label="Animação de digitação no Vestiário" desc="Pequenos atrasos antes das respostas, como num app de mensagens." />
        <div className="flex items-center justify-between gap-6 border-b line py-3.5">
          <span className="text-[15px]">Velocidade das partidas ao vivo</span>
          <span className="flex gap-1">{([1, 2, 4] as const).map((v) => <button key={v} className="chip" data-on={s.matchSpeed === v} onClick={() => set({ matchSpeed: v })}>{v}×</button>)}</span>
        </div>
      </Section>
      <Section idx="B" title="IA avançada no Vestiário" className="mt-10">
        <p className="dim mb-3 text-sm leading-relaxed">
          Opcional. Com uma chave de API configurada no servidor (variável <span className="num">ANTHROPIC_API_KEY</span>), os personagens reescrevem as falas com um modelo de linguagem, sempre a partir dos fatos reais da carreira. A chave nunca vai para o navegador. Sem ela, o modo local (offline) continua funcionando.
        </p>
        <p className="mb-3 text-sm">Status do servidor: <span className={aiStatus === "disponivel" ? "text-accent" : "dim"}>{aiStatus === "disponivel" ? "disponível" : aiStatus === "indisponivel" ? "não configurado" : "verificando…"}</span></p>
        <Toggle on={s.advancedAI} onChange={(v) => set({ advancedAI: v })} label="Usar IA avançada quando disponível" />
        <label className="flex items-center justify-between gap-6 border-b line py-3.5">
          <span className="text-[15px]">Limite diário de mensagens com IA <span className="dim block text-xs">Usadas hoje: {g.chat.aiDay === g.day ? g.chat.aiUsedToday : 0}</span></span>
          <select className="input max-w-[110px]" value={s.aiDailyLimit} onChange={(e) => set({ aiDailyLimit: +e.target.value })}>{[10, 20, 40, 80, 150].map((v) => <option key={v} value={v}>{v}</option>)}</select>
        </label>
      </Section>
      <Section idx="C" title="Salvamentos" className="mt-10">
        <div className="flex gap-2"><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /><button className="btn" onClick={() => act((gg) => { gg.name = name.trim() || gg.name; })}>Renomear</button></div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={async () => { await saveNow(); toast("Salvo."); }}>Salvar agora</button>
          <button className="btn" onClick={exportSave}>Exportar arquivo</button>
          <button className="btn" onClick={() => file.current?.click()}>Importar arquivo</button>
          <input ref={file} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && void importSave(e.target.files[0])} />
          <button className="btn" onClick={async () => { await saveNow(); router.push("/"); }}>Trocar de carreira</button>
        </div>
        <p className="dim mt-3 text-xs">Carreira criada em {new Date(g.createdAt).toLocaleDateString("pt-BR")} · data do jogo {formatDate(g.day)} · semente {g.seed}</p>
      </Section>
    </div>
  );
}
