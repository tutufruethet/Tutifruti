import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { createGrass } from './grass.js';

export const ISLAND = 66;
export const PATH = { radius: 32, width: 2.4 };
const FOTOS = '../portfolio/fotos/';
const CANDY = ['#ff4d6d', '#ffd23f', '#2433ff', '#3ddc97', '#c86bff', '#ff8c42'];

const polar = (deg, r) => [Math.cos(deg * Math.PI / 180) * r, Math.sin(deg * Math.PI / 180) * r];

export const ZONES = [
  { id: 'neon', kind: 'series', n: '01', title: 'Neon', pos: polar(214.7, 39), fotos: [['neon.webp', 3 / 4, 'Asas de luz']] },
  { id: 'veneza', kind: 'series', n: '02', title: 'Veneza', pos: polar(255.5, 39), fotos: [['veneza.webp', 1, 'Gôndola']] },
  { id: 'bumblebee', kind: 'series', n: '03', title: 'Bumblebee', pos: polar(294.2, 39), fotos: [['bumblebee-1.webp', 9 / 16, 'Escala'], ['bumblebee-2.webp', 9 / 16, 'Joinha duplo']] },
  { id: 'jurassico', kind: 'series', n: '04', title: 'Jurássico', pos: polar(333.5, 39), fotos: [['jurassico-1.webp', 9 / 16, 'Paz'], ['jurassico-2.webp', 9 / 16, 'A pose'], ['jurassico-3.webp', 9 / 16, 'Olhar de canto']] },
  { id: 'sobre', kind: 'info', title: 'Sobre', sub: 'quem fez a ilha', sign: ['(SOBRE)', 'Sobre', 'a ilha'], pos: polar(153.4, 24) },
  { id: 'codigo', kind: 'info', title: 'Como foi feito', sub: 'shaders, física e luz', sign: ['(CÓDIGO)', 'Como foi', 'feito'], pos: polar(90, 24) },
  { id: 'nivel1', kind: 'info', title: 'Nível 1', sub: 'voltar ao design', sign: ['(DESIGN)', 'Nível 1', 'o design'], pos: polar(30.6, 24) },
  { id: 'boliche', kind: 'play', title: 'Boliche', sub: 'derrube os 10 pinos', pos: [-46, 6] },
  { id: 'caixas', kind: 'play', title: 'Caixas', sub: 'empurre tudo', pos: [46, 6] },
].map(z => ({ ...z, x: z.pos[0], z: z.pos[1], r: z.kind === 'play' ? 6 : 6.5 }));

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
  return t;
}

const SANS = '"Instrument Sans", system-ui, sans-serif';
const SERIF = '"Instrument Serif", Georgia, serif';

export class World {
  constructor({ scene, physics, manager, quality, renderer }) {
    this.scene = scene;
    this.physics = physics;
    this.quality = quality;
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();
    this.textures = new THREE.TextureLoader(manager);
    this.fontLoader = new FontLoader(manager);
    this.random = rng(7);
    this.lampMats = [];
    this.glows = [];
    this.rings = [];
    this.screens = [];
    this.dynamic = [];

    this.lights();
    this.sky();
    this.island();
    this.grass = createGrass({
      subdivisions: quality.high ? 270 : 150,
      size: quality.high ? 62 : 44,
      island: ISLAND,
      path: PATH,
      hide: [new THREE.Vector4(0, 0, 9.5, 1.5), ...ZONES.map(z => new THREE.Vector4(z.x, z.z, z.r + 0.2, 1.4))],
    });
    scene.add(this.grass);
    this.zones();
    this.vegetation();
    this.lamps();
    this.letters();
    this.bowling();
    this.crates();
    this.dust();
  }

  lights() {
    this.hemi = new THREE.HemisphereLight('#c4e9ff', '#6a4fd6', 1.1);
    this.sun = new THREE.DirectionalLight('#fff0d6', 2.5);
    this.sun.castShadow = true;
    const s = this.sun.shadow;
    s.mapSize.set(this.quality.high ? 2048 : 1024, this.quality.high ? 2048 : 1024);
    s.bias = -0.0006;
    s.normalBias = 0.04;
    s.camera.near = 1;
    s.camera.far = 140;
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
      ring(0, 0, PATH.radius, PATH.width * 2 + 0.8, '#f2b48a');
      ring(0, 0, PATH.radius, PATH.width * 2, '#ffd9b3');
      g.setLineDash([1.6 * s, 1.6 * s]); ring(0, 0, PATH.radius, 0.25, '#f6a77c'); g.setLineDash([]);
      disk(0, 0, 10, '#f2b48a'); disk(0, 0, 9.4, '#ffe3c7');
      for (let k = 2; k < 9; k += 2) ring(0, 0, k, 0.12, '#f7c49c');
      for (const z of ZONES) {
        disk(z.x, z.z, z.r + 0.4, '#f2b48a');
        disk(z.x, z.z, z.r, '#ffe6cc');
        for (let a = 0; a < 24; a++) {
          const t = (a / 24) * Math.PI * 2, [x1, y1] = P(z.x + Math.cos(t) * (z.r - 1.2), z.z + Math.sin(t) * (z.r - 1.2)), [x2, y2] = P(z.x + Math.cos(t) * (z.r - 0.5), z.z + Math.sin(t) * (z.r - 0.5));
          g.strokeStyle = '#f6c29b'; g.lineWidth = 0.18 * s; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        }
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
    this.water = water;
    this.foam = new THREE.Mesh(new THREE.RingGeometry(R + 1.4, R + 2.8, 128), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
    this.foam.rotation.x = -Math.PI / 2;
    this.foam.position.y = -0.62;
    this.scene.add(ground, beach, water, this.foam);
  }

  label(title, sub, w = 9) {
    const tex = canvasTexture(1024, 256, (g, W, H) => {
      g.fillStyle = 'rgba(27,22,64,.92)';
      g.font = `600 112px ${SANS}`;
      g.textBaseline = 'alphabetic';
      g.fillText(title, 24, 132);
      if (sub) { g.font = `italic 64px ${SERIF}`; g.fillStyle = 'rgba(27,22,64,.62)'; g.fillText(sub, 28, 214); }
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

  zones() {
    this.inkMat = new THREE.MeshLambertMaterial({ color: '#1b1640', flatShading: true });
    this.ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#2433ff').multiplyScalar(2.2) });
    const ringGeo = new THREE.RingGeometry(0.86, 1, 96);
    const home = this.label('Tutifruti', 'dirija até os outdoors', 11);
    home.position.set(0, 0.03, 6.2);
    this.scene.add(home);

    for (const z of ZONES) {
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#2433ff').multiplyScalar(1.6), transparent: true, opacity: 0.85, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(z.x, 0.04, z.z);
      ring.scale.setScalar(z.r);
      z.ring = ring;
      this.rings.push(ring);
      const lab = this.label(z.n ? `(${z.n}) ${z.title}` : z.title, z.kind === 'series' ? `${z.fotos.length} foto${z.fotos.length > 1 ? 's' : ''}` : z.sub);
      lab.position.set(z.x + 0.6, 0.03, z.z + z.r - 1.9);
      this.scene.add(ring, lab);

      if (z.kind === 'series') {
        const H = 4.6, gap = 0.9;
        const widths = z.fotos.map(([, a]) => H * a);
        const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
        let x = z.x - total / 2;
        z.fotos.forEach(([file], i) => {
          const tex = this.textures.load(FOTOS + file);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = this.maxAniso;
          this.board(x + widths[i] / 2, z.z - z.r + 0.6, widths[i], H, tex, true);
          x += widths[i] + gap;
        });
      } else if (z.kind === 'info') {
        const tex = canvasTexture(1024, 600, (g, W, H) => {
          g.fillStyle = '#1b1640'; g.fillRect(0, 0, W, H);
          g.fillStyle = '#2433ff'; g.fillRect(0, H - 18, W, 18);
          g.fillStyle = '#9c97b8'; g.font = `500 34px ${SANS}`;
          g.fillText(z.sign[0], 56, 92);
          g.fillStyle = '#f3f0fa'; g.font = `500 150px ${SANS}`;
          g.fillText(z.sign[1], 48, 290);
          g.font = `italic 120px ${SERIF}`;
          g.fillText(z.sign[2], 52, 420);
          g.fillStyle = '#9c97b8'; g.font = `500 40px ${SANS}`;
          g.fillText('Pare no círculo e aperte Enter', 56, 530);
        });
        this.board(z.x, z.z - z.r + 0.6, 6.4, 3.75, tex, false);
      }
    }
  }

  vegetation() {
    const r = this.random, spots = [];
    const free = (x, z, pad) => {
      const d = Math.hypot(x, z);
      if (d > ISLAND - 5 || d < 13 || Math.abs(d - PATH.radius) < PATH.width + 2.2) return false;
      if (Math.abs(x) < 14 && Math.abs(z + 13) < 4) return false;
      if (ZONES.some(q => Math.hypot(x - q.x, z - q.z) < q.r + pad)) return false;
      return !spots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 3.2);
    };
    const pick = (n, pad) => {
      const out = [];
      for (let tries = 0; out.length < n && tries < n * 40; tries++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * ISLAND, x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (free(x, z, pad)) { spots.push([x, z]); out.push([x, z]); }
      }
      return out;
    };

    const trees = pick(this.quality.high ? 95 : 70, 4);
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

    const rocks = pick(this.quality.high ? 45 : 30, 3);
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
      if (ZONES.some(q => Math.hypot(x - q.x, z - q.z) < q.r + 2)) continue;
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
      const mats = CANDY.map(c => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
      [...'TUTIFRUTI'].forEach((ch, i) => {
        const geo = new TextGeometry(ch, { font, size: 2.3, depth: 0.9, curveSegments: 3, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 1 });
        geo.computeBoundingBox();
        const bb = geo.boundingBox;
        geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
        const mesh = new THREE.Mesh(geo, mats[i % mats.length]);
        mesh.castShadow = mesh.receiveShadow = true;
        this.addDynamic(mesh, { x: -10.4 + i * 2.6, z: -13, r: 0.95, m: 1.4, h: 2.6, friction: 2.4, canFall: true, fallAt: 3.5, spin: 0.25, hop: 0.12, lift: 0.5 });
      });
    });
  }

  bowling() {
    const z = ZONES.find(q => q.id === 'boliche');
    const white = new THREE.MeshLambertMaterial({ color: '#f7f4ff' });
    const red = new THREE.MeshLambertMaterial({ color: '#ff4d6d' });
    const body = new THREE.CapsuleGeometry(0.22, 0.75, 3, 8).translate(0, 0.6, 0);
    const stripe = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8).translate(0, 0.95, 0);
    let row = 0;
    for (let n = 1; n <= 4; n++, row++) {
      for (let k = 0; k < n; k++) {
        const g = new THREE.Group();
        const a = new THREE.Mesh(body, white), b = new THREE.Mesh(stripe, red);
        a.castShadow = b.castShadow = true;
        g.add(a, b);
        this.addDynamic(g, { x: z.x - 1.5 + row * 0.85, z: z.z + (k - (n - 1) / 2) * 0.9, r: 0.3, m: 0.3, h: 1.4, friction: 1.6, canFall: true, fallAt: 1.2, spin: 0.6, hop: 0.2, lift: 0.22 });
      }
    }
  }

  crates() {
    const z = ZONES.find(q => q.id === 'caixas');
    const geo = new THREE.BoxGeometry(1.25, 1.25, 1.25).translate(0, 0.625, 0);
    const mats = ['#ff8c42', '#ffd23f', '#c86bff'].map(c => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
    for (let i = 0; i < 9; i++) {
      const mesh = new THREE.Mesh(geo, mats[i % 3]);
      mesh.castShadow = mesh.receiveShadow = true;
      this.addDynamic(mesh, { x: z.x + ((i % 3) - 1) * 1.45, z: z.z + (Math.floor(i / 3) - 1) * 1.45, r: 0.75, m: 0.8, h: 1.3, friction: 2, canFall: false, spin: 0.5, hop: 0.3, lift: 0 });
    }
  }

  dust() {
    const n = 90;
    this.dustMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.28, 0), new THREE.MeshLambertMaterial({ color: '#fff1e2', flatShading: true }), n);
    this.dustMesh.frustumCulled = false;
    this.dustParts = Array.from({ length: n }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() }));
    this.dustNext = 0;
    this.dustMatrix = new THREE.Matrix4();
    for (let i = 0; i < n; i++) this.dustMesh.setMatrixAt(i, this.dustMatrix.makeScale(0, 0, 0));
    this.scene.add(this.dustMesh);
  }

  puff(pos, amount = 1) {
    const p = this.dustParts[this.dustNext];
    this.dustNext = (this.dustNext + 1) % this.dustParts.length;
    p.life = 1;
    p.size = amount;
    p.p.copy(pos).setY(0.25);
    p.v.set((Math.random() - 0.5) * 1.5, 1 + Math.random(), (Math.random() - 0.5) * 1.5);
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

    const focus = level === 2 ? car : { x: 0, z: -4 };
    this.setShadowExtent(level === 2 ? 30 : 62);
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
    for (const m of this.screens) m.emissiveIntensity = 0.12 + st.night * 0.75;
    this.ledMat.color.set('#2433ff').multiplyScalar(1.4 + st.night * 2.5);
    this.foam.scale.setScalar(1 + Math.sin(time * 0.8) * 0.006);

    for (const z of this.rings ? ZONES : []) {
      const active = z === this.activeZone;
      z.ring.material.opacity = active ? 0.65 + Math.sin(time * 6) * 0.3 : 0.55;
      const s = z.r * (active ? 1.04 + Math.sin(time * 6) * 0.02 : 1);
      z.ring.scale.setScalar(s);
    }

    const q = new THREE.Quaternion(), qy = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    const now = performance.now();
    for (const b of this.dynamic) {
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

    for (let i = 0; i < this.dustParts.length; i++) {
      const p = this.dustParts[i];
      if (p.life <= 0) continue;
      p.life -= dt * 1.4;
      p.p.addScaledVector(p.v, dt);
      const s = Math.max(p.life, 0) * p.size * (1.6 - p.life * 0.6);
      this.dustMesh.setMatrixAt(i, this.dustMatrix.makeScale(s, s, s).setPosition(p.p));
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;
  }
}
