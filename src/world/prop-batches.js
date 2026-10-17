// Static prototype geometry stays shared while compatible opaque props use
// one GPU batch. Each pass keeps its own immutable draw-ID texture, so a
// mirror does not dirty the direct camera's data on every frame.
import * as THREE from "three";
import { attributeKey } from "./merge.js";

export function createPropBatches(sets, group, copyMaterial) {
  const groups = new Map(), batches = [], textures = new Set();
  for (const set of sets) for (const source of set.instanced) {
    if (!source.material.isShaderMaterial || source.material.transparent && source.material.blending !== THREE.AdditiveBlending || set.name === "traffic_light" && source.material.name === "glow") continue;
    const geometry = new THREE.BufferGeometry();
    geometry.index = source.geometry.index;
    for (const [name, attribute] of Object.entries(source.geometry.attributes)) if (name !== "aDeal") geometry.setAttribute(name, attribute);
    const key = `${source.material.uuid}|${attributeKey(geometry)}|${source.layers.mask}|${source.renderOrder}|${source.userData.assetKind ?? ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ set, source, geometry });
  }
  for (const parts of groups.values()) {
    if (parts.length < 2) { parts[0].geometry.dispose(); continue; }
    const material = copyMaterial(parts[0].source.material, "prototype-batch", parts[0].geometry);
    material.userData.sortId = parts[0].source.material.userData.sortId ?? parts[0].source.material.id;
    if (!material.userData.prototypeBatch) {
      material.userData.prototypeBatch = true;
      material.vertexShader = "#include <batching_pars_vertex>\n" + material.vertexShader
      .replace(/attribute\s+float\s+aDeal\s*;/g, "")
      .replace(/\baDeal\b/g, "_batchDeal")
      .replace(/\binstanceMatrix\b/g, "batchingMatrix")
      .replace(/\bUSE_INSTANCING\b/g, "USE_BATCHING")
      .replace(/void\s+main\s*\(\s*\)\s*\{/, "void main() {\n#include <batching_vertex>\nfloat _batchDeal = getBatchingColor(getIndirectIndex(gl_DrawID)).r;\n");
    }
    const mesh = new THREE.BatchedMesh(parts.reduce((n, p) => n + p.set.n, 0), parts.reduce((n, p) => n + p.geometry.attributes.position.count, 0), parts.reduce((n, p) => n + p.geometry.index.count, 0), material);
    mesh.name = `props_batch_${material.name}`;
    mesh.layers.mask = parts[0].source.layers.mask;
    mesh.renderOrder = parts[0].source.renderOrder;
    mesh.userData = { ...parts[0].source.userData };
    mesh.frustumCulled = mesh.perObjectFrustumCulled = mesh.sortObjects = false;
    mesh.matrixAutoUpdate = false;
    // These are the native BatchedMesh commands, prepared from the exact
    // prop runs below instead of traversing all city instances per draw.
    mesh.onBeforeRender = () => {};
    textures.add(mesh._indirectTexture);
    const matrix = new THREE.Matrix4(), color = new THREE.Vector4();
    for (const part of parts) {
      const geometryId = mesh.addGeometry(part.geometry);
      part.range = mesh.getGeometryRangeAt(geometryId);
      part.ids = new Int32Array(part.set.n);
      for (let j = 0; j < part.set.n; j++) {
        const id = mesh.addInstance(geometryId); part.ids[j] = id;
        mesh.setMatrixAt(id, matrix.fromArray(part.set.matrices, j * 16));
        mesh.setColorAt(id, color.set(part.source.material.userData.dealt ? part.set.deals[j] : 0, 0, 0, 1));
      }
      if (part.source.material.userData.dealt) (part.set.batchDeals ??= []).push({ mesh, ids: part.ids });
      part.source.removeFromParent();
      part.geometry.dispose();
    }
    group.add(mesh);
    batches.push({ mesh, parts, views: new WeakMap() });
  }
  return {
    update(camera) {
      for (const { mesh, parts, views } of batches) {
        let view = views.get(camera);
        const signature = parts.map((p) => p.set.sig).join(",");
        if (!view) {
          const image = mesh._indirectTexture.image;
          const texture = new THREE.DataTexture(new Uint32Array(image.data.length), image.width, image.height, THREE.RedIntegerFormat, THREE.UnsignedIntType);
          texture.name = "static prop draw IDs"; textures.add(texture);
          view = { texture, starts: new Int32Array(mesh._maxInstanceCount), counts: new Int32Array(mesh._maxInstanceCount), signature: null, count: 0 };
          views.set(camera, view);
        }
        if (view.signature !== signature) {
          let at = 0;
          const bytes = mesh.geometry.index.array.BYTES_PER_ELEMENT;
          for (const part of parts) for (const run of part.set.selected?.runs ?? []) for (let j = run.start; j < run.end; j++) {
            view.starts[at] = part.range.start * bytes; view.counts[at] = part.range.count;
            view.texture.image.data[at++] = part.ids[j];
          }
          view.count = at; view.signature = signature; view.texture.needsUpdate = true;
        }
        mesh.visible = view.count > 0;
        mesh._multiDrawStarts = view.starts; mesh._multiDrawCounts = view.counts;
        mesh._multiDrawCount = view.count; mesh._indirectTexture = view.texture;
        mesh._multiDrawBytesPerElement = mesh.geometry.index.array.BYTES_PER_ELEMENT;
      }
    },
    dispose() {
      for (const { mesh } of batches) { textures.delete(mesh._indirectTexture); mesh.dispose(); mesh.geometry.dispose(); }
      for (const texture of textures) texture.dispose();
    },
  };
}
