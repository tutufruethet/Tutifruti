import * as THREE from 'three';
import { PITCH, GOAL, pitchTexture, createBlades } from './turf.js';

// VR Arena Janga at night, built in code from the venue's photos: the society pitch inside a
// concrete wall with planters and green netting, eight floodlights, the two-storey bar
// (bar and restaurant below, a deck with a pergola above), the pool in front, two cabanas,
// the party pergola, a tree full of lights, palms and the neighbourhood around.

export const BUILDING = { x: 0, z: 21 };
export const POOL = { x: 0, z: 31, w: 18, h: 6 };
export const PARTY = { x: -34, z: 25 };
const FOG = new THREE.Color('#0b0f1c');
const FOG_DENSITY = 0.0095;
const MOON = new THREE.Vector3(-0.5, 0.35, -1).normalize();
const WARM = new THREE.Color('#ffb46b');
const hdr = (c, k) => new THREE.Color(c).multiplyScalar(k);

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const fogGLSL = /* glsl */`
  uniform vec3 uFog; uniform float uFogDensity;
  vec3 fogMix(vec3 c, float d){ return mix(c, uFog, 1. - exp(-uFogDensity * uFogDensity * d * d)); }
`;

// a soft additive glow card (light pooled on a wall, a halo round a bulb), instanced
function glowCards(count, color, strength = 1) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: strength } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uK; varying vec2 vUv; void main(){ vec2 d = (vUv - vec2(.5, .15)) * vec2(2., 1.15); float a = exp(-dot(d, d) * 3.5) * smoothstep(0., .12, vUv.y); gl_FragColor = vec4(uColor * a * uK, 1.); }`,
  });
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), mat, count);
  m.frustumCulled = false;
  return m;
}

export class World {
  constructor({ scene, renderer, high }) {
    this.scene = scene;
    this.high = high;
    this.rand = rng(11);
    this.aniso = renderer.capabilities.getMaxAnisotropy();
    this.fogU = { uFog: { value: FOG }, uFogDensity: { value: FOG_DENSITY } };
    this.lamps = [];
    this.timeU = { value: 0 };
    this.m4 = new THREE.Matrix4();
    scene.fog = new THREE.FogExp2(FOG, FOG_DENSITY);
    scene.background = FOG;

    const std = (color, roughness = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
    this.mat = {
      metal: std('#8d9299', 0.45, { metalness: 0.7 }),
      steel: std('#151618', 0.5, { metalness: 0.5 }),
      dark: std('#1c1d20', 0.6),
      white: std('#eceae4', 0.5),
      wood: std('#7a5534', 0.7),
      concrete: std('#77746d', 0.95),
      slab: std('#5d5b57', 0.9),
      tile: std('#a39a8b', 0.6),
      stone: std('#c4bcad', 0.75),
      cream: std('#eadcc3', 0.9),
      green: std('#1f4532', 0.7),
      leaf: std('#2c5427', 0.8, { side: THREE.DoubleSide }),
      leafRed: std('#8a1f3c', 0.8, { side: THREE.DoubleSide }),
      bulb: new THREE.MeshBasicMaterial({ color: hdr(WARM, 5) }),
    };
    this.logo = new THREE.TextureLoader().load('fotos/logo.webp', t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.aniso; });

    this.lights();
    this.sky();
    this.ground();
    this.pitch();
    this.goals();
    this.perimeter();
    this.floodlights();
    this.building();
    this.pool();
    this.cabanas();
    this.party();
    this.tree();
    this.palms();
    this.city();
  }

  /* ---------- light ---------- */
  lights() {
    // night bounce: blue-violet sky, never black shadows
    this.hemi = new THREE.HemisphereLight('#5a6aa8', '#1a1426', 0.55);
    this.scene.add(this.hemi);
    // the floodlights, summed into one key that casts the player's shadow
    const key = this.key = new THREE.DirectionalLight('#fff1dc', 0);
    key.position.set(-6, 26, 12);
    key.target.position.set(4, 0, 0);
    key.castShadow = this.high;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -24; key.shadow.camera.right = 24;
    key.shadow.camera.top = 16; key.shadow.camera.bottom = -16;
    key.shadow.camera.far = 60;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    this.scene.add(key, key.target);
    // moonlight
    const moon = new THREE.DirectionalLight('#9fb4ff', 0.35);
    moon.position.copy(MOON).multiplyScalar(80);
    this.scene.add(moon);
  }

  sky() {
    const sky = this.skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(420, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { uMoon: { value: MOON }, uTime: this.timeU },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
        fragmentShader: `
          uniform vec3 uMoon; uniform float uTime; varying vec3 vDir;
          float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
          void main(){
            vec3 d = normalize(vDir);
            float y = d.y;
            vec3 c = mix(vec3(.05, .07, .15), vec3(.008, .01, .03), smoothstep(0., .55, y));
            c += vec3(.16, .1, .12) * exp(-max(y, 0.) * 14.) * .35;               // warm city haze low
            // stars, twinkling
            vec3 q = floor(d * 260.);
            float s = step(.9965, hash(q)) * smoothstep(.02, .25, y);
            c += s * (.6 + .4 * sin(uTime * 2. + hash(q + 3.) * 30.)) * .9;
            // the moon and its halo
            float m = dot(d, uMoon);
            c += vec3(1., .96, .88) * smoothstep(.99955, .9997, m) * 3.;
            c += vec3(.35, .4, .6) * pow(max(m, 0.), 600.) * .6 + vec3(.15, .18, .3) * pow(max(m, 0.), 40.) * .25;
            gl_FragColor = vec4(c, 1.);
          }`,
      }),
    );
    sky.renderOrder = -1;
    this.scene.add(sky);
  }

  sky() {
    const sky = this.skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(420, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { uMoon: { value: MOON }, uTime: this.timeU },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
        fragmentShader: `
          uniform vec3 uMoon; uniform float uTime; varying vec3 vDir;
          float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
          void main(){
            vec3 d = normalize(vDir);
            float y = d.y;
            vec3 c = mix(vec3(.05, .07, .15), vec3(.008, .01, .03), smoothstep(0., .55, y));
            c += vec3(.16, .1, .12) * exp(-max(y, 0.) * 14.) * .35;               // warm city haze low
            // stars, twinkling
            vec3 q = floor(d * 260.);
            float s = step(.9965, hash(q)) * smoothstep(.02, .25, y);
            c += s * (.6 + .4 * sin(uTime * 2. + hash(q + 3.) * 30.)) * .9;
            // the moon and its halo
            float m = dot(d, uMoon);
            c += vec3(1., .96, .88) * smoothstep(.99955, .9997, m) * 3.;
            c += vec3(.35, .4, .6) * pow(max(m, 0.), 600.) * .6 + vec3(.15, .18, .3) * pow(max(m, 0.), 40.) * .25;
            gl_FragColor = vec4(c, 1.);
          }`,
      }),
    );
    sky.renderOrder = -1;
    this.scene.add(sky);
  }

  ground() {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#121411', roughness: 1 }));
    g.position.y = -0.02;
    g.receiveShadow = true;
    this.scene.add(g);
    const slab = (w, d, x, z, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), mat);
      m.position.set(x, 0.01, z);
      m.receiveShadow = true;
      this.scene.add(m);
    };
    slab(48, 2.6, 0, 15.9, this.mat.tile);      // walkway between the pitch and the bar
    slab(36, 14, 0, 31.5, this.mat.stone);      // pool deck
    slab(10, 12, -19, 30, this.mat.tile);       // path to the party area
  }

  /* ---------- wall, planters, netting ---------- */
  perimeter() {
    const X = PITCH.runW / 2 + 1.2, Z = PITCH.runH / 2 + 1, H = 2.8, NET = 9;
    const stain = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = '#8a8780'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${this.rand() < 0.5 ? '40,40,38' : '200,198,190'},${this.rand() * 0.08})`; g.fillRect(this.rand() * w, this.rand() * h, 2 + this.rand() * 6, 2 + this.rand() * 6); }
      for (let i = 0; i < 40; i++) { const x = this.rand() * w; const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(30,30,28,.25)'); grd.addColorStop(1, 'rgba(30,30,28,0)'); g.fillStyle = grd; g.fillRect(x, 0, 2 + this.rand() * 5, h * (0.3 + this.rand() * 0.7)); }
      g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 2, h); // panel joints
    });
    stain.wrapS = THREE.RepeatWrapping;
    const wallMat = len => { const t = stain.clone(); t.repeat.set(len / 6, 1); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); };
    const walls = [[2 * X, 0, -Z, 0], [2 * Z, -X, 0, Math.PI / 2], [2 * Z, X, 0, -Math.PI / 2]];
    for (const [len, x, z, ry] of walls) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(len, H, 0.3), wallMat(len));
      w.position.set(x, H / 2, z);
      w.rotation.y = ry;
      w.receiveShadow = true;
      this.scene.add(w);
    }

    // planters at the foot of the wall, each with an uplight washing the concrete
    const spots = [];
    for (let x = -X + 1.5; x < X - 1; x += 2.6) spots.push([x, -Z + 0.55, 0]);
    for (let z = -Z + 2; z < Z - 1; z += 2.6) spots.push([-X + 0.55, z, Math.PI / 2], [X - 0.55, z, -Math.PI / 2]);
    this.planters(spots.map(([x, z]) => [x, z]), 0.55);
    const glow = glowCards(spots.length, '#ffb46b', 1.1);
    const q = new THREE.Quaternion(), sc = new THREE.Vector3(1.6, 2.6, 1), p = new THREE.Vector3();
    spots.forEach(([x, z, ry], i) => {
      const n = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
      p.set(x, 0.05, z).addScaledVector(n, -0.38);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      glow.setMatrixAt(i, this.m4.compose(p, q, sc));
    });
    this.scene.add(glow);

    // green netting: above the wall on three sides, full height on the bar side
    const netTex = canvasTex(32, 32, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
    }, false);
    netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
    netTex.anisotropy = this.aniso;
    const nets = [[2 * X, 0, -Z, 0, H, NET], [2 * Z, -X, 0, Math.PI / 2, H, NET], [2 * Z, X, 0, -Math.PI / 2, H, NET], [2 * X, 0, Z, Math.PI, 0, NET]];
    for (const [len, x, z, ry, y0, y1] of nets) {
      const t = netTex.clone();
      t.repeat.set(len / 0.11, (y1 - y0) / 0.11);
      t.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, y1 - y0), new THREE.MeshStandardMaterial({ color: '#2a5a40', roughness: 0.8, alphaMap: t, alphaTest: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
      m.position.set(x, (y0 + y1) / 2, z);
      m.rotation.y = ry;
      this.scene.add(m);
    }
    const posts = [];
    for (let x = -X; x <= X + 0.01; x += 5.5) posts.push([x, -Z], [x, Z]);
    for (let z = -Z + 5; z < Z; z += 5.5) posts.push([-X, z], [X, z]);
    const inst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.07, NET + 0.2, 8).translate(0, (NET + 0.2) / 2, 0), this.mat.green, posts.length);
    posts.forEach(([x, z], i) => inst.setMatrixAt(i, this.m4.makeTranslation(x, 0, z)));
    inst.castShadow = true;
    this.scene.add(inst);
  }

  // clumps of tropical leaves (some red, like the cordylines along the venue's walls)
  planters(spots, scale = 1, y = 0.05) {
    const leaf = new THREE.PlaneGeometry(0.9, 0.16, 6, 1).translate(0.45, 0, 0).rotateX(-Math.PI / 2);
    const p = leaf.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = p.getX(i) / 0.9;
      p.setZ(i, p.getZ(i) * Math.sin(Math.PI * Math.min(k + 0.08, 1)));
      p.setY(i, Math.sin(k * 1.4) * 0.35 - k * k * 0.25);
    }
    leaf.computeVertexNormals();
    const per = 9, n = spots.length * per;
    const green = new THREE.InstancedMesh(leaf, this.mat.leaf, n), red = new THREE.InstancedMesh(leaf, this.mat.leafRed, n);
    let ig = 0, ir = 0;
    const q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    spots.forEach(([x, z]) => {
      const isRed = this.rand() < 0.35;
      for (let k = 0; k < per; k++) {
        e.set(0, (k / per) * Math.PI * 2 + this.rand(), -0.5 - this.rand() * 0.6, 'YXZ');
        q.setFromEuler(e);
        s.setScalar(scale * (0.7 + this.rand() * 0.6));
        pos.set(x + (this.rand() - 0.5) * 0.2, y, z + (this.rand() - 0.5) * 0.2);
        this.m4.compose(pos, q, s);
        if (isRed && k % 2) red.setMatrixAt(ir++, this.m4); else green.setMatrixAt(ig++, this.m4);
      }
    });
    green.count = ig; red.count = ir;
    this.scene.add(green, red);
  }

  floodlights() {
    const coneMat = () => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uOn: { value: 0 } },
      vertexShader: `varying float vY; varying vec3 vN, vV; void main(){ vY = uv.y; vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uOn; varying float vY; varying vec3 vN, vV; void main(){ float e = abs(dot(normalize(vN), vV)); gl_FragColor = vec4(vec3(1., .96, .9) * pow(vY, 2.4) * e * .09 * uOn, 1.); }`,
    });
    const H = 11;
    const xs = [-16, -5.5, 5.5, 16];
    const spots = [...xs.map(x => [x, -15.9]), ...xs.map(x => [x, 15.3])];
    spots.forEach(([x, z], i) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, H, 10).translate(0, H / 2, 0), this.mat.green);
      pole.position.set(x, 0, z);
      pole.castShadow = true;
      this.scene.add(pole);
      const head = new THREE.Group();
      head.position.set(x, H + 0.15, z);
      const aim = new THREE.Vector3(x * 0.6, 0, z * 0.15);
      head.lookAt(aim);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.42, 0.16), this.mat.steel);
      const lampMat = new THREE.MeshBasicMaterial({ color: '#222' });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.34), lampMat);
      face.position.z = 0.085;
      const len = head.position.distanceTo(aim);
      const cm = coneMat();
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 6.5, len, 24, 1, true).rotateX(-Math.PI / 2).translate(0, 0, len / 2), cm);
      cone.position.z = 0.1;
      head.add(box, face, cone);
      this.scene.add(head);
      this.lamps.push({ mat: lampMat, cone: cm, at: 0.15 + (i % 4) * 0.22 + (i >= 4 ? 0.11 : 0), seed: i * 7.1 });
    });
  }

  /* ---------- the pitch ---------- */
  pitch() {
    const map = this.pitchMap = pitchTexture(this.aniso);
    const turf = new THREE.Mesh(new THREE.PlaneGeometry(PITCH.runW, PITCH.runH).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map, roughness: 0.9 }));
    turf.receiveShadow = true;
    turf.position.y = 0.01;
    this.scene.add(turf);
    this.blades = createBlades({ count: this.high ? 340 : 190, size: this.high ? 10 : 7, map, fog: { color: FOG, density: FOG_DENSITY } });
    this.blades.position.y = 0.01;
    this.scene.add(this.blades);

    // team benches with a clear roof
    for (const s of [-1, 1]) {
      const b = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(4, 0.45, 0.5), this.mat.dark);
      seat.position.y = 0.22;
      const back = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 0.06), new THREE.MeshStandardMaterial({ color: '#9fb6c8', roughness: 0.1, transparent: true, opacity: 0.25 }));
      back.position.set(0, 0.8, -0.35);
      const roof = back.clone();
      roof.geometry = new THREE.BoxGeometry(4, 0.06, 1.1);
      roof.position.set(0, 1.6, 0.1);
      b.add(seat, back, roof);
      b.position.set(s * 6, 0, -13.4);
      this.scene.add(b);
    }
  }

  goals() {
    this.nets = [];
    const post = new THREE.CylinderGeometry(0.055, 0.055, GOAL.h, 12);
    const bar = new THREE.CylinderGeometry(0.055, 0.055, GOAL.w + 0.11, 12).rotateX(Math.PI / 2);
    const thin = new THREE.CylinderGeometry(0.025, 0.025, 1, 6);
    for (const s of [-1, 1]) {
      const x = s * PITCH.w / 2;
      const g = new THREE.Group();
      for (const z of [-GOAL.w / 2, GOAL.w / 2]) {
        const p = new THREE.Mesh(post, this.mat.white);
        p.position.set(x, GOAL.h / 2, z);
        p.castShadow = true;
        g.add(p);
        // back stays
        const a = new THREE.Vector3(x, GOAL.h, z), b = new THREE.Vector3(x + s * GOAL.d, 0.02, z);
        const st = new THREE.Mesh(thin, this.mat.metal);
        st.position.copy(a).add(b).multiplyScalar(0.5);
        st.scale.y = a.distanceTo(b);
        st.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        g.add(st);
      }
      const cb = new THREE.Mesh(bar, this.mat.white);
      cb.position.set(x, GOAL.h, 0);
      cb.castShadow = true;
      g.add(cb);
      this.scene.add(g);
      const net = this.makeNet(x, s);
      this.nets.push(net);
      this.scene.add(net);
    }
  }

  // net as a mesh of short line segments, pushed out where the ball hits
  makeNet(x, s) {
    const pos = [], w = [];
    const surface = (o, u, v, nu, nv, sag) => {
      const pt = (i, j) => o.clone().addScaledVector(u, i / nu).addScaledVector(v, j / nv);
      const wt = (i, j) => Math.sin(Math.PI * i / nu) * Math.sin(Math.PI * j / nv) * sag;
      for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
        if (i < nu) { pos.push(...pt(i, j).toArray(), ...pt(i + 1, j).toArray()); w.push(wt(i, j), wt(i + 1, j)); }
        if (j < nv) { pos.push(...pt(i, j).toArray(), ...pt(i, j + 1).toArray()); w.push(wt(i, j), wt(i, j + 1)); }
      }
    };
    const d = s * GOAL.d, hw = GOAL.w / 2, cell = 0.14;
    const nz = Math.round(GOAL.w / cell), ny = Math.round(GOAL.h / cell), nx = Math.round(GOAL.d / cell);
    surface(new THREE.Vector3(x + d, 0, -hw), new THREE.Vector3(0, 0, GOAL.w), new THREE.Vector3(0, GOAL.h, 0), nz, ny, 1);   // back
    surface(new THREE.Vector3(x, GOAL.h, -hw), new THREE.Vector3(d, 0, 0), new THREE.Vector3(0, 0, GOAL.w), nx, nz, 0.6);     // roof
    surface(new THREE.Vector3(x, 0, -hw), new THREE.Vector3(d, 0, 0), new THREE.Vector3(0, GOAL.h, 0), nx, ny, 0.5);          // sides
    surface(new THREE.Vector3(x, 0, hw), new THREE.Vector3(d, 0, 0), new THREE.Vector3(0, GOAL.h, 0), nx, ny, 0.5);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aW', new THREE.Float32BufferAttribute(w, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { ...this.fogU, uHit: { value: new THREE.Vector3(999, 0, 0) }, uPush: { value: 0 }, uDir: { value: s }, uLit: { value: 0.3 } },
      vertexShader: `
        attribute float aW; uniform vec3 uHit; uniform float uPush, uDir; varying float vD;
        void main(){
          vec3 p = position;
          float g = exp(-dot(p - uHit, p - uHit) / .45);
          p.x += uDir * aW * g * uPush;
          p.y -= aW * (.06 + g * abs(uPush) * .25);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          vD = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `${fogGLSL} uniform float uLit; varying float vD; void main(){ gl_FragColor = vec4(fogMix(vec3(.9, .9, .86) * uLit, vD), .75); }`,
    });
    const net = new THREE.LineSegments(geo, mat);
    net.frustumCulled = false;
    return net;
  }

  // k: seconds since the switch was thrown (Infinity = all on)
  setLights(k) {
    let sum = 0;
    for (const l of this.lamps) {
      const s = k - l.at;
      let on = s < 0 ? 0 : 1;
      if (s >= 0 && s < 0.35) on = Math.sin(s * 90 + l.seed) > -0.2 ? 1 : 0.15; // ballast flicker
      l.mat.color.setRGB(7, 6.4, 5.4).multiplyScalar(Math.max(on, 0.03));
      l.cone.uniforms.uOn.value = on;
      sum += on;
    }
    const f = sum / this.lamps.length;
    this.key.intensity = 2.6 * f;
    this.blades.material.uniforms.uLit.value = 0.25 + 0.95 * f;
    this.nets.forEach(n => { n.material.uniforms.uLit.value = 0.25 + 0.75 * f; });
    return f;
  }

  /* ---------- the bar: restaurant below, deck with a pergola above ---------- */
  building() {
    const g = new THREE.Group();
    g.position.set(BUILDING.x, 0, BUILDING.z);
    this.scene.add(g);
    const W = 26, D = 8, F1 = 3.3, ROOF = 6.6;
    const box = (w, h, d, x, y, z, mat, shadow = true) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = shadow; m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const wallMat = this.mat.concrete;
    box(W, 0.15, D, 0, 0.075, 0, this.mat.tile, false);                       // floor
    // pitch side: wall with windows glowing from inside
    box(W, 1.0, 0.3, 0, 0.5, -D / 2, wallMat);
    box(W, 0.8, 0.3, 0, F1 - 0.4, -D / 2, wallMat);
    for (let x = -W / 2; x <= W / 2 + 0.01; x += W / 6) box(0.6, F1, 0.3, x, F1 / 2, -D / 2, wallMat);
    const winMat = new THREE.MeshBasicMaterial({ color: hdr('#ffc285', 0.55) });
    for (let i = 0; i < 6; i++) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(W / 6 - 0.6, 1.5), winMat);
      w.position.set(-W / 2 + W / 12 + i * W / 6, 1.75, -D / 2 - 0.16);
      w.rotation.y = Math.PI;
      g.add(w);
    }
    // ends and the pool-side facade: two wide openings around a central pier
    box(0.4, F1, D, -W / 2, F1 / 2, 0, wallMat);
    box(0.4, F1, D, W / 2, F1 / 2, 0, wallMat);
    box(3, F1, 0.4, 0, F1 / 2, D / 2, wallMat);
    box(W, 0.45, 0.4, 0, F1 - 0.22, D / 2, wallMat);
    box(1.2, F1, 0.4, -W / 2 + 0.6, F1 / 2, D / 2, wallMat);
    box(1.2, F1, 0.4, W / 2 - 0.6, F1 / 2, D / 2, wallMat);
    box(W, 0.05, D, 0, F1 - 0.03, 0, this.mat.wood, false);                   // wood ceiling

    // restaurant side (x < 0): tables, a TV with the game on, pendant lamps
    const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.95), new THREE.MeshBasicMaterial({ map: this.tvTexture(), color: hdr('#ffffff', 1.4) }));
    tv.position.set(-6, 2, -D / 2 + 0.17);
    g.add(tv);
    this.tables(g, [[-10, -1.5], [-7, -1.5], [-4, -1.5], [-10, 1.6], [-7, 1.6], [-4, 1.6]], 0.15);
    // bar side (x > 0): counter in the opening, stools outside, shelves and fridges behind
    box(9, 1.05, 0.7, 6.5, 0.67, D / 2 - 0.65, new THREE.MeshStandardMaterial({ color: '#6d5a48', roughness: 0.9 }));
    box(9.3, 0.07, 0.95, 6.5, 1.22, D / 2 - 0.6, this.mat.wood);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: hdr(WARM, 6) }));
    strip.position.set(6.5, 1.15, D / 2 - 0.27);
    g.add(strip);
    const wash = glowCards(1, '#ffb46b', 1.4);
    wash.setMatrixAt(0, this.m4.compose(new THREE.Vector3(6.5, 0.1, D / 2 - 0.29), new THREE.Quaternion(), new THREE.Vector3(9, 1.05, 1)));
    g.add(wash);
    for (let i = 0; i < 6; i++) {
      const x = 3 + i * 1.35;
      box(0.38, 0.05, 0.38, x, 0.78, D / 2 + 0.45, this.mat.steel, false);
      box(0.04, 0.78, 0.04, x, 0.39, D / 2 + 0.45, this.mat.steel, false);
      box(0.38, 0.4, 0.04, x, 1.0, D / 2 + 0.64, this.mat.steel, false);
    }
    box(9, 2.2, 0.3, 6.5, 1.25, -D / 2 + 0.6, new THREE.MeshStandardMaterial({ color: '#3b2c21', roughness: 0.8 }));
    const bottles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.045, 0.28, 8).translate(0, 0.14, 0), new THREE.MeshStandardMaterial({ roughness: 0.15, emissive: '#3a1e08', emissiveIntensity: 1 }), 60);
    const col = new THREE.Color(), palette = ['#2e6b34', '#7a4a12', '#c9d8d0', '#a3361f', '#d9a441'];
    for (let i = 0; i < 60; i++) {
      bottles.setMatrixAt(i, this.m4.makeTranslation(3.2 + (i % 20) * 0.32, 1.3 + Math.floor(i / 20) * 0.55, -D / 2 + 0.85));
      bottles.setColorAt(i, col.set(palette[(this.rand() * palette.length) | 0]));
    }
    g.add(bottles);
    for (const x of [10.6, 11.6]) {
      box(0.85, 1.9, 0.7, x, 0.95, -D / 2 + 0.85, this.mat.dark);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.55), new THREE.MeshBasicMaterial({ color: hdr('#cfe6ff', 1.3) }));
      glass.position.set(x, 0.9, -D / 2 + 1.21);
      g.add(glass);
    }
    // pendant lamps over both rooms
    const shade = new THREE.ConeGeometry(0.22, 0.2, 16, 1, true).translate(0, -0.1, 0);
    const pend = [];
    for (let x = -11; x <= 11; x += 2.2) pend.push([x, 0.2]);
    const shades = new THREE.InstancedMesh(shade, new THREE.MeshStandardMaterial({ color: '#111', side: THREE.DoubleSide, roughness: 0.5 }), pend.length);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), this.mat.bulb, pend.length);
    pend.forEach(([x, z], i) => {
      shades.setMatrixAt(i, this.m4.makeTranslation(x, 2.7, z));
      bulbs.setMatrixAt(i, this.m4.makeTranslation(x, 2.55, z));
    });
    g.add(shades, bulbs);
    // downlights along the facade header, pooling on the wall below
    const dl = [];
    for (let x = -12; x <= 12; x += 2) dl.push(x);
    const dlGlow = glowCards(dl.length, '#ffb46b', 0.8);
    dl.forEach((x, i) => dlGlow.setMatrixAt(i, this.m4.compose(new THREE.Vector3(x, F1 - 0.45, D / 2 + 0.21), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI), new THREE.Vector3(1.2, 1.6, 1))));
    g.add(dlGlow);
    for (const x of [-6, 6]) {
      const l = new THREE.PointLight('#ffb46b', 22, 13, 2);
      l.position.set(x, 2.6, 0.5);
      g.add(l);
    }
    const front = new THREE.PointLight('#ffb46b', 26, 16, 2);
    front.position.set(4, 2.6, D / 2 + 2);
    g.add(front);

    // the logo on the pitch-side wall, facing the game
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({ map: this.logo, color: hdr('#ffffff', 1.25) }));
    logo.position.set(-9.5, 1.75, -D / 2 - 0.17);
    logo.rotation.y = Math.PI;
    g.add(logo);

    // upper floor: slab band, wooden deck, glass rail, black steel frame, slatted pergola
    box(W + 0.6, 0.35, D + 0.6, 0, F1 + 0.17, 0, this.mat.slab);
    box(W, 0.05, D, 0, F1 + 0.37, 0, this.mat.wood, false);
    const glass = new THREE.MeshStandardMaterial({ color: '#9fb8c4', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.18, depthWrite: false });
    for (const [w, x, z, ry] of [[W, 0, D / 2, 0], [W, 0, -D / 2, 0], [D, -W / 2, 0, Math.PI / 2], [D, W / 2, 0, Math.PI / 2]]) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, 1), glass);
      pane.position.set(x, F1 + 0.9, z);
      pane.rotation.y = ry;
      g.add(pane);
      box(ry ? 0.06 : w, 0.06, ry ? w : 0.06, x, F1 + 1.42, z, this.mat.steel, false);
    }
    const postsX = [-13, -8.7, -4.3, 0, 4.3, 8.7, 13];
    for (const x of postsX) for (const z of [-D / 2, D / 2]) box(0.14, ROOF - F1, 0.14, x, (F1 + ROOF) / 2, z, this.mat.steel);
    for (const z of [-D / 2, D / 2]) box(W, 0.18, 0.14, 0, ROOF, z, this.mat.steel);
    const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(W, 0.06, 0.12), this.mat.wood, 26);
    for (let i = 0; i < 26; i++) slats.setMatrixAt(i, this.m4.makeTranslation(0, ROOF + 0.12, -D / 2 + 0.15 + i * (D - 0.3) / 25));
    slats.castShadow = true;
    g.add(slats);
    // steel ladder frames at the front corners
    for (const x of [-W / 2 - 0.5, W / 2 + 0.5]) {
      for (const dz of [-0.2, 0.2]) box(0.07, ROOF, 0.07, x, ROOF / 2, D / 2 + 0.3 + dz, this.mat.steel);
      const rungs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), this.mat.steel, 14);
      for (let i = 0; i < 14; i++) rungs.setMatrixAt(i, this.m4.makeTranslation(x, 0.4 + i * 0.45, D / 2 + 0.3));
      g.add(rungs);
    }
    // string bulbs under the pergola
    const bulbPos = [];
    for (const z of [-2.6, 0, 2.6]) {
      for (let i = 0; i < postsX.length - 1; i++) {
        const a = postsX[i], b = postsX[i + 1];
        for (let k = 1; k < 6; k++) {
          const u = k / 6;
          bulbPos.push([a + (b - a) * u, ROOF - 0.35 - Math.sin(Math.PI * u) * 0.35, z]);
        }
      }
    }
    const sb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 10, 8), this.mat.bulb, bulbPos.length);
    bulbPos.forEach(([x, y, z], i) => sb.setMatrixAt(i, this.m4.makeTranslation(x, y, z)));
    g.add(sb);
    this.tables(g, [[-10, -1.5], [-6, -1.5], [-2, -1.5], [2, -1.5], [6, -1.5], [10, -1.5], [-8, 1.8], [-3, 1.8], [3, 1.8], [8, 1.8]], F1 + 0.4);
    this.planters([[-12.3, -3.3], [12.3, -3.3], [-12.3, 3.3], [12.3, 3.3], [0, 3.4]].map(([x, z]) => [x + BUILDING.x, z + BUILDING.z]), 0.8, F1 + 0.42);
    const deckLight = new THREE.PointLight('#ffb46b', 30, 18, 2);
    deckLight.position.set(0, ROOF - 0.8, 0);
    g.add(deckLight);
    // planters with red leaves along the facade, lit from below
    this.planters([[-9, 4.9], [-4, 4.9], [1.9, 4.9], [-11.8, 4.9]].map(([x, z]) => [x + BUILDING.x, z + BUILDING.z]), 0.9);
  }

  tvTexture() {
    return canvasTex(256, 144, (g, w, h) => {
      g.fillStyle = '#1d6b2c'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) { g.fillStyle = x % 64 ? '#22772f' : '#1d6b2c'; g.fillRect(x, 0, 32, h); }
      g.strokeStyle = '#e8f2e8'; g.lineWidth = 2;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.beginPath(); g.moveTo(w / 2, 8); g.lineTo(w / 2, h - 8); g.stroke();
      g.beginPath(); g.arc(w / 2, h / 2, 18, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#0d1a3a'; g.fillRect(10, 10, 70, 14);
      g.fillStyle = '#fff'; g.font = '700 10px sans-serif'; g.fillText('VRA 1 x 0 JGA', 14, 21);
      for (let i = 0; i < 10; i++) { g.fillStyle = i < 5 ? '#f2f2f2' : '#1b2b6b'; g.beginPath(); g.arc(30 + this.rand() * (w - 60), 30 + this.rand() * (h - 50), 3, 0, Math.PI * 2); g.fill(); }
    });
  }

  // square black tables with four chairs each, at height y
  tables(parent, spots, y) {
    const n = spots.length;
    const top = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.05, 0.8), this.mat.dark, n);
    const leg = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.06, 0.72, 6), this.mat.steel, n);
    const seat = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), this.mat.steel, n * 4);
    const back = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.42, 0.04), this.mat.steel, n * 4);
    const q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    spots.forEach(([x, z], i) => {
      top.setMatrixAt(i, this.m4.makeTranslation(x, y + 0.75, z));
      leg.setMatrixAt(i, this.m4.makeTranslation(x, y + 0.37, z));
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        q.setFromAxisAngle(up, -a);
        p.set(x + Math.cos(a) * 0.62, y + 0.46, z + Math.sin(a) * 0.62);
        seat.setMatrixAt(i * 4 + k, this.m4.compose(p, q, one));
        p.set(x + Math.cos(a) * 0.82, y + 0.7, z + Math.sin(a) * 0.82);
        q.setFromAxisAngle(up, -a + Math.PI / 2);
        back.setMatrixAt(i * 4 + k, this.m4.compose(p, q, one));
      }
    });
    for (const m of [top, leg, seat, back]) { m.castShadow = true; parent.add(m); }
  }

  /* ---------- pool ---------- */
  pool() {
    const { w, h } = POOL;
    const g = new THREE.Group();
    g.position.set(POOL.x, 0, POOL.z);
    this.scene.add(g);
    // coping
    for (const [sx, sz, x, z] of [[w + 0.8, 0.4, 0, -h / 2 - 0.2], [w + 0.8, 0.4, 0, h / 2 + 0.2], [0.4, h, -w / 2 - 0.2, 0], [0.4, h, w / 2 + 0.2, 0]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.12, sz), this.mat.stone);
      m.position.set(x, 0.1, z);
      m.receiveShadow = true;
      g.add(m);
    }
    // dark green water mirroring the bar's lights: each light leaves a wobbling streak
    const lights = [];
    for (let x = -12; x <= 12; x += 2) lights.push(new THREE.Vector3(BUILDING.x + x, 2.85, BUILDING.z + 4.3));
    for (let x = -12; x <= 12; x += 3) lights.push(new THREE.Vector3(BUILDING.x + x, 6.1, BUILDING.z));
    this.water = new THREE.ShaderMaterial({
      uniforms: { ...this.fogU, uTime: this.timeU, uLights: { value: Array.from({ length: 24 }, (_, i) => lights[i % lights.length]) }, uMoon: { value: MOON } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        ${fogGLSL}
        uniform float uTime; uniform vec3 uLights[24]; uniform vec3 uMoon; varying vec3 vW;
        void main(){
          vec2 p = vW.xz; float t = uTime;
          vec2 g = vec2(sin(p.x * 3.1 + t * 1.3) + sin(p.x * 7.3 - p.y * 2. + t * 2.1) * .5, sin(p.y * 4.7 - t * 1.1) + sin(p.y * 9.1 + p.x * 1.7 + t * 2.7) * .4) * .018;
          vec3 N = normalize(vec3(g.x, 1., g.y));
          vec3 V = normalize(vW - cameraPosition);
          vec3 R = reflect(V, N);
          float fres = pow(1. - max(dot(-V, N), 0.), 4.);
          vec3 c = vec3(.012, .07, .06) + vec3(.02, .05, .08) * fres;
          for (int i = 0; i < 24; i++) {
            vec3 L = normalize(uLights[i] - vW);
            c += vec3(1., .72, .4) * pow(max(dot(R, L), 0.), 3000.) * 1.6;
          }
          c += vec3(.7, .75, .9) * pow(max(dot(R, uMoon), 0.), 6000.) * .5;
          gl_FragColor = vec4(fogMix(c, length(vW - cameraPosition)), 1.);
        }`,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), this.water);
    water.position.y = 0.075;
    g.add(water);
    // umbrellas with a lamp underneath, and tables beside the pool
    const shade = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.9, side: THREE.DoubleSide, emissive: '#ffb46b', emissiveIntensity: 0.08 });
    const spots = [[-12.5, -2], [-12.5, 2.5], [12.5, -2], [12.5, 2.5]];
    for (const [x, z] of spots) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.5, 6).translate(0, 1.25, 0), this.mat.wood);
      const top = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.45, 8, 1, true).translate(0, 2.45, 0), shade);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8).translate(0, 2.1, 0), this.mat.bulb);
      for (const m of [pole, top, lamp]) { m.position.set(x, 0, z); g.add(m); }
      top.castShadow = true;
    }
    this.tables(g, spots, 0.04);
  }

  /* ---------- cabanas by the pool ---------- */
  cabanas() {
    const curtain = new THREE.MeshStandardMaterial({ color: '#f4efe4', roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.85, emissive: '#ffb46b', emissiveIntensity: 0.12 });
    const cushion = new THREE.MeshStandardMaterial({ color: '#e9e1cf', roughness: 1 });
    const olive = new THREE.MeshStandardMaterial({ color: '#56632f', roughness: 1 });
    for (const x of [-12.5, 12.5]) {
      const g = new THREE.Group();
      g.position.set(x, 0, POOL.z + 6.2);
      g.rotation.y = Math.PI;
      this.scene.add(g);
      const S = 2.6, H = 2.7;
      const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m; };
      add(new THREE.BoxGeometry(S + 0.3, 0.15, S + 0.3), this.mat.wood, 0, 0.08, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.12, H, 0.12), this.mat.wood, sx * S / 2, H / 2, sz * S / 2);
      for (const sz of [-1, 1]) add(new THREE.BoxGeometry(S + 0.2, 0.12, 0.12), this.mat.wood, 0, H, sz * S / 2);
      for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.12, 0.12, S + 0.2), this.mat.wood, sx * S / 2, H, 0);
      add(new THREE.BoxGeometry(S, 0.04, S), curtain, 0, H + 0.08, 0);
      // curtains: back wall drawn, the front ones tied to the posts
      const back = add(new THREE.PlaneGeometry(S, H - 0.2, 12, 1), curtain, 0, H / 2, -S / 2 + 0.05);
      const pos = back.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 9) * 0.05);
      for (const sx of [-1, 1]) {
        const tied = add(new THREE.CylinderGeometry(0.06, 0.22, H - 0.3, 10, 1, true), curtain, sx * (S / 2 - 0.15), H / 2, S / 2 - 0.15);
        tied.scale.set(1, 1, 0.6);
      }
      add(new THREE.BoxGeometry(2.1, 0.4, 0.9), cushion, 0, 0.36, -0.7);
      add(new THREE.BoxGeometry(2.1, 0.5, 0.2), cushion, 0, 0.7, -1.1);
      for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.4, 0.36, 0.12), i % 2 ? olive : cushion, -0.75 + i * 0.5, 0.75, -0.95);
      add(new THREE.CylinderGeometry(0.28, 0.3, 0.32, 16), new THREE.MeshStandardMaterial({ color: '#b08a55', roughness: 1 }), 0, 0.32, 0.35);
      const l = new THREE.PointLight('#ffb46b', 6, 5, 2);
      l.position.set(0, 2.2, 0);
      g.add(l);
      for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), this.mat.bulb, sx * 1.6, 0.3, 1.6);
    }
  }

  /* ---------- party pergola: rope-wrapped posts, rattan pendants, the glowing logo ---------- */
  party() {
    const g = new THREE.Group();
    g.position.set(PARTY.x, 0, PARTY.z);
    g.rotation.y = Math.PI / 2; // local +z faces the pool
    this.scene.add(g);
    const W = 14, D = 8, H = 3.2;
    const add = (geo, mat, px, py, pz, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m; };
    add(new THREE.BoxGeometry(W, 0.15, D), this.mat.cream, 0, 0.075, 0, false);
    add(new THREE.BoxGeometry(W, 3, 0.3), this.mat.cream, 0, 1.5, -D / 2 - 0.2);
    const rope = new THREE.MeshStandardMaterial({ color: '#bfa27a', roughness: 1 });
    for (const x of [-W / 2, -W / 6, W / 6, W / 2]) {
      add(new THREE.BoxGeometry(0.22, H, 0.22), this.mat.wood, x, H / 2, D / 2 - 0.2);
      add(new THREE.CylinderGeometry(0.2, 0.2, 1.1, 14), rope, x, 0.6, D / 2 - 0.2);
    }
    add(new THREE.BoxGeometry(W + 0.4, 0.22, 0.22), this.mat.wood, 0, H, D / 2 - 0.2);
    const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.08, D + 0.6), this.mat.wood, 30);
    for (let i = 0; i < 30; i++) slats.setMatrixAt(i, this.m4.makeTranslation(-W / 2 + i * W / 29, H + 0.15, 0));
    g.add(slats);
    // rattan pendants: warm spheres with a woven shell
    const woven = new THREE.MeshStandardMaterial({ color: '#c99a5b', roughness: 1, wireframe: true });
    for (const x of [-4.5, -1.5, 1.5, 4.5]) {
      add(new THREE.SphereGeometry(0.32, 10, 8), woven, x, H - 0.6, 0.6, false);
      add(new THREE.SphereGeometry(0.16, 12, 10), this.mat.bulb, x, H - 0.62, 0.6, false);
    }
    // the logo glowing on the back wall, a balloon arch round it
    const sign = canvasTex(512, 300, (c, w, h) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = '#ffd9a0'; c.shadowBlur = 18;
      c.font = '700 120px "Instrument Sans", system-ui, sans-serif'; c.fillText('VR', w / 2, h * 0.36);
      c.font = '600 64px "Instrument Sans", system-ui, sans-serif'; c.fillText('ARENA', w / 2, h * 0.68);
      c.font = '500 26px "Instrument Sans", system-ui, sans-serif'; c.fillText('— JANGA —', w / 2, h * 0.86);
    });
    add(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshBasicMaterial({ map: sign, color: hdr('#ffffff', 1.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), -5.9, 1.45, -D / 2 - 0.04, false);
    const balloons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ roughness: 0.4 }), 46);
    const c = new THREE.Color(), cols = ['#6b7a2e', '#efe7d5', '#9aa45a', '#d9a441'];
    for (let i = 0; i < 46; i++) {
      const a = Math.PI * (0.02 + 0.96 * i / 45);
      const r = 1.9 + (this.rand() - 0.5) * 0.3;
      balloons.setMatrixAt(i, this.m4.compose(new THREE.Vector3(-5.9 + Math.cos(a) * r * 0.85 + (this.rand() - 0.5) * 0.25, 0.4 + Math.sin(a) * r, -D / 2 + 0.25 + (this.rand() - 0.5) * 0.3), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(0.8 + this.rand() * 0.6)));
      balloons.setColorAt(i, c.set(cols[i % 4]));
    }
    g.add(balloons);
    // the tent with a sofa
    const curtain = new THREE.MeshStandardMaterial({ color: '#f4efe4', roughness: 1, side: THREE.DoubleSide, emissive: '#ffb46b', emissiveIntensity: 0.15 });
    for (const s of [-1, 1]) {
      const panel = add(new THREE.PlaneGeometry(1.6, 2.9), curtain, 3 + s * 0.6, 1.4, -D / 2 + 0.7, false);
      panel.rotation.y = s * 0.5;
    }
    add(new THREE.BoxGeometry(2.2, 0.45, 0.9), this.mat.white, 3, 0.4, -D / 2 + 0.9);
    this.tables(g, [[-3, 1.2], [0, 1.2], [3, 1.6], [5.5, 0.5], [-5.5, 1.6]], 0.15);
    this.planters([[-6.6, -3.6], [-2, -3.6], [1.2, -3.6], [5, -3.6], [6.6, -3.6]].map(([x, z]) => [PARTY.x + z, PARTY.z - x]), 1.1);
    const l = new THREE.PointLight('#ffb46b', 30, 15, 2);
    l.position.set(0, 2.6, 0);
    g.add(l);
  }

  /* ---------- a big tree wrapped in fairy lights ---------- */
  tree() {
    const x0 = -22, z0 = 36;
    const bark = new THREE.MeshStandardMaterial({ color: '#3b2f25', roughness: 1 });
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x0 + 0.4, 2.5, z0), new THREE.Vector3(x0 + 0.2, 4.5, z0 - 0.3)), 12, 0.38, 8), bark);
    trunk.castShadow = true;
    this.scene.add(trunk);
    const n = 26;
    const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#1e3a1d', roughness: 1, flatShading: true }), n);
    const bulbs = [];
    for (let i = 0; i < n; i++) {
      const a = this.rand() * Math.PI * 2, r = this.rand() * 3.4;
      const p = new THREE.Vector3(x0 + Math.cos(a) * r, 5 + this.rand() * 2.4 - r * 0.25, z0 + Math.sin(a) * r);
      const s = 1.4 + this.rand() * 1.2;
      canopy.setMatrixAt(i, this.m4.compose(p, new THREE.Quaternion(), new THREE.Vector3(s, s * 0.75, s)));
      for (let k = 0; k < 8; k++) bulbs.push(p.clone().add(new THREE.Vector3(this.rand() - 0.5, this.rand() - 0.6, this.rand() - 0.5).normalize().multiplyScalar(s * 1.02)));
    }
    canopy.castShadow = true;
    this.scene.add(canopy);
    const fairy = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), this.mat.bulb, bulbs.length);
    bulbs.forEach((p, i) => fairy.setMatrixAt(i, this.m4.makeTranslation(p.x, p.y, p.z)));
    this.scene.add(fairy);
  }

  /* ---------- palms ---------- */
  palms() {
    const spots = [[-17, 38.5], [17, 38.5], [-27, 18], [26, 19.5], [-28.5, 35], [28, 31], [-45, 31], [-44, 17], [33, 24]];
    // one frond: a strip that tapers and droops
    const frond = new THREE.PlaneGeometry(3, 0.7, 14, 2).translate(1.5, 0, 0).rotateX(-Math.PI / 2);
    const p = frond.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), k = x / 3;
      p.setZ(i, p.getZ(i) * Math.pow(Math.sin(Math.PI * Math.min(k * 1.05 + 0.05, 1)), 0.7));
      p.setY(i, -k * k * 1.6 + Math.abs(p.getZ(i)) * 0.4);
    }
    frond.computeVertexNormals();
    const per = 10;
    this.fronds = new THREE.InstancedMesh(frond, this.mat.leaf, spots.length * per);
    this.fronds.castShadow = true;
    this.frondBase = [];
    const bark = new THREE.MeshStandardMaterial({ color: '#5b4a3b', roughness: 0.95 });
    spots.forEach(([x, z], s) => {
      const hgt = 6.5 + this.rand() * 3;
      const lean = new THREE.Vector3(this.rand() - 0.5, 0, this.rand() - 0.5).multiplyScalar(2.4);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x + lean.x * 0.2, hgt * 0.55, z + lean.z * 0.2),
        new THREE.Vector3(x + lean.x, hgt, z + lean.z),
      );
      const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.17, 7), bark);
      trunk.castShadow = true;
      this.scene.add(trunk);
      const top = curve.getPoint(1);
      for (let k = 0; k < per; k++) {
        this.frondBase.push({ top, yaw: (k / per) * Math.PI * 2 + this.rand() * 0.4, pitch: 0.25 - this.rand() * 0.35, phase: this.rand() * 6.28, i: s * per + k });
      }
    });
    this.placeFronds(0);
    this.scene.add(this.fronds);
  }

  placeFronds(t) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    for (const f of this.frondBase) {
      e.set(0, f.yaw + Math.sin(t * 0.7 + f.phase) * 0.04, f.pitch + Math.sin(t * 1.3 + f.phase) * 0.05, 'YXZ');
      q.setFromEuler(e);
      this.fronds.setMatrixAt(f.i, m.compose(f.top, q, one));
    }
    this.fronds.instanceMatrix.needsUpdate = true;
  }

  /* ---------- the neighbourhood: low blocks with lit windows ---------- */
  city() {
    const tex = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#26262a'; g.fillRect(0, 0, w, h);
      for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 14) {
        const on = this.rand() < 0.35;
        g.fillStyle = on ? (this.rand() < 0.8 ? '#ffcf8a' : '#cfe0ff') : '#141418';
        g.fillRect(x, y, 7, 9);
      }
    });
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.9 });
    const n = 70;
    const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), mat, n);
    let i = 0;
    while (i < n) {
      const x = (this.rand() - 0.5) * 300, z = (this.rand() - 0.5) * 300;
      if (Math.abs(x) < 62 && z > -45 && z < 62) continue; // keep the venue clear
      const w = 8 + this.rand() * 14, d = 8 + this.rand() * 12, h = 4 + this.rand() * (this.rand() < 0.15 ? 20 : 7);
      blocks.setMatrixAt(i++, this.m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.round(this.rand()) * Math.PI / 2), new THREE.Vector3(w, h, d)));
    }
    this.scene.add(blocks);
    // street lamps and far lights
    const m = 500;
    const pos = new Float32Array(m * 3), col = new Float32Array(m * 3), c = new THREE.Color();
    for (let k = 0; k < m; k++) {
      const a = this.rand() * Math.PI * 2, r = 70 + this.rand() * 220;
      pos.set([Math.cos(a) * r, this.rand() < 0.15 ? this.rand() * 18 : 4 + this.rand() * 2, Math.sin(a) * r], k * 3);
      c.set(this.rand() < 0.75 ? '#ffb46b' : '#dfe8ff').multiplyScalar(1.4 + this.rand() * 1.5);
      col.set([c.r, c.g, c.b], k * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, depthWrite: false })));
  }

  update(t, { camera, ball, focus }) {
    this.timeU.value = t;
    this.skyMesh.position.copy(camera.position);
    const u = this.blades.material.uniforms;
    u.uTime.value = t;
    u.uBall.value.copy(ball);
    u.uCenter.value.set(
      THREE.MathUtils.clamp(focus.x, -PITCH.runW / 2, PITCH.runW / 2),
      THREE.MathUtils.clamp(focus.z, -PITCH.runH / 2, PITCH.runH / 2),
    );
    this.placeFronds(t);
  }

  netHit(i, point, push) {
    const n = this.nets[i].material.uniforms;
    n.uHit.value.copy(point);
    n.uPush.value = push;
  }
}
