import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

const base = `${import.meta.env.BASE_URL}scenes/garage/`;
let pending;
let source;

export function preloadGarageRoom() {
  if (!pending) {
    pending = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
      .loadAsync(`${base}night-city-garage.glb`)
      .then((gltf) => { source = gltf.scene; })
      .catch((error) => { pending = null; throw error; });
  }
  return pending;
}

// Geometry, poster and cloth all come from the editable Blender room.
// Each mount owns its materials, textures, video and GPU resources.
export function createGarageRoom(scene, renderer, { reduced }) {
  if (!source) throw new Error("Load the garage before building its scene.");
  const room = source.clone(true);
  room.name = "Night_City_Garage";
  const materials = new Map();
  const textures = new Map();
  const geometries = new Map();
  room.traverse((o) => {
    if (!o.isMesh) return;
    if (!geometries.has(o.geometry)) geometries.set(o.geometry, o.geometry.clone());
    o.geometry = geometries.get(o.geometry);
    const clone = (original) => {
      if (!materials.has(original)) {
        const m = original.clone();
        for (const [key, value] of Object.entries(m)) {
          if (!value?.isTexture) continue;
          if (!textures.has(value)) textures.set(value, value.clone());
          m[key] = textures.get(value);
          m[key].anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        }
        if (m.name.includes("aged_concrete")) m.color.set("#62686c");
        if (m.name.includes("damp_concrete")) m.color.set("#41474e");
        if (m.name.includes("oxblood_tools")) m.color.set("#866567");
        if (m.name.includes("lift_tube")) m.emissiveIntensity *= 0.45;
        materials.set(original, m);
      }
      return materials.get(original);
    };
    o.material = Array.isArray(o.material) ? o.material.map(clone) : clone(o.material);
    o.receiveShadow = true;
    o.castShadow = !o.name.includes("tube") && !o.name.includes("concrete");
  });
  scene.add(room);
  RectAreaLightUniformsLib.init();
  const lights = [];
  const area = (color, intensity, width, height, position, target) => {
    const light = new THREE.RectAreaLight(color, intensity, width, height);
    light.position.set(...position);
    light.lookAt(...target);
    lights.push(light);
    scene.add(light);
  };
  // Match the narrow real fixtures, so the windshield reflects strips
  // instead of an opaque white rectangle spanning the entire hoist.
  for (const x of [-2.15, 2.15]) area("#d5e5f6", 32, 0.12, 5.2, [x, 3.84, 0.1], [x, 0, 0.1]);
  for (const z of [-2.66, 2.96]) area("#d5e5f6", 24, 4, 0.12, [0, 3.84, z], [0, 0, z]);
  area("#ff278d", 4.5, 5.5, 3.4, [-6.65, 3, 0], [0, 1, 0]);
  area("#27dcf2", 5.5, 5.5, 3.4, [6.65, 3, 0], [0, 1, 0]);
  area("#ffd477", 9, 8, 0.6, [0, 3.09, -6.35], [0, 1.2, -5.9]);
  area("#7d9bb3", 3, 7, 3, [0, 3.5, 8.4], [0, 0.7, 0]);

  const key = new THREE.SpotLight("#d0dfea", 75, 20, Math.PI / 3, 0.7, 2);
  key.position.set(0.8, 3.8, 1.1);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.025;
  lights.push(key, key.target);
  scene.add(key, key.target);
  const ambient = new THREE.HemisphereLight("#7e9cab", "#171321", 0.3);
  lights.push(ambient);
  scene.add(ambient);

  // Capture the actual room's luminous fixtures in the paint and glass.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(scene, 0.08, 0.1, 40);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();

  const screen = room.getObjectByName("BraindanceScreen");
  const video = document.createElement("video");
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  let videoTexture;
  let active = false;
  const uniforms = {
    film: { value: screen.material.map },
    time: { value: 0 },
    motion: { value: reduced ? 0 : 1 },
  };
  const monitorMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D film;
      uniform float time;
      uniform float motion;
      varying vec2 vUv;
      void main() {
        float burst = step(5.72, mod(time, 6.0)) * motion;
        float band = step(.38, vUv.y) * (1.0 - step(.43, vUv.y));
        vec2 uv = vUv + vec2(burst * band * .035, 0.0);
        vec3 c = texture2D(film, uv).rgb;
        c.r = texture2D(film, uv + vec2(.001 + .006 * burst, 0.)).r;
        c.b = texture2D(film, uv - vec2(.001 + .005 * burst, 0.)).b;
        c *= .89 + .11 * sin(vUv.y * 650.0);
        float edge = 16.0 * vUv.x * vUv.y * (1.0-vUv.x) * (1.0-vUv.y);
        gl_FragColor = vec4(c * (.7 + .3 * pow(edge, .2)), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  screen.material = monitorMaterial;
  const loaded = () => {
    videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.flipY = false;
    uniforms.film.value = videoTexture;
  };
  video.addEventListener("loadeddata", loaded, { once: true });

  return {
    room,
    video,
    update(now) { uniforms.time.value = reduced ? 0 : now / 1000; },
    start() {
      active = true;
      if (!reduced) {
        if (!video.src) video.src = `${base}moon-braindance.mp4`;
        video.play().catch(() => { /* The packaged still remains on the monitor. */ });
      }
    },
    stop() { active = false; video.pause(); },
    get active() { return active; },
    dispose() {
      video.pause();
      video.removeEventListener("loadeddata", loaded);
      video.removeAttribute("src");
      video.load();
      videoTexture?.dispose();
      monitorMaterial.dispose();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      geometries.forEach((g) => g.dispose());
      key.shadow.map?.dispose();
      environment.dispose();
      scene.remove(room, ...lights);
    },
  };
}
