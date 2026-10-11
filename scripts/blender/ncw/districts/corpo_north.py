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
            K.screen(xa + i * (sw + gx) + sw / 2, 10.5 + j * (sh + gy) + sh / 2, LOT_N + 0.42, sw, sh, 0.0, r, depth=0.3)
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
    y = K.screen_stack(442.0, LOT_N + 0.42, 11.0, 15.0, (8.6, 6.4, 9.4, 5.6, 8.6, 7.0), 0.0, r, gap=0.6)
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
    solid(268.0, 298.0, 0.0, 15.6, BACK0, BACK1, K.CONCRETE)
    B.COLLISION.append(("box", 268.0, 298.0, 0.0, 15.6, BACK0, BACK1, CO))
    B.ROOFS.append((CO, 268.0, 298.0, BACK0, BACK1, 15.6))
    for name, f in B.faces_of(268.0, 298.0, BACK0, BACK1).items():
        K.front(f, 15.6, "blank" if name == "-z" else "dock", r, 5)
        for yy in (7.0, 11.0):
            f.box(k("dark", 1), 2.0, f.width - 2.0, yy, yy + 2.2, 0.0, 0.08)
        f.box(k("neon_amber", 1), 2.0, f.width - 2.0, 14.6, 14.7, 0.0, 0.06)
    K.parapet(268.0, 298.0, BACK0, BACK1, 15.6, col=K.STONE, edge="amber")
    for i in range(4):
        for j in range(3):
            K.cooler(273.5 + i * 6.4, BACK0 + 7.0 + j * 9.5, 15.6, r=1.9, h=3.6)
    K.duct_run([(271.0, 16.3, BACK0 + 3.0), (296.0, 16.3, BACK0 + 3.0)], r=0.4)
    K.duct_run([(271.0, 16.3, BACK1 - 3.2), (296.0, 16.3, BACK1 - 3.2)], r=0.4)
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
def lane():
    r = random.Random(7731)
    for tx in TOWER_X:
        f = B.Face("-z", T_BACK, tx - 13.0, tx + 13.0)
        B.back_ground(CO, f, r, K.STEEL)
        f.ledge(k("trim"), 0.0, f.width, SHOP_H, 0.25, 0.2, K.STEEL)
    # Yellow hatching at every dock, a centre line of dashes.
    x = WEST_X + 4.0
    while x < EAST_X - 4.0:
        quad(k("trim", 1), (x, G0 + 0.008, TRACK_Z + 0.08), (x + 2.4, G0 + 0.008, TRACK_Z + 0.08), (x + 2.4, G0 + 0.008, TRACK_Z - 0.08),
             (x, G0 + 0.008, TRACK_Z - 0.08), col=K.PALE)
        x += 5.2


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


west_block()
east_blocks()
back_row()
lane()
track()
halt()
