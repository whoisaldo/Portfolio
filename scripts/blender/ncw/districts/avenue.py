from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw import buildings as B
from ncw import props as P

# The street itself (asphalt, paint, crossings, kerbs, pavements, drains)
# is streets.py's, from the plan.


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
        B.building(lot, height, r, style=st, defer_roof=HERO_ROOFS)
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

# What the hero's lens does not see (its lanes behind the rows, the south
# arm behind it, the south street's frontages, the depot) is Kabuki Avenue
# too, but streams in with the east pack (finish.PACK_OF), so the core the
# city goes live on stays the size it was.
AVS = "avenue_s"
# The service lanes behind each row, paved, lit and cluttered, from the
# south street to the plaza street (the deck crosses them overhead).
for xa, xb in ((-WALK - DEPTH - 6.0, -WALK - DEPTH), (WALK + DEPTH, WALK + DEPTH + 8.0)):
    B.ground_rect(AVS, xa, xb, -168.0, -10.0)
    lr = random.Random(int(xa * 13))
    z = -14.0
    while z > -164.0:
        if not (DECK_GAP[0] - 2 < z < DECK_GAP[1] + 2):
            kind = lr.random()
            x = xa + 0.6 if lr.random() < 0.5 else xb - 0.6
            if kind < 0.35:
                P.place("bin", x, 0.15, z, district=AVS)
            elif kind < 0.5:
                P.place("drum", x, 0.15, z, district=AVS)
            elif kind < 0.62:
                P.place("lamp_short", x, 0.15, z, district=AVS)
        z -= lr.uniform(5.0, 11.0)

# The avenue's south arm, behind the hero's lens (the drift's camera stands
# in it), and the south street's frontages either side of the junction, with
# their own blocks: lower, the same street.
ARM = [(12.0, 13.0), (25.0, 11.0), (36.0, 15.0), (51.0, 12.0), (63.0, 14.0), (77.0, 11.0)]
for s in (-1, 1):
    rr = random.Random(2200 + s)
    hs = [rr.choice((14.0, 18.0, 21.0, 24.0, 28.0, 31.0)) for _ in ARM]
    for j, (za, d) in enumerate(ARM):
        r = random.Random(2300 + j * 11 + (5 if s > 0 else 0))
        xa, xb = (WALK, WALK + DEPTH) if s > 0 else (-WALK - DEPTH, -WALK)
        front = "-x" if s > 0 else "+x"
        sides = {front: "street", ("+x" if s > 0 else "-x"): "back",
                 "-z": "street" if j == 0 else "party", "+z": "open" if j == len(ARM) - 1 else "party"}
        nb = {}
        if j > 0:
            nb["-z"] = hs[j - 1]
        if j < len(ARM) - 1:
            nb["+z"] = hs[j + 1]
        B.building(B.Lot(xa, xb, za, za + d, front, sides, nb, AVS), hs[j], r, style=STYLE)
# The arm ends at a yard wall and the depot behind it, square across the
# street: a shut gate, a lit sign over it, the depot's mass over the wall.
B.building(B.Lot(-WALK - DEPTH, WALK + DEPTH, 92.0, 118.0, "-z", {"-z": "street", "+z": "back", "-x": "open", "+x": "open"}, {}, AVS),
           19.0, random.Random(2399), style=dict(STYLE, tints=("rust", "brown"), windows=(2,), balcony=0.0, signs=0.6),
           ground="blank")
B.ground_rect(AVS, -WALK - DEPTH, WALK + DEPTH, 88.0, 92.0)
# Its yard wall across the road's end and the gate in it: two leaves of
# corrugated steel, shut, in a frame lit amber, hazard stripes over them, a
# flood on each pier throwing light down on the gate, a sign over it, the
# guard's booth beside it lit inside, a barrier and drums at the kerb.
for xo in (-6.0, 6.0):
    box((AVS, "door_panel", 0), xo - 5.9, xo + 5.9, 0.15, 6.2, 91.75, 92.0, scale=1.0)
for px in (-12.4, 0.0, 12.4):
    box((AVS, "concrete", 0), px - 0.4, px + 0.4, 0.0, 7.0, 91.4, 92.3, scale=1.5)
box((AVS, "hazard", 1), -12.0, 12.0, 6.2, 6.5, 91.65, 91.75, scale=1.0)
box((AVS, "neon_amber", 0), -12.0, 12.0, 6.55, 6.65, 91.6, 91.7, scale=1.0)
for px in (-12.0, 12.0):
    box((AVS, "neon_amber", 0), px - 0.05, px + 0.05, 0.3, 6.5, 91.6, 91.7, scale=1.0)
    box((AVS, "metal", 1), px - 0.3, px + 0.3, 7.0, 7.3, 91.0, 91.8, scale=0.5)
    box((AVS, "glow", 0), px - 0.25, px + 0.25, 6.92, 7.0, 91.05, 91.75, scale=0.5, col=GLOW["white"])
    site_lamp(f"depot_{'w' if px < 0 else 'e'}", (px, 6.8, 90.6), "#ffd8a8", 9.0, 1.1)
box((AVS, "board_frame", 0), -7.0, 7.0, 8.0, 10.6, 91.55, 91.75, scale=1.0)
sign(st_name("pm"), -3.5, 9.3, 91.5, 2.8, 1.2, math.pi, district=AV, label=False)
sign(st_name("pm"), 3.5, 9.3, 91.5, 2.8, 1.2, math.pi, district=AV, label=False)
# The booth, east of the gate: a lit window, its roof.
box((AVS, "trim", 0), 14.4, 17.4, 0.15, 2.8, 86.4, 89.0, scale=1.0, col=B.TRIM[5])
quad((AVS, "shop", 0), (14.38, 1.0, 88.6), (14.38, 1.0, 86.8), (14.38, 2.3, 86.8), (14.38, 2.3, 88.6), col=(0.8, 0.9, 1.0, 1.0))
box((AVS, "metal", 1), 14.2, 17.6, 2.8, 2.95, 86.2, 89.2, scale=1.0)
P.place("barrier", 9.0, 0.15, 86.5, district=AVS)
P.place("barrier", -9.0, 0.15, 86.5, district=AVS)
P.place("cctv", 12.9, 0.15, 89.5, district=AVS)
for (x, z) in ((-11.0, 89.6), (-10.3, 89.9), (-11.4, 90.4)):
    P.place("drum", x, 0.15, z, district=AVS)

# The south street's frontages either side of the hero's junction, out to
# the west street and to the x 120 road: its south side, and the stretch of
# its north side the avenue's rows do not reach (east of the east lane).
SOUTH = dict(STYLE, signs=1.4, roof_cap=6.0)
B.row(AVS, "-z", -66.0, -WALK, 30.0, 12.0, lambda i, a: random.Random(int(a * 7)).choice((16.0, 22.0, 27.0, 33.0)),
      lambda i: random.Random(int(i * 31 + 5)).choice((9.6, 12.8, 16.0)), random.Random(2401), style=SOUTH,
      ends=("street", "street"))
B.row(AVS, "-z", WALK, 108.0, 30.0, 12.0, lambda i, a: random.Random(int(a * 11)).choice((15.0, 20.0, 26.0, 34.0)),
      lambda i: random.Random(int(i * 17 + 3)).choice((9.6, 12.8, 16.0, 19.2)), random.Random(2402), style=SOUTH,
      ends=("street", "street"))

# Blade signs down both sides: the plate's vertical Japanese signs. The ids
# are keys into WORLD_SIGNS in src/data/world.js, which holds their words.
blade(AV, -1, "ramen", -16.5, 7.2, 5.6, 1.1, preview="ラーメン")
blade(AV, -1, "mirai", -36.0, 8.0, 4.8, 0.9, preview="未来の目")
blade(AV, -1, "bar", -60.5, 6.2, 2.4, 1.2, preview="BAR")
blade(AV, -1, "hotel", -79.0, 8.6, 5.0, 0.9, preview="ホテル")
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
blade(AV, 1, "mirai2", -78.0, 11.5, 6.2, 1.0, preview="未来")
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

# The overpass: a concrete deck on two piers crossing the avenue, a rail
# along its edge, lights underneath, and its teal sign.
OVER_Z = -80.0
box((AV, "concrete", 0), -46, 46, 7.2, 8.5, OVER_Z - 3.2, OVER_Z + 3.2, scale=3.0)
for px in (-17.5, 17.5):
    box((AV, "concrete", 0), px - 0.8, px + 0.8, 0, 7.2, OVER_Z - 1.2, OVER_Z + 1.2, scale=2.0)
for zz in (OVER_Z - 3.25, OVER_Z + 3.15):
    box((AV, "metal", 1), -46, 46, 8.5, 9.6, zz, zz + 0.1, scale=0.8)
box((AV, "neon_teal", 0), -12, 12, 7.1, 7.18, OVER_Z + 3.0, OVER_Z + 3.1, scale=1.0)
for lx in range(-40, 41, 8):
    box((AV, "neon_white", 1), lx - 0.8, lx + 0.8, 7.1, 7.16, OVER_Z - 0.3, OVER_Z + 0.3, scale=1.0)
sign("sora", -6.0, 9.2, OVER_Z + 3.35, 6.4, 1.3, 0.0, preview="空き未来へ")
box((AV, "board_frame", 0), -9.4, -2.6, 8.4, 10.0, OVER_Z + 3.1, OVER_Z + 3.3, scale=1.0)

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

# Vending machines and bollards at the kerb.
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

# The lanes behind each row: cables slung across them every few metres,
# and a vent breathing steam in each.
for xa, xb, seed in ((-WALK - DEPTH - 6.0, -WALK - DEPTH, 9301), (WALK + DEPTH, WALK + DEPTH + 8.0, 9302)):
    lr = random.Random(seed)
    z = -16.0
    while z > -164.0:
        if not (DECK_GAP[0] - 2 < z < DECK_GAP[1] + 2):
            y0 = lr.uniform(5.0, 10.0)
            sag = lr.uniform(0.3, 1.2)
            for i in range(8):
                t0, t1 = i / 8, (i + 1) / 8
                x0, x1 = xa + t0 * (xb - xa), xa + t1 * (xb - xa)
                ya, yb = y0 - sag * math.sin(math.pi * t0), y0 - sag * math.sin(math.pi * t1)
                quad((AVS, "dark", 1), (x0, ya - 0.025, z), (x1, yb - 0.025, z), (x1, yb + 0.025, z), (x0, ya + 0.025, z))
                quad((AVS, "dark", 1), (x1, yb - 0.025, z), (x0, ya - 0.025, z), (x0, ya + 0.025, z), (x1, yb + 0.025, z))
        z -= lr.uniform(7.0, 14.0)
for i, (x, z) in enumerate(((-WALK - DEPTH - 3.0, -52.0), (WALK + DEPTH + 4.0, -128.0))):
    box((AVS, "metal", 1), x - 0.4, x + 0.4, 0.15, 0.22, z - 0.4, z + 0.4, scale=0.5)
    empty(f"anchor_steam_lane_{i}", (x, 0.25, z))
