"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Copy, CornerDownRight, IndentDecrease, IndentIncrease, LayoutList, Plus, Trash2 } from "lucide-react";
import type { Page, Project } from "@/lib/schema";
import { LIMITS } from "@/lib/schema";
import { addPage, duplicatePage, hasContent, indentPage, isDescendant, movePage, pageTree, removePage } from "@/lib/plan/ops";
import { Badge, Button, cx, Dialog, Field, IconButton } from "@/components/ui";
import { useProject } from "@/components/project/ProjectProvider";
import { useToast } from "@/components/toast";
import { usePlanNav } from "./PlanningPage";
import { PropertiesPanel } from "./PropertiesPanel";

const toSlug = (v: string) =>
  "/" +
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/[^a-z0-9/\-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/\/{2,}/g, "/")
    .slice(0, 119);

export function usePageActions() {
  const { project, updatePlan, restore } = useProject();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<Page | null>(null);

  const doRemove = (page: Page, snapshot: Project) => {
    updatePlan((p) => removePage(p, page.id));
    toast.show({ tone: "info", message: `Página "${page.name}" excluída.`, action: { label: "Desfazer", run: () => restore(snapshot) } });
  };
  const requestRemove = (page: Page) => {
    if (hasContent(page)) setPendingDelete(page);
    else doRemove(page, structuredClone(project));
  };
  const dialog = (
    <Dialog
      open={!!pendingDelete}
      onClose={() => setPendingDelete(null)}
      title="Excluir página com conteúdo?"
      description={
        pendingDelete
          ? `"${pendingDelete.name}" tem ${pendingDelete.sections.length} ${pendingDelete.sections.length === 1 ? "seção" : "seções"} com texto. Botões e jornadas que levam a ela vão aparecer como problema. Você pode desfazer logo depois.`
          : undefined
      }
      footer={
        <>
          <Button onClick={() => setPendingDelete(null)}>Cancelar</Button>
          <Button
            variant="danger"
            icon={<Trash2 className="size-4" />}
            onClick={() => {
              if (pendingDelete) doRemove(pendingDelete, structuredClone(project));
              setPendingDelete(null);
            }}
          >
            Excluir página
          </Button>
        </>
      }
    />
  );
  return { requestRemove, dialog };
}

export function PageMapTab() {
  const { project, updatePlan } = useProject();
  const { pageId, go } = usePlanNav();
  const plan = project.plan!;
  const rows = useMemo(() => pageTree(plan), [plan]);
  const selected = plan.pages.find((p) => p.id === pageId) ?? null;
  const [panelOpen, setPanelOpen] = useState(false);
  const [adding, setAdding] = useState<{ parentId: string | null } | null>(null);
  const [newName, setNewName] = useState("");
  const { requestRemove, dialog } = usePageActions();

  const select = (id: string) => {
    go({ pagina: id, secao: null });
    setPanelOpen(true);
  };
  const edit = (fn: (p: Page) => void) =>
    updatePlan((pl) => {
      const p = pl.pages.find((x) => x.id === selected?.id);
      if (p) {
        fn(p);
        p.edited = true;
      }
    });

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    let id: string | null = null;
    updatePlan((pl) => {
      id = addPage(pl, name, adding?.parentId ?? null)?.id ?? null;
    });
    setAdding(null);
    setNewName("");
    if (id) select(id);
  };

  const parentOptions = selected ? plan.pages.filter((p) => p.id !== selected.id && !isDescendant(plan, p.id, selected.id)) : [];
  const incoming = selected
    ? plan.pages.flatMap((p) => p.sections.filter((s) => s.cta?.target.pageId === selected.id).map((s) => `${p.name} › ${s.name}`))
    : [];

  return (
    <div className="flex min-h-full">
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[820px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-2">
              {plan.pages.length} {plan.pages.length === 1 ? "página" : "páginas"}. Selecione para editar; use as setas para reorganizar.
            </p>
            <Button size="sm" variant="primary" icon={<Plus className="size-4" />} disabled={plan.pages.length >= LIMITS.pages} onClick={() => setAdding({ parentId: null })}>
              Adicionar página
            </Button>
          </div>

          <ul className="flex flex-col" aria-label="Árvore de páginas">
            {rows.map(({ page, depth, index, siblings }) => {
              const isSel = page.id === selected?.id;
              return (
                <li key={page.id} className="relative" style={{ paddingLeft: depth * 28 }}>
                  {depth > 0 && (
                    <span aria-hidden className="absolute top-0 bottom-1/2 w-3.5 rounded-bl-md border-b border-l border-line-strong" style={{ left: depth * 28 - 16 }} />
                  )}
                  <div
                    className={cx(
                      "group mb-1.5 flex items-center gap-2 rounded-lg border bg-surface px-3 py-2.5 transition-colors duration-150",
                      isSel ? "border-accent ring-2 ring-accent-soft" : "border-line hover:border-line-strong",
                    )}
                  >
                    <button type="button" onClick={() => select(page.id)} aria-pressed={isSel} className="min-w-0 flex-1 text-left">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-medium">{page.name}</span>
                        <code className="font-mono text-xs text-ink-3">{page.slug}</code>
                        {page.inMenu && <Badge>Menu</Badge>}
                        {!page.goal.trim() && <Badge tone="warn">Sem objetivo</Badge>}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-ink-2">{page.goal || "Defina o objetivo desta página."}</span>
                      <span className="mt-0.5 block text-xs text-ink-3">
                        {page.sections.length} {page.sections.length === 1 ? "seção" : "seções"}
                        {page.relatedPageIds.length ? ` · leva a ${page.relatedPageIds.length}` : ""}
                      </span>
                    </button>
                    <div className={cx("flex shrink-0 items-center gap-0.5", isSel ? "flex" : "hidden group-focus-within:flex group-hover:flex")}>
                      <IconButton label={`Mover ${page.name} para cima`} disabled={index === 0} onClick={() => updatePlan((p) => movePage(p, page.id, -1))}>
                        <ArrowUp className="size-4" />
                      </IconButton>
                      <IconButton label={`Mover ${page.name} para baixo`} disabled={index === siblings.length - 1} onClick={() => updatePlan((p) => movePage(p, page.id, 1))}>
                        <ArrowDown className="size-4" />
                      </IconButton>
                      <IconButton label={`Tornar ${page.name} subpágina da anterior`} disabled={index === 0} onClick={() => updatePlan((p) => void indentPage(p, page.id, "in"))} className="max-sm:hidden">
                        <IndentIncrease className="size-4" />
                      </IconButton>
                      <IconButton label={`Subir ${page.name} um nível`} disabled={depth === 0} onClick={() => updatePlan((p) => void indentPage(p, page.id, "out"))} className="max-sm:hidden">
                        <IndentDecrease className="size-4" />
                      </IconButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <PropertiesPanel
        title={selected ? `Página: ${selected.name}` : "Propriedades da página"}
        open={panelOpen && !!selected}
        onClose={() => setPanelOpen(false)}
        empty={<p className="text-sm text-ink-3">Selecione uma página na árvore para editar nome, endereço, objetivo e relações.</p>}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <Field label="Nome">
              {(p) => <input {...p} className="field-input" maxLength={LIMITS.short} value={selected.name} onChange={(e) => edit((pg) => (pg.name = e.target.value))} />}
            </Field>
            <Field
              label="Endereço (slug)"
              hint="Relações usam o identificador interno da página: renomear não quebra links do planejamento."
              error={plan.pages.some((p) => p.id !== selected.id && p.slug === selected.slug) ? "Outra página já usa este endereço." : undefined}
            >
              {(p) => (
                <input
                  {...p}
                  className="field-input font-mono text-sm"
                  value={selected.slug}
                  onChange={(e) => edit((pg) => (pg.slug = toSlug(e.target.value)))}
                  spellCheck={false}
                  autoCapitalize="none"
                />
              )}
            </Field>
            <Field label="Objetivo" hint="O que esta página precisa fazer pelo visitante e pelo negócio.">
              {(p) => <textarea {...p} rows={3} className="field-input" maxLength={LIMITS.medium} value={selected.goal} onChange={(e) => edit((pg) => (pg.goal = e.target.value))} />}
            </Field>
            <Field label="Página-mãe">
              {(p) => (
                <select {...p} className="field-input" value={selected.parentId ?? ""} onChange={(e) => edit((pg) => (pg.parentId = e.target.value || null))}>
                  <option value="">Nenhuma (nível principal)</option>
                  {parentOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={selected.inMenu} onChange={(e) => edit((pg) => (pg.inMenu = e.target.checked))} />
              Aparece no menu principal
            </label>
            <fieldset>
              <legend className="text-sm font-medium">Páginas relacionadas</legend>
              <p className="text-[13px] text-ink-3">Para onde esta página leva o visitante.</p>
              <div className="mt-2 flex max-h-44 flex-col gap-1 overflow-y-auto rounded-md border border-line p-2">
                {plan.pages
                  .filter((p) => p.id !== selected.id)
                  .map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--color-accent)]"
                        checked={selected.relatedPageIds.includes(p.id)}
                        onChange={(e) =>
                          edit((pg) => {
                            pg.relatedPageIds = e.target.checked ? [...pg.relatedPageIds, p.id] : pg.relatedPageIds.filter((r) => r !== p.id);
                          })
                        }
                      />
                      {p.name}
                    </label>
                  ))}
              </div>
            </fieldset>
            {incoming.length > 0 && (
              <div>
                <p className="text-sm font-medium">Chegam aqui por</p>
                <ul className="mt-1 text-[13px] text-ink-2">
                  {incoming.map((i) => (
                    <li key={i} className="flex items-center gap-1">
                      <CornerDownRight className="size-3.5 text-ink-3" aria-hidden /> {i}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button size="sm" variant="primary" icon={<LayoutList className="size-4" />} onClick={() => go({ aba: "secoes", pagina: selected.id, secao: null })}>
                Editar seções
              </Button>
              <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setAdding({ parentId: selected.id })}>
                Subpágina
              </Button>
              <Button
                size="sm"
                icon={<Copy className="size-4" />}
                onClick={() => {
                  let id: string | undefined;
                  updatePlan((p) => (id = duplicatePage(p, selected.id)?.id));
                  if (id) go({ pagina: id });
                }}
              >
                Duplicar
              </Button>
              <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => requestRemove(selected)}>
                Excluir
              </Button>
            </div>
          </div>
        )}
      </PropertiesPanel>

      <Dialog
        open={!!adding}
        onClose={() => setAdding(null)}
        title={adding?.parentId ? "Nova subpágina" : "Nova página"}
        footer={
          <>
            <Button onClick={() => setAdding(null)}>Cancelar</Button>
            <Button variant="primary" type="submit" form="nova-pagina">
              Adicionar
            </Button>
          </>
        }
      >
        <form
          id="nova-pagina"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <Field label="Nome da página" hint="O endereço é criado a partir do nome e pode ser editado.">
            {(p) => <input {...p} autoFocus required className="field-input" maxLength={LIMITS.short} placeholder="Ex.: Convênios" value={newName} onChange={(e) => setNewName(e.target.value)} />}
          </Field>
        </form>
      </Dialog>
      {dialog}
    </div>
  );
}
