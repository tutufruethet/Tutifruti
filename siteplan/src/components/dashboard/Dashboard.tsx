"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileUp, Plus, Search, Trash2 } from "lucide-react";
import type { Project, ProjectSummary } from "@/lib/schema";
import { LIMITS } from "@/lib/schema";
import { labelOf, PROJECT_STATUS } from "@/lib/schema/catalog";
import { newId, newProject, nowIso, sampleProject } from "@/lib/schema/factory";
import { parseExportFile } from "@/lib/schema/migrate";
import { SEGMENTS, type SegmentKey } from "@/lib/schema/segments";
import { getRepository } from "@/lib/storage/indexeddb";
import { buildJsonExport, fileSafeName } from "@/lib/export/markdown";
import { download, relativeTime } from "@/lib/format";
import { AppShell, PROJECTS_CHANGED } from "@/components/shell/AppShell";
import { Badge, Button, Dialog, Field, IconButton, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { Stack3D } from "@/components/Stack3D";

const notifyChanged = () => window.dispatchEvent(new Event(PROJECTS_CHANGED));
const STATUS_TONE = { briefing: "neutral", planejamento: "accent", pronto: "ok" } as const;

export function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<ProjectSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<ProjectSummary | null>(null);
  const [importError, setImportError] = useState<{ error: string; details: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    getRepository()
      .list()
      .then((l) => {
        setList(l);
        setLoadError(null);
      })
      .catch((e: Error) => setLoadError(e.message));

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!list) return null;
    return q ? list.filter((p) => `${p.name} ${p.segment}`.toLowerCase().includes(q)) : list;
  }, [list, query]);

  async function create(p: Project) {
    try {
      await getRepository().save(p);
      notifyChanged();
      router.push(`/projetos/${p.id}/briefing`);
    } catch (e) {
      toast.show({ tone: "error", message: e instanceof Error ? e.message : "Não foi possível criar o projeto." });
    }
  }

  async function onImport(file: File) {
    if (file.size > LIMITS.importBytes) {
      setImportError({ error: `Arquivo grande demais (${(file.size / 1_000_000).toFixed(1)} MB). O limite é 2 MB.`, details: [] });
      return;
    }
    const result = parseExportFile(await file.text());
    if (!result.ok) {
      setImportError({ error: result.error, details: result.details });
      return;
    }
    const p = result.project;
    const repo = getRepository();
    if (await repo.get(p.id).catch(() => null)) {
      // Já existe: importa como cópia para não sobrescrever o projeto local.
      p.id = newId("prj");
      p.name = `${p.name} (importado)`.slice(0, LIMITS.short);
    }
    p.updatedAt = nowIso();
    await repo.save(p);
    notifyChanged();
    await load();
    toast.show({ tone: "ok", message: `"${p.name}" importado.`, action: { label: "Abrir", run: () => router.push(`/projetos/${p.id}`) } });
  }

  async function exportProject(id: string) {
    const p = await getRepository().get(id);
    if (p) download(`${fileSafeName(p.name)}.siteplan.json`, buildJsonExport(p), "application/json");
  }

  async function remove(summary: ProjectSummary) {
    const repo = getRepository();
    const snapshot = await repo.get(summary.id);
    await repo.remove(summary.id);
    setToDelete(null);
    notifyChanged();
    await load();
    toast.show({
      tone: "info",
      message: `"${summary.name}" excluído.`,
      action: snapshot
        ? {
            label: "Desfazer",
            run: async () => {
              await repo.save(snapshot);
              notifyChanged();
              load();
            },
          }
        : undefined,
    });
  }

  const actions = (
    <>
      <Button size="sm" variant="ghost" icon={<FileUp className="size-4" />} onClick={() => fileRef.current?.click()} className="max-sm:hidden">
        Importar JSON
      </Button>
      <Button size="sm" variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
        Novo projeto
      </Button>
    </>
  );

  return (
    <AppShell title="Projetos" actions={actions}>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="Arquivo JSON do projeto"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onImport(f);
        }}
      />
      <div className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <section className="grid items-center gap-6 border-b border-line pb-8 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="max-w-xl">
            <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] sm:text-[34px]">Do briefing ao prompt de desenvolvimento.</h1>
            <p className="mt-3 text-[15px] text-ink-2">
              Preencha o briefing do cliente, revise as lacunas e gere um planejamento com páginas, seções, textos, jornadas e materiais.
              Tudo fica salvo neste navegador e pode ser editado antes de exportar.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                Novo projeto
              </Button>
              <Button onClick={() => void create(sampleProject())}>Abrir exemplo: clínica odontológica</Button>
              <Button variant="ghost" className="sm:!hidden" icon={<FileUp className="size-4" />} onClick={() => fileRef.current?.click()}>
                Importar JSON
              </Button>
            </div>
          </div>
          <Stack3D className="hidden h-[240px] md:block" />
        </section>

        <section aria-labelledby="lista" className="pt-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="lista" className="text-lg font-semibold">
              Projetos recentes
            </h2>
            <label className="relative w-full sm:w-72">
              <span className="sr-only">Buscar projetos</span>
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
              <input
                type="search"
                className="field-input !pl-8"
                placeholder="Buscar por nome ou segmento"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={80}
              />
            </label>
          </div>

          <div className="mt-4">
            {loadError ? (
              <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                <p className="font-medium">Não foi possível ler os projetos salvos.</p>
                <p className="mt-1">{loadError} Verifique se o navegador permite armazenamento local (o modo anônimo pode bloquear).</p>
                <Button size="sm" className="mt-3" onClick={() => void load()}>
                  Tentar de novo
                </Button>
              </div>
            ) : filtered === null ? (
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface" aria-label="Carregando projetos">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="flex items-center gap-4 px-4 py-4">
                    <div className="wire-bar w-48 animate-pulse" />
                    <div className="wire-bar ml-auto w-20 animate-pulse" />
                  </li>
                ))}
              </ul>
            ) : list && list.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line-strong bg-surface px-5 py-8">
                <p className="font-medium">Nenhum projeto ainda.</p>
                <p className="mt-1 max-w-prose text-sm text-ink-2">
                  Crie um projeto para começar o briefing, abra o exemplo da clínica odontológica para ver o fluxo inteiro, ou importe um JSON exportado pelo SitePlan.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-ink-2">Nenhum projeto encontrado para “{query}”.</p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {filtered.map((p) => (
                  <li key={p.id} className="group relative flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-ground/70">
                    <div className="min-w-0 flex-1">
                      <Link href={`/projetos/${p.id}`} className="block truncate font-medium text-ink after:absolute after:inset-0 hover:text-accent-strong">
                        {p.name}
                      </Link>
                      <p className="mt-0.5 truncate text-[13px] text-ink-3">
                        {p.segment}
                        {p.pageCount ? ` · ${p.pageCount} páginas` : ""}
                      </p>
                    </div>
                    <div className="hidden w-36 text-right text-[13px] text-ink-3 sm:block">
                      <time dateTime={p.updatedAt} title={new Date(p.updatedAt).toLocaleString("pt-BR")}>
                        Editado {relativeTime(p.updatedAt)}
                      </time>
                    </div>
                    <Badge tone={STATUS_TONE[p.status]} className="w-[118px] justify-center max-sm:w-auto">
                      {labelOf(PROJECT_STATUS, p.status)}
                    </Badge>
                    <div className="relative z-10 flex gap-0.5">
                      <IconButton label={`Exportar ${p.name} em JSON`} onClick={() => void exportProject(p.id)}>
                        <Download className="size-4" />
                      </IconButton>
                      <IconButton label={`Excluir ${p.name}`} onClick={() => setToDelete(p)} className="hover:!bg-danger-soft hover:!text-danger">
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <NewProjectDialog open={creating} onClose={() => setCreating(false)} onCreate={(name, seg, other) => void create(newProject(name, seg, other))} />

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Excluir projeto?"
        description={toDelete ? `“${toDelete.name}” será removido deste navegador. Você pode desfazer logo em seguida.` : undefined}
        footer={
          <>
            <Button onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => toDelete && void remove(toDelete)}>
              Excluir projeto
            </Button>
          </>
        }
      />

      <Dialog
        open={!!importError}
        onClose={() => setImportError(null)}
        title="Não foi possível importar"
        description={importError?.error}
        footer={<Button onClick={() => setImportError(null)}>Fechar</Button>}
      >
        {importError?.details.length ? (
          <>
            <p className="text-sm font-medium">Problemas encontrados:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
              {importError.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </>
        ) : null}
      </Dialog>
    </AppShell>
  );
}

function NewProjectDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string, seg: SegmentKey, other: string) => void }) {
  const [name, setName] = useState("");
  const [segment, setSegment] = useState<SegmentKey>("outro");
  const [other, setOther] = useState("");
  const [error, setError] = useState<string | undefined>();
  useEffect(() => {
    if (open) {
      setName("");
      setSegment("outro");
      setOther("");
      setError(undefined);
    }
  }, [open]);
  const submit = () => {
    if (!name.trim()) return setError("Informe o nome da empresa ou do projeto.");
    onCreate(name.trim(), segment, other.trim());
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Novo projeto"
      description="Só o nome é obrigatório. O resto entra no briefing, em etapas."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="novo-projeto">
            Criar e abrir briefing
          </Button>
        </>
      }
    >
      <form
        id="novo-projeto"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Nome da empresa ou do projeto" error={error}>
          {(p) => (
            <input
              {...p}
              className="field-input"
              autoFocus
              maxLength={LIMITS.short}
              placeholder="Ex.: Clínica Sorriso Pinheiros"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(undefined);
              }}
            />
          )}
        </Field>
        <Field label="Segmento" hint="Define o modelo usado no modo demonstração. Pode mudar depois.">
          {(p) => (
            <select {...p} className="field-input" value={segment} onChange={(e) => setSegment(e.target.value as SegmentKey)}>
              {SEGMENTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        {segment === "outro" && (
          <Field label="Qual segmento?" optional>
            {(p) => <input {...p} className={cx("field-input")} maxLength={LIMITS.short} placeholder="Ex.: Escola de idiomas" value={other} onChange={(e) => setOther(e.target.value)} />}
          </Field>
        )}
      </form>
    </Dialog>
  );
}
