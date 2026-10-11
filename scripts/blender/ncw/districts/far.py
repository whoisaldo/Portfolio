from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw import buildings as B
from ncw import props as P  # noqa: F401
from ncw.districts import canyon_kit as C
from ncw.districts.canyon_kit import FA, CB, fl

# ---------------------------------------------------------------------------
# THE CANYON. Past the plaza street the avenue runs on between towers to the
# holographic figure at its end and ARASAKA beside her. The hero looks
# straight down it: this is the vanishing point, and on a phone it is most
# of the picture. So the canyon is two things at once. From the hero's low
# lens it is the plate's composition, which does not move: each lot's street
# face stands on the lot line to the height below, and the roofs step down
# toward the vanishing point under a band of sky. From everywhere else (the
# street, the lanes, the roofs, the air) it is a row of towers: podiums,
# slabs with slots of sky between them, and behind each slab a second mass
# the hero cannot see, a stepped crown with a mast or a low terrace.
#
# Two batch keys: "far" is in the core GLB (what the hero's lens sees from
# its first frame), "canyon_b" streams in with the canyon's pack.
# ---------------------------------------------------------------------------
# Heights that fall away in the hero's eye: from the low camera each lot
# stands a little shorter than the one before it, so the canyon's roofs
# converge on the horizon and open a slot of sky at its end, where the
# figure and ARASAKA stand in the glow.
FAR_LOTS = {
    -1: [(-188, 30, 52), (-218, 34, 57), (-252, 36, 60), (-288, 40, 66), (-328, 44, 62),
         (-372, 50, 67), (-422, 60, 63), (-482, 70, 64), (-552, 60, 60), (-612, 66, 62), (-678, 70, 58)],
    1: [(-188, 34, 47), (-222, 36, 58), (-258, 40, 51), (-298, 44, 64), (-342, 50, 57),
        (-392, 56, 62), (-448, 66, 56), (-514, 62, 60), (-576, 70, 57), (-646, 76, 61)],
}
ROW_END = -708.0        # the megabuilding street's lot line
DEPTH = 30.0            # a lot, from the avenue's lot line to its lane
GAP = 5.0               # the slot between two towers, over their podiums
# Where two lots meet: a slot over the podiums (most of them), an alley to
# the lane behind (ALLEYS), or wall to wall (ABUT). The slot is always cut
# from the lower lot of the two, so the taller one's side wall stands where
# it stood and the hero's roofline does not move.
ALLEYS = {-1: (-288.0, -482.0), 1: (-298.0, -448.0)}
ABUT = {-1: (-372.0, -612.0), 1: (-258.0, -646.0)}
# ARASAKA's forecourt takes the north two thirds of the right-hand lot at
# z -448..-514 (its podium stood inside that lot).
FORECOURT = (-514.0, -470.0)
# Each tower's second mass, by lot and by half of a long lot: a crown rising
# so many metres over the street slab (as far as the hero's and the Work
# shot's lenses allow), a low terrace, or none (the slab fills the lot).
BACKS = {
    -1: {0: (14,), 1: ("low",), 2: (18,), 3: ("low",), 4: (26,), 5: (16,), 6: (30,), 7: ("low", 34), 8: (24, "low"),
         9: (30, "flush"), 10: (20,)},
    1: {0: ("low",), 1: ("flush",), 2: ("low",), 3: (10,), 4: ("low",), 5: (28, "low"), 6: (20,), 7: ("low", 30),
        8: (26, "low"), 9: ("low", 22)},
}
# What stands between the hero's lens and the canyon: the avenue's lots.
AVENUE_MASSES = list(HERO_MASSES)


def _x(side, u):
    """World x of a point u metres back from the lot line."""
    return side * (WALK + u)


def _faces(side, u0, u1, zn, zs):
    """A mass u0..u1 back from the lot line, zn..zs along it: its street,
    back, south and north faces and its x range."""
    xa, xb = sorted((_x(side, u0), _x(side, u1)))
    return (B.Face("-x" if side > 0 else "+x", _x(side, u0), zn, zs), B.Face("+x" if side > 0 else "-x", _x(side, u1), zn, zs),
            B.Face("+z", zs, xa, xb), B.Face("-z", zn, xa, xb), xa, xb)


def _layout(side):
    """The row's lots with their ends worked out, and each lot's towers."""
    lots = []
    for i, (z_start, depth, height) in enumerate(FAR_LOTS[side]):
        z1, z0 = float(z_start), max(float(z_start - depth), ROW_END)
        if side > 0 and i == 6:
            z0 = FORECOURT[1]
        r = random.Random(4700 + i * 13 + (0 if side > 0 else 500))
        lots.append(dict(i=i, side=side, z1=z1, z0=z0, h=float(height), r=r, cut_s=0.0, cut_n=0.0, south="street", north="street",
                         ph=fl(r.choice((3, 4, 4))), sd=r.choice((12.0, 14.0, 16.0, 18.0)), bi=r.choice((0.0, 2.0, 3.0))))
    for a, b in zip(lots, lots[1:]):
        # a is nearer the hero (south), b beyond it.
        if abs(a["z0"] - b["z1"]) > 0.01:
            a["north"] = b["south"] = "court"
            continue
        kind = "alley" if b["z1"] in ALLEYS[side] else "abut" if b["z1"] in ABUT[side] else "gap"
        a["north"] = b["south"] = kind
        if kind != "abut":
            if b["h"] <= a["h"]:
                b["cut_s"] = GAP
            else:
                a["cut_n"] = GAP
    for L in lots:
        r = L["r"]
        zs, zn = L["z1"] - L["cut_s"], L["z0"] + L["cut_n"]
        spans = [(zs, zn, L["south"], L["north"])]
        if zs - zn >= 54.0:
            m = zn + (zs - zn) * r.uniform(0.44, 0.56)
            spans = [(zs, m + GAP / 2, L["south"], "notch"), (m - GAP / 2, zn, "notch", L["north"])]
        kinds = BACKS[side][L["i"]]
        L["units"] = []
        for k, (us, un, es, en) in enumerate(spans):
            style = r.choices((5, 2, 4, 0, 1, 6), weights=(4, 3, 1.5, 1.5, 1, 1))[0]
            tint = B.TINTS[r.choices(("navy", "teal", "charcoal", "plum"), weights=(3, 3, 2, 1))[0]]
            L["units"].append(dict(lot=L, k=k, zs=us, zn=un, south=es, north=en, h=L["h"], back=kinds[min(k, len(kinds) - 1)],
                                   style=style, tint=tint, lit=r.uniform(0.4, 0.8), warmth=r.uniform(0.15, 0.95), ov=r.randrange(0, 40),
                                   ki=r.choice((0.0, 2.0, 3.0))))
        # The podium runs the whole lot, less an alley cut from it.
        L["pz1"] = L["z1"] - (GAP if L["south"] == "alley" and L["cut_s"] else 0.0)
        L["pz0"] = L["z0"] + (GAP if L["north"] == "alley" and L["cut_n"] else 0.0)
    # The square's west wall (the right-hand row's first two lots back onto
    # it) carries two of the plaza's boards and the braindance's GPU clue:
    # its podium is tall enough for them and its back stands on the lot line.
    if side > 0:
        for L in lots[:3]:
            L["ph"], L["bi"] = fl(4), 0.0
    return lots


ROWS = {side: _layout(side) for side in (-1, 1)}
# Every mass the hero's lens meets first: the avenue's, and the canyon's
# podiums and street slabs. A crown is built only as high as these hide it.
OCC = list(AVENUE_MASSES)
for side, lots in ROWS.items():
    for L in lots:
        xa, xb = sorted((_x(side, 0.0), _x(side, DEPTH)))
        OCC.append(((xa, 0.0, L["pz0"]), (xb, L["ph"], L["pz1"])))
        for U in L["units"]:
            sd = DEPTH if U["back"] == "flush" else L["sd"]
            xa, xb = sorted((_x(side, 0.0), _x(side, sd)))
            OCC.append(((xa, 0.0, U["zn"]), (xb, U["h"], U["zs"])))
HERO_MASSES.extend(OCC[len(AVENUE_MASSES):])


def _podium(L):
    side, r = L["side"], L["r"]
    zn, zs, ph = L["pz0"], L["pz1"], L["ph"]
    tint = L["units"][0]["tint"]
    tcol = B.TRIM[tint]
    col = B.wall_col(r.uniform(0.7, 0.95), r.choice((4, 2, 4)), r.uniform(0.2, 0.8), tint)
    ov = r.randrange(0, 40)
    st, bk, so, no, xa, xb = _faces(side, 0.0, DEPTH, zn, zs)
    B.COLLISION.append(("box", xa, xb, 0.0, ph, zn, zs, "canyon"))
    # The avenue's face: shops along the pavement (their glass in the core),
    # two or three floors of offices over them, a cornice with a line of
    # light under it.
    st.quad((FA, "dark", 0), 0.0, st.width, 0.0, SHOP_H, -0.95)
    C.shopfront(st, r, 0.0, st.width, tint, glass=FA, key=CB)
    C.wall(FA, st, SHOP_H, ph, col, ov)
    st.ledge((CB, "trim", 0), 0.0, st.width, SHOP_H - 0.05, 0.3, 0.35, tcol)
    st.ledge((CB, "trim", 0), 0.0, st.width, ph - 0.45, 0.45, 0.55, tcol)
    if r.random() < 0.6:
        st.box((CB, "neon_" + r.choice(("cyan", "magenta", "amber", "teal", "pink")), 0), 0.4, st.width - 0.4, ph - 0.56, ph - 0.48, 0.42, 0.5)
    if r.random() < 0.35:
        B.canopy(CB, st, 1.0, st.width - 1.0, 2.6, SHOP_H - 0.5, tint, r.choice(("white", "cyan", "amber")))
    # Its back, on the lane: a service floor of doors, lamps and shutters,
    # the smaller windows a block turns to its back, pipes and units.
    back_col = B.wall_col(col[0] * 0.6, 6, col[2], tint)
    B.back_ground(CB, bk, r, tcol)
    C.wall(CB, bk, SHOP_H, ph, back_col, ov)
    B.clutter_back(CB, bk, r, 0.0, ph)
    # Its ends: a street's corner, an alley's wall, the forecourt's edge, or
    # a neighbour's podium (built only where it stands over the neighbour's).
    rows = ROWS[side]
    j = rows.index(L)
    for f, kind, nb in ((so, L["south"], rows[j - 1] if j else None), (no, L["north"], rows[j + 1] if j + 1 < len(rows) else None)):
        if kind in ("street", "court"):
            hero = kind == "court" and f.nz > 0
            if hero:
                f.quad((FA, "dark", 0), 0.0, f.width, 0.0, SHOP_H, -0.95)
            C.shopfront(f, r, 0.0, f.width, tint, glass=FA if hero else CB, key=CB)
            C.wall(FA if hero else CB, f, SHOP_H, ph, col, ov)
            f.ledge((CB, "trim", 0), 0.0, f.width, SHOP_H - 0.05, 0.3, 0.35, tcol)
            f.ledge((CB, "trim", 0), 0.0, f.width, ph - 0.45, 0.45, 0.55, tcol)
            C.street_signs(f, r, 0.5, f.width - 0.5, SHOP_H + 0.8, ph - 0.8, max(3, round(f.width / 5.0)), hero=False)
        elif kind == "alley":
            B.back_ground(CB, f, r, tcol)
            C.wall(CB, f, SHOP_H, ph, back_col, ov)
            B.clutter_back(CB, f, r, 0.0, ph)
        elif nb is not None and nb["ph"] < ph - 0.1:
            C.wall(CB, f, nb["ph"], ph, col, ov)
    C.roof(CB, xa, xb, zn, zs, ph)
    B.ROOFS.append((CB, xa, xb, zn, zs, ph))


def _slab(U):
    """A tower's street slab: on the lot line, to the hero's roofline."""
    L = U["lot"]
    side, r, ph, h = L["side"], L["r"], L["ph"], U["h"]
    sd = DEPTH if U["back"] == "flush" else L["sd"]
    tint, tcol = U["tint"], B.TRIM[U["tint"]]
    col = B.wall_col(U["lit"], U["style"], U["warmth"], tint)
    back_col = B.wall_col(U["lit"] * 0.7, U["style"] if U["style"] in (2, 4, 5) else 6, U["warmth"], tint)
    st, bk, so, no, xa, xb = _faces(side, 0.0, sd, U["zn"], U["zs"])
    B.COLLISION.append(("box", xa, xb, ph, h, U["zn"], U["zs"], "canyon"))
    C.wall(FA, st, ph, h, col, U["ov"])
    C.wall(FA, so, ph, h, col, U["ov"])
    C.wall(CB, no, ph, h, col, U["ov"])
    C.wall(CB, bk, ph, h, back_col, U["ov"])
    C.roof(CB, xa, xb, U["zn"], U["zs"], h)
    B.ROOFS.append((CB, xa, xb, U["zn"], U["zs"], h))
    # The parapet the hero's roofline ends in, as it always has.
    C.parapet(FA, st, h, tcol)
    C.parapet(FA, so, h, tcol)
    C.parapet(CB, no, h, tcol)
    C.parapet(CB, bk, h, tcol)
    U.update(sd=sd, col=col, back_col=back_col, st=st, x=(xa, xb))
    return st


def _back(U):
    """The mass behind the slab: a crown the hero's lens cannot see, or a
    terrace."""
    L = U["lot"]
    side, r, ph, h, sd = L["side"], L["r"], L["ph"], U["h"], U["sd"]
    if U["back"] == "flush":
        return
    tcol = B.TRIM[U["tint"]]
    zn, zs = U["zn"] + U["ki"], U["zs"] - U["ki"]
    u1 = DEPTH - L["bi"]
    xa, xb = sorted((_x(side, sd), _x(side, u1)))
    if U["back"] == "low":
        top = fl(int((h - SHOP_H) / CELL_H * r.uniform(0.5, 0.72)))
    else:
        top = C.hidden_top(OCC, xa, xb, zn, zs, h, h + U["back"], plaza=side > 0 and L["i"] <= 4) or h
    st, bk, so, no, xa, xb = _faces(side, sd, u1, zn, zs)
    B.COLLISION.append(("box", xa, xb, ph, top, zn, zs, "canyon"))
    for f in (bk, so, no):
        C.wall(CB, f, ph, top, U["back_col"] if f is bk else U["col"], U["ov"])
        C.parapet(CB, f, top, tcol)
    if top > h + 0.5:
        C.wall(CB, st, h, top, U["col"], U["ov"])
        C.parapet(CB, st, top, tcol)
    C.roof(CB, xa, xb, zn, zs, top)
    B.ROOFS.append((CB, xa, xb, zn, zs, top))
    OCC.append(((xa, 0.0, zn), (xb, top, zs)))
    U.update(top=top, bx=(xa, xb), bz=(zn, zs))
    if top < h + 8.0:
        return
    # A crown stepped in from the mass under it, a band of light under its
    # roof, and a mast with a red lamp: all as high as the lenses allow.
    cx0, cx1, cz0, cz1 = xa + 2.5, xb - 2.5, zn + 2.5, zs - 2.5
    if cx1 - cx0 < 5.0 or cz1 - cz0 < 5.0:
        return
    ctop = C.hidden_top(OCC, cx0, cx1, cz0, cz1, top, top + r.uniform(6.0, 12.0), plaza=side > 0 and L["i"] <= 4, least=3.0)
    if ctop is None:
        return
    hue = r.choice(("cyan", "magenta", "amber", "pink", "teal", "red"))
    for f in B.faces_of(cx0, cx1, cz0, cz1).values():
        C.wall(CB, f, top, ctop, U["col"], U["ov"])
        C.strip(CB, f, 0.0, f.width, ctop - 1.3, ctop - 0.9, hue, out=0.08)
    C.roof(CB, cx0, cx1, cz0, cz1, ctop)
    B.ROOFS.append((CB, cx0, cx1, cz0, cz1, ctop))
    OCC.append(((cx0, 0.0, cz0), (cx1, ctop, cz1)))
    U.update(crown=(cx0, cx1, cz0, cz1, ctop))


def _dress_street(U):
    """The street face of a tower over its podium: ledges every few floors,
    fins on some, a line of light under the roof on some, a seam of light up
    the corner that faces the hero, and its signs."""
    L = U["lot"]
    side, r, ph, h, st = L["side"], L["r"], L["ph"], U["h"], U["st"]
    tcol = B.TRIM[U["tint"]]
    w = st.width
    every = r.choice((3, 4, 5))
    y = ph + CELL_H * every
    while y < h - 3.0:
        st.ledge((CB, "trim", 1), 0.0, w, y - 0.22, 0.22, 0.2, tcol)
        y += CELL_H * every
    if r.random() < 0.4:
        bays = max(1, round(w / CELL_W))
        for b in range(0, bays + 1, 2):
            s = min(max(b * w / bays, 0.2), w - 0.2)
            st.box((CB, "trim", 1), s - 0.16, s + 0.16, ph, h - 0.6, 0.0, 0.32, col=tcol)
    hue = r.choice(("cyan", "magenta", "amber", "pink", "teal"))
    if r.random() < 0.4:
        C.strip(FA, st, 0.3, w - 0.3, h - 1.6, h - 1.15, hue)
    if U["south"] != "abut" and r.random() < 0.6:
        # Up the south face, by the street corner: the face the hero sees.
        so = B.Face("+z", U["zs"], *U["x"])
        s = 0.5 if side > 0 else so.width - 0.5
        C.strip(FA, so, s - 0.18, s + 0.18, ph + 1.0, h - 2.0, r.choice(("cyan", "magenta", "pink", "white")))
    # Signs: the dense belt over the shops, on the podium, and a looser one
    # up the slab's first floors; high on the slab a big blade or two.
    s0 = abs(U["zn"] - st.left) if st.left != st.a0 else 0.0
    C.street_signs(st, r, 0.5, w - 0.5, SHOP_H + 0.9, ph - 1.0, max(3, round(w / 4.0)))
    C.street_signs(st, r, 0.5, w - 0.5, ph + 0.6, min(h - 6.0, ph + 16.0), max(2, round(w / 7.0)))
    for _ in range(r.randrange(1, 3)):
        C.blade(st, r.uniform(1.5, w - 1.5), r.uniform(ph + 14.0, h - 8.0), "bl", r.choice((0.0, 0.3, -0.3)), FA, CB, CB)
    del s0


for side in (-1, 1):
    for L in ROWS[side]:
        _podium(L)
        for U in L["units"]:
            _slab(U)
for side in (-1, 1):
    for L in ROWS[side]:
        for U in L["units"]:
            _back(U)
            _dress_street(U)
        # A tall vertical sign on most lots, facing down the avenue, the
        # plate's column of type running up the facades.
        i, U = L["i"], L["units"][0]
        if i % 3 != 2:
            h = min(L["h"] * 0.5, 40.0)
            C.tall(f"far_{'l' if side < 0 else 'r'}{i}", side * (WALK - 1.6), SHOP_H + 3.0, h, U["zs"] - 3.0)

# Alleys between the towers, from the avenue's pavement to the lane behind.
for side in (-1, 1):
    for L in ROWS[side]:
        for z_hi, z_lo in ((L["z1"], L["pz1"]), (L["pz0"], L["z0"])):
            if z_hi - z_lo > 0.5:
                xa, xb = sorted((_x(side, 0.0), _x(side, DEPTH)))
                B.ground_rect(CB, xa, xb, z_lo, z_hi)

# Every roof the hero looks along, dressed now that all their masses are
# known, with only what its lens cannot see.
for _t in HERO_ROOFS:
    B.roof_dress(_t[0], _t[1], _t[2], _t[3], _t[4], _t[5], random.Random(_t[6]), cap=_t[7], face=_t[8], hero=True,
                 tint=_t[9] if len(_t) > 9 else 0)

# The figure's image is 2:3; the plane matches it. Huge, as the plate has
# her: from the hero camera her waist is over the canyon's last roofs and
# her head at the top of the frame, past the last lots, over the road's end.
HOLO = (-12.4, 154.0, -570.0, 104.0, 156.0)
hx, hy, hz, hw, hh = HOLO
named_quad("holo_figure", "holo", hx, hy, hz, hw, hh, 0.0, props={"district": FA})
empty("anchor_holo", (hx, hy, hz))
# Her slogan on a tall blade on the canyon's right, on the one lot there
# without a column of its own.
sign("beauty", WALK - 2.5, SHOP_H + 18.0, -261.0, 4.4, 30.0, 0.0, preview="美しさは、力だ", district=FA)
box((FA, "board_frame", 0), WALK - 4.75, WALK - 0.25, SHOP_H + 2.8, SHOP_H + 33.2, -261.25, -261.05, scale=1.0)

# ARASAKA's tower stands right of her, a block off the avenue, its name in
# the band of sky between her and the canyon's right-hand roofs, turned to
# the hero's lens, where the plate has it.
ARASAKA = (75.0, -490.0)
ax, az = ARASAKA
# A corporation's tower: a podium wider than the tower with a lit lobby, a
# shaft with its corners cut back, the red band at the setback, the upper
# floors square so the name has its whole face, the second red band, and a
# crown of red fins round a dark head with a mast over it. The width the
# hero's band of sky frames is the shaft's, as before.
prism(FA, cut_rect(ax, az, 32.0, 32.0, 5.0), SHOP_H, 21.0, 4500, col=(0.55, 2 / 8.0, 0.45, 1))
box((FA, "dark", 0), ax - 32, ax + 32, 0, SHOP_H, az - 32, az + 32, scale=4.0)
band(FA, cut_rect(ax, az, 32.0, 32.0, 5.0), SHOP_H - 0.6, SHOP_H - 0.2, "white", out=0.2)
band(FA, cut_rect(ax, az, 32.0, 32.0, 5.0), 20.2, 21.0, "red", out=0.25)
prism(FA, cut_rect(ax, az, 26.0, 26.0, 5.0), 21.0, 110.0, 4501, col=(0.3, 0.5, 0.2, 1))
band(FA, cut_rect(ax, az, 26.0, 26.0, 5.0), 108.0, 110.0, "red", out=0.3)
mass(FA, ax - 22, ax + 22, az - 22, az + 22, 110, 182, 4502, col=(0.22, 0.5, 0.2, 1))
box((FA, "neon_red", 0), ax - 22.3, ax + 22.3, 180.2, 182.2, az - 22.3, az + 22.3, scale=1.0)
sign("arasaka", ax, 159.0, az + 22.6, 44.0, 15.0, 0.0, preview="ARASAKA", district=FA)
prism(FA, cut_rect(ax, az, 18.0, 18.0, 3.5), 182.2, 203.0, 4503, col=(0.08, 4 / 8.0, 0.2, 1))
for sx, sz, alongx in ((0, 1, True), (0, -1, True), (1, 0, False), (-1, 0, False)):
    for f in (-10.0, -3.4, 3.4, 10.0):
        fx = ax + (f if alongx else sx * 18.25)
        fz = az + (sz * 18.25 if alongx else f)
        wx, wz = (0.45, 0.3) if alongx else (0.3, 0.45)
        box((FA, "neon_red", 0), fx - wx, fx + wx, 184.0, 201.5, fz - wz, fz + wz, scale=1.0)
box((FA, "neon_red", 0), ax - 18.3, ax + 18.3, 202.4, 203.2, az - 18.3, az + 18.3, scale=1.0)
cylinder((FA, "metal", 0), ax, az, 203.0, 232.0, 0.8, segs=8)
cylinder((FA, "neon_red", 0), ax, az, 232.0, 234.0, 1.1, segs=8)
