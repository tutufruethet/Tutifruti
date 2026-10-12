// Roda um comando no CI e, se falhar, publica o fim da saída como anotação do
// GitHub (::error). Assim o resultado aparece no check run sem precisar baixar logs.
// Uso: node scripts/ci-step.mjs <nome> -- <comando...>
import { spawn } from 'node:child_process';

const separator = process.argv.indexOf('--');
const name = process.argv[2] ?? 'passo';
const command = process.argv.slice(separator + 1).join(' ');
const TAIL_LINES = 80;
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

const lines = [];
const child = spawn(command, { shell: true, env: process.env });

function collect(chunk, stream) {
  stream.write(chunk);
  for (const line of chunk.toString().split('\n')) {
    if (line.trim()) lines.push(line.replace(ANSI, ''));
  }
  if (lines.length > TAIL_LINES * 4) lines.splice(0, lines.length - TAIL_LINES);
}

child.stdout.on('data', (chunk) => collect(chunk, process.stdout));
child.stderr.on('data', (chunk) => collect(chunk, process.stderr));

child.on('close', (code) => {
  if (code !== 0) {
    const tail = lines.slice(-TAIL_LINES).join('\n');
    const escaped = tail.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    console.log(`::error title=${name} falhou (código ${code})::${escaped}`);
  }
  process.exit(code ?? 1);
});
