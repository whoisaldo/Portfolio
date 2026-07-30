#!/bin/bash
# Device mockups generated FROM the real site screenshots — the screenshot is
# passed in as --input so the model composites the actual UI onto a device
# rather than inventing one. Every result gets eyeballed for fidelity.
# usage: ./mock.sh <id> <input-screenshot> <device-line>
set -u
OUT="/private/tmp/claude-501/-Users-aldo-Desktop-Portfolio/0d8efae7-a091-41cc-9843-66d8df82e130/scratchpad/keyart/mock"
mkdir -p "$OUT"
ID="$1"; SRC="$2"; DEVICE="$3"

# One style block reused verbatim across all eight so the dossier reads as a set.
python3 ~/.claude/skills/codex-image/scripts/codex_image.py \
  --input "$SRC" --aspect landscape --out "$OUT/$ID.png" \
  --prompt "Use case: product-mockup
Asset type: project card hero image on a dark portfolio website
Primary request: The attached website screenshot shown running on $DEVICE
Style/medium: photorealistic studio product photography, 85mm lens, shallow depth of field, screen perfectly crisp and readable
Composition/framing: device positioned left-of-centre; keep the right third of the frame empty and dark for negative space
Lighting/mood: soft key light from upper left, gentle violet rim light along the device edge, faint reflection on the surface below, premium, calm, expensive
Color palette: near-black #08070d background and surface, violet #a855f7 accent light; the screen keeps its own original colors exactly
Constraints: reproduce the attached screenshot on the screen EXACTLY as provided - do not redesign, redraw, restyle, re-lay-out, invent or alter any UI element, heading, body text, button or color within it; no added text anywhere in the scene; no logos; no watermark
Avoid: invented interface elements, garbled or fake lettering, distorted or stretched screen content, neon sci-fi cliche, lens flare, visible brand marks on the device" 2>&1 | tail -3
