"""Corpo Plaza's blocks: towers on podiums round the square and along the
x 120 road (BIBLE.md, "Corpo Plaza"; mH2wmyeiIpA@143, YRL74JmhVgk@30).

South of the plaza street the road runs between B1 and B2 (west, either
side of the deck's landing) and D (east, whose third tower closes the
deck's vista). North of the board's block, B5 fronts the road up to the
boulevard and the north quarter steps up behind it toward ARASAKA, every
mass under the Work shot's line to ARASAKA's name and behind the avenue's
roofs in the hero (plaza_parts.check_top refuses one that is not).

Every podium is the kit's building (shops on its street faces, storeys of
windows, backs with their doors and lamps); every shaft is glass (the
site's curtain wall) or the kit's walls on true floors; every roof is a
garden, a pool, a pad, a skylight or plant, lit, because half of this
district is seen from above.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw.kit import _crosses
from ncw import buildings as B
from ncw import props as P
from ncw.districts.plaza_parts import *  # noqa: F401,F403

OFFICE = dict(windows=(2, 4, 5), lit=(0.6, 0.92), warmth=(0.05, 0.45), tints=("navy", "teal", "concrete", "charcoal"),
              balcony=0.0, ac=0.03, signs=0.5, awning=0.2, shop_sign=0.7, canopy=0.5, roof_cap=4.4, setback=0.0,
              fire_escape=0.0, cornice=0.35, ledge_every=(2, 3), pipes=0.15, roof_sign=0.0,
              shop_colours=["cyan", "white", "teal", "blue", "amber"], sign_colours=["cyan", "white", "teal", "amber", "magenta"])
HOTEL = dict(OFFICE, windows=(0, 1), lit=(0.62, 0.9), warmth=(0.65, 1.0), tints=("plum", "brown", "navy"),
             balcony=0.34, balcony_glass=0.0, ledge_every=(1,), cornice=0.6,
             shop_colours=["amber", "pink", "white", "cyan"], awning=0.5)
ALL_OPEN = {"+x": "open", "-x": "open", "+z": "open", "-z": "open"}
FACE_AT = {"+z": 0.0, "-z": math.pi, "+x": math.pi / 2, "-x": -math.pi / 2}


def hero_hidden(x0, x1, z0, z1, top, what):
    """The hero's lens must not find this mass over the avenue's roofs: its
    top's corners and middle, wherever they fall inside the lens's frame,
    lie behind one of the masses the hero looks along."""
    for e, half in zip(HERO_EYES, (0.85, 0.85, 0.36)):
        for x in (x0, (x0 + x1) / 2, x1):
            for z in (z0, (z0 + z1) / 2, z1):
                if e[2] - z <= 0 or abs(x - e[0]) > half * (e[2] - z):
                    continue
                if not any(_crosses(e, (x, top, z), lo, hi) for lo, hi in HERO_MASSES):
                    raise ValueError(f"{what}: its top at ({x}, {top}, {z}) shows in the hero")


def checked(x0, x1, z0, z1, top, what):
    if z1 < -264.0 and top > work_cap(z1):
        raise ValueError(f"{what}: {top:.1f} m is over the Work shot's line ({work_cap(z1):.1f} m at z {z1})")
    hero_hidden(x0, x1, z0, z1, top, what)


def podium(x0, x1, z0, z1, h, sides, seed, nb=None, style=OFFICE, ground="shops", **kw):
    front = next((k for k, v in sides.items() if v == "street"), "+z")
    full = dict({"+x": "back", "-x": "back", "+z": "back", "-z": "back"}, **sides)
    B.building(B.Lot(x0, x1, z0, z1, front, full, dict(nb or {}), PL), h, random.Random(seed), style=style, setback=False,
               ground=ground, roof=False, **kw)
    checked(x0, x1, z0, z1, h + 1.2, f"podium {seed}")


def mark(kind, face, sec, y, size, colour, back=True):
    """A tower's emblem on one face of a section (x0, x1, z0, z1)."""
    x0, x1, z0, z1 = sec[:4]
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    px, pz = {"+z": (cx, z1 + 0.08), "-z": (cx, z0 - 0.08), "+x": (x1 + 0.08, cz), "-x": (x0 - 0.08, cz)}[face]
    if back:
        Plane(px, y, pz, FACE_AT[face]).rect((PL, "board_frame", 0), -size * 0.66, size * 0.66, -size * 0.66, size * 0.66)
    emblem(kind, px, y, pz, size, FACE_AT[face], colour)


def tower(what, x0, x1, z0, z1, base, top, seed, kind="glass", steps=(), cut=2.0, accent="cyan", crown="band",
          marks=(), style=OFFICE, window=None, tint=None, lit=None, warm=None, plant=2):
    """A shaft on a podium (or the ground): glass, or the kit's walls.
    `steps`: ((height, inset), ...) where it steps in. `marks`: (emblem,
    face, height, size, colour). Returns its sections."""
    r = random.Random(seed)
    levels = [base] + [y for y, _ in steps] + [top]
    insets = [0.0] + [i for _, i in steps]
    glass = kind == "glass"
    secs = []
    for k in range(len(levels) - 1):
        i = insets[k]
        sx0, sx1, sz0, sz1 = x0 + i, x1 - i, z0 + i, z1 - i
        y0, y1 = levels[k], levels[k + 1]
        if glass:
            glass_shaft(sx0, sx1, sz0, sz1, y0, y1, seed + k, cut=cut, lit=lit, warm=warm)
            fins(sx0, sx1, sz0, sz1, max(y0, 1.0), y1, accent, cut=cut)
        else:
            B.building(B.Lot(sx0, sx1, sz0, sz1, "+z", dict(ALL_OPEN), {}, PL), y1, random.Random(seed + k), style=style, base=y0,
                       signs=False, setback=False, window=window, tint=tint, roof=False)
        if k > 0:
            lit_band(sx0, sx1, sz0, sz1, y0 + 0.15, y0 + 0.5, accent, cut=cut if glass else 0.0)
            B.ROOFS.append((PL, secs[-1][0], secs[-1][1], secs[-1][2], secs[-1][3], y0))
        secs.append((sx0, sx1, sz0, sz1, y0, y1))
    tx0, tx1, tz0, tz1 = secs[-1][:4]
    cx, cz, w, d = (tx0 + tx1) / 2, (tz0 + tz1) / 2, tx1 - tx0, tz1 - tz0
    extra = 1.0
    if glass:
        lit_band(tx0, tx1, tz0, tz1, top - 0.5, top + 0.1, accent, cut=cut, k=0.8)
        B.ROOFS.append((PL, tx0, tx1, tz0, tz1, top))
    else:
        parapet(tx0, tx1, tz0, tz1, top, tint=B.TINTS[tint] if isinstance(tint, str) else 1, line=accent if crown != "pad" else None)
    if crown == "blades":
        m = cut * 0.8 if glass else 0.5
        crown_blades(tx0 + m, tx1 - m, tz0 + m, tz1 - m, top, accent, h=5.0)
        extra = 5.0
    elif crown == "halo":
        halo(cx, cz, top + 3.4, min(w, d) / 2 - 1.2, accent)
        extra = 3.5
    elif crown == "mast":
        mast(cx + w * 0.2, cz - d * 0.2, top, 11.0)
        extra = 11.5
    elif crown == "pad":
        av_pad(cx, cz, top, r=min(7.5, min(w, d) / 2 - 3.0), colour=accent)
        extra = 1.2
    elif crown in ("pool", "garden"):
        roof_terrace(tx0 + 0.6, tx1 - 0.6, tz0 + 0.6, tz1 - 0.6, top, r, colour=accent, water=crown == "pool")
        extra = 8.0
    if plant and crown not in ("pad", "pool", "garden"):
        m = 3.0 if crown in ("blades", "halo") else 1.6
        roof_plant(tx0 + m, tx1 - m, tz0 + m, tz1 - m, top, r, n=plant)
        # And what every roof holds (the kit's own: a tank, a stair hut with
        # its door lit, units, a dish), nothing over 4.4 m.
        B.roof_dress(PL, tx0 + m, tx1 - m, tz0 + m, tz1 - m, top, r, cap=4.4, sign_rate=0.0, parapet=False, tint=1)
        extra = max(extra, 4.6)
    corner_lamps(tx0 + (cut if glass else 0), tx1 - (cut if glass else 0), tz0 + (cut if glass else 0), tz1 - (cut if glass else 0), top + (0.1 if glass else 1.0))
    for (em, face, y, size, colour) in marks:
        sec = next((s for s in secs if s[4] <= y - size * 0.6 and y + size * 0.6 <= s[5]), secs[-1])
        mark(em, face, sec, y, size, colour)
    checked(x0, x1, z0, z1, top + extra, what)
    return secs


def roof_screen(cx, cz, y, w, h, yaw, seed):
    screen_on_legs(cx, cz, y + 1.6, w, h, yaw, random.Random(seed), base=y)


# ---------------------------------------------------------------------------
# B1: between the plaza street and the deck, west of the x 120 road. Its
# tall glass tower stands in the west (the aerial looks over the low east
# corner into the square), an office slab in lit bands along the deck.
# ---------------------------------------------------------------------------
B.ground_rect(PL, 52.0, 108.0, -168.0, -95.0)
podium(52.0, 80.0, -168.0, -132.0, 14.8, {"-z": "street", "-x": "back", "+x": "party", "+z": "party"}, 8311,
       nb={"+x": 18.2, "+z": 11.4})
podium(80.0, 108.0, -168.0, -132.0, 18.2, {"+x": "street", "-z": "street", "-x": "party", "+z": "party"}, 8312,
       nb={"-x": 14.8, "+z": 11.4}, window=4, tint="teal")
podium(52.0, 108.0, -132.0, -95.0, 11.4, {"+x": "street", "+z": "street", "-x": "back", "-z": "party"}, 8313,
       nb={"-z": 14.8}, tint="navy")
# (The hero's lens finds anything here over 70 m above the avenue's roofs.)
B1T = tower("B1 tower", 55.0, 77.0, -165.0, -136.0, 14.8, 64.0, 8314, steps=((50.0, 2.5),), cut=2.4, accent="cyan", crown="halo",
            marks=(("hex", "-z", 57.0, 8.0, "cyan"), ("hex", "+x", 57.0, 8.0, "cyan")), lit=0.72, warm=0.2)
tower("B1 slab", 62.0, 104.0, -124.0, -100.0, 11.4, 45.4, 8315, kind="wall", window=5, tint="navy", accent="amber", crown="band",
      marks=(("bars", "+x", 37.0, 6.0, "amber"),), plant=3)
# The corner block's roof: a garden over the junction, and a screen turned
# to it.
parapet(80.0, 108.0, -168.0, -132.0, 18.2, tint=2, line="teal")
garden(82.0, 106.0, -158.0, -134.0, 18.2, random.Random(8316), palms=3, trees=2, colour="teal")
roof_screen(102.0, -163.0, 18.2, 10.0, 5.6, math.radians(135), 8317)
# The tower's podium roof and the slab's: plant, a skylight, lamps.
parapet(52.0, 80.0, -168.0, -132.0, 14.8, tint=1)
parapet(52.0, 108.0, -132.0, -95.0, 11.4, tint=1, line="amber")
skylight(64.0, 100.0, -131.0, -126.5, 11.4, colour="white", k=0.26, pitch=0.9)
roof_plant(53.0, 61.0, -123.0, -107.0, 11.4, random.Random(8318), n=3)
# Two screens turned to the traffic coming down the deck (it comes from
# the west, at their height until it lands): one flat on the slab's west
# end, one on its podium. (Nothing that glows stands west of x 60 above the
# lane: the site's bake runs every light within 60 m of the avenue down the
# hero's road as a streak, whatever stands between.)
screen(61.55, 24.0, -112.0, 14.0, 7.0, -math.pi / 2, random.Random(8319), back=False)
roof_screen(84.0, -97.6, 11.4, 12.0, 5.0, math.radians(-15), 8320)

# ---------------------------------------------------------------------------
# B2: between the deck and the south street: a hotel slab on the south
# street, a glass wing on the deck, a pool on the podium between them.
# ---------------------------------------------------------------------------
B.ground_rect(PL, 52.0, 108.0, -65.0, -10.0)
podium(52.0, 108.0, -65.0, -10.0, 11.4, {"+z": "street", "+x": "street", "-z": "street", "-x": "back"}, 8321, style=HOTEL, tint="plum")
parapet(52.0, 108.0, -65.0, -10.0, 11.4, tint=3, line="pink")
B2H = tower("B2 hotel", 56.0, 106.0, -34.0, -13.0, 11.4, 45.4, 8322, kind="wall", style=HOTEL, window=0, tint="plum", accent="pink",
            crown="band", plant=0)
pool(60.0, 72.0, -29.5, -24.0, 45.4, colour="cyan")
garden(90.0, 105.0, -32.5, -18.5, 45.4, random.Random(8328), palms=3, trees=0, colour="pink", lamps=1)
roof_plant(60.0, 74.0, -22.0, -17.0, 45.4, random.Random(8329), n=2)
tower("B2 wing", 62.0, 98.0, -62.0, -46.0, 11.4, 31.0, 8323, cut=1.6, accent="teal", crown="band", lit=0.78, warm=0.5, plant=2,
      marks=(("gate", "-z", 24.5, 5.0, "teal"),))
pool(66.0, 94.0, -43.0, -37.0, 11.4, colour="cyan")
garden(54.0, 65.0, -46.0, -34.0, 11.4, random.Random(8324), palms=2, trees=0, colour="pink", lamps=1)
garden(95.0, 107.0, -46.0, -34.0, 11.4, random.Random(8327), palms=2, trees=0, colour="pink", lamps=1)
roof_screen(103.0, -60.0, 11.4, 9.0, 5.0, math.radians(-128), 8325)
screen(61.55, 21.0, -54.0, 10.0, 6.0, -math.pi / 2, random.Random(8326), back=False)
# The hotel's name in light on its roof, to the south street and to the deck.
big_sign("pm", 4.0, 81.0, 45.4 + 1.2 + 2.4, -14.0, 0.0, double=False)
big_sign("pm", 3.0, 81.0, 45.4 + 1.0 + 1.8, -33.0, math.pi, double=False)
for px in (76.5, 85.5):
    box((PL, "metal", 1), px - 0.1, px + 0.1, 45.4, 46.8, -14.3, -14.1, scale=0.5)
    box((PL, "metal", 1), px - 0.1, px + 0.1, 45.4, 46.5, -32.9, -32.7, scale=0.5)

# ---------------------------------------------------------------------------
# D: the x 120 road's east side from the plaza street to the south street.
# D1 stays low under the aerial's line into the square (a landing pad on
# its roof), D2 is a slim glass slab, D3 stands on the deck's axis and
# closes its vista with a screen the height of ten floors, D4 is flats.
# ---------------------------------------------------------------------------
B.ground_rect(PL, 132.0, 170.0, -168.0, -10.0)
podium(132.0, 170.0, -168.0, -126.0, 14.8, {"-x": "street", "-z": "street", "+x": "open", "+z": "party"}, 8331, nb={"+z": 11.4},
       tint="concrete", window=2)
tower("D1", 136.0, 168.0, -164.0, -130.0, 14.8, 35.2, 8332, kind="wall", window=2, tint="concrete", accent="amber", crown="pad", plant=0)
parapet(132.0, 170.0, -168.0, -126.0, 14.8, tint=5)
podium(132.0, 170.0, -126.0, -98.0, 11.4, {"-x": "street", "+x": "open", "+z": "party", "-z": "party"}, 8333,
       nb={"+z": 11.4, "-z": 14.8}, tint="navy", ground="blank", signs=False, style=dict(OFFICE, canopy=0.0))
lobby_front(B.Face("-x", 132.0, -126.0, -98.0), 1.0, 27.0, random.Random(8345), accent="amber")
tower("D2", 137.0, 165.0, -123.0, -101.0, 11.4, 58.0, 8334, cut=2.0, accent="amber", crown="blades", lit=0.66, warm=0.75,
      marks=(("chevrons", "-x", 49.0, 7.0, "amber"), ("chevrons", "+x", 49.0, 7.0, "amber")))
podium(132.0, 170.0, -98.0, -60.0, 11.4, {"-x": "street", "+x": "open", "+z": "party", "-z": "party"}, 8335,
       nb={"+z": 11.4, "-z": 11.4}, tint="charcoal", window=4, ground="blank", signs=False, style=dict(OFFICE, canopy=0.0))
lobby_front(B.Face("-x", 132.0, -98.0, -60.0), 1.0, 37.0, random.Random(8346), accent="magenta")
D3 = tower("D3", 136.0, 166.0, -94.0, -64.0, 11.4, 80.0, 8336, steps=((60.0, 3.0),), cut=3.0, accent="magenta", crown="halo",
           lit=0.7, warm=0.15, marks=(("rings", "-x", 70.0, 8.0, "magenta"), ("rings", "-z", 70.0, 8.0, "magenta"),
                                     ("rings", "+z", 70.0, 8.0, "magenta")))
mast(151.0, -79.0, 80.0, 12.0)
# The screen that closes the deck's vista: ten floors of advert on the
# tower's west face, on the road's axis.
screen(135.6, 36.0, -79.0, 13.0, 28.0, -math.pi / 2, random.Random(8337), back=False, depth=0.5)
for z in (-86.2, -71.8):
    box((PL, "glow", 0), 135.72, 136.0, 21.5, 50.5, z - 0.12, z + 0.12, scale=1.0, col=dim("magenta", 0.7))
parapet(132.0, 170.0, -126.0, -60.0, 11.4, tint=1, line="magenta")
garden(132.6, 136.6, -124.0, -99.0, 11.4, random.Random(8342), palms=0, trees=2, colour="amber", lamps=1)
skylight(133.0, 136.0, -72.0, -63.0, 11.4, colour="white", k=0.26, pitch=0.7)
skylight(133.0, 136.0, -95.0, -86.0, 11.4, colour="white", k=0.26, pitch=0.7)
roof_plant(166.0, 169.6, -124.0, -62.0, 11.4, random.Random(8343), n=4)
podium(132.0, 170.0, -60.0, -10.0, 11.4, {"-x": "street", "+z": "street", "+x": "open", "-z": "party"}, 8338, nb={"-z": 11.4},
       style=HOTEL, tint="brown")
tower("D4", 142.0, 168.0, -56.0, -14.0, 11.4, 42.0, 8339, kind="wall", style=HOTEL, window=1, tint="brown", accent="amber",
      crown="pool", plant=0)
parapet(132.0, 170.0, -60.0, -10.0, 11.4, tint=4, line="amber")
garden(133.5, 141.0, -58.0, -12.0, 11.4, random.Random(8340), palms=3, trees=1, colour="amber", lamps=2)
roof_screen(137.0, -14.5, 11.4, 8.0, 4.6, math.radians(-45), 8341)

# ---------------------------------------------------------------------------
# B5 and the north quarter: behind the board's block up to ARASAKA's, the
# road's west frontage up to the boulevard (whose west end B5 closes with a
# screen), and glass and banded towers round courts, each taller than the
# one south of it, under the line.
# ---------------------------------------------------------------------------
B.ground_rect(PL, 52.0, 108.0, -456.0, -284.0)
B.ground_rect(PL, 108.0, 170.0, -456.0, -420.0)
podium(78.0, 108.0, -310.0, -284.0, 31.8, {"+x": "street", "+z": "party", "-z": "party", "-x": "back"}, 8351,
       nb={"+z": 44.0, "-z": 42.0}, window=4, tint="navy", style=dict(OFFICE, roof_cap=4.4))
B.roof_dress(PL, 78.0, 108.0, -310.0, -284.0, 31.8, random.Random(8352), cap=4.4, sign_rate=0.0, tint=1)
skylight(80.5, 105.5, -299.0, -295.5, 31.8, colour="white", k=0.26, pitch=0.9)
podium(78.0, 108.0, -344.0, -310.0, 42.0, {"+x": "street", "+z": "party", "-z": "open", "-x": "back"}, 8353,
       nb={"+z": 31.8}, window=5, tint="teal", signs=False)
B.roof_dress(PL, 78.0, 108.0, -344.0, -310.0, 42.0, random.Random(8354), cap=4.4, sign_rate=0.0, tint=2)
lawn(81.0, 105.0, -329.0, -325.0, 42.0)
lit_band(78.0, 108.0, -344.0, -310.0, 42.8, 42.95, "teal", k=0.7, out=0.05)
checked(78.0, 108.0, -344.0, -310.0, 46.5, "B5b roof")
# The boulevard runs into this face: a screen across it, a mark over that.
screen(108.45, 19.0, -330.0, 15.0, 8.4, math.pi / 2, random.Random(8355), back=False)
mark("delta", "+x", (78.0, 108.0, -344.0, -310.0), 33.0, 6.0, "cyan")
tower("C1", 54.0, 74.0, -338.0, -292.0, 0.15, 46.0, 8356, cut=2.0, accent="teal", crown="blades", lit=0.7, warm=0.3,
      marks=(("bars", "+z", 38.0, 6.0, "teal"),))
podium(54.0, 106.0, -396.0, -348.0, 14.8, dict(ALL_OPEN), 8361, tint="charcoal", ground="blank")
parapet(54.0, 106.0, -396.0, -348.0, 14.8, tint=0, line="cyan")
tower("T1", 56.0, 78.0, -392.0, -352.0, 14.8, 76.0, 8362, steps=((60.0, 2.5),), cut=2.2, accent="amber", crown="blades",
      lit=0.74, warm=0.6, marks=(("delta", "+z", 68.0, 7.0, "amber"), ("delta", "+x", 68.0, 7.0, "amber")))
tower("T2", 84.0, 104.0, -392.0, -356.0, 14.8, 62.4, 8363, kind="wall", window=5, tint="teal", accent="teal", crown="garden", plant=0)
pool(86.0, 102.0, -354.5, -350.5, 14.8, colour="teal")
skylight(79.0, 83.0, -390.0, -356.0, 14.8, colour="cyan", k=0.26, pitch=0.8)
garden(56.0, 78.0, -351.5, -348.5, 14.8, random.Random(8364), palms=0, trees=2, colour="amber", lamps=1)
podium(54.0, 106.0, -452.0, -402.0, 18.2, dict(ALL_OPEN), 8371, tint="navy", ground="blank")
parapet(54.0, 106.0, -452.0, -402.0, 18.2, tint=1, line="white")
T3 = tower("T3", 58.0, 82.0, -448.0, -408.0, 18.2, 96.0, 8372, steps=((74.0, 2.5), (88.0, 5.0)), cut=2.6, accent="white", crown="halo",
           lit=0.76, warm=0.1, marks=(("rings", "+z", 81.0, 7.0, "white"), ("rings", "+x", 81.0, 7.0, "white")))
tower("T4", 88.0, 104.0, -448.0, -410.0, 18.2, 69.2, 8373, kind="wall", window=2, tint="charcoal", accent="magenta", crown="mast",
      marks=(("gate", "+z", 60.0, 6.0, "magenta"), ("gate", "+x", 60.0, 6.0, "magenta")), plant=2)
skylight(60.0, 100.0, -406.5, -403.0, 18.2, colour="cyan", k=0.26, pitch=0.8)
garden(82.6, 87.4, -446.0, -410.0, 18.2, random.Random(8374), palms=0, trees=3, colour="magenta", lamps=1)
# North of corpo row's first towers: two blocks, low enough to stay under
# the Experience shot's frame.
B.building(B.Lot(110.0, 136.0, -454.0, -422.0, "+z", dict(ALL_OPEN), {}, PL), 45.4, random.Random(8381),
           style=dict(OFFICE, roof_cap=4.4), setback=False, ground="blank", window=4, tint="concrete")
tower("S2", 142.0, 168.0, -454.0, -422.0, 0.15, 52.0, 8382, cut=2.2, accent="cyan", crown="blades", lit=0.7, warm=0.35,
      marks=(("hex", "+z", 43.0, 6.0, "cyan"),))

# The board's own block: a ridge of glass down the middle of its roof and
# a line of light round its parapet, both low and set back from the square
# (the Work shot looks up at this roof's edge and must not find them).
skylight(53.0, 103.0, -275.6, -272.6, 44.0, colour="cyan", k=0.22, pitch=0.9)
lawn(52.0, 70.0, -283.0, -279.0, 44.0)
# Vents that breathe: by the garden and the vending machines in the square,
# at the kerb of the x 120 road, and plant on three roofs.
for i, (x, y, z) in enumerate(((60.6, 0.17, -249.6), (53.6, 0.17, -259.6), (110.9, 0.17, -147.0), (129.2, 0.17, -47.0))):
    box((PL, "metal", 1), x - 0.45, x + 0.45, y - 0.02, y + 0.02, z - 0.45, z + 0.45, scale=0.5)
    empty(f"anchor_steam_street_plaza_{i}", (x, y + 0.05, z))
for i, (x, y, z) in enumerate(((98.0, 45.4, -104.0), (160.0, 58.0, -106.0), (98.0, 62.4, -360.0))):
    box((PL, "metal", 0), x - 0.7, x + 0.7, y, y + 1.6, z - 0.7, z + 0.7, scale=1.0)
    empty(f"anchor_steam_roof_plaza_{i}", (x, y + 1.7, z))
