import * as THREE from 'three';

/* Point targets for the particle cloud. Every shape returns N points (xyz) that fit
   inside a ~1.6 radius, so the morph between courses never jumps in scale. */

const TAU = Math.PI * 2;

export function random(seed = 7) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

/* Faceted 8-point star: 4 long tips, 4 short, sloped faces meeting at a front and back apex. */
export function starGeometry(R = 1.5, depth = 0.4) {
  const ring = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + Math.PI / 2;
    const r = i % 2 ? R * 0.15 : (i / 2) % 2 ? R * 0.46 : R;
    ring.push([Math.cos(a) * r, Math.sin(a) * r, 0]);
  }
  const F = [0, 0, depth], B = [0, 0, -depth], pos = [];
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    pos.push(...F, ...a, ...b, ...B, ...b, ...a);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/* Area-weighted samples on a triangle mesh (non-indexed). */
function sampleMesh(geo, n, rand) {
  const p = geo.attributes.position.array, tris = p.length / 9, area = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), t = new THREE.Triangle();
  let total = 0;
  for (let i = 0; i < tris; i++) {
    a.fromArray(p, i * 9); b.fromArray(p, i * 9 + 3); c.fromArray(p, i * 9 + 6);
    total += t.set(a, b, c).getArea();
    area.push(total);
  }
  const out = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const r = rand() * total;
    let i = area.findIndex(v => v >= r);
    a.fromArray(p, i * 9); b.fromArray(p, i * 9 + 3); c.fromArray(p, i * 9 + 6);
    let u = rand(), v = rand();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    out[k * 3] = a.x + (b.x - a.x) * u + (c.x - a.x) * v;
    out[k * 3 + 1] = a.y + (b.y - a.y) * u + (c.y - a.y) * v;
    out[k * 3 + 2] = a.z + (b.z - a.z) * u + (c.z - a.z) * v;
  }
  return out;
}

/* Center a cloud and scale its largest half-extent to `size`, with an optional tilt. */
function fit(arr, size = 1.6, rx = 0, ry = 0, rz = 0) {
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
  for (let i = 0; i < arr.length; i += 3) box.expandByPoint(v.fromArray(arr, i));
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const k = size / (Math.max(s.x, s.y, s.z) / 2);
  for (let i = 0; i < arr.length; i += 3) v.fromArray(arr, i).sub(c).multiplyScalar(k).applyMatrix4(m).toArray(arr, i);
  return arr;
}

function fill(n, rand, fn) {
  const out = new Float32Array(n * 3), v = [0, 0, 0];
  for (let i = 0; i < n; i++) { fn(v, rand, i); out.set(v, i * 3); }
  return out;
}

const gauss = rand => (rand() + rand() + rand() - 1.5) / 1.5;

/* I. Pérola: a sphere with a faint inner halo. */
const pearl = (n, rand) => fill(n, rand, (v, r, i) => {
  const y = 1 - (2 * (i + 0.5)) / n, rad = Math.sqrt(1 - y * y), th = i * 2.39996;
  const k = r() < 0.86 ? 1.25 : 1.25 + 0.12 + r() * 0.35;
  v[0] = Math.cos(th) * rad * k; v[1] = y * k; v[2] = Math.sin(th) * rad * k;
});

/* II. Concha: conical spiral seashell (u around the tube, v along the spiral). */
const shell = (n, rand) => fit(fill(n, rand, (v, r) => {
  const u = r() * TAU, s = 1 - Math.sqrt(r()), t = s * TAU;
  const w = 0.2 * (1 - t / TAU) * (1 + Math.cos(u)) + 0.08;
  v[0] = w * Math.cos(2 * t); v[1] = w * Math.sin(2 * t); v[2] = t / TAU + 0.2 * (1 - t / TAU) * Math.sin(u);
}), 1.55, -1.1, 0.3, 0.4);

/* III. Maré: a rolling sea surface, tilted towards the camera. */
const tide = (n, rand) => fit(fill(n, rand, (v, r) => {
  const x = (r() - 0.5) * 4, z = (r() - 0.5) * 2.6;
  const fall = 1 - Math.pow(Math.abs(z) / 1.3, 3);
  v[0] = x; v[2] = z;
  v[1] = (0.28 * Math.sin(1.7 * x + 0.9 * z) + 0.14 * Math.sin(3.1 * z - 1.2 * x) + 0.06 * Math.sin(6 * x)) * fall;
}), 1.75, 0.55, 0, 0.05);

/* IV. Bosque: mushroom with a domed cap, radial gills and a stem. */
const forest = (n, rand) => fit(fill(n, rand, (v, r) => {
  const k = r(), phi = r() * TAU;
  if (k < 0.45) {
    const th = Math.acos(1 - r()) * 0.98, R = 1.3;
    v[0] = Math.sin(th) * R * Math.cos(phi); v[1] = 0.15 + Math.cos(th) * 0.8; v[2] = Math.sin(th) * R * Math.sin(phi);
  } else if (k < 0.75) {
    const g = Math.round(phi / TAU * 72) / 72 * TAU, rr = 0.24 + Math.sqrt(r()) * 1.04;
    v[0] = Math.cos(g) * rr; v[1] = 0.15 + (rr - 0.24) * 0.05; v[2] = Math.sin(g) * rr;
  } else {
    const y = r(), rr = 0.24 + 0.08 * Math.pow(1 - y, 2);
    v[0] = Math.cos(phi) * rr; v[1] = -1.4 + y * 1.55; v[2] = Math.sin(phi) * rr;
  }
}), 1.55, 0.35, 0, 0);

/* V. Brasa: a teardrop flame whose top splits into twisting tongues, with embers rising above. */
const ember = (n, rand) => fit(fill(n, rand, (v, r) => {
  if (r() < 0.06) {
    const t = r();
    v[0] = gauss(r) * 0.45 * (1 - t * 0.5); v[1] = 1.75 + t * 1.2; v[2] = gauss(r) * 0.45; return;
  }
  const body = t => (t < 0.24 ? Math.sqrt(1 - Math.pow(1 - t / 0.24, 2)) : Math.pow((1 - t) / 0.76, 1.25));
  let t;
  do t = r(); while (r() > body(t) * 0.9 + 0.1);   // more points where the flame is wider
  const th = r() * TAU, core = r() < 0.18 ? Math.sqrt(r()) * 0.7 : 1;
  const rad = 1.05 * body(t) * (1 + 0.5 * t * t * Math.sin(3 * th)) * core;
  const a = th + t * 2.2;
  v[0] = Math.cos(a) * rad; v[1] = -1.5 + t * 3.2; v[2] = Math.sin(a) * rad;
}), 1.6);

/* Shape list: hero star, six courses, closing star. */
export function makeShapes(n) {
  const rand = random(11);
  const star = sampleMesh(starGeometry(), n, rand);
  return [star, pearl(n, rand), shell(n, rand), tide(n, rand), forest(n, rand), ember(n, rand), sampleMesh(starGeometry(1.55, 0.45), n, rand)];
}
