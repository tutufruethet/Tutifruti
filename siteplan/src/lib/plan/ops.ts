import type { Page, Plan, Section } from "@/lib/schema";
import { LIMITS } from "@/lib/schema";
import { newId } from "@/lib/schema/factory";
import { slugify } from "@/lib/generator/demo";

// Operações de edição. Recebem um rascunho já clonado e o alteram no lugar.

export type TreeRow = { page: Page; depth: number; index: number; siblings: Page[] };

/** Páginas na ordem da árvore (mãe antes das filhas), com profundidade. */
export function pageTree(plan: Plan): TreeRow[] {
  const rows: TreeRow[] = [];
  const ids = new Set(plan.pages.map((p) => p.id));
  const childrenOf = (parent: string | null) =>
    plan.pages.filter((p) => (parent === null ? !p.parentId || !ids.has(p.parentId) : p.parentId === parent));
  const walk = (parent: string | null, depth: number, guard: Set<string>) => {
    const siblings = childrenOf(parent);
    siblings.forEach((page, index) => {
      if (guard.has(page.id)) return;
      guard.add(page.id);
      rows.push({ page, depth, index, siblings });
      walk(page.id, depth + 1, guard);
    });
  };
  walk(null, 0, new Set());
  return rows;
}

export function uniqueSlug(plan: Plan, wanted: string, exceptId?: string) {
  const taken = new Set(plan.pages.filter((p) => p.id !== exceptId).map((p) => p.slug));
  if (!taken.has(wanted)) return wanted;
  for (let i = 2; i < 100; i++) if (!taken.has(`${wanted}-${i}`)) return `${wanted}-${i}`;
  return `${wanted}-${Date.now().toString(36)}`;
}

export function addPage(plan: Plan, name: string, parentId: string | null): Page | null {
  if (plan.pages.length >= LIMITS.pages) return null;
  const parent = plan.pages.find((p) => p.id === parentId);
  const base = parent && parent.slug !== "/" ? `${parent.slug}/${slugify(name)}` : `/${slugify(name)}`;
  const page: Page = {
    id: newId("pag"),
    name,
    slug: uniqueSlug(plan, base),
    goal: "",
    parentId: parent?.id ?? null,
    inMenu: !parent,
    relatedPageIds: parent ? [parent.id] : [],
    sections: [],
    origin: "usuario",
    edited: true,
  };
  plan.pages.push(page);
  return page;
}

function cloneSections(sections: Section[], pageIdMap: Map<string, string>) {
  const sectionMap = new Map<string, string>();
  const copies = sections.map((s) => {
    const id = newId("sec");
    sectionMap.set(s.id, id);
    return { ...structuredClone(s), id };
  });
  for (const s of copies) {
    if (!s.cta) continue;
    const t = s.cta.target;
    if (t.pageId && pageIdMap.has(t.pageId)) {
      t.pageId = pageIdMap.get(t.pageId)!;
      if (t.sectionId && sectionMap.has(t.sectionId)) t.sectionId = sectionMap.get(t.sectionId)!;
    }
  }
  return copies;
}

export function duplicatePage(plan: Plan, pageId: string): Page | null {
  const src = plan.pages.find((p) => p.id === pageId);
  if (!src || plan.pages.length >= LIMITS.pages) return null;
  const id = newId("pag");
  const copy: Page = {
    ...structuredClone(src),
    id,
    name: `${src.name} (cópia)`,
    slug: uniqueSlug(plan, src.slug === "/" ? "/copia" : `${src.slug}-copia`),
    sections: cloneSections(src.sections, new Map([[src.id, id]])),
    origin: "usuario",
    edited: true,
  };
  plan.pages.splice(plan.pages.indexOf(src) + 1, 0, copy);
  return copy;
}

/** Remove a página. Filhas sobem um nível. Referências quebradas aparecem na análise. */
export function removePage(plan: Plan, pageId: string) {
  const page = plan.pages.find((p) => p.id === pageId);
  if (!page) return;
  for (const p of plan.pages) {
    if (p.parentId === pageId) p.parentId = page.parentId;
    p.relatedPageIds = p.relatedPageIds.filter((r) => r !== pageId);
  }
  plan.pages = plan.pages.filter((p) => p.id !== pageId);
}

/** Move a página entre as irmãs (mesma página-mãe). */
export function movePage(plan: Plan, pageId: string, dir: -1 | 1) {
  const page = plan.pages.find((p) => p.id === pageId);
  if (!page) return;
  const siblings = plan.pages.filter((p) => p.parentId === page.parentId);
  const i = siblings.indexOf(page);
  const other = siblings[i + dir];
  if (!other) return;
  const a = plan.pages.indexOf(page);
  const b = plan.pages.indexOf(other);
  plan.pages[a] = other;
  plan.pages[b] = page;
}

export function isDescendant(plan: Plan, maybeChild: string, ancestor: string): boolean {
  let cur = plan.pages.find((p) => p.id === maybeChild);
  const guard = new Set<string>();
  while (cur?.parentId && !guard.has(cur.id)) {
    if (cur.parentId === ancestor) return true;
    guard.add(cur.id);
    cur = plan.pages.find((p) => p.id === cur!.parentId);
  }
  return false;
}

export function setParent(plan: Plan, pageId: string, parentId: string | null) {
  if (parentId === pageId) return false;
  if (parentId && isDescendant(plan, parentId, pageId)) return false;
  const page = plan.pages.find((p) => p.id === pageId);
  if (!page) return false;
  page.parentId = parentId;
  page.edited = true;
  return true;
}

/** Recuar (vira filha da irmã anterior) ou avançar (sobe um nível). */
export function indentPage(plan: Plan, pageId: string, dir: "in" | "out") {
  const page = plan.pages.find((p) => p.id === pageId);
  if (!page) return false;
  if (dir === "out") {
    const parent = plan.pages.find((p) => p.id === page.parentId);
    return parent ? setParent(plan, pageId, parent.parentId) : false;
  }
  const siblings = plan.pages.filter((p) => p.parentId === page.parentId);
  const prev = siblings[siblings.indexOf(page) - 1];
  return prev ? setParent(plan, pageId, prev.id) : false;
}

export function moveSection(page: Page, from: number, to: number) {
  if (to < 0 || to >= page.sections.length || from === to) return;
  const [s] = page.sections.splice(from, 1);
  page.sections.splice(to, 0, s);
}

export function duplicateSection(page: Page, sectionId: string): Section | null {
  const i = page.sections.findIndex((s) => s.id === sectionId);
  if (i < 0 || page.sections.length >= LIMITS.sections) return null;
  const copy = { ...structuredClone(page.sections[i]), id: newId("sec"), name: `${page.sections[i].name} (cópia)`, edited: true };
  page.sections.splice(i + 1, 0, copy);
  return copy;
}

export function findSection(plan: Plan, sectionId: string) {
  for (const page of plan.pages) {
    const section = page.sections.find((s) => s.id === sectionId);
    if (section) return { page, section };
  }
  return null;
}

export function hasContent(page: Page) {
  return page.sections.some((s) => s.title.trim() || s.body.trim());
}
