import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

// One rough planar reflection for the wet patches. The normal/depth pass
// does not recursively render reflections, and the room's visibility loop
// stops this pass with the rest of the garage.
//
// The reflection is drawn without the room's rect area lights: they are
// most of what a frame of this room costs (some three quarters of it), and
// in the puddles, at a third of their strength and smeared, what shows is
// the tubes and the monitor, which light themselves. Measured against the
// stock frame: the same picture to within a few levels in 99% of its
// pixels, and six milliseconds a frame cheaper on devbox1. While the camera
// holds, the reflection is also kept a frame (`hold`), since then only the
// monitor changes in it.
export function createGarageFloor(scene) {
  const rectLights = [];
  scene.traverse((o) => {
    if (o.isRectAreaLight) rectLights.push(o);
  });
  let hold = false;
  const floor = new Reflector(new THREE.PlaneGeometry(14, 16.6), {
    textureWidth: 512,
    textureHeight: 512,
    multisample: 0,
    clipBias: 0.003,
    shader: {
      name: "GaragePuddles",
      uniforms: { color: { value: new THREE.Color(0xffffff) }, tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() } },
      vertexShader: `
        uniform mat4 textureMatrix;
        varying vec4 vReflection;
        varying vec3 vWorld;
        void main() {
          vReflection = textureMatrix * vec4(position, 1.0);
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec4 vReflection;
        varying vec3 vWorld;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
        }
        void main() {
          vec2 uv = vReflection.xy / vReflection.w;
          float n = noise(vWorld.xz * .9) * .7 + noise(vWorld.xz * 3.2) * .3;
          float wet = smoothstep(.38, .73, n);
          uv += vec2(noise(vWorld.xz * 75.) - .5) * .002;
          vec3 c = texture2D(tDiffuse,uv).rgb * .4;
          c += texture2D(tDiffuse,uv+vec2(.002,0)).rgb*.15;
          c += texture2D(tDiffuse,uv-vec2(.002,0)).rgb*.15;
          c += texture2D(tDiffuse,uv+vec2(0,.003)).rgb*.15;
          c += texture2D(tDiffuse,uv-vec2(0,.003)).rgb*.15;
          gl_FragColor=vec4(c,wet*.32);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    },
  });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.021, 0.5);
  floor.material.transparent = true;
  floor.material.depthWrite = false;
  const renderReflection = floor.onBeforeRender;
  floor.onBeforeRender = (...args) => {
    if (scene.overrideMaterial || hold) return;
    for (const l of rectLights) l.visible = false;
    renderReflection.apply(floor, args);
    for (const l of rectLights) l.visible = true;
  };
  scene.add(floor);
  return {
    /** Keep last frame's reflection (the camera has not moved). */
    hold(on) { hold = on; },
    dispose() { floor.geometry.dispose(); floor.dispose(); scene.remove(floor); },
  };
}
