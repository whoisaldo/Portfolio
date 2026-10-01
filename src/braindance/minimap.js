// src/braindance/minimap.js: the city from above, for the minimap.
//
// Drawn from the city itself, once, when the braindance starts: the kit
// (not the far skyline, the rain or the traffic) rendered straight down
// through an orthographic camera into a small target, every surface
// writing its own height, and read back. A 2D canvas then turns the
// heights into a map the way a game's minimap draws one: the streets as
// the light ground, the blocks dark with a lit edge, the tall ones a
// little brighter. Moving a building in Blender moves it on the map.
import * as THREE from "three";

// The part of the city the recording goes through, with a margin: the
// avenue from the hero's curb to past the plaza, corpo row, the roof and
// the garage street. Metres, the kit's axes; -z is up the avenue (north).
export const MAP_BOUNDS = { x0: -110, x1: 600, z0: -440, z1: 70 };
const PPM = 2;

const HEIGHT_VERT = /* glsl */ `
  varying float vY;
  void main() {
    vec4 p = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
    #endif
    vec4 w = modelMatrix * p;
    vY = w.y;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const HEIGHT_FRAG = /* glsl */ `
  varying float vY;
  void main() {
    // Height in metres over 256, in red and green for precision.
    float h = clamp(vY, 0.0, 255.0) / 256.0;
    float hi = floor(h * 255.0) / 255.0;
    float lo = fract(h * 255.0);
    gl_FragColor = vec4(hi, lo, 1.0, 1.0);
  }
`;

/**
 * Render the kit's heights from above. Returns { width, height, heights }
 * with heights in metres per pixel (row 0 is the north edge).
 */
export function bakeHeights(parts, bounds = MAP_BOUNDS, ppm = PPM) {
  const { renderer, scene, city } = parts;
  const w = Math.round((bounds.x1 - bounds.x0) * ppm);
  const h = Math.round((bounds.z1 - bounds.z0) * ppm);
  const cx = (bounds.x0 + bounds.x1) / 2;
  const cz = (bounds.z0 + bounds.z1) / 2;
  const camera = new THREE.OrthographicCamera(-(bounds.x1 - bounds.x0) / 2, (bounds.x1 - bounds.x0) / 2, (bounds.z1 - bounds.z0) / 2, -(bounds.z1 - bounds.z0) / 2, 1, 2000);
  camera.up.set(0, 0, -1);
  camera.position.set(cx, 1000, cz);
  camera.lookAt(cx, 0, cz);
  camera.updateMatrixWorld();
  camera.layers.enableAll();

  const material = new THREE.ShaderMaterial({ vertexShader: HEIGHT_VERT, fragmentShader: HEIGHT_FRAG, side: THREE.DoubleSide });
  const target = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true });
  // Only the kit: everything else in the scene is hidden for the one draw.
  const hidden = [];
  for (const child of scene.children) {
    if (child !== city.root && child.visible) {
      hidden.push(child);
      child.visible = false;
    }
  }
  const before = { target: renderer.getRenderTarget(), override: scene.overrideMaterial, background: scene.background, clear: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha() };
  scene.overrideMaterial = material;
  scene.background = null;
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  const pixels = new Uint8Array(w * h * 4);
  renderer.readRenderTargetPixels(target, 0, 0, w, h, pixels);
  renderer.setRenderTarget(before.target);
  renderer.setClearColor(before.clear, before.alpha);
  scene.overrideMaterial = before.override;
  scene.background = before.background;
  for (const child of hidden) child.visible = true;
  target.dispose();
  material.dispose();

  // Read back bottom-up; flip so row 0 is the north edge.
  const heights = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((h - 1 - y) * w + x) * 4;
      heights[y * w + x] = pixels[i + 2] === 0 ? -1 : ((pixels[i] + pixels[i + 1] / 255) / 255) * 256;
    }
  }
  return { width: w, height: h, heights, bounds, ppm };
}

/** The heights drawn as the minimap's base layer, on a canvas. */
export function drawMap({ width, height, heights }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(width, height);
  const d = img.data;
  const at = (x, y) => heights[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const hgt = at(x, y);
      const o = (y * width + x) * 4;
      // A block's edge: a big step in height to a neighbour.
      const step = Math.max(Math.abs(hgt - at(x + 1, y)), Math.abs(hgt - at(x - 1, y)), Math.abs(hgt - at(x, y + 1)), Math.abs(hgt - at(x, y - 1)));
      if (hgt < 0) {
        d[o + 3] = 0;
      } else if (hgt < 0.45) {
        // Street level: road and pavement.
        d[o] = 64;
        d[o + 1] = 70;
        d[o + 2] = 92;
        d[o + 3] = 150;
      } else {
        const k = Math.min(1, hgt / 160);
        d[o] = 14 + k * 26;
        d[o + 1] = 14 + k * 22;
        d[o + 2] = 22 + k * 30;
        d[o + 3] = 235;
      }
      if (step > 2.5 && hgt >= 0.45) {
        d[o] = 46;
        d[o + 1] = 230;
        d[o + 2] = 200;
        d[o + 3] = 200;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** World metres to map pixels. */
export function toMap(map, x, z) {
  return [(x - map.bounds.x0) * map.ppm, (z - map.bounds.z0) * map.ppm];
}
