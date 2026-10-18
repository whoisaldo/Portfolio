// src/world/spill.js: the city's light, baked from its own signs at load.
//
// Two maps over the ground plane, both computed in a few tens of
// milliseconds from the emissive geometry the GLB already carries:
//
//   spill    every emissive triangle (sign, strip, shopfront, lamp) adds its
//            colour at its feet, then the grid is blurred at two radii: a
//            tight pool under each sign and a wide wash down the street.
//            Every surface samples it (src/world/glsl.js, spillAt).
//   streaks  the same light where the hero's eye would see it mirrored in
//            the wet road, smeared along the street: a sign at height h,
//            seen from an eye at height H, reflects at H/(H+h) of the way
//            from the eye to the sign, and on rough wet asphalt that point
//            stretches into a streak running down the street, which is most
//            of what the plate's road is. Baked for the avenue, where the
//            hero looks; it is the phone tier's whole reflection, and a
//            layer under the real planar reflection on desktop.
//
// Both are 8-bit, square-root encoded (the shaders square them back), which
// keeps the soft tails of the falloff without a float texture.
import * as THREE from "three";
import { createBakeCore, MAP, LIGHT_BOUNDS, STREAK_BOUNDS } from "./spill-core.js";

// (load: the bake itself is spill-core.js's, which a worker can run; this
// is its three.js side: sources from meshes, maps as textures.)
export { LIGHT_BOUNDS, CELL, STREAK_BOUNDS, SPILL_RANGE } from "./spill-core.js";

/** A source ({ mesh, color: THREE.Color (linear), intensity }) as the bake
 *  takes it: its positions as stored, its index, its world matrix. */
function raw({ mesh, color, intensity }) {
  if (mesh.matrixWorldAutoUpdate !== false) mesh.updateWorldMatrix(true, false);
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const data = pos.isInterleavedBufferAttribute ? pos.data : null;
  return {
    array: data ? data.array : pos.array,
    stride: data ? data.stride : pos.itemSize,
    offset: data ? pos.offset : 0,
    normalized: pos.normalized,
    index: geo.index ? geo.index.array : null,
    count: geo.index ? geo.index.count : pos.count,
    e: mesh.matrixWorld.elements,
    r: color.r,
    g: color.g,
    b: color.b,
    intensity,
  };
}

// (`made` false: a texture not to be sent to the GPU until it is filled.)
function texture(data, W, H, made = true) {
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  if (made) tex.needsUpdate = true;
  return tex;
}

/** The maps as textures: { spill, streaks, bounds, streakBounds: Vector4
 *  for the shaders, dispose }. */
function maps({ spill, streaks }, made = true) {
  const { x0, z0, x1, z1 } = LIGHT_BOUNDS;
  const a = texture(spill, MAP.W, MAP.H, made);
  const b = texture(streaks, MAP.SW, MAP.SH, made);
  return {
    spill: a,
    streaks: b,
    bounds: new THREE.Vector4(x0, z0, 1 / (x1 - x0), 1 / (z1 - z0)),
    streakBounds: new THREE.Vector4(STREAK_BOUNDS.x0, STREAK_BOUNDS.z0, 1 / (STREAK_BOUNDS.x1 - STREAK_BOUNDS.x0), 1 / (STREAK_BOUNDS.z1 - STREAK_BOUNDS.z0)),
    dispose() {
      a.dispose();
      b.dispose();
    },
  };
}

/**
 * The bake, in pieces: `add(sources)` as each part of the city arrives (the
 * core, then each streamed pack), `finish()` for the maps of everything
 * added so far (new textures each time; the caller disposes the old).
 * sources: [{ mesh, color: THREE.Color (linear), intensity }].
 */
export function createBake() {
  const core = createBakeCore();
  return {
    add: (sources) => core.add(sources.map(raw)),
    /** (load) add, a generator: some thousands of triangles a step. */
    addSteps: (sources) => core.addSteps(sources.map(raw)),
    addPoints: core.addPoints,
    finish: () => maps(core.finish()),
    /** finish, a step at a time: `between()` resolves when the page has a
     *  moment between its frames (at once while that moment lasts). */
    finishSliced: async (between) => maps(await core.finishSliced(between)),
    release: core.release,
    /**
     * (load) add and addPoints (each of `points` a flat list, as addPoints
     * takes) and finish, on a worker, off the page's thread: returns the
     * maps at once, as textures the size they will be, empty and not yet
     * to be sent to the GPU (the warm-up waits for a picture that is not),
     * and `ready`, which fills them and resolves when the worker is done
     * (the bake then goes on from what the worker added, for the
     * districts).
     * Where there is no worker, or it fails, the bake is made here, as
     * before. The sources are copied to the worker as this is called.
     */
    finishElsewhere(sources, points) {
      const light = maps({ spill: new Uint8Array(MAP.W * MAP.H * 4), streaks: new Uint8Array(MAP.SW * MAP.SH * 4) }, false);
      const fill = ({ spill, streaks }) => {
        light.spill.image.data.set(spill);
        light.spill.needsUpdate = true;
        light.streaks.image.data.set(streaks);
        light.streaks.needsUpdate = true;
      };
      const here = () => {
        core.add(list);
        for (const p of points) core.addPoints(p);
        fill(core.finish());
      };
      const list = sources.map(raw);
      let worker = null;
      try {
        worker = new Worker(new URL("./spill-worker.js", import.meta.url), { type: "module" });
      } catch {
        worker = null;
      }
      if (!worker) {
        here();
        light.ready = Promise.resolve(light);
        return light;
      }
      light.ready = new Promise((resolve) => {
        const done = (made) => {
          worker.terminate();
          if (made) {
            core.adopt(made.state);
            fill(made.maps);
          } else here();
          resolve(light);
        };
        worker.onmessage = ({ data }) => done(data);
        worker.onerror = () => done(null);
        worker.postMessage({ sources: list, points });
      });
      return light;
    },
  };
}
