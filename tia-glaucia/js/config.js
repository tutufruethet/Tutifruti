/*
  ============================================================
  DADOS DO SITE: edite só este arquivo.
  ============================================================
  - Enquanto um campo estiver entre colchetes [ ... ] ou vazio,
    o site mostra "pendente" e não cria nenhum link.
  - WhatsApp: só números, com DDD. Ex.: "11987654321"
    (o código do Brasil, 55, é colocado sozinho).
  - Instagram: o link completo. Ex.: "https://instagram.com/tiaglaucia"
  - Foto: coloque o arquivo na pasta img/ e escreva o caminho.
    Ex.: "img/tia-glaucia.jpg"
*/
window.SITE = {
  NOME: 'Tia Gláucia',
  WHATSAPP: '[INSERIR NÚMERO COM DDD]',
  INSTAGRAM: '[INSERIR LINK]',
  LOCAL_DE_ATENDIMENTO: '[PREENCHER]',
  MODALIDADE_E_SERIES: '[CONFIRMAR]',

  FOTO: '',

  // Biografia: um parágrafo por item. Não coloque informações que a professora não confirmou.
  BIOGRAFIA: [
    '[Biografia a preencher pela Tia Gláucia: sua história, como começou a dar reforço escolar e o que mais gosta no trabalho com as crianças.]',
  ],

  // Formas de apoio. Confirme com a professora antes de publicar
  // e depois mude SERVICOS_CONFIRMADOS para true.
  SERVICOS_CONFIRMADOS: false,
  SERVICOS: [
    { titulo: 'Apoio nas tarefas escolares', texto: 'Acompanhamento das lições de casa, com explicações no ritmo da criança.' },
    { titulo: 'Leitura e escrita', texto: 'Atividades para ler com mais segurança e escrever com mais clareza.' },
    { titulo: 'Revisão dos conteúdos', texto: 'Retomada do que foi visto em sala, para chegar às provas mais tranquilo.' },
    { titulo: 'Organização da rotina de estudos', texto: 'Ajuda para criar uma rotina de estudo possível, com pausas e combinados.' },
  ],
};
