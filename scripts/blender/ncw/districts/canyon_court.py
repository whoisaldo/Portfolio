"""ARASAKA's block: the forecourt that opens onto the canyon, the tower's
lobby and terrace, the annex with its landing pad, the service lane and the
blocks north of the tower. All of it streams in with the canyon's pack; the
tower itself is far.py's, in the core.

The forecourt is the show's corporate court at night (YRL74JmhVgk@30,
Fn9gKhU_2_Q@77): steps up to a raised paved court with light in the risers,
palms in planters, cube bollards along the kerb, low cyan kiosks, a
hexagonal hologram on a pole, tall screens either side of the doors, yellow
lines of light in the paving.
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import canyon_kit as C
from ncw.districts.canyon_kit import CB, fl

G0 = B.G0
COURT_Y = 0.75          # the raised court, four risers over the pavement
GREEN = (0.07, 0.17, 0.1, 1)


def _up(x0, x1, z0, z1, y, hue):
    """A line of light set into paving."""
    quad((CB, "glow", 0), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0), col=GLOW[hue])


def build(ax, az, occ, z_lo=-514.0, z_hi=-470.0):
    r = random.Random(4900)
    px0 = ax - 32.0          # the podium's west face
    # ---- the forecourt -----------------------------------------------------
    # At grade: an apron along the pavement and a walk along each flanking
    # building; between them the court, raised, its steps facing the street.
    B.ground_rect(CB, WALK, 19.0, z_lo, z_hi)
    B.ground_rect(CB, 19.0, px0, z_lo, z_lo + 6.0)
    B.ground_rect(CB, 19.0, px0, z_hi - 6.0, z_hi)
    cz0, cz1 = z_lo + 6.0, z_hi - 6.0
    for k in range(3):
        x = 19.0 + 0.4 * k
        box((CB, "concrete", 0), x, x + 0.4, G0, G0 + 0.15 * (k + 1), cz0, cz1, scale=1.5)
        box((CB, "neon_cyan", 0), x - 0.015, x, G0 + 0.15 * k + 0.05, G0 + 0.15 * k + 0.1, cz0 + 0.5, cz1 - 0.5, scale=1.0)
    box((CB, "concrete", 0), 20.2, px0, G0, COURT_Y - 0.01, cz0, cz1, scale=1.5)
    box((CB, "neon_cyan", 0), 20.185, 20.2, G0 + 0.5, G0 + 0.55, cz0 + 0.5, cz1 - 0.5, scale=1.0)
    B.ground_rect(CB, 20.2, px0, cz0, cz1, y=COURT_Y)
    # Its long edges: a planter wall with a hedge, a line of cyan under its lip.
    for za, zb in ((cz0, cz0 + 0.7), (cz1 - 0.7, cz1)):
        box((CB, "concrete", 0), 21.5, px0 - 1.0, COURT_Y - 0.01, COURT_Y + 0.55, za, zb, scale=1.5)
        box((CB, "trim", 0), 21.6, px0 - 1.1, COURT_Y + 0.55, COURT_Y + 1.1, za + 0.08, zb - 0.08, scale=1.0, col=GREEN)
        zo = za - 0.02 if za == cz0 else zb
        box((CB, "neon_cyan", 0), 21.5, px0 - 1.0, COURT_Y + 0.4, COURT_Y + 0.45, zo, zo + 0.02, scale=1.0)
    # The court's floor: joints in a grid, yellow lines of light leading to
    # the doors and edging the paving, teal along the steps' top, a dark red
    # runner up the middle to the doors; every line with its pools.
    C.paving(CB, 20.2, px0, cz0 + 0.7, cz1 - 0.7, COURT_Y, hue="yellow", pitch=3.8, lines="x", power=0.0)
    for dz in (-7.0, 7.0):
        _up(21.0, px0 - 0.5, az + dz - 0.07, az + dz + 0.07, COURT_Y + 0.022, "yellow")
        for x in (22.5, 26.5, 30.5, 34.5, 38.5, 41.5):
            light(CB, x, 1.0, az + dz, "yellow", 6.0)
            if x < 40.0:
                P.place("cy_bollard", x + 2.0, COURT_Y, az + dz + (0.5 if dz > 0 else -0.5), district=CB)
    for z0_, z1_ in ((cz0 + 0.75, cz0 + 0.87), (cz1 - 0.87, cz1 - 0.75)):
        _up(21.5, px0 - 1.0, z0_, z1_, COURT_Y + 0.022, "yellow")
    _up(20.3, 20.42, cz0 + 0.8, cz1 - 0.8, COURT_Y + 0.022, "teal")
    for z in (cz0 + 4.0, cz0 + 10.0, az + 14.0, az - 14.0, cz1 - 4.0):
        light(CB, 21.0, 1.0, z, "teal", 5.0)
    C.flat((CB, "trim", 1), 22.0, px0 - 0.6, az - 1.7, az + 1.7, COURT_Y + 0.016, (0.17, 0.02, 0.035, 1))
    # Palms in planters in two rows, tall, lit from their feet; a bench by
    # each, people on the benches.
    for row_z in (az - 10.5, az + 10.5):
        for x in (24.5, 31.5, 38.5):
            P.place("planter_palm", x, COURT_Y, row_z, sy=1.35, sxz=1.15, district=CB)
            light(CB, x, 1.5, row_z, "teal", 5.0)
        for x in (28.0, 35.0):
            P.place("bench", x, COURT_Y, row_z, 0.0, district=CB)
            if r.random() < 0.8:
                stand(x + r.uniform(-0.5, 0.5), row_z, 0.0 if row_z < az else math.pi, "sit", COURT_Y + 0.48)
    # Along the kerb side of the apron: barricade blocks in pairs and lit
    # bollards between them; a chicane of blocks at the head of the steps.
    z, k = z_lo + 2.0, 0
    while z < z_hi - 1.0:
        if k % 5 < 2:
            P.place("cy_block", WALK + 0.9, G0, z, math.pi / 2, district=CB)
        else:
            P.place("cy_bollard", WALK + 0.9, G0, z, district=CB)
        z += 2.35
        k += 1
    for bz, bx in ((az - 5.6, 21.6), (az - 3.6, 23.4), (az + 3.6, 23.4), (az + 5.6, 21.6)):
        P.place("cy_block", bx, COURT_Y, bz, math.pi / 2, district=CB)
    for kz in (z_lo + 9.0, z_hi - 9.0):
        P.place("cy_kiosk", 17.2, G0, kz, -math.pi / 2, district=CB)
        stand(16.0, kz, math.pi / 2, "idle", G0)
        stand(15.4, kz + 0.5, math.pi / 2, "phone", G0)
        light(CB, 16.2, 1.5, kz, "cyan", 5.0)
    # The hologram over the doors, the forecourt's sign: a hexagon of cyan
    # light as tall as three floors standing off the podium on struts, a
    # faint field inside it and the court's own emblem (a ring round three
    # bars, the middle one tall), two lines of a notice under it. Read from
    # the street, the steps and the court.
    hxp, hyp, hzp, R = px0 - 1.3, 11.4, az, 5.4
    C.ngon((CB, "neon_cyan", 0), (hxp, hyp, hzp), R, 0.36, 6, 0.0, "x", both=False)
    C.ngon((CB, "glow", 0), (hxp, hyp, hzp), R - 0.6, 0.07, 6, 0.0, "x", C.dim("cyan", 0.8), both=False)
    C.ngon((CB, "glow", 0), (hxp + 0.03, hyp, hzp), R - 0.36, 99.0, 6, 0.0, "x", C.dim("cyan", 0.05), both=False)
    C.ngon((CB, "glow", 0), (hxp - 0.03, hyp + 0.5, hzp), 2.5, 0.3, 20, 0.0, "x", GLOW["white"], both=False)
    for dz, bh in ((-0.95, 1.5), (0.0, 2.7), (0.95, 1.5)):
        quad((CB, "neon_cyan", 0), (hxp - 0.03, hyp - 0.75, hzp + dz - 0.26), (hxp - 0.03, hyp - 0.75, hzp + dz + 0.26),
             (hxp - 0.03, hyp - 0.75 + bh, hzp + dz + 0.26), (hxp - 0.03, hyp - 0.75 + bh, hzp + dz - 0.26))
    for wd, dy in ((3.4, -2.75), (2.2, -3.25)):
        quad((CB, "glow", 0), (hxp - 0.03, hyp + dy, hzp - wd / 2), (hxp - 0.03, hyp + dy, hzp + wd / 2),
             (hxp - 0.03, hyp + dy + 0.2, hzp + wd / 2), (hxp - 0.03, hyp + dy + 0.2, hzp - wd / 2), col=C.dim("cyan", 0.8))
    for dz in (-R * 0.8, R * 0.8):
        box((CB, "metal", 1), hxp, px0, hyp - 0.08, hyp + 0.08, hzp + dz - 0.08, hzp + dz + 0.08, scale=0.5, bottom=True)
    for lx, lz in ((px0 - 6.0, az - 4.0), (px0 - 6.0, az + 4.0), (px0 - 11.0, az), (px0 - 16.0, az - 3.0), (px0 - 16.0, az + 3.0)):
        light(CB, lx, 2.0, lz, "cyan", 7.0)
    # Totems on the apron where the banners stood, each a column of type in a
    # dark frame under a red cap, read along the pavement; advert totems on
    # the court.
    sw, sh = ST_SIZES["bl"]
    for bz in (az - 14.0, az, az + 14.0):
        box((CB, "board_frame", 0), 18.3 - sw / 2 - 0.1, 18.3 + sw / 2 + 0.1, G0, 6.5, bz - 0.09, bz + 0.09, scale=1.0)
        box((CB, "neon_red", 0), 18.3 - sw / 2 - 0.12, 18.3 + sw / 2 + 0.12, 6.5, 6.6, bz - 0.11, bz + 0.11, scale=1.0)
        sign(st_name("bl"), 18.3, 3.7, bz + 0.1, sw, sh, 0.0, district=CB, label=False)
        sign(st_name("bl"), 18.3, 3.7, bz - 0.1, sw, sh, math.pi, district=CB, label=False)
        light(CB, 18.3, 1.5, bz + 1.5, "red", 4.0)
        light(CB, 18.3, 1.5, bz - 1.5, "red", 4.0)
    for tx, tz in ((26.0, cz0 + 3.6), (26.0, cz1 - 3.6), (36.5, cz0 + 3.6), (36.5, cz1 - 3.6)):
        C.totem(CB, tx, COURT_Y, tz, -math.pi / 2, r)
    # ---- the lobby -----------------------------------------------------------
    # The podium's west face: a wall of lit rooms behind dark mullions, bay
    # by bay, a line of red over it; in the middle the doors in a dark
    # portal: four glazed leaves under a transom, a warm panel with the
    # court's ring over them, red light up the portal's jambs, a canopy with
    # small lamps under it, turnstiles before it; a tall screen either side.
    fw = B.Face("-x", px0, az - 27.0, az + 27.0)
    mid = fw.width / 2
    s = 2.0
    while s <= fw.width - 2.0:
        fw.box((CB, "board_frame", 0), s - 0.09, s + 0.09, COURT_Y, SHOP_H - 0.7, 0.0, 0.16)
        if s + 3.125 <= fw.width - 2.0 + 0.01:
            fw.quad((CB, "shop", 0), s + 0.09, s + 3.035, COURT_Y + 0.25, SHOP_H - 0.9, 0.06, col=(r.uniform(0.55, 0.9), r.random(), 1.0, 1.0))
        s += 3.125
    fw.quad((CB, "trim", 0), 2.0, fw.width - 2.0, COURT_Y, COURT_Y + 0.25, 0.06, col=B.DARK_TRIM)
    top = SHOP_H - 0.9
    for a_, b_ in ((mid - 3.1, mid - 2.5), (mid + 2.5, mid + 3.1)):
        fw.box((CB, "board_frame", 0), a_, b_, COURT_Y, top, 0.0, 0.9)
    fw.box((CB, "board_frame", 0), mid - 3.1, mid + 3.1, top - 0.3, top, 0.0, 0.9)
    for sj, dj in ((mid - 2.5, 0.02), (mid + 2.5, -0.07)):
        fw.box((CB, "neon_red", 0), sj + dj, sj + dj + 0.05, COURT_Y + 0.1, top - 0.35, 0.3, 0.36)
    fw.quad((CB, "glass_dark", 0), mid - 2.5, mid + 2.5, COURT_Y, 2.95, 0.1)
    fw.quad((CB, "glow", 0), mid - 2.5, mid + 2.5, 3.0, top - 0.3, 0.1, col=(0.5, 0.33, 0.17, 1))
    for k in range(5):
        sm = mid - 2.5 + k * 1.25
        fw.box((CB, "board_frame", 0), sm - 0.05, sm + 0.05, COURT_Y, 2.95, 0.1, 0.18)
        if k < 4:
            fw.quad((CB, "glow", 0), sm + 0.12, sm + 1.13, COURT_Y + 0.12, 2.83, 0.11, col=(0.3, 0.22, 0.13, 1))
            hs = sm + (1.0 if k % 2 == 0 else 0.17)
            fw.box((CB, "metal", 1), hs, hs + 0.08, 1.5, 2.1, 0.12, 0.2)
    fw.box((CB, "board_frame", 0), mid - 2.5, mid + 2.5, 2.92, 3.02, 0.1, 0.2)
    lx_, ly_, lz_ = fw.p(fw.at(mid), (3.0 + top - 0.3) / 2, 0.12)
    C.ngon((CB, "neon_red", 0), (lx_, ly_, lz_), 0.17, 0.05, 14, 0.0, "x", both=False)
    x0c, x1c = px0 - 3.4, px0
    box((CB, "board_frame", 0), x0c, x1c, top, top + 0.25, az - 5.0, az + 5.0, scale=1.0, bottom=True)
    for dz in (-3.6, -1.2, 1.2, 3.6):
        box((CB, "glow", 0), x0c + 1.5, x0c + 1.8, top - 0.03, top, az + dz - 0.15, az + dz + 0.15, scale=0.5, col=(0.8, 0.62, 0.4, 1), bottom=True)
    light(CB, px0 - 2.0, 3.0, az - 2.0, "amber", 6.0)
    light(CB, px0 - 2.0, 3.0, az + 2.0, "amber", 6.0)
    for dz in (-3.2, -1.6, 0.0, 1.6, 3.2):
        P.place("cy_gate", px0 - 4.6, COURT_Y, az + dz, math.pi / 2, district=CB)
    for dz in (-16.0, 16.0):
        B.billboard(CB, px0 - 0.45, COURT_Y + 5.6, az + dz, 2.8, 8.4, -math.pi / 2, r, frame=True, back=False, depth=0.3)
        light(CB, px0 - 2.5, 2.0, az + dz, "pink", 5.0)
    # Two guards at the doors, a queue at the turnstiles, people crossing
    # the court in twos, guards at the chicane.
    for dz in (-3.9, 3.9):
        stand(px0 - 1.4, az + dz, -math.pi / 2, "idle", COURT_Y)
    for qx in (px0 - 5.6, px0 - 6.5, px0 - 7.6):
        stand(qx, az + 0.8, math.pi / 2, r.choice(("idle", "phone")), COURT_Y)
    for gx, gz in ((27.0, az - 3.0), (34.0, az + 4.0), (33.0, az - 13.5), (29.0, az + 12.6)):
        stand(gx, gz, 0.0, "talk", COURT_Y if cz0 < gz < cz1 else G0)
        stand(gx, gz + 1.0, math.pi, "talk", COURT_Y if cz0 < gz + 1.0 < cz1 else G0)
    stand(21.2, az + 4.6, -math.pi / 2, "phone", COURT_Y)
    stand(22.6, az - 4.6, -math.pi / 2, "idle", COURT_Y)
    stand(20.0, az - 9.0, -math.pi / 2, "sit", G0 + 0.45)
    stand(20.0, az - 8.2, -math.pi / 2, "sit", G0 + 0.45)
    # ---- the tower's shaft and terrace -----------------------------------
    # Fins and a seam of light up the shaft's west, north and east faces
    # (ax5YUmkWf_Y@39); the south face is the hero's and the Work shot's and
    # stays as it was.
    rib = B.DARK_TRIM
    for f in (B.Face("-x", ax - 26.0, az - 21.0, az + 21.0), B.Face("+x", ax + 26.0, az - 21.0, az + 21.0), B.Face("-z", az - 26.0, ax - 21.0, ax + 21.0)):
        for off in (3.0, 9.0, 15.0, 27.0, 33.0, 39.0):
            f.box((CB, "trim", 1), off - 0.3, off + 0.3, 21.2, 107.8, 0.0, 0.5, col=rib)
        f.quad((CB, "neon_red", 0), 20.7, 21.3, 24.0, 106.0, 0.12)
    # The podium's roof, round the shaft: a glass rail, trees, lamps, people.
    walls((CB, "glass_dark", 1), cut_rect(ax, az, 31.7, 31.7, 5.0), 21.0, 22.1, (1, 1, 1, 1))
    walls((CB, "metal", 1), cut_rect(ax, az, 31.75, 31.75, 5.0), 22.1, 22.17, (1, 1, 1, 1))
    for sx, sz in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        P.place("planter_tree", ax + sx * 24.0, 21.0, az + sz * 29.0, district=CB)
        P.place("planter_tree", ax + sx * 29.0, 21.0, az + sz * 12.0, district=CB)
        P.place("cy_deck_lamp", ax + sx * 30.6, 21.0, az + sz * 22.0, -sx * math.pi / 2, district=CB)
    for (tx, tz, yaw) in ((ax - 30.8, az + 3.0, math.pi / 2), (ax - 30.8, az + 4.1, math.pi / 2), (ax + 6.0, az + 30.8, math.pi), (ax - 12.0, az - 30.8, 0.0)):
        stand(tx, tz, yaw, "lean", 21.0)
    # ---- the yard, the annex and its landing pad ------------------------
    # East of the tower: a paved yard behind a wall with red lamps on it, a
    # low annex, and on its roof a landing pad ringed in light.
    B.ground_rect(CB, ax + 32.0, 132.0, -560.0, -456.0)
    B.ground_rect(CB, 44.0, ax + 32.0, -530.0, az - 32.0)
    box((CB, "concrete", 0), 131.6, 132.0, 0.0, 3.4, -560.0, -456.0, scale=2.0)
    z = -552.0
    while z < -458.0:
        box((CB, "neon_red", 0), 131.5, 131.6, 3.0, 3.25, z - 0.15, z + 0.15, scale=0.5)
        light(CB, 130.6, 3.0, z, "red", 3.0)
        z += 12.0
    a0, a1, b0, b1, ah = 111.0, 129.0, az - 24.0, az + 26.0, fl(3)
    B.building(B.Lot(a0, a1, b0, b1, "-x", {"-x": "open", "+x": "back", "+z": "open", "-z": "open"}, {}, CB), ah, random.Random(4910),
               style=dict(windows=(2, 5), lit=(0.5, 0.8), warmth=(0.1, 0.5), tints=("navy", "charcoal"), balcony=0.0, ac=0.1, setback=0.0,
                          cornice=1.0, pipes=1.0), signs=False, ground="blank", roof=False)
    pcx, pcz, pr = (a0 + a1) / 2, (b0 + b1) / 2 + 4.0, 7.2
    ring = [(pcx + pr * math.cos(t), pcz + pr * math.sin(t)) for t in (i * math.tau / 20 for i in range(20))]
    rin = [(pcx + (pr - 0.35) * math.cos(t), pcz + (pr - 0.35) * math.sin(t)) for t in (i * math.tau / 20 for i in range(20))]
    for i in range(20):
        j = (i + 1) % 20
        quad((CB, "glow", 0), (ring[j][0], ah + 0.02, ring[j][1]), (ring[i][0], ah + 0.02, ring[i][1]), (rin[i][0], ah + 0.02, rin[i][1]),
             (rin[j][0], ah + 0.02, rin[j][1]), col=GLOW["amber"])
    for (x0, x1, z0, z1) in ((pcx - 2.0, pcx - 1.5, pcz - 2.4, pcz + 2.4), (pcx + 1.5, pcx + 2.0, pcz - 2.4, pcz + 2.4), (pcx - 1.5, pcx + 1.5, pcz - 0.25, pcz + 0.25)):
        _up(x0, x1, z0, z1, ah + 0.02, "white")
    for i in range(8):
        t = i * math.tau / 8 + 0.39
        lx, lz = pcx + (pr + 0.9) * math.cos(t), pcz + (pr + 0.9) * math.sin(t)
        box((CB, "glow", 0), lx - 0.1, lx + 0.1, ah, ah + 0.3, lz - 0.1, lz + 0.1, scale=0.5, col=GLOW["red"])
    for f in B.faces_of(a0, a1, b0, b1).values():
        C.parapet(CB, f, ah, B.TRIM[1], h=0.6)
    B.roof_dress(CB, a0 + 1.0, a1 - 1.0, b0 + 1.0, pcz - pr - 2.0, ah, r, cap=4.0, parapet=False, tint=1)
    P.place("cy_mast", a0 + 2.0, ah, b1 - 2.0, 0.4, sy=0.7, district=CB)
    stand(pcx - pr - 1.2, pcz + 2.0, math.pi / 2, "idle", ah)
    stand(pcx - pr - 1.2, pcz - 1.0, math.pi / 2, "phone", ah)
    # A gate in the yard's wall line by the tower's corner, a guard's booth.
    box((CB, "trim", 0), 108.2, 110.6, G0, 2.8, -462.0, -459.4, scale=1.0, col=B.TRIM[5])
    quad((CB, "shop", 0), (108.18, 1.0, -459.8), (108.18, 1.0, -461.6), (108.18, 2.3, -461.6), (108.18, 2.3, -459.8), col=(0.8, 0.9, 1.0, 1.0))
    P.place("barrier", 120.0, G0, -458.0, district=CB)
    stand(111.4, -460.6, 0.0, "idle", G0)
    # ---- north of the tower -----------------------------------------------
    # A service lane along the podium and a row of office blocks beyond it,
    # their backs on the Megabuilding's line.
    lo, hi = (46.0, 0.0, -560.0), (132.0, 60.0, -530.0)
    if not C.hidden(occ, lo, hi):
        raise RuntimeError("the blocks north of ARASAKA show in the hero's lens")
    hr = random.Random(4920)
    B.row(CB, "+z", 46.0, 131.0, 30.0, -530.0, lambda i, a: hr.choice((32.0, 38.0, 45.0, 52.0)), lambda i: hr.choice((19.2, 22.4, 25.6)),
          random.Random(4921), style=dict(windows=(5, 2, 4, 0, 5), lit=(0.4, 0.8), warmth=(0.15, 0.9), tints=("navy", "teal", "charcoal", "plum"),
                                          balcony=0.08, ac=0.15, signs=1.0, awning=0.3, shop_sign=0.5, canopy=0.25, roof_cap=6.0, setback=0.5,
                                          fire_escape=0.1, roof_sign=0.5), ends=("open", "open"))
    C.lane(CB, 46.0, 130.0, -530.0, -522.0, random.Random(4922), along="x", tubes=False, name="cy_service")
    for x in (60.0, 84.0, 108.0):
        P.place("lamp_short", x, G0, -522.6, district=CB)
