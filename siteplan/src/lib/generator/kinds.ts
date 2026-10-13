import type { SectionKind } from "@/lib/schema/catalog";

/** Orientações fixas por tipo de seção: composição, comportamento no celular e materiais. */
export const KIND_SPECS: Record<SectionKind, { visual: string; mobile: string; content: string[] }> = {
  hero: {
    visual:
      "Título à esquerda ocupando 7 de 12 colunas, texto de apoio curto abaixo e botão principal visível sem rolar. Imagem real à direita (5 colunas) ou fundo neutro; nada de carrossel.",
    mobile: "Título com no máximo 3 linhas, botão de largura total logo abaixo do texto; imagem depois do botão.",
    content: ["Foto principal real (espaço, equipe ou produto)"],
  },
  "problema-solucao": {
    visual: "Duas colunas: à esquerda a situação do visitante nas palavras dele; à direita como o negócio resolve, em 3 pontos curtos.",
    mobile: "Uma coluna: situação primeiro, solução depois, sem ícones decorativos.",
    content: [],
  },
  servicos: {
    visual: "Lista em linhas com nome, uma frase de benefício e link para detalhe ou contato. Até 6 itens; mais que isso vira página própria.",
    mobile: "Linhas empilhadas com área de toque de pelo menos 44px; o link de cada serviço ocupa a linha inteira.",
    content: ["Descrição curta de cada serviço", "Condições ou faixa de preço de cada serviço"],
  },
  produtos: {
    visual: "Grade de 3 ou 4 colunas com foto, nome, preço e ação; filtros simples acima quando houver mais de 12 itens.",
    mobile: "Grade de 2 colunas; preço sempre visível; ação de compra ou pedido no próprio item.",
    content: ["Fotos dos produtos", "Nome, preço e variações de cada produto"],
  },
  beneficios: {
    visual: "Lista de 3 a 4 diferenciais, cada um com um fato verificável (horário, garantia, estrutura). Sem cards com ícone genérico.",
    mobile: "Itens empilhados com o fato em destaque e a explicação em uma linha.",
    content: [],
  },
  processo: {
    visual: "Etapas numeradas em linha horizontal (é uma sequência real), cada uma com título curto e uma frase.",
    mobile: "Etapas na vertical com o número à esquerda.",
    content: ["Etapas do atendimento confirmadas pelo cliente"],
  },
  portfolio: {
    visual: "Grade assimétrica com 6 a 9 trabalhos, imagem grande, título e uma linha de contexto; clique abre o detalhe.",
    mobile: "Uma coluna com imagens em proporção 4:3 e carregamento sob demanda.",
    content: ["Imagens dos trabalhos", "Título e contexto de cada trabalho"],
  },
  depoimentos: {
    visual: "Três depoimentos em texto com nome, contexto e foto (se autorizada). Sem carrossel automático.",
    mobile: "Um depoimento por vez em rolagem horizontal com indicador, ou lista vertical de 3.",
    content: ["Depoimentos reais com autorização de uso"],
  },
  equipe: {
    visual: "Fotos padronizadas (mesmo fundo e enquadramento), nome, função e registro profissional.",
    mobile: "Lista com foto pequena à esquerda e dados à direita.",
    content: ["Fotos da equipe", "Nome, formação e registro de cada profissional"],
  },
  autoridade: {
    visual: "Faixa discreta com registros, certificações e números verificáveis, cada um com fonte.",
    mobile: "Itens em duas colunas ou lista simples.",
    content: ["Registros profissionais e certificações"],
  },
  comparacao: {
    visual: "Tabela com no máximo 3 opções e 5 critérios; a opção recomendada destacada pela borda, não por cor chamativa.",
    mobile: "Uma opção por vez com seletor no topo; evitar tabela com rolagem lateral.",
    content: ["Critérios e dados de cada opção"],
  },
  precos: {
    visual: "Planos ou faixas lado a lado com o que está incluso em lista; ação em cada plano.",
    mobile: "Planos empilhados, o mais procurado primeiro.",
    content: ["Valores e condições de pagamento"],
  },
  faq: {
    visual: "Acordeão com 5 a 8 perguntas reais, uma aberta por vez; resposta curta com link quando precisar de detalhe.",
    mobile: "Pergunta inteira visível (sem cortar), área de toque generosa.",
    content: ["Respostas às perguntas frequentes"],
  },
  conteudo: {
    visual: "Lista dos 3 artigos mais recentes com título, resumo de uma linha e data.",
    mobile: "Lista vertical sem imagens grandes.",
    content: ["Primeiros artigos (3 a 5)"],
  },
  sobre: {
    visual: "Texto em coluna de leitura (até 70 caracteres por linha) ao lado de uma foto real.",
    mobile: "Foto acima do texto, com no máximo 4 parágrafos curtos.",
    content: ["Texto sobre a história do negócio", "Foto real do espaço ou da equipe"],
  },
  formulario: {
    visual: "Formulário curto em coluna única ao lado de um resumo do que acontece depois do envio.",
    mobile: "Campos de largura total, teclado adequado a cada campo (tel, e-mail), botão fixo ao final.",
    content: [],
  },
  contato: {
    visual: "Canais de contato com ação direta (abrir WhatsApp, ligar, traçar rota), endereço, horários e mapa.",
    mobile: "Botões de ação grandes no topo; mapa carregado só ao tocar.",
    content: ["WhatsApp, telefone, e-mail, endereço e horários"],
  },
  "cta-final": {
    visual: "Faixa de largura total com a oferta em uma frase e o botão principal; sem novos argumentos.",
    mobile: "Botão de largura total; considerar barra fixa com a ação principal após a primeira rolagem.",
    content: [],
  },
  "texto-legal": {
    visual: "Texto corrido em coluna de leitura, com sumário no topo.",
    mobile: "Sumário recolhível.",
    content: ["Texto legal revisado por responsável jurídico"],
  },
  confirmacao: {
    visual: "Mensagem curta de confirmação, próximo passo e prazo de resposta; um link para voltar.",
    mobile: "Tudo visível sem rolar.",
    content: [],
  },
};
