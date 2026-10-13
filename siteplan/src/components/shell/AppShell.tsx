"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ClipboardList, FileOutput, FolderKanban, LayoutList, ListChecks, Menu, X } from "lucide-react";
import type { ProjectSummary } from "@/lib/schema";
import { getRepository } from "@/lib/storage/indexeddb";
import { relativeTime } from "@/lib/format";
import { cx, IconButton } from "@/components/ui";
import { useAiStatus } from "@/components/useAiStatus";

export const PROJECTS_CHANGED = "siteplan:projects-changed";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 3.5 21 8l-9 4.5L3 8z" fill="var(--color-accent)" />
      <path d="m3 12 9 4.5 9-4.5" fill="none" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m3 16 9 4.5 9-4.5" fill="none" stroke="var(--color-ink-3)" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export const PLAN_TABS = [
  { key: "visao", label: "Visão geral" },
  { key: "paginas", label: "Mapa de páginas" },
  { key: "secoes", label: "Seções" },
  { key: "jornada", label: "Jornada" },
  { key: "materiais", label: "Conteúdo pendente" },
  { key: "requisitos", label: "Requisitos" },
] as const;

type ProjectNav = { id: string; name: string; segment: string; hasPlan: boolean; briefingStep: number };

function useRecent() {
  const [list, setList] = useState<ProjectSummary[] | null>(null);
  useEffect(() => {
    const load = () =>
      getRepository()
        .list()
        .then(setList)
        .catch(() => setList([]));
    load();
    window.addEventListener(PROJECTS_CHANGED, load);
    return () => window.removeEventListener(PROJECTS_CHANGED, load);
  }, []);
  return list;
}

function SidebarContent({ project, onNavigate }: { project?: ProjectNav; onNavigate?: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const recent = useRecent();
  const ai = useAiStatus();
  const tab = search.get("aba") ?? "visao";
  const base = project ? `/projetos/${project.id}` : "";

  const item = (href: string, label: string, icon: ReactNode, active: boolean, disabled?: string) =>
    disabled ? (
      <span className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-ink-3/70" title={disabled} aria-disabled="true">
        {icon}
        {label}
      </span>
    ) : (
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150",
          active ? "bg-accent-soft font-medium text-accent-strong" : "text-ink-2 hover:bg-sunken hover:text-ink",
        )}
      >
        {icon}
        {label}
      </Link>
    );

  return (
    <div className="flex h-full flex-col gap-6 px-3 py-4">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2 px-2.5 text-[17px] font-semibold tracking-tight">
        <Logo className="size-6" />
        SitePlan
      </Link>

      <nav aria-label="Principal" className="flex flex-col gap-0.5">
        {item("/", "Projetos", <FolderKanban className="size-4" />, pathname === "/")}
      </nav>

      {project && (
        <nav aria-label="Etapas do projeto" className="flex flex-col gap-0.5">
          <p className="truncate px-2.5 pb-1 text-[13px] font-semibold text-ink" title={project.name}>
            {project.name}
          </p>
          {item(`${base}/briefing`, "Briefing", <ClipboardList className="size-4" />, pathname.endsWith("/briefing"))}
          {item(`${base}/revisao`, "Revisão e geração", <ListChecks className="size-4" />, pathname.endsWith("/revisao"))}
          {item(
            `${base}/planejamento`,
            "Planejamento",
            <LayoutList className="size-4" />,
            false,
            project.hasPlan ? undefined : "Gere o planejamento na etapa de revisão",
          )}
          {project.hasPlan && (
            <div className="ml-[18px] flex flex-col gap-0.5 border-l border-line pl-2">
              {PLAN_TABS.map((t) => (
                <Link
                  key={t.key}
                  href={`${base}/planejamento?aba=${t.key}`}
                  onClick={onNavigate}
                  aria-current={pathname.endsWith("/planejamento") && tab === t.key ? "page" : undefined}
                  className={cx(
                    "rounded-md px-2.5 py-1 text-[13px] transition-colors duration-150",
                    pathname.endsWith("/planejamento") && tab === t.key ? "bg-accent-soft font-medium text-accent-strong" : "text-ink-2 hover:bg-sunken hover:text-ink",
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          )}
          {item(
            `${base}/entrega`,
            "Prompt e exportação",
            <FileOutput className="size-4" />,
            pathname.endsWith("/entrega"),
            project.hasPlan ? undefined : "Disponível depois de gerar o planejamento",
          )}
        </nav>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <p className="px-2.5 text-[13px] font-semibold text-ink">Recentes</p>
        {recent === null ? (
          <div className="flex flex-col gap-2 px-2.5 py-1" aria-label="Carregando projetos">
            <div className="wire-bar w-3/4 animate-pulse" />
            <div className="wire-bar w-1/2 animate-pulse" />
          </div>
        ) : recent.length === 0 ? (
          <p className="px-2.5 text-[13px] text-ink-3">Nenhum projeto ainda.</p>
        ) : (
          <ul className="flex flex-col gap-0.5 overflow-y-auto">
            {recent.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projetos/${p.id}`}
                  onClick={onNavigate}
                  className={cx(
                    "block rounded-md px-2.5 py-1.5 transition-colors duration-150 hover:bg-sunken",
                    project?.id === p.id && "bg-sunken",
                  )}
                >
                  <span className="block truncate text-[13px] text-ink">{p.name}</span>
                  <span className="block truncate text-xs text-ink-3">{relativeTime(p.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="px-2.5 text-xs leading-snug text-ink-3">
        {ai === null ? "Verificando IA…" : ai.enabled ? `IA disponível no servidor (${ai.model}).` : "Sem chave de IA: geração em modo demonstração."}
      </p>
    </div>
  );
}

/**
 * Estrutura de todas as telas: barra lateral no desktop, gaveta e barra inferior no celular.
 */
export function AppShell({
  project,
  title,
  actions,
  children,
  mobileNav,
}: {
  project?: ProjectNav;
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  mobileNav?: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-surface lg:block print:hidden" aria-label="Navegação">
        <SidebarContent project={project} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden" role="dialog" aria-modal="true" aria-label="Navegação">
          <button type="button" aria-label="Fechar navegação" className="absolute inset-0 bg-ink/35" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-[300px] overflow-y-auto bg-surface shadow-xl [animation:drawer-in_260ms_var(--ease-out)]">
            <IconButton label="Fechar navegação" className="absolute top-3 right-3" onClick={() => setDrawer(false)}>
              <X className="size-4" />
            </IconButton>
            <SidebarContent project={project} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur-sm sm:px-5 print:hidden">
          <IconButton label="Abrir navegação" className="lg:hidden" onClick={() => setDrawer(true)}>
            <Menu className="size-5" />
          </IconButton>
          <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </header>
        <main id="conteudo" className={cx("min-w-0 flex-1", !!mobileNav && "pb-20 lg:pb-0")}>
          {children}
        </main>
        {mobileNav && <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden print:hidden">{mobileNav}</div>}
      </div>
    </div>
  );
}
