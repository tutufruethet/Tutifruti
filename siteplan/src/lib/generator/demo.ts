import type { Assumption, Briefing, CtaTarget, Journey, Page, Plan, Requirement, Section } from "@/lib/schema";
import { labelOf, TRAFFIC_SOURCES, type SectionKind, type SiteTypeKey } from "@/lib/schema/catalog";
import { newId, noTarget, nowIso } from "@/lib/schema/factory";
import { syncMaterials } from "@/lib/plan/materials";
import { buildContext, lowerFirst, primaryCtaLabel, upperFirst, type GenContext } from "./context";
import { buildSection, type CtaIntent } from "./sections";

type Blueprint = {
  key: string;
  name: string;
  slug: string;
  goal: string;
  parent?: string;
  inMenu: boolean;
  kinds: SectionKind[];
  heroTitle?: string;
};

const ORDER: SectionKind[] = [
  "hero",
  "problema-solucao",
  "servicos",
  "produtos",
  "beneficios",
  "portfolio",
  "processo",
  "equipe",
  "autoridade",
  "comparacao",
  "precos",
  "depoimentos",
  "conteudo",
  "sobre",
  "faq",
  "formulario",
  "cta-final",
  "contato",
  "texto-legal",
  "confirmacao",
];

function ordered(kinds: SectionKind[]) {
  return ORDER.filter((k) => kinds.includes(k));
}

export function decideSiteType(ctx: GenContext): { type: SiteTypeKey; reason: string } {
  const n = ctx.offerings.length;
  const search = ctx.b.audience.trafficSources.includes("google-busca");
  const blog = ctx.has("blog");
  const goal = ctx.goal;
  let type: SiteTypeKey;
  const why: string[] = [];
  switch (goal) {
    case "whatsapp":
    case "agendamento":
    case "servicos":
      if (n >= 4 && search) {
        type = "institucional";
        why.push(
          `há ${n} ${ctx.profile.services} e a busca no Google é uma origem esperada: uma página por ${ctx.profile.service} ajuda a aparecer em buscas específicas`,
        );
      } else {
        type = "landing";
        why.push(
          n
            ? `com ${n} ${n === 1 ? ctx.profile.service : ctx.profile.services}, uma página única leva o visitante direto à ação sem desvios`
            : "uma página única concentra a decisão e a ação no mesmo lugar",
        );
      }
      break;
    case "leads":
      type = "landing";
      why.push("captação de leads funciona melhor com uma página focada em uma oferta e um formulário");
      break;
    case "inscricoes":
      type = "evento";
      why.push("inscrições pedem uma página com programa, condições e formulário, sem navegação que disperse");
      break;
    case "vendas":
      type = ctx.has("pagamento") ? "loja" : "catalogo";
      why.push(
        ctx.has("pagamento")
          ? "a venda acontece no site, então são necessários catálogo, carrinho e pagamento"
          : "sem pagamento on-line, um catálogo com pedido pelo contato resolve com muito menos complexidade",
      );
      break;
    case "portfolio":
      type = "portfolio";
      why.push("o trabalho é a principal prova; projetos precisam de páginas próprias com contexto");
      break;
    case "autoridade":
      type = "conteudo";
      why.push("autoridade se constrói com conteúdo próprio e informações verificáveis sobre quem atende");
      break;
    default:
      type = "institucional";
      why.push("sem um objetivo específico, um site institucional enxuto cobre apresentação e contato");
  }
  if (blog && (type === "landing" || type === "institucional")) {
    type = "conteudo";
    why.push("o blog foi marcado como necessário");
  }
  return { type, reason: `${upperFirst(why.join("; "))}.` };
}

function blueprints(ctx: GenContext, type: SiteTypeKey): Blueprint[] {
  const { profile, offerings, name } = ctx;
  const mat = ctx.material;
  const trustOk = (k: SectionKind) => {
    if (k === "depoimentos") return mat("depoimentos") !== "na";
    if (k === "autoridade") return mat("certificacoes") !== "na";
    if (k === "portfolio") return mat("cases") !== "na" || mat("fotos") !== "na";
    if (k === "faq") return true;
    return true;
  };
  const trust = profile.trust.filter(trustOk);
  const usesForm = ctx.channel === "form";
  const local = profile.local;
  const offerKind: SectionKind = ctx.goal === "vendas" || profile.extraPage?.kind === "produtos" ? "produtos" : "servicos";
  const pages: Blueprint[] = [];
  const conv = ctx.b.goals.conversionAction.trim().replace(/\.$/, "");
  const homeGoal = conv ? `Levar à conversão: ${lowerFirst(conv)}.` : `Levar o visitante a ${lowerFirst(ctx.goalLabel)}.`;

  if (type === "landing" || type === "evento") {
    const kinds: SectionKind[] = ["hero", "faq"];
    if (ctx.b.audience.problem.trim()) kinds.push("problema-solucao");
    if (offerings.length || mat("servicos") !== "na") kinds.push(offerKind);
    if (ctx.diffs.length) kinds.push("beneficios");
    kinds.push(...trust.filter((k) => k !== "sobre" && k !== "conteudo"));
    if (type === "evento") kinds.push("processo", "precos");
    if (ctx.goal !== "vendas") kinds.push("processo");
    if (usesForm) kinds.push("formulario");
    else kinds.push("cta-final");
    if (local) kinds.push("contato");
    pages.push({ key: "home", name: "Início", slug: "/", goal: homeGoal, inMenu: true, kinds: ordered([...new Set(kinds)]) });
  } else {
    const homeKinds: SectionKind[] = ["hero", "beneficios", "cta-final"];
    if (type === "catalogo" || type === "loja") homeKinds.push("produtos");
    else if (type === "portfolio") homeKinds.push("portfolio", "servicos", "processo");
    else homeKinds.push("servicos");
    if (trust.includes("depoimentos")) homeKinds.push("depoimentos");
    if (type === "conteudo") homeKinds.push("conteudo", "autoridade");
    if (!ctx.diffs.length) homeKinds.splice(homeKinds.indexOf("beneficios"), 1);
    pages.push({ key: "home", name: "Início", slug: "/", goal: homeGoal, inMenu: true, kinds: ordered(homeKinds) });

    if (type === "institucional" || type === "conteudo") {
      const servKinds: SectionKind[] = ["servicos", "processo", "faq", "cta-final"];
      if (trust.includes("precos") || trust.includes("comparacao")) servKinds.push(trust.includes("precos") ? "precos" : "comparacao");
      pages.push({
        key: "servicos",
        name: upperFirst(profile.services),
        slug: "/servicos",
        goal: `Ajudar o visitante a escolher o ${profile.service} certo e seguir para o contato.`,
        inMenu: true,
        kinds: ordered(servKinds),
      });
      const perService = ctx.b.audience.trafficSources.includes("google-busca") && offerings.length >= 2;
      if (perService) {
        for (const o of offerings.slice(0, 6)) {
          pages.push({
            key: `serv-${o}`,
            name: o,
            slug: `/servicos/${slugify(o)}`,
            goal: `Responder quem busca "${lowerFirst(o)}" e levar à ação principal.`,
            parent: "servicos",
            inMenu: false,
            kinds: ["hero", "processo", "faq", "cta-final"],
            heroTitle: `${o}${ctx.region ? ` em ${ctx.region}` : ""}`,
          });
        }
      }
    }
    if (type === "catalogo" || type === "loja") {
      pages.push({
        key: "produtos",
        name: profile.extraPage?.kind === "produtos" ? profile.extraPage.name : "Produtos",
        slug: profile.extraPage?.kind === "produtos" ? profile.extraPage.slug : "/produtos",
        goal: "Mostrar os produtos com preço e levar ao pedido.",
        inMenu: true,
        kinds: ["produtos", "faq"],
      });
      pages.push({
        key: "produto",
        name: "Produto (modelo)",
        slug: "/produtos/modelo-de-produto",
        goal: "Modelo de página de produto: fotos, preço, variações e ação de compra ou pedido.",
        parent: "produtos",
        inMenu: false,
        kinds: ["produtos", "faq", "cta-final"],
      });
    }
    if (type === "portfolio") {
      pages.push({ key: "portfolio", name: "Projetos", slug: "/projetos", goal: "Provar a qualidade com trabalhos reais.", inMenu: true, kinds: ["portfolio", "cta-final"] });
      pages.push({
        key: "projeto",
        name: "Projeto (modelo)",
        slug: "/projetos/modelo-de-projeto",
        goal: "Modelo de página de projeto: contexto, solução, imagens e créditos.",
        parent: "portfolio",
        inMenu: false,
        kinds: ["portfolio", "cta-final"],
      });
    }
    if (profile.extraPage && !pages.some((p) => p.slug === profile.extraPage!.slug)) {
      pages.push({ key: "extra", name: profile.extraPage.name, slug: profile.extraPage.slug, goal: profile.extraPage.goal, inMenu: true, kinds: [profile.extraPage.kind, "cta-final"] });
    }
    const aboutKinds: SectionKind[] = ["sobre"];
    if (trust.includes("equipe")) aboutKinds.push("equipe");
    if (trust.includes("autoridade") || type === "conteudo") aboutKinds.push("autoridade");
    aboutKinds.push("cta-final");
    pages.push({ key: "sobre", name: "Sobre", slug: "/sobre", goal: `Mostrar quem é ${name} e por que confiar.`, inMenu: true, kinds: ordered(aboutKinds) });
    if (type === "conteudo") {
      pages.push({ key: "blog", name: "Artigos", slug: "/artigos", goal: "Atrair visitantes pela busca e mostrar conhecimento.", inMenu: true, kinds: ["conteudo"] });
      pages.push({
        key: "artigo",
        name: "Artigo (modelo)",
        slug: "/artigos/modelo-de-artigo",
        goal: "Modelo de artigo: responder uma dúvida real e levar à ação principal.",
        parent: "blog",
        inMenu: false,
        kinds: ["conteudo", "cta-final"],
      });
    }
    const contactKinds: SectionKind[] = ["contato"];
    if (usesForm) contactKinds.push("formulario");
    pages.push({ key: "contato", name: "Contato", slug: "/contato", goal: "Facilitar o contato pelo canal preferido do visitante.", inMenu: true, kinds: ordered(contactKinds) });
    if (type === "loja") {
      pages.push({ key: "carrinho", name: "Carrinho e pagamento", slug: "/carrinho", goal: "Concluir a compra com o mínimo de etapas.", inMenu: false, kinds: ["formulario"] });
      pages.push({ key: "pedido", name: "Pedido confirmado", slug: "/pedido-confirmado", goal: "Confirmar a compra e explicar a entrega.", inMenu: false, kinds: ["confirmacao"] });
      pages.push({ key: "trocas", name: "Trocas e devoluções", slug: "/trocas-e-devolucoes", goal: "Informar direitos e prazos de troca.", inMenu: false, kinds: ["texto-legal"] });
    }
  }

  if (usesForm || type === "loja") {
    pages.push({ key: "obrigado", name: type === "evento" ? "Inscrição confirmada" : "Obrigado", slug: "/obrigado", goal: "Confirmar o envio e dizer o que acontece a seguir.", inMenu: false, kinds: ["confirmacao"] });
  }
  if (ctx.has("area-restrita")) {
    pages.push({ key: "area", name: "Área do cliente", slug: "/area-do-cliente", goal: "Acesso restrito a conteúdos ou documentos do cliente.", inMenu: false, kinds: ["formulario"] });
  }
  pages.push({
    key: "privacidade",
    name: "Política de privacidade",
    slug: "/politica-de-privacidade",
    goal: "Informar como os dados do visitante são tratados (LGPD).",
    inMenu: false,
    kinds: ["texto-legal"],
  });
  return pages;
}

export function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "pagina"
  );
}

/** Resolve a intenção "ação principal" em destino concreto. */
function primaryTarget(ctx: GenContext, pages: Page[], keyOf: Map<string, string>, currentPage: Page): CtaTarget {
  if (ctx.channel === "whatsapp") return { ...noTarget(), type: "whatsapp" };
  if (ctx.channel === "shop") {
    const id = keyOf.get("produtos");
    return id ? { ...noTarget(), type: "page", pageId: id } : noTarget();
  }
  const formHere = currentPage.sections.find((s) => s.kind === "formulario");
  if (formHere) return { ...noTarget(), type: "section", pageId: currentPage.id, sectionId: formHere.id };
  for (const key of ["contato", "home"]) {
    const page = pages.find((p) => p.id === keyOf.get(key));
    const form = page?.sections.find((s) => s.kind === "formulario");
    if (page && form) return { ...noTarget(), type: "section", pageId: page.id, sectionId: form.id };
  }
  const contato = keyOf.get("contato");
  return contato ? { ...noTarget(), type: "page", pageId: contato } : noTarget();
}

function buildJourneys(ctx: GenContext, pages: Page[], keyOf: Map<string, string>): Journey[] {
  const sources = ctx.b.audience.trafficSources.slice(0, 4);
  const home = pages.find((p) => p.id === keyOf.get("home"))!;
  const decisionKinds: SectionKind[] = ["servicos", "produtos", "beneficios", "portfolio", "depoimentos", "processo", "precos", "faq"];
  const list = sources.length ? sources : [null];
  return list.map((src) => {
    let entry = home;
    if (src === "google-busca") {
      entry = pages.find((p) => p.slug.startsWith("/servicos/")) ?? pages.find((p) => p.id === keyOf.get("servicos")) ?? home;
    } else if (src === "instagram" && (ctx.goal === "vendas" || ctx.goal === "portfolio")) {
      entry = pages.find((p) => p.id === keyOf.get(ctx.goal === "vendas" ? "produtos" : "portfolio")) ?? home;
    }
    const steps = entry.sections
      .filter((s) => decisionKinds.includes(s.kind))
      .slice(0, 3)
      .map((s) => ({ pageId: entry.id, sectionId: s.id }));
    const label = src ? labelOf(TRAFFIC_SOURCES, src) : "Visitante direto";
    return {
      id: newId("jor"),
      name: src ? `Quem chega por ${label}` : "Jornada principal",
      source: src ? label : "Origem não informada (hipótese: indicação e busca)",
      entryPageId: entry.id,
      steps,
      action: ctx.b.goals.conversionAction.trim() || primaryCtaLabel(ctx),
      actionTarget: primaryTarget(ctx, pages, keyOf, entry),
      notes: "",
    };
  });
}

function buildRequirements(ctx: GenContext, type: SiteTypeKey): Requirement[] {
  const r: Requirement[] = [];
  const add = (category: Requirement["category"], title: string, detail = "") =>
    r.push({ id: newId("req"), category, title, detail, origin: "demo" });
  const f = ctx.b.features;
  const simple = type === "landing" || type === "evento" || type === "institucional";

  add("essencial", "Layout responsivo, do celular ao desktop", "Testar em 360px, 768px e 1440px.");
  add("essencial", "Acessibilidade básica (WCAG 2.1 AA)", "Contraste, foco visível, textos alternativos e navegação por teclado.");
  add("essencial", "SEO técnico", "Título e descrição por página, URLs amigáveis, sitemap.xml, dados estruturados do negócio.");
  if (ctx.channel === "whatsapp" || f.needs.whatsapp === "sim")
    add("essencial", "Links de WhatsApp com mensagem pronta", "Usar wa.me com texto pré-preenchido por página; botão visível no celular.");
  if (ctx.channel === "form" || f.needs.formularios === "sim")
    add("essencial", "Formulário com validação e aviso de envio", "Validação no navegador e no servidor, proteção contra spam e mensagem de sucesso ou erro.");
  if (type === "loja") add("essencial", "Carrinho e pagamento on-line", "Usar plataforma ou gateway pronto; não desenvolver pagamento do zero.");
  if (type === "catalogo") add("essencial", "Catálogo com pedido pelo contato", "Cada produto com botão que abre o contato já com o nome do produto.");
  add("essencial", "Política de privacidade e aviso de cookies", "Necessários se houver formulário ou ferramenta de análise.");

  if (f.needs.agendamento === "sim") add("integracao", "Ferramenta de agendamento", "Integrar uma agenda pronta (ex.: Google Agenda, Calendly) em vez de criar uma.");
  if (f.needs.agendamento === "avaliar") add("futuro", "Agendamento on-line", "Começar pelo WhatsApp ou formulário e medir a demanda antes de integrar uma agenda.");
  if (f.needs.blog === "avaliar") add("futuro", "Blog ou artigos", "Só vale com pelo menos 2 artigos por mês; até lá, perguntas frequentes cobrem as dúvidas.");
  if (f.needs.blog === "sim") add("essencial", "Blog com edição simples", "Quem vai publicar precisa editar sem mexer em código.");
  if (f.needs.catalogo === "avaliar") add("futuro", "Catálogo de produtos");
  if (f.needs.pagamento === "avaliar") add("futuro", "Pagamento on-line", "Validar volume de vendas antes de integrar um gateway.");
  if (f.needs["area-restrita"] !== "nao" && f.needs["area-restrita"] !== undefined)
    add("validacao", "Área restrita", "Exige login, banco de dados e manutenção contínua; confirmar se é indispensável no lançamento.");
  for (const i of f.integrations.split(/,|\n/).map((s) => s.trim()).filter(Boolean)) add("integracao", i);
  if (!f.integrations.trim()) add("integracao", "Ferramenta de análise de visitas", "Ex.: Google Analytics 4 ou alternativa sem cookies; medir cliques no botão principal.");

  add(
    "manutencao",
    simple ? "Site estático com edição simples" : "Plataforma com painel de edição",
    simple
      ? "Não precisa de banco de dados nem servidor próprio; hospedagem estática com HTTPS e domínio próprio."
      : "Escolher uma plataforma que o cliente consiga atualizar sem depender de desenvolvedor.",
  );
  add("manutencao", "Responsável pelas atualizações", "Definir quem atualiza textos, preços e horários, e com que frequência.");
  if (f.hosting.trim()) add("manutencao", "Restrições informadas", f.hosting.trim());
  if (f.languages.trim() && !/^portugu[eê]s/i.test(f.languages.trim())) add("validacao", "Versões em outros idiomas", `Idiomas pedidos: ${f.languages}. Confirmar quem traduz e mantém.`);
  if (ctx.profile.compliance) add("validacao", "Regras de publicidade do setor", ctx.profile.compliance);
  if (f.deadline.trim()) add("validacao", "Prazo", `Prazo informado: ${f.deadline}. Confirmar se os materiais pendentes chegam a tempo.`);
  if (f.budget.trim()) add("validacao", "Orçamento", `Faixa informada: ${f.budget}. Conferir se o escopo cabe.`);
  if (f.technology.trim()) add("validacao", "Tecnologia preferida", `${f.technology}. Confirmar se atende às funcionalidades essenciais.`);
  return r;
}

function buildAssumptions(ctx: GenContext, type: SiteTypeKey): Assumption[] {
  const a: Assumption[] = [];
  const add = (kind: Assumption["kind"], text: string) => a.push({ id: newId("hip"), kind, text, status: "aberta" });
  add("sugestao", `Tipo de site: ${type === "landing" ? "página única" : "site com várias páginas"}, decidido a partir do objetivo e das origens de tráfego.`);
  if (ctx.objectionsAreHypotheses)
    add("hipotese", `Dúvidas típicas do segmento usadas nas perguntas frequentes: ${ctx.objections.join(" ")} Confirmar com o cliente.`);
  if (!ctx.b.audience.trafficSources.length) add("hipotese", "Origem do tráfego não informada: jornada principal considera visitante direto.");
  if (ctx.profile.local && !ctx.region) add("hipotese", "O negócio parece depender da região, mas ela não foi informada.");
  if (ctx.channel === "whatsapp" && !ctx.b.content.contact.whatsapp.trim()) add("hipotese", "A conversão é pelo WhatsApp, mas o número ainda não foi informado.");
  if (!ctx.b.goals.offer.trim()) add("hipotese", "Nenhuma oferta definida: os botões usam a ação principal sem promessa específica.");
  if (ctx.b.visual.references.some((r) => r.url)) add("sugestao", "As URLs de referência foram registradas como informadas pelo usuário; não foram acessadas nem analisadas.");
  return a;
}

/** Gera o planejamento completo em modo demonstração (regras e modelos por segmento, sem IA). */
export function generateDemoPlan(briefing: Briefing): Plan {
  const ctx = buildContext(briefing);
  const { type, reason } = decideSiteType(ctx);
  const bps = blueprints(ctx, type);
  const keyOf = new Map<string, string>();
  const intents = new Map<string, CtaIntent>();
  const pages: Page[] = bps.map((bp) => {
    const id = newId("pag");
    keyOf.set(bp.key, id);
    const sections: Section[] = bp.kinds.map((k) => {
      const { section, intent } = buildSection(k, ctx, 0, { pageKey: bp.key });
      if (k === "hero" && bp.heroTitle) section.title = bp.heroTitle;
      intents.set(section.id, intent);
      return section;
    });
    return { id, name: bp.name, slug: bp.slug, goal: bp.goal, parentId: null, inMenu: bp.inMenu, relatedPageIds: [], sections, origin: "demo", edited: false };
  });
  bps.forEach((bp, i) => {
    if (bp.parent) pages[i].parentId = keyOf.get(bp.parent) ?? null;
  });
  wireCtas(ctx, pages, keyOf, intents);

  const plan: Plan = {
    generation: { mode: "demo", model: null, generatedAt: nowIso() },
    overview: { siteType: type, rationale: reason, assumptions: buildAssumptions(ctx, type) },
    pages,
    journeys: buildJourneys(ctx, pages, keyOf),
    materials: [],
    requirements: buildRequirements(ctx, type),
  };
  plan.materials = syncMaterials(plan, briefing);
  return plan;
}

function wireCtas(ctx: GenContext, pages: Page[], keyOf: Map<string, string>, intents: Map<string, CtaIntent>) {
  const label = primaryCtaLabel(ctx);
  const thanks = keyOf.get("obrigado");
  for (const page of pages) {
    for (const s of page.sections) {
      if (s.kind === "formulario") {
        s.cta = { label: s.cta?.label || "Enviar", target: thanks ? { ...noTarget(), type: "page", pageId: thanks } : noTarget() };
        s.afterSubmit = thanks
          ? "Redirecionar para a página Obrigado, avisar a equipe por e-mail e registrar o contato. [Pendente: e-mail que recebe os contatos e prazo de resposta]"
          : "[Pendente: definir o que acontece depois do envio]";
        continue;
      }
      const intent = intents.get(s.id);
      if (!intent) continue;
      if (intent.kind === "primary") {
        const target = primaryTarget(ctx, pages, keyOf, page);
        // Não apontar um botão para a própria seção de formulário em que ele já está.
        s.cta = { label, target };
      } else {
        const id = keyOf.get(intent.pageKey);
        if (id && id !== page.id) s.cta = { label: intent.label, target: { ...noTarget(), type: "page", pageId: id } };
        else if (!id && s.kind === "servicos") s.cta = { label, target: primaryTarget(ctx, pages, keyOf, page) };
      }
    }
    const linked = new Set<string>();
    for (const s of page.sections) if (s.cta?.target.pageId && s.cta.target.pageId !== page.id) linked.add(s.cta.target.pageId);
    if (page.parentId) linked.add(page.parentId);
    page.relatedPageIds = [...linked];
  }
}

/** Nova sugestão para uma seção isolada, mantendo o id. Usada na prévia de regeneração. */
export function regenerateDemoSection(briefing: Briefing, plan: Plan, pageId: string, sectionId: string, variant: number): Section | null {
  const page = plan.pages.find((p) => p.id === pageId);
  const current = page?.sections.find((s) => s.id === sectionId);
  if (!page || !current) return null;
  const ctx = buildContext(briefing);
  const { section, intent } = buildSection(current.kind, ctx, variant);
  const next: Section = { ...section, id: current.id, name: current.name || section.name };
  // O destino do CTA é uma decisão de estrutura: mantém o atual, só sugere o rótulo.
  if (current.cta) next.cta = { label: intent ? (intent.kind === "primary" ? primaryCtaLabel(ctx) : intent.label) : current.cta.label, target: current.cta.target };
  if (current.kind === "formulario") next.afterSubmit = current.afterSubmit;
  return next;
}
