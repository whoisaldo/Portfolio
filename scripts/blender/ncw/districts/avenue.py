from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)

# Road surfaces: the avenue, the cross street at the intersection, and the
# junction at its north end.
ground((AV, "asphalt", 0), -ROAD_HALF, ROAD_HALF, AV_NORTH, 60, scale=6.0)
ground((AV, "asphalt", 0), -90, -ROAD_HALF, -6, 8, scale=6.0)
ground((AV, "asphalt", 0), ROAD_HALF, 90, -6, 8, scale=6.0)
road_markings(AV, -ROAD_HALF, ROAD_HALF, AV_NORTH + 2, -9)
road_markings(AV, -ROAD_HALF, ROAD_HALF, 11, 60)
crosswalk(AV, -9.2, 9.2, -8.3)
# The south one a few metres back from the junction: the hero's lens stands
# at z 10, and its bars would lie right under it.
crosswalk(AV, -9.2, 9.2, 13.4)
# Through the junction, the lanes' own dashed guides, so the road nearest
# the hero's lens leads up the avenue like the rest of it.
for lx, w in ((0.0, 0.15), (-5.0, 0.06), (5.0, 0.06)):
    z = 8.0
    while z - 1.0 > -6.2:
        quad((AV, "paint", 0), (lx - w, 0.011, z), (lx + w, 0.011, z), (lx + w, 0.011, z - 1.0), (lx - w, 0.011, z - 1.0))
        z -= 2.0
for side in (-1, 1):
    kerb_and_walk(AV, side, AV_NORTH, -6)
    kerb_and_walk(AV, side, 8, 60)
    # The cross street's pavements.
    x_in = side * WALK
    x_out = side * 90
    xa, xb = sorted((x_in, x_out))
    ground((AV, "sidewalk", 0), xa, xb, -10, -6, y=0.15, scale=2.0)
    ground((AV, "sidewalk", 0), xa, xb, 8, 12, y=0.15, scale=2.0)

# Drains and manholes on the wet road.
for x, z in ((-8.9, -24), (8.9, -41), (-8.9, -63), (8.9, -88), (-8.9, -112), (8.9, -140)):
    box((AV, "dark", 1), x - 0.3, x + 0.3, 0, 0.018, z - 0.5, z + 0.5, scale=0.5)
for x, z in ((2.4, -18), (-3.1, -52), (3.3, -96)):
    cylinder((AV, "metal", 1), x, z, 0, 0.02, 0.38, segs=16)


# The lots, north of the intersection. (z_start, depth along the street,
# height) per side. The hero's camera is low, so the first few lots tower
# out of its frame; past them each roof is a little lower in its eye than
# the one before (on the left about 0.38 of the lot's distance falling to
# 0.29; on the right, past Nicola, a steeper 0.27, as the plate has it), and
# the roofs step down toward the vanishing point under a band of sky.
HERO_EYE_Z = 10.0
LOTS = {
    -1: [(-10, 11, 16), (-21, 9, 24), (-30, 14, 19), (-44, 12, 21), (-56, 10, 23), (-66, 12, 29),
         (-84, 13, 27), (-97, 11, 37), (-108, 15, 33), (-123, 12, 44), (-135, 14, 38), (-149, 12, 49),
         (-161, 9, 46)],
    1: [(-10, 13, 18), (-23, 10, 22), (-33, 12, 27), (-45, 16, 17), (-61, 10, 19), (-71, 13, 22),
        (-86, 12, 26), (-98, 14, 29), (-112, 11, 33), (-123, 15, 36), (-138, 12, 40), (-150, 10, 43),
        (-160, 10, 44)],
}
for side, lots in LOTS.items():
    s = side
    for i, (z_start, depth, height) in enumerate(lots):
        z1, z0 = z_start, z_start - depth
        seed = 1000 + (i * 37 if s > 0 else i * 53 + 7)
        x_front, x_back = (WALK, WALK + 22) if s > 0 else (-WALK - 22, -WALK)
        xa, xb = (WALK, WALK + 22) if s > 0 else (-WALK - 22, -WALK)
        mass(AV, xa, xb, z0, z1, SHOP_H, height, seed, painted=(i + (0 if s > 0 else 1)) % 3)
        HERO_MASSES.append(((xa, 0.0, z0), (xb, height, z1)))
        # The ground floor as its own dark volume, set back behind the
        # shopfront's glass (in its plane the glass would lose to it), and on
        # the corner lots behind a second shopfront facing the intersection.
        corner = i == 0
        box((AV, "dark", 0), xa + (0.3 if s > 0 else 0), xb - (0.3 if s < 0 else 0), 0.15, SHOP_H, z0, z1 - (0.3 if corner else 0), scale=2.0)
        r = shopfront(AV, s, z0, z1, seed)
        if corner:
            corner_shop(AV, xa, xb, z1, seed + 5)
        if r.random() < 0.18:
            lanterns(AV, s, z0, z1)
        ledges(AV, s, z0, z1, SHOP_H + CELL_H, height)
        clutter(AV, s, z0, z1, height, seed + 11)
        ac_units(AV, s, z0, z1, SHOP_H + 1, min(height - 2, 22), seed + 1)
        if r.random() < 0.3 and height > 20:
            fire_escape(AV, s, (z0 + z1) / 2, SHOP_H + 0.5, min(height - 3, 26))
        # A setback crown on the taller lots, kept under the line the roofs
        # step down along, and roof clutter.
        crown = min(r.uniform(5, 14), 0.33 * (HERO_EYE_Z - z_start) - height)
        if height > 30 and crown > 3:
            ia, ib = (xa + 3, xb - 5) if s > 0 else (xa + 5, xb - 3)
            mass(AV, ia, ib, z0 + 2, z1 - 2, height, height + crown, seed + 3)
            HERO_MASSES.append(((ia, height, z0 + 2), (ib, height + crown, z1 - 2)))
        # The roof, dressed once every mass the hero looks along is known (see
        # HERO_ROOFS below): a parapet, a tank, a hut, plant, an antenna, a
        # sign facing the street, each only where the hero cannot see it.
        if height > 30 and crown > 3:
            HERO_ROOFS.append((AV, xa, xb, z0, z1, height, seed + 21, 0.0, None))
            HERO_ROOFS.append((AV, ia, ib, z0 + 2, z1 - 2, height + crown, seed + 22, 4.5, -s * math.pi / 2))
        else:
            HERO_ROOFS.append((AV, xa, xb, z0, z1, height, seed + 21, 4.5, -s * math.pi / 2))

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
