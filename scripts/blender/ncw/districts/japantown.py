"""Japantown: the west street, its lanes and Lucy's rooftops.

Dense and low against the canyon's tall blocks (BIBLE.md, "Japantown"): two
to six storeys on narrow lots, every one a shop under lanterns, blades
standing off its face at their own angles (ax5YUmkWf_Y@111), noren in the
doors, cables and strings of lanterns across the street; behind the west
frontage a lantern alley of stalls (part of it a covered market), a back
lane, and an outer row a little taller whose signs stand over the low roofs
and whose west faces hand over to the far city; a red gate on the plaza
street's line with a street of stalls and blossom trees behind it
(KvMY1uzSC1E@94); and on the roofs what the show puts there: decks with
rails, lamps on long arms, a viewer, planters (D6ia1wjO7sg@220), shacks,
tanks, washing, signs on frames turned up and down the street.

West to east (x): the edge strip -170..-166, row C -166..-142, the back
lane -142..-138, row B -138..-116, the lantern alley -116..-110, row A
-110..-94, the west street (streets.py) -94..-66, the east row -66..-50 and
the lane behind it -50..-44. Everything is keyed "japantown".

East of x -60 nothing that the light bake takes for a source stands higher
than 7.5 m: the bake mirrors such light onto the avenue's road for the hero
(src/world/spill.js), and the hero cannot see over its own west row. Light
up there is `glow`, which the bake leaves out. Checked at the end.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P  # noqa: F401
from ncw import plan
from ncw.districts import jt_parts as J
from ncw.districts.jt_parts import D, basis, obox, pt

G0 = B.G0
HALF_PI = math.pi / 2
XW, XE = -94.0, -66.0          # the west street's lot lines
ZN, ZS = -740.0, 12.0          # the district's north and south ends
ROW_E = (-66.0, -50.0)
LANE = (-50.0, -44.0)
ROW_A = (-110.0, -94.0)
NAKA = (-116.0, -110.0)
ROW_B = (-138.0, -116.0)
BACK = (-142.0, -138.0)
ROW_C = (-166.0, -142.0)
EDGE = (-170.0, -166.0)
# The deck's ramp climbs the middle of the street from z -220 and turns east
# at z -80: nothing is slung across the street there, and the pavements by
# the turn are the deck's.
RAMP = (-226.0, -60.0)
CROSSING = (-224.0, -215.0)    # the walker's crossing to the ramp's walkway (west kerb, z -221..-218)
DECK = (-96.0, -64.0)
TORII = (-184.0, -174.0)       # the gate street, on the plaza street's line
MARKET = (-482.5, -402.5)      # the covered stretch of the lantern alley
ALLEYS = [(-657.5, -652.5), (-572.5, -567.5), (-487.5, -482.5), (-402.5, -397.5), (-317.5, -312.5), (-252.5, -247.5),
          (-127.5, -122.5), (-47.5, -42.5)]
PASSAGES = [(-627.0, -623.0), (-542.0, -538.0), (-457.0, -453.0), (-372.0, -368.0), (-287.0, -283.0)]
NEONS = ("red", "pink", "magenta", "amber", "amber", "green", "white", "red", "magenta", "cyan")
WHITE = (0.78, 0.76, 0.7, 1.0)
TORII_RED = (0.5, 0.05, 0.04, 1)
NOREN = ((0.05, 0.07, 0.18, 1), (0.42, 0.05, 0.05, 1), (0.62, 0.6, 0.54, 1), (0.5, 0.28, 0.06, 1), (0.07, 0.25, 0.22, 1))

STYLE = dict(windows=(0, 1, 3, 6, 6), lit=(0.5, 0.92), warmth=(0.6, 1.0),
             tints=("charcoal", "brown", "rust", "teal", "plum", "concrete", "brown", "charcoal"),
             balcony=0.2, balcony_glass=0.15, ac=0.16, pipes=0.5, fire_escape=0.14, awning=0.7, shop_sign=0.5,
             canopy=0.0, cornice=0.0, setback=0.0, ledge_every=0,
             shop_colours=["red", "amber", "pink", "magenta", "red", "amber", "green", "pink"])
STYLE_B = dict(STYLE, balcony=0.14, fire_escape=0.1, awning=0.6)
STYLE_C = dict(STYLE, tints=("charcoal", "navy", "teal", "plum", "concrete", "brown"), lit=(0.45, 0.85), balcony=0.1,
               fire_escape=0.1, awning=0.4, shop_sign=0.5, setback=0.5)


def strip(f, colour, s0, s1, y0, y1, out, depth=0.06):
    """A tube of light along or up a face: its front, its top and its
    underside (a box's two ends are never seen)."""
    k = (D, "neon_" + colour, 0)
    f.quad(k, s0, s1, y0, y1, out + depth)
    a, b = f.at(s0), f.at(s1)
    for y, flip in ((y0, True), (y1, False)):
        q = (f.p(a, y, out + depth), f.p(b, y, out + depth), f.p(b, y, out), f.p(a, y, out))
        quad(k, *(q if not flip else (q[1], q[0], q[3], q[2])))


def storeys(n):
    return SHOP_H + CELL_H * (n - 1)


def lit(colour, x):
    """The key and vertex colour of a lit piece at x: neon where the bake may
    have it, `glow` east of x -60 (see the module's note)."""
    if x < -60.5:
        return (D, "neon_" + colour, 0), (1, 1, 1, 1)
    return (D, "glow", 0), GLOW[colour]


# ---------------------------------------------------------------------------
# Rows of lots.
# ---------------------------------------------------------------------------
LOTS = []


def segments(z_from, z_to, cuts, lo="open", hi="open"):
    """A row's stretches between its cuts: (z0, z1, what its north end looks
    onto, its south end). cuts: (z0, z1, kind)."""
    out, at, k = [], z_from, lo
    for c0, c1, kind in sorted(cuts):
        out.append((at, c0, k, kind))
        at, k = c1, kind
    out.append((at, z_to, k, hi))
    return out


def split(z0, z1, r, widths):
    out, z = [], z0
    while z1 - z > 0.01:
        w = r.choice(widths)
        if z1 - (z + w) < min(widths) * 0.8:
            w = z1 - z
        out.append((z, z + w))
        z += w
    return out


def pick(r, floors, prev):
    """A storey count by weight, never its neighbour's."""
    pool = [n for n, wt in floors for _ in range(wt) if n != prev]
    return r.choice(pool)


def _quiet_billboard(district, cx, cy, cz, w, h, yaw, r, frame=True, back=True, depth=0.35):
    """The east row's side walls: a tube sign where the generator would hang
    an advert (which the bake would mirror onto the avenue)."""
    J.tube_sign((cx, cy, cz), yaw, w * 0.8, h * 0.8, r.choice(("pink", "amber", "cyan", "green", "red")), r, both=False)


def build_row(tag, xs, front, back, segs, seed, widths, floors, style, quiet=False, ground="shops"):
    rs = random.Random(seed)
    back_name = "-x" if front == "+x" else "+x"
    prev = None
    keep = B.billboard
    if quiet:
        B.billboard = _quiet_billboard
    for z0, z1, klo, khi in segs:
        spans = split(z0, z1, rs, widths)
        hs = []
        for _ in spans:
            prev = pick(rs, floors, prev)
            hs.append(storeys(prev))
        # Beside the deck's girder (its gap is the deck's own to dress, at
        # grade): two storeys, their roofs level with its road, and a plain
        # windowed side for its stall and machines to stand against.
        if klo == "deck":
            hs[0] = storeys(2)
        if khi == "deck":
            hs[-1] = storeys(2)
        for j, (a, b) in enumerate(spans):
            sides = {front: "street", back_name: back, "-z": klo if j == 0 else "party", "+z": khi if j == len(spans) - 1 else "party"}
            nb = {}
            if j > 0:
                nb["-z"] = hs[j - 1]
            if j < len(spans) - 1:
                nb["+z"] = hs[j + 1]
            for name in ("-z", "+z"):
                if sides[name] == "deck":
                    sides[name], nb[name] = "party", 0.0
            r = random.Random(seed * 1000 + len(LOTS))
            tint = r.choice(style["tints"])
            lot = B.Lot(xs[0], xs[1], a, b, front, sides, nb, D)
            tiers = B.building(lot, hs[j], r, style=style, signs=False, roof=False, tint=tint, ground=ground)
            LOTS.append(dict(row=tag, lot=lot, h=hs[j], tiers=tiers, r=r, tint=B.TINTS[tint], front=front, back=back_name,
                             sides=dict(sides), seed=seed * 1000 + len(LOTS)))
    B.billboard = keep


def height_at(row, z):
    for rec in LOTS:
        if rec["row"] == row and rec["lot"].z0 <= z <= rec["lot"].z1:
            return rec["h"]
    return None


def face(rec, name):
    lot = rec["lot"]
    return B.faces_of(lot.x0, lot.x1, lot.z0, lot.z1)[name]


def rng(rec, stage):
    """A lot's own stream for one stage of its dressing (a face's lane
    dressing, its roof), so that changing one stage leaves the others as
    they were."""
    return random.Random(rec["seed"] * 37 + sum(ord(c) for c in stage))


# ---------------------------------------------------------------------------
# People (kit.stand): vendors behind every counter and their customers, the
# ones on stools and benches, against the shopfronts out of the rain, at the
# kerb, in the lanes, on the roofs. None on a walker's line: against a wall
# they keep within 0.65 m of it, at the road they are on the kerb stone.
# ---------------------------------------------------------------------------
STOOLS = ((-0.65, 0.3), (0.7, 0.2), (0.1, -0.6))


def loc(x, z, yaw, lx, lz):
    """A prototype's own (x, z), set down at (x, z) turned yaw, in the world."""
    return (x + lx * math.cos(yaw) + lz * math.sin(yaw), z - lx * math.sin(yaw) + lz * math.cos(yaw))


def stall(x, z, yaw, r, y=G0, cart=None):
    """A stall or a cart, its vendor behind the counter, one to three
    customers at it, its lamp's pool."""
    cart = r.random() < 0.35 if cart is None else cart
    J.put("jt_cart" if cart else "jt_stall", x, y, z, yaw)
    stand(*loc(x, z, yaw, r.uniform(-0.4, 0.4), -0.9 if cart else -0.2), yaw, "vendor", y)
    for i in range(r.randrange(1, 4)):
        px, pz = loc(x, z, yaw, (-0.8, 0.05, 0.85)[i] + r.uniform(-0.12, 0.12), (1.05 if cart else 1.42) + r.uniform(0.0, 0.2))
        stand(px, pz, yaw + math.pi + r.uniform(-0.3, 0.3), r.choice(("idle", "idle", "phone", "talk", "smoke")), y)
    lx, lz = loc(x, z, yaw, 0.0, 1.0)
    light(D, lx, y + 1.5, lz, "amber", 3.2)


def stools(x, z, yaw, r, y=G0):
    """Three stools round a crate, most of them taken."""
    J.put("jt_stools", x, y, z, yaw)
    for lx, lz in STOOLS:
        if r.random() < 0.45:
            px, pz = loc(x, z, yaw, lx, lz)
            stand(px, pz, math.atan2(x - px, z - pz), "sit", y + 0.44)


def bench(x, z, yaw, r, y=G0):
    J.put("bench", x, y, z, yaw)
    for lx in (-0.5, 0.45):
        if r.random() < 0.55:
            stand(*loc(x, z, yaw, lx, 0.05), yaw, "sit", y + 0.48)


def at_wall(f, s, r, out=0.38):
    """Somebody, or a few, against a face s metres along it: leaning, on a
    phone, smoking, two talking, a queue along the wall, one squatting."""
    w = f.width
    roll = r.random()
    here = lambda ss, o=out: (f.p(f.at(ss), 0.0, o)[0], f.p(f.at(ss), 0.0, o)[2])  # noqa: E731
    along = math.atan2(here(s + 1.0)[0] - here(s)[0], here(s + 1.0)[1] - here(s)[1])
    if roll < 0.4:
        stand(*here(s), f.yaw + r.uniform(-0.3, 0.3), r.choice(("lean", "lean", "smoke", "phone")), G0)
    elif roll < 0.68 and s + 1.0 < w:
        stand(*here(s, out + 0.08), along + r.uniform(-0.2, 0.2), "talk", G0)
        stand(*here(s + 0.95, out + 0.08), along + math.pi + r.uniform(-0.2, 0.2), "talk", G0)
        if r.random() < 0.35:
            stand(*here(s + 0.5, out - 0.06), f.yaw, "lean", G0)
    elif roll < 0.9:
        for i in range(max(1, min(r.randrange(2, 5), int((w - 0.5 - s) / 0.68)))):
            stand(*here(s + i * 0.68, out + r.uniform(-0.05, 0.05)), along + r.uniform(-0.25, 0.25), r.choice(("idle", "idle", "phone")), G0)
    else:
        stand(*here(s), f.yaw, "squat", G0)


# ---------------------------------------------------------------------------
# What a face carries.
# ---------------------------------------------------------------------------
def noren(f, s0, s1, r, y=3.2):
    """A door curtain: a rod and its cloth in panels."""
    drop = r.uniform(0.7, 1.1)
    n = max(2, round((s1 - s0) / 0.55))
    pw = (s1 - s0) / n
    col = r.choice(NOREN)
    for i in range(n):
        f.quad((D, "trim", 1), s0 + i * pw + 0.02, s0 + (i + 1) * pw - 0.02, y - drop, y, 0.14, col=col)
    f.box((D, "metal", 1), s0 - 0.08, s1 + 0.08, y, y + 0.04, 0.11, 0.16)


def signs_on(f, h, r, density=1.0, small=False, big=True, cap=None):
    """A facade's signs over its shops, none of them square to the wall:
    blades one over another each turned its own way, boards swung off the
    wall or tipped out over the street, small boards stacked on a mast, a
    tall blade up a corner of the taller buildings, tubes along the floors."""
    w = f.width
    lo, hi = SHOP_H + 0.5, h - 0.3
    if cap is not None:
        # (An end face of the east row: nothing lit over 7.5 m, see the note.)
        hi, big = min(hi, cap), False
    band = hi - lo
    s = r.uniform(0.6, 1.6)
    while s < w - 0.6:
        kind = r.random()
        lean = r.uniform(-0.14, 0.14) if r.random() < 0.3 else 0.0
        if kind < 0.5:
            y = lo + r.uniform(0.0, 0.5)
            while y < hi - 1.0:
                sizes = [z for z in (("bs", "bx") if small else ("bs", "bm", "bm", "bl", "bx")) if ST_SIZES[z][1] <= hi - y]
                if not sizes:
                    break
                size = r.choice(sizes)
                bh = ST_SIZES[size][1]
                J.blade(f, s, y + bh / 2, size, tilt=r.choice((-1, 1)) * r.uniform(0.1, 0.6), roll=lean)
                y += bh + r.uniform(0.3, 1.6)
                if r.random() < 0.5:
                    break
        elif kind < 0.8:
            size = r.choice(("ps", "bx") if small else ("ps", "pm", "bx", "ps"))
            bw, bh = ST_SIZES[size]
            if bw + 0.6 < w and band > bh + 0.2:
                sc = min(max(s, bw / 2 + 0.3), w - bw / 2 - 0.3)
                J.board(f, sc, r.uniform(lo + bh / 2, hi - bh / 2), size, tilt=r.uniform(-0.3, 0.3), roll=lean,
                        pitch=-r.uniform(0.05, 0.22) if r.random() < 0.4 else 0.0)
        else:
            n = min(5, int(band / 1.0))
            if n >= 2:
                px, _, pz = f.p(f.at(s), 0.0, 1.15)
                for j in range(n):
                    size = r.choice(("ps", "ps", "bx"))
                    J.slab_sign((px, lo + 0.5 + j * 1.0, pz), basis(f.yaw + HALF_PI + r.uniform(-0.45, 0.45), r.uniform(-0.08, 0.08)), size, depth=0.12)
                f.box((D, "metal", 1), s - 0.05, s + 0.05, lo - 0.2, lo + n * 1.0, 1.1, 1.2)
                for yy in (lo + 0.2, lo + n * 1.0 - 0.3):
                    f.box((D, "metal", 1), s - 0.04, s + 0.04, yy, yy + 0.07, 0.0, 1.1)
        s += r.uniform(1.9, 3.3) / density
    if big and h >= storeys(4) and r.random() < 0.5:
        k = r.uniform(1.3, min(2.1, (h - 3.2) / 5.0))
        bh = 5.0 * k
        yc = r.uniform(SHOP_H + 0.7 + bh / 2, h + 1.8 - bh / 2)
        J.blade(f, r.choice((0.45, w - 0.45)), yc, "bl", tilt=r.uniform(-0.25, 0.25), k=k, gap=0.4)
    floors = int((h - SHOP_H) / CELL_H)
    if cap is not None:
        return
    for _ in range(r.randrange(0, 3)):
        y = SHOP_H + CELL_H * r.randrange(1, floors + 1) - 0.3
        strip(f, r.choice(NEONS), 0.3, w - 0.3, y, y + 0.07, 0.2)
    if r.random() < 0.3 and h > 9.0:
        s = r.choice((0.25, w - 0.25))
        f.box((D, "neon_" + r.choice(NEONS), 0), s - 0.04, s + 0.04, SHOP_H + 0.3, h - 0.3, 0.2, 0.28)


def by_wall(f, r, alley=False, people=0.42):
    """What stands against a shopfront: vending machines, a menu board, pots,
    crates, a bin, stools."""
    w = f.width
    s = r.uniform(0.8, 2.2)
    while s < w - 0.8:
        if r.random() < people:
            at_wall(f, s, r)
            s += r.uniform(2.4, 4.4)
            continue
        roll = r.random()
        x, _, z = f.p(f.at(s), G0, 0.48)
        if roll < 0.16:
            J.put("vending", x, G0, z, f.yaw)
        elif roll < 0.28:
            J.put("vending", x, G0, z, f.yaw)
        elif roll < 0.46:
            x, _, z = f.p(f.at(s), G0, 0.6)
            J.put("jt_aframe", x, G0, z, f.yaw + r.uniform(-0.4, 0.4))
        elif roll < 0.64:
            x, _, z = f.p(f.at(s), G0, 0.35)
            J.put("jt_plants", x, G0, z, f.yaw + HALF_PI)
        elif roll < 0.7:
            x, _, z = f.p(f.at(s), G0, 0.6)
            J.put("crates", x, G0, z, f.yaw)
        elif roll < 0.74:
            J.put("bin", x, G0, z)
        elif roll < 0.82:
            x, _, z = f.p(f.at(s), G0, 0.62)
            J.put("jt_nobori", x, G0, z, f.yaw + HALF_PI)
        elif alley and roll < 0.92:
            x, _, z = f.p(f.at(s), G0, 1.0)
            stools(x, z, r.uniform(0, 6.28), r)
        s += r.uniform(2.0, 4.4)


def shop_face(rec, name, level="street", cap=None):
    """Dress one shopfront face: lanterns under its fascia, noren, signs,
    and what stands on the ground by it. level: street, alley or edge."""
    r, h = rec["r"], rec["h"]
    f = face(rec, name)
    w = f.width
    alley = level == "alley"
    # Ledges along the floor lines and a cornice (the generator's are left
    # off: these are detail, which a phone's pack drops).
    tcol = B.TRIM[rec["tint"]]
    every = r.choice((1, 1, 2)) if level == "street" else r.choice((2, 0))
    y = SHOP_H + CELL_H
    while every and y < h - 1.0:
        f.ledge((D, "trim", 1), 0.0, w, y - 0.22, 0.22, 0.18, tcol, caps=False)
        y += CELL_H * every
    if r.random() < 0.5:
        f.ledge((D, "trim", 1), 0.0, w, h - 0.55, 0.55, 0.35, tcol, caps=False)
    # What lights the front under its fascia, each front its own: paper
    # lanterns at their own height and spacing, a few big ones, a tube, a
    # string of bulbs, a standing light box, or only its windows. (The lot's
    # stream is drawn as it was; the choice is this face's own.)
    if r.random() < (0.8 if alley else 0.62 if level == "street" else 0.35):
        if r.random() < 0.7:
            r.choice((1.2, 1.4, 1.7))
        rl = rng(rec, "lamps" + name)
        roll = rl.random()
        if roll < 0.46:
            J.lantern_row(f, 0.5, w - 0.5, rl.uniform(2.75, 3.3), rl.uniform(0.5, 0.7), rl.choice((1.3, 1.6, 2.0, 2.4)))
        elif roll < 0.58:
            J.lantern_row(f, 0.7, w - 0.7, rl.uniform(2.7, 2.95), 0.6, rl.choice((2.4, 3.2)), sy=1.5, sxz=1.5)
        elif roll < 0.72:
            a = rl.uniform(0.4, w * 0.3)
            strip(f, rl.choice(("white", "pink", "cyan", "amber", "green")), a, rl.uniform(w * 0.6, w - 0.4), 3.3, 3.38, rl.uniform(0.3, 0.5))
        elif roll < 0.86:
            pa, pb = f.p(f.at(0.4), 0.0, 0.5), f.p(f.at(w - 0.4), 0.0, 0.5)
            J.span("jt_festoon", (pa[0], pa[2]), (pb[0], pb[2]), rl.uniform(3.3, 3.7), 0.35)
        elif roll < 0.93 and not alley:
            x, _, z = f.p(f.at(rl.uniform(0.9, w - 0.9)), G0, 0.3)
            J.put("lightbox", x, G0, z, f.yaw)
    for _ in range(r.randrange(0, 3) if level != "edge" else r.randrange(0, 2)):
        if w > 3.4:
            s = r.uniform(0.4, w - 2.2)
            noren(f, s, s + r.uniform(1.2, 1.8), r)
    signs_on(f, h, r, density={"street": 1.0, "alley": 0.42, "edge": 0.4}[level], small=alley, big=not alley, cap=cap)
    by_wall(f, r, alley, {"street": 0.4, "alley": 0.26, "edge": 0.08}[level])


# ---------------------------------------------------------------------------
# A lane's wall. The generator's back (a concrete plane, a caged lamp every
# few metres, a flat door now and then) is left out, its draws of the lot's
# stream kept, and the ground floor is laid out here a slot at a time, so
# that nothing is further than arm's length from the next thing: steel doors
# under a lamp each, framed windows of back rooms, shutters, air
# conditioners dripping down the wall, meters, vents, a kitchen's duct,
# pipes on straps, a ladder to the roof, and what is put out the back. Only
# a fixture lights the lane, so it is dark between them.
# ---------------------------------------------------------------------------
_kit_back = B.back_ground
VOID = "jt_void"


def _no_back(district, f, r, tcol):
    """The generator's back, drawn into a district that is thrown away: the
    lot's stream runs on exactly as it did."""
    n_inst, n_ids = len(P.INSTANCES), len(STREET_SIGN_IDS)
    _kit_back(VOID, f, r, tcol)
    del P.INSTANCES[n_inst:], STREET_SIGN_IDS[n_ids:]
    LIGHTS.pop(VOID, None)
    for key in [k for k in batches if k[0] == VOID]:
        del batches[key]


_kit_awning = B.awning


def _awning(district, f, s0, s1, colour, out=1.6, y=3.55):
    """A cloth awning with what holds it up: the sloped cloth and its
    underside, a valance hanging from its front bar, cheeks at its ends,
    the bar and two arms back to the wall, its hem lit."""
    dye = tuple(int(NEON[colour][i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)
    a, b = f.at(s0), f.at(s1)
    ti, to, drop = y + 0.45, y, 0.3
    k = (district, "awning", 1)
    p = (f.p(a, ti, 0.0), f.p(b, ti, 0.0), f.p(b, to, out), f.p(a, to, out))
    quad(k, p[0], p[1], p[2], p[3], uvs=((0, 0), (1, 0), (1, 1), (0, 1)), col=dye)
    quad(k, p[1], p[0], p[3], p[2], uvs=((1, 0), (0, 0), (0, 1), (1, 1)), col=dye)
    f.quad(k, s0, s1, to - drop, to, out, uvs=((0, 0), (1, 0), (1, 0.2), (0, 0.2)), col=tuple(v * 0.8 for v in dye[:3]) + (1.0,))
    for e, flip in ((a, False), (b, True)):
        tri = [f.p(e, ti, 0.0), f.p(e, to, out), f.p(e, to - drop, out), f.p(e, ti - drop, 0.0)]
        quad(k, *(tri if not flip else tri[::-1]), col=dye)
    m = (district, "metal", 1)
    f.box(m, s0 - 0.03, s1 + 0.03, to - 0.03, to + 0.03, out - 0.03, out + 0.03)
    for e in (s0 + 0.12, s1 - 0.12):
        pa, pb, pc = f.p(f.at(e), ti - 0.05, 0.0), f.p(f.at(e), to, out), f.p(f.at(e), y - 0.75, 0.0)
        for q in ((pc, pb, (pb[0], pb[1] + 0.05, pb[2]), (pc[0], pc[1] + 0.05, pc[2])),):
            quad(m, *q)
            quad(m, q[1], q[0], q[3], q[2])
    f.box((district, "neon_" + colour, 0), s0, s1, to - drop - 0.06, to - drop, out - 0.02, out + 0.02)


_kit_escape = B.fire_escape
ESCAPE = (0.2, 0.22, 0.21, 1)


def _fire_escape(district, f, s, y0, y1):
    """A fire escape that is seen at night: each landing on its plate with a
    rail, a mid rail and posts round it, the flight to the next with a
    handrail, all painted steel (trim: no material of its own), a lamp on the wall at every other
    landing lighting it."""
    k = (D, "trim", 1)
    y, n = y0, 0
    while y < y1:
        f.box(k, s - 2.2, s + 2.2, y, y + 0.07, 0.0, 1.1, col=ESCAPE)
        f.box(k, s - 2.2, s + 2.2, y + 1.0, y + 1.05, 1.05, 1.1, col=ESCAPE)
        for q in [(s - 2.2, s + 2.2, y + 0.5, y + 0.55)] + [(e, e + 0.05, y + 0.07, y + 1.0) for e in (s - 2.2, s - 0.02, s + 2.15)]:
            f.quad(k, q[0], q[1], q[2], q[3], 1.08, col=ESCAPE)
            pa, pb = f.p(f.at(q[1]), q[2], 1.08), f.p(f.at(q[0]), q[2], 1.08)
            quad(k, pa, pb, (pb[0], q[3], pb[2]), (pa[0], q[3], pa[2]), col=ESCAPE)
        a0, a1 = f.at(s - 2.0), f.at(s + 1.6)
        tread = (f.p(a0, y + 0.07, 0.95), f.p(a0, y + 0.07, 0.25), f.p(a1, y + CELL_H, 0.25), f.p(a1, y + CELL_H, 0.95))
        quad(k, *tread, col=ESCAPE)
        quad(k, tread[1], tread[0], tread[3], tread[2], col=ESCAPE)
        hand = (f.p(a0, y + 0.95, 0.95), f.p(a1, y + CELL_H + 0.88, 0.95), f.p(a1, y + CELL_H + 0.94, 0.95), f.p(a0, y + 1.01, 0.95))
        quad(k, *hand, col=ESCAPE)
        quad(k, hand[1], hand[0], hand[3], hand[2], col=ESCAPE)
        if n % 2 == 0:
            f.box((D, "glow", 0), s + 1.9, s + 2.1, y + 2.1, y + 2.22, 0.02, 0.13, col=GLOW["amber"])
            light(D, *f.p(f.at(s + 1.4), y + 1.2, 0.7), "amber", 3.5)
        y += CELL_H
        n += 1


LANE_WALLS = ((0.16, 0.15, 0.13, 1), (0.11, 0.13, 0.15, 1), (0.15, 0.1, 0.085, 1), (0.09, 0.12, 0.115, 1), (0.13, 0.13, 0.14, 1), (0.17, 0.13, 0.1, 1),
              (0.08, 0.09, 0.12, 1))
WINDOWS = ((0.8, 0.6, 1.95), (1.0, 1.1, 1.35), (1.0, 1.1, 1.35), (1.5, 1.0, 1.45), (0.7, 1.4, 1.2), (1.2, 0.8, 1.7))
KEEP = []   # (a wall's plane, from, to): a stall or a column stands against it, so only flat things there


def kept(f, s0, s1):
    a, b = sorted((f.at(s0), f.at(s1)))
    return any(abs(f.plane - pl) < 0.01 and a < hi and b > lo for pl, lo, hi in KEEP)


def lens(f, hue, s0, s1, y0, y1, w0, w1):
    """A lamp's lens under its hood: its front and its underside (a phone
    draws these, so no more of it than is seen)."""
    k = (D, "neon_" + hue, 0)
    f.quad(k, s0, s1, y0, y1, w1)
    a, b = f.at(s0), f.at(s1)
    quad(k, f.p(b, y0, w1), f.p(a, y0, w1), f.p(a, y0, w0), f.p(b, y0, w0))


def conduit(f, s0, s1, y, t, out=0.07):
    """A conduit along a wall: its face and its underside (it is over head
    height: nothing sees its top)."""
    k = (D, "metal", 1)
    f.quad(k, s0, s1, y, y + t, out)
    a, b = f.at(s0), f.at(s1)
    quad(k, f.p(b, y, out), f.p(a, y, out), f.p(a, y, out - 0.05), f.p(b, y, out - 0.05))


def lane_door(f, sc, r):
    f.quad((D, "door", 0), sc - 0.475, sc + 0.475, G0, G0 + 2.1, 0.03)
    x, _, z = f.p(f.at(sc), G0, 0.0)
    J.put("jt_door", x, G0, z, f.yaw)
    hue = "amber" if r.random() < 0.8 else "white"
    lens(f, hue, sc - 0.11, sc + 0.11, G0 + 2.4, G0 + 2.56, 0.06, 0.2)
    if r.random() < 0.26:
        # A bar's back door: a tube over it.
        hue = r.choice(("cyan", "cyan", "pink", "green", "red"))
        strip(f, hue, sc - 0.7, sc + 0.7, G0 + 2.78, G0 + 2.85, 0.07)
    light(D, *f.p(f.at(sc), 2.6, 0.9), hue, 3.2)


def lane_window(f, s0, r, kind):
    """A back room's window: its glass a hair proud of the wall with the
    room behind it (the shop's shader, dim, seen from a metre up the room),
    or dark; its frame, sill and bars or blind stand over it."""
    ww, wh, y0 = kind
    if r.random() < 0.7:
        col = (r.uniform(0.0, 0.55), r.choice((0.2, 0.26, 0.32, 0.38, 0.6, 0.8, 0.95)), 1.0, 1.0)
        f.quad((D, "shop", 0), s0, s0 + ww, y0, y0 + wh, 0.02, uvs=((1.0, 0.9), (1.0 + ww, 0.9), (1.0 + ww, 0.9 + wh), (1.0, 0.9 + wh)), col=col)
    else:
        # (Unlit glass: the dark of the room, in the batch every tile has.)
        f.quad((D, "glow", 0), s0, s0 + ww, y0, y0 + wh, 0.02, col=(0.0035, 0.005, 0.007, 1))
    x, _, z = f.p(f.at(s0 + ww / 2), y0, 0.0)
    J.put("jt_win" if r.random() < 0.6 else "jt_win_b", x, y0, z, f.yaw, wh, ww)


def lane_shutter(f, s0, sw, r):
    k = (D, "metal", 1)
    f.quad((D, "door_panel", 0), s0, s0 + sw, G0, 2.9, 0.03)
    f.box(k, s0 - 0.1, s0 + sw + 0.1, 2.9, 3.2, 0.0, 0.26)
    for e in (s0 - 0.09, s0 + sw):
        f.box(k, e, e + 0.09, G0, 2.9, 0.0, 0.1)
    f.box(k, s0, s0 + sw, G0, G0 + 0.09, 0.03, 0.09)
    mid = s0 + sw / 2
    lens(f, "white", mid - 0.2, mid + 0.2, 3.36, 3.46, 0.05, 0.18)
    f.box(k, mid - 0.26, mid + 0.26, 3.46, 3.5, 0.0, 0.24)
    light(D, *f.p(f.at(mid), 3.3, 0.9), "white", 2.2)


def lane_stuff(f, s, room, r, alley):
    """What is put out the back, or who is: returns the width it took."""
    here = lambda ss, o: (f.p(f.at(ss), G0, o)[0], f.p(f.at(ss), G0, o)[2])  # noqa: E731
    roll = r.random()
    if roll < 0.3:
        pose = r.choice(("lean", "lean", "smoke", "phone", "squat"))
        if pose != "squat" and r.random() < 0.3 and room > 1.9:
            along = math.atan2(here(s + 1.4, 0.5)[0] - here(s + 0.4, 0.5)[0], here(s + 1.4, 0.5)[1] - here(s + 0.4, 0.5)[1])
            stand(*here(s + 0.4, 0.5), along, "talk", G0)
            stand(*here(s + 1.35, 0.5), along + math.pi, "talk", G0)
            return 1.8
        stand(*here(s + 0.5, 0.38), f.yaw + r.uniform(-0.3, 0.3), pose, G0)
        return 1.0
    if room < 0.8:
        return 0.6
    name, wd, out = r.choice([c for c in (("crates", 1.3, 0.6), ("crates", 1.3, 0.6), ("bags", 1.5, 0.6), ("bags", 1.5, 0.6), ("pallets", 1.3, 0.6),
                                          ("pallets", 1.3, 0.6), ("barrel", 1.4, 0.42), ("rubbish", 1.9, 0.78), ("rubbish", 1.9, 0.78),
                                          ("dumpster", 2.0, 0.72), ("dumpster", 2.0, 0.72), ("drum", 0.8, 0.42), ("bin", 0.8, 0.45), ("vending", 1.2, 0.48),
                                          ("jt_stools", 2.0, 1.0)) if c[1] <= room and (alley or c[0] != "jt_stools")])
    if name == "jt_stools":
        stools(*here(s + wd / 2, out), r.uniform(0, 6.28), r)
    elif name == "barrel":
        for i in range(r.randrange(1, 3)):
            x, z = here(s + 0.4 + i * 0.66, out + r.uniform(-0.04, 0.1))
            J.put(name, x, G0, z, r.uniform(0, 6.28))
    else:
        x, z = here(s + wd / 2, out)
        J.put(name, x, G0, z, f.yaw + (r.uniform(-0.12, 0.12) if name in ("crates", "pallets", "bags") else 0.0))
    return wd


def deck_face(f, h, r, door_s=None):
    """A wall beside the deck's gap (the deck's stair climbs along the south
    one, half a metre off it, so nothing here stands further out than a
    hand): render over both floors, framed windows on each with most of
    them lit, pipes, meters, vents, a small unit, a conduit, a sign of bent
    tube, and (`door_s`) a door under its lamp where the stair starts."""
    w = f.width
    f.quad((D, "plaster", 0), 0.0, w, 0.0, h, 0.0, col=r.choice(LANE_WALLS))
    f.box((D, "trim", 1), 0.0, w, 0.0, 0.95, 0.0, 0.05, col=(0.2, 0.2, 0.21, 1))
    conduit(f, 0.15, w - 0.15, G0 + 3.05, 0.05)
    end = w - 0.6
    if door_s is not None:
        lane_door(f, door_s, r)
        end = door_s - 1.0
    s = r.uniform(0.5, 1.0)
    while s < end - 1.0:
        roll = r.random()
        if roll < 0.5 and end - s > 1.8:
            kind = r.choice(WINDOWS[1:4])
            lane_window(f, s + 0.12, r, kind)
            s += kind[0] + 0.3
        elif roll < 0.68:
            J.put("jt_pipes", *f.p(f.at(s + 0.4), G0, 0.0), f.yaw)
            s += 0.8
        elif roll < 0.8 and end - s > 1.3:
            J.put("jt_meters", *f.p(f.at(s + 0.6), G0, 0.0), f.yaw)
            s += 1.2
        elif roll < 0.9:
            J.put("jt_vent", *f.p(f.at(s + 0.42), G0, 0.0), f.yaw)
            s += 0.85
        else:
            J.put("jt_ac", *f.p(f.at(s + 0.45), G0, 0.0), f.yaw, 1.0, 0.75)
            s += 0.9
        s += r.uniform(0.3, 1.0)
    # The floor over: a window a bay, under 7.5 m (see the module's note).
    s = r.uniform(0.8, 1.6)
    while s + 1.3 < w - 0.5:
        if r.random() < 0.85:
            lane_window(f, s, r, (1.2, 1.3, SHOP_H + 1.0))
        s += r.uniform(2.6, 3.4)
    cx, _, cz = f.p(f.at(min(w - 4.2, max(3.0, end - 2.6))), 0.0, 0.14)
    J.tube_sign((cx, 4.15, cz), f.yaw, 2.8, 0.95, r.choice(("pink", "cyan", "amber", "green")), r, both=False)
    light(D, *f.p(f.at(w / 2), 2.6, 0.9), "amber", 2.5)


def deck_lot(rec):
    """The two low lots either side of the deck's gap: the wall each turns
    to it, and the wall its taller neighbour shows over its roof (the
    deck's road passes level with these roofs)."""
    lot, r = rec["lot"], rng(rec, "deck")
    south = abs(lot.z0 + 74.0) < 0.01
    name, far = ("-z", "+z") if south else ("+z", "-z")
    f = face(rec, name)
    # (A hair proud of the generator's own windowed side.)
    deck_face(B.Face(name, f.plane + 0.03 * f.nz, f.a0, f.a1), rec["h"], r, door_s=15.35 if south else None)
    x0, x1, z0, z1, _, top = rec["tiers"][-1]
    over = lot.neighbours.get(far, 0.0) - top
    if over > 2.8:
        fw = B.Face("-z", z1, x0, x1) if far == "+z" else B.Face("+z", z0, x0, x1)
        deck_wall(fw, top, r)
        if over > 5.2:
            cx, _, cz = fw.p(fw.at((x1 - x0) / 2), 0.0, 0.14)
            J.tube_sign((cx, top + 3.6, cz), fw.yaw, 4.2, 1.4, r.choice(("pink", "cyan", "amber")), r, both=False)


def lane_face(rec, name, cap=None):
    """A back on a lane or a side on a cross alley (see the note above)."""
    r, h = rng(rec, "lane" + name), rec["h"]
    f = face(rec, name)
    w = f.width
    side = rec["sides"][name] == "open"
    f.quad((D, "plaster", 0), 0.0, w, 0.0, SHOP_H, 0.0, col=r.choice(LANE_WALLS))
    f.box((D, "trim", 1), 0.0, w, 0.0, 0.95, 0.0, 0.06, col=(0.2, 0.2, 0.21, 1))
    k = (D, "metal", 1)
    conduit(f, 0.15, w - 0.15, G0 + 3.05, 0.05)
    if r.random() < 0.6:
        a = r.uniform(0.2, w * 0.4)
        conduit(f, a, r.uniform(w * 0.6, w - 0.2), G0 + 3.22, 0.04)
    s = r.uniform(0.3, 0.9)
    doors, last_door, ladder = 0, -9.0, w > 4.5 and h < 23.0 and r.random() < 0.3
    lamp = -3.0   # where the last fixture was: no wall goes eight metres without one
    while s < w - 0.7:
        room = w - 0.3 - s
        if s - lamp > 7.0:
            # A caged lamp on the conduit, over head height.
            hue = "amber" if r.random() < 0.75 else "white"
            lens(f, hue, s + 0.14, s + 0.36, G0 + 2.82, G0 + 2.98, 0.05, 0.2)
            f.box(k, s + 0.08, s + 0.42, G0 + 2.98, G0 + 3.05, 0.0, 0.26)
            light(D, *f.p(f.at(s + 0.25), 2.8, 0.9), hue, 3.0)
            lamp = s
            s += 0.6
            continue
        # By a cross alley's mouths, and where a stall or a column stands:
        # only what lies within a hand of the wall.
        flat = kept(f, s - 0.2, s + 1.6) or (side and (s < 2.4 or s > w - 3.8))
        roll = r.random()
        if (roll < 0.15 or (doors == 0 and s > w * 0.35)) and room > 1.35 and s - last_door > 4.0:
            lane_door(f, s + 0.65, r)
            doors, last_door, lamp = doors + 1, s, s
            s += 1.3
        elif roll < 0.37 and room > 1.3:
            kind = r.choice([wk for wk in WINDOWS if wk[0] + 0.25 < room])
            lane_window(f, s + 0.12, r, kind)
            if not flat and r.random() < 0.25:
                lane_stuff(f, s, kind[0], r, False)
            s += kind[0] + 0.25
        elif roll < 0.43 and room > 3.4 and not flat:
            sw = r.uniform(2.6, min(3.6, room - 0.3))
            lane_shutter(f, s + 0.15, sw, r)
            lamp = s + sw / 2
            s += sw + 0.3
        elif roll < 0.53 and room > 1.0 and not flat:
            J.put("jt_ac", *f.p(f.at(s + 0.5), G0, 0.0), f.yaw, r.uniform(0.92, 1.12))
            s += 1.0
        elif roll < 0.59 and room > 1.2:
            J.put("jt_meters", *f.p(f.at(s + 0.6), G0, 0.0), f.yaw)
            s += 1.2
        elif roll < 0.64 and room > 0.9:
            J.put("jt_vent", *f.p(f.at(s + 0.42), G0, 0.0), f.yaw)
            s += 0.85
        elif roll < 0.68 and room > 0.8 and not flat:
            J.put("jt_duct", *f.p(f.at(s + 0.35), G0, 0.0), f.yaw, min(1.0, (h - 1.2) / 5.85))
            s += 0.7
        elif roll < 0.75 and room > 0.9:
            J.put("jt_pipes", *f.p(f.at(s + 0.4), G0, 0.0), f.yaw)
            s += 0.8
        elif roll < 0.79 and ladder and room > 1.0 and not flat:
            n = math.ceil((h + 1.0 - 2.7) / 3.0)
            for i in range(n):
                sy = (h + 1.0 - 2.7) / (3.0 * n)
                J.put("jt_ladder", *f.p(f.at(s + 0.45), 2.7 + i * 3.0 * sy, 0.0), f.yaw, sy)
            ladder = False
            s += 0.9
        elif not flat and room > 0.9:
            s += lane_stuff(f, s, room, r, side)
        else:
            s += 0.6
        s += r.uniform(0.2, 0.9)
    if r.random() < 0.5 and w > 4.0:
        a = r.uniform(0.5, w - 3.0)
        strip(f, r.choice(NEONS), a, a + r.uniform(1.6, 2.6), SHOP_H + 0.25, SHOP_H + 0.33, 0.08)
    signs_on(f, h, r, density=0.16, small=True, big=False, cap=cap)


def flush_shops(f, r, tcol):
    """A ground floor of shop windows in a dark wall, the glass a hair proud
    of it: a tube over each or an awning, a shutter down now and then, a
    door to the flats; piers between them (detail: a phone has the glass)."""
    w = f.width
    bays = max(1, round(w / CELL_W))
    bw = w / bays
    i = 0
    door = r.randrange(bays) if bays >= 3 else -1
    while i < bays:
        n = 1 if i == door else min(r.choice((1, 2, 2, 3)), bays - i)
        if i < door < i + n:
            n = door - i
        a, b = i * bw + 0.3, (i + n) * bw - 0.3
        for e in (i * bw, (i + n) * bw):
            f.box((D, "trim", 1), e - 0.2, e + 0.2, 0.0, SHOP_H, 0.0, 0.14, col=tcol)
        if i == door:
            f.quad((D, "door", 0), a + 0.4, b - 0.4, G0, 2.45, 0.07)
            f.quad((D, "glow", 0), (a + b) / 2 - 0.2, (a + b) / 2 + 0.2, 2.6, 2.72, 0.07, col=GLOW["white"])
        elif r.random() < 0.86:
            f.quad((D, "shop", 0), a, b, 0.55, 3.3, 0.07, col=(r.uniform(0.4, 1.0), r.random(), 1.0 if r.random() < 0.92 else 0.0, 1.0))
            colour = r.choice(STYLE["shop_colours"])
            if r.random() < 0.5:
                _awning(D, f, a, b, colour)
            else:
                strip(f, colour, a + 0.2, b - 0.2, 3.38, 3.46, 0.07)
        else:
            f.quad((D, "door_panel", 0), a, b, G0, 3.2, 0.07)
        i += n


# ---------------------------------------------------------------------------
# Roofs.
# ---------------------------------------------------------------------------
def parapet(x0, x1, z0, z1, top, col, h=0.9, t=0.25):
    """A parapet round a roof: its outer faces, its inner faces, its top."""
    k = (D, "trim", 0)
    out = [(x0, z1), (x1, z1), (x1, z0), (x0, z0)]
    inn = [(x0 + t, z0 + t), (x1 - t, z0 + t), (x1 - t, z1 - t), (x0 + t, z1 - t)]
    walls(k, out, top, top + h, col)
    k = (D, "trim", 1)
    walls(k, inn, top, top + h, col)
    ring = [(x0, z1, x1, z1 - t), (x0, z0 + t, x1, z0), (x0, z1 - t, x0 + t, z0 + t), (x1 - t, z1 - t, x1, z0 + t)]
    for ax, az, bx, bz in ring:
        quad(k, (ax, top + h, az), (bx, top + h, az), (bx, top + h, bz), (ax, top + h, bz), col=col)


def skylight(x, z, top, r, w=1.2, d=2.4):
    """A roof light: a pale kerb and the glazing in it (the kit's own, bars
    every 1.2 m, each pane its own brightness), and its glow on the roof
    round it."""
    c = r.choice(("amber", "amber", "cyan", "white", "pink"))
    box((D, "trim", 1), x - w / 2 - 0.12, x + w / 2 + 0.12, top, top + 0.32, z - d / 2 - 0.12, z + d / 2 + 0.12, scale=1.0, col=(0.3, 0.3, 0.31, 1))
    quad((D, "skylight", 0), (x - w / 2, top + 0.36, z + d / 2), (x + w / 2, top + 0.36, z + d / 2), (x + w / 2, top + 0.36, z - d / 2), (x - w / 2, top + 0.36, z - d / 2),
         col=(1.0, 0.89, 0.72, 1))
    light(D, x, top + 0.5, z, c, 4.0)


def pad(xa, xb, za, zb, top, col):
    """Pavers laid on a roof under what stands there (pale: see jt_parts)."""
    xa, xb = sorted((xa, xb))
    quad((D, "trim", 0), (xa, top + 0.05, zb), (xb, top + 0.05, zb), (xb, top + 0.05, za), (xa, top + 0.05, za), col=col)


PAVERS = ((0.3, 0.3, 0.31, 1), (0.34, 0.31, 0.27, 1), (0.25, 0.28, 0.29, 1), (0.36, 0.35, 0.33, 1))


HUTS = ((0.3, 0.29, 0.25, 1), (0.21, 0.24, 0.26, 1), (0.27, 0.2, 0.16, 1), (0.18, 0.23, 0.2, 1))
DOOR_WARM = (0.36, 0.2, 0.075, 1)


SILL = 0.36
STAIR = ((0.1, 0.052, 0.02, 1), (0.05, 0.027, 0.011, 1), (0.016, 0.009, 0.005, 1))   # the stair lamp's light: by it, across the room, down the well


def _hq(key, c0, b, pts, col=(1, 1, 1, 1)):
    """A quad from four (u, v, t) about c0 on basis b: across, up, out."""
    quad(key, *(pt(c0, b, u, v, t) for u, v, t in pts), col=col)


def _hg(c0, b, pts, cols):
    J.gquad((D, "glow", 1), [pt(c0, b, u, v, t) for u, v, t in pts], cols)


def stair_head(x, z, y, side, wall):
    """A deck's stair hut, with a doorway that is one: rendered walls round
    an opening two steps up from the deck, the wall's thickness for its
    reveal, and through it the head of the stair under a bulkhead lamp: a
    landing, the flight going down along the back wall behind a balustrade,
    its handrail down that wall, every surface in the lamp's light and the
    well dark."""
    b = basis(HALF_PI * side)
    c0 = (x + side * 1.0, y + SILL, z)
    k = (D, "plaster", 0)
    v0, v1 = -SILL, 2.34
    for u0, u1, va, vb in ((-1.1, -0.45, v0, v1), (0.45, 1.1, v0, v1), (-0.45, 0.45, 2.0, v1), (-0.45, 0.45, v0, 0.0)):
        _hq(k, c0, b, ((u0, va, 0.0), (u1, va, 0.0), (u1, vb, 0.0), (u0, vb, 0.0)), wall)
    _hq(k, c0, b, ((-1.1, v0, -2.0), (-1.1, v0, 0.0), (-1.1, v1, 0.0), (-1.1, v1, -2.0)), wall)
    _hq(k, c0, b, ((1.1, v0, -2.0), (1.1, v1, -2.0), (1.1, v1, 0.0), (1.1, v0, 0.0)), wall)
    _hq(k, c0, b, ((-1.1, v0, -2.0), (-1.1, v1, -2.0), (1.1, v1, -2.0), (1.1, v0, -2.0)), wall)
    box((D, "dark", 1), x - 1.2, x + 1.2, y + 2.7, y + 2.82, z - 1.3, z + 1.3, scale=1.0, bottom=True)
    # Two steps up to the sill.
    for t0, t1, hh in ((0.0, 0.32, SILL), (0.32, 0.64, SILL / 2)):
        xa, xb = sorted((c0[0] + side * t0, c0[0] + side * t1))
        box((D, "concrete", 1), xa, xb, y, y + hh, z - 0.62, z + 0.62, scale=3.0)
    # The reveal.
    kt = (D, "trim", 1)
    _hq(kt, c0, b, ((-0.45, 0.0, -0.15), (-0.45, 2.0, -0.15), (-0.45, 2.0, 0.0), (-0.45, 0.0, 0.0)), J.FRAME)
    _hq(kt, c0, b, ((0.45, 0.0, -0.15), (0.45, 0.0, 0.0), (0.45, 2.0, 0.0), (0.45, 2.0, -0.15)), J.FRAME)
    _hq(kt, c0, b, ((-0.45, 2.0, -0.15), (0.45, 2.0, -0.15), (0.45, 2.0, 0.0), (-0.45, 2.0, 0.0)), J.FRAME)
    # The room: its back wall, its sides and its ceiling in the lamp's light.
    A, B, C = STAIR
    _hg(c0, b, ((-0.95, v0, -1.85), (0.95, v0, -1.85), (0.95, 2.2, -1.85), (-0.95, 2.2, -1.85)), (B, C, B, A))
    _hg(c0, b, ((-0.95, v0, -1.85), (-0.95, 2.2, -1.85), (-0.95, 2.2, -0.15), (-0.95, v0, -0.15)), (B, A, B, C))
    _hg(c0, b, ((0.95, v0, -1.85), (0.95, v0, -0.15), (0.95, 2.2, -0.15), (0.95, 2.2, -1.85)), (C, C, B, B))
    _hg(c0, b, ((-0.95, 2.2, -1.85), (0.95, 2.2, -1.85), (0.95, 2.2, -0.15), (-0.95, 2.2, -0.15)), (B, C, C, C))
    # The landing, and the flight down along the back wall toward +u.
    floor_, tread = (0.036, 0.02, 0.01, 1), (0.062, 0.035, 0.016, 1)
    _hg(c0, b, ((-0.95, 0.0, -0.9), (-0.95, 0.0, 0.0), (0.95, 0.0, 0.0), (0.95, 0.0, -0.9)), (floor_, C, C, floor_))
    for i, (ua, ub, v) in enumerate(((-0.95, -0.4, 0.0), (-0.4, 0.05, -0.18), (0.05, 0.5, -0.36))):
        _hg(c0, b, ((ua, v, -1.85), (ua, v, -0.9), (ub, v, -0.9), (ub, v, -1.85)), (tread,) * 4)
        if i:
            _hg(c0, b, ((ua, v, -1.85), (ua, v + 0.18, -1.85), (ua, v + 0.18, -0.9), (ua, v, -0.9)), (floor_,) * 4)
    _hg(c0, b, ((0.5, -0.36, -1.85), (0.5, -0.36, -0.9), (0.95, -0.36, -0.9), (0.95, -0.36, -1.85)), ((0.004, 0.003, 0.002, 1),) * 4)
    # The balustrade along the landing's edge, its newel, the rail down the wall.
    rail = (0.012, 0.01, 0.009, 1)
    _hq(kt, c0, b, ((-0.4, 0.9, -0.9), (0.95, 0.9, -0.9), (0.95, 0.96, -0.9), (-0.4, 0.96, -0.9)), rail)
    _hq(kt, c0, b, ((-0.45, 0.0, -0.9), (-0.37, 0.0, -0.9), (-0.37, 1.04, -0.9), (-0.45, 1.04, -0.9)), rail)
    for u in (-0.1, 0.2, 0.5, 0.8):
        _hq(kt, c0, b, ((u - 0.015, 0.0, -0.9), (u + 0.015, 0.0, -0.9), (u + 0.015, 0.9, -0.9), (u - 0.015, 0.9, -0.9)), rail)
    _hq(kt, c0, b, ((-0.95, 0.92, -1.84), (0.95, 0.16, -1.84), (0.95, 0.23, -1.84), (-0.95, 0.99, -1.84)), rail)
    _hg(c0, b, ((-0.72, 1.82, -1.83), (-0.4, 1.82, -1.83), (-0.4, 1.96, -1.83), (-0.72, 1.96, -1.83)), ((1.0, 0.72, 0.4, 1),) * 4)
    J.put("jt_hutdoor", c0[0], y + SILL, z, HALF_PI * side)


def hut(x, z, y, col, r, door=None, deck=False):
    """A stair hut: rendered walls under a slab that oversails them, a
    framed door standing open on the lit stair, a caged lamp over it and
    its light on the roof before it. On a deck, where it is walked up to,
    the doorway is built (stair_head); elsewhere it is seen from the air
    and the street, and is the light in its frame."""
    side = door if door is not None else r.choice((-1, 1))
    wall = r.choice(HUTS)
    dx = x + side * 1.0
    o = lambda t: dx + side * t  # noqa: E731 (t metres out of the door's wall)
    if deck:
        stair_head(x, z, y, side, wall)
    else:
        box((D, "plaster", 0), x - 1.0, x + 1.0, y, y + 2.3, z - 1.1, z + 1.1, scale=1.5, col=wall)
        box((D, "dark", 1), x - 1.2, x + 1.2, y + 2.3, y + 2.42, z - 1.3, z + 1.3, scale=1.0, bottom=True)
        q = ((o(0.02), y, z + 0.45), (o(0.02), y, z - 0.45), (o(0.02), y + 2.0, z - 0.45), (o(0.02), y + 2.0, z + 0.45))
        quad((D, "glow", 0), *(q if side > 0 else (q[1], q[0], q[3], q[2])), col=DOOR_WARM)
        J.put("jt_hutdoor", dx, y, z, HALF_PI * side)
    light(D, o(1.2), y + 1.2, z, "amber", 5.5)
    if deck:
        J.pool(o(1.3), y + 0.05, z, 1.4, centre=(0.3, 0.17, 0.06, 1), rim=TERRACE_TEAL, segs=10)
    if r.random() < 0.3:
        stand(o(1.4 if deck else 1.1), z + r.uniform(0.2, 0.8), r.uniform(0, 6.28), r.choice(("smoke", "phone", "squat")), y)


TERRACE_TEAL = (0.01, 0.021, 0.026, 1)
LUCY = {}
DRAINS = []


def deck_wall(f, top, r):
    """A taller neighbour's wall along a deck's side: pipes up it, an air
    conditioner or two dripping onto the deck, bulbs strung along it, a
    sign of bent tube where it is high enough."""
    w = f.width
    here = lambda s, o=0.0: f.p(f.at(s), top + 0.1, o)  # noqa: E731
    J.put("jt_pipes", *here(r.uniform(6.2, 7.4)), f.yaw)
    for s in (r.uniform(8.2, 9.6), r.uniform(11.5, 14.0))[:r.randrange(1, 3)]:
        if s < w - 1.0:
            J.put("jt_ac", *here(s), f.yaw, r.uniform(0.95, 1.1))
    a, b = here(6.0, 0.35), here(w - 0.6, 0.35)
    J.span("jt_festoon", (a[0], a[2]), (b[0], b[2]), top + 3.1, 0.45)
    return w


def roof_deck(x0, x1, z0, z1, top, r, front, tcol, lucy=False):
    """Lucy's roof (D6ia1wjO7sg@220): a concrete deck inside rails of thick
    posts, a raised terrace at the back up two steps with a glass rail lit
    along its top, planters, a tank, the stair hut and a mast on it; two
    lamps on long arms throwing cyan pools straight down; a viewer and a
    bench at the rail it looks out over (`front`), a blossom tree, chairs
    round a crate, crates and bags. `lucy`: the one the named view stands
    on, with everything."""
    w, d = x1 - x0, z1 - z0
    sgn = 1 if front == "+x" else -1
    xb = x0 if sgn > 0 else x1                      # the back edge
    X = lambda u: xb + sgn * u                      # noqa: E731 (u metres from the back toward the outlook)
    y = top + 0.1
    # The deck itself is one teal shadow (the frame's own tone), which the
    # lamps' pools are painted into: laid in slabs 2.4 m square, each its
    # own tone of it, the joints between them the dark under them.
    quad((D, "glow", 0), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0), col=tuple(v * 0.5 for v in J.DECK_TEAL[:3]) + (1,))
    tu = min(5.5, w * 0.36)
    rs = random.Random(round(x0 * 31 + z0 * 17))    # (the deck's own stream for what lies on it: the lot's runs as it did)
    ua = tu
    while ua < w - 0.3:
        ub = min(ua + 2.4, w - 0.2)
        za = z0 + 0.2
        while za < z1 - 0.3:
            zb = min(za + 2.4, z1 - 0.2)
            t = rs.uniform(0.8, 1.45)
            c = (J.DECK_TEAL[0] * t * rs.uniform(0.85, 1.25), J.DECK_TEAL[1] * t, J.DECK_TEAL[2] * t * rs.uniform(0.9, 1.1), 1)
            xa, xc = sorted((X(ua + 0.035), X(ub - 0.035)))
            quad((D, "glow", 1), (xa, y + 0.012, zb - 0.035), (xc, y + 0.012, zb - 0.035), (xc, y + 0.012, za + 0.035), (xa, y + 0.012, za + 0.035), col=c)
            za = zb
        ua = ub
    parapet(x0, x1, z0, z1, top, tcol, h=0.25, t=0.2)
    for a, b in (((x0 + 0.1, z0 + 0.1), (x1 - 0.1, z0 + 0.1)), ((x1 - 0.1, z0 + 0.1), (x1 - 0.1, z1 - 0.1)),
                 ((x1 - 0.1, z1 - 0.1), (x0 + 0.1, z1 - 0.1)), ((x0 + 0.1, z1 - 0.1), (x0 + 0.1, z0 + 0.1))):
        J.rail_run(a, b, top + 0.25)
    # The terrace: its top in the deck's light, its riser toward the deck.
    xa, xc = sorted((X(0.3), X(tu)))
    box((D, "concrete", 0), xa, xc, top, top + 0.9, z0 + 0.3, z1 - 0.3, scale=3.0)
    quad((D, "glow", 0), (xa, top + 0.92, z1 - 0.3), (xc, top + 0.92, z1 - 0.3), (xc, top + 0.92, z0 + 0.3), (xa, top + 0.92, z0 + 0.3), col=TERRACE_TEAL)
    for i, hh in enumerate((0.6, 0.3)):
        sa, sb = sorted((X(tu + 0.35 * i), X(tu + 0.35 * (i + 1))))
        box((D, "concrete", 1), sa, sb, top, top + hh, z0 + 0.5, z0 + 1.9, scale=3.0)
    gx = X(tu - 0.12)
    ga, gb = (gx, top + 0.9, z0 + 2.1), (gx, top + 0.9, z1 - 0.4)
    # (The kit's clear glass is double-sided: one pane.)
    quad((D, "clearglass", 1), ga, gb, (gb[0], top + 1.9, gb[2]), (ga[0], top + 1.9, ga[2]), col=(0.75, 0.95, 1.0, 1))
    zz = z0 + 2.1
    while zz < z1 - 0.39:
        box((D, "metal", 1), gx - 0.04, gx + 0.04, top + 0.9, top + 1.95, zz - 0.04, zz + 0.04, scale=1.0)
        zz += (z1 - 0.4 - z0 - 2.1) / max(1, round((z1 - z0 - 2.5) / 1.8))
    key, col = lit("cyan", gx)
    box(key, gx - 0.03, gx + 0.03, top + 1.9, top + 1.95, z0 + 2.1, z1 - 0.4, scale=1.0, col=col, bottom=True)
    for t in (0.3, 0.75):
        J.put("jt_planter", X(1.3), top + 0.9, z0 + d * t, r.uniform(0, 1.5))
    hut(X(1.6), z1 - 1.7, top + 0.9, tcol, r, door=sgn, deck=True)
    J.put("dish", X(1.3), top + 3.72, z1 - 1.3, HALF_PI * sgn + r.uniform(-0.8, 0.8))
    if d > 6.5:
        J.put("antenna", X(0.75), top + 0.9, z1 - 3.4, 0.0, r.uniform(1.2, 1.7))
    if d >= 10.0:
        J.put("tank_roof", X(2.2), top + 0.9, z0 + d * 0.52, r.uniform(0, 6.28), r.uniform(0.75, 0.95), 0.8)
    # The lamps: one by each side, their arms in over the deck.
    lamps = []
    for u, z, yaw, dz in ((tu + 1.6, z0 + 0.7, 0.0, 2.0), (w - 2.6, z1 - 0.7, math.pi, -2.0)):
        if u < w - 1.0 and d > 5.0:
            J.put("jt_lamp_arm", X(u), top + 0.1, z, yaw)
            light(D, X(u), top + 4.6, z + dz, "cyan", 8.0)
            J.pool(X(u), top + 0.17, z + dz, min(2.7, d * 0.4), centre=(0.17, 0.42, 0.48, 1))
            lamps.append((X(u), z))
    if len(lamps) == 2 and d > 6.5:
        J.span("jt_cable", (X(0.75), z1 - 3.4), lamps[1], top + 5.0, 0.6)
        # Bulbs strung from one lamp's post to the other's, over the deck.
        J.span("jt_festoon", lamps[0], lamps[1], top + 4.5, 0.8)
    if d >= 12.0 and w - tu > 12.0:
        # A big deck keeps a cart and a second table, and what was left.
        cz = z1 - 2.6
        J.put("food_cart", X(tu + 5.4), top + 0.1, cz, math.pi)
        stand(X(tu + 5.4) + r.uniform(-0.4, 0.4), cz + 0.95, math.pi, "vendor", top + 0.1)
        stand(X(tu + 5.2), cz - 1.5, r.uniform(-0.3, 0.3), r.choice(("idle", "phone", "talk")), top + 0.1)
        light(D, X(tu + 5.4), top + 1.6, cz - 1.0, "amber", 4.0)
        stools(X(w - 4.4), z0 + 3.2, r.uniform(0, 6.28), r, top + 0.1)
        J.put("rubbish", X(tu + 3.2), top + 0.1, z0 + 0.95, 0.0)
    zv = (z0 + z1) / 2 + r.uniform(-1.0, 1.0)
    J.viewer(X(w - 0.75), top + 0.1, zv, HALF_PI * sgn)
    side = r.choice((-1.6, 1.6))
    bench(X(w - 2.6), zv + side, -HALF_PI * sgn, r, top + 0.1)
    J.put("bags", X(tu + 0.9), top + 0.1, z1 - 0.9, r.uniform(0, 6.28))
    if d > 6.5:
        J.put("crates", X(tu + 2.2), top + 0.1, z1 - 0.8, r.uniform(-0.2, 0.2))
    # Chairs round a crate in the first lamp's pool.
    if d > 6.0 and w - tu > 6.0:
        cx, cz, cyaw = X(tu + 1.6), z0 + 2.9, r.uniform(-0.5, 0.5)
        J.put("jt_chairs", cx, top + 0.1, cz, cyaw)
        for sd in (-1, 1):
            if lucy or r.random() < 0.55:
                px, pz = loc(cx, cz, cyaw, 0.8 * sd, 0.0)
                stand(px, pz, cyaw - HALF_PI * sd, "sit", top + 0.56)
    # A blossom tree in its lit planter, out in the middle.
    if d >= 9.0 and w - tu > 9.0 and (lucy or r.random() < 0.6):
        J.put("planter_tree", X(tu + (w - tu) * 0.5), top + 0.1, (z0 + z1) / 2 - side * 0.9, r.uniform(0, 6.28))
        light(D, X(tu + (w - tu) * 0.5), top + 2.5, (z0 + z1) / 2 - side * 0.9, "pink", 3.5)
    # Who is up here: somebody at the rail over the street, somebody sat on
    # the terrace's steps, two talking under a lamp.
    if lucy or r.random() < 0.8:
        stand(X(w - 0.7), zv + r.choice((-1.1, 1.1)), HALF_PI * sgn + r.uniform(-0.3, 0.3), r.choice(("idle", "smoke", "phone")), top + 0.1)
    if r.random() < 0.5:
        stand(X(w - 0.75), z0 + 1.0, -HALF_PI * sgn, "lean", top + 0.1)
    if r.random() < 0.6:
        stand(X(tu + 0.2), z0 + 1.2, HALF_PI * sgn, "sit", top + 0.6)
    if r.random() < 0.5 and d > 9.0:
        stand(X(w - 3.2), z1 - 2.4, 0.0, "talk", top + 0.1)
        stand(X(w - 3.2), z1 - 1.5, math.pi, "talk", top + 0.1)
    if d > 7.0:
        J.put("jt_planter", X(w - 1.2), top + 0.1, z0 + 1.2)
        J.put("ac_roof", X(tu + 3.4), top + 0.1, z1 - 1.0)
    # What lies about it (D6ia1wjO7sg@221: shrubs in planters, benches,
    # litter): standing water in the slabs' low places, planters along the
    # outlook's rail either side of the telescope, a drain at two corners,
    # a duct along one side, and on what floor is left chairs round a
    # crate, crates, bags, a bench, vents and conduit, paper.
    taken = [(X(tu + 1.6), z0 + 2.8, 2.6), (X(w - 2.6), z1 - 2.7, 2.6), (X(tu + 1.6), z0 + 2.9, 1.6), (X(w - 2.6), zv + side, 1.6), (X(w - 0.75), zv, 1.0),
             (X(tu + (w - tu) * 0.5), (z0 + z1) / 2 - side * 0.9, 1.9), (X(tu + 0.5), z0 + 1.2, 1.6)]
    if d >= 12.0 and w - tu > 12.0:
        taken += [(X(tu + 5.4), z1 - 2.2, 2.4), (X(w - 4.4), z0 + 3.2, 1.6)]
    for _ in range(2 + int((w - tu) * d / 70)):
        J.puddle(X(rs.uniform(tu + 1.0, w - 1.0)), y + 0.02, rs.uniform(z0 + 1.0, z1 - 1.0), rs.uniform(0.5, 1.4), rs)
    for dz_ in (-5.3, -3.5, 3.5, 5.3):
        if z0 + 1.8 < zv + dz_ < z1 - 1.8:
            J.put("jt_planter", X(w - 0.95), top + 0.1, zv + dz_, rs.uniform(0, 1.5))
    for zz_ in (z0 + 0.7, z1 - 0.7):
        J.put("drain", X(w - 1.3), top + 0.1, zz_, 0.0)
    if w - tu > 11.0:
        J.put("jt_ductrun", X(w - 7.4), top + 0.1, z0 + 0.75, 0.0 if sgn > 0 else math.pi, 0.7, 1.0)
    kit = ["jt_chairs", "jt_deckbits", "crates", "jt_planter", "jt_deckbits", "bench", "bags", "jt_deckbits", "barrel", "jt_chairs", "jt_deckbits", "crates"]
    n_kit, done, tries = min(len(kit), int((w - tu) * d / 26)), 0, 0
    while done < n_kit and tries < 60 and w - tu > 5.0 and d > 5.0:
        tries += 1
        px, pz = X(rs.uniform(tu + 1.3, w - 2.2)), rs.uniform(z0 + 1.7, z1 - 1.7)
        if any(math.hypot(px - tx, pz - tz) < tr_ + 1.2 for tx, tz, tr_ in taken):
            continue
        name = kit[done]
        yaw = rs.uniform(0, 6.28)
        if name == "bench":
            bench(px, pz, yaw, rs, top + 0.1)
        else:
            J.put(name, px, top + 0.1, pz, yaw)
        if name == "jt_chairs":
            for sd in (-1, 1):
                if rs.random() < 0.6:
                    qx, qz = loc(px, pz, yaw, 0.8 * sd, 0.0)
                    stand(qx, qz, yaw - HALF_PI * sd, "sit", top + 0.56)
        taken.append((px, pz, 1.5))
        done += 1
    if lucy or rs.random() < 0.3:
        empty(f"anchor_steam_drain_jt{len(DRAINS)}", (X(w - 1.3), top + 0.14, z0 + 0.7))
        DRAINS.append(top)
    if lucy:
        # The named view: from the terrace, over its glass rail and the
        # deck, out past the rail to the skyline.
        LUCY.update(eye=(round(X(tu + 1.0), 2), round(top + 0.1 + 1.72, 2), round(z1 - 3.0, 2)), terrace=(round(X(2.9), 2), round(top + 0.9 + 1.68, 2), round(z1 - 4.6, 2)),
                    rail=(round(X(w - 1.4), 2), round(top + 0.1 + 1.7, 2), round(z0 + 3.4, 2)))


def roof_sign(x, z, top, yaw, r, span, tall_ok=True):
    """A sign on a frame at a roof's edge, turned up or down the street."""
    kind = r.random()
    if kind < 0.34:
        k = r.uniform(1.5, max(1.6, min(2.6, (span - 0.8) / 2.8)))
        sw, sh = 2.8 * k, 1.2 * k
        c = (x, top + 1.5 + sh / 2, z)
        J.slab_sign(c, basis(yaw, r.uniform(-0.05, 0.05)), "pm", k, depth=0.24)
        legs, sy = (-sw * 0.36, sw * 0.36), c[1] - sh / 2
    elif kind < 0.62 and tall_ok:
        k = r.uniform(1.2, 1.9)
        sw, sh = 1.2 * k, 5.0 * k
        c = (x, top + 0.9 + sh / 2, z)
        J.slab_sign(c, basis(yaw), "bl", k, depth=0.24)
        legs, sy = (-sw * 0.45, sw * 0.45), c[1] + sh / 2
    elif kind < 0.82 and x < -61.0:
        sw = min(span * 0.85, 9.0)
        sh = sw * 0.45
        c = (x, top + 1.8 + sh / 2, z)
        # Its back is its frame (the roofs behind it see that, not a second
        # advert): the box, and three rails across it.
        B.billboard(D, c[0], c[1], c[2], sw, sh, yaw, r, back=False)
        bb = basis(yaw + math.pi)
        for v in (-sh * 0.32, 0.0, sh * 0.32):
            obox((D, "trim", 1), pt(c, bb, 0.0, v, 0.44), bb, sw + 0.3, 0.12, 0.08, col=ESCAPE, tube=True)
        legs, sy = (-sw * 0.36, sw * 0.36), c[1] - sh / 2
    else:
        sw, sh = min(span * 0.8, 5.6), 2.0
        c = (x, top + 1.4 + sh / 2, z)
        J.tube_sign(c, yaw, sw, sh, r.choice(("pink", "red", "amber", "magenta", "green", "cyan")), r)
        legs, sy = (-sw * 0.38, sw * 0.38), c[1] - sh / 2
    b = basis(yaw)
    for du in legs:
        px, _, pz = pt((x, 0.0, z), b, du, 0.0, -0.2)
        box((D, "metal", 1), px - 0.08, px + 0.08, top, sy, pz - 0.08, pz + 0.08, scale=0.5)


COURTS = []   # where the courts are (z): none within 170 m of another


def roof(rec, weights):
    r = rng(rec, "roof")
    x0, x1, z0, z1, _, top = rec["tiers"][-1]
    w, d = x1 - x0, z1 - z0
    front = rec["front"]
    sgn = 1 if front == "+x" else -1
    xb = x0 if sgn > 0 else x1
    X = lambda u: xb + sgn * u  # noqa: E731
    out_yaw = HALF_PI * sgn
    tcol = B.TRIM[rec["tint"]]
    B.ROOFS.append((D, x0, x1, z0, z1, top))
    kinds = [k for k, wt in weights for _ in range(wt)]
    kind = r.choice(kinds)
    if kind == "deck" and (d < 6.0 or w < 12.0):
        kind = "shack"
    if rec is LUCY_LOT:
        kind = "deck"
    # (Beside the deck's gap, level with its road: a garden and a shack.)
    kind = BY_DECK.get(id(rec), kind)
    rec["roof"] = kind
    if kind == "deck":
        # The outer row's decks look back over the low roofs to the canyon.
        roof_deck(x0, x1, z0, z1, top, r, "+x" if rec["row"] == "C" else front, tcol, lucy=rec is LUCY_LOT)
        # Where a neighbour stands over it, that wall is the deck's own.
        for name, fw in (("-z", B.Face("+z", z0, x0, x1)), ("+z", B.Face("-z", z1, x0, x1))):
            over = rec["lot"].neighbours.get(name, 0.0) - top
            if over > 2.8 and w > 13.0:
                deck_wall(fw, top, r)
                if over > 5.2:
                    cx, _, cz = fw.p(fw.at(w / 2 + 2.0 * sgn), 0.0, 0.14)
                    J.tube_sign((cx, top + 3.4 + min(1.6, (over - 5.2) / 2), cz), fw.yaw, 3.6, 1.3, r.choice(("pink", "cyan", "amber", "green")), r, both=False)
        # The ledge under it, lit from below (ax5YUmkWf_Y@130).
        f = face(rec, front)
        if x1 <= -66.0 or front == "+x":
            strip(f, r.choice(("green", "purple", "cyan", "magenta")), 0.2, f.width - 0.2, top - 0.3, top - 0.22, 0.05)
        return
    parapet(x0, x1, z0, z1, top, tcol)
    if r.random() < 0.65:
        colour = r.choice(("cyan", "amber", "pink", "red", "teal", "magenta", "green"))
        for (ax, az), (bx, bz) in (((x0, z1), (x1, z1)), ((x1, z1), (x1, z0)), ((x1, z0), (x0, z0)), ((x0, z0), (x0, z1))):
            key, col = lit(colour, max(ax, bx))
            quad(key, (ax, top + 0.82, az), (bx, top + 0.82, bz), (bx, top + 0.9, bz), (ax, top + 0.9, az), col=col)
    mid = (z0 + z1) / 2
    wide = d >= 6.2
    if kind == "court" and (d < 10.0 or w < 20.0 or any(abs(mid - cz) < 170.0 for cz in COURTS)):
        kind = "laundry"
    if kind == "court":
        COURTS.append(mid)
    if kind == "solar" and d < 5.0:
        kind = "plant"
    rec["roof"] = kind
    tank = lambda u, z, k=1.0: J.put(r.choice(("jt_tank", "jt_tank", "jt_tank_r")), X(u), top, z, r.uniform(0, 6.28), r.uniform(0.8, 1.1) * k,  # noqa: E731
                                    min(1.0, (d - 1.2) / 3.2) * k)
    if kind == "shack":
        # Somebody lives up here: a shack or two on pavers, a tank, washing,
        # pots, a roof light, the stair hut.
        us = r.uniform(2.6, max(2.7, w * 0.3))
        pad(X(us - 1.2), X(min(w - 1.0, us + 9.0)), z0 + 0.5, z1 - 0.5, top, r.choice(PAVERS))
        n = 2 if w >= 20.0 and d * w > 150 and r.random() < 0.6 else 1
        for i in range(n):
            u = us + 1.2 + i * r.uniform(5.0, 6.0)
            yaw = (0.0 if sgn > 0 else math.pi) if d < 10.0 else r.choice((0.0, HALF_PI, math.pi, -HALF_PI))
            J.put(r.choice(("jt_shack", "jt_shack_b")), X(u), top, mid + r.uniform(-0.3, 0.3) * max(0.0, d - 6.4), yaw + r.uniform(-0.1, 0.1), r.uniform(0.9, 1.2),
                  r.uniform(0.85, min(1.15, (d - 0.8) / 4.6)))
            light(D, X(u), top + 1.0, mid, r.choice(("amber", "amber", "pink", "cyan")), 5.0)
        if d >= 5.6 and r.random() < 0.7:
            tank(w - 2.6, mid + r.uniform(-0.3, 0.3) * (d - 4.0))
        J.put("jt_laundry", X(w - 5.6), top, z0 + 0.9 if r.random() < 0.5 else z1 - 0.9, r.uniform(-0.1, 0.1))
        J.put("ac_roof", X(r.uniform(1.2, 2.0)), top, r.choice((z0 + 1.0, z1 - 1.0)))
        J.put("jt_plants", X(us + 4.4), top + 0.05, mid + r.uniform(-1.0, 1.0), r.uniform(0, 3))
        if r.random() < 0.7:
            stand(X(us + 4.0) + r.uniform(-0.5, 0.5), mid + r.choice((-1, 1)) * min(2.0, d / 2 - 0.9), r.uniform(0, 6.28), r.choice(("smoke", "squat", "phone", "idle")), top + 0.05)
        if d > 7.0:
            skylight(X(w - 6.2), mid + r.choice((-1, 1)) * (d / 2 - 2.0), top, r)
        if w >= 20.0 and wide:
            hut(X(w - 9.2), mid + r.uniform(-0.2, 0.2) * max(0.0, d - 3.4), top, tcol, r)
    elif kind == "plant":
        # Plant: chillers in a row on pavers, a duct from them to a riser,
        # tanks, the hut, a mast or a dish, a ridge of roof lights.
        n = r.randrange(2, 4) if w > 18 else 2
        u0 = r.uniform(2.0, 3.0)
        zz = z0 + 1.4 if r.random() < 0.5 else z1 - 1.4
        other = mid + (mid - zz) * 0.55
        pad(X(u0 - 1.6), X(u0 + n * 3.0), zz - 1.1, zz + 1.1, top, r.choice(PAVERS))
        for i in range(n):
            J.put("jt_cooler", X(u0 + i * 3.0), top + 0.05, zz, r.choice((0.0, math.pi)))
        if wide:
            J.put("jt_ductrun", X(u0 + 1.4), top, other, 0.0 if sgn > 0 else math.pi, 1.0, 1.0)
            J.put("jt_ductrun", X(u0 + 5.4), top, other, 0.0 if sgn > 0 else math.pi, 1.0, 1.0)
        hut(X(w - 2.2), mid + r.uniform(-0.2, 0.2) * max(0.0, d - 3.4), top, tcol, r)
        if d >= 5.6:
            tz = z0 + 1.75 if zz < mid else z1 - 1.75
            tank(w - 6.0, tz)
            if w > 20 and n == 2 and r.random() < 0.6:
                tank(w - 9.4, tz, 0.8)
        J.put("antenna" if r.random() < 0.6 else "dish", X(r.uniform(0.9, 1.4)), top, mid + r.uniform(-1.0, 1.0), r.uniform(0, 3.1), r.uniform(0.9, 1.5))
        if wide:
            for i in range(2 if w < 20 else 3):
                skylight(X(u0 + n * 3.0 + 1.6 + i * 1.9), other, top, r, 1.2, 2.4 if d > 7.5 else 1.2)
        J.put("ac_roof", X(w - 3.6), top, zz)
    elif kind == "sign":
        # A sign on its frame at the street edge, and its back: raking
        # struts down to blocks, a lamp for whoever climbs it.
        syaw = out_yaw + r.choice((-1, 1)) * r.uniform(0.15, 0.7)
        roof_sign(X(w - 1.3), mid, top, syaw, r, d)
        k = (D, "trim", 1)
        for dz_ in (-min(1.6, d * 0.22), min(1.6, d * 0.22)):
            a_, b_ = (X(w - 1.5), top + 3.4, mid + dz_), (X(w - 4.4), top + 0.3, mid + dz_)
            q = (a_, b_, (b_[0], b_[1] + 0.1, b_[2]), (a_[0], a_[1] + 0.1, a_[2]))
            quad(k, *q, col=ESCAPE)
            quad(k, q[1], q[0], q[3], q[2], col=ESCAPE)
            t = ((a_[0], a_[1] + 0.1, a_[2] - 0.06), (b_[0], b_[1] + 0.1, b_[2] - 0.06), (b_[0], b_[1] + 0.1, b_[2] + 0.06), (a_[0], a_[1] + 0.1, a_[2] + 0.06))
            quad(k, *(t if sgn < 0 else (t[1], t[0], t[3], t[2])), col=ESCAPE)
            xa_, xb_ = sorted((X(w - 4.9), X(w - 4.1)))
            box((D, "trim", 1), xa_, xb_, top, top + 0.3, mid + dz_ - 0.3, mid + dz_ + 0.3, scale=1.0, col=(0.33, 0.33, 0.34, 1))
        hut(X(r.uniform(2.5, w * 0.4)), mid + r.uniform(-0.2, 0.2) * max(0.0, d - 3.4), top, tcol, r)
        J.put("jt_cooler" if wide else "ac_roof", X(w * 0.55), top, z0 + 1.2 if r.random() < 0.5 else z1 - 1.2)
        if r.random() < 0.5:
            J.put("antenna", X(1.2), top, mid, 0.0, r.uniform(0.9, 1.4))
        if wide:
            skylight(X(w * 0.7), mid + r.choice((-1, 1)) * (d / 2 - 1.9), top, r)
        light(D, X(w - 3.0), top + 1.0, mid, r.choice(("pink", "magenta", "red", "amber")), 5.5)
    elif kind == "garden":
        # A garden: beds of planks in rows either side of a path of pavers,
        # a glasshouse lit from inside, bulbs on four posts, a butt, stools.
        ua, ub = 2.0, w - 4.6
        pad(X(ua - 0.6), X(ub + 0.6), mid - 0.45, mid + 0.45, top, (0.4, 0.37, 0.31, 1))
        rows = (-1, 1) if d >= 5.4 else (r.choice((-1, 1)),)
        off = min(1.7, d / 2 - 1.1)
        glass = w >= 16.0 and d >= 7.0
        u = ua + 1.5
        while u + 1.5 < ub - (4.4 if glass else 0.0):
            for sd in rows:
                J.put("jt_bed", X(u), top, mid + sd * off, 0.0 if r.random() < 0.5 else math.pi, r.uniform(0.9, 1.25))
            u += 3.5
        if glass:
            gu, gz = ub - 2.2, mid + r.choice((-1, 1)) * (d / 2 - 2.2)
            ga, gb = sorted((X(gu - 1.8), X(gu + 1.8)))
            for q in (((ga, top, gz + 1.2), (gb, top, gz + 1.2)), ((gb, top, gz - 1.2), (ga, top, gz - 1.2)), ((gb, top, gz + 1.2), (gb, top, gz - 1.2)), ((ga, top, gz - 1.2), (ga, top, gz + 1.2))):
                (ax, _, az), (bx, _, bz) = q
                quad((D, "glow", 0), (ax, top, az), (bx, top, bz), (bx, top + 1.5, bz), (ax, top + 1.5, az), col=(0.05, 0.075, 0.035, 1))
            for sd in (1, -1):
                e = ((ga, top + 1.5, gz + 1.2 * sd), (gb, top + 1.5, gz + 1.2 * sd), (gb, top + 2.2, gz), (ga, top + 2.2, gz))
                quad((D, "skylight", 0), *(e if sd > 0 else (e[1], e[0], e[3], e[2])), col=(0.8, 1.0, 0.7, 1))
            box((D, "trim", 1), ga - 0.05, gb + 0.05, top + 2.18, top + 2.25, gz - 0.05, gz + 0.05, scale=1.0, col=J.PALE)
            light(D, (ga + gb) / 2, top + 1.0, gz, "green", 4.5)
        posts = [(X(ua), z0 + 0.8), (X(ub), z0 + 0.8), (X(ub), z1 - 0.8), (X(ua), z1 - 0.8)]
        for px, pz in posts:
            box((D, "metal", 1), px - 0.05, px + 0.05, top, top + 2.9, pz - 0.05, pz + 0.05, scale=0.5)
        for a_, b_ in ((posts[0], posts[1]), (posts[2], posts[3])):
            J.span("jt_festoon", a_, b_, top + 2.85, 0.5)
        for t in (0.25, 0.7):
            light(D, X(ua + (ub - ua) * t), top + 2.0, mid, "amber", 5.0)
        J.put("barrel", X(ua - 0.4), top, mid + off, 0.0)
        stools(X(ub + 1.6), mid + r.uniform(-0.5, 0.5), r.uniform(0, 6.28), r, top + 0.04)
        if r.random() < 0.7:
            stand(X(ua + 3.2), mid + r.uniform(-0.2, 0.2), HALF_PI * r.choice((-1, 1)) + (0 if sgn > 0 else math.pi), r.choice(("squat", "idle", "smoke")), top + 0.05)
        hut(X(w - 2.2), mid, top, tcol, r)
    elif kind == "laundry":
        # A laundry's roof: sheets on lines from side to side, row behind
        # row, a wash house, tubs, a lamp to hang them by.
        k_ = max(0.6, min(1.6, (d - 1.4) / 5.0))
        u = 2.4
        while u < w - 8.4:
            J.put("jt_sheets", X(u), top, mid + r.uniform(-0.15, 0.15), HALF_PI if r.random() < 0.5 else -HALF_PI, r.uniform(0.92, 1.1), k_)
            u += r.uniform(1.5, 2.1)
        pad(X(1.4), X(u), z0 + 0.6, z1 - 0.6, top, r.choice(PAVERS))
        light(D, X(u * 0.35), top + 2.2, mid, "white", 5.0)
        light(D, X(u * 0.8), top + 2.2, mid, "amber", 4.5)
        if wide:
            # The wash house, its tarp toward the lines (it covers the stair).
            J.put("jt_shack_b", X(w - 3.6), top, mid + r.uniform(-0.2, 0.2) * max(0.0, d - 6.6), math.pi if sgn > 0 else 0.0, 1.0, min(1.0, (d - 0.8) / 4.8))
            light(D, X(w - 5.6), top + 1.0, mid, "cyan", 4.0)
        for i in range(2):
            J.put("barrel", X(u + 0.7), top, z0 + 0.9 + i * 0.7, 0.0)
        if r.random() < 0.75:
            stand(X(u * 0.5 + 0.8), mid + r.uniform(-1.0, 1.0), HALF_PI * sgn, r.choice(("idle", "idle", "phone")), top + 0.05)
        if not wide:
            hut(X(w - 2.2), mid, top, tcol, r)
    elif kind == "solar":
        # Panels in rows, tilted to the south, an inverter, the hut, a mast.
        n = max(1, int((d - 1.2) / 3.3))
        u = 2.2
        while u < w - 6.0:
            for i in range(n):
                J.put("jt_solar", X(u), top, mid + (i - (n - 1) / 2) * 3.3, HALF_PI * sgn)
            u += 2.3
        J.put("ac_roof", X(w - 4.6), top, r.choice((z0 + 1.0, z1 - 1.0)))
        hut(X(w - 2.2), mid + r.uniform(-0.2, 0.2) * max(0.0, d - 3.4), top, tcol, r)
        if r.random() < 0.6:
            J.put("antenna", X(1.0), top, mid + r.uniform(-1.0, 1.0), 0.0, r.uniform(0.9, 1.4))
    else:  # a court in a cage
        ua, ub = 2.0, w - 6.0
        za, zb = mid - min(4.5, d / 2 - 1.2), mid + min(4.5, d / 2 - 1.2)
        pad(X(ua), X(ub), za, zb, top, (0.1, 0.3, 0.27, 1))
        xa_, xb_ = sorted((X(ua + 0.3), X(ub - 0.3)))
        xm = (xa_ + xb_) / 2
        for (lx0, lx1, lz0, lz1) in ((xa_, xb_, za + 0.3, za + 0.4), (xa_, xb_, zb - 0.4, zb - 0.3), (xa_, xa_ + 0.1, za + 0.3, zb - 0.3), (xb_ - 0.1, xb_, za + 0.3, zb - 0.3),
                                     (xm - 0.05, xm + 0.05, za + 0.3, zb - 0.3), (xa_ + 2.6, xa_ + 2.7, mid - 1.8, mid + 1.8), (xb_ - 2.7, xb_ - 2.6, mid - 1.8, mid + 1.8)):
            quad((D, "paint", 0), (lx0, top + 0.08, lz1), (lx1, top + 0.08, lz1), (lx1, top + 0.08, lz0), (lx0, top + 0.08, lz0), col=WHITE)
        xx = min(X(ua), X(ub)) + 1.2
        while xx < max(X(ua), X(ub)):
            for zz_, yw in ((za, 0.0), (zb, 0.0)):
                J.put("fence_mesh", xx, top, zz_, yw)
            xx += 2.4
        for u_, zz_ in ((ua + 0.6, za + 0.2), (ub - 0.6, zb - 0.2)):
            J.put("jt_lamp_arm", X(u_), top, zz_, 0.0 if zz_ < mid else math.pi)
            light(D, X(u_), top + 4.6, zz_ + (2.0 if zz_ < mid else -2.0), "white", 8.0)
        for i in range(r.randrange(3, 6)):
            stand(r.uniform(xa_ + 1.0, xb_ - 1.0), r.uniform(za + 1.0, zb - 1.0), r.uniform(0, 6.28), r.choice(("idle", "idle", "talk", "phone")), top + 0.08)
        bench(X(ub + 1.2), mid, -HALF_PI * sgn, r, top)
        hut(X(w - 2.2), mid + r.uniform(-0.2, 0.2) * max(0.0, d - 3.4), top, tcol, r)


# ---------------------------------------------------------------------------
# The rows.
# ---------------------------------------------------------------------------
W_NARROW = (5.6, 6.4, 7.2, 8.0, 9.6, 11.2)
cuts_w = [(a, b, "open") for a, b in ALLEYS] + [(TORII[0], TORII[1], "street")]
cuts_c = [(a, b, "open") for a, b in (ALLEYS[1], ALLEYS[3], ALLEYS[7])] + [(TORII[0], TORII[1], "street")]
cuts_e = [(a, b, "open") for a, b in PASSAGES] + [(-190.0, -168.0, "street"), (-86.0, -74.0, "deck")]

B.back_ground, B.fire_escape, B.awning = _no_back, _fire_escape, _awning
build_row("E", ROW_E, "-x", "back", segments(-708.0, -10.0, cuts_e, "street", "street"), 811, W_NARROW,
          ((2, 3), (3, 4), (4, 3), (5, 2)), STYLE, quiet=True)
build_row("A", ROW_A, "+x", "street", segments(ZN, ZS, cuts_w), 812, W_NARROW,
          ((2, 3), (3, 4), (4, 3), (5, 2), (6, 1)), STYLE)
build_row("B", ROW_B, "+x", "back", segments(ZN, ZS, cuts_w), 813, (8.0, 9.6, 11.2, 12.8, 14.4),
          ((3, 3), (4, 3), (5, 3), (6, 2)), STYLE_B, ground="blank")
build_row("C", ROW_C, "-x", "back", segments(ZN, ZS, cuts_c), 814, (12.8, 16.0, 19.2, 22.4),
          ((5, 2), (6, 3), (7, 3), (8, 2), (9, 1)), STYLE_C, ground="blank")
B.back_ground, B.fire_escape, B.awning = _kit_back, _kit_escape, _kit_awning

# ---------------------------------------------------------------------------
# The lanes: the east lane behind the shallow lots, the back lane, the
# edge strip. Cables over them, lamp columns, a few strings, what stands
# about; steam.
# ---------------------------------------------------------------------------
lr = random.Random(7500)
for (xa, xb), za, zb, strings, columns in ((LANE, -706.0, -192.0, 0.45, 26.0), (BACK, ZN + 2.0, ZS - 2.0, 0.3, 30.0), (EDGE, ZN + 2.0, ZS - 2.0, 0.0, 22.0)):
    z = za + 3.0
    while z < zb:
        if xa == EDGE[0]:
            pass
        elif lr.random() < strings:
            J.string((xa, z), (xb, z + lr.uniform(-0.6, 0.6)), lr.uniform(4.6, 5.4), 0.45, 1.2)
            light(D, (xa + xb) / 2, 0.3, z, "red", 2.0)
        else:
            J.span("jt_cable", (xa, z), (xb, z + lr.uniform(-3.0, 3.0)), lr.uniform(5.0, 7.3), 0.45)
        z += lr.uniform(5.0, 10.0)
    z = za + 6.0
    k = 0
    while z < zb:
        # A column stands clear of what its wall carries.
        x = xa + 1.5 if k % 2 == 0 else xb - 1.5
        if xa == EDGE[0]:
            x = xa + 0.6
        J.put("lamp_short", x, G0, z)
        light(D, x, 3.0, z, "amber", 4.0)
        if xa == LANE[0] and k % 3 == 1:
            stall(xa + 0.95, z + 9.0, HALF_PI, lr)
            stools(xa + 1.2, z + 11.6, lr.uniform(0, 6.28), lr)
            KEEP.append((xa, z + 7.0, z + 12.8))
        roll = lr.random()
        if roll < 0.3:
            J.put("drum", x, G0, z + 2.0)
            J.put("drum", x + (0.1 if k % 2 == 0 else -0.1), G0, z + 2.7)
        elif roll < 0.55:
            J.put("bin", x, G0, z - 1.6)
        elif roll < 0.7 and xa == EDGE[0]:
            J.put("planter_tree", xa + 1.3, G0, z + 6.0, lr.uniform(0, 6.28))
        # Somebody against the strip's wall (a lane's walls stand their own).
        roll = lr.random()
        if xa == EDGE[0] and roll < 0.45:
            stand(xb - 0.38, z + 3.5, -HALF_PI + lr.uniform(-0.3, 0.3), lr.choice(("smoke", "lean", "phone", "squat")), G0)
        elif xa == EDGE[0] and roll < 0.6:
            stand(xb - 0.38, z + 3.2, 0.0, "talk", G0)
            stand(xb - 0.38, z + 4.1, math.pi, "talk", G0)
        k += 1
        z += columns * lr.uniform(0.8, 1.2)

# Lucy's roof: the outer row's tallest near the district's middle, which
# looks over every roof between it and the canyon.
LUCY_LOT = max((rc for rc in LOTS if rc["row"] == "C" and -560.0 < rc["lot"].z0 and rc["lot"].z1 < -380.0 and rc["lot"].z1 - rc["lot"].z0 >= 12.0),
               key=lambda rc: (rc["h"], -abs((rc["lot"].z0 + rc["lot"].z1) / 2 + 470.0)))
BY_DECK = {id(rc): ("garden" if abs(rc["lot"].z0 + 74.0) < 0.01 else "shack") for rc in LOTS
           if rc["row"] == "E" and (abs(rc["lot"].z0 + 74.0) < 0.01 or abs(rc["lot"].z1 + 86.0) < 0.01)}
ROOFS_W = {"E": (("deck", 4), ("shack", 4), ("plant", 2), ("sign", 4), ("garden", 3), ("laundry", 3), ("solar", 2)),
           "A": (("deck", 4), ("shack", 4), ("plant", 2), ("sign", 4), ("garden", 3), ("laundry", 3), ("solar", 2)),
           "B": (("deck", 3), ("shack", 5), ("plant", 4), ("sign", 2), ("garden", 3), ("laundry", 3), ("solar", 2), ("court", 2)),
           "C": (("deck", 2), ("shack", 2), ("plant", 5), ("sign", 6), ("garden", 1), ("laundry", 1), ("solar", 3), ("court", 2))}
for rec in LOTS:
    row = rec["row"]
    if row in ("B", "C"):
        for name in [rec["front"]] + [n for n in ("-z", "+z") if rec["sides"][n] == "street"]:
            flush_shops(face(rec, name), rec["r"], B.TRIM[rec["tint"]])
    if row != "A":
        lane_face(rec, rec["back"], cap=7.4 if row == "E" else None)
    if row in ("E", "A"):
        shop_face(rec, rec["front"], "street")
    elif row == "B":
        shop_face(rec, rec["front"], "alley")
    else:
        shop_face(rec, rec["front"], "edge")
    if row == "A":
        shop_face(rec, rec["back"], "alley")
    for name in ("-z", "+z"):
        if rec["sides"][name] == "open":
            # A side on a cross alley or a passage: lit and used like a lane.
            lane_face(rec, name, cap=7.4 if row == "E" else None)
        if rec["sides"][name] == "street":
            shop_face(rec, name, "street" if row in ("E", "A") else "alley", cap=7.4 if row == "E" else None)
    if row == "C":
        # Its back over the low rows: a big board up high, seen from the
        # roofs, the deck and the air.
        f = face(rec, rec["back"])
        if rec["r"].random() < 0.6 and f.width > 8.0:
            J.board(f, f.width / 2, rec["h"] - 2.6, "pm", tilt=rec["r"].uniform(-0.25, 0.25), k=rec["r"].uniform(1.6, 2.2), out=0.3)
    roof(rec, ROOFS_W[row])
    if id(rec) in BY_DECK:
        deck_lot(rec)


# ---------------------------------------------------------------------------
# The ground the streets module does not lay: the alleys, the lanes, the
# edge strip, the passages.
# ---------------------------------------------------------------------------
B.ground_rect(D, NAKA[0], NAKA[1], ZN, ZS)
B.ground_rect(D, BACK[0], BACK[1], ZN, ZS)
B.ground_rect(D, EDGE[0], EDGE[1], ZN, ZS)
B.ground_rect(D, LANE[0], LANE[1], -708.0, -190.0)
for a, b in ALLEYS + [TORII]:
    B.ground_rect(D, ROW_A[0], ROW_A[1], a, b)
    B.ground_rect(D, ROW_B[0], ROW_B[1], a, b)
for a, b, _ in cuts_c:
    B.ground_rect(D, ROW_C[0], ROW_C[1], a, b)
for a, b in PASSAGES:
    B.ground_rect(D, ROW_E[0], ROW_E[1], a, b)

STEAM = []


def steam(x, z, y=0.2):
    if len(STEAM) < 10:
        box((D, "metal", 1), x - 0.35, x + 0.35, G0, G0 + 0.05, z - 0.35, z + 0.35, scale=0.5)
        empty(f"anchor_steam_street_jt{len(STEAM)}", (x, y + 0.1, z))
        STEAM.append((x, z))


def gate(x, z0, z1, yaw, r, h=4.7):
    """A frame over an alley's mouth: two posts, a beam, a board on it, a
    lantern either side, a tube under the beam."""
    zc = (z0 + z1) / 2
    for z in (z0 + 0.15, z1 - 0.15):
        box((D, "trim", 0), x - 0.1, x + 0.1, G0, h, z - 0.1, z + 0.1, scale=1.0, col=TORII_RED)
        J.put("lantern", x, h - 0.46, z + (0.5 if z < zc else -0.5), 0.0, 1.5, 1.5)
    box((D, "trim", 0), x - 0.12, x + 0.12, h, h + 0.3, z0, z1, scale=1.0, col=TORII_RED, bottom=True)
    key, col = lit(r.choice(("amber", "red", "pink")), x)
    box(key, x - 0.03, x + 0.03, h - 0.07, h, z0 + 0.3, z1 - 0.3, scale=1.0, col=col, bottom=True)
    J.slab_sign((x, h + 0.3 + 0.62, zc), basis(yaw), "pm", 1.0)
    inx = x - math.sin(yaw) * 1.1
    if r.random() < 0.7:
        stand(inx, z0 + 0.45, 0.0, r.choice(("lean", "smoke", "phone")), G0)
    if r.random() < 0.6:
        stand(inx - math.sin(yaw) * 0.9, z1 - 0.9, math.pi + 0.3, "talk", G0)
        stand(inx - math.sin(yaw) * 0.7, z1 - 1.8, 0.3, "talk", G0)


# ---------------------------------------------------------------------------
# The west street: strings and cables across it, gates over it, poles and
# lamp columns along its kerbs, scooters.
# ---------------------------------------------------------------------------
def clear_of(z, spans, pad=0.0):
    return not any(a - pad < z < b + pad for a, b in spans)


# What stands over the street (z): the gate, the sign bridge, the bridge
# between the two sides, the sign tower, the lantern arch, the south arch.
GATE_Z, SIGNS_Z, BRIDGE_Z, TOWER_Z, ARCH_Z, SOUTH_Z = -696.0, -444.0, -528.0, -352.0, -276.0, -30.0
OVER = [(z - 4.0, z + 4.0) for z in (GATE_Z, SIGNS_Z, BRIDGE_Z, ARCH_Z, SOUTH_Z)] + [(-616.0, -604.0)]
sr = random.Random(7100)
z = -710.0
while z < -8.0:
    z += sr.uniform(7.0, 12.0)
    zb = z + sr.uniform(-1.5, 1.5)
    hw, he = height_at("A", z), height_at("E", zb)
    if hw is None or he is None or not clear_of(z, [RAMP]):
        continue
    kind = sr.choice(("jt_string", "jt_festoon", "jt_cable", "jt_cable", "jt_string", "jt_festoon", "jt_cable"))
    y = min(min(hw, he) - 0.6, sr.uniform(8.6, 12.5))
    free = clear_of(z, OVER) and clear_of(zb, OVER)
    if kind == "jt_cable":
        zb = z + sr.uniform(-7.0, 7.0)
        if height_at("E", zb) is None:
            continue
        yc, dc = min(hw, height_at("E", zb)) - sr.uniform(0.5, 2.5), sr.uniform(0.8, 1.6)
        if free and clear_of(zb, OVER):
            J.span(kind, (XW, z), (XE, zb), yc, dc)
    elif free:
        if kind == "jt_string":
            J.string((XW, z), (XE, zb), y, 2.2, 3.0, 2.0)
        else:
            J.span(kind, (XW, z), (XE, zb), y, 1.8)
        for x in (-86.0, -74.0):
            light(D, x, 0.3, z, "red" if kind == "jt_string" else "amber", 3.2)
    if sr.random() < 0.5:
        light(D, -90.5 if sr.random() < 0.5 else -69.5, 5.0, z, "amber", 3.0)

# Beside the ramp: lamp columns along both kerbs with lanterns strung
# between them, nothing over the road.
for x in (-90.55, -69.45):
    prev = None
    z = RAMP[0] + 2.0
    while z < RAMP[1]:
        if clear_of(z, [DECK]) and not (x > -80 and -192.0 < z < -166.0) and not (x < -80 and not clear_of(z, [CROSSING])):
            J.put("lamp_short", x, G0, z)
            if prev is not None and z - prev < 13.0:
                J.string((x, prev), (x, z), 4.3, 0.75, 2.0)
            prev = z
        else:
            prev = None
        z += 12.0

# Utility poles along both kerbs, their cables from pole to pole and off to
# the facades; a lamp column between each pair.
for x, side in ((-90.55, 1), (-69.45, -1)):
    prev = None
    z = -704.0 + (0.0 if side > 0 else 17.0)
    while z < -12.0:
        ok = clear_of(z, [DECK], 2.0) and clear_of(z, [RAMP]) and not (side < 0 and -194.0 < z < -164.0) and not (side > 0 and TORII[0] - 3 < z < TORII[1] + 3)
        if ok:
            J.put("jt_pole", x, G0, z, HALF_PI * side)
            if prev is not None and z - prev < 40.0:
                J.span("jt_cable", (x, prev), (x, z), 8.5, 1.3)
            wall = XW if side > 0 else XE
            hz = z + sr.uniform(-6.0, 6.0)
            hh = height_at("A" if side > 0 else "E", hz)
            if hh is not None:
                J.span("jt_cable", (x, z), (wall, hz), min(8.3, hh - 0.4), 0.5)
            prev = z
        else:
            prev = None
        z += 34.0

# Scooters on the kerb edge, a few together.
z = -700.0
while z < -14.0:
    side = sr.choice((-1, 1))
    x = -90.6 if side < 0 else -69.4
    if clear_of(z, [DECK], 4.0) and not (side > 0 and -194.0 < z < -164.0) and not (side < 0 and clear_of(z, [CROSSING], 3.0) is False):
        for i in range(sr.randrange(2, 5)):
            J.put("jt_scooter", x, G0, z + i * 0.85, sr.uniform(-0.25, 0.25) + (0.0 if sr.random() < 0.5 else math.pi))
        if sr.random() < 0.6:
            stand(x - 0.35 * side, z - 0.8, sr.uniform(0, 6.28), sr.choice(("idle", "phone", "smoke")), G0)
    z += sr.uniform(18.0, 34.0)

# At the kerb, on the kerb stone itself: somebody sat on it with their feet
# in the gutter, squatting, waiting to cross, two talking.
for side, xk in ((1, -90.16), (-1, -69.84)):
    z = -704.0 + sr.uniform(0.0, 8.0)
    while z < -12.0:
        if clear_of(z, [DECK], 3.0) and not (side < 0 and -194.0 < z < -164.0) and not (side > 0 and not clear_of(z, [CROSSING])):
            roll = sr.random()
            road = HALF_PI * side
            if roll < 0.3:
                stand(xk, z, road, "sit", 0.15)
                if sr.random() < 0.4:
                    stand(xk, z + 0.7, road + sr.uniform(-0.3, 0.3), "sit", 0.15)
            elif roll < 0.5:
                stand(xk - 0.05 * side, z, road + sr.choice((0.0, math.pi)), "squat", G0)
            elif roll < 0.75:
                stand(xk, z, road + sr.uniform(-0.5, 0.5), sr.choice(("idle", "phone", "smoke")), G0)
            else:
                stand(xk, z, 0.0, "talk", G0)
                stand(xk, z + 0.9, math.pi, "talk", G0)
        z += sr.uniform(10.0, 18.0)


def street_gate(z, r):
    """A gate over the whole street: red posts on the kerb edges, two beams,
    three boards between them (each a word), lanterns in a row under the
    lower beam, a tube along the top."""
    xa, xb = -90.6, -69.4
    for x in (xa, xb):
        box((D, "trim", 0), x - 0.22, x + 0.22, G0, 9.2, z - 0.22, z + 0.22, scale=1.0, col=TORII_RED)
        box((D, "dark", 0), x - 0.3, x + 0.3, G0, 0.9, z - 0.3, z + 0.3, scale=1.0)
    box((D, "trim", 0), xa - 1.6, xb + 1.6, 9.2, 9.75, z - 0.3, z + 0.3, scale=1.0, col=TORII_RED, bottom=True)
    box((D, "dark", 0), xa - 1.8, xb + 1.8, 9.75, 9.9, z - 0.38, z + 0.38, scale=1.0, bottom=True)
    box((D, "trim", 0), xa, xb, 7.1, 7.45, z - 0.2, z + 0.2, scale=1.0, col=TORII_RED, bottom=True)
    for dx in (-4.2, 0.0, 4.2):
        for yaw in (0.0, math.pi):
            J.slab_sign((-80.0 + dx, 8.32, z + math.cos(yaw) * 0.12), basis(yaw), "ps", 1.7, both=False, depth=0.1)
    box((D, "neon_red", 0), xa - 1.6, xb + 1.6, 9.9, 9.98, z - 0.05, z + 0.05, scale=1.0)
    x = xa + 1.0
    while x < xb - 0.5:
        J.put("lantern", x, 6.5, z, 0.0, 1.9, 1.9)
        x += 1.75
    for x in (-88.0, -80.0, -72.0):
        light(D, x, 0.3, z, "red", 3.0)


STEELWORK = (0.075, 0.08, 0.09, 1)


def pylon(x, z, h):
    """A steel pylon on its block at the kerb's edge."""
    box((D, "dark", 0), x - 0.32, x + 0.32, G0, 0.9, z - 0.32, z + 0.32, scale=1.0)
    box((D, "trim", 0), x - 0.17, x + 0.17, 0.9, h, z - 0.17, z + 0.17, scale=1.0, col=STEELWORK)


def sign_bridge(z, r):
    """A gantry of adverts over the street: two pylons, a truss between
    them, three boards hung on it facing up the street and three down it,
    a tube along its lower chord, cables slung beside it."""
    xa, xb = -90.6, -69.4
    for x in (xa, xb):
        pylon(x, z, 11.5)
    k = (D, "trim", 1)
    for y in (8.2, 11.2):
        for zz in (z - 0.42, z + 0.42):
            box(k, xa, xb, y, y + 0.16, zz - 0.08, zz + 0.08, scale=1.0, col=ESCAPE, bottom=True)
    n = 8
    for i in range(n):
        x0_, x1_ = xa + (xb - xa) * i / n, xa + (xb - xa) * (i + 1) / n
        ya, yb = (8.3, 11.2) if i % 2 == 0 else (11.2, 8.3)
        for zz in (z - 0.42, z + 0.42):
            q = ((x0_, ya, zz), (x1_, yb, zz), (x1_, yb + 0.12, zz), (x0_, ya + 0.12, zz))
            quad(k, *q, col=ESCAPE)
            quad(k, q[1], q[0], q[3], q[2], col=ESCAPE)
    for cx in (-86.7, -80.0, -73.3):
        for yaw, dz in ((0.0, 0.75), (math.pi, -0.75)):
            B.billboard(D, cx, 9.75 + (0.5 if cx == -80.0 else 0.0), z + dz, 5.8, 2.6, yaw, r, back=False, depth=0.2)
    box((D, "neon_cyan", 0), xa, xb, 8.08, 8.16, z - 0.04, z + 0.04, scale=1.0, bottom=True)
    J.span("jt_cable", (xa, z + 1.3), (xb, z + 1.3), 8.0, 1.2)
    J.span("jt_cable", (xa, z - 1.3), (xb, z - 1.9), 11.4, 0.9)
    for x in (-87.0, -80.0, -73.0):
        light(D, x, 0.3, z, r.choice(("cyan", "pink", "amber")), 3.6)


def lantern_arch(z, r):
    """A cable-hung arch of lanterns: two red masts, a cable between their
    heads, three strings of lanterns under it each at its own sag, one
    great lantern at the middle on its rod."""
    xa, xb = -90.6, -69.4
    for x in (xa, xb):
        box((D, "dark", 0), x - 0.3, x + 0.3, G0, 0.9, z - 0.3, z + 0.3, scale=1.0)
        cylinder((D, "trim", 0), x, z, 0.9, 12.4, 0.2, segs=8, col=TORII_RED)
        box((D, "trim", 0), x - 0.5, x + 0.5, 12.4, 12.6, z - 0.5, z + 0.5, scale=1.0, col=(0.06, 0.05, 0.05, 1), bottom=True)
        J.put("lantern", x + (0.75 if x < -80 else -0.75), 10.4, z, 0.0, 2.6, 2.6)
    J.span("jt_cable", (xa, z), (xb, z), 12.3, 1.5)
    for y, drop, dz in ((12.0, 3.0, 0.0), (10.6, 1.9, 0.5), (9.4, 1.2, -0.5)):
        J.string((xa, z + dz), (xb, z + dz), y, drop, 2.4, 1.7)
    J.put("lantern", -80.0, 7.2, z, 0.0, 4.6, 4.6)
    box((D, "metal", 1), -80.03, -79.97, 8.4, 10.2, z - 0.03, z + 0.03, scale=1.0)
    for x in (-88.0, -80.0, -72.0):
        light(D, x, 0.3, z, "red", 3.6)


def tube_arch(z, r):
    """The south threshold: two pylons, a beam, and a board of bent tube
    hung under it, read from both sides."""
    xa, xb = -90.6, -69.4
    for x in (xa, xb):
        pylon(x, z, 10.6)
    box((D, "trim", 0), xa - 0.6, xb + 0.6, 10.0, 10.4, z - 0.22, z + 0.22, scale=1.0, col=STEELWORK, bottom=True)
    J.tube_sign((-80.0, 8.55, z), 0.0, 13.0, 2.3, "pink", r)
    box((D, "neon_amber", 0), xa, xb, 10.4, 10.48, z - 0.04, z + 0.04, scale=1.0)
    for x in (-87.0, -80.0, -73.0):
        light(D, x, 0.3, z, "pink", 3.4)


def sign_tower(x, z, r):
    """The street's landmark, between the sign bridge and the arch: a mast
    on the kerb taller than the roofs round it, blades up it turned every
    way, a ring of lanterns over the pavement, a lit drum at its head and
    a red lamp over that."""
    box((D, "dark", 0), x - 0.36, x + 0.36, G0, 1.0, z - 0.36, z + 0.36, scale=1.0)
    cylinder((D, "trim", 0), x, z, 1.0, 24.0, 0.22, segs=8, col=STEELWORK)
    # Its spine, lit: two tubes up the mast, on the street's side and the wall's.
    for dx in (-0.25, 0.25):
        box((D, "neon_red", 0), x + dx - 0.03, x + dx + 0.03, 5.8, 23.6, z - 0.03, z + 0.03, scale=1.0)
    for i in range(4):
        yaw = 0.5 + i * 1.57
        J.slab_sign((x + math.cos(yaw) * 1.12, 9.2 + i * 3.4, z - math.sin(yaw) * 1.12), basis(yaw), "bl", 1.25)
        box((D, "metal", 1), x - 0.5, x + 0.5, 9.2 + i * 3.4 - 0.04, 9.2 + i * 3.4 + 0.04, z - 0.5, z + 0.5, scale=1.0)
    for i in range(6):
        a = i * math.tau / 6
        J.put("lantern", x + 0.95 * math.cos(a), 4.9, z + 0.95 * math.sin(a), 0.0, 1.7, 1.7)
    box((D, "metal", 1), x - 1.0, x + 1.0, 5.4, 5.46, z - 0.03, z + 0.03, scale=1.0)
    box((D, "metal", 1), x - 0.03, x + 0.03, 5.4, 5.46, z - 1.0, z + 1.0, scale=1.0)
    J.put("ad_drum", x, 24.0, z, 0.0, 1.4, 2.0)
    box((D, "glow", 0), x - 0.14, x + 0.14, 28.3, 28.7, z - 0.14, z + 0.14, scale=1.0, col=GLOW["red"])
    for dz, hue in ((-1.6, "pink"), (1.6, "amber")):
        light(D, x + 0.6, 2.0, z + dz, hue, 4.5)


def skybridge(z, r):
    """A bridge between the street's two sides at the third floor: a lit
    glazed corridor on two piers, an advert along the side the traffic
    comes at, two boards hung under the other, a tube under its floor,
    cable bundles slung beside it."""
    za, zb = z - 1.5, z + 1.5
    shell = (0.07, 0.075, 0.085, 1)
    for x in (-90.6, -69.4):
        box((D, "trim", 0), x - 0.3, x + 0.3, G0, 9.3, z - 0.3, z + 0.3, scale=1.0, col=shell)
    box((D, "trim", 0), XW, XE, 9.3, 9.6, za - 0.12, zb + 0.12, scale=1.0, col=shell, bottom=True)
    box((D, "trim", 0), XW, XE, 12.4, 12.66, za - 0.25, zb + 0.25, scale=1.0, col=shell, bottom=True)
    col = B.wall_col(0.96, 3, 0.85, B.TINTS["charcoal"])
    for f in (B.Face("+z", zb, XW, XE), B.Face("-z", za, XW, XE)):
        B.facade_wall((D, "facade", 0), f, 9.6, 12.4, col, 5.0 - (9.6 - SHOP_H) / CELL_H)
    B.billboard(D, -80.0, 10.95, za - 0.28, 11.0, 2.3, math.pi, r, back=False, depth=0.2)
    for x in (-86.0, -74.0):
        J.slab_sign((x, 8.25, zb - 0.6), basis(0.0), "pm", 1.5)
        box((D, "metal", 1), x - 0.04, x + 0.04, 9.15, 9.3, zb - 0.64, zb - 0.56, scale=1.0)
    box((D, "neon_cyan", 0), XW + 3.6, XE - 3.6, 9.22, 9.3, z - 0.05, z + 0.05, scale=1.0, bottom=True)
    for dz, y, drop in ((-2.1, 9.2, 1.0), (2.2, 12.2, 1.5), (2.5, 9.6, 0.7)):
        J.span("jt_cable", (XW, z + dz), (XE, z + dz + r.uniform(-0.6, 0.6)), y, drop)
    for x in (-87.0, -80.0, -73.0):
        light(D, x, 0.3, z, "cyan", 3.6)


gr = random.Random(7150)
street_gate(GATE_Z, sr)
sign_bridge(SIGNS_Z, gr)
skybridge(BRIDGE_Z, gr)
sign_tower(-90.55, TOWER_Z, gr)
lantern_arch(ARCH_Z, gr)
tube_arch(SOUTH_Z, gr)

# The mouths of the cross alleys and the east passages: a frame and a board.
for a, b in ALLEYS:
    gate(XW - 0.3, a, b, HALF_PI, sr)
for a, b in PASSAGES:
    gate(XE + 0.3, a, b, -HALF_PI, sr, h=4.5)

# ---------------------------------------------------------------------------
# The lantern alley: strings every few metres, stalls and stools, cables,
# a blossom tree where each cross alley meets it; its covered stretch.
# ---------------------------------------------------------------------------
nr = random.Random(7300)
z = ZN + 3.0
while z < ZS - 2.0:
    ha, hb = height_at("A", z), height_at("B", z)
    if ha is not None and hb is not None:
        covered = MARKET[0] < z < MARKET[1]
        kind = nr.random()
        if kind < 0.5:
            J.string((NAKA[0], z), (NAKA[1], z + nr.uniform(-1.0, 1.0)), nr.uniform(4.9, 5.5), 0.5, 1.2)
            light(D, -113.0, 0.3, z, "red", 2.2)
        elif kind < 0.75 and not covered:
            J.span("jt_cable", (NAKA[0], z), (NAKA[1], z + nr.uniform(-3.0, 3.0)), nr.uniform(5.8, min(ha, hb) - 0.4), 0.5)
        else:
            J.span("jt_festoon", (NAKA[0], z), (NAKA[1], z + nr.uniform(-1.0, 1.0)), nr.uniform(4.8, 5.4), 0.9)
            light(D, -113.0, 0.3, z, "amber", 2.2)
    z += nr.uniform(3.0, 5.0)
z = ZN + 8.0
k = 0
while z < ZS - 6.0:
    if clear_of(z, ALLEYS + [TORII], 3.0):
        west = k % 2 == 0
        x = NAKA[0] + 0.95 if west else NAKA[1] - 0.95
        stall(x, z, HALF_PI if west else -HALF_PI, nr)
        stools(x + (0.3 if west else -0.3), z + nr.choice((-2.3, 2.3)), nr.uniform(0, 6.28), nr)
        if k % 6 == 2:
            steam(x, z + 0.9, 1.1)
        k += 1
    z += nr.uniform(7.0, 11.0)
for a, b in ALLEYS:
    zc = (a + b) / 2
    J.put("planter_tree", -113.0, G0, zc, nr.uniform(0, 6.28))
    J.put("lamp_short", -111.2, G0, zc + 1.9)
    bench(-114.6, zc - 1.8, 0.0, nr)
    stand(-112.2, zc + 0.9, nr.uniform(0, 6.28), nr.choice(("idle", "phone", "smoke")), G0)
    light(D, -113.0, 3.0, zc, "pink", 3.0)
    # Across each cross alley, cables and a string; a machine and bags in it.
    for xa, xb in (ROW_A, ROW_B):
        J.span("jt_cable", ((xa + xb) / 2 + 2.0, a), ((xa + xb) / 2 - 2.0, b), nr.uniform(5.5, 7.2), 0.4)
        J.string(((xa + xb) / 2 - 3.0, a), ((xa + xb) / 2 - 3.5, b), 4.6, 0.45, 1.25)
        J.put("jt_scooter", (xa + xb) / 2 - 5.0, G0, b - 1.6, HALF_PI + nr.uniform(-0.2, 0.2))
        nr.uniform(-1.0, 2.5), nr.choice(("lean", "smoke", "squat", "phone"))   # (the stream as it ran)
    # White hatching on the slabs at its mouth (KvMY1uzSC1E@94).
    for i in range(5):
        x = XW - 1.0 - i * 0.55
        quad((D, "paint", 0), (x - 0.3, G0 + 0.03, b - 0.4), (x - 0.05, G0 + 0.03, b - 0.4), (x + 0.75, G0 + 0.03, a + 0.4), (x + 0.5, G0 + 0.03, a + 0.4), col=WHITE)


def market(z0, z1):
    """The covered market: a glazed gable over the alley from eave to eave,
    a lit ridge, ribs, lanterns in two rows under it, a truss and a board at
    each end."""
    xa, xb, xm, ye, yr = NAKA[0], NAKA[1], -113.0, 6.4, 8.1
    for x_e, s in ((xa, 1), (xb, -1)):
        q = ((x_e, ye, z1), (xm - 0.4 * s, yr, z1), (xm - 0.4 * s, yr, z0), (x_e, ye, z0))
        up = q if s > 0 else (q[1], q[0], q[3], q[2])
        quad((D, "clearglass", 0), *up)
    box((D, "neon_amber", 0), xm - 0.4, xm + 0.4, yr - 0.05, yr + 0.03, z0, z1, scale=1.0, bottom=True)
    z = z0
    while z <= z1 + 0.01:
        for s in (1, -1):
            b = basis(0.0, math.atan2(yr - ye, 2.6) * s)
            obox((D, "metal", 1), (xm - 1.7 * s, (ye + yr) / 2 + 0.05, z), b, 3.2, 0.16, 0.16, bottom=True)
        z += 4.0
    for z, yaw in ((z0, math.pi), (z1, 0.0)):
        box((D, "trim", 0), xa, xb, ye - 0.5, ye, z - 0.15, z + 0.15, scale=1.0, col=TORII_RED, bottom=True)
        poly((D, "trim", 0), [(xa, ye, z), (xb, ye, z), (xm, yr + 0.2, z)] if yaw == 0.0 else [(xb, ye, z), (xa, ye, z), (xm, yr + 0.2, z)],
             [(0, 0), (1, 0), (0.5, 1)], (0.1, 0.07, 0.07, 1))
        J.slab_sign((xm, ye - 1.05, z + math.cos(yaw) * 0.2), basis(yaw), "pm", 1.3, both=False)
        box((D, "neon_red", 0), xa + 0.2, xb - 0.2, ye - 0.58, ye - 0.5, z - 0.04, z + 0.04, scale=1.0, bottom=True)
    z = z0 + 1.5
    while z < z1 - 1.0:
        for x in (xm - 1.6, xm + 1.6):
            J.put("lantern", x, 6.78, z, 0.0, 1.3, 1.3)
        z += 2.4


market(MARKET[0] + 0.3, MARKET[1] - 0.3)

# ---------------------------------------------------------------------------
# The gate street, on the plaza street's line: a red gate at its mouth, a
# street of stalls under strings of lanterns, blossom trees down its middle
# (KvMY1uzSC1E@94), a raised walk with a rail and a cyan strip under its
# lip, and at its far end a board on legs against the far city.
# ---------------------------------------------------------------------------
tr = random.Random(7400)
ta, tb = TORII
tc = (ta + tb) / 2
gx = XW - 1.2
for z in (ta + 0.75, tb - 0.75):
    cylinder((D, "trim", 0), gx, z, G0, 7.3, 0.32, segs=10, col=TORII_RED)
    cylinder((D, "dark", 0), gx, z, G0, 0.8, 0.4, segs=10)
    J.put("lantern", gx, 5.2, z + (1.1 if z < tc else -1.1), 0.0, 2.3, 2.3)
box((D, "trim", 0), gx - 0.35, gx + 0.35, 7.3, 7.9, ta + 0.05, tb - 0.05, scale=1.0, col=TORII_RED, bottom=True)
box((D, "dark", 0), gx - 0.45, gx + 0.45, 7.9, 8.05, ta + 0.02, tb - 0.02, scale=1.0, bottom=True)
box((D, "trim", 0), gx - 0.2, gx + 0.2, 5.9, 6.25, ta + 0.75, tb - 0.75, scale=1.0, col=TORII_RED, bottom=True)
box((D, "trim", 0), gx - 0.12, gx + 0.12, 6.25, 7.3, tc - 0.75, tc + 0.75, scale=1.0, col=(0.06, 0.05, 0.05, 1))
for yaw in (HALF_PI, -HALF_PI):
    J.slab_sign((gx + math.sin(yaw) * 0.14, 6.78, tc), basis(yaw), "bx", 0.8, both=False, depth=0.04)
box((D, "neon_red", 0), gx + 0.36, gx + 0.42, 7.3, 7.38, ta + 0.3, tb - 0.3, scale=1.0, bottom=True)
light(D, gx + 2.0, 0.3, tc, "red", 4.0)
x = XW - 4.0
k = 0
while x > EDGE[1] + 6.0:
    in_lane = NAKA[0] - 1 < x < NAKA[1] + 1 or BACK[0] - 1 < x < BACK[1] + 1
    J.string((x, ta), (x + tr.uniform(-0.8, 0.8), tb), tr.uniform(5.4, 6.3), 0.75, 1.45, 1.2)
    light(D, x, 0.3, tc, "red", 2.4)
    if not in_lane:
        south = k % 2 == 0
        stall(x - 2.2, tb - 1.0 if south else ta + 1.0, math.pi if south else 0.0, tr)
        stools(x - 4.6, tb - 1.3 if south else ta + 1.3, tr.uniform(0, 6.28), tr)
        if k % 3 == 1:
            J.put("planter_tree", x - 4.4, G0, tc + tr.uniform(-0.6, 0.6), tr.uniform(0, 6.28))
            light(D, x - 4.4, 3.0, tc, "pink", 3.0)
        if k % 4 == 2:
            steam(x - 2.2, (tb - 1.6 if south else ta + 1.6), 1.1)
    k += 1
    x -= tr.uniform(4.6, 6.2)
# The raised walk along row B's north side of it.
wa, wb = ROW_B[0] + 1.0, ROW_B[1] - 1.0
box((D, "concrete", 0), wa, wb, G0, G0 + 0.6, ta, ta + 2.2, scale=3.0)
box((D, "neon_cyan", 0), wa + 0.2, wb - 0.2, G0 + 0.48, G0 + 0.54, ta + 2.2, ta + 2.26, scale=1.0, bottom=True)
J.rail_run((wa, ta + 2.1), (wb, ta + 2.1), G0 + 0.6)
for xx in (wa - 0.35, wb + 0.35):
    box((D, "concrete", 1), xx - 0.35, xx + 0.35, G0, G0 + 0.3, ta, ta + 2.2, scale=3.0)
light(D, (wa + wb) / 2, 0.5, ta + 2.8, "cyan", 3.0)
for xx in (wa + 2.5, wa + 3.4, wa + 9.0, wb - 4.0):
    stand(xx, ta + 1.75, tr.uniform(-0.3, 0.3), tr.choice(("idle", "lean", "phone", "smoke")), G0 + 0.6)
stand(wb + 0.35, ta + 1.0, HALF_PI, "sit", G0 + 0.3)
# Under the gate: two talking by a post, one waiting.
stand(gx - 0.9, ta + 1.5, 0.3, "talk", G0)
stand(gx - 0.7, ta + 2.4, math.pi + 0.3, "talk", G0)
stand(gx - 1.0, tb - 1.3, HALF_PI, "phone", G0)
# The board that closes it, on legs over the edge strip.
bx = EDGE[0] + 1.6
B.billboard(D, bx, 9.6, tc, 9.0, 4.8, HALF_PI, tr)
J.tube_sign((bx, 13.4, tc), HALF_PI, 6.4, 2.0, "red", tr)
for z in (tc - 3.6, tc + 3.6):
    box((D, "metal", 0), bx - 0.5, bx - 0.2, G0, 14.4, z - 0.15, z + 0.15, scale=1.0)

# (The lanes' columns, strings and stalls are set down before their walls are dressed: see LANES.)
steam(-47.0, -520.0)
steam(-47.0, -300.0)
steam(-140.0, -350.0)
steam(-140.0, -600.0)

# ---------------------------------------------------------------------------
# The block that closes the west street's south end, across the south
# street: taller than its neighbours, a tall sign up its middle and a board
# over its roof, turned to the street it ends.
# ---------------------------------------------------------------------------
cr = random.Random(7600)
CLOSE = [(-94.0, -85.0, 6), (-85.0, -75.0, 8), (-75.0, -66.0, 5)]
keep = B.billboard
B.billboard = _quiet_billboard
for i, (xa, xb, n) in enumerate(CLOSE):
    sides = {"-z": "street", "+z": "open", "-x": "open" if i == 0 else "party", "+x": "party"}
    nb = {}
    if i > 0:
        nb["-x"] = storeys(CLOSE[i - 1][2])
    nb["+x"] = storeys(CLOSE[i + 1][2]) if i < len(CLOSE) - 1 else 0.0
    r = random.Random(7610 + i)
    tint = r.choice(STYLE["tints"])
    lot = B.Lot(xa, xb, ZS, 42.0, "-z", sides, nb, D)
    h = storeys(n)
    tiers = B.building(lot, h, r, style=STYLE, signs=False, roof=False, tint=tint)
    f = B.faces_of(xa, xb, ZS, 42.0)["-z"]
    # Each of the three fronts lit its own way.
    if i == 0:
        J.lantern_row(f, 0.5, f.width - 0.5, 3.15, 0.6, 1.5)
    elif i == 1:
        J.lantern_row(f, 0.8, f.width - 0.8, 2.85, 0.6, 2.8, sy=1.5, sxz=1.5)
    else:
        pa, pb = f.p(f.at(0.4), 0.0, 0.5), f.p(f.at(f.width - 0.4), 0.0, 0.5)
        J.span("jt_festoon", (pa[0], pa[2]), (pb[0], pb[2]), 3.5, 0.35)
    signs_on(f, h, r, 1.2)
    by_wall(f, r)
    parapet(xa, xb, ZS, 42.0, h, B.TRIM[B.TINTS[tint]])
    B.ROOFS.append((D, xa, xb, ZS, 42.0, h))
    hut((xa + xb) / 2, 34.0, h, B.TRIM[B.TINTS[tint]], r)
    J.put("tank_roof", (xa + xb) / 2, h, 26.0, r.uniform(0, 6.28))
    if i != 1:
        roof_sign((xa + xb) / 2, ZS + 1.4, h, math.pi + (0.3 if i == 0 else -0.3), r, xb - xa)
B.billboard = keep
f = B.faces_of(-85.0, -75.0, ZS, 42.0)["-z"]
J.blade(f, 5.0, 17.0, "bl", k=3.2, gap=0.5)
B.billboard(D, -80.0, storeys(8) + 4.6, ZS + 1.5, 9.4, 5.0, math.pi, cr)
for x in (-83.6, -76.4):
    box((D, "metal", 0), x - 0.12, x + 0.12, storeys(8), storeys(8) + 2.1, ZS + 1.6, ZS + 1.84, scale=1.0)
B.ground_rect(D, -94.0, -66.0, 8.0, ZS)

# ---------------------------------------------------------------------------
# A check: east of x -60 no bake source above 7.5 m (the module's note).
# ---------------------------------------------------------------------------
_bad = 0
for (dist, mat, _), b in batches.items():
    if dist != D or not (mat.startswith("neon_") or mat in ("sign", "shop", "billboard", "lantern", "lobby")):
        continue
    for fc in b.faces:
        vs = [b.verts[i] for i in fc]
        cx = sum(v[0] for v in vs) / len(vs)
        cy = sum(v[2] for v in vs) / len(vs)
        if cx > -60.0 and cy > 7.5:
            _bad += 1
print("japantown lucy:", LUCY)
print("japantown decks:", [(rc["row"], round(rc["lot"].z0), round(rc["lot"].z1), rc["h"]) for rc in LOTS if rc.get("roof") == "deck" and rc["row"] in "AE"][:14])
print(f"japantown: {len(LIGHTS.get(D, [])) // 5} lights, {len(STREET_SIGN_IDS)} sign ids so far in the city")
print(f"japantown: {len(LOTS)} lots, {sum(1 for i in P.INSTANCES if i[7] == D)} props, {len(PEOPLE)} people so far in the city, bake sources east of x -60 over 7.5 m: {_bad}")
_t = {}
for (dist, mat, det), b in batches.items():
    if dist == D:
        _t[(mat, det)] = sum(len(fc) - 2 for fc in b.faces)
_p = {}
for i in P.INSTANCES:
    if i[7] == D:
        _p[i[0]] = _p.get(i[0], 0) + 1
print("japantown tris:", sum(_t.values()), "phone:", sum(v for (m, d), v in _t.items() if not d), sorted(_t.items(), key=lambda kv: -kv[1]))
print("japantown props:", sorted(_p.items(), key=lambda kv: -kv[1]))
