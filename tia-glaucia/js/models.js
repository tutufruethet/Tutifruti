// Peças 3D do site: livro aberto, lápis, letras e números.
// Tudo é geometria simples feita no código (sem arquivos de modelo), para carregar rápido.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { GLYPHS } from './glyphs.js';

export const COR = {
  lilas: '#b6a0ef',
  lilasForte: '#8467d6',
  lilasClaro: '#e6ddfb',
  amarelo: '#f6d36a',
  creme: '#fff8ea',
  papel: '#fffcf5',
  tinta: '#2a2338',
  madeira: '#efcf9f',
  grafite: '#3b3448',
  metal: '#d8d2e4',
};

// Plástico de brinquedo: cor chapada com um verniz leve.
export function plastico(cor, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: cor, roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.32, ...extra,
  });
}

export function fosco(cor, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85, metalness: 0, ...extra });
}

// ---------- Letras ----------
function shapesDoGlifo(ch) {
  const g = GLYPHS[ch];
  const sp = new THREE.ShapePath();
  const t = g.d.split(' ');
  for (let i = 0; i < t.length;) {
    const c = t[i++];
    const n = () => parseFloat(t[i++]);
    if (c === 'M') sp.moveTo(n(), n());
    else if (c === 'L') sp.lineTo(n(), n());
    else if (c === 'Q') sp.quadraticCurveTo(n(), n(), n(), n());
    else if (c === 'C') sp.bezierCurveTo(n(), n(), n(), n(), n(), n());
  }
  return sp.toShapes();
}

export function letra(ch, cor, { tamanho = 1, profundidade = 0.2, curvas = 8 } = {}) {
  const geo = new THREE.ExtrudeGeometry(shapesDoGlifo(ch), {
    depth: profundidade, curveSegments: curvas,
    bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.022, bevelSegments: 3,
  });
  geo.center();
  geo.scale(tamanho, tamanho, tamanho);
  const m = new THREE.Mesh(geo, plastico(cor));
  m.castShadow = true;
  return m;
}

// ---------- Lápis ----------
// Ponta na origem, corpo subindo em +Y. Comprimento total ~2,1.
export function lapis({ cor = COR.amarelo, borracha = COR.lilas } = {}) {
  const g = new THREE.Group();
  const add = (geo, mat, y) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y; m.castShadow = true; g.add(m); return m;
  };
  const r = 0.09;
  add(new THREE.ConeGeometry(0.03, 0.08, 20).rotateX(Math.PI), fosco(COR.grafite, { roughness: 0.5 }), 0.04);
  add(new THREE.CylinderGeometry(r * 0.96, 0.03, 0.24, 6), fosco(COR.madeira, { roughness: 0.8, flatShading: true }), 0.2);
  add(new THREE.CylinderGeometry(r, r, 1.46, 6), plastico(cor, { flatShading: true }), 0.32 + 0.73);
  add(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.17, 28), new THREE.MeshStandardMaterial({ color: COR.metal, roughness: 0.3, metalness: 0.7 }), 1.86);
  for (const y of [1.81, 1.91]) {
    add(new THREE.TorusGeometry(r * 1.06, 0.012, 8, 28).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: COR.metal, roughness: 0.25, metalness: 0.8 }), y);
  }
  add(new THREE.CapsuleGeometry(r * 0.98, 0.1, 6, 20), plastico(borracha, { roughness: 0.6, clearcoat: 0.1 }), 2.02);
  return g;
}

// ---------- Livro aberto ----------
export const LIVRO = { W: 1.45, D: 2.0 };

// Altura da folha em função da distância à lombada (0 → 1): afunda no vinco e assenta.
export function alturaDaFolha(t) {
  return 0.03 + 0.14 * Math.sin(Math.min(t * 1.9, 1) * Math.PI / 2) - 0.025 * t * t;
}

function texturaBorda() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#f7efdd'; x.fillRect(0, 0, 8, 64);
  x.fillStyle = '#e8dcc4';
  for (let y = 0; y < 64; y += 4) x.fillRect(0, y, 8, 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function metade(texturaFolha, bordaMat, capaMat) {
  const { W, D } = LIVRO;
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(W, 1, D, 48, 1, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + W / 2;
    p.setX(i, x);
    p.setY(i, p.getY(i) > 0 ? alturaDaFolha(x / W) : 0);
  }
  geo.computeVertexNormals();
  const folha = new THREE.MeshStandardMaterial({ color: '#ffffff', map: texturaFolha, roughness: 0.92 });
  const miolo = new THREE.Mesh(geo, [bordaMat, bordaMat, folha, bordaMat, bordaMat, bordaMat]);
  miolo.castShadow = true; miolo.receiveShadow = true;
  g.add(miolo);
  const capa = new THREE.Mesh(new RoundedBoxGeometry(W + 0.1, 0.06, D + 0.16, 3, 0.028), capaMat);
  capa.position.set((W + 0.1) / 2 - 0.02, -0.032, 0);
  capa.castShadow = true; capa.receiveShadow = true;
  g.add(capa);
  return g;
}

// Devolve o livro e uma função que leva um ponto do papel (pixels da textura) para o mundo.
export function livro({ esquerda, direita, capa = COR.lilas }) {
  const borda = new THREE.MeshStandardMaterial({ map: texturaBorda(), roughness: 0.95 });
  const capaMat = plastico(capa, { roughness: 0.55, clearcoat: 0.25 });
  const grupo = new THREE.Group();

  const dobraEsq = new THREE.Group();
  const metEsq = metade(esquerda, borda, capaMat);
  metEsq.rotation.y = Math.PI;
  dobraEsq.add(metEsq);
  const dobraDir = new THREE.Group();
  const metDir = metade(direita, borda, capaMat);
  dobraDir.add(metDir);

  const lombada = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, LIVRO.D + 0.16, 20).rotateX(Math.PI / 2), capaMat);
  lombada.position.y = -0.05;
  lombada.castShadow = true;
  grupo.add(dobraEsq, dobraDir, lombada);

  const abertura = 0.09;
  // aberto: 0 = fechado, 1 = aberto
  function abrir(a) {
    dobraEsq.rotation.z = -abertura;
    dobraDir.rotation.z = THREE.MathUtils.lerp(Math.PI - abertura - 0.04, abertura, a);
  }
  abrir(1);

  const tmp = new THREE.Vector3();
  function pontoNaFolha(px, py, cw, ch, sobe = 0, alvo = new THREE.Vector3()) {
    const u = px / cw;
    tmp.set(u * LIVRO.W, alturaDaFolha(u) + 0.004 + sobe, (py / ch) * LIVRO.D - LIVRO.D / 2);
    metDir.updateWorldMatrix(true, false);
    return alvo.copy(tmp).applyMatrix4(metDir.matrixWorld);
  }

  return { grupo, abrir, pontoNaFolha, dobraDir };
}

// ---------- Escrita à mão ----------
// Traços em coordenadas SVG (M, L, C absolutos). Viram listas de pontos com comprimento acumulado.
export function amostrarTraco(d, passo = 0.6) {
  const t = d.replace(/,/g, ' ').trim().split(/\s+/);
  const pts = [];
  let x = 0, y = 0;
  const push = (px, py) => pts.push([px, py]);
  for (let i = 0; i < t.length;) {
    const c = t[i++];
    const n = () => parseFloat(t[i++]);
    if (c === 'M') { x = n(); y = n(); push(x, y); }
    else if (c === 'L') {
      const x1 = n(), y1 = n();
      const k = Math.max(2, Math.ceil(Math.hypot(x1 - x, y1 - y) / passo));
      for (let j = 1; j <= k; j++) push(x + (x1 - x) * j / k, y + (y1 - y) * j / k);
      x = x1; y = y1;
    } else if (c === 'C') {
      const a = [x, y, n(), n(), n(), n(), n(), n()];
      const est = Math.hypot(a[2] - a[0], a[3] - a[1]) + Math.hypot(a[4] - a[2], a[5] - a[3]) + Math.hypot(a[6] - a[4], a[7] - a[5]);
      const k = Math.max(4, Math.ceil(est / passo));
      for (let j = 1; j <= k; j++) {
        const s = j / k, m = 1 - s;
        push(
          m * m * m * a[0] + 3 * m * m * s * a[2] + 3 * m * s * s * a[4] + s * s * s * a[6],
          m * m * m * a[1] + 3 * m * m * s * a[3] + 3 * m * s * s * a[5] + s * s * s * a[7],
        );
      }
      x = a[6]; y = a[7];
    }
  }
  const comp = [0];
  for (let i = 1; i < pts.length; i++) comp.push(comp[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, comp, total: comp[comp.length - 1] };
}

export function pontoNoTraco(tr, dist) {
  const { pts, comp } = tr;
  if (dist <= 0) return pts[0];
  if (dist >= tr.total) return pts[pts.length - 1];
  let lo = 0, hi = comp.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (comp[m] < dist) lo = m; else hi = m; }
  const f = (dist - comp[lo]) / (comp[hi] - comp[lo] || 1);
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f];
}

// "abc" cursivo e "123", desenhados à mão para o lápis escrever.
export const ESCRITA = {
  abc: 'M 31 39 C 26 33, 14 34, 11 45 C 8 56, 16 63, 24 59 C 28 57, 31 50, 32 40 C 31 48, 31 58, 35 61 C 38 63, 42 61, 45 57 C 50 47, 56 30, 57 18 C 58 10, 52 8, 50 15 C 48 24, 47 46, 47 60 C 49 50, 55 43, 61 44 C 67 46, 66 58, 58 61 C 53 63, 50 59, 55 56 C 61 52, 70 46, 80 41 C 76 38, 70 44, 71 53 C 72 61, 82 62, 89 57',
  um: 'M 10 22 L 18 14 L 18 46',
  dois: 'M 30 20 C 32 12, 46 12, 46 21 C 46 30, 34 38, 28 46 L 48 46',
  tres: 'M 58 16 C 62 11, 76 12, 74 21 C 73 27, 66 29, 63 29 C 70 29, 78 33, 77 40 C 76 49, 62 50, 57 44',
};
