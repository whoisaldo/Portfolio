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
# (Nine units stood about the roof here, each a box under a round lid: the
# kit's roof plant stands in their places now, at the end of this file.)
# (Two more stand as the kit's lattice masts, at the end.)
for (cx, cz, h) in ((458.0, -296.0, 14.0),):
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
# (Its condensers are the kit's, with the rest of its plant, at the end.)
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

# ---------------------------------------------------------------------------
# The roof worked (the m6 review: "a black deck with plain untextured
# boxes", "a plain tan box" of a stair hut, "a flat grey slab" of the tank
# at About's right edge, "one flat navy parapet slab" along the bottom of
# Stack): felt seams and laps over the wet deck, a coping round every
# parapet with a dim line of light under it where neither lens looks along
# it, joints, scuppers, stains and a conduit along the south parapet's
# inner face; the units with fan blades, panel seams, skids and pipes; the
# tanks in staves with rivets, a gauge and rust; the hut with a door frame,
# a hood and lamp, a plate, a louvre and conduit. Nothing stands higher
# than what was there: neither lens's sky changes.
# ---------------------------------------------------------------------------
_rw = random.Random(7400)
SEAM = (0.003, 0.0035, 0.004, 1.0)   # (darker than the wet deck takes light: a seam lighter than it brightened Stack's foot)
# (The felt's seams are laid with the rest of the deck, at the end.)
# The parapets' coping, and a dim line under its inner edge along the south
# side, the east, and the north east of the hut (west of it About looks along it).
COPE = (0.06, 0.065, 0.075, 1.0)
for (a0, a1, b0, b1) in ((RX0 - 0.05, RX1 + 0.05, RZ1 - 0.46, RZ1 + 0.05), (RX0 - 0.05, RX1 + 0.05, RZ0 - 0.05, RZ0 + 0.46),
                         (RX0 - 0.05, RX0 + 0.46, RZ0, RZ1), (RX1 - 0.46, RX1 + 0.05, RZ0, RZ1)):
    box((RF, "trim", 1), a0, a1, RH + 1.1, RH + 1.17, b0, b1, scale=1.0, col=COPE)
_line = tuple(c * 0.09 for c in GLOW["cyan"][:3]) + (1.0,)
box((RF, "glow", 1), RX0 + 0.5, RX1 - 0.5, RH + 1.04, RH + 1.09, RZ1 - 0.47, RZ1 - 0.45, scale=1.0, col=_line)
box((RF, "glow", 1), RX1 - 0.47, RX1 - 0.45, RH + 1.04, RH + 1.09, RZ0 + 0.5, RZ1 - 0.5, scale=1.0, col=_line)
box((RF, "glow", 1), 466.0, RX1 - 0.5, RH + 1.04, RH + 1.09, RZ0 + 0.45, RZ0 + 0.47, scale=1.0, col=_line)
# The south parapet's inner face, which fills the bottom of Stack's frame.
ZI = RZ1 - 0.4
for k in range(11):
    jx = RX0 + 1.4 + k * 2.95
    quad((RF, "trim", 1), (jx + 0.025, RH, ZI - 0.004), (jx - 0.025, RH, ZI - 0.004), (jx - 0.025, RH + 1.1, ZI - 0.004), (jx + 0.025, RH + 1.1, ZI - 0.004),
         col=SEAM)
for k in range(5):
    sx = RX0 + 3.0 + k * 6.1
    box((RF, "dark", 1), sx - 0.18, sx + 0.18, RH, RH + 0.22, ZI - 0.12, ZI, scale=1.0)
    w_ = _rw.uniform(0.25, 0.5)
    quad((RF, "trim", 1), (sx + w_, RH + 0.22, ZI - 0.005), (sx - w_, RH + 0.22, ZI - 0.005), (sx - w_ * 0.6, RH + 1.0, ZI - 0.005),
         (sx + w_ * 0.6, RH + 1.0, ZI - 0.005), col=(0.035, 0.03, 0.026, 1.0))
pipe((RF, "metal", 1), (RX0 + 0.8, RH + 0.72, ZI - 0.06), (RX1 - 0.8, RH + 0.72, ZI - 0.06), 0.03, segs=4)
for k in range(9):
    bx = RX0 + 1.6 + k * 3.6
    box((RF, "metal", 1), bx - 0.03, bx + 0.03, RH + 0.62, RH + 0.8, ZI - 0.09, ZI, scale=1.0)
for bx in (458.7, 469.5, 478.3):
    box((RF, "metal", 1), bx - 0.18, bx + 0.18, RH + 0.5, RH + 0.92, ZI - 0.14, ZI, scale=1.0)
    box((RF, "glow", 1), bx + 0.08, bx + 0.13, RH + 0.82, RH + 0.87, ZI - 0.145, ZI - 0.14, scale=0.5, col=GLOW["green"])
# The tanks: staves of plate with rows of rivets, a level gauge with its
# lamp, an overflow down to the deck, rust run from the hoops.
for (cx, cz) in ((476.0, -270.0), (477.5, -285.0)):
    for k in range(20):
        a = k * math.tau / 20 + 0.08
        ca, sa = math.cos(a), math.sin(a)
        pipe((RF, "dark", 1), (cx + ca * 2.11, RH + 3.05, cz + sa * 2.11), (cx + ca * 2.11, RH + 7.15, cz + sa * 2.11), 0.012, segs=3)
        for yy in (RH + 3.4, RH + 5.15, RH + 6.9):
            box((RF, "metal", 1), cx + ca * 2.11 - 0.02, cx + ca * 2.11 + 0.02, yy - 0.02, yy + 0.02, cz + sa * 2.11 - 0.02, cz + sa * 2.11 + 0.02, scale=1.0)
        if k % 3 == 1:
            q_ = [(cx + ca * 2.115 - sa * 0.12, RH + 3.3, cz + sa * 2.115 + ca * 0.12), (cx + ca * 2.115 + sa * 0.12, RH + 3.3, cz + sa * 2.115 - ca * 0.12),
                  (cx + ca * 2.115 + sa * 0.06, RH + 4.2, cz + sa * 2.115 - ca * 0.06), (cx + ca * 2.115 - sa * 0.06, RH + 4.2, cz + sa * 2.115 + ca * 0.06)]
            quad((RF, "trim", 1), *q_, col=(0.12, 0.05, 0.02, 1.0))
            quad((RF, "trim", 1), *q_[::-1], col=(0.12, 0.05, 0.02, 1.0))
    gx, gz = cx - 2.2, cz + 0.3
    pipe((RF, "metal", 1), (gx, RH + 3.2, gz), (gx, RH + 7.0, gz), 0.03, segs=4)
    box((RF, "glow", 1), gx - 0.03, gx + 0.03, RH + 5.6, RH + 5.75, gz - 0.03, gz + 0.03, scale=0.5, col=GLOW["amber"])
    pipe((RF, "metal", 1), (cx + 0.3, RH + 7.25, cz + 2.0), (cx + 0.3, RH + 0.1, cz + 2.25), 0.04, segs=4)
# The stair hut: a steel frame round its door and a hood over it with its
# lamp, a number plate, a mat, conduit up its north face to a louvre, stains.
box((RF, "metal", 1), hx1 + 0.02, hx1 + 0.14, RH, RH + 2.35, -291.62, -291.5, scale=1.0)
box((RF, "metal", 1), hx1 + 0.02, hx1 + 0.14, RH, RH + 2.35, -290.2, -290.08, scale=1.0)
box((RF, "metal", 1), hx1 + 0.02, hx1 + 0.14, RH + 2.2, RH + 2.35, -291.62, -290.08, scale=1.0)
box((RF, "metal", 1), hx1, hx1 + 0.55, RH + 2.85, RH + 2.93, -291.8, -289.9, scale=1.0)
box((RF, "dark", 1), hx1 + 0.03, hx1 + 0.06, RH + 1.4, RH + 1.62, -292.2, -291.85, scale=1.0)
quad((RF, "trim", 1), (hx1 + 0.1, RH + 0.008, -290.2), (hx1 + 1.1, RH + 0.008, -290.2), (hx1 + 1.1, RH + 0.008, -291.5), (hx1 + 0.1, RH + 0.008, -291.5),
     col=(0.04, 0.045, 0.04, 1.0))
for k in range(3):
    pipe((RF, "metal", 1), (hx0 + 0.6 + k * 0.12, RH, hz1 + 0.06), (hx0 + 0.6 + k * 0.12, RH + 2.6, hz1 + 0.06), 0.022, segs=3)
box((RF, "metal", 1), hx0 + 1.4, hx0 + 2.6, RH + 1.9, RH + 2.6, hz1, hz1 + 0.08, scale=1.0)
for k in range(4):
    box((RF, "dark", 1), hx0 + 1.45, hx0 + 2.55, RH + 1.96 + k * 0.16, RH + 2.02 + k * 0.16, hz1 + 0.08, hz1 + 0.1, scale=1.0)
for sx, w_ in ((hx0 + 3.4, 0.35), (hx0 + 4.3, 0.22)):
    quad((RF, "trim", 1), (sx - w_, RH + 0.1, hz1 + 0.005), (sx + w_, RH + 0.1, hz1 + 0.005), (sx + w_ * 0.5, RH + hh - 0.1, hz1 + 0.005),
         (sx - w_ * 0.5, RH + hh - 0.1, hz1 + 0.005), col=(0.05, 0.045, 0.04, 1.0))
box((RF, "dark", 1), hx0, hx1, RH, RH + 0.3, hz0 - 0.02, hz1 + 0.02, scale=1.0)

# ---------------------------------------------------------------------------
# The deck and its plant (the m8 review: "a near-black plane with grid lines
# and untextured black boxes with round lids"). The felt in rolls laid east
# to west, each seam broken where a roll was patched or gravel lies over it,
# never a grid; gravel ballast along the parapets' feet and round the hut,
# mottled; concrete pads laid as walkways from the hut's door to the plant;
# drains, oil and rust under the plant; and the kit's roof plant where the
# boxes stood: condensers backed by ducts, turbine vents, cable trays from
# the hut, lattice masts. The wet deck between them is the site's
# (src/world/wet.js): its standing water holds the signs.
# ---------------------------------------------------------------------------
from ncw.districts import afterlife_kit as _K  # noqa: E402

_rd = random.Random(7500)


def _flat(key, x0, x1, z0, z1, y, col):
    """A flat rectangle on the deck, facing up."""
    quad(key, (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0), col=col)


# Its rolls: a seam a metre or so apart down the roof, in broken pieces.
# (In glow, a shade under what the dark deck shows: drawn in trim, a flat
# strip on the roof takes the lit sky at a glance whatever its paint, and the
# seams drew as a grid of pale lines.)
TAR_SEAM = (0.0035, 0.0038, 0.0048, 1.0)
z_ = RZ1 - 1.0
while z_ > RZ0 + 1.0:
    x_ = RX0 + 0.9 + _rd.uniform(0.0, 3.0)
    while x_ < 473.6:
        x1_ = min(x_ + _rd.uniform(2.5, 9.0), 473.6)
        _flat((RF, "glow", 1), x_, x1_, z_ - 0.018, z_ + 0.018, RH + 0.012, TAR_SEAM)
        x_ = x1_ + _rd.uniform(0.8, 6.0)
    z_ -= _rd.uniform(0.92, 1.12)
# Gravel along the parapets' feet and round the hut: a strip whose inner
# edge wanders, each stretch a shade of its own.
GRAVEL = ((0.05, 0.048, 0.045), (0.075, 0.071, 0.066), (0.04, 0.04, 0.042), (0.062, 0.056, 0.05))


def _gravel(a, b, inward, width, seed):
    """Ballast from a to b (x, z) along a wall, `inward` the unit (x, z)
    toward the roof's middle."""
    rg = random.Random(seed)
    (xa, za), (xb, zb) = a, b
    n = max(1, int(math.hypot(xb - xa, zb - za) / 0.5))
    ix, iz = inward
    prev = None
    for m in range(n + 1):
        t = m / n
        px, pz = xa + (xb - xa) * t, za + (zb - za) * t
        w = width * rg.uniform(0.55, 1.25)
        c = rg.choice(GRAVEL) + (1.0,)
        cur = ((px, RH + 0.02, pz), (px + ix * w, RH + 0.02, pz + iz * w), c, tuple(k * 0.55 for k in c[:3]) + (1.0,))
        if prev is not None:
            pts = [prev[0], cur[0], cur[1], prev[1]]
            cols = [prev[2], cur[2], cur[3], prev[3]]
            # Wound to face up whichever way the strip runs.
            ex, ez = cur[0][0] - prev[0][0], cur[0][2] - prev[0][2]
            if ex * iz - ez * ix < 0:
                pts, cols = pts[::-1], cols[::-1]
            _K.vpoly((RF, "trim", 1), pts, cols)
        prev = cur


_gravel((RX0 + 0.4, RZ0 + 0.4), (RX0 + 0.4, RZ1 - 0.4), (1.0, 0.0), 0.75, 7501)
_gravel((RX0 + 0.4, RZ0 + 0.4), (457.8, RZ0 + 0.4), (0.0, 1.0), 0.75, 7502)
_gravel((RX0 + 0.4, RZ1 - 0.4), (474.2, RZ1 - 0.4), (0.0, -1.0), 0.6, 7503)
_gravel((hx1, hz0 - 0.02), (hx1, hz0 + 2.6), (1.0, 0.0), 0.5, 7504)
_gravel((hx0, hz1 + 0.02), (hx1, hz1 + 0.02), (0.0, 1.0), 0.6, 7505)
# Walkways of concrete pads: from the hut's door east to the pavers, and
# north from it along the plant to the bulbs' pole.
PAD = [(0.13, 0.13, 0.135, 1.0), (0.11, 0.112, 0.118, 1.0), (0.15, 0.148, 0.145, 1.0)]
for k in range(23):
    px_ = 458.3 + k * 0.7
    _flat((RF, "trim", 1), px_ - 0.3, px_ + 0.3, -290.25, -289.65, RH + 0.035, _rd.choice(PAD))
for k in range(32):
    pz_ = -289.0 + k * 0.7
    if pz_ > -267.2:
        break
    _flat((RF, "trim", 1), 460.3, 460.9, pz_ - 0.3, pz_ + 0.3, RH + 0.035, _rd.choice(PAD))
# Drains, each in a ring of gravel; oil and rust run out from under the plant.
for (dx, dz) in ((458.6, -279.4), (468.4, -287.2), (470.2, -265.6)):
    cylinder((RF, "trim", 1), dx, dz, RH, RH + 0.03, 0.55, segs=10, col=GRAVEL[1] + (1.0,))
    cylinder((RF, "dark", 1), dx, dz, RH, RH + 0.05, 0.22, segs=10)
    for k in range(4):
        box((RF, "metal", 1), dx - 0.2, dx + 0.2, RH + 0.05, RH + 0.065, dz - 0.16 + k * 0.1 - 0.015, dz - 0.16 + k * 0.1 + 0.015, scale=0.5)
for (sx, sz, w_, d_, c_) in ((463.4, -275.6, 1.6, 0.9, (0.035, 0.02, 0.012)), (457.2, -270.1, 1.2, 0.7, (0.01, 0.01, 0.012)),
                             (467.1, -281.0, 0.8, 1.7, (0.035, 0.02, 0.012)), (463.6, -265.0, 1.4, 0.8, (0.01, 0.01, 0.012)),
                             (476.0, -267.6, 1.1, 0.5, (0.05, 0.022, 0.01))):
    _flat((RF, "glow", 1), sx - w_ / 2, sx + w_ / 2, sz - d_ / 2, sz + d_ / 2, RH + 0.016, tuple(k * 0.12 for k in c_) + (1.0,))
# The plant, the kit's (agents/props/CATALOGUE.md, roof plant): condensers
# with their backs to ducts where the boxes stood, vents, trays, masts.
for (cx, cz, yaw) in ((463.0, -276.5, 0.0), (457.6, -271.0, 0.0), (463.0, -265.9, 0.0)):
    _props.place("roof_condenser", cx, RH, cz, yaw, district="afterlife")
    _props.place("roof_duct", cx, RH, cz - 1.05, 0.0, district="afterlife")
_props.place("roof_condenser", 466.0, RH, -281.5, math.pi / 2, district="afterlife")
_props.place("roof_duct", 464.95, RH, -281.5, math.pi / 2, district="afterlife")
for (vx, vz) in ((461.4, -262.7), (462.6, -261.4), (473.9, -264.2), (469.0, -268.6), (459.2, -283.6), (470.6, -293.6), (466.2, -293.2),
                 (455.6, -276.4)):
    _props.place("roof_vent", vx, RH, vz, _rd.uniform(0, 6.28), district="afterlife")
for (tx, tz, yaw) in ((459.4, -288.6, 0.0), (462.4, -288.6, 0.0), (464.2, -286.6, math.pi / 2), (464.2, -283.6, math.pi / 2)):
    _props.place("roof_tray", tx, RH, tz, yaw, district="afterlife")
_props.place("roof_dish", 471.0, RH, -294.6, 2.7, district="afterlife")
for (mx, mz, h) in ((473.6, -259.2, 6.0), (482.0, -262.0, 9.0)):
    _props.place("roof_mast", mx, RH, mz, 0.6, sy=h / 8.2, district="afterlife")
# Work lamps throwing pools (afterlife_kit.pool: painted over the deck by
# roof_light in afterlife.py, only where neither lens looks: inside about
# nine metres of the lens, under both frames' feet, and east of it); the
# one by the lens a flood low on a stand, under About's frame.
from ncw.districts import afterlife_roofs as _R  # noqa: E402
for (lx, lz, hue, h, pw) in ((471.8, -270.0, "white", 0.5, 7.0), (470.8, -265.0, "amber", 0.5, 4.0), (476.4, -259.4, "cyan", 2.0, 4.5), (478.6, -262.2, "amber", 2.2, 5.0),
                             (475.6, -296.4, "white", 2.2, 5.0), (466.8, -299.0, "amber", 1.6, 4.0)):
    _R.lamp(RF, lx, lz, RH + 0.06, hue, h=h, power=pw)
# Its people (none where either lens looks): one smoking by the north-east
# plant, one on a phone at the north parapet, looking out at the boulevard.
stand(477.0, -291.8, 0.4, "smoke", y=RH + 0.06)
stand(467.2, -294.6, -2.6, "phone", y=RH + 0.06)
