// "previa": mostra tudo, com selos de Demonstração/Pendente, e bloqueia indexação.
// "publico": só o que foi confirmado. Ative com NEXT_PUBLIC_MODO=publico (npm run build:publico).
export const MODO: "previa" | "publico" = process.env.NEXT_PUBLIC_MODO === "publico" ? "publico" : "previa";
export const PREVIA = MODO === "previa";
