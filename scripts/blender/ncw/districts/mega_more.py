"""What fills the megabuilding district in: the gallery's doors and lamps,
light and trade in the back lanes, and what the roofs show a flying car.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_base import L1, GAL_Z, W_TOP, M_TOP, E_TOP, NX0
from ncw.districts.mega_face import hero_hidden
from ncw.districts.mega_roofs import ok, flat_strokes, shack

_r = random.Random(8801)
HUES = ("pink", "amber", "cyan", "magenta", "amber", "teal", "white", "pink")

# ---------------------------------------------------------------------------
# The gallery (the first floor's walkway, y 4.6): a door to every flat, a
# lamp over each in its own colour, units, pipes, pots, washing, stools.
# ---------------------------------------------------------------------------
_x = MB_X0 + 2.4
_i = 0
while _x < NX0 - 1.5:
    mid = -18.0 < _x < 18.0
    zf = (MB_ZF - MB_REC if mid else MB_ZF) + 0.02
    if any(abs(_x - vx) < 2.0 for vx, _ in MB_SIGNS):
        _x += 2.2
        continue
    hue = HUES[_i % len(HUES)]
    slot = abs(_x) < 16.0
    quad((D, "door", 0), (_x - 0.5, L1 + 0.02, zf), (_x + 0.5, L1 + 0.02, zf), (_x + 0.5, L1 + 2.12, zf), (_x - 0.5, L1 + 2.12, zf))
    box((D, "metal", 1), _x - 0.6, _x + 0.6, L1 + 2.12, L1 + 2.2, zf - 0.02, zf + 0.1, scale=0.5)
    box((D, "glow", 1), _x - 0.14, _x + 0.14, L1 + 2.32, L1 + 2.5, zf, zf + 0.1, scale=0.5, col=dim(GLOW[hue], 0.25 if slot else 0.85), bottom=True)
    if not slot:
        light(D, _x, L1 + 2.2, zf + 0.9, hue, 1.6)
    roll = _r.random()
    if roll < 0.35:
        P.place("ac_wall", _x + 1.5, L1 + 2.3, zf - 0.02, 0.0)
    elif roll < 0.55:
        P.place("crates", _x + 1.6, L1, zf + 0.6, 0.0)
    elif roll < 0.7:
        cylinder((D, "trim", 1), _x + 1.4, zf + 0.4, L1, L1 + 0.45, 0.22, segs=6, col=RUST)
        oriented_box((D, "trim", 1), _x + 1.4, L1 + 0.8, zf + 0.4, 0.7, 0.7, 0.7, 0.6, col=(0.08, 0.2, 0.1, 1.0))
    if _r.random() < 0.3:
        stand(_x - 1.1, zf + 0.5, 0.0, _r.choice(("lean", "smoke", "sit", "phone")), L1)
    _x += _r.choice((5.6, 6.4, 6.4, 7.2))
    _i += 1
# Washing across the porch over the entrance, and a line of it west.
for (a, b, hue) in (((-17.0, L1 + 2.6, -747.6), (-6.0, L1 + 2.8, -746.4), "white"), ((6.0, L1 + 2.7, -746.6), (17.0, L1 + 2.5, -747.8), "teal"),
                    ((-46.0, L1 + 2.6, -744.2), (-36.0, L1 + 2.7, -743.4), "pink")):
    cable(a, b, 0.3, steps=6, r=0.012)
    for t in (0.2, 0.36, 0.5, 0.66, 0.82):
        px, py, pz = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 0.3 * math.sin(math.pi * t), a[2] + (b[2] - a[2]) * t
        cloth((px - 0.35, py - 0.8, pz), (px + 0.35, py - 0.8, pz), (px + 0.35, py, pz), (px - 0.35, py, pz), _r.choice((hue, "amber", "white", "cyan")))
# On the decks: lit windows of the flats that open onto them, a sign or two.
for (x0, x1, y, zf, n, slot) in ((-43.0, -19.0, W_TOP, MB_ZF, 5, False), (-17.0, 17.0, M_TOP, MB_ZF - MB_REC, 6, True), (19.0, 47.0, E_TOP, MB_ZF, 5, False)):
    for i in range(n):
        x = x0 + (x1 - x0) * (i + 0.5) / n + _r.uniform(-0.8, 0.8)
        if any(abs(x - vx) < 2.2 for vx, _ in MB_SIGNS):
            continue
        quad((D, "door", 0), (x - 0.5, y + 0.02, zf + 0.02), (x + 0.5, y + 0.02, zf + 0.02), (x + 0.5, y + 2.12, zf + 0.02), (x - 0.5, y + 2.12, zf + 0.02))
        box((D, "glow", 1), x - 0.14, x + 0.14, y + 2.3, y + 2.48, zf + 0.02, zf + 0.12, scale=0.5, col=dim(GLOW[HUES[(i * 3) % 8]], 0.22 if slot else 0.8), bottom=True)
angled_sign(-39.0, W_TOP + 3.0, MB_ZF + 0.5, "pm", math.radians(8))
angled_sign(-26.0, W_TOP + 2.6, MB_ZF + 0.6, "bx", math.radians(-12))
angled_sign(40.0, E_TOP + 3.2, MB_ZF + 0.5, "pm", math.radians(-10))
angled_sign(24.0, 10.2, MB_ZF + 0.5, "bm", math.radians(14))

# ---------------------------------------------------------------------------
# The back lanes east of the canyon: a tube of light on a wall every few
# metres in its own colour (and its pool on the ground), workshop windows
# lit at street level, more of what a lane keeps.
# ---------------------------------------------------------------------------
# (x, z, wall normal x, wall normal z): spots on the blocks' own walls.
SPOTS = ((52.0, -700.0, -1, 0), (52.0, -688.0, -1, 0), (52.0, -668.0, -1, 0), (52.0, -652.0, -1, 0), (52.0, -584.0, -1, 0), (52.0, -570.0, -1, 0),
         (64.0, -690.0, 1, 0), (64.0, -668.0, 1, 0), (64.0, -650.0, 1, 0), (68.0, -684.0, -1, 0), (68.0, -670.0, -1, 0), (90.0, -686.0, 1, 0),
         (90.0, -672.0, 1, 0), (96.0, -680.0, -1, 0), (96.0, -666.0, -1, 0), (70.0, -650.0, -1, 0), (70.0, -636.0, -1, 0), (92.0, -652.0, 1, 0),
         (92.0, -638.0, 1, 0), (98.0, -646.0, -1, 0), (98.0, -634.0, -1, 0), (76.0, -588.0, 1, 0), (76.0, -572.0, 1, 0), (82.0, -584.0, -1, 0),
         (82.0, -568.0, -1, 0), (104.0, -586.0, 1, 0), (104.0, -570.0, 1, 0), (110.0, -580.0, -1, 0), (110.0, -566.0, -1, 0),
         (74.0, -692.0, 0, -1), (84.0, -692.0, 0, -1), (104.0, -692.0, 0, -1), (120.0, -692.0, 0, -1), (74.0, -664.0, 0, 1), (86.0, -664.0, 0, 1),
         (104.0, -660.0, 0, 1), (120.0, -660.0, 0, 1), (76.0, -658.0, 0, -1), (88.0, -658.0, 0, -1), (104.0, -654.0, 0, -1), (122.0, -654.0, 0, -1),
         (76.0, -630.0, 0, 1), (104.0, -630.0, 0, 1), (120.0, -630.0, 0, 1), (58.0, -594.0, 0, -1), (70.0, -594.0, 0, -1), (88.0, -590.0, 0, -1),
         (98.0, -590.0, 0, -1), (116.0, -590.0, 0, -1), (126.0, -590.0, 0, -1), (58.0, -564.0, 0, 1), (70.0, -564.0, 0, 1), (90.0, -564.0, 0, 1),
         (118.0, -562.0, 0, 1), (58.0, -676.0, 0, -1), (58.0, -640.0, 0, 1), (60.0, -682.0, 0, 1), (56.0, -682.0, 0, 1))
for i, (x, z, nx, nz) in enumerate(SPOTS):
    hue = ("cyan", "amber", "pink", "white", "amber", "magenta", "teal", "amber")[i % 8]
    y = _r.uniform(2.6, 3.6)
    kind = i % 3
    if kind == 0:
        # A tube standing on the wall.
        hx, hz = (0.05, 0.05)
        box((D, "neon_" + hue, 0), x + nx * 0.06 - hx, x + nx * 0.06 + hx, y - 0.9, y + 0.9, z + nz * 0.06 - hz, z + nz * 0.06 + hz, scale=1.0)
    elif kind == 1:
        # A tube lying along it over a door or a hatch.
        if nx:
            box((D, "neon_" + hue, 0), min(x, x + nx * 0.1), max(x, x + nx * 0.1), y, y + 0.1, z - 0.9, z + 0.9, scale=1.0)
        else:
            box((D, "neon_" + hue, 0), x - 0.9, x + 0.9, y, y + 0.1, min(z, z + nz * 0.1), max(z, z + nz * 0.1), scale=1.0)
    else:
        wall_lamp(x, y, z, nx, nz, hue if hue != "magenta" else "pink", 3.0)
    light(D, x + nx * 1.6, y, z + nz * 1.6, hue if hue != "magenta" else "pink", 3.4)
    roll = _r.random()
    px, pz = x + nx * 0.75 + (0 if nx else _r.uniform(-2.5, 2.5)), z + nz * 0.75 + (0 if nz else _r.uniform(-2.5, 2.5))
    yaw = math.atan2(nx, nz)
    if roll < 0.2:
        P.place("vending" if i % 2 else "vending_warm", x + nx * 0.45 + (0 if nx else 1.6), G0, z + nz * 0.45 + (0 if nz else 1.6), yaw)
    elif roll < 0.4:
        stand(px, pz, yaw, _r.choice(("lean", "smoke", "squat", "phone")), G0)
    elif roll < 0.55:
        P.place(_r.choice(("drum", "crates", "bags")), px, G0, pz, yaw)
    elif roll < 0.65:
        angled_sign(x + nx * 0.7, y + 1.9, z + nz * 0.7, _r.choice(("bs", "bx", "ps")), yaw + math.pi / 2 + _r.uniform(-0.4, 0.4))

# ---------------------------------------------------------------------------
# Roofs, for a flying car. Flat light costs the hero nothing (it lies under
# its line of sight): the block's number written on the west roof, strips of
# skylight, lines of bulbs between the plant, and on the back blocks' roofs
# people's places: shacks, a garden, strings of light.
# ---------------------------------------------------------------------------
def flat_glow(x0, x1, z0, z1, y, hue, k):
    hquad((D, "glow", 0), x0, x1, z0, z1, y, col=dim(GLOW[hue], k))


def bulbs(a, b, n, hue="amber", k=0.8, sag=0.5, posts=True, guard=False):
    """A string of bulbs between two points over a roof."""
    if guard and hero_sees((min(a[0], b[0]), a[1] - 3.0, min(a[2], b[2])), (max(a[0], b[0]), max(a[1], b[1]) + 0.2, max(a[2], b[2]))):
        return
    cable(a, b, sag, steps=6, r=0.012)
    for i in range(1, n):
        t = i / n
        px, pz = a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t
        py = a[1] + (b[1] - a[1]) * t - sag * math.sin(math.pi * t) - 0.1
        box((D, "glow", 1), px - 0.07, px + 0.07, py - 0.07, py + 0.07, pz - 0.07, pz + 0.07, scale=0.5, col=dim(GLOW[hue], k), bottom=True)
    if posts:
        for p in (a, b):
            box((D, "metal", 1), p[0] - 0.04, p[0] + 0.04, p[1] - 2.4, p[1], p[2] - 0.04, p[2] + 0.04, scale=0.5)


WT, MT, ET = MB_SECTIONS[0][2], MB_SECTIONS[1][2], MB_SECTIONS[2][2]
# The west roof: H4, written to be read from the south (a flying car coming up the canyon).
for ch, cx in (("H", -40.0), ("4", -30.0)):
    u = 1.5
    for (a, b) in GLYPHS[ch]:
        pa = (cx + (a[0] - 2) * u, -761.0 + (3 - a[1]) * u)
        pb = (cx + (b[0] - 2) * u, -761.0 + (3 - b[1]) * u)
        dx, dz = pb[0] - pa[0], pb[1] - pa[1]
        length = math.hypot(dx, dz)
        qx, qz = -dz / length * 0.45, dx / length * 0.45
        pts = [(pa[0] - qx, WT + 0.03, pa[1] - qz), (pb[0] - qx, WT + 0.03, pb[1] - qz), (pb[0] + qx, WT + 0.03, pb[1] + qz), (pa[0] + qx, WT + 0.03, pa[1] + qz)]
        n = (pts[1][2] - pts[0][2]) * (pts[2][0] - pts[0][0]) - (pts[1][0] - pts[0][0]) * (pts[2][2] - pts[0][2])
        if n < 0:
            pts.reverse()
        quad((D, "glow", 0), *pts, col=dim(GLOW["yellow"], 0.3))
for z in (-748.0, -751.0):
    flat_glow(-46.0, -20.0, z - 0.12, z + 0.12, WT + 0.03, "cyan", 0.35)
# The middle roof: skylights either side of the well, a lit path round it.
for x0, x1 in ((-16.5, -11.0), (11.0, 16.5)):
    for z in (-781.0, -775.5, -770.0, -764.5):
        flat_glow(x0, x1, z - 1.6, z + 1.6, MT + 0.03, "white", 0.12)
for (x0, x1, z0, z1) in ((-9.8, 9.8, -762.4, -762.1), (-9.8, 9.8, -783.9, -783.6), (-9.9, -9.6, -783.6, -762.4), (9.6, 9.9, -783.6, -762.4)):
    flat_glow(x0, x1, z0, z1, MT + 0.03, "amber", 0.5)
flat_glow(-17.0, 17.0, -752.2, -752.0, MT + 0.03, "pink", 0.35)
# The east roof: the pad's floodlit apron and its approach lights.
flat_glow(24.4, 41.6, -785.0, -784.7, ET + 0.03, "white", 0.5)
flat_glow(24.4, 41.6, -767.3, -767.0, ET + 0.03, "white", 0.5)
for i in range(6):
    flat_glow(21.0 + i * 0.0, 21.5, -780.0 + i * 2.2, -779.2 + i * 2.2, ET + 0.03, "green", 0.6)
for i in range(5):
    flat_glow(43.0, 46.0, -781.0 + i * 3.0, -780.6 + i * 3.0, ET + 0.03, "amber", 0.5)
bulbs((20.0, ET + 2.4, -752.0), (46.0, ET + 2.4, -753.0), 14, "amber", guard=True)
bulbs((-46.5, WT + 2.4, -763.0), (-22.0, WT + 2.4, -762.0), 12, "pink", guard=True)
# The wings' podium terraces and tower roofs.
bulbs((-92.0, 13.9, -733.0), (-60.0, 13.9, -733.4), 16, "amber")
bulbs((-56.0, 13.9, -740.0), (-49.0, 13.9, -788.0), 18, "cyan")
bulbs((50.0, 13.9, -733.0), (63.0, 13.9, -733.2), 8, "pink")
bulbs((50.0, 13.9, -746.0), (55.0, 13.9, -788.0), 16, "amber")
bulbs((66.0, 27.5, -744.0), (102.0, 27.5, -743.0), 16, "amber")
bulbs((102.0, 27.5, -742.0), (102.0, 27.5, -702.0), 16, "cyan")
# The back blocks' roofs: where people have made a place of them.
ROOFS = ((68.0, 90.0, -692.0, -664.0, floor_y(13)), (52.0, 64.0, -676.0, -640.0, floor_y(7)), (98.0, 128.0, -654.0, -630.0, floor_y(5)),
         (52.0, 76.0, -594.0, -564.0, floor_y(11)), (110.0, 130.0, -590.0, -562.0, floor_y(6)), (96.0, 128.0, -692.0, -660.0, floor_y(8)))
for i, (x0, x1, z0, z1, top) in enumerate(ROOFS):
    hue = ("amber", "pink", "cyan", "amber", "pink", "amber")[i]
    bulbs((x0 + 1.0, top + 2.6, z0 + 1.2), (x1 - 1.0, top + 2.6, z0 + 1.6), 14, hue)
    bulbs((x0 + 1.2, top + 2.6, z1 - 1.2), (x0 + 1.4, top + 2.6, z0 + 1.6), 12, hue)
    if i in (1, 2, 4):
        # A roof garden: planters, a tarp, benches, someone up there.
        for j in range(3):
            px, pz = x0 + 2.5 + j * 2.6, z1 - 2.6
            tbox(px - 1.0, px + 1.0, top, top + 0.5, pz - 0.6, pz + 0.6, (0.12, 0.09, 0.07, 1.0))
            oriented_box((D, "trim", 1), px, top + 0.85, pz, 1.6, 0.7, 0.9, 0.3 * j, col=(0.07, 0.19, 0.1, 1.0))
        cloth((x0 + 2.0, top + 2.5, z1 - 6.0), (x0 + 6.5, top + 2.5, z1 - 6.0), (x0 + 6.5, top + 2.1, z1 - 9.5), (x0 + 2.0, top + 2.1, z1 - 9.5), hue)
        for (dx, dz) in ((2.0, -6.0), (6.5, -6.0), (6.5, -9.5), (2.0, -9.5)):
            box((D, "metal", 1), x0 + dx - 0.04, x0 + dx + 0.04, top, top + 2.5, z1 + dz - 0.04, z1 + dz + 0.04, scale=0.5)
        P.place("bench", x0 + 4.2, top, z1 - 7.8, 0.0)
        stand(x0 + 4.2, z1 - 7.8, 0.0, "sit", top + 0.48)
        stand(x0 + 5.4, z1 - 6.6, 2.4, "idle", top)
        stand(x1 - 1.0, z1 - 4.0, math.pi / 2, "phone", top)
    else:
        for j in range(2):
            oriented_box((D, "trim", 0), x1 - 4.0 - j * 4.2, top + 1.15, z0 + 4.0 + j * 1.5, 2.6, 2.3, 2.2, 0.3 + j * 0.5, col=RUST if j else TEAL_PAINT)
            rotated_quad((D, "glow", 0), x1 - 4.0 - j * 4.2 + math.sin(0.3 + j * 0.5) * 1.12, top + 1.3, z0 + 4.0 + j * 1.5 + math.cos(0.3 + j * 0.5) * 1.12, 0.9, 0.8,
                         0.3 + j * 0.5, col=dim(GLOW[hue], 0.5))
        stand(x1 - 6.0, z0 + 7.0, 1.0, "smoke", top)
        stand(x0 + 1.0, z1 - 3.0, -math.pi / 2, "idle", top)


# ---------------------------------------------------------------------------
# More for a flying car: roof lights in rows (a lit box each, as over a
# stair or a hall), and a lit deck where people sit out.
# ---------------------------------------------------------------------------
def skylights(x0, z0, nx, nz, y, hue="white", k=0.16, w=1.5, d=2.2, gap=0.9):
    for i in range(nx):
        for j in range(nz):
            xa, za = x0 + i * (w + gap), z0 + j * (d + gap)
            box((D, "metal", 1), xa - 0.1, xa + w + 0.1, y, y + 0.3, za - 0.1, za + d + 0.1, scale=1.0)
            hquad((D, "glow", 0), xa, xa + w, za, za + d, y + 0.31, col=dim(GLOW[hue], k))


def lit_deck(x0, x1, z0, z1, y, hue="amber", k=0.07):
    """A roof deck somebody has laid: boards, a wash of light over them."""
    hquad((D, "trim", 0), x0, x1, z0, z1, y + 0.04, col=(0.16, 0.11, 0.07, 1.0), scale=1.0)
    hquad((D, "glow", 0), x0 + 0.3, x1 - 0.3, z0 + 0.3, z1 - 0.3, y + 0.05, col=dim(GLOW[hue], k))


skylights(-89.0, -746.5, 5, 2, floor_y(17), "white", 0.14)
skylights(-70.0, -746.5, 3, 2, floor_y(17), "cyan", 0.16)
skylights(60.0, -756.5, 6, 2, floor_y(15), "white", 0.14)
skylights(86.0, -756.5, 4, 2, floor_y(15), "amber", 0.14)
skylights(70.0, -690.0, 3, 2, floor_y(13), "white", 0.14)
skylights(99.0, -690.5, 4, 1, floor_y(8), "cyan", 0.16)
skylights(54.0, -592.0, 3, 2, floor_y(11), "white", 0.14)
skylights(112.0, -588.0, 3, 2, floor_y(6), "amber", 0.14)
skylights(83.5, -589.0, 1, 5, floor_y(16), "cyan", 0.16, w=1.6, d=2.0)
skylights(71.0, -657.0, 1, 6, floor_y(18), "white", 0.14, w=1.6, d=2.4)
skylights(66.0, -743.0, 4, 2, floor_y(7), "white", 0.14)
skylights(53.5, -706.0, 2, 3, floor_y(11), "amber", 0.14)
for (x0, x1, z0, z1, y, hue) in ((-93.0, -84.0, -737.2, -733.0, floor_y(3), "amber"), (-57.0, -52.0, -752.0, -742.0, floor_y(3), "pink"),
                                 (49.0, 55.0, -744.0, -733.5, floor_y(3), "amber"), (86.0, 96.0, -741.0, -733.0, floor_y(7), "pink"),
                                 (53.0, 60.0, -650.0, -642.0, floor_y(7), "pink"), (100.0, 108.0, -640.0, -632.0, floor_y(5), "cyan"),
                                 (112.0, 120.0, -572.0, -564.0, floor_y(6), "pink"), (-24.0, -19.5, -760.0, -752.0, WT, "amber"),
                                 (36.0, 46.0, -764.0, -756.0, ET, "amber")):
    lit_deck(x0, x1, z0, z1, y, hue)
    stand((x0 + x1) / 2 - 0.6, (z0 + z1) / 2, 1.2, "talk", y)
    stand((x0 + x1) / 2 + 0.5, (z0 + z1) / 2 + 0.3, -1.9, "talk", y)
    stand(x1 - 0.8, z0 + 0.8, 2.6, "sit", y + 0.4)
    tbox(x1 - 1.2, x1 - 0.4, y, y + 0.4, z0 + 0.4, z0 + 1.2, STEEL, detail=1)
# Lit edges on the crowns that had none.
for (x0, x1, z0, z1, y, hue) in ((-86.0, -64.0, -780.0, -748.0, floor_y(21), "magenta"), (62.0, 92.0, -782.0, -758.0, floor_y(19), "amber")):
    walls((D, "neon_" + hue, 0), [(x0 - 0.04, z1 + 0.04), (x1 + 0.04, z1 + 0.04), (x1 + 0.04, z0 - 0.04), (x0 - 0.04, z0 - 0.04)], y + 0.83, y + 0.92, (1, 1, 1, 1))

# ---------------------------------------------------------------------------
# The ground at junction L. The megabuilding street's north pavement west
# of x -80 and the corner it turns on the west street's (the plan's streets
# leave it to whoever stands there): paved here, kerbed, a hair under the
# street's own level so nothing fights if the streets come to pave it.
# ---------------------------------------------------------------------------
hquad((D, "sidewalk", 0), -94.0, -80.0, ST_N, -728.3, G0 - 0.002, scale=2.0)
hquad((D, "sidewalk", 0), -94.0, -90.3, -728.3, -728.0, G0 - 0.002, scale=2.0)
box((D, "kerb", 0), -90.3, -80.0, 0.0, G0 - 0.002, -728.3, -728.0, scale=1.0)
P.place("bollard", -91.0, G0, -729.0)
P.place("bollard", -89.2, G0, -728.9)
P.place("signal_box", -90.9, G0, -731.2, math.pi / 2)

# ---------------------------------------------------------------------------
# The forecourt's edge along the pavement (z -732.3..-734.4), which the
# walker passes at arm's length: machines, benches, trees, boards on legs, a
# cart, and people at them. Nothing lit between x -15 and 15 (the hero).
# ---------------------------------------------------------------------------
EDGE_Z = -733.1


def board_on_legs(x, z, yaw, size="ps"):
    w, h = ST_SIZES[size]
    angled_sign(x, G0 + 0.55 + h / 2, z, size, yaw)
    for du in (-w * 0.4, w * 0.4):
        px, pz = x + math.cos(yaw) * du, z - math.sin(yaw) * du
        box((D, "metal", 1), px - 0.03, px + 0.03, G0, G0 + 0.55, pz - 0.03, pz + 0.03, scale=0.5)


for (name, x) in (("vending", -39.2), ("vending_warm", -38.1), ("vending", 23.2), ("vending_warm", 24.3), ("vending", 41.2), ("vending", 42.3), ("vending_warm", 43.4)):
    P.place(name, x, G0, EDGE_Z, 0.0)
for x in (-35.2, -26.4, -11.8, 11.8, 26.6):
    P.place("bench", x, G0, EDGE_Z + 0.1, 0.0)
for x in (-28.8, -14.0, 14.0):
    P.place("planter_tree", x, G0, EDGE_Z - 0.3)
P.place("phone_booth", -23.4, G0, EDGE_Z - 0.1)
P.place("phone_booth", 44.9, G0, EDGE_Z - 0.1)
P.place("food_box", -33.4, G0, EDGE_Z, 0.0)
P.place("food_box", 28.9, G0, EDGE_Z, 0.0)
board_on_legs(-36.8, EDGE_Z + 0.25, math.radians(18))
board_on_legs(-18.2, EDGE_Z + 0.2, math.radians(-12), "bx")
board_on_legs(22.0, EDGE_Z + 0.25, math.radians(-20))
board_on_legs(39.9, EDGE_Z + 0.2, math.radians(15), "bx")
# A food cart at the kerb's edge of the forecourt, west: a box on wheels, a lit hatch, an umbrella.
CART = (-30.6, -733.6)
tbox(CART[0] - 1.1, CART[0] + 1.1, G0 + 0.35, G0 + 1.5, CART[1] - 0.6, CART[1] + 0.6, YEL_OLD, bottom=True)
for dx in (-0.8, 0.8):
    cylinder((D, "dark", 1), CART[0] + dx, CART[1], G0, G0 + 0.36, 0.2, segs=6)
box((D, "neon_amber", 0), CART[0] - 0.9, CART[0] + 0.9, G0 + 1.5, G0 + 1.58, CART[1] + 0.5, CART[1] + 0.62, scale=1.0)
box((D, "metal", 1), CART[0] - 0.03, CART[0] + 0.03, G0 + 1.5, G0 + 2.6, CART[1] - 0.03, CART[1] + 0.03, scale=0.5)
for i in range(6):
    a0, a1 = i * math.tau / 6, (i + 1) * math.tau / 6
    poly((D, "awning", 1), [(CART[0], G0 + 2.75, CART[1]), (CART[0] + math.cos(a1) * 1.6, G0 + 2.35, CART[1] + math.sin(a1) * 1.6),
                            (CART[0] + math.cos(a0) * 1.6, G0 + 2.35, CART[1] + math.sin(a0) * 1.6)], [(0.5, 1), (1, 0), (0, 0)],
         (1.0, 0.18, 0.53, 1.0) if i % 2 else (0.93, 0.92, 0.9, 1.0))
    poly((D, "awning", 1), [(CART[0], G0 + 2.75, CART[1]), (CART[0] + math.cos(a0) * 1.6, G0 + 2.35, CART[1] + math.sin(a0) * 1.6),
                            (CART[0] + math.cos(a1) * 1.6, G0 + 2.35, CART[1] + math.sin(a1) * 1.6)], [(0.5, 1), (0, 0), (1, 0)],
         (1.0, 0.18, 0.53, 1.0) if i % 2 else (0.93, 0.92, 0.9, 1.0))
stand(CART[0], CART[1] - 0.95, 0.0, "vendor", G0)
stand(CART[0] - 0.5, CART[1] + 1.05, math.pi, "idle", G0)
light(D, CART[0], 2.0, CART[1] + 1.0, "amber", 2.6)
for (x, z, yaw, pose, y) in ((-35.5, EDGE_Z + 0.1, 0.0, "sit", 0.48), (-34.8, EDGE_Z + 0.1, 0.0, "sit", 0.48), (-26.4, EDGE_Z + 0.1, 0.0, "sit", 0.48),
                             (-11.5, EDGE_Z + 0.1, 0.0, "sit", 0.48), (11.4, EDGE_Z + 0.1, 0.0, "sit", 0.48), (12.2, EDGE_Z + 0.1, 0.0, "sit", 0.48),
                             (26.6, EDGE_Z + 0.1, 0.0, "sit", 0.48), (27.2, EDGE_Z + 0.1, 0.0, "sit", 0.48), (-39.0, EDGE_Z + 0.9, math.pi, "phone", 0.0),
                             (23.6, EDGE_Z + 0.9, math.pi, "idle", 0.0), (42.2, EDGE_Z + 0.9, math.pi, "idle", 0.0), (43.6, EDGE_Z + 1.0, 2.8, "phone", 0.0),
                             (-16.0, EDGE_Z - 0.6, 0.6, "talk", 0.0), (-15.2, EDGE_Z - 0.1, 3.6, "talk", 0.0), (5.0, EDGE_Z - 0.4, 0.2, "idle", 0.0),
                             (-4.4, EDGE_Z - 0.2, -0.3, "phone", 0.0), (17.6, EDGE_Z - 0.5, 0.0, "smoke", 0.0), (30.2, EDGE_Z - 0.6, 0.0, "talk", 0.0),
                             (30.9, EDGE_Z + 0.1, math.pi, "talk", 0.0)):
    stand(x, z, yaw, pose, G0 + y)

# ---------------------------------------------------------------------------
# Trade in the back lanes: shopfronts let into the blocks' ground floors
# (workshops, a noodle counter, a clinic), lamps down the long lane's far
# side, more people.
# ---------------------------------------------------------------------------
LANE_SHOPS = (("-x", 52.0, -670.0, -660.4, 3), ("-x", 52.0, -652.0, -645.6, 3), ("-x", 52.0, -590.0, -580.4, 2), ("-x", 52.0, -702.0, -692.4, 0),
              ("-x", 68.0, -686.0, -676.4, 5), ("-x", 96.0, -684.0, -674.4, 1), ("+x", 90.0, -676.0, -669.6, 5), ("+z", -630.0, 74.0, 86.8, 0),
              ("+z", -630.0, 102.0, 114.8, 6), ("-z", -594.0, 56.0, 68.8, 2), ("-z", -590.0, 86.0, 95.6, 5), ("-z", -590.0, 112.0, 121.6, 4),
              ("-x", 70.0, -650.0, -640.4, 0), ("-x", 82.0, -584.0, -574.4, 5), ("-z", -692.0, 72.0, 81.6, 5), ("-z", -692.0, 100.0, 112.8, 1),
              ("+z", -664.0, 72.0, 78.4, 5), ("+z", -660.0, 100.0, 109.6, 1), ("-z", -654.0, 104.0, 113.6, 6), ("+z", -564.0, 56.0, 65.6, 2),
              ("+z", -564.0, 86.0, 92.4, 5))
for i, (name, plane, a0, a1, tint) in enumerate(LANE_SHOPS):
    n = {"+x": 1, "-x": -1, "+z": 1, "-z": -1}[name]
    g = face(name, plane + n * 0.3, a0, a1)
    B.shopfront(D, g, random.Random(8850 + i), 0.0, g.width, tint, sign_rate=1.0, awning_rate=0.45, door=False,
                palette=["pink", "amber", "cyan", "red", "teal", "magenta"])
    # Its two ends, closed, and a lid over the fascia.
    for e in (0.0, g.width):
        fbox(g, (D, "trim", 0), e - 0.05 if e else -0.2, e + 0.2 if e else 0.05, 0.0, SHOP_H, -0.3, 0.0, col=B.TRIM[tint])
    fbox(g, (D, "trim", 1), -0.2, g.width + 0.2, SHOP_H, SHOP_H + 0.12, -0.3, 0.1, col=BLACK)
    px, _, pz = g.p(g.at(g.width * 0.3), 0.0, 1.3)
    stand(px, pz, g.yaw + math.pi, _r.choice(("idle", "phone", "idle", "smoke")), G0)
    if i % 2:
        px, _, pz = g.p(g.at(g.width * 0.7), 0.0, 1.5)
        talkers(px, pz, G0, n=2, turn=_r.uniform(0, 3))
z = -700.0
while z < -564.0:
    if not (-618.0 < z < -602.0):
        P.place("lamp_short", 44.75, G0, z)
    z += 17.0
# Pools of light along that edge, and lamp columns east and west of the hero's slot.
for x in (-42.0, -34.0, -27.0, -19.0, -11.0, -3.5, 3.5, 11.0, 19.0, 26.0, 34.0, 42.0):
    light(D, x, 3.0, EDGE_Z - 0.4, ("amber", "white", "amber", "pink")[int(x) % 4], 2.8)
for x in (-41.0, -24.6, 21.4, 30.2, 45.9):
    P.place("lamp_short", x, G0, EDGE_Z - 0.9)
