// Formas e texturas procedurais: bola de gelato, casquinha, copinho, granulado, calda.
// Tudo é criado uma vez e compartilhado (geometria e material), nunca dentro do loop.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ---- Ruído e aleatório estável ---------------------------------------------

// Aleatório com semente (mulberry32): o mesmo sabor sempre tem as mesmas pintas.
export function semente(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash3 = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const suave = (t) => t * t * (3 - 2 * t);

function ruido(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = suave(x - xi), yf = suave(y - yi), zf = suave(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  ) * 2 - 1;
}
const fbm = (x, y, z) => ruido(x, y, z) * 0.6 + ruido(x * 2.1, y * 2.1, z * 2.1) * 0.3 + ruido(x * 4.3, y * 4.3, z * 4.3) * 0.1;

// ---- Bola de gelato -----------------------------------------------------------

export const RAIO_BOLA = 0.62;
const FUNDO = -0.6; // abaixo disso a bola achata (assenta na casquinha)

// Deslocamento radial para uma direção unitária n: ondas da colher + a "saia" de baixo.
export function deslocamento(nx, ny, nz) {
  const ang = Math.atan2(nz, nx);
  const ondas = 0.05 * fbm(nx * 2.2 + 3, ny * 2.2, nz * 2.2) + 0.014 * Math.sin(11 * ang + 7 * ny + 2.5 * fbm(nx * 1.4, ny * 1.4, nz * 1.4));
  const saia = 0.11 * Math.exp(-(((ny + 0.47) / 0.11) ** 2)) * (0.72 + 0.28 * Math.sin(9 * ang + 3 * fbm(nx * 3, 1, nz * 3)));
  return 1 + ondas + saia;
}

export function criarGeometriaBola(detalhe = 22) {
  let g = new THREE.IcosahedronGeometry(1, detalhe);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g); // vértices soldados = normais suaves, sem costura
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    v.multiplyScalar(deslocamento(v.x, v.y, v.z));
    if (v.y < FUNDO) v.y = FUNDO + (v.y - FUNDO) * 0.18;
    p.setXYZ(i, v.x * RAIO_BOLA, v.y * RAIO_BOLA, v.z * RAIO_BOLA);
  }
  g.computeVertexNormals();
  return g;
}

// Pontos na superfície da bola (para pintas e granulado), com a normal.
export function pontosNaSuperficie(qtd, rnd, yMin) {
  const out = [];
  while (out.length < qtd) {
    const y = yMin + (1 - yMin) * rnd();
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    const n = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const pos = n.clone().multiplyScalar(deslocamento(n.x, n.y, n.z) * RAIO_BOLA);
    out.push({ pos, n });
  }
  return out;
}

// Pintas: lascas de chocolate, pedaços de fruta ou pistache picado.
const geoPinta = new THREE.IcosahedronGeometry(1, 0);
export function criarPintas(sabor, material) {
  const rnd = semente(sabor.id);
  const tam = sabor.id === 'stracciatella' ? 0.05 : sabor.id === 'morango' ? 0.06 : 0.032;
  const qtd = sabor.id === 'morango' ? 14 : 34;
  const malha = new THREE.InstancedMesh(geoPinta, material, qtd);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  pontosNaSuperficie(qtd, rnd, -0.35).forEach(({ pos, n }, i) => {
    q.setFromUnitVectors(up, n);
    const k = tam * (0.6 + rnd() * 0.8);
    s.set(k * (1 + rnd()), k * 0.35, k);
    m.compose(pos.addScaledVector(n, -k * 0.1), q, s);
    malha.setMatrixAt(i, m);
  });
  return malha;
}

// ---- Casquinha e copinho (torno: LatheGeometry) --------------------------------

function textura(w, h, desenhar, repetir) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  desenhar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repetir);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function criarCasquinha() {
  const perfil = [
    [0.0, -1.78], [0.05, -1.7], [0.2, -1.12], [0.4, -0.38], [0.56, 0.3], [0.6, 0.46],
    [0.66, 0.5], [0.69, 0.58], [0.67, 0.66], [0.61, 0.69], [0.56, 0.62], [0.5, 0.3], [0.3, -0.4], [0.0, -0.6],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(perfil, 72);
  // Waffle: grade em diagonal; a mesma imagem vira cor e relevo.
  const waffle = textura(256, 256, (g, w, h) => {
    g.fillStyle = '#d9a062'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#a5652e'; g.lineWidth = 22;
    for (let i = -w; i < w * 2; i += w / 2) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
    }
    const r = semente('waffle');
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,60,20,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 3, 3); }
  }, [7, 5]);
  const mat = new THREE.MeshStandardMaterial({ map: waffle, bumpMap: waffle, bumpScale: 2.2, roughness: 0.78 });
  return { malha: new THREE.Mesh(geo, mat), topo: 0.6, chao: -1.8 };
}

export function criarCopinho() {
  const perfil = [
    [0.0, -0.86], [0.42, -0.86], [0.45, -0.83], [0.66, 0.44], [0.71, 0.49], [0.71, 0.56], [0.67, 0.58], [0.64, 0.5], [0.43, -0.78], [0.0, -0.79],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(perfil, 72);
  const listras = textura(256, 16, (g, w, h) => {
    g.fillStyle = '#fbf1ea'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ec8597';
    for (let i = 0; i < 8; i++) g.fillRect(i * (w / 8), 0, w / 16, h);
  }, [2, 1]);
  const mat = new THREE.MeshStandardMaterial({ map: listras, roughness: 0.55 });
  return { malha: new THREE.Mesh(geo, mat), topo: 0.52, chao: -0.88 };
}

// ---- Coberturas ---------------------------------------------------------------

// Granulado: um InstancedMesh só, cores por instância.
export function criarGranulado() {
  const geo = new THREE.CapsuleGeometry(0.017, 0.07, 2, 6);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.4 });
  const qtd = 120;
  const malha = new THREE.InstancedMesh(geo, mat, qtd);
  const rnd = semente('granulado');
  const cores = ['#f7f3ea', '#ec8597', '#f4b53f', '#a7bf72', '#7fb6e0', '#5b3423'].map((c) => new THREE.Color(c));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), um = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0), lado = new THREE.Vector3(1, 0, 0);
  pontosNaSuperficie(qtd, rnd, 0.12).forEach(({ pos, n }, i) => {
    q.setFromUnitVectors(up, n);                        // deita na superfície…
    q2.setFromAxisAngle(lado, Math.PI / 2);              // …de lado…
    q.multiply(q2).multiply(new THREE.Quaternion().setFromAxisAngle(up, rnd() * Math.PI)); // …girado ao acaso
    m.compose(pos.addScaledVector(n, 0.012), q, um);
    malha.setMatrixAt(i, m);
    malha.setColorAt(i, cores[i % cores.length]);
  });
  return malha;
}

// Calda: cópia da bola; acima de um limite ondulado ela engorda, abaixo some para dentro.
export function criarCalda(geoBola) {
  const g = geoBola.clone();
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const a = Math.atan2(n.z, n.x);
    const limite = 0.2 - 0.5 * Math.max(0, Math.sin(5 * a + 1.3)) ** 3 - 0.28 * Math.max(0, Math.sin(3 * a + 4)) ** 4;
    v.multiplyScalar(n.y > limite ? 1.035 : 0.9);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({ color: '#3b1c11', roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08 });
  return new THREE.Mesh(g, mat);
}

// ---- Sombra barata ---------------------------------------------------------------

export function criarSombra() {
  const tex = textura(128, 128, (g, w) => {
    const grad = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grad.addColorStop(0, 'rgba(43,24,16,0.55)');
    grad.addColorStop(0.45, 'rgba(43,24,16,0.22)');
    grad.addColorStop(1, 'rgba(43,24,16,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, w);
  }, [1, 1]);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  const malha = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  malha.rotation.x = -Math.PI / 2;
  return malha;
}
