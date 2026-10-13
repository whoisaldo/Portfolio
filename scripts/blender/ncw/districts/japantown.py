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

The east row was built when the light bake mirrored every source within
60 m of the avenue onto its road for the hero (src/world/spill.js), so its
own signs over 7.5 m are `glow` and its side walls carry bent tube, not
adverts. The bake now mirrors only what stands within 20 m of the avenue,
and what round 3 hangs by the deck (east of x -60) is lit like the rest.
Checked at the end: nothing of Japantown's stands where the bake mirrors.
"""
import os

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
             tints=("charcoal", "brown", "rust", "teal", "plum", "navy", "brown", "charcoal"),
             balcony=0.2, balcony_glass=0.15, ac=0.16, pipes=0.5, fire_escape=0.14, awning=0.7, shop_sign=0.5,
             canopy=0.0, cornice=0.0, setback=0.0, ledge_every=0,
             shop_colours=["red", "amber", "pink", "magenta", "red", "amber", "green", "pink"])
STYLE_B = dict(STYLE, balcony=0.14, fire_escape=0.1, awning=0.6)
STYLE_C = dict(STYLE, tints=("charcoal", "navy", "teal", "plum", "rust", "brown"), lit=(0.45, 0.85), balcony=0.1,
               fire_escape=0.1, awning=0.4, shop_sign=0.5, setback=0.5)


# Which advert a board shows is the site's, from where it stands: its left
# edge, its foot and its plane in cells of 4 m (src/world/materials.js,
# `board`), sixteen wide adverts and eight tall, each board a turn ahead of
# or behind its number as they change. So a board is slid along its own
# face, or raised where it can be, until its number is not within one of
# any board's of its shape within sight: the same advert is then never
# twice in a view while there are others to show.
_kit_billboard = B.billboard
ADS = []


def _board_no(cx, cy, cz, w, h, yaw):
    fx = cx * math.cos(yaw) - cz * math.sin(yaw) - w / 2
    fz = cx * math.sin(yaw) + cz * math.cos(yaw)
    return math.floor(fx / 4.0 + 0.412) * 7 + math.floor((cy - h / 2) / 4.0 + 0.412) * 5 + math.floor(fz / 4.0 + 0.412) * 3


def advert(district, cx, cy, cz, w, h, yaw, r, frame=True, back=True, depth=0.35, rise=0.0, slide=None):
    """The kit's billboard, set where its advert is its own (see above).
    Returns where it was set."""
    tall = w / h < 0.85
    m = 8 if tall else 16
    slide = min(1.0, w * 0.1) if slide is None else slide
    near = [b for x, z, t, b in ADS if t == tall and math.hypot(x - cx, z - cz) < 150.0]
    best = None
    for dv in [0.4 * i for i in range(int(rise / 0.4) + 1)]:
        for du in (0.0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5, 2.0, -2.0):
            if abs(du) > slide:
                continue
            x, z = cx + du * math.cos(yaw), cz - du * math.sin(yaw)
            b = _board_no(x, cy + dv, z, w, h, yaw)
            clash = sum(1 for o in near if (b - o) % m in (0, 1, m - 1))
            if best is None or clash < best[0]:
                best = (clash, x, cy + dv, z, b)
        if best[0] == 0:
            break
    _, x, y, z, b = best
    ADS.append((x, z, tall, b))
    _kit_billboard(district, x, y, z, w, h, yaw, r, frame, back, depth)
    return x, y, z


B.billboard = advert


def strip(f, colour, s0, s1, y0, y1, out, depth=0.06):
    """A tube of light along or up a face: its front and its underside (it
    hangs over eye level: its top and its two ends are never seen)."""
    k = (D, "neon_" + colour, 0)
    f.quad(k, s0, s1, y0, y1, out + depth)
    a, b = f.at(s0), f.at(s1)
    quad(k, f.p(b, y0, out + depth), f.p(a, y0, out + depth), f.p(a, y0, out), f.p(b, y0, out))


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
    hue = r.choice(("pink", "amber", "cyan", "green", "red"))
    if any(abs(cz - zz) < 0.6 for zz in NO_AD):
        J._burn(r, w * 0.8, h * 0.8)
        return
    J.tube_sign((cx, cy, cz), yaw, w * 0.8, h * 0.8, hue, r, both=False)


# The roofline steps (the review's "a flat line"): about one lot in six of
# the rows that front the street and the lantern alley stands three to five
# storeys over what the row's own dice gave it, and a pencil tower stands
# at each kerb where the high bridge crosses (HIGH_Z). Their own dice: the
# row's stream runs as it did. A lot a named view stands on keeps its height.
STEP = {"E": 0.17, "A": 0.17, "B": 0.1}
HIGH_Z = -591.0
TOWERS = {"A": 13, "E": 12, "C": 13}
KEEP_LOW = {"A": (-711.0, -598.0, -540.0), "E": (-606.5, -42.0), "B": (-80.0,)}


# What a driver on the deck and a walker on its footways see of Japantown
# from the deck's level up (the deck's review: "flat single-colour boxes"):
# the lot behind each low one beside its gap stands eight and seven storeys
# (DECK_TOWERS: "north", "south"), and the lot of the west row on the
# deck's own line nine ("axis"): each as tall as that only if the hero's
# lens does not see its top.
DECK_TOWERS = {}
NO_AD = []      # party walls (their z) the deck's dressing covers: the generator's advert is left off them


def fit_hero(xs, a, b, n, least):
    """The most storeys up to n a lot may have unseen by the hero's lens."""
    while n > least and hero_sees((xs[0], 0.0, a), (xs[1], storeys(n) + 4.0, b)):
        n -= 1
    return n


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
            rb = random.Random(seed * 131 + round(a * 10))
            if rb.random() < STEP.get(tag, 0.0) and not any(a <= zk <= b for zk in KEEP_LOW.get(tag, ())):
                hs[j] += CELL_H * rb.choice((3, 3, 4, 5))
            if tag in TOWERS and a <= HIGH_Z <= b:
                hs[j] = storeys(fit_hero(xs, a, b, TOWERS[tag], 9) if tag == "C" else TOWERS[tag])
            if tag == "A" and a <= plan.DECK_Z <= b:
                hs[j] = max(hs[j], storeys(fit_hero(xs, a, b, 9, 4)))
                DECK_TOWERS["axis"] = a
        if tag == "E" and khi == "deck" and len(spans) > 1:
            hs[-2] = max(hs[-2], storeys(fit_hero(xs, *spans[-2], 8, 5)))
            DECK_TOWERS["north"] = spans[-2][0]
            NO_AD.append(spans[-2][1])
        if tag == "E" and klo == "deck" and len(spans) > 1:
            hs[1] = max(hs[1], storeys(fit_hero(xs, *spans[1], 7, 4)))
            DECK_TOWERS["south"] = spans[1][0]
            NO_AD.append(spans[1][0])
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
# Steam: one empty a source, its kind in its name (src/world/steam.js): a
# manhole's cover in a lane (street), a pot on a stall's hob (stall), a
# kitchen's vent in a lane's wall (lane), a roof's chillers (roof), a
# deck's drain (drain).
# ---------------------------------------------------------------------------
STEAM = []
VENTS = []


def steam(x, z, y=0.2, kind=None, cover=G0):
    """`cover`: the height a street vent's iron cover is laid at (None: it
    breathes from a grate that is drawn already)."""
    kind = kind or ("stall" if 0.8 < y < 2.0 else "street")
    if len(STEAM) < 130:
        if kind == "street" and cover is not None:
            box((D, "metal", 1), x - 0.35, x + 0.35, cover, cover + 0.04, z - 0.35, z + 0.35, scale=0.5)
        empty(f"anchor_steam_{kind}_jt{len(STEAM)}", (x, y + 0.1, z))
        STEAM.append((x, z))


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


STALL_N = [0]
STALL_POTS = []   # (x, z) a stall's pot or grill that its own dice left without steam
# Where the vendor stands, where the customers stand, and the kit's lanterns
# a stall hangs (local x, z, y over the ground, scale), by kind.
STALL = {"jt_stall": (-0.2, 1.42, ((-1.3, 1.32, 2.72, 0.95), (1.3, 1.32, 2.72, 0.95))),
         "jt_stall_b": (-0.2, 1.45, ((1.6, 0.9, 2.5, 1.3),)),
         "jt_stall_c": (-0.95, 1.4, ()),
         "jt_stall_d": (-0.25, 1.45, ())}


def stall(x, z, yaw, r, y=G0, cart=None):
    """A stall or a cart, its vendor behind the counter, one to three
    customers at it, its lamp's pool. Which of the four stalls it is comes
    from where it stands, never the one set down before it (its own
    stream: the lot's is drawn as it was)."""
    cart = r.random() < 0.35 if cart is None else cart
    if cart:
        J.put("jt_cart", x, y, z, yaw)
        back, front = -0.9, 1.05
    else:
        rv = random.Random(round(x * 10.0) * 7919 + round(z * 10.0))
        STALL_N[0] = (STALL_N[0] + rv.choice((1, 1, 2, 3))) % 4
        name = ("jt_stall", "jt_stall_b", "jt_stall_c", "jt_stall_d")[STALL_N[0]]
        J.put(name, x, y, z, yaw)
        back, front, hung = STALL[name]
        for lx_, lz_, ly_, k_ in hung:
            J.put("lantern", *loc(x, z, yaw, lx_, lz_)[:1], y + ly_, loc(x, z, yaw, lx_, lz_)[1], 0.0, k_, k_)
        # (Round 3, the stall's own dice: the pot or the grill steaming, and
        # two more who have eaten talking by it.)
        pot = {"jt_stall": (0.75, -0.5, 1.12), "jt_stall_b": (-0.4, 0.53, 1.16), "jt_stall_d": (-0.2, 0.9, 1.08)}.get(name)
        if pot and rv.random() < 0.6:
            px_, pz_ = loc(x, z, yaw, pot[0], pot[1])
            steam(px_, pz_, y + pot[2] - 0.1, "stall")
        elif pot and y < 1.0:
            STALL_POTS.append(loc(x, z, yaw, pot[0], pot[1]))
        if rv.random() < 0.35:
            sd_ = rv.choice((-1, 1))
            for k2, lz2 in ((0, 1.75), (1, 2.6)):
                px_, pz_ = loc(x, z, yaw, sd_ * (1.75 + rv.uniform(-0.1, 0.1)), lz2)
                stand(px_, pz_, yaw + (math.pi if k2 == 0 else 0.0) + rv.uniform(-0.3, 0.3), "talk", y)
    stand(*loc(x, z, yaw, r.uniform(-0.4, 0.4), back), yaw, "vendor", y)
    for i in range(r.randrange(1, 4)):
        px, pz = loc(x, z, yaw, (-0.8, 0.05, 0.85)[i] + r.uniform(-0.12, 0.12), front + r.uniform(0.0, 0.2))
        stand(px, pz, yaw + math.pi + r.uniform(-0.3, 0.3), r.choice(("idle", "idle", "phone", "talk", "smoke")), y)
    lx, lz = loc(x, z, yaw, 0.0, 1.0)
    light(D, lx, y + 1.5, lz, "amber", 3.2)


TREE_N = [0]
MEDIAN_TALL = []   # (z) the reservation's trees and palms, whose crowns are over the lanes


def tree(x, y, z, yaw, pit=True, kinds=None, sxz=1.0):
    """One of Japantown's trees, never the last one's kind: a cherry in a
    planter, or a young cherry in a pit where it stands in paving (`pit`);
    `kinds` names them (the reservation's maple, whose crown clears the
    lanes). Each is turned and sized a little by where it stands."""
    kinds = kinds or (("jt_tree_a", "jt_tree_c") if pit else ("jt_tree_a",))
    n = len(kinds)
    TREE_N[0] = (TREE_N[0] + 1 + (round(x * 3.0 + z * 7.0) % max(1, n - 1))) % n
    h = (math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1.0
    J.put(kinds[TREE_N[0]], x, y, z, yaw, 0.92 + 0.16 * h, sxz * (0.9 + 0.2 * h))


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
def rib(f, s, y0, y1, col, half=0.15, out=0.2):
    """A rib up a face: its front and its two sides."""
    k = (D, "trim", 1)
    f.quad(k, s - half, s + half, y0, y1, out, col=col)
    for e, flip in ((s - half, True), (s + half, False)):
        a = f.at(e)
        q = (f.p(a, y0, out), f.p(a, y0, 0.0), f.p(a, y1, 0.0), f.p(a, y1, out))
        quad(k, *(q if not flip else (q[1], q[0], q[3], q[2])), col=col)


def noren(f, s0, s1, r, y=3.2):
    """A door curtain: a rod and its cloth in panels."""
    drop = r.uniform(0.7, 1.1)
    n = max(2, round((s1 - s0) / 0.55))
    pw = (s1 - s0) / n
    col = r.choice(NOREN)
    for i in range(n):
        f.quad((D, "trim", 1), s0 + i * pw + 0.02, s0 + (i + 1) * pw - 0.02, y - drop, y, 0.14, col=col)
    conduit(f, s0 - 0.08, s1 + 0.08, y, 0.04, out=0.16)
    # A character dyed into its middle cloth (pale on a dark cloth, dark on a pale one).
    mid = s0 + (n // 2 + 0.5) * pw
    c = f.p(f.at(mid), y - drop / 2, 0.15)
    ink = (0.62, 0.6, 0.52, 1) if sum(col[:3]) < 1.0 else (0.06, 0.07, 0.16, 1)
    J.write((D, "trim", 1), c, basis(f.yaw), "ユメサケソノスミ"[int(abs(c[0] * 3.0 + c[2] * 7.0)) % 8], pw * 1.1, min(drop * 0.6, pw * 0.8), 0.0, 0.05, ink)


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
    used = []
    while s < w - 0.6:
        kind = r.random()
        hx, _, hz = f.p(f.at(s), 0.0, 0.0)
        hk = J._hash(hx, hz, lo)
        lean = r.uniform(-0.14, 0.14) if r.random() < 0.3 else 0.0
        if kind < 0.5:
            y = lo + r.uniform(0.0, 0.5)
            while y < hi - 1.0:
                sizes = [z for z in (("bs", "bx") if small else ("bs", "bm", "bm", "bl", "bx")) if ST_SIZES[z][1] <= hi - y]
                if not sizes:
                    break
                size = r.choice(sizes)
                bh = ST_SIZES[size][1]
                # (Round 5: blades of one size were all one size; each is
                # its own now, a quarter smaller at most, its foot kept.)
                kb = 0.74 + 0.26 * J._hash(hx, hz, y)
                J.blade(f, s, y + bh * kb / 2, size, tilt=r.choice((-1, 1)) * r.uniform(0.1, 0.6), roll=lean, k=kb)
                used.append(s)
                y += bh + r.uniform(0.3, 1.6)
                if r.random() < 0.5:
                    break
        elif kind < 0.8:
            size = r.choice(("ps", "bx") if small else ("ps", "pm", "bx", "ps"))
            bw, bh = ST_SIZES[size]
            if bw + 0.6 < w and band > bh + 0.2:
                sc = min(max(s, bw / 2 + 0.3), w - bw / 2 - 0.3)
                yc = r.uniform(lo + bh / 2, hi - bh / 2)
                # (And a board is its own size, up to a third larger where it fits.)
                kb = min(0.82 + 0.5 * hk, (w - 0.6) / bw, (band - 0.2) / bh)
                sc = min(max(sc, bw * kb / 2 + 0.3), w - bw * kb / 2 - 0.3)
                yc = min(max(yc, lo + bh * kb / 2), hi - bh * kb / 2)
                J.board(f, sc, yc, size, tilt=r.uniform(-0.3, 0.3), roll=lean, k=kb,
                        pitch=-r.uniform(0.05, 0.22) if r.random() < 0.4 else 0.0)
                used.append(sc)
        else:
            n = min(5, int(band / 1.0))
            if n >= 2:
                used.append(s)
                px, _, pz = f.p(f.at(s), 0.0, 1.15)
                for j in range(n):
                    size = r.choice(("ps", "ps", "bx"))
                    J.slab_sign((px, lo + 0.5 + j * 1.0, pz), basis(f.yaw + HALF_PI + r.uniform(-0.45, 0.45), r.uniform(-0.08, 0.08)), size, depth=0.12)
                # (The mast and its two arms: straps, read from along the street.)
                a_ = f.at(s)
                for q in [(f.p(a_, lo - 0.2, 1.1), f.p(a_, lo - 0.2, 1.2), f.p(a_, lo + n * 1.0, 1.2), f.p(a_, lo + n * 1.0, 1.1))] + \
                         [(f.p(a_, yy, 0.0), f.p(a_, yy, 1.1), f.p(a_, yy + 0.07, 1.1), f.p(a_, yy + 0.07, 0.0)) for yy in (lo + 0.2, lo + n * 1.0 - 0.3)]:
                    quad((D, "metal", 1), *q)
                    quad((D, "metal", 1), q[1], q[0], q[3], q[2])
        s += r.uniform(1.9, 3.3) / density
    # (Round 5: between the lit signs, a printed board or two pasted up on
    # the wall, unlit, each its own print: the shop's bill, a hand-painted
    # price list, a faded advert.)
    if band > 2.6:
        for j in range(2):
            sb = 0.9 + (w - 1.8) * J._hash(f.at(0.0), f.plane, j + lo)
            if w < 2.4 or any(abs(sb - u) < 1.4 for u in used):
                continue
            kb = 1.6 + 0.8 * J._hash(sb, j, lo)
            yb = lo + 0.2 + (band - 1.0 - 0.9 * kb) * J._hash(j, sb, hi)
            if yb + 0.9 * kb > hi:
                continue
            bx_, _, bz_ = f.p(f.at(sb), yb, 0.02)
            J.put("jt_bill", bx_, yb, bz_, f.yaw, kb * (0.9 + 0.3 * J._hash(sb, hi)), kb)
            used.append(sb)
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
    if r.random() < (0.8 if alley else 0.62 if level == "street" else 0.6):
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
    signs_on(f, h, r, density={"street": 1.0, "alley": 0.42, "edge": 0.75}[level], small=alley, big=not alley, cap=cap)
    by_wall(f, r, alley, {"street": 0.4, "alley": 0.26, "edge": 0.16}[level])
    rb = rng(rec, "ribs" + name)
    if level != "alley" and h > storeys(2) + 0.1 and rb.random() < 0.6:
        # Ribs up the front between its bays (a wall seen along the street
        # is its relief: the review's "flat dark walls").
        bays = max(1, round(w / CELL_W))
        for j in range(bays + 1):
            if j in (0, bays) or rb.random() < 0.6:
                rib(f, min(w - 0.15, max(0.15, j * w / bays)), SHOP_H + 0.3, h, tcol)
    if level == "street" and h < storeys(2) + 0.1 and w > 5.0:
        # A two-storey front has one floor to show over its shops (the
        # review: "plain flat walls with one row of small windows"): a word
        # in standing letters across it on a rail, a tube under its eave.
        rl = rng(rec, "low" + name)
        hue = rl.choice(("pink", "amber", "red", "green", "cyan", "white"))
        c = f.p(f.at(w / 2), SHOP_H + 1.75, 0.34)
        kana = rl.random() < 0.65
        text = J.F.pick(J.F.KANA if kana else J.F.LATIN, c, max(2, int((w - 1.2) / (1.5 * (1.12 if kana else 0.9)))), (2, 0))
        ch = min(1.6, (w - 1.2) / (len(text) * (1.12 if kana else 0.9)))
        wd, _ = J.letters(c, basis(f.yaw), text, ch, hue, depth=0.14)
        for v in (-ch * 0.3, ch * 0.3):
            f.box((D, "metal", 1), w / 2 - wd / 2 - 0.2, w / 2 + wd / 2 + 0.2, SHOP_H + 1.75 + v - 0.03, SHOP_H + 1.75 + v + 0.03, 0.18, 0.24)
        strip(f, rl.choice(("white", "amber", "pink", "cyan")), 0.3, w - 0.3, h - 0.42, h - 0.34, 0.1)


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
_kit_shopfront = B.shopfront
LOBBIES = []


def _shopfront(district, f, r, s0, s1, tint, sign_rate=0.6, awning_rate=0.55, door=True, palette=None):
    """The generator's shopfront, and a note of where it sets the door to
    the flats (its own first throw, made on a copy of its dice)."""
    w = s1 - s0
    if w >= 2.4:
        bays = max(1, round(w / CELL_W))
        rc = random.Random()
        rc.setstate(r.getstate())
        bay = rc.randrange(1, bays - 1) if door and bays >= 3 else (-1 if not door or bays < 2 else bays - 1)
        if bay >= 0:
            LOBBIES.append((f, s0 + bay * w / bays, s0 + (bay + 1) * w / bays))
    _kit_shopfront(district, f, r, s0, s1, tint, sign_rate, awning_rate, door, palette)


def lobbies():
    """A door to the flats stands in a recess the generator leaves bare and
    black (the review's "blotches on black" are the wall's marks on it): its
    two sides are lined in steel sheet to the lamp's height, a bank of
    letterboxes on one, and the lamp over the door lights it."""
    for n, (f, a, b) in enumerate(LOBBIES):
        for e, flip in ((a + 0.21, False), (b - 0.21, True)):
            p0, p1 = f.p(f.at(e), G0, -0.89), f.p(f.at(e), G0, 0.0)
            q = (p0, p1, (p1[0], 2.44, p1[2]), (p0[0], 2.44, p0[2]))
            quad((D, "metal", 1), *(q if not flip else (q[1], q[0], q[3], q[2])))
        e = a + 0.225
        p0, p1 = f.p(f.at(e), 1.05, -0.7), f.p(f.at(e), 1.05, -0.2)
        quad((D, "trim", 1), p0, p1, (p1[0], 1.6, p1[2]), (p0[0], 1.6, p0[2]), col=J.GALV)
        # Its back: sheet from side to side, and the door a metre wide in its frame.
        f.quad((D, "metal", 1), a + 0.2, b - 0.2, G0, 2.44, -0.885)
        # (Round 3: a glazed door onto the lit foot of the stair, where the
        # wall's marks drew black and white blocks over a steel leaf.)
        m_ = (a + b) / 2
        f.quad((D, "metal", 1), m_ - 0.475, m_ + 0.475, G0, G0 + 0.9, -0.87)
        f.quad((D, "metal", 1), m_ - 0.475, m_ + 0.475, G0 + 2.0, G0 + 2.1, -0.87)
        f.quad((D, "shop", 0), m_ - 0.4, m_ + 0.4, G0 + 0.9, G0 + 2.0, -0.875, uvs=((1.0, 0.5), (1.8, 0.5), (1.8, 1.6), (1.0, 1.6)), col=(0.9, 0.2, 1.0, 1.0))
        for e_ in (m_ - 0.475, m_ + 0.4):
            f.quad((D, "metal", 1), e_, e_ + 0.075, G0 + 0.9, G0 + 2.0, -0.865)
        J.put("jt_door", *f.p(f.at((a + b) / 2), G0, -0.88), f.yaw, 0.92)
        if n % 3 == 0:
            light(D, *f.p(f.at((a + b) / 2), 2.2, -0.4), "white", 2.6)




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


LANE_WALLS = ((0.17, 0.17, 0.16, 1), (0.12, 0.16, 0.19, 1), (0.18, 0.13, 0.11, 1), (0.11, 0.16, 0.16, 1), (0.15, 0.16, 0.18, 1), (0.19, 0.16, 0.13, 1),
              (0.1, 0.12, 0.18, 1))
WINDOWS = ((0.8, 0.6, 1.95), (1.0, 1.1, 1.35), (1.0, 1.1, 1.35), (1.5, 1.0, 1.45), (0.7, 1.4, 1.2), (1.2, 0.8, 1.7))
KEEP = []   # (a wall's plane, from, to): a stall or a column stands against it, so only flat things there


def kept(f, s0, s1):
    a, b = sorted((f.at(s0), f.at(s1)))
    return any(abs(f.plane - pl) < 0.01 and a < hi and b > lo for pl, lo, hi in KEEP)


def lens(f, hue, s0, s1, y0, y1, w0, w1):
    """A lamp's lens under its hood: its front and its underside (a phone
    draws these, so no more of it than is seen). A white one is a lit
    `glow` (a neon white lens two metres off reads as a blown-out square)."""
    k, col = ((D, "glow", 0), (0.14, 0.14, 0.125, 1)) if hue == "white" else ((D, "neon_" + hue, 0), (1, 1, 1, 1))
    f.quad(k, s0, s1, y0, y1, w1, col=col)
    a, b = f.at(s0), f.at(s1)
    quad(k, f.p(b, y0, w1), f.p(a, y0, w1), f.p(a, y0, w0), f.p(b, y0, w0), col=col)


def conduit(f, s0, s1, y, t, out=0.07):
    """A conduit along a wall: its face and its underside (it is over head
    height: nothing sees its top)."""
    k = (D, "metal", 1)
    f.quad(k, s0, s1, y, y + t, out)
    a, b = f.at(s0), f.at(s1)
    quad(k, f.p(b, y, out), f.p(a, y, out), f.p(a, y, out - 0.05), f.p(b, y, out - 0.05))


def services(f, s0, s1, breaks, rx, y=G0 + 3.3):
    """The run of services along a lane's wall over its doors (jt_run, four
    metres a piece, stretched to fit), left out where a duct, a ladder or a
    shutter's head stands in its way."""
    at = s0
    for b0, b1 in sorted(breaks) + [(s1, s1)]:
        if b0 - at > 2.2 and rx.random() < 0.85:
            n = max(1, round((b0 - at) / 4.0))
            ln = (b0 - at) / n
            for i in range(n):
                J.put("jt_run", *f.p(f.at(at + ln * (i + 0.5)), y + rx.choice((0.0, 0.0, 0.25)), 0.0), f.yaw, 1.0, ln / 4.0)
        at = max(at, b1)


DOOR_PAINT = ((0.1, 0.17, 0.12, 1), (0.24, 0.07, 0.06, 1), (0.1, 0.13, 0.2, 1), (0.28, 0.14, 0.05, 1), (0.3, 0.29, 0.25, 1), (0.06, 0.17, 0.18, 1),
              (0.16, 0.16, 0.17, 1), (0.2, 0.1, 0.16, 1))


def lane_door(f, sc, r):
    """A back door under its lamp: painted steel, now with a lit wired pane
    in it, now standing open on a lit room up a step (its own stream, so the
    lane's is drawn as it was)."""
    x, _, z = f.p(f.at(sc), G0, 0.0)
    rd = random.Random(round(x * 7.0) * 1009 + round(z * 13.0))
    roll = rd.random()
    paint = rd.choice(DOOR_PAINT)
    if roll < 0.3:
        f.quad((D, "shop", 0), sc - 0.475, sc + 0.475, G0, G0 + 2.1, 0.01, uvs=((1.0, 0.0), (1.95, 0.0), (1.95, 2.1), (1.0, 2.1)),
               col=(rd.uniform(0.6, 1.0), rd.choice((0.2, 0.32, 0.6, 0.8)), 1.0, 1.0))
        # The leaf stands open into the lane off its hinge.
        hs = sc - 0.475 if rd.random() < 0.5 else sc + 0.475
        h0 = f.p(f.at(hs), G0, 0.03)
        ang = rd.uniform(1.1, 1.45)
        sgn = 1.0 if hs < sc else -1.0
        tx, tz = f.p(f.at(hs + sgn), G0, 0.0)[0] - f.p(f.at(hs), G0, 0.0)[0], f.p(f.at(hs + sgn), G0, 0.0)[2] - f.p(f.at(hs), G0, 0.0)[2]
        nx_, nz_ = f.nx, f.nz
        ex, ez = h0[0] + 0.92 * (math.cos(ang) * tx + math.sin(ang) * nx_), h0[2] + 0.92 * (math.cos(ang) * tz + math.sin(ang) * nz_)
        # (The leaf, both faces: a kick plate, its paint scuffed dark up to
        # hand height, a wired pane lit from the room, a handle: the m8
        # review saw a bare one end on as "a large flat beige box".)
        if paint[0] > 0.29:
            paint = (0.17, 0.16, 0.14, 1)    # (never the pale one, a big flat panel at the eye)
        dark = tuple(v * 0.45 for v in paint[:3]) + (1,)
        for a_, b_, off in (((h0[0], h0[2]), (ex, ez), 0.012), ((ex, ez), (h0[0], h0[2]), 0.012)):
            ln = math.hypot(b_[0] - a_[0], b_[1] - a_[1])
            ux, uz = (b_[0] - a_[0]) / ln, (b_[1] - a_[1]) / ln
            ox, oz = uz * off, -ux * off
            P_ = lambda t_, y_: (a_[0] + ux * t_ + ox, y_, a_[1] + uz * t_ + oz)  # noqa: E731
            quad((D, "trim", 1), P_(0.0, G0 + 0.02), P_(ln, G0 + 0.02), P_(ln, G0 + 2.08), P_(0.0, G0 + 2.08), col=paint)
            quad((D, "trim", 1), P_(0.04, G0 + 0.04), P_(ln - 0.04, G0 + 0.04), P_(ln - 0.04, G0 + 0.3), P_(0.04, G0 + 0.3), col=(0.16, 0.16, 0.16, 1))
            quad((D, "trim", 1), P_(0.06, G0 + 0.3), P_(ln - 0.06, G0 + 0.3), P_(ln - 0.06, G0 + 1.05), P_(0.06, G0 + 1.05), col=dark)
            quad((D, "glow", 1), P_(ln * 0.3, G0 + 1.32), P_(ln * 0.7, G0 + 1.32), P_(ln * 0.7, G0 + 1.78), P_(ln * 0.3, G0 + 1.78), col=(0.07, 0.05, 0.03, 1))
        hx, hz = h0[0] + 0.8 * (ex - h0[0]), h0[2] + 0.8 * (ez - h0[2])
        box((D, "metal", 1), hx - 0.03, hx + 0.03, G0 + 0.98, G0 + 1.1, hz - 0.03, hz + 0.03, scale=1.0)
        light(D, *f.p(f.at(sc), 0.3, 1.2), "amber", 2.4)
    else:
        f.quad((D, "trim", 0), sc - 0.475, sc + 0.475, G0, G0 + 2.1, 0.03, col=paint)
        if roll < 0.55:
            f.quad((D, "glow", 1), sc - 0.17, sc + 0.17, G0 + 1.4, G0 + 1.82, 0.035, col=rd.choice(((0.1, 0.065, 0.03, 1), (0.045, 0.06, 0.07, 1), (0.09, 0.075, 0.045, 1))))
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
        x, _, z = f.p(f.at(s0 + ww / 2), y0, 0.0)
        rw = random.Random(round(x * 11.0) * 1013 + round(z * 7.0))
        if rw.random() < 0.65:
            # (Round 3: two in three that were dark have a lamp on low.)
            f.quad((D, "shop", 0), s0, s0 + ww, y0, y0 + wh, 0.02, uvs=((1.0, 0.9), (1.0 + ww, 0.9), (1.0 + ww, 0.9 + wh), (1.0, 0.9 + wh)),
                   col=(rw.uniform(0.0, 0.2), rw.choice((0.2, 0.6, 0.95)), 1.0, 1.0))
        else:
            # (Unlit glass: the dark of the room, in the batch every tile has.)
            f.quad((D, "glow", 0), s0, s0 + ww, y0, y0 + wh, 0.02, col=(0.006, 0.008, 0.011, 1))
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


# The deck's stair (deck.py, ST_*): two flights and a landing up the south
# wall of the gap, 5 cm off it (z -74.95..-74.05), from x -65.2 at 0.15 m to
# x -49.4 at 8.65 m. What stands out from that wall keeps out of the band
# the stair fills at its x: its soffit 0.2 m under the treads, its rails
# 1.1 m over them.
STAIR_X, STAIR_LAND, STAIR_Y = (-65.2, -49.4), 1.2, (B.G0, plan.DECK_Y + 0.15)


def stair_band(x):
    x0, x1 = STAIR_X
    if not x0 - 0.3 < x < x1 + 0.3:
        return None
    run, rise = (x1 - x0 - STAIR_LAND) / 2, (STAIR_Y[1] - STAIR_Y[0]) / 2
    u = min(max(x - x0, 0.0), x1 - x0)
    y = STAIR_Y[0] + rise * (min(u, run) / run) + (rise * min(max(u - run - STAIR_LAND, 0.0), run) / run)
    return y - 0.25, y + 1.2


def clear_of_stair(f, s0, s1, y0, y1, stair):
    if not stair:
        return True
    for t in (0.0, 0.25, 0.5, 0.75, 1.0):
        b = stair_band(f.at(s0 + (s1 - s0) * t))
        if b and y0 < b[1] and y1 > b[0]:
            return False
    return True


def deck_face(f, h, r, door_s=None, stair=False):
    """A wall beside the deck's gap (`stair`: the south one, along which the
    deck's stair climbs 5 cm off it; nothing that stands out from it is
    where the stair is): render over both floors, framed windows on each
    with most of them lit, pipes, meters, vents, a small unit, a conduit, a
    sign of bent tube, and (`door_s`) a door under its lamp, under the
    stair's landing."""
    w = f.width
    ok = lambda s0, s1, y0, y1: clear_of_stair(f, s0, s1, y0, y1, stair)  # noqa: E731
    f.quad((D, "plaster", 0), 0.0, w, 0.0, h, 0.0, col=r.choice(LANE_WALLS))
    f.box((D, "trim", 1), 0.0, w, 0.0, 0.95, 0.0, 0.05, col=(0.2, 0.2, 0.21, 1))
    cs = [0.15]
    for t in range(1, 60):
        if ok(cs[-1], 0.15 + (w - 0.3) * t / 59, G0 + 3.0, G0 + 3.12) != ok(cs[-1], cs[-1], G0 + 3.0, G0 + 3.12):
            cs.append(0.15 + (w - 0.3) * t / 59)
    cs.append(w - 0.15)
    for a, b in zip(cs, cs[1:]):
        if b - a > 0.4 and ok((a + b) / 2, (a + b) / 2, G0 + 3.0, G0 + 3.12):
            conduit(f, a, b, G0 + 3.05, 0.05)
    end = w - 0.6
    if door_s is not None:
        lane_door(f, door_s, r)
        end = door_s - 1.0
    s = r.uniform(0.5, 1.0)
    while s < end - 1.0:
        roll = r.random()
        if roll < 0.5 and end - s > 1.8:
            kind = r.choice(WINDOWS[1:4])
            if ok(s, s + kind[0] + 0.25, kind[2] - 0.15, kind[2] + kind[1] + 0.12):
                lane_window(f, s + 0.12, r, kind)
            s += kind[0] + 0.3
        elif roll < 0.68:
            if ok(s, s + 0.8, 0.0, 4.6):
                J.put("jt_pipes", *f.p(f.at(s + 0.4), G0, 0.0), f.yaw)
            s += 0.8
        elif roll < 0.8 and end - s > 1.3:
            if ok(s, s + 1.2, 0.0, 3.5):
                J.put("jt_meters", *f.p(f.at(s + 0.6), G0, 0.0), f.yaw)
            s += 1.2
        elif roll < 0.9:
            if ok(s, s + 0.85, 0.0, 2.7):
                J.put("jt_vent", *f.p(f.at(s + 0.42), G0, 0.0), f.yaw)
            s += 0.85
        else:
            if ok(s, s + 0.9, 0.0, 3.1):
                J.put("jt_ac", *f.p(f.at(s + 0.45), G0, 0.0), f.yaw, 1.0, 0.75)
            s += 0.9
        s += r.uniform(0.3, 1.0)
    # The floor over: a window a bay, under 7.5 m (see the module's note).
    s = r.uniform(0.8, 1.6)
    while s + 1.3 < w - 0.5:
        if r.random() < 0.85 and ok(s - 0.1, s + 1.3, SHOP_H + 0.85, SHOP_H + 2.45):
            lane_window(f, s, r, (1.2, 1.3, SHOP_H + 1.0))
        s += r.uniform(2.6, 3.4)
    sc_ = min(w - 4.2, max(3.0, end - 2.6))
    cx, _, cz = f.p(f.at(sc_), 0.0, 0.14)
    if ok(sc_ - 1.6, sc_ + 1.6, 3.5, 4.8):
        J.tube_sign((cx, 4.15, cz), f.yaw, 2.8, 0.95, r.choice(("pink", "cyan", "amber", "green")), r, both=False)
    else:
        r.choice(("pink", "cyan", "amber", "green"))
        J._burn(r, 2.8, 0.95)
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
    # (The door to the flats stands under the stair's landing, x -57.3: at its
    # foot it opened onto the treads.)
    deck_face(B.Face(name, f.plane + 0.03 * f.nz, f.a0, f.a1), rec["h"], r, door_s=7.3 if south else None, stair=south)
    x0, x1, z0, z1, _, top = rec["tiers"][-1]
    over = lot.neighbours.get(far, 0.0) - top
    if over > 2.8:
        fw = B.Face("-z", z1, x0, x1) if far == "+z" else B.Face("+z", z0, x0, x1)
        deck_wall(fw, top, r)
        if over > 5.2:
            cx, _, cz = fw.p(fw.at((x1 - x0) / 2), 0.0, 0.14)
            J.tube_sign((cx, top + 3.6, cz), fw.yaw, 4.2, 1.4, r.choice(("pink", "cyan", "amber")), r, both=False)


WIN_KINDS = (0, 1, 2, 3, 5, 6)


def banded(f, y0, y1, r, tint, ribs=True):
    """A face from y0 up laid in bands of one to three storeys, each band
    its own kind of window and its own share of them lit, a spandrel under
    each, ribs up it bay by bay (f: the face, already a hair proud of the
    wall the generator drew)."""
    w, tcol = f.width, B.TRIM[tint]
    kinds = r.sample(WIN_KINDS, 3)
    yy, i = y0, 0
    while yy < y1 - 0.5:
        yb = min(y1, yy + r.choice((1, 2, 2, 3)) * CELL_H)
        B.facade_wall((D, "facade", 0), f, yy, yb, B.wall_col(r.uniform(0.6, 0.95), kinds[i % 3], r.uniform(0.25, 1.0), tint), float(r.randrange(40)))
        f.ledge((D, "trim", 1), 0.0, w, yy - 0.2, 0.42, 0.16, tcol, caps=False)
        yy, i = yb, i + 1
    if ribs:
        bays = max(1, round(w / CELL_W))
        for j in range(bays + 1):
            rib(f, min(w - 0.17, max(0.17, j * w / bays)), y0, y1, tcol, half=0.17, out=0.22)


def deck_dress(f, y0, y1, r, tint, screen=None, stack=True):
    """A wall the deck looks at, from its level up (the deck's review asks
    for all of it): bands of three kinds of window between ribs, a band of
    signs in a steel channel at the deck's level with a tube over it,
    balconies, shutters down over a bay or two, units, pipes, a stack of
    blades up one side and (`screen`: its width and height) an advert
    screen on a frame with lamps over it."""
    w = f.width
    banded(f, y0, y1, r, tint)
    bays = max(1, round(w / CELL_W))
    bw = w / bays
    # The sign band.
    f.box((D, "board_frame", 0), 0.2, w - 0.2, y0 + 0.45, y0 + 2.0, 0.0, 0.12)
    strip(f, r.choice(("cyan", "pink", "amber", "green")), 0.3, w - 0.3, y0 + 2.04, y0 + 2.12, 0.14)
    s = 1.3
    while s < w - 1.2:
        size = r.choice(("bx", "ps", "bx", "bs"))
        k = 1.05 if size != "bs" else 0.62
        got = J.board(f, s, y0 + 1.22, size, k=k, out=0.16)
        if got[0] == 0.0:
            got = J.board(f, s, y0 + 1.22, "bx", k=1.05, out=0.16)
        s += got[0] + r.uniform(0.5, 1.4)
    floors = int((y1 - y0) / CELL_H)
    sx0, sx1 = (w / 2 - screen[0] / 2 - 0.4, w / 2 + screen[0] / 2 + 0.4) if screen else (9e9, -9e9)
    sy0 = y0 + CELL_H + 0.6
    for fl in range(1, floors):
        fy = y0 + fl * CELL_H
        for j in range(bays):
            sc = (j + 0.5) * bw
            if screen and sx0 < sc < sx1 and sy0 - 1.0 < fy < sy0 + screen[1] + 0.5:
                continue
            roll = r.random()
            if roll < 0.24 and fy + 1.2 < y1:
                B.balcony(D, f, sc - bw / 2 + 0.3, sc + bw / 2 - 0.3, fy, tint, glass=r.random() < 0.3)
            elif roll < 0.44:
                P.place("ac_wall", *f.p(f.at(sc + r.uniform(-0.6, 0.6)), fy + 0.05, 0.0), f.yaw, district=D)
            elif roll < 0.52 and fl < 3:
                f.quad((D, "door_panel", 0), sc - 1.1, sc + 1.1, fy + 0.7, fy + 2.9, 0.04)
                f.box((D, "metal", 1), sc - 1.2, sc + 1.2, fy + 2.9, fy + 3.1, 0.0, 0.16)
    for sp in (0.5, w - 0.5):
        P.place("pipe_v", *f.p(f.at(sp), y0, 0.0), f.yaw, sy=y1 - y0, district=D)
    if stack and y1 - y0 > 9.0:
        ss, y = (0.9 if r.random() < 0.5 else w - 0.9), y0 + 3.4
        while y + 3.8 < min(y1, y0 + 16.0):
            J.blade(f, ss, y + 1.75, "bm", tilt=r.uniform(-0.3, 0.3), k=1.08)
            y += 4.0
    if screen:
        sw, sh = screen
        cx, cy, cz = f.p(f.at(w / 2), sy0 + sh / 2, 0.42)
        _, cy, _ = B.billboard(D, cx, cy, cz, sw, sh, f.yaw, r, back=False, depth=0.32, rise=min(2.0, y1 - sy0 - sh - 0.8), slide=0.0)
        sy0 = cy - sh / 2
        for du in (-sw * 0.3, 0.0, sw * 0.3):
            f.box((D, "metal", 1), w / 2 + du - 0.03, w / 2 + du + 0.03, sy0 + sh + 0.2, sy0 + sh + 0.6, 0.0, 1.0)
            f.box((D, "glow", 0), w / 2 + du - 0.18, w / 2 + du + 0.18, sy0 + sh + 0.48, sy0 + sh + 0.56, 0.86, 1.04, col=(0.9, 0.85, 0.7, 1))
        f.box((D, "trim", 1), w / 2 - sw / 2 - 0.3, w / 2 + sw / 2 + 0.3, sy0 - 0.34, sy0 - 0.26, 0.0, 1.0, col=ESCAPE)
        f.box((D, "metal", 1), w / 2 - sw / 2 - 0.3, w / 2 + sw / 2 + 0.3, sy0 + 0.6, sy0 + 0.66, 0.95, 1.0)
        light(D, *f.p(f.at(w / 2), y0 + 0.5, 3.0), r.choice(("pink", "cyan", "amber")), 6.0)


def corner_screen(x, z, wall_z, y0, y1, toward, r):
    """An advert screen off a tower's corner over the low roof beside the
    deck, swung thirty degrees to the deck's turn: its frame on three
    trusses back to the tower's wall, a catwalk under it, lamps over it.
    (x, z): the corner; toward: +1 if the deck is to the south of it."""
    yaw = -0.52 if toward > 0 else math.pi + 0.52
    b = basis(yaw)
    sw, sh = 8.6, min(12.0, y1 - y0 - 1.0)
    R = b[0]
    edge = 1 if R[0] > 0 else -1          # which end of the screen is at the corner (the end toward +x)
    c = (x - 0.4 - abs(R[0]) * sw / 2, y0 + sh / 2, z + toward * (0.5 + abs(R[2]) * sw / 2))
    c = B.billboard(D, c[0], c[1], c[2], sw, sh, yaw, r, back=False, depth=0.34, rise=min(2.0, y1 - y0 - sh), slide=0.0)
    for v in (-sh * 0.4, 0.0, sh * 0.4):
        for du in (-sw * 0.42 * edge, 0.0):
            p0 = pt(c, b, du, v, -0.36)
            q = ((p0[0], p0[1] - 0.07, p0[2]), (p0[0], p0[1] - 0.07, wall_z), (p0[0], p0[1] + 0.07, wall_z), (p0[0], p0[1] + 0.07, p0[2]))
            quad((D, "trim", 1), *q, col=ESCAPE)
            quad((D, "trim", 1), q[1], q[0], q[3], q[2], col=ESCAPE)
    obox((D, "trim", 1), pt(c, b, 0.0, -sh / 2 - 0.25, 0.45), b, sw + 0.4, 0.08, 0.9, col=ESCAPE)
    obox((D, "metal", 1), pt(c, b, 0.0, -sh / 2 + 0.8, 0.88), b, sw + 0.4, 0.05, 0.05, tube=True)
    for du in (-sw * 0.3, 0.0, sw * 0.3):
        obox((D, "metal", 1), pt(c, b, du, sh / 2 + 0.35, 0.4), b, 0.05, 0.05, 1.1, tube=False)
        obox((D, "glow", 0), pt(c, b, du, sh / 2 + 0.3, 0.9), b, 0.4, 0.07, 0.2, col=(0.9, 0.85, 0.7, 1), bottom=True)
    fx, _, fz = pt(c, b, 0.0, 0.0, 4.0)
    light(D, fx, y0 - 2.0, fz, r.choice(("pink", "cyan", "amber")), 7.0)


def deck_towers():
    """Dress what the deck sees (DECK_TOWERS)."""
    by = {(rc["row"], rc["lot"].z0): rc for rc in LOTS}
    out = lambda rc, name: B.Face(name, face(rc, name).plane + 0.03 * (face(rc, name).nx or face(rc, name).nz), face(rc, name).a0, face(rc, name).a1)  # noqa: E731
    y0 = storeys(2)
    for key, wall, toward in (("north", "+z", 1), ("south", "-z", -1)):
        rec = by.get(("E", DECK_TOWERS.get(key)))
        if rec is None or rec["h"] < y0 + 6.0:
            continue
        r, lot = rng(rec, "decktower"), rec["lot"]
        deck_dress(out(rec, wall), y0, rec["h"], r, rec["tint"], screen=None)
        banded(out(rec, "-x"), y0, rec["h"], r, rec["tint"])
        banded(out(rec, "+x"), y0, rec["h"], r, rec["tint"])
        f = out(rec, "+x")
        J.blade(f, f.width / 2, y0 + 5.0, "bl", tilt=r.uniform(-0.2, 0.2), k=1.5, gap=0.4)
        f.box((D, "board_frame", 0), 0.2, f.width - 0.2, y0 + 0.45, y0 + 1.9, 0.0, 0.12)
        s = 1.2
        while s < f.width - 1.0:
            s += J.board(f, s, y0 + 1.18, "bx", k=1.0, out=0.16)[0] + r.uniform(0.6, 1.6)
        corner_screen(lot.x1, lot.z1 if toward > 0 else lot.z0, lot.z1 if toward > 0 else lot.z0, y0 + 4.0, rec["h"], toward, r)
    rec = by.get(("A", DECK_TOWERS.get("axis")))
    if rec is not None and rec["h"] > y0 + 9.0:
        r, f = rng(rec, "decktower"), out(rec, "+x")
        sw = min(6.0, f.width - 0.9)
        deck_dress(f, y0, rec["h"], r, rec["tint"], screen=(sw, min(13.0, rec["h"] - y0 - 6.5)), stack=False)
        c = (XW + 1.9, y0 + 9.0, rec["lot"].z0 - 0.4)
        hue = r.choice(("pink", "red", "cyan", "amber"))
        text = J.F.pick(J.F.KANA, c, 5, (1, 0))
        obox((D, "board_frame", 0), c, basis(0.0), 0.3, 13.6, 3.0)
        for yaw in (0.0, math.pi):
            b = basis(yaw - HALF_PI)
            J.letters(pt(c, b, 0.0, 0.0, 0.28), b, text, min(2.4, 12.6 / (len(text) * 1.14)), hue, depth=0.2, vertical=True)
        for y in (y0 + 3.4, y0 + 9.0, y0 + 14.6):
            box((D, "metal", 1), XW, XW + 1.9, y - 0.06, y + 0.06, c[2] - 0.06, c[2] + 0.06, scale=1.0)
    # The west row's fronts over against the turn: a band of signs at the
    # deck's level and windows of three kinds over it.
    for rc in LOTS:
        if rc["row"] == "A" and RAMP[0] + 110.0 < rc["lot"].z0 and rc["lot"].z1 < -44.0 and rc["h"] > y0 + 3.0 and rc["lot"].z0 != DECK_TOWERS.get("axis"):
            r, f = rng(rc, "deckfront"), out(rc, "+x")
            banded(f, y0, rc["h"], r, rc["tint"])
            f.box((D, "board_frame", 0), 0.2, f.width - 0.2, y0 + 0.45, y0 + 1.9, 0.0, 0.12)
            strip(f, r.choice(("cyan", "pink", "amber", "green")), 0.3, f.width - 0.3, y0 + 1.94, y0 + 2.02, 0.14)
            s = 1.2
            while s < f.width - 1.0:
                size = r.choice(("bx", "bs", "ps"))
                got = J.board(f, s, y0 + 1.18, size, k=1.0 if size != "bs" else 0.6, out=0.16)
                s += (got[0] or 0.6) + r.uniform(0.5, 1.5)


def lane_more(f, w, fixtures, free, r):
    """Round 3, on its own stream: no stretch of a lane's wall goes four
    metres without a light (a bulkhead lamp on a short arm, warm or cold,
    its pool under it); the flat stretches by an alley's mouth, where
    nothing may stand out from the wall, are pasted with bills."""
    pts = sorted([0.0] + fixtures + [w])
    k = 0
    for a, b in zip(pts, pts[1:]):
        if b - a > 4.2:
            sc = (a + b) / 2
            name = r.choice(("jt_sconce", "jt_sconce", "jt_sconce", "jt_sconce_w", "jt_sconce_w"))
            J.put(name, *f.p(f.at(sc), G0 + 2.6, 0.0), f.yaw)
            if k % 2 == 0:
                light(D, *f.p(f.at(sc), 2.5, 0.8), {"jt_sconce": "amber", "jt_sconce_w": "white"}[name], 2.2)
            k += 1
    run = []
    for s in free + [9e9]:
        if run and s - run[-1] > 0.75:
            a, b = run[0], run[-1] + 0.6
            if b - a > 2.4 and r.random() < 0.7:
                x, _, z = f.p(f.at(a + 0.98), G0, 0.0)   # (a prototype's +x runs the way s does)
                J.put("jt_bills", x, G0 + r.uniform(0.95, 1.15), z, f.yaw)
            elif b - a > 0.75 and r.random() < 0.75:
                x, _, z = f.p(f.at((a + b) / 2), G0, 0.0)
                J.put("jt_bill", x, G0 + r.uniform(1.0, 1.3), z, f.yaw)
            run = []
        run.append(s)


def wbox(f, key, s0, s1, y0, y1, out, col):
    """A small box on a wall as the lane sees it: its front, top, underside
    and ends (none against the wall)."""
    a, b = f.at(s0), f.at(s1)
    A0, A1, B0, B1 = f.p(a, y0, 0.0), f.p(a, y0, out), f.p(b, y0, out), f.p(b, y0, 0.0)
    up = lambda q: (q[0], y1, q[2])  # noqa: E731
    quad(key, A1, B1, up(B1), up(A1), col=col)
    quad(key, up(A1), up(B1), up(B0), up(A0), col=col)
    quad(key, A0, B0, B1, A1, col=col)
    quad(key, A0, A1, up(A1), up(A0), col=col)
    quad(key, B1, B0, up(B0), up(B1), col=col)


def lane_high(f, w, r, high, h, base=G0, s0=0.0):
    """Over head height on a lane's wall (the m8 review: "flat blue walls
    with a single door or meter box"), on its own stream: every metre and a
    half to three something between 2.9 and 4.4 m, a small window lit or
    dark in its frame, an air conditioner dripping down the wall, a blade, a
    junction box with its cables down to the conduit, a lit box sign, a run
    of pipe, a pair of bills pasted high; and two cables slung along the
    wall from hooks. `high`: what already reaches up there (s0, s1)."""
    s = s0 + r.uniform(0.3, 1.2)
    while s < w - 1.0:
        if any(a - 0.35 < s < b + 0.35 for a, b in high):
            s += 0.5
            continue
        nxt = min([a for a, _ in high if a > s] + [w - 0.8])
        room = nxt - s
        if room < 0.8:
            s = nxt
            continue
        roll = r.random()
        if roll < 0.24 and room > 1.1:
            ww, wh = r.choice(((0.6, 0.5), (0.8, 0.6), (0.9, 0.45), (0.5, 0.8), (1.1, 0.55)))
            ww, wh = min(ww, room - 0.3), min(wh, 0.42)
            y = base + 2.56
            if r.random() < 0.72:
                f.quad((D, "shop", 0), s, s + ww, y, y + wh, 0.02, uvs=((1.0, 0.9), (1.0 + ww, 0.9), (1.0 + ww, 0.9 + wh), (1.0, 0.9 + wh)),
                       col=(r.uniform(0.0, 0.5), r.choice((0.2, 0.32, 0.6, 0.8, 0.95)), 1.0, 1.0))
            else:
                f.quad((D, "glow", 0), s, s + ww, y, y + wh, 0.02, col=(0.006, 0.008, 0.011, 1))
            x, _, z = f.p(f.at(s + ww / 2), y, 0.0)
            J.put("jt_win" if r.random() < 0.5 else "jt_win_b", x, y, z, f.yaw, wh, ww)
            used = ww
        elif roll < 0.4 and room > 1.0:
            J.put("jt_ac", *f.p(f.at(s + 0.45), base, 0.0), f.yaw, r.uniform(0.9, 1.1))
            used = 0.9
        elif roll < 0.53:
            J.blade(f, s + 0.1, base + r.uniform(3.2, 3.5), r.choice(("bs", "bs", "bm")), tilt=r.uniform(-0.35, 0.35), k=r.uniform(0.7, 0.85))
            used = 0.5
        elif roll < 0.66:
            # A junction box, its cables down into the conduit.
            jy = base + r.uniform(2.45, 2.55)
            wbox(f, (D, "trim", 1), s, s + 0.36, jy, jy + 0.48, 0.15, r.choice(((0.22, 0.23, 0.22, 1), (0.3, 0.27, 0.2, 1), (0.12, 0.13, 0.15, 1))))
            for ds in (0.08, 0.2, 0.3):
                f.quad((D, "trim", 1), s + ds - 0.012, s + ds + 0.012, jy + 0.48, base + 4.15, 0.06, col=(0.02, 0.02, 0.025, 1))
            used = 0.4
        elif roll < 0.76 and room > 1.0:
            J.board(f, s + 0.45, base + 2.95, r.choice(("bs", "bx")), k=0.6, out=0.1)
            used = 0.9
        elif roll < 0.88 and room > 1.6:
            run = min(room - 0.2, r.uniform(1.6, 3.6))
            py = base + r.uniform(2.7, 2.85)
            col = r.choice(((0.2, 0.21, 0.22, 1), (0.17, 0.075, 0.04, 1), (0.1, 0.11, 0.1, 1)))
            pipe((D, "trim", 1), f.p(f.at(s), py, 0.12), f.p(f.at(s + run), py, 0.12), 0.055, segs=4, col=col)
            for ss in (s + 0.2, s + run - 0.2):
                f.quad((D, "trim", 1), ss - 0.025, ss + 0.025, py - 0.07, py + 0.07, 0.17, col=(0.03, 0.034, 0.042, 1))
            used = run
        else:
            x, _, z = f.p(f.at(s + 0.5), base, 0.0)
            J.put("jt_bills" if room > 1.6 else "jt_bill", x + 0.0, base + r.uniform(1.95, 2.1), z, f.yaw)
            used = 1.0 if room > 1.6 else 0.5
        s += used + r.uniform(0.6, 1.6)
    # Two cables along the wall from hooks, sagging between them.
    for y, out in ((base + 4.15, 0.22), (base + 4.42, 0.3)):
        if r.random() < 0.75:
            a = s0 + r.uniform(0.2, 1.5)
            while a < w - 2.5:
                b = min(w - 0.2, a + r.uniform(4.0, 8.0))
                pa, pb = f.p(f.at(a), y, out), f.p(f.at(b), y, out)
                J.span("jt_cable", (pa[0], pa[2]), (pb[0], pb[2]), y, r.uniform(0.18, 0.35))
                f.quad((D, "trim", 1), a - 0.02, a + 0.02, y - 0.04, y + 0.04, out + 0.02, col=(0.03, 0.034, 0.042, 1))
                a = b


def lane_mid(f, w, r, mid):
    """Between knee and head height on a lane's wall, on its own stream (the
    m8 review: "blank flat blue walls ... almost no pipes, units or
    lights"): every free stretch pasted, a fly-poster's run where there is
    room for one and another half over it, single bills where there is not,
    over them now a small sign, a fuse box, a strip of stickers, and a run
    of trunking along the wall at head height."""
    occ = sorted((a, b) for a, b in mid)
    gaps, at = [], 0.9
    for a, b in occ:
        if a > at:
            gaps.append((at, min(a, w - 0.9)))
        at = max(at, b)
    if at < w - 0.9:
        gaps.append((at, w - 0.9))
    for a, b in gaps:
        a, b = a + 0.12, b - 0.12
        L = b - a
        if L < 0.7:
            continue
        if L >= 2.45:
            x, _, z = f.p(f.at(a + 0.98), G0, 0.0)
            y = G0 + r.uniform(0.95, 1.15)
            J.put("jt_bills", x, y, z, f.yaw)
            if L >= 3.6 and r.random() < 0.7:
                x, _, z = f.p(f.at(a + 2.0), G0, 0.012)
                J.put("jt_bills", x, y + r.uniform(0.35, 0.55), z, f.yaw)
            elif r.random() < 0.6:
                x, _, z = f.p(f.at(a + r.uniform(0.6, L - 0.6)), G0, 0.012)
                J.put("jt_bill", x, y + r.uniform(0.4, 0.6), z, f.yaw)
        else:
            x, _, z = f.p(f.at((a + b) / 2), G0, 0.0)
            J.put("jt_bill", x, G0 + r.uniform(1.0, 1.35), z, f.yaw)
        roll = r.random()
        sc = a + r.uniform(0.25, max(0.3, L - 0.45))
        if roll < 0.22:
            J.board(f, sc, G0 + 2.15, "bx", k=0.4, out=0.08)
        elif roll < 0.45:
            wbox(f, (D, "trim", 1), sc - 0.17, sc + 0.17, G0 + 1.85, G0 + 2.3, 0.13, r.choice(((0.2, 0.21, 0.2, 1), (0.28, 0.25, 0.18, 1), (0.1, 0.11, 0.13, 1))))
            f.quad((D, "trim", 1), sc - 0.012, sc + 0.012, G0 + 2.3, G0 + 2.95, 0.05, col=(0.02, 0.02, 0.025, 1))
        elif roll < 0.62:
            for j, col in enumerate(r.sample(((0.5, 0.1, 0.08, 1), (0.08, 0.3, 0.32, 1), (0.55, 0.45, 0.1, 1), (0.42, 0.42, 0.4, 1), (0.3, 0.1, 0.35, 1)), 4)):
                ss = sc + j * 0.13
                yy = G0 + 1.75 + 0.05 * (j % 2)
                f.quad((D, "trim", 1), ss, ss + 0.1, yy, yy + 0.08, 0.02, col=col)
        if L > 1.4 and r.random() < 0.55:
            f.quad((D, "trim", 1), a, b, G0 + 2.36, G0 + 2.44, 0.06, col=(0.17, 0.17, 0.17, 1))
            a_, b_ = f.at(a), f.at(b)
            quad((D, "trim", 1), f.p(a_, G0 + 2.44, 0.06), f.p(b_, G0 + 2.44, 0.06), f.p(b_, G0 + 2.44, 0.0), f.p(a_, G0 + 2.44, 0.0), col=(0.2, 0.2, 0.2, 1))


def lane_face(rec, name, cap=None):
    """A back on a lane or a side on a cross alley (see the note above)."""
    r, h = rng(rec, "lane" + name), rec["h"]
    f = face(rec, name)
    w = f.width
    side = rec["sides"][name] == "open"
    f.quad((D, "plaster", 0), 0.0, w, 0.0, SHOP_H, 0.0, col=r.choice(LANE_WALLS))
    # (Its plinth is plaster too, so what is sprayed on the wall runs on
    # down it whole: in trim a tag came out as lone yellow strokes.)
    f.box((D, "plaster", 1), 0.0, w, 0.0, 0.95, 0.0, 0.06, col=(0.13, 0.13, 0.135, 1))
    k = (D, "metal", 1)
    conduit(f, 0.15, w - 0.15, G0 + 3.05, 0.05)
    if r.random() < 0.6:
        a = r.uniform(0.2, w * 0.4)
        conduit(f, a, r.uniform(w * 0.6, w - 0.2), G0 + 3.22, 0.04)
    s = r.uniform(0.3, 0.9) + 0.75
    doors, last_door, ladder = 0, -9.0, w > 4.5 and h < 23.0 and r.random() < 0.3
    lamp = -3.0   # where the last fixture was: no wall goes eight metres without one
    # (Round 3, its own stream: what every wall starts and ends with, a run
    # of services over its doors, and where that run is broken.)
    rx = rng(rec, "run" + name)
    J.put(rx.choice(("jt_pipes", "jt_pipes", "jt_meters")) if w > 3.0 else "jt_pipes", *f.p(f.at(0.5 if w <= 3.0 else 0.62), G0, 0.0), f.yaw)
    if w > 6.0:
        P.place("pipe_v", *f.p(f.at(w - 0.3), G0, 0.0), f.yaw, sy=h - G0, district=D)
    breaks = []
    fixtures, free = [], []
    high = []      # (s0, s1) of what reaches over head height (lane_high keeps off it)
    mid = []       # and what fills the wall between knee and head height (lane_mid)
    while s < w - 0.7:
        room = w - 0.3 - s
        if s - lamp > 7.0:
            # A caged lamp on the conduit, over head height.
            hue = "amber" if r.random() < 0.75 else "white"
            J.put("jt_sconce" if hue == "amber" else "jt_sconce_w", *f.p(f.at(s + 0.25), G0 + 2.82, 0.0), f.yaw)
            light(D, *f.p(f.at(s + 0.25), 2.8, 0.9), hue, 3.0)
            fixtures.append(s + 0.25)
            high.append((s, s + 0.5))
            lamp = s
            s += 0.6
            continue
        # By a cross alley's mouths, and where a stall or a column stands:
        # only what lies within a hand of the wall.
        flat = kept(f, s - 0.2, s + 1.6) or (side and (s < 2.4 or s > w - 3.8))
        roll = r.random()
        if (roll < 0.15 or (doors == 0 and s > w * 0.35)) and room > 1.35 and s - last_door > 4.0:
            lane_door(f, s + 0.65, r)
            fixtures.append(s + 0.65)
            high.append((s - 0.1, s + 1.4))
            mid.append((s - 0.1, s + 1.4))
            doors, last_door, lamp = doors + 1, s, s
            s += 1.3
        elif roll < 0.33 and room > 1.3:
            kind = r.choice([wk for wk in WINDOWS if wk[0] + 0.25 < room])
            lane_window(f, s + 0.12, r, kind)
            if kind[1] + kind[2] > 2.3:
                high.append((s, s + kind[0] + 0.25))
            mid.append((s, s + kind[0] + 0.25))
            if not flat and r.random() < 0.25:
                lane_stuff(f, s, kind[0], r, False)
            s += kind[0] + 0.25
        elif roll < 0.38 and room > 3.4 and not flat:
            sw = r.uniform(2.6, min(3.6, room - 0.3))
            lane_shutter(f, s + 0.15, sw, r)
            high.append((s, s + sw + 0.3))
            mid.append((s, s + sw + 0.3))
            fixtures.append(s + 0.15 + sw / 2)
            breaks.append((s - 0.1, s + sw + 0.4))
            lamp = s + sw / 2
            s += sw + 0.3
        elif roll < 0.5 and room > 1.0 and not flat:
            J.put("jt_ac", *f.p(f.at(s + 0.5), G0, 0.0), f.yaw, r.uniform(0.92, 1.12))
            high.append((s, s + 1.0))
            s += 1.0
        elif roll < 0.6 and room > 1.2:
            J.put("jt_meters", *f.p(f.at(s + 0.6), G0, 0.0), f.yaw)
            mid.append((s, s + 1.2))
            s += 1.2
        elif roll < 0.66 and room > 0.9:
            J.put("jt_vent", *f.p(f.at(s + 0.42), G0, 0.0), f.yaw)
            high.append((s, s + 0.85))
            mid.append((s, s + 0.85))
            VENTS.append(f.p(f.at(s + 0.42), 2.2, 0.2))
            s += 0.85
        elif roll < 0.71 and room > 0.8 and not flat:
            J.put("jt_duct", *f.p(f.at(s + 0.35), G0, 0.0), f.yaw, min(1.0, (h - 1.2) / 5.85))
            breaks.append((s - 0.1, s + 0.8))
            high.append((s - 0.1, s + 0.8))
            s += 0.7
        elif roll < 0.84 and room > 0.9:
            J.put("jt_pipes", *f.p(f.at(s + 0.4), G0, 0.0), f.yaw)
            high.append((s, s + 0.8))
            s += 0.8
        elif roll < 0.88 and ladder and room > 1.0 and not flat:
            n = math.ceil((h + 1.0 - 2.7) / 3.0)
            for i in range(n):
                sy = (h + 1.0 - 2.7) / (3.0 * n)
                J.put("jt_ladder", *f.p(f.at(s + 0.45), 2.7 + i * 3.0 * sy, 0.0), f.yaw, sy)
            ladder = False
            breaks.append((s - 0.1, s + 1.0))
            high.append((s - 0.1, s + 1.0))
            mid.append((s - 0.1, s + 1.0))
            s += 0.9
        elif not flat and room > 0.9:
            s += lane_stuff(f, s, room, r, side)
        else:
            free.append(s)
            s += 0.6
        s += r.uniform(0.2, 0.9) * 0.55
    services(f, 0.3, w - 0.3, breaks, rx)
    lane_more(f, w, fixtures, free, rng(rec, "more" + name))
    high += [(-1.0, 1.1), (w - 0.8, w + 1.0)]
    lane_high(f, w, rng(rec, "high" + name), high, h)
    lane_mid(f, w, rng(rec, "mid" + name), mid + [(-1.0, 0.9), (w - 0.9, w + 1.0)])
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
            rib(f, e, 0.0, SHOP_H, tcol, half=0.2, out=0.14)
        if i == door:
            # The door to the flats: a rendered bay, a steel door in its
            # frame under a lamp that lights it, the bells' panel lit by
            # it, the meters, a sign of bent tube over it.
            rd = random.Random(round(f.plane * 13.0 + a * 7.0))
            f2 = B.Face(f.name, f.plane + 0.07 * (f.nx or f.nz), f.a0, f.a1)
            f2.quad((D, "plaster", 0), a - 0.08, b + 0.08, 0.0, 3.3, 0.0, col=rd.choice(LANE_WALLS))
            sc = (a + b) / 2 - 0.35
            lane_door(f2, sc, rd)
            f2.quad((D, "glow", 0), sc + 0.72, sc + 0.9, G0 + 1.25, G0 + 1.6, 0.03, col=(0.25, 0.2, 0.12, 1))
            if b - a > 2.6:
                J.put("jt_meters", *f2.p(f2.at(sc + 1.65), G0, 0.0), f.yaw)
            strip(f2, rd.choice(("cyan", "pink", "green", "amber")), a + 0.1, b - 0.1, 3.36, 3.43, 0.06)
        elif r.random() < 0.86:
            f.quad((D, "shop", 0), a, b, 0.55, 3.3, 0.07, col=(r.uniform(0.75, 1.0), r.random(), 1.0 if r.random() < 0.92 else 0.0, 1.0))
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


def pad(xa, xb, za, zb, top, col, detail=0):
    """Pavers laid on a roof under what stands there (pale: see jt_parts)."""
    xa, xb = sorted((xa, xb))
    quad((D, "trim", detail), (xa, top + 0.05, zb), (xb, top + 0.05, zb), (xb, top + 0.05, za), (xa, top + 0.05, za), col=col)


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


def hut_dress(x, z, y, side):
    """What a deck's stair hut carries (round 5: "a flat beige box with one
    door and one lamp"), on dice of its own: a dark plinth and grime under
    its slab, a unit on one side wall dripping, a pipe down a corner, the
    meters by the door, a bill or two, a vent and a small tank or an aerial
    on its roof, a box sign by the door."""
    rh = random.Random(round(x * 17.0 + z * 31.0))
    gr = (0.035, 0.033, 0.03, 1)
    for zz, sgn_ in ((z - 1.1, -1), (z + 1.1, 1)):
        f = B.Face("+z" if sgn_ > 0 else "-z", zz, x - 1.0, x + 1.0)
        f.quad((D, "trim", 1), 0.0, 2.0, y, y + 0.22, 0.012, col=gr)
        f.quad((D, "trim", 1), 0.15, 1.85, y + 2.45, y + 2.68, 0.012, col=(0.06, 0.055, 0.05, 1))
        if (sgn_ > 0) == (rh.random() < 0.5):
            P.place("jt_ac", *f.p(f.at(rh.uniform(0.5, 1.5)), y + 0.9, 0.0), f.yaw, district=D)
        else:
            J.put("jt_bill", *f.p(f.at(rh.uniform(0.4, 1.4)), y + 1.1, 0.02), f.yaw, 1.0, 1.0)
    back = B.Face("-x" if side > 0 else "+x", x - side * 1.0, z - 1.1, z + 1.1)
    back.quad((D, "trim", 1), 0.0, 2.2, y, y + 0.22, 0.012, col=gr)
    P.place("pipe_v", *back.p(back.at(0.25), y, 0.0), back.yaw, sy=2.7, district=D)
    if rh.random() < 0.6:
        J.put("jt_vent", *back.p(back.at(1.4), y + 1.2, 0.0), back.yaw)
    dw = B.Face("+x" if side > 0 else "-x", x + side * 1.0, z - 1.1, z + 1.1)
    J.put("jt_meters", *dw.p(dw.at(0.15), y + SILL, 0.0), dw.yaw)
    J.board(dw, 1.88, y + 1.75, "bx", k=0.38, out=0.06)
    J.put("roof_vent", x - side * 0.4, y + 2.82, z + rh.uniform(-0.6, 0.6), rh.uniform(0, 6.28))
    J.put("jt_tank_r" if rh.random() < 0.5 else "antenna", x + side * 0.2, y + 2.82, z + rh.choice((-0.6, 0.6)), rh.uniform(0, 6.28), 0.55)


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
        hut_dress(x, z, y, side)
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
    sp = r.uniform(6.2, 7.4)
    J.put("jt_pipes", *here(sp), f.yaw)
    taken_ = [(sp - 0.4, sp + 0.4)]
    for s in (r.uniform(8.2, 9.6), r.uniform(11.5, 14.0))[:r.randrange(1, 3)]:
        if s < w - 1.0:
            J.put("jt_ac", *here(s), f.yaw, r.uniform(0.95, 1.1))
            taken_.append((s - 0.6, s + 0.6))
    a, b = here(6.0, 0.35), here(w - 0.6, 0.35)
    J.span("jt_festoon", (a[0], a[2]), (b[0], b[2]), top + 3.1, 0.45)
    # (Round 4, its own stream: the m8 review's "plain tan wall filling the
    # frame" from deck A.) At eye level, bills and small windows; over head
    # height what a lane's wall carries (lane_high), clear of the pipes, the
    # units and a tube sign's place in the middle.
    rw = random.Random(round(f.plane * 10) * 7919 + round(f.a0 * 10))
    high = [(-1.0, 0.8), (w - 0.8, w + 1.0), (w / 2 - 4.0, w / 2 + 4.0)]
    high += taken_
    s = rw.uniform(0.4, 1.2)
    while s < w - 1.2:
        if any(a_ - 0.3 < s < b_ + 0.3 for a_, b_ in high[3:]):
            s += 0.5
            continue
        roll = rw.random()
        if roll < 0.4:
            x, _, z = f.p(f.at(s + 0.98), top, 0.0)
            J.put("jt_bills", x, top + rw.uniform(0.95, 1.2), z, f.yaw)
            s += 2.3
        elif roll < 0.65:
            ww, wh = rw.choice(((0.9, 0.9), (1.2, 0.8), (0.7, 1.1)))
            y = top + 1.25
            f.quad((D, "shop", 0), s, s + ww, y, y + wh, 0.02, uvs=((1.0, 0.9), (1.0 + ww, 0.9), (1.0 + ww, 0.9 + wh), (1.0, 0.9 + wh)),
                   col=(rw.uniform(0.0, 0.5), rw.choice((0.2, 0.32, 0.6, 0.8)), 1.0, 1.0))
            x, _, z = f.p(f.at(s + ww / 2), y, 0.0)
            J.put("jt_win" if rw.random() < 0.5 else "jt_win_b", x, y, z, f.yaw, wh, ww)
            s += ww + 0.6
        elif roll < 0.8:
            x, _, z = f.p(f.at(s + 0.3), top, 0.0)
            J.put("jt_bill", x, top + rw.uniform(1.1, 1.5), z, f.yaw)
            s += 0.9
        else:
            s += rw.uniform(0.4, 1.0)
        s += rw.uniform(0.3, 1.0)
    lane_high(f, w, rw, high, top + 6.0, base=top)
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
            t = rs.uniform(0.7, 1.6)
            c = (J.DECK_TEAL[0] * t * rs.uniform(0.85, 1.25), J.DECK_TEAL[1] * t, J.DECK_TEAL[2] * t * rs.uniform(0.9, 1.1), 1)
            # (Round 3, its own dice: a slab relaid in new concrete, a patch
            # of tar where one cracked, one stained by a leak.)
            rp = random.Random(round(ua * 13.0 + za * 7.0 + x0 * 3.0))
            roll = rp.random()
            if roll < 0.14:
                c = (c[0] * 1.9 + 0.012, c[1] * 1.75 + 0.012, c[2] * 1.6 + 0.012, 1)
            elif roll < 0.3:
                c = (0.03, 0.027, 0.025, 1)
            elif roll < 0.38:
                c = (c[0] * 1.5 + 0.02, c[1] * 1.15 + 0.008, c[2] * 0.8, 1)
            xa, xc = sorted((X(ua + 0.035), X(ub - 0.035)))
            quad((D, "glow", 1), (xa, y + 0.012, zb - 0.035), (xc, y + 0.012, zb - 0.035), (xc, y + 0.012, za + 0.035), (xa, y + 0.012, za + 0.035), col=c)
            # (Round 5, dice of their own: "large flat two-tone squares with no
            # joints, stains or drains": each slab a pair of 1.2 m flags or
            # four, its joints dark, one in four with a stain spread on it.)
            rj = random.Random(round(ua * 11.0 + za * 5.0 + x0 * 7.0) + 1)
            jc = tuple(v * 0.35 for v in c[:3]) + (1,)
            mx, mz = (xa + xc) / 2, (za + zb) / 2
            if zb - za > 1.6:
                quad((D, "glow", 1), (xa, y + 0.014, mz + 0.016), (xc, y + 0.014, mz + 0.016), (xc, y + 0.014, mz - 0.016), (xa, y + 0.014, mz - 0.016), col=jc)
            if xc - xa > 1.6 and rj.random() < 0.6:
                quad((D, "glow", 1), (mx - 0.016, y + 0.014, zb - 0.035), (mx + 0.016, y + 0.014, zb - 0.035), (mx + 0.016, y + 0.014, za + 0.035), (mx - 0.016, y + 0.014, za + 0.035), col=jc)
            if rj.random() < 0.25:
                sx_, sz_, sr_ = rj.uniform(xa + 0.4, xc - 0.4), rj.uniform(za + 0.4, zb - 0.4), rj.uniform(0.3, 0.6)
                pts_ = [(sx_ + math.cos(a_) * sr_ * rj.uniform(0.6, 1.2), y + 0.016, sz_ + math.sin(a_) * sr_ * rj.uniform(0.6, 1.2)) for a_ in (-i_ * 1.2566 for i_ in range(5))]
                poly((D, "glow", 1), pts_, [(0, 0)] * 5, tuple(v * 0.55 for v in c[:3]) + (1,))
            # (Round 4: a crack across one slab in four, a grimy corner on another.)
            if rp.random() < 0.25:
                ca, cb = (xa + (xc - xa) * rp.uniform(0.1, 0.4), za + 0.1), (xa + (xc - xa) * rp.uniform(0.6, 0.9), zb - 0.1)
                quad((D, "glow", 1), (ca[0] - 0.02, y + 0.016, ca[1]), (ca[0] + 0.02, y + 0.016, ca[1]), (cb[0] + 0.02, y + 0.016, cb[1]), (cb[0] - 0.02, y + 0.016, cb[1]),
                     col=(0.004, 0.006, 0.007, 1))
            elif rp.random() < 0.2:
                gc = tuple(v * 0.45 for v in c[:3]) + (1,)
                poly((D, "glow", 1), [(xa + 0.035, y + 0.016, za + 0.55), (xa + 0.55, y + 0.016, za + 0.035), (xa + 0.035, y + 0.016, za + 0.035)], [(0, 0)] * 3, gc)
            za = zb
        ua = ub
    parapet(x0, x1, z0, z1, top, tcol, h=0.25, t=0.2)
    # (Round 4: its edge lit, the m8 review's "rim or edge light on the roof
    # decks": a strip along the parapet's inner foot, its light on the deck.)
    rim_hue = random.Random(round(x0 * 31 + z0 * 17) + 4099).choice(("cyan", "magenta", "pink", "amber"))   # (not the deck's own stream)
    for (ax, az), (bx, bz) in (((x0 + 0.21, z1 - 0.21), (x1 - 0.21, z1 - 0.21)), ((x1 - 0.21, z0 + 0.21), (x0 + 0.21, z0 + 0.21)),
                               ((x0 + 0.21, z0 + 0.21), (x0 + 0.21, z1 - 0.21)), ((x1 - 0.21, z1 - 0.21), (x1 - 0.21, z0 + 0.21))):
        quad((D, "glow", 0), (ax, y + 0.03, az), (bx, y + 0.03, bz), (bx, y + 0.09, bz), (ax, y + 0.09, az), col=GLOW[rim_hue])
        quad((D, "glow", 0), (bx, y + 0.03, bz), (ax, y + 0.03, az), (ax, y + 0.09, az), (bx, y + 0.09, bz), col=GLOW[rim_hue])
    light(D, X(w - 0.8), top + 0.6, (z0 + z1) / 2, rim_hue, 4.0)
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
    # (The glass stops short of the hut's door, z1 - 1.7, and a second pair
    # of steps comes down from it: the lit rail ran across the doorway.)
    ga, gb = (gx, top + 0.9, z0 + 2.1), (gx, top + 0.9, min(z1 - 0.4, z1 - 2.95))
    for i, hh in enumerate((0.6, 0.3)):
        sa, sb = sorted((X(tu + 0.35 * i), X(tu + 0.35 * (i + 1))))
        box((D, "concrete", 1), sa, sb, top, top + hh, z1 - 2.75, z1 - 0.65, scale=3.0)
    # (Round 5: the glass read as a near-black slab from the deck, and its
    # lit top as "a floating laser line" at eye height: a steel rail of
    # posts and two rails along the terrace's edge instead, and the light a
    # thin line along the terrace's lip, under the knee.)
    zr = gb[2]
    if zr - z0 - 2.1 > 0.5:
        n_ = max(1, round((zr - z0 - 2.1) / 3.0))
        for i_ in range(n_):
            J.put("jt_rail", gx, top + 0.9, z0 + 2.1 + (zr - z0 - 2.1) * (i_ + 0.5) / n_, -HALF_PI, 0.62, (zr - z0 - 2.1) / (2.0 * n_))
        la, lb = sorted((X(tu), X(tu + 0.025)))
        box((D, "glow", 0), la, lb, top + 0.8, top + 0.825, z0 + 2.1, zr, scale=1.0, col=tuple(v * 0.35 for v in GLOW["cyan"][:3]) + (1,), bottom=True)
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
        J.put("drum", X(tu + 2.2), top + 0.1, z1 - 0.8, r.uniform(-0.2, 0.2))
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
        tree(X(tu + (w - tu) * 0.5), top + 0.1, (z0 + z1) / 2 - side * 0.9, r.uniform(0, 6.28), pit=False, sxz=0.75)
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
    kit = ["jt_chairs", "jt_deckbits", "drum", "jt_planter", "jt_deckbits", "bench", "bags", "jt_deckbits", "barrel", "jt_chairs", "jt_deckbits", "barrel",
           "jt_plants", "pallets", "jt_cooler", "drum", "jt_deckbits", "jt_plants", "rubbish", "jt_stools"]
    n_kit, done, tries = min(len(kit), int((w - tu) * d / 17)), 0, 0
    while done < n_kit and tries < 60 and w - tu > 5.0 and d > 5.0:
        tries += 1
        px, pz = X(rs.uniform(tu + 1.3, w - 2.2)), rs.uniform(z0 + 1.7, z1 - 1.7)
        if any(math.hypot(px - tx, pz - tz) < tr_ + 1.2 for tx, tz, tr_ in taken):
            continue
        name = kit[done]
        yaw = rs.uniform(0, 6.28)
        if name == "bench":
            bench(px, pz, yaw, rs, top + 0.1)
        elif name == "jt_stools":
            stools(px, pz, yaw, rs, top + 0.1)
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
    # (Round 5, dice of their own: "props are sparse and scattered": more to
    # sit on and more growing, and bulbs strung from the hut's roof to a
    # pole at the outlook's corner.)
    rk = random.Random(round(x0 * 29.0 + z0 * 13.0) + 77)
    more = ["jt_chairs", "jt_plants", "bench", "jt_planter", "jt_stools", "jt_plants", "jt_chairs", "jt_planter", "jt_plants", "bench"]
    n_more, done, tries = min(len(more), int((w - tu) * d / 16)), 0, 0
    while done < n_more and tries < 50 and w - tu > 5.0 and d > 5.0:
        tries += 1
        px, pz = X(rk.uniform(tu + 1.0, w - 1.6)), rk.uniform(z0 + 1.3, z1 - 1.3)
        if any(math.hypot(px - tx, pz - tz) < tr_ + 1.1 for tx, tz, tr_ in taken):
            continue
        name, yaw = more[done], rk.uniform(0, 6.28)
        if name == "bench":
            bench(px, pz, yaw, rk, top + 0.1)
        elif name == "jt_stools":
            stools(px, pz, yaw, rk, top + 0.1)
        else:
            J.put(name, px, top + 0.1, pz, yaw)
            if name == "jt_chairs" and rk.random() < 0.6:
                qx, qz = loc(px, pz, yaw, 0.8, 0.0)
                stand(qx, qz, yaw - HALF_PI, "sit", top + 0.56)
        taken.append((px, pz, 1.3))
        done += 1
    if d > 6.5 and w - tu > 7.0:
        pz_ = z0 + 0.55
        J.put("jt_pole", X(w - 0.55), top + 0.1, pz_)
        J.span("jt_festoon", (X(1.6), z1 - 1.7), (X(w - 0.55), pz_), top + 3.6, 0.9)
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


def sky_word(rec):
    """What the tall lots on the street carry over its roofline
    (Fn9gKhU_2_Q@39, ax5YUmkWf_Y@112): a word in standing letters on a frame
    at the roof's street edge, turned a little up or down the street; and
    on the two towers, their name in kana down a fin off the face."""
    x0, x1, z0, z1, _, top = rec["tiers"][-1]
    rw = rng(rec, "word")
    sgn = 1 if rec["front"] == "+x" else -1
    xf, d = (x1 if sgn > 0 else x0), z1 - z0
    hue = rw.choice(("pink", "red", "amber", "cyan", "green", "magenta", "white", "red"))
    if rec["h"] > 40.0:
        zf = z1 - 1.6 if (z0 + z1) / 2 > HIGH_Z else z0 + 1.6
        c = (xf + sgn * 1.9, 20.0, zf)
        text = J.F.pick(J.F.KANA, c, 5, (1, 0))
        ch = 14.0 / (len(text) * 1.14)
        obox((D, "board_frame", 0), c, basis(0.0), 0.3, 15.0, 3.2)
        for yaw in (0.0, math.pi):
            b = basis(yaw - HALF_PI)
            J.letters(pt(c, b, 0.0, 0.0, 0.28), b, text, min(2.6, ch), hue, depth=0.2, vertical=True)
        for y in (13.2, 20.0, 26.8):
            box((D, "metal", 1), min(xf, c[0]), max(xf, c[0]), y - 0.06, y + 0.06, zf - 0.06, zf + 0.06, scale=1.0)
        light(D, c[0], 8.0, zf, hue, 5.0)
    if rec.get("roof") in ("sign", "deck", "crown"):
        return
    kana = rw.random() < 0.6
    n = max(2, min(5 if kana else 7, int((d - 0.8) / (2.2 * (1.12 if kana else 0.9)))))
    c0 = (xf - sgn * 0.8, top + 1.3, (z0 + z1) / 2)
    text = J.F.pick(J.F.KANA if kana else J.F.LATIN, c0, n, (1, 0) if kana else (2, 0))
    ch = min(2.6, (d - 0.8) / (len(text) * (1.12 if kana else 0.9)))
    yaw = HALF_PI * sgn + rw.uniform(-0.3, 0.3)
    b = basis(yaw)
    c = (c0[0], top + 1.3 + ch / 2, c0[2])
    wd, _ = J.letters(c, b, text, ch, hue, depth=0.3, both=True, sides=True)
    for v in (ch * 0.22, ch * 0.78):
        obox((D, "trim", 1), pt((c[0], top + 1.3 + v, c[2]), b, 0.0, 0.0, -0.22), b, wd + 0.4, 0.09, 0.09, col=ESCAPE, tube=True)
    for du in (-wd * 0.42, 0.0, wd * 0.42):
        px, _, pz = pt(c, b, du, 0.0, -0.22)
        box((D, "trim", 1), px - 0.06, px + 0.06, top, top + 1.3 + ch * 0.8, pz - 0.06, pz + 0.06, scale=1.0, col=ESCAPE)
    light(D, c[0] - sgn * 1.5, top + 1.0, c[2], hue, 5.0)


ROOF_R = {"jt_shack": 2.6, "jt_shack_b": 2.6, "jt_tank": 1.7, "jt_tank_r": 1.7, "jt_cooler": 1.6, "jt_ductrun": 2.2, "jt_solar": 1.9, "jt_bed": 1.8, "jt_sheets": 2.8,
          "jt_hutdoor": 2.2, "jt_laundry": 2.2, "tank_roof": 1.6, "jt_stools": 1.2}
ROOF_KIT = (("units", 2.2), ("jt_ductrun", 2.3), ("light", 1.6), ("jt_cooler", 1.7), ("units", 2.2), ("light", 1.6), ("jt_tank", 1.8), ("antenna", 0.6), ("jt_solar", 2.0),
            ("light", 1.6), ("dish", 0.8), ("jt_laundry", 2.2), ("jt_bed", 1.8), ("units", 2.2), ("barrel", 0.8), ("jt_ductrun", 2.3))
_ON_ROOF = {}


def rooflight(x, z, top, r, w=1.2, d=2.4, lit=True):
    """A roof light as the air sees it: the kit's glazing in a pale kerb,
    flush (skylight() is the one a deck walks round)."""
    quad((D, "trim", 1), (x - w / 2 - 0.14, top + 0.05, z + d / 2 + 0.14), (x + w / 2 + 0.14, top + 0.05, z + d / 2 + 0.14), (x + w / 2 + 0.14, top + 0.05, z - d / 2 - 0.14),
         (x - w / 2 - 0.14, top + 0.05, z - d / 2 - 0.14), col=(0.3, 0.3, 0.31, 1))
    quad((D, "skylight", 0), (x - w / 2, top + 0.08, z + d / 2), (x + w / 2, top + 0.08, z + d / 2), (x + w / 2, top + 0.08, z - d / 2), (x - w / 2, top + 0.08, z - d / 2),
         col=r.choice(((1.0, 0.89, 0.72, 1), (1.0, 0.8, 0.55, 1), (0.75, 0.95, 1.0, 1), (1.0, 0.89, 0.72, 1))))
    if lit:
        light(D, x, top + 0.5, z, r.choice(("amber", "amber", "cyan", "white", "pink")), 3.5)


def roof_more(rec):
    """What the air sees on a roof besides what its kind put there (the
    review: "large dark slabs", "dark empty rectangles"): a walk of pale
    pavers from the stair hut, and on what is left free, by the roof's
    size, rows of units on a pad, ducts, chillers, roof lights lit from
    under, a tank, a mast, a dish, panels, washing, beds."""
    kind = rec.get("roof")
    x0, x1, z0, z1, _, top = rec["tiers"][-1]
    w, d = x1 - x0, z1 - z0
    if kind in ("deck", "court", "pad", "crown", None) or w * d < 50.0 or min(w, d) < 5.0:
        return
    r = rng(rec, "more")
    if not _ON_ROOF:
        for i in P.INSTANCES:
            if i[7] == D and i[2] > 7.0:
                _ON_ROOF.setdefault(int(i[3] // 16), []).append(i)
    here = [i for kz in range(int(z0 // 16), int(z1 // 16) + 1) for i in _ON_ROOF.get(kz, ()) if x0 < i[1] < x1 and z0 < i[3] < z1 and abs(i[2] - top) < 1.2]
    taken = [(i[1], i[3], ROOF_R.get(i[0], 1.0)) for i in here]
    # The walk: from the hut's door out along the roof.
    for i in here:
        if i[0] == "jt_hutdoor":
            dx = math.sin(i[4])
            xa, xb = sorted((i[1] + dx * 0.4, max(x0 + 0.6, min(x1 - 0.6, i[1] + dx * min(9.0, w * 0.5)))))
            if xb - xa > 2.0:
                pad(xa, xb, i[3] - 0.5, i[3] + 0.5, top, r.choice(PAVERS), 1)
                za, zb = sorted((i[3], max(z0 + 0.8, min(z1 - 0.8, i[3] + r.choice((-1, 1)) * d * 0.4))))
                ex = xb if dx > 0 else xa
                if zb - za > 2.0:
                    pad(ex - 0.5, ex + 0.5, za, zb, top, r.choice(PAVERS), 1)
            break
    want, done, tries = min(len(ROOF_KIT), int(w * d / 24.0)), 0, 0
    while done < want and tries < 50:
        tries += 1
        name, rad = ROOF_KIT[(done + rec["seed"]) % len(ROOF_KIT)]
        px, pz = r.uniform(x0 + rad + 0.5, x1 - rad - 0.5), r.uniform(z0 + rad + 0.5, z1 - rad - 0.5)
        if any(math.hypot(px - tx, pz - tz) < tr_ + rad for tx, tz, tr_ in taken):
            continue
        yaw = r.choice((0.0, HALF_PI, math.pi, -HALF_PI))
        if name == "units":
            along = (1.0, 0.0) if w > d else (0.0, 1.0)
            pad(px - (2.0 * along[0] + 0.7), px + (2.0 * along[0] + 0.7), pz - (2.0 * along[1] + 0.7), pz + (2.0 * along[1] + 0.7), top, r.choice(PAVERS), 1)
            for j in (-1, 0, 1):
                J.put("ac_roof", px + j * 1.35 * along[0], top + 0.05, pz + j * 1.35 * along[1], yaw)
        elif name == "light":
            rooflight(px, pz, top, r, 1.2, 2.4 if d > 7.0 else 1.2, lit=rec["seed"] % 3 == 0)
        elif name in ("jt_tank", "antenna", "dish"):
            pick_ = r.choice(("jt_tank", "jt_tank_r")) if name == "jt_tank" else name
            J.put(pick_, px, top, pz, r.uniform(0, 6.28), r.uniform(0.85, 1.3) if name != "jt_tank" else r.uniform(0.8, 1.05), 1.0)
        else:
            J.put(name, px, top + (0.05 if name == "jt_cooler" else 0.0), pz, yaw)
        taken.append((px, pz, rad))
        done += 1
    # (Round 5, a stream of its own: "flat navy roof slabs with a few
    # boxes": the roof's membrane patched and seamed in tar and newer
    # sheet, and the kit's roof plant on what is still free: a tank, a
    # condenser on its duct, turbine vents, a dish or a cable tray.)
    rq = rng(rec, "plant5")
    for _ in range(rq.randrange(2, 5)):
        pw, pd = rq.uniform(1.2, min(4.5, w * 0.5)), rq.uniform(1.0, min(3.5, d * 0.5))
        px, pz = rq.uniform(x0 + 0.5 + pw / 2, x1 - 0.5 - pw / 2), rq.uniform(z0 + 0.5 + pd / 2, z1 - 0.5 - pd / 2)
        col = rq.choice(((0.03, 0.03, 0.034, 1), (0.1, 0.105, 0.11, 1), (0.06, 0.058, 0.055, 1), (0.13, 0.125, 0.115, 1)))
        quad((D, "trim", 1), (px - pw / 2, top + 0.03, pz + pd / 2), (px + pw / 2, top + 0.03, pz + pd / 2), (px + pw / 2, top + 0.03, pz - pd / 2), (px - pw / 2, top + 0.03, pz - pd / 2), col=col)
    if w * d >= 70.0 and kind in ("shack", "plant", "solar", "laundry", "sign", "garden"):
        rects = [(tx - tr_, tx + tr_, tz - tr_, tz + tr_) for tx, tz, tr_ in taken]
        plant_on(x0 + 0.5, x1 - 0.5, z0 + 0.5, z1 - 0.5, top, rq, rects, n_vents=rq.randrange(2, 5), tank=not any(i[0] in ("jt_tank", "jt_tank_r", "tank_roof", "roof_tank") for i in here), hut=False, mast=None)


def av_pad(rec):
    """A landing pad painted on a tall roof of the outer row: a dark apron,
    a yellow ring and a cross in it, lights round its edge, a windsock's
    mast (what flies is the traffic's)."""
    x0, x1, z0, z1, _, top = rec["tiers"][-1]
    cx, cz, rad = (x0 + x1) / 2 + 2.0, (z0 + z1) / 2, min(x1 - x0, z1 - z0) * 0.5 - 2.4
    pad(cx - rad - 1.0, cx + rad + 1.0, cz - rad - 1.0, cz + rad + 1.0, top, (0.07, 0.075, 0.085, 1))
    segs = 20
    for i in range(segs):
        t0, t1 = i * math.tau / segs, (i + 1) * math.tau / segs
        q = [(cx + rr * math.cos(t), top + 0.08, cz + rr * math.sin(t)) for rr, t in ((rad, t0), (rad - 0.35, t0), (rad - 0.35, t1), (rad, t1))]
        quad((D, "paint", 0), *q, col=(0.7, 0.55, 0.08, 1))
        if i % 2 == 0:
            box((D, "glow", 0), q[0][0] - 0.07, q[0][0] + 0.07, top + 0.06, top + 0.16, q[0][2] - 0.07, q[0][2] + 0.07, scale=1.0, col=GLOW["green"] if i % 4 else GLOW["amber"])
    for a, b in (((-0.25, -rad * 0.55), (0.25, rad * 0.55)), ((-rad * 0.55, -0.25), (rad * 0.55, 0.25))):
        quad((D, "paint", 0), (cx + a[0], top + 0.08, cz + b[1]), (cx + b[0], top + 0.08, cz + b[1]), (cx + b[0], top + 0.08, cz + a[1]), (cx + a[0], top + 0.08, cz + a[1]), col=(0.7, 0.55, 0.08, 1))
    J.put("antenna", cx - rad - 1.6, top, cz - rad, 0.0, 1.3)
    for dx_, dz_ in ((-1, -1), (1, 1)):
        light(D, cx + dx_ * rad * 0.6, top + 1.0, cz + dz_ * rad * 0.6, "amber", 5.0)


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
        if rec["seed"] % 4 == 0:
            VENTS.append((X(u0), top + 1.7, zz, "roof"))
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
            u += r.uniform(1.5, 2.1) + 0.9
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
    elif kind == "pad":
        av_pad(rec)
        hut(X(w - 2.0), z0 + 1.7, top, tcol, r)
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
# What stands over the low roofs (the m8 review: "generic flat-topped
# rectangular towers with the same uniform window grid, no crown, setback,
# antenna or roof equipment"; KvMY1uzSC1E@190, ax5YUmkWf_Y@131): a lot of
# seven storeys or more whose roof is not a deck, a sign or a court is
# crowned, by its own dice, with a stepped crown (one to three set-back
# storeys of windows under a lit band, a plant room over them), a raked
# crown of dark glass with its high edge lit, a fin off its corner with its
# name down it, or plant only; the kit's roof plant on what is left of the
# roof, a mast with a red lamp at a corner; a screen at mid height on the
# tallest; and every tall lot's faces over its neighbours in clusters of
# lit and dark windows. Nothing the hero's lens sees is touched.
# ---------------------------------------------------------------------------
CROWNS = []     # (row, z0, kind, its top)
ZZ_VENTS = []   # the crowns' own vents, named to sort after the old ones (the page's plumes keep their deal)


CHANNEL = []    # (row, z0, kind, word)


def channel_plan(rec):
    """Whether a street front of three storeys or more carries a sign the
    size of the building (the m8 review: "few building-scale channel-letter
    signs ... almost no signage above the second or third floor"), and
    where its band starts (the front's own signs keep under it)."""
    if rec["row"] not in ("A", "E") or rec["h"] < storeys(3) - 0.1 or rec["lot"].z0 == DECK_TOWERS.get("axis"):
        return None
    rc = rng(rec, "chan4")
    if rc.random() > 0.5:
        return None
    lot = rec["lot"]
    corner = any(rec["sides"].get(n) in ("open", "street") for n in ("-z", "+z")) and rc.random() < 0.8
    if hero_sees((lot.x0, 0.0, lot.z0), (lot.x1, rec["h"] + 1.0, lot.z1)):
        return None
    if corner:
        return ("corner", storeys(2) + 0.2, rc)
    return ("run", rec["h"] - 2.9, rc)


def channel_sign(rec, plan):
    """A word in channel letters along a front's top floor on a raceway, lit
    and washing the wall; or at a corner a fin turned off the front toward
    the street it turns into, its name down both faces."""
    kind, y0, r = plan
    f = face(rec, rec["front"])
    w, h = f.width, rec["h"]
    hue = r.choice(("red", "pink", "amber", "cyan", "white", "green", "magenta", "amber"))
    if kind == "run":
        kana = r.random() < 0.45
        cwk = 1.12 if kana else 0.9
        n = max(2, min(4 if kana else 6, int((w - 1.2) / (1.65 * cwk))))
        c0 = f.p(f.at(w / 2), y0 + 1.0, 0.36)
        text = J.F.pick(J.F.KANA if kana else J.F.LATIN, c0, n, (2, 1))
        lh = min(2.4, (w - 1.2) / (len(text) * cwk), h - y0 - 0.4)
        if lh < 0.85:
            return
        c = f.p(f.at(w / 2), y0 + 0.2 + lh / 2, 0.36)
        wd, _ = J.letters(c, basis(f.yaw), text, lh, hue, depth=0.22)
        yc = y0 + 0.2 + lh / 2
        f.box((D, "board_frame", 0), w / 2 - wd / 2 - 0.35, w / 2 + wd / 2 + 0.35, yc - 0.13, yc + 0.13, 0.04, 0.24)
        for du in (-wd * 0.35, wd * 0.35):
            f.box((D, "metal", 1), w / 2 + du - 0.04, w / 2 + du + 0.04, yc - lh / 2 - 0.15, yc + lh / 2, 0.02, 0.06)
        light(D, *f.p(f.at(w / 2), yc - 0.6, 1.0), hue, 6.0)
        CHANNEL.append((rec["row"], round(rec["lot"].z0, 1), "run", text))
        return
    # The corner fin: at the end of the front by the open side.
    lot = rec["lot"]
    end = "-z" if rec["sides"].get("-z") in ("open", "street") else "+z"
    s = 0.3 if (f.at(0.3) - (lot.z0 if end == "-z" else lot.z1)) ** 2 < (f.at(w - 0.3) - (lot.z0 if end == "-z" else lot.z1)) ** 2 else w - 0.3
    turn = (0.75 if end == "+z" else -0.75) * (1 if f.nx > 0 else -1)
    y1 = min(h - 0.5, y0 + r.uniform(6.5, 9.5))
    if y1 - y0 < 4.5:
        return
    fw = r.uniform(1.6, 2.1)
    phi = f.yaw + turn
    px, _, pz = f.p(f.at(s), 0.0, 0.0)
    out = 0.4 + fw / 2
    c = (px + math.sin(phi) * out, (y0 + y1) / 2, pz + math.cos(phi) * out)
    b = basis(phi + HALF_PI)
    obox((D, "board_frame", 0), c, b, fw, y1 - y0, 0.32)
    text = J.F.pick(J.F.KANA, c, max(2, min(5, int((y1 - y0 - 0.8) / 1.7))), (1, 0))
    lh = min(fw * 0.62, (y1 - y0 - 0.8) / (len(text) * 1.14))
    for yaw in (0.0, math.pi):
        bb = basis(phi + HALF_PI + yaw)
        J.letters(pt(c, bb, 0.0, 0.0, 0.19), bb, text, lh, hue, depth=0.14, vertical=True)
    for y in (y0 + 0.6, (y0 + y1) / 2, y1 - 0.6):
        a = (px, y, pz)
        e = (px + math.sin(phi) * 0.45, y, pz + math.cos(phi) * 0.45)
        pipe((D, "metal", 1), a, e, 0.05, segs=4)
    for sd in (-1, 1):
        q = pt(c, b, sd * (fw / 2 + 0.02), 0.0, 0.0)
        box((D, "glow", 0), q[0] - 0.03, q[0] + 0.03, y0 + 0.1, y1 - 0.1, q[2] - 0.03, q[2] + 0.03, scale=1.0, col=GLOW[hue])
    light(D, c[0], y0 + 1.0, c[2], hue, 5.0)
    CHANNEL.append((rec["row"], round(rec["lot"].z0, 1), "corner", text))


def crowned(rec):
    """Whether a lot is crowned rather than given one of roof()'s kinds (the
    kind roof() would deal it is read from its own stream, not drawn)."""
    if rec is LUCY_LOT or id(rec) in BY_DECK or rec["h"] < storeys(7) - 0.1:
        return False
    x0, x1, z0, z1, _, top = rec["tiers"][-1]
    if hero_sees((x0, 0.0, z0), (x1, top + 1.0, z1)):
        return False
    if rec["row"] in TOWERS and rec["lot"].z0 <= HIGH_Z <= rec["lot"].z1:
        return True
    kind = rng(rec, "roof").choice([k for k, wt in ROOFS_W[rec["row"]] for _ in range(wt)])
    if kind in ("deck", "sign", "court"):
        return False
    return kind in ("plant", "solar") or rng(rec, "crown4").random() < 0.5


def clear_top(x0, x1, z0, z1, y, least):
    """The highest top up to y a mass on (x0..x1, z0..z1) may have unseen by
    the hero's lens, or None under `least`."""
    while y >= least:
        if not hero_sees((x0, 0.0, z0), (x1, y, z1)):
            return y
        y -= 0.5
    return None


def clusters(f, y0, y1, r, tint):
    """Windows over a face from y0 to y1 in clusters: bands of one to three
    storeys, each cut into one to three runs at the bays, each run its own
    kind of window and its own share lit, from dark floors to whole lit
    ones (f a hair proud of the wall)."""
    w = f.width
    bays = max(1, round(w / CELL_W))
    bw = w / bays
    yy = y0
    while yy < y1 - 0.5:
        yb = min(y1, yy + r.choice((1, 1, 2, 3)) * CELL_H)
        cuts = sorted(r.sample(range(1, bays), min(bays - 1, r.choice((0, 1, 1, 2))))) if bays > 1 else []
        kind = r.choice(WIN_KINDS)
        for a, b in zip([0] + cuts, cuts + [bays]):
            roll = r.random()
            share = r.uniform(0.02, 0.1) if roll < 0.32 else (r.uniform(0.3, 0.6) if roll < 0.7 else r.uniform(0.85, 1.0))
            B.facade_wall((D, "facade", 0), f, yy, yb, B.wall_col(share, kind if r.random() < 0.75 else r.choice(WIN_KINDS), r.uniform(0.3, 1.0), tint),
                          float(r.randrange(40)), a * bw, b * bw)
        yy = yb


def tall_faces(rec):
    """Window clusters on a tall lot's faces where its neighbours leave them
    bare (not a front the row dresses itself, nor the deck's towers)."""
    lot, h = rec["lot"], rec["h"]
    if rec is LUCY_LOT or h < storeys(7) - 0.1 or lot.z0 in DECK_TOWERS.values():
        return
    r = rng(rec, "clusters")
    x0, x1, z0, z1, _, top = rec["tiers"][0]
    for name, f in B.faces_of(x0, x1, z0, z1).items():
        kind = rec["sides"].get(name, "back")
        if name == rec["front"]:
            if rec["row"] == "C":
                continue
            lo = storeys(4)
        elif kind == "party":
            lo = max(storeys(3), lot.neighbours.get(name, 0.0) + 0.4)
        else:
            lo = storeys(3)
        hi = min(top, rec["tiers"][1][4]) if len(rec["tiers"]) > 1 else top
        if hi - lo < CELL_H:
            continue
        fo = B.Face(f.name, f.plane + 0.035 * (f.nx or f.nz), f.a0, f.a1)
        clusters(fo, lo, hi - 0.6, r, rec["tint"])


def band(x0, x1, z0, z1, y, hue, h=0.14):
    """A lit band round a mass (the glow, so the bake leaves it alone)."""
    walls((D, "glow", 0), [(x0 - 0.05, z1 + 0.05), (x1 + 0.05, z1 + 0.05), (x1 + 0.05, z0 - 0.05), (x0 - 0.05, z0 - 0.05)], y, y + h, GLOW[hue])


def beacon(x, y, z):
    """A red lamp on a short post (for what flies)."""
    box((D, "metal", 1), x - 0.04, x + 0.04, y, y + 0.9, z - 0.04, z + 0.04, scale=0.5)
    box((D, "glow", 0), x - 0.14, x + 0.14, y + 0.9, y + 1.12, z - 0.14, z + 0.14, scale=1.0, col=GLOW["red"])


def tier(x0, x1, z0, z1, y0, y1, r, tint, hue, plain=False):
    """A set-back storey or three on a roof: windows on its four faces (or
    a plant room's louvred wall), a cornice, a lit band under it, its roof."""
    tcol = B.TRIM[tint]
    col = B.wall_col(r.uniform(0.35, 0.95), r.choice(WIN_KINDS), r.uniform(0.3, 1.0), tint)
    ov = float(r.randrange(40))
    for f in B.faces_of(x0, x1, z0, z1).values():
        if plain:
            f.quad((D, "trim", 0), 0.0, f.width, y0, y1, 0.0, col=tcol)
            for yy in (y0 + 0.6, y0 + 1.0, y0 + 1.4):
                f.box((D, "trim", 1), 0.4, f.width - 0.4, yy, yy + 0.08, 0.0, 0.06, col=(0.03, 0.032, 0.036, 1))
        else:
            B.facade_wall((D, "facade", 0), f, y0, y1, col, ov)
        f.ledge((D, "trim", 1), 0.0, f.width, y1 - 0.4, 0.4, 0.2, tcol)
    band(x0, x1, z0, z1, y1 - 0.85, hue, 0.3)
    if not plain:
        # Its corners outlined in the same light, up from the roof.
        for cx_, cz_ in ((x0, z0), (x1, z0), (x1, z1), (x0, z1)):
            box((D, "glow", 0), cx_ - 0.09, cx_ + 0.09, y0 + 0.3, y1 - 0.85, cz_ - 0.09, cz_ + 0.09, scale=1.0, col=GLOW[hue])
    quad((D, "roof", 0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0), ((0, 0), ((x1 - x0) / 4, 0), ((x1 - x0) / 4, (z1 - z0) / 4), (0, (z1 - z0) / 4)))
    B.COLLISION.append(("box", x0, x1, y0, y1, z0, z1, D))


FOOT = {"roof_hut": (2.6, 2.5), "roof_tank": (2.6, 2.6), "roof_condenser": (3.6, 1.0), "roof_duct": (4.0, 0.6), "roof_vent": (0.7, 0.7),
        "roof_dish": (1.8, 1.8), "roof_tray": (3.0, 0.3)}


def plant_on(x0, x1, z0, z1, top, r, taken, n_vents=4, tank=True, hut=True, mast=None):
    """The kit's roof plant on a roof (the catalogue's dressed roof): the
    stair hut, a tank, condensers backed by a duct, vents, a dish (unless a
    mast is to stand there), trays between. taken: rectangles (x0, x1, z0,
    z1) already used, and what is set down is added to it."""
    def fits(x, z, hw, hd):
        return (x0 + hw < x < x1 - hw and z0 + hd < z < z1 - hd
                and not any(x + hw > a0 and x - hw < a1 and z + hd > b0 and z - hd < b1 for a0, a1, b0, b1 in taken))

    def half(name, yaw):
        w_, d_ = FOOT[name]
        return (w_ / 2 + 0.15, d_ / 2 + 0.15) if abs(math.sin(yaw)) < 0.5 else (d_ / 2 + 0.15, w_ / 2 + 0.15)

    def place(name, tries=24):
        for _ in range(tries):
            yaw = r.choice((0.0, HALF_PI, math.pi, -HALF_PI))
            hw, hd = half(name, yaw)
            if x1 - x0 < 2 * hw + 0.1 or z1 - z0 < 2 * hd + 0.1:
                continue
            x, z = r.uniform(x0 + hw, x1 - hw), r.uniform(z0 + hd, z1 - hd)
            if fits(x, z, hw, hd):
                J.put(name, x, top, z, yaw)
                taken.append((x - hw, x + hw, z - hd, z + hd))
                return x, z, yaw
        return None
    if hut:
        place("roof_hut")
    if tank:
        place("roof_tank")
    for k in range(2 if (x1 - x0) * (z1 - z0) > 160.0 else 1):
        c = place("roof_condenser")
        if c:
            x, z, yaw = c
            # Its duct behind it (a condenser's back is its -z, turned by its yaw).
            bx, bz = x - math.sin(yaw) * 0.88, z - math.cos(yaw) * 0.88
            hw, hd = half("roof_duct", yaw)
            if fits(bx, bz, hw, hd - 0.15):
                J.put("roof_duct", bx, top, bz, yaw)
                taken.append((bx - hw, bx + hw, bz - hd, bz + hd))
            if k == 0 and r.random() < 0.5:
                ZZ_VENTS.append((x, top + 1.3, z))
    for _ in range(n_vents):
        place("roof_vent", tries=8)
    if mast is None:
        place("roof_dish")
    if (x1 - x0) * (z1 - z0) > 90.0:
        place("roof_tray", tries=8)


def mast_at(x, z, top, h):
    """The kit's lattice mast (red lamp on its tip), as tall as the hero's
    lens allows, or a beacon on a post where it allows nothing."""
    for sy in (h / 8.2, h * 0.75 / 8.2, h * 0.5 / 8.2):
        if sy >= 0.45 and not hero_sees((x - 0.4, 0.0, z - 0.4), (x + 0.4, top + 8.2 * sy + 0.3, z + 0.4)):
            J.put("roof_mast", x, top, z, 0.0, sy)
            return top + 8.2 * sy
    if not hero_sees((x - 0.2, 0.0, z - 0.2), (x + 0.2, top + 1.2, z + 0.2)):
        beacon(x, top, z)
    return top


def screen_mid(rec, f, r, y0, y1):
    """A screen at mid height on a tall face, on brackets, lamps over it."""
    w = f.width
    sw = min(w - 2.0, 9.6)
    sh = min(y1 - y0, sw * r.choice((0.56, 0.75, 1.4)))
    if sw < 4.0 or sh < 3.0:
        return
    cy = y0 + (y1 - y0) * r.uniform(0.35, 0.6)
    cy = max(y0 + sh / 2, min(y1 - sh / 2, cy))
    cx, _, cz = f.p(f.at(w / 2), cy, 0.45)
    x, y, z = B.billboard(D, cx, cy, cz, sw, sh, f.yaw, r, back=False, depth=0.32)
    b = basis(f.yaw)
    for du in (-sw * 0.33, 0.0, sw * 0.33):
        obox((D, "metal", 1), pt((x, y + sh / 2 + 0.35, z), b, du, 0.0, 0.25), b, 0.06, 0.06, 0.9)
        obox((D, "glow", 0), pt((x, y + sh / 2 + 0.36, z), b, du, 0.0, 0.7), b, 0.42, 0.07, 0.2, col=(0.9, 0.85, 0.7, 1))
    obox((D, "trim", 1), pt((x, y - sh / 2 - 0.2, z), b, 0.0, 0.0, 0.2), b, sw + 0.4, 0.1, 0.6, col=ESCAPE)


def crown(rec):
    """A crowned roof (see above)."""
    x0, x1, z0, z1, _, top = rec["tiers"][-1]
    w, d = x1 - x0, z1 - z0
    r = rng(rec, "crown4")
    tint, tcol = rec["tint"], B.TRIM[rec["tint"]]
    B.ROOFS.append((D, x0, x1, z0, z1, top))
    rec["roof"] = "crown"
    parapet(x0, x1, z0, z1, top, tcol)
    # (A plant roof would have put a vent in VENTS here: one stands in its
    # place, so every later vent keeps its name.)
    if rng(rec, "roof").choice([k for k, wt in ROOFS_W[rec["row"]] for _ in range(wt)]) == "plant" and rec["seed"] % 4 == 0:
        VENTS.append(((x0 + x1) / 2, top + 1.7, z0 + 1.4, "roof"))
    tower = rec["h"] > storeys(11)
    hue = r.choice(("cyan", "pink", "amber", "magenta", "white", "red", "green", "cyan"))
    kind = r.choice(("step", "step", "rake") if tower else ("step", "step", "rake", "rake", "fin", "plant"))
    if min(w, d) < 7.0 and kind in ("step", "rake"):
        kind = "fin" if d > 6.0 else "plant"
    taken = []
    peak = top
    if kind == "step":
        i1 = max(1.5, min(3.2, min(w, d) * 0.17))
        ax0, ax1, az0, az1 = x0 + i1, x1 - i1, z0 + i1, z1 - i1
        n1 = r.choice((2, 3)) if tower else r.choice((1, 2, 2))
        y1 = clear_top(ax0, ax1, az0, az1, top + n1 * CELL_H, top + CELL_H)
        if y1 is None:
            kind = "plant"
        else:
            y1 = top + CELL_H * max(1, int((y1 - top) / CELL_H + 0.01))
            tier(ax0, ax1, az0, az1, top, y1, r, tint, hue)
            peak = y1
            # The terrace round it: condensers and vents.
            plant_on(x0 + 0.35, x1 - 0.35, z0 + 0.35, z1 - 0.35, top, r, [(ax0 - 0.1, ax1 + 0.1, az0 - 0.1, az1 + 0.1)],
                     n_vents=3, tank=False, hut=False, mast=True)
            i2 = max(1.2, min(2.6, min(ax1 - ax0, az1 - az0) * 0.2))
            bx0, bx1, bz0, bz1 = ax0 + i2, ax1 - i2, az0 + i2, az1 - i2
            y2 = clear_top(bx0, bx1, bz0, bz1, y1 + 2.6, y1 + 2.0)
            top2 = y1
            two = bx1 - bx0 > 3.0 and bz1 - bz0 > 3.0 and y2 is not None
            # The mast at a corner of the top, kept clear of its plant.
            ux0, ux1, uz0, uz1 = (bx0, bx1, bz0, bz1) if two else (ax0, ax1, az0, az1)
            mx, mz = r.choice((ux0 + 0.7, ux1 - 0.7)), r.choice((uz0 + 0.7, uz1 - 0.7))
            spot = [(mx - 0.6, mx + 0.6, mz - 0.6, mz + 0.6)]
            if two:
                tier(bx0, bx1, bz0, bz1, y1, y2, r, tint, r.choice(("red", hue)), plain=True)
                top2, peak = y2, y2
                plant_on(ax0 + 0.2, ax1 - 0.2, az0 + 0.2, az1 - 0.2, y1, r, [(bx0 - 0.1, bx1 + 0.1, bz0 - 0.1, bz1 + 0.1)],
                         n_vents=2, tank=False, hut=False, mast=True)
                plant_on(bx0, bx1, bz0, bz1, y2, r, spot, n_vents=1, tank=(bx1 - bx0) * (bz1 - bz0) > 20.0, hut=False, mast=True)
            else:
                plant_on(ax0, ax1, az0, az1, y1, r, spot, n_vents=2, tank=True, hut=False, mast=True)
            peak = max(peak, mast_at(mx, mz, top2, r.uniform(7.0, 12.0) if tower else r.uniform(4.5, 8.0)))
    elif kind == "rake":
        # Rising away from the side most see (the street or the alley; the
        # outer row's toward Lucy's roof and the street to the east), or
        # along the row now and then.
        along_x = r.random() < 0.65
        if along_x:
            face_dir = (1 if rec["front"] == "+x" else -1) if rec["row"] != "C" else 1
        else:
            face_dir = r.choice((1, -1))
        g = 0.7
        ax0, ax1, az0, az1 = x0 + g, x1 - g, z0 + g, z1 - g
        span = (ax1 - ax0) if along_x else (az1 - az0)
        rise = max(3.5, min(11.0 if tower else 7.5, span * 0.5))
        hi = clear_top(ax0, ax1, az0, az1, top + rise, top + 3.0)
        if hi is None:
            kind = "plant"
        else:
            lo_y, hi_y = top + 1.1, hi
            if along_x:
                lo_x, hi_x = (ax1, ax0) if face_dir > 0 else (ax0, ax1)
                P0, P1 = (lo_x, lo_y, az0), (lo_x, lo_y, az1)
                Q0, Q1 = (hi_x, hi_y, az0), (hi_x, hi_y, az1)
            else:
                lo_z, hi_z = (az1, az0) if face_dir > 0 else (az0, az1)
                P0, P1 = (ax0, lo_y, lo_z), (ax1, lo_y, lo_z)
                Q0, Q1 = (ax0, hi_y, hi_z), (ax1, hi_y, hi_z)
            # The raked face, its glass out toward face_dir.
            pts = (P0, P1, Q1, Q0)
            nrm = ((P1[1] - P0[1]) * (Q0[2] - P0[2]) - (P1[2] - P0[2]) * (Q0[1] - P0[1]),
                   (P1[2] - P0[2]) * (Q0[0] - P0[0]) - (P1[0] - P0[0]) * (Q0[2] - P0[2]),
                   (P1[0] - P0[0]) * (Q0[1] - P0[1]) - (P1[1] - P0[1]) * (Q0[0] - P0[0]))
            if nrm[1] < 0:
                pts = (P1, P0, Q0, Q1)
            quad((D, "glass_dark", 0), *pts, col=(1, 1, 1, 1))
            # Mullions down the slope, and its edges lit.
            L = math.hypot(P1[0] - P0[0], P1[2] - P0[2])
            n = max(2, int(L / 1.8))
            for i in range(1, n):
                t = i / n
                a = (P0[0] + (P1[0] - P0[0]) * t, P0[1] + 0.03, P0[2] + (P1[2] - P0[2]) * t)
                b_ = (Q0[0] + (Q1[0] - Q0[0]) * t, Q0[1] + 0.03, Q0[2] + (Q1[2] - Q0[2]) * t)
                pipe((D, "trim", 1), a, b_, 0.05, segs=4, col=(0.05, 0.055, 0.06, 1))
            for a, b_ in ((Q0, Q1), (P0, Q0), (P1, Q1)):
                pipe((D, "glow", 0), (a[0], a[1] + 0.06, a[2]), (b_[0], b_[1] + 0.06, b_[2]), 0.07, segs=4, col=GLOW[hue])
            # Its two ends (trapezoids, both ways) and its high back, windows in it.
            for pa, qa in ((P0, Q0), (P1, Q1)):
                foot_hi, foot_lo = (qa[0], top, qa[2]), (pa[0], top, pa[2])
                poly((D, "trim", 0), [foot_lo, foot_hi, qa, pa], [(0, 0), (1, 0), (1, 1), (0, 1)], tcol)
                poly((D, "trim", 0), [foot_hi, foot_lo, pa, qa], [(0, 0), (1, 0), (1, 1), (0, 1)], tcol)
            if along_x:
                fb = B.Face("-x" if face_dir > 0 else "+x", Q0[0], az0, az1)
                fl = B.Face("+x" if face_dir > 0 else "-x", P0[0], az0, az1)
            else:
                fb = B.Face("-z" if face_dir > 0 else "+z", Q0[2], ax0, ax1)
                fl = B.Face("+z" if face_dir > 0 else "-z", P0[2], ax0, ax1)
            B.facade_wall((D, "facade", 0), fb, top, hi_y, B.wall_col(r.uniform(0.3, 0.8), r.choice(WIN_KINDS), r.uniform(0.3, 1.0), tint), float(r.randrange(40)))
            fl.quad((D, "trim", 0), 0.0, fl.width, top, lo_y, 0.0, col=tcol)
            B.COLLISION.append(("box", ax0, ax1, top, hi_y, az0, az1, D))
            peak = hi_y
            # A mast at an end of the high edge.
            mx, mz = (Q0[0], Q0[2]) if r.random() < 0.5 else (Q1[0], Q1[2])
            if along_x:
                mx, mz = mx - face_dir * 0.4, mz + (0.7 if mz < (z0 + z1) / 2 else -0.7)
            else:
                mx, mz = mx + (0.7 if mx < (x0 + x1) / 2 else -0.7), mz - face_dir * 0.4
            peak = max(peak, mast_at(mx, mz, top, (hi_y - top) + (r.uniform(4.0, 8.0) if tower else r.uniform(2.5, 5.0))))
            band(x0, x1, z0, z1, top - 0.3, hue, 0.1)
    if kind == "fin":
        # A fin off the street corner over the roof, its name down it.
        sgn = 1 if rec["front"] == "+x" else -1
        xf = x1 if sgn > 0 else x0
        zf = z1 - 1.0 if r.random() < 0.5 else z0 + 1.0
        fh = r.uniform(7.0, 11.0)
        ftop = clear_top(xf - 2.0, xf + 2.0, zf - 0.3, zf + 0.3, top + fh * 0.45, top + 1.5)
        if ftop is None:
            kind = "plant"
        else:
            fy0 = max(storeys(3), ftop - fh)
            c = (xf + sgn * 1.2, (fy0 + ftop) / 2, zf)
            obox((D, "board_frame", 0), c, basis(0.0), 0.32, ftop - fy0, 2.4)
            text = J.F.pick(J.F.KANA, c, max(2, min(5, int((ftop - fy0 - 1.0) / 2.0))), (1, 0))
            for yaw in (0.0, math.pi):
                b = basis(yaw - HALF_PI)
                J.letters(pt(c, b, 0.0, 0.0, 0.18), b, text, min(1.8, (ftop - fy0 - 1.0) / (len(text) * 1.14)), hue, depth=0.14, vertical=True)
            for y in (fy0 + 0.6, (fy0 + ftop) / 2, ftop - 0.6):
                box((D, "metal", 1), min(xf, c[0]), max(xf, c[0]), y - 0.05, y + 0.05, zf - 0.05, zf + 0.05, scale=1.0)
            beacon(c[0], ftop, zf)
            light(D, c[0] + sgn * 1.0, fy0 + 1.0, zf, hue, 4.5)
            peak = ftop + 1.1
            taken.append((xf - 2.6, xf + 2.6, zf - 1.4, zf + 1.4))
    if kind in ("fin", "plant"):
        cx = x1 - 1.0 if rec["front"] == "-x" else x0 + 1.0
        cz = z1 - 1.0 if r.random() < 0.5 else z0 + 1.0
        taken.append((cx - 0.7, cx + 0.7, cz - 0.7, cz + 0.7))
        plant_on(x0 + 0.4, x1 - 0.4, z0 + 0.4, z1 - 0.4, top, r, taken, n_vents=r.randrange(3, 6), mast=True)
        peak = max(peak, mast_at(cx, cz, top, r.uniform(4.0, 8.0)))
        band(x0, x1, z0, z1, top + 0.55, hue, 0.08)
    # Over the roof, lit from its own plant.
    light(D, (x0 + x1) / 2, top + 1.5, (z0 + z1) / 2, r.choice(("amber", "cyan", "white")), 4.0)
    CROWNS.append((rec["row"], round(z0, 1), kind, round(peak, 1)))
    # A screen at mid height on the tallest, on the face most see.
    if rec["h"] >= storeys(10):
        lot = rec["lot"]
        if rec["row"] == "C":
            name = "+z" if (lot.z0 + lot.z1) / 2 < LUCY_LOT["lot"].z0 else "-z"
            if rec["sides"].get(name) == "party" and lot.neighbours.get(name, 0.0) > rec["h"] * 0.6:
                name = "+x"
        else:
            name = rec["front"]
        f = face(rec, name)
        lo = max(storeys(4), lot.neighbours.get(name, 0.0) + 1.0) if rec["sides"].get(name) == "party" else storeys(4)
        screen_mid(rec, f, r, lo, rec["tiers"][0][5] - 2.0)


def west_bridge(z, r):
    """A bridge from the outer row's tower to the west row's, over row B's
    roofs and both alleys, at the height of the high bridge's boards (the
    show's frame of Lucy's roof has a bridge of screens across its view): a
    lit corridor in a deep truss, a row of five screens along its south face
    toward Lucy's roof, a board of words along its north, lit from under,
    red lamps for what flies."""
    def tower(row):
        return next((rc for rc in LOTS if rc["row"] == row and rc["lot"].z0 <= z - 2.6 and z + 2.6 <= rc["lot"].z1), None)
    c, a = tower("C"), tower("A")
    if c is None or a is None:
        return None
    xa, xb = ROW_C[1], ROW_A[0]
    under = max([rc["h"] for rc in LOTS if rc["row"] == "B" and rc["lot"].z0 < z + 2.6 and rc["lot"].z1 > z - 2.6] + [0.0])
    y0 = max(under + 3.2, 35.0)
    y1 = y0 + 3.4
    if y1 + 6.0 > min(c["h"], a["h"]) or hero_sees((xa, 0.0, z - 2.6), (xb, y1 + 4.6, z + 2.6)):
        return None
    half = 2.0
    truss(xa, xb, z, y0, y1, half, 8, col=STEELWORK)
    col = B.wall_col(0.95, 1, 0.5, B.TINTS["navy"])
    for f in (B.Face("+z", z + half - 0.25, xa, xb), B.Face("-z", z - half + 0.25, xa, xb)):
        B.facade_wall((D, "facade", 0), f, y0 + 0.2, y1 - 0.2, col, 3.0 - (y0 + 0.2 - SHOP_H) / CELL_H)
    box((D, "trim", 0), xa, xb, y1, y1 + 0.3, z - half - 0.3, z + half + 0.3, scale=1.0, col=(0.05, 0.053, 0.06, 1), bottom=True)
    # The screens, edge to edge in one frame along the south face.
    n, sh = 5, 3.9
    sw = (xb - xa - 1.6) / n
    zz = z + half + 0.32
    cy = (y0 + y1) / 2 + 0.25
    for i in range(n):
        B.billboard(D, xa + 0.8 + sw * (i + 0.5), cy, zz, sw - 0.3, sh, 0.0, r, back=False, depth=0.26, frame=False)
    box((D, "board_frame", 0), xa + 0.6, xb - 0.6, cy - sh / 2, cy + sh / 2, zz - 0.3, zz - 0.04, scale=1.0)
    box((D, "board_frame", 0), xa + 0.6, xb - 0.6, cy - sh / 2 - 0.25, cy - sh / 2 - 0.05, zz - 0.3, zz + 0.12, scale=1.0)
    box((D, "board_frame", 0), xa + 0.6, xb - 0.6, cy + sh / 2 + 0.05, cy + sh / 2 + 0.25, zz - 0.3, zz + 0.12, scale=1.0)
    for i in range(n + 1):
        x = xa + 0.8 + sw * i
        box((D, "board_frame", 0), x - 0.15, x + 0.15, cy - sh / 2 - 0.25, cy + sh / 2 + 0.25, zz - 0.3, zz + 0.12, scale=1.0)
    for x in (xa + 4.0, (xa + xb) / 2, xb - 4.0):
        box((D, "glow", 0), x - 1.6, x + 1.6, cy + sh / 2 + 0.3, cy + sh / 2 + 0.38, zz + 0.1, zz + 0.5, scale=1.0, col=(0.9, 0.85, 0.7, 1), bottom=True)
    # And a second row standing on its top chord, words among them.
    panel_row(xa + 0.6, xb - 0.6, y1 + 0.5, 3.8, z + half + 0.2, 0.0, r, ("ad", "word", "ad", "ad"), "cyan")
    # The words along the north face.
    b = basis(math.pi)
    cc = ((xa + xb) / 2, (y0 + y1) / 2, z - half - 0.3)
    obox((D, "board_frame", 0), cc, b, xb - xa - 3.0, 2.6, 0.22)
    text = J.F.pick(J.F.KANA, cc, 6, (1, 1))
    J.letters(pt(cc, b, 0.0, 0.0, 0.16), b, text, min(1.9, (xb - xa - 5.0) / (len(text) * 1.12)), r.choice(("cyan", "amber", "green")), depth=0.14)
    # Under it: a lit strip down its floor, red lamps, a tube along each chord.
    box((D, "glow", 0), xa + 1.0, xb - 1.0, y0 - 0.34, y0 - 0.28, z - 0.4, z + 0.4, scale=1.0, col=(0.62, 0.5, 0.36, 1), bottom=True)
    for zz_, hue in ((z + half + 0.14, "magenta"), (z - half - 0.14, "cyan")):
        box((D, "glow", 0), xa + 0.5, xb - 0.5, y0 - 0.32, y0 - 0.22, zz_ - 0.04, zz_ + 0.04, scale=1.0, col=GLOW[hue], bottom=True)
    for x in (xa + 6.0, (xa + xb) / 2, xb - 6.0):
        box((D, "glow", 0), x - 0.12, x + 0.12, y0 - 0.45, y0 - 0.32, z - 0.12, z + 0.12, scale=1.0, col=GLOW["red"], bottom=True)
    for dz, drop in ((-2.7, 2.4), (2.8, 3.2)):
        J.span("jt_cable", (xa, z + dz), (xb, z + dz), y0 - 0.5, drop)
    B.COLLISION.append(("box", xa, xb, y0 - 0.3, y1 + 0.3, z - half, z + half, D))
    return (round(y0, 1), round(y1, 1), round(under, 1))


# ---------------------------------------------------------------------------
# The rows.
# ---------------------------------------------------------------------------
W_NARROW = (5.6, 6.4, 7.2, 8.0, 9.6, 11.2)
cuts_w = [(a, b, "open") for a, b in ALLEYS] + [(TORII[0], TORII[1], "street")]
cuts_c = [(a, b, "open") for a, b in (ALLEYS[1], ALLEYS[3], ALLEYS[7])] + [(TORII[0], TORII[1], "street")]
cuts_e = [(a, b, "open") for a, b in PASSAGES] + [(-190.0, -168.0, "street"), (-86.0, -74.0, "deck")]

B.back_ground, B.fire_escape, B.awning, B.shopfront = _no_back, _fire_escape, _awning, _shopfront
build_row("E", ROW_E, "-x", "back", segments(-708.0, -10.0, cuts_e, "street", "street"), 811, W_NARROW,
          ((2, 3), (3, 4), (4, 3), (5, 2)), STYLE, quiet=True)
build_row("A", ROW_A, "+x", "street", segments(ZN, ZS, cuts_w), 812, W_NARROW,
          ((2, 3), (3, 4), (4, 3), (5, 2), (6, 1)), STYLE)
build_row("B", ROW_B, "+x", "back", segments(ZN, ZS, cuts_w), 813, (8.0, 9.6, 11.2, 12.8, 14.4),
          ((3, 3), (4, 3), (5, 3), (6, 2)), STYLE_B, ground="blank")
build_row("C", ROW_C, "-x", "back", segments(ZN, ZS, cuts_c), 814, (12.8, 16.0, 19.2, 22.4),
          ((5, 2), (6, 3), (7, 3), (8, 2), (9, 1)), STYLE_C, ground="blank")
B.back_ground, B.fire_escape, B.awning, B.shopfront = _kit_back, _kit_escape, _kit_awning, _kit_shopfront
lobbies()

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
            yaw_ = lr.uniform(0, 6.28)
            if not TORII[0] - 22.0 < z + 6.0 < TORII[1] + 22.0:
                tree(xa + 1.3, G0, z + 6.0, yaw_)
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
DECK_LOW = set(BY_DECK)
# And two landing pads on the outer row's roofs, one toward each end.
for _zc in (-650.0, -300.0):
    _c = [rc for rc in LOTS if rc["row"] == "C" and rc is not LUCY_LOT and rc["lot"].z1 - rc["lot"].z0 >= 15.9 and id(rc) not in BY_DECK]
    BY_DECK[id(min(_c, key=lambda rc: abs((rc["lot"].z0 + rc["lot"].z1) / 2 - _zc)))] = "pad"
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
    # (Where a screen will hang on the front, its signs keep under it.)
    ad_ = row == "C" and rng(rec, "westad").random() < 0.36 and face(rec, rec["front"]).width > 12.0 and rec["tiers"][0][5] > storeys(5)
    chan_ = channel_plan(rec)
    if row in ("E", "A"):
        shop_face(rec, rec["front"], "street", cap=storeys(2) + 0.3 if row == "A" and rec["lot"].z0 == DECK_TOWERS.get("axis") else (chan_[1] - 0.5 if chan_ else None))
        if chan_:
            channel_sign(rec, chan_)
    elif row == "B":
        shop_face(rec, rec["front"], "alley")
    else:
        shop_face(rec, rec["front"], "edge", cap=storeys(2) + 0.3 if ad_ else None)
    if row == "A":
        shop_face(rec, rec["back"], "alley")
    for name in ("-z", "+z"):
        if rec["sides"][name] == "open":
            # A side on a cross alley or a passage: lit and used like a lane.
            lane_face(rec, name, cap=7.4 if row == "E" else None)
        if rec["sides"][name] == "street":
            shop_face(rec, name, "street" if row in ("E", "A") else "alley", cap=7.4 if row == "E" else None)
    if row == "C":
        # Its front on the far city's street (the review: "one uniform grid
        # of identical windows", "no shops or signs facing it"): windows of
        # three kinds in bands between ribs over its shops, and on one lot
        # in three an advert.
        rw_, fw_ = rng(rec, "west"), face(rec, rec["front"])
        fo_ = B.Face(fw_.name, fw_.plane + 0.03 * (fw_.nx or fw_.nz), fw_.a0, fw_.a1)
        hw_ = rec["tiers"][0][5]
        banded(fo_, storeys(2), hw_, rw_, rec["tint"], ribs=rw_.random() < 0.7)
        if ad_:
            bw_ = min(fw_.width - 4.0, 10.0)
            B.billboard(D, *fw_.p(fw_.at(fw_.width / 2), storeys(2) + 1.5 + bw_ * 0.28, 0.4), bw_, bw_ * 0.56, fw_.yaw, rw_, back=False, depth=0.3)
            light(D, *fw_.p(fw_.at(fw_.width / 2), 3.0, 2.5), rw_.choice(("pink", "cyan", "amber")), 5.0)
        # Its back over the low rows: a big board up high, seen from the
        # roofs, the deck and the air.
        f = face(rec, rec["back"])
        if rec["r"].random() < 0.6 and f.width > 8.0:
            J.board(f, f.width / 2, rec["h"] - 2.6, "pm", tilt=rec["r"].uniform(-0.25, 0.25), k=rec["r"].uniform(1.6, 2.2), out=0.3)
    if crowned(rec):
        crown(rec)
    else:
        roof(rec, ROOFS_W[row])
    tall_faces(rec)
    if rec["h"] > 24.0 and row in ("A", "E"):
        sky_word(rec)
    if id(rec) in DECK_LOW:
        deck_lot(rec)
deck_towers()
for rec in LOTS:
    roof_more(rec)


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
GATE_Z, SIGNS_Z, BRIDGE_Z, TOWER_Z, ARCH_Z, SOUTH_Z, PIPES_Z = -696.0, -444.0, -528.0, -352.0, -276.0, -30.0, -323.5
OVER = [(z - 4.0, z + 4.0) for z in (GATE_Z, SIGNS_Z, BRIDGE_Z, ARCH_Z, SOUTH_Z, PIPES_Z)] + [(-616.0, -604.0)]
STRUNG = []    # where a string, a festoon or a cable crosses the street (z)
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
            STRUNG.append((z + zb) / 2)
    elif free:
        STRUNG.append(z)
        if kind == "jt_string":
            J.string((XW, z), (XE, zb), y, 2.2, 3.0, 2.0)
        else:
            J.span(kind, (XW, z), (XE, zb), y, 1.8)
        for x in (-86.0, -74.0):
            light(D, x, 0.3, z, "red" if kind == "jt_string" else "amber", 3.2)
    if sr.random() < 0.5:
        light(D, -90.5 if sr.random() < 0.5 else -69.5, 5.0, z, "amber", 3.0)

# Round 3, its own stream: bundles of cable over the street (three spans
# slung together from facade to facade, each its own sag) every twenty
# metres or so, and from one in three a sign hung on two rods, turned off
# the street's line, at its own height (desktop detail: a phone has the
# strings and the bridges).
def hang_sign(c, yaw, size, r, rod_top):
    w, h = ST_SIZES[size]
    name = J.design(size, c)
    if name is None:
        return False
    col = J.sign_id(name)
    b = basis(yaw, r.uniform(-0.05, 0.05))
    for t in (0.035, -0.035):
        if t >= 0:
            q = (J.pt(c, b, -w / 2, -h / 2, t), J.pt(c, b, w / 2, -h / 2, t), J.pt(c, b, w / 2, h / 2, t), J.pt(c, b, -w / 2, h / 2, t))
        else:
            q = (J.pt(c, b, w / 2, -h / 2, t), J.pt(c, b, -w / 2, -h / 2, t), J.pt(c, b, -w / 2, h / 2, t), J.pt(c, b, w / 2, h / 2, t))
        quad((D, "sign", 1), *q, col=col)
    J.obox((D, "board_frame", 1), c, b, w + 0.1, h + 0.1, 0.07, rim=True)
    for u in (-w / 2 + 0.12, w / 2 - 0.12):
        p0 = J.pt(c, b, u, h / 2 + 0.05, 0.0)
        box((D, "metal", 1), p0[0] - 0.012, p0[0] + 0.012, p0[1], rod_top, p0[2] - 0.012, p0[2] + 0.012, scale=0.5)
    return True


_rb = random.Random(7303)
_bundles, _hung = 0, 0
z = -700.0
while z < -236.0:
    z += _rb.uniform(16.0, 26.0)
    zb = z + _rb.uniform(-2.5, 2.5)
    hw, he = height_at("A", z), height_at("E", zb)
    if hw is None or he is None or not (clear_of(z, OVER, 3.0) and clear_of(zb, OVER, 3.0)) or any(abs(z - q) < 2.5 for q in STRUNG):
        continue
    y = min(min(hw, he) - 0.8, _rb.uniform(7.2, 9.8))
    d0 = _rb.uniform(0.7, 1.3)
    for dz, dy, dd in ((0.0, 0.0, 0.0), (0.32, -0.22, 0.35), (-0.28, 0.3, -0.2)):
        J.span("jt_cable", (XW, z + dz), (XE, zb + dz * 1.4), y + dy, d0 + dd)
    STRUNG.append((z + zb) / 2)
    _bundles += 1
    if _rb.random() < 0.45:
        xh = _rb.uniform(-85.0, -75.0)
        t = (xh - XW) / (XE - XW)
        zh = z + (zb - z) * t
        sag = y - 0.6 * d0 * math.sin(math.pi * t) - 0.3 * d0
        size = _rb.choice(("bs", "bs", "bm", "ps", "bx"))
        sh = ST_SIZES[size][1]
        yaw = _rb.choice((0.0, math.pi)) + _rb.uniform(-0.55, 0.55)
        if sag - sh - 0.35 > 4.8 and hang_sign((xh, sag - 0.3 - sh / 2, zh), yaw, size, _rb, sag + 0.05):
            _hung += 1
# And the lanes': cables across the lantern alley and the back lane every
# few metres, low, and now and then a blade hung over the alley.
for xa_, xb_ in (NAKA, BACK, LANE):
    z = -700.0 + _rb.uniform(0.0, 4.0)
    while z < -190.0:
        z += _rb.uniform(3.5, 7.0)
        if not clear_of(z, ALLEYS + [TORII, MARKET] if xa_ == NAKA[0] else ALLEYS + [TORII], 1.0):
            continue
        y = _rb.uniform(4.6, 7.4)
        J.span("jt_cable", (xa_, z), (xb_, z + _rb.uniform(-1.5, 1.5)), y, _rb.uniform(0.25, 0.6))
        if xa_ == NAKA[0] and _rb.random() < 0.18:
            size = _rb.choice(("bs", "bx", "ps"))
            sh = ST_SIZES[size][1]
            if y - 0.5 - sh > 2.9 and hang_sign(((xa_ + xb_) / 2 + _rb.uniform(-0.8, 0.8), y - 0.45 - sh / 2, z), _rb.choice((0.0, math.pi)) + _rb.uniform(-0.6, 0.6), size, _rb, y - 0.1):
                _hung += 1
print("japantown overhead:", _bundles, "bundles over the street,", _hung, "signs hung")

# Life at the ends of the street and on its floor (round 3): people waiting
# at the kerb's edge at the corners of both junctions, in twos and threes;
# manholes breathing in the carriageway and grates in the pavement; and in
# the lanes, what lies on the floor, drains, and grates with steam over them.
_rl = random.Random(7411)
for zc_, xs_ in ((-709.0, (-90.6, -69.4)), (-8.0, (-90.6, -69.4))):
    for xk in xs_:
        face_ = HALF_PI if xk < -80.0 else -HALF_PI
        zz = zc_ + _rl.uniform(-1.5, 1.5)
        for i in range(_rl.randrange(2, 4)):
            stand(xk, zz + i * 0.75, face_ + _rl.uniform(-0.4, 0.4), _rl.choice(("idle", "phone", "idle", "smoke")), G0)
        if _rl.random() < 0.7:
            stand(xk, zz - 1.4, face_ + 1.2, "talk", G0)
            stand(xk, zz - 2.25, face_ - 1.9, "talk", G0)
_mh = 0
z = -690.0
while z < -240.0:
    z += _rl.uniform(38.0, 60.0)
    if clear_of(z, OVER, 2.0):
        steam(_rl.choice((-86.5, -73.5, -82.5, -77.5)), z, 0.0, cover=0.0)
        _mh += 1
    zg = z + _rl.uniform(-12.0, 12.0)
    xg = _rl.choice((-90.95, -69.05))
    if clear_of(zg, ALLEYS + [TORII, CROSSING, DECK] + PASSAGES, 2.0):
        J.put("grate_glow", xg, G0, zg, 0.0)
        steam(xg, zg, G0 - 0.06, "street", cover=None)
for xa_, xb_ in (NAKA, BACK, LANE):
    z = -702.0 + _rl.uniform(0.0, 3.0)
    side = 1
    while z < -192.0:
        z += _rl.uniform(4.5, 8.0)
        if not clear_of(z, [TORII], 1.0):
            continue
        side = -side
        xw = (xa_ + 0.7) if side > 0 else (xb_ - 0.7)
        J.put("jt_lanefloor", xw, G0, z, HALF_PI if side > 0 else -HALF_PI)
        if _rl.random() < 0.35:
            J.put("drain", (xa_ + xb_) / 2, G0, z + 2.0, HALF_PI)
        if _rl.random() < 0.08:
            J.put("grate_glow", (xa_ + xb_) / 2, G0, z - 2.0, HALF_PI)
            steam((xa_ + xb_) / 2, z - 2.0, G0 - 0.06, "street", cover=None)
print("japantown life: manholes", _mh, "steam vents", len(STEAM))


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
    # The street's name on a board hung under it, read from both sides.
    obox((D, "board_frame", 0), (-80.0, 8.55, z), basis(0.0), 13.6, 2.6, 0.24)
    J._burn(r, 13.0, 2.3)
    for yaw in (0.0, math.pi):
        b = basis(yaw)
        J.letters(pt((-80.0, 8.55, z), b, 0.0, 0.0, 0.2), b, "サクラドオリ", 1.75, "pink", depth=0.16)
        for v in (-1.12, 1.12):
            J._stroke((D, "neon_amber", 0), (-80.0, 8.55, z), b, (-6.5, v), (6.5, v), 0.08, 0.13, (1, 1, 1, 1))
    for x in (-85.0, -75.0):
        box((D, "metal", 1), x - 0.04, x + 0.04, 9.85, 10.0, z - 0.04, z + 0.04, scale=1.0)
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


def truss(xa, xb, z, y0, y1, half, bays, col=ESCAPE, mid=None):
    """Two Warren trusses from xa to xb, half a width either side of z,
    between y0 and y1: their chords, a post at every panel point, the
    diagonals between, ties across the top, the floor they carry. `mid`: a
    middle chord (a truss two storeys deep)."""
    k0, k1 = (D, "trim", 0), (D, "trim", 1)
    step = (xb - xa) / bays
    for zz in (z - half, z + half):
        for y in (y0, y1) + ((mid,) if mid else ()):
            box(k0, xa, xb, y - 0.13, y + 0.13, zz - 0.11, zz + 0.11, scale=1.0, col=col, bottom=True)
        for i in range(bays + 1):
            x = xa + step * i
            for q in (((x - 0.08, y0, zz + 0.09), (x + 0.08, y0, zz + 0.09), (x + 0.08, y1, zz + 0.09), (x - 0.08, y1, zz + 0.09)),
                      ((x + 0.08, y0, zz - 0.09), (x - 0.08, y0, zz - 0.09), (x - 0.08, y1, zz - 0.09), (x + 0.08, y1, zz - 0.09)),
                      ((x - 0.08, y0, zz - 0.09), (x - 0.08, y0, zz + 0.09), (x - 0.08, y1, zz + 0.09), (x - 0.08, y1, zz - 0.09)),
                      ((x + 0.08, y0, zz + 0.09), (x + 0.08, y0, zz - 0.09), (x + 0.08, y1, zz - 0.09), (x + 0.08, y1, zz + 0.09))):
                quad(k1, *q, col=col)
        levels = ((y0, mid), (mid, y1)) if mid else ((y0, y1),)
        for ya, yb in levels:
            for i in range(bays):
                x0_, x1_ = xa + step * i, xa + step * (i + 1)
                va, vb = (ya, yb) if i % 2 == 0 else (yb, ya)
                q = ((x0_, va - 0.08, zz), (x1_, vb - 0.08, zz), (x1_, vb + 0.08, zz), (x0_, va + 0.08, zz))
                quad(k1, *q, col=col)
                quad(k1, q[1], q[0], q[3], q[2], col=col)
    for i in range(bays + 1):
        x = xa + step * i
        box(k1, x - 0.07, x + 0.07, y1 - 0.07, y1 + 0.07, z - half, z + half, scale=1.0, col=col, bottom=True)
    box(k0, xa, xb, y0 - 0.2, y0, z - half, z + half, scale=1.0, col=(0.05, 0.053, 0.06, 1), bottom=True)


def legs(x, z, half, top, col=STEELWORK):
    """A pylon of two legs on blocks at the kerb's edge, braced across."""
    for zz in (z - half, z + half):
        box((D, "dark", 0), x - 0.3, x + 0.3, G0, 0.9, zz - 0.3, zz + 0.3, scale=1.0)
        box((D, "trim", 0), x - 0.16, x + 0.16, 0.9, top, zz - 0.16, zz + 0.16, scale=1.0, col=col)
    y = 1.6
    while y + 2.6 < top - 0.3:
        for za, zb in ((z - half, z + half), (z + half, z - half)):
            q = ((x, y, za), (x, y + 2.6, zb), (x, y + 2.74, zb), (x, y + 0.14, za))
            quad((D, "trim", 1), *q, col=col)
            quad((D, "trim", 1), q[1], q[0], q[3], q[2], col=col)
        y += 2.6


def panel_row(xa, xb, y, h, z, yaw, r, kinds, hue):
    """A row of boards side by side from xa to xb, their feet at y, facing
    yaw (0 south, pi north): adverts (the site's), words in standing
    letters on a dark board, the street's own signs enlarged; each on two
    struts back to the truss."""
    n = len(kinds)
    w = (xb - xa) / n
    dz = math.cos(yaw)
    for i, kind in enumerate(kinds):
        cx, cy = xa + w * (i + 0.5), y + h / 2
        bw = w - 0.5
        if kind == "ad":
            B.billboard(D, cx, cy, z + dz * 0.14, bw, h, yaw, r, back=False, depth=0.24)
        elif kind == "word":
            b = basis(yaw)
            obox((D, "board_frame", 0), (cx, cy, z), b, bw, h, 0.22)
            text = J.F.pick(J.F.KANA, (cx, cy, z), max(2, int(bw / (h * 0.62))), (2, 0))
            ch = min(h * 0.6, bw * 0.84 / (len(text) * 1.12))
            J.letters((cx, cy, z + dz * 0.2), b, text, ch, hue, depth=0.16)
            for sd in (-1, 1):
                box((D, "neon_" + hue, 0), cx - bw / 2 + 0.2, cx + bw / 2 - 0.2, cy + sd * (h / 2 - 0.16) - 0.04, cy + sd * (h / 2 - 0.16) + 0.04, z + dz * 0.12 - 0.02, z + dz * 0.12 + 0.02,
                    scale=1.0, bottom=True)
        else:
            k = min(h / 1.2, bw / 2.8) * 0.94
            if J.slab_sign((cx, cy, z + dz * 0.1), basis(yaw), "pm", k, both=False, depth=0.2, need=40.0)[0] == 0.0:
                J.slab_sign((cx, cy, z + dz * 0.1), basis(yaw), "bx", min(h, bw) / 1.2 * 0.9, both=False, depth=0.2)
        for du in (-bw * 0.3, bw * 0.3):
            q = ((cx + du, y + h * 0.75, z - dz * 0.1), (cx + du, y - 0.1, z - dz * 1.1), (cx + du, y + 0.02, z - dz * 1.1), (cx + du, y + h * 0.75 + 0.12, z - dz * 0.1))
            quad((D, "trim", 1), *q, col=ESCAPE)
            quad((D, "trim", 1), q[1], q[0], q[3], q[2], col=ESCAPE)


def skybridge(z, r, y0=9.6, hue="cyan", rows=(("ad", "word", "ad", "slab"), ("slab", "ad", "word", "ad"))):
    """A footbridge between the street's two sides (Zq4zTcIM0yQ@45): two
    steel trusses on braced pylons at the kerbs, its floor between them lit
    from a line of lamps under the top ties, people on it; a row of boards
    standing on its top chord turned up the street and another down it,
    blades hung under its floor, a tube along its lower chord, cable
    bundles slung beside it and from its pylons to the fronts."""
    half, y1 = 1.3, y0 + 3.0
    for x in (-90.6, -69.4):
        legs(x, z, half, y0 - 0.2)
    truss(XW, XE, z, y0, y1, half, 8)
    box((D, "glow", 0), XW + 1.5, XE - 1.5, y1 - 0.2, y1 - 0.14, z - 0.12, z + 0.12, scale=1.0, col=(0.5, 0.36, 0.2, 1), bottom=True)
    # (The handrails' infill, the floor's light on it.)
    for zz, yaw in ((z - half + 0.12, 0.0), (z + half - 0.12, math.pi)):
        rotated_quad((D, "glow", 0), (XW + XE) / 2, y0 + 0.55, zz, XE - XW - 0.6, 1.0, yaw, col=(0.016, 0.012, 0.008, 1))
    panel_row(XW + 1.0, XE - 1.0, y1 + 0.3, 3.0, z - half - 0.15, math.pi, r, rows[0], hue)
    panel_row(XW + 1.0, XE - 1.0, y1 + 0.3, 3.0, z + half + 0.15, 0.0, r, rows[1], "pink" if hue != "pink" else "amber")
    for x in (-86.5, -80.0, -73.5):
        J.slab_sign((x, y0 - 2.1, z + 0.2), basis(0.0), "bm", 1.1)
        box((D, "metal", 1), x - 0.03, x + 0.03, y0 - 0.5, y0 - 0.2, z + 0.17, z + 0.23, scale=1.0)
    box((D, "neon_" + hue, 0), XW + 3.6, XE - 3.6, y0 - 0.3, y0 - 0.22, z - 0.05, z + 0.05, scale=1.0, bottom=True)
    for dz, y, drop in ((-2.1, y0 - 0.4, 1.0), (2.2, y1 - 0.2, 1.5), (2.6, y0, 0.7), (-2.6, y1 + 0.4, 1.2)):
        J.span("jt_cable", (XW, z + dz), (XE, z + dz + r.uniform(-0.6, 0.6)), y, drop)
    for x, wall in ((-90.6, XW), (-69.4, XE)):
        for dz in (-7.0, 6.0):
            J.span("jt_cable", (x, z), (wall, z + dz), y0 - 0.6, 0.5)
    for x in (-85.0, -79.0, -74.0):
        stand(x, z + r.uniform(-0.6, 0.6), r.uniform(0, 6.28), r.choice(("idle", "phone", "lean", "smoke")), y0)
    stand(-82.0, z - half + 0.35, math.pi, "lean", y0)
    for x in (-87.0, -80.0, -73.0):
        light(D, x, 0.3, z, hue, 3.6)
        light(D, x, y0 + 1.0, z, "amber", 3.0)


def high_bridge(z, r, y0=29.5, y1=36.0):
    """The high bridge between the two towers (the show's frame of Lucy's
    roof has one across it): a truss two storeys deep with a lit corridor
    on each floor behind its bracing, three great boards standing on it to
    the south and three to the north, a tube along each chord, red lamps
    under it for whatever flies."""
    half, mid = 2.0, (y0 + y1) / 2
    truss(XW, XE, z, y0, y1, half, 7, col=STEELWORK, mid=mid)
    col = B.wall_col(0.97, 2, 0.4, B.TINTS["charcoal"])
    for f in (B.Face("+z", z + half - 0.25, XW, XE), B.Face("-z", z - half + 0.25, XW, XE)):
        B.facade_wall((D, "facade", 0), f, y0 + 0.2, y1 - 0.2, col, 7.0 - (y0 + 0.2 - SHOP_H) / CELL_H)
    box((D, "trim", 0), XW, XE, y1, y1 + 0.3, z - half - 0.3, z + half + 0.3, scale=1.0, col=(0.05, 0.053, 0.06, 1), bottom=True)
    panel_row(XW + 0.6, XE - 0.6, y1 + 0.5, 4.8, z + half + 0.2, 0.0, r, ("ad", "word", "ad"), "pink")
    panel_row(XW + 0.6, XE - 0.6, y1 + 0.5, 4.8, z - half - 0.2, math.pi, r, ("word", "ad", "slab"), "cyan")
    for zz, hue in ((z + half + 0.14, "cyan"), (z - half - 0.14, "magenta")):
        box((D, "neon_" + hue, 0), XW + 0.5, XE - 0.5, y0 - 0.32, y0 - 0.22, zz - 0.04, zz + 0.04, scale=1.0, bottom=True)
    for x in (-88.0, -80.0, -72.0):
        box((D, "glow", 0), x - 0.12, x + 0.12, y0 - 0.42, y0 - 0.3, z - 0.12, z + 0.12, scale=1.0, col=GLOW["red"], bottom=True)
    for dz, drop in ((-2.6, 2.2), (2.7, 3.0)):
        J.span("jt_cable", (XW, z + dz), (XE, z + dz), y0 - 0.5, drop)


def pipe_bridge(z, r, y0=11.4):
    """A services bridge: a slim truss carrying pipes and cable trays from
    one side to the other, one long board of words along it each way, tubes
    of light under it and lanterns strung below."""
    half, y1 = 0.8, y0 + 2.2
    for x in (-90.6, -69.4):
        legs(x, z, half, y0 - 0.2)
    truss(XW, XE, z, y0, y1, half, 10, col=(0.13, 0.085, 0.05, 1))
    for dz, rr, c in ((-0.4, 0.2, (0.2, 0.21, 0.22, 1)), (0.1, 0.13, J.RUSTY), (0.45, 0.1, (0.1, 0.11, 0.1, 1))):
        pipe((D, "trim", 1), (XW, y0 + 0.2 + rr, z + dz), (XE, y0 + 0.2 + rr, z + dz), rr, segs=6, col=c)
    for yaw, zz, hue, pool in ((math.pi, z - half - 0.16, "amber", J.F.LATIN), (0.0, z + half + 0.16, "green", J.F.KANA)):
        b = basis(yaw)
        c = (-80.0, y1 + 1.35, zz)
        obox((D, "board_frame", 0), c, b, 21.0, 2.2, 0.2)
        text = J.F.pick(pool, c, 8, (2, 3)) if pool is J.F.LATIN else J.F.pick(pool, (c[0] - 5.0, c[1], c[2]), 4, (1, 1)) + " " + J.F.pick(pool, (c[0] + 5.0, c[1], c[2]), 4, (1, 1))
        J.letters(pt(c, b, 0.0, 0.0, 0.16), b, text, min(1.5, 19.0 / (len(text) * 1.12)), hue, depth=0.14)
        for du in (-9.0, -3.0, 3.0, 9.0):
            box((D, "metal", 1), c[0] + du - 0.05, c[0] + du + 0.05, y1, y1 + 0.3, zz - 0.05, zz + 0.05, scale=1.0)
    box((D, "neon_pink", 0), XW + 2.0, XE - 2.0, y0 - 0.3, y0 - 0.22, z - 0.05, z + 0.05, scale=1.0, bottom=True)
    J.string((XW + 1.0, z + 1.6), (XE - 1.0, z + 1.6), y0 - 0.4, 1.6, 3.0, 1.8)
    for dz, y, drop in ((-1.5, y0 + 0.4, 1.1), (1.9, y1, 1.6)):
        J.span("jt_cable", (XW, z + dz), (XE, z + dz + r.uniform(-0.6, 0.6)), y, drop)
    for x in (-87.0, -80.0, -73.0):
        light(D, x, 0.3, z, "pink", 3.4)


# ---------------------------------------------------------------------------
# The two junctions' edges (the m8 review: "wide-torii's empty yellow box
# junction", "wide-south-end's empty dark apron beyond the crosswalk"): no
# lane or crossing is touched (the traffic and the crowd are shipped), so
# what stands is on the pavements, by the walls or on the kerb's edge; the
# shops' and signs' light falls in pools over the junctions themselves.
# ---------------------------------------------------------------------------
def junctions():
    jr = random.Random(7700)
    # The south street's pavement before the closing block (z 8..12): its
    # walkers start east of x -75, so west of that a kiosk, a food cart and
    # its cook, an advert drum, people at them, a guard rail and posts on
    # the kerb's edge, a lit board on the wall.
    J.put("jt_stall_d", -91.4, G0, 10.55, math.pi)
    stand(-91.4, 11.15, math.pi, "vendor", G0)
    light(D, -91.4, 2.4, 9.4, "amber", 3.5)
    J.put("food_cart", -86.6, G0, 9.55, math.pi)
    stand(-86.6, 10.75, math.pi, "vendor", G0)
    for x, z, yaw, pose in ((-85.2, 8.95, 0.3, "queue"), (-88.0, 8.9, -0.2, "phone"), (-90.0, 9.0, 0.1, "talk"), (-89.4, 9.05, 2.9, "talk")):
        stand(x, z, yaw, pose, G0)
    J.put("ad_drum", -79.6, G0, 9.6, jr.uniform(0, 6.28))
    J.put("lightbox", -77.0, G0, 11.55, math.pi)
    J.put("jt_bike", -83.4, G0, 8.55, HALF_PI + 0.1)
    J.put("jt_bike", -82.6, G0, 8.55, HALF_PI - 0.06)
    for x in (-93.2, -92.0, -81.4, -80.6):
        J.put("bollard", x, G0, 8.4)
    J.put("barrier", -76.2, G0, 8.45, 0.0)
    J.put("warning_tri", -74.9, G0, 8.6, 0.4)
    for x, z, hue, pw in ((-90.0, 6.0, "amber", 5.5), (-84.0, 4.0, "pink", 6.5), (-78.5, 5.5, "cyan", 5.0), (-72.0, 3.0, "magenta", 5.0), (-80.0, -3.0, "red", 4.5)):
        light(D, x, 0.3, z, hue, pw)
    # The plaza street's T (z -179): its light over the box from the signs at
    # its corners and the gate over the way, people waiting at the corners'
    # walls, a lit board by the north corner's wall.
    for x, z, hue, pw in ((-72.5, -186.0, "pink", 5.5), (-72.5, -172.0, "cyan", 5.5), (-68.0, -179.0, "red", 5.0), (-88.0, -179.0, "amber", 4.5), (-60.0, -179.0, "magenta", 4.5)):
        light(D, x, 0.3, z, hue, pw)
    for x, z, yaw, pose in ((-66.45, -191.6, -HALF_PI, "smoke"), (-66.45, -192.4, -HALF_PI, "phone"), (-66.45, -166.2, -HALF_PI, "lean"), (-62.0, -168.4, math.pi, "idle")):
        stand(x, z, yaw, pose, G0)
    return True



gr = random.Random(7150)
street_gate(GATE_Z, sr)
sign_bridge(SIGNS_Z, gr)
skybridge(BRIDGE_Z, gr)
sign_tower(-90.55, TOWER_Z, gr)
hr = random.Random(7160)
high_bridge(HIGH_Z, hr)
print("japantown west bridge:", west_bridge(HIGH_Z, random.Random(7170)), "crowns:", len(CROWNS), sorted({k for _, _, k, _ in CROWNS}),
      "highest:", max([c[3] for c in CROWNS] + [0.0]))
print("japantown crowns:", CROWNS)
print("japantown junctions:", junctions())
print("japantown channel signs:", len(CHANNEL), sum(1 for c in CHANNEL if c[2] == "corner"), "at corners")
pipe_bridge(PIPES_Z, hr)
lantern_arch(ARCH_Z, gr)
tube_arch(SOUTH_Z, gr)

# The mouths of the cross alleys and the east passages: a frame and a board.
for a, b in ALLEYS:
    gate(XW - 0.3, a, b, HALF_PI, sr)
for a, b in PASSAGES:
    gate(XE + 0.3, a, b, -HALF_PI, sr, h=4.5)

# ---------------------------------------------------------------------------
# The street's middle and its kerbs (the review: "too wide, too empty";
# Zq4zTcIM0yQ@41 for the kerb's kit). A reservation down the middle from the
# gate to short of the ramp's foot, broken where a car may turn across and
# under the megabuilding's rail: a kerbed strip with palms where nothing is
# slung over it and shrubs where something is, lantern columns, a guard
# rail between them, bollards and a lit keep-clear post at each nose. Along
# both kerbs: strips of light let into the kerbstone with a gutter grate
# and a cover by each, bicycles on their stands, bollards in runs and at
# the alleys' mouths, bags put out, hydrants, charging posts, bins, lit
# grates in the flags (the kit breathes steam from half of them), a signal
# at the ramp's crossing. Nothing where something already stands.
# ---------------------------------------------------------------------------
MEDIAN = (-688.0, -240.0)
TURNS = [(z - 4.5, z + 4.5) for z in (-610.0, -505.0, -402.0, -300.0)]


def _square(yaw):
    """A turn to the nearest quarter (a square planter on the reservation
    stands square to it, its corners kept off the lanes)."""
    return round(yaw / HALF_PI) * HALF_PI


def median():
    mr = random.Random(7170)
    z, runs = MEDIAN[0], []
    for g0, g1 in TURNS + [(MEDIAN[1], MEDIAN[1])]:
        if g0 - z > 8.0:
            runs.append((z, g0))
        z = g1
    for a, b in runs:
        box((D, "kerb", 0), -80.8, -79.2, 0.0, G0, a, b, scale=1.0)
        quad((D, "sidewalk", 0), (-80.55, G0 + 0.004, b - 0.25), (-79.45, G0 + 0.004, b - 0.25), (-79.45, G0 + 0.004, a + 0.25), (-80.55, G0 + 0.004, a + 0.25),
             uvs=((0, 0), (0.55, 0), (0.55, (b - a) / 2), (0, (b - a) / 2)))
        for e, dz in ((a, 1.0), (b, -1.0)):
            # (Round 4: the noses differ, a pair of posts, three blocks, or a barrier.)
            # (Round 5, the drive agent's note: the S4 in the inner lane at
            # full speed scraped the noses; nothing on the reservation
            # reaches nearer than 0.3 m to its west kerb's edge, x -80.5.)
            nose = mr.choice(("posts", "posts", "cubes", "barrier"))
            if nose == "posts":
                for x in (-80.3, -79.6):
                    J.put("bollard", x, G0, e + dz * 0.5)
            elif nose == "cubes":
                for x in (-80.3, -80.0, -79.7):
                    J.put("bollard_cube", x, G0, e + dz * 0.45, 0.0, 1.0, 0.6)
            else:
                J.put("barrier", -80.0, G0, e + dz * 1.1, HALF_PI)
            # The nose's beacon: a banded post, an amber lamp on it.
            for i in range(4):
                cylinder((D, "trim", 1), -80.0, e + dz * 1.3, G0 + i * 0.28, G0 + (i + 1) * 0.28, 0.09, segs=6, col=(0.4, 0.3, 0.04, 1) if i % 2 else (0.02, 0.02, 0.024, 1), cap=i == 3)
            cylinder((D, "glow", 0), -80.0, e + dz * 1.3, G0 + 1.12, G0 + 1.26, 0.07, segs=6, col=(0.8, 0.42, 0.08, 1))
            light(D, -80.0, 1.3, e + dz * 1.3, "amber", 2.0)
        # (Round 4: the m8 review saw "the same median planters, sakura and
        # bollard pairs every few frames": what stands on it is dealt, never
        # the same twice running, a lamp at least every 20 m, at its own
        # spacing, the guard rail between some and not others.)
        z, prev, lamp_z = a + 4.5, None, a
        while z < b - 3.5:
            low = not clear_of(z, OVER, 2.0) or any(abs(z - u) < 3.2 for u in STRUNG)
            # (Round 5: a tree's crown is over the lanes from 4.7 m up, so it
            # stands only where no string or cable crosses within 2.2 m.)
            under = not clear_of(z, OVER, 2.0) or any(abs(z - u) < 2.2 for u in STRUNG)
            pool = ["lamp", "planter", "hedge", "grass", "lightbox", "drum"] + ([] if under else ["tree", "tree"]) + ([] if low else ["palm", "palm"])
            kind = "lamp" if z - lamp_z > 18.0 else mr.choice([q for q in pool if q != prev])
            if kind in ("hedge",) and z + 1.6 > b - 2.0:
                kind = "planter"
            if kind == "tree":
                tree(-80.0, G0, z, _square(mr.uniform(0, 6.28)), pit=False, kinds=("jt_tree_b",))
                MEDIAN_TALL.append(z)
                light(D, -80.0, 1.0, z, "pink", 2.5)
            elif kind == "palm":
                J.put("planter_palm", -80.0, G0, z, _square(mr.uniform(0, 6.28)), 1.0, 0.62)
                MEDIAN_TALL.append(z)
                light(D, -80.0, 1.0, z, "green", 2.5)
            elif kind == "lamp":
                J.put("lamp_short", -80.0, G0, z)
                light(D, -80.0, 3.0, z, "amber", 4.0)
                lamp_z = z
            elif kind == "planter":
                J.put("jt_planter", -80.0, G0, z, _square(mr.uniform(0, 1.5)), 1.0, 0.82)
            elif kind == "grass":
                J.put("jt_planter_b", -80.0, G0, z, _square(mr.uniform(0, 6.28)), 1.0, 0.9)
            elif kind == "hedge":
                J.put("jt_hedge", -80.0, G0, z + 0.6, mr.choice((0.0, math.pi)))
                z += 1.2
            elif kind == "lightbox":
                J.put("lightbox", -80.0, G0, z, 0.0)
            else:
                J.put("ad_drum", -80.0, G0, z, _square(mr.uniform(0, 6.28)), 1.0, 0.66)
            prev = kind
            step = mr.uniform(4.5, 7.5)
            rails = mr.choice((0, 1, 2, 2))
            for j in range(rails):
                dz = 2.0 + j * 2.0
                if z + dz + 1.0 < min(b - 2.0, z + step - 1.0):
                    J.put("jt_rail", -80.0, G0, z + dz, HALF_PI)
            z += step


def kerb_kit():
    kr = random.Random(7180)
    for side, xk, shut in ((1, -90.0, [CROSSING, (TORII[0] - 3.0, TORII[1] + 3.0), (DECK[0] - 2.0, DECK[1] + 2.0)] + ALLEYS),
                           (-1, -70.0, [(-194.0, -164.0), (DECK[0] - 2.0, DECK[1] + 2.0)] + PASSAGES)):
        xe = xk - 0.5 * side                                  # the kerb's edge strip, where furniture stands
        used = [i[3] for i in P.INSTANCES if abs(i[1] - xe) < 0.75 and i[2] < 1.0] + [q[2] for q in PEOPLE if abs(q[0] - xe) < 0.75 and q[1] < 1.0]
        used += [GATE_Z, SIGNS_Z, BRIDGE_Z, ARCH_Z, SOUTH_Z, PIPES_Z]
        free = lambda z, rad=1.4: clear_of(z, shut, 0.6) and all(abs(z - u) > rad for u in used)  # noqa: E731
        road = HALF_PI * side
        z = -703.0 + (0.0 if side > 0 else 4.5)
        while z < -13.0:
            if clear_of(z, [DECK]):
                J.put("jt_kerbkit", xk, G0, z, road)
            z += 9.0
        z, k = -698.0 + (0.0 if side > 0 else 13.0), 0
        while z < -16.0:
            roll = kr.random()
            # (The first clear stretch within a few metres of where the dice fell.)
            z = next((z + dz for dz in (0.0, 2.0, 4.0, 6.0) if all(free(z + dz + i * 1.6, 1.0) for i in range(4))), z)
            if roll < 0.3:
                n = kr.randrange(3, 6)
                if all(free(z + i * 1.9, 1.0) for i in range(n)):
                    for i in range(n):
                        J.put("jt_bike", xe, G0, z + i * 1.9, kr.uniform(-0.3, 0.3) + (0.0 if kr.random() < 0.7 else math.pi))
                        used.append(z + i * 1.9)
                    if kr.random() < 0.5:
                        stand(xe - 0.5 * side, z - 0.9, kr.uniform(0, 6.28), kr.choice(("idle", "phone", "squat")), G0)
            elif roll < 0.5:
                if all(free(z + i * 1.5, 0.8) for i in range(4)):
                    for i in range(4):
                        J.put("bollard", xk - 0.4 * side, G0, z + i * 1.5)
                        used.append(z + i * 1.5)
            elif roll < 0.68:
                if free(z) and free(z + 1.3):
                    J.put("bags", xe, G0, z, kr.uniform(0, 6.28))
                    if kr.random() < 0.5:
                        J.put("bags", xe, G0, z + 1.3, kr.uniform(0, 6.28))
                    used += [z, z + 1.3]
            elif roll < 0.8:
                if free(z):
                    J.put("hydrant" if kr.random() < 0.5 else "charge_post", xe, G0, z, -road)
                    used.append(z)
            elif roll < 0.9:
                if free(z):
                    J.put("bin", xe, G0, z, -road)
                    used.append(z)
            if k % 3 == 1 and clear_of(z + 5.0, shut, 1.0):
                J.put("grate_glow", xk - 1.75 * side, G0, z + 5.0, 0.0 if kr.random() < 0.5 else HALF_PI)
            z += kr.uniform(8.0, 12.0)
            k += 1
        # Bollards either side of an alley's or a passage's mouth.
        for a, b in (ALLEYS if side > 0 else PASSAGES):
            for zz in (a - 0.4, b + 0.4):
                if all(abs(zz - u) > 0.8 for u in used):
                    J.put("bollard", xk - 0.4 * side, G0, zz)
    for zz in (CROSSING[0] + 0.6, CROSSING[1] - 0.6):
        J.put("signal_box", -90.55, G0, zz, HALF_PI)


median()
kerb_kit()


# ---------------------------------------------------------------------------
# Round 5 (Zq4zTcIM0yQ@45; the m11 review: "the overhead layer across the
# main street is a single dark beam"): more over both streets, on streams of
# their own. Gantries of signs over the west street on pylons at the kerbs,
# heavy bundles of five to seven cables slung between its fronts, and over
# the gate street cables at two and three a span and a beam of signs from
# wall to wall; none over the reservation's tall trees and palms.
# ---------------------------------------------------------------------------
def gantry(z, r, hue):
    """A truss of signs over the street on two pylons at the kerbs: a row of
    the street's signs and lettered boards facing each way along it, a tube
    on its lower chord, cables slung beside it."""
    xa, xb = -90.6, -69.4
    for x in (xa, xb):
        pylon(x, z, 9.4)
    truss(xa, xb, z, 7.7, 9.0, 0.45, 6)
    for yaw, dz in ((0.0, 0.5), (math.pi, -0.5)):
        panel_row(xa + 1.0, xb - 1.0, 9.2, 1.5, z + dz, yaw, r, r.choice((("word", "slab", "word"), ("slab", "word", "slab"), ("slab", "slab", "word", "slab"))), hue)
    box((D, "neon_" + hue, 0), xa, xb, 7.48, 7.54, z - 0.03, z + 0.03, scale=1.0, bottom=True)
    for dz, y, sag in ((1.4, 8.5, 1.0), (-1.5, 8.9, 0.8)):
        J.span("jt_cable", (xa, z + dz), (xb, z + dz + r.uniform(-0.6, 0.6)), y, sag)
    for x in (-86.0, -74.0):
        light(D, x, 0.3, z, hue, 3.4)


def overhead_more():
    orr = random.Random(7330)
    tall = MEDIAN_TALL
    made = []
    for z0_ in (-597.0, -566.0, -486.0, -400.0):
        for dz in (0.0, 3.0, -3.0, 6.0, -6.0):
            z = z0_ + dz
            if clear_of(z, OVER, 6.0) and all(abs(z - t) > 3.2 for t in tall):
                gantry(z, orr, orr.choice(("cyan", "pink", "amber", "green", "magenta")))
                OVER.append((z - 4.0, z + 4.0))
                made.append(z)
                break
    n = 0
    for z_from, z_to in ((-704.0, -238.0), (-58.0, -10.0)):
        z = z_from
        while z < z_to:
            z += orr.uniform(9.0, 16.0)
            zb = z + orr.uniform(-3.0, 3.0)
            hw, he = height_at("A", z), height_at("E", zb)
            if hw is None or he is None or not (clear_of(z, OVER, 3.0) and clear_of(zb, OVER, 3.0)):
                continue
            if any(abs((z + zb) / 2 - q) < 1.3 for q in STRUNG) or any(abs((z + zb) / 2 - t) < 2.8 for t in tall):
                continue
            y = min(min(hw, he) - 0.8, orr.uniform(7.4, 9.6))
            if y < 6.6:
                continue
            d0 = orr.uniform(0.6, 1.2)
            for j in range(orr.randrange(5, 8)):
                J.span("jt_cable", (XW, z + orr.uniform(-0.4, 0.4)), (XE, zb + orr.uniform(-0.4, 0.4)), y + orr.uniform(-0.35, 0.35), d0 + orr.uniform(-0.25, 0.35))
            STRUNG.append((z + zb) / 2)
            n += 1
    # The gate street: cables across it, and a beam of signs from wall to wall.
    ta_, tb_ = TORII
    x, m = XW - 7.0, 0
    while x > EDGE[1] + 3.0:
        y = orr.uniform(7.0, 9.4)
        for j in range(orr.randrange(2, 4)):
            J.span("jt_cable", (x + orr.uniform(-0.3, 0.3), ta_), (x + orr.uniform(-1.6, 1.6), tb_), y + orr.uniform(-0.3, 0.3), orr.uniform(0.6, 1.3))
        m += 1
        x -= orr.uniform(4.5, 8.5)
    beams = 0
    for xg in (-149.0, -153.0, -104.0):
        hn, hs = height_at("C" if xg < -140 else "A", ta_ - 1.0), height_at("C" if xg < -140 else "A", tb_ + 1.0)
        if hn is None or hs is None or min(hn, hs) < 10.2 or beams:
            continue
        box((D, "trim", 0), xg - 0.16, xg + 0.16, 8.7, 9.15, ta_, tb_, scale=1.0, col=STEELWORK, bottom=True)
        box((D, "trim", 1), xg - 0.22, xg + 0.22, 8.62, 8.7, ta_, tb_, scale=1.0, col=ESCAPE, bottom=True)
        for zz in (ta_ + 2.3, (ta_ + tb_) / 2, tb_ - 2.3):
            for yaw in (HALF_PI, -HALF_PI):
                J.slab_sign((xg + math.sin(yaw) * 0.12, 7.9, zz), basis(yaw), "ps", 1.05, both=False, depth=0.1, need=0.0)
            box((D, "metal", 1), xg - 0.015, xg + 0.015, 8.25, 8.7, zz - 0.6, zz - 0.57, scale=0.5)
            box((D, "metal", 1), xg - 0.015, xg + 0.015, 8.25, 8.7, zz + 0.57, zz + 0.6, scale=0.5)
        box((D, "neon_" + orr.choice(("cyan", "amber", "pink")), 0), xg - 0.03, xg + 0.03, 8.56, 8.62, ta_ + 0.3, tb_ - 0.3, scale=1.0, bottom=True)
        beams += 1
    print("japantown overhead more: gantries", made, "bundles", n, "gate street spans", m, "beams", beams)


overhead_more()

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
        if k % 4 == 2:
            steam(x, z + 0.9, 1.1)
        k += 1
    z += nr.uniform(7.0, 11.0)
for a, b in ALLEYS:
    zc = (a + b) / 2
    tree(-113.0, G0, zc, nr.uniform(0, 6.28), pit=False, sxz=0.85)
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
        rc_ = random.Random(round(a * 3 + xa))
        x = xa + rc_.uniform(1.5, 3.5)
        while x < xb - 1.5:
            J.span("jt_cable", (x, a), (x + rc_.uniform(-1.5, 1.5), b), rc_.uniform(5.0, 8.4), rc_.uniform(0.25, 0.5))
            x += rc_.uniform(2.5, 4.5)
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
    # The ridge: a steel beam, and under it a tube in its housing on two
    # rods between each pair of ribs.
    box((D, "trim", 0), xm - 0.42, xm + 0.42, yr - 0.02, yr + 0.14, z0, z1, scale=1.0, col=STEELWORK, bottom=True)
    z = z0 + 2.0
    while z < z1 - 1.0:
        box((D, "trim", 1), xm - 0.16, xm + 0.16, yr - 0.52, yr - 0.4, z - 1.3, z + 1.3, scale=1.0, col=(0.1, 0.1, 0.11, 1))
        box((D, "neon_amber", 0), xm - 0.05, xm + 0.05, yr - 0.6, yr - 0.52, z - 1.2, z + 1.2, scale=1.0, bottom=True)
        for dz in (-1.0, 1.0):
            box((D, "metal", 1), xm - 0.02, xm + 0.02, yr - 0.4, yr - 0.02, z + dz - 0.02, z + dz + 0.02, scale=1.0)
        z += 4.0
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
# (Round 3: the gate stands 10.3 m to its lintel, so from the plaza
# street's mouth, across the ramp, its posts, tie beam, plaque and lintel
# stand over the ramp's parapet and the deck's chevron board there.)
TORII_H = 10.3
for z in (ta + 0.75, tb - 0.75):
    cylinder((D, "trim", 0), gx, z, G0, TORII_H, 0.4, segs=10, col=TORII_RED)
    cylinder((D, "dark", 0), gx, z, G0, 0.95, 0.5, segs=10)
    J.put("lantern", gx, 5.2, z + (1.1 if z < tc else -1.1), 0.0, 2.3, 2.3)
box((D, "trim", 0), gx - 0.32, gx + 0.32, TORII_H, TORII_H + 0.34, ta + 0.3, tb - 0.3, scale=1.0, col=TORII_RED, bottom=True)
box((D, "trim", 0), gx - 0.46, gx + 0.46, TORII_H + 0.34, TORII_H + 0.78, ta + 0.05, tb - 0.05, scale=1.0, col=TORII_RED, bottom=True)
box((D, "dark", 0), gx - 0.54, gx + 0.54, TORII_H + 0.78, TORII_H + 0.94, ta + 0.02, tb - 0.02, scale=1.0, bottom=True)
for z0_, z1_ in ((ta + 0.02, ta + 0.6), (tb - 0.6, tb - 0.02)):
    box((D, "dark", 0), gx - 0.5, gx + 0.5, TORII_H + 0.94, TORII_H + 1.02, z0_, z1_, scale=1.0)
ny = TORII_H - 1.7
box((D, "trim", 0), gx - 0.22, gx + 0.22, ny, ny + 0.4, ta + 0.35, tb - 0.35, scale=1.0, col=TORII_RED, bottom=True)
box((D, "trim", 0), gx - 0.14, gx + 0.14, ny + 0.4, TORII_H, tc - 0.8, tc + 0.8, scale=1.0, col=(0.06, 0.05, 0.05, 1))
for yaw in (HALF_PI, -HALF_PI):
    J.slab_sign((gx + math.sin(yaw) * 0.16, (ny + 0.4 + TORII_H) / 2, tc), basis(yaw), "bx", 0.85, both=False, depth=0.04)
for xo in (0.34, -0.34):
    box((D, "neon_red", 0), gx + xo - 0.03, gx + xo + 0.03, TORII_H - 0.02, TORII_H + 0.06, ta + 0.4, tb - 0.4, scale=1.0, bottom=True)
    box((D, "neon_red", 0), gx + xo * 0.7 - 0.03, gx + xo * 0.7 + 0.03, ny - 0.06, ny + 0.02, ta + 0.45, tb - 0.45, scale=1.0, bottom=True)
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
            tree(x - 4.4, G0, tc + tr.uniform(-0.6, 0.6), tr.uniform(0, 6.28))
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
# What closes the gate street (round 5: the m11 review saw its vanishing
# point "black speckled with white dots under a thin white arc", the lane
# ending in the far city's dark ground at street level, under the board):
# a wall of six storeys along the edge strip's far side, x -170, well past
# the street's line either way, shops lit along its foot, bands of windows
# over them, its signs either side of the board on legs, which stands
# before it; its back to the far city in windows too.
# ---------------------------------------------------------------------------
FAR_Z = (tc - 17.0, tc + 17.0)


def far_wall(r):
    z0, z1 = FAR_Z
    x0, x1 = EDGE[0], EDGE[0] + 0.3
    h = storeys(6)
    tint = B.TINTS["plum"]
    tcol = B.TRIM[tint]
    box((D, "plaster", 0), x0, x1, 0.0, h, z0, z1, scale=1.0, col=LANE_WALLS[2])
    fe = B.Face("+x", x1 + 0.02, z0, z1)
    banded(fe, SHOP_H, h, r, tint)
    flush_shops(fe, r, tcol)
    J.lantern_row(fe, 0.8, fe.width - 0.8, 3.05, 0.62, 1.7)
    for zz in (z0 + 3.0, tc - 7.0, tc + 7.0, z1 - 3.0):
        light(D, x1 + 1.6, 0.3, zz, r.choice(("amber", "red", "pink")), 4.5)
    for za_, zb_ in ((z0, tc - 5.4), (tc + 5.4, z1)):
        signs_on(B.Face("+x", x1 + 0.02, za_, zb_), h, r, 1.15)
    fb = B.Face("-x", x0 - 0.02, z0, z1)
    banded(fb, 0.0, h, r, tint, ribs=False)
    box((D, "trim", 0), x0 - 0.08, x1 + 0.08, h, h + 0.3, z0, z1, scale=1.0, col=tcol, bottom=True)
    for zz in (z0 + 5.0, z1 - 5.0):
        J.tube_sign((x1 + 0.3, h + 1.6, zz), HALF_PI, 5.2, 1.5, r.choice(("cyan", "pink", "amber")), r, both=False)
        for dz in (-2.0, 2.0):
            box((D, "metal", 0), x1 + 0.1, x1 + 0.22, h + 0.3, h + 0.9, zz + dz - 0.06, zz + dz + 0.06, scale=1.0)


far_wall(random.Random(7460))

# ---------------------------------------------------------------------------
# The ramp's walls where the street sees them (the ramp and its paint are
# the deck's; what the street has put on them is Japantown's): bills pasted
# along the parapet and, where it is tall enough, the retaining wall under
# the fascia; a pair of pipes on brackets along the fascia's foot, over the
# deck's chipped yellow there, into a box at each end; machines against the
# wall with their light on the lane, a standing lightbox, bags, a bin, a
# bicycle. Nothing stands more than 0.9 m off it: the service lanes' cars
# run 2.5 m from it.
# ---------------------------------------------------------------------------
def ramp_y(z):
    """The ramp's road at z (deck.py's RY)."""
    def sm(t):
        t = max(0.0, min(1.0, t))
        return t * t * (3.0 - 2.0 * t)
    Y, F, Z = plan.DECK_Y, plan.RAMP_FOOT_Z, plan.DECK_Z
    zn = Z - plan.DECK_HALF
    if z >= zn:
        return Y
    ry_ = lambda v: Y * sm((v - F) / (Z - F))  # noqa: E731
    return ry_(z) + (Y - ry_(zn)) * max(0.0, min(1.0, (z - (zn - 10.0)) / 10.0))


RAMP_X = {1: plan.DECK_X0 + plan.RAMP_HALF, -1: plan.DECK_X0 - plan.RAMP_HALF}   # its east and west faces
GIRDER = plan.DECK_Y - plan.DECK_UNDER      # the fascia's depth under the road
RAMP_KEEP = {1: [(-183.6, -174.4)], -1: [(CROSSING[0] - 1.0, CROSSING[1] + 1.0)]}   # the deck's chevron board; the walkway's crossing
RAMP_JOINTS = (-203.0, -186.0, -168.0, -150.0)
RAMP_BUTTS = tuple(-185.0 + 5.0 * k for k in range(8))
RAMP_FIT = {1: ((-209.5, "bags"), (-205.8, "vending"), (-204.8, "vending"), (-199.0, "jt_bike"), (-196.6, "bin"),
                (-163.0, "vending"), (-162.0, "vending"), (-158.6, "bin"), (-153.2, "jt_bike")),
            -1: ((-208.0, "bags"), (-196.5, "vending"), (-191.8, "bin"), (-178.0, "vending"), (-177.0, "vending"), (-166.6, "lightbox"), (-157.5, "bags"))}
# (Where the plaza street's cars turn out of the T, z -192..-166, the east
# face has only what is flat on it: bills, the pipes, two lit panels.)
RAMP_PANELS = {1: (-186.2, -171.6), -1: ()}


def ramp_pipes(d, z0, z1):
    """Two pipes along the fascia's foot from z0 to z1 (detail), a bracket
    every 1.8 m, a box at each end where they turn into the wall."""
    x = RAMP_X[d]
    k = (D, "metal", 1)
    zs_ = [z0 + (z1 - z0) * i / max(1, round((z1 - z0) / 2.0)) for i in range(round((z1 - z0) / 2.0) + 1)]
    for o, dy, r in ((0.08, 0.24, 0.05), (0.06, 0.37, 0.032)):
        for za, zb in zip(zs_, zs_[1:]):
            pipe(k, (x + d * o, ramp_y(za) - GIRDER + dy, za), (x + d * o, ramp_y(zb) - GIRDER + dy, zb), r, segs=5, col=(0.16, 0.17, 0.18, 1))
    z = z0 + 0.6
    while z < z1 - 0.4:
        y = ramp_y(z) - GIRDER
        box(k, *sorted((x, x + d * 0.14)), y + 0.17, y + 0.42, z - 0.03, z + 0.03, scale=0.5, col=(0.1, 0.1, 0.11, 1))
        z += 1.8
    for z in (z0, z1):
        y = ramp_y(z) - GIRDER
        box(k, *sorted((x, x + d * 0.2)), y + 0.12, y + 0.56, z - 0.24, z + 0.24, scale=0.5, col=(0.2, 0.21, 0.2, 1))


def ramp_face(d, z0, z1, r):
    x = RAMP_X[d]
    yaw = d * HALF_PI
    keep = RAMP_KEEP[d] + [(j - 0.35, j + 0.35) for j in RAMP_JOINTS]

    def clear(a, b):
        return all(b < k0 or a > k1 for k0, k1 in keep)
    # Bills along the parapet (the east face; the west one carries the
    # walkway's upstand and open rail), at the low end's height, now in
    # runs, now one or two. A prototype's +x runs toward -z on the east face.
    z = z0 + r.uniform(0.5, 2.0)
    n = 0
    while d > 0 and z < z1 - 1.0:
        roll = r.random()
        if roll < 0.42 and clear(z, z + 2.3):
            name, w, mid = "jt_bills", 2.3, z + 1.3
        elif roll < 0.8 and clear(z, z + 0.7):
            name, w, mid = "jt_bill", 0.7, z + 0.35
        else:
            z += r.uniform(0.8, 2.4)
            continue
        J.put(name, x + 0.002, ramp_y(z) + 0.07 + r.uniform(0.0, 0.02), mid, yaw, 0.92)
        n += 1
        z += w + (r.uniform(0.05, 0.3) if r.random() < 0.5 else r.uniform(1.0, 3.5))
    # Bills on the retaining wall between the buttresses, where the wall
    # under the fascia stands over 1.3 m.
    for za, zb in zip(RAMP_BUTTS, RAMP_BUTTS[1:]):
        top = ramp_y(za) - GIRDER
        if top < 1.75:
            continue
        zz = za + 0.6 + r.uniform(0.0, 0.5)
        while zz < zb - 1.2:
            if not clear(zz, zz + 0.7):
                zz += 0.7
                continue
            fits = [nm for nm, w in (("jt_bills", 2.3), ("jt_bill", 0.7)) if zz + w < zb - 0.5]
            if not fits:
                break
            nm = r.choice(fits)
            J.put(nm, x - d * 0.148, 0.5 + r.uniform(0.0, 0.25), zz + ((1.3 if d > 0 else 0.98) if nm == "jt_bills" else 0.35), yaw)
            if top > 2.65 and r.random() < 0.6:
                J.put("jt_bill", x - d * 0.148, 1.42 + r.uniform(0.0, 0.1), zz + r.uniform(0.3, 1.2), yaw)
            zz += (2.3 if nm == "jt_bills" else 0.7) + r.uniform(0.2, 1.4)
            n += 1
    for z in RAMP_PANELS[d]:
        J.slab_sign((x + d * 0.15, ramp_y(z - 0.77) + 0.48, z), basis(yaw), "ps", 0.85, both=False, depth=0.06)
        for zb in (z - 0.5, z + 0.5):
            box((D, "metal", 1), *sorted((x, x + d * 0.13)), ramp_y(z - 0.77) + 0.4, ramp_y(z - 0.77) + 0.5, zb - 0.03, zb + 0.03, scale=0.5)
    # What stands against it on the lane.
    for z, name in RAMP_FIT[d]:
        if name == "vending":
            J.put("vending", x + d * 0.6, 0.0, z, yaw)
            light(D, x + d * 1.9, 0.3, z, r.choice(("white", "cyan", "white")), 1.3)
        elif name == "lightbox":
            J.put("lightbox", x + d * 0.32, 0.0, z, yaw)
        elif name == "jt_bike":
            J.put("jt_bike", x + d * 0.5, 0.0, z, 0.0 if r.random() < 0.5 else math.pi)
        else:
            J.put(name, x + d * 0.55, 0.0, z, r.uniform(0, 6.28))
    return n


_rr = random.Random(9177)
_rb = sum(ramp_face(d, plan.RAMP_FOOT_Z + (3.0 if d > 0 else 1.0), -151.0, _rr) for d in (1, -1))
ramp_pipes(1, -187.6, -151.4)
ramp_pipes(-1, -187.6, -151.4)
print("japantown ramp walls:", _rb, "bills;", "the gate seen over the ramp:", hero_sees((gx - 0.6, 0.0, ta), (gx + 0.6, TORII_H + 1.1, tb)))

def lane_east():
    """The east lane's far wall is the back of the canyon's row, and that
    row's builder's; what stands against it in the lane is Japantown's.
    Wherever that wall has nothing of its own within a stride (its doors,
    shutters, lamps and signs are read from what is already built), the
    lane's side of it gets pipes on straps, meters, a unit dripping, vents,
    a duct, what is put out, and over head height a run of trays and pipes
    from end to end."""
    f = B.Face("-x", LANE[1], -706.0, -192.0)
    low, high = [], []
    for (dist, mat, _), b in batches.items():
        if not dist.startswith("canyon") or not (mat.startswith("neon_") or mat in ("door", "door_panel", "shop", "glow", "sign", "lobby")):
            continue
        for fc in b.faces:
            vs = [b.verts[i] for i in fc]
            if all(abs(v[0] - LANE[1]) < 0.7 and v[2] < 4.4 for v in vs):
                zs = [-v[1] for v in vs]
                (high if max(v[2] for v in vs) > 3.3 else low).append((min(zs) - f.left - 0.2, max(zs) - f.left + 0.2))
    low += [(i[3] - f.left - 0.9, i[3] - f.left + 0.9) for i in P.INSTANCES if abs(i[1] - LANE[1]) < 1.1 and i[2] < 4.0]
    clear = lambda s0, s1, what: not any(a < s1 and b > s0 for a, b in what)  # noqa: E731
    rx = random.Random(7520)
    s, breaks, n = 2.0, list(high), 0
    while s < f.width - 2.0:
        name, wd = rx.choice((("jt_pipes", 0.8), ("jt_pipes", 0.8), ("jt_meters", 1.2), ("jt_ac", 1.0), ("jt_ac", 1.0), ("jt_vent", 0.85), ("jt_duct", 0.7),
                              ("crates", 1.3), ("bags", 1.5), ("pallets", 1.3), ("dumpster", 2.0), ("barrel", 0.8)))
        ground = name in ("crates", "bags", "pallets", "dumpster", "barrel")
        if clear(s - 0.2, s + wd + 0.2, low if ground else low + high) and not any(z - 2.0 < f.at(s) < z + 2.0 for z in [q[1] for q in STEAM if q[0] > -50.0]):
            if ground:
                x, _, z = f.p(f.at(s + wd / 2), G0, 0.65 if name != "barrel" else 0.45)
                J.put(name, x, G0, z, f.yaw)
            else:
                J.put(name, *f.p(f.at(s + wd / 2), G0, 0.0), f.yaw, min(1.0, 1.0) if name != "jt_ac" else rx.uniform(0.92, 1.1))
                if name == "jt_duct":
                    breaks.append((s - 0.1, s + 0.9))
            n += 1
        s += wd + rx.uniform(0.3, 1.6)
    services(f, 1.0, f.width - 1.0, breaks, rx)
    return n


# (The lanes' columns, strings and stalls are set down before their walls are dressed: see LANES.)
steam(-47.0, -520.0)
steam(-47.0, -300.0)
steam(-140.0, -350.0)
steam(-140.0, -600.0)
for i, v in enumerate(VENTS):
    if len(v) == 4:
        steam(v[0], v[2], v[1], "roof")
    elif i % 9 == 4:
        steam(v[0], v[2], v[1], "lane")
for i, (x, y, z) in enumerate(ZZ_VENTS):
    empty(f"anchor_steam_zzjt_roof_{i}", (x, y + 0.1, z))
print("japantown east lane wall:", lane_east(), "things against it,", len(STEAM), "steam vents,", len(ZZ_VENTS), "on the crowns")

# ---------------------------------------------------------------------------
# Round 5: the west street's south end, between the deck and the junction
# (the m11 review, jt07: "broad, empty, wet asphalt with almost no markings
# ... no manholes"): its paint (left-turn arrows in the two lanes into the
# T, a stop bar, a bay for motorbikes at each kerb), tar seams and patches,
# iron covers, three of them breathing; and steam besides at the stalls,
# lane vents and air conditioners the street and the lanes see, named to
# sort after every vent the page's plumes are dealt from.
# ---------------------------------------------------------------------------
ZZZ = []


def zsteam(x, z, y, kind):
    if len(ZZZ) < 56:
        empty(f"anchor_steam_zzzjt_{kind}_{len(ZZZ)}", (x, y + 0.1, z))
        ZZZ.append((x, z))


def _flat(key, pts, y, col):
    poly(key, [(px, y, pz) for px, pz in pts], [(0, 0)] * len(pts), col)


def south_road():
    k = (D, "paint", 0)
    white, yellow, tar = (0.62, 0.6, 0.55, 1), (0.7, 0.52, 0.08, 1), (0.012, 0.012, 0.014, 1)
    y = 0.014
    # The stop bar across the two lanes going south, before the T's box.
    _flat(k, ((-89.6, -9.4), (-80.2, -9.4), (-80.2, -8.9), (-89.6, -8.9)), y, white)
    # Left-turn arrows (toward +x, the south street runs east) in both lanes.
    for xc in (-85.8, -82.0):
        for zc in (-16.0, -40.0):
            _flat(k, ((xc - 0.09, zc - 2.6), (xc + 0.09, zc - 2.6), (xc + 0.09, zc + 0.4), (xc - 0.09, zc + 0.4)), y, white)
            _flat(k, ((xc - 0.09, zc + 0.4), (xc + 0.09, zc + 0.22), (xc + 0.75, zc + 0.85), (xc + 0.62, zc + 1.0)), y, white)
            _flat(k, ((xc + 0.5, zc + 1.35), (xc + 1.05, zc + 0.55), (xc + 0.95, zc + 1.45)), y, white)
    # A bay for motorbikes at each kerb: its outline, the bikes in it at a slant.
    br = random.Random(7710)
    for x0_, x1_, zs, yaw0 in ((-89.95, -88.75, (-27.0, -13.0), 0.3), (-71.25, -70.05, (-46.0, -32.0), -0.3)):
        za_, zb_ = zs
        xl = x1_ if x0_ < -80.0 else x0_
        for q in (((x0_, za_), (x1_, za_), (x1_, za_ + 0.12), (x0_, za_ + 0.12)), ((x0_, zb_ - 0.12), (x1_, zb_ - 0.12), (x1_, zb_), (x0_, zb_)),
                  ((xl - 0.06, za_), (xl + 0.06, za_), (xl + 0.06, zb_), (xl - 0.06, zb_))):
            _flat(k, q, y, white)
        z = za_ + 0.9
        while z < zb_ - 0.8:
            if br.random() < 0.8:
                J.put(br.choice(("jt_scooter", "jt_scooter", "jt_bike")), (x0_ + x1_) / 2, 0.0, z, yaw0 + br.uniform(-0.08, 0.08))
            z += br.uniform(0.75, 1.1)
    # Tar: a seam down the outer lane, patches where it was dug up, covers.
    _flat(k, ((-87.7, -57.0), (-87.55, -57.0), (-87.1, -12.0), (-87.25, -12.0)), y - 0.002, tar)
    for x, z, w_, d_ in ((-84.0, -51.0, 2.2, 1.4), (-75.5, -27.0, 1.6, 3.0), (-78.4, -45.0, 1.1, 0.9), (-87.0, -24.5, 1.4, 1.0)):
        _flat(k, ((x - w_ / 2, z - d_ / 2), (x + w_ / 2, z - d_ / 2 + 0.1), (x + w_ / 2 - 0.1, z + d_ / 2), (x - w_ / 2 + 0.08, z + d_ / 2 - 0.05)), y - 0.003, tar)
    for x, z, breath in ((-84.2, -50.6, True), (-75.6, -26.4, True), (-77.0, -15.5, False), (-86.6, -33.0, True)):
        cylinder((D, "metal", 0), x, z, 0.0, 0.035, 0.42, segs=10, col=(0.05, 0.05, 0.055, 1), cap=True)
        if breath:
            zsteam(x, z, 0.04, "street")


def steam_more():
    """Steam the street and the lanes see (named after every vent the page's
    plumes are dealt from: those keep their deal)."""
    sr_ = random.Random(7720)
    for x, z in STALL_POTS[::2]:
        zsteam(x, z, 1.05, "stall")
    for (x, z) in ((-47.4, -436.0), (-46.6, -402.0), (-139.6, -548.0), (-140.4, -492.0), (-102.0, -567.6), (-113.0, -486.0), (-113.4, -400.0),
                   (-47.0, -610.0), (-140.0, -650.0), (-140.0, -300.0)):
        zsteam(x + sr_.uniform(-0.2, 0.2), z, 0.04, "street")
    acs = [i for i in P.INSTANCES if i[0] == "jt_ac" and i[7] == D]
    for i in acs[::12]:
        zsteam(i[1] + math.sin(i[4]) * 0.35, i[3] + math.cos(i[4]) * 0.35, i[2] + 1.2, "lane")


south_road()
steam_more()
print("japantown round 5 steam:", len(ZZZ), "vents after the dealt ones")



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
# A check: no bake source where the bake mirrors it (the module's note).
# ---------------------------------------------------------------------------
_bad = 0
for (dist, mat, _), b in batches.items():
    if dist != D or not (mat.startswith("neon_") or mat in ("sign", "shop", "billboard", "lantern", "lobby")):
        continue
    for fc in b.faces:
        vs = [b.verts[i] for i in fc]
        cx = sum(v[0] for v in vs) / len(vs)
        cy = sum(v[2] for v in vs) / len(vs)
        if abs(cx) < 20.0 and cy > 1.0:
            _bad += 1
B.billboard = _kit_billboard
# The lantern alley's shops seen from three metres (the generator's panes
# on row A's back): every room's lamps at least four fifths up, so none is a
# dark hole with its tubes floating in it.
_sb = batches[(D, "shop", 0)]
_lit = 0
for fc in _sb.faces:
    xs_ = [_sb.verts[i][0] for i in fc]
    if all(abs(xv - NAKA[1]) < 0.6 or abs(xv - NAKA[0]) < 0.6 for xv in xs_):
        for i in fc:
            c_ = _sb.cols[i]
            if c_[0] < 0.8:
                _sb.cols[i] = (0.8 + 0.2 * c_[0], c_[1], c_[2], c_[3])
                _lit += 1
print("japantown: lantern alley panes brightened:", _lit // 4)
# A phone's pack (1.0 MB) holds the district's walls, glass, signs and
# lamps; trim smaller than a hand's breadth square (the generator's sills,
# brackets, the ends of rails and ledges, the frames' returns) is detail,
# as the brief has small ornament: drawn on a desktop, left off a phone.
def _small_to_detail(mat, amax):
    import mathutils
    src = batches.get((D, mat, 0))
    if not src:
        return 0
    dst = batches[(D, mat, 1)]
    keep_ = Batch()
    moved = 0
    for fc in src.faces:
        v = [mathutils.Vector(src.verts[i]) for i in fc]
        area = sum(((v[k] - v[0]).cross(v[k + 1] - v[0])).length / 2 for k in range(1, len(v) - 1))
        tgt = dst if area < amax else keep_
        base = len(tgt.verts)
        tgt.verts.extend(src.verts[i] for i in fc)
        tgt.uvs.extend(src.uvs[i] for i in fc)
        tgt.cols.extend(src.cols[i] for i in fc)
        tgt.faces.append(tuple(range(base, base + len(fc))))
        moved += (len(fc) - 2) if area < amax else 0
    batches[(D, mat, 0)] = keep_
    return moved


# Two pools of one hue within a stride of each other are one pool between
# them, as strong as the stronger and a third of the other (each pool is
# twenty bytes of the pack on both tiers).
def _merge_lights(dist=1.6):
    flat = LIGHTS.get(D, [])
    pts = [list(flat[i:i + 5]) for i in range(0, len(flat), 5)]
    pts.sort(key=lambda q: (q[3], q[0], q[2]))
    out, used = [], [False] * len(pts)
    for i, a in enumerate(pts):
        if used[i]:
            continue
        for j in range(i + 1, min(len(pts), i + 40)):
            b = pts[j]
            if used[j] or b[3] != a[3] or abs(b[0] - a[0]) > dist * 10:
                continue
            if (b[0] - a[0]) ** 2 + (b[2] - a[2]) ** 2 < (dist * 10) ** 2 and abs(b[1] - a[1]) < 12:
                hi, lo = (a, b) if a[4] >= b[4] else (b, a)
                a = [round((a[0] + b[0]) / 2), round((a[1] + b[1]) / 2), round((a[2] + b[2]) / 2), a[3], round(hi[4] + lo[4] / 3)]
                used[j] = True
        out.append(a)
    LIGHTS[D] = [v for q in out for v in q]
    return len(pts), len(out)


print("japantown: light pools merged:", _merge_lights())
print("japantown: small trim to detail:", _small_to_detail("trim", 0.1), "triangles")


def _thin_to_detail(mat, wmax):
    """A sign frame's returns (a face under wmax across) are detail too."""
    import mathutils
    src = batches.get((D, mat, 0))
    if not src:
        return 0
    dst, keep_, moved = batches[(D, mat, 1)], Batch(), 0
    for fc in src.faces:
        v = [mathutils.Vector(src.verts[i]) for i in fc]
        area = sum(((v[k] - v[0]).cross(v[k + 1] - v[0])).length / 2 for k in range(1, len(v) - 1))
        edge = max((v[(k + 1) % len(v)] - v[k]).length for k in range(len(v)))
        thin = area / max(edge, 1e-6) < wmax
        tgt = dst if thin else keep_
        base = len(tgt.verts)
        tgt.verts.extend(src.verts[i] for i in fc)
        tgt.uvs.extend(src.uvs[i] for i in fc)
        tgt.cols.extend(src.cols[i] for i in fc)
        tgt.faces.append(tuple(range(base, base + len(fc))))
        moved += (len(fc) - 2) if thin else 0
    batches[(D, mat, 0)] = keep_
    return moved


def _fold(src_key, dst_key):
    """A batch of a few faces folded into a like one: every batch is a mesh
    of its own in the pack, and on a phone a mesh's own entry costs more
    than a few faces."""
    a = batches.pop(src_key, None)
    if not a or not a.faces:
        return 0
    b = batches[dst_key]
    base = len(b.verts)
    b.verts.extend(a.verts)
    b.uvs.extend(a.uvs)
    b.cols.extend(a.cols)
    b.faces.extend(tuple(i + base for i in fc) for fc in a.faces)
    return len(a.faces)


print("japantown: thin frames to detail:", _thin_to_detail("board_frame", 0.08), "triangles; folded:",
      [(k_[1], _fold(k_, v_)) for k_, v_ in (((D, "neon_purple", 0), (D, "neon_magenta", 0)), ((D, "neon_teal", 0), (D, "neon_cyan", 0)),
                                           ((D, "metal", 0), (D, "metal", 1)), ((D, "clearglass", 0), (D, "clearglass", 1)))])
# What of Japantown's stands by the deck's stair (the walk agent's check):
# every prop within the stair's x and a metre of its wall, its box against
# the stair's band at its x.
_st = []
for nm_, x_, y_, z_, yaw_, sy_, sxz_, d_ in P.INSTANCES:
    if d_ == D and STAIR_X[0] - 1.0 < x_ < STAIR_X[1] + 0.5 and -75.2 < z_ < -73.5:
        bx_ = P.PROTOS[nm_]["box"]
        hi_ = y_ + 2.0 * bx_[1] * sy_
        b_ = [stair_band(x_ + dx_) for dx_ in (-bx_[0] * sxz_, 0.0, bx_[0] * sxz_)]
        hit_ = any(b and y_ < b[1] and hi_ > b[0] for b in b_)
        _st.append((nm_, round(x_, 2), round(z_, 2), round(y_, 2), round(hi_, 2), "HIT" if hit_ else "clear"))
print("japantown by the deck's stair:", _st)
if os.environ.get("JT_DUMP"):
    # (For whoever is working on the district: every lot, to a file.)
    import json
    with open(os.environ["JT_DUMP"], "w") as fh:
        json.dump([dict(row=rc["row"], x0=rc["lot"].x0, x1=rc["lot"].x1, z0=round(rc["lot"].z0, 2), z1=round(rc["lot"].z1, 2), h=round(rc["h"], 1), roof=rc.get("roof"),
                        tiers=[[round(v, 2) for v in t] for t in rc["tiers"]], sides=rc["sides"]) for rc in LOTS], fh)
# And a check: the hero's lens sees none of what round 3 raised (its own
# west row stands between), nor does the high bridge cross what it frames.
_seen = [(rc["row"], round(rc["lot"].z0), rc["h"]) for rc in LOTS if rc["h"] > 22.0 and hero_sees((rc["lot"].x0, 0.0, rc["lot"].z0), (rc["lot"].x1, rc["h"] + 6.0, rc["lot"].z1))]
print("japantown hero sees:", _seen, "the high bridge:", hero_sees((XW, 29.0, HIGH_Z - 3.0), (XE, 41.5, HIGH_Z + 3.0)), hero_covers((XW, 29.0, HIGH_Z - 3.0), (XE, 41.5, HIGH_Z + 3.0)),
      "masses:", len(HERO_MASSES))
print("japantown lucy:", LUCY)
print("japantown decks:", [(rc["row"], round(rc["lot"].z0), round(rc["lot"].z1), rc["h"]) for rc in LOTS if rc.get("roof") == "deck" and rc["row"] in "AE"][:14])
print(f"japantown: {len(LIGHTS.get(D, [])) // 5} lights, {len(STREET_SIGN_IDS)} sign ids so far in the city")
print(f"japantown: {len(LOTS)} lots, {sum(1 for i in P.INSTANCES if i[7] == D)} props, {len(PEOPLE)} people so far in the city, bake sources the hero's road would mirror: {_bad}")
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
