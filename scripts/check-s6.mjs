import assert from "node:assert/strict";
import { getBounds, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { assertNoReferenceGeometry } from "./s6-reference-check.mjs";

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const document = await io.read(process.argv[2] ?? "public/models/ali-s6.glb");
const root = document.getRoot();
const find = (name) => root.listNodes().find((node) => node.getName() === name);
const within = (node, ancestor) => {
  for (let p = node; p; p = root.listNodes().find((n) => n.listChildren().includes(p))) if (p === ancestor) return true;
  return false;
};

// The same rig as the S4 (src/three/car/object.js), so one loader drives both.
for (const name of ["ali_s6", "body", "steer_fl", "steer_fr", "axle_rl", "axle_rr", "wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr", "headlights", "taillights"]) {
  assert.ok(find(name), `Missing animation part: ${name}`);
}
for (const side of ["l", "r"]) {
  assert.ok(find(`steer_f${side}`).listChildren().includes(find(`wheel_f${side}`)), "Front wheels must spin inside steering pivots.");
  const front = find(`steer_f${side}`).getWorldTranslation();
  const rear = find(`wheel_r${side}`).getWorldTranslation();
  assert.ok(Math.abs(front[1] - 0.3433) < 0.003, "255/40 R19 tyre radius changed.");
  assert.ok(Math.abs(Math.abs(front[2] - rear[2]) - 2.912) < 0.004, "Wheelbase changed from the 2013 S6's 2,912 mm.");
  assert.ok(front[2] > rear[2], "Car must face +Z like the S4.");
}
const track = Math.abs(find("steer_fl").getWorldTranslation()[0] - find("steer_fr").getWorldTranslation()[0]);
assert.ok(Math.abs(track - 1.615) < 0.004, "Front track changed from the S6's 1,615 mm.");
assert.equal(root.listCameras().length, 0, "Studio camera leaked into the web asset.");

// Virtual Link lowers the body on its air suspension: the body must carry
// the shell and the bay but not the wheels, so it can drop over them.
const body = find("body");
for (const name of ["steer_fl", "steer_fr", "axle_rl", "axle_rr", "wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"]) assert.ok(!within(find(name), body), "Wheels must not ride in the body.");
for (const name of ["hood_hinge", "engine_bay", "RS_honeycomb_grille", "exhaust_tips", "headlights", "taillights", "mirror_left", "mirror_right", "mirror_cap_left", "mirror_cap_right", "head_unit_screen"]) {
  assert.ok(find(name) && within(find(name), body), `${name} must ride in the body.`);
}
for (const name of ["mod_ie_ecu_tune", "mod_ie_tcu_tune", "mod_virtual_link", "mod_rs_grille", "mod_rsnav_head_unit"]) {
  assert.ok(find(name) && within(find(name), body), `Missing mod anchor: ${name}`);
}

// Hood: closed for export, opens upward on its own hinge.
const hinge = find("hood_hinge");
assert.ok(hinge.listChildren().includes(find("opening_hood")), "Hood must rotate on its own hinge.");
const closed = getBounds(hinge);
const rotation = hinge.getRotation().slice();
assert.ok(Math.abs(rotation[0]) < 0.0001, "Export the hood closed.");
hinge.setRotation([Math.sin(-0.55), 0, 0, Math.cos(-0.55)]);
const open = getBounds(hinge);
assert.ok(open.max[1] > 1.7 && open.max[1] - closed.max[1] > 0.6, "Hood does not open upward.");
hinge.setRotation(rotation);
// Two struts, the second suffixed _r. The loader sets each tube and rod in
// the body's frame from a base on the body and a mount on the hood.
for (const suffix of ["", "_r"]) {
  const strut = (part) => find(`hood_strut_${part}${suffix}`);
  for (const part of ["tube", "rod"]) {
    assert.ok(strut(part)?.listChildren().length, "Keep strut animation on a parent of the compressed mesh.");
    assert.ok(body.listChildren().includes(strut(part)), `hood_strut_${part}${suffix} must be a child of the body.`);
  }
  assert.ok(strut("base") && within(strut("base"), body) && !within(strut("base"), hinge), `hood_strut_base${suffix} must sit on the body.`);
  assert.ok(strut("mount") && within(strut("mount"), hinge), `hood_strut_mount${suffix} must ride on the hood.`);
}
for (const name of ["turbo_compressor_housing", "turbo_heat_wrap", "charge_pipe_silicone", "front_cast_box", "coolant_expansion_tank"]) {
  assert.ok(find(name) && within(find(name), find("engine_bay")), `Hot V part missing: ${name}`);
}

// Ali's grille is gloss black; the mirror caps are silver; four oval tips.
const colour = (name) => {
  let node = find(name);
  while (node && !node.getMesh()) node = node.listChildren()[0];
  return node.getMesh().listPrimitives()[0].getMaterial().getBaseColorFactor();
};
assert.ok(Math.max(...colour("RS_honeycomb_grille").slice(0, 3)) < 0.05, "The honeycomb grille must be black.");
for (const side of ["left", "right"]) assert.ok(Math.min(...colour(`mirror_cap_${side}`).slice(0, 3)) > 0.35, "S6 mirror caps are aluminium-look silver.");
const tips = find("exhaust_tips").listChildren();
assert.equal(tips.length, 4, "The S6 has four oval tips.");
for (const tip of tips) {
  const b = getBounds(tip);
  assert.ok(b.max[2] < -2.2 && b.min[1] > 0.15 && b.max[1] < 0.5, `Exhaust tip ${tip.getName()} is off the rear bumper.`);
}

// No real registration on the model.
for (const node of root.listNodes()) assert.ok(!/plate_(text|number)|7CFU/i.test(node.getName()), "No plate text ships.");

for (const accessor of root.listAccessors()) {
  const array = accessor.getArray();
  assert.ok(array && array.every(Number.isFinite), `Invalid geometry: ${accessor.getName()}`);
}
for (const texture of root.listTextures()) assert.ok(texture.getImage()?.byteLength, "Missing embedded texture.");
// The cabin stays inside the closed car: above the floor, inside the door
// cards, between the dash and the parcel shelf, under the roof. In glTF's
// frame: x across, y up, z forward (the modelling frame's -y).
const cabin = find("cabin");
assert.ok(cabin, "Missing cabin.");
let cabinVertices = 0;
for (const node of root.listNodes().filter((n) => n.getMesh() && within(n, cabin))) {
  const m = node.getWorldMatrix();
  const v = [];
  for (const primitive of node.getMesh().listPrimitives()) {
    const position = primitive.getAttribute("POSITION");
    for (let i = 0; i < position.getCount(); i++) {
      const [x, y, z] = position.getElement(i, v);
      const p = [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
      assert.ok(p[1] >= 0.28 && p[1] <= 1.4 && Math.abs(p[0]) <= 0.86 && p[2] >= -1.9 && p[2] <= 1.0,
        `${node.getName()} leaves the cabin at (${p.map((c) => c.toFixed(3)).join(", ")}).`);
      cabinVertices++;
    }
  }
}

// None of the shape reference's geometry ships (scripts/s6-reference-check.mjs).
const checked = assertNoReferenceGeometry(root);

let triangles = 0;
for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) triangles += (primitive.getIndices()?.getCount() ?? 0) / 3;
assert.ok(triangles <= 155000, `Over the desktop budget: ${triangles} triangles.`);
console.log(`S6 OK. ${triangles.toLocaleString()} triangles, ${root.listTextures().length} embedded textures. Rig, body drop, hood, hot V, grille, mirrors, tips and mod anchors verified; ${cabinVertices.toLocaleString()} cabin vertices inside the car; none of ${checked} meshes reproduces the shape reference.`);
