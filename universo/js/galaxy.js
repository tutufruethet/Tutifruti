import * as THREE from 'three';
import { SYSTEMS } from './data.js';
import { makeSky } from './sky.js';

// Galáxia espiral feita de pontos: núcleo quente, braços de estrelas jovens azuladas,
// regiões de formação estelar rosadas e faixas de poeira escura do lado de dentro dos braços.
export const PALETTE = {
  ink: new THREE.Color('#0b0b0c'),
  paper: new THREE.Color('#edebe6'),
  grey: new THREE.Color('#8a8883'),
  accent: new THREE.Color('#ff4d1f'),
};

const R = 40, SPIN = 0.2;
const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += Math.random(); return (u - 2) / 2; };
export const armPoint = (arm, f, out = new THREE.Vector3(), shift = 0) => {
  const r = f * R, a = arm * Math.PI + r * SPIN + shift;
  return out.set(Math.cos(a) * r, 0, Math.sin(a) * r);
};

// cor de estrela por temperatura (0 vermelha … 1 azul)
const T = [new THREE.Color('#ff7b3a'), new THREE.Color('#ffc58a'), new THREE.Color('#fff4e6'), new THREE.Color('#cfdcff'), new THREE.Color('#8fb0ff')];
export function starColor(t, out = new THREE.Color()) {
  const x = Math.min(Math.max(t, 0), 0.999) * (T.length - 1), i = Math.floor(x);
  return out.copy(T[i]).lerp(T[i + 1], x - i);
}

const POINT_VS = /* glsl */`
attribute vec3 aColor; attribute float aSize; attribute float aRand;
uniform float uTime, uPx, uTwinkle, uScale;
varying vec3 vColor;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  float tw = 1. + uTwinkle * sin(uTime * (1.5 + aRand * 2.) + aRand * 60.);
  gl_PointSize = max(aSize * tw * uPx * (uScale / -mv.z), 1.);
  gl_Position = projectionMatrix * mv;
  vColor = aColor;
}`;
const POINT_FS = /* glsl */`
uniform float uSoft, uAlpha;
varying vec3 vColor;
void main(){
  vec2 c = gl_PointCoord - .5;
  float d = dot(c, c);
  float a = (exp(-d * uSoft) + exp(-d * uSoft * 6.) * .6) * uAlpha;
  if (a < .003) discard;
  gl_FragColor = vec4(vColor * a, 1.);
}`;
const DUST_FS = /* glsl */`
uniform float uSoft, uAlpha;
varying vec3 vColor;
void main(){
  vec2 c = gl_PointCoord - .5;
  float a = exp(-dot(c, c) * uSoft) * uAlpha;
  if (a < .003) discard;
  gl_FragColor = vec4(vColor, a);
}`;

function pointsMaterial(px, soft, alpha, twinkle, scale = 190, dust = false) {
  return new THREE.ShaderMaterial({
    vertexShader: POINT_VS, fragmentShader: dust ? DUST_FS : POINT_FS,
    uniforms: { uTime: { value: 0 }, uPx: { value: px }, uSoft: { value: soft }, uAlpha: { value: alpha }, uTwinkle: { value: twinkle }, uScale: { value: scale } },
    transparent: true, depthWrite: false, blending: dust ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
}

function cloud(arrays, mat) {
  const [pos, col, size, rnd] = arrays;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  return p;
}
const alloc = n => [new Float32Array(n * 3), new Float32Array(n * 3), new Float32Array(n), new Float32Array(n)];

export function pointsMat(px, o = {}) { return pointsMaterial(px, o.soft ?? 16, o.alpha ?? 1, o.twinkle ?? 0, o.scale ?? 190, o.dust); }
export { cloud, alloc };

export function ringTexture() {
  const s = 128, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const x = cv.getContext('2d');
  x.strokeStyle = '#fff'; x.lineWidth = 5;
  x.beginPath(); x.arc(s / 2, s / 2, s / 2 - 8, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(s / 2, s / 2, 9, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createGalaxy({ count, px, renderer, sky }) {
  const scene = new THREE.Scene();
  scene.background = makeSky(renderer, ['#2a1650', '#0e2a4a', '#4a1638'], 0.37, { ...sky, gain: 0.55 });
  const group = new THREE.Group();
  group.rotation.x = 0.05;
  scene.add(group);

  const c = new THREE.Color(), v = new THREE.Vector3();
  const pink = new THREE.Color('#ff4f9a'), hot = new THREE.Color('#ffe2b0');

  // estrelas: 18% bojo, 6% aglomerados rosados, o resto nos braços
  const A = alloc(count);
  const knots = Array.from({ length: 70 }, (_, i) => ({ arm: i % 2, f: 0.15 + Math.random() * 0.8 }));
  for (let i = 0; i < count; i++) {
    const k = Math.random();
    let f, b, size = 0.25 + Math.random() * 0.5;
    if (k < 0.18) {
      v.set(gauss(), gauss() * 0.5, gauss()).multiplyScalar(4.6);
      if (Math.random() < 0.5) { v.x *= 1.6; v.z *= 0.6; } // barra
      f = v.length() / R;
      starColor(0.15 + Math.random() * 0.35, c).lerp(hot, 0.4);
      b = 0.35 + Math.exp(-f * 10) * 1.5;
    } else if (k < 0.24) {
      const kn = knots[(Math.random() * knots.length) | 0];
      armPoint(kn.arm, kn.f, v, -0.05);
      v.x += gauss() * 1.1; v.z += gauss() * 1.1; v.y = gauss() * 0.4;
      f = kn.f;
      c.copy(Math.random() < 0.6 ? pink : starColor(0.95));
      b = 0.9 + Math.random() * 1.4; size *= 1.3;
    } else {
      f = Math.pow(Math.random(), 1.25) * 0.95 + 0.04;
      armPoint(i % 2, f, v);
      const spread = (0.8 + f * R * 0.1) * (Math.random() < 0.3 ? 2.6 : 1);
      v.x += gauss() * spread; v.z += gauss() * spread;
      v.y = gauss() * (0.5 + 1.6 * Math.exp(-f * 4));
      starColor(0.45 + Math.random() * 0.55 - Math.exp(-f * 6) * 0.4, c);
      b = 0.3 + Math.exp(-f * 7) * 1.0;
    }
    if (Math.random() < 0.025) { b *= 4; size *= 2; }
    v.toArray(A[0], i * 3);
    c.multiplyScalar(b).toArray(A[1], i * 3);
    A[2][i] = size; A[3][i] = Math.random();
  }
  const stars = cloud(A, pointsMaterial(px, 16, 1, 0.25));
  group.add(stars);

  // nebulosas: pontos grandes e suaves que dão volume e cor aos braços
  const nn = Math.round(count / 60), N = alloc(nn);
  const blue = new THREE.Color('#3a6bff'), violet = new THREE.Color('#7a3cff'), warm = new THREE.Color('#ffb070');
  for (let i = 0; i < nn; i++) {
    const f = Math.random() * 0.92 + 0.02;
    armPoint(i % 2, f, v);
    const spread = 1.2 + f * R * 0.1;
    v.x += gauss() * spread; v.z += gauss() * spread; v.y = gauss() * 0.7;
    v.toArray(N[0], i * 3);
    const r = Math.random();
    c.copy(f < 0.15 ? warm : r < 0.15 ? pink : r < 0.9 ? blue : violet).multiplyScalar(f < 0.15 ? 0.7 : 0.55).toArray(N[1], i * 3);
    N[2][i] = 12 + Math.random() * 24; N[3][i] = Math.random();
  }
  const neb = cloud(N, pointsMaterial(px, 8, 0.04, 0));
  group.add(neb);

  // poeira escura: mistura normal (escurece), no lado côncavo dos braços
  const dn = Math.round(count / 45), D = alloc(dn);
  const soot = new THREE.Color('#120806');
  for (let i = 0; i < dn; i++) {
    const f = 0.08 + Math.random() * 0.8;
    armPoint(i % 2, f, v, -0.22 - Math.random() * 0.1);
    v.x += gauss() * 1.1; v.z += gauss() * 1.1; v.y = gauss() * 0.25 + 0.15;
    v.toArray(D[0], i * 3);
    soot.toArray(D[1], i * 3);
    D[2][i] = 5 + Math.random() * 10; D[3][i] = Math.random();
  }
  const dust = cloud(D, pointsMaterial(px, 7, 0.22, 0, 190, true));
  dust.renderOrder = 2;
  group.add(dust);

  // marcadores: anel na cor da estrela + esfera invisível para o clique
  const tex = ringTexture();
  const markers = SYSTEMS.map((s, i) => {
    const m = new THREE.Group();
    armPoint(s.arm, s.r, m.position);
    m.position.y = 0.3;
    const col = new THREE.Color(s.color);
    const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col.clone().multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.scale.setScalar(2.2);
    ring.renderOrder = 3;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = { kind: 'system', index: i };
    m.add(ring, hit);
    m.userData = { ring, hit, col };
    group.add(m);
    return m;
  });

  const mats = [stars.material, neb.material, dust.material];
  return {
    scene, group, markers,
    hits: markers.map(m => m.userData.hit),
    setPx(px) { mats.forEach(m => { m.uniforms.uPx.value = px; }); },
    update(dt, t, motion) {
      group.rotation.y += dt * 0.018 * motion;
      mats.forEach(m => { m.uniforms.uTime.value = t; });
    },
    highlight(i) {
      markers.forEach((m, j) => {
        m.userData.ring.material.color.copy(m.userData.col).multiplyScalar(j === i ? 3 : 1.6);
        m.userData.ring.scale.setScalar(j === i ? 3 : 2.2);
      });
    },
  };
}
