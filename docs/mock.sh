#!/bin/bash
# Device mockups generated FROM the real site screenshots: the screenshot is
# passed in as --input so the model composites the actual UI onto a device
# rather than inventing one. Every result gets eyeballed for fidelity.
# usage: ./mock.sh <id> <device-line> <input-screenshot>... [OUTDIR=/tmp/keyart]
#
# Third pass, 2026-09-16. The device is bigger in the frame (two thirds of the
# width, screen almost frontal), the surface is polished so the screen paints a
# reflection, and a trace of magenta answers the sodium rim on the far edge.
# The screen-content constraints are unchanged from the first pass: the whole
# reason these are trustworthy is that the model is forbidden from redrawing
# what is on the screen.
#
# The rim is deliberately described as "thin", "low intensity" and told to
# stay out of the corners. Asked for yellow light without those hedges, the
# generator returns a gold-drenched hero shot that buries the screenshot,
# which is the opposite of the job. Only `landscape` (1536x1024, 3:2) is worth
# asking for: `4k` came back at 1672x940.
#
# Device lines that shipped: a laptop for seven plates ("a modern thin-bezel
# 14-inch laptop with a dark space-grey aluminium body, lid open at about 105
# degrees, seen from a slightly low three-quarter angle so the screen faces the
# camera almost frontally and stays large and fully readable") and a phone for
# Signature Cuts ("a modern flagship phone with a matte black frame, standing
# upright on the polished surface a little left of centre ... tall in the
# frame, its screen filling most of the frame height").
set -u
ID="$1"; DEVICE="$2"; shift 2
OUT="${OUTDIR:-/tmp/keyart}"
mkdir -p "$OUT"
INPUTS=()
for f in "$@"; do INPUTS+=(--input "$f"); done

# One style block reused verbatim across all eight so the deck reads as a set.
python3 ~/.claude/skills/codex-image/scripts/codex_image.py \
  "${INPUTS[@]}" --aspect landscape --effort xhigh --variants 2 \
  --out "$OUT/$ID.png" \
  --prompt "Use case: product-mockup
Asset type: key art plate for one project on a dark portfolio site, displayed at 3:2 inside a bezel
Primary request: The attached website screenshot shown running on $DEVICE WIDE LANDSCAPE ORIENTATION, wider than tall.
Style/medium: ultra-detailed photorealistic studio product photography, medium-format look, 85mm lens at f/4, shallow depth of field with the screen tack-sharp edge to edge, clean and noise-free, 8k detail in the hardware: machined edges, keycaps, hinge, ports
Composition/framing: the device fills roughly two thirds of the frame width and sits a little left of centre on a polished black surface; the right quarter of the frame stays empty and near-black; the screen's own light spills softly onto the keyboard and paints a soft mirror reflection on the surface below
Lighting/mood: near-total darkness with one thin sodium-yellow rim light tracing the device's left edges, low intensity, and an even fainter cool magenta kicker catching the far right corner; a faint haze far behind the device so the rim reads in the air; the yellow stays a thin edge light with only a faint spill onto the surface, no bright yellow bloom in the corners of the frame; premium, calm, expensive, quiet
Color palette: near-black #0a0a0c ground and backdrop; sodium yellow #fcee0a used sparingly as a rim accent only; a trace of magenta #ff2e88 as the opposite rim only; the screen keeps its own original colors exactly
Constraints: reproduce the attached screenshot on the screen EXACTLY as provided: do not redesign, redraw, restyle, re-lay-out, invent or alter any UI element, heading, body text, button, image or color within it; the coloured light must never wash over or tint the screen; no added text anywhere in the scene; no logos or brand marks on the device; no watermark; no hands, no props, no desk clutter
Avoid: invented interface elements, garbled or fake lettering, distorted or stretched screen content, neon sci-fi cliche, lens flare, gold or amber flooding the frame, purple haze washing the scene, letterboxing, pillarboxing, black bars, portrait framing" 2>&1 | tail -3
