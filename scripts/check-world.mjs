// The city behind the page is a GLB built in Blender and a set of names the
// site reads out of it, and nothing but this check notices when the two
// drift apart. It decodes both world GLBs and asserts:
//
//   every section in src/data/site.js has a data-shot root in the page and
//   a shot in src/data/world.js, and its cam_<id> / cam_<id>_target anchors
//   exist in both GLBs, with every waypoint a flight names;
//   every role in src/data/experience.js has a tower (its anchor and its
//   crown), and every featured project has key art for the billboard;
//   the road the car drives runs from the hero's curb marks to the garage
//   bay, and the car's stops are on it;
//   the flight into the garage ends on GarageModel's own front preset
//   (src/data/world.js copies it; src/lib/garage-scene.js owns it);
//   the size budgets: 3.5 MB for the desktop GLB, 1.5 MB for the phone's,
//   no texture over 1024 px.
//
// The data modules are loaded through Vite, as the site loads them.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";

const BUDGET = { high: 3.5e6, phone: 1.5e6 };
const MAX_TEXTURE = 1024;

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
let data;
try {
  const load = (path) => vite.ssrLoadModule(path);
  const [site, world, experience, projects, assets] = await Promise.all([
    load("/src/data/site.js"),
    load("/src/data/world.js"),
    load("/src/data/experience.js"),
    load("/src/data/projects.js"),
    load("/src/data/world-assets.js"),
  ]);
  data = { site, world, experience, projects, assets };
} finally {
  await vite.close();
}
const { sections } = data.site;
const { SHOTS, GARAGE_FRONT, towers, boards } = data.world;
const { experiences } = data.experience;
const { featuredProjects } = data.projects;

// ---- the page ---------------------------------------------------------------
// Every section id has a root marked data-shot="<id>" somewhere in src/.
const sources = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(jsx|js)$/.test(name)) sources.push(readFileSync(path, "utf8"));
  }
};
walk("src");
const code = sources.join("\n");
for (const s of sections) {
  assert.ok(code.includes(`data-shot="${s.id}"`), `No data-shot="${s.id}" root in src/ for section ${s.id}.`);
  assert.ok(SHOTS[s.id], `No shot in src/data/world.js for section ${s.id}.`);
}

// ---- the GLBs ---------------------------------------------------------------
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const report = [];
for (const tier of ["high", "phone"]) {
  const path = `public/scenes/world/world-${tier}.glb`;
  const bytes = statSync(path).size;
  assert.ok(bytes <= BUDGET[tier], `${path} is ${(bytes / 1e6).toFixed(2)} MB, over its ${BUDGET[tier] / 1e6} MB budget.`);
  assert.ok(data.assets.worldModelUrl[tier].startsWith(`/scenes/world/world-${tier}.glb`), `world-assets.js does not point at ${path}.`);
  const doc = await io.read(path);
  const root = doc.getRoot();
  const nodes = new Map(root.listNodes().map((n) => [n.getName(), n]));
  const need = (name) => {
    const n = nodes.get(name);
    assert.ok(n, `${path}: missing ${name}.`);
    return n;
  };
  // Blender's world frame is the site's (+x right, +y up, +z toward the hero
  // lens), and every anchor hangs off the scene root.
  const at = (name) => need(name).getWorldTranslation();

  for (const s of sections) {
    need(`cam_${s.id}`);
    need(`cam_${s.id}_target`);
    const via = SHOTS[s.id].via?.in;
    for (const w of Array.isArray(via) ? via : via ? [via] : []) need(w);
  }
  for (const e of experiences) {
    need(`anchor_tower_${e.slug}`);
    need(`crown_${e.slug}`);
  }
  assert.equal(towers.length, experiences.length, "One tower per role.");
  need("board_main");
  for (const name of ["anchor_curb_hero", "anchor_curb_hero_portrait", "anchor_garage_bay", "anchor_billboard_main",
    "anchor_moon", "anchor_holo", "anchor_shelter_garage", "anchor_lamp_0", "car_plaza", "car_corpo_a", "car_corpo_b",
    "car_rooftop", "car_bay"]) need(name);

  // The road: from the curb to the bay, a metre at a time, with every stop on it.
  const flat = need("road_spline").getExtras().points;
  assert.ok(Array.isArray(flat) && flat.length >= 300, `${path}: road_spline has no points.`);
  const pts = [];
  for (let i = 0; i + 2 < flat.length; i += 3) pts.push([flat[i], flat[i + 1], flat[i + 2]]);
  for (let i = 1; i < pts.length; i++) {
    const step = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
    assert.ok(step < 2.5, `${path}: the road jumps ${step.toFixed(1)} m at point ${i}.`);
  }
  const nearest = (p) => Math.min(...pts.map((q) => Math.hypot(q[0] - p[0], q[2] - p[2])));
  const bay = at("anchor_garage_bay");
  const end = pts[pts.length - 1];
  assert.ok(Math.hypot(end[0] - bay[0], end[2] - bay[2]) < 0.5, `${path}: the road does not reach anchor_garage_bay.`);
  for (const name of ["anchor_curb_hero", "anchor_curb_hero_portrait", "car_plaza", "car_corpo_a", "car_corpo_b", "car_rooftop"]) {
    assert.ok(nearest(at(name)) < 1.5, `${path}: ${name} is ${nearest(at(name)).toFixed(1)} m off the road.`);
  }
  const curb = at("anchor_curb_hero");
  assert.ok(Math.hypot(pts[0][0] - curb[0], pts[0][2] - curb[2]) < 0.5, `${path}: the road does not start at the hero's curb.`);

  // Textures.
  for (const texture of root.listTextures()) {
    const meta = await sharp(Buffer.from(texture.getImage())).metadata();
    assert.ok(Math.max(meta.width, meta.height) <= MAX_TEXTURE, `${path}: texture ${texture.getName()} is ${meta.width}x${meta.height}.`);
  }
  let triangles = 0;
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) triangles += (prim.getIndices()?.getCount() ?? 0) / 3;
  report.push(`${tier} ${(bytes / 1e6).toFixed(2)} MB, ${root.listMeshes().length} meshes, ${triangles.toLocaleString()} triangles, ${root.listTextures().length} textures, road ${pts.length} points`);
}

// ---- the billboard ------------------------------------------------------------
assert.equal(boards.length, featuredProjects.length, "One board entry per featured project.");
for (const b of boards) {
  assert.ok(b.art?.webp?.[1024] || b.art?.src, `${b.slug} has no key art for the billboard.`);
}

// ---- the garage handoff -----------------------------------------------------------
const garage = readFileSync("src/lib/garage-scene.js", "utf8");
const preset = garage.match(/front:\s*\{\s*position:\s*\[([^\]]+)\],\s*target:\s*\[([^\]]+)\]/);
assert.ok(preset, "Could not read PRESETS.front from src/lib/garage-scene.js.");
const nums = (s) => s.split(",").map(Number);
assert.deepEqual(nums(preset[1]), GARAGE_FRONT.position, "GARAGE_FRONT.position no longer matches PRESETS.front.");
assert.deepEqual(nums(preset[2]), GARAGE_FRONT.target, "GARAGE_FRONT.target no longer matches PRESETS.front.");
const fov = garage.match(/new THREE\.PerspectiveCamera\((\d+(?:\.\d+)?)/);
assert.ok(fov && Number(fov[1]) === GARAGE_FRONT.fov, "GARAGE_FRONT.fov no longer matches the garage camera.");

console.log(`World OK. ${sections.length} shots, ${towers.length} towers, ${boards.length} boards; ${report.join("; ")}.`);
