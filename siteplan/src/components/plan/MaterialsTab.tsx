"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Material } from "@/lib/schema";
import { LIMITS } from "@/lib/schema";
import { MATERIAL_OWNERS, MATERIAL_STATUS, labelOf } from "@/lib/schema/catalog";
import { newId } from "@/lib/schema/factory";
import { Button, cx, Field, IconButton, Segmented } from "@/components/ui";
import { useProject } from "@/components/project/ProjectProvider";
import { usePlanNav } from "./PlanningPage";

const FILTERS = [{ key: "todos", label: "Todos" }, ...MATERIAL_STATUS] as const;
type Filter = (typeof FILTERS)[number]["key"];
const TONE: Record<string, string> = {
  pendente: "text-warn",
  "em-producao": "text-accent-strong",
  recebido: "text-ok",
  na: "text-ink-3",
};

export function MaterialsTab() {
  const { project, updatePlan } = useProject();
  const { go } = usePlanNav();
  const plan = project.plan!;
  const [filter, setFilter] = useState<Filter>("todos");
  const [label, setLabel] = useState("");
  const list = useMemo(() => (filter === "todos" ? plan.materials : plan.materials.filter((m) => m.status === filter)), [plan.materials, filter]);
  const counts = useMemo(() => Object.fromEntries(MATERIAL_STATUS.map((s) => [s.key, plan.materials.filter((m) => m.status === s.key).length])), [plan.materials]);

  const edit = (id: string, fn: (m: Material) => void) =>
    updatePlan((p) => {
      const m = p.materials.find((x) => x.id === id);
      if (m) fn(m);
    });
  const where = (m: Material) => {
    const p = plan.pages.find((x) => x.id === m.pageId);
    const s = p?.sections.find((x) => x.id === m.sectionId);
    return { page: p, section: s, text: p ? `${p.name}${s ? ` › ${s.name}` : ""}` : "Geral" };
  };
  const addManual = () => {
    if (!label.trim()) return;
    updatePlan((p) =>
      void p.materials.push({
        id: newId("mat"),
        key: `manual::${newId("k")}`,
        label: label.trim().slice(0, LIMITS.short),
        pageId: null,
        sectionId: null,
        owner: "a-definir",
        status: "pendente",
        note: "",
        origin: "manual",
      }),
    );
    setLabel("");
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="max-w-[70ch] text-sm text-ink-2">
            Gerada a partir das seções e das pendências escritas nos textos. Ao editar o planejamento, a lista se atualiza e mantém o status, o responsável e as observações já preenchidos.
          </p>
          <p className="mt-1 text-[13px] text-ink-3">
            {MATERIAL_STATUS.map((s) => `${counts[s.key]} ${s.label.toLowerCase()}`).join(" · ")}
          </p>
        </div>
        <Segmented size="sm" name="filtro-materiais" legend="Filtrar por status" value={filter} options={FILTERS} onChange={setFilter} />
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-line bg-surface">
        <table className="w-full text-sm max-md:block">
          <thead className="bg-ground text-left text-[13px] text-ink-3 max-md:hidden">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Material</th>
              <th scope="col" className="px-3 py-2 font-medium">Página ou seção</th>
              <th scope="col" className="w-40 px-3 py-2 font-medium">Responsável</th>
              <th scope="col" className="w-40 px-3 py-2 font-medium">Status</th>
              <th scope="col" className="px-3 py-2 font-medium">Observação</th>
              <th scope="col" className="w-10 px-2 py-2"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line max-md:block">
            {list.length === 0 && (
              <tr className="max-md:block">
                <td colSpan={6} className="px-4 py-6 text-ink-3 max-md:block">
                  Nenhum material com este status.
                </td>
              </tr>
            )}
            {list.map((m) => {
              const w = where(m);
              return (
                <tr key={m.id} className="align-top max-md:grid max-md:grid-cols-2 max-md:gap-x-3 max-md:gap-y-2 max-md:px-4 max-md:py-3">
                  <td className="px-4 py-2.5 max-md:col-span-2 max-md:p-0">
                    <span className="font-medium">{m.label}</span>
                    {m.origin === "manual" && <span className="ml-1.5 text-xs text-ink-3">adicionado por você</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[13px] max-md:col-span-2 max-md:p-0">
                    {w.page ? (
                      <button type="button" className="text-left text-ink-2 hover:text-accent hover:underline" onClick={() => go({ aba: "secoes", pagina: w.page!.id, secao: w.section?.id ?? null })}>
                        {w.text}
                      </button>
                    ) : (
                      <span className="text-ink-3">{w.text}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 max-md:p-0">
                    <label className="sr-only" htmlFor={`own-${m.id}`}>Responsável por {m.label}</label>
                    <select id={`own-${m.id}`} className="field-input !py-1.5 text-[13px]" value={m.owner} onChange={(e) => edit(m.id, (x) => (x.owner = e.target.value as Material["owner"]))}>
                      {MATERIAL_OWNERS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 max-md:p-0">
                    <label className="sr-only" htmlFor={`st-${m.id}`}>Status de {m.label}</label>
                    <select
                      id={`st-${m.id}`}
                      className={cx("field-input !py-1.5 text-[13px] font-medium", TONE[m.status])}
                      value={m.status}
                      onChange={(e) => edit(m.id, (x) => (x.status = e.target.value as Material["status"]))}
                    >
                      {MATERIAL_STATUS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 max-md:col-span-2 max-md:p-0">
                    <label className="sr-only" htmlFor={`nt-${m.id}`}>Observação sobre {m.label}</label>
                    <input id={`nt-${m.id}`} className="field-input !py-1.5 text-[13px]" maxLength={LIMITS.medium} placeholder="—" value={m.note} onChange={(e) => edit(m.id, (x) => (x.note = e.target.value))} />
                  </td>
                  <td className="px-2 py-2 max-md:col-span-2 max-md:p-0 max-md:empty:hidden">
                    {m.origin === "manual" && (
                      <IconButton label={`Remover ${m.label}`} onClick={() => updatePlan((p) => (p.materials = p.materials.filter((x) => x.id !== m.id)))}>
                        <Trash2 className="size-4" />
                      </IconButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addManual();
        }}
      >
        <Field label="Adicionar material" className="min-w-60 flex-1 sm:max-w-md">
          {(p) => <input {...p} className="field-input" maxLength={LIMITS.short} placeholder="Ex.: Tabela de convênios atualizada" value={label} onChange={(e) => setLabel(e.target.value)} />}
        </Field>
        <Button type="submit" icon={<Plus className="size-4" />} disabled={!label.trim()}>
          Adicionar
        </Button>
      </form>
      <p className="mt-2 text-xs text-ink-3">Status disponíveis: {MATERIAL_STATUS.map((s) => labelOf(MATERIAL_STATUS, s.key)).join(", ")}.</p>
    </div>
  );
}
