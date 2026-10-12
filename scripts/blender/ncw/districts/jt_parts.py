"""Japantown's own parts: signs at any angle, and the prototypes it hangs,
strings and stands by the thousand.

The kit's signs stand square to their walls. Japantown's do not (blades
stacked at angles up a facade, ax5YUmkWf_Y@111), so a sign here is a box and
two faces on a basis of its own: turned about the vertical, leaning in its
own plane, tipped forward. Everything that repeats is an instanced
prototype (props.py): paper lanterns, strings of them across a street,
festoons, cable bundles, stalls, the kit of a roof deck (rails, the lamps
with long arms, the viewer, planters: D6ia1wjO7sg@220), roof shacks,
laundry, scooters, plants. Sixteen bytes each, none of it in the pack.
"""
import math

from ncw.kit import *  # noqa: F401,F403
from ncw import kit as K
from ncw import props as P
from ncw.districts import jt_font as F

D = "japantown"
UP = (0.0, 1.0, 0.0)


# ---------------------------------------------------------------------------
# A basis: right, up, normal (normal = right x up). yaw 0 faces +z.
# ---------------------------------------------------------------------------
def basis(yaw, roll=0.0, pitch=0.0):
    """Turned `yaw` about the vertical, leaned `roll` in its own plane,
    tipped back `pitch` about its right."""
    N = (math.sin(yaw), 0.0, math.cos(yaw))
    R = (math.cos(yaw), 0.0, -math.sin(yaw))
    U = UP
    if roll:
        c, s = math.cos(roll), math.sin(roll)
        R, U = tuple(R[i] * c + U[i] * s for i in range(3)), tuple(U[i] * c - R[i] * s for i in range(3))
    if pitch:
        c, s = math.cos(pitch), math.sin(pitch)
        U, N = tuple(U[i] * c - N[i] * s for i in range(3)), tuple(N[i] * c + U[i] * s for i in range(3))
    return R, U, N


def pt(c, b, u, v, t=0.0):
    R, U, N = b
    return (c[0] + R[0] * u + U[0] * v + N[0] * t, c[1] + R[1] * u + U[1] * v + N[1] * t, c[2] + R[2] * u + U[2] * v + N[2] * t)


def obox(key, c, b, w, h, d, col=(1, 1, 1, 1), scale=1.0, bottom=True, rim=False, tube=False):
    """A box centred at c on basis b: w along its right, h up, d along its
    normal. `rim`: only the four faces round its edge (a sign's frame, whose
    front and back are the sign's own faces); `tube`: only the four along
    its width (an arm, a rib)."""
    hw, hh, hd = w / 2, h / 2, d / 2
    p = lambda u, v, t: pt(c, b, u * hw, v * hh, t * hd)  # noqa: E731
    s = 1.0 / scale
    faces = [(p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1), w, h),
             (p(1, -1, -1), p(-1, -1, -1), p(-1, 1, -1), p(1, 1, -1), w, h),
             (p(-1, -1, -1), p(-1, -1, 1), p(-1, 1, 1), p(-1, 1, -1), d, h),
             (p(1, -1, 1), p(1, -1, -1), p(1, 1, -1), p(1, 1, 1), d, h),
             (p(-1, 1, 1), p(1, 1, 1), p(1, 1, -1), p(-1, 1, -1), w, d)]
    if bottom:
        faces.append((p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1), w, d))
    if rim:
        faces = faces[2:5] + [(p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1), w, d)]
    elif tube:
        faces = faces[:2] + [faces[4], (p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1), w, d)]
    for a, bb, cc, dd, fw, fh in faces:
        quad(key, a, bb, cc, dd, ((0, 0), (fw * s, 0), (fw * s, fh * s), (0, fh * s)), col)


def sign_id(sid):
    """Enter a street sign in the kit's index (kit.sign's batch): the colour
    its faces carry. A sign painted on both sides is one entry, not two:
    the site paints every face of an entry with its design, and an entry is
    fourteen bytes of the core."""
    i = len(STREET_SIGN_IDS)
    STREET_SIGN_IDS.append(sid)
    return ((i % 256) / 255.0, ((i // 256) % 256) / 255.0, (i // 65536) / 255.0, 1.0)


# Which of the street's designs a sign shows. The site takes the number
# modulo its list for the size (src/data/world.js STREET_SIGNS and
# src/world/sign-words.js: 20 small blades, 22 medium, 16 large, 16 small
# panels, 16 panels, 28 boxes), so dealt in turn a name came round every
# sixteen boards. Here a design is dealt by where the sign hangs: the one
# whose word (at any size: SAME) last hangs furthest away. A panel's words
# are in capitals and read from far off, so a panel is hung only where its
# word has none of its own within LATIN_R; a blade's or a box's always.
DESIGNS = {"bs": 20, "bm": 22, "bl": 16, "ps": 16, "pm": 16, "bx": 28}
SAME = ((("ps", 15), ("pm", 9), ("bs", 11)), (("ps", 13), ("pm", 11), ("bs", 18), ("ps", 14)), (("ps", 9), ("pm", 10)), (("ps", 11), ("pm", 3), ("bl", 0)),
        (("ps", 8), ("pm", 0), ("bs", 19)), (("bm", 10), ("pm", 13), ("bl", 6)), (("bs", 5), ("ps", 2)), (("bs", 7), ("pm", 8), ("bm", 14)),
        (("ps", 3), ("bl", 5)), (("ps", 0), ("ps", 10), ("bs", 8), ("bs", 4)), (("ps", 6), ("bm", 5)), (("bm", 2), ("pm", 14)), (("bm", 21), ("pm", 15)),
        (("bm", 4), ("pm", 6)), (("ps", 12), ("bs", 6), ("bm", 13), ("bl", 13)), (("ps", 5), ("bm", 20)), (("ps", 4), ("bs", 17)))
_WORD = {m: g[0] for g in SAME for m in g}
_HUNG = {}
LATIN_R = 70.0


def design(size, c, need=None):
    """The design for a sign of `size` hung at c, or None where every word
    of that size already hangs within `need` metres."""
    need = (LATIN_R if size in ("ps", "pm") else 0.0) if need is None else need
    n = DESIGNS[size]
    h = int(abs(c[0] * 7.3 + c[1] * 3.1 + c[2] * 11.7))
    best, bd = 0, -1.0
    for j in range(n):
        i = (j + h) % n
        d = min(((q[0] - c[0]) ** 2 + (q[2] - c[2]) ** 2 for q in _HUNG.get(_WORD.get((size, i), (size, i)), ())), default=1e12)
        if d > bd:
            best, bd = i, d
    if bd < need * need:
        return None
    _HUNG.setdefault(_WORD.get((size, best), (size, best)), []).append((c[0], c[1], c[2]))
    return f"st_{size}_{best}"


def sign_face(col, c, b, w, h, t):
    """One face of a street sign on basis b, t along its normal: facing out
    along the normal for t > 0, back along it for t < 0."""
    if t >= 0:
        q = (pt(c, b, -w / 2, -h / 2, t), pt(c, b, w / 2, -h / 2, t), pt(c, b, w / 2, h / 2, t), pt(c, b, -w / 2, h / 2, t))
    else:
        q = (pt(c, b, w / 2, -h / 2, t), pt(c, b, -w / 2, -h / 2, t), pt(c, b, -w / 2, h / 2, t), pt(c, b, w / 2, h / 2, t))
    quad((D, "sign", 0), *q, col=col)


def slab_sign(c, b, size, k=1.0, both=True, depth=0.16, need=None):
    """A street sign of a standard size (scaled k) as a framed slab at c on
    basis b, painted on its front and, `both`, its back. A panel whose
    every word hangs near by already is not hung: (0, 0)."""
    w, h = ST_SIZES[size]
    w, h = w * k, h * k
    name = design(size, c, need)
    if name is None:
        return 0.0, 0.0
    if w * h > 3.0:
        obox((D, "board_frame", 1), c, b, w + 0.12, h + 0.14, depth, rim=True)
    col = sign_id(name)
    sign_face(col, c, b, w, h, depth / 2)
    if both:
        sign_face(col, c, b, w, h, -depth / 2)
    return w, h


def blade(f, s, y, size, tilt=0.0, k=1.0, roll=0.0, gap=0.3):
    """A blade standing out from face f, s metres from its left edge, its
    middle at y: turned `tilt` off the wall's normal (so it reads to one end
    of the street more than the other), leaning `roll`, both sides painted,
    an arm back to the wall."""
    w, h = ST_SIZES[size]
    w, h = w * k, h * k
    phi = f.yaw + tilt
    px, _, pz = f.p(f.at(s), y, 0.0)
    dx, dz = math.sin(phi), math.cos(phi)
    reach = gap + w / 2
    c = (px + dx * reach, y, pz + dz * reach)
    placed = slab_sign(c, basis(phi - math.pi / 2, roll), size, k)
    if not placed[0]:
        return 0.0, 0.0
    for dy in ((h / 2 + 0.1,) if h < 5.5 else (h / 2 + 0.1, -h / 2 - 0.1)):
        # (A strap, its two faces: the arm is read from along the street.)
        t = 0.1 if w * h > 3.0 else 0.07
        a0, a1 = (px, y + dy, pz), (px + dx * reach, y + dy, pz + dz * reach)
        for q in ((a0, a1, (a1[0], a1[1] + t, a1[2]), (a0[0], a0[1] + t, a0[2])), (a1, a0, (a0[0], a0[1] + t, a0[2]), (a1[0], a1[1] + t, a1[2]))):
            quad((D, "metal", 1), *q)
    return w, h


def board(f, s, y, size, tilt=0.0, k=1.0, roll=0.0, out=0.2, pitch=0.0):
    """A board on face f, hinged off it by `tilt` (one edge at the wall, the
    other swung out), leaning `roll`, tipped `pitch`."""
    w, h = ST_SIZES[size]
    w, h = w * k, h * k
    px, _, pz = f.p(f.at(s), y, out + abs(math.sin(tilt)) * w / 2 + abs(math.sin(pitch)) * h / 2)
    return slab_sign((px, y, pz), basis(f.yaw + tilt, roll, pitch), size, k, both=abs(tilt) > 0.3, depth=0.14)


def _stroke(key, c, b, p, q, thick, t, col):
    """One stroke of a character on basis b: a strip `thick` wide from p to
    q ((u, v) on the sign's face), t along its normal."""
    du, dv = q[0] - p[0], q[1] - p[1]
    ln = math.hypot(du, dv) or 1.0
    du, dv = du / ln, dv / ln
    e, nu, nv = thick * 0.35, -dv * thick / 2, du * thick / 2
    a0, a1 = (p[0] - du * e, p[1] - dv * e), (q[0] + du * e, q[1] + dv * e)
    quad(key, pt(c, b, a0[0] - nu, a0[1] - nv, t), pt(c, b, a1[0] - nu, a1[1] - nv, t), pt(c, b, a1[0] + nu, a1[1] + nv, t), pt(c, b, a0[0] + nu, a0[1] + nv, t), col=col)
    return a0, a1, nu, nv


def write(key, c, b, text, w, h, t, thick, col, vertical=False):
    """A word in strokes (jt_font) in a w x h box centred at c on basis b."""
    for p, q in F.segments(text, w, h, vertical):
        _stroke(key, c, b, p, q, thick, t, col)


def _burn(r, w, h):
    """The draws a tube sign's strokes took from its stream before its
    words were spelt (so what is built after it is as it was)."""
    n = max(2, min(4, int(w / (h * 0.75)))) if w >= h else 1
    rows = 1 if w >= h else max(2, min(5, int(h / (w * 0.9))))
    for _ in range(n * rows):
        for _ in range(r.randrange(2, 5)):
            r.random(), r.random(), r.random()


def worded(c, w, h):
    """A word for a tube sign w x h at c, and the box it is set in: kana
    down a tall one, kana or capitals across a wide one."""
    if h > w * 1.2:
        tw = w * 0.62
        text = F.pick(F.KANA, c, max(2, int(h * 0.86 / (tw * 1.05))), (2, 0))
        return text, tw, min(h * 0.86, len(text) * tw * 1.12), True
    th = h * 0.56
    kana = int(abs(c[0] * 3.0 + c[2] * 5.0)) % 5 < 2
    text = F.pick(F.KANA if kana else F.LATIN, c, max(2, int(w * 0.84 / (th * (1.0 if kana else 0.8)))), (3, 0))
    return text, min(w * 0.84, len(text) * th * (1.05 if kana else 0.82)), th, False


def tube_sign(c, yaw, w, h, colour, r, both=True, roll=0.0):
    """A sign of bent tube on a dark board: a border and a word, drawn in
    `glow` (light the bake leaves out, so it can stand anywhere)."""
    b = basis(yaw, roll)
    obox((D, "board_frame", 0), c, b, w + 0.3, h + 0.3, 0.2)
    col = GLOW[colour]
    _burn(r, w, h)
    text, tw, th, vertical = worded(c, w, h)
    thick = max(0.07, min(w, h) * 0.055)
    edge = [((-w / 2, h / 2 - 0.05), (w / 2, h / 2 - 0.05)), ((-w / 2, -h / 2 + 0.05), (w / 2, -h / 2 + 0.05)),
            ((-w / 2 + 0.05, -h / 2), (-w / 2 + 0.05, h / 2)), ((w / 2 - 0.05, -h / 2), (w / 2 - 0.05, h / 2))]
    for bb in ((b, basis(yaw + math.pi, -roll)) if both else (b,)):
        for p_, q_ in edge:
            _stroke((D, "glow", 0), c, bb, p_, q_, 0.1, 0.11, col)
        write((D, "glow", 0), c, bb, text, tw, th, 0.112, thick, col, vertical)


def letters(c, b, text, h, colour, depth=0.24, vertical=False, both=False):
    """Standing letters, each stroke a bar `depth` deep cut from sheet: its
    face lit in `colour`, its returns dark (detail). One character is h
    high; the word runs across from its middle at c, or down. Returns the
    word's width and height."""
    kana = text[0] in F.GLYPHS and not text[0].isascii()
    n = len(text)
    cw = h * (1.12 if kana else 0.9)
    w, hh = (cw, h * 1.14 * n) if vertical else (cw * n, h)
    thick = h * 0.12
    for p, q in F.segments(text, w, hh, vertical, gap=0.2):
        a0, a1, nu, nv = _stroke((D, "neon_" + colour, 0), c, b, p, q, thick, depth / 2, (1, 1, 1, 1))
        ring = [(a0[0] - nu, a0[1] - nv), (a1[0] - nu, a1[1] - nv), (a1[0] + nu, a1[1] + nv), (a0[0] + nu, a0[1] + nv)]
        for (ua, va), (ub, vb) in zip(ring, ring[1:] + ring[:1]):
            quad((D, "trim", 1), pt(c, b, ua, va, -depth / 2), pt(c, b, ub, vb, -depth / 2), pt(c, b, ub, vb, depth / 2), pt(c, b, ua, va, depth / 2), col=STEEL_D)
        if both:
            quad((D, "trim", 1), pt(c, b, ring[1][0], ring[1][1], -depth / 2), pt(c, b, ring[0][0], ring[0][1], -depth / 2), pt(c, b, ring[3][0], ring[3][1], -depth / 2),
                 pt(c, b, ring[2][0], ring[2][1], -depth / 2), col=STEEL_D)
    return w, hh


def gquad(key, pts, cols):
    """A quad whose corners each have their own colour (light falling off
    across a wall)."""
    bt = batches[key]
    base = len(bt.verts)
    bt.verts.extend(K.P(*q) for q in pts)
    bt.faces.append(tuple(range(base, base + len(pts))))
    bt.uvs.extend([(0, 0)] * len(pts))
    bt.cols.extend(cols)


DECK_TEAL = (0.007, 0.016, 0.02, 1)


def pool(x, y, z, r, centre=(0.22, 0.5, 0.56, 1), rim=DECK_TEAL, segs=12):
    """A lamp's light on a deck, painted where it falls (a roof is too high
    for the bake's pools to reach it at their strength): brightest under
    the head, gone into the deck's own tone by its edge."""
    b = batches[(D, "glow", 0)]
    for i in range(segs):
        t0, t1 = i * math.tau / segs, (i + 1) * math.tau / segs
        base = len(b.verts)
        b.verts.extend(K.P(*q) for q in ((x, y, z), (x + r * math.cos(t1), y, z + r * math.sin(t1)), (x + r * math.cos(t0), y, z + r * math.sin(t0))))
        b.faces.append((base, base + 1, base + 2))
        b.uvs.extend(((0.5, 0.5), (1, 0), (0, 0)))
        b.cols.extend((centre, rim, rim))


WATER, WATER_RIM = (0.021, 0.052, 0.063, 1), (0.013, 0.031, 0.039, 1)


def puddle(x, y, z, r, rs):
    """Standing water on a deck: more of the sky's glow in it than the
    slabs hold, most in its middle, its shore a slow curve."""
    b = batches[(D, "glow", 1)]
    segs, yaw, sq = 14, rs.uniform(0.0, 3.14), rs.uniform(0.45, 0.8)
    p1, p2 = rs.uniform(0.0, 6.28), rs.uniform(0.0, 6.28)
    rim = []
    for i in range(segs):
        t = i * math.tau / segs
        rr = r * (1.0 + 0.2 * math.sin(2 * t + p1) + 0.1 * math.sin(3 * t + p2))
        px, pz = rr * math.cos(t), rr * sq * math.sin(t)
        rim.append((x + px * math.cos(yaw) + pz * math.sin(yaw), y, z - px * math.sin(yaw) + pz * math.cos(yaw)))
    for i in range(segs):
        base = len(b.verts)
        b.verts.extend(K.P(*q) for q in ((x, y, z), rim[(i + 1) % segs], rim[i]))
        b.faces.append((base, base + 1, base + 2))
        b.uvs.extend(((0.5, 0.5), (1, 0), (0, 0)))
        b.cols.extend((WATER, WATER_RIM, WATER_RIM))


# ---------------------------------------------------------------------------
# Placing: rows along a face, spans between two points.
# ---------------------------------------------------------------------------
def put(name, x, y, z, yaw=0.0, sy=1.0, sxz=1.0):
    P.place(name, x, y, z, yaw, sy, sxz, district=D)


def lantern_row(f, s0, s1, y, out, step, name="lantern", sy=1.0, sxz=1.0):
    """Lanterns in a row along a face, on the rod they hang from and its
    two brackets back to the wall."""
    s = s0 + step / 2
    while s < s1:
        x, _, z = f.p(f.at(s), y, out)
        put(name, x, y, z, 0.0, sy, sxz)
        s += step
    yr = y + 0.31 * sy
    k = (D, "metal", 1)
    f.quad(k, s0, s1, yr, yr + 0.04, out)
    a, b = f.at(s0), f.at(s1)
    quad(k, f.p(a, yr, out), f.p(b, yr, out), f.p(b, yr, out - 0.04), f.p(a, yr, out - 0.04))
    for e in (a, b):
        p0, p1 = f.p(e, yr, 0.0), f.p(e, yr, out)
        quad(k, p0, p1, (p1[0], yr + 0.04, p1[2]), (p0[0], yr + 0.04, p0[2]))
        quad(k, p1, p0, (p0[0], yr + 0.04, p0[2]), (p1[0], yr + 0.04, p1[2]))


def span(name, a, b, y, drop=1.0, unit=10.0):
    """A string (a 10 m prototype along its own x) from a to b, (x, z) each,
    hung at y: stretched to the span, its sag and what hangs on it by
    `drop`."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dz)
    if name == "jt_festoon" and length > 13.0:
        name = "jt_festoon_l"      # (small bulbs: stretched this far the short one's are lanterns)
    put(name, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, math.atan2(-dz, dx), drop, length / unit)


def string(a, b, y, drop=1.0, step=1.5, k=1.0):
    """A string of lanterns from a to b ((x, z) each), hung at y: the line
    (stretched to the span, sagging 0.6 m by `drop`) and the kit's lantern
    every `step` along it, each scaled k. The site deals a string its shape
    and colours from where it hangs, so no two near each other match."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dz)
    put("jt_line", (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, math.atan2(-dz, dx), drop, length / 10.0)
    n = max(2, round(length / step))
    for i in range(n):
        t = (i + 0.5) / n
        put("lantern", a[0] + dx * t, y - 0.6 * drop * math.sin(math.pi * t) - 0.33 * k, a[1] + dz * t, 0.0, k, k)


def rail_run(a, b, y):
    """Rails (2 m units) from a to b along the roof's edge."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dz)
    n = max(1, round(length / 3.0))
    k = length / (2.0 * n)
    yaw = math.atan2(-dz, dx)
    for i in range(n):
        t = (i + 0.5) / n
        put("jt_rail", a[0] + dx * t, y, a[1] + dz * t, yaw, 1.0, k)


# ---------------------------------------------------------------------------
# The prototypes. Each at the origin, its front toward +z.
# ---------------------------------------------------------------------------
def barrel(key, cx, cz, y0, y1, r, segs=5, pinch=0.62, caps="b"):
    """A paper lantern's body: two rings of faces, widest at the middle. Its
    v runs 0 to 0.28 up it, which is what the lantern's shader reads (dark
    at its two ends, so its caps, at v 0, are its dark hoops)."""
    rings = ((y0, r * pinch, 0.0), ((y0 + y1) / 2, r, 0.14), (y1, r * pinch, 0.28))
    for (ya, ra, va), (yb, rb, vb) in zip(rings, rings[1:]):
        for i in range(segs):
            t0, t1 = i * math.tau / segs, (i + 1) * math.tau / segs
            a = (cx + ra * math.cos(t0), ya, cz + ra * math.sin(t0))
            b = (cx + ra * math.cos(t1), ya, cz + ra * math.sin(t1))
            c = (cx + rb * math.cos(t1), yb, cz + rb * math.sin(t1))
            d = (cx + rb * math.cos(t0), yb, cz + rb * math.sin(t0))
            quad(key, b, a, d, c, ((1, va), (0, va), (0, vb), (1, vb)))
    ring = [(cx + r * pinch * math.cos(i * math.tau / segs), cz + r * pinch * math.sin(i * math.tau / segs)) for i in range(segs)]
    if "t" in caps:
        poly(key, [(x, y1, z) for x, z in reversed(ring)], [(0, 0)] * segs)
    if "b" in caps:
        poly(key, [(x, y0, z) for x, z in ring], [(0, 0)] * segs)


def _line(key, length, sag, segs, r=0.018, z=0.0, col=(1, 1, 1, 1)):
    pts = [(-length / 2 + length * i / segs, -sag * math.sin(math.pi * i / segs)) for i in range(segs + 1)]
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        pipe(key, (xa, ya, z), (xb, yb, z), r, segs=3, col=col)


@P.proto("jt_line", box=(5.0, 0.1, 0.1), reach=260, detail=True)
def _jt_line(k):
    """Ten metres of the line a string of lanterns hangs on (the lanterns
    are the kit's, set along it: `string`)."""
    _line(k("dark"), 10.0, 0.6, 8, r=0.02)


WIRE = (0.016, 0.013, 0.01, 1)
BULBS = ((1.0, 0.62, 0.3, 1), (1.0, 0.8, 0.55, 1), (1.0, 0.62, 0.3, 1), (0.95, 0.9, 0.8, 1), (1.0, 0.5, 0.22, 1), (0.03, 0.02, 0.012, 1), (1.0, 0.8, 0.55, 1))


def _festoon(k, n, r_, sag):
    """Bulbs on a wire that is seen (it catches their light): warm and
    white ones, one dead."""
    G = k("glow")
    _line(G, 10.0, sag, 8, r=r_ * 0.22, col=WIRE)
    for j in range(n):
        t = (j + 0.5) / n
        y = -sag * math.sin(math.pi * t) - r_ * 0.4
        cylinder(G, -5.0 + 10.0 * t, 0.0, y - r_ * 2.1, y, r_, segs=4, cap=False, col=BULBS[j % len(BULBS)])


@P.proto("jt_festoon", box=(5.0, 0.1, 0.1), reach=360)
def _jt_festoon(k):
    """Ten metres of festoon: a dozen bulbs on a wire that sags (for a
    shopfront, an alley, a roof: spans up to 13 m)."""
    _festoon(k, 12, 0.06, 0.7)


@P.proto("jt_festoon_l", box=(5.0, 0.1, 0.1), reach=360)
def _jt_festoon_l(k):
    """The same for a long span (a street, a deck from lamp to lamp): it is
    stretched two or three times, so its bulbs are drawn that much smaller
    and closer."""
    _festoon(k, 26, 0.03, 0.7)


@P.proto("jt_cable", box=(5.0, 0.1, 0.1), reach=220, detail=True)
def _jt_cable(k):
    """Ten metres of cables, two slung together, each with its own sag."""
    _line(k("dark"), 10.0, 0.5, 5, r=0.03)
    _line(k("dark"), 10.0, 1.1, 5, r=0.024, z=0.1)


WOOD = (0.2, 0.12, 0.07, 1)
WOOD_PALE = (0.3, 0.2, 0.12, 1)
RED = (0.5, 0.06, 0.05, 1)
INDIGO = (0.06, 0.08, 0.2, 1)
CLOTH = ((0.5, 0.06, 0.05, 1), (0.06, 0.08, 0.2, 1), (0.7, 0.66, 0.58, 1), (0.55, 0.3, 0.06, 1), (0.08, 0.3, 0.26, 1), (0.45, 0.1, 0.3, 1))
GREY = (0.2, 0.2, 0.22, 1)
GREEN = (0.1, 0.26, 0.13, 1)
GREEN_D = (0.07, 0.17, 0.1, 1)


def _roof_cloth(T, x0, x1, z_front, z_back, y_front, y_back, top, under):
    """A sloped cloth roof: its top and its underside."""
    a, b, c, d = (x0, y_front, z_front), (x1, y_front, z_front), (x1, y_back, z_back), (x0, y_back, z_back)
    quad(T, a, b, c, d, col=top)
    quad(T, b, a, d, c, col=under)


@P.proto("jt_stall", box=(1.2, 1.3, 0.8), reach=320)
def _jt_stall(k):
    """A food stall: a counter under a red cloth roof, its lamp, a lantern
    at each front corner, the cook's back board."""
    T = k("trim")
    box(T, -1.2, 1.2, 0.0, 0.95, 0.3, 0.75, scale=1.0, col=WOOD)
    box(T, -1.26, 1.26, 0.95, 1.0, 0.2, 0.85, scale=1.0, col=WOOD_PALE)
    for x in (-1.16, 1.16):
        for z in (-0.74, 0.76):
            box(T, x - 0.04, x + 0.04, 0.0, 2.25, z - 0.04, z + 0.04, scale=1.0, col=WOOD)
    box(T, -1.2, 1.2, 0.0, 1.95, -0.8, -0.74, scale=1.0, col=(0.11, 0.09, 0.08, 1))
    box(T, -1.1, 1.1, 0.7, 0.76, -0.74, -0.3, scale=1.0, col=GREY)
    _roof_cloth(T, -1.42, 1.42, 1.15, -0.95, 2.2, 2.62, RED, (0.62, 0.13, 0.1, 1))
    box(T, -1.42, 1.42, 1.95, 2.2, 1.13, 1.16, scale=1.0, col=RED, bottom=True)
    box(k("neon_amber"), -0.9, 0.9, 2.1, 2.16, 0.25, 0.33, scale=1.0, bottom=True)
    for x in (-1.3, 1.3):
        barrel(k("neon_amber"), x, 1.05, 1.5, 1.92, 0.15)
    # What it sells, in trays along the counter; a pot on the hob behind;
    # its menu, lit, on the back board.
    for i, col in enumerate(((0.55, 0.2, 0.08, 1), (0.6, 0.5, 0.2, 1), (0.2, 0.4, 0.12, 1), (0.55, 0.5, 0.45, 1), (0.5, 0.1, 0.1, 1))):
        x = -1.0 + i * 0.43
        box(T, x, x + 0.34, 1.0, 1.05, 0.34, 0.66, scale=1.0, col=(0.07, 0.07, 0.08, 1))
        box(T, x + 0.03, x + 0.31, 1.05, 1.09 + 0.03 * (i % 2), 0.37, 0.63, scale=1.0, col=col)
    cylinder(T, 0.75, -0.5, 0.76, 1.1, 0.2, segs=6, col=(0.3, 0.3, 0.31, 1))
    P.face(k, P.FOOD, 0.0, 1.5, -0.735, 1.5, 0.7, 0.0, GLOW["amber"])


@P.proto("jt_cart", box=(0.9, 1.2, 0.6), reach=320)
def _jt_cart(k):
    """A cart under a striped parasol: a box on wheels, a griddle, a lamp."""
    T = k("trim")
    box(T, -0.9, 0.9, 0.35, 1.0, -0.45, 0.45, scale=1.0, col=(0.1, 0.24, 0.24, 1), bottom=True)
    box(T, -0.95, 0.95, 1.0, 1.05, -0.5, 0.5, scale=1.0, col=GREY)
    for x in (-0.65, 0.65):
        box(T, x - 0.22, x + 0.22, 0.0, 0.44, 0.44, 0.5, scale=1.0, col=(0.03, 0.03, 0.035, 1))
        box(T, x - 0.22, x + 0.22, 0.0, 0.44, -0.5, -0.44, scale=1.0, col=(0.03, 0.03, 0.035, 1))
    box(T, -0.03, 0.03, 1.05, 2.5, -0.03, 0.03, scale=1.0, col=GREY)
    for i in range(8):
        t0, t1 = i * math.tau / 8, (i + 1) * math.tau / 8
        a = (1.45 * math.cos(t0), 2.25, 1.45 * math.sin(t0))
        b = (1.45 * math.cos(t1), 2.25, 1.45 * math.sin(t1))
        col = (0.72, 0.62, 0.2, 1) if i % 2 else (0.7, 0.68, 0.62, 1)
        poly(T, [(0.0, 2.62, 0.0), b, a], [(0.5, 1), (1, 0), (0, 0)], col)
        poly(T, [(0.0, 2.62, 0.0), a, b], [(0.5, 1), (0, 0), (1, 0)], tuple(v * 0.7 for v in col[:3]) + (1,))
    box(T, -0.5, 0.5, 2.1, 2.15, -0.04, 0.04, scale=1.0, col=(0.9, 0.7, 0.4, 1), bottom=True)


def _shack(k, walls, tin, patch, tarp, window):
    T = k("trim")
    box(T, -1.7, 1.7, 0.0, 2.3, -1.3, 1.3, scale=1.0, col=walls)
    quad(T, (-1.95, 2.25, 1.75), (1.95, 2.25, 1.75), (1.95, 2.7, -1.5), (-1.95, 2.7, -1.5), col=tin)
    quad(T, (1.95, 2.25, 1.75), (-1.95, 2.25, 1.75), (-1.95, 2.7, -1.5), (1.95, 2.7, -1.5), col=(0.1, 0.11, 0.12, 1))
    # A sheet laid over a leak, and a tarp off one side on two poles.
    quad(T, (-1.6, 2.33, 1.2), (-0.3, 2.33, 1.2), (-0.3, 2.5, -0.1), (-1.6, 2.5, -0.1), col=patch)
    tp = ((1.95, 2.2, 1.3), (3.5, 1.85, 1.3), (3.5, 1.85, -1.1), (1.95, 2.2, -1.1))
    quad(T, *tp, col=tarp)
    quad(T, tp[1], tp[0], tp[3], tp[2], col=tuple(v * 0.5 for v in tarp[:3]) + (1,))
    for z in (1.25, -1.05):
        box(T, 3.42, 3.48, 0.0, 1.86, z - 0.03, z + 0.03, scale=1.0, col=GREY)
    cylinder(T, -1.2, -0.8, 2.5, 3.3, 0.09, segs=5, col=GREY)
    G = k("glow")
    quad(G, (0.3, 1.0, 1.31), (1.4, 1.0, 1.31), (1.4, 1.9, 1.31), (0.3, 1.9, 1.31), col=window)
    quad(G, (1.71, 1.1, 0.6), (1.71, 1.1, -0.4), (1.71, 1.8, -0.4), (1.71, 1.8, 0.6), col=(0.25, 0.5, 0.9, 1))
    quad(T, (-1.3, 0.0, 1.31), (-0.4, 0.0, 1.31), (-0.4, 2.0, 1.31), (-1.3, 2.0, 1.31), col=(0.2, 0.09, 0.06, 1))


@P.proto("jt_shack", box=(1.7, 1.2, 1.3), reach=520)
def _jt_shack(k):
    """A shack somebody built on a roof: boarded walls, a rusted tin roof
    with an overhang and a sheet laid over its leak, a blue tarp off one
    side, a lit window and a door."""
    _shack(k, (0.16, 0.18, 0.18, 1), (0.36, 0.16, 0.08, 1), (0.5, 0.5, 0.48, 1), (0.07, 0.2, 0.5, 1), GLOW["amber"])


@P.proto("jt_shack_b", box=(1.7, 1.2, 1.3), reach=520)
def _jt_shack_b(k):
    """Another: pale green boards under grey sheet, a patch of rust, an
    orange tarp, a television's light in its window."""
    _shack(k, (0.17, 0.26, 0.2, 1), (0.44, 0.45, 0.47, 1), (0.34, 0.15, 0.08, 1), (0.6, 0.3, 0.06, 1), (0.45, 0.75, 1.0, 1))


@P.proto("jt_rail", box=(1.0, 0.55, 0.06), reach=220, detail=True)
def _jt_rail(k):
    """Two metres of roof rail: a thick square post and two rails
    (qgx_AjoPTT0@5)."""
    M = k("metal")
    box(M, -1.06, -0.94, 0.0, 1.15, -0.06, 0.06, scale=0.5)
    for y in (0.55, 1.02):
        for q in (((-1.0, y, 0.0), (1.0, y, 0.0), (1.0, y + 0.08, 0.0), (-1.0, y + 0.08, 0.0)), ((1.0, y, 0.0), (-1.0, y, 0.0), (-1.0, y + 0.08, 0.0), (1.0, y + 0.08, 0.0)),
                  ((-1.0, y + 0.08, 0.03), (1.0, y + 0.08, 0.03), (1.0, y + 0.08, -0.03), (-1.0, y + 0.08, -0.03))):
            quad(M, *q)


@P.proto("jt_lamp_arm", box=(0.2, 2.5, 1.2), reach=460)
def _jt_lamp_arm(k):
    """A roof lamp (D6ia1wjO7sg@220): a galvanised square post on a bolted
    foot, a long arm (toward +z) with a stay under it, a head whose lens
    hangs under it throwing its light straight down, and that light in the
    air. The post and the arm's underside take the lamp's light (painted on
    as glow, brightest by the head), so against the sky it is a lamp on its
    post and not a head in the air."""
    T, G = k("trim"), k("glow")
    col = (0.2, 0.22, 0.24, 1)
    box(T, -0.2, 0.2, 0.0, 0.07, -0.2, 0.2, scale=1.0, col=col)
    box(T, -0.075, 0.075, 0.07, 4.9, -0.075, 0.075, scale=1.0, col=col)
    box(T, -0.05, 0.05, 4.8, 4.9, -0.075, 2.3, scale=1.0, col=col, bottom=True)
    stay = ((0.0, 3.9, 0.075), (0.0, 4.8, 1.15), (0.0, 4.86, 1.15), (0.0, 3.98, 0.075))
    quad(T, *stay, col=col)
    quad(T, stay[1], stay[0], stay[3], stay[2], col=col)
    box(T, -0.17, 0.17, 4.7, 4.82, 1.5, 2.5, scale=1.0, col=(0.1, 0.11, 0.12, 1))
    box(G, -0.13, 0.13, 4.65, 4.7, 1.58, 2.42, scale=1.0, col=(0.55, 0.95, 1.0, 1), bottom=True)
    for y0, y1, c in ((3.5, 4.8, (0.021, 0.052, 0.06)), (2.0, 3.5, (0.011, 0.028, 0.033)), (0.07, 2.0, (0.006, 0.014, 0.017))):
        for (ax, az), (bx, bz), f in (((-0.077, 0.077), (0.077, 0.077), 1.0), ((0.077, 0.077), (0.077, -0.077), 0.5), ((-0.077, -0.077), (-0.077, 0.077), 0.5),
                                      ((0.077, -0.077), (-0.077, -0.077), 0.3)):
            quad(G, (ax, y0, az), (bx, y0, bz), (bx, y1, bz), (ax, y1, az), col=(c[0] * f, c[1] * f, c[2] * f, 1))
    quad(G, (-0.05, 4.797, 0.08), (0.05, 4.797, 0.08), (0.05, 4.797, 1.5), (-0.05, 4.797, 1.5), col=(0.02, 0.05, 0.058, 1))
    P.lamp_air(k, 4.65, 2.0, 4.4, (0.4, 0.85, 1.0))


@P.proto("jt_chairs", box=(1.1, 0.45, 0.4), reach=200)
def _jt_chairs(k):
    """Two folding chairs either side of an upturned crate, bottles on it
    (the seats are at x -0.8 and 0.8, 0.46 up, turned to the crate)."""
    T = k("trim")
    box(T, -0.28, 0.28, 0.0, 0.42, -0.24, 0.24, scale=1.0, col=(0.2, 0.15, 0.06, 1))
    for x, z, h, col in ((-0.1, 0.05, 0.26, (0.05, 0.2, 0.1, 1)), (0.08, -0.08, 0.22, (0.3, 0.16, 0.04, 1)), (0.14, 0.1, 0.12, (0.5, 0.5, 0.48, 1))):
        box(T, x - 0.035, x + 0.035, 0.42, 0.42 + h, z - 0.035, z + 0.035, scale=1.0, col=col)
    for sd in (-1, 1):
        x = 0.8 * sd
        box(T, x - 0.22, x + 0.22, 0.43, 0.46, -0.22, 0.22, scale=1.0, col=(0.3, 0.05, 0.05, 1) if sd < 0 else (0.06, 0.1, 0.24, 1), bottom=True)
        xb = x + 0.22 * sd
        for q in (((xb, 0.46, -0.22), (xb, 0.46, 0.22), (xb + 0.06 * sd, 0.95, 0.22), (xb + 0.06 * sd, 0.95, -0.22)),):
            quad(T, *q, col=GREY)
            quad(T, q[1], q[0], q[3], q[2], col=GREY)
        for z in (-0.21, 0.21):
            for xa_, xb_ in ((x - 0.2, x + 0.2), (x + 0.2, x - 0.2)):
                q = ((xa_ - 0.015, 0.0, z), (xa_ + 0.015, 0.0, z), (xb_ + 0.015, 0.44, z), (xb_ - 0.015, 0.44, z))
                quad(T, *q, col=GREY)
                quad(T, q[1], q[0], q[3], q[2], col=GREY)


@P.proto("jt_scope", box=(0.3, 0.8, 0.45), reach=220, detail=True)
def _jt_scope(k):
    """A coin telescope at the rail (D6ia1wjO7sg@221), looking out along
    +z: a cast foot and a tapering column, a yoke, two barrels side by side
    tipped down at the street with their dark hoods and eyepieces, a coin
    box with its slot lit, a step for a child. Enamelled blue-grey, the
    tops of the barrels holding the deck lamps' light."""
    T, G = k("trim"), k("glow")
    enamel, dark = (0.15, 0.21, 0.25, 1), (0.03, 0.034, 0.042, 1)
    flat = basis(0.0)
    cylinder(T, 0.0, 0.0, 0.0, 0.08, 0.24, segs=8, col=dark)
    P.lathe(T, 0.0, 0.0, ((0.08, 0.11), (0.9, 0.075), (1.14, 0.075)), segs=6, col=enamel, cap=False)
    obox(T, (0.0, 1.19, 0.0), flat, 0.46, 0.1, 0.16, col=dark)
    obox(T, (0.0, 0.92, -0.15), flat, 0.17, 0.26, 0.13, col=dark)
    obox(T, (0.0, 0.11, -0.45), flat, 0.5, 0.22, 0.3, col=dark)
    quad(G, (0.04, 0.958, -0.218), (-0.04, 0.958, -0.218), (-0.04, 0.982, -0.218), (0.04, 0.982, -0.218), col=GLOW["amber"])
    b = basis(0.0, 0.0, -0.2)
    c = (0.0, 1.4, 0.0)
    for du in (-0.125, 0.125):
        obox(T, pt(c, b, du, 0.0, 0.04), b, 0.21, 0.23, 0.64, col=enamel, bottom=True)
        obox(T, pt(c, b, du, 0.0, 0.39), b, 0.25, 0.27, 0.07, col=dark, bottom=True)
        obox(T, pt(c, b, du, 0.02, -0.33), b, 0.1, 0.1, 0.1, col=dark, bottom=True)
        quad(G, pt(c, b, du - 0.09, 0.117, 0.34), pt(c, b, du + 0.09, 0.117, 0.34), pt(c, b, du + 0.09, 0.117, -0.26), pt(c, b, du - 0.09, 0.117, -0.26), col=(0.012, 0.03, 0.036, 1))


def viewer(x, y, z, yaw):
    put("jt_scope", x, y, z, yaw)


LEAF = (0.09, 0.3, 0.13, 1)
LEAF_D = (0.045, 0.19, 0.095, 1)
LEAF_Y = (0.2, 0.33, 0.1, 1)


@P.proto("jt_planter", box=(0.6, 0.5, 0.6), reach=300, detail=True)
def _jt_planter(k):
    """A square planter of cast stone, a shrub in it: a mound of leaves and
    three sprays over it (the kit's leaf pads)."""
    T, L = k("trim"), k("plant")
    box(T, -0.58, 0.58, 0.0, 0.5, -0.58, 0.58, scale=1.0, col=(0.14, 0.145, 0.155, 1))
    box(T, -0.64, 0.64, 0.5, 0.58, -0.64, 0.64, scale=1.0, col=(0.27, 0.27, 0.28, 1), bottom=True)
    for cx, cy, cz, r_, col in ((0.0, 0.66, 0.0, 0.66, LEAF_D), (0.22, 0.9, -0.14, 0.44, LEAF), (-0.24, 1.02, 0.18, 0.38, LEAF_D), (0.04, 1.24, 0.06, 0.3, LEAF_Y)):
        P.pad(L, cx, cy, cz, r_, col)


@P.proto("jt_laundry", box=(2.0, 1.1, 0.1), reach=260, detail=True)
def _jt_laundry(k):
    """A washing line between two poles, the day's washing on it."""
    T = k("trim")
    for x in (-2.0, 2.0):
        box(T, x - 0.03, x + 0.03, 0.0, 2.2, -0.03, 0.03, scale=1.0, col=GREY)
    box(T, -2.0, 2.0, 2.1, 2.12, -0.01, 0.01, scale=1.0, col=GREY, bottom=True)
    x = -1.8
    for i, (w, h) in enumerate(((0.6, 0.8), (0.45, 0.6), (0.7, 1.0), (0.5, 0.7), (0.6, 0.55), (0.4, 0.9))):
        col = CLOTH[(i * 5 + 2) % len(CLOTH)]
        quad(T, (x, 2.1 - h, 0.0), (x + w, 2.1 - h, 0.0), (x + w, 2.1, 0.0), (x, 2.1, 0.0), col=col)
        quad(T, (x + w, 2.1 - h, 0.0), (x, 2.1 - h, 0.0), (x, 2.1, 0.0), (x + w, 2.1, 0.0), col=col)
        x += w + 0.06


@P.proto("jt_scooter", box=(0.3, 0.55, 0.9), reach=220, detail=True)
def _jt_scooter(k):
    """A scooter on its stand, its length along z."""
    T = k("trim")
    tyre = (0.03, 0.03, 0.035, 1)
    for z in (-0.62, 0.62):
        box(T, -0.06, 0.06, 0.0, 0.46, z - 0.23, z + 0.23, scale=1.0, col=tyre)
    box(T, -0.18, 0.18, 0.28, 0.62, -0.5, 0.35, scale=1.0, col=(0.38, 0.08, 0.07, 1), bottom=True)
    box(T, -0.16, 0.16, 0.62, 0.74, -0.55, 0.1, scale=1.0, col=(0.05, 0.05, 0.06, 1))
    box(T, -0.14, 0.14, 0.3, 1.0, 0.36, 0.52, scale=1.0, col=(0.38, 0.08, 0.07, 1))
    box(T, -0.3, 0.3, 1.0, 1.05, 0.4, 0.46, scale=1.0, col=tyre, bottom=True)
    box(T, -0.08, 0.08, 0.6, 0.66, -0.58, -0.55, scale=1.0, col=(0.9, 0.1, 0.08, 1))


@P.proto("jt_plants", box=(0.5, 0.4, 0.3), reach=180, detail=True)
def _jt_plants(k):
    """Pots by a door: three of them in dark glaze, earth to their rims, a
    mound of leaves in one, a taller shrub in the next, a spray of blades
    in the small one (the kit's leaf pads and fronds)."""
    T, L = k("trim"), k("plant")
    for x, z, r_, h, col in ((-0.32, 0.0, 0.16, 0.3, (0.07, 0.035, 0.025, 1)), (0.18, 0.06, 0.2, 0.38, (0.025, 0.04, 0.06, 1)), (-0.04, -0.22, 0.12, 0.22, (0.05, 0.05, 0.045, 1))):
        P.lathe(T, x, z, ((0.0, r_ * 0.72), (h * 0.8, r_), (h, r_ * 0.9)), segs=6, col=col, cap=False)
        _wetless_disc(T, h - 0.025, r_ * 0.86, (0.025, 0.018, 0.013, 1), x, z, 6)
    P.pad(L, -0.32, 0.36, 0.0, 0.27, LEAF)
    P.pad(L, -0.36, 0.5, 0.04, 0.17, LEAF_Y)
    P.pad(L, 0.18, 0.46, 0.06, 0.31, LEAF_D)
    P.pad(L, 0.21, 0.7, 0.02, 0.23, LEAF)
    P.pad(L, 0.14, 0.9, 0.08, 0.15, LEAF_D)
    for i in range(5):
        P.frond(L, (-0.04, 0.22, -0.22), i * 1.26 + 0.3, 1.25 - 0.12 * (i % 2), 0.5, 0.9, 0.09, LEAF, segs=2, vee=False)


@P.proto("jt_aframe", box=(0.3, 0.5, 0.3), reach=180, detail=True)
def _jt_aframe(k):
    """A menu board standing on the pavement, both faces chalked."""
    T = k("trim")
    for sd in (1, -1):
        b = basis(0.0 if sd > 0 else math.pi, 0.0, 0.22)
        obox(T, (0.0, 0.5, 0.14 * sd), b, 0.6, 1.0, 0.03, col=(0.05, 0.05, 0.055, 1), bottom=False)
        for i, (w, col) in enumerate(((0.4, (0.75, 0.7, 0.6, 1)), (0.3, (0.7, 0.25, 0.3, 1)), (0.36, (0.75, 0.7, 0.6, 1)), (0.22, (0.3, 0.6, 0.55, 1)))):
            q = [pt((0.0, 0.5, 0.14 * sd), b, u, v, 0.02) for u, v in ((-w / 2, 0.28 - i * 0.2), (w / 2, 0.28 - i * 0.2), (w / 2, 0.36 - i * 0.2), (-w / 2, 0.36 - i * 0.2))]
            quad(T, *q, col=col)


@P.proto("jt_stools", box=(0.6, 0.25, 0.5), reach=180)
def _jt_stools(k):
    """Three stools and an upturned crate for a table."""
    T = k("trim")
    box(T, -0.3, 0.3, 0.0, 0.5, -0.22, 0.22, scale=1.0, col=(0.2, 0.15, 0.06, 1))
    box(T, -0.34, 0.34, 0.5, 0.53, -0.26, 0.26, scale=1.0, col=(0.26, 0.2, 0.1, 1))
    for (x, z, col) in ((-0.65, 0.3, (0.05, 0.09, 0.2, 1)), (0.7, 0.2, (0.22, 0.05, 0.05, 1)), (0.1, -0.6, (0.05, 0.09, 0.2, 1))):
        cylinder(T, x, z, 0.36, 0.44, 0.16, segs=6, col=col)
        box(T, x - 0.04, x + 0.04, 0.0, 0.36, z - 0.04, z + 0.04, scale=1.0, col=GREY)


@P.proto("jt_pole", box=(0.15, 4.5, 0.15), reach=600)
def _jt_pole(k):
    """A concrete utility pole: two crossarms, a transformer can, a lamp on
    a short arm toward the road (+z)."""
    T = k("trim")
    cylinder(T, 0.0, 0.0, 0.0, 9.2, 0.13, segs=6, col=(0.24, 0.24, 0.25, 1))
    for y, w in ((8.6, 1.2), (7.9, 0.9)):
        box(T, -w, w, y, y + 0.1, -0.05, 0.05, scale=1.0, col=GREY, bottom=True)
    cylinder(T, 0.3, -0.05, 6.4, 7.3, 0.24, segs=6, col=(0.16, 0.17, 0.18, 1))
    box(T, -0.04, 0.04, 5.5, 5.58, 0.0, 1.3, scale=1.0, col=GREY, bottom=True)
    box(T, -0.12, 0.12, 5.4, 5.5, 0.95, 1.3, scale=1.0, col=(0.95, 0.75, 0.45, 1), bottom=True)


@P.proto("jt_nobori", box=(0.6, 1.5, 0.1), reach=220, detail=True)
def _jt_nobori(k):
    """Two banners on poles by a shop's door: each cloth is the site's
    printed banner, characters down its length, on both its sides (the
    cloth runs along x)."""
    T = k("trim")
    for x, tone in ((-0.62, (0.5, 0.16, 0.14)), (0.08, (0.2, 0.26, 0.5))):
        box(T, x - 0.02, x + 0.02, 0.0, 3.05, -0.02, 0.02, scale=1.0, col=GREY)
        box(T, x, x + 0.56, 2.96, 2.99, -0.012, 0.012, scale=1.0, col=GREY, bottom=True)
        for yaw in (0.0, math.pi):
            rotated_quad(k("print"), x + 0.29, 1.95, 0.0, 0.5, 2.0, yaw, col=(*tone, P.BANNER), depth=0.006)


# ---------------------------------------------------------------------------
# What a lane's wall carries at arm's length. Each is drawn on the wall's
# plane (z 0) standing out toward +z; the ones that reach the ground stand
# on it. All of it is detail: a phone has the wall, its glass, doors and
# lamps.
# ---------------------------------------------------------------------------
STEEL_D = (0.03, 0.034, 0.042, 1)
FRAME = (0.11, 0.115, 0.125, 1)
GALV = (0.2, 0.21, 0.22, 1)
OFFWHITE = (0.34, 0.34, 0.31, 1)
RUSTY = (0.17, 0.075, 0.04, 1)
DAMP = (0.01, 0.012, 0.014, 1)
GREASE = (0.02, 0.015, 0.01, 1)


def _frame(T, t=0.07, d=0.11):
    """The frame round an opening a metre square whose foot is the origin
    (an instance is stretched to its window): jambs and a head standing
    proud of the glass, which is their reveal, and a sill further out."""
    box(T, -0.5 - t, -0.5, -0.02, 1.0 + t, 0.0, d, scale=1.0, col=FRAME)
    box(T, 0.5, 0.5 + t, -0.02, 1.0 + t, 0.0, d, scale=1.0, col=FRAME)
    box(T, -0.5, 0.5, 1.0, 1.0 + t, 0.0, d, scale=1.0, col=FRAME, bottom=True)
    box(T, -0.62, 0.62, -0.1, 0.0, 0.0, d + 0.08, scale=1.0, col=(0.19, 0.19, 0.2, 1), bottom=True)


@P.proto("jt_win", box=(0.6, 0.6, 0.1), reach=170, detail=True)
def _jt_win(k):
    """A back room's window: its frame and sill, three bars and their tie."""
    T = k("trim")
    _frame(T)
    for x in (-0.25, 0.0, 0.25):
        box(T, x - 0.016, x + 0.016, 0.0, 1.0, 0.06, 0.09, scale=1.0, col=STEEL_D)
    box(T, -0.5, 0.5, 0.47, 0.51, 0.05, 0.075, scale=1.0, col=STEEL_D, bottom=True)


@P.proto("jt_win_b", box=(0.6, 0.6, 0.1), reach=170, detail=True)
def _jt_win_b(k):
    """A window with its blind let down two thirds: the room's light comes
    between the slats and under it."""
    T = k("trim")
    _frame(T)
    for i in range(8):
        y = 0.97 - i * 0.08
        quad(T, (-0.49, y - 0.06, 0.03), (0.49, y - 0.06, 0.03), (0.49, y, 0.055), (-0.49, y, 0.055), col=(0.3, 0.29, 0.25, 1))
    box(T, -0.02, 0.02, 0.0, 1.0, 0.02, 0.07, scale=1.0, col=FRAME)


@P.proto("jt_door", box=(0.7, 1.6, 0.25), reach=190, detail=True)
def _jt_door(k):
    """A steel door's frame, step, kick plate, handle and notice, and the
    bulkhead lamp over it on its conduit (the leaf and the lens are the
    wall's own)."""
    T = k("trim")
    for x0, x1 in ((-0.56, -0.475), (0.475, 0.56)):
        box(T, x0, x1, 0.0, 2.19, 0.0, 0.1, scale=1.0, col=FRAME)
    box(T, -0.475, 0.475, 2.1, 2.19, 0.0, 0.1, scale=1.0, col=FRAME, bottom=True)
    box(T, -0.68, 0.68, 0.0, 0.1, 0.0, 0.42, scale=1.0, col=(0.2, 0.2, 0.21, 1))
    box(T, -0.44, 0.44, 0.14, 0.44, 0.034, 0.048, scale=1.0, col=GALV)
    box(T, 0.3, 0.36, 0.98, 1.16, 0.034, 0.1, scale=1.0, col=GALV, bottom=True)
    box(T, -0.3, -0.06, 1.5, 1.66, 0.034, 0.042, scale=1.0, col=(0.45, 0.42, 0.3, 1))
    box(T, -0.16, 0.16, 2.36, 2.6, 0.0, 0.06, scale=1.0, col=STEEL_D)
    box(T, -0.2, 0.2, 2.6, 2.64, 0.0, 0.26, scale=1.0, col=STEEL_D, bottom=True)
    box(T, -0.02, 0.02, 2.64, 3.05, 0.02, 0.06, scale=1.0, col=GALV)


def _disc(T, cx, cy, z, r, col, segs=8):
    poly(T, [(cx + r * math.cos(i * math.tau / segs), cy + r * math.sin(i * math.tau / segs), z) for i in range(segs)], [(0, 0)] * segs, col)


def _wet(T, cx, cz, rx, rz, col=DAMP, segs=8):
    """What drips leaves on the ground: a dark patch."""
    poly(T, [(cx + rx * math.cos(-i * math.tau / segs), 0.025, cz + rz * math.sin(-i * math.tau / segs)) for i in range(segs)], [(0, 0)] * segs, col)


@P.proto("jt_ac", box=(0.5, 1.55, 0.3), reach=220, detail=True)
def _jt_ac(k):
    """An air conditioner over head height on two brackets, its fan behind
    a grille, its drain down the wall, the stain under it and the wet it
    leaves on the ground."""
    T = k("trim")
    box(T, -0.42, 0.42, 2.46, 3.04, 0.1, 0.46, scale=1.0, col=OFFWHITE, bottom=True)
    _disc(T, -0.1, 2.75, 0.468, 0.23, (0.02, 0.02, 0.024, 1))
    for q in (((-0.33, 2.735, 0.474), (0.13, 2.735, 0.474), (0.13, 2.765, 0.474), (-0.33, 2.765, 0.474)),
              ((-0.115, 2.52, 0.474), (-0.085, 2.52, 0.474), (-0.085, 2.98, 0.474), (-0.115, 2.98, 0.474))):
        quad(T, *q, col=OFFWHITE)
    for x in (-0.3, 0.3):
        box(T, x - 0.02, x + 0.02, 2.4, 2.46, 0.0, 0.5, scale=1.0, col=STEEL_D, bottom=True)
        g = [(x, 2.4, 0.0), (x, 2.02, 0.0), (x, 2.4, 0.42)]
        poly(T, g, [(0, 0)] * 3, STEEL_D)
        poly(T, g[::-1], [(0, 0)] * 3, STEEL_D)
    box(T, 0.34, 0.37, 0.0, 2.46, 0.0, 0.035, scale=1.0, col=(0.25, 0.25, 0.24, 1))
    quad(T, (0.18, 0.0, 0.025), (0.54, 0.0, 0.025), (0.44, 2.4, 0.025), (0.3, 2.4, 0.025), col=DAMP)
    _wet(T, 0.36, 0.32, 0.42, 0.3)


@P.proto("jt_meters", box=(0.6, 1.75, 0.12), reach=170, detail=True)
def _jt_meters(k):
    """Three meters on a board, their breaker box, and the conduits up
    from them."""
    T = k("trim")
    box(T, -0.52, 0.52, 1.0, 1.95, 0.0, 0.04, scale=1.0, col=(0.09, 0.07, 0.05, 1))
    for x in (-0.32, 0.0, 0.32):
        box(T, x - 0.12, x + 0.12, 1.5, 1.84, 0.04, 0.17, scale=1.0, col=(0.2, 0.2, 0.19, 1), bottom=True)
        quad(T, (x - 0.07, 1.68, 0.176), (x + 0.07, 1.68, 0.176), (x + 0.07, 1.79, 0.176), (x - 0.07, 1.79, 0.176), col=(0.5, 0.5, 0.42, 1))
        box(T, x - 0.018, x + 0.018, 1.84, 3.3 + x * 0.6, 0.05, 0.085, scale=1.0, col=GALV)
    box(T, -0.44, 0.1, 1.06, 1.4, 0.04, 0.15, scale=1.0, col=GALV, bottom=True)
    box(T, 0.28, 0.32, 0.0, 1.5, 0.04, 0.08, scale=1.0, col=STEEL_D)


@P.proto("jt_vent", box=(0.4, 1.35, 0.15), reach=170, detail=True)
def _jt_vent(k):
    """A louvred vent under a hood and what has run down the wall from it,
    and a low grille by the ground."""
    T = k("trim")
    box(T, -0.36, 0.36, 2.0, 2.56, 0.0, 0.06, scale=1.0, col=FRAME, bottom=True)
    for i in range(5):
        y = 2.52 - i * 0.1
        quad(T, (-0.31, y - 0.085, 0.13), (0.31, y - 0.085, 0.13), (0.31, y, 0.06), (-0.31, y, 0.06), col=GALV)
    hood = ((-0.4, 2.56, 0.26), (0.4, 2.56, 0.26), (0.4, 2.68, 0.0), (-0.4, 2.68, 0.0))
    quad(T, *hood, col=GALV)
    quad(T, hood[1], hood[0], hood[3], hood[2], col=STEEL_D)
    quad(T, (-0.14, 0.5, 0.025), (0.2, 0.5, 0.025), (0.3, 2.0, 0.025), (-0.3, 2.0, 0.025), col=GREASE)
    box(T, -0.3, 0.3, 0.2, 0.5, 0.0, 0.04, scale=1.0, col=STEEL_D)
    for y in (0.27, 0.35, 0.43):
        quad(T, (-0.26, y - 0.02, 0.045), (0.26, y - 0.02, 0.045), (0.26, y + 0.02, 0.045), (-0.26, y + 0.02, 0.045), col=GALV)


@P.proto("jt_duct", box=(0.3, 2.95, 0.32), reach=280, detail=True)
def _jt_duct(k):
    """A kitchen's extract: out of the wall over head height, up it in a
    square duct on two straps to a cowl, grease on the wall under it."""
    T = k("trim")
    box(T, -0.2, 0.2, 2.3, 2.7, 0.0, 0.55, scale=1.0, col=GALV, bottom=True)
    box(T, -0.2, 0.2, 2.7, 5.6, 0.15, 0.55, scale=1.0, col=GALV)
    box(T, -0.27, 0.27, 5.6, 5.85, 0.08, 0.62, scale=1.0, col=(0.13, 0.135, 0.14, 1), bottom=True)
    for y in (3.4, 4.7):
        box(T, -0.23, 0.23, y, y + 0.06, 0.0, 0.58, scale=1.0, col=STEEL_D, bottom=True)
    quad(T, (-0.24, 0.8, 0.025), (0.3, 0.8, 0.025), (0.2, 2.3, 0.025), (-0.2, 2.3, 0.025), col=GREASE)


@P.proto("jt_pipes", box=(0.35, 2.3, 0.15), reach=220, detail=True)
def _jt_pipes(k):
    """Three pipes up a wall, standing off it on straps: a rusted soil
    pipe, a thin one from a foot off the ground, one that turns into the
    wall under the first floor; a red valve."""
    T = k("trim")
    cylinder(T, -0.22, 0.13, 0.0, 4.5, 0.06, segs=5, col=RUSTY, cap=False)
    cylinder(T, 0.0, 0.11, 0.3, 4.5, 0.035, segs=5, col=GALV, cap=False)
    cylinder(T, 0.2, 0.12, 0.0, 3.6, 0.045, segs=5, col=(0.1, 0.11, 0.1, 1))
    box(T, 0.155, 0.245, 3.6, 3.69, 0.0, 0.165, scale=1.0, col=(0.1, 0.11, 0.1, 1), bottom=True)
    box(T, -0.035, 0.035, 0.3, 0.37, 0.0, 0.145, scale=1.0, col=GALV, bottom=True)
    for y in (0.9, 2.4, 3.9):
        box(T, -0.32, 0.3, y, y + 0.05, 0.0, 0.2, scale=1.0, col=STEEL_D, bottom=True)
    box(T, -0.07, 0.07, 1.25, 1.39, 0.06, 0.25, scale=1.0, col=(0.4, 0.05, 0.04, 1), bottom=True)


@P.proto("jt_ladder", box=(0.4, 1.5, 0.45), reach=280, detail=True)
def _jt_ladder(k):
    """Three metres of a roof's ladder off the wall: stiles, rungs, the
    brackets back to the wall, two hoops of its cage and their straps."""
    T = k("trim")
    for x in (-0.22, 0.22):
        box(T, x - 0.02, x + 0.02, 0.0, 3.0, 0.2, 0.25, scale=1.0, col=GALV)
        for y in (0.4, 1.9):
            box(T, x - 0.02, x + 0.02, y, y + 0.04, 0.0, 0.2, scale=1.0, col=GALV, bottom=True)
    for i in range(10):
        y = 0.15 + i * 0.3
        quad(T, (-0.2, y, 0.24), (0.2, y, 0.24), (0.2, y + 0.035, 0.24), (-0.2, y + 0.035, 0.24), col=GALV)
        quad(T, (-0.2, y + 0.035, 0.24), (0.2, y + 0.035, 0.24), (0.2, y + 0.035, 0.21), (-0.2, y + 0.035, 0.21), col=GALV)
    hoop = [(0.3 * math.cos(i * math.pi / 4), 0.25 + 0.55 * math.sin(i * math.pi / 4)) for i in range(5)]
    for y in (0.75, 2.25):
        for (xa, za), (xb, zb) in zip(hoop, hoop[1:]):
            q = ((xa, y, za), (xb, y, zb), (xb, y + 0.05, zb), (xa, y + 0.05, za))
            quad(T, *q, col=GALV)
            quad(T, q[1], q[0], q[3], q[2], col=GALV)
    for x, z in hoop[1:4]:
        box(T, x - 0.015, x + 0.015, 0.0, 3.0, z - 0.015, z + 0.015, scale=1.0, col=GALV)


@P.proto("jt_hutdoor", box=(0.7, 1.2, 0.45), reach=340, detail=True)
def _jt_hutdoor(k):
    """A stair hut's door: its frame, the leaf swung out on one jamb, and
    the caged lamp over it (the lit stair behind is the hut's own)."""
    T = k("trim")
    for x0, x1 in ((-0.54, -0.45), (0.45, 0.54)):
        box(T, x0, x1, 0.0, 2.09, 0.0, 0.1, scale=1.0, col=FRAME)
    box(T, -0.45, 0.45, 2.0, 2.09, 0.0, 0.1, scale=1.0, col=FRAME, bottom=True)
    leaf = ((-0.45, 0.03, 0.05), (-0.82, 0.03, 0.8), (-0.82, 1.98, 0.8), (-0.45, 1.98, 0.05))
    quad(T, *leaf, col=(0.16, 0.1, 0.05, 1))
    quad(T, leaf[1], leaf[0], leaf[3], leaf[2], col=(0.06, 0.09, 0.085, 1))
    box(T, -0.14, 0.14, 2.24, 2.28, 0.0, 0.2, scale=1.0, col=STEEL_D, bottom=True)
    box(k("glow"), -0.1, 0.1, 2.13, 2.24, 0.03, 0.14, scale=1.0, col=GLOW["amber"], bottom=True)


# ---------------------------------------------------------------------------
# What reads on a roof from the air. A roof's own surface takes nine times
# the sky's light a prop's does (src/world/materials.js, `sky`), so what is
# to be seen from above is pale on top: lids, sheets, panels' frames, beds.
# ---------------------------------------------------------------------------
PALE = (0.5, 0.5, 0.48, 1)
TANK = (0.4, 0.41, 0.4, 1)


def _tank(k, body, band, lid, cone):
    T = k("trim")
    for lx, lz in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        box(T, lx * 0.9 - 0.07, lx * 0.9 + 0.07, 0.0, 1.7, lz * 0.9 - 0.07, lz * 0.9 + 0.07, scale=1.0, col=STEEL_D)
    box(T, -1.15, 1.15, 1.62, 1.72, -1.15, 1.15, scale=1.0, col=STEEL_D, bottom=True)
    P.lathe(T, 0.0, 0.0, ((1.72, 1.3), (2.4, 1.3)), segs=10, col=body, cap=False)
    P.lathe(T, 0.0, 0.0, ((2.4, 1.33), (2.52, 1.33)), segs=10, col=band, cap=False)
    P.lathe(T, 0.0, 0.0, ((2.52, 1.3), (3.3, 1.3)), segs=10, col=body, cap=False)
    P.lathe(T, 0.0, 0.0, ((3.3, 1.33), (3.42, 1.33)), segs=10, col=band, cap=False)
    P.lathe(T, 0.0, 0.0, ((3.42, 1.3), (4.0, 1.3)), segs=10, col=body, cap=not cone)
    if cone:
        P.lathe(T, 0.0, 0.0, ((4.0, 1.42), (4.0 + cone, 0.12)), segs=10, col=lid, cap=True)
    else:
        _wetless_disc(T, 4.012, 1.22, lid)
    box(T, 1.3, 1.36, 0.0, 4.0, -0.2, 0.2, scale=1.0, col=GREY)


def _wetless_disc(T, y, r, col, cx=0.0, cz=0.0, segs=10):
    poly(T, [(cx + r * math.cos(-i * math.tau / segs), y, cz + r * math.sin(-i * math.tau / segs)) for i in range(segs)], [(0, 0)] * segs, col)


@P.proto("jt_tank", box=(1.4, 2.1, 1.4), reach=700)
def _jt_tank(k):
    """A roof's water tank on its stand: rolled plate in three courses, a
    pale lid, a ladder up its side."""
    _tank(k, TANK, (0.25, 0.26, 0.26, 1), (0.56, 0.56, 0.53, 1), 0.0)


@P.proto("jt_tank_r", box=(1.4, 2.4, 1.4), reach=700)
def _jt_tank_r(k):
    """An older one of staves, hooped, under a cone."""
    _tank(k, (0.3, 0.15, 0.08, 1), (0.08, 0.07, 0.07, 1), (0.42, 0.3, 0.2, 1), 0.75)


@P.proto("jt_cooler", box=(1.2, 0.8, 0.8), reach=520, detail=True)
def _jt_cooler(k):
    """A chiller: a pale cabinet on a frame, two fans in its top, louvres
    down its long sides."""
    T = k("trim")
    box(T, -1.15, 1.15, 0.25, 1.55, -0.75, 0.75, scale=1.0, col=PALE, bottom=True)
    for x in (-1.05, 1.05):
        box(T, x - 0.05, x + 0.05, 0.0, 0.25, -0.7, 0.7, scale=1.0, col=STEEL_D)
    for x in (-0.55, 0.55):
        _wetless_disc(T, 1.562, 0.46, (0.02, 0.02, 0.025, 1), x, 0.0, 8)
        _wetless_disc(T, 1.574, 0.12, PALE, x, 0.0, 6)
    for sd in (1, -1):
        for y in (0.55, 0.8, 1.05, 1.3):
            z = 0.756 * sd
            q = ((-1.0, y, z), (1.0, y, z), (1.0, y + 0.1, z), (-1.0, y + 0.1, z))
            quad(T, *(q if sd > 0 else (q[1], q[0], q[3], q[2])), col=(0.1, 0.1, 0.11, 1))


@P.proto("jt_ductrun", box=(2.0, 0.5, 0.3), reach=520, detail=True)
def _jt_ductrun(k):
    """Four metres of galvanised duct on three sleepers, flanged, turned
    down into the roof at one end."""
    T = k("trim")
    box(T, -2.0, 2.0, 0.35, 0.8, -0.27, 0.27, scale=1.0, col=(0.42, 0.43, 0.44, 1), bottom=True)
    box(T, 1.5, 2.0, 0.0, 0.35, -0.27, 0.27, scale=1.0, col=(0.36, 0.37, 0.38, 1))
    for x in (-1.9, -0.6, 0.7):
        box(T, x - 0.04, x + 0.04, 0.33, 0.83, -0.3, 0.3, scale=1.0, col=(0.2, 0.21, 0.22, 1))
        box(T, x - 0.1, x + 0.1, 0.0, 0.35, -0.2, 0.2, scale=1.0, col=(0.3, 0.3, 0.31, 1))


@P.proto("jt_solar", box=(1.6, 0.6, 0.9), reach=520, detail=True)
def _jt_solar(k):
    """Three panels on a tilted frame (3.2 m along x): pale frame, dark
    blue glass."""
    T = k("trim")
    lo, hi = (0.35, 0.8), (0.95, -0.8)     # (y, z) of the low and high edges
    quad(T, (-1.6, lo[0], lo[1]), (1.6, lo[0], lo[1]), (1.6, hi[0], hi[1]), (-1.6, hi[0], hi[1]), col=(0.55, 0.56, 0.58, 1))
    quad(T, (1.6, lo[0], lo[1]), (-1.6, lo[0], lo[1]), (-1.6, hi[0], hi[1]), (1.6, hi[0], hi[1]), col=STEEL_D)
    for i in range(3):
        xa, xb = -1.56 + i * 1.066, -1.56 + i * 1.066 + 0.99
        t0, t1 = 0.04, 0.96
        pa = (lo[0] + (hi[0] - lo[0]) * t0 + 0.012, lo[1] + (hi[1] - lo[1]) * t0)
        pb = (lo[0] + (hi[0] - lo[0]) * t1 + 0.012, lo[1] + (hi[1] - lo[1]) * t1)
        quad(T, (xa, pa[0], pa[1]), (xb, pa[0], pa[1]), (xb, pb[0], pb[1]), (xa, pb[0], pb[1]), col=(0.015, 0.03, 0.1, 1))
    for x in (-1.5, 1.5):
        box(T, x - 0.03, x + 0.03, 0.0, 0.93, -0.8, -0.74, scale=1.0, col=GREY)
        box(T, x - 0.03, x + 0.03, 0.0, 0.34, 0.74, 0.8, scale=1.0, col=GREY)


@P.proto("jt_bed", box=(1.5, 0.45, 0.6), reach=420, detail=True)
def _jt_bed(k):
    """A raised bed of planks, three metres of it: dark soil, two rows of
    leaves in three greens, canes at one end."""
    T = k("trim")
    box(T, -1.5, 1.5, 0.0, 0.42, -0.55, 0.55, scale=1.0, col=(0.27, 0.17, 0.09, 1))
    quad(T, (-1.42, 0.43, 0.47), (1.42, 0.43, 0.47), (1.42, 0.43, -0.47), (-1.42, 0.43, -0.47), col=(0.05, 0.035, 0.025, 1))
    greens = ((0.16, 0.42, 0.12, 1), (0.26, 0.48, 0.14, 1), (0.1, 0.3, 0.16, 1))
    for i in range(6):
        for j, z in enumerate((-0.24, 0.24)):
            x = -1.2 + i * 0.48 + j * 0.1
            hgt = 0.22 + 0.12 * ((i * 3 + j) % 3)
            obox(T, (x, 0.43 + hgt / 2, z), basis(0.5 * i + j), 0.36, hgt, 0.36, col=greens[(i + j * 2) % 3], bottom=False)
    for z in (-0.3, 0.3):
        box(T, 1.3, 1.33, 0.42, 1.7, z - 0.015, z + 0.015, scale=1.0, col=(0.45, 0.38, 0.2, 1))


@P.proto("jt_sheets", box=(2.5, 1.1, 0.2), reach=420, detail=True)
def _jt_sheets(k):
    """Five metres of washing line between two poles, sheets on it blown a
    little off the plumb, so the sky and the lamps find them."""
    T = k("trim")
    for x in (-2.5, 2.5):
        box(T, x - 0.03, x + 0.03, 0.0, 2.25, -0.03, 0.03, scale=1.0, col=GREY)
        box(T, x - 0.03, x + 0.03, 2.2, 2.25, -0.35, 0.35, scale=1.0, col=GREY, bottom=True)
    x = -2.3
    for i, (w, h, col) in enumerate(((1.3, 1.5, (0.62, 0.62, 0.58, 1)), (0.9, 1.2, (0.3, 0.44, 0.6, 1)), (1.2, 1.6, (0.6, 0.34, 0.4, 1)), (0.9, 1.3, (0.6, 0.56, 0.4, 1)))):
        blow = 0.28 if i % 2 else -0.22
        q = ((x, 2.18 - h, blow), (x + w, 2.18 - h, blow * 0.8), (x + w, 2.18, 0.0), (x, 2.18, 0.0))
        quad(T, *q, col=col)
        quad(T, q[1], q[0], q[3], q[2], col=col)
        x += w + 0.1


# ---------------------------------------------------------------------------
# Round 3: what runs along a lane's wall, what is parked at a kerb, what
# lies about a roof deck, what a kerb is fitted with.
# ---------------------------------------------------------------------------
@P.proto("jt_run", box=(2.0, 0.4, 0.15), reach=200, detail=True)
def _jt_run(k):
    """Four metres of what runs along a lane's wall over its doors (set it
    3.3 m up): a cable tray on brackets with its bundle, two pipes under it
    on clips, a junction box and the conduit that drops from it."""
    T = k("trim")
    box(T, -2.0, 2.0, 0.62, 0.66, 0.02, 0.28, scale=1.0, col=GALV, bottom=True)
    box(T, -2.0, 2.0, 0.66, 0.75, 0.26, 0.28, scale=1.0, col=GALV)
    box(T, -2.0, 2.0, 0.66, 0.73, 0.06, 0.22, scale=1.0, col=(0.02, 0.02, 0.025, 1))
    for x in (-1.5, 0.0, 1.5):
        box(T, x - 0.02, x + 0.02, 0.5, 0.62, 0.0, 0.28, scale=1.0, col=STEEL_D, bottom=True)
        box(T, x - 0.03, x + 0.03, 0.12, 0.42, 0.0, 0.035, scale=1.0, col=STEEL_D)
    box(T, -2.0, 2.0, 0.3, 0.39, 0.035, 0.125, scale=1.0, col=RUSTY, bottom=True)
    box(T, -2.0, 2.0, 0.14, 0.2, 0.035, 0.095, scale=1.0, col=(0.1, 0.11, 0.1, 1), bottom=True)
    box(T, 0.55, 0.9, 0.04, 0.44, 0.0, 0.15, scale=1.0, col=GALV, bottom=True)
    box(T, 0.7, 0.74, -1.5, 0.04, 0.02, 0.06, scale=1.0, col=GALV)
    box(T, -0.95, -0.85, 0.27, 0.42, 0.03, 0.15, scale=1.0, col=(0.4, 0.05, 0.04, 1), bottom=True)


def _wheel(T, z, r_, col):
    ring = [(z + r_ * math.cos(i * math.tau / 8), r_ + r_ * math.sin(i * math.tau / 8)) for i in range(8)]
    for (za, ya), (zb, yb) in zip(ring, ring[1:] + ring[:1]):
        q = ((-0.022, ya, za), (-0.022, yb, zb), (0.022, yb, zb), (0.022, ya, za))
        quad(T, *q, col=col)
        quad(T, q[1], q[0], q[3], q[2], col=col)
        ia, ib = (z + (za - z) * 0.86, r_ + (ya - r_) * 0.86), (z + (zb - z) * 0.86, r_ + (yb - r_) * 0.86)
        for sx in (-0.022, 0.022):
            e = ((sx, ya, za), (sx, yb, zb), (sx, ib[1], ib[0]), (sx, ia[1], ia[0]))
            quad(T, *(e if sx > 0 else (e[1], e[0], e[3], e[2])), col=col)


def _bar(T, a, b, t, col):
    """A thin tube from a to b in the plane x = 0, seen from both sides."""
    (ya, za), (yb, zb) = a, b
    ln = math.hypot(yb - ya, zb - za)
    ny, nz = -(zb - za) / ln * t, (yb - ya) / ln * t
    for sx in (-0.016, 0.016):
        q = ((sx, ya - ny, za - nz), (sx, yb - ny, zb - nz), (sx, yb + ny, zb + nz), (sx, ya + ny, za + nz))
        quad(T, *(q if sx > 0 else (q[1], q[0], q[3], q[2])), col=col)


@P.proto("jt_bike", box=(0.3, 0.55, 0.9), reach=160, detail=True)
def _jt_bike(k):
    """A bicycle leant on its stand, its length along z: two wheels, a
    frame, forks, bars, a saddle, a basket on the front."""
    T = k("trim")
    tyre, frame = (0.025, 0.025, 0.03, 1), (0.3, 0.07, 0.05, 1)
    for z in (-0.52, 0.52):
        _wheel(T, z, 0.33, tyre)
    seat, head, crank = (0.82, -0.22), (0.86, 0.36), (0.3, -0.02)
    for a, b in ((seat, head), (seat, crank), (crank, (0.78, 0.38)), (seat, (0.33, -0.52)), (crank, (0.33, -0.52)), ((0.33, 0.52), (1.0, 0.33))):
        _bar(T, a, b, 0.018, frame)
    box(T, -0.07, 0.07, 0.86, 0.91, -0.34, -0.1, scale=1.0, col=tyre, bottom=True)
    box(T, -0.26, 0.26, 0.99, 1.02, 0.31, 0.35, scale=1.0, col=GALV, bottom=True)
    box(T, -0.17, 0.17, 0.68, 0.9, 0.42, 0.68, scale=1.0, col=(0.16, 0.16, 0.17, 1), bottom=True)
    box(T, -0.012, 0.012, 0.0, 0.3, -0.2, -0.17, scale=1.0, col=GALV)


@P.proto("jt_deckbits", box=(1.5, 0.3, 1.0), reach=150, detail=True)
def _jt_deckbits(k):
    """What lies about a roof deck, three metres of it: a mushroom vent, a
    low box vent with a louvred side, conduit on sleepers turning down into
    the slab, a drain's grate in its dished frame, a crate with bottles,
    cans, sheets of paper blown against it."""
    T = k("trim")
    P.lathe(T, -1.0, 0.25, ((0.0, 0.1), (0.42, 0.1)), segs=6, col=(0.3, 0.31, 0.31, 1), cap=False)
    P.lathe(T, -1.0, 0.25, ((0.42, 0.23), (0.5, 0.2), (0.6, 0.04)), segs=6, col=(0.42, 0.43, 0.42, 1))
    box(T, 0.5, 1.15, 0.0, 0.42, -0.75, -0.25, scale=1.0, col=(0.3, 0.31, 0.32, 1))
    for y in (0.1, 0.19, 0.28):
        quad(T, (0.54, y, -0.245), (1.11, y, -0.245), (1.11, y + 0.05, -0.245), (0.54, y + 0.05, -0.245), col=(0.04, 0.04, 0.05, 1))
    box(T, -1.5, 1.2, 0.07, 0.12, 0.66, 0.71, scale=1.0, col=GALV, bottom=True)
    box(T, -1.5, 1.2, 0.07, 0.11, 0.75, 0.78, scale=1.0, col=(0.05, 0.05, 0.06, 1), bottom=True)
    box(T, 1.2, 1.26, 0.0, 0.12, 0.65, 0.72, scale=1.0, col=GALV)
    for x in (-1.3, -0.3, 0.7):
        box(T, x - 0.06, x + 0.06, 0.0, 0.07, 0.6, 0.84, scale=1.0, col=(0.25, 0.25, 0.26, 1))
    quad(T, (-0.25, 0.012, -0.35), (0.25, 0.012, -0.35), (0.25, 0.012, -0.85), (-0.25, 0.012, -0.85), col=(0.33, 0.34, 0.35, 1))
    quad(T, (-0.19, 0.016, -0.41), (0.19, 0.016, -0.41), (0.19, 0.016, -0.79), (-0.19, 0.016, -0.79), col=(0.012, 0.013, 0.016, 1))
    for x in (-0.11, 0.0, 0.11):
        quad(T, (x - 0.02, 0.02, -0.41), (x + 0.02, 0.02, -0.41), (x + 0.02, 0.02, -0.79), (x - 0.02, 0.02, -0.79), col=(0.3, 0.31, 0.32, 1))
    box(T, -0.55, -0.1, 0.0, 0.3, 0.05, 0.4, scale=1.0, col=(0.07, 0.16, 0.3, 1))
    for x, z, h, col in ((-0.45, 0.14, 0.24, (0.05, 0.2, 0.1, 1)), (-0.3, 0.3, 0.2, (0.3, 0.16, 0.04, 1)), (-0.2, 0.15, 0.24, (0.05, 0.2, 0.1, 1))):
        box(T, x - 0.035, x + 0.035, 0.3, 0.3 + h, z - 0.035, z + 0.035, scale=1.0, col=col)
    for x, z, w_, d_, yaw, col in ((0.1, 0.3, 0.3, 0.21, 0.4, (0.5, 0.49, 0.44, 1)), (0.35, 0.05, 0.21, 0.3, 1.2, (0.45, 0.4, 0.3, 1)), (-0.8, -0.5, 0.3, 0.21, 2.2, (0.5, 0.5, 0.47, 1)),
                                  (1.25, 0.2, 0.2, 0.14, 0.9, (0.5, 0.2, 0.18, 1))):
        c_, s_ = math.cos(yaw), math.sin(yaw)
        quad(T, *((x + px * c_ + pz * s_, 0.014, z - px * s_ + pz * c_) for px, pz in ((-w_ / 2, d_ / 2), (w_ / 2, d_ / 2), (w_ / 2, -d_ / 2), (-w_ / 2, -d_ / 2))), col=col)
    for x, z in ((0.85, 0.35), (0.95, 0.42)):
        cylinder(T, x, z, 0.0, 0.12, 0.033, segs=5, col=(0.5, 0.12, 0.1, 1))


@P.proto("jt_kerbkit", box=(1.5, 0.05, 0.3), reach=170, detail=True)
def _jt_kerbkit(k):
    """What a kerb is fitted with, three metres of it (its length along x,
    the road toward +z, the origin on the kerb's edge at the pavement's
    level): two strips of light let into the kerbstone's top, their glow
    down its face, a drain's grate in the gutter and a cover in the flags."""
    T, G = k("trim"), k("glow")
    for x in (-1.2, 0.4):
        quad(G, (x, 0.004, -0.04), (x + 0.8, 0.004, -0.04), (x + 0.8, 0.004, -0.1), (x, 0.004, -0.1), col=(0.4, 0.22, 0.08, 1))
        quad(G, (x, -0.1, 0.004), (x + 0.8, -0.1, 0.004), (x + 0.8, -0.01, 0.004), (x, -0.01, 0.004), col=(0.05, 0.028, 0.01, 1))
    quad(T, (-0.45, -0.132, 0.62), (0.45, -0.132, 0.62), (0.45, -0.132, 0.08), (-0.45, -0.132, 0.08), col=(0.012, 0.013, 0.016, 1))
    for z in (0.17, 0.29, 0.41, 0.53):
        quad(T, (-0.42, -0.128, z + 0.025), (0.42, -0.128, z + 0.025), (0.42, -0.128, z - 0.025), (-0.42, -0.128, z - 0.025), col=(0.2, 0.2, 0.21, 1))
    quad(T, (0.75, 0.006, -0.45), (1.35, 0.006, -0.45), (1.35, 0.006, -0.95), (0.75, 0.006, -0.95), col=(0.1, 0.1, 0.11, 1))
    quad(T, (0.8, 0.009, -0.5), (1.3, 0.009, -0.5), (1.3, 0.009, -0.9), (0.8, 0.009, -0.9), col=(0.17, 0.17, 0.18, 1))
