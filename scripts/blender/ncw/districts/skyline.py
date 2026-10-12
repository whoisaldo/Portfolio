from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)

# The skyline over the canyon's end: landmark towers a kilometre off, in the
# band of sky the hero sees between the roofs, each its own design and its
# own dress (no fins outlining its corners: at this distance they drew a
# wireframe). Their outlines are the hero's skyline and do not move; what
# differs from one to the next is what is on them: lit bands at every
# setback and a spire on one, braces across every face of another and a
# band only under its roof, a lit rake, an open crown round a mast, a
# landing deck standing out round the last where its steps begin. The far
# city (src/world/skyline.js) keeps clear of them.
SK = "skyline"


def braces(outline, y0, y1, out=0.5, half=1.1):
    """A megastructure's frame outside its glass: on every face of a plan,
    a pair of steel diagonals crossing each bay (a bay about as high as the
    face is wide), standing `out` proud of the wall."""
    xs = [x for x, _ in outline]
    zs = [z for _, z in outline]
    cx, cz = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
    for (xa, za), (xb, zb) in zip(outline, outline[1:] + outline[:1]):
        length = math.hypot(xb - xa, zb - za)
        if length < 12.0:
            continue
        # Outward, away from the plan's middle.
        nx, nz = (zb - za) / length, -(xb - xa) / length
        if nx * ((xa + xb) / 2 - cx) + nz * ((za + zb) / 2 - cz) < 0:
            nx, nz = -nx, -nz
        a = (xa + nx * out, za + nz * out)
        b = (xb + nx * out, zb + nz * out)
        bays = max(1, round((y1 - y0) / length))
        step = (y1 - y0) / bays
        for i in range(bays):
            lo, hi = y0 + i * step, y0 + (i + 1) * step
            for ya, yb in ((lo, hi), (hi, lo)):
                quad((SK, "metal", 0), (a[0], ya - half, a[1]), (b[0], yb - half, b[1]), (b[0], yb + half, b[1]), (a[0], ya + half, a[1]))


def megatower(x, z, w, h, colour, seed, kind):
    """A landmark, each its own design, all on a podium and lit at their
    setbacks in their own colour:
      needle    an octagonal shaft stepped back three times to a crown and a
                spire
      stack     blocks stacked off centre, each set over to its own side
      blade     a slab whose top is raked from one end to the other
      frame     stepped three times to an open crown, four posts and a lit
                ring round a mast
      ziggurat  a block that steps back five times at the top, like a temple
    """
    r = random.Random(seed)
    col = lambda: (r.uniform(0.55, 0.85), r.randrange(0, 5) / 8.0, r.uniform(0.2, 0.9), 1)  # noqa: E731
    hw = w / 2
    mast = None
    lamp = None
    prism(SK, cut_rect(x, z, hw + 2.5, hw + 2.5, 2.0), SHOP_H, 24.0, seed, col=col())
    band(SK, cut_rect(x, z, hw + 2.5, hw + 2.5, 2.0), 22.6, 24.0, colour, out=0.3)
    if kind == "needle":
        steps = ((24.0, 0.55, 1.0, 0.28), (0.55, 0.78, 0.78, 0.26), (0.78, 0.9, 0.6, 0.24), (0.9, 1.0, 0.44, 0.22))
        for i, (a, b, k, c) in enumerate(steps):
            y0 = a if a > 1 else h * a
            plan = cut_rect(x, z, hw * k, hw * k, hw * k * c)
            prism(SK, plan, y0, h * b, seed + i + 1, col=col())
            band(SK, plan, h * b - 2.6, h * b - 0.4, colour)
        cylinder((SK, "metal", 0), x, z, h, h * 1.17, 1.6, segs=8)
        mast = (x, z, h * 1.17)
    elif kind == "stack":
        # Each block inside the one under it (an overhang would need an
        # underside nobody built), set over toward one side.
        blocks = ((0.0, 0.0, 1.0, 1.0, 24.0, 0.42), (0.08, -0.04, 0.8, 0.86, 0.42, 0.64),
                  (0.0, 0.06, 0.64, 0.66, 0.64, 0.84), (0.04, 0.1, 0.44, 0.46, 0.84, 1.0))
        # A braced megastructure: its frame crosses every face of every
        # block, and it is lit only under its roof (a band at every block
        # and a mast made it the needle over again).
        for i, (ox, oz, kx, kz, a, b) in enumerate(blocks):
            y0 = a if a > 1 else h * a
            plan = cut_rect(x + ox * w, z + oz * w, hw * kx, hw * kz)
            prism(SK, plan, y0, h * b, seed + i + 1, col=col())
            braces(plan, y0, h * b - (3.0 if i == len(blocks) - 1 else 0.0))
            if i == len(blocks) - 1:
                band(SK, plan, h * b - 2.6, h * b - 0.4, colour)
        lamp = (x + 0.04 * w, z + 0.1 * w, h)
    elif kind == "blade":
        lo = cut_rect(x, z, hw, hw * 0.55)
        prism(SK, lo, 24.0, h * 0.8, seed + 1, col=col())
        band(SK, lo, h * 0.8 - 2.6, h * 0.8 - 0.4, colour)
        # The raked top: its walls rise from 0.86 of the height at the west
        # end to the full height at the east, the roof one sloping plane.
        hx, hz = hw * 0.92, hw * 0.5
        y0 = h * 0.8
        top = lambda px: h * 0.86 + (px - (x - hx)) / (2 * hx) * h * 0.14  # noqa: E731
        c2 = col()
        ou, ov = r.uniform(0, 40), r.uniform(0, 40)
        corners = [(x - hx, z + hz), (x + hx, z + hz), (x + hx, z - hz), (x - hx, z - hz)]
        u = ou
        for (xa, za), (xb, zb) in zip(corners, corners[1:] + corners[:1]):
            u1 = u + math.hypot(xb - xa, zb - za) / CELL_W
            ya, yb = top(xa), top(xb)
            quad((SK, "facade", 0), (xa, y0, za), (xb, y0, zb), (xb, yb, zb), (xa, ya, za),
                 ((u, ov + (y0 - SHOP_H) / CELL_H), (u1, ov + (y0 - SHOP_H) / CELL_H),
                  (u1, ov + (yb - SHOP_H) / CELL_H), (u, ov + (ya - SHOP_H) / CELL_H)), c2)
            u = u1
        poly((SK, "roof", 0), [(px, top(px), pz) for px, pz in corners], [(px / 4, pz / 4) for px, pz in corners])
        # Its lit edge, following the rake on both long faces.
        for sz in (1, -1):
            zz = z + sz * (hz + 0.35)
            quad((SK, "neon_" + colour, 0), (x - hx, top(x - hx) - 2.0, zz), (x + hx, top(x + hx) - 2.0, zz),
                 (x + hx, top(x + hx) - 0.4, zz), (x - hx, top(x - hx) - 0.4, zz))
            quad((SK, "neon_" + colour, 0), (x + hx, top(x + hx) - 2.0, zz), (x - hx, top(x - hx) - 2.0, zz),
                 (x - hx, top(x - hx) - 0.4, zz), (x + hx, top(x + hx) - 0.4, zz))
        # (Its lit rake is its head: no mast.)
        lamp = (x + hx * 0.7, z, h)
    elif kind == "frame":
        steps = ((24.0, 0.6, 1.0, 0.2), (0.6, 0.84, 0.82, 0.18), (0.84, 0.94, 0.68, 0.16))
        for i, (a, b, k, c) in enumerate(steps):
            y0 = a if a > 1 else h * a
            plan = cut_rect(x, z, hw * k, hw * k, hw * k * c)
            prism(SK, plan, y0, h * b, seed + i + 1, col=col())
            band(SK, plan, h * b - 2.6, h * b - 0.4, colour)
        # The open crown: four posts, a lit ring at their heads, a cross of
        # beams, and the mast standing up through it.
        q = hw * 0.58
        for sx, sz in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
            box((SK, "metal", 0), x + sx * q - 0.9, x + sx * q + 0.9, h * 0.94, h, z + sz * q - 0.9, z + sz * q + 0.9, scale=1.0)
        walls((SK, "neon_" + colour, 0), cut_rect(x, z, q + 1.0, q + 1.0), h - 2.2, h - 0.6, (1, 1, 1, 1))
        walls((SK, "metal", 0), cut_rect(x, z, q + 0.9, q + 0.9), h - 0.6, h + 0.6, (1, 1, 1, 1))
        box((SK, "metal", 0), x - q, x + q, h - 0.5, h + 0.3, z - 0.5, z + 0.5, scale=1.0)
        box((SK, "metal", 0), x - 0.5, x + 0.5, h - 0.5, h + 0.3, z - q, z + q, scale=1.0)
        cylinder((SK, "metal", 0), x, z, h * 0.94, h * 1.1, 1.3, segs=8)
        mast = (x, z, h * 1.1)
    else:
        body = cut_rect(x, z, hw, hw)
        prism(SK, body, 24.0, h * 0.7, seed + 1, col=col())
        # Where its steps begin, a landing deck stands out round it, its
        # edge the tower's light.
        deck = cut_rect(x, z, hw + 7.0, hw + 7.0, 5.0)
        prism(SK, deck, h * 0.7 - 2.5, h * 0.7 - 0.3, seed + 9, mat="metal", roof_mat="roof")
        poly((SK, "metal", 0), [(px, h * 0.7 - 2.5, pz) for px, pz in reversed(deck)], [(px / 4, pz / 4) for px, pz in deck])
        band(SK, deck, h * 0.7 - 1.9, h * 0.7 - 0.9, colour, out=0.3)
        for i in range(5):
            k = 1.0 - (i + 1) * 0.12
            plan = cut_rect(x, z, hw * k, hw * k)
            a, b = h * (0.7 + i * 0.06), h * (0.76 + i * 0.06)
            prism(SK, plan, a, b, seed + i + 2, col=col())
            band(SK, plan, b - 1.6, b - 0.4, colour)
        lamp = (x, z, h)
    # The mast and its light, on the two that have one; a red lamp on the
    # roof of the rest.
    if mast:
        mx, mz, my = mast
        box((SK, "metal", 0), mx - 0.6, mx + 0.6, h * 0.98, my, mz - 0.6, mz + 0.6, scale=1.0)
        box((SK, "neon_red", 0), mx - 1.6, mx + 1.6, my, my + 2.6, mz - 1.6, mz + 1.6, scale=1.0)
    else:
        lx, lz, ly = lamp
        box((SK, "neon_red", 0), lx - 1.3, lx + 1.3, ly, ly + 2.0, lz - 1.3, lz + 1.3, scale=1.0)


MEGATOWERS = [
    (-150.0, -900.0, 50.0, 330.0, "cyan", "needle"),
    (-300.0, -1150.0, 60.0, 420.0, "pink", "stack"),
    # Clear of the holographic figure: behind her, it cut her in two.
    (-190.0, -1400.0, 56.0, 480.0, "purple", "blade"),
    (120.0, -1400.0, 60.0, 520.0, "blue", "frame"),
    (330.0, -1000.0, 46.0, 300.0, "amber", "ziggurat"),
]
for i, (x, z, w, h, colour, kind) in enumerate(MEGATOWERS):
    megatower(x, z, w, h, colour, 5200 + i * 17, kind)
    empty(f"anchor_mega_{i}", (x, h, z), props={"size": w})
