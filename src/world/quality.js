// src/world/quality.js: how much city a device gets.
//
// Three tiers, decided once per mount from things the browser will say
// without being asked twice:
//
//   high      a GPU, a mouse, a screen at least 768 px wide
//   phone     a coarse pointer or a narrow screen: fewer pixels, a 512 by
//             256 planar reflection (the first thing shed if the phone is
//             slow, leaving the baked streaks), a third of the rain,
//             half-resolution bloom, the lighter GLB
//   fallback  no GPU (src/lib/gpu.js), reduced motion, `fx world off`, or a
//             WebGL failure: no city at all, the still plate and black
//             sections the site had before it
//
// Inside a tier the world can still step down on its own (see `ADAPT`): the
// first two seconds after the intro are timed, and a p95 over budget sheds
// pixels first, then the reflection, then half the rain, one step at a time
// and each step eased in, so nobody sees it happen.

export const TIERS = {
  high: {
    name: "high",
    dpr: 1.5,
    pixels: 2.2e6,
    reflection: 1024,
    rain: 6000,
    avs: 10,
    cars: 4,
    smaa: true,
    bloomScale: 1,
    budgetMs: 16.7,
    glb: "world-high.glb",
  },
  phone: {
    name: "phone",
    dpr: 1.25,
    pixels: 0.9e6,
    reflection: 512,
    rain: 2000,
    avs: 4,
    cars: 2,
    smaa: false,
    bloomScale: 0.5,
    budgetMs: 22,
    glb: "world-phone.glb",
  },
};

/** The steps the adaptive pass may take, in order. */
export const ADAPT = ["pixels", "reflection", "rain"];

export function pickTier() {
  if (typeof window === "undefined") return "phone";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return coarse || window.innerWidth < 768 ? "phone" : "high";
}
