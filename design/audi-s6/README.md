# Ali's S6

A 2013 Audi S6 (C7, pre-facelift, US sedan) in Quartz Gray, modelled for this site in Blender through Blender MCP. Every surface is original topology built by the scripts below: nothing is imported.

## How it is made

- `scripts/blender/s6_body.py` lofts the body the way a draughtsman fairs a car from a lines plan: tables of offsets (heights and half-breadths at stations and waterlines) set to Audi of America's published 2013 S6 dimensions (4,925 mm long, 1,874 mm wide, 2,086 mm across the mirrors, 1,468 mm high, 2,912 mm wheelbase, 919 mm and 1,096 mm overhangs, 1,615 and 1,606 mm tracks) and checked against Ali's photos and Audi's 2012 side view. Patches, each a quad grid: the side band (nose, wings, doors, quarters and tail, over the shoulder crease, with real door shut lines), the hood on its hinge, the boot lid, the greenhouse (side glass, pillars, windscreen, roof, rear window), the underbody and wheel wells, and a cabin at the detail the garage camera needs. Openings for the lamps, grille, intakes and diffuser are cut along each part's own outline; the headlamps are laid on the nose's own surface so they fold into the wing. The S6 bumper features from his front photo (the bright ledge over each intake, the lower lip and its black centre slot, washer, tow-eye and sensor covers), the boot lid's stamped plate recess, the raked B-pillar and quarter-window trims and the doors' shut lines are built on the finished surfaces.
- `scripts/blender/s6_parts.py` builds what makes the car Ali's: the pre-facelift LED headlamps and tail lamps traced off his photos, his gloss black RS-style honeycomb grille with black rings and the outlined quattro, the S6 lower intakes, aluminium-look mirror caps, the black rear rings and S6 badge, V8T badges, the quad oval tips in the early diffuser, the wheels and calipers, and the Quartz Gray paint. Each part hangs on a named socket; `SOCKET_MOVES` in `s6_body.py` records where the body moved one.
- `scripts/blender/s6_engine_bay.py` builds the 4.0 TFSI hot V from his engine-bay photo, pitched under the hood.
- `scripts/blender/build_s6.py` assembles and rigs the car and writes `ali-s6.blend` and the uncompressed `ali-s6-source.glb` (a local build artefact).

## Rebuild

```sh
blender -b --factory-startup --python scripts/blender/build_s6.py
npm run car:assets
npm run check:s6
```

Through Blender MCP the same script rebuilds the live `Ali_S6_Final` scene and writes nothing unless `WRITE_OUTPUTS` is set. The saved `.blend` holds that scene only.

## What is provisional

- Wheels: Audi's 19-inch five-parallel-spoke design (US chart E), 8.5J with 255/40 R19 tyres, until a photo of Ali's wheels settles them. Calipers and discs follow the factory S6.
- Paint: Quartz Gray Metallic (LY7G), matched to his overcast front photo.
- The V8T fender badges and the finish of the rear badges, which his photos do not show in daylight.
- Ride height is Audi's unloaded stock height. Virtual Link lowers the body as a rig parameter; his actual drop is not modelled.
- The cabin is simplified: seats, dash, console, steering wheel and the rsNAV screen where the factory screen rises from the dash.

## Rig

Metres, +Y up, +Z forward, +X vehicle left after export, like the S4. `ali_s6` holds `body` (everything on the air suspension, so lowering is one translation) and the wheel pivots `steer_fl`, `steer_fr`, `axle_rl`, `axle_rr` with their `wheel_*` groups. In the body: `headlights`, `taillights`, `hood_hinge` > `opening_hood` with two gas struts (`hood_strut_*` and `hood_strut_*_r`), `engine_bay`, `RS_honeycomb_grille`, `exhaust_tips`, `mirror_left`/`right` with their caps, `cabin` > `head_unit_screen`, and one anchor per mod: `mod_ie_ecu_tune`, `mod_ie_tcu_tune`, `mod_virtual_link`, `mod_rs_grille`, `mod_rsnav_head_unit`. No real registration appears on the model.

`check:s6` decodes the compressed GLB and verifies the rig, the 255/40 R19 radius, wheelbase and track, the hood's hinge and struts, the hot V, the grille and mirror cap colours, the four tips, the triangle budget, and that no mesh reproduces the shape reference used to measure the lines plan (`scripts/s6-reference-check.mjs`: it holds only hashes and shape statistics of that reference, never its geometry).
