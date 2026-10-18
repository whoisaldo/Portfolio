# Ali's S6

A 2013 Audi S6 (C7, pre-facelift, US sedan) in Quartz Gray, built in Blender through Blender MCP. The body is an adapted model of an A6 C7 sedan (the 2015 facelift), converted here into Ali's pre-facelift S6; the parts that make it his car are modelled for this site.

## How it is made

- `scripts/blender/s6_base_import.py` reads the A6 C7 sedan model from outside the repository and writes `design/audi-s6/base/a6c7-base.blend`, a local intermediate that is gitignored and never committed. It only drops the model's armature, turns the car to face -Y and scales it about the middle of its wheelbase to the S6's 2,912 mm, with the wheel centres at the 255/40 R19 tyre's radius.
- `scripts/blender/s6_base.py` converts it. Every piece of the model is sorted by what it is: the shell, the hood, the glass, the cabin and the mirrors stay; the facelift's lamps, grille, intake bars and fog-lamp surrounds, badges, plates, lower rear valance, exhaust outlets and wheels go. The model's own surfaces are then reshaped into the 2013 S6's, by moving its vertices (nothing is cut away or patched over), so the panels keep their stamped look: the grille opening is drawn in from the facelift's hexagon to the S6 single frame Ali's RS grille fills; each intake opening becomes the S6 pocket, its bottom raised over the lip and its top edge brought forward as the bright ledge; the bumper's edge under each headlamp follows the pre-facelift lamp's lower edge; the rear bumper's lower edge follows the S6 diffuser's arch over the tips. The pre-facelift lamps fill the lamp openings, their tops on the hood and boot-lid edges, the headlamps' inner tips at the grille's top corners. Under the rear bumper sit the diffuser, its blade, the quad tips and the bright surround; the S6's slim reflectors are let into the bumper's lower corners. The mirrors keep their shape with aluminium-look caps. The plenum cover, the footwell, wheel-well, intake and boot closures and a windscreen top seal close gaps the model leaves open. The cabin and the black seals and underbody are reduced where the garage cameras cannot see the difference, and the cabin is kept clear of the tyres' swept space.
- `scripts/blender/s6_parts.py` builds what makes the car Ali's: the pre-facelift LED headlamps and tail lamps traced off his photos, his gloss black RS-style honeycomb grille with black rings and the outlined quattro, the S6 intakes' sensors and blades, the black rear rings and S6 badge, V8T badges, the quad oval tips in the early diffuser, the wheels and calipers, and the Quartz Gray paint.
- `scripts/blender/s6_engine_bay.py` builds the 4.0 TFSI hot V from his engine-bay photo, pitched under the hood.
- `scripts/blender/build_s6.py` assembles and rigs the car and writes `ali-s6.blend` and the uncompressed `ali-s6-source.glb` (a local build artefact).

## Rebuild

```sh
blender -b --factory-startup --disable-autoexec --python scripts/blender/s6_base_import.py   # once; S6_BASE_FBX points at the model
blender -b --factory-startup --disable-autoexec --python scripts/blender/build_s6.py
npm run car:assets
npm run check:s6
```

Through Blender MCP the same script rebuilds the live `Ali_S6_Final` scene and writes nothing unless `WRITE_OUTPUTS` is set. The saved `.blend` holds that scene only.

## What is provisional

- Wheels: Audi's 19-inch five-parallel-spoke design (US chart E), 8.5J with 255/40 R19 tyres, until a photo of Ali's wheels settles them. Calipers and discs follow the factory S6.
- Paint: Quartz Gray Metallic (LY7G), matched to his overcast front photo.
- The aluminium-look window trim, the V8T fender badges and the finish of the rear badges, which his photos do not show in daylight.
- Ride height is Audi's unloaded stock height. Virtual Link lowers the body as a rig parameter; his actual drop is not modelled.
- The cabin is the model's, reduced, in black leather and dark trim, with the rsNAV screen where the factory screen rises from the dash.

## Rig

Metres, +Y up, +Z forward, +X vehicle left after export, like the S4. `ali_s6` holds `body` (everything on the air suspension, so lowering is one translation) and the wheel pivots `steer_fl`, `steer_fr`, `axle_rl`, `axle_rr` with their `wheel_*` groups. In the body: `headlights`, `taillights`, `hood_hinge` > `opening_hood` with two gas struts (`hood_strut_*` and `hood_strut_*_r`), `engine_bay`, `RS_honeycomb_grille`, `exhaust_tips`, `mirror_left`/`right` with their caps, `cabin` > `head_unit_screen`, and one anchor per mod: `mod_ie_ecu_tune`, `mod_ie_tcu_tune`, `mod_virtual_link`, `mod_rs_grille`, `mod_rsnav_head_unit`. No real registration appears on the model.

`check:s6` decodes the compressed GLB and verifies the rig, the 255/40 R19 radius, wheelbase and track, the hood's hinge and struts, the hot V, the grille and mirror cap colours, the four tips, the cabin staying inside the body, the triangle budget, and that no mesh reproduces an earlier shape reference (`scripts/s6-reference-check.mjs`: it holds only hashes and shape statistics of that reference, never its geometry).
