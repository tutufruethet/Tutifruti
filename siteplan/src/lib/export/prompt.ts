import type { Plan, Project } from "@/lib/schema";
import {
  FEATURES,
  GOALS,
  labelOf,
  MATERIAL_OWNERS,
  MATERIAL_STATUS,
  REQUIREMENT_CATEGORIES,
  SITE_TYPES,
  STAGES,
  TRAFFIC_SOURCES,
  sectionKindLabel,
} from "@/lib/schema/catalog";
import { segmentLabel } from "@/lib/schema/segments";
import { describeTarget } from "@/lib/plan/analyze";
import { pageTree } from "@/lib/plan/ops";
import { visualDirection } from "./visual";

const or = (s: string, fallback = "[não informado]") => (s.trim() ? s.trim() : fallback);
const bullets = (items: string[]) => items.map((i) => `- ${i}`).join("\n");
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

/**
 * Prompt de desenvolvimento a partir do estado atual do projeto (inclui todas as edições manuais).
 * Texto entre [Pendente: …] deve virar marcador visível no site, nunca conteúdo inventado.
 */
export function buildDevPrompt(project: Project): string {
  const b = project.briefing;
  const plan = project.plan as Plan;
  const tree = pageTree(plan);
  const out: string[] = [];
  const h = (n: number, t: string) => out.push(`\n## ${n}. ${t}\n`);

  out.push(`# Prompt de desenvolvimento — ${or(b.business.companyName, project.name)}`);
  out.push(
    `Você vai desenvolver o site descrito abaixo. Siga a estrutura de páginas e seções na ordem dada. ` +
      `Textos marcados como [Pendente: …] ainda não existem: mostre um marcador visível no lugar e não invente o conteúdo. ` +
      `Não crie depoimentos, números, certificações ou resultados que não estejam aqui.`,
  );
  out.push(
    `\nPlanejamento gerado em ${plan.generation.mode === "ia" ? `modo IA (${plan.generation.model ?? "modelo não informado"})` : "modo demonstração (regras, sem IA)"} e revisado pelo usuário.`,
  );

  h(1, "Contexto do negócio");
  out.push(
    bullets([
      `Empresa: ${or(b.business.companyName)}`,
      `Segmento: ${segmentLabel(b.business.segment, b.business.segmentOther)}`,
      `Região: ${or(b.business.region)}`,
      `Estágio: ${or(labelOf(STAGES, b.business.stage))}`,
      `Descrição: ${or(b.business.description)}`,
      `Produtos/serviços: ${lines(b.business.offerings).join("; ") || "[não informado]"}`,
      `Diferenciais (informados pelo cliente): ${lines(b.business.differentiators).join("; ") || "[não informado]"}`,
    ]),
  );

  h(2, "Objetivo do site");
  const goal = b.goals.primary === "outro" ? or(b.goals.other) : labelOf(GOALS, b.goals.primary) || "[não informado]";
  out.push(
    bullets([
      `Objetivo principal: ${goal}`,
      `Objetivos secundários: ${b.goals.secondary.map((g) => labelOf(GOALS, g)).join(", ") || "nenhum"}`,
      `Conversão: ${or(b.goals.conversionAction)}`,
      `Tipo de site: ${labelOf(SITE_TYPES, plan.overview.siteType)} — ${plan.overview.rationale}`,
    ]),
  );

  h(3, "Público");
  out.push(
    bullets([
      `Cliente ideal: ${or(b.audience.idealClient)}`,
      `Problema que quer resolver: ${or(b.audience.problem)}`,
      `Dúvidas e objeções: ${lines(b.audience.objections).join(" ") || "[não informado]"}`,
      `O que influencia a decisão: ${or(b.audience.decisionFactors)}`,
      `Origem do tráfego: ${[...b.audience.trafficSources.map((t) => labelOf(TRAFFIC_SOURCES, t)), b.audience.trafficOther].filter(Boolean).join(", ") || "[não informado]"}`,
    ]),
  );

  h(4, "Oferta");
  out.push(or(b.goals.offer, "[Pendente: oferta não definida — usar a ação principal sem promessa específica]"));

  h(5, "Direção visual");
  out.push(bullets(visualDirection(b)));
  const refs = b.visual.references.filter((r) => r.url || r.note);
  if (refs.length) {
    out.push(`\nReferências informadas pelo cliente (não foram acessadas nem analisadas pelo SitePlan):`);
    out.push(bullets(refs.map((r) => `${r.url || "(sem URL)"}${r.note ? ` — ${r.note}` : ""}`)));
  }

  h(6, "Mapa de páginas");
  out.push(
    tree
      .map(({ page, depth }) => {
        const related = page.relatedPageIds
          .map((id) => plan.pages.find((p) => p.id === id)?.name)
          .filter(Boolean)
          .join(", ");
        return `${"  ".repeat(depth)}- ${page.name} \`${page.slug}\`${page.inMenu ? " (menu principal)" : ""} — ${or(page.goal, "[objetivo não definido]")}${related ? ` · relaciona-se com: ${related}` : ""}`;
      })
      .join("\n"),
  );

  h(7, "Seções e conteúdo por página");
  for (const { page } of tree) {
    out.push(`\n### ${page.name} (\`${page.slug}\`)`);
    if (!page.sections.length) out.push("[Sem seções definidas]");
    page.sections.forEach((s, i) => {
      out.push(`\n**${i + 1}. ${s.name}** (${sectionKindLabel(s.kind)})`);
      out.push(
        bullets(
          [
            `Função: ${or(s.goal)}`,
            `Título: ${or(s.title)}`,
            `Texto: ${or(s.body).replace(/\n/g, " / ")}`,
            s.contentNeeded.length ? `Conteúdo necessário: ${s.contentNeeded.join("; ")}` : "",
            s.cta ? `CTA: "${or(s.cta.label, "[sem rótulo]")}" → ${describeTarget(s.cta.target, plan)}` : "",
            s.kind === "formulario" ? `Depois do envio: ${or(s.afterSubmit, "[Pendente: definir]")}` : "",
            `Composição: ${or(s.visual)}`,
            `No celular: ${or(s.mobile)}`,
          ].filter(Boolean),
        ),
      );
    });
  }

  h(8, "CTAs e destinos");
  const ctas = plan.pages.flatMap((p) => p.sections.filter((s) => s.cta).map((s) => `${p.name} › ${s.name}: "${s.cta!.label}" → ${describeTarget(s.cta!.target, plan)}`));
  out.push(ctas.length ? bullets(ctas) : "Nenhum CTA definido.");
  if (b.content.contact.whatsapp.trim())
    out.push(`\nWhatsApp: ${b.content.contact.whatsapp} — usar links wa.me com mensagem pré-preenchida que identifique a página de origem.`);
  if (plan.journeys.length) {
    out.push("\nJornadas de conversão:");
    out.push(
      bullets(
        plan.journeys.map((j) => {
          const entry = plan.pages.find((p) => p.id === j.entryPageId)?.name ?? "[sem entrada]";
          const steps = j.steps
            .map((st) => {
              const p = plan.pages.find((x) => x.id === st.pageId);
              return p?.sections.find((s) => s.id === st.sectionId)?.name ?? p?.name;
            })
            .filter(Boolean)
            .join(" → ");
          return `${j.source} → ${entry}${steps ? ` → ${steps}` : ""} → ${j.action} (${describeTarget(j.actionTarget, plan)})`;
        }),
      ),
    );
  }

  h(9, "Funcionalidades");
  const reqs = (cat: string) => plan.requirements.filter((r) => r.category === cat).map((r) => `${r.title}${r.detail ? ` — ${r.detail}` : ""}`);
  out.push(bullets(reqs("essencial")));
  const futures = reqs("futuro");
  if (futures.length) out.push(`\nFora do escopo agora (melhorias futuras):\n${bullets(futures)}`);
  out.push(
    `\nNecessidades marcadas no briefing: ${FEATURES.map((f) => `${f.label}: ${b.features.needs[f.key] === "sim" ? "sim" : b.features.needs[f.key] === "nao" ? "não" : "avaliar"}`).join("; ")}.`,
  );

  h(10, "Integrações");
  out.push(reqs("integracao").length ? bullets(reqs("integracao")) : "Nenhuma integração definida.");

  h(11, "Comportamento no mobile");
  out.push(
    bullets([
      "Projetar primeiro para 360–390px de largura; sem rolagem horizontal.",
      "Botão da ação principal visível na primeira tela e repetido no fim de cada página.",
      "Áreas de toque de pelo menos 44×44px; telefones e WhatsApp como links clicáveis.",
      "Menu compacto com a ação principal fora do menu.",
      "Imagens responsivas (srcset) e carregamento sob demanda abaixo da primeira tela.",
      "Observações por seção estão na parte 7.",
    ]),
  );

  h(12, "Acessibilidade");
  out.push(
    bullets([
      "WCAG 2.1 AA: contraste de 4,5:1 no texto e 3:1 em elementos grandes.",
      "HTML semântico (header, nav, main, footer), um h1 por página e hierarquia de títulos sem pular níveis.",
      "Foco visível em todos os elementos interativos; navegação completa por teclado.",
      "Texto alternativo descritivo nas imagens; vazio nas decorativas.",
      "Campos de formulário com label, mensagens de erro ligadas ao campo e anunciadas.",
      "Respeitar prefers-reduced-motion.",
      `Idioma: ${or(b.features.languages, "Português (Brasil)")} (atributo lang correto).`,
    ]),
  );

  h(13, "Requisitos de SEO");
  out.push(
    bullets([
      "Título (até 60 caracteres) e descrição (até 155) únicos por página, usando o serviço e a região quando fizer sentido.",
      "URLs exatamente como no mapa de páginas.",
      "sitemap.xml, robots.txt e URL canônica.",
      "Dados estruturados schema.org do tipo adequado ao negócio (ex.: LocalBusiness, Dentist, Store), só com dados confirmados.",
      "Imagens otimizadas (WebP/AVIF) com dimensões declaradas; Core Web Vitals no verde.",
      "Open Graph para compartilhamento no WhatsApp e redes sociais.",
    ]),
  );

  h(14, "Materiais disponíveis e pendentes");
  const ready = plan.materials.filter((m) => m.status === "recebido");
  const missing = plan.materials.filter((m) => m.status === "pendente" || m.status === "em-producao");
  const where = (m: (typeof plan.materials)[number]) => {
    const p = plan.pages.find((x) => x.id === m.pageId);
    const s = p?.sections.find((x) => x.id === m.sectionId);
    return p ? ` (${p.name}${s ? ` › ${s.name}` : ""})` : "";
  };
  out.push(`Disponíveis:\n${ready.length ? bullets(ready.map((m) => `${m.label}${where(m)}`)) : "- nenhum ainda"}`);
  out.push(
    `\nPendentes (usar marcador visível até chegar):\n${missing.length ? bullets(missing.map((m) => `${m.label}${where(m)} — ${labelOf(MATERIAL_STATUS, m.status)}, responsável: ${labelOf(MATERIAL_OWNERS, m.owner)}${m.note ? ` — ${m.note}` : ""}`)) : "- nenhum"}`,
  );

  h(15, "Restrições");
  const f = b.features;
  out.push(
    bullets(
      [
        f.deadline.trim() ? `Prazo: ${f.deadline}` : "",
        f.budget.trim() ? `Orçamento: ${f.budget}` : "",
        f.technology.trim() ? `Tecnologia preferida: ${f.technology}` : "Tecnologia: escolher a mais simples que atenda às funcionalidades essenciais.",
        f.hosting.trim() ? `Hospedagem e manutenção: ${f.hosting}` : "",
        ...reqs("manutencao"),
        ...reqs("validacao").map((r) => `Validar antes de publicar: ${r}`),
        ...plan.overview.assumptions.filter((a) => a.status !== "descartada").map((a) => `${a.kind === "hipotese" ? "Hipótese" : "Sugestão"}${a.status === "confirmada" ? " (confirmada)" : " (a confirmar)"}: ${a.text}`),
        "Não usar depoimentos, números, selos ou resultados que não estejam neste documento.",
      ].filter(Boolean),
    ),
  );

  h(16, "Critérios de conclusão");
  out.push(
    bullets([
      "Todas as páginas e seções do mapa implementadas na ordem definida.",
      "Todos os CTAs levam aos destinos listados na parte 8; nenhum link quebrado.",
      "Formulários enviam, mostram confirmação e executam o que está em \"Depois do envio\".",
      "Layout testado em 360px, 768px e 1440px sem rolagem horizontal.",
      "Lighthouse: Acessibilidade ≥ 95, SEO ≥ 95, Performance ≥ 90 no celular.",
      "Itens pendentes visíveis como marcadores, listados para o cliente.",
      "Nenhum conteúdo inventado.",
    ]),
  );
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export const requirementLabel = (key: string) => labelOf(REQUIREMENT_CATEGORIES, key);
