"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Cpu, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import type { Briefing, Page, Section } from "@/lib/schema";
import { SectionSchema } from "@/lib/schema";
import { regenerateDemoSection } from "@/lib/generator/demo";
import { Button, cx, Dialog, Field } from "@/components/ui";
import { useProject } from "@/components/project/ProjectProvider";
import { useToast } from "@/components/toast";
import { useAiStatus } from "@/components/useAiStatus";

type Suggestion = { section: Section; note: string; mode: "demo" | "ia" };

function Compare({ label, before, after }: { label: string; before: string; after: string }) {
  const same = before.trim() === after.trim();
  return (
    <div className="grid gap-2 border-b border-line py-3 last:border-0 sm:grid-cols-2">
      <p className="text-[13px] font-medium text-ink-3 sm:col-span-2">
        {label} {same && <span className="font-normal">(sem mudança)</span>}
      </p>
      <div className="rounded-md bg-sunken px-3 py-2 text-sm whitespace-pre-line text-ink-2">
        <span className="mb-1 block text-xs font-medium text-ink-3">Atual</span>
        {before || <em>vazio</em>}
      </div>
      <div className={cx("rounded-md px-3 py-2 text-sm whitespace-pre-line", same ? "bg-sunken text-ink-2" : "bg-accent-soft text-ink ring-1 ring-accent-line")}>
        <span className="mb-1 block text-xs font-medium text-accent-strong">Sugestão</span>
        {after || <em>vazio</em>}
      </div>
    </div>
  );
}

/** Regenera uma seção isolada: mostra a prévia e só altera o editor se o usuário aplicar. */
export function RegenerateDialog({ page, section, onClose }: { page: Page; section: Section; onClose: () => void }) {
  const { project, updatePlan, restore } = useProject();
  const toast = useToast();
  const ai = useAiStatus();
  const [variant, setVariant] = useState(1);
  const [mode, setMode] = useState<"demo" | "ia">("demo");
  const [instruction, setInstruction] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDemo = useCallback(
    (v: number) => {
      const s = regenerateDemoSection(project.briefing as Briefing, project.plan!, page.id, section.id, v);
      setSuggestion(s ? { section: s, note: "Variação gerada por regras a partir do briefing atual.", mode: "demo" } : null);
    },
    [project.briefing, project.plan, page.id, section.id],
  );

  useEffect(() => {
    if (mode === "demo") runDemo(variant);
    // Só na abertura e quando a variação muda.
  }, [variant, mode]);

  async function runAi() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/section", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ briefing: project.briefing, plan: project.plan, pageId: page.id, sectionId: section.id, instruction }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
      const check = SectionSchema.safeParse(data.section);
      if (!check.success || check.data.id !== section.id) throw new Error("A sugestão recebida não passou na validação.");
      setSuggestion({ section: check.data, note: String(data.note ?? ""), mode: "ia" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar.");
    } finally {
      setLoading(false);
    }
  }

  const apply = () => {
    if (!suggestion) return;
    const snapshot = structuredClone(project);
    const next = suggestion.section;
    updatePlan((pl) => {
      const s = pl.pages.find((p) => p.id === page.id)?.sections.find((x) => x.id === section.id);
      if (!s) return;
      s.title = next.title;
      s.body = next.body;
      s.goal = next.goal || s.goal;
      s.contentNeeded = next.contentNeeded;
      // O destino do CTA é estrutura: continua o mesmo; só o texto do botão muda.
      if (s.cta && next.cta) s.cta.label = next.cta.label;
      s.origin = suggestion.mode;
      s.edited = false;
    });
    onClose();
    toast.show({ tone: "ok", message: "Sugestão aplicada.", action: { label: "Desfazer", run: () => restore(snapshot) } });
  };

  const s = suggestion?.section;
  return (
    <Dialog
      open
      onClose={onClose}
      wide
      title={`Novo texto para “${section.name}”`}
      description="Prévia: nada muda no editor até você aplicar. O destino do botão continua o mesmo."
      footer={
        <>
          <Button onClick={onClose}>Descartar</Button>
          <Button variant="primary" icon={<Check className="size-4" />} disabled={!suggestion || loading} onClick={apply}>
            Aplicar sugestão
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={mode === "demo" ? "primary" : "secondary"} icon={<Cpu className="size-4" />} onClick={() => setMode("demo")}>
            Modo demonstração
          </Button>
          <Button
            size="sm"
            variant={mode === "ia" ? "primary" : "secondary"}
            icon={<Sparkles className="size-4" />}
            disabled={!ai?.enabled}
            title={ai?.enabled ? undefined : "Nenhuma chave de IA configurada no servidor"}
            onClick={() => {
              setMode("ia");
              setSuggestion(null);
            }}
          >
            IA {ai && !ai.enabled && "(indisponível)"}
          </Button>
          {mode === "demo" && (
            <Button size="sm" variant="ghost" icon={<RefreshCw className="size-4" />} onClick={() => setVariant((v) => v + 1)}>
              Outra variação
            </Button>
          )}
        </div>

        {section.edited && (
          <p className="flex items-start gap-2 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-warn">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Esta seção tem edições suas. Aplicar substitui título, texto, conteúdo necessário e texto do botão.
          </p>
        )}

        {mode === "ia" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label="Orientação para a IA" optional className="flex-1" hint="Ex.: mais direto, citar o horário estendido.">
              {(p) => <input {...p} className="field-input" maxLength={300} value={instruction} onChange={(e) => setInstruction(e.target.value)} />}
            </Field>
            <Button variant="primary" busy={loading} icon={<Sparkles className="size-4" />} onClick={() => void runAi()}>
              {suggestion ? "Gerar outra" : "Gerar sugestão"}
            </Button>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}
        {loading && (
          <p role="status" className="text-sm text-ink-2">
            Gerando com IA…
          </p>
        )}

        {s && (
          <div aria-live="polite">
            {suggestion?.note && <p className="mb-1 text-[13px] text-ink-3">{suggestion.note}</p>}
            <Compare label="Título" before={section.title} after={s.title} />
            <Compare label="Texto de apoio" before={section.body} after={s.body} />
            {section.cta && <Compare label="Texto do botão" before={section.cta.label} after={s.cta?.label ?? section.cta.label} />}
            <Compare label="Conteúdo necessário" before={section.contentNeeded.join("\n")} after={s.contentNeeded.join("\n")} />
          </div>
        )}
      </div>
    </Dialog>
  );
}
