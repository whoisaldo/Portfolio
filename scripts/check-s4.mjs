import assert from "node:assert/strict";
import { getBounds, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const document = await io.read("public/models/ali-s4.glb");
const root = document.getRoot();
const find = (name) => root.listNodes().find((node) => node.getName() === name);
for (const name of ["ali_s4", "body", "steer_fl", "steer_fr", "wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"]) {
  assert.ok(find(name), `Missing animation part: ${name}`);
}
for (const side of ["l", "r"]) {
  assert.ok(find(`steer_f${side}`).listChildren().includes(find(`wheel_f${side}`)), "Front wheels must spin inside steering pivots.");
  const front = find(`steer_f${side}`).getWorldTranslation();
  const rear = find(`wheel_r${side}`).getWorldTranslation();
  assert.ok(Math.abs(front[1] - 0.34325) < 0.003, "255/35 R20 tire radius changed.");
  assert.ok(Math.abs(Math.abs(front[2] - rear[2]) - 2.811) < 0.004, "Wheelbase changed.");
  assert.ok(front[2] > rear[2], "Car must face +Z for the intro.");
}
assert.equal(root.listCameras().length, 0, "Studio camera leaked into the web asset.");
assert.ok(find("CHOOM_plate"), "Custom plate missing.");
const redBadge = find("S4_red_S_badge");
assert.ok(redBadge, "Red S badge missing.");
const badgeColor = redBadge.getMesh().listPrimitives()[0].getMaterial().getBaseColorFactor();
assert.ok(badgeColor[0] > badgeColor[1] * 4 && badgeColor[0] > badgeColor[2] * 3, "The S badge must be red.");
const hinge = find("hood_hinge");
assert.ok(hinge?.listChildren().includes(find("opening_hood")), "Hood must rotate on its own hinge.");
const closed = getBounds(hinge);
const rotation = hinge.getRotation().slice();
assert.ok(Math.abs(rotation[0]) < 0.0001, "Export the hood closed for the intro.");
hinge.setRotation([Math.sin(-0.55), 0, 0, Math.cos(-0.55)]);
const open = getBounds(hinge);
assert.ok(open.max[1] > 1.75 && open.max[1] - closed.max[1] > 0.7, "Hood does not open upward.");
hinge.setRotation(rotation);
assert.ok(find("engine_bay") && find("APR_carbon_airbox") && find("V6_supercharger_housing"), "Engine bay missing.");
for (const name of ["hood_strut_tube", "hood_strut_rod"]) {
  assert.ok(find(name)?.listChildren().length, "Keep strut animation on a parent of the compressed mesh.");
}
const spoiler = getBounds(find("carbon_trunk_spoiler"));
assert.ok(spoiler.min[1] > 0.92, "Spoiler geometry has dropped into the tail lights.");
for (const side of ["left", "right"]) {
  for (const position of ["inner", "outer"]) {
    const bounds = getBounds(find(`AWE_exhaust_${side}_${position}`));
    const centerX = Math.abs((bounds.min[0] + bounds.max[0]) / 2);
    assert.ok(centerX > 0.49 && centerX < 0.62, "Exhaust tip moved outside the bumper aperture.");
    assert.ok(bounds.min[1] > 0.23 && bounds.max[1] < 0.34, "Exhaust tip height misses the aperture.");
    assert.ok(bounds.max[2] > -2.05 && bounds.min[2] < -2.35, "Exhaust tube must extend inward behind the bumper.");
  }
}
for (const accessor of root.listAccessors()) {
  const array = accessor.getArray();
  assert.ok(array && array.every(Number.isFinite), `Invalid geometry: ${accessor.getName()}`);
}
for (const texture of root.listTextures()) assert.ok(texture.getImage()?.byteLength, "Missing embedded texture.");
let triangles = 0;
for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) triangles += (primitive.getIndices()?.getCount() ?? 0) / 3;
console.log(`S4 OK. ${triangles.toLocaleString()} triangles, ${root.listTextures().length} embedded textures. Hood, badge, wheel rig, spoiler clearance and exhaust fit verified.`);
