import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { createGrass } from './grass.js';
import { FRASES } from './dados.js';

export const ISLAND = 66;
export const PATH = { radius: 32, width: 2.4 };
// The four stations come from what Cauê likes: futebol, bicicleta, piscina, brincar.
export const FIELD = { x: 0, z: -47, w: 18, d: 11, goal: 5, depth: 2 };
export const POOL = { x: 47, z: -8, w: 12, d: 7 };
export const TRACK = { x: -47, z: -6, a: 9, b: 5.5 };
export const PARK = { x: 2, z: 47, r: 9 };

const CANDY = ['#ff4d6d', '#ffd23f', '#2a5bd7', '#1fbf5b', '#c86bff', '#ff8c42'];
const INK = '#132018', PAPER = '#f6f4ea', MUTE = '#9aa394', ACCENT = '#1fbf5b';
const SANS = '"Instrument Sans", system-ui, sans-serif';
const SERIF = '"Instrument Serif", Georgia, serif';

const polar = (deg, r) => [Math.cos(deg * Math.PI / 180) * r, Math.sin(deg * Math.PI / 180) * r];
const tangent = deg => [-Math.sin(deg * Math.PI / 180), Math.cos(deg * Math.PI / 180)];

export const ZONES = [
  { id: 'futebol', kind: 'station', n: '01', title: 'Futebol', sub: 'empurre a bola até o gol', sign: ['(01) — FUTEBOL', 'Futebol', 'faz o gol'], x: 15, z: -38, spawn: [-6, -47, Math.PI / 2] },
  { id: 'bike', kind: 'station', n: '02', title: 'Bicicleta', sub: 'pista oval com rampa', sign: ['(02) — BICICLETA', 'Bicicleta', 'pega a rampa'], x: -44, z: 7, spawn: [-55, -6, Math.PI / 2] },
  { id: 'piscina', kind: 'station', n: '03', title: 'Piscina', sub: 'pode cair, é de propósito', sign: ['(03) — PISCINA', 'Piscina', 'tchibum'], x: 44, z: 5, spawn: [39, -8.5, Math.PI / 2] },
  { id: 'brincar', kind: 'station', n: '04', title: 'Brincar', sub: 'balanço, escorregador e blocos', sign: ['(04) — BRINCAR', 'Brincar', 'parquinho'], x: -15, z: 40, spawn: [-8, 48, Math.PI / 2] },
  { id: 'oi', kind: 'info', title: 'Oi, eu sou o Cauê', sub: 'quem sou', sign: ['(OI)', 'Eu sou', 'o Cauê'], x: -17, z: -10 },
  { id: 'frases', kind: 'info', title: 'Frases', sub: 'as que eu mais gosto', x: 17, z: -10 },
  { id: 'nivel1', kind: 'info', title: 'Nível 1', sub: 'voltar ao site', sign: ['(SITE)', 'Nível 1', 'o site'], x: -17, z: 14 },
].map(z => ({ r: 5, spawn: [z.x, z.z + 1.5, Math.PI], ...z }));

// Symmetric humps: the car rides up, leaves the ground at the crest and lands on the other side.
const RAMP = { len: 5.6, width: 3.2, h: 1.25 };
export const RAMPS = [
  { x: TRACK.x, z: TRACK.z, dir: [1, 0] },
  { x: polar(140, PATH.radius)[0], z: polar(140, PATH.radius)[1], dir: tangent(140) },
  { x: polar(318, PATH.radius)[0], z: polar(318, PATH.radius)[1], dir: tangent(318) },
];

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.redraw = fn => { fn(c.getContext('2d'), w, h); t.needsUpdate = true; };
  return t;
}

// Draws "texto com *itálico*" wrapped inside maxW, the starred words in the serif.
function richText(g, src, x, y, maxW, size, lineH, colors) {
  const words = [];
  src.split(/(\*[^*]+\*)/).filter(Boolean).forEach(part => {
    const serif = part.startsWith('*');
    part.replace(/\*/g, '').split(' ').filter(Boolean).forEach(w => words.push({ w, serif }));
  });
  const font = s => (s ? `italic ${size * 1.08}px ${SERIF}` : `400 ${size}px ${SANS}`);
  let cx = x, cy = y;
  g.font = font(false);
  const space = g.measureText(' ').width;
  for (const { w, serif } of words) {
    g.font = font(serif);
    const ww = g.measureText(w).width;
    if (cx > x && cx + ww > x + maxW) { cx = x; cy += lineH; }
    g.fillStyle = serif ? colors[1] : colors[0];
    g.fillText(w, cx, cy);
    cx += ww + space;
  }
}

function tube(a, b, r, mat, seg = 6) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg), mat);
  setTube(m, a, b);
  m.castShadow = true;
  return m;
}
const UP = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3();
function setTube(m, a, b) {
  tmpV.subVectors(b, a);
  m.scale.set(1, tmpV.length(), 1);
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, tmpV.normalize());
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class World {
  constructor({ scene, physics, manager, quality, renderer }) {
    this.scene = scene;
    this.physics = physics;
    this.quality = quality;
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();
    this.fontLoader = new FontLoader(manager);
    this.random = rng(11);
    this.lampMats = [];
    this.glows = [];
    this.rings = [];
    this.screens = [];
    this.dynamic = [];
    this.mat = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    this.inkMat = this.mat(INK);
    this.whiteMat = this.mat(PAPER);

    this.lights();
    this.sky();
    this.island();
    this.grass = createGrass({
      subdivisions: quality.high ? 270 : 150,
      size: quality.high ? 62 : 44,
      island: ISLAND,
      path: PATH,
      hide: [
        new THREE.Vector4(0, 0, 9.5, 1.5),
        ...ZONES.map(z => new THREE.Vector4(z.x, z.z, z.r + 0.2, 1.4)),
        new THREE.Vector4(FIELD.x, FIELD.z, 11, 1.5),
        new THREE.Vector4(POOL.x, POOL.z, 9, 1.5),
        new THREE.Vector4(TRACK.x, TRACK.z, 11.5, 1.5),
        new THREE.Vector4(PARK.x, PARK.z, PARK.r + 0.5, 1.5),
      ],
    });
    scene.add(this.grass);
    this.zones();
    this.ramps();
    this.football();
    this.pool();
    this.bike();
    this.playground();
    this.scoreboard();
    this.vegetation();
    this.lamps();
    this.letters();
    this.particles();
  }

  /* ---------- atmosphere ---------- */
  lights() {
    this.hemi = new THREE.HemisphereLight('#c4e9ff', '#6a4fd6', 1.1);
    this.sun = new THREE.DirectionalLight('#fff0d6', 2.5);
    this.sun.castShadow = true;
    const s = this.sun.shadow;
    s.mapSize.set(this.quality.high ? 2048 : 1024, this.quality.high ? 2048 : 1024);
    s.bias = -0.0006;
    s.normalBias = 0.04;
    s.camera.near = 1;
    s.camera.far = 150;
    this.setShadowExtent(30);
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.scene.fog = new THREE.Fog('#d2bdff', 50, 150);
  }

  setShadowExtent(e) {
    const c = this.sun.shadow.camera;
    if (c.right === e) return;
    Object.assign(c, { left: -e, right: e, top: e, bottom: -e });
    c.updateProjectionMatrix();
  }

  sky() {
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform vec3 uTop, uHorizon; varying vec3 vP; void main(){ float k = smoothstep(-.05, .55, vP.y); gl_FragColor = vec4(mix(uHorizon, uTop, k), 1.); }',
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), this.skyMat);
    sky.renderOrder = -1;
    this.skyMesh = sky;
    const n = 700, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, y = 0.15 + Math.random() * 0.85, r = Math.sqrt(1 - y * y);
      p.set([Math.cos(a) * r * 420, y * 420, Math.sin(a) * r * 420], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(g, this.starMat);
    this.scene.add(sky, this.stars);
  }

  /* ---------- ground: one painted texture for paths, field, track, deck and sand ---------- */
  island() {
    const R = ISLAND, W = 2048, s = W / (2 * R);
    const P = (x, z) => [(x + R) * s, (z + R) * s];
    const map = canvasTexture(W, W, (g) => {
      g.fillStyle = '#2f8d66';
      g.beginPath(); g.arc(W / 2, W / 2, R * s, 0, Math.PI * 2); g.fill();
      const r = rng(3);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = r() > 0.5 ? 'rgba(255,255,200,.05)' : 'rgba(0,40,30,.06)';
        g.beginPath(); g.arc(r() * W, r() * W, 10 + r() * 60, 0, Math.PI * 2); g.fill();
      }
      const ring = (x, z, rad, width, color) => { g.strokeStyle = color; g.lineWidth = width * s; g.beginPath(); g.arc(...P(x, z), rad * s, 0, Math.PI * 2); g.stroke(); };
      const disk = (x, z, rad, color) => { g.fillStyle = color; g.beginPath(); g.arc(...P(x, z), rad * s, 0, Math.PI * 2); g.fill(); };
      const rect = (x, z, w, d, color) => { g.fillStyle = color; g.fillRect(...P(x - w / 2, z - d / 2), w * s, d * s); };
      const line = (pts, width, color) => { g.strokeStyle = color; g.lineWidth = width * s; g.beginPath(); pts.forEach(([x, z], i) => g[i ? 'lineTo' : 'moveTo'](...P(x, z))); g.stroke(); };

      ring(0, 0, PATH.radius, PATH.width * 2 + 0.8, '#f2b48a');
      ring(0, 0, PATH.radius, PATH.width * 2, '#ffd9b3');
      g.setLineDash([1.6 * s, 1.6 * s]); ring(0, 0, PATH.radius, 0.25, '#f6a77c'); g.setLineDash([]);
      disk(0, 0, 10, '#f2b48a'); disk(0, 0, 9.4, '#ffe3c7');
      for (let k = 2; k < 9; k += 2) ring(0, 0, k, 0.12, '#f7c49c');
      for (const z of ZONES) {
        disk(z.x, z.z, z.r + 0.4, '#f2b48a');
        disk(z.x, z.z, z.r, '#ffe6cc');
      }

      // futebol: striped pitch with lines
      const F = FIELD;
      rect(F.x, F.z, F.w + 3, F.d + 3, '#2a8a5c');
      for (let i = 0; i < 9; i++) rect(F.x - F.w / 2 + F.w / 18 + i * F.w / 9, F.z, F.w / 9, F.d, i % 2 ? '#3aa56f' : '#45b47a');
      const L = 'rgba(255,255,255,.92)', lw = 0.14, x0 = F.x - F.w / 2, x1 = F.x + F.w / 2, z0 = F.z - F.d / 2, z1 = F.z + F.d / 2;
      line([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]], lw, L);
      line([[F.x, z0], [F.x, z1]], lw, L);
      g.strokeStyle = L; g.lineWidth = lw * s; g.beginPath(); g.arc(...P(F.x, F.z), 1.8 * s, 0, Math.PI * 2); g.stroke();
      disk(F.x, F.z, 0.18, L);
      for (const side of [-1, 1]) {
        const gx = F.x + side * F.w / 2;
        line([[gx, F.z - 3.2], [gx - side * 2.2, F.z - 3.2], [gx - side * 2.2, F.z + 3.2], [gx, F.z + 3.2]], lw, L);
        disk(gx - side * 3.2, F.z, 0.15, L);
      }

      // piscina: tiled deck
      rect(POOL.x, POOL.z, POOL.w + 3.6, POOL.d + 3.6, '#e9eee6');
      g.strokeStyle = 'rgba(19,32,24,.08)'; g.lineWidth = 0.05 * s;
      for (let x = POOL.x - POOL.w / 2 - 1.8; x <= POOL.x + POOL.w / 2 + 1.8; x += 0.9) line([[x, POOL.z - POOL.d / 2 - 1.8], [x, POOL.z + POOL.d / 2 + 1.8]], 0.05, 'rgba(19,32,24,.08)');
      for (let z = POOL.z - POOL.d / 2 - 1.8; z <= POOL.z + POOL.d / 2 + 1.8; z += 0.9) line([[POOL.x - POOL.w / 2 - 1.8, z], [POOL.x + POOL.w / 2 + 1.8, z]], 0.05, 'rgba(19,32,24,.08)');

      // bicicleta: oval track
      const T = TRACK;
      const oval = (a, b, width, color, dash) => {
        g.strokeStyle = color; g.lineWidth = width * s; if (dash) g.setLineDash(dash.map(d => d * s));
        g.beginPath(); g.ellipse(...P(T.x, T.z), a * s, b * s, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      };
      g.fillStyle = '#4cae6e'; g.beginPath(); g.ellipse(...P(T.x, T.z), (T.a + 1.6) * s, (T.b + 1.6) * s, 0, 0, Math.PI * 2); g.fill();
      oval(T.a, T.b, 2.8, '#c9653d');
      oval(T.a, T.b, 2.4, '#e07b4f');
      oval(T.a, T.b, 0.12, 'rgba(255,255,255,.85)', [0.9, 0.9]);

      // brincar: sand
      disk(PARK.x, PARK.z, PARK.r + 0.4, '#e3bd85');
      disk(PARK.x, PARK.z, PARK.r, '#f2d4a2');
      for (let i = 0; i < 260; i++) {
        const a = r() * 6.28, d = Math.sqrt(r()) * PARK.r;
        disk(PARK.x + Math.cos(a) * d, PARK.z + Math.sin(a) * d, 0.06 + r() * 0.1, 'rgba(150,100,40,.18)');
      }
    });
    map.anisotropy = this.maxAniso;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(R, 128), new THREE.MeshLambertMaterial({ map }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const beach = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 3.5, 1.6, 128, 1, true), new THREE.MeshLambertMaterial({ color: '#ffd2a8' }));
    beach.position.y = -0.8;
    beach.receiveShadow = true;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshLambertMaterial({ color: '#3fc2df' }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.7;
    this.foam = new THREE.Mesh(new THREE.RingGeometry(R + 1.4, R + 2.8, 128), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
    this.foam.rotation.x = -Math.PI / 2;
    this.foam.position.y = -0.62;
    this.scene.add(ground, beach, water, this.foam);
  }

  label(title, sub, w = 9) {
    const tex = canvasTexture(1024, 256, (g) => {
      g.fillStyle = 'rgba(19,32,24,.92)';
      g.font = `600 112px ${SANS}`;
      g.fillText(title, 24, 132);
      if (sub) { g.font = `italic 64px ${SERIF}`; g.fillStyle = 'rgba(19,32,24,.62)'; g.fillText(sub, 28, 214); }
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    return m;
  }

  post(x, z, h) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, h, 6), this.inkMat);
    p.position.set(x, h / 2, z);
    p.castShadow = true;
    this.physics.addStatic(x, z, 0.35);
    return p;
  }

  board(cx, cz, width, height, texture, emissive) {
    const g = new THREE.Group();
    const bottom = 1.7;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, height + 0.4, 0.3), this.inkMat);
    frame.position.set(0, bottom + height / 2, -0.12);
    frame.castShadow = true;
    const mat = new THREE.MeshLambertMaterial({ map: texture, emissiveMap: emissive ? texture : null, emissive: emissive ? '#ffffff' : '#000000', emissiveIntensity: 0.15 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    screen.position.set(0, bottom + height / 2, 0.04);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.12, 0.34), this.ledMat);
    strip.position.set(0, bottom - 0.26, -0.12);
    g.add(frame, screen, strip, this.post(cx - width / 2, cz, bottom + 0.2), this.post(cx + width / 2, cz, bottom + 0.2));
    g.children.slice(-2).forEach(p => p.position.set(p.position.x - cx, p.position.y, 0));
    g.position.set(cx, 0, cz);
    for (let x = -width / 2 + 0.6; x < width / 2; x += 1.1) this.physics.addStatic(cx + x, cz, 0.45);
    if (emissive) this.screens.push(mat);
    this.scene.add(g);
    return g;
  }

  signTexture([label, big, serif], hint = 'Pare no círculo e aperte Enter') {
    return canvasTexture(1024, 600, (g, W, H) => {
      g.fillStyle = INK; g.fillRect(0, 0, W, H);
      g.fillStyle = ACCENT; g.fillRect(0, H - 18, W, 18);
      g.fillStyle = MUTE; g.font = `500 34px ${SANS}`;
      g.fillText(label, 56, 92);
      g.fillStyle = PAPER; g.font = `400 150px ${SANS}`;
      g.fillText(big, 48, 290);
      g.font = `italic 128px ${SERIF}`;
      g.fillText(serif, 52, 420);
      g.fillStyle = MUTE; g.font = `500 40px ${SANS}`;
      g.fillText(hint, 56, 530);
    });
  }

  drawPhrase(i) {
    this.phraseTex.userData.redraw((g, W, H) => {
      g.fillStyle = INK; g.fillRect(0, 0, W, H);
      g.fillStyle = ACCENT; g.fillRect(0, H - 18, W, 18);
      g.fillStyle = MUTE; g.font = `500 34px ${SANS}`;
      g.fillText(`(FRASES) — ${String(i + 1).padStart(2, '0')} / ${String(FRASES.length).padStart(2, '0')}`, 56, 92);
      richText(g, FRASES[i], 52, 240, W - 110, 104, 116, [PAPER, ACCENT]);
      g.fillStyle = MUTE; g.font = `500 40px ${SANS}`;
      g.fillText('Muda sozinha. Enter mostra todas.', 56, 530);
    });
  }

  zones() {
    this.ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(ACCENT).multiplyScalar(2) });
    const ringGeo = new THREE.RingGeometry(0.86, 1, 96);
    const home = this.label('Ilha do Cauê', 'dirija até as placas', 11);
    home.position.set(0, 0.03, 6.2);
    this.scene.add(home);

    for (const z of ZONES) {
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(ACCENT).multiplyScalar(1.5), transparent: true, opacity: 0.85, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(z.x, 0.04, z.z);
      ring.scale.setScalar(z.r);
      z.ring = ring;
      this.rings.push(ring);
      const lab = this.label(z.n ? `(${z.n}) ${z.title}` : z.title.replace('Oi, eu sou o Cauê', 'Oi!'), z.sub);
      lab.position.set(z.x + 0.6, 0.03, z.z + z.r - 1.9);
      this.scene.add(ring, lab);
      let tex;
      if (z.id === 'frases') { tex = this.phraseTex = canvasTexture(1024, 600, () => {}); this.drawPhrase(0); }
      else tex = this.signTexture(z.sign);
      this.board(z.x, z.z - z.r + 0.6, 6.4, 3.75, tex, true);
    }
  }

  scoreboard() {
    this.scoreTex = canvasTexture(1024, 600, () => {});
    this.setScore({ gols: 0, saltos: 0, tchibuns: 0 });
    this.board(17, 12, 6.4, 3.75, this.scoreTex, true);
  }

  setScore(s) {
    this.scoreTex.userData.redraw((g, W, H) => {
      g.fillStyle = INK; g.fillRect(0, 0, W, H);
      g.fillStyle = ACCENT; g.fillRect(0, H - 18, W, 18);
      g.fillStyle = MUTE; g.font = `500 34px ${SANS}`;
      g.fillText('(PLACAR) — NA ILHA', 56, 92);
      [['Gols', s.gols], ['Saltos', s.saltos], ['Tchibuns', s.tchibuns]].forEach(([k, v], i) => {
        const x = 56 + i * 320;
        g.fillStyle = PAPER; g.font = `400 210px ${SANS}`;
        g.fillText(String(v), x - 8, 360);
        g.font = `italic 64px ${SERIF}`;
        g.fillText(k, x, 470);
      });
    });
  }

  /* ---------- ramps ---------- */
  ramps() {
    const { len, width, h } = RAMP;
    const shape = new THREE.Shape([new THREE.Vector2(-len / 2, 0), new THREE.Vector2(0, h), new THREE.Vector2(len / 2, 0)]);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false }).translate(0, 0, -width / 2);
    const stripes = canvasTexture(256, 64, (g, W, H) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? PAPER : '#ff8c42'; g.fillRect(i * W / 8, 0, W / 8, H); }
    });
    stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
    stripes.repeat.set(0.18, 0.4);
    const mat = new THREE.MeshLambertMaterial({ map: stripes, flatShading: true });
    for (const r of RAMPS) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(r.x, 0, r.z);
      m.rotation.y = Math.atan2(-r.dir[1], r.dir[0]);
      m.castShadow = m.receiveShadow = true;
      this.scene.add(m);
    }
  }

  inPool(x, z) {
    return Math.abs(x - POOL.x) < POOL.w / 2 - 0.5 && Math.abs(z - POOL.z) < POOL.d / 2 - 0.5;
  }

  groundAt(x, z) {
    if (this.inPool(x, z)) return -1.6;
    let y = 0;
    for (const r of RAMPS) {
      const dx = x - r.x, dz = z - r.z;
      const u = dx * r.dir[0] + dz * r.dir[1], v = -dx * r.dir[1] + dz * r.dir[0];
      if (Math.abs(v) < RAMP.width / 2 && Math.abs(u) < RAMP.len / 2) y = Math.max(y, RAMP.h * (1 - Math.abs(u) / (RAMP.len / 2)));
    }
    return y;
  }

  /* ---------- futebol ---------- */
  football() {
    const F = FIELD, white = this.whiteMat;
    const netTex = canvasTexture(128, 128, (g, W) => {
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 5;
      for (let i = 0; i <= W; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, W); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); }
    });
    netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
    netTex.repeat.set(4, 3);
    const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.8 });
    const H = 2.6, half = F.goal / 2;
    for (const side of [-1, 1]) {
      const gx = F.x + side * F.w / 2, bx = gx + side * F.depth;
      const g = new THREE.Group();
      g.add(tube(V(gx, 0, F.z - half), V(gx, H, F.z - half), 0.12, white));
      g.add(tube(V(gx, 0, F.z + half), V(gx, H, F.z + half), 0.12, white));
      g.add(tube(V(gx, H, F.z - half), V(gx, H, F.z + half), 0.12, white));
      for (const dz of [-half, half]) g.add(tube(V(gx, H, F.z + dz), V(bx, 0, F.z + dz), 0.05, white));
      const back = new THREE.Mesh(new THREE.PlaneGeometry(F.goal, Math.hypot(H, F.depth)), netMat);
      back.rotation.y = Math.PI / 2;
      const lean = new THREE.Group();
      lean.position.set((gx + bx) / 2, H / 2, F.z);
      lean.rotation.z = side * Math.atan2(F.depth, H);
      lean.add(back);
      g.add(lean);
      for (const dz of [-half, half]) {
        const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, H), new THREE.Vector2(side * F.depth, 0)]);
        const tri = new THREE.Mesh(new THREE.ShapeGeometry(shape), netMat);
        tri.position.set(gx, 0, F.z + dz);
        g.add(tri);
      }
      this.scene.add(g);
      for (const dz of [-half, half]) {
        this.physics.addStatic(gx, F.z + dz, 0.25);
        for (let k = 0.6; k <= F.depth; k += 0.6) this.physics.addStatic(gx + side * k, F.z + dz, 0.25);
      }
      for (let z = -half; z <= half + 0.01; z += 0.6) this.physics.addStatic(bx + side * 0.2, F.z + z, 0.3);
    }
    // corner flags
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = F.x + sx * F.w / 2, z = F.z + sz * F.d / 2;
      const flag = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.7, -0.22), new THREE.Vector2(0, -0.45)])), new THREE.MeshLambertMaterial({ color: '#ff8c42', side: THREE.DoubleSide }));
      flag.position.set(x, 1.6, z);
      this.scene.add(tube(V(x, 0, z), V(x, 1.65, z), 0.04, white), flag);
    }

    // the ball: pentagons are the triangles that touch the 12 original icosahedron corners
    const geo = new THREE.IcosahedronGeometry(0.75, 2).toNonIndexed();
    const t = (1 + Math.sqrt(5)) / 2;
    const corners = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(c => new THREE.Vector3(...c).normalize());
    const pos = geo.attributes.position, col = [], v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      let dark = false;
      for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, i + k).normalize(); if (corners.some(c => c.distanceTo(v) < 0.01)) dark = true; }
      const c = dark ? [0.08, 0.1, 0.09] : [1, 1, 1];
      for (let k = 0; k < 3; k++) col.push(...c);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const ball = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    ball.castShadow = true;
    this.ball = this.addDynamic(ball, { x: F.x, z: F.z, r: 0.75, m: 0.55, h: 1.5, friction: 0.55, canFall: false, spin: 0, hop: 0.12, roll: true });
  }

  resetBall() {
    Object.assign(this.ball, { x: FIELD.x, z: FIELD.z, vx: 0, vz: 0, vy: 4, y: 1.5 });
  }

  /* ---------- piscina ---------- */
  pool() {
    const P = POOL;
    const waterTex = canvasTexture(256, 256, (g, W) => {
      g.fillStyle = '#39b8dc'; g.fillRect(0, 0, W, W);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3;
      const r = rng(5);
      for (let i = 0; i < 26; i++) {
        const y = r() * W, x = r() * W, len = 30 + r() * 60;
        g.beginPath(); g.moveTo(x, y);
        g.bezierCurveTo(x + len * 0.3, y - 8, x + len * 0.6, y + 8, x + len, y);
        g.stroke();
      }
    });
    waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
    waterTex.repeat.set(3, 1.8);
    this.waterTex = waterTex;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(P.w, P.d), new THREE.MeshLambertMaterial({ map: waterTex, emissive: '#1b6f9a', emissiveIntensity: 0.25 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(P.x, 0.06, P.z);
    water.receiveShadow = true;
    this.scene.add(water);
    const edge = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), this.whiteMat); m.position.set(x, 0.09, z); m.receiveShadow = true; this.scene.add(m); };
    edge(P.w + 0.8, 0.4, P.x, P.z - P.d / 2 - 0.2);
    edge(P.w + 0.8, 0.4, P.x, P.z + P.d / 2 + 0.2);
    edge(0.4, P.d, P.x - P.w / 2 - 0.2, P.z);
    edge(0.4, P.d, P.x + P.w / 2 + 0.2, P.z);

    // trampolim
    const bx = P.x + P.w / 2 + 1.2;
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, 1.1), this.inkMat);
    base.position.set(bx, 0.35, P.z);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.8), this.mat('#2a5bd7'));
    plank.position.set(bx - 1.6, 0.76, P.z);
    base.castShadow = plank.castShadow = true;
    this.plank = plank;
    this.scene.add(base, plank);
    this.physics.addStatic(bx, P.z, 0.6);

    // ladder
    for (const dz of [-0.45, 0.45]) {
      const x = P.x - P.w / 2 + 0.15, z = P.z + 1.5 + dz;
      this.scene.add(tube(V(x - 0.5, 0, z), V(x - 0.5, 1, z), 0.05, this.whiteMat), tube(V(x - 0.5, 1, z), V(x + 0.25, 0.6, z), 0.05, this.whiteMat));
    }

    // boias
    this.floaties = [];
    const torus = new THREE.TorusGeometry(0.6, 0.24, 8, 18).rotateX(Math.PI / 2);
    [['#ff4d6d', -3.5, -1.2], ['#ffd23f', 0.5, 1.4], ['#c86bff', 3.2, -0.6]].forEach(([c, dx, dz], i) => {
      const m = new THREE.Mesh(torus, this.mat(c));
      m.castShadow = true;
      m.position.set(P.x + dx, 0.12, P.z + dz);
      this.floaties.push({ m, x: m.position.x, z: m.position.z, ph: i * 2.1 });
      this.scene.add(m);
    });

    // guarda-sol
    const ux = P.x - P.w / 2 - 0.4, uz = P.z - P.d / 2 - 1.4;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.8, 8, 1, true), new THREE.MeshLambertMaterial({ map: canvasTexture(256, 16, (g, W, H) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? PAPER : '#ff4d6d'; g.fillRect(i * W / 8, 0, W / 8, H); } }), side: THREE.DoubleSide, flatShading: true }));
    cone.position.set(ux, 2.6, uz);
    cone.castShadow = true;
    this.scene.add(cone, tube(V(ux, 0, uz), V(ux, 2.9, uz), 0.06, this.inkMat));
    this.physics.addStatic(ux, uz, 0.3);
  }

  /* ---------- bicicleta ---------- */
  bike() {
    const frame = this.mat('#ff4d6d'), rubber = this.mat('#1d2a22'), jersey = this.mat('#ffc61a'), shorts = this.mat('#2a5bd7'), skin = this.mat('#d9a07a'), helmet = this.mat(ACCENT);
    const root = new THREE.Group(), body = new THREE.Group();
    root.add(body);
    const WR = 0.55, rear = V(0, WR, -0.8), front = V(0, WR, 0.85), crank = V(0, 0.5, -0.05), seat = V(0, 1.35, -0.38), head = V(0, 1.3, 0.62);
    body.add(tube(rear, crank, 0.05, frame), tube(rear, seat, 0.05, frame), tube(crank, seat, 0.06, frame), tube(crank, head, 0.06, frame), tube(seat.clone().setY(1.25), head.clone().setY(1.22), 0.05, frame), tube(head, front, 0.05, frame));
    body.add(tube(V(-0.35, 1.5, 0.66), V(0.35, 1.5, 0.66), 0.04, this.inkMat), tube(head, V(0, 1.5, 0.66), 0.05, frame));
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.42), this.inkMat);
    saddle.position.set(0, 1.42, -0.42);
    body.add(saddle);
    this.bikeWheels = [rear, front].map(p => {
      const w = new THREE.Group();
      w.position.copy(p);
      const tire = new THREE.Mesh(new THREE.TorusGeometry(WR, 0.07, 6, 18).rotateY(Math.PI / 2), rubber);
      tire.castShadow = true;
      w.add(tire);
      for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, WR * 2, 0.03), this.whiteMat); s.rotation.x = (k * Math.PI) / 3; w.add(s); }
      body.add(w);
      return w;
    });
    // rider
    const hip = V(0, 1.55, -0.32), shoulder = V(0, 2.25, 0.08);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.78, 0.3), jersey);
    setTube(torso, hip, shoulder); torso.scale.set(1, 1, 1); torso.castShadow = true;
    torso.position.addVectors(hip, shoulder).multiplyScalar(0.5);
    const headM = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), skin);
    headM.position.set(0, 2.58, 0.2);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), helmet);
    helm.position.set(0, 2.62, 0.18);
    headM.castShadow = helm.castShadow = true;
    body.add(torso, headM, helm);
    for (const sx of [-1, 1]) body.add(tube(V(sx * 0.27, 2.18, 0.08), V(sx * 0.3, 1.52, 0.64), 0.06, jersey));
    this.legs = [-1, 1].map(sx => ({ sx, thigh: tube(hip, hip, 0.09, shorts), shin: tube(hip, hip, 0.07, skin) }));
    this.legs.forEach(l => body.add(l.thigh, l.shin));
    this.bikeHip = hip; this.bikeCrank = crank;
    root.scale.setScalar(0.95);
    this.scene.add(root);
    this.bikeRoot = root; this.bikeBody = body;
    this.bikeT = 0;
    this.bikeBody.userData.crank = 0;
    this.bikeStatic = { x: TRACK.x + TRACK.a, z: TRACK.z, r: 0.8 };
    this.physics.statics.push(this.bikeStatic);

    // cones for slalom
    const coneGeo = new THREE.ConeGeometry(0.32, 0.9, 8).translate(0, 0.45, 0);
    const coneMat = this.mat('#ff8c42');
    for (const [dx, dz] of [[-6, -2.2], [-6, 2.2], [-4.5, 0], [5, -2.2], [5, 2.2], [6.5, 0]]) {
      const m = new THREE.Mesh(coneGeo, coneMat);
      m.castShadow = true;
      this.addDynamic(m, { x: TRACK.x + dx, z: TRACK.z + dz, r: 0.35, m: 0.2, h: 1, friction: 2, canFall: true, fallAt: 1, spin: 0.6, hop: 0.2, lift: 0.3 });
    }
  }

  updateBike(dt) {
    const T = TRACK, speed = 6.5;
    const s = Math.sin(this.bikeT), c = Math.cos(this.bikeT);
    this.bikeT += (speed * dt) / Math.hypot(T.a * s, T.b * c);
    const x = T.x + T.a * Math.cos(this.bikeT), z = T.z + T.b * Math.sin(this.bikeT);
    const tx = -T.a * Math.sin(this.bikeT), tz = T.b * Math.cos(this.bikeT);
    this.bikeRoot.position.set(x, 0, z);
    const heading = Math.atan2(tx, tz);
    this.bikeRoot.rotation.y = heading;
    this.bikeBody.rotation.z = -0.18;
    Object.assign(this.bikeStatic, { x, z });
    for (const w of this.bikeWheels) w.rotation.x += (speed * dt) / 0.55;
    const a = (this.bikeBody.userData.crank += speed * dt * 1.4);
    const H = this.bikeHip, C = this.bikeCrank, Lt = 0.62;
    for (const l of this.legs) {
      const ang = a + (l.sx > 0 ? Math.PI : 0);
      const pedal = V(l.sx * 0.16, C.y + Math.sin(ang) * 0.2, C.z + Math.cos(ang) * 0.2);
      const hip = V(l.sx * 0.14, H.y, H.z);
      const d = Math.min(hip.distanceTo(pedal), Lt * 1.98);
      const mid = hip.clone().add(pedal).multiplyScalar(0.5);
      const dir = pedal.clone().sub(hip).normalize();
      const perp = V(0, -dir.z, dir.y);
      if (perp.z < 0) perp.negate();
      const knee = mid.add(perp.multiplyScalar(Math.sqrt(Math.max(Lt * Lt - (d / 2) ** 2, 0))));
      setTube(l.thigh, hip, knee);
      setTube(l.shin, knee, pedal);
    }
  }

  /* ---------- brincar ---------- */
  playground() {
    const P = PARK;
    // balanço
    const sx0 = P.x - 7, sx1 = P.x - 2.2, sz = P.z - 3, top = 3.1, frameMat = this.mat('#2a5bd7');
    for (const x of [sx0, sx1]) {
      this.scene.add(tube(V(x, 0, sz - 1.1), V(x, top, sz), 0.1, frameMat), tube(V(x, 0, sz + 1.1), V(x, top, sz), 0.1, frameMat));
      this.physics.addStatic(x, sz, 0.5);
    }
    this.scene.add(tube(V(sx0, top, sz), V(sx1, top, sz), 0.1, frameMat));
    for (let x = sx0 + 0.8; x < sx1 - 0.4; x += 0.8) this.physics.addStatic(x, sz, 0.55);
    this.swings = [sx0 + 1.2, sx1 - 1.2].map((x, i) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, top, sz);
      for (const dx of [-0.38, 0.38]) pivot.add(tube(V(dx, 0, 0), V(dx, -2.3, 0), 0.025, this.inkMat));
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.45), this.mat(i ? '#ff4d6d' : '#ffd23f'));
      seat.position.y = -2.32;
      seat.castShadow = true;
      pivot.add(seat);
      this.scene.add(pivot);
      return { pivot, ph: i * 1.7 };
    });

    // escorregador
    const tx = P.x + 4.5, tz = P.z - 3.2, th = 2.1, towerMat = this.mat('#ffd23f');
    const platform = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 1.5), towerMat);
    platform.position.set(tx, th, tz);
    platform.castShadow = true;
    this.scene.add(platform);
    for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) this.scene.add(tube(V(tx + dx, 0, tz + dz), V(tx + dx, th + 1.1, tz + dz), 0.07, this.inkMat));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.9, 4), this.mat('#ff4d6d'));
    roof.position.set(tx, th + 1.55, tz);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.scene.add(roof);
    const railA = V(0, 0, tz - 1.9), railB = V(0, th + 0.6, tz - 0.75);
    for (const dx of [-0.45, 0.45]) this.scene.add(tube(railA.clone().setX(tx + dx), railB.clone().setX(tx + dx), 0.05, this.inkMat));
    for (let k = 1; k < 5; k++) {
      const p = railA.clone().lerp(railB, k / 5.6);
      this.scene.add(tube(p.clone().setX(tx - 0.45), p.clone().setX(tx + 0.45), 0.035, this.inkMat));
    }
    const slideLen = Math.hypot(th - 0.15, 3.6);
    const slide = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, slideLen), this.mat('#ff8c42'));
    slide.position.set(tx, (th + 0.15) / 2, tz + 0.75 + 1.8);
    slide.rotation.x = Math.atan2(th - 0.15, 3.6);
    slide.castShadow = true;
    this.scene.add(slide);
    for (const dx of [-0.5, 0.5]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, slideLen), this.mat('#ff8c42'));
      wall.position.set(tx + dx, (th + 0.15) / 2 + 0.15, tz + 0.75 + 1.8);
      wall.rotation.x = slide.rotation.x;
      this.scene.add(wall);
    }
    this.physics.addStatic(tx, tz, 1.05);
    this.physics.addStatic(tx, tz + 2.6, 0.6);

    // gangorra
    const gx = P.x - 4, gz = P.z + 3.5;
    const base = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.6, 3), this.inkMat);
    base.position.set(gx, 0.3, gz);
    this.seesaw = new THREE.Group();
    this.seesaw.position.set(gx, 0.62, gz);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 0.5), this.mat('#c86bff'));
    plank.castShadow = true;
    this.seesaw.add(plank);
    for (const dx of [-1.9, 1.9]) this.seesaw.add(tube(V(dx, 0, -0.18), V(dx, 0.5, -0.18), 0.04, this.inkMat), tube(V(dx, 0, 0.18), V(dx, 0.5, 0.18), 0.04, this.inkMat), tube(V(dx, 0.5, -0.18), V(dx, 0.5, 0.18), 0.04, this.inkMat));
    this.scene.add(base, this.seesaw);
    this.physics.addStatic(gx, gz, 0.5);

    // blocos de montar
    const geo = new THREE.BoxGeometry(1.1, 1.1, 1.1).translate(0, 0.55, 0);
    const mats = ['#ff4d6d', '#ffd23f', '#2a5bd7', '#c86bff'].map(c => this.mat(c));
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(geo, mats[i % 4]);
      m.castShadow = m.receiveShadow = true;
      this.addDynamic(m, { x: P.x - 0.5 + (i % 4) * 1.3, z: P.z + 0.3 + Math.floor(i / 4) * 1.3, r: 0.68, m: 0.7, h: 1.2, friction: 2, canFall: false, spin: 0.5, hop: 0.3, lift: 0 });
    }
  }

  /* ---------- scenery ---------- */
  vegetation() {
    const r = this.random, spots = [];
    const blocked = [
      [0, 0, 10], [0, -13, 6], [17, 12, 4.5], [FIELD.x, FIELD.z, 12.5], [POOL.x, POOL.z, 10], [TRACK.x, TRACK.z, 12.5], [PARK.x, PARK.z, PARK.r + 2],
      ...RAMPS.map(q => [q.x, q.z, 5]), ...ZONES.map(q => [q.x, q.z, q.r + 3.5]),
    ];
    const free = (x, z) => {
      const d = Math.hypot(x, z);
      if (d > ISLAND - 5 || d < 13 || Math.abs(d - PATH.radius) < PATH.width + 2.2) return false;
      if (Math.abs(x) < 8 && Math.abs(z + 13) < 4) return false;
      if (blocked.some(([bx, bz, br]) => Math.hypot(x - bx, z - bz) < br)) return false;
      return !spots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 3.2);
    };
    const pick = n => {
      const out = [];
      for (let tries = 0; out.length < n && tries < n * 40; tries++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * ISLAND, x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (free(x, z)) { spots.push([x, z]); out.push([x, z]); }
      }
      return out;
    };

    const trees = pick(this.quality.high ? 80 : 60);
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 1.6, 6).translate(0, 0.8, 0);
    const leafGeo = new THREE.IcosahedronGeometry(1.25, 0).translate(0, 2.35, 0);
    const fruitGeo = new THREE.IcosahedronGeometry(0.2, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: '#6b3d6e', flatShading: true }), trees.length);
    const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ flatShading: true }), trees.length);
    const fruits = new THREE.InstancedMesh(fruitGeo, new THREE.MeshLambertMaterial({ flatShading: true, emissive: '#ffffff', emissiveIntensity: 0.08 }), trees.length * 4);
    const leafColors = ['#2fbf8f', '#3ddc97', '#1fa58a', '#7fe08a', '#2ab6a8'].map(c => new THREE.Color(c));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    trees.forEach(([x, z], i) => {
      const s = 0.85 + r() * 0.65;
      q.setFromAxisAngle(up, r() * 6.28);
      m.compose(v.set(x, 0, z), q, sc.setScalar(s));
      trunks.setMatrixAt(i, m);
      leaves.setMatrixAt(i, m);
      leaves.setColorAt(i, leafColors[i % leafColors.length]);
      for (let k = 0; k < 4; k++) {
        const a = r() * 6.28, h = 2.1 + r() * 0.9;
        const rr = Math.sqrt(Math.max(0, 1.25 * 1.25 - (h - 2.35) ** 2)) + 0.05;
        m.compose(v.set(x + Math.cos(a) * rr * s, h * s, z + Math.sin(a) * rr * s), q, sc.setScalar(s));
        fruits.setMatrixAt(i * 4 + k, m);
        fruits.setColorAt(i * 4 + k, new THREE.Color(CANDY[(i + k) % CANDY.length]));
      }
      this.physics.addStatic(x, z, 0.55 * s);
    });
    for (const im of [trunks, leaves, fruits]) { im.castShadow = true; im.receiveShadow = true; this.scene.add(im); }

    const rocks = pick(this.quality.high ? 40 : 28);
    const rockMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ flatShading: true }), rocks.length);
    const rockColors = ['#b9a8e0', '#a191d6', '#cbbcef'].map(c => new THREE.Color(c));
    rocks.forEach(([x, z], i) => {
      const s = 0.45 + r() * 0.9;
      q.setFromEuler(new THREE.Euler(r(), r() * 6, r()));
      m.compose(v.set(x, s * 0.35, z), q, sc.set(s, s * 0.75, s));
      rockMesh.setMatrixAt(i, m);
      rockMesh.setColorAt(i, rockColors[i % 3]);
      this.physics.addStatic(x, z, s * 0.85);
    });
    rockMesh.castShadow = rockMesh.receiveShadow = true;
    this.scene.add(rockMesh);
  }

  lamps() {
    const glowTex = canvasTexture(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,214,120,1)');
      gr.addColorStop(1, 'rgba(255,214,120,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
    const lanternMat = new THREE.MeshLambertMaterial({ color: '#ffe7a3', emissive: '#ffcf5a', emissiveIntensity: 0.3 });
    this.lampMats.push(lanternMat);
    const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.glows.push(glowMat);
    const glowGeo = new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2);
    for (let a = 0; a < 360; a += 20) {
      const [x, z] = polar(a + 10, PATH.radius + PATH.width + 1.3);
      if ([...ZONES, ...RAMPS].some(q => Math.hypot(x - q.x, z - q.z) < 7.5)) continue;
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), lanternMat);
      lantern.position.set(x, 3.1, z);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.35, 4), this.inkMat);
      cap.position.set(x, 3.55, z);
      cap.rotation.y = Math.PI / 4;
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(x, 0.05, z);
      this.scene.add(this.post(x, z, 2.8), lantern, cap, glow);
    }
  }

  addDynamic(mesh, body) {
    const pivot = new THREE.Group();
    pivot.add(mesh);
    this.scene.add(pivot);
    const b = this.physics.addBody({ ...body, pivot, tilt: 0, tiltV: 0, tiltTarget: 0, axis: new THREE.Vector3(1, 0, 0), yaw: body.yaw ?? 0, yawV: 0, fallenAt: 0, home: [body.x, body.z] });
    b.onHit = (impact, nx, nz) => {
      if (b.canFall && impact > b.fallAt && b.tiltTarget === 0) {
        b.axis.set(nz, 0, -nx).normalize();
        b.tiltTarget = Math.PI / 2;
        b.fallenAt = performance.now();
      }
      b.yawV += (Math.random() - 0.5) * impact * b.spin;
      b.vy = Math.max(b.vy, Math.min(impact * b.hop, 6));
    };
    this.dynamic.push(b);
    return b;
  }

  letters() {
    this.fontLoader.load('vendor/three/examples/fonts/helvetiker_bold.typeface.json', font => {
      const mats = ['#ffd23f', '#1fbf5b', '#2a5bd7', '#ff4d6d'].map(c => this.mat(c));
      // helvetiker has no "Ê": the circumflex is built from two bars over an "E"
      [...'CAUE'].forEach((ch, i) => {
        const geo = new TextGeometry(ch, { font, size: 2.4, depth: 0.9, curveSegments: 3, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 1 });
        geo.computeBoundingBox();
        const bb = geo.boundingBox;
        geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
        const g = new THREE.Group();
        const mesh = new THREE.Mesh(geo, mats[i]);
        g.add(mesh);
        if (i === 3) {
          const top = bb.max.y - bb.min.y;
          for (const s of [-1, 1]) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.26, 0.9), mats[i]);
            bar.position.set(s * 0.33, top + 0.5, 0);
            bar.rotation.z = -s * 0.6;
            g.add(bar);
          }
        }
        g.traverse(o => { o.castShadow = o.receiveShadow = true; });
        this.addDynamic(g, { x: -4.2 + i * 2.8, z: -13, r: 1.05, m: 1.4, h: 2.8, friction: 2.4, canFall: true, fallAt: 3.5, spin: 0.25, hop: 0.12, lift: 0.5 });
      });
    });
  }

  /* ---------- particles: dust, splash, confetti share one instanced mesh ---------- */
  particles() {
    const n = 220;
    this.partMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.28, 0), new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), n);
    this.partMesh.frustumCulled = false;
    this.parts = Array.from({ length: n }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), g: 0, size: 1 }));
    this.partNext = 0;
    this.partMatrix = new THREE.Matrix4();
    const white = new THREE.Color('#fff1e2');
    for (let i = 0; i < n; i++) { this.partMesh.setMatrixAt(i, this.partMatrix.makeScale(0, 0, 0)); this.partMesh.setColorAt(i, white); }
    this.scene.add(this.partMesh);
  }

  emit(pos, { color = '#fff1e2', size = 1, v = [0, 1, 0], spread = 1.5, g = 0, life = 1 } = {}) {
    const i = this.partNext;
    const p = this.parts[i];
    this.partNext = (i + 1) % this.parts.length;
    Object.assign(p, { life, size, g });
    p.p.copy(pos);
    p.v.set(v[0] + (Math.random() - 0.5) * spread, v[1] * (0.6 + Math.random() * 0.8), v[2] + (Math.random() - 0.5) * spread);
    this.partMesh.setColorAt(i, new THREE.Color(color));
    this.partMesh.instanceColor.needsUpdate = true;
  }

  puff(pos, amount = 1) {
    this.emit(V(pos.x, 0.25, pos.z), { size: amount });
  }

  splash(x, z) {
    for (let i = 0; i < 40; i++) this.emit(V(x + (Math.random() - 0.5) * 2, 0.3, z + (Math.random() - 0.5) * 2), { color: i % 3 ? '#bfeefc' : '#ffffff', size: 0.55, v: [0, 9, 0], spread: 7, g: 22, life: 1.3 });
  }

  confetti(x, z) {
    for (let i = 0; i < 70; i++) this.emit(V(x, 1.5, z), { color: CANDY[i % CANDY.length], size: 0.4, v: [0, 13, 0], spread: 10, g: 16, life: 1.8 });
  }

  update(dt, time, cycle, car, camera, level) {
    const st = cycle.state;
    this.sun.color.copy(st.sun);
    this.sun.intensity = st.sunI;
    this.hemi.color.copy(st.sky);
    this.hemi.groundColor.copy(st.ground);
    this.hemi.intensity = st.hemiI;
    this.skyMat.uniforms.uTop.value.copy(st.fogA);
    this.skyMat.uniforms.uHorizon.value.copy(st.fogB);
    this.scene.fog.color.copy(st.fogB);
    this.starMat.opacity = st.night;
    this.skyMesh.position.copy(camera.position);
    this.stars.position.copy(camera.position);

    const focus = level === 2 ? car : { x: 0, z: -2 };
    this.setShadowExtent(level === 2 ? 30 : 66);
    this.sun.target.position.set(focus.x, 0, focus.z);
    this.sun.position.set(focus.x - 22, 34, focus.z + 18);

    const gu = this.grass.material.uniforms;
    gu.uTime.value = time;
    gu.uCenter.value.set(level === 2 ? car.x : camera.position.x * 0.35, level === 2 ? car.z - 7 : camera.position.z * 0.35 - 8);
    gu.uCar.value.set(car.x, car.y, car.z);
    gu.uLit.value.copy(st.sun).multiplyScalar(st.sunI * 0.32).add(new THREE.Color().copy(st.sky).multiplyScalar(st.hemiI * 0.42));
    gu.uFog.value.copy(st.fogB);
    gu.uFogNear.value = this.scene.fog.near;
    gu.uFogFar.value = this.scene.fog.far;

    for (const m of this.lampMats) m.emissiveIntensity = 0.3 + st.lamp;
    for (const m of this.glows) m.opacity = Math.min(st.night * 1.1, 0.85);
    for (const m of this.screens) m.emissiveIntensity = 0.15 + st.night * 0.75;
    this.ledMat.color.set(ACCENT).multiplyScalar(1.3 + st.night * 2.2);
    this.foam.scale.setScalar(1 + Math.sin(time * 0.8) * 0.006);

    for (const z of ZONES) {
      const active = z === this.activeZone;
      z.ring.material.opacity = active ? 0.65 + Math.sin(time * 6) * 0.3 : 0.55;
      z.ring.scale.setScalar(z.r * (active ? 1.04 + Math.sin(time * 6) * 0.02 : 1));
    }

    // living things: water, floaties, bike, swings, seesaw
    this.waterTex.offset.set(time * 0.03, Math.sin(time * 0.4) * 0.05);
    for (const f of this.floaties) {
      f.m.position.set(f.x + Math.sin(time * 0.3 + f.ph) * 0.8, 0.12 + Math.sin(time * 1.6 + f.ph) * 0.05, f.z + Math.cos(time * 0.25 + f.ph) * 0.5);
      f.m.rotation.y = time * 0.2 + f.ph;
      f.m.rotation.x = Math.sin(time * 1.3 + f.ph) * 0.06;
    }
    this.plank.rotation.z = Math.sin(time * 5) * 0.015;
    this.updateBike(dt);
    for (const s of this.swings) s.pivot.rotation.x = Math.sin(time * 2.1 + s.ph) * 0.55;
    this.seesaw.rotation.z = Math.sin(time * 1.5) * 0.24;

    const q = new THREE.Quaternion(), qy = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), axis = new THREE.Vector3();
    const now = performance.now();
    for (const b of this.dynamic) {
      if (b.roll) {
        const sp = Math.hypot(b.vx, b.vz);
        if (sp > 1e-3) b.pivot.quaternion.premultiply(q.setFromAxisAngle(axis.set(b.vz, 0, -b.vx).normalize(), (sp * dt) / b.r));
        b.pivot.position.set(b.x, b.y + b.r, b.z);
        continue;
      }
      b.yaw += b.yawV * dt;
      b.yawV *= Math.exp(-3 * dt);
      if (b.tiltTarget > 0 && now - b.fallenAt > 9000 && Math.hypot(car.x - b.x, car.z - b.z) > 7) b.tiltTarget = 0;
      b.tiltV += ((b.tiltTarget - b.tilt) * 70 - b.tiltV * 9) * dt;
      b.tilt += b.tiltV * dt;
      if (b.tiltTarget > 0 && b.tilt > b.tiltTarget) { b.tilt = b.tiltTarget; b.tiltV *= -0.3; }
      if (b.tilt < 0) { b.tilt = 0; b.tiltV = 0; }
      q.setFromAxisAngle(b.axis, b.tilt);
      qy.setFromAxisAngle(up, b.yaw);
      b.pivot.quaternion.copy(q).multiply(qy);
      b.pivot.position.set(b.x, b.y + Math.sin(b.tilt) * b.lift, b.z);
    }

    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      if (p.life <= 0) continue;
      p.life -= dt * 1.4;
      p.v.y -= p.g * dt;
      p.p.addScaledVector(p.v, dt);
      if (p.g && p.p.y < 0.05) { p.p.y = 0.05; p.v.set(0, 0, 0); }
      const s = Math.max(p.life, 0) * p.size * (1.6 - p.life * 0.6);
      this.partMesh.setMatrixAt(i, this.partMatrix.makeScale(s, s, s).setPosition(p.p));
    }
    this.partMesh.instanceMatrix.needsUpdate = true;
  }
}
