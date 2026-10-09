// src/three/car/slim.js: the S4 in few draws.
//
// Shared by the city's car (src/world/car.js) and the garage's viewer
// (src/lib/garage-scene.js). The model is some 150 parts, each its own
// material, because it is a model of a car and not a game asset; drawn as
// they come that is 150 draws a pass, and the viewer draws three passes (its
// key light's shadow, the ambient occlusion's depth, the picture).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { attributeKey, mergeMeshes } from "../../world/merge.js";

// The nodes the rig moves. Everything else on the car is rigid.
export const RIG = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr", "steer_fl", "steer_fr"];
// And the hood's, which the viewer opens: the hinge carries the panels, the
// strut's tube and rod are set from its base and its mount.
export const HOOD_RIG = ["hood_hinge", "hood_strut_tube", "hood_strut_rod", "hood_strut_base", "hood_strut_mount"];

// What a shut hood hides: the engine bay, the hood's lining and its struts.
// The city never opens the hood (the garage's viewer does), so it leaves
// them out, of the car and of its mirror.
export const UNDER_HOOD = /^S4_(engine_carbon|engine_textured_plastic|cast_supercharger_housing|coolant_reservoir|reservoir_cap_blue|hood_acoustic_liner)(\.|$)/;
export const underHood = (o, car) => {
  if (UNDER_HOOD.test(o.material.name)) return true;
  for (let p = o; p && p !== car; p = p.parent) if (p.name === "engine_bay" || p.name.startsWith("hood_strut_")) return true;
  return false;
};

// A part with no picture on it and nothing to see through.
const plain = (m) => !m.transparent && !Object.values(m).some((v) => v?.isTexture);

/**
 * One material for every plain part of the car. Each is the same double-
 * sided physical material with its own colour, roughness, metalness and
 * clearcoat, so those four ride on the vertices instead (`color`, and
 * `surface` for the other three) and the shading is what each part's own
 * material gave it.
 */
function paintMaterial(like) {
  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 1,
    clearcoat: 1,
    clearcoatRoughness: like.clearcoatRoughness,
    side: like.side,
  });
  material.name = "s4_paint";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 surface;\nvarying vec3 vSurface;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n\tvSurface = surface;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSurface;")
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = roughness * vSurface.x;")
      .replace("#include <metalnessmap_fragment>", "float metalnessFactor = metalness * vSurface.y;")
      .replace(
        "#include <lights_physical_fragment>",
        THREE.ShaderChunk.lights_physical_fragment.replace("material.clearcoat = clearcoat;", "material.clearcoat = clearcoat * vSurface.z;"),
      );
  };
  material.customProgramCacheKey = () => "s4_paint";
  return material;
}

/**
 * The S4 in few draws. Every plain part carried by the same rig node (a
 * wheel, a knuckle, or the body) becomes one mesh on the shared paint
 * material, so the wheels still turn and steer; the parts with pictures
 * on them (lamps, carbon, plates) and the clear lenses keep a mesh per
 * material. About 150 parts become about a dozen draws. `rig` is every
 * node that moves (its parts stay its own); `keepUnderHood` keeps the engine
 * bay for a viewer that opens the hood. Returns what it made, for dispose().
 */
export function slim(car, { rig = RIG, keepUnderHood = false } = {}) {
  car.updateMatrixWorld(true);
  const rigNodes = new Set(rig.map((n) => car.getObjectByName(n)).filter(Boolean));
  const ownerOf = (o) => {
    for (let p = o.parent; p && p !== car; p = p.parent) if (rigNodes.has(p)) return p;
    return car;
  };
  const painted = new Map();
  const groups = new Map();
  const hidden = [];
  let like = null;
  car.traverse((o) => {
    if (!o.isMesh || rigNodes.has(o) || Array.isArray(o.material)) return;
    if (!keepUnderHood && underHood(o, car)) {
      hidden.push(o);
      return;
    }
    const owner = ownerOf(o);
    if (plain(o.material)) {
      like ??= o.material;
      const key = `${owner.uuid}|${o.renderOrder}`;
      if (!painted.has(key)) painted.set(key, { owner, meshes: [] });
      painted.get(key).meshes.push(o);
      return;
    }
    const key = `${owner.uuid}|${o.material.uuid}|${attributeKey(o.geometry)}|${o.renderOrder}`;
    if (!groups.has(key)) groups.set(key, { owner, meshes: [] });
    groups.get(key).meshes.push(o);
  });
  for (const o of hidden) o.removeFromParent();
  const made = [];
  const paint = like ? paintMaterial(like) : null;
  for (const { owner, meshes } of painted.values()) {
    const parts = meshes.map((o) => {
      const g = mergeMeshes([o], owner, ["position", "normal"]);
      if (!g.attributes.normal) g.computeVertexNormals();
      const m = o.material;
      const n = g.attributes.position.count;
      const color = new Float32Array(n * 3);
      const surface = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        m.color.toArray(color, i * 3);
        surface[i * 3] = m.roughness;
        surface[i * 3 + 1] = m.metalness;
        surface[i * 3 + 2] = m.clearcoat;
      }
      g.setAttribute("color", new THREE.BufferAttribute(color, 3));
      g.setAttribute("surface", new THREE.BufferAttribute(surface, 3));
      return g;
    });
    const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
    if (parts.length > 1) parts.forEach((g) => g.dispose());
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, paint);
    mesh.name = "s4_paint";
    mesh.renderOrder = meshes[0].renderOrder;
    owner.add(mesh);
    for (const o of meshes) o.removeFromParent();
    made.push(geometry);
  }
  for (const { owner, meshes } of groups.values()) {
    if (meshes.length < 2) continue;
    const geometry = mergeMeshes(meshes, owner);
    const mesh = new THREE.Mesh(geometry, meshes[0].material);
    mesh.renderOrder = meshes[0].renderOrder;
    owner.add(mesh);
    for (const m of meshes) m.removeFromParent();
    made.push(geometry);
  }
  return { geometries: made, material: paint };
}
