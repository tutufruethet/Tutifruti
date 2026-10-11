import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GALAXY, SYSTEMS, TYPES } from './data.js';
import { createGalaxy, PALETTE } from './galaxy.js';
import { createSystem, glowTexture } from './system.js';
import { Orbit } from './orbit.js';
import { WorldPass, FinalShader } from './pipeline.js';

const $ = s => document.querySelector(s);
const body = document.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none)').matches;
const small = () => innerWidth <= 820;
const fit = () => Math.min(1.7, Math.max(1, 1.15 / (innerWidth / innerHeight)));
const high = !touch && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const DEBUG = location.hash.includes('debug');
const pad2 = n => String(n + 1).padStart(2, '0');
const wait = ms => new Promise(r => setTimeout(r, ms));
if (touch) body.classList.add('touch');

/* ---------- índice (existe com ou sem WebGL) ---------- */
$('#sysList').innerHTML = SYSTEMS.map((s, i) => `
  <li>
    <span class="label n">(${pad2(i)})</span>
    <button class="name" data-go="${i}">${s.name}<span>↗</span></button>
    <span class="label kind">${s.star} · ${s.planets.length} planetas</span>
    <div class="pl">${s.planets.map((p, j) => `<button class="u" data-go="${i}:${j}">${p.name}</button>`).join('')}</div>
  </li>`).join('');
$('#openIndex .num').textContent = `(${SYSTEMS.reduce((n, s) => n + s.planets.length, 0)})`;

const gl = document.createElement('canvas').getContext('webgl2');
if (!gl) {
  body.classList.add('nogl', 'in');
  $('.loader').classList.add('done');
  $('#heroText').textContent = 'Seu navegador não abriu o 3D. O atlas continua aqui embaixo, em lista: cinco sistemas e dezessete planetas.';
  $('#hero').classList.add('in');
  throw new Error('WebGL2 indisponível: atlas em modo lista');
}

/* ---------- loader ---------- */
const loader = $('.loader'), num = $('.loader__num');
let progress = 0, shown = 0;
(function count() {
  shown += (progress - shown) * 0.12;
  num.textContent = Math.round(shown * 100);
  if (!loader.classList.contains('done')) requestAnimationFrame(count);
})();
progress = 0.2;
await Promise.race([
  Promise.all(['400 40px "Instrument Sans"', '500 16px "Instrument Sans"', 'italic 40px "Instrument Serif"'].map(f => document.fonts.load(f))),
  wait(2500),
]);
progress = 0.5;

/* ---------- renderer e composição ---------- */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const dpr = () => Math.min(devicePixelRatio, high ? 1.75 : 1.5);
renderer.setPixelRatio(dpr());
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;

const quality = { points: high ? 170000 : 70000, octaves: high ? 5 : 4, bloom: high };
const px = () => renderer.getPixelRatio();
const glow = glowTexture();

const composer = new EffectComposer(renderer);
const world = new WorldPass(PALETTE.accent.clone().multiplyScalar(2.2));
composer.addPass(world);
let bloom = null;
if (quality.bloom) { bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.5, 1.0); composer.addPass(bloom); }
const final = new ShaderPass(FinalShader);
final.uniforms.uAccent.value.copy(PALETTE.accent);
final.uniforms.uPaper.value.copy(PALETTE.paper);
composer.addPass(final);
composer.addPass(new OutputPass());

/* ---------- vistas: uma cena por escala ---------- */
function makeView(scene, o) {
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 3000);
  const orbit = new Orbit(camera, o);
  if (reduce) orbit.speed = 60;
  return { scene, camera, orbit, shift: { x: 0, y: 0, gx: 0, gy: 0 } };
}

const galaxy = createGalaxy({ count: quality.points, px: px() });
const gView = Object.assign(makeView(galaxy.scene, { r: 150 * fit(), th: 0.5, ph: 1.0, min: 16, max: 240 }), { kind: 'galaxy', obj: galaxy });
gView.orbit.phMax = 1.5; gView.orbit.auto = reduce ? 0 : 0.025;

const sViews = [];
function systemView(i) {
  if (sViews[i]) return sViews[i];
  const s = SYSTEMS[i];
  const obj = createSystem(s, { px: px(), octaves: quality.octaves, glow });
  const v = Object.assign(makeView(obj.scene, { r: obj.radius * 2.2, th: 0.5, ph: 1.12, min: s.starSize * 2.2, max: obj.radius * 6 }), { kind: 'system', index: i, obj });
  v.orbit.auto = reduce ? 0 : 0.012;
  v.labels = makeSystemLabels(i, obj);
  sViews[i] = v;
  return v;
}

/* ---------- rótulos presos aos objetos ---------- */
const labelsRoot = $('#labels');
function tag(html, cls, onClick) {
  const b = document.createElement('button');
  b.className = 'tag ' + (cls || '');
  b.innerHTML = html;
  b.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  labelsRoot.append(b);
  return b;
}
gView.labels = galaxy.markers.map((m, i) => ({ el: tag(`<i>(${pad2(i)})</i>${SYSTEMS[i].name}`, 'ring', () => goSystem(i)), obj: m, hitIndex: i, side: 1.6 }));
function makeSystemLabels(i, obj) {
  const s = SYSTEMS[i];
  return [
    { el: tag(`<i>${s.star}</i>`, 'star', () => goSystem(i)), obj: obj.star, side: s.starSize * 1.5 },
    ...obj.planets.map((p, j) => ({ el: tag(`<i>(${pad2(j)})</i>${p.data.name}`, '', () => goPlanet(i, j)), obj: p.holder, side: p.data.size * 1.35 + 0.3, hitIndex: j })),
  ];
}

const v3 = new THREE.Vector3(), right = new THREE.Vector3();
function placeLabels(view) {
  for (const v of [gView, ...sViews.filter(Boolean)]) if (v !== view) v.labels.forEach(l => l.el.classList.remove('on', 'dim'));
  if (!view) return;
  right.setFromMatrixColumn(view.camera.matrixWorld, 0);
  for (const l of view.labels) {
    l.obj.getWorldPosition(v3);
    v3.addScaledVector(right, l.side);
    v3.project(view.camera);
    const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
    const focused = state.level === 'planet' && l.hitIndex === state.planet && view.kind === 'system';
    l.el.classList.toggle('on', vis && !focused);
    l.el.classList.toggle('dim', state.level === 'planet');
    l.el.classList.toggle('hot', hovered?.view === view && hovered.index === l.hitIndex && l.hitIndex != null);
    if (vis) l.el.style.transform = `translate3d(${((v3.x + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - v3.y) / 2 * innerHeight).toFixed(1)}px,0) translateY(-50%)`;
  }
}

/* ---------- estado e navegação ---------- */
const state = { level: 'galaxy', sys: -1, planet: -1 };
let current = gView, trans = null, explored = false;
world.a = gView;

function startTransition(to) {
  if (current === to) return;
  trans = { a: current, b: to, t: 0, dur: reduce ? 0 : 1.7 };
  world.a = current; world.b = to; world.mix = 0;
  body.classList.add('moving');
}

function explore() {
  if (explored) return;
  explored = true;
  body.classList.add('explored');
  $('#hero').classList.add('gone');
  gView.orbit.goalR = 70 * fit();
  updateUI();
}

function goGalaxy() {
  explore();
  if (current.kind === 'galaxy') return;
  const from = current, i = from.index;
  from.orbit.follow = null; from.orbit.goalTarget.set(0, 0, 0); from.orbit.goalR = from.obj.radius * 7;
  galaxy.markers[i].getWorldPosition(v3);
  gView.orbit.follow = null;
  gView.orbit.set({ target: v3, r: 5 });
  gView.orbit.goalTarget.set(0, 0, 0); gView.orbit.goalR = 70 * fit();
  Object.assign(state, { level: 'galaxy', sys: -1, planet: -1 });
  galaxy.highlight(-1);
  startTransition(gView);
  updateUI();
}

function goSystem(i, planet = -1) {
  explore();
  const to = systemView(i);
  if (current === to) { focusPlanet(planet); return; }
  if (current.kind === 'galaxy') {
    gView.orbit.follow = galaxy.markers[i]; gView.orbit.goalR = 4;
    galaxy.highlight(i);
  } else {
    current.orbit.follow = null; current.orbit.goalTarget.set(0, 0, 0); current.orbit.goalR = current.obj.radius * 8;
  }
  to.orbit.follow = null;
  to.orbit.set({ target: new THREE.Vector3(), r: to.obj.radius * 7, th: to.orbit.th + 0.6, ph: 0.6 });
  to.orbit.goalTh = to.orbit.th - 0.6; to.orbit.goalPh = 1.12;
  state.sys = i;
  startTransition(to);
  focusPlanet(planet, to);
}

function goPlanet(i, j) { goSystem(i, j); }

function focusPlanet(j, view = current) {
  const o = view.orbit, s = SYSTEMS[view.index];
  if (j < 0) {
    o.follow = null; o.goalTarget.set(0, 0, 0);
    o.goalR = view.obj.radius * 2.2 * fit(); o.min = s.starSize * 2.2; o.max = view.obj.radius * 8;
    view.shift.gx = view.shift.gy = 0;
    Object.assign(state, { level: 'system', planet: -1 });
  } else {
    const p = view.obj.planets[j];
    o.follow = p.holder;
    o.min = p.data.size * 1.7; o.max = p.data.size * 24;
    o.goalR = p.data.size * (small() ? 6.4 : 5);
    o.goalPh = Math.min(o.goalPh, 1.25);
    // câmera do lado iluminado, em três quartos: o planeta aparece com dia e noite
    p.holder.getWorldPosition(v3);
    const th = Math.atan2(v3.x, v3.z) + Math.PI - 0.85;
    o.goalTh = th + Math.round((o.goalTh - th) / (Math.PI * 2)) * Math.PI * 2;
    view.shift.gx = small() ? 0 : 0.16;
    view.shift.gy = small() ? 0.26 : 0;
    Object.assign(state, { level: 'planet', planet: j });
  }
  view.obj.focus(j);
  updateUI();
}

function back() {
  if (body.classList.contains('index-open')) return toggleIndex(false);
  if (state.level === 'planet') focusPlanet(-1);
  else if (state.level === 'system') goGalaxy();
}

/* ---------- UI ---------- */
const lv = $('#level');
let lastKey = '';
function updateUI() {
  body.dataset.level = state.level;
  const s = SYSTEMS[state.sys];
  const crumbs = [`<button class="u ${state.level === 'galaxy' ? 'now' : ''}" data-crumb="g">${GALAXY.name}</button>`];
  if (s) crumbs.push(`<span class="sep">/</span><button class="u ${state.level === 'system' ? 'now' : ''}" data-crumb="s">${s.name}</button>`);
  if (state.level === 'planet') crumbs.push(`<span class="sep">/</span><span class="now">${s.planets[state.planet].name}</span>`);
  $('#crumbs').innerHTML = crumbs.join('');

  const key = state.level === 'planet' ? 'p' : state.level + state.sys;
  if (key !== lastKey && state.level !== 'planet') {
    if (state.level === 'galaxy') {
      $('#lvLabel').textContent = '(01) — Galáxia';
      $('#lvTitle').textContent = GALAXY.name;
      $('#lvText').textContent = 'Cinco sistemas marcados com um anel. Clique num deles para descer de escala.';
      $('#lvMeta').textContent = `${GALAXY.kind} · ${GALAXY.scale}`;
    } else {
      $('#lvLabel').textContent = `(02) — Sistema ${pad2(state.sys)}`;
      $('#lvTitle').innerHTML = `${s.name} <span class="serif">${s.star.toLowerCase()}</span>`;
      $('#lvText').textContent = s.text;
      $('#lvMeta').textContent = `${s.planets.length} planetas · ${s.scale}`;
    }
    lv.classList.add('swap'); lv.classList.remove('in');
    void lv.offsetWidth;
    lv.classList.remove('swap');
    setTimeout(() => lv.classList.add('in'), trans ? 650 : 50);
  }
  lastKey = key;

  if (state.level === 'planet') {
    const p = s.planets[state.planet];
    $('#pLabel').textContent = `(03) — Planeta ${pad2(state.planet)} de ${pad2(s.planets.length - 1)} · ${TYPES[p.type]}`;
    $('#pName').textContent = p.name;
    $('#pText').textContent = p.text;
    const fmt = n => n.toLocaleString('pt-BR');
    $('#pRows').innerHTML = [
      ['Sistema', s.name],
      ['Estrela', s.star],
      ['Raio', `${fmt(Math.round(p.size * 6371 / 50) * 50)} km`],
      ['Órbita', `${(p.orbit * 0.13).toFixed(2).replace('.', ',')} UA`],
      ['Ano', `${fmt(p.days)} dias`],
      ['Temperatura', `${p.temp > 0 ? '+' : ''}${fmt(p.temp)} °C`],
      ['Gravidade', `${String(p.g).replace('.', ',')} g`],
      ['Luas', p.moons ? fmt(p.moons) : 'nenhuma'],
      ['Anéis', p.rings ? 'sim' : 'não'],
    ].map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join('');
  }
}

$('#crumbs').addEventListener('click', e => {
  const c = e.target.closest('[data-crumb]')?.dataset.crumb;
  if (c === 'g') goGalaxy();
  if (c === 's') focusPlanet(-1);
});
$('#pPrev').onclick = () => { const n = SYSTEMS[state.sys].planets.length; focusPlanet((state.planet - 1 + n) % n); };
$('#pNext').onclick = () => { const n = SYSTEMS[state.sys].planets.length; focusPlanet((state.planet + 1) % n); };
$('#pUp').onclick = () => focusPlanet(-1);
$('#start').onclick = () => { explore(); canvas.focus({ preventScroll: true }); };

function toggleIndex(open = !body.classList.contains('index-open')) {
  body.classList.toggle('index-open', open);
  const b = $('#openIndex');
  b.setAttribute('aria-expanded', open);
  b.innerHTML = open ? 'Fechar <span aria-hidden="true">✕</span>' : `Índice <span class="num">(${SYSTEMS.reduce((n, s) => n + s.planets.length, 0)})</span>`;
}
$('#openIndex').onclick = () => toggleIndex();
document.querySelectorAll('[data-open-index]').forEach(b => { b.onclick = () => toggleIndex(true); });
$('#sysList').addEventListener('click', e => {
  const go = e.target.closest('[data-go]')?.dataset.go;
  if (go == null) return;
  const [i, j] = go.split(':').map(Number);
  toggleIndex(false);
  setTimeout(() => goSystem(i, Number.isNaN(j) || j == null ? -1 : j), reduce ? 0 : 350);
});

addEventListener('keydown', e => {
  if (e.key === 'Escape' || (e.key === 'Backspace' && e.target === canvas)) { back(); return; }
  if (e.target.closest?.('button') && e.key === 'Enter') return;
  const n = SYSTEMS[state.sys]?.planets.length;
  if (state.level !== 'galaxy' && !trans && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const d = e.key === 'ArrowRight' ? 1 : -1;
    focusPlanet(state.level === 'system' ? (d > 0 ? 0 : n - 1) : (state.planet + d + n) % n);
  }
  if (e.key === 'i' || e.key === 'I') toggleIndex();
});

/* ---------- gestos: arrastar, pinça, roda, clique ---------- */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointers = new Map();
let down = null, pinch = 0, hovered = null;

function pick(x, y) {
  if (trans) return null;
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, current.camera);
  const hits = current.kind === 'galaxy' ? galaxy.hits : current.obj.hits;
  const hit = raycaster.intersectObjects(hits, false)[0];
  return hit ? { view: current, ...hit.object.userData } : null;
}

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) down = { x: e.clientX, y: e.clientY, moved: 0 };
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); down && (down.moved = 99); }
});
canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId);
  if (!p) {
    if (e.pointerType === 'mouse') { hovered = pick(e.clientX, e.clientY); body.dataset.hover = hovered ? 1 : 0; cursorBig(!!hovered); }
    return;
  }
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch) current.orbit.zoom(pinch / d);
    pinch = d;
    return;
  }
  if (down) {
    down.moved += Math.abs(dx) + Math.abs(dy);
    if (down.moved > 5) { body.classList.add('drag'); current.orbit.rotate(dx, dy); if (down.moved > 40) explore(); }
  }
});
function release(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = 0;
  if (pointers.size) return;
  body.classList.remove('drag');
  if (down && down.moved <= 5 && e.type === 'pointerup') click(e.clientX, e.clientY);
  down = null;
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', e => { e.preventDefault(); current.orbit.zoom(Math.exp(e.deltaY * 0.0012)); if (Math.abs(e.deltaY) > 2) explore(); }, { passive: false });

function click(x, y) {
  const h = pick(x, y);
  if (!h) return;
  if (h.kind === 'system') goSystem(h.index);
  else if (h.kind === 'planet') focusPlanet(h.index);
  else if (h.kind === 'star') focusPlanet(-1);
}

/* ---------- cursor próprio ---------- */
const cursor = $('#cursor');
const cur = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
function cursorBig(on) { cursor.classList.toggle('big', on); }
if (!touch) {
  addEventListener('pointermove', e => { cur.tx = e.clientX; cur.ty = e.clientY; cursor.classList.add('on'); });
  document.addEventListener('pointerleave', () => cursor.classList.remove('on'));
  document.addEventListener('pointerover', e => { if (e.target.closest('button')) cursorBig(true); });
  document.addEventListener('pointerout', e => { if (e.target.closest('button')) cursorBig(!!hovered); });
}

/* ---------- tamanho ---------- */
function resize() {
  renderer.setPixelRatio(dpr());
  renderer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(dpr());
  composer.setSize(innerWidth, innerHeight);
  final.uniforms.uAspect.value = innerWidth / innerHeight;
  for (const v of [gView, ...sViews.filter(Boolean)]) { v.camera.aspect = innerWidth / innerHeight; v.camera.updateProjectionMatrix(); v.obj.setPx(px()); }
  if (state.level === 'planet') focusPlanet(state.planet);
}
addEventListener('resize', resize);
resize();

/* ---------- laço ---------- */
const clock = new THREE.Clock();
let time = reduce ? 14 : 0;
const motion = reduce ? 0 : 1;
let timeScale = 1;

function tickView(v, dt) {
  const s = v.shift, k = 1 - Math.exp(-dt * 3);
  s.x += (s.gx - s.x) * k; s.y += (s.gy - s.y) * k;
  if (reduce) { s.x = s.gx; s.y = s.gy; }
  const W = innerWidth, H = innerHeight;
  if (Math.abs(s.x) + Math.abs(s.y) > 1e-4) v.camera.setViewOffset(W, H, s.x * W, s.y * H, W, H);
  else if (v.camera.view) v.camera.clearViewOffset();
  v.orbit.update(dt);
  if (v.kind === 'galaxy') galaxy.update(dt, time, motion);
  else v.obj.update(dt, time, motion, timeScale);
}

function frame(dt, draw = true) {
  if (!reduce) time += dt;
  timeScale += ((state.level === 'planet' ? 0.12 : 1) - timeScale) * (1 - Math.exp(-dt * 2));
  if (trans) {
    trans.t += dt;
    const p = trans.dur ? Math.min(Math.max((trans.t - 0.35) / (trans.dur - 0.35), 0), 1) : 1;
    world.mix = p >= 1 ? 1 : 1 - Math.pow(2, -9 * p);
    tickView(trans.a, dt); tickView(trans.b, dt);
    if (p >= 1) {
      current = trans.b; world.a = current; world.b = null; world.mix = 0;
      if (trans.a === gView) gView.orbit.follow = null;
      trans = null;
      body.classList.remove('moving');
    }
  } else tickView(current, dt);
  final.uniforms.uTime.value = time;
  if (draw) composer.render(dt);
  placeLabels(trans ? null : current);
  cur.x += (cur.tx - cur.x) * 0.18; cur.y += (cur.ty - cur.y) * 0.18;
  cursor.style.transform = `translate3d(${cur.x}px,${cur.y}px,0)`;
}

updateUI();
progress = 0.9;
frame(1 / 60);
progress = 1;
await wait(reduce ? 0 : 500);
loader.classList.add('done');
$('#hero').classList.add('in');
gView.orbit.goalR = 92 * fit();

if (DEBUG) {
  // gancho de teste: o renderizador por software é lento, então dá para avançar o tempo à mão
  window.atlas = { state, goGalaxy, goSystem, goPlanet, focusPlanet, explore, toggleIndex, step(n = 60, dt = 1 / 30) { for (let i = 0; i < n; i++) frame(dt, i === n - 1); }, get current() { return current; } };
}
if (!location.hash.includes('still')) renderer.setAnimationLoop(() => frame(Math.min(clock.getDelta(), 1 / 20)));
