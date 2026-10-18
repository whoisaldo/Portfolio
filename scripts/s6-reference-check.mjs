import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

// An earlier S6 body was faired from a lines plan measured off a shape
// reference that is not part of this repository and must never ship. This
// proves the GLB carries none of that reference's geometry. The fingerprint holds no
// coordinates: only each reference mesh's vertex count, its shape moments and
// SHA-256 hashes of 512 sampled vertex positions on a 1 mm grid, in the
// frames a copy could plausibly arrive in (as supplied, in metres or
// millimetres, or placed in the car's frame). A mesh fails if it reproduces
// a tenth of any sample set, or matches a reference's vertex count and shape.
const fingerprint = JSON.parse(await readFile(new URL("./s6-reference-fingerprint.json", import.meta.url), "utf8"));
const cell = ([x, y, z]) => createHash("sha256").update(`${Math.round(x / fingerprint.grid)},${Math.round(y / fingerprint.grid)},${Math.round(z / fingerprint.grid)}`).digest("hex").slice(0, 16);

function moments(points) {
  const n = points.length;
  const mean = [0, 1, 2].map((i) => points.reduce((s, p) => s + p[i], 0) / n);
  const c = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of points) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c[i][j] += (p[i] - mean[i]) * (p[j] - mean[j]) / n;
  // Eigenvalues of the symmetric 3x3 covariance (trigonometric solution).
  const q = (c[0][0] + c[1][1] + c[2][2]) / 3;
  const p1 = c[0][1] ** 2 + c[0][2] ** 2 + c[1][2] ** 2;
  const p2 = (c[0][0] - q) ** 2 + (c[1][1] - q) ** 2 + (c[2][2] - q) ** 2 + 2 * p1;
  const p = Math.sqrt(p2 / 6) || 1e-12;
  const b = c.map((row, i) => row.map((v, j) => (v - (i === j ? q : 0)) / p));
  const det = b[0][0] * (b[1][1] * b[2][2] - b[1][2] * b[2][1]) - b[0][1] * (b[1][0] * b[2][2] - b[1][2] * b[2][0]) + b[0][2] * (b[1][0] * b[2][1] - b[1][1] * b[2][0]);
  const phi = Math.acos(Math.max(-1, Math.min(1, det / 2))) / 3;
  const e1 = q + 2 * p * Math.cos(phi), e3 = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3), e2 = 3 * q - e1 - e3;
  return [e2 / e1, e3 / e1];
}

function multiply(m, [x, y, z]) {
  return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
}

export function assertNoReferenceGeometry(root) {
  let meshes = 0;
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    meshes++;
    const matrix = node.getWorldMatrix();
    const unique = new Map();
    for (const primitive of mesh.listPrimitives()) {
      const position = primitive.getAttribute("POSITION");
      const element = [];
      for (let i = 0; i < position.getCount(); i++) {
        const [x, y, z] = multiply(matrix, position.getElement(i, element));
        // Back to the modelling frame: glTF's +Y up, +Z forward is Blender's +Z up, -Y forward.
        const point = [x, -z, y];
        unique.set(point.map((v) => v.toFixed(5)).join(), point);
      }
    }
    const points = [...unique.values()];
    const hashes = new Set(points.map(cell));
    for (const [label, reference] of Object.entries(fingerprint.meshes)) {
      for (const [frame, cells] of Object.entries(reference.cells)) {
        const hits = cells.filter((h) => hashes.has(h)).length;
        assert.ok(hits < fingerprint.samples / 10, `${node.getName()} reproduces the shape reference's ${label} vertices (${hits} of ${cells.length} samples, ${frame} frame).`);
      }
      if (points.length > 500 && Math.abs(points.length - reference.vertices) / reference.vertices < 0.02) {
        const [a, b] = moments(points);
        assert.ok(Math.abs(a - reference.moments[0]) > 0.01 || Math.abs(b - reference.moments[1]) > 0.01, `${node.getName()} has the shape reference's ${label} vertex count and shape.`);
      }
    }
  }
  return meshes;
}
