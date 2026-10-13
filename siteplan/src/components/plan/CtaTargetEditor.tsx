"use client";

import type { CtaTarget, Plan } from "@/lib/schema";
import { CTA_TARGET_TYPES, type CtaTargetType } from "@/lib/schema/catalog";
import { targetProblem } from "@/lib/plan/analyze";
import { Field } from "@/components/ui";

/** Escolhe o destino de um CTA. Referências usam ids de página e seção, nunca nomes. */
export function CtaTargetEditor({ target, plan, onChange, label = "Destino" }: { target: CtaTarget; plan: Plan; onChange: (t: CtaTarget) => void; label?: string }) {
  const problem = targetProblem(target, plan);
  const page = plan.pages.find((p) => p.id === target.pageId);
  const set = (patch: Partial<CtaTarget>) => onChange({ ...target, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <Field label={label} error={problem && target.type !== "none" ? `O destino ${problem}.` : undefined}>
        {(p) => (
          <select
            {...p}
            className="field-input"
            value={target.type}
            onChange={(e) => {
              const type = e.target.value as CtaTargetType;
              onChange({ type, pageId: type === "page" || type === "section" ? (target.pageId ?? plan.pages[0]?.id ?? null) : null, sectionId: null, url: type === "external" ? target.url : "" });
            }}
          >
            {CTA_TARGET_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      {(target.type === "page" || target.type === "section") && (
        <Field label="Página">
          {(p) => (
            <select {...p} className="field-input" value={target.pageId ?? ""} onChange={(e) => set({ pageId: e.target.value || null, sectionId: null })}>
              <option value="">Escolha uma página</option>
              {plan.pages.map((pg) => (
                <option key={pg.id} value={pg.id}>
                  {pg.name} ({pg.slug})
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      {target.type === "section" && page && (
        <Field label="Seção">
          {(p) => (
            <select {...p} className="field-input" value={target.sectionId ?? ""} onChange={(e) => set({ sectionId: e.target.value || null })}>
              <option value="">Escolha uma seção</option>
              {page.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      {target.type === "external" && (
        <Field label="Endereço do link">
          {(p) => <input {...p} type="url" className="field-input" maxLength={500} placeholder="https://" value={target.url} onChange={(e) => set({ url: e.target.value })} />}
        </Field>
      )}
    </div>
  );
}
