"""The city's plan: its streets, its districts and the loop, as data.

Every street is a straight run along x or along z (the deck and its ramp are
the deck district's own structure over the west street and the avenue). A
street has a centre line, a half carriageway (kerb to the middle) and a
pavement out to the lot line, where a building's ground floor stands. Where
two streets cross or meet is a junction, worked out here, not drawn by hand.
Nothing in this module touches Blender: streets.py builds the ground from
it, the districts cut their lots from it, exports.py writes the road graph.

See design/night-city-world/BIBLE.md for why the city is laid out this way.
"""
from dataclasses import dataclass, field


@dataclass
class Street:
    name: str
    axis: str            # "z": runs north-south at x = c; "x": runs east-west at z = c
    c: float             # the centre line's fixed coordinate
    a: float             # where it runs from, along its axis (the lower value)
    b: float             # and to (the higher)
    half: float          # half the carriageway, centre line to kerb face
    walk: float          # pavement, kerb face to lot line
    lanes: int = 2       # lanes each way
    bay: float = 0.0     # a kerbside parking or loading bay, each side, metres
    district: str = ""
    loop: bool = False   # part of the loop (some of it, see LOOP)
    speed: float = 13.9  # m/s, for the road graph
    ends: dict = field(default_factory=dict)  # "a"/"b": "open" (meets a street) or "court" (a turning court) or "gate"

    @property
    def lot(self):
        """Distance from the centre line to the lot line."""
        return self.half + self.walk


# The network. Centre lines in world metres (BIBLE.md, "The streets").
STREETS = [
    # The hero's avenue and, past the plaza street, the canyon: one street,
    # x 0, from the avenue's south arm (its end against Santo Domingo's yard
    # wall) to the megabuilding street.
    Street("avenue", "z", 0.0, -720.0, 88.0, half=10.0, walk=4.0, lanes=2, bay=2.6, district="avenue", loop=True,
           ends={"a": "open", "b": "gate"}),
    Street("megabuilding", "x", -720.0, -80.0, 60.0, half=8.0, walk=4.0, lanes=2, district="mega", loop=True,
           ends={"a": "open", "b": "court"}),
    Street("west", "z", -80.0, -720.0, 1.0, half=10.0, walk=4.0, lanes=2, district="japantown", loop=True,
           ends={"a": "open", "b": "open"}),
    # The plaza street: past the plaza it runs on through the east lobe to
    # the garage street, corpo row's back blocks on its north, Santo
    # Domingo on its south.
    Street("plaza", "x", -179.0, -80.0, 440.0, half=7.0, walk=4.0, lanes=1, bay=2.4, district="plaza",
           ends={"a": "open", "b": "open"}),
    Street("south", "x", 1.0, -80.0, 440.0, half=7.0, walk=4.0, lanes=2, district="santo", loop=True,
           ends={"a": "open", "b": "open"}),
    Street("x120", "z", 120.0, -330.0, 1.0, half=8.0, walk=4.0, lanes=2, district="plaza", loop=True,
           ends={"a": "open", "b": "open"}),
    Street("boulevard", "x", -330.0, 120.0, 440.0, half=9.0, walk=5.0, lanes=2, district="corpo", loop=True,
           ends={"a": "open", "b": "open"}),
    Street("garage", "z", 440.0, -330.0, 1.0, half=8.0, walk=4.0, lanes=1, bay=2.4, district="afterlife", loop=True,
           ends={"a": "open", "b": "open"}),
]
BY_NAME = {s.name: s for s in STREETS}

# The deck: the loop's crossing over the avenue, elevated (the deck district
# builds it). Its top at DECK_Y over the avenue; down to grade going east by
# DECK_LAND_X; up from grade on the west street (going south) from
# RAMP_FOOT_Z to its top at the turn.
DECK_Z = -80.0
DECK_HALF = 5.0
DECK_Y = 8.5
DECK_UNDER = 7.2
DECK_X0, DECK_X1 = -80.0, 120.0
DECK_TOP_X1 = 20.0       # level from the west turn to here, then down
DECK_LAND_X = 110.0      # at grade from here to the x 120 road
RAMP_FOOT_Z = -220.0     # the west street's ramp leaves grade here going south
RAMP_HALF = 5.0

# The loop, as junctions in order (BIBLE.md): A B C L P Q F E I H A.
LOOP = [("A", (0.0, 1.0)), ("B", (0.0, -179.0)), ("C", (0.0, -720.0)), ("L", (-80.0, -720.0)),
        ("P", (-80.0, -80.0)), ("Q", (120.0, -80.0)), ("F", (120.0, -179.0)), ("E", (120.0, -330.0)),
        ("I", (440.0, -330.0)), ("H", (440.0, 1.0))]

# Districts: name -> (x0, z0, x1, z1) territory, and its label. A district
# owns the lots whose footprint centre is inside its territory; the first
# listed wins where two overlap (the set pieces' districts first).
DISTRICTS = [
    ("afterlife", (380.0, -330.0, 520.0, -176.0), "The Afterlife Block"),
    ("corpo", (108.0, -420.0, 470.0, -186.0), "Corpo Row"),
    ("deck", (-94.0, -95.0, 132.0, -65.0), "The Deck"),
    ("plaza", (14.0, -330.0, 170.0, -60.0), "Corpo Plaza"),
    ("avenue", (-66.0, -186.0, 108.0, 100.0), "Kabuki Avenue"),
    ("canyon", (-66.0, -560.0, 132.0, -186.0), "The Canyon"),
    ("mega", (-94.0, -900.0, 132.0, -560.0), "The Megabuilding"),
    ("japantown", (-170.0, -740.0, -66.0, 12.0), "Japantown"),
    ("santo", (108.0, -186.0, 580.0, 120.0), "Santo Domingo"),
]


def district_at(x, z):
    for name, (x0, z0, x1, z1), _ in DISTRICTS:
        if x0 <= x <= x1 and z0 <= z <= z1:
            return name
    return "far"


def crosses(s, t):
    """Where street s meets street t, (x, z), or None."""
    if s.axis == t.axis:
        return None
    zs, xs = (s, t) if s.axis == "z" else (t, s)
    x, z = zs.c, xs.c
    eps = 1e-6
    if zs.a - eps <= z <= zs.b + eps and xs.a - eps <= x <= xs.b + eps:
        return (x, z)
    return None


def junctions():
    """Every junction: (x, z) -> list of the streets meeting there."""
    out = {}
    for i, s in enumerate(STREETS):
        for t in STREETS[i + 1:]:
            p = crosses(s, t)
            if p is not None:
                out.setdefault(p, set()).update((s.name, t.name))
    return {p: sorted(v) for p, v in out.items()}


def junction_box(p, names):
    """The square a junction's carriageways fill: x0, x1, z0, z1."""
    hx = max((BY_NAME[n].half for n in names if BY_NAME[n].axis == "z"), default=0.0)
    hz = max((BY_NAME[n].half for n in names if BY_NAME[n].axis == "x"), default=0.0)
    return (p[0] - hx, p[0] + hx, p[1] - hz, p[1] + hz)


def runs(s):
    """A street's carriageway between its junctions: a list of (a, b) along
    its axis, junction squares cut out."""
    cuts = []
    for p, names in junctions().items():
        if s.name not in names:
            continue
        x0, x1, z0, z1 = junction_box(p, names)
        cuts.append((z0, z1) if s.axis == "z" else (x0, x1))
    cuts.sort()
    out, at = [], s.a
    for c0, c1 in cuts:
        if c0 > at:
            out.append((at, c0))
        at = max(at, c1)
    if at < s.b:
        out.append((at, s.b))
    return out
