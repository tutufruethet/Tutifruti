export const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/** dia da temporada (0 = 1º de agosto) para nome do mês */
export const monthOfSeasonDay = (d: number) => MONTHS_PT[(7 + Math.floor(d / 30.42)) % 12];
