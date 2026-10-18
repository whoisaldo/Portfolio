"""The east stack: the megabuilding's highest part, where the hero's lens
cannot reach (east of x 75 behind the lane its ceiling climbs from 210 m to
over 350 m: probe/ceil0.txt, map A), so that from the air and the flying
cars' height the block plainly rises over everything round it.

Three setback tiers on the east shoulder's flank (x 75..106, z -850..-802,
kept 9 m off the flying cars' lane down x 120), cantilevered blocks, lift
cores glazed up its faces with their cars lit, bridges to the east wing's
tower, a landing pad on the first step, and a crown: the block's number lit,
tanks, masts with beacons and a tower crane still standing on it. Its faces
are homes like the rest (mega_face.dress, mega_homes).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_face import dress
from ncw.districts.mega_bulk import bands, riser, lower
from ncw.districts.mega_roofs import edge, pad
from ncw.districts.mega_mono import hidden_top, girdle
from ncw.districts.mega_wings import ET2, ET2_TOP

FACE_T = (D, "trim", 0)
_r = random.Random(5900)

# x0, x1, z0, z1, from, wanted top: each on the one under it.
WANT = ((75.0, 106.0, -850.0, -802.0, 0.0, floor_y(46)),
        (86.0, 106.0, -846.0, -806.0, floor_y(46), floor_y(61)),
        (94.0, 106.0, -846.0, -814.0, floor_y(61), floor_y(76)))
TIERS = []
for k, (x0, x1, z0, z1, y0, want) in enumerate(WANT):
    top = hidden_top(x0, x1, z0, z1, y0, want)
    while hero_sees((x0, y0, z0), (x1, top + 2.0, z1)) and top > y0 + 10.0:
        top -= CELL_H
    assert not hero_sees((x0, y0, z0), (x1, top + 2.0, z1)), (k, top)
    TIERS.append((x0, x1, z0, z1, y0, top))
LOG = ["tops " + str([round(t[5], 1) for t in TIERS])]

for k, (x0, x1, z0, z1, y0, top) in enumerate(TIERS):
    seed = 5910 + 10 * k
    # Tier 0's west face is the shoulder's: nothing on it.
    skip = ("-x",) if k == 0 else ()
    fs = shell(x0, x1, z0, z1, y0, top, (1, 1, 1, 1), seed, skip=("+z", "-z", "+x", "-x"))
    for name, f in fs.items():
        if name in skip:
            continue
        bands(f, max(y0, SHOP_H), top, seed + len(name) + ord(name[1]))
    # (Not one of HERO_MASSES: what is built after it keeps its own hero tests.)
    # Floors of homes up the faces a flying car and the streets east look at;
    # the north face, which only the far city sees, in ledges.
    k0 = 2 if k == 0 else int((y0 - FLOOR0) // CELL_H) + 2
    for name, f in fs.items():
        if name in skip:
            continue
        if name == "-z":
            lower(f, max(y0, SHOP_H), top)
            continue
        with phone_off():
            dress(f, top, k0, seed + ord(name[1]), [], people_rate=0.03, weights=(0.24, 0.36, 0.4))
        girdle(f, top, lo=40.0)
    edge(x0, x1, z0, z1, top, ("+z", "-z", "+x", "-x"), rim=("amber", "pink", "cyan")[k])

# ---------------------------------------------------------------------------
# Cantilevered blocks off the tiers (Fn9gKhU_2_Q@24), over the lane and the
# steps below.
# ---------------------------------------------------------------------------
(A0, A1, AZ0, AZ1, _, AT), (B0, B1, BZ0, BZ1, BY0, BT), (C0, C1, CZ0, CZ1, CY0, CT) = TIERS
for (x0, x1, y0, y1, z0, z1, seed, faces, win) in (
        (78.0, 92.0, floor_y(26), floor_y(31), AZ1, AZ1 + 6.5, 5951, ("+z", "-x", "+x"), 6),
        (95.0, 104.0, floor_y(37), floor_y(41), AZ1, AZ1 + 5.0, 5952, ("+z", "-x", "+x"), 0),
        (A1, A1 + 3.4, floor_y(18), floor_y(23), -840.0, -824.0, 5953, ("+x", "+z", "-z"), 3),
        (89.0, 103.0, floor_y(51), floor_y(55), BZ1, BZ1 + 5.5, 5954, ("+z", "-x", "+x"), 6),
        (B0 - 5.0, B0, floor_y(53), floor_y(57), -834.0, -818.0, 5955, ("-x", "+z", "-z"), 0),
        (93.0, 103.0, floor_y(66), floor_y(70), CZ1, CZ1 + 4.5, 5956, ("+z", "-x", "+x"), 3)):
    if y1 > CT - 2.0 or y0 < 0.0:
        continue
    assert not hero_sees((x0, y0, min(z0, z1)), (x1, y1 + 1.0, max(z0, z1))), seed
    block(x0, x1, y0, y1, min(z0, z1), max(z0, z1), seed, faces=faces, window=win, tint=(4, 3, 6)[seed % 3])


# ---------------------------------------------------------------------------
# Lift cores up the faces: a glazed shaft between concrete fins, its cars lit
# at different floors, a lamp at its head.
# ---------------------------------------------------------------------------
def lift_core(f, s, y0, y1, r, w=3.2, out=2.2, hue="white"):
    fbox(f, FACE_T, s - w / 2 - 0.4, s - w / 2, y0, y1, 0.0, out + 0.2, col=dim(CONC, 1.1), bottom=True)
    fbox(f, FACE_T, s + w / 2, s + w / 2 + 0.4, y0, y1, 0.0, out + 0.2, col=dim(CONC, 1.1), bottom=True)
    g = face(f.name, f.plane + (f.nz or f.nx) * out, f.a0, f.a1)
    g.quad((D, "glass_dark", 0), s - w / 2, s + w / 2, y0, y1, 0.0)
    y = y0 + 6.0
    while y < y1 - 2.0:
        g.quad(FACE_T, s - w / 2, s + w / 2, y, y + 0.25, 0.03, col=STEEL)
        y += 6.0
    for _ in range(3):
        yc = r.uniform(y0 + 3.0, y1 - 6.0)
        for ds in (-w / 4, w / 4):
            g.quad((D, "glow", 0), s + ds - 0.6, s + ds + 0.6, yc, yc + 2.4, 0.05, col=dim(GLOW[hue], 0.65))
    fbox(f, (D, "glow", 0), s - w / 2, s + w / 2, y1, y1 + 0.5, 0.0, out + 0.2, col=GLOW["amber"])


fsA = B.faces_of(A0, A1, AZ0, AZ1)
fsB = B.faces_of(B0, B1, BZ0, BZ1)
fsC = B.faces_of(C0, C1, CZ0, CZ1)
lift_core(fsA["+z"], 6.0, SHOP_H, AT, _r)
lift_core(fsA["+x"], 41.0, SHOP_H, AT, _r, hue="amber")
lift_core(fsB["+z"], 15.5, BY0, BT, _r)
lift_core(fsC["+x"], 6.0, CY0, CT, _r, w=2.6, hue="amber")
riser(fsA["+z"], 26.5, floor_y(6), AT - 2.0, "magenta")
riser(fsB["+x"], 3.0, BY0 + 2.0, BT - 2.0, "cyan")
riser(fsC["+z"], 2.0, CY0 + 2.0, CT - 2.0, "pink")
# Its signs are the block's own neon (no dealt boards: a board added here
# re-deals every board after it, the canyon's in the hero's frame among them).
vboard(fsA["+x"], 12.0, 88.0, "HOTEL", "pink", w=2.6, out=2.6)
neon_board(fsA["+z"], 18.0, 29.0, 118.0, 123.0, 2.6, "KARAOKE", "magenta", sub="24 H  -  42F", sub_hue="cyan")
vboard(fsB["+x"], 30.0, BY0 + 10.0, "BAR", "amber", w=2.4, out=2.6)

# ---------------------------------------------------------------------------
# Bridges to the east wing's tower over the lane, at two heights under its top.
# ---------------------------------------------------------------------------
for (y, hue) in ((floor_y(30), "amber"), (floor_y(41), "cyan")):
    if y + CELL_H < ET2_TOP - 2.0:
        bridge(84.0, 89.0, AZ1, ET2[2], y, y + CELL_H, hue)

# ---------------------------------------------------------------------------
# The first step's roof: the landing pad, its lamps and markings.
# ---------------------------------------------------------------------------
pad((A0 + B0) / 2, (AZ0 + AZ1) / 2, AT, half=min(5.4, (B0 - A0) / 2 - 0.4))
for z in (AZ1 + 3.0, AZ0 - 3.0):
    hquad((D, "glow", 1), A0 + 1.0, B0 - 1.0, z - 0.1, z + 0.1, AT + 0.03, col=dim(GLOW["yellow"], 0.6))
for (x, z) in ((A0 + 1.5, -812.0), (A0 + 1.5, -840.0), (B0 - 1.5, -812.0), (B0 - 1.5, -840.0)):
    box((D, "glow", 0), x - 0.2, x + 0.2, AT, AT + 0.5, z - 0.2, z + 0.2, scale=0.5, col=GLOW["amber"])
P.place("roof_hut", A0 + 3.0, AT, AZ1 + 2.6, 0.0)

# ---------------------------------------------------------------------------
# The crown: the number lit on its south face, a band of light under its
# edge, tanks on frames, masts with red beacons, a tower crane.
# ---------------------------------------------------------------------------
numeral("H4", (C0 + C1) / 2, CT - 9.0, CZ1 + 0.05, 10.0, 0.0, lit=0.9, pad=1.2)
band(D, cut_rect((C0 + C1) / 2, (CZ0 + CZ1) / 2, (C1 - C0) / 2, (CZ1 - CZ0) / 2), CT - 1.6, CT - 0.8, "amber", out=0.25)
for (x, z, h, rr) in ((C0 + 3.0, CZ0 + 4.0, 5.5, 1.8), (C0 + 3.0, CZ0 + 9.0, 5.0, 1.6), (C1 - 3.2, CZ0 + 4.0, 6.0, 2.0)):
    for dx in (-rr * 0.7, rr * 0.7):
        for dz in (-rr * 0.7, rr * 0.7):
            box((D, "metal", 0), x + dx - 0.12, x + dx + 0.12, CT, CT + 2.2, z + dz - 0.12, z + dz + 0.12, scale=0.5)
    cylinder((D, "tankplate", 0), x, z, CT + 2.2, CT + 2.2 + h, rr, segs=10, col=dim(CREAM, 1.5))
for (mx, mz, mh) in ((C1 - 1.5, CZ0 + 1.5, 22.0), (C1 - 5.0, CZ0 + 1.5, 16.0)):
    while mh > 5.0 and hero_sees((mx - 0.5, CT, mz - 0.5), (mx + 0.5, CT + mh + 1.5, mz + 0.5)):
        mh -= 2.0
    LOG.append("mast %.1f %.1f" % (mx, mh))
    if hero_sees((mx - 0.5, CT, mz - 0.5), (mx + 0.5, CT + mh + 1.5, mz + 0.5)):
        continue
    cylinder((D, "metal", 0), mx, mz, CT, CT + mh, 0.32, segs=6)
    for t in (0.45, 0.75):
        box((D, "metal", 1), mx - 1.5, mx + 1.5, CT + mh * t, CT + mh * t + 0.12, mz - 0.06, mz + 0.06, scale=0.5)
    cylinder((D, "glow", 0), mx, mz, CT + mh, CT + mh + 0.9, 0.5, segs=6, col=GLOW["red"])
# The crane: a lattice mast, its jib out over the back and its counter-jib
# over the roof, the cab lit, red lamps at the tips; on whichever step's
# roof stands it tallest out of the hero's sight.


def crane_box(kx, kz, jb, cj, base, kh):
    return ((min(cj[0], kx, jb[0]) - 1.0, base, min(jb[1], cj[1]) - 1.0), (max(jb[0], kx, cj[0]) + 1.0, base + kh + 7.0, max(cj[1], jb[1]) + 1.0))


best = None
for (kx, kz, base) in ((C0 + 6.0, CZ0 + 6.0, CT), (B0 + 4.0, BZ0 + 5.0, BT), (A0 + 4.0, AZ0 + 5.0, AT), (A0 + 5.5, AZ1 - 4.5, AT)):
    jb, cj = (kx + 6.0, kz - 20.0), (kx - 1.5, kz + 8.0)
    kh = 30.0
    while kh > 8.0 and hero_sees(*crane_box(kx, kz, jb, cj, base, kh)):
        kh -= 2.0
    LOG.append("crane at %.0f %.0f %.1f: %.1f" % (kx, kz, base, kh))
    if not hero_sees(*crane_box(kx, kz, jb, cj, base, kh)) and (best is None or base + kh > best[2] + best[3]):
        best = (kx, kz, base, kh, jb, cj)
if best:
    KX, KZ, CB, KH, jib, cjb = best
    JY = CB + KH
    for dx in (-0.9, 0.9):
        for dz in (-0.9, 0.9):
            box((D, "metal", 0), KX + dx - 0.1, KX + dx + 0.1, CB, JY, KZ + dz - 0.1, KZ + dz + 0.1, scale=0.5)
    y = CB + 1.5
    while y < JY - 3.0:
        for (a, b) in (((KX - 0.9, KZ - 0.9), (KX + 0.9, KZ + 0.9)), ((KX + 0.9, KZ - 0.9), (KX - 0.9, KZ + 0.9))):
            pipe((D, "metal", 1), (a[0], y, a[1]), (b[0], y + 2.6, b[1]), 0.05, segs=3)
        y += 3.0
    for (a, b, h) in (((KX, KZ), jib, 1.4), ((KX, KZ), cjb, 1.2)):
        for dy in (0.0, h):
            pipe((D, "metal", 0), (a[0], JY + dy, a[1]), (b[0], JY + dy * 0.4, b[1]), 0.09, segs=4)
        cylinder((D, "glow", 0), b[0], b[1], JY - 0.2, JY + 0.4, 0.3, segs=6, col=GLOW["red"])
    pipe((D, "metal", 0), (KX, JY, KZ), (KX, JY + 6.0, KZ), 0.12, segs=4)
    for b in (jib, cjb):
        pipe((D, "metal", 1), (KX, JY + 6.0, KZ), (b[0], JY + 1.0, b[1]), 0.03, segs=3)
    box((D, "concrete", 0), cjb[0] - 1.5, cjb[0] + 1.5, JY - 1.6, JY + 0.4, cjb[1] - 1.0, cjb[1] + 1.0, scale=1.0)
    box((D, "trim", 0), KX - 1.2, KX + 1.2, JY - 2.4, JY - 0.4, KZ + 0.9, KZ + 2.6, scale=1.0, col=YEL, bottom=True)
    box((D, "glow", 0), KX - 1.0, KX + 1.0, JY - 1.9, JY - 0.9, KZ + 2.62, KZ + 2.66, scale=0.5, col=dim(GLOW["white"], 0.7))
    hx, hz = jib[0] * 0.55 + KX * 0.45, jib[1] * 0.55 + KZ * 0.45
    pipe((D, "metal", 1), (hx, JY, hz), (hx, JY - 9.0, hz), 0.02, segs=3)
    box((D, "trim", 0), hx - 0.5, hx + 0.5, JY - 9.6, JY - 9.0, hz - 0.5, hz + 0.5, scale=1.0, col=YEL)
for (x, z, yaw, pose) in ((C0 + 6.0, CZ1 - 2.0, 0.0, "idle"), (C1 - 5.0, CZ0 + 8.0, 2.0, "phone")):
    stand(x, z, yaw, pose, CT)
