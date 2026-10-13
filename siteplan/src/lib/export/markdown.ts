import type { Project } from "@/lib/schema";
import { SCHEMA_VERSION } from "@/lib/schema";
import {
  CONTENT_ITEMS,
  GOALS,
  labelOf,
  MATERIAL_AVAILABILITY,
  MATERIAL_OWNERS,
  MATERIAL_STATUS,
  REQUIREMENT_CATEGORIES,
  SITE_TYPES,
  TRAFFIC_SOURCES,
  sectionKindLabel,
} from "@/lib/schema/catalog";
import { segmentLabel } from "@/lib/schema/segments";
import { analyzePlan, describeTarget } from "@/lib/plan/analyze";
import { briefingGaps } from "@/lib/plan/gaps";
import { pageTree } from "@/lib/plan/ops";

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const or = (s: string, f = "—") => (s.trim() ? s.trim() : f);

/** Planejamento completo em Markdown, a partir do estado atual. */
export function buildMarkdown(project: Project): string {
  const b = project.briefing;
  const plan = project.plan;
  const out: string[] = [];
  out.push(`# ${project.name} — planejamento do site`);
  out.push(`Atualizado em ${new Date(project.updatedAt).toLocaleString("pt-BR")}.`);
  if (plan)
    out.push(
      `> Geração: ${plan.generation.mode === "ia" ? `IA (${plan.generation.model ?? "modelo não informado"})` : "modo demonstração, baseado em regras por segmento (sem IA)"}. Textos são sugestões; marcações [Pendente: …] dependem do cliente.`,
    );

  out.push(`\n## Briefing (informado pelo usuário)\n`);
  out.push(
    [
      `- **Empresa:** ${or(b.business.companyName)}`,
      `- **Segmento:** ${segmentLabel(b.business.segment, b.business.segmentOther)}`,
      `- **Região:** ${or(b.business.region)}`,
      `- **Descrição:** ${or(b.business.description)}`,
      `- **Produtos/serviços:** ${or(b.business.offerings.split("\n").filter(Boolean).join("; "))}`,
      `- **Diferenciais:** ${or(b.business.differentiators.split("\n").filter(Boolean).join("; "))}`,
      `- **Cliente ideal:** ${or(b.audience.idealClient)}`,
      `- **Problema:** ${or(b.audience.problem)}`,
      `- **Objeções:** ${or(b.audience.objections.split("\n").filter(Boolean).join(" "))}`,
      `- **Origem do tráfego:** ${or(b.audience.trafficSources.map((t) => labelOf(TRAFFIC_SOURCES, t)).join(", "))}`,
      `- **Objetivo principal:** ${b.goals.primary === "outro" ? or(b.goals.other) : or(labelOf(GOALS, b.goals.primary))}`,
      `- **Conversão:** ${or(b.goals.conversionAction)}`,
      `- **Oferta:** ${or(b.goals.offer)}`,
    ].join("\n"),
  );
  out.push(`\n**Materiais informados no briefing**\n`);
  out.push(CONTENT_ITEMS.map((c) => `- ${c.label}: ${labelOf(MATERIAL_AVAILABILITY, b.content.items[c.key]?.status)}${b.content.items[c.key]?.note ? ` — ${b.content.items[c.key].note}` : ""}`).join("\n"));

  const gaps = briefingGaps(b);
  if (gaps.length) {
    out.push(`\n**Lacunas do briefing**\n`);
    out.push(gaps.map((g) => `- ${g.label} (${g.level}): ${g.why}`).join("\n"));
  }

  if (!plan) {
    out.push("\n_O planejamento ainda não foi gerado._");
    return out.join("\n") + "\n";
  }

  out.push(`\n## Visão geral\n`);
  out.push(`- **Tipo de site recomendado (sugestão):** ${labelOf(SITE_TYPES, plan.overview.siteType)}`);
  out.push(`- **Justificativa:** ${plan.overview.rationale}`);
  if (plan.overview.assumptions.length) {
    out.push(`\n**Hipóteses e sugestões**\n`);
    out.push(
      plan.overview.assumptions
        .map((a) => `- [${a.status === "confirmada" ? "x" : " "}] ${a.kind === "hipotese" ? "Hipótese" : "Sugestão"}: ${a.text}${a.status === "descartada" ? " _(descartada)_" : ""}`)
        .join("\n"),
    );
  }

  out.push(`\n## Mapa de páginas\n`);
  out.push(pageTree(plan).map(({ page, depth }) => `${"  ".repeat(depth)}- **${page.name}** \`${page.slug}\` — ${or(page.goal, "sem objetivo")}`).join("\n"));

  out.push(`\n## Seções por página`);
  for (const { page } of pageTree(plan)) {
    out.push(`\n### ${page.name} \`${page.slug}\`\n`);
    out.push(`Objetivo: ${or(page.goal)}\n`);
    page.sections.forEach((s, i) => {
      out.push(`#### ${i + 1}. ${s.name} _(${sectionKindLabel(s.kind)}${s.edited ? ", editada" : ""})_\n`);
      out.push(`- **Função:** ${or(s.goal)}`);
      out.push(`- **Título:** ${or(s.title)}`);
      out.push(`- **Texto:** ${or(s.body).replace(/\n/g, "  \n  ")}`);
      if (s.contentNeeded.length) out.push(`- **Conteúdo necessário:** ${s.contentNeeded.join("; ")}`);
      if (s.cta) out.push(`- **CTA:** "${or(s.cta.label)}" → ${describeTarget(s.cta.target, plan)}`);
      if (s.kind === "formulario") out.push(`- **Depois do envio:** ${or(s.afterSubmit)}`);
      out.push(`- **Composição:** ${or(s.visual)}`);
      out.push(`- **Celular:** ${or(s.mobile)}\n`);
    });
  }

  out.push(`\n## Jornadas de conversão\n`);
  for (const j of plan.journeys) {
    const entry = plan.pages.find((p) => p.id === j.entryPageId)?.name ?? "sem entrada";
    const steps = j.steps
      .map((st) => {
        const p = plan.pages.find((x) => x.id === st.pageId);
        return p?.sections.find((s) => s.id === st.sectionId)?.name ?? p?.name ?? "removido";
      })
      .join(" → ");
    out.push(`- **${j.name}:** ${j.source} → ${entry}${steps ? ` → ${steps}` : ""} → ${j.action} (${describeTarget(j.actionTarget, plan)})${j.notes ? `. ${j.notes}` : ""}`);
  }
  const issues = analyzePlan(plan, b);
  if (issues.length) {
    out.push(`\n**Problemas encontrados**\n`);
    out.push(issues.map((i) => `- ${i.level === "erro" ? "Erro" : "Aviso"}: ${i.message}`).join("\n"));
  }

  out.push(`\n## Conteúdo pendente\n`);
  out.push(`| Material | Página / seção | Responsável | Status | Observação |\n|---|---|---|---|---|`);
  for (const m of plan.materials) {
    const p = plan.pages.find((x) => x.id === m.pageId);
    const s = p?.sections.find((x) => x.id === m.sectionId);
    out.push(
      `| ${cell(m.label)} | ${cell(p ? `${p.name}${s ? ` › ${s.name}` : ""}` : "Geral")} | ${labelOf(MATERIAL_OWNERS, m.owner)} | ${labelOf(MATERIAL_STATUS, m.status)} | ${cell(m.note) || "—"} |`,
    );
  }

  out.push(`\n## Requisitos técnicos`);
  for (const cat of REQUIREMENT_CATEGORIES) {
    const list = plan.requirements.filter((r) => r.category === cat.key);
    if (!list.length) continue;
    out.push(`\n### ${cat.label}\n`);
    out.push(list.map((r) => `- **${r.title}**${r.detail ? ` — ${r.detail}` : ""}`).join("\n"));
  }
  out.push(`\n---\nExportado pelo SitePlan (formato v${SCHEMA_VERSION}).`);
  return out.join("\n") + "\n";
}

export function buildJsonExport(project: Project): string {
  return JSON.stringify({ format: "siteplan-project", schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), project }, null, 2);
}

export function fileSafeName(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "projeto"
  );
}
