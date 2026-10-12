from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)

# ---------------------------------------------------------------------------
# THE PLAZA. East along the cross street from the avenue: a paved square
# with the giant board on its north side and smaller boards around it. The
# board shows the Work deck's current entry.
# ---------------------------------------------------------------------------
PL = "plaza"
CROSS_Z0, CROSS_Z1 = -186.0, AV_NORTH
# The plaza street is streets.py's; the square starts at its lot line (its
# paving and all that stands on it are plaza_square.py's).
PX0, PX1, PZ0, PZ1 = 48.0, 108.0, -262.0, -190.0
BOARD = (79.0, 26.0, -263.0, 27.0, 18.0)
bx, by, bz, bw, bh = BOARD
named_quad("board_main", "board", bx, by, bz, bw, bh, 0.0, props={"board": 0, "district": PL})
empty("anchor_billboard_main", (bx, by, bz))
box((PL, "board_frame", 0), bx - bw / 2 - 0.8, bx + bw / 2 + 0.8, by - bh / 2 - 0.8, by + bh / 2 + 0.8, bz - 1.2, bz - 0.05, scale=2.0)
box((PL, "neon_yellow", 0), bx - bw / 2 - 0.8, bx + bw / 2 + 0.8, by - bh / 2 - 0.9, by - bh / 2 - 0.7, bz - 0.05, bz + 0.1, scale=1.0)
for px in (bx - 9, bx + 9):
    box((PL, "metal", 0), px - 0.6, px + 0.6, 0, by - bh / 2 - 0.8, bz - 1.2, bz - 0.2, scale=1.0)
# A board this size hangs in a steel housing bolted over the flats behind
# it: a dark field wider than the screen and the two boards beside it (so
# the screens, not the lit rooms round them, are what the eye finds),
# ribbed, with a catwalk along its foot and a red lamp on each top corner.
HX0, HX1 = bx - bw / 2 - 10.5, bx + bw / 2 + 10.5
HY0, HY1 = by - bh / 2 - 3.2, by + bh / 2 + 3.6
box((PL, "board_frame", 0), HX0, HX1, HY0, HY1, -264.0, -263.85, scale=2.0)
for y in [HY0 + 0.4 + k * 3.1 for k in range(int((HY1 - HY0) / 3.1))]:
    box((PL, "metal", 1), HX0 + 0.3, HX1 - 0.3, y, y + 0.14, -263.85, -263.7, scale=0.5)
box((PL, "metal", 0), HX0, HX1, by - bh / 2 - 1.5, by - bh / 2 - 1.35, -263.85, -262.3, scale=1.0)
box((PL, "metal", 1), HX0, HX1, by - bh / 2 - 0.45, by - bh / 2 - 0.4, -262.35, -262.3, scale=0.5)
for x in (HX0 + 0.4, HX1 - 0.4):
    box((PL, "neon_red", 0), x - 0.2, x + 0.2, HY1 - 0.5, HY1 - 0.1, -263.85, -263.6, scale=0.5)
# Floodlights on arms along the housing's top edge, lighting its steel down
# over the screen, as a billboard is lit (lamp_*: the site lights the ribs
# near them, and src/world/floods.js draws their fans on the housing).
for k, fx in enumerate((bx - 19.5, bx - 7.0, bx + 7.0, bx + 19.5)):
    fy = HY1 + 0.2
    box((PL, "metal", 1), fx - 0.05, fx + 0.05, HY1 - 0.1, fy + 0.25, -263.8, -262.4, scale=0.5)
    box((PL, "metal", 0), fx - 0.4, fx + 0.4, fy, fy + 0.3, -262.6, -262.1, scale=0.5)
    box((PL, "neon_white", 0), fx - 0.34, fx + 0.34, fy - 0.04, fy, -262.55, -262.15, scale=0.5)
    site_lamp(f"board_{k}", (fx, fy - 0.2, -262.3), "#dfe6ff", 8.0, 1.2)
# The housing's face, for the site's floodlight wash (src/world/boards.js).
empty("anchor_board_housing", ((HX0 + HX1) / 2, (HY0 + HY1) / 2, -263.84),
      props={"w": HX1 - HX0, "h": HY1 - HY0, "rib0": HY0 + 0.4, "ribStep": 3.1})
SMALL_BOARDS = [
    (44.6, 12.0, -205.0, 9.0, 6.0, math.radians(90)),
    (44.6, 12.0, -228.0, 9.0, 6.0, math.radians(90)),
    (109.4, 12.0, -205.0, 9.0, 6.0, math.radians(-90)),
    (109.4, 12.0, -228.0, 9.0, 6.0, math.radians(-90)),
    (60.0, 19.0, -260.5, 8.0, 5.3, 0.0),
    (98.0, 19.0, -260.5, 8.0, 5.3, 0.0),
    # Over the housing, on its roof: low over the shops a phone's Work shot
    # saw it alone at its foot, and a little higher the landscape's edge
    # cut it.
    (79.0, 41.0, -262.6, 12.0, 4.0, 0.0),
]
for i, (cx, cy, cz, w, h, yaw) in enumerate(SMALL_BOARDS, start=1):
    named_quad(f"board_{i}", "board", cx, cy, cz, w, h, yaw, props={"board": i, "district": PL})
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box((PL, "board_frame", 0), cx - nx * 0.3, cy, cz - nz * 0.3, w + 0.5, h + 0.5, 0.5, yaw, scale=1.0)
# The blocks round the square and along the cross street are the avenue's
# kind: painted apartment walls, lived in, with the board hung on one. The
# camera cranes past them on its way from the hero to the board.
# The block the board hangs on, north of the square. (The square's east
# block and the cross street's south side stood across the x 120 road, which
# the S4 drove through unseen; the road is real now and the blocks round it
# are massing.py's.)
for i, (x0, x1, z0, z1, h, seed) in enumerate(((PX0, PX1, -284.0, -264.0, 44, 5103),)):
    mass(PL, x0, x1, z0, z1, SHOP_H, h, seed, painted=i)
    box((PL, "dark", 0), x0, x1, 0, SHOP_H, z0, z1, scale=2.0)
    dress_roof(PL, x0, x1, z0, z1, h, seed + 41, cap=6.0)

# The blocks round the square and along the x 120 road, and the north
# quarter behind the board.
from ncw.districts import plaza_blocks  # noqa: E402,F401
from ncw.districts import plaza_square  # noqa: E402,F401
from ncw.districts import plaza_streets  # noqa: E402,F401
from ncw.districts import plaza_people  # noqa: E402,F401
from ncw.districts import plaza_dress  # noqa: E402,F401
# (Last: the square's slabs, lit by everything set down above.)
from ncw.districts import plaza_paving  # noqa: E402,F401
