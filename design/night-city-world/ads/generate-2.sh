#!/bin/zsh
# Twelve more adverts for the city's billboards: the second sheet.
cd "$(dirname "$0")"
STYLE='Style/medium: a flat graphic advertisement in the style of 1990s anime background-art billboards: cel-shaded, bold flat colour fields, hard-edged shadows, halftone dot gradients, thick confident shapes, as shown on a giant LED billboard in a cyberpunk megacity at night; high contrast, saturated, glowing on a near-black ground
Composition/framing: the subject very large and a little off centre, simple bold shapes that read from 200 metres away; a short band of abstract blocky glyph marks (invented symbols, not letters of any real alphabet) along one edge like a slogan nobody can read; the artwork fills the whole frame edge to edge, no border, no frame, no surrounding scene, no perspective: flat, straight on
Constraints: no real brand names, no real logos, no readable words or letters or numbers in any real language, no watermark, no signature, no photographic realism, no 3D render look
Avoid: photorealism, soft airbrushed gradients, busy backgrounds, small fiddly detail, real text, real trademarks'
gen() { # name aspect palette subject
  python3 ~/.claude/skills/codex-image/scripts/codex_image.py --aspect $2 --exact-size --out $1.png --prompt "Use case: ads-marketing
Asset type: artwork for a billboard in a real-time 3D city, sampled as a texture
Primary request: $4
$STYLE
Color palette: $3, on near-black #0a0a12" > $1.log 2>&1
  echo "$1 exit $?"
}
gen glyphs landscape "white and cyan #27dcf2 on deep teal #0b3a44" "a corporate wordmark board: one row of six large bold invented block glyphs like a company name in an unknown script, a thin line under them and a small emblem at the left" &
gen disc landscape "cyan #27dcf2 and white on navy #0a1430" "a corporation's emblem: one large disc made of concentric segmented rings with a notch, like a lens or a turbine seen head on, with three small marks beside it" &
gen travel landscape "orange #ffb254, magenta #ff3fd2 and deep purple" "a travel poster: a huge low sun in flat bands over a line of jagged mountains and a strip of sea, a tiny aircraft crossing the sun" &
gen burger landscape "amber #ffb254, red #ff003c and cream" "an advertisement for street food: one tall stacked burger with a skewer and a carton of fries beside it" &
wait
gen phones landscape "purple #a24bff and cyan #27dcf2" "an advertisement for music: one large pair of headphones seen front on with rings of sound spreading from them" &
gen robodog landscape "green #39ff9a and white on dark grey" "an advertisement for a robot pet: a small boxy robot dog sitting up with a round glowing eye and an antenna tail" &
gen arcade landscape "pink #ff2e88 and yellow #fcee0a" "an advertisement for an arcade: one upright arcade cabinet at a three-quarter angle with a glowing screen showing a simple starburst, a joystick and two buttons" &
gen mask landscape "red #ff003c, black and gold #ffb254" "a theatre poster: one fierce horned demon mask seen front on, with bared teeth and bold brows" &
wait
gen tower portrait "navy #0a1430, teal #2ee6c8 and pale yellow" "a property advertisement: one tall slim tower with rows of lit windows rising past a large pale moon, small clouds at its foot" &
gen scent portrait "magenta #ff3fd2 and black with a white glint" "a perfume advertisement: one faceted glass bottle with a tall stopper, a single drop falling beside it" &
gen blade portrait "white, pale blue and red #ff003c" "a film poster: one curved sword standing point down the height of the frame, a red sash tied at its grip flying sideways" &
gen column portrait "amber #ffb254 on black with a thin red #ff003c frame line" "a vertical shop sign: four very large bold invented block glyphs stacked one above the other the height of the frame, like a name written downward in an unknown script" &
wait
ls -la *.png
