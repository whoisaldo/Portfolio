from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw import buildings as B
from ncw import props as P
from ncw.districts import canyon_kit as C
from ncw.districts import canyon_mass as M
from ncw.districts import canyon_cross
from ncw.districts import canyon_lane as LW
from ncw.districts import canyon_sky as SK
from ncw.districts import canyon_relief as REL
from ncw.districts import canyon_deck as DECK
from ncw import kit as K
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
# What crosses the avenue (canyon_cross.megastructure): three, stepping up
# it so its north vista closes in layers (x4ztgjvfU60@22). The hero looks
# straight at the first, and what it frames there fixes it: its foot can
# come no lower than y 33.6 at z -243.5 (lower, and it stands across the
# megablock's roofline, which on a phone it already meets) and its top can
# stand no higher than y 46.25 at z -236 (higher, and it stands across the
# figure's waist), so its front is four storeys deep and not six; its east
# pier stands only 0.75 m off the wall (further, and it stands across the
# figure's slogan); nothing hangs under its west third (the megablock's
# tallest section is behind it there), nothing more than two metres under
# its middle, and the column of boards under its east end keeps left of the
# slogan's line. Behind its front it runs on north to z -256 as a body with
# screens hung under it. The second and third stand where the first's front
# hides all of them from that lens (checked), the second over the slogan's
# blade, the third north of the camera that looks up at the figure and low
# enough that it hides her no higher than her waist (y 108) from there.
MEGA = (dict(zn=-243.5, zs=-234.5, y0=fl(9) - 1.6, y1=46.0, step=1.5, south=FA, feet=(5.0, 5.0), tray=(-5.0, 13.0), hang=(7.3, 2), plant=0.4,
             drops=((-3.2, 1.9, "signal"), (3.2, 1.9, "signal"), (0.0, 1.1, "white")),
             body=(-256.0, fl(9) - 1.6 + 6.2, 46.0), hung=((-7.6, 5.6, 3.2), (0.4, 6.4, 3.2), (8.0, 5.0, 3.2))),
        dict(zn=-277.0, zs=-262.5, y0=40.0, y1=50.4, step=1.5, south=CB, feet=(36.0, 37.5), tray=(-13.0, 13.0), plant=0.4,
             looks=((6, 0.6, 0.2), (2, 0.5, 0.8)), extra=((4.6, 6.4, 3.6), (24.0, 5.6, 3.6))),
        dict(zn=-410.0, zs=-398.0, y0=57.8, y1=64.6, step=1.2, south=CB, feet=(53.0, 53.0), tray=(-13.0, 13.0), plant=0.4,
             looks=((2, 0.5, 0.25), (6, 0.55, 0.8)), ends=(0.0, 62.0), extra=((14.0, 7.2, 2.6),)))
PYLON_Z = -230.5        # the stack of adverts on a mast beside the first, on the left
# What crosses the avenue, for whatever is hung on its walls to keep clear
# of: z, half its depth, its piers' foot and its top.
# (A crossing whose foot is over M.HIGH lands high on the walls, where the
# first's front hides them from the hero: what stands under it on the walls
# stays.)
CROSS = tuple(((m["zn"] + m["zs"]) / 2, (m["zs"] - m["zn"]) / 2 + 1.0, min(m["feet"]), m["y1"]) for m in MEGA) + tuple(
    ((m["body"][0] + m["zn"]) / 2, (m["zn"] - m["body"][0]) / 2 + 1.0, m["body"][1], m["body"][2]) for m in MEGA if m.get("body"))
# What stands between the hero's lens and the canyon: the avenue's lots.
AVENUE_MASSES = list(HERO_MASSES)
HUES = ("cyan", "yellow", "amber", "pink", "teal")
HOUSE = {5: 2}          # the window a tower's backs and top take for its street face's


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
            # (Near-black navy and teal: the plum wall is drawn and left out,
            # and every other teal one is navy, so the bodies are blue-black
            # and the windows and signs carry the light.)
            wall = r.choices(("navy", "teal", "charcoal", "plum"), weights=(3, 3, 2, 1))[0]
            tint = B.TINTS["navy" if wall == "plum" or (wall == "teal" and (i + k) % 2 == 0) else wall]
            L["units"].append(dict(lot=L, k=k, zs=us, zn=un, south=es, north=en, h=L["h"], back=kinds[min(k, len(kinds) - 1)],
                                   style=style, tint=tint, lit=r.uniform(0.4, 0.8), warmth=r.uniform(0.15, 0.95), ov=r.randrange(0, 40),
                                   ki=r.choice((0.0, 2.0, 3.0))))
    return lots


ROWS = {side: _layout(side) for side in (-1, 1)}
# Each building's own window module (cells to a bay, ribbons to a storey or
# its style's own): along a row and across the avenue no two neighbours
# share one (the facades across the avenue read as one module repeated).
MODS = ((2, None), (1, 1), (3, None), (2, 3), (1, None), (3, 1))
# And its own colours of neon along its floors and round its signs.
NEONS = ("cyan", "amber", "pink", "teal", "yellow", "blue", "magenta", "green")
for _side, _lots in ROWS.items():
    for _n, _U in enumerate(U for L in _lots for U in L["units"]):
        _U["idx"] = _n
        _U["mod"] = MODS[(_n + (3 if _side > 0 else 0)) % len(MODS)]
        _h = (_n * 3 + (5 if _side > 0 else 0)) % len(NEONS)
        _U["hues"] = (NEONS[_h], NEONS[(_h + 3) % len(NEONS)], NEONS[(_h + 5) % len(NEONS)])
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


VOID = "cy_void"


def _dice(build, f, r):
    """Run one of round 2's builders for its dice alone, into a district
    that is thrown away: the lot's stream of draws runs on exactly as it
    did (its terraces' heights and its crowns come later in it)."""
    n_inst, n_ids, n_people, counts = len(P.INSTANCES), len(STREET_SIGN_IDS), len(PEOPLE), dict(ST_COUNT)
    build(f, r, key=VOID)
    del P.INSTANCES[n_inst:], STREET_SIGN_IDS[n_ids:], PEOPLE[n_people:]
    ST_COUNT.clear()
    ST_COUNT.update(counts)
    LIGHTS.pop(VOID, None)
    for key in [k for k in batches if k[0] == VOID]:
        del batches[key]


def _ghost(build):
    """Run a builder for its dice and its signs' turns alone, into a district
    that is thrown away: the lot's draws, and the builder's turn that every
    sign built after it takes (its design's start), run on as they did."""
    n_inst, n_ids, n_people = len(P.INSTANCES), len(STREET_SIGN_IDS), len(PEOPLE)
    build()
    del P.INSTANCES[n_inst:], STREET_SIGN_IDS[n_ids:], PEOPLE[n_people:]
    LIGHTS.pop(VOID, None)
    for key in [k for k in batches if k[0] == VOID]:
        del batches[key]


END_Z = -470.0          # past the forecourt the canyon's walls take the show's mix of signs


def _lane_r(L, f):
    return random.Random(7100 + L["i"] * 19 + (0 if L["side"] > 0 else 400) + int(abs(f.plane) * 3 + abs(f.a0)))


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
    # (Its windows are its own lot's: see canyon_mass.base_col.)
    variant, col = M.base_col(L, col, tint)
    canopy = False
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
        cr = random.Random(5500 + L["i"] * 3 + (0 if side > 0 else 40) + int(-zn))
        for b in range(bays + 1):
            s = min(max(b * w / bays, 0.3), w - 0.3)
            st.box((CB, "trim", 0), s - 0.3, s + 0.3, 0.0, SHOP_H - 0.5, -0.6, 0.0, col=tcol)
            # What a column collects: a dark plinth, a conduit up to a
            # junction box with its pilot lamp, a lamp at head height with
            # its pool on the pavement, and on every other a small sign.
            st.box((CB, "trim", 0), s - 0.36, s + 0.36, 0.0, 0.45, -0.66, 0.06, col=B.DARK_TRIM)
            st.box((CB, "metal", 1), s + 0.17, s + 0.22, 0.45, SHOP_H - 0.5, 0.0, 0.05)
            st.box((CB, "metal", 1), s + 0.08, s + 0.28, 1.3, 1.62, 0.0, 0.1)
            st.box((CB, "glow", 0), s + 0.2, s + 0.24, 1.52, 1.56, 0.1, 0.105, col=GLOW[cr.choice(("green", "red", "amber"))])
            hue = cr.choice(("amber", "white", "cyan", "yellow"))
            st.box((CB, "glow", 0), s - 0.22, s + 0.02, 3.3, 3.42, 0.0, 0.16, col=GLOW[hue])
            light(CB, *st.p(st.at(s), 3.0, 0.9), hue, 3.5)
            if b % 2 == 1:
                C.blade(st, s, 3.08, "bs", cr.choice((0.0, 0.25, -0.25)), out=0.5)
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
                C.stall_steam(bx_, z, out)
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
        canopy = r.random() < 0.35
        if canopy:
            B.canopy(CB, st, 1.0, w - 1.0, 2.6, SHOP_H - 0.5, tint, r.choice(("white", "cyan", "amber")))
    C.wall(FA, st, SHOP_H, ph, col, ov)
    # The base's cornice and what stands at the pavement, clear of the lot's
    # column of type, the mast of adverts and the megastructure's piers.
    notch = []
    if L["i"] % 3 != 2:
        zt = L["units"][0]["zs"] - 3.0
        notch.append((zt - 1.0, zt + 0.8))
    if side < 0:
        notch.append((PYLON_Z - 1.0, PYLON_Z + 1.0))
    notch += [(zc - half - 0.4, zc + half + 0.4) for zc, half, foot, _ in CROSS if foot <= M.HIGH]
    notch = [tuple(sorted((C.s_of(st, min(max(a, zn), zs)), C.s_of(st, min(max(b, zn), zs))))) for a, b in notch if b > zn and a < zs]
    M.base(L, st, variant, canopy, notch, L["arcade"])
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
        _dice(C.service_wall, bk, r)
        LW.wall(bk, _lane_r(L, bk), upper=ph)
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
            _dice(C.service_wall, f, r)
            LW.wall(f, _lane_r(L, f), ends=2.8, upper=ph)
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
    # (Its backs, its top and its crown in its own window, at its own
    # scale: a band building's in the office ribbon, which is the band's
    # cell lit room by room, not a barcode of whole floors.)
    U["house"] = HOUSE.get(U["style"], U["style"])
    back_col = B.wall_col(min(0.8, U["lit"] * 1.15), U["house"], U["warmth"], tint)
    U["side_col"] = B.wall_col(U["lit"], U["house"], U["warmth"], tint)
    st, bk, so, no, xa, xb = _faces(side, 0.0, sd, U["zn"], U["zs"])
    B.COLLISION.append(("box", xa, xb, ph, h, U["zn"], U["zs"], "canyon"))
    U.update(sd=sd, col=col, back_col=back_col, st=st, bk=bk, so=so, no=no, x=(xa, xb))
    # Its street face in zones of floors, with what stands proud of it.
    M.plan(U, U["idx"], OCC, CROSS)
    M.face(U)
    C.wall(CB, bk, ph, h, back_col, U["ov"], mod=U["mod"])
    C.roof(CB, xa, xb, U["zn"], U["zs"], h)
    B.ROOFS.append((CB, xa, xb, U["zn"], U["zs"], h))
    # The parapet the hero's roofline ends in, as it always has.
    C.parapet(FA, st, h, tcol)
    C.parapet(FA, so, h, tcol)
    C.parapet(CB, no, h, tcol)
    C.parapet(CB, bk, h, tcol)


LOOK_W = 3.6            # a lookout's deck, where it meets its terrace
LOOKOUTS = set()        # (side, the slot's z) of every slot a lookout fills


def _lookout(U, top, plaza):
    """A terrace is behind its slab and sees nothing of the canyon, so where
    a slot of sky stands beside the slab a deck runs out through it at the
    terrace's level, wall to wall, to a rail over the avenue: as far out as
    the hero's lens does not see it. Returns (u0, z0, z1, +1 south or -1
    north of the slab) or None."""
    L = U["lot"]
    side, sd, n = L["side"], U["sd"], len(L["units"])
    r = random.Random(5100 + L["i"] * 7 + U["k"] + (0 if side > 0 else 90))
    U["rail"] = r.choice(("cyan", "amber", "yellow", "teal", "white"))
    # (The slot is cut from the lower lot of the two, so it may be the
    # neighbour's: either way it stands against this slab's side wall.)
    if (U["k"] == 0 and L["south"] in ("gap", "alley")) or U["south"] == "notch":
        z0, z1, sg = U["zs"], U["zs"] + GAP, 1
    elif (U["k"] == n - 1 and L["north"] in ("gap", "alley")) or U["north"] == "notch":
        z0, z1, sg = U["zn"] - GAP, U["zn"], -1
    else:
        return None
    if (side, round((z0 + z1) / 2)) in LOOKOUTS:
        return None
    for u0 in (1.0, 2.0, 3.0):
        xa, xb = sorted((_x(side, u0), _x(side, sd)))
        lo, hi = (xa, top - 0.9, z0), (xb, top + 2.2, z1)
        if C.hidden(OCC, lo, hi) and not (plaza and C.seen(C.PLAZA_EYES, C.PLAZA_OCC + OCC, lo, hi)):
            break
    else:
        return None
    hue, ki = U["rail"], U["ki"]
    # Past the lot line a balcony over the avenue, as far out as the hero's
    # picture allows: from its rail the canyon is seen up and down.
    out = M._most(OCC, B.Face("-x" if side > 0 else "+x", _x(side, 0.0), z0, z1), 0.0, GAP, top - 0.9, top + 1.3, 2.6)
    if out >= 1.0 and not any(abs((z0 + z1) / 2 - zc) < half + 4.0 for zc, half, _, _ in CROSS) and M.clear(OCC, (min(_x(side, 0.0), _x(side, u0)), top - 0.9, z0), (max(_x(side, 0.0), _x(side, u0)), top + 1.3, z1)):
        u0 = -out
    xa, xb = sorted((_x(side, u0), _x(side, sd + LOOK_W)))
    box((CB, "trim", 0), xa, xb, top - 0.35, top, z0, z1, scale=2.0, col=B.DARK_TRIM, bottom=True)
    B.ground_rect(CB, xa, xb, z0 + 0.1, z1 - 0.1, y=top + 0.03)
    for u in (u0 + 0.6, sd - 0.6):
        bx = _x(side, u)
        box((CB, "board_frame", 0), bx - 0.15, bx + 0.15, top - 0.85, top - 0.35, z0, z1, scale=1.0, bottom=True)
    # Across the strip of podium roof between the slot and the terrace's edge.
    la, lb = (z0 - ki, z0) if sg > 0 else (z1, z1 + ki)
    xc = sorted((_x(side, sd), _x(side, sd + LOOK_W)))
    if ki > 0:
        box((CB, "trim", 0), xc[0], xc[1], top - 0.35, top, la, lb, scale=2.0, col=B.DARK_TRIM, bottom=True)
        B.ground_rect(CB, xc[0], xc[1], la, lb, y=top + 0.03)
        C.rail(CB, B.Face("+x" if side > 0 else "-x", _x(side, sd + LOOK_W), la, lb), top, hue)
    # Its rails: over the avenue, along the slot's far wall, across its end.
    street = B.Face("-x" if side > 0 else "+x", _x(side, u0), z0, z1)
    C.rail(CB, street, top, hue)
    street.quad((CB, "neon_" + hue, 0), 0.15, GAP - 0.15, top - 0.27, top - 0.15, 0.02)
    C.rail(CB, B.Face("+z", z1, xa, xb) if sg > 0 else B.Face("-z", z0, xa, xb), top, None)
    C.rail(CB, B.Face("+x" if side > 0 else "-x", _x(side, sd + LOOK_W), z0, z1), top, hue)
    # The slot's two walls beside it, close enough to touch: a dark dado, a
    # conduit, wall lamps with their pools, a small board.
    wx = sorted((_x(side, max(u0, 0.0)), _x(side, sd)))
    if u0 < 0:
        # The balcony's own sides, and a viewer on a post at its rail.
        for zz, name in ((z0, "-z"), (z1, "+z")):
            C.rail(CB, B.Face(name, zz, *sorted((_x(side, u0), _x(side, 0.0)))), top, hue)
        vx = _x(side, u0 + 0.5)
        # (In the deck's corner, a stride from whoever leans on the rail:
        # at her elbow its head read as a slab in her hand.)
        cylinder((CB, "metal", 1), vx, (z0 + z1) / 2 + 2.05, top, top + 1.15, 0.06, segs=5)
        box((CB, "metal", 1), vx - 0.2, vx + 0.2, top + 1.15, top + 1.45, (z0 + z1) / 2 + 1.87, (z0 + z1) / 2 + 2.23, scale=0.5, bottom=True)
    rl = random.Random(9760 + L["i"] * 5 + U["k"] + (0 if side > 0 else 60))
    for f in (B.Face("-z", z1, *wx), B.Face("+z", z0, *wx)):
        # (A dado to the rail's height with a line of light along its
        # head, and over it the towers' own windows at arm's length, a
        # lamp on the wall every few metres: a dado to over head height
        # was a black wall each side of the deck.)
        f.quad((CB, "trim", 0), 0.0, f.width, top, top + 1.0, 0.03, col=B.TRIM[U["tint"]])
        f.box((CB, "metal", 1), 0.0, f.width, top + 1.0, top + 1.07, 0.0, 0.08)
        f.box((CB, "neon_" + hue, 0), 0.3, f.width - 0.3, top + 1.1, top + 1.16, 0.03, 0.09)
        ls = 1.6
        while ls < f.width - 1.0:
            f.box((CB, "metal", 1), ls - 0.2, ls + 0.2, top + 2.5, top + 2.56, 0.0, 0.3)
            f.box((CB, "glow", 0), ls - 0.14, ls + 0.14, top + 2.36, top + 2.5, 0.05, 0.26, col=GLOW["amber"])
            ls += 3.4
        # One advert and a small board on each wall, by the terrace's end:
        # the end over the avenue is left open to the view.
        s_, k_, used = 0.5, 0, []
        while s_ + 2.2 < f.width:
            pw = min(r.uniform(2.6, 3.8), f.width - s_ - 0.4)
            inner = abs(f.at(s_ + pw / 2)) > WALK + sd * 0.55
            if k_ == 1:
                if inner:
                    C.board(f, s_ + 0.9, top + 1.7, "bx", r)
                    used.append((s_ + 0.2, s_ + 1.6))
                pw = 1.8
            elif inner:
                cx, cy, cz = f.p(f.at(s_ + pw / 2), top + 1.65, 0.12)
                B.billboard(CB, cx, cy, cz, pw - 0.4, 2.0, f.yaw, r, frame=True, back=False, depth=0.1)
                used.append((s_, s_ + pw))
            s_ += pw + 0.25
            k_ += 1
        _deck_wall(f, top, rl, used)
    # Over the dado and the lamps, the walls are the towers' own sides:
    # air conditioners in runs, a balcony here and there, a conduit (as
    # high as the hero's lens does not see them; their own dice).
    rr = random.Random(9700 + L["i"] * 5 + U["k"] + (0 if side > 0 else 60))
    ix = sorted((_x(side, max(u0, 0.0) + 2.5), _x(side, sd - 0.5)))
    for f in (B.Face("-z", z1, *ix), B.Face("+z", z0, *ix)):
        y1 = top + 20.0
        while y1 > top + 6.0:
            zz = f.plane
            lo, hi = (ix[0], top + 2.7, min(zz, zz + f.nz * 1.4)), (ix[1], y1, max(zz, zz + f.nz * 1.4))
            if C.hidden(OCC, lo, hi):
                break
            y1 -= 3.4
        else:
            print("CANYON lookout walls seen", side, L["i"], U["k"], f.name)
            continue
        print("CANYON lookout walls", side, L["i"], U["k"], f.name, "to", round(y1, 1), REL.side(f, top + 2.7, y1, rr))
    # On it: lights strung down its length, a table, people at the rail.
    zm = (z0 + z1) / 2
    P.place("cy_string", (xa + xb) / 2, top + 3.0, zm, 0.0, sxz=(xb - xa) / 6.0, district=CB)
    for u in (u0 + 2.0, (u0 + sd) / 2 + 1.0, sd + 1.5):
        light(CB, _x(side, u), top + 2.0, zm, "amber", 8.0)
    tx = _x(side, (u0 + sd) / 2 + 1.5)
    P.place("cy_table", tx, top + 0.03, zm - 0.9, 0.0, district=CB)
    for i in (0, 2):
        a = i * math.tau / 3 + 0.5
        stand(tx + 0.85 * math.cos(a), zm - 0.9 + 0.85 * math.sin(a), math.atan2(-math.cos(a), -math.sin(a)), "sit", top + 0.53)
    stand(_x(side, u0 + 0.55), zm - 1.2, side * math.pi / 2, "lean", top + 0.03)
    DECK.lookout(side, u0, sd, z0, z1, top, _x, random.Random(9850 + L["i"] * 3 + U["k"] + (0 if side > 0 else 40)), (u0 + sd) / 2 + 1.5)
    # (At a balcony's rail over the avenue she leans on it and looks out.)
    pose = r.choice(("phone", "smoke", "idle"))
    stand(_x(side, u0 + 0.6), zm + (1.4 if u0 < 0 else 0.9), -side * math.pi / 2, "rail" if u0 < 0 else pose, top + 0.03)
    LOOKOUTS.add((side, round(zm)))
    print("CANYON lookout", side, L["i"], U["k"], "x", round(xa, 1), round(xb, 1), "z", z0, z1, "y", top)
    return (u0, z0, z1, sg)


def _deck_wall(f, top, r, used):
    """A lookout's side wall at arm's length over its dado, where the
    tower's glass read as a flat wall: cladding in panels with their
    joints, a door into the tower with its sign and lamp, a run of pipe
    and a conduit, a vent's grille, a unit on a bracket, a lit menu by the
    door. Only where the hero's lens does not see it."""
    w = f.width
    if w < 4.0:
        return
    ok = lambda s0, s1, y0, y1, d: C.hidden(OCC, *REL._rect(f, s0, s1, y0, y1, d))
    # (A wainscot to just over head height: over it the tower's own lit
    # windows, a wall of cladding to the eye's top was a black wall.)
    clad = [s_ for s_ in [k * 1.2 for k in range(int(w / 1.2))] if ok(s_, s_ + 1.2, top + 1.16, top + 3.6, 0.1)]
    # (Cast concrete in bays, one in three darker, stained where the rain
    # runs down from the pipes and rust from their brackets, a conduit along
    # it with its boxes: pale panels lit by themselves read as the brightest
    # and emptiest wall in the district. Its own dice, so the rest of the
    # wall is dealt as it was.)
    rs = random.Random(int(abs(f.at(0.0)) * 31 + top * 7 + w * 3))
    for k, s_ in enumerate(clad):
        dark = (k + int(s_ / 3.6)) % 3 == 0
        f.quad((CB, "castconcrete", 0), s_, s_ + 1.2, top + 1.16, top + 2.45, 0.025,
               col=(0.48, 0.48, 0.52, 1) if dark else (0.8, 0.78, 0.76, 1))
        f.quad((CB, "trim", 1), s_ + 1.17, s_ + 1.2, top + 1.16, top + 2.45, 0.03, col=B.DARK_TRIM)
        for _ in range(rs.choice((0, 1, 1, 2))):
            a_ = rs.uniform(s_ + 0.05, s_ + 0.95)
            sw_ = rs.uniform(0.08, 0.3)
            ya_ = rs.uniform(top + 1.2, top + 1.9)
            col_ = rs.choice(((0.03, 0.03, 0.035, 1), (0.04, 0.038, 0.04, 1), (0.13, 0.06, 0.03, 1)))
            f.quad((CB, "trim", 1), a_, min(a_ + sw_, s_ + 1.15), ya_, top + 2.45, 0.028, col=col_)
    if clad:
        ca_, cb_ = min(clad) + 0.1, max(clad) + 1.1
        f.box((CB, "metal", 1), ca_, cb_, top + 2.3, top + 2.36, 0.03, 0.09)
        cs_ = ca_ + rs.uniform(0.3, 1.5)
        while cs_ < cb_ - 0.3:
            f.box((CB, "trim", 1), cs_ - 0.12, cs_ + 0.12, top + 2.2, top + 2.44, 0.03, 0.13, col=(0.11, 0.115, 0.12, 1))
            cs_ += rs.uniform(2.5, 4.5)
    f.box((CB, "trim", 1), min(clad, default=0.0), max(clad, default=0.0) + 1.2, top + 2.45, top + 2.52, 0.0, 0.06, col=B.DARK_TRIM)
    if not clad:
        return
    lo_, hi_ = min(clad), max(clad) + 1.2
    free = lambda a, b: all(b < u0 - 0.15 or a > u1 + 0.15 for u0, u1 in used)
    ds = next((s_ for s_ in [lo_ + 0.4 + k * 0.5 for k in range(40)] if s_ + 2.1 < hi_ and free(s_, s_ + 2.1)), None)
    if ds is not None:
        f.quad((CB, "door", 0), ds, ds + 1.0, top, top + 2.2, 0.035)
        f.box((CB, "trim", 0), ds - 0.08, ds + 1.08, top + 2.2, top + 2.3, 0.0, 0.12, col=B.DARK_TRIM)
        f.box((CB, "glow", 0), ds + 0.3, ds + 0.7, top + 2.36, top + 2.52, 0.03, 0.08, col=C.dim("green", 0.8))
        ms = ds + 1.35
        f.box((CB, "board_frame", 0), ms - 0.04, ms + 0.64, top + 1.15, top + 2.05, 0.0, 0.08)
        f.quad((CB, "glow", 0), ms, ms + 0.6, top + 1.2, top + 2.0, 0.085, col=C.dim(r.choice(("amber", "white", "cyan")), 0.55))
        for k in range(4):
            f.quad((CB, "trim", 1), ms + 0.06, ms + 0.4 + 0.1 * (k % 2), top + 1.82 - k * 0.16, top + 1.86 - k * 0.16, 0.09, col=(0.05, 0.04, 0.03, 1))
    y = top + r.uniform(3.0, 3.3)
    f.box((CB, "metal", 1), lo_, hi_, y, y + 0.12, 0.05, 0.17)
    f.box((CB, "metal", 1), lo_, hi_, y + 0.2, y + 0.28, 0.06, 0.14)
    cs = r.uniform(lo_ + 0.6, hi_ - 0.6)
    f.box((CB, "metal", 1), cs - 0.05, cs + 0.05, top + 1.16, y + 0.28, 0.02, 0.1)
    f.box((CB, "trim", 1), cs - 0.15, cs + 0.15, top + 1.5, top + 1.85, 0.02, 0.16, col=(0.2, 0.2, 0.22, 1))
    ds = -99.0 if ds is None else ds
    vs = r.uniform(lo_ + 0.4, hi_ - 1.0)
    if free(vs, vs + 0.6) and not ds - 0.7 < vs < ds + 2.2 and abs(vs - cs) > 0.8:
        f.box((CB, "trim", 0), vs, vs + 0.6, top + 2.55, top + 2.95, 0.0, 0.05, col=(0.04, 0.045, 0.05, 1))
        for k in range(4):
            f.quad((CB, "trim", 1), vs + 0.05, vs + 0.55, top + 2.6 + k * 0.09, top + 2.63 + k * 0.09, 0.055, col=(0.12, 0.12, 0.13, 1))
    us = r.uniform(lo_ + 0.6, hi_ - 0.6)
    if free(us - 0.5, us + 0.5) and not ds - 0.6 < us < ds + 2.6 and abs(us - vs) > 1.0 and abs(us - cs) > 0.7:
        x_, _, z_ = f.p(f.at(us), 0.0, 0.0)
        P.place("ac_wall", x_, top + 2.5, z_, f.yaw, district=CB)
        used.append((us - 0.5, us + 0.5))
    used += [(ds, ds + 2.1), (cs - 0.2, cs + 0.2)]
    # Bills pasted at eye height, each in a cell of its own as the site
    # deals adverts, and a neon on the cladding over them.
    cells = set()
    ps = lo_ + r.uniform(0.2, 0.8)
    while ps + 0.7 < hi_:
        pw, ph_ = r.uniform(0.55, 0.8), r.uniform(0.75, 1.0)
        py = top + r.uniform(1.75, 2.0)
        if free(ps, ps + pw) and not (ds - 0.2 < ps + pw and ps < ds + 2.3):
            cx, cy, cz = f.p(f.at(ps + pw / 2), py, 0.035)
            k_ = C._board_no(f, cx, cy, cz, pw, ph_) % 8
            if k_ not in cells:
                cells.add(k_)
                rotated_quad((CB, "billboard", 0), cx, cy, cz, pw, ph_, f.yaw,
                             col=(r.randrange(8) / 8.0 + 0.01, r.randrange(8) / 8.0 + 0.01, r.random(), 1.0))
        ps += pw + r.uniform(0.3, 1.4)
    ns = r.uniform(lo_ + 0.6, hi_ - 1.6)
    m = "neon_" + r.choice(("pink", "cyan", "amber", "teal", "red"))
    for x0, x1, y0, y1 in ((0.0, 1.0, 0.0, 0.05), (0.0, 1.0, 0.3, 0.35), (0.0, 0.05, 0.0, 0.35), (0.95, 1.0, 0.0, 0.35), (0.2, 0.75, 0.15, 0.2)):
        f.box((CB, m, 0), ns + x0, ns + x1, top + 2.62 + y0, top + 2.62 + y1, 0.03, 0.07)


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
    look = _lookout(U, top, plaza) if U["back"] == "low" else None
    # (What rises over the slab is a tower's top, seen from the air and from
    # Japantown: a dark floor where it leaves the slab, then floors of amber
    # and cyan bands.)
    over = top > h + 6.0
    # (Each its own windows, so two neighbours' tops are never one stripe.)
    top_col = B.wall_col(min(0.7, U["lit"] + 0.05), U["house"], U["warmth"], U["tint"])
    for f in (bk, so, no):
        C.wall(CB, f, ph, h if over else top, U["back_col"] if f is bk else U["side_col"], U["ov"], mod=U["mod"])
        if over:
            f.quad((CB, "trim", 0), 0.0, f.width, h, h + CELL_H, 0.0, col=M.SVC)
            C.wall(CB, f, h + CELL_H, top, top_col, U["ov"], mod=U["mod"])
        if U["back"] != "low":
            C.parapet(CB, f, top, tcol)
        elif look and f is (so if look[3] > 0 else no):
            # The rail opens where the lookout's deck meets the terrace.
            a, b = sorted((C.s_of(f, _x(side, sd)), C.s_of(f, _x(side, sd + LOOK_W))))
            C.rail(CB, f, top, U["rail"], 0.0, a)
            C.rail(CB, f, top, U["rail"], b, f.width)
        else:
            C.rail(CB, f, top, U["rail"])
    if top > h + 0.5:
        C.wall(CB, st, h, top, top_col if over else U["side_col"], U["ov"], mod=U["mod"])
        C.parapet(CB, st, top, tcol)
    C.roof(CB, xa, xb, zn, zs, top)
    B.ROOFS.append((CB, xa, xb, zn, zs, top))
    OCC.append(((xa, 0.0, zn), (xb, top, zs)))
    U.update(top=top, bx=(xa, xb), bz=(zn, zs), bbk=bk)
    # Its sides over the slots: lines of neon along floor edges, where the
    # hero's lens does not see them (its own dice). Its back is
    # _dress_back's.
    rl = random.Random(9950 + U["idx"] * 19)
    for f in (so, no):
        REL.lines(f, ph + CELL_H * 2, (h if over else top) - 0.5, rl, lambda lo, hi: C.hidden(OCC, lo, hi, plaza=plaza), U["hues"])
    if over:
        # (Its own dice: ledges, balconies, units, a strip of light or a
        # board on what rises over the slab, where the hero cannot see.)
        ok = lambda lo, hi: C.hidden(OCC, lo, hi, plaza=plaza)
        got = [REL.tops(f, h + CELL_H if f is not st else h + 0.5, top, random.Random(9900 + U["idx"] * 17 + i), ok, tcol, hues=U["hues"])
               for i, f in enumerate((bk, so, no, st))]
        print("CANYON tops", side, L["i"], U["k"], "faces bk so no st", got)
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
        C.wall(CB, f, top, ctop, B.wall_col(min(0.75, U["lit"] + 0.15), U["house"], U["warmth"], U["tint"]), U["ov"], mod=U["mod"])
        C.strip(CB, f, 0.0, f.width, ctop - 1.3, ctop - 0.9, hue, out=0.08)
        # Bracing across it, bay by bay (ARL_JWwKdDs@22).
        nb = max(1, round(f.width / 9.0))
        for b in range(nb):
            C.brace(CB, f, f.width * b / nb + 0.3, f.width * (b + 1) / nb - 0.3, top + 0.3, ctop - 1.6, tcol)
            f.box((CB, "trim", 1), f.width * b / nb - 0.15, f.width * b / nb + 0.15, top, ctop, 0.0, 0.2, col=tcol)
    C.roof(CB, cx0, cx1, cz0, cz1, ctop)
    B.ROOFS.append((CB, cx0, cx1, cz0, cz1, ctop))
    OCC.append(((cx0, 0.0, cz0), (cx1, ctop, cz1)))
    U.update(crown=(cx0, cx1, cz0, cz1, ctop))
    print("CANYON crown", side, L["i"], U["k"], round(cx0, 1), round(cx1, 1), round(cz0, 1), round(cz1, 1), "slab", h, "mass", top, "crown", round(ctop, 1))
    mx, mz = (cx0 + cx1) / 2, (cz0 + cz1) / 2
    mtop = C.hidden_top(OCC, mx - 0.5, mx + 0.5, mz - 0.5, mz + 0.5, ctop, ctop + 16.5, plaza=plaza, pad=0.3, least=6.0)
    if mtop:
        P.place("cy_mast", mx, ctop, mz, r.uniform(0, 1.5), sy=(mtop - ctop) / 16.3, district=CB)
    # (Its own dice, so the lot's run on as they did.)
    SK.crown_step(U, side, OCC, plaza, random.Random(9300 + U["idx"] * 11))


def _dress_street(U):
    """The street face of a tower over its podium: ledges every few floors,
    fins on some, a line of light under the roof on some, a seam of light up
    the corner that faces the hero, and its signs."""
    L = U["lot"]
    side, ph, h, st = L["side"], L["ph"], U["h"], U["st"]
    # (Its own dice, so the hero's signs stay put whatever else is built.)
    r = random.Random(4900 + L["i"] * 31 + U["k"] * 7 + (0 if side > 0 else 1000))
    tcol = B.TRIM[U["tint"]]
    w = st.width
    every = r.choice((3, 4, 5))
    y = ph + CELL_H * every
    while y < h - 3.0:
        if M.plain(U, y - 0.1):
            st.ledge((CB, "trim", 1), 0.0, w, y - 0.22, 0.22, 0.2, tcol)
        y += CELL_H * every
    # (A second set of dice for what was added later, so the first set's
    # signs stay where the hero has them.)
    r2 = random.Random(5300 + L["i"] * 17 + U["k"] * 5 + (0 if side > 0 else 700))
    spandrels = r2.random() < 0.5
    if spandrels:
        # A spandrel's lip at every floor: the face reads in storeys.
        y = ph + CELL_H
        while y < h - 1.0:
            if M.plain(U, y - 0.06):
                st.ledge((CB, "trim", 1), 0.0, w, y - 0.12, 0.12, 0.1, tcol, caps=False)
            y += CELL_H
    if r.random() < 0.4:
        bays = max(1, round(w / CELL_W))
        for b in range(0, bays + 1, 2):
            s = min(max(b * w / bays, 0.2), w - 0.2)
            st.box((CB, "trim", 1), s - 0.16, s + 0.16, ph, U["belt"] - 0.3, 0.0, 0.32, col=tcol)
    if r.random() < 0.4:
        C.strip(FA, st, 0.3, w - 0.3, h - 1.6, h - 1.15, r.choice(HUES))
    if U["north"] != "abut" and r.random() < 0.6:
        # A seam of light up the north face, by the street corner (the south
        # face is the hero's, and stays dark against its band of sky).
        no = B.Face("-z", U["zn"], *U["x"])
        s = no.width - 0.5 if side > 0 else 0.5
        C.seam(CB, no, s, ph + 1.0, h - 2.0, r.choice(("cyan", "teal", "amber", "purple")))
    # Signs: the dense belt over the shops, on the podium, and a looser one
    # up the slab's first floors; high on the slab a big blade or two, and
    # on some a screen canted toward the traffic coming up the avenue. None
    # across another, nor across the lot's column of type, the figure's
    # slogan or a skybridge's landing.
    taken = M.reserve(U, OCC, CROSS)
    keep = [(bz, half + 0.4) for bz, half, foot, _ in CROSS if foot <= M.HIGH]
    for kz, half, foot, top in CROSS:
        if foot > M.HIGH and U["zn"] - half < kz < U["zs"] + half:
            a = abs(kz - st.left)
            taken.append((a - half - 0.4, a + half + 0.4, foot - 1.5, top + 1.5))
    if side < 0:
        keep.append((PYLON_Z, 2.6))
    if U["k"] == 0 and L["i"] % 3 != 2:
        keep.append((U["zs"] - 3.0, 2.0))
    if side > 0:
        keep.append((-261.0, 3.0))
    for kz, half in keep:
        if U["zn"] - half < kz < U["zs"] + half:
            a = abs(kz - st.left)
            taken.append((a - half, a + half, 0.0, 999.0))
    # (No screen on the first lots of the right-hand row: they stand between
    # the hero's lens and the figure's slogan.)
    if w > 18.0 and r.random() < 0.55 and not (side > 0 and L["i"] <= 2):
        sw = r.uniform(5.0, 7.5)
        sh = sw * r.uniform(1.2, 1.6)
        ss, sy = r.uniform(sw, w - sw), r.uniform(ph + sh / 2 + 2.0, max(ph + sh / 2 + 2.5, h * 0.62))
        if C._free(taken, (ss - sw / 2, ss + sw / 2, sy - sh / 2, sy + sh / 2)):
            C.screen(st, ss, sy, sw, sh, r, 1.0, key=FA, off=M.off(U, ss - sw / 2, ss + sw / 2, sy - sh / 2, sy + sh / 2))
    deep = U["zs"] < -300.0
    end = U["zs"] <= END_Z
    if not end:
        C.street_signs(st, r, 0.5, w - 0.5, SHOP_H + 0.9, ph - 1.0, max(3, round(w / 4.0)), taken=taken)

    def upper(front, key, tk):
        C.street_signs(st, r, 0.5, w - 0.5, ph + 0.6, min(h - 6.0, ph + 16.0, U["belt"] - 0.4), max(2, round(w / 7.0)),
                       hero=front == FA, key=key, taken=tk)
        for _ in range(r.randrange(1, 3)):
            ss, sy = r.uniform(1.5, w - 1.5), r.uniform(ph + 14.0, h - 8.0)
            if C._free(tk, (ss - 0.6, ss + 0.6, sy - 2.6, sy + 2.8)):
                o = M.off(U, ss - 0.6, ss + 0.6, sy - 2.6, sy + 2.6)
                cant = r.choice((0.0, 0.3, -0.3))
                # (High on a deep tower a board of words on a bracket where the
                # hero's picture allows one, not another blade of type.)
                if deep and M.clear(OCC, *M.box_of(st, ss - 0.2, ss + 0.2, sy - 0.8, sy + 0.8, 0.0, o + 3.4)):
                    C.blade(st, ss, sy, "pm", 0.0, front, key, key, out=o + 1.85)
                else:
                    C.blade(st, ss, sy, "bl", cant, front, key, key, out=0.95 + o)

    if end:
        # (Past the forecourt, where the canyon closes on the megablock: the
        # show's mix over the shops, not a blade of type at every height.
        # What hung here before is dealt into the void first, so the lot's
        # draws and every later sign's turn run on as they did.)
        tk = list(taken)
        _ghost(lambda: C.street_signs(st, r, 0.5, w - 0.5, SHOP_H + 0.9, ph - 1.0, max(3, round(w / 4.0)), hero=False, key=VOID, taken=tk))
        _ghost(lambda: upper(VOID, VOID, tk))
        C.street_mix(st, random.Random(9650 + U["idx"] * 11), 0.5, w - 0.5, SHOP_H + 0.9, ph - 1.0, max(3, round(w / 5.0)), taken, shop=True)
        rm = random.Random(9600 + U["idx"] * 7)
        C.street_mix(st, rm, 0.5, w - 0.5, ph + 0.6, min(h - 6.0, ph + 16.0, U["belt"] - 0.4), max(2, round(w / 8.0)), taken)
        C.street_mix(st, rm, 0.5, w - 0.5, ph + 14.0, h - 8.0, 1, taken)
    else:
        upper(FA, CB, taken)
    # Over the signs: balconies in stacks up the face, floor on floor, clear
    # of every sign; condensers under windows on the lower floors; a
    # downpipe at each end of the face.
    bays = max(1, round(w / CELL_W))
    bw_ = w / bays
    ka, kb = int((ph + 9.0 - SHOP_H) / CELL_H) + 1, int((h - 4.0 - SHOP_H) / CELL_H)
    if kb - ka >= 3 and bays >= 3:
        for _ in range(r2.randrange(1, 4) if r2.random() < 0.75 else 0):
            nb = r2.choice((1, 1, 2))
            b0 = r2.randrange(0, bays - nb + 1)
            k0 = r2.randrange(ka, kb - 2)
            k1 = r2.randrange(k0 + 2, kb + 1)
            s0_, s1_ = b0 * bw_ + 0.25, (b0 + nb) * bw_ - 0.25
            if C._free(taken, (s0_ - 0.4, s1_ + 0.4, fl(k0) - 0.5, fl(k1) + 1.4), pad=0.6):
                step = r2.choice((1, 1, 2))
                for k in range(k0, k1 + 1, step):
                    if M.plain(U, fl(k) + 0.5) or M.off(U, s0_, s1_, fl(k), fl(k) + 1.0) > 0:
                        C.balcony(CB, st, s0_, s1_, fl(k), tcol, base=M.off(U, s0_, s1_, fl(k) - 0.1, fl(k) + 1.0))
    for k in range(int((ph - SHOP_H) / CELL_H), min(kb, int((ph - SHOP_H) / CELL_H) + 9)):
        for b in range(bays):
            if r2.random() < 0.13:
                sa = (b + 0.5) * bw_ + r2.uniform(-0.5, 0.5)
                if all(not (a0 - 0.6 < sa < a1 + 0.6 and c0 - 0.9 < fl(k) < c1 + 0.3) for a0, a1, c0, c1 in taken):
                    ax_, _, az_ = st.p(st.at(sa), 0.0, M.off(U, sa - 0.5, sa + 0.5, fl(k), fl(k) + 0.8))
                    P.place("ac_wall", ax_, fl(k) + 0.08, az_, st.yaw, district=CB)
    for sa in (0.22, w - 0.22):
        if r2.random() < 0.7:
            ax_, _, az_ = st.p(st.at(sa), 0.0, 0.0)
            P.place("pipe_v", ax_, ph, az_, st.yaw, sy=h - ph - 0.5, district=CB)
    M.relief(U, taken)
    # (And what stands out of it between its signs, on its own dice.)
    REL.street(U, taken, ROWS[side], random.Random(9500 + U["idx"] * 13))
    print("CANYON street lights", side, L["i"], U["k"], round(U["zn"]), round(U["zs"]), U["recipe"], "top", round(REL._safe_top(U, ROWS[side]), 1),
          REL.street_lights(U, taken, ROWS[side], random.Random(9990 + U["idx"] * 29)))
    # Its sides over the slots and alleys the same, where the hero's lens
    # does not see them.
    rs_ = random.Random(9930 + U["idx"] * 31)
    plaza = side > 0 and L["i"] <= 4
    for f_, end_ in ((U["so"], U["south"]), (U["no"], U["north"])):
        if end_ != "abut":
            REL.lines(f_, ph + CELL_H * 2, h - 1.0, rs_, lambda lo, hi: C.hidden(OCC, lo, hi, plaza=plaza), U["hues"])


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
    used = []
    if not quiet and hi - lo > 14.0 and w > 12.0 and r.random() < 0.6:
        sw = r.uniform(5.0, 8.0)
        sh = min(hi - lo - 6.0, sw * r.uniform(1.4, 2.2))
        ss_ = r.uniform(sw / 2 + 1.0, w - sw / 2 - 1.0)
        C.screen(f, ss_, hi - 3.0 - sh / 2, sw, sh, r, 0.0, back=False)
        used.append((ss_ - sw / 2 - 0.3, ss_ + sw / 2 + 0.3, hi - 3.3 - sh, hi - 2.7))
    if not quiet:
        # Units, pipes and a fire escape up the first floors over the podium,
        # a ledge every few floors.
        B.clutter_back(CB, f, r, lo, min(hi, lo + 24.0))
        y = lo + CELL_H * 4
        while y < hi - 3.0:
            f.ledge((CB, "trim", 1), 0.0, w, y - 0.22, 0.22, 0.2, B.TRIM[U["tint"]])
            y += CELL_H * 4
        for s in (0.25, w - 0.25):
            if r.random() < 0.5:
                C.seam(CB, f, s, lo + 1.0, hi - 1.5, r.choice(HUES + ("blue",)))
        for _ in range(r.randrange(1, 4)):
            C.blade(f, r.uniform(1.5, w - 1.5), r.uniform(lo + 4.0, max(lo + 5.0, hi - 6.0)), "bl", r.choice((0.0, 0.3, -0.3)))
    if U["back"] == "low" and h - U["top"] > 10.0:
        # The slab's back over the terrace.
        sb = U["bk"]
        if r.random() < 0.7:
            sw = r.uniform(6.0, 9.0)
            sh = min(h - U["top"] - 9.0, sw * 0.7)
            if sh > 1.8:
                C.screen(sb, r.uniform(sw / 2 + 1.0, sb.width - sw / 2 - 1.0), U["top"] + 6.5 + sh / 2, sw, sh, r, 0.0, back=False)
        C.strip(CB, sb, 0.5, sb.width - 0.5, h - 1.6, h - 1.2, r.choice(HUES))
    # Its upper floors lit as the show's canyon has them: a big vertical sign
    # and lines of neon along the floor edges (never on the square's wall:
    # the plaza's boards and the clue). Its own dice.
    if quiet:
        return
    plaza = side > 0 and L["i"] <= 4
    ok = lambda lo_, hi_: C.hidden(OCC, lo_, hi_, plaza=plaza)
    rl = random.Random(9970 + U["idx"] * 23)
    REL.upper(f, lo + CELL_H * 2, hi - 0.5, rl, ok, U["hues"], taken=used)
    if U["back"] == "low" and h - U["top"] > 8.0:
        REL.lines(U["bk"], U["top"] + 3.5, h - 1.8, rl, ok, U["hues"])


def _roofs(U):
    """Every roof of a tower, from the air: plant, light and structure where
    no lens of the page's sees them, lines of light round the edges, and on
    a terrace a deck that is lived on."""
    L = U["lot"]
    side, r, h = L["side"], L["r"], U["h"]
    rb = random.Random(7300 + L["i"] * 23 + U["k"] * 3 + (0 if side > 0 else 500))
    plaza_ = side > 0 and L["i"] <= 4
    # The right-hand row's second lot backs onto the square, and the plaza
    # has dressed that back to just under this roof (plaza_corp.py): nothing
    # on it stands over its parapet.
    bare = side > 0 and L["i"] == 1
    away = "+x" if side > 0 else "-x"
    # The slab's roof in two strips, each as high as the hero's lens allows:
    # low by the street edge, more behind it.
    zn, zs = U["zn"] + 1.0, U["zs"] - 1.0
    for u0, u1, lines in ((3.5, 8.0, ()), (8.0, U["sd"] - 0.6, ("-z",) + ((away,) if U["back"] == "low" else ()))):
        if u1 - u0 < 3.0:
            continue
        xa, xb = sorted((_x(side, u0), _x(side, u1)))
        top = C.hidden_top(OCC, xa, xb, zn, zs, h, h + 7.0, step=1.0, pad=0.2, least=1.0)
        if bare:
            C.roof_plant(CB, xa, xb, zn, zs, h, r, 0.0, lines)
            continue
        # (Where the lens allows nothing to stand, what a roof holds under
        # its parapet's height.) In the middle of the back strip of a long
        # roof, the largest thing the lenses allow: a crane, a penthouse,
        # tanks, a skylight.
        # On the back of a long enough roof, a block of storeys stepped back
        # from the street as high as the lenses allow (canyon_sky).
        if u0 == 8.0:
            sx = sorted((_x(side, 8.6), _x(side, U["sd"] - 1.0)))
            sb = SK.setback(U, sx[0], sx[1], zn + 1.5, zs - 1.5, h, OCC, plaza_, side, random.Random(9100 + U["idx"] * 7))
            if sb:
                for za, zb in ((zn, sb[0] - 0.6), (sb[1] + 0.6, zs)):
                    if zb - za > 3.0:
                        C.roof_plant(CB, xa, xb, za, zb, h, r, (top - h) if top else 0.0, lines)
                continue
        if u0 == 8.0 and zs - zn > 26.0:
            zm = (zn + zs) / 2
            C.roof_big(CB, xa, xb, zm - 8.0, zm + 8.0, h, rb, OCC, plaza_, col=U["back_col"])
            C.roof_plant(CB, xa, xb, zn, zm - 8.6, h, r, (top - h) if top else 0.0, lines)
            C.roof_plant(CB, xa, xb, zm + 8.6, zs, h, r, (top - h) if top else 0.0, lines)
            continue
        C.roof_plant(CB, xa, xb, zn, zs, h, r, (top - h) if top else 0.0, lines)
    edge_hue = r.choice(("red", "amber", "white", "cyan", "red"))
    xr = sorted((_x(side, 0.75), _x(side, U["sd"] - 0.75)))
    C.roof_edge(CB, xr[0], xr[1], U["zn"] + 0.75, U["zs"] - 0.75, h, edge_hue)
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
        if cz1 - cz0 > 20.0:
            zm = (cz0 + cz1) / 2 + 5.0
            C.roof_big(CB, cx0 + 0.5, cx1 - 0.5, zm - 4.0, zm + 4.0, ct, rb, OCC, plaza_, col=U["back_col"])
        C.roof_plant(CB, cx0 + 0.5, cx1 - 0.5, cz0 + 0.5, cz1 - 0.5 if cz1 - cz0 <= 20.0 else (cz0 + cz1) / 2, ct, r, 1.6)
        C.roof_edge(CB, cx0 + 0.5, cx1 - 0.5, cz0 + 0.5, cz1 - 0.5, ct, "red")
        C.roof_edge(CB, bx0 + 0.7, bx1 - 0.7, bz0 + 0.7, bz1 - 0.7, t, edge_hue)
        return
    if t > h:
        cap = C.hidden_top(OCC, bx0, bx1, bz0, bz1, t, t + 7.0, step=1.0, pad=0.2, least=1.0)
        if bz1 - bz0 > 22.0:
            zm = (bz0 + bz1) / 2
            C.roof_big(CB, bx0 + 0.6, bx1 - 0.6, zm - 7.0, zm + 7.0, t, rb, OCC, plaza_, col=U["back_col"])
            C.roof_plant(CB, bx0 + 0.6, bx1 - 0.6, bz0 + 0.6, zm - 7.6, t, r, (cap - t) if cap else 0.0, ring)
            C.roof_plant(CB, bx0 + 0.6, bx1 - 0.6, zm + 7.6, bz1 - 0.6, t, r, (cap - t) if cap else 0.0, ())
        else:
            C.roof_plant(CB, bx0 + 0.6, bx1 - 0.6, bz0 + 0.6, bz1 - 0.6, t, r, (cap - t) if cap else 0.0, ring)
        C.roof_edge(CB, bx0 + 0.7, bx1 - 0.7, bz0 + 0.7, bz1 - 0.7, t, edge_hue)
        if cap and cap > t + 1.2:
            SK.beacons(CB, bx0, bx1, bz0, bz1, t + 0.95)
        # A mast at its far corner where the lenses allow one.
        mx, mz = (bx1 - 1.6 if side > 0 else bx0 + 1.6), bz0 + 1.6
        plaza = side > 0 and L["i"] <= 4
        mtop = C.hidden_top(OCC, mx - 0.5, mx + 0.5, mz - 0.5, mz + 0.5, t, t + 16.5, plaza=plaza, pad=0.3, least=7.0)
        if mtop:
            P.place("cy_mast", mx, t, mz, r.uniform(0, 1.5), sy=(mtop - t) / 16.3, district=CB)
        return
    # A terrace: plant at its north end behind a row of planters, the rest a
    # deck that is lived on: paving with lines of light in it, a bar's lit
    # front on the slab's wall, tables with lamps and people at them, lights
    # strung from the wall to posts at the rail, lamps on long arms,
    # benches and trees along the rail, people looking out.
    span = bz1 - bz0
    dz0 = bz0 + (span * 0.3 if span > 15.0 else 0.4)
    wall_x = _x(side, U["sd"])
    edge = bx1 - 0.75 if side > 0 else bx0 + 0.75
    inward, out = -math.pi / 2 * side, math.pi / 2 * side
    if dz0 - bz0 > 4.0:
        # (A terrace stands well under its slab: its plant end is where a
        # crane can be left standing.)
        if dz0 - bz0 > 9.0 and C.roof_big(CB, bx0 + 0.6, bx1 - 0.6, bz0 + 0.6, bz0 + 5.6, t, rb, OCC, plaza_, crane=1.0, jib=(bz0 - 3.0, bz1), col=U["back_col"], out=side) == "crane":
            print("CANYON crane", side, L["i"], U["k"])
        C.roof_plant(CB, bx0 + 0.6, bx1 - 0.6, bz0 + (6.0 if dz0 - bz0 > 9.0 else 0.6), dz0 - 1.0, t, r, 6.0, ())
        x = bx0 + 2.2
        while x < bx1 - 2.0:
            P.place("cy_planter", x, t, dz0 - 0.3, 0.0, district=CB)
            x += 3.4
    B.ground_rect(CB, bx0 + 0.3, bx1 - 0.3, dz0, bz1 - 0.3, y=t + 0.03)
    C.paving(CB, bx0 + 0.3, bx1 - 0.3, dz0, bz1 - 0.3, t + 0.03, hue=U.get("rail", "amber"), pitch=3.0, lines="x", power=0.0)
    sb = U["bk"]
    fs0, fs1 = sorted((C.s_of(sb, dz0 + 1.2), C.s_of(sb, bz1 - 1.2)))
    if fs1 - fs0 > 5.0 and abs(edge - wall_x) > 6.0:
        fs1 = min(fs1, fs0 + 15.6)
        bar = C.deck_front(CB, sb, fs0, fs1, t, r, U["tint"])
        zb0, zb1 = sorted((sb.at(fs0), sb.at(fs1)))
        z = zb0 + 1.5
        while z < zb1:
            light(CB, wall_x + side * 2.2, t + 2.5, z, bar, 8.0)
            z += 3.5
    rail_x = bx1 - 0.36 if side > 0 else bx0 + 0.36
    z, k = dz0 + 1.6, 0
    while z < bz1 - 1.0:
        P.place("cy_string", (wall_x + rail_x) / 2, t + 3.45, z, 0.0, sxz=abs(rail_x - wall_x) / 6.0, district=CB)
        box((CB, "metal", 1), rail_x - 0.04, rail_x + 0.04, t, t + 3.5, z - 0.04, z + 0.04, scale=0.5)
        for fr in (0.4, 0.75):
            light(CB, wall_x + (edge - wall_x) * fr, t + 2.5, z, "amber", 7.0)
        if k % 3 == 1:
            P.place("cy_deck_lamp", edge - side * 0.3, t, z + 1.6, inward, district=CB)
            light(CB, edge - side * 1.7, t + 3.0, z + 1.6, "cyan", 8.0)
        z += 3.3
        k += 1
    xs_lo, xs_hi = sorted((wall_x + side * 4.4, edge - side * 2.4))
    cols = []
    x = xs_lo + 0.2
    while x <= xs_hi:
        cols.append(x)
        x += 4.3
    DECK.terrace(sb, dz0, bz1, t, wall_x, edge, side, cols, random.Random(9800 + U["idx"] * 19))
    z = dz0 + 2.4
    while z < bz1 - 2.0:
        x = xs_lo + 0.2
        while x <= xs_hi:
            if r.random() < 0.62:
                tx, tz = x + r.uniform(-0.4, 0.4), z + r.uniform(-0.35, 0.35)
                P.place("cy_table", tx, t + 0.03, tz, 0.0, district=CB)
                for i in range(3):
                    if r.random() < 0.5:
                        a = i * math.tau / 3 + 0.5
                        stand(tx + 0.85 * math.cos(a), tz + 0.85 * math.sin(a), math.atan2(-math.cos(a), -math.sin(a)), "sit", t + 0.53)
            x += 4.3
        z += 4.1
    for z in (dz0 + 0.9, bz1 - 0.9):
        P.place("planter_palm", wall_x + side * 1.0, t, z, sxz=0.85, district=CB)
    z, k = dz0 + 3.0, 0
    while z < bz1 - 2.0:
        if k % 2 == 0:
            P.place("bench", edge - side * 0.35, t + 0.03, z, math.pi / 2, district=CB)
            if r.random() < 0.7:
                stand(edge - side * 0.35, z + r.uniform(-0.5, 0.5), inward, "sit", t + 0.51)
        elif r.random() < 0.7:
            stand(edge - side * 0.1, z, inward, r.choice(("lean", "lean", "smoke", "phone")), t + 0.03)
        z += 4.6
        k += 1
    if bz1 - dz0 > 9.0:
        cx = (bx0 + bx1) / 2 + side * 2.0
        stand(cx, bz1 - 2.2, 0.0, "talk", t + 0.03)
        stand(cx, bz1 - 1.2, math.pi, "talk", t + 0.03)
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
            C.tall(f"far_{'l' if side < 0 else 'r'}{i}", i * 2 + (1 if side > 0 else 0), side * (WALK - 1.6), SHOP_H + 3.0, h, U["zs"] - 3.0, side * WALK)
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
            C.lane(CB, xa, xb, z_lo, z_hi, lr, along="x", tubes=not rail)
            # A vent breathing steam near its lane end.
            vx, vz = _x(side, 25.0), (z_lo + z_hi) / 2
            box((CB, "metal", 1), vx - 0.4, vx + 0.4, B.G0, B.G0 + 0.06, vz - 0.4, vz + 0.4, scale=0.5)
            C.steam("drain", vx, B.G0 + 0.08, vz)
            _alleys += 1
            if not rail:
                # A stall just inside its mouth, someone serving, someone eating.
                sx, sz = _x(side, 2.4), z_lo + 1.25
                P.place("cy_stall", sx, B.G0, sz, 0.0, district=CB)
                C.stall_steam(sx, sz, 0.0)
                stand(sx, sz - 0.55, 0.0, "vendor", B.G0)
                for dx in (-0.6, 0.7):
                    P.place("cy_stool", sx + dx, B.G0, sz + 1.5, district=CB)
                    stand(sx + dx, sz + 1.5, math.pi, "sit", B.G0 + 0.5)
                light(CB, sx, 2.2, sz + 1.0, "amber", 5.0)
    units = [U for L in row for U in L["units"]]
    for a, b in zip(units, units[1:]):
        gap = a["zn"] - b["zs"]
        if not 3.0 < gap < 12.0:
            continue
        lr = random.Random(int(abs(a["zn"]) * 3 + side))
        if a["lot"] is b["lot"] or a["lot"]["north"] == "gap":
            # The podium's roof in the slot: plant between the towers, and at
            # the street's edge a board on legs, turned to the traffic.
            py = max(a["lot"]["ph"], b["lot"]["ph"])
            xp = sorted((_x(side, 7.5), _x(side, DEPTH - 3.0)))
            C.roof_plant(CB, xp[0], xp[1], b["zs"] + 0.4, a["zn"] - 0.4, py, lr, 3.0)
            bw = gap - 1.0
            bx_, bz_ = _x(side, 1.2), (a["zn"] + b["zs"]) / 2
            B.billboard(CB, bx_, py + 1.6 + bw * 0.3, bz_, bw, bw * 0.6, -side * (math.pi / 2 - lr.uniform(0.15, 0.5)), lr, frame=True, back=True, depth=0.3)
            for dz in (-bw * 0.35, bw * 0.35):
                box((CB, "metal", 1), bx_ - 0.07, bx_ + 0.07, py, py + 1.6, bz_ + dz - 0.07, bz_ + dz + 0.07, scale=0.5)
        if lr.random() < 0.65 and (side, round((a["zn"] + b["zs"]) / 2)) not in LOOKOUTS:
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
# It is eight metres wide, so its east edge is a service strip: a rack of
# pipes on posts the lane's whole length, and under it, by turns, a stall
# with its stools and its light, a table, a rank of condensers, a totem.
C.pipe_rack(CB, 51.5, -455.0, -286.0, lane_r)
lz, k = -292.0, 0
while lz > -450.0:
    pick = k % 4
    if pick == 0:
        P.place("cy_stall", 50.5, B.G0, lz, -math.pi / 2, district=CB)
        C.stall_steam(50.5, lz, -math.pi / 2)
        stand(51.05, lz, -math.pi / 2, "vendor", B.G0)
        for dz in (-0.6, 0.7):
            P.place("cy_stool", 49.0, B.G0, lz + dz, district=CB)
            if lane_r.random() < 0.8:
                stand(49.0, lz + dz, math.pi / 2, "sit", B.G0 + 0.5)
        light(CB, 49.4, 2.2, lz, lane_r.choice(("white", "amber")), 6.0)
    elif pick == 1:
        P.place("cy_table", 50.2, B.G0, lz, 0.0, district=CB)
        for i in range(3):
            if lane_r.random() < 0.6:
                a = i * math.tau / 3 + 0.5
                stand(50.2 + 0.85 * math.cos(a), lz + 0.85 * math.sin(a), math.atan2(-math.cos(a), -math.sin(a)), "sit", B.G0 + 0.5)
        light(CB, 50.2, 1.5, lz, "amber", 4.0)
    elif pick == 2:
        for i in range(lane_r.randrange(2, 5)):
            P.place("cy_unit", 50.6, B.G0, lz + i * 2.0, math.pi / 2, district=CB)
    else:
        C.totem(CB, 50.6, B.G0, lz, -math.pi / 2 + lane_r.uniform(-0.3, 0.3), lane_r, w=1.3, h=3.4)
    lz -= lane_r.uniform(8.5, 12.5)
    k += 1
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
# The square's west edge, under the canyon's wall and its canopy: a paved
# walk with a line of teal light and lit bollards where it meets the square,
# warm pools under the canopy, and along it stalls facing the square, tables,
# planters, benches, totems: all low enough to leave the wall and its boards
# in view.
C.flat((CB, "glow", 0), 47.86, 47.96, -262.0, -191.0, B.G0 + 0.02, C.dim("teal", 0.55))
ez = -192.5
while ez > -262.0:
    C.flat((CB, "trim", 1), 44.2, 47.86, ez - 0.08, ez + 0.08, B.G0 + 0.012, (0.02, 0.021, 0.026, 1))
    P.place("cy_bollard", 48.0, B.G0, ez - 1.75, district=CB)
    light(CB, 47.4, 1.0, ez - 1.75, "white", 1.5)
    light(CB, 45.2, 3.0, ez, "amber", 5.0)
    ez -= 3.5


def _sq_awning(z0, z1, depth, colour, ya=2.85, yb=2.35):
    """A stall's awning on its own frame: dyed cloth sloping from a rail at
    the shops' wall to a rail `depth` out, a valance and a lit hem along the
    front, a post under each corner."""
    dye = tuple(int(NEON[colour][i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)
    xa, xb = 44.3, 44.3 + depth
    k = (CB, "awning", 1)
    for q in (((xa, ya, z1), (xa, ya, z0), (xb, yb, z0), (xb, yb, z1)), ((xb, yb - 0.3, z1), (xb, yb - 0.3, z0), (xb, yb, z0), (xb, yb, z1))):
        quad(k, *q, col=dye)
        quad(k, q[1], q[0], q[3], q[2], uvs=((1, 0), (0, 0), (0, 1), (1, 1)), col=dye)
    box((CB, "neon_" + colour, 0), xb - 0.02, xb + 0.02, yb - 0.36, yb - 0.3, z0, z1, scale=1.0, bottom=True)
    for x, y in ((xa, ya), (xb, yb)):
        box((CB, "metal", 1), x - 0.03, x + 0.03, y - 0.03, y + 0.03, z0, z1, scale=0.5, bottom=True)
        for z in (z0 + 0.04, z1 - 0.04):
            box((CB, "metal", 0), x - 0.035, x + 0.035, B.G0, y, z - 0.035, z + 0.035, scale=0.5)
    return xb


def _sq_sign(x, y, z, size, k=1.0):
    """A stall's sign over its awning's edge, read from the square."""
    sw, sh = ST_SIZES[size][0] * k, ST_SIZES[size][1] * k
    box((CB, "board_frame", 0), x - 0.1, x, y - 0.07, y + sh + 0.07, z - sw / 2 - 0.07, z + sw / 2 + 0.07, scale=1.0, bottom=True)
    sign(st_name(size), x + 0.015, y + sh / 2, z, sw, sh, math.pi / 2, district=CB, label=False)


def _sq_stall(zc, hw, colour, depth, size, r):
    """A stall under the wall, its counter to the square: a back board with
    a shelf of bottles, a counter with a lit menu on its front, a pot
    steaming on it, its own awning (its own colour and depth) and sign,
    lanterns, the vendor, stools and whoever is eating."""
    xb = _sq_awning(zc - hw - 0.2, zc + hw + 0.2, depth, colour)
    box((CB, "trim", 0), 44.25, 44.4, B.G0, 1.95, zc - hw, zc + hw, scale=1.0, col=C.WOOD)
    box((CB, "metal", 1), 44.4, 44.62, 1.5, 1.54, zc - hw + 0.1, zc + hw - 0.1, scale=0.5, bottom=True)
    for i in range(int((2 * hw - 0.4) / 0.24)):
        z = zc - hw + 0.3 + i * 0.24
        quad((CB, "glow", 1), (44.63, 1.54, z + 0.035), (44.63, 1.54, z - 0.035), (44.63, 1.78, z - 0.035), (44.63, 1.78, z + 0.035),
             col=C.dim(("amber", "green", "yellow", "cyan", "white", "red")[i % 6], 0.3))
    cx0, cx1 = 45.1, 45.65
    box((CB, "trim", 0), cx0, cx1, B.G0, 0.95, zc - hw, zc + hw, scale=1.0, col=C.WOOD)
    box((CB, "metal", 1), cx0 - 0.05, cx1 + 0.07, 0.95, 1.0, zc - hw - 0.05, zc + hw + 0.05, scale=0.6)
    quad((CB, "glow", 0), (cx1 + 0.005, 0.22, zc + hw - 0.1), (cx1 + 0.005, 0.22, zc - hw + 0.1), (cx1 + 0.005, 0.8, zc - hw + 0.1), (cx1 + 0.005, 0.8, zc + hw - 0.1),
         col=C.dim(colour, 0.12))
    n = max(2, int(2 * hw / 0.5))
    for i in range(n):
        z = zc + hw - 0.3 - i * (2 * hw - 0.6) / max(1, n - 1)
        quad((CB, "glow", 1), (cx1 + 0.01, 0.42, z + 0.16), (cx1 + 0.01, 0.42, z - 0.16), (cx1 + 0.01, 0.7, z - 0.16), (cx1 + 0.01, 0.7, z + 0.16),
             col=C.dim(("red", "white", "green", "yellow", "cyan")[i % 5], 0.55))
    pz = zc + hw * r.choice((-0.5, 0.5))
    cylinder((CB, "metal", 1), cx0 + 0.25, pz, 1.0, 1.3, 0.2, segs=8)
    C.steam("stall", cx0 + 0.25, 1.32, pz, most=30)
    for z in (zc - hw, zc + hw):
        P.place("lantern", xb - 0.1, 1.95, z, district=CB)
    _sq_sign(xb + 0.12, 2.42, zc + r.uniform(-0.3, 0.3), size, k=min(1.0, (2 * hw + 0.2) / ST_SIZES[size][0]))
    stand(44.78, zc + r.uniform(-0.3, 0.3), math.pi / 2, "vendor", B.G0)
    for z in (zc - 0.55, zc + 0.6):
        if r.random() < 0.75:
            P.place("cy_stool", cx1 + 0.5, B.G0, z, district=CB)
            if r.random() < 0.8:
                stand(cx1 + 0.5, z, -math.pi / 2, "sit", B.G0 + 0.5)
    if r.random() < 0.6:
        stand(cx1 + 1.2, zc + r.uniform(-0.8, 0.8), -math.pi / 2, r.choice(("idle", "phone")), B.G0)
    light(CB, cx1 + 0.6, 2.0, zc, "amber", 5.0)


def _sq_bar(zc, half, colour, depth, r):
    """A bar under a deep awning: a long counter along the walk with
    stools down its square side and people on them, the barman behind it,
    a back bar of bottles against the wall under a lit sign, lanterns in a
    row over the counter."""
    xb = _sq_awning(zc - half - 0.3, zc + half + 0.3, depth, colour, ya=3.0, yb=2.45)
    box((CB, "trim", 0), 44.25, 44.5, B.G0, 2.1, zc - half, zc + half, scale=1.0, col=C.WOOD)
    for y in (1.2, 1.62):
        box((CB, "metal", 1), 44.5, 44.72, y - 0.03, y, zc - half + 0.1, zc + half - 0.1, scale=0.5, bottom=True)
        for i in range(int((2 * half - 0.4) / 0.26)):
            z = zc - half + 0.3 + i * 0.26
            quad((CB, "glow", 1), (44.73, y, z + 0.04), (44.73, y, z - 0.04), (44.73, y + 0.26, z - 0.04), (44.73, y + 0.26, z + 0.04),
                 col=C.dim(("amber", "green", "cyan", "amber", "white", "red", "yellow")[(i + int(y * 5)) % 7], 0.3))
    sw, sh = ST_SIZES["pm"]
    sign(st_name("pm"), 44.52, 2.55, zc, sw, sh, math.pi / 2, district=CB, label=False)
    cx0, cx1 = 45.9, 46.4
    box((CB, "trim", 0), cx0, cx1, B.G0, 1.05, zc - half, zc + half, scale=1.0, col=C.WOOD)
    box((CB, "metal", 1), cx0 - 0.06, cx1 + 0.1, 1.05, 1.1, zc - half - 0.06, zc + half + 0.06, scale=0.6)
    quad((CB, "glow", 0), (cx1 + 0.005, 0.12, zc + half - 0.1), (cx1 + 0.005, 0.12, zc - half + 0.1), (cx1 + 0.005, 0.2, zc - half + 0.1), (cx1 + 0.005, 0.2, zc + half - 0.1),
         col=C.dim(colour, 0.7))
    z = zc - half + 0.55
    while z < zc + half - 0.3:
        P.place("cy_stool", cx1 + 0.45, B.G0, z, district=CB)
        if r.random() < 0.7:
            stand(cx1 + 0.45, z, -math.pi / 2, "sit", B.G0 + 0.5)
        z += r.uniform(0.95, 1.35)
    z = zc - half + 0.4
    while z < zc + half:
        P.place("lantern", cx1 + 0.3, 2.15, z, district=CB)
        z += 1.25
    box((CB, "metal", 1), cx1 + 0.28, cx1 + 0.32, 2.42, 2.45, zc - half, zc + half, scale=0.5, bottom=True)
    stand(45.25, zc - half * 0.4, math.pi / 2, "vendor", B.G0)
    stand(45.3, zc + half * 0.55, math.pi / 2, "idle", B.G0)
    light(CB, 46.8, 2.1, zc - half * 0.5, "amber", 5.0)
    light(CB, 46.8, 2.1, zc + half * 0.5, "amber", 5.0)


def _sq_shut(zc, r):
    """A kiosk shut for the night: a steel box, its front a roller shutter
    with a hazard strip at its foot, its awning rolled up under a dead
    sign, crates and bags left beside it, someone leaning on it."""
    box((CB, "trim", 0), 44.25, 45.5, B.G0, 2.55, zc - 1.4, zc + 1.4, scale=1.0, col=(0.07, 0.075, 0.09, 1))
    quad((CB, "door_panel", 0), (45.51, B.G0 + 0.1, zc + 1.25), (45.51, B.G0 + 0.1, zc - 1.25), (45.51, 2.1, zc - 1.25), (45.51, 2.1, zc + 1.25),
         uvs=((0, 0), (2.5, 0), (2.5, 2.0), (0, 2.0)))
    box((CB, "hazard", 1), 45.51, 45.54, B.G0, B.G0 + 0.12, zc - 1.25, zc + 1.25, scale=0.5)
    box((CB, "trim", 1), 45.5, 45.72, 2.2, 2.42, zc - 1.35, zc + 1.35, scale=1.0, col=(0.2, 0.05, 0.05, 1), bottom=True)
    box((CB, "board_frame", 0), 45.5, 45.58, 2.6, 3.2, zc - 1.0, zc + 1.0, scale=1.0, bottom=True)
    box((CB, "metal", 1), 45.52, 45.6, 1.0, 1.14, zc - 0.06, zc + 0.06, scale=0.5, bottom=True)
    P.place("crates", 46.0, B.G0, zc + 2.0, 0.3, district=CB)
    P.place("bags", 45.2, B.G0, zc - 2.1, math.pi / 2, district=CB)
    stand(45.75, zc - 0.5, math.pi / 2, "lean", B.G0)
    stand(46.3, zc + 0.7, -2.2, "squat", B.G0)


# What stands along it, from the plaza street north: no two stalls alike
# (each its own width, awning, sign and what is on its counter), one of
# them shut, one a bar with a row of stools; between them tables, benches,
# hedges and palms of different sizes, totems; nothing at an even step.
sq_r = random.Random(4860)
for zc, what, a in ((-194.2, "stall", (1.3, "amber", 2.2, "pm")), (-198.7, "table", ()), (-202.2, "hedge", (1.15,)), (-207.5, "bar", (2.5, "teal", 2.8)),
                    (-212.6, "totem", ()), (-216.1, "shut", ()), (-220.3, "palm", ()), (-225.2, "stall", (1.1, "cyan", 1.8, "bx")), (-229.3, "bench", ()),
                    (-234.8, "stall", (1.5, "yellow", 2.6, "ps")), (-239.7, "table", ()), (-243.3, "hedge", (0.8,)), (-249.0, "stall", (1.25, "red", 2.0, "pm")),
                    (-254.3, "totem", ()), (-258.7, "bench", ())):
    if what == "stall":
        _sq_stall(zc, *a, sq_r)
    elif what == "bar":
        _sq_bar(zc, *a, sq_r)
    elif what == "shut":
        _sq_shut(zc, sq_r)
    elif what == "table":
        P.place("cy_table", 46.3, B.G0, zc, sq_r.uniform(0, 2.0), district=CB)
        for i in range(3):
            if sq_r.random() < 0.65:
                ang = i * math.tau / 3 + 0.5
                stand(46.3 + 0.85 * math.cos(ang), zc + 0.85 * math.sin(ang), math.atan2(-math.cos(ang), -math.sin(ang)), "sit", B.G0 + 0.5)
    elif what == "hedge":
        P.place("cy_planter", 47.2, B.G0, zc, math.pi / 2, sy=a[0], sxz=a[0], district=CB)
        stand(46.3, zc + 0.4, 0.0, "talk", B.G0)
        stand(46.3, zc + 1.4, math.pi, "talk", B.G0)
    elif what == "palm":
        P.place("planter_palm", 46.9, B.G0, zc, sq_r.uniform(0, 6.28), sxz=0.9, district=CB)
        P.place("lightbox", 45.2, B.G0, zc + 1.6, math.pi / 2, district=CB)
    elif what == "bench":
        P.place("bench", 46.5, B.G0, zc, math.pi / 2, district=CB)
        stand(46.5, zc + sq_r.uniform(-0.5, 0.5), -math.pi / 2, "sit", B.G0 + 0.48)
        P.place("planter_tree", 47.1, B.G0, zc - 2.0, district=CB)
    else:
        C.totem(CB, 47.0, B.G0, zc, math.pi / 2, sq_r, w=1.3, h=3.2)
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

# What crosses the avenue (ARL_JWwKdDs@22), and the mast of adverts beside
# the first.
bridge_r = random.Random(4822)
front = None
for n, m in enumerate(MEGA):
    boxes, tiers = canyon_cross.megastructure(r=bridge_r, occ=OCC, front=front, **m)
    if n == 0:
        boxes.append(C.pylon(PYLON_Z, m["y0"] - 2.0, random.Random(4823), -1))
        front = tiers[:2]
    for lo, hi in boxes:
        if C.covers(AVENUE_MASSES, lo, hi):
            raise RuntimeError(f"the megastructure at z {m['zn']} stands across something the hero frames: {lo} {hi}")

# Cables slung across the avenue between the towers, at every height.
cable_r = random.Random(4830)
for _ in range(26):
    z = cable_r.uniform(-700.0, -196.0)
    if RAIL[0] - 4.0 < z < RAIL[1] + 4.0 or any(abs(z - zc) < half + 4.0 for zc, half, foot, _ in CROSS if foot <= M.HIGH) or FORECOURT[0] < z < FORECOURT[1]:
        continue
    y = cable_r.uniform(8.0, 30.0)
    C.cable(CB, (-WALK, y, z), (WALK, y + cable_r.uniform(-3.0, 3.0), z + cable_r.uniform(-7.0, 7.0)), cable_r.uniform(0.8, 3.0))

# The pavements. The crowd walks two lines on each (0.7 m from the kerb and
# 1.7 m from the lot line) and the walk camera between them, so what stands
# is against the wall or at the kerb's edge: vending machines, benches, a
# phone booth, food boxes, bollards, hydrants, short lamps, and the people
# who use them. Nothing across an alley's mouth, an arcade's columns, the
# forecourt's steps or the viaduct's piers.
pave_r = random.Random(4840)
for s in (-1, 1):
    out = -s * math.pi / 2
    shut = [(a - GAP - 2.5, a + 2.5) for a in ALLEYS[s]] + [(RAIL[0] - 5.0, RAIL[1] + 5.0)]
    if s < 0:
        shut.append((PYLON_Z - 1.6, PYLON_Z + 1.6))
    shut += [(L["z0"] - 1.0, L["z1"] + 1.0) for L in ROWS[s] if L["arcade"]]
    if s > 0:
        shut.append((FORECOURT[0] - 1.0, FORECOURT[1] + 1.0))
    z = -200.0 - (4.0 if s > 0 else 0.0)
    grates = 0
    while z > -700.0:
        wall_ok = not any(a < z < b for a, b in shut)
        kerb_ok = not (RAIL[0] - 5.0 < z < RAIL[1] + 5.0)
        if wall_ok:
            roll = pave_r.random()
            if roll < 0.13:
                kind = pave_r.choice(("vending", "vending_warm"))
                P.place(kind, s * 13.55, B.G0, z, out, district=CB)
                light(CB, s * 12.7, 1.2, z, "amber" if kind == "vending_warm" else "white", 2.5)
                if pave_r.random() < 0.6:
                    stand(s * 13.0, z + 1.1, out + pave_r.uniform(-0.6, 0.6), pave_r.choice(("phone", "idle", "smoke")), B.G0)
            elif roll < 0.23:
                P.place("bench", s * 13.6, B.G0, z, math.pi / 2, district=CB)
                P.place("charge_post", s * 13.7, B.G0, z + 1.5, out, district=CB)
                stand(s * 13.6, z - 0.4, out, "sit", B.G0 + 0.48)
                if pave_r.random() < 0.5:
                    stand(s * 13.6, z + 0.5, out, "sit", B.G0 + 0.48)
                if pave_r.random() < 0.5:
                    stand(s * 13.2, z + 1.6, out + math.pi, "phone", B.G0)
            elif roll < 0.28:
                P.place("phone_booth", s * 13.4, B.G0, z, out, district=CB)
            elif roll < 0.38:
                # What a shop puts out at night: bags against the wall, and
                # beside them a crate, a bin, pallets or a barrel.
                P.place("bags", s * 13.5, B.G0, z, out, district=CB)
                P.place(pave_r.choice(("crates", "bin", "pallets", "barrel", "bin")), s * 13.5, B.G0, z + pave_r.choice((-1.2, 1.2)), out, district=CB)
            elif roll < 0.46:
                # A shop's board on the pavement, someone reading it.
                P.place("aframe", s * 13.2, B.G0, z, pave_r.uniform(-0.4, 0.4), district=CB)
                if pave_r.random() < 0.6:
                    stand(s * 12.9, z + 1.0, math.pi, pave_r.choice(("idle", "phone")), B.G0)
            elif roll < 0.54:
                P.place("lightbox", s * 13.5, B.G0, z, pave_r.uniform(-0.2, 0.2), district=CB)
            elif roll < 0.61:
                # A food cart against the wall, its vendor behind it and a
                # queue along the wall from its counter.
                P.place("food_cart", s * 13.25, B.G0, z, 0.0, district=CB)
                stand(s * 13.25, z - 0.85, 0.0, "vendor", B.G0)
                for q in range(pave_r.randrange(2, 5)):
                    stand(s * (13.3 + pave_r.uniform(-0.15, 0.15)), z + 1.5 + q * 0.75, math.pi, pave_r.choice(("idle", "phone", "idle")), B.G0)
                light(CB, s * 12.8, 1.8, z + 0.8, "amber", 4.0)
            elif roll < 0.76:
                # A knot of people by the wall: five, six, seven of them
                # turned in on one another, one or two a step outside it.
                n = pave_r.randrange(4, 8)
                for q in range(n):
                    a = q * math.tau / n + pave_r.uniform(-0.3, 0.3)
                    gx, gz = s * (13.15 + 0.5 * math.cos(a)), z + 1.25 * math.sin(a)
                    stand(gx, gz, math.atan2(s * 13.15 - gx, z - gz), "talk" if q % 3 else pave_r.choice(("phone", "smoke", "idle")), B.G0)
            elif roll < 0.86:
                stand(s * 13.5, z, 0.0, "talk", B.G0)
                stand(s * 13.5, z + 1.0, math.pi, "talk", B.G0)
            elif roll < 0.93:
                stand(s * 13.7, z, out, pave_r.choice(("lean", "smoke", "phone")), B.G0)
        if kerb_ok:
            roll = pave_r.random()
            zz = z + pave_r.uniform(-3.0, 3.0)
            if roll < 0.24:
                for k in range(3):
                    P.place("bollard", s * 10.55, B.G0, zz + k * 1.6, district=CB)
            elif roll < 0.34:
                P.place("hydrant", s * 10.6, B.G0, zz, district=CB)
            elif roll < 0.5:
                P.place("lamp_short", s * 10.6, B.G0, zz, district=CB)
            elif roll < 0.64:
                # A run of guard rail along the kerb, someone leaning on it.
                for k in range(pave_r.randrange(2, 5)):
                    P.place("railing", s * 10.3, B.G0, zz + k * 2.0, math.pi / 2, district=CB)
                if pave_r.random() < 0.6:
                    stand(s * 10.55, zz + 1.0, out + math.pi, "lean", B.G0)
            elif roll < 0.72 and grates < 5:
                # A grate with warm light under it (the kit gives one in
                # two of them its breath of steam).
                P.place("grate_glow", s * 10.9, B.G0, zz, math.pi / 2, district=CB)
                grates += 1
            elif roll < 0.9:
                # People at the kerb, waiting to cross: one, or three or four.
                for q in range(pave_r.choice((1, 1, 3, 4))):
                    stand(s * (10.45 + pave_r.uniform(-0.1, 0.25)), zz + q * 0.7 + pave_r.uniform(-0.15, 0.15), out + math.pi + pave_r.uniform(-0.3, 0.3),
                          pave_r.choice(("idle", "smoke", "phone", "squat") if q == 0 else ("idle", "phone", "talk")), B.G0)
            # A drain's grating in the pavement at the kerb.
            gx = sorted((s * 10.12, s * 10.42))
            C.flat((CB, "dark", 1), gx[0], gx[1], zz + 2.0, zz + 2.9, B.G0 + 0.012)
            for k in range(4):
                C.flat((CB, "metal", 1), gx[0] + 0.02, gx[1] - 0.02, zz + 2.08 + k * 0.2, zz + 2.13 + k * 0.2, B.G0 + 0.016)
        # (Never at even intervals: a short step, or a long one.)
        z -= pave_r.choice((pave_r.uniform(3.6, 5.5), pave_r.uniform(6.0, 10.5)))
# Under each megastructure's piers, out of the rain: an advertising drum at
# the kerb and a knot of people round it.
for n, m in enumerate(MEGA):
    zc = (m["zn"] + m["zs"]) / 2
    for s in (-1, 1):
        if m["feet"][0 if s < 0 else 1] > 8.0:
            continue
        P.place("ad_drum", s * 11.4, B.G0, zc + s * 1.5, district=CB)
        # (On its shop side and its ends, the kerb side kept for walkers: one
        # stood between a walker's eye and the drum looked to stand in it.)
        for q in range(5 + n):
            a = (0.0 if s > 0 else math.pi) + (-1.65 + 3.3 * q / (4 + n))
            stand(s * 11.4 + 1.6 * math.cos(a), zc + s * 1.5 + 1.6 * math.sin(a), math.atan2(-math.cos(a), -math.sin(a)) + pave_r.uniform(-0.5, 0.5),
                  pave_r.choice(("idle", "phone", "talk", "smoke")), B.G0)
# Under every crossing, out of the rain, more people: knots by the walls
# and at the kerbs on both pavements (their own dice).
under_r = random.Random(4860)
_low = [(q[1], q[3]) for q in P.INSTANCES if q[2] < 3.0 and -720.0 < q[3] < -180.0 and abs(q[1]) < 15.0 and q[0] not in ("pipe_v", "drain", "grate_glow")]
for m in MEGA:
    zc = (m["zn"] + m["zs"]) / 2
    for s in (-1, 1):
        for x, dz in ((s * 13.15, -2.8), (s * 13.15, 3.1), (s * 10.45, 0.4)):
            n = under_r.choice((3, 4, 5))
            if abs(x) < 11.0:
                n = 2
            if any(abs(px - x) < 1.3 and abs(pz - zc - dz) < 1.6 for px, pz in _low):
                continue
            a0 = under_r.uniform(0, math.tau)
            for q in range(n):
                a = a0 + q * math.tau / n
                rad = 0.55 if n > 2 else 0.42
                stand(x + rad * math.cos(a) * (0.6 if abs(x) > 12.0 else 1.0), zc + dz + rad * math.sin(a), math.atan2(-math.cos(a), -math.sin(a)),
                      under_r.choice(("talk", "talk", "idle", "phone", "smoke")), B.G0)
# Past the forecourt, a pole at the kerb on each side carries a stack of
# adverts up and down the avenue (its own dice), clear of what stands at
# the kerb there and of what the hero frames.
pole_r = random.Random(4835)
for s_, z_ in ((-1, -536.0), (1, -578.0)):
    px = s_ * 10.5
    for _ in range(8):
        if not any(q[0] != "pipe_v" and abs(q[1] - px) < 1.4 and abs(q[3] - z_) < 2.6 and q[2] < 3.0 for q in P.INSTANCES) and \
                not any(abs(q[0] - px) < 1.0 and abs(q[2] - z_) < 1.6 for q in PEOPLE):
            break
        z_ -= 2.5
    lo, hi = C.pole_stack(px, z_, 19.5, pole_r)
    if C.covers(AVENUE_MASSES, lo, hi):
        raise RuntimeError(f"the pole of adverts at z {z_} stands across something the hero frames")
    print("CANYON pole stack", s_, z_)

# Manholes up the canyon breathing steam into the signs' light.
for sx, sz in ((-5.5, -262.0), (4.0, -386.0), (-3.0, -540.0), (5.2, -322.0), (3.5, -655.0)):
    cylinder((CB, "metal", 1), sx, sz, 0.0, 0.025, 0.42, segs=14)
    C.steam("street", sx, 0.05, sz)

print("CANYON people", len(PEOPLE))
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
# The tower itself is the show's monolith (canyon_court.tower): its name on
# a vertical belt of it, where the hero's band of sky has always had it.
from ncw.districts import canyon_court  # noqa: E402
canyon_court.tower(ax, az)

# Its forecourt on the canyon, its lobby and terrace, the annex and landing
# pad east of it and the blocks north of it (the canyon's pack).
canyon_court.build(ax, az, OCC, FORECOURT[0], FORECOURT[1])
B.ground_rect(CB, 52.0, ax + 32.0, az + 32.0, -456.0)
