import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

// The city is rendered offline. Only the moving car needs a reflection
// pass; layer 1 excludes the smoke, beam sprites and screen-space effects.
export function createStreetContact(scene, camera, car) {
  car.traverse((part) => { if (part.isMesh) part.layers.enable(1); });
  scene.traverse((part) => { if (part.isLight) part.layers.enable(1); });

  const reflection = new Reflector(new THREE.PlaneGeometry(100, 100), {
    textureWidth: 512,
    textureHeight: 512,
    multisample: 0,
    clipBias: 0.003,
    shader: {
      name: "WetAsphaltReflection",
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
        tDiffuse: { value: null },
        textureMatrix: { value: new THREE.Matrix4() },
      },
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
        void main() {
          vec2 uv = vReflection.xy / vReflection.w;
          float grain = sin(vWorld.z * 85.0 + sin(vWorld.x * 23.0));
          uv.x += grain * 0.0014;
          vec4 c = texture2D(tDiffuse, uv) * 0.40;
          c += texture2D(tDiffuse, uv + vec2(0.002, 0.0)) * 0.15;
          c += texture2D(tDiffuse, uv - vec2(0.002, 0.0)) * 0.15;
          c += texture2D(tDiffuse, uv + vec2(0.0, 0.003)) * 0.15;
          c += texture2D(tDiffuse, uv - vec2(0.0, 0.003)) * 0.15;
          // The target stores premultiplied color over a transparent clear.
          vec3 rgb = c.rgb / max(c.a, 0.001);
          float puddle = 0.72 + 0.28 * sin(vWorld.x * 3.1 + vWorld.z * 5.7);
          gl_FragColor = vec4(rgb, c.a * 0.30 * puddle);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    },
  });
  reflection.rotation.x = -Math.PI / 2;
  reflection.position.y = 0.008;
  reflection.material.transparent = true;
  reflection.material.depthWrite = false;
  reflection.renderOrder = -3;
  reflection.getReflectionCamera(camera).layers.set(1);
  scene.add(reflection);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 5.9),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          vec2 p = abs(vUv - 0.5) * vec2(3.4, 5.9);
          float chassis = 1.0 - smoothstep(0.0, 0.65, max(p.x - 0.82, p.y - 1.82));
          float tyre = 1.0 - smoothstep(0.05, 0.32, length(p - vec2(0.85, 1.35)));
          gl_FragColor = vec4(0.006, 0.009, 0.013, max(chassis * 0.48, tyre * 0.72));
        }
      `,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.016;
  shadow.renderOrder = -2;
  const contact = new THREE.Group();
  contact.add(shadow);
  scene.add(contact);

  return {
    update(wet) {
      contact.position.set(car.position.x, 0, car.position.z);
      contact.rotation.y = car.rotation.y;
      reflection.visible = wet;
    },
    dispose() {
      reflection.geometry.dispose();
      reflection.dispose();
      shadow.geometry.dispose();
      shadow.material.dispose();
    },
  };
}
