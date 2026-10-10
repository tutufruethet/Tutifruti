import * as THREE from 'three';

// A society ball and its flight. The panels are drawn in the shader: the 32 cells of a
// truncated icosahedron are the 12 icosahedron vertices (black pentagons) plus its 20
// face centers (white hexagons); the seam is where the two nearest cells tie.

export const BALL_R = 0.11;
export const G = -9.8;

function cellCenters() {
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const pos = ico.attributes.position;
  const verts = [], faces = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    if (!verts.some(u => u.distanceTo(v) < 1e-3)) verts.push(v.clone());
  }
  for (let i = 0; i < pos.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    faces.push(a.add(b).add(c).normalize());
  }
  return { verts, faces };
}

// default: a white match ball; the logo's ball is gold with black pentagons
export function createBall({ hex = [0.92, 0.92, 0.9], pent = [0.025, 0.025, 0.025], metalness = 0, roughness = 0.42, envMap = null } = {}) {
  const { verts, faces } = cellCenters();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness, metalness, envMap });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uPent = { value: verts };
    sh.uniforms.uHex = { value: faces };
    sh.uniforms.uHexCol = { value: new THREE.Vector3(...hex) };
    sh.uniforms.uPentCol = { value: new THREE.Vector3(...pent) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nuniform vec3 uPent[12];\nuniform vec3 uHex[20];\nuniform vec3 uHexCol, uPentCol;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 n = normalize(vObj);
        float b1 = -2., b2 = -2.; bool pent = false;
        for (int i = 0; i < 12; i++) { float d = dot(n, uPent[i]); if (d > b1) { b2 = b1; b1 = d; pent = true; } else if (d > b2) b2 = d; }
        for (int i = 0; i < 20; i++) { float d = dot(n, uHex[i]); if (d > b1) { b2 = b1; b1 = d; pent = false; } else if (d > b2) b2 = d; }
        float seam = smoothstep(.004, .016, b1 - b2);
        vec3 panel = pent ? uPentCol : uHexCol;
        diffuseColor.rgb = panel * mix(.25, 1., seam);`);
  };
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 48, 24), mat);
  mesh.castShadow = true;
  return mesh;
}

// Flight from the spot to a point in the net, in `flight` seconds, then a damped drop.
export class BallPath {
  constructor(spot, target, flight) {
    this.spot = spot.clone();
    this.target = target.clone();
    this.flight = flight;
    this.vel = target.clone().sub(spot).sub(new THREE.Vector3(0, 0.5 * G * flight * flight, 0)).divideScalar(flight);
    this.curve = new THREE.Vector3(0, 0, -1.2); // a little side spin bending it toward the corner
  }

  // where the ball is `dt` seconds after the kick (negative = still on the spot)
  at(dt, out = new THREE.Vector3()) {
    if (dt <= 0) return out.copy(this.spot);
    if (dt <= this.flight) {
      const k = dt / this.flight;
      out.copy(this.spot).addScaledVector(this.vel, dt);
      out.y += 0.5 * G * dt * dt;
      out.addScaledVector(this.curve, k * (k - 1) * 1.6); // zero at both ends, bows in between
      return out;
    }
    // into the net: pushed back a little, then drops and bounces on the turf
    const t = dt - this.flight;
    out.copy(this.target);
    out.x += 0.32 * (1 - Math.exp(-t * 5));
    out.z += 0.25 * (1 - Math.exp(-t * 2));
    let y = this.target.y, vy = -0.6, left = t;
    const step = 1 / 120;
    while (left > 0) {
      const h = Math.min(step, left);
      vy += G * h; y += vy * h; left -= h;
      if (y < BALL_R) { y = BALL_R; vy = Math.abs(vy) * 0.45; if (vy < 0.3) vy = 0; }
    }
    out.y = y;
    return out;
  }

  speed(dt) {
    if (dt <= 0) return 0;
    if (dt <= this.flight) return this.vel.length();
    return 3 * Math.exp(-(dt - this.flight) * 1.5);
  }
}
