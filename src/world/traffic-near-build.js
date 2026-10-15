// src/world/traffic-near-build.js: a car's close-up model as one geometry
// (traffic.js, the level drawn for the cars close by), without what its
// roof carries: its parts joined, each tagged with the cars' surface it is
// (`parts`, traffic.js CAR_PARTS), each shaded smooth over its shallow
// edges and hard at its creases and cuts. Made on a worker
// (traffic-near-worker.js), where its tenth of a second or two is no
// frame's, or on the page where there is none.
import * as THREE from "three";
import { createObject as createNearBase, KINDS as NEAR_BASE } from "./traffic-cars-near.js";
import { createObject as createNearShow, KINDS as NEAR_SHOW } from "./traffic-cars-near-nc.js";
import { creased, joined } from "./traffic-lod.js";

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
    g.applyMatrix4(o.matrixWorld);
    // Each surface shaded smooth across its shallow edges (a curved flank
    // is built of strips, and each strip's flat face gave back its own
    // piece of the street: a panel in stripes), hard at its creases and
    // where one surface meets another.
    const smooth = creased(g, 0.5);
    smooth.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(smooth.attributes.position.count).fill(k), 1));
    out.push(smooth);
  });
  const geometry = joined(out);
  model.traverse((o) => o.isMesh && o.geometry.dispose());
  return geometry;
}
