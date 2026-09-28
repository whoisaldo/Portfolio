// src/world/greybox.js: the city as boxes, to prove the camera before the
// Blender kit exists. Same layout and the same anchor names the GLB will
// carry; replaced by src/world/city.js once it does.
import * as THREE from "three";

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const q = (ry) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);

export const GREYBOX_ANCHORS = [
  ["anchor_curb_hero", v(-8.6, 0, -38), q(Math.PI)],
  ["cam_projects", v(30, 12, -205)],
  ["cam_projects_target", v(38, 22, -252)],
  ["anchor_billboard_main", v(38, 24, -252)],
  ["cam_experience", v(80, 6, -312)],
  ["cam_experience_b", v(300, 6, -312)],
  ["cam_experience_target", v(110, 55, -352)],
  ["cam_experience_target_b", v(330, 55, -352)],
  ["cam_about", v(362, 37, -262)],
  ["cam_about_target", v(250, 40, -330)],
  ["cam_stack", v(362, 37, -262)],
  ["cam_stack_target", v(250, 42, -320)],
  ["cam_stack_target_b", v(262, 34, -178)],
  ["anchor_garage_bay", v(366, 0, -215), q(Math.PI / 2)],
  ["cam_garage_door", v(346, 2.4, -215)],
  ["cam_contact", v(359, 13, -206)],
  ["cam_contact_target", v(396, 34, -118)],
  ["anchor_moon", v(700, 220, 600)],
];

export function createGreybox(scene) {
  const anchors = new Map();
  for (const [name, position, quaternion] of GREYBOX_ANCHORS) {
    anchors.set(name, { position, quaternion: quaternion || new THREE.Quaternion() });
  }
  const group = new THREE.Group();
  const geos = [];
  const mats = [];
  const mat = (color, emissive = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, emissive: emissive ? color : 0x000000, emissiveIntensity: emissive });
    mats.push(m);
    return m;
  };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  geos.push(boxGeo);
  const box = (x, y, z, w, h, d, m) => {
    const mesh = new THREE.Mesh(boxGeo, m);
    mesh.position.set(x, y + h / 2, z);
    mesh.scale.set(w, h, d);
    group.add(mesh);
    return mesh;
  };
  const asphalt = mat(0x15161a);
  const concrete = mat(0x2a2b30);
  const pink = mat(0xff2e88, 2);
  const cyan = mat(0x27dcf2, 2);
  const amber = mat(0xffb254, 2);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), asphalt);
  geos.push(ground.geometry);
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // The avenue: facades both sides, a sign every few lots.
  for (let z = -8; z > -170; z -= 16) {
    for (const side of [-1, 1]) {
      const h = 14 + ((z * 7 + side * 13) % 11 + 11) % 11 * 2;
      box(side * 19, 0, z - 8, 12, h, 14, concrete);
      box(side * 13.2, 4, z - 8, 0.3, 2.2, 5, side < 0 ? cyan : pink);
    }
  }
  // Kiroshi and Nicola.
  box(-13.4, 5, -48, 0.4, 7, 10, cyan);
  box(13.4, 6, -62, 0.4, 8, 9, mat(0xff003c, 2));
  // The overpass.
  box(0, 7, -75, 60, 1.2, 6, concrete);
  box(0, 8.3, -72.2, 14, 1.6, 0.3, cyan);
  // Plaza board and plaza.
  box(38, 16, -253, 24, 16, 0.6, amber);
  // Corpo row.
  for (let i = 0; i < 7; i++) box(95 + i * 40, 0, -370, 26, 90 + (i % 3) * 25, 26, concrete);
  // Rooftop building, garage.
  box(372, 0, -275, 36, 34, 50, concrete);
  box(372, 0, -222, 30, 10, 12, concrete);
  box(372, 0, -208, 30, 10, 12, concrete);
  box(380, 0, -215, 14, 10, 2, concrete);
  box(372, 4, -215, 30, 6, 2, concrete);
  box(358, 0.2, -210, 0.3, 3.2, 0.3, pink);
  box(358, 0.2, -220, 0.3, 3.2, 0.3, cyan);
  // Far city.
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    const r = 700 + ((i * 97) % 500);
    box(160 + Math.cos(a) * r, 0, -180 + Math.sin(a) * r, 40, 60 + ((i * 53) % 140), 40, concrete);
  }
  // The moon.
  const moon = new THREE.Mesh(new THREE.SphereGeometry(126, 32, 16), new THREE.MeshBasicMaterial({ color: 0xd9d6cc }));
  geos.push(moon.geometry);
  mats.push(moon.material);
  moon.position.copy(anchors.get("anchor_moon").position);
  group.add(moon);

  scene.add(group);
  return {
    anchors,
    group,
    update() {},
    dispose() {
      scene.remove(group);
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}
