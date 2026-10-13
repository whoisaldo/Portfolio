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
from ncw.districts.canyon_kit import CB, FA, fl

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
        light(CB, 21.0, 1.0, z, "teal", 2.0)
    C.flat((CB, "trim", 1), 22.0, px0 - 0.6, az - 1.7, az + 1.7, COURT_Y + 0.016, (0.17, 0.02, 0.035, 1))
    # Palms in two rows, tall and thin, standing over the signs, lit from
    # their feet; a bench by each, people on the benches. (Each a little
    # its own height and turned its own way.)
    for row_z in (az - 10.5, az + 10.5):
        for x in (24.5, 31.5, 38.5):
            P.place("cy_palm", x, COURT_Y, row_z, r.uniform(0, 6.28), sy=r.uniform(0.9, 1.12), district=CB)
            light(CB, x, 1.5, row_z, "amber", 5.0)
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
        light(CB, 16.2, 1.5, kz, "white", 3.0)
    # The court's own light on its floor, warm and wide under the hologram
    # and before the doors (the bake's pools: paint laid on a lit floor
    # only darkened it).
    for lx, lz in ((px0 - 9.5, az - 1.6), (px0 - 9.5, az + 1.6), (px0 - 3.0, az)):
        light(CB, lx, 2.4, lz, "amber", 9.0)
    # What a corporate court is closed with: a second line of barricade
    # blocks across it between the palms, tape strung from post to post
    # round the queue, kiosks in a cluster each side with people at them,
    # lit advert stands along its edges (Fn9gKhU_2_Q@77, YRL74JmhVgk@30).
    for bz in (az - 9.0, az - 6.6, az + 6.6, az + 9.0):
        P.place("cy_block", 27.6 + (0.9 if abs(bz - az) > 8.0 else 0.0), COURT_Y, bz, math.pi / 2 + r.uniform(-0.2, 0.2), district=CB)
    posts = [(px0 - 8.6, az - 2.2), (px0 - 5.0, az - 2.2), (px0 - 5.0, az + 2.2), (px0 - 8.6, az + 2.2), (px0 - 11.5, az + 3.4)]
    for (xa, za), (xb, zb) in zip(posts, posts[1:]):
        C.tape(CB, (xa, za), (xb, zb), y=COURT_Y + 0.95)
    for xa, za in posts:
        cylinder((CB, "metal", 1), xa, za, COURT_Y, COURT_Y + 1.1, 0.04, segs=5)
        cylinder((CB, "metal", 1), xa, za, COURT_Y, COURT_Y + 0.05, 0.18, segs=7)
    # (The court runs from cz0 to cz1, further north of the doors' line
    # than south of it: the cluster stands on its north side, where there
    # is room between the palms and the planter wall.)
    for k_, (kx, kzo) in enumerate(((30.2, 13.8), (32.6, 14.6), (31.4, 12.5))):
        P.place("cy_kiosk", kx, COURT_Y, az - kzo, -math.pi / 2 - (0.5 - k_ * 0.35), district=CB)
    light(CB, 30.0, 1.6, az - 13.6, "white", 3.0)
    for px_, pz_, yaw_, pose in ((29.0, 13.4, math.pi / 2, "phone"), (29.3, 14.6, math.pi / 2, "idle"), (31.4, 11.6, 0.0, "talk"), (31.4, 10.7, math.pi, "talk"),
                                 (28.2, 15.6, 1.0, "smoke"), (33.6, 16.0, -1.2, "idle")):
        stand(px_, az - pz_, yaw_, pose, COURT_Y)
    for lz, yaw_ in ((cz0 + 1.7, 0.0), (cz1 - 1.7, math.pi)):
        for lx in (23.2, 35.4, 40.0):
            P.place("lightbox", lx, COURT_Y, lz, yaw_, district=CB)
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
        light(CB, lx, 2.0, lz, "amber", 8.0)
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
        light(CB, px0 - 2.5, 2.0, az + dz, "cyan", 5.0)
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
    # ---- the terrace on the podium's roof ---------------------------------
    # The podium's roof, round the shaft: a glass rail, trees, lamps, people.
    walls((CB, "glass_dark", 1), cut_rect(ax, az, 31.7, 31.7, 5.0), 21.0, 22.1, (1, 1, 1, 1))
    walls((CB, "metal", 1), cut_rect(ax, az, 31.75, 31.75, 5.0), 22.1, 22.17, (1, 1, 1, 1))
    for sx, sz in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        P.place("planter_palm", ax + sx * 24.0, 21.0, az + sz * 29.0, district=CB)
        P.place("planter_palm", ax + sx * 29.0, 21.0, az + sz * 12.0, sxz=0.9, district=CB)
        P.place("cy_deck_lamp", ax + sx * 30.6, 21.0, az + sz * 22.0, -sx * math.pi / 2, district=CB)
    for (tx, tz, yaw) in ((ax - 30.8, az + 14.0, math.pi / 2), (ax - 30.8, az + 15.1, math.pi / 2), (ax + 14.0, az + 30.8, math.pi), (ax - 14.0, az - 30.8, 0.0)):
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
    _corporate(ax, az, z_lo, z_hi, px0, cz0, cz1, random.Random(4977))


def _banner(x, z, yaw, h=9.0):
    """A tall red banner on a pole, the court's emblem pale on it, read
    from both sides."""
    cylinder((CB, "metal", 0), x, z, COURT_Y, COURT_Y + h, 0.07, segs=6)
    box((CB, "glow", 0), x - 0.1, x + 0.1, COURT_Y + h, COURT_Y + h + 0.2, z - 0.1, z + 0.1, scale=0.5, col=GLOW["red"])
    nx, nz = math.sin(yaw), math.cos(yaw)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    yc = COURT_Y + h - 2.6
    cx, cz = x + rx * 0.85, z + rz * 0.85
    box((CB, "metal", 1), min(x, cx + rx * 0.75) - 0.03, max(x, cx + rx * 0.75) + 0.03, yc + 2.15, yc + 2.22, min(z, cz + rz * 0.75) - 0.03, max(z, cz + rz * 0.75) + 0.03,
        scale=0.5)
    for sg in (1, -1):
        y_ = yaw if sg > 0 else yaw + math.pi
        ox, oz = nx * 0.02 * sg, nz * 0.02 * sg
        rotated_quad((CB, "glow", 0), cx + ox, yc, cz + oz, 1.5, 4.3, y_, col=C.dim("red", 0.32))
        # (The emblem: a ring round three bars, the middle one tall.)
        ex, ey, ez = cx + ox * 2, yc + 1.05, cz + oz * 2
        C.ngon((CB, "glow", 0), (ex, ey, ez), 0.5, 0.09, 16, 0.0, "z" if abs(nz) > 0.5 else "x", C.dim("white", 0.75))
        for u, hh in ((-0.2, 0.2), (0.0, 0.34), (0.2, 0.2)):
            rotated_quad((CB, "glow", 0), ex + rx * u + ox, ey, ez + rz * u + oz, 0.08, hh * 2, y_, col=C.dim("white", 0.75))


def _arch(x, z, w=1.3):
    """A scanner gate on the approach: two posts, a lintel with a line of
    light, a red lamp on each post."""
    for zz in (z - w / 2, z + w / 2):
        box((CB, "metal", 0), x - 0.12, x + 0.12, COURT_Y, COURT_Y + 2.3, zz - 0.08, zz + 0.08, scale=0.5)
        box((CB, "glow", 0), x - 0.13, x + 0.13, COURT_Y + 1.0, COURT_Y + 1.6, zz - 0.02, zz + 0.02, scale=0.5, col=C.dim("cyan", 0.6))
    box((CB, "metal", 0), x - 0.14, x + 0.14, COURT_Y + 2.3, COURT_Y + 2.55, z - w / 2 - 0.08, z + w / 2 + 0.08, scale=0.5)
    box((CB, "glow", 0), x - 0.15, x + 0.15, COURT_Y + 2.32, COURT_Y + 2.4, z - w / 2, z + w / 2, scale=0.5, col=C.dim("red", 0.9), bottom=True)


def _corporate(ax, az, z_lo, z_hi, px0, cz0, cz1, r):
    """What makes the court a corporation's (YRL74JmhVgk@30, Fn9gKhU_2_Q@77):
    tall red banners on the planter walls, scanner gates on the runner
    with guards at them, a guard's booth on the apron, and people: staff
    crossing in twos and threes, a knot at each bench, visitors on the
    apron (their own dice, so the court's run on as they did)."""
    for x in (26.0, 33.2, 40.2):
        for z, yaw in ((cz0 + 0.35, 0.0), (cz1 - 0.35, math.pi)):
            _banner(x, z, math.pi / 2 + (math.pi if yaw == 0.0 else 0.0))
    for dz in (-0.75, 0.75):
        _arch(24.6, az + dz, 1.3)
    stand(24.6, az - 1.9, -math.pi / 2, "idle", COURT_Y)
    stand(24.6, az + 1.9, -math.pi / 2, "idle", COURT_Y)
    stand(25.4, az + 2.4, -math.pi / 2 + 0.6, "phone", COURT_Y)
    # The booth: a dark cabin, its window lit, a guard in it and one at its door.
    bx0, bx1, bz0, bz1 = 15.2, 17.4, z_hi - 4.6, z_hi - 2.4
    box((CB, "trim", 0), bx0, bx1, G0, G0 + 2.5, bz0, bz1, scale=1.0, col=(0.03, 0.035, 0.05, 1))
    box((CB, "trim", 0), bx0 - 0.15, bx1 + 0.15, G0 + 2.5, G0 + 2.7, bz0 - 0.15, bz1 + 0.15, scale=1.0, col=(0.05, 0.055, 0.07, 1))
    f = B.Face("-x", bx0, bz0, bz1)
    f.quad((CB, "glow", 0), 0.25, f.width - 0.25, G0 + 1.1, G0 + 2.1, 0.02, col=C.dim("cyan", 0.35))
    B.Face("-x", bx0, bz0, bz1).quad((CB, "neon_red", 0), 0.1, f.width - 0.1, G0 + 2.52, G0 + 2.6, 0.17)
    light(CB, bx0 - 0.8, 2.2, (bz0 + bz1) / 2, "white", 3.5)
    stand(bx0 - 0.6, bz0 - 0.5, -math.pi / 2, "idle", G0)
    # Staff and visitors on the court and the apron, clear of the palms,
    # benches, kiosks, blocks, the tape and the runner's gates.
    keep = [(24.5, az - 10.5, 1.6), (31.5, az - 10.5, 1.6), (38.5, az - 10.5, 1.6), (24.5, az + 10.5, 1.6), (31.5, az + 10.5, 1.6),
            (38.5, az + 10.5, 1.6), (28.0, az - 10.5, 1.4), (35.0, az - 10.5, 1.4), (28.0, az + 10.5, 1.4), (35.0, az + 10.5, 1.4),
            (31.5, az - 14.0, 3.2), (34.5, az, 4.0), (24.6, az, 2.6), (22.5, az, 6.0), (px0 - 1.0, az, 4.0)]
    keep += [(x, z, 1.0) for x in (23.2, 35.4, 40.0) for z in (cz0 + 1.7, cz1 - 1.7)]
    keep += [(x, z, 1.0) for x in (26.0, 33.2, 40.2) for z in (cz0 + 0.35, cz1 - 0.35)]
    keep += [(27.6, az + dz, 1.2) for dz in (-9.0, -6.6, 6.6, 9.0)]

    def free(x, z, rad=0.6):
        return all((x - kx) ** 2 + (z - kz) ** 2 > (kr + rad) ** 2 for kx, kz, kr in keep)
    placed = 0
    for _ in range(80):
        if placed >= 14:
            break
        x, z = r.uniform(22.5, px0 - 2.0), r.uniform(cz0 + 2.4, cz1 - 2.4)
        n = r.choice((2, 2, 3))
        if not free(x, z, 1.3):
            continue
        keep.append((x, z, 1.3))
        if n == 2:
            a = r.uniform(0, math.tau)
            for sg in (1, -1):
                stand(x + sg * 0.42 * math.cos(a), z + sg * 0.42 * math.sin(a), math.atan2(-sg * math.cos(a), -sg * math.sin(a)), "talk", COURT_Y)
        else:
            for k in range(3):
                a = k * math.tau / 3 + r.uniform(-0.3, 0.3)
                stand(x + 0.55 * math.cos(a), z + 0.55 * math.sin(a), math.atan2(-math.cos(a), -math.sin(a)), r.choice(("talk", "idle", "phone")), COURT_Y)
        placed += 1
    # Walkers on their way in or out, one at a time, along the runner's
    # edges and the yellow lines.
    for x in (27.0, 30.5, 36.5, 40.0):
        for dz in (-2.6, 2.6, -7.8, 7.8):
            if r.random() < 0.55 and free(x, az + dz, 0.5):
                stand(x, az + dz + r.uniform(-0.3, 0.3), r.choice((math.pi / 2, -math.pi / 2)) + r.uniform(-0.2, 0.2), r.choice(("idle", "phone")), COURT_Y)
    # Visitors on the apron below the steps.
    for z in (z_lo + 3.5, z_lo + 15.0, z_hi - 15.0, z_hi - 9.0):
        stand(17.6, z, r.choice((0.0, math.pi)) + r.uniform(-0.4, 0.4), r.choice(("idle", "phone", "smoke")), G0)
        if r.random() < 0.6:
            stand(18.2, z + 0.7, -math.pi / 2, "talk", G0)
            stand(17.4, z + 0.7, math.pi / 2, "talk", G0)


# ---------------------------------------------------------------------------
# The tower: the show's monolith (ax5YUmkWf_Y@39, ARL_JWwKdDs@1). Pale
# panels whole storeys tall that lean in as they rise, etched with dark
# lines that run up and jog across them; a seam round it every thirty
# metres; narrow lit windows in a column or two of some sections; a spine
# up the middle of each face with a channel of red light; stepped
# shoulders on the podium's roof, their faces windowed, the emblem on the
# one over the forecourt; a vertical belt where the name stands (exactly
# where the hero's band of sky and the Work shot have it); a tapering head
# with the emblem on each face; and a crown of fins round a lantern, red
# lamps on their tips, and a spire. What the hero's lens sees of it (from
# the roofs' line up) is in the core; the rest streams in with the
# canyon's pack.
# ---------------------------------------------------------------------------
# The show's tower is pale concrete, grooved (ax5YUmkWf_Y@40): at night it
# carries the city's light as a faint pale light of its own, brightest low
# down over the lit forecourt, and its grooves stay dark.
RIB = (0.05, 0.053, 0.068, 1)
GROOVE = (0.016, 0.017, 0.022, 1)
SPINE, SPINE_HIGH = (0.12, 0.13, 0.16, 1), (0.075, 0.08, 0.1, 1)
HERO_FROM = 110.0       # the canyon's roofs hide the tower below this
# Below that the tower is the show's slate blue (Fn9gKhU_2_Q@77): its
# shoulders, its podium.
SLATE = (0.05, 0.066, 0.105, 1)
SHOULDER = (0.07, 0.078, 0.098, 1)


def _plan(y):
    """The monolith's half width and corner cut at a height."""
    if y <= 150.0:
        t = (y - 21.0) / 129.0
        return 27.0 - 5.0 * t, 5.0 - 1.0 * t
    if y <= 168.0:
        return 22.0, 4.0
    t = (y - 168.0) / 46.0
    return 22.0 - 8.0 * t, 4.0 - 1.0 * t


def _shell(key, cx, cz, y0, y1, strips=11, wash=0.0, grow=0.0, col=None, plan=_plan, rib_col=RIB, lit=False):
    """The monolith's skin between two heights: each of its four faces in
    vertical strips, rib and groove by turns (the middle one a groove), its
    cut corners plain. `wash`: the forecourt's red light on it, low down.
    `lit`: a band of one colour that is its own faint light (a joint)."""
    (h0, c0), (h1, c1) = plan(y0), plan(y1)
    a, b = cut_rect(cx, cz, h0 + grow, h0 + grow, c0), cut_rect(cx, cz, h1 + grow, h1 + grow, c1)
    for i in range(8):
        j = (i + 1) % 8
        n = strips if i % 2 == 0 else 1
        for k in range(n):
            t0, t1 = k / n, (k + 1) / n
            rib = col is None and i % 2 == 0 and k % 2 == 0
            c = rib_col if rib else (col or GROOVE)
            c = (c[0] + wash * (0.25 if rib else 0.5), c[1] + wash * (0.02 if rib else 0.06), c[2] + wash * (0.04 if rib else 0.09), 1)
            quad((key, "glow" if rib or lit else "trim", 0),
                 (a[i][0] + (a[j][0] - a[i][0]) * t0, y0, a[i][1] + (a[j][1] - a[i][1]) * t0),
                 (a[i][0] + (a[j][0] - a[i][0]) * t1, y0, a[i][1] + (a[j][1] - a[i][1]) * t1),
                 (b[i][0] + (b[j][0] - b[i][0]) * t1, y1, b[i][1] + (b[j][1] - b[i][1]) * t1),
                 (b[i][0] + (b[j][0] - b[i][0]) * t0, y1, b[i][1] + (b[j][1] - b[i][1]) * t0), col=c)


FACES = (("s", 0, 1), ("e", 1, 0), ("n", 0, -1), ("w", -1, 0))


def _on(cx, cz, nx, nz, u, y, out=0.0):
    """A point on a face of the monolith: u metres to the right of its
    middle (seen from outside), at height y, `out` proud of it."""
    h = _plan(y)[0] + out
    return (cx + nx * h + nz * u, y, cz + nz * h - nx * u)


def _line(key, mat, cx, cz, nx, nz, u0, u1, y0, y1, out=0.08, col=(1, 1, 1, 1)):
    """A strip up a face (which leans), following it."""
    quad((key, mat, 0), _on(cx, cz, nx, nz, u0, y0, out), _on(cx, cz, nx, nz, u1, y0, out), _on(cx, cz, nx, nz, u1, y1, out),
         _on(cx, cz, nx, nz, u0, y1, out), col=col)


def _spine(key, cx, cz, nx, nz, y0, y1, col, half=1.8, out=0.95):
    """A band standing proud up the middle of a face, following its lean:
    its front and its two sides."""
    _line(key, "glow", cx, cz, nx, nz, -half, half, y0, y1, out=out, col=col)
    side = (col[0] * 0.55, col[1] * 0.55, col[2] * 0.55, 1)
    for u, sg in ((-half, -1), (half, 1)):
        a, b = _on(cx, cz, nx, nz, u, y0, 0.0), _on(cx, cz, nx, nz, u, y1, 0.0)
        c, d = _on(cx, cz, nx, nz, u, y1, out), _on(cx, cz, nx, nz, u, y0, out)
        quad((key, "glow", 0), *((a, d, c, b) if sg < 0 else (d, a, b, c)), col=side)


def _disc(key, cx, cz, nx, nz, yc, r0, r1, out, col, n=32):
    """A ring (or, from r0 0, a disc) flat on a face of the head."""
    for i in range(n):
        a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
        q = [_on(cx, cz, nx, nz, rad * math.cos(a), yc + rad * math.sin(a), out) for rad, a in ((r1, a0), (r1, a1), (r0, a1), (r0, a0))]
        quad(key, *q, col=col)


def _flat(cx, cz, nx, nz, H, u, y):
    """A point on an upright plane H metres out from the tower's middle,
    facing (nx, nz), u metres right of the middle seen from outside."""
    return (cx + nx * H + nz * u, y, cz + nz * H - nx * u)


def _vdisc(key, cx, cz, nx, nz, H, yc, r0, r1, col, n=32):
    """A ring (or a disc) on an upright plane H metres out from the middle."""
    for i in range(n):
        a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
        quad(key, *[_flat(cx, cz, nx, nz, H, rad * math.cos(a), yc + rad * math.sin(a)) for rad, a in ((r1, a0), (r1, a1), (r0, a1), (r0, a0))],
             col=col)


# The skin of the show's monolith (ax5YUmkWf_Y@40): pale panels, whole
# storeys tall, etched with dark lines that run up the face and jog across
# it like a circuit's traces; a seam round it every thirty metres or so; and
# in some sections, between two of the lines, a column of narrow lit windows,
# a few floors of them lit, the rest dark panel.
PANEL, PANEL_LOW = (0.046, 0.049, 0.063, 1), (0.078, 0.086, 0.108, 1)
CORNER, CORNER_LOW = (0.033, 0.035, 0.046, 1), (0.056, 0.062, 0.079, 1)
ETCH, ETCH_LOW = (0.014, 0.015, 0.02, 1), (0.02, 0.022, 0.03, 1)
WIN_COOL, WIN_WARM = (0.3, 0.36, 0.44, 1), (0.46, 0.34, 0.18, 1)


def _fu(y, f):
    """u (metres right of a main face's middle) at a fraction f of its half
    width between its cut corners, at height y."""
    h, c = _plan(y)
    return f * (h - c)


def _fq(key, mat, cx, cz, nx, nz, pts, out, col):
    """A quad on a main face from four (fraction, metres, height) points."""
    quad((key, mat, 0), *[_on(cx, cz, nx, nz, _fu(y, f) + du, y, out) for f, du, y in pts], col=col)


def _fill(key, cx, cz, y0, y1, face, corner):
    """The skin's panels between two heights: the four faces one colour,
    the cut corners another."""
    (h0, c0), (h1, c1) = _plan(y0), _plan(y1)
    a, b = cut_rect(cx, cz, h0, h0, c0), cut_rect(cx, cz, h1, h1, c1)
    for i in range(8):
        j = (i + 1) % 8
        quad((key, "glow", 0), (a[i][0], y0, a[i][1]), (a[j][0], y0, a[j][1]), (b[j][0], y1, b[j][1]), (b[i][0], y1, b[i][1]),
             col=face if i % 2 == 0 else corner)


def _etch(key, cx, cz, nx, nz, y0, y1, r, col, zones, w=0.34, out=0.05):
    """Etched lines up a face between two heights, clear of the spine and of
    the window zones: some run straight, some jog across at a height, some
    start or stop at a short tick."""
    taken = [(-0.16, 0.16)] + [(a - 0.03, b + 0.03) for a, b in zones]
    free = lambda f: all(not (a <= f <= b) for a, b in taken)
    lines = []
    for f0, f1 in zones:
        lines += [f0, f1]
    for _ in range(r.randint(3, 5)):
        for _try in range(12):
            f = r.choice((-1, 1)) * r.uniform(0.22, 0.95)
            if free(f) and all(abs(f - g) > 0.09 for g in lines):
                lines.append(f)
                break
    for f in lines:
        ya, yb = y0 + 0.4, y1 - 0.4
        bounded = any(abs(f - a) < 1e-6 or abs(f - b) < 1e-6 for a, b in zones)
        if not bounded and r.random() < 0.3:
            ya = r.uniform(y0 + 3.0, y0 + (y1 - y0) * 0.5)
            g = f + r.choice((-1, 1)) * r.uniform(0.04, 0.08)
            _fq(key, "glow", cx, cz, nx, nz, ((min(f, g), -w / 2, ya - w / 2), (max(f, g), w / 2, ya - w / 2),
                                              (max(f, g), w / 2, ya + w / 2), (min(f, g), -w / 2, ya + w / 2)), out, col)
        jog = None if bounded else (r.uniform(ya + 3.0, yb - 3.0) if yb - ya > 8.0 and r.random() < 0.55 else None)
        g = f
        if jog is not None:
            g = f + r.choice((-1, 1)) * r.uniform(0.05, 0.12)
            if not free(g) or abs(g) > 0.97 or any(abs(g - h_) < 0.06 for h_ in lines if h_ != f):
                g, jog = f, None
        if jog is None:
            _fq(key, "glow", cx, cz, nx, nz, ((f, -w / 2, ya), (f, w / 2, ya), (f, w / 2, yb), (f, -w / 2, yb)), out, col)
            continue
        _fq(key, "glow", cx, cz, nx, nz, ((f, -w / 2, ya), (f, w / 2, ya), (f, w / 2, jog), (f, -w / 2, jog)), out, col)
        _fq(key, "glow", cx, cz, nx, nz, ((min(f, g), -w / 2, jog - w / 2), (max(f, g), w / 2, jog - w / 2),
                                          (max(f, g), w / 2, jog + w / 2), (min(f, g), -w / 2, jog + w / 2)), out, col)
        _fq(key, "glow", cx, cz, nx, nz, ((g, -w / 2, jog), (g, w / 2, jog), (g, w / 2, yb), (g, -w / 2, yb)), out, col)


def _zones(r, n, lo=0.22):
    """Where on a face its window columns stand: n spans of its width, each
    between two etched lines, clear of the spine (and of the shoulders,
    inside `lo`) and of each other."""
    out = []
    for _ in range(n * 6):
        if len(out) == n:
            break
        wd = r.uniform(0.2, min(0.34, 0.9 - lo))
        a = r.uniform(lo, 0.94 - wd)
        if r.random() < 0.5:
            a = -a - wd
        if all(a + wd < c - 0.12 or a > d + 0.12 for c, d in out):
            out.append((a, a + wd))
    return out


def _windows(key, cx, cz, nx, nz, y0, y1, zones, r, busy=0.55, out=0.06, k=1.0):
    """Narrow lit windows in a face's zones, storey by storey: on a storey
    that is in use, lit in runs; the rest is panel."""
    y = y0 + 1.2
    while y + 2.6 < y1 - 0.6:
        used = r.random() < busy
        for fa, fb in zones:
            ym = y + 1.2
            wm = (_fu(ym, fb) - _fu(ym, fa))
            n = max(2, int(wm / 1.45))
            run = False
            for i in range(n):
                f = fa + (fb - fa) * (i + 0.5) / n
                lit = used and r.random() < (0.78 if run else 0.42)
                run = lit
                if not lit:
                    continue
                c = WIN_WARM if r.random() < 0.3 else WIN_COOL
                m = k * r.uniform(0.55, 1.0)
                _fq(key, "glow", cx, cz, nx, nz, ((f, -0.27, y), (f, 0.27, y), (f, 0.27, y + 2.1), (f, -0.27, y + 2.1)), out,
                    (c[0] * m, c[1] * m, c[2] * m, 1))
        y += 3.4


def tower(ax, az):
    # The podium: slate blue, in three tiers, each oversailing the one under
    # it by a metre with a line of light in its soffit; bands of amber and
    # cyan windows round the lower two between slate spandrels, the third a
    # plain kerb of slate with a line of cool light and a hair of red at its
    # head (Fn9gKhU_2_Q@77).
    box((FA, "dark", 0), ax - 32, ax + 32, 0, SHOP_H, az - 32, az + 32, scale=4.0)
    outline = cut_rect(ax, az, 32.0, 32.0, 5.0)
    band(CB, outline, SHOP_H - 0.62, SHOP_H - 0.54, "red", out=0.2)
    tiers = ((SHOP_H, fl(2), 32.0), (fl(2), fl(4), 33.0), (fl(4), 21.35, 34.0))
    for n, (y0, y1, half) in enumerate(tiers):
        o = cut_rect(ax, az, half, half, 5.0)
        if n < 2:
            prism(CB, o, y0, y1, 4930 + n, col=B.wall_col(0.8, 2, 0.5, B.TINTS["navy"]), roof=False)
            for ya, yb in ((y0, y0 + 0.8), (y1 - 0.7, y1)):
                walls((CB, "trim", 0), cut_rect(ax, az, half + 0.05, half + 0.05, 5.0), ya, yb, SLATE)
        else:
            walls((CB, "trim", 0), o, y0, y1, SLATE)
            walls((CB, "glow", 0), cut_rect(ax, az, half + 0.04, half + 0.04, 5.0), y0 + 1.2, y0 + 1.4, C.dim("white", 0.45))
            walls((CB, "neon_red", 0), cut_rect(ax, az, half + 0.04, half + 0.04, 5.0), y1 - 0.28, y1 - 0.2, (1, 1, 1, 1))
        if n:
            # Its soffit over the tier below, a line of light round it.
            inner = cut_rect(ax, az, half - 1.0, half - 1.0, 5.0)
            a_, b_ = cut_rect(ax, az, half - 0.62, half - 0.62, 5.0), cut_rect(ax, az, half - 0.38, half - 0.38, 5.0)
            hue = C.dim("white" if n == 1 else "yellow", 0.85)
            for i in range(8):
                j = (i + 1) % 8
                for ra, rb, key_, col_, dy in ((inner, o, (CB, "trim", 0), B.DARK_TRIM, 0.0), (a_, b_, (CB, "glow", 0), hue, -0.015)):
                    q = [(ra[i][0], y0 + dy, ra[i][1]), (ra[j][0], y0 + dy, ra[j][1]), (rb[j][0], y0 + dy, rb[j][1]), (rb[i][0], y0 + dy, rb[i][1])]
                    quad(key_, *q, col=col_)
                    quad(key_, q[1], q[0], q[3], q[2], col=col_)
    outline = cut_rect(ax, az, 34.0, 34.0, 5.0)
    poly((CB, "roof", 0), [(x, 21.0, z) for x, z in outline], [(x / 4, z / 4) for x, z in outline])
    # The shaft, leaning in, in storeys with a seam between them; the belt;
    # the head.
    cuts = (21.0, 45.0, 75.0, HERO_FROM, 150.0, 168.0, 191.0, 214.0)
    r = random.Random(4700)
    for y0, y1 in zip(cuts, cuts[1:]):
        high = y0 >= HERO_FROM
        key = FA if high else CB
        _fill(key, ax, az, y0, y1, PANEL if high else PANEL_LOW, CORNER if high else CORNER_LOW)
        if y0 not in (21.0, 168.0):
            _shell(key, ax, az, y0 - 0.25, y0 + 0.25, strips=1, grow=0.07, col=(0.012, 0.011, 0.014, 1))
        if y0 == 150.0:
            continue
        # (The shoulders stand against the faces' middles up to 108: what
        # is etched or lit there stays out of them. On the head the emblem
        # takes the middle; there the lines keep to the edges.)
        lo = 0.56 if y1 <= 75.0 else (0.44 if y1 <= HERO_FROM else 0.22)
        for name, nx, nz in FACES:
            hero_face = name in ("s", "w")
            if y0 == 191.0:
                _etch(key, ax, az, nx, nz, y0, y1, r, ETCH, [(-0.98, -0.74), (0.74, 0.98)])
                continue
            zones = _zones(r, 1 if (high or y1 - y0 < 26.0) else 2, lo)
            _etch(key, ax, az, nx, nz, y0, y1, r, ETCH if high else ETCH_LOW, zones)
            _windows(key if (hero_face or not high) else CB, ax, az, nx, nz, y0, y1, zones, r,
                     busy=0.42 if high else 0.6, k=0.85 if high else 1.0)
    for y in (150.0, 168.0):
        walls((FA, "neon_red", 0), cut_rect(ax, az, 22.1, 22.1, 4.0), y - 0.2, y + 0.2, (1, 1, 1, 1))
    # The spine up the middle of each face: a pale band standing proud of
    # it from the podium to the head, a channel of red light down its
    # middle, broken behind the name (which it carries); the emblem built
    # into each face of the head.
    for name, nx, nz in FACES:
        key = FA if name in ("s", "w") else CB
        for y0, y1 in ((21.0, HERO_FROM), (HERO_FROM, 148.5), (148.5, 170.0), (170.0, 212.0)):
            if name == "s" and y0 == 148.5:
                continue
            k_ = key if y0 >= HERO_FROM else CB
            _spine(k_, ax, az, nx, nz, y0, y1, SPINE_HIGH if y0 >= HERO_FROM else SPINE)
            _line(k_, "neon_red", ax, az, nx, nz, -0.22, 0.22, max(y0, 23.0), min(y1, 197.0), out=0.98)
        # (High on the head, over the top of the hero's frame on a desk and
        # on a phone: a ring cut by the frame's edge would be a red arc in
        # its band of sky.) A dark disc set into a pale rim on the spine,
        # the ring round three bars of light, the middle one tall.
        yc = 204.7
        _disc((key, "trim", 0), ax, az, nx, nz, yc, 0.0, 7.6, 1.0, GROOVE)
        _disc((key, "glow", 0), ax, az, nx, nz, yc, 7.0, 7.9, 1.02, SPINE_HIGH)
        _disc((key, "neon_red", 0), ax, az, nx, nz, yc, 5.2, 6.2, 1.04, (1, 1, 1, 1))
        for u, hh in ((-2.1, 2.2), (0.0, 3.8), (2.1, 2.2)):
            _line(key, "neon_red", ax, az, nx, nz, u - 0.38, u + 0.38, yc - hh, yc + hh, out=1.04)
    # The shoulders on the podium's roof: a buttress in two steps against
    # each face, a line of red under each step.
    rs = random.Random(4760)
    for name, nx, nz in FACES:
        # (Three steps, the highest just under where the hero's lens begins
        # to see the tower: its shoulders, ax5YUmkWf_Y@39.)
        for half, out, top in ((11.0, 4.6, 62.0), (8.0, 3.0, 88.0), (5.0, 1.6, 108.0)):
            d0, d1 = _plan(top)[0] - 0.6, 27.0 + out
            xs = sorted((ax + nx * d0 - nz * half, ax + nx * d1 + nz * half))
            zs = sorted((az + nz * d0 - nx * half, az + nz * d1 + nx * half))
            box((CB, "glow", 0), xs[0], xs[1], 21.0, top, zs[0], zs[1], scale=2.0, col=SHOULDER)
            f = B.Face({"s": "+z", "e": "+x", "n": "-z", "w": "-x"}[name], az + nz * d1 if nx == 0 else ax + nx * d1,
                       (ax if nx == 0 else az) - half, (ax if nx == 0 else az) + half)
            f.quad((CB, "neon_red", 0), 0.3, f.width - 0.3, top - 0.7, top - 0.5, 0.03)
            f.quad((CB, "trim", 0), f.width / 2 - 0.7, f.width / 2 + 0.7, 21.0, top - 1.2, 0.03, col=GROOVE)
            # (Its face is the tower's own skin: etched lines down it, and
            # either side of the groove narrow windows, lit storey by
            # storey in runs; on the west the emblem over the forecourt.)
            crest = name == "w" and half == 11.0
            for o in (half - 0.9, -(half - 0.9), 1.5, -1.5):
                f.quad((CB, "glow", 0), f.width / 2 + o - 0.17, f.width / 2 + o + 0.17, 21.6, top - 1.2, 0.04, col=ETCH_LOW)
            y = 22.6
            while y + 2.4 < top - 1.4:
                used = rs.random() < 0.62
                run = False
                o = 2.4
                while o < half - 1.6:
                    for sg in (-1, 1):
                        lit = used and rs.random() < (0.75 if run else 0.45)
                        run = lit
                        if not lit or (crest and o < 7.2 and 30.0 < y + 1.0 < 46.0):
                            continue
                        c = WIN_WARM if rs.random() < 0.35 else WIN_COOL
                        m = rs.uniform(0.6, 1.0)
                        f.quad((CB, "glow", 0), f.width / 2 + sg * o - 0.3, f.width / 2 + sg * o + 0.3, y, y + 2.1, 0.05,
                               col=(c[0] * m, c[1] * m, c[2] * m, 1))
                    o += 1.5
                y += 3.4
            if crest:
                H = d1 + 0.04
                _vdisc((CB, "trim", 0), ax, az, nx, nz, H, 38.0, 0.0, 6.0, GROOVE)
                _vdisc((CB, "glow", 0), ax, az, nx, nz, H + 0.02, 38.0, 5.6, 6.3, SPINE)
                _vdisc((CB, "neon_red", 0), ax, az, nx, nz, H + 0.04, 38.0, 4.0, 4.8, (1, 1, 1, 1))
                for u, hh in ((-1.65, 1.7), (0.0, 2.9), (1.65, 1.7)):
                    quad((CB, "neon_red", 0), *[_flat(ax, az, nx, nz, H + 0.04, uu, yy) for uu, yy in
                                                 ((u - 0.3, 38.0 - hh), (u + 0.3, 38.0 - hh), (u + 0.3, 38.0 + hh), (u - 0.3, 38.0 + hh))])
                light(CB, ax + nx * (H + 3.0), 31.0, az + nz * (H + 3.0), "red", 10.0)
    # The crown, over the top of the hero's and the Work shot's frames (the
    # rooftop shot has it far off): two fins at each face's edges rise from
    # the head past its roof, a red lamp on each, round the cap; the cap's
    # upper step a lantern of pale light between dark bands.
    for name, nx, nz in FACES:
        for sg in (-1, 1):
            u = sg * 9.6
            pa = (ax + nx * 13.6 + nz * (u - 0.45), az + nz * 13.6 - nx * (u - 0.45))
            pb = (ax + nx * 17.6 + nz * (u + 0.45), az + nz * 17.6 - nx * (u + 0.45))
            x0, x1 = sorted((pa[0], pb[0]))
            z0, z1 = sorted((pa[1], pb[1]))
            box((FA, "glow", 0), x0, x1, 196.0, 233.0, z0, z1, scale=2.0, col=SPINE_HIGH)
            ex, ez = ax + nx * 17.63 + nz * u, az + nz * 17.63 - nx * u
            ox, oz = nz * 0.1, -nx * 0.1
            quad((FA, "neon_red", 0), (ex - ox, 199.0, ez - oz), (ex + ox, 199.0, ez + oz), (ex + ox, 232.0, ez + oz), (ex - ox, 232.0, ez - oz))
            quad((FA, "neon_red", 0), (ex + ox, 199.0, ez + oz), (ex - ox, 199.0, ez - oz), (ex - ox, 232.0, ez - oz), (ex + ox, 232.0, ez + oz))
            box((FA, "neon_red", 0), (x0 + x1) / 2 - 0.3, (x0 + x1) / 2 + 0.3, 233.0, 233.6, (z0 + z1) / 2 - 0.3, (z0 + z1) / 2 + 0.3, scale=1.0)
    hb, cb = _plan(196.5)
    walls((FA, "glow", 0), cut_rect(ax, az, hb + 0.06, hb + 0.06, cb), 196.3, 196.7, C.dim("white", 0.5))
    for y0, y1, h in ((214.0, 219.0, 12.5), (219.0, 226.0, 9.0)):
        o = cut_rect(ax, az, h, h, 2.5)
        if y0 == 219.0:
            walls((FA, "glow", 0), o, y0, y0 + 1.2, CORNER)
            walls((FA, "glow", 0), o, y0 + 1.2, y1 - 1.0, (0.3, 0.32, 0.36, 1))
            walls((FA, "glow", 0), o, y1 - 1.0, y1, CORNER)
        else:
            walls((FA, "glow", 0), o, y0, y1, PANEL)
        poly((FA, "roof", 0), [(x, y1, z) for x, z in o], [(x / 4, z / 4) for x, z in o])
        walls((FA, "neon_red", 0), cut_rect(ax, az, h + 0.08, h + 0.08, 2.5), y1 - 0.5, y1 - 0.2, (1, 1, 1, 1))
    o = cut_rect(ax, az, *_plan(214.0))
    poly((FA, "roof", 0), [(x, 214.0, z) for x, z in o], [(x / 4, z / 4) for x, z in o])
    cylinder((FA, "metal", 0), ax, az, 226.0, 250.0, 0.8, segs=8)
    cylinder((FA, "neon_red", 0), ax, az, 250.0, 252.0, 1.1, segs=8)
    sign("arasaka", ax, 159.0, az + 22.6, 44.0, 15.0, 0.0, preview="ARASAKA", district=FA)
