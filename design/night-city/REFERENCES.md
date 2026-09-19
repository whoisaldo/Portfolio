# Night City entrance

## Current version: neon avenue

The current `neon-road-wide.png` and `neon-road-portrait.png` follow Ali's supplied neon street reference. They replace the cherry blossom setting with a dense avenue, towering holographic advertisements, wet asphalt, Kiroshi optics, Arasaka and Nicola signs. The foreground contains no baked-in car or pedestrian. The existing live S4 supplies the car. These are generated background plates, not a new live 3D city model or a literal reconstruction of a named street.

Both the cinematic and portfolio use the same responsive WebP plate. The city camera does not cut or change framing at the handoff. The fade now runs from song time 33.8 to 35.65; the page begins appearing at 33.9. Three brief registration errors use narrow fixed image strips, scanlines and small text translation, all driven by the song clock. The drift spline remains unchanged.

`node scripts/optimize-night-city.mjs` encodes the current neon plates.

## Archived version: Cherry Blossom Market, Japantown

The destination is a reconstruction of the street outside Cherry Blossom
Market in Cyberpunk 2077. It is based on the references below, rather than a
mixture of signs and landmarks from unrelated districts.

- [CD Projekt Red's street photography guide](https://www.cyberpunk.net/en/news/50110/your-trip-to-night-city-best-spots-for-street-photography) identifies the market's pink holographic trees, giant statue, lanterns and glass roof.
- [Krzysiek Burzyński's Japantown environment work](https://kosmicznykowboj.artstation.com/projects/5XlaxJ), and [part two](https://kosmicznykowboj.artstation.com/projects/bKy1Ym), establish the district's layered architecture and infrastructure. Burzyński was its subdistrict owner during production.
- [Martin Kocisek's Japantown architecture](https://greenshadedthing.artstation.com/projects/483Pr2) provides architectural context from another original environment artist.
- [In-game exterior view](https://steamcommunity.com/sharedfiles/filedetails/?id=2961420814) shows the concrete portal, red English sign, mint Japanese sign, flower outline, holographic tree, KENDACHI frontage and cantilevered yellow building.
- [Night-time entrance photograph](https://x.com/cyberpunkig/status/1495379249368289283) establishes the lighting, lantern arrangement, railings and depth of the covered market.
- [Street-level gameplay view](https://www.gamepressure.com/cyberpunk-2077/send-in-the-clowns/z1e066) establishes the road, pavement and market entrance at car height.

The portal, signs, canopy, storefront lighting and trees follow these views.
Street dimensions and the camera position are estimated to accommodate the
existing Audi drift. This is an interpretation of that location, not an
extracted game level or a measured one-to-one reconstruction. No downloaded
game screenshot is served by the website.

## Assets and rendering

`night-city.blend` is the editable Blender scene, built through Blender MCP.
`scripts/blender/build_night_city.py` rebuilds its geometry, lighting and two
cameras. It creates only `Night_City_Street` and preserves the Audi scenes.
The camera lens and positions match the existing live drift at 16:10 and
390:844 screen proportions.

`blockout-wide.png` and `blockout-portrait.png` are Cycles renders. The final
`market-wide.png` and `market-portrait.png` are AI-assisted paintovers of those
renders using the actual location photographs as visual references. They add
surface wear, shop detail and lighting while retaining the road perspective.
The browser serves compressed WebP versions. It renders the Audi, its wheels,
smoke, lights, contact shadow and reflection in Three.js over those plates.
The city itself is an offline background, not a live 3D city model.

The following sections describe the archived market version. Its original PNGs and Blender source remain available for comparison. The encoding command above now targets the current neon plates.

Original encoding command:

```sh
node scripts/optimize-night-city.mjs
```

## Choreography

All cues remain in song seconds in `src/lib/cues.js`.

| Song time | Action |
| --- | --- |
| 27.0–30.45 | The lunar scene dissolves into the street during the ignition swell. |
| 30.1 | The existing drift starts on the drum entry. |
| 31.5 | The car reaches its original apex. The city holds fully visible. |
| 33.65 | The street starts dimming toward the portfolio's treatment. |
| 34.15 | The portfolio content begins appearing over the same image and framing. |
| 35.1 | The departing car and smoke have faded out. |
| 36.0 | The cinematic releases input and disposes its WebGL resources. |

The original path keys, spline evaluation, slip, steering and body movement
are unchanged. The departure continues on the spline's existing end tangent.
Night lighting and shorter, softer lamp trails integrate the car with the
street. The extra reflection pass includes only the car, uses a 512-square
target, and respects the wet-reflection effect switch. Reduced motion skips
the cinematic; WebGL failure retains the flat-car fallback.

## Verification

Checked in Chrome on devbox1 at 1440×900 and 390×844. The browser checks
covered both cuts, the same image and framing on either side of the handoff,
the absence of a clipping transition, title clearance, delayed portfolio
entrance, the full car fade, WebGL fallback, reduced motion, keyboard/button
skip, replay and resource teardown. A live run with the actual soundtrack
confirmed cue ordering and that audio continues after the cinematic.

The original and revised drift evaluators returned identical position,
heading, slip and speed at 1,083 samples across three viewport scale factors.
Changing the wet-reflection switch produced a visible pixel difference in a
held car frame, confirming the new reflection is rendered.

`npm run build`, `npm run lint`, `npm run check:audio`, `npm run check:s4`, and
`git diff --check` passed. The build retains its existing large-chunk warning.
Local review artifacts `preview.mp4`, `drift-preview.png`,
`portfolio-preview.png` and `verification.json` are excluded from Git.
