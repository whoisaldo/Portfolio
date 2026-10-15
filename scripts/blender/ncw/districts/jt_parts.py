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
UID = [40000]
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
    # (Round 5: the site keeps one deal per id (signs.js `turns`), so while
    # this named a sign st_<size>_<design> every sign of one design showed
    # one face, the first one's, in one colour: Japantown hung some 130
    # names over its 2,900 signs, the same hexagon, eye and vertical board
    # in every view. Each sign is its own id now, from a number no other
    # district's builder reaches, and the site deals it a face from the
    # whole list of its size by where it hangs. `best` still decides
    # whether a panel is hung at all.)
    UID[0] += 1
    return f"st_{size}_{UID[0]}"


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
    mount(px, pz, dx, dz, y, w, h, gap, roll)
    return w, h


def _strap(a0, a1, t, key=(D, "metal", 1)):
    """A flat bar from a0 to a1, t deep, both its faces (read from along
    the street)."""
    for q in ((a0, a1, (a1[0], a1[1] + t, a1[2]), (a0[0], a0[1] + t, a0[2])), (a1, a0, (a0[0], a0[1] + t, a0[2]), (a1[0], a1[1] + t, a1[2]))):
        quad(key, *q)


def mount(px, pz, dx, dz, y, w, h, gap, roll=0.0):
    """How a blade hangs off its wall (round 5: every blade had the same two
    straps): by where it hangs, two straps; a bracket over it, braced back
    to the wall, the sign on two short hangers; a steel frame round it on
    its straps; or two cables from its top corners up to the wall and one
    strap at its foot. About the cost of the two straps each."""
    kind = int(_hash(px, pz, y) * 4.0) if not roll else 0
    t = 0.1 if w * h > 3.0 else 0.07
    reach = gap + w / 2

    def at(u, yy):
        return (px + dx * u, yy, pz + dz * u)
    top, foot = y + h / 2, y - h / 2
    if kind == 1:
        yb = top + 0.24
        _strap(at(0.0, yb), at(gap + w + 0.1, yb), 0.08)
        _strap(at(0.0, yb - 0.75), at(reach * 0.7, yb), 0.05)
        for u in (gap + w * 0.15, gap + w * 0.85):
            quad((D, "metal", 1), at(u - 0.015, top), at(u + 0.015, top), at(u + 0.015, yb), at(u - 0.015, yb))
            quad((D, "metal", 1), at(u + 0.015, top), at(u - 0.015, top), at(u - 0.015, yb), at(u + 0.015, yb))
        if h >= 5.5:
            _strap(at(0.0, foot - 0.1), at(reach, foot - 0.1), t)
        return
    if kind == 3 and h < 5.5:
        for u in (gap + 0.08, gap + w - 0.08):
            p, q = at(u, top), at(0.0, top + 1.1 + 0.3 * (u > reach))
            quad((D, "metal", 1), p, q, (q[0], q[1] + 0.025, q[2]), (p[0], p[1] + 0.025, p[2]))
            quad((D, "metal", 1), q, p, (p[0], p[1] + 0.025, p[2]), (q[0], q[1] + 0.025, q[2]))
        _strap(at(0.0, foot - 0.1), at(reach, foot - 0.1), t)
        return
    if kind == 2 and w * h <= 3.0:
        c = at(reach, y)
        obox((D, "board_frame", 1), c, basis(math.atan2(dx, dz) - math.pi / 2, roll), w + 0.1, h + 0.1, 0.2, rim=True)
    for dy in ((h / 2 + 0.1,) if h < 5.5 else (h / 2 + 0.1, -h / 2 - 0.1)):
        _strap(at(0.0, y + dy), at(reach, y + dy), t)


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
        if bb is b:
            # (Its back is its board in a rim of light: the word is bent on the front.)
            write((D, "glow", 0), c, bb, text, tw, th, 0.112, thick, col, vertical)


def letters(c, b, text, h, colour, depth=0.24, vertical=False, both=False, sides=False):
    """Standing letters, each stroke a bar cut from sheet with a lit face
    in `colour`: one character is h high, the word runs across from its
    middle at c, or down. `sides`: the bars' long returns, dark (a word on
    a roof, seen from along it); `both`: their backs too (seen from
    behind). Returns the word's width and height."""
    kana = not text[0].isascii()
    n = len(text)
    cw = h * (1.12 if kana else 0.9)
    w, hh = (cw, h * 1.14 * n) if vertical else (cw * n, h)
    thick = h * 0.12
    for p, q in F.segments(text, w, hh, vertical, gap=0.2):
        a0, a1, nu, nv = _stroke((D, "neon_" + colour, 0), c, b, p, q, thick, depth / 2, (1, 1, 1, 1))
        ring = [(a0[0] - nu, a0[1] - nv), (a1[0] - nu, a1[1] - nv), (a1[0] + nu, a1[1] + nv), (a0[0] + nu, a0[1] + nv)]
        if sides:
            for (ua, va), (ub, vb) in ((ring[0], ring[1]), (ring[2], ring[3])):
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
    if name == "jt_bills":
        return bills(x, y, z, yaw)
    P.place(name, x, y, z, yaw, sy, sxz, district=D)


def _hash(*v):
    h = math.sin(sum(c * k for c, k in zip(v, (12.9898, 78.233, 37.719, 4.581))) + 0.5) * 43758.5453
    return h - math.floor(h)


def bills(x, y, z, yaw, clear=None):
    """A fly-poster's run (round 5: one jt_bills printed the same bill
    three times, "the same set of three triangle posters" in every lane):
    three or four bills side by side, each its own instance and so its own
    print, each a little off the line and its own size, every other one
    pasted half a centimetre over its neighbour. `clear(u0, u1)`: whether
    the wall is free from u0 to u1 along it (from x, z), for each bill's
    own width; one that is not is left off."""
    c, s_ = math.cos(yaw), math.sin(yaw)
    n = 3 + (_hash(x, z) > 0.55)
    for i in range(n):
        h = _hash(x + i * 1.7, z, y)
        u = -0.68 + i * 0.66 + (h - 0.5) * 0.06
        sc = 0.86 + 0.18 * h
        out = 0.005 * (i % 2)
        if clear is None or clear(u + BILL_X[0] * sc, u + BILL_X[1] * sc):
            P.place("jt_bill", x + c * u + s_ * out, y + (h - 0.5) * 0.12, z - s_ * u + c * out, yaw, sc, sc, district=D)


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


# Stalls (round 3: "one stall stamped everywhere"): four of them, each its
# own roof, goods, board and light, the lamps over 2.3 m so that nobody at
# the counter has a lamp for a head. The kit's paper lanterns that hang
# from A's and B's eaves are set down with them (stall() in japantown.py),
# so each is one of the kit's four shapes in its own colour.
def _counter(T, top=WOOD_PALE, body=WOOD):
    box(T, -1.2, 1.2, 0.0, 0.95, 0.3, 0.75, scale=1.0, col=body)
    box(T, -1.26, 1.26, 0.95, 1.0, 0.2, 0.85, scale=1.0, col=top)


def _pasted(k, T, cx, cz, yaw, w, y0, y1, seed):
    """A side of a stall or a kiosk as it is in a lane (the m8 review's
    "untextured green stall wall"): bills pasted over older paper, one torn,
    a strip of stickers, a dark seam, rust run down from the top. (cx, cz):
    the face's middle on its plane; yaw: its outward normal."""
    c, s_ = math.cos(yaw), math.sin(yaw)
    def at(u, y, t=0.0):
        return (cx + c * u + s_ * t, y, cz - s_ * u + c * t)
    h = y1 - y0
    quad(T, at(-w * 0.42, y0 + h * 0.36, 0.004), at(w * 0.3, y0 + h * 0.34, 0.004), at(w * 0.28, y0 + h * 0.86, 0.004), at(-w * 0.4, y0 + h * 0.88, 0.004), col=PAPER_OLD)
    n = 2 if w > 1.2 else 1
    bw = min(0.58, w * 0.8 / n)
    for i in range(n):
        u = (i - (n - 1) / 2) * (bw + 0.06) - w * 0.05
        bx, _, bz = at(u, 0.0, 0.012)
        rotated_quad(k("print"), bx, y0 + h * 0.62, bz, bw, bw * 1.35, yaw, col=((seed * 0.37 + i * 0.29) % 1.0, 0.5, 0.5, P.BOARD))
    quad(T, at(w * 0.32, y0 + h * 0.4, 0.016), at(w * 0.46, y0 + h * 0.4, 0.016), at(w * 0.46, y0 + h * 0.55, 0.016), at(w * 0.32, y0 + h * 0.5, 0.016), col=PAPER_TORN)
    for j, col in enumerate(((0.5, 0.1, 0.08, 1), (0.08, 0.3, 0.32, 1), (0.55, 0.45, 0.1, 1), (0.4, 0.4, 0.38, 1))):
        u = -w * 0.4 + j * 0.13
        quad(T, at(u, y0 + h * 0.2, 0.01), at(u + 0.1, y0 + h * 0.2, 0.01), at(u + 0.1, y0 + h * 0.2 + 0.08, 0.01), at(u, y0 + h * 0.2 + 0.08, 0.01), col=col)
    quad(T, at(-w * 0.5, y0 + h * 0.3, 0.006), at(w * 0.5, y0 + h * 0.3, 0.006), at(w * 0.5, y0 + h * 0.3 + 0.03, 0.006), at(-w * 0.5, y0 + h * 0.3 + 0.03, 0.006), col=(0.02, 0.02, 0.022, 1))
    quad(T, at(w * 0.36, y1 - h * 0.45, 0.003), at(w * 0.44, y1 - h * 0.45, 0.003), at(w * 0.46, y1, 0.003), at(w * 0.34, y1, 0.003), col=RUSTY)


@P.proto("jt_stall", box=(1.3, 1.6, 0.9), reach=320)
def _jt_stall(k):
    """A: a food stall under a red cloth roof, a tube under its eave, trays
    along the counter and a pot behind, the menu over the cook's head."""
    T = k("trim")
    _counter(T)
    for x in (-1.16, 1.16):
        for z, h in ((-0.74, 3.28), (0.76, 3.02)):
            box(T, x - 0.04, x + 0.04, 0.0, h, z - 0.04, z + 0.04, scale=1.0, col=WOOD)
    box(T, -1.2, 1.2, 0.0, 2.7, -0.8, -0.74, scale=1.0, col=(0.11, 0.09, 0.08, 1))
    box(T, -1.1, 1.1, 0.7, 0.76, -0.74, -0.3, scale=1.0, col=GREY)
    _roof_cloth(T, -1.42, 1.42, 1.15, -0.95, 3.0, 3.32, RED, (0.62, 0.13, 0.1, 1))
    box(T, -1.42, 1.42, 2.76, 3.0, 1.13, 1.16, scale=1.0, col=RED, bottom=True)
    for i, col in enumerate(((0.42, 0.16, 0.07, 1), (0.5, 0.42, 0.2, 1), (0.42, 0.38, 0.33, 1), (0.36, 0.08, 0.07, 1))):
        x = -1.0 + i * 0.5
        box(T, x, x + 0.4, 1.0, 1.04, 0.34, 0.66, scale=1.0, col=(0.05, 0.05, 0.055, 1))
        box(T, x + 0.04, x + 0.36, 1.04, 1.06, 0.38, 0.62, scale=1.0, col=col)
    cylinder(T, 0.75, -0.5, 0.76, 1.1, 0.2, segs=6, col=(0.3, 0.3, 0.31, 1))
    P.face(k, P.FOOD, -0.36, 2.3, -0.735, 0.66, 0.6, 0.0, GLOW["amber"])
    P.face(k, P.FOOD, 0.36, 2.3, -0.735, 0.66, 0.6, 0.0, GLOW["amber"])
    _pasted(k, T, 0.0, -0.8, math.pi, 2.4, 0.0, 2.7, 0.21)


@P.proto("jt_stall_b", box=(1.5, 1.7, 0.9), reach=320)
def _jt_stall_b(k):
    """B: a wooden yatai under a board gable, indigo noren across its eave,
    a charcoal grill glowing on the counter, paper slips of the menu pinned
    along the cook's board."""
    T = k("trim")
    _counter(T, (0.26, 0.17, 0.1, 1), (0.13, 0.08, 0.05, 1))
    for x in (-1.2, 1.2):
        for z in (-0.74, 0.9):
            box(T, x - 0.05, x + 0.05, 0.0, 2.98, z - 0.05, z + 0.05, scale=1.0, col=(0.13, 0.08, 0.05, 1))
    box(T, -1.25, 1.25, 2.9, 2.98, 0.84, 0.96, scale=1.0, col=(0.13, 0.08, 0.05, 1))
    roof, under = (0.09, 0.085, 0.08, 1), (0.16, 0.1, 0.06, 1)
    for zf, yf in ((1.3, 2.98), (-1.05, 2.98)):
        a, b, c, d = (-1.5, yf, zf), (1.5, yf, zf), (1.5, 3.4, 0.12), (-1.5, 3.4, 0.12)
        if zf > 0:
            quad(T, a, b, c, d, col=roof)
            quad(T, b, a, d, c, col=under)
        else:
            quad(T, b, a, d, c, col=roof)
            quad(T, a, b, c, d, col=under)
    for x in (-0.83, 0.0, 0.83):
        for yaw in (0.0, math.pi):
            rotated_quad(k("print", 1), x, 2.66, 0.97, 0.78, 0.5, yaw, col=(0.06, 0.08, 0.22, P.BANNER), depth=0.004)
    box(T, -0.95, 0.15, 1.0, 1.14, 0.36, 0.7, scale=1.0, col=(0.04, 0.04, 0.045, 1))
    quad(k("glow"), (-0.9, 1.145, 0.66), (0.1, 1.145, 0.66), (0.1, 1.145, 0.4), (-0.9, 1.145, 0.4), col=(0.9, 0.32, 0.07, 1))
    box(T, -1.2, 1.2, 0.0, 2.6, -0.8, -0.74, scale=1.0, col=(0.1, 0.07, 0.05, 1))
    _pasted(k, T, 0.0, -0.8, math.pi, 2.4, 0.0, 2.6, 0.53)
    for i in range(7):
        x = -1.0 + i * 0.33
        quad(T, (x, 1.75 + 0.05 * (i % 3), -0.733), (x + 0.2, 1.75 + 0.05 * (i % 3), -0.733), (x + 0.2, 2.35, -0.733), (x, 2.35, -0.733), col=(0.6, 0.57, 0.48, 1))
        quad(T, (x + 0.08, 1.9, -0.731), (x + 0.12, 1.9, -0.731), (x + 0.12, 2.28, -0.731), (x + 0.08, 2.28, -0.731), col=(0.05, 0.04, 0.03, 1))
    box(T, 1.2, 1.62, 2.9, 2.94, 0.86, 0.94, scale=1.0, col=(0.13, 0.08, 0.05, 1))


@P.proto("jt_stall_c", box=(1.5, 1.5, 1.0), reach=320)
def _jt_stall_c(k):
    """C: a stall of goods under a striped canvas on a steel frame, a string
    of bare bulbs along its front, cartons and crates on its table, a price
    board on a pole."""
    T, G = k("trim"), k("glow")
    box(T, -1.25, 1.25, 0.85, 0.9, -0.6, 0.75, scale=1.0, col=(0.16, 0.16, 0.17, 1))
    for x in (-1.2, 1.2):
        for z, h in ((-0.7, 3.05), (1.0, 2.82)):
            box(T, x - 0.025, x + 0.025, 0.0, h, z - 0.025, z + 0.025, scale=1.0, col=GREY)
    for i in range(6):
        x0, x1 = -1.4 + i * 0.4667, -1.4 + (i + 1) * 0.4667
        col = (0.08, 0.3, 0.2, 1) if i % 2 == 0 else (0.6, 0.58, 0.5, 1)
        a, b, c, d = (x0, 2.82, 1.25), (x1, 2.82, 1.25), (x1, 3.08, -0.9), (x0, 3.08, -0.9)
        quad(T, a, b, c, d, col=col)
        quad(T, b, a, d, c, col=tuple(v * 0.55 for v in col[:3]) + (1,))
        quad(T, (x0, 2.6, 1.25), (x1, 2.6, 1.25), (x1, 2.82, 1.25), (x0, 2.82, 1.25), col=col)
    quad(T, (-1.35, 2.585, 1.27), (1.35, 2.585, 1.27), (1.35, 2.6, 1.27), (-1.35, 2.6, 1.27), col=(0.02, 0.02, 0.02, 1))
    for i in range(7):
        x = -1.2 + i * 0.4
        quad(G, (x - 0.035, 2.46, 1.28), (x + 0.035, 2.46, 1.28), (x + 0.035, 2.55, 1.28), (x - 0.035, 2.55, 1.28), col=(1.0, 0.75, 0.42, 1))
    for i, (x0, x1, z0, z1, h) in enumerate(((-1.15, -0.55, 0.1, 0.7, 0.32), (-0.5, 0.1, 0.1, 0.7, 0.26), (0.15, 0.7, 0.1, 0.7, 0.36), (0.75, 1.2, 0.15, 0.65, 0.3),
                                              (-1.1, -0.5, -0.55, 0.0, 0.5))):
        P.carton(k, x0, x1, 0.9, 0.9 + h, z0, z1, 0.13 + 0.17 * i, P.BOXED if i % 2 else P.TIMBER if i == 4 else P.BOXED)


@P.proto("jt_stall_d", box=(1.2, 1.6, 0.8), reach=320)
def _jt_stall_d(k):
    """D: a steel kiosk, its service window lit from within, a lit box of
    menus on its roof under a pink tube, a griddle at the window."""
    T, G = k("trim"), k("glow")
    body = (0.06, 0.18, 0.19, 1)
    box(T, -1.15, 1.15, 0.0, 1.0, -0.75, 0.75, scale=1.0, col=body)
    box(T, -1.15, -0.9, 1.0, 2.55, -0.75, 0.75, scale=1.0, col=body)
    box(T, 0.9, 1.15, 1.0, 2.55, -0.75, 0.75, scale=1.0, col=body)
    box(T, -0.9, 0.9, 2.1, 2.55, -0.75, 0.75, scale=1.0, col=body)
    box(T, -0.9, 0.9, 1.0, 2.1, -0.75, -0.7, scale=1.0, col=body)
    quad(G, (-0.9, 1.0, -0.69), (0.9, 1.0, -0.69), (0.9, 2.1, -0.69), (-0.9, 2.1, -0.69), col=(0.3, 0.2, 0.1, 1))
    quad(G, (0.9, 2.098, 0.75), (-0.9, 2.098, 0.75), (-0.9, 2.098, -0.7), (0.9, 2.098, -0.7), col=(0.3, 0.27, 0.2, 1))
    box(T, -1.2, 1.2, 0.97, 1.02, 0.75, 1.05, scale=1.0, col=GREY)
    box(T, -0.6, 0.2, 1.02, 1.06, 0.78, 1.0, scale=1.0, col=(0.03, 0.03, 0.035, 1))
    for i in range(4):
        for j in range(2):
            x, z = -0.52 + i * 0.19, 0.83 + j * 0.1
            quad(G, (x, 1.062, z + 0.05), (x + 0.07, 1.062, z + 0.05), (x + 0.07, 1.062, z), (x, 1.062, z), col=(0.9, 0.48, 0.14, 1))
    box(T, -1.3, 1.3, 2.55, 2.65, -0.85, 1.1, scale=1.0, col=(0.12, 0.12, 0.13, 1))
    box(G, -1.3, 1.3, 2.58, 2.62, 1.1, 1.13, scale=1.0, col=(1.0, 0.25, 0.62, 1))
    box(T, -0.85, 0.85, 2.65, 3.3, 0.3, 0.5, scale=1.0, col=(0.05, 0.05, 0.06, 1))
    P.face(k, P.FOOD, -0.38, 2.97, 0.505, 0.66, 0.6, 0.0, GLOW["cyan"])
    P.face(k, P.FOOD, 0.38, 2.97, 0.505, 0.66, 0.6, 0.0, (0.95, 0.9, 0.8, 1))
    # (Its sides and back as a lane sees them: pasted, seamed, a louvre, a
    # gas bottle chained at the back, a lit box sign on one side.)
    _pasted(k, T, 1.15, 0.0, math.pi / 2, 1.5, 0.0, 2.55, 0.71)
    _pasted(k, T, -1.15, 0.0, -math.pi / 2, 1.5, 0.0, 2.55, 0.17)
    _pasted(k, T, 0.0, -0.75, math.pi, 2.3, 0.0, 2.55, 0.43)
    _pasted(k, T, 0.0, 0.75, 0.0, 2.2, 0.0, 0.95, 0.88)
    for sx, sd in ((-1.025, 0.31), (1.025, 0.67)):
        rotated_quad(k("print"), sx, 1.72, 0.758, 0.2, 1.05, 0.0, col=(sd, 0.5, 0.5, P.BOARD))
        quad(T, (sx - 0.1, 2.3, 0.756), (sx + 0.1, 2.3, 0.756), (sx + 0.1, 2.42, 0.756), (sx - 0.1, 2.42, 0.756), col=(0.5, 0.45, 0.12, 1))
    for sx in (1.156, -1.156):
        for y in (0.32, 0.42, 0.52, 0.62):
            quad(T, (sx, y, 0.45 if sx > 0 else 0.2), (sx, y, 0.2 if sx > 0 else 0.45), (sx, y + 0.05, 0.2 if sx > 0 else 0.45), (sx, y + 0.05, 0.45 if sx > 0 else 0.2), col=(0.02, 0.025, 0.03, 1))
    # (Round 5: the gas bottle at its back corner, a blue cylinder with its
    # valve on top, read from the alley as "a purple sleeve and hand"
    # reaching out of the kiosk: cartons stacked there instead.)
    P.carton(k, 0.35, 0.95, 0.0, 0.42, -1.2, -0.78, 0.37)
    P.carton(k, 0.45, 0.9, 0.42, 0.74, -1.15, -0.8, 0.81)
    box(G, 1.16, 1.24, 1.55, 2.05, -0.35, 0.35, scale=1.0, col=(0.95, 0.35, 0.2, 1))
    # (And "flat colour panels with no edge wear or depth": steel angles
    # down its corners and round its window, a kick plate along its foot.)
    angle, kick = (0.025, 0.03, 0.035, 1), (0.03, 0.06, 0.065, 1)
    for x, z in ((-1.15, -0.75), (1.15, -0.75), (-1.15, 0.75), (1.15, 0.75)):
        box(T, x - 0.04, x + 0.04, 0.0, 2.55, z - 0.04, z + 0.04, scale=1.0, col=angle)
    box(T, -1.17, 1.17, 0.0, 0.18, 0.75, 0.78, scale=1.0, col=kick)
    for sx in (-1.17, 1.17):
        box(T, sx - 0.015, sx + 0.015, 0.0, 0.18, -0.75, 0.75, scale=1.0, col=kick)
    for x0_, x1_, y0_, y1_ in ((-0.94, -0.88, 1.0, 2.1), (0.88, 0.94, 1.0, 2.1), (-0.94, 0.94, 2.1, 2.16)):
        box(T, x0_, x1_, y0_, y1_, 0.75, 0.8, scale=1.0, col=angle)



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


# ---------------------------------------------------------------------------
# Foliage (round 5: the m11 review saw the masses of round 4 as "pink
# faceted lumps", "crumpled flat pink planes", "orange balls on a stick" and
# "smooth green balls"): a tree's or a shrub's leaves and blossom are dozens
# of small clusters, each the kit's P.clump (crossed cards the site cuts
# into florets, lit through), set round the ends of its twigs with sky
# between them, lighter over the top and darker under.
# ---------------------------------------------------------------------------
def _norm(v):
    ln = math.sqrt(sum(c * c for c in v)) or 1.0
    return tuple(c / ln for c in v)


def _shaded(col, shade):
    return tuple(min(1.0, c * shade) for c in col[:3])


def leaves(w, cx, cy, cz, rx, ry, rz, cols, seed, n, r, floor=None, ceil=None):
    """A mass of foliage, n clusters r across over an ellipsoid rx, ry, rz
    about (cx, cy, cz), most of them near its skin; none under `floor` nor
    over `ceil` (a clipped top)."""
    rr = random.Random(seed)
    for _ in range(n):
        u = rr.uniform(-1.0, 1.0)
        a = rr.uniform(0.0, math.tau)
        s_ = math.sqrt(1.0 - u * u)
        d = rr.uniform(0.6, 1.0)
        x, y, z = s_ * math.cos(a) * d, u * d * (0.6 if u < 0 else 1.0), s_ * math.sin(a) * d
        rad = r * rr.uniform(0.75, 1.2)
        py = cy + y * ry
        if floor is not None:
            py = max(py, floor + rad * 0.85)
        if ceil is not None:
            py = min(py, ceil - rad * 0.85)
        shade = (0.72 + 0.4 * (y + 1.0) / 2.0) * rr.uniform(0.88, 1.1)
        P.clump(w, cx + x * rx, py, cz + z * rz, rad, _shaded(cols[rr.randrange(len(cols))], shade),
                yaw=rr.uniform(0.0, math.pi), tilt=rr.uniform(0.1, 0.45))


def _twist(w, rr, h, lean, r0, base_y=0.0, n=7, segs=7, wave=0.14):
    """A trunk that leans and turns as it climbs from base_y, h tall, r0
    thick, flared at its foot: its points and radii."""
    a, ph = rr.uniform(0.0, math.tau), rr.uniform(0.0, math.tau)
    pts, radii = [], []
    for i in range(n + 1):
        t = i / n
        pts.append((lean * t * t * math.sin(a) + wave * t * math.sin(ph + t * 5.0), base_y + h * t,
                    lean * t * t * math.cos(a) + wave * t * math.cos(ph + t * 4.2)))
        radii.append(r0 * (1.5 if i == 0 else 1.0 - 0.36 * t))
    _bark(w, pts, radii, segs)
    return pts, radii


def _grow(w, rr, p0, d, length, r0, depth, tips, segs=5, spread=0.75, rise=0.1, low=None):
    """A limb from p0 along d, wandering as it goes, that forks `depth`
    more times, one fork off its end and the rest off its last third; the
    ends of its twigs go in `tips`. None dips under `low`."""
    n = 3
    pts, radii, cur = [p0], [r0], d
    for i in range(1, n + 1):
        cur = _norm((cur[0] + rr.uniform(-0.3, 0.3), cur[1] + rr.uniform(-0.12, 0.2) + rise, cur[2] + rr.uniform(-0.3, 0.3)))
        q = pts[-1]
        nxt = (q[0] + cur[0] * length / n, q[1] + cur[1] * length / n, q[2] + cur[2] * length / n)
        if low is not None and nxt[1] < low:
            nxt = (nxt[0], low + 0.05 * i, nxt[2])
        pts.append(nxt)
        radii.append(max(0.014, r0 * (1.0 - 0.42 * i / n)))
    _bark(w, pts, radii, segs)
    if depth == 0:
        tips.append((pts[-1], pts[-2]))
        return
    kids = 2 if depth == 1 else rr.choice((2, 3, 3))
    a0 = rr.uniform(0.0, math.tau)
    for j in range(kids):
        a = a0 + j * math.tau / kids + rr.uniform(-0.5, 0.5)
        nd = _norm((cur[0] + math.sin(a) * spread, cur[1] + 0.1, cur[2] + math.cos(a) * spread))
        _grow(w, rr, pts[-1] if j == 0 else pts[2], nd, length * rr.uniform(0.58, 0.74), radii[-1] if j == 0 else radii[2] * 0.85,
              depth - 1, tips, max(3, segs - 1), spread, rise, low)


def _blossom(w, rr, tips, cols, per=4, r=(0.26, 0.44), reach=0.48, hang=0.12, floor=None):
    """Clusters round each twig's end: one on it, the rest about it, a
    little under it (blossom hangs), lighter the higher it is."""
    top = max(t[0][1] for t in tips)
    bot = min(t[0][1] for t in tips)
    for tip, prev in tips:
        d = _norm((tip[0] - prev[0], tip[1] - prev[1], tip[2] - prev[2]))
        for j in range(per):
            if j == 0:
                c = (tip[0] + d[0] * 0.12, tip[1] + d[1] * 0.12, tip[2] + d[2] * 0.12)
            else:
                c = (tip[0] + rr.uniform(-reach, reach), tip[1] + rr.uniform(-reach * 0.6, reach * 0.4) - hang, tip[2] + rr.uniform(-reach, reach))
            rad = rr.uniform(*r)
            cy = c[1] if floor is None else max(c[1], floor + rad * 0.85)
            shade = (0.8 + 0.3 * (c[1] - bot) / max(0.1, top - bot)) * rr.uniform(0.88, 1.1)
            P.clump(w, c[0], cy, c[2], rad, _shaded(cols[rr.randrange(len(cols))], shade), yaw=rr.uniform(0.0, math.pi), tilt=rr.uniform(0.1, 0.5))


def _petals(w, rr, n, r0, r1, y, cols):
    """Fallen blossom: flat clusters on the soil or the paving round a tree."""
    for _ in range(n):
        a, d = rr.uniform(0.0, math.tau), rr.uniform(r0, r1)
        x, z, s_ = math.cos(a) * d, math.sin(a) * d, rr.uniform(0.12, 0.26)
        yaw = rr.uniform(0.0, math.pi)
        c_, sn = math.cos(yaw) * s_, math.sin(yaw) * s_
        quad(w, (x - c_, y, z + sn), (x + sn, y, z + c_), (x + c_, y, z - sn), (x - sn, y, z - c_), ((0, 0), (1, 0), (1, 1), (0, 1)),
             (*_shaded(cols[rr.randrange(len(cols))], 0.7), P.CLUMP))


LEAVES = (LEAF, LEAF_D, LEAF_Y, LEAF_D)
STONE = (0.12, 0.115, 0.11, 1)
COPING = (0.24, 0.235, 0.22, 1)
GRIME = (0.045, 0.043, 0.04, 1)


def _cast(T, h, r, c=0.06):
    """A cast-stone planter r across each way and h high: a darker foot, a
    joint down each face, grime run down from its coping, the coping
    proud of it, soil inside."""
    box(T, -r, r, 0.0, h, -r, r, scale=1.0, col=STONE)
    box(T, -r - 0.012, r + 0.012, 0.0, 0.07, -r - 0.012, r + 0.012, scale=1.0, col=GRIME)
    box(T, -r - c, r + c, h, h + 0.08, -r - c, r + c, scale=1.0, col=COPING, bottom=True)
    quad(T, (-r + 0.03, h + 0.083, r - 0.03), (r - 0.03, h + 0.083, r - 0.03), (r - 0.03, h + 0.083, -r + 0.03), (-r + 0.03, h + 0.083, -r + 0.03), col=(0.03, 0.022, 0.017, 1))
    for yaw in (0.0, math.pi / 2, math.pi, -math.pi / 2):
        sn, cs = math.sin(yaw), math.cos(yaw)
        o = r + 0.004

        def at(u, y, _s=sn, _c=cs, _o=o):
            return (_s * _o + _c * u, y, _c * _o - _s * u)
        quad(T, at(-0.012, 0.07), at(0.012, 0.07), at(0.012, h), at(-0.012, h), col=GRIME)
        for u0, u1, y0 in ((-r * 0.8, -r * 0.45, h * 0.35), (r * 0.25, r * 0.5, h * 0.55)):
            quad(T, at(u0, y0), at(u1, y0 + 0.05), at(u1, h), at(u0, h), col=(0.08, 0.077, 0.072, 1))


@P.proto("jt_planter", box=(0.6, 0.5, 0.6), reach=300, detail=True)
def _jt_planter(k):
    """A square planter of cast stone (see _cast), a shrub in it: a mound of
    small leafy clusters, sprays out of it."""
    T, L = k("trim"), k("plant")
    _cast(T, 0.5, 0.58)
    leaves(L, 0.0, 0.92, 0.0, 0.55, 0.36, 0.55, LEAVES, 4101, 18, 0.21, floor=0.6)
    for i in range(6):
        P.frond(L, (0.0, 0.8, 0.0), i * 1.05 + 0.3, 0.9 + 0.12 * (i % 3), 0.62, 0.8, 0.09, (LEAF, LEAF_Y)[i % 2], segs=2, vee=False)


@P.proto("jt_hedge", box=(0.46, 0.5, 1.34), reach=300, detail=True)
def _jt_hedge(k):
    """A clipped hedge in a long box of dark timber on the reservation, its
    length along z: small leafy clusters shorn flat on top, a few sprays
    out of it."""
    T, L = k("trim"), k("plant")
    box(T, -0.42, 0.42, 0.0, 0.42, -1.3, 1.3, scale=1.0, col=(0.11, 0.07, 0.045, 1))
    for y in (0.13, 0.27):
        box(T, -0.425, 0.425, y, y + 0.02, -1.305, 1.305, scale=1.0, col=(0.035, 0.024, 0.016, 1))
    box(T, -0.46, 0.46, 0.42, 0.48, -1.34, 1.34, scale=1.0, col=(0.06, 0.04, 0.03, 1), bottom=True)
    leaves(L, 0.0, 0.7, 0.0, 0.4, 0.3, 1.25, LEAVES, 4601, 26, 0.19, floor=0.45, ceil=1.0)
    for i in range(4):
        P.frond(L, (0.0, 0.85, -0.9 + i * 0.6), i * 1.9 + 0.4, 1.0, 0.45, 0.6, 0.08, LEAF_Y, segs=2, vee=False)


@P.proto("jt_planter_b", box=(0.55, 0.45, 0.55), reach=300, detail=True)
def _jt_planter_b(k):
    """A round bowl of cast stone with tall grass in it: blades sprayed out
    from its middle, small leafy clusters round their feet."""
    T, L = k("trim"), k("plant")
    P.lathe(T, 0.0, 0.0, ((0.0, 0.42), (0.36, 0.55), (0.44, 0.58)), segs=10, col=(0.2, 0.2, 0.21, 1), cap=False)
    _wetless_disc(T, 0.4, 0.5, (0.04, 0.032, 0.026, 1), 0.0, 0.0, 10)
    leaves(L, 0.0, 0.55, 0.0, 0.4, 0.14, 0.4, LEAVES, 4701, 9, 0.17, floor=0.42)
    for i in range(11):
        P.frond(L, (0.0, 0.5, 0.0), i * 0.571 + 0.2, 1.25 - 0.15 * (i % 3), 0.9 + 0.2 * (i % 2), 0.7, 0.07, (LEAF, LEAF_Y)[i % 2], segs=3, vee=False)


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
    for i, (cx, cy, cz, rx, ry) in enumerate(((-0.32, 0.42, 0.0, 0.18, 0.12), (0.18, 0.62, 0.06, 0.22, 0.26))):
        leaves(L, cx, cy, cz, rx, ry, rx, LEAVES, 4201 + i, 6 + 4 * i, 0.12, floor=0.28)
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
    body = (0.2, 0.2, 0.185, 1)
    box(T, -0.42, 0.42, 2.46, 3.04, 0.1, 0.46, scale=1.0, col=body, bottom=True)
    # (Its sides are what a lane sees of it: louvres, and rust run down from the top.)
    for sx in (-0.424, 0.424):
        for y in (2.56, 2.68, 2.8, 2.92):
            q = ((sx, y, 0.14), (sx, y, 0.42), (sx, y + 0.06, 0.42), (sx, y + 0.06, 0.14))
            quad(T, *(q if sx < 0 else (q[1], q[0], q[3], q[2])), col=(0.03, 0.03, 0.034, 1))
    quad(T, (-0.4, 2.47, 0.464), (-0.22, 2.47, 0.464), (-0.26, 2.9, 0.464), (-0.4, 3.0, 0.464), col=RUSTY)
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


# How far a kitchen's duct (its cowl, straps and grease) reaches either way
# along its wall.
DUCT_HALF = 0.27


@P.proto("jt_duct", box=(0.3, 2.95, 0.32), reach=280, detail=True)
def _jt_duct(k):
    """A kitchen's extract: out of the wall over head height, up it in a
    square duct on two straps to a cowl, grease on the wall under it."""
    T = k("trim")
    duct = (0.34, 0.35, 0.36, 1)    # (galvanised and new-ish: at GALV it was a black slab in a dark lane)
    box(T, -0.2, 0.2, 2.3, 2.7, 0.0, 0.55, scale=1.0, col=duct, bottom=True)
    box(T, -0.2, 0.2, 2.7, 5.6, 0.15, 0.55, scale=1.0, col=duct)
    box(T, -0.27, 0.27, 5.6, 5.85, 0.08, 0.62, scale=1.0, col=(0.13, 0.135, 0.14, 1), bottom=True)
    for y in (3.4, 4.7):
        box(T, -0.23, 0.23, y, y + 0.06, 0.0, 0.58, scale=1.0, col=STEEL_D, bottom=True)
    # (Its elbow from under, which a lane's eye sees: a grille, not a black slab.)
    poly(T, [(-0.19, 2.295, 0.02), (0.19, 2.295, 0.02), (0.19, 2.295, 0.53), (-0.19, 2.295, 0.53)], [(0, 0)] * 4, (0.26, 0.27, 0.28, 1))
    for z in (0.12, 0.24, 0.36, 0.48):
        poly(T, [(-0.17, 2.29, z), (0.17, 2.29, z), (0.17, 2.29, z + 0.04), (-0.17, 2.29, z + 0.04)], [(0, 0)] * 4, (0.03, 0.03, 0.035, 1))
    quad(T, (-0.22, 1.5, 0.025), (0.26, 1.5, 0.025), (0.2, 2.3, 0.025), (-0.2, 2.3, 0.025), col=(0.07, 0.06, 0.05, 1))


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
    _washing(T, ((1.3, 1.5, (0.44, 0.44, 0.41, 1)), (0.9, 1.2, (0.12, 0.2, 0.36, 1)), (1.2, 1.6, (0.42, 0.14, 0.18, 1)), (0.9, 1.3, (0.4, 0.33, 0.14, 1))))


def _washing(T, pieces):
    x = -2.3
    for i, (w, h, col) in enumerate(pieces):
        blow = 0.28 if i % 2 else -0.22
        q = ((x, 2.18 - h, blow), (x + w, 2.18 - h, blow * 0.8), (x + w, 2.18, 0.0), (x, 2.18, 0.0))
        quad(T, *q, col=col)
        quad(T, q[1], q[0], q[3], q[2], col=tuple(v * 0.7 for v in col[:3]) + (1,))
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
    ring = [(z + r_ * math.cos(i * math.tau / 18), r_ + r_ * math.sin(i * math.tau / 18)) for i in range(18)]
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


# ---------------------------------------------------------------------------
# Paper on walls (round 3, the ramp's walls and the lanes): the site prints
# each bill (`print`, an advert on a board, its art the instance's own), so
# two bills side by side are two adverts and three in one prototype are the
# same one three times, as a fly-poster pastes them. Each stands on the
# wall's plane (z 0) toward +z, its foot at the origin.
# ---------------------------------------------------------------------------
PAPER_OLD = (0.36, 0.34, 0.29, 1)
PAPER_TORN = (0.46, 0.44, 0.38, 1)


def _bill(k, x, w=0.58, h=0.82, z=0.012, half=False):
    uv = ((0, 0), (1, 0), (1, 0.55), (0, 0.55)) if half else ((0, 0), (1, 0), (1, 1), (0, 1))
    hh = h * 0.55 if half else h
    rotated_quad(k("print"), x, 0.04 + hh / 2, z, w, hh, 0.0, uvs=uv, col=(0.5, 0.5, 0.5, P.BOARD))


# How far one bill reaches either way along its wall, the older paper under
# it and its lifting corner included (at its own scale 1).
BILL_X = (-0.37, 0.32)


@P.proto("jt_bill", box=(0.36, 0.45, 0.03), reach=170, detail=True)
def _jt_bill(k):
    """One bill: under it what is left of an older one, ragged, and its own
    top corner lifting off the paste."""
    T = k("trim")
    quad(T, (-0.37, 0.0, 0.004), (0.18, 0.02, 0.004), (0.24, 0.66, 0.004), (-0.34, 0.74, 0.004), col=PAPER_OLD)
    _bill(k, 0.03)
    poly(T, [(0.32, 0.86, 0.016), (0.16, 0.86, 0.04), (0.32, 0.7, 0.04)], [(0, 0)] * 3, PAPER_TORN)


@P.proto("jt_bills", box=(1.0, 0.45, 0.03), reach=220, detail=True)
def _jt_bills(k):
    """A fly-poster's run: the same bill three times edge to edge over the
    older paper, and a fourth torn away to its lower half."""
    T = k("trim")
    quad(T, (-0.98, 0.0, 0.004), (1.3, 0.03, 0.004), (1.27, 0.84, 0.004), (-0.95, 0.88, 0.004), col=PAPER_OLD)
    for x in (-0.62, 0.0, 0.62):
        _bill(k, x, 0.6)
    _bill(k, 1.04, 0.42, half=True)
    poly(T, [(0.83, 0.49, 0.016), (1.25, 0.49, 0.016), (1.25, 0.56, 0.02), (1.1, 0.6, 0.02), (0.92, 0.54, 0.02)], [(0, 0)] * 5, PAPER_TORN)


# ---------------------------------------------------------------------------
# A lane's bulkhead lamp (round 3: no lane wall four metres without one): a
# short bracket off the wall, a hood, the lens under it, in four lights.
# The origin is on the wall's plane at the bracket's foot.
# ---------------------------------------------------------------------------
def _sconce(k, lens):
    G = k("glow")    # (one material: the housing is glow at the dark of painted steel)
    dark = (0.022, 0.024, 0.028, 1)
    box(G, -0.05, 0.05, -0.12, 0.12, 0.0, 0.06, scale=0.5, col=dark)
    box(G, -0.14, 0.14, 0.12, 0.17, 0.0, 0.26, scale=0.5, bottom=True, col=dark)
    quad(G, (-0.11, 0.04, 0.22), (0.11, 0.04, 0.22), (0.11, 0.12, 0.22), (-0.11, 0.12, 0.22), col=lens)
    quad(G, (-0.11, 0.04, 0.06), (0.11, 0.04, 0.06), (0.11, 0.04, 0.22), (-0.11, 0.04, 0.22), col=lens)


for _nm, _col in (("jt_sconce", (0.95, 0.55, 0.22, 1)), ("jt_sconce_w", (0.2, 0.23, 0.22, 1))):
    P.proto(_nm, box=(0.15, 0.15, 0.13), reach=200)(lambda k, _c=_col: _sconce(k, _c))


# ---------------------------------------------------------------------------
# Japantown's own trees (round 3: the kit's one blossom tree on its lit
# planter stood everywhere): a weeping cherry leaning out of a granite
# planter, a red maple in a timber box, a young cherry in a tree pit behind
# its guard. Bark on round limbs, blossom and leaves in pads (the `plant`
# material), no light in any planter.
# ---------------------------------------------------------------------------
def _bark(w, pts, radii, segs=7):
    P.tube(w, pts, radii, segs=segs, col=(0.09, 0.07, 0.062, P.LIMB), smooth=True)


def _pbox(w, x0, x1, y0, y1, z0, z1, col):
    """A box in the `plant` material, shaded smooth as a limb is (its uv
    the face's normal): a planter is one mesh with its tree."""
    c = (*col[:3], P.LIMB)
    for a, b, cc, d, uv in (((x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (1.0, 0.5)), ((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0), (0.0, 0.5)),
                            ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1), (0.5, 1.0)), ((x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0), (0.5, 0.0)),
                            ((x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0), (0.5, 0.5))):
        quad(w, a, b, cc, d, (uv,) * 4, c)


def _granite(w, h=0.5, r=0.72):
    _pbox(w, -r, r, 0.0, h, -r, r, (0.2, 0.2, 0.21, 1))
    _pbox(w, -r - 0.05, r + 0.05, h, h + 0.07, -r - 0.05, r + 0.05, (0.3, 0.3, 0.31, 1))
    quad(w, (-r + 0.08, h + 0.075, r - 0.08), (r - 0.08, h + 0.075, r - 0.08), (r - 0.08, h + 0.075, -r + 0.08), (-r + 0.08, h + 0.075, -r + 0.08), ((0.5, 0.5),) * 4,
         (0.05, 0.04, 0.035, P.LIMB))


PINKS = ((0.82, 0.3, 0.5), (0.72, 0.17, 0.35), (0.86, 0.52, 0.64), (0.78, 0.24, 0.44))
PALES = ((0.88, 0.62, 0.7), (0.82, 0.38, 0.54), (0.9, 0.7, 0.76))
MAPLE = ((0.6, 0.07, 0.07), (0.44, 0.04, 0.06), (0.56, 0.15, 0.06), (0.66, 0.26, 0.06), (0.5, 0.06, 0.1))


@P.proto("jt_tree_a", box=(0.75, 2.0, 0.75), reach=480)
def _jt_tree_a(k):
    """A cherry in blossom in a low granite planter (KvMY1uzSC1E@94): its
    trunk leans and turns as it climbs, forks into three limbs that fork
    twice again, and the blossom is seventy small clusters round the
    twigs' ends with sky between; fallen petals on the soil."""
    w = k("plant")
    _granite(w)
    rr = random.Random(5101)
    pts, radii = _twist(w, rr, 1.75, 0.42, 0.17, base_y=0.5, n=6, segs=7, wave=0.17)
    tips = []
    for a, ln, up in ((0.3, 1.25, 0.55), (2.4, 1.35, 0.42), (4.3, 1.15, 0.7)):
        _grow(w, rr, pts[-1], _norm((math.sin(a), up, math.cos(a))), ln, radii[-1] * 0.9, 2, tips, segs=5, spread=0.7, rise=0.06)
    _grow(w, rr, pts[4], _norm((math.sin(1.4), 0.3, math.cos(1.4))), 1.0, radii[4] * 0.7, 1, tips, segs=5, spread=0.8, rise=0.06)
    _blossom(w, rr, tips, PINKS, per=4)
    _petals(w, rr, 9, 0.1, 0.6, 0.58, PINKS)
    _petals(w, rr, 7, 0.95, 1.9, 0.012, PINKS)


@P.proto("jt_tree_b", box=(0.45, 2.1, 0.45), reach=480)
def _jt_tree_b(k):
    """A street maple on the reservation, in a box of dark timber slats:
    a trunk clear to four and a half metres (its crown is over the lanes),
    three limbs climbing out of its head and forking twice, the leaves in
    tiers of small crimson and rust clusters, flat-bottomed as a gardener
    keeps it over the traffic."""
    w = k("plant")
    _pbox(w, -0.4, 0.4, 0.0, 0.62, -0.4, 0.4, (0.12, 0.075, 0.05, 1))
    for y in (0.14, 0.28, 0.42):
        _pbox(w, -0.412, 0.412, y, y + 0.022, -0.412, 0.412, (0.04, 0.028, 0.02, 1))
    for x, z in ((-0.4, -0.4), (0.4, -0.4), (0.4, 0.4), (-0.4, 0.4)):
        _pbox(w, x - 0.045, x + 0.045, 0.0, 0.66, z - 0.045, z + 0.045, (0.07, 0.05, 0.035, 1))
    quad(w, (-0.35, 0.625, 0.35), (0.35, 0.625, 0.35), (0.35, 0.625, -0.35), (-0.35, 0.625, -0.35), ((0.5, 0.5),) * 4, (0.05, 0.04, 0.035, P.LIMB))
    rr = random.Random(5202)
    pts, radii = _twist(w, rr, 3.95, 0.22, 0.135, base_y=0.62, n=6, segs=7, wave=0.07)
    tips = []
    for a in (0.4, 2.5, 4.5):
        _grow(w, rr, pts[-1], _norm((math.sin(a), 0.85, math.cos(a))), 1.45, radii[-1] * 0.9, 2, tips, segs=5, spread=0.75, rise=0.12, low=4.75)
    _blossom(w, rr, tips, MAPLE, per=3, r=(0.26, 0.42), reach=0.5, hang=0.0, floor=4.7)
    for y, rad, n in ((5.15, 1.75, 11), (5.9, 1.45, 9), (6.65, 0.95, 6)):
        a0 = rr.uniform(0.0, math.tau)
        for i in range(n):
            a = a0 + i * math.tau / n + rr.uniform(-0.2, 0.2)
            d = rad * rr.uniform(0.7, 1.0)
            rc = rr.uniform(0.3, 0.42)
            P.clump(w, math.sin(a) * d, max(y + rr.uniform(-0.15, 0.15), 4.7 + rc * 0.85), math.cos(a) * d, rc,
                    _shaded(MAPLE[rr.randrange(len(MAPLE))], 0.8 + 0.12 * (y - 5.0)), yaw=rr.uniform(0.0, math.pi), tilt=rr.uniform(0.02, 0.12))


@P.proto("jt_tree_c", box=(0.6, 1.8, 0.6), reach=420)
def _jt_tree_c(k):
    """A young cherry in a pit in the paving: a slender trunk with a kink
    in it, four limbs that fork once, pale blossom in small clusters round
    their ends, a dark grate round its foot in a low iron ring, petals on
    the paving."""
    w = k("plant")
    quad(w, (-0.6, 0.012, 0.6), (0.6, 0.012, 0.6), (0.6, 0.012, -0.6), (-0.6, 0.012, -0.6), ((0.5, 0.5),) * 4, (0.035, 0.035, 0.04, P.LIMB))
    for a, b in (((-0.5, -0.5), (0.5, -0.5)), ((0.5, -0.5), (0.5, 0.5)), ((0.5, 0.5), (-0.5, 0.5)), ((-0.5, 0.5), (-0.5, -0.5))):
        _pbox(w, min(a[0], b[0]) - 0.02, max(a[0], b[0]) + 0.02, 0.0, 0.32, min(a[1], b[1]) - 0.02, max(a[1], b[1]) + 0.02, (0.1, 0.1, 0.11, 1))
    rr = random.Random(5303)
    pts, radii = _twist(w, rr, 2.25, 0.25, 0.1, base_y=0.0, n=5, segs=6, wave=0.1)
    tips = []
    for a, ln, up in ((0.8, 1.05, 0.7), (2.9, 1.0, 0.6), (4.9, 0.95, 0.8)):
        _grow(w, rr, pts[-1], _norm((math.sin(a), up, math.cos(a))), ln, radii[-1] * 0.9, 1, tips, segs=5, spread=0.7, rise=0.08)
    _grow(w, rr, pts[3], _norm((math.sin(2.0), 0.4, math.cos(2.0))), 0.85, radii[3] * 0.7, 1, tips, segs=4, spread=0.8, rise=0.08)
    _blossom(w, rr, tips, PALES, per=4, r=(0.24, 0.38), reach=0.4)
    _petals(w, rr, 6, 0.65, 1.5, 0.016, PALES)


@P.proto("jt_lanefloor", box=(1.2, 0.02, 0.6), reach=120, detail=True)
def _jt_lanefloor(k):
    """What lies on a lane's floor over two and a half metres of it (along
    x): a wet stain spread from a wall, a pair of cables run along the
    floor in a cover strip, a sheet of paper, a flattened carton, a can."""
    T = k("trim")
    quad(T, (-1.1, 0.006, 0.55), (-0.2, 0.006, 0.6), (0.1, 0.006, 0.1), (-0.9, 0.006, -0.05), col=(0.018, 0.02, 0.022, 1))
    quad(T, (-1.25, 0.009, -0.42), (1.25, 0.009, -0.42), (1.25, 0.009, -0.5), (-1.25, 0.009, -0.5), col=(0.07, 0.07, 0.075, 1))
    quad(T, (-1.25, 0.011, -0.435), (1.25, 0.011, -0.435), (1.25, 0.011, -0.445), (-1.25, 0.011, -0.445), col=(0.16, 0.15, 0.1, 1))
    for x, z, w_, d_, yaw, col in ((0.55, 0.15, 0.3, 0.21, 0.5, (0.42, 0.41, 0.37, 1)), (0.95, -0.1, 0.5, 0.36, 1.9, (0.2, 0.13, 0.08, 1)),
                                  (-0.4, 0.3, 0.21, 0.3, 2.6, (0.38, 0.36, 0.3, 1))):
        c_, s_ = math.cos(yaw), math.sin(yaw)
        quad(T, *((x + px * c_ + pz * s_, 0.013, z - px * s_ + pz * c_) for px, pz in ((-w_ / 2, d_ / 2), (w_ / 2, d_ / 2), (w_ / 2, -d_ / 2), (-w_ / 2, -d_ / 2))), col=col)
    cylinder(T, 0.2, -0.2, 0.0, 0.12, 0.033, segs=5, col=(0.12, 0.3, 0.5, 1))
