import { veiculos, type Carroceria, type Veiculo } from "@/content/veiculos";
import { PREVIA } from "@/lib/modo";
import { formatarKm, formatarPreco } from "@/lib/formatos";

export type { Veiculo, Carroceria };

/** Na prévia: todos (demonstração marcada). No público: só publicados e não vendidos. */
export const veiculosVisiveis: Veiculo[] = veiculos.filter((v) => (PREVIA ? true : v.publicado && v.situacao !== "vendido"));

export const ehDemonstracao = (v: Veiculo) => !v.publicado;

export function buscarVeiculo(slug: string) {
  return veiculosVisiveis.find((v) => v.slug === slug) ?? null;
}

/** Nome usado em títulos e na mensagem do WhatsApp. Só com o que foi informado. */
export function nomeVeiculo(v: Veiculo) {
  return [v.marca, v.modelo, v.versao].filter(Boolean).join(" ");
}

export const rotuloCarroceria: Record<Carroceria, { singular: string; plural: string; noMeioDaFrase: string }> = {
  hatch: { singular: "Hatch", plural: "Hatches", noMeioDaFrase: "hatches" },
  seda: { singular: "Sedã", plural: "Sedãs", noMeioDaFrase: "sedãs" },
  suv: { singular: "SUV", plural: "SUVs", noMeioDaFrase: "SUVs" },
  picape: { singular: "Picape", plural: "Picapes", noMeioDaFrase: "picapes" },
};

export function ano(v: Veiculo) {
  if (v.anoFabricacao && v.anoModelo && v.anoFabricacao !== v.anoModelo) return `${v.anoFabricacao}/${v.anoModelo}`;
  return v.anoModelo ?? v.anoFabricacao ?? null;
}

/** Linha curta de atributos para o card: só campos confirmados. */
export function resumoVeiculo(v: Veiculo) {
  return [ano(v), v.km != null ? formatarKm(v.km) : null, v.cambio, v.combustivel].filter(Boolean).map(String);
}

export const precoOuConsulta = (v: Veiculo) => (v.preco != null ? formatarPreco(v.preco) : "Consulte condições");

export type LinhaFicha = { rotulo: string; valor: string | null };

export function fichaTecnica(v: Veiculo): LinhaFicha[] {
  return [
    { rotulo: "Marca", valor: v.marca },
    { rotulo: "Modelo", valor: v.modelo },
    { rotulo: "Versão", valor: v.versao },
    { rotulo: "Ano de fabricação", valor: v.anoFabricacao != null ? String(v.anoFabricacao) : null },
    { rotulo: "Ano do modelo", valor: v.anoModelo != null ? String(v.anoModelo) : null },
    { rotulo: "Quilometragem", valor: v.km != null ? formatarKm(v.km) : null },
    { rotulo: "Câmbio", valor: v.cambio },
    { rotulo: "Combustível", valor: v.combustivel },
    { rotulo: "Carroceria", valor: v.carroceria ? rotuloCarroceria[v.carroceria].singular : null },
    { rotulo: "Portas", valor: v.portas != null ? String(v.portas) : null },
    { rotulo: "Cor", valor: v.cor },
  ];
}

/** Valores distintos de um campo com contagem, para montar filtros só com opções reais. */
export function contarPor<K extends string>(lista: Veiculo[], chave: (v: Veiculo) => K | null) {
  const mapa = new Map<K, number>();
  for (const v of lista) {
    const k = chave(v);
    if (k) mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
}

export function sugestoes(atual: Veiculo, quantidade = 3) {
  return veiculosVisiveis.filter((v) => v.slug !== atual.slug).slice(0, quantidade);
}
