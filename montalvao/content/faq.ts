// Perguntas frequentes. `publicar: false` = resposta ainda não confirmada pela loja:
// aparece só na prévia, marcada como pendente, e fica fora da versão pública.

// `requer: "whatsapp"` = a resposta só faz sentido quando o número do WhatsApp estiver configurado.
export type Pergunta = { pergunta: string; resposta: string; publicar: boolean; requer?: "whatsapp" };

export const faq: Pergunta[] = [
  {
    pergunta: "Os veículos do site estão disponíveis?",
    resposta:
      "O estoque muda com frequência. Antes de ir até a loja, confirme com a equipe se o veículo que você viu continua disponível.",
    publicar: true,
  },
  {
    pergunta: "Posso ver o carro pessoalmente antes de decidir?",
    resposta:
      "Pode. Combine com a equipe um horário para ver o veículo de perto na loja e tirar as dúvidas ao vivo.",
    publicar: true,
  },
  {
    pergunta: "Como começo o atendimento?",
    resposta:
      "Escolha o veículo no site e toque em “Tenho interesse neste veículo”. A mensagem já vai com o nome do carro e o link da página, e a equipe responde a partir dela.",
    publicar: true,
    requer: "whatsapp",
  },
  {
    pergunta: "O que preciso informar no primeiro contato?",
    resposta:
      "Para começar, basta o seu nome e o veículo que chamou sua atenção. O site não pede CPF nem documentos.",
    publicar: true,
  },
  {
    pergunta: "Preciso agendar a visita ou posso ir direto?",
    resposta: "Pendente: confirmar com a loja se a visita precisa ser agendada.",
    publicar: false,
  },
  {
    pergunta: "Vocês aceitam meu carro na troca?",
    resposta: "Pendente: confirmar com a loja se aceita troca e como funciona a avaliação.",
    publicar: false,
  },
  {
    pergunta: "Vocês trabalham com financiamento?",
    resposta: "Pendente: confirmar com a loja as formas de pagamento e se há financiamento.",
    publicar: false,
  },
  {
    pergunta: "Os veículos têm garantia?",
    resposta: "Pendente: confirmar com a loja a política de garantia.",
    publicar: false,
  },
  {
    pergunta: "Como fica a documentação e a transferência?",
    resposta: "Pendente: confirmar com a loja como é feita a transferência e quem cuida da documentação.",
    publicar: false,
  },
];
