// src/world/crowd.js: people in the streets.
//
// The plate's street has people in it and the city's had none. Most walk the
// avenue's two pavements (fifty-six on a desktop, twenty-two on a phone, of
// ninety-six and thirty-six in all), up the avenue and down it, alone and in pairs, some under
// umbrellas with a neon rim: the way a wet street at night reads from across
// it, dark figures against lit shopfronts, each umbrella a ring of colour
// doubled in the road. Some stand: at a shop's window, by the vending
// machines, at the kerb of the crossing, a few with a phone lit in a hand
// (one of them the braindance's hot phone).
// The rest walk the streets the other shots look down: the cross street,
// the plaza under the board, corpo row's boulevard under its awnings, the
// garage street. They are silhouettes drawn in the shader on upright cards
// (turned to the camera about their own vertical only), each their own build
// and their own outline (a hood, a cap, long hair, a coat to the knee, a bag
// at the hip or one carried, a jacket's trim lit in neon), with a walk in the
// legs and the arms tied to how far they have walked, so nobody skates, and
// a rim of the light from the shops they pass. Where a walk's loop starts
// again they fade out and in, so nobody appears. One draw. Under reduced
// motion they stand where they are.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

const RIMS = ["#27dcf2", "#ff2e88", "#eceae4", "#fcee0a"];

// Walks: a start, a direction (unit, in the ground plane), a length, and how
// many people share it on a desktop and on a phone. The avenue's pavements
// (the kit's WALK and ROAD_HALF: two lanes a side, clear of the lamps and
// machines against the walls) run the length the hero and the intro see.
const WALKS = [
  { from: [10.9, -168], dir: [0, 1], len: 224, n: [14, 6] },
  { from: [11.9, -168], dir: [0, 1], len: 224, n: [14, 5] },
  { from: [-10.9, -168], dir: [0, 1], len: 224, n: [14, 6] },
  { from: [-11.9, -168], dir: [0, 1], len: 224, n: [14, 5] },
  // The cross street's pavements, either side of the avenue.
  { from: [-88, -8.2], dir: [1, 0], len: 74, n: [2, 0] },
  { from: [16, 9.8], dir: [1, 0], len: 72, n: [2, 0] },
  // The plaza, across its square in front of the board and along its kerb.
  { from: [50, -230], dir: [1, 0], len: 58, n: [3, 1] },
  { from: [52, -196], dir: [1, 0], len: 56, n: [3, 1] },
  // Corpo row's boulevard: under the south side's awnings, and the north
  // pavement past the lobbies.
  { from: [130, -318.6], dir: [1, 0], len: 320, n: [6, 2] },
  { from: [112, -341.6], dir: [1, 0], len: 340, n: [5, 1] },
  // The garage street's two pavements.
  { from: [430.2, -298], dir: [0, 1], len: 100, n: [2, 1] },
  { from: [449.8, -298], dir: [0, 1], len: 46, n: [1, 0] },
];
// Standing: at the kerbs of the crossing, by the vending machines, at shop
// windows up both pavements, and outside the garage street's shops. The
// last is the braindance's hot phone (src/braindance/places.js, `phone`):
// someone stopped on the right-hand pavement with it lit in their hand,
// on every tier.
const STANDS = [
  [10.6, -10.6], [-10.7, -10.4], [10.5, 11.3], [-10.6, 11.2],
  [-12.9, -21.3], [12.8, -37.2], [13.2, -46.0], [-13.2, -58.5], [13.1, -77.0],
  [-13.0, -88.6], [13.2, -104.0], [-13.1, -121.0], [13.0, -142.5], [-13.2, -150.0],
  [433.0, -241.0], [433.2, -276.0],
  [11.4, -121.0, "phone"],
];

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createCrowd(scene, shared, { phone = false, reduced = false, reflectLayer = 2 } = {}) {
  const r = rng(1312);
  const card = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = card.index;
  geometry.setAttribute("position", card.attributes.position);
  const people = [];
  const look = () => [1.58 + r() * 0.3, r() < 0.4 ? 1 : 0, Math.floor(r() * RIMS.length), r()];
  // The build, the head (0 bare, 1 hood, 2 cap, 3 long hair), what they
  // carry (0 nothing, 1 a bag at the hip, 2 a bag in the hand) and a trim
  // lit in neon on one in five.
  const style = () => [0.86 + r() * 0.3, Math.floor(r() * 4), r() < 0.55 ? 0 : 1 + Math.floor(r() * 2), r() < 0.2 ? 1 : 0];
  for (const w of WALKS) {
    const n = w.n[phone ? 1 : 0];
    for (let k = 0; k < n; k++) {
      const dir = r() < 0.5 ? -1 : 1;
      const speed = dir * (1.1 + r() * 0.45);
      const at = r() * w.len;
      // A third walk in pairs, a step apart and in step.
      const pair = r() < 0.3 && k < n - 1;
      const lk = look();
      const st = style();
      for (let g = 0; g < (pair ? 2 : 1); g++) {
        const side = w.dir[0] ? [0, 1] : [1, 0];
        const off = g ? 0.62 : (r() - 0.5) * 0.25;
        people.push({
          walk: [w.from[0] + side[0] * off, w.from[1] + side[1] * off, speed, r()],
          path: [w.dir[0], w.dir[1], w.len, at + g * 0.5 * dir],
          look: g ? [lk[0] - 0.04 + r() * 0.08, r() < 0.3 ? 1 : 0, lk[2], r()] : lk,
          style: g ? style() : st,
        });
      }
      if (pair) k++;
    }
  }
  const stands = phone ? STANDS.filter((st, i) => i % 2 === 0 || st[2]) : STANDS;
  for (const [x, z, what] of stands) {
    const lk = look();
    lk[1] = r() < 0.25 ? 1 : 0;
    // A phone held up in front of them: no umbrella, no coat.
    if (what === "phone") {
      lk[1] = 0;
      lk[3] = 0.9;
    }
    people.push({ walk: [x, z, 0, r()], path: [0, 1, 1, 0], look: lk, style: style() });
  }
  const n = people.length;
  const attr = (key, size = 4) => {
    const a = new Float32Array(n * size);
    people.forEach((p, i) => a.set(p[key], i * size));
    return new THREE.InstancedBufferAttribute(a, size);
  };
  geometry.setAttribute("aWalk", attr("walk"));
  geometry.setAttribute("aPath", attr("path"));
  geometry.setAttribute("aLook", attr("look"));
  geometry.setAttribute("aStyle", attr("style"));
  geometry.instanceCount = n;
  // Everywhere they walk, from the avenue to the garage street.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(220, 1, -150), 380);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uMotion: { value: reduced ? 0 : 1 },
      uRims: { value: RIMS.map((c) => new THREE.Color(c)) },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aWalk;
      attribute vec4 aPath;
      attribute vec4 aLook;
      attribute vec4 aStyle;
      uniform float uTime;
      uniform float uMotion;
      uniform vec3 uCam;
      varying vec2 vLocal;
      varying vec3 vWorld;
      varying vec4 vLook;
      varying vec4 vStyle;
      varying float vStep;
      varying float vFade;
      varying float vStill;
      void main() {
        float t = uTime * uMotion;
        float walked = aWalk.z * t;
        float s = mod(aPath.w + walked, aPath.z);
        vec2 at = aWalk.xy + aPath.xy * s;
        // A stride of 1.4 m: the legs' phase is how far they have gone.
        vStep = abs(walked) / 1.4 * 6.2832 + aWalk.w * 6.2832;
        vStill = step(abs(aWalk.z), 0.01);
        // Into and out of the loop's ends, they fade (a walk that stands is
        // all middle).
        vFade = mix(clamp(min(s, aPath.z - s) / 3.0, 0.0, 1.0), 1.0, vStill);
        float bob = abs(sin(vStep)) * 0.025 * uMotion * (1.0 - vStill);
        vec3 foot = vec3(at.x, 0.15, at.y);
        vec3 toCam = uCam - foot;
        vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x) + 1e-4);
        // The card: 1.3 m wide and tall enough for an umbrella over them.
        float h = aLook.x + 0.5;
        vLocal = vec2(position.x * 1.3, (position.y + 0.5) * h);
        vec3 p = foot + right * position.x * 1.3 + vec3(0.0, (position.y + 0.5) * h + bob, 0.0);
        vWorld = p;
        vLook = aLook;
        vStyle = aStyle;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uRims[4];
      varying vec2 vLocal;
      varying vec3 vWorld;
      varying vec4 vLook;
      varying vec4 vStyle;
      varying float vStep;
      varying float vFade;
      varying float vStill;
      // A segment whose radius runs from ra at a to rb at b: close enough to
      // a distance for a cut-out.
      float limb(vec2 p, vec2 a, vec2 b, float ra, float rb) {
        vec2 pa = p - a, ba = b - a;
        float k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * k) - mix(ra, rb, k);
      }
      float boxd(vec2 p, vec2 c, vec2 hs) {
        vec2 q = abs(p - c) - hs;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
      }
      void main() {
        if (vFade < 0.999 && hash12(floor(gl_FragCoord.xy)) > vFade) discard;
        // A figure in metres, feet at 0, scaled to their height and build.
        float s = vLook.x / 1.75;
        vec2 p = vLocal / s;
        p.x /= vStyle.x;
        float swing = sin(vStep) * (1.0 - vStill);
        // Standing, they shift their weight now and then.
        float sway = vStill * sin(uTime * 0.6 + vLook.w * 40.0) * 0.02;
        p.x += sway;
        bool umbrella = vLook.y > 0.5;
        float head = vStyle.y;
        // Head and neck, shoulders wider than the waist, and, on about a
        // third of them, a long coat to the knee that the legs come out of.
        float d = length((p - vec2(0.0, 1.635)) / vec2(0.9, 1.0)) * 0.9 - 0.1;
        if (head > 0.5 && head < 1.5) d = min(d, limb(p, vec2(0.0, 1.6), vec2(0.0, 1.47), 0.135, 0.15));
        else if (head > 1.5 && head < 2.5) d = min(d, boxd(p, vec2(0.0, 1.72), vec2(0.11, 0.035)));
        else if (head > 2.5) d = min(d, limb(p, vec2(0.0, 1.66), vec2(0.0, 1.38), 0.105, 0.12));
        d = min(d, limb(p, vec2(0.0, 1.5), vec2(0.0, 1.56), 0.05, 0.05));
        d = min(d, limb(p, vec2(0.0, 1.4), vec2(0.0, 0.98), 0.2, 0.15));
        d = min(d, limb(p, vec2(-0.13, 1.42), vec2(0.13, 1.42), 0.065, 0.065));
        bool coat = vLook.w < 0.34;
        if (coat) d = min(d, limb(p, vec2(0.0, 1.3), vec2(0.0, 0.52), 0.17, 0.25 + 0.02 * swing));
        // Legs from the hip through the knee, swinging from the hip.
        vec2 kneeL = vec2(-0.08 + 0.1 * swing, 0.5);
        vec2 kneeR = vec2(0.08 - 0.1 * swing, 0.5);
        d = min(d, limb(p, vec2(-0.08, 0.95), kneeL, 0.085, 0.06));
        d = min(d, limb(p, vec2(0.08, 0.95), kneeR, 0.085, 0.06));
        d = min(d, limb(p, kneeL, vec2(-0.08 + 0.17 * swing, 0.05), 0.06, 0.045));
        d = min(d, limb(p, kneeR, vec2(0.08 - 0.17 * swing, 0.05), 0.06, 0.045));
        // Arms swing against the legs, just clear of the body; one holds the
        // umbrella up, or a phone in front of them while they stand.
        bool phoneUp = !umbrella && vStill > 0.5 && vLook.w > 0.5;
        d = min(d, limb(p, vec2(-0.2, 1.4), vec2(-0.25 - 0.08 * swing, 0.88), 0.055, 0.04));
        vec2 hand = umbrella ? vec2(0.12, 1.3) : phoneUp ? vec2(0.06, 1.12) : vec2(0.25 + 0.08 * swing, 0.88);
        d = min(d, limb(p, vec2(0.2, 1.4), hand, 0.055, 0.04));
        // What they carry: a bag at the hip on its strap, or one in the hand.
        if (vStyle.z > 0.5 && vStyle.z < 1.5) {
          d = min(d, boxd(p, vec2(-0.27, 0.92), vec2(0.07, 0.1)));
          d = min(d, limb(p, vec2(-0.27, 1.0), vec2(0.13, 1.42), 0.012, 0.012));
        } else if (vStyle.z > 1.5 && !umbrella && !phoneUp) {
          d = min(d, boxd(p, hand + vec2(0.04, -0.17), vec2(0.09, 0.13)));
        }
        // The umbrella: a shallow dome, its handle, and a lit rim.
        float canopy = 1e3;
        float rim = 1e3;
        if (umbrella) {
          vec2 q = (p - vec2(0.06, 1.95)) / vec2(0.55, 0.24);
          canopy = max(length(q) - 1.0, -q.y) * 0.24;
          rim = max(abs(q.y) * 0.24 - 0.012, abs(q.x) - 1.0);
          d = min(d, limb(p, vec2(0.06, 1.95), vec2(0.1, 1.3), 0.012, 0.012));
        }
        if (min(d, min(canopy, rim)) > 0.0) discard;
        // Dark against the lit shops behind them, their fronts faintly lit by
        // the street's signs, and only their heads and shoulders catching
        // the light from above.
        // The spill is the light where they stand, and most of it comes from
        // the shops behind them, so the side the street sees takes a little
        // of it: dark against the windows, not grey cut-outs.
        float edge = smoothstep(-0.018, 0.0, d) * smoothstep(1.1, 1.6, p.y);
        vec3 spill = spillAt(vWorld);
        vec3 col = vec3(0.01, 0.01, 0.014) + spill * (0.04 + 0.45 * edge);
        vec3 tint = uRims[int(vLook.z + 0.5)];
        float glow = 0.0;
        if (canopy <= 0.0) col = vec3(0.02, 0.02, 0.028) + spill * 0.12 + tint * 0.05;
        if (rim <= 0.0) {
          col = tint * 3.2 * (1.0 + 0.2 * uBass);
          glow = 1.0;
        }
        // A jacket's trim lit in neon: a strip across the chest and one
        // along the hem, inside the outline.
        if (vStyle.w > 0.5 && rim > 0.0 && canopy > 0.0 && d < -0.012) {
          float hem = coat ? 0.6 : 1.0;
          float strip = step(abs(p.y - 1.27), 0.014) + step(abs(p.y - hem), 0.014);
          if (strip > 0.0 && abs(p.x) < 0.19) {
            col = tint * 1.6;
            glow = 1.0;
          }
        }
        // A phone lights a hand, and a face over it while they stand.
        if (!umbrella && vLook.w > 0.78 && length(p - hand) < 0.05) {
          col = vec3(0.6, 0.85, 1.0) * 2.0;
          glow = 1.0;
        }
        if (phoneUp) {
          if (length(p - hand) < 0.045) {
            col = vec3(0.6, 0.85, 1.0) * 2.2;
            glow = 1.0;
          } else if (p.y > 1.55 && abs(p.x) < 0.09) {
            col += vec3(0.1, 0.16, 0.2) * smoothstep(0.0, -0.05, d);
          }
        }
        col = cityFog(col, vWorld, glow);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "crowd";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "crowd";
  mesh.layers.enable(reflectLayer);
  scene.add(mesh);

  return {
    mesh,
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      card.dispose();
      material.dispose();
    },
  };
}
