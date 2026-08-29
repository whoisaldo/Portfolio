#!/bin/bash
# Device mockups generated FROM the real site screenshots — the screenshot is
# passed in as --input so the model composites the actual UI onto a device
# rather than inventing one. Every result gets eyeballed for fidelity.
# usage: ./mock.sh <id> <input-screenshot> <device-line> [outdir]
#
# The rim light was violet #a855f7 until the site's chrome stopped being
# violet. Only the LIGHTING changed here — the screen-content constraints below
# are untouched, so every plate still shows the genuine product UI it did
# before. Keep it that way: the whole reason these are trustworthy is that the
# model is forbidden from redrawing what is on the screen.
#
# The rim is deliberately described as "subtle" and "low intensity". Asked for
# yellow light without that hedge, the generator returns a gold-drenched hero
# shot that buries the screenshot — which is the opposite of the job.
set -u
OUT="${4:-/tmp/keyart}"
mkdir -p "$OUT"
ID="$1"; SRC="$2"; DEVICE="$3"

# One style block reused verbatim across all eight so the dossier reads as a set.
python3 ~/.claude/skills/codex-image/scripts/codex_image.py \
  --input "$SRC" --aspect landscape --out "$OUT/$ID.png" --effort medium \
  --prompt "Use case: product-mockup
Asset type: project card hero image on a dark portfolio website
Primary request: The attached website screenshot shown running on $DEVICE
Style/medium: photorealistic studio product photography, 85mm lens, shallow depth of field, screen perfectly crisp and readable
Composition/framing: device positioned left-of-centre; keep the right third of the frame empty and dark for negative space
Lighting/mood: soft neutral key light from upper left, a subtle low-intensity warm yellow rim light tracing the device edge, faint reflection on the surface below, premium, calm, expensive
Color palette: near-black #0a0a0c background and surface, restrained sodium-yellow #fcee0a edge light used sparingly as a rim accent only; the screen keeps its own original colors exactly
Constraints: reproduce the attached screenshot on the screen EXACTLY as provided - do not redesign, redraw, restyle, re-lay-out, invent or alter any UI element, heading, body text, button or color within it; the yellow light must never wash over or tint the screen; no added text anywhere in the scene; no logos; no watermark
Avoid: invented interface elements, garbled or fake lettering, distorted or stretched screen content, neon sci-fi cliche, lens flare, gold or amber flooding the whole frame, visible brand marks on the device" 2>&1 | tail -3
