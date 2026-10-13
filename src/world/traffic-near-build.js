// src/world/traffic-near-build.js: a car's close-up model as one geometry
// (traffic.js, the level drawn for the cars close by), without what its
// roof carries: its parts joined, each tagged with the cars' surface it is
// (`parts`, traffic.js CAR_PARTS), with the model's own normals (smooth
// over its panels, hard at its creases and cuts). Made on a worker
// (traffic-near-worker.js), where its tenth of a second or two is no
// frame's, or on the page where there is none.
import * as THREE from "three";
import { createObject as createNearBase, KINDS as NEAR_BASE } from "./traffic-cars-near.js";
import { createObject as createNearShow, KINDS as NEAR_SHOW } from "./traffic-cars-near-nc.js";
import { joined } from "./traffic-lod.js";

export const NEAR_KINDS = [...NEAR_BASE, ...NEAR_SHOW];

export function nearBody(kind, parts) {
  const model = NEAR_BASE.includes(kind) ? createNearBase(kind) : NEAR_SHOW.includes(kind) ? createNearShow(kind) : null;
  model.updateMatrixWorld(true);
  const out = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    const k = parts[o.material?.name];
    if (k === undefined) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    if (g.attributes.normal === undefined) g.computeVertexNormals();
    g.applyMatrix4(o.matrixWorld);
    g.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(k), 1));
    out.push(g);
  });
  const geometry = joined(out);
  model.traverse((o) => o.isMesh && o.geometry.dispose());
  return geometry;
}
