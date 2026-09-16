# codex-3d notes

Build dir: `/private/tmp/intro/car3d/build`  
Format: three  
Model: gpt-6-astra (xhigh)  
Thread: 01a0ab9b-8db2-7460-bc61-ede53893a6bd

## Specification

```
Object: one late-1980s-inspired mid-engine wedge supercar reimagined as a cyberpunk street racer: long flat nose, a razor-thin full-width LED headlight bar, deep front splitter, box-flared wide arches, side intakes behind the doors, a fastback rear with a tall flat rear wing on twin uprights, a full-width tail-light strip and a mesh rear grille.
Use: drifts across a portfolio's intro screen in three.js, seen from a low three-quarter camera about 2 m above the ground. It enters from the right travelling left, swings its rear out by about 45 degrees so its nose and headlights sweep the camera, then launches out of the left of the frame. The front, the rear, both sides and the roof are all seen; the underside is only glimpsed through the arches, so a plain dark floor pan is enough. Wheels spin, front wheels steer, headlights and tail lights are emissive. The page adds its own underglow light, smoke and tyre trails.
Style: stylised realism, continuous surfaces, no visible box seams. The attached image is the exact car to match (its stance, proportions, colour blocking, the headlight and vent shapes, the wing), not a loose inspiration.
Materials: body gloss yellow #fcee0a with clearcoat (metalness 0.1, roughness 0.28, clearcoat 1, clearcoatRoughness 0.08); lower body, splitter, diffuser, wing uprights and mirrors matte black #101012 (roughness 0.7); glass dark tinted #0b1016 (metalness 0.9, roughness 0.05, opacity 0.75); tyres matte black #141414; wheels five-spoke dark gunmetal #2a2a30 with a brushed look (metalness 0.9, roughness 0.35) and a thin yellow #fcee0a lip; headlight bar emissive cool white #dff6ff at emissiveIntensity 4; tail-light strip emissive magenta #ff2e88 at emissiveIntensity 3; a thin emissive cyan #34e5ff pinstripe along each sill and along the wing's trailing edge; a dark cabin with two black bucket seats behind the glass.
Size: 4.5 m long, 2.0 m wide, 1.12 m tall, wheelbase 2.62 m, track 1.72 m, wheels 0.68 m in diameter with 0.26 m wide tyres; front hubs at z = +1.31, rear hubs at z = -1.31; rests on y = 0, faces +Z.
Parts to expose: wheel_fl, wheel_fr, wheel_rl, wheel_rr (each a group placed at its hub centre; tyre and rim spin about the group's local X axis), steer_fl, steer_fr (pivot groups at the front hub centres that contain wheel_fl and wheel_fr and rotate about Y), body, headlights, taillights, wing, glass.
Idle animation: none.
Constraints: no text, no logos, symmetric about the x = 0 plane, all four tyres touch y = 0 exactly, wheel centres at y = 0.34, under 120k triangles, every material a MeshPhysicalMaterial or MeshStandardMaterial so the page's lights and environment map work, no lights inside the object, no textures, no external files.
```

## Build

Created [object.js](/private/tmp/intro/car3d/build/object.js): yellow wedge supercar with flared arches, detailed wheels, emissive strips, rear grille, and wing.

- Exposed parts: `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`, `steer_fl`, `steer_fr`, `body`, `headlights`, `taillights`, `wing`, `glass`.
- Animate through `group.userData.parts`: wheels rotate about local X; steering pivots rotate about Y. No idle animation.
- Compromises: simplified cabin and closed lamp lids with the specified LED bar.
- Validation: `node check.mjs` prints **OK**. 115,206 triangles; dimensions 2 × 1.12 × 4.5 m.

## Review pass 1

Updated [object.js](/private/tmp/intro/car3d/build/object.js):

- Smoothed fenders and flattened the bonnet.
- Closed roof/window gaps and removed cabin overlaps.
- Fixed floating seams and sill lighting.
- Reduced paint reflections and improved tyre clearance while steering.
- Reduced geometry to 55,474 triangles.

Dimensions, ground contact, and animation parts remain intact. `node check.mjs` prints **OK**.

## Review pass 2

Updated [object.js](/private/tmp/intro/car3d/build/object.js):

- Adjusted tone mapping to preserve yellow paint and neon colors.
- Rebuilt seams and cowl vents directly on the body triangles to prevent clipping and flicker.
- Closed the bonnet seam outline.

Stance, dimensions, and animation parts are unchanged. **55,456 geometry triangles.** `node check.mjs` prints **OK**.

