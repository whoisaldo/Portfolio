"""The shapes the garage's props are bent from, and the colours they wear.

The kit's own primitives (kit.py: box, cylinder, pipe, quad; props.py:
lathe, tube, spun) are axis-aligned or turned about an upright. A workshop
is full of things that are neither: a lift's arm swung under a sill, a
scissor's legs leaning, a wheel on its axle, a lid propped open. So here are
a box on any three axes and a shape turned about any axis, a cable hung
between two points, words in bent tube, and the one rule for setting a part
down in a prop's own frame when the prop is turned.

Colours are linear, as the kit's `trim` reads them from the vertices.
"""
import math

from mathutils import Vector

from ncw.kit import poly, quad, rgb
from ncw.props import place
from ncw.districts import jt_font as F


def lin(hex_color, a=1.0):
    return (*rgb(hex_color), a)


# The workshop's paints and finishes, for `trim`: a lift's gunmetal and its
# safety yellow, a tool chest's red, bright steel, rubber, a bench's wood.
GUN = lin("3b3f45")
GUN_DARK = lin("23262b")
YELLOW = lin("d9a31a")
RED = lin("9c1419")
RED_DARK = lin("5a0b0f")
CHROME = lin("b4b8be")
ALU = lin("8d9298")
STEEL_MID = lin("5d6168")
RUBBER = lin("161719")
BLACK_PAINT = lin("1c1d20")
WOOD = lin("7a5a3a")
WOOD_DARK = lin("4a3524")
WHITE_PAINT = lin("c9c7c0")
OFFWHITE = lin("a9a59a")
BLUE = lin("1d4f9c")
GREEN = lin("2f7a3a")
ORANGE = lin("d0601a")
HOSE_YELLOW = lin("d8b21e")
HOSE_RED = lin("a3201c")
CABLE = lin("101113")
GRIME = lin("0c0c0d")


def shade(col, f):
    """A colour darkened (or lightened) by f, its alpha kept."""
    return (col[0] * f, col[1] * f, col[2] * f, col[3])


def obox(key, c, u, v, hu, hv, hw, col=(1, 1, 1, 1), skip=(), scale=1.0):
    """A box centred at c on axes u (its right) and v (its up), its front
    along u x v; half sizes hu, hv, hw. `skip` leaves out faces by name
    ("+u", "-u", "+v", "-v", "+w", "-w"): one against a wall, a floor."""
    C = Vector(c)
    U = Vector(u).normalized()
    V = Vector(v).normalized()
    W = U.cross(V).normalized()
    V = W.cross(U).normalized()
    U, V, W = U * hu, V * hv, W * hw

    def p(a, b, d):
        return tuple(C + U * a + V * b + W * d)
    s = 1.0 / scale
    faces = {
        "+w": ((p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1)), 2 * hu, 2 * hv),
        "-w": ((p(1, -1, -1), p(-1, -1, -1), p(-1, 1, -1), p(1, 1, -1)), 2 * hu, 2 * hv),
        "+u": ((p(1, -1, 1), p(1, -1, -1), p(1, 1, -1), p(1, 1, 1)), 2 * hw, 2 * hv),
        "-u": ((p(-1, -1, -1), p(-1, -1, 1), p(-1, 1, 1), p(-1, 1, -1)), 2 * hw, 2 * hv),
        "+v": ((p(-1, 1, 1), p(1, 1, 1), p(1, 1, -1), p(-1, 1, -1)), 2 * hu, 2 * hw),
        "-v": ((p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1)), 2 * hu, 2 * hw),
    }
    for name, (pts, fw, fh) in faces.items():
        if name in skip:
            continue
        quad(key, *pts, uvs=((0, 0), (fw * s, 0), (fw * s, fh * s), (0, fh * s)), col=col)


def beam(key, a, b, hw, hh, col=(1, 1, 1, 1), up=(0, 1, 0), ends=True):
    """A rectangular bar from a to b, hw across and hh up (half sizes), its
    up as near `up` as its run allows."""
    A, B = Vector(a), Vector(b)
    run = B - A
    U = run.normalized()
    ref = Vector(up)
    if abs(U.dot(ref.normalized())) > 0.95:
        ref = Vector((1, 0, 0)) if abs(U.x) < 0.9 else Vector((0, 0, 1))
    W = U.cross(ref).normalized()
    V = W.cross(U).normalized()
    # obox's front is u x v; here the bar runs along u, so its "front" is a side.
    obox(key, tuple((A + B) / 2), tuple(U), tuple(V), run.length / 2, hh, hw, col, skip=() if ends else ("+u", "-u"))


def revolve(key, c, axis, prof, segs=12, col=(1, 1, 1, 1), caps=""):
    """A shape turned about any axis through c: `prof` is (t, r) pairs, t
    along the axis and r out from it, ordered so the solid is on the left
    going along it (out along one face, across the rim, back down the
    other) so every face looks out. `caps`: "a" closes the first ring, "b"
    the last."""
    C = Vector(c)
    A = Vector(axis).normalized()
    ref = Vector((0, 1, 0)) if abs(A.y) < 0.9 else Vector((1, 0, 0))
    u = A.cross(ref).normalized()
    v = A.cross(u).normalized()
    # (u, v, A) right-handed: u x v = A.
    if u.cross(v).dot(A) < 0:
        v = -v
    dirs = [u * math.cos(i * math.tau / segs) + v * math.sin(i * math.tau / segs) for i in range(segs)]
    rings = [[tuple(C + A * t + d * r) for d in dirs] for t, r in prof]
    for n, (lo, hi) in enumerate(zip(rings, rings[1:])):
        for i in range(segs):
            j = (i + 1) % segs
            quad(key, lo[i], lo[j], hi[j], hi[i], ((i / segs, n), ((i + 1) / segs, n), ((i + 1) / segs, n + 1), (i / segs, n + 1)), col)
    if "a" in caps:
        poly(key, list(reversed(rings[0])), [(0.5, 0.5)] * segs, col)
    if "b" in caps:
        poly(key, rings[-1], [(0.5, 0.5)] * segs, col)


def disc(key, c, axis, r, segs=12, col=(1, 1, 1, 1)):
    """A flat round face at c looking along `axis`."""
    revolve(key, c, axis, ((0.0, r), (0.0, 0.0)), segs=segs, col=col)


def hung(a, b, sag, n=8):
    """Points along a cable hung from a to b, sagging `sag` metres at its
    middle below the straight line (a parabola is near enough)."""
    A, B = Vector(a), Vector(b)
    return [tuple(A + (B - A) * (i / n) - Vector((0, sag * 4 * (i / n) * (1 - i / n), 0))) for i in range(n + 1)]


def cable(key, pts, r, col=CABLE, segs=5):
    """A round cable through pts (a hose, a cord, a lead)."""
    from ncw.props import tube
    tube(key, pts, [r] * len(pts), segs=segs, col=col)


# The figures the city's sign maker has no use for and a shop's floor does
# (its bays are numbered), in jt_font's strokes: polylines in a unit box.
DIGITS = {
    "0": [[(0.2, 0.0), (0.0, 0.2), (0.0, 0.8), (0.2, 1.0), (0.8, 1.0), (1.0, 0.8), (1.0, 0.2), (0.8, 0.0), (0.2, 0.0)]],
    "1": [[(0.25, 0.8), (0.55, 1.0), (0.55, 0.0)], [(0.25, 0.0), (0.85, 0.0)]],
    "2": [[(0.0, 0.8), (0.2, 1.0), (0.8, 1.0), (1.0, 0.8), (1.0, 0.6), (0.0, 0.0), (1.0, 0.0)]],
    "3": [[(0.0, 0.85), (0.2, 1.0), (0.8, 1.0), (1.0, 0.82), (1.0, 0.62), (0.8, 0.5), (0.35, 0.5)],
          [(0.8, 0.5), (1.0, 0.38), (1.0, 0.18), (0.8, 0.0), (0.2, 0.0), (0.0, 0.15)]],
    "4": [[(0.7, 0.0), (0.7, 1.0), (0.0, 0.3), (1.0, 0.3)]],
    "5": [[(1.0, 1.0), (0.05, 1.0), (0.0, 0.55), (0.75, 0.6), (1.0, 0.4), (1.0, 0.18), (0.8, 0.0), (0.2, 0.0), (0.0, 0.15)]],
    "6": [[(0.9, 1.0), (0.3, 1.0), (0.0, 0.7), (0.0, 0.2), (0.2, 0.0), (0.8, 0.0), (1.0, 0.2), (1.0, 0.4), (0.8, 0.55), (0.0, 0.55)]],
    "7": [[(0.0, 1.0), (1.0, 1.0), (0.35, 0.0)]],
    "8": [[(0.2, 0.5), (0.0, 0.7), (0.0, 0.85), (0.2, 1.0), (0.8, 1.0), (1.0, 0.85), (1.0, 0.7), (0.8, 0.5), (0.2, 0.5),
           (0.0, 0.32), (0.0, 0.15), (0.2, 0.0), (0.8, 0.0), (1.0, 0.15), (1.0, 0.32), (0.8, 0.5)]],
    "9": [[(0.1, 0.0), (0.7, 0.0), (1.0, 0.3), (1.0, 0.8), (0.8, 1.0), (0.2, 1.0), (0.0, 0.8), (0.0, 0.6), (0.2, 0.45), (1.0, 0.45)]],
    "/": [[(0.2, 0.0), (0.8, 1.0)]],
}


def segments(text, w, h, gap=0.22):
    """jt_font.segments across a line, with the figures above as well."""
    n = max(1, len(text))
    cw = w / n
    gw, gh = cw * (1.0 - gap), h
    out = []
    for i, ch in enumerate(text):
        ox, oy = -w / 2 + (i + 0.5) * cw - gw / 2, -gh / 2
        for line in DIGITS.get(ch) or F.GLYPHS.get(ch, []):
            for (xa, ya), (xb, yb) in zip(line, line[1:]):
                out.append(((ox + xa * gw, oy + ya * gh), (ox + xb * gw, oy + yb * gh)))
    return out


def words(key, text, c, right, up, w, h, thick, col, lift=0.0, gap=0.22):
    """`text` in strokes (the city's sign maker's capitals, jt_font) in a w
    by h box centred at c on the face spanned by `right` and `up`, `lift`
    out from it: a strip `thick` wide a stroke."""
    C, R, U = Vector(c), Vector(right).normalized(), Vector(up).normalized()
    N = R.cross(U).normalized()
    stroke(key, segments(text, w, h, gap=gap), C + N * lift, R, U, thick, col)


def stroke(key, segs, C, R, U, thick, col):
    """Strips along ((u0, v0), (u1, v1)) segments on the face R, U at C."""
    for (u0, v0), (u1, v1) in segs:
        du, dv = u1 - u0, v1 - v0
        ln = math.hypot(du, dv) or 1.0
        du, dv = du / ln, dv / ln
        e, nu, nv = thick * 0.35, -dv * thick / 2, du * thick / 2
        a0, a1 = (u0 - du * e, v0 - dv * e), (u1 + du * e, v1 + dv * e)

        def at(uu, vv):
            return tuple(C + R * uu + U * vv)
        quad(key, at(a0[0] - nu, a0[1] - nv), at(a1[0] - nu, a1[1] - nv), at(a1[0] + nu, a1[1] + nv), at(a0[0] + nu, a0[1] + nv), col=col)


def frame_of(x, y, z, yaw):
    """A function from a prop's own (ox, oy, oz) to world metres, the prop
    standing at (x, y, z) turned `yaw` (props.place's convention: its front
    from +z toward +x)."""
    c, s_ = math.cos(yaw), math.sin(yaw)
    return lambda ox, oy, oz: (x + ox * c + oz * s_, y + oy, z - ox * s_ + oz * c)


def place_in(at, yaw, name, ox, oy, oz, turn=0.0, district=None, sy=1.0, sxz=1.0):
    """One instance of `name` at (ox, oy, oz) in a prop's own frame `at`
    (frame_of), turned `turn` more than the prop."""
    x, y, z = at(ox, oy, oz)
    place(name, x, y, z, yaw + turn, sy=sy, sxz=sxz, district=district)
