"""Santo Domingo: the city's industrial edge, along the south street and the garage street's south half.

Low and wide under sodium light (BIBLE.md, "Santo Domingo"): between the
plaza street and the south street an estate on a cross of private roads (a
sawtooth works, a tank farm with two spheres, the plant with its braced
frame, stacks and flare at the corner where the loop turns, warehouses
behind dock forecourts); south of the south street a fuel station under its
price pylon, a sawtooth shed, a container yard under an orange gantry, a
substation, the numbered block that closes the garage street, a gasholder;
east of the garage street, under Contact's lens, low sheds whose north
lights face it, a small tank yard, a workshop and a lit corner of shops.
Everything is keyed to "santo" so it streams in the district's pack.

The pieces are in santo_kit.py. Heights east of the garage street and
north of z -76 stay at 11 m or under: Contact's lens (10.4 m up on the
garage's roof) skims that roofscape to the moon.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw import plan
from ncw.districts import santo_kit as K
from ncw.districts.santo_kit import D, GY, k

PI = math.pi
STYLE = dict(windows=(2, 3, 6), lit=(0.3, 0.7), warmth=(0.5, 1.0), tints=("rust", "brown", "concrete", "charcoal"),
             balcony=0.03, ac=0.2, signs=0.9, awning=0.35, shop_sign=0.5, canopy=0.15, roof_cap=4.5,
             setback=0.0, fire_escape=0.25, cornice=0.3, shop_colours=["amber", "red", "yellow", "white", "cyan"])


def R(seed):
    return random.Random(seed)


def mast(x, z, yaw, level=0.75, red=0.0, hue="amber", size=10.0):
    """A flood mast and the patch of yard it lights in front of it."""
    P.place("flood_mast", x, GY, z, yaw, district=D)
    for dx in (-1.05, -0.35, 0.35, 1.05):
        hx, hz = x + math.cos(yaw) * dx + math.sin(yaw) * 0.12, z - math.sin(yaw) * dx + math.cos(yaw) * 0.12
        rotated_quad(k("neon_" + ("amber" if hue == "amber" else "white")), hx, GY + 11.53, hz, 0.5, 0.32, yaw)
        K.lens(hx, GY + 11.36, hz - 0.0, 0.5, 0.18, yaw, key=k("neon_" + ("amber" if hue == "amber" else "white")), h=0.02)
    cx, cz = x + math.sin(yaw) * (size * 0.5 + 0.5), z + math.cos(yaw) * (size * 0.5 + 0.5)
    K.wash(cx - size / 2, cx + size / 2, cz - size / 2, cz + size / 2, level=level, hue=hue, red=red)


def strip(x, z, yaw, power=7.0, cone=True):
    """A strip lamp on its pole, its pool under the tube, its cone in the
    haze."""
    P.place("lamp_strip", x, GY, z, yaw, district=D)
    hx, hz = x + math.sin(yaw) * 1.45, z + math.cos(yaw) * 1.45
    K.lens(hx, GY + 6.26, hz, 0.18, 1.7, yaw)
    K.sodium(hx, 6.3, hz, power)
    if cone:
        K.cone(hx, GY + 6.26, hz)


def scatter(r, x0, x1, z0, z1, n, kinds=("drum_pallet", "drum_pallet", "tote", "crates", "reel", "tyres", "drum"), yaw=None):
    """Yard clutter set down in a patch, in twos and threes."""
    for _ in range(n):
        cx, cz = r.uniform(x0, x1), r.uniform(z0, z1)
        kind = r.choice(kinds)
        for j in range(r.randrange(1, 4)):
            px = min(x1, max(x0, cx + j * r.uniform(1.3, 1.7) * (1 if r.random() < 0.7 else 0)))
            pz = min(z1, max(z0, cz + (0 if px != cx else j * 1.5)))
            P.place(kind, px, GY, pz, r.uniform(0, 6.28) if yaw is None else yaw, district=D)


# ---------------------------------------------------------------------------
# The estate's roads: a cross of private asphalt, three gates.
# ---------------------------------------------------------------------------
def roads():
    K.asphalt(296.0, 304.0, -168.0, -10.0)
    K.asphalt(176.0, 296.0, -92.0, -84.0)
    K.asphalt(304.0, 428.0, -92.0, -84.0)
    K.paved(170.0, 176.0, -168.0, -10.0)
    z = -162.0
    while z < -16.0:
        if not -93.0 < z < -86.0:
            K.stripe(299.92, 300.08, z, z + 3.0)
        z += 8.0
    x = 180.0
    while x < 424.0:
        if not 294.0 < x < 303.0:
            K.stripe(x, x + 3.0, -88.08, -87.92)
        x += 8.0
    # Lamps down both roads, alternate sides.
    for i, z in enumerate(range(-156, -12, 24)):
        if -96 < z < -80:
            continue
        s = 1 if i % 2 else -1
        strip(300.0 + s * 4.6, float(z), -s * PI / 2)
    for i, x in enumerate(range(190, 424, 26)):
        if 290 < x < 310:
            continue
        # (East of the crossing the plant's rack stands on the south edge.)
        s = 1 if (i % 2 and x < 296) else -1
        strip(float(x), -88.0 + s * 4.6, 0.0 if s < 0 else PI)
    # The plaza street's gate, shut; the south street's, open, its booth
    # and guard; the garage street's, open, the same.
    K.gate(295.6, -167.8, 304.4, -167.8, (0, 1), open_=False)
    K.gate(295.6, -12.4, 304.4, -12.4, (0, -1), open_=True, booth=(292.6, -15.8, PI / 2))
    K.gate(425.8, -92.4, 425.8, -83.6, (-1, 0), open_=True, booth=(423.4, -81.2, PI))
    K.totem(424.0, -94.8, PI * 0.38)
    K.totem(306.6, -14.4, PI * 0.14)
    # A pair talking at the south gate, a driver waiting at the east one.
    stand(298.2, -15.8, PI / 2, "talk")
    stand(299.4, -15.7, -PI / 2, "talk")
    stand(422.6, -86.2, PI / 2, "phone")
    # The service lane on the west: lamps, bins, a skip.
    for z in (-150.0, -112.0, -70.0, -30.0):
        strip(175.4, z, -PI / 2, power=5.0, cone=False)
    for z, kind in ((-140.0, "dumpster"), (-120.0, "bags"), (-60.0, "dumpster"), (-44.0, "crates"), (-22.0, "bags")):
        P.place(kind, 174.8, GY, z, -PI / 2, district=D)


# ---------------------------------------------------------------------------
# North-west: the works, a sawtooth shed with a boiler house and chimney,
# its docks on a truck court.
# ---------------------------------------------------------------------------
def works():
    r = R(8611)
    X0, X1, Z0, Z1, EAVE = 180.0, 264.0, -160.0, -100.0, 8.6
    K.paved(176.0, 268.0, -168.0, -92.0)
    K.asphalt(268.0, 296.0, -168.0, -92.0)
    out = K.shed(X0, X1, Z0, Z1, EAVE, K.CREAM, r, faces={
        "-z": dict(band=(5.6, 7.4), style=6, lit=(0.3, 0.6), posters=0.2),
        "+z": dict(band=(5.6, 7.4), style=6, lit=(0.3, 0.6), office=(30.0, 56.0)),
        "+x": dict(band=(6.6, 7.9), style=6, docks=dict(n=8, s0=5.0, s1=55.0, first=1, open=(2,), half=(5,))),
        "-x": dict(band=(5.6, 7.4), style=6),
    }, stripe_col=K.OXIDE)
    K.sawtooth(X0, X1, Z0, Z1, EAVE, 10, "-z", r, wall=K.CREAM, rise=2.6, lit=0.72)
    # The boiler house against its south wall, and the chimney beside it.
    K.shed(186.0, 204.0, -100.0, -93.2, 11.6, K.BRICK, r, faces={"-z": dict(hidden=True), "+z": dict(band=(7.4, 9.4), style=3, lit=(0.5, 0.8))},
           tint="rust")
    K.flat_roof(186.0, 204.0, -100.0, -93.2, 11.6, r, wall=K.BRICK, lights=0.0, plant=False, breathe=2)
    K.stack(182.6, -96.6, 31.0, 1.5, 1.0, K.BRICK, segs=8, bands=((0.9, 0.95),), band_col=K.CREAM, lit=5.0)
    box(k("trim"), 183.6, 186.0, 6.0, 7.6, -97.4, -95.8, scale=1.0, col=K.RUST_D)
    # The court: trailers on four doors, bays painted out, floods.
    plat = out.get("+x", GY)
    for i in (0, 3, 4, 7):
        z = Z1 - (5.0 + (i + 0.5) * 6.25)
        P.place("trailer", X1 + 2.6 + 6.5, GY, z, 0.0, district=D)
    for i in range(9):
        z = Z1 - (5.0 + i * 6.25)
        K.stripe(X1 + 2.8, X1 + 17.0, z - 0.06, z + 0.06, K.PAINT_WHITE)
    K.hatch(284.0, 294.0, -166.0, -160.0)
    strip(290.0, -140.0, -PI / 2)
    strip(290.0, -112.0, -PI / 2)
    mast(294.6, -164.0, -PI * 0.7)
    mast(269.0, -96.0, PI * 0.25)
    K.wash(X1 + 0.6, X1 + 3.4, Z0 + 4.0, Z1 - 4.0, level=0.8)
    K.wash(X0, X1, Z0 - 1.2, Z0 - 1.2, level=0.45, step=6.0)
    K.wash(208.0, 240.0, Z1 + 1.2, Z1 + 1.2, level=0.6)
    K.wash(186.0, 204.0, -92.2, -92.2, level=0.6, red=0.3)
    P.place("forklift", X1 + 1.3, plat, -117.0, PI * 0.9, district=D)
    P.place("crates", X1 + 1.2, plat, -124.0, 0.3, district=D)
    P.place("crates", X1 + 1.5, plat, -146.0, 1.2, district=D)
    stand(X1 + 1.4, -120.6, PI / 2, "idle", plat)
    stand(X1 + 1.9, -121.8, -0.4, "talk", plat)
    stand(X1 + 1.2, -139.0, PI / 2, "smoke", plat)
    stand(283.0, -128.5, PI, "talk")
    stand(283.2, -130.0, 0.0, "talk")
    K.roof_sign(264.0 - 14.0, 8.6 + 2.6, -100.0 - 3.0, PI * 0.12, sizes=("pm", "bx", "pm"), scale=1.5)
    fw_ = B.faces_of(X0, X1, Z0, Z1)
    K.stencil(fw_["+z"], 70.0, 4.0, "01", wall=K.CREAM)
    K.stencil(fw_["-z"], 12.0, 4.0, "01", wall=K.CREAM)
    # Along the plaza street: a fence, and the yard strip behind it.
    K.fence(176.2, -167.8, 295.2, -167.8)
    for x, name in ((190.0, "c20_grey"), (246.0, "c40_rust")):
        P.place(name, x, GY, -164.2, 0.0, district=D)
    scatter(r, 200.0, 236.0, -166.0, -162.0, 7)
    scatter(r, 256.0, 264.0, -166.0, -162.0, 2, kinds=("reel", "tote"))
    for x in (212.0, 250.0):
        strip(x, -166.6, 0.0)
    stand(238.0, -163.0, 0.4, "sit", GY + 0.9)
    # The south apron: parking for the office, a lamp, the doorway's pair.
    K.bays(208.0, 238.0, -98.4, -93.6, 10, along="x")
    door = out.get("+z_door")
    if door:
        stand(door[0] - 1.6, door[2] + 0.4, PI / 2, "smoke")
    strip(222.0, -93.0, PI)
    scatter(r, 206.0, 262.0, -99.2, -98.0, 3, kinds=("tote", "drum_pallet"))


# ---------------------------------------------------------------------------
# North-east: the tank farm, at the corner of the plaza street and the
# garage street (Fn9gKhU_2_Q@28).
# ---------------------------------------------------------------------------
def tank_farm():
    r = R(8621)
    K.paved(304.0, 428.0, -168.0, -92.0)
    # Two bunds, the big tanks in the north one, and a manifold between.
    for (x0, x1, z0, z1) in ((313.0, 402.0, -161.0, -131.0), (313.0, 402.0, -127.0, -99.0)):
        for (a0, a1, b0, b1) in ((x0, x1, z0, z0 + 0.3), (x0, x1, z1 - 0.3, z1), (x0, x0 + 0.3, z0, z1), (x1 - 0.3, x1, z0, z1)):
            box(k("concrete"), a0, a1, 0.0, 1.15, b0, b1, scale=2.0)
        box(k("hazard", 1), x0, x1, 1.15, 1.2, z1 - 0.3, z1, scale=1.0)
    K.tank(328.0, -146.0, 10.5, 12.0, K.RUST, band=(0.78, 0.86), number="01", number_yaw=PI * 0.8, stair_at=PI * 0.75, r_=r)
    K.tank(357.0, -146.0, 10.5, 12.6, K.TANK_WHITE, band=(0.78, 0.86), number="02", number_yaw=PI * 0.8, stair_at=PI * 0.7, r_=r)
    K.tank(386.0, -146.0, 10.5, 11.2, K.RUST, band=(0.78, 0.86), number="03", number_yaw=PI * 0.72, stair_at=PI * 0.3, r_=r)
    K.tank(324.0, -113.0, 7.0, 10.0, K.TANK_WHITE, segs=16, band=(0.1, 0.18), number="04", number_yaw=PI * 0.5, stair_at=-PI * 0.6, r_=r)
    K.tank(345.0, -113.0, 7.0, 9.0, K.RUST, segs=16, number="05", number_yaw=PI * 0.4, stair_at=PI * 0.5, r_=r)
    K.tank(366.0, -113.0, 7.0, 10.4, K.TANK_WHITE, segs=16, band=(0.1, 0.18), number="07", number_yaw=PI * 0.4, stair_at=PI * 0.5, r_=r)
    K.tank(387.0, -113.0, 7.0, 8.6, K.RUST, segs=16, number="08", number_yaw=PI * 0.45, stair_at=PI * 0.25, r_=r)
    K.sphere(414.0, -152.0, 6.4, K.TANK_WHITE)
    K.sphere(414.0, -132.0, 6.4, K.TANK_WHITE)
    for z, cols in ((-129.6, K.RUST), (-128.9, K.TANK_WHITE), (-128.3, K.YELLOW)):
        K.run([(312.0, 0.75, z), (406.0, 0.75, z), (406.0, 0.75, -112.0)], r=0.2, col=cols)
    for x, zt in ((328.0, -135.5), (357.0, -135.5), (386.0, -135.5), (324.0, -120.0), (345.0, -120.0), (366.0, -120.0), (387.0, -120.0)):
        K.run([(x, 0.75, -129.6), (x, 0.75, zt), (x, 1.6, zt)], r=0.16, col=K.RUST_D, detail=1)
    # The pump house by the gate, its doors on the yard.
    out = K.shed(406.0, 422.0, -116.0, -104.0, 4.8, K.STEEL_BLUE, r, faces={
        "-x": dict(docks=dict(n=2, s0=1.5, s1=10.5, raised=False, canopy=False, open=(0,), first=21)),
        "+x": dict(band=(2.9, 4.0), style=3, lit=(0.6, 0.9))})
    K.flat_roof(406.0, 422.0, -116.0, -104.0, 4.8, r, wall=K.STEEL_BLUE, lights=0.5, breathe=1)
    # The rack along the yard's south edge, bridging the estate road twice.
    K.rack(308.0, -96.4, 420.0, -96.4)
    K.rack(340.0, -94.9, 340.0, -83.1, step=11.8, lamps=False, braced=False)
    K.rack(404.0, -94.9, 404.0, -83.1, step=11.8, lamps=False, braced=False)
    # Fences on both streets, floods at the corners, strip lamps round the
    # bunds, cyan lamps on every landing (in K.tank).
    K.fence(304.8, -167.8, 425.8, -167.8)
    K.fence(425.8, -167.8, 425.8, -92.8)
    K.verge(r, 426.9, -166.0, 426.9, -94.0, step=7.0)
    K.run([(453.6, 7.35, -101.55), (457.2, 7.35, -101.55), (457.2, 0.7, -101.55)], r=0.3, col=K.STEEL_BLUE)
    mast(309.0, -164.5, PI * 0.2)
    mast(422.6, -164.2, -PI * 0.25)
    mast(404.5, -129.0, -PI * 0.5)
    mast(309.0, -98.5, PI * 0.75)
    for x in (334.0, 372.0):
        strip(x, -163.0, 0.0)
        strip(x, -129.0, PI)
    for z in (-150.0, -116.0):
        strip(311.4, z, PI / 2)
    for x in (328.0, 357.0, 386.0):
        K.ring_wash(x, -146.0, 12.0, PI * 0.95, PI * 1.9, level=0.8)
        K.ring_wash(x, -146.0, 12.0, PI * 0.2, PI * 0.55, level=0.4)
    for x in (324.0, 345.0, 366.0, 387.0):
        K.ring_wash(x, -113.0, 8.4, -PI * 0.15, PI * 0.9, level=0.75)
    for z in (-152.0, -132.0):
        K.ring_wash(414.0, z, 8.2, -PI * 0.5, PI * 0.55, level=0.7)
        K.ring_wash(414.0, z, 4.0, 0.0, PI * 2, level=0.45)
    K.wash(406.0, 422.0, -103.0, -103.0, level=0.5)
    scatter(r, 406.0, 424.0, -100.0, -94.0, 4, kinds=("drum_pallet", "tote", "drum"))
    K.bridge(424.4, -101.0, 453.6, -101.0, y=6.8)
    K.run([(424.4, 7.35, -101.55), (421.5, 7.35, -101.55), (421.5, 7.35, -96.4)], r=0.3, col=K.STEEL_BLUE)
    K.vent(427.0, -124.0)
    # People: a man on a tank's landing, one walking the bund, two at the
    # pump house door.
    lx, lz = 357.0 + 11.0 * math.cos(PI * 0.7), -146.0 + 11.0 * math.sin(PI * 0.7)
    stand(lx, lz, PI * 0.2, "lean", GY + 12.6)
    stand(360.0, -129.0, PI / 2, "idle")
    stand(404.4, -108.2, PI / 2, "talk")
    stand(405.2, -109.4, -PI / 3, "talk")
    stand(424.4, -141.0, PI / 2, "smoke")


# ---------------------------------------------------------------------------
# South-east: the plant, where the loop turns. A braced process frame in
# front of lit rust walls, stacks and a flare, cooling cells steaming on
# the south street, the control building on the corner (mH2wmyeiIpA@60).
# ---------------------------------------------------------------------------
def frame(r):
    X0, X1, Z0, Z1 = 344.0, 380.0, -70.0, -46.0
    levels = (5.5, 11.0, 16.5)
    xs = [X0 + 6.0 * i for i in range(7)]
    zs = [Z0 + 6.0 * i for i in range(5)]
    for x in xs:
        for z in zs:
            edge = x in (X0, X1) or z in (Z0, Z1)
            K.column(x, z, GY, levels[-1] if edge or (x in (356.0, 368.0)) else levels[1], t=0.34)
    for lv in levels:
        for z in zs:
            if lv < 16 or z in (Z0, Z1) or z == -58.0:
                K.beam(X0, z, X1, z, lv, t=0.3)
        for x in xs:
            if lv < 16 or x in (X0, X1, 356.0, 368.0):
                K.beam(x, Z0, x, Z1, lv, t=0.3)
    # Decks: the south half at the first level, the north at the second, a
    # crown platform at the third; rails with their row of small lamps.
    # (Gratings round the edges and across, not floors: the lit hall
    # behind has to show through every bay.)
    for (ax, az, bx, bz, lv) in ((X0, Z1 - 0.8, X1, Z1 - 0.8, 0), (X0 + 0.8, -58.0, X0 + 0.8, Z1, 0), (X1 - 0.8, -58.0, X1 - 0.8, Z1, 0),
                                 (X0, -57.2, X1, -57.2, 0), (362.0, -58.0, 362.0, Z1, 0),
                                 (350.0, -52.8, X1, -52.8, 1), (350.0, Z0 + 0.8, X1, Z0 + 0.8, 1), (350.8, Z0, 350.8, -52.0, 1),
                                 (X1 - 0.8, Z0, X1 - 0.8, -52.0, 1), (368.0, Z0, 368.0, -52.0, 1),
                                 (356.0, -52.8, 374.0, -52.8, 2), (356.0, -63.2, 374.0, -63.2, 2), (356.8, -64.0, 356.8, -52.0, 2),
                                 (373.2, -64.0, 373.2, -52.0, 2)):
        if abs(bx - ax) > abs(bz - az):
            K.deck(ax, bx, az - 0.8, az + 0.8, levels[lv])
        else:
            K.deck(ax - 0.8, ax + 0.8, az, bz, levels[lv])
    for (a, b, lv) in (((X0, Z1), (X1, Z1), 0), ((X0, -58.0), (X0, Z1), 0), ((X1, -58.0), (X1, Z1), 0), ((X0, -58.0), (X1, -58.0), 0),
                       ((350.0, -52.0), (X1, -52.0), 1), ((350.0, Z0), (X1, Z0), 1), ((350.0, Z0), (350.0, -52.0), 1), ((X1, Z0), (X1, -52.0), 1),
                       ((356.0, -52.0), (374.0, -52.0), 2), ((356.0, -64.0), (374.0, -64.0), 2), ((356.0, -64.0), (356.0, -52.0), 2),
                       ((374.0, -64.0), (374.0, -52.0), 2)):
        y = levels[lv]
        K.rail((a[0], y, a[1]), (b[0], y, b[1]), lamps=K.SODIUM, detail=0)
    # X bracing round the outside, every bay of the lower two storeys on
    # the faces the streets see, alternate bays above.
    tiers = ((GY + 0.2, levels[0] - 0.3), (levels[0], levels[1] - 0.3), (levels[1], levels[2] - 0.3))
    for ti, (ya, yb) in enumerate(tiers):
        for i in range(6):
            if ti == 2 and i % 2:
                continue
            for z in (Z0, Z1):
                K.xbrace(xs[i], z, xs[i + 1], z, ya, yb, r=0.1)
        for i in range(4):
            if ti == 2 and i % 2 == 0:
                continue
            for x in (X0, X1):
                K.xbrace(x, zs[i], x, zs[i + 1], ya, yb, r=0.1)
    # Stairs between the levels on the east side, in a tower of their own.
    for fx, fz in ((X1 + 0.6, -56.0), (X1 + 2.4, -56.0), (X1 + 0.6, -50.0), (X1 + 2.4, -50.0)):
        K.column(fx, fz, GY, levels[2] + 1.0, t=0.16, detail=1)
    y, flip = GY, 1
    while y < levels[2] - 0.1:
        y2 = min(levels[2], y + 2.75)
        K.stair((X1 + 1.5, y, -53.0 - 2.4 * flip), (X1 + 1.5, y2, -53.0 + 2.4 * flip), w=1.3, detail=0)
        y, flip = y2, -flip
    # What stands in it: two reactors through the decks, a column with ring
    # platforms taller than all of it, a drum on the first deck, exchangers
    # on the ground, the heater with its row of burners.
    for x, col, h in ((365.0, K.TANK_WHITE, 24.0), (359.0, K.RUST, 21.5)):
        rz = -61.0
        cylinder(k("trim"), x, rz, 2.4, h, 1.7, segs=12, col=col, cap=False)
        ring = K.ring_pts(x, rz, 1.7, 12, h)
        for i in range(12):
            K.tri_n(k("trim"), ((x, h + 1.0, rz), ring[i], ring[(i + 1) % 12]), (0, 1, 0), K.shade(col, 0.8))
        for (lx, lz) in ((x - 1.2, rz - 1.2), (x + 1.2, rz - 1.2), (x - 1.2, rz + 1.2), (x + 1.2, rz + 1.2)):
            K.column(lx, lz, GY, 2.6, t=0.22)
        box(k("glow"), x - 0.1, x + 0.1, h + 1.0, h + 1.25, rz - 0.1, rz + 0.1, scale=0.5, col=GLOW["red"])
    cx, cz, ch = 375.0, -66.0, 30.0
    cylinder(k("trim"), cx, cz, GY, ch, 1.15, segs=10, col=K.TANK_WHITE, cap=True)
    for py in (13.0, 19.0, 25.0):
        inner, outer = K.ring_pts(cx, cz, 1.15, 10, py), K.ring_pts(cx, cz, 2.2, 10, py)
        for i in range(10):
            i2 = (i + 1) % 10
            K.both(k("metal"), (inner[i], inner[i2], outer[i2], outer[i]))
            K.rail(outer[i], outer[i2], detail=1, posts=9.0, lamps=K.SODIUM if i % 3 == 0 else None)
    K.ladder(cx + 1.17, cz, GY + 2.5, 25.0, PI / 2)
    cylinder(k("metal"), cx, cz, ch, ch + 2.2, 0.25, segs=6)
    box(k("glow"), cx - 0.12, cx + 0.12, ch + 2.2, ch + 2.5, cz - 0.12, cz + 0.12, scale=0.5, col=GLOW["red"])
    K.steam(cx, ch + 2.6, cz)
    K.bullet(346.5, 357.5, -52.0, 1.3, K.RUST, y=levels[0] + 1.75, base=levels[0])
    for z in (-49.0, -51.6):
        K.bullet(361.0, 371.0, z, 0.75, K.STEEL_BLUE, y=GY + 1.7)
    # The heater: a rust box on legs, burners glowing along its foot, its
    # own stack up through the frame.
    box(k("trim"), 345.2, 351.6, 1.6, 10.2, -69.0, -59.2, scale=1.0, col=K.RUST_D, bottom=True)
    for z in (-67.8, -65.6, -63.4, -61.2):
        quad(k("glow"), (351.63, 2.0, z + 0.7), (351.63, 2.0, z - 0.7), (351.63, 2.5, z - 0.7), (351.63, 2.5, z + 0.7), col=K.HOT)
        quad(k("glow"), (345.17, 2.0, z - 0.7), (345.17, 2.0, z + 0.7), (345.17, 2.5, z + 0.7), (345.17, 2.5, z - 0.7), col=K.HOT)
    quad(k("glow"), (345.6, 2.0, -59.17), (351.2, 2.0, -59.17), (351.2, 2.35, -59.17), (345.6, 2.35, -59.17), col=K.HOT)
    for (lx, lz) in ((345.5, -68.7), (351.3, -68.7), (345.5, -59.5), (351.3, -59.5)):
        K.column(lx, lz, GY, 1.7, t=0.3)
    cylinder(k("trim"), 348.4, -64.0, 10.2, 22.0, 0.8, segs=8, col=K.RUST, cap=True)
    K.steam(348.4, 22.4, -64.0)
    K.wash(X0 + 1.0, X1 - 1.0, Z0 + 1.0, Z1 - 1.0, level=0.8, red=0.5, r=r)
    K.wash(343.0, 353.0, -69.0, -58.0, level=0.4, hue="red", r=r)
    K.collide(X0, X1, Z0, Z1, levels[2])
    # Two men on the first deck, one at the rail of the second.
    stand(366.0, -47.2, 0.0, "lean", levels[0])
    stand(358.4, -50.0, PI / 2, "talk", levels[0])
    stand(359.6, -49.6, -PI / 2, "talk", levels[0])
    stand(372.0, -52.8, 0.0, "idle", levels[1])


def plant():
    r = R(8631)
    K.paved(304.0, 428.0, -84.0, -10.0)
    K.rack(308.0, -81.6, 418.0, -81.6)
    frame(r)
    # Behind the frame, the reactor hall: a long rust wall the sodium lamps
    # light, the frame's steel dark in front of it.
    out = K.shed(344.0, 380.0, -78.4, -71.0, 18.0, K.CREAM, r, faces={
        "+z": dict(band=(13.6, 15.8), style=3, lit=(0.5, 0.85), dress=False),
        "-z": dict(band=(13.6, 15.8), style=3, lit=(0.4, 0.7)), "+x": dict(dress=False), "-x": dict(dress=False)}, tint="rust", stripe_col=K.OXIDE)
    K.flat_roof(344.0, 380.0, -78.4, -71.0, 18.0, r, wall=K.CREAM, lights=0.0, plant=False, breathe=2)
    K.wash(344.0, 380.0, -70.2, -70.2, level=1.0, red=0.3, step=3.5)
    for x in (349.0, 356.0, 363.0, 370.0, 376.0):
        box(k("neon_amber"), x - 0.7, x + 0.7, 10.3, 10.42, -70.9, -70.76, scale=0.5, bottom=True)
    K.wash(346.0, 378.0, -79.6, -79.6, level=0.6, red=0.3)
    # The boiler house east of it, a duct to the main stack, the second
    # stack, the flare at the gate.
    out = K.shed(386.0, 410.0, -76.0, -56.0, 13.6, K.SAND, r, faces={
        "+z": dict(band=(9.6, 11.8), style=3, lit=(0.55, 0.9), docks=dict(n=2, s0=3.0, s1=15.0, raised=False, canopy=False, half=(0,), first=31)),
        "+x": dict(band=(9.6, 11.8), style=3, lit=(0.4, 0.7)), "-z": dict(band=(9.6, 11.8), style=3), "-x": dict(dress=False)}, tint="rust")
    K.flat_roof(386.0, 410.0, -76.0, -56.0, 13.6, r, wall=K.SAND, lights=0.35, breathe=1)
    K.stack(403.0, -49.0, 38.0, 2.3, 1.5, K.RUST, lit=7.0)
    box(k("trim"), 402.0, 404.0, 8.0, 10.0, -56.0, -50.6, scale=1.0, col=K.RUST_D, bottom=True)
    K.stack(416.5, -62.0, 29.0, 1.5, 1.0, K.TANK_WHITE, band_col=K.OXIDE, lit=6.0)
    box(k("trim"), 410.0, 415.4, 6.0, 7.4, -62.7, -61.3, scale=1.0, col=K.RUST_D, bottom=True)
    K.flare(420.4, -73.0, 31.0)
    # Bullets in a bund on the west, the rack up to the cooling cells.
    for (a0, a1, b0, b1) in ((308.0, 336.0, -78.0, -77.7), (308.0, 336.0, -54.3, -54.0), (308.0, 308.3, -78.0, -54.0), (335.7, 336.0, -78.0, -54.0)):
        box(k("concrete"), a0, a1, 0.0, 1.0, b0, b1, scale=2.0)
    for z, col in ((-73.6, K.TANK_WHITE), (-66.0, K.TANK_WHITE), (-58.4, K.RUST)):
        K.bullet(311.0, 333.0, z, 2.1, col)
        K.run([(333.0, 3.3, z), (338.4, 3.3, z), (338.4, 5.6, z)], r=0.14, col=K.YELLOW, detail=1)
        box(k("glow"), 322.0 - 0.1, 322.0 + 0.1, 5.5, 5.75, z - 0.1, z + 0.1, scale=0.5, col=GLOW["cyan"])
    K.catwalk(311.0, -62.2, 333.0, -62.2, 5.5, w=1.1, lamps=None, detail=1)
    K.stair((309.2, GY, -62.2), (311.0, 5.5, -62.2), detail=1)
    K.rack(340.0, -80.0, 340.0, -36.0, levels=(5.4,), width=2.4, pipes=((-0.7, 0, 0.3, K.STEEL_BLUE), (0.2, 0, 0.3, K.STEEL_BLUE), (0.9, 0, 0.12, K.YELLOW)))
    # The cooling cells on the south street: three cells, a fan stack on
    # each breathing steam into the sodium light.
    for i in range(3):
        x0 = 308.0 + i * 10.0
        box(k("concrete"), x0, x0 + 10.0, 0.0, 2.2, -34.0, -16.0, scale=2.0)
        for f in B.faces_of(x0 + 0.3, x0 + 9.7, -33.7, -16.3).values():
            f.quad(k("door_panel"), 0.0, f.width, 2.2, 4.6, 0.0)
            f.quad(k("trim"), 0.0, f.width, 4.6, 8.4, 0.0, col=K.CREAM)
            f.box(k("trim"), -0.1, f.width + 0.1, 4.5, 4.75, 0.0, 0.14, col=K.shade(K.CREAM, 0.6))
        box(k("metal"), x0, x0 + 10.0, 8.4, 9.0, -34.0, -16.0, scale=1.0, bottom=True)
        cx, cz = x0 + 5.0, -25.0
        cylinder(k("trim"), cx, cz, 9.0, 11.8, 3.3, segs=14, col=K.GREY, cap=False)
        cylinder(k("dark"), cx, cz, 11.2, 11.3, 3.2, segs=14)
        for dx, dz in ((0.0, 0.0), (1.4, 1.0), (-1.2, -0.8)):
            K.steam(cx + dx, 12.0, cz + dz, lit=4.0)
        box(k("neon_amber"), cx - 0.8, cx + 0.8, 7.6, 7.72, -16.02, -15.9, scale=0.5, bottom=True)
    K.collide(308.0, 338.0, -34.0, -16.0, 9.0)
    K.catwalk(308.0, -15.2, 338.0, -15.2, 4.7, w=1.3, rails=(False, True))
    K.stair((306.6, GY, -15.2), (308.0, 4.7, -15.2), w=1.0, detail=0)
    for i in range(3):
        x0 = 308.0 + i * 10.0
        K.digits(str(i + 1), x0 + 2.2, 6.6, -16.26, 2.0, 0.0, k("trim", 1), K.OXIDE, out=0.04)
        K.run([(x0 + 7.2, 0.4, -15.4), (x0 + 7.2, 8.8, -15.4), (x0 + 7.2, 8.8, -17.0)], r=0.26, col=K.STEEL_BLUE)
        K.run([(x0 + 8.2, 0.4, -15.5), (x0 + 8.2, 4.2, -15.5)], r=0.14, col=K.RUST, detail=1)
        quad(k("door"), (x0 + 4.4, 4.7, -16.24), (x0 + 5.5, 4.7, -16.24), (x0 + 5.5, 6.8, -16.24), (x0 + 4.4, 6.8, -16.24))
        box(k("neon_amber"), x0 + 4.5, x0 + 5.4, 6.95, 7.03, -16.2, -16.05, scale=0.5, bottom=True)
        for xx in (x0 + 1.0, x0 + 9.0):
            K.column(xx, -14.6, GY, 4.7, t=0.16, mat="metal")
        box(k("hazard", 1), x0 + 0.3, x0 + 9.7, 2.2, 2.4, -16.28, -16.24, scale=1.0)
    stand(322.0, -15.0, 0.0, "lean", 4.7)
    stand(312.4, -15.2, PI / 2, "idle", 4.7)
    for (a, b) in (((308.0, -34.0), (338.0, -34.0)), ((308.0, -16.0), (338.0, -16.0)), ((308.0, -34.0), (308.0, -16.0)), ((338.0, -34.0), (338.0, -16.0))):
        K.rail((a[0], 9.0, a[1]), (b[0], 9.0, b[1]), detail=1)
    K.stair((339.0, GY, -30.0), (339.0, 9.0, -18.0), detail=1)
    K.run([(340.0, 5.7, -36.0), (340.0, 5.7, -34.6), (340.0, 3.0, -34.6), (337.0, 3.0, -34.6)], r=0.3, col=K.STEEL_BLUE)
    # Between the bullets and the cells: a switch room, drums, totes.
    K.shed(312.0, 326.0, -50.0, -40.0, 4.4, K.GREY, r, faces={"+x": dict(docks=dict(n=1, s0=2.0, s1=7.0, raised=False, canopy=False, first=40))})
    K.flat_roof(312.0, 326.0, -50.0, -40.0, 4.4, r, wall=K.GREY, lights=0.5)
    scatter(r, 328.0, 336.0, -50.0, -38.0, 5)
    # The control building on the corner: three storeys of lit office
    # windows over a lobby, the generator's own.
    lot = B.Lot(388.0, 424.0, -36.0, -10.8, "+z", {"+z": "street", "+x": "open", "-x": "open", "-z": "back"}, {}, D)
    B.building(lot, 11.4, r, style=dict(STYLE, windows=(2, 5), lit=(0.55, 0.85), signs=1.2, fire_escape=0.0, awning=0.5, shop_sign=0.9),
               ground="shops", tint="concrete")
    stand(396.0, -9.4 - 0.9, 0.0, "smoke")
    stand(410.6, -10.2, 0.4, "talk")
    stand(411.6, -9.8 - 0.5, -2.2, "talk")
    # Fences along both streets; the yard's lamps and floods.
    K.low_wall(312.8, -12.4, 388.0, -12.4)
    K.low_wall(425.8, -83.2, 425.8, -10.8)
    K.low_wall(424.0, -10.8, 425.8, -10.8, lamps=0)
    K.verge(r, 314.0, -11.2, 386.0, -11.2, step=7.0)
    K.verge(r, 426.9, -82.0, 426.9, -12.0, step=7.0)
    for x in (392.0, 404.0, 416.0):
        P.place("bench", x, GY, -10.3, 0.0, district=D)
    P.place("food_box", 398.4, GY, -10.3, 0.0, district=D)
    P.place("bin", 409.0, GY, -10.3, district=D)
    K.run([(332.45, 7.2, 13.8), (332.45, 7.2, 15.4), (332.45, 0.5, 15.4)], r=0.3, col=K.STEEL_BLUE)
    box(k("metal"), 331.4, 334.6, GY, GY + 1.1, 15.0, 17.0, scale=1.0)
    mast(342.0, -43.0, PI * 0.9, red=0.3)
    mast(383.0, -44.0, -PI * 0.85, red=0.3)
    mast(424.5, -44.0, -PI * 0.5)
    mast(306.5, -56.0, PI * 0.5)
    for x in (350.0, 372.0):
        strip(x, -14.4, PI)
    for z in (-70.0, -52.0):
        strip(424.6, z, -PI / 2)
    K.wash(386.0, 410.0, -54.8, -54.8, level=0.75, red=0.4)
    K.wash(411.2, 411.2, -76.0, -56.0, level=0.6, red=0.3)
    K.ring_wash(403.0, -49.0, 4.0, 0.0, PI * 2, level=0.8, red=0.4)
    K.ring_wash(416.5, -62.0, 3.2, 0.0, PI * 2, level=0.8, red=0.3)
    K.wash(308.0, 338.0, -14.8, -14.8, level=0.95, step=3.5)
    K.wash(308.0, 338.0, -35.4, -35.4, level=0.5, red=0.3)
    K.wash(310.0, 334.0, -76.0, -56.0, level=0.55, step=6.0)
    scatter(r, 384.0, 400.0, -46.0, -40.0, 4)
    scatter(r, 412.0, 424.0, -56.0, -40.0, 4)
    K.bridge(333.0, -13.8, 333.0, 13.8)
    K.run([(332.45, 7.2, -13.8), (332.45, 7.2, -15.4), (332.45, 0.4, -15.4)], r=0.3, col=K.STEEL_BLUE)
    K.vent(360.0, -11.3)
    K.vent(427.0, -46.0)
    # People: on the cells' deck, at the boiler house door, smokers at the
    # control building's side door, one by the bullets.
    stand(337.2, -24.0, PI / 2, "lean", 9.0)
    stand(392.6, -54.4, 0.0, "idle")
    stand(424.8, -30.0, PI / 2, "smoke")
    stand(425.0, -31.4, 0.3, "talk")
    stand(309.4, -52.4, 0.0, "phone")
    stand(330.0, -44.0, PI, "sit", GY + 0.9)


# ---------------------------------------------------------------------------
# South-west: two warehouses on the south street, a cold store behind a
# dock forecourt and a sawtooth shed with its office on the pavement.
# ---------------------------------------------------------------------------
def depot():
    r = R(8641)
    K.paved(176.0, 296.0, -84.0, -36.0)
    K.asphalt(176.0, 242.0, -36.0, -10.0)
    K.paved(242.0, 296.0, -36.0, -10.0)
    # The cold store: pale green, a dark band of windows, docks on a
    # forecourt, a steel stair up its east wall (mH2wmyeiIpA@43).
    out = K.shed(180.0, 236.0, -78.0, -36.0, 9.4, K.PALE_GREEN, r, faces={
        "+z": dict(band=(7.4, 8.6), style=5, lit=(0.35, 0.6), docks=dict(n=6, s0=5.0, s1=47.0, first=1, open=(1, 4), half=(3,))),
        "-z": dict(band=(6.2, 8.2), style=5, lit=(0.3, 0.55)), "-x": dict(band=(6.2, 8.2), style=5), "+x": dict(band=(6.2, 8.2), style=5, doors=False)},
        tint="teal")
    K.flat_roof(180.0, 236.0, -78.0, -36.0, 9.4, r, wall=K.PALE_GREEN, lights=0.7, breathe=2)
    plat = out.get("+z", GY)
    K.stair((237.0, GY, -44.0), (237.0, 6.0, -56.0), w=1.1, detail=0)
    K.deck(236.0, 238.0, -58.2, -56.0, 6.0)
    K.rail((238.0, 6.0, -58.2), (238.0, 6.0, -56.0), detail=0)
    quad(k("door"), (236.03, 6.0, -56.4), (236.03, 6.0, -57.6), (236.03, 8.1, -57.6), (236.03, 8.1, -56.4))
    box(k("glow"), 236.05, 236.2, 8.25, 8.4, -57.2, -56.8, scale=0.5, col=GLOW["cyan"])
    light(D, 237.0, 6.0, -57.0, "cyan", 2.4)
    K.wash(185.0, 227.0, -34.6, -33.0, level=0.85)
    for i in (0, 2, 5):
        x = 180.0 + 5.0 + (i + 0.5) * 7.0
        P.place("trailer", x, GY, -36.0 + 2.6 + 6.5, PI / 2, district=D)
    for i in range(7):
        x = 185.0 + i * 7.0
        K.stripe(x - 0.06, x + 0.06, -33.0, -18.0, K.PAINT_WHITE)
    P.place("forklift", 199.0, plat, -34.6, 0.4, district=D)
    P.place("crates", 213.0, plat, -34.8, 0.9, district=D)
    P.place("crates", 195.0, plat, -34.9, 2.0, district=D)
    stand(192.4, -34.7, 0.0, "idle", plat)
    stand(214.4, -34.4, 0.3, "phone", plat)
    stand(206.2, -34.6, PI / 2, "talk", plat)
    stand(207.4, -34.5, -PI / 2, "talk", plat)
    stand(230.6, -20.0, PI, "smoke")
    K.roof_sign(208.0, 9.4 + 0.8, -38.4, PI * 0.06, sizes=("pm", "pm", "bx", "pm"), scale=1.7)
    fc_ = B.faces_of(180.0, 236.0, -78.0, -36.0)
    K.stencil(fc_["+z"], 52.0, 4.6, "02", h=2.6, wall=K.PALE_GREEN)
    K.stencil(fc_["-z"], 8.0, 4.0, "02", wall=K.PALE_GREEN)
    K.post_sign(218.6, -14.6, -PI * 0.2, y=3.6, size="pm", scale=1.2)
    # Its forecourt's fence on the street and its gate, open.
    K.fence(176.2, -12.4, 204.0, -12.4)
    K.gate(204.4, -12.4, 213.6, -12.4, (0, -1), open_=True)
    K.fence(222.4, -12.4, 246.0, -12.4)
    K.verge(r, 178.0, -11.2, 244.0, -11.2, step=7.0)
    mast(178.0, -14.6, PI * 0.75)
    mast(240.0, -14.6, -PI * 0.75)
    scatter(r, 228.0, 240.0, -32.0, -14.0, 4)
    # The sawtooth shed: its office front on the pavement, its lights
    # facing east so the street sees every tooth.
    out = K.shed(246.0, 290.0, -78.0, -11.2, 8.0, K.GREY, r, faces={
        "+z": dict(band=(5.4, 7.2), style=2, lit=(0.5, 0.8), office=(4.0, 36.0)),
        "+x": dict(band=(5.6, 7.0), style=6, docks=dict(n=4, s0=10.0, s1=42.0, raised=False, canopy=False, first=11, open=(1,), half=(3,))),
        "-z": dict(band=(5.6, 7.0), style=6, docks=dict(n=2, s0=8.0, s1=22.0, raised=False, canopy=False, first=15)),
        "-x": dict(band=(5.6, 7.0), style=6)}, stripe_col=K.YELLOW)
    K.sawtooth(246.0, 290.0, -78.0, -11.2, 8.0, 7, "+x", r, wall=K.GREY, rise=2.8, lit=0.75)
    K.wash(250.0, 286.0, -10.0, -10.0, level=0.5)
    fs2 = B.faces_of(246.0, 290.0, -78.0, -11.2)
    K.blade(fs2["+z"], 1.2, 3.4, "bl", scale=0.9)
    K.blade(fs2["+z"], 42.6, 4.4, "bm", scale=1.0)
    K.stencil(fs2["+z"], 39.6, 3.2, "03", h=2.6, wall=K.GREY)
    K.stencil(fs2["+x"], 5.0, 3.6, "03", wall=K.GREY)
    K.wash(291.4, 291.4, -70.0, -20.0, level=0.6)
    door = out.get("+z_door")
    if door:
        P.place("vending", door[0] + 3.4, GY, -10.75, 0.0, district=D)
        P.place("vending_warm", door[0] + 4.5, GY, -10.75, 0.0, district=D)
        stand(door[0] - 2.2, -10.6, 0.3, "lean")
    P.place("forklift", 293.0, GY, -56.0, -PI / 2, district=D)
    stand(293.4, -52.6, -PI / 2, "idle")
    scatter(r, 291.0, 295.0, -44.0, -24.0, 3, kinds=("drum_pallet", "tote", "crates"))
    # The lane between the two, and the apron behind them on the estate
    # road: lamps, skips, pallets, a pipe bridge from shed to shed.
    for z in (-70.0, -44.0):
        strip(241.0, z, PI / 2 if z < -50 else -PI / 2, power=6.0, cone=False)
    K.run([(236.0, 7.0, -64.0), (246.0, 7.0, -64.0)], r=0.18, col=K.RUST)
    K.run([(236.0, 7.5, -63.4), (246.0, 7.5, -63.4)], r=0.1, col=K.YELLOW)
    scatter(r, 237.0, 245.0, -76.0, -40.0, 5, kinds=("dumpster", "crates", "bags", "drum_pallet", "tyres"))
    scatter(r, 182.0, 290.0, -83.0, -79.5, 8)
    for x in (200.0, 262.0):
        P.place("c40_blue" if x < 230 else "c40_red", x, GY, -81.2, 0.0, district=D)
    stand(205.4, -79.6, 0.0, "sit", GY + 0.9)
    K.fence(290.0, -12.4, 295.2, -12.4)


# ---------------------------------------------------------------------------
# The south street's south side, west to east.
# ---------------------------------------------------------------------------
def pylon(cx, cz, yaw, h=13.4):
    """The fuel price pylon: a black slab, five rows of amber numerals on
    both faces, a strip of light round its head (mH2wmyeiIpA@100)."""
    nx, nz = math.sin(yaw), math.cos(yaw)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    oriented_box(k("board_frame"), cx, h / 2, cz, 3.0, h, 0.7, yaw, scale=1.0)
    oriented_box(k("metal"), cx, 0.4, cz, 3.6, 0.8, 1.2, yaw, scale=1.0)
    oriented_box(k("neon_amber"), cx, h + 0.12, cz, 3.1, 0.2, 0.8, yaw, scale=1.0)
    prices = ("0980", "1040", "1125", "1190", "0745")
    for face, fy in ((1, yaw), (-1, yaw + PI)):
        ox, oz = cx + nx * 0.36 * face, cz + nz * 0.36 * face
        for i, p in enumerate(prices):
            y = h - 2.6 - i * 2.0
            K.digits(p, ox + rx * 0.42 * face, y, oz + rz * 0.42 * face, 1.05, fy, k("glow"), K.SODIUM, out=0.0, gap=0.2)
            # The grade's name beside it, as a row of short strokes.
            for q, wq in enumerate((0.34, 0.2, 0.28)):
                rotated_quad(k("glow"), ox - rx * 1.1 * face, y + 0.3 - q * 0.3, oz - rz * 1.1 * face, wq + 0.2, 0.12, fy, col=K.shade(K.SODIUM, 0.8))
        # The mark at its head: a lit lozenge, no words.
        for (du, dv, w_, h_) in ((0.0, 0.0, 1.5, 0.22), (0.0, 0.34, 1.0, 0.22), (0.0, -0.34, 1.0, 0.22)):
            rotated_quad(k("glow"), ox + rx * du * face, h - 1.0 + dv, oz + rz * du * face, w_, h_, fy, col=GLOW["red"])
    box(k("glow"), cx - 0.12, cx + 0.12, h + 0.22, h + 0.5, cz - 0.12, cz + 0.12, scale=0.5, col=GLOW["red"])
    K.wash(cx - 3.0, cx + 3.0, cz - 2.0, cz + 2.0, level=0.7, step=3.0)
    K.collide(cx - 1.6, cx + 1.6, cz - 1.0, cz + 1.0, h)


def fuel():
    r = R(8651)
    K.asphalt(108.0, 178.0, 12.0, 45.0)
    # The canopy: a slab on six columns over three islands, its underside
    # lit white, an amber line round its fascia.
    CX0, CX1, CZ0, CZ1, CY = 128.0, 166.0, 17.0, 31.0, 5.5
    box(k("trim"), CX0, CX1, CY, CY + 0.8, CZ0, CZ1, scale=1.0, col=K.TANK_WHITE, bottom=True)
    walls(k("neon_amber"), [(CX0 - 0.05, CZ1 + 0.05), (CX1 + 0.05, CZ1 + 0.05), (CX1 + 0.05, CZ0 - 0.05), (CX0 - 0.05, CZ0 - 0.05)], CY + 0.56, CY + 0.7, (1, 1, 1, 1))
    walls(k("trim"), [(CX0 - 0.04, CZ1 + 0.04), (CX1 + 0.04, CZ1 + 0.04), (CX1 + 0.04, CZ0 - 0.04), (CX0 - 0.04, CZ0 - 0.04)], CY + 0.1, CY + 0.42, K.OXIDE)
    quad(k("roof"), (CX0, CY + 0.81, CZ1), (CX1, CY + 0.81, CZ1), (CX1, CY + 0.81, CZ0), (CX0, CY + 0.81, CZ0))
    for ix in (134.0, 147.0, 160.0):
        box(k("concrete"), ix - 0.7, ix + 0.7, GY, GY + 0.2, 19.0, 29.0, scale=1.0)
        for z in (20.2, 27.8):
            K.column(ix, z, GY, CY, t=0.42, mat="trim", col=K.TANK_WHITE)
            cylinder(k("hazard", 1), ix, z + (1.6 if z > 24 else -1.6), GY, GY + 1.1, 0.14, segs=8)
        for z in (22.4, 25.6):
            P.place("pump", ix, GY + 0.2, z, 0.0, district=D)
            for sd in (1, -1):
                xq = ix + 0.315 * sd
                K.quad_n(k("glow"), ((xq, GY + 1.3, z - 0.4), (xq, GY + 1.3, z + 0.4), (xq, GY + 1.9, z + 0.4), (xq, GY + 1.9, z - 0.4)), (sd, 0, 0), K.shade(K.GLASS_COOL, 2.2))
                K.quad_n(k("glow"), ((xq, GY + 0.95, z - 0.3), (xq, GY + 0.95, z + 0.3), (xq, GY + 1.15, z + 0.3), (xq, GY + 1.15, z - 0.3)), (sd, 0, 0), K.SODIUM)
        for z in (21.0, 24.0, 27.0):
            box(k("neon_white"), ix - 2.6, ix - 1.4, CY - 0.06, CY, z - 0.25, z + 0.25, scale=0.5, bottom=True)
            box(k("neon_white"), ix + 1.4, ix + 2.6, CY - 0.06, CY, z - 0.25, z + 0.25, scale=0.5, bottom=True)
    K.wash(CX0 + 1.0, CX1 - 1.0, CZ0 + 1.0, CZ1 - 1.0, level=0.9, hue="white")
    K.collide(CX0, CX1, CZ0, CZ1, CY + 0.8, y0=CY)
    # The kiosk behind it: a shop the whole width, lit, a canopy over its
    # door.
    lot = B.Lot(138.0, 170.0, 36.0, 44.6, "-z", {"-z": "street", "+z": "back", "-x": "open", "+x": "open"}, {}, D)
    B.building(lot, 5.6, r, style=dict(STYLE, awning=0.0, shop_sign=1.0, signs=0.0, canopy=1.0, roof_cap=2.4, pipes=0.0, cornice=1.0), ground="shops", tint="concrete")
    # The pylon on the x 120 road's axis, turned to the street; a hoarding
    # on a mast at the east end, turned to the cars coming from the plant.
    pylon(121.2, 15.0, PI * 0.62)
    cylinder(k("metal"), 173.4, 41.0, GY, 11.6, 0.4, segs=8)
    B.billboard(D, 173.4 + 0.5, 14.2, 41.0 - 0.3, 10.0, 5.0, PI * 0.36, r, depth=0.5)
    for dx in (-3.6, 3.6):
        box(k("neon_white"), 173.4 + dx - 0.5, 173.4 + dx + 0.5, 11.3, 11.4, 39.6, 39.9, scale=0.5, bottom=True)
    # The yard's back wall, pasted with boards; what a forecourt keeps.
    K.yard_wall(108.4, 44.8, 138.0, 44.8, r=r, posters=0.8, face=-1)
    K.yard_wall(170.0, 44.8, 178.0, 44.8, r=r, face=-1)
    P.place("vending", 137.4, GY, 38.4, -PI / 2, district=D)
    P.place("vending_warm", 137.4, GY, 39.6, -PI / 2, district=D)
    P.place("phone_booth", 111.6, GY, 41.0, PI / 2, district=D)
    P.place("tyres", 171.2, GY, 37.2, 0.0, district=D)
    P.place("tyres", 172.1, GY, 37.6, 0.6, district=D)
    P.place("tote", 172.6, GY, 43.4, 0.0, district=D)
    for x, z in ((126.6, 33.0), (168.0, 33.6), (150.0, 35.2)):
        P.place("bin", x, GY, z, district=D)
    # The air and water post, its lamp.
    box(k("metal"), 124.0, 124.8, GY, GY + 1.5, 36.0, 36.6, scale=0.6)
    box(k("glow"), 124.1, 124.7, GY + 1.5, GY + 1.75, 36.05, 36.55, scale=0.5, col=GLOW["cyan"])
    light(D, 124.4, 1.6, 35.0, "cyan", 2.6)
    # A food counter at the west end, under a dyed awning with lanterns:
    # where the drivers eat.
    box(k("trim"), 112.0, 118.0, GY, GY + 1.05, 38.6, 39.4, scale=1.0, col=K.WOOD)
    box(k("trim"), 112.0, 118.0, GY, GY + 2.6, 42.6, 43.0, scale=1.0, col=K.RUST_D)
    for x in (112.1, 117.9):
        K.column(x, 38.4, GY, 2.7, t=0.1, mat="metal")
    dye = (1.0, 0.45, 0.12, 1.0)
    pts = ((112.0, 2.9, 43.0), (118.0, 2.9, 43.0), (118.0, 2.5, 37.6), (112.0, 2.5, 37.6))
    quad(k("awning", 1), pts[3], pts[2], pts[1], pts[0], col=dye)
    quad(k("awning", 1), *pts, col=dye)
    box(k("neon_amber"), 112.0, 118.0, 2.42, 2.5, 37.56, 37.62, scale=1.0)
    for x in (113.0, 114.4, 115.8, 117.2):
        P.place("lantern", x, 2.1, 37.9, district=D)
    K.wash(112.0, 118.0, 37.0, 40.0, level=0.7, red=0.3, step=3.0)
    for x in (113.2, 116.6):
        P.place("crates", x, GY, 36.6, 0.3 * x, district=D)
    # People: a vendor behind the counter and two eating, one at a pump on
    # the phone, two at the kiosk door, one squatting by the air post.
    stand(115.0, 40.6, PI, "vendor")
    stand(113.6, 37.9, 0.0, "idle")
    stand(116.6, 36.3, 0.0, "sit", GY + 1.1)
    stand(145.6, 24.0, PI / 2, "phone")
    stand(151.0, 34.6, 0.6, "talk")
    stand(152.2, 34.8, -1.9, "talk")
    stand(125.6, 36.4, -PI / 2, "squat")
    stand(169.0, 35.0, PI, "smoke")


def street_shed():
    """The sawtooth shed on the south side: roller doors straight on the
    street's apron, its teeth in profile down the street."""
    r = R(8661)
    K.paved(178.0, 260.0, 12.0, 45.0)
    out = K.shed(182.0, 256.0, 16.0, 44.0, 8.0, K.CREAM, r, faces={
        "-z": dict(band=(5.6, 7.2), style=6, lit=(0.35, 0.65), office=(52.0, 70.0),
                   docks=dict(n=5, s0=6.0, s1=46.0, raised=False, canopy=False, first=1, open=(1,), half=(3,))),
        "+z": dict(dress=False), "-x": dict(band=(5.6, 7.2), style=6, posters=0.3), "+x": dict(band=(5.6, 7.2), style=6)}, stripe_col=K.STEEL_BLUE)
    K.sawtooth(182.0, 256.0, 16.0, 44.0, 8.0, 8, "+x", r, wall=K.CREAM, rise=3.0, lit=0.8)
    K.wash(184.0, 254.0, 14.4, 14.4, level=0.55)
    fs1 = B.faces_of(182.0, 256.0, 16.0, 44.0)
    K.blade(fs1["-z"], 0.8, 3.6, "bl", scale=0.9)
    K.blade(fs1["-z"], 50.4, 4.2, "bm")
    K.stencil(fs1["-z"], 3.4, 3.4, "05", h=2.8, wall=K.CREAM)
    K.stencil(fs1["+x"], 14.0, 4.0, "05", wall=K.CREAM)
    K.roof_sign(196.0, 8.0 + 1.6, 30.0, PI * 0.92, sizes=("ps", "pm", "ps"), scale=2.0, lift=2.2)
    for x in (188.0, 212.0, 236.0):
        cylinder(k("hazard", 1), x, 13.0, GY, GY + 1.1, 0.14, segs=8)
    P.place("forklift", 240.5, GY, 14.2, PI, district=D)
    stand(238.4, 14.6, PI, "idle")
    stand(243.0, 14.9, PI * 0.8, "talk")
    stand(244.0, 14.0, -PI * 0.3, "talk")
    scatter(r, 216.0, 232.0, 13.2, 15.0, 3, kinds=("crates", "drum_pallet", "tote"))
    K.yard_wall(178.0, 44.8, 260.0, 44.8, r=r, face=-1)
    for z in (20.0, 36.0):
        strip(259.0, z, -PI / 2, power=6.0, cone=False)
    scatter(r, 257.0, 259.6, 18.0, 42.0, 4, kinds=("dumpster", "crates", "tyres", "bags"))


def container_yard():
    """Stacks of containers under an orange portal gantry, a box in its
    grab (JtqIas3bYhg@80, x4ztgjvfU60@38)."""
    r = R(8662)
    K.asphalt(260.0, 340.0, 12.0, 45.0)
    names = ("c40_red", "c40_red", "c40_rust", "c40_blue", "c40_green")
    for i in range(6):
        cx = 264.0 + 6.1 + i * 12.6
        for j in range(8):
            cz = 20.4 + j * 2.84
            hi = (3 + (r.random() < 0.5)) if j >= 5 else (r.randrange(1, 4) if j >= 2 else r.randrange(0, 3))
            if i in (2, 3):
                hi = max(0, hi - 1) if j >= 2 else 0
            for n in range(hi):
                if r.random() < 0.12:
                    for dx in (-3.07, 3.07):
                        P.place("c20_grey", cx + dx, GY + n * 2.6, cz, 0.0, district=D)
                else:
                    P.place(r.choice(names), cx, GY + n * 2.6, cz, 0.0 if r.random() < 0.8 else PI, district=D)
    # The gantry: two legs a side on rails along the yard, twin girders
    # across it, the trolley and its cab, a box hanging in the grab.
    GX, Z0, Z1, TOP = 301.0, 15.4, 43.6, 16.0
    for z in (Z0, Z1):
        box(k("metal", 1), 262.0, 338.0, GY, GY + 0.12, z - 0.12, z + 0.12, scale=1.0)
        for x in (GX - 4.0, GX + 4.0):
            K.column(x, z, GY + 0.1, TOP - 1.4, t=0.7, mat="trim", col=K.GANTRY)
            box(k("trim"), x - 0.9, x + 0.9, GY + 0.1, GY + 0.9, z - 0.5, z + 0.5, scale=1.0, col=K.shade(K.GANTRY, 0.7))
        box(k("trim"), GX - 4.6, GX + 4.6, TOP - 2.2, TOP - 1.4, z - 0.4, z + 0.4, scale=1.0, col=K.GANTRY, bottom=True)
        K.brace((GX - 4.0, GY + 1.0, z), (GX, TOP - 2.2, z), r=0.18, mat="trim", col=K.GANTRY)
        K.brace((GX + 4.0, GY + 1.0, z), (GX, TOP - 2.2, z), r=0.18, mat="trim", col=K.GANTRY)
    for x in (GX - 2.6, GX + 2.6):
        box(k("trim"), x - 0.5, x + 0.5, TOP - 1.4, TOP, Z0 - 2.2, Z1 + 1.2, scale=1.0, col=K.GANTRY, bottom=True)
        K.rail((x - 0.5 if x < GX else x + 0.5, TOP, Z0 - 2.0), (x - 0.5 if x < GX else x + 0.5, TOP, Z1 + 1.0), detail=1)
    tz = 28.2
    box(k("trim"), GX - 3.2, GX + 3.2, TOP, TOP + 1.6, tz - 2.2, tz + 2.2, scale=1.0, col=K.shade(K.GANTRY, 0.8))
    box(k("trim"), GX + 1.0, GX + 3.4, TOP - 4.2, TOP - 1.6, tz + 2.4, tz + 4.6, scale=1.0, col=K.GREY, bottom=True)
    quad(k("glow"), (GX + 0.98, TOP - 3.6, tz + 2.6), (GX + 0.98, TOP - 3.6, tz + 4.4), (GX + 0.98, TOP - 2.2, tz + 4.4), (GX + 0.98, TOP - 2.2, tz + 2.6), col=K.shade(K.GLASS_COOL, 1.6))
    quad(k("glow"), (GX + 1.2, TOP - 3.6, tz + 2.38), (GX + 3.2, TOP - 3.6, tz + 2.38), (GX + 3.2, TOP - 2.2, tz + 2.38), (GX + 1.2, TOP - 2.2, tz + 2.38), col=K.shade(K.GLASS_COOL, 1.6))
    box(k("trim"), GX - 6.1, GX + 6.1, 9.2, 9.5, tz - 1.25, tz + 1.25, scale=1.0, col=K.YELLOW, bottom=True)
    for sx in (-5.6, 5.6):
        for sz in (-1.0, 1.0):
            K.both(k("dark", 1), ((GX + sx * 0.3 - 0.03, TOP - 1.4, tz + sz), (GX + sx * 0.3 + 0.03, TOP - 1.4, tz + sz), (GX + sx + 0.03, 9.5, tz + sz), (GX + sx - 0.03, 9.5, tz + sz)))
    P.place("c40_blue", GX, 6.6, tz, 0.0, district=D)
    for z in (Z0 + 3.0, tz - 6.0, tz + 8.0, Z1 - 3.0):
        for x in (GX - 2.6, GX + 2.6):
            box(k("neon_white"), x - 0.4, x + 0.4, TOP - 1.52, TOP - 1.4, z - 0.3, z + 0.3, scale=0.5, bottom=True)
    for x in (GX - 3.2, GX + 3.2):
        box(k("glow"), x - 0.12, x + 0.12, TOP + 1.6, TOP + 1.9, tz - 0.12, tz + 0.12, scale=0.5, col=GLOW["red"])
    for z in (Z0, Z1):
        box(k("glow"), GX - 4.5, GX - 4.2, 2.2, 2.5, z - 0.16, z + 0.16, scale=0.5, col=K.SODIUM)
    K.ladder(GX + 4.36, Z0, GY + 1.0, TOP - 1.4, PI / 2)
    K.wash(GX - 9.0, GX + 9.0, Z0 + 1.0, Z1 - 1.0, level=0.85, hue="white", step=5.0)
    K.collide(GX - 4.4, GX - 3.6, Z0 - 0.4, Z0 + 0.4, TOP)
    K.collide(GX + 3.6, GX + 4.4, Z0 - 0.4, Z0 + 0.4, TOP)
    # Fence and gate on the street, floods at the corners, the back wall.
    K.fence(260.2, 12.4, 295.6, 12.4)
    K.gate(296.0, 12.4, 305.6, 12.4, (0, 1), open_=True)
    K.fence(314.4, 12.4, 340.0, 12.4)
    K.yard_wall(260.0, 44.8, 340.0, 44.8, r=r, face=-1)
    K.post_sign(293.4, 14.4, PI * 0.82, y=3.8, size="pm", scale=1.2)
    mast(262.0, 14.2, PI * 0.25, hue="white", level=0.6)
    mast(338.0, 14.2, -PI * 0.25, hue="white", level=0.6)
    K.wash(264.0, 338.0, 17.6, 17.6, level=0.5, step=6.0)
    P.place("forklift", 309.0, GY, 16.6, 1.2, district=D)
    scatter(r, 290.0, 312.0, 14.0, 17.4, 3, kinds=("tote", "drum_pallet", "tyres"))
    stand(303.0, 17.4, PI, "talk")
    stand(304.3, 16.8, -PI * 0.6, "talk")
    stand(288.4, 18.4, PI, "lean")
    stand(318.0, 15.6, PI, "smoke")


def substation():
    """A fenced compound: three transformers, two bus gantries strung with
    insulators, the lines coming in off the street's poles."""
    r = R(8663)
    K.paved(340.0, 388.0, 12.0, 45.0)
    for x in (352.0, 364.0, 376.0):
        P.place("transformer", x, GY, 37.0, 0.0, district=D)
        box(k("glow"), x - 0.08, x + 0.08, GY + 2.6, GY + 2.75, 37.82, 37.92, scale=0.5, col=GLOW["cyan"])
        K.sodium(x, 1.0, 34.6, 3.0, hue="cyan")
    for z in (19.0, 27.0):
        for x in (346.0, 382.0):
            K.column(x - 0.5, z, GY, 9.4, t=0.2, mat="metal")
            K.column(x + 0.5, z, GY, 9.4, t=0.2, mat="metal")
            for y in (0.4, 3.3, 6.2):
                K.xbrace(x - 0.5, z, x + 0.5, z, y, y + 2.9, r=0.04, mat="metal", detail=1)
        box(k("metal"), 345.4, 382.6, 9.0, 9.2, z - 0.25, z + 0.25, scale=1.0, bottom=True)
        box(k("metal"), 345.4, 382.6, 9.9, 10.05, z - 0.12, z + 0.12, scale=1.0, bottom=True)
        x = 346.0
        while x < 382.0:
            K.brace((x, 9.2, z), (x + 3.0, 9.9, z), r=0.035, mat="metal", detail=1)
            K.brace((x + 3.0, 9.9, z), (x + 6.0, 9.2, z), r=0.035, mat="metal", detail=1)
            x += 6.0
        for x in (352.0, 364.0, 376.0):
            for dx in (-0.8, 0.0, 0.8):
                cylinder(k("trim", 1), x + dx, z, 8.0, 9.0, 0.09, segs=5, col=K.CREAM, cap=False)
    for x in (352.0, 364.0, 376.0):
        for dx in (-0.8, 0.0, 0.8):
            K.cable((x + dx, 8.0, 19.0), (x + dx, 8.0, 27.0), sag=0.5, steps=5)
            K.cable((x + dx, 8.0, 27.0), (x + dx, GY + 3.7, 37.0), sag=0.9, steps=5)
    # The switch house, its door lamp; the fence, hung with warnings.
    K.shed(378.0, 386.0, 39.0, 44.4, 3.6, K.GREY, r, faces={"-z": dict(dress=True), "+z": dict(hidden=True)}, plinth=0.4)
    K.flat_roof(378.0, 386.0, 39.0, 44.4, 3.6, r, wall=K.GREY, lights=0.0, plant=False)
    K.fence(342.4, 14.6, 386.4, 14.6, signs=0.3)
    for i, x in enumerate((353.0, 376.0)):
        byaw = PI + (0.3 if i % 2 else -0.24)
        for du in (-2.0, 2.0):
            px, pz = x + math.cos(byaw) * du, 13.5 - math.sin(byaw) * du
            box(k("metal", 1), px - 0.09, px + 0.09, GY, 4.6, pz + 0.2, pz + 0.38, scale=0.5)
        B.billboard(D, x, 6.1, 13.5, 5.8, 2.9, byaw, r, depth=0.3)
        box(k("neon_amber"), x - 2.0, x + 2.0, 4.42, 4.5, 12.9, 13.05, scale=0.5, bottom=True)
    K.fence(342.4, 14.6, 342.4, 44.6, signs=0.15)
    K.fence(386.4, 14.6, 386.4, 39.0, signs=0.15)
    K.yard_wall(340.0, 44.8, 388.0, 44.8, r=r, face=-1)
    strip(344.0, 16.4, 0.0, power=6.0)
    strip(384.6, 22.0, -PI / 2, power=6.0, cone=False)
    K.wash(346.0, 382.0, 17.0, 34.0, level=0.6, hue="white", step=6.0)
    for z in (19.0, 27.0):
        for x in (355.0, 364.0, 373.0):
            box(k("glow"), x - 0.1, x + 0.1, 9.2, 9.4, z - 0.1, z + 0.1, scale=0.5, col=GLOW["cyan"])
    for x in (346.0, 382.0):
        box(k("glow"), x - 0.1, x + 0.1, 10.05, 10.3, 18.9, 19.1, scale=0.5, col=GLOW["red"])
    scatter(r, 388.5, 391.0, 14.0, 26.0, 2, kinds=("reel", "reel", "tote"))
    stand(380.4, 37.6, PI, "idle")
    return [(352.0, 9.0, 19.0), (364.0, 9.0, 19.0), (376.0, 9.0, 19.0)]


def workshop():
    """A scrapper's workshop: two bays open on a yard of tyres, drums and
    reels behind a wall pasted with boards."""
    r = R(8664)
    K.paved(388.0, 424.0, 12.0, 45.0)
    out = K.shed(392.0, 420.0, 30.0, 44.4, 6.4, K.RUST_D, r, faces={
        "-z": dict(docks=dict(n=3, s0=2.0, s1=26.0, raised=False, canopy=False, first=1, open=(0, 2), half=(1,))),
        "+z": dict(hidden=True), "-x": dict(dress=False), "+x": dict(dress=False)}, plinth=0.6, tint="rust")
    K.flat_roof(392.0, 420.0, 30.0, 44.4, 6.4, r, wall=K.RUST_D, lights=0.6, breathe=1)
    K.wash(394.0, 418.0, 27.4, 29.0, level=0.9)
    K.fence(388.4, 12.5, 400.0, 12.5)
    K.gate(400.6, 12.5, 407.4, 12.5, (0, 1), open_=True)
    K.fence(414.0, 12.5, 423.6, 12.5)
    K.post_sign(396.0, 14.0, PI * 1.12, y=4.4, size="pm", scale=1.4)
    scatter(r, 389.6, 399.0, 14.4, 27.0, 9, kinds=("tyres", "tyres", "drum_pallet", "reel", "crates", "drum", "tote"))
    scatter(r, 409.0, 422.0, 14.4, 26.0, 7, kinds=("tyres", "drum_pallet", "reel", "crates", "drum"))
    P.place("c20_grey", 419.0, GY, 21.0, PI / 2, district=D)
    hook = K.crane(410.4, 18.6, -PI * 0.62, h=10.5, jib=14.0)
    P.place("tyres", hook[0], hook[1] - 1.7, hook[2], 0.0, district=D)
    K.wash(402.0, 414.0, 15.0, 24.0, level=0.6, step=5.0)
    byaw = PI - 0.5
    for du in (-3.4, 3.4):
        px, pz = 405.0 + math.cos(byaw) * du - math.sin(byaw) * 0.2, 36.7 - math.sin(byaw) * du - math.cos(byaw) * 0.2
        box(k("metal", 1), px - 0.1, px + 0.1, 6.4, 8.2, pz - 0.1, pz + 0.1, scale=0.5)
    B.billboard(D, 405.0, 9.9, 36.7, 9.6, 3.4, byaw, r, depth=0.3)
    P.place("c40_rust", 390.4, GY, 37.0, PI / 2, district=D)
    strip(404.0, 26.6, PI, power=6.0)
    stand(397.4, 28.6, PI, "squat")
    stand(399.0, 28.0, PI * 0.7, "idle")
    stand(412.6, 27.8, PI, "smoke")
    stand(415.6, 16.8, PI, "sit", GY + 1.0)


def chevrons(f, y0, y1, col, n=2, wdt=0.9):
    """A face's panels crossed with painted bands, as Petrochem marks its
    blocks (Zq4zTcIM0yQ@174)."""
    cx, _, cz = f.p((f.a0 + f.a1) / 2, 0.0, 0.0)
    w = f.width / n
    for i in range(n):
        u0 = -f.width / 2 + i * w + 0.8
        u1 = -f.width / 2 + (i + 1) * w - 0.8
        K.band_quad(k("trim"), cx, cz, f.yaw, u0, y0, u1, y1, wdt, col)
        K.band_quad(k("trim"), cx, cz, f.yaw, u1, y0, u0, y1, wdt, col)
        for yy in (y0, y1):
            K.band_quad(k("trim"), cx, cz, f.yaw, u0, yy, u1, yy, wdt * 0.6, col)


def block_06():
    """The numbered block that closes the garage street: olive panels
    crossed with chevrons, a glass band, 06 lit from below."""
    r = R(8665)
    X0, X1, Z0, Z1, H = 424.0, 456.0, 14.0, 44.0, 22.0
    K.paved(424.0, 458.0, 12.0, 45.0)
    fs = B.faces_of(X0, X1, Z0, Z1)
    pale = c_ = (0.72, 0.76, 0.24, 1.0)
    for name, f in fs.items():
        w = f.width
        f.quad(k("concrete"), 0.0, w, 0.0, 3.2, 0.0, uvs=((0, 0), (w / 3.0, 0), (w / 3.0, 1.07), (0, 1.07)))
        f.quad(k("trim"), 0.0, w, 3.2, 16.2, 0.0, col=K.OLIVE)
        K.window_band(f, 16.2, 18.6, r, style=5, lit=(0.5, 0.8), warmth=(0.2, 0.6), tint="concrete")
        f.quad(k("trim"), 0.0, w, 18.6, H, 0.0, col=K.OLIVE)
        f.box(k("metal"), -0.15, w + 0.15, H - 0.3, H + 0.5, 0.0, 0.25)
        f.box(k("trim"), -0.1, w + 0.1, 3.1, 3.4, 0.0, 0.2, col=K.shade(K.OLIVE, 0.5))
        for s in (0.0, w / 2, w):
            f.box(k("trim"), s - 0.3, s + 0.3, 0.0, H, 0.0, 0.22, col=K.shade(K.OLIVE, 0.6))
        if name != "+z":
            chevrons(f, 4.2, 15.4, pale, n=2)
    # 06, six metres tall, on the three faces the streets see.
    for name in ("-z", "-x", "+x"):
        f = fs[name]
        cx, _, cz = f.p(f.at(f.width * 0.28), 0.0, 0.0)
        K.digits("06", cx, 20.3, cz, 2.7, f.yaw, k("glow"), K.shade(K.SODIUM, 0.9), out=0.06)
    f = fs["-z"]
    K.dock(f, 8.0, r, no=6, sill=0.0, h=3.0, state="shut", eave=H)
    K.dock(f, 24.0, r, no=7, sill=0.0, h=3.0, state="half", eave=H)
    f.quad(k("door"), 15.4, 16.6, GY, GY + 2.3, 0.03)
    f.box(k("neon_cyan"), 15.2, 16.8, GY + 2.5, GY + 2.6, 0.04, 0.1)
    # Lit from its foot: floods in the ground on the street side and at
    # the two flanks, so the chevrons stand in orange light.
    K.wash(X0, X1, Z0 - 1.4, Z0 - 1.4, level=1.0, step=3.5)
    K.wash(X0 - 1.4, X0 - 1.4, Z0, Z1, level=0.7)
    K.wash(X1 + 1.4, X1 + 1.4, Z0, Z1, level=0.7)
    for x in (428.0, 436.0, 444.0, 452.0):
        box(k("neon_amber"), x - 0.4, x + 0.4, GY, GY + 0.16, Z0 - 1.5, Z0 - 1.2, scale=0.5)
    K.flat_roof(X0, X1, Z0, Z1, H, r, wall=K.OLIVE, lights=0.5, breathe=1, keep=(439.0, 455.0, 20.0, 38.0))
    K.av_pad(447.0, 29.0, H, rad=6.4)
    P.place("antenna", 427.4, H, 41.0, 0.4, sy=1.4, district=D)
    for x, z in ((X0 + 0.3, Z0 + 0.3), (X1 - 0.3, Z0 + 0.3), (X0 + 0.3, Z1 - 0.3), (X1 - 0.3, Z1 - 0.3)):
        box(k("glow"), x - 0.14, x + 0.14, H + 0.8, H + 1.1, z - 0.14, z + 0.14, scale=0.5, col=GLOW["red"])
    K.collide(X0, X1, Z0, Z1, H)
    K.yard_wall(424.0, 44.8, 458.0, 44.8, r=r, face=-1)
    for x in (426.0, 440.0, 454.0):
        cylinder(k("hazard", 1), x, 12.8, GY, GY + 1.1, 0.14, segs=8)
    stand(441.6, 12.9, PI, "phone")
    stand(430.0, 13.0, PI * 0.9, "lean")


def gasholder():
    """A gasholder in its guide frame at the east corner: the lift in two
    tiers, twelve standards braced in crosses (KvMY1uzSC1E@177's dome)."""
    r = R(8666)
    CX, CZ, RT, RF = 474.0, 29.6, 11.6, 13.0
    K.paved(458.0, 490.0, 12.0, 45.0)
    for (ya, yb, rr, col) in ((GY, 7.0, RT, K.STEEL_BLUE), (7.0, 11.4, RT - 0.5, K.shade(K.STEEL_BLUE, 0.85))):
        lo, hi = K.ring_pts(CX, CZ, rr, 24, ya), K.ring_pts(CX, CZ, rr, 24, yb)
        for i in range(24):
            i2 = (i + 1) % 24
            mid = ((lo[i][0] + lo[i2][0]) / 2 - CX, 0, (lo[i][2] + lo[i2][2]) / 2 - CZ)
            K.quad_n(k("trim"), (lo[i], lo[i2], hi[i2], hi[i]), mid, col)
        cylinder(k("metal", 1), CX, CZ, yb - 0.3, yb, rr + 0.12, segs=24, cap=False)
    top = K.ring_pts(CX, CZ, RT - 0.5, 24, 11.4)
    for i in range(24):
        K.tri_n(k("trim"), ((CX, 13.4, CZ), top[i], top[(i + 1) % 24]), (0, 1, 0), K.shade(K.STEEL_BLUE, 0.7))
    quad(k("roof"), (CX - RT, 7.0, CZ + RT), (CX + RT, 7.0, CZ + RT), (CX + RT, 7.0, CZ - RT), (CX - RT, 7.0, CZ - RT))
    cylinder(k("metal", 1), CX, CZ, 13.3, 14.1, 0.5, segs=6)
    n = 12
    std = [(CX + RF * math.cos(i * math.tau / n), CZ + RF * math.sin(i * math.tau / n)) for i in range(n)]
    tiers = (GY, 7.0, 13.0, 19.0)
    for i, (x, z) in enumerate(std):
        K.column(x, z, GY, tiers[-1] + 0.4, t=0.34)
        x2, z2 = std[(i + 1) % n]
        for y in tiers[1:]:
            K.brace((x, y, z), (x2, y, z2), r=0.13)
        for ti in (1, 2):
            K.xbrace(x, z, x2, z2, tiers[ti] + 0.2, tiers[ti + 1] - 0.2, r=0.06)
        if i % 3 == 0:
            box(k("glow"), x - 0.14, x + 0.14, tiers[-1] + 0.4, tiers[-1] + 0.7, z - 0.14, z + 0.14, scale=0.5, col=GLOW["red"])
    # A stair up the frame on the street side, and its landing's lamp.
    sx, sz = std[9]
    y, flip = GY, 1
    while y < 13.0 - 0.1:
        y2 = min(13.0, y + 3.25)
        K.stair((sx - 1.2, y, sz - 0.9 - 1.6 * flip), (sx - 1.2, y2, sz - 0.9 + 1.6 * flip), w=1.0)
        y, flip = y2, -flip
    box(k("glow"), sx - 1.3, sx - 1.1, 14.6, 14.85, sz - 1.0, sz - 0.8, scale=0.5, col=GLOW["cyan"])
    K.ring_wash(CX, CZ, RF + 1.2, PI, PI * 2, level=0.8)
    K.ring_wash(CX, CZ, RF + 1.2, 0.0, PI, level=0.35)
    K.collide(CX - RT * 0.75, CX + RT * 0.75, CZ - RT * 0.75, CZ + RT * 0.75, 13.4)
    K.fence(458.4, 12.4, 489.6, 12.4)
    K.yard_wall(458.0, 44.8, 490.0, 44.8, r=r, face=-1)
    scatter(r, 459.0, 463.0, 38.0, 43.0, 3)
    stand(462.6, 14.2, PI, "idle")


# ---------------------------------------------------------------------------
# East of the garage street, under Contact's lens. North of z -76 nothing
# stands over 11 m: the lens skims these roofs to the moon.
# ---------------------------------------------------------------------------
def east():
    r = R(8671)
    K.paved(452.0, 490.0, -176.0, 12.0)
    # A sawtooth shed, its north lights facing the garage's roof.
    out = K.shed(454.5, 488.0, -175.5, -127.0, 6.8, K.CREAM, r, faces={
        "-x": dict(band=(4.9, 6.0), style=6, lit=(0.4, 0.7), office=(34.0, 46.0),
                   docks=dict(n=4, s0=4.0, s1=30.0, raised=False, canopy=False, first=1, open=(2,), half=(0,))),
        "+z": dict(band=(4.9, 6.0), style=6), "-z": dict(dress=False), "+x": dict(dress=False)}, stripe_col=K.OXIDE)
    K.sawtooth(454.5, 488.0, -175.5, -127.0, 6.8, 8, "-z", r, wall=K.CREAM, rise=2.4, lit=0.85, power=2.4)
    K.wash(453.2, 453.2, -172.0, -130.0, level=0.6)
    fe = B.faces_of(454.5, 488.0, -175.5, -127.0)
    K.blade(fe["-x"], 47.6, 3.4, "bm")
    K.stencil(fe["-x"], 32.0, 3.4, "09", h=2.4, wall=K.CREAM)
    K.stencil(fe["+z"], 17.0, 3.2, "09", h=2.6, wall=K.CREAM)
    stand(453.4, -159.0, -PI / 2, "idle")
    stand(453.5, -147.4, -PI / 2, "smoke")
    P.place("crates", 453.6, GY, -156.4, 0.4, district=D)
    # A small tank yard: three tanks in a bund behind a fence, pipes, a
    # vent stub steaming, strip lamps (no mast: nothing here over 11 m).
    for (a0, a1, b0, b1) in ((456.0, 488.6, -124.6, -124.3), (456.0, 488.6, -96.3, -96.0), (456.0, 456.3, -124.6, -96.0), (488.3, 488.6, -124.6, -96.0)):
        box(k("concrete"), a0, a1, 0.0, 1.0, b0, b1, scale=2.0)
    K.tank(462.6, -116.6, 4.3, 7.2, K.RUST, segs=14, number="11", number_yaw=-PI / 2, stair_at=PI * 0.5, r_=r)
    K.tank(473.6, -117.4, 4.3, 7.6, K.TANK_WHITE, segs=14, band=(0.1, 0.2), stair_at=PI * 0.4, r_=r)
    K.tank(483.4, -110.0, 4.0, 6.8, K.RUST, segs=14, stair_at=PI * 0.9, r_=r)
    K.tank(466.6, -103.6, 3.6, 6.4, K.TANK_WHITE, segs=14, number="12", number_yaw=-PI / 2, stair_at=-PI * 0.2, r_=r)
    for x, z in ((462.6, -116.6), (473.6, -117.4), (483.4, -110.0), (466.6, -103.6)):
        K.ring_wash(x, z, 5.6, 0.0, PI * 2, level=0.8)
    K.run([(458.0, 0.7, -111.0), (486.0, 0.7, -111.0)], r=0.16, col=K.RUST_D)
    K.run([(458.0, 0.7, -110.4), (478.0, 0.7, -110.4), (478.0, 0.7, -100.0), (474.0, 0.7, -100.0)], r=0.11, col=K.YELLOW)
    cylinder(k("metal"), 477.0, -100.6, GY, 9.4, 0.3, segs=8)
    K.steam(477.0, 9.6, -100.6)
    K.fence(454.4, -126.6, 454.4, -113.6)
    K.gate(454.4, -113.2, 454.4, -106.8, (1, 0), open_=False)
    K.fence(454.4, -106.4, 454.4, -94.4)
    K.verge(r, 453.2, -125.0, 453.2, -96.0, step=8.0, kinds=("hydrant", "bollard", "bin", "drum", "crates", "barrier"))
    strip(455.2, -122.0, PI / 2, cone=False)
    strip(455.2, -99.0, PI / 2, cone=False)
    strip(487.4, -124.0, -PI * 0.25, cone=False)
    stand(470.0, -108.8, PI, "idle")
    lx, lz = 473.6 + 4.8 * math.cos(PI * 0.4), -117.4 + 4.8 * math.sin(PI * 0.4)
    stand(lx, lz, PI, "lean", GY + 7.6)
    # A workshop: its office front on the street, rooflights and ducts.
    out = K.shed(456.0, 488.0, -92.0, -40.0, 7.4, K.GREY, r, faces={
        "-x": dict(band=(5.2, 6.6), style=2, lit=(0.5, 0.8), office=(4.0, 24.0),
                   docks=dict(n=3, s0=28.0, s1=48.0, raised=False, canopy=False, first=5, open=(0,), half=(2,))),
        "-z": dict(band=(5.2, 6.6), style=6), "+z": dict(band=(5.2, 6.6), style=6), "+x": dict(dress=False)}, stripe_col=K.YELLOW)
    K.flat_roof(456.0, 488.0, -92.0, -40.0, 7.4, r, wall=K.GREY, lights=0.75, breathe=1)
    K.wash(454.6, 454.6, -90.0, -42.0, level=0.6)
    fw = B.faces_of(456.0, 488.0, -92.0, -40.0)
    K.blade(fw["-x"], 1.0, 3.2, "bl", scale=0.85)
    K.blade(fw["-x"], 26.0, 3.8, "bs", scale=1.2)
    K.stencil(fw["-x"], 50.0, 3.4, "10", h=2.6, wall=K.GREY)
    P.place("forklift", 454.4, GY, -80.0, -PI / 2, district=D)
    stand(454.2, -77.4, -PI / 2, "idle")
    scatter(r, 453.0, 455.2, -94.0, -92.6, 1, kinds=("dumpster",), yaw=PI)
    scatter(r, 453.2, 455.0, -39.4, -37.0, 2, kinds=("bags", "crates", "dumpster"))
    # The corner at H: a short row of shops under flats, the workers' bars
    # and counters, lit, where the loop turns.
    hs = [11.4, 8.0, 14.8, 11.4]
    B.row(D, "-x", -36.0, 10.0, 34.0, 454.0, lambda i, a: hs[i % 4], lambda i: (12.8, 9.6, 12.8, 10.8)[i % 4], r,
          style=dict(STYLE, signs=1.6, awning=0.6, shop_sign=0.8, lit=(0.45, 0.85), balcony=0.1, fire_escape=0.4, windows=(0, 1, 3, 6)),
          ends=("open", "open"), back="back")
    K.wash(452.6, 453.6, -34.0, 8.0, level=0.3, step=6.0)
    P.place("vending", 453.4, GY, -12.2, -PI / 2, district=D)
    P.place("vending_warm", 453.4, GY, 4.4, -PI / 2, district=D)
    stand(453.2, -20.6, -PI / 2, "lean")
    stand(453.1, -4.0, -PI / 2, "smoke")
    stand(453.3, -27.0, -0.6, "talk")
    stand(453.2, -28.2, PI * 0.8, "talk")
    stand(453.3, 6.6, -PI / 2, "squat")
    # The edge: a yard wall the far city stands behind.
    K.yard_wall(489.8, -176.0, 489.8, 45.0, r=r, wire=True)


# ---------------------------------------------------------------------------
# Wires: utility poles down the south street's south side and up the
# garage street's east side, conductors between them, drops to the sheds,
# lines over the street to the plant (JtqIas3bYhg@80).
# ---------------------------------------------------------------------------
def lines(bus):
    south = [(x, 12.75) for x in (112.0, 144.0, 177.0, 208.0, 240.0, 272.0, 311.0, 341.0, 368.0, 398.0, 422.6)]
    K.poles(south, PI / 2)
    garage = [(452.6, z) for z in (8.4, -38.0, -64.0, -94.0, -126.0, -158.0)]
    K.poles(garage, 0.0)
    K.wires((422.6, GY + 8.25, 12.75), (452.6, GY + 8.25, 8.4), PI / 4, sag=0.9)
    # Into the substation's bus from the pole in front of it.
    for i, b in enumerate(bus):
        K.cable((368.0 + (i - 1) * 0.9, GY + 8.25, 12.75), b, sag=0.5, steps=5)
    # Over the street to the plant and the depot.
    for x, zt, yt in ((311.0, -11.6, 8.2), (368.0, -12.0, 8.6), (240.0, -11.4, 8.0), (177.0, -11.0, 8.2)):
        K.column(x, zt, GY, yt + 0.5, t=0.2, mat="trim", col=(0.12, 0.09, 0.07, 1))
        box(k("trim"), x - 1.0, x + 1.0, yt, yt + 0.12, zt - 0.06, zt + 0.06, scale=0.5, col=(0.12, 0.09, 0.07, 1))
        for dx in (-0.8, 0.0, 0.8):
            K.cable((x + dx, GY + 8.25, 12.75), (x + dx, yt + 0.12, zt), sag=1.1)
    # Drops to the buildings they feed.
    for a, b in (((208.0, GY + 7.4, 12.75), (208.0, 7.6, 16.0)), ((144.0, GY + 7.4, 12.75), (146.0, 5.4, 36.0)), ((398.0, GY + 7.4, 12.75), (400.0, 6.2, 30.0)),
                 ((452.6, GY + 7.4, -64.0), (456.0, 7.2, -66.0)), ((452.6, GY + 7.4, -158.0), (454.5, 6.6, -156.0)), ((452.6, GY + 7.4, -38.0), (454.0, 7.6, -34.0)),
                 ((452.6, GY + 7.4, 8.4), (454.0, 7.8, 6.0))):
        K.cable(a, b, sag=0.5, steps=5)


def street_cones():
    """Sodium light hanging under the street lamps of this district's
    stretches of the loop (the lamps are streets.py's, where it stands
    them: the same rule, read from the plan)."""
    for name, lo, hi in (("south", 108.0, 440.0), ("garage", -176.0, 12.0)):
        s = plan.BY_NAME[name]
        for a, b in plan.runs(s):
            for side in (-1, 1):
                v = a + 4.0 + 8.0 + (0.0 if side > 0 else 15.0)
                while v < b - 4.0 - 4.0:
                    if lo <= v <= hi:
                        u = side * (s.half + 0.7 - 2.1)
                        x, z = (s.c + u, v) if s.axis == "z" else (v, s.c + u)
                        K.cone(x, 0.15 + 6.9, z)
                    v += 30.0


roads()
works()
tank_farm()
plant()
depot()
fuel()
street_shed()
container_yard()
BUS = substation()
workshop()
block_06()
gasholder()
east()
lines(BUS)
street_cones()
