import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { NOISE } from './glsl.js';

// WorldPass: desenha a cena atual. Na troca de escala, desenha as duas em texturas
// e mistura num dissolve de ruído que nasce do centro, com a borda acesa no acento.
const MIX_FS = /* glsl */`
#define OCTAVES 3
uniform sampler2D tA, tB; uniform float uMix, uAspect, uTime; uniform vec3 uEdge;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 c = vUv - .5; c.x *= uAspect;
  float n = fbm(vec3(c * 4.5, uTime * .15)) * .35 + length(c) * .9;
  float th = uMix * 1.9 - .45;
  float m = smoothstep(th - .012, th + .012, n);
  vec2 ua = .5 + (vUv - .5) * (1. - uMix * .12);
  vec2 ub = .5 + (vUv - .5) * (1. + (1. - uMix) * .18);
  vec3 col = mix(texture2D(tB, ub).rgb, texture2D(tA, ua).rgb, m);
  float e = 1. - smoothstep(0., .014, abs(n - th));
  col += uEdge * e * (1. - uMix * .4);
  gl_FragColor = vec4(col, 1.);
}`;
const QUAD_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

export class WorldPass extends Pass {
  constructor(edge, samples = 0) {
    super();
    this.needsSwap = false;
    this.a = null; this.b = null; this.mix = 0;
    const o = { type: THREE.HalfFloatType, samples };
    this.rtA = new THREE.WebGLRenderTarget(1, 1, o);
    this.rtB = new THREE.WebGLRenderTarget(1, 1, o);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VS, fragmentShader: MIX_FS, depthTest: false, depthWrite: false,
      uniforms: { tA: { value: this.rtA.texture }, tB: { value: this.rtB.texture }, uMix: { value: 0 }, uAspect: { value: 1 }, uTime: { value: 0 }, uEdge: { value: edge } },
    });
    this.quad = new FullScreenQuad(this.mat);
  }
  setSize(w, h) { this.rtA.setSize(w, h); this.rtB.setSize(w, h); this.mat.uniforms.uAspect.value = w / h; }
  render(renderer, writeBuffer, readBuffer) {
    const one = !this.b ? this.a : this.mix >= 1 ? this.b : this.mix <= 0 ? this.a : null;
    if (one) { renderer.setRenderTarget(readBuffer); renderer.render(one.scene, one.camera); return; }
    renderer.setRenderTarget(this.rtA); renderer.render(this.a.scene, this.a.camera);
    renderer.setRenderTarget(this.rtB); renderer.render(this.b.scene, this.b.camera);
    this.mat.uniforms.uMix.value = this.mix;
    this.mat.uniforms.uTime.value = performance.now() / 1000;
    renderer.setRenderTarget(readBuffer);
    this.quad.render(renderer);
  }
}

// Composição final única para todas as cenas: aberração nas bordas, brilhos de canto, vinheta e grão.
export const FinalShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 1 }, uAccent: { value: new THREE.Color() }, uPaper: { value: new THREE.Color() } },
  vertexShader: QUAD_VS,
  fragmentShader: /* glsl */`
uniform sampler2D tDiffuse; uniform float uTime, uAspect; uniform vec3 uAccent, uPaper;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 c = vUv - .5; float d = dot(c, c);
  vec2 off = c * d * .012;
  vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
  vec2 asp = vec2(uAspect, 1.);
  vec2 p1 = vec2(1.02 + .05 * sin(uTime * .13), 1.04 + .04 * cos(uTime * .1));
  vec2 p2 = vec2(-.04 + .05 * cos(uTime * .09), -.06 + .04 * sin(uTime * .12));
  col += uAccent * exp(-length((vUv - p1) * asp) * 3.4) * .035;
  col += uPaper * exp(-length((vUv - p2) * asp) * 3.6) * .035;
  col *= 1. - smoothstep(.12, .62, d) * .55;
  col += (h(vUv * 917. + fract(uTime) * 31.) - .5) * .008;
  gl_FragColor = vec4(col, 1.);
}`,
};
