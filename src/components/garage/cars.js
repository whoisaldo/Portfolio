// src/components/garage/cars.js: both cars, the six stations, and one way to
// name a part.
//
// The garage holds two cars now, and every control (the station bar, the car
// tabs, the markers, the parts list, the detail card, the photographs) needs
// the same answers: which car, which part, which photograph, which station of
// the workshop visit shows it. This module puts the S4 (src/data/garage.js,
// unchanged) and the S6 (src/data/garage-s6.js) behind one registry so none
// of the controls has to know which file a car came from.
//
// A part is named by `{ carId, modId }` everywhere, which is the stable
// identity the world, the console and the pending-request queue share. The
// S4's sixteen ids and the S6's five do not collide, so the old one-argument
// `openGarage('intake')` still resolves: `resolveRequest` reads a request
// without a car as the S4's.
//
// POSES. Each part names the inspection the workshop flies to for it. The S6
// says so in its data. The S4's are read off what its data already says, so
// garage.js stays as Ali's list was transcribed: a part under the hood is the
// engine bay, a part first pinned on the rear or cabin photograph is the rear
// or cabin view, anything else is the front three-quarter.
import * as s4 from "../../data/garage";
import * as s6 from "../../data/garage-s6";

export const SHOW_PRICES = s4.SHOW_PRICES;

// The workshop visit in the order it is flown (PLAN.md, revision 2). `p` is
// where the station's button lands on the visit's 0..1 progress.
export const STATIONS = [
  { id: "arrival", label: "Arrival", short: "Arrival", p: 0, carId: null },
  { id: "s4", label: "S4", short: "S4", p: 0.2, carId: "s4" },
  { id: "s4-bay", label: "S4 engine bay", short: "S4 bay", p: 0.4, carId: "s4", bay: true },
  { id: "s6", label: "S6", short: "S6", p: 0.6, carId: "s6" },
  { id: "s6-bay", label: "S6 engine bay", short: "S6 bay", p: 0.8, carId: "s6", bay: true },
  { id: "shop", label: "Also in the shop", short: "Shop", p: 1, carId: null },
];

export const findStation = (id) => STATIONS.find((s) => s.id === id) ?? null;

const s4Pose = (m) => {
  if (m.anchor?.inBay) return "bay";
  const v = m.pins[0]?.view;
  return v === "rear" || v === "cabin" ? v : "front";
};

function build(id, data, extra) {
  const mods = data.mods.map((m, index) => ({
    ...m,
    carId: id,
    index,
    pose: m.pose ?? s4Pose(m),
  }));
  for (const m of mods) m.station = m.pose === "bay" ? `${id}-bay` : id;
  return {
    id,
    car: data.car,
    views: data.views,
    groups: data.groups,
    mods,
    ...extra,
  };
}

export const CARS = [
  build("s4", s4, {
    label: "S4",
    bay: "Bay 01",
    title: `${s4.car.year} ${s4.car.name}`,
    spec: [s4.car.engine, s4.car.output],
    output: s4.car.output,
    // The sheet's three columns, as the S4's always were.
    sheet: [["power"], ["brakes", "suspension", "wheels"], ["cosmetic", "cabin"]],
    footnote: s4.alsoOnTheList,
  }),
  build("s6", s6, {
    label: "S6",
    bay: "Bay 02",
    title: `${s6.car.year} ${s6.car.name}`,
    spec: [s6.car.engine, s6.car.drivetrain],
    output: null,
    sheet: [["software"], ["stance", "cabin"], ["exterior"]],
    footnote: null,
  }),
];

export const findCar = (carId) => CARS.find((c) => c.id === carId) ?? null;

export const findMod = (carId, modId) => findCar(carId)?.mods.find((m) => m.id === modId) ?? null;

export const groupOf = (mod) => findCar(mod.carId)?.groups.find((g) => g.id === mod.group) ?? null;

export const modsIn = (car, groupId) => car.mods.filter((m) => m.group === groupId);

export const sameSel = (a, b) => (a?.carId ?? null) === (b?.carId ?? null) && (a?.modId ?? null) === (b?.modId ?? null);

/** "$700 plus paint match and install", or "$700 +" with `short`. Both cars
 *  go through the S4's formatter, so SHOW_PRICES is still the one switch;
 *  `show: false` (the integration passing SHOW_PRICES down) hides them too. */
export const priceLabel = (mod, { show, ...opts } = {}) => (show === false ? null : s4.priceLabel(mod, opts));

/** The car a station belongs to, or null for the arrival and the shop wall. */
export const carAt = (stationId) => findStation(stationId)?.carId ?? null;

// Photo browsing and a failed 3D visit share the same station identities.
// The rear hold is a beat within the S6 visit, not a seventh station button.
export const photoForStation = (station) => ({
  arrival: { carId: "s4", viewId: "rear" },
  s4: { carId: "s4", viewId: "front" },
  "s4-bay": { carId: "s4", viewId: "bay" },
  s6: { carId: "s6", viewId: "front" },
  "s6-rear": { carId: "s6", viewId: "rear" },
  "s6-bay": { carId: "s6", viewId: "bay" },
}[station] ?? null);

export function stationForPhoto(carId, viewId) {
  if (viewId === "bay") return `${carId}-bay`;
  if (viewId === "rear") return carId === "s6" ? "s6-rear" : "arrival";
  return carId;
}

/** A request from anywhere, as `{ carId, modId }`, or null if it names
 *  nothing real. `{ mod }` and a bare string are the S4's legacy forms. */
export function resolveRequest(req) {
  if (!req) return null;
  const r = typeof req === "string" ? { modId: req } : req;
  const modId = r.modId ?? r.mod ?? null;
  const carId = r.carId ?? (modId ? CARS.find((c) => c.mods.some((m) => m.id === modId))?.id : null) ?? "s4";
  if (modId && !findMod(carId, modId)) return null;
  return { carId, modId };
}

/** The photograph and pin a part's close crop comes from: its pin on
 *  `viewId` if it has one there, else its first pin; null if it has none. */
export function cropFor(mod, viewId) {
  if (!mod?.pins.length) return null;
  const pin = mod.pins.find((p) => p.view === viewId) ?? mod.pins[0];
  const view = findCar(mod.carId)?.views.find((v) => v.id === pin.view);
  return view?.image ? { pin, view } : null;
}
