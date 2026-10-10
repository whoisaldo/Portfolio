// src/three/drift/trail.js: a tail light's trail.
//
// Out of src/lib/drift-scene.js so the drift leaves the same streaks over
// the plate and in the live city. A thin vertical ribbon through where the
// lamp has been over the last quarter second, additive, fading toward its
// tail. Seen from a low camera, a ribbon along the path reads as the
// long-exposure streak it is meant to be.
import * as THREE from "three";
import { ADDITIVE } from "./lamps.js";

// Where an unfilled ribbon's points sit: one shared stand-in, not a new
// object for every empty point of every frame.
const NONE = Object.freeze({ x: 0, y: -10, z: 0, t: -1e9, s: 0 });

export class Trail {
  constructor(scene, color, n = 48) {
    this.n = n;
    this.pts = [];
    this.pos = new Float32Array(n * 2 * 3);
    this.alpha = new Float32Array(n * 2);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geom.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geom.setIndex(idx);
    this.mesh = new THREE.Mesh(
      geom,
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) } },
        vertexShader: /* glsl */ `
          attribute float aAlpha;
          varying float vA;
          void main() {
            vA = aAlpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying float vA;
          void main() {
            gl_FragColor = vec4(uColor * vA * 0.65, 0.0);
          }
        `,
        side: THREE.DoubleSide,
        ...ADDITIVE,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    scene.add(this.mesh);
  }

  push(p, now, strength) {
    this.pts.push({ x: p.x, y: p.y, z: p.z, t: now, s: strength });
    if (this.pts.length > this.n) this.pts.shift();
  }

  /** Forget the streak: a replay, or a car that jumped. */
  clear() {
    this.pts.length = 0;
  }

  update(now, life = 0.24) {
    const { n, pos, alpha, pts } = this;
    const last = pts.length - 1;
    for (let i = 0; i < n; i++) {
      // Newest sample at the highest index; older samples fill downward, and
      // an unfilled ribbon collapses onto its oldest point at zero alpha.
      const p = pts[Math.max(0, last - (n - 1 - i))] || NONE;
      const age = now - p.t;
      const a = Math.max(0, 1 - age / life) * p.s;
      const h = 0.012 + 0.025 * a;
      pos[i * 6] = p.x;
      pos[i * 6 + 1] = p.y + h;
      pos[i * 6 + 2] = p.z;
      pos[i * 6 + 3] = p.x;
      pos[i * 6 + 4] = p.y - h;
      pos[i * 6 + 5] = p.z;
      alpha[i * 2] = a;
      alpha[i * 2 + 1] = a;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.aAlpha.needsUpdate = true;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
