import { CONTENT_KEYS, FEATURE_KEYS } from "./catalog";
import type { SegmentKey } from "./segments";
import { SCHEMA_VERSION, type Briefing, type CtaTarget, type Project } from "./index";

/** Identificador estável, curto e seguro para URL. */
export function newId(prefix = "id"): string {
  const bytes = new Uint8Array(9);
  globalThis.crypto.getRandomValues(bytes);
  const rand = Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
  return `${prefix}_${rand}`;
}

export const nowIso = () => new Date().toISOString();

export function emptyBriefing(): Project["briefing"] {
  return {
    business: {
      companyName: "",
      segment: "outro",
      segmentOther: "",
      description: "",
      offerings: "",
      region: "",
      differentiators: "",
      stage: null,
    },
    audience: { idealClient: "", problem: "", objections: "", decisionFactors: "", trafficSources: [], trafficOther: "" },
    goals: { primary: null, secondary: [], other: "", conversionAction: "", offer: "" },
    content: {
      items: Object.fromEntries(CONTENT_KEYS.map((k) => [k, { status: "pendente", note: "" }])) as Briefing["content"]["items"],
      contact: { whatsapp: "", phone: "", email: "", address: "", hours: "" },
    },
    visual: { style: null, styleNotes: "", colors: "", references: [], theme: "claro", motion: "sutil", avoid: "" },
    features: {
      needs: Object.fromEntries(FEATURE_KEYS.map((k) => [k, "avaliar"])) as Briefing["features"]["needs"],
      integrations: "",
      languages: "Português (Brasil)",
      deadline: "",
      budget: "",
      technology: "",
      hosting: "",
    },
  };
}

export function newProject(name: string, segment: SegmentKey = "outro", segmentOther = ""): Project {
  const t = nowIso();
  const briefing = emptyBriefing();
  briefing.business.companyName = name.trim();
  briefing.business.segment = segment;
  briefing.business.segmentOther = segmentOther;
  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId("prj"),
    name: name.trim() || "Projeto sem nome",
    status: "briefing",
    createdAt: t,
    updatedAt: t,
    planUpdatedAt: null,
    briefingStep: 0,
    briefing,
    plan: null,
    devPrompt: null,
  };
}

export const noTarget = (): CtaTarget => ({ type: "none", pageId: null, sectionId: null, url: "" });

/** Projeto de exemplo do enunciado: clínica odontológica com agendamento pelo WhatsApp. */
export function sampleProject(): Project {
  const p = newProject("Clínica Sorriso Pinheiros", "odontologia");
  const b = p.briefing;
  b.business = {
    companyName: "Clínica Sorriso Pinheiros",
    segment: "odontologia",
    segmentOther: "",
    description:
      "Clínica odontológica com três dentistas, atendimento particular e por alguns convênios. Foco em implantes, clareamento e ortodontia com alinhadores.",
    offerings: "Implantes dentários\nClareamento dental\nAlinhadores invisíveis\nAvaliação e limpeza",
    region: "Pinheiros, São Paulo (SP)",
    differentiators:
      "Atendimento até as 21h em dias úteis\nTomografia feita na própria clínica\nPlano de tratamento entregue por escrito com valores",
    stage: "estabelecido",
  };
  b.audience = {
    idealClient: "Adultos de 30 a 55 anos que trabalham na região e querem tratar sem faltar ao trabalho.",
    problem: "Adiam o tratamento por falta de horário e medo de gastar mais do que o previsto.",
    objections: "Quanto custa um implante?\nAtende meu convênio?\nDói?\nQuanto tempo dura o tratamento?",
    decisionFactors: "Horário, transparência de preço, proximidade do trabalho e avaliações no Google.",
    trafficSources: ["instagram", "google-maps", "google-busca"],
    trafficOther: "",
  };
  b.goals = {
    primary: "whatsapp",
    secondary: ["agendamento", "autoridade"],
    other: "",
    conversionAction: "Visitante inicia conversa no WhatsApp pedindo uma avaliação.",
    offer: "Avaliação com plano de tratamento por escrito",
  };
  b.content.items.servicos = { status: "disponivel", note: "" };
  b.content.items.fotos = { status: "pendente", note: "Fotos do espaço e da equipe ainda não foram feitas." };
  b.content.items.videos = { status: "na", note: "" };
  b.content.items.identidade = { status: "disponivel", note: "Logo em vetor e cores definidas." };
  b.content.items.depoimentos = { status: "pendente", note: "Pedir autorização a pacientes." };
  b.content.items.cases = { status: "na", note: "" };
  b.content.items.certificacoes = { status: "disponivel", note: "CRO de cada dentista." };
  b.content.items.faq = { status: "pendente", note: "" };
  b.content.items.contato = { status: "disponivel", note: "" };
  b.content.contact = {
    whatsapp: "(11) 90000-0000",
    phone: "",
    email: "contato@exemplo.com.br",
    address: "Rua dos Pinheiros, 000 — Pinheiros, São Paulo",
    hours: "Seg. a sex., 8h às 21h; sáb., 8h às 13h",
  };
  b.visual = {
    style: "acolhedor",
    styleNotes: "Nada de imagens de banco com sorrisos perfeitos.",
    colors: "Verde-água #2a9d8f e branco; evitar azul hospitalar.",
    references: [{ id: newId("ref"), url: "https://example.com", note: "Gosto da clareza da tabela de preços." }],
    theme: "claro",
    motion: "sutil",
    avoid: "Fotos de banco de imagem, carrossel automático, pop-up ao entrar.",
  };
  b.features = {
    needs: {
      formularios: "nao",
      whatsapp: "sim",
      agendamento: "avaliar",
      blog: "avaliar",
      catalogo: "nao",
      pagamento: "nao",
      "area-restrita": "nao",
    },
    integrations: "Google Meu Negócio, Google Analytics",
    languages: "Português (Brasil)",
    deadline: "4 semanas",
    budget: "",
    technology: "",
    hosting: "A clínica não tem equipe técnica; edições de texto devem ser simples.",
  };
  return p;
}
