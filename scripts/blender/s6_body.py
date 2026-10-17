"""Ali's S6 body: the shell, hood, boot lid, greenhouse and glass. Executed in build_s6.py's context.

New topology for this site, lofted the way a body draughtsman fairs a car
from a lines plan: tables of offsets (half-breadths and heights at stations
and waterlines) for the C7 sedan, set to the 2013 US S6's published
dimensions (4,925 mm long, 1,874 mm wide, 1,468 mm high, 2,912 mm wheelbase,
919 mm and 1,096 mm overhangs) and checked against Ali's photos and Audi's
side and rear views. Every surface is a quad grid generated here from those
tables, so it subdivides cleanly and the panel gaps are real.

Patches, each a grid:
- the side band wraps the car in plan, from the front centre round the nose,
  down both sides and round the tail: its columns stand on the plan outline
  (fans round the nose and tail, stations along the sides), its rows run up
  each column from the sills, the bumpers' lower edges or the wheel arches,
  over the shoulder ("tornado") crease, to the top edge: the hood's shut
  line, the beltline under the side glass, or the boot lid's shut line;
- the hood, between its shut lines, on its own hinge;
- the boot lid, over the deck and down the rear face to the bumper;
- the greenhouse, station by station from the windscreen's base to the rear
  window's base: side glass band, pillar band, and the top (windscreen, roof,
  rear window), with the glass split into its own objects;
- the underbody and the four wheel wells.

Frame: X car left, -Y forward, Z up, metres, origin on the ground midway
between the axles; wheel centres at WHEEL_R (255/40 R19).
"""

# ---- dimensions (2013 US S6) and fairing tables ----

FACE_Y = -2.375      # front-most: 919 mm ahead of the front axle
TAIL_Y = 2.550       # rear-most: 1,096 mm behind the rear axle
HALF_W = .937        # half of the 1,874 mm body width
CF, CR = -1.85, 1.85 # centres of the nose and tail fans; stations between
ARCH_R = {'f': .386, 'r': .382}   # wheel-arch opening radii about the wheel centres
ARCH_Y = {'f': -WHEELBASE / 2, 'r': WHEELBASE / 2}

# Nose: the bumper face on the centreline, y by height, and how square the
# plan's corner is at each height (superellipse exponent).
NOSE_Y = [(.205, -2.335), (.24, -2.36), (.30, -2.372), (.40, -2.375), (.50, -2.371), (.60, -2.36), (.70, -2.338), (.80, -2.305)]
NOSE_N = [(.2, 2.6), (.3, 2.9), (.45, 2.9), (.6, 2.5), (.72, 2.0), (.82, 1.9)]
# Tail: the bumper face on the centreline and above it the lid face.
TAIL_FACE = [(.20, 2.50), (.24, 2.532), (.30, 2.542), (.40, 2.548), (.50, 2.550), (.62, 2.546), (.73, 2.534), (.80, 2.515), (.90, 2.493), (1.0, 2.474)]
TAIL_N = [(.25, 3.4), (.4, 3.4), (.6, 3.3), (.8, 4.0), (.95, 4.4)]

# Half-breadths of the lower body at the doors, by waterline: the turned
# sill, the S6 side skirt, the concave light-catcher line above it, then the
# door rising to full width under the shoulder crease.
LOWER_HB = [(.19, .905), (.205, .921), (.235, .929), (.33, .932), (.35, .926), (.395, .921), (.44, .925), (.52, .930), (.62, .933), (.76, .934), (1.0, .934)]
# Width added over the wheel arches (the C7's flares), by distance from the
# wheel centre along the car, and the waist at the doors.
FLARE = [(0, .009), (.3, .009), (.48, .004), (.7, 0)]
# The tornado line: the crease under the beltline, rising toward the tail.
CREASE_Z = [(-2.4, .785), (-1.85, .79), (-1.0, .805), (0, .825), (1.0, .845), (1.85, .87), (2.6, .905)]
# Bottom of the side band: sills and bumper lower edges (arches are cut separately).
BOTTOM_Z = [(-2.4, .205), (-2.0, .195), (-1.0, .19), (1.0, .195), (2.0, .205), (2.6, .195)]

# The top edge, front: the hood's leading edge across the grille and over the
# headlamps, then back along the hood's shut lines to the cowl.
HOOD_FRONT_Y = -2.300   # hood lip on the centreline
HOOD_EDGE = [(-2.30, .0), (-2.29, .20), (-2.27, .40), (-2.225, .62), (-2.14, .76), (-2.035, .815), (-1.85, .818), (-1.40, .805), (-0.985, .83)]
HOOD_EDGE_Z = [(-2.30, .785), (-2.27, .787), (-2.225, .80), (-2.14, .84), (-2.035, .865), (-1.85, .888), (-1.40, .935), (-0.985, .978)]
HOOD_CROWN_Z = [(-2.30, .79), (-2.22, .826), (-2.10, .866), (-1.95, .895), (-1.80, .918), (-1.60, .942), (-1.40, .962), (-1.20, .978), (-0.985, .99)]
COWL_Y = -0.985
# The beltline under the side glass: (y, half-breadth, height).
BELT = [(-0.95, .872, .983), (-0.6, .874, .992), (0, .874, 1.000), (0.6, .872, 1.007), (1.2, .868, 1.020), (1.6, .862, 1.033), (1.78, .84, 1.047)]
# The top edge, rear: the boot lid's shut lines, (y, half-breadth, height).
DECK_EDGE = [(1.92, .725, 1.098), (2.1, .72, 1.083), (2.3, .705, 1.066), (2.40, .69, 1.055)]
DECK_Y = 1.92        # the rear window's base, where the lid begins
LID_SEAM_X = .621    # the lid's sides on the rear face, at the tail lamps' split
LID_BOTTOM_Z = .735  # the lid's lower edge over the bumper
LID_LOW_X = .50      # below the lamps the lid's sides turn in to a rounded lower edge
LAMP_LOW_Z = .85     # the tail lamps' lower edge, where the lid's sides start to turn
# Feature lines that need a crisp edge, as (height, step): the S6's lower door
# light-catcher rising toward the tail (set in below it), the rear bumper's
# crease under the plate, the front bumper's lower lip.
DOOR_LINE_Z = [(-1.0, .425), (1.05, .47)]
LID_TOP = [(1.92, 1.122), (2.0, 1.112), (2.2, 1.088), (2.36, 1.068), (2.43, 1.062), (2.455, 1.05), (2.47, 1.03)]

# Greenhouse: windscreen base, header, rear window top and base on the centreline.
GLASS_BASE_Y = -0.93
CENTRE_TOP = [(-0.93, 1.000), (-0.8, 1.063), (-0.6, 1.180), (-0.4, 1.287), (-0.26, 1.366), (-0.15, 1.400), (0.0, 1.428), (0.25, 1.452),
              (0.5, 1.463), (0.8, 1.458), (1.0, 1.442), (1.12, 1.428), (1.3, 1.380), (1.5, 1.300), (1.7, 1.205), (1.84, 1.140), (1.92, 1.122)]
HEADER_Y, REAR_GLASS_TOP_Y = -0.25, 1.13
# The windscreen's side edge and the A-pillar's outer edge, then the roof rail
# and the rear window's side edge: (y, half-breadth, height).
GLASS_EDGE = [(-0.93, .745, 1.000), (-0.6, .705, 1.165), (-0.25, .645, 1.370), (0.2, .612, 1.415), (0.6, .610, 1.420), (1.0, .606, 1.405),
              (1.2, .600, 1.375), (1.5, .600, 1.275), (1.75, .605, 1.180), (1.92, .61, 1.122)]
# The window opening's top edge (DLO): from its front tip at the belt behind
# the mirror, up the A-pillar, along the roof rail, down to the quarter
# window's tip. Heights; the half-breadth follows the glass's tumblehome.
DLO_TOP = [(-0.80, 1.0), (-0.62, 1.07), (-0.40, 1.19), (-0.20, 1.31), (-0.05, 1.355), (0.2, 1.378), (0.6, 1.382), (0.9, 1.365), (1.05, 1.335),
           (1.2, 1.275), (1.35, 1.19), (1.48, 1.10), (1.56, 1.04)]
DLO_Y = (-0.80, 1.56)
B_PILLAR = (0.19, 0.30)     # gloss black between the doors' glass
QUARTER_BAR = (1.085, 1.11) # the bar between the rear door glass and the quarter window
# Door shut lines on the side band (y) and the door bottoms (height).
DOOR_CUTS = [-1.005, 0.245, 1.075]
DOOR_BOTTOM_Z = .345

# Where the body proves a part's provisional socket wrong (round 2 placed
# them from the dimensions alone, with 977 mm and 1,036 mm overhangs instead
# of the published 919 mm and 1,096 mm): (dx, dy, dz) metres, and a pitch
# about the socket's X axis in degrees (positive tips the top forward).
SOCKET_MOVES = {
    'RS_honeycomb_grille': ((0, .05, -.02), 9.0),
    'headlight_l': ((0, .05, .02), 0), 'headlight_r': ((0, .05, .02), 0),
    'lower_intake_l': ((-.03, .06, .025), 0), 'lower_intake_r': ((.03, .06, .025), 0),
    'taillight_l': ((0, .045, 0), 0), 'taillight_r': ((0, .045, 0), 0),
    'badge_rings_rear': ((0, .015, 0), 0), 'badge_S6_rear': ((0, .024, 0), 0),
    'rear_diffuser': ((0, .045, 0), 0), 'exhaust_tips': ((0, .045, 0), 0),
    # 2,086 mm across the mirrors.
    'mirror_left': ((-.088, 0, 0), 0), 'mirror_right': ((.088, 0, 0), 0),
}


def move_sockets(parts):
    # In a live session another scene may hold these names; match the base name.
    by_base = {key.split('.')[0]: root for key, root in parts.items()}
    for name, (d, pitch) in SOCKET_MOVES.items():
        root = by_base[name]
        root.location += Vector(d)
        root.rotation_euler.x += math.radians(pitch)


# ---- small maths ----


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(t):
    t = max(0., min(1., t))
    return t * t * (3 - 2 * t)


def table(rows, x, col=1):
    """interp() for tables with several value columns."""
    return interp([(r[0], r[col]) for r in rows], x)


def hermite(p0, p1, t0, t1, n):
    """n + 1 points on the cubic from p0 to p1 with end tangents t0, t1 (2D or 3D)."""
    p0, p1, t0, t1 = map(Vector, (p0, p1, t0, t1))
    out = []
    for i in range(n + 1):
        s = i / n
        h00, h10, h01, h11 = 2 * s ** 3 - 3 * s * s + 1, s ** 3 - 2 * s * s + s, -2 * s ** 3 + 3 * s * s, s ** 3 - s * s
        out.append(h00 * p0 + h10 * t0 + h01 * p1 + h11 * t1)
    return out


def superellipse(a, b, n, theta):
    """Radius of |cos|^n/a^n + |sin|^n/b^n = 1 at theta from the fan's axis."""
    c, s = abs(math.cos(theta)), abs(math.sin(theta))
    return (max(c / a, 1e-9) ** n + max(s / b, 1e-9) ** n) ** (-1 / n)


def resample(points, n):
    """n + 1 points evenly spaced along a polyline (by length)."""
    pts = [Vector(p) for p in points]
    acc = [0.]
    for a, b in zip(pts, pts[1:]):
        acc.append(acc[-1] + (b - a).length)
    total = acc[-1] or 1
    out = []
    j = 0
    for i in range(n + 1):
        d = total * i / n
        while j < len(pts) - 2 and acc[j + 1] < d:
            j += 1
        seg = acc[j + 1] - acc[j] or 1
        out.append(pts[j].lerp(pts[j + 1], (d - acc[j]) / seg))
    return out


def grid_faces(rows, cols, cyclic=False):
    """Quads of a rows x cols vertex grid laid out row-major."""
    fs = []
    for i in range(rows - 1):
        for j in range(cols if cyclic else cols - 1):
            a, b = i * cols + j, i * cols + (j + 1) % cols
            fs.append((a, b, b + cols, a + cols))
    return fs


def mirror_grid(points, rows, cols):
    """A half grid (x >= 0, its first column on the centreline) and its mirror image, welded on the centreline."""
    full = []
    for i in range(rows):
        row = points[i * cols:(i + 1) * cols]
        left = [Vector((-p.x, p.y, p.z)) for p in reversed(row[1:])]
        full.extend(left + list(row))
    return full, 2 * cols - 1


# ---- the plan outline and the side band's column sections ----


def half_breadth(y, z):
    """Lower body half-breadth at station y below the crease, with arch flares."""
    x = interp(LOWER_HB, z)
    d = min(abs(y - ARCH_Y['f']), abs(y - ARCH_Y['r']))
    x += interp(FLARE, d) * smoothstep((z - .42) / .2)
    # The front wings narrow a little toward the nose (his front photo).
    x -= .012 * smoothstep((-1.0 - y) / .85)
    # Below the lower door line the doors are set in, a light-catching edge.
    between = smoothstep((y + 1.03) / .08) * smoothstep((1.06 - y) / .08)
    x -= .007 * between * (1 - smoothstep((z - feature_z('m', y) + .004) / .008))
    return x


def feature_z(kind, y):
    """The height of a column's feature line: door light-catcher, rear bumper crease or front lower lip."""
    return {'m': interp(DOOR_LINE_Z, y), 'r': .60, 'f': .285}[kind]


def nose(z):
    # The lower lip stands 9 mm proud of the face above it.
    lip = .009 * (1 - smoothstep((z - feature_z('f', 0) + .004) / .008))
    return CF - interp(NOSE_Y, z) + lip, interp(NOSE_N, z)


def tail(z):
    # Under the plate the bumper's crease steps the face in by 8 mm.
    step = .008 * (1 - smoothstep((z - feature_z('r', 0) + .004) / .008))
    return interp(TAIL_FACE, min(z, LID_BOTTOM_Z + .2)) - CR - step, interp(TAIL_N, z)


def lid_edge_z(x):
    """Height of the boot lid's lower edge at half-breadth x: flat, then a rounded corner up to the lamps."""
    if x <= LID_LOW_X:
        return LID_BOTTOM_Z
    t = min(1., (x - LID_LOW_X) / (LID_SEAM_X - LID_LOW_X))
    return LID_BOTTOM_Z + (LAMP_LOW_Z - LID_BOTTOM_Z) * (1 - (1 - t ** 2.2) ** (1 / 2.2))


def lid_half_width(z):
    """The inverse: the lid face's half-width at height z."""
    if z >= LAMP_LOW_Z:
        return LID_SEAM_X
    lo, hi = LID_LOW_X, LID_SEAM_X
    for _ in range(30):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if lid_edge_z(mid) < z else (lo, mid)
    return lo


class Column:
    """One column of the side band: a fan ray round the nose or tail, or a station along the side."""

    def __init__(self, kind, value):
        self.kind, self.value = kind, value
        if kind == 'm':
            self.origin, self.dir = Vector((0, value, 0)), Vector((1, 0, 0))
        else:
            centre = CF if kind == 'f' else CR
            ahead = -1 if kind == 'f' else 1
            self.origin = Vector((0, centre, 0))
            self.dir = Vector((math.sin(value), ahead * math.cos(value), 0))

    def radius(self, z):
        """Distance from the column's origin to the lower body at height z."""
        if self.kind == 'm':
            return half_breadth(self.value, z)
        if self.kind == 'f':
            a, n = nose(z)
            b = half_breadth(CF, z)
        else:
            a, n = tail(z)
            b = half_breadth(CR, z)
        return superellipse(a, b, n, self.value)

    def plan(self, r):
        return self.origin + self.dir * r

    def station(self):
        """The y this column stands at, at full width (for the along-car tables)."""
        p = self.plan(self.radius(.6))
        return p.y

    def point(self, r, z):
        p = self.plan(r)
        return Vector((p.x, p.y, z))

    def radial(self, p):
        """Radius of a plan point along this column's direction."""
        return (Vector((p[0], p[1], 0)) - self.origin).dot(self.dir)


def ray_hit(column, outline):
    """Where this column's ray crosses a plan polyline [(x, y), ...]; returns (radius, t along outline)."""
    o, d = column.origin.to_2d(), column.dir.to_2d()
    best = None
    for i in range(len(outline) - 1):
        a, b = Vector(outline[i]), Vector(outline[i + 1])
        e = b - a
        den = d.x * e.y - d.y * e.x
        if abs(den) < 1e-12:
            continue
        w = a - o
        r = (w.x * e.y - w.y * e.x) / den
        u = (w.x * d.y - w.y * d.x) / den
        if -1e-9 <= u <= 1 + 1e-9 and r > 0 and (best is None or r < best[0]):
            best = (r, i + u)
    return best


def hood_outline():
    """The hood's plan outline (right half, x >= 0) from the lip on the centreline to the cowl."""
    return [(x, y) for y, x in HOOD_EDGE]


def rear_edge():
    """The side band's top edge round the tail (right half): the C-pillar's base
    turning in from the beltline, the boot lid's shut line, and its trailing
    corner down to the top of the lid's side on the rear face."""
    pts = []
    y0, x0, z0 = BELT[-1]
    for k in range(7):
        t = k / 6
        u = smoothstep(t)
        pts.append(Vector((lerp(x0, DECK_EDGE[0][1], u), lerp(y0, DECK_Y, t), lerp(z0, DECK_EDGE[0][2], u))))
    pts += [Vector((x, y, z)) for y, x, z in DECK_EDGE[1:]]
    face_y = lid_face_y(LID_SEAM_X, 1.0)
    pts += [Vector((.665, 2.42, 1.058)), Vector((.64, face_y - .005, 1.035)), Vector((LID_SEAM_X + .004, face_y, 1.0))]
    return pts


def top_edge(column):
    """The side band's top edge for a column: (point, inward tangent, kind)."""
    y = column.station()
    if column.kind == 'f' or y < COWL_Y:
        hit = ray_hit(column, hood_outline())
        if hit:
            r, t = hit
            i = min(int(t), len(HOOD_EDGE) - 2)
            yy = lerp(HOOD_EDGE[i][0], HOOD_EDGE[i + 1][0], t - i)
            p = column.plan(r)
            return Vector((p.x, p.y, interp(HOOD_EDGE_Z, yy))), 'hood'
    if column.kind == 'r' or y > BELT[-1][0]:
        if column.kind == 'r':
            p0 = column.plan(column.radius(.9))
            if p0.x < LID_SEAM_X:
                return None, 'lid'
        edge = rear_edge()
        hit = ray_hit(column, [(p.x, p.y) for p in edge])
        if hit:
            r, t = hit
            i = min(int(t), len(edge) - 2)
            p = column.plan(r)
            return Vector((p.x, p.y, lerp(edge[i].z, edge[i + 1].z, t - i))), 'deck'
        last = edge[-1]
        return Vector((last.x, last.y, last.z)), 'deck'
    if y < BELT[0][0]:
        t = smoothstep((y - COWL_Y) / (BELT[0][0] - COWL_Y))
        x = lerp(HOOD_EDGE[-1][1], BELT[0][1], t)
        z = lerp(HOOD_EDGE_Z[-1][1], BELT[0][2], t)
        return Vector((x, y, z)), 'cowl'
    return Vector((table(BELT, y), y, table(BELT, y, 2))), 'belt'


def arch_bottom(y, zb=.19):
    """Height of the wheel-arch lip above station y (0 outside the arches).

    The circle's ends are filleted down into the sill and bumper edges."""
    for code in 'fr':
        d = abs(y - ARCH_Y[code])
        r = ARCH_R[code]
        if d < .95 * r:
            return WHEEL_R + math.sqrt(r * r - d * d)
        if d < 1.1 * r:
            z95 = WHEEL_R + math.sqrt(r * r - (.95 * r) ** 2)
            return lerp(z95, zb, smoothstep((d - .95 * r) / (.15 * r)))
    return 0


SIDE_ROWS = {'under': 1, 'skirt': 4, 'door': 9, 'crease': 3, 'shoulder': 8}


def column_section(column):
    """The column's points from the under-turn to the top edge, and the index of the crease row."""
    y = column.station()
    edge, kind = top_edge(column)
    zb = interp(BOTTOM_Z, y)
    lip = arch_bottom(y, zb)
    zc = interp(CREASE_Z, y)
    lid_top = lid_edge_z(column.plan(column.radius(.8)).x)
    top_z = edge.z if edge is not None else lid_top
    zc = min(zc, top_z - .03)
    start = max(zb, lip)
    pts = []
    r = column.radius
    if lip > zb:
        # The arch lip rolls in toward the wheel.
        pts.append(column.point(r(start) - .034, start + .016))
        pts.append(column.point(r(start) + .002, start + .004))
    else:
        pts.append(column.point(r(start + .01) - .045, start))
        pts.append(column.point(r(start + .012) - .008, start + .004))
    lo = start + .012
    skirt = max(lo + .006, .34)
    door_top = max(skirt + .01, zc - .02)
    for k in range(1, SIDE_ROWS['skirt'] + 1):
        z = lerp(lo, skirt, k / SIDE_ROWS['skirt'])
        pts.append(column.point(r(z), z))
    zl = min(max(feature_z(column.kind, y), skirt + .012), door_top - .012)
    door = [lerp(skirt, door_top, k / SIDE_ROWS['door']) for k in range(1, SIDE_ROWS['door'] + 1)]
    door = sorted([z for z in door if abs(z - zl) > .012][:SIDE_ROWS['door'] - 2] + [zl - .004, zl + .004])
    while len(door) < SIDE_ROWS['door']:
        door.append(door_top)
    door.sort()
    for z in door:
        pts.append(column.point(r(z), z))
    # The crease: a tight row either side keeps the highlight crisp.
    # The crease stands a few millimetres proud of the hollow below it.
    pts.append(column.point(r(zc - .006) + .002, zc - .006))
    crease_index = len(pts)
    pts.append(column.point(r(zc) + .004, zc))
    if edge is None:
        # Under the boot lid: the bumper stops at the lid's lower edge.
        z1 = lid_top
        for k in range(1, SIDE_ROWS['shoulder'] + 2):
            z = lerp(zc, z1, k / (SIDE_ROWS['shoulder'] + 1))
            pts.append(column.point(r(min(z, zc)) - .02 * smoothstep((z - zc) / max(z1 - zc, 1e-3)), z))
        return pts, crease_index, kind
    # Over the shoulder to the top edge.
    rc = r(zc)
    re = column.radial(edge)
    up = Vector((-.42, 1)).normalized()
    inward = {'hood': Vector((-1, .32)), 'deck': Vector((-1, .22)), 'cowl': Vector((-.7, .7)), 'belt': Vector((-.42, 1))}[kind].normalized()
    span = (Vector((re, edge.z)) - Vector((rc, zc))).length
    curve = hermite((rc, zc), (re, edge.z), up * span * 1.1, inward * span * 1.1, SIDE_ROWS['shoulder'] + 1)
    for q in curve[1:]:
        pts.append(column.point(q.x, q.y))
    pts[-1] = Vector((edge.x, edge.y, edge.z)) if column.kind == 'm' else pts[-1]
    # A short flange turns down into the shut line's gap.
    last = pts[-1]
    pts.append(column.point(column.radial(last) - .003, last.z - .008))
    return pts, crease_index, kind


def side_columns():
    cols = []
    for i in range(0, 21):
        cols.append(Column('f', math.radians(90 * (1 - math.cos(math.pi / 2 * i / 21)))))
    stations = set()
    y = CF
    while y < CR - 1e-6:
        near_arch = min(abs(y - ARCH_Y['f']), abs(y - ARCH_Y['r'])) < ARCH_R['f'] + .05
        stations.add(round(y, 4))
        y += .028 if near_arch else .06
    for cut in DOOR_CUTS:
        stations |= {round(cut - .003, 4), round(cut, 4), round(cut + .003, 4)}
    for code in 'fr':
        for s in (-1, 1):
            stations.add(round(ARCH_Y[code] + s * ARCH_R[code] * .9999, 4))
    for b in (BELT[0][0], BELT[-1][0], COWL_Y, DECK_Y):
        stations.add(round(b, 4))
    cols += [Column('m', y) for y in sorted(stations)]
    tail = {round(math.radians(90 * math.cos(math.pi / 2 * i / 28)), 5) for i in range(1, 29)}
    # Either side of the boot lid's seam on the rear face, and between them
    # and the corner, so the lid's side edge is a column of its own.
    for x in (LID_SEAM_X - .004, LID_SEAM_X + .004, .65, .68):
        tail.add(round(tail_angle(x), 5))
    cols += [Column('r', a) for a in sorted(tail, reverse=True)]
    # Drop columns that stand within 12 mm of the last one kept: slivers shade badly.
    kept = []
    for c in cols:
        p = c.plan(c.radius(.6))
        if kept and (p - kept[-1][1]).length < .012 and abs(p.x - LID_SEAM_X) > .01:
            continue
        kept.append((c, p))
    return [c for c, _ in kept]


def tail_angle(x, z=.9):
    """The tail fan's angle whose column stands at half-breadth x at height z."""
    lo, hi = 0., math.pi / 2
    for _ in range(40):
        mid = (lo + hi) / 2
        if Column('r', mid).plan(Column('r', mid).radius(z)).x < x:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def build_side_band(parent):
    """The side band, right half built and mirrored; returns the body object."""
    cols = side_columns()
    sections = [column_section(c) for c in cols]
    rows = max(len(s[0]) for s in sections)
    # Columns under the boot lid have fewer rows: repeat their top point.
    vs = []
    for pts, _, _ in sections:
        pts = pts + [pts[-1]] * (rows - len(pts))
        vs.append(pts)
    # Right half (x >= 0) as rows of columns, then mirrored and welded on x = 0.
    points = []
    for k in range(rows):
        row = [vs[ci][k] for ci in range(len(cols))]
        points.append(row)
    half_v = [p for row in points for p in row]
    ncols = len(cols)
    verts, faces = [], []
    for side in (1, -1):
        base = len(verts)
        verts += [Vector((side * p.x, p.y, p.z)) for p in half_v]
        for f in grid_faces(rows, ncols):
            faces.append(tuple(base + i for i in (f if side > 0 else reversed(f))))
    obj = mesh('body_shell', [tuple(v) for v in verts], faces, paint, parent, True)
    weld(obj, .0008)
    return obj, cols, sections


def weld(obj, dist):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=dist * .5)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_area() < 1e-9], context='FACES')
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    return obj


# ---- the hood ----


def offset_polyline(points, d):
    """Move a plan polyline [(x, y)] d to its left (positive d) along its normals."""
    out = []
    for i, p in enumerate(points):
        a = Vector(points[max(i - 1, 0)])
        b = Vector(points[min(i + 1, len(points) - 1)])
        t = (b - a).normalized()
        out.append((p[0] - t.y * d, p[1] + t.x * d))
    return out


def coons(bottom, top, left, right, u, v):
    """Bilinear Coons patch from four boundary curves (functions of 0..1 returning Vectors)."""
    return ((1 - v) * bottom(u) + v * top(u) + (1 - u) * left(v) + u * right(v)
            - ((1 - u) * (1 - v) * bottom(0) + u * (1 - v) * bottom(1) + (1 - u) * v * top(0) + u * v * top(1)))


def along(points):
    """A function of 0..1 walking a polyline by length."""
    pts = [Vector(p) for p in points]
    acc = [0.]
    for a, b in zip(pts, pts[1:]):
        acc.append(acc[-1] + (b - a).length)
    total = acc[-1]

    def at(t):
        d = max(0., min(1., t)) * total
        for i in range(len(pts) - 1):
            if d <= acc[i + 1] or i == len(pts) - 2:
                seg = acc[i + 1] - acc[i] or 1
                return pts[i].lerp(pts[i + 1], (d - acc[i]) / seg)
    return at


def hood_halfwidth(y):
    """The hood's half-width at y from its outline (0 ahead of the lip)."""
    if y <= HOOD_EDGE[0][0]:
        return 0
    return interp([(yy, x) for yy, x in HOOD_EDGE], y)


def hood_height(x, y):
    """The hood's crowned surface: the centreline height falling to the shut line's.

    Two faint ridges run back from the grille's top corners (the C7's hood
    lines), a few millimetres proud of the crown between them.
    """
    zc = interp(HOOD_CROWN_Z, y)
    ze = interp(HOOD_EDGE_Z, y)
    w = hood_halfwidth(y)
    s = min(1., abs(x) / w) if w > 1e-4 else 0
    z = zc - (zc - ze) * s ** 2.3
    ridge_x = lerp(.30, .46, smoothstep((y + 2.25) / 1.2))
    z += .004 * math.exp(-((abs(x) - ridge_x) / .06) ** 2) * smoothstep((y + 2.28) / .15)
    return z


def build_hood(parent, gap=.003):
    """The hood between its shut lines, from its lip to the cowl, with a turned-down flange."""
    corner = 4   # HOOD_EDGE index where the front edge turns into the side
    front = [(x, y) for y, x in HOOD_EDGE[:corner + 1]]
    side = [(x, y) for y, x in HOOD_EDGE[corner:]]
    front = offset_polyline(front, gap)
    side = offset_polyline(side, gap)
    front_full = [(-x, y) for x, y in reversed(front[1:])] + front
    bottom = along(front_full)
    top = along([(-side[-1][0], COWL_Y - gap), (side[-1][0], COWL_Y - gap)])
    left = along([(-x, y) for x, y in side])
    right = along(side)
    U, V = 40, 34
    vs = []
    for j in range(V + 1):
        v = (j / V) ** 1.15
        for i in range(U + 1):
            p = coons(bottom, top, left, right, i / U, v)
            vs.append(Vector((p.x, p.y, hood_height(p.x, p.y))))
    rows = V + 1
    # The flange: the outline's ring turned down into the gap.
    ring = [i for i in range(U + 1)] + [j * (U + 1) + U for j in range(1, V + 1)] + \
           [V * (U + 1) + i for i in range(U - 1, -1, -1)] + [j * (U + 1) for j in range(V - 1, 0, -1)]
    faces = [tuple(f) for f in grid_faces(rows, U + 1)]
    faces = [tuple(reversed(f)) for f in faces]
    base = len(vs)
    for k in ring:
        p = vs[k]
        vs.append(Vector((p.x * (1 - .004 / max(abs(p.x), .2)), p.y, p.z - .014)))
    n = len(ring)
    for k in range(n):
        a, b = ring[k], ring[(k + 1) % n]
        faces.append((a, b, base + (k + 1) % n, base + k))
    hood = mesh('hood_panel', [tuple(v) for v in vs], faces, paint, parent, True)
    facing(hood, (0, 0, 1))
    return hood


# ---- the boot lid ----


def lid_face_y(x, z):
    """The lid's rear face: the tail's centreline face, curving forward toward the lamps."""
    return interp(TAIL_FACE, z) - .036 * (abs(x) / LID_SEAM_X) ** 3


def build_lid(parent, gap=.003):
    """The boot lid: from the rear window's base over the deck, round the lip and down the rear face.

    Its edges run on the quarters' shut line (rear_edge) to the trailing
    corner; below the lamps its sides turn in to a rounded lower edge.
    """
    U = 30
    edge = [p for p in rear_edge() if p.y >= DECK_Y - 1e-6]
    edge_x = [(p.y, p.x) for p in edge]
    edge_z = [(p.y, p.z) for p in edge]
    deck = [(y, interp(LID_TOP, y)) for y in [DECK_Y + gap + (2.43 - DECK_Y - gap) * k / 14 for k in range(15)]]
    lip = [(2.455, interp(LID_TOP, 2.455)), (2.468, interp(LID_TOP, 2.468))]
    top_face = edge[-1].z
    face = [(None, z) for z in [top_face - (top_face - LID_BOTTOM_Z - gap) * k / 14 for k in range(15)]]
    vs = []
    for y0, z0 in deck + lip + face:
        for i in range(U + 1):
            u = -1 + 2 * i / U
            if y0 is None:
                x = u * (lid_half_width(z0) - gap)
                y, z = lid_face_y(x, z0), z0
            else:
                half = interp(edge_x, y0) - gap
                x = u * half
                y = y0 + (lid_face_y(x, 1.0) - lid_face_y(0, 1.0)) * smoothstep((y0 - 2.30) / .14)
                z = lerp(z0, interp(edge_z, y0), abs(u) ** 2.4)
            vs.append(Vector((x, y, z)))
    rows = len(deck) + len(lip) + len(face)
    faces = [tuple(reversed(f)) for f in grid_faces(rows, U + 1)]
    lid = mesh('boot_lid', [tuple(v) for v in vs], faces, paint, parent, True)
    facing(lid, (0, .4, 1))
    return lid


PLATE_RECESS = (.235, .745, .915)   # half-width, bottom and top of the lid's stamped plate recess


def build_plate_recess(lid, parent):
    """The stamped recess in the lid's face with a blank US plate (no registration) in it."""
    w, z0, z1 = PLATE_RECESS
    outline = ccw(rounded([(-w, z0, .03), (w, z0, .03), (w, z1, .03), (-w, z1, .03)], 4))
    cut_opening(lid, [Vector((x, lid_face_y(x, z), z)) for x, z in outline], -.004, 1)
    floor = surface('plate_recess', outline, lambda x, z: lid_face_y(x, z) - .016, paint, parent, (0, 1, 0), 1, 0, -.017)
    plate = material('S6_plate_blank', 'dcdcd8', 0, .45)
    z = (z0 + z1) / 2
    y = lid_face_y(0, z) - .016
    holder = rounded_box('rear_plate_holder', (0, y + .004, z), (.33, .008, .175), satin_black, parent, .006, 1)
    blank = rounded_box('rear_plate_blank', (0, y + .009, z), (.305, .003, .152), plate, parent, .004, 1)
    return [floor, holder, blank]


# ---- the greenhouse ----


def tumble_x(xb, zb, z):
    """The side glass's half-breadth at height z above a belt point (its tumblehome)."""
    d = z - zb
    return xb - .56 * d - .3 * d * d


GREEN_COLS = {'side': 5, 'pillar': 4, 'top': 14}


def greenhouse_stations():
    ys = set()
    y = GLASS_BASE_Y
    while y < DECK_Y - 1e-6:
        ys.add(round(y, 4))
        y += .04
    for v in (DECK_Y, HEADER_Y, REAR_GLASS_TOP_Y, *DLO_Y, *B_PILLAR, *QUARTER_BAR):
        ys.add(round(v, 4))
    # Fine stations where the raked B-pillar and quarter bar cross them.
    for lo, hi in ((B_PILLAR[0] - .03, B_PILLAR[1] + .1), (QUARTER_BAR[0] - .03, QUARTER_BAR[1] + .16)):
        ys |= {round(lo + k * .01, 4) for k in range(int((hi - lo) / .01) + 1)}
    return sorted(ys)


def greenhouse_section(y):
    """Belt, DLO top, glass edge and centre top at station y, and the points between them."""
    b, _ = top_edge(Column('m', y))
    if DLO_Y[0] < y < DLO_Y[1]:
        zd = max(b.z, interp(DLO_TOP, y))
        d = Vector((tumble_x(b.x, b.z, zd), y, zd))
    else:
        d = b.copy()
    e = Vector((table(GLASS_EDGE, y), y, table(GLASS_EDGE, y, 2)))
    if d.z > e.z - .02:
        # Along the roof the rail sits just above and inside the window's top.
        e = Vector((min(e.x, d.x - .018), y, max(e.z, d.z + .035)))
    c = Vector((0, y, interp(CENTRE_TOP, y)))
    pts = []
    n = GREEN_COLS['side']
    for k in range(n):
        t = k / n
        z = lerp(b.z, d.z, t)
        x = tumble_x(b.x, b.z, z) if d.z > b.z + 1e-4 else lerp(b.x, d.x, t)
        pts.append(Vector((x, y, z)))
    n = GREEN_COLS['pillar']
    for k in range(n):
        t = k / n
        p = d.lerp(e, t)
        p.x += .006 * math.sin(math.pi * t)
        pts.append(p)
    n = GREEN_COLS['top']
    span = (Vector((e.x, e.z)) - Vector((0, c.z))).length
    tang = Vector((e.x - d.x, e.z - d.z))
    tang = (tang.normalized() if tang.length > 1e-4 else Vector((-.5, .5)).normalized())
    tang = (tang + Vector((-1, 0))).normalized()
    curve = hermite((e.x, e.z), (0, c.z), tang * span * .9, Vector((-1, 0)) * span * .9, n)
    for q in curve:
        pts.append(Vector((q.x, y, min(q.y, max(c.z, e.z)))))
    return pts


def build_greenhouse(parent, glass_mat, trim_mat):
    """The greenhouse grid; window faces go to their own object. Returns (shell, glass)."""
    ys = greenhouse_stations()
    sections = [greenhouse_section(y) for y in ys]
    cols = len(sections[0])
    half = [p for s in sections for p in s]
    full, wide = mirror_grid(half, len(ys), cols)
    faces = grid_faces(len(ys), wide)
    ns, npil = GREEN_COLS['side'], GREEN_COLS['pillar']
    shell_f, glass_f, trim_f = [], [], []
    for f in faces:
        i, j = divmod(f[0], wide)
        y = (ys[i] + ys[i + 1]) / 2
        # The band this face is in, counted from the belt (0) toward the centre.
        k = j - (cols - 1) if j >= cols - 1 else cols - 2 - j
        in_dlo = DLO_Y[0] < y < DLO_Y[1]
        pillar_b = bar = False   # drawn over the glass by build_pillar_trims()
        if k < ns:
            (trim_f if (pillar_b or bar) and in_dlo else glass_f if in_dlo else shell_f).append(f)
        elif k < ns + npil:
            (trim_f if k == ns and in_dlo else shell_f).append(f)
        else:
            windscreen = y < HEADER_Y
            rear = y > REAR_GLASS_TOP_Y
            if windscreen or rear:
                (trim_f if k == ns + npil else glass_f).append(f)
            else:
                shell_f.append(f)
    verts = [tuple(p) for p in full]
    shell = mesh('greenhouse', verts, [tuple(reversed(f)) for f in shell_f + trim_f], paint, parent, True)
    shell.data.materials.append(trim_mat)
    for p in shell.data.polygons[len(shell_f):]:
        p.material_index = 1
    glass_obj = mesh('window_glass', verts, [tuple(reversed(f)) for f in glass_f], glass_mat, parent, True)
    for obj in (shell, glass_obj):
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.to_mesh(obj.data)
        bm.free()
        weld(obj, .0008)
        facing(obj, (0, 0, 1))
    return shell, glass_obj


# ---- underbody and wheel wells ----


def build_underbody(parent, cols, sections, mat):
    ring = []
    for c, (pts, _, _) in zip(cols, sections):
        p = pts[0]
        x = p.x
        if c.kind == 'm' and arch_bottom(c.value):
            x = min(x, .60)
        ring.append(Vector((x, p.y, .2)))
    full = [Vector((-p.x, p.y, p.z)) for p in reversed(ring)] + ring
    obj = mesh('underbody', [tuple(p) for p in full], [tuple(range(len(full)))], mat, parent)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.001)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    facing(obj, (0, 0, -1))
    return obj


def build_wheel_wells(parent, mat):
    wells = []
    for code in 'fr':
        r = ARCH_R[code] + .012
        for sign in (1, -1):
            x_out = sign * (half_breadth(ARCH_Y[code], .6) - .03)
            x_in = sign * .60
            arc = []
            for k in range(25):
                phi = math.radians(-112 + 224 * k / 24)
                arc.append((ARCH_Y[code] + r * math.sin(phi), WHEEL_R + r * math.cos(phi)))
            vs = [(x, y, z) for y, z in arc for x in (x_out, x_in)]
            fs = [(2 * k, 2 * k + 1, 2 * k + 3, 2 * k + 2) for k in range(24)]
            # The inner wall closes the well behind the wheel.
            base = len(vs)
            vs += [(x_in, y, z) for y, z in arc] + [(x_in, ARCH_Y[code], WHEEL_R - .05)]
            fs += [(base + k, base + k + 1, base + 25) for k in range(24)]
            well = mesh('wheel_well_' + code + ('l' if sign > 0 else 'r'), vs, fs, mat, parent, True)
            facing(well, (0, 0, -1))
            wells.append(well)
    return wells


# ---- openings for the parts ----


def boundary_loop(obj):
    """The part mesh's largest open boundary, in world space, as an ordered (x, y, z) loop."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.transform(obj.matrix_world)
    edges = [e for e in bm.edges if len(e.link_faces) == 1]
    loops = []
    seen = set()
    for e in edges:
        if e.index in seen:
            continue
        loop = [e.verts[0]]
        v, cur = e.verts[1], e
        seen.add(e.index)
        while v is not loop[0]:
            loop.append(v)
            nxt = next((f for f in v.link_edges if f is not cur and len(f.link_faces) == 1 and f.index not in seen), None)
            if nxt is None:
                break
            seen.add(nxt.index)
            cur, v = nxt, nxt.other_vert(v)
        loops.append([vv.co.copy() for vv in loop])
    bm.free()
    area = lambda loop: abs(sum(a.x * b.z - b.x * a.z for a, b in zip(loop, loop[1:] + loop[:1]))) / 2
    return max(loops, key=area)


def cut_opening(obj, loop, margin, ahead):
    """Cut the outline (shrunk by margin) through the shell along Y and remove what is inside.

    ahead is -1 for an opening in the nose, +1 for one in the tail: only the
    shell's faces within the outline's own reach along Y are touched.
    """
    poly = ccw([(p.x, p.z) for p in loop])
    poly = offset(poly, margin)
    ys = [p.y for p in loop]
    y0, y1 = min(ys) - .06, max(ys) + .06
    xs, zs = [p[0] for p in poly], [p[1] for p in poly]
    box_ = (min(xs) - .03, max(xs) + .03, min(zs) - .03, max(zs) + .03)
    bm = bmesh.new()
    bm.from_mesh(obj.data)

    def region():
        out = []
        for f in bm.faces:
            c = f.calc_center_median()
            if y0 < c.y < y1 and box_[0] < c.x < box_[1] and box_[2] < c.z < box_[3] and f.normal.y * ahead > -.2:
                out.append(f)
        return out
    for a, b in zip(poly, poly[1:] + poly[:1]):
        faces = [f for f in region() if any(min(a[0], b[0]) - .05 < v.co.x < max(a[0], b[0]) + .05 and
                                            min(a[1], b[1]) - .05 < v.co.z < max(a[1], b[1]) + .05 for v in f.verts)]
        if not faces:
            continue
        geom = list({e for f in faces for e in f.edges}) + faces + list({v for f in faces for v in f.verts})
        normal = Vector((-(b[1] - a[1]), 0, b[0] - a[0])).normalized()
        bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-6, plane_co=(a[0], 0, a[1]), plane_no=normal)
    bm.normal_update()
    doomed = []
    for f in region():
        c = f.calc_center_median()
        if inside(c.x, c.z, poly):
            doomed.append(f)
    bmesh.ops.delete(bm, geom=doomed, context='FACES')
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def cut_openings(shell, lid, parts):
    """Openings in the nose for the grille, intakes and headlamps, and in the tail for the lamps."""
    by_base = {key.split('.')[0]: root for key, root in parts.items()}
    bpy.context.view_layer.update()

    def part_mesh(root, prefix):
        return next(o for o in root.children_recursive if o.type == 'MESH' and o.name.startswith(prefix))
    jobs = [('RS_honeycomb_grille', 'grille_frame', .006, -1, [shell])]
    for t in 'lr':
        jobs += [('lower_intake_' + t, 'intake_surround', .005, -1, [shell]),
                 ('headlight_' + t, 'headlamp_lens', .004, -1, [shell]),
                 ('taillight_' + t, 'taillamp_lens_outer', .003, 1, [shell]),
                 ('taillight_' + t, 'taillamp_lens_inner', .003, 1, [lid])]
    jobs.append(('rear_diffuser', 'diffuser_insert', .004, 1, [shell]))
    for name, prefix, margin, ahead, targets in jobs:
        loop = boundary_loop(part_mesh(by_base[name], prefix))
        for target in targets:
            cut_opening(target, loop, margin, ahead)


# ---- the cabin, at the detail the garage camera needs ----

def rounded_box(name, loc, size, mat, parent, radius=.02, segments=2):
    obj = box(name, loc, size, mat, parent, 0)
    mod = obj.modifiers.new('Rounded upholstery', 'BEVEL')
    mod.width = radius
    mod.segments = segments
    mod.limit_method = 'NONE'
    return obj


def seat(name, x, y, mat, stitch, parent, rear=False):
    """A sport seat (or one place of the bench): cushion, bolsters, back, headrest."""
    parts = []
    w = .5 if not rear else .46
    cz = .44 if not rear else .47
    parts.append(rounded_box(name + '_cushion', (x, y, cz), (w * .62, .5, .1), mat, parent, .03))
    for s in (-1, 1):
        parts.append(rounded_box(name + '_bolster', (x + s * w * .4, y, cz + .03), (w * .17, .5, .14), mat, parent, .035))
    back_y = y + .27
    back = rounded_box(name + '_back', (x, back_y, cz + .33), (w * .9, .12, .62), mat, parent, .04)
    back.rotation_euler.x = math.radians(-14 if not rear else -20)
    parts.append(back)
    # The S6's quilted centre panel, a shade lighter than the bolsters.
    panel = rounded_box(name + '_stitched_panel', (x, back_y - .065, cz + .33), (w * .48, .02, .48), stitch, parent, .008, 1)
    panel.rotation_euler.x = back.rotation_euler.x
    parts.append(panel)
    if not rear:
        head = rounded_box(name + '_headrest', (x, back_y + .1, cz + .74), (w * .52, .1, .2), mat, parent, .04)
        head.rotation_euler.x = math.radians(-10)
        parts.append(head)
    return parts


def build_cabin(parent):
    """Seats, dash, console, the steering wheel and the rsNAV screen, in dark leather and plastic.

    The head unit screen node stands where the factory MMI screen rises
    from the top of the dash; the steering wheel is the round three-spoke
    S wheel, on the left (US car).
    """
    leather = material('S6_interior_black_leather', '1b1c1e', 0, .55)
    stitch = material('S6_interior_stitched_leather', '2b2c2f', 0, .6)
    plastic = material('S6_interior_dark_plastic', '111214', 0, .5)
    trim = material('S6_interior_aluminium_inlay', '8d9195', .9, .32)
    carpet = material('S6_interior_carpet', '0d0e0f', 0, .95)
    screen = emitter('S6_head_unit_screen', '2a5d8c', .8, '0a0d12', .1)
    cabin = empty('cabin', (0, 0, 0), parent)
    box('cabin_floor', (0, .2, .30), (1.56, 2.4, .02), carpet, cabin, 0)
    box('cabin_parcel_shelf', (0, 1.66, 1.03), (1.4, .36, .02), carpet, cabin, 0)
    for s in (-1, 1):
        box('door_card', (s * .79, .18, .7), (.03, 2.1, .56), leather, cabin, 0)
    # Dash: a wide soft top under the windscreen, the vent strip, the binnacle.
    dash = rounded_box('dash_top', (0, -.74, .86), (1.5, .36, .2), plastic, cabin, .05)
    rounded_box('dash_lower', (0, -.62, .66), (1.46, .2, .26), plastic, cabin, .04)
    box('dash_vent_strip', (0, -.555, .79), (1.3, .012, .03), trim, cabin, .004)
    rounded_box('instrument_binnacle', (.37, -.63, .97), (.36, .16, .09), plastic, cabin, .03)
    # Centre console from the dash to the armrest, with the selector and MMI dial.
    rounded_box('centre_console', (0, -.25, .5), (.24, .78, .2), plastic, cabin, .04)
    box('console_inlay', (0, -.3, .605), (.18, .5, .012), trim, cabin, .003)
    cylinder('gear_selector', (0, -.15, .61), .025, .09, leather, cabin, 16)
    cylinder('mmi_dial', (0, .0, .61), .028, .02, trim, cabin, 20)
    # The steering wheel: a round rim, three spokes and the hub, on its column.
    wheel = empty('steering_wheel', (.37, -.47, .86), cabin)
    wheel.rotation_euler.x = math.radians(-24)
    tube('steering_rim', [(.18 * math.cos(t * math.pi / 16), 0, .18 * math.sin(t * math.pi / 16)) for t in range(32)], .016, leather, wheel, True, 8)
    for angle in (0, 180, 270):
        a = math.radians(angle)
        tube('steering_spoke', [(.04 * math.cos(a), 0, .04 * math.sin(a)), (.17 * math.cos(a), 0, .17 * math.sin(a))], .012, trim, wheel, sides=6)
    cylinder('steering_hub', (0, .02, 0), .055, .04, plastic, wheel, 20, 'Y')
    tube('steering_column', [(.37, -.47, .86), (.37, -.62, .8)], .03, plastic, cabin, sides=10)
    for s in (1, -1):
        seat('front_seat_' + ('l' if s > 0 else 'r'), s * .37, .02, leather, stitch, cabin)
    for x in (.42, 0, -.42):
        seat('rear_seat', x, .86, leather, stitch, cabin, rear=True)
    for x in (.42, -.42):
        rounded_box('rear_headrest', (x, 1.2, 1.05), (.24, .08, .16), leather, cabin, .03)
    # The rsNAV head unit, where the MMI screen rises from the top of the dash.
    unit = empty('head_unit_screen', (0, -.73, 1.02), cabin)
    unit.rotation_euler.x = math.radians(-8)
    rounded_box('head_unit_bezel', (0, 0, 0), (.25, .018, .15), plastic, unit, .008, 1)
    box('head_unit_display', (0, -.0095, 0), (.23, .002, .13), screen, unit, 0)
    return cabin, dash


# ---- details: handles, window trim, the plate ----

def build_details(parent):
    """Door handles and the bright window surrounds.

    The handles sit just above the tornado line near each door's rear edge
    (Audi's side view); the surrounds run along the window opening's top and
    the beltline.
    """
    trim = material('S6_window_trim_aluminium', 'c9ccd0', .95, .22)
    made = []
    for sign in (1, -1):
        for y, z in ((.04, .868), (.95, .885)):
            x = half_breadth(y, min(z, interp(CREASE_Z, y)))
            x -= .32 * max(0., z - interp(CREASE_Z, y))   # the shoulder leans in above the crease
            handle = rounded_box('door_handle', (sign * (x + .012), y, z), (.022, .19, .032), paint, parent, .01)
            cup = box('door_handle_cup', (sign * (x + .001), y - .005, z - .004), (.004, .12, .03), satin_black, parent, 0)
            made += [handle, cup]
        top, belt = [], []
        for y in [DLO_Y[0] + .01 + (DLO_Y[1] - DLO_Y[0] - .02) * k / 60 for k in range(61)]:
            pts = greenhouse_section(y)
            n = GREEN_COLS['side']
            b, d = pts[0], pts[n]
            top.append(Vector((sign * (d.x + .004), y, d.z + .002)))
            belt.append(Vector((sign * (b.x + .004), y, b.z + .001)))
        made.append(tube('window_trim_top', top, .0045, trim, parent, sides=6))
        made.append(tube('window_trim_belt', belt, .004, trim, parent, sides=6))
    return made


# ---- the S6's bumper features, shut lines and lamps conformed to the body ----

def surface_tree(objs):
    bm = bmesh.new()
    for o in objs:
        part = bmesh.new()
        part.from_mesh(o.data)
        part.transform(o.matrix_world)
        data = bpy.data.meshes.new('_tree')
        part.to_mesh(data)
        part.free()
        bm.from_mesh(data)
        bpy.data.meshes.remove(data)
    tree = BVHTree.FromBMesh(bm)
    bm.free()
    return tree


def on_body(tree, x, y, z, along):
    """The body surface hit from outside along an axis ('x' or 'y', sign of the approach): (point, normal)."""
    if along == 'y':
        o, d = Vector((x, y - 2 * math.copysign(1, y), z)), Vector((0, math.copysign(1, y), 0))
    else:
        o, d = Vector((x + 2 * math.copysign(1, x), y, z)), Vector((-math.copysign(1, x), 0, 0))
    hit, normal, _, _ = tree.ray_cast(o, d, 4)
    return hit, normal


def conform_headlamps(parts, tree):
    """Lay each headlamp's surfaces on the body's own nose, keeping their relief and outline.

    The lamp was built on head_surface(); every vertex keeps its depth from
    that surface but measured from the body instead, so the housing folds into
    the wing and hood corner instead of standing proud of it.
    """
    by_base = {key.split('.')[0]: root for key, root in parts.items()}
    for name in ('headlight_l', 'headlight_r'):
        root = by_base[name]
        dy = SOCKET_MOVES[name][0][1]
        for obj in [o for o in root.children_recursive if o.type == 'MESH']:
            world = obj.matrix_world
            inv = world.inverted()
            for v in obj.data.vertices:
                p = world @ v.co
                hit, _ = on_body(tree, p.x, -3, p.z, 'y')
                if hit is not None:
                    base = head_surface(p.x, p.z) + dy
                    p.y = hit.y + (p.y - base)
                    v.co = inv @ p
            obj.data.update()


def build_bumper_features(parent, tree):
    """What makes the bumpers an S6's: the bright ledge over each intake, the lower lip
    and its black centre slot, washer, tow-eye and sensor covers (his front photo), and
    the rear reflectors."""
    made = []
    covers = []
    for sign in (1, -1):
        d, _ = SOCKET_MOVES['lower_intake_' + ('l' if sign > 0 else 'r')]
        top = [(x + d[0], z + d[2] + .013) for x, z in from_unit(INTAKE[:7], *INTAKE_X, *INTAKE_Z, sign)]
        ledge = []
        for x, z in top:
            hit, _ = on_body(tree, x, -3, z, 'y')
            if hit is not None:
                ledge.append(Vector((x, hit.y - .004, z)))
        if len(ledge) > 2:
            made.append(tube('intake_ledge', smooth_path(ledge, 4), .0065, paint, parent, sides=8))
        covers += [('headlamp_washer_cover', sign * .775, .605, .075, .10), ('parking_sensor', sign * .83, .50, .024, .024)]
    covers.append(('tow_eye_cover', -.60, .505, .055, .07))
    lip = []
    for k in range(41):
        x = -.82 + 1.64 * k / 40
        hit, _ = on_body(tree, x, -3, feature_z('f', 0) - .006, 'y')
        if hit is not None:
            lip.append(Vector((x, hit.y - .003, hit.z)))
    made.append(tube('lower_lip_edge', lip, .006, paint, parent, sides=8))
    hit, _ = on_body(tree, 0, -3, .245, 'y')
    made.append(rounded_box('lower_centre_slot', (0, hit.y - .002, .245), (.72, .016, .026), satin_black, parent, .006, 1))
    outline = material('S6_cover_shut_line', '202224', 0, .6)
    for name, x, z, w, h in covers:
        hit, normal = on_body(tree, x, -3, z, 'y')
        if hit is None:
            continue
        back = rounded_box(name + '_line', (0, 0, 0), (w + .006, .002, h + .006), outline, parent, min(w, h) * .3, 1)
        cover = rounded_box(name, (0, 0, 0), (w, .002, h), paint, parent, min(w, h) * .3, 1)
        for obj, lift in ((back, .0004), (cover, .0018)):
            obj.location = hit + normal * lift
            obj.rotation_euler.z = math.atan2(-normal.x, -normal.y)
        made += [back, cover]
    for sign in (1, -1):
        hit, normal = on_body(tree, sign * .74, 3, .44, 'y')
        if hit is not None:
            r = rounded_box('rear_reflector', (0, 0, 0), (.11, .006, .022), lens_red, parent, .006, 1)
            r.location = hit + normal * .002
            r.rotation_euler.z = math.atan2(normal.x, normal.y)
            made.append(r)
    return made


def build_shut_lines(parent, tree):
    """The doors' shut lines drawn on the side: the front door behind the wing, the
    raked B-pillar cut, the rear door's rear edge coming down and round the rear
    arch, and the door bottoms over the sill."""
    line = material('S6_shut_line', '0c0d0e', 0, .7)
    made = []
    r = ARCH_R['r'] + .035
    for sign in (1, -1):
        paths = []
        belt = lambda y: table(BELT, y, 2) - .012
        paths.append([(-1.005, belt(-1.005)), (-1.0, .6), (-0.995, DOOR_BOTTOM_Z)])
        paths.append([(0.245, DOOR_BOTTOM_Z), (0.258, .7), (0.268, belt(.268))])
        rear = [(1.10, belt(1.10)), (1.10, .80)]
        for k in range(1, 13):
            a = math.radians(-58 - 30 * k / 12)
            rear.append((ARCH_Y['r'] + r * math.sin(a), WHEEL_R + r * math.cos(a)))
        rear.append((rear[-1][0] - .05, DOOR_BOTTOM_Z))
        paths.append(rear)
        paths.append([(-0.995, DOOR_BOTTOM_Z), (rear[-1][0], DOOR_BOTTOM_Z)])
        for path in paths:
            if len(path) > 3:
                dense = [tuple(p) for p in smooth_path(path, 4)]
            else:
                dense = [tuple(Vector(a).lerp(Vector(b), t / 8)) for a, b in zip(path, path[1:]) for t in range(8)] + [path[-1]]
            pts = []
            for y, z in dense:
                hit, normal = on_body(tree, sign, y, z, 'x')
                if hit is not None:
                    pts.append(hit - normal * .0007)
            if len(pts) > 1:
                made.append(tube('door_shut_line', pts, .0021, line, parent, sides=5))
    return made


def build_pillar_trims(parent):
    """The gloss black B-pillar and the quarter window's bar, raked back up the glass
    (Audi's side view), laid over the side glass as clean strips."""
    made = []
    for sign in (1, -1):
        for name, (y0, y1), lean in (('B_pillar_trim', B_PILLAR, .2), ('quarter_window_bar', QUARTER_BAR, .3)):
            vs = []
            for k in range(9):
                t = k / 8
                for y_at_belt in (y0, y1):
                    b, _ = top_edge(Column('m', y_at_belt))
                    z_top = interp(DLO_TOP, y_at_belt + lean * .4)
                    z = lerp(b.z + .004, z_top, t)
                    y = y_at_belt + lean * (z - b.z)
                    bb, _ = top_edge(Column('m', y))
                    vs.append((sign * (tumble_x(bb.x, bb.z, z) + .003), y, z))
            fs = [(2 * k, 2 * k + 1, 2 * k + 3, 2 * k + 2) for k in range(8)]
            made.append(facing(mesh(name, vs, fs, gloss_black, parent, True), (sign, 0, 0)))
    return made
