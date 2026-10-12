import type { VfsPath, VirtualFileSystem } from './types';

export const HOME = '/home/nexus' as VfsPath;

export const PLACES = {
  home: HOME,
  documents: '/home/nexus/Documentos' as VfsPath,
  notes: '/home/nexus/Notas' as VfsPath,
  downloads: '/home/nexus/Downloads' as VfsPath,
} as const;

export const PLACE_LABELS: Readonly<Record<keyof typeof PLACES, string>> = {
  home: 'Início',
  documents: 'Documentos',
  notes: 'Notas',
  downloads: 'Downloads',
};

const README = `# NEXUS OS

Este é o seu diretório pessoal. Tudo aqui vive no sistema de arquivos virtual
do NEXUS: nada toca o disco do seu computador.

- Files: navegue, crie pastas, importe e exporte arquivos.
- Terminal: digite \`help\` para ver os comandos.
- Notes: suas notas ficam em ~/Notas.

Por enquanto os arquivos ficam na memória e somem ao recarregar a página.
A persistência (IndexedDB e nuvem) chega na Fase 3.
`;

const FIRST_NOTE = `Primeira nota

As notas salvam sozinhas enquanto você escreve.
Use a busca para achar por título ou por conteúdo.
`;

/** Estrutura inicial do usuário. Idempotente: não sobrescreve o que já existe. */
export async function seedFileSystem(fs: VirtualFileSystem): Promise<void> {
  for (const path of Object.values(PLACES)) await fs.mkdir(path, { recursive: true });
  const readme = `${HOME}/LEIA-ME.md` as VfsPath;
  if (!(await fs.stat(readme))) await fs.writeText(readme, README);
  const note = `${PLACES.notes}/Primeira nota.md` as VfsPath;
  if (!(await fs.stat(note))) await fs.writeText(note, FIRST_NOTE);
}
