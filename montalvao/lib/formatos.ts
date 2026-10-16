const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const inteiro = new Intl.NumberFormat("pt-BR");

export const formatarPreco = (valor: number) => moeda.format(valor).replace(/ /g, " ");
export const formatarKm = (valor: number) => `${inteiro.format(valor)} km`;
