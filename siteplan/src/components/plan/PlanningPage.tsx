"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Cpu, Sparkles } from "lucide-react";
import type { Briefing } from "@/lib/schema";
import { analyzePlan } from "@/lib/plan/analyze";
import { PLAN_TABS } from "@/components/shell/AppShell";
import { cx } from "@/components/ui";
import { useProject } from "@/components/project/ProjectProvider";
import { OverviewTab } from "./OverviewTab";
import { PageMapTab } from "./PageMapTab";
import { SectionsTab } from "./SectionsTab";
import { JourneyTab } from "./JourneyTab";
import { MaterialsTab } from "./MaterialsTab";
import { RequirementsTab } from "./RequirementsTab";

export type TabKey = (typeof PLAN_TABS)[number]["key"];

/** Estado de navegação do planejamento guardado na URL: aba, página e seção selecionadas. */
export function usePlanNav() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = (PLAN_TABS.find((t) => t.key === search.get("aba"))?.key ?? "visao") as TabKey;
  const pageId = search.get("pagina");
  const sectionId = search.get("secao");
  const go = useCallback(
    (next: { aba?: TabKey; pagina?: string | null; secao?: string | null }) => {
      const p = new URLSearchParams(search.toString());
      if (next.aba) p.set("aba", next.aba);
      for (const k of ["pagina", "secao"] as const) {
        if (next[k] === null) p.delete(k);
        else if (next[k]) p.set(k, next[k]!);
      }
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [search, router, pathname],
  );
  return { tab, pageId, sectionId, go };
}

export function PlanningPage() {
  const { project } = useProject();
  const { tab, go } = usePlanNav();
  const plan = project.plan;
  const issues = useMemo(() => (plan ? analyzePlan(plan, project.briefing as Briefing) : []), [plan, project.briefing]);
  const pendingMaterials = plan?.materials.filter((m) => m.status === "pendente" || m.status === "em-producao").length ?? 0;

  if (!plan)
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <p className="font-medium">O planejamento ainda não foi gerado.</p>
        <p className="mt-1 text-sm text-ink-2">Revise o briefing e gere o planejamento para editar páginas, seções e jornadas.</p>
        <Link href={`/projetos/${project.id}/revisao`} className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
          Ir para a revisão
        </Link>
      </div>
    );

  const g = plan.generation;
  const counts: Partial<Record<TabKey, number>> = { jornada: issues.length, materiais: pendingMaterials };

  return (
    <div className="flex min-h-[calc(100dvh-56px)] flex-col">
      <div className="border-b border-line bg-surface px-4 pt-3 sm:px-6 lg:px-8 print:hidden">
        <div
          className={cx(
            "mb-3 flex items-start gap-2 rounded-md px-3 py-2 text-[13px]",
            g.mode === "demo" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent-strong",
          )}
          role="note"
        >
          {g.mode === "demo" ? <Cpu className="mt-px size-4 shrink-0" aria-hidden /> : <Sparkles className="mt-px size-4 shrink-0" aria-hidden />}
          <p>
            {g.mode === "demo" ? (
              <>
                <strong className="font-semibold">Modo demonstração.</strong> Gerado por regras e modelos por segmento, sem IA. Textos são sugestões para revisar; nada foi inventado sobre a empresa.
              </>
            ) : (
              <>
                <strong className="font-semibold">Gerado com IA</strong> ({g.model}) em {new Date(g.generatedAt).toLocaleString("pt-BR")}. A resposta foi validada pelo schema; revise antes de usar.
              </>
            )}
          </p>
        </div>
        <div role="tablist" aria-label="Partes do planejamento" className="-mb-px flex gap-1 overflow-x-auto">
          {PLAN_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              id={`tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls="painel-plano"
              onClick={() => go({ aba: t.key })}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const i = PLAN_TABS.findIndex((x) => x.key === tab);
                const next = PLAN_TABS[(i + (e.key === "ArrowRight" ? 1 : PLAN_TABS.length - 1)) % PLAN_TABS.length];
                go({ aba: next.key });
                requestAnimationFrame(() => document.getElementById(`tab-${next.key}`)?.focus());
              }}
              tabIndex={tab === t.key ? 0 : -1}
              className={cx(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors duration-150",
                tab === t.key ? "border-accent font-semibold text-ink" : "border-transparent text-ink-2 hover:text-ink",
              )}
            >
              {t.label}
              {counts[t.key] ? (
                <span
                  className={cx(
                    "rounded px-1.5 text-xs font-medium",
                    t.key === "jornada" && issues.some((i) => i.level === "erro") ? "bg-danger-soft text-danger" : "bg-sunken text-ink-2",
                  )}
                  aria-label={t.key === "jornada" ? `${counts[t.key]} problemas` : `${counts[t.key]} pendentes`}
                >
                  {counts[t.key]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      <div id="painel-plano" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex-1">
        {tab === "visao" && <OverviewTab issues={issues} />}
        {tab === "paginas" && <PageMapTab />}
        {tab === "secoes" && <SectionsTab />}
        {tab === "jornada" && <JourneyTab issues={issues} />}
        {tab === "materiais" && <MaterialsTab />}
        {tab === "requisitos" && <RequirementsTab />}
      </div>
    </div>
  );
}
