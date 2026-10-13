"""The megabuilding's faces and its light well.

The block's core (mega.py) is three windowed masses. This hangs on them
what makes a megabuilding of it: walkway decks with parapets and marker
lights, balconies, plain floors of air conditioners, cantilevered blocks
with yellow edges (Fn9gKhU_2_Q@24), sheet-metal ducts up the face, columns
of signs at its corners, a service core up each side wall with the block's
number painted on it, and the light well through its middle: a walkway round
every floor, bridges across at several heights, dot lights along the edges,
pink windows, ducts, an orange wall (Fn9gKhU_2_Q@21, KvMY1uzSC1E@13).

What the hero's lens can see of the front (the middle section, and the
tops of the outer two) gets only what is dark and thin, its marker lights
dimmed; `hero_hidden` guards the rest.
"""
from ncw.kit import *  # noqa: F401,F403
import ncw.kit as K
from ncw import buildings as B
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_homes import homes_floor, homes_face


def hero_hidden(x0, x1, y0, y1, z):
    """Whether no part of the rectangle x0..x1, y0..y1 at z is seen by the
    hero's lens over and between the canyon's blocks."""
    for e in HERO_EYES:
        for i in range(5):
            for j in range(5):
                p = (x0 + (x1 - x0) * i / 4, y0 + (y1 - y0) * j / 4, z)
                if not any(K._crosses(e, p, lo, hi) for lo, hi in HERO_MASSES if hi[2] > z + 1.0):
                    return False
    return True


FACE_T = (D, "trim", 0)
BANDS = (24.0, 43.0, 62.0, 79.0)             # the core's own decks
fW = face("+z", MB_ZF, -48.0, -18.0)
fM = face("+z", MB_ZF - MB_REC, -18.0, 18.0)
fE = face("+z", MB_ZF, 18.0, 48.0)


def segments(f, blocked, inset=0.3):
    """The runs of a face left between `blocked` stretches (s0, s1)."""
    out, at = [], inset
    for b0, b1 in sorted(blocked):
        if b0 - at > 1.2:
            out.append((at, b0))
        at = max(at, b1)
    if f.width - inset - at > 1.2:
        out.append((at, f.width - inset))
    return out


def walkway(f, y, segs, out=1.35, dots=AMBER_DOT, col=CONC, people_rate=0.0, r=None):
    """A walkway deck along a face at a floor line: slab, parapet, lights."""
    for s0, s1 in segs:
        fbox(f, FACE_T, s0, s1, y - 0.26, y, 0.0, out, col=col, bottom=True)
        fbox(f, FACE_T, s0, s1, y, y + 1.0, out - 0.16, out, col=col)
        f.quad((D, "trim", 1), s0, s1, y + 0.86, y + 1.0, out + 0.012, col=YEL_OLD)
        if dots:
            n = max(1, int((s1 - s0) // 3.2))
            for i in range(n):
                s = s0 + (s1 - s0) * (i + 0.5) / n
                f.quad((D, "glow", 1), s - 0.17, s + 0.17, y + 0.42, y + 0.52, out + 0.014, col=dots)
        if r is not None and people_rate > 0:
            s = s0 + 1.0
            while s < s1 - 1.0:
                if r.random() < people_rate:
                    px, _, pz = f.p(f.at(s), y, out - 0.6)
                    pose = r.choice(("idle", "idle", "phone", "smoke", "lean"))
                    stand(px, pz, f.yaw + (math.pi if pose == "lean" else 0.0), pose, y)
                s += r.uniform(2.5, 6.0)


def balconies(f, y, blocked, r, rate=0.5, cols=(CONC, CONC, STEEL, BLACK), homes=True):
    bays = max(1, round(f.width / CELL_W))
    bw = f.width / bays
    used = []
    for b in range(bays):
        s = (b + 0.5) * bw
        if any(b0 - 1.3 < s < b1 + 1.3 for b0, b1 in blocked) or r.random() > rate:
            continue
        w = r.choice((1.2, 1.3, 1.45))
        used.append((s - w, s + w))
        if homes and r.random() < 0.5:
            # An open balcony: its slab, a steel rail, a lit room behind.
            fbox(f, FACE_T, s - w, s + w, y - 0.16, y + 0.06, 0.0, 1.1, col=r.choice(cols), bottom=True)
            fbox(f, (D, "metal", 0), s - w, s + w, y + 0.98, y + 1.04, 1.02, 1.1)
            for i in range(6):
                sb = s - w + 2 * w * i / 5
                f.quad((D, "metal", 1), sb - 0.025, sb + 0.025, y + 0.06, y + 0.98, 1.09)
        else:
            fbox(f, FACE_T, s - w, s + w, y - 0.16, y + 0.95, 0.0, 1.1, col=r.choice(cols), bottom=True)
        roll = r.random()
        if roll < 0.3:
            ax, ay, az = f.p(f.at(s + r.uniform(-0.5, 0.5)), y + 1.3, 0.0)
            P.place("ac_wall", ax, ay, az, f.yaw)
        elif roll < (0.62 if homes else 0.42):
            # Washing on a line over the rail.
            pa, pb = f.p(f.at(s - w + 0.2), y + 1.9, 1.05), f.p(f.at(s + w - 0.2), y + 1.9, 1.05)
            cloth((pa[0], y + 1.15, pa[2]), (pb[0], y + 1.15, pb[2]), (pb[0], y + 1.9, pb[2]), (pa[0], y + 1.9, pa[2]),
                  r.choice(("pink", "cyan", "amber", "white", "teal")))
    return used


def plain(f, y, blocked, r, rate=0.35):
    bays = max(1, round(f.width / CELL_W))
    bw = f.width / bays
    used = []
    for b in range(bays):
        s = (b + 0.5) * bw + r.uniform(-0.6, 0.6)
        if any(b0 - 0.6 < s < b1 + 0.6 for b0, b1 in blocked) or r.random() > rate:
            continue
        ax, ay, az = f.p(f.at(s), y + 0.05, 0.0)
        P.place("ac_wall", ax, ay, az, f.yaw)
        used.append((s - 0.5, s + 0.5))
    for s0, s1 in segments(f, blocked):
        f.ledge((D, "trim", 1), s0, s1, y - 0.2, 0.2, 0.22, CONC)
    return used


def pod(f, s0, s1, k0, k1, out, seed, tint=5, window=0, lit=0.75):
    """A block cantilevered off the face over two or three floors: windows on
    its front, yellow along its top and bottom edges, ribs underneath."""
    r = random.Random(seed)
    y0, y1 = floor_y(k0), floor_y(k1)
    fbox(f, FACE_T, s0, s1, y0 - 0.4, y1 + 0.3, 0.0, out, col=CONC, bottom=True)
    g = face(f.name, f.plane + (f.nz or f.nx) * (out + 0.02), f.at(s0), f.at(s1))
    B.facade_wall((D, "facade", 0), g, y0, y1, B.wall_col(lit, window, r.uniform(0.5, 1.0), tint), r.randrange(0, 40))
    for yy in (y0 - 0.4, y1 - 0.05):
        f.quad((D, "trim", 0), s0, s1, yy, yy + 0.35, out + 0.03, col=YEL)
    for s in (s0 + 0.5, (s0 + s1) / 2, s1 - 0.5):
        fbox(f, (D, "trim", 1), s - 0.2, s + 0.2, y0 - 0.85, y0 - 0.4, 0.1, out - 0.1, col=CONC, bottom=True)
    return (s0, s1, y0 - 0.9, y1 + 0.4)


def big(f, s0, s1, k0, k1, out, seed, **kw):
    """One of the big cantilevered blocks (mega_kit.block) on a face that
    looks south, where the hero's lens does not reach."""
    y0, y1 = floor_y(k0) - 0.4, floor_y(k1) + 0.3
    xa, xb = sorted((f.at(s0), f.at(s1)))
    assert hero_hidden(xa - 0.5, xb + 0.5, y0 - 1.0, y1, f.plane + out), (xa, xb, y0, y1)
    block(xa, xb, y0, y1, f.plane, f.plane + out, seed, **kw)
    return (s0, s1, y0 - 0.9, y1 + 0.4)


def dress(f, top, start, seed, blocked, pods=(), slot=False, people_rate=0.2, weights=(0.3, 0.35, 0.35), guard=None, homes=True):
    """Floor by floor up a face: a walkway, balconies, or a plain floor of
    units, and over each (but in the hero's slot) what its tenants have
    added (mega_homes). `blocked`: stretches kept clear the whole height
    (the signs, the ducts). `pods`: (s0, s1, y0, y1) kept clear over their
    own floors. `guard`: see mega_homes."""
    r = random.Random(seed)
    homes = homes and not slot
    rh = random.Random(seed * 31 + 7)
    if homes:
        blocked = list(blocked) + homes_face(f, floor_y(start), top - 0.5, rh, list(blocked), guard)
    k = start
    while floor_y(k) + 1.4 < top:
        y = floor_y(k)
        k += 1
        if any(abs(y - b) < 1.6 for b in BANDS):
            continue
        here = list(blocked) + [(p[0] - 0.3, p[1] + 0.3) for p in pods if p[2] - 1.2 < y < p[3] + 0.2]
        t = r.random()
        if t < weights[0]:
            walkway(f, y, segments(f, here), dots=dim(GLOW["amber"], 0.28) if slot else AMBER_DOT, r=r, people_rate=people_rate)
            if homes and floor_y(k) + 1.4 < top:
                homes_floor(f, y, here, rh, guard, walk=True)
        elif t < weights[0] + weights[1]:
            used = balconies(f, y, here, r, homes=homes)
            if homes and floor_y(k) + 1.4 < top:
                homes_floor(f, y, here + used, rh, guard)
        else:
            used = plain(f, y, here, r)
            if homes and floor_y(k) + 1.4 < top:
                homes_floor(f, y, here + used, rh, guard, rate=1.3)


def face_duct(f, s, y0, y1, w=0.9, out=0.7):
    fbox(f, (D, "metal", 0), s - w / 2, s + w / 2, y0, y1, 0.0, out, bottom=True)
    return (s - w / 2 - 0.2, s + w / 2 + 0.2)


def sign_column(x, z, ys, sizes, yaws, district=D):
    """Signs one over another on a frame standing off a corner, each turned
    its own way."""
    for y, size, yaw in zip(ys, sizes, yaws):
        angled_sign(x, y, z, size, yaw, district=district)
        # Its bracket: two arms off the mast to the board's back.
        for dy in (-0.5, 0.5):
            box((district, "metal", 1), x - 0.04, x + 0.04, y + dy * ST_SIZES[size][1] * 0.6 - 0.04, y + dy * ST_SIZES[size][1] * 0.6 + 0.04, z - 0.7, z, scale=0.5)
    box((district, "metal", 1), x - 0.09, x + 0.09, min(ys) - 3.0, max(ys) + 3.0, z - 0.8, z - 0.62, scale=0.5)


# ---------------------------------------------------------------------------
# The front.
# ---------------------------------------------------------------------------
def sign_gaps(f):
    return [(vx - 1.6 - f.a0, vx + 1.6 - f.a0) for vx, _ in MB_SIGNS if f.a0 < vx < f.a1]


# West section (top 95).
_blocked = sign_gaps(fW) + [face_duct(fW, 13.6, floor_y(3), 92.0), face_duct(fW, 29.2, floor_y(2), 90.0, w=0.7)]
_pods = [big(fW, 2.6, 12.6, 8, 12, 6.5, 8301, window=0), big(fW, 20.4, 28.0, 14, 19, 5.0, 8302, window=6, tint=6),
         big(fW, 1.0, 12.5, 20, 24, 6.0, 8303, window=3, tint=4)]
dress(fW, 95.0, 3, 8311, _blocked, _pods, guard=hero_hidden)
# Middle section (top 89): in the hero's slot, so decks and dark balconies only.
_blocked = sign_gaps(fM) + [face_duct(fM, 1.0, floor_y(4), 86.0, w=0.8, out=0.6), face_duct(fM, 35.0, floor_y(4), 86.0, w=0.8, out=0.6)]
dress(fM, 89.0, 4, 8312, _blocked, (), slot=True, people_rate=0.15, weights=(0.34, 0.3, 0.36))
# East section (top 83).
_blocked = sign_gaps(fE) + [face_duct(fE, 1.3, floor_y(5), 80.0, w=0.7), face_duct(fE, 11.4, floor_y(5), 81.0), face_duct(fE, 28.9, floor_y(5), 78.0)]
_pods = [big(fE, 2.2, 10.6, 9, 13, 6.0, 8304, window=6, tint=5), big(fE, 17.4, 28.0, 14, 18, 6.5, 8305, window=0, tint=4),
         pod(fE, 4.0, 10.4, 19, 20, 2.2, 8306, window=3, tint=6)]
dress(fE, 83.0, 5, 8313, _blocked, _pods, guard=hero_hidden)

# Columns of signs off the block's two outer corners, and a tall billboard on
# each outer section, where the canyon's own blocks hide them from the hero.
assert hero_hidden(-48.0, -39.5, 12.0, 60.0, MB_ZF) and hero_hidden(39.5, 48.0, 12.0, 60.0, MB_ZF)
sign_column(-47.2, MB_ZF + 0.75, (14.6, 20.2, 29.2, 34.8, 38.6), ("bl", "bl", "bl", "bm", "bx"), [math.pi / 2 + a for a in (0.3, -0.25, 0.2, -0.35, 0.1)])
sign_column(47.2, MB_ZF + 0.75, (17.0, 21.2, 28.6, 34.2), ("bm", "bl", "bl", "bm"), [-math.pi / 2 + a for a in (-0.3, 0.2, -0.15, 0.35)])
_rb = random.Random(8321)
for (bx, by, bw, bh, yaw) in ((-43.4, 52.4, 7.0, 13.0, 6.0), (43.6, 32.6, 6.4, 11.0, -8.0), (24.4, 70.4, 9.0, 5.0, 0.0)):
    assert hero_hidden(bx - bw / 2 - 0.5, bx + bw / 2 + 0.5, by - bh / 2 - 0.5, by + bh / 2 + 0.5, MB_ZF + 1.0), (bx, by)
    B.billboard(D, bx, by, MB_ZF + 0.5, bw, bh, math.radians(yaw), _rb, back=False)

# The four vertical signs. The outer two, which the canyon hides from the
# hero, are columns of screens standing off the face in front of the old
# bars (their light spills round the frames); the two the hero looks at keep
# their light and gain only a dark frame that cuts each into boxes.
_rs = random.Random(8322)
for k, (vx, _hue) in enumerate(MB_SIGNS):
    vh = 38.0 + (k % 2) * 22.0
    if abs(vx) > 18.0:
        n = int(vh // 7.5)
        assert hero_hidden(vx - 2.8, vx + 2.8, 13.0, 14.0 + n * 7.5, MB_ZF + 2.0), vx
        for i in range(n):
            B.billboard(D, vx, 14.0 + 3.7 + i * 7.5, MB_ZF + 2.0, 4.4, 6.9, 0.0, _rs, back=False, depth=0.4)
        for dx in (-1.9, 1.9):
            box((D, "metal", 1), vx + dx - 0.1, vx + dx + 0.1, 14.0, 14.0 + n * 7.5, MB_ZF, MB_ZF + 1.6, scale=1.0)
    else:
        zf = MB_ZF - MB_REC - 0.6
        for dx in (-1.3, 1.3):
            tbox(vx + dx - 0.2, vx + dx + 0.2, 13.4, 14.6 + vh, zf - 0.3, zf + 0.5, BLACK)
        for i in range(int(vh // 5.4) + 1):
            tbox(vx - 1.3, vx + 1.3, 14.0 + i * 5.4 - 0.14, 14.0 + i * 5.4 + 0.14, zf + 0.3, zf + 0.5, BLACK, detail=1)

# ---------------------------------------------------------------------------
# The service cores up the block's side walls, taller than the sections they
# stand against, the block's number painted down each, a line of light, a
# beacon. (The wings' podiums stand against the walls below them.)
# ---------------------------------------------------------------------------
CORE_Z0, CORE_Z1 = -774.0, -760.0
for s, top, hue in ((-1, 99.0, "cyan"), (1, 88.0, "amber")):
    xa, xb = sorted((s * MB_X1, s * (MB_X1 + 3.2)))
    assert hero_hidden(xa, xb, 0.0, top + 6.0, CORE_Z1)
    tbox(xa, xb, floor_y(3), top, CORE_Z0, CORE_Z1, BLUEGREY, bottom=True)
    tbox(xa - 0.15, xb + 0.15, top, top + 0.5, CORE_Z0 - 0.15, CORE_Z1 + 0.15, BLACK)
    xo = s * (MB_X1 + 3.2)
    # Down its outer face and its street face.
    strokes_v((D, "trim", 1), "H4", xo, top - 9.0, (CORE_Z0 + CORE_Z1) / 2, 4.6, s * math.pi / 2, YEL, weight=0.15, out=0.03)
    strokes_v((D, "trim", 1), "H4", s * (MB_X1 + 1.6), top - 6.0, CORE_Z1, 1.9, 0.0, YEL, weight=0.16, out=0.03)
    box((D, "neon_" + hue, 0), min(xo, xo + s * 0.08), max(xo, xo + s * 0.08), floor_y(5), top - 20.0, CORE_Z1 - 1.2, CORE_Z1 - 0.9, scale=1.0)
    for z in (CORE_Z0 + 1.0, CORE_Z1 - 1.0):
        box((D, "glow", 0), s * (MB_X1 + 1.6) - 0.15, s * (MB_X1 + 1.6) + 0.15, top + 0.5, top + 0.8, z - 0.15, z + 0.15, scale=0.5, col=GLOW["red"])
    # A lift's lit shaft up its street face.
    box((D, "glow", 1), s * (MB_X1 + 0.9) - 0.25, s * (MB_X1 + 0.9) + 0.25, floor_y(3) + 1.0, top - 12.0, CORE_Z1, CORE_Z1 + 0.03, scale=1.0,
        col=dim(GLOW["white"], 0.22))

# ---------------------------------------------------------------------------
# The back (z -790): the same floors of decks and units, ducts, two fire
# escapes, and at the ground a back's doors, lamps and skips.
# ---------------------------------------------------------------------------
fB = face("-z", MB_ZB, MB_X0, MB_X1)
_rb2 = random.Random(8331)
_blocked = [face_duct(fB, s, floor_y(2), top) for s, top in ((6.0, 78.0), (27.0, 80.0), (47.0, 84.0), (63.0, 84.0), (88.0, 90.0))]
dress(fB, 83.0, 2, 8332, _blocked, (), people_rate=0.06, weights=(0.25, 0.3, 0.45))
B.fire_escape(D, fB, 17.0, floor_y(1), 46.0)
B.fire_escape(D, fB, 76.0, floor_y(1), 52.0)
fBg = face("-z", MB_ZB - 0.04, MB_X0, MB_X1)
B.back_ground(D, fBg, _rb2, CONC)
B.billboard(D, 30.0, 60.0, MB_ZB - 0.5, 10.0, 6.0, math.pi, _rb2, back=False)
B.billboard(D, -32.0, 36.0, MB_ZB - 0.5, 7.0, 10.0, math.pi, _rb2, back=False)

# ---------------------------------------------------------------------------
# The light well.
# ---------------------------------------------------------------------------
wx0, wx1, wz0, wz1 = WELL
WTOP = MB_SECTIONS[1][2]
wW, wE = face("+x", wx0, wz0, wz1), face("-x", wx1, wz0, wz1)
wN, wS = face("+z", wz0, wx0, wx1), face("-z", wz1, wx0, wx1)
_rw = random.Random(8341)
for f, tint, style, lit in ((wW, 5, 6, 0.6), (wE, 6, 3, 0.5), (wN, 5, 0, 0.55), (wS, 0, 6, 0.6)):
    B.facade_wall((D, "facade", 0), f, floor_y(1), WTOP, B.wall_col(lit, style, _rw.uniform(0.7, 1.0), tint), _rw.randrange(0, 40))
# The east wall's lower floors in orange panels.
wE.quad((D, "trim", 0), 0.0, wE.width, floor_y(1), floor_y(4), 0.015, col=ORANGE)
LILAC = (0.78, 0.66, 1.0, 1.0)


def well_window(f, s, y, hue, k=0.4, w=0.62):
    """A lit window in the well: the pane's colour, its bars, a sill."""
    f.quad((D, "glow", 1), s - w, s + w, y + 0.85, y + 2.55, 0.03, col=dim(GLOW[hue], k))
    f.quad((D, "trim", 1), s - 0.04, s + 0.04, y + 0.85, y + 2.55, 0.045, col=BLACK)
    f.quad((D, "trim", 1), s - w, s + w, y + 1.86, y + 1.94, 0.045, col=BLACK)
    f.quad((D, "trim", 1), s - w, s + w, y + 0.85, y + 1.2, 0.05, col=dim(GLOW[hue], 0.05))
    f.ledge((D, "trim", 1), s - w - 0.1, s + w + 0.1, y + 0.75, 0.1, 0.14, CONC)


# Lit panels of the same orange on it (KvMY1uzSC1E@13), each cut by its seams.
for k in (1, 2, 3):
    for s in (3.0, 9.4, 15.6):
        y = floor_y(k)
        wE.quad((D, "glow", 1), s - 1.3, s + 1.3, y + 0.7, y + 2.7, 0.03, col=dim(ORANGE, 0.1 + 0.04 * ((k + int(s)) % 3)))
        for ds in (-0.44, 0.44):
            wE.quad((D, "trim", 1), s + ds - 0.025, s + ds + 0.025, y + 0.7, y + 2.7, 0.04, col=BLACK)
        wE.quad((D, "trim", 1), s - 1.3, s + 1.3, y + 1.66, y + 1.72, 0.04, col=BLACK)
RING = 1.5
KTOP = int((WTOP - FLOOR0) // CELL_H)           # the last full floor line under the roof
# Rooms hung into the shaft off its walls over two or three floors (face,
# s0, s1, k0, k1, out): no walkway on that side over those floors.
PODS = ((wE, 6.0, 12.5, 5, 7, 3.2), (wW, 9.0, 15.0, 13, 15, 3.0), (wN, 3.0, 9.5, 9, 10, 2.8), (wS, 14.0, 21.0, 18, 20, 3.4),
        (wE, 14.0, 19.0, 21, 22, 2.6))
for f, s0, s1, k0, k1, out in PODS:
    y0, y1 = floor_y(k0) - 0.3, floor_y(k1 + 1) - 0.4
    fbox(f, FACE_T, s0, s1, y0, y1, 0.0, out, col=CONC, bottom=True)
    for yy in (y0, y1 - 0.35):
        f.quad((D, "trim", 0), s0, s1, yy, yy + 0.35, out + 0.02, col=YEL)
    for kk in range(k0, k1 + 1):
        for t in (0.3, 0.7):
            ss = s0 + (s1 - s0) * t
            pa = face(f.name, f.plane + (f.nz or f.nx) * out, f.a0, f.a1)
            well_window(pa, ss, floor_y(kk) - 0.2, _rw.choice(("pink", "amber", "magenta", "white")), _rw.uniform(0.3, 0.55), w=0.9)
    P.place("ac_wall", *f.p(f.at(s1 - 0.8), y1 - 1.2, out), f.yaw)


def railing(f, a0, a1, y, out, h=1.05):
    """An open steel rail along a walkway's edge: posts, a top rail, a mid
    rail (the shaft is seen through it)."""
    for yy, t in ((y + h - 0.06, 0.06), (y + 0.5, 0.04)):
        fbox(f, (D, "metal", 0), a0, a1, yy, yy + t, out - 0.08, out - 0.02)
    n = max(1, int((a1 - a0) // 1.3))
    for i in range(n + 1):
        sp = a0 + (a1 - a0) * i / n
        fbox(f, (D, "metal", 1), sp - 0.03, sp + 0.03, y, y + h, out - 0.08, out - 0.02)


for k in range(1, KTOP + 1):
    y = floor_y(k)
    for f in (wN, wS, wW, wE):
        # The court is open to the third floor but for a walkway on two sides.
        if (k == 1 and f is not wN) or (k == 2 and f not in (wN, wE)) or (k > 2 and _rw.random() < 0.18):
            continue
        if any(pf is f and pk0 - 1 <= k <= pk1 + 1 for pf, _, _, pk0, pk1, _ in PODS):
            continue
        ends = 0.0 if f in (wN, wS) else RING
        out = _rw.choice((1.4, 1.5, 1.5, 1.8, 2.3, 3.0))
        fbox(f, FACE_T, ends, f.width - ends, y - 0.22, y, 0.0, out, col=CONC, bottom=True)
        if _rw.random() < 0.42:
            fbox(f, FACE_T, ends, f.width - ends, y, y + 1.0, out - 0.13, out, col=PALE if k % 5 else YEL)
            f.quad((D, "metal", 1), ends, f.width - ends, y + 1.0, y + 1.12, out - 0.06)
        else:
            railing(f, ends, f.width - ends, y, out)
            fbox(f, FACE_T, ends, f.width - ends, y, y + 0.12, out - 0.1, out, col=YEL_OLD)
        # Yellow dashes along the edge, and under it the light that comes
        # down the shaft from the sky, stronger floor by floor.
        n = int((f.width - 2 * ends) // 2.2)
        for i in range(n):
            sp = ends + (f.width - 2 * ends) * (i + 0.5) / n
            f.quad((D, "glow", 1), sp - 0.3, sp + 0.3, y - 0.16, y - 0.06, out + 0.012, col=AMBER_DOT)
        up = 0.05 + 0.5 * (k / KTOP) ** 2
        fbox(f, (D, "glow", 1), ends, f.width - ends, y - 0.27, y - 0.22, out - 0.34, out - 0.04, col=dim(LILAC, up), bottom=True)
        # Somebody at the rail now and then, more of them low down.
        if _rw.random() < (0.6 if k < 9 else 0.25):
            sp = _rw.uniform(ends + 1.0, f.width - ends - 1.0)
            px, _, pz = f.p(f.at(sp), y, out - 0.55)
            pose = _rw.choice(("idle", "phone", "smoke", "lean", "idle"))
            stand(px, pz, f.yaw + (math.pi if pose == "lean" else 0.0), pose, y)
    # Lit windows the colour the show gives them, behind the walkways.
    for f in (wW, wN, wS, wE):
        for _ in range(4):
            if _rw.random() < 0.55:
                bays = max(1, round(f.width / CELL_W))
                sp = (_rw.randrange(bays) + 0.5) * f.width / bays
                well_window(f, sp, y, _rw.choice(("pink", "pink", "magenta", "purple", "amber", "white")), _rw.uniform(0.25, 0.55))
# Bridges across it at several heights, some over the others' line.
for k, axis, at in ((3, "x", -768.0), (6, "z", -5.0), (8, "x", -781.0), (15, "z", 6.0), (17, "x", -766.5), (20, "z", -8.0), (23, "x", -777.0)):
    y = floor_y(k)
    if axis == "x":
        tbox(wx0 + RING - 0.1, wx1 - RING + 0.1, y - 0.3, y, at - 0.8, at + 0.8, CONC, bottom=True)
        for dz in (-0.8, 0.68):
            tbox(wx0 + RING, wx1 - RING, y, y + 1.0, at + dz, at + dz + 0.12, YEL_OLD if k % 2 else CONC)
        stand(_rw.uniform(-6.0, 6.0), at, _rw.choice((0.0, math.pi)), "idle", y)
        for i in range(9):
            x = wx0 + RING + 1.0 + i * (wx1 - wx0 - 2 * RING - 2.0) / 8
            for dz, yaw in ((-0.812, math.pi), (0.812, 0.0)):
                rotated_quad((D, "glow", 1), x, y + 0.5, at + dz, 0.6, 0.1, yaw, col=dim(GLOW["yellow"], 0.7))
            hquad((D, "glow", 1), x - 0.3, x + 0.3, at - 0.08, at + 0.08, y - 0.31, up=False, col=dim(GLOW["yellow"], 0.7))
    else:
        tbox(at - 0.8, at + 0.8, y - 0.3, y, wz0 + RING - 0.1, wz1 - RING + 0.1, CONC, bottom=True)
        for dx in (-0.8, 0.68):
            tbox(at + dx, at + dx + 0.12, y, y + 1.0, wz0 + RING, wz1 - RING, YEL_OLD if k % 2 else CONC)
        stand(at, _rw.uniform(-782.0, -767.0), _rw.choice((math.pi / 2, -math.pi / 2)), "phone", y)
        for i in range(8):
            z = wz0 + RING + 1.0 + i * (wz1 - wz0 - 2 * RING - 2.0) / 7
            for dx, yaw in ((-0.812, -math.pi / 2), (0.812, math.pi / 2)):
                rotated_quad((D, "glow", 1), at + dx, y + 0.5, z, 0.6, 0.1, yaw, col=dim(GLOW["yellow"], 0.7))
            hquad((D, "glow", 1), at - 0.08, at + 0.08, z - 0.3, z + 0.3, y - 0.31, up=False, col=dim(GLOW["yellow"], 0.7))
# The block's own rail line across the shaft at the twelfth floor (the
# freight spur to the plant on the back): two plate girders, a deck, sleepers
# and rails, a portal at each end with its lamps, the wire, a maintenance car
# standing on it with its cab lit.
RY, RZ = floor_y(12), -773.6
for dz in (-1.7, 1.7):
    tbox(wx0, wx1, RY - 1.6, RY + 0.3, RZ + dz - 0.18, RZ + dz + 0.18, STEEL, bottom=True)
    x = wx0 + 1.0
    while x < wx1 - 0.5:
        tbox(x - 0.06, x + 0.06, RY - 1.5, RY + 0.2, RZ + dz + (0.18 if dz > 0 else -0.24), RZ + dz + (0.24 if dz > 0 else -0.18), STEEL, detail=1)
        x += 1.6
    for i in range(int((wx1 - wx0) // 1.4)):
        rotated_quad((D, "glow", 1), wx0 + 0.7 + i * 1.4, RY - 0.8, RZ + dz + (0.25 if dz > 0 else -0.25), 0.5, 0.09, 0.0 if dz > 0 else math.pi, col=dim(GLOW["red"], 0.6))
tbox(wx0, wx1, RY - 0.35, RY, RZ - 1.55, RZ + 1.55, dim(CONC, 0.7), bottom=True)
x = wx0 + 0.4
while x < wx1:
    hquad((D, "trim", 1), x - 0.12, x + 0.12, RZ - 1.1, RZ + 1.1, RY + 0.02, col=dim(RUST, 0.7))
    x += 0.65
for dz in (-0.72, 0.72):
    box((D, "metal", 0), wx0, wx1, RY, RY + 0.14, RZ + dz - 0.04, RZ + dz + 0.04, scale=1.0)
    hquad((D, "glow", 0), wx0, wx1, RZ + dz - 0.025, RZ + dz + 0.025, RY + 0.145, col=dim(GLOW["white"], 0.18))
for x in (wx0 + RING + 0.4, wx1 - RING - 0.4):
    for dz in (-1.5, 1.5):
        box((D, "metal", 0), x - 0.12, x + 0.12, RY, RY + 5.6, RZ + dz - 0.12, RZ + dz + 0.12, scale=0.5)
        box((D, "glow", 0), x - 0.12, x + 0.12, RY + 5.6, RY + 5.85, RZ + dz - 0.12, RZ + dz + 0.12, scale=0.5, col=GLOW["red"])
    box((D, "metal", 0), x - 0.1, x + 0.1, RY + 5.0, RY + 5.2, RZ - 1.5, RZ + 1.5, scale=0.5, bottom=True)
box((D, "metal", 1), wx0, wx1, RY + 4.6, RY + 4.64, RZ - 0.02, RZ + 0.02, scale=0.5)
CAR = (-6.5, 2.5)
tbox(CAR[0], CAR[1], RY + 0.5, RY + 3.3, RZ - 1.25, RZ + 1.25, dim(YEL, 0.75), bottom=True)
tbox(CAR[0] - 0.1, CAR[1] + 0.1, RY + 3.3, RY + 3.5, RZ - 1.3, RZ + 1.3, BLACK)
tbox(CAR[0] + 0.2, CAR[1] - 0.2, RY + 0.14, RY + 0.5, RZ - 1.0, RZ + 1.0, BLACK)
for zf, yaw in ((RZ + 1.26, 0.0), (RZ - 1.26, math.pi)):
    for i in range(4):
        rotated_quad((D, "glow", 1), CAR[0] + 1.0 + i * 2.1, RY + 2.25, zf, 1.4, 0.8, yaw, col=dim(GLOW["white" if i else "amber"], 0.45))
    rotated_quad((D, "trim", 0), (CAR[0] + CAR[1]) / 2, RY + 1.2, zf + (0.005 if yaw == 0.0 else -0.005), CAR[1] - CAR[0] - 0.4, 0.3, yaw, col=BLACK)
box((D, "glow", 0), CAR[1] + 0.02, CAR[1] + 0.06, RY + 1.0, RY + 1.3, RZ - 0.9, RZ - 0.6, scale=0.5, col=GLOW["white"])
box((D, "glow", 0), CAR[1] + 0.02, CAR[1] + 0.06, RY + 1.0, RY + 1.3, RZ + 0.6, RZ + 0.9, scale=0.5, col=GLOW["white"])
stand(CAR[1] + 1.4, RZ + 1.1, math.pi / 2, "smoke", RY)
# Ducts up two corners, pipes, and the plant that hangs in a shaft.
duct(wx0 + 0.05, wx0 + 1.25, floor_y(1), WTOP - 1.0, wz0 + 0.05, wz0 + 1.25)
duct(wx1 - 1.05, wx1 - 0.05, floor_y(2), WTOP - 3.0, wz1 - 1.3, wz1 - 0.05)
rpipe((wx0 + 0.3, floor_y(1), wz1 - 0.3), (wx0 + 0.3, WTOP - 2.0, wz1 - 0.3), 0.16, col=RUST, detail=0)
rpipe((wx0 + 0.75, floor_y(1), wz1 - 0.28), (wx0 + 0.75, WTOP - 8.0, wz1 - 0.28), 0.09, col=STEEL)
rpipe((wx1 - 0.3, floor_y(1), wz0 + 0.3), (wx1 - 0.3, WTOP - 2.0, wz0 + 0.3), 0.14, col=CONC, detail=0)
# Cables and washing strung across it, low and high.
_rc = random.Random(8351)
for (a, b, sag, hue) in (((wx0 + 1.5, 6.6, -766.0), (wx1 - 1.5, 7.4, -779.0), 0.9, "pink"), ((wx0 + 1.5, 10.2, -780.0), (wx1 - 1.5, 9.6, -769.0), 1.1, "cyan"),
                         ((wx0 + 1.5, 13.6, -770.0), (wx1 - 1.5, 13.2, -772.0), 0.7, "amber")):
    cable(a, b, sag)
    for t in (0.3, 0.42, 0.56, 0.7):
        px, pz = a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t
        py = a[1] + (b[1] - a[1]) * t - sag * math.sin(math.pi * t)
        P.place("lantern", px, py - 0.42, pz)
for i in range(14):
    y = _rc.uniform(16.0, 84.0)
    if _rc.random() < 0.5:
        a, b = (wx0 + 0.3, y, _rc.uniform(wz0 + 2, wz1 - 2)), (wx1 - 0.3, y + _rc.uniform(-2, 2), _rc.uniform(wz0 + 2, wz1 - 2))
    else:
        a, b = (_rc.uniform(wx0 + 2, wx1 - 2), y, wz0 + 0.3), (_rc.uniform(wx0 + 2, wx1 - 2), y + _rc.uniform(-2, 2), wz1 - 0.3)
    sag = _rc.uniform(0.6, 2.2)
    cable(a, b, sag, r=_rc.choice((0.02, 0.03, 0.045)))
    if i % 4 == 1:
        for t in (0.35, 0.5, 0.65):
            px, pz = a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t
            py = a[1] + (b[1] - a[1]) * t - sag * math.sin(math.pi * t)
            P.place("lantern", px, py - 0.42, pz)
    elif i % 4 == 3:
        for t in (0.3, 0.45, 0.6):
            px, pz = a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t
            py = a[1] + (b[1] - a[1]) * t - sag * math.sin(math.pi * t)
            dx, dz = (b[0] - a[0]), (b[2] - a[2])
            L = math.hypot(dx, dz)
            ux, uz = dx / L * 0.35, dz / L * 0.35
            cloth((px - ux, py - 0.9, pz - uz), (px + ux, py - 0.9, pz + uz), (px + ux, py, pz + uz), (px - ux, py, pz - uz), _rc.choice(("pink", "cyan", "amber", "white", "teal")))
# Open to the sky: a line of light round its rim, lamps on the rim looking
# down, and over the mouth, above the roof's parapet and facing down only (so
# from the air there is nothing there), the lilac-white of the sky the show
# gives a well looked up from its floor (Fn9gKhU_2_Q@21, KvMY1uzSC1E@13).
for f in (wN, wS, wW, wE):
    f.quad((D, "glow", 0), 0.3, f.width - 0.3, WTOP - 0.5, WTOP - 0.25, 0.02, col=dim(GLOW["white"], 0.55))
    for i in range(3):
        sp = f.width * (i + 0.5) / 3
        fbox(f, (D, "metal", 1), sp - 0.5, sp + 0.5, WTOP - 1.6, WTOP - 1.2, 0.0, 0.9, bottom=True)
        fbox(f, (D, "glow", 0), sp - 0.4, sp + 0.4, WTOP - 1.66, WTOP - 1.6, 0.1, 0.8, col=dim(LILAC, 0.9), bottom=True)
GL = WTOP + 1.3
hquad((D, "glow", 0), wx0 - 0.3, wx1 + 0.3, wz0 - 0.3, wz1 + 0.3, GL, up=False, col=LILAC)
for (x, z, hue, pw) in ((-5.0, -770.0, "pink", 5.0), (5.0, -778.0, "amber", 5.0), (0.0, -774.0, "purple", 8.5), (5.5, -769.5, "white", 6.0),
                        (-5.5, -779.0, "purple", 7.0), (0.0, -779.5, "white", 6.5), (-6.5, -774.5, "white", 6.0), (6.5, -773.5, "purple", 6.5),
                        (-3.0, -766.0, "white", 5.5), (3.5, -781.0, "purple", 5.5)):
    light(D, x, 12.0, z, hue, pw)
# The wider court's own pools, under the shaft's light.
for (x, z, hue, pw) in ((-10.5, -768.0, "white", 5.5), (10.5, -768.0, "purple", 5.5), (-10.5, -781.0, "purple", 5.5), (10.5, -781.0, "white", 5.5)):
    light(D, x, 12.0, z, hue, pw)
