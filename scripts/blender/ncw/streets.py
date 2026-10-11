"""The ground every district stands on, built from the plan (plan.py).

For each street: its carriageway between junctions, the lane markings its
lanes and bays call for, its kerbs and its pavements out to the lot line;
for each junction: the square its carriageways meet in, a radiused kerb and
a pavement corner on every corner two streets turn round, a pavement run
straight across where a street ends at another, and on every approach a
crossing striped yellow and black (Fn9gKhU_2_Q@69) with lights set into the
road at its edges (XMaaEjT0LhU@64) and a stop line. Drains along the kerbs,
manholes in the lanes. Real sizes: lanes of 3.5 m and more, a 0.15 m kerb,
pavements of 4 m and 5 m.

Everything is keyed to the district its middle stands in (plan.district_at),
so the finish step tiles and streams it with that district.
"""
import math

from ncw.kit import *  # noqa: F401,F403
from ncw import plan
from ncw import props as P

PAVE_Y = 0.15
KERB_W = 0.3
CORNER_R = 4.0
# Road paint colours (the paint shader reads them off the vertices).
WHITE = (0.78, 0.76, 0.70, 1.0)
YELLOW = (0.86, 0.66, 0.10, 1.0)
GREEN = (0.20, 0.78, 0.42, 1.0)
# Painted kerbs and tactile paving: yellow paint on stone, lit by the street.
KERB_YELLOW = (0.55, 0.42, 0.07, 1.0)
EPS = 1e-6


def _d(x, z):
    return plan.district_at(x, z)


def _rect(key, x0, x1, z0, z1, y, scale, col=(1, 1, 1, 1)):
    """A horizontal rectangle facing up, world-projected UVs."""
    if x1 - x0 < EPS or z1 - z0 < EPS:
        return
    s = 1.0 / scale
    pts = ((x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0))
    quad(key, *pts, uvs=tuple((p[0] * s, -p[2] * s) for p in pts), col=col)


def _poly_up(key, pts2, y, scale, col=(1, 1, 1, 1)):
    """A convex horizontal polygon (x, z points, counter-clockwise seen from
    above), facing up."""
    s = 1.0 / scale
    pts = [(x, y, z) for x, z in pts2]
    # Blender's +z is world -z: a polygon wound clockwise in (x, z) faces up.
    poly(key, pts, [(p[0] * s, -p[2] * s) for p in pts], col)


# ---------------------------------------------------------------------------
# A street in its own frame: u across it (+u to the street's +x or +z side),
# v along it. These turn (u, v) into world (x, z) for each axis.
# ---------------------------------------------------------------------------
def _w(s, u, v):
    return (s.c + u, v) if s.axis == "z" else (v, s.c + u)


def _rect_uv(key, s, u0, u1, v0, v1, y, scale, col=(1, 1, 1, 1)):
    xa, za = _w(s, u0, v0)
    xb, zb = _w(s, u1, v1)
    _rect(key, min(xa, xb), max(xa, xb), min(za, zb), max(za, zb), y, scale, col)


def _box_uv(key, s, u0, u1, y0, y1, v0, v1, scale=1.0):
    xa, za = _w(s, u0, v0)
    xb, zb = _w(s, u1, v1)
    box(key, min(xa, xb), max(xa, xb), y0, y1, min(za, zb), max(za, zb), scale=scale)


def _paint_dashes(s, u, w, v0, v1, dash, gap, col, district):
    """Dashes of width w centred on u, from v0 to v1 (v0 < v1)."""
    v = v0
    k = (district, "paint", 0)
    while v + dash <= v1:
        _rect_uv(k, s, u - w / 2, u + w / 2, v, v + dash, 0.012, 1.0, col)
        v += dash + gap


def _paint_line(s, u, w, v0, v1, col, district):
    _rect_uv((district, "paint", 0), s, u - w / 2, u + w / 2, v0, v1, 0.011, 1.0, col)


def _markings(s, a, b, district):
    """Lane paint along a run, a..b along the street."""
    if b - a < 6.0:
        return
    h = s.half
    if s.lanes >= 2:
        # A broad dashed centre line: the hero's lens follows it up the
        # avenue to the vanishing point.
        _paint_dashes(s, 0.0, 0.3 if h >= 9.5 else 0.22, a + 2.0, b - 2.0, 4.5, 4.5, WHITE, district)
        lane = 3.6 if h >= 9.5 else 3.5
        for side in (-1, 1):
            _paint_dashes(s, side * lane, 0.12, a + 4.0, b - 4.0, 2.0, 7.0, WHITE, district)
            if s.bay > 0:
                _paint_line(s, side * (h - s.bay), 0.14, a + 1.0, b - 1.0, WHITE, district)
            else:
                # The yellow edge line Night City's roads carry (Zq4zTcIM0yQ@44).
                _paint_line(s, side * (h - 0.35), 0.12, a + 0.5, b - 0.5, YELLOW, district)
    else:
        _paint_dashes(s, 0.0, 0.16, a + 2.0, b - 2.0, 3.0, 5.0, WHITE, district)
        for side in (-1, 1):
            if s.bay > 0:
                _paint_line(s, side * (h - s.bay), 0.14, a + 1.0, b - 1.0, WHITE, district)
                # The bay's own ticks, a car length apart.
                v = a + 6.0
                while v < b - 6.0:
                    _rect_uv((district, "paint", 0), s, side * (h - s.bay) + (0.0 if side > 0 else -s.bay),
                             side * (h - s.bay) + (s.bay if side > 0 else 0.0), v, v + 0.12, 0.011, 1.0, WHITE)
                    v += 6.0


def _crossing(s, v_edge, direction, district):
    """A crossing on street s at the junction mouth: v_edge is the junction
    square's edge, direction +1 if the run goes on toward +v. Yellow and
    black bars, the walk figure painted green either end, a row of lights in
    the road along each edge, and a stop line behind it on the lanes coming
    in."""
    h = s.half
    v0 = v_edge + direction * (CORNER_R + 0.6)
    v1 = v0 + direction * 3.4
    va, vb = sorted((v0, v1))
    k = (district, "paint", 0)
    u = -h + 0.5
    while u + 0.6 <= h - 0.5:
        _rect_uv(k, s, u, u + 0.6, va, vb, 0.013, 1.0, YELLOW)
        u += 1.2
    # The walk figure: a head and a striding body in green, at each kerb.
    for side in (-1, 1):
        cu = side * (h - 1.3)
        cv = (va + vb) / 2
        for (du0, du1, dv0, dv1) in ((-0.12, 0.12, 0.55, 0.8), (-0.1, 0.1, -0.2, 0.5), (-0.35, -0.08, -0.7, -0.2),
                                     (0.08, 0.32, -0.7, -0.2), (-0.32, -0.1, 0.05, 0.4), (0.1, 0.32, 0.05, 0.4)):
            _rect_uv(k, s, cu + du0, cu + du1, cv + dv0 * direction, cv + dv1 * direction, 0.014, 1.0, GREEN)
    # Lights set into the road along both edges of the crossing: amber dots
    # in the asphalt, the street's colour of "wait".
    for v in (va - 0.15, vb + 0.15):
        u = -h + 0.8
        while u < h - 0.6:
            _rect_uv((district, "glow", 0), s, u - 0.09, u + 0.09, v - 0.05, v + 0.05, 0.016, 1.0, GLOW["amber"])
            u += 1.1
    # The stop line on the side traffic comes in on (driving on the right:
    # the lanes on the -u side head toward +v... the side a car arrives on).
    stop = v1 + direction * 1.0
    if direction > 0:
        _rect_uv(k, s, 0.0, h - 0.3, stop - 0.2, stop + 0.2, 0.012, 1.0, WHITE)
    else:
        _rect_uv(k, s, -h + 0.3, 0.0, stop - 0.2, stop + 0.2, 0.012, 1.0, WHITE)
    # Tactile paving where each crossing meets the pavement, and the kerb
    # painted yellow along it (XMaaEjT0LhU@64).
    for side in (-1, 1):
        u0 = side * (h + KERB_W)
        _rect_uv((district, "trim", 1), s, min(u0, u0 + side * 0.6), max(u0, u0 + side * 0.6), va, vb, PAVE_Y + 0.006, 0.5, KERB_YELLOW)
        ka, kb = sorted((side * h, side * (h + KERB_W)))
        _rect_uv((district, "trim", 0), s, ka, kb, va - 1.5, vb + 1.5, PAVE_Y + 0.004, 1.0, KERB_YELLOW)


def _kerb_run(s, side, v0, v1, district):
    """A straight kerb on one side of a street, v0..v1."""
    if v1 - v0 < EPS:
        return
    u0 = side * s.half
    u1 = side * (s.half + KERB_W)
    _box_uv((district, "kerb", 0), s, min(u0, u1), max(u0, u1), 0.0, PAVE_Y, v0, v1, scale=1.0)


def _walk_run(s, side, v0, v1, district):
    if v1 - v0 < EPS:
        return
    u0 = side * (s.half + KERB_W)
    u1 = side * s.lot
    _rect_uv((district, "sidewalk", 0), s, min(u0, u1), max(u0, u1), v0, v1, PAVE_Y, 2.0)


def _corner(p, qx, qz, X, Z, district):
    """The corner where an x-street X and a z-street Z turn round each other
    in quadrant (qx, qz): the kerb on an arc of CORNER_R, the asphalt it
    leaves inside the arc, the pavement outside it out to both lot lines."""
    hZ, hX = Z.half, X.half
    LZ, LX = Z.lot, X.lot
    R = CORNER_R
    cx, cz = p[0] + qx * (hZ + R), p[1] + qz * (hX + R)
    steps = 6
    arc = [(cx - qx * R * math.cos(t), cz - qz * R * math.sin(t))
           for t in (i * (math.pi / 2) / steps for i in range(steps + 1))]
    # arc[0] is on Z's kerb line (u = hZ, v = hX + R), arc[-1] on X's.
    # The asphalt fillet between the junction square's corner and the arc.
    corner = (p[0] + qx * hZ, p[1] + qz * hX)
    for a, b in zip(arc, arc[1:]):
        tri = [corner, a, b]
        _up_tri((district, "asphalt", 0), tri, 0.0, 6.0)
    # The kerb along the arc: a strip KERB_W wide, its top and its face.
    out = [(cx - qx * (R - KERB_W) * math.cos(t), cz - qz * (R - KERB_W) * math.sin(t))
           for t in (i * (math.pi / 2) / steps for i in range(steps + 1))]
    k = (district, "kerb", 0)
    for (a, b), (c, d) in zip(zip(arc, arc[1:]), zip(out, out[1:])):
        _up_quad(k, (a, b, d, c), PAVE_Y, 1.0)
        # Its face toward the road.
        _wall(k, a, b, 0.0, PAVE_Y)
    # The pavement: the corner square round the arc, a rounded corner, so
    # it is convex and fans from the lot lines' corner. The runs' pavements
    # start at the other street's lot line, so this is the whole corner.
    kw = (district, "sidewalk", 0)
    pts = [(p[0] + qx * LZ, p[1] + qz * LX), (p[0] + qx * LZ, p[1] + qz * (hX + KERB_W)), out[-1]]
    pts += list(reversed(out[:-1]))
    pts += [(p[0] + qx * (hZ + KERB_W), p[1] + qz * LX)]
    _up_fan(kw, pts, PAVE_Y, 2.0)


def _up_tri(key, pts2, y, scale):
    s = 1.0 / scale
    a, b, c = pts2
    # Wind so it faces up: in world (x, z), facing +y is clockwise when z
    # points down the page... check by cross product.
    cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    if cross > 0:
        b, c = c, b
    pts = [(p[0], y, p[1]) for p in (a, b, c)]
    poly(key, pts, [(p[0] * s, -p[2] * s) for p in pts])


def _up_quad(key, pts2, y, scale):
    a, b, c, d = pts2
    _up_tri(key, (a, b, c), y, scale)
    _up_tri(key, (a, c, d), y, scale)


def _up_fan(key, pts2, y, scale):
    for i in range(1, len(pts2) - 1):
        _up_tri(key, (pts2[0], pts2[i], pts2[i + 1]), y, scale)


def _wall(key, a, b, y0, y1):
    """A vertical quad from a to b (x, z), both windings (a kerb's face is
    seen from one side only, but which side depends on the corner)."""
    length = math.hypot(b[0] - a[0], b[1] - a[1])
    quad(key, (a[0], y0, a[1]), (b[0], y0, b[1]), (b[0], y1, b[1]), (a[0], y1, a[1]),
         ((0, 0), (length, 0), (length, y1 - y0), (0, y1 - y0)))
    quad(key, (b[0], y0, b[1]), (a[0], y0, a[1]), (a[0], y1, a[1]), (b[0], y1, b[1]),
         ((0, 0), (length, 0), (length, y1 - y0), (0, y1 - y0)))


def _extends(s, coord, direction):
    """Whether street s runs on past `coord` (along its axis) toward
    `direction`."""
    return s.b > coord + EPS if direction > 0 else s.a < coord - EPS


def _end_info(s, v):
    """At a run end v of street s: the junction there, if any, as (p, X, Z)
    with X the x-street and Z the z-street."""
    for p, names in plan.junctions().items():
        if s.name not in names:
            continue
        vp = p[1] if s.axis == "z" else p[0]
        x0, x1, z0, z1 = plan.junction_box(p, names)
        e0, e1 = (z0, z1) if s.axis == "z" else (x0, x1)
        if abs(v - e0) < 1e-3 or abs(v - e1) < 1e-3:
            other = [plan.BY_NAME[n] for n in names if n != s.name][0]
            X, Z = (s, other) if s.axis == "x" else (other, s)
            return p, X, Z, vp
    return None


def build():
    junctions = plan.junctions()
    # Carriageways, markings, crossings, kerbs and pavements, run by run.
    for s in plan.STREETS:
        for a, b in plan.runs(s):
            mx, mz = _w(s, 0.0, (a + b) / 2)
            dist = _d(mx, mz)
            # Long runs in pieces, so each piece lands in the district it
            # crosses (the avenue runs from Kabuki Avenue through the canyon
            # to the megabuilding).
            n = max(1, int((b - a) // 60))
            ma = a + (CORNER_R + 6.0 if _end_info(s, a) else 1.0)
            mb = b - (CORNER_R + 6.0 if _end_info(s, b) else 1.0)
            for i in range(n):
                pa, pb = a + (b - a) * i / n, a + (b - a) * (i + 1) / n
                px, pz = _w(s, 0.0, (pa + pb) / 2)
                dd = _d(px, pz)
                _rect_uv((dd, "asphalt", 0), s, -s.half, s.half, pa, pb, 0.0, 6.0)
                qa, qb = max(pa, ma), min(pb, mb)
                if qb > qa:
                    _markings(s, qa, qb, dd)
            # Each end: a junction (crossing, corner or a through pavement)
            # or the street's own end (a court or a gate: kerbed across).
            for side in (-1, 1):
                v0, v1 = a, b
                # Where this side's kerb and pavement start and end.
                ka, kb, wa, wb = a, b, a, b
                for end, v in (("a", a), ("b", b)):
                    info = _end_info(s, v)
                    direction = 1 if end == "a" else -1  # into the run
                    if info is None:
                        continue
                    p, X, Z, vp = info
                    other = X if s is Z else Z
                    q_other = side  # this side of s, in the other street's terms
                    # Does the other street continue on this side of s?
                    oc = p[0] if other.axis == "x" else p[1]
                    on_side = _extends(other, oc, side)
                    if on_side:
                        # A corner: the kerb starts after the arc, the
                        # pavement after the other street's lot line.
                        if end == "a":
                            ka = v + CORNER_R
                            wa = vp + other.lot
                        else:
                            kb = v - CORNER_R
                            wb = vp - other.lot
                    # (else: the other street ends here from the far side;
                    # this side's kerb and pavement run straight across,
                    # added at the junction below.)
                _kerb_run(s, side, ka, kb, dist)
                _walk_run(s, side, wa, wb, dist)
            for end, v in (("a", a), ("b", b)):
                info = _end_info(s, v)
                if info is not None:
                    _crossing(s, v, 1 if end == "a" else -1, dist)

    # Junctions: the square, the corners, the through pavements.
    for p, names in junctions.items():
        x0, x1, z0, z1 = plan.junction_box(p, names)
        dist = _d(*p)
        _rect((dist, "asphalt", 0), x0, x1, z0, z1, 0.0, 6.0)
        X = [plan.BY_NAME[n] for n in names if plan.BY_NAME[n].axis == "x"][0]
        Z = [plan.BY_NAME[n] for n in names if plan.BY_NAME[n].axis == "z"][0]
        # The wider street's lanes guided through the junction in short
        # dashes, so a road keeps leading on across it (the hero's lens
        # looks up the avenue over the first of them).
        M = Z if Z.half >= X.half else X
        a, b = (z0, z1) if M is Z else (x0, x1)
        lane = 3.6 if M.half >= 9.5 else 3.5
        for u, w in ((0.0, 0.15), (-lane, 0.06), (lane, 0.06)):
            if M.lanes < 2 and u != 0.0:
                continue
            _paint_dashes(M, u, w, a + 0.5, b - 0.5, 1.0, 1.0, WHITE, dist)
        for qx in (-1, 1):
            for qz in (-1, 1):
                x_on = _extends(X, p[0], qx)
                z_on = _extends(Z, p[1], qz)
                if x_on and z_on:
                    _corner(p, qx, qz, X, Z, dist)
                else:
                    # A plain square of pavement where the corner would be.
                    xa, xb = sorted((p[0] + qx * Z.half, p[0] + qx * Z.lot))
                    za, zb = sorted((p[1] + qz * X.half, p[1] + qz * X.lot))
                    if not x_on:
                        # X ends at Z from the other side: Z's pavement on
                        # this x side runs on across the square. Kerb too.
                        xa, xb = sorted((p[0] + qx * (Z.half + KERB_W), p[0] + qx * Z.lot))
                        za, zb = sorted((p[1], p[1] + qz * X.half))
                        _rect((dist, "sidewalk", 0), xa, xb, za, zb, PAVE_Y, 2.0)
                        ka, kb = sorted((p[0] + qx * Z.half, p[0] + qx * (Z.half + KERB_W)))
                        box((dist, "kerb", 0), ka, kb, 0.0, PAVE_Y, za, zb, scale=1.0)
                    else:
                        za, zb = sorted((p[1] + qz * (X.half + KERB_W), p[1] + qz * X.lot))
                        xa, xb = sorted((p[0], p[0] + qx * Z.half))
                        _rect((dist, "sidewalk", 0), xa, xb, za, zb, PAVE_Y, 2.0)
                        ka, kb = sorted((p[1] + qz * X.half, p[1] + qz * (X.half + KERB_W)))
                        box((dist, "kerb", 0), xa, xb, 0.0, PAVE_Y, ka, kb, scale=1.0)

    # A street's own end: kerbed across, the pavement round it.
    for s in plan.STREETS:
        for end in ("a", "b"):
            kind = s.ends.get(end)
            if kind not in ("court", "gate"):
                continue
            v = s.a if end == "a" else s.b
            out = -1 if end == "a" else 1
            mx, mz = _w(s, 0.0, v)
            dist = _d(mx, mz)
            _box_uv((dist, "kerb", 0), s, -s.lot, s.lot, 0.0, PAVE_Y, v, v + out * KERB_W)
            _rect_uv((dist, "sidewalk", 0), s, -s.lot, s.lot, min(v + out * KERB_W, v + out * 4.0),
                     max(v + out * KERB_W, v + out * 4.0), PAVE_Y, 2.0)

    # Drains along the kerbs and manholes in the lanes, every street.
    rng = random.Random(4242)
    for s in plan.STREETS:
        for a, b in plan.runs(s):
            v = a + 8.0
            side = 1
            while v < b - 8.0:
                x, z = _w(s, side * (s.half - 0.35), v)
                dd = _d(x, z)
                if s.axis == "z":
                    box((dd, "dark", 1), x - 0.3, x + 0.3, 0.0, 0.018, z - 0.5, z + 0.5, scale=0.5)
                else:
                    box((dd, "dark", 1), x - 0.5, x + 0.5, 0.0, 0.018, z - 0.3, z + 0.3, scale=0.5)
                if rng.random() < 0.45:
                    mx_, mz_ = _w(s, rng.choice((-1, 1)) * rng.uniform(1.0, s.half - 2.0), v + rng.uniform(-6, 6))
                    cylinder((_d(mx_, mz_), "metal", 1), mx_, mz_, 0.0, 0.02, 0.38, segs=14)
                v += rng.uniform(22.0, 34.0)
                side = -side


# Stretches whose lamps a district places itself (with the anchors the
# light shafts hang from): the avenue up to the plaza street, the garage
# street's middle.
OWN_LAMPS = {"avenue": (-172.0, 8.0), "garage": (-262.0, -186.0)}


def _yaw(dx, dz):
    return math.atan2(dx, dz)


def furniture():
    """What every street has: sodium lamps on tall arms out over the road,
    staggered down both kerbs; at each junction a signal mast on the right
    of every approach with its arm over the lanes, a signal box at each
    crossing's end, bollards round the corners."""
    rng = random.Random(777)
    for s in plan.STREETS:
        own = OWN_LAMPS.get(s.name)
        for a, b in plan.runs(s):
            for side in (-1, 1):
                v = a + CORNER_R + 8.0 + (0.0 if side > 0 else 15.0)
                while v < b - CORNER_R - 4.0:
                    if not (own and own[0] <= v <= own[1]):
                        x, z = _w(s, side * (s.half + 0.7), v)
                        dx, dz = (-side, 0.0) if s.axis == "z" else (0.0, -side)
                        P.place("lamp_sodium", x, PAVE_Y, z, _yaw(dx, dz))
                    v += 30.0
    for p, names in plan.junctions().items():
        X = [plan.BY_NAME[n] for n in names if plan.BY_NAME[n].axis == "x"][0]
        Z = [plan.BY_NAME[n] for n in names if plan.BY_NAME[n].axis == "z"][0]
        x0, x1, z0, z1 = plan.junction_box(p, names)
        # Approaches: along Z from the south (heading north, lanes on +x),
        # from the north (heading south, lanes on -x); along X from the west
        # (heading east, lanes on +z), from the east (heading west, lanes on
        # -z). The mast stands on the near right corner, arm over its lanes.
        if _extends(Z, p[1], 1):
            P.place("traffic_light", p[0] + Z.half + 0.8, PAVE_Y, z1 + CORNER_R + 4.4, _yaw(-1, 0))
        if _extends(Z, p[1], -1):
            P.place("traffic_light", p[0] - Z.half - 0.8, PAVE_Y, z0 - CORNER_R - 4.4, _yaw(1, 0))
        if _extends(X, p[0], -1):
            P.place("traffic_light", x0 - CORNER_R - 4.4, PAVE_Y, p[1] + X.half + 0.8, _yaw(0, -1))
        if _extends(X, p[0], 1):
            P.place("traffic_light", x1 + CORNER_R + 4.4, PAVE_Y, p[1] - X.half - 0.8, _yaw(0, 1))
        for qx in (-1, 1):
            for qz in (-1, 1):
                if not (_extends(X, p[0], qx) and _extends(Z, p[1], qz)):
                    continue
                cx, cz = p[0] + qx * (Z.half + CORNER_R), p[1] + qz * (X.half + CORNER_R)
                # Bollards round the corner's kerb, a signal box at each of
                # its two crossings.
                for t in (0.25, 0.5, 0.75):
                    ang = t * math.pi / 2
                    P.place("bollard", cx - qx * (CORNER_R - 0.6) * math.cos(ang), PAVE_Y, cz - qz * (CORNER_R - 0.6) * math.sin(ang))
                P.place("signal_box", p[0] + qx * (Z.half + 0.9), PAVE_Y, p[1] + qz * (X.half + CORNER_R + 0.4), _yaw(0, qz))
                P.place("signal_box", p[0] + qx * (Z.half + CORNER_R + 0.4), PAVE_Y, p[1] + qz * (X.half + 0.9), _yaw(qx, 0))
                if rng.random() < 0.5:
                    P.place("bin", p[0] + qx * (Z.lot - 0.8), PAVE_Y, p[1] + qz * (X.lot - 0.8))


build()
furniture()


# How busy each district's pavements are: people per 100 m of each walking
# line on a desktop (a phone takes about a third).
CROWD = {"avenue": 9.0, "canyon": 7.0, "mega": 5.0, "japantown": 10.0, "deck": 1.0, "plaza": 4.5, "corpo": 4.0,
         "afterlife": 5.0, "santo": 1.6, "far": 1.0}


# The west street's middle lanes keep clear of the ramp between these (z).
RAMP_CLEAR = (plan.RAMP_FOOT_Z - 8.0, plan.DECK_Z + 12.0)


def _deck_paths():
    """The two lanes that leave the ground, each a line of points with their
    heights (the road graph's): up the ramp in the west street's middle,
    round the turn and east over the deck down to the x 120 road, and the
    same the other way. Flat for the site: how many points, a speed, then
    x y z for each."""
    def smooth(t):
        t = min(1.0, max(0.0, t))
        return t * t * (3 - 2 * t)

    def ramp_y(z):
        return plan.DECK_Y * smooth((z - plan.RAMP_FOOT_Z) / (plan.DECK_Z - plan.RAMP_FOOT_Z))

    def deck_y(x):
        return plan.DECK_Y * (1.0 - smooth((x - plan.DECK_TOP_X1) / (plan.DECK_LAND_X - plan.DECK_TOP_X1)))

    def span(a, b, step):
        n = max(1, round(abs(b - a) / step))
        return [a + (b - a) * i / n for i in range(n + 1)]

    lane = 1.75
    foot, end = plan.RAMP_FOOT_Z - 6.0, plan.DECK_LAND_X - 1.0
    # East: south up the ramp's west lane, left onto the deck's south lane.
    r = 5.0
    cx, cz = plan.DECK_X0 - lane + r, plan.DECK_Z + lane - r
    east = [(plan.DECK_X0 - lane, ramp_y(z), z) for z in span(foot, cz, 4.0)]
    east += [(cx - r * math.cos(a), plan.DECK_Y, cz + r * math.sin(a)) for a in span(0.0, math.pi / 2, math.pi / 12)[1:]]
    east += [(x, deck_y(x), plan.DECK_Z + lane) for x in span(cx, end, 4.0)[1:]]
    # West: along the deck's north lane, right down the ramp's east lane.
    r = 3.0
    cx, cz = plan.DECK_X0 + lane + r, plan.DECK_Z - lane - r
    west = [(x, deck_y(x), plan.DECK_Z - lane) for x in span(end, cx, 4.0)]
    west += [(cx - r * math.sin(a), plan.DECK_Y, cz + r * math.cos(a)) for a in span(0.0, math.pi / 2, math.pi / 8)[1:]]
    west += [(plan.DECK_X0 + lane, ramp_y(z), z) for z in span(cz, foot, 4.0)[1:]]
    out = []
    for pts, v in ((east, 10.5), (west, 9.5)):
        out += [len(pts), v] + [round(c, 2) for p in pts for c in p]
    return out


def life():
    """The street's life, for the site to run (src/world/traffic.js and
    crowd.js): every lane of every street but the avenue's own (which the
    site has long driven), each as a run a car loops along fading in and
    out at its ends; every pavement as two walking lines with how many walk
    them; and cars parked in the streets' bays. Written as extras on three
    empties in the core GLB."""
    rng = random.Random(3131)
    lanes, walks, parked = [], [], []
    for s in plan.STREETS:
        for a, b in plan.runs(s):
            a0, b0 = a + CORNER_R + 5.0, b - CORNER_R - 5.0
            if b0 - a0 < 20.0:
                continue
            avenue_own = s.name == "avenue" and b > -186.0
            lane_w = (s.half - s.bay) / s.lanes
            if not avenue_own:
                for side in (-1, 1):
                    for k in range(s.lanes):
                        u = side * lane_w * (k + 0.5)
                        # The west street's middle lanes stop short of the
                        # ramp and start again past the deck: the ramp
                        # stands where they would run.
                        a1, b1 = a0, b0
                        if s.name == "west" and abs(u) < plan.RAMP_HALF:
                            if b1 <= RAMP_CLEAR[1]:
                                b1 = min(b1, RAMP_CLEAR[0])
                            elif a1 >= RAMP_CLEAR[0]:
                                a1 = max(a1, RAMP_CLEAR[1])
                        if b1 - a1 < 20.0:
                            continue
                        if s.axis == "z":
                            north = side > 0
                            x0, z0 = s.c + u, (b1 if north else a1)
                            dx, dz = 0.0, (-1.0 if north else 1.0)
                        else:
                            east = side > 0
                            x0, z0 = (a1 if east else b1), s.c + u
                            dx, dz = (1.0 if east else -1.0), 0.0
                        lanes.append([round(x0, 2), round(z0, 2), dx, dz, round(b1 - a1, 1), round(s.speed * rng.uniform(0.75, 1.1), 1)])
            # Pavements: a line near the kerb and one near the shops.
            if not (s.name == "avenue" and -172.0 <= a and b <= 60.0):
                mid = (a + b) / 2
                for side in (-1, 1):
                    for off in (s.half + KERB_W + 0.7, s.half + KERB_W + s.walk - 1.7):
                        u = side * off
                        x, z = _w(s, u, a + CORNER_R + 1.0)
                        dx, dz = (0.0, 1.0) if s.axis == "z" else (1.0, 0.0)
                        length = (b - a) - 2 * (CORNER_R + 1.0)
                        dens = CROWD.get(_d(*_w(s, u, mid)), 2.0)
                        n_hi = max(0, round(length / 100.0 * dens * rng.uniform(0.7, 1.3)))
                        walks.append([round(x, 2), round(z, 2), dx, dz, round(length, 1), n_hi, max(0, round(n_hi * 0.33))])
            # Cars parked along the bays now and then.
            if s.bay > 0 and not avenue_own:
                for side in (-1, 1):
                    v = a + CORNER_R + 8.0
                    while v < b - CORNER_R - 8.0:
                        if rng.random() < 0.35:
                            x, z = _w(s, side * (s.half - s.bay / 2), v)
                            yaw = (0.0 if side < 0 else math.pi) if s.axis == "z" else (math.pi / 2 if side > 0 else -math.pi / 2)
                            parked.append([round(x, 2), round(z, 2), round(yaw, 3)])
                        v += rng.uniform(6.0, 9.0)
    empty("anchor_traffic", (0, 0, 0), props={"lanes": [v for l in lanes for v in l], "paths": _deck_paths()})
    empty("anchor_crowd", (0, 0, 0), props={"walks": [v for w in walks for v in w]})
    empty("anchor_parked", (0, 0, 0), props={"cars": [v for c in parked for v in c]})


life()
