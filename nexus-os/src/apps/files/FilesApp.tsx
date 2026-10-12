'use client';

import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { APP_IDS } from '@/apps/catalog';
import { downloadBlob, errorMessage } from '@/apps/shared/download';
import { useVfsQuery } from '@/apps/shared/use-vfs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import { formatBytes, formatDateTime } from '@/lib/format';
import { openApp } from '@/os/apps/launch';
import type { AppProps } from '@/os/apps/types';
import { isTextMime } from '@/os/vfs/memory';
import { uniqueName } from '@/os/vfs/names';
import { basename, dirname, resolvePath, ROOT, segments } from '@/os/vfs/path';
import { HOME, PLACE_LABELS, PLACES } from '@/os/vfs/seed';
import type { VfsNode, VfsPath } from '@/os/vfs/types';

type Draft = { mode: 'folder' | 'file'; value: string } | { mode: 'rename'; target: VfsNode; value: string };

function sortNodes(nodes: readonly VfsNode[]): VfsNode[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, 'pt-BR', { numeric: true });
  });
}

export default function FilesApp({ bridge, launchArgs }: AppProps) {
  const fs = bridge.fs;
  const [cwd, setCwd] = useState<VfsPath>(() => (launchArgs?.path ? resolvePath(launchArgs.path) : HOME));
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<VfsPath | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<VfsNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const search = query.trim();
  const listing = useVfsQuery(fs, cwd, `${cwd}|${search}`, () =>
    search ? fs.search(search, { root: cwd, limit: 200 }) : fs.list(cwd),
  );
  const nodes = sortNodes(listing.data ?? []);
  const selectedNode = nodes.find((node) => node.path === selected) ?? null;

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  function navigate(path: VfsPath) {
    setCwd(path);
    setSelected(null);
    setQuery('');
    setDraft(null);
  }

  function open(node: VfsNode) {
    if (node.kind === 'directory') return navigate(node.path);
    if (isTextMime(node.mime)) return void openApp(APP_IDS.notes, { path: node.path });
    void run(async () => downloadBlob(await fs.readBlob(node.path), node.name));
  }

  function submitDraft(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const name = draft.value.trim();
    if (!name) return setDraft(null);
    void run(async () => {
      if (draft.mode === 'rename') {
        const target = resolvePath(name, dirname(draft.target.path));
        if (target !== draft.target.path) await fs.move(draft.target.path, target);
        setSelected(target);
      } else {
        const path = resolvePath(name, cwd);
        if (draft.mode === 'folder') await fs.mkdir(path);
        else await fs.writeText(path, '');
        setSelected(path);
      }
      setDraft(null);
    });
  }

  async function importFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    await run(async () => {
      for (const file of Array.from(files)) {
        const name = await uniqueName(fs, cwd, file.name);
        await fs.writeBlob(resolvePath(name, cwd), file);
      }
      await bridge.notifications.notify({
        title: files.length === 1 ? 'Arquivo importado' : `${files.length} arquivos importados`,
        body: `Em ${cwd}`,
        source: 'Files',
        tone: 'success',
      });
    });
    if (importInput.current) importInput.current.value = '';
  }

  function onRowKeyDown(event: KeyboardEvent, node: VfsNode) {
    if (event.key === 'Enter') open(node);
    else if (event.key === 'F2') setDraft({ mode: 'rename', target: node, value: node.name });
    else if (event.key === 'Delete') setPendingDelete(node);
  }

  const crumbs = segments(cwd);

  return (
    <div data-testid="files-app" className="@container flex h-full text-sm">
      <aside className="hidden w-40 shrink-0 flex-col gap-0.5 border-r border-line p-2 @2xl:flex">
        <p className="type-label px-2 pb-1 pt-1 text-slate">Lugares</p>
        {(Object.keys(PLACES) as (keyof typeof PLACES)[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate(PLACES[key])}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 text-left',
              cwd === PLACES[key] ? 'text-paper' : 'text-paper/56 hover:text-paper',
            )}
          >
            <Icon name="folder" />
            {PLACE_LABELS[key]}
          </button>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Pasta acima"
            disabled={cwd === ROOT}
            onClick={() => navigate(dirname(cwd))}
          >
            <Icon name="up" />
          </Button>
          <nav aria-label="Caminho" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto font-mono text-xs">
            <button type="button" onClick={() => navigate(ROOT)} className="text-paper/56 hover:text-paper">
              /
            </button>
            {crumbs.map((part, index) => {
              const path = `/${crumbs.slice(0, index + 1).join('/')}` as VfsPath;
              return (
                <span key={path} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => navigate(path)}
                    className={index === crumbs.length - 1 ? 'text-paper' : 'text-paper/56 hover:text-paper'}
                  >
                    {part}
                  </button>
                  {index < crumbs.length - 1 ? <span className="text-slate">/</span> : null}
                </span>
              );
            })}
          </nav>
          <label className="flex h-8 w-40 items-center gap-1.5 border-b border-line px-1 focus-within:border-signal">
            <Icon name="search" className="text-slate" />
            <input
              data-testid="files-search"
              aria-label="Buscar nesta pasta"
              placeholder="Buscar"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-paper/40"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
          <Button data-testid="files-new-folder" size="sm" variant="ghost" onClick={() => setDraft({ mode: 'folder', value: 'Nova pasta' })}>
            <Icon name="folder" /> Nova pasta
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft({ mode: 'file', value: 'novo.txt' })}>
            <Icon name="file" /> Novo arquivo
          </Button>
          <Button size="sm" variant="ghost" onClick={() => importInput.current?.click()}>
            <Icon name="upload" /> Importar
          </Button>
          <input
            ref={importInput}
            type="file"
            multiple
            hidden
            aria-label="Importar arquivos"
            data-testid="files-import-input"
            onChange={(event) => void importFiles(event.target.files)}
          />
          {selectedNode ? (
            <span className="ml-auto flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => open(selectedNode)}>
                Abrir
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Renomear"
                onClick={() => setDraft({ mode: 'rename', target: selectedNode, value: selectedNode.name })}
              >
                <Icon name="pencil" />
              </Button>
              {selectedNode.kind === 'file' ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Exportar"
                  onClick={() => void run(async () => downloadBlob(await fs.readBlob(selectedNode.path), selectedNode.name))}
                >
                  <Icon name="download" />
                </Button>
              ) : null}
              <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => setPendingDelete(selectedNode)}>
                <Icon name="trash" />
              </Button>
            </span>
          ) : null}
        </div>

        {draft ? (
          <form onSubmit={submitDraft} className="flex items-center gap-2 border-b border-line px-3 py-2">
            <span className="type-label text-slate">
              {draft.mode === 'folder' ? 'Nova pasta' : draft.mode === 'file' ? 'Novo arquivo' : 'Renomear'}
            </span>
            <input
              data-testid="files-draft-input"
              aria-label="Nome"
              autoFocus
              value={draft.value}
              onFocus={(event) => event.target.select()}
              onChange={(event) => setDraft({ ...draft, value: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  setDraft(null);
                }
              }}
              className="h-8 min-w-0 flex-1 border-b border-signal bg-transparent outline-none"
            />
            <Button type="submit" size="sm" variant="primary">
              OK
            </Button>
          </form>
        ) : null}

        {error ? (
          <p role="alert" className="border-b border-line px-3 py-2 text-paper">
            <span className="text-signal">Erro:</span> {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full table-fixed border-collapse">
            <thead className="type-label sticky top-0 bg-ink text-left text-slate">
              <tr>
                <th className="px-3 py-2 font-normal">Nome</th>
                <th className="hidden w-24 px-3 py-2 text-right font-normal @md:table-cell">Tamanho</th>
                <th className="hidden w-36 px-3 py-2 font-normal @xl:table-cell">Modificado</th>
              </tr>
            </thead>
            <tbody data-testid="files-list">
              {nodes.map((node) => (
                <tr
                  key={node.path}
                  tabIndex={0}
                  aria-selected={node.path === selected}
                  data-name={node.name}
                  onClick={() => setSelected(node.path)}
                  onDoubleClick={() => open(node)}
                  onKeyDown={(event) => onRowKeyDown(event, node)}
                  className={cn(
                    'cursor-default border-b border-line outline-none focus-visible:bg-paper/[0.06]',
                    node.path === selected ? 'bg-paper/[0.08] text-paper' : 'text-paper/80 hover:bg-paper/[0.04]',
                  )}
                >
                  <td className="px-3 py-1.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon name={node.kind === 'directory' ? 'folder' : 'file'} className="text-slate" />
                      <span className="truncate">{node.name}</span>
                      {search ? <span className="truncate font-mono text-xs text-slate">{dirname(node.path)}</span> : null}
                    </span>
                  </td>
                  <td className="hidden px-3 py-1.5 text-right tabular-nums text-paper/56 @md:table-cell">
                    {node.kind === 'file' ? formatBytes(node.size) : '—'}
                  </td>
                  <td className="hidden px-3 py-1.5 tabular-nums text-paper/56 @xl:table-cell">
                    {formatDateTime(node.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!listing.loading && nodes.length === 0 ? (
            <p className="px-3 py-6 text-paper/56">{search ? 'Nada encontrado.' : 'Pasta vazia.'}</p>
          ) : null}
        </div>

        <p className="type-label border-t border-line px-3 py-1.5 text-slate">
          {nodes.length} {nodes.length === 1 ? 'item' : 'itens'} · {search ? `busca em ${basename(cwd) || '/'}` : cwd}
        </p>
      </div>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogTitle>Excluir {pendingDelete?.kind === 'directory' ? 'pasta' : 'arquivo'}?</DialogTitle>
          <DialogDescription>
            “{pendingDelete?.name}” {pendingDelete?.kind === 'directory' ? 'e tudo dentro dela ' : ''}vai ser apagado do
            sistema virtual. Não dá para desfazer.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose asChild>
              <Button size="sm">Cancelar</Button>
            </DialogClose>
            <Button
              data-testid="files-confirm-delete"
              size="sm"
              variant="primary"
              onClick={() => {
                const node = pendingDelete;
                setPendingDelete(null);
                if (node) void run(() => fs.remove(node.path, { recursive: true }));
                setSelected(null);
              }}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
