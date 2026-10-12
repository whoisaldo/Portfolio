"""Corpo Plaza's roofs as a flying car sees them (ax5YUmkWf_Y@9, and the
aerials pz-fly-ne, plaza-aerial, pz11, pz12): big plant that reads from the
air (cooling towers with lit rims, tanks with pale heads, plant houses with
lit doors, drawn lit: the street's light does not climb here), and under
all of it a floodlit deck of pavers on every flat roof the plaza has, laid
last, when every roof is known (plaza_crowns.roof_decks). The roof garden
on B1's corner keeps its own flags.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw.districts.plaza_parts import *  # noqa: F401,F403
from ncw.districts.plaza_crowns import roof_decks, cooling, tanks, plant_house, roof_logo
from ncw.districts.plaza_blocks import checked

# B1's slab: its lower roof either side of the upper house, and that house's
# roof behind the blade wall.
cooling(66.0, -111.0, 45.4, n=2, along="z", hue="yellow")
tanks(101.2, -116.5, 45.4, n=3, r=1.05, h=3.0, along="z", warm=0.2)
plant_house(73.0, 78.4, -110.0, -105.2, 70.2, h=2.6, hue="amber", warm=0.15)
cooling(92.6, -115.2, 70.2, n=2, r=1.4, h=2.8, hue="white")
tanks(57.0, -115.0, 11.4, n=3, r=1.2, h=3.2, along="z")
# B2's hotel: a row of cooling towers and a plant house between the pool
# and the garden.
cooling(81.0, -28.0, 45.4, n=3, r=1.5, h=3.0, hue="teal")
plant_house(76.5, 85.5, -22.4, -17.6, 45.4, h=2.8, hue="amber", warm=0.2)
# D: tanks and a plant house along the podium's east strip, cooling on D2.
tanks(167.8, -116.0, 11.4, n=4, r=1.1, h=3.0, along="z", warm=0.15)
plant_house(166.2, 169.5, -86.0, -78.0, 11.4, h=2.8, hue="green")
tanks(167.8, -68.0, 11.4, n=2, r=1.1, h=3.0, along="z")
cooling(146.0, -106.0, 58.0, n=2, r=1.4, h=2.6, hue="amber")
# B5's upper house, either side of its mark; the board's block, north of its
# plant (5 m back from the edge the Work shot looks up at, and under 3 m).
cooling(92.0, -322.6, 57.2, n=3, r=1.3, h=2.6, hue="teal")
tanks(89.0, -337.6, 57.2, n=4, r=1.0, h=2.5, warm=0.1)
checked(82.0, 102.0, -341.0, -319.0, 60.6, "B5 top plant")
tanks(60.0, -277.5, 44.0, n=4, r=1.0, h=2.4)
# The north quarter's strip and S1: a house's mark over the boulevard's end.
roof_logo(123.0, -430.0, 45.4, 4.2, 0.0, "hex", "teal")
checked(110.0, 136.0, -454.0, -422.0, 45.4 + 2.2 + 4.2 * 1.32 + 0.4, "S1 mark")

# Searchlights on three roofs behind the koi (YRL74JmhVgk@18's beams): the
# lamp housings stand here; the beam itself is the site's to draw, from the
# anchor (yaw from south toward east, pitch up from level, in radians).
for i, (x, y, z, yaw, pitch, hue) in enumerate(((66.0, 44.0, -278.0, 0.5, 1.2, "white"), (96.0, 31.8, -290.0, -0.4, 1.3, "cyan"),
                                               (143.5, 35.2, -138.0, -1.2, 1.25, "white"))):
    box((PL, "steel", 0), x - 0.5, x + 0.5, y, y + 0.5, z - 0.5, z + 0.5, scale=1.0, col=STEEL_D)
    cylinder((PL, "steel", 0), x, z, y + 0.5, y + 1.2, 0.42, segs=8, col=STEEL_D)
    up_poly((PL, "glow", 0), ngon(x, z, 0.36, 8), y + 1.21, GLOW[hue])
    empty(f"anchor_searchlight_plaza_{i}", (x, y + 1.25, z), props={"yaw": yaw, "pitch": pitch, "length": 180.0, "color": NEON[hue]})

roof_decks(skip=((80.0, 108.0, -168.0, -132.0),), low=((48.0, 108.0, -284.0, -264.0),))
