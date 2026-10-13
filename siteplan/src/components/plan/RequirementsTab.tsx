"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Requirement } from "@/lib/schema";
import { LIMITS } from "@/lib/schema";
import { REQUIREMENT_CATEGORIES, type RequirementCategory } from "@/lib/schema/catalog";
import { newId } from "@/lib/schema/factory";
import { Button, IconButton } from "@/components/ui";
import { useProject } from "@/components/project/ProjectProvider";

const HINTS: Record<RequirementCategory, string> = {
  essencial: "Precisa estar no lançamento.",
  futuro: "Fica de fora agora; volta quando houver demanda.",
  integracao: "Serviços externos ligados ao site.",
  manutencao: "Quem cuida, onde fica e como se atualiza.",
  validacao: "Decisões que dependem do cliente ou de regras do setor.",
};

export function RequirementsTab() {
  const { project, updatePlan } = useProject();
  const plan = project.plan!;
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const edit = (id: string, fn: (r: Requirement) => void) =>
    updatePlan((p) => {
      const r = p.requirements.find((x) => x.id === id);
      if (r) {
        fn(r);
        r.origin = "usuario";
      }
    });
  const add = (cat: RequirementCategory) => {
    const title = drafts[cat]?.trim();
    if (!title) return;
    updatePlan((p) => void p.requirements.push({ id: newId("req"), category: cat, title: title.slice(0, LIMITS.short), detail: "", origin: "usuario" }));
    setDrafts((d) => ({ ...d, [cat]: "" }));
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
      <p className="max-w-[70ch] text-sm text-ink-2">
        A recomendação parte da solução mais simples que atende ao objetivo. Mova itens entre categorias ou edite o texto diretamente.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REQUIREMENT_CATEGORIES.map((cat) => {
          const list = plan.requirements.filter((r) => r.category === cat.key);
          return (
            <section key={cat.key} className="flex flex-col rounded-lg border border-line bg-surface" aria-labelledby={`req-${cat.key}`}>
              <div className="border-b border-line px-4 py-3">
                <h2 id={`req-${cat.key}`} className="text-sm font-semibold">
                  {cat.label} <span className="font-normal text-ink-3">({list.length})</span>
                </h2>
                <p className="text-[13px] text-ink-3">{HINTS[cat.key]}</p>
              </div>
              <ul className="flex-1 divide-y divide-line">
                {list.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1.5 px-4 py-3">
                    <div className="flex items-start gap-1">
                      <label className="sr-only" htmlFor={`rt-${r.id}`}>Requisito</label>
                      <input
                        id={`rt-${r.id}`}
                        className="w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium hover:border-line focus:border-accent focus:outline-none"
                        maxLength={LIMITS.short}
                        value={r.title}
                        onChange={(e) => edit(r.id, (x) => (x.title = e.target.value))}
                      />
                      <IconButton label={`Remover ${r.title}`} className="size-7 shrink-0" onClick={() => updatePlan((p) => (p.requirements = p.requirements.filter((x) => x.id !== r.id)))}>
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    </div>
                    <label className="sr-only" htmlFor={`rd-${r.id}`}>Detalhe de {r.title}</label>
                    <textarea
                      id={`rd-${r.id}`}
                      rows={2}
                      className="w-full resize-y rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-[13px] text-ink-2 hover:border-line focus:border-accent focus:outline-none"
                      maxLength={LIMITS.medium}
                      placeholder="Detalhe (opcional)"
                      value={r.detail}
                      onChange={(e) => edit(r.id, (x) => (x.detail = e.target.value))}
                    />
                    <label className="flex items-center gap-2 text-xs text-ink-3">
                      Categoria
                      <select
                        className="rounded border border-line bg-surface px-1 py-0.5 text-xs text-ink-2"
                        value={r.category}
                        onChange={(e) => edit(r.id, (x) => (x.category = e.target.value as RequirementCategory))}
                      >
                        {REQUIREMENT_CATEGORIES.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
              <form
                className="flex gap-2 border-t border-line p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  add(cat.key);
                }}
              >
                <label className="sr-only" htmlFor={`new-${cat.key}`}>Novo item em {cat.label}</label>
                <input
                  id={`new-${cat.key}`}
                  className="field-input !py-1.5 text-sm"
                  maxLength={LIMITS.short}
                  placeholder="Novo item"
                  value={drafts[cat.key] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [cat.key]: e.target.value }))}
                />
                <Button size="sm" type="submit" icon={<Plus className="size-4" />} disabled={!drafts[cat.key]?.trim()}>
                  <span className="sr-only">Adicionar</span>
                </Button>
              </form>
            </section>
          );
        })}
      </div>
    </div>
  );
}
