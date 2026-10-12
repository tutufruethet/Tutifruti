import { resolvePath } from './path';
import type { VfsPath, VirtualFileSystem } from './types';

/** "nota.md" → ["nota", ".md"]; arquivos sem extensão ou ocultos ficam inteiros. */
export function splitExtension(name: string): [string, string] {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
}

/** Nome livre na pasta: "nota.md", "nota (2).md", "nota (3).md"... */
export async function uniqueName(fs: VirtualFileSystem, directory: VfsPath, wanted: string): Promise<string> {
  const [base, extension] = splitExtension(wanted);
  let candidate = wanted;
  for (let n = 2; await fs.stat(resolvePath(candidate, directory)); n += 1) {
    candidate = `${base} (${n})${extension}`;
  }
  return candidate;
}
