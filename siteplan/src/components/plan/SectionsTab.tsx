"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Copy, GripVertical, Library, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Briefing, Section } from "@/lib/schema";
import { LIMITS } from "@/lib/schema";
import { SECTION_KINDS, sectionKindLabel, type SectionKind } from "@/lib/schema/catalog";
import { noTarget } from "@/lib/schema/factory";
import { buildContext } from "@/lib/generator/context";
import { buildSection } from "@/lib/generator/sections";
import { describeTarget, targetProblem } from "@/lib/plan/analyze";
import { duplicateSection } from "@/lib/plan/ops";
import { Badge, Button, cx, Dialog, EmptyState, Field, IconButton } from "@/components/ui";
import { useProject } from "@/components/project/ProjectProvider";
import { useToast } from "@/components/toast";
import { usePlanNav } from "./PlanningPage";
import { PropertiesPanel } from "./PropertiesPanel";
import { CtaTargetEditor } from "./CtaTargetEditor";
import { RegenerateDialog } from "./RegenerateDialog";
import { Wire } from "./Wire";

const pendingCount = (s: Section) => (`${s.title}\n${s.body}`.match(/\[Pendente:/g) ?? []).length;

function SectionCard({
  section,
  index,
  total,
  selected,
  onSelect,
  onMove,
  problem,
}: {
  section: Section;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (dir: -1 | 1) => void;
  problem: string | null;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const pend = pendingCount(section);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        "group relative flex items-stretch gap-2 rounded-lg border bg-surface",
        selected ? "border-accent ring-2 ring-accent-soft" : "border-line hover:border-line-strong",
        isDragging && "z-10 shadow-[0_14px_30px_-12px_rgb(29_34_40/0.35)]",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="flex w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-lg text-ink-3 hover:bg-sunken hover:text-ink active:cursor-grabbing"
        aria-label={`Arrastar ${section.name}. Espaço para pegar, setas para mover, espaço para soltar.`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button type="button" onClick={onSelect} aria-pressed={selected} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
        <span className="max-sm:hidden">
          <Wire kind={section.kind} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[13px] text-ink-3 tabular-nums">{index + 1}.</span>
            <span className="font-medium">{section.name}</span>
            {section.edited ? <Badge tone="ok">Editada</Badge> : section.origin === "biblioteca" ? <Badge>Biblioteca</Badge> : <Badge tone="accent">Sugestão</Badge>}
            {pend > 0 && <Badge tone="warn">{pend} pendente{pend > 1 ? "s" : ""}</Badge>}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-ink-2">{section.title || <em className="text-ink-3">Sem título</em>}</span>
          {section.cta && (
            <span className={cx("mt-0.5 block truncate text-xs", problem ? "text-danger" : "text-ink-3")}>
              Botão “{section.cta.label || "sem rótulo"}” {problem ? `— ${problem}` : ""}
            </span>
          )}
        </span>
      </button>
      <div className="flex shrink-0 flex-col justify-center gap-0.5 pr-1.5">
        <IconButton label={`Mover ${section.name} para cima`} disabled={index === 0} onClick={() => onMove(-1)} className="size-7">
          <ArrowUp className="size-3.5" />
        </IconButton>
        <IconButton label={`Mover ${section.name} para baixo`} disabled={index === total - 1} onClick={() => onMove(1)} className="size-7">
          <ArrowDown className="size-3.5" />
        </IconButton>
      </div>
    </li>
  );
}

export function SectionsTab() {
  const { project, updatePlan, restore } = useProject();
  const toast = useToast();
  const { pageId, sectionId, go } = usePlanNav();
  const plan = project.plan!;
  const page = plan.pages.find((p) => p.id === pageId) ?? plan.pages[0];
  const section = page?.sections.find((s) => s.id === sectionId) ?? null;
  const [panelOpen, setPanelOpen] = useState(false);
  const [library, setLibrary] = useState(false);
  const [regen, setRegen] = useState(false);
  const [live, setLive] = useState("");

  useEffect(() => {
    if (page && page.id !== pageId) go({ pagina: page.id });
  }, [page, pageId, go]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = useMemo(() => page?.sections.map((s) => s.id) ?? [], [page]);
  const nameOf = (id: string | number) => page?.sections.find((s) => s.id === id)?.name ?? "seção";
  const posOf = (id: string | number) => ids.indexOf(String(id)) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${nameOf(active.id)} selecionada, posição ${posOf(active.id)} de ${ids.length}.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} sobre a posição ${posOf(over.id)} de ${ids.length}.` : `${nameOf(active.id)} fora da lista.`),
    onDragEnd: ({ active, over }) => (over ? `${nameOf(active.id)} solta na posição ${posOf(over.id)} de ${ids.length}.` : `${nameOf(active.id)} solta.`),
    onDragCancel: ({ active }) => `Movimento cancelado. ${nameOf(active.id)} voltou para a posição original.`,
  };

  if (!page)
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <EmptyState title="Nenhuma página no planejamento.">Adicione uma página no mapa de páginas para editar as seções.</EmptyState>
      </div>
    );

  const editPage = (fn: (sections: Section[]) => void) =>
    updatePlan((pl) => {
      const p = pl.pages.find((x) => x.id === page.id);
      if (p) fn(p.sections);
    });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= page.sections.length || from === to) return;
    editPage((list) => {
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
    });
    setLive(`${page.sections[from]?.name} movida para a posição ${to + 1} de ${page.sections.length}.`);
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
  };
  const select = (id: string) => {
    go({ secao: id });
    setPanelOpen(true);
  };
  const editSection = (fn: (s: Section) => void) =>
    updatePlan((pl) => {
      const s = pl.pages.find((x) => x.id === page.id)?.sections.find((x) => x.id === section?.id);
      if (s) {
        fn(s);
        s.edited = true;
      }
    });

  const addFromLibrary = (kind: SectionKind) => {
    const { section: s } = buildSection(kind, buildContext(project.briefing as Briefing));
    s.origin = "biblioteca";
    s.cta = kind === "formulario" ? { label: "Enviar", target: noTarget() } : null;
    const at = section ? page.sections.findIndex((x) => x.id === section.id) + 1 : page.sections.length;
    editPage((list) => void list.splice(at, 0, s));
    setLibrary(false);
    select(s.id);
    toast.show({ tone: "ok", message: `${sectionKindLabel(kind)} adicionada.` });
  };

  const remove = (s: Section) => {
    const snapshot = structuredClone(project);
    editPage((list) => list.splice(list.findIndex((x) => x.id === s.id), 1));
    go({ secao: null });
    setPanelOpen(false);
    toast.show({ tone: "info", message: `Seção "${s.name}" excluída.`, action: { label: "Desfazer", run: () => restore(snapshot) } });
  };

  const used = new Set(page.sections.map((s) => s.kind));

  return (
    <div className="flex min-h-full">
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[820px]">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Página" className="w-full sm:w-72">
              {(p) => (
                <select {...p} className="field-input" value={page.id} onChange={(e) => go({ pagina: e.target.value, secao: null })}>
                  {plan.pages.map((pg) => (
                    <option key={pg.id} value={pg.id}>
                      {pg.name} — {pg.slug}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Button className="max-sm:flex-1" icon={<Library className="size-4" />} disabled={page.sections.length >= LIMITS.sections} onClick={() => setLibrary(true)}>
              Biblioteca de seções
            </Button>
          </div>
          <p className="mt-3 text-[13px] text-ink-2">
            <span className="font-medium text-ink">Objetivo da página:</span> {page.goal || <em className="text-ink-3">não definido</em>}
          </p>
          <p className="mt-1 text-[13px] text-ink-3">
            As miniaturas mostram a estrutura do conteúdo, não uma prévia fiel do site final. Arraste pela alça ou use as setas para reordenar.
          </p>

          {page.sections.length === 0 ? (
            <div className="mt-5">
              <EmptyState title="Esta página ainda não tem seções." action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setLibrary(true)}>Adicionar da biblioteca</Button>}>
                Adicione só as seções que têm função nesta página.
              </EmptyState>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
              accessibility={{
                announcements,
                screenReaderInstructions: { draggable: "Para pegar uma seção, pressione espaço. Use as setas para mover e espaço para soltar. Esc cancela." },
              }}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <ol className="mt-5 flex flex-col gap-2" aria-label={`Seções de ${page.name}`}>
                  {page.sections.map((s, i) => (
                    <SectionCard
                      key={s.id}
                      section={s}
                      index={i}
                      total={page.sections.length}
                      selected={s.id === section?.id}
                      onSelect={() => select(s.id)}
                      onMove={(d) => move(i, i + d)}
                      problem={s.cta ? targetProblem(s.cta.target, plan) : null}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}
          <p className="sr-only" aria-live="polite">
            {live}
          </p>
        </div>
      </div>

      <PropertiesPanel
        title={section ? `Seção: ${section.name}` : "Propriedades da seção"}
        open={panelOpen && !!section}
        onClose={() => setPanelOpen(false)}
        empty={<p className="text-sm text-ink-3">Selecione uma seção para editar texto, CTA e orientações.</p>}
      >
        {section && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" icon={<Sparkles className="size-4" />} onClick={() => setRegen(true)}>
                Sugerir novo texto
              </Button>
              <Button
                size="sm"
                icon={<Copy className="size-4" />}
                disabled={page.sections.length >= LIMITS.sections}
                onClick={() => {
                  let id: string | undefined;
                  updatePlan((pl) => {
                    const p = pl.pages.find((x) => x.id === page.id);
                    if (p) id = duplicateSection(p, section.id)?.id;
                  });
                  if (id) select(id);
                }}
              >
                Duplicar
              </Button>
              <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => remove(section)}>
                Excluir
              </Button>
            </div>
            <p className="text-[13px] text-ink-3">
              {sectionKindLabel(section.kind)} · {section.edited ? "editada por você" : section.origin === "ia" ? "sugestão da IA" : section.origin === "demo" ? "sugestão do modo demonstração" : "da biblioteca"}
            </p>
            <Field label="Nome">
              {(p) => <input {...p} className="field-input" maxLength={LIMITS.short} value={section.name} onChange={(e) => editSection((s) => (s.name = e.target.value))} />}
            </Field>
            <Field label="Objetivo">
              {(p) => <textarea {...p} rows={2} className="field-input" maxLength={LIMITS.medium} value={section.goal} onChange={(e) => editSection((s) => (s.goal = e.target.value))} />}
            </Field>
            <Field label="Título sugerido">
              {(p) => <textarea {...p} rows={2} className="field-input" maxLength={LIMITS.medium} value={section.title} onChange={(e) => editSection((s) => (s.title = e.target.value))} />}
            </Field>
            <Field label="Texto de apoio" hint="Trechos [Pendente: …] viram itens na lista de conteúdo pendente.">
              {(p) => <textarea {...p} rows={6} className="field-input" maxLength={LIMITS.long} value={section.body} onChange={(e) => editSection((s) => (s.body = e.target.value))} />}
            </Field>
            <Field label="Conteúdo necessário" hint="Um por linha. Alimenta a lista de materiais.">
              {(p) => (
                <textarea
                  {...p}
                  rows={3}
                  className="field-input"
                  maxLength={LIMITS.long}
                  value={section.contentNeeded.join("\n")}
                  onChange={(e) => editSection((s) => (s.contentNeeded = e.target.value.split("\n").slice(0, LIMITS.list).map((l) => l.slice(0, LIMITS.short))))}
                />
              )}
            </Field>

            <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-3">
              <legend className="px-1 text-sm font-medium">Chamada para ação</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-accent)]"
                  checked={!!section.cta}
                  onChange={(e) => editSection((s) => (s.cta = e.target.checked ? { label: "", target: noTarget() } : null))}
                />
                Esta seção tem botão
              </label>
              {section.cta && (
                <>
                  <Field label="Texto do botão" hint="Diga exatamente o que acontece ao clicar.">
                    {(p) => <input {...p} className="field-input" maxLength={80} value={section.cta!.label} onChange={(e) => editSection((s) => s.cta && (s.cta.label = e.target.value))} />}
                  </Field>
                  <CtaTargetEditor target={section.cta.target} plan={plan} onChange={(t) => editSection((s) => s.cta && (s.cta.target = t))} />
                  <p className="text-xs text-ink-3">Leva a: {describeTarget(section.cta.target, plan)}</p>
                </>
              )}
            </fieldset>

            {section.kind === "formulario" && (
              <Field label="Depois do envio" hint="O que o visitante vê e o que a equipe recebe.">
                {(p) => <textarea {...p} rows={3} className="field-input" maxLength={LIMITS.medium} value={section.afterSubmit} onChange={(e) => editSection((s) => (s.afterSubmit = e.target.value))} />}
              </Field>
            )}
            <Field label="Composição visual">
              {(p) => <textarea {...p} rows={3} className="field-input" maxLength={LIMITS.medium} value={section.visual} onChange={(e) => editSection((s) => (s.visual = e.target.value))} />}
            </Field>
            <Field label="Observações para o celular">
              {(p) => <textarea {...p} rows={2} className="field-input" maxLength={LIMITS.medium} value={section.mobile} onChange={(e) => editSection((s) => (s.mobile = e.target.value))} />}
            </Field>
          </div>
        )}
      </PropertiesPanel>

      <Dialog open={library} onClose={() => setLibrary(false)} title="Biblioteca de seções" description="Adicione só o que tem função nesta página. A seção entra depois da selecionada, com texto do briefing ou pendências." wide>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SECTION_KINDS.map((k) => (
            <li key={k.key}>
              <button
                type="button"
                onClick={() => addFromLibrary(k.key)}
                className="flex h-full w-full items-start gap-3 rounded-lg border border-line p-3 text-left transition-colors duration-150 hover:border-accent hover:bg-accent-soft/40"
              >
                <Wire kind={k.key} />
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {k.label}
                    {used.has(k.key) && <Badge>Já na página</Badge>}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{k.purpose}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>

      {section && regen && <RegenerateDialog page={page} section={section} onClose={() => setRegen(false)} />}
    </div>
  );
}
