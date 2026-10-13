import { test } from "node:test";
import assert from "node:assert/strict";
import { generateDemoPlan, regenerateDemoSection } from "@/lib/generator/demo";
import { newProject, sampleProject } from "@/lib/schema/factory";
import { ProjectSchema, type Project } from "@/lib/schema";
import { parseExportFile } from "@/lib/schema/migrate";
import { buildJsonExport, buildMarkdown } from "@/lib/export/markdown";
import { buildDevPrompt } from "@/lib/export/prompt";
import { syncMaterials } from "@/lib/plan/materials";
import { analyzePlan } from "@/lib/plan/analyze";
import { duplicatePage, removePage, pageTree } from "@/lib/plan/ops";

function planned(p: Project): Project {
  p.plan = generateDemoPlan(p.briefing);
  p.status = "planejamento";
  p.planUpdatedAt = p.updatedAt;
  return p;
}

test("exemplo odontológico: WhatsApp no topo e sem depoimentos inventados", () => {
  const p = planned(sampleProject());
  const plan = p.plan!;
  // 4 tratamentos + busca no Google → uma página por tratamento.
  assert.equal(plan.overview.siteType, "institucional");
  assert.ok(plan.pages.filter((x) => x.slug.startsWith("/servicos/")).length >= 4);
  const home = plan.pages.find((x) => x.slug === "/")!;
  const hero = home.sections[0];
  assert.equal(hero.kind, "hero");
  assert.equal(hero.cta?.target.type, "whatsapp");
  const dep = plan.pages.flatMap((x) => x.sections).find((s) => s.kind === "depoimentos");
  assert.ok(dep, "depoimentos pendentes entram como seção");
  assert.match(dep!.body, /\[Pendente:/);
  assert.ok(ProjectSchema.safeParse(p).success, JSON.stringify(ProjectSchema.safeParse(p).error?.issues.slice(0, 3)));
});

test("objetivos diferentes geram estruturas diferentes", () => {
  const a = sampleProject();
  const b = sampleProject();
  b.briefing.goals.primary = "vendas";
  b.briefing.business.segment = "loja";
  b.briefing.features.needs.pagamento = "sim";
  const c = sampleProject();
  c.briefing.goals.primary = "leads";
  const pa = generateDemoPlan(a.briefing);
  const pb = generateDemoPlan(b.briefing);
  const pc = generateDemoPlan(c.briefing);
  assert.equal(pb.overview.siteType, "loja");
  assert.ok(pb.pages.some((p) => p.slug === "/carrinho"));
  assert.ok(pc.pages.some((p) => p.sections.some((s) => s.kind === "formulario")));
  assert.ok(pc.pages.some((p) => p.slug === "/obrigado"));
  assert.notDeepEqual(
    pa.pages.map((p) => p.slug),
    pb.pages.map((p) => p.slug),
  );
  for (const plan of [pa, pb, pc]) {
    const errors = analyzePlan(plan, a.briefing).filter((i) => i.level === "erro" && !i.id.startsWith("form-"));
    assert.deepEqual(errors, [], "planos gerados não têm CTA quebrado");
  }
});

test("menos serviços e sem busca geram página única", () => {
  const p = sampleProject();
  p.briefing.audience.trafficSources = ["instagram"];
  assert.equal(generateDemoPlan(p.briefing).overview.siteType, "landing");
});

test("briefing vazio também gera um plano válido", () => {
  const p = planned(newProject("Teste"));
  assert.ok(ProjectSchema.safeParse(p).success);
});

test("exportar e importar JSON preserva os dados e edições", () => {
  const p = planned(sampleProject());
  p.plan!.pages[0].sections[0].title = "Título editado à mão";
  p.plan!.pages[0].sections[0].edited = true;
  const back = parseExportFile(buildJsonExport(p));
  assert.ok(back.ok);
  if (back.ok) assert.deepEqual(back.project, p);
});

test("importação recusa arquivos inválidos com mensagem clara", () => {
  assert.equal(parseExportFile("{oops").ok, false);
  const r = parseExportFile(JSON.stringify({ format: "siteplan-project", schemaVersion: 99, exportedAt: "", project: {} }));
  assert.ok(!r.ok && /mais nova/.test(r.error));
  const bad = parseExportFile(JSON.stringify({ format: "siteplan-project", schemaVersion: 1, exportedAt: "", project: { schemaVersion: 1, id: "x" } }));
  assert.ok(!bad.ok && bad.details.length > 0);
});

test("materiais preservam status ao recalcular", () => {
  const p = planned(sampleProject());
  const plan = p.plan!;
  const m = plan.materials.find((x) => x.status === "pendente")!;
  m.status = "recebido";
  m.note = "Chegou por e-mail";
  plan.materials = syncMaterials(plan, p.briefing);
  const again = plan.materials.find((x) => x.key === m.key)!;
  assert.equal(again.status, "recebido");
  assert.equal(again.note, "Chegou por e-mail");
});

test("prompt e markdown usam o estado atual", () => {
  const p = planned(sampleProject());
  p.plan!.pages[0].sections[0].title = "Implantes sem faltar ao trabalho";
  const prompt = buildDevPrompt(p);
  for (let i = 1; i <= 16; i++) assert.match(prompt, new RegExp(`## ${i}\\. `));
  assert.match(prompt, /Implantes sem faltar ao trabalho/);
  assert.match(buildMarkdown(p), /Implantes sem faltar ao trabalho/);
});

test("duplicar e remover página mantêm a árvore consistente", () => {
  const p = sampleProject();
  p.briefing.goals.primary = "servicos";
  const plan = generateDemoPlan(p.briefing);
  const parent = plan.pages.find((x) => x.slug === "/servicos")!;
  const copy = duplicatePage(plan, parent.id)!;
  assert.notEqual(copy.id, parent.id);
  assert.notEqual(copy.sections[0].id, parent.sections[0].id);
  const children = plan.pages.filter((x) => x.parentId === parent.id).length;
  removePage(plan, parent.id);
  assert.equal(pageTree(plan).length, plan.pages.length);
  if (children) assert.ok(plan.pages.every((x) => x.parentId !== parent.id));
});

test("regenerar seção mantém id e destino do CTA", () => {
  const p = planned(sampleProject());
  const home = p.plan!.pages[0];
  const hero = home.sections[0];
  const next = regenerateDemoSection(p.briefing, p.plan!, home.id, hero.id, 1)!;
  assert.equal(next.id, hero.id);
  assert.deepEqual(next.cta?.target, hero.cta?.target);
  assert.notEqual(next.title, hero.title);
});

test("resposta da IA é normalizada, referências viram ids e o schema valida", async () => {
  const { normalizeAiPlan } = await import("@/lib/ai/normalize");
  const { AiPlanSchema } = await import("@/lib/ai/schema");
  const p = sampleProject();
  const cta = (t: string, page: string | null = null, sec: string | null = null) => ({ label: "Agendar", targetType: t, targetPageRef: page, targetSectionRef: sec, url: null });
  const sec = (ref: string, kind: string, c: unknown = null) => ({ ref, kind, name: kind, goal: "g", title: "t", body: "b [Pendente: fotos reais]", contentNeeded: ["Fotos da equipe"], cta: c, visual: "v", mobile: "m", afterSubmit: kind === "formulario" ? "Vai para /obrigado" : "" });
  const ai = AiPlanSchema.parse({
    siteType: "landing",
    rationale: "r",
    assumptions: [{ text: "h", kind: "hipotese" }],
    pages: [
      { ref: "home", name: "Início", slug: "/", goal: "x", parentRef: null, inMenu: true, relatedRefs: ["obg", "inexistente"], sections: [sec("h1", "hero", cta("section", "home", "f1")), sec("f1", "formulario", cta("page", "obg"))] },
      { ref: "obg", name: "Obrigado", slug: "Obrigado Página!", goal: "y", parentRef: "home", inMenu: false, relatedRefs: [], sections: [sec("c1", "confirmacao", cta("page", "fantasma"))] },
    ],
    journeys: [{ name: "j", source: "Instagram", entryPageRef: "home", steps: [{ pageRef: "home", sectionRef: "h1" }], action: "a", actionTarget: cta("whatsapp") }],
    requirements: [{ category: "essencial", title: "r", detail: "" }],
  });
  const r = normalizeAiPlan(ai, p.briefing, "modelo-teste");
  assert.ok(r.ok, !r.ok ? r.error : "");
  if (!r.ok) return;
  const [home, obg] = r.plan.pages;
  assert.equal(obg.slug, "/obrigado-pagina");
  assert.equal(obg.parentId, home.id);
  assert.deepEqual(home.relatedPageIds, [obg.id]);
  assert.equal(home.sections[0].cta?.target.sectionId, home.sections[1].id);
  assert.equal(obg.sections[0].cta?.target.type, "none", "destino inexistente vira 'sem destino'");
  assert.equal(r.plan.generation.mode, "ia");
  assert.ok(r.plan.materials.length > 0);
});
