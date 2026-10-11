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
    # Yellow lines of light in the paving, leading to the doors.
    for dz in (-7.0, 7.0):
        _up(21.0, px0 - 0.5, az + dz - 0.06, az + dz + 0.06, COURT_Y + 0.012, "yellow")
        for x in (24.0, 31.0, 38.0):
            light(CB, x, 1.0, az + dz, "yellow", 2.5)
    # Palms in planters in two rows, a bench by each, people on the benches.
    for row_z in (az - 10.5, az + 10.5):
        for x in (24.5, 31.5, 38.5):
            P.place("planter_palm", x, COURT_Y, row_z, district=CB)
        for x in (28.0, 35.0):
            P.place("bench", x, COURT_Y, row_z, 0.0, district=CB)
            if r.random() < 0.8:
                stand(x + r.uniform(-0.5, 0.5), row_z, 0.0 if row_z < az else math.pi, "sit", COURT_Y + 0.48)
    # Cube bollards along the kerb side of the apron, two kiosks, a queue.
    z = z_lo + 2.0
    while z < z_hi - 1.0:
        P.place("bollard_cube", WALK + 0.9, G0, z, district=CB)
        z += 2.4
    for kz in (z_lo + 9.0, z_hi - 9.0):
        P.place("cy_kiosk", 17.2, G0, kz, -math.pi / 2, district=CB)
        stand(16.0, kz, math.pi / 2, "idle", G0)
        stand(15.4, kz + 0.5, math.pi / 2, "phone", G0)
        light(CB, 16.2, 1.5, kz, "cyan", 4.0)
    # The hologram on its pole over the steps: a hexagon of cyan light and
    # the lines of a notice inside it, read from the street and from the doors.
    hxp, hyp, hzp, R = 22.6, 9.6, az, 2.7
    cylinder((CB, "metal", 0), hxp, hzp, COURT_Y, hyp - R, 0.12, segs=8)
    for rad, t in ((R, 0.2), (R * 0.62, 0.1)):
        pts = [(hyp + rad * math.sin(a), hzp + rad * math.cos(a)) for a in (i * math.pi / 3 for i in range(6))]
        inn = [(hyp + (rad - t) * math.sin(a), hzp + (rad - t) * math.cos(a)) for a in (i * math.pi / 3 for i in range(6))]
        for i in range(6):
            j = (i + 1) % 6
            q = ((hxp, pts[i][0], pts[i][1]), (hxp, pts[j][0], pts[j][1]), (hxp, inn[j][0], inn[j][1]), (hxp, inn[i][0], inn[i][1]))
            quad((CB, "neon_cyan", 0), *q)
            quad((CB, "neon_cyan", 0), q[1], q[0], q[3], q[2])
    for k, (w, dy) in enumerate(((1.6, 0.55), (2.2, 0.15), (1.9, -0.25), (1.2, -0.65))):
        for sgn in (-1, 1):
            q = ((hxp + 0.01 * sgn, hyp + dy, hzp - w / 2), (hxp + 0.01 * sgn, hyp + dy, hzp + w / 2),
                 (hxp + 0.01 * sgn, hyp + dy + 0.16, hzp + w / 2), (hxp + 0.01 * sgn, hyp + dy + 0.16, hzp - w / 2))
            quad((CB, "glow", 0), *(q if sgn > 0 else (q[1], q[0], q[3], q[2])), col=GLOW["white" if k == 1 else "cyan"])
    light(CB, hxp - 1.5, 3.0, hzp, "cyan", 6.0)
    # Three banners on poles along the apron, ARASAKA's red.
    for bz in (az - 14.0, az, az + 14.0):
        cylinder((CB, "metal", 1), 18.3, bz, G0, 9.0, 0.06, segs=6)
        for sgn in (-1, 1):
            q = ((18.3 + 0.07 * sgn, 4.2, bz + 0.1), (18.3 + 0.07 * sgn, 4.2, bz + 0.9), (18.3 + 0.07 * sgn, 8.8, bz + 0.9), (18.3 + 0.07 * sgn, 8.8, bz + 0.1))
            quad((CB, "neon_red", 0), *(q if sgn < 0 else (q[1], q[0], q[3], q[2])))
    # ---- the lobby -----------------------------------------------------------
    # The podium's west face: a wall of lit glass behind dark mullions, the
    # doors in a frame of white light under a canopy, a line of red over it
    # all, a tall screen either side.
    fw = B.Face("-x", px0, az - 27.0, az + 27.0)
    fw.quad((CB, "shop", 0), 2.0, fw.width - 2.0, COURT_Y + 0.25, SHOP_H - 0.9, 0.06, col=(0.95, 0.08, 1.0, 1.0))
    s = 2.0
    while s <= fw.width - 2.0:
        fw.box((CB, "board_frame", 0), s - 0.09, s + 0.09, COURT_Y, SHOP_H - 0.7, 0.0, 0.16)
        s += 3.125
    mid = fw.width / 2
    fw.box((CB, "board_frame", 0), mid - 2.6, mid + 2.6, COURT_Y, SHOP_H - 0.9, 0.0, 0.5)
    fw.quad((CB, "glow", 0), mid - 2.2, mid + 2.2, COURT_Y + 0.05, SHOP_H - 1.3, 0.51, col=GLOW["white"])
    fw.box((CB, "board_frame", 0), mid - 0.06, mid + 0.06, COURT_Y + 0.05, SHOP_H - 1.3, 0.5, 0.56)
    x0c, x1c = px0 - 3.2, px0
    box((CB, "board_frame", 0), x0c, x1c, SHOP_H - 0.9, SHOP_H - 0.65, az - 5.0, az + 5.0, scale=1.0, bottom=True)
    box((CB, "glow", 0), x0c + 0.4, x1c - 0.4, SHOP_H - 0.93, SHOP_H - 0.9, az - 4.2, az + 4.2, scale=1.0, col=GLOW["white"], bottom=True)
    fw.quad((CB, "neon_red", 0), 1.0, fw.width - 1.0, SHOP_H - 0.62, SHOP_H - 0.5, 0.2)
    light(CB, px0 - 2.0, 3.0, az, "white", 7.0)
    for dz in (-16.0, 16.0):
        B.billboard(CB, px0 - 0.45, COURT_Y + 5.6, az + dz, 2.8, 8.4, -math.pi / 2, r, frame=True, back=False, depth=0.3)
    # Two guards at the doors, people crossing the court in twos.
    for dz in (-3.2, 3.2):
        stand(px0 - 1.4, az + dz, -math.pi / 2, "idle", COURT_Y)
    for gx, gz in ((27.0, az - 3.0), (34.0, az + 4.0), (33.0, az - 13.5)):
        stand(gx, gz, 0.0, "talk", COURT_Y if cz0 < gz < cz1 else G0)
        stand(gx, gz + 1.0, math.pi, "talk", COURT_Y if cz0 < gz + 1.0 < cz1 else G0)
    stand(21.2, az + 4.0, -math.pi / 2, "phone", COURT_Y)
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
