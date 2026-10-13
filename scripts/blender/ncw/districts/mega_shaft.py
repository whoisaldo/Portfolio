"""The light well looked up at from its court (Fn9gKhU_2_Q@21): magenta and
pink signs on its walls and hung on the walkways' parapets, the rooms hung
into the shaft lit warm underneath and signed, the low crossing over the
court lit under its deck.

mega_face.py builds the shaft (walls, walkways, bridges, the rail line, the
mouth); this dresses it. Nothing here is seen by the hero's lens (the well
is behind the middle section's face, under its roof).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_face import PODS, RINGED, RING_OUT, underside, wN, wS, wW, wE, LILAC, KTOP

wx0, wx1, wz0, wz1 = WELL
_r = random.Random(8901)


# The court's two walls with no walkway at the first floor (south and east)
# carry the big ones, over the shops' fronts and under the second floor's deck.
L1, L2 = floor_y(1), floor_y(2)
neon_board(wS, 4.0, 15.0, L1 + 0.35, L2 - 0.55, 0.32, "KARAOKE", "magenta", sub="24 H  -  B2  -  4F", sub_hue="cyan")
neon_board(wE, 2.5, 10.5, L1 + 0.35, L2 - 0.55, 0.32, "HOTEL", "pink", sub="-- 3F --", sub_hue="amber")
neon_board(wE, 13.0, 20.5, L1 + 0.5, L2 - 0.7, 0.32, "RAMEN", "amber", sub="+ + +", sub_hue="pink")
# Higher up, where a floor has no walkway on a wall, a short tall one up it.
_tall = 0
for k in range(3, KTOP - 3):
    for f, hue in ((wN, "magenta"), (wE, "pink"), (wW, "magenta"), (wS, "purple")):
        if _tall >= 6 or RINGED.get((f.name, k), True):
            continue
        if any(pf is f and pk0 - 2 <= k <= pk1 + 2 for pf, _, _, pk0, pk1, _ in PODS):
            continue
        s = _r.uniform(3.0, f.width - 3.0)
        vboard(f, s, floor_y(k) + 0.1, _r.choice(("BAR", "DOC", "24H", "INN", "BAR")), hue, w=0.95)
        _tall += 1
# On the walkways' parapets, facing into the shaft, the small ones: a
# landing's bar, a clinic, a room by the hour.
_words = ("BAR", "CLINIC", "ROOMS", "PAWN", "NOODLE", "MOTEL", "24", "OPEN", "SUSHI", "BAR", "ROOMS", "DOC")
_i = 0
for k in (2, 3, 4, 5, 6, 7, 9, 10, 11, 13, 14, 16):
    for f, hue in ((wN, "magenta"), (wW, "pink"), (wE, "magenta"), (wS, "pink")):
        if not RINGED.get((f.name, k)) or (f.name, k) not in RING_OUT or _r.random() < 0.55:
            continue
        out = RING_OUT[(f.name, k)]
        w = _r.uniform(3.2, 5.5)
        s0 = _r.uniform(2.0, f.width - 2.0 - w)
        y = floor_y(k)
        neon_board(f, s0, s0 + w, y + 0.12, y + 0.95, out + 0.18, _words[_i % len(_words)], hue if _r.random() < 0.7 else _r.choice(("cyan", "amber", "white")))
        _i += 1

# The rooms hung into the shaft: lit warm underneath, and the lowest
# (the east wall's, over the court) signed across its front's foot.
for i, (f, s0, s1, k0, k1, out) in enumerate(PODS):
    y0 = floor_y(k0) - 0.3
    underside(f, s0, s1, y0, 0.0, out, _r)
    neon_board(f, s0 + 0.4, s1 - 0.4, y0 + 0.5, y0 + 2.6, out + 0.2, ("KARAOKE", "HOTEL", "CLUB", "BAR", "ROOMS")[i], ("magenta", "pink", "purple", "magenta", "pink")[i],
               sub=("2F  -  OPEN", "24 H", "B1", "OPEN", "3F")[i], sub_hue=("cyan", "white", "amber", "cyan", "white")[i])

# The low crossing over the court (mega_well): warm under its deck.
CY = floor_y(2)
underside(face("+z", -775.3, wx0 + 1.5, wx1 - 1.5), 0.0, wx1 - wx0 - 3.0, CY - 0.3, 0.0, 1.4, _r)
