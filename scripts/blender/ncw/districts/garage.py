from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw.districts.rooftop import STREET_X

# ---------------------------------------------------------------------------
# THE GARAGE, from the street. A workshop on the street below the rooftop
# with a roll-up door (garage_door, which the site rolls up as the car
# comes): its shell, its door and drum, its signs and lamps, and the street
# it stands on. The car pulls in forward and stops on anchor_garage_bay
# facing +x. What is inside (the workshop, its mezzanine, its lights and
# both bays) is districts/garage_interior.py, which streams in a pack of its
# own; this is what the city shows before it does.
# ---------------------------------------------------------------------------
GA = "garage"
GX0, GX1, GZ0, GZ1, GH = 452.0, 476.0, -230.0, -200.0, 8.0
DOOR_Z0, DOOR_Z1, DOOR_H = -218.0, -212.0, 4.6
BAY = (462.0, 0.0, -215.0)
box((GA, "garage_wall", 0), GX0, GX0 + 0.5, 0, GH, GZ0, DOOR_Z0, scale=2.0)
# The front wall south of the door, with the mezzanine office's window in
# it (districts/garage_interior.py builds the office behind it).
OFFICE_WIN = (-206.8, -202.2, 4.3, 5.9)
box((GA, "garage_wall", 0), GX0, GX0 + 0.5, 0, GH, DOOR_Z1, OFFICE_WIN[0], scale=2.0)
box((GA, "garage_wall", 0), GX0, GX0 + 0.5, 0, GH, OFFICE_WIN[1], GZ1, scale=2.0)
box((GA, "garage_wall", 0), GX0, GX0 + 0.5, 0, OFFICE_WIN[2], OFFICE_WIN[0], OFFICE_WIN[1], scale=2.0)
box((GA, "garage_wall", 0), GX0, GX0 + 0.5, OFFICE_WIN[3], GH, OFFICE_WIN[0], OFFICE_WIN[1], scale=2.0)
# Its glazing near the street face, seen from both sides, and a steel frame
# round it.
_pane = [(GX0 + 0.06, OFFICE_WIN[2], OFFICE_WIN[1]), (GX0 + 0.06, OFFICE_WIN[2], OFFICE_WIN[0]),
         (GX0 + 0.06, OFFICE_WIN[3], OFFICE_WIN[0]), (GX0 + 0.06, OFFICE_WIN[3], OFFICE_WIN[1])]
quad((GA, "clearglass", 0), *_pane, col=(0.55, 0.62, 0.66, 1))
quad((GA, "clearglass", 0), *_pane[::-1], col=(0.55, 0.62, 0.66, 1))
for (y0, y1, z0, z1) in ((OFFICE_WIN[2] - 0.08, OFFICE_WIN[2], OFFICE_WIN[0] - 0.08, OFFICE_WIN[1] + 0.08),
                         (OFFICE_WIN[3], OFFICE_WIN[3] + 0.08, OFFICE_WIN[0] - 0.08, OFFICE_WIN[1] + 0.08),
                         (OFFICE_WIN[2], OFFICE_WIN[3], OFFICE_WIN[0] - 0.08, OFFICE_WIN[0]),
                         (OFFICE_WIN[2], OFFICE_WIN[3], OFFICE_WIN[1], OFFICE_WIN[1] + 0.08),
                         (OFFICE_WIN[2], OFFICE_WIN[3], -204.54, -204.46)):
    box((GA, "metal", 0), GX0 - 0.04, GX0 + 0.08, y0, y1, z0, z1, scale=1.0)
box((GA, "garage_wall", 0), GX0, GX0 + 0.5, DOOR_H, GH, DOOR_Z0, DOOR_Z1, scale=2.0)
box((GA, "garage_wall", 0), GX1 - 0.5, GX1, 0, GH, GZ0, GZ1, scale=2.0)
box((GA, "garage_wall", 0), GX0, GX1, 0, GH, GZ0, GZ0 + 0.5, scale=2.0)
box((GA, "garage_wall", 0), GX0, GX1, 0, GH, GZ1 - 0.5, GZ1, scale=2.0)
# Closed underneath: from inside, the ceiling the tubes hang from.
box((GA, "roof", 0), GX0, GX1, GH - 0.3, GH, GZ0, GZ1, scale=4.0, bottom=True)
mass(GA, GX0 - 0.02, GX1, GZ0, GZ1, SHOP_H, GH, 8002, faces=("-x", "+z"), roof=False)
# The floor the street sees through the door before the workshop arrives
# (districts/garage_interior.py lays its own, a centimetre over this).
ground((GA, "garage_floor", 0), GX0 + 0.5, GX1 - 0.5, GZ0 + 0.5, GZ1 - 0.5, y=0.002, scale=3.0)
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
# The door itself, down, in the opening's guides; the site rolls it up into
# its drum (the "door" box over the opening) and back down behind a reader
# going back up the page.
named_quad("garage_door", "door_panel", GX0 + 0.12, DOOR_H / 2, (DOOR_Z0 + DOOR_Z1) / 2,
           DOOR_Z1 - DOOR_Z0 + 0.1, DOOR_H, -math.pi / 2, double=True)
# High on the shop wall over the middle bench, the monitor the garage's own
# room has, facing the door: the site plays the intro's moon on it. Its
# screen is the kit's monitor's (ncw/garage/lounge.py, MONITOR_SCREEN: where
# in the bezel, how big), whose bezel the workshop hangs round it; the
# screen is the street's, so the moon is there first.
from ncw.garage.lounge import MONITOR_SCREEN  # noqa: E402
# The bezel is set at SCREEN_SCALE, so the screen is the old garage room's
# own (2.43 m by 1.36), over the working centre of the shop wall, its bezel
# clear of the bench's amber strip (to y 2.5).
SCREEN_FOOT, SCREEN_Z, SCREEN_SCALE = 2.55, -215.5, 1.7
(_sx, _sy, _sz), _sw, _sh = MONITOR_SCREEN
# Its centre and size, world metres (its mesh is written in world space).
SCREEN_AT = (GX1 - 0.5 - 0.023 - _sz * SCREEN_SCALE - 0.002, SCREEN_FOOT + _sy * SCREEN_SCALE, SCREEN_Z + _sx * SCREEN_SCALE)
SCREEN_WH = (_sw * SCREEN_SCALE, _sh * SCREEN_SCALE)
named_quad("garage_screen", "screen", *SCREEN_AT, *SCREEN_WH, -math.pi / 2, props={"assetKind": "identity-art"})
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
# (Set back a metre from the street: its shops are built with the street,
# districts/afterlife.py.)
box((GA, "dark", 0), GX0 + 1.0, GX1, 0, SHOP_H, -200.0, -176.0, scale=2.0)
mass(GA, 410.0, STREET_X - 12, -250.0, -190.0, SHOP_H, 26.0, 8201, painted=2)
box((GA, "dark", 0), 410.0, STREET_X - 12, 0, SHOP_H, -250.0, -191.0, scale=2.0)
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
# (Inside, its sections are the workshop's second door, closed: the opening
# is the 6 m by 4.6 m the first one is, so the two read as a pair.)
quad((GA, "shop", 0), (GX0 - 0.03, 0.15, -228.6), (GX0 - 0.03, 0.15, -222.6), (GX0 - 0.03, 4.6, -222.6),
     (GX0 - 0.03, 4.6, -228.6), col=(0.5, 0.5, 0.0, 1.0))
box((GA, "hazard", 1), GX0 - 0.08, GX0 - 0.02, 4.6, 4.8, -228.8, -222.4, scale=1.0)
sign("bay_02", GX0 - 0.16, 5.45, -225.6, 2.8, 0.7, -math.pi / 2, preview="BAY 02", district=GA)
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
