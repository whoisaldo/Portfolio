"""No black voids, no bare walls: the forecourt under the middle deck, the
passage, the lanes and the piers, as the show's lived-in concrete.

Under the middle deck the forecourt was the darkest thing at the junction:
rows of tube battens on its soffit now (green and white, Fn9gKhU_2_Q@2),
caged lamps on the columns' backs, pools on the floor, and the floor has
what collects there: bags, crates, drums, cardboard, a mattress and people
sat on it, puddles. The deck's battens face the ground and the lamps face
north: neither is seen by the hero's lens at 755 m (its slot is this
forecourt's south face), only their pools on the walls, faintly.

weather() puts on a wall or a pier what the street leaves there: layered
posters, stencils, water run down from the joints, stains, stickers, a
hazard band at the foot (XMaaEjT0LhU@33, KvMY1uzSC1E@21).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B  # noqa: F401
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_finish import fposter
from ncw.districts.mega_base import M_TOP, M_COLS, E_COLS, COL_Z, FP, MZ

STENCILS = ("H4", "04", "02", "N-4", "C 12", "4-1", "07", "H4 >", "x 09", "13")


def weather(f, s0, s1, y0, y1, seed, posters=True, band=True, stencil=True):
    """What a street leaves on a stretch of wall s0..s1, y0..y1."""
    r = random.Random(seed)
    w = s1 - s0
    # Water run down from the top, and stains.
    s = s0 + r.uniform(0.2, 1.0)
    while s < s1 - 0.3:
        top = y1 - r.uniform(0.0, 0.6)
        f.quad((D, "trim", 1), s, s + r.uniform(0.15, 0.6), max(y0, top - r.uniform(1.2, 3.6)), top, 0.006, col=r.choice(((0.05, 0.05, 0.05, 1.0), dim(RUST, 0.45), (0.07, 0.08, 0.07, 1.0))))
        s += r.uniform(0.6, 2.4)
    for _ in range(max(1, int(w // 3))):
        sw, sh = r.uniform(0.6, 2.0), r.uniform(0.4, 1.4)
        ss, yy = r.uniform(s0, max(s0, s1 - sw)), r.uniform(y0, max(y0, min(y1, y0 + 3.0) - sh))
        f.quad((D, "trim", 1), ss, ss + sw, yy, yy + sh, 0.008, col=r.choice((dim(CONC, 0.55), (0.06, 0.06, 0.07, 1.0), dim(CREAM, 0.4))))
    # Posters pasted over each other, some torn, at walking height.
    if posters and w > 1.4:
        s = s0 + r.uniform(0.4, 1.0)
        while s < s1 - 0.9:
            n = r.choice((1, 2, 3))
            for i in range(n):
                fposter(f, min(s + i * 0.62, s1 - 0.5), r.uniform(1.6, 2.2) + 0.1 * i, r.uniform(0.55, 0.9), r.uniform(0.8, 1.2), r)
            s += n * 0.62 + r.uniform(1.2, 3.5)
    # Stickers at eye height.
    for _ in range(int(w // 1.2)):
        ss = r.uniform(s0 + 0.1, s1 - 0.25)
        f.quad((D, "trim", 1), ss, ss + r.uniform(0.08, 0.2), 1.3 + r.uniform(0, 0.6), 1.42 + r.uniform(0, 0.7), 0.012,
               col=r.choice((PALE, YEL_OLD, RED_PAINT, TEAL_PAINT, (0.6, 0.2, 0.45, 1.0))))
    if stencil and w > 1.0:
        ss = r.uniform(s0 + 0.5, max(s0 + 0.5, s1 - 1.0))
        x, y, z = f.p(f.at(ss), r.uniform(2.6, 3.4), 0.0)
        strokes((D, "trim", 1), r.choice(STENCILS), x, y, z, r.uniform(0.35, 0.6), f.yaw, r.choice((YEL_OLD, PALE, dim(RED_PAINT, 1.3))), weight=0.16, out=0.014)
    if band:
        f.quad((D, "trim", 1), s0, s1, G0, G0 + 0.3, 0.01, col=(0.05, 0.05, 0.055, 1.0))


def weather_box(x0, x1, z0, z1, y0, y1, seed, **kw):
    for i, f in enumerate(B.faces_of(x0, x1, z0, z1).values()):
        weather(f, 0.0, f.width, y0, y1, seed + i * 17, **kw)


# ---------------------------------------------------------------------------
# The forecourt under the middle deck.
# ---------------------------------------------------------------------------
SOFFIT = M_TOP - 0.7
_r = random.Random(5501)
for i, z in enumerate((-736.0, -739.6, -743.2, -746.8)):
    x = -15.4
    while x < 15.6:
        hue = "green" if (i + int(x // 3.5)) % 3 else "white"
        box((D, "glow", 0), x - 0.75, x + 0.75, SOFFIT - 0.07, SOFFIT - 0.01, z - 0.05, z + 0.05, scale=0.5, col=dim(GLOW[hue], 0.9), bottom=True)
        box((D, "metal", 1), x - 0.8, x + 0.8, SOFFIT - 0.01, SOFFIT, z - 0.08, z + 0.08, scale=0.5)
        x += 3.5
for (x, z, hue, pw) in ((-11.0, -738.0, "green", 7.0), (0.0, -737.5, "white", 6.0), (11.0, -738.0, "green", 7.0),
                        (-6.0, -744.0, "white", 5.6), (6.0, -744.0, "green", 5.6), (-15.0, -742.0, "white", 5.0), (15.0, -742.0, "white", 5.0)):
    light(D, x, SOFFIT - 0.5, z, hue, pw)
for x in M_COLS:
    wall_lamp(x, 3.4, COL_Z - 0.65, 0, -1, "amber", 4.4)
# What the floor collects: bags, crates, drums, cardboard, a mattress with
# somebody on it, people sat against the panels; puddles.
for (name, x, z, yaw) in (("bags", -14.2, -743.6, 0.4), ("bags", -13.4, -744.1, 1.9), ("crates", -9.8, -743.9, 0.1), ("drum", 9.6, -744.0, 0.0),
                          ("drum", 10.3, -743.7, 0.0), ("bags", 13.2, -743.8, 2.6), ("pallets", 15.6, -742.5, 0.3), ("rubbish", -3.4, -740.2, 0.0),
                          ("rubbish", 4.6, -737.2, 1.0), ("bags", 16.8, -737.0, 0.6), ("crates", -16.2, -737.4, 1.2)):
    P.place(name, x, G0, z, yaw)
for (x, z, w, d, col) in ((-7.4, -743.2, 1.1, 0.8, dim(CREAM, 0.7)), (7.2, -743.9, 0.9, 0.7, dim(CREAM, 0.6)), (-12.0, -739.0, 0.8, 0.6, dim(CREAM, 0.65))):
    tbox(x - w / 2, x + w / 2, G0, G0 + 0.04, z - d / 2, z + d / 2, col, detail=1)
tbox(-12.6, -10.6, G0, G0 + 0.18, -744.3, -743.4, (0.3, 0.26, 0.3, 1.0), detail=0)
stand(-11.7, -743.9, 0.0, "sit", G0 + 0.18)
stand(-10.9, -743.7, -0.3, "smoke", G0 + 0.18)
for (x, pose, yaw) in ((-15.2, "sit", 0.0), (-6.6, "squat", 0.2), (11.8, "sit", 0.0), (14.4, "lean", math.pi), (3.6, "phone", 0.6)):
    stand(x, FP + 0.55, yaw, pose, G0)
for (x, z, w, d) in ((-4.0, -738.6, 2.6, 1.4), (5.2, -741.2, 1.8, 1.1), (-9.2, -735.6, 2.0, 1.2), (12.0, -735.9, 1.4, 0.9)):
    hquad((D, "roof_wet", 0), x - w / 2, x + w / 2, z - d / 2, z + d / 2, G0 + 0.012, scale=4.0)
# The panels either side of the passage's mouth, and the columns.
fp = face("+z", FP, -18.0, 18.0)
# (In the hero's slot: paint only, no lit posters on what faces south.)
weather(fp, 0.4, 12.4, G0, 4.1, 5511, posters=False)
weather(fp, 23.6, 35.6, G0, 4.1, 5512, posters=False)
for k, x in enumerate(M_COLS + E_COLS):
    weather_box(x - 0.66, x + 0.66, COL_Z - 0.66, COL_Z + 0.66, G0 + 0.95, 4.2, 5520 + k, band=False, posters=x > 18.0)
# The lintel over the passage's mouth: a steel frame, bolt heads, a lamp.
tbox(-5.3, 5.3, 4.12, 4.3, FP - 0.02, FP + 0.2, STEEL, bottom=True)
for x in (-5.15, 5.15):
    tbox(x - 0.15, x + 0.15, 3.2, 4.3, FP, FP + 0.2, STEEL)
_x = -4.8
while _x < 4.9:
    for y in (3.42, 4.0):
        box((D, "trim", 1), _x - 0.04, _x + 0.04, y - 0.04, y + 0.04, FP + 0.06, FP + 0.1, scale=1.0, col=(0.22, 0.22, 0.2, 1.0))
    _x += 0.6

# ---------------------------------------------------------------------------
# The passage's floor and the court's: puddles, paper, a tide of rubbish
# along the walls, and pools from the tubes reaching the floor.
# ---------------------------------------------------------------------------
PX0, PX1 = PASSAGE
for (x, z, w, d) in ((-1.4, -751.4, 1.6, 2.2), (1.8, -755.8, 1.2, 1.6), (-0.6, -759.6, 2.2, 1.4)):
    hquad((D, "roof_wet", 0), x - w / 2, x + w / 2, z - d / 2, z + d / 2, G0 + 0.012, scale=4.0)
for (name, x, z, yaw) in (("rubbish", PX0 + 0.5, -749.6, 0.0), ("rubbish", PX1 - 0.5, -757.0, 1.4), ("bags", PX1 - 0.6, -762.0, 0.2),
                          ("rubbish", -6.0, -770.4, 0.8), ("rubbish", 9.4, -779.6, 2.0), ("bags", -11.6, -783.4, 0.4), ("crates", 11.2, -784.6, 0.0)):
    P.place(name, x, G0, z, yaw)
for (x, z) in ((-1.2, -748.4), (1.4, -753.4), (-1.8, -757.0), (0.9, -761.6)):
    tbox(x - 0.25, x + 0.25, G0, G0 + 0.01, z - 0.2, z + 0.2, dim(PALE, 0.8), detail=1)
light(D, 0.0, 3.9, -749.8, "green", 5.0)
for (x, z, pose, yaw) in ((PX0 + 0.5, -761.4, "sit", math.pi / 2), (PX1 - 0.5, -749.4, "sit", -math.pi / 2)):
    stand(x, z, yaw, pose, G0)
weather(face("+x", PX0 + 0.02, MB_ZF - 18.0, MB_ZF), 0.0, 18.0, G0, 3.9, 5531, band=False)
weather(face("-x", PX1 - 0.02, MB_ZF - 18.0, MB_ZF), 0.0, 18.0, G0, 3.9, 5532, band=False)

# ---------------------------------------------------------------------------
# The viaduct's piers east of the canyon and the avenue's portal piers' legs,
# the lane walls, the walls under the deck.
# ---------------------------------------------------------------------------
for k, px in enumerate((66.0, 80.0)):
    weather_box(px - 1.24, px + 1.24, RAIL_Z - 2.24, RAIL_Z + 2.24, 1.0, 6.0, 5541 + k)
weather_box(50.56, 53.44, RAIL_Z - 2.24, RAIL_Z + 2.24, 1.0, 6.0, 5543)

# ---------------------------------------------------------------------------
# The lane east of the canyon (x 44..52) and the back blocks' walls a walker
# meets: what the lane collects, cables and blades over it, green tube light
# on its walls, the walls weathered.
# ---------------------------------------------------------------------------
from ncw.districts.mega_finish import lane_wall  # noqa: E402
_rl = random.Random(5560)
z = -706.0
while z > -564.0:
    if abs(z - RAIL_Z) > 4.0:
        for _ in range(_rl.choice((1, 2, 2, 3))):
            side = _rl.choice((44.7, 51.3))
            P.place(_rl.choice(("bags", "rubbish", "crates", "rubbish", "drum", "pallets", "bags")), side + _rl.uniform(-0.2, 0.2), G0, z + _rl.uniform(-2.0, 2.0), _rl.uniform(0, 3.0))
        if _rl.random() < 0.5:
            w, d = _rl.uniform(1.2, 2.6), _rl.uniform(0.8, 2.4)
            cx = _rl.uniform(45.5, 50.5)
            hquad((D, "roof_wet", 0), cx - w / 2, cx + w / 2, z - d / 2, z + d / 2, G0 + 0.012, scale=4.0)
        if _rl.random() < 0.45:
            y = _rl.uniform(5.5, 12.0)
            cable((44.1, y, z), (51.9, y + _rl.uniform(-1.0, 1.0), z + _rl.uniform(-3.0, 3.0)), _rl.uniform(0.4, 1.2), r=0.018)
        if _rl.random() < 0.25:
            blade(_rl.choice((44.9, 51.1)), _rl.uniform(3.6, 5.2), z, _rl.choice(("bs", "bm")), along="x")
    z -= _rl.uniform(5.0, 9.0)
for z in (-700.0, -684.0, -668.0, -650.0, -632.0, -590.0, -572.0):
    tube_z(51.86, 3.4, z - 0.7, z + 0.7, "green" if int(z) % 3 else "white", power=4.2)
for (f, s0, s1, seed) in ((face("-x", 52.0, -676.0, -640.0), 0.5, 35.5, 5561), (face("+x", 44.0, -706.0, -562.0), 1.0, 143.0, 5562),
                          (face("-z", -594.0 - 0.01, 52.0, 76.0), 0.5, 23.5, 5564),
                          (face("+x", 76.0, -594.0, -564.0), 0.5, 29.5, 5565), (face("-x", 82.0, -590.0, -564.0), 0.5, 25.5, 5566)):
    weather(f, s0, s1, G0, 5.5, seed)
lane_wall(face("-x", 52.0, -676.0, -640.0), 5567, lamp_every=11.0)
