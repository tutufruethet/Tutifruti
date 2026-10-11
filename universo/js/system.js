import * as THREE from 'three';
import { NOISE } from './glsl.js';
import { PALETTE, pointsMat, cloud, alloc } from './galaxy.js';
import { makeSky } from './sky.js';

// Um sistema estelar: estrela com granulação e manchas, planetas procedurais com relevo, nuvens,
// atmosfera, luas e anéis. Cada planeta tem a própria paleta (data.js).
const SHADOW = new THREE.Color('#1a1030').multiplyScalar(0.06); // luz ambiente roxa: a noite nunca é preta
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 10007, 7) / 10007;

const VS = /* glsl */`
varying vec3 vObj, vN, vW;
void main(){
  vObj = position;
  vec4 w = modelMatrix * vec4(position, 1.);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const PLANET_FS = /* glsl */`
uniform float uType, uSeed, uTime, uLights, uBump, uAtmoK;
uniform vec3 uC0, uC1, uC2, uLight, uShadow, uAtmo, uStar;
uniform mat4 modelMatrix;
varying vec3 vObj, vN, vW;
${NOISE}
float ridged(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < OCTAVES; i++){ float n = 1. - abs(snoise(p)); s += a * n * n; p = p * 2.1 + 1.3; a *= .5; } return s; }
void main(){
  vec3 s = normalize(vObj);
  vec3 p = s + uSeed * 7.;
  vec3 col; float h = 0., bk = 0., emis = 0., spec = 0., city = 0., rough = 30.;
  vec3 bp = p * 2.2; // ponto da altura usada no relevo
  vec3 emisCol = uC2;
  int t = int(uType + .5);
  if (t == 0) {            // rochoso: domain warping + cristas + crateras
    vec3 q = vec3(fbm(p * 1.5), fbm(p * 1.5 + 3.1), fbm(p * 1.5 + 6.7));
    bp = p * 2.2 + q * .9;
    h = fbm(bp) * .75 + ridged(p * 2.8) * .45;
    float cr = snoise(p * 4.5);
    h += (smoothstep(.5, .58, cr) - smoothstep(.58, .75, cr) * 1.3) * .18;
    col = mix(uC0, uC1, smoothstep(-.15, .5, h));
    col = mix(col, uC2, smoothstep(.5, .85, h));
    col *= .88 + .24 * snoise(p * 18.);
    bk = 1.;
  } else if (t == 1) {     // gasoso: faixas turbulentas + grande tempestade
    float w = fbm(p * vec3(1.2, 3., 1.2) + vec3(uTime * .012, 0., 0.));
    float w2 = fbm(vec3(p.x * 2., s.y * 9., p.z * 2.) + w * 1.6);
    float band = sin(s.y * 10. + w * 2.6 + w2 * 1.3);
    float band2 = sin(s.y * 29. + w2 * 3.2);
    col = mix(uC0, uC1, smoothstep(-.7, .7, band));
    col = mix(col, uC2, smoothstep(.2, 1., band2) * .5);
    vec3 sc = normalize(vec3(cos(uSeed * 6.3), -.32 + uSeed * .2, sin(uSeed * 6.3)));
    float ds = length((s - sc) * vec3(1., 2.3, 1.));
    float storm = smoothstep(.3, .02, ds);
    vec3 eye = mix(uC1 * 1.25, uC2, .5 + .5 * sin(ds * 46. - uTime * .6 + w * 5.));
    col = mix(col, eye, storm * .9);
    col *= .9 + .2 * w2;
    spec = .08; rough = 8.;
  } else if (t == 2) {     // gelado: placas e rachaduras
    bp = p * 2.;
    h = fbm(bp);
    col = mix(uC1, uC0, smoothstep(-.2, .8, h) * .55) * .8;   // a cor do meio manda; o branco só nas placas altas
    float c1 = 1. - smoothstep(0., .04, abs(snoise(p * 3.)));
    float c2 = 1. - smoothstep(0., .025, abs(snoise(p * 7. + 2.)));
    float k = max(c1, c2 * .6);
    col = mix(col, uC2, k * .85);
    h -= k * .2; bk = .5; spec = .55; rough = 60.;
  } else if (t == 3) {     // oceânico: continentes, praias, montanhas, gelo polar, cidades
    vec3 q = vec3(fbm(p * 1.2), fbm(p * 1.2 + 4.), fbm(p * 1.2 + 8.));
    bp = p * 1.8 + q * .9;
    h = fbm(bp);
    float land = smoothstep(.06, .09, h);
    float deep = smoothstep(.06, -.35, h);
    vec3 sea = mix(uC0 * 1.9 + vec3(.0, .02, .03), uC0 * .5, deep);
    sea = mix(sea, mix(uC0, vec3(.4, .9, .85), .5) * 1.2, smoothstep(-.06, .06, h) * (1. - land));
    vec3 ground = mix(uC1, uC1 * .55 + uC2 * .25, smoothstep(.12, .35, h));
    ground = mix(ground, uC2, smoothstep(.5, .72, h));
    ground *= .85 + .3 * snoise(p * 14.);
    col = mix(sea, ground, land);
    float pole = smoothstep(.8, .9, abs(s.y) + h * .15);
    col = mix(col, vec3(.95, .97, 1.), pole);
    spec = (1. - land) * (1. - pole); rough = 90.;
    bk = land * .7;
    float cells = smoothstep(.62, .95, snoise(p * 26.) * .5 + .5) * smoothstep(.25, .6, snoise(p * 4. + 9.) * .5 + .5);
    city = uLights * land * (1. - pole) * cells;
  } else {                 // vulcânico: crosta escura e rios de lava
    bp = p * 2.4;
    h = fbm(bp);
    col = mix(uC0, uC1, smoothstep(-.3, .5, h));
    float c1 = 1. - smoothstep(0., .05, abs(snoise(p * 2.6 + vec3(0., 0., uTime * .02))));
    float c2 = 1. - smoothstep(0., .03, abs(snoise(p * 6.)));
    float zone = smoothstep(.0, .45, snoise(p * 1.3 + 4.));
    emis = max(c1, c2 * .5 * zone) * smoothstep(-.25, .3, .2 - h);
    col *= 1. - emis * .7; h -= emis * .15; bk = .8;
  }
  vec3 Ng = normalize(vN);
  vec3 N = Ng;
  if (bk > 0.) {
    vec3 t1 = normalize(cross(s, abs(s.y) < .99 ? vec3(0., 1., 0.) : vec3(1., 0., 0.))), t2 = cross(s, t1);
    const float e = .006;
    float h0 = fbm(bp), hx = fbm(bp + t1 * e * 2.2), hy = fbm(bp + t2 * e * 2.2);
    vec3 no = normalize(s - bk * uBump * ((hx - h0) * t1 + (hy - h0) * t2) / e);
    N = normalize(mat3(modelMatrix) * no);
  }
  vec3 L = normalize(-vW), V = normalize(cameraPosition - vW);
  float ndlG = dot(Ng, L);
  float ndl = max(dot(N, L), 0.) * smoothstep(-.15, .15, ndlG);
  vec3 c = col * (uLight * ndl + uShadow);
  // faixa do crepúsculo: a atmosfera tinge o terminador
  c += col * uAtmo * exp(-pow(ndlG * 5., 2.)) * .18 * uAtmoK;
  vec3 H = normalize(L + V);
  float fres = .04 + .96 * pow(1. - max(dot(N, V), 0.), 5.);
  c += uLight * pow(max(dot(N, H), 0.), rough) * spec * ndl * (.5 + fres * 2.);
  float rim = pow(1. - max(dot(Ng, V), 0.), 3.5);
  c += uAtmo * rim * smoothstep(-.35, .55, ndlG) * .9 * uAtmoK;
  float night = 1. - smoothstep(-.2, .08, ndlG);
  c += emisCol * emis * (1.2 + 1.6 * night);
  c += vec3(1., .62, .28) * city * night * 2.2;
  gl_FragColor = vec4(c, 1.);
}`;

const CLOUD_FS = /* glsl */`
uniform float uSeed, uTime, uAmount; uniform vec3 uLight, uShadow, uAtmo;
varying vec3 vObj, vN, vW;
${NOISE}
void main(){
  vec3 s = normalize(vObj);
  vec3 p = s * 2. + uSeed * 13.;
  vec3 q = vec3(fbm(p + vec3(uTime * .01, 0., 0.)), fbm(p + 5.2), fbm(p + 9.1));
  float n = fbm(p * 1.6 + q * 1.8) * .5 + .5;
  float th = .78 - uAmount * .42;
  float a = smoothstep(th, th + .28, n) * .9;
  if (a < .01) discard;
  vec3 N = normalize(vN), L = normalize(-vW);
  float ndl = dot(N, L);
  vec3 c = vec3(1.) * (uLight * smoothstep(-.1, .6, ndl) + uShadow) + uAtmo * exp(-pow(ndl * 5., 2.)) * .25;
  gl_FragColor = vec4(c * a, a);
}`;

const ATMO_FS = /* glsl */`
uniform vec3 uAtmo; uniform float uK;
varying vec3 vObj, vN, vW;
void main(){
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW), L = normalize(-vW);
  float i = smoothstep(0., .5, -dot(N, V));
  i = i * i;
  float lit = smoothstep(-.45, .5, dot(N, L));
  gl_FragColor = vec4(uAtmo * i * lit * uK, 1.);
}`;

const STAR_FS = /* glsl */`
uniform vec3 uColor; uniform float uTime;
varying vec3 vObj, vN, vW;
${NOISE}
void main(){
  vec3 s = normalize(vObj);
  float n = fbm(s * 3. + vec3(0., uTime * .03, 0.));
  float gran = snoise(s * 34. + uTime * .25) * .5 + .5;
  float spots = smoothstep(.5, .72, fbm(s * 2.2 + 7. + uTime * .008));
  float mu = max(dot(normalize(vN), normalize(cameraPosition - vW)), 0.);
  vec3 core = uColor * 2.6 + vec3(1.4);
  vec3 c = mix(uColor * 1.6, core, pow(mu, .55));
  c *= .82 + .3 * n + .18 * gran;
  c *= 1. - spots * .65;
  gl_FragColor = vec4(c, 1.);
}`;

const RING_FS = /* glsl */`
uniform float uIn, uOut, uSeed; uniform vec3 uC0, uC1, uLight, uShadow, uPlanet; uniform float uR;
varying vec3 vObj, vN, vW;
float h1(float x){ return fract(sin(x * 127.1) * 43758.5); }
void main(){
  float r = (length(vObj.xy) - uIn) / (uOut - uIn);
  float x = r * 90. + uSeed * 20.;
  float i = floor(x), f = fract(x);
  float fine = mix(h1(i), h1(i + 1.), smoothstep(0., 1., f));
  float b = .35 + .45 * fine + .2 * sin(r * 22. + uSeed * 9.);
  b *= smoothstep(0., .06, r) * smoothstep(1., .9, r);
  b *= 1. - .85 * smoothstep(.56, .58, r) * smoothstep(.65, .63, r);   // divisão principal
  b *= 1. - .5 * smoothstep(.83, .84, r) * smoothstep(.86, .85, r);
  vec3 L = normalize(-vW); vec3 oc = uPlanet - vW; float tca = dot(oc, L);
  float sh = (tca > 0. && dot(oc, oc) - tca * tca < uR * uR) ? 1. : 0.;
  vec3 col = mix(uC0, uC1, smoothstep(.1, .9, r) * .7 + fine * .3);
  vec3 c = col * mix(uLight, uShadow * 3., sh);
  gl_FragColor = vec4(c * b, b * .9);
}`;

export function glowTexture() {
  const s = 256, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const x = cv.getContext('2d'), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,.45)');
  g.addColorStop(0.45, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// raios finos em volta da estrela, como na difração de uma lente
export function burstTexture() {
  const s = 512, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const x = cv.getContext('2d');
  x.translate(s / 2, s / 2);
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + (i % 2) * 0.11, len = s / 2 * (i % 2 ? 0.55 : 1) * (0.7 + Math.random() * 0.3);
    const g = x.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.strokeStyle = g; x.lineWidth = i % 2 ? 1.5 : 2.5;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * len, Math.sin(a) * len); x.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function orbitLine(radius, color) {
  const pts = [];
  for (let i = 0; i < 360; i++) { const a = i / 360 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)); }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false }));
}

function planetMaterial(d, seed, light, defs, colors = d.colors.map(h => new THREE.Color(h))) {
  return new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: PLANET_FS, defines: defs,
    uniforms: {
      uType: { value: d.type }, uSeed: { value: seed }, uTime: { value: 0 }, uLights: { value: d.lights ? 1 : 0 },
      uBump: { value: 0.18 }, uAtmoK: { value: d.type === 0 && !d.clouds ? 0.35 : d.type === 4 ? 0.7 : 1 },
      uC0: { value: colors[0] }, uC1: { value: colors[1] }, uC2: { value: colors[2] },
      uLight: { value: light }, uShadow: { value: SHADOW }, uAtmo: { value: new THREE.Color(d.atmo || '#ffffff') }, uStar: { value: light },
    },
  });
}

export function createSystem(sys, { octaves, glow, burst, renderer, sky }) {
  const scene = new THREE.Scene();
  const sysSeed = hash(sys.name);
  scene.background = makeSky(renderer, sys.sky, sysSeed, sky);
  const defs = { OCTAVES: octaves };
  const starCol = new THREE.Color(sys.color);
  const light = starCol.clone().lerp(new THREE.Color('#ffffff'), 0.45).multiplyScalar(1.9);

  // estrela
  const starMat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: STAR_FS, defines: defs, uniforms: { uColor: { value: starCol.clone() }, uTime: { value: 0 } } });
  const star = new THREE.Mesh(new THREE.SphereGeometry(sys.starSize, 96, 64), starMat);
  star.userData = { kind: 'star' };
  scene.add(star);
  const sprite = (map, color, scale) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.setScalar(scale);
    scene.add(sp);
    return sp;
  };
  sprite(glow, starCol.clone().multiplyScalar(1.6), sys.starSize * 6);
  sprite(glow, starCol.clone().multiplyScalar(0.35), sys.starSize * 18);
  const rays = sprite(burst, starCol.clone().multiplyScalar(0.45), sys.starSize * 11);

  // planetas
  const hits = [star];
  const moonColors = [new THREE.Color('#4a4642'), new THREE.Color('#8f8a84'), new THREE.Color('#d0ccc6')];
  const planets = sys.planets.map((d, i) => {
    const seed = hash(d.name);
    const plane = new THREE.Group();
    plane.rotation.set((seed - 0.5) * 0.12, 0, (hash(d.name + 'z') - 0.5) * 0.1);
    const arm = new THREE.Group();
    arm.rotation.y = seed * Math.PI * 2 + i * 1.3;
    const holder = new THREE.Group();
    holder.position.x = d.orbit;
    const tilt = new THREE.Group();
    tilt.rotation.z = (seed - 0.5) * 0.6;
    holder.add(tilt);

    const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.size, 128, 96), planetMaterial(d, seed, light, defs));
    tilt.add(mesh);
    const mats = [mesh.material];

    let clouds = null;
    if (d.clouds) {
      clouds = new THREE.Mesh(new THREE.SphereGeometry(d.size * 1.012, 96, 72), new THREE.ShaderMaterial({
        vertexShader: VS, fragmentShader: CLOUD_FS, defines: defs, transparent: true, depthWrite: false,
        uniforms: { uSeed: { value: seed }, uTime: { value: 0 }, uAmount: { value: d.clouds }, uLight: { value: light }, uShadow: { value: SHADOW }, uAtmo: { value: new THREE.Color(d.atmo) } },
      }));
      tilt.add(clouds);
      mats.push(clouds.material);
    }
    // halo de atmosfera: casca maior, só a face de trás, somando luz
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(d.size * (d.type === 1 ? 1.07 : 1.13), 64, 48), new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: ATMO_FS, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uAtmo: { value: new THREE.Color(d.atmo) }, uK: { value: d.type === 0 && !d.clouds ? 0.5 : 1.3 } },
    }));
    holder.add(atmo);

    const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(d.size * 1.6, 1.4), 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = { kind: 'planet', index: i };
    holder.add(hit);
    hits.push(hit);

    let ring = null;
    if (d.rings) {
      const rIn = d.size * 1.4, rOut = d.size * 2.45;
      const cols = d.colors.map(h => new THREE.Color(h));
      ring = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 256, 1), new THREE.ShaderMaterial({
        vertexShader: VS, fragmentShader: RING_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: {
          uIn: { value: rIn }, uOut: { value: rOut }, uSeed: { value: seed }, uC0: { value: cols[1].clone().lerp(cols[0], 0.3) }, uC1: { value: cols[2] },
          uLight: { value: light }, uShadow: { value: SHADOW }, uPlanet: { value: new THREE.Vector3() }, uR: { value: d.size },
        },
      }));
      ring.rotation.x = -Math.PI / 2 + 0.35;
      ring.rotation.y = 0.2;
      tilt.add(ring);
    }

    // até duas luas, com o mesmo shader rochoso em cinza
    const moons = Array.from({ length: Math.min(d.moons, 2) }, (_, k) => {
      const ms = d.size * (0.16 + hash(d.name + k) * 0.08);
      const md = { type: 0, size: ms, colors: [], atmo: '#ffffff' };
      const tint = new THREE.Color(d.colors[k % 2 ? 2 : 1]);
      const mc = moonColors.map((c, j) => c.clone().lerp(tint, 0.35 + j * 0.1));
      const m = new THREE.Mesh(new THREE.SphereGeometry(ms, 48, 32), planetMaterial(md, hash(d.name + 'm' + k), light, defs, mc));
      const piv = new THREE.Group();
      piv.rotation.set((hash(d.name + 'i' + k) - 0.5) * 0.5, hash(d.name + 'a' + k) * 6.28, 0);
      m.position.x = d.size * (d.rings ? 3 + k * 0.7 : 2.2 + k * 0.9);
      piv.add(m);
      holder.add(piv);
      mats.push(m.material);
      return { piv, speed: 0.5 / (1 + k * 0.8) };
    });

    arm.add(holder);
    const line = orbitLine(d.orbit, new THREE.Color(d.atmo));
    plane.add(line, arm);
    scene.add(plane);
    return { data: d, plane, arm, holder, mesh, clouds, ring, line, moons, mats, speed: 0.22 * Math.pow(d.orbit / 8, -1.5) };
  });

  // cinturão de asteroides
  let belt = null;
  if (sys.belt) {
    const n = 3200, B = alloc(n), c = new THREE.Color();
    const rock = [new THREE.Color('#8a7a6a'), new THREE.Color('#5a5650'), new THREE.Color('#b09070')];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = sys.belt + (Math.random() + Math.random() - 1) * 1.6;
      B[0].set([Math.cos(a) * r, (Math.random() - 0.5) * 0.5, Math.sin(a) * r], i * 3);
      c.copy(rock[i % 3]).multiplyScalar(0.4 + Math.random() * 0.6).toArray(B[1], i * 3);
      B[2][i] = 0.05 + Math.random() ** 3 * 0.2; B[3][i] = Math.random();
    }
    belt = cloud(B, pointsMat(1, { soft: 10, scale: 260 }));
    scene.add(belt);
  }

  const pointMats = [belt?.material].filter(Boolean);
  const tmp = new THREE.Vector3();

  return {
    scene, star, planets, hits,
    radius: Math.max(...sys.planets.map(p => p.orbit)),
    setPx(px) { pointMats.forEach(m => { m.uniforms.uPx.value = px; }); },
    focus(i) {
      planets.forEach((p, j) => { p.line.material.opacity = i < 0 ? 0.22 : j === i ? 0.55 : 0.07; });
    },
    update(dt, t, motion, timeScale) {
      starMat.uniforms.uTime.value = t;
      rays.material.rotation += dt * 0.01 * motion;
      pointMats.forEach(m => { m.uniforms.uTime.value = t; });
      if (belt) belt.rotation.y += dt * 0.01 * motion * timeScale;
      for (const p of planets) {
        p.arm.rotation.y += dt * p.speed * motion * timeScale;
        p.mesh.rotation.y += dt * 0.06 * motion;
        if (p.clouds) p.clouds.rotation.y += dt * 0.075 * motion;
        for (const m of p.moons) m.piv.rotation.y += dt * m.speed * motion * Math.max(timeScale, 0.4);
        for (const m of p.mats) m.uniforms.uTime.value = t;
        if (p.ring) p.ring.material.uniforms.uPlanet.value.copy(p.holder.getWorldPosition(tmp));
      }
    },
  };
}
