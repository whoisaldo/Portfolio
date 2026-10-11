from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw.districts.rooftop import STREET_X

# ---------------------------------------------------------------------------
# THE GARAGE. A workshop on the street below the rooftop with a roll-up door
# (garage_door, which the site rolls up as the car comes): magenta fixtures
# on one wall, cyan on the other, as in the garage room. The car pulls in
# forward and stops on anchor_garage_bay facing +x, and the flight ends on
# GarageModel's front preset in the car's own space: in front of the car,
# looking back at it and out of the door.
# ---------------------------------------------------------------------------
GA = "garage"
GX0, GX1, GZ0, GZ1, GH = 452.0, 476.0, -230.0, -200.0, 8.0
DOOR_Z0, DOOR_Z1, DOOR_H = -218.0, -212.0, 4.6
BAY = (462.0, 0.0, -215.0)
box((GA, "garage_wall", 0), GX0, GX0 + 0.5, 0, GH, GZ0, DOOR_Z0, scale=2.0)
box((GA, "garage_wall", 0), GX0, GX0 + 0.5, 0, GH, DOOR_Z1, GZ1, scale=2.0)
box((GA, "garage_wall", 0), GX0, GX0 + 0.5, DOOR_H, GH, DOOR_Z0, DOOR_Z1, scale=2.0)
box((GA, "garage_wall", 0), GX1 - 0.5, GX1, 0, GH, GZ0, GZ1, scale=2.0)
box((GA, "garage_wall", 0), GX0, GX1, 0, GH, GZ0, GZ0 + 0.5, scale=2.0)
box((GA, "garage_wall", 0), GX0, GX1, 0, GH, GZ1 - 0.5, GZ1, scale=2.0)
# The viewer's walls on these, a centimetre proud, at the viewer room's own
# scale set to this room's height (its 5.8 m to 8): the wall behind the car
# round the door (the viewer's front preset looks back past the car at it),
# its magenta wall on the car's passenger side (+z here) and its cyan wall on
# the driver's.
ROOM_K = GH / 5.8
bw = 14.6 * ROOM_K
zl, zr = -215.0 + bw / 2, -215.0 - bw / 2
u = lambda z: (zl - z) / bw  # noqa: E731
xw = GX0 + 0.51
for (za, zb, y0) in ((zl, DOOR_Z1, 0.0), (DOOR_Z0, zr, 0.0), (DOOR_Z1, DOOR_Z0, DOOR_H)):
    quad((GA, "garage_wall_back", 0), (xw, y0, za), (xw, y0, zb), (xw, GH, zb), (xw, GH, za),
         ((u(za), y0 / GH), (u(zb), y0 / GH), (u(zb), 1), (u(za), 1)))
sw = 17.0 * ROOM_K
u0, u1 = (sw - 23.0) / 2 / sw, 1 - (sw - 23.0) / 2 / sw
zp, zc = GZ1 - 0.51, GZ0 + 0.51
quad((GA, "garage_wall_magenta", 0), (GX1 - 0.5, 0, zp), (GX0 + 0.5, 0, zp), (GX0 + 0.5, GH, zp), (GX1 - 0.5, GH, zp),
     ((u0, 0), (u1, 0), (u1, 1), (u0, 1)))
quad((GA, "garage_wall_cyan", 0), (GX0 + 0.5, 0, zc), (GX1 - 0.5, 0, zc), (GX1 - 0.5, GH, zc), (GX0 + 0.5, GH, zc),
     ((u0, 0), (u1, 0), (u1, 1), (u0, 1)))
# Closed underneath: from inside, the ceiling the tubes hang from.
box((GA, "roof", 0), GX0, GX1, GH - 0.3, GH, GZ0, GZ1, scale=4.0, bottom=True)
mass(GA, GX0 - 0.02, GX1, GZ0, GZ1, SHOP_H, GH, 8002, faces=("-x", "+z"), roof=False)
ground((GA, "garage_floor", 0), GX0 + 0.5, GX1 - 0.5, GZ0 + 0.5, GZ1 - 0.5, y=0.01, scale=3.0)
box((GA, "door", 0), GX0 - 0.1, GX0 + 0.6, DOOR_H, DOOR_H + 0.55, DOOR_Z0 - 0.2, DOOR_Z1 + 0.2, scale=0.6)
box((GA, "neon_yellow", 0), GX0 - 0.12, GX0 - 0.08, 0.1, DOOR_H, DOOR_Z0 - 0.15, DOOR_Z0 - 0.05, scale=1.0)
box((GA, "neon_yellow", 0), GX0 - 0.12, GX0 - 0.08, 0.1, DOOR_H, DOOR_Z1 + 0.05, DOOR_Z1 + 0.15, scale=1.0)
# Over the door, outside: the bay's number, as the garage section has it,
# and a caged lamp either side, pooling amber on the pavement (no shaft in
# the haze: a wall lamp this close to the door would throw it indoors).
sign("bay", GX0 - 0.16, 6.25, (DOOR_Z0 + DOOR_Z1) / 2, 4.4, 1.1, -math.pi / 2, preview="BAY 01", district=GA)
# On the corner, a blade with the shop's name as the viewer's own room
# carries it (AFTERLIFE AUTO, in the garage room's cyan), turned along the
# street so the flight down it sees the garage coming.
sign("garage_blade", GX0 - 0.95, 5.2, GZ0 + 1.2, 1.2, 5.4, 0.0, double=True, preview="AFTERLIFE AUTO", district=GA)
for y in (2.7, 7.7):
    box((GA, "metal", 1), GX0 - 0.35, GX0, y - 0.05, y + 0.05, GZ0 + 1.15, GZ0 + 1.25, scale=0.5)
for z in (DOOR_Z0 - 1.1, DOOR_Z1 + 1.1):
    box((GA, "metal", 1), GX0 - 0.42, GX0 - 0.02, 5.2, 5.52, z - 0.2, z + 0.2, scale=0.5)
    box((GA, "neon_amber", 0), GX0 - 0.38, GX0 - 0.06, 5.16, 5.2, z - 0.16, z + 0.16, scale=0.5)
# Fixtures, as in the garage room: magenta on the car's passenger side
# (car -X, which is world +z in this bay), cyan on the driver's side, white
# overhead, so from GarageModel's front preset magenta is on the left.
box((GA, "tube", 0), GX0 + 2, GX1 - 2, 3.0, 3.12, GZ1 - 0.62, GZ1 - 0.5, scale=1.0, col=TUBE["pink"])
box((GA, "tube", 0), GX0 + 2, GX1 - 2, 3.0, 3.12, GZ0 + 0.5, GZ0 + 0.62, scale=1.0, col=TUBE["cyan"])
# (The washes that were high on each wall are the painted walls' own tubes
# now: the room's light comes off its walls, src/world/city.js.)
for z in (-219.5, -210.5):
    box((GA, "tube", 0), GX0 + 3, GX1 - 3, GH - 0.42, GH - 0.36, z - 0.06, z + 0.06, scale=1.0, col=TUBE["white"])
    box((GA, "tube", 0), GX0 + 3, GX1 - 3, GH - 0.36, GH - 0.33, z - 0.9, z + 0.9, scale=1.0, col=TUBE["white"])
box((GA, "metal", 1), GX1 - 1.4, GX1 - 0.5, 0, 0.95, -224, -206, scale=0.8)
box((GA, "tube", 0), GX1 - 0.56, GX1 - 0.5, 2.4, 2.46, -224, -206, scale=1.0, col=TUBE["amber"])
# The door itself, down, in the opening's guides; the site rolls it up into
# its drum (the "door" box over the opening) and back down behind a reader
# going back up the page.
named_quad("garage_door", "door_panel", GX0 + 0.12, DOOR_H / 2, (DOOR_Z0 + DOOR_Z1) / 2,
           DOOR_Z1 - DOOR_Z0 + 0.1, DOOR_H, -math.pi / 2, double=True)
# Over the bench, the monitor the garage's own room has, facing the door:
# the site plays the intro's moon on it.
named_quad("garage_screen", "screen", GX1 - 0.56, 3.55, -215.0, 3.4, 1.9, -math.pi / 2)
box((GA, "metal", 1), GX1 - 0.54, GX1 - 0.5, 2.5, 4.6, -216.9, -213.1, scale=1.0)
# Shop furniture, low and to the sides of the camera's way in: red tool
# chests and a pegboard on the cyan wall, tyres by the door, ducting and a
# hoist beam overhead, and the bay painted out on the floor round the car.
for x0 in (464.0, 466.4, 468.8):
    box((GA, "tool_red", 1), x0, x0 + 2.1, 0, 1.05, GZ0 + 0.5, GZ0 + 1.25, scale=1.0)
    for y in (0.3, 0.55, 0.8):
        box((GA, "dark", 1), x0 + 0.1, x0 + 2.0, y, y + 0.03, GZ0 + 1.25, GZ0 + 1.27, scale=1.0)
    box((GA, "metal", 1), x0 + 0.2, x0 + 1.9, 1.05, 1.1, GZ0 + 0.5, GZ0 + 1.3, scale=1.0)
box((GA, "dark", 1), 464.0, 471.0, 1.5, 3.1, GZ0 + 0.5, GZ0 + 0.56, scale=1.0)
for i in range(9):
    x = 464.5 + i * 0.72
    box((GA, "metal", 1), x, x + 0.08, 1.9 + (i % 3) * 0.3, 2.6 + (i % 2) * 0.2, GZ0 + 0.56, GZ0 + 0.62, scale=1.0)
for k, (tx, tz) in enumerate(((453.6, -222.4), (453.6, -221.3), (454.7, -222.4))):
    cylinder((GA, "dark", 1), tx, tz, 0.0, 0.9 if k < 2 else 0.6, 0.34, segs=12)
for z in (-224.0, -206.0):
    box((GA, "metal", 1), GX0 + 0.6, GX1 - 0.6, GH - 1.05, GH - 0.75, z - 0.18, z + 0.18, scale=1.0)
box((GA, "hazard", 0), 468.3, 468.6, GH - 0.72, GH - 0.42, GZ0 + 1, GZ1 - 1, scale=1.0)
box((GA, "metal", 1), 468.4, 468.5, 5.2, GH - 0.72, -219.05, -218.95, scale=1.0)
box((GA, "hazard", 1), 468.25, 468.65, 4.95, 5.2, -219.2, -218.8, scale=1.0)
for (a0, a1, b0, b1) in ((458.9, 465.1, -216.45, -216.3), (458.9, 465.1, -213.7, -213.55),
                         (458.9, 459.05, -216.45, -213.55), (464.95, 465.1, -216.45, -213.55)):
    box((GA, "hazard", 0), a0, a1, 0.011, 0.016, b0, b1, scale=1.0)
for i in range(8):
    z0 = DOOR_Z0 + 0.1 + i * 0.75
    box((GA, "hazard", 0), GX0 + 0.55, GX0 + 1.0, 0.011, 0.016, z0, z0 + 0.36, scale=1.0)
empty("anchor_garage_bay", BAY, yaw=math.pi / 2)
# Under the roof it does not rain: the site's rain skips this box.
empty("anchor_shelter_garage", (GX0, 0.0, GZ0), props={"size": [GX1 - GX0, GH - 0.3, GZ1 - GZ0]})
# The garage's street is lived in too: painted walls either side of the
# door and across the street from it, which the flight in comes down past.
# They stand wall to wall with it: a slot either side let the far city's
# ground through, a few metres from the flight's lens.
mass(GA, GX0, GX1, -258.0, -230.0, SHOP_H, 22.0, 8101, painted=0)
box((GA, "dark", 0), GX0, GX1, 0, SHOP_H, -258.0, -230.0, scale=2.0)
# Its roof, wet, is Contact's foreground: it holds the sky's glow.
mass(GA, GX0, GX1, -200.0, -176.0, SHOP_H, 7.0, 8102, painted=1, roof_mat="roof_wet")
box((GA, "dark", 0), GX0, GX1, 0, SHOP_H, -200.0, -176.0, scale=2.0)
mass(GA, 410.0, STREET_X - 12, -250.0, -190.0, SHOP_H, 26.0, 8201, painted=2)
box((GA, "dark", 0), 410.0, STREET_X - 12, 0, SHOP_H, -250.0, -190.0, scale=2.0)
# Its ground floor faces the garage door: lit shops and a strip of neon, so
# the street outside the door is not a black hole from inside the bay.
# Proud of the ground floor's dark box, which ends on the same plane: the
# two fought for the pixels and the shops came and went with the camera.
box((GA, "shop", 0), STREET_X - 11.99, STREET_X - 11.96, 0.6, 3.3, -246.0, -194.0, scale=2.0)
box((GA, "neon_pink", 0), STREET_X - 12.05, STREET_X - 11.9, 3.9, 4.05, -246.0, -194.0, scale=1.0)
box((GA, "neon_cyan", 0), STREET_X - 12.05, STREET_X - 11.9, 5.6, 5.7, -238.0, -202.0, scale=1.0)
# Both walls the flight comes down between are hung as a street's are: the
# signs, the air conditioners, a fire escape; cables slung across, and a
# string of lights at the corner.
clutter(GA, -1, -250.0, -190.0, 26.0, 8210, xw=STREET_X - 12)
ac_units(GA, -1, -250.0, -190.0, SHOP_H + 2.0, 22.0, 8211, xw=STREET_X - 12)
fire_escape(GA, -1, -226.0, SHOP_H + 0.5, 23.0, xw=STREET_X - 12)
clutter(GA, 1, -258.0, -230.0, 22.0, 8212, xw=GX0)
ac_units(GA, 1, -258.0, -230.0, SHOP_H + 2.0, 19.0, 8213, xw=GX0)
cable_rng_g = random.Random(8214)
for _ in range(6):
    z = cable_rng_g.uniform(-256.0, -194.0)
    y0 = cable_rng_g.uniform(8.0, 15.0)
    sag = cable_rng_g.uniform(0.6, 1.8)
    xa_, xb_ = STREET_X - 12, GX0 if z < -230.0 or z > -200.0 else GX0 - 0.6
    steps = 12
    for i in range(steps):
        t0, t1 = i / steps, (i + 1) / steps
        x0_, x1_ = xa_ + t0 * (xb_ - xa_), xa_ + t1 * (xb_ - xa_)
        ya = y0 - sag * math.sin(math.pi * t0)
        yb = y0 - sag * math.sin(math.pi * t1)
        quad((GA, "dark", 1), (x0_, ya - 0.03, z), (x1_, yb - 0.03, z), (x1_, yb + 0.03, z), (x0_, ya + 0.03, z))
        quad((GA, "dark", 1), (x1_, yb - 0.03, z), (x0_, ya - 0.03, z), (x0_, ya + 0.03, z), (x1_, yb + 0.03, z))
for i in range(14):
    t = i / 14
    x = STREET_X - 12 + t * (GX0 - (STREET_X - 12))
    y = 7.4 - 1.1 * math.sin(math.pi * t)
    cylinder((GA, "neon_amber", 1), x, -252.0, y - 0.07, y + 0.07, 0.07, segs=6, cap=False)
for z in (-236.0, -214.0, -196.0):
    cylinder((GA, "metal", 1), STREET_X - 9.0, z, 0.15, 6.2, 0.08, segs=8)
    box((GA, "neon_amber", 0), STREET_X - 8.2, STREET_X - 7.4, 6.0, 6.1, z - 0.15, z + 0.15, scale=0.5)
    LAMPS.append((STREET_X - 7.8, 6.0, z))
# And two on the garage's own kerb, so the road the flight comes down past
# the shops is lit on both sides.
for z in (-252.0, -240.0):
    cylinder((GA, "metal", 1), STREET_X + 8.6, z, 0.15, 6.4, 0.08, segs=8)
    box((GA, "metal", 1), STREET_X + 6.9, STREET_X + 8.6, 6.3, 6.4, z - 0.05, z + 0.05, scale=0.5)
    box((GA, "neon_amber", 0), STREET_X + 7.0, STREET_X + 7.8, 6.2, 6.3, z - 0.15, z + 0.15, scale=0.5)
    LAMPS.append((STREET_X + 7.4, 6.2, z))
for i, pos in enumerate(LAMPS):
    empty(f"anchor_lamp_{i}", pos)
for (a0, a1, b0, b1) in ((GX0, GX1, GZ1 - 0.3, GZ1), (GX0, GX1, GZ0, GZ0 + 0.3), (GX0, GX0 + 0.3, GZ0, GZ1)):
    box((GA, "concrete", 0), a0, a1, GH, GH + 0.9, b0, b1, scale=1.5)
# The street the flight comes down is a working one. Under the painted block
# next door, shops; on the garage's own wall, a second bay's roller shutter,
# down, and the office's lit window by the side door; a cyan strip under the
# parapet the whole length of it; bollards either side of the open door,
# tyres and a skip at the kerb. The door's two caged lamps light the wall
# round them (lamp_*).
for k, (z0_, z1_) in enumerate(((-257.6, -250.8), (-250.8, -244.0), (-244.0, -237.2), (-237.2, -230.4))):
    shopfront(GA, 1, z0_, z1_, 8300 + k, awning=k != 2, xf=GX0 - 0.04)
quad((GA, "shop", 0), (GX0 - 0.03, 0.15, -228.6), (GX0 - 0.03, 0.15, -222.6), (GX0 - 0.03, 4.1, -222.6),
     (GX0 - 0.03, 4.1, -228.6), col=(0.5, 0.5, 0.0, 1.0))
box((GA, "hazard", 1), GX0 - 0.08, GX0 - 0.02, 4.1, 4.3, -228.8, -222.4, scale=1.0)
quad((GA, "shop", 0), (GX0 - 0.03, 1.0, -208.2), (GX0 - 0.03, 1.0, -203.6), (GX0 - 0.03, 2.9, -203.6),
     (GX0 - 0.03, 2.9, -208.2), col=(0.8, 0.9, 1.0, 1.0))
box((GA, "door", 0), GX0 - 0.06, GX0, 0.0, 2.3, -202.8, -201.6, scale=1.0)
box((GA, "neon_cyan", 0), GX0 - 0.12, GX0 - 0.04, GH - 0.35, GH - 0.25, GZ0 + 0.3, GZ1 - 0.3, scale=1.0)
box((GA, "hazard", 1), GX0 - 0.04, GX0, 0.0, 0.35, GZ0, DOOR_Z0 - 0.25, scale=1.0)
box((GA, "hazard", 1), GX0 - 0.04, GX0, 0.0, 0.35, DOOR_Z1 + 0.25, GZ1, scale=1.0)
for z in (DOOR_Z0 - 0.7, DOOR_Z1 + 0.7):
    cylinder((GA, "hazard", 1), GX0 - 0.7, z, 0.0, 1.05, 0.14, segs=10)
    cylinder((GA, "dark", 1), GX0 - 0.7, z, 0.62, 0.8, 0.145, segs=10, cap=False)
for k, (tx_, tz_) in enumerate(((GX0 - 0.7, -226.2), (GX0 - 0.7, -225.2), (GX0 - 1.5, -225.7))):
    for j in range(3 if k < 2 else 2):
        cylinder((GA, "dark", 1), tx_, tz_, j * 0.26, j * 0.26 + 0.24, 0.36, segs=12)
box((GA, "metal", 1), GX0 - 2.1, GX0 - 0.3, 0.0, 1.25, -234.2, -232.0, scale=1.0)
box((GA, "dark", 1), GX0 - 2.15, GX0 - 0.25, 1.25, 1.32, -234.25, -231.95, scale=1.0)
for z in (DOOR_Z0 - 1.1, DOOR_Z1 + 1.1):
    site_lamp(f"garage_wall_{'n' if z > -215 else 's'}", (GX0 - 0.6, 5.0, z), "#ffb866", 7.0, 1.2)

cylinder((GA, "metal", 1), 472.0, -226.0, GH, GH + 7.0, 0.07, segs=6)
cylinder((GA, "neon_red", 0), 472.0, -226.0, GH + 7.0, GH + 7.3, 0.14, segs=8)
