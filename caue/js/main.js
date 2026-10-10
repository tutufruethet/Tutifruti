import { initPage, revealPage, bump, onStats, phrasesHTML } from './pagina.js';
import { FRASES } from './dados.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches;
const quality = { high: !touch && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const wait = ms => new Promise(r => setTimeout(r, ms));

document.body.dataset.level = '1';
if (!document.createElement('canvas').getContext('webgl2')) {
  initPage({});
  document.body.classList.remove('lock');
  $('.loader').classList.add('done');
  $$('[data-go="2"]').forEach(b => { b.disabled = true; b.textContent = 'Seu navegador não abre o 3D'; });
  $$('[data-reveal],[data-fade]').forEach(el => el.classList.add('in'));
  throw new Error('WebGL2 indisponível: nível 2 desativado');
}

const THREE = await import('three');
const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js');
const { Physics } = await import('./physics.js');
const { Input } = await import('./input.js');
const { DayCycle } = await import('./cycle.js');
const { Car } = await import('./car.js');
const { World, ZONES, ISLAND, FIELD, POOL } = await import('./world.js');

/* ---------- loader ---------- */
const num = $('.loader__num');
let progress = 0, shown = 0;
const manager = new THREE.LoadingManager();
manager.onProgress = (_, loaded, total) => { progress = loaded / total; };
const loaded = new Promise(r => { manager.onLoad = r; });
(function count() {
  shown = damp(shown, progress, 6, 1 / 60);
  num.textContent = Math.round(shown * 100);
  if (!$('.loader').classList.contains('done')) requestAnimationFrame(count);
})();

await Promise.race([
  Promise.all(['400 40px "Instrument Sans"', '500 40px "Instrument Sans"', 'italic 40px "Instrument Serif"'].map(f => document.fonts.load(f))),
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
const START = [0, 2, Math.PI];
car.reset(...START);

initPage({ phase: () => cycle.phase });
onStats(s => world.setScore(s));

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
if (quality.high) composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.45, 1));
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

let zoom = 1;
const camPos = new THREE.Vector3(78, 58, 88), camLook = new THREE.Vector3(0, 0, -2);
const desired = new THREE.Vector3(), target = new THREE.Vector3();

/* ---------- levels ---------- */
let level = 1, busy = false, modalOpen = false;
const wipe = $('.wipe');

async function goLevel(n, zoneId) {
  if (busy || n === level) return;
  busy = true;
  closeModal();
  wipe.querySelector('span').innerHTML = n === 2 ? 'Indo para a <em>ilha</em>' : 'De volta ao <em>site</em>';
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
    car.reset(...(z ? z.spawn : START));
    sinking = 0; air = 0;
    camPos.set(car.x, 18, car.z + 17);
    camLook.set(car.x, 0.8, car.z);
    $('#hud').focus();
  }
  wipe.className = 'wipe out';
  await wait(reduce ? 0 : 700);
  wipe.className = 'wipe';
  busy = false;
}

$$('[data-go]').forEach(b => b.addEventListener('click', () => goLevel(+b.dataset.go, b.dataset.zone)));
input.on(' ', () => car.jump());
input.on('r', () => { car.reset(...START); world.resetBall(); });
input.on('n', () => cycle.next());
input.on('enter', () => activeZone && openZone(activeZone));
addEventListener('keydown', e => { if (e.key === 'Escape') modalOpen ? closeModal() : level === 2 && goLevel(1); });
$$('[data-time]').forEach(b => b.addEventListener('click', () => cycle.next()));
addEventListener('wheel', e => { if (level === 2 && !modalOpen) zoom = Math.min(1.6, Math.max(0.65, zoom + e.deltaY * 0.0008)); }, { passive: true });

/* ---------- toast: GOL!, Tchibum!, Que salto! ---------- */
const toastEl = $('#toast');
let toastTimer;
function toast(html) {
  clearTimeout(toastTimer);
  toastEl.innerHTML = `<span class="line"><span>${html}</span></span>`;
  toastEl.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => toastEl.classList.add('in')));
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('in');
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 600);
  }, 1500);
}

/* ---------- zones + prompt + modal ---------- */
let activeZone = null;
const prompt = $('#prompt');
function setZone(z) {
  if (z === activeZone) return;
  activeZone = z;
  world.activeZone = z;
  prompt.hidden = !z;
  if (!z) return;
  $('#pLabel').textContent = z.n ? `(${z.n}) — ${z.sub}` : z.sub;
  $('#pTitle').textContent = z.title;
  $('#pOpen').textContent = z.id === 'nivel1' ? 'Ir para o site ↵' : 'Abrir ↵';
}
$('#pOpen').addEventListener('click', () => activeZone && openZone(activeZone));

const modal = $('#modal'), modalBody = $('#modalBody');
function openZone(z) {
  if (z.id === 'nivel1') return goLevel(1);
  modalBody.innerHTML = $(`#tpl-${z.id}`).innerHTML;
  if (z.id === 'frases') $('#modalFrases').innerHTML = phrasesHTML();
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

let heroVisible = true;
new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe($('.hero'));

// the Frases board in the world changes by itself
let boardPhrase = 0;
setInterval(() => { boardPhrase = (boardPhrase + 1) % FRASES.length; world.drawPhrase(boardPhrase); }, 6000);

/* ---------- camera ---------- */
function updateCamera(dt, t) {
  if (level === 2) {
    const z = zoom * (camera.aspect < 0.8 ? 1.75 : 1);
    target.set(car.x + car.vx * 0.3, 0.8 + Math.max(car.y, 0) * 0.5, car.z + car.vz * 0.3);
    desired.set(target.x, target.y + 17 * z, target.z + 16 * z);
    camPos.x = damp(camPos.x, desired.x, 4, dt);
    camPos.y = damp(camPos.y, desired.y, 3, dt);
    camPos.z = damp(camPos.z, desired.z, 4, dt);
    camLook.lerp(target, 1 - Math.exp(-6 * dt));
  } else {
    const a = reduce ? 0.6 : 0.6 + t * 0.03;
    const r = camera.aspect < 0.8 ? 100 : 78;
    desired.set(Math.sin(a) * r, camera.aspect < 0.8 ? 78 : 56, Math.cos(a) * r);
    camPos.lerp(desired, 1 - Math.exp(-1.6 * dt));
    camLook.lerp(target.set(0, 0, -2), 1 - Math.exp(-2 * dt));
  }
  camera.position.copy(camPos);
  if (car.shake > 0.01) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * car.shake, (Math.random() - 0.5) * car.shake, 0));
  camera.lookAt(camLook);
  scene.fog.near = damp(scene.fog.near, level === 2 ? 48 : 160, 2, dt);
  scene.fog.far = damp(scene.fog.far, level === 2 ? 150 : 440, 2, dt);
}

/* ---------- games: goals, jumps, pool ---------- */
const NO_INPUT = { throttle: 0, steer: 0, boost: false };
let air = 0, sinking = 0, goalTimer = 0, ballOut = 0;
const SALTO = ['Que <span class="serif">salto!</span>', '<span class="serif">Voou!</span>', 'Uau, que <span class="serif">altura!</span>'];
function games(dt) {
  // jumps: count a "salto" when the car was in the air long enough
  if (!car.grounded) air += dt;
  else {
    if (air > 0.55 && !sinking) { bump('saltos'); toast(SALTO[Math.floor(Math.random() * SALTO.length)]); }
    air = 0;
  }

  // pool: the floor drops, the car sinks, splash, then back to the deck
  if (!sinking && world.inPool(car.x, car.z) && car.y < 0.6) {
    sinking = 1e-4;
    world.splash(car.x, car.z);
    bump('tchibuns');
    toast('<span class="serif">Tchibum!</span>');
  }
  if (sinking) {
    sinking += dt;
    if (sinking > 1.2) { sinking = 0; car.reset(POOL.x - POOL.w / 2 - 3.5, POOL.z, -Math.PI / 2); }
  }

  // football: goal on either side, then the ball comes back to the middle
  const b = world.ball;
  if (goalTimer > 0) {
    goalTimer -= dt;
    if (goalTimer <= 0) world.resetBall();
  } else if (Math.abs(b.x - FIELD.x) > FIELD.w / 2 + 0.4 && Math.abs(b.z - FIELD.z) < FIELD.goal / 2 - 0.15 && Math.abs(b.x - FIELD.x) < FIELD.w / 2 + FIELD.depth + 0.5) {
    goalTimer = 1.8;
    bump('gols');
    toast('<span class="serif">Gol!</span>');
    world.confetti(b.x, b.z);
  }
  const out = Math.abs(b.x - FIELD.x) > FIELD.w / 2 + 6 || Math.abs(b.z - FIELD.z) > FIELD.d / 2 + 6;
  ballOut = out ? ballOut + dt : 0;
  if (ballOut > 6) { ballOut = 0; world.resetBall(); }
}

/* ---------- loop ---------- */
const clockT = new THREE.Clock();
let dustTimer = 0, simT = 0;
function simulate(dt, controls = input) {
  simT += dt;
  cycle.update(level === 1 && reduce ? 0 : dt);
  if (level === 2) {
    car.ground = world.groundAt(car.x, car.z);
    car.update(dt, sinking ? NO_INPUT : controls, cycle.state.night);
    physics.step(dt, car);
    games(dt);
    let best = null;
    for (const z of ZONES) if (Math.hypot(car.x - z.x, car.z - z.z) < z.r - 0.4) best = z;
    setZone(best);
    dustTimer -= dt;
    const skid = Math.abs(car.lateral) > 2.8 || (Math.abs(car.accel) > 12 && Math.abs(car.speed) < 10);
    if (car.grounded && !sinking && (skid || car.landing > 0.5) && dustTimer < 0) {
      for (const p of car.rearWheels()) world.puff(p, 0.6 + Math.min(Math.abs(car.lateral) / 8, 0.8));
      dustTimer = 0.05;
    }
  } else {
    car.update(dt, NO_INPUT, cycle.state.night);
    setZone(null);
  }
  updateCamera(dt, simT);
  world.update(dt, simT, cycle, car, camera, level);
}
function frame() {
  simulate(Math.min(clockT.getDelta(), 1 / 30));
  if (level === 2 || heroVisible) composer.render();
  requestAnimationFrame(frame);
}

// #debug: drive in fixed steps, independent of the frame rate (software GL runs at ~2 fps)
const sim = (seconds, controls = NO_INPUT) => { for (let i = 0; i < seconds * 60; i++) simulate(1 / 60, controls); };
if (location.hash === '#debug') window.ilha = { car, cycle, world, physics, goLevel, openZone, ZONES, camera, toast, sim };
renderer.compile(scene, camera);
await Promise.race([loaded, wait(6000)]);
progress = 1;
await wait(reduce ? 0 : 500);
$('.loader').classList.add('done');
document.body.classList.remove('lock');
revealPage();
requestAnimationFrame(frame);
