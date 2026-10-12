#!/bin/zsh
# Twelve original adverts for the city's billboards, in the show's flat graphic style.
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
gen can landscape "hot yellow #fcee0a and black with a red #ff003c flash" "an advertisement for an energy drink: one tall drink can tilted, bursting with lightning bolts and droplets" &
gen noodle landscape "red #ff003c, cream and amber #ffb254" "an advertisement for a noodle bar: a big bowl of noodles with chopsticks lifting a tangle of noodles, steam curling up" &
gen eye landscape "cyan #27dcf2 and magenta #ff3fd2" "an advertisement for cybernetic eye implants: one huge stylised eye in close-up, its iris a set of concentric mechanical rings with a glowing pupil and thin targeting lines" &
gen shoe landscape "orange #ffb254 and teal #2ee6c8" "an advertisement for running shoes: one chunky futuristic sneaker in profile with speed lines streaking behind it" &
wait
gen idol landscape "pink #ff2e88, white and pale cyan" "an advertisement with a pop idol: the smiling face of an anime girl with short hair and a star earring, winking, a few stars and sparkles around her" &
gen bike landscape "red #ff003c and black with white highlights" "an advertisement for a motorcycle: a sleek futuristic motorbike seen from the side at speed, low and long, with a glowing wheel hub" &
gen pill landscape "green #39ff9a and white on dark teal" "an advertisement for a pharmacy: two capsules and a round pill, large, clean and glossy in flat colour, with a simple plus-shaped cross mark" &
gen cat landscape "yellow #fcee0a and pink #ff2e88" "an advertisement with a mascot: a round cartoon cat face winking with its tongue out, big ears, a bow, in a sticker-like style" &
wait
gen drink portrait "purple #a24bff and blue #2f6bff with a pink glow" "an advertisement for a cocktail bar: one tall cocktail glass with a slice of citrus on the rim and a glowing liquid, bubbles rising" &
gen hand portrait "teal #2ee6c8 and white" "an advertisement for prosthetic arms: a sleek robotic hand reaching upward holding a single small flower between two fingers" &
gen fish portrait "red #ff003c and cream" "an advertisement for a sushi counter: one large stylised fish leaping in a curve over two pieces of sushi" &
gen fight portrait "yellow #fcee0a and red #ff003c" "a fight night poster: the silhouette of a boxer with one raised glove, seen from below against a burst of radiating rays" &
wait
ls -la *.png
