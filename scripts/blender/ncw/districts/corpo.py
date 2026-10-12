from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw.kit import _mass_sides
from ncw.districts.plaza import CROSS_Z0
from ncw.districts import corpo_kit as K
from ncw import props as PR

# ---------------------------------------------------------------------------
# CORPO ROW. One tower per role, in experience.js order, west to east along a
# wide boulevard: a glass tower over a lit double-height lobby, stepped back
# once if it is tall, with a light fin up each corner and a dark glass crown.
# The fins and the band round the crown are one mesh per tower
# (crown_<slug>) the site lights in the organisation's own colour; the
# crown's face to the boulevard carries the organisation's logo
# (logo_<slug>, a slot the site sizes to the mark), and so does its face to
# the east (logo_<slug>_e), which the rooftop looks at; a vertical sign
# (sign_tower_<slug>) carries its name as type.
# ---------------------------------------------------------------------------
CO = "corpo"
TOWERS = [
    ("philips-zero-touch", 128), ("pinnatec-auto", 112), ("pawtograder", 104),
    ("aws-cloudformation", 146), ("top-choice-realty", 98), ("robert-defalco-realty", 108),
    ("northeastern", 124),
]
BOULEVARD_Z = -330.0
CORPO_X0 = 150.0
LOBBY_H = 8.0
CROWN_H = 16.0
# The boulevard and the x 120 road are streets.py's.


def notched(cx, cz, h, n):
    """A square plan with its corners cut back n: the outline, walked with
    the outside on the left of each edge (the order _mass_sides uses)."""
    a, b = h - n, h
    pts = [(-a, b), (a, b), (a, a), (b, a), (b, -a), (a, -a), (a, -b), (-a, -b),
           (-a, -a), (-b, -a), (-b, a), (-a, a)]
    return [(cx + x, cz + z) for x, z in pts]


def notched_roof(key, cx, cz, h, n, y):
    """The roof of a notched plan: the middle and the four arms."""
    a = h - n
    for x0, x1, z0, z1 in ((-a, a, -a, a), (-a, a, a, h), (-a, a, -h, -a), (a, h, -a, a), (-h, -a, -a, a)):
        quad(key, (cx + x0, y, cz + z1), (cx + x1, y, cz + z1), (cx + x1, y, cz + z0), (cx + x0, y, cz + z0),
             ((0, 0), ((x1 - x0) / 4, 0), ((x1 - x0) / 4, (z1 - z0) / 4), (0, (z1 - z0) / 4)))


def curtain(cx, cz, h, n, y0, y1, col, roof=True):
    """A glass curtain wall on a notched plan. The site's corporate shader
    draws its floors, mullions and light from world position; the colour is
    the tower's lit fraction, its warmth and a seed."""
    walls((CO, "corporate", 0), notched(cx, cz, h, n), y0, y1, col)
    if roof:
        notched_roof((CO, "roof", 0), cx, cz, h, n, y1)


def lit_box(verts, faces, uvs, x0, x1, y0, y1, z0, z1, u):
    """A box's four sides into a mesh being built by hand, every corner at
    u (the site's towers shader reads u as what the piece is: 2 a fin, 1 a
    blade of the crown's screen, 0.5 a band)."""
    for a_, b_, c_, d_, _ in _mass_sides(x0, x1, z0, z1, y0, y1).values():
        base = len(verts)
        verts.extend(P(*q) for q in (a_, b_, c_, d_))
        faces.append((base, base + 1, base + 2, base + 3))
        uvs.extend([(u, 0), (u, 0), (u, 1), (u, 1)])


def parapet(key, cx, cz, h, n, y, height=1.1, t=0.35):
    """A low wall round a notched roof's edge."""
    a = h - n
    for x0, x1, z0, z1 in ((-a, a, h - t, h), (-a, a, -h, -h + t), (h - t, h, -a, a), (-h, -h + t, -a, a),
                           (a - t, a, a, h), (-a, -a + t, a, h), (a - t, a, -h, -a), (-a, -a + t, -h, -a),
                           (a, h, a - t, a), (a, h, -a, -a + t), (-h, -a, a - t, a), (-h, -a, -a, -a + t)):
        box(key, cx + x0, cx + x1, y, y + height, cz + z0, cz + z1, scale=1.5)


# ---------------------------------------------------------------------------
# Seven towers, seven buildings. What holds for all of them: the 26 m plot,
# the lobby and canopy at its foot, the height, where the shaft steps (so
# the crown, the logo on it and the name sign stand where they stood), and
# the braindance's reading of each as a box x +-12.5 round its centre whose
# front is the plane z -347: nothing stands proud of that plane (fins and
# screens are flush with it, the glass set back behind them).
#   philips      steel fins on every face, slit windows between, two setbacks
#   pinnatec     a faceted monolith, two broad chamfers to the west, a band
#                of adverts up the one the boulevard sees
#   pawtograder  a slab split by a lit slot down its front and back, over the
#                open server hall
#   aws          a battered obelisk in three stages, lit ledges, its name on
#                a pylon standing off the wall
#   top-choice   close concrete fins, warm slits, two lit sky floors, a
#                blade of adverts out of its east flank
#   defalco      a dark slab with two corners carved out as lit sky lobbies
#   northeastern three stepped drums with ribs, a ring of screens, a lift
#                core up its front carrying the name
# ---------------------------------------------------------------------------
TOWER_FORMS = {
    "philips-zero-touch": dict(kind="fins", notch=1.8, steps=(0.58, 0.82), screen=True, mast=22.0),
    "pinnatec-auto": dict(kind="facet", notch=2.4, steps=(0.66,), screen=False, mast=0.0),
    "pawtograder": dict(kind="slot", notch=1.4, steps=(), screen=True, mast=0.0),
    "aws-cloudformation": dict(kind="taper", notch=2.0, steps=(0.5, 0.74), screen=True, mast=30.0),
    "top-choice-realty": dict(kind="slits", notch=1.6, steps=(), screen=False, mast=0.0),
    "robert-defalco-realty": dict(kind="carved", notch=2.2, steps=(0.7,), screen=True, mast=0.0),
    "northeastern": dict(kind="drum", notch=1.6, steps=(0.62, 0.84), screen=False, mast=18.0),
}
INSET = 2.4
# The braindance's "room" is the first tower's lower floors: its lobby glass
# stands this far back, behind a hall open to the boulevard with a gallery
# in it (corpo_north.py builds the hall).
ROOM = {"philips-zero-touch": 5.0}
# The braindance's "grader" is the third tower's lower 22 m, read from the
# boulevard: its floors from the lobby's roof to HALL's top stand open to the
# street as a hall this deep, INSIDE the tower's plan (corpo_north.py builds
# the racks in it), and its canopy does not reach past its front.
HALL = {"pawtograder": (22.0, 4.2)}
# Flat screens at mid height (mH2wmyeiIpA@143), clear of each tower's name
# sign: (face, metres along it from its middle, height of its middle, width,
# height). Those on a front lie flat on it.
SCREENS = {
    "philips-zero-touch": (("+z", -5.0, 44.0, 10.0, 6.0), ("-x", 1.0, 62.0, 9.0, 5.6)),
    "pinnatec-auto": (("+z", -2.5, 31.0, 9.0, 5.4), ("-x", -1.0, 52.0, 7.6, 10.0)),
    "pawtograder": (("+z", -7.5, 58.0, 9.0, 6.0), ("+x", 1.0, 38.0, 9.0, 5.6)),
    "aws-cloudformation": (("+z", -4.5, 50.0, 10.0, 6.0), ("-x", 0.0, 34.0, 8.0, 11.0)),
    "top-choice-realty": (("+z", -4.0, 51.0, 11.0, 6.6),),
    "robert-defalco-realty": (("+z", -4.0, 55.0, 10.0, 6.0), ("-x", 1.0, 30.0, 9.0, 5.6)),
    "northeastern": (),
}
FLOOR0, FLOOR = 8.0, 3.8          # the curtain wall's floors (the corporate shader's)
NAVY = (0.045, 0.055, 0.075, 1.0)
CAST = (0.15, 0.145, 0.14, 1.0)


def rect(cx, cz, h):
    return [(cx - h, cz + h), (cx + h, cz + h), (cx + h, cz - h), (cx - h, cz - h)]


def notched4(cx, cz, h, sw, se=None, ne=None, nw=None):
    """A square plan with each corner cut back square by its own measure
    (edges 10 and 11 are the south-west cut's walls, 4 and 5 the
    north-east's). Every tower keeps its front corners cut back at least as
    far as they were: the braindance's cameras look past them down the row."""
    se = sw if se is None else se
    ne = se if ne is None else ne
    nw = sw if nw is None else nw
    pts = [(-h + sw, h), (h - se, h), (h - se, h - se), (h, h - se), (h, -h + ne), (h - ne, -h + ne), (h - ne, -h), (-h + nw, -h),
           (-h + nw, -h + nw), (-h, -h + nw), (-h, h - sw), (-h + sw, h - sw)]
    return [(cx + x, cz + z) for x, z in pts]


def chamfered(cx, cz, h, sw, se=None, ne=None, nw=None):
    """A square plan, each corner cut at 45 degrees by its own measure."""
    se = sw if se is None else se
    ne = se if ne is None else ne
    nw = sw if nw is None else nw
    pts = [(-h + sw, h), (h - se, h), (h, h - se), (h, -h + ne), (h - ne, -h), (-h + nw, -h), (-h, -h + nw), (-h, h - sw)]
    return [(cx + x, cz + z) for x, z in pts]


def ngon(cx, cz, apothem, n=16):
    """A regular plan with a flat face to the boulevard."""
    rad = apothem / math.cos(math.pi / n)
    return [(cx + rad * math.sin((i - 0.5) * 2 * math.pi / n), cz + rad * math.cos((i - 0.5) * 2 * math.pi / n)) for i in range(n)]


skin = K.skin          # (panels of curtain wall, lit in runs of floors: corpo_kit.py)
F = K.floor_at
# Sky lobbies: floors lit from end to end round each tower, at heights of
# its own (bands of the curtain wall's floors).
BELTS = {
    "philips-zero-touch": ((F(13), F(14)), (F(23), F(24))),
    "pinnatec-auto": ((F(15), F(16)), (F(21), F(23))),
    "pawtograder": ((F(11), F(12)), (F(23), F(24))),
    "aws-cloudformation": ((F(16), F(17)), (F(25), F(26)), (F(33), F(34))),
    "top-choice-realty": (),
    "robert-defalco-realty": ((F(22), F(23)),),
    "northeastern": ((F(16), F(17)), (F(27), F(28))),
}
# What each tower carries between its lobby's screens and its crown, on the
# faces the boulevard and the Experience shot see (south and west) and a
# little on the east: (kind, face, metres along it from its middle, height
# of its middle, ...). "word" a column of characters (size, times its
# size, which); "mark" a pictogram in a light box (times its size, which);
# "ad" an advert (width, height). On a front they lie flat on it.
UPPER = {
    "philips-zero-touch": (("word", "+z", -5.2, 89.5, "bl", 3.2, 0), ("ad", "-x", -2.5, 92.0, 9.5, 6.0), ("mark", "+z", 2.6, 117.0, 3.6, 0),
                           ("ad", "+x", -1.0, 66.0, 7.0, 10.0)),
    "pinnatec-auto": (("ad", "+z", -0.4, 86.5, 12.0, 6.6), ("mark", "+z", 4.6, 100.5, 3.4, 1), ("word", "-x", 0.6, 93.0, "bl", 2.6, 1),
                      ("ad", "+x", 0.0, 60.0, 9.0, 5.6)),
    "pawtograder": (("word", "+z", -7.0, 95.5, "bm", 3.4, 0), ("ad", "-x", -6.8, 62.0, 7.2, 10.4), ("mark", "+x", 3.0, 88.0, 4.0, 2)),
    "aws-cloudformation": (("ad", "+z", -2.4, 88.0, 11.0, 6.4), ("word", "+z", 1.8, 127.0, "bl", 2.9, 2), ("mark", "-x", 0.0, 96.0, 4.2, 3),
                           ("ad", "-x", 0.6, 124.0, 6.4, 9.6), ("ad", "+x", 0.0, 92.0, 9.0, 5.8)),
    "top-choice-realty": (("word", "+z", -7.4, 80.5, "bl", 2.8, 3), ("ad", "-x", 0.0, 78.0, 12.0, 6.6), ("mark", "-x", -6.5, 91.0, 3.2, 4)),
    "robert-defalco-realty": (("ad", "+z", -1.2, 90.0, 10.4, 6.2), ("word", "-x", 1.0, 91.5, "bl", 2.7, 4), ("mark", "+z", -8.0, 68.0, 3.6, 5),
                              ("ad", "+x", 1.0, 84.0, 9.0, 5.6)),
    "northeastern": (("word", "+z", 0.0, 90.0, "bm", 3.3, 1), ("mark", "+z", 0.0, 113.5, 2.6, 6)),
}


def flat(outline, y, mat="roof", up=True):
    """A convex outline as a roof (or, facing down, a soffit)."""
    pts = [(x, y, z) for x, z in (outline if up else outline[::-1])]
    poly((CO, mat, 0), pts, [(x / 4, z / 4) for x, _, z in pts])


def ledge(outline, y, height=1.0):
    """A low wall round a setback's edge."""
    cx = sum(x for x, _ in outline) / len(outline)
    cz = sum(z for _, z in outline) / len(outline)
    inner = [(cx + (x - cx) * 0.972, cz + (z - cz) * 0.972) for x, z in outline]
    walls((CO, "metal", 1), outline, y, y + height, (1, 1, 1, 1))
    walls((CO, "metal", 1), inner[::-1], y, y + height, (1, 1, 1, 1))


def fin_rows(tx, tz, h, out, y0, y1, step, wide, key, col, notch):
    """Fins down all four faces of a square of half h whose corners are cut
    back `notch`, proud of glass set `out` behind them."""
    span = 2 * (h - notch) - wide
    n = max(2, int(span // step))
    for i in range(n + 1):
        v = -span / 2 + span * i / n
        for x0, x1, z0, z1 in ((tx + v - wide / 2, tx + v + wide / 2, tz + h - out, tz + h),
                               (tx + v - wide / 2, tx + v + wide / 2, tz - h, tz - h + out),
                               (tx + h - out, tx + h, tz + v - wide / 2, tz + v + wide / 2),
                               (tx - h, tx - h + out, tz + v - wide / 2, tz + v + wide / 2)):
            box(key, x0, x1, y0, y1, z0, z1, scale=2.0, col=col)


def lit_quad(verts, faces, uvs, a, b, y0, y1, u, out=0.06):
    """A vertical band of the tower's own light from a to b (x, z), facing
    the left of that walk, into the crown mesh."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    d = math.hypot(dx, dz) or 1.0
    nx, nz = -dz / d * out, dx / d * out
    base = len(verts)
    verts.extend(P(*q) for q in ((a[0] + nx, y0, a[1] + nz), (b[0] + nx, y0, b[1] + nz), (b[0] + nx, y1, b[1] + nz), (a[0] + nx, y1, a[1] + nz)))
    faces.append((base, base + 1, base + 2, base + 3))
    uvs.extend([(u, 0), (u, 0), (u, 1), (u, 1)])


def advert(cx, cy, cz, w, h, yaw, pick, seed=0.31, depth=0.12):
    """One of the city's adverts by number (eight wide, four tall), in a
    frame. Boards sharing a seed change together, so a wall or a band of
    them given different numbers never shows one advert twice."""
    K.bb(cx, cy, cz, w, h, yaw, (0.06, (pick % 8 + 0.5) / 8.0, seed, 1.0))
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box((CO, "board_frame", 0), cx - nx * (depth / 2 + 0.02), cy, cz - nz * (depth / 2 + 0.02), w + 0.3, h + 0.3, depth, yaw, scale=1.0)


for i, (slug, height) in enumerate(TOWERS):
    tx = CORPO_X0 + i * 38
    tz = BOULEVARD_Z - 30
    half = 13
    seed = 6000 + i
    r = random.Random(seed)
    col = (r.uniform(0.5, 0.75), r.random(), r.random(), 1.0)
    form = TOWER_FORMS[slug]
    kind = form["kind"]
    notch = form["notch"]
    belts = BELTS[slug]
    gseed = col[2]
    # The lobby: a lit glass box set back under a canopy, the core behind.
    # (One tower's is set deeper, behind a room open to the street: ROOM.)
    lz = tz + half - 1.6 - ROOM.get(slug, 0.0)
    box((CO, "dark", 0), tx - half, tx + half, 0, LOBBY_H, tz - half, lz, scale=2.0)
    quad((CO, "lobby", 0), (tx - half + 0.6, 0.15, lz + 0.1), (tx + half - 0.6, 0.15, lz + 0.1),
         (tx + half - 0.6, LOBBY_H, lz + 0.1), (tx - half + 0.6, LOBBY_H, lz + 0.1),
         ((0, 0), (1, 0), (1, 1), (0, 1)), (r.random(), r.random(), 1.0, 1.0))
    hall = HALL.get(slug)
    box((CO, "metal", 0), tx - half, tx + half, LOBBY_H - 0.5, LOBBY_H, tz + half - 1.6, tz + half + (0.0 if hall else 3.0), scale=1.0)
    if hall:
        # The open hall: the curtain wall round its back and its sides
        # behind it, a soffit over it; its own sides stand open.
        hz = tz + half - hall[1]
        walls((CO, "corporate", 0), [(tx - half, hz), (tx + half, hz), (tx + half, tz - half), (tx - half, tz - half)], LOBBY_H, hall[0],
              (0.12, col[1], gseed, 1.0))
        quad((CO, "dark", 0), (tx - half, hall[0], hz), (tx + half, hall[0], hz), (tx + half, hall[0], tz + half), (tx - half, hall[0], tz + half))
    # The shaft, in sections, each stepped back from the one under it.
    cuts = [hall[0] if hall else LOBBY_H] + [height * f for f in form["steps"]] + [height]
    sections = [(half - INSET * k, cuts[k], cuts[k + 1]) for k in range(len(cuts) - 1)]
    top_half = sections[-1][0]
    # The accent, one mesh per tower the site lights in the organisation's
    # own colour (u says what a piece is: 2 a line, 1 a blade of the crown's
    # screen, 0.5 a band): each tower wears it its own way.
    verts, faces, uvs = [], [], []

    def ring(h_, y_, t=0.22):
        lit_box(verts, faces, uvs, tx - h_ - 0.05, tx + h_ + 0.05, y_, y_ + t, tz - h_ - 0.05, tz + h_ + 0.05, 0.5)

    half_at = lambda y: next(h_k for h_k, y0, y1 in sections if y0 <= y < y1)      # noqa: E731
    # The name, as type, on a tall sign on the lowest section (below): a
    # line of the tower's light up each of its edges, so it reads as a lit
    # sign and not as a gap in the face.
    sign_x = tx + half - notch - 1.6
    sign_top = sections[0][2] - 4.0
    sign_bottom = (hall[0] + 2.0) if hall else LOBBY_H + 4.0
    for e in (-1.44, 1.44):
        lit_box(verts, faces, uvs, sign_x + e - 0.07, sign_x + e + 0.07, sign_bottom, sign_top, tz + half - 0.02, tz + half + 0.07, 2.0)
    if kind == "fins":
        # Steel fins 1.75 m apart on every face, the glass 0.6 m behind them.
        for k_, (h_k, y0, y1) in enumerate(sections):
            g = notched4(tx, tz, h_k - 0.6, notch - 0.6)
            skin(g, g, y0, y1, r, gseed, lit=(0.25, 0.5), hot=0.4, warm=(0.5, 0.9), belts=belts)
            fin_rows(tx, tz, h_k, 0.6, y0, y1 + (0.9 if k_ < len(sections) - 1 else 0.0), 1.75, 0.34, (CO, "trim", 0), NAVY, notch)
            notched_roof((CO, "roof", 0), tx, tz, h_k, notch, y1)
            if k_:
                ring(h_k, y0 + 1.0)
    elif kind == "facet":
        # Broad chamfers to the west, narrow to the east (the name stands on
        # the front's east end).
        for k_, (h_k, y0, y1) in enumerate(sections):
            big = 5.5 - 1.5 * k_
            plan = chamfered(tx, tz, h_k, big, 2.6 - 0.8 * k_)
            skin(plan, plan, y0, y1, r, gseed, lit=(0.2, 0.5), hot=0.36, warm=(0.7, 1.0), belts=belts)
            flat(plan, y1)
            if k_:
                ledge(chamfered(tx, tz, sections[k_ - 1][0], 5.5, 2.6), y0, 1.0)
                ring(h_k, y0 + 1.0)
            for a_, b_ in ((plan[7], plan[0]), (plan[5], plan[6])):
                for e in (a_, b_):
                    lit_box(verts, faces, uvs, e[0] - 0.1, e[0] + 0.1, y0 + (1.0 if k_ else 0.0), y1, e[1] - 0.1, e[1] + 0.1, 2.0)
        # A band of adverts up the south-west chamfer, each a different one.
        bx_, bz_ = tx - half + 2.75, tz + half - 2.75
        y, count = 15.0, [0, 0]
        for tall in (0, 1, 0, 0, 1, 0, 0, 1, 0, 0):
            hh = 8.4 if tall else 3.7
            if y + hh > sections[0][2] - 2.0:
                break
            advert(bx_ - 0.07, y + hh / 2, bz_ + 0.07, 5.6, hh, -math.pi / 4, count[tall], seed=0.42)
            count[tall] += 1
            y += hh + 0.45
    elif kind == "slot":
        # Two slabs and a slot 4 m wide between them down the front and the
        # back, lit floors at the slot's back.
        h_k, y0, y1 = sections[0]
        sl, dp = 2.0, 2.6
        a_ = h_k - 1.5
        pts = [(-a_, h_k), (-sl, h_k), (-sl, h_k - dp), (sl, h_k - dp), (sl, h_k), (a_, h_k), (h_k, a_), (h_k, -a_), (a_, -h_k), (sl, -h_k),
               (sl, -h_k + dp), (-sl, -h_k + dp), (-sl, -h_k), (-a_, -h_k), (-h_k, -a_), (-h_k, a_)]
        plan = [(tx + x, tz + z) for x, z in pts]
        skin(plan, plan, y0, y1, r, gseed, lit=(0.25, 0.55), hot=0.4, warm=(0.6, 0.95), force={2: (0.95, 0.9), 10: (0.95, 0.9)}, belts=belts)
        for pts in ([(-a_, h_k), (-sl, h_k), (-sl, -h_k), (-a_, -h_k), (-h_k, -a_), (-h_k, a_)],
                    [(sl, h_k), (a_, h_k), (h_k, a_), (h_k, -a_), (a_, -h_k), (sl, -h_k)],
                    [(-sl, h_k - dp), (sl, h_k - dp), (sl, -h_k + dp), (-sl, -h_k + dp)]):
            flat([(tx + x, tz + z) for x, z in pts], y1)
        for sz in (-1, 1):
            for sx in (-1, 1):
                fx, fz = tx + sx * (sl - 0.12), tz + sz * (h_k - dp + 0.12)
                lit_box(verts, faces, uvs, fx - 0.12, fx + 0.12, y0 + 0.3, y1, fz - 0.12, fz + 0.12, 2.0)
            # Bridges across the slot every seventh floor.
            y = FLOOR0 + FLOOR * 9
            while y < y1 - 8.0:
                za, zb = sorted((tz + sz * (h_k - 0.5), tz + sz * (h_k - 1.4)))
                box((CO, "dark", 0), tx - sl, tx + sl, y, y + 1.1, za, zb, scale=2.0, bottom=True)
                y += FLOOR * 7
    elif kind == "taper":
        # Each stage leans in as it rises; a lit ledge at each setback.
        for k_, (h_k, y0, y1) in enumerate(sections):
            lean = (1.2, 1.4, 0.0)[k_]
            p0, p1 = chamfered(tx, tz, h_k, 2.0), chamfered(tx, tz, h_k - lean, 2.0)
            skin(p0, p1, y0, y1, r, gseed, lit=(0.25, 0.55), hot=0.42, warm=(0.75, 1.0), belts=belts)
            flat(p1, y1)
            if k_:
                ledge(chamfered(tx, tz, sections[k_ - 1][0] - (1.2, 1.4)[k_ - 1], 2.0), y0, 1.0)
                ring(sections[k_ - 1][0] - (1.2, 1.4)[k_ - 1], y0 + 0.2, 0.5)
            if k_ == len(sections) - 1:
                for e0, e1 in zip(p0[1::2], p1[1::2]):
                    lit_box(verts, faces, uvs, e1[0] - 0.12, e1[0] + 0.12, y0 + 1.0, y1, e1[1] - 0.12, e1[1] + 0.12, 2.0)
        half_at = lambda y: next(h_k - (1.2, 1.4, 0.0)[k_] * (y - y0) / (y1 - y0) for k_, (h_k, y0, y1) in enumerate(sections) if y0 <= y < y1)  # noqa: E731
        # The pylon its name stands on, off the leaning wall.
        box((CO, "trim", 0), sign_x - 1.55, sign_x + 1.55, LOBBY_H, sign_top + 1.5, tz + half - 1.5, tz + half + 0.02, scale=2.0, col=NAVY)
    elif kind == "slits":
        # Concrete fins 1.3 m apart, warm slits between; two sky floors where
        # the fins stop and a whole floor is lit.
        h_k, y0, y1 = sections[0]
        belts_ = [FLOOR0 + FLOOR * 7, FLOOR0 + FLOOR * 15, FLOOR0 + FLOOR * 21]
        marks = [y0] + [v for b in belts_ for v in (b, b + FLOOR)] + [y1]
        for j in range(len(marks) - 1):
            ya, yb = marks[j], marks[j + 1]
            g = notched4(tx, tz, h_k - 0.55, notch - 0.55)
            if j % 2:
                skin(g, g, ya, yb, r, gseed, force={e: (1.0, 0.95) for e in range(12)})
                ring(h_k - 0.5, ya - 0.1, 0.16)
                ring(h_k - 0.5, yb - 0.06, 0.16)
            else:
                skin(g, g, ya, yb, r, gseed, lit=(0.3, 0.6), hot=0.42, warm=(0.8, 1.0))
                fin_rows(tx, tz, h_k, 0.55, ya, yb, 1.3, 0.42, (CO, "castconcrete", 0), CAST, notch)
        notched_roof((CO, "roof", 0), tx, tz, h_k, notch, y1)
        # A blade of adverts out of its east flank, a line of the tower's
        # light up its outer edge.
        bz_, bx0, bx1 = tz + 6.0, tx + h_k, tx + h_k + 3.6
        box((CO, "board_frame", 0), bx0, bx1, 28.0, 63.4, bz_ - 0.22, bz_ + 0.22, scale=2.0)
        for j in range(4):
            for sz, yaw in ((1, 0.0), (-1, math.pi)):
                K.bb((bx0 + bx1) / 2 + 0.1, 33.0 + j * 8.6, bz_ + sz * 0.24, 3.1, 8.0, yaw, (0.06, ((j + (sz < 0) * 2) % 4 + 0.5) / 8.0, 0.57, 1.0))
        lit_box(verts, faces, uvs, bx1 - 0.02, bx1 + 0.1, 28.0, 63.4, bz_ - 0.26, bz_ + 0.26, 2.0)
        for yy in (30.0, 46.0, 61.5):
            box((CO, "metal", 1), bx0 - 0.3, bx0 + 0.5, yy, yy + 0.3, bz_ - 0.5, bz_ + 0.5, scale=1.0)
    elif kind == "carved":
        # A dark slab; two corners cut out three floors high as sky lobbies,
        # lit warm inside, a line of light along their ledges.
        h_k, y0, y1 = sections[0]
        cs = 8.0
        cut = {FLOOR0 + FLOOR * 7: ("sw", notched4(tx, tz, h_k, cs, notch, notch, notch), (10, 11)),
               FLOOR0 + FLOOR * 12: ("ne", notched4(tx, tz, h_k, notch, notch, cs, notch), (4, 5))}
        marks = sorted([y0, y1] + [v for b in cut for v in (b, b + FLOOR * 3)])
        full = notched4(tx, tz, h_k, notch)
        for ya, yb in zip(marks, marks[1:]):
            if ya in cut:
                name, plan, inner = cut[ya]
                skin(plan, plan, ya, yb, r, gseed, lit=(0.22, 0.5), hot=0.38, warm=(0.7, 1.0), force={e: (1.0, 1.0) for e in inner})
                sx, sz = (-1, 1) if name == "sw" else (1, -1)
                xa, xb = sorted((tx + sx * h_k, tx + sx * (h_k - cs)))
                za, zb = sorted((tz + sz * h_k, tz + sz * (h_k - cs)))
                sq = [(xa, zb), (xb, zb), (xb, za), (xa, za)]
                flat(sq, ya)
                flat(sq, yb, "dark", up=False)
                # Its ledge: a line of light along the two open edges, a rail.
                ex, ez = tx + sx * (h_k - 0.12), tz + sz * (h_k - 0.12)
                lit_box(verts, faces, uvs, xa, xb, ya - 0.3, ya, ez - 0.1, ez + 0.1, 0.5)
                lit_box(verts, faces, uvs, ex - 0.1, ex + 0.1, ya - 0.3, ya, za, zb, 0.5)
                box((CO, "metal", 1), xa, xb, ya + 1.0, ya + 1.08, ez - 0.05, ez + 0.05, scale=1.0)
                box((CO, "metal", 1), ex - 0.05, ex + 0.05, ya + 1.0, ya + 1.08, za, zb, scale=1.0)
                # Trees on its floor.
                for dx_, dz_ in ((2.2, 2.4), (5.6, 2.2), (2.4, 5.6)):
                    PR.place("planter_tree", tx + sx * (h_k - dx_), ya, tz + sz * (h_k - dz_), district=CO)
            else:
                skin(full, full, ya, yb, r, gseed, lit=(0.22, 0.5), hot=0.38, warm=(0.7, 1.0))
        notched_roof((CO, "roof", 0), tx, tz, h_k, notch, y1)
        ledge(full, y1, 1.0)
        h_k, y0, y1 = sections[1]
        plan = notched4(tx, tz, h_k, notch)
        skin(plan, plan, y0, y1, r, gseed, lit=(0.22, 0.5), hot=0.4, warm=(0.7, 1.0), belts=belts)
        notched_roof((CO, "roof", 0), tx, tz, h_k, notch, y1)
        ring(h_k, y0 + 1.0)
        for sx in (-1, 1):
            fx = tx + sx * (half + 0.05)
            lit_box(verts, faces, uvs, fx - 0.1, fx + 0.1, sections[0][1] + 1.0, sections[0][2], tz - 0.1, tz + 0.1, 2.0)
    else:
        # Three drums, a rib at every corner of each, a ring of light at
        # the top of each.
        aps = (13.0, 11.3, 9.6)
        for k_, (h_k, y0, y1) in enumerate(sections):
            plan = ngon(tx, tz, aps[k_])
            skin(plan, plan, y0, y1, r, gseed, lit=(0.25, 0.55), hot=0.4, warm=(0.55, 0.95), belts=belts)
            flat(plan, y1)
            for j, (px, pz) in enumerate(plan):
                th = (j - 0.5) * math.pi / 8
                oriented_box((CO, "trim", 0), px - math.sin(th) * 0.3, (y0 + y1) / 2, pz - math.cos(th) * 0.3, 0.36, y1 - y0, 0.5, th, scale=2.0, col=NAVY)
            for j in range(16):
                lit_quad(verts, faces, uvs, plan[j], plan[(j + 1) % 16], y1 - 0.7, y1 - 0.4, 0.5)
            if k_:
                ledge(ngon(tx, tz, aps[k_ - 1]), y0, 1.0)
        # A ring of screens round the lowest drum's front, five facets wide.
        plan = ngon(tx, tz, aps[0] + 0.07)
        for n_, j in enumerate((13, 14, 15, 0, 1, 2)):
            a_, b_ = plan[j], plan[(j + 1) % 16]
            th = j * math.pi / 8
            if j != 2:
                advert((a_[0] + b_[0]) / 2, 41.0, (a_[1] + b_[1]) / 2, 4.9, 5.2, th, n_, seed=0.77, depth=0.05)
        # The lift core up its front, the name on its face.
        cx_ = tx + half - notch - 1.6
        box((CO, "trim", 0), cx_ - 1.6, cx_ + 1.6, LOBBY_H, sections[0][2] - 1.5, tz + 8.2, tz + half - 0.02, scale=2.0, col=NAVY)
        flat([(cx_ - 1.6, tz + half), (cx_ + 1.6, tz + half), (cx_ + 1.6, tz + 8.2), (cx_ - 1.6, tz + 8.2)], sections[0][2] - 1.5)
        half_at = lambda y: next(aps[k_] for k_, (h_k, y0, y1) in enumerate(sections) if y0 <= y < y1)      # noqa: E731
    # The crown: a dark glass box, the logo on its faces to the boulevard
    # and to the rooftop, which sees the boulevard's face almost edge on.
    cw = top_half - 1.5
    box((CO, "crown_glass", 0), tx - cw, tx + cw, height, height + CROWN_H, tz - cw, tz + cw, scale=2.0)
    top = height + CROWN_H
    empty("logo_" + slug, (tx, height + CROWN_H / 2, tz + cw + 0.06), props={"w": cw * 2 - 3.0, "h": CROWN_H - 3.0})
    empty("logo_" + slug + "_e", (tx + cw + 0.06, height + CROWN_H / 2, tz), yaw=math.pi / 2,
          props={"w": cw * 2 - 3.0, "h": CROWN_H - 3.0})
    # Bands round the crown's top and foot, and on some a screen of blades
    # over the roof, lit from its foot.
    lit_box(verts, faces, uvs, tx - cw - 0.08, tx + cw + 0.08, top - 0.55, top, tz - cw - 0.08, tz + cw + 0.08, 0.5)
    lit_box(verts, faces, uvs, tx - cw - 0.08, tx + cw + 0.08, height, height + 0.3, tz - cw - 0.08, tz + cw + 0.08, 0.5)
    if form["screen"]:
        # Blades round the crown's roof, 1.9 m apart and 7 m tall.
        count = int((cw * 2) // 1.9)
        for k in range(count + 1):
            v = -cw + k * (cw * 2) / count
            for bx0, bx1, bz0, bz1 in ((tx + v - 0.12, tx + v + 0.12, tz + cw - 0.7, tz + cw),
                                       (tx + v - 0.12, tx + v + 0.12, tz - cw, tz - cw + 0.7),
                                       (tx + cw - 0.7, tx + cw, tz + v - 0.12, tz + v + 0.12),
                                       (tx - cw, tx - cw + 0.7, tz + v - 0.12, tz + v + 0.12)):
                lit_box(verts, faces, uvs, bx0, bx1, top, top + 7.0, bz0, bz1, 1.0)
    crown = bpy.data.meshes.new(PREFIX + "crown_" + slug)
    crown.from_pydata(verts, [], faces)
    layer = crown.uv_layers.new(name="UVMap")
    li = 0
    for f in faces:
        for vi in f:
            layer.data[li].uv = uvs[vi]
            li += 1
    crown.materials.append(MATS["crown"])
    obj = link(bpy.data.objects.new("crown_" + slug, crown))
    obj["tower"] = slug
    # Plant on the roof inside the screen, and a mast on the tallest, a red
    # lamp at its tip.
    box((CO, "metal", 1), tx - cw * 0.5, tx + cw * 0.3, top, top + 3.2, tz - cw * 0.4, tz + cw * 0.2, scale=1.5)
    box((CO, "dark", 1), tx + cw * 0.35, tx + cw * 0.75, top, top + 2.0, tz - cw * 0.6, tz - cw * 0.1, scale=1.5)
    if form["mast"]:
        m_h = form["mast"]
        cylinder((CO, "metal", 0), tx, tz, top, top + m_h * 0.45, 0.55, segs=8)
        cylinder((CO, "metal", 0), tx, tz, top + m_h * 0.45, top + m_h, 0.22, segs=6)
        cylinder((CO, "neon_red", 0), tx, tz, top + m_h, top + m_h + 0.5, 0.3, segs=8)
        for dy in (0.3, 0.6):
            for sx in (-1, 1):
                box((CO, "neon_red", 1), tx + sx * 0.55 - 0.12, tx + sx * 0.55 + 0.12, top + m_h * dy, top + m_h * dy + 0.25,
                    tz - 0.12, tz + 0.12, scale=1.0)
    # Red lamps on the crown's corners, as tall buildings wear them.
    for sx, sz in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        box((CO, "neon_red", 1), tx + sx * cw - 0.2, tx + sx * cw + 0.2, top + 0.1, top + 0.45, tz + sz * cw - 0.2,
            tz + sz * cw + 0.2, scale=1.0)
    # The name, as type, on a tall sign on the lowest section.
    sign("tower_" + slug, sign_x, (sign_top + sign_bottom) / 2, tz + half + 0.08, 2.6, sign_top - sign_bottom, 0.0,
         preview=slug.upper(), district=CO)
    empty("anchor_tower_" + slug, (tx, top + 1.8, tz), props={"height": top})
    # Its screens, each on the section of the shaft that stands at its height.
    rs_ = random.Random(seed + 700)
    for face, off, sy, sw, sh in SCREENS[slug]:
        h_s = half_at(sy)
        if face == "+z":
            # (Flat on the glass: the braindance reads each tower as a box
            # that ends at its front, and a screen proud of it hides it.)
            K.screen(tx + off, sy, tz + h_s + 0.07, sw, sh, 0.0, rs_, depth=0.04, pal=K.COLD)
        else:
            sx = 1 if face == "+x" else -1
            K.screen(tx + sx * (h_s + 0.38), sy, tz + off, sw, sh, sx * math.pi / 2, rs_, pal=K.COLD)
    # What it carries higher up, to its crown's foot: columns of characters,
    # marks in light boxes, adverts, each on the section of the shaft that
    # stands at its height, flat on it.
    for n_, (what, face, off, sy, *rest) in enumerate(UPPER[slug]):
        foot = sy - (ST_SIZES[rest[0]][1] * rest[1] if what == "word" else 1.2 * rest[0] if what == "mark" else rest[1]) / 2
        h_s = half_at(foot + 0.01)       # (a leaning wall: where its foot stands)
        if face == "+z":
            px, pz, yaw = tx + off, tz + h_s + 0.07, 0.0
        else:
            sx = 1 if face == "+x" else -1
            px, pz, yaw = tx + sx * (h_s + 0.09), tz + off, sx * math.pi / 2
        if what == "ad":
            advert(px, sy, pz, rest[0], rest[1], yaw, i * 3 + n_, seed=0.18 + 0.11 * i, depth=0.04)
        elif what == "word":
            K.big_sign(px, sy, pz, rest[0], rest[1], yaw, rest[2], depth=0.04)
        else:
            K.big_sign(px, sy, pz, "bx", rest[0], yaw, rest[1], depth=0.04)
    if slug == "pawtograder":
        # An advert band round its south-west corner, six metres high: two
        # screens down the west flank, a mark on the corner's cut, one
        # screen along the front to the slot, one frame and two lines of
        # light round all of it.
        ya, yb = 78.6, 85.0
        cut = 1.5
        fz, wx = tz + half + 0.07, tx - half - 0.09
        advert(tx - 2.2 - 4.6, (ya + yb) / 2, fz, 9.2, yb - ya - 0.5, 0.0, 5, seed=0.83, depth=0.04)
        for j, zc in enumerate((tz + half - cut - 4.7, tz + half - cut - 14.3)):
            advert(wx, (ya + yb) / 2, zc, 9.2, yb - ya - 0.5, -math.pi / 2, 6 + j, seed=0.83, depth=0.04)
        mx_, mz_ = tx - half + cut / 2 - 0.06, tz + half - cut / 2 + 0.06
        oriented_box((CO, "board_frame", 0), mx_, (ya + yb) / 2, mz_, cut * 1.414 + 0.3, yb - ya, 0.1, -math.pi / 4, scale=1.0)
        K.big_sign(mx_ - 0.05, (ya + yb) / 2, mz_ + 0.05, "bx", 1.5, -math.pi / 4, 8, depth=0.02, lines=False)
        amber = GLOW["amber"]
        for yy in (ya - 0.12, yb):
            box((CO, "glow", 0), tx - 11.5, tx - 2.1, yy, yy + 0.12, fz - 0.05, fz + 0.01, scale=1.0, col=amber)
            box((CO, "glow", 0), wx - 0.01, wx + 0.05, yy, yy + 0.12, tz + half - cut - 19.2, tz + half - cut, scale=1.0, col=amber)
            oriented_box((CO, "glow", 0), mx_ - 0.06, yy + 0.06, mz_ + 0.06, cut * 1.414, 0.12, 0.05, -math.pi / 4, scale=1.0, col=amber)
# South of the boulevard: its south side, the campus under the Experience
# shot's dolly and the plaza street's north side, all ending at x 380
# (corpo_south.py).
from ncw.districts import corpo_south  # noqa: E402,F401

# North of the boulevard's centre line: either end of the towers and behind
# them (corpo_north.py).
from ncw.districts import corpo_north  # noqa: E402,F401

# The second rank: towers on the back row's blocks (corpo_rank.py).
from ncw.districts import corpo_rank  # noqa: E402,F401

K.ad_report()
