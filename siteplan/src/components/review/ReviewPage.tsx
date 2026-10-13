"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Cpu, Pencil, Sparkles } from "lucide-react";
import { BriefingSchema, PlanSchema, type Briefing, type Plan } from "@/lib/schema";
import { CONTENT_ITEMS, FEATURES, GOALS, labelOf, MATERIAL_AVAILABILITY, STAGES, TRAFFIC_SOURCES, VISUAL_STYLES } from "@/lib/schema/catalog";
import { segmentLabel } from "@/lib/schema/segments";
import { describeIssues } from "@/lib/schema/migrate";
import { BRIEFING_STEPS, briefingGaps } from "@/lib/plan/gaps";
import { generateDemoPlan } from "@/lib/generator/demo";
import { carryMaterials } from "@/lib/plan/materials";
import { nowIso } from "@/lib/schema/factory";
import { Badge, Button, cx, Dialog } from "@/components/ui";
import { useProject } from "@/components/project/ProjectProvider";
import { useToast } from "@/components/toast";
import { useAiStatus } from "@/components/useAiStatus";

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function Row({ label, value }: { label: string; value: string | string[] }) {
  const v = Array.isArray(value) ? value.filter(Boolean) : value.trim();
  const empty = Array.isArray(v) ? !v.length : !v;
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd className={cx("text-sm", empty && "text-ink-3 italic")}>
        {empty ? "Não informado" : Array.isArray(v) ? v.join(" · ") : v}
      </dd>
    </div>
  );
}

export function ReviewPage() {
  const { project, update, restore, flush } = useProject();
  const router = useRouter();
  const toast = useToast();
  const ai = useAiStatus();
  const b = project.briefing as Briefing;
  const gaps = briefingGaps(b);
  const blocking = gaps.filter((g) => g.level === "obrigatorio");
  const [confirming, setConfirming] = useState<null | "demo" | "ia">(null);
  const [busy, setBusy] = useState<null | "demo" | "ia">(null);
  const [error, setError] = useState<{ message: string; details?: string[] } | null>(null);

  const editedCount = project.plan ? project.plan.pages.reduce((n, p) => n + p.sections.filter((s) => s.edited).length + (p.edited ? 1 : 0), 0) : 0;

  const editStep = (i: number) => {
    update((d) => {
      d.briefingStep = i;
    });
    router.push(`/projetos/${project.id}/briefing`);
  };

  async function generate(mode: "demo" | "ia") {
    setConfirming(null);
    setError(null);
    const parsed = BriefingSchema.safeParse(b);
    if (!parsed.success) {
      setError({ message: "O briefing tem campos inválidos.", details: describeIssues(parsed.error) });
      return;
    }
    setBusy(mode);
    const before = structuredClone(project);
    try {
      let plan: Plan;
      if (mode === "demo") {
        plan = generateDemoPlan(parsed.data);
      } else {
        const res = await fetch("/api/ai/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ briefing: parsed.data }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw Object.assign(new Error(data.error ?? `Erro ${res.status}`), { details: data.details });
        // Valida de novo no navegador antes de entrar no editor.
        const check = PlanSchema.safeParse(data.plan);
        if (!check.success) throw Object.assign(new Error("O planejamento recebido não passou na validação."), { details: describeIssues(check.error) });
        plan = check.data;
      }
      if (before.plan) plan.materials = carryMaterials(before.plan, plan);
      update((d) => {
        d.plan = plan;
        d.planUpdatedAt = nowIso();
        d.status = "planejamento";
      });
      await flush();
      toast.show({
        tone: "ok",
        message: mode === "demo" ? "Planejamento gerado em modo demonstração." : "Planejamento gerado com IA.",
        action: before.plan ? { label: "Desfazer", run: () => restore(before) } : undefined,
      });
      router.push(`/projetos/${project.id}/planejamento?aba=visao`);
    } catch (e) {
      const err = e as Error & { details?: string[] };
      setError({ message: err.message || "Não foi possível gerar.", details: err.details });
    } finally {
      setBusy(null);
    }
  }

  const start = (mode: "demo" | "ia") => (project.plan ? setConfirming(mode) : void generate(mode));

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-10 lg:py-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">Revise antes de gerar</h1>
        <p className="mt-1 text-sm text-ink-2">Tudo abaixo foi informado por você. O planejamento usa só isso; o que faltar vira hipótese ou pendência.</p>

        <div className="mt-6 flex flex-col gap-4">
          {BRIEFING_STEPS.map((s, i) => (
            <section key={s.key} className="rounded-lg border border-line bg-surface" aria-labelledby={`rev-${s.key}`}>
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <h2 id={`rev-${s.key}`} className="text-sm font-semibold">
                  {s.label}
                </h2>
                <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => editStep(i)}>
                  Editar
                </Button>
              </div>
              <dl className="divide-y divide-line px-4">
                {i === 0 && (
                  <>
                    <Row label="Empresa" value={b.business.companyName} />
                    <Row label="Segmento" value={segmentLabel(b.business.segment, b.business.segmentOther)} />
                    <Row label="Descrição" value={b.business.description} />
                    <Row label="Produtos ou serviços" value={lines(b.business.offerings)} />
                    <Row label="Região" value={b.business.region} />
                    <Row label="Diferenciais" value={lines(b.business.differentiators)} />
                    <Row label="Estágio" value={labelOf(STAGES, b.business.stage)} />
                  </>
                )}
                {i === 1 && (
                  <>
                    <Row label="Cliente ideal" value={b.audience.idealClient} />
                    <Row label="Problema" value={b.audience.problem} />
                    <Row label="Dúvidas e objeções" value={lines(b.audience.objections)} />
                    <Row label="Decisão" value={b.audience.decisionFactors} />
                    <Row label="Origem do tráfego" value={[...b.audience.trafficSources.map((t) => labelOf(TRAFFIC_SOURCES, t)), b.audience.trafficOther]} />
                  </>
                )}
                {i === 2 && (
                  <>
                    <Row label="Objetivo principal" value={b.goals.primary === "outro" ? b.goals.other : labelOf(GOALS, b.goals.primary)} />
                    <Row label="Secundários" value={b.goals.secondary.map((g) => labelOf(GOALS, g))} />
                    <Row label="Conversão" value={b.goals.conversionAction} />
                    <Row label="Oferta" value={b.goals.offer} />
                  </>
                )}
                {i === 3 && (
                  <>
                    {CONTENT_ITEMS.map((c) => (
                      <Row key={c.key} label={c.label} value={`${labelOf(MATERIAL_AVAILABILITY, b.content.items[c.key]?.status)}${b.content.items[c.key]?.note ? ` — ${b.content.items[c.key].note}` : ""}`} />
                    ))}
                    <Row label="WhatsApp" value={b.content.contact.whatsapp} />
                  </>
                )}
                {i === 4 && (
                  <>
                    <Row label="Estilo" value={labelOf(VISUAL_STYLES, b.visual.style)} />
                    <Row label="Cores" value={b.visual.colors} />
                    <Row label="Referências" value={b.visual.references.map((r) => r.url).filter(Boolean)} />
                    <Row label="Evitar" value={b.visual.avoid} />
                  </>
                )}
                {i === 5 && (
                  <>
                    <Row label="Necessidades" value={FEATURES.filter((f) => b.features.needs[f.key] === "sim").map((f) => f.label)} />
                    <Row label="A avaliar" value={FEATURES.filter((f) => b.features.needs[f.key] === "avaliar").map((f) => f.label)} />
                    <Row label="Integrações" value={b.features.integrations} />
                    <Row label="Prazo" value={b.features.deadline} />
                  </>
                )}
              </dl>
            </section>
          ))}
        </div>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <section className="rounded-lg border border-line bg-surface p-4" aria-labelledby="lacunas">
          <h2 id="lacunas" className="text-sm font-semibold">
            Lacunas {gaps.length > 0 && <span className="font-normal text-ink-3">({gaps.length})</span>}
          </h2>
          {gaps.length === 0 ? (
            <p className="mt-2 text-[13px] text-ok">O briefing cobre o essencial.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2.5">
              {gaps.map((g) => (
                <li key={g.label} className="text-[13px]">
                  <button type="button" onClick={() => editStep(g.step)} className="flex items-center gap-1.5 text-left font-medium text-ink hover:text-accent">
                    {g.label}
                    <Badge tone={g.level === "obrigatorio" ? "danger" : g.level === "importante" ? "warn" : "neutral"}>
                      {g.level === "obrigatorio" ? "Obrigatório" : g.level === "importante" ? "Importante" : "Recomendado"}
                    </Badge>
                  </button>
                  <span className="text-ink-3">{g.why}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-line bg-surface p-4" aria-labelledby="gerar">
          <h2 id="gerar" className="text-sm font-semibold">
            {project.plan ? "Gerar de novo" : "Gerar planejamento"}
          </h2>
          {blocking.length > 0 ? (
            <p className="mt-2 text-[13px] text-danger">Preencha {blocking.map((g) => g.label.toLowerCase()).join(" e ")} para gerar.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <Button
                  variant={ai?.enabled ? "secondary" : "primary"}
                  className="w-full"
                  icon={<Cpu className="size-4" />}
                  busy={busy === "demo"}
                  disabled={!!busy}
                  onClick={() => start("demo")}
                >
                  Gerar em modo demonstração
                </Button>
                <p className="mt-1.5 text-[13px] leading-snug text-ink-3">Regras e modelos por segmento, no navegador. Não usa IA.</p>
              </div>
              <div>
                <Button
                  variant="primary"
                  className="w-full"
                  icon={<Sparkles className="size-4" />}
                  busy={busy === "ia"}
                  disabled={!!busy || !ai?.enabled}
                  onClick={() => start("ia")}
                >
                  Gerar com IA
                </Button>
                <p className="mt-1.5 text-[13px] leading-snug text-ink-3">
                  {ai === null
                    ? "Verificando se a IA está configurada…"
                    : ai.enabled
                      ? `Usa ${ai.model} no servidor. Pode levar de 1 a 3 minutos.`
                      : "Indisponível: nenhuma chave de IA configurada no servidor."}
                </p>
              </div>
              {busy === "ia" && (
                <p className="rounded-md bg-accent-soft px-3 py-2 text-[13px] text-accent-strong" role="status">
                  Gerando com IA. O resultado é validado antes de entrar no editor.
                </p>
              )}
            </div>
          )}
          {error && (
            <div role="alert" className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
              <p className="font-medium">{error.message}</p>
              {error.details?.length ? (
                <ul className="mt-1 list-disc pl-4">
                  {error.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
          {project.plan && (
            <Link href={`/projetos/${project.id}/planejamento`} className="mt-4 flex items-center gap-1 text-sm font-medium text-accent hover:underline">
              Abrir o planejamento atual <ArrowRight className="size-4" />
            </Link>
          )}
        </section>
      </aside>

      <Dialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title="Substituir o planejamento atual?"
        description={
          editedCount > 0
            ? `O planejamento atual tem ${editedCount} ${editedCount === 1 ? "item editado" : "itens editados"} por você. Gerar de novo substitui tudo, inclusive essas edições. Você pode desfazer logo depois.`
            : "Gerar de novo substitui páginas, seções, jornadas e requisitos. Você pode desfazer logo depois."
        }
        footer={
          <>
            <Button onClick={() => setConfirming(null)}>Manter o atual</Button>
            <Button variant="danger" onClick={() => confirming && void generate(confirming)}>
              Substituir planejamento
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">Os status dos materiais que continuarem existindo são mantidos, assim como os materiais adicionados à mão.</p>
        <p className="mt-2 text-sm text-ink-2">Para trocar o texto de só uma seção, use “Sugerir novo texto” no editor de seções: ele mostra a prévia antes de aplicar.</p>
      </Dialog>
    </div>
  );
}
