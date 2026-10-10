import * as THREE from 'three';

// Synthetic turf: one canvas holds the mowing stripes and the society markings; the
// ground samples it, and so do the blades, so lines show through the grass.

export const PITCH = { w: 40, h: 24, runW: 44, runH: 28 }; // playing area and turf with run-off (m)
export const GOAL = { w: 5, h: 2.2, d: 1.2 };
const PX = 48; // canvas pixels per meter

export function pitchTexture(maxAniso) {
  const c = document.createElement('canvas');
  c.width = PITCH.runW * PX; c.height = PITCH.runH * PX;
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const X = m => (m + PITCH.runW / 2) * PX, Y = m => (m + PITCH.runH / 2) * PX;

  // stripes across the length, 4 m wide
  for (let i = 0; i < PITCH.runW / 4; i++) {
    g.fillStyle = i % 2 ? '#2f7a34' : '#357f39';
    g.fillRect(i * 4 * PX, 0, 4 * PX + 1, H);
  }
  // fibre noise and rubber granules
  const img = g.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    d[i] += n; d[i + 1] += n * 1.2; d[i + 2] += n;
    if (Math.random() < 0.012) { d[i] = d[i + 1] = d[i + 2] = 24; }
  }
  g.putImageData(img, 0, 0);

  g.strokeStyle = 'rgba(242,240,232,.92)';
  g.lineWidth = 0.1 * PX;
  const hw = PITCH.w / 2, hh = PITCH.h / 2;
  g.strokeRect(X(-hw), Y(-hh), PITCH.w * PX, PITCH.h * PX);
  g.beginPath(); g.moveTo(X(0), Y(-hh)); g.lineTo(X(0), Y(hh)); g.stroke();
  g.beginPath(); g.arc(X(0), Y(0), 3 * PX, 0, Math.PI * 2); g.stroke();
  g.fillStyle = g.strokeStyle;
  for (const s of [-1, 1]) {
    // penalty area: 6 m deep, quarter circles from the posts like futsal
    g.beginPath();
    g.arc(X(s * hw), Y(-1.5), 6 * PX, -Math.PI / 2, s > 0 ? Math.PI : 0, s > 0);
    g.lineTo(X(s * (hw - 6)), Y(1.5));
    g.arc(X(s * hw), Y(1.5), 6 * PX, s > 0 ? Math.PI : 0, Math.PI / 2, s > 0);
    g.stroke();
    g.beginPath(); g.arc(X(s * (hw - 7)), Y(0), 0.12 * PX, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(X(s * (hw - 10)), Y(0), 0.12 * PX, 0, Math.PI * 2); g.fill();
    for (const t of [-1, 1]) { g.beginPath(); g.arc(X(s * hw), Y(t * hh), 0.6 * PX, 0, Math.PI * 2); g.stroke(); }
  }
  g.beginPath(); g.arc(X(0), Y(0), 0.14 * PX, 0, Math.PI * 2); g.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

const vertex = /* glsl */`
attribute vec2 aCenter;
attribute float aCorner, aRand;
uniform float uTime, uSize;
uniform vec2 uCenter;
uniform vec3 uBall;
uniform sampler2D uMap;
varying vec3 vCol;
varying float vTip, vDepth;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  float h_ = uSize * .5;
  vec2 p = mod(aCenter - uCenter + h_, uSize) - h_ + uCenter;
  // only on the turf, fading at the edge of the patch
  float keep = step(abs(p.x), ${(PITCH.runW / 2).toFixed(1)}) * step(abs(p.y), ${(PITCH.runH / 2).toFixed(1)});
  keep *= 1. - smoothstep(h_ * .6, h_ * .95, length(p - uCenter));
  vec2 uv = vec2(p.x / ${PITCH.runW.toFixed(1)} + .5, .5 - p.y / ${PITCH.runH.toFixed(1)});
  vCol = texture2D(uMap, uv).rgb;
  float height = (.045 + .05 * aRand) * keep;
  float width = .011 * step(.01, keep);
  vec3 base = vec3(p.x, 0., p.y);
  vec2 local = aCorner < .5 ? vec2(0., height) : vec2(aCorner < 1.5 ? width : -width, 0.);
  vec2 toCam = normalize(cameraPosition.xz - base.xz);
  vec2 side = vec2(toCam.y, -toCam.x);
  vec3 pos = base + vec3(side.x * local.x, local.y, side.y * local.x);
  float tip = step(aCorner, .5);
  // fibres lean every which way, and the ball flattens them
  float a = hash(p) * 6.283;
  pos.xz += vec2(cos(a), sin(a)) * height * .5 * tip;
  vec2 away = p - uBall.xz;
  float push = tip * smoothstep(.3, .05, length(away)) * step(uBall.y, .2);
  pos.xz += normalize(away + 1e-4) * push * .06;
  pos.y -= push * height * .6;
  vTip = tip;
  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */`
uniform float uLit;
uniform vec3 uFog; uniform float uFogDensity;
varying vec3 vCol; varying float vTip, vDepth;
void main(){
  vec3 c = vCol * (.55 + .7 * vTip) * uLit;
  float f = 1. - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
  gl_FragColor = vec4(mix(c, uFog, f), 1.);
  #include <colorspace_fragment>
}`;

// a square patch of blades that follows a point on the pitch (mod wrap)
export function createBlades({ count, size, map, fog }) {
  const n = count * count;
  const center = new Float32Array(n * 6), corner = new Float32Array(n * 3), rand = new Float32Array(n * 3);
  const cell = size / count;
  for (let ix = 0; ix < count; ix++) for (let iz = 0; iz < count; iz++) {
    const i = ix * count + iz;
    const x = (ix / count - 0.5) * size + (Math.random() - 0.5) * cell;
    const z = (iz / count - 0.5) * size + (Math.random() - 0.5) * cell;
    const r = Math.random();
    for (let v = 0; v < 3; v++) {
      center[(i * 3 + v) * 2] = x; center[(i * 3 + v) * 2 + 1] = z;
      corner[i * 3 + v] = v; rand[i * 3 + v] = r;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 9), 3));
  geo.setAttribute('aCenter', new THREE.BufferAttribute(center, 2));
  geo.setAttribute('aCorner', new THREE.BufferAttribute(corner, 1));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 }, uSize: { value: size }, uCenter: { value: new THREE.Vector2() }, uBall: { value: new THREE.Vector3() },
      uMap: { value: map }, uLit: { value: 1 }, uFog: { value: fog.color }, uFogDensity: { value: fog.density },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}
