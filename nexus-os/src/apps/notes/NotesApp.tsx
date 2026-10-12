'use client';

import { useEffect, useState } from 'react';
import { errorMessage } from '@/apps/shared/download';
import { useVfsQuery } from '@/apps/shared/use-vfs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import type { AppProps } from '@/os/apps/types';
import { isTextMime } from '@/os/vfs/memory';
import { splitExtension, uniqueName } from '@/os/vfs/names';
import { basename, dirname, resolvePath } from '@/os/vfs/path';
import { PLACES } from '@/os/vfs/seed';
import type { VfsFile, VfsPath } from '@/os/vfs/types';

const AUTOSAVE_MS = 600;

interface Doc {
  readonly path: VfsPath;
  readonly body: string;
  readonly dirty: boolean;
}

function titleOf(path: VfsPath): string {
  return splitExtension(basename(path))[0];
}

export default function NotesApp({ bridge, launchArgs }: AppProps) {
  const fs = bridge.fs;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<VfsPath | null>(null);
  const [appliedLaunch, setAppliedLaunch] = useState<string | undefined>(undefined);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [title, setTitle] = useState<{ path: VfsPath; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Aberto pelo Files com um arquivo: seleciona (ajuste de estado durante a renderização).
  const requested = launchArgs?.path;
  if (requested !== appliedLaunch) {
    setAppliedLaunch(requested);
    if (requested) setSelected(resolvePath(requested));
  }

  const search = query.trim();
  const listing = useVfsQuery(fs, PLACES.notes, `notes|${search}`, async () => {
    const nodes = search ? await fs.search(search, { root: PLACES.notes }) : await fs.list(PLACES.notes);
    return nodes
      .filter((node): node is VfsFile => node.kind === 'file' && isTextMime(node.mime))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  });
  const notes = listing.data ?? [];
  const current = selected ?? (search ? null : (notes[0]?.path ?? null));

  // Carrega o conteúdo quando a nota atual muda.
  useEffect(() => {
    if (!current) return;
    let alive = true;
    fs.readText(current).then(
      (body) => {
        if (alive) setDoc({ path: current, body, dirty: false });
      },
      (failure: unknown) => {
        if (alive) setError(errorMessage(failure));
      },
    );
    return () => {
      alive = false;
    };
  }, [current, fs]);

  // Salvamento automático: 600 ms depois da última tecla.
  useEffect(() => {
    if (!doc?.dirty) return;
    const { path, body } = doc;
    const timer = window.setTimeout(() => {
      fs.writeText(path, body).then(
        () => setDoc((latest) => (latest && latest.path === path && latest.body === body ? { ...latest, dirty: false } : latest)),
        (failure: unknown) => setError(errorMessage(failure)),
      );
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [doc, fs]);

  const editing = doc && doc.path === current ? doc : null;

  async function flush() {
    if (doc?.dirty) await fs.writeText(doc.path, doc.body);
  }

  async function select(path: VfsPath) {
    try {
      await flush();
      setSelected(path);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  async function createNote() {
    try {
      await flush();
      const name = await uniqueName(fs, PLACES.notes, 'Nova nota.md');
      const path = resolvePath(name, PLACES.notes);
      await fs.writeText(path, '');
      setQuery('');
      setSelected(path);
      setTitle({ path, value: titleOf(path) });
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  async function commitTitle() {
    if (!title || !editing || title.path !== editing.path) return setTitle(null);
    const value = title.value.trim().replaceAll('/', '-');
    setTitle(null);
    if (!value || value === titleOf(editing.path)) return;
    try {
      await flush();
      const extension = splitExtension(basename(editing.path))[1] || '.md';
      const directory = dirname(editing.path);
      const name = await uniqueName(fs, directory, `${value}${extension}`);
      const moved = await fs.move(editing.path, resolvePath(name, directory));
      setSelected(moved.path);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  async function deleteNote() {
    if (!editing) return;
    setConfirmDelete(false);
    try {
      await fs.remove(editing.path);
      setDoc(null);
      setSelected(null);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  return (
    <div data-testid="notes-app" className="@container flex h-full text-sm">
      <aside className="flex w-44 shrink-0 flex-col border-r border-line @2xl:w-56">
        <div className="flex items-center gap-1 border-b border-line p-1.5">
          <label className="flex h-8 min-w-0 flex-1 items-center gap-1.5 px-1.5">
            <Icon name="search" className="text-slate" />
            <input
              data-testid="notes-search"
              aria-label="Buscar notas"
              placeholder="Buscar"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full min-w-0 bg-transparent outline-none placeholder:text-paper/40"
            />
          </label>
          <Button data-testid="notes-new" size="icon" variant="ghost" aria-label="Nova nota" onClick={() => void createNote()}>
            <Icon name="plus" />
          </Button>
        </div>
        <ul aria-label="Notas" className="min-h-0 flex-1 overflow-y-auto">
          {notes.map((note) => (
            <li key={note.path}>
              <button
                type="button"
                aria-current={note.path === current ? 'true' : undefined}
                onClick={() => void select(note.path)}
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 border-b border-line px-3 py-2 text-left',
                  note.path === current ? 'bg-paper/[0.06] text-paper' : 'text-paper/70 hover:text-paper',
                )}
              >
                <span className="w-full truncate">{titleOf(note.path)}</span>
                <span className="type-label text-slate">{formatDateTime(note.updatedAt)}</span>
              </button>
            </li>
          ))}
          {!listing.loading && notes.length === 0 ? (
            <li className="px-3 py-4 text-paper/56">{search ? 'Nada encontrado.' : 'Nenhuma nota ainda.'}</li>
          ) : null}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {editing ? (
          <>
            <header className="flex items-center gap-2 border-b border-line px-4 py-2">
              <input
                data-testid="notes-title"
                aria-label="Título da nota"
                value={title && title.path === editing.path ? title.value : titleOf(editing.path)}
                onChange={(event) => setTitle({ path: editing.path, value: event.target.value })}
                onBlur={() => void commitTitle()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
                className="min-w-0 flex-1 bg-transparent text-lg font-medium tracking-[-0.02em] outline-none"
              />
              <span data-testid="notes-status" className="type-label text-slate" aria-live="polite">
                {editing.dirty ? 'Salvando…' : 'Salvo'}
              </span>
              <Button size="icon" variant="ghost" aria-label="Excluir nota" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" />
              </Button>
            </header>
            <textarea
              data-testid="notes-body"
              aria-label="Texto da nota"
              value={editing.body}
              onChange={(event) => setDoc({ path: editing.path, body: event.target.value, dirty: true })}
              placeholder="Escreva aqui."
              spellCheck
              className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 text-base leading-relaxed text-paper outline-none placeholder:text-paper/40"
            />
            <p className="type-label truncate border-t border-line px-4 py-1.5 text-slate">{editing.path}</p>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-start justify-center gap-3 p-6">
            <p className="text-paper/56">{current ? 'Abrindo…' : 'Escolha uma nota ou crie uma nova.'}</p>
            {current ? null : (
              <Button size="sm" variant="primary" onClick={() => void createNote()}>
                Nova nota
              </Button>
            )}
          </div>
        )}
        {error ? (
          <p role="alert" className="border-t border-line px-4 py-2">
            <span className="text-signal">Erro:</span> {error}
          </p>
        ) : null}
      </section>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle>Excluir nota?</DialogTitle>
          <DialogDescription>“{editing ? titleOf(editing.path) : ''}” vai ser apagada. Não dá para desfazer.</DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose asChild>
              <Button size="sm">Cancelar</Button>
            </DialogClose>
            <Button size="sm" variant="primary" onClick={() => void deleteNote()}>
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
