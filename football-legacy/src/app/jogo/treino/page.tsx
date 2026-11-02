"use client";
import { useG, useGame } from "@/store/game";
import { ATTR_LABEL } from "@/engine/constants";
import { FOCUS_ATTRS, FOCUS_LABEL, ageRate } from "@/engine/world/progression";
import type { TrainingFocus } from "@/engine/types";
import { age, me, myClub } from "@/lib/view";
import { Bar, PageTitle, Section } from "@/components/ui";

const FOCUS: TrainingFocus[] = ["equilibrado", "fisico", "tecnico", "finalizacao", "defesa", "mental", "descanso"];
const INT = [
  { label: "Leve", desc: "Evolui 25% menos, recupera fôlego, risco mínimo de lesão. O técnico nota menos empenho." },
  { label: "Normal", desc: "Ritmo padrão de evolução e de desgaste." },
  { label: "Intenso", desc: "Evolui 35% mais e agrada o técnico, mas cansa e triplica o risco de lesão." },
];

export default function Treino() {
  const g = useG();
  const act = useGame((s) => s.act);
  const p = me(g);
  const club = myClub(g);
  const t = g.user.training;
  const coach = g.user.mode === "coach";
  const rate = p ? ageRate(age(g, p)) : 0;
  return (
    <div>
      <PageTitle kicker="(08) Treinamento" title={coach ? "Treino do elenco" : "Treino semanal"} meta={<><span>Aplicado toda segunda-feira</span>{club && <span>Estrutura do clube {club.facilities}/5</span>}{p && <span>Fase da carreira: {rate > 0.1 ? "crescimento rápido" : rate > 0 ? "maturação" : rate > -0.05 ? "auge" : "declínio físico"}</span>}</>} />
      <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-7">
          <Section idx="A" title="Foco">
            <div className="grid gap-px border line sm:grid-cols-2">
              {FOCUS.map((f) => (
                <button key={f} onClick={() => act((gg) => { gg.user.training.focus = f; })} className={`p-4 text-left transition-colors duration-500 ${t.focus === f ? "surface-2" : "surface hover:bg-white/5"}`}>
                  <div className={`text-[15px] ${t.focus === f ? "text-accent" : ""}`}>{FOCUS_LABEL[f]}</div>
                  <div className="dim mt-1 text-xs">{f === "equilibrado" ? "Todos os atributos da posição." : f === "descanso" ? "Recupera condição e moral; quase não evolui." : FOCUS_ATTRS[f].map((k) => ATTR_LABEL[k]).join(", ")}</div>
                </button>
              ))}
            </div>
          </Section>
          <Section idx="B" title="Intensidade">
            <div className="grid gap-px border line sm:grid-cols-3">
              {INT.map((it, i) => (
                <button key={it.label} onClick={() => act((gg) => { gg.user.training.intensity = i as 0 | 1 | 2; })} className={`p-4 text-left transition-colors duration-500 ${t.intensity === i ? "surface-2" : "surface hover:bg-white/5"}`}>
                  <div className={`text-[15px] ${t.intensity === i ? "text-accent" : ""}`}>{it.label}</div>
                  <div className="dim mt-1 text-xs leading-relaxed">{it.desc}</div>
                </button>
              ))}
            </div>
          </Section>
        </div>
        <div className="space-y-10 lg:col-span-5">
          {p && (
            <Section idx="C" title="O que pesa na sua evolução">
              <ul className="space-y-4 text-sm">
                <li><div className="flex justify-between"><span>Distância até o potencial</span><span className="num">{Math.max(0, p.potential - p.ovr)}</span></div><Bar value={Math.max(0, p.potential - p.ovr)} max={30} accent className="mt-2" /></li>
                <li><div className="flex justify-between"><span>Minutos na temporada</span><span className="num">{p.stats.minutes}</span></div><Bar value={p.stats.minutes} max={2700} className="mt-2" /></li>
                <li><div className="flex justify-between"><span>Forma recente</span><span className="num">{p.form.length ? (p.form.reduce((a, b) => a + b, 0) / p.form.length).toFixed(1) : "—"}</span></div><Bar value={p.form.length ? (p.form.reduce((a, b) => a + b, 0) / p.form.length) - 4 : 2.5} max={5} className="mt-2" /></li>
                <li><div className="flex justify-between"><span>Condição física</span><span className="num">{Math.round(p.fitness)}%</span></div><Bar value={p.fitness} className="mt-2" /></li>
              </ul>
              <p className="dim mt-5 text-xs leading-relaxed">Jovens crescem rápido se jogam. Depois dos 29 o físico cai e a experiência (mentalidade, visão, passe) compensa. Lesões travam a evolução.</p>
            </Section>
          )}
          {coach && club && (
            <Section idx="C" title="Efeito no elenco">
              <p className="dim text-sm leading-relaxed">O foco e a intensidade valem para todo o elenco. Treino intenso aumenta o entrosamento coletivo ({Math.round(club.cohesion)}) e a evolução, mas cansa e machuca mais. Use “Descanso” em semanas com jogo no meio da semana.</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
