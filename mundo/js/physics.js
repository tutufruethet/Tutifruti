// 2D arcade physics on the XZ plane: circles for everything, impulses between them.
export class Physics {
  constructor(radius) {
    this.radius = radius;
    this.statics = [];
    this.bodies = [];
  }

  addStatic(x, z, r) {
    this.statics.push({ x, z, r });
  }

  addBody(body) {
    Object.assign(body, { vx: 0, vz: 0, vy: 0, y: 0, ...body });
    this.bodies.push(body);
    return body;
  }

  step(dt, car) {
    for (const b of this.bodies) {
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      const f = Math.exp(-b.friction * dt);
      b.vx *= f;
      b.vz *= f;
      b.vy -= 30 * dt;
      b.y = Math.max(0, b.y + b.vy * dt);
      if (b.y === 0) b.vy = 0;
    }
    for (const b of this.bodies) this.collide(car, b);
    for (let i = 0; i < this.bodies.length; i++)
      for (let j = i + 1; j < this.bodies.length; j++) this.collide(this.bodies[i], this.bodies[j]);
    for (const s of this.statics) {
      this.collideStatic(car, s);
      for (const b of this.bodies) this.collideStatic(b, s);
    }
    for (const b of [car, ...this.bodies]) this.keepInside(b);
  }

  collide(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const min = a.r + b.r;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min || d2 === 0) return;
    if (a.y > (b.h ?? 2) || b.y > (a.h ?? 2)) return;
    const d = Math.sqrt(d2), nx = dx / d, nz = dz / d;
    const ia = 1 / a.m, ib = 1 / b.m;
    const push = (min - d) / (ia + ib);
    a.x -= nx * push * ia; a.z -= nz * push * ia;
    b.x += nx * push * ib; b.z += nz * push * ib;
    const vn = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
    if (vn >= 0) return;
    const j = -(1 + 0.35) * vn / (ia + ib);
    a.vx -= j * ia * nx; a.vz -= j * ia * nz;
    b.vx += j * ib * nx; b.vz += j * ib * nz;
    a.onHit?.(-vn, -nx, -nz);
    b.onHit?.(-vn, nx, nz);
  }

  collideStatic(b, s) {
    const dx = b.x - s.x, dz = b.z - s.z;
    const min = b.r + s.r;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min || d2 === 0) return;
    const d = Math.sqrt(d2), nx = dx / d, nz = dz / d;
    b.x = s.x + nx * min;
    b.z = s.z + nz * min;
    const vn = b.vx * nx + b.vz * nz;
    if (vn < 0) {
      b.vx -= 1.3 * vn * nx;
      b.vz -= 1.3 * vn * nz;
      b.onHit?.(-vn, nx, nz, true);
    }
  }

  keepInside(b) {
    const d = Math.hypot(b.x, b.z), max = this.radius - b.r;
    if (d <= max) return;
    const nx = b.x / d, nz = b.z / d;
    b.x = nx * max; b.z = nz * max;
    const vn = b.vx * nx + b.vz * nz;
    if (vn > 0) { b.vx -= 1.4 * vn * nx; b.vz -= 1.4 * vn * nz; }
  }
}
