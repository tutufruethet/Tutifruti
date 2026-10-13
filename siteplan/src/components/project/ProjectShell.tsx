"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Check, CircleAlert, ClipboardList, CloudUpload, FileOutput, LayoutList, ListChecks } from "lucide-react";
import type { Project } from "@/lib/schema";
import { segmentLabel } from "@/lib/schema/segments";
import { getRepository } from "@/lib/storage/indexeddb";
import { clockTime } from "@/lib/format";
import { AppShell, PROJECTS_CHANGED } from "@/components/shell/AppShell";
import { Button, cx, Spinner } from "@/components/ui";
import { ProjectProvider, useProject } from "./ProjectProvider";

export function SaveIndicator() {
  const { saveState, savedAt, saveError, flush } = useProject();
  if (saveState === "erro")
    return (
      <span className="flex items-center gap-2 text-[13px] text-danger" role="alert">
        <CircleAlert className="size-4" aria-hidden />
        <span className="hidden sm:inline" title={saveError ?? undefined}>
          Erro ao salvar
        </span>
        <Button size="sm" variant="danger" onClick={() => void flush()}>
          Tentar de novo
        </Button>
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-ink-3" role="status" aria-live="polite">
      {saveState === "salvo" ? (
        <Check className="size-4 text-ok" aria-hidden />
      ) : saveState === "salvando" ? (
        <Spinner className="size-3.5" />
      ) : (
        <CloudUpload className="size-4" aria-hidden />
      )}
      <span className={cx(saveState === "salvo" && "max-sm:sr-only")}>
        {saveState === "salvo" ? `Salvo${savedAt ? ` às ${clockTime(savedAt)}` : ""}` : saveState === "salvando" ? "Salvando…" : "Alterações não salvas"}
      </span>
    </span>
  );
}

const TITLES: Record<string, string> = {
  briefing: "Briefing",
  revisao: "Revisão e geração",
  planejamento: "Planejamento",
  entrega: "Prompt e exportação",
  imprimir: "Versão para impressão",
};

function Inner({ children }: { children: ReactNode }) {
  const { project } = useProject();
  const pathname = usePathname();
  const search = useSearchParams();
  const step = pathname.split("/").pop() ?? "";
  const base = `/projetos/${project.id}`;
  const hasPlan = !!project.plan;

  // Mantém a lista lateral atualizada quando o nome ou o status mudam.
  useEffect(() => {
    window.dispatchEvent(new Event(PROJECTS_CHANGED));
  }, [project.name, project.status, project.plan?.pages.length]);

  const tabs = [
    { href: `${base}/briefing`, label: "Briefing", icon: ClipboardList, key: "briefing", enabled: true },
    { href: `${base}/revisao`, label: "Revisão", icon: ListChecks, key: "revisao", enabled: true },
    { href: `${base}/planejamento?aba=${search.get("aba") ?? "visao"}`, label: "Plano", icon: LayoutList, key: "planejamento", enabled: hasPlan },
    { href: `${base}/entrega`, label: "Entrega", icon: FileOutput, key: "entrega", enabled: hasPlan },
  ];
  const mobileNav = (
    <nav aria-label="Etapas" className="grid grid-cols-4">
      {tabs.map((t) =>
        t.enabled ? (
          <Link
            key={t.key}
            href={t.href}
            aria-current={step === t.key ? "page" : undefined}
            className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", step === t.key ? "text-accent" : "text-ink-3")}
          >
            <t.icon className="size-5" aria-hidden />
            {t.label}
          </Link>
        ) : (
          <span key={t.key} aria-disabled="true" className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-3/50">
            <t.icon className="size-5" aria-hidden />
            {t.label}
          </span>
        ),
      )}
    </nav>
  );

  const generation = project.plan?.generation;
  return (
    <AppShell
      project={{
        id: project.id,
        name: project.name,
        segment: segmentLabel(project.briefing.business.segment, project.briefing.business.segmentOther),
        hasPlan,
        briefingStep: project.briefingStep,
      }}
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">{TITLES[step] ?? project.name}</span>
          {generation && (
            <span
              className={cx(
                "hidden rounded px-1.5 py-0.5 text-xs font-medium sm:inline",
                generation.mode === "demo" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent-strong",
              )}
              title={generation.mode === "demo" ? "Gerado por regras e modelos por segmento, sem IA" : `Gerado com IA (${generation.model})`}
            >
              {generation.mode === "demo" ? "Modo demonstração" : "Gerado com IA"}
            </span>
          )}
        </span>
      }
      actions={<SaveIndicator />}
      mobileNav={step === "imprimir" ? undefined : mobileNav}
    >
      {children}
    </AppShell>
  );
}

export function ProjectRoot({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<{ status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ok"; project: Project }>({
    status: "loading",
  });
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    getRepository()
      .get(params.id)
      .then((p) => alive && setState(p ? { status: "ok", project: p } : { status: "missing" }))
      .catch((e: Error) => alive && setState({ status: "error", message: e.message }));
    return () => {
      alive = false;
    };
  }, [params.id]);

  if (state.status === "ok")
    return (
      <ProjectProvider key={state.project.id} initial={state.project}>
        <Inner>{children}</Inner>
      </ProjectProvider>
    );
  return (
    <AppShell title={state.status === "loading" ? "Abrindo projeto…" : "Projeto"}>
      <div className="mx-auto max-w-xl px-4 py-16">
        {state.status === "loading" ? (
          <p className="flex items-center gap-2 text-ink-2" role="status">
            <Spinner /> Carregando o projeto salvo…
          </p>
        ) : (
          <div role="alert" className="rounded-lg border border-line bg-surface p-5">
            <p className="font-medium">{state.status === "missing" ? "Projeto não encontrado neste navegador." : "Não foi possível abrir o projeto."}</p>
            <p className="mt-1 text-sm text-ink-2">
              {state.status === "missing"
                ? "Os projetos ficam salvos no navegador em que foram criados. Se ele veio de outro computador, importe o JSON exportado."
                : state.message}
            </p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
              Voltar aos projetos
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
