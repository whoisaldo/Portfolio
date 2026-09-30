// src/three/drift/smoke.js: tyre smoke.
//
// Out of src/lib/drift-scene.js so the drift smokes the same over the plate
// and in the live city. Instanced quads billboarded in the vertex shader,
// each with its own birth time, life, velocity and size: it rises as it
// ages, expands, fades. One draw, a ring of 260 puffs, nothing allocated
// per frame.
import * as THREE from "three";

const SMOKE_MAX = 260;
const SMOKE_VERT = /* glsl */ `
  attribute vec3 iPos;
  attribute vec3 iVel;
  attribute float iBorn;
  attribute float iLife;
  attribute float iSeed;
  attribute float iSize;
  uniform float uTime;
  varying vec2 vUv;
  varying float vA;
  void main() {
    float age = uTime - iBorn;
    if (age < 0.0 || age > iLife || iLife <= 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vA = 0.0;
      vUv = uv;
      return;
    }
    float t = age / iLife;
    vec3 p = iPos + iVel * age * (1.0 - 0.45 * t) + vec3(0.0, 0.35 * age + 0.5 * age * age, 0.0);
    float size = iSize * (0.3 + 1.5 * pow(t, 0.55));
    float rot = iSeed * 6.2832 + age * (iSeed - 0.5) * 1.6;
    vec2 q = vec2(cos(rot) * position.x - sin(rot) * position.y, sin(rot) * position.x + cos(rot) * position.y) * size;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    mv.xy += q;
    gl_Position = projectionMatrix * mv;
    vA = (1.0 - t) * smoothstep(0.0, 0.06, t) * 0.44;
    vUv = uv;
  }
`;
const SMOKE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vA;
  void main() {
    float a = texture2D(uMap, vUv).a * vA;
    gl_FragColor = vec4(uColor, a);
  }
`;

export class Smoke {
  /** `rgb` is the smoke's colour as written to the screen: grey over the
   *  plate, and in the city whatever the street's light makes it. */
  constructor(scene, map, rgb = [0.66, 0.65, 0.63]) {
    const geom = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
    geom.instanceCount = SMOKE_MAX;
    this.pos = new Float32Array(SMOKE_MAX * 3);
    this.vel = new Float32Array(SMOKE_MAX * 3);
    this.born = new Float32Array(SMOKE_MAX);
    this.life = new Float32Array(SMOKE_MAX);
    this.seed = new Float32Array(SMOKE_MAX);
    this.size = new Float32Array(SMOKE_MAX);
    this.attrs = {
      iPos: new THREE.InstancedBufferAttribute(this.pos, 3),
      iVel: new THREE.InstancedBufferAttribute(this.vel, 3),
      iBorn: new THREE.InstancedBufferAttribute(this.born, 1),
      iLife: new THREE.InstancedBufferAttribute(this.life, 1),
      iSeed: new THREE.InstancedBufferAttribute(this.seed, 1),
      iSize: new THREE.InstancedBufferAttribute(this.size, 1),
    };
    for (const [k, a] of Object.entries(this.attrs)) {
      a.setUsage(THREE.DynamicDrawUsage);
      geom.setAttribute(k, a);
    }
    this.material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMap: { value: map }, uColor: { value: new THREE.Color().setRGB(...rgb) } },
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.next = 0;
    scene.add(this.mesh);
  }

  emit(at, vel, now, size) {
    const i = this.next;
    this.next = (this.next + 1) % SMOKE_MAX;
    this.pos.set([at.x, at.y, at.z], i * 3);
    this.vel.set([vel.x, vel.y, vel.z], i * 3);
    this.born[i] = now;
    this.life[i] = 1.1 + Math.random() * 0.9;
    this.seed[i] = Math.random();
    this.size[i] = size;
    for (const a of Object.values(this.attrs)) a.needsUpdate = true;
  }

  /** Forget every puff: a replay starts on clean air. */
  clear() {
    this.life.fill(0);
    this.attrs.iLife.needsUpdate = true;
  }

  update(now) {
    this.material.uniforms.uTime.value = now;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
