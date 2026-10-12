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
    """Lanterns in a row along a face, on the rod they hang from and its
    two brackets back to the wall."""
    s = s0 + step / 2
    while s < s1:
        x, _, z = f.p(f.at(s), y, out)
        put(name, x, y, z, 0.0, sy, sxz)
        s += step
    yr = y + 0.27 * sy
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
    """A roof lamp: a post on a foot, a long arm (toward +z), a head whose
    lens hangs under it throwing its light straight down
    (D6ia1wjO7sg@220), and that light in the air under it."""
    T = k("trim")
    col = (0.075, 0.085, 0.095, 1)
    box(T, -0.16, 0.16, 0.0, 0.08, -0.16, 0.16, scale=1.0, col=col)
    cylinder(T, 0.0, 0.0, 0.08, 4.9, 0.07, segs=6, col=col, cap=False)
    box(T, -0.05, 0.05, 4.8, 4.9, -0.07, 2.3, scale=1.0, col=col, bottom=True)
    box(T, -0.17, 0.17, 4.7, 4.8, 1.5, 2.5, scale=1.0, col=col)
    box(k("glow"), -0.13, 0.13, 4.65, 4.7, 1.58, 2.42, scale=1.0, col=(0.55, 0.95, 1.0, 1), bottom=True)
    P.lamp_air(k, 4.65, 2.0, 4.4, (0.4, 0.85, 1.0))


@P.proto("jt_chairs", box=(1.1, 0.45, 0.4), reach=200, detail=True)
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
