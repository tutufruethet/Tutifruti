import * as THREE from 'three';

// One triangle per blade, built in the vertex shader. The field is a square that
// wraps around `uCenter` with mod(), so the same blades follow the car forever
// (technique read in Bruno Simon's Grass.js). Wind is a scrolling value noise.
const MAX_HIDE = 14;

const vertex = /* glsl */`
attribute vec2 aCenter;
attribute float aCorner;
attribute float aRand;
uniform float uTime, uSize, uIsland;
uniform vec2 uCenter, uWind, uPath;
uniform vec3 uCar;
uniform vec4 uHide[${MAX_HIDE}];
varying float vTip, vShade, vDepth;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

void main() {
  float half_ = uSize * .5;
  vec2 p = mod(aCenter - uCenter + half_, uSize) - half_ + uCenter;

  float keep = 1. - smoothstep(uIsland - 7., uIsland - 3., length(p));
  keep *= 1. - smoothstep(half_ * .62, half_ * .95, length(p - uCenter));
  keep *= smoothstep(uPath.y, uPath.y + 1.2, abs(length(p) - uPath.x));
  for (int i = 0; i < ${MAX_HIDE}; i++) {
    vec4 h = uHide[i];
    keep *= smoothstep(h.z, h.z + h.w, length(p - h.xy));
  }

  float n = noise(p * .09);
  float height = (.35 + .65 * aRand) * (.5 + n * .9) * keep;
  float width = .12 * step(.02, keep);
  vec3 base = vec3(p.x, 0., p.y);
  vec2 local = aCorner < .5 ? vec2(0., height) : vec2(aCorner < 1.5 ? width : -width, 0.);

  vec2 toCam = normalize(cameraPosition.xz - base.xz);
  vec2 side = vec2(toCam.y, -toCam.x);
  vec3 pos = base + vec3(side.x * local.x, local.y, side.y * local.x);

  float tip = step(aCorner, .5);
  float w = noise(p * .12 + uTime * .55) - .5 + (noise(p * .45 - uTime * 1.1) - .5) * .5;
  pos.xz += uWind * w * height * 1.6 * tip;

  vec2 away = p - uCar.xz;
  float d = length(away);
  float bend = tip * smoothstep(2.6, .3, d) * step(uCar.y, 1.2);
  pos.xz += normalize(away + 1e-4) * bend * height * 1.2;
  pos.y -= bend * height * .45;

  vTip = tip;
  vShade = n;
  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */`
uniform vec3 uRoot, uTip, uLit, uFog;
uniform float uFogNear, uFogFar;
varying float vTip, vShade, vDepth;
void main() {
  vec3 c = mix(uRoot, uTip, vTip * (.7 + vShade * .5));
  c *= uLit;
  c = mix(c, uFog, smoothstep(uFogNear, uFogFar, vDepth));
  gl_FragColor = vec4(c, 1.);
}`;

export function createGrass({ subdivisions, size, island, path, hide }) {
  const count = subdivisions * subdivisions;
  const center = new Float32Array(count * 6);
  const corner = new Float32Array(count * 3);
  const rand = new Float32Array(count * 3);
  const cell = size / subdivisions;
  for (let ix = 0; ix < subdivisions; ix++) {
    for (let iz = 0; iz < subdivisions; iz++) {
      const i = ix * subdivisions + iz;
      const x = (ix / subdivisions - 0.5) * size + (Math.random() - 0.5) * cell;
      const z = (iz / subdivisions - 0.5) * size + (Math.random() - 0.5) * cell;
      const r = Math.random();
      for (let v = 0; v < 3; v++) {
        center[(i * 3 + v) * 2] = x;
        center[(i * 3 + v) * 2 + 1] = z;
        corner[i * 3 + v] = v;
        rand[i * 3 + v] = r;
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 9), 3));
  geometry.setAttribute('aCenter', new THREE.BufferAttribute(center, 2));
  geometry.setAttribute('aCorner', new THREE.BufferAttribute(corner, 1));
  geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));

  const hideList = Array.from({ length: MAX_HIDE }, (_, i) => hide[i] ?? new THREE.Vector4(9999, 9999, 0, 0.01));
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: size },
      uIsland: { value: island },
      uCenter: { value: new THREE.Vector2() },
      uWind: { value: new THREE.Vector2(0.8, 0.6) },
      uPath: { value: new THREE.Vector2(path.radius, path.width) },
      uCar: { value: new THREE.Vector3() },
      uHide: { value: hideList },
      uRoot: { value: new THREE.Color('#1f7a5c') },
      uTip: { value: new THREE.Color('#b8f05a') },
      uLit: { value: new THREE.Color(1, 1, 1) },
      uFog: { value: new THREE.Color() },
      uFogNear: { value: 50 },
      uFogFar: { value: 150 },
    },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}
