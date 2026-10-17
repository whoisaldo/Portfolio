"""The old Explore-garage room's signature pieces, rebuilt as the kit's
prototypes (PLAN revision 3, "The old room carried forward"): David's yellow
jacket draped over its rolling stool, Maine's detached arm cannon in a
service cradle, Rebecca's mint and pink Guts on wall pegs, the Adam Smasher
print's frame and taped backing, the braindance monitor with its label and
deck, and the room's practical light: the amber strip over the bench and
the pink and cyan wall tubes.

The shapes, colours and proportions are read from the old builder
(scripts/blender/build_night_city_garage.py: its David_*, Maine_*,
Rebecca_*, Smasher, Braindance and tube parts) and built again here in the
kit's way: `trim` paint on the vertices, `glow` and `tube` for light, front
faces only. They are fictional display props of characters from Cyberpunk:
Edgerunners, set dressing as they were in the old room.

Everything a phone needs to know them by (the jacket's yellow, its bands
and emblem, the cannon's tan armour and launcher, the gun's mint and pink,
the print's frame, backing and tape) is main geometry; only screws, stitches,
wires and small print are `__near`.

The art is not drawn here: the Smasher frame leaves SMASHER_ART for the
layout's named, UV-mapped surface (smasher_art() gives it in world terms
for kit.named_quad), as the braindance monitor leaves BD_SCREEN for garage_screen.
"""
import math

from mathutils import Vector

from ncw.kit import GLOW, TUBE, box, cylinder, pipe, poly, quad
from ncw.props import lathe, place, proto
from ncw.garage.shapes import (
    ALU, BLACK_PAINT, CABLE, CHROME, GRIME, GUN, GUN_DARK, OFFWHITE, ORANGE, RUBBER, STEEL_MID,
    beam, cable, frame_of, hung, lin, obox, shade, soft, solid, words,
)

# The old room's colours (its materials' base colours), linear for `trim`.
JACKET = lin("e9bc27")        # David_yellow_fabric
BAND = lin("c4cfcd")          # reflective_fabric
TEAL = lin("007f75")          # Edgerunners_teal
CUFF = lin("1d1e21")
LINING = lin("2b2b2a")
MINT = lin("42bcab")          # Rebecca_Guts_mint
PINK = lin("cf5590")          # Rebecca_Guts_pink
TAN = lin("a88262")           # Maine_tan_armor
VINYL_BLACK = lin("17181a")
TAPE = lin("c9c1a3")
DUCT = lin("8a8d90")
STRAP = lin("26272a")


def face(key, pts, out, col, uvs=None):
    """A flat face through pts, wound to look along `out` whatever order
    they come in (the site draws front faces only)."""
    a, b, c = (Vector(p) for p in pts[:3])
    if (b - a).cross(c - a).dot(Vector(out)) < 0:
        pts = list(reversed(pts))
        uvs = list(reversed(uvs)) if uvs else None
    poly(key, [tuple(p) for p in pts], uvs or [(0, 0)] * len(pts), col)


def sweep(key, pts, radii, cols, segs=8, flat=1.0, cap=None):
    """A round part through pts (a sleeve, a finger, an arm's armour),
    radii[i] at each; cols[i] paints the stretch from pts[i] to pts[i+1]
    (a band, a cuff). Its rings are carried along it without twisting.
    `flat` squashes it up and down (a sleeve lying on a seat). `cap`: a
    colour to close its last end with."""
    P = [Vector(p) for p in pts]
    rings = []
    u = None
    for i, p in enumerate(P):
        w = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized()
        if u is None:
            ref = Vector((1, 0, 0)) if abs(w.x) < 0.9 else Vector((0, 0, 1))
            u = w.cross(ref).normalized()
        else:
            u = (u - w * u.dot(w)).normalized()
        v = w.cross(u).normalized()
        ring = []
        for t in (n * math.tau / segs for n in range(segs)):
            o = (u * math.cos(t) + v * math.sin(t)) * radii[i]
            o.y *= flat
            ring.append(tuple(p + o))
        rings.append(ring)
    for n, (a, b) in enumerate(zip(rings, rings[1:])):
        for i in range(segs):
            j = (i + 1) % segs
            quad(key, a[i], a[j], b[j], b[i], ((i / segs, n), ((i + 1) / segs, n), ((i + 1) / segs, n + 1), (i / segs, n + 1)), cols[n])
    if cap is not None:
        poly(key, rings[-1], [(0.5, 0.5)] * segs, cap)


# ---------------------------------------------------------------------------
# David's jacket on its rolling stool.
#
# The stool's seat faces -z (toward a bench set behind it), its back rest is
# at +z, and the jacket hangs over that back rest: its back, with the bands
# and the emblem, toward +z, so the prototype's front is the side to show.
# The cloth is one sheet from the front hem (lying on the seat) up the back
# rest's face, over its top and down behind it to the back hem: a path in
# the y-z plane (s, metres along it, 0 on the crest; negative toward the
# front hem), x across it, folds along its normal that deepen away from the
# crest, its shoulders dropped over the back rest's sides.
# ---------------------------------------------------------------------------
SEAT_Y = 0.625            # the cushion's top
REST = (0.0, 0.89, 0.2)   # the back rest's centre; it is 0.4 x 0.22 x 0.06
REST_TOP = 1.0
CREST = (0.985, 0.2)      # (y, z) the cloth bends round, radius CREST_R
CREST_R = 0.05
FRONT_LEN, BACK_LEN = 0.58, 0.72
# The bands, as distances from the crest along the cloth (both sides: the
# body's height from the shoulder), and the emblem's box on the back.
BANDS = ((0.40, 0.46), (0.57, 0.63))
EMBLEM_D = (0.1, 0.32)


def _path_points():
    """The cloth's line in (y, z), from the front hem's end of the seat to
    well past the back hem, densely."""
    yS = SEAT_Y + 0.014
    zf = CREST[1] - CREST_R          # the cloth's plane in front of the rest
    R = 0.055
    pts = [(yS, -0.3 + (zf - R + 0.3) * i / 40) for i in range(40)]  # along the seat, to the bend
    cy, cz = yS + R, zf - R
    pts += [(cy + R * math.sin(a), cz + R * math.cos(a)) for a in (math.radians(-90 + 90 * i / 12) for i in range(13))]
    pts += [(cy + (CREST[0] - cy) * i / 30, zf) for i in range(1, 31)]
    pts += [(CREST[0] + CREST_R * math.sin(b), CREST[1] + CREST_R * math.cos(b)) for b in (math.radians(180 - 180 * i / 24) for i in range(1, 25))]
    zb = CREST[1] + CREST_R
    pts += [(CREST[0] + (0.62 - CREST[0]) * i / 30, zb + 0.013 * i / 30) for i in range(1, 31)]
    pts += [(0.62 + (0.1 - 0.62) * i / 40, zb + 0.013 + 0.07 * i / 40) for i in range(1, 41)]
    return pts


def _path():
    """s along the cloth for each dense point, 0 on the crest's top."""
    pts = _path_points()
    acc = [0.0]
    for a, b in zip(pts, pts[1:]):
        acc.append(acc[-1] + math.dist(a, b))
    top = max(range(len(pts)), key=lambda i: pts[i][0])
    return [(acc[i] - acc[top], p) for i, p in enumerate(pts)]


PATH = _path()


def path_at(s):
    """The point on the cloth's line at s, its tangent (toward +s) and its
    outward normal, all in (y, z)."""
    for (s0, a), (s1, b) in zip(PATH, PATH[1:]):
        if s0 <= s <= s1:
            f = (s - s0) / (s1 - s0)
            ty, tz = b[0] - a[0], b[1] - a[1]
            ln = math.hypot(ty, tz)
            ty, tz = ty / ln, tz / ln
            return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f), (ty, tz), (tz, -ty)
    raise ValueError(f"s {s} off the jacket")


def _half_width(d):
    return 0.245 + 0.03 * min(1.0, d / 0.5)


def _fold(u, s):
    """How far out along its normal the cloth stands at (u, s): folds that
    hang from the crest and deepen toward the hems, a crumple where the
    front comes down onto the seat, the edges curling in to the rest."""
    d = abs(s)
    front = s < 0
    amp = 0.003 + 0.026 * min(1.0, d / 0.55) ** 1.3
    ph = 0.7 if front else 2.1
    off = amp * (0.62 * math.sin(5.6 * u + ph + 1.4 * d) + 0.38 * math.sin(11.3 * u + 2.0 * ph - 2.6 * d))
    if front:
        off += 0.017 * math.exp(-((d - 0.43) / 0.045) ** 2) * (0.75 + 0.25 * math.sin(4.0 * u))
    off -= 0.022 * max(0.0, abs(u) - 0.78) / 0.22 * min(1.0, d / 0.15)
    on_seat = front and d > 0.44
    return max(off, -0.006 if on_seat else -0.012)


def cloth_at(u, s):
    """The jacket's outer surface at (u across, -1..1; s along)."""
    d = abs(s)
    (y, z), (ty, tz), (ny, nz) = path_at(s)
    x = u * _half_width(d)
    off = _fold(u, s)
    y, z = y + ny * off, z + nz * off
    # The shoulders slope from the collar and drop over the back rest's sides.
    y -= 0.075 * u * u * max(0.0, 1.0 - d / 0.3)
    y -= 0.5 * max(0.0, abs(x) - 0.185) * max(0.0, 1.0 - d / 0.14)
    # The hems hang ragged.
    hem = FRONT_LEN if s < 0 else BACK_LEN
    w = max(0.0, 1.0 - (hem - d) / 0.06)
    shift = 0.012 * math.sin(6.0 * u + (1.0 if s < 0 else 2.5)) * w
    return Vector((x, y + ty * shift, z + tz * shift)), Vector((0.0, ny, nz))


def _rows():
    """The cloth's rows: about every 3 cm, closer round the crest, and on
    each band's edges so a band is whole rows."""
    out = sorted({-FRONT_LEN, 0.0, BACK_LEN, *EMBLEM_D, *(e * sg for band in BANDS for e in band for sg in (1, -1))})
    cand = [-FRONT_LEN + FRONT_LEN * (i / 22) ** 0.85 for i in range(23)] + [BACK_LEN * (i / 26) ** 1.1 for i in range(27)]
    for v in cand:
        if all(abs(v - m) > 0.01 for m in out):
            out.append(v)
            out.sort()
    return out


ROWS = _rows()
COLS = 16
JACKET_T = 0.012


def _band(d):
    return any(a <= d <= b for a, b in BANDS)


def _grid():
    return [[cloth_at(-1 + 2 * c / COLS, s) for c in range(COLS + 1)] for s in ROWS]


def _on_cloth(G, u, s, lift):
    """A point on the drawn (faceted) cloth at (u, s), `lift` off it."""
    r = max(i for i, v in enumerate(ROWS[:-1]) if v <= s)
    fs = (s - ROWS[r]) / (ROWS[r + 1] - ROWS[r])
    cu = (u + 1) / 2 * COLS
    c = min(int(cu), COLS - 1)
    fu = cu - c
    p = (G[r][c][0] * (1 - fu) * (1 - fs) + G[r][c + 1][0] * fu * (1 - fs) +
         G[r + 1][c][0] * (1 - fu) * fs + G[r + 1][c + 1][0] * fu * fs)
    n = (G[r][c + 1][0] - G[r][c][0]).cross(G[r + 1][c][0] - G[r][c][0]).normalized()
    if n.dot(G[r][c][1]) < 0:
        n = -n
    return p + n * lift, n


def _cloth_strokes(key, G, segs, width, col, lift=0.005, step=0.025):
    """Strips along (x, d) segments on the jacket's back (x metres across,
    d metres down from the crest), following its folds."""
    for (x0, d0), (x1, d1) in segs:
        ln = math.hypot(x1 - x0, d1 - d0)
        n = max(1, math.ceil(ln / step))
        ex, ed = (x1 - x0) / ln, (d1 - d0) / ln
        ox, od = -ed * width / 2, ex * width / 2
        a0, a1 = (x0 - ex * width * 0.35, d0 - ed * width * 0.35), (x1 + ex * width * 0.35, d1 + ed * width * 0.35)
        prev = None
        for i in range(n + 1):
            f = i / n
            cx, cd = a0[0] + (a1[0] - a0[0]) * f, a0[1] + (a1[1] - a0[1]) * f
            L, nl = _on_cloth(G, (cx - ox) / _half_width(abs(cd - od)), cd - od, lift)
            R, _ = _on_cloth(G, (cx + ox) / _half_width(abs(cd + od)), cd + od, lift)
            if prev:
                face(key, (prev[0], prev[1], R, L), nl, col)
            prev = (L, R)


# The emblem on the jacket's back, as the old room drew it (David's
# "Edgerunners" mark: a teal zigzag and its slash), in (x, height above the
# emblem's foot) metres; mapped onto EMBLEM_D below.
_EMBLEM = [[(-0.15, 0.1), (0.15, 0.18), (-0.1, 0.27), (0.1, 0.36)], [(-0.08, 0.39), (0.05, 0.07)]]


def _emblem_segs():
    d0, d1 = EMBLEM_D
    top = 0.39
    k = (d1 - d0) / (top - 0.07)
    out = []
    for line in _EMBLEM:
        pts = [(x * 0.8, d0 + (top - y) * k) for x, y in line]
        out += list(zip(pts, pts[1:]))
    return out


def _jacket(t, n):
    G = _grid()
    R = len(ROWS)
    for r in range(R - 1):
        d = abs((ROWS[r] + ROWS[r + 1]) / 2)
        col = BAND if _band(d) else JACKET
        for c in range(COLS):
            a, b, cc, dd = G[r][c][0], G[r + 1][c][0], G[r + 1][c + 1][0], G[r][c + 1][0]
            uv = ((c * 0.033, ROWS[r]), (c * 0.033, ROWS[r + 1]), ((c + 1) * 0.033, ROWS[r + 1]), ((c + 1) * 0.033, ROWS[r]))
            face(t, (a, b, cc, dd), G[r][c][1], col, uvs=uv)
    inner = [[(p - nn * JACKET_T, nn) for p, nn in row] for row in G]
    # The cloth's thickness round its edges, and its lining just inside them.
    for c in range(COLS):
        for r, out in ((0, None), (R - 1, None)):
            o0, o1, i0, i1 = G[r][c][0], G[r][c + 1][0], inner[r][c][0], inner[r][c + 1][0]
            tang = (G[min(r + 1, R - 1)][c][0] - G[max(r - 1, 0)][c][0]) * (1 if r else -1)
            face(t, (o0, o1, i1, i0), tang, CUFF)
            r2 = 1 if r == 0 else R - 2
            face(n, (inner[r][c][0], inner[r][c + 1][0], inner[r2][c + 1][0], inner[r2][c][0]), -G[r][c][1], LINING)
    for r in range(R - 1):
        for c, side in ((0, -1), (COLS, 1)):
            o0, o1, i0, i1 = G[r][c][0], G[r + 1][c][0], inner[r][c][0], inner[r + 1][c][0]
            face(t, (o0, o1, i1, i0), (side, 0, 0), JACKET)
            c2 = 1 if c == 0 else COLS - 1
            face(n, (inner[r][c][0], inner[r + 1][c][0], inner[r + 1][c2][0], inner[r][c2][0]), -G[r][c][1], LINING)
    # The teal emblem on the back, between the shoulders and the bands.
    _cloth_strokes(t, G, _emblem_segs(), 0.034, TEAL)
    # The zip down the front, and the stitching along each band (near by).
    _cloth_strokes(n, G, [((0.0, -0.03), (0.0, -FRONT_LEN + 0.02))], 0.012, CUFF, lift=0.003)
    for a, b in BANDS:
        for e in (a + 0.007, b - 0.007):
            for sgn in (1, -1):
                if e > FRONT_LEN - 0.01 and sgn < 0:
                    continue
                hw = _half_width(e) * 0.96
                _cloth_strokes(n, G, [((-hw, e * sgn), (hw, e * sgn))], 0.004, shade(BAND, 0.62), lift=0.0035, step=0.06)
    # The collar, rolled on the crest.
    cy, cz = CREST
    col_pts = [(x, cy + CREST_R + 0.02 - 0.075 * (x / _half_width(0.0)) ** 2 - 0.03 * (x / 0.17) ** 2, cz - 0.004)
               for x in (-0.17, -0.12, -0.06, 0.0, 0.06, 0.12, 0.17)]
    sweep(t, col_pts, [0.018, 0.03, 0.034, 0.034, 0.034, 0.03, 0.018], [shade(JACKET, 0.88)] * 6, segs=8, flat=0.75)
    # The sleeves hang clear of the back down the stool's sides, the left
    # straight, the right swung toward the seat.
    left = [(-0.24, 0.93, 0.2), (-0.33, 0.87, 0.225), (-0.37, 0.74, 0.255), (-0.378, 0.6, 0.265), (-0.372, 0.48, 0.255),
            (-0.364, 0.4, 0.24), (-0.36, 0.35, 0.232), (-0.358, 0.325, 0.23)]
    right = [(0.24, 0.93, 0.19), (0.33, 0.87, 0.2), (0.37, 0.75, 0.195), (0.38, 0.62, 0.17), (0.37, 0.5, 0.13),
             (0.355, 0.42, 0.095), (0.35, 0.375, 0.08), (0.348, 0.35, 0.075)]
    for pts, flat in ((left, 1.0), (right, 1.0)):
        cols = [JACKET, JACKET, JACKET, JACKET, BAND, JACKET, CUFF]
        radii = [0.062, 0.064, 0.062, 0.058, 0.055, 0.052, 0.05, 0.05]
        sweep(t, pts, radii, cols, segs=8, flat=flat, cap=GRIME)


def _stool(t, n):
    """A shop's rolling stool: five legs on castors, a gas column, a foot
    ring, a round vinyl seat and a small back rest on a flat bar."""
    cylinder(t, 0.0, 0.0, 0.05, 0.11, 0.045, segs=10, col=BLACK_PAINT)
    for i in range(5):
        a = i * math.tau / 5 + math.tau / 20
        ca, sa = math.cos(a), math.sin(a)
        beam(t, (0.04 * ca, 0.09, 0.04 * sa), (0.28 * ca, 0.068, 0.28 * sa), 0.022, 0.015, col=BLACK_PAINT)
        tx, tz = 0.28 * ca, 0.28 * sa
        # The castor: its wheel across the leg, its fork near by.
        pipe(t, (tx - sa * 0.025, 0.03, tz + ca * 0.025), (tx + sa * 0.025, 0.03, tz - ca * 0.025), 0.03, segs=8, col=RUBBER, caps=True)
        box(n, tx - 0.012, tx + 0.012, 0.03, 0.06, tz - 0.012, tz + 0.012, col=STEEL_MID)
    cylinder(t, 0.0, 0.0, 0.11, 0.34, 0.032, segs=10, col=BLACK_PAINT)
    cylinder(t, 0.0, 0.0, 0.34, 0.56, 0.019, segs=8, col=CHROME)
    ring = [(0.2 * math.cos(i * math.tau / 14), 0.31, 0.2 * math.sin(i * math.tau / 14)) for i in range(15)]
    sweep(t, ring, [0.011] * 15, [CHROME] * 14, segs=5)
    for i in range(3):
        a = i * math.tau / 3
        pipe(t, (0.03 * math.cos(a), 0.31, 0.03 * math.sin(a)), (0.195 * math.cos(a), 0.31, 0.195 * math.sin(a)), 0.008, segs=5, col=CHROME)
    cylinder(t, 0.0, 0.0, 0.54, 0.556, 0.15, segs=14, col=GUN_DARK)
    lathe(t, 0.0, 0.0, ((0.552, 0.175), (0.566, 0.2), (0.598, 0.206), (0.616, 0.19), (SEAT_Y, 0.15)), segs=18, col=VINYL_BLACK)
    face(t, [(0.176 * math.cos(i * math.tau / 18), 0.552, 0.176 * math.sin(i * math.tau / 18)) for i in range(18)], (0, -1, 0), GUN_DARK)
    # The back rest's bar, from under the seat's back up behind it.
    beam(t, (0.0, 0.548, 0.06), (0.0, 0.556, 0.19), 0.025, 0.006, col=BLACK_PAINT)
    beam(t, (0.0, 0.556, 0.19), (0.0, 0.83, 0.218), 0.025, 0.006, col=BLACK_PAINT)
    rx, ry, rz = REST
    soft(t, (rx, ry, rz), (1, 0, 0), (0, 1, 0), 0.2, 0.11, 0.03, 0.012, col=VINYL_BLACK)
    # The height lever under the seat.
    pipe(n, (0.03, 0.53, -0.02), (0.2, 0.52, -0.06), 0.006, segs=4, col=BLACK_PAINT)


@proto("garage_jacket_chair", box=(0.46, 0.54, 0.36))
def _jacket_chair(k):
    """David's yellow jacket thrown over a rolling shop stool: its back, the
    reflective bands and the teal emblem toward the prototype's front (+z),
    the stool's seat facing -z (a bench behind it), one sleeve hanging, one
    across the seat. The old room's David_* pieces, as kit geometry."""
    t, n = k("trim"), k("trim", 1)
    _stool(t, n)
    _jacket(t, n)


# ---------------------------------------------------------------------------
# Maine's arm cannon in its service cradle, on a bench (base y 0 its top).
# The arm lies along x, its shoulder at -x and its hand at +x, the launcher
# on top, its front (+z) the side to see.
# ---------------------------------------------------------------------------
ARM_Y = 0.36


# The forearm's three tan plates (x from, to), the dark core between them.
ARMOUR = ((-0.55, -0.335), (-0.305, -0.07), (-0.04, 0.25))


def _arm_r(x):
    """The forearm armour's radius along it (it tapers to the wrist)."""
    return 0.245 - 0.055 * min(1.0, max(0.0, (x + 0.55) / 0.83))


@proto("garage_maine_cradle", box=(0.78, 0.38, 0.28))
def _maine_cradle(k):
    """Maine's detached cybernetic arm and its projectile launcher, laid in
    a service cradle: two padded saddles on a base plate, a ratchet strap
    over each, a diagnostic lead into the shoulder socket, a plate that says
    whose it is. The old room's Maine_* pieces, as kit geometry."""
    t, n = k("trim"), k("trim", 1)
    Y = ARM_Y
    # The cradle.
    box(t, -0.62, 0.42, 0.0, 0.02, -0.2, 0.2, col=GUN_DARK)
    for x in (-0.42, 0.11):
        r = _arm_r(x)
        box(t, x - 0.05, x + 0.05, 0.02, Y - r * 0.82, -0.17, 0.17, col=GUN)
        for s in (-1, 1):
            a = math.radians(38) * s
            c = Vector((x, Y - (r + 0.018) * math.cos(a), (r + 0.018) * math.sin(a)))
            obox(t, tuple(c), (1, 0, 0), (0, math.cos(a), -math.sin(a)), 0.055, 0.018, 0.06, col=RUBBER)
        # The strap over the arm, round from one side of the saddle to the other.
        ring = [(-math.radians(55) + math.radians(290) * i / 14) for i in range(15)]
        rr = r + 0.012
        for a0, a1 in zip(ring, ring[1:]):
            p = [Vector((x + dx, Y + rr * math.cos(a), rr * math.sin(a))) for a, dx in ((a0, -0.025), (a0, 0.025), (a1, 0.025), (a1, -0.025))]
            face(t, p, (0, math.cos(a0), math.sin(a0)), STRAP)
        box(t, x - 0.03, x + 0.03, Y - r * 0.82 - 0.06, Y - r * 0.82 - 0.01, 0.17, 0.2, col=CHROME)
    # The plate on the cradle's front: whose arm, what it is.
    box(t, -0.36, 0.16, 0.022, 0.085, 0.2, 0.206, col=BLACK_PAINT)
    words(t, "MAINE", (-0.1, 0.062, 0.206), (1, 0, 0), (0, 1, 0), 0.22, 0.03, 0.006, OFFWHITE, lift=0.001)
    words(n, "PROJECTILE LAUNCH SYSTEM", (-0.1, 0.036, 0.206), (1, 0, 0), (0, 1, 0), 0.46, 0.014, 0.0028, OFFWHITE, lift=0.001)
    # The shoulder's stump, its socket and the wires out of it.
    sweep(t, [(-0.62, Y, 0), (-0.69, Y, 0), (-0.74, Y, 0)], [0.21, 0.215, 0.2], [GUN_DARK, GUN_DARK], segs=12, cap=GUN_DARK)
    sweep(t, [(-0.741, Y, 0), (-0.752, Y, 0)], [0.09, 0.08], [CHROME], segs=10, cap=GRIME)
    for i, col in enumerate((lin("b3261e"), lin("1f5aa8"), lin("d9a31a"), lin("2f7a3a"))):
        a = i * math.tau / 4 + 0.4
        sweep(n, [(-0.74, Y + 0.13 * math.sin(a), 0.13 * math.cos(a)), (-0.758, Y + 0.14 * math.sin(a) - 0.02, 0.15 * math.cos(a)),
                  (-0.752, Y + 0.12 * math.sin(a) - 0.06, 0.16 * math.cos(a))], [0.012] * 3, [col, col], segs=5)
    # The elbow's ring and the forearm's armour, its seams in steel.
    sweep(t, [(-0.64, Y, 0), (-0.62, Y, 0), (-0.57, Y, 0), (-0.55, Y, 0)], [0.235, 0.258, 0.258, 0.24], [ALU, ALU, ALU], segs=12)
    xs = [-0.55 + 0.83 * i / 6 for i in range(7)]
    sweep(t, [(x, Y, 0) for x in xs], [_arm_r(x) - 0.035 for x in xs], [GUN_DARK] * 6, segs=8)
    for x0, x1 in ARMOUR:
        xs = (x0, x0 + 0.012, x1 - 0.012, x1)
        sweep(t, [(x, Y, 0) for x in xs], [_arm_r(x0) - 0.03, _arm_r(x0), _arm_r(x1), _arm_r(x1) - 0.03], [TAN, TAN, TAN], segs=8)
    # The launcher's receiver along the top, the launcher in it.
    obox(t, (-0.08, Y + 0.215, 0.0), (1, 0, 0), (0, 1, 0), 0.38, 0.065, 0.12, col=shade(TAN, 0.85))
    sweep(t, [(-0.27, Y + 0.31, 0), (0.39, Y + 0.31, 0)], [0.075, 0.075], [ALU], segs=12, cap=GRIME)
    for x in (-0.12, 0.2):
        sweep(t, [(x - 0.02, Y + 0.31, 0), (x + 0.02, Y + 0.31, 0)], [0.083, 0.083], [GUN_DARK], segs=12)
    sweep(t, [(0.39, Y + 0.31, 0), (0.41, Y + 0.31, 0)], [0.07, 0.065], [GUN_DARK], segs=12, cap=(0.002, 0.002, 0.002, 1))
    # The wrist, the palm and the fingers curled down onto the cradle's end.
    sweep(t, [(0.27, Y, 0), (0.33, Y - 0.005, 0), (0.39, Y - 0.01, 0)], [0.17, 0.15, 0.13], [GUN_DARK, GUN_DARK], segs=10)
    soft(t, (0.48, Y - 0.02, 0.0), (1, 0, 0), (0, 1, 0), 0.1, 0.085, 0.14, 0.03, col=STEEL_MID)
    for z in (-0.105, -0.035, 0.035, 0.105):
        f = [(0.57, Y - 0.02, z), (0.63, Y - 0.035, z), (0.68, Y - 0.09, z), (0.69, Y - 0.16, z * 1.05), (0.67, Y - 0.215, z * 1.05)]
        sweep(t, f, [0.034, 0.032, 0.03, 0.028, 0.026], [STEEL_MID, GUN_DARK, STEEL_MID, STEEL_MID], segs=6, cap=GUN_DARK)
    sweep(t, [(0.47, Y - 0.04, 0.13), (0.55, Y - 0.07, 0.19), (0.6, Y - 0.13, 0.2), (0.6, Y - 0.19, 0.18)],
          [0.038, 0.034, 0.03, 0.028], [STEEL_MID, GUN_DARK, STEEL_MID], segs=6, cap=GUN_DARK)
    # The hydraulic lines along its front, and the lead into the socket.
    for dy, col in ((-0.08, GRIME), (0.06, lin("2a2c30"))):
        cable(t, [(-0.6, Y + dy, _arm_r(-0.6) + 0.015), (-0.2, Y + dy - 0.02, _arm_r(-0.2) + 0.02), (0.25, Y + dy, _arm_r(0.25) + 0.015)], 0.014, col=col, segs=6)
    cable(n, [(-0.752, Y, 0.0), (-0.762, Y - 0.08, 0.1)] + hung((-0.762, Y - 0.08, 0.1), (-0.66, 0.012, 0.25), 0.04, n=5)[1:], 0.009, col=ORANGE, segs=5)


# ---------------------------------------------------------------------------
# Rebecca's Guts on its pegs: a board on the wall (its back z 0, its foot
# y 0), two pegs, the gun on them, muzzle to +x. The old room's proportions
# (receiver, barrel, pump, stock) at 1.45 m long instead of 2.5.
# ---------------------------------------------------------------------------
GUTS_Y, GUTS_Z = 0.34, 0.095


@proto("garage_guts_pegs", box=(0.9, 0.32, 0.16))
def _guts_pegs(k):
    """Rebecca's oversize shotgun, Guts, in mint with pink furniture, laid on
    two steel pegs on a black board, NO REFUNDS in pink neon under it. The
    old room's Rebecca_* pieces, as kit geometry."""
    t, n, g = k("trim"), k("trim", 1), k("glow")
    Y, Z = GUTS_Y, GUTS_Z
    box(t, -0.88, 0.88, 0.02, 0.62, 0.0, 0.025, col=BLACK_PAINT)
    for (a, b, c, d) in ((-0.9, 0.9, 0.6, 0.64), (-0.9, 0.9, 0.0, 0.04), (-0.9, -0.86, 0.0, 0.64), (0.86, 0.9, 0.0, 0.64)):
        box(t, a, b, c, d, 0.0, 0.035, col=GUN_DARK)
    for x in (-0.8, 0.8):
        for y in (0.08, 0.54):
            pipe(n, (x, y, 0.025), (x, y, 0.03), 0.012, segs=6, col=CHROME, caps=True)
    # The pegs: out from the board and turned up at their tips.
    for x, top in ((-0.3, Y - 0.079), (0.42, Y - 0.111)):
        py = top - 0.01
        pipe(t, (x, py, 0.025), (x, py, Z + 0.04), 0.01, segs=6, col=CHROME)
        pipe(t, (x, py, Z + 0.04), (x, py + 0.03, Z + 0.055), 0.01, segs=6, col=CHROME, caps=True)
    # The receiver, the barrel over the pump, the stock and the grip.
    soft(t, (-0.05, Y, Z), (1, 0, 0), (0, 1, 0), 0.37, 0.078, 0.052, 0.014, col=MINT)
    pipe(t, (0.3, Y + 0.035, Z), (0.66, Y + 0.035, Z), 0.04, segs=10, col=STEEL_MID, caps=False)
    sweep(t, [(0.64, Y + 0.035, Z), (0.73, Y + 0.035, Z)], [0.05, 0.05], [GUN_DARK], segs=10, cap=GRIME)
    obox(t, (0.48, Y + 0.072, Z), (1, 0, 0), (0, 1, 0), 0.17, 0.012, 0.03, col=MINT)
    soft(t, (0.32, Y - 0.075, Z), (1, 0, 0), (0, 1, 0), 0.16, 0.036, 0.05, 0.012, col=PINK)
    for x in (0.2, 0.26, 0.32, 0.38, 0.44):
        box(n, x - 0.008, x + 0.008, Y - 0.105, Y - 0.045, Z + 0.05, Z + 0.054, col=shade(PINK, 0.6))
    soft(t, (-0.6, Y - 0.025, Z), (1, 0.12, 0), (-0.12, 1, 0), 0.19, 0.066, 0.045, 0.016, col=PINK)
    obox(t, (-0.785, Y - 0.03, Z), (1, 0.12, 0), (-0.12, 1, 0), 0.012, 0.075, 0.047, col=RUBBER)
    obox(t, (-0.22, Y - 0.15, Z), (0.96, 0.28, 0), (-0.28, 0.96, 0), 0.04, 0.09, 0.04, col=PINK)
    # The trigger guard, the top rail and its sight.
    beam(t, (-0.16, Y - 0.078, Z), (-0.13, Y - 0.12, Z), 0.008, 0.008, col=GUN_DARK)
    beam(t, (-0.13, Y - 0.12, Z), (-0.05, Y - 0.12, Z), 0.008, 0.008, col=GUN_DARK)
    box(t, -0.3, 0.25, Y + 0.078, Y + 0.094, Z - 0.02, Z + 0.02, col=GUN_DARK)
    box(t, -0.08, 0.04, Y + 0.094, Y + 0.15, Z - 0.026, Z + 0.026, col=GUN_DARK)
    box(g, 0.04, 0.045, Y + 0.11, Y + 0.13, Z - 0.012, Z + 0.012, col=GLOW["pink"])
    # Its name and its stripes on the receiver's side.
    words(t, "GUTS", (-0.14, Y + 0.012, Z + 0.052), (1, 0, 0), (0, 1, 0), 0.26, 0.075, 0.016, OFFWHITE, lift=0.0015, gap=0.2)
    for x in (0.06, 0.12, 0.18):
        box(t, x, x + 0.03, Y - 0.06, Y + 0.06, Z + 0.052, Z + 0.0545, col=PINK)
    # NO REFUNDS in pink tube on the board under it.
    words(g, "NO REFUNDS", (0.22, 0.1, 0.03), (1, 0, 0), (0, 1, 0), 0.6, 0.075, 0.012, GLOW["pink"], lift=0.002, gap=0.24)
    words(n, "NO REFUNDS", (0.22, 0.1, 0.026), (1, 0, 0), (0, 1, 0), 0.6, 0.075, 0.02, GRIME, lift=0.0, gap=0.24)


# ---------------------------------------------------------------------------
# The Adam Smasher print's frame and backing (back z 0 on the wall, foot
# y 0). The art itself is the layout's: a named quad at SMASHER_ART, in
# the art's 2:3 (design/night-city-garage/textures/adam-smasher.jpg is 768 x
# 1152; the old room stretched it to 2.0 x 2.7) at the old print's 2.7 m
# height, uv 0..1 from its bottom left, u along the frame's +x.
# ---------------------------------------------------------------------------
SMASHER_ART = ((0.0, 1.48, 0.032), 1.8, 2.7)


@proto("garage_smasher_frame", box=(1.02, 1.48, 0.06))
def _smasher_frame(k):
    """The Adam Smasher print's place: a steel angle frame round a dark
    backing board, the print's own opening (SMASHER_ART, the layout's
    garage_identity_poster) taped to it at the corners and once more where
    the old tape gave, the frame's bolts and a stain or two near by."""
    t, n = k("trim"), k("trim", 1)
    (cx, cy, cz), w, h = SMASHER_ART
    box(t, -0.97, 0.97, 0.04, 2.92, 0.0, cz - 0.002, col=lin("1f2024"))
    for (a, b, c, d) in ((-1.0, 1.0, 2.9, 2.96), (-1.0, 1.0, 0.0, 0.06), (-1.0, -0.94, 0.0, 2.96), (0.94, 1.0, 0.0, 2.96)):
        box(t, a, b, c, d, 0.0, 0.05, col=GUN_DARK)
    for x in (-0.97, 0.97):
        for y in (0.03, 2.93):
            box(n, x - 0.012, x + 0.012, y - 0.012, y + 0.012, 0.05, 0.056, col=CHROME)
    # Tape over the print's corners (in front of its plane), one duct-tape
    # repair on the right edge and a strip along the top that has lifted.
    tz = cz + 0.0005
    for sx in (-1, 1):
        for sy in (-1, 1):
            c = (cx + sx * w / 2, cy + sy * h / 2, tz + 0.0018)
            a = math.radians(45 if sx * sy > 0 else -45)
            obox(t, c, (math.cos(a), math.sin(a), 0), (-math.sin(a), math.cos(a), 0), 0.12, 0.034, 0.0018, col=TAPE, skip=("-w",))
    obox(t, (cx + w / 2, cy - 0.3, tz + 0.0018), (0, 1, 0), (-1, 0, 0), 0.085, 0.045, 0.0018, col=DUCT, skip=("-w",))
    obox(t, (cx - 0.25, cy + h / 2, tz + 0.0018), (1, 0.02, 0), (-0.02, 1, 0), 0.15, 0.026, 0.0018, col=shade(TAPE, 0.85), skip=("-w",))
    for x, y, s in ((-0.85, 0.25, 0.05), (0.8, 2.8, 0.035), (0.86, 0.8, 0.03)):
        quad(n, (x - s, y - s, cz - 0.0015), (x + s, y - s * 0.8, cz - 0.0015), (x + s * 0.7, y + s, cz - 0.0015), (x - s * 0.9, y + s * 0.8, cz - 0.0015), col=lin("141416"))


def smasher_art(x, y, z, yaw=0.0, s=1.0):
    """Where a garage_smasher_frame placed at (x, y, z, yaw), scaled s (sy and
    sxz alike), wants its art: (cx, cy, cz, w, h, yaw), kit.named_quad's
    arguments for the layout's garage_identity_poster."""
    (ax, ay, az), w, h = SMASHER_ART
    cx, cy, cz = frame_of(x, y, z, yaw)(ax * s, ay * s, az * s)
    return cx, cy, cz, w * s, h * s, yaw


def monitor_screen(x, y, z, yaw=0.0):
    """The same for a garage_bd_monitor's garage_screen (BD_SCREEN)."""
    (ax, ay, az), w, h = BD_SCREEN
    cx, cy, cz = frame_of(x, y, z, yaw)(ax, ay, az + 0.0005)
    return cx, cy, cz, w, h, yaw


# ---------------------------------------------------------------------------
# The braindance monitor at the old room's size (its BraindanceScreen was
# 2.43 x 1.367 m): a housing on the wall, its screen left for the layout's
# garage_screen at BD_SCREEN, BRAINDANCE / MOON 02 under it in cyan tube and
# the BD deck on a bracket under its left corner (the deck's foot y 0, the
# housing's back on the wall).
# ---------------------------------------------------------------------------
BD_SCREEN = ((0.0, 1.12, 0.081), 2.43, 1.367)


@proto("garage_bd_monitor", box=(1.27, 0.93, 0.34))
def _bd_monitor(k):
    """The braindance screen: a deep black housing round the layout's
    garage_screen (BD_SCREEN), its wall rails and a status lamp, BRAINDANCE
    / MOON 02 in cyan tube under it, the BD deck on its bracket, BD lit."""
    t, n, g = k("trim"), k("trim", 1), k("glow")
    (cx, cy, cz), w, h = BD_SCREEN
    for y in (cy - 0.35, cy + 0.35):
        box(t, -0.9, 0.9, y - 0.04, y + 0.04, 0.0, 0.02, col=GUN_DARK)
    box(t, -w / 2 - 0.05, w / 2 + 0.05, cy - h / 2 - 0.05, cy + h / 2 + 0.06, 0.02, cz - 0.001, col=BLACK_PAINT, bottom=True)
    box(t, -w / 2 - 0.05, w / 2 + 0.05, cy - h / 2 - 0.05, cy - h / 2 - 0.02, cz - 0.001, cz + 0.012, col=GUN_DARK)
    box(g, w / 2 - 0.06, w / 2 - 0.04, cy - h / 2 - 0.042, cy - h / 2 - 0.03, cz + 0.012, cz + 0.013, col=GLOW["amber"])
    box(t, -0.62, 0.62, 0.27, 0.35, 0.0, 0.012, col=BLACK_PAINT)
    words(g, "BRAINDANCE / MOON 02", (0.0, 0.31, 0.012), (1, 0, 0), (0, 1, 0), 1.12, 0.05, 0.008, GLOW["cyan"], lift=0.002, gap=0.25)
    # The deck on its bracket, under the screen's left corner.
    box(t, -1.25, -0.65, 0.0, 0.02, 0.0, 0.34, col=GUN_DARK)
    for x in (-1.2, -0.7):
        beam(t, (x, 0.02, 0.01), (x, 0.17, 0.01), 0.01, 0.006, col=GUN_DARK)
        beam(t, (x, 0.17, 0.01), (x, 0.02, 0.32), 0.008, 0.005, col=GUN_DARK)
    box(t, -1.23, -0.67, 0.02, 0.23, 0.02, 0.33, col=STEEL_MID)
    box(t, -1.22, -0.68, 0.03, 0.22, 0.33, 0.332, col=GUN_DARK)
    words(g, "BD", (-1.08, 0.125, 0.332), (1, 0, 0), (0, 1, 0), 0.12, 0.07, 0.01, GLOW["teal"], lift=0.001)
    box(g, -0.8, -0.77, 0.11, 0.14, 0.332, 0.334, col=GLOW["amber"])
    cable(n, [(-0.67, 0.12, 0.2), (-0.62, 0.1, 0.1)] + hung((-0.62, 0.1, 0.03), (-0.3, cy - h / 2 - 0.05, 0.03), 0.06, n=5)[1:], 0.006, col=CABLE, segs=4)


# ---------------------------------------------------------------------------
# The room's practical light, as the old room had it: the amber strip over
# the bench, the pink and cyan tubes on the side walls. Each in `tube`, its
# colour on its vertices; the luminous faces are published for B2/B4.
# ---------------------------------------------------------------------------
# The amber strip's face: centre, length along x, width, and its normal
# (down and out from the wall, 35 degrees below level).
BENCH_STRIP_FACE = ((0.0, 0.032, 0.085), 2.3, 0.03, (0.0, -math.sin(math.radians(55)), math.cos(math.radians(55))))


@proto("garage_bench_strip", box=(1.22, 0.05, 0.11), reach=600)
def _bench_strip(k):
    """The amber strip over the bench: a 2.4 m aluminium channel on two
    wall brackets (back on the wall, z 0, its foot y 0), tilted to light
    the bench and the pegboard below it, its diffuser in amber tube."""
    t, n = k("trim"), k("trim", 1)
    (fx, fy, fz), L, W, nrm = BENCH_STRIP_FACE
    N = Vector(nrm)
    U = Vector((1, 0, 0))
    V = N.cross(U).normalized()
    C = Vector((fx, fy, fz))
    obox(t, tuple(C - N * 0.018), tuple(U), tuple(V), 1.2, 0.03, 0.017, col=ALU)
    a, b = C + V * (W / 2) + N * 0.0005, C - V * (W / 2) + N * 0.0005
    face(k("tube"), (a - U * L / 2, a + U * L / 2, b + U * L / 2, b - U * L / 2), tuple(N), TUBE["amber"])
    for x in (-0.95, 0.95):
        beam(t, (x, 0.04, 0.0), (x, 0.04, 0.07), 0.015, 0.012, col=GUN_DARK)
    cable(n, [(1.2, 0.03, 0.07), (1.22, 0.02, 0.03), (1.22, 0.0, 0.01)], 0.004, col=CABLE, segs=4)


# A wall tube's light: centre, length (up y) and radius.
WALL_TUBE = ((0.0, 1.65, 0.1), 1.8, 0.03)


def _wall_tube(k, colour):
    t, n = k("trim"), k("trim", 1)
    (cx, cy, cz), L, r = WALL_TUBE
    box(t, -0.065, 0.065, cy - L / 2 - 0.15, cy + L / 2 + 0.15, 0.0, 0.05, col=GUN_DARK)
    cylinder(k("tube"), cx, cz, cy - L / 2, cy + L / 2, r, segs=8, col=TUBE[colour])
    for y in (cy - L / 2 - 0.03, cy + L / 2):
        cylinder(t, cx, cz, y, y + 0.03, r + 0.008, segs=8, col=CHROME)
        box(t, -0.02, 0.02, y, y + 0.03, 0.05, cz - r, col=STEEL_MID)
    # Its lead down the wall to the switch box at its foot.
    cable(t, [(0.0, cy - L / 2 - 0.03, cz)] + hung((0.0, cy - L / 2 - 0.08, 0.06), (0.33, 0.3, 0.04), 0.06, n=6)[1:], 0.009, col=CABLE, segs=5)
    box(t, 0.26, 0.41, 0.0, 0.3, 0.0, 0.1, col=STEEL_MID)
    box(n, 0.3, 0.37, 0.12, 0.2, 0.1, 0.11, col=GUN_DARK)
    box(n, 0.32, 0.35, 0.155, 0.18, 0.11, 0.125, col=BLACK_PAINT)


@proto("garage_wall_tube_pink", box=(0.42, 1.35, 0.14), reach=600)
def _wall_tube_pink(k):
    """A pink tube on its backplate (the old room's south wall), 1.8 m, its
    lead down to a switch box at its foot (y 0, back on the wall)."""
    _wall_tube(k, "pink")


@proto("garage_wall_tube_cyan", box=(0.42, 1.35, 0.14), reach=600)
def _wall_tube_cyan(k):
    """The same tube in cyan (the old room's north wall)."""
    _wall_tube(k, "cyan")


# ---------------------------------------------------------------------------
# The old room's back wall, as one set-down: bench, pegboard, the amber strip
# over them, a roll cab and its top box, the moon's monitor at the left,
# the Smasher at the right, Guts above, AFTERLIFE AUTO over all, Maine's arm
# on the bench and David's jacket on its stool in front. Its frame: x along
# the wall, z 0 the wall's face, +z into the room.
# ---------------------------------------------------------------------------
WORKBENCH = {
    "garage_bench": (0.0, 0.0, 0.375, 0.0),
    "garage_pegboard": (0.0, 0.0, 0.0, 0.0),
    "garage_bench_strip": (0.0, 2.32, 0.0, 0.0),
    "garage_tool_cab": (1.85, 0.0, 0.24, 0.0),
    "garage_tool_top": (1.85, 0.99, 0.24, 0.0),
    "garage_bd_monitor": (-2.75, 1.25, 0.0, 0.0),
    "garage_smasher_frame": (3.5, 0.6, 0.0, 0.0),
    "garage_guts_pegs": (0.0, 2.45, 0.0, 0.0),
    "garage_shop_sign": (0.3, 3.35, 0.0, 0.0),
    "garage_maine_cradle": (0.42, 0.9, 0.36, 0.0),
    "garage_jacket_chair": (-0.75, 0.0, 1.05, -0.35),
}


def place_workbench(x, z, yaw, y=0.0, district=None, omit=()):
    """The old room's back wall set down with its frame's origin at (x, y, z)
    on the wall's face, turned yaw (props.place's; +z into the room at yaw
    0). Returns the art and screen surfaces for the layout's named quads:
    {"garage_identity_poster": smasher_art(...), "garage_screen": ...}."""
    at = frame_of(x, y, z, yaw)
    for name, (ox, oy, oz, turn) in WORKBENCH.items():
        if name in omit:
            continue
        px, py, pz = at(ox, oy, oz)
        place(name, px, py, pz, yaw + turn, district=district)
    sx, sy, sz, _ = WORKBENCH["garage_smasher_frame"]
    mx, my, mz, _ = WORKBENCH["garage_bd_monitor"]
    return {"garage_identity_poster": smasher_art(*at(sx, sy, sz), yaw),
            "garage_screen": monitor_screen(*at(mx, my, mz), yaw)}


# What of them stands in the way: the stool (its base and seat; the jacket
# is cloth over it), the cannon is on a bench (its box), the wall pieces
# are on the wall (their boxes, a hand's depth).
solid("garage_jacket_chair", (-0.31, 0.31, 0.0, 1.03, -0.31, 0.31))
