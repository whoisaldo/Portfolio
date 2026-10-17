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
import { NEON } from "./materials.js";
import { preloadMoon } from "./moon.js";
import { catmullRom, curveAt, easeInOut, makePose, copyPose, clamp } from "./shots.js";
import { GARAGE_POSES, GARAGE_ROUTES, GARAGE_ROUTES_PORTRAIT, GARAGE_TIMELINE, GARAGE_STATES, GARAGE_STATIONS } from "../data/world.js";

// A deliberately unavailable asset stays absent from every camera and
// physical query, including its shadow and any development proxy.
export function createGaragePresentation(createCars, context, { s6Available = true } = {}) {
  if (s6Available) return createCars(context);
  const parked = new THREE.Group();
  parked.name = "garage_pending_s6";
  parked.visible = false;
  context.scene.add(parked);
  const cars = createCars({ ...context, scene: parked, placeholder: true });
  const physical = (rows) => rows.filter((row) => row.carId !== "s6");
  for (const name of ["bounds", "anchors", "occluders"]) {
    const query = cars[name];
    cars[name] = () => physical(query());
  }
  const pick = cars.pick;
  cars.pick = (ray) => {
    const visibility = parked.children.map((child) => [child, child.visible]);
    try {
      for (const [child] of visibility) child.visible = false;
      return pick(ray);
    } finally {
      for (const [child, visible] of visibility) child.visible = visible;
    }
  };
  const flash = cars.flash;
  cars.flash = (id) => id === "s6" ? null : flash(id);
  const dispose = cars.dispose;
  cars.dispose = () => { dispose(); parked.removeFromParent(); };
  cars.ready.then(() => {
    cars.stats.s6.visitorOmitted = true;
    cars.stats.s6.reason = "The S6 model is unavailable.";
  }, () => {});
  return cars;
}

// A reduced-motion canvas rests until the room is ready. Its preparation
// can still upload one resource per animation frame without drawing or
// advancing the scene. The caller excludes active renderers and sampling.
export function createGarageUploadPump({ run, pending, canRun, schedule = requestAnimationFrame, cancel = cancelAnimationFrame }) {
  let frame = 0, disposed = false;
  const wake = () => {
    if (disposed || frame || !pending()) return;
    frame = schedule(() => {
      frame = 0;
      if (disposed || !canRun() || !pending()) return;
      run();
      wake();
    });
  };
  return { wake, dispose() { disposed = true; cancel(frame); frame = 0; } };
}

// Core kit triangles touching the workshop shell keep their own cells.
// Exterior triangles never inherit a room exemption from another material
// sharing the same ground tile. This partition changes no geometry.
const GARAGE_SHELL = new THREE.Box3(new THREE.Vector3(451.7, -.3, -230.3), new THREE.Vector3(476.3, 8.3, -199.7));
export const garageCellSector = (box) => box.intersectsBox(GARAGE_SHELL) ? "garage_shell" : "exterior";

// Each pass clips the real openings to its own camera before building portal
// cones. A street cell which overlaps the room stays conservative, but an
// opening behind the camera cannot keep the entire exterior submitted.
export function createGarageVisibility(anchors) {
  const room = new THREE.Box3(new THREE.Vector3(452.05, -8, -229.95), new THREE.Vector3(475.95, 8, -200.05));
  const portals = [...anchors].filter(([name]) => /^anchor_garage_portal_/.test(name)).map(([, anchor]) => {
    const width = Number(anchor.extras?.width), height = Number(anchor.extras?.height);
    if (!(width > 0 && height > 0)) return null;
    const u = new THREE.Vector3(width / 2, 0, 0).applyQuaternion(anchor.quaternion);
    const v = new THREE.Vector3(0, height / 2, 0).applyQuaternion(anchor.quaternion);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => anchor.position.clone().addScaledVector(u, a).addScaledVector(v, b));
  }).filter(Boolean);
  const eye = new THREE.Vector3();
  const view = new THREE.Frustum(), matrix = new THREE.Matrix4(), positive = new THREE.Vector3();
  let inside = false, nearOpening = false, cones = [], trafficCones = [], roadVisible = true;
  const clip = (polygon, plane) => {
    const result = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const da = plane.distanceToPoint(a), db = plane.distanceToPoint(b);
      if (da >= 0) result.push(a);
      if ((da < 0) !== (db < 0)) result.push(a.clone().lerp(b, da / (da - db)));
    }
    return result;
  };
  return {
    get inside() { return inside; },
    get exteriorVisible() { return !inside || nearOpening || cones.length > 0; },
    get roadVisible() { return !inside || nearOpening || roadVisible; },
    prepare(camera) {
      eye.setFromMatrixPosition(camera.matrixWorld);
      inside = room.containsPoint(eye);
      view.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      nearOpening = false;
      roadVisible = false;
      cones = [];
      // Traffic is packed once per frame for both direct and reflected
      // sight. Vertical portal sides have the same X/Z silhouette for
      // both eyes. Keeping their full height is conservative for flying
      // vehicles, whose existing frustum test still bounds the frame.
      trafficCones = portals.map((points) => {
        const center = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(.25);
        const through = center.clone().add(center.clone().sub(eye).normalize());
        return [[points[1], points[2]], [points[3], points[0]]].map(([a, b]) => {
          const plane = new THREE.Plane().setFromCoplanarPoints(eye, a, b);
          return plane.distanceToPoint(through) < 0 ? plane.negate() : plane;
        });
      });
      const apertures = eye.y < 0 ? portals.flatMap((points) => [points, points.map((p) => new THREE.Vector3(p.x, -p.y, p.z))]) : portals;
      for (const points of apertures) {
        // Keep both the physical opening above the floor and its reflected
        // opening below it. The mirror's oblique plane chooses which rays
        // can reach the street without removing its physical aperture.
        const opening = new THREE.Plane().setFromCoplanarPoints(...points.slice(0, 3));
        if (Math.abs(opening.distanceToPoint(eye)) < .5) nearOpening = true;
        let polygon = points;
        for (const plane of view.planes) polygon = clip(polygon, plane);
        if (polygon.length < 3) continue;
        const center = polygon.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / polygon.length);
        const through = center.clone().add(center.clone().sub(eye).normalize());
        const planes = polygon.map((p, i) => {
          const plane = new THREE.Plane().setFromCoplanarPoints(eye, p, polygon[(i + 1) % polygon.length]);
          return plane.distanceToPoint(through) < 0 ? plane.negate() : plane;
        });
        if (opening.distanceToPoint(eye) > 0) opening.negate();
        planes.push(opening);
        cones.push(planes);
        if (polygon.some((p) => p.y < eye.y && p.y >= -.01)) roadVisible = true;
      }
    },
    testTrafficSphere(x, y, z, radius) {
      if (!portals.length || !inside || nearOpening) return true;
      if (x >= room.min.x - radius && x <= room.max.x + radius && z >= room.min.z - radius && z <= room.max.z + radius) return true;
      return trafficCones.some((planes) => planes.every(({ normal, constant }) => normal.x * x + normal.y * y + normal.z * z + constant >= -radius));
    },
    testSphere(x, y, z, radius) {
      if (!portals.length || !inside || nearOpening) return true;
      if (x >= room.min.x && x <= room.max.x && y >= room.min.y && y <= room.max.y && z >= room.min.z && z <= room.max.z) return true;
      return cones.some((planes) => planes.every(({ normal, constant }) => normal.x * x + normal.y * y + normal.z * z + constant >= -radius));
    },
    test(box, sector = "") {
      if (!portals.length || nearOpening) return true;
      if (inside && (sector.startsWith("garage_") || box.intersectsBox(room) && sector !== "exterior")) return true;
      if (!inside && (sector === "garage_shell" || !sector.startsWith("garage_") && !room.containsBox(box))) return true;
      return cones.some((planes) => planes.every((plane) => {
        positive.set(plane.normal.x > 0 ? box.max.x : box.min.x, plane.normal.y > 0 ? box.max.y : box.min.y, plane.normal.z > 0 ? box.max.z : box.min.z);
        return plane.distanceToPoint(positive) >= 0;
      }));
    },
  };
}

// Ordinary meshes already promise conservative bounds to Three's frustum
// culler. Use the same sphere for the workshop portals, and restore every
// visibility flag after the pass so mirrors and street views are independent.
export function cullGarageObjects(scene, visibility, { car = null } = {}) {
  const hidden = [], sphere = new THREE.Sphere();
  scene.traverseVisible((node) => {
    if (!node.isMesh || !node.frustumCulled || node.isInstancedMesh || node.geometry?.isInstancedBufferGeometry) return;
    for (let parent = node; parent; parent = parent.parent) {
      if (parent === car || /^(ali_s6|garage_)/.test(parent.name) || (parent.userData.sector ?? parent.userData.visibilitySector ?? "").startsWith("garage_")) return;
    }
    const geometry = node.geometry;
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    sphere.copy(geometry.boundingSphere).applyMatrix4(node.matrixWorld);
    if (visibility.testSphere(sphere.center.x, sphere.center.y, sphere.center.z, sphere.radius)) return;
    hidden.push(node); node.visible = false;
  });
  return () => { for (const node of hidden) node.visible = true; };
}

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

/**
 * The room's lights as the kit builds them (the builder's garage: GX0..GX1,
 * GZ0..GZ1), for its glossy floor to trace (src/world/wet.js): the pink and
 * cyan tubes along the top of the two painted long walls and the strips low
 * on them, the two white panels overhead, the amber strip over the bench,
 * and the monitor.
 */
export function garageLights(anchors = null) {
  const fixtures = anchors ? [...anchors].filter(([name]) => name.startsWith("anchor_garage_light_")) : [];
  if (fixtures.length) return fixtures.map(([, anchor]) => {
    const data = anchor.extras ?? {};
    const u = new THREE.Vector3(Number(data.length) || 1, 0, 0).applyQuaternion(anchor.quaternion);
    const v = new THREE.Vector3(0, 0, Number(data.width) || .1).applyQuaternion(anchor.quaternion);
    return { corner: anchor.position.clone().addScaledVector(u, -.5).addScaledVector(v, -.5), u, v,
      normal: new THREE.Vector3(0, -1, 0).applyQuaternion(anchor.quaternion),
      tint: new THREE.Color(data.color ?? "#ffffff").multiplyScalar(Number(data.intensity) || 1), tube: data.kind !== "screen" };
  });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const tube = (hex) => new THREE.Color(hex).multiplyScalar(2.4);
  const wall = (z, y0, y1, x0, x1, facing, color) => ({
    corner: V(x0, y1, z), u: V(x1 - x0, 0, 0), v: V(0, y0 - y1, 0), normal: V(0, 0, facing), tint: tube(color), tube: true,
  });
  return [
    // The long tubes along the top of the painted magenta and cyan walls.
    wall(-200.52, 7.38, 7.46, 459.8, 468.7, -1, NEON.pink),
    wall(-229.48, 7.38, 7.46, 460.1, 469.2, 1, NEON.cyan),
    ...[-219.5, -210.5].map((z) => ({ corner: V(455, 7.64, z - 0.9), u: V(18, 0, 0), v: V(0, 0, 1.8), normal: V(0, -1, 0), tint: tube(NEON.white), tube: true })),
    wall(-200.62, 3.0, 3.12, 454, 474, -1, NEON.pink),
    wall(-229.38, 3.0, 3.12, 454, 474, 1, NEON.cyan),
    { corner: V(475.44, 2.46, -224), u: V(0, 0, 18), v: V(0, -0.06, 0), normal: V(-1, 0, 0), tint: tube(NEON.amber), tube: true },
    { corner: V(475.43, 4.5, -216.7), u: V(0, 0, 3.4), v: V(0, -1.9, 0), normal: V(-1, 0, 0), tint: new THREE.Color(0.05, 0.09, 0.22) },
  ];
}

export async function createGarage(named, shared, { reduced = false, reflectLayer = 2 } = {}) {
  const door = named.garage_door;
  const parts = [];
  let monitorAllowed = false;
  let monitorVideo = null;
  const media = [];
  const pauseMedia = () => media.forEach((item) => item.video.pause());

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
  const bindScreen = async (screen) => {
    if (!screen) return;
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
    // The old room's muted moon loop remains on the shared city monitor.
    // It requests no bytes before readiness and rests outside the visit.
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    let texture = null;
    const loaded = () => {
      texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      material.uniforms.uMap.value = texture;
    };
    video.addEventListener("loadeddata", loaded, { once: true });
    const item = { video, dispose() {
      video.pause();
      video.removeEventListener("loadeddata", loaded);
      video.removeAttribute("src");
      video.load();
      texture?.dispose();
    } };
    media.push(item);
    monitorVideo?.pause();
    monitorVideo = video;
  };
  await bindScreen(named.garage_screen);

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
    bindScreen,
    pauseMedia,
    allowMonitor(on) { monitorAllowed = on; if (!on) pauseMedia(); },
    /**
     * `position` is the stage position, `garage` the garage's own index in
     * it (or -1 on a page without one). A case study's route holds the
     * door where it was.
     */
    update(dt, position, garage) {
      const showMonitor = monitorAllowed && !reduced && garage >= 0 && Math.abs(position - garage) < 1;
      if (monitorVideo && showMonitor) {
        if (!monitorVideo.src) monitorVideo.src = `${import.meta.env.BASE_URL}scenes/garage/moon-braindance.mp4`;
        if (monitorVideo.paused) monitorVideo.play().catch(() => {});
      } else pauseMedia();
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
      media.forEach((item) => item.dispose());
      for (const p of parts) {
        p.material.dispose();
        p.map?.dispose();
        p.geometry?.dispose();
        p.extra?.dispose();
      }
    },
  };
}

// ---- the visit ------------------------------------------------------------------
//
// Inside, the camera does not fly the way it flies between sections. A
// flight in the open is a curve from one shot to the next with the camera
// eased after it, and an eased camera cuts corners; in a room with two
// cars, lifts and a bench a corner cut is a camera inside a car. So the
// visit is a fixed route: each stretch of the section's progress (src/data/
// world.js GARAGE_TIMELINE) either holds a pose or runs a path between two,
// and the whole pose is read off the route at one number. What is smoothed
// is that number, never the position it gives (src/world/world-scene.js),
// so the camera is always somewhere on the route.

const smooth01 = (t) => t * t * (3 - 2 * t);

/** A ramp's value at `p` (GARAGE_STATES): its first `from` before the first
 *  ramp, eased across each, held between. With `cut`, each ramp is a cut at
 *  its fifth number, or its middle. */
export function rampAt(ramps, p, cut = false) {
  let v = ramps[0]?.[2] ?? 0;
  for (const [a, b, from, to, at] of ramps) {
    if (p < a) return v;
    if (p < b) {
      if (cut) return p < (at ?? (a + b) / 2) ? from : to;
      return from + (to - from) * smooth01((p - a) / (b - a));
    }
    v = to;
  }
  return v;
}

/** The stretch of GARAGE_TIMELINE `p` is in, with where it starts. */
export function stretchAt(p) {
  let start = 0;
  for (const s of GARAGE_TIMELINE) {
    if (p <= s.to || s === GARAGE_TIMELINE[GARAGE_TIMELINE.length - 1]) return { ...s, start };
    start = s.to;
  }
  return null;
}

/**
 * The visit's poses and paths, from the kit's anchors where it has them and
 * the plan's numbers where it does not yet. `placeholder` says which: a
 * pose not from the kit is a stand-in, never evidence of a framing.
 */
export function createGarageVisit(anchors) {
  const has = (name) => anchors.has(name);
  const placeholders = new Set();

  const resolvePose = (key, portrait) => {
    const cam = `cam_garage_${key}`;
    const tgt = `${cam}_target`;
    if (has(cam) && has(tgt)) {
      if (portrait && (!has(`${cam}_portrait`) || !has(`${tgt}_portrait`))) placeholders.add(`${key}:portrait`);
      const c = anchors.get(portrait && has(`${cam}_portrait`) ? `${cam}_portrait` : cam);
      const t = anchors.get(portrait && has(`${tgt}_portrait`) ? `${tgt}_portrait` : tgt);
      const extras = anchors.get(cam).extras ?? {};
      const fov = Number((portrait ? extras.fov_portrait : null) ?? extras.fov) || GARAGE_POSES[key]?.[portrait ? "portrait" : "wide"]?.[2] || 48;
      return { position: c.position.clone(), target: t.position.clone(), fov, shift: 0 };
    }
    const d = GARAGE_POSES[key];
    if (!d) { placeholders.add(key); return null; }
    placeholders.add(key);
    const [position, target, fov] = d[portrait ? "portrait" : "wide"] ?? d.wide;
    return { position: new THREE.Vector3().fromArray(position), target: new THREE.Vector3().fromArray(target), fov, shift: 0 };
  };

  // A path's interior points: cam_garage_path_<route>_01 ... from the kit
  // (a phone's _portrait where there is one), or the plan's.
  const resolveRoute = (id, portrait) => {
    const out = [];
    for (let n = 1; n < 100; n++) {
      const name = `cam_garage_path_${id}_${String(n).padStart(2, "0")}`;
      if (!has(name)) break;
      out.push(anchors.get(portrait && has(`${name}_portrait`) ? `${name}_portrait` : name).position.clone());
    }
    if (out.length) return out;
    const plan = (portrait && GARAGE_ROUTES_PORTRAIT[id]) || GARAGE_ROUTES[id] || [];
    if (plan.length) placeholders.add(`path:${id}`);
    return plan.map((a) => new THREE.Vector3().fromArray(a));
  };

  // Where the gaze is held along a path: cam_garage_gaze_<route>_NN, each at
  // its `u`, a fraction of the path.
  const resolveGaze = (id, portrait) => {
    const out = [];
    for (let n = 1; n < 100; n++) {
      const name = `cam_garage_gaze_${id}_${String(n).padStart(2, "0")}`;
      if (!has(name)) break;
      const a = anchors.get(portrait && has(`${name}_portrait`) ? `${name}_portrait` : name);
      out.push({ at: a.position.clone(), u: clamp(Number(a.extras?.u ?? n / 10), 0, 1) });
    }
    return out.sort((x, y) => x.u - y.u);
  };

  const keys = new Set([...Object.keys(GARAGE_POSES), "s4_cabin", "s6_cabin"]);
  const tiers = {};
  for (const portrait of [false, true]) {
    const poses = {};
    for (const k of keys) {
      const pose = resolvePose(k, portrait);
      if (pose) poses[k] = pose;
    }
    const routes = {};
    const gaze = {};
    for (const id of Object.keys(GARAGE_ROUTES)) {
      routes[id] = resolveRoute(id, portrait);
      gaze[id] = resolveGaze(id, portrait);
    }
    tiers[portrait ? "portrait" : "wide"] = { poses, routes, gaze };
  }
  const tierOf = (aspect) => tiers[aspect < 1 ? "portrait" : "wide"];

  // The exterior junction has a complete gaze/lens too, including before
  // B2 adds a named inspection camera for it.
  for (const t of Object.values(tiers)) {
    const position = anchors.get("anchor_garage_node_outside")?.position ?? t.routes.exit.at(-1);
    t.poses.outside = { position: position.clone(), target: new THREE.Vector3(452, 2.4, -215.3), fov: t.poses.arrival.fov, shift: 0 };
  }

  const _ahead = new THREE.Vector3();
  const _g = new THREE.Vector3();
  const _end = new THREE.Vector3();

  // Each path as a curve measured along itself: the Catmull-Rom curve
  // through its poses and points, sampled finely once, so a distance along
  // it gives the curve's own parameter. (Spacing a curve by its chords,
  // as the open flights do, changes speed at every point it passes, and
  // most at a short leg round a corner: a jolt the reader feels.)
  const SAMPLES = 48;
  const paths = new Map();
  const pathOf = (id, from, into, aspect) => {
    const key = `${aspect < 1 ? "p" : "w"}:${id}:${from}:${into}`;
    let path = paths.get(key);
    if (path) return path;
    const t = tierOf(aspect);
    const pts = [t.poses[from].position, ...t.routes[id], t.poses[into].position];
    const n = pts.length;
    const p0 = pts[0].clone().multiplyScalar(2).sub(pts[1]);
    const p3 = pts[n - 1].clone().multiplyScalar(2).sub(pts[n - 2]);
    const legs = [];
    for (let k = 0; k < n - 1; k++) legs.push([k === 0 ? p0 : pts[k - 1], pts[k], pts[k + 1], k + 2 >= n ? p3 : pts[k + 2]]);
    const s = [0];
    const at = new THREE.Vector3();
    const last = pts[0].clone();
    for (const leg of legs) {
      for (let j = 1; j <= SAMPLES; j++) {
        catmullRom(...leg, j / SAMPLES, at);
        s.push(s[s.length - 1] + at.distanceTo(last));
        last.copy(at);
      }
    }
    path = { pts, legs, s, length: s[s.length - 1] || 1 };
    paths.set(key, path);
    return path;
  };
  // The point `e` (0..1 of its length) along `path`; past either end, on
  // along its end's own direction, so a heading read either side of the
  // camera has no corner where one reading would stop at an end.
  const reach = (path, e, out) => {
    const { pts, legs, s, length } = path;
    if (e < 0 || e > 1) {
      const n = pts.length;
      const [a, b] = e < 0 ? [pts[0], pts[1]] : [pts[n - 1], pts[n - 2]];
      _end.subVectors(a, b).normalize();
      return out.copy(a).addScaledVector(_end, (e < 0 ? -e : e - 1) * length);
    }
    const d = e * length;
    let lo = 0;
    let hi = s.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (s[mid] <= d) lo = mid;
      else hi = mid;
    }
    const f = (lo + clamp((d - s[lo]) / Math.max(1e-9, s[hi] - s[lo]), 0, 1)) / SAMPLES;
    const leg = Math.min(legs.length - 1, Math.floor(f));
    return catmullRom(...legs[leg], f - leg, out);
  };

  /** A pose on path `id` from pose `from` to pose `into`, `e` of the way by
   *  distance (already eased), into `out`. */
  const sample = (id, from, into, e, aspect, out) => {
    const t = tierOf(aspect);
    const A = t.poses[from];
    const B = t.poses[into];
    const path = pathOf(id, from, into, aspect);
    reach(path, e, out.position);
    const gaze = t.gaze[id];
    if (gaze.length) {
      // From the first pose's target through each held gaze to the last's.
      const stops = [{ at: A.target, u: 0 }, ...gaze, { at: B.target, u: 1 }];
      let k = 0;
      while (k < stops.length - 2 && stops[k + 1].u < e) k++;
      const w = smooth01(clamp((e - stops[k].u) / Math.max(1e-6, stops[k + 1].u - stops[k].u), 0, 1));
      out.target.copy(stops[k].at).lerp(stops[k + 1].at, w);
    } else {
      // Where it is going, between where it was looking and where it
      // will: along the path's own heading, read across a stretch of it
      // either side so it never turns on a point.
      // (Past either end the path runs straight on, so the heading has no
      // corner where one of the two readings would stop at an end.)
      reach(path, e + 0.12, _ahead);
      reach(path, e - 0.12, _g);
      _g.subVectors(_ahead, _g).normalize().multiplyScalar(4).add(out.position);
      out.target.copy(A.target).lerp(_g, smooth01(clamp(e / 0.3, 0, 1))).lerp(B.target, smooth01(clamp((e - 0.55) / 0.45, 0, 1)));
    }
    out.fov = A.fov + (B.fov - A.fov) * e;
    out.shift = 0;
    return out;
  };

  /** The visit's pose at progress `p`. Reduced motion cuts at the middle of
   *  each path, from one pose to the next, and never shows the way between. */
  const at = (p, aspect, out = makePose(), reduced = false) => {
    const s = stretchAt(clamp(p, 0, 1));
    const t = tierOf(aspect);
    if (s.hold) return copyPose(out, t.poses[s.hold]);
    const u = clamp((p - s.start) / Math.max(1e-6, s.to - s.start), 0, 1);
    if (reduced) return copyPose(out, t.poses[u < 0.5 ? s.from : s.into]);
    return sample(s.route, s.from, s.into, easeInOut(u), aspect, out);
  };

  /** What the cars do at `p`: hood 0..1 for each, the S6's drop 0..1. */
  const stateAt = (p, reduced = false) => ({
    hood: { s4: rampAt(GARAGE_STATES.hood_s4, p, reduced), s6: rampAt(GARAGE_STATES.hood_s6, p, reduced) },
    lowering: rampAt(GARAGE_STATES.lowering, p, reduced),
  });

  /** The station `p` is at or was last at. */
  const stationAt = (p) => {
    let id = GARAGE_STATIONS[0].id;
    for (const st of GARAGE_STATIONS) if (p >= st.p - 0.07) id = st.id;
    return id;
  };

  /** The points the flights in and out run through inside the door. */
  const entry = (aspect) => tierOf(aspect).routes.entry;
  const exit = (aspect) => tierOf(aspect).routes.exit;

  // Stations and inspections share the authored route edges. A replacement
  // request can reverse the current edge, but only branches at its endpoint.
  // No request ever constructs a line between arbitrary camera positions.
  const edges = GARAGE_TIMELINE.filter((s) => s.route).map((s) => ({ id: s.route, from: s.from, into: s.into }));
  edges.push({ id: "apron_s4rear", from: "arrival", into: "s4_rear" }, { id: "entry", from: "outside", into: "arrival" });
  const locationAt = (p) => {
    const s = stretchAt(clamp(p, 0, 1));
    return s.hold ? { node: s.hold } : { edge: s.route, u: easeInOut(clamp((p - s.start) / (s.to - s.start), 0, 1)) };
  };
  const edgeOf = (id) => edges.find((e) => e.id === id);
  const route = (from, to, aspect = 1.6) => {
    const queue = [{ node: from, cost: 0, path: [] }];
    const visited = new Set();
    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift();
      if (current.node === to) return current;
      if (visited.has(current.node)) continue;
      visited.add(current.node);
      for (const edge of edges) {
        const reverse = edge.into === current.node;
        if (!reverse && edge.from !== current.node) continue;
        const node = reverse ? edge.from : edge.into;
        queue.push({ node, cost: current.cost + pathOf(edge.id, edge.from, edge.into, aspect).length,
          path: [...current.path, { routeId: edge.id, from: edge.from, into: edge.into, reverse }] });
      }
    }
    throw new Error(`No workshop route from ${from} to ${to}.`);
  };
  const navigator = (progress, aspect, start = locationAt(progress)) => {
    let location = { ...start };
    let target = { ...location };
    let cutPending = false;
    const lengthOf = (edge) => pathOf(edge.id, edge.from, edge.into, aspect).length;
    const costTo = (node) => {
      if (target.node) return route(node, target.node, aspect).cost;
      const edge = edgeOf(target.edge), length = lengthOf(edge);
      return Math.min(route(node, edge.from, aspect).cost + target.u * length, route(node, edge.into, aspect).cost + (1 - target.u) * length);
    };
    const matches = () => location.node ? location.node === target.node : location.edge === target.edge && Math.abs(location.u - target.u) < 1e-9;
    const read = (out) => {
      if (location.node) return copyPose(out, tierOf(aspect).poses[location.node]);
      const edge = edgeOf(location.edge);
      return sample(edge.id, edge.from, edge.into, location.u, aspect, out);
    };
    const api = {
      snapshot: () => ({ ...location }),
      request(destination, { cut = false } = {}) {
        const next = typeof destination === "number" ? locationAt(destination) : typeof destination === "string" ? { node: destination } : { ...destination };
        if (next.node && !tierOf(aspect).poses[next.node]) return false;
        // A cabin is an authored complete pose, never a route through glass.
        // Leaving that cut also restores the exterior with a labeled cut.
        if (location.node?.endsWith("_cabin") && next.node !== location.node) {
          location = { node: location.node.slice(0, 2) };
          cutPending = true;
        }
        target = next;
        if (cut || next.node?.endsWith("_cabin")) { location = { ...next }; cutPending = true; }
        return true;
      },
      sample(dt, out = makePose()) {
        let distance = Math.max(0, dt) * 24;
        for (let i = 0; i < 32 && !matches(); i++) {
          if (location.node) {
            let next;
            if (target.node) next = route(location.node, target.node, aspect).path[0];
            else {
              const edge = edgeOf(target.edge), length = lengthOf(edge);
              const a = route(location.node, edge.from, aspect), b = route(location.node, edge.into, aspect);
              const reverse = b.cost + (1 - target.u) * length < a.cost + target.u * length;
              next = (reverse ? b : a).path[0] ?? { routeId: edge.id, reverse };
            }
            location = { edge: next.routeId, u: next.reverse ? 1 : 0 };
          }
          const edge = edgeOf(location.edge), length = lengthOf(edge);
          const sameEdge = target.edge === location.edge;
          const left = costTo(edge.from) + location.u * length;
          const right = costTo(edge.into) + (1 - location.u) * length;
          const end = sameEdge ? target.u : Math.abs(left - right) < 1e-7 ? (location.u < .5 ? 1 : 0) : left < right ? 0 : 1;
          const need = Math.abs(end - location.u) * length;
          if (need > distance) { location.u += Math.sign(end - location.u) * distance / length; break; }
          distance -= need;
          location.u = end;
          if (sameEdge) break;
          location = { node: end === 0 ? edge.from : edge.into };
        }
        const cut = cutPending;
        cutPending = false;
        return { pose: read(out), done: matches(), cut, location: { ...location } };
      },
    };
    return api;
  };

  /** Leaving a route replays the safe visit backwards, then retraces
   *  entry through the door. Returning during that motion reverses the
   *  same cursor; it never constructs an outdoor arc inside the room. */
  const transition = (progress, aspect, cursor = null) => {
    if (cursor) {
      const saved = cursor.snapshot();
      // A cabin cut rejoins its car's exterior before using the doorway.
      // The inspection request can restore the cabin after the safe return.
      if (saved.node?.endsWith("_cabin")) saved.node = saved.node.slice(0, 2);
      let returning = false;
      cursor.request("outside");
      return {
        reverse(on) { returning = on; cursor.request(on ? saved : "outside"); },
        seekOutside() { cursor.request("outside", { cut: true }); },
        outside: () => copyPose(makePose(), tierOf(aspect).poses.outside),
        sample(dt, out = makePose()) { return { ...cursor.sample(dt, out), p: progress, returning }; },
      };
    }
    const start = clamp(progress, 0, 1);
    let p = start;
    let u = 0;
    // The timeline allocates unequal time to paths and holds. Exit travel
    // is measured on its actual route, so a short p interval cannot make
    // the camera leap metres in one frame.
    const distances = [0];
    let previous = at(0, aspect);
    const samples = 4096;
    for (let i = 1; i <= samples; i++) {
      const next = at(i / samples, aspect);
      distances.push(distances[i - 1] + previous.position.distanceTo(next.position));
      previous = next;
    }
    const scaled = start * samples;
    const index = Math.min(samples - 1, Math.floor(scaled));
    const origin = distances[index] + (distances[index + 1] - distances[index]) * (scaled - index);
    let distance = origin;
    const speed = distances[samples] / 4;
    const progressAt = (d) => {
      if (d >= origin) return start;
      let lo = 0;
      let hi = samples;
      while (hi - lo > 1) {
        const middle = (lo + hi) >> 1;
        if (distances[middle] <= d) lo = middle;
        else hi = middle;
      }
      return (lo + (d - distances[lo]) / Math.max(1e-9, distances[hi] - distances[lo])) / samples;
    };
    const points = [...entry(aspect), tierOf(aspect).poses.arrival.position].reverse();
    // Outdoor arcs start at the graph's street node, beyond the facade,
    // rather than immediately against the opening's exterior lip.
    const outsideNode = anchors.get("anchor_garage_node_outside")?.position ?? exit(aspect).at(-1);
    if (outsideNode && points.at(-1).distanceTo(outsideNode) > 1e-6) points.push(outsideNode);
    const outside = makePose();
    outside.position.copy(points[points.length - 1]);
    outside.target.copy(points[Math.max(0, points.length - 2)]);
    outside.fov = tierOf(aspect).poses.arrival.fov;
    let returning = false;
    return {
      reverse(on) { returning = on; },
      seekOutside() { distance = 0; p = 0; u = 1; },
      outside: () => copyPose(makePose(), outside),
      sample(dt, out = makePose()) {
        if (returning) {
          if (u > 0) u = Math.max(0, u - dt / 1.6);
          else { distance = Math.min(origin, distance + dt * speed); p = progressAt(distance); }
        } else if (distance > 0) { distance = Math.max(0, distance - dt * speed); p = progressAt(distance); }
        else u = Math.min(1, u + dt / 1.6);
        if (u === 0) at(p, aspect, out);
        else {
          curveAt(points, u, out.position);
          const arrival = tierOf(aspect).poses.arrival;
          out.target.copy(arrival.target).lerp(outside.target, smooth01(u));
          out.fov = arrival.fov;
          out.shift = 0;
        }
        return { pose: out, p, u, done: returning ? u === 0 && p === start : u === 1, returning };
      },
    };
  };

  return {
    at,
    navigator,
    route: (from, to, aspect) => route(from, to, aspect).path,
    locationAt,
    segments: (aspect) => edges.map((edge) => ({ ...edge, length: pathOf(edge.id, edge.from, edge.into, aspect).length })),
    transition,
    sample,
    stateAt,
    stationAt,
    activeCarAt: (p) => {
      const s = stretchAt(clamp(p, 0, 1));
      const key = s.hold ?? (p < (s.start + s.to) / 2 ? s.from : s.into);
      return key.startsWith("s4") ? "s4" : key.startsWith("s6") ? "s6" : null;
    },
    entry,
    exit,
    pose: (key, aspect, out = makePose()) => {
      const pose = tierOf(aspect).poses[key];
      return pose ? copyPose(out, pose) : null;
    },
    /** The poses and paths still the plan's stand-ins, not the kit's. */
    placeholders: [...placeholders],
  };
}

/** Camera collision uses separate solids, never render visibility. Returned
 *  rows are copies, so consumers cannot alter the workshop's collision data. */
export function createGarageCollision({ solids = () => [], cars = () => [] } = {}) {
  const rows = () => [...solids().filter((row) => row.camera !== false && Number(row.camera) !== 0), ...cars()];
  const betweenBoxes = (a, b) => Math.hypot(
    Math.max(0, a.min.x - b.max.x, b.min.x - a.max.x),
    Math.max(0, a.min.y - b.max.y, b.min.y - a.max.y),
    Math.max(0, a.min.z - b.max.z, b.min.z - a.max.z),
  );
  return {
    get solids() { return Object.freeze(solids().map((row) => Object.freeze({ ...row, box: row.box.clone() }))); },
    cars: () => cars().map((row) => ({ ...row, box: row.box.clone(), matrixWorld: row.matrixWorld?.clone() })),
    clearance(point) { return rows().reduce((distance, row) => Math.min(distance, row.box.distanceToPoint(point)), Infinity); },
    sweep(a, b, radius = .45) {
      const direction = new THREE.Vector3().subVectors(b, a);
      const length = direction.length();
      const ray = new THREE.Ray(a, direction.clone().normalize());
      let t = 1;
      for (const { box } of rows()) {
        const expanded = box.clone().expandByScalar(radius);
        if (expanded.containsPoint(a)) { t = 0; break; }
        const hit = ray.intersectBox(expanded, new THREE.Vector3());
        if (hit && length > 0) t = Math.min(t, hit.distanceTo(a) / length);
      }
      return { ok: t >= 1, t: clamp(t, 0, 1), point: a.clone().lerp(b, clamp(t, 0, 1)) };
    },
    nearPlane(pose, aspect, near = .1) {
      const forward = new THREE.Vector3().subVectors(pose.target, pose.position).normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward);
      if (pose.roll) {
        const rotation = new THREE.Quaternion().setFromAxisAngle(forward, -pose.roll);
        right.applyQuaternion(rotation);
        up.applyQuaternion(rotation);
      }
      const height = near * Math.tan(pose.fov * Math.PI / 360);
      const center = pose.position.clone().addScaledVector(forward, near).addScaledVector(up, -(pose.shift ?? 0) * height);
      const bounds = new THREE.Box3();
      for (const x of [-1, 1]) for (const y of [-1, 1]) bounds.expandByPoint(center.clone().addScaledVector(right, x * height * aspect).addScaledVector(up, y * height));
      // The oriented rectangle's bounding box is conservative. It may
      // reject a tight turn, but cannot grant clearance through a solid.
      return rows().reduce((distance, row) => Math.min(distance, betweenBoxes(bounds, row.box)), Infinity);
    },
  };
}
