// Segmentos com modelo próprio no modo demonstração.
// "outro" usa um modelo genérico e o texto livre do usuário.
export const SEGMENTS = [
  { key: "odontologia", label: "Clínica odontológica" },
  { key: "saude", label: "Clínica médica ou de saúde" },
  { key: "estetica", label: "Estética e beleza" },
  { key: "psicologia", label: "Psicologia e terapias" },
  { key: "advocacia", label: "Advocacia" },
  { key: "contabilidade", label: "Contabilidade e consultoria" },
  { key: "restaurante", label: "Restaurante, café ou delivery" },
  { key: "loja", label: "Loja e produtos" },
  { key: "educacao", label: "Cursos e educação" },
  { key: "fitness", label: "Academia, estúdio ou personal" },
  { key: "arquitetura", label: "Arquitetura e interiores" },
  { key: "construcao", label: "Obras, reformas e serviços técnicos" },
  { key: "imobiliaria", label: "Imobiliária e corretores" },
  { key: "tecnologia", label: "Software e tecnologia (B2B)" },
  { key: "criativo", label: "Fotografia, design e criativos" },
  { key: "eventos", label: "Eventos e casamentos" },
  { key: "turismo", label: "Turismo e hospedagem" },
  { key: "pet", label: "Pet shop e veterinária" },
  { key: "outro", label: "Outro segmento" },
] as const;
export type SegmentKey = (typeof SEGMENTS)[number]["key"];
export const SEGMENT_KEYS = SEGMENTS.map((s) => s.key) as [SegmentKey, ...SegmentKey[]];
export const segmentLabel = (key: string, other?: string) =>
  key === "outro" && other?.trim() ? other.trim() : (SEGMENTS.find((s) => s.key === key)?.label ?? "Segmento não informado");
