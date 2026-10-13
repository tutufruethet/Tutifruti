"use client";

import { Fragment, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, CircleAlert, Pencil, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import type { Journey } from "@/lib/schema";
import { LIMITS } from "@/lib/schema";
import { TRAFFIC_SOURCES } from "@/lib/schema/catalog";
import { newId, noTarget } from "@/lib/schema/factory";
import { describeTarget, targetProblem, type Issue } from "@/lib/plan/analyze";
import { Button, cx, EmptyState, Field, IconButton } from "@/components/ui";
import { useProject } from "@/components/project/ProjectProvider";
import { useToast } from "@/components/toast";
import { usePlanNav } from "./PlanningPage";
import { CtaTargetEditor } from "./CtaTargetEditor";

function Node({ kind, title, detail, bad }: { kind: string; title: string; detail?: string; bad?: boolean }) {
  return (
    <div className={cx("min-w-0 rounded-md border px-3 py-2", bad ? "border-danger/40 bg-danger-soft" : "border-line bg-surface")}>
      <p className="text-xs text-ink-3">{kind}</p>
      <p className={cx("line-clamp-2 text-sm font-medium", bad && "text-danger")}>{title}</p>
      {detail && <p className="truncate text-xs text-ink-3">{detail}</p>}
    </div>
  );
}

export function JourneyTab({ issues }: { issues: Issue[] }) {
  const { project, updatePlan, restore } = useProject();
  const toast = useToast();
  const { go } = usePlanNav();
  const plan = project.plan!;
  const [editing, setEditing] = useState<string | null>(null);

  const edit = (id: string, fn: (j: Journey) => void) =>
    updatePlan((p) => {
      const j = p.journeys.find((x) => x.id === id);
      if (j) fn(j);
    });

  const add = () => {
    const j: Journey = {
      id: newId("jor"),
      name: "Nova jornada",
      source: "",
      entryPageId: plan.pages[0]?.id ?? null,
      steps: [],
      action: "",
      actionTarget: noTarget(),
      notes: "",
    };
    updatePlan((p) => void p.journeys.push(j));
    setEditing(j.id);
  };

  const remove = (j: Journey) => {
    const snap = structuredClone(project);
    updatePlan((p) => (p.journeys = p.journeys.filter((x) => x.id !== j.id)));
    toast.show({ tone: "info", message: `Jornada "${j.name}" excluída.`, action: { label: "Desfazer", run: () => restore(snap) } });
  };

  const fix = (i: Issue) => {
    if (i.journeyId) {
      setEditing(i.journeyId);
      requestAnimationFrame(() => document.getElementById(`jornada-${i.journeyId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else if (i.sectionId) go({ aba: "secoes", pagina: i.pageId, secao: i.sectionId });
    else if (i.pageId) go({ aba: "paginas", pagina: i.pageId });
    else go({ aba: "visao" });
  };

  const errors = issues.filter((i) => i.level === "erro");
  const warns = issues.filter((i) => i.level === "aviso");

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-2">Origem do visitante → página de entrada → conteúdo que ajuda a decidir → ação desejada.</p>
          <Button size="sm" variant="primary" icon={<Plus className="size-4" />} disabled={plan.journeys.length >= 12} onClick={add}>
            Adicionar jornada
          </Button>
        </div>
        {plan.journeys.length === 0 && <EmptyState title="Nenhuma jornada definida.">Crie uma jornada para cada origem de tráfego importante.</EmptyState>}
        <ul className="flex flex-col gap-4">
          {plan.journeys.map((j) => {
            const entry = plan.pages.find((p) => p.id === j.entryPageId);
            const actionProblem = targetProblem(j.actionTarget, plan);
            const open = editing === j.id;
            return (
              <li key={j.id} id={`jornada-${j.id}`} className="scroll-mt-20 rounded-lg border border-line bg-surface">
                <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                  <h3 className="truncate text-sm font-semibold">{j.name || "Jornada sem nome"}</h3>
                  <div className="flex gap-0.5">
                    <IconButton label={open ? `Fechar edição de ${j.name}` : `Editar ${j.name}`} onClick={() => setEditing(open ? null : j.id)} aria-expanded={open}>
                      {open ? <X className="size-4" /> : <Pencil className="size-4" />}
                    </IconButton>
                    <IconButton label={`Excluir ${j.name}`} onClick={() => remove(j)} className="hover:!bg-danger-soft hover:!text-danger">
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>
                <ol className="grid items-center gap-2 p-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.3fr)_auto_minmax(0,1.3fr)]" aria-label={`Caminho de ${j.name}`}>
                  {(() => {
                    const nodes = [
                      <Node key="o" kind="Origem" title={j.source || "Não definida"} bad={!j.source} />,
                      <Node key="e" kind="Entrada" title={entry?.name ?? "Sem página"} detail={entry?.slug} bad={!entry} />,
                      <Node
                        key="d"
                        kind="Ajuda a decidir"
                        title={
                          j.steps
                            .map((st) => {
                              const p = plan.pages.find((x) => x.id === st.pageId);
                              return p?.sections.find((s) => s.id === st.sectionId)?.name ?? p?.name ?? "removido";
                            })
                            .join(", ") || "Nenhum conteúdo"
                        }
                      />,
                      <Node key="a" kind="Ação" title={j.action || "Não definida"} detail={describeTarget(j.actionTarget, plan)} bad={!!actionProblem} />,
                    ];
                    return nodes.map((n, i) => (
                      <Fragment key={i}>
                        <li className="min-w-0 self-stretch [&>div]:h-full">{n}</li>
                        {i < nodes.length - 1 && (
                          <li aria-hidden className="flex justify-center text-ink-3">
                            <ArrowRight className="size-4 max-md:rotate-90" />
                          </li>
                        )}
                      </Fragment>
                    ));
                  })()}
                </ol>
                {open && <JourneyEditor journey={j} onChange={(fn) => edit(j.id, fn)} />}
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start" aria-labelledby="problemas">
        <section className="rounded-lg border border-line bg-surface">
          <h2 id="problemas" className="border-b border-line px-4 py-3 text-sm font-semibold">
            Problemas encontrados {issues.length > 0 && <span className="font-normal text-ink-3">({issues.length})</span>}
          </h2>
          {issues.length === 0 ? (
            <p className="px-4 py-4 text-[13px] text-ok">Nenhum CTA sem destino, página sem objetivo ou formulário sem próximo passo.</p>
          ) : (
            <ul className="divide-y divide-line">
              {[...errors, ...warns].map((i) => (
                <li key={i.id} className="flex gap-2 px-4 py-3 text-[13px]">
                  {i.level === "erro" ? (
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Erro" />
                  ) : (
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-label="Aviso" />
                  )}
                  <div className="flex-1">
                    <p>{i.message}</p>
                    <button type="button" className="mt-1 font-medium text-accent hover:underline" onClick={() => fix(i)}>
                      Corrigir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

function JourneyEditor({ journey: j, onChange }: { journey: Journey; onChange: (fn: (j: Journey) => void) => void }) {
  const { project } = useProject();
  const plan = project.plan!;
  const [stepPage, setStepPage] = useState(j.entryPageId ?? plan.pages[0]?.id ?? "");
  const [stepSection, setStepSection] = useState("");
  const stepPageObj = plan.pages.find((p) => p.id === stepPage);
  return (
    <div className="grid gap-4 border-t border-line bg-ground/50 p-4 sm:grid-cols-2">
      <Field label="Nome da jornada">
        {(p) => <input {...p} className="field-input" maxLength={LIMITS.short} value={j.name} onChange={(e) => onChange((x) => (x.name = e.target.value))} />}
      </Field>
      <Field label="Origem do visitante">
        {(p) => (
          <>
            <input {...p} list={`origens-${j.id}`} className="field-input" maxLength={LIMITS.short} value={j.source} onChange={(e) => onChange((x) => (x.source = e.target.value))} placeholder="Ex.: Instagram" />
            <datalist id={`origens-${j.id}`}>
              {TRAFFIC_SOURCES.map((t) => (
                <option key={t.key} value={t.label} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      <Field label="Página de entrada">
        {(p) => (
          <select {...p} className="field-input" value={j.entryPageId ?? ""} onChange={(e) => onChange((x) => (x.entryPageId = e.target.value || null))}>
            <option value="">Escolha uma página</option>
            {plan.pages.map((pg) => (
              <option key={pg.id} value={pg.id}>
                {pg.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Ação desejada">
        {(p) => <input {...p} className="field-input" maxLength={LIMITS.short} value={j.action} onChange={(e) => onChange((x) => (x.action = e.target.value))} placeholder="Ex.: Inicia conversa no WhatsApp" />}
      </Field>
      <div className="sm:col-span-2">
        <p className="text-sm font-medium">Conteúdo que ajuda a decidir</p>
        <ol className="mt-2 flex flex-col gap-1">
          {j.steps.map((st, i) => {
            const p = plan.pages.find((x) => x.id === st.pageId);
            const s = p?.sections.find((x) => x.id === st.sectionId);
            return (
              <li key={`${st.pageId}-${st.sectionId}-${i}`} className="flex items-center gap-2 rounded-md border border-line bg-surface px-2 py-1 text-sm">
                <span className="w-5 text-ink-3 tabular-nums">{i + 1}.</span>
                <span className="flex-1 truncate">{p ? `${p.name}${s ? ` › ${s.name}` : ""}` : "Conteúdo removido"}</span>
                <IconButton label="Mover etapa para cima" disabled={i === 0} className="size-7" onClick={() => onChange((x) => x.steps.splice(i - 1, 0, x.steps.splice(i, 1)[0]))}>
                  <ArrowUp className="size-3.5" />
                </IconButton>
                <IconButton label="Mover etapa para baixo" disabled={i === j.steps.length - 1} className="size-7" onClick={() => onChange((x) => x.steps.splice(i + 1, 0, x.steps.splice(i, 1)[0]))}>
                  <ArrowDown className="size-3.5" />
                </IconButton>
                <IconButton label="Remover etapa" className="size-7" onClick={() => onChange((x) => x.steps.splice(i, 1))}>
                  <X className="size-3.5" />
                </IconButton>
              </li>
            );
          })}
        </ol>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Field label="Página" className="min-w-40 flex-1">
            {(p) => (
              <select {...p} className="field-input" value={stepPage} onChange={(e) => (setStepPage(e.target.value), setStepSection(""))}>
                {plan.pages.map((pg) => (
                  <option key={pg.id} value={pg.id}>
                    {pg.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Seção" optional className="min-w-40 flex-1">
            {(p) => (
              <select {...p} className="field-input" value={stepSection} onChange={(e) => setStepSection(e.target.value)}>
                <option value="">Página inteira</option>
                {stepPageObj?.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Button
            icon={<Plus className="size-4" />}
            disabled={!stepPage || j.steps.length >= 12}
            onClick={() => onChange((x) => void x.steps.push({ pageId: stepPage, sectionId: stepSection || null }))}
          >
            Adicionar etapa
          </Button>
        </div>
      </div>
      <div className="sm:col-span-2">
        <CtaTargetEditor label="Para onde a ação leva" target={j.actionTarget} plan={plan} onChange={(t) => onChange((x) => (x.actionTarget = t))} />
      </div>
      <Field label="Observações" optional className="sm:col-span-2">
        {(p) => <textarea {...p} rows={2} className="field-input" maxLength={LIMITS.medium} value={j.notes} onChange={(e) => onChange((x) => (x.notes = e.target.value))} />}
      </Field>
    </div>
  );
}
