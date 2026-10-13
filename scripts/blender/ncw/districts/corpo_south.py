"""Corpo Row south of the boulevard: one block 248 m by 126 m between the
boulevard, the x 120 road and the plaza street, ending at x 380 where the
Afterlife Block's lots begin.

Along the boulevard, seven podium blocks with lobbies and showrooms, no
taller than the masses that stood there (the Experience shot looks over
them at the towers' crowns); behind them a mews; then the campus, six low
blocks under the shot's dolly (30 m up along z -230) whose roofs are its
foreground: a landing pad, a glass roof over an atrium, cooling plant,
gardens, all drawn in lines of light and none of it tall; a second mews;
and along the plaza street the district's back of house.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.corpo_kit import *  # noqa: F401,F403
from ncw.districts import corpo_kit as K

X0, X1 = 132.0, 379.6          # (a ledge or a lamp stands 0.35 m proud of a wall: nothing passes x 380)
LOT_S = -316.0                 # the boulevard's south lot line
S1_BACK = -290.0
MEWS_A = (-290.0, -284.0)
CAMPUS = (-284.0, -226.0)
MEWS_B = (-226.0, -220.0)
PLAZA_LOT = -190.0             # the plaza street's north lot line
KERB_S = -320.7
KERB_STRIP_S = KERB_S + 0.22   # the kerb's edge, clear of the crowd's line at z -320
# (The pavement's middle, z -318.7, between the crowd's two lines, is kept
# clear: the walk camera's line, and a walker's.)
# Lots along the boulevard (x0, x1, height: each no taller than the mass
# that stood there), and the lanes between them, which run on south through
# the campus.
S1 = [(132.0, 166.0, 22.0), (172.0, 206.0, 29.0), (212.0, 246.0, 36.0), (252.0, 286.0, 25.0), (292.0, 326.0, 32.0),
      (332.0, 366.0, 39.0), (370.0, X1, 28.0)]
LANES = [(166.0, 172.0), (206.0, 212.0), (246.0, 252.0), (286.0, 292.0), (326.0, 332.0)]
S1_ALLEYS = LANES + [(366.0, 370.0)]
CAMPUS_LOTS = [(132.0, 166.0), (172.0, 206.0), (212.0, 246.0), (252.0, 286.0), (292.0, 326.0), (332.0, X1)]
S3 = [(132.0, 170.0, 34.0), (176.0, 210.0, 44.0), (216.0, 250.0, 28.0), (256.0, 290.0, 46.0), (296.0, 330.0, 30.0), (336.0, X1, 40.0)]
S3_ALLEYS = [(170.0, 176.0), (210.0, 216.0), (250.0, 256.0), (290.0, 296.0), (330.0, 336.0)]

cells = [(X0, 380.0, MEWS_A[0], MEWS_A[1], "concrete"), (X0, 380.0, MEWS_B[0], MEWS_B[1], "concrete")]
cells += [(a, b, LOT_S, S1_BACK, "concrete") for a, b in S1_ALLEYS]
cells += [(a, b, CAMPUS[0], CAMPUS[1], "concrete") for a, b in LANES]
cells += [(a, b, MEWS_B[1], PLAZA_LOT, "concrete") for a, b in S3_ALLEYS]
ground(cells, X0, 380.0, LOT_S, PLAZA_LOT)


# ---------------------------------------------------------------------------
# The boulevard's south side.
# ---------------------------------------------------------------------------
def hall(x0, x1, tower_x, z, top=8.0):
    """A lobby on the south side, across the boulevard from a tower: the
    towers' own hall behind the glass (the site draws it 24.8 m wide round
    the tower's centre line), facing north."""
    a, b = max(x0, tower_x - 12.3), min(x1, tower_x + 12.3)
    quad(k("lobby"), (b, G0, z), (a, G0, z), (a, top, z), (b, top, z), col=(random.Random(int(a)).random(), 0.2, 1.0, 1.0))
    return a, b


def alley_gate(a, b, z, hue, r, facing=-1):
    """Across an alley's mouth: a slim steel portal, a line of light on it,
    a small sign hung under it askew, palms either side just inside."""
    f = facing
    for xx in (a + 0.1, b - 0.4):
        za, zb = sorted((z, z - f * 0.3))
        box(k("trim"), xx, xx + 0.3, G0, 5.6, za, zb, scale=1.0, col=K.BLACK)
    za, zb = sorted((z, z - f * 0.3))
    box(k("trim"), a + 0.1, b - 0.1, 5.2, 5.6, za, zb, scale=1.0, col=K.BLACK)
    zc, zd = sorted((z + f * 0.0, z + f * 0.05))
    K.neon_box(a + 0.5, b - 0.5, 5.32, 5.48, zc, zd, hue)
    K.st_blade((a + b) / 2 + r.uniform(-0.8, 0.8), 4.3, z - f * 0.15, "ps", math.radians(r.choice((-12, 0, 10)) + (180 if f < 0 else 0)))
    light(CO, (a + b) / 2, 4.6, z + f * 1.2, hue, 4.0)


def south_side():
    r = random.Random(7801)
    z0, z1 = LOT_S, S1_BACK
    DOCK = {"+z": "dock", "-x": "dock", "+x": "dock"}
    # a: the corner on junction E: glass to both streets, a crown set back.
    x0, x1, h = S1[0]
    K.corp_block(x0, x1, z0, z1, h, 7802, skin="glass", tiers=((0.82, 0.0), (1.0, 3.0)),
                 fronts={"-z": "glass", "-x": "glass", "+z": "dock", "+x": "dock"}, canopy=2.4, corners="cyan", edge="cyan",
                 lit=(0.6, 0.9))
    K.roof_plant(x0 + 4, x1 - 4, z0 + 4, z1 - 4, h, r, cap=3.0, tall=False)
    K.roof_lights(x0 + 4, x1 - 4, z0 + 4, z1 - 4, h, "amber", step=6.5)
    K.screen(x0 + 9.0, 13.6, z0 - 0.38, 9.0, 5.0, math.pi, r, pal=K.COLD)
    # b: showrooms under a deep podium, a ribbon-windowed block set back on
    # it behind a terrace.
    x0, x1, h = S1[1]
    K.corp_block(x0, x1, z0, z1, h, 7803, skin="glass+", sys=4, tint="navy", style=5, base=K.BASE + K.STOREY,
                 tiers=((1.0, (2.5, 2.5, 5.0, 0.0)),), fronts={"-z": "shop", **DOCK}, canopy=2.2, edge="amber", colour="white",
                 lit=(0.5, 0.85), warm=(0.4, 0.9), top_band="amber")
    terrace(x0 + 0.4, x1 - 0.4, z0 + 0.4, z0 + 4.6, K.BASE + K.STOREY, r)
    K.roof_plant(x0 + 4, x1 - 4, z0 + 7, z1 - 2, h, r, cap=4.0, tall=False)
    K.roof_lights(x0 + 4, x1 - 4, z0 + 7, z1 - 2, h, "cyan", step=6.5)
    # c: a hall like the towers' own behind a colonnade, a glass shaft with
    # fins over it, stepped.
    x0, x1, h = S1[2]
    K.corp_block(x0, x1, z0, z1, h, 7804, skin="glass", tiers=((0.62, (0.0, 0.0, 2.6, 0.0)), (1.0, (3.0, 3.0, 6.0, 0.0))),
                 fronts={"-z": "none", **DOCK}, fin_step=4.25, fin_faces=("-z",), edge="cyan", top_band="cyan", lit=(0.55, 0.9))
    colonnade(x0, x1, 226.0, z0, "cyan", r)
    K.roof_plant(x0 + 5, x1 - 5, z0 + 8, z1 - 2, h, r, cap=4.0, tall=False)
    K.roof_lights(x0 + 5, x1 - 5, z0 + 8, z1 - 2, h, "amber", step=6.5)
    K.screen(x0 + 12.0, 19.0, z0 + 2.6 - 0.38, 11.0, 6.0, math.pi, r, pal=K.COLD)
    # d: long and low, showrooms to the street, a garden on its roof.
    x0, x1, h = S1[3]
    K.corp_block(x0, x1, z0, z1, h, 7805, skin="windows", tint="teal", style=4, tiers=((0.55, 0.0), (1.0, (4.0, 4.0, 7.0, 0.0))),
                 fronts={"-z": "shop", **DOCK}, canopy=2.2, edge="cyan", colour="cyan", lit=(0.2, 0.42), warm=(0.1, 0.5))
    terrace(x0 + 0.4, x1 - 0.4, z0 + 0.4, z0 + 6.6, K.BASE + (h - K.BASE) * 0.55, r, trees=True)
    K.roof_plant(x0 + 6, x1 - 6, z0 + 9, z1 - 2, h, r, cap=3.0, tall=False)
    K.roof_lights(x0 + 6, x1 - 6, z0 + 9, z1 - 2, h, "cyan", step=6.5)
    # e: stacked and shifted glass boxes, warm lit.
    x0, x1, h = S1[4]
    K.corp_block(x0, x1, z0, z1, h, 7806, skin="glass",
                 tiers=((0.45, (0.0, 3.0, 2.0, 0.0)), (1.0, (4.0, 0.0, 4.5, 2.0))), fronts={"-z": "none", **DOCK},
                 edge="amber", colour="amber", top_band="amber", lit=(0.55, 0.9), warm=(0.5, 1.0))
    colonnade(x0, x1, 302.0, z0, "amber", r)
    K.roof_plant(x0 + 6, x1 - 2, z0 + 6, z1 - 4, h, r, cap=4.0, tall=False)
    K.roof_lights(x0 + 6, x1 - 2, z0 + 6, z1 - 4, h, "amber", step=6.5)
    K.screen(x0 + 21.0, 14.0, z0 + 2.0 - 0.38, 9.0, 5.0, math.pi, r, pal=K.COLD)
    # f: the tallest: a dark slab with a column of screens up its face, a
    # canopy over its door the width of the lot.
    x0, x1, h = S1[5]
    K.corp_block(x0, x1, z0, z1, h, 7807, skin="glass+", sys=5, tint="charcoal", style=5, tiers=((0.86, (0.0, 0.0, 1.6, 0.0)), (1.0, (3.0, 3.0, 4.6, 3.0))),
                 fronts={"-z": "glass", **DOCK}, canopy=3.2, corners="cyan", edge="cyan", colour="cyan", top_band="amber",
                 lit=(0.5, 0.8), warm=(0.3, 0.8))
    K.screen_stack(x0 + 8.0, z0 + 1.6 - 0.38, 10.5, 7.0, (5.0, 4.2, 5.6, 4.2), math.pi, r, pal=K.MEDIA)
    K.roof_plant(x0 + 5, x1 - 5, z0 + 7, z1 - 5, h, r, cap=3.5, tall=False)
    K.roof_lights(x0 + 5, x1 - 5, z0 + 7, z1 - 5, h, "cyan", step=6.5)
    # g: the end lot, its east face finished: the Afterlife Block's lots
    # stand against it from x 380.
    x0, x1, h = S1[6]
    K.corp_block(x0, x1, z0, z1, h, 7808, skin="windows", tint="navy", style=2, tiers=((1.0, 0.0),),
                 fronts={"-z": "glass", "-x": "dock", "+z": "dock", "+x": "blank"}, canopy=2.0, edge="amber", colour="amber",
                 lit=(0.2, 0.42), warm=(0.5, 1.0))
    # The alleys: a portal across each mouth, tubes of light down it, a
    # palm just inside, and in every other one a kiosk.
    for j, (a, b) in enumerate(S1_ALLEYS):
        hue = ("cyan", "amber", "white")[j % 3]
        alley_gate(a, b, z0 - 0.0, hue, r)
        for zz in (-311.0, -303.0, -295.0):
            K.hung_bar(a + 0.3, b - 0.3, 6.0, zz, hue)
            light(CO, (a + b) / 2, 5.2, zz, hue, 3.0)
        if b - a > 5:
            kiosked = j % 2 == 1
            P.place("planter_palm", b - 1.5 if kiosked else (a + b) / 2, G0, z0 + 2.4, district=CO)
            if kiosked:
                K.kiosk(a + 1.5, z0 + 1.9, math.pi, "cyan" if hue == "white" else hue, w=2.0, d=1.2)
                stand(a + 1.5, z0 + 0.75, 0.0, "phone")
            else:
                P.place("bench", a + 1.6, G0, z0 + 3.4, math.pi / 2, district=CO)
                stand(a + 1.6, z0 + 3.4, math.pi / 2, "sit", G0 + 0.45)
    # The pavement: its middle is the walker's own line, so what stands on
    # it is at the kerb's edge (bollards before each door, a totem and a
    # poster panel edge on to the kerb, a camera pole) or against the lot
    # line (a bench, a bin); and at each door security and somebody coming
    # or going.
    for j, (x0, x1, h) in enumerate(S1[:6]):
        cx = (x0 + x1) / 2
        hue = ("cyan", "white", "amber")[j % 3]
        K.bollards(cx - 6.0, cx + 6.0, KERB_STRIP_S + 0.06, step=3.0, proto="bollard")
        if j % 2 == 0:
            if j != 2:      # (the third lot's would stand 3 m before the lens of the lobby shot at (214, 2.2, -318))
                K.totem(x0 + 3.2, KERB_STRIP_S, math.pi, r, colour=hue, sizes=("bx", "bx"))
            P.place("bench", x1 - 7.0, G0, z0 - 0.4, math.pi, district=CO)
            stand(x1 - 7.0, z0 - 0.4, math.pi, "sit", G0 + 0.45)
        else:
            P.place("bin", x0 + 0.7, G0, z0 - 0.4, district=CO)
        P.place("cctv", x0 + 1.0, G0, KERB_STRIP_S, district=CO)
        K.st_blade(x1 - 0.6, 6.4 + (j % 3) * 0.9, z0 - 1.0, ("bl", "bm", "bl")[j % 3], math.radians(90 + (22 if j % 2 else -18)), bracket=(x1 - 0.6, z0))
        for dx in (-0.6, 0.6):
            P.place("lightbox", x0 + 13.0 + (j % 2) * 9.0 + dx, G0, KERB_STRIP_S, math.pi / 2, district=CO)
        stand(cx - 2.6, z0 - 0.75, math.pi, "idle")
        if j % 3 != 1:
            K.talk(cx + 6.0, z0 - 0.9, 0.7 * j)


def colonnade(x0, x1, tower_x, z, hue, r, depth=3.4, top=8.0):
    """A ground floor set back behind columns: the towers' kind of hall
    behind glass at the back, a lit soffit, a line of light along the
    podium's edge, planters between the columns, people."""
    zb = z + depth
    solid(x0, x0 + 0.6, 0.0, top, z, zb, K.STONE)
    solid(x1 - 0.6, x1, 0.0, top, z, zb, K.STONE)
    # The end walls' inner faces: a backlit poster in a frame under a lamp,
    # a line of the house's light up the wall's street edge.
    for j, fe in enumerate((B.Face("+x", x0 + 0.6, z, zb), B.Face("-x", x1 - 0.6, z, zb))):
        m = fe.width / 2 + 0.2
        ax, ay, az = fe.p(fe.at(m), 2.6, 0.14)
        K.advert(ax, ay, az, 1.6, 2.6, fe.yaw, int(x0) // 5 + j * 3 + 1, seed=0.41 + 0.04 * (int(x0) % 5), depth=0.1)
        fe.box(k("metal", 1), m - 0.45, m + 0.45, 4.3, 4.37, 0.0, 0.45)
        fe.box(k("glow", 1), m - 0.35, m + 0.35, 4.25, 4.3, 0.35, 0.42, col=GLOW["white"])
        fe.box(k("glow"), 0.12, 0.2, 0.3, top - 0.9, 0.0, 0.04, col=GLOW[hue])
        lx, _, lz = fe.p(fe.at(m), 0.0, 1.2)
        light(CO, lx, 3.4, lz, "white", 3.0)
    a, b = hall(x0 + 0.6, x1 - 0.6, tower_x, zb - 0.02, top - 0.6)
    for xa, xb in ((x0 + 0.6, a), (b, x1 - 0.6)):
        if xb - xa > 0.3:
            quad(k("corporate"), (xb, 0.5, zb - 0.02), (xa, 0.5, zb - 0.02), (xa, top - 0.6, zb - 0.02), (xb, top - 0.6, zb - 0.02),
                 ((0, 0), (xb - xa, 0), (xb - xa, top), (0, top)), K.glass_col(r, lit=(0.8, 1.0)))
    # The beam over the columns and the soffit behind it.
    box(k("trim"), x0, x1, top - 0.6, top, z, z + 0.5, scale=2.0, col=K.BLACK)
    K.neon_box(x0 + 0.3, x1 - 0.3, top - 0.66, top - 0.6, z - 0.04, z, hue)
    quad(k("trim"), (x0 + 0.6, top - 0.6, zb), (x1 - 0.6, top - 0.6, zb), (x1 - 0.6, top - 0.6, z + 0.5), (x0 + 0.6, top - 0.6, z + 0.5), col=K.STEEL)
    n = max(3, round((x1 - x0) / 6.8))
    for i in range(1, n):
        cx = x0 + (x1 - x0) * i / n
        box(k("trim"), cx - 0.28, cx + 0.28, G0, top - 0.6, z + 1.2, z + 1.76, scale=1.5, col=K.FRAME)
        K.glow_box(cx - 1.6, cx + 1.6, top - 0.66, top - 0.61, z + 2.0, z + 2.14, hue)
        light(CO, cx, top - 1.4, z + 1.2, hue, 3.5)
    K.paving_band(x0 + 0.6, x1 - 0.6, z, zb, K.STONE)
    # A dark fascia hung under the beam over the way in, the house's mark
    # raised on it; before the hall's glass, either side of the doors, dark
    # fins; gates across the way in.
    mid = (x0 + x1) / 2
    c = GLOW[hue]
    box(k("trim"), mid - 7.0, mid + 7.0, 5.0, top - 0.6, z + 0.04, z + 0.4, scale=1.0, col=K.FRAME, bottom=True)
    K.mark3d(3 if hue == "cyan" else 1, mid, (5.0 + top - 0.6) / 2, z + 0.04, 1.9, math.pi, c, depth=0.22)
    for sx in (-1, 1):
        K.bar2d(mid, (5.0 + top - 0.6) / 2, z + 0.04, math.pi, (sx * 2.2, 0.0), (sx * 6.4, 0.0), 0.08, 0.05, (c[0] * 0.6, c[1] * 0.6, c[2] * 0.6, 1.0))
    K.glow_box(mid - 6.9, mid + 6.9, 4.93, 5.0, z + 0.1, z + 0.2, hue)
    fg = B.Face("-z", zb - 0.02, x0 + 0.6, x1 - 0.6)
    wg = fg.width
    for side, (a, b) in enumerate(((0.3, wg / 2 - 3.4), (wg / 2 + 3.4, wg - 0.3))):
        fg.box(k("trim"), a, b, 0.0, top - 0.6, 0.02, 0.3, col=K.FRAME)
        m = (a + b) / 2
        if side == 0:
            # A showroom window: a lit room behind glass, a mullion, a sill.
            fg.quad(k("shop"), m - 2.4, m + 2.4, 0.55, 3.3, 0.31, col=(r.uniform(0.7, 0.95), 0.92 if hue == "cyan" else 0.2, 1.0, 1.0))
            for u in (m - 0.8, m + 0.8):
                fg.box(k("trim", 1), u - 0.04, u + 0.04, 0.55, 3.3, 0.31, 0.36, col=K.BLACK)
            fg.box(k("trim", 1), m - 2.5, m + 2.5, 0.45, 0.55, 0.3, 0.42, col=K.STEEL)
        else:
            # A backlit advert in the wing, framed.
            ax, ay, az = fg.p(fg.at(m), 2.2, 0.42)
            K.advert(ax, ay, az, 4.4, 2.6, fg.yaw, int(x0) // 9, seed=0.27 + 0.05 * (int(x0) % 7), depth=0.1)
        fg.box(k("glow", 1), m - 2.5, m + 2.5, 3.7, 3.76, 0.3, 0.36, col=c)
        for u in (a + 0.5, b - 0.5):
            fg.box(k("glow"), u - 0.04, u + 0.04, 0.5, top - 1.3, 0.3, 0.33, col=(c[0] * 0.7, c[1] * 0.7, c[2] * 0.7, 1.0))
    for sx in (-1.6, 0.0, 1.6):
        for px in (-0.55, 0.55):
            box(k("trim"), mid + sx + px - 0.09, mid + sx + px + 0.09, G0, G0 + 2.3, z + 2.3, z + 2.9, scale=1.0, col=K.BLACK)
            K.glow_box(mid + sx + px - math.copysign(0.11, px), mid + sx + px - math.copysign(0.09, px), G0 + 0.2, G0 + 2.2, z + 2.3, z + 2.36, hue, 1)
        box(k("trim"), mid + sx - 0.64, mid + sx + 0.64, G0 + 2.3, G0 + 2.45, z + 2.3, z + 2.9, scale=1.0, col=K.BLACK)
    K.light_strip_ground(x0 + 0.8, x1 - 0.8, z + 0.95, z + 1.03, hue)
    K.planter(x0 + 1.2, x0 + 4.6, z + 2.0, z + 3.0, lit=hue)
    K.planter(x1 - 4.6, x1 - 1.2, z + 2.0, z + 3.0, lit=hue)
    cx = (x0 + x1) / 2
    stand(cx - 3.0, z + 2.4, math.pi, "idle")
    stand(cx + 3.2, z + 2.5, math.pi, "idle")
    P.place("bench", x0 + 7.4, G0, zb - 0.95, math.pi, district=CO)
    stand(x0 + 7.4, zb - 0.95, math.pi, "sit", G0 + 0.45)
    stand(x0 + 5.6, z + 2.3, math.radians(150), "phone")
    K.talk(x1 - 7.0, z + 2.2, 0.4, 2)


def terrace(x0, x1, z0, z1, y, r, trees=False):
    """A podium's roof terrace toward the boulevard: paving, planters with
    hedges along its edge, a bench or two, somebody at the rail."""
    K.paving_band(x0, x1, z0, z1, K.PALE, y=y + 0.012)
    n = max(2, int((x1 - x0) // 9))
    for i in range(n):
        a = x0 + 0.6 + (x1 - x0 - 1.2) * i / n
        K.planter(a + 0.5, a + (x1 - x0 - 1.2) / n - 1.5, z0 + 0.7, z0 + 1.7, y=y, h=0.45, hedge=0.6)
        if trees and i % 2 == 0:
            P.place("planter_tree", a + 2.0, y, z1 - 1.4, district=CO)
    K.light_strip_ground(x0 + 0.5, x1 - 0.5, z1 - 0.3, z1 - 0.22, "cyan", y=y + 0.024)
    stand(x0 + (x1 - x0) * 0.3, z0 + 0.45, math.pi, "lean", y)
    stand(x0 + (x1 - x0) * 0.62, z0 + 2.6, math.radians(140), "phone", y)
    K.talk(x0 + (x1 - x0) * 0.8, z0 + 2.8, 0.3, 2, y=y)


# ---------------------------------------------------------------------------
# The campus under the Experience shot's dolly: low, every roof finished.
# ---------------------------------------------------------------------------
def west_fronts(x, z0, z1, top, r):
    """The first campus block's face on the x 120 road, 58 m of it, as
    three fronts, none like the next or like the corner lot's lobby north
    of the mews: a lobby in amber behind a portal that stands a metre out
    of the wall, no canopy; a service bay, bare concrete, a shuttered way
    in framed in hazard yellow under a red lamp, louvres over it; a
    showroom lit white under a low awning, its sign over that."""
    cuts = (z0, z0 + 22.0, z0 + 40.0, z1)
    # 1: the lobby.
    f = B.Face("-x", x, cuts[0], cuts[1])
    w = f.width
    f.quad(k("trim"), 0.0, w, SHOP_H, top, 0.0, col=K.STONE)
    K.front(f, top, "glass", random.Random(7831), 1, "amber", 0.0)
    for a, b in ((w / 2 - 5.0, w / 2 - 4.3), (w / 2 + 4.3, w / 2 + 5.0)):
        f.box(k("trim"), a, b, 0.0, 8.2, 0.0, 1.0, col=K.BLACK)
    f.box(k("trim"), w / 2 - 5.0, w / 2 + 5.0, 7.4, 8.2, 0.0, 1.0, col=K.BLACK)
    f.box(k("neon_amber"), w / 2 - 4.3, w / 2 + 4.3, 7.32, 7.4, 0.9, 1.0)
    for a in (w / 2 - 4.26, w / 2 + 4.2):
        f.box(k("neon_amber"), a, a + 0.06, 0.4, 7.3, 0.9, 1.0)
    px, _, pz = f.p(f.at(w / 2), 0.0, 1.6)
    light(CO, px, 5.0, pz, "amber", 6.0)
    sx, _, sz = f.p(f.at(1.2), 0.0, 0.9)
    K.st_blade(sx, 8.6, sz, "bl", f.yaw + math.pi / 2, bracket=f.p(f.at(1.2), 0.0, 0.0)[::2])
    # 2: the service bay.
    f = B.Face("-x", x, cuts[1], cuts[2])
    w = f.width
    f.quad(k("castconcrete"), 0.0, w, SHOP_H, top, 0.0, col=(0.17, 0.17, 0.175, 1.0))
    K.front(f, top, "dock", random.Random(7832), 1)
    f.box(k("trim"), w / 2 - 3.6, w / 2 + 3.6, 0.0, 5.0, 0.0, 0.14, col=K.BLACK)
    f.quad(k("door_panel"), w / 2 - 3.2, w / 2 + 3.2, G0, 4.6, 0.15)
    for a, b in ((w / 2 - 3.6, w / 2 - 3.2), (w / 2 + 3.2, w / 2 + 3.6)):
        f.box(k("trim", 1), a, b, G0, 4.6, 0.14, 0.2, col=K.YELLOW)
    f.box(k("trim", 1), w / 2 - 3.6, w / 2 + 3.6, 4.6, 5.0, 0.14, 0.2, col=K.YELLOW)
    f.box(k("neon_red"), w / 2 - 0.3, w / 2 + 0.3, 5.3, 5.5, 0.0, 0.2)
    for yy in (6.6, 8.2, 9.8):
        f.box(k("dark", 1), 1.0, w - 1.0, yy, yy + 1.1, 0.0, 0.1)
    px, _, pz = f.p(f.at(w / 2), 0.0, 1.5)
    light(CO, px, 4.0, pz, "red", 5.0)
    K.services(f, r, top, 0.8)
    # 3: the showroom.
    f = B.Face("-x", x, cuts[2], cuts[3])
    w = f.width
    f.quad(k("trim"), 0.0, w, SHOP_H, top, 0.0, col=K.PALE)
    K.front(f, top, "shop", random.Random(7833), 1, "white", 1.7)
    cx, cy, cz = f.p(f.at(w / 2), SHOP_H + 2.3, 0.1)
    sw, sh = ST_SIZES["pm"]
    f.box(k("board_frame"), w / 2 - sw - 0.1, w / 2 + sw + 0.1, SHOP_H + 2.3 - sh - 0.1, SHOP_H + 2.3 + sh + 0.1, 0.0, 0.09)
    sign(K.st_id("pm"), cx, cy, cz, sw * 2, sh * 2, f.yaw, district=CO, label=False)
    # A pier between each pair, proud of both.
    for zc in cuts[1:3]:
        box(k("trim"), x - 0.35, x, 0.0, top, zc - 0.5, zc + 0.5, scale=2.0, col=K.BLACK)


def campus_block(i, x0, x1, r):
    z0, z1 = CAMPUS
    west_street = i == 0
    east_end = i == len(CAMPUS_LOTS) - 1
    fronts = {"-z": "shop", "+z": "dock", "-x": "none" if west_street else ("dock" if i % 2 else "blank"),
              "+x": "blank" if east_end else ("dock" if i % 2 else "blank")}
    if west_street:
        west_fronts(x0, z0, z1, 11.8, r)
    hue = ("cyan", "amber")[i % 2]
    # The podium, and on its north half an upper block of two or three
    # floors; the south half, under the dolly, stays a roof.
    upper = (19.4, 23.2, 19.4, 23.2, 19.4, 23.2)[i]
    zs = (-250.0, -256.0, -262.0, -248.0, -258.0, -252.0)[i]     # where the upper block ends
    K.podium_walls(x0, x1, z0, z1, 11.8, fronts, r, 1, hue, 2.2)
    for name, f in B.faces_of(x0, x1, z0, z1).items():
        if fronts[name] in ("dock", "blank"):
            f.quad(k("corporate"), 1.0, f.width - 1.0, 8.4, 11.4, 0.03, col=K.glass_col(r, lit=(0.5, 0.9)))
    gcol = K.glass_col(r, lit=(0.5, 0.9), warm=(0.0, 0.6))
    K.glass(x0 + 2.0, x1 - 2.0, z0 + 2.0, zs, 11.8, upper, gcol)
    K.parapet(x0 + 2.0, x1 - 2.0, z0 + 2.0, zs, upper, col=K.STONE, h=0.8, edge=hue)
    K.roof_plant(x0 + 4.0, x1 - 4.0, z0 + 4.0, zs - 2.0, upper, r, cap=2.6, tall=False, lamps=False)
    K.parapet(x0, x1, z0, z1, 11.8, col=K.STONE, h=0.9, edge="cyan" if hue == "amber" else "amber")
    B.ROOFS.append((CO, x0, x1, zs, z1, 11.8))
    return zs


def campus():
    r = random.Random(7821)
    z0, z1 = CAMPUS
    y = 11.8
    for i, (x0, x1) in enumerate(CAMPUS_LOTS):
        zs = campus_block(i, x0, x1, r)
        cx = (x0 + x1) / 2
        a, b = zs + 2.0, z1 - 2.0          # the open roof, under the dolly
        K.roof_lights(x0, x1, zs, z1, y, ("amber", "cyan")[i % 2], step=6.5)
        # A guard rail inside the parapet along its south and west walks, a
        # tank and aerials by the upper block's wall (nothing over 15 m).
        xr = x0 + 2.0
        while xr < x1 - 2.0:
            P.place("railing", xr + 1.0, y, z1 - 1.3, 0.0, district=CO)
            xr += 2.0
        P.place("tank_roof", x1 - 3.4, y, zs + 2.2, district=CO)
        for dx in (2.6, 4.0):
            P.place("antenna", x0 + dx, y, zs + 1.2, 0.5 * i + dx, sy=0.5, district=CO)
        P.place("ac_roof", x0 + 6.0, y, zs + 1.4, district=CO)
        P.place("ac_roof", x0 + 7.6, y, zs + 1.4, district=CO)
        if i == 0:
            # A garden: hedged beds, trees, benches, a lit path.
            K.paving_band(x0 + 1.5, x1 - 1.5, a, b, K.PALE, y=y + 0.012)
            for j in range(3):
                zz = a + 2.0 + j * 7.0
                K.planter(x0 + 3.0, cx - 2.0, zz, zz + 1.6, y=y, h=0.45, hedge=0.7, lit="cyan")
                K.planter(cx + 2.0, x1 - 3.0, zz + 3.4, zz + 5.0, y=y, h=0.45, hedge=0.7, lit="cyan")
                P.place("planter_tree", x0 + 5.0 + j * 9.0, y, b - 2.0, district=CO)
            K.light_strip_ground(cx - 0.05, cx + 0.05, a + 0.5, b - 0.5, "cyan", y=y + 0.024)
            P.place("bench", cx + 1.2, y, a + 9.0, math.pi / 2, district=CO)
            stand(cx + 1.2, a + 9.0, math.pi / 2, "sit", y + 0.45)
            K.talk(cx - 4.0, a + 6.0, 0.2, 3, y=y)
            stand(x0 + 1.4, a + 12.0, -math.pi / 2, "lean", y)
        elif i == 1:
            # A landing pad, its lamps green, a hut and a windsock mast.
            K.pad(cx, (a + b) / 2, y, r=9.0, colour="green")
            K.solid(x0 + 2.5, x0 + 6.0, y, y + 2.5, a, a + 3.0, K.STONE)
            K.panel(x0 + 6.02, y + 1.3, a + 1.5, 1.6, 1.4, math.pi / 2, "amber", 0.6)
            K.aviation(x0 + 3.0, y + 2.5, a + 0.5)
            K.aviation(x1 - 2.0, y + 0.9, b + 1.5)
            stand(x0 + 7.0, a + 1.6, math.pi / 2, "idle", y)
            stand(cx + 10.5, (a + b) / 2 + 6.0, -math.pi / 2, "phone", y)
        elif i == 2:
            # A glass roof over the atrium, a walk round it between hedges.
            K.skylight(x0 + 9.0, x1 - 9.0, a + 6.0, b - 6.0, y, rise=1.8, colour="cyan", nx=4, nz=5)
            for zz in (a + 0.6, b - 1.6):
                K.planter(x0 + 3.0, x1 - 3.0, zz, zz + 1.0, y=y, h=0.4, hedge=0.6)
            for xx in (x0 + 4.0, x1 - 5.0):
                K.planter(xx, xx + 1.0, a + 4.0, b - 4.0, y=y, h=0.4, hedge=0.6, lit="cyan")
            K.paving_band(x0 + 5.6, x1 - 5.6, a + 2.4, b - 2.4, K.PALE, y=y + 0.012)
            for bz_ in (a + 4.0, b - 4.0):
                P.place("bench", (x0 + x1) / 2, y, bz_, 0.0 if bz_ < (a + b) / 2 else math.pi, district=CO)
            stand((x0 + x1) / 2, a + 4.0, 0.0, "sit", y + 0.45)
            K.talk(x0 + 3.6, (a + b) / 2, 1.0, 2, y=y)
            stand(x1 - 4.2, a + 8.0, -math.pi / 2, "lean", y)
        elif i == 3:
            # Cooling plant in rows, ducts between, a catwalk's rail.
            for ix in range(4):
                for iz in range(2):
                    K.chiller(x0 + 4.0 + ix * 7.2, x0 + 9.0 + ix * 7.2, a + 2.0 + iz * 7.0, a + 5.2 + iz * 7.0, y, h=2.2)
            K.duct_run([(x0 + 3.0, y + 0.6, a + 6.1), (x1 - 3.0, y + 0.6, a + 6.1)], r=0.35)
            K.duct_run([(x1 - 3.0, y + 0.6, a + 6.1), (x1 - 3.0, y + 0.6, b - 1.5)], r=0.35)
            for ix in range(3):
                K.cooler(x0 + 7.0 + ix * 9.0, b - 5.0, y, r=1.8, h=2.6)
            K.rail(x0 + 2.0, a + 13.6, x1 - 2.0, a + 13.6, y, "amber", glow=True)
            K.steam("campus", x0 + 16.0, y + 2.8, b - 5.0, roof=True)
            stand(x0 + 12.0, a + 14.4, 0.0, "idle", y)
        elif i == 4:
            # A terrace bar's garden: trees, benches, low lamps, people.
            K.paving_band(x0 + 1.5, x1 - 1.5, a, b, K.PALE, y=y + 0.012)
            for j, (px, pz) in enumerate(((x0 + 5.0, a + 3.0), (x1 - 5.0, a + 6.0), (x0 + 8.0, b - 4.0), (x1 - 8.0, b - 3.0), (cx, a + 12.0))):
                P.place("planter_tree", px, y, pz, district=CO)
            K.planter(x0 + 2.0, x1 - 2.0, b - 1.4, b - 0.4, y=y, h=0.45, hedge=0.6, lit="amber")
            for bx_, bz_, yaw in ((cx - 5.0, a + 8.0, 0.0), (cx + 5.0, a + 15.0, math.pi), (cx - 8.0, b - 8.0, math.pi / 2)):
                P.place("bench", bx_, y, bz_, yaw, district=CO)
                stand(bx_, bz_, yaw, "sit", y + 0.45)
            K.talk(cx + 2.0, a + 5.0, 0.5, 3, y=y)
            K.talk(cx - 3.0, b - 6.0, 1.2, 2, y=y)
            stand(x1 - 1.4, a + 10.0, math.pi / 2, "lean", y)
            for px, pz in ((cx - 9.0, a + 4.0), (cx + 9.0, b - 9.0), (cx, a + 18.0)):
                K.glow_box(px - 0.1, px + 0.1, y, y + 0.9, pz - 0.1, pz + 0.1, "amber", 1)
        else:
            # A second pad, smaller, and a field of dishes.
            K.pad(x0 + 13.0, (a + b) / 2 + 1.0, y, r=7.5, colour="cyan")
            for ix in range(3):
                for iz in range(3):
                    P.place("dish", x1 - 16.0 + ix * 5.0, y, a + 3.0 + iz * 6.5, 0.6 + 0.4 * ix, district=CO)
            K.chiller(x1 - 9.0, x1 - 3.0, b - 5.0, b - 2.0, y, h=2.0)
            stand(x0 + 22.5, (a + b) / 2, math.pi / 2, "idle", y)
    # The lanes through the campus and the two mews: tubes of light across
    # them, low lamps, benches, palms at the crossings, people.
    for j, (a, b) in enumerate(LANES):
        cx = (a + b) / 2
        hue = ("cyan", "white", "amber")[j % 3]
        for zz in range(-278, -228, 10):
            K.hung_bar(a + 0.2, b - 0.2, 5.4, zz, hue, reach=0.2)
            light(CO, cx, 4.8, zz, hue, 3.0)
        P.place("planter_palm", cx, G0, MEWS_A[0] + 3.0, district=CO)
        P.place("planter_tree", cx, G0, MEWS_B[0] + 3.0, district=CO)
        P.place("bench", cx, G0, -262.0 + j * 4.0, math.pi / 2, district=CO)
        if j % 2 == 0:
            stand(cx, -262.0 + j * 4.0, math.pi / 2, "sit", G0 + 0.45)
        K.talk(cx + 0.6, -244.0 - j * 3.0, 0.4 * j, 2)
    for mz, hue in ((sum(MEWS_A) / 2, "white"), (sum(MEWS_B) / 2, "amber")):
        x = X0 + 10.0
        while x < X1 - 6.0:
            P.place("lamp_short", x, G0, mz + 2.2, district=CO)
            x += 28.0
        K.light_strip_ground(X0 + 1.0, X1 - 1.0, mz - 0.04, mz + 0.04, "cyan" if hue == "white" else "amber")
    K.steam("mews", 229.0, G0 + 0.1, MEWS_B[0] + 3.0)
    for x, pose in ((150.0, "smoke"), (190.0, "phone"), (232.0, "idle"), (270.0, "smoke"), (310.0, "lean"), (352.0, "phone")):
        stand(x, MEWS_A[0] + 0.7, 0.0, pose)
        stand(x + 11.0, MEWS_B[1] - 0.7, math.pi, "smoke" if pose != "smoke" else "squat")


# ---------------------------------------------------------------------------
# The plaza street's north side: the district's back of house.
# ---------------------------------------------------------------------------
STYLE_S3 = dict(windows=(2, 4, 5, 5), lit=(0.4, 0.85), warmth=(0.1, 0.6), tints=("navy", "teal", "charcoal", "concrete"),
                balcony=0.0, ac=0.04, signs=0.45, awning=0.0, shop_sign=0.4, canopy=0.6, roof_cap=4.9, setback=0.6,
                fire_escape=0.0, cornice=0.2, pipes=0.25, roof_sign=0.25, shop_colours=["cyan", "white", "teal", "blue"])


ROOF_TOPS = {}


def roof_board(j):
    """A billboard standing on a plaza street lot's roof, turned to the
    street, seen to stand: four legs, raking struts behind it down to the
    roof, a catwalk along its foot, its frame lit. (The generator's own
    roof boards are off on this row: roof_cap under 5.)"""
    tx0, tx1, tz0, tz1, top = ROOF_TOPS[j]
    cx, cz = (tx0 + tx1) / 2, tz1 - 4.0
    bw, bh = min(14.0, (tx1 - tx0) * 0.6), 5.6
    by = top + 3.0 + bh / 2
    K.advert(cx, by, cz, bw, bh, 0.0, 5, seed=0.2, depth=0.3)
    K.advert(cx, by, cz - 0.42, bw, bh, math.pi, 2, seed=0.2, depth=0.02)
    K.edge_line(cx - bw / 2 - 0.2, cx + bw / 2 + 0.2, cz - 0.4, cz + 0.02, by + bh / 2 + 0.2, "cyan", h=0.1, out=0.02)
    for du in (-bw * 0.42, -bw * 0.14, bw * 0.14, bw * 0.42):
        box(k("steel"), cx + du - 0.12, cx + du + 0.12, top, by - bh / 2, cz - 0.34, cz - 0.1, scale=1.0, col=K.STEEL)
        pipe(k("steel"), (cx + du, by + bh * 0.3, cz - 0.4), (cx + du, top, cz - 4.2), 0.07, segs=5, col=K.STEEL)
        pipe(k("steel", 1), (cx + du, top + 2.6, cz - 0.4), (cx + du, top + 2.6, cz - 2.3), 0.05, segs=4, col=K.STEEL)
    box(k("metal", 1), cx - bw / 2, cx + bw / 2, top + 2.6, top + 2.68, cz - 1.3, cz - 0.4, scale=1.0)
    K.rail(cx - bw / 2, cz - 1.3, cx + bw / 2, cz - 1.3, top + 2.68, "amber")
    for du in (-bw * 0.3, bw * 0.3):
        light(CO, cx + du, by - bh / 2, cz + 2.0, "cyan", 4.0)
    K.aviation(cx - bw / 2, by + bh / 2 + 0.3, cz - 0.2)
    K.aviation(cx + bw / 2, by + bh / 2 + 0.3, cz - 0.2)


def plaza_side():
    r = random.Random(7841)
    for j, (x0, x1, h) in enumerate(S3):
        sides = {"+z": "street", "-z": "open", "-x": "street" if j == 0 else "open", "+x": "open"}
        lot = B.Lot(x0, x1, MEWS_B[1], PLAZA_LOT, "+z", sides, {}, CO)
        tiers = B.building(lot, h, random.Random(7850 + j), style=STYLE_S3, ground="shops")
        tx0, tx1, tz0, tz1, _, top = tiers[-1]
        ROOF_TOPS[j] = (tx0, tx1, tz0, tz1, top)
        K.edge_line(tx0, tx1, tz0, tz1, top + 0.86, ("cyan", "amber")[j % 2], h=0.1)
        # (Behind the roof board on the tallest, the plant keeps to the back.)
        K.roof_plant(tx0 + 1.2, tx1 - 1.2, tz0 + 1.2, tz1 - (7.5 if j == 3 else 1.2), top, r, cap=6.0, density=0.8, lamps=False)
        for cxx, czz in ((tx0 + 0.3, tz0 + 0.3), (tx1 - 0.3, tz1 - 0.3)):
            K.aviation(cxx, top + 1.0, czz)
    # A screen on the corner lot's west face, to the x 120 road, and one on
    # the tallest lot's street face.
    K.screen(X0 - 0.4, 20.0, -205.0, 10.0, 5.6, -math.pi / 2, r, pal=K.COLD)
    K.screen(273.0, 30.0, PLAZA_LOT + 0.4, 12.0, 6.4, 0.0, r, pal=K.COLD)
    roof_board(3)
    # Where the street looks straight at the tallest lot's foot: a way in
    # eight metres wide, built (its doors, its colour, its mark), a canopy
    # over it, security on the door.
    fe = B.Face("+z", PLAZA_LOT, S3[3][0], S3[3][1])
    K.door_portal(fe, 24.0, "amber", 2, half=2.2, top=5.4, out=0.4, wings=2.0)
    fe.box(k("trim"), 19.4, 28.6, 5.4, 5.62, 0.0, 1.5, col=K.BLACK)
    fe.box(k("neon_amber"), 19.6, 28.4, 5.34, 5.4, 1.38, 1.46)
    stand(277.2, PLAZA_LOT + 0.75, 0.0, "idle")
    stand(283.0, PLAZA_LOT + 0.8, math.radians(-20), "phone")
    for j, (a, b) in enumerate(S3_ALLEYS):
        hue = ("amber", "cyan")[j % 2]
        alley_gate(a, b, PLAZA_LOT, hue, r, facing=1)
        for zz in (-197.0, -206.0, -215.0):
            K.hung_bar(a + 0.3, b - 0.3, 6.0, zz, hue)
            light(CO, (a + b) / 2, 5.2, zz, hue, 3.0)
        stand(a + 0.8, -200.0 - j, math.pi / 2, "smoke" if j % 2 else "phone")


def west_pavement():
    """The x 120 road's east pavement, which the loop's walker comes up
    before turning onto the boulevard: its middle left clear; bollards
    before the doors and poster panels edge on at the kerb, a bench and a
    bin against the lot line, palms at the two mews' mouths, people."""
    r = random.Random(7861)
    xk, xl = 128.52, 131.6          # the kerb's edge; against the lot line
    for z in (-300.0, -270.0, -240.0):
        K.bollards_z(z - 4.0, z + 4.0, xk + 0.06, step=2.0, proto="bollard")
    for j, z in enumerate((-308.0, -280.0, -252.0, -212.0)):
        K.ad_panel(xk, z, math.pi / 2, r, pal=K.COLD if j % 2 == 0 else None)
    P.place("bench", xl, G0, -262.0, -math.pi / 2, district=CO)
    stand(xl, -262.0, -math.pi / 2, "sit", G0 + 0.45)
    P.place("bin", xl, G0, -236.0, district=CO)
    for mz in (sum(MEWS_A) / 2, sum(MEWS_B) / 2):
        P.place("planter_palm", X0 + 2.2, G0, mz, district=CO)
    for z, pose in ((-246.0, "idle"), (-266.0, "idle"), (-299.0, "phone")):
        stand(X0 - 0.75, z, -math.pi / 2, pose)
    K.talk(X0 - 0.9, -288.0, 0.6, 2)
    K.totem(xk, -226.5, math.pi / 2, r, colour="cyan", sizes=("bx", "bx"))


def plaza_pavement():
    """The plaza street's north pavement: poster panels edge on at the
    kerb, bollards, somebody at every other door."""
    r = random.Random(7871)
    zk = -186.52
    for j, (x0, x1, h) in enumerate(S3):
        cx = (x0 + x1) / 2
        K.ad_panel(x0 + 6.0, zk, 0.0, r, pal=None if j % 2 else K.WARM)
        K.bollards(cx - 4.0, cx + 4.0, zk - 0.06, step=2.0, proto="bollard")
        if j % 2 == 0:
            stand(cx + 2.0, PLAZA_LOT + 0.7, 0.0, "smoke" if j % 4 else "phone")
        else:
            K.talk(cx - 3.0, PLAZA_LOT + 0.85, 0.5 * j, 2)
        P.place("cctv", x1 - 1.0, G0, zk, district=CO)


def lanes():
    """The two mews, the campus's lanes, the alleys: their walls dressed
    and lit, tubes of light across the mews."""
    r = random.Random(7881)
    for j, (x0, x1, h) in enumerate(S1):
        K.lane_dress(B.Face("+z", S1_BACK, x0, x1), r, high=(18.0, 27.0, 34.0, 14.0, 14.0, 33.0, 26.0)[j])
        if j > 0:
            K.lane_dress(B.Face("-x", x0, LOT_S, S1_BACK), r, 0.8)
        if j < len(S1) - 1:
            K.lane_dress(B.Face("+x", x1, LOT_S, S1_BACK), r, 0.8)
    for j, (x0, x1) in enumerate(CAMPUS_LOTS):
        K.lane_dress(B.Face("+z", CAMPUS[1], x0, x1), r)
        if j > 0:
            K.lane_dress(B.Face("-x", x0, CAMPUS[0], CAMPUS[1]), r, 0.8)
        if j < len(CAMPUS_LOTS) - 1:
            K.lane_dress(B.Face("+x", x1, CAMPUS[0], CAMPUS[1]), r, 0.8)
    for j, (x0, x1, h) in enumerate(S3):
        K.lane_dress(B.Face("-z", MEWS_B[1], x0, x1), r, high=h - 2.0)
        if j > 0:
            K.lane_dress(B.Face("-x", x0, MEWS_B[1], PLAZA_LOT), r, 0.8)
        if j < len(S3) - 1:
            K.lane_dress(B.Face("+x", x1, MEWS_B[1], PLAZA_LOT), r, 0.8)
    K.tubes_over(MEWS_A[0], MEWS_A[1], X0 + 6.0, X1 - 4.0, 5.6, "cyan", step=13.0, along="x", power=4.5)
    K.tubes_over(MEWS_B[0], MEWS_B[1], X0 + 9.0, X1 - 4.0, 5.6, "amber", step=13.0, along="x", power=4.5)


south_side()
campus()
plaza_side()
west_pavement()
plaza_pavement()
lanes()
