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
// carry each organisation's real colour, its name and the logo the
// Experience section already shows, and nothing else: no floor counts, no
// tickers. The billboards show the key art the Work deck already shows.
import { sections } from "./site";
import { experiences } from "./experience";
import { featuredProjects } from "./projects";

/**
 * One entry per section in site.js, in the same order.
 *
 *   dim     the scrim's opacity while this shot holds: 0 shows the whole
 *           city, 0.7 would leave it at about 30%. The reading shots sit
 *           at about a third since the page's panes became smoked glass
 *           (src/components/ui/Panel.jsx): the pane frosts the city behind
 *           the text, so the scrim no longer has to darken all of it
 *   fov     vertical field of view, degrees
 *   move    how the shot moves while it holds, from the section's own
 *           progress (0 to 1): "dolly" slides the camera along the vector
 *           between its two anchors' `_a` and `_b` variants, "pan" turns it
 *   car     where the car waits: a stop on the road the car drives (see
 *           src/world/car.js), from the car_* anchors in the GLB
 *   via     the named empties the flight in runs through, where a straight
 *           line would go through a wall
 *   follow  the flight in looks at the car rather than where it is going
 *   carLead how far into the flight in (0 to 1) the car reaches this stop;
 *           0.72 unless it has to be clear of the camera sooner
 *   portraitBack, portraitFov
 *           how a phone's narrower frame is met: stand further back along
 *           the line of sight, open the lens, or both
 *   shift, portraitShift
 *           a lens shift up the frame, in clip space (0.12 puts a level
 *           camera's horizon 44% from the top): verticals stay vertical
 */
export const SHOTS = {
  // The hero stands low in the avenue, a person's eye over the wet road,
  // and looks straight up it: the plate's own composition. A phone reads its
  // own anchors (cam_hero_portrait) and keeps them as they are.
  // `mirror`: the shot shows the wet road, so the road's planar mirror is
  // drawn for it (src/world/mirror.js); elsewhere it gives way to the
  // road's baked streaks and is not drawn at all.
  hero: { dim: 0, fov: 50, shift: 0.12, car: "curb", portraitBack: 1, portraitFov: 1.24, portraitShift: 0.17, mirror: true },
  // A touch darker than the other reading shots: the lit board sits right
  // behind the section's opening lines.
  projects: { dim: 0.4, fov: 38, car: "plaza", portraitBack: 1.15 },
  // Stepping back off the kerb would put a phone's camera in a wall: it
  // takes the wider lens instead.
  experience: { dim: 0.32, fov: 38, move: "dolly", car: "corpo", portraitBack: 1, portraitFov: 1.45 },
  // A rooftop camera cannot step back off its roof: a phone gets the wider
  // lens instead.
  about: { dim: 0.34, fov: 42, car: "rooftop", portraitBack: 1, portraitFov: 1.45 },
  stack: { dim: 0.32, fov: 42, move: "pan", car: "rooftop", portraitBack: 1, portraitFov: 1.45 },
  // Off the roof, down to the street behind the car, across to where the
  // door lines up with the bay, in after it and round it to its front: the
  // flight ends on the garage viewer's own first frame.
  garage: {
    dim: 0.34,
    fov: 48,
    car: "bay",
    mirror: true,
    via: { in: ["cam_garage_edge", "cam_garage_street", "cam_garage_across", "cam_garage_door", "cam_garage_in", "cam_garage_swing"] },
    follow: true,
    // In the bay before the camera reaches the door.
    carLead: 0.45,
  },
  // Back round the car, out of the door and up onto the garage's roof, the
  // moon beside the headline: huge on a wide screen, smaller and up in the
  // corner on a phone, where the links fill the rest of the screen.
  contact: {
    dim: 0,
    fov: 42,
    car: "bay",
    portraitBack: 1,
    portraitFov: 1.2,
    via: { in: ["cam_garage_swing", "cam_garage_in", "cam_contact_via"] },
    moon: { scale: 0.7, portrait: 0.34 },
  },
};

/**
 * The visit inside the garage: six stations the camera moves between as the
 * reader scrolls through the section, and the order it takes them in. The
 * section's own progress `p` (0 at the arrival, 1 at the shop wall) is the
 * clock; every number below is a fraction of it (PLAN.md, "Progress, camera
 * paths and interruption policy", is where they were decided).
 *
 * Poses are empties in the kit like every other shot (cam_garage_<key>,
 * _target, _portrait and _target_portrait, the lens in the empty's `fov` and
 * `fov_portrait`), and so are the paths between them
 * (cam_garage_path_<route>_01 ...). Until the kit has them the camera
 * stands where GARAGE_POSES and GARAGE_ROUTES put it: the plan's starting
 * points, not checked against the finished room.
 */
export const GARAGE_STATIONS = [
  { id: "arrival", p: 0, pose: "arrival", label: "Arrival" },
  { id: "s4", p: 0.2, pose: "s4", label: "S4" },
  { id: "s4-bay", p: 0.4, pose: "s4_bay", label: "S4 engine bay" },
  { id: "s6", p: 0.6, pose: "s6", label: "S6" },
  { id: "s6-bay", p: 0.8, pose: "s6_bay", label: "S6 engine bay" },
  { id: "shop", p: 1, pose: "shop", label: "Afterlife workbench" },
];

/** The beats inside the S6's visit, where its rear and its stance hold. */
export const GARAGE_BEATS = { "s6-rear": 0.515, "s6-front": 0.6, "stance-normal": 0.645, "stance-lowered": 0.695 };

/** [position], [target], vertical fov; a phone's own where it has one. */
export const GARAGE_POSES = {
  arrival: { wide: [[454.0, 2.7, -222.8], [462, 0.4, -218.5], 58], portrait: [[454.0, 3.6, -228.6], [461.5, 0.8, -220], 84] },
  s4: { wide: [[468.5, 1.8, -210.8], [462.8, 0.85, -215], 48], portrait: [[469.4, 2.3, -211.3], [462.5, 0.85, -215], 60] },
  s4_bay: { wide: [[466.4, 3.15, -215.9], [463.3, 1.05, -215], 44], portrait: [[466.9, 3.45, -215.6], [463.25, 1.05, -215], 58] },
  s6_rear: { wide: [[456, 1.6, -225.9], [460.3, 0.7, -222], 48], portrait: [[456, 1.6, -225.9], [460.3, 0.7, -222], 60] },
  s6: { wide: [[467.8, 1.55, -225.6], [462.5, 0.8, -222], 48], portrait: [[470.0, 2.1, -226.0], [462.5, 0.8, -222], 60] },
  s6_stance: { wide: [[465, 0.72, -225.4], [463.5, 0.45, -222.9], 46], portrait: [[465, 0.72, -225.8], [463.5, 0.45, -222.9], 52] },
  s6_bay: { wide: [[466.7, 3.45, -222.8], [463.3, 1.05, -222], 44], portrait: [[467.2, 3.65, -222.5], [463.3, 1.05, -222], 58] },
  shop: { wide: [[468.5, 2.2, -214.5], [475.1, 2.15, -215], 58], portrait: [[469.0, 2.5, -220.5], [475.1, 2.1, -220.5], 64] },
  s4_rear: { wide: [[456.6, 1.5, -211.8], [460.2, 0.7, -215], 48], portrait: [[456.6, 1.5, -211.8], [460.2, 0.7, -215], 60] },
};

/** The points a path runs through between its two poses (not counting
 *  them), where the plan has any. `entry` and `exit` cross the real door. */
export const GARAGE_ROUTES = {
  apron_s4rear: [[455, 2.8, -210], [456, 1.8, -210]],
  entry: [[451.5, 2.4, -215.3], [455, 2.8, -216.2]],
  arrival_s4: [[455, 2.8, -210], [468, 2.6, -210]],
  s4_s4bay: [],
  s4bay_s6rear: [[470, 3, -215.9], [470, 2.8, -226.8], [456, 2, -226.8]],
  s6rear_s6: [[456, 2, -226.8], [468, 2, -226.8]],
  s6_stance: [],
  stance_s6bay: [],
  s6bay_shop: [[469, 3, -222.8], [469, 2.5, -214.5]],
  exit: [[458.2, 3, -219], [455, 2.7, -216.5], [451.5, 2.4, -215.3], [446, 2.3, -216.5]],
};

/** A phone's own points where its poses make the landscape path wrong:
 *  its shop pose faces the middle photo group from further down the aisle,
 *  and the landscape path's last point is past it, so it would double
 *  back. */
export const GARAGE_ROUTES_PORTRAIT = {
  s6bay_shop: [[469, 3, -222.6]],
};

/** The scroll, a stretch at a time:/** The scroll, a stretch at a time: holding a pose, or on a path between
 *  two. Each starts where the one before ends. */
export const GARAGE_TIMELINE = [
  { to: 0.06, hold: "arrival" },
  { to: 0.14, route: "arrival_s4", from: "arrival", into: "s4" },
  { to: 0.23, hold: "s4" },
  { to: 0.3, route: "s4_s4bay", from: "s4", into: "s4_bay" },
  { to: 0.42, hold: "s4_bay" },
  { to: 0.49, route: "s4bay_s6rear", from: "s4_bay", into: "s6_rear" },
  { to: 0.54, hold: "s6_rear" },
  { to: 0.58, route: "s6rear_s6", from: "s6_rear", into: "s6" },
  { to: 0.61, hold: "s6" },
  { to: 0.635, route: "s6_stance", from: "s6", into: "s6_stance" },
  { to: 0.705, hold: "s6_stance" },
  { to: 0.77, route: "stance_s6bay", from: "s6_stance", into: "s6_bay" },
  { to: 0.86, hold: "s6_bay" },
  { to: 0.94, route: "s6bay_shop", from: "s6_bay", into: "shop" },
  { to: 1, hold: "shop" },
];

/** What the cars do over the visit, as [from, to, at from, at to] ramps of
 *  `p`: each hood opens as the camera rises over its bay and closes as it
 *  leaves, and the S6 comes down once on Virtual Link while its stance
 *  holds, and back up before its hood opens. With reduced motion a ramp is
 *  a cut at `cut`. */
export const GARAGE_STATES = {
  hood_s4: [[0.26, 0.3, 0, 1], [0.42, 0.46, 1, 0]],
  hood_s6: [[0.73, 0.77, 0, 1], [0.86, 0.9, 1, 0]],
  lowering: [[0.655, 0.685, 0, 1, 0.67], [0.705, 0.73, 1, 0]],
};

/** Every section has a shot. check:world asserts the same thing against the
 *  anchors in the GLB. */
export const shotIds = sections.map((s) => s.id);

export const shotDim = (id) => SHOTS[id]?.dim ?? 0.34;

/** Corpo row: one tower per entry in experience.js, in its order, lit in
 *  the organisation's own colour, its logo on the crown (the Experience
 *  section's own mark, src/world/logos.js) and its name on a vertical sign. */
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
 * runtime, never a logo. The four rooftop signs are the ones the old
 * Skyline.jsx carried, in the site's own colours; Kiroshi, Nicola and ARASAKA are the
 * plate's; the Japanese is the plate's street: ramen, sushi, the
 * maneki-neko, the overpass. Kiroshi and Nicola are the avenue's two big
 * screens (src/world/ads.js), their words set over an advertising image.
 *
 *   lines    what it says, top to bottom (a vertical sign stacks letters)
 *   color    the tube
 *   face     "board" paints a lit panel behind the words (ads), otherwise
 *            the words are the light
 *   flicker  one of the few tubes that is not quite right
 */
export const WORLD_SIGNS = {
  kiroshi: { lines: ["KIROSHI", "キロシ", "BETTER YOU,", "A BRIGHTER", "TOMORROW"], color: "#2f7bff" },
  nicola: { lines: ["NICOLA", "TASTE TOMORROW", "ニコラ"], color: "#ff2438" },
  arasaka: { draw: "wordmark", lines: ["ARASAKA"], color: "#ff003c" },
  militech: { draw: "wordmark", lines: ["MILITECH"], color: "#fcee0a" },
  afterlife: { draw: "wordmark", lines: ["AFTERLIFE"], color: "#ff2e88", flicker: true },
  ripperdoc: { draw: "ripperdoc", lines: ["RIPPERDOC"], color: "#eceae4", flicker: true },
  // Over the garage's door: the bay's number, as the Garage section labels it.
  bay_02: { draw: "wordmark", lines: ["BAY 02"], color: "#fcee0a" },
  bay: { draw: "wordmark", lines: ["BAY 01"], color: "#fcee0a" },
  // On its corner, the shop's name as the garage viewer's room carries it.
  garage_blade: { draw: "vertical", lines: ["AFTERLIFE AUTO"], color: "#39dcec", latin: true },
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

/**
 * The street's own signs: the blades, panels and light boxes every facade
 * collects, in standard sizes so one painted design serves many walls. The
 * kit hangs them (sign_st_<size>_<n>, see the builder's clutter()) and the
 * site gives each the next design of its size, round and round. Shop words,
 * the way a Night City street is written: noodles, sake, pawn, karaoke,
 * chrome. Nothing here is a reading or a status.
 *
 *   size   the sign's metres (w x h) in the kit; the design is painted for it
 *   style  "tube" neon letters on a dark board, "backlit" dark letters on a
 *          lit panel, "outline" a neon border round the words, "led" a dot
 *          matrix, "icon" a pictogram in tube
 */
export const SIGN_SIZES = {
  bs: [0.8, 2.0],
  bm: [1.0, 3.2],
  bl: [1.2, 5.0],
  ps: [1.8, 0.8],
  pm: [2.8, 1.2],
  bx: [1.2, 1.2],
};

export const STREET_SIGNS = {
  bs: [
    { lines: ["酒"], color: "#ff2b2b", style: "backlit" },
    { lines: ["夜"], color: "#a24bff", style: "tube" },
    { lines: ["愛"], color: "#ff2e88", style: "tube" },
    { lines: ["龍"], color: "#ff3a2a", style: "outline" },
    { lines: ["24H"], color: "#fcee0a", style: "led" },
    { lines: ["BAR"], color: "#ff2e88", style: "tube", latin: true },
    { lines: ["鮨"], color: "#ffd24a", style: "backlit" },
    { lines: ["薬"], color: "#39ff9a", style: "tube" },
    { lines: ["OPEN"], color: "#ff3a2a", style: "led", latin: true },
    { lines: ["未来"], color: "#2ee6c8", style: "tube" },
  ],
  bm: [
    { lines: ["居酒屋"], color: "#ff2e88", style: "tube" },
    { lines: ["焼肉"], color: "#ff3a2a", style: "backlit" },
    { lines: ["餃子"], color: "#ffb254", style: "tube" },
    { lines: ["占い"], color: "#a24bff", style: "outline" },
    { lines: ["質屋"], color: "#ffd24a", style: "backlit" },
    { lines: ["両替"], color: "#39ff9a", style: "tube" },
    { lines: ["麻雀"], color: "#2ee6c8", style: "backlit" },
    { lines: ["喫茶"], color: "#ffb254", style: "outline" },
    { lines: ["美容"], color: "#ff3fd2", style: "tube" },
    { lines: ["眼科"], color: "#2f7bff", style: "tube" },
    { lines: ["HOTEL"], color: "#27dcf2", style: "outline", latin: true },
    { lines: ["天ぷら"], color: "#ffd24a", style: "tube" },
  ],
  bl: [
    { lines: ["カラオケ"], color: "#a24bff", style: "tube" },
    { lines: ["義体手術"], color: "#ff3fd2", style: "outline" },
    { lines: ["ゲームセンター"], color: "#fcee0a", style: "tube" },
    { lines: ["漫画喫茶"], color: "#eceae4", style: "backlit" },
    { lines: ["電脳整体"], color: "#27dcf2", style: "tube" },
    { lines: ["焼き鳥"], color: "#ff6a2a", style: "backlit" },
    { lines: ["ホテル愛"], color: "#ff2e88", style: "tube" },
    { lines: ["夜の街"], color: "#2f7bff", style: "outline" },
  ],
  ps: [
    { lines: ["OPEN 24H"], color: "#39ff9a", style: "led" },
    { lines: ["RAMEN"], color: "#ff2b2b", style: "backlit" },
    { lines: ["SAKE BAR"], color: "#ffb254", style: "tube" },
    { lines: ["焼き鳥"], color: "#ff3a2a", style: "tube" },
    { lines: ["TATTOO"], color: "#ff3fd2", style: "outline" },
    { lines: ["BENTO"], color: "#ffd24a", style: "backlit" },
    { lines: ["両替 EXCHANGE"], color: "#39ff9a", style: "tube" },
    { lines: ["NO VACANCY"], color: "#ff2e88", style: "tube" },
  ],
  pm: [
    { lines: ["NOODLE BAR", "麺"], color: "#ff3fd2", style: "tube" },
    { lines: ["CHROME & CYBERWARE"], color: "#27dcf2", style: "outline" },
    { lines: ["BRAINDANCE", "BD"], color: "#ff2e88", style: "tube" },
    { lines: ["カラオケ BOX"], color: "#a24bff", style: "tube" },
    { lines: ["CLINIC", "+"], color: "#eceae4", style: "backlit" },
    { lines: ["NIGHT MARKET", "夜市"], color: "#2ee6c8", style: "tube" },
    { lines: ["PAWN 質"], color: "#ffd24a", style: "backlit" },
    { lines: ["電気 ELECTRONICS"], color: "#2f7bff", style: "led" },
  ],
  bx: [
    { icon: "glass", color: "#ff2e88", style: "icon" },
    { icon: "bowl", color: "#ff3fd2", style: "icon" },
    { icon: "fish", color: "#27dcf2", style: "icon" },
    { icon: "eye", color: "#2f7bff", style: "icon" },
    { icon: "cross", color: "#39ff9a", style: "icon" },
    { icon: "heart", color: "#ff2e88", style: "icon" },
    { icon: "yen", color: "#ffd24a", style: "icon" },
    { icon: "sake", color: "#ff2b2b", style: "icon" },
    { icon: "bolt", color: "#fcee0a", style: "icon" },
    { icon: "cat", color: "#2ee6c8", style: "icon" },
    { icon: "lotus", color: "#a24bff", style: "icon" },
    { icon: "dice", color: "#39ff9a", style: "icon" },
  ],
};
