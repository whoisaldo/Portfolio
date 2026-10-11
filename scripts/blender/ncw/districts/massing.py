"""Every frontage of the network a district has not built yet, lined.

The rebuild goes district by district (BIBLE.md), and until a district's own
module builds its streets as they should be, this lines them with the
building generator in the district's rough style, so no street of the loop
ends in a void while the others are worked on. Each district's entry here is
removed when its own module takes over its frontages.

A frontage: a street face's lot line (`plane`), which way the street lies
from it (`face`, the lots' outward normal), from a0 to a1 along it, how deep
its lots are, their heights and widths, and what the row's two ends look
onto. `gaps` are stretches left open (the deck's crossing).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B

# Styles by district: what an ordinary block there is like.
STYLES = {
    "japantown": dict(windows=(0, 1, 3, 6, 6), lit=(0.45, 0.9), warmth=(0.55, 1.0), tints=("plum", "teal", "charcoal", "brown"),
                      balcony=0.25, ac=0.35, signs=2.2, awning=0.75, shop_sign=0.7, canopy=0.05, roof_cap=5.0,
                      setback=0.15, fire_escape=0.35, shop_colours=["pink", "magenta", "red", "amber", "purple"]),
    "plaza": dict(windows=(2, 4, 5, 5), lit=(0.35, 0.8), warmth=(0.1, 0.6), tints=("navy", "teal", "concrete", "charcoal"),
                  balcony=0.0, ac=0.05, signs=0.6, awning=0.2, shop_sign=0.4, canopy=0.35, roof_cap=6.0,
                  setback=0.5, fire_escape=0.0, cornice=0.2, shop_colours=["cyan", "white", "teal", "blue"]),
    "corpo": dict(windows=(2, 4, 5), lit=(0.35, 0.85), warmth=(0.05, 0.5), tints=("navy", "teal", "concrete", "charcoal"),
                  balcony=0.0, ac=0.04, signs=0.5, awning=0.15, shop_sign=0.35, canopy=0.4, roof_cap=6.0,
                  setback=0.55, fire_escape=0.0, cornice=0.2, shop_colours=["cyan", "white", "teal", "blue"]),
    "santo": dict(windows=(2, 3, 6), lit=(0.2, 0.55), warmth=(0.4, 1.0), tints=("rust", "brown", "concrete", "charcoal"),
                  balcony=0.02, ac=0.15, signs=0.5, awning=0.25, shop_sign=0.3, canopy=0.1, roof_cap=5.0,
                  setback=0.1, fire_escape=0.15, cornice=0.3, shop_colours=["amber", "red", "yellow", "white"]),
    "canyon": dict(windows=(0, 1, 2, 5, 5), lit=(0.45, 0.85), warmth=(0.3, 0.9), tints=("navy", "charcoal", "teal", "plum"),
                   balcony=0.15, ac=0.2, signs=1.4, awning=0.5, shop_sign=0.5, canopy=0.15, roof_cap=6.0,
                   setback=0.4, fire_escape=0.2),
    "mega": dict(windows=(0, 6, 5), lit=(0.5, 0.85), warmth=(0.5, 1.0), tints=("concrete", "charcoal", "navy"),
                 balcony=0.45, ac=0.3, signs=0.8, awning=0.4, shop_sign=0.5, canopy=0.2, roof_cap=6.0,
                 setback=0.2, fire_escape=0.1),
    "afterlife": dict(windows=(0, 1, 3, 6), lit=(0.4, 0.85), warmth=(0.5, 1.0), tints=("charcoal", "plum", "brown", "teal"),
                      balcony=0.15, ac=0.35, signs=1.6, awning=0.6, shop_sign=0.6, canopy=0.1, roof_cap=5.0,
                      setback=0.15, fire_escape=0.35, shop_colours=["pink", "red", "amber", "cyan"]),
}


def frontage(district, face, a0, a1, plane, depth, heights, widths, seed, ends=("party", "party"), gaps=(), ground="shops", style=None, back="back"):
    """Lots along one street face, a0..a1 (minus the gaps), each as deep as
    `depth`, heights and widths drawn from the ranges or choices given."""
    r = random.Random(seed)
    spans, at = [], a0
    for g0, g1 in sorted(gaps):
        if g0 > at:
            spans.append((at, g0, "open"))
        at = max(at, g1)
    if at < a1:
        spans.append((at, a1, None))
    out = []
    st = dict(STYLES.get(district, {}), **(style or {}))
    for k, (s0, s1, _) in enumerate(spans):
        e0 = ends[0] if abs(s0 - a0) < 0.01 else "open"
        e1 = ends[1] if abs(s1 - a1) < 0.01 else "open"
        hs = lambda i, a, _r=random.Random(seed * 7 + k): _r.uniform(*heights)  # noqa: E731
        ws = lambda i, _r=random.Random(seed * 13 + k): _r.choice(widths)  # noqa: E731
        out += B.row(district, face, s0, s1, depth, plane, hs, ws, random.Random(seed + 31 * k), style=st,
                     ends=(e0, e1), back=back, ground=ground)
    return out


def blocks(district, x0, x1, z0, z1, heights, seed, step=24.0, style=None):
    """The inside of a block nobody walks along: buildings with windows on
    every side and alleys between them, seen from roofs and from the air."""
    r = random.Random(seed)
    st = dict(STYLES.get(district, {}), **(style or {}))
    x = x0
    while x < x1 - 8:
        w = min(r.uniform(step * 0.7, step * 1.3), x1 - x)
        z = z0
        while z < z1 - 8:
            d = min(r.uniform(step * 0.7, step * 1.3), z1 - z)
            g = 3.0  # an alley's width
            lot = B.Lot(x + g / 2, x + w - g / 2, z + g / 2, z + d - g / 2, "+z",
                        {"+x": "back", "-x": "back", "+z": "back", "-z": "back"}, {}, district)
            B.building(lot, r.uniform(*heights), r, style=st, signs=False, ground="blank")
            z += d
        x += w
    B.ground_rect(district, x0, x1, z0, z1)


def japantown():
    D = "japantown"
    w = (6.4, 8.0, 9.6, 12.8)
    # The west street's east side: shallow lots in front of the avenue's and
    # the canyon's west lane, the deck's crossing left open.
    frontage(D, "-x", -708.0, -190.0, -66.0, 16.0, (14.0, 30.0), w, 8101, ends=("street", "street"))
    frontage(D, "-x", -168.0, -10.0, -66.0, 16.0, (12.0, 26.0), w, 8102, ends=("street", "street"), gaps=[(-86.0, -74.0)])
    # Its west side, the outer frontage, out past the south street's end.
    frontage(D, "+x", -734.0, 40.0, -94.0, 30.0, (12.0, 32.0), w, 8103, ends=("open", "open"))
    # The lane between the shallow lots and the canyon's west row.
    B.ground_rect(D, -50.0, -44.0, -708.0, -190.0)


def mega():
    D = "mega"
    # The megabuilding street's north side either side of the block, and
    # its south side east of the canyon (the canyon's lots turn the corner
    # on the west).
    frontage(D, "+z", -94.0, -48.0, -732.0, 30.0, (34.0, 58.0), (12.8, 16.0, 19.2), 8201, ends=("street", "open"))
    frontage(D, "+z", 48.0, 74.0, -732.0, 30.0, (40.0, 64.0), (12.8, 13.0), 8202, ends=("open", "street"))
    frontage(D, "-z", 44.0, 74.0, -708.0, 30.0, (30.0, 46.0), (14.0, 16.0), 8203, ends=("open", "street"))
    # The canyon's east backs to the x 120 line, north of ARASAKA's block.
    blocks(D, 44.0, 132.0, -708.0, -560.0, (30.0, 62.0), 8204)


def plaza():
    D = "plaza"
    w = (16.0, 19.2, 22.4, 25.6)
    # The x 120 road's west side: deep lots back to the avenue's east lane,
    # the deck coming down across them left open; north of the square, out
    # to the boulevard's corner.
    frontage(D, "+x", -168.0, -10.0, 108.0, 56.0, (24.0, 52.0), w, 8301, ends=("street", "street"), gaps=[(-86.0, -74.0)])
    # Under the line from the Work shot's lens to ARASAKA's name over the
    # board (57 m up at z -284, 90 m at z -344): no higher.
    frontage(D, "+x", -344.0, -284.0, 108.0, 30.0, (30.0, 46.0), w, 8302, ends=("street", "open"))
    # Behind the board's block and up to ARASAKA's: offices round courts.
    blocks(D, 44.0, 78.0, -344.0, -284.0, (28.0, 50.0), 8303)
    blocks(D, 44.0, 118.0, -456.0, -344.0, (30.0, 64.0), 8304, step=28.0)


def corpo():
    D = "corpo"
    w = (16.0, 19.2, 22.4, 25.6)
    # The plaza street's north side through the east lobe (corpo row's back
    # blocks), the x 120 road's east side up to the boulevard, and between
    # them and corpo row's south side the inside of the block.
    frontage(D, "+z", 132.0, 428.0, -190.0, 30.0, (26.0, 48.0), w, 8401, ends=("street", "street"))
    # Beside the Experience shot's lens (30 m up at x 120, z -230): low, so
    # the row's crowns stand over roofs, not behind a wall.
    frontage(D, "-x", -316.0, -220.0, 132.0, 30.0, (14.0, 22.0), w, 8402, ends=("street", "open"))
    # Under the Experience shot's dolly (30 m up along z -230): low, and
    # nothing on the roofs to stand in its lens.
    blocks(D, 162.0, 398.0, -290.0, -220.0, (14.0, 23.0), 8403, step=30.0, style=dict(roof_cap=2.0))
    # The boulevard's north side either end of the towers.
    frontage(D, "+z", 120.0, 136.0, -344.0, 30.0, (60.0, 80.0), (16.0,), 8404, ends=("street", "open"))
    frontage(D, "+z", 392.0, 440.0, -344.0, 30.0, (54.0, 76.0), (16.0, 19.2), 8405, ends=("open", "street"))


def afterlife():
    D = "afterlife"
    # The garage street's west side where AFTERLIFE's and its neighbours'
    # blocks leave it open: at the boulevard's corner, and between the two.
    frontage(D, "+x", -316.0, -300.0, 428.0, 26.0, (24.0, 30.0), (16.0,), 8501, ends=("street", "open"))
    frontage(D, "+x", -262.0, -250.0, 428.0, 18.0, (18.0, 24.0), (12.0,), 8502, ends=("open", "open"))
    # Its east side north of the rooftop's building.
    frontage(D, "-x", -316.0, -300.0, 452.0, 30.0, (30.0, 36.0), (16.0,), 8503, ends=("street", "open"))


def santo():
    D = "santo"
    w = (16.0, 22.4, 28.8, 35.2)
    # Low and wide: the plaza street's south side and the south street's
    # north side through the east lobe, the yards between them, the x 120
    # road's east side, the garage street's south half, and the south
    # street's south side to the city's edge. Under Contact's moon, low.
    frontage(D, "-z", 132.0, 428.0, -168.0, 30.0, (10.0, 22.0), w, 8601, ends=("street", "street"))
    frontage(D, "+z", 132.0, 428.0, -10.0, 30.0, (8.0, 18.0), w, 8602, ends=("street", "street"))
    blocks(D, 162.0, 398.0, -138.0, -40.0, (6.0, 14.0), 8603, step=34.0, style=dict(roof_cap=3.0))
    frontage(D, "-x", -138.0, -40.0, 132.0, 30.0, (12.0, 24.0), w, 8604, ends=("open", "open"))
    frontage(D, "+x", -138.0, -40.0, 428.0, 30.0, (8.0, 18.0), w, 8605, ends=("open", "open"))
    frontage(D, "-x", -176.0, 12.0, 452.0, 30.0, (6.0, 12.0), w, 8606, ends=("open", "open"))
    frontage(D, "-z", 108.0, 482.0, 12.0, 30.0, (8.0, 20.0), w, 8607, ends=("street", "open"))

