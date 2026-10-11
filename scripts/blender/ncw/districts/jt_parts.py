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


_ST = {}


def _st(size):
    """The next of the street's designs of a size (the site takes the number
    modulo its list of designs, so the names stay short)."""
    n = _ST.get(size, 0)
    _ST[size] = n + 1
    return f"st_{size}_{n % 120}"


def sign_face(col, c, b, w, h, t):
    """One face of a street sign on basis b, t along its normal: facing out
    along the normal for t > 0, back along it for t < 0."""
    if t >= 0:
        q = (pt(c, b, -w / 2, -h / 2, t), pt(c, b, w / 2, -h / 2, t), pt(c, b, w / 2, h / 2, t), pt(c, b, -w / 2, h / 2, t))
    else:
        q = (pt(c, b, w / 2, -h / 2, t), pt(c, b, -w / 2, -h / 2, t), pt(c, b, -w / 2, h / 2, t), pt(c, b, w / 2, h / 2, t))
    quad((D, "sign", 0), *q, col=col)


def slab_sign(c, b, size, k=1.0, both=True, depth=0.16):
    """A street sign of a standard size (scaled k) as a framed slab at c on
    basis b, painted on its front and, `both`, its back."""
    w, h = ST_SIZES[size]
    w, h = w * k, h * k
    if w * h > 3.0:
        obox((D, "board_frame", 1), c, b, w + 0.12, h + 0.14, depth, rim=True)
    col = sign_id(_st(size))
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
    slab_sign(c, basis(phi - math.pi / 2, roll), size, k)
    arm = basis(phi - math.pi / 2)
    for dy in ((h / 2 + 0.1,) if h < 5.5 else (h / 2 + 0.1, -h / 2 - 0.1)):
        if w * h > 3.0:
            obox((D, "metal", 1), (px + dx * reach / 2, y + dy, pz + dz * reach / 2), arm, reach, 0.07, 0.07, tube=True)
        else:
            a0, a1 = (px, y + dy, pz), (px + dx * reach, y + dy, pz + dz * reach)
            for q in ((a0, a1, (a1[0], a1[1] + 0.07, a1[2]), (a0[0], a0[1] + 0.07, a0[2])), (a1, a0, (a0[0], a0[1] + 0.07, a0[2]), (a1[0], a1[1] + 0.07, a1[2]))):
                quad((D, "metal", 1), *q)
    return w, h


def board(f, s, y, size, tilt=0.0, k=1.0, roll=0.0, out=0.2, pitch=0.0):
    """A board on face f, hinged off it by `tilt` (one edge at the wall, the
    other swung out), leaning `roll`, tipped `pitch`."""
    w, h = ST_SIZES[size]
    w, h = w * k, h * k
    px, _, pz = f.p(f.at(s), y, out + abs(math.sin(tilt)) * w / 2 + abs(math.sin(pitch)) * h / 2)
    slab_sign((px, y, pz), basis(f.yaw + tilt, roll, pitch), size, k, both=abs(tilt) > 0.3, depth=0.14)
    return w, h


def tube_sign(c, yaw, w, h, colour, r, both=True, roll=0.0):
    """A sign of bent tube on a dark board: a border and three characters'
    worth of strokes, drawn in `glow` (light the bake leaves out, so it can
    stand anywhere)."""
    b = basis(yaw, roll)
    obox((D, "board_frame", 0), c, b, w + 0.3, h + 0.3, 0.2)
    col = GLOW[colour]
    strokes = [(0.0, h / 2 - 0.05, w, 0.1), (0.0, -h / 2 + 0.05, w, 0.1), (-w / 2 + 0.05, 0.0, 0.1, h), (w / 2 - 0.05, 0.0, 0.1, h)]
    n = max(2, min(4, int(w / (h * 0.75)))) if w >= h else 1
    rows = 1 if w >= h else max(2, min(5, int(h / (w * 0.9))))
    for i in range(n):
        for j in range(rows):
            gu = (-(n - 1) / 2 + i) * (w * 0.8 / n)
            gv = (-(rows - 1) / 2 + j) * (h * 0.8 / rows)
            cw, ch = w * 0.7 / n, h * 0.7 / rows
            for _ in range(r.randrange(2, 5)):
                if r.random() < 0.5:
                    strokes.append((gu + r.uniform(-0.3, 0.3) * cw, gv, 0.12, ch * r.uniform(0.5, 0.95)))
                else:
                    strokes.append((gu, gv + r.uniform(-0.35, 0.35) * ch, cw * r.uniform(0.5, 0.95), 0.12))
    for sd in ((1, -1) if both else (1,)):
        for cu, cv, gw, gh in strokes:
            a = pt(c, b, (cu - gw / 2) * sd, cv - gh / 2, 0.11 * sd)
            bb = pt(c, b, (cu + gw / 2) * sd, cv - gh / 2, 0.11 * sd)
            cc = pt(c, b, (cu + gw / 2) * sd, cv + gh / 2, 0.11 * sd)
            dd = pt(c, b, (cu - gw / 2) * sd, cv + gh / 2, 0.11 * sd)
            quad((D, "glow", 0), a, bb, cc, dd, col=col)


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


# ---------------------------------------------------------------------------
# Placing: rows along a face, spans between two points.
# ---------------------------------------------------------------------------
def put(name, x, y, z, yaw=0.0, sy=1.0, sxz=1.0):
    P.place(name, x, y, z, yaw, sy, sxz, district=D)


def lantern_row(f, s0, s1, y, out, step, name="jt_lantern", sy=1.0, sxz=1.0):
    s = s0 + step / 2
    while s < s1:
        x, _, z = f.p(f.at(s), y, out)
        put(name, x, y, z, 0.0, sy, sxz)
        s += step


def span(name, a, b, y, drop=1.0, unit=10.0):
    """A string (a 10 m prototype along its own x) from a to b, (x, z) each,
    hung at y: stretched to the span, its sag and what hangs on it by
    `drop`."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dz)
    put(name, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, math.atan2(-dz, dx), drop, length / unit)


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


@P.proto("jt_lantern", box=(0.2, 0.3, 0.2), reach=240)
def _jt_lantern(k):
    """A red paper lantern, hung by its top (the origin is its middle)."""
    barrel(k("lantern"), 0.0, 0.0, -0.26, 0.26, 0.2, caps="tb")


def _line(key, length, sag, segs, r=0.018, z=0.0, v=None):
    pts = [(-length / 2 + length * i / segs, -sag * math.sin(math.pi * i / segs)) for i in range(segs + 1)]
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        if v is None:
            pipe(key, (xa, ya, z), (xb, yb, z), r, segs=3)
        else:
            # (In the lantern's own material: v 0 is its dark end.)
            for q in (((xa, ya - r, z), (xb, yb - r, z), (xb, yb + r, z), (xa, ya + r, z)), ((xb, yb - r, z), (xa, ya - r, z), (xa, ya + r, z), (xb, yb + r, z))):
                quad(key, *q, uvs=((0, 0), (1, 0), (1, 0), (0, 0)))


@P.proto("jt_string", box=(5.0, 0.1, 0.1), reach=360)
def _jt_string(k):
    """Ten metres of line with seven red lanterns on it (stretched to its
    span: across a 28 m street each is a lantern most of a metre high)."""
    _line(k("lantern"), 10.0, 0.6, 8, r=0.02, v=0)
    for j in range(7):
        t = (j + 0.5) / 7
        barrel(k("lantern"), -5.0 + 10.0 * t, 0.0, -0.6 * math.sin(math.pi * t) - 0.36, -0.6 * math.sin(math.pi * t) - 0.04, 0.12)


@P.proto("jt_string_s", box=(2.5, 0.1, 0.1), reach=260)
def _jt_string_s(k):
    """Five metres of line with five lanterns: an alley's width."""
    _line(k("lantern"), 5.0, 0.3, 5, r=0.014, v=0)
    for j in range(5):
        t = (j + 0.5) / 5
        barrel(k("lantern"), -2.5 + 5.0 * t, 0.0, -0.3 * math.sin(math.pi * t) - 0.44, -0.3 * math.sin(math.pi * t) - 0.04, 0.15)


@P.proto("jt_festoon", box=(5.0, 0.1, 0.1), reach=360)
def _jt_festoon(k):
    """Ten metres of festoon: a dozen amber bulbs on a line that sags (the
    line itself is lost in the dark)."""
    for j in range(12):
        t = (j + 0.5) / 12
        y = -0.7 * math.sin(math.pi * t) - 0.1
        cylinder(k("neon_amber"), -5.0 + 10.0 * t, 0.0, y - 0.07, y + 0.07, 0.065, segs=3, cap=False)


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


@P.proto("jt_shack", box=(1.7, 1.2, 1.3), reach=520)
def _jt_shack(k):
    """A shack somebody built on a roof: boarded walls, a tin roof with an
    overhang, a lit window and a door."""
    T = k("trim")
    box(T, -1.7, 1.7, 0.0, 2.3, -1.3, 1.3, scale=1.0, col=(0.13, 0.15, 0.15, 1))
    quad(T, (-1.95, 2.25, 1.75), (1.95, 2.25, 1.75), (1.95, 2.7, -1.5), (-1.95, 2.7, -1.5), col=(0.17, 0.19, 0.21, 1))
    quad(T, (1.95, 2.25, 1.75), (-1.95, 2.25, 1.75), (-1.95, 2.7, -1.5), (1.95, 2.7, -1.5), col=(0.1, 0.11, 0.12, 1))
    G = k("glow")
    quad(G, (0.3, 1.0, 1.31), (1.4, 1.0, 1.31), (1.4, 1.9, 1.31), (0.3, 1.9, 1.31), col=GLOW["amber"])
    quad(G, (1.71, 1.1, 0.6), (1.71, 1.1, -0.4), (1.71, 1.8, -0.4), (1.71, 1.8, 0.6), col=(0.25, 0.5, 0.9, 1))
    quad(T, (-1.3, 0.0, 1.31), (-0.4, 0.0, 1.31), (-0.4, 2.0, 1.31), (-1.3, 2.0, 1.31), col=(0.2, 0.09, 0.06, 1))


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


def lamp_arm(x, y, z, yaw):
    """A roof lamp: a tall post, a long arm (toward +z, turned yaw), a head
    throwing its light straight down (D6ia1wjO7sg@220)."""
    b = basis(yaw)
    cylinder((D, "metal", 1), x, z, y, y + 5.6, 0.07, segs=5)
    obox((D, "metal", 1), pt((x, y + 5.55, z), b, 0.0, 0.0, 1.3), b, 0.1, 0.1, 2.6, tube=False, bottom=True)
    obox((D, "metal", 1), pt((x, y + 5.45, z), b, 0.0, 0.0, 2.1), b, 0.32, 0.1, 1.0, bottom=False)
    c = pt((x, y + 5.39, z), b, 0.0, 0.0, 2.1)
    q = [pt(c, b, u, 0.0, t) for u, t in ((-0.13, -0.45), (0.13, -0.45), (0.13, 0.45), (-0.13, 0.45))]
    quad((D, "glow", 0), *q, col=(0.55, 0.95, 1.0, 1))


def viewer(x, y, z, yaw):
    """A coin binocular viewer on its post, looking out along yaw."""
    cylinder((D, "metal", 1), x, z, y, y + 1.15, 0.07, segs=5)
    obox((D, "metal", 1), (x, y + 1.35, z), basis(yaw, 0.0, -0.3), 0.36, 0.3, 0.5, bottom=True)


@P.proto("jt_planter", box=(0.6, 0.5, 0.6), reach=300, detail=True)
def _jt_planter(k):
    """A square planter with a shrub in it."""
    T = k("trim")
    box(T, -0.6, 0.6, 0.0, 0.55, -0.6, 0.6, scale=1.0, col=(0.3, 0.3, 0.32, 1))
    for (cx, cy, cz, r_, yaw) in ((0.0, 0.95, 0.0, 0.55, 0.4), (0.25, 1.25, -0.15, 0.36, 1.1), (-0.25, 1.15, 0.2, 0.34, 2.0)):
        obox(T, (cx, cy, cz), basis(yaw), r_ * 1.7, r_ * 1.3, r_ * 1.6, col=GREEN if cy < 1.2 else GREEN_D)


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
    """Pots by a door: three of them, leaves."""
    T = k("trim")
    for (x, z, r_, h, g) in ((-0.3, 0.0, 0.17, 0.3, 0.55), (0.2, 0.06, 0.2, 0.36, 0.8)):
        cylinder(T, x, z, 0.0, h, r_, segs=5, col=(0.32, 0.14, 0.08, 1), cap=False)
        for yaw in (0.3, 1.9):
            b = basis(yaw)
            q = [pt((x, h + g / 2, z), b, u, v) for u, v in ((-g / 2, -g / 2), (g / 2, -g / 2), (g * 0.35, g / 2), (-g * 0.35, g / 2))]
            quad(T, *q, col=GREEN)
            quad(T, q[1], q[0], q[3], q[2], col=GREEN_D)


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


@P.proto("jt_stools", box=(0.6, 0.25, 0.5), reach=180, detail=True)
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
    """Two banners on poles by a shop's door, their cloth lettered down its
    length (the cloth runs along x)."""
    T = k("trim")
    for x, col, ink in ((-0.62, (0.36, 0.05, 0.05, 1), (0.6, 0.55, 0.45, 1)), (0.08, (0.07, 0.09, 0.2, 1), (0.55, 0.52, 0.45, 1))):
        box(T, x - 0.02, x + 0.02, 0.0, 3.05, -0.02, 0.02, scale=1.0, col=GREY)
        box(T, x, x + 0.56, 2.96, 2.99, -0.012, 0.012, scale=1.0, col=GREY, bottom=True)
        for sd in (1, -1):
            xa, xb = (x + 0.04, x + 0.54) if sd > 0 else (x + 0.54, x + 0.04)
            quad(T, (xa, 0.95, 0.0), (xb, 0.95, 0.0), (xb, 2.95, 0.0), (xa, 2.95, 0.0), col=col)
            for j in range(5):
                y = 2.62 - j * 0.36
                wj = (0.3, 0.2, 0.26, 0.16, 0.28)[j]
                ma, mb = (x + 0.29 - wj / 2, x + 0.29 + wj / 2) if sd > 0 else (x + 0.29 + wj / 2, x + 0.29 - wj / 2)
                quad(T, (ma, y - 0.1, 0.006 * sd), (mb, y - 0.1, 0.006 * sd), (mb, y + 0.1, 0.006 * sd), (ma, y + 0.1, 0.006 * sd), col=ink)
