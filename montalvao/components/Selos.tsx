import { PREVIA } from "@/lib/modo";

export function SeloDemo({ className = "" }: { className?: string }) {
  if (!PREVIA) return null;
  return <span className={`selo selo-demo ${className}`}>Demonstração</span>;
}

export function SeloPendente({ texto = "Pendente", className = "" }: { texto?: string; className?: string }) {
  if (!PREVIA) return null;
  return <span className={`selo selo-pendente ${className}`}>{texto}</span>;
}
