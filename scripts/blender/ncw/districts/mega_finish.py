"""What the first review found bare: the lanes' walls, the roofs seen from
the air, the dim colonnade, the kiosk's blank sides.

A lane's wall gets what a back wall has: pipes up it, a conduit along it,
lit posters, wall units, shutters, vents, boxes, a caged lamp now and then
and its pool, and what is left at its foot. A roof gets tanks, cooling
towers, units, a mast and dishes, a painted walkway or a pad, low lamps
and a pool of light (a roof takes the light of the pool at its own place,
as every surface does). Roof pieces go through mega_roofs.ok(), so nothing
shows over a front edge to the hero.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_roofs import ok, prop, pad, flat_strokes, shack
from ncw.districts.mega_mass import TIERS
from ncw.districts.mega_wings import T1, T2, T1_TOP, ET1, ET2, ET1_TOP, ARM_TOP, AX0, AX1
from ncw.districts.mega_base import W_TOP, E_TOP, COL_Z, W_COLS, E_COLS, KX, KZ

UNIT = ((0, 0), (1, 0), (1, 1), (0, 1))


def fposter(f, s, y, w, h, r):
    f.box((D, "board_frame", 0), s - w / 2 - 0.06, s + w / 2 + 0.06, y - h / 2 - 0.06, y + h / 2 + 0.06, 0.0, 0.05)
    f.quad((D, "billboard", 0), s - w / 2, s + w / 2, y - h / 2, y + h / 2, 0.062, uvs=UNIT, col=(r.randrange(8) / 8.0 + 0.01, r.randrange(8) / 8.0 + 0.01, r.random(), 1.0))


def lane_wall(f, seed, lamp_every=13.0, foot=0.4):
    """Dress a lane's wall at walking height (f: its face, on its plane)."""
    r = random.Random(seed)
    f.box((D, "metal", 1), 0.3, f.width - 0.3, 3.3, 3.36, 0.02, 0.08)
    s, since = r.uniform(0.8, 2.0), lamp_every * 0.5
    while s < f.width - 1.4:
        kind = r.choice(("pipe", "poster", "ac", "posters", "shutter", "pipes", "box", "vent", "poster"))
        x, _, z = f.p(f.at(s), 0.0, 0.12)
        if kind == "pipe":
            rpipe((x, G0, z), (x, r.uniform(5.5, 9.5), z), r.choice((0.07, 0.1)), col=r.choice((RUST, STEEL, TEAL_PAINT)))
        elif kind == "pipes":
            for i in range(3):
                xi, _, zi = f.p(f.at(s + i * 0.16), 0.0, 0.07)
                rpipe((xi, G0, zi), (xi, r.uniform(3.6, 7.0), zi), 0.04, col=r.choice((STEEL, CONC, RUST)))
        elif kind == "poster":
            fposter(f, s, 2.15, r.uniform(1.0, 1.4), r.uniform(1.5, 1.9), r)
        elif kind == "posters":
            for i in range(r.choice((2, 3))):
                fposter(f, s + i * 1.0, 2.0 + 0.12 * (i % 2), 0.8, 1.15, r)
            s += 1.4
        elif kind == "ac":
            px, _, pz = f.p(f.at(s), 0.0, 0.0)
            yy = r.uniform(2.6, 3.2)
            P.place("ac_wall", px, yy, pz, f.yaw)
            rpipe((x, G0, z), (x, yy, z), 0.025, col=STEEL)
        elif kind == "shutter":
            f.quad((D, "door_panel", 0), s - 1.2, s + 1.2, G0, 2.7, 0.03)
            f.box((D, "metal", 1), s - 1.3, s + 1.3, 2.7, 2.92, 0.0, 0.14)
            f.quad((D, "trim", 1), s - 1.2, s + 1.2, G0, 0.5, 0.035, col=YEL_OLD)
            s += 1.0
        elif kind == "box":
            f.box((D, "trim", 1), s - 0.3, s + 0.3, 1.2, 2.05, 0.0, 0.18, col=r.choice((STEEL, BLUEGREY, RUST)))
            f.quad((D, "glow", 1), s + 0.14, s + 0.2, 1.84, 1.9, 0.19, col=GLOW[r.choice(("green", "red", "amber"))])
            rpipe((x, 2.05, z), (x, 3.3, z), 0.02, col=STEEL)
        else:
            f.box((D, "metal", 1), s - 0.5, s + 0.5, 2.3, 2.95, 0.0, 0.1)
        if r.random() < foot:
            px, _, pz = f.p(f.at(s + 1.3), 0.0, 0.6)
            P.place(r.choice(("bags", "crates", "bin", "drum", "bags")), px, G0, pz, f.yaw + r.uniform(-0.4, 0.4))
        step = r.uniform(1.9, 3.3)
        s += step
        since += step
        if since > lamp_every and s < f.width - 1.0:
            lx, _, lz = f.p(f.at(s - step / 2), 0.0, 0.0)
            wall_lamp(lx, 3.7, lz, f.nx, f.nz, r.choice(("amber", "amber", "white")), 4.2)
            since = 0.0


# The lane behind the canyon's east row (x 44..52): the canyon's back on
# its west side (dressed from our side of the lot line), the blocks' on its
# east; and the lanes either side of the station.
lane_wall(face("+x", 44.0, -700.0, -618.0), 8801)
lane_wall(face("+x", 44.0, -603.0, -562.0), 8802)
lane_wall(face("-x", 52.0, -676.0, -640.0), 8803, lamp_every=40.0)
lane_wall(face("-x", 52.0, -594.0, -564.0), 8804, lamp_every=40.0)
lane_wall(face("+z", -590.0, 82.0, 104.0), 8805, lamp_every=40.0, foot=0.2)
# The station's orange walls either side of the portal: adverts in frames, a
# red strip, the line's lamps.
_r = random.Random(8810)
for f in (face("-x", 90.0, -625.0, -615.2), face("-x", 90.0, -604.8, -595.0)):
    for s in (2.6, 7.2):
        fposter(f, s, 9.6, 3.2, 4.6, _r)
    f.box((D, "neon_red", 0), 0.4, f.width - 0.4, 6.3, 6.42, 0.0, 0.06)
    f.box((D, "metal", 1), 0.2, f.width - 0.2, 12.6, 12.7, 0.0, 0.1)
    for s in (0.8, f.width - 0.8):
        x, _, z = f.p(f.at(s), 0.0, 0.0)
        wall_lamp(x, 5.4, z, -1, 0, "amber", 4.0)

# The drinks kiosk's sides and back: a menu of adverts, a pipe, a unit.
for f in (face("-x", KX - 1.3, KZ - 1.0, KZ + 1.0), face("+x", KX + 1.3, KZ - 1.0, KZ + 1.0), face("-z", KZ - 1.0, KX - 1.3, KX + 1.3)):
    fposter(f, f.width / 2 - 0.45, 1.55, 0.75, 1.2, _r)
    fposter(f, f.width / 2 + 0.45, 1.55, 0.75, 1.2, _r)
    f.quad((D, "trim", 1), 0.0, f.width, G0, 0.6, 0.01, col=BLACK)

# The colonnade: a caged lamp on every column outside the hero's slot, its
# pool on the forecourt, and battens of light on the decks' undersides.
for xs, soffit, hue in ((W_COLS, W_TOP - 0.7, "amber"), (E_COLS, E_TOP - 0.8, "amber")):
    for x in xs:
        wall_lamp(x, 3.4, COL_Z + 0.65, 0, 1, hue, 6.0)
        wall_lamp(x, 3.4, COL_Z - 0.65, 0, -1, "white", 4.8)
        for dz in (-3.0, -6.4):
            box((D, "glow", 0), x + 3.2, x + 4.6, soffit - 0.06, soffit, COL_Z + dz - 0.08, COL_Z + dz + 0.08, scale=0.5, col=dim(GLOW["white"], 0.8), bottom=True)
            light(D, x + 3.9, soffit, COL_Z + dz, "white", 4.8)


# ---------------------------------------------------------------------------
# Roofs.
# ---------------------------------------------------------------------------
def roof_kit(x0, x1, z0, z1, top, seed, deck=None, hue="white", power=6.5, lamps=True, side="-z"):
    """Plant on a bare roof along one side (painted, so the roof's light
    shows it: sheet metal is black up here), a painted walk down its middle
    with low lamps, a mast and dishes, and pools of light. `deck`: (cx, cz,
    half), a pad."""
    r = random.Random(seed)
    za, zb = (z0 + 1.2, z0 + 3.4) if side == "-z" else (z1 - 3.4, z1 - 1.2)
    zm = (za + zb) / 2
    x = x0 + 2.6
    yaw = 0.0 if side == "-z" else math.pi
    while x < x1 - 2.6:
        kind = r.choice(("tank", "cond", "cond", "vents", "tank", "cond", "duct"))
        if kind == "tank":
            prop("roof_tank", x, zm, top, r.choice((0.0, math.pi / 2, math.pi)), h=4.8, r=1.4)
            x += 1.0
        elif kind == "cond":
            prop("roof_condenser", x + 0.6, zm, top, yaw, h=1.2, r=1.9)
            x += 1.6
        elif kind == "duct":
            prop("roof_duct", x + 0.8, zm - 0.6, top, 0.0, h=1.1, r=2.0)
            prop("roof_tray", x + 0.8, zm + 0.9, top, 0.0, h=0.5, r=1.6)
            x += 1.6
        else:
            for i in range(3):
                prop("roof_vent", x + i * 1.2, zm + r.uniform(-0.6, 0.6), top, r.uniform(0, 6), h=1.0, r=0.4)
            x += 1.4
        x += r.uniform(3.0, 4.2)
    ze = z1 - 1.6 if side == "-z" else z0 + 1.6
    prop("roof_mast", x1 - 1.6, ze, top, r.uniform(0, 6), sy=0.8, h=6.6, r=0.4)
    prop("roof_dish", x1 - 3.8, ze, top, r.uniform(0, 6), h=2.0, r=0.9)
    prop("roof_dish", x0 + 1.8, ze, top, r.uniform(0, 6), h=2.0, r=0.9)
    prop("roof_hut", x0 + 2.0, (z0 + z1) / 2 + (2.6 if side == "-z" else -2.6), top, r.choice((0.0, math.pi)), h=2.85, r=1.3)
    cz = (z0 + z1) / 2
    n = max(2, int((x1 - x0) // 7.0))
    if ok(x0 + 1.0, x1 - 1.0, cz - 0.6, cz + 0.6, top, top + 0.7):
        flat_strokes([((x0 + 1.2, cz - 0.55), (x1 - 1.2, cz - 0.55)), ((x0 + 1.2, cz + 0.55), (x1 - 1.2, cz + 0.55))], top + 0.02, YEL_OLD, w=0.12)
        for i in range(n + 1):
            lx = x0 + 1.4 + (x1 - x0 - 2.8) * i / n
            if lamps:
                box((D, "metal", 1), lx - 0.04, lx + 0.04, top, top + 0.5, cz + 0.7, cz + 0.78, scale=0.5)
                box((D, "glow", 0), lx - 0.1, lx + 0.1, top + 0.5, top + 0.62, cz + 0.64, cz + 0.84, scale=0.5, col=dim(GLOW[hue], 0.8), bottom=True)
    for i in range(n):
        lx = x0 + 1.4 + (x1 - x0 - 2.8) * (i + 0.5) / n
        light(D, lx, top + 1.0, cz, hue, power)
        # A lit skylight beside the walk: a kerb, the pane, its bars.
        sz0, sz1 = (cz - 3.2, cz - 1.4) if side == "-z" else (cz + 1.4, cz + 3.2)
        if deck is None and z1 - z0 > 12.0 and ok(lx - 1.3, lx + 1.3, sz0, sz1, top, top + 0.4):
            tbox(lx - 1.3, lx + 1.3, top, top + 0.3, sz0, sz1, CONC)
            hquad((D, "glow", 0), lx - 1.15, lx + 1.15, sz0 + 0.15, sz1 - 0.15, top + 0.31, col=dim(GLOW["amber" if i % 2 else "white"], 0.16))
            for dx in (-0.4, 0.4):
                hquad((D, "trim", 1), lx + dx - 0.03, lx + dx + 0.03, sz0 + 0.15, sz1 - 0.15, top + 0.32, col=BLACK)
        light(D, lx, top + 1.0, zm + (2.4 if side == "-z" else -2.4), hue, power * 0.8)
    if deck:
        pad(*deck[:2], top, half=deck[2], name="H")


# The arm over the market hall (its roof was bare south of the board).
roof_kit(AX0 + 1.0, 80.0, -729.0, -701.0, ARM_TOP, 8821, deck=(72.0, -716.0, 4.5), hue="amber", side="+z")
roof_kit(80.0, AX1 - 1.0, -731.0, -701.0, ARM_TOP, 8822, hue="white", side="+z")
light(D, 90.0, ARM_TOP + 1.0, -737.0, "pink", 6.0)
# Along its east parapet: tanks, painted units, a mast, a rail to the walk.
for z in (-742.6, -739.2):
    prop("tank_roof", AX1 - 2.2, z, ARM_TOP, 0.4, h=2.4, r=0.9)
for (za, zb, h, col) in ((-735.6, -732.4, 1.9, PALE), (-730.6, -728.6, 1.4, TEAL_PAINT), (-726.8, -723.6, 1.7, CREAM)):
    tbox(AX1 - 3.2, AX1 - 1.2, ARM_TOP, ARM_TOP + h, za, zb, col)
    box((D, "dark", 1), AX1 - 3.3, AX1 - 1.1, ARM_TOP + h, ARM_TOP + h + 0.1, za - 0.1, zb + 0.1, scale=1.0)
    for i in range(3):
        rotated_quad((D, "trim", 1), AX1 - 3.212, ARM_TOP + h * 0.55, za + (zb - za) * (i + 0.5) / 3, (zb - za) / 3 - 0.14, h * 0.5, -math.pi / 2, col=BLACK)
    rotated_quad((D, "glow", 1), AX1 - 3.212, ARM_TOP + h * 0.9, zb - 0.2, 0.12, 0.1, -math.pi / 2, col=GLOW["green"])
prop("antenna", AX1 - 2.0, -721.4, ARM_TOP, h=3.2, r=0.3)
prop("dish", AX1 - 2.2, -719.6, ARM_TOP, 4.2, h=0.9, r=0.5)
steel_rail((AX1 - 4.4, -744.0), (AX1 - 4.4, -721.0), ARM_TOP, posts=3.0)
for z in (-740.0, -730.0):
    light(D, AX1 - 5.0, ARM_TOP + 1.0, z, "white", 6.0)
# What the roof's north-east corner keeps: a shack with its light on, a row
# of lit skylights over the market hall's back rooms, a string of bulbs.
shack(96.0, -727.6, ARM_TOP, colour="amber", yaw=-math.pi / 2, r=random.Random(8841))
shack(91.0, -744.0 + 2.4, ARM_TOP, w=3.0, colour="cyan", yaw=0.0, r=random.Random(8842))
for i in range(4):
    x = 87.0 + i * 3.0
    tbox(x - 1.2, x + 1.2, ARM_TOP, ARM_TOP + 0.3, -731.6, -729.8, CONC)
    hquad((D, "glow", 0), x - 1.05, x + 1.05, -731.45, -729.95, ARM_TOP + 0.31, col=dim(GLOW["amber" if i % 2 else "white"], 0.18))
    hquad((D, "trim", 1), x - 0.03, x + 0.03, -731.45, -729.95, ARM_TOP + 0.32, col=BLACK)
for i in range(9):
    x = 86.0 + i * 1.5
    y = ARM_TOP + 2.9 - 0.5 * math.sin(math.pi * i / 8)
    box((D, "glow", 1), x - 0.07, x + 0.07, y - 0.07, y + 0.07, -725.07, -724.93, scale=0.5, col=dim(GLOW["amber"], 0.8), bottom=True)
cable((86.0, ARM_TOP + 2.95, -725.0), (98.0, ARM_TOP + 2.95, -725.0), 0.5, r=0.012)
for x in (86.0, 98.0):
    box((D, "metal", 1), x - 0.04, x + 0.04, ARM_TOP, ARM_TOP + 3.0, -725.04, -724.96, scale=0.5)
light(D, 92.0, ARM_TOP + 1.0, -726.0, "amber", 6.5)
# Battens under the middle deck too, and their pools, modest: this is the
# foot of the hero's vanishing point (the battens face the ground, which a
# lens at street level 750 m off does not see).
for x in (-12.4, -4.2, 4.2, 12.4):
    for z in (-737.4, -741.0):
        box((D, "glow", 0), x - 0.7, x + 0.7, floor_y(3) - 0.76, floor_y(3) - 0.7, z - 0.08, z + 0.08, scale=0.5, col=dim(GLOW["amber" if z > -740 else "white"], 0.7), bottom=True)
    light(D, x, 8.0, -738.4, "amber", 3.4)
light(D, 72.0, ARM_TOP + 1.0, -738.0, "white", 5.5)
# The back blocks' tall roofs and the wings' tower roofs, from the air.
for (x0, x1, z0, z1, top, seed, hue, deck) in ((74.0, 88.0, -654.0, -634.0, floor_y(21), 8823, "white", None), (68.0, 90.0, -692.0, -664.0, floor_y(13), 8824, "amber", None),
                                               (102.0, 122.0, -686.0, -666.0, floor_y(15), 8825, "cyan", (112.0, -674.0, 4.5)),
                                               (86.0, 100.0, -586.0, -568.0, floor_y(20), 8826, "white", None),
                                               (T1[0] + 1.0, T2[0] - 1.0, T1[2] + 1.0, T1[3] - 1.0, T1_TOP, 8827, "amber", None),
                                               (ET2[1] + 0.6, ET1[1] - 0.8, ET1[2] + 1.0, ET1[3] - 1.0, ET1_TOP, 8828, "white", None)):
    roof_kit(x0, x1, z0, z1, top, seed, deck=deck, hue=hue)
# The tiers behind the slab: plant along each step's back, well behind the
# fronts (the hero looks up at those), a pad on the top one.
for k, (x0, x1, z0, z1, _, top) in enumerate(TIERS):
    roof_kit(x0 + 1.0, x1 - 1.0, z0 + 0.6, z0 + 9.0, top, 8831 + k, hue="amber", power=5.0, lamps=False)
