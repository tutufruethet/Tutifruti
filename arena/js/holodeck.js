import * as THREE from 'three';

// The virtual arena: infinite grid floor, a corridor of portal frames, dust and a hologram guide.
// Lines are HDR (> 1) so only they reach the bloom threshold.

export const ACC = new THREE.Color('#cdff3a');
const FOG = new THREE.Color('#15132e');   // shadow/fog: deep blue-violet, never black
const SKY = new THREE.Color('#050507');
const LINE = new THREE.Color('#4a4a58');
const FOG_NEAR = 6, FOG_FAR = 62;

const SPACING = 7, ARCHES = 10, SPAN = SPACING * ARCHES;

const fogGLSL = /* glsl */`
  uniform vec3 uFog; uniform float uFogNear, uFogFar;
  vec3 fogMix(vec3 c, float d){ return mix(c, uFog, smoothstep(uFogNear, uFogFar, d)); }
`;

function shapeGeo(i) {
  switch (i) {
    case 0: return new THREE.IcosahedronGeometry(1.1, 1);              // zumbi: faceted skull-ish
    case 1: return new THREE.OctahedronGeometry(1.25, 0);              // templo: pyramid pair
    case 2: return new THREE.TorusKnotGeometry(0.72, 0.2, 96, 8, 2, 3); // montanha-russa: track
    case 3: return new THREE.TorusGeometry(0.95, 0.28, 8, 40);         // ritmo: ring
    case 4: return new THREE.BoxGeometry(1.4, 1.4, 1.4, 3, 3, 3);      // pvp: lattice
    default: return new THREE.SphereGeometry(1.1, 16, 10);             // fundo do mar: bubble
  }
}

export class Holodeck {
  constructor({ high }) {
    this.high = high;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(FOG, FOG_NEAR, FOG_FAR);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
    this.camera.position.set(0, 1.6, 0);
    this.mouse = new THREE.Vector2();
    this.mouseFloor = new THREE.Vector3(0, 0, -6);
    this.ray = new THREE.Raycaster();
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.z = 0;
    this.speed = 0;
    this.shape = 0; this.nextShape = 0; this.shapeScale = 1;
    this.holoX = 2.4; this.holoY = 1.9;
    this.holoZ = 8.5;
    this.focus = 1; // 1 while the experiences list is on screen, dimmer behind other text

    this.fogUniforms = { uFog: { value: FOG }, uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR } };
    this.buildSky();
    this.buildFloor();
    this.buildArches();
    this.buildDust();
    this.buildHolo();
  }

  buildSky() {
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(150, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { uTop: { value: SKY }, uHorizon: { value: FOG }, uAcc: { value: ACC } },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: `
          uniform vec3 uTop, uHorizon, uAcc; varying vec3 vDir;
          void main(){
            float y = vDir.y;
            vec3 c = mix(uHorizon, uTop, smoothstep(-.02, .45, y));
            c += uAcc * .05 * exp(-abs(y) * 30.);
            gl_FragColor = vec4(c, 1.);
          }`,
      }),
    );
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
  }

  buildFloor() {
    this.floorMat = new THREE.ShaderMaterial({
      extensions: { derivatives: true },
      uniforms: {
        ...this.fogUniforms,
        uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uMouse: { value: new THREE.Vector3() },
        uHolo: { value: new THREE.Vector3() }, uLine: { value: LINE }, uAcc: { value: ACC },
        uBase: { value: new THREE.Color('#09090c') }, uFocus: { value: 1 },
      },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        ${fogGLSL}
        uniform float uTime, uFocus; uniform vec3 uCam, uMouse, uHolo, uLine, uAcc, uBase; varying vec3 vW;
        float grid(vec2 p, float s, float w){
          vec2 q = p / s; vec2 g = abs(fract(q - .5) - .5) / (fwidth(q) * w);
          return 1. - min(min(g.x, g.y), 1.);
        }
        void main(){
          vec2 p = vW.xz;
          float d = distance(vW, uCam);
          float g1 = grid(p, 1., 1.), g4 = grid(p, 4., 1.6);
          float far = 1. - smoothstep(10., 45., d);
          vec3 c = uBase + uLine * (g1 * .22 * far + g4 * .7);
          // scan ring rolling out from the hologram
          float r = distance(p, uHolo.xz);
          float ring = exp(-pow(r - mod(uTime * 7., 46.), 2.) * .5) * (1. - smoothstep(10., 46., r));
          c += uAcc * ring * (g1 * 1.6 + g4 * 2.2 + .06) * uFocus;
          // the cursor lights the floor where it points
          vec2 m = p - uMouse.xz;
          float spot = exp(-dot(m, m) * .12);
          c += uAcc * spot * (g1 * 1.4 + g4 * 1.6 + .04);
          gl_FragColor = vec4(fogMix(c, d), 1.);
        }`,
    });
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 260).rotateX(-Math.PI / 2), this.floorMat);
    this.scene.add(this.floor);
  }

  buildArches() {
    // an open "∩" frame standing on the floor
    const w = 3.3, h = 4.6, t = 0.05;
    const frame = new THREE.Shape([
      [-w, 0], [-w + t, 0], [-w + t, h - t], [w - t, h - t], [w - t, 0], [w, 0], [w, h], [-w, h],
    ].map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(frame, { depth: 0.05, bevelEnabled: false });
    this.arches = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ fog: true }), ARCHES);
    this.arches.frustumCulled = false;
    const col = new THREE.Color();
    for (let i = 0; i < ARCHES; i++) {
      if (i % 5 === 2) col.copy(ACC).multiplyScalar(1.15); else col.copy(LINE).multiplyScalar(1.6);
      this.arches.setColorAt(i, col);
    }
    this.archM = new THREE.Matrix4();
    this.scene.add(this.arches);
  }

  buildDust() {
    const n = this.high ? 900 : 350;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = Math.random() * 9;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dustMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { ...this.fogUniforms, uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uPr: { value: 1 } },
      vertexShader: `
        uniform vec3 uCam; uniform float uTime, uPr; varying float vD;
        void main(){
          vec3 box = vec3(30., 9., 40.);
          vec3 p = position + vec3(sin(uTime*.2 + position.y)*.4, sin(uTime*.3 + position.x)*.3, 0.);
          p.xz = mod(p.xz - uCam.xz + box.xz * .5, box.xz) - box.xz * .5 + uCam.xz;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          vD = -mv.z;
          gl_PointSize = uPr * 22. / vD;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        ${fogGLSL}
        varying float vD;
        void main(){
          float a = smoothstep(.5, .1, length(gl_PointCoord - .5));
          gl_FragColor = vec4(vec3(.75) * a * (1. - smoothstep(uFogNear, uFogFar * .6, vD)), 1.);
        }`,
    });
    this.dust = new THREE.Points(g, this.dustMat);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
  }

  buildHolo() {
    this.holo = new THREE.Group();
    this.holoBody = new THREE.Group();
    this.holo.add(this.holoBody);
    this.wireMat = new THREE.LineBasicMaterial({ color: ACC.clone().multiplyScalar(2.2), fog: true });
    this.coreMat = new THREE.MeshBasicMaterial({ color: '#0a0a10', fog: true });
    this.shapes = [];
    this.setShapeMesh(0);

    const ringMat = this.ringMat = new THREE.MeshBasicMaterial({ color: ACC.clone().multiplyScalar(1.1), fog: true, side: THREE.DoubleSide });
    this.ring = new THREE.Group();
    [[1.45, 1.5], [2.3, 2.32]].forEach(([a, b]) => this.ring.add(new THREE.Mesh(new THREE.RingGeometry(a, b, 72).rotateX(-Math.PI / 2), ringMat)));
    this.ring.position.y = 0.01;
    this.scene.add(this.ring);

    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.45, 5, 48, 1, true),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uAcc: { value: ACC }, uFocus: { value: 1 } },
        vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: `uniform vec3 uAcc; uniform float uFocus; varying float vY; void main(){ gl_FragColor = vec4(uAcc * pow(1. - vY, 2.) * .07 * uFocus, 1.); }`,
      }),
    );
    this.beam.position.y = 2.5;
    this.ring.add(this.beam);
    this.scene.add(this.holo);
  }

  setShapeMesh(i) {
    if (!this.shapes[i]) {
      const geo = shapeGeo(i);
      const g = new THREE.Group();
      const core = new THREE.Mesh(geo, this.coreMat);
      core.scale.setScalar(0.97);
      g.add(core, new THREE.LineSegments(new THREE.WireframeGeometry(geo), this.wireMat));
      this.shapes[i] = g;
    }
    this.holoBody.clear();
    this.holoBody.add(this.shapes[i]);
    this.shape = i;
  }

  setShape(i) { this.nextShape = i; }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const narrow = w / h < 0.9;
    this.holoX = narrow ? 0 : 3.4;
    this.holoY = narrow ? 2.9 : 1.9;
    this.holoZ = narrow ? 12 : 8.5;
  }

  update(dt, t, { z, speed, pointer, dive, focus = 1 }) {
    const cam = this.camera;
    const k = 1 - Math.exp(-4 * dt);
    this.z += (z - this.z) * k;
    this.mouse.lerp(pointer, k);
    this.speed += (speed - this.speed) * k;
    this.focus += (focus - this.focus) * (1 - Math.exp(-2.5 * dt));
    const f = 0.14 + 0.86 * this.focus;
    this.wireMat.color.copy(ACC).multiplyScalar(2.2 * f);
    this.beam.material.uniforms.uFocus.value = f;
    this.ringMat.color.copy(ACC).multiplyScalar(1.1 * f);

    // the dive pulls the camera forward a little: you are being drawn in
    cam.position.set(this.mouse.x * 0.45, 1.6 + this.mouse.y * 0.18, this.z - dive * 3);
    cam.lookAt(this.mouse.x * 1.3, 1.45 + this.mouse.y * 0.5, cam.position.z - 10);
    cam.fov = 55 + Math.min(Math.abs(this.speed) * 0.9, 12);
    cam.updateProjectionMatrix();

    this.sky.position.copy(cam.position);
    this.floor.position.set(cam.position.x, 0, cam.position.z);

    // portal corridor that never ends
    const front = cam.position.z + 3;
    for (let i = 0; i < ARCHES; i++) {
      const zi = front - ((((front - i * SPACING) % SPAN) + SPAN) % SPAN);
      this.archM.makeTranslation(0, 0, zi);
      this.arches.setMatrixAt(i, this.archM);
    }
    this.arches.instanceMatrix.needsUpdate = true;

    // hologram: a guide that floats ahead of you
    if (this.nextShape !== this.shape) {
      this.shapeScale = Math.max(this.shapeScale - dt * 6, 0);
      if (this.shapeScale === 0) this.setShapeMesh(this.nextShape);
    } else this.shapeScale = Math.min(this.shapeScale + dt * 3, 1);
    const s = 1 - Math.pow(1 - this.shapeScale, 3);
    const hz = cam.position.z - this.holoZ;
    this.holo.position.set(this.holoX, this.holoY + Math.sin(t * 1.1) * 0.12, hz);
    this.holoBody.rotation.set(t * 0.21 + this.mouse.y * 0.4, t * 0.33 + this.mouse.x * 0.6, 0);
    this.holoBody.scale.setScalar(Math.max(s, 0.001));
    this.ring.position.set(this.holoX, 0.01, hz);
    this.ring.rotation.y = -t * 0.2;

    // where the cursor touches the floor
    this.ray.setFromCamera(this.mouse, cam);
    const hit = this.ray.ray.intersectPlane(this.floorPlane, new THREE.Vector3());
    if (hit && hit.distanceTo(cam.position) < 40) this.mouseFloor.lerp(hit, k);

    const u = this.floorMat.uniforms;
    u.uTime.value = t; u.uFocus.value = f; u.uCam.value.copy(cam.position); u.uMouse.value.copy(this.mouseFloor); u.uHolo.value.set(this.holoX, 0, hz);
    this.dustMat.uniforms.uCam.value.copy(cam.position);
    this.dustMat.uniforms.uTime.value = t;
  }
}
