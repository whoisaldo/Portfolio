// src/lib/gpu.js: is the browser drawing with a graphics card?
//
// Chrome with "Use graphics acceleration when available" switched off, or
// with a GPU process it gave up on after a few crashes, composites the whole
// page on the CPU. On this site that is every blend mode, every blur and the
// DPR 2 skyline rasterised in software sixty times a second. It was reported
// on 2026-09-18 as "atrocious, not usable" from a Chrome whose console
// printed `GL_VENDOR = Disabled`, while Brave, the same engine on the same
// machine, was fine.
//
// CSS cannot ask about this. WebGL can: a context requested with
// `failIfMajorPerformanceCaveat` comes back null when the only renderer on
// offer is a software one, which is the same condition. Asked once per page
// load and remembered; the context is released the moment it has answered.
//
// A browser that blocks WebGL for privacy reasons reads as "no acceleration"
// here. That turns the effects down and shows the notice, and the console's
// `fx reset` puts everything back, so the cost of a wrong answer is one
// dismissed panel.
let answer = null;

export function hasGpuAcceleration() {
  if (answer === null) answer = probe();
  return answer;
}

function probe() {
  if (typeof document === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    const opts = { failIfMajorPerformanceCaveat: true };
    const gl = canvas.getContext("webgl2", opts) || canvas.getContext("webgl", opts);
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    // No WebGL at all. The same answer applies.
    return false;
  }
}
