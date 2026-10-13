"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Copy, FileJson, FileText, FileUp, Printer, RefreshCw, Wand2 } from "lucide-react";
import type { Briefing } from "@/lib/schema";
import { LIMITS } from "@/lib/schema";
import { PROJECT_STATUS } from "@/lib/schema/catalog";
import { nowIso } from "@/lib/schema/factory";
import { parseExportFile } from "@/lib/schema/migrate";
import { buildDevPrompt } from "@/lib/export/prompt";
import { buildJsonExport, buildMarkdown, fileSafeName } from "@/lib/export/markdown";
import { analyzePlan } from "@/lib/plan/analyze";
import { copyText, download } from "@/lib/format";
import { Badge, Button, Dialog, Segmented } from "@/components/ui";
import { useProject } from "@/components/project/ProjectProvider";
import { useToast } from "@/components/toast";

export function DeliveryPage() {
  const { project, update, restore } = useProject();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [importState, setImportState] = useState<{ error: string; details: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const plan = project.plan;
  const dp = project.devPrompt;
  const outdated = !!(dp && project.planUpdatedAt && dp.planUpdatedAt < project.planUpdatedAt);
  const briefingChanged = !!(dp && dp.generatedAt < project.updatedAt && !outdated);
  const issues = plan ? analyzePlan(plan, project.briefing as Briefing) : [];
  const errors = issues.filter((i) => i.level === "erro");

  const generate = () => {
    update((d) => {
      d.devPrompt = { text: buildDevPrompt(d).slice(0, LIMITS.prompt), edited: false, generatedAt: nowIso(), planUpdatedAt: d.planUpdatedAt ?? nowIso() };
    });
    setConfirmRegen(false);
    toast.show({ tone: "ok", message: "Prompt gerado a partir do planejamento atual." });
  };
  const requestGenerate = () => (dp?.edited ? setConfirmRegen(true) : generate());

  const copy = async () => {
    if (!dp) return;
    const ok = await copyText(dp.text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    toast.show(ok ? { tone: "ok", message: "Prompt copiado." } : { tone: "error", message: "Não foi possível copiar. Selecione o texto e copie manualmente." });
  };

  const base = fileSafeName(project.name);

  async function importInto(file: File) {
    if (file.size > LIMITS.importBytes) return setImportState({ error: "Arquivo grande demais. O limite é 2 MB.", details: [] });
    const r = parseExportFile(await file.text());
    if (!r.ok) return setImportState({ error: r.error, details: r.details });
    const snapshot = structuredClone(project);
    // Substitui o conteúdo deste projeto, mantendo o identificador e a URL atuais.
    restore({ ...r.project, id: project.id, createdAt: project.createdAt });
    toast.show({ tone: "ok", message: `Dados de "${r.project.name}" carregados neste projeto.`, action: { label: "Desfazer", run: () => restore(snapshot) } });
  }

  if (!plan)
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <p className="font-medium">Gere o planejamento antes de exportar.</p>
        <Link href={`/projetos/${project.id}/revisao`} className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
          Ir para a revisão
        </Link>
      </div>
    );

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
      <section className="min-w-0" aria-labelledby="prompt-titulo">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="prompt-titulo" className="text-2xl font-semibold tracking-tight">
              Prompt de desenvolvimento
            </h1>
            <p className="mt-1 max-w-[62ch] text-sm text-ink-2">
              Usa a versão atual do planejamento, com todas as suas edições, organizada em 16 partes. Você pode editar o texto antes de copiar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={dp ? "secondary" : "primary"} icon={dp ? <RefreshCw className="size-4" /> : <Wand2 className="size-4" />} onClick={requestGenerate}>
              {dp ? "Gerar de novo" : "Gerar prompt de desenvolvimento"}
            </Button>
            {dp && (
              <Button variant="primary" icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />} onClick={() => void copy()}>
                {copied ? "Copiado" : "Copiar prompt"}
              </Button>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">
            O planejamento tem {errors.length} {errors.length === 1 ? "problema" : "problemas"} (ex.: {errors[0].message.toLowerCase()}). O prompt vai refletir isso;{" "}
            <Link href={`/projetos/${project.id}/planejamento?aba=jornada`} className="font-medium underline">
              corrija antes
            </Link>
            .
          </p>
        )}
        {outdated && (
          <p className="mt-4 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-warn" role="status">
            O planejamento mudou depois que este prompt foi gerado. Gere de novo para incluir as mudanças{dp?.edited ? " (suas edições no prompt serão substituídas)" : ""}.
          </p>
        )}
        {briefingChanged && (
          <p className="mt-4 rounded-md bg-sunken px-3 py-2 text-[13px] text-ink-2">O projeto foi alterado depois deste prompt. Se mudou o briefing, gere de novo.</p>
        )}

        {dp ? (
          <div className="mt-4">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-3">
              <label htmlFor="prompt" className="font-medium text-ink">
                Texto do prompt
              </label>
              <span className="flex items-center gap-2">
                {dp.edited && <Badge tone="ok">Editado por você</Badge>}
                {dp.text.length.toLocaleString("pt-BR")} caracteres · gerado {new Date(dp.generatedAt).toLocaleString("pt-BR")}
              </span>
            </div>
            <textarea
              id="prompt"
              className="field-input min-h-[60dvh] font-mono !text-[13px] leading-relaxed"
              spellCheck={false}
              maxLength={LIMITS.prompt}
              value={dp.text}
              onChange={(e) =>
                update((d) => {
                  if (d.devPrompt) {
                    d.devPrompt.text = e.target.value;
                    d.devPrompt.edited = true;
                  }
                })
              }
            />
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-dashed border-line-strong bg-surface px-5 py-8">
            <p className="font-medium">Nenhum prompt gerado ainda.</p>
            <p className="mt-1 max-w-prose text-sm text-ink-2">
              O prompt traz contexto, objetivo, público, oferta, direção visual concreta, mapa de páginas, seções, CTAs, funcionalidades, integrações, celular, acessibilidade, SEO, materiais, restrições e critérios de conclusão.
            </p>
          </div>
        )}
      </section>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <section className="rounded-lg border border-line bg-surface p-4" aria-labelledby="exportar">
          <h2 id="exportar" className="text-sm font-semibold">
            Exportar
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">Os arquivos refletem os dados atuais do projeto.</p>
          <div className="mt-3 flex flex-col gap-2">
            <Button className="justify-start" icon={<FileText className="size-4" />} onClick={() => download(`${base}-planejamento.md`, buildMarkdown(project), "text/markdown;charset=utf-8")}>
              Planejamento em Markdown
            </Button>
            <Button className="justify-start" icon={<FileJson className="size-4" />} onClick={() => download(`${base}.siteplan.json`, buildJsonExport(project), "application/json")}>
              Projeto em JSON
            </Button>
            <Link
              href={`/projetos/${project.id}/imprimir`}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3.5 text-sm font-medium hover:border-ink-3 hover:bg-ground"
            >
              <Printer className="size-4" /> Versão para imprimir ou salvar em PDF
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-4" aria-labelledby="importar">
          <h2 id="importar" className="text-sm font-semibold">
            Importar JSON neste projeto
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">Substitui os dados atuais pelos do arquivo (com desfazer). Para importar como projeto novo, use a tela de projetos.</p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Arquivo JSON"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void importInto(f);
            }}
          />
          <Button size="sm" className="mt-3" icon={<FileUp className="size-4" />} onClick={() => fileRef.current?.click()}>
            Escolher arquivo
          </Button>
        </section>

        <section className="rounded-lg border border-line bg-surface p-4" aria-labelledby="status">
          <h2 id="status" className="text-sm font-semibold">
            Status do projeto
          </h2>
          <div className="mt-3">
            <Segmented
              size="sm"
              name="status"
              legend="Status do projeto"
              value={project.status}
              options={PROJECT_STATUS.filter((s) => s.key !== "briefing")}
              onChange={(v) => update((d) => void (d.status = v))}
            />
          </div>
        </section>
      </aside>

      <Dialog
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        title="Substituir o prompt editado?"
        description="Você editou o texto do prompt. Gerar de novo substitui essas edições pelo conteúdo atual do planejamento."
        footer={
          <>
            <Button onClick={() => setConfirmRegen(false)}>Manter minhas edições</Button>
            <Button variant="danger" onClick={generate}>
              Gerar de novo
            </Button>
          </>
        }
      />
      <Dialog
        open={!!importState}
        onClose={() => setImportState(null)}
        title="Não foi possível importar"
        description={importState?.error}
        footer={<Button onClick={() => setImportState(null)}>Fechar</Button>}
      >
        {importState?.details.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
            {importState.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        ) : null}
      </Dialog>
    </div>
  );
}
