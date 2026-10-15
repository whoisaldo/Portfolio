"""The megabuilding's street and the avenue's last stretch under the viaduct:
what hangs over them and stands along their kerbs.

Cable bundles sag from the pylon to the block, the wings and across the
street to the canyon's corner blocks (Fn9gKhU_2_Q@24); strings of bulbs
cross the street where the hero cannot see them; manholes breathe steam;
bollards, hydrants and bins keep to the kerb's edge, clear of the walkers'
lines; pipes run under the viaduct's deck and its piers are painted for
traffic. People stand where there is room off the pavements' lines: at the
piers' feet, at the kerb, under the decks' edge.

In the hero's slot (the avenue itself and x -15..15 of the street) nothing
here glows: paint, pipes, cables, and lamps that are only pools of light.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_base import PYLON, tips as PYLON_TIPS, W_TOP, M_TOP, E_TOP, COL_Z
from ncw.districts.mega_face import hero_hidden

_r = random.Random(8701)
KERB_N, KERB_S = -728.45, -711.55            # the kerbs' edge on the megabuilding street's pavements
SOUTH_WALL = ST_S                            # the canyon's corner blocks' north faces (their agent's)

# ---------------------------------------------------------------------------
# Cables. From the pylon to everything round it, then bundles across the
# street from the decks and the wings to the south side.
# ---------------------------------------------------------------------------
t0, t1, t2, t3 = PYLON_TIPS                  # lower west, lower east, upper west, upper east
bundle(t1, (-38.0, 20.5, MB_ZF + 0.4), sag=1.6, n=3)
bundle(t0, (-58.0, 22.0, -739.0), sag=1.4, n=2)
bundle(t3, (-30.0, 17.5, SOUTH_WALL), sag=3.4, n=4)
bundle(t2, (-60.0, 18.0, SOUTH_WALL - 0.0), sag=3.0, n=3)
bundle(t3, (-20.5, 10.6, COL_Z), sag=1.2, n=2)
ACROSS = (((-41.5, 7.4, COL_Z + 0.7), (-40.0, 12.0, SOUTH_WALL), 2.2, 3), ((-12.0, M_TOP + 1.0, -733.6), (-16.0, 15.0, SOUTH_WALL), 2.6, 2),
          ((8.0, 10.4, COL_Z + 0.7), (15.0, 13.5, SOUTH_WALL), 2.0, 2), ((28.3, 13.8, COL_Z + 0.7), (30.0, 11.0, SOUTH_WALL), 2.8, 4),
          ((46.3, 13.6, COL_Z + 0.7), (56.0, 16.0, SOUTH_WALL), 2.4, 3), ((56.0, 9.0, ST_N), (58.0, 12.0, SOUTH_WALL), 1.8, 2),
          ((-70.0, 9.0, ST_N), (-62.0, 12.0, SOUTH_WALL), 2.2, 3), ((-86.0, 12.0, ST_N), (-66.0, 10.0, -706.0), 2.6, 2),
          ((38.7, 6.0, COL_Z + 0.7), (20.5, 9.0, COL_Z + 0.7), 1.4, 2), ((-31.0, 5.6, COL_Z + 0.7), (-41.5, 6.6, COL_Z + 0.7), 0.9, 2))
for a, b, sag, n in ACROSS:
    bundle(a, b, sag=sag, n=n)
# Strings of bulbs across the street, east and west of the hero's slot.
for (xa, ya, xb, yb, hue) in ((-36.0, W_TOP + 0.9, -33.0, 9.5, "amber"), (-24.0, W_TOP + 0.9, -27.0, 10.5, "pink"), (24.0, 9.0, 26.0, 10.0, "amber"),
                              (40.0, 9.5, 37.0, 8.6, "cyan"), (52.0, 10.5, 54.0, 9.0, "amber")):
    a, b = (xa, ya, -733.4 if abs(xa) < 47 else ST_N), (xb, yb, SOUTH_WALL)
    assert hero_hidden(min(xa, xb) - 0.5, max(xa, xb) + 0.5, 4.0, 12.0, -720.0), xa
    cable(a, b, 1.6, steps=10, r=0.015)
    for i in range(1, 16):
        t = i / 16
        px, pz = a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t
        py = a[1] + (b[1] - a[1]) * t - 1.6 * math.sin(math.pi * t) - 0.12
        box((D, "glow", 1), px - 0.07, px + 0.07, py - 0.07, py + 0.07, pz - 0.07, pz + 0.07, scale=0.5, col=dim(GLOW[hue], 0.8), bottom=True)

# ---------------------------------------------------------------------------
# The megabuilding street's kerbs, both sides.
# ---------------------------------------------------------------------------
for x in (-66.0, -58.0, -50.0, -36.0, -27.0, 22.0, 31.0, 40.0, 49.0):
    P.place("bollard", x, G0, KERB_N)
for x in (-60.0, -34.0, 26.0, 46.0, 55.0):
    P.place("bollard", x, G0, KERB_S)
P.place("hydrant", -47.0, G0, KERB_N)
P.place("hydrant", 34.5, G0, KERB_S)
P.place("bin", -55.0, G0, KERB_N - 0.1)
P.place("bin", 43.0, G0, KERB_N - 0.1)
P.place("bin", 19.5, G0, KERB_S + 0.1)
P.place("cctv", -68.6, G0, KERB_N)
P.place("cctv", 14.4, G0, KERB_S)
for i, (x, z) in enumerate(((-30.0, -722.6), (36.0, -717.4))):
    cylinder((D, "metal", 1), x, z, 0.0, 0.025, 0.42, segs=14)
    empty(f"anchor_steam_mega_{8 + i}", (x, 0.05, z))
# People at the kerb and against the wings' shops (the pavement's two
# walking lines and the walk camera's run between).
for (x, z, yaw, pose) in ((-64.0, KERB_N, 0.0, "smoke"), (-52.4, KERB_N, math.pi, "phone"), (-38.4, KERB_N, 0.0, "squat"), (24.0, KERB_N, 0.0, "idle"),
                          (41.4, KERB_N, math.pi, "phone"), (51.0, KERB_N, 0.0, "smoke"), (-57.6, KERB_S, math.pi, "idle"), (28.6, KERB_S, math.pi, "squat"),
                          (48.2, KERB_S, 0.0, "phone")):
    stand(x, z, yaw, pose, G0)

# ---------------------------------------------------------------------------
# The avenue under the viaduct (z -708..-560): the piers painted for
# traffic, pipes and cable trays under the deck, pools of light in the
# portals, bundles from the deck to the walls.
# ---------------------------------------------------------------------------
for s in (-1, 1):
    xa, xb = sorted((s * 10.3, s * 13.98))
    # A black and yellow band round the kerb leg, chevrons on the pier's faces.
    la, lb = sorted((s * 10.28, s * 10.67))
    tbox(la, lb, 0.3, 0.8, RAIL_Z - 2.22, RAIL_Z + 2.22, YEL_OLD, detail=1)
    for z, yaw in ((RAIL_Z + 2.2, 0.0), (RAIL_Z - 2.2, math.pi)):
        strokes((D, "trim", 1), "^^", s * 12.14, PIER_HEAD + 1.0, z, 0.9, yaw, YEL_OLD, weight=0.2, gap=0.2)
        rotated_quad((D, "trim", 1), s * 12.14, PIER_HEAD + 0.18, z + (0.02 if yaw == 0.0 else -0.02), 3.6, 0.3, yaw, col=YEL_OLD)
    for i in range(4):
        P.place("warning_tri", s * 12.14 + (i - 1.5) * 0.9, PIER_HEAD + 2.4, RAIL_Z - 2.22, math.pi)
    light(D, s * 12.2, 2.8, RAIL_Z, "amber", 2.6)
    stand(s * 10.5, RAIL_Z + 3.4, s * -math.pi / 2, "smoke" if s > 0 else "idle", G0)
    stand(s * 13.82, RAIL_Z - 3.2, -s * math.pi / 2, "lean", G0)
    # Bundles off the deck's edge down to the canyon's walls.
    bundle((s * 13.6, RAIL_UNDER, RAIL_Z + 3.4), (s * 14.0, 18.0, RAIL_Z + 22.0), sag=1.8, n=2)
    bundle((s * 13.6, RAIL_UNDER, RAIL_Z - 3.4), (s * 14.0, 16.0, RAIL_Z - 26.0), sag=2.2, n=3)
rpipe((-13.6, RAIL_UNDER - 0.22, RAIL_Z - 2.6), (13.6, RAIL_UNDER - 0.22, RAIL_Z - 2.6), 0.14)
rpipe((-13.6, RAIL_UNDER - 0.16, RAIL_Z - 2.1), (13.6, RAIL_UNDER - 0.16, RAIL_Z - 2.1), 0.08, col=STEEL)
tbox(-13.6, 13.6, RAIL_UNDER - 0.14, RAIL_UNDER - 0.02, RAIL_Z + 0.6, RAIL_Z + 1.5, STEEL, detail=1, bottom=True)
# Cables across the avenue north of the viaduct, toward the block.
for (z, y, sag) in ((-632.0, 17.0, 2.2), (-655.0, 13.0, 1.6), (-671.0, 21.0, 2.8), (-690.0, 15.0, 2.0), (-702.0, 11.0, 1.2), (-588.0, 19.0, 2.4), (-574.0, 14.0, 1.8)):
    bundle((-14.0, y, z), (14.0, y + _r.uniform(-2.0, 2.0), z + _r.uniform(-5.0, 5.0)), sag=sag, n=_r.choice((1, 2, 2, 3)), r=0.012)
# The kerbs.
for z in (-580.0, -596.0, -624.0, -640.0, -664.0, -688.0):
    P.place("bollard", 10.45 if int(z) % 3 else -10.45, G0, z)
P.place("hydrant", 10.5, G0, -650.0)
P.place("bin", -10.55, G0, -676.0)
for (x, z, yaw, pose) in ((10.5, -700.0, -math.pi / 2, "phone"), (-10.5, -694.0, math.pi / 2, "squat"), (10.5, -668.0, -math.pi / 2, "idle"),
                          (-10.5, -644.0, math.pi / 2, "smoke"), (10.5, -590.0, -math.pi / 2, "squat"), (-10.5, -572.0, math.pi / 2, "phone")):
    stand(x, z, yaw, pose, G0)

# ---------------------------------------------------------------------------
# Light. The forecourt under the decks, lit by tubes on the decks'
# undersides and the gallery's soffit (east and west of the hero's slot),
# and pools at the entrance.
# ---------------------------------------------------------------------------
for x0, x1 in ((-46.0, -40.0), (-37.0, -31.0), (-28.0, -22.0)):
    tube_x(x0, x1, 4.08, -743.0, "white", power=5.0, neon=True)
for x0, x1, z in ((-40.0, -34.0, -736.4), (-28.0, -22.0, -737.2)):
    tube_x(x0, x1, W_TOP - 0.74, z, "amber", power=5.5, neon=True)
for x0, x1, z in ((23.0, 29.0, -737.0), (33.0, 39.0, -735.6), (41.0, 46.0, -741.0)):
    assert hero_hidden(x0, x1, 12.0, 14.5, z)
    tube_x(x0, x1, E_TOP - 0.84, z, "white", power=5.5, neon=True)
for (x, z, hue, pw) in ((-13.0, -737.0, "amber", 1.8), (13.0, -737.0, "amber", 1.8), (-44.0, -739.0, "amber", 4.6), (30.0, -744.0, "cyan", 3.6),
                        (36.0, -741.0, "white", 4.4), (-24.0, -734.0, "amber", 4.4), (24.0, -734.0, "white", 4.2)):
    light(D, x, 3.5, z, hue, pw)
