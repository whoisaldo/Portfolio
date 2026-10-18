"""The light well's court as a place people live round (Fn9gKhU_2_Q@21):
shops lit along its ground floor, two stalls and a food cart, vending
machines, what piles up in the corners, people sat on crates against the
walls; pipes and cable bundles across the shaft low down, where a walker
looking up meets them first; the rim at the top brighter, so the opening
is the strongest light in the shaft.

The court's ground floor is the core's dark boxes (mega.py); its shops
stand 0.4 m proud of them on their own face. Every camera that stands in
the court (mg05, mg-well, mg-well-up, mg-ref-well) keeps 1.5 m clear.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_face import WTOP, LILAC

wx0, wx1, wz0, wz1 = WELL
EYES = ((-4.6, -777.0), (0.0, -768.0), (-10.2, -766.2), (-3.0, -769.0))


def clear(x, z, rad=1.5):
    return all(math.hypot(x - ex, z - ez) > rad for ex, ez in EYES)


_r = random.Random(8901)
PAL = ["pink", "amber", "cyan", "red", "teal", "magenta"]

# Shops along its ground floor, on faces 0.4 m proud of the core's walls,
# each stretch's ends closed down to the wall.
for (name, plane, a0, a1) in (("+z", wz0 + 0.4, -12.6, -7.4), ("-x", wx1 - 0.4, -785.6, -778.2), ("+x", wx0 + 0.4, -785.6, -780.0)):
    f = face(name, plane, a0, a1)
    B.shopfront(D, f, _r, 0.0, f.width, 0, sign_rate=0.8, awning_rate=0.5, door=False, palette=PAL)
    f.quad((D, "trim", 0), 0.0, f.width, SHOP_H - 0.6, SHOP_H, 0.0, col=dim(CONC, 0.8))
    back = face(name, plane - (f.nz or f.nx) * 0.4, a0, a1)
    for s in (0.0, f.width):
        pa, pb = f.p(f.at(s), 0.0, 0.0), back.p(back.at(s), 0.0, 0.0)
        vquad((D, "trim", 0), (pa[0], pa[2]), (pb[0], pb[2]), 0.0, SHOP_H, col=dim(CONC, 0.8), both=True)
    for s in (f.width * 0.3, f.width * 0.75):
        light(D, *f.p(f.at(s), 3.0, 1.4), _r.choice(("amber", "white", "pink")), 4.2)

# Two stalls and a food cart, steam off its pot.
stall(8.6, -783.4, -math.pi / 2, colour="cyan", hue="amber", lanterns=4, customers=2, w=3.4, seed=8902)
stall(-9.2, -776.4, math.pi / 2, colour="red", hue="pink", lanterns=3, customers=1, w=3.0, seed=8903)
P.place("food_cart", 2.0, G0, -783.6, 0.0)
stand(2.0, -784.5, 0.0, "vendor", G0)
stand(1.6, -782.4, math.pi + 0.2, "idle", G0)
stand(2.7, -782.2, math.pi - 0.3, "phone", G0)
empty("anchor_steam_zz_stall_mega_1", (1.8, G0 + 1.25, -783.5))
light(D, 2.0, 2.6, -783.0, "amber", 4.5)
light(D, 7.6, 2.6, -783.4, "amber", 4.0)
light(D, -8.2, 2.6, -776.4, "pink", 4.0)

# What piles up in the corners and along the walls.
for (x, z, name, yaw) in ((0.6, -785.4, "rubbish", 0.0), (-12.2, -770.8, "rubbish", math.pi / 2), (-12.2, -779.2, "pallets", 1.4),
                          (12.2, -769.0, "barrel", 0.0), (12.3, -768.2, "drum", 0.0), (-9.6, -785.3, "rubbish", 0.0)):
    if clear(x, z):
        P.place(name, x, G0, z, yaw)
# People sat against the walls on crates, and a pair talking.
for (x, z, yaw) in ((5.6, -785.4, 0.0), (12.0, -766.6, -math.pi / 2), (-12.1, -781.2 + 0.0, math.pi / 2)):
    if clear(x, z):
        P.place("crates", x, G0, z, yaw)
        stand(x + math.sin(yaw) * 0.55, z + math.cos(yaw) * 0.55, yaw, _r.choice(("sit", "sit", "smoke")), G0 + 0.45)
talkers(1.6, -779.0, G0, n=3, turn=0.4)
stand(-1.2, -782.6, 0.6, "squat", G0)

# Low over the court: pipes across the shaft on brackets, cable bundles.
for (y, z, rr, col) in ((7.2, -781.6, 0.16, RUST), (7.5, -781.1, 0.09, STEEL), (9.6, -767.8, 0.13, TEAL_PAINT), (10.0, -768.3, 0.07, CONC)):
    rpipe((wx0 + 0.2, y, z), (wx1 - 0.2, y, z), rr, col=col, detail=0)
for (y, x, rr, col) in ((8.4, 4.8, 0.12, RUST), (12.6, -6.2, 0.15, STEEL)):
    rpipe((x, y, wz0 + 0.2), (x, y, wz1 - 0.2), rr, col=col, detail=0)
for (a, b, sag, n) in (((wx0 + 0.3, 6.4, -770.0), (wx1 - 0.3, 6.9, -783.0), 1.2, 3), ((wx0 + 0.3, 8.2, -784.0), (wx1 - 0.3, 7.6, -766.0), 1.4, 2),
                       ((-9.0, 11.0, wz0 + 0.3), (6.0, 10.4, wz1 - 0.3), 1.0, 3), ((wx0 + 0.3, 15.5, -765.0), (wx1 - 0.3, 14.8, -785.0), 1.6, 2)):
    bundle(a, b, sag=sag, n=n)

# The rim brighter: a second line of light under the first, lamps between.
for f in (face("+z", wz0, wx0, wx1), face("-z", wz1, wx0, wx1), face("+x", wx0, wz0, wz1), face("-x", wx1, wz0, wz1)):
    f.quad((D, "glow", 0), 0.3, f.width - 0.3, WTOP - 0.95, WTOP - 0.75, 0.025, col=dim(LILAC, 0.8))
    for i in range(4):
        sp = f.width * (i + 0.5) / 4 + 1.2
        fbox(f, (D, "glow", 0), sp - 0.3, sp + 0.3, WTOP - 2.6, WTOP - 2.5, 0.05, 0.6, col=dim(GLOW["white"], 0.9), bottom=True)
