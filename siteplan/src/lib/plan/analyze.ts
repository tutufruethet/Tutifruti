import type { Briefing, CtaTarget, Plan } from "@/lib/schema";

export type Issue = {
  id: string;
  level: "erro" | "aviso";
  message: string;
  pageId?: string;
  sectionId?: string;
  journeyId?: string;
};

/** Diz se um destino de CTA aponta para algo que existe. */
export function targetProblem(target: CtaTarget, plan: Plan): string | null {
  switch (target.type) {
    case "none":
      return "sem destino";
    case "page":
      return plan.pages.some((p) => p.id === target.pageId) ? null : "aponta para uma página que não existe mais";
    case "section": {
      const page = plan.pages.find((p) => p.id === target.pageId);
      if (!page) return "aponta para uma página que não existe mais";
      return page.sections.some((s) => s.id === target.sectionId) ? null : "aponta para uma seção que não existe mais";
    }
    case "external":
      return /^https?:\/\/\S+$/.test(target.url) ? null : "link externo sem endereço válido";
    default:
      return null;
  }
}

export function describeTarget(target: CtaTarget, plan: Plan): string {
  switch (target.type) {
    case "none":
      return "Sem destino";
    case "page": {
      const p = plan.pages.find((x) => x.id === target.pageId);
      return p ? `${p.name} (${p.slug})` : "Página removida";
    }
    case "section": {
      const p = plan.pages.find((x) => x.id === target.pageId);
      const s = p?.sections.find((x) => x.id === target.sectionId);
      return p && s ? `${p.name} › ${s.name}` : "Seção removida";
    }
    case "whatsapp":
      return "WhatsApp";
    case "phone":
      return "Telefone";
    case "email":
      return "E-mail";
    case "external":
      return target.url || "Link externo sem endereço";
  }
}

/** Problemas de estrutura e conversão que o usuário precisa resolver. */
export function analyzePlan(plan: Plan, briefing: Briefing): Issue[] {
  const issues: Issue[] = [];
  const targeted = new Set<string>();
  const usesWhatsapp = { value: false };

  for (const page of plan.pages) {
    if (!page.goal.trim()) issues.push({ id: `goal-${page.id}`, level: "aviso", message: `A página "${page.name}" não tem objetivo.`, pageId: page.id });
    if (!page.sections.length)
      issues.push({ id: `empty-${page.id}`, level: "aviso", message: `A página "${page.name}" não tem seções.`, pageId: page.id });
    for (const s of page.sections) {
      if (s.cta) {
        if (s.cta.target.pageId) targeted.add(s.cta.target.pageId);
        if (s.cta.target.type === "whatsapp") usesWhatsapp.value = true;
        const p = targetProblem(s.cta.target, plan);
        if (p)
          issues.push({
            id: `cta-${s.id}`,
            level: "erro",
            message: `O botão "${s.cta.label || "sem rótulo"}" em ${page.name} › ${s.name} está ${p}.`,
            pageId: page.id,
            sectionId: s.id,
          });
        else if (!s.cta.label.trim())
          issues.push({ id: `ctal-${s.id}`, level: "aviso", message: `O botão em ${page.name} › ${s.name} não tem rótulo.`, pageId: page.id, sectionId: s.id });
      }
      if (s.kind === "formulario" && (!s.afterSubmit.trim() || /^\[Pendente: definir o que acontece/.test(s.afterSubmit)))
        issues.push({
          id: `form-${s.id}`,
          level: "erro",
          message: `O formulário em ${page.name} não define o que acontece depois do envio.`,
          pageId: page.id,
          sectionId: s.id,
        });
    }
  }

  for (const j of plan.journeys) {
    if (j.actionTarget.pageId) targeted.add(j.actionTarget.pageId);
    if (j.actionTarget.type === "whatsapp") usesWhatsapp.value = true;
    if (!j.entryPageId || !plan.pages.some((p) => p.id === j.entryPageId))
      issues.push({ id: `jentry-${j.id}`, level: "erro", message: `A jornada "${j.name}" não tem página de entrada válida.`, journeyId: j.id });
    const p = targetProblem(j.actionTarget, plan);
    if (p) issues.push({ id: `jact-${j.id}`, level: "erro", message: `A ação da jornada "${j.name}" está ${p}.`, journeyId: j.id });
    if (j.steps.some((st) => !plan.pages.some((pg) => pg.id === st.pageId && (!st.sectionId || pg.sections.some((s) => s.id === st.sectionId)))))
      issues.push({ id: `jstep-${j.id}`, level: "aviso", message: `A jornada "${j.name}" tem etapas que apontam para conteúdo removido.`, journeyId: j.id });
  }

  // Página que ninguém alcança: fora do menu, sem link e sem página-mãe.
  for (const page of plan.pages) {
    const legal = page.slug.startsWith("/politica") || page.slug.startsWith("/trocas") || page.slug === "/obrigado";
    if (page.slug === "/" || page.inMenu || page.parentId || legal) continue;
    if (!targeted.has(page.id) && !plan.journeys.some((j) => j.entryPageId === page.id))
      issues.push({ id: `orphan-${page.id}`, level: "aviso", message: `Nenhum menu, botão ou jornada leva à página "${page.name}".`, pageId: page.id });
  }

  if (usesWhatsapp.value && !briefing.content.contact.whatsapp.trim())
    issues.push({ id: "wa-number", level: "aviso", message: "Há botões de WhatsApp, mas o número não foi informado no briefing." });

  const primary = briefing.goals.primary;
  if (primary === "whatsapp" && !usesWhatsapp.value)
    issues.push({ id: "goal-wa", level: "aviso", message: "O objetivo principal é o WhatsApp, mas nenhum botão leva até ele." });
  if ((primary === "leads" || primary === "inscricoes") && !plan.pages.some((p) => p.sections.some((s) => s.kind === "formulario")))
    issues.push({ id: "goal-form", level: "aviso", message: "O objetivo pede um formulário, mas nenhuma página tem um." });
  return issues;
}

/** Quantidade de marcações [Pendente: …] no planejamento. */
export function countPendingMarks(plan: Plan) {
  let n = 0;
  for (const p of plan.pages) for (const s of p.sections) n += (`${s.title}\n${s.body}`.match(/\[Pendente:/g) ?? []).length;
  return n;
}
