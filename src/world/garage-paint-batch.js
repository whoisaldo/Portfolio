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
  if (parts.length < 2 || parts.some(({ node }) => node.children.length || node.material !== parts[0].node.material || node.layers.mask !== parts[0].layers || node.renderOrder !== parts[0].node.renderOrder || attributeKey(node.geometry) !== attributeKey(parts[0].node.geometry))) return null;
  const sourceMaterial = parts[0].node.material, material = sourceMaterial.clone();
  material.userData = { ...sourceMaterial.userData, sortId: sourceMaterial.userData.sortId ?? sourceMaterial.id };
  const uniforms = { uGaragePaintView: { value: null }, uGaragePaintNormal: { value: null } };
  material.onBeforeCompile = (shader, renderer) => {
    sourceMaterial.onBeforeCompile(shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
      uniform sampler2D uGaragePaintView;
      uniform sampler2D uGaragePaintNormal;
      mat4 garagePaintView(float id) {
        int row = int(id);
        return mat4(texelFetch(uGaragePaintView, ivec2(0,row),0), texelFetch(uGaragePaintView, ivec2(1,row),0), texelFetch(uGaragePaintView, ivec2(2,row),0), texelFetch(uGaragePaintView, ivec2(3,row),0));
      }
      mat3 garagePaintNormal(float id) {
        int row = int(id);
        return mat3(texelFetch(uGaragePaintNormal, ivec2(0,row),0).xyz, texelFetch(uGaragePaintNormal, ivec2(1,row),0).xyz, texelFetch(uGaragePaintNormal, ivec2(2,row),0).xyz);
      }`)
      .replace("#include <project_vertex>", `vec4 mvPosition = garagePaintView(getIndirectIndex(gl_DrawID)) * vec4(transformed,1.0); gl_Position = projectionMatrix * mvPosition;`)
      .replace("#include <defaultnormal_vertex>", `vec3 transformedNormal = garagePaintNormal(getIndirectIndex(gl_DrawID)) * objectNormal;
        #ifdef FLIP_SIDED
          transformedNormal = -transformedNormal;
        #endif`);
  };
  material.customProgramCacheKey = () => sourceMaterial.customProgramCacheKey() + ":garage-exact-view-batch";
  const views = new WeakMap(), textures = new Set();
  const batch = new THREE.BatchedMesh(parts.length, parts.reduce((n, p) => n + p.node.geometry.attributes.position.count, 0), parts.reduce((n, p) => n + p.node.geometry.index.count, 0), material);
  batch.name = "garage_s4_paint_batch";
  batch.layers.mask = parts[0].layers;
  batch.renderOrder = parts[0].node.renderOrder;
  batch.frustumCulled = batch.perObjectFrustumCulled = batch.sortObjects = false;
  batch.matrixAutoUpdate = batch.matrixWorldAutoUpdate = false;
  batch.userData.garagePaintBatch = true;
  const values = new Float32Array(16);
  let disposed = false;
  for (const part of parts) {
    const geometryId = batch.addGeometry(part.node.geometry);
    part.range = batch.getGeometryRangeAt(geometryId);
    part.id = batch.addInstance(geometryId);
    part.previous = new Float32Array(16).fill(NaN);
    part.node.layers.mask = 0;
    if (!part.node.geometry.boundingBox) part.node.geometry.computeBoundingBox();
    if (!part.node.geometry.boundingSphere) part.node.geometry.computeBoundingSphere();
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
  textures.add(batch._indirectTexture);
  batch.onBeforeRender = function (_renderer, _scene, camera) {
    let view = views.get(camera);
    if (!view) {
      const viewData = new Float32Array(parts.length * 16), normalData = new Float32Array(parts.length * 12);
      const viewTexture = new THREE.DataTexture(viewData, 4, parts.length, THREE.RGBAFormat, THREE.FloatType);
      const normalTexture = new THREE.DataTexture(normalData, 3, parts.length, THREE.RGBAFormat, THREE.FloatType);
      viewTexture.name = "S4 exact model-view matrices"; normalTexture.name = "S4 exact normal matrices";
      const image = batch._indirectTexture.image;
      const idsTexture = new THREE.DataTexture(new Uint32Array(image.data.length), image.width, image.height, THREE.RedIntegerFormat, THREE.UnsignedIntType);
      idsTexture.name = "S4 paint draw IDs";
      textures.add(viewTexture); textures.add(normalTexture); textures.add(idsTexture);
      view = { viewData, normalData, viewTexture, normalTexture, idsTexture, starts: new Int32Array(parts.length), counts: new Int32Array(parts.length), order: null };
      views.set(camera, view);
    }
    const projected = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse), center = new THREE.Vector3();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(projected);
    const shown = node => { for (let p = node; p && p !== root; p = p.parent) if (!p.visible) return false; return true; };
    const order = parts.filter(part => shown(part.node) && (!part.node.frustumCulled || frustum.intersectsObject(part.node))).map(part => ({ part, z: center.copy(part.node.geometry.boundingSphere.center).applyMatrix4(part.node.matrixWorld).applyMatrix4(projected).z }))
      .sort((a, b) => a.z - b.z || a.part.node.id - b.part.node.id).map(row => row.part);
    if (!view.order || order.length !== view.order.length || order.some((part, i) => part.id !== view.order[i])) {
      const bytes = batch.geometry.index.array.BYTES_PER_ELEMENT;
      order.forEach((part, i) => { view.starts[i] = part.range.start * bytes; view.counts[i] = part.range.count; view.idsTexture.image.data[i] = part.id; });
      view.order = order.map(part => part.id); view.idsTexture.needsUpdate = true;
    }
    batch._multiDrawStarts = view.starts; batch._multiDrawCounts = view.counts;
    batch._multiDrawCount = order.length; batch._indirectTexture = view.idsTexture;
    batch._multiDrawBytesPerElement = batch.geometry.index.array.BYTES_PER_ELEMENT;
    const mv = new THREE.Matrix4(), normal = new THREE.Matrix3();
    let moved = false, turned = false;
    for (const part of parts) {
      mv.multiplyMatrices(camera.matrixWorldInverse, part.node.matrixWorld);
      normal.getNormalMatrix(mv);
      for (let i = 0; i < 16; i++) {
        const at = part.id * 16 + i, value = Math.fround(mv.elements[i]);
        if (view.viewData[at] !== value) { view.viewData[at] = value; moved = true; }
      }
      for (let i = 0; i < 9; i++) {
        const at = part.id * 12 + Math.floor(i / 3) * 4 + i % 3, value = Math.fround(normal.elements[i]);
        if (view.normalData[at] !== value) { view.normalData[at] = value; turned = true; }
      }
    }
    // Match the original CPU-composed model-view/normal uniforms exactly.
    // Multiplying view and world on the GPU loses precision near x=463.
    if (moved) view.viewTexture.needsUpdate = true;
    if (turned) view.normalTexture.needsUpdate = true;
    uniforms.uGaragePaintView.value = view.viewTexture;
    uniforms.uGaragePaintNormal.value = view.normalTexture;
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
      textures.delete(batch._indirectTexture);
      batch.removeFromParent(); batch.dispose(); batch.geometry.dispose(); material.dispose();
      for (const texture of textures) texture.dispose();
      for (const part of parts) part.node.layers.mask = part.layers;
    },
  };
}
