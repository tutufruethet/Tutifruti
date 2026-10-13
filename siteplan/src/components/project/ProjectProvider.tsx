"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Plan, Project } from "@/lib/schema";
import { nowIso } from "@/lib/schema/factory";
import { syncMaterials } from "@/lib/plan/materials";
import { getRepository } from "@/lib/storage/indexeddb";

export type SaveState = "salvo" | "pendente" | "salvando" | "erro";

type Ctx = {
  project: Project;
  saveState: SaveState;
  savedAt: string | null;
  saveError: string | null;
  /** Altera o projeto (rascunho clonado). Salva com debounce. */
  update: (fn: (draft: Project) => void) => void;
  /** Altera o planejamento: marca a data do plano e recalcula os materiais preservando status. */
  updatePlan: (fn: (plan: Plan, draft: Project) => void) => void;
  /** Volta a um estado anterior (desfazer). */
  restore: (snapshot: Project) => void;
  flush: () => Promise<void>;
};

const ProjectCtx = createContext<Ctx | null>(null);
const DEBOUNCE_MS = 700;

export function ProjectProvider({ initial, children }: { initial: Project; children: ReactNode }) {
  const [project, setProject] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>("salvo");
  const [savedAt, setSavedAt] = useState<string | null>(initial.updatedAt);
  const [saveError, setSaveError] = useState<string | null>(null);
  const latest = useRef(initial);
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);
  const saving = useRef<Promise<void> | null>(null);

  const save = useCallback(async () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (saving.current) await saving.current;
    if (!dirty.current) return;
    dirty.current = false;
    const snapshot = latest.current;
    setSaveState("salvando");
    saving.current = getRepository()
      .save(snapshot)
      .then(() => {
        setSaveError(null);
        setSavedAt(snapshot.updatedAt);
        setSaveState(dirty.current ? "pendente" : "salvo");
      })
      .catch((e: unknown) => {
        dirty.current = true;
        setSaveError(e instanceof Error ? e.message : "Erro ao salvar.");
        setSaveState("erro");
      })
      .finally(() => {
        saving.current = null;
      });
    await saving.current;
  }, []);

  const schedule = useCallback(() => {
    dirty.current = true;
    setSaveState("pendente");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), DEBOUNCE_MS);
  }, [save]);

  const commit = useCallback(
    (next: Project) => {
      latest.current = next;
      setProject(next);
      schedule();
    },
    [schedule],
  );

  const update = useCallback<Ctx["update"]>(
    (fn) => {
      const draft = structuredClone(latest.current);
      fn(draft);
      draft.updatedAt = nowIso();
      if (draft.plan && draft.status === "briefing") draft.status = "planejamento";
      if (!draft.plan) draft.status = "briefing";
      commit(draft);
    },
    [commit],
  );

  const updatePlan = useCallback<Ctx["updatePlan"]>(
    (fn) =>
      update((draft) => {
        if (!draft.plan) return;
        fn(draft.plan, draft);
        draft.plan.materials = syncMaterials(draft.plan, draft.briefing);
        draft.planUpdatedAt = nowIso();
      }),
    [update],
  );

  const restore = useCallback<Ctx["restore"]>((snapshot) => commit({ ...structuredClone(snapshot), updatedAt: nowIso() }), [commit]);

  // Alterações pendentes: salva ao esconder a aba, avisa ao fechar e salva ao sair do editor.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirty.current) void save();
    };
    const onPageHide = () => {
      if (dirty.current) void save();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || saving.current) {
        void save();
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (dirty.current) void save();
    };
  }, [save]);

  const value = useMemo<Ctx>(
    () => ({ project, saveState, savedAt, saveError, update, updatePlan, restore, flush: save }),
    [project, saveState, savedAt, saveError, update, updatePlan, restore, save],
  );
  return <ProjectCtx.Provider value={value}>{children}</ProjectCtx.Provider>;
}

export function useProject() {
  const c = useContext(ProjectCtx);
  if (!c) throw new Error("useProject fora do ProjectProvider");
  return c;
}
