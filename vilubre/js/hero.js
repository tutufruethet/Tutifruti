import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createBottle, studioEnvironment, ESSENCES } from './bottle.js';

/* Live product scene: the bottle on a stone plinth, ringed by giant type and light rods.
   Scroll drives one number (0..1) that orbits the camera once and then closes in on the engraving. */

const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const seg = (p, a, b) => ease(THREE.MathUtils.clamp((p - a) / (b - a), 0, 1));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

function noiseTexture(size = 256, base = 30, spread = 22) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = base + Math.random() * spread;
    img.data[i] = v + 4; img.data[i + 1] = v + 2; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function typeRing(text, { outline = false } = {}) {
  const c = document.createElement('canvas'); c.width = 4096; c.height = 420;
  const g = c.getContext('2d');
  g.font = 'italic 300 330px "Cormorant Garamond", Georgia, serif';
  g.textBaseline = 'middle';
  const unit = g.measureText(text).width;
  const reps = Math.max(1, Math.round(c.width / unit));
  const sx = c.width / (unit * reps);
  g.save(); g.scale(sx, 1);
  for (let i = 0; i < reps; i++) {
    if (outline) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeText(text, i * unit, c.height / 2); }
    else { g.fillStyle = '#fff'; g.fillText(text, i * unit, c.height / 2); }
  }
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function glowTexture(inner = 'rgba(255,255,255,1)') {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, inner); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export function createHero(canvas, { high = true, reduce = false, instant = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: high, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.5 : 1.25));
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the photo's colours close to the original
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const ink = new THREE.Color('#0c0a08');
  const scene = new THREE.Scene();
  scene.background = ink;
  scene.fog = new THREE.Fog(ink, 6, 15);
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  /* plinth + floor */
  const stoneTex = noiseTexture();
  stoneTex.repeat.set(3, 1);
  const stone = new THREE.MeshStandardMaterial({ color: '#2a2622', map: stoneTex, roughness: 0.55, metalness: 0 });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.7, 96), stone);
  plinth.position.y = -0.35; plinth.receiveShadow = true;
  scene.add(plinth);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ color: '#0f0d0b', roughness: 0.3, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.7; floor.receiveShadow = true;
  scene.add(floor);

  /* bottle */
  const bottle = createBottle({ height: 1.6 });
  scene.add(bottle.group);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.2), new THREE.MeshBasicMaterial({ map: glowTexture('rgba(0,0,0,.9)'), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.002;
  scene.add(contact);
  // Light passing through the liquid leaves a warm pool on the stone.
  const causticMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(ESSENCES.ambar.accent), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const caustic = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), causticMat);
  caustic.rotation.x = -Math.PI / 2; caustic.position.set(0.25, 0.004, 0.5);
  scene.add(caustic);

  /* rings of giant type */
  const rings = [];
  const rowText = 'Vilubre ton de  —  ';
  [[3.15, false, 1], [1.75, true, -1], [0.35, false, 1]].forEach(([y, outline, dir], i) => {
    const tex = typeRing(rowText, { outline });
    tex.repeat.x = -3; // seen from inside the ring, so mirror it back
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: outline ? 0.55 : 0.32, side: THREE.BackSide, depthWrite: false, color: '#efe6d8', fog: true });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 1.45, 128, 1, true), mat);
    ring.position.y = y - 0.3;
    ring.userData = { dir, base: i * 0.17 };
    scene.add(ring); rings.push(ring);
  });

  /* light rods */
  let accent = ESSENCES.ambar.accent;
  const rodMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(ESSENCES.ambar.accent).multiplyScalar(3), toneMapped: false });
  const rods = [];
  const rodGeo = new THREE.CylinderGeometry(0.014, 0.014, 1, 8);
  rodGeo.translate(0, 0.5, 0);
  for (let i = 0; i < 11; i++) {
    // Behind and beside the plinth from the opening view, so the copy column stays clean.
    const a = Math.PI * (1.08 + (i / 10) * 0.84), r = 2.4 + (i % 3) * 0.95;
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.set(Math.cos(a) * r, -0.7, Math.sin(a) * r - 0.4);
    rod.userData = { h: 2.4 + ((i * 37) % 10) / 4, delay: (i % 5) * 0.04 };
    rod.scale.y = 0.001;
    scene.add(rod); rods.push(rod);
  }

  /* dust */
  const N = high ? 520 : 220, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.7 + Math.random() * 2.6;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = -0.5 + Math.random() * 4; pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.022, map: glowTexture(), color: '#ffe2bd', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* light */
  const key = new THREE.SpotLight('#ffe1b8', 60, 14, 0.42, 1, 2);
  key.position.set(-2.4, 4.6, 3.0); key.target.position.set(0, 0.5, 0);
  key.castShadow = true; key.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024); key.shadow.bias = -0.0004; key.shadow.radius = 6;
  scene.add(key, key.target);
  const rimL = new THREE.PointLight(ESSENCES.ambar.accent, 9, 8, 2); rimL.position.set(-2.2, 1.6, -2.2);
  const rimR = new THREE.PointLight(ESSENCES.ambar.accent, 7, 8, 2); rimR.position.set(2.4, 1.0, -1.8);
  scene.add(rimL, rimR, new THREE.HemisphereLight('#5a4a3a', '#120d09', 0.5));

  /* post */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.55, 1.0);
  if (high) composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* camera rig */
  const target = new THREE.Vector3(), look = new THREE.Vector3();
  const state = { p: 0, shown: reduce ? 0 : 0, px: 0, py: 0, sx: 0, sy: 0, t: 0, running: true, aspect: 1 };
  const label = bottle.labelCenter.clone();

  function rig(p) {
    const orbit = seg(p, 0.04, 0.6), close = seg(p, 0.6, 0.86);
    const portrait = state.aspect < 1;
    const far = portrait ? 7.4 : 4.9;
    const angle = -Math.sin(orbit * Math.PI) * 0.6;
    let radius = THREE.MathUtils.lerp(far, far * 0.8, Math.sin(orbit * Math.PI));
    let height = 0.95 + Math.sin(orbit * Math.PI) * 0.9;
    // On phones the bottle sits in the upper half, above the copy.
    target.set(0, portrait ? -0.15 : 0.8, 0);
    const near = portrait ? 5.4 : 3.5;
    radius = THREE.MathUtils.lerp(radius, near, close);
    height = THREE.MathUtils.lerp(height, 0.95, close);
    target.lerp(look.set(label.x * 0.5, portrait ? -0.05 : 0.8, 0), close);
    // On wide screens the bottle shifts right of center so the type has the left side.
    const shift = portrait ? 0 : THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.58, -0.05, orbit), 0.45, close);
    camera.position.set(Math.sin(angle) * radius - shift * Math.cos(angle), height, Math.cos(angle) * radius + shift * Math.sin(angle));
    look.copy(target).add(new THREE.Vector3(-shift * Math.cos(angle), 0, shift * Math.sin(angle)));
    camera.position.x += state.sx * 0.18; camera.position.y += state.sy * 0.12;
    camera.lookAt(look);
    camera.updateMatrixWorld();
  }

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w / 2, h / 2);
    state.aspect = w / h;
    camera.aspect = w / h;
    camera.fov = state.aspect < 1 ? 38 : 32;
    camera.updateProjectionMatrix();
  }
  resize();

  const anchors = [new THREE.Vector3(0.1, 1.42, 0), new THREE.Vector3(0.3, 0.85, 0), new THREE.Vector3(0.2, 0.25, 0)];
  const projected = anchors.map(() => ({ x: 0, y: 0, front: true }));
  const tmp = new THREE.Vector3(), right = new THREE.Vector3();

  let last = performance.now();
  function frame(now) {
    if (!state.running) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    state.t += dt;
    state.shown = reduce || instant ? state.p : damp(state.shown, state.p, 5, dt);
    state.sx = damp(state.sx, state.px, 3, dt); state.sy = damp(state.sy, state.py, 3, dt);
    const p = state.shown;
    rig(p);

    bottle.face(camera);
    rings.forEach(r => { r.material.map.offset.x = r.userData.base + r.userData.dir * p * 0.6 + (reduce ? 0 : state.t * 0.004 * r.userData.dir); });
    const sink = 1 - seg(p, 0.58, 0.8); // rods drop away before the engraving close-up
    rodMat.color.set(accent).multiplyScalar(3);
    rods.forEach(r => {
      const k = seg(p, 0.02 + r.userData.delay, 0.35 + r.userData.delay);
      r.scale.y = Math.max(0.001, r.userData.h * (0.25 + 0.75 * k) * sink);
    });
    if (!reduce) dust.rotation.y = state.t * 0.02;
    causticMat.opacity = 0.42 + Math.sin(state.t * 1.3) * 0.06;

    right.setFromMatrixColumn(camera.matrixWorld, 0);
    anchors.forEach((a, i) => {
      tmp.copy(a).applyMatrix4(bottle.group.matrixWorld).addScaledVector(right, i === 0 ? 0.45 : 0.62);
      const toCam = tmp.clone().sub(camera.position);
      tmp.project(camera);
      projected[i].x = (tmp.x * 0.5 + 0.5); projected[i].y = (-tmp.y * 0.5 + 0.5);
      projected[i].front = toCam.length() > 0;
    });
    api.onFrame?.(p, projected);

    composer.render();
    requestAnimationFrame(frame);
  }

  const api = {
    bottle, resize, camera, state,
    setProgress(p) { state.p = p; },
    setPointer(x, y) { state.px = x; state.py = y; },
    setEssence(id) {
      const e = ESSENCES[id];
      bottle.setEssence(id);
      accent = e.accent;
      causticMat.color.set(e.accent);
      rimL.color.set(e.accent); rimR.color.set(e.accent);
    },
    setName(n) { bottle.setName(n); },
    start() { if (!state.running) { state.running = true; last = performance.now(); requestAnimationFrame(frame); } },
    stop() { state.running = false; },
    renderOnce() { rig(state.p); composer.render(); },
    onFrame: null,
  };
  requestAnimationFrame(frame);
  return api;
}
