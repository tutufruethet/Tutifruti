"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { Briefing } from "@/lib/schema";
import { GOALS, labelOf, MATERIAL_OWNERS, MATERIAL_STATUS, REQUIREMENT_CATEGORIES, SITE_TYPES, TRAFFIC_SOURCES, sectionKindLabel } from "@/lib/schema/catalog";
import { segmentLabel } from "@/lib/schema/segments";
import { analyzePlan, describeTarget } from "@/lib/plan/analyze";
import { pageTree } from "@/lib/plan/ops";
import { Button } from "@/components/ui";
import { useProject } from "@/components/project/ProjectProvider";

/** Documento do planejamento pensado para papel: sem navegação, quebras de página por seção. */
export function PrintPage() {
  const { project } = useProject();
  const plan = project.plan;
  const b = project.briefing as Briefing;
  const tree = plan ? pageTree(plan) : [];
  const issues = plan ? analyzePlan(plan, b) : [];

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-6 sm:px-8 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/projetos/${project.id}/entrega`} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
          <ArrowLeft className="size-4" /> Voltar à entrega
        </Link>
        <Button variant="primary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          Imprimir ou salvar em PDF
        </Button>
      </div>

      <article className="rounded-lg border border-line bg-surface px-6 py-8 sm:px-10 print:border-0 print:p-0 [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-line [&_h2]:pb-1.5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:font-semibold">
        <header>
          <p className="text-[13px] text-ink-3">Planejamento de site · {new Date(project.updatedAt).toLocaleDateString("pt-BR")}</p>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">{project.name}</h1>
          {plan && (
            <p className="mt-2 text-sm text-ink-2">
              {plan.generation.mode === "demo"
                ? "Gerado em modo demonstração (regras e modelos por segmento, sem IA) e revisado no SitePlan."
                : `Gerado com IA (${plan.generation.model}) e revisado no SitePlan.`}{" "}
              Marcações [Pendente: …] dependem do cliente.
            </p>
          )}
        </header>

        <h2>Briefing</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[170px_1fr]">
          {[
            ["Segmento", segmentLabel(b.business.segment, b.business.segmentOther)],
            ["Região", b.business.region],
            ["Serviços", b.business.offerings.split("\n").filter(Boolean).join("; ")],
            ["Diferenciais", b.business.differentiators.split("\n").filter(Boolean).join("; ")],
            ["Cliente ideal", b.audience.idealClient],
            ["Origem do tráfego", b.audience.trafficSources.map((t) => labelOf(TRAFFIC_SOURCES, t)).join(", ")],
            ["Objetivo", b.goals.primary === "outro" ? b.goals.other : labelOf(GOALS, b.goals.primary)],
            ["Conversão", b.goals.conversionAction],
            ["Oferta", b.goals.offer],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink-3">{k}</dt>
              <dd>{v || "—"}</dd>
            </div>
          ))}
        </dl>

        {plan && (
          <>
            <h2>Visão geral</h2>
            <p className="mt-3 text-sm">
              <strong>{labelOf(SITE_TYPES, plan.overview.siteType)}</strong> (sugestão). {plan.overview.rationale}
            </p>
            {plan.overview.assumptions.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm">
                {plan.overview.assumptions.map((a) => (
                  <li key={a.id}>
                    {a.kind === "hipotese" ? "Hipótese" : "Sugestão"} ({a.status}): {a.text}
                  </li>
                ))}
              </ul>
            )}

            <h2>Mapa de páginas</h2>
            <ul className="mt-3 text-sm">
              {tree.map(({ page, depth }) => (
                <li key={page.id} style={{ paddingLeft: depth * 20 }} className="py-0.5">
                  <strong>{page.name}</strong> <code className="font-mono text-xs text-ink-3">{page.slug}</code> — {page.goal || "sem objetivo"}
                </li>
              ))}
            </ul>

            <h2>Seções por página</h2>
            {tree.map(({ page }) => (
              <section key={page.id} className="break-inside-avoid-page">
                <h3>
                  {page.name} <code className="font-mono text-xs font-normal text-ink-3">{page.slug}</code>
                </h3>
                <ol className="mt-2 flex flex-col gap-3 text-sm">
                  {page.sections.map((s, i) => (
                    <li key={s.id} className="break-inside-avoid border-l-2 border-line pl-3">
                      <p className="font-medium">
                        {i + 1}. {s.name} <span className="font-normal text-ink-3">({sectionKindLabel(s.kind)})</span>
                      </p>
                      <p className="text-ink-2">Função: {s.goal || "—"}</p>
                      <p>
                        <span className="text-ink-3">Título:</span> {s.title || "—"}
                      </p>
                      <p className="whitespace-pre-line">
                        <span className="text-ink-3">Texto:</span> {s.body || "—"}
                      </p>
                      {s.cta && (
                        <p>
                          <span className="text-ink-3">CTA:</span> “{s.cta.label}” → {describeTarget(s.cta.target, plan)}
                        </p>
                      )}
                      {s.kind === "formulario" && (
                        <p>
                          <span className="text-ink-3">Depois do envio:</span> {s.afterSubmit || "—"}
                        </p>
                      )}
                      <p className="text-ink-2">
                        <span className="text-ink-3">Composição:</span> {s.visual} <span className="text-ink-3">Celular:</span> {s.mobile}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            <h2>Jornadas de conversão</h2>
            <ul className="mt-3 list-disc pl-5 text-sm">
              {plan.journeys.map((j) => (
                <li key={j.id}>
                  <strong>{j.name}:</strong> {j.source} → {plan.pages.find((p) => p.id === j.entryPageId)?.name ?? "sem entrada"} → {j.action} ({describeTarget(j.actionTarget, plan)})
                </li>
              ))}
            </ul>
            {issues.length > 0 && (
              <>
                <h3>Problemas em aberto</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {issues.map((i) => (
                    <li key={i.id}>{i.message}</li>
                  ))}
                </ul>
              </>
            )}

            <h2>Conteúdo pendente</h2>
            <table className="mt-3 w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line-strong">
                  <th className="py-1.5 pr-2 font-medium">Material</th>
                  <th className="py-1.5 pr-2 font-medium">Onde</th>
                  <th className="py-1.5 pr-2 font-medium">Responsável</th>
                  <th className="py-1.5 pr-2 font-medium">Status</th>
                  <th className="py-1.5 font-medium">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {plan.materials.map((m) => {
                  const p = plan.pages.find((x) => x.id === m.pageId);
                  const s = p?.sections.find((x) => x.id === m.sectionId);
                  return (
                    <tr key={m.id} className="break-inside-avoid border-b border-line align-top">
                      <td className="py-1.5 pr-2">{m.label}</td>
                      <td className="py-1.5 pr-2">{p ? `${p.name}${s ? ` › ${s.name}` : ""}` : "Geral"}</td>
                      <td className="py-1.5 pr-2">{labelOf(MATERIAL_OWNERS, m.owner)}</td>
                      <td className="py-1.5 pr-2">{labelOf(MATERIAL_STATUS, m.status)}</td>
                      <td className="py-1.5">{m.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <h2>Requisitos técnicos</h2>
            {REQUIREMENT_CATEGORIES.map((c) => {
              const list = plan.requirements.filter((r) => r.category === c.key);
              return list.length ? (
                <div key={c.key} className="break-inside-avoid">
                  <h3>{c.label}</h3>
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {list.map((r) => (
                      <li key={r.id}>
                        <strong>{r.title}</strong>
                        {r.detail ? ` — ${r.detail}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })}
          </>
        )}
      </article>
    </div>
  );
}
