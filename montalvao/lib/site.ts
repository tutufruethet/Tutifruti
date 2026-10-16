// Endereço público do site, sem barra no fim. Ex.: https://www.montalvaomotors.com.br
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const DOMINIO_CONFIGURADO = Boolean(process.env.NEXT_PUBLIC_SITE_URL);

export function urlAbsoluta(caminho: string) {
  return `${SITE_URL}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
}
