// src/data/world.js: the city behind the page, as data.
//
// Copy lives in src/data, and the world has copy: the words on its signs. It
// also has a shot list, which is the closest thing this site has to a
// storyboard, so it lives here beside the section list it follows rather than
// inside the renderer.
//
// Camera positions are not typed here. They are empties in the Blender scene
// (cam_<shot> and cam_<shot>_target, see scripts/blender/build_night_city_world.py),
// exported in the world GLB and read by name, so moving a camera in Blender
// moves it on the site. What lives here is everything a camera position does
// not say: the lens, how dark the city sits behind that section, what the
// car is doing, and how the shot moves while it holds.
//
// Nothing here is a claim. The towers are derived from experience.js and
// carry each organisation's real colour and its name, and nothing else: no
// floor counts, no logos, no tickers. The billboards show the key art the
// Work deck already shows.
import { sections } from "./site";
import { experiences } from "./experience";
import { featuredProjects } from "./projects";

/**
 * One entry per section in site.js, in the same order.
 *
 *   dim     the scrim's opacity while this shot holds: 0 shows the whole
 *           city, 0.7 leaves it at about 30% behind text someone is reading
 *   fov     vertical field of view, degrees
 *   move    how the shot moves while it holds, from the section's own
 *           progress (0 to 1): "dolly" slides the camera along the vector
 *           between its two anchors' `_a` and `_b` variants, "pan" turns it
 *   car     where the car is: an anchor or a road distance key in the GLB
 */
export const SHOTS = {
  hero: { dim: 0, fov: 30, car: "curb" },
  projects: { dim: 0.7, fov: 38, car: "plaza" },
  experience: { dim: 0.7, fov: 40, move: "dolly", car: "corpo" },
  about: { dim: 0.7, fov: 42, car: "rooftop" },
  stack: { dim: 0.7, fov: 42, move: "pan", car: "rooftop" },
  garage: { dim: 0.7, fov: 48, car: "bay" },
  contact: { dim: 0, fov: 42, car: "bay" },
};

/**
 * Where the garage flight ends: GarageModel's `front` preset and lens
 * (PRESETS.front and the 48 degree camera in src/lib/garage-scene.js), in the
 * car's own space. Copied rather than imported, because importing that
 * module would pull the whole interactive garage into the city's chunk;
 * check:world fails if the two ever disagree.
 */
export const GARAGE_FRONT = { position: [3.6, 1.75, 5.8], target: [0, 1.4, -1], fov: 48 };

/** Every section has a shot. check:world asserts the same thing against the
 *  anchors in the GLB. */
export const shotIds = sections.map((s) => s.id);

/** The scrim while something the world makes way for holds the screen. */
export const COVER_DIM = {
  // The garage's own 3D viewer: the city steps back to about 15% and stops.
  garage: 0.85,
};

/** A case study reads over a city held at about 20%. */
export const ROUTE_DIM = 0.8;

export const shotDim = (id) => SHOTS[id]?.dim ?? 0.7;
export const routeDim = () => ROUTE_DIM;

/** Corpo row: one tower per entry in experience.js, in its order, crowned
 *  in the organisation's own colour and named on a vertical sign. */
export const towers = experiences.map((e, i) => ({
  slug: e.slug,
  name: e.company,
  accent: e.accent,
  index: i,
}));

/** The plaza's boards: the Work deck's entries, key art and status. */
export const boards = featuredProjects.map((p, i) => ({
  slug: p.slug,
  title: p.title,
  status: p.status,
  // The same volt / fuchsia the deck's flags use (see projects.js).
  accent: p.accent,
  art: p.images?.[0] ?? null,
  index: i,
}));

/**
 * The signs, keyed by the id the Blender kit gave each sign face
 * (sign_<id>; a blade's back is <id>_b and a far copy <id>_far, and both
 * read the same words). Brand names are type set in Chakra Petch at
 * runtime, never a logo. The four rooftop signs are the ones Skyline.jsx
 * carried, in the site's own colours; Kiroshi, Nicola and ARASAKA are the
 * plate's; the Japanese is the plate's street: ramen, sushi, the
 * maneki-neko, the overpass.
 *
 *   lines    what it says, top to bottom (a vertical sign stacks letters)
 *   color    the tube
 *   face     "board" paints a lit panel behind the words (ads), otherwise
 *            the words are the light
 *   flicker  one of the few tubes that is not quite right
 */
export const WORLD_SIGNS = {
  kiroshi: { draw: "kiroshi", lines: ["KIROSHI", "キロシ", "BETTER YOU,", "A BRIGHTER", "TOMORROW"], color: "#2f7bff" },
  nicola: { draw: "nicola", lines: ["NICOLA", "TASTE TOMORROW", "ニコラ"], color: "#ff2438" },
  arasaka: { draw: "wordmark", lines: ["ARASAKA"], color: "#ff003c" },
  militech: { draw: "wordmark", lines: ["MILITECH"], color: "#fcee0a" },
  afterlife: { draw: "wordmark", lines: ["AFTERLIFE"], color: "#ff2e88", flicker: true },
  ripperdoc: { draw: "ripperdoc", lines: ["RIPPERDOC"], color: "#eceae4", flicker: true },
  ramen: { draw: "vertical", lines: ["ラーメン"], color: "#ff3fd2", icon: "bowl" },
  menya: { draw: "wordmark", lines: ["麺屋"], color: "#ff2b2b" },
  sushi: { draw: "board", lines: ["寿司", "SUSHI"], color: "#ffd24a" },
  maneki: { draw: "maneki", lines: ["招き猫"], color: "#27dcf2" },
  shinsen: { draw: "vertical", lines: ["新鮮な寿司"], color: "#27dcf2" },
  shokuji: { draw: "vertical", lines: ["食事処"], color: "#eceae4", flicker: true },
  yoru: { draw: "vertical", lines: ["夜の味"], color: "#ff3fd2" },
  mirai: { draw: "vertical", lines: ["未来の目"], color: "#2ee6c8" },
  bar: { draw: "wordmark", lines: ["BAR"], color: "#ff2b2b", flicker: true },
  hotel: { draw: "vertical", lines: ["ホテル"], color: "#ff2e88" },
  karaoke: { draw: "vertical", lines: ["カラオケ"], color: "#a24bff" },
  bento: { draw: "vertical", lines: ["弁当"], color: "#ffb254" },
  pachinko: { draw: "vertical", lines: ["パチンコ"], color: "#fcee0a", flicker: true },
  sora: { draw: "wordmark", lines: ["空き未来へ"], color: "#2ee6c8" },
  izakaya: { draw: "vertical", lines: ["居酒屋"], color: "#ff2e88" },
  yakitori: { draw: "vertical", lines: ["焼き鳥"], color: "#ffb254" },
  denno: { draw: "vertical", lines: ["電脳"], color: "#27dcf2", flicker: true },
  sakaba: { draw: "vertical", lines: ["酒場"], color: "#ff3fd2" },
  kusuri: { draw: "vertical", lines: ["薬局"], color: "#39ff9a" },
  arcade: { draw: "vertical", lines: ["ARCADE"], color: "#fcee0a", latin: true },
  mirai2: { draw: "vertical", lines: ["未来"], color: "#a24bff" },
  kaiten: { draw: "vertical", lines: ["回転寿司"], color: "#2f7bff" },
  beauty: { draw: "vertical", lines: ["美しさは、力だ"], color: "#ff3fd2" },
};

/** The far canyon's tall vertical signs cycle through these. */
export const CANYON_WORDS = [
  { lines: ["居酒屋"], color: "#ff2e88" },
  { lines: ["焼き鳥"], color: "#ffb254" },
  { lines: ["電脳"], color: "#27dcf2" },
  { lines: ["薬局"], color: "#39ff9a" },
  { lines: ["未来"], color: "#a24bff" },
  { lines: ["酒場"], color: "#ff3fd2" },
  { lines: ["夜の街"], color: "#2f7bff" },
];
