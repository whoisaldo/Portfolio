"""Corpo Row north of the boulevard's centre line: what stands either end of
the seven towers and behind them, to the district's edge at z -420.

West of the first tower, the block at the head of the x 120 road, its south
face a wall of screens the road looks up at; east of the last, the stacked
block and the corner block that faces junction I and closes the garage
street's view north with a column of screens. Behind the towers a service
lane, and over it an elevated track on teal piers (mH2wmyeiIpA@143), a halt
on it behind the third gap, running from a portal in the west block to a
portal in the corner block; behind that a row of back blocks of every
height from 16 m to 90 m, the far city's towers rising past them.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.corpo_kit import *  # noqa: F401,F403
from ncw.districts import corpo_kit as K

TOWER_X = [150.0 + 38.0 * i for i in range(7)]
GAP_X = [169.0 + 38.0 * i for i in range(6)]
LOT_N = -344.0            # the boulevard's north lot line
T_FRONT, T_BACK = -347.0, -373.0
LANE0, LANE1 = -383.6, -373.4
BACK0, BACK1 = -419.5, -384.0      # (the district ends at z -420: a pilaster or a lamp stands half a metre proud)
TRACK_Z = -378.5
TRACK_Y = 19.0            # the track's running surface
WEST_X, EAST_X = 133.0, 432.0

# ---------------------------------------------------------------------------
# The ground: paved to the district's edge, the lane behind the towers in
# cast concrete, and the corner of the pavement junction I leaves bare.
# ---------------------------------------------------------------------------
ground([(WEST_X, EAST_X, LANE0, LANE1, "concrete")], 108.0, 470.0, -420.0, LOT_N)
B.ground_rect(CO, 440.0, 452.0, LOT_N, -339.0)
box(k("kerb"), 440.0, 448.0, 0.0, G0, -339.3, -339.0, scale=1.0)


# ---------------------------------------------------------------------------
# The west block, at the head of the x 120 road.
# ---------------------------------------------------------------------------
def west_block():
    r = random.Random(7701)
    x0, x1 = 108.0, WEST_X
    # The main slab: a lobby on the boulevard, a wall of screens over it to
    # 46 m (dark above: the Experience shot's lower left corner), a glass
    # crown set back, a mast.
    K.corp_block(x0, x1, T_BACK - 1.0, LOT_N, 68.0, 7702, skin="windows", tint="navy", style=5,
                 tiers=((0.86, 0.0), (1.0, 2.5)), fronts={"+z": "glass", "+x": "dock", "-x": "none"}, canopy=2.6,
                 edge=None, lit=(0.3, 0.5), warm=(0.3, 0.7))
    # (No lines of light on its crown: it stands in the Experience shot's
    # lower left corner, under ARASAKA, and stays a dark mass there.)
    # (tiers end at 59.6 and 68.)
    # Nine screens of five sizes, no two showing the same advert at any
    # moment (seven wide ones and two tall, changing together).
    xa = (x0 + x1) / 2 - 11.1
    box(k("board_frame"), xa - 0.5, xa + 22.7, 9.6, 46.5, LOT_N, LOT_N + 0.1, scale=2.0)
    wide = tall = 0
    for y0_, hh, row in ((10.5, 6.8, ((0.0, 10.8), (11.4, 10.8))), (17.9, 10.8, ((0.0, 7.0), (7.6, 14.6))),
                         (29.3, 6.0, ((0.0, 6.0), (6.6, 5.6), (12.8, 9.4))), (35.9, 10.1, ((0.0, 14.6), (15.2, 7.0)))):
        for dx, ww in row:
            if ww / hh < 0.85:
                pick, tall = tall, tall + 1
            else:
                pick, wide = wide, wide + 1
            K.advert(xa + dx + ww / 2, y0_ + hh / 2, LOT_N + 0.42, ww, hh, 0.0, pick, seed=0.66, depth=0.3)
    for x in (xa - 0.3, xa + 22.5):
        neon_box(x - 0.05, x + 0.05, 10.2, 46.2, LOT_N + 0.1, LOT_N + 0.16, "cyan", 1)
    K.roof_plant(x0 + 3, x1 - 3, T_BACK + 2, LOT_N - 3, 68.0, r, cap=4.0)
    K.mast((x0 + x1) / 2, (T_BACK + LOT_N) / 2, 68.0, 11.0)
    # The alley between it and the first tower: a tube of light over it, a
    # pipe bridge, the first tower's own side door.
    for z in (-350.0, -358.0, -366.0):
        neon_box(x1 + 0.3, x1 + 3.7, 5.6, 5.68, z - 0.04, z + 0.04, "cyan", 1)
        light(CO, x1 + 2.0, 5.0, z, "cyan", 3.0)
    box(k("metal", 1), x1, x1 + 4.0, 11.0, 11.6, -362.0, -361.2, scale=1.0)
    box(k("metal", 1), x1, x1 + 4.0, 12.0, 12.3, -360.6, -360.3, scale=1.0)
    # The back wing: lower, the track runs into it.
    K.corp_block(x0, x1, BACK0, T_BACK - 1.0, 40.0, 7703, skin="windows", tint="concrete", style=2,
                 tiers=((0.7, 0.0), (1.0, (0.0, 3.0, 0.0, 3.0))), fronts={"+x": "dock", "-z": "blank", "-x": "none", "+z": "none"},
                 edge="amber", lit=(0.4, 0.7), warm=(0.4, 0.9))
    K.roof_plant(x0 + 1, 119.5, BACK0 + 1, -401.0, 40.0, r, cap=5.0)
    K.pad((x0 + x1) / 2, -389.0, 40.0, r=8.0, colour="amber")
    portal(x1, 1)


def portal(x, side):
    """Where the track runs into a block: a hooded mouth on the face at x
    (the block stands on the far side from `side`), dark inside, a line of
    amber round it and a red lamp over it."""
    z0, z1 = TRACK_Z - 3.4, TRACK_Z + 3.4
    y0, y1 = TRACK_Y - 1.8, TRACK_Y + 5.2
    xa, xb = sorted((x, x + side * 1.6))
    box(k("trim"), xa, xb, y1, y1 + 0.5, z0 - 0.5, z1 + 0.5, scale=1.0, col=K.BLACK)
    box(k("trim"), xa, xb, y0 - 0.5, y0, z0 - 0.5, z1 + 0.5, scale=1.0, col=K.BLACK)
    for z in (z0 - 0.5, z1):
        box(k("trim"), xa, xb, y0, y1, z, z + 0.5, scale=1.0, col=K.BLACK)
    xi = x + side * 0.05
    q = ((xi, y0, z1), (xi, y0, z0), (xi, y1, z0), (xi, y1, z1)) if side > 0 else ((xi, y0, z0), (xi, y0, z1), (xi, y1, z1), (xi, y1, z0))
    quad(k("dark"), *q)
    xo = x + side * 1.62
    xo0, xo1 = sorted((xo, xo + side * 0.05))
    for z in (z0 - 0.1, z1 + 0.02):
        K.glow_box(xo0, xo1, y0, y1, z, z + 0.08, "amber")
    K.glow_box(xo0, xo1, y1 - 0.02, y1 + 0.06, z0, z1, "amber")
    # Signal lamps in the mouth: red over green.
    for dz, c in ((-2.6, "red"), (2.6, "green")):
        K.glow_box(xi - 0.03, xi + 0.03, y1 - 1.3, y1 - 0.9, TRACK_Z + dz - 0.2, TRACK_Z + dz + 0.2, c, 1)
    K.aviation(x + side * 0.8, y1 + 0.5, TRACK_Z)


# ---------------------------------------------------------------------------
# The east end: the stacked block beside the last tower, and the corner
# block on junction I.
# ---------------------------------------------------------------------------
def east_blocks():
    r = random.Random(7711)
    # Stacked boxes, each shifted off the one under it (PzkEqhVByw4@79).
    K.corp_block(395.0, 428.0, T_BACK - 1.0, LOT_N, 62.0, 7712, skin="glass", base=K.BASE + K.STOREY,
                 tiers=((0.34, (1.5, 3.0, 1.0, 2.0)), (0.7, (0.0, 5.0, 0.0, 0.0)), (1.0, (4.0, 0.0, 2.0, 3.0))),
                 fronts={"+z": "glass", "-x": "dock", "+x": "dock", "-z": "dock"}, canopy=2.6, colour="amber", edge="amber",
                 top_band="cyan", lit=(0.5, 0.85), warm=(0.3, 0.8))
    K.roof_plant(400.0, 427.0, T_BACK + 2.0, LOT_N - 4.0, 62.0, r, cap=4.5)
    # A screen on the middle box's south face, and one on its west.
    K.screen(408.0, 40.0, LOT_N + 0.4, 12.0, 6.6, 0.0, r)
    K.screen(394.65, 30.0, -356.5, 9.0, 5.4, -math.pi / 2, r)
    # The corner block: a slab 74 m high over the junction, its face to the
    # garage street a column of screens; lower behind, where the track ends
    # in it. Along z -344 east of x 452 the Afterlife Block's block stands
    # against it.
    x0, x1 = EAST_X, 469.7     # (its east face is the district's edge at x 470: a pilaster stands proud of it)
    K.corp_block(x0, x1, BACK1, LOT_N, 74.0, 7713, skin="windows", tint="charcoal", style=5,
                 tiers=((0.8, 0.0), (1.0, (0.0, 0.0, 3.0, 3.0))), fronts={"-x": "dock", "+x": "blank", "+z": "none", "-z": "none"},
                 corners="cyan", edge="cyan", top_band="amber", lit=(0.45, 0.75), warm=(0.2, 0.6))
    f = B.Face("+z", LOT_N, x0, 452.0)
    f.quad(k("trim"), 0.0, f.width, SHOP_H, K.BASE, 0.0, col=K.STONE)
    K.front(f, K.BASE, "glass", r, 0, "cyan", 2.6)
    quad(k("trim"), (452.0, 0.0, LOT_N), (x1, 0.0, LOT_N), (x1, K.BASE, LOT_N), (452.0, K.BASE, LOT_N), col=K.STONE)
    y = K.screen_stack(442.0, LOT_N + 0.42, 11.0, 15.0, (8.6, 6.4, 9.4, 5.6, 8.6, 7.0), 0.0, r, gap=0.6, pal=K.MEDIA)
    box(k("board_frame"), 433.9, 450.1, 10.2, y + 0.2, LOT_N, LOT_N + 0.1, scale=2.0)
    for x in (434.2, 449.8):
        neon_box(x - 0.06, x + 0.06, 10.4, y, LOT_N + 0.1, LOT_N + 0.18, "cyan", 1)
    K.roof_plant(x0 + 2, x1 - 2, BACK1 + 4, LOT_N - 4, 74.0, r, cap=4.5)
    K.mast(x0 + 9.0, -364.0, 74.0, 9.0)
    # Its east face, a back seen from the air and from the garage street: a
    # service core proud of the wall with a line of light up it, louvres,
    # a screen high on it.
    box(k("trim"), x1 - 0.02, x1 + 0.0, 0.0, 0.01, -350.0, -349.9, scale=1.0, col=K.BLACK)
    fe = B.Face("-x", x1 - 4.0, -370.0, -356.0)
    K.screen(x1 - 0.42, 52.0, -352.0, 10.0, 6.0, -math.pi / 2 + math.pi, r)
    K.strip_v(x1 - 0.2, -362.0, K.BASE + 1.0, 58.0, "amber")
    for yy in (16.0, 30.0, 44.0):
        box(k("dark", 1), x1 - 0.12, x1 - 0.02, yy, yy + 2.6, -380.0, -368.0, scale=1.0)
    # The back part.
    K.corp_block(x0, x1, BACK0, BACK1, 48.0, 7714, skin="glass", tiers=((0.62, 0.0), (1.0, (3.0, 0.0, 0.0, 0.0))),
                 fronts={"-x": "dock", "+x": "blank", "-z": "blank", "+z": "none"}, edge="amber", lit=(0.4, 0.75), warm=(0.4, 0.9))
    portal(x0, -1)
    # The alley between the two: tubes over it.
    for z in (-350.0, -359.0, -368.0):
        neon_box(428.3, 431.7, 5.6, 5.68, z - 0.04, z + 0.04, "amber", 1)
        light(CO, 430.0, 5.0, z, "amber", 3.0)


# ---------------------------------------------------------------------------
# The back row.
# ---------------------------------------------------------------------------
def back_row():
    r = random.Random(7721)
    D = dict(fronts={"+z": "dock", "-z": "blank", "-x": "dock", "+x": "dock"})
    # 1: a glass shaft with fins and a ribbon-windowed wing.
    K.corp_block(137.0, 160.0, BACK0, BACK1, 72.0, 7722, skin="glass", tiers=((0.84, 0.0), (1.0, 2.2)), fin_step=4.6,
                 fin_faces=("+z", "-z"), edge="cyan", top_band="cyan", **D)
    # (Its wing carries the first spire of the second rank: corpo_rank.py
    # builds what stands on these blocks.)
    K.corp_block(160.0, 182.0, BACK0, BACK1, 110.0, 7723, skin="glass", tiers=((1.0, 0.0),),
                 fronts={"+z": "dock", "-z": "blank", "+x": "dock", "-x": "none"}, edge="amber", fin_step=5.5, fin_faces=("+z", "+x"),
                 lit=(0.4, 0.7), warm=(0.7, 1.0), crown=False)
    K.screen(171.0, 41.0, BACK1 + 0.4, 14.0, 7.6, 0.0, r)
    # 2: the tall one behind the second gap: a stepped glass tower, light
    # up its corners, screens stacked on its upper south face.
    K.corp_block(188.0, 226.0, BACK0, BACK1, 84.0, 7724, skin="glass", tiers=((0.6, 0.0), (1.0, 3.0)),
                 corners="cyan", edge="cyan", top_band="amber", lit=(0.5, 0.85), **D)
    K.screen_stack(207.0, BACK1 - 3.0 + 0.42, 56.0, 12.0, (7.0, 5.0, 6.0), 0.0, r)
    K.roof_plant(214.0, 222.0, BACK0 + 5, BACK1 - 5, 84.0, r, cap=3.5)
    # 3: the block the halt opens into.
    K.corp_block(232.0, 262.0, BACK0, BACK1, 44.0, 7725, skin="windows", tint="teal", style=4, tiers=((1.0, 0.0),),
                 edge="amber", top_band="cyan", lit=(0.55, 0.85), warm=(0.1, 0.5), **D)
    # 4: the plant building, low: cooling drums in rows on its roof, steam.
    K.podium_walls(268.0, 298.0, BACK0, BACK1, 15.6, {"-z": "blank", "+z": "dock", "-x": "dock", "+x": "dock"}, r, 5, "amber", 0.0, K.CONCRETE)
    B.ROOFS.append((CO, 268.0, 298.0, BACK0, BACK1, 15.6))
    for name, f in B.faces_of(268.0, 298.0, BACK0, BACK1).items():
        for yy in (7.0, 11.0):
            f.box(k("dark", 1), 2.0, f.width - 2.0, yy, yy + 2.2, 0.0, 0.08)
        f.box(k("neon_amber", 1), 2.0, f.width - 2.0, 14.6, 14.7, 0.0, 0.06)
    K.parapet(268.0, 298.0, BACK0, BACK1, 15.6, col=K.STONE, edge="amber")
    for i in range(4):
        for j in range(3):
            K.cooler(273.5 + i * 6.4, BACK0 + 7.0 + j * 9.5, 15.6, r=1.9, h=3.6)
    K.duct_run([(271.0, 16.3, BACK0 + 3.0), (296.0, 16.3, BACK0 + 3.0)], r=0.4)
    K.duct_run([(271.0, 16.3, BACK1 - 3.2), (296.0, 16.3, BACK1 - 3.2)], r=0.4)
    K.steam("plant", 286.3, 19.3, BACK0 + 16.5, roof=True)
    K.roof_lights(268.0, 298.0, BACK0, BACK1, 15.6, "amber", step=7.5)
    # 5: stacked and shifted boxes.
    K.corp_block(304.0, 338.0, BACK0, BACK1, 70.0, 7726, skin="glass",
                 tiers=((0.4, (0.0, 0.0, 0.0, 2.0)), (0.72, (5.0, 0.0, 3.0, 0.0)), (1.0, (2.0, 0.0, 0.0, 5.0))),
                 edge="amber", top_band="amber", colour="amber", lit=(0.5, 0.85), warm=(0.4, 0.9), **D)
    K.screen(322.0, 44.0, BACK1 + 0.4, 13.0, 7.0, 0.0, r)
    # 6: the tallest, a dark slab with fins and a crown of light.
    K.corp_block(344.0, 378.0, BACK0, BACK1, 90.0, 7727, skin="windows", tint="navy", style=5, tiers=((0.8, 0.0), (1.0, 2.6)),
                 fin_step=5.6, fin_faces=("+z", "-z", "+x", "-x"), corners="amber", edge="amber", top_band="cyan",
                 lit=(0.5, 0.8), warm=(0.5, 1.0), **D)
    K.screen_stack(361.0, BACK1 - 2.6 + 0.42, 74.0, 16.0, (6.0, 6.0), 0.0, r)
    # 7: a glass shaft and a lower wing, by the corner block.
    K.corp_block(384.0, 408.0, BACK0, BACK1, 62.0, 7728, skin="glass", tiers=((0.8, 0.0), (1.0, 2.4)), corners="cyan",
                 edge="cyan", fronts={"+z": "dock", "-z": "blank", "-x": "dock", "+x": "none"})
    K.corp_block(408.0, 428.0, BACK0, BACK1, 46.0, 7729, skin="windows", tint="concrete", style=2, tiers=((1.0, 0.0),),
                 fronts={"+z": "dock", "-z": "blank", "+x": "dock", "-x": "none"}, edge="amber", lit=(0.45, 0.75), warm=(0.5, 1.0))
    K.roof_plant(409.0, 427.0, BACK0 + 1, BACK1 - 1, 46.0, r, cap=5.0)
    # The alleys between them: a tube of light over each, bins.
    for x in (135.0, 185.0, 229.0, 265.0, 301.0, 341.0, 381.0, 430.0):
        for z in (-392.0, -402.0, -412.0):
            hue = "cyan" if int(x) % 2 else "amber"
            neon_box(x - 1.6, x + 1.6, 6.2, 6.28, z - 0.04, z + 0.04, hue, 1)
            light(CO, x, 5.4, z, hue, 3.0)


# ---------------------------------------------------------------------------
# The lane behind the towers and the track over it.
# ---------------------------------------------------------------------------
TOWER_H = [128.0, 112.0, 104.0, 146.0, 98.0, 108.0, 124.0]
TOWER_STEP1 = [0.58, 0.66, 1.0, 0.5, 1.0, 0.7, 0.62]      # where each tower's first section ends


def lane():
    """The lane behind the towers: their backs' doors and docks, a service
    spine up each tower's back with a line of light on it, tubes slung
    across under the track, hatched loading bays, crates and drums by the
    piers, two vents breathing steam, people on a break."""
    r = random.Random(7731)
    for i, tx in enumerate(TOWER_X):
        f = B.Face("-z", T_BACK - 0.02, tx - 13.0, tx + 13.0)
        B.back_ground(CO, f, r, K.STEEL)
        f.ledge(k("trim"), 0.0, f.width, SHOP_H, 0.25, 0.2, K.STEEL)
        top1 = TOWER_H[i] * TOWER_STEP1[i] - (2.0 if TOWER_STEP1[i] < 1.0 else 6.0)
        box(k("trim"), tx - 2.2, tx + 2.2, 8.0, top1, T_BACK - 0.7, T_BACK, scale=2.0, col=K.BLACK)
        K.glow_box(tx - 0.16, tx + 0.16, 9.0, top1 - 1.0, T_BACK - 0.74, T_BACK - 0.7, ACCENTS[i])
        for sx in (-1, 1):
            K.glow_box(tx + sx * 2.2 - 0.04, tx + sx * 2.2 + 0.04, 9.0, top1 - 1.0, T_BACK - 0.5, T_BACK - 0.4, "white", 1)
        y = 30.0
        while y < top1 - 4.0:
            K.aviation(tx, y, T_BACK - 0.9)
            for sx in () if i in (1, 3, 6) else (-1, 1):       # (the faceted, leaning and round towers' backs carry none)
                xa, xb = sorted((tx + sx * 3.2, tx + sx * 10.6))
                box(k("dark", 1), xa, xb, y - 1.5, y + 1.5, T_BACK - 0.1, T_BACK, scale=1.0)
            y += 26.0
        K.stripes(tx - 5.0, tx + 5.0, T_BACK - 3.4, T_BACK - 0.5, step=1.6, w=0.8, skew=0.8)
        if i % 2 == 0:
            stand(tx + 6.5, T_BACK - 0.8, math.pi, "smoke")
            stand(tx + 7.4, T_BACK - 1.1, math.radians(140), "squat" if i % 4 == 0 else "idle")
        else:
            K.talk(tx - 7.0, T_BACK - 1.6, 0.4 * i, 2)
    # A centre line of dashes down the lane.
    x = WEST_X + 4.0
    while x < EAST_X - 4.0:
        quad(k("trim", 1), (x, G0 + 0.008, TRACK_Z + 0.08), (x + 2.4, G0 + 0.008, TRACK_Z + 0.08), (x + 2.4, G0 + 0.008, TRACK_Z - 0.08),
             (x, G0 + 0.008, TRACK_Z - 0.08), col=K.PALE)
        x += 5.2
    # Tubes under the track between the piers, by turns cyan and amber.
    for j, x in enumerate([159.5 + 19.0 * n for n in range(14)]):
        if 232.0 < x < 260.0:
            continue
        hue = ("cyan", "amber")[j % 2]
        K.neon_box(x - 0.04, x + 0.04, 6.4, 6.48, LANE0 + 0.3, LANE1 - 0.3, hue, 1)
        light(CO, x, 5.4, TRACK_Z - 2.5, hue, 3.5)
        light(CO, x, 5.4, TRACK_Z + 2.5, hue, 3.5)
    # What stands by the piers.
    for j, px in enumerate(range(150, 430, 19)):
        if 236 < px < 256:
            continue
        kind = ("crates", "drum", "dumpster", "bags")[j % 4]
        P.place(kind, px + 1.9, G0, TRACK_Z + (0.5 if j % 2 else -0.6), 0.5 * j, district=CO)
        if kind == "drum":
            P.place("drum", px + 2.5, G0, TRACK_Z - 0.2, district=CO)
            P.place("drum", px + 2.1, G0, TRACK_Z + 1.0, district=CO)
    # The walls either side: the towers' backs between their doors, the
    # back row's fronts, and the alleys between the back blocks.
    for tx in TOWER_X:
        K.lane_dress(B.Face("-z", T_BACK - 0.02, tx - 13.0, tx + 13.0), r, 0.6)
    rows = [(137.0, 182.0), (188.0, 226.0), (232.0, 262.0), (268.0, 298.0), (304.0, 338.0), (344.0, 378.0), (384.0, 428.0)]
    for j, (x0, x1) in enumerate(rows):
        K.lane_dress(B.Face("+z", BACK1, x0, x1), r, 0.8, high=(60.0, 58.0, 40.0, 0.0, 30.0, 60.0, 42.0)[j])
        K.lane_dress(B.Face("-x", x0, BACK0, BACK1), r, 0.8)
        K.lane_dress(B.Face("+x", x1, BACK0, BACK1), r, 0.8)
    K.lane_dress(B.Face("+x", WEST_X, BACK0, T_BACK - 1.0), r, 0.8)
    K.lane_dress(B.Face("-x", EAST_X, BACK0, BACK1), r, 0.8)
    for name, (vx, vz) in (("lane_w", (207.5, TRACK_Z + 3.4)), ("lane_e", (333.0, TRACK_Z - 3.2))):
        box(k("metal", 1), vx - 0.45, vx + 0.45, G0, G0 + 0.06, vz - 0.45, vz + 0.45, scale=0.5)
        K.steam(name, vx, G0 + 0.1, vz)


def track():
    """The elevated track down the middle of the lane (mH2wmyeiIpA@143,
    Fn9gKhU_2_Q@75): a heavy viaduct of cast concrete, a box girder two
    metres deep and six and a half wide with a keel under it, on hammerhead
    piers every 19 m; two warm lines of light along its underside either
    side of the keel, so the lane has a lit ceiling; a yellow stripe along
    each fascia with a line of cyan under it; on the deck an upstand either
    side with a rail on posts, sleepers and two running rails; at every
    pier a portal over the deck with lamps and the wire between; the piers
    on striped plinths, a sign and a lamp on each. Through the halt the
    girder narrows to its platforms' edges."""
    z = TRACK_Z
    top = TRACK_Y
    conc = (0.2, 0.2, 0.21, 1.0)
    keel = (0.15, 0.15, 0.16, 1.0)
    belly = tuple(c * 0.8 for c in GLOW["amber"][:3]) + (1.0,)
    hx0, hx1 = 232.0, 260.0
    for xa, xb, hw in ((WEST_X, hx0, 3.25), (hx0, hx1, 2.2), (hx1, EAST_X, 3.25)):
        box(k("castconcrete"), xa, xb, top - 2.1, top, z - hw, z + hw, scale=3.0, col=conc, bottom=True)
        box(k("castconcrete"), xa, xb, top - 2.6, top - 2.1, z - hw + 1.0, z + hw - 1.0, scale=3.0, col=keel, bottom=True)
        if hw < 3.0:
            continue
        for s_ in (-1, 1):
            # The underside's lines of light, the fascia's stripe and cyan.
            za, zb = sorted((z + s_ * (hw - 0.55), z + s_ * (hw - 0.8)))
            box(k("glow"), xa + 0.6, xb - 0.6, top - 2.13, top - 2.1, za, zb, scale=1.0, col=belly)
            za, zb = sorted((z + s_ * hw, z + s_ * (hw + 0.03)))
            box(k("trim"), xa, xb, top - 0.8, top - 0.45, za, zb, scale=1.0, col=K.YELLOW)
            K.neon_box(xa, xb, top - 1.98, top - 1.86, za, zb, "cyan")
            # The upstand and its rail.
            za, zb = sorted((z + s_ * (hw - 0.3), z + s_ * hw))
            box(k("castconcrete"), xa, xb, top, top + 0.9, za, zb, scale=3.0, col=conc)
            zr = z + s_ * (hw - 0.15)
            box(k("steel"), xa, xb, top + 1.12, top + 1.2, zr - 0.04, zr + 0.04, scale=1.0, col=K.TEAL)
            x = xa + 1.2
            while x < xb - 0.5:
                box(k("steel", 1), x - 0.04, x + 0.04, top + 0.9, top + 1.12, zr - 0.04, zr + 0.04, scale=1.0, col=K.TEAL)
                x += 2.4
    # Ribs across its underside every 4.75 m, and between piers a lamp
    # hung under the keel in a dark housing.
    x = WEST_X + 2.0
    while x < EAST_X - 1.0:
        hw = 2.2 if hx0 < x < hx1 else 3.25
        box(k("castconcrete", 1), x - 0.22, x + 0.22, top - 2.55, top - 2.1, z - hw + 0.1, z + hw - 0.1, scale=2.0, col=keel, bottom=True)
        if not hx0 - 2.0 < x < hx1 + 2.0 and int(round((x - WEST_X - 2.0) / 4.75)) % 2:
            box(k("trim", 1), x - 0.5, x + 0.5, top - 2.82, top - 2.6, z - 0.3, z + 0.3, scale=1.0, col=K.BLACK)
            box(k("glow"), x - 0.42, x + 0.42, top - 2.85, top - 2.82, z - 0.22, z + 0.22, scale=1.0, col=GLOW["white"])
        x += 4.75
    # The rails, on sleepers.
    for s_ in (-1, 1):
        ze, zf = sorted((z + s_ * 0.72, z + s_ * 0.86))
        box(k("metal"), WEST_X, EAST_X, top + 0.08, top + 0.24, ze, zf, scale=1.0)
    x = WEST_X + 0.5
    while x < EAST_X - 0.3:
        quad(k("dark", 1), (x - 0.13, top + 0.08, z + 1.2), (x + 0.13, top + 0.08, z + 1.2), (x + 0.13, top + 0.08, z - 1.2), (x - 0.13, top + 0.08, z - 1.2))
        x += 0.9
    box(k("metal", 1), WEST_X, EAST_X, top + 4.7, top + 4.74, z - 0.025, z + 0.025, scale=1.0)
    for j, px in enumerate(range(150, 430, 19)):
        if 236 < px < 256:
            continue
        # A column 2.2 m square under a hammerhead.
        box(k("castconcrete"), px - 1.1, px + 1.1, G0, top - 3.3, z - 1.1, z + 1.1, scale=2.0, col=conc)
        box(k("castconcrete"), px - 1.2, px + 1.2, top - 3.3, top - 2.6, z - 2.2, z + 2.2, scale=2.0, col=conc, bottom=True)
        box(k("castconcrete"), px - 1.2, px + 1.2, top - 2.95, top - 2.6, z - 3.1, z + 3.1, scale=2.0, col=conc, bottom=True)
        # The plinth, striped, a sign on the pier's two faces along the lane
        # and a lamp over each.
        box(k("trim", 1), px - 1.35, px + 1.35, G0, G0 + 1.5, z - 1.35, z + 1.35, scale=1.0, col=K.STONE)
        for yy in (0.25, 0.75, 1.25):
            box(k("trim", 1), px - 1.37, px + 1.37, G0 + yy, G0 + yy + 0.25, z - 1.37, z + 1.37, scale=1.0, col=K.YELLOW)
        for sx in (-1, 1):
            K.st_board(px + sx * 1.12, 3.6, z, "bx", sx * math.pi / 2)
            K.glow_box(*sorted((px + sx * 1.12, px + sx * 1.4)), 4.5, 4.58, z - 0.5, z + 0.5, ("white", "amber")[j % 2], 1)
        K.neon_box(px - 0.5, px + 0.5, top - 3.42, top - 3.34, z - 2.1, z - 1.2, "amber", 1)
        K.neon_box(px - 0.5, px + 0.5, top - 3.42, top - 3.34, z + 1.2, z + 2.1, "amber", 1)
        light(CO, px, 12.0, z - 2.5, "amber", 4.0)
        light(CO, px, 12.0, z + 2.5, "amber", 4.0)
        light(CO, px + 9.5, 14.0, z, "amber", 4.5)
        # The portal over the deck.
        for s_ in (-1, 1):
            zp = z + s_ * 2.5
            box(k("steel"), px - 0.09, px + 0.09, top + 0.4, top + 5.6, zp - 0.09, zp + 0.09, scale=1.0, col=K.TEAL)
            K.glow_box(px - 0.22, px + 0.22, top + 5.1, top + 5.22, zp - s_ * 0.9 - 0.3, zp - s_ * 0.9 + 0.3, "white")
        box(k("steel"), px - 0.09, px + 0.09, top + 5.4, top + 5.6, z - 2.6, z + 2.6, scale=1.0, col=K.TEAL)
        light(CO, px, top + 3.5, z, "white", 4.0)
        K.aviation(px, top + 5.6, z)


def halt():
    """The halt behind the third gap: platforms either side of the track
    under a glazed hall that spans the lane from the towers' backs to the
    block behind, lit white inside; a train standing in it; stairs down to
    the lane in a lit tube."""
    x0, x1 = 232.0, 260.0
    top = TRACK_Y
    y1 = top + 6.4
    for s, (za, zb) in ((-1, (LANE0 - 0.4, TRACK_Z - 2.3)), (1, (TRACK_Z + 2.3, LANE1 + 0.4))):
        box(k("trim"), x0, x1, top - 0.5, top + 0.95, za, zb, scale=2.0, col=K.STONE, bottom=True)
        # The platform's edge, lit, and its lamps.
        ze = TRACK_Z + s * 2.3
        zc, zd = sorted((ze, ze - s * 0.12))
        K.neon_box(x0 + 0.3, x1 - 0.3, top + 0.95, top + 1.0, zc, zd, "yellow")
        zo = LANE0 - 0.4 if s < 0 else LANE1 + 0.4
        # The hall's glass wall on the outside: mullions and a lit transom.
        zw0, zw1 = sorted((zo, zo + s * 0.1))
        n = 7
        for i in range(n + 1):
            xm = x0 + (x1 - x0) * i / n
            box(k("metal"), xm - 0.1, xm + 0.1, top + 0.95, y1, zw0, zw1, scale=1.0)
        K.neon_box(x0, x1, top + 3.6, top + 3.72, zw0, zw1, "white")
        K.neon_box(x0, x1, top + 0.95, top + 1.05, zw0, zw1, "cyan")
        # Benches and a screen on the platform, people waiting.
        for bx in (x0 + 6.0, x1 - 6.0):
            box(k("metal", 1), bx - 1.0, bx + 1.0, top + 1.4, top + 1.48, zo - s * 1.4 - 0.25, zo - s * 1.4 + 0.25, scale=0.5)
            box(k("dark", 1), bx - 0.9, bx - 0.8, top + 0.95, top + 1.4, zo - s * 1.4 - 0.2, zo - s * 1.4 + 0.2, scale=0.5)
            box(k("dark", 1), bx + 0.8, bx + 0.9, top + 0.95, top + 1.4, zo - s * 1.4 - 0.2, zo - s * 1.4 + 0.2, scale=0.5)
        # Ticket machines against the outer wall, a screen hung over the
        # platform, a pictogram at each end.
        for vx in (x0 + 11.0, x0 + 12.1, x1 - 10.0):
            P.place("vending" if vx < x1 - 11.0 else "vending_warm", vx, top + 0.95, zo - s * 0.55, math.pi if s > 0 else 0.0, district=CO)
        K.screen((x0 + x1) / 2 + 3.0, top + 4.2, zo - s * 1.2, 3.2, 1.3, math.pi / 2, random.Random(int(zo * 3)), depth=0.16, back=True, pal=K.COLD)
        for ex, yaw in ((x0 + 0.8, math.pi / 2), (x1 - 0.8, -math.pi / 2)):
            K.st_blade(ex, top + 3.4, zo - s * 1.6, "bx", yaw, n=K.ARROW if s > 0 else K.STAR)
        for px, pose in ((x0 + 4.0, "idle"), (x0 + 9.5, "phone"), (x0 + 15.0, "talk"), (x0 + 15.9, "talk"), (x1 - 5.0, "idle")):
            stand(px, TRACK_Z + s * 3.6, 0.0 if s < 0 else math.pi, pose, top + 0.95)
    # The roof: a shallow vault in three facets, its soffit lit.
    za, zb = LANE0 - 0.6, LANE1 + 0.6
    zm0, zm1 = TRACK_Z - 2.6, TRACK_Z + 2.6
    for (p0, p1) in (((za, y1), (zm0, y1 + 1.3)), ((zm0, y1 + 1.3), (zm1, y1 + 1.3)), ((zm1, y1 + 1.3), (zb, y1))):
        quad(k("metal"), (x0 - 0.6, p0[1], p0[0]), (x1 + 0.6, p0[1], p0[0]), (x1 + 0.6, p1[1], p1[0]), (x0 - 0.6, p1[1], p1[0]))
        quad(k("trim"), (x1 + 0.6, p0[1] - 0.08, p0[0]), (x0 - 0.6, p0[1] - 0.08, p0[0]), (x0 - 0.6, p1[1] - 0.08, p1[0]),
             (x1 + 0.6, p1[1] - 0.08, p1[0]), col=K.PALE)
    for xx in (x0 + 4.0, x0 + 11.0, x0 + 18.0, x1 - 3.0):
        K.neon_box(xx - 0.08, xx + 0.08, y1 + 1.1, y1 + 1.18, zm0 + 0.2, zm1 - 0.2, "white")
    for xe in (x0 - 0.6, x1 + 0.5):
        box(k("metal"), xe, xe + 0.1, y1 - 0.3, y1 + 1.3, za, zb, scale=1.0)
    # Piers under the platforms' ends.
    for px in (x0 + 2.0, x1 - 2.0):
        for pz in (LANE0 + 0.9, LANE1 - 0.9):
            box(k("trim"), px - 0.5, px + 0.5, G0, top - 0.5, pz - 0.5, pz + 0.5, scale=2.0, col=K.TEAL)
    box(k("trim"), 245.25, 246.75, G0, top - 1.5, TRACK_Z - 0.75, TRACK_Z + 0.75, scale=2.0, col=K.TEAL)
    # The train: three cars, yellow over black, a band of lit windows.
    tx0 = x0 + 1.5
    for c in range(3):
        a, b = tx0 + c * 8.6, tx0 + c * 8.6 + 8.2
        box(k("trim"), a, b, top + 0.3, top + 1.5, TRACK_Z - 1.45, TRACK_Z + 1.45, scale=2.0, col=K.BLACK, bottom=True)
        box(k("trim"), a, b, top + 1.5, top + 3.5, TRACK_Z - 1.5, TRACK_Z + 1.5, scale=2.0, col=K.TRAIN)
        for s in (-1, 1):
            zc, zd = sorted((TRACK_Z + s * 1.5, TRACK_Z + s * 1.53))
            box(k("glow"), a + 0.5, b - 0.5, top + 2.2, top + 3.05, zc, zd, scale=1.0, col=(0.3, 0.26, 0.2, 1.0))
            for d in (a + 2.0, b - 2.0):
                box(k("trim", 1), d - 0.5, d + 0.5, top + 1.55, top + 3.3, zc - 0.01 * s, zd + 0.02 * s, scale=1.0, col=K.BLACK)
    K.glow_box(tx0 - 0.04, tx0, top + 1.7, top + 2.0, TRACK_Z - 1.1, TRACK_Z - 0.6, "red", 1)
    K.glow_box(tx0 - 0.04, tx0, top + 1.7, top + 2.0, TRACK_Z + 0.6, TRACK_Z + 1.1, "red", 1)
    e = tx0 + 2 * 8.6 + 8.2
    K.glow_box(e, e + 0.04, top + 1.7, top + 2.0, TRACK_Z - 1.1, TRACK_Z - 0.6, "white", 1)
    K.glow_box(e, e + 0.04, top + 1.7, top + 2.0, TRACK_Z + 0.6, TRACK_Z + 1.1, "white", 1)
    for lx in (x0 + 5.0, x0 + 14.0, x1 - 5.0):
        light(CO, lx, top + 3.0, TRACK_Z - 4.0, "white", 5.0)
        light(CO, lx, top + 3.0, TRACK_Z + 4.0, "white", 5.0)


# ---------------------------------------------------------------------------
# The boulevard's north side at street level: each tower's forecourt, the
# two lobbies the braindance reads, the six gaps between the towers.
# ---------------------------------------------------------------------------
SLUGS = ["philips-zero-touch", "pinnatec-auto", "pawtograder", "aws-cloudformation", "top-choice-realty",
         "robert-defalco-realty", "northeastern"]
LOBBY_Z = -348.6          # the lobby's glass line under the canopy
KERB_N = -339.3
KERB_STRIP_N = KERB_N - 0.22   # the kerb's edge, clear of the crowd's line at z -340
FORE_N = LOT_N - 0.45          # just behind the lot line, on the forecourts
# (The pavement's middle, z -341.3, between the crowd's two lines, is kept
# clear: a walker's own line.)
ACCENTS = [b_[1] for b_ in K.BRAND]      # each house's lamp colour (its own colour's nearest)
LOBBY_DEPTH = [5.0, 3.6, 2.6, 4.0, 3.4, 3.0, 3.8]      # (corpo.py ROOM, by tower)
FASCIA = 4.7              # the foot of a lobby's fascia
CARPET = (0.15, 0.155, 0.17, 1)


def forecourts():
    """Each tower's forecourt, no two alike: what stands either side of the
    way in, how it is guarded, how it is lit."""
    r = random.Random(7741)
    for i, tx in enumerate(TOWER_X):
        hue = ACCENTS[i]
        room_tower = i == 0
        # The canopy's soffit, lit in strips, and a line of light along its
        # front edge.
        # (The braindance reads the first tower's lower 14 m and the third's
        # lower 22 m from the boulevard, as boxes ending at the towers'
        # face, z -347: the third's canopy stops at that face, and neither
        # forecourt carries anything tall between the face and the kerb.)
        heat_tower = i == 2
        cz = T_FRONT if heat_tower else LOT_N
        quad(k("trim"), (tx - 13.0, 7.49, LOBBY_Z), (tx + 13.0, 7.49, LOBBY_Z), (tx + 13.0, 7.49, cz), (tx - 13.0, 7.49, cz), col=K.STEEL)
        # (Three slots of the house's own light in it, not a row of white
        # panels: a lobby is one colour.)
        sz = -347.9 if heat_tower else -346.2
        for sx in (-8.0, 0.0, 8.0):
            if not heat_tower:
                box(k("glow"), tx + sx - 2.2, tx + sx + 2.2, 7.44, 7.49, sz, sz + 0.22, scale=1.0, col=K.brand(i, 0.8))
            light(CO, tx + sx, 6.8, -346.0, hue, 3.5)
        box(k("glow"), tx - 13.0, tx + 13.0, 7.5, 7.62, cz, cz + 0.05, scale=1.0, col=K.brand(i))
        # Slim columns under its front edge.
        for sx in () if heat_tower else (-12.6, 12.6) if room_tower or i in RAISED else (-12.6, -4.2, 4.2, 12.6):
            box(k("metal"), tx + sx - 0.2, tx + sx + 0.2, G0, 7.5, LOT_N - 0.7, LOT_N - 0.3, scale=1.0)
        # Paving: a carpet of pale stone from the doors to the kerb, light
        # lines either side of it.
        K.paving_band(tx - 3.2, tx + 3.2, LOBBY_Z, LOT_N, CARPET)
        K.paving_band(tx - 3.2, tx + 3.2, LOT_N, KERB_N - 0.02, K.STONE, y=G0 + 0.01)
        for sx in (-3.3, 3.3):
            K.light_strip_ground(tx + sx - 0.05, tx + sx + 0.05, LOBBY_Z + 0.2, LOT_N - 0.1, hue)
        if not room_tower:
            lobby(i)
        side = -1 if i % 2 else 1
        if i in (0, 2):
            # (Studs of light along the kerb in place of bollards.)
            for bx in range(-10, 11, 2):
                K.glow_box(tx + bx - 0.12, tx + bx + 0.12, G0, G0 + 0.03, KERB_N - 0.4, KERB_N - 0.16, hue, 1)
        elif i == 3:
            # Concrete barrier blocks along the forecourt's edge, gaps
            # between them (clear of the walkers' line at z -342.6), and the
            # usual bollards at the kerb.
            for bx in (-10.2, -6.6, 6.6, 10.2):
                jersey(tx + bx, LOT_N + 0.4)
            K.bollards(tx - 11.0, tx + 11.0, KERB_N - 0.28, step=2.75, proto="bollard")
        elif i == 5:
            # Lit bollards, a pool of warm light at each.
            for bx in range(-10, 11, 3):
                K.bollard_light(tx + bx + 0.5, KERB_N - 0.3, G0, "amber", h=0.9, pool=2.4, detail=1)
        else:
            K.bollards(tx - 11.0, tx + 11.0, KERB_N - 0.28, step=(2.75, 2.2, 3.1)[i % 3], proto="bollard")
        if i == 0:
            # The room's tower: open to the street, its forecourt bare but
            # for light in the paving: a field of lines either side of the
            # way in.
            for sx in (-1, 1):
                for j in range(4):
                    xa, xb = sorted((tx + sx * 5.0, tx + sx * 12.2))
                    K.light_strip_ground(xa, xb, -347.1 + j * 0.8, -347.02 + j * 0.8, hue if j % 2 == 0 else "white")
        elif i == 1:
            # A booth, hedged beds, two tube lamps.
            K.stripes(tx - 12.6, tx - 3.6, LOT_N - 0.75, LOT_N - 0.1, step=1.5, w=0.75, skew=0.5)
            K.planter(tx - 12.2, tx - 5.0, -347.4, -346.0, lit=hue)
            K.planter(tx + 5.0, tx + 8.0, -347.4, -346.0, lit=hue)
            K.booth(tx + 10.6, -345.4, 0.0, r, "white")
            stand(tx + 9.0, -344.9, 0.0, "idle")
            for sx in (-11.6, 4.4):
                K.tube_post(tx + sx, -344.9, 0.0, "white", h=6.0, arm=1.2)
            K.totem(tx - 8.5, FORE_N, math.radians(-28), r, colour=hue, sizes=("bm",))
            stand(tx - 6.2, -345.1, math.radians(20), "phone")
        elif i == 2:
            # The server hall's tower: an open court, nothing standing on
            # it: red lines of light and hazard stripes in the paving, grates
            # glowing warm over the plant under it.
            for sx in (-8.0, 8.0):
                for lz in (-346.3, -345.3):
                    K.light_strip_ground(tx + sx - 3.6, tx + sx + 3.6, lz, lz + 0.1, "red")
                K.stripes(tx + sx - 4.2, tx + sx + 4.2, LOT_N - 0.75, LOT_N - 0.1, step=1.5, w=0.75, skew=0.5)
                for gxo in (-2.4, 0.0, 2.4):
                    P.place("grate_glow", tx + sx + gxo, G0, -345.8, district=CO)
        elif i == 3:
            # The tallest: a screen on a plinth turned to the street, four
            # light masts in a row, long low beds.
            K.screen(tx - 9.6, 3.6, -345.6, 3.0, 3.2, math.radians(18), r, depth=0.3, back=True, pal=K.COLD)
            solid(tx - 11.0, tx - 8.2, G0, 1.6, -346.2, -345.0, K.BLACK)
            for sx in (4.6, 7.2, 9.8, 12.4):
                K.tube_post(tx + sx, -345.0, math.pi / 2, "cyan", h=6.6, arm=0.5)
            K.planter(tx + 4.2, tx + 12.4, -347.6, -346.6, lit=hue)
            K.stripes(tx - 7.6, tx - 3.6, LOT_N - 0.75, LOT_N - 0.1, step=1.5, w=0.75, skew=0.5)
            stand(tx + 6.0, -345.6, 0.0, "phone")
            K.talk(tx - 6.0, -345.2, 0.5, 3)
            K.totem(tx - 5.6, FORE_N, math.radians(-28), r, colour=hue, sizes=("bx", "bx"))
        elif i == 4:
            # A raised court: the lobby's floor and the court before it
            # stand a metre over the pavement, six steps down to it across
            # the middle with light in their risers, a low wall and a
            # handrail either side of the flight; either side of that the
            # court's edge is a planted bed behind a wall with a line of
            # light under its coping; trees in tubs and benches on the
            # court, people on it and on the steps.
            py = G0 + RAISED[i]
            zg = LOBBY_Z - LOBBY_DEPTH[i] + 0.1
            solid(tx - 13.0, tx + 13.0, 0.0, py, zg, STEP_TOP, K.CONCRETE)
            K.paving_band(tx - 13.0, tx + 13.0, LOBBY_Z, STEP_TOP, CARPET, y=py + 0.004)
            K.steps_z(tx - 6.5, tx + 6.5, LOT_N - 0.1, STEP_TOP, G0, py, hue)
            for sx in (-1, 1):
                xa, xb = sorted((tx + sx * 6.9, tx + sx * 13.0))
                K.planter(xa, xb, STEP_TOP, LOT_N - 0.1, y=0.0, h=py + 0.12, hedge=0, lit=hue)
                quad(k("trim"), (xa + 0.18, py + 0.124, LOT_N - 0.28), (xb - 0.18, py + 0.124, LOT_N - 0.28), (xb - 0.18, py + 0.124, STEP_TOP + 0.18), (xa + 0.18, py + 0.124, STEP_TOP + 0.18), col=K.SOIL)
                K.shrubs(xa + 0.4, xb - 0.3, (STEP_TOP + LOT_N) / 2 - 0.05, py + 0.12, random.Random(int(tx) + sx), spread=0.5, hmax=0.75)
                ca, cb = sorted((tx + sx * 6.5, tx + sx * 6.9))
                solid(ca, cb, 0.0, py + 0.5, STEP_TOP - 0.3, LOT_N - 0.1, K.STONE)
                pipe(k("metal", 1), (tx + sx * 6.3, py + 0.95, STEP_TOP - 0.2), (tx + sx * 6.3, G0 + 0.95, LOT_N - 0.2), 0.03, segs=5)
                for pz_, py_ in ((STEP_TOP - 0.2, py), (LOT_N - 0.2, G0)):
                    box(k("metal", 1), tx + sx * 6.3 - 0.025, tx + sx * 6.3 + 0.025, py_, py_ + 0.95, pz_ - 0.025, pz_ + 0.025, scale=0.5)
            for sx in (-10.4, 10.4):
                P.place("planter_tree", tx + sx, py, -347.2, sxz=0.85, district=CO)
            for sx in (-8.0, 8.0):
                P.place("bench", tx + sx, py, -346.7, 0.0, district=CO)
            stand(tx - 8.0, -346.7, 0.0, "sit", py + 0.45)
            stand(tx + 8.4, -346.7, 0.0, "sit", py + 0.45)
            K.talk(tx - 4.6, -346.6, 0.2, y=RAISED[i])
            stand(tx + 2.4, LOT_N - 1.0, 0.0, "phone", G0 + (py - G0) * 0.5 - G0)
            stand(tx - 1.6, STEP_TOP - 0.5, math.radians(20), "idle", RAISED[i])
            K.ad_panel(tx - 9.0, KERB_STRIP_N, 0.0, r, pal=K.COLD)
        elif i == 5:
            # Barriers and a booth: a checked way in, hazard stripes.
            K.stripes(tx - 12.6, tx + 12.6, LOT_N - 0.75, LOT_N - 0.1, step=1.5, w=0.75, skew=0.5)
            for sx in (-7.0, -4.4, 4.4, 7.0):
                P.place("barrier", tx + sx, G0, -345.6, district=CO)
            K.booth(tx - 10.8, -346.4, 0.0, r, "amber")
            K.booth(tx + 10.8, -346.4, 0.0, r, "amber")
            stand(tx - 9.2, -345.6, 0.0, "idle")
            stand(tx + 9.2, -345.7, 0.0, "idle")
            K.totem(tx - 9.5, FORE_N, math.radians(28), r, colour=hue, sizes=("bx", "ps"))
            stand(tx + 5.6, -344.9, math.radians(200), "phone")
        else:
            # A pool of light in the paving, stacked stone blocks in it,
            # hedged beds, a totem.
            quad(k("glow"), (tx + 5.0, G0 + 0.012, -344.6), (tx + 12.0, G0 + 0.012, -344.6), (tx + 12.0, G0 + 0.012, -347.6), (tx + 5.0, G0 + 0.012, -347.6),
                 col=tuple(c * 0.12 for c in GLOW["cyan"][:3]) + (1,))
            for j, (bx_, bz_, sz_, yw) in enumerate(((tx + 8.5, -346.1, 1.5, 0.3), (tx + 8.3, -346.0, 1.1, 0.9), (tx + 8.6, -346.2, 0.8, 0.1))):
                oriented_box(k("trim"), bx_, G0 + sum((1.5, 1.1, 0.8)[:j]) + sz_ / 2, bz_, sz_, sz_, sz_, yw, scale=1.0, col=K.BLACK if j != 1 else K.PALE)
            K.planter(tx - 12.2, tx - 5.0, -347.4, -346.0, lit=hue)
            K.booth(tx - 10.6, -344.95, 0.0, r, "white")
            stand(tx - 9.0, -344.8, 0.0, "idle")
            K.totem(tx + 9.5, FORE_N, math.radians(-28), r, colour=hue, sizes=("bm",))
            K.talk(tx + 3.6, -345.2, 0.9)
            stand(tx + 10.6, -345.0, math.radians(160), "phone")
        if i not in (2, 4):
            P.place("cctv", tx - side * 12.7, G0, -344.6, district=CO)
        if i >= 3:
            # A pair of lightboxes at the kerb either side of the way in,
            # edge on to the road, and blocks to sit on under the canopy.
            for sx in (-5.6, -4.4, 4.4, 5.6):
                P.place("lightbox", tx + sx, G0, KERB_STRIP_N, math.pi / 2, district=CO)
            for sx in ((-6.4,), (), (-7.0, 7.0), (6.2,))[i - 3]:
                K.block_seat(tx + sx, -346.5, 1.8, 0.0, hue if hue != "white" else "cyan")


RAISED = {4: 1.05}        # the fifth tower's lobby and court stand this far up, steps down to the pavement
STEP_TOP = LOT_N - 1.9    # where its steps reach the court


def lobby(i):
    """A tower's lobby, as the street meets it: a dark portal at the tower's
    face (piers, a deep fascia with the house's mark raised on it in the
    house's own colour and a line of that light under it), and behind it a
    vestibule open to the forecourt, as deep as the glass stands back
    (corpo.py ROOM): dark walls, a dark ceiling with slots of the one
    colour, a line of gates across the way in with security at them, a desk
    with somebody on it, seats, trees in tubs; and before the hall's lit
    glass, either side of the doors, dark fins or dark wings, so the hall
    shows in slivers and the front is the frame and the colour, not a white
    box. All of it inside the tower's plan."""
    tx = TOWER_X[i]
    hue = ACCENTS[i]
    bc = K.brand(i)
    base = RAISED.get(i, 0.0)
    g0 = G0 + base
    zg = LOBBY_Z - LOBBY_DEPTH[i] + 0.1      # the hall's glass
    zf = T_FRONT - 0.05                      # the portal's face
    f = B.Face("+z", zg, tx - 12.3, tx + 12.3)
    for sx in (-1, 1):
        xa, xb = sorted((tx + sx * 12.3, tx + sx * 13.0))
        solid(xa, xb, 0.0, 8.0, zg - 0.1, zf, K.FRAME)
        xa, xb = sorted((tx + sx * 11.5, tx + sx * 12.3))
        solid(xa, xb, 0.0, 7.5, zf - 0.9, zf, K.FRAME)
    box(k("trim"), tx - 11.5, tx + 11.5, FASCIA, 7.5, zf - 0.9, zf - 0.3, scale=2.0, col=K.FRAME, bottom=True)
    box(k("glow"), tx - 11.4, tx + 11.4, FASCIA - 0.07, FASCIA, zf - 0.75, zf - 0.63, scale=1.0, col=bc)
    # The mark, standing a quarter of a metre off the fascia, and a line of
    # light running out from it either side.
    my = (FASCIA + 7.5) / 2
    K.mark3d(i, tx, my, zf - 0.3, 2.2, 0.0, bc, depth=0.26)
    for sx in (-1, 1):
        K.bar2d(tx, my, zf - 0.3, 0.0, (sx * 2.4, 0.0), (sx * 9.6, 0.0), 0.09, 0.06, K.brand(i, 0.6))
    # The vestibule's ceiling and floor.
    quad(k("trim"), (tx - 12.3, 7.49, zg), (tx + 12.3, 7.49, zg), (tx + 12.3, 7.49, LOBBY_Z), (tx - 12.3, 7.49, LOBBY_Z), col=K.BLACK)
    K.paving_band(tx - 12.3, tx + 12.3, zg, LOBBY_Z, K.STONE, y=g0 + 0.012)
    zc = (zg + LOBBY_Z) / 2
    for sx in (-7.6, 0.0, 7.6):
        quad(k("glow"), (tx + sx - 2.6, 7.47, zc - 0.14), (tx + sx + 2.6, 7.47, zc - 0.14), (tx + sx + 2.6, 7.47, zc + 0.14), (tx + sx - 2.6, 7.47, zc + 0.14),
             col=K.brand(i, 0.9))
        light(CO, tx + sx, 6.0, zc, hue, 4.5)
    box(k("glow"), tx - 11.4, tx + 11.4, g0 + 0.012, g0 + 0.03, zf - 0.98, zf - 0.9, scale=1.0, col=K.brand(i, 0.7))
    # Before the glass: by turns fins either side of the doors, dark wings
    # with a lit niche in each, or fins and a louvred transom right across.
    kind = i % 3
    if kind == 1:
        for sx in (-1, 1):
            a, b = sorted((12.3 + sx * 5.2, 12.3 + sx * 11.5))
            f.box(k("trim"), a, b, 0.0, 7.5, 0.0, 0.5, col=K.FRAME)
            mid = (a + b) / 2
            f.box(k("glow"), mid - 1.9, mid + 1.9, 1.0, 3.4, 0.5, 0.52, col=K.brand(i, 0.22))
            f.box(k("trim", 1), mid - 2.05, mid + 2.05, 0.85, 1.0, 0.5, 0.62, col=K.BLACK)
            f.box(k("glow", 1), mid - 2.0, mid + 2.0, 3.4, 3.46, 0.5, 0.56, col=bc)
    else:
        for sx in (-1, 1):
            a, b = sorted((12.3 + sx * (3.7 if kind == 0 else 4.6), 12.3 + sx * 11.4))
            K.fin_screen(f, a, b, 0.0, 7.5, step=1.05 if kind == 0 else 0.8)
        if kind == 2:
            for j in range(6):
                f.box(k("trim"), 12.3 - 4.6, 12.3 + 4.6, 3.3 + j * 0.7, 3.5 + j * 0.7, 0.12, 0.6, col=K.FRAME)
    # The gates across the way in, security at them.
    zt = zg + min(1.5, LOBBY_DEPTH[i] * 0.45)
    for sx in ((-2.4, -0.8, 0.8, 2.4), (-1.6, 0.0, 1.6), (-3.2, -1.6, 0.0, 1.6, 3.2))[i % 3]:
        gate(tx + sx, zt, hue, g0)
    stand(tx - 4.2, zt + 0.3, 0.0, "idle", base)
    stand(tx + 4.3, zt + 0.2, 0.0, "idle", base)
    # A desk one side, its top edge lit, somebody behind it; seats the
    # other, somebody waiting; a tree in a tub at each end.
    side = 1 if i % 2 else -1
    dx = tx + side * 8.0
    solid(dx - 1.7, dx + 1.7, g0, g0 + 1.05, zg + 1.2, zg + 1.85, K.BLACK)
    box(k("glow"), dx - 1.7, dx + 1.7, g0 + 1.05, g0 + 1.09, zg + 1.77, zg + 1.85, scale=1.0, col=bc)
    box(k("glow", 1), dx - 1.5, dx + 1.5, g0 + 0.08, g0 + 0.12, zg + 1.85, zg + 1.87, scale=1.0, col=K.brand(i, 0.6))
    stand(dx + 0.3, zg + 0.9, 0.0, "vendor", base)
    for bx in (tx - side * 6.4, tx - side * 9.0):
        P.place("bench", bx, g0, zg + 1.25, 0.0, district=CO)
    stand(tx - side * 6.4, zg + 1.25, 0.0, "sit", g0 + 0.45)
    stand(tx - side * 3.9, zt + 1.0, math.radians(-150 * side), "phone", base)
    for sx in (-10.6, 10.6):
        P.place("planter_tree", tx + sx, g0, min(zg + LOBBY_DEPTH[i] - 1.4, zf - 2.0), sy=0.95 - base * 0.15, sxz=0.8, district=CO)
    # The day's end at the doors: people through the gates on their way
    # out, three talking by the way in, one on a phone, one waiting by the
    # trees. (All of them inside the tower's face, z -347.)
    K.talk(tx + side * 4.8, zf - 1.0, 0.3 * i, 3, y=base)
    stand(tx - side * 1.4, zf - 0.7, math.radians(10 * i), "idle", base)
    stand(tx - side * 0.6, zf - 1.5, math.radians(-12 * i), "idle", base)
    stand(tx + side * 1.6, zf - 1.2, math.radians(160 + 7 * i), "phone", base)
    stand(tx - side * 8.8, zf - 0.8, math.radians(30), "idle", base)


def jersey(x, z, w=1.9):
    """A concrete barrier block before a forecourt: a battered block on a broad
    foot, a band of hazard yellow round it, a reflector at each end."""
    box(k("castconcrete"), x - w / 2, x + w / 2, G0, G0 + 0.3, z - 0.32, z + 0.32, scale=1.5, col=(0.36, 0.36, 0.37, 1.0))
    box(k("castconcrete"), x - w / 2, x + w / 2, G0 + 0.3, G0 + 0.82, z - 0.14, z + 0.14, scale=1.5, col=(0.36, 0.36, 0.37, 1.0))
    box(k("trim", 1), x - w / 2 - 0.005, x + w / 2 + 0.005, G0 + 0.52, G0 + 0.64, z - 0.145, z + 0.145, scale=1.0, col=K.YELLOW)
    for e in (-1, 1):
        K.glow_box(x + e * (w / 2 - 0.12) - 0.05, x + e * (w / 2 - 0.12) + 0.05, G0 + 0.66, G0 + 0.74, z + 0.14, z + 0.15, "amber", 1)


def gate(x, z, hue, y=G0):
    """A scanner arch: two posts and a lintel, lit down their inner edges."""
    for sx in (-0.55, 0.55):
        box(k("trim"), x + sx - 0.09, x + sx + 0.09, y, y + 2.3, z - 0.3, z + 0.3, scale=1.0, col=K.BLACK)
        K.glow_box(x + sx - math.copysign(0.1, sx) - 0.01, x + sx - math.copysign(0.1, sx) + 0.01, y + 0.2, y + 2.2, z + 0.24, z + 0.3, hue, 1)
    box(k("trim"), x - 0.64, x + 0.64, y + 2.3, y + 2.45, z - 0.3, z + 0.3, scale=1.0, col=K.BLACK)


def room():
    """The first tower's lower floors, the braindance's "room": a hall open
    to the boulevard under the canopy, five metres deep in front of the
    lobby's glass, a gallery across its back at 4.2 m reached by a stair,
    a desk, benches, screens on its side walls, and people in it."""
    tx = TOWER_X[0]
    z0, z1 = LOBBY_Z - 5.0, LOBBY_Z
    for sx in (-1, 1):
        # (Their inner faces stand inside the box the braindance reads, x +-12.5.)
        xa, xb = sorted((tx + sx * 12.3, tx + sx * 13.0))
        solid(xa, xb, 0.0, 8.0, z0, z1, K.STONE)
        # A screen and a line of light on each side wall, facing in.
        K.panel(tx + sx * 12.28, 5.6, z0 + 2.5, 3.6, 2.0, -sx * math.pi / 2, "cyan", 0.5)
        box(k("glow"), tx + sx * 12.28 - 0.02, tx + sx * 12.28 + 0.02, 0.4, 7.6, z1 - 0.5, z1 - 0.4, scale=1.0, col=K.brand(0))
    # The ceiling: stone, a grid of light panels in it.
    quad(k("trim"), (tx - 12.6, 7.99, z0), (tx + 12.6, 7.99, z0), (tx + 12.6, 7.99, z1), (tx - 12.6, 7.99, z1), col=K.STEEL)
    for ix in range(6):
        for iz in range(2):
            cx, cz = tx - 10.0 + ix * 4.0, z0 + 1.4 + iz * 2.4
            quad(k("glow"), (cx - 1.4, 7.97, cz - 0.16), (cx + 1.4, 7.97, cz - 0.16), (cx + 1.4, 7.97, cz + 0.16), (cx - 1.4, 7.97, cz + 0.16), col=K.brand(0, 0.9))
        light(CO, tx - 10.0 + ix * 4.0, 6.5, z0 + 2.5, "cyan", 4.5)
    # The house's mark, hung from the canopy at the tower's face on a dark
    # plate (inside the box the braindance reads, and over the heads on the
    # gallery as the boulevard sees them), and before the hall's glass dark
    # fins: over the gallery right across, under it either side of the way
    # through.
    zf = T_FRONT - 0.05
    box(k("trim"), tx - 2.7, tx + 2.7, 5.5, 7.49, zf - 0.45, zf - 0.3, scale=1.0, col=K.FRAME, bottom=True)
    K.mark3d(0, tx, 6.5, zf - 0.3, 1.6, 0.0, K.brand(0), depth=0.24)
    box(k("glow"), tx - 2.7, tx + 2.7, 5.43, 5.5, zf - 0.42, zf - 0.33, scale=1.0, col=K.brand(0))
    fg = B.Face("+z", z0 + 0.1, tx - 12.3, tx + 12.3)
    fg.box(k("trim"), 0.0, 24.6, 4.2, 7.95, 0.0, 0.1, col=K.FRAME)
    fg.box(k("glow"), 0.8, 23.8, 4.5, 4.6, 0.1, 0.12, col=K.brand(0, 0.5))
    for j in range(12):
        fg.box(k("glow"), 1.24 + j * 2.0, 1.36 + j * 2.0, 4.9, 7.5, 0.1, 0.12, col=K.brand(0, 0.8))
    for a, b in ((0.5, 7.9), (16.7, 24.1)):
        K.fin_screen(fg, a, b, 0.0, 3.95, step=1.05)
    # The floor: polished stone, darker than the forecourt's, a light line
    # across its front.
    K.paving_band(tx - 12.6, tx + 12.6, z0, z1, K.STONE)
    K.light_strip_ground(tx - 12.4, tx + 12.4, z1 - 0.12, z1 - 0.04, "cyan")
    # The gallery: a slab across the back, a glass rail, a stair up to it.
    gy = 4.2
    box(k("trim"), tx - 12.6, tx + 12.6, gy - 0.25, gy, z0 + 0.12, z0 + 2.3, scale=2.0, col=K.PALE, bottom=True)
    K.rail(tx - 12.5, z0 + 2.28, tx + 6.0, z0 + 2.28, gy, "cyan")
    K.glow_box(tx - 12.5, tx + 12.5, gy - 0.3, gy - 0.25, z0 + 2.2, z0 + 2.3, "amber")
    K.steps_x(z0 + 2.3, z0 + 3.5, tx + 12.4, tx + 6.2, G0, gy, "cyan")
    K.rail(tx + 6.2, z0 + 3.5, tx + 12.4, z0 + 3.5, gy - 2.0, "cyan", h=0.05)
    # The desk, a lit edge along its top, and somebody behind it.
    box(k("trim"), tx - 3.4, tx + 0.6, G0, G0 + 1.05, z0 + 3.0, z0 + 3.7, scale=1.0, col=K.BLACK)
    K.glow_box(tx - 3.4, tx + 0.6, G0 + 1.05, G0 + 1.09, z0 + 3.62, z0 + 3.7, "cyan")
    stand(tx - 1.4, z0 + 2.75, 0.0, "vendor")
    # Benches by the west wall, somebody on one.
    for bz in (z0 + 1.2, z0 + 3.4):
        box(k("trim", 1), tx - 11.9, tx - 9.4, G0 + 0.38, G0 + 0.46, bz - 0.25, bz + 0.25, scale=1.0, col=K.PALE)
        box(k("trim", 1), tx - 11.7, tx - 9.6, G0, G0 + 0.38, bz - 0.2, bz + 0.2, scale=1.0, col=K.BLACK)
    stand(tx - 10.6, z0 + 3.4, 0.0, "sit", G0 + 0.46)
    stand(tx - 9.9, z0 + 1.2, 0.0, "sit", G0 + 0.46)
    # The gates across its front, and security.
    for sx in (-7.5, -6.0, -4.5, 4.5, 6.0, 7.5):
        gate(tx + sx, z1 - 0.6, "cyan")
    stand(tx - 3.0, z1 - 0.5, 0.0, "idle")
    stand(tx + 3.0, z1 - 0.6, 0.0, "idle")
    # People on the gallery (the clue's voices, five metres up) and under it.
    K.talk(tx - 6.0, z0 + 1.3, 0.3, 3, y=gy)
    K.talk(tx + 1.0, z0 + 1.2, 1.1, 2, y=gy)
    stand(tx - 2.2, z0 + 1.95, 0.0, "lean", gy)
    stand(tx + 3.4, z0 + 1.9, 0.0, "phone", gy)
    stand(tx - 10.0, z0 + 1.9, 0.0, "lean", gy)
    K.talk(tx + 2.6, z0 + 3.6, 0.8, 2)
    stand(tx + 8.6, z0 + 1.2, math.radians(-30), "phone")
    stand(tx - 6.4, z0 + 4.2, math.radians(160), "idle")


def server_wall():
    """The third tower's lower floors, the braindance's heat: a hall of
    server racks behind an open steel frame, from 8 m to 22 m, open to the
    boulevard and wholly inside the tower's plan (corpo.py HALL leaves the
    hall open; the braindance reads this front as a box that ends at the
    tower's face, so nothing of it may stand proud of z -347): rows of
    lamps on every rack, a red glow behind them, hot air units and their
    pipes on the hall's floor at its foot."""
    tx = TOWER_X[2]
    x0, x1 = tx - 11.0, tx + 11.0
    zb, zf = T_FRONT - 4.14, T_FRONT - 2.7       # the racks' back, and their faces
    y0, y1 = 8.0, 22.0
    # A dark wall behind, glowing red at its foot and between the tiers.
    quad(k("trim"), (x0, y0, zb), (x1, y0, zb), (x1, y1, zb), (x0, y1, zb), col=(0.05, 0.012, 0.01, 1))
    tier = 3.5
    rr = random.Random(7751)
    for t in range(4):
        ty = y0 + t * tier
        # The tier's floor: a grating, a hot line of light under it.
        box(k("metal"), x0, x1, ty, ty + 0.14, zb, zf + 0.5, scale=1.0)
        K.neon_box(x0, x1, ty + 0.14, ty + 0.22, zb + 0.02, zb + 0.08, "red")
        # Racks in a row, a gap between each pair, lamps in rows on them.
        x = x0 + 0.2
        while x + 1.3 < x1:
            box(k("trim"), x, x + 1.3, ty + 0.14, ty + 2.75, zb + 0.3, zf, scale=1.0, col=K.BLACK)
            for row in range(5):
                yy = ty + 0.5 + row * 0.42
                hue = rr.choice(("amber",) * 8 + ("cyan",))
                a, b = sorted((x + rr.uniform(0.08, 0.6), x + rr.uniform(0.7, 1.22)))
                K.glow_box(a, b, yy, yy + 0.07, zf, zf + 0.02, hue, 1)
            x += 1.48
        K.glow_box(x0, x1, ty + 2.9, ty + 2.98, zb + 0.2, zb + 0.3, "amber")
    # The frame in front: uprights and a beam at each tier, a rail.
    for sx in range(5):
        xx = x0 + (x1 - x0) * sx / 4
        box(k("metal"), xx - 0.12, xx + 0.12, y0, y1, zf + 0.42, zf + 0.62, scale=1.0)
    for t in range(1, 5):
        box(k("metal"), x0, x1, y0 + t * tier - 0.12, y0 + t * tier + 0.12, zf + 0.42, zf + 0.62, scale=1.0)
    K.neon_box(x0 - 0.9, x1 + 0.9, y1 - 0.14, y1 - 0.04, T_FRONT - 0.12, T_FRONT - 0.06, "red")
    # Its ends: louvred cheeks just inside the tower's flanks, a red line
    # under every blade.
    for sx in (-1, 1):
        xa, xb = sorted((tx + sx * 11.3, tx + sx * 11.5))
        box(k("steel"), xa, xb, y0, y1, zb, T_FRONT - 0.06, scale=1.0, col=K.STEEL)
        yy = y0 + 0.9
        while yy < y1 - 0.5:
            xc, xd = sorted((tx + sx * 11.5, tx + sx * 11.54))
            K.glow_box(xc, xd, yy, yy + 0.07, zb + 0.3, T_FRONT - 0.4, "red", 1)
            yy += 1.3
    K.neon_box(x0 - 0.9, x1 + 0.9, y0, y0 + 0.1, T_FRONT - 0.12, T_FRONT - 0.06, "red")
    # On the hall's floor, before the racks: hot air units, their fans up,
    # and pipes up the frame.
    for cx in (tx - 9.0, tx - 3.0, tx + 3.0, tx + 9.0):
        K.chiller(cx - 1.6, cx + 1.6, T_FRONT - 1.5, T_FRONT - 0.4, 8.0, h=1.3)
        pipe(k("trim", 1), (cx, 8.3, T_FRONT - 1.5), (cx, 8.3, zf + 0.8), 0.14, segs=5, col=K.RED)
        pipe(k("trim", 1), (cx, 8.3, zf + 0.8), (cx, 21.5, zf + 0.8), 0.14, segs=5, col=K.RED)
        K.glow_box(cx - 1.5, cx + 1.5, 9.3, 9.36, T_FRONT - 0.4, T_FRONT - 0.37, "red", 1)
    K.steam("servers", tx + 3.0, 9.6, T_FRONT - 1.0, roof=True)
    for lx in (tx - 8.0, tx, tx + 8.0):
        light(CO, lx, 9.0, -345.6, "red", 6.0)
        light(CO, lx, 15.0, -346.0, "amber", 5.0)


# ---------------------------------------------------------------------------
# The gaps between the towers: each its own place.
# ---------------------------------------------------------------------------
def side_doors(gx, r, hue="white", back=T_BACK):
    """The two towers' flanks onto a gap: stone to the lobby's height, a
    line of light at the canopy's level, and from `back` to the forecourt a
    wall that is not blank: pilasters, a vitrine, a door, a slot of light."""
    for sx in (-1, 1):
        xw = gx + sx * 6.0
        xa, xb = sorted((xw, xw - sx * 0.06))
        box(k("trim"), xa, xb, 0.0, 8.0, T_BACK, LOBBY_Z, scale=2.0, col=K.STONE)
        K.neon_box(*sorted((xw - sx * 0.06, xw - sx * 0.12)), 7.6, 7.7, T_BACK + 0.5, LOBBY_Z - 0.3, hue)
        if back is not None and LOBBY_Z - back > 6.0:
            f = B.Face("-x" if sx > 0 else "+x", xw - sx * 0.06, back, LOBBY_Z)
            K.wall_front(f, 7.4, r, 1, "cyan" if hue == "white" else hue, lead="right" if sx > 0 else "left")
            K.services(f, r, 7.4, 0.7)
            # Over all that a duct the length of the wall on brackets, a
            # riser at its end, lit grilles in it; and an advert in a frame.
            w = f.width
            f.box(k("steel"), 0.8, w - 1.5, 6.2, 6.9, 0.1, 0.8, col=K.STEEL)
            f.box(k("steel"), w - 2.2, w - 1.5, 0.3, 7.4, 0.1, 0.8, col=K.STEEL)
            c = GLOW[hue]
            d = 2.0
            while d < w - 3.5:
                f.box(k("metal", 1), d - 0.05, d + 0.05, 5.7, 6.2, 0.0, 0.7)
                f.box(k("glow", 1), d + 0.6, d + 1.5, 6.38, 6.72, 0.8, 0.82, col=(c[0] * 0.3, c[1] * 0.3, c[2] * 0.3, 1.0))
                d += 3.1
            if w > 9.0:
                ax, ay, az = f.p(f.at(w * (0.3 if sx > 0 else 0.62)), 4.2, 0.2)
                K.advert(ax, ay, az, 3.4, 2.2, f.yaw, int(gx) // 7 + (sx > 0), seed=0.12 + 0.1 * (int(gx) % 5), depth=0.16)
                lx, _, lz = f.p(f.at(w * (0.3 if sx > 0 else 0.62)), 0.0, 1.6)
                light(CO, lx, 3.0, lz, "white", 4.0)


def link(gx, z0, h, r, lit=(0.7, 1.0), hue="cyan", front_kind="glass"):
    """A low glass link across the back of a gap, from z0 to the towers'
    backs: a terrace on its roof with a lit rail."""
    x0, x1 = gx - 6.0, gx + 6.0
    solid(x0, x1, 0.0, 0.5, T_BACK + 0.02, z0, K.STONE)
    quad(k("corporate"), (x0, 0.5, z0), (x1, 0.5, z0), (x1, h, z0), (x0, h, z0), ((0, 0), (12, 0), (12, h), (0, h)), K.glass_col(r, lit=lit))
    f = B.Face("-z", T_BACK - 0.02, x0, x1)
    B.back_ground(CO, f, r, K.STONE)
    quad(k("trim"), (x1, SHOP_H, T_BACK - 0.02), (x0, SHOP_H, T_BACK - 0.02), (x0, h, T_BACK - 0.02), (x1, h, T_BACK - 0.02), col=K.STONE)
    solid(x0, x1, h, h + 0.35, T_BACK, z0 + 0.0, K.BLACK)
    K.neon_box(x0, x1, h + 0.05, h + 0.15, z0, z0 + 0.05, hue)
    K.rail(x0 + 0.1, z0 - 0.15, x1 - 0.1, z0 - 0.15, h + 0.35, hue, glow=True)
    B.ROOFS.append((CO, x0, x1, T_BACK, z0, h + 0.35))
    B.COLLISION.append(("box", x0, x1, 0.0, h + 0.35, T_BACK, z0, CO))
    return h + 0.35


def skybridge(gx, y, z, r, hue="cyan", boards=3):
    """A glazed bridge from one tower to the next, a row of lit boards on
    its roof (ARL_JWwKdDs@21) and a line of light under it."""
    x0, x1 = gx - 6.0, gx + 6.0
    box(k("trim"), x0, x1, y - 0.4, y, z - 1.9, z + 1.9, scale=1.0, col=K.BLACK, bottom=True)
    for zz, yaw in ((z + 1.9, 0.0), (z - 1.9, math.pi)):
        rotated_quad(k("corporate"), gx, y + 1.6, zz, 12.0, 3.2, yaw, ((0, 0), (12, 0), (12, 3.2), (0, 3.2)), col=K.glass_col(r, lit=(0.9, 1.0)))
    box(k("trim"), x0, x1, y + 3.2, y + 3.5, z - 2.0, z + 2.0, scale=1.0, col=K.BLACK)
    K.glow_box(x0 + 0.2, x1 - 0.2, y - 0.48, y - 0.4, z - 0.15, z + 0.15, hue)
    bw = 10.4 / boards
    for i in range(boards):
        cx = gx - 5.2 + bw * (i + 0.5)
        K.screen(cx, y + 3.5 + 1.25, z + 1.4, bw - 0.5, 2.0, 0.0, r, depth=0.2, pal=None, back=True)
    for cx in (x0 + 0.4, x1 - 0.4):
        box(k("metal", 1), cx - 0.06, cx + 0.06, y + 3.5, y + 5.9, z + 1.2, z + 1.3, scale=0.5)


def gaps():
    r = random.Random(7761)
    for j, gx in enumerate(GAP_X):
        side_doors(gx, r, ("cyan", "amber", "cyan", "white", "amber", "amber")[j], (None, -360.0, T_BACK + 0.2, T_BACK + 0.2, -366.0, -362.0)[j])
        # Palms in planters either side of each gap's mouth (not the three
        # gaps beside the two lobbies the braindance reads down the row).
        for sx in () if j < 3 else (-4.4, 4.4):
            P.place("planter_palm", gx + sx, G0, -345.4, district=CO)

    # 1: stairs up to a raised terrace with a glass rail, trees on it, a lit
    # lounge across its back (KvMY1uzSC1E@29, @43).
    gx = GAP_X[0]
    ty = 3.2
    K.stairs_z(gx - 5.0, gx + 5.0, -348.2, -353.6, G0, ty, "cyan")
    for sx in (-1, 1):
        xa, xb = sorted((gx + sx * 5.0, gx + sx * 6.0))
        solid(xa, xb, 0.0, ty, -353.6, -348.2, K.STONE)
        K.planter(xa + 0.1, xb - 0.1, -353.2, -348.6, y=ty, h=0.4, hedge=0.6, lit=None)
    solid(gx - 6.0, gx + 6.0, 0.0, ty, -362.0, -353.6, K.CONCRETE)
    K.paving_band(gx - 6.0, gx + 6.0, -362.0, -353.6, K.PALE, y=ty + 0.012)
    for sx in (-4.6, 4.6):
        P.place("planter_tree", gx + sx, ty, -357.5, district=CO)
        P.place("bench", gx + sx * 0.55, ty, -360.6, 0.0, district=CO)
    top = link(gx, -362.0, 11.8, r, hue="cyan")
    K.light_strip_ground(gx - 5.6, gx + 5.6, -353.9, -353.8, "cyan", y=ty + 0.024)
    stand(gx - 2.4, -360.6, 0.0, "sit", ty + 0.45)
    K.talk(gx + 1.0, -356.4, 0.6, 3, y=ty)
    stand(gx + 4.0, -354.6, 0.0, "lean", ty)
    stand(gx - 3.0, -350.6, 0.0, "idle", G0 + (ty - G0) * 0.45)
    stand(gx - 1.0, -364.0, 0.0, "lean", top)
    stand(gx + 2.5, -363.6, 0.0, "phone", top)

    # 2: the car port: striped paving, a barrier and a booth, a bar of red
    # light and lit boxes over the way in, a shutter at the back under the
    # offices that bridge the gap; a skybridge high over it.
    gx = GAP_X[1]
    K.stripes(gx - 5.6, gx + 5.6, -359.0, -347.4, step=2.4, w=1.2, along="z", skew=1.2)
    link_h = 11.8
    solid(gx - 6.0, gx + 6.0, 4.9, link_h, T_BACK, -360.0, K.STONE)
    quad(k("corporate"), (gx - 6.0, 5.6, -359.97), (gx + 6.0, 5.6, -359.97), (gx + 6.0, link_h - 0.4, -359.97), (gx - 6.0, link_h - 0.4, -359.97),
         ((0, 0), (12, 0), (12, 6), (0, 6)), K.glass_col(r, lit=(0.6, 0.9)))
    for sx in (-1, 1):
        xa, xb = sorted((gx + sx * 5.2, gx + sx * 6.0))
        solid(xa, xb, 0.0, 4.9, T_BACK + 0.02, -360.0, K.STONE)
    quad(k("door_panel"), (gx - 5.2, G0, -361.5), (gx + 5.2, G0, -361.5), (gx + 5.2, 4.9, -361.5), (gx - 5.2, 4.9, -361.5),
         ((0, 0), (5, 0), (5, 2.4), (0, 2.4)))
    box(k("trim", 1), gx - 5.2, gx + 5.2, 4.5, 4.9, -360.1, -360.0, scale=1.0, col=K.YELLOW)
    K.neon_box(gx - 5.0, gx + 5.0, 4.3, 4.4, -360.2, -360.1, "amber")
    B.back_ground(CO, B.Face("-z", T_BACK - 0.02, gx - 6.0, gx + 6.0), r, K.STONE)
    quad(k("trim"), (gx + 6.0, SHOP_H, T_BACK - 0.02), (gx - 6.0, SHOP_H, T_BACK - 0.02), (gx - 6.0, link_h, T_BACK - 0.02), (gx + 6.0, link_h, T_BACK - 0.02), col=K.STONE)
    B.ROOFS.append((CO, gx - 6.0, gx + 6.0, T_BACK, -360.0, link_h))
    K.parapet(gx - 6.0, gx + 6.0, T_BACK, -360.0, link_h, col=K.STONE, h=0.6, edge="amber")
    # The bar over the way in.
    box(k("trim"), gx - 6.0, gx + 6.0, 5.0, 5.9, -349.4, -348.8, scale=1.0, col=K.BLACK, bottom=True)
    K.neon_box(gx - 5.8, gx + 5.8, 4.92, 5.0, -348.82, -348.76, "red")
    for sx, c in ((-3.0, "amber"), (0.0, "blue"), (3.0, "amber")):
        K.glow_box(gx + sx - 0.8, gx + sx + 0.8, 5.1, 5.8, -348.8, -348.74, c)
    K.booth(gx - 4.4, -350.6, 0.0, r)
    P.place("barrier", gx - 1.6, G0, -349.6, district=CO)
    P.place("barrier", gx + 2.6, G0, -349.6, district=CO)
    stand(gx - 2.9, -350.2, 0.0, "idle")
    stand(gx + 5.2, -356.0, -math.pi / 2, "smoke")
    light(CO, gx, 3.6, -356.0, "amber", 6.0)
    skybridge(gx, 26.6, -360.0, r, "cyan", boards=2)

    # 3: the way up to the halt: a glazed lift shaft, its car a block of
    # light, a bridge from it to the platform; ticket gates, kiosks, signs.
    gx = GAP_X[2]
    sx0, sx1, sz0, sz1 = gx + 1.4, gx + 5.0, -372.0, -368.4
    for xa, xb, za, zb in ((sx0, sx0 + 0.18, sz0, sz1), (sx1 - 0.18, sx1, sz0, sz1), (sx0, sx1, sz0, sz0 + 0.18), (sx0, sx1, sz1 - 0.18, sz1)):
        if xb - xa < 0.5:
            for zz in (za, zb - 0.18):
                box(k("metal"), xa, xb, G0, 27.0, zz, zz + 0.18, scale=1.0)
    for yy in [3.0 + 3.0 * j for j in range(9)]:
        box(k("metal", 1), sx0, sx1, yy, yy + 0.12, sz0, sz1, scale=1.0)
    box(k("trim"), sx0 - 0.2, sx1 + 0.2, 27.0, 27.6, sz0 - 0.2, sz1 + 0.2, scale=1.0, col=K.BLACK)
    K.glow_box(sx0 + 0.5, sx1 - 0.5, 12.0, 14.6, sz0 + 0.5, sz1 - 0.5, "white")
    K.strip_v(sx0 + 0.09, sz1 - 0.09, 0.5, 27.0, "cyan", w=0.06)
    K.strip_v(sx1 - 0.09, sz1 - 0.09, 0.5, 27.0, "cyan", w=0.06)
    K.aviation((sx0 + sx1) / 2, 27.6, (sz0 + sz1) / 2)
    # The bridge from the shaft to the platform.
    box(k("trim"), sx0, sx1, TRACK_Y + 0.6, TRACK_Y + 0.95, T_BACK - 0.4, sz0, scale=1.0, col=K.STONE, bottom=True)
    K.rail(sx0, sz0, sx0, T_BACK - 0.4, TRACK_Y + 0.95, "cyan", glow=True)
    K.rail(sx1, sz0, sx1, T_BACK - 0.4, TRACK_Y + 0.95, "cyan", glow=True)
    # A low podium, three steps up, the gates across it.
    K.stairs_z(gx - 6.0, gx + 6.0, -352.0, -353.0, G0, G0 + 0.5, "cyan")
    solid(gx - 6.0, gx + 6.0, 0.0, G0 + 0.5, T_BACK, -353.0, K.CONCRETE)
    K.paving_band(gx - 6.0, gx + 6.0, T_BACK, -353.0, K.PALE, y=G0 + 0.512)
    for sx in (-3.6, -2.2, -0.8, 0.6):
        gate(gx + sx, -362.0, "cyan")
        K.light_strip_ground(gx + sx - 0.03, gx + sx + 0.03, -362.0, -354.0, "cyan", y=G0 + 0.524)
    K.kiosk(gx - 4.6, -357.0, math.pi / 2, "cyan")
    K.kiosk(gx - 4.6, -366.0, math.pi / 2, "amber")
    K.st_blade(gx + 3.4, 6.4, -353.6, "bl", math.radians(90), None)
    cylinder(k("metal"), gx + 3.4, -353.6, G0 + 0.5, 9.2, 0.07, segs=6)
    K.st_blade(gx + 2.6, 4.1, -353.6, "bx", math.radians(60), None)
    stand(gx - 3.3, -357.0, math.pi / 2, "vendor", G0 + 0.5)
    for j, (px, pz, pose) in enumerate(((gx - 2.2, -360.0, "idle"), (gx - 2.2, -358.6, "phone"), (gx - 0.8, -359.4, "idle"),
                                        (gx + 3.2, -366.0, "idle"), (gx + 2.0, -356.0, "phone"))):
        stand(px, pz, math.pi if pz > -362 else 0.0, pose, G0 + 0.5)
    K.talk(gx + 0.6, -350.2, 0.5, 2)
    for lz in (-357.0, -364.0, -370.0):
        light(CO, gx, 4.0, lz, "cyan", 5.0)

    # 4: a pocket garden under the second gantry: trees, hedges, benches,
    # tube lamps, open at the back to the lane and the plant building.
    gx = GAP_X[3]
    K.paving_band(gx - 6.0, gx + 6.0, T_BACK, LOBBY_Z, K.STONE)
    for pz in (-351.0, -357.0, -363.0, -369.0):
        P.place("planter_tree", gx - 4.4 if int(pz) % 2 else gx + 4.4, G0, pz, district=CO)
    K.planter(gx - 5.6, gx - 1.2, -366.6, -365.2, lit="cyan")
    K.planter(gx + 1.2, gx + 5.6, -354.8, -353.4, lit="cyan")
    K.planter(gx - 5.6, gx - 3.8, -361.5, -354.0, lit=None)
    for bz, yaw in ((-359.0, math.pi / 2), (-351.6, -math.pi / 2), (-368.2, 0.0)):
        P.place("bench", gx - 1.0 if yaw > 0 else gx + 1.6, G0, bz, yaw, district=CO)
    K.tube_post(gx + 0.2, -361.6, 0.0, "white", h=5.2)
    K.tube_post(gx - 0.4, -370.6, math.pi / 2, "cyan", h=5.2)
    K.light_strip_ground(gx - 0.06, gx + 0.06, T_BACK + 0.4, LOBBY_Z - 0.4, "cyan")
    for lz in (-352.0, -358.0, -364.0, -370.0):
        K.glow_box(gx + 5.3, gx + 5.5, G0, G0 + 0.8, lz - 0.1, lz + 0.1, "amber", 1)
        light(CO, gx + 4.0, 1.5, lz, "amber", 4.0)
        light(CO, gx - 3.0, 1.5, lz + 3.0, "cyan", 3.0)
    stand(gx - 1.0, -359.0, math.pi / 2, "sit", G0 + 0.45)
    stand(gx + 1.6, -351.6, -math.pi / 2, "sit", G0 + 0.45)
    K.talk(gx + 2.8, -364.2, 0.2, 2)
    stand(gx - 2.6, -369.6, 0.5, "smoke")
    stand(gx + 4.9, -358.0, -math.pi / 2, "lean")

    # 5: the screen court: two screens on legs over a hedge, turned to the
    # boulevard either way (YRL74JmhVgk@133), light lines in the paving, a
    # lit link at the back and a skybridge high over it.
    gx = GAP_X[4]
    for sx, yaw, sw, sh in ((-3.1, math.radians(24), 5.4, 3.2), (3.4, math.radians(-24), 3.3, 4.4)):
        cx, cz = gx + sx, -353.4
        K.screen(cx, 4.3 + sh / 2 + 0.1, cz, sw, sh, yaw, r, depth=0.28, back=True)
        rx, rz = math.cos(yaw), -math.sin(yaw)
        for du in (-sw / 2 + 0.7, sw / 2 - 0.7):
            box(k("metal"), cx + rx * du - 0.1, cx + rx * du + 0.1, G0, 4.3, cz + rz * du - 0.25, cz + rz * du - 0.05, scale=1.0)
    K.planter(gx - 5.6, gx + 5.6, -355.6, -354.4, lit="cyan")
    for j in range(5):
        zz = -357.4 - j * 1.6
        K.light_strip_ground(gx - 5.4, gx + 5.4, zz - 0.03, zz + 0.03, "white" if j % 2 else "cyan")
    top = link(gx, -366.0, 8.0, r, hue="amber", lit=(0.9, 1.0))
    P.place("bench", gx - 3.2, G0, -362.0, 0.0, district=CO)
    P.place("bench", gx + 3.2, G0, -362.0, 0.0, district=CO)
    stand(gx - 3.2, -362.0, 0.0, "sit", G0 + 0.45)
    K.talk(gx + 1.4, -359.6, 1.0, 3)
    stand(gx - 0.6, -351.0, math.radians(200), "phone")
    stand(gx + 2.0, -367.4, 0.0, "lean", top)
    skybridge(gx, 34.2, -361.0, r, "amber", boards=2)

    # 6: the drop-off: a canopy across the gap on four columns, striped
    # paving under it, an orange-lit doorway at the back (mH2wmyeiIpA@182).
    gx = GAP_X[5]
    box(k("trim"), gx - 6.0, gx + 6.0, 5.2, 5.6, -358.0, -347.6, scale=2.0, col=K.BLACK, bottom=True)
    for sx in (-5.4, 5.4):
        for pz in (-357.4, -348.2):
            box(k("metal"), gx + sx - 0.18, gx + sx + 0.18, G0, 5.2, pz - 0.18, pz + 0.18, scale=1.0)
    for j in range(4):
        zz = -356.6 + j * 2.6
        K.glow_box(gx - 4.6, gx + 4.6, 5.14, 5.2, zz - 0.12, zz + 0.12, "white")
        light(CO, gx, 4.4, zz, "white", 5.0)
    K.neon_box(gx - 6.0, gx + 6.0, 5.3, 5.42, -347.6, -347.55, "amber")
    K.stripes(gx - 5.6, gx + 5.6, -357.6, -348.0, step=2.0, w=1.0, along="z", skew=-1.0)
    solid(gx - 6.0, gx + 6.0, 0.0, 9.6, T_BACK + 0.02, -362.0, K.STONE)
    quad(k("corporate"), (gx - 6.0, 5.2, -361.97), (gx + 6.0, 5.2, -361.97), (gx + 6.0, 9.2, -361.97), (gx - 6.0, 9.2, -361.97),
         ((0, 0), (12, 0), (12, 4), (0, 4)), K.glass_col(r, lit=(0.8, 1.0), warm=(0.7, 1.0)))
    box(k("trim"), gx - 2.6, gx + 2.6, 0.0, 4.2, -362.0, -361.7, scale=1.0, col=K.BLACK)
    K.panel(gx, 2.0, -361.68, 4.4, 3.6, 0.0, "amber", 0.9, glow=False)
    box(k("trim", 1), gx - 0.05, gx + 0.05, G0, 3.8, -361.68, -361.6, scale=1.0, col=K.BLACK)
    B.back_ground(CO, B.Face("-z", T_BACK - 0.02, gx - 6.0, gx + 6.0), r, K.STONE)
    quad(k("trim"), (gx + 6.0, SHOP_H, T_BACK - 0.02), (gx - 6.0, SHOP_H, T_BACK - 0.02), (gx - 6.0, 9.6, T_BACK - 0.02), (gx + 6.0, 9.6, T_BACK - 0.02), col=K.STONE)
    B.ROOFS.append((CO, gx - 6.0, gx + 6.0, T_BACK, -362.0, 9.6))
    K.parapet(gx - 6.0, gx + 6.0, T_BACK, -362.0, 9.6, col=K.STONE, h=0.6, edge="cyan")
    stand(gx - 3.4, -361.0, 0.0, "idle")
    stand(gx + 3.4, -361.0, 0.0, "idle")
    stand(gx + 4.6, -352.0, -math.pi / 2, "phone")
    K.talk(gx - 3.6, -353.0, 0.9, 2)


# ---------------------------------------------------------------------------
# The boulevard itself: its median and the gantries over it.
# ---------------------------------------------------------------------------
MEDIAN = (146.0, 422.0, -330.6, -329.4)
GANTRY_X = (283.0,)
PALM0, PALM_STEP = 172.5, 13.0      # the median's first palm, and the step between them
# Where no palm stands: before the third tower's doors, and where the
# braindance's car camera, beside the median, reads the third tower's foot
# ahead of it (x 198.5) and the row behind it (x 276.5 to 315.5).
NO_PALM = ((193.0, 247.0), (270.0, 316.0))
PALMS_E = (322.0, 338.0, 354.0, 370.0, 386.0, 402.0, 416.0)


def median():
    """The boulevard's middle: on a low kerbed strip, raised beds of cast
    concrete 10.4 m long, 13 m apart (16 m east of x 316), with a dim line
    of warm light let in under each one's rim, planted with shrubs of every
    shape; in a bed's middle a tall slender palm, two spike lights in the
    bed turned up into its fronds; a paved break between beds, a low
    hooded light standing in it. (The braindance's car rides z -328 with
    its camera a metre up beside it, reading the first and third towers'
    fronts across the median from x 120 to 320, ahead and then back over
    its shoulder: west of x 316 a bed's planting stands under about a
    metre and a palm is all trunk below the rays, and none stands before
    those two towers' doors, nor where its camera reads the third tower
    past the median, NO_PALM.)"""
    x0, x1, z0, z1 = MEDIAN
    r = random.Random(7790)
    box(k("kerb"), x0, x1, 0.0, 0.2, z0, z1, scale=1.0)
    quad(k("trim"), (x0 + 0.2, 0.205, z1 - 0.15), (x1 - 0.2, 0.205, z1 - 0.15), (x1 - 0.2, 0.205, z0 + 0.15), (x0 + 0.2, 0.205, z0 + 0.15), col=K.STONE)
    for xe in (x0, x1):
        cylinder(k("kerb"), xe, (z0 + z1) / 2, 0.0, 0.2, 0.6, segs=10)
    conc = (0.2, 0.2, 0.21, 1.0)
    rim = tuple(c * 0.12 for c in GLOW["amber"][:3]) + (1.0,)
    bed_y = 0.2
    # Beds 10.4 m long at a 13 m step down the whole strip, a palm in the
    # middle of each but where the braindance looks across at the first and
    # third towers' doors (x 133..167, 209..243) and under the gantry.
    beds = [(x0 + 1.6, PALM0 - PALM_STEP - 5.2 - 2.6, None)]
    c = PALM0 - PALM_STEP
    while c + 5.2 < 316.0:
        palm = c if c >= PALM0 and not (205.0 < c < 247.0) and abs(c - GANTRY_X[0]) > 6.0 else None
        beds.append((c - 5.2, c + 5.2, palm))
        c += PALM_STEP
    # East of x 316 the palms stand where the braindance's camera has
    # always looked past them, 16 m apart.
    for c in PALMS_E:
        beds.append((c - 5.2, min(c + 5.2, x1 - 1.6), c))
    for n_, (xa, xb, palm) in enumerate(beds):
        top = bed_y + (0.3 if palm is None else 0.58 if palm in PALMS_E else 0.46)
        box(k("castconcrete"), xa, xb, bed_y, top, z0 + 0.06, z1 - 0.06, scale=1.5, col=conc)
        box(k("castconcrete", 1), xa - 0.04, xb + 0.04, top - 0.07, top, z0 + 0.02, z1 - 0.02, scale=1.5, col=(0.26, 0.26, 0.27, 1.0))
        for za, zb in ((z0 + 0.03, z0 + 0.06), (z1 - 0.06, z1 - 0.03)):
            box(k("glow"), xa + 0.25, xb - 0.25, top - 0.14, top - 0.09, za, zb, scale=1.0, col=rim)
        quad(k("trim"), (xa + 0.12, top + 0.004, z1 - 0.2), (xb - 0.12, top + 0.004, z1 - 0.2), (xb - 0.12, top + 0.004, z0 + 0.2), (xa + 0.12, top + 0.004, z0 + 0.2),
             col=K.SOIL)
        # (West of x 316 nothing in a bed stands much over a metre: the
        # braindance's car camera reads the towers across it.)
        hmax = 0.42 if palm is None else 0.6 if xa > 316.0 else 0.5
        if palm is None:
            K.shrubs(xa + 0.45, xb - 0.3, -330.0, top, r, spread=0.24, hmax=hmax)
        else:
            # (Its own planter sunk under the bed's soil, the trunk rising
            # out of it.)
            sy, sxz = r.uniform(1.6, 1.8), 0.66
            if palm in PALMS_E:
                # (As the palms stood here before, the bed a little higher
                # to take its planter under the soil.)
                sy, sxz = 1.5, 0.62
            # (A bed in NO_PALM is planted as if its palm stood: the same
            # shrubs, a gap in the middle.)
            shown = not any(a_ < palm < b_ for a_, b_ in NO_PALM)
            if shown:
                P.place("planter_palm", palm, -0.3 if palm in PALMS_E else top - 0.7 * sy - 0.03, -330.0, 0.7 * palm, sy=sy, sxz=sxz, district=CO)
            K.shrubs(xa + 0.45, palm - 0.75, -330.0, top, r, spread=0.24, hmax=hmax)
            K.shrubs(palm + 0.75, xb - 0.3, -330.0, top, r, spread=0.24, hmax=hmax)
            if shown:
                for sx in (-1, 1):
                    K.uplight(palm + sx * 1.0, -330.0 + sx * 0.25, top, -sx * math.pi / 2, "amber")
                light(CO, palm, 2.2, -330.0, "amber", 4.5)
        # The break after it: a hooded light in its middle.
        if n_ + 1 < len(beds):
            gx_ = (xb + beds[n_ + 1][0]) / 2
            K.bollard_light(gx_, -330.0, bed_y, "amber", pool=3.0)
    for xe in (x0 + 0.7, x1 - 0.7):
        K.bollard_light(xe, -330.0, bed_y, "amber", h=0.8, pool=3.0)


def bridge():
    """A footbridge over the boulevard at its west end, from the west
    block's front to the corner lot across the street, a little askew: a
    glazed tube on a trussed deck ten metres up, people crossing in it
    under a line of warm light, a line of cyan along each edge of its
    deck and of amber under its belly, three adverts standing on its roof
    turned up the boulevard. (West of the first tower: the braindance's car
    is past it before its camera reads the row, and the fixed camera's
    lines down the row from junction I end short of it. It stands over the
    Experience and street shots' lenses, out of both frames.)"""
    zn, zs = LOT_N + 0.5, -316.5
    cn, cs, hw = 130.6, 134.1, 2.1
    ya, yf, yr, yt = 10.6, 11.0, 14.2, 14.6

    def at(t, u=0.0, y=0.0):
        return (cn + (cs - cn) * t + u, y, zn + (zs - zn) * t)

    def slab(key, u0, u1, y0, y1, col, t0=0.0, t1=1.0):
        a0, a1, b0, b1 = at(t0, u0), at(t0, u1), at(t1, u0), at(t1, u1)
        quad(key, (a0[0], y0, a0[2]), (b0[0], y0, b0[2]), (b0[0], y1, b0[2]), (a0[0], y1, a0[2]), col=col)
        quad(key, (b1[0], y0, b1[2]), (a1[0], y0, a1[2]), (a1[0], y1, a1[2]), (b1[0], y1, b1[2]), col=col)
        quad(key, (b0[0], y1, b0[2]), (b1[0], y1, b1[2]), (a1[0], y1, a1[2]), (a0[0], y1, a0[2]), col=col)
        quad(key, (a0[0], y0, a0[2]), (a1[0], y0, a1[2]), (b1[0], y0, b1[2]), (b0[0], y0, b0[2]), col=col)

    paint = (0.06, 0.07, 0.09, 1.0)
    slab(k("steel"), -hw, hw, ya, yf, paint)
    slab(k("steel"), -hw - 0.15, hw + 0.15, yr, yt, paint)
    # Its glass, each side one pane's height, and the truss in it.
    for u in (-hw, hw):
        a, b = at(0.0, u), at(1.0, u)
        quad(k("clearglass"), (a[0], yf, a[2]), (b[0], yf, b[2]), (b[0], yr, b[2]), (a[0], yr, a[2]), col=(0.55, 0.85, 0.95, 1.0))
        n = 8
        for j in range(n + 1):
            px, _, pz = at(j / n, u)
            box(k("steel"), px - 0.08, px + 0.08, yf, yr, pz - 0.08, pz + 0.08, scale=1.0, col=paint)
            if j < n:
                qx, _, qz = at((j + 1) / n, u)
                pipe(k("steel", 1), (px, yf if j % 2 else yr, pz), (qx, yr if j % 2 else yf, qz), 0.045, segs=4, col=paint)
        # A line of cyan along the deck's edge, a rail inside the glass.
        su = math.copysign(1.0, u)
        slab(k("glow"), u + su * 0.0, u + su * 0.06, ya + 0.1, ya + 0.24, GLOW["cyan"]) if u > 0 else slab(k("glow"), u - 0.06, u, ya + 0.1, ya + 0.24, GLOW["cyan"])
        a, b = at(0.0, u - su * 0.12), at(1.0, u - su * 0.12)
        pipe(k("metal", 1), (a[0], yf + 1.0, a[2]), (b[0], yf + 1.0, b[2]), 0.03, segs=5)
    amber = tuple(c * 0.7 for c in GLOW["amber"][:3]) + (1.0,)
    slab(k("glow"), -0.14, 0.14, yr - 0.05, yr - 0.01, amber, 0.03, 0.97)
    slab(k("glow"), -0.2, 0.2, ya - 0.05, ya - 0.01, tuple(c * 0.5 for c in GLOW["amber"][:3]) + (1.0,), 0.05, 0.95)
    # Where it lands: a dark collar on each wall, struts under its ends.
    box(k("trim"), cn - hw - 0.4, cn + hw + 0.4, ya - 0.3, yt + 0.3, LOT_N + 0.1, zn + 0.1, scale=1.0, col=K.BLACK)
    box(k("trim"), cs - hw - 0.4, cs + hw + 0.4, ya - 0.3, yt + 0.3, zs - 0.1, -316.0, scale=1.0, col=K.BLACK)
    for u in (-hw + 0.3, hw - 0.3):
        pipe(k("steel"), (cn + u, ya - 2.6, LOT_N + 0.1), at(0.12, u, ya), 0.07, segs=5, col=paint)
        pipe(k("steel"), (cs + u, ya - 2.6, -316.0), at(0.88, u, ya), 0.07, segs=5, col=paint)
    # People crossing.
    yaw = math.atan2(cs - cn, zs - zn)
    for t, u, pose, turn in ((0.14, -0.6, "idle", 0.0), (0.3, 0.7, "phone", math.pi), (0.46, -1.5, "lean", math.pi / 2), (0.58, 0.3, "talk", 0.0),
                             (0.61, 0.5, "talk", math.pi), (0.8, -0.4, "idle", math.pi), (0.9, 1.4, "lean", -math.pi / 2)):
        px, _, pz = at(t, u)
        stand(px, pz, yaw + turn, pose, yf)
    # Adverts on its roof, turned up the boulevard, their backs to the junction.
    r = random.Random(7795)
    east = yaw + math.pi / 2
    for t, w in ((0.2, 6.0), (0.5, 7.4), (0.8, 6.0)):
        px, _, pz = at(t, hw - 0.5)
        K.screen(px, yt + 1.25, pz, w, 1.9, east, r, depth=0.18, back=True, pal=K.COLD)
        for du in (-w / 2 + 0.5, w / 2 - 0.5):
            box(k("metal", 1), px + math.cos(east) * du - 0.05, px + math.cos(east) * du + 0.05, yt, yt + 0.4, pz - math.sin(east) * du - 0.05, pz - math.sin(east) * du + 0.05, scale=0.5)
    for t in (0.0, 1.0):
        px, _, pz = at(t)
        K.aviation(px, yt + 0.3, pz)


def gantry(gx):
    """A lane gantry over the eastbound carriageway (mH2wmyeiIpA@182): a
    steel mast at the south kerb's edge, clear of the walkers' lines, a
    trussed arm out to the median held by a stay, an advert over each lane
    facing the traffic and one long one on its back, lane lamps under
    them, a strip of red light along its foot. (Nothing spans the westbound
    side, and no leg stands on the median: the braindance's cameras ride
    low beside the car and read the towers' fronts across both.)"""
    r = random.Random(int(gx) * 7 + 5)
    zs, ze = -320.48, MEDIAN[3] + 0.25
    y0, y1 = 7.6, 9.7
    paint = (0.07, 0.085, 0.11, 1.0)
    box(k("steel"), gx - 0.26, gx + 0.26, G0, 13.0, zs - 0.2, zs + 0.2, scale=1.5, col=paint)
    box(k("trim", 1), gx - 0.3, gx + 0.3, G0 + 0.2, G0 + 0.9, zs - 0.24, zs + 0.24, scale=1.0, col=K.YELLOW)
    K.glow_box(gx - 0.05, gx + 0.05, G0 + 1.4, y0, zs - 0.23, zs - 0.2, "white")
    # The arm: two chords, posts and braces between them.
    for ya, yb in ((y0, y0 + 0.2), (y1 - 0.2, y1)):
        box(k("steel"), gx - 0.42, gx + 0.42, ya, yb, ze, zs - 0.2, scale=1.5, col=paint, bottom=True)
    n = 5
    for j in range(n + 1):
        z = ze + 0.1 + (zs - 0.4 - ze) * j / n
        for sx in (-0.36, 0.36):
            box(k("steel"), gx + sx - 0.06, gx + sx + 0.06, y0 + 0.2, y1 - 0.2, z - 0.06, z + 0.06, scale=1.0, col=paint)
            if j < n:
                zn_ = ze + 0.1 + (zs - 0.4 - ze) * (j + 1) / n
                pipe(k("steel", 1), (gx + sx, y0 + 0.2, z) if j % 2 else (gx + sx, y1 - 0.2, z),
                     (gx + sx, y1 - 0.2, zn_) if j % 2 else (gx + sx, y0 + 0.2, zn_), 0.045, segs=4, col=paint)
    pipe(k("steel"), (gx, 12.8, zs), (gx, y1, ze + 1.2), 0.05, segs=5, col=paint)
    pipe(k("steel"), (gx, 12.8, zs), (gx, y1, (ze + zs) / 2), 0.05, segs=5, col=paint)
    K.aviation(gx, 13.0, zs)
    for f in (-1, 1):
        xa, xb = sorted((gx + f * 0.42, gx + f * 0.46))
        K.neon_box(xa, xb, y0 - 0.1, y0, ze + 0.2, zs - 0.4, "red")
    # Over each lane, facing the traffic: an advert, and a lane lamp under it.
    for j, z in enumerate((-327.25, -322.95)):
        K.screen(gx - 0.56, 8.75, z, 3.7, 2.5, -math.pi / 2, r, depth=0.14, pal=K.COLD)
        K.glow_box(gx - 0.6, gx - 0.56, y0 - 0.75, y0 - 0.25, z - 0.25, z + 0.25, ("green", "amber")[j])
        box(k("trim", 1), gx - 0.56, gx - 0.4, y0 - 0.82, y0 - 0.18, z - 0.32, z + 0.32, scale=1.0, col=K.BLACK)
        light(CO, gx - 2.5, 6.0, z, ("cyan", "amber")[j], 5.0)
    # On its back, one long advert.
    K.screen(gx + 0.56, 8.75, (ze + zs) / 2 - 0.2, 7.6, 2.5, math.pi / 2, r, depth=0.14, pal=K.WARM)
    light(CO, gx + 2.5, 6.0, -325.0, "amber", 5.0)
    # A street sign hung under its foot, over the kerb, askew.
    K.st_blade(gx, y0 - 0.66, zs - 1.3, "bx", math.radians(82), n=K.BOLT)
    for dz in (-0.5, 0.5):
        box(k("metal", 1), gx - 0.03, gx + 0.03, y0 - 0.1, y0, zs - 1.3 + dz - 0.03, zs - 1.3 + dz + 0.03, scale=0.5)


def corners():
    """The two ends of the row at street level: before the west block's
    lobby at the head of the x 120 road, and before the corner block's on
    junction I."""
    r = random.Random(7781)
    # West: bollards along the kerb, a totem and poster panels on the
    # pavement's middle strip, people coming out.
    K.bollards(110.0, 131.0, KERB_N - 0.28, step=3.0, proto="bollard")
    K.totem(111.5, KERB_STRIP_N, 0.0, r, colour="cyan", sizes=("bx", "bx"))
    K.ad_panel(126.5, KERB_STRIP_N, 0.0, r, pal=K.COLD)
    stand(118.0, LOT_N + 0.75, 0.0, "idle")
    stand(123.4, LOT_N + 0.8, 0.0, "idle")
    K.talk(114.0, LOT_N + 1.0, 0.3, 2)
    stand(129.0, LOT_N + 0.9, math.radians(30), "phone")
    # East: the corner of pavement the junction leaves, a forecourt for the
    # corner block: palms, a booth, bollards on the kerb, a totem.
    K.bollards(441.0, 447.0, KERB_N - 0.28, step=2.0, proto="bollard")
    K.bollards_z(-343.0, -339.8, 451.4, step=1.6, proto="bollard")
    P.place("planter_palm", 449.6, G0, -342.4, district=CO)
    P.place("planter_palm", 434.4, G0, LOT_N - 1.0 + 2.6, district=CO)
    K.totem(446.5, KERB_STRIP_N - 0.2, 0.0, r, colour="cyan", sizes=("bm",))
    stand(439.0, LOT_N + 0.8, 0.0, "idle")
    stand(444.6, LOT_N + 0.85, 0.0, "idle")
    K.talk(448.0, -340.6, 0.9, 3)
    stand(436.0, LOT_N + 0.9, math.radians(-25), "phone")
    K.paving_band(440.0, 452.0, LOT_N, -339.3, K.STONE, y=G0 + 0.01)
    K.light_strip_ground(440.2, 451.8, LOT_N + 0.3, LOT_N + 0.38, "cyan")
    # Signs drawn in light on poles, at the row's two ends and in its
    # middle.
    K.holo_sign(446.6, -341.9, -math.pi / 4, r, "cyan", y=7.6, n=K.STAR)
    K.holo_sign(110.6, LOT_N + 0.5, math.radians(20), r, "teal", y=7.2, size=3.0, n=K.EYE)
    K.holo_sign(GAP_X[3] + 2.6, LOT_N - 2.2, 0.0, r, "cyan", y=7.0, size=3.0, n=K.CROSS)
    # The stacked block's forecourt.
    K.bollards(398.0, 426.0, KERB_N - 0.28, step=3.5, proto="bollard")
    stand(409.0, LOT_N + 0.8, 0.0, "idle")
    stand(414.2, LOT_N + 0.85, 0.0, "idle")
    K.ad_panel(402.0, KERB_STRIP_N, 0.0, r, pal=K.WARM)
    P.place("bench", 420.0, G0, LOT_N + 0.45, 0.0, district=CO)
    stand(420.0, LOT_N + 0.45, 0.0, "sit", G0 + 0.45)


def pavement_n():
    """What stands along the north pavement between the forecourts: kiosks,
    benches and bins in the gaps' mouths, behind the lot line; poster panels
    and camera poles at the kerb's edge. Its middle is left to walkers."""
    r = random.Random(7771)
    for j, gx in enumerate(GAP_X):
        if j in (0, 3):
            K.kiosk(gx + 1.5, LOT_N - 1.9, 0.0, "cyan" if j else "amber", w=2.0, d=1.2)
            stand(gx + 1.5, LOT_N - 0.75, math.pi, "idle")
        else:
            P.place("bench", gx - 2.6, G0, LOT_N - 0.55, 0.0, district=CO)
            if j % 2:
                stand(gx - 2.6, LOT_N - 0.55, 0.0, "sit", G0 + 0.45)
        if j != 2:      # (the gap east of the server hall's tower: the braindance reads that tower's foot across its mouth)
            P.place("bin", gx - 5.3, G0, LOT_N - 0.5, district=CO)
            P.place("cctv", gx + 5.4, G0, KERB_STRIP_N, district=CO)
        if j < 3:
            K.ad_panel(gx + 3.6, KERB_STRIP_N, 0.0, r, pal=None if j % 2 else K.COLD)
        elif j > 3:
            for dx in (3.0, 4.2):
                P.place("lightbox", gx + dx, G0, KERB_STRIP_N, math.pi / 2, district=CO)


def gantry_paving(gx):
    """The carriageway under a gantry, striped yellow and dark
    (mH2wmyeiIpA@182): chevron bars across the lanes either side of the
    median, pointing the way each side drives. Paint only."""
    mz0, mz1 = MEDIAN[2], MEDIAN[3]
    for za, zb, skew in ((-338.7, mz0 - 0.5, -1.4), (mz1 + 0.5, -321.3, 1.4)):
        x = gx - 7.0
        while x + 1.0 <= gx + 7.0:
            quad(k("paint"), (x + skew, 0.012, zb), (x + 1.0 + skew, 0.012, zb), (x + 1.0, 0.012, za), (x, 0.012, za), col=(0.86, 0.66, 0.10, 1.0))
            x += 2.4


west_block()
east_blocks()
back_row()
lane()
track()
halt()
forecourts()
room()
server_wall()
gaps()
median()
bridge()
for _gx in GANTRY_X:
    gantry(_gx)
gantry_paving(GANTRY_X[0])
pavement_n()
corners()
