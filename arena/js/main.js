import { reduce, fine, setLoad, finishLoad, onKick } from './ui.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const high = fine && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
if (reduce) document.body.classList.add('reduce');

const fonts = Promise.race([
  Promise.all(['500 40px "Instrument Sans"', '600 40px "Instrument Sans"', 'italic 40px "Instrument Serif"'].map(f => document.fonts.load(f))),
  new Promise(r => setTimeout(r, 2500)),
]);
setLoad(0.2);

let gl = null;
try { gl = document.createElement('canvas').getContext('webgl2'); } catch { /* no WebGL */ }
if (!gl) {
  document.body.classList.add('nogl');
  await fonts;
  await finishLoad();
  document.body.classList.add('live');
} else {
  await start();
}

async function start() {
  const THREE = await import('three');
  const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
  const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
  const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
  const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js');
  const { ShaderPass } = await import('three/addons/postprocessing/ShaderPass.js');
  const { World } = await import('./world.js');
  const { Player, CONTACT, RELEASE, RUN_AT } = await import('./player.js');
  const { createBall, BallPath, BALL_R } = await import('./ball.js');
  const { GOAL, PITCH } = await import('./turf.js');
  setLoad(0.45);
  await fonts; // the neon sign and the wall sign are drawn with the page fonts

  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const sst = x => { x = Math.min(Math.max(x, 0), 1); return x * x * x * (x * (x * 6 - 15) + 10); };

  /* ---------- renderer and scene ---------- */
  const canvas = $('#gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.75 : 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = high;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 900);
  const world = new World({ scene, renderer, high });
  setLoad(0.7);

  /* ---------- the kick ---------- */
  const SPOT = V(9, BALL_R, 1.2);
  const TARGET = V(PITCH.w / 2 + GOAL.d - 0.12, 1.5, -1.55);
  const FLIGHT = 0.9;
  const path = new BallPath(SPOT, TARGET, FLIGHT);
  const PLANT = V(SPOT.x - 0.45, 0, SPOT.z - 0.1);
  const FROM = V(SPOT.x - 3.7, 0, SPOT.z - 1.5);
  const player = new Player();
  const heading = Math.atan2(-(TARGET.z - SPOT.z), TARGET.x - SPOT.x) * 0.6;
  player.root.rotation.y = heading;
  const PLACE = SPOT.clone().add(V(-Math.cos(heading), 0, Math.sin(heading)).multiplyScalar(0.5)).setY(0);
  const route = { place: PLACE, from: FROM, plant: PLANT };
  scene.add(player.root);
  const ball = createBall();
  scene.add(ball);
  const ballPos = SPOT.clone(), lastBall = SPOT.clone(), dropFrom = V();
  const spinAxis = V(0, 0, -1);

  // rubber crumbs kicked up from the turf at the strike
  const CRUMBS = 70;
  const crumbVel = Array.from({ length: CRUMBS }, () => V(Math.random() * 1.2 + 0.4, Math.random() * 2.2 + 0.6, (Math.random() - 0.5) * 1.4));
  const crumbGeo = new THREE.BufferGeometry();
  crumbGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CRUMBS * 3), 3));
  const crumbs = new THREE.Points(crumbGeo, new THREE.PointsMaterial({ color: '#141414', size: 0.022 }));
  crumbs.frustumCulled = false;
  scene.add(crumbs);

  // s: seconds since the sequence started (null = after the goal, ball resting in the net)
  function updateKick(s, t) {
    player.update(s, t, route);
    const dt = s === null ? 99 : s - CONTACT;
    if (s !== null && s < RELEASE) {
      player.handsCenter(ballPos);                       // in his gloves
      dropFrom.copy(ballPos);
    } else if (s !== null && s < CONTACT) {
      // dropped onto the spot: falls, one small bounce, settles
      const k = s - RELEASE;
      ballPos.lerpVectors(dropFrom, SPOT, Math.min(k / 0.3, 1));
      const fall = Math.max(dropFrom.y - BALL_R, 0);
      const t1 = Math.sqrt(2 * fall / 9.8);
      ballPos.y = k < t1 ? dropFrom.y - 4.9 * k * k : BALL_R + Math.max(0, Math.sin(Math.min((k - t1) / 0.22, 1) * Math.PI)) * 0.04;
    } else path.at(dt, ballPos);
    ball.position.copy(ballPos);
    const moved = ballPos.distanceTo(lastBall);
    if (moved > 1e-4 && moved < 2 && dt > 0) ball.rotateOnWorldAxis(spinAxis, moved / BALL_R);
    lastBall.copy(ballPos);
    // the net bulges and swings back
    const after = dt - FLIGHT;
    world.netHit(1, TARGET, after > 0 && after < 4 ? 0.6 * Math.exp(-after * 3.2) * Math.cos(after * 11) : 0);
    const a = crumbGeo.attributes.position;
    crumbs.visible = dt > 0 && dt < 1.4;
    if (crumbs.visible) {
      for (let i = 0; i < CRUMBS; i++) {
        const v = crumbVel[i];
        a.setXYZ(i, SPOT.x - 0.15 + v.x * dt * 0.6, Math.max(0.01, 0.02 + v.y * dt - 4.9 * dt * dt), SPOT.z + v.z * dt * 0.6);
      }
      a.needsUpdate = true;
    }
  }

  /* ---------- camera: the opening shot ---------- */
  const LIGHTS0 = 0.3, SEQ0 = 0.2, KICK = SEQ0 + CONTACT, HIT = KICK + FLIGHT, CRANE0 = HIT + 0.35, END = CRANE0 + 3.6;
  const flightDir = path.at(FLIGHT * 0.6, V()).sub(path.at(FLIGHT * 0.4, V())).normalize();
  const tmp = V(), tmp2 = V(), lift = V(0, 0.32, 0.55);

  // follow the ball, then stop short of the goal and watch it hit the net
  function chase(dt, out) {
    path.at(Math.min(dt, FLIGHT * 0.62), out);
    return out.addScaledVector(flightDir, -3.2).add(lift);
  }
  // shot 1: low and close from the side while he sets the ball down (first reference photo);
  // shot 2: front-side as he steps back and runs in (second reference photo); then the chase
  const A0 = V(SPOT.x + 0.4, 0.75, SPOT.z + 3.1), A1 = V(SPOT.x + 1.6, 0.6, SPOT.z + 3.4), A2 = V(SPOT.x + 0.9, 0.42, SPOT.z + 2.5);
  const L0 = V(SPOT.x - 0.45, 0.72, SPOT.z), L1 = V(SPOT.x - 1.8, 0.9, SPOT.z - 0.8), L2 = V(SPOT.x - 1.2, 0.65, SPOT.z - 0.4);
  function introPose(it, pos, look) {
    if (it < KICK) {
      const a = sst((it - 1.6) / 1.8), b = sst((it - (SEQ0 + RUN_AT + 0.25)) / 0.6);
      pos.lerpVectors(A0, A1, a).lerp(A2, b);
      look.lerpVectors(L0, L1, a).lerp(L2, b);
      return;
    }
    const dt = it - KICK;
    if (it < HIT) {
      chase(dt, pos).lerp(A2, 1 - ss(0, 0.3, dt));
      path.at(dt, look).lerp(TARGET, ss(FLIGHT * 0.5, FLIGHT, dt) * 0.5);
      return;
    }
    const coast = Math.min(it, CRANE0) - HIT;
    const p1 = chase(FLIGHT, tmp).addScaledVector(flightDir, (1 - Math.exp(-coast * 5)) * 0.4);
    if (it < CRANE0) { pos.copy(p1); look.copy(TARGET); return; }
    const k = (it - CRANE0) / (END - CRANE0);
    const K = keys().hero;
    pos.lerpVectors(p1, K.p, sst(k));
    pos.y += Math.sin(Math.PI * sst(k)) * 10;
    look.lerpVectors(TARGET, K.t, sst(k * 1.15));
  }

  /* ---------- camera: scroll through the complex ---------- */
  const narrow = () => innerWidth / innerHeight < 0.9;
  let K = null;
  function keys() {
    if (K) return K;
    const n = narrow();
    // phone: pull back so each place fits the tall frame
    const k = (p, t, m = 1.35) => ({ p: n ? t.clone().add(p.clone().sub(t).multiplyScalar(m)) : p, t });
    K = {
      hero: k(V(-30, 24, -36), V(2, 1, 8), 1.3),
      arena: k(V(-21.5, 1.7, 11.5), V(8, 1.6, -6), 1.3),
      bar: k(V(9.5, 2.1, 33.5), V(-2, 2.8, 21.5), 1.35),
      deck: k(V(-2.1, 4.95, 18.1), V(8, 0.4, -3), 1.2),
      pool: k(V(-15, 4.2, 43), V(2, 0.3, 31), 1.3),
      party: k(V(-21.5, 2.6, 29.5), V(-37, 1.6, 25), 1.35),
      end: k(V(40, 70, 78), V(-4, 0, 10), 1.1),
    };
    return K;
  }
  const camSecs = $$('[data-cam]');
  const names = camSecs.map(s => s.dataset.cam);
  let anchors = [];
  function measure() {
    K = null;
    anchors = camSecs.map((s, i) => (i === 0 ? 0 : Math.max(s.getBoundingClientRect().top + scrollY - innerHeight * 0.35, 1)));
  }
  function scrollPose(y, t, pos, look) {
    const Ks = keys();
    let i = 0;
    while (i < anchors.length - 2 && y >= anchors[i + 1]) i++;
    const u = (y - anchors[i]) / Math.max(anchors[i + 1] - anchors[i], 1);
    const e = sst(ss(0.12, 0.92, u));
    const a = Ks[names[i]], b = Ks[names[i + 1]];
    pos.lerpVectors(a.p, b.p, e);
    pos.y += Math.sin(Math.PI * e) * Math.min(a.p.distanceTo(b.p) * 0.22, 14);
    look.lerpVectors(a.t, b.t, e);
    if (!reduce) { pos.x += Math.sin(t * 0.15) * 0.5; pos.z += Math.cos(t * 0.13) * 0.5; } // a resting frame still breathes
  }

  /* ---------- post: bloom only on what emits light, then grade ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (high) composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.55, 1));
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2() }, uFade: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uTime, uFade; uniform vec2 uRes; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        vec2 d = vUv - .5;
        c *= smoothstep(1.05, .25, length(d * vec2(1., .9)));
        c += (hash(vUv * uRes + fract(uTime) * 61.) - .5) * .045;
        gl_FragColor = vec4(c * uFade, 1.);
      }`,
  });
  composer.addPass(grade);

  let dirty = true;
  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = narrow() ? 58 : 40;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth, innerHeight);
    grade.uniforms.uRes.value.set(innerWidth, innerHeight).multiplyScalar(renderer.getPixelRatio());
    measure();
    dirty = true;
  }

  /* ---------- state ---------- */
  const pointer = new THREE.Vector2(), sway = new THREE.Vector2();
  let intro = reduce ? END : 0, introDone = reduce, fade = reduce ? 1 : 0, seq = null, kickAt = -99, clock = 0;
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    dirty = true;
  }, { passive: true });
  addEventListener('scroll', () => { dirty = true; }, { passive: true });
  addEventListener('resize', resize);
  resize();

  function finishIntro() {
    if (introDone) return;
    introDone = true;
    intro = END;
    seq = 99;
    document.body.classList.remove('intro');
    document.body.classList.add('live');
    measure();
  }
  $('[data-skip]').addEventListener('click', finishIntro);
  addEventListener('keydown', e => { if (e.key === 'Escape') finishIntro(); });

  // replay the kick when the arena comes into view, or from the button
  const replay = () => { if (introDone && clock - kickAt > 6) { kickAt = clock; seq = 0; dirty = true; } };
  onKick(replay);
  new IntersectionObserver(es => es.forEach(e => e.isIntersecting && replay()), { threshold: 0.45 }).observe($('#arena'));

  /* ---------- frame ---------- */
  const pos = V(), look = V();
  let prev = performance.now();
  function frame(forced) {
    const now = performance.now();
    const dt = forced ?? Math.min((now - prev) / 1000, 1 / 20);
    prev = now;
    if (reduce && !dirty) return;
    dirty = false;
    clock += reduce ? 0 : dt;
    const t = reduce ? 6 : clock;

    if (!introDone) {
      intro += dt;
      fade = Math.min(fade + dt * 0.8, 1);
      if (intro >= END) finishIntro();
    } else {
      fade = 1;
      if (seq !== null && seq < 99) seq += dt;
    }

    world.setLights(introDone ? 99 : intro - LIGHTS0);
    updateKick(introDone ? (seq >= 99 ? null : seq) : Math.max(intro - SEQ0, 0), t);

    if (!introDone) introPose(intro, pos, look);
    else {
      scrollPose(scrollY, t, pos, look);
      sway.lerp(pointer, 1 - Math.exp(-3 * dt));
      tmp.subVectors(look, pos).normalize();
      tmp2.crossVectors(tmp, camera.up).normalize();
      pos.addScaledVector(tmp2, sway.x * 0.6).addScaledVector(camera.up, sway.y * 0.35);
    }
    camera.position.copy(pos);
    camera.lookAt(look);

    world.update(t, { camera, ball: ballPos, focus: introDone && seq >= 99 ? look : SPOT });
    grade.uniforms.uTime.value = t;
    grade.uniforms.uFade.value = fade;
    composer.render(dt);
  }

  // test hook: stop the loop and drive time by hand (software GL is too slow for real time)
  if (location.hash === '#debug') window.__arena = {
    stop() { renderer.setAnimationLoop(null); },
    step(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) { dirty = true; frame(dt); } },
    at(s) { intro = s; fade = 1; dirty = true; frame(0); },
    skip: finishIntro,
    get intro() { return intro; },
  };

  setLoad(0.95);
  frame(0);
  await finishLoad();
  document.body.classList.add(introDone ? 'live' : 'intro');
  prev = performance.now();
  renderer.setAnimationLoop(() => frame());
}
