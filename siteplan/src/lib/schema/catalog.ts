// Listas fechadas usadas no briefing e no planejamento.
// Ficam fora do schema para que a interface, o gerador e a IA usem os mesmos rótulos.

export const GOALS = [
  { key: "whatsapp", label: "Receber contatos pelo WhatsApp" },
  { key: "leads", label: "Captar leads" },
  { key: "agendamento", label: "Agendar atendimentos" },
  { key: "vendas", label: "Vender produtos" },
  { key: "servicos", label: "Apresentar serviços" },
  { key: "autoridade", label: "Construir autoridade" },
  { key: "portfolio", label: "Mostrar portfólio" },
  { key: "inscricoes", label: "Receber inscrições" },
  { key: "outro", label: "Outro objetivo" },
] as const;
export type GoalKey = (typeof GOALS)[number]["key"];
export const GOAL_KEYS = GOALS.map((g) => g.key) as [GoalKey, ...GoalKey[]];

export const STAGES = [
  { key: "ideia", label: "Ainda não abriu" },
  { key: "novo", label: "Recém-aberto (menos de 1 ano)" },
  { key: "estabelecido", label: "Estabelecido" },
  { key: "expansao", label: "Em expansão ou mudança de posicionamento" },
] as const;
export type StageKey = (typeof STAGES)[number]["key"];
export const STAGE_KEYS = STAGES.map((s) => s.key) as [StageKey, ...StageKey[]];

export const TRAFFIC_SOURCES = [
  { key: "instagram", label: "Instagram" },
  { key: "google-busca", label: "Busca no Google" },
  { key: "google-maps", label: "Google Maps / Perfil da empresa" },
  { key: "anuncios", label: "Anúncios pagos" },
  { key: "indicacao", label: "Indicação (boca a boca)" },
  { key: "whatsapp", label: "Links compartilhados no WhatsApp" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "email", label: "E-mail / newsletter" },
  { key: "eventos", label: "Eventos e material impresso" },
] as const;
export type TrafficKey = (typeof TRAFFIC_SOURCES)[number]["key"];
export const TRAFFIC_KEYS = TRAFFIC_SOURCES.map((t) => t.key) as [TrafficKey, ...TrafficKey[]];

export const CONTENT_ITEMS = [
  { key: "servicos", label: "Informações dos serviços ou produtos", hint: "Descrições, preços, condições." },
  { key: "fotos", label: "Fotos", hint: "Do espaço, da equipe, dos produtos ou do trabalho." },
  { key: "videos", label: "Vídeos" },
  { key: "identidade", label: "Identidade visual", hint: "Logo, cores e fontes da marca." },
  { key: "depoimentos", label: "Depoimentos reais", hint: "De clientes, com autorização para publicar." },
  { key: "cases", label: "Cases reais", hint: "Projetos com contexto e resultado verificável." },
  { key: "certificacoes", label: "Certificações e registros", hint: "Ex.: CRO, OAB, CRM, selos, prêmios." },
  { key: "faq", label: "Perguntas frequentes" },
  { key: "contato", label: "Informações de contato", hint: "WhatsApp, telefone, e-mail, endereço, horários." },
] as const;
export type ContentKey = (typeof CONTENT_ITEMS)[number]["key"];
export const CONTENT_KEYS = CONTENT_ITEMS.map((c) => c.key) as [ContentKey, ...ContentKey[]];

export const MATERIAL_AVAILABILITY = [
  { key: "disponivel", label: "Disponível" },
  { key: "pendente", label: "Pendente" },
  { key: "na", label: "Não se aplica" },
] as const;
export type AvailabilityKey = (typeof MATERIAL_AVAILABILITY)[number]["key"];

export const VISUAL_STYLES = [
  { key: "sobrio", label: "Sóbrio e confiável" },
  { key: "acolhedor", label: "Acolhedor e próximo" },
  { key: "sofisticado", label: "Sofisticado" },
  { key: "tecnico", label: "Técnico e preciso" },
  { key: "vibrante", label: "Vibrante e jovem" },
  { key: "editorial", label: "Editorial" },
  { key: "minimalista", label: "Minimalista" },
] as const;
export type StyleKey = (typeof VISUAL_STYLES)[number]["key"];
export const STYLE_KEYS = VISUAL_STYLES.map((s) => s.key) as [StyleKey, ...StyleKey[]];

export const THEMES = [
  { key: "claro", label: "Claro" },
  { key: "escuro", label: "Escuro" },
  { key: "indiferente", label: "Sem preferência" },
] as const;
export type ThemeKey = (typeof THEMES)[number]["key"];

export const MOTION_LEVELS = [
  { key: "nenhuma", label: "Nenhuma", hint: "Só mudanças de estado (hover, foco)." },
  { key: "sutil", label: "Sutil", hint: "Entradas curtas e transições discretas." },
  { key: "moderada", label: "Moderada", hint: "Algumas entradas coordenadas e detalhes ao rolar." },
  { key: "expressiva", label: "Expressiva", hint: "Movimento como parte da marca." },
] as const;
export type MotionKey = (typeof MOTION_LEVELS)[number]["key"];

export const FEATURES = [
  { key: "formularios", label: "Formulários" },
  { key: "whatsapp", label: "Botão ou link de WhatsApp" },
  { key: "agendamento", label: "Agendamento on-line" },
  { key: "blog", label: "Blog ou artigos" },
  { key: "catalogo", label: "Catálogo de produtos" },
  { key: "pagamento", label: "Pagamento on-line" },
  { key: "area-restrita", label: "Área restrita (login)" },
] as const;
export type FeatureKey = (typeof FEATURES)[number]["key"];
export const FEATURE_KEYS = FEATURES.map((f) => f.key) as [FeatureKey, ...FeatureKey[]];

export const FEATURE_NEED = [
  { key: "sim", label: "Sim" },
  { key: "avaliar", label: "Avaliar" },
  { key: "nao", label: "Não" },
] as const;
export type FeatureNeed = (typeof FEATURE_NEED)[number]["key"];

export const SECTION_KINDS = [
  { key: "hero", label: "Apresentação principal", purpose: "Diz em segundos o que é oferecido, para quem e qual o próximo passo." },
  { key: "problema-solucao", label: "Problema e solução", purpose: "Mostra que o negócio entende a situação do visitante antes de oferecer algo." },
  { key: "servicos", label: "Serviços", purpose: "Lista o que é oferecido de forma comparável e leva ao detalhe ou ao contato." },
  { key: "produtos", label: "Produtos", purpose: "Mostra os produtos com preço, variação e ação de compra ou pedido." },
  { key: "beneficios", label: "Benefícios e diferenciais", purpose: "Explica por que escolher este negócio, com fatos verificáveis." },
  { key: "processo", label: "Processo", purpose: "Mostra as etapas do primeiro contato até a entrega e reduz a incerteza." },
  { key: "portfolio", label: "Portfólio", purpose: "Prova a qualidade com trabalhos reais." },
  { key: "depoimentos", label: "Depoimentos", purpose: "Traz a voz de clientes reais para reduzir o risco percebido." },
  { key: "equipe", label: "Equipe", purpose: "Mostra quem atende e suas credenciais." },
  { key: "autoridade", label: "Credenciais e autoridade", purpose: "Reúne registros, certificações, publicações e números verificáveis." },
  { key: "comparacao", label: "Comparação", purpose: "Ajuda a escolher entre opções, planos ou alternativas." },
  { key: "precos", label: "Preços e planos", purpose: "Mostra valores ou faixas e o que está incluso." },
  { key: "faq", label: "Perguntas frequentes", purpose: "Responde dúvidas e objeções que travam a decisão." },
  { key: "conteudo", label: "Artigos e conteúdo", purpose: "Mostra conhecimento e atrai visitantes pela busca." },
  { key: "sobre", label: "Sobre", purpose: "Conta a história e os valores do negócio com fatos." },
  { key: "formulario", label: "Formulário", purpose: "Coleta os dados necessários para o próximo passo." },
  { key: "contato", label: "Contato e localização", purpose: "Reúne canais, endereço, horários e mapa." },
  { key: "cta-final", label: "Chamada final", purpose: "Retoma a oferta e repete a ação principal no fim da página." },
  { key: "texto-legal", label: "Texto legal", purpose: "Política de privacidade, termos ou trocas." },
  { key: "confirmacao", label: "Confirmação", purpose: "Confirma a ação do visitante e diz o que acontece a seguir." },
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number]["key"];
export const SECTION_KIND_KEYS = SECTION_KINDS.map((s) => s.key) as [SectionKind, ...SectionKind[]];
export const sectionKindLabel = (k: SectionKind) => SECTION_KINDS.find((s) => s.key === k)?.label ?? k;

export const CTA_TARGET_TYPES = [
  { key: "none", label: "Sem destino definido" },
  { key: "page", label: "Página do site" },
  { key: "section", label: "Seção de uma página" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "phone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "external", label: "Link externo" },
] as const;
export type CtaTargetType = (typeof CTA_TARGET_TYPES)[number]["key"];
export const CTA_TARGET_KEYS = CTA_TARGET_TYPES.map((c) => c.key) as [CtaTargetType, ...CtaTargetType[]];

export const MATERIAL_STATUS = [
  { key: "pendente", label: "Pendente" },
  { key: "em-producao", label: "Em produção" },
  { key: "recebido", label: "Recebido" },
  { key: "na", label: "Não se aplica" },
] as const;
export type MaterialStatus = (typeof MATERIAL_STATUS)[number]["key"];
export const MATERIAL_STATUS_KEYS = MATERIAL_STATUS.map((m) => m.key) as [MaterialStatus, ...MaterialStatus[]];

export const MATERIAL_OWNERS = [
  { key: "cliente", label: "Cliente" },
  { key: "equipe", label: "Equipe do projeto" },
  { key: "a-definir", label: "A definir" },
] as const;
export type MaterialOwner = (typeof MATERIAL_OWNERS)[number]["key"];
export const MATERIAL_OWNER_KEYS = MATERIAL_OWNERS.map((m) => m.key) as [MaterialOwner, ...MaterialOwner[]];

export const REQUIREMENT_CATEGORIES = [
  { key: "essencial", label: "Funcionalidades essenciais" },
  { key: "futuro", label: "Melhorias futuras" },
  { key: "integracao", label: "Integrações" },
  { key: "manutencao", label: "Manutenção" },
  { key: "validacao", label: "Precisa de validação" },
] as const;
export type RequirementCategory = (typeof REQUIREMENT_CATEGORIES)[number]["key"];
export const REQUIREMENT_CATEGORY_KEYS = REQUIREMENT_CATEGORIES.map((r) => r.key) as [
  RequirementCategory,
  ...RequirementCategory[],
];

export const SITE_TYPES = [
  { key: "landing", label: "Página única (landing page)" },
  { key: "institucional", label: "Site institucional compacto" },
  { key: "catalogo", label: "Catálogo com pedido por contato" },
  { key: "loja", label: "Loja virtual" },
  { key: "portfolio", label: "Portfólio" },
  { key: "conteudo", label: "Site institucional com conteúdo" },
  { key: "evento", label: "Página de inscrição" },
] as const;
export type SiteTypeKey = (typeof SITE_TYPES)[number]["key"];
export const SITE_TYPE_KEYS = SITE_TYPES.map((s) => s.key) as [SiteTypeKey, ...SiteTypeKey[]];

export const PROJECT_STATUS = [
  { key: "briefing", label: "Briefing" },
  { key: "planejamento", label: "Planejamento" },
  { key: "pronto", label: "Pronto para desenvolver" },
] as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[number]["key"];

export const labelOf = <T extends { key: string; label: string }>(list: readonly T[], key: string | null | undefined) =>
  list.find((i) => i.key === key)?.label ?? "";
