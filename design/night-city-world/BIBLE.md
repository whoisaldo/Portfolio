# Night City: the bible

The plan the city is rebuilt to: what it is, where everything stands, how
each district looks and lights, what it may cost, and how it loads. Written
before the rebuild, then kept true to the city as built (the README says how
it works; this says what it is and why).

## Why a rebuild

The city was built for eight camera shots. Whatever a shot did not look at
was a painted wall, a box from the far city or nothing: from the hero's own
junction, turned left or right, the street ends in a black ground plane
under coloured boxes. This rebuild makes it a place: one connected street
network at true scale, built on every side a driver or a walker on it can
see, ready for the braindance, a drive and a walk, and graded against frames
of the real thing by reviewers who did not build it.

## References

Study frames from Cyberpunk: Edgerunners season 1, taken one a second from
the official uploads of Netflix, Netflix Anime and CD Projekt Red, sorted by
hand and annotated. They are private study material: they live on the build
machine (`~/Library/Caches/ncw/city/refs/`, with `MANIFEST.md` beside them),
never in this repository and never on the site. They are cited here as
`clip@second`, the YouTube id and the second of the frame, so anyone can
find them. Frames Ali drops into `refs/from-ali/` outrank everything here.

Season 1's Night City at night, as the frames paint it, and what the city
takes from them:

- **Masses are dark navy and teal-black, lit in bands.** Towers read as
  near-black slabs striped with horizontal window bands, amber and cyan,
  floor by floor, rather than a scatter of windows (KvMY1uzSC1E@103,
  ax5YUmkWf_Y@130, x4ztgjvfU60@21, JtqIas3bYhg@72). The sky is a flat deep
  blue going lighter toward the horizon, no stars (KvMY1uzSC1E@103,
  mH2wmyeiIpA@32).
- **Vertical blades in cyan, stacks of small red and orange boards, and
  skybridges that carry a row of lit boards across a gap** are the
  signature signage (ARL_JWwKdDs@21, mH2wmyeiIpA@142, x4ztgjvfU60@21).
  Signs hang at angles, overlap and step up a facade; a facade carries every
  kind at once: letter signs on lattice frames, blades, boards, billboards,
  neon (Fn9gKhU_2_Q@38, x4ztgjvfU60@18, HI8ubzVgvio@0).
- **Screen towers.** Slim towers whose whole faces are vertical stacks of
  screens in blue, white and magenta, the brightest things in the skyline
  (mH2wmyeiIpA@113, mH2wmyeiIpA@114, KvMY1uzSC1E@213, mH2wmyeiIpA@193).
  Corporate towers carry a big lit logo in their top third
  (mH2wmyeiIpA@143).
- **Light comes from signs and windows, not streetlamps.** Street level is
  dark between pools of sign colour; the wet road smears every screen into
  long vertical streaks (ax5YUmkWf_Y@17, YRL74JmhVgk@133, YRL74JmhVgk@18).
  Where there are streetlamps they are sodium orange on tall arms
  (JtqIas3bYhg@64, Zq4zTcIM0yQ@44).
- **Red aviation lamps, lattice masts, searchlight beams, hologram
  columns** over the roofs (mH2wmyeiIpA@32, ARL_JWwKdDs@1, x4ztgjvfU60@1,
  Zq4zTcIM0yQ@182).
- **Elevated roads everywhere**: decks on thick columns, ramps stacked at
  two or three heights over a ground street, emissive bands along deck
  sides, undersides lit green and orange (Zq4zTcIM0yQ@107, Fn9gKhU_2_Q@74,
  Fn9gKhU_2_Q@81, OifiVCnFKzM@28, JtqIas3bYhg@64).
- **Rail on teal viaducts** crossing in front of facades
  (KvMY1uzSC1E@17, Fn9gKhU_2_Q@52, HI8ubzVgvio@0).

The anime's backgrounds are paintings; for the 3D they do not show (how a
megabuilding meets the street, what a roof holds) the secondary references
in `design/night-city/REFERENCES.md` (CD Projekt Red's guide, the
environment artists' pages) fill in. The city takes the show's design (its
skyline, density, layering, colour and signage) and keeps the site's own
renderer: this is not a cel-shading pass.

## The frame

World metres, +x east (right), +y up, +z south (toward the hero's lens),
north is -z: the frame the drift, the kit and the braindance already share.
One unit is one metre. The S4 is 4.7 m long and 1.83 m wide; a lane is 3.5
to 3.6 m; a kerb 0.15 m; a pavement 3.7 to 5 m; a storey 3.4 m over a 4.6 m
shop floor; a door 2.2 to 2.4 m; a person 1.6 to 1.9 m.

## What does not move

Every set piece the page and the braindance read stays where it is, and the
city is rebuilt round it:

- the hero avenue's line, Kiroshi and Nicola (both pairs), the overpass at
  z -80, the holographic figure, ARASAKA's tower at (75, -490), the five
  landmark towers, the megablock at the canyon's end and its tower;
- the billboard plaza (`board_main` at (79, 26, -263) and the seven small
  boards), corpo row's seven towers on the boulevard at z -330, the rooftop
  at (452..484, -300..-258), AFTERLIFE's sign, MILITECH's, RIPPERDOC's, the
  garage and its bay at (462, 0, -215), the moon;
- `road_spline` (the S4's 835 m from the hero's curb to the bay, which the
  braindance's car also drives) and every `cam_*`, `anchor_*`, `car_*`,
  `lamp_*` the page or the braindance reads, unless a shot is reframed on
  purpose (below);
- every braindance clue's box (`src/braindance/places.js`): the arcade
  blade, the hot phone at (11.4, 1.25, -121), the GPU at (44.4, 22, -240),
  the rooftop's signal mast and morse lamp, and the rest.

The shot table (`SHOTS` in `src/data/world.js`) is in the page's entry
chunk, which /recruiters loads too, so it is never edited: a shot is
reframed by moving its `cam_*` empties in the kit.

## The map

```
                         N (-z)
   x=-80        x=0          x=120                 x=440
     |           |             |                     |
z=-720 L=========C (megabuilding street, ends at the block's east wing x 60)
     |  MEGA     |#MB#
     |  (west    |canyon                 (far city)
     |   street) |            ARASAKA
     |  JAPAN-   |  (75,-490) forecourt opens onto the canyon
     |  TOWN     |                              corpo row towers
z=-330 |         |             E======================I  boulevard
     |           |   plaza  board |  corpo south side  |
z=-179 |---------B=============F (plaza street)          | AFTERLIFE
     |           |             |       interior        | rooftop
     |  ramp     |   east       |       (corpo south,   | garage
z=-80 P=====deck=+===deck=====Q (deck lands at grade)  |
     |  (elev.)  |  lobe        |       Santo Domingo)  |
z=+1 +-----------A=============+=====================H  south street
                 | avenue south arm, ends at the edge (z ~100)
                         S (+z)

   ===  the loop (driven one way round: A B C L P Q F E I H A)
   ---  network streets (the plaza street, the west street south of P,
        the south street's west arm), all connected, none ending in nothing
```

### The loop

One closed loop a car can drive through every district, and pavements a
person can walk all the way round it. It is a simple cycle with one
crossing over itself, on the deck:

| leg | from | to | street | length | districts |
| --- | --- | --- | --- | --- | --- |
| A to B | (0, 1) | (0, -179) | the avenue | 180 m | Kabuki Avenue |
| B to C | (0, -179) | (0, -720) | the canyon | 541 m | the Canyon (ARASAKA's forecourt) |
| C to L | (0, -720) | (-80, -720) | the megabuilding street | 80 m | the Megabuilding |
| L to P | (-80, -720) | (-80, -80) | the west street, climbing onto the deck from z -220 | 640 m | Japantown |
| P to Q | (-80, -80) | (120, -80) | the deck, over the avenue at 8.5 m, down to grade by x 110 | 200 m | the Deck |
| Q to E | (120, -80) | (120, -330) | the x 120 road, past the plaza | 250 m | Corpo Plaza |
| E to I | (120, -330) | (440, -330) | the boulevard | 320 m | Corpo Row |
| I to H | (440, -330) | (440, 1) | the garage street | 331 m | the Afterlife Block, then Santo Domingo |
| H to A | (440, 1) | (0, 1) | the south street (the hero's cross street) | 440 m | Santo Domingo, then Kabuki Avenue |

About 3 km. The S4's own road (avenue, plaza street, x 120, boulevard,
garage street) is a cut through it and stays as it is.

### The streets

Kerb to kerb, pavements to the lot line (the plane a building's ground
floor stands on):

| street | carriageway | lanes | pavements | lot lines |
| --- | --- | --- | --- | --- |
| avenue and canyon (x 0) | x -10..10 | 2 + 2 at 3.6 m, a 2.6 m kerbside bay each side, dashed centre line | 3.7 m | x -14, 14 |
| megabuilding street (z -720) | z -728..-712 | 2 + 2 | 4 m | z -732, -708 |
| west street (x -80) | x -87..-73 | 2 + 2; from z -220 to -90 a 10 m ramp in the middle between parapets, a 2 m service lane each side at grade | 4 m | x -91, -69 |
| the deck (z -80) | z -85..-75 at 8.5 m (underside 7.2) | 1 + 1, barriers, lit side bands | none (a walkway on its south side) | buildings on both sides |
| x 120 road | x 112..128 | 2 + 2 | 4 m | x 108, 132 |
| plaza street (z -179) | z -186..-172 | 1 + 1 and parking | 4 m | z -190, -168 |
| boulevard (z -330) | z -339..-321 | 2 + 2 and a planted median | 5 m | z -344, -316 |
| garage street (x 440) | x 432..448 | 1 + 1 and parking | 4 m | x 428, 452 |
| south street (z 1) | z -6..8 | 2 + 2 | 4 m | z -10, 12 |
| avenue's south arm (x 0, z 8..100) | as the avenue | | | |

Junctions are built as junctions: corner radii, crossings striped yellow and
black with the walk sign painted green on the road (Fn9gKhU_2_Q@69), stop
lines, crossing lights set into the road (XMaaEjT0LhU@64), signal boxes on
the corners (Zq4zTcIM0yQ@40). The ground is continuous: every square metre
inside the city's footprint is road, pavement, plaza, a building's footprint
or a yard, never the black plane.

### The districts

| district | territory | what it is |
| --- | --- | --- |
| Kabuki Avenue | x -69..108, z +100..-186 (the avenue, both lot rows and their backs, the hero junction, the south arm) | the hero avenue, finished: the plate's composition, built as a street |
| The Canyon | x -69..132, z -186..-560 | the far avenue's canyon of tall blocks and vertical signs, ARASAKA's forecourt opening on its east side |
| The Megabuilding | x -91..132, z -560..-860 | David's megabuilding closing the canyon, its street, the viaduct, the block's base |
| Japantown | x -160..-69, z -728..+12 | the west street: dense, low, lanterns, stalls, cables, blades, Lucy's rooftops, the ramp up to the deck |
| The Deck | z -95..-65, x -91..132, and the ramp | the elevated road across the avenue: columns, lit side bands, underside, the overpass the hero sees |
| Corpo Plaza | x 14..170, z -60..-330 (east of the avenue lots) | the billboard plaza and its raised deck, the plaza street, the x 120 road, the blocks round them |
| Corpo Row | x 108..460, z -160..-420 | the boulevard, the seven towers, the south side and the blocks behind it |
| The Afterlife Block | x 380..520, z -330..-176 | the garage street's north end: AFTERLIFE, MILITECH, the rooftop, RIPPERDOC, the garage |
| Santo Domingo | x 108..560, z -176..+100, and the south street's south side | the industrial edge: warehouses, tanks, pipes, stacks, power lines, yards |
| The Far City and Sky | everything past the kit | the procedural city (`skyline.js`), the landmark towers, the sky, cloud, the moon |

### Landmarks and sight lines

- **Down the avenue** (the hero): the canyon closes at the megabuilding,
  755 m off, under the holographic figure; ARASAKA's name stands in the band
  of sky between her and the canyon's right-hand roofs; the five landmark
  towers rise a kilometre off. The canyon's roofs step down toward the
  vanishing point (the line the old hero guard tested, kept).
- **Up the boulevard** (Experience): corpo row's crowns and logos, ARASAKA
  over the row's west end, the screen towers of the far city north of it.
- **From the rooftop** (About, Stack): west over the garage street to
  AFTERLIFE and MILITECH, corpo row's south side and, now, the blocks of the
  interior and the deck's lit bands beyond, out to the canyon's tall blocks.
- **From the garage's roof** (Contact): south-east over Santo Domingo's low
  roofs and stacks to the moon; everything under the moon's lower edge stays
  under a line rising 0.29 m per metre from the lens.
- **From the deck**: north up the canyon to the megabuilding and the figure,
  south down the avenue to the hero's junction.
- **From the west street**: the canyon's tall blocks over Japantown's low
  roofs; the megabuilding at its north end.

## The skyline from each shot

What stands against the sky in each shot (the far city fills the rest):

- **hero**: unchanged in outline. The canyon's roofline and its band of sky,
  the figure, ARASAKA's name, the megablock and its stepped tower, the five
  landmark towers. New: the canyon's blocks carry skybridges with rows of
  boards at their upper floors (ARL_JWwKdDs@21), each kept under the line
  the old roof guard tests so the band of sky stays as framed.
- **projects**: the board's housing, and over it ARASAKA (the board stands
  due south of it) and the canyon's east roofs.
- **experience**: corpo row's crowns, ARASAKA to the west, screen towers of
  the far city behind.
- **about / stack**: the far city's towers west and north-west, ARASAKA,
  the canyon's tallest blocks, the deck's lit bands low in the middle
  distance.
- **contact**: the moon over a low skyline; a few towers under it, as now.

## Districts

Each district has its frames, a palette, a light plan, what its buildings
are made of, what its street holds, and its life. Hex values are the kit's
neon (`NEON` in the builder): pink ff2e88, magenta ff3fd2, cyan 27dcf2, teal
2ee6c8, blue 2f6bff, amber ffb254, red ff003c, green 39ff9a, white eceae4,
purple a24bff, yellow fcee0a.

### Kabuki Avenue (the vertical slice)

Frames: Fn9gKhU_2_Q@69 (the night crossing: striped crosswalk, green WALK,
backlit poster panels, palms in planters, a canopy over the pavement),
XMaaEjT0LhU@64 (crossing lights in the road), ax5YUmkWf_Y@17 (the wet
road carrying sign colour, no streetlamps), Fn9gKhU_2_Q@38 and
x4ztgjvfU60@18 (how many kinds of sign one facade carries),
KvMY1uzSC1E@94 (a corner with a planter, a lamp column, neon on a lit wall),
ax5YUmkWf_Y@111 (blades stacked at angles up a lane wall).

- **Palette**: the plate's. Magenta and pink on the left, cyan and teal on
  the right, amber shop light low, the canyon's far end pink. Walls
  charcoal and navy, never grey.
- **Light**: signs and shopfronts light the street (the spill bake); the
  sodium lamps stay as accents; windows in bands, warm and cool by building.
- **Buildings**: every lot a real building, no painted elevation along the
  street: a lit ground floor of shops (glazing set back behind pilasters,
  shutters on the shut ones, doors to the flats above), storeys over it
  with real ledges and windows set into the wall (the window shader's
  reveal), balconies with rails and laundry on the residential ones, AC
  units and pipes, fire escapes, a setback crown on the tall ones, and a
  roof that is lived on. The side walls that show at the junction and down
  the lots' gaps are built too. Massing and heights keep the hero's roofline.
- **Signs**: blades at every height, boards flat on walls, letter signs on
  lattice frames over the shops, neon strips along ledges; Kiroshi, Nicola
  and the overpass's 空き未来へ as they are.
- **Street**: kerbs, pavements with paving and a tactile strip at each
  crossing, drains, manholes, crossings striped yellow and black with the
  walk sign on the road, crossing lights in the road, signal boxes, the
  sodium lamps, bollards, vending machines, bins, newspaper and food boxes,
  planters with palms, a bus stop, cables and festoons across, steam.
- **Life**: the crowd and the road cars on the road graph, the koi, the
  screens, flicker.

### The Canyon

Frames: mH2wmyeiIpA@32 (a street canyon: near-black masses, sparse amber and
cyan windows, red beacons on masts, a cyan blade at street level),
ax5YUmkWf_Y@130 (looking down a canyon: window bands, a free-standing blade,
a tall billboard, a row of screens bridging the gap, steam),
ARL_JWwKdDs@21 and x4ztgjvfU60@21 (the skybridge with its row of boards and
a column of small boards under it), ARL_JWwKdDs@1 (looking straight up: the
sky a small patch, searchlights, an AV's lit belly), ax5YUmkWf_Y@39
(ARASAKA by day: a slab of vertical fins and grooves, a stepped crown, a
light seam up the middle), YRL74JmhVgk@30 and Fn9gKhU_2_Q@77 (a corporate
forecourt at night: logo on the tower, palms, cube bollards, a hexagonal
hologram, kiosks).

- **Palette**: navy and teal-black masses, cyan and magenta blades, amber
  windows, ARASAKA's red.
- **Buildings**: taller blocks than the avenue's (45 to 70 m) on 30 m lots,
  each with a podium of shops, a shaft with window bands, setbacks; a
  skybridge between facing blocks every 120 m or so at 30 to 45 m, carrying
  boards. Tall vertical signs (the plate's columns of type) on most lots.
  ARASAKA's forecourt replaces the right-hand lot at z -448..-514: steps up
  to a raised paved court, palms in planters, cube bollards, cyan kiosks,
  the tower's lit lobby behind, a hologram on a pole.
- **Street**: as the avenue, wider pavements at the forecourt; the viaduct
  crossing at z -610 on its piers.

### The Megabuilding

Frames: KvMY1uzSC1E@13 (a shaft between blocks: balconies, ducts, pipes,
walkways at several heights, a row of amber dashes along a ledge),
Fn9gKhU_2_Q@21 (a light well: stacked decks with rails, amber dot lights on
the walkway edges, pink lit windows), Fn9gKhU_2_Q@24 and KvMY1uzSC1E@20 (the
base: heavy concrete decks with yellow edges and ribbed undersides on
columns, a column hung with red warning triangles, sagging cable bundles, a
pylon), Fn9gKhU_2_Q@1 (the passage through the base: green tubes overhead,
amber caged lamps on the walls, puddles), Fn9gKhU_2_Q@34 (an NCART entrance:
orange wall, cyan NCART panel, red LED strip, stairs up, vending boxes),
XMaaEjT0LhU@32 (the street under it: a scarred wall, a cracked pillar,
pipes under the deck).

- **Palette**: concrete grey-blue, yellow deck edges, amber dot lights,
  green underpass light, pink windows.
- **Buildings**: the megablock at the canyon's end becomes the megabuilding:
  its three sections kept in outline from the hero, with decks every storey
  band, balconies and ducts on its faces, a light well through it, its base
  a colonnade over the street with the passage, the NCART entrance, shops.
  Its street (z -720) runs along its face, with the block's east wing
  closing it at x 60 in a turning court.
- **Street**: the viaduct's piers, cable bundles, a pylon, warning signs,
  vending boxes, trash, steam.

### Japantown

Frames: KvMY1uzSC1E@94 (a corner: a blossom tree in a stone planter, an
orange lamp column, MOONCHIES on a purple wall, a railed walkway),
ax5YUmkWf_Y@111 (magenta katakana blades stacked at angles, green and white
kanji panels, a sagging cable, warm orange haze), D6ia1wjO7sg@220 (Lucy's
rooftop deck: a binocular viewer, tall lamps with long arms throwing cyan
pools, steps up to a terrace with glass rails, planters).

- **Palette**: magenta and pink blades, warm orange haze and lanterns,
  green and white panels.
- **Buildings**: lower and denser than the canyon (12 to 30 m), narrow lots
  (6 to 12 m), every one with a shop, lanterns, blades and cables; stalls
  under awnings along the pavement; a covered market hall; some roofs are
  decks with lamps and rails (Lucy's). The ramp up to the deck rises in the
  street's middle between parapets from z -220.

### The Deck

Frames: Zq4zTcIM0yQ@107 (an on-ramp under a heavier deck, a parapet, an
orange lamp on a tall pole, a second road crossing behind), Fn9gKhU_2_Q@74
and Fn9gKhU_2_Q@81 (a curved deck with a yellow edge stripe, its underside
glowing green and orange, its side a band of lit panels), OifiVCnFKzM@28 (a
long deck on columns curving into a ramp over low blocks), JtqIas3bYhg@64
(a road under a deck: a ribbed barrier, sodium lamps on posts),
Zq4zTcIM0yQ@166 (a curving deck seen from the road below).

- **Structure**: a box girder 1.3 m deep on paired columns, a lit band of
  panels along both sides, barriers with marker lights, a walkway on its
  south side, sodium lamps on tall posts, its underside ribbed and lit
  green and orange over the avenue. The hero sees it as the overpass it
  has always been, a little deeper.

### Corpo Plaza

Frames: KvMY1uzSC1E@29 and Fn9gKhU_2_Q@97 (wide stairs up to a raised plaza
with cyan strips in the risers), KvMY1uzSC1E@43 and Fn9gKhU_2_Q@111 (glass
balustrades lit cyan at their edge, planters, a screen wall beyond),
Fn9gKhU_2_Q@74 (freestanding billboard panels, a CCTV pole, benches),
YRL74JmhVgk@133 (freestanding screens over a hedge line, wet tiles smearing
them), YRL74JmhVgk@18 (polished paving and a hologram over round trees),
PzkEqhVByw4@86 (a sunken triangulated skylight, round trees, a hologram).

- **Palette**: clean concrete and glass, cyan edge light, the board's
  colours, palms and hedges.
- **Buildings**: the plaza's blocks as they are on the north (the board's
  housing), its east block moved east of a real x 120 road (it straddled it,
  the S4 drove through it), office blocks and a hotel along x 120, the
  deck landing at Q.
- **Street**: a raised plaza deck east of the board with stairs, glass
  rails, planters, freestanding screens, benches, CCTV poles, cube
  bollards, palms.

### Corpo Row

Frames: mH2wmyeiIpA@143 (towers crowned with lit logos, flat screens mid
face, an elevated track), mH2wmyeiIpA@182 (a street with striped paving and
a gantry over it carrying a red LED strip and lit boxes), BnnbP7pCIvQ@29
[Massket, layout only] (logos at tower tops, boards at mid height, palms,
bollards), KvMY1uzSC1E@43 (raised plaza edges).

- **Buildings**: the seven towers and their lobbies stay; the boulevard
  gets its median (palms, lamps), a gantry of lit boxes, lobby forecourts;
  the south side keeps its street and gains the blocks behind it to z -160.

### The Afterlife Block

Frames: Zq4zTcIM0yQ@40 (a Watson corner from above: a neon script bar sign,
a rust awning, wall AC units, bollards along the kerb, white light bars set
into the kerb, a rust textured strip, a crossing box), UKgCVtdSfE0@38 (the
same kerb at street level: studded paving, light strips in the kerb, black
bollards, a dented orange post), Zq4zTcIM0yQ@44 (a straight block: cable
bundles across the street at third-floor height, a skybridge, amber lamp
poles, small sparse signs).

- **Buildings**: AFTERLIFE's block, MILITECH, the rooftop and the garage
  stay; the street's other blocks get the Watson treatment: bars and
  clinics, rust awnings, cables slung across.

### Santo Domingo

Frames: mH2wmyeiIpA@60 (a factory block at night lit only by red-orange
haze: X-braced steel bays, railed catwalks, a stack against smoke, sodium
strip lamps), Fn9gKhU_2_Q@28 (storage tanks on a raised industrial
building, pipes, a steel frame, distant stacks, long-armed lamps),
KvMY1uzSC1E@177 (an industrial silhouette across water: stacks, a dome,
cranes, rows of small windows), Zq4zTcIM0yQ@174 and Zq4zTcIM0yQ@119
(Petrochem's long warehouse walls, numbered block towers with chevron
graphics), JtqIas3bYhg@80 and x4ztgjvfU60@38 (containers, oil drums,
gantries, utility poles with crossarms), mH2wmyeiIpA@100 and
JtqIas3bYhg@69 (the fuel price pylon).

- **Palette**: sodium orange, rust, steel, red-orange haze, a few cyan
  safety lights; dark between.
- **Buildings**: low (6 to 20 m) and wide: warehouses with sawtooth roofs
  and loading bays, a tank farm, a plant with stacks and catwalks, a fuel
  station with its pylon on the south street, yards behind fences with
  containers and drums, utility poles and wires. Low enough under the moon
  from Contact.

### The Far City and Sky

Frames: KvMY1uzSC1E@103, mH2wmyeiIpA@113 and @114 (screen towers over a low
glowing city), KvMY1uzSC1E@189 and @208 (the moon high, white, over a dark
roof), JtqIas3bYhg@72 (a V of towers, red beacons, a lattice mast),
x4ztgjvfU60@1 (searchlights), Zq4zTcIM0yQ@182 (hologram columns).

- `skyline.js` keeps doing the far city. It is moved out to the kit's new
  footprint (its keep-out rectangles), gains a few screen towers (a column
  of stacked screens on a slim tower) and hologram columns, and must hold
  from every point on the loop, from rooftops and from AV height: no
  building of it closer than the kit's last lot line.

## The kit

Shared by every district (`scripts/blender/ncw/`), so a district is mostly
a plan of lots and a few set pieces:

- **streets**: the network above as data (centrelines, widths, lanes,
  junctions); asphalt per leg and junction, markings, crossings, kerbs,
  pavements with their paving and tactile strips, drains and manholes; the
  road graph export.
- **lots**: each block's frontage cut into lots of the district's widths.
- **buildings**: one generator for a lot: a ground floor (shops, lobby,
  shutters, doors), a body of storeys (window bands from the window shader,
  ledges, balconies, AC units, fire escapes, pipes), setbacks and a crown, a
  roof (parapet, tanks, huts, plant, antennas, signs), the faces a street
  sees fully dressed, the others windowed; skybridges between two lots.
- **signs**: blades, boards, letter signs on frames, screens, neon strips:
  the site paints their faces (`SIGN_SIZES` and `WORLD_SIGNS`); no new
  words, no real brands beyond those already on the city.
- **props**, instanced: sodium lamps, bollards (black, and concrete cubes),
  bins, vending machines, newspaper and food boxes, signal boxes, crossing
  lights, planters with palms or blossom trees, benches, CCTV poles,
  kiosks, AC units, water tanks, antennas, dishes, stalls, lanterns, cable
  bundles, warning triangles, drums, containers, utility poles.
- **set pieces**: corpo row's towers, ARASAKA, the board and its housing,
  the rooftop, AFTERLIFE's block, the garage, the megabuilding, the deck.

## Budgets

The floor (README, measured 2026-10-10 on devbox1): the hero draws 161 calls
and 437k triangles on high (every pass), 140 and 207k on a phone; GPU 5.8 ms
and 1.9 ms at p50; the kit 48.5k triangles; GLBs 2.48 MB and 1.11 MB. The
tiers' budgets are 16.7 ms and 22 ms. Nothing may be turned down: the
rebuild pays for itself with merging per tile, instancing, culling, LODs
nobody sees switch and streaming.

Per district, static kit triangles (high / phone), instanced props, and its
share of the GLB bytes (high / phone):

| district | tris | props | bytes |
| --- | --- | --- | --- |
| Kabuki Avenue | 70k / 40k | 2,500 | 0.65 / 0.30 MB |
| The Canyon | 70k / 36k | 1,500 | 0.55 / 0.26 MB |
| The Megabuilding | 45k / 24k | 800 | 0.35 / 0.16 MB |
| Japantown | 55k / 28k | 2,000 | 0.45 / 0.20 MB |
| The Deck | 10k / 7k | 300 | 0.08 / 0.04 MB |
| Corpo Plaza | 45k / 24k | 1,200 | 0.35 / 0.16 MB |
| Corpo Row (towers included) | 50k / 28k | 1,000 | 0.40 / 0.18 MB |
| The Afterlife Block (garage included) | 40k / 24k | 800 | 0.35 / 0.16 MB |
| Santo Domingo | 45k / 22k | 1,200 | 0.35 / 0.16 MB |
| shared textures (road, paving, concrete, shops, garage walls) | | | 1.1 / 0.4 MB |
| **total** | **430k / 233k** | **11,300** | **4.6 / 2.0 MB** |

Per frame, all passes, at any held shot, flight or point on the loop:

| | high | phone |
| --- | --- | --- |
| draw calls | 280 | 230 |
| triangles | 1.1M | 500k |
| GPU p50 (devbox1, headless, contended) | 10 ms | 6 ms |
| CPU p50 | 3 ms | 4 ms |
| texture memory (GPU) | 96 MB | 48 MB |

How a district stays inside: its kit is merged per material per 128 m
tile, so frustum culling drops what is off screen; props are one instanced
draw per prototype over the city, culled per instance on the CPU and
repacked only when the visible set changes; small props are not drawn past
300 m (180 m on a phone), where they are under two pixels; facade detail
(balconies, ledges, AC) is tagged detail and the phone's GLB drops it where
the window shader carries the read.

## How it loads

- **First paint** stays the poster, as now; nothing here touches the entry
  chunk.
- **City live** needs what the hero sees: the core pack (Kabuki Avenue, the
  Canyon, the Megabuilding, the landmarks, the far city's code) no larger
  than today's whole GLB (2.48 MB high, 1.11 MB phone), so city live is no
  later than today's.
- **Behind it**: the other districts in packs (Japantown and the Deck;
  Corpo Plaza and Corpo Row; the Afterlife Block and Santo Domingo), fetched
  after the first frame, each built into the scene over a few idle frames
  so no long task lands on a scroll. A flight to a district whose pack has
  not landed waits on it (the glitch covers the wait) rather than flying
  into nothing; on a fast connection they are in before the reader leaves
  the hero.
- The light bake (`spill.js`) re-runs per pack over its own tiles; the
  clearance field (`clearance.js`) and the far city's keep-out learn the new
  footprint.

## Exports for later

Unused by the page for now, written by the builder next to the GLBs and
documented in the README:

- `road-graph.json`: nodes (junctions, with position) and edges (each a
  polyline at 1 m, its lanes with their side and direction, its pavements,
  its speed), the loop as a list of edges, the S4's road.
- `collision.json`: axis-aligned and oriented boxes for every building
  mass, wall, column, prop and kerb a car or a walker must not pass through,
  per tile.
- `districts.json`: each district's bounds and its tiles.
- named anchors: `spawn_drive`, `spawn_walk`, a `poi_<name>` at every
  landmark and braindance place, and the existing `cam_*` and `anchor_*`.

## Review

Every district: render a still target in Blender first; build; sweep (eight
views round the compass at points along the loop at street, roof and AV
height; any blank wall, visible tile repeat, floating edge, unlit box, hole,
z-fight, pop or world edge is a defect); then two fresh reviewers who built
nothing get only the district's frames, the renders and this rubric, and
score 1 to 10:

1. **silhouette**: the skyline and massing against the frames
2. **density and layering**: near, middle and far depth; how full it is
3. **signage**: kinds, density, placement, angle, colour
4. **colour and light**: the palette, where light comes from, what is dark
5. **street detail**: what a walker passes at kerb and pavement level
6. **life**: people, traffic, movement, flicker
7. **finish**: no seams, voids, floating or unlit pieces, repeats

plus the three worst things. A district is done at 8 or more on every line
from both, with a clean sweep, and its scores recorded. Then the whole loop
is driven and walked by the dev camera for two more fresh reviewers.
