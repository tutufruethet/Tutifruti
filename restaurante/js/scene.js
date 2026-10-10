import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { starGeometry, makeShapes, random } from './shapes.js';

/* One fixed canvas behind the page. `state` is written by main.js from scroll and pointer:
   hero (0 → 1 leaving the hero), toMenu (0 → 1 until the menu), shape (0..6 along the menu),
   after (0 → 1 past the menu), mx/my (pointer, -1..1), scroll (px). */

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function initScene(canvas, state, { high, reduce }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: high, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.75 : 1.5));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x000000, 1);   // black here; the page ink shows through via CSS screen blending
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  /* Studio environment: warm room, dark floor, bright softboxes. Each gold facet mirrors a different
     part of it, so the star glints as it turns. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float t = smoothstep(-.35, .9, vP.y); gl_FragColor = vec4(mix(vec3(.012, .009, .007), vec3(.5, .38, .26), t * t), 1.); }',
  })));
  [[0, 7, 1, 12, 3, 9], [-7, 1.5, 3, 2.5, 9, 6], [7, 0, 2, 2, 7, 4], [3, -1, 7, 8, 1.2, 3], [-4, 4, -6, 6, 5, 2.5], [6, 4, -4, 3, 3, 5]].forEach(([x, y, z, w, h, k]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.88, 0.72).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); room.add(m);
  });
  scene.environment = pmrem.fromScene(room, 0.03).texture;
  scene.environmentIntensity = 1.25;

  const group = new THREE.Group();
  scene.add(group);

  /* Hero: the gold star. */
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b97f, metalness: 1, roughness: 0.24, flatShading: true, transparent: true });
  const star = new THREE.Mesh(starGeometry(), gold);
  group.add(star);
  const lamp = new THREE.PointLight(0xffd9a8, 30, 14, 1.6);
  lamp.position.set(2, 2, 3);
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2);
  key.position.set(-3, 4, 5);
  scene.add(lamp, key);

  /* Soft halo behind the star: a camera-facing quad outside the rotating group (no real light). */
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uA: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'varying vec2 vUv; uniform float uA; void main(){ float d = length(vUv - .5) * 2.; float a = exp(-d * d * 7.) * .11 * uA; gl_FragColor = vec4(vec3(1., .74, .45) * a, 1.); }',
  }));
  scene.add(halo);

  /* Course cloud: morphs between shape i and i+1. */
  const N = high ? 16000 : 7000;
  const shapes = makeShapes(N);
  const rand = random(3);
  const geo = new THREE.BufferGeometry();
  const from = new THREE.BufferAttribute(shapes[0].slice(), 3), to = new THREE.BufferAttribute(shapes[1].slice(), 3);
  geo.setAttribute('position', new THREE.BufferAttribute(shapes[0].slice(), 3));
  geo.setAttribute('aFrom', from);
  geo.setAttribute('aTo', to);
  geo.setAttribute('aRand', new THREE.BufferAttribute(Float32Array.from({ length: N }, rand), 1));
  const pointsMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uMix: { value: 0 }, uTime: { value: 0 }, uAlpha: { value: 0 }, uSize: { value: high ? 26 : 30 }, uPixel: { value: renderer.getPixelRatio() }, uSpread: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec3 aFrom; attribute vec3 aTo; attribute float aRand;
      uniform float uMix, uTime, uSize, uPixel, uSpread, uAlpha;
      varying float vA; varying float vGold;
      void main(){
        float t = clamp(uMix * 1.5 - aRand * .5, 0., 1.);
        t = t * t * (3. - 2. * t);
        vec3 p = mix(aFrom, aTo, t);
        vec3 dir = normalize(vec3(sin(aRand * 91.7), cos(aRand * 47.3), sin(aRand * 13.1 + 1.)) + 1e-4);
        p += dir * sin(3.14159 * t) * (.5 + aRand) * uSpread;
        p += .022 * vec3(sin(uTime * .8 + aRand * 40.), cos(uTime * .7 + aRand * 30.), sin(uTime * .6 + aRand * 20.));
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        float tw = .6 + .4 * sin(uTime * 1.7 + aRand * 60.);
        gl_PointSize = uSize * uPixel * (.45 + aRand * .7) * tw / -mv.z;
        vGold = step(.92, aRand);
        vA = uAlpha * (.4 + .6 * tw);
      }`,
    fragmentShader: /* glsl */`
      varying float vA; varying float vGold;
      void main(){
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, 0., d); a *= a;
        vec3 c = mix(vec3(.93, .89, .82) * .55, vec3(1., .74, .42) * 2.6, vGold);
        gl_FragColor = vec4(c * a * vA, 1.);
      }`,
  });
  const cloud = new THREE.Points(geo, pointsMat);
  cloud.frustumCulled = false;
  group.add(cloud);

  /* Dust: a slow field of far stars with parallax. */
  const D = high ? 1400 : 600;
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(Float32Array.from({ length: D * 3 }, (_, i) => (rand() - 0.5) * (i % 3 === 2 ? 14 : 22)), 3)),
    new THREE.PointsMaterial({ color: 0xcfc3ae, size: 0.022, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.position.z = -4;
  scene.add(dust);

  /* Post: bloom only on HDR values (gold sparks, star highlights). */
  let composer = null;
  if (high) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.55, 1));
    composer.addPass(new OutputPass());
  }

  let seg = 0;
  const setSegment = i => {
    if (i === seg) return;
    seg = i;
    from.array.set(shapes[i]); to.array.set(shapes[Math.min(i + 1, shapes.length - 1)]);
    from.needsUpdate = to.needsUpdate = true;
  };

  /* Layout per stage: where the object sits on screen (in world units at z = 0). */
  const view = { w: 1, h: 1 };
  const layout = stage => {
    const narrow = innerWidth < 760;
    // after the menu the star opens up past the screen edges and becomes the night sky behind the text
    if (narrow) return [[0, view.h * 0.22, 0.62], [0, view.h * 0.36, 0.52], [0, 0, 2.2]][stage];
    return [[view.w * 0.4, -0.05, 0.92], [view.w * 0.42, 0, 0.92], [0, 0, 2.6]][stage];
  };

  const live = { hero: 0, shape: 0, x: 0, y: 0, s: 1, mx: 0, my: 0, after: 0 };
  let first = true;

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    composer?.setSize(innerWidth, innerHeight);
    view.h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    view.w = view.h * camera.aspect;
  }
  resize();
  addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let time = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 1 / 20);
    if (!reduce) time += dt;
    const k = first || reduce ? 1e3 : 1;
    first = false;

    live.hero = damp(live.hero, state.hero, 5 * k, dt);
    live.shape = damp(live.shape, state.shape, 4 * k, dt);
    live.after = damp(live.after, state.after, 3 * k, dt);
    live.mx = damp(live.mx, state.mx, 3 * k, dt);
    live.my = damp(live.my, state.my, 3 * k, dt);

    const a = layout(0), b = layout(1), c = layout(2);
    const m = smooth(0, 1, state.toMenu), n = live.after;
    const tx = a[0] + (b[0] - a[0]) * m + (c[0] - b[0]) * n;
    const ty = a[1] + (b[1] - a[1]) * m + (c[1] - b[1]) * n;
    const ts = a[2] + (b[2] - a[2]) * m + (c[2] - b[2]) * n;
    live.x = damp(live.x, tx, 4 * k, dt); live.y = damp(live.y, ty, 4 * k, dt); live.s = damp(live.s, ts, 4 * k, dt);
    group.position.set(live.x, live.y, 0);
    group.scale.setScalar(live.s);

    /* Rotation: slow spin, cursor tilt, plus extra spin while the star dissolves. */
    group.rotation.y = time * 0.18 + live.mx * 0.35 + live.hero * 1.2 + live.shape * 0.5;
    group.rotation.x = -live.my * 0.25 + Math.sin(time * 0.3) * 0.06;
    star.rotation.z = Math.sin(time * 0.25) * 0.12;
    cloud.rotation.z = star.rotation.z;

    /* Star → particles. */
    const h = live.hero;
    gold.opacity = 1 - smooth(0.15, 0.7, h);
    star.visible = gold.opacity > 0.01;
    star.scale.setScalar(1 + h * 0.15);
    halo.material.uniforms.uA.value = 1 - smooth(0, 0.8, h);
    halo.visible = h < 0.99;
    halo.position.set(live.x, live.y, -1.5);
    halo.scale.setScalar(live.s);

    const s = Math.max(0, Math.min(6, live.shape)), i = Math.min(5, Math.floor(s));
    setSegment(i);
    pointsMat.uniforms.uMix.value = smooth(0.2, 0.8, s - i);
    pointsMat.uniforms.uTime.value = time;
    pointsMat.uniforms.uSpread.value = reduce ? 0 : 0.7;
    pointsMat.uniforms.uAlpha.value = smooth(0.2, 0.75, h) * (0.32 + 0.68 * smooth(0.3, 1, s)) * (1 - 0.88 * n);

    lamp.position.set(live.x + live.mx * 4, live.y - live.my * 3 + 1, 3);
    dust.position.x = -live.mx * 0.4;
    dust.position.y = -live.my * 0.3 + state.scroll * 0.0003;
    dust.rotation.z = time * 0.01;

    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(frame);
  return { renderer };
}
