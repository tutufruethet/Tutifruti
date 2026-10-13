// Sem WebGL: a mesma montagem em SVG. A página continua útil e bonita.

import { SABOR } from './estado.js';

const NS = 'http://www.w3.org/2000/svg';

export function criarFallback(container) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 300');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('palco-svg');
  container.appendChild(svg);

  function atualizar(estado) {
    const casquinha = estado.base === 'casquinha';
    const topo = casquinha ? 168 : 190;
    let s = `<defs><pattern id="waffle" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="14" height="14" fill="#d9a062"/><path d="M0 0H14M0 0V14" stroke="#a5652e" stroke-width="3"/></pattern></defs>
      <ellipse cx="100" cy="${casquinha ? 288 : 262}" rx="${casquinha ? 26 : 46}" ry="6" fill="#2b1810" opacity=".16"/>`;
    s += casquinha
      ? `<path d="M64 ${topo} L100 285 L136 ${topo} Z" fill="url(#waffle)"/><rect x="60" y="${topo - 6}" width="80" height="10" rx="5" fill="#c8874a"/>`
      : `<path d="M58 ${topo} L72 260 H128 L142 ${topo} Z" fill="#fbf1ea"/>
         ${[66, 84, 102, 120].map((x) => `<path d="M${x} ${topo} L${x + 4} 260 H${x + 9} L${x + 7} ${topo} Z" fill="#ec8597"/>`).join('')}
         <rect x="55" y="${topo - 5}" width="90" height="8" rx="4" fill="#fbf1ea" stroke="#ec8597"/>`;
    estado.bolas.forEach((id, i) => {
      const y = topo - 14 - i * 40;
      s += `<circle cx="100" cy="${y}" r="34" fill="${SABOR[id].cor}"/>
            <path d="M68 ${y + 10} q8 8 16 0 q8 8 16 0 q8 8 16 0 q8 8 16 0" fill="none" stroke="${SABOR[id].cor}" stroke-width="7" stroke-linecap="round"/>`;
    });
    if (estado.bolas.length && estado.cobertura !== 'nenhuma') {
      const y = topo - 14 - (estado.bolas.length - 1) * 40;
      s += estado.cobertura === 'calda'
        ? `<path d="M70 ${y - 12} q30 -30 60 0 v6 q-4 10 -8 0 q-6 14 -12 0 q-8 18 -14 0 q-6 10 -12 0 q-6 12 -14 0 Z" fill="#3b1c11"/>`
        : [...Array(14)].map((_, k) => `<rect x="${78 + ((k * 37) % 44)}" y="${y - 26 + ((k * 23) % 18)}" width="8" height="3" rx="1.5"
             fill="${['#f7f3ea', '#ec8597', '#f4b53f', '#a7bf72', '#7fb6e0'][k % 5]}" transform="rotate(${(k * 53) % 180} ${82 + ((k * 37) % 44)} ${y - 25 + ((k * 23) % 18)})"/>`).join('');
    }
    svg.innerHTML = s;
  }

  return { atualizar, info: () => ({ pronto: true, quadros: 0, rodando: false, fallback: true }) };
}
