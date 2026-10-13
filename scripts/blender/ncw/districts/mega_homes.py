"""What makes a megabuilding's face a wall of homes and not an office's
glass: per floor and per bay, whatever the tenants have bolted on.

Rooms built out over the street in whatever paint was going, each with its
own lit window; air conditioners; window cages; laundry poles; lit windows
of every size and colour over the shader's grid; and per face a stair core
lit landing by landing and drain pipes down the full height. dress()
(mega_face.py) calls homes_floor() on every floor it dresses and
homes_face() once a face, so every dressed face of the block, its wings,
its shoulders and the blocks east of the canyon carries them.

`guard(x0, x1, y0, y1, z)` (or None) says whether the hero's lens cannot see
a rectangle; anything lit is only added where it says so.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403

# The paint a tenant finds: pale render, cream, blue-grey, teal, rust, old
# yellow, bare concrete, a dull pink, a dull green.
PAINT = (PALE, CREAM, BLUEGREY, TEAL_PAINT, RUST, YEL_OLD, CONC, (0.34, 0.12, 0.17, 1.0), (0.12, 0.2, 0.11, 1.0), CONC, CREAM)
LITS = ("amber", "amber", "amber", "white", "white", "pink", "cyan", "teal", "magenta", "amber")
DYES = ("pink", "cyan", "amber", "white", "teal", "red", "purple", "green")
COUNT = {}


def _n(k):
    COUNT[k] = COUNT.get(k, 0) + 1


def _xyz(f, s, y, w):
    return f.p(f.at(s), y, w)


def _ok(f, s0, s1, y0, y1, out, guard):
    if guard is None:
        return True
    a, b = sorted((f.at(s0), f.at(s1)))
    if f.nx != 0:
        # An x face: its rectangle runs in z; test a sliver at each end.
        x = f.plane + f.nx * out
        return guard(x - 0.1, x + 0.1, y0, y1, a) and guard(x - 0.1, x + 0.1, y0, y1, b)
    return guard(a, b, y0, y1, f.plane + f.nz * out)


def lit_window(f, s, y0, w, h, out, r, k=None, hue=None):
    """A lit window: its glass in one light, a dark frame round it, and now
    and then a curtain drawn half across or a blind."""
    hue = hue or r.choice(LITS)
    k = k if k is not None else r.uniform(0.22, 0.6)
    f.quad((D, "glow", 0), s - w / 2, s + w / 2, y0, y0 + h, out, col=dim(GLOW[hue], k))
    t = r.random()
    if t < 0.25:
        # A curtain across part of it.
        c = r.uniform(0.3, 0.6) * w
        side = r.choice((-1, 1))
        a, b = (s - w / 2, s - w / 2 + c) if side < 0 else (s + w / 2 - c, s + w / 2)
        f.quad((D, "trim", 1), a, b, y0, y0 + h, out + 0.01, col=dim(r.choice(PAINT), 0.7))
    elif t < 0.4:
        # A blind half down.
        f.quad((D, "trim", 1), s - w / 2, s + w / 2, y0 + h * r.uniform(0.45, 0.75), y0 + h, out + 0.01, col=dim(CREAM, 0.6))
    f.quad((D, "trim", 1), s - w / 2 - 0.08, s + w / 2 + 0.08, y0 - 0.1, y0, out + 0.012, col=BLACK)
    _n("window")


def room_out(f, s0, s1, y, floors, r, guard):
    """A room built out over the street: a painted box on two brackets, its
    window lit or dark, a unit or a dish on it."""
    out = r.choice((0.6, 0.8, 0.9, 1.1))
    y0, y1 = y + 0.2, y + floors * CELL_H - 0.35
    lit = r.random() < 0.72
    if lit and not _ok(f, s0, s1, y0, y1, out, guard):
        return False
    col = r.choice(PAINT)
    fbox(f, (D, "plaster", 0), s0, s1, y0, y1, 0.0, out, col=tuple(min(1.0, c * 1.7) for c in col[:3]) + (1.0,), bottom=True)
    g = face(f.name, f.plane + (f.nz or f.nx) * out, f.a0, f.a1)
    # Its front catches the light of the windows round it: the paint, lit
    # low, so the built-out rooms read from the air as a patchwork.
    if lit:
        g.quad((D, "glow", 0), s0, s1, y0, y1, 0.008, col=dim(tuple(min(1.0, c * 2.2) for c in col[:3]) + (1.0,), r.uniform(0.05, 0.09)))
    w = (s1 - s0) * r.uniform(0.5, 0.8)
    for k in range(floors):
        yy = y0 + 0.75 + k * CELL_H
        if lit:
            lit_window(g, (s0 + s1) / 2, yy, w, 1.45, 0.02, r)
        else:
            g.quad((D, "trim", 0), (s0 + s1) / 2 - w / 2, (s0 + s1) / 2 + w / 2, yy, yy + 1.25, 0.02, col=BLACK)
    # A drip of rust under it, and its brackets.
    g.quad((D, "trim", 1), s0 + 0.1, s1 - 0.1, y0, y0 + 0.18, 0.015, col=dim(RUST, 0.8))
    _n("room")
    if r.random() < 0.35:
        P.place("ac_wall", *_xyz(f, s1 + 0.55, y0 + 0.6, 0.0), f.yaw)
    return True


def cage(f, s, y, r):
    """A window cage: a steel frame bolted over a window, bars down it, a
    pot or a box on its floor."""
    w = r.choice((1.6, 2.0, 2.4))
    y0, y1 = y + 0.6, y + 2.7
    fbox(f, (D, "trim", 1), s - w / 2, s + w / 2, y0 - 0.06, y0, 0.0, 0.45, col=STEEL, bottom=True)
    f.quad((D, "trim", 1), s - w / 2, s + w / 2, y1, y1 + 0.08, 0.45, col=STEEL)
    n = int(w / 0.4)
    for i in range(n + 1):
        sb = s - w / 2 + w * i / n
        f.quad((D, "trim", 1), sb - 0.025, sb + 0.025, y0, y1, 0.45, col=STEEL)
    _n("cage")


def pole(f, s, y, r):
    """A laundry pole out of a window, two or three things on it."""
    out = r.uniform(1.0, 1.6)
    yy = y + 2.2
    pipe((D, "metal", 1), _xyz(f, s, yy, 0.0), _xyz(f, s, yy, out), 0.02, segs=3)
    n = r.randint(2, 3)
    _n("pole")
    for i in range(n):
        w0, w1 = 0.15 + (out - 0.2) * i / n, 0.15 + (out - 0.2) * (i + 0.8) / n
        drop = r.uniform(0.5, 0.95)
        p0, p1 = _xyz(f, s, yy, w0), _xyz(f, s, yy, w1)
        cloth((p0[0], yy - drop, p0[2]), (p1[0], yy - drop, p1[2]), (p1[0], yy, p1[2]), (p0[0], yy, p0[2]), r.choice(DYES))


def homes_floor(f, y, used, r, guard=None, rate=1.0, walk=False):
    """One floor's bays: `used` are (s0, s1) stretches already taken (signs,
    ducts, balconies); `walk` when the floor is a walkway (nothing built out
    over it, laundry hung on its parapet instead)."""
    bays = max(1, round(f.width / CELL_W))
    bw = f.width / bays
    skip = set()
    _n("floor")
    COUNT["bays"] = COUNT.get("bays", 0) + bays
    for b in range(bays):
        if b in skip:
            continue
        s = (b + 0.5) * bw
        if any(u0 - 0.4 < s < u1 + 0.4 for u0, u1 in used):
            continue
        t = r.random() / rate
        if walk:
            if t < 0.16:
                p0, p1 = _xyz(f, s - 0.6, y + 0.98, 1.4), _xyz(f, s + 0.6, y + 0.98, 1.4)
                cloth((p0[0], y + 0.25, p0[2]), (p1[0], y + 0.25, p1[2]), (p1[0], y + 1.0, p1[2]), (p0[0], y + 1.0, p0[2]), r.choice(DYES))
            elif t < 0.3 and _ok(f, s - 1, s + 1, y, y + 3, 0.1, guard):
                lit_window(f, s + r.uniform(-0.4, 0.4), y + 1.1, r.uniform(0.8, 2.2), r.uniform(1.1, 1.6), 0.05, r)
            continue
        if t < 0.1:
            room_out(f, s - bw / 2 + 0.15, s + bw / 2 - 0.15, y, 1, r, guard)
        elif t < 0.14 and b + 1 < bays and not any(u0 - 0.4 < s + bw < u1 + 0.4 for u0, u1 in used):
            if room_out(f, s - bw / 2 + 0.15, s + bw * 1.5 - 0.15, y, 1, r, guard):
                skip.add(b + 1)
        elif t < 0.17:
            room_out(f, s - bw / 2 + 0.3, s + bw / 2 - 0.3, y, 2, r, guard)
        elif t < 0.27:
            P.place("ac_wall", *_xyz(f, s + r.uniform(-0.7, 0.7), y + r.choice((0.5, 2.6)), 0.0), f.yaw)
            _n("ac")
        elif t < 0.33:
            cage(f, s, y, r)
        elif t < 0.45:
            if _ok(f, s - 1.2, s + 1.2, y, y + 3.0, 0.1, guard):
                lit_window(f, s + r.uniform(-0.5, 0.5), y + r.uniform(0.8, 1.2), r.choice((0.9, 1.2, 1.6, 2.4)), r.choice((1.2, 1.5, 1.8)), 0.05, r)
        elif t < 0.5:
            pole(f, s, y, r)


def stair_core(f, s, y0, y1, r, guard=None, w=2.6):
    """A stair core up a face: a concrete column standing out of it, a slot
    of light at every landing (half a floor up), its own colour."""
    if not _ok(f, s - w / 2, s + w / 2, y0, y1, 1.0, guard):
        return None
    out = 0.9
    fbox(f, (D, "trim", 0), s - w / 2, s + w / 2, y0, y1, 0.0, out, col=dim(CONC, 1.15), bottom=True)
    g = face(f.name, f.plane + (f.nz or f.nx) * out, f.a0, f.a1)
    hue = r.choice(("white", "green", "amber", "cyan"))
    y = y0 + CELL_H * 0.5 + 0.4
    while y < y1 - 1.6:
        if r.random() < 0.88:
            g.quad((D, "glow", 0), s - 0.45, s + 0.45, y, y + 1.5, 0.02, col=dim(GLOW[hue], r.uniform(0.3, 0.5)))
        y += CELL_H
    _n("core")
    return (s - w / 2 - 0.3, s + w / 2 + 0.3)


def drains(f, y0, y1, r, blocked, n=None):
    """Pipes down the full height of a face, clipped to the wall, each with
    its own paint, a kink where a floor's slab is."""
    out = []
    n = n if n is not None else max(1, int(f.width // 14))
    for _ in range(n):
        for _try in range(6):
            s = r.uniform(1.0, f.width - 1.0)
            if not any(b0 - 0.5 < s < b1 + 0.5 for b0, b1 in blocked + out):
                break
        else:
            continue
        rr = r.choice((0.09, 0.12, 0.16))
        rpipe(_xyz(f, s, y0, rr + 0.05), _xyz(f, s, y1, rr + 0.05), rr, col=r.choice((RUST, STEEL, CONC, TEAL_PAINT)), segs=5, detail=1)
        out.append((s - rr - 0.3, s + rr + 0.3))
        _n("drain")
    return out


def homes_face(f, y0, y1, r, blocked, guard=None, core=True):
    """Once a face: drain pipes and, on a face wide enough, a stair core.
    Returns the stretches they take, kept clear floor by floor."""
    taken = []
    if core and f.width > 16.0:
        for _try in range(5):
            s = r.uniform(4.0, f.width - 4.0)
            if not any(b0 - 2.0 < s < b1 + 2.0 for b0, b1 in blocked):
                c = stair_core(f, s, y0, y1, r, guard)
                if c:
                    taken.append(c)
                break
    taken += drains(f, y0, y1, r, list(blocked) + taken)
    return taken


def well_bays(f, y, r, ring=False):
    """A floor of the light well's wall, bay by bay, as the tenants have it:
    windows of every size lit every colour or dark behind a frame, cages,
    units, a door onto the walkway, a flat repainted, a vent."""
    bays = max(1, round(f.width / CELL_W))
    bw = f.width / bays
    for b in range(bays):
        s = (b + 0.5) * bw + r.uniform(-0.35, 0.35)
        if s < 1.0 or s > f.width - 1.0:
            continue
        if r.random() < 0.22:
            # A flat repainted: its bay in render of its own colour.
            f.quad((D, "plaster", 0), s - bw / 2 + 0.1, s + bw / 2 - 0.1, y + 0.05, y + CELL_H - 0.3, 0.012,
                   col=tuple(min(1.0, c * 1.6) for c in r.choice(PAINT)[:3]) + (1.0,))
        t = r.random()
        if t < 0.42:
            lit_window(f, s, y + r.uniform(0.75, 1.1), r.choice((0.9, 1.2, 1.5, 1.9, 2.3)), r.choice((1.1, 1.4, 1.7)), 0.03, r)
        elif t < 0.56:
            w, h = r.choice((1.0, 1.4, 1.8)), r.choice((1.2, 1.5))
            f.quad((D, "glass_dark", 0), s - w / 2, s + w / 2, y + 0.9, y + 0.9 + h, 0.025)
            f.quad((D, "trim", 1), s - w / 2 - 0.08, s + w / 2 + 0.08, y + 0.8, y + 0.9, 0.03, col=CONC)
            if r.random() < 0.5:
                P.place("ac_wall", *_xyz(f, s + w / 2 + 0.6, y + 1.2, 0.0), f.yaw)
        elif t < 0.66:
            lit_window(f, s, y + 0.75, 1.6, 1.6, 0.03, r, k=r.uniform(0.18, 0.35))
            cage(f, s, y, r)
        elif t < 0.76:
            P.place("ac_wall", *_xyz(f, s, y + r.choice((0.6, 1.9)), 0.0), f.yaw)
            rpipe(_xyz(f, s + 0.45, y + 0.2, 0.06), _xyz(f, s + 0.45, y + 2.6, 0.06), 0.035, col=STEEL)
        elif t < 0.86 and ring:
            # A door onto the walkway, its transom lit.
            f.quad((D, "door_panel", 0), s - 0.45, s + 0.45, y + 0.02, y + 2.1, 0.025)
            f.quad((D, "glow", 0), s - 0.45, s + 0.45, y + 2.15, y + 2.45, 0.025, col=dim(GLOW[r.choice(("amber", "white", "pink"))], 0.4))
        elif t < 0.92:
            # A vent grille and its stain.
            f.quad((D, "trim", 1), s - 0.3, s + 0.3, y + 2.3, y + 2.7, 0.02, col=BLACK)
            f.quad((D, "trim", 1), s - 0.25, s + 0.25, y + 1.2, y + 2.3, 0.015, col=dim(RUST, 0.5))
