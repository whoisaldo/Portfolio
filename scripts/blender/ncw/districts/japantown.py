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
        for j, (a, b) in enumerate(spans):
            sides = {front: "street", back_name: back, "-z": klo if j == 0 else "party", "+z": khi if j == len(spans) - 1 else "party"}
            nb = {}
            if j > 0:
                nb["-z"] = hs[j - 1]
            if j < len(spans) - 1:
                nb["+z"] = hs[j + 1]
            r = random.Random(seed * 1000 + len(LOTS))
            tint = r.choice(style["tints"])
            lot = B.Lot(xs[0], xs[1], a, b, front, sides, nb, D)
            tiers = B.building(lot, hs[j], r, style=style, signs=False, roof=False, tint=tint, ground=ground)
            LOTS.append(dict(row=tag, lot=lot, h=hs[j], tiers=tiers, r=r, tint=B.TINTS[tint], front=front, back=back_name,
                             sides=dict(sides)))
    B.billboard = keep


def height_at(row, z):
    for rec in LOTS:
        if rec["row"] == row and rec["lot"].z0 <= z <= rec["lot"].z1:
            return rec["h"]
    return None


def face(rec, name):
    lot = rec["lot"]
    return B.faces_of(lot.x0, lot.x1, lot.z0, lot.z1)[name]


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
    if r.random() < (0.8 if alley else 0.62 if level == "street" else 0.35):
        if r.random() < 0.7:
            J.lantern_row(f, 0.5, w - 0.5, 3.0, 0.6, r.choice((1.2, 1.4, 1.7)))
        else:
            J.lantern_row(f, 0.7, w - 0.7, 2.85, 0.6, 2.2, sy=1.5, sxz=1.5)
    for _ in range(r.randrange(0, 3) if level != "edge" else r.randrange(0, 2)):
        if w > 3.4:
            s = r.uniform(0.4, w - 2.2)
            noren(f, s, s + r.uniform(1.2, 1.8), r)
    signs_on(f, h, r, density={"street": 1.0, "alley": 0.5, "edge": 0.45}[level], small=alley, big=not alley, cap=cap)
    by_wall(f, r, alley, {"street": 0.4, "alley": 0.26, "edge": 0.08}[level])


def lane_face(rec, name, cap=None):
    """A back on a lane, which is dark but never black: a pool of light
    every few metres in the colours of the doors' tubes, small signs for the
    bars that open onto it, lanterns on some, a tube over a door, and
    whoever is out the back."""
    r, h = rec["r"], rec["h"]
    f = face(rec, name)
    w = f.width
    s = r.uniform(0.8, 2.6)
    while s < w - 0.4:
        light(D, *f.p(f.at(s), 2.8, 1.3), r.choice(("amber", "amber", "amber", "pink", "cyan", "green", "red")), 5.0)
        s += r.uniform(5.0, 8.0)
    if r.random() < 0.3:
        J.lantern_row(f, 0.6, w - 0.6, 3.0, 0.45, 1.5)
    if r.random() < 0.55 and w > 4.0:
        s = r.uniform(0.5, w - 3.0)
        strip(f, r.choice(NEONS), s, s + r.uniform(1.6, 2.6), 3.3, 3.38, 0.08)
    if r.random() < 0.45 and w > 6.0:
        # Lit advert panels pasted in a row at head height.
        s = r.uniform(0.6, w - 4.2)
        for i in range(r.randrange(2, 6)):
            f.quad((D, "billboard", 0), s + i * 0.72, s + i * 0.72 + 0.62, 1.25, 2.15, 0.03,
                   col=(r.randrange(8) / 8.0 + 0.01, r.randrange(8) / 8.0 + 0.01, r.random(), 1.0))
    signs_on(f, h, r, density=0.25, small=True, big=False, cap=cap)
    by_wall(f, r, alley=True, people=0.14)


def flush_shops(f, r):
    """A ground floor of shop windows in a dark wall, the glass a hair proud
    of it: a tube over each or an awning, a shutter down now and then."""
    w = f.width
    bays = max(1, round(w / CELL_W))
    bw = w / bays
    i = 0
    while i < bays:
        n = min(r.choice((1, 2, 2, 3)), bays - i)
        a, b = i * bw + 0.3, (i + n) * bw - 0.3
        if r.random() < 0.86:
            f.quad((D, "shop", 0), a, b, 0.55, 3.3, 0.07, col=(r.uniform(0.4, 1.0), r.random(), 1.0 if r.random() < 0.92 else 0.0, 1.0))
            colour = r.choice(STYLE["shop_colours"])
            if r.random() < 0.5:
                B.awning(D, f, a, b, colour)
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


def skylight(x, z, top, r, w=1.3, d=2.3):
    """A roof light: a kerbed pane lit from the room under it, and its glow
    on the roof round it."""
    c = r.choice(("amber", "amber", "cyan", "white", "pink"))
    box((D, "trim", 1), x - w / 2 - 0.1, x + w / 2 + 0.1, top, top + 0.3, z - d / 2 - 0.1, z + d / 2 + 0.1, scale=1.0, col=(0.1, 0.1, 0.11, 1))
    quad((D, "glow", 0), (x - w / 2, top + 0.37, z + d / 2), (x + w / 2, top + 0.37, z + d / 2), (x + w / 2, top + 0.37, z - d / 2), (x - w / 2, top + 0.37, z - d / 2),
         col=tuple(v * 0.55 for v in GLOW[c][:3]) + (1,))
    light(D, x, top + 0.5, z, c, 4.5)


def hut(x, z, y, col, r, door=None):
    """A stair hut, its door lit."""
    box((D, "trim", 0), x - 1.0, x + 1.0, y, y + 2.3, z - 1.1, z + 1.1, scale=1.5, col=col)
    box((D, "dark", 1), x - 1.1, x + 1.1, y + 2.3, y + 2.4, z - 1.2, z + 1.2, scale=1.0)
    side = door if door is not None else r.choice((-1, 1))
    dx = x + side * 1.02
    q = ((dx, y, z + 0.45), (dx, y, z - 0.45), (dx, y + 2.0, z - 0.45), (dx, y + 2.0, z + 0.45))
    quad((D, "glow", 0), *(q if side > 0 else (q[1], q[0], q[3], q[2])), col=GLOW["amber"])
    light(D, x + side * 1.8, y + 1.0, z, "amber", 4.5)
    if r.random() < 0.3:
        stand(x + side * 1.5, z + r.uniform(-0.8, 0.8), r.uniform(0, 6.28), r.choice(("smoke", "phone", "squat")), y)


def roof_deck(x0, x1, z0, z1, top, r, front, tcol):
    """Lucy's roof (D6ia1wjO7sg@220): a concrete deck inside rails of thick
    posts, a raised terrace at the back up two steps with a glass rail lit
    along its top, planters on it, two lamps on long arms throwing cyan
    pools straight down, a viewer at the rail over the street, a bench, the
    stair hut, a heap of bags."""
    w, d = x1 - x0, z1 - z0
    sgn = 1 if front == "+x" else -1
    xb = x0 if sgn > 0 else x1                      # the back edge
    X = lambda u: xb + sgn * u                      # noqa: E731 (u metres from the back toward the street)
    y = top + 0.1
    # The deck itself is one teal shadow (the frame's own tone), which the
    # lamps' pools are painted into.
    quad((D, "glow", 0), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0), col=J.DECK_TEAL)
    parapet(x0, x1, z0, z1, top, tcol, h=0.25, t=0.2)
    for a, b in (((x0 + 0.1, z0 + 0.1), (x1 - 0.1, z0 + 0.1)), ((x1 - 0.1, z0 + 0.1), (x1 - 0.1, z1 - 0.1)),
                 ((x1 - 0.1, z1 - 0.1), (x0 + 0.1, z1 - 0.1)), ((x0 + 0.1, z1 - 0.1), (x0 + 0.1, z0 + 0.1))):
        J.rail_run(a, b, top + 0.25)
    tu = min(5.5, w * 0.36)
    xa, xc = sorted((X(0.3), X(tu)))
    box((D, "concrete", 0), xa, xc, top, top + 0.9, z0 + 0.3, z1 - 0.3, scale=3.0)
    for i, hh in enumerate((0.6, 0.3)):
        sa, sb = sorted((X(tu + 0.35 * i), X(tu + 0.35 * (i + 1))))
        box((D, "concrete", 1), sa, sb, top, top + hh, z0 + 0.5, z0 + 1.9, scale=3.0)
    gx = X(tu - 0.12)
    ga, gb = (gx, top + 0.9, z0 + 2.1), (gx, top + 0.9, z1 - 0.4)
    quad((D, "glass_dark", 1), ga, gb, (gb[0], top + 1.9, gb[2]), (ga[0], top + 1.9, ga[2]))
    quad((D, "glass_dark", 1), gb, ga, (ga[0], top + 1.9, ga[2]), (gb[0], top + 1.9, gb[2]))
    key, col = lit("cyan", gx)
    box(key, gx - 0.03, gx + 0.03, top + 1.9, top + 1.95, z0 + 2.1, z1 - 0.4, scale=1.0, col=col, bottom=True)
    for t in (0.3, 0.75):
        J.put("jt_planter", X(1.3), top + 0.9, z0 + d * t, r.uniform(0, 1.5))
    hut(X(1.6), z1 - 1.7, top + 0.9, tcol, r, door=sgn)
    # The lamps: one by each side, their arms in over the deck.
    for u, z, yaw, dz in ((tu + 1.6, z0 + 0.7, 0.0, 2.1), (w - 2.6, z1 - 0.7, math.pi, -2.1)):
        if u < w - 1.0 and d > 5.0:
            J.lamp_arm(X(u), top + 0.1, z, yaw)
            light(D, X(u), top + 5.0, z + dz, "cyan", 8.0)
            J.pool(X(u), top + 0.17, z + dz, min(3.4, d * 0.42))
    zv = (z0 + z1) / 2 + r.uniform(-1.0, 1.0)
    J.viewer(X(w - 0.75), top + 0.1, zv, HALF_PI * sgn)
    bench(X(w - 2.6), zv + r.choice((-1.6, 1.6)), -HALF_PI * sgn, r, top + 0.1)
    J.put("bags", X(tu + 0.9), top + 0.1, z1 - 0.9, r.uniform(0, 6.28))
    # Who is up here: somebody at the rail over the street, somebody sat on
    # the terrace's steps, two talking under a lamp.
    if r.random() < 0.8:
        stand(X(w - 0.7), zv + r.choice((-1.1, 1.1)), HALF_PI * sgn + r.uniform(-0.3, 0.3), r.choice(("idle", "smoke", "phone")), top + 0.1)
    if r.random() < 0.5:
        stand(X(w - 0.75), z0 + 1.0, -HALF_PI * sgn, "lean", top + 0.1)
    if r.random() < 0.6:
        stand(X(tu + 0.2), z0 + 1.2, HALF_PI * sgn, "sit", top + 0.6)
    if r.random() < 0.5 and d > 5.0:
        stand(X(tu + 2.3), z0 + 2.4, 0.0, "talk", top + 0.1)
        stand(X(tu + 2.3), z0 + 3.3, math.pi, "talk", top + 0.1)
    if d > 7.0:
        J.put("jt_planter", X(w - 1.2), top + 0.1, z0 + 1.2)
        J.put("ac_roof", X(tu + 2.6), top + 0.1, z1 - 1.0)


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
        B.billboard(D, c[0], c[1], c[2], sw, sh, yaw, r)
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


def roof(rec, weights):
    r = rec["r"]
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
    rec["roof"] = kind
    if kind == "deck":
        roof_deck(x0, x1, z0, z1, top, r, front, tcol)
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
    if kind == "shack":
        n = 2 if d * w > 150 and r.random() < 0.6 else 1
        for i in range(n):
            u = r.uniform(3.2, w * 0.5) if i == 0 else r.uniform(w * 0.55, w - 3.6)
            yaw = r.choice((0.0, math.pi)) if d < 7.5 else r.choice((0.0, HALF_PI, math.pi, -HALF_PI))
            J.put("jt_shack", X(u), top, mid + r.uniform(-0.4, 0.4) * max(0.0, d - 5.6), yaw + r.uniform(-0.12, 0.12), r.uniform(0.9, 1.25), r.uniform(0.85, min(1.2, (d - 0.8) / 4.2)))
        if d >= 5.6 and r.random() < 0.5:
            J.put("tank_roof", X(w - 2.6), top, mid + r.uniform(-0.3, 0.3) * (d - 4.0), r.uniform(0, 6.28), r.uniform(0.8, 1.1), min(1.0, (d - 1.2) / 3.4))
        J.put("jt_laundry", X(w * 0.5 + r.uniform(-1.5, 1.5)), top, z0 + 0.9 if r.random() < 0.5 else z1 - 0.9, r.uniform(-0.1, 0.1))
        J.put("ac_roof", X(r.uniform(1.2, w - 1.2)), top, r.choice((z0 + 1.0, z1 - 1.0)))
        J.put("jt_plants", X(r.uniform(2.0, w - 2.0)), top, mid + r.uniform(-1.0, 1.0), r.uniform(0, 3))
        # A slab somebody laid by the shack, its window's light on it, and
        # whoever lives up here.
        us = r.uniform(3.2, w - 4.5)
        xa_, xb_ = sorted((X(us), X(us + 3.4)))
        quad((D, "concrete", 0), (xa_, top + 0.1, z1 - 0.5), (xb_, top + 0.1, z1 - 0.5), (xb_, top + 0.1, z0 + 0.5), (xa_, top + 0.1, z0 + 0.5),
             ((0, 0), (1.1, 0), (1.1, d / 3), (0, d / 3)))
        light(D, X(us + 1.7), top + 1.0, mid, r.choice(("amber", "amber", "pink", "cyan")), 5.0)
        if r.random() < 0.7:
            stand(X(us + 1.7) + r.uniform(-1, 1), mid + r.uniform(-1.0, 1.0), r.uniform(0, 6.28), r.choice(("smoke", "squat", "phone", "idle")), top + 0.04)
        if d > 7.0:
            skylight(X(w - 5.0), mid + r.choice((-1, 1)) * (d / 2 - 1.8), top, r)
    elif kind == "plant":
        n = r.randrange(2, 5)
        u0 = r.uniform(1.5, max(1.6, w - n * 1.8 - 1.0))
        zz = r.choice((z0 + 1.2, z1 - 1.2))
        for i in range(n):
            if u0 + i * 1.8 < w - 1.0:
                J.put("ac_roof", X(u0 + i * 1.8), top, zz)
        da, db = sorted((X(u0 - 0.5), X(min(w - 1.0, u0 + n * 1.8))))
        dz_ = zz + (1.2 if zz < mid else -1.2)
        box((D, "metal", 1), da, db, top + 0.25, top + 0.75, dz_ - 0.25, dz_ + 0.25, scale=1.0)
        box((D, "metal", 1), da, da + 0.6, top, top + 1.5, dz_ - 0.3, dz_ + 0.3, scale=1.0)
        hut(X(w - 2.0), mid + r.uniform(-0.2, 0.2) * max(0.0, d - 3.4), top, tcol, r)
        if d >= 5.6 and r.random() < 0.35:
            J.put("tank_roof", X(w * 0.5), top, mid, 0.0, 1.0, min(1.0, (d - 1.2) / 3.4))
        J.put("antenna" if r.random() < 0.6 else "dish", X(r.uniform(1.5, 3.0)), top, mid + r.uniform(-1.0, 1.0), r.uniform(0, 3.1), r.uniform(0.7, 1.3))
        for t in ((0.3, 0.62) if w > 18 else (0.4,)):
            skylight(X(w * t), mid + (dz_ - zz) * 0.75, top, r, 2.3, 1.2)
    elif kind == "sign":
        roof_sign(X(w - 1.3), mid, top, out_yaw + r.choice((-1, 1)) * r.uniform(0.15, 0.7), r, d)
        hut(X(r.uniform(2.5, w * 0.5)), mid + r.uniform(-0.2, 0.2) * max(0.0, d - 3.4), top, tcol, r)
        J.put("ac_roof", X(w * 0.6), top, r.choice((z0 + 1.0, z1 - 1.0)))
        if r.random() < 0.5:
            J.put("antenna", X(1.5), top, mid, 0.0, r.uniform(0.7, 1.2))
        skylight(X(w * 0.72), mid + r.uniform(-0.2, 0.2) * max(0.0, d - 3.0), top, r)
        light(D, X(w - 2.2), top + 1.0, mid, r.choice(("pink", "magenta", "red", "amber")), 5.5)
    else:  # a roof garden: festoons on four posts, stools, a cart, planters
        ua, ub = max(1.0, w * 0.5 - 4.5), min(w - 1.0, w * 0.5 + 4.5)
        posts = [(X(ua), z0 + 0.8), (X(ub), z0 + 0.8), (X(ub), z1 - 0.8), (X(ua), z1 - 0.8)]
        for px, pz in posts:
            box((D, "metal", 1), px - 0.05, px + 0.05, top, top + 2.9, pz - 0.05, pz + 0.05, scale=0.5)
        for a, b in ((posts[0], posts[1]), (posts[2], posts[3]), (posts[0], posts[2])):
            J.span("jt_festoon", a, b, top + 2.85, 0.5)
        xa_, xb_ = sorted((X(ua - 0.6), X(ub + 0.6)))
        quad((D, "sidewalk", 0), (xa_, top + 0.1, z1 - 0.4), (xb_, top + 0.1, z1 - 0.4), (xb_, top + 0.1, z0 + 0.4), (xa_, top + 0.1, z0 + 0.4),
             ((0, 0), ((xb_ - xa_) / 2, 0), ((xb_ - xa_) / 2, d / 2), (0, d / 2)))
        for t in (0.25, 0.75):
            light(D, X(ua + (ub - ua) * t), top + 2.0, mid, "amber", 5.0)
        stall(X(ua + 1.2), mid, out_yaw, r, top + 0.04, cart=True)
        for t in (0.45, 0.68, 0.9):
            stools(X(ua + (ub - ua) * t), mid + r.uniform(-0.6, 0.6), r.uniform(0, 6.28), r, top + 0.04)
        J.put("jt_planter", X(ub - 0.2), top, z0 + 1.2)
        J.put("jt_planter", X(ua + 0.2), top, z1 - 1.2)
        hut(X(w - 2.0), mid, top, tcol, r)


# ---------------------------------------------------------------------------
# The rows.
# ---------------------------------------------------------------------------
W_NARROW = (5.6, 6.4, 7.2, 8.0, 9.6, 11.2)
cuts_w = [(a, b, "open") for a, b in ALLEYS] + [(TORII[0], TORII[1], "street")]
cuts_c = [(a, b, "open") for a, b in (ALLEYS[1], ALLEYS[3], ALLEYS[7])] + [(TORII[0], TORII[1], "street")]
cuts_e = [(a, b, "open") for a, b in PASSAGES] + [(-190.0, -168.0, "street"), (-88.0, -72.0, "open")]

build_row("E", ROW_E, "-x", "back", segments(-708.0, -10.0, cuts_e, "street", "street"), 811, W_NARROW,
          ((2, 3), (3, 4), (4, 3), (5, 2)), STYLE, quiet=True)
build_row("A", ROW_A, "+x", "street", segments(ZN, ZS, cuts_w), 812, W_NARROW,
          ((2, 3), (3, 4), (4, 3), (5, 2), (6, 1)), STYLE)
build_row("B", ROW_B, "+x", "back", segments(ZN, ZS, cuts_w), 813, (8.0, 9.6, 11.2, 12.8, 14.4),
          ((3, 3), (4, 3), (5, 3), (6, 2)), STYLE_B)
build_row("C", ROW_C, "-x", "back", segments(ZN, ZS, cuts_c), 814, (12.8, 16.0, 19.2, 22.4),
          ((5, 2), (6, 3), (7, 3), (8, 2), (9, 1)), STYLE_C, ground="blank")

ROOFS_W = {"E": (("deck", 4), ("shack", 5), ("plant", 3), ("sign", 5), ("garden", 3)),
           "A": (("deck", 4), ("shack", 5), ("plant", 3), ("sign", 5), ("garden", 3)),
           "B": (("deck", 3), ("shack", 7), ("plant", 5), ("sign", 2), ("garden", 3)),
           "C": (("deck", 2), ("shack", 3), ("plant", 6), ("sign", 8), ("garden", 1))}
for rec in LOTS:
    row = rec["row"]
    if row == "C":
        for name in [rec["front"]] + [n for n in ("-z", "+z") if rec["sides"][n] == "street"]:
            flush_shops(face(rec, name), rec["r"])
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
B.ground_rect(D, ROW_E[0], ROW_E[1], -88.0, -72.0)

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
        J.put("jt_lantern", x, h - 0.46, z + (0.5 if z < zc else -0.5), 0.0, 1.5, 1.5)
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
    if kind == "jt_cable":
        zb = z + sr.uniform(-7.0, 7.0)
        if height_at("E", zb) is None:
            continue
        J.span(kind, (XW, z), (XE, zb), min(hw, height_at("E", zb)) - sr.uniform(0.5, 2.5), sr.uniform(0.8, 1.6))
    else:
        J.span(kind, (XW, z), (XE, zb), y, 2.2 if kind == "jt_string" else 1.8)
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
        if clear_of(z, [DECK]) and not (x > -80 and -192.0 < z < -166.0):
            J.put("lamp_short", x, G0, z)
            if prev is not None and z - prev < 13.0:
                J.span("jt_string_s", (x, prev), (x, z), 4.3, 1.5, unit=5.0)
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
    if clear_of(z, [DECK], 4.0) and not (side > 0 and -194.0 < z < -164.0):
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
        if clear_of(z, [DECK], 3.0) and not (side < 0 and -194.0 < z < -164.0):
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
        J.put("jt_lantern", x, 6.5, z, 0.0, 1.9, 1.9)
        x += 1.75
    for x in (-88.0, -80.0, -72.0):
        light(D, x, 0.3, z, "red", 3.0)


for gz in (-696.0, -444.0, -276.0, -26.0):
    street_gate(gz, sr)

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
            J.span("jt_string_s", (NAKA[0], z), (NAKA[1], z + nr.uniform(-1.0, 1.0)), nr.uniform(4.9, 5.5), 1.0, unit=5.0)
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
        J.span("jt_string_s", ((xa + xb) / 2 - 3.0, a), ((xa + xb) / 2 - 3.5, b), 4.6, 0.9, unit=5.0)
        J.put("vending", (xa + xb) / 2 + 4.0, G0, a + 0.45, 0.0)
        light(D, (xa + xb) / 2 + 4.0, 1.2, a + 1.3, "cyan", 1.8)
        J.put("jt_scooter", (xa + xb) / 2 - 5.0, G0, b - 0.5, HALF_PI + nr.uniform(-0.2, 0.2))
        stand((xa + xb) / 2 + nr.uniform(-1.0, 2.5), a + 0.4, 0.0, nr.choice(("lean", "smoke", "squat", "phone")), G0)
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
        quad((D, "glass_dark", 0), *up)
        quad((D, "glass_dark", 0), up[1], up[0], up[3], up[2])
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
            J.put("jt_lantern", x, 6.78, z, 0.0, 1.3, 1.3)
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
    J.put("jt_lantern", gx, 5.2, z + (1.1 if z < tc else -1.1), 0.0, 2.3, 2.3)
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
    J.span("jt_string_s", (x, ta), (x + tr.uniform(-0.8, 0.8), tb), tr.uniform(5.4, 6.3), 1.5, unit=5.0)
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
            J.span("jt_string_s", (xa, z), (xb, z + lr.uniform(-0.6, 0.6)), lr.uniform(4.6, 5.4), 0.9, unit=5.0)
            light(D, (xa + xb) / 2, 0.3, z, "red", 2.0)
        else:
            J.span("jt_cable", (xa, z), (xb, z + lr.uniform(-3.0, 3.0)), lr.uniform(5.0, 7.3), 0.45)
        z += lr.uniform(5.0, 10.0)
    z = za + 6.0
    k = 0
    while z < zb:
        x = xa + 0.55 if k % 2 == 0 else xb - 0.55
        if xa == EDGE[0]:
            x = xa + 0.6
        J.put("lamp_short", x, G0, z)
        light(D, x, 3.0, z, "amber", 4.0)
        if xa == LANE[0] and k % 3 == 1:
            stall(xa + 0.95, z + 9.0, HALF_PI, lr)
            stools(xa + 1.2, z + 11.6, lr.uniform(0, 6.28), lr)
        roll = lr.random()
        if roll < 0.3:
            J.put("drum", x, G0, z + 2.0)
            J.put("drum", x + (0.1 if k % 2 == 0 else -0.1), G0, z + 2.7)
        elif roll < 0.55:
            J.put("bin", x, G0, z - 1.6)
        elif roll < 0.7 and xa == EDGE[0]:
            J.put("planter_tree", xa + 1.3, G0, z + 6.0, lr.uniform(0, 6.28))
        # Somebody against the wall: mine is the lane's west one, the back
        # lane's both, the strip's east.
        wx, wyaw = (xa + 0.38, HALF_PI) if xa != EDGE[0] and (xa == LANE[0] or k % 2 == 0) else (xb - 0.38, -HALF_PI)
        roll = lr.random()
        if roll < 0.45:
            stand(wx, z + 3.5, wyaw + lr.uniform(-0.3, 0.3), lr.choice(("smoke", "lean", "phone", "squat")), G0)
        elif roll < 0.6:
            stand(wx, z + 3.2, 0.0, "talk", G0)
            stand(wx, z + 4.1, math.pi, "talk", G0)
        k += 1
        z += columns * lr.uniform(0.8, 1.2)
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
    J.lantern_row(f, 0.5, f.width - 0.5, 3.0, 0.6, 1.0)
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
