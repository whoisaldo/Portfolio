from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw import buildings as B
from ncw import props as P
from ncw.districts import avenue_kit as K
from ncw.districts import avenue_lanes as LN
from ncw.districts import avenue_yard as YD
from ncw.districts import avenue_roofs as RF
from ncw.districts import avenue_street as ST
from ncw.districts import avenue_upper as UP
from ncw.districts import avenue_mass as M

# The street itself (asphalt, paint, crossings, kerbs, pavements, drains)
# is streets.py's, from the plan.

# What the hero's lens does not see (the lots' backs and the lanes behind
# them, the south arm behind it, the south street's frontages, the yard) is
# Kabuki Avenue too, but streams in with the south pack (finish.PACK_OF), so
# the core the city goes live on stays the size it was.
AVS = "avenue_s"

# A lot's back on a lane is this module's, not the generator's: while the
# lots are built, the generator's own back (its ground floor of doors, its
# windows, its pipes and units and fire escape) is caught here. Its ground
# floor is drawn for nobody (the lot's random stream runs on exactly as it
# did, so a facade the hero sees is the facade it was) and built again
# further down by avenue_lanes; the rest of the back goes to the south pack.
_BACK = {"plane": None}
BACKS = []     # (face, height, trim colour, lane) of every back on a lane
ESCAPES = []   # (face name, plane, where along it) of the fire escapes on them
_gen = (B.back_ground, B.clutter_back, B.facade_wall, B.fire_escape, B.balcony)


def _on_back(f):
    return _BACK["plane"] is not None and f.name == _BACK["name"] and abs(f.plane - _BACK["plane"]) < 1e-6


def _back_ground(district, f, r, tcol):
    if not _on_back(f):
        return _gen[0](district, f, r, tcol)
    _gen[0]("void", f, r, tcol)
    BACKS.append((f, _BACK["h"], tcol, _BACK["lane"]))


def _clutter_back(district, f, r, y0, y1):
    return _gen[1](AVS if _on_back(f) else district, f, r, y0, y1)


def _facade_wall(key, f, y0, y1, col, ov, s0=0.0, s1=None):
    return _gen[2]((AVS,) + tuple(key[1:]) if _on_back(f) else key, f, y0, y1, col, ov, s0, s1)


def _fire_escape(district, f, s, y0, y1):
    if _on_back(f):
        ESCAPES.append((f.name, f.plane, f.at(s)))
    ST.SIGNED.append((f.name, f.plane, f.at(s), (y0 + y1) / 2, 1.8, (y1 - y0) / 2))
    return _gen[3](district, f, s, y0, y1)


def _balcony(district, f, s0, s1, y, tint, glass=False, out=1.15):
    ST.SIGNED.append((f.name, f.plane, f.at((s0 + s1) / 2), y + 0.6, (s1 - s0) / 2, 0.9))
    return _gen[4](district, f, s0, s1, y, tint, glass=glass, out=out)


def back_is(name=None, plane=None, h=0.0, lane=""):
    _BACK.update(name=name, plane=plane, h=h, lane=lane)


B.back_ground, B.clutter_back, B.facade_wall, B.fire_escape, B.balcony = _back_ground, _clutter_back, _facade_wall, _fire_escape, _balcony
# And the generator's signs are hung by avenue_street: the same signs, each
# turned its own way instead of square to its wall.
_face_signs = B.face_signs
B.face_signs = ST.face_signs
# And the roofs it builds for the south pack are dressed by avenue_roofs (the
# kit's dressing drawn for nobody, its draws made as they were).
_roof_dress = B.roof_dress
B.roof_dress = RF.kit_roof(_roof_dress, AVS)
# The kit's drum, barrel and skip are plain shapes in one colour: in the
# south pack each is built here instead, in worn painted steel (avenue_kit).
_place = P.place
_prop_rng = random.Random(7600)


def _place_av(name, x, y, z, yaw=0.0, sy=1.0, sxz=1.0, district=None):
    if district == AVS and name in ("drum", "barrel"):
        return K.steel_drum(AVS, x, y, z, _prop_rng)
    if district == AVS and name == "dumpster":
        return K.skip_bin(AVS, x, y, z, yaw, _prop_rng)
    return _place(name, x, y, z, yaw, sy, sxz, district)


P.place = _place_av


# The lots, north of the intersection: (z_start, depth along the street,
# height) per side. The hero's camera is low, so the first few lots tower
# out of its frame; past them each roof is a little lower in its eye than the
# one before (on the left about 0.38 of the lot's distance falling to 0.29; on
# the right, past Nicola, a steeper 0.27, as the plate has it), and the roofs
# step down toward the vanishing point under a band of sky. Each lot is a
# real building now (buildings.py): shops along the pavement, storeys of
# windows with ledges, balconies and units, signs, a roof that is lived on.
# The rows end on the plaza street's lot line and leave the deck its gap.
HERO_EYE_Z = 10.0
LOTS = {
    -1: [(-10, 11, 16), (-21, 9, 24), (-30, 14, 19), (-44, 12, 21), (-56, 10, 23), (-66, 8, 29),
         (-86, 11, 27), (-97, 11, 37), (-108, 15, 33), (-123, 12, 44), (-135, 14, 38), (-149, 12, 49),
         (-161, 7, 46)],
    1: [(-10, 13, 18), (-23, 10, 22), (-33, 12, 27), (-45, 16, 17), (-61, 13, 19),
        (-86, 12, 26), (-98, 14, 29), (-112, 11, 33), (-123, 15, 36), (-138, 12, 40), (-150, 10, 43),
        (-160, 8, 44)],
}
DEPTH = 30.0
DECK_GAP = (-86.0, -74.0)
AV_LOTS = []   # (side, z0, z1, height, crowned) as built
STYLE = dict(windows=(0, 0, 1, 3, 6, 5), lit=(0.62, 0.95), warmth=(0.5, 1.0),
             tints=("charcoal", "navy", "plum", "teal", "navy"), balcony=0.2, balcony_glass=0.25, ac=0.28,
             signs=2.0, awning=0.6, shop_sign=0.55, canopy=0.12, roof_cap=4.5, setback=0.0, fire_escape=0.3,
             shop_colours=["pink", "cyan", "red", "amber", "purple", "teal", "magenta"])
for side, lots in LOTS.items():
    s = side
    rows = []
    for i, (z_start, depth, height) in enumerate(lots):
        z1, z0 = z_start, z_start - depth
        rows.append((z0, z1, height, i))
    for j, (z0, z1, height, i) in enumerate(rows):
        seed = 1000 + (i * 37 if s > 0 else i * 53 + 7)
        r = random.Random(seed)
        xa, xb = (WALK, WALK + DEPTH) if s > 0 else (-WALK - DEPTH, -WALK)
        front = "-x" if s > 0 else "+x"
        backf = "+x" if s > 0 else "-x"
        sides = {front: "street", backf: "back"}
        nb = {}
        # Toward the south street (+z) and the plaza street (-z) at the ends,
        # the deck's gap between two lots, and a neighbour otherwise.
        hi = "street" if j == 0 else ("open" if abs(z1 - DECK_GAP[0]) < 0.01 else "party")
        lo = "street" if j == len(rows) - 1 else ("open" if abs(z0 - DECK_GAP[1]) < 0.01 else "party")
        sides["+z"], sides["-z"] = hi, lo
        if hi == "party":
            nb["+z"] = rows[j - 1][2]
        if lo == "party":
            nb["-z"] = rows[j + 1][2]
        lot = B.Lot(xa, xb, z0, z1, front, sides, nb, AV)
        HERO_MASSES.append(((xa, 0.0, z0), (xb, height, z1)))
        # A setback crown on the taller lots, kept under the line the roofs
        # step down along.
        crown = min(r.uniform(5, 14), 0.33 * (HERO_EYE_Z - z1) - height)
        crowned = height > 30 and crown > 3
        st = dict(STYLE, roof_cap=0.0 if crowned else 4.5)
        back_is(backf, xb if s > 0 else xa, height, "e" if s > 0 else "w")
        B.building(lot, height, r, style=st, defer_roof=HERO_ROOFS)
        back_is()
        AV_LOTS.append((s, z0, z1, height, crowned))
        if crowned:
            ia, ib = (xa + 5, xb - 3) if s > 0 else (xa + 3, xb - 5)
            clot = B.Lot(ia, ib, z0 + 2, z1 - 2, front, {"+x": "open", "-x": "open", "+z": "open", "-z": "open"}, {}, AV)
            B.building(clot, height + crown, r, style=dict(STYLE, roof_cap=4.5, balcony=0.1), base=height,
                       signs=False, defer_roof=HERO_ROOFS)
            HERO_MASSES.append(((ia, height, z0 + 2), (ib, height + crown, z1 - 2)))
        # The street face's own lanterns now and then.
        if r.random() < 0.2:
            for zz in [z0 + 0.8 + 1.6 * k for k in range(int((z1 - z0 - 1.3) / 1.6))]:
                P.place("lantern", s * (WALK - 1.2), 3.1, zz, district=AV)
    # Hero roofs face the street: the dressing's signs turn to it.
    for k in range(len(HERO_ROOFS)):
        t = HERO_ROOFS[k]
        if t[8] is None and t[0] == AV:
            HERO_ROOFS[k] = t[:8] + (-s * math.pi / 2,) + t[9:]

# The avenue's south arm, behind the hero's lens (the drift's camera stands
# in it), and the south street's frontages either side of the junction, with
# their own blocks: lower, the same street. The arm's first two lots a side
# stand against the south street's row; the rest back onto a lane.
# (Nothing from here to the named blades draws on the street's own count
# of signs: these buildings name theirs from avenue_kit's stream.)
_st_name = B.st_name
B.st_name = ST.NAME[0] = K.st_id
ARM = [(12.0, 15.0), (27.0, 15.0), (42.0, 12.0), (54.0, 11.0), (65.0, 12.0), (77.0, 11.0)]
# Off the hero's avenue a facade carries more over its shops: balconies,
# condensers, downpipes, fire stairs, and half as many signs again.
SIDE = dict(STYLE, balcony=0.32, ac=0.4, pipes=0.9, fire_escape=0.6, signs=3.0)
ARM_H = {}
for s in (-1, 1):
    rr = random.Random(2200 + s)
    ARM_H[s] = [rr.choice((14.0, 18.0, 21.0, 24.0, 28.0, 31.0)) for _ in ARM]
# And among them slabs of twelve to seventeen storeys, set back over their
# fronts, so the arm's skyline is jagged from the air (none under the
# south air view's eye at x 20, z 60, 75 m up).
ARM_TALL = {(-1, 2): 55.6, (-1, 4): 45.4, (1, 1): 48.8, (1, 4): 38.6, (1, 5): 62.4}
for (s, j), h in ARM_TALL.items():
    ARM_H[s][j] = h
ARM_TIERS = {-1: [], 1: []}
# The south street's south side, out to the west street's end and to the
# x 120 road's: (x0, x1, height) west and east of the arm's corner lots.
SOUTH_ROW = {-1: [(-66.0, -55.0, 82.0), (-55.0, -44.0, 28.4)],
             1: [(44.0, 56.0, 23.6), (56.0, 68.8, 38.6), (68.8, 84.8, 96.0), (84.8, 97.6, 31.8), (97.6, 108.0, 69.0)]}
SOUTH_TIERS = {-1: [], 1: []}
# The street's skyline: the row's taller lots are a front of six to ten
# storeys with a tower set back behind it (none beside the arm's corner
# lots, and none under the roofs' fixed view at x 52, 64 m up).
TOWER_MIN = 36.0


def south_front(h):
    """The least a towered lot's street front stands (the generator draws
    its true height from the lot's stream)."""
    return SHOP_H + CELL_H * max(2, int((h - SHOP_H) / CELL_H * 0.55)) if h > TOWER_MIN else h


for s in (-1, 1):
    hs = ARM_H[s]
    row_h = SOUTH_ROW[s][-1 if s < 0 else 0][2]
    for j, (za, d) in enumerate(ARM):
        r = random.Random(2300 + j * 11 + (5 if s > 0 else 0))
        xa, xb = (WALK, WALK + DEPTH) if s > 0 else (-WALK - DEPTH, -WALK)
        front = "-x" if s > 0 else "+x"
        backf = "+x" if s > 0 else "-x"
        sides = {front: "street", backf: "party" if j < 2 else "back",
                 "-z": "street" if j == 0 else "party", "+z": "open" if j == len(ARM) - 1 else "party"}
        nb = {backf: row_h}
        if j > 0:
            nb["-z"] = hs[j - 1]
        if j < len(ARM) - 1:
            nb["+z"] = hs[j + 1]
        back_is(backf, xb if s > 0 else xa, hs[j], "ae" if s > 0 else "aw")
        with K.names_from(78000 + j * 2 + (s > 0)):
            ARM_TIERS[s].append(B.building(B.Lot(xa, xb, za, za + d, front, sides, nb, AVS), hs[j], r, style=SIDE,
                                           setback=True if (s, j) in ARM_TALL and hs[j] > 40 else None))
        back_is()
# The arm ends at Santo Domingo's yard: its wall and gate across the road's
# end, the yard behind them, and the blocks behind the arm's lots
# (avenue_yard).
with K.names_from(78100):
    YD.build(AVS)

# The south street's frontages either side of the arm's corner lots: its
# south side, out to the west street's end and to the x 120 road. (Its north
# side is the avenue's first lots, and beyond the lanes Japantown's and the
# plaza's.) Their backs are on a lane of their own.
SOUTH = dict(SIDE, signs=2.8, roof_cap=6.0)
for s, lots in SOUTH_ROW.items():
    for j, (xa, xb, h) in enumerate(lots):
        r = random.Random(2400 + j * 7 + (3 if s > 0 else 0))
        sides = {"-z": "street", "+z": "back", "-x": "party", "+x": "party"}
        nb = {}
        if j > 0:
            nb["-x"] = south_front(lots[j - 1][2])
        elif s > 0:
            nb["-x"] = min(ARM_H[1][:2])
        else:
            sides["-x"] = "open"
        if j < len(lots) - 1:
            nb["+x"] = south_front(lots[j + 1][2])
        elif s < 0:
            nb["+x"] = min(ARM_H[-1][:2])
        else:
            sides["+x"] = "open"
        back_is("+z", 42.0, h, "ce" if s > 0 else "cw")
        with K.names_from(78020 + j * 2 + (s > 0)):
            SOUTH_TIERS[s].append(B.building(B.Lot(xa, xb, 12.0, 42.0, "-z", sides, nb, AVS), h, r, style=dict(SOUTH, setback_in=(5.0, 7.0)),
                                             setback=h > TOWER_MIN))
        back_is()

# Bridges between the towers: across the arm between its fourth lots, over
# its east lane from its last lot to the megablock, over the south row's
# back lane from its tallest tower to the megablock, over the west lane to
# the west slab (avenue_mass).
_brng = random.Random(8850)
with K.own_names():
    M.bridge(AVS, (-WALK, 70.0), (WALK, 70.0), M.storeys(4), _brng, w=3.4, hue="pink")
    M.bridge(AVS, (WALK + DEPTH, 82.0), (58.0, 82.0), M.storeys(9), _brng, w=3.0, hue="cyan")
    M.bridge(AVS, (76.0, 42.0), (76.0, 55.0), M.storeys(10), _brng, w=3.2, hue="amber")
    M.bridge(AVS, (-WALK - DEPTH, 51.0), (-51.0, 51.0), M.storeys(8), _brng, w=2.8, hue="green", sign=False)
B.st_name = ST.NAME[0] = _st_name
B.roof_dress = _roof_dress
with K.names_from(78200):
    RF.dress_queue(AVS)

# Blade signs down both sides: the plate's vertical Japanese signs. The ids
# are keys into WORLD_SIGNS in src/data/world.js, which holds their words.
blade(AV, -1, "ramen", -16.5, 7.2, 5.6, 1.1, preview="ラーメン")
blade(AV, -1, "mirai", -36.0, 8.0, 4.8, 0.9, preview="未来の目")
blade(AV, -1, "bar", -60.5, 6.2, 2.4, 1.2, preview="BAR")
# (hotel and mirai2 stand just north of the deck: at z -79 and -78 they hung
# in its carriageway, which crosses here at y 8.5 from z -85 to -75.)
blade(AV, -1, "hotel", -87.4, 8.6, 5.0, 0.9, preview="ホテル")
blade(AV, -1, "karaoke", -104.0, 9.5, 5.2, 1.0, preview="カラオケ")
blade(AV, 1, "shinsen", -28.0, 7.4, 5.2, 1.0, preview="新鮮な寿司")
blade(AV, 1, "shokuji", -47.5, 6.4, 3.6, 0.9, preview="食事処")
blade(AV, 1, "yoru", -65.0, 7.0, 3.2, 0.9, preview="夜の味")
blade(AV, 1, "bento", -90.0, 8.2, 4.4, 0.9, preview="弁当")
blade(AV, 1, "pachinko", -115.0, 10.0, 6.0, 1.1, preview="パチンコ")
# More words in the band the hero frames: near the camera the frame's top is
# a few metres up, further off it is the height of the fourth storey.
blade(AV, -1, "izakaya", -24.5, 5.4, 3.6, 1.0, preview="居酒屋")
blade(AV, -1, "yakitori", -48.5, 8.0, 4.8, 1.0, preview="焼き鳥")
blade(AV, -1, "denno", -71.0, 11.0, 6.4, 1.1, preview="電脳")
blade(AV, -1, "sakaba", -92.0, 12.0, 5.0, 1.0, preview="酒場")
blade(AV, 1, "kusuri", -21.0, 5.2, 3.4, 1.0, preview="薬局")
blade(AV, 1, "arcade", -55.0, 9.5, 6.0, 1.1, preview="ARCADE")
blade(AV, 1, "mirai2", -87.4, 11.5, 6.2, 1.0, preview="未来")
blade(AV, 1, "kaiten", -102.0, 12.5, 5.6, 1.0, preview="回転寿司")

# Horizontal shop signs over the awnings.
sign("menya", -WALK + 0.06, 4.2, -26.5, 4.5, 0.9, math.pi / 2, preview="麺屋")
sign("sushi", WALK - 0.06, 4.3, -38.5, 3.6, 0.9, -math.pi / 2, preview="寿司 SUSHI")
sign("maneki", WALK - 0.06, 5.6, -52.0, 2.2, 2.6, -math.pi / 2, preview="招き猫")

# The avenue's two big screens: Kiroshi on the left, Nicola on the right,
# as the plate has them. They are screens, not signs: each shows an original
# advertising image with the brand set over it on the site (src/world/ads.js),
# so they are named ad_<id>. Each is turned most of the way to the hero's
# lens and sized to stand in its frame from just over the shops to just under
# the top, a quarter of the way in from either side, where the plate has them.
KIROSHI = (-11.3, 8.35, -21.0, 5.7, 8.5, math.radians(30))
NICOLA = (11.0, 9.95, -26.0, 6.6, 9.9, math.radians(-28))
for sid, (cx, cy, cz, w, h, yaw) in (("kiroshi", KIROSHI), ("nicola", NICOLA)):
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box((AV, "board_frame", 0), cx - nx * 0.25, cy, cz - nz * 0.25, w + 0.6, h + 0.6, 0.4, yaw, scale=1.0)
    named_quad("ad_" + sid, "sign", cx, cy, cz, w, h, yaw, props={"district": AV, "ad": sid})
    # Two struts back to the wall.
    for dy in (-h / 3, h / 3):
        oriented_box((AV, "metal", 1), cx - nx * 1.3, cy + dy, cz - nz * 1.3, 0.2, 0.2, 2.4, yaw, scale=0.5)

# Further up, a second pair: the portrait camera sees a narrow cone, mostly
# of the avenue's far half, and it gets its Kiroshi and Nicola there.
KIROSHI_FAR = (-12.0, 17.0, -136.0, 7.0, 10.5, math.radians(24))
NICOLA_FAR = (11.8, 19.0, -166.0, 7.0, 10.5, math.radians(-24))
for sid, (cx, cy, cz, w, h, yaw) in (("kiroshi_far", KIROSHI_FAR), ("nicola_far", NICOLA_FAR)):
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box((AV, "board_frame", 0), cx - nx * 0.2, cy, cz - nz * 0.2, w + 0.6, h + 0.6, 0.4, yaw, scale=1.0)
    named_quad("ad_" + sid, "sign", cx, cy, cz, w, h, yaw, props={"district": AV, "ad": sid.replace("_far", "")})

# Strings of light across the avenue: festoons between the facades.
for z in (-22.0, -40.0, -58.0, -99.0, -128.0):
    k = (AV, "neon_amber", 1)
    for i in range(24):
        t = i / 24
        x = -WALK + t * 2 * WALK
        y = 7.6 - 1.4 * math.sin(math.pi * t)
        cylinder(k, x, z, y - 0.07, y + 0.07, 0.07, segs=6, cap=False)

# Cables slung across the avenue between the facades, dark against the glow.
cable_rng = random.Random(9090)
for _ in range(14):
    z = cable_rng.uniform(-170.0, -12.0)
    y0 = cable_rng.uniform(8.0, 16.0)
    sag = cable_rng.uniform(0.8, 2.4)
    k = (AV, "dark", 1)
    steps = 16
    for i in range(steps):
        t0, t1 = i / steps, (i + 1) / steps
        x0 = -WALK + t0 * 2 * WALK
        x1 = -WALK + t1 * 2 * WALK
        ya = y0 - sag * math.sin(math.pi * t0)
        yb = y0 - sag * math.sin(math.pi * t1)
        quad(k, (x0, ya - 0.03, z), (x1, yb - 0.03, z), (x1, yb + 0.03, z), (x0, ya + 0.03, z))
        quad(k, (x1, yb - 0.03, z), (x0, ya - 0.03, z), (x0, ya + 0.03, z), (x1, yb + 0.03, z))


# Street lamps: sodium heads on thin poles along both kerbs. Each head has
# an anchor (anchor_lamp_<n>) the site hangs a shaft of light from, in the
# haze.
for side in (-1, 1):
    for z in (-14, -46, -78, -110, -142):
        x = side * (ROAD_HALF + 0.9)
        cylinder((AV, "metal", 1), x, z, 0.15, 6.4, 0.08, segs=8)
        hx = x - side * 1.4
        xa, xb = sorted((x, hx))
        box((AV, "metal", 1), xa, xb, 6.3, 6.42, z - 0.07, z + 0.07, scale=0.5)
        box((AV, "neon_amber", 0), hx - 0.35, hx + 0.35, 6.2, 6.3, z - 0.15, z + 0.15, scale=0.5)
        LAMPS.append((hx, 6.2, z))

# Two manholes up the avenue breathe steam into the signs' light (the site
# draws it from anchor_steam_<n>).
for i, (x, z) in enumerate(((4.0, -8.0), (-6.0, -30.0))):
    cylinder((AV, "metal", 1), x, z, 0.0, 0.025, 0.42, segs=16)
    empty(f"anchor_steam_street_{i}", (x, 0.05, z))

# Vending machines by the shops.
for side, z, colour in ((-1, -19.5, "cyan"), (-1, -20.6, "pink"), (1, -36.0, "amber"), (1, -71.0, "cyan")):
    s = side
    xa, xb = sorted((s * (WALK - 0.1), s * (WALK - 0.95)))
    box((AV, "metal", 1), xa, xb, 0.15, 2.05, z - 0.5, z + 0.5, scale=0.6)
    face_x = s * (WALK - 0.96)
    fa, fb = sorted((face_x, face_x - s * 0.02))
    box((AV, "neon_" + colour, 1), fa, fb, 0.8, 1.9, z - 0.4, z + 0.4, scale=0.5)

# What the avenue's pavements carry between the lamps, as the night
# crossing in the show has it (Fn9gKhU_2_Q@69): palms in concrete planters
# by the shopfronts with a bench beside each, short lamp columns with their
# orange heads between the sodium lamps (KvMY1uzSC1E@94), bins, a phone
# booth and a food box a side, hydrants, cameras on the corners. The crowd
# walks the kerb side (x 10.9 and 11.9), so what stands is by the shops.
PALMS = {1: (-30.0, -64.0, -100.0, -134.0), -1: (-41.0, -96.0, -122.0, -152.0)}
for s, zs in PALMS.items():
    for z in zs:
        P.place("planter_palm", s * 13.0, 0.15, z, district=AV)
        P.place("bench", s * 13.1, 0.15, z + 2.4, -s * math.pi / 2, district=AV)
for s in (-1, 1):
    for z in (-30.0, -62.0, -94.0, -126.0, -158.0):
        P.place("lamp_short", s * 10.9, 0.15, z + (3.0 if s < 0 else 0.0), district=AV)
    for z in (-25.0, -58.0, -105.0, -140.0):
        P.place("bin", s * 12.6, 0.15, z + (6.0 if s < 0 else 0.0), district=AV)
    for z in (-36.0, -116.0):
        P.place("hydrant", s * 10.7, 0.15, z + (4.0 if s > 0 else 0.0), district=AV)
    for z in (-12.5, -165.5):
        P.place("cctv", s * 11.4, 0.15, z, district=AV)
P.place("phone_booth", -12.7, 0.15, -52.0, district=AV)
P.place("phone_booth", 12.7, 0.15, -118.0, district=AV)
P.place("food_box", -12.9, 0.15, -64.5, math.pi / 2, district=AV)
P.place("food_box", 12.9, 0.15, -128.5, -math.pi / 2, district=AV)

# More cables across the avenue, lower and higher than the first, some
# drooping almost to the shop signs: the overhead clutter the street is
# seen through.
cable_rng2 = random.Random(9191)
for _ in range(16):
    z = cable_rng2.uniform(-168.0, -12.0)
    if DECK_GAP[0] - 3 < z < DECK_GAP[1] + 3:
        continue
    y0 = cable_rng2.uniform(6.5, 22.0)
    sag = cable_rng2.uniform(0.6, 3.2)
    k = (AV, "dark", 1)
    steps = 16
    za, zb = z, z + cable_rng2.uniform(-6.0, 6.0)
    for i in range(steps):
        t0, t1 = i / steps, (i + 1) / steps
        x0, x1 = -WALK + t0 * 2 * WALK, -WALK + t1 * 2 * WALK
        ya = y0 - sag * math.sin(math.pi * t0)
        yb = y0 - sag * math.sin(math.pi * t1)
        z0_, z1_ = za + (zb - za) * t0, za + (zb - za) * t1
        quad(k, (x0, ya - 0.03, z0_), (x1, yb - 0.03, z1_), (x1, yb + 0.03, z1_), (x0, ya + 0.03, z0_))
        quad(k, (x1, yb - 0.03, z1_), (x0, ya - 0.03, z0_), (x0, ya + 0.03, z0_), (x1, yb + 0.03, z1_))

# The generator is the kit's again, and what it drew for nobody is dropped.
B.back_ground, B.clutter_back, B.facade_wall, B.fire_escape, B.balcony = _gen
B.face_signs = _face_signs
for key in [k for k in batches if k[0] == "void"]:
    del batches[key]
P.INSTANCES[:] = [i for i in P.INSTANCES if i[7] != "void"]
LIGHTS.pop("void", None)
B.ROOFS[:] = [t for t in B.ROOFS if t[0] != "void"]

# The backs of the avenue's lots, above their street fronts' roofs.
with K.names_from(78300):
    RF.rear(AVS, AV_LOTS, WALK, DEPTH, STYLE)

# ---------------------------------------------------------------------------
# The lanes. Behind each row of the avenue a service lane runs from the
# south street to the plaza street (the deck crosses both overhead, and its
# band is left to it); behind the arm's lots a shorter one each side, shut
# at its north end by the south street's row, and behind that row a lane of
# its own. Every lot's back on them is built here (avenue_lanes.wall), then
# the lane between (avenue_lanes.Lane).
# ---------------------------------------------------------------------------
LANE_HUES = {"w": "green", "e": "blue", "aw": "warm", "ae": "green", "cw": "blue", "ce": "warm"}
LANE_VENTS = {k: [] for k in LANE_HUES}
for n, (f, h, tcol, lane) in enumerate(BACKS):
    esc = [a for (name, plane, a) in ESCAPES if name == f.name and abs(plane - f.plane) < 1e-6 and f.a0 <= a <= f.a1]
    with K.names_from(78400 + n):
        LN.wall(AVS, f, random.Random(5100 + n * 17), h, tcol, escapes=esc, hues=LANE_HUES[lane],
                dens=1.0 if lane in ("w", "e") else 0.7, vents=LANE_VENTS[lane])

DECK_BAND = (-95.0, -65.0)
NORTH_LANES = {}
LANES = []
for name, mine, far, seed, aprons in (("w", -WALK - DEPTH, -WALK - DEPTH - 6.0, 9301, (0.9, 1.3)), ("e", WALK + DEPTH, WALK + DEPTH + 8.0, 9302, (0.9, 1.7))):
    lane = LN.Lane(AVS, name, "z", mine, far, -168.0, -10.0, seed, hues=LANE_HUES[name], skip=(DECK_BAND,), aprons=aprons)
    lane.vents = LANE_VENTS[name]
    lane.far_cap = lambda v, side=name: UP.far_top(side, v, 1.5) - 0.5
    with K.names_from(78500 + seed % 100):
        lane.build(mouths=((-10.0, 1), (-168.0, -1)), rack=True)
    LANES.append(lane)
    NORTH_LANES[name] = lane
# The two vents the lanes have always had (the site draws steam from each).
for i, (x, z) in enumerate(((-WALK - DEPTH - 3.0, -52.0), (WALK + DEPTH + 4.0, -128.0))):
    box((AVS, "metal", 1), x - 0.4, x + 0.4, 0.0, 0.07, z - 0.4, z + 0.4, scale=0.5)
    empty(f"anchor_steam_lane_{i}", (x, 0.25, z))
# Behind the arm's lots and behind the south street's row.
for name, mine, far, seed in (("aw", -44.0, -50.0, 9311), ("ae", 44.0, 50.0, 9312)):
    lane = LN.Lane(AVS, name, "z", mine, far, 42.0, 88.0, seed, hues=LANE_HUES[name], dens=0.75, aprons=(0.9, 1.3))
    lane.vents = LANE_VENTS[name]
    with K.names_from(78500 + seed % 100):
        lane.build(mouths=((88.0, 1),), most_steam=1)
    LANES.append(lane)
for name, a, b, seed in (("cw", -66.0, -50.0, 9321), ("ce", 50.0, 108.0, 9322)):
    lane = LN.Lane(AVS, name, "x", 42.0, 48.0, a, b, seed, hues=LANE_HUES[name], dens=0.75, aprons=(0.9, 1.3))
    lane.vents = LANE_VENTS[name]
    with K.names_from(78500 + seed % 100):
        lane.build(most_steam=1)
    LANES.append(lane)

# What the pavements carry, the cables across the south street and the arm,
# the lanes' gates, the corners' kiosks, and who stands about (avenue_street).
# (Its signs, and every sign hung on the south street's and the arm's walls
# from here on, take their designs from streams of their own: what they
# hang over the arm's first shops decides, through the trades the site
# deals along that wall, the room of the hero's corner shop on the same
# wall, which must not change when anything upstream of here does.)
_names = K.use_names(random.Random(77210))
ST.build(AV, AVS, (-WALK - DEPTH, -WALK - DEPTH - 6.0), (WALK + DEPTH, WALK + DEPTH + 8.0))
K.use_names(random.Random(77220))

# The west side's upper storeys, thin beside the east's: boards flat on the
# wall and columns of condensers, clear of the named blades and Kiroshi's
# screens. (Flat to the wall: the hero's lens, which looks along it, sees a
# sliver of each; in the core all the same, with the rest of that wall's
# signs, so the avenue's road holds one light whether or not the south pack
# has arrived.)
WEST_NAMED = [(-21.0, 8.35, 3.6, 4.6), (-136.0, 17.0, 4.0, 5.6), (-26.5, 4.2, 2.4, 0.6), (-16.5, 7.2, 0.7, 2.8), (-36.0, 8.0, 0.7, 2.4),
              (-60.5, 6.2, 0.7, 1.2), (-104.0, 9.5, 0.7, 2.6), (-24.5, 5.4, 0.7, 1.8), (-48.5, 8.0, 0.7, 2.4), (-71.0, 11.0, 0.7, 3.2),
              (-92.0, 12.0, 0.7, 2.5)]
WEST_FACE = B.Face("+x", -WALK, -168.0, -10.0)
WEST_LOTS = [(z - d, z, h) for (z, d, h) in LOTS[-1] if z <= -30 and z - d > -165]
_names = K.use_names(K.CORE_NAMES)
ST.upper(AV, WEST_FACE, WEST_LOTS, random.Random(7400), taken=WEST_NAMED, cap=11.5)
ST.upper(AV, WEST_FACE, WEST_LOTS, random.Random(7401), taken=WEST_NAMED)
K.use_names(_names)
# And the band over the shops on the south street's south side and down the
# arm, which a walker looks square at.
for sx in (-1, 1):
    # (Each lot to its street front's top: a towered lot's tower is set
    # back behind it.)
    row = [(a, b, SOUTH_TIERS[sx][j][0][5]) for j, (a, b, h) in enumerate(SOUTH_ROW[sx])] + [(sx * WALK, sx * (WALK + DEPTH), ARM_TIERS[sx][0][0][5])]
    row = [tuple(sorted(r[:2])) + (r[2],) for r in row]
    arm = [(za, za + d, ARM_TIERS[sx][j][0][5]) for j, (za, d) in enumerate(ARM)]
    f_row = B.Face("-z", 12.0, sx * WALK, sx * 108.0 if sx > 0 else -66.0)
    f_arm = B.Face("-x" if sx > 0 else "+x", sx * WALK, 12.0, 88.0)
    ST.upper(AVS, f_row, row, random.Random(7410 + sx), cap=12.5)
    ST.upper(AVS, f_arm, arm, random.Random(7420 + sx), cap=12.5)
    # And in the gaps, columns of small boards on masts and tall blades,
    # every one turned (down the arm, south of the phone hero's frame).
    ST.more_signs(AVS, f_row, row, random.Random(7430 + sx))
    ST.more_signs(AVS, f_arm, arm, random.Random(7440 + sx), clear=((12.0, 33.0),))

# And over the shops of the arm and the south street's row, and up every
# wall of the lanes, windows with depth, condensers and their stains,
# conduit, washing (avenue_upper): each wall its own mix.
_up = random.Random(7500)
for sx in (-1, 1):
    for j, (za, d) in enumerate(ARM):
        UP.dress(AVS, B.Face("-x" if sx > 0 else "+x", sx * WALK, za, za + d), SHOP_H + CELL_H, ARM_TIERS[sx][j][0][5] - 0.5, _up, rate=0.3, units=0.1)
    for j, (xa, xb, h) in enumerate(SOUTH_ROW[sx]):
        UP.dress(AVS, B.Face("-z", 12.0, xa, xb), SHOP_H + CELL_H, SOUTH_TIERS[sx][j][0][5] - 0.5, _up, rate=0.3, units=0.1)
for (f, h, tcol, lane) in BACKS:
    UP.dress(AVS, f, SHOP_H, h - 0.5, _up, rate=0.18, units=0.14, washing=0.5)
# And over the lanes, from where their own signs stop: columns of signs,
# condensers, lamps up every back (avenue_upper.lane_upper), and slung from
# wall to wall higher than the lanes' own light, cables, washing, pipes,
# signs on wires (avenue_lanes.Lane.high). (Their own streams, after
# everything else, so nothing above moves.)
with K.own_names():
    _lu = random.Random(7560)
    for (f, h, tcol, lane) in BACKS:
        UP.lane_upper(AVS, f, SHOP_H + 1.0, min(h - 1.0, 24.0), _lu, skip=(DECK_BAND,) if lane in ("w", "e") else ())
        UP.lane_band(AVS, f, _lu, skip=(DECK_BAND,) if lane in ("w", "e") else ())
    for side, plane, nm in (("w", -WALK - DEPTH - 6.0, "+x"), ("e", WALK + DEPTH + 8.0, "-x")):
        UP.lane_band(AVS, B.Face(nm, plane, -166.0, -12.0), _lu, y0=2.6, y1=3.2, skip=(DECK_BAND,) + tuple(NORTH_LANES[side].used))
        for (z0, z1, top) in UP.FAR_TOPS[side]:
            if top - 1.0 >= 10.0 and z1 - z0 > 4.0:
                UP.lane_upper(AVS, B.Face(nm, plane, max(z0, -166.0) + 0.5, min(z1, -12.0) - 0.5), 6.0, min(top - 1.0, 17.0), _lu, every=(6.0, 11.0), skip=(DECK_BAND,))
    for lane in LANES:
        far = {"w": "w", "e": "e"}.get(lane.name)
        lane.high(random.Random(7570 + len(lane.name) * 7 + ord(lane.name[-1])), top=14.0 if far else 12.0,
                  far_cap=(lambda v, side=far: UP.far_top(side, v, 1.5) - 0.5) if far else None)
# The arm's corner lots over the south street's shops: their walls to the
# street dressed as the row's are (a walker looks square at them).
for sx in (-1, 1):
    UP.dress(AVS, B.Face("-z", 12.0, sx * WALK, sx * (WALK + DEPTH)), SHOP_H + CELL_H, ARM_TIERS[sx][0][0][5] - 0.5, random.Random(7530 + sx), rate=0.32, units=0.12)
# The far wall of each north lane is Japantown's back (x -50) and the
# plaza's (x 52): fixed to it over the lane, condensers, pipes, ducts,
# trays, bills, boards, lamps, clear of the deck's band.
UP.far_wall(AVS, B.Face("+x", -WALK - DEPTH - 6.0, -166.0, -12.0), -166.0, -12.0, random.Random(7510), skip=(DECK_BAND,), used=NORTH_LANES["w"].used)
UP.far_wall(AVS, B.Face("-x", WALK + DEPTH + 8.0, -166.0, -12.0), -166.0, -12.0, random.Random(7511), skip=(DECK_BAND,), used=NORTH_LANES["e"].used)
# The show's street paint and furniture on the arm and the south street, and
# people on their pavements (avenue_street.markings).
K.use_names(random.Random(77230))
ST.markings(AVS, random.Random(7620))
K.use_names(_names)
P.place = _place
