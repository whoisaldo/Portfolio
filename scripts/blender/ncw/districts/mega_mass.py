"""The megabuilding's mass: what makes a megastructure of the slab.

From the canyon the slab alone was a flat-topped block no taller in frame
than the towers beside it, with open sky over it. Behind it now, across the
service lane, the building steps up in three tiers to twice the slab's
height, each narrower than the one under it, blocks cantilevered off the
upper two, a lit crown, masts and beacons: it fills the canyon's band of
sky as far up as the canyon's own roofs. The band is the same from the
hero's lens as from the canyon (the canyon's walls are parallel), so the
tiers' fronts and the crown are keyed "far" and are in the core, as dark as
the slab's own walls and no brighter: the plate's dark stepped block under
the figure. Their sides, backs and roofs, the yellow paint and the bridges
over the lane come with the district's pack.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw.districts.mega_kit import *  # noqa: F401,F403

TZ = -801.0                                  # the tiers' front, behind the lane's wall
# x0, x1, z0, z1, from, top: each tier stands on the one under it.
TIERS = ((-38.0, 38.0, -838.0, TZ, 0.0, 132.0), (-26.0, 26.0, -838.0, TZ - 8.0, 132.0, 162.0), (-15.0, 13.0, -836.0, TZ - 14.0, 162.0, 190.0))
SEEN = 92.0                                  # the slab hides the tiers' fronts below this from every lens south of it
COL_F = (0.46, 2 / 8.0, 0.5, 1.0)            # the slab's own wall, fewer windows lit
for k, (x0, x1, z0, z1, y0, y1) in enumerate(TIERS):
    mass(FA, x0, x1, z0, z1, max(y0, SEEN), y1, 5011 + k, faces=("+z",), col=COL_F, mat="facade_end", roof=False)
    if y0 < SEEN:
        mass(D, x0, x1, z0, z1, y0, SEEN, 5011 + k, faces=("+z",), col=B.wall_col(0.46, 2, 0.5, 5), roof=False)
    mass(D, x0, x1, z0, z1, y0, y1, 5021 + k, faces=("-x", "+x", "-z"), col=B.wall_col(0.5, 2, 0.5, 5), roof=True)
    B.ROOFS.append((D, x0, x1, z0, z1, y1))
    B.COLLISION.append(("box", x0, x1, y0, y1, z0, z1, D))
    HERO_MASSES.append(((x0, y0, z0), (x1, y1, z1)))
    # A dark coping along each step's front, and the step's own line of light.
    box((FA, "dark", 0), x0 - 0.3, x1 + 0.3, y1 - 0.2, y1 + 1.0, z1 - 0.3, z1 + 0.3, scale=2.0)
    if k < 2:
        for lx in range(int(x0) + 3, int(x1) - 1, 6):
            box((FA, "neon_amber", 0), lx - 0.2, lx + 0.2, y1 + 0.25, y1 + 0.6, z1 + 0.3, z1 + 0.36, scale=1.0)

# Blocks cantilevered off the upper tiers, over the shoulders of the tier
# below: the megabuilding's top-heavy outline.
block(-37.0, -26.0, 139.0, 158.0, -833.0, -811.0, 5031, faces=("+z",), lit=0.5, wall=(FA, "facade_end", 0))
block(26.0, 36.0, 144.0, 160.0, -831.0, -813.0, 5032, faces=("+z",), lit=0.42, wall=(FA, "facade_end", 0))
block(13.0, 22.0, 167.0, 184.0, -832.0, -817.0, 5033, faces=("+z",), lit=0.5, wall=(FA, "facade_end", 0))
block(-24.0, -15.0, 171.0, 186.0, -833.0, -818.0, 5034, faces=("+z",), lit=0.4, wall=(FA, "facade_end", 0))
for (x0, x1, y0, y1, z0, z1, seed) in ((-37.0, -26.0, 139.0, 158.0, -833.0, -811.0, 5035), (26.0, 36.0, 144.0, 160.0, -831.0, -813.0, 5036),
                                       (13.0, 22.0, 167.0, 184.0, -832.0, -817.0, 5037), (-24.0, -15.0, 171.0, 186.0, -833.0, -818.0, 5038)):
    f = B.faces_of(x0, x1, z0, z1)["-x" if x0 < 0 else "+x"]
    B.facade_wall((D, "facade", 0), face(f.name, f.plane + f.nx * 0.02, z0, z1), y0 + 0.9, y1 - 0.9, B.wall_col(0.5, 0, 0.7, 5), seed % 40)
    for yy in (y0, y1 - 0.9):
        f.quad((D, "trim", 0), 0.0, f.width, yy, yy + 0.9, 0.02, col=YEL)

# The block's number on the second tier's face, in paint under floodlight:
# dim, so from the avenue's far end it is part of the wall.
numeral("H4", 0.0, 147.0, TIERS[1][3], 15.0, 0.0, lit=0.2)

# The crown: a ring of light under the top tier's edge, plant behind it, and
# masts with their beacons.
cx0, cx1, cz0, cz1, _, CROWN = TIERS[2]
band(FA, cut_rect((cx0 + cx1) / 2, (cz0 + cz1) / 2, (cx1 - cx0) / 2, (cz1 - cz0) / 2), CROWN - 1.5, CROWN - 0.7, "amber", out=0.25)
MASTS = ((-9.0, -822.0, 26.0), (5.0, -826.0, 18.0), (-2.0, -831.0, 34.0))
for mx, mz, mh in MASTS:
    cylinder((FA, "metal", 0), mx, mz, CROWN, CROWN + mh, 0.45, segs=6)
    cylinder((FA, "neon_red", 0), mx, mz, CROWN + mh, CROWN + mh + 1.2, 0.7, segs=6)
    for t in (0.4, 0.7):
        box((D, "metal", 1), mx - 2.2, mx + 2.2, CROWN + mh * t, CROWN + mh * t + 0.15, mz - 0.08, mz + 0.08, scale=0.5)
        box((D, "glow", 1), mx - 2.3, mx - 2.0, CROWN + mh * t + 0.15, CROWN + mh * t + 0.45, mz - 0.15, mz + 0.15, scale=0.5, col=GLOW["red"])
for (x0, x1, z0, z1, h) in ((cx0 + 2.0, cx0 + 9.0, cz0 + 2.0, cz0 + 9.0, 3.4), (cx1 - 10.0, cx1 - 2.0, cz0 + 3.0, cz0 + 8.0, 2.6)):
    box((D, "metal", 0), x0, x1, CROWN, CROWN + h, z0, z1, scale=1.5)
for (x0, x1, z0, z1, _, y1) in TIERS:
    parapet(x0, x1, z0, z1, y1, sides=("-z", "+x", "-x"), rim="amber")

# Bridges over the service lane, from the slab's back to the first tier.
for (x, y, hue) in ((-30.0, floor_y(6), "cyan"), (-4.0, floor_y(11), "amber"), (22.0, floor_y(8), "pink"), (31.0, floor_y(17), "cyan")):
    bridge(x - 2.2, x + 2.2, TZ, MB_ZB, y, y + CELL_H, hue)
