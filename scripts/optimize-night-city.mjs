import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";

const output = "public/scenes/night-city";
await mkdir(output, { recursive: true });
for (const orientation of ["wide", "portrait"]) {
  const target = `${output}/neon-${orientation}.webp`;
  await sharp(`design/night-city/neon-road-${orientation}.png`)
    .webp({ quality: 88, effort: 6 })
    .toFile(target);
  console.log(`${orientation}: ${Math.round((await stat(target)).size / 1024)} KiB`);
}
