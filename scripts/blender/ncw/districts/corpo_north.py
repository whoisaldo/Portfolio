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
BACK0, BACK1 = -420.0, -384.0
TRACK_Z = -378.5
TRACK_Y = 19.0            # the track's running surface
WEST_X, EAST_X = 133.0, 432.0

# ---------------------------------------------------------------------------
# The ground: paved to the district's edge, the lane behind the towers in
# cast concrete, and the corner of the pavement junction I leaves bare.
# ---------------------------------------------------------------------------
ground([(WEST_X, EAST_X, LANE0, LANE1, "concrete")], 108.0, 470.0, BACK0, LOT_N)
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
                 corners="cyan", edge="cyan", top_band="amber", lit=(0.35, 0.6), warm=(0.3, 0.7))
    # (tiers end at 59.6 and 68.)
    cols, rows = 3, 4
    sw, sh, gx, gy = 7.0, 8.4, 0.6, 0.6
    xa = (x0 + x1) / 2 - (cols * sw + (cols - 1) * gx) / 2
    box(k("board_frame"), xa - 0.5, xa + cols * (sw + gx) - gx + 0.5, 9.6, 10.2 + rows * (sh + gy), LOT_N, LOT_N + 0.1, scale=2.0)
    for j in range(rows):
        for i in range(cols):
            K.screen(xa + i * (sw + gx) + sw / 2, 10.5 + j * (sh + gy) + sh / 2, LOT_N + 0.42, sw, sh, 0.0, r, depth=0.3, pal=K.MEDIA)
    for i in range(cols + 1):
        x = xa - gx / 2 + i * (sw + gx)
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
    K.roof_plant(x0 + 1, x1 - 4, BACK0 + 1, T_BACK - 5, 40.0, r, cap=5.0)
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
    K.screen(394.65, 30.0, -359.0, 9.0, 5.4, -math.pi / 2, r)
    # The corner block: a slab 74 m high over the junction, its face to the
    # garage street a column of screens; lower behind, where the track ends
    # in it. Along z -344 east of x 452 the Afterlife Block's block stands
    # against it.
    x0, x1 = EAST_X, 470.0
    K.corp_block(x0, x1, BACK1, LOT_N, 74.0, 7713, skin="windows", tint="charcoal", style=5,
                 tiers=((0.8, 0.0), (1.0, (0.0, 0.0, 3.0, 3.0))), fronts={"-x": "dock", "+x": "blank", "+z": "blank", "-z": "none"},
                 corners="cyan", edge="cyan", top_band="amber", lit=(0.45, 0.75), warm=(0.2, 0.6))
    f = B.Face("+z", LOT_N, x0, 452.0)
    K.front(f, K.BASE, "glass", r, 0, "cyan", 2.6)
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
    K.roof_plant(x0 + 4, x1 - 1, BACK0 + 1, BACK1 - 1, 48.0, r, cap=5.0)
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
    K.corp_block(160.0, 182.0, BACK0, BACK1, 50.0, 7723, skin="windows", tint="teal", style=5,
                 tiers=((1.0, 0.0),), fronts={"+z": "dock", "-z": "blank", "+x": "dock", "-x": "none"}, edge="amber",
                 lit=(0.5, 0.8), warm=(0.5, 1.0))
    K.roof_plant(139.0, 158.0, BACK0 + 4, BACK1 - 4, 72.0, r, cap=4.0)
    K.roof_plant(161.0, 181.0, BACK0 + 1, BACK1 - 1, 50.0, r, cap=5.0)
    K.screen(171.0, 41.0, BACK1 + 0.4, 14.0, 7.6, 0.0, r)
    # 2: the tall one behind the second gap: a stepped glass tower, light
    # up its corners, screens stacked on its upper south face.
    K.corp_block(188.0, 226.0, BACK0, BACK1, 84.0, 7724, skin="glass", tiers=((0.6, 0.0), (0.86, 3.0), (1.0, 6.0)),
                 corners="cyan", edge="cyan", top_band="amber", lit=(0.5, 0.85), **D)
    K.screen_stack(207.0, BACK1 - 3.0 + 0.42, 56.0, 12.0, (7.0, 5.0, 6.0), 0.0, r)
    K.roof_plant(195.0, 219.0, BACK0 + 7, BACK1 - 7, 84.0, r, cap=3.5)
    K.mast(207.0, -402.0, 84.0, 14.0)
    # 3: the block the halt opens into.
    K.corp_block(232.0, 262.0, BACK0, BACK1, 44.0, 7725, skin="windows", tint="teal", style=4, tiers=((1.0, 0.0),),
                 edge="amber", top_band="cyan", lit=(0.55, 0.85), warm=(0.1, 0.5), **D)
    K.roof_plant(233.0, 261.0, BACK0 + 1, BACK1 - 1, 44.0, r, cap=5.0)
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
                 tiers=((0.4, (0.0, 4.0, 0.0, 2.0)), (0.72, (5.0, 0.0, 3.0, 0.0)), (1.0, (2.0, 6.0, 0.0, 5.0))),
                 edge="amber", top_band="amber", colour="amber", lit=(0.5, 0.85), warm=(0.4, 0.9), **D)
    K.roof_plant(307.0, 331.0, BACK0 + 1, BACK1 - 6, 70.0, r, cap=4.0)
    K.screen(322.0, 44.0, BACK1 + 0.4, 13.0, 7.0, 0.0, r)
    # 6: the tallest, a dark slab with fins and a crown of light.
    K.corp_block(344.0, 378.0, BACK0, BACK1, 90.0, 7727, skin="windows", tint="navy", style=5, tiers=((0.8, 0.0), (1.0, 2.6)),
                 fin_step=5.6, fin_faces=("+z", "-z", "+x", "-x"), corners="amber", edge="amber", top_band="cyan",
                 lit=(0.5, 0.8), warm=(0.5, 1.0), **D)
    K.screen_stack(361.0, BACK1 - 2.6 + 0.42, 74.0, 16.0, (6.0, 6.0), 0.0, r)
    K.roof_plant(349.0, 373.0, BACK0 + 4, BACK1 - 4, 90.0, r, cap=3.5)
    K.mast(361.0, -402.0, 90.0, 12.0)
    # 7: a glass shaft and a lower wing, by the corner block.
    K.corp_block(384.0, 408.0, BACK0, BACK1, 62.0, 7728, skin="glass", tiers=((0.8, 0.0), (1.0, 2.4)), corners="cyan",
                 edge="cyan", fronts={"+z": "dock", "-z": "blank", "-x": "dock", "+x": "none"})
    K.corp_block(408.0, 428.0, BACK0, BACK1, 46.0, 7729, skin="windows", tint="concrete", style=2, tiers=((1.0, 0.0),),
                 fronts={"+z": "dock", "-z": "blank", "+x": "dock", "-x": "none"}, edge="amber", lit=(0.45, 0.75), warm=(0.5, 1.0))
    K.roof_plant(386.0, 406.0, BACK0 + 3, BACK1 - 3, 62.0, r, cap=4.0)
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
            for sx in (-1, 1):
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
    for name, (vx, vz) in (("lane_w", (207.5, TRACK_Z + 3.4)), ("lane_e", (333.0, TRACK_Z - 3.2))):
        box(k("metal", 1), vx - 0.45, vx + 0.45, G0, G0 + 0.06, vz - 0.45, vz + 0.45, scale=0.5)
        K.steam(name, vx, G0 + 0.1, vz)


def track():
    """The elevated track: a teal beam on hammerhead piers down the middle
    of the lane, a walkway and a rail either side, pink lamps along it
    (mH2wmyeiIpA@143), amber under it."""
    z = TRACK_Z
    top = TRACK_Y
    box(k("trim"), WEST_X, EAST_X, top - 1.5, top - 0.2, z - 1.5, z + 1.5, scale=3.0, col=K.TEAL, bottom=True)
    box(k("trim"), WEST_X, EAST_X, top - 0.2, top, z - 2.3, z + 2.3, scale=3.0, col=K.TEAL, bottom=True)
    for s in (-1, 1):
        za, zb = sorted((z + s * 2.2, z + s * 2.3))
        box(k("trim"), WEST_X, EAST_X, top, top + 0.9, za, zb, scale=3.0, col=K.TEAL)
        zc, zd = sorted((z + s * 2.3, z + s * 2.34))
        K.glow_box(WEST_X, EAST_X, top - 0.12, top - 0.04, zc, zd, "pink")
        # The running rail and its lit edge.
        ze, zf = sorted((z + s * 0.72, z + s * 0.86))
        box(k("metal"), WEST_X, EAST_X, top, top + 0.16, ze, zf, scale=1.0)
    x = WEST_X + 2.0
    while x < EAST_X - 1.0:
        for s in (-1, 1):
            K.glow_box(x - 0.14, x + 0.14, top + 0.9, top + 1.12, z + s * 2.25 - 0.1, z + s * 2.25 + 0.1, "pink")
        x += 4.75
    for px in range(150, 430, 19):
        if 236 < px < 256:
            continue
        box(k("trim"), px - 0.75, px + 0.75, G0, top - 2.3, z - 0.75, z + 0.75, scale=2.0, col=K.TEAL)
        box(k("trim"), px - 0.9, px + 0.9, top - 2.3, top - 1.5, z - 2.2, z + 2.2, scale=2.0, col=K.TEAL, bottom=True)
        box(k("trim", 1), px - 1.0, px + 1.0, G0, G0 + 0.9, z - 1.0, z + 1.0, scale=1.0, col=K.STONE)
        box(k("trim", 1), px - 1.02, px + 1.02, G0 + 0.55, G0 + 0.75, z - 1.02, z + 1.02, scale=1.0, col=K.YELLOW)
        K.neon_box(px - 0.5, px + 0.5, top - 2.42, top - 2.34, z - 2.0, z - 1.0, "amber", 1)
        K.neon_box(px - 0.5, px + 0.5, top - 2.42, top - 2.34, z + 1.0, z + 2.0, "amber", 1)
        light(CO, px, 12.0, z - 2.5, "amber", 4.0)
        light(CO, px, 12.0, z + 2.5, "amber", 4.0)


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
            K.glow_box(a + 0.5, b - 0.5, top + 2.2, top + 3.05, zc, zd, "white")
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
PAVE_MID_N = -341.3       # between the walkers' two lines on the north pavement
KERB_N = -339.3
ACCENTS = ["cyan", "white", "amber", "cyan", "white", "amber", "cyan"]


def forecourts():
    """Each tower's forecourt, no two alike: what stands either side of the
    way in, how it is guarded, how it is lit."""
    r = random.Random(7741)
    for i, tx in enumerate(TOWER_X):
        hue = ACCENTS[i]
        room_tower = i == 0
        # The canopy's soffit, lit in strips, and a line of light along its
        # front edge.
        quad(k("trim"), (tx - 13.0, 7.49, LOBBY_Z), (tx + 13.0, 7.49, LOBBY_Z), (tx + 13.0, 7.49, LOT_N), (tx - 13.0, 7.49, LOT_N), col=K.STEEL)
        for sx in (-9.0, -4.5, 0.0, 4.5, 9.0):
            K.glow_box(tx + sx - 1.6, tx + sx + 1.6, 7.44, 7.49, -346.9, -346.5, "white")
            light(CO, tx + sx, 6.8, -346.0, "white", 4.0)
        K.neon_box(tx - 13.0, tx + 13.0, 7.5, 7.62, LOT_N, LOT_N + 0.05, hue)
        # Slim columns under its front edge.
        for sx in (-12.6, -4.2, 4.2, 12.6):
            box(k("metal"), tx + sx - 0.2, tx + sx + 0.2, G0, 7.5, LOT_N - 0.7, LOT_N - 0.3, scale=1.0)
        # Paving: a carpet of pale stone from the doors to the kerb, light
        # lines either side of it.
        K.paving_band(tx - 3.2, tx + 3.2, LOBBY_Z, LOT_N, K.PALE)
        K.paving_band(tx - 3.2, tx + 3.2, LOT_N, KERB_N - 0.02, K.STONE, y=G0 + 0.004)
        for sx in (-3.3, 3.3):
            K.light_strip_ground(tx + sx - 0.05, tx + sx + 0.05, LOBBY_Z + 0.2, LOT_N - 0.1, hue)
        if not room_tower:
            for sx in ((-2.0, 0.0, 2.0), (-1.2, 1.2), (-3.0, -1.0, 1.0, 3.0))[i % 3]:
                gate(tx + sx, LOBBY_Z + 0.9, hue)
            stand(tx - 3.9, LOBBY_Z + 1.0, 0.0, "idle")
            stand(tx + 3.9, LOBBY_Z + 1.1, 0.0, "idle")
        side = -1 if i % 2 else 1
        K.bollards(tx - 11.0, tx + 11.0, KERB_N - 0.28, step=(2.75, 2.2, 3.1)[i % 3], proto="bollard")
        if i == 0:
            # The room's tower: open to the street; low hedges, a totem.
            K.planter(tx - 12.2, tx - 9.0, -347.2, -345.6, lit=hue)
            K.planter(tx + 9.0, tx + 12.2, -347.2, -345.6, lit=hue)
            K.totem(tx - 9.5, PAVE_MID_N, math.radians(62), r, colour=hue, sizes=("bx", "ps"))
            stand(tx + 8.2, -345.0, math.radians(-20), "phone")
            K.talk(tx - 7.4, -344.9, 0.3)
        elif i == 1:
            # A booth, hedged beds, two tube lamps.
            K.stripes(tx - 12.6, tx - 3.6, LOT_N - 0.75, LOT_N - 0.1, step=1.5, w=0.75, skew=0.5)
            K.planter(tx - 12.2, tx - 5.0, -347.4, -346.0, lit=hue)
            K.planter(tx + 5.0, tx + 8.0, -347.4, -346.0, lit=hue)
            K.booth(tx + 10.6, -345.4, 0.0, r, "white")
            stand(tx + 9.0, -344.9, 0.0, "idle")
            for sx in (-11.6, 4.4):
                K.tube_post(tx + sx, -344.9, 0.0, "white", h=6.0, arm=1.2)
            K.totem(tx - 8.5, PAVE_MID_N, math.radians(-62), r, colour=hue, sizes=("bm",))
            stand(tx - 6.2, -345.1, math.radians(20), "phone")
        elif i == 2:
            # The server hall's tower: plant at street level too: a row of
            # cube bollards, a service terminal, red lines in the paving.
            K.bollards(tx - 12.0, tx - 4.0, -345.0, step=2.0)
            K.bollards(tx + 4.0, tx + 12.0, -345.0, step=2.0)
            for sx in (-8.0, 8.0):
                K.light_strip_ground(tx + sx - 3.6, tx + sx + 3.6, -346.3, -346.2, "red")
            K.kiosk(tx + 10.4, -346.8, 0.0, "amber", w=2.4, d=1.0, h=2.2)
            K.booth(tx - 10.6, -346.6, 0.0, r, "amber")
            stand(tx - 8.9, -346.2, 0.0, "idle")
            K.totem(tx + 9.5, PAVE_MID_N, math.radians(62), r, colour="red", sizes=("bx", "bx"))
            K.talk(tx + 6.2, -345.4, 1.1)
        elif i == 3:
            # The tallest: a screen on a plinth turned to the street, four
            # light masts in a row, long low beds.
            K.screen(tx - 9.6, 3.9, -345.6, 2.6, 4.2, math.radians(18), r, depth=0.3, back=True, pal=K.COLD)
            solid(tx - 11.0, tx - 8.2, G0, 1.6, -346.2, -345.0, K.BLACK)
            for sx in (4.6, 7.2, 9.8, 12.4):
                K.tube_post(tx + sx, -345.0, math.pi / 2, "cyan", h=6.6, arm=0.5)
            K.planter(tx + 4.2, tx + 12.4, -347.6, -346.6, lit=hue)
            K.stripes(tx - 7.6, tx - 3.6, LOT_N - 0.75, LOT_N - 0.1, step=1.5, w=0.75, skew=0.5)
            stand(tx + 6.0, -345.6, 0.0, "phone")
            K.talk(tx - 6.0, -345.2, 0.5, 3)
            K.totem(tx + 9.5, PAVE_MID_N, math.radians(-62), r, colour=hue, sizes=("ps", "ps"))
        elif i == 4:
            # Trees in stone planters under the canopy, benches, people.
            for sx in (-10.4, -6.0, 6.0, 10.4):
                P.place("planter_tree", tx + sx, G0, -346.3, district=CO)
            for sx, yaw in ((-8.2, 0.0), (8.2, 0.0)):
                P.place("bench", tx + sx, G0, -345.0, yaw, district=CO)
            stand(tx - 8.2, -345.0, 0.0, "sit", G0 + 0.45)
            stand(tx + 8.6, -345.0, 0.0, "sit", G0 + 0.45)
            stand(tx + 7.6, -345.0, 0.0, "sit", G0 + 0.45)
            K.talk(tx - 5.0, -345.2, 0.2)
            P.place("cctv", tx + 12.7, G0, -344.6, district=CO)
            K.ad_panel(tx - 9.0, PAVE_MID_N, math.radians(90), r, pal=K.COLD)
        elif i == 5:
            # Barriers and a booth: a checked way in, hazard stripes.
            K.stripes(tx - 12.6, tx + 12.6, LOT_N - 0.75, LOT_N - 0.1, step=1.5, w=0.75, skew=0.5)
            for sx in (-7.0, -4.4, 4.4, 7.0):
                P.place("barrier", tx + sx, G0, -345.6, district=CO)
            K.booth(tx - 10.8, -346.4, 0.0, r, "amber")
            K.booth(tx + 10.8, -346.4, 0.0, r, "amber")
            stand(tx - 9.2, -345.6, 0.0, "idle")
            stand(tx + 9.2, -345.7, 0.0, "idle")
            K.totem(tx - 9.5, PAVE_MID_N, math.radians(62), r, colour=hue, sizes=("bx", "ps"))
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
            K.totem(tx + 9.5, PAVE_MID_N, math.radians(-62), r, colour=hue, sizes=("bm",))
            K.talk(tx + 3.6, -345.2, 0.9)
            stand(tx + 10.6, -345.0, math.radians(160), "phone")
        if i not in (4,):
            P.place("cctv", tx - side * 12.7, G0, -344.6, district=CO)


def gate(x, z, hue):
    """A scanner arch: two posts and a lintel, lit down their inner edges."""
    for sx in (-0.55, 0.55):
        box(k("trim"), x + sx - 0.09, x + sx + 0.09, G0, G0 + 2.3, z - 0.3, z + 0.3, scale=1.0, col=K.BLACK)
        K.glow_box(x + sx - math.copysign(0.1, sx) - 0.01, x + sx - math.copysign(0.1, sx) + 0.01, G0 + 0.2, G0 + 2.2, z - 0.28, z + 0.28, hue, 1)
    box(k("trim"), x - 0.64, x + 0.64, G0 + 2.3, G0 + 2.45, z - 0.3, z + 0.3, scale=1.0, col=K.BLACK)


def room():
    """The first tower's lower floors, the braindance's "room": a hall open
    to the boulevard under the canopy, five metres deep in front of the
    lobby's glass, a gallery across its back at 4.2 m reached by a stair,
    a desk, benches, screens on its side walls, and people in it."""
    tx = TOWER_X[0]
    z0, z1 = LOBBY_Z - 5.0, LOBBY_Z
    for sx in (-1, 1):
        xa, xb = sorted((tx + sx * 12.6, tx + sx * 13.0))
        solid(xa, xb, 0.0, 8.0, z0, z1, K.STONE)
        # A screen and a line of light on each side wall, facing in.
        K.panel(tx + sx * 12.58, 5.6, z0 + 2.5, 3.6, 2.0, -sx * math.pi / 2, "cyan", 0.5)
        K.glow_box(tx + sx * 12.58 - 0.02, tx + sx * 12.58 + 0.02, 0.4, 7.6, z1 - 0.5, z1 - 0.4, "white")
    # The ceiling: stone, a grid of light panels in it.
    quad(k("trim"), (tx - 12.6, 7.99, z0), (tx + 12.6, 7.99, z0), (tx + 12.6, 7.99, z1), (tx - 12.6, 7.99, z1), col=K.STEEL)
    for ix in range(6):
        for iz in range(2):
            cx, cz = tx - 10.0 + ix * 4.0, z0 + 1.4 + iz * 2.4
            quad(k("glow"), (cx - 1.4, 7.97, cz - 0.5), (cx + 1.4, 7.97, cz - 0.5), (cx + 1.4, 7.97, cz + 0.5), (cx - 1.4, 7.97, cz + 0.5), col=GLOW["white"])
        light(CO, tx - 10.0 + ix * 4.0, 6.5, z0 + 2.5, "white", 5.0)
    # The floor: polished stone, darker than the forecourt's, a light line
    # across its front.
    K.paving_band(tx - 12.6, tx + 12.6, z0, z1, K.STONE)
    K.light_strip_ground(tx - 12.4, tx + 12.4, z1 - 0.12, z1 - 0.04, "cyan")
    # The gallery: a slab across the back, a glass rail, a stair up to it.
    gy = 4.2
    box(k("trim"), tx - 12.6, tx + 12.6, gy - 0.25, gy, z0 + 0.12, z0 + 2.3, scale=2.0, col=K.PALE, bottom=True)
    K.rail(tx - 12.5, z0 + 2.28, tx + 6.0, z0 + 2.28, gy, "cyan")
    K.glow_box(tx - 12.5, tx + 12.5, gy - 0.3, gy - 0.25, z0 + 2.2, z0 + 2.3, "amber")
    K.stairs_x(z0 + 2.3, z0 + 3.5, tx + 12.4, tx + 6.2, G0, gy, "cyan", K.PALE)
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
    server racks behind an open steel frame on the canopy, from 8 m to 22 m,
    rows of lamps on every rack, a red glow behind them, hot air units and
    their pipes on the canopy at its foot."""
    tx = TOWER_X[2]
    x0, x1 = tx - 11.0, tx + 11.0
    zb, zf = T_FRONT + 0.06, T_FRONT + 1.5       # the racks' back, and their faces
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
                hue = rr.choice(("amber", "amber", "amber", "red", "green", "cyan"))
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
    box(k("trim"), x0 - 0.3, x1 + 0.3, y1, y1 + 0.4, zb, zf + 0.7, scale=1.0, col=K.BLACK)
    K.neon_box(x0 - 0.3, x1 + 0.3, y1 - 0.02, y1 + 0.08, zf + 0.7, zf + 0.75, "red")
    # On the canopy: hot air units, their fans up, and pipes up the frame.
    for cx in (tx - 9.0, tx - 3.0, tx + 3.0, tx + 9.0):
        K.chiller(cx - 1.6, cx + 1.6, -345.6, -344.5, 8.0, h=1.5)
        pipe(k("trim", 1), (cx, 8.3, -345.6), (cx, 8.3, zf + 0.8), 0.14, segs=5, col=K.RED)
        pipe(k("trim", 1), (cx, 8.3, zf + 0.8), (cx, 21.5, zf + 0.8), 0.14, segs=5, col=K.RED)
        K.glow_box(cx - 1.5, cx + 1.5, 9.5, 9.56, -344.5, -344.47, "red", 1)
    K.steam("servers", tx + 3.0, 9.7, -345.0, roof=True)
    for lx in (tx - 8.0, tx, tx + 8.0):
        light(CO, lx, 9.0, -343.6, "red", 6.0)
        light(CO, lx, 15.0, -343.0, "amber", 5.0)


# ---------------------------------------------------------------------------
# The gaps between the towers: each its own place.
# ---------------------------------------------------------------------------
def side_doors(gx, r, hue="white"):
    """The two towers' flanks onto a gap: stone to the lobby's height, a
    side door with a lamp on each, a line of light at the canopy's level."""
    for sx in (-1, 1):
        xw = gx + sx * 6.0
        xa, xb = sorted((xw, xw - sx * 0.06))
        box(k("trim"), xa, xb, 0.0, 8.0, T_BACK, LOBBY_Z, scale=2.0, col=K.STONE)
        K.neon_box(*sorted((xw - sx * 0.06, xw - sx * 0.12)), 7.6, 7.7, T_BACK + 0.5, LOBBY_Z - 0.3, hue)
        dz = r.uniform(-357.0, -353.0)
        box(k("door"), *sorted((xw - sx * 0.07, xw - sx * 0.1)), G0, 2.3, dz - 0.55, dz + 0.55, scale=1.0)
        K.door_lamp(xw - sx * 0.3, 2.6, dz, "white", 3.0, nx=-sx, nz=0.0)


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
    for gx in GAP_X:
        side_doors(gx, r)
        # Palms in planters either side of each gap's mouth.
        for sx in (-4.4, 4.4):
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
    K.paving_band(gx - 6.0, gx + 6.0, -362.0, -353.6, K.PALE, y=ty + 0.004)
    for sx in (-4.6, 4.6):
        P.place("planter_tree", gx + sx, ty, -357.5, district=CO)
        P.place("bench", gx + sx * 0.55, ty, -360.6, 0.0, district=CO)
    top = link(gx, -362.0, 11.8, r, hue="cyan")
    K.light_strip_ground(gx - 5.6, gx + 5.6, -353.9, -353.8, "cyan", y=ty + 0.012)
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
    box(k("hazard", 1), gx - 5.2, gx + 5.2, 4.5, 4.9, -360.1, -360.0, scale=1.0)
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
    skybridge(gx, 26.6, -360.0, r, "cyan", boards=3)

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
    K.paving_band(gx - 6.0, gx + 6.0, T_BACK, -353.0, K.PALE, y=G0 + 0.504)
    for sx in (-3.6, -2.2, -0.8, 0.6):
        gate(gx + sx, -362.0, "cyan")
        K.light_strip_ground(gx + sx - 0.03, gx + sx + 0.03, -362.0, -354.0, "cyan", y=G0 + 0.512)
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
    for sx, yaw in ((-3.1, math.radians(24)), (3.1, math.radians(-24))):
        cx, cz = gx + sx, -353.4
        K.screen(cx, 6.0, cz, 5.4, 3.2, yaw, r, depth=0.28, back=True)
        rx, rz = math.cos(yaw), -math.sin(yaw)
        for du in (-2.0, 2.0):
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
    skybridge(gx, 34.2, -361.0, r, "amber", boards=4)

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
GANTRY_X = (134.3, 283.0)


def median():
    """A raised strip down the boulevard's middle: a kerb, dark planting, a
    dim yellow line of light along both its edges (YRL74JmhVgk@30), palms
    with nothing but trunk below five metres, well apart and none before
    the two lobbies the braindance reads across it, low lamps between."""
    x0, x1, z0, z1 = MEDIAN
    box(k("kerb"), x0, x1, 0.0, 0.2, z0, z1, scale=1.0)
    quad(k("trim"), (x0 + 0.2, 0.205, z1 - 0.15), (x1 - 0.2, 0.205, z1 - 0.15), (x1 - 0.2, 0.205, z0 + 0.15), (x0 + 0.2, 0.205, z0 + 0.15), col=K.SOIL)
    dim = tuple(c * 0.22 for c in GLOW["yellow"][:3]) + (1.0,)
    for za, zb in ((z0 - 0.02, z0), (z1, z1 + 0.02)):
        box(k("glow"), x0 + 0.3, x1 - 0.3, 0.07, 0.13, za, zb, scale=1.0, col=dim)
    for xe, s in ((x0, -1), (x1, 1)):
        cylinder(k("kerb"), xe, (z0 + z1) / 2, 0.0, 0.2, 0.6, segs=10)
        box(k("trim", 1), xe + s * 0.2 - 0.25, xe + s * 0.2 + 0.25, 0.2, 1.1, -330.08, -329.92, scale=1.0, col=K.BLACK)
        K.glow_box(xe + s * 0.2 - 0.2, xe + s * 0.2 + 0.2, 0.55, 1.0, -330.1 if s < 0 else -329.92, -330.08 if s < 0 else -329.9, "amber", 1)
    palms = [176.0, 195.0, 252.0, 271.0, 300.0, 319.0, 338.0, 357.0, 376.0, 395.0, 414.0]
    for x in palms:
        P.place("planter_palm", x, 0.2, -330.0, 0.7 * x, sy=1.25, sxz=0.68, district=CO)
    for a, b in zip([150.0] + palms, palms + [420.0]):
        if b - a < 12.0:
            continue
        n = max(1, round((b - a) / 19.0))
        for j in range(n):
            x = a + (b - a) * (j + 0.5) / n
            if any(abs(x - g) < 4.0 for g in GANTRY_X):
                continue
            P.place("lamp_short", x, 0.2, -330.0, district=CO)


def gantry(gx):
    """A gantry over the boulevard (mH2wmyeiIpA@182): slim legs at the two
    kerbs, clear of the walkers' lines, a deep beam, a strip of red light
    under each face, a lit box over every lane, a row of cyan windows in the
    housing on top, lamps and masts on it."""
    zn, zs = KERB_N - 0.2, -320.5
    y0, y1 = 7.6, 9.9
    for z in (zn, zs):
        s = 1 if z == zn else -1
        box(k("trim"), gx - 0.3, gx + 0.3, G0, y0 + 0.3, z - 0.15, z + 0.15, scale=1.5, col=K.BLACK)
        box(k("trim", 1), gx - 0.34, gx + 0.34, G0 + 0.2, G0 + 0.9, z - 0.17, z + 0.17, scale=1.0, col=K.YELLOW)
        K.glow_box(gx - 0.05, gx + 0.05, G0 + 1.4, y0, z + s * 0.15, z + s * 0.17, "white")
        # A knee brace up to the beam.
        pipe(k("metal"), (gx, 5.4, z + s * 0.15), (gx, y0 + 0.2, z + s * 2.6), 0.11, segs=5)
    box(k("trim"), gx - 0.95, gx + 0.95, y0, y1, zn - 0.5, zs + 0.5, scale=2.0, col=K.BLACK, bottom=True)
    box(k("trim"), gx - 0.6, gx + 0.6, y1, y1 + 1.2, zn + 2.2, zs - 2.2, scale=2.0, col=K.STEEL)
    for f in (-1, 1):
        xa, xb = sorted((gx + f * 0.95, gx + f * 1.0))
        K.neon_box(xa, xb, y0 + 0.02, y0 + 0.2, zn - 0.3, zs + 0.3, "red")
        for j, z in enumerate((-336.75, -332.25, -327.75, -323.25)):
            hue = ("amber", "blue", "blue", "amber")[j] if f < 0 else ("blue", "amber", "amber", "blue")[j]
            K.glow_box(xa - 0.04 * (f < 0), xb + 0.04 * (f > 0), y0 + 0.5, y1 - 0.35, z - 1.1, z + 1.1, hue)
            light(CO, gx + f * 2.5, 6.0, z, hue, 5.0)
        xc, xd = sorted((gx + f * 0.6, gx + f * 0.64))
        K.glow_box(xc, xd, y1 + 0.35, y1 + 0.85, zn + 2.6, zs - 2.6, "cyan")
        z = zn + 2.6
        while z < zs - 2.6:
            box(k("trim", 1), *sorted((gx + f * 0.64, gx + f * 0.67)), y1 + 0.3, y1 + 0.9, z - 0.08, z + 0.08, scale=1.0, col=K.BLACK)
            z += 1.3
    # Street signs hung under its ends, over the pavements, askew.
    for z, lean in ((zn - 1.9, 6), (zs + 1.9, -8)):
        K.st_blade(gx, y0 - 0.62, z, "pm", math.radians(90 + lean))
        for dz in (-1.0, 1.0):
            box(k("metal", 1), gx - 0.03, gx + 0.03, y0 - 0.1, y0, z + dz - 0.03, z + dz + 0.03, scale=0.5)
    for z in (zn + 2.0, zs - 2.0):
        cylinder(k("metal", 1), gx, z, y1, y1 + 2.6, 0.05, segs=4, cap=False)
        K.aviation(gx, y1 + 2.6, z)
    for z in (zn - 0.4, zs + 0.4):
        K.aviation(gx, y1, z, 0)


def pavement_n():
    """What the north pavement carries between the forecourts: kiosks,
    benches and bins on its middle strip, camera poles at the kerb."""
    r = random.Random(7771)
    for j, gx in enumerate(GAP_X):
        if j in (0, 3):
            K.kiosk(gx + 1.5, PAVE_MID_N, 0.0 if j else math.pi, "cyan" if j else "amber", w=2.0, d=1.2)
            stand(gx + 1.5, PAVE_MID_N + (1.05 if j else -1.05), math.pi if j else 0.0, "idle")
        else:
            P.place("bench", gx - 2.6, G0, PAVE_MID_N, 0.0, district=CO)
            if j % 2:
                stand(gx - 2.6, PAVE_MID_N, 0.0, "sit", G0 + 0.45)
        P.place("bin", gx - 5.2, G0, PAVE_MID_N, district=CO)
        P.place("cctv", gx + 5.4, G0, KERB_N - 0.3, district=CO)
        if j != 3:
            K.ad_panel(gx + 4.2, PAVE_MID_N, math.radians(78 if j % 2 else 102), r, pal=None if j % 2 else K.COLD)


def gantry_paving(gx):
    """The carriageway under a gantry, striped yellow and dark
    (mH2wmyeiIpA@182): chevron bars across the lanes either side of the
    median, pointing the way each side drives."""
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
for _gx in GANTRY_X:
    gantry(_gx)
gantry_paving(GANTRY_X[1])
pavement_n()
