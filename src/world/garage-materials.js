// src/world/garage-materials.js: the workshop's own surfaces.
//
// The rest of the city is dressed from a handful of pictures the core
// carries (materials.js), and a streamed pack's own pictures are stripped
// out on the way: a district is the kit's materials on new geometry. The
// garage's room is the one pack with pictures of its own, a painted and
// tiled wall, a satin concrete floor with its tyre marks and oil, and the
// Smasher print over the bench, and they arrive with it, long
// after the kit's materials were made. So they are taken off the pack's
// own glTF materials as each is dressed (`forName`), before the pack's
// material is thrown away, and a material is made for each with them.
//
// What a material needs is written on it: its glTF extras (Blender's
// custom properties) carry `runtime` (which of the four below), `slots`
// (the pictures it must have) and `params` (agents/B5/CONTRACT.md 1.4). A
// slot it says it has and does not is not quietly drawn plain: `missing`
// lists it and the garage is not ready (world-scene.js).
//
// Three programs of its own at most: ANGLE's Metal backend keeps 96 render
// pipelines a frame and the city is near that already (props.js, Baked).
// The threshold's wet strip is the city's own sealed-floor program (wet.js,
// through the kit) and adds none.
import * as THREE from "three";
import { COMMON, VERT_WORLD } from "./glsl.js";

const MAX_RECTS = 8;

// glTF slot -> where three's GLTFLoader puts it, and its colour space.
const SLOTS = {
  baseColor: { key: "map", srgb: true },
  metallicRoughness: { key: "roughnessMap", srgb: false },
  normal: { key: "normalMap", srgb: false },
  emissive: { key: "emissiveMap", srgb: true },
};

const OUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/**
 * The workshop's materials, made on first ask from the pack's own. `kit`
 * is the city's material kit (for the threshold's wet floor).
 */
export function createGarageMaterials(shared, { kit, maxAnisotropy = 8 } = {}) {
  const made = new Map();
  const textures = new Set();
  const records = new Map();
  let boards = null;
  const json = (value, fallback) => {
    if (typeof value !== "string") return value ?? fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  };
  const rects = {
    uRects: { value: 0 },
    uCorner: { value: Array.from({ length: MAX_RECTS }, () => new THREE.Vector3()) },
    uAxisU: { value: Array.from({ length: MAX_RECTS }, () => new THREE.Vector3()) },
    uAxisV: { value: Array.from({ length: MAX_RECTS }, () => new THREE.Vector3()) },
    uFacing: { value: Array.from({ length: MAX_RECTS }, () => new THREE.Vector3()) },
    uRectTint: { value: Array.from({ length: MAX_RECTS }, () => new THREE.Vector3()) },
    uTubeLit: { value: Array.from({ length: MAX_RECTS }, () => 0) },
  };

  /** The pictures the pack's material `source` says it has, made ours:
   *  the right colour space, wrapping and filtering, each once. */
  const take = (name, source) => {
    const declared = [].concat(json(source.userData?.slots, []));
    const wrap = source.userData?.wrap === "clamp" ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    const maps = {};
    records.set(name, { declared, maps, runtime: source.userData?.runtime });
    for (const slot of declared) {
      const spec = SLOTS[slot];
      const tex = slot === "baseColor" && /shop_photos/.test(name) ? boards ?? source[spec.key] : spec ? source[spec.key] : null;
      if (!tex) {
        continue;
      }
      tex.colorSpace = spec.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.wrapS = tex.wrapT = wrap;
      tex.anisotropy = Math.min(8, maxAnisotropy);
      tex.needsUpdate = true;
      textures.add(tex);
      maps[slot] = tex;
    }
    return maps;
  };

  // ---- the satin floor --------------------------------------------------------
  // Sealed concrete with a satin sheen, not water: its own picture for the
  // colour, the tyre tracks and the oil, its own roughness map for where
  // the sheen is worn, and the room's lights held in it as wet.js holds
  // them, smeared far more where it is rough. No room-wide mirror.
  const satinFloor = (name, maps, params) => {
    const [r0, r1] = params.roughness ?? [0.42, 0.78];
    const m = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        ...rects,
        uMap: { value: maps.baseColor ?? null },
        uRough: { value: maps.metallicRoughness ?? null },
        uNormal: { value: maps.normal ?? null },
        uHasNormal: { value: maps.normal ? 1 : 0 },
        uBase: { value: new THREE.Color(params.baseTint ?? "#ffffff") },
        uRoughRange: { value: new THREE.Vector2(r0, r1) },
        uUvScale: { value: new THREE.Vector2(...(params.uvScale ?? [1, 1])) },
      },
      defines: { MAX_RECTS },
      vertexShader: VERT_WORLD,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform sampler2D uMap;
        uniform sampler2D uRough;
        uniform sampler2D uNormal;
        uniform float uHasNormal;
        uniform vec3 uBase;
        uniform vec2 uRoughRange;
        uniform vec2 uUvScale;
        uniform int uRects;
        uniform vec3 uCorner[MAX_RECTS];
        uniform vec3 uAxisU[MAX_RECTS];
        uniform vec3 uAxisV[MAX_RECTS];
        uniform vec3 uFacing[MAX_RECTS];
        uniform vec3 uRectTint[MAX_RECTS];
        uniform float uTubeLit[MAX_RECTS];
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;

        vec2 hit(vec3 p, vec3 r, int i, vec3 n, out float t) {
          float den = dot(r, n);
          t = abs(den) < 1e-4 ? 0.0 : dot(uCorner[i] - p, n) / den;
          vec3 d = p + r * t - uCorner[i];
          return vec2(dot(d, uAxisU[i]) / dot(uAxisU[i], uAxisU[i]), dot(d, uAxisV[i]) / dot(uAxisV[i], uAxisV[i]));
        }
        float box(vec2 s, float e) {
          vec2 a = smoothstep(-e, e, s) * smoothstep(1.0 + e, 1.0 - e, s);
          return a.x * a.y;
        }
        float tubesOn() {
          if (uTubeClock < 0.0) return 0.0;
          float catching = step(0.5, hash12(vec2(floor(uTubeClock * 20.0), 7.0)));
          return uTubeClock > 0.6 ? 1.0 : catching * smoothstep(0.0, 0.6, uTubeClock);
        }

        void main() {
          vec2 uv = vUv * uUvScale;
          vec3 albedo = texture2D(uMap, uv).rgb * uBase;
          float rough = mix(uRoughRange.x, uRoughRange.y, texture2D(uRough, uv).g);
          vec3 V = normalize(vWorld - uCam);
          vec2 bump = uHasNormal > 0.5 ? (texture2D(uNormal, uv).xy * 2.0 - 1.0) * 0.04 : vec2(0.0);
          vec3 R = normalize(vec3(V.x + bump.x, -V.y, V.z + bump.y));
          vec3 R2 = normalize(R + vec3(0.0, 0.02, 0.0));
          float fres = 0.04 + 0.96 * pow(1.0 - clamp(-V.y, 0.0, 1.0), 5.0);
          float on = tubesOn();
          vec3 light = vec3(0.02) + spillAt(vWorld) * 1.2 + lampsAt(vWorld, vec3(0.0, 1.0, 0.0)) * 1.2 + garageRoom(vWorld) * 1.6;
          vec3 refl = vec3(0.0);
          for (int i = 0; i < MAX_RECTS; i++) {
            if (i >= uRects) break;
            bool oneSided = dot(uFacing[i], uFacing[i]) > 0.25;
            vec3 n = oneSided ? uFacing[i] : normalize(cross(uAxisU[i], uAxisV[i]));
            if (oneSided && dot(R, n) > -1e-3) continue;
            float t;
            vec2 st = hit(vWorld, R, i, n, t);
            if (t <= 0.0) continue;
            float t2;
            vec2 smear = (hit(vWorld, R2, i, n, t2) - st) * rough * 6.0;
            float edge = 0.03 + 0.08 * rough;
            float inside = 0.0;
            for (int k = -2; k <= 2; k++) inside += box(st + smear * float(k) * 0.5, edge);
            refl += uRectTint[i] * inside / 5.0 * mix(1.0, on, uTubeLit[i]);
          }
          // A satin floor holds a light as a soft pool, never a mirror.
          float sheen = (1.0 - rough) * 0.55;
          vec3 col = albedo * light + refl * fres * sheen;
          col = cityFog(col, vWorld, 0.0);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    });
    m.name = name;
    return m;
  };

  // ---- the painted wall ---------------------------------------------------------
  // Its own picture lit as the kit lights a wall: the street's light, the
  // lamps and, inside, the room's tubes once they strike.
  const paintedWall = (name, maps, params) => {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uMap: { value: maps.baseColor ?? null },
        uBase: { value: new THREE.Color(params.baseTint ?? "#ffffff") },
        uUvScale: { value: new THREE.Vector2(...(params.uvScale ?? [1, 1])) },
      },
      vertexShader: VERT_WORLD,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform sampler2D uMap;
        uniform vec3 uBase;
        uniform vec2 uUvScale;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          vec3 albedo = texture2D(uMap, vUv * uUvScale).rgb * uBase;
          vec3 n = normalize(vNormalW);
          vec3 light = vec3(0.03) + spillAt(vWorld) * 1.4 + lampsAt(vWorld, n) + garageRoom(vWorld) * 1.8;
          vec3 col = cityFog(albedo * light, vWorld, 0.0);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    });
    m.name = name;
    return m;
  };

  // ---- the photo boards -----------------------------------------------------------
  // Real photographs, pinned up: their own colours under the room's light,
  // never tinted as a sign is and never glowing.
  const photoBoard = (name, maps) => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...shared, uMap: { value: maps.baseColor ?? null } },
      vertexShader: VERT_WORLD,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform sampler2D uMap;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          vec3 albedo = texture2D(uMap, vUv).rgb;
          vec3 n = normalize(vNormalW);
          vec3 light = vec3(0.22) + lampsAt(vWorld, n) * 0.6 + garageRoom(vWorld) * 1.4;
          vec3 col = cityFog(albedo * light, vWorld, 0.0);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    });
    m.name = name;
    return m;
  };

  let threshold = null;

  return {
    /** Whether `name` (a glTF material's) is one of the workshop's own. */
    owns: (source) => /^NCW_garage_(workshop_(floor|wall)|threshold_wet|identity_poster|shop_photos)(\.\d+)?$/.test(typeof source === "string" ? source : source?.name ?? "") || Boolean(source?.name?.startsWith("NCW_garage_") && source.userData?.runtime),
    /**
     * The material for the pack's material `source`: made the first time,
     * from that material's own pictures and extras, the same one after.
     */
    forName(source) {
      const name = source.name.replace(/\.\d+$/, "");
      if (made.has(name)) {
        const material = made.get(name);
        const maps = take(name, source);
        for (const [slot, uniform] of [["baseColor", "uMap"], ["metallicRoughness", "uRough"], ["normal", "uNormal"]]) {
          if (material.uniforms?.[uniform]) material.uniforms[uniform].value = maps[slot] ?? null;
        }
        if (material.uniforms?.uHasNormal) material.uniforms.uHasNormal.value = maps.normal ? 1 : 0;
        return material;
      }
      const runtime = source.userData?.runtime;
      const params = json(source.userData?.params, {});
      let m = null;
      if (runtime === "threshold_wet" || name === "NCW_garage_threshold_wet") m = threshold ??= kit.forName("NCW_garage_floor");
      else {
        const maps = take(name, source);
        if (runtime === "satin_floor") m = satinFloor(name, maps, params);
        else if (runtime === "painted_wall") m = paintedWall(name, maps, params);
        else if (runtime === "photo_board") m = photoBoard(name, maps);

      }
      if (m) {
        // Blender's thin art and wall planes deliberately render on both
        // sides. Preserve that authored setting when replacing glTF PBR.
        m.side = source.side;
        made.set(name, m);
      }
      return m;
    },
    /** The external photo atlas (CONTRACT.md 1.4, source "external"),
     *  once fetched: the boards draw it. */
    setBoards(texture) {
      boards = texture;
      for (const [name, record] of records) if (/shop_photos/.test(name)) record.maps.baseColor = texture;
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, maxAnisotropy);
      texture.needsUpdate = true;
      textures.add(texture);
      for (const m of made.values()) if (/shop_photos/.test(m.name)) m.uniforms.uMap.value = texture;
    },
    /** The room's lights for the floor to hold: garage.js garageLights(). */
    setRects(list) {
      const n = Math.min(MAX_RECTS, list.length);
      rects.uRects.value = n;
      list.slice(0, n).forEach((r, i) => {
        rects.uCorner.value[i].copy(r.corner);
        rects.uAxisU.value[i].copy(r.u);
        rects.uAxisV.value[i].copy(r.v);
        if (r.normal) rects.uFacing.value[i].copy(r.normal).normalize();
        else rects.uFacing.value[i].set(0, 0, 0);
        rects.uRectTint.value[i].set(r.tint.r, r.tint.g, r.tint.b);
        rects.uTubeLit.value[i] = r.tube ? 1 : 0;
      });
    },
    /** Every declared picture that did not come: the garage is not ready. */
    get missing() {
      return [...records].flatMap(([name, { declared, maps, runtime }]) => [
        ...declared.filter((slot) => !maps[slot]).map((slot) => `${name}.${slot}`),
        ...(!["satin_floor", "painted_wall", "photo_board", "threshold_wet"].includes(runtime) ? [`${name}: no runtime`] : []),
      ]);
    },
    get report() {
      return [...records].map(([name, { declared, maps, runtime }]) => ({ name, runtime,
        slots: declared.map((slot) => ({ slot, bound: Boolean(maps[slot]), texture: maps[slot] ?? null })),
      }));
    },
    /** What this made: its own materials and the pack's pictures, once.
     *  (The threshold's material is the kit's and goes with the kit.) */
    dispose() {
      for (const m of made.values()) if (m !== threshold) m.dispose();
      textures.forEach((t) => t.dispose());
      made.clear();
      textures.clear();
    },
  };
}
