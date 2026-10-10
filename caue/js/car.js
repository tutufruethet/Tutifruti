import * as THREE from 'three';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export class Car {
  constructor(scene) {
    // physics body (read by Physics): circle on XZ + height for jumps
    Object.assign(this, { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, r: 1.3, m: 4, h: 1.7, ground: 0, lastGround: 0 });
    this.heading = 0;
    this.steer = 0;
    this.speed = 0;
    this.lateral = 0;
    this.accel = 0;
    this.grounded = true;
    this.jumpQueued = false;
    this.landing = 0;
    this.shake = 0;
    this.antenna = { a: 0, v: 0 };

    const mat = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    const paint = mat('#ffc61a'), white = mat('#f6f4ea'), ink = mat('#132018'), rubber = mat('#1d2a22'), stripe = mat('#1fbf5b');
    this.lightMat = new THREE.MeshLambertMaterial({ color: '#ffe7a3', emissive: '#ffd36b', emissiveIntensity: 2 });
    this.tailMat = new THREE.MeshLambertMaterial({ color: '#ff4d6d', emissive: '#ff2d55', emissiveIntensity: 1.5 });

    this.root = new THREE.Group();
    this.chassis = new THREE.Group();
    this.chassis.position.y = 0.62;
    this.root.add(this.chassis);

    const c = this.chassis;
    c.add(box(1.9, 0.55, 3.4, paint, 0, 0.1, 0));
    c.add(box(1.94, 0.18, 0.5, ink, 0, -0.1, 1.62));
    c.add(box(1.94, 0.18, 0.5, ink, 0, -0.1, -1.62));
    c.add(box(0.5, 0.02, 1.2, stripe, 0, 0.385, 0.95));
    c.add(box(0.5, 0.02, 1.3, stripe, 0, 1.075, -0.3));
    for (const x of [-0.96, 0.96]) c.add(box(0.02, 0.22, 2.2, stripe, x, 0.12, 0.2));
    c.add(box(1.62, 0.62, 1.7, white, 0, 0.68, -0.3));
    c.add(box(1.5, 0.42, 0.06, ink, 0, 0.7, 0.56));
    c.add(box(1.5, 0.38, 0.06, ink, 0, 0.7, -1.16));
    c.add(box(1.64, 0.36, 1.2, ink, 0, 0.72, -0.3));
    c.add(box(1.7, 0.08, 1.5, ink, 0, 1.03, -0.3));
    for (const x of [-0.6, -0.2, 0.2, 0.6]) c.add(box(0.22, 0.14, 0.14, this.lightMat, x, 1.12, 0.38));
    for (const x of [-0.68, 0.68]) {
      c.add(box(0.42, 0.2, 0.08, this.lightMat, x, 0.18, 1.71));
      c.add(box(0.36, 0.16, 0.08, this.tailMat, x, 0.2, -1.71));
    }

    this.antennaPivot = new THREE.Group();
    this.antennaPivot.position.set(0.62, 1.07, -0.9);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 5), ink);
    stick.position.y = 0.55;
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), mat('#1fbf5b'));
    ball.position.y = 1.12;
    this.antennaPivot.add(stick, ball);
    c.add(this.antennaPivot);

    this.wheels = [];
    const tire = new THREE.CylinderGeometry(0.46, 0.46, 0.42, 10).rotateZ(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(0.2, 0.2, 0.44, 6).rotateZ(Math.PI / 2);
    for (const [x, z] of [[0.98, 1.15], [-0.98, 1.15], [0.98, -1.15], [-0.98, -1.15]]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.46, z);
      const spin = new THREE.Group();
      const t = new THREE.Mesh(tire, rubber); t.castShadow = true;
      spin.add(t, new THREE.Mesh(hub, white));
      pivot.add(spin);
      this.root.add(pivot);
      this.wheels.push({ pivot, spin, front: z > 0, x, z });
    }

    this.spot = new THREE.SpotLight('#ffe2a8', 0, 34, 0.55, 0.7, 1.1);
    this.spot.position.set(0, 0.5, 1.6);
    this.spot.target.position.set(0, -0.6, 9);
    this.chassis.add(this.spot, this.spot.target);

    scene.add(this.root);
  }

  onHit(impact) {
    this.shake = Math.max(this.shake, Math.min(impact * 0.025, 0.5));
  }

  jump() {
    if (this.grounded) this.jumpQueued = true;
  }

  reset(x, z, heading = 0) {
    Object.assign(this, { x, z, y: 0, vx: 0, vz: 0, vy: 0, heading, speed: 0, lateral: 0, ground: 0, lastGround: 0, grounded: true });
  }

  rearWheels() {
    return this.wheels.filter(w => !w.front).map(w => w.spin.getWorldPosition(new THREE.Vector3()));
  }

  update(dt, input, night) {
    let h = this.heading;
    let fx = Math.sin(h), fz = Math.cos(h), lx = Math.cos(h), lz = -Math.sin(h);
    let sF = this.vx * fx + this.vz * fz;
    let sL = this.vx * lx + this.vz * lz;
    const thr = input.throttle, boost = input.boost;
    const prev = sF;

    if (this.grounded) {
      if (thr > 0) sF += (sF < -0.5 ? 42 : 24 * (boost ? 1.7 : 1)) * thr * dt;
      else if (thr < 0) sF += (sF > 0.5 ? -42 : -18) * -thr * dt;
      else sF *= Math.exp(-1.3 * dt);
      sL *= Math.exp(-6.5 * dt);
    }
    sF = clamp(sF, -8, boost ? 25 : 16);

    this.steer = damp(this.steer, input.steer, 9, dt);
    const turn = clamp(sF / 5, -1, 1) * 2.5 * (1 - Math.min(Math.abs(sF), 25) / 50);
    h += this.steer * turn * dt * (this.grounded ? 1 : 0.35);
    this.heading = h;

    fx = Math.sin(h); fz = Math.cos(h); lx = Math.cos(h); lz = -Math.sin(h);
    this.vx = fx * sF + lx * sL;
    this.vz = fz * sF + lz * sL;
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // `ground` is the floor height under the car (ramps, the pool). Riding up a ramp
    // turns the slope into vertical speed, so the car takes off at the crest.
    const g = this.ground;
    if (this.jumpQueued) { this.vy = 8.5; this.jumpQueued = false; }
    this.vy -= 28 * dt;
    this.y += this.vy * dt;
    const wasAir = !this.grounded;
    if (this.y <= g) {
      if (wasAir && this.vy < -6) this.landing = Math.min(-this.vy / 12, 1);
      this.vy = wasAir ? 0 : clamp((g - this.lastGround) / Math.max(dt, 1e-4), 0, 14);
      this.y = g; this.grounded = true;
    } else this.grounded = false;
    this.lastGround = g;

    this.speed = sF;
    this.lateral = sL;
    this.accel = damp(this.accel, (sF - prev) / Math.max(dt, 1e-4), 6, dt);

    // visuals
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = h;
    const pitch = clamp(-this.accel * 0.006, -0.1, 0.1) + this.landing * 0.08;
    const roll = clamp(this.steer * turn * Math.abs(sF) * 0.012, -0.12, 0.12);
    this.chassis.rotation.x = damp(this.chassis.rotation.x, pitch, 8, dt);
    this.chassis.rotation.z = damp(this.chassis.rotation.z, roll, 8, dt);
    this.chassis.position.y = damp(this.chassis.position.y, 0.62 - this.landing * 0.18, 12, dt);
    this.landing = damp(this.landing, 0, 6, dt);
    for (const w of this.wheels) {
      w.spin.rotation.x += (sF * dt) / 0.46;
      if (w.front) w.pivot.rotation.y = this.steer * 0.45;
    }
    const a = this.antenna;
    a.v += (-a.a * 90 - a.v * 7 - this.accel * 0.05 * 60) * dt;
    a.a += a.v * dt;
    this.antennaPivot.rotation.x = clamp(a.a, -0.6, 0.6);

    this.lightMat.emissiveIntensity = 1.4 + night * 3;
    this.spot.intensity = night * 70;
    this.shake = damp(this.shake, 0, 6, dt);
  }
}
