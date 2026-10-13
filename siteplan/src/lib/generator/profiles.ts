import type { SectionKind } from "@/lib/schema/catalog";
import type { SegmentKey } from "@/lib/schema/segments";

/**
 * Modelo por segmento para o modo demonstração.
 * Tudo aqui é conhecimento de domínio genérico: nunca vira fato sobre a empresa.
 * Objeções e perguntas entram no planejamento marcadas como hipóteses.
 */
export type SegmentProfile = {
  client: string; // como chamar o cliente final
  clients: string;
  service: string; // como chamar o que é vendido
  services: string;
  visit: string; // o primeiro encontro (consulta, reunião, visita…)
  place: string; // onde acontece
  local: boolean; // depende da região para atrair clientes
  /** Seções que costumam ajudar a decisão neste segmento, além das ligadas ao objetivo. */
  trust: SectionKind[];
  /** Objeções comuns no segmento. Viram hipóteses a validar. */
  objections: string[];
  /** Regras de publicidade ou cuidados do setor. Viram pontos de validação, nunca afirmações. */
  compliance?: string;
  /** Material visual típico para portfólio ou galeria. */
  proof: string;
  /** Página extra que costuma fazer sentido. */
  extraPage?: { name: string; slug: string; goal: string; kind: SectionKind };
};

const base: SegmentProfile = {
  client: "cliente",
  clients: "clientes",
  service: "serviço",
  services: "serviços",
  visit: "atendimento",
  place: "empresa",
  local: false,
  trust: ["beneficios", "depoimentos", "faq"],
  objections: ["Quanto custa?", "Quanto tempo leva?", "Como é o atendimento?"],
  proof: "fotos reais do trabalho",
};

export const PROFILES: Record<SegmentKey, SegmentProfile> = {
  odontologia: {
    ...base,
    client: "paciente",
    clients: "pacientes",
    service: "tratamento",
    services: "tratamentos",
    visit: "avaliação",
    place: "clínica",
    local: true,
    trust: ["equipe", "autoridade", "processo", "depoimentos", "faq"],
    objections: ["Quanto custa o tratamento?", "Atende convênio?", "O procedimento dói?", "Quanto tempo dura o tratamento?"],
    compliance:
      "Publicidade odontológica segue as normas do Conselho Federal de Odontologia: confirmar com o cliente o uso de fotos de antes e depois, preços e promessas de resultado.",
    proof: "fotos do consultório e da equipe",
  },
  saude: {
    ...base,
    client: "paciente",
    clients: "pacientes",
    service: "atendimento",
    services: "especialidades",
    visit: "consulta",
    place: "clínica",
    local: true,
    trust: ["equipe", "autoridade", "processo", "faq"],
    objections: ["Atende meu convênio?", "Quanto custa a consulta?", "Qual a disponibilidade de horários?"],
    compliance:
      "Publicidade médica segue as normas do Conselho Federal de Medicina: confirmar o uso de depoimentos, imagens de pacientes e promessas de resultado.",
    proof: "fotos do espaço e da equipe",
  },
  estetica: {
    ...base,
    client: "cliente",
    service: "procedimento",
    services: "procedimentos",
    visit: "avaliação",
    place: "espaço",
    local: true,
    trust: ["equipe", "processo", "depoimentos", "faq"],
    objections: ["Quanto custa?", "Quantas sessões são necessárias?", "Tem contraindicação?", "O resultado é natural?"],
    compliance: "Confirmar se algum procedimento exige responsável técnico ou tem regra de publicidade do conselho profissional.",
    proof: "fotos do espaço e dos procedimentos (com autorização)",
  },
  psicologia: {
    ...base,
    client: "paciente",
    clients: "pacientes",
    service: "atendimento",
    services: "modalidades de atendimento",
    visit: "primeira sessão",
    place: "consultório",
    local: false,
    trust: ["sobre", "processo", "faq"],
    objections: ["Como funciona a primeira sessão?", "Atende on-line?", "Qual o valor da sessão?", "Quanto tempo dura a terapia?"],
    compliance:
      "O Código de Ética do Psicólogo restringe depoimentos de pacientes e promessas de resultado: confirmar antes de incluir prova social.",
    proof: "foto profissional e do consultório",
  },
  advocacia: {
    ...base,
    service: "área de atuação",
    services: "áreas de atuação",
    visit: "consulta inicial",
    place: "escritório",
    local: true,
    trust: ["sobre", "equipe", "autoridade", "processo", "faq"],
    objections: ["Quanto custa?", "Tenho direito?", "Quanto tempo leva o processo?", "Atende on-line?"],
    compliance:
      "A publicidade na advocacia segue o Provimento 205/2021 da OAB: sem promessa de resultado, sem captação de clientela e com linguagem informativa. Depoimentos e valores devem ser validados.",
    proof: "foto da equipe e do escritório",
  },
  contabilidade: {
    ...base,
    client: "empresa cliente",
    clients: "empresas clientes",
    services: "serviços",
    visit: "reunião de diagnóstico",
    place: "escritório",
    trust: ["processo", "beneficios", "comparacao", "faq"],
    objections: ["Quanto custa por mês?", "Como é a troca de contador?", "Atendem meu porte de empresa?"],
    proof: "dados verificáveis sobre a operação (anos de mercado, segmentos atendidos)",
  },
  restaurante: {
    ...base,
    service: "prato",
    services: "cardápio",
    visit: "pedido",
    place: "restaurante",
    local: true,
    trust: ["sobre", "contato"],
    objections: ["Qual o horário?", "Faz entrega na minha região?", "Tem opção vegetariana ou sem glúten?", "Precisa reservar?"],
    proof: "fotos reais dos pratos e do ambiente",
    extraPage: { name: "Cardápio", slug: "/cardapio", goal: "Mostrar pratos, preços e levar ao pedido ou reserva.", kind: "produtos" },
  },
  loja: {
    ...base,
    service: "produto",
    services: "produtos",
    visit: "compra",
    place: "loja",
    trust: ["beneficios", "depoimentos", "faq"],
    objections: ["Qual o prazo de entrega?", "Como funciona a troca?", "Quais as formas de pagamento?", "O frete é grátis?"],
    compliance: "Lojas on-line devem informar CNPJ, endereço, política de trocas e canais de atendimento (Código de Defesa do Consumidor e Decreto 7.962/2013).",
    proof: "fotos dos produtos em fundo neutro e em uso",
  },
  educacao: {
    ...base,
    client: "aluno",
    clients: "alunos",
    service: "curso",
    services: "cursos",
    visit: "inscrição",
    place: "escola",
    trust: ["processo", "equipe", "depoimentos", "precos", "faq"],
    objections: ["Tem certificado?", "Qual a carga horária?", "É on-line ou presencial?", "Posso pagar parcelado?"],
    proof: "trechos de aula, material e estrutura",
  },
  fitness: {
    ...base,
    client: "aluno",
    clients: "alunos",
    service: "modalidade",
    services: "modalidades",
    visit: "aula experimental",
    place: "estúdio",
    local: true,
    trust: ["equipe", "precos", "depoimentos", "faq"],
    objections: ["Qual o valor do plano?", "Tem aula experimental?", "Quais os horários?", "Serve para iniciantes?"],
    proof: "fotos do espaço e das aulas",
  },
  arquitetura: {
    ...base,
    service: "projeto",
    services: "serviços",
    visit: "reunião de briefing",
    place: "escritório",
    trust: ["portfolio", "processo", "sobre", "faq"],
    objections: ["Quanto custa um projeto?", "Acompanham a obra?", "Quanto tempo leva?", "Atendem fora da cidade?"],
    proof: "fotos profissionais de projetos entregues",
  },
  construcao: {
    ...base,
    service: "serviço",
    visit: "visita técnica",
    place: "empresa",
    local: true,
    trust: ["portfolio", "processo", "autoridade", "faq"],
    objections: ["Fazem orçamento sem compromisso?", "Qual o prazo?", "Têm garantia?", "Atendem minha região?"],
    proof: "fotos de obras concluídas (antes e depois com autorização)",
  },
  imobiliaria: {
    ...base,
    service: "imóvel",
    services: "imóveis",
    visit: "visita ao imóvel",
    place: "imobiliária",
    local: true,
    trust: ["produtos", "sobre", "faq"],
    objections: ["Aceita financiamento?", "Qual o valor do condomínio?", "Posso visitar?"],
    compliance: "Anúncios de imóveis devem trazer o número do CRECI do corretor ou da imobiliária.",
    proof: "fotos e plantas dos imóveis",
  },
  tecnologia: {
    ...base,
    client: "empresa cliente",
    clients: "empresas clientes",
    service: "solução",
    services: "soluções",
    visit: "demonstração",
    place: "empresa",
    trust: ["problema-solucao", "processo", "comparacao", "precos", "faq"],
    objections: ["Integra com o que já usamos?", "Quanto tempo leva a implantação?", "Como é o suporte?", "Os dados ficam seguros?"],
    proof: "capturas de tela reais do produto",
  },
  criativo: {
    ...base,
    service: "trabalho",
    services: "serviços",
    visit: "conversa inicial",
    place: "estúdio",
    trust: ["portfolio", "processo", "sobre"],
    objections: ["Quanto custa?", "Qual o prazo de entrega?", "Quantas revisões estão incluídas?"],
    proof: "trabalhos reais, com crédito e autorização dos clientes",
  },
  eventos: {
    ...base,
    service: "serviço",
    visit: "reunião",
    place: "espaço",
    local: true,
    trust: ["portfolio", "processo", "depoimentos", "faq"],
    objections: ["Tem data disponível?", "Quanto custa?", "O que está incluso?", "Quantos convidados comporta?"],
    proof: "fotos de eventos reais",
  },
  turismo: {
    ...base,
    client: "hóspede",
    clients: "hóspedes",
    service: "acomodação",
    services: "acomodações",
    visit: "reserva",
    place: "hospedagem",
    local: true,
    trust: ["beneficios", "depoimentos", "contato", "faq"],
    objections: ["Tem disponibilidade nas datas?", "Aceita pets?", "O café da manhã está incluso?", "Como chegar?"],
    proof: "fotos das acomodações e do entorno",
  },
  pet: {
    ...base,
    client: "tutor",
    clients: "tutores",
    service: "serviço",
    visit: "agendamento",
    place: "pet shop",
    local: true,
    trust: ["equipe", "processo", "depoimentos", "faq"],
    objections: ["Busca e leva o pet?", "Quanto custa o banho?", "Atende emergência?"],
    proof: "fotos do espaço e dos atendimentos (com autorização dos tutores)",
  },
  outro: base,
};
