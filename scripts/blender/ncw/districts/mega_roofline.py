"""What the slab's roofs look at: the walls that step up from one roof to
the next lived in (lit windows, a bar's sign, doors and lamps), the tiers'
front over the roofs dressed where the hero's lens cannot reach it, the east
roof's deck painted and worn round its pad, and the east block's wall over
the arm's roof signed.

Every lit thing on a face the hero could look at passes mega_face's
hero_hidden first; the step walls face east, away from the canyon.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_face import hero_hidden
from ncw.districts.mega_homes import lit_window, cage, PAINT
from ncw.districts.mega_roofs import ok

_r = random.Random(6101)
(WX0, WX1, WT, _), (MX0, MX1, MT, _), (EX0, EX1, ET, _) = MB_SECTIONS


def hid(f, s0, s1, y0, y1, out=0.3):
    """hero_hidden for a rectangle on face f."""
    a, b = sorted((f.at(s0), f.at(s1)))
    if f.nx != 0:
        x = f.plane + f.nx * out
        return hero_hidden(x - 0.1, x + 0.1, y0, y1, a) and hero_hidden(x - 0.1, x + 0.1, y0, y1, b)
    return hero_hidden(a, b, y0, y1, f.plane + f.nz * out)


# ---------------------------------------------------------------------------
# The middle section's wall over the east roof (x 18, 83..89 m), between
# what mega_top already hung on it (doors at 9 and 26, units, pipes, a sign
# at 18, a ladder at 23.7): windows lit along its foot, a bar's neon, lamps.
# ---------------------------------------------------------------------------
fx = face("+x", MX1, MB_ZB, MB_ZF - MB_REC)
for s in (2.6, 5.8, 14.6, 19.6, 31.6):
    lit_window(fx, s, ET + 0.95, _r.choice((1.2, 1.5)), 1.25, 0.04, _r, hue=_r.choice(("amber", "amber", "white", "pink")))
neon_board(fx, 34.0, 39.6, ET + 0.8, ET + 2.5, 0.34, "BAR", "pink", sub="OPEN 24 H", sub_hue="cyan")
for s in (7.6, 28.4):
    wall_lamp(fx.plane, ET + 2.9, fx.at(s), 1.0, 0.0, "amber", 2.8)
# The west section's wall over the middle roof (x -18, 89..95 m), as far
# as the middle section's roof runs.
fw = face("+x", WX1, MB_ZB, MB_ZF - MB_REC)
for s in (2.0, 6.5, 11.0, 23.0, 27.5, 32.0, 36.5):
    if hid(fw, s - 1.0, s + 1.0, MT, MT + 3.0):
        lit_window(fw, s, MT + 1.0, _r.choice((1.0, 1.3, 1.6)), 1.3, 0.04, _r, hue=_r.choice(("amber", "white", "amber", "cyan")))
for (s, w) in ((15.0, 1.2),):
    if hid(fw, s - 1.0, s + 1.0, MT, MT + 2.6):
        fw.quad((D, "door_panel", 0), s - w / 2, s + w / 2, MT, MT + 2.3, 0.03)
        fw.quad((D, "glow", 0), s - w / 2 - 0.1, s + w / 2 + 0.1, MT + 2.4, MT + 2.55, 0.05, col=dim(GLOW["white"], 0.5))
if hid(fw, 17.5, 21.5, MT + 2.6, MT + 4.6):
    neon_board(fw, 17.5, 21.5, MT + 2.8, MT + 4.4, 0.3, "ROOMS", "magenta")
for s in (4.0, 9.0, 25.0, 34.0):
    P.place("ac_wall", *fw.p(fw.at(s), MT + 3.3, 0.0), fw.yaw)

# ---------------------------------------------------------------------------
# The first tier's front over the roofs (z -801, 92..132 m) beside the
# number's board, where the canyon's walls hide it from the hero: a flat's
# window lit here and there, cages, units, a room built out, a stair's slots.
# ---------------------------------------------------------------------------
TZ = -801.0
ft = face("+z", TZ, -38.0, 38.0)
k = 1
while floor_y(k) < 92.0:
    k += 1
done = 0
while floor_y(k) + CELL_H < 132.0:
    y = floor_y(k)
    for s in [i * 3.1 + 1.6 for i in range(25)]:
        x = ft.at(s)
        if -22.0 < x < 22.0 or not hid(ft, s - 1.3, s + 1.3, y, y + CELL_H, 1.2):
            continue
        t = _r.random()
        if t < 0.34:
            lit_window(ft, s + _r.uniform(-0.4, 0.4), y + _r.uniform(0.8, 1.2), _r.choice((0.9, 1.2, 1.6)), _r.choice((1.2, 1.5)), 0.05, _r,
                       hue=_r.choice(("amber", "amber", "white", "amber", "pink")), detail=1)
            done += 1
        elif t < 0.44:
            cage(ft, s, y, _r)
        elif t < 0.58:
            P.place("ac_wall", *ft.p(x, y + _r.choice((0.5, 2.4)), 0.0), ft.yaw)
        elif t < 0.64:
            col = _r.choice(PAINT)
            fbox(ft, (D, "plaster", 0), s - 1.3, s + 1.3, y + 0.2, y + CELL_H - 0.35, 0.0, 0.8, col=tuple(min(1.0, c * 1.7) for c in col[:3]) + (1.0,), bottom=True)
            g = face("+z", TZ + 0.8, -38.0, 38.0)
            lit_window(g, s, y + 0.9, 1.6, 1.4, 0.02, _r, detail=1)
    k += 1

# ---------------------------------------------------------------------------
# The east roof's deck round its pad (83 m): the pad's approach hatched,
# a painted walk to the stair hut, cracks and a few more puddles.
# ---------------------------------------------------------------------------
Y = ET + 0.03


def flat_line(a, b, w, col, y=Y):
    dx, dz = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dz)
    px, pz = -dz / L * w / 2, dx / L * w / 2
    pts = [(a[0] - px, y, a[1] - pz), (b[0] - px, y, b[1] - pz), (b[0] + px, y, b[1] + pz), (a[0] + px, y, a[1] + pz)]
    n = (pts[1][2] - pts[0][2]) * (pts[2][0] - pts[0][0]) - (pts[1][0] - pts[0][0]) * (pts[2][2] - pts[0][2])
    if n < 0:
        pts.reverse()
    quad((D, "trim", 1), *pts, col=col)


if ok(23.0, 43.0, -789.0, -765.0, ET, ET + 0.2):
    for i in range(9):
        x = 26.0 + i * 1.6
        flat_line((x, -766.6), (x + 1.0, -765.6), 0.32, dim(YEL, 0.9))
    flat_line((24.0, -764.0), (24.0, -760.6), 0.22, dim(YEL, 0.8))
    flat_line((24.0, -764.0), (42.0, -764.0), 0.22, dim(YEL, 0.8))
    for _ in range(14):
        cx, cz = _r.uniform(20.0, 46.0), _r.uniform(-788.0, -747.0)
        if 24.5 < cx < 41.5 and -784.5 < cz < -767.5:
            continue
        a = _r.uniform(0.0, math.pi)
        L = _r.uniform(1.5, 4.5)
        flat_line((cx, cz), (cx + math.cos(a) * L, cz + math.sin(a) * L), 0.05, (0.05, 0.05, 0.06, 1.0), Y + 0.004)
    for (cx, cz, w, d) in ((22.5, -771.0, 2.6, 1.6), (44.0, -782.0, 1.8, 3.0), (37.0, -750.5, 3.2, 1.4)):
        hquad((D, "roof_wet", 0), cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, Y + 0.008, scale=4.0)

# ---------------------------------------------------------------------------
# The east block's north wall over the arm's roof (b1, z -692, 25..45 m):
# a hotel's sign up it and its windows lit, for the people on the arm.
# ---------------------------------------------------------------------------
fb = face("-z", -692.0, 68.0, 90.0)
vboard(fb, 13.0, 27.0, "HOTEL", "pink", w=1.5, out=1.9)
for (s, y) in ((4.0, 28.6), (8.0, 32.0), (17.5, 28.6), (19.5, 35.4), (6.0, 38.8), (16.0, 42.2)):
    lit_window(fb, s, y + 0.9, 1.3, 1.3, 0.07, _r, hue=_r.choice(("amber", "white", "amber")))
