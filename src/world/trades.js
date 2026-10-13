// src/world/trades.js: which trade each shop pane is.
//
// The room behind a pane is drawn in the fragment (src/world/interiors.js),
// one of eight trades. Left to a hash, two neighbours came out the same shop
// and a ramen sign hung over a pharmacy. So the panes are dealt here, once
// per shop mesh, the first time it is drawn: every pane of a wall in order
// along it, each the trade its sign names where a sign of the street's
// stands over it (signs.js posts each lettered face here as it is built),
// and otherwise the next in turn that neither neighbour has. The answer
// rides in the pane's own vertex colour (alpha: the trade in the top three
// bits, the pane's width in quarter metres in the other five), so the room
// is cut to its pane and nothing is looked up per pixel. A pane this never
// reaches (an instanced prop's) keeps alpha 1 and the shader deals it by
// where it stands.
import * as THREE from "three";

export const TRADES = ["store", "bar", "noodle", "arcade", "clinic", "boutique", "workshop", "dark"];

// What a sign's words say its shop is, first match wins (a noodle bar is
// noodles, a liquor store a store). A hostel, a hotel, an exchange, OPEN:
// no room of ours, so the pane under it is dealt like any other.
const RULES = [
  [2, /RAMEN|NOODLE|DUMPLING|BENTO|SUSHI|YAKITORI|CURRY|SOBA|DONBURI|TAKOYAKI|KEBAB|DINER|HOT POT|STREET FOOD|TEA HOUSE|麺|弁当|寿司|鮨|焼き鳥|焼肉|餃子|天ぷら|中華|夜食|喫茶|蕎麦|そば|ラーメン|食堂|火鍋|屋台|丼|肉|魚|茶/],
  [0, /LIQUOR|24H|MARKET|PAWN|BOOKS|LAUNDRY|二十四時間|深夜営業|質|古本|書店|本/],
  [3, /ARCADE|VR|GAME|BRAINDANCE|PACHINKO|MAHJONG|ゲーム|麻雀|雀荘/],
  [4, /CLINIC|PHARMACY|IMPLANT|TATTOO|RIPPERDOC|薬|義体|義眼|整形|眼科|医者|整体|刺青|診療/],
  [5, /古着|美容|花屋|花|写真|床屋/],
  [6, /REPAIR|ELECTRONICS|CHROME|CYBERWARE|PARTS|WORKS|PRINT|修理|電気|部品|パーツ|時計|鍵/],
  [1, /BAR|SAKE|KARAOKE|IZAKAYA|DARTS|酒|立ち飲み|カラオケ/],
];
const ICONS = { bowl: 2, fish: 2, glass: 1, sake: 1, bottle: 1, cross: 4, pill: 4, eye: 4, dice: 3, gear: 6, chip: 6, wrench: 6, plug: 6, book: 0, leaf: 5 };

/** The trade a sign's design names (an index into TRADES), or -1. */
export function tradeOf(spec) {
  if (spec.icon && !spec.lines) return ICONS[spec.icon] ?? -1;
  const text = (spec.lines ?? []).join(" ").toUpperCase();
  for (const [trade, rule] of RULES) if (rule.test(text)) return trade;
  return -1;
}

// Every low sign that names a trade: where its face's middle is.
const posts = [];
export function postSign(x, y, z, trade) {
  if (trade >= 0 && y < 9) posts.push({ x, y, z, trade });
}
export function clearSigns() {
  posts.length = 0;
}

/**
 * Deal a shop mesh's panes their trades, into its colour's alpha. Returns
 * { panes, signed, alley } (how many panes, how many took their trade from a
 * sign, how many face another shop's glass under 8 m across).
 */
export function dealTrades(geometry, object) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const col = geometry.attributes.color;
  if (!pos || !nor || !col || col.itemSize < 4) return { panes: 0, signed: 0 };
  object.updateWorldMatrix(true, false);
  const n = pos.count;
  const P = new Float32Array(n * 3);
  const N = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  const nm = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(object.matrixWorld);
    P.set([v.x, v.y, v.z], i * 3);
    v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
    N.set([v.x, v.y, v.z], i * 3);
  }
  // A pane is the vertices its triangles join (and any that stand on the
  // same spot facing the same way, where the two triangles share none).
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]];
    return i;
  };
  const join = (a, b) => {
    parent[find(a)] = find(b);
  };
  const spots = new Map();
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(P[i * 3] * 100)},${Math.round(P[i * 3 + 1] * 100)},${Math.round(P[i * 3 + 2] * 100)},${Math.round(N[i * 3] * 2)},${Math.round(N[i * 3 + 2] * 2)}`;
    if (spots.has(key)) join(i, spots.get(key));
    else spots.set(key, i);
  }
  const index = geometry.index;
  const tris = index ? index.count / 3 : n / 3;
  for (let k = 0; k < tris; k++) {
    const a = index ? index.getX(k * 3) : k * 3;
    join(a, index ? index.getX(k * 3 + 1) : k * 3 + 1);
    join(a, index ? index.getX(k * 3 + 2) : k * 3 + 2);
  }
  const panes = new Map();
  for (let i = 0; i < n; i++) {
    const nx = N[i * 3];
    const nz = N[i * 3 + 2];
    if (Math.abs(N[i * 3 + 1]) > 0.5) continue;
    const root = find(i);
    // Along the wall as the shader counts it: t = (n.z, 0, -n.x).
    const len = Math.hypot(nx, nz) || 1;
    const along = (P[i * 3] * nz - P[i * 3 + 2] * nx) / len;
    let pane = panes.get(root);
    if (!pane) panes.set(root, (pane = { verts: [], nx: nx / len, nz: nz / len, a0: Infinity, a1: -Infinity, top: -Infinity, plane: (P[i * 3] * nx + P[i * 3 + 2] * nz) / len }));
    pane.verts.push(i);
    pane.a0 = Math.min(pane.a0, along);
    pane.a1 = Math.max(pane.a1, along);
    pane.top = Math.max(pane.top, P[i * 3 + 1]);
  }
  // The sign over each: the nearest face whose middle stands over the pane,
  // on its wall or hung out from it, up to a storey above the glass.
  let signed = 0;
  const walls = new Map();
  for (const pane of panes.values()) {
    const half = (pane.a1 - pane.a0) / 2;
    const mid = (pane.a0 + pane.a1) / 2;
    let best = 1e9;
    pane.trade = -1;
    for (const s of posts) {
      const da = Math.abs(s.x * pane.nz - s.z * pane.nx - mid);
      const dn = s.x * pane.nx + s.z * pane.nz - pane.plane;
      const dy = s.y - pane.top;
      if (da > half + 0.2 || dn < -0.3 || dn > 2 || dy < -0.6 || dy > 4.5) continue;
      const score = da + Math.max(dn - 0.5, 0) * 2 + dy * 0.3;
      if (score < best) {
        best = score;
        pane.trade = s.trade;
      }
    }
    if (pane.trade >= 0) signed += 1;
    const key = `${Math.round(pane.nx)},${Math.round(pane.nz)},${Math.round(pane.plane * 2)}`;
    if (!walls.has(key)) walls.set(key, []);
    walls.get(key).push(pane);
  }
  // A pane in an alley: another shop's glass faces it under 8 m across.
  // There an arcade's, a bar's or a shut unit's dark room is a black hole
  // with a few lines of neon in it a stride from the eye, so they come up
  // there a third as often (a sign over the door still names its trade).
  const all = [...panes.values()];
  for (const a of all) {
    a.alley = all.some((b) => {
      if (a.nx * b.nx + a.nz * b.nz > -0.9) return false;
      const across = -b.plane - a.plane;
      return across > 1 && across < 8 && Math.max(a.a0, -b.a1) < Math.min(a.a1, -b.a0);
    });
  }
  // The rest in turn along each wall, three on at a time through the eight
  // (so the order is not the list's), stepping past whatever either
  // neighbour is.
  for (const [key, list] of walls) {
    list.sort((a, b) => a.a0 - b.a0);
    let turn = 0;
    for (const c of key) turn = (turn * 31 + c.charCodeAt(0)) % 8;
    list.forEach((pane, i) => {
      if (pane.trade >= 0) return;
      const before = [list[i - 1]?.trade, list[i - 2]?.trade];
      const after = list[i + 1]?.trade;
      for (let tries = 0; tries < 8; tries++) {
        turn = (turn + 3) % 8;
        // (Half the turns that come up shut are passed on: one dark unit
        // in sixteen, not in eight.)
        const dim = pane.alley && (turn === 1 || turn === 3 || turn === 7) && (i + tries) % 3 !== 0;
        if (!before.includes(turn) && turn !== after && !(turn === 7 && i % 2 === 0) && !dim) break;
      }
      pane.trade = turn;
    });
  }
  for (const pane of panes.values()) {
    const width = Math.min(31, Math.max(1, Math.round((pane.a1 - pane.a0) * 4)));
    const byte = Math.min(254, pane.trade * 32 + width);
    for (const i of pane.verts) col.setW(i, byte / 255);
  }
  col.needsUpdate = true;
  return { panes: panes.size, signed, alley: all.filter((a) => a.alley).length };
}
