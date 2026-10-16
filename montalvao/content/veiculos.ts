// Catálogo de veículos. Para adicionar um carro:
// 1. coloque as fotos em midia/originais e registre o recorte em scripts/midia.mjs;
// 2. rode `npm run midia`;
// 3. adicione um item abaixo com os dados confirmados pela loja e `publicado: true`.
//
// Regras:
// - Campo desconhecido fica null. Não preencha ano, versão, km ou preço "de olho".
// - `publicado: false` = demonstração. Aparece só na prévia, com selo.
// - `fotos` só pode ter fotos do MESMO exemplar.

export type Carroceria = "hatch" | "seda" | "suv" | "picape";

export type Situacao = "disponivel" | "reservado" | "vendido" | "a-confirmar";

export type Veiculo = {
  slug: string;
  marca: string;
  modelo: string | null;
  versao: string | null;
  anoFabricacao: number | null;
  anoModelo: number | null;
  preco: number | null;
  km: number | null;
  cambio: string | null;
  combustivel: string | null;
  cor: string | null;
  carroceria: Carroceria | null;
  portas: number | null;
  fotos: string[];
  destaque: boolean;
  situacao: Situacao;
  publicado: boolean;
  fonte: string;
  pendencias: string[];
};

export const veiculos: Veiculo[] = [
  {
    slug: "hyundai-creta-1-0-turbo-tgdi",
    marca: "Hyundai",
    modelo: "Creta",
    versao: "1.0 Turbo (TGDI)",
    anoFabricacao: null,
    anoModelo: null,
    preco: null,
    km: null,
    cambio: null,
    combustivel: null,
    cor: null,
    carroceria: "suv",
    portas: null,
    fotos: ["creta"],
    destaque: true,
    situacao: "a-confirmar",
    publicado: false,
    fonte: "Tarja da foto publicada pela loja: “Hyundai Creta 1.0 Turbo (TGDI)”.",
    pendencias: ["Disponibilidade", "Ano", "Preço", "Quilometragem", "Câmbio", "Combustível", "Cor"],
  },
  {
    slug: "nissan-march-rio-2013",
    marca: "Nissan",
    modelo: "March",
    versao: "Rio",
    anoFabricacao: null,
    anoModelo: 2013,
    preco: 37990,
    km: null,
    cambio: null,
    combustivel: null,
    cor: null,
    carroceria: "hatch",
    portas: null,
    fotos: ["march-1", "march-2"],
    destaque: true,
    situacao: "a-confirmar",
    publicado: false,
    fonte: "Tarja do Reels gravado na loja em 15/10/2026: “Nissan March, Versão Rio 2013, 37.990”.",
    pendencias: ["Disponibilidade", "Confirmar preço", "Ano de fabricação", "Quilometragem", "Câmbio", "Combustível", "Cor"],
  },
  {
    slug: "hyundai-prata-showroom",
    marca: "Hyundai",
    modelo: null,
    versao: null,
    anoFabricacao: null,
    anoModelo: null,
    preco: null,
    km: null,
    cambio: null,
    combustivel: null,
    cor: null,
    carroceria: null,
    portas: null,
    fotos: ["hyundai"],
    destaque: true,
    situacao: "a-confirmar",
    publicado: false,
    fonte: "Foto do showroom. Só a marca (emblema) é visível; a foto não mostra a traseira.",
    pendencias: ["Modelo e versão", "Disponibilidade", "Ano", "Preço", "Quilometragem", "Câmbio", "Combustível", "Carroceria"],
  },
  {
    slug: "renault-branco-showroom",
    marca: "Renault",
    modelo: null,
    versao: null,
    anoFabricacao: null,
    anoModelo: null,
    preco: null,
    km: null,
    cambio: null,
    combustivel: null,
    cor: null,
    carroceria: null,
    portas: null,
    fotos: ["renault"],
    destaque: false,
    situacao: "a-confirmar",
    publicado: false,
    fonte: "Foto do showroom. Só a marca (emblema) é visível; a foto não mostra a traseira.",
    pendencias: ["Modelo e versão", "Disponibilidade", "Ano", "Preço", "Quilometragem", "Câmbio", "Combustível", "Carroceria"],
  },
];
