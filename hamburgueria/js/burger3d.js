// Hambúrguer 3D procedural: as camadas caem e se montam, o scroll abre o burger
// (vista explodida) e cada camada ganha uma etiqueta. Sem modelos externos.
import * as THREE from 'three';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 820px)').matches;
const expoOut = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const clamp01 = t => Math.min(1, Math.max(0, t));
const lerp = (a, b, t) => a + (b - a) * t;

// ruído de valor 2D (barato, determinístico)
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
}
const fbm = (x, y) => noise(x, y) * .5 + noise(x * 2.1, y * 2.1) * .3 + noise(x * 4.3, y * 4.3) * .2;

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
function speckle(ctx, w, h, n, colors, rMax) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = .25 + Math.random() * .6;
    ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, Math.random() * rMax + .4, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- texturas ----------
const grainTex = () => canvasTex(256, 256, (ctx, w, h) => {
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const x = i % w, y = (i / w) | 0;
    const v = 120 + fbm(x * .09, y * .09) * 90 + (Math.random() - .5) * 40;
    img.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
}, false);
const pattyTex = () => canvasTex(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#4b2513'; ctx.fillRect(0, 0, w, h);
  speckle(ctx, w, h, 5200, ['#2a120a', '#6e381c', '#1c0c06', '#8a4a26'], 3.2);
});
const baconTex = () => canvasTex(512, 64, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  [[0, '#4a150c'], [.12, '#9a2f1e'], [.3, '#e3ae84'], [.42, '#a8341f'], [.6, '#c24a2c'], [.7, '#efc29a'], [.82, '#922a1a'], [1, '#3e110a']]
    .forEach(([s, c]) => g.addColorStop(s, c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  speckle(ctx, w, h, 700, ['#3a0f08', '#5a1c10'], 2.2);
});
const tomatoTex = () => canvasTex(256, 256, (ctx, w, h) => {
  const cx = w / 2, cy = h / 2;
  ctx.fillStyle = '#c92a1d'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e8483a'; ctx.beginPath(); ctx.arc(cx, cy, w * .44, 0, 7); ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + .3;
    ctx.save(); ctx.translate(cx + Math.cos(a) * w * .22, cy + Math.sin(a) * h * .22); ctx.rotate(a);
    ctx.fillStyle = '#f47a5c'; ctx.beginPath(); ctx.ellipse(0, 0, w * .13, w * .085, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2c46a';
    for (let s = 0; s < 6; s++) { ctx.beginPath(); ctx.ellipse((s - 2.5) * 6, (s % 2 - .5) * 8, 3, 2, a, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  ctx.fillStyle = '#f0907a'; ctx.beginPath(); ctx.arc(cx, cy, w * .06, 0, 7); ctx.fill();
});

// ---------- geometrias ----------
// pão: perfil girado (lathe) com cores por vértice: casca dourada, miolo claro
function bun(profile, crumbBelowY, crumbAboveY, colors) {
  const g = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 128);
  const pos = g.attributes.position, col = [], c = new THREE.Color();
  let maxY = 0; for (const [, y] of profile) maxY = Math.max(maxY, y);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z);
    const a = Math.atan2(z, x);
    const crumb = (crumbBelowY != null && y < crumbBelowY && r < .985) || (crumbAboveY != null && y > crumbAboveY && r < .9);
    if (crumb) c.set('#ecd09b');
    else {
      const t = clamp01(y / maxY);
      c.set(colors[0]).lerp(new THREE.Color(colors[1]), clamp01(t * 1.6)).lerp(new THREE.Color(colors[2]), clamp01((t - .45) * 1.8));
      c.multiplyScalar(.9 + fbm(a * 3, y * 4) * .22);
    }
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
function profileAt(profile, t) { // ponto e normal no perfil, t em [0,1]
  const i = Math.min(profile.length - 2, Math.floor(t * (profile.length - 1)));
  const f = t * (profile.length - 1) - i, [x0, y0] = profile[i], [x1, y1] = profile[i + 1];
  return { r: lerp(x0, x1, f), y: lerp(y0, y1, f), nx: y1 - y0, ny: -(x1 - x0) };
}

function patty() {
  const g = new THREE.CylinderGeometry(1, 1, .3, 128, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z), a = Math.atan2(z, x);
    if (r > .99) {
      const edge = Math.pow(Math.abs(y) / .15, 6);
      const k = 1 - edge * .07 + (fbm(a * 5 + 9, y * 9) - .5) * .09;
      x *= k; z *= k; y *= 1 + (noise(a * 6, 2) - .5) * .12;
    } else if (r > .001) {
      const k = .93 + (fbm(a * 5 + 9, 1) - .5) * .09; x *= k; z *= k;
      y += Math.sign(y) * (noise(x * 4, z * 4) - .5) * .03;
    }
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

function cheese() {
  const g = new THREE.PlaneGeometry(1.86, 1.86, 90, 90);
  g.rotateX(-Math.PI / 2); g.rotateY(.35);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
    const d = Math.max(0, r - .94);
    const drip = Math.pow(Math.max(0, Math.sin(a * 5 + 1.3)), 8) * .12;
    let y = -(d * .4 + d * d * 4);
    y = Math.max(y, -.13 - drip);
    // depois da borda do burger, o queijo se encolhe para "abraçar" a carne
    const k = r > 1.01 ? (1.01 + (r - 1.01) * .12) / r : 1;
    p.setXYZ(i, x * k, y, z * k);
  }
  g.computeVertexNormals();
  return g;
}

function lettuce() {
  const R = 1.09, g = new THREE.RingGeometry(.01, R, 320, 14);
  const p = g.attributes.position, col = [], c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y), a = Math.atan2(y, x), t = r / R;
    const rr = r * (1 + .06 * Math.sin(a * 5 + 1) + .07 * (noise(a * 4 + 3, 0) - .5));
    const ruffle = Math.pow(t, 3) * (.035 * Math.sin(a * 19 + 2 * Math.sin(a * 3)) + .03 * Math.sin(a * 8 + 2) + .015 * Math.sin(a * 41));
    p.setXYZ(i, Math.cos(a) * rr, Math.sin(a) * rr, ruffle - Math.pow(t, 5) * .07);
    c.set('#4a8a1c').lerp(new THREE.Color('#a6d659'), Math.pow(t, 1.4)).multiplyScalar(.9 + noise(a * 9, t * 6) * .2);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

function baconStrip(seed) {
  const g = new THREE.PlaneGeometry(2.25, .3, 120, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const wave = .05 * Math.sin(x * 7 + seed) + .025 * Math.sin(x * 15 + seed * 2);
    const sag = Math.abs(x) > .95 ? -(Math.abs(x) - .95) * .35 : 0;
    p.setXYZ(i, x, y + (noise(x * 4, seed) - .5) * .05, wave + sag + y * .12 * Math.sin(x * 3 + seed));
  }
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

// ---------- ambiente (reflexos do brioche) ----------
function envMap(renderer) {
  const s = new THREE.Scene();
  const sphere = new THREE.SphereGeometry(10, 32, 16), col = [], c = new THREE.Color();
  const sp = sphere.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const t = clamp01(sp.getY(i) / 10 * .5 + .5);
    c.set('#24140c').lerp(new THREE.Color('#5c3a22'), t); col.push(c.r, c.g, c.b);
  }
  sphere.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (w, h, color, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  box(6, 3, new THREE.Color('#fff1dc').multiplyScalar(3), [2, 6, 5]);
  box(3, 6, new THREE.Color('#ff9d4d').multiplyScalar(2.5), [-7, 2, -4]);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, .04).texture; pm.dispose();
  return tex;
}

export function initBurger(canvas, { tags = [], onFrame } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.environment = envMap(renderer);
  scene.environmentIntensity = .55;

  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);

  // luz: chave quente, contraluz laranja, sombra nunca preta (céu/chão roxo-marrom)
  scene.add(new THREE.HemisphereLight('#ffd9ad', '#3b1e2c', .9));
  const key = new THREE.DirectionalLight('#ffd2a0', 2.6);
  key.position.set(3, 6, 5); key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 6, bottom: -2, near: .5, far: 20 });
  key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ff8a3a', 3.2); rim.position.set(-4, 3, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight('#b9c4ff', .35); fill.position.set(-5, 1, 3); scene.add(fill);

  const grain = grainTex(); grain.repeat.set(6, 3);
  const burger = new THREE.Group(); scene.add(burger);
  const layers = [];
  const add = (obj, h, name) => {
    obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const g = new THREE.Group(); g.add(obj); burger.add(g);
    layers.push({ g, h, name });
  };

  // 0. pão de baixo
  const bunMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .5, clearcoat: .55, clearcoatRoughness: .4, bumpMap: grain, bumpScale: .35 });
  const botProfile = [[0, 0], [.86, 0], [.97, .05], [1.01, .15], [.99, .26], [.95, .315], [.9, .32], [.6, .32], [.3, .32], [0, .32]];
  add(new THREE.Mesh(bun(botProfile, null, .31, ['#c98a45', '#d89a52', '#e2b06c']), bunMat), .32, 'bottom');

  // 1. carne
  const pt = pattyTex();
  pt.repeat.set(3, 1);
  const pattyMat = new THREE.MeshStandardMaterial({ map: pt, bumpMap: pt, bumpScale: 2, roughness: .78, color: '#e6cdbb' });
  const pm = new THREE.Mesh(patty(), pattyMat); pm.position.y = .15;
  add(pm, .3, 'patty');

  // 2. cheddar
  const cheeseMat = new THREE.MeshPhysicalMaterial({ color: '#f39a12', roughness: .32, clearcoat: .4, side: THREE.DoubleSide, sheen: .4, sheenColor: new THREE.Color('#ffd27a') });
  const ch = new THREE.Mesh(cheese(), cheeseMat); ch.position.y = .012;
  add(ch, .03, 'cheese');

  // 3. bacon
  const bt = baconTex();
  const baconMat = new THREE.MeshStandardMaterial({ map: bt, roughness: .5, side: THREE.DoubleSide });
  const bacon = new THREE.Group();
  [[0, .02, 1.1], [1.05, .05, 2.3], [-.95, .075, 4.1]].forEach(([rot, y, seed]) => {
    const m = new THREE.Mesh(baconStrip(seed), baconMat); m.rotation.y = rot; m.position.y = y; bacon.add(m);
  });
  add(bacon, .1, 'bacon');

  // 4. cebola roxa
  const onionMat = new THREE.MeshPhysicalMaterial({ color: '#a8388f', roughness: .3, clearcoat: .5 });
  const onion = new THREE.Group();
  [[.62, -.25, .1], [.5, -.25, .1], [.6, .35, -.15], [.47, .35, -.15], [.36, .35, -.15]].forEach(([r, x, z]) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, .035, 10, 96), onionMat);
    t.rotation.x = Math.PI / 2; t.scale.z = .7; t.position.set(x, .02, z); onion.add(t);
  });
  add(onion, .05, 'onion');

  // 5. tomate
  const tt = tomatoTex();
  const tomatoSide = new THREE.MeshPhysicalMaterial({ color: '#c8261a', roughness: .28, clearcoat: .6 });
  const tomatoTop = new THREE.MeshPhysicalMaterial({ map: tt, roughness: .3, clearcoat: .7 });
  const tomato = new THREE.Group();
  [[-.42, .08, .4], [.44, -.12, 1.7]].forEach(([x, z, r]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .09, 64), [tomatoSide, tomatoTop, tomatoTop]);
    m.position.set(x, .045, z); m.rotation.y = r; tomato.add(m);
  });
  add(tomato, .1, 'tomato');

  // 6. alface
  const lettuceMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55, side: THREE.DoubleSide });
  const lt = new THREE.Mesh(lettuce(), lettuceMat); lt.position.y = .04;
  add(lt, .07, 'lettuce');

  // 7. pão de cima + gergelim
  const topProfile = [[0, 0], [.3, 0], [.6, 0], [.95, 0], [1.03, .05], [1.05, .16], [1.01, .31], [.92, .48], [.75, .63], [.52, .74], [.26, .8], [0, .82]];
  const top = new THREE.Group();
  top.add(new THREE.Mesh(bun(topProfile, .012, null, ['#efc98c', '#c8722c', '#8c3c11']), bunMat));
  const N = 110, seeds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshStandardMaterial({ color: '#f4e4bd', roughness: .45 }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const s = profileAt(topProfile, .5 + Math.pow(Math.random(), .8) * .48), a = Math.random() * Math.PI * 2;
    n.set(s.nx * Math.cos(a), s.ny, s.nx * Math.sin(a)).normalize();
    if (n.y < 0) n.negate();
    q.setFromUnitVectors(up, n).multiply(new THREE.Quaternion().setFromAxisAngle(up, Math.random() * 3));
    m4.compose(new THREE.Vector3(s.r * Math.cos(a), s.y, s.r * Math.sin(a)).addScaledVector(n, .005), q, new THREE.Vector3(.036, .013, .022));
    seeds.setMatrixAt(i, m4);
  }
  top.add(seeds);
  add(top, .82, 'top');

  // sombra de contato no "balcão"
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false,
    map: canvasTex(128, 128, (ctx, w) => {
      const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(10,4,2,.85)'); g.addColorStop(.45, 'rgba(10,4,2,.35)'); g.addColorStop(1, 'rgba(10,4,2,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
    })
  }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = -.005; scene.add(blob);

  // brasas subindo ao fundo (fundo vivo, barato)
  const EM = mobile ? 70 : 140, ePos = new Float32Array(EM * 3), eSeed = new Float32Array(EM);
  for (let i = 0; i < EM; i++) {
    ePos.set([(Math.random() - .5) * 9, Math.random() * 7 - 1, -2 - Math.random() * 4], i * 3); eSeed[i] = Math.random();
  }
  const eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  const embers = new THREE.Points(eGeo, new THREE.PointsMaterial({
    size: .045, color: '#ffb24a', transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending,
    map: canvasTex(32, 32, (ctx, w) => {
      const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
    })
  }));
  scene.add(embers);

  // pilha: alturas de repouso
  let acc = 0;
  for (const L of layers) { L.base = acc; acc += L.h; }
  const H0 = acc, GAP = .52, n1 = layers.length - 1;

  // estado
  const state = { explode: 0, introDelay: 0 };
  let t0 = null, spin = 0, spinV = 0, tiltX = 0, tiltY = 0, dragging = false, lastX = 0;
  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', e => {
    pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1;
    if (dragging) { spinV += (e.clientX - lastX) * .0009; lastX = e.clientX; }
  }, { passive: true });
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; });
  addEventListener('pointerup', () => { dragging = false; });

  let W = 0, Hh = 0;
  function resize() {
    W = canvas.clientWidth; Hh = canvas.clientHeight;
    renderer.setSize(W, Hh, false);
    camera.aspect = W / Hh; camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  const v = new THREE.Vector3();
  let visible = true, started = false, raf = 0, last = performance.now();
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && started && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }).observe(canvas);

  function frame(now) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (t0 == null) t0 = now;
    const ex = expoOut(clamp01(state.explode));
    const portrait = W / Hh < .9;

    // queda das camadas (intro) + abertura (scroll)
    layers.forEach((L, i) => {
      const k = reduce ? 1 : expoOut(clamp01((now - t0 - state.introDelay - i * 90) / 1100));
      const drop = (1 - k) * (3.2 + i * .35);
      L.g.position.y = L.base + ex * GAP * i + drop;
      L.g.rotation.y = (1 - k) * (i % 2 ? .6 : -.6) + ex * Math.sin(i * 1.7) * .25;
      L.g.visible = k > 0 || reduce;
    });
    blob.material.opacity = 1 - ex * .5;

    // giro: sozinho, arrastando e pelo cursor (lerp)
    spinV *= .94; spin += spinV + (reduce ? 0 : dt * .18);
    tiltY = lerp(tiltY, pointer.x * .35, .06); tiltX = lerp(tiltX, pointer.y * .12, .06);
    burger.rotation.y = spin + tiltY;
    burger.rotation.x = tiltX * (1 - ex * .6);

    // câmera: enquadra a pilha (cresce ao abrir) e desloca o burger na tela
    const Hs = H0 + ex * GAP * n1, tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitH = lerp(portrait ? .3 : .56, portrait ? .64 : .8, ex), fitW = portrait ? lerp(.82, .44, ex) : .36;
    const d = Math.max(Hs / (2 * tanH * fitH), 2.3 / (2 * tanH * camera.aspect * fitW));
    const cy = Hs / 2;
    camera.position.set(0, cy + d * .2, d);
    camera.lookAt(0, cy - .05, 0);
    const shiftX = portrait ? lerp(0, -.24, ex) : lerp(.2, .09, ex);
    const shiftY = portrait ? lerp(.17, .02, ex) : lerp(.03, 0, ex);
    camera.setViewOffset(W, Hh, -shiftX * W, shiftY * Hh, W, Hh);

    // brasas
    const ep = eGeo.attributes.position;
    for (let i = 0; i < EM; i++) {
      let y = ep.getY(i) + dt * (.15 + eSeed[i] * .3);
      if (y > 7) y = -1;
      ep.setY(i, y); ep.setX(i, ep.getX(i) + Math.sin(now * .0006 + eSeed[i] * 40) * dt * .08);
    }
    ep.needsUpdate = true;
    embers.position.y = cy - 2.5;

    renderer.render(scene, camera);

    // etiquetas presas a cada camada
    if (tags.length) {
      const showK = clamp01((state.explode - .55) / .35);
      layers.forEach((L, i) => {
        const el = tags[i]; if (!el) return;
        const side = portrait ? 1 : (i % 2 ? 1 : -1);
        v.set(side * 1.12, L.g.position.y + L.h * .5, 0).project(camera);
        const x = (v.x * .5 + .5) * W, y = (-v.y * .5 + .5) * Hh;
        el.style.transform = `translate(${x}px,${y}px)`;
        el.dataset.side = side > 0 ? 'r' : 'l';
        el.classList.toggle('on', showK > 0 && state.explode > .6 + i * .02);
      });
    }
    onFrame && onFrame(state);
    raf = requestAnimationFrame(frame);
  }

  return {
    state,
    start(delay = 0) { started = true; state.introDelay = delay; t0 = null; if (!raf) raf = requestAnimationFrame(frame); },
    layers: layers.map(l => l.name)
  };
}
