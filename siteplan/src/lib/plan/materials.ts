import type { Briefing, Material, Plan } from "@/lib/schema";
import type { ContentKey, MaterialOwner, MaterialStatus } from "@/lib/schema/catalog";
import { newId } from "@/lib/schema/factory";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Liga um material ao item correspondente do briefing (para herdar a disponibilidade). */
export function contentKeyFor(label: string): ContentKey | null {
  const n = norm(label);
  if (/depoimento/.test(n)) return "depoimentos";
  if (/video/.test(n)) return "videos";
  if (/foto|imagem|imagens/.test(n)) return "fotos";
  if (/logo|identidade/.test(n)) return "identidade";
  if (/registro|certifica/.test(n)) return "certificacoes";
  if (/case|trabalho|projeto/.test(n)) return "cases";
  if (/pergunta|resposta/.test(n)) return "faq";
  if (/whatsapp|telefone|endereco|horario|e mail|contato/.test(n)) return "contato";
  if (/preco|valor|descricao|servico|produto|condic/.test(n)) return "servicos";
  return null;
}

const statusFromBriefing = (b: Briefing, key: ContentKey | null): MaterialStatus => {
  if (!key) return "pendente";
  const s = b.content.items[key]?.status;
  return s === "disponivel" ? "recebido" : s === "na" ? "na" : "pendente";
};

const ownerFor = (key: ContentKey | null): MaterialOwner => (key ? "cliente" : "a-definir");

/**
 * Recalcula a lista de materiais a partir das seções atuais.
 * Itens automáticos são identificados por uma chave estável (seção + material):
 * status, responsável e observação já preenchidos são preservados.
 * Itens manuais nunca são removidos.
 */
export function syncMaterials(plan: Plan, briefing: Briefing): Material[] {
  const previous = new Map(plan.materials.filter((m) => m.origin === "auto").map((m) => [m.key, m]));
  const out: Material[] = [];
  const seen = new Set<string>();

  const push = (key: string, label: string, pageId: string | null, sectionId: string | null) => {
    if (seen.has(key)) return;
    seen.add(key);
    const prev = previous.get(key);
    if (prev) {
      out.push({ ...prev, label, pageId, sectionId });
      return;
    }
    const ck = contentKeyFor(label);
    out.push({
      id: newId("mat"),
      key,
      label,
      pageId,
      sectionId,
      owner: ownerFor(ck),
      status: statusFromBriefing(briefing, ck),
      note: ck ? (briefing.content.items[ck]?.note ?? "") : "",
      origin: "auto",
    });
  };

  if (briefing.content.items.identidade?.status !== "na") push("global::logo", "Logo em vetor (SVG ou PDF) e cores da marca", null, null);
  for (const page of plan.pages) {
    for (const s of page.sections) {
      for (const item of s.contentNeeded) {
        if (!item.trim()) continue;
        push(`${s.id}::${norm(item)}`, item.trim(), page.id, s.id);
      }
      // Pendências escritas no texto também viram material, para nada se perder.
      const marks = `${s.title}\n${s.body}`.match(/\[Pendente: ([^\]]+)\]/g) ?? [];
      for (const m of marks) {
        const label = m.slice(11, -1).trim();
        // Mesma pendência em várias seções (ex.: "prazo de resposta") vira um item só.
        push(`txt::${norm(label)}`, upperFirstSafe(label), page.id, s.id);
      }
    }
  }
  const manual = plan.materials.filter((m) => m.origin === "manual");
  return [...out, ...manual];
}

const upperFirstSafe = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Ao gerar um planejamento novo, os ids das seções mudam. Este passo leva status,
 * responsável e observação dos materiais antigos para os novos com o mesmo nome,
 * e mantém os materiais adicionados à mão.
 */
export function carryMaterials(previous: Plan, next: Plan): Material[] {
  const byLabel = new Map(previous.materials.filter((m) => m.origin === "auto").map((m) => [norm(m.label), m]));
  const carried = next.materials.map((m) => {
    const old = byLabel.get(norm(m.label));
    return old ? { ...m, status: old.status, owner: old.owner, note: old.note } : m;
  });
  const manual = previous.materials.filter((m) => m.origin === "manual").map((m) => ({ ...m, pageId: null, sectionId: null }));
  return [...carried.filter((m) => m.origin === "auto"), ...manual];
}
