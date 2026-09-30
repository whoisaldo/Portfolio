// src/world/boards.js: the billboard plaza shows the work.
//
// The giant board over the plaza (board_main in the kit) shows the key art
// of whichever entry the Work deck has on its screen: WorkDeck.jsx writes its
// index to the stage (src/world/stage.js) and this reads it, so the world is
// never the deck's child. Changing entry swaps the art through the
// braindance language the rest of the site uses: a scanline wipes down the
// board, the slices slip, the channels split, a few frames of noise. The
// board's frame is lit in the entry's status colour, volt for a project that
// is live and fuchsia for one still being built (projects.js). The seven
// smaller boards around the square cycle through the rest, slowly.
//
// The art is the deck's own 1024-wide WebP (src/data/images.js), nothing
// generated for the world and nothing that is not Ali's.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { COMMON } from "./glsl.js";
import { boards as BOARDS } from "../data/world.js";

const SWAP_SECONDS = 0.55;
const CYCLE_SECONDS = 9;

const artUrl = (b) => b?.art?.webp?.[1024] || b?.art?.src || null;

export function createBoards(meshes, shared, { reduced = false, reflectLayer = 2 } = {}) {
  const loader = new THREE.TextureLoader();
  const cache = new Map();
  const blank = new THREE.DataTexture(new Uint8Array([6, 6, 8, 255]), 1, 1);
  blank.needsUpdate = true;
  const texture = (i) => {
    const url = artUrl(BOARDS[((i % BOARDS.length) + BOARDS.length) % BOARDS.length]);
    if (!url) return blank;
    if (!cache.has(url)) {
      const t = loader.load(url);
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      cache.set(url, t);
    }
    return cache.get(url);
  };

  const makeMaterial = (gain) => {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uFrom: { value: blank },
        uTo: { value: blank },
        uMix: { value: 1 },
        uGlitch: { value: 0 },
        uGain: { value: gain },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        varying vec2 vUv;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform sampler2D uFrom;
        uniform sampler2D uTo;
        uniform float uMix;
        uniform float uGlitch;
        uniform float uGain;
        varying vec3 vWorld;
        varying vec2 vUv;
        void main() {
          float g = uGlitch;
          float t = floor(uTime * 30.0);
          vec2 uv = vUv;
          float band = floor(uv.y * 36.0);
          float slip = step(1.0 - 0.6 * g, hash12(vec2(band * 1.3, t)));
          uv.x += (hash12(vec2(band, t)) - 0.5) * 0.14 * g * slip;
          // The new art wipes in behind a bright scanline running down.
          float edge = uMix * 1.1 - 0.05;
          float reveal = step(vUv.y, edge);
          vec3 a = texture2D(uFrom, uv).rgb;
          vec3 b = texture2D(uTo, uv).rgb;
          b.r = mix(b.r, texture2D(uTo, uv + vec2(0.012 * g, 0.0)).r, g);
          b.b = mix(b.b, texture2D(uTo, uv - vec2(0.012 * g, 0.0)).b, g);
          vec3 col = mix(a, b, reveal);
          col += vec3(0.9, 0.95, 1.0) * smoothstep(0.02, 0.0, abs(vUv.y - edge)) * step(uMix, 0.999) * 1.5;
          col = mix(col, vec3(hash12(vUv * 480.0 + t)), g * 0.3 * step(0.55, hash12(vec2(t, 9.0))));
          col *= 0.86 + 0.14 * sin(vUv.y * 880.0 - uTime * 3.0);
          // An LED wall, not a hole: its black is lit a little and blue, a
          // slow refresh band rolls down it, and close to, its pixels show
          // as red, green and blue stripes (faded where they would shimmer).
          col = max(col, vec3(0.018, 0.022, 0.034));
          float roll = smoothstep(0.1, 0.0, abs(fract(vUv.y + uTime * 0.07) - 0.5)) * 0.06;
          col += vec3(0.25, 0.3, 0.45) * roll;
          vec2 px = vUv * vec2(384.0, 216.0);
          float fade = 1.0 - smoothstep(0.25, 0.6, max(fwidth(px.x), fwidth(px.y)));
          float sub = fract(px.x) * 3.0;
          vec3 stripe = vec3(step(sub, 1.0), step(1.0, sub) * step(sub, 2.0), step(2.0, sub));
          float gap = smoothstep(0.0, 0.12, fract(px.y)) * smoothstep(1.0, 0.88, fract(px.y));
          col *= mix(vec3(1.0), stripe * 2.4 * gap, fade * 0.55);
          col *= uGain * (1.0 + 0.2 * uBass);
          col = cityFog(col, vWorld, 1.0);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    m.name = "board";
    return m;
  };

  const boards = [];
  for (const mesh of meshes) {
    const fromName = Number(mesh.name.split("_")[1]);
    const index = mesh.userData.board ?? (Number.isFinite(fromName) ? fromName : 0);
    // The big board is the brightest thing in its shot: the key art is
    // mostly dark UI, so it runs hot.
    const material = makeMaterial(index === 0 ? 2.1 : 1.05);
    mesh.material = material;
    // Only the big board is worth a place in the wet road's mirror.
    if (index === 0) mesh.layers.enable(reflectLayer);
    boards.push({ mesh, index, material, showing: -1, t0: 0, swapping: false });
  }
  boards.sort((a, b) => a.index - b.index);

  // A frame of light around the main board, in the status colour.
  let frame = null;
  const main = boards.find((b) => b.index === 0);
  if (main) {
    main.mesh.geometry.computeBoundingBox();
    const bb = main.mesh.geometry.boundingBox.clone().applyMatrix4(main.mesh.matrixWorld);
    const size = bb.getSize(new THREE.Vector3());
    const c = bb.getCenter(new THREE.Vector3());
    const t = 0.35;
    const parts = [
      [size.x + t * 2, t, c.x, bb.max.y + t / 2],
      [size.x + t * 2, t, c.x, bb.min.y - t / 2],
      [t, size.y, bb.min.x - t / 2, c.y],
      [t, size.y, bb.max.x + t / 2, c.y],
    ];
    const boxes = parts.map(([w, h, x, y]) => {
      const g = new THREE.BoxGeometry(w, h, 0.2);
      g.translate(x, y, bb.max.z + 0.12);
      return g;
    });
    // Four bars, one draw.
    const geo = mergeGeometries(boxes, false);
    boxes.forEach((g) => g.dispose());
    const frameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BOARDS[0]?.accent || "#fcee0a").multiplyScalar(1.6) });
    frameMat.name = "board_frame_light";
    const group = new THREE.Mesh(geo, frameMat);
    group.layers.enable(reflectLayer);
    main.mesh.parent.add(group);
    frame = { group, geos: [geo], frameMat };
  }

  let clock = 0;
  const show = (b, index, now) => {
    if (b.showing === index) return;
    const first = b.showing < 0;
    b.material.uniforms.uFrom.value = first ? blank : b.material.uniforms.uTo.value;
    b.material.uniforms.uTo.value = texture(index);
    b.material.uniforms.uMix.value = first || reduced ? 1 : 0;
    b.showing = index;
    b.t0 = now;
    b.swapping = !first && !reduced;
  };

  return {
    /** active: the index the deck (or a case study) wants on the big board. */
    update(dt, active) {
      clock += dt;
      for (const b of boards) {
        const want = b.index === 0 ? active : active + b.index + Math.floor(clock / CYCLE_SECONDS) * (b.index % 2 ? 1 : 3);
        show(b, ((want % BOARDS.length) + BOARDS.length) % BOARDS.length, clock);
        if (b.swapping) {
          const p = Math.min(1, (clock - b.t0) / SWAP_SECONDS);
          b.material.uniforms.uMix.value = p;
          b.material.uniforms.uGlitch.value = Math.sin(Math.PI * p) * (b.index === 0 ? 1 : 0.6);
          if (p >= 1) {
            b.swapping = false;
            b.material.uniforms.uGlitch.value = 0;
          }
        }
      }
      if (frame && main) {
        const accent = BOARDS[main.showing]?.accent || "#fcee0a";
        frame.frameMat.color.set(accent).multiplyScalar(1.6 * (1 + 0.3 * shared.uBass.value));
      }
    },
    dispose() {
      boards.forEach((b) => b.material.dispose());
      cache.forEach((t) => t.dispose());
      blank.dispose();
      if (frame) {
        frame.group.removeFromParent();
        frame.geos.forEach((g) => g.dispose());
        frame.frameMat.dispose();
      }
    },
  };
}
