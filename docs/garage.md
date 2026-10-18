# Garage

The replacement garage is a two-car Night City workshop in the city's existing
renderer. It appears as the visitor scrolls into Garage. Its six stations are
arrival, S4 build, S4 engine bay, S6 build, S6 engine bay and Afterlife workbench.
The final station keeps the internal ID `shop`. The S6 visit also includes rear,
front and normal/lowered stance views. There is no entrance button or photograph
mode in the replacement.

This document records the revision-3 implementation contract and the B7 source
audit on 2026-10-16. The audit starts at `afa2e7b` on `garage/docs`. That snapshot
still has the old viewer. B2's replacement room and B5's runtime are separate
deliveries. Their acceptance results must be recorded after integration. No
legacy file is deleted by this documentation change.

## How the room is built

World units are metres, with +Y up. The outer shell stays at x=452..476,
z=-230..-200, below the 8 m roof. The existing door is at x=452,
z=-218..-212. S4 parks at [462,0,-215], S6 at [462,0,-222], both facing +X.
Cars load separately and must never be baked into the room asset.

`scripts/blender/build_night_city_world.py` builds the city through `ncw/`.
B2 owns the architecture, placements, cameras and export pipeline, including the
new `ncw/districts/garage_interior.py`. G1 owns the workshop prototypes in
`scripts/blender/ncw/garage/`. B2 imports those prototypes rather than rebuilding
them. G1's `build_garage_props.py` writes a headless preview and the dimensions,
materials, triangle counts and collision boxes in `garage-props.json`.

The detailed room belongs in `world-high-garage.glb` and
`world-phone-garage.glb`, with matching garage prop buffers. The core contains
only the small street-visible envelope and metadata needed before loading.
Unplaced garage prototypes must stay out of core too. B2's
`design/night-city-world/garage-layout.json` records placements, cameras, routes,
fixtures and collision. `garage-materials.json` records the actual map slots,
hashes, tier sizes, UV conventions and material parameters.

B5 registers late wall, satin floor and poster maps before the room's first ready
frame. The door threshold alone is wet. The whole workshop floor must not use the
street's mirror treatment. Material and prop batches retain the five sectors
`garage_apron`, `garage_s4`, `garage_s6`, `garage_shop` and `garage_mezzanine`.
Door/window portal visibility affects rendering, while collision remains complete.
B4 supplies the room-space lights and shared static car probe from the same
exported fixture metadata. The old standalone renderer and its post stack are
not part of this rebuild.

The shared readiness job includes the room, declared maps, both car rigs, lights,
probe and an actual warm frame. It starts after the first hero frame at idle;
approaching Stack or requesting a car/part raises priority. EntryGate must not
wait for garage assets. Film, Look, braindance and roam use this same room.

## The old room's identity

Keep `design/night-city-garage/night-city-garage.blend` as the editable identity
reference. The old `room` preset faced its working corner. The original builder
records how those objects were made. G1 and B2 must finish reproducible
replacements before that builder can be retired.

| Reference piece | Replacement and retained input |
| --- | --- |
| AFTERLIFE AUTO, WATSON / BAY 01 | G1 city sign geometry, placed by B2 above the bench; add BAY 02 through the same city sign system. |
| Earth/moon screen | Retain `textures/moon.jpg` and `public/scenes/garage/moon-braindance.mp4`. B2 supplies named `garage_screen` geometry/UVs; B5 binds the city monitor. The still blocks readiness; the optional loop does not. |
| Adam Smasher print | Retain `textures/adam-smasher.jpg` and its source record. G1 supplies backing; B2 supplies the named mapped surface; B5 binds that exact image. |
| David's yellow jacket and rolling chair | G1 rebuilds the old `David_*` shapes, reflective bands and teal emblem. The silhouette stays on phone. |
| Bench, pegboard, tools and red drawers | G1 prototypes replace the original geometry; B2 keeps them grouped beneath the amber practical. |
| Maine's arm and Rebecca's Guts | G1 rebuilds the old `Maine_*` and `Rebecca_*` forms with a cradle and pegs. These are fictional display props, not claims about Ali's possessions or car mods. |
| Pink/cyan tubes, overhead lights, ducts, drains and service desk | G1/B2 rebuild them with existing city materials and fixed fixture metadata. Diagnostic marks are illustrations, not live telemetry. |

The monitor and poster are retained artwork. They remain visible when personal
garage photographs are disabled. The old full room GLB is a reference runtime
asset, not a substitute for the new geometry. The three old painted wall JPEGs
are renders of that room, with the car hidden; they are not photographs of a real
garage. Their derivation is recorded in the [world README](../design/night-city-world/README.md#references).

## Rebuild commands and ownership

Run commands from the intended checkout. Only B2 regenerates shared world output;
only G1 regenerates prop previews; only A1 regenerates the S6. The coordinator
owns package script changes. Other units request those owners' builds instead of
overwriting their generated files.

The world builder requires `PROJECT_ROOT`; the command below sets it explicitly.
It will use the replacement interior after B2's commit is integrated.

```sh
blender -b --factory-startup --python-expr "import os; PROJECT_ROOT=os.getcwd(); exec(compile(open('scripts/blender/build_night_city_world.py').read(), 'build_night_city_world.py', 'exec'))"
npm run world:assets
npm run check:world
```

The headless prop preview writes `design/night-city-garage/garage-props.blend`
and `garage-props.json`. It refuses to replace a live Blender session.

```sh
blender -b --factory-startup --python scripts/blender/build_garage_props.py
blender -b --factory-startup --python scripts/blender/build_garage_props.py -- --render /absolute/review/path
```

The S4 source is `design/audi-s4/source/FINAL_MODEL_S4.fbx` with its supplied
textures. `build_s4.py` calls `hood_and_details.py`, packs textures, exports
`ali-s4-source.glb` and renders `front-review.png`. `optimize-s4.mjs` needs both
outputs and updates `public/models/ali-s4.glb`, the poster and `src/data/s4.js`.
The [S4 README](../design/audi-s4/README.md#rebuild) records the live Blender MCP
workflow. Its obsolete viewer description is historical.

```sh
/Users/aldo/.local/share/uv/tools/mcp-for-blender/bin/python scripts/blender/run_mcp.py --server /Users/aldo/.local/bin/blender-mcp
node scripts/optimize-s4.mjs
npm run check:s4
```

A1 owns the S6's Blender MCP
build, `build_s6.py`, `s6_engine_bay.py`, `design/audi-s6/ali-s6.blend`,
`ali-s6-source.glb`, optimizer, checker and `src/data/s6.js`. Once those source
assets exist, the export/check commands are:

```sh
node scripts/optimize-s6.mjs
node scripts/check-s6.mjs
```

At the audit snapshot, A1's committed branch `635e7b1` has the shared loader and
a null S6 URL; no final S6 model or README exists. Its builder is incomplete.
Running it is not a complete S6 rebuild yet. `check:s6` and `check:garage` package
scripts await their owners/coordinator. A1 must publish the completed sequence
and final modification notice before model acceptance. The GTA model mentioned
in private references is visual reference only and must never become a source
asset or be committed.

`src/three/car/object.js` shares one source request per kind and creates disposable
instances through `createObject('s4' | 's6')`. B4 prepares phone inspection geometry
from these same sources. The S6 has no separate phone GLB. A smaller runtime mesh
does not imply a smaller download. Preserve the moving body, hood, both S6 strut
sets, wheels and owner-local mod anchors through preparation/merging. Lowering
moves the body and body-owned parts, with fixed wheel centers and tyre contacts.
It is an illustration, with no published numeric ride-height claim.

Every render, browser capture or timing run acquires
`~/Library/Caches/garage-revamp/GPU-LOCK` atomically with `mkdir`, waits while
`~/Library/Caches/ncw/city/GPU-LOCK` exists, and removes only its own lock
immediately after the run. Do not run these builds during another unit's timing
or capture work. B7's documentation round performs no render. Its assigned dev
port, if needed, is 5273, bound to `0.0.0.0`.

## Photographs and text fallback

B3 owns the only switch, `GARAGE_PHOTOS_ENABLED = false` in
`src/components/garage/features.js`. B5 imports it at the integration boundary;
B2 imports the same dependency-free module in its atlas emitter. There is no
second flag, storage setting or query parameter that enables photographs.
`SHOW_PRICES` remains a separate price switch.

With the photo flag false, no garage photograph button, tab, pin, crop, gallery,
photo board, prefetched image or atlas readiness dependency is active. Personal
photographs elsewhere on the site are outside this flag. Do not remove their
shared inputs or globally stop image generation.

Preserve every file in `src/assets/Photos/` and `public/photos/garage-s6/`,
`src/data/photos.js`, `garage-s6-photos.js`, the photograph records/pins in
`garage.js` and `garage-s6.js`, and all `life.js` images/captions/dates/links.
Preserve `GaragePhotos.jsx`, `PhotoBay.jsx`, PartCard's crop helper and Shop's
photo layouts/styles behind the flag. B5 hands off its old inline photo helpers
to B3 before removing the section's old bay. Retain the existing S4 30-percent
crop behavior and the S6's genuine engine/grille context mappings. Do not expose
private references or real plate text in public derivatives.

No-WebGL, world-off, load failure and context loss use `GarageText` in ordinary
document flow. It contains both cars, every grouped part, selectable text
details, authorized prices, workbench/life text and links, and Contact.
It has no dead hood/stance control or seven-screen placeholder. Once a complete
room frame is ready, B5 automatically changes layouts, preserving station,
selection, focus and the reader's viewport anchor within 2 CSS pixels. Readiness
after the reader has passed Garage arms the next approach without moving them
back. Reduced motion uses the same room with cuts and immediate hood/stance
states; ambient animation and video stop. These are integration requirements,
not results established by this audit.

## Budgets and evidence

The ceilings below come from revision 3. They apply to the whole ready visit,
including both open engine bays. MB means decimal source bytes; MiB means decoded
GPU allocations. No quality reduction or adaptive shedding may be used to pass.

| Item | High | Phone |
| --- | --- | --- |
| Workshop triangles | 90,000 | 40,000 |
| S4 prepared inspection triangles | 128,868 | 60,000 |
| S6 prepared inspection triangles | 150,000 | 70,000 |
| Visible main-scene triangles, street included | 450,000 | 220,000 |
| Complete-frame calls, all passes | 240 | 160 |
| Submitted triangles, all passes | 1,000,000 | 500,000 |
| Room GLB with declared maps | 2.2 MB | 1.0 MB |
| Shared S6 source GLB | 3.5 MB | 3.5 MB |
| Reused S4 source | 2.092 MB | 2.092 MB |
| Three GLBs combined | 7.8 MB | 6.6 MB |
| Core GLB | 2.6 MB | 1.2 MB |
| Garage photograph/board requests | 0 bytes | 0 bytes |
| External garage artwork/video | 0.8 MB | 0.35 MB |
| Resident garage textures, cars/mips/probe included | 64 MiB | 32 MiB |
| New world texture edge | 1024 px | 512 px |
| Judged frame time, cpu50 + termHi | 16.7 ms | 16.7 ms |

Count prop buffers and every external map/media request in actual delivery
reports too. Shared requests count once. The retained loop is about 274 KB; it
is not a photograph and is not free of network/texture cost.

Retain current high DPR 1.5, 2.2 MP, reflection 1024 and 9,000 rain; phone DPR
1.25, 0.9 MP, reflection 512 and 3,000 rain. The configured phone budget is 22 ms,
but this garage's judged ceiling remains 16.7 ms. Use the unchanged city harness
`MEASURE.md` and OS GPU-time upper bounds, not old viewer interval measurements.
Require zero invalid windows, no adaptive shedding, median interval <=17.5 ms
and no interval >100 ms after the first second. A 390x844 run on devbox1 measures
the phone tier on this Mac, not a phone GPU.

The integrated candidate must pass lint/build, check:world, check:s4, check:s6
and check:garage. B8 verifies both viewports, every station/flight, actual camera
clearance, keyboard controls, hidden photos/network, context recovery, reduced
motion, braindance/roam and the budgets. /recruiters retains its source/content
and must compare pixel-identically on production previews. The lazy Garage may
change the common entry chunk; retain all original/new hash rows honestly.

## Retirement audit

This is the reference graph at `afa2e7b`, not a claim that every parallel branch
still has these imports. Re-run the graph on the integrated candidate. Each row
names an existing file or explicitly lists each file in a family. Nothing below
authorizes deleting another unit's files.

| File | Current consumers or purpose | Owner and removal condition |
| --- | --- | --- |
| `src/components/GarageModel.jsx` | Imported by `sections/Garage.jsx`; owns old canvas, markers, orbit/zoom/reset/fullscreen and Explore behavior. | B5 deletes after the active shared-world and text replacement pass, preserving photo-only helpers through B3 first. |
| `src/lib/garage-scene.js` | Dynamically loaded by `lib/garage3d.js`; imports old room/floor; `check-world.mjs` reads `PRESETS.front` from its text. | B5 deletes after replacing loader and old-preset assertion; shared car loader/slim stay. |
| `src/three/garage-room.js` | Imported only by `garage-scene.js`; loads old room GLB and loop, clones materials and owns lights/video. | B5 deletes after city monitor/art/light lifecycle replaces it. |
| `src/three/garage-floor.js` | Imported only by `garage-scene.js`; owns old Reflector shader. | B5 deletes with the second renderer; retain the shared city's floor/reflection implementation. |
| `scripts/blender/build_night_city_garage.py` | Historical construction source for old GLB, editable room and identity groups; documented by the old README. Has a hard-coded original checkout ROOT. | B7 may delete only after G1/B2 reproduce every signature piece. Do not execute it against its default original checkout. |
| `scripts/optimize-garage.mjs` | Reads ignored `design/night-city-garage/garage-source.glb`, writes old runtime GLB; old README documents it. No package script calls it. | B7 may delete after old loader independence and identity migration. There is no package cleanup to apply for this script today. |
| `public/scenes/garage/night-city-garage.glb` | Requested by `three/garage-room.js`. | B7 may delete only after B5 stops requesting it and B6 proves independence. Do not delete its neighboring loop. |
| `design/night-city-garage/garage-source.glb` | Ignored local intermediate read by the old optimizer; absent from this worktree. | Eligible local output only after the same gates; not a committed deletion. |
| `design/night-city-garage/night-city-garage.blend` | Editable identity reference for G1/B2 and packed artwork. | Keep. Retirement of runtime GLB does not retire this source. |
| `design/night-city-garage/README.md` | Historical construction/provenance and G1's live prop-kit instructions. | Keep. G1 owns its kit section until handoff; update historical behavior descriptions only through an agreed owner change. |
| `design/night-city-garage/garage-props.blend` and `garage-props.json` | G1 preview, measured bounds, materials, fit and collision metadata used by B2/B4. | Keep, G1-owned replacement assets. |
| `design/night-city-garage/textures/Concrete023_1K-JPG_Color.jpg`, `Concrete023_1K-JPG_NormalGL.jpg`, `Concrete023_1K-JPG_Roughness.jpg` | Old builder reads Color/NormalGL. `ncw/kit.py` reads the family for city concrete/garage wall; B2 also derives workshop maps from it. | Keep all three. B2 alone can migrate shared paths and rebuild before pruning originals. |
| `design/night-city-garage/textures/Concrete048_1K-JPG_Color.jpg`, `Concrete048_1K-JPG_NormalGL.jpg`, `Concrete048_1K-JPG_Roughness.jpg` | Old floor reads Color/NormalGL; `ncw/kit.py` reads the family for sidewalk. | Keep all three, shared city inputs. |
| `design/night-city-garage/textures/PaintedMetal004_1K-JPG_Color.jpg`, `PaintedMetal004_1K-JPG_NormalGL.jpg`, `PaintedMetal004_1K-JPG_Roughness.jpg` | Old builder reads all three for the red cabinets/paint; packed into the old room. | Keep with the identity source/archive. The new kit's city materials do not authorize deleting the old room's texture inputs. |
| `design/night-city-garage/textures/moon.jpg` | Old room builder; `optimize-world.mjs` re-encodes the shared monitor still; referenced by the world README/moon comments. | Keep. B2 owns any source-path migration. |
| `design/night-city-garage/textures/adam-smasher.jpg` | Old builder's poster; B2's required new named art surface. | Keep with its provenance. The builder's ignored `references/smasher.png` fallback is absent here. |
| `public/scenes/garage/moon-braindance.mp4` | Old room's video lifecycle; required reusable city monitor loop. | Keep. B5 migrates playback, pausing and disposal before removing old wrapper. |
| `design/night-city-world/textures/garage-wall-back.jpg`, `garage-wall-magenta.jpg`, `garage-wall-cyan.jpg` | `ncw/kit.py` loads them with `painted()`; old garage geometry uses them; world README records their source rendering. | Potential obsolete derivatives after B2 removes material references and rebuilds. B2 notes say replacements no longer place them, but material declarations still read them. Keep now. |
| `public/scenes/world/moon.webp` | Generated by `optimize-world.mjs`; shared city monitor still. | Keep, B2-owned output, not obsolete room output. |

The following integration files stay in the repository, with narrowly scoped
changes by their owners. Their remaining reference is a blocker to deleting the
old files above, even when the visible viewer is gone.

| File | Reference to replace or preserve |
| --- | --- |
| `src/sections/Garage.jsx`, `src/routes/Home.jsx` | B5 replaces the old panel/eager import with one synchronous section shell and a lazy shared-world/text implementation. Preserve the old inline photograph logic in B3's archive before removal. |
| `src/lib/garage3d.js` | B5 replaces its old scene import and `garageWarm`/`garageExpected` gate with the shared readiness facade. The filename may stay. |
| `src/lib/garage.js` | Keep compatible callers/events and `openGarage('intake')`; B5 adds retained `{carId, modId}` requests. |
| `src/components/EntryGate.jsx` | B5 removes `garageExpected`/`garageWarm` waits. Door/deck readiness and other covers stay. |
| `src/world/scroll-stage.js`, `src/world/stage.js` | B5 removes old viewer prefetch, `garageCovers` and the special `coverWorld('garage')` rule; other cover clients stay. |
| `src/data/world.js`, `src/world/shots.js` | B5 replaces `GARAGE_FRONT`, old viewer-pose matching and `COVER_DIM.garage` with the six-station camera contract. City door/sign data stays. |
| `scripts/check-world.mjs` | B5 replaces the source-text `PRESETS.front` assertion with new anchor/continuity checks before deleting `garage-scene.js`. |
| `src/index.css` | B5 retires `.garage-model:fullscreen`, `.garage-model` and exclusive old bay styles. `.garage-pin`, `.garage-pin-label`, `.garage-frame` and `.garage-row` also serve old photo/list markup; preserve required archive styling through B3 first. Do not remove shared CSS by keyword. |
| `scripts/blender/ncw/cameras.py`, `ncw/districts/garage.py`, `ncw/kit.py` | B2 replaces old-preset cameras and painted-wall placement/material references. Retain real city door/tubes/signs and all shared texture inputs. |
| `scripts/optimize-world.mjs`, `src/data/world-assets.js` | B2 retains moon conversion and updates only its own generated references. No active personal-photo atlas, board geometry or readiness URL with the flag false. |
| `src/world/car.js`, `src/three/car/slim.js` | B4 replaces old room-relative lighting and prepares owner-preserving inspection rigs. These shared S4/phone modules stay. Old-room mentions in comments are not deletion authority. |
| `src/world/garage.js`, `city.js`, `materials.js`, `merge.js`, `props.js` | B5 retains the city door, tubes and monitor, adding late maps/sectors. These are shared-world modules, not the standalone renderer. |
| `src/braindance/recording.js`, `places.js`, `engine.js`, `roam/roam.js`, `roam/nav.js`, `roam/nav-worker.js` | B6 migrates garage shots, BMW workbench clue and collision/readiness. No direct old room loader import was found, but recorded poses/nav still require integrated independence proof. |
| `src/data/garage.js`, `garage-s6.js`, `life.js`, `photos.js`, `garage-s6-photos.js`; `src/components/garage/*` | Keep car facts, prices, IDs, photo data, all dormant UI/helpers and the sole photo flag. B3 owns these, except existing shared life/photo manifests outside its assigned edits. |
| `src/assets/Photos/*`, `public/photos/garage-s6/*` | Keep every source and derivative, including assets used elsewhere on the site. |
| `src/components/ui/CoverBox.jsx`, `src/components/Picture.jsx`, `src/lib/gpu.js`, `src/world/progress.js`, car loaders/source models and npm dependencies | Shared utilities/resources. Remove only proven exclusive old-viewer uses, never these files or installed Three.js addons wholesale. |
| `.gitignore`, S4/old room/world READMEs | Historical output paths and viewer descriptions are documentation references. Preserve source/provenance records; coordinator/owners may revise stale behavior text after integration. |

Ignored old preview PNGs, `preview.mp4`, `verification.json` and `references/`
are local review inputs, absent in this worktree. They are not public runtime
dependencies and are not part of a blanket design-directory cleanup.

B7 can retire its three committed legacy files only after G1/B2's identity
replacement is reproducible, B5's automatic 3D/text replacement passes, the photo
archive survives, B6 no longer relies on old geometry/poses, and B2 migrates any
shared source paths before removing originals. Then rerun a clean rebuild and
all affected checks on the integrated commit. A passing current lint/build alone
does not establish those conditions.

## B7 verification record

The documentation round passed `npm run lint` and `npm run build`.
The build reports the existing large-chunk advisory. `npm run check:world`
exited 0 and printed `World OK` in two runs, but also logged Vite dependency-scan
errors saying the server was being restarted or closed. Those logs are retained
for B5; the check is not described as console-clean.

All local documentation links resolve, the new files contain no em dashes, and
SHA-256 comparison confirms 227 retained source, photo and UI files are
unchanged. These checks do not establish a completed S6 conversion.

Cache evidence is under `~/Library/Caches/garage-revamp/review/B7/`:
`archive-before.json`, `archive-after.json`, `legacy-references.json`,
`focused-checks.json`, `lint.log`, `build.log` and both `check-world` logs. The reproducible focused
checker is `agents/B7/verify.mjs` beside this run's notes. No visual sheet was
produced because this round changes documentation only.
The clean replacement asset rebuild, source-path retirement and integrated
visual/performance checks remain with the dependent owners and B8.
