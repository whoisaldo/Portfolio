from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw.kit import _mass_sides
from ncw.districts.plaza import CROSS_Z0

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


# Each tower's shape: how deep its corners are cut, where it steps back
# (fractions of its height) and what stands on its crown: a screen of lit
# blades, a mast, or both. Seven towers, no two alike.
TOWER_FORMS = {
    "philips-zero-touch": dict(notch=1.8, steps=(0.58, 0.82), screen=True, mast=22.0),
    "pinnatec-auto": dict(notch=2.4, steps=(0.66,), screen=False, mast=0.0),
    "pawtograder": dict(notch=1.4, steps=(), screen=True, mast=0.0),
    "aws-cloudformation": dict(notch=2.0, steps=(0.5, 0.74), screen=True, mast=30.0),
    "top-choice-realty": dict(notch=1.6, steps=(), screen=False, mast=0.0),
    "robert-defalco-realty": dict(notch=2.2, steps=(0.7,), screen=True, mast=0.0),
    "northeastern": dict(notch=1.6, steps=(0.62, 0.84), screen=False, mast=18.0),
}
INSET = 2.4

for i, (slug, height) in enumerate(TOWERS):
    tx = CORPO_X0 + i * 38
    tz = BOULEVARD_Z - 30
    half = 13
    seed = 6000 + i
    r = random.Random(seed)
    col = (r.uniform(0.5, 0.75), r.random(), r.random(), 1.0)
    form = TOWER_FORMS[slug]
    notch = form["notch"]
    # The lobby: a lit glass box set back under a canopy, the core behind.
    box((CO, "dark", 0), tx - half, tx + half, 0, LOBBY_H, tz - half, tz + half - 1.6, scale=2.0)
    quad((CO, "lobby", 0), (tx - half + 0.6, 0.15, tz + half - 1.5), (tx + half - 0.6, 0.15, tz + half - 1.5),
         (tx + half - 0.6, LOBBY_H, tz + half - 1.5), (tx - half + 0.6, LOBBY_H, tz + half - 1.5),
         ((0, 0), (1, 0), (1, 1), (0, 1)), (r.random(), r.random(), 1.0, 1.0))
    box((CO, "metal", 0), tx - half, tx + half, LOBBY_H - 0.5, LOBBY_H, tz + half - 1.6, tz + half + 3.0, scale=1.0)
    # The shaft, in sections, each stepped back from the one under it.
    cuts = [LOBBY_H] + [height * f for f in form["steps"]] + [height]
    sections = []
    for k in range(len(cuts) - 1):
        h_k = half - INSET * k
        curtain(tx, tz, h_k, notch, cuts[k], cuts[k + 1], col)
        sections.append((h_k, cuts[k], cuts[k + 1]))
        if k > 0:
            parapet((CO, "metal", 1), tx, tz, half - INSET * (k - 1), notch, cuts[k], height=1.0)
    top_half = sections[-1][0]
    # The crown: a dark glass box, the logo on its faces to the boulevard
    # and to the rooftop, which sees the boulevard's face almost edge on.
    cw = top_half - 1.5
    box((CO, "crown_glass", 0), tx - cw, tx + cw, height, height + CROWN_H, tz - cw, tz + cw, scale=2.0)
    top = height + CROWN_H
    empty("logo_" + slug, (tx, height + CROWN_H / 2, tz + cw + 0.06), props={"w": cw * 2 - 3.0, "h": CROWN_H - 3.0})
    empty("logo_" + slug + "_e", (tx + cw + 0.06, height + CROWN_H / 2, tz), yaw=math.pi / 2,
          props={"w": cw * 2 - 3.0, "h": CROWN_H - 3.0})
    # The accent: a line of light up the inside corner of each notch, a thin
    # ring at each setback, bands round the crown's top and foot, and on some
    # a screen of blades over the roof, lit from its foot.
    verts, faces, uvs = [], [], []
    for sx, sz in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        for h_k, y0, y1 in sections:
            fx, fz = tx + sx * (h_k - notch + 0.16), tz + sz * (h_k - notch + 0.16)
            lit_box(verts, faces, uvs, fx - 0.16, fx + 0.16, max(y0, LOBBY_H + 1.0), y1, fz - 0.16, fz + 0.16, 2.0)
    for h_k, y0, _ in sections[1:]:
        lit_box(verts, faces, uvs, tx - h_k - 0.05, tx + h_k + 0.05, y0 + 1.0, y0 + 1.22, tz - h_k - 0.05, tz + h_k + 0.05, 0.5)
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
    sign_top = sections[0][2] - 4.0
    sign_bottom = LOBBY_H + 4.0
    sign("tower_" + slug, tx + half - notch - 1.6, (sign_top + sign_bottom) / 2, tz + half + 0.08, 2.6, sign_top - sign_bottom, 0.0,
         preview=slug.upper(), district=CO)
    empty("anchor_tower_" + slug, (tx, top + 1.8, tz), props={"height": top})
# The boulevard's south side: a street of its own, not a wall. Shops along
# the boulevard under awnings, the signs a street collects hung off the
# fronts, flats and offices over them (some set back over a terrace), an
# alley between each pair with a lit sign across its mouth, and the roofs
# dressed (the Experience shot looks over them at the towers). Every block
# stands where its mass stood, no taller. The row ends at x 380: east of
# it the boulevard's south side is the Afterlife Block's.
SOUTH_X1 = 379.6  # (a ledge or a lamp stands 0.35 m proud of a wall)
for i in range(7):
    x0 = 130 + i * 40
    x1 = min(x0 + 34, SOUTH_X1)
    h = 22 + (i * 7) % 18
    zf, zb = BOULEVARD_Z + 14, BOULEVARD_Z + 40
    seed = 6100 + i
    rs = random.Random(seed + 50)
    paint = None if i % 4 == 3 else i % 3
    if h > 26 and rs.random() < 0.5:
        base_h = SHOP_H + CELL_H * rs.randrange(2, 4)
        mass(CO, x0, x1, zf, zb, SHOP_H, base_h, seed, painted=paint)
        sx0, sx1 = x0 + rs.uniform(0.0, 4.0), x1 - rs.uniform(0.0, 4.0)
        mass(CO, sx0, sx1, zf + 3.4, zb, base_h, h, seed + 1, painted=paint)
        dress_roof(CO, x0, x1, zf, zb, base_h, seed + 2, cap=0.0)
        dress_roof(CO, sx0, sx1, zf + 3.4, zb, h, seed + 3, cap=6.0, face=0.0)
    else:
        mass(CO, x0, x1, zf, zb, SHOP_H, h, seed, painted=paint)
        dress_roof(CO, x0, x1, zf, zb, h, seed + 3, cap=6.0, face=0.0)
    box((CO, "dark", 0), x0, x1, 0, SHOP_H, zf, zb, scale=2.0)
    frontage_x(CO, x0, x1, zf, seed + 4)
    clutter_x(CO, x0, x1, zf, h, seed + 5)
    box((CO, "neon_" + ["cyan", "pink", "amber", "purple"][i % 4], 0), x0 + 2, x1 - 2, SHOP_H - 0.6, SHOP_H - 0.45,
        zf - 0.1, zf + 0.05, scale=1.0)
    if x0 + 40 <= SOUTH_X1:
        # The alley: a low back block between this one and the next, and a
        # sign across its mouth.
        ah = SHOP_H + CELL_H * rs.randrange(1, 3)
        mass(CO, x0 + 34, x0 + 40, zf + 6.0, zb, 0.15, ah, seed + 7)
        box((CO, "board_frame", 0), x0 + 34.2, x0 + 39.8, 4.9, 6.1, zf - 0.1, zf + 0.12, scale=1.0)
        box((CO, "neon_" + ["amber", "teal", "pink", "white"][i % 4], 0), x0 + 34.5, x0 + 39.5, 5.25, 5.75, zf - 0.14, zf - 0.08, scale=1.0)

# The rest of the district's frontages, placeholders (massing.py's lots)
# until each is built: the plaza street's north side and the inside of the
# block, both ending at x 380 with a finished face (the Afterlife Block's
# lots stand against them from there), the x 120 road's east side, low
# beside the Experience shot's lens (30 m up at x 120, z -230) and under its
# dolly along z -230, and the boulevard's north side either end of the
# towers (north of z -330 the district runs on to x 470).
from ncw.districts import massing  # noqa: E402
_W = (16.0, 19.2, 22.4, 25.6)
massing.frontage(CO, "+z", 132.0, SOUTH_X1, -190.0, 30.0, (26.0, 48.0), _W, 8401, ends=("street", "open"))
massing.frontage(CO, "-x", -316.0, -220.0, 132.0, 30.0, (14.0, 22.0), _W, 8402, ends=("street", "open"))
massing.blocks(CO, 162.0, SOUTH_X1, -290.0, -220.0, (14.0, 23.0), 8403, step=30.0, style=dict(roof_cap=2.0))
massing.frontage(CO, "+z", 120.0, 136.0, -344.0, 30.0, (60.0, 80.0), (16.0,), 8404, ends=("street", "open"))
massing.frontage(CO, "+z", 392.0, 440.0, -344.0, 30.0, (54.0, 76.0), (16.0, 19.2), 8405, ends=("open", "street"))
