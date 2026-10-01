// src/braindance/tag.js: a tag on a wall that only heat can read.
//
// One of the braindance's secrets (the "tag" clue): somebody wrote
// "ALDO" on a wall by the curb in something that holds heat. In the visual
// and audio layers there is nothing there; in thermal it is the hottest
// thing on the facade. It is a bright card the thermal palette reads as
// heat, drawn only while that layer is up.
import * as THREE from "three";

export function createTag(scene) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.translate(256, 128);
  ctx.rotate(-0.08);
  ctx.font = "italic 900 150px 'Chakra Petch', Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // A sprayed edge: the same word, blurred out, under a sharp one.
  ctx.filter = "blur(10px)";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("ALDO", 0, 6);
  ctx.filter = "none";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.strokeText("ALDO", 0, 0);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("ALDO", 0, 0);
  // Drips.
  for (let i = 0; i < 9; i++) {
    const x = -180 + i * 45 + Math.random() * 20;
    ctx.fillRect(x, 40, 4, 30 + Math.random() * 50);
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, color: new THREE.Color(2.2, 2.2, 2.2), toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2), material);
  mesh.name = "bd_tag";
  // On the shop wall by the curb, over the windows, facing the road.
  mesh.position.set(13.82, 4.9, -45);
  mesh.rotation.y = -Math.PI / 2;
  mesh.visible = false;
  scene.add(mesh);
  return {
    setVisible(on) {
      mesh.visible = on;
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
      map.dispose();
    },
  };
}
