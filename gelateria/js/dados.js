// Catálogo da gelateria. Só dados: preços em centavos, cores em sRGB.

export const SABORES = [
  { id: 'pistache', nome: 'Pistache', nota: 'da Sicília, torrado na casa', cor: '#a9b97a', pintas: '#5f7a33', premium: true },
  { id: 'morango', nome: 'Morango', nota: 'com pedaços da fruta', cor: '#ec8597', pintas: '#b8304b' },
  { id: 'chocolate', nome: 'Cacau 70%', nota: 'amargo e denso', cor: '#5b3423', pintas: null },
  { id: 'stracciatella', nome: 'Stracciatella', nota: 'fior di latte com lascas de chocolate', cor: '#f4ede1', pintas: '#2b1810' },
  { id: 'manga', nome: 'Manga', nota: 'sorbet, sem leite', cor: '#f4b53f', pintas: null },
  { id: 'limao', nome: 'Limão-siciliano', nota: 'sorbet, bem azedinho', cor: '#efe7a2', pintas: '#d9cf6e' },
];

export const BASES = [
  { id: 'casquinha', nome: 'Casquinha', nota: 'waffle feito na hora', preco: 200 },
  { id: 'copinho', nome: 'Copinho', nota: 'de papel, com colher', preco: 0 },
];

export const COBERTURAS = [
  { id: 'nenhuma', nome: 'Sem cobertura', preco: 0 },
  { id: 'granulado', nome: 'Granulado colorido', preco: 200 },
  { id: 'calda', nome: 'Calda de chocolate', preco: 300 },
];

// Preço pela quantidade de bolas (índice = quantidade).
export const PRECO_BOLAS = [0, 1200, 1900, 2500];
export const ADICIONAL_PREMIUM = 300;
export const MAX_BOLAS = 3;

export const HORARIO = { abre: 12 * 60, fecha: 22 * 60, antecedencia: 20, passo: 15, duracao: 15 };
