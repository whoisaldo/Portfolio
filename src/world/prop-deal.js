// src/world/prop-deal.js: which of its kind each prop is.
//
// The props file says where a thing stands, not which one of its kind it
// is: the districts place `lantern` and `vending`, and a street wants four
// shapes of lantern in four colours and four machines. So the site deals
// them, from where each stands (the same place always gets the same one):
//
//   rows   things hung within `rows` metres of each other are one row (a
//          shop's lanterns, a string across a lane), and a row is one shape
//          and one scheme of colours, as whoever hung it bought them; a row
//          hung near another is another shape; here and there one is dark
//   apart  neighbours within `apart` metres never wear the same design (a
//          bank of machines)
//
// A deal is a number per instance: its whole part the design (a lantern's
// colour, a machine's front), its fraction a seed of its own; and, where a
// prototype has other shapes (<name>__v1, __v2 ... in the kit, which nobody
// places), which shape.

/** A lantern left dark. Its colours: 0 red, 1 orange, 2 white, 3 green. */
export const DARK = 4;
// What a row of lanterns is: its share of the rows, and the colours that
// alternate along it.
const SCHEMES = [[0.36, [0]], [0.22, [1]], [0.14, [2]], [0.07, [3]], [0.13, [0, 2]], [0.08, [1, 0]]];

export const RULES = [
  { protos: ["lantern"], rows: 3.3, schemes: SCHEMES, dark: 0.09 },
  { protos: ["vending", "vending_warm"], apart: 2.6, designs: 4 },
];

const hash = (a, b, c, salt) => {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1) ^ Math.imul(c, 0x1b873593) ^ Math.imul(salt, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

/**
 * `data`: the props file's instances (eight int16 each); `list`: the ones a
 * rule deals; `shapes`: how many shapes their prototype has. Returns
 * { deal: Float32Array, shape: Uint8Array }, in `list`'s order.
 */
export function deal(data, list, rule, shapes = 1) {
  const n = list.length;
  const X = (j) => data[list[j] * 8 + 1] / 20;
  const Y = (j) => data[list[j] * 8 + 2] / 50;
  const Z = (j) => data[list[j] * 8 + 3] / 20;
  const seed = (j, salt) => hash(data[list[j] * 8 + 1], data[list[j] * 8 + 2], data[list[j] * 8 + 3], salt);
  const out = { deal: new Float32Array(n), shape: new Uint8Array(n) };

  // A grid to find neighbours in.
  const reach = rule.rows ?? rule.apart;
  const cells = new Map();
  const cellOf = (j, dx = 0, dz = 0) => `${Math.floor(X(j) / reach) + dx},${Math.floor(Z(j) / reach) + dz}`;
  for (let j = 0; j < n; j++) {
    const key = cellOf(j);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(j);
  }
  const near = (j, fn) => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const k of cells.get(cellOf(j, dx, dz)) ?? []) {
        if (k !== j && Math.hypot(X(k) - X(j), Y(k) - Y(j), Z(k) - Z(j)) <= reach) fn(k);
      }
    }
  };

  if (rule.apart) {
    for (let j = 0; j < n; j++) {
      const taken = new Set();
      near(j, (k) => k < j && taken.add(Math.floor(out.deal[k])));
      let design = Math.floor(seed(j, 1) * rule.designs);
      for (let t = 0; t < rule.designs && taken.has(design); t++) design = (design + 1) % rule.designs;
      out.deal[j] = design + seed(j, 3) * 0.999;
    }
    return out;
  }

  // The rows: each named by the first of its members.
  const root = Int32Array.from({ length: n }, (_, j) => j);
  const find = (j) => {
    while (root[j] !== j) j = root[j] = root[root[j]];
    return j;
  };
  for (let j = 0; j < n; j++) {
    near(j, (k) => {
      const a = find(j);
      const b = find(k);
      if (a !== b) root[Math.max(a, b)] = Math.min(a, b);
    });
  }
  const rows = new Map();
  for (let j = 0; j < n; j++) {
    const r = find(j);
    if (!rows.has(r)) rows.set(r, []);
    rows.get(r).push(j);
  }
  const hung = [];
  for (const [r, members] of rows) {
    const taken = new Set();
    for (const h of hung) if (Math.hypot(h.x - X(r), h.z - Z(r)) < 14) taken.add(h.shape);
    let shape = Math.floor(seed(r, 1) * shapes);
    for (let t = 0; t < shapes && taken.has(shape); t++) shape = (shape + 1) % shapes;
    hung.push({ x: X(r), z: Z(r), shape });
    let pick = seed(r, 2);
    let colours = rule.schemes[0][1];
    for (const [share, scheme] of rule.schemes) {
      if (pick < share) {
        colours = scheme;
        break;
      }
      pick -= share;
    }
    // Along the row, so two colours take turns down it.
    const along = members.slice().sort((a, b) => X(a) - X(b) || Z(a) - Z(b) || Y(a) - Y(b));
    along.forEach((j, i) => {
      const colour = seed(j, 4) < rule.dark ? DARK : colours[i % colours.length];
      out.deal[j] = colour + seed(j, 3) * 0.999;
      out.shape[j] = shape;
    });
  }
  return out;
}
