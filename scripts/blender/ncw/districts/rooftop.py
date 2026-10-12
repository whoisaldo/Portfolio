from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw import props as _props

# ---------------------------------------------------------------------------
# THE ROOFTOP. About and Stack share it: a mid-height roof at the east end of
# corpo row, looking back west over the city. Water tanks, AC units,
# antennas, and nearby the AFTERLIFE and RIPPERDOC signs.
# ---------------------------------------------------------------------------
RF = "rooftop"
STREET_X = 440.0
RX0, RX1, RZ0, RZ1, RH = 452.0, 484.0, -300.0, -258.0, 34.0
# Painted flats on every side, as AFTERLIFE's block is across the street.
# (The shops and the clinic under its street face, and what hangs on it, are
# built with the street: districts/afterlife.py.)
mass(RF, RX0, RX1, RZ0, RZ1, SHOP_H, RH, 7001, roof_mat="roof_wet", painted=2)
box((RF, "dark", 0), RX0 + 1.0, RX1, 0, SHOP_H, RZ0, RZ1, scale=2.0)
for (a0, a1, b0, b1) in ((RX0, RX1, RZ1 - 0.4, RZ1), (RX0, RX1, RZ0, RZ0 + 0.4), (RX0, RX0 + 0.4, RZ0, RZ1), (RX1 - 0.4, RX1, RZ0, RZ1)):
    box((RF, "concrete", 0), a0, a1, RH, RH + 1.1, b0, b1, scale=1.5)
for (cx, cz) in ((476.0, -270.0), (477.5, -285.0)):
    for lx, lz in ((-1.4, -1.4), (1.4, -1.4), (1.4, 1.4), (-1.4, 1.4)):
        box((RF, "metal", 1), cx + lx - 0.1, cx + lx + 0.1, RH, RH + 3.0, cz + lz - 0.1, cz + lz + 0.1, scale=0.5)
    cylinder((RF, "tankplate", 0), cx, cz, RH + 3.0, RH + 7.2, 2.1, segs=20, col=(0.17, 0.2, 0.2, 1.0))
    # A lamp in a cage under it, and its pool on the roof: the tank by the
    # lens was a black wall to anyone who turned round.
    box((RF, "neon_amber", 0), cx - 0.1, cx + 0.1, RH + 2.82, RH + 2.92, cz - 0.1, cz + 0.1, scale=1.0)
    light(RF, cx, RH + 2.6, cz, "amber", 1.8)
    # A ladder up its east side, clear of both lenses' frames.
    for dz in (-0.22, 0.22):
        box((RF, "metal", 1), cx + 2.14, cx + 2.2, RH + 0.2, RH + 7.5, cz + dz - 0.03, cz + dz + 0.03, scale=0.5)
    for k in range(18):
        box((RF, "metal", 1), cx + 2.14, cx + 2.2, RH + 0.5 + k * 0.4, RH + 0.54 + k * 0.4, cz - 0.22, cz + 0.22, scale=0.5)
    cylinder((RF, "dark", 1), cx, cz, RH + 7.2, RH + 7.6, 2.2, segs=20)
    # Its hoops.
    for hy in (RH + 4.2, RH + 6.1):
        cylinder((RF, "dark", 1), cx, cz, hy, hy + 0.12, 2.16, segs=20, cap=False)
# Behind both lenses (they look west): the east parapet's lamps and their
# pools, units, a mast, so the roof's east side is not a black floor.
for lz, hue in ((-262.5, "amber"), (-277.0, "white"), (-291.0, "amber")):
    box((RF, "metal", 1), RX1 - 0.52, RX1 - 0.4, RH + 1.1, RH + 1.5, lz - 0.05, lz + 0.05, scale=0.5)
    box((RF, "neon_" + hue, 0), RX1 - 0.62, RX1 - 0.52, RH + 1.38, RH + 1.46, lz - 0.14, lz + 0.14, scale=1.0)
    light(RF, RX1 - 1.6, RH + 0.5, lz, hue, 1.6)
for name, px, pz, yaw in (("ac_roof", 480.6, -272.5, 0.0), ("ac_roof", 480.8, -281.0, math.pi / 2), ("antenna", 482.6, -297.0, 0.0)):
    _props.place(name, px, RH, pz, yaw, district="afterlife")
r = random.Random(7100)
for k in range(9):
    cx, cz = r.uniform(RX0 + 3, RX1 - 8), r.uniform(RZ0 + 3, RZ1 - 3)
    box((RF, "metal", 1), cx - 1.0, cx + 1.0, RH, RH + 1.2, cz - 0.8, cz + 0.8, scale=0.8)
    cylinder((RF, "dark", 1), cx, cz, RH + 1.2, RH + 1.25, 0.55, segs=12)
    # Louvres on the face the roof's cameras see, and on every other unit a
    # status lamp, green or amber, the one light down on the roof.
    for ly in (RH + 0.3, RH + 0.55, RH + 0.8):
        box((RF, "dark", 1), cx + 1.0, cx + 1.04, ly, ly + 0.07, cz - 0.62, cz + 0.62, scale=0.5)
    if k % 2 == 0:
        box((RF, "glow", 0), cx + 1.0, cx + 1.03, RH + 1.0, RH + 1.07, cz + 0.62, cz + 0.69, scale=0.5,
            col=GLOW["green" if k % 4 == 0 else "amber"])
for (cx, cz, h) in ((458.0, -296.0, 14.0), (482.0, -262.0, 9.0), (466.0, -262.0, 6.0)):
    cylinder((RF, "metal", 1), cx, cz, RH, RH + h, 0.09, segs=6)
    # A small red lamp in a bracket at the tip, not a lit drum: the one by
    # Stack's lens is ten metres off.
    box((RF, "metal", 1), cx - 0.1, cx + 0.1, RH + h, RH + h + 0.04, cz - 0.1, cz + 0.1, scale=0.5)
    cylinder((RF, "neon_red", 0), cx, cz, RH + h + 0.04, RH + h + 0.14, 0.05, segs=6)
# Two exhaust stacks between the camera and the signs, venting steam the
# site draws (anchor_steam_<n>) into the signs' light.
for i, (cx, cz, h) in enumerate(((466.0, -272.0, 1.6), (461.5, -268.5, 1.1))):
    cylinder((RF, "metal", 1), cx, cz, RH, RH + h, 0.28, segs=12)
    cylinder((RF, "dark", 1), cx, cz, RH + h, RH + h + 0.08, 0.34, segs=12)
    empty(f"anchor_steam_roof_{i}", (cx, RH + h + 0.1, cz))
# Rooftop signs are double-sided: they face the street, and the roof sees
# their other side.
RIPPER = (457.0, RH + 4.4, -283.0, math.radians(38))
rx_, ry_, rz_, ryaw = RIPPER
sign("ripperdoc", rx_, ry_, rz_, 9.0, 2.2, ryaw, double=True, preview="+ RIPPERDOC", district=RF)
for du in (-3.2, 3.2):
    oriented_box((RF, "metal", 1), rx_ + du * math.cos(ryaw), RH + 1.6, rz_ - du * math.sin(ryaw),
                 0.16, 3.2, 0.16, ryaw, scale=0.5)
# AFTERLIFE's block is flats over shops, the garage street's kind: its face
# to the street (and to the rooftop, which looks at it) painted, lived in,
# hung with signs, a fire escape down it, the shops lit under awnings.
mass(RF, 402.0, 432.0, -300.0, -262.0, SHOP_H, 30.0, 7201, painted=1)
# Its upper storeys stand out over the pavement to the kerb's line; the
# ground floor is set back under them behind the lot line (x 428), an
# arcade the street's walkers pass through, where the club's door is
# (districts/afterlife.py builds it).
# (Open behind the club's door, where afterlife.py builds the corridor in.)
for (x0_, x1_, y0_, y1_, z0_, z1_) in ((402.0, 425.6, 0, SHOP_H, -300.0, -282.18), (402.0, 425.6, 0, SHOP_H, -279.82, -262.0),
                                       (402.0, 421.0, 0, SHOP_H, -282.18, -279.82), (421.0, 425.6, 2.95, SHOP_H, -282.18, -279.82)):
    box((RF, "dark", 0), x0_, x1_, y0_, y1_, z0_, z1_, scale=2.0)
clutter(RF, -1, -300.0, -262.0, 30.0, 7220, xw=432.0)
ac_units(RF, -1, -300.0, -262.0, SHOP_H + 1, 26.0, 7221, xw=432.0)
# (Its fire escape is built with the street's, in open steel: districts/afterlife.py.)
# A hair proud of its frame's face, or the two fight for the same pixels.
sign("afterlife", 431.26, 38.0, -281.0, 13.0, 3.0, math.radians(90), preview="AFTERLIFE", district=RF)
box((RF, "board_frame", 0), 430.6, 431.2, 36.2, 39.8, -288.0, -274.0, scale=1.0)
for dz in (-5.0, 5.0):
    box((RF, "metal", 1), 430.7, 431.0, 30.0, 36.2, -281.0 + dz - 0.1, -281.0 + dz + 0.1, scale=0.5)
# MILITECH's block is an office, the way corpo row's are: ribbon windows
# (window style 2) mostly lit, cool.
# Stepped back once over a yellow band, its east face flush all the way up,
# and the name hung on the plant room that stands on its roof, where it
# floated over the parapet before.
mass(RF, 380.0, 410.0, -250.0, -222.0, SHOP_H, 46.0, 7301, col=(0.9, 2 / 8.0, 0.25, 1.0))
box((RF, "dark", 0), 380.0, 410.0, 0, SHOP_H, -250.0, -222.0, scale=2.0)
box((RF, "neon_yellow", 0), 379.8, 410.2, 45.25, 45.7, -250.2, -221.8, scale=1.0)
mass(RF, 383.0, 410.0, -247.0, -225.0, 46.0, 58.0, 7302, col=(0.92, 2 / 8.0, 0.25, 1.0))
dress_roof(RF, 380.0, 410.0, -250.0, -222.0, 46.0, 7303, cap=0.0)
box((RF, "metal", 0), 392.0, 410.0, 58.0, 64.0, -244.0, -228.0, scale=1.0)
box((RF, "dark", 1), 391.8, 410.2, 64.0, 64.3, -244.2, -227.8, scale=1.0)
for z_ in (-243.0, -229.0):
    box((RF, "glow", 0), 409.6, 410.0, 63.4, 63.8, z_ - 0.2, z_ + 0.2, scale=0.5, col=GLOW["red"])
box((RF, "board_frame", 0), 410.0, 410.3, 59.4, 62.6, -242.4, -229.6, scale=1.0)
sign("militech", 410.4, 61.0, -236.0, 12.0, 2.6, math.radians(90), preview="MILITECH", district=RF)
dress_roof(RF, 383.0, 391.6, -247.0, -225.0, 58.0, 7304, cap=3.0)
# The garage street is streets.py's.

# The roof, dressed: what About and Stack look over (About's camera sees a
# wedge of it from due west round to south-west, 11 to 27 m out). A stair
# hut with its door open and a lamp over it, big condensers with their fans,
# pipes run along the roof on sleepers, two dishes on the parapet, a rail
# along the edge the city is seen over, and a string of bulbs from the hut
# to a pole. Its lamps light the kit round them (lamp_*).
hx0, hx1, hz0, hz1, hh = 452.4, 457.4, -293.0, -287.5, 3.4
box((RF, "concrete", 0), hx0, hx1, RH, RH + hh, hz0, hz1, scale=1.5)
box((RF, "metal", 0), hx0 - 0.2, hx1 + 0.2, RH + hh, RH + hh + 0.18, hz0 - 0.2, hz1 + 0.2, scale=1.0)
# Its door faces the camera (east), open: a warm rectangle of stairwell.
quad((RF, "neon_amber", 0), (hx1 + 0.02, RH, -290.2), (hx1 + 0.02, RH, -291.5), (hx1 + 0.02, RH + 2.2, -291.5),
     (hx1 + 0.02, RH + 2.2, -290.2))
box((RF, "metal", 1), hx1 + 0.02, hx1 + 1.1, RH, RH + 2.2, -290.2, -290.12, scale=1.0)
box((RF, "neon_white", 1), hx1 + 0.05, hx1 + 0.3, RH + 2.55, RH + 2.75, -291.0, -290.7, scale=1.0)
site_lamp("roof_door", (hx1 + 0.9, RH + 2.6, -290.85), "#ffc27a", 11.0, 1.4)
# Condensers: big boxes with two fans each on top.
for (cx, cz, rot) in ((463.0, -276.5, 0), (457.5, -271.0, 0), (466.0, -281.5, 1)):
    w_, d_ = (2.2, 1.3) if not rot else (1.3, 2.2)
    box((RF, "metal", 0), cx - w_ / 2, cx + w_ / 2, RH, RH + 1.35, cz - d_ / 2, cz + d_ / 2, scale=1.0)
    for f in (-0.5, 0.5):
        fx, fz = (cx + f * w_ * 0.5, cz) if not rot else (cx, cz + f * d_ * 0.5)
        cylinder((RF, "dark", 1), fx, fz, RH + 1.35, RH + 1.42, 0.5, segs=12)
        cylinder((RF, "metal", 1), fx, fz, RH + 1.42, RH + 1.46, 0.08, segs=6)
# Pipes on sleepers along the roof, from the hut east, and up its wall.
for k, (pz, pr) in enumerate(((-289.0, 0.18), (-289.6, 0.12), (-290.1, 0.12))):
    pipe((RF, "metal", 1), (hx1, RH + 0.45 + k * 0.02, pz - 2.2), (481.0, RH + 0.45 + k * 0.02, pz - 2.2), pr, segs=8)
for sx in range(459, 482, 4):
    box((RF, "dark", 1), sx - 0.1, sx + 0.1, RH, RH + 0.35, -292.7, -290.8, scale=1.0)
pipe((RF, "metal", 1), (hx1 + 0.2, RH + 0.45, -291.2), (hx1 + 0.2, RH + 3.6, -291.2), 0.18, segs=8)
# Dishes on the parapet, turned to the south-west sky.
for (dx, dz, dr) in ((453.2, -271.0, 0.9), (453.4, -283.0, 0.65)):
    box((RF, "metal", 1), dx - 0.08, dx + 0.08, RH + 1.1, RH + 1.9, dz - 0.08, dz + 0.08, scale=0.5)
    dish((RF, "metal", 1), (dx, RH + 1.9 + dr * 0.6, dz), (-0.55, 0.6, -0.58), dr)
# A rail along the west parapet, the edge About looks over: posts and a
# top rail, dark against the city.
for pz in [RZ0 + 1.0 + k * 2.0 for k in range(21)]:
    box((RF, "metal", 1), RX0 + 0.12, RX0 + 0.2, RH + 1.1, RH + 2.1, pz - 0.04, pz + 0.04, scale=0.5)
pipe((RF, "metal", 1), (RX0 + 0.16, RH + 2.1, RZ0 + 0.6), (RX0 + 0.16, RH + 2.1, RZ1 - 0.6), 0.035, segs=6)
pipe((RF, "metal", 1), (RX0 + 0.16, RH + 1.6, RZ0 + 0.6), (RX0 + 0.16, RH + 1.6, RZ1 - 0.6), 0.025, segs=6)
# Bulbs on a wire from the hut's corner to a pole by the west parapet,
# sagging across the view.
cylinder((RF, "metal", 1), 460.0, -265.5, RH, RH + 4.4, 0.07, segs=6)
wa, wb = Vector((hx1, RH + hh + 0.1, hz1)), Vector((460.0, RH + 4.3, -265.5))
prev = None
for k in range(29):
    t_ = k / 28
    p_ = wa.lerp(wb, t_) - Vector((0, 1.3 * 4 * t_ * (1 - t_), 0))
    if prev is not None:
        pipe((RF, "dark", 1), tuple(prev), tuple(p_), 0.012, segs=3)
    if 0 < k < 28 and k % 2 == 0:
        box((RF, "neon_amber", 0), p_.x - 0.06, p_.x + 0.06, p_.y - 0.16, p_.y - 0.04, p_.z - 0.06, p_.z + 0.06, scale=1.0)
    prev = p_
site_lamp("roof_bulbs", tuple(wa.lerp(wb, 0.5) - Vector((0, 1.0, 0))), "#ffb45e", 10.0, 0.7)
# The signs' own light on the roof and what stands on it.
site_lamp("roof_ripperdoc", (RIPPER[0] + 1.0, RIPPER[1], RIPPER[2] + 1.0), "#f2f0ff", 16.0, 1.1)
site_lamp("roof_afterlife", (433.5, 38.0, -281.0), "#ff2e88", 22.0, 1.5)
# The roofs round it are not bare either: tanks, plant and a stair hut on
# the AFTERLIFE block, the one About sees past the edge.
for (cx, cz) in ((410.0, -268.0), (424.0, -294.0)):
    cylinder((RF, "metal", 1), cx, cz, 30.0, 33.6, 1.6, segs=14)
    cylinder((RF, "dark", 1), cx, cz, 33.6, 33.9, 1.7, segs=14)
box((RF, "concrete", 1), 404.0, 409.0, 30.0, 33.2, -298.0, -292.0, scale=1.5)
box((RF, "metal", 1), 414.0, 418.0, 30.0, 31.4, -282.0, -279.5, scale=1.0)
box((RF, "metal", 1), 416.0, 420.5, 30.0, 31.6, -272.0, -269.8, scale=1.0)
for (x0_, x1_, z0_, z1_) in ((402.0, 432.0, -262.6, -262.0), (402.0, 432.0, -300.0, -299.4), (402.0, 402.6, -300.0, -262.0)):
    box((RF, "concrete", 1), x0_, x1_, 30.0, 31.0, z0_, z1_, scale=1.5)
cylinder((RF, "metal", 1), 427.0, -296.0, 30.0, 41.0, 0.08, segs=6)
cylinder((RF, "neon_red", 0), 427.0, -296.0, 41.0, 41.3, 0.14, segs=8)
