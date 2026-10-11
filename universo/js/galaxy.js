import * as THREE from 'three';
import { SYSTEMS } from './data.js';

// Galáxia espiral feita só de pontos (um draw call), com névoa de poeira e anel nos 5 sistemas.
export const PALETTE = {
  ink: new THREE.Color('#0b0b0c'),
  paper: new THREE.Color('#edebe6'),
  grey: new THREE.Color('#8a8883'),
  accent: new THREE.Color('#ff4d1f'),
};

const R = 40, SPIN = 0.2;
const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += Math.random(); return (u - 2) / 2; };
export const armPoint = (arm, f, out = new THREE.Vector3()) => {
  const r = f * R, a = arm * Math.PI + r * SPIN;
  return out.set(Math.cos(a) * r, 0, Math.sin(a) * r);
};

const POINT_VS = /* glsl */`
attribute vec3 aColor; attribute float aSize; attribute float aRand;
uniform float uTime, uPx, uTwinkle;
varying vec3 vColor;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  float tw = 1. + uTwinkle * sin(uTime * (1.5 + aRand * 2.) + aRand * 60.);
  gl_PointSize = aSize * tw * uPx * (190. / -mv.z);
  gl_Position = projectionMatrix * mv;
  vColor = aColor;
}`;
const POINT_FS = /* glsl */`
uniform float uSoft, uAlpha;
varying vec3 vColor;
void main(){
  vec2 c = gl_PointCoord - .5;
  float a = exp(-dot(c, c) * uSoft) * uAlpha;
  if (a < .004) discard;
  gl_FragColor = vec4(vColor * a, 1.);
}`;

function pointsMaterial(px, soft, alpha, twinkle) {
  return new THREE.ShaderMaterial({
    vertexShader: POINT_VS, fragmentShader: POINT_FS,
    uniforms: { uTime: { value: 0 }, uPx: { value: px }, uSoft: { value: soft }, uAlpha: { value: alpha }, uTwinkle: { value: twinkle } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

export function starfield(count, radius, px) {
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count), rnd = new Float32Array(count);
  const v = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    v.randomDirection().multiplyScalar(radius * (0.8 + Math.random() * 0.2)).toArray(pos, i * 3);
    c.copy(Math.random() < 0.7 ? PALETTE.grey : PALETTE.paper).multiplyScalar(0.5 + Math.random() * 0.9).toArray(col, i * 3);
    size[i] = (0.6 + Math.random() ** 4 * 2.2) * radius / 260; rnd[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
  const p = new THREE.Points(g, pointsMaterial(px, 22, 1, 0.35));
  p.frustumCulled = false;
  return p;
}

export function ringTexture() {
  const s = 128, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const x = cv.getContext('2d');
  x.strokeStyle = '#fff'; x.lineWidth = 5;
  x.beginPath(); x.arc(s / 2, s / 2, s / 2 - 8, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(s / 2, s / 2, 9, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createGalaxy({ count, px }) {
  const scene = new THREE.Scene();
  scene.background = PALETTE.ink.clone().multiplyScalar(0.6);
  const group = new THREE.Group();
  group.rotation.x = 0.05;
  scene.add(group);

  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count), rnd = new Float32Array(count);
  const c = new THREE.Color(), core = PALETTE.paper.clone().lerp(PALETTE.accent, 0.55), v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const bulge = Math.random() < 0.2;
    let f;
    if (bulge) {
      v.set(gauss(), gauss() * 0.55, gauss()).multiplyScalar(4.2);
      f = v.length() / R;
    } else {
      f = Math.pow(Math.random(), 1.25) * 0.95 + 0.04;
      armPoint(i % 2, f, v);
      const spread = (0.8 + f * R * 0.1) * (Math.random() < 0.3 ? 2.6 : 1);
      v.x += gauss() * spread; v.z += gauss() * spread;
      v.y = gauss() * (0.5 + 1.6 * Math.exp(-f * 4));
      // barra central
      if (f < 0.18) { v.x *= 1.0; v.z *= 0.55; }
    }
    v.toArray(pos, i * 3);
    const heat = Math.exp(-f * 9);
    c.copy(PALETTE.grey).lerp(PALETTE.paper, Math.random() * 0.8).lerp(core, heat);
    let b = 0.3 + heat * 1.05;
    const bright = Math.random() < 0.025;
    if (bright) b *= 4;
    c.multiplyScalar(b).toArray(col, i * 3);
    size[i] = (0.25 + Math.random() * 0.55) * (bright ? 2.2 : 1);
    rnd[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
  const stars = new THREE.Points(g, pointsMaterial(px, 16, 1, 0.25));
  stars.frustumCulled = false;
  group.add(stars);

  // poeira: poucos pontos grandes e quase transparentes dão volume aos braços
  const dn = Math.round(count / 70);
  const dpos = new Float32Array(dn * 3), dcol = new Float32Array(dn * 3), dsize = new Float32Array(dn), drnd = new Float32Array(dn);
  for (let i = 0; i < dn; i++) {
    const f = Math.random() * 0.9 + 0.03;
    armPoint(i % 2, f, v);
    const spread = 1.5 + f * R * 0.12;
    v.x += gauss() * spread; v.z += gauss() * spread; v.y = gauss() * 0.8;
    v.toArray(dpos, i * 3);
    c.copy(PALETTE.grey).lerp(PALETTE.accent, Math.random() < 0.12 ? 0.6 : 0).multiplyScalar(0.5).toArray(dcol, i * 3);
    dsize[i] = 14 + Math.random() * 26; drnd[i] = Math.random();
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  dg.setAttribute('aColor', new THREE.BufferAttribute(dcol, 3));
  dg.setAttribute('aSize', new THREE.BufferAttribute(dsize, 1));
  dg.setAttribute('aRand', new THREE.BufferAttribute(drnd, 1));
  const dust = new THREE.Points(dg, pointsMaterial(px, 9, 0.045, 0));
  dust.frustumCulled = false;
  group.add(dust);

  const bg = starfield(3000, 600, px);
  scene.add(bg);

  // marcadores dos sistemas: anel que sempre encara a câmera + esfera invisível para o clique
  const tex = ringTexture();
  const markers = SYSTEMS.map((s, i) => {
    const m = new THREE.Group();
    armPoint(s.arm, s.r, m.position);
    m.position.y = 0.3;
    const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: PALETTE.paper.clone().multiplyScalar(1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.scale.setScalar(2.2);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = { kind: 'system', index: i };
    m.add(ring, hit);
    m.userData = { ring, hit };
    group.add(m);
    return m;
  });

  const mats = [stars.material, dust.material, bg.material];
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
        m.userData.ring.material.color.copy(j === i ? PALETTE.accent : PALETTE.paper).multiplyScalar(j === i ? 2.4 : 1.4);
        m.userData.ring.scale.setScalar(j === i ? 3 : 2.2);
      });
    },
  };
}
