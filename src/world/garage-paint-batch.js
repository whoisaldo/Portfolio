// The S4's plain paint already shares one material. Keep its eleven rig
// meshes as physical/query nodes and submit their unchanged geometry in
// one batch. World matrices stay exact, including during parked queries.
import * as THREE from "three";
import { attributeKey } from "./merge.js";

export function createGaragePaintBatch(root) {
  const parts = [];
  root.traverse((node) => {
    if (node.isMesh && node.material?.name === "s4_paint" && !node.material.transparent) parts.push({ node, layers: node.layers.mask });
  });
  if (parts.length < 2 || parts.some(({ node }) => node.children.length || node.material !== parts[0].node.material || node.layers.mask !== parts[0].layers || attributeKey(node.geometry) !== attributeKey(parts[0].node.geometry))) return null;
  const batch = new THREE.BatchedMesh(parts.length, parts.reduce((n, p) => n + p.node.geometry.attributes.position.count, 0), parts.reduce((n, p) => n + p.node.geometry.index.count, 0), parts[0].node.material);
  batch.name = "garage_s4_paint_batch";
  batch.layers.mask = parts[0].layers;
  batch.frustumCulled = batch.perObjectFrustumCulled = batch.sortObjects = false;
  batch.matrixAutoUpdate = batch.matrixWorldAutoUpdate = false;
  batch.userData.garagePaintBatch = true;
  const values = new Float32Array(16);
  let disposed = false;
  for (const part of parts) {
    part.id = batch.addInstance(batch.addGeometry(part.node.geometry));
    part.previous = new Float32Array(16).fill(NaN);
    part.node.layers.mask = 0;
    if (!part.node.geometry.boundingBox) part.node.geometry.computeBoundingBox();
  }
  const update = () => {
    if (disposed) return;
    for (const part of parts) {
      part.node.updateWorldMatrix(true, false);
      values.set(part.node.matrixWorld.elements);
      if (values.some((v, i) => v !== part.previous[i])) {
        batch.setMatrixAt(part.id, part.node.matrixWorld);
        part.previous.set(values);
        batch.boundingBox = batch.boundingSphere = null;
      }
    }
    // The original rig nodes remain the complete physical query source.
    // This duplicate submission geometry lives in world space.
    batch.matrixWorld.identity();
  };
  batch.updateMatrixWorld = update;
  batch.updateWorldMatrix = update;
  root.add(batch);
  update();
  return {
    mesh: batch,
    dispose() {
      if (disposed) return;
      disposed = true;
      batch.removeFromParent(); batch.dispose(); batch.geometry.dispose();
      for (const part of parts) part.node.layers.mask = part.layers;
    },
  };
}
