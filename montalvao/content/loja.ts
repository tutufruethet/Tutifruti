// Dados da loja. Tudo que estiver como null é tratado como pendente:
// na prévia aparece marcado como "Pendente"; na versão pública não aparece.
// Preencha só com informação confirmada pela Montalvão.

export type Horario = { dias: string; horas: string };

export type Endereco = {
  logradouro: string; // "Rua Exemplo, 123"
  bairro: string;
  cidade: string;
  uf: string;
  cep?: string;
};

export const loja = {
  nome: "Montalvão Motors",
  nomeCurto: "Montalvão",

  // WhatsApp com DDI + DDD + número, só dígitos. Ex.: "55" + "11" + "912345678".
  whatsapp: null as string | null,

  // Telefone fixo ou celular para ligação, como deve aparecer no site. Ex.: "(11) 3333-4444".
  telefone: null as string | null,

  // Usuário do Instagram da loja, sem @.
  instagram: null as string | null,

  endereco: null as Endereco | null,

  // Link de rota confirmado (Google Maps). Sem ele, o botão "Como chegar" não aparece.
  mapsUrl: null as string | null,

  horarios: null as Horario[] | null,

  // Caminho da logo oficial em /public (SVG ou PNG em boa resolução). Sem ela, o site usa o wordmark tipográfico.
  logoOficial: null as string | null,
};

export const mensagens = {
  geral: "Olá! Conheci a Montalvão pelo site e gostaria de saber mais sobre os veículos.",
  veiculo: (veiculo: string, url: string) =>
    `Olá! Tenho interesse no ${veiculo}. Gostaria de consultar disponibilidade e condições. ${url}`,
  visitaVeiculo: (veiculo: string, url: string) =>
    `Olá! Gostaria de combinar uma visita para ver o ${veiculo} na loja. ${url}`,
};
