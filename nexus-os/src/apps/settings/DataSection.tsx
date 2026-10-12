'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadBlob, errorMessage } from '@/apps/shared/download';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { formatBytes } from '@/lib/format';
import { flushSession } from '@/os/session/manager';
import { useSessionStore } from '@/os/session/store';
import { createBackup, parseBackup, restoreBackup, type Backup } from '@/os/vfs/backup';
import type { SystemBridge } from '@/system/bridge';
import { useSettingsStore } from '@/settings/store';

interface StorageInfo {
  readonly vfs: { usedBytes: number; quotaBytes: number };
  readonly browser: { usage: number; quota: number } | null;
  readonly persisted: boolean | null;
}

async function readStorageInfo(bridge: SystemBridge): Promise<StorageInfo> {
  const vfs = await bridge.fs.usage();
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  const estimate = storage?.estimate ? await storage.estimate().catch(() => null) : null;
  const persisted = storage?.persisted ? await storage.persisted().catch(() => null) : null;
  return {
    vfs,
    browser: estimate ? { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 } : null,
    persisted,
  };
}

/** Settings › Dados e privacidade: uso real, backup e apagar dados do perfil. */
export function DataSection({ bridge }: { bridge: SystemBridge }) {
  const profile = useSessionStore((state) => state.profile);
  const deleteProfileData = useSessionStore((state) => state.deleteProfileData);
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [version, setVersion] = useState(0);
  const [pendingImport, setPendingImport] = useState<Backup | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const guest = profile?.kind === 'guest';

  useEffect(() => {
    let alive = true;
    readStorageInfo(bridge).then((next) => {
      if (alive) setInfo(next);
    });
    return () => {
      alive = false;
    };
  }, [bridge, version]);

  async function exportBackup() {
    try {
      await flushSession();
      const backup = await createBackup(bridge.fs, useSettingsStore.getState().settings);
      const stamp = backup.exportedAt.slice(0, 10);
      downloadBlob(new Blob([JSON.stringify(backup)], { type: 'application/json' }), `nexus-backup-${stamp}.json`);
      setStatus(`Backup exportado: ${backup.entries.length} itens.`);
    } catch (error) {
      setStatus(`Erro ao exportar: ${errorMessage(error)}`);
    }
  }

  async function chooseBackup(file: File | undefined) {
    if (importInput.current) importInput.current.value = '';
    if (!file) return;
    try {
      setPendingImport(parseBackup(await file.text()));
    } catch (error) {
      setStatus(`Erro ao ler o backup: ${errorMessage(error)}`);
    }
  }

  async function confirmImport() {
    const backup = pendingImport;
    setPendingImport(null);
    if (!backup) return;
    try {
      const { files, folders } = await restoreBackup(bridge.fs, backup);
      if (backup.settings) useSettingsStore.getState().replace(backup.settings);
      setStatus(`Backup importado: ${files} arquivos, ${folders} pastas.`);
      setVersion((value) => value + 1);
    } catch (error) {
      setStatus(`Erro ao importar: ${errorMessage(error)}`);
    }
  }

  async function requestPersistence() {
    const granted = await navigator.storage?.persist?.().catch(() => false);
    setStatus(granted ? 'O navegador vai manter os dados.' : 'O navegador não concedeu (ele decide sozinho).');
    setVersion((value) => value + 1);
  }

  return (
    <div data-testid="settings-data" className="flex flex-col gap-5">
      <dl className="grid grid-cols-[12rem_1fr] gap-y-2">
        <dt className="text-paper/56">Perfil</dt>
        <dd>
          {profile?.name ?? '—'} ·{' '}
          {guest ? 'convidado (só memória)' : profile?.kind === 'cloud' ? 'conta na nuvem' : 'salvo neste navegador'}
        </dd>
        <dt className="text-paper/56">Arquivos do NEXUS</dt>
        <dd data-testid="settings-vfs-usage">
          {info ? `${formatBytes(info.vfs.usedBytes)} de ${formatBytes(info.vfs.quotaBytes)}` : '…'}
        </dd>
        <dt className="text-paper/56">Navegador (este site)</dt>
        <dd>{info?.browser ? `${formatBytes(info.browser.usage)} de ${formatBytes(info.browser.quota)}` : 'indisponível'}</dd>
        <dt className="text-paper/56">Armazenamento persistente</dt>
        <dd className="flex items-center gap-3">
          {info?.persisted === null ? 'indisponível' : info?.persisted ? 'sim' : 'não (o navegador pode limpar)'}
          {info?.persisted === false && !guest ? (
            <Button size="sm" variant="ghost" onClick={() => void requestPersistence()}>
              Pedir
            </Button>
          ) : null}
        </dd>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button data-testid="backup-export" size="sm" onClick={() => void exportBackup()}>
          Exportar backup
        </Button>
        <Button size="sm" onClick={() => importInput.current?.click()}>
          Importar backup
        </Button>
        <input
          ref={importInput}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="Arquivo de backup"
          data-testid="backup-import-input"
          onChange={(event) => void chooseBackup(event.target.files?.[0])}
        />
        <Button data-testid="delete-profile-data" size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
          {guest ? 'Sair e apagar tudo' : 'Apagar dados deste perfil'}
        </Button>
      </div>

      {status ? (
        <p role="status" className="text-sm text-paper/70">
          {status}
        </p>
      ) : null}

      <Dialog open={pendingImport !== null} onOpenChange={(open) => !open && setPendingImport(null)}>
        <DialogContent>
          <DialogTitle>Importar backup?</DialogTitle>
          <DialogDescription>
            {pendingImport?.entries.length ?? 0} itens. Arquivos com o mesmo caminho serão substituídos; o resto fica como
            está.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose asChild>
              <Button size="sm">Cancelar</Button>
            </DialogClose>
            <Button size="sm" variant="primary" onClick={() => void confirmImport()}>
              Importar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle>Apagar os dados de {profile?.name}?</DialogTitle>
          <DialogDescription>
            Arquivos, notas, preferências e janelas deste perfil serão apagados deste navegador e você volta para a tela
            de entrada. Não dá para desfazer. Se quiser guardar algo, exporte um backup antes.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose asChild>
              <Button size="sm">Cancelar</Button>
            </DialogClose>
            <Button
              data-testid="confirm-delete-profile"
              size="sm"
              variant="primary"
              onClick={() => {
                setConfirmDelete(false);
                void deleteProfileData();
              }}
            >
              Apagar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
