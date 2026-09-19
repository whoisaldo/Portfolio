import { stat } from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, meshopt, textureCompress } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const source = "design/night-city-garage/garage-source.glb";
const output = "public/scenes/garage/night-city-garage.glb";
const document = await io.read(source);
await document.transform(
  dedup(), weld(),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024], quality: 88 }),
  meshopt({ encoder: MeshoptEncoder, level: "high", quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }),
);
await io.write(output, document);
console.log(`Garage: ${((await stat(output)).size / 1e6).toFixed(2)} MB, ${document.getRoot().listMeshes().length} meshes.`);
