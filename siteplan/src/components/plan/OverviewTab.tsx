"use client";

import Link from "next/link";
import { Check, CircleAlert, Undo2, X } from "lucide-react";
import type { Briefing } from "@/lib/schema";
import { GOALS, labelOf, SITE_TYPES, TRAFFIC_SOURCES } from "@/lib/schema/catalog";
import type { Issue } from "@/lib/plan/analyze";
import { countPendingMarks } from "@/lib/plan/analyze";
import { briefingGaps } from "@/lib/plan/gaps";
import { Badge, Button, cx } from "@/components/ui";
import { useProject } from "@/components/project/ProjectProvider";
import { usePlanNav } from "./PlanningPage";

function Fact({ label, value, origin }: { label: string; value: string; origin: "informado" | "sugestao" }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
      <dt className="flex items-start gap-2 text-[13px] text-ink-3">
        {label}
      </dt>
      <dd className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-sm">
        <span className={cx(!value && "italic text-ink-3")}>{value || "Não informado no briefing"}</span>
        <Badge tone={origin === "informado" ? "neutral" : "accent"}>{origin === "informado" ? "Informado" : "Sugestão"}</Badge>
      </dd>
    </div>
  );
}

export function OverviewTab({ issues }: { issues: Issue[] }) {
  const { project, updatePlan } = useProject();
  const { go } = usePlanNav();
  const plan = project.plan!;
  const b = project.briefing as Briefing;
  const gaps = briefingGaps(b);
  const marks = countPendingMarks(plan);
  const sections = plan.pages.reduce((n, p) => n + p.sections.length, 0);
  const openAssumptions = plan.overview.assumptions.filter((a) => a.status === "aberta");

  const setAssumption = (id: string, status: "aberta" | "confirmada" | "descartada") =>
    updatePlan((p) => {
      const a = p.overview.assumptions.find((x) => x.id === id);
      if (a) a.status = status;
    });

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
      <div className="min-w-0 space-y-6">
        <section aria-labelledby="essencial" className="rounded-lg border border-line bg-surface">
          <h2 id="essencial" className="border-b border-line px-4 py-3 text-sm font-semibold">
            O essencial
          </h2>
          <dl className="divide-y divide-line px-4">
            <Fact label="Objetivo principal" value={b.goals.primary === "outro" ? b.goals.other : labelOf(GOALS, b.goals.primary)} origin="informado" />
            <Fact label="Público" value={b.audience.idealClient} origin="informado" />
            <Fact label="Oferta" value={b.goals.offer} origin="informado" />
            <Fact label="Conversão desejada" value={b.goals.conversionAction} origin="informado" />
            <Fact label="Origem do tráfego" value={b.audience.trafficSources.map((t) => labelOf(TRAFFIC_SOURCES, t)).join(", ")} origin="informado" />
            <Fact label="Tipo de site recomendado" value={labelOf(SITE_TYPES, plan.overview.siteType)} origin="sugestao" />
            <div className="py-3">
              <dt className="text-[13px] text-ink-3">Por que esse tipo</dt>
              <dd className="mt-1 max-w-[68ch] text-sm leading-relaxed">{plan.overview.rationale}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="hipoteses" className="rounded-lg border border-line bg-surface">
          <div className="border-b border-line px-4 py-3">
            <h2 id="hipoteses" className="text-sm font-semibold">
              Hipóteses e sugestões
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-3">Não vieram do briefing. Confirme ou descarte: entram assim no prompt.</p>
          </div>
          {plan.overview.assumptions.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-3">Nenhuma hipótese registrada.</p>
          ) : (
            <ul className="divide-y divide-line">
              {plan.overview.assumptions.map((a) => (
                <li key={a.id} className={cx("flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start", a.status === "descartada" && "opacity-60")}>
                  <div className="flex-1">
                    <Badge tone={a.kind === "hipotese" ? "warn" : "accent"}>{a.kind === "hipotese" ? "Hipótese" : "Sugestão"}</Badge>
                    <p className={cx("mt-1.5 text-sm", a.status === "descartada" && "line-through")}>{a.text}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {a.status === "aberta" ? (
                      <>
                        <Button size="sm" icon={<Check className="size-3.5" />} onClick={() => setAssumption(a.id, "confirmada")}>
                          Confirmar
                        </Button>
                        <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={() => setAssumption(a.id, "descartada")}>
                          Descartar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" icon={<Undo2 className="size-3.5" />} onClick={() => setAssumption(a.id, "aberta")}>
                        {a.status === "confirmada" ? "Confirmada" : "Descartada"} · reabrir
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-4">
        <section className="rounded-lg border border-line bg-surface p-4" aria-labelledby="numeros">
          <h2 id="numeros" className="text-sm font-semibold">
            Estrutura
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-y-3 text-sm">
            {[
              ["Páginas", plan.pages.length, "paginas"],
              ["Seções", sections, "secoes"],
              ["Jornadas", plan.journeys.length, "jornada"],
              ["Materiais pendentes", plan.materials.filter((m) => m.status === "pendente").length, "materiais"],
            ].map(([label, n, tab]) => (
              <div key={label as string}>
                <dt className="text-[13px] text-ink-3">{label}</dt>
                <dd>
                  <button type="button" className="text-xl font-semibold tabular-nums hover:text-accent" onClick={() => go({ aba: tab as never })}>
                    {n as number}
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-lg border border-line bg-surface p-4" aria-labelledby="confirmar">
          <h2 id="confirmar" className="text-sm font-semibold">
            Precisa ser confirmado
          </h2>
          <ul className="mt-2 flex flex-col gap-2 text-[13px]">
            {gaps
              .filter((g) => g.level !== "recomendado")
              .map((g) => (
                <li key={g.label} className="flex gap-2">
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden />
                  <span>
                    {g.label}: <span className="text-ink-3">{g.why}</span>
                  </span>
                </li>
              ))}
            {openAssumptions.length > 0 && (
              <li className="flex gap-2">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden />
                {openAssumptions.length} {openAssumptions.length === 1 ? "hipótese aberta" : "hipóteses abertas"}
              </li>
            )}
            {marks > 0 && (
              <li className="flex gap-2">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden />
                <span>
                  {marks} trechos marcados como <code className="rounded bg-sunken px-1 font-mono text-xs">[Pendente: …]</code> nos textos
                </span>
              </li>
            )}
            {issues.length > 0 && (
              <li className="flex gap-2">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden />
                <button type="button" className="text-left hover:text-accent" onClick={() => go({ aba: "jornada" })}>
                  {issues.length} {issues.length === 1 ? "problema" : "problemas"} de estrutura ou conversão
                </button>
              </li>
            )}
          </ul>
          <Link href={`/projetos/${project.id}/revisao`} className="mt-3 inline-block text-[13px] font-medium text-accent hover:underline">
            Revisar o briefing
          </Link>
        </section>
      </aside>
    </div>
  );
}
