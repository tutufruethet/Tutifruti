import type { Section } from "@/lib/schema";
import { sectionKindLabel, SECTION_KINDS, type SectionKind } from "@/lib/schema/catalog";
import { newId, noTarget } from "@/lib/schema/factory";
import { firstSentence, listPt, lowerFirst, pending, primaryCtaLabel, upperFirst, type GenContext } from "./context";
import { KIND_SPECS } from "./kinds";

/** Intenção do CTA, resolvida em destino real depois que as páginas existem. */
export type CtaIntent = { kind: "primary" } | { kind: "page"; pageKey: string; label: string } | null;

export type DraftSection = { section: Section; intent: CtaIntent };

const purposeOf = (k: SectionKind) => SECTION_KINDS.find((s) => s.key === k)?.purpose ?? "";

/** Seção vazia vinda da biblioteca: estrutura e orientações, sem texto inventado. */
export function librarySection(kind: SectionKind): Section {
  const spec = KIND_SPECS[kind];
  return {
    id: newId("sec"),
    kind,
    name: sectionKindLabel(kind),
    goal: purposeOf(kind),
    title: "",
    body: "",
    contentNeeded: [...spec.content],
    cta: null,
    visual: spec.visual,
    mobile: spec.mobile,
    afterSubmit: "",
    origin: "biblioteca",
    edited: false,
  };
}

/**
 * Monta uma seção com texto sugerido a partir do briefing.
 * `variant` muda o ângulo do texto nas regenerações do modo demonstração.
 */
export function buildSection(kind: SectionKind, ctx: GenContext, variant = 0, opts: { pageKey?: string } = {}): DraftSection {
  const s = librarySection(kind);
  s.origin = "demo";
  const { profile, name, offerings, diffs, region, offer } = ctx;
  const where = region ? ` em ${region}` : "";
  let intent: CtaIntent = null;
  const v = variant % 3;

  switch (kind) {
    case "hero": {
      const offers = offerings.slice(0, 3).map(lowerFirst);
      const titles = [
        offers.length ? `${upperFirst(listPt(offers))}${where}` : `${ctx.segment}${where}`,
        offer ? `${upperFirst(offer)}${where}` : offers.length ? `${upperFirst(offers[0])} com ${name}` : `${name}${where}`,
        diffs[0] ? `${upperFirst(offers[0] ?? ctx.segment)}: ${lowerFirst(diffs[0])}` : `${upperFirst(offers[0] ?? ctx.segment)}${where}`,
      ];
      s.title = titles[v];
      const support = [offer && v !== 1 ? `${upperFirst(offer)}.` : "", diffs[v === 2 ? 1 : 0] ? `${upperFirst(diffs[v === 2 ? 1 : 0])}.` : ""]
        .filter(Boolean)
        .join(" ");
      s.body = support || pending("uma frase com para quem é o serviço e o principal diferencial verificável");
      s.goal = `Mostrar em poucos segundos o que ${name} oferece${where} e levar a ${lowerFirst(ctx.goalLabel)}.`;
      intent = { kind: "primary" };
      break;
    }
    case "problema-solucao": {
      const problem = ctx.b.audience.problem.trim();
      s.title = problem ? upperFirst(firstSentence(problem)).replace(/\.$/, "") : pending("o problema do cliente nas palavras dele");
      s.body = diffs.length
        ? `Como ${name} resolve: ${listPt(diffs.slice(0, 3).map(lowerFirst))}.`
        : pending("como o negócio resolve esse problema, com fatos");
      break;
    }
    case "servicos": {
      s.name = upperFirst(profile.services);
      s.title = v === 1 ? `O que ${name} faz` : upperFirst(profile.services);
      s.body = offerings.length
        ? offerings.map((o) => `• ${o} — ${pending("uma frase sobre o resultado para o " + profile.client)}`).join("\n")
        : pending(`lista de ${profile.services} com uma frase cada`);
      intent = opts.pageKey === "home" ? { kind: "page", pageKey: "servicos", label: `Ver ${profile.services}` } : { kind: "primary" };
      break;
    }
    case "produtos": {
      s.name = ctx.b.business.segment === "restaurante" ? "Cardápio" : "Produtos";
      s.title = s.name;
      s.body = offerings.length
        ? `Destaques: ${listPt(offerings.slice(0, 6))}. ${pending("preço e variações de cada item")}`
        : pending("lista de produtos com preço");
      intent = { kind: "primary" };
      break;
    }
    case "beneficios": {
      s.name = "Diferenciais";
      s.title = v === 1 ? `O que muda ao escolher ${name}` : `Diferenciais de ${name}`;
      s.body = diffs.length
        ? diffs.map((d) => `• ${upperFirst(d)}`).join("\n")
        : pending("3 diferenciais verificáveis (horário, garantia, estrutura, prazo)");
      break;
    }
    case "processo": {
      const first =
        ctx.channel === "whatsapp"
          ? "Você chama no WhatsApp e conta o que precisa."
          : ctx.channel === "shop"
            ? "Você escolhe o produto e finaliza a compra no site."
            : "Você preenche o formulário com o que precisa.";
      s.title = "Como funciona";
      s.body = [
        `1. ${first}`,
        `2. A equipe responde e combina dia e horário. ${pending("prazo de resposta")}`,
        `3. ${pending(`o que acontece na primeira etapa (${profile.visit})`)}`,
        `4. ${pending("próxima etapa e prazo")}`,
      ].join("\n");
      break;
    }
    case "portfolio": {
      s.title = v === 1 ? "Trabalhos recentes" : "Projetos realizados";
      s.body =
        ctx.material("cases") === "disponivel" || ctx.material("fotos") === "disponivel"
          ? `Selecionar de 6 a 9 trabalhos reais com título, contexto e ${profile.proof}.`
          : pending(profile.proof);
      intent = opts.pageKey === "home" ? { kind: "page", pageKey: "portfolio", label: "Ver todos os projetos" } : null;
      break;
    }
    case "depoimentos": {
      s.title = `Depoimentos de ${profile.clients}`;
      s.body =
        ctx.material("depoimentos") === "disponivel"
          ? "Usar os depoimentos reais fornecidos pelo cliente, com nome, contexto e autorização."
          : pending(`depoimentos reais de ${profile.clients}, com autorização — não usar textos inventados`);
      break;
    }
    case "equipe": {
      s.title = "Quem atende";
      s.body = pending("nome, formação e registro profissional de cada pessoa");
      break;
    }
    case "autoridade": {
      s.title = "Registros e certificações";
      const note = ctx.b.content.items.certificacoes?.note.trim();
      s.body = note ? `${upperFirst(note)} ${pending("números de registro e documentos")}` : pending("registros, certificações e onde verificar");
      break;
    }
    case "comparacao": {
      s.title = "Compare as opções";
      s.body = pending("opções a comparar e critérios que o cliente usa para decidir");
      break;
    }
    case "precos": {
      s.title = "Valores";
      s.body = pending("valores ou faixas e o que está incluso; se o cliente não quiser publicar, explicar como o valor é definido");
      intent = { kind: "primary" };
      break;
    }
    case "faq": {
      s.title = "Perguntas frequentes";
      s.body = ctx.objections
        .map((q) => `${q.endsWith("?") ? q : `${q}?`}${ctx.objectionsAreHypotheses ? " (hipótese)" : ""}\n  ${pending("resposta")}`)
        .join("\n");
      break;
    }
    case "conteudo": {
      s.title = "Artigos";
      s.body = pending("3 a 5 pautas que respondem dúvidas reais dos clientes");
      intent = { kind: "page", pageKey: "blog", label: "Ver todos os artigos" };
      break;
    }
    case "sobre": {
      s.title = `Sobre ${name}`;
      s.body = ctx.b.business.description.trim() || pending("história, quem atende e o que guia o trabalho");
      break;
    }
    case "formulario": {
      const titles: Record<string, string> = {
        leads: offer ? `Receba ${lowerFirst(offer)}` : "Receba o contato da equipe",
        agendamento: `Agende ${lowerFirst(profile.visit)}`,
        inscricoes: "Faça sua inscrição",
      };
      s.title = titles[ctx.goal ?? ""] ?? "Fale com a equipe";
      s.body = `Campos: nome, WhatsApp ou e-mail e ${pending("um campo específico, se for indispensável")}. Pedir só o necessário para o próximo passo.`;
      s.cta = { label: ctx.goal === "inscricoes" ? "Enviar inscrição" : "Enviar", target: noTarget() };
      s.afterSubmit = "";
      break;
    }
    case "contato": {
      const c = ctx.b.content.contact;
      s.title = profile.local ? "Contato e endereço" : "Contato";
      s.body = [
        `WhatsApp: ${c.whatsapp || pending("número")}`,
        c.phone ? `Telefone: ${c.phone}` : "",
        `E-mail: ${c.email || pending("e-mail")}`,
        profile.local ? `Endereço: ${c.address || pending("endereço")}` : "",
        `Horários: ${c.hours || pending("horários de atendimento")}`,
      ]
        .filter(Boolean)
        .join("\n");
      intent = { kind: "primary" };
      break;
    }
    case "cta-final": {
      s.title = offer ? upperFirst(offer) : `${primaryCtaLabel(ctx)}`;
      s.body = v === 1 && diffs[1] ? `${upperFirst(diffs[1])}.` : diffs[0] ? `${upperFirst(diffs[0])}.` : pending("uma frase que reduza o risco de dar o próximo passo");
      intent = { kind: "primary" };
      break;
    }
    case "texto-legal": {
      s.title = "Política de privacidade";
      s.body = `Quais dados o site coleta, para quê, por quanto tempo e como pedir a exclusão (LGPD). ${pending("texto revisado por responsável jurídico")}`;
      break;
    }
    case "confirmacao": {
      s.title = ctx.goal === "inscricoes" ? "Inscrição recebida" : "Recebemos seu contato";
      s.body = `Diga o que acontece agora e em quanto tempo. ${pending("prazo de resposta")}`;
      intent = { kind: "page", pageKey: "home", label: "Voltar ao início" };
      break;
    }
  }
  return { section: s, intent };
}
