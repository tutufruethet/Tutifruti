import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Physics } from './physics.js';
import { Input } from './input.js';
import { DayCycle } from './cycle.js';
import { Car } from './car.js';
import { World, ZONES, ISLAND } from './world.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches;
const quality = { high: !touch && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const wait = ms => new Promise(r => setTimeout(r, ms));
const FOTOS = '../portfolio/fotos/';

document.body.dataset.level = '1';
document.body.classList.add('lock');
if (!document.createElement('canvas').getContext('webgl2')) {
  document.body.classList.remove('lock');
  $('.loader').classList.add('done');
  $$('[data-go="2"]').forEach(b => { b.disabled = true; b.textContent = 'Seu navegador não abre o 3D'; });
  $$('[data-reveal],[data-fade]').forEach(el => el.classList.add('in'));
  throw new Error('WebGL2 indisponível: nível 2 desativado');
}

/* ---------- loader ---------- */
const loader = $('.loader'), num = $('.loader__num');
let progress = 0, shown = 0;
const manager = new THREE.LoadingManager();
manager.onProgress = (_, loaded, total) => { progress = loaded / total; };
const loaded = new Promise(r => { manager.onLoad = r; });
(function count() {
  shown = damp(shown, progress, 6, 1 / 60);
  num.textContent = Math.round(shown * 100);
  if (!loader.classList.contains('done')) requestAnimationFrame(count);
})();

await Promise.race([
  Promise.all(['500 40px "Instrument Sans"', '600 40px "Instrument Sans"', 'italic 40px "Instrument Serif"'].map(f => document.fonts.load(f))),
  wait(2500),
]);

/* ---------- renderer ---------- */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.high, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, quality.high ? 1.75 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 1000);
const physics = new Physics(ISLAND - 1.5);
const input = new Input();
const cycle = new DayCycle(240);
const world = new World({ scene, physics, manager, quality, renderer });
const car = new Car(scene);
car.reset(0, 2, Math.PI);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
if (quality.high) composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.45, 1));
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* ---------- levels ---------- */
let level = 1, busy = false, modalOpen = false;
const wipe = $('.wipe');

async function goLevel(n, zoneId) {
  if (busy || n === level) return;
  busy = true;
  closeModal();
  wipe.querySelector('em').textContent = n;
  wipe.className = 'wipe in';
  await wait(reduce ? 0 : 650);
  level = n;
  document.body.dataset.level = n;
  $('#l1').hidden = n === 2;
  $('#hud').hidden = n === 1;
  input.enabled = n === 2;
  scrollTo(0, 0);
  if (n === 2) {
    const z = ZONES.find(q => q.id === zoneId);
    if (z) car.reset(z.x, z.z + z.r + 3.5, Math.PI);
    else car.reset(0, 2, Math.PI);
    $('#hud').focus();
  }
  wipe.className = 'wipe out';
  await wait(reduce ? 0 : 700);
  wipe.className = 'wipe';
  busy = false;
}

$$('[data-go]').forEach(b => b.addEventListener('click', () => goLevel(+b.dataset.go, b.dataset.zone)));
input.on(' ', () => car.jump());
input.on('r', () => car.reset(0, 2, Math.PI));
input.on('n', () => cycle.next());
input.on('enter', () => activeZone && openZone(activeZone));
addEventListener('keydown', e => { if (e.key === 'Escape') modalOpen ? closeModal() : level === 2 && goLevel(1); });
$$('[data-time]').forEach(b => b.addEventListener('click', () => cycle.next()));
addEventListener('wheel', e => { if (level === 2 && !modalOpen) zoom = Math.min(1.6, Math.max(0.65, zoom + e.deltaY * 0.0008)); }, { passive: true });

/* ---------- zones + prompt + modal ---------- */
let activeZone = null;
const prompt = $('#prompt');
function setZone(z) {
  if (z === activeZone) return;
  activeZone = z;
  world.activeZone = z;
  prompt.hidden = !z;
  if (!z) return;
  $('#pLabel').textContent = z.n ? `(${z.n}) — ${z.fotos.length} foto${z.fotos.length > 1 ? 's' : ''}` : z.sub;
  $('#pTitle').textContent = z.title;
  $('#pOpen').hidden = z.kind === 'play';
  $('#pOpen').textContent = z.id === 'nivel1' ? 'Ir para o nível 1 ↵' : z.kind === 'series' ? 'Ver fotos ↵' : 'Abrir ↵';
}
$('#pOpen').addEventListener('click', () => activeZone && openZone(activeZone));

const modal = $('#modal'), modalBody = $('#modalBody');
function openZone(z) {
  if (z.id === 'nivel1') return goLevel(1);
  if (z.kind === 'play') return;
  if (z.kind === 'series') {
    modalBody.innerHTML = `<p class="label">(${z.n}) — ${z.fotos.length} foto${z.fotos.length > 1 ? 's' : ''}</p><h2 class="modal__title">${z.title}</h2>
      <div class="strip">${z.fotos.map(([f, , cap], i) => `<figure><img src="${FOTOS + f}" alt="${cap}"><figcaption><span>${cap}</span><span>${String(i + 1).padStart(2, '0')}</span></figcaption></figure>`).join('')}</div>`;
  } else {
    modalBody.innerHTML = $(`#tpl-${z.id}`).innerHTML;
  }
  modal.hidden = false;
  modalOpen = true;
  input.enabled = false;
  input.keys.clear();
  $('#modalClose').focus();
}
function closeModal() {
  if (!modalOpen) return;
  modal.hidden = true;
  modalOpen = false;
  input.enabled = level === 2;
}
$('#modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

/* ---------- touch controls ---------- */
if (touch) {
  document.body.classList.add('touch');
  input.bindJoystick($('#joy'), $('#knob'));
  $('#bJump').addEventListener('pointerdown', () => car.jump());
  const boost = $('#bBoost');
  boost.addEventListener('pointerdown', () => { input.touchBoost = true; });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) boost.addEventListener(ev, () => { input.touchBoost = false; });
}

/* ---------- level 1 page ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
let heroVisible = true;
new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe($('.hero'));

const mp = $('[data-words]');
mp.innerHTML = mp.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
const words = [...mp.querySelectorAll('.w')];
const lightWords = () => {
  const r = mp.getBoundingClientRect();
  const k = Math.min(Math.max((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.4), 0), 1);
  const lit = reduce ? words.length : Math.round(k * words.length);
  words.forEach((w, i) => w.classList.toggle('on', i < lit));
};

const preview = $('.preview'), previewImg = preview.querySelector('img'), pv = { x: 0, y: 0 }, mouse = { x: 0, y: 0 };
addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
$$('.idx button').forEach(b => {
  b.addEventListener('pointerenter', () => { previewImg.src = FOTOS + b.dataset.img; preview.classList.add('on'); });
  b.addEventListener('pointerleave', () => preview.classList.remove('on'));
});

const clock = $('.clock');
const tick = () => {
  clock.textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date()) + ' BRT';
  $$('[data-phase]').forEach(el => { el.textContent = cycle.phase; });
};
tick();
setInterval(tick, 500);

/* ---------- camera ---------- */
let zoom = 1;
const camPos = new THREE.Vector3(70, 52, 80), camLook = new THREE.Vector3(0, 0, -4);
const desired = new THREE.Vector3(), target = new THREE.Vector3();
function updateCamera(dt, t) {
  if (level === 2) {
    const z = zoom * (camera.aspect < 0.8 ? 1.75 : 1);
    target.set(car.x + car.vx * 0.3, 0.8, car.z + car.vz * 0.3);
    desired.set(target.x, target.y + 17 * z, target.z + 16 * z);
    camPos.x = damp(camPos.x, desired.x, 4, dt);
    camPos.y = damp(camPos.y, desired.y, 3, dt);
    camPos.z = damp(camPos.z, desired.z, 4, dt);
    camLook.lerp(target, 1 - Math.exp(-6 * dt));
  } else {
    const a = reduce ? 0.7 : 0.7 + t * 0.035;
    const r = camera.aspect < 0.8 ? 92 : 70;
    desired.set(Math.sin(a) * r, camera.aspect < 0.8 ? 70 : 50, Math.cos(a) * r);
    camPos.lerp(desired, 1 - Math.exp(-1.6 * dt));
    camLook.lerp(target.set(0, 0, -4), 1 - Math.exp(-2 * dt));
  }
  camera.position.copy(camPos);
  if (car.shake > 0.01) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * car.shake, (Math.random() - 0.5) * car.shake, 0));
  camera.lookAt(camLook);
  scene.fog.near = damp(scene.fog.near, level === 2 ? 48 : 150, 2, dt);
  scene.fog.far = damp(scene.fog.far, level === 2 ? 150 : 420, 2, dt);
}

/* ---------- loop ---------- */
const clockT = new THREE.Clock();
let dustTimer = 0;
function frame() {
  const dt = Math.min(clockT.getDelta(), 1 / 30);
  const t = clockT.elapsedTime;
  cycle.update(level === 1 && reduce ? 0 : dt);

  if (level === 2) {
    car.update(dt, input, cycle.state.night);
    physics.step(dt, car);
    let best = null;
    for (const z of ZONES) if (Math.hypot(car.x - z.x, car.z - z.z) < z.r - 0.4) best = z;
    setZone(best);
    dustTimer -= dt;
    const skid = Math.abs(car.lateral) > 2.8 || (Math.abs(car.accel) > 12 && Math.abs(car.speed) < 10);
    if (car.grounded && (skid || car.landing > 0.5) && dustTimer < 0) {
      for (const p of car.rearWheels()) world.puff(p, 0.6 + Math.min(Math.abs(car.lateral) / 8, 0.8));
      dustTimer = 0.05;
    }
  } else {
    car.update(dt, { throttle: 0, steer: 0, boost: false }, cycle.state.night);
    setZone(null);
    lightWords();
    pv.x = damp(pv.x, mouse.x, 10, dt); pv.y = damp(pv.y, mouse.y, 10, dt);
    preview.style.transform = `translate(${pv.x}px,${pv.y}px)`;
  }

  updateCamera(dt, t);
  world.update(dt, t, cycle, car, camera, level);
  if (level === 2 || heroVisible) composer.render();
  requestAnimationFrame(frame);
}

if (location.hash === '#debug') window.ilha = { car, cycle, world, physics, goLevel, openZone, ZONES };
renderer.compile(scene, camera);
await Promise.race([loaded, wait(6000)]);
progress = 1;
await wait(reduce ? 0 : 500);
loader.classList.add('done');
document.body.classList.remove('lock');
document.querySelectorAll('.hero[data-reveal]').forEach(el => el.classList.add('in'));
document.querySelectorAll('[data-reveal]:not(.in)').forEach(el => io.observe(el));
requestAnimationFrame(frame);
