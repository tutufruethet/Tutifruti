import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* O prédio da Módulo: a torre laranja da logo, feita de 6 módulos sobre um térreo, numa cidade à noite.
   Tudo é dirigido por um número só, S (a história do scroll, calculada em main.js):
   0 abertura · 1 manifesto · 2→8 os andares se montam · 8,25→9 app · 10→11 fim. */

export const FLOORS = 6;
const W = 5, D = 5, LOBBY_H = 1.8, MOD_H = 2.2, GAP = 0.18;
const baseY = i => LOBBY_H + GAP + i * (MOD_H + GAP);
const ACCENT = new THREE.Color('#ff7a1f');

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const range = (x, a, b) => clamp((x - a) / (b - a));
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const expo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const bump = (x, c, w) => Math.pow(Math.max(0, 1 - Math.abs(x - c) / w), 2);

// Interpola valores por chaves de S, com easing em cada trecho (a câmera "assenta" em cada andar).
export function keyed(s, ks, vs) {
  if (s <= ks[0]) return vs[0];
  for (let i = 1; i < ks.length; i++) {
    if (s < ks[i]) {
      let t = (s - ks[i - 1]) / (ks[i] - ks[i - 1]);
      t = t * t * (3 - 2 * t);
      return vs[i - 1] + (vs[i] - vs[i - 1]) * t;
    }
  }
  return vs[vs.length - 1];
}

// Câmera em coordenadas cilíndricas em volta da torre: ângulo, raio, altura, alvo e deslocamento de lente.
const CAM = {
  s:   [0,    1,    2.35, 3.35, 4.35, 5.35, 6.35, 7.35, 8.25, 9,    10,   11],
  ang: [24,   40,   58,   84,   110,  136,  162,  188,  215,  245,  340,  372],
  rad: [31,   33,   14.5, 14.5, 15,   15.5, 16,   16.5, 35,   37,   37,   33],
  h:   [1.3,  10,   3.6,  6,    8.4,  10.8, 13.2, 15.6, 30,   26,   1.4,  2.2],
  ty:  [8.8,  9.5,  3.1,  5.5,  7.9,  10.3, 12.7, 15.1, 7,    7,    9.6,  9.4],
  sx:  [.36,  0,    .36,  .36,  .36,  .36,  .36,  .36,  0,    0,    .44,  .44],
  sy:  [.2,   .05,  .32,  .32,  .32,  .32,  .32,  .32,  .12,  .12,  .22,  .22],
  far: [1.3,  1.35, 1.75, 1.75, 1.75, 1.75, 1.75, 1.75, 1.2,  1.2,  1.35, 1.35], // celular em pé: câmera mais longe
};

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

/* Fachada de um módulo: concreto laranja com janelas escuras (cor) e um mapa de dados (emissivo):
   R = brilho da janela, G = em que ponto do "acender" ela liga, B = tom (quente ou mais branco). */
function facade(seed) {
  const w = 512, h = 226, r = rng(seed);
  const [col, c] = canvas(w, h), [emi, e] = canvas(w, h);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#f07b27'); g.addColorStop(1, '#d6631a');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  e.fillStyle = '#000'; e.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(90,32,0,.28)';
  for (let x = 0; x <= w; x += w / 6) c.fillRect(x - 1, 0, 2, h);
  c.fillRect(0, h / 2 - 1, w, 2);
  c.fillStyle = 'rgba(60,20,0,.35)'; c.fillRect(0, h - 6, w, 6);

  const cols = 6, rows = 2, cw = w / cols, ch = h / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i * cw + cw * .17, y = j * ch + ch * .2, ww = cw * .66, wh = ch * .58;
    c.fillStyle = '#6e2f0c'; c.fillRect(x - 3, y - 3, ww + 6, wh + 6);
    const gg = c.createLinearGradient(x, y, x + ww * .6, y + wh);
    gg.addColorStop(0, '#22324f'); gg.addColorStop(1, '#070b16');
    c.fillStyle = gg; c.fillRect(x, y, ww, wh);
    c.fillStyle = 'rgba(170,200,255,.07)'; c.fillRect(x, y, ww, wh * .3);

    const lit = .5 + .5 * r(), when = r(), tone = r();
    const G = when * 255 | 0, B = tone * 255 | 0;
    const lg = e.createLinearGradient(0, y, 0, y + wh);
    lg.addColorStop(0, `rgb(${lit * 150 | 0},${G},${B})`);
    lg.addColorStop(1, `rgb(${lit * 255 | 0},${G},${B})`);
    e.fillStyle = lg; e.fillRect(x, y, ww, wh);

    c.fillStyle = '#6e2f0c'; c.fillRect(x + ww / 2 - 2, y, 4, wh);
    e.fillStyle = '#000'; e.fillRect(x + ww / 2 - 2, y, 4, wh);
  }
  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const emissiveMap = new THREE.CanvasTexture(emi);
  emissiveMap.colorSpace = THREE.NoColorSpace;
  return { map, emissiveMap };
}

function facadeMaterial(tex, glow) {
  const u = { uOn: { value: 0 }, uGlow: { value: glow } };
  const m = new THREE.MeshStandardMaterial({ ...tex, emissive: 0xffffff, roughness: .82, metalness: 0, transparent: true });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uOn, uGlow;')
      .replace('#include <emissivemap_fragment>', `
        vec4 em = texture2D( emissiveMap, vEmissiveMapUv );
        float on = 1. - smoothstep( uOn * .9 - .03, uOn * .9, em.g );
        vec3 warm = mix( vec3( 1., .52, .2 ), vec3( 1., .8, .55 ), em.b );
        totalEmissiveRadiance = warm * em.r * on * uGlow + diffuseColor.rgb * .05;`);
  };
  m.userData.u = u;
  return m;
}

// Planta do andar: as arestas e as colunas de janelas, em linhas laranja (o "projeto" antes da obra).
function blueprintGeometry() {
  const v = [], x = W / 2 + .03, z = D / 2 + .03, y0 = -MOD_H / 2, y1 = MOD_H / 2;
  const seg = (a, b) => v.push(...a, ...b);
  for (const y of [y0, 0, y1]) {
    seg([-x, y, -z], [x, y, -z]); seg([x, y, -z], [x, y, z]);
    seg([x, y, z], [-x, y, z]); seg([-x, y, z], [-x, y, -z]);
  }
  for (let k = 0; k <= 6; k++) {
    const t = -x + 2 * x * k / 6;
    seg([t, y0, z], [t, y1, z]); seg([t, y0, -z], [t, y1, -z]);
    seg([x, y0, t], [x, y1, t]); seg([-x, y0, t], [-x, y1, t]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
}

function ring(size) {
  const s = size / 2, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-s, 0, -s, s, 0, -s, s, 0, s, -s, 0, s], 3));
  return g;
}

const FOG_SHADER = {
  vertex: '\n#include <fog_pars_vertex>\n',
  fragment: '\n#include <fog_pars_fragment>\n',
};

export class Predio {
  constructor(canvas, { high = true, reduce = false } = {}) {
    this.high = high;
    this.reduce = reduce;
    this.time = 0;
    this.tall = false;
    this.px = 0; this.py = 0;

    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: high, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, high ? 1.5 : 1.25));
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, .1, 1400);
    this.uTime = { value: 0 };

    this.#sky();
    this.#ground();
    this.#city();
    this.#street();
    this.#tower();

    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (high) this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), .55, .5, 1));
    this.composer.addPass(new OutputPass());
  }

  #sky() {
    const horizon = new THREE.Color('#1b3563');
    this.moonDir = new THREE.Vector3(-.55, .4, -.73).normalize();
    this.scene.fog = new THREE.Fog(horizon.clone().multiplyScalar(.82), 50, 240);

    const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uHorizon: { value: horizon }, uMid: { value: new THREE.Color('#0b1630') },
        uZenith: { value: new THREE.Color('#03060d') }, uMoon: { value: this.moonDir },
      },
      vertexShader: `varying vec3 vDir;
        void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform vec3 uHorizon, uMid, uZenith, uMoon; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir); float h = d.y;
          vec3 c = mix(uHorizon, uMid, smoothstep(-.02, .22, h));
          c = mix(c, uZenith, smoothstep(.22, .85, h));
          float m = max(dot(d, uMoon), 0.);
          c += vec3(.3, .42, .7) * (pow(m, 8.) * .14 + pow(m, 120.) * .4);
          c = mix(c, uHorizon * .55, smoothstep(0., -.2, h));
          gl_FragColor = vec4(c, 1.);
        }`,
    }));
    sky.renderOrder = -2;
    this.scene.add(sky);

    const n = this.high ? 900 : 450, rnd = rng(3), pos = [], seed = [];
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, y = .06 + rnd() * .94, k = Math.sqrt(1 - y * y);
      pos.push(Math.cos(a) * k * 600, y * 600, Math.sin(a) * k * 600);
      seed.push(rnd());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    const stars = new THREE.Points(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: this.uTime, uPx: { value: this.renderer.getPixelRatio() } },
      vertexShader: `attribute float aSeed; uniform float uTime, uPx; varying float vA;
        void main(){
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
          float tw = .6 + .4 * sin(uTime * (.6 + aSeed * 1.8) + aSeed * 40.);
          vA = tw * (.25 + .75 * aSeed * aSeed) * smoothstep(.04, .3, normalize(position).y);
          gl_PointSize = (1. + aSeed * 1.8) * uPx;
        }`,
      fragmentShader: `varying float vA;
        void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(.82, .88, 1.) * vA * smoothstep(.5, 0., d), 1.); }`,
    }));
    stars.renderOrder = -1;
    this.scene.add(stars);

    const [mc, m] = canvas(128, 128);
    const rg = m.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, '#fff'); rg.addColorStop(.16, '#f4f7ff'); rg.addColorStop(.2, 'rgba(200,215,255,.35)'); rg.addColorStop(1, 'rgba(120,150,255,0)');
    m.fillStyle = rg; m.fillRect(0, 0, 128, 128);
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(mc), color: new THREE.Color(1.6, 1.65, 1.8),
      fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
    }));
    moon.position.copy(this.moonDir).multiplyScalar(620);
    moon.scale.setScalar(70);
    this.scene.add(moon);
  }

  #ground() {
    this.uLobby = { value: 0 };
    const mat = new THREE.ShaderMaterial({
      fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uGround: { value: new THREE.Color('#0d1527') }, uLine: { value: new THREE.Color('#6d84b8') },
        uWarm: { value: new THREE.Color('#ff9d52') },
      }]),
      vertexShader: `varying vec3 vW; ${FOG_SHADER.vertex}
        void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz;
          vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform vec3 uGround, uLine, uWarm; uniform float uLobby; varying vec3 vW; ${FOG_SHADER.fragment}
        float line(float x, float s, float w){ float d = abs(fract(x / s + .5) - .5) * s; return 1. - smoothstep(w, w + fwidth(x) * 1.5, d); }
        void main(){
          vec2 p = vW.xz; vec3 col = uGround;
          float av = 1. - smoothstep(2.9, 3., abs(p.y - 9.));
          float rua = 1. - smoothstep(2.4, 2.5, abs(p.x + 11.));
          float road = max(av, rua);
          col = mix(col, uGround * .5, road);
          float dash = av * (1. - smoothstep(.05, .1, abs(p.y - 9.))) * step(.5, fract(p.x / 3.));
          dash += rua * (1. - av) * (1. - smoothstep(.05, .1, abs(p.x + 11.))) * step(.5, fract(p.y / 3.));
          col += uLine * .35 * dash;
          float curb = (1. - smoothstep(.0, .06, abs(abs(p.y - 9.) - 3.))) + (1. - av) * (1. - smoothstep(.0, .06, abs(abs(p.x + 11.) - 2.5)));
          col += uLine * .12 * curb;
          col += uLine * .025 * max(line(p.x, 3., .015), line(p.y, 3., .015)) * (1. - road);
          float lot = max(abs(p.x), abs(p.y));
          col *= mix(.4, 1., smoothstep(2.6, 4.6, lot));
          float d = length(p - vec2(0., 3.6));
          col += uWarm * .5 * exp(-d * d * .14) * uLobby;
          float lx = mod(p.x, 8.) - 4.;
          float lamps = (exp(-(lx * lx + (p.y - 5.6) * (p.y - 5.6)) * .4) + exp(-(lx * lx + (p.y - 12.4) * (p.y - 12.4)) * .4)) * step(14., abs(p.x - lx));
          col += uWarm * .22 * lamps * step(abs(p.x), 64.);
          gl_FragColor = vec4(col, 1.);
          #include <fog_fragment>
        }`,
    });
    mat.uniforms.uLobby = this.uLobby;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
  }

  #city() {
    const rnd = rng(11), cells = [], step = 9.5;
    for (let gx = -19; gx <= 19; gx++) for (let gz = -19; gz <= 19; gz++) {
      const x = gx * step + (rnd() - .5) * 3, z = gz * step + (rnd() - .5) * 3, d = Math.hypot(x, z);
      if (d < 19 || d > 185) continue;
      if (Math.abs(z - 9) < 5.2 || Math.abs(x + 11) < 4.8) continue;
      if (d < 34 && z > 2 && Math.abs(x) < 16) continue;
      cells.push([x, z, d, rnd()]);
    }
    cells.sort((a, b) => a[3] - b[3]);
    const n = Math.min(cells.length, this.high ? 420 : 220);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, .5, 0);
    const mat = new THREE.ShaderMaterial({
      fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uBase: { value: new THREE.Color('#14203b') }, uMoon: { value: this.moonDir },
        uWarm: { value: new THREE.Color('#ffae63') }, uCool: { value: new THREE.Color('#cddcff') },
      }]),
      vertexShader: `varying vec3 vW; varying vec3 vN; varying float vSeed; ${FOG_SHADER.vertex}
        void main(){
          mat4 im = modelMatrix * instanceMatrix;
          vec4 w = im * vec4(position, 1.); vW = w.xyz;
          vN = normalize(mat3(im) * normal); vSeed = float(gl_InstanceID);
          vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform vec3 uBase, uMoon, uWarm, uCool; uniform float uTime;
        varying vec3 vW; varying vec3 vN; varying float vSeed; ${FOG_SHADER.fragment}
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          vec3 n = normalize(vN);
          vec3 col = uBase * (.45 + .55 * max(dot(n, uMoon), 0.) + .3 * max(n.y, 0.));
          col *= .6 + .4 * smoothstep(0., 20., vW.y);
          if (abs(n.y) < .5) {
            float u = abs(n.x) > .5 ? vW.z : vW.x;
            vec2 g = vec2(u / .83, vW.y / 1.1), cell = floor(g), f = fract(g);
            vec2 fw = fwidth(g), aa = fw * 1.2;
            float near = 1. - smoothstep(.1, .3, max(fw.x, fw.y));
            float win = smoothstep(.2 - aa.x, .2 + aa.x, f.x) * (1. - smoothstep(.8 - aa.x, .8 + aa.x, f.x))
                      * smoothstep(.26 - aa.y, .26 + aa.y, f.y) * (1. - smoothstep(.78 - aa.y, .78 + aa.y, f.y));
            float h = hash(cell + vSeed * 7.13 + sign(n.x + n.z) * 3.1);
            float flick = floor(uTime * .05 + h * 9.);
            float lit = step(.86, fract(h * 13.7 + flick * .17)) * step(1.1, vW.y);
            vec3 wc = mix(uWarm, uCool, step(.85, fract(h * 51.3))) * (.4 + .55 * fract(h * 31.7));
            vec3 cellCol = (uBase * .22 + wc * lit) * win;
            vec3 avgCol = (uBase * .22 + uWarm * .14 * .65) * .32 * step(1.1, vW.y);
            col += mix(avgCol, cellCol, near);
          }
          gl_FragColor = vec4(col, 1.);
          #include <fog_fragment>
        }`,
    });
    mat.uniforms.uTime = this.uTime;
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < n; k++) {
      const [x, z, d] = cells[k];
      const near = d < 34;
      const far = range(d, 34, 170);
      let h = near ? 1.4 + rnd() * 3.2 : 3 + rnd() * rnd() * 13 + far * rnd() * 14;
      if (!near && rnd() < .07) h += 10;
      p.set(x, 0, z);
      sc.set(3.5 + rnd() * 4.5, h, 3.5 + rnd() * 4.5);
      q.setFromAxisAngle(up, rnd() < .85 ? 0 : (rnd() - .5) * .5);
      mesh.setMatrixAt(k, m.compose(p, q, sc));
    }
    this.scene.add(mesh);
  }

  #street() {
    // Postes: haste escura + lâmpada que brilha (o halo no chão está no shader do chão).
    // Nenhum poste perto da frente do prédio: eles cruzariam a fachada nas câmeras da abertura e do fim.
    const xs = [];
    for (let k = -8; k < 8; k++) xs.push(4 + k * 8);
    const n = xs.length * 2;
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.045, .06, 3.2, 6).translate(0, 1.6, 0), new THREE.MeshStandardMaterial({ color: '#1b2233', roughness: .7 }), n);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(.14, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb36b').multiplyScalar(this.high ? 4 : 1.6) }), n);
    const m = new THREE.Matrix4();
    let k = 0;
    for (const x of xs) for (const z of [5.6, 12.4]) {
      if (Math.abs(x) < 14) continue;
      poles.setMatrixAt(k, m.makeTranslation(x, 0, z));
      bulbs.setMatrixAt(k++, m.makeTranslation(x, 3.25, z));
    }
    poles.count = bulbs.count = k;
    this.scene.add(poles, bulbs);

    // Carros: só faróis e lanternas andando pelas ruas, animados na GPU.
    const cars = this.high ? 56 : 28, rnd = rng(5), lane = [], off = [], speed = [];
    for (let i = 0; i < cars; i++) { lane.push(i % 4); off.push(rnd() * 260); speed.push(5 + rnd() * 6); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Array(cars * 3).fill(0), 3));
    g.setAttribute('aLane', new THREE.Float32BufferAttribute(lane, 1));
    g.setAttribute('aOff', new THREE.Float32BufferAttribute(off, 1));
    g.setAttribute('aSpeed', new THREE.Float32BufferAttribute(speed, 1));
    const fog = this.scene.fog;
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: this.uTime, uPx: { value: this.renderer.getPixelRatio() * (this.high ? 1 : .8) },
        uNear: { value: fog.near }, uFar: { value: fog.far },
      },
      vertexShader: `attribute float aLane, aOff, aSpeed; uniform float uTime, uPx, uNear, uFar; varying vec3 vC; varying float vF;
        void main(){
          float a = mod(aOff + uTime * aSpeed, 260.) - 130.;
          vec3 p = aLane < .5 ? vec3(a, .4, 8.1) : aLane < 1.5 ? vec3(-a, .4, 9.9) : aLane < 2.5 ? vec3(-11.9, .4, a) : vec3(-10.1, .4, -a);
          vec4 mv = viewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 260. * uPx / -mv.z;
          vC = mod(aLane, 2.) < .5 ? vec3(1.6, 1.45, 1.2) : vec3(1.6, .45, .12);
          vF = 1. - smoothstep(uNear, uFar, -mv.z);
        }`,
      fragmentShader: `varying vec3 vC; varying float vF;
        void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vC * vF * pow(smoothstep(.5, 0., d), 2.), 1.); }`,
    }));
    pts.frustumCulled = false;
    this.scene.add(pts);
  }

  #tower() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#5a78c4', '#2c2048', 1.25));
    const moon = new THREE.DirectionalLight('#a8c0ff', 1.6);
    moon.position.copy(this.moonDir).multiplyScalar(60);
    const city = new THREE.DirectionalLight('#ff9b55', .6);
    city.position.set(25, 8, 30);
    const up = new THREE.PointLight('#ffae6b', 0, 15, 2);
    up.position.set(0, .4, 4.4);
    this.uplight = up;
    s.add(moon, city, up);

    const tower = new THREE.Group();
    s.add(tower);
    const orange = new THREE.MeshStandardMaterial({ color: '#e0691d', roughness: .8 });
    const core = new THREE.MeshStandardMaterial({ color: '#0b111f', roughness: .6 });
    const box = (w, h, d, mat, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); return o; };

    // Térreo: vidro com luz quente de dentro, pilares laranja e marquise.
    const [lc, l] = canvas(512, 180);
    const lg = l.createLinearGradient(0, 0, 0, 180);
    lg.addColorStop(0, '#ffb066'); lg.addColorStop(1, '#ffd9a3');
    l.fillStyle = lg; l.fillRect(0, 0, 512, 180);
    l.fillStyle = '#2a170b';
    for (let x = 0; x <= 512; x += 64) l.fillRect(x - 3, 0, 6, 180);
    l.fillRect(0, 48, 512, 5); l.fillRect(0, 0, 512, 8);
    l.fillStyle = 'rgba(42,23,11,.55)'; l.fillRect(150, 120, 212, 60);
    const lobbyMat = new THREE.MeshStandardMaterial({ color: '#0a0f1a', emissive: '#ffffff', roughness: .3, emissiveIntensity: 0 });
    lobbyMat.emissiveMap = new THREE.CanvasTexture(lc);
    lobbyMat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
    this.lobbyMat = lobbyMat;
    tower.add(box(W - .8, LOBBY_H, D - .8, lobbyMat, 0, LOBBY_H / 2, 0));
    for (const x of [-1, 1]) for (const z of [-1, 1]) tower.add(box(.42, LOBBY_H, .42, orange, x * (W / 2 - .21), LOBBY_H / 2, z * (D / 2 - .21)));
    tower.add(box(W, .16, D, orange, 0, LOBBY_H - .08, 0));
    tower.add(box(2.8, .12, 1.5, orange, 0, LOBBY_H * .7, D / 2 + .7));

    const lineColor = ACCENT.clone().multiplyScalar(this.high ? 1.9 : 1.25);
    const bp = blueprintGeometry(), rg = ring(W + .7);
    this.mods = [];
    for (let i = 0; i < FLOORS; i++) {
      const fac = facadeMaterial(facade(101 + i * 17), this.high ? 2.6 : 1.7);
      const top = new THREE.MeshStandardMaterial({ color: '#a94f17', roughness: .9, transparent: true });
      const g = new THREE.Group();
      const y = baseY(i) + MOD_H / 2;
      g.position.y = y;
      g.add(new THREE.Mesh(new THREE.BoxGeometry(W, MOD_H, D), [fac, fac, top, top, fac, fac]));
      g.add(box(W - .5, GAP + .02, D - .5, core, 0, -MOD_H / 2 - GAP / 2, 0));
      const lines = new THREE.LineSegments(bp, new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }));
      lines.position.y = y;
      const scan = new THREE.LineLoop(rg, new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      tower.add(g, lines, scan);
      this.mods.push({ g, fac, top, lines, scan, y });
    }

    // Cobertura: platibanda, casa de máquinas, antena com luz piscando e o letreiro da Módulo.
    const roof = this.roof = new THREE.Group();
    roof.position.y = MOD_H / 2;
    roof.add(box(W, .42, .16, orange, 0, .21, D / 2 - .08), box(W, .42, .16, orange, 0, .21, -D / 2 + .08));
    roof.add(box(.16, .42, D, orange, W / 2 - .08, .21, 0), box(.16, .42, D, orange, -W / 2 + .08, .21, 0));
    roof.add(box(1.8, 1.1, 1.5, core, -1, .55, -1));
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, 2.6, 6), new THREE.MeshStandardMaterial({ color: '#6b7489', roughness: .5 }));
    antenna.position.set(-1, 1.1 + 1.3, -1);
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshBasicMaterial({ color: ACCENT.clone() }));
    this.beacon.position.set(-1, 2.45 + 1.1, -1);
    roof.add(antenna, this.beacon);
    for (const x of [-1.6, 1.6]) roof.add(box(.08, .9, .08, core, x, .85, D / 2 - .5));
    const [sc, sctx] = canvas(1024, 200);
    this.signCanvas = [sc, sctx];
    this.signTex = new THREE.CanvasTexture(sc);
    this.signTex.colorSpace = THREE.SRGBColorSpace;
    this.signMat = new THREE.MeshBasicMaterial({ map: this.signTex, transparent: true, opacity: 0, color: new THREE.Color().setScalar(this.high ? 2.2 : 1.3), depthWrite: false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, .82), this.signMat);
    sign.position.set(0, 1.12, D / 2 - .44);
    roof.add(sign);
    this.paintSign();
    this.mods[FLOORS - 1].g.add(roof);
  }

  // Redesenha o letreiro quando as fontes carregam (o canvas usa a mesma Archivo da página).
  paintSign() {
    const [c, x] = this.signCanvas;
    x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = '#fff';
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    if ('fontStretch' in x) x.fontStretch = 'expanded';
    x.font = '800 142px Archivo, "Arial Black", sans-serif';
    x.fillText('MÓDULO', c.width / 2, 178);
    this.signTex.needsUpdate = true;
  }

  resize(w, h) {
    this.tall = h > w * 1.05;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
  }

  // Um quadro: S (história), dt, ponteiro normalizado (-1..1), intro (0..1, a cortina do loader).
  frame(S, dt, px = 0, py = 0, intro = 1) {
    this.time += dt;
    const t = this.time;
    this.uTime.value = this.reduce ? 12 : t;

    const lobby = expo(intro);
    this.lobbyMat.emissiveIntensity = 1.5 * lobby;
    this.uLobby.value = lobby;
    this.uplight.intensity = 38 * lobby;

    for (let i = 0; i < FLOORS; i++) {
      const m = this.mods[i];
      const b = expo(range(S, 2.05 + i, 2.65 + i));
      const on = range(S, 2.3 + i, 3 + i);
      m.g.visible = b > .002;
      m.g.position.y = m.y + (1 - b) * 4.5;
      m.g.rotation.y = (1 - b) * .4;
      m.fac.opacity = m.top.opacity = range(b, 0, .35);
      m.fac.userData.u.uOn.value = on;
      const wave = this.reduce ? 1 : .72 + .28 * Math.sin(t * 1.3 - i * .7);
      const o = (.5 * wave * (1 - b) + .85 * bump(S, 2.62 + i, .24)) * intro;
      m.lines.material.opacity = o;
      m.lines.visible = o > .003;
      m.scan.position.y = baseY(i) + MOD_H * on;
      m.scan.material.opacity = Math.sin(Math.PI * on) * .9;
      m.scan.visible = on > 0 && on < 1;
    }
    this.roof.visible = this.mods[FLOORS - 1].g.position.y - this.mods[FLOORS - 1].y < 1;
    this.signMat.opacity = range(S, 7.5, 8.1);
    const blink = this.reduce ? 1 : Math.pow(Math.max(0, Math.sin(t * 2.4)), 6);
    this.beacon.material.color.copy(ACCENT).multiplyScalar(.4 + blink * (this.high ? 5 : 2));

    this.#aim(S, dt, px, py);
    this.composer.render(dt);
  }

  #aim(S, dt, px, py) {
    const c = this.camera, k = CAM;
    this.px = damp(this.px, px, 2.5, dt);
    this.py = damp(this.py, py, 2.5, dt);
    const drift = this.reduce ? 0 : Math.sin(this.time * .12) * 1.4;
    const a = THREE.MathUtils.degToRad(keyed(S, k.s, k.ang) + drift + this.px * 3.5);
    const rad = keyed(S, k.s, k.rad) * (this.tall ? keyed(S, k.s, k.far) : 1);
    const h = keyed(S, k.s, k.h) - this.py * .6;
    c.position.set(Math.sin(a) * rad, h, Math.cos(a) * rad);
    c.lookAt(0, keyed(S, k.s, k.ty), 0);
    c.fov = this.tall ? 48 : 38;
    c.updateProjectionMatrix();
    const e = c.projectionMatrix.elements;
    e[8] = this.tall ? 0 : -keyed(S, k.s, k.sx);
    e[9] = this.tall ? -keyed(S, k.s, k.sy) : 0;
    c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
  }
}
