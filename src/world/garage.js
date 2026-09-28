// src/world/garage.js: the garage's door, its tubes, its monitor and drips.
//
// The flight into the garage (SHOTS.garage in src/data/world.js) comes down
// off the roof to the street behind the car, across to the door and in
// after it. The door is down until then: it rolls up into its drum as the
// car comes, rattling on its guides, and the car drives in to a dark room.
// Then, as the camera comes round to face the door, the tubes inside strike
// on one fixture at a time, the way fluorescents do (a flash or two, then
// steady, breathing with the bass), the room fills with their light, pink
// off one wall and cyan off the other (src/world/glsl.js, garageRoom), and
// it spills out of the door across the wet street (uDoorLight). Water runs
// off the drum in drips. On the back wall over the bench the monitor plays
// the intro's moon, the same still the garage's own room loops. A reader
// going back up the page brings the door down behind the car.
//
// Door and tubes are functions of the stage position, not of time: however
// fast the page is scrolled, the door is up before the car reaches it.
import * as THREE from "three";
import { COMMON } from "./glsl.js";
import { preloadMoon } from "./moon.js";

// The door's travel, in shots before the garage's own (the flight in
// starts a whole shot out, at the rooftop): up just before the car, which
// crosses the door's line at about 0.67 of a shot out. The tubes strike as
// the camera turns to face the door, and go off again only once it has
// gone back up past where they struck.
const DOOR_FROM = 0.84;
const DOOR_TO = 0.7;
const TUBES_ON = 0.5;
const TUBES_OFF = 0.62;
// The opening, as the kit builds it (GX0, DOOR_Z0..DOOR_Z1, DOOR_H).
const OPENING = { x: 452.0, z: -215.0, half: 3.0, height: 4.6 };
const DRIPS = 26;

export async function createGarage(named, shared, { reduced = false, reflectLayer = 2 } = {}) {
  const door = named.garage_door;
  const screen = named.garage_screen;
  const parts = [];

  // ---- the door -------------------------------------------------------------
  const doorUniforms = { ...shared, uDoor: { value: 0 }, uRattle: { value: 0 } };
  if (door) {
    const material = new THREE.ShaderMaterial({
      uniforms: doorUniforms,
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform float uDoor;
        uniform float uRattle;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          // The panel has risen by uDoor of its height: nothing below its
          // bottom edge, and its slats ride up with it.
          if (vUv.y < uDoor) discard;
          float h = ${OPENING.height.toFixed(2)};
          float pv = (vUv.y - uDoor) * h + uRattle;
          float slat = fract(pv / 0.11);
          // Each slat's profile: a lit crown, a dark groove under it.
          float profile = smoothstep(0.0, 0.18, slat) * (1.0 - 0.55 * smoothstep(0.72, 1.0, slat));
          vec2 grime = vec2(vUv.x * 9.0, pv * 1.3);
          float dirt = 0.75 + 0.25 * hash12(floor(grime * 4.0)) * hash12(floor(grime));
          // Rust and wet running down from the drum.
          float streak = smoothstep(0.55, 1.0, hash12(vec2(floor(vUv.x * 40.0), 3.0))) * smoothstep(0.0, 0.6, vUv.y);
          vec3 albedo = vec3(0.24, 0.25, 0.27) * dirt * mix(1.0, 0.6, streak) + vec3(0.05, 0.02, 0.0) * streak;
          vec3 n = normalize(vNormalW);
          vec3 light = vec3(0.05) + spillAt(vWorld) * 1.6;
          vec3 col = albedo * light * (0.55 + 0.45 * profile);
          // Coming up, the room's light blazes through the gap under it.
          float gap = smoothstep(0.03, 0.0, vUv.y - uDoor) * step(0.001, uDoor) * (1.0 - smoothstep(0.2, 0.6, uDoor));
          col += vec3(1.0, 0.8, 0.95) * gap * 2.5;
          col = cityFog(col, vWorld, 0.0);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      side: THREE.DoubleSide,
    });
    material.name = "garage_door";
    door.material = material;
    door.layers.enable(reflectLayer);
    parts.push({ material });
  }

  // ---- the monitor ------------------------------------------------------------
  if (screen) {
    const source = await preloadMoon();
    const map = source.clone();
    map.colorSpace = THREE.SRGBColorSpace;
    map.needsUpdate = true;
    const material = new THREE.ShaderMaterial({
      uniforms: { ...shared, uMap: { value: map }, uMotion: { value: reduced ? 0 : 1 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform sampler2D uMap;
        uniform float uMotion;
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          float t = uTime * uMotion;
          // A slow drift over the still, and every few seconds a band of it
          // slips sideways: the braindance editor, as the room's own monitor.
          vec2 uv = vec2(0.5) + (vUv - 0.5) * (0.92 - 0.04 * sin(t * 0.11)) + vec2(0.02 * sin(t * 0.07), 0.0);
          float burst = step(5.7, mod(t, 6.0));
          float band = step(0.38, vUv.y) * (1.0 - step(0.44, vUv.y));
          uv.x += burst * band * 0.04;
          vec3 c = texture2D(uMap, uv).rgb;
          c.r = texture2D(uMap, uv + vec2(0.0015 + 0.006 * burst, 0.0)).r;
          c *= 0.86 + 0.14 * sin(vUv.y * 420.0);
          float edge = 16.0 * vUv.x * vUv.y * (1.0 - vUv.x) * (1.0 - vUv.y);
          vec3 col = c * c * 1.6 * (0.7 + 0.3 * pow(edge, 0.25));
          col = cityFog(col, vWorld, 1.0);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    material.name = "garage_screen";
    screen.material = material;
    screen.layers.enable(reflectLayer);
    parts.push({ material, map });
  }

  // ---- drips off the drum -----------------------------------------------------
  const drop = new THREE.BoxGeometry(0.012, 1, 0.012);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = drop.index;
  geometry.setAttribute("position", drop.attributes.position);
  const seeds = new Float32Array(DRIPS * 3);
  for (let i = 0; i < DRIPS; i++) {
    const z = OPENING.z - OPENING.half + ((i + 0.5) / DRIPS) * OPENING.half * 2 + (Math.random() - 0.5) * 0.15;
    seeds.set([z, 1.2 + Math.random() * 1.8, Math.random() * 3], i * 3);
  }
  geometry.setAttribute("aDrip", new THREE.InstancedBufferAttribute(seeds, 3));
  geometry.instanceCount = DRIPS;
  const dripMaterial = new THREE.ShaderMaterial({
    uniforms: { ...shared, uDoor: doorUniforms.uDoor, uMotion: { value: reduced ? 0 : 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 aDrip;
      uniform float uTime;
      uniform float uMotion;
      varying float vA;
      varying vec3 vWorld;
      void main() {
        // A drop gathers on the drum's lip, lets go, and falls, stretched
        // by its own speed; its own period, so they never fall together.
        float t = mod(uTime * uMotion + aDrip.z, aDrip.y);
        float fall = max(t - 0.45, 0.0);
        float y = ${OPENING.height.toFixed(2)} - 0.5 * 9.8 * fall * fall;
        float speed = 9.8 * fall;
        float len = 0.03 + speed * 0.018;
        vec3 p = vec3(${(OPENING.x - 0.2).toFixed(2)}, y - position.y * len, aDrip.x);
        vA = step(0.0, y) * (fall > 0.0 ? 1.0 : smoothstep(0.0, 0.45, t) * 0.5);
        vec4 w = vec4(p + vec3(position.x, 0.0, position.z) * (1.0 + (fall > 0.0 ? 0.0 : 0.6)), 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform float uDoor;
      varying float vA;
      varying vec3 vWorld;
      void main() {
        // Lit by whatever is behind it: the street's neon, and the room's
        // light once the door is up.
        vec3 col = (spillAt(vWorld) * 0.8 + vec3(0.9, 0.8, 1.0) * uDoor * 0.9) * vA;
        col *= exp(-length(vWorld - uCam) * uFogDensity);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  dripMaterial.name = "garage_drips";
  // Culled with the door: the instances are placed in the shader, so the
  // bounds are the door's, not the one drop's.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(OPENING.x - 0.2, OPENING.height / 2, OPENING.z), OPENING.half + OPENING.height);
  const drips = new THREE.Mesh(geometry, dripMaterial);
  drips.name = "garage_drips";
  parts.push({ material: dripMaterial, geometry, extra: drop });

  // ---- the drive ----------------------------------------------------------------
  let open = 0;
  let clock = -1;
  let last = null;
  const color = new THREE.Color(1.0, 0.72, 0.92);
  shared.uDoorColor.value.copy(color);

  return {
    mesh: drips,
    /**
     * `position` is the stage position, `garage` the garage's own index in
     * it (or -1 on a page without one). A case study's route holds the
     * door where it was.
     */
    update(dt, position, garage) {
      if (garage >= 0) {
        const k = THREE.MathUtils.clamp((position - (garage - DOOR_FROM)) / (DOOR_FROM - DOOR_TO), 0, 1);
        open = k * k * (3 - 2 * k);
        if (position >= garage - TUBES_ON) clock = clock < 0 ? 0 : clock + dt;
        else if (position < garage - TUBES_OFF) clock = -1;
      }
      // A roll-up door judders on its guides while it moves.
      const moving = last === null ? 0 : Math.min(1, Math.abs(open - last) / Math.max(dt, 1e-3) * 0.6);
      last = open;
      doorUniforms.uDoor.value = open;
      doorUniforms.uRattle.value = reduced ? 0 : moving * 0.006 * Math.sin(shared.uTime.value * 70);
      shared.uTubeClock.value = reduced && clock >= 0 ? 10 : clock;
      // Out of the door: a little of the street's own light while the room
      // is dark, the room's once the tubes are on.
      const lit = clock < 0 ? 0 : Math.min(1, clock / 0.6);
      shared.uDoorLight.value.set(OPENING.x, OPENING.z, OPENING.half, open * (0.2 + 0.8 * lit));
    },
    dispose() {
      drips.removeFromParent();
      for (const p of parts) {
        p.material.dispose();
        p.map?.dispose();
        p.geometry?.dispose();
        p.extra?.dispose();
      }
    },
  };
}
