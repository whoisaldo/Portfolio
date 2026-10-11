from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw import buildings as B
from ncw import props as P
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
ABUT = {-1: (-372.0,), 1: (-258.0, -646.0)}
# The rail viaduct (the Megabuilding's, z -610) crosses the rows through a
# slot of its own, ground to sky.
RAIL = (-615.5, -605.5)
# ARASAKA's forecourt takes the north two thirds of the right-hand lot at
# z -448..-514 (its podium stood inside that lot).
FORECOURT = (-514.0, -470.0)
# Lots whose ground floor is an arcade: the shops set back behind columns,
# stalls and benches under cover.
ARCADES = {-1: (4, 7), 1: (5, 8)}
# Each tower's second mass, by lot and by half of a long lot: a crown rising
# so many metres over the street slab (as far as the hero's and the Work
# shot's lenses allow), a low terrace, or none (the slab fills the lot).
BACKS = {
    -1: {0: (14,), 1: ("low",), 2: (18,), 3: ("low",), 4: (26,), 5: (16,), 6: (30,), 7: ("low", 34), 8: (24, "low"),
         9: (30, "flush"), 10: (20,)},
    1: {0: ("low",), 1: ("flush",), 2: ("low",), 3: ("flush",), 4: ("low",), 5: (28, "low"), 6: (20,), 7: ("low", 30),
        8: (26, "low"), 9: ("low", 22)},
}
# What stands between the hero's lens and the canyon: the avenue's lots.
AVENUE_MASSES = list(HERO_MASSES)
HUES = ("cyan", "magenta", "amber", "pink", "teal")


def _x(side, u):
    """World x of a point u metres back from the lot line."""
    return side * (WALK + u)


def _faces(side, u0, u1, zn, zs):
    """A mass u0..u1 back from the lot line, zn..zs along it: its street,
    back, south and north faces and its x range."""
    xa, xb = sorted((_x(side, u0), _x(side, u1)))
    return (B.Face("-x" if side > 0 else "+x", _x(side, u0), zn, zs), B.Face("+x" if side > 0 else "-x", _x(side, u1), zn, zs),
            B.Face("+z", zs, xa, xb), B.Face("-z", zn, xa, xb), xa, xb)


def _rail(zn, zs, north, south):
    """A stretch of a row with the viaduct's slot taken out of it."""
    c0, c1 = RAIL
    if c1 <= zn or c0 >= zs:
        return [(zn, zs, north, south)]
    out = []
    if zs > c1 + 4.0:
        out.append((c1, zs, "alley", south))
    if zn < c0 - 4.0:
        out.append((zn, c0, north, "alley"))
    return out


def _layout(side):
    """The row's lots with their ends worked out, and each lot's towers."""
    lots = []
    for i, (z_start, depth, height) in enumerate(FAR_LOTS[side]):
        z1, z0 = float(z_start), max(float(z_start - depth), ROW_END)
        if side > 0 and i == 6:
            z0 = FORECOURT[1]
        r = random.Random(4700 + i * 13 + (0 if side > 0 else 500))
        lots.append(dict(i=i, side=side, z1=z1, z0=z0, h=float(height), r=r, cut_s=0.0, cut_n=0.0, south="street", north="street",
                         ph=fl(r.choice((3, 4, 4))), sd=r.choice((12.0, 14.0, 16.0, 18.0)), bi=r.choice((0.0, 2.0, 3.0)),
                         arcade=i in ARCADES[side], square=False))
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
    # The square's west wall (the right-hand row's first lots back onto it)
    # carries two of the plaza's boards and the braindance's GPU clue: its
    # podium is tall enough for them and its back stands on the lot line.
    if side > 0:
        for L in lots[:3]:
            L["ph"], L["bi"] = fl(4), 0.0
        lots[0]["square"] = lots[1]["square"] = True
    for L in lots:
        r = L["r"]
        alley_s = GAP if L["south"] == "alley" and L["cut_s"] else 0.0
        alley_n = GAP if L["north"] == "alley" and L["cut_n"] else 0.0
        L["pods"] = _rail(L["z0"] + alley_n, L["z1"] - alley_s, L["north"], L["south"])
        spans = []
        for zn, zs, en, es in _rail(L["z0"] + L["cut_n"], L["z1"] - L["cut_s"], L["north"], L["south"]):
            if zs - zn >= 54.0:
                m = zn + (zs - zn) * r.uniform(0.44, 0.56)
                spans += [(m + GAP / 2, zs, "notch", es), (zn, m - GAP / 2, en, "notch")]
            else:
                spans.append((zn, zs, en, es))
        kinds = BACKS[side][L["i"]]
        L["units"] = []
        for k, (un, us, en, es) in enumerate(spans):
            style = r.choices((5, 2, 4, 0, 1, 6), weights=(4, 3, 1.5, 1.5, 1, 1))[0]
            tint = B.TINTS[r.choices(("navy", "teal", "charcoal", "plum"), weights=(3, 3, 2, 1))[0]]
            L["units"].append(dict(lot=L, k=k, zs=us, zn=un, south=es, north=en, h=L["h"], back=kinds[min(k, len(kinds) - 1)],
                                   style=style, tint=tint, lit=r.uniform(0.4, 0.8), warmth=r.uniform(0.15, 0.95), ov=r.randrange(0, 40),
                                   ki=r.choice((0.0, 2.0, 3.0))))
    return lots


ROWS = {side: _layout(side) for side in (-1, 1)}
# Every mass the hero's lens meets first: the avenue's, and the canyon's
# podiums and street slabs. A crown is built only as high as these hide it.
OCC = list(AVENUE_MASSES)
for side, lots in ROWS.items():
    for L in lots:
        xa, xb = sorted((_x(side, 0.0), _x(side, DEPTH)))
        for zn, zs, _, _ in L["pods"]:
            OCC.append(((xa, 0.0, zn), (xb, L["ph"], zs)))
        for U in L["units"]:
            sd = DEPTH if U["back"] == "flush" else L["sd"]
            xa, xb = sorted((_x(side, 0.0), _x(side, sd)))
            OCC.append(((xa, 0.0, U["zn"]), (xb, U["h"], U["zs"])))
HERO_MASSES.extend(OCC[len(AVENUE_MASSES):])


def _doorway(f, s, r, depth=0.45):
    """Someone in a recessed doorway, out of the rain."""
    x, _, z = f.p(f.at(s), 0.0, -depth)
    stand(x, z, f.yaw, r.choice(("lean", "phone", "smoke", "idle")), B.G0)


def _podium(L, zn, zs, north, south):
    side, r, ph = L["side"], L["r"], L["ph"]
    tint = L["units"][0]["tint"]
    tcol = B.TRIM[tint]
    col = B.wall_col(r.uniform(0.7, 0.95), r.choice((4, 2, 4)), r.uniform(0.2, 0.8), tint)
    back_col = B.wall_col(col[0] * 0.6, 6, col[2], tint)
    ov = r.randrange(0, 40)
    st, bk, so, no, xa, xb = _faces(side, 0.0, DEPTH, zn, zs)
    w = st.width
    B.COLLISION.append(("box", xa, xb, 0.0, ph, zn, zs, "canyon"))
    # The avenue's face: shops along the pavement (their glass in the core),
    # two or three floors of offices over them, a cornice with a line of
    # light under it.
    if L["arcade"]:
        # An arcade: columns on the lot line, the shops set back under a lit
        # soffit, stalls and benches and people under cover.
        deep = 3.0
        st2 = B.Face(st.name, _x(side, deep), zn, zs)
        st2.quad((FA, "dark", 0), 0.0, w, 0.0, SHOP_H, -0.95)
        doors = C.shopfront(st2, r, 0.0, w, tint, glass=FA, key=CB, awning_rate=0.0)
        bays = max(2, round(w / (CELL_W * 2)))
        for b in range(bays + 1):
            s = min(max(b * w / bays, 0.3), w - 0.3)
            st.box((CB, "trim", 0), s - 0.3, s + 0.3, 0.0, SHOP_H - 0.5, -0.6, 0.0, col=tcol)
        st.box((CB, "trim", 0), 0.0, w, SHOP_H - 0.5, SHOP_H, -0.6, 0.0, col=tcol)
        ax0, ax1 = sorted((_x(side, 0.0), _x(side, deep)))
        box((CB, "trim", 0), ax0, ax1, SHOP_H - 0.12, SHOP_H - 0.06, zn, zs, scale=2.0, col=B.DARK_TRIM, bottom=True)
        B.ground_rect(CB, ax0, ax1, zn, zs)
        for e in (zn, zs):
            fe = B.Face("+z" if e == zn else "-z", e, ax0, ax1)
            fe.quad((CB, "trim", 0), 0.0, fe.width, 0.0, SHOP_H, 0.0, col=B.DARK_TRIM)
        z = zn + 4.0
        while z < zs - 3.0:
            cx = _x(side, 1.7)
            box((CB, "glow", 0), cx - 0.6, cx + 0.6, SHOP_H - 0.2, SHOP_H - 0.13, z - 0.12, z + 0.12, scale=0.5,
                col=GLOW[r.choice(("white", "amber", "cyan"))], bottom=True)
            light(CB, cx, 3.6, z, "white", 3.0)
            z += 6.4
        # Under it, against the shops: stalls with someone serving and
        # someone eating, vending machines, a bench, people out of the rain.
        z = zn + 5.0
        out = math.pi / 2 * -side
        while z < zs - 5.0:
            roll = r.random()
            bx_ = _x(side, deep - 1.25)
            if roll < 0.4:
                P.place("cy_stall", bx_, B.G0, z, out, district=CB)
                stand(bx_ + side * 0.55, z, out, "vendor", B.G0)
                for dz in (-0.7, 0.6):
                    if r.random() < 0.8:
                        P.place("cy_stool", bx_ - side * 1.25, B.G0, z + dz, district=CB)
                        stand(bx_ - side * 1.25, z + dz, out + math.pi, "sit", B.G0 + 0.5)
            elif roll < 0.65:
                P.place(r.choice(("vending", "vending_warm")), _x(side, deep - 0.5), B.G0, z, out, district=CB)
                if r.random() < 0.6:
                    stand(_x(side, deep - 1.5), z + 0.2, out + math.pi, r.choice(("idle", "phone")), B.G0)
            elif roll < 0.85:
                P.place("bench", _x(side, deep - 0.5), B.G0, z, math.pi / 2, district=CB)
                stand(_x(side, deep - 0.5), z + r.uniform(-0.5, 0.5), out, "sit", B.G0 + 0.48)
            else:
                a = _x(side, 1.2)
                stand(a, z, 0.0, "talk", B.G0)
                stand(a, z + 1.0, math.pi, "talk", B.G0)
            z += r.uniform(5.5, 8.5)
        for s in doors:
            if r.random() < 0.5:
                _doorway(st2, s, r)
    else:
        st.quad((FA, "dark", 0), 0.0, w, 0.0, SHOP_H, -0.95)
        doors = C.shopfront(st, r, 0.0, w, tint, glass=FA, key=CB)
        for s in doors:
            if r.random() < 0.6:
                _doorway(st, s, r)
        if r.random() < 0.35:
            B.canopy(CB, st, 1.0, w - 1.0, 2.6, SHOP_H - 0.5, tint, r.choice(("white", "cyan", "amber")))
    C.wall(FA, st, SHOP_H, ph, col, ov)
    st.ledge((CB, "trim", 0), 0.0, w, SHOP_H - 0.05, 0.3, 0.35, tcol)
    st.ledge((CB, "trim", 0), 0.0, w, ph - 0.45, 0.45, 0.55, tcol)
    if r.random() < 0.6:
        st.box((CB, "neon_" + r.choice(HUES), 0), 0.4, w - 0.4, ph - 0.56, ph - 0.48, 0.42, 0.5)
    if L["square"]:
        # Onto the plaza's square: a front of its own, shops under a canopy,
        # the square's boards over them.
        doors = C.shopfront(bk, r, 0.0, bk.width, tint, glass=CB, key=CB, awning_rate=0.0, palette=["cyan", "white", "amber", "teal"])
        C.wall(CB, bk, SHOP_H, ph, col, ov)
        bk.ledge((CB, "trim", 0), 0.0, bk.width, SHOP_H - 0.05, 0.3, 0.35, tcol)
        bk.ledge((CB, "trim", 0), 0.0, bk.width, ph - 0.45, 0.45, 0.55, tcol)
        B.canopy(CB, bk, 0.5, bk.width - 0.5, 2.2, SHOP_H - 0.5, tint, "cyan")
        for s in doors:
            _doorway(bk, s, r)
    else:
        # Its back, on the lane: a service floor of doors, lamps and
        # shutters, the smaller windows a block turns to its back, pipes,
        # ducts and condensers.
        C.service_wall(bk, r)
        C.wall(CB, bk, SHOP_H, ph, back_col, ov)
        B.clutter_back(CB, bk, r, SHOP_H, ph)
        for _ in range(max(1, int(bk.width / 14.0))):
            s = r.uniform(1.0, bk.width - 1.0)
            px, _, pz = bk.p(bk.at(s), 0.0, 0.0)
            if r.random() < 0.6:
                P.place("cy_duct", px, SHOP_H, pz, bk.yaw, sy=ph - SHOP_H + r.uniform(4.0, 16.0), district=CB)
            else:
                bk.box((CB, "metal", 1), s - 1.1, s + 1.1, SHOP_H + 2.0, SHOP_H + 2.1, 0.0, 1.0)
                ux, _, uz = bk.p(bk.at(s), 0.0, 0.5)
                P.place("cy_unit", ux, SHOP_H + 2.1, uz, bk.yaw, district=CB)
    # Its ends: a street's corner, an alley's wall, the forecourt's edge, or
    # a neighbour's podium (built only where it stands over the neighbour's).
    rows = ROWS[side]
    j = rows.index(L)
    for f, kind, nb in ((so, south, rows[j - 1] if j else None), (no, north, rows[j + 1] if j + 1 < len(rows) else None)):
        if kind in ("street", "court"):
            hero = kind == "court" and f.nz > 0
            if hero:
                f.quad((FA, "dark", 0), 0.0, f.width, 0.0, SHOP_H, -0.95)
            doors = C.shopfront(f, r, 0.0, f.width, tint, glass=FA if hero else CB, key=CB)
            C.wall(FA if hero else CB, f, SHOP_H, ph, col, ov)
            f.ledge((CB, "trim", 0), 0.0, f.width, SHOP_H - 0.05, 0.3, 0.35, tcol)
            f.ledge((CB, "trim", 0), 0.0, f.width, ph - 0.45, 0.45, 0.55, tcol)
            C.street_signs(f, r, 0.5, f.width - 0.5, SHOP_H + 0.8, ph - 0.8, max(3, round(f.width / 5.0)), hero=False)
            for s in doors:
                _doorway(f, s, r)
        elif kind == "alley":
            C.service_wall(f, r)
            C.wall(CB, f, SHOP_H, ph, back_col, ov)
            B.clutter_back(CB, f, r, SHOP_H, ph)
            for _ in range(2):
                C.blade(f, r.uniform(2.0, f.width - 2.0), r.uniform(5.2, 8.0), r.choice(("bs", "bm", "bx")), r.choice((0.0, 0.35, -0.35)))
        elif nb is not None and nb["ph"] < ph - 0.1:
            C.wall(CB, f, nb["ph"], ph, col, ov)
    C.roof(CB, xa, xb, zn, zs, ph)
    B.ROOFS.append((CB, xa, xb, zn, zs, ph))


def _slab(U):
    """A tower's street slab: on the lot line, to the hero's roofline."""
    L = U["lot"]
    side, ph, h = L["side"], L["ph"], U["h"]
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
    U.update(sd=sd, col=col, back_col=back_col, st=st, bk=bk, x=(xa, xb))


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
    plaza = side > 0 and L["i"] <= 4
    if U["back"] == "low":
        top = fl(int((h - SHOP_H) / CELL_H * r.uniform(0.5, 0.72)))
    else:
        top = C.hidden_top(OCC, xa, xb, zn, zs, h, h + U["back"], plaza=plaza) or h
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
    U.update(top=top, bx=(xa, xb), bz=(zn, zs), bbk=bk)
    if top < h + 8.0:
        return
    # A crown stepped in from the mass under it, a band of light under its
    # roof, and a mast with red lamps: all as high as the lenses allow.
    cx0, cx1, cz0, cz1 = xa + 2.5, xb - 2.5, zn + 2.5, zs - 2.5
    if cx1 - cx0 < 5.0 or cz1 - cz0 < 5.0:
        return
    ctop = C.hidden_top(OCC, cx0, cx1, cz0, cz1, top, top + r.uniform(6.0, 12.0), plaza=plaza, least=3.0)
    if ctop is None:
        return
    hue = r.choice(HUES + ("red",))
    for f in B.faces_of(cx0, cx1, cz0, cz1).values():
        C.wall(CB, f, top, ctop, U["col"], U["ov"])
        C.strip(CB, f, 0.0, f.width, ctop - 1.3, ctop - 0.9, hue, out=0.08)
    C.roof(CB, cx0, cx1, cz0, cz1, ctop)
    B.ROOFS.append((CB, cx0, cx1, cz0, cz1, ctop))
    OCC.append(((cx0, 0.0, cz0), (cx1, ctop, cz1)))
    U.update(crown=(cx0, cx1, cz0, cz1, ctop))
    print("CANYON crown", side, L["i"], U["k"], round(cx0, 1), round(cx1, 1), round(cz0, 1), round(cz1, 1), "slab", h, "mass", top, "crown", round(ctop, 1))
    mx, mz = (cx0 + cx1) / 2, (cz0 + cz1) / 2
    mtop = C.hidden_top(OCC, mx - 0.5, mx + 0.5, mz - 0.5, mz + 0.5, ctop, ctop + 16.5, plaza=plaza, pad=0.3, least=6.0)
    if mtop:
        P.place("cy_mast", mx, ctop, mz, r.uniform(0, 1.5), sy=(mtop - ctop) / 16.3, district=CB)


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
    if r.random() < 0.4:
        C.strip(FA, st, 0.3, w - 0.3, h - 1.6, h - 1.15, r.choice(HUES))
    if U["north"] != "abut" and r.random() < 0.6:
        # A seam of light up the north face, by the street corner (the south
        # face is the hero's, and stays dark against its band of sky).
        no = B.Face("-z", U["zn"], *U["x"])
        s = no.width - 0.5 if side > 0 else 0.5
        C.strip(CB, no, s - 0.18, s + 0.18, ph + 1.0, h - 2.0, r.choice(("cyan", "magenta", "pink", "white")))
    # Signs: the dense belt over the shops, on the podium, and a looser one
    # up the slab's first floors; high on the slab a big blade or two, and
    # on some a screen canted toward the traffic coming up the avenue.
    C.street_signs(st, r, 0.5, w - 0.5, SHOP_H + 0.9, ph - 1.0, max(3, round(w / 4.0)))
    C.street_signs(st, r, 0.5, w - 0.5, ph + 0.6, min(h - 6.0, ph + 16.0), max(2, round(w / 7.0)))
    for _ in range(r.randrange(1, 3)):
        C.blade(st, r.uniform(1.5, w - 1.5), r.uniform(ph + 14.0, h - 8.0), "bl", r.choice((0.0, 0.3, -0.3)), FA, CB, CB)
    # (None on the first lots of the right-hand row: they stand between the
    # hero's lens and the figure's slogan.)
    if w > 18.0 and r.random() < 0.55 and not (side > 0 and L["i"] <= 2):
        sw = r.uniform(5.0, 7.5)
        sh = sw * r.uniform(1.2, 1.6)
        C.screen(st, r.uniform(sw, w - sw), r.uniform(ph + sh / 2 + 2.0, max(ph + sh / 2 + 2.5, h * 0.62)), sw, sh, r, 1.0, key=FA)


def _dress_back(U):
    """What the towers show the lanes, Japantown and the square: the slab's
    back over a terrace, the crown's flanks, seams of light up the corners,
    a screen or a column of type high on the wall."""
    L = U["lot"]
    side, r, ph, h = L["side"], L["r"], L["ph"], U["h"]
    # Never on the square's wall near the plaza's boards and the clue.
    quiet = L["square"]
    if U["back"] == "flush":
        f, lo, hi = U["bk"], ph, h
    else:
        f, lo, hi = U["bbk"], ph, U["top"]
    w = f.width
    if not quiet and hi - lo > 14.0 and w > 12.0 and r.random() < 0.6:
        sw = r.uniform(5.0, 8.0)
        sh = min(hi - lo - 6.0, sw * r.uniform(1.4, 2.2))
        C.screen(f, r.uniform(sw / 2 + 1.0, w - sw / 2 - 1.0), hi - 3.0 - sh / 2, sw, sh, r, 0.0, back=False)
    if not quiet:
        for s in (0.25, w - 0.25):
            if r.random() < 0.5:
                C.strip(CB, f, s - 0.15, s + 0.15, lo + 1.0, hi - 1.5, r.choice(HUES + ("white",)))
        for _ in range(r.randrange(1, 4)):
            C.blade(f, r.uniform(1.5, w - 1.5), r.uniform(lo + 4.0, max(lo + 5.0, hi - 6.0)), "bl", r.choice((0.0, 0.3, -0.3)))
    if U["back"] == "low" and h - U["top"] > 10.0:
        # The slab's back over the terrace.
        sb = U["bk"]
        if r.random() < 0.7:
            sw = r.uniform(6.0, 9.0)
            sh = min(h - U["top"] - 4.0, sw * 0.7)
            C.screen(sb, r.uniform(sw / 2 + 1.0, sb.width - sw / 2 - 1.0), U["top"] + 2.5 + sh / 2, sw, sh, r, 0.0, back=False)
        C.strip(CB, sb, 0.5, sb.width - 0.5, h - 1.6, h - 1.2, r.choice(HUES))


def _roofs(U):
    """Every roof of a tower, from the air: plant, light and structure where
    no lens of the page's sees them, lines of light round the edges, and on
    a terrace a deck that is lived on."""
    L = U["lot"]
    side, r, h = L["side"], L["r"], U["h"]
    away = "+x" if side > 0 else "-x"
    # The slab's roof in two strips, each as high as the hero's lens allows:
    # low by the street edge, more behind it.
    zn, zs = U["zn"] + 1.0, U["zs"] - 1.0
    for u0, u1, lines in ((3.5, 8.0, ()), (8.0, U["sd"] - 0.6, ("-z",) + ((away,) if U["back"] == "low" else ()))):
        if u1 - u0 < 3.0:
            continue
        xa, xb = sorted((_x(side, u0), _x(side, u1)))
        top = C.hidden_top(OCC, xa, xb, zn, zs, h, h + 7.0, step=1.0, pad=0.2, least=1.0)
        if top:
            C.roof_plant(CB, xa, xb, zn, zs, h, r, top - h, lines)
    if U["back"] == "flush":
        return
    bx0, bx1 = U["bx"]
    bz0, bz1 = U["bz"]
    t = U["top"]
    ring = ("+x", "-x", "+z", "-z") if r.random() < 0.75 else ()
    if U.get("crown"):
        # Round the crown's foot: condensers, a line of light; on its top,
        # plant under the mast.
        C.roof_plant(CB, bx0, bx1, bz0, bz1, t, r, 0.0, ring)
        for cx, cz in ((bx0 + 1.2, bz0 + 1.3), (bx1 - 1.2, bz1 - 1.3), (bx0 + 1.2, bz1 - 1.3), (bx1 - 1.2, bz0 + 1.3)):
            if r.random() < 0.75:
                P.place("cy_unit", cx, t, cz, r.choice((0.0, math.pi / 2)), district=CB)
        cx0, cx1, cz0, cz1, ct = U["crown"]
        C.roof_plant(CB, cx0 + 0.5, cx1 - 0.5, cz0 + 0.5, cz1 - 0.5, ct, r, 1.6)
        return
    if t > h:
        cap = C.hidden_top(OCC, bx0, bx1, bz0, bz1, t, t + 7.0, step=1.0, pad=0.2, least=1.0)
        C.roof_plant(CB, bx0 + 0.6, bx1 - 0.6, bz0 + 0.6, bz1 - 0.6, t, r, (cap - t) if cap else 0.0, ring)
        return
    # A terrace: plant on its north half, a deck on its south: lamps on long
    # arms throwing cyan pools, benches along the parapet, a tree, people.
    mid = (bz0 + bz1) / 2
    C.roof_plant(CB, bx0 + 0.6, bx1 - 0.6, bz0 + 0.6, mid - 0.5, t, r, 6.0, ring)
    edge = bx1 - 0.75 if side > 0 else bx0 + 0.75
    inward = -math.pi / 2 * side
    for z in (mid + 2.0, bz1 - 2.0):
        P.place("cy_deck_lamp", edge - side * 0.3, t, z, inward, district=CB)
        light(CB, edge - side * 1.7, t + 3.0, z, "cyan", 5.0)
    P.place("planter_tree", (bx0 + bx1) / 2, t, mid + 2.5, district=CB)
    P.place("bench", edge - side * 0.3, t, (mid + bz1) / 2, math.pi / 2, district=CB)
    stand(edge - side * 0.3, (mid + bz1) / 2 + r.uniform(-0.5, 0.5), inward, "sit", t + 0.48)
    stand(edge, mid + 3.4, inward, "lean", t)
    # A bar against the slab's wall under a line of light, someone serving,
    # two on stools; trees at the deck's corners.
    wall_x = _x(side, U["sd"])
    out = math.pi / 2 * side
    sz = mid + 4.2
    if bz1 - mid > 7.5 and abs(edge - wall_x) > 6.0:
        P.place("cy_stall", wall_x + side * 1.25, t, sz, out, district=CB)
        stand(wall_x + side * 0.7, sz, out, "vendor", t)
        for dz in (-0.6, 0.7):
            P.place("cy_stool", wall_x + side * 2.75, t, sz + dz, district=CB)
            stand(wall_x + side * 2.75, sz + dz, out + math.pi, "sit", t + 0.5)
        light(CB, wall_x + side * 2.5, t + 2.0, sz, "pink", 5.0)
    C.tube(CB, (wall_x + side * 0.1, t + 3.2, bz1 - 1.5), (edge + side * 0.4, t + 3.2, bz1 - 1.5), "amber")
    for z in (mid + 0.9, bz1 - 0.9):
        P.place("planter_tree", wall_x + side * 1.0, t, z, district=CB)
    if bz1 - mid > 9.0:
        cx = (bx0 + bx1) / 2 + side * 2.0
        stand(cx, bz1 - 3.0, 0.0, "talk", t)
        stand(cx, bz1 - 2.0, math.pi, "talk", t)
        stand(edge, bz1 - 1.2, inward, r.choice(("smoke", "phone", "lean")), t)
    print("CANYON terrace", side, L["i"], U["k"], round(bx0, 1), round(bx1, 1), round(bz0, 1), round(bz1, 1), round(t, 1), "slab", h)


for side in (-1, 1):
    for L in ROWS[side]:
        for pod in L["pods"]:
            _podium(L, *pod)
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
for side in (-1, 1):
    for L in ROWS[side]:
        for U in L["units"]:
            _dress_back(U)
            _roofs(U)

# The slots: what is left of each lot where a podium was cut is an alley (or
# the viaduct's slot), paved, lit and lived in; across the slots over the
# podiums, a service bridge here and there.
_alleys = 0
for side in (-1, 1):
    xa, xb = sorted((_x(side, 0.0), _x(side, DEPTH)))
    row = ROWS[side]
    for L in row:
        edges = [L["z1"]] + [e for zn, zs, _, _ in L["pods"] for e in (zs, zn)] + [L["z0"]]
        for z_hi, z_lo in zip(edges[::2], edges[1::2]):
            if z_hi - z_lo < 0.5:
                continue
            B.ground_rect(CB, xa, xb, z_lo, z_hi)
            lr = random.Random(int(abs(z_lo) * 7 + side))
            rail = z_lo >= RAIL[0] - 0.1 and z_hi <= RAIL[1] + 0.1
            C.lane(CB, xa, xb, z_lo, z_hi, lr, along="x", tubes=not rail, name=f"cy_alley_{_alleys}")
            _alleys += 1
            if not rail:
                # A stall just inside its mouth, someone serving, someone eating.
                sx, sz = _x(side, 2.4), z_lo + 1.25
                P.place("cy_stall", sx, B.G0, sz, 0.0, district=CB)
                stand(sx, sz - 0.55, 0.0, "vendor", B.G0)
                for dx in (-0.6, 0.7):
                    P.place("cy_stool", sx + dx, B.G0, sz + 1.5, district=CB)
                    stand(sx + dx, sz + 1.5, math.pi, "sit", B.G0 + 0.5)
                light(CB, sx, 2.2, sz + 1.0, "pink", 5.0)
    units = [U for L in row for U in L["units"]]
    for a, b in zip(units, units[1:]):
        gap = a["zn"] - b["zs"]
        if not 3.0 < gap < 12.0:
            continue
        lr = random.Random(int(abs(a["zn"]) * 3 + side))
        if a["lot"] is b["lot"] or a["lot"]["north"] == "gap":
            # The podium's roof in the slot: plant between the towers.
            xp = sorted((_x(side, 7.5), _x(side, DEPTH - 3.0)))
            C.roof_plant(CB, xp[0], xp[1], b["zs"] + 0.4, a["zn"] - 0.4, max(a["lot"]["ph"], b["lot"]["ph"]), lr, 3.0)
        if lr.random() < 0.65:
            lo = max(a["lot"]["ph"], b["lot"]["ph"], 19.0 if gap > 7.0 else 0.0)
            hi = min(a["h"], b["h"]) - 8.0
            if hi > lo + 4.0:
                y = fl(int((lr.uniform(lo, hi) - SHOP_H) / CELL_H) + 1)
                xl = sorted((_x(side, 3.0), _x(side, 6.5)))
                C.link(xl[0], xl[1], b["zs"], a["zn"], y, lr)

# The east lane, behind the right-hand row: from the plaza street along the
# square's west edge, past the end of the board's block and on between the
# backs to ARASAKA's service gate.
lane_r = random.Random(4801)
B.ground_rect(CB, 44.0, 48.0, -284.0, -190.0)
B.ground_rect(CB, 44.0, 52.0, -458.0, -284.0)
B.ground_rect(CB, 44.0, 48.0, -463.0, -458.0)
C.lane(CB, 44.0, 48.0, -283.0, -263.0, lane_r, tubes=True, name="cy_lane_e0")
C.lane(CB, 44.0, 52.0, -455.0, -285.0, lane_r, tubes=True, name="cy_lane_e1")
# Its end: the tower's service gate in the podium's south wall, a shutter in
# a frame of red light, hazard stripes, a barrier, a guard.
box((CB, "door_panel", 0), 48.4, 51.6, B.G0, 3.6, -458.0, -457.85, scale=1.0)
box((CB, "hazard", 1), 48.2, 51.8, 3.6, 3.9, -458.0, -457.8, scale=1.0)
for gx in (48.25, 51.75):
    box((CB, "neon_red", 0), gx - 0.05, gx + 0.05, 0.3, 3.9, -457.85, -457.75, scale=1.0)
box((CB, "neon_red", 0), 48.2, 51.8, 3.95, 4.05, -457.85, -457.75, scale=1.0)
light(CB, 50.0, 3.5, -456.6, "red", 5.0)
P.place("barrier", 50.0, B.G0, -455.2, district=CB)
P.place("cctv", 47.0, B.G0, -456.8, district=CB)
stand(51.2, -456.4, math.pi, "idle", B.G0)
# The square's west edge, under the canyon's wall: stalls along it, facing
# the square, low enough to leave the wall and its boards in view.
for sz in (-196.5, -217.0, -249.0):
    P.place("cy_stall", 45.4, B.G0, sz, math.pi / 2, district=CB)
    stand(44.85, sz, math.pi / 2, "vendor", B.G0)
    P.place("cy_stool", 46.9, B.G0, sz - 0.6, district=CB)
    stand(46.9, sz - 0.6, -math.pi / 2, "sit", B.G0 + 0.5)
    stand(47.2, sz + 0.7, -math.pi / 2, lane_r.choice(("idle", "phone")), B.G0)
# The braindance's GPU clue sits at (44.4, 22, -240) on this wall: a server
# rack's cooling plant bolted to it, lit warm from inside, clear of
# everything else. A cabinet with louvres, its amber heart showing between
# them, status lamps, a conduit down the wall, a grating under it.
gx0, gx1, gy0, gy1, gz0, gz1 = 44.0, 44.6, 20.9, 23.1, -241.5, -238.5
box((CB, "metal", 0), gx0, gx1, gy0, gy1, gz0, gz1, scale=1.0, bottom=True)
box((CB, "neon_amber", 0), gx1, gx1 + 0.03, gy0 + 0.25, gy1 - 0.25, gz0 + 0.25, gz1 - 0.25, scale=1.0)
for k in range(7):
    ly = gy0 + 0.3 + k * 0.26
    box((CB, "dark", 1), gx1 + 0.03, gx1 + 0.09, ly, ly + 0.14, gz0 + 0.15, gz1 - 0.15, scale=0.5)
for k in range(4):
    lz = gz0 + 0.5 + k * 0.28
    box((CB, "glow", 0), gx1 + 0.09, gx1 + 0.11, gy1 - 0.2, gy1 - 0.12, lz, lz + 0.1, scale=0.5, col=GLOW["green" if k % 2 else "amber"])
box((CB, "metal", 1), gx0, gx0 + 0.9, gy0 - 0.12, gy0 - 0.06, gz0 - 0.3, gz1 + 0.3, scale=0.5, bottom=True)
box((CB, "metal", 1), gx0 + 0.86, gx0 + 0.9, gy0 - 0.06, gy0 + 0.9, gz0 - 0.3, gz1 + 0.3, scale=0.5)
P.place("pipe_v", 44.0, fl(4), gz0 - 0.6, math.pi / 2, sy=gy0 + 0.6 - fl(4), district=CB)
light(CB, 45.6, 4.0, -240.0, "amber", 4.0)

# Skybridges across the avenue, a row of boards on each (ARL_JWwKdDs@21).
# The hero looks under and through them: each sits over the megablock's
# roofline and under the figure's waist in its eye, between the roofs.
bridge_r = random.Random(4822)
for bz, by, enclosed, hang in ((-240.0, fl(9) - 0.6, True, None), (-338.0, fl(13) - 0.6, False, 9.0)):
    for lo, hi in C.skybridge(bz, by, bridge_r, enclosed=enclosed, hang=hang):
        if C.covers(AVENUE_MASSES, lo, hi):
            raise RuntimeError(f"the skybridge at z {bz} stands across something the hero frames: {lo} {hi}")
    if not enclosed:
        for bx_, dz, yaw in ((-6.0, 1.3, math.pi), (3.5, 1.3, math.pi), (4.4, 1.3, math.pi), (-1.0, -1.3, 0.0)):
            stand(bx_, bz + dz, yaw, "lean", by + 0.5)

# Cables slung across the avenue between the towers, at every height.
cable_r = random.Random(4830)
for _ in range(26):
    z = cable_r.uniform(-700.0, -196.0)
    if RAIL[0] - 4.0 < z < RAIL[1] + 4.0 or abs(z + 240.0) < 4.0 or abs(z + 338.0) < 4.0 or FORECOURT[0] < z < FORECOURT[1]:
        continue
    y = cable_r.uniform(8.0, 30.0)
    C.cable(CB, (-WALK, y, z), (WALK, y + cable_r.uniform(-3.0, 3.0), z + cable_r.uniform(-7.0, 7.0)), cable_r.uniform(0.8, 3.0))

# The pavements. The walk runs along the right-hand shops, so that side keeps
# its furniture at the kerb; the left has it against the wall: vending
# machines, benches, a phone booth, food boxes, and the people who use them.
pave_r = random.Random(4840)
z = -200.0
while z > -700.0:
    clear = not (RAIL[0] - 5.0 < z < RAIL[1] + 5.0)
    mouth = any(a - GAP - 2.5 < z < a + 2.5 for a in ALLEYS[-1])
    if clear:
        # Left, by the wall.
        roll = pave_r.random()
        if mouth:
            pass
        elif roll < 0.3:
            P.place(pave_r.choice(("vending", "vending_warm")), -13.55, B.G0, z, math.pi / 2, district=CB)
            if pave_r.random() < 0.6:
                stand(-12.9, z + 1.1, math.pi * pave_r.uniform(0.8, 1.2), pave_r.choice(("phone", "idle", "smoke")), B.G0)
        elif roll < 0.55:
            P.place("bench", -13.6, B.G0, z, math.pi / 2, district=CB)
            stand(-13.6, z - 0.4, math.pi / 2, "sit", B.G0 + 0.48)
            if pave_r.random() < 0.5:
                stand(-13.6, z + 0.5, math.pi / 2, "sit", B.G0 + 0.48)
        elif roll < 0.68:
            P.place("phone_booth", -13.4, B.G0, z, math.pi / 2, district=CB)
        elif roll < 0.8:
            P.place("food_box", -13.6, B.G0, z, math.pi / 2, district=CB)
        else:
            stand(-13.5, z, 0.0, "talk", B.G0)
            stand(-13.5, z + 1.0, math.pi, "talk", B.G0)
        # Both kerbs: bollards in runs, a hydrant, a short lamp, someone at
        # the kerb's edge.
        for s in (-1, 1):
            roll = pave_r.random()
            zz = z + pave_r.uniform(-3.0, 3.0)
            if roll < 0.35:
                for k in range(3):
                    P.place("bollard", s * 10.55, B.G0, zz + k * 1.6, district=CB)
            elif roll < 0.5:
                P.place("hydrant", s * 10.6, B.G0, zz, district=CB)
            elif roll < 0.7:
                P.place("lamp_short", s * 10.6, B.G0, zz, district=CB)
            elif roll < 0.85:
                stand(s * 10.5, zz, -s * math.pi / 2, pave_r.choice(("squat", "smoke", "phone")), B.G0)
    z -= pave_r.uniform(7.0, 11.0)
# Manholes up the canyon breathing steam into the signs' light.
for i, (sx, sz) in enumerate(((-5.5, -262.0), (4.0, -386.0), (-3.0, -540.0))):
    cylinder((CB, "metal", 1), sx, sz, 0.0, 0.025, 0.42, segs=14)
    empty(f"anchor_steam_street_cy{i}", (sx, 0.05, sz))

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

# Its forecourt on the canyon, its lobby and terrace, the annex and landing
# pad east of it and the blocks north of it (the canyon's pack).
from ncw.districts import canyon_court  # noqa: E402
canyon_court.build(ax, az, OCC, FORECOURT[0], FORECOURT[1])
B.ground_rect(CB, 52.0, ax + 32.0, az + 32.0, -456.0)
