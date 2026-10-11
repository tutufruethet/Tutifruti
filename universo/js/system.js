import * as THREE from 'three';
import { NOISE } from './glsl.js';
import { PALETTE, starfield } from './galaxy.js';

// Um sistema estelar: estrela com granulação animada, planetas procedurais (5 tipos), anéis, cinturão e órbitas.
const P = PALETTE;
const SHADOW = new THREE.Color('#0d0b1c').multiplyScalar(0.55); // sombra nunca preta: tinta puxada para o roxo
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
uniform float uType, uSeed, uTime;
uniform vec3 uC0, uC1, uC2, uLight, uShadow, uAccent, uAtmo;
varying vec3 vObj, vN, vW;
${NOISE}
void main(){
  vec3 s = normalize(vObj);
  vec3 p = s + uSeed * 7.;
  vec3 col; float emis = 0., spec = 0.;
  int t = int(uType + .5);
  if (t == 0) {            // rochoso
    float h = fbm(p * 2.4);
    float r = 1. - abs(snoise(p * 5.5));
    col = mix(uC0, uC1, smoothstep(-.45, .5, h));
    col = mix(col, uC2, smoothstep(.8, .98, r) * .5);
    col *= 1. - smoothstep(.5, .6, snoise(p * 6.)) * .35;
  } else if (t == 1) {     // gasoso
    float w = fbm(p * vec3(1.2, 3.2, 1.2) + vec3(uTime * .015, 0., 0.));
    float b = sin(s.y * 13. + w * 3.2) * .5 + .5;
    float b2 = sin(s.y * 41. + w * 6.) * .5 + .5;
    col = mix(uC0, uC1, b);
    col = mix(col, uC2, b2 * .3);
    float storm = smoothstep(.6, .9, snoise(p * vec3(2.2, 5., 2.2)));
    col = mix(col, uC2, storm * .6);
  } else if (t == 2) {     // gelado
    float h = fbm(p * 2.);
    col = mix(uC0, uC1, smoothstep(-.3, .7, h));
    float c1 = 1. - smoothstep(0., .035, abs(snoise(p * 3.4)));
    float c2 = 1. - smoothstep(0., .02, abs(snoise(p * 8. + 3.)));
    col = mix(col, uC2, max(c1, c2 * .6) * .8);
    spec = .35;
  } else if (t == 3) {     // oceânico
    float h = fbm(p * 1.7);
    float land = smoothstep(.1, .16, h);
    col = mix(uC0, mix(uC1, uC2 * .85, smoothstep(.35, .7, h)), land);
    col = mix(col, uC2, smoothstep(.8, .9, abs(s.y) + h * .12));
    spec = (1. - land) * .9;
  } else {                 // vulcânico
    float h = fbm(p * 2.6);
    col = mix(uC0, uC1, smoothstep(-.3, .5, h));
    float c1 = 1. - smoothstep(0., .05, abs(snoise(p * 2.6 + vec3(0., 0., uTime * .02))));
    float c2 = 1. - smoothstep(0., .03, abs(snoise(p * 6.)));
    float zone = smoothstep(.05, .45, snoise(p * 1.3 + 4.));
    emis = max(c1, c2 * .5 * zone) * smoothstep(-.25, .3, .2 - h);
    col *= 1. - emis * .6;
  }
  vec3 N = normalize(vN), L = normalize(-vW), V = normalize(cameraPosition - vW);
  float ndl = dot(N, L);
  float lit = smoothstep(-.15, .65, ndl);
  vec3 c = col * mix(uShadow, uLight, lit);
  vec3 H = normalize(L + V);
  c += uLight * pow(max(dot(N, H), 0.), 70.) * spec * lit;
  float fr = pow(1. - max(dot(N, V), 0.), 3.);
  c += uAtmo * fr * smoothstep(-.35, .6, ndl);
  c += uAccent * emis * (1.4 + 1.2 * (1. - lit));
  gl_FragColor = vec4(c, 1.);
}`;

const STAR_FS = /* glsl */`
uniform vec3 uColor; uniform float uTime;
varying vec3 vObj, vN, vW;
${NOISE}
void main(){
  vec3 s = normalize(vObj);
  float n = fbm(s * 3.5 + vec3(0., uTime * .04, 0.));
  float g = snoise(s * 22. + uTime * .15);
  float mu = max(dot(normalize(vN), normalize(cameraPosition - vW)), 0.);
  vec3 c = uColor * (1.5 + n * .7 + g * .12) * (.45 + .55 * pow(mu, .45));
  gl_FragColor = vec4(c, 1.);
}`;

const RING_FS = /* glsl */`
uniform float uIn, uOut, uSeed; uniform vec3 uC0, uC1, uLight, uShadow, uPlanet; uniform float uR;
varying vec3 vObj, vN, vW;
void main(){
  float r = (length(vObj.xy) - uIn) / (uOut - uIn);
  float b = .6 + .25 * sin(r * 26. + uSeed * 10.) + .15 * sin(r * 61. + uSeed * 3.);
  b *= smoothstep(0., .08, r) * smoothstep(1., .85, r) * (1. - .7 * smoothstep(.55, .58, r) * smoothstep(.64, .61, r));
  // sombra do planeta no anel: o raio até a estrela passa pela esfera?
  vec3 L = normalize(-vW); vec3 oc = uPlanet - vW; float tca = dot(oc, L);
  float d2 = dot(oc, oc) - tca * tca;
  float sh = (tca > 0. && d2 < uR * uR) ? 1. : 0.;
  vec3 c = mix(uC0, uC1, r) * mix(uLight, uShadow, sh);
  gl_FragColor = vec4(c * b, b * .85);
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

function planetColors(type, seed) {
  const v = 0.85 + seed * 0.3;
  const c = (col, k) => col.clone().multiplyScalar(k);
  switch (type) {
    case 0: return [c(P.grey, 0.35 * v), c(P.grey, 0.9), c(P.paper, 0.85)];
    case 1: return [c(P.paper, 0.9 * v), c(P.grey, 0.75), P.paper.clone().lerp(P.accent, 0.12)];
    case 2: return [c(P.paper, 1.0), c(P.paper, 0.62).lerp(P.grey, 0.3), c(P.grey, 0.45)];
    case 3: return [c(P.ink, 2.2), c(P.grey, 0.7 * v), c(P.paper, 0.95)];
    default: return [c(P.ink, 1.6), c(P.grey, 0.32), c(P.grey, 0.5)];
  }
}

function orbitLine(radius) {
  const pts = [];
  for (let i = 0; i < 256; i++) { const a = i / 256 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)); }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: P.grey, transparent: true, opacity: 0.22, depthWrite: false }));
}

export function createSystem(sys, { px, octaves, glow }) {
  const scene = new THREE.Scene();
  scene.background = P.ink.clone().multiplyScalar(0.6);
  const defs = { OCTAVES: octaves };
  const starColor = (sys.hot ? P.accent.clone().lerp(P.paper, 0.25) : P.paper.clone()).multiplyScalar(1.1);
  const light = (sys.hot ? P.paper.clone().lerp(P.accent, 0.35) : P.paper.clone()).multiplyScalar(1.35);

  // estrela
  const starMat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: STAR_FS, defines: defs, uniforms: { uColor: { value: starColor }, uTime: { value: 0 } } });
  const star = new THREE.Mesh(new THREE.SphereGeometry(sys.starSize, 64, 48), starMat);
  star.userData = { kind: 'star' };
  scene.add(star);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: starColor.clone().multiplyScalar(0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  corona.scale.setScalar(sys.starSize * 7);
  const halo = new THREE.Sprite(corona.material.clone());
  halo.material.color = starColor.clone().multiplyScalar(0.12);
  halo.scale.setScalar(sys.starSize * 16);
  scene.add(corona, halo);

  // planetas
  const hits = [star];
  const planets = sys.planets.map((d, i) => {
    const seed = hash(d.name);
    const plane = new THREE.Group();
    plane.rotation.set((seed - 0.5) * 0.12, 0, (hash(d.name + 'z') - 0.5) * 0.1);
    const arm = new THREE.Group();
    arm.rotation.y = seed * Math.PI * 2 + i * 1.3;
    const holder = new THREE.Group();
    holder.position.x = d.orbit;
    const [c0, c1, c2] = planetColors(d.type, seed);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: PLANET_FS, defines: defs,
      uniforms: {
        uType: { value: d.type }, uSeed: { value: seed }, uTime: { value: 0 },
        uC0: { value: c0 }, uC1: { value: c1 }, uC2: { value: c2 },
        uLight: { value: light }, uShadow: { value: SHADOW }, uAccent: { value: P.accent.clone().multiplyScalar(1.6) },
        uAtmo: { value: (d.type === 4 ? P.accent.clone().lerp(P.grey, 0.5) : P.paper.clone()).multiplyScalar(d.type === 1 || d.type === 3 ? 0.55 : 0.3) },
      },
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.size, 96, 64), mat);
    mesh.rotation.z = (seed - 0.5) * 0.6;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(d.size * 1.6, 1.4), 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = { kind: 'planet', index: i };
    holder.add(mesh, hit);
    hits.push(hit);

    let ring = null;
    if (d.rings) {
      const rIn = d.size * 1.45, rOut = d.size * 2.5;
      const rm = new THREE.ShaderMaterial({
        vertexShader: VS, fragmentShader: RING_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: {
          uIn: { value: rIn }, uOut: { value: rOut }, uSeed: { value: seed }, uC0: { value: P.grey.clone() }, uC1: { value: P.paper.clone().multiplyScalar(0.9) },
          uLight: { value: light }, uShadow: { value: SHADOW }, uPlanet: { value: new THREE.Vector3() }, uR: { value: d.size },
        },
      });
      ring = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 160, 1), rm);
      ring.rotation.x = -Math.PI / 2 + 0.35;
      ring.rotation.y = 0.2;
      holder.add(ring);
    }
    arm.add(holder);
    const line = orbitLine(d.orbit);
    plane.add(line, arm);
    scene.add(plane);
    return { data: d, plane, arm, holder, mesh, ring, line, speed: 0.22 * Math.pow(d.orbit / 8, -1.5) };
  });

  // cinturão de asteroides
  let belt = null;
  if (sys.belt) {
    const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), rnd = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = sys.belt + (Math.random() + Math.random() - 1) * 1.6;
      pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.5, Math.sin(a) * r], i * 3);
      P.grey.clone().multiplyScalar(0.5 + Math.random() * 0.6).toArray(col, i * 3);
      size[i] = 0.05 + Math.random() ** 3 * 0.18; rnd[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
    const bf = starfield(1, 1, px).material.clone();
    bf.uniforms.uSoft.value = 10; bf.uniforms.uTwinkle.value = 0;
    belt = new THREE.Points(g, bf);
    belt.frustumCulled = false;
    scene.add(belt);
  }

  const bg = starfield(2200, 600, px);
  scene.add(bg);
  const pointMats = [bg.material, belt?.material].filter(Boolean);
  const tmp = new THREE.Vector3();
  let focus = -1;

  return {
    scene, star, planets, hits,
    radius: Math.max(...sys.planets.map(p => p.orbit)),
    setPx(px) { pointMats.forEach(m => { m.uniforms.uPx.value = px; }); },
    focus(i) {
      focus = i;
      planets.forEach((p, j) => {
        p.line.material.opacity = i < 0 ? 0.22 : j === i ? 0.5 : 0.08;
        p.line.material.color.copy(j === i ? P.paper : P.grey);
      });
    },
    update(dt, t, motion, timeScale) {
      starMat.uniforms.uTime.value = t;
      pointMats.forEach(m => { m.uniforms.uTime.value = t; });
      if (belt) belt.rotation.y += dt * 0.01 * motion * timeScale;
      for (const p of planets) {
        p.arm.rotation.y += dt * p.speed * motion * timeScale;
        p.mesh.rotation.y += dt * 0.08 * motion;
        p.mesh.material.uniforms.uTime.value = t;
        if (p.ring) p.ring.material.uniforms.uPlanet.value.copy(p.holder.getWorldPosition(tmp));
      }
    },
  };
}
