"""The S6's engine bay: the 4.0 TFSI hot V. Executed in build_s6.py's context.

Laid out from Ali's photo (`s6-engine-bay.jpg`, taken with the engine cover
off, from the front of the car looking back; image left is the car's right)
and the layout in Audi's SSP 920223 (pages 58, 59 and 63):

- the cowl: dusty black plastic with two perforated grilles, a lid and the
  blue washer filler, a thick rubber seal along its front edge that bows
  back in the middle, and crinkled foil on the bulkhead under it;
- the hot V: two gold heat shields formed over the manifolds and turbines,
  a perforated shield behind them, two silver compressor housings, bent
  steel oil and coolant lines arching over them;
- the charge path: two short glossy black couplers from the compressors
  forward into two throttle housings on a common shaft, then the silver end
  face of the charge-air cooler with its screws, its barcode and its yellow
  warning label, black coolant hoses across its front;
- the intake: one airbox at the car's right front, two smooth black ducts,
  ribbed bellows with silver clamps and two aluminium pipes turning into the
  compressors (the rear one into the right turbo, the front one under the
  couplers into the left);
- on the banks: a high-pressure fuel pump with a big silver cap on each, the
  black oil filler and the oil separator on the left bank, the brown braided
  breather hose across the throttles; the pale translucent coolant tank and
  its blue cap on the car's left, the chrome air-conditioning line behind it;
- the body around it: the fender gutters and inner wings in body colour,
  the strut domes under the cowl, the lock carrier across the front.

No engine cover: the photo has it off, and the cooler's label says so.
These are modelled visual approximations; the engine's internals are not
represented.

Frame: the `engine_bay` empty, +X the car's left, -Y forward, Z up, z = 0 at
the hood's seam, y = 0 at the middle of the bay. The build places the empty
in the body (ENGINE_AT) and pitches it by BAY_PITCH; the body-side pieces
are built from the hood's outline in the car's frame and brought into the
bay's with local().
"""

engine = empty('engine_bay', ENGINE_AT, body)
BAY_PITCH = math.radians(6.3)   # build_s6.py sets engine.rotation_euler.x to this


def local(p):
    """A point in the car's frame, in the pitched bay's."""
    d = Vector(p) - Vector(ENGINE_AT)
    c, s = math.cos(BAY_PITCH), math.sin(BAY_PITCH)
    return Vector((d.x, d.y * c + d.z * s, -d.y * s + d.z * c))


def car_frame(p):
    """The inverse of local(): a bay point in the car's frame."""
    c, s = math.cos(BAY_PITCH), math.sin(BAY_PITCH)
    return Vector(ENGINE_AT) + Vector((p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c))


def wheel_well_roof(y):
    """Height of the front wheel well's roof over station y (A1's
    build_wheel_wells), plus a little clearance; -1 clear of the wheel."""
    dy, r = abs(y - ARCH_Y['f']), ARCH_R['f'] + .012
    return WHEEL_R + math.sqrt(r * r - dy * dy) + .015 if dy < r else -1


def clear_wheel_well(obj):
    """Shape a part round the front wheel well: anything outboard of the
    well's inner wall (x .60) is lifted onto its roof, as the moulding sits
    on the wing there, so nothing shows through the arch."""
    for v in obj.data.vertices:
        p = car_frame(obj.matrix_basis @ v.co)
        if abs(p.x) > .585 and p.z < wheel_well_roof(p.y):
            p.z = wheel_well_roof(p.y)
            v.co = obj.matrix_basis.inverted() @ local(p)
    obj.data.update()
    return obj


def grain(x, y):
    """A fixed pseudo-random value in 0..1 for pixel (x, y)."""
    return ((x * 73856093 ^ y * 19349663 ^ (x * y * 83492791)) % 1009) / 1009


dimples = lambda tint: pattern('S6_dimpled_' + tint[0], 32, lambda x, y: tuple(
    c * (.72 + .28 * math.cos((x % 8 - 3.5) / 4 * math.pi) * math.cos((y % 8 - 3.5 + 4 * ((x // 8) % 2)) / 4 * math.pi)) for c in tint[1]) + (1,))
# The gold shields are dimpled sheet like the foil, formed over the hot side.
gold = textured(material('S6_turbo_heat_wrap', 'd8bd8a', .95, .32), dimples(('gold', (.72, .58, .36))))
foil = textured(material('S6_heat_shield_foil', 'c9c9c4', .9, .34), dimples(('foil', (.55, .55, .52))))
# Black textured plastic: a fine grain about 2.5 cm a tile, so the ducts,
# the airbox and the covers read as moulded plastic, not paint.
plastic = textured(material('S6_engine_textured_plastic', '1d1f21', .0, .74), pattern('S6_plastic_grain', 32, lambda x, y: tuple(
    c * (.78 + .44 * grain(x, y)) for c in (.026, .027, .029)) + (1,)))
# The cowl is a lighter, dusty grey.
cowl_plastic = material('S6_cowl_plastic', '45474a', .0, .86)
hexes = pattern('S6_cowl_mesh', 32, lambda x, y: (lambda d: (.07, .072, .075, 1) if d else (.006, .006, .007, 1))(
    ((x + 8 * ((y // 7) % 2)) % 16 in (0, 1)) or (y % 7 == 0)))
mesh_mat = textured(material('S6_cowl_honeycomb_mesh', '1a1a1c', .1, .55), hexes)
TILED.update({gold, foil, plastic, mesh_mat})


def labels_image(x, y):
    """The cooler's two labels in one image: its yellow warning label on the
    top half (black border, warning triangle, a bold heading and four lines
    of text), the white barcode label under it."""
    ink = (.012, .012, .012, 1)
    if y >= 32:
        v = y - 32
        if x in (0, 63) or v in (0, 31):
            return ink
        if 3 <= v <= 13 and 3 <= x <= 13 and abs(x - 8) <= (13 - v) // 2 + 1:
            return ink if not (abs(x - 8) <= (11 - v) // 2 - 1 and 5 <= v <= 11) or (x == 8 and v in (6, 8, 9, 10)) else (.80, .54, .012, 1)
        if (v in (4, 5, 7, 8, 10, 11) and 17 <= x <= 40 - 4 * (v % 3 == 1)) or (v in (16, 19, 22, 25, 28) and 3 <= x <= 60 - 7 * (v % 2)):
            return ink
        return (.80, .54, .012, 1)
    if 4 <= y <= 18 and 4 <= x <= 36 and (x * 7 % 5) < 2:
        return ink
    if y in (24, 27) and 4 <= x <= 54:
        return ink
    return (.78, .78, .74, 1)


labels = textured(material('S6_cooler_labels', 'e7c21c', 0, .5), pattern('S6_cooler_labels', 64, labels_image))
cast = material('S6_cast_aluminium', 'a7a9a7', .72, .44)
dull_cast = material('S6_dull_cast_aluminium', '8a8d8b', .55, .55)
pump_cast = material('S6_fuel_pump_cast', 'b49d78', .6, .45)
pump_cap = material('S6_fuel_pump_cap', 'aeb1b1', .85, .4)
brass = material('S6_brass_fitting', 'b8913f', .9, .35)
iron = material('S6_cast_iron_turbine', '4a4440', .6, .62)
head = material('S6_engine_dark_cast', '303234', .45, .6)
black = material('S6_engine_black_plastic', '141517', .02, .6)
silicone = material('S6_black_silicone_hose', '0d0e0f', .05, .18, .7)
hose = material('S6_rubber_hose', '151618', 0, .72)
braid = material('S6_braided_breather_hose', '4a3a31', 0, .86)
steel = material('S6_steel_lines', 'c8cbcd', .95, .2)
alu_pipe = material('S6_aluminium_intake_pipe', 'b9bcbc', .9, .3)
tank = material('S6_coolant_tank', '9b9a92', 0, .3)
coolant = material('S6_coolant_seen_through_tank', '85817c', 0, .34)
paper = material('S6_pipe_label_paper', 'c9b27a', 0, .6)
cap_blue = material('S6_reservoir_cap_blue', '2a73b6', .03, .4)
orange = material('S6_oil_cap_marking', 'd9861a', 0, .5)
shadow = material('S6_bay_shadow', '060607', 0, .95)
adapter = material('S6_throttle_adapter', '3d4044', .15, .36)


def place(objects, matrix):
    """Bake matrix (and each object's own placement) into its mesh."""
    for obj in objects:
        obj.data.transform(matrix @ obj.matrix_basis)
        obj.matrix_basis = Matrix()
    return objects


def crumple(obj, amount, scale=40, seed=0., uv=1.):
    """Push each vertex along its normal by a fixed noise (formed foil:
    broad dents and finer creases); uv scales its texture's tiling."""
    from mathutils import noise
    for v in obj.data.vertices:
        q = v.co * scale + Vector((seed, seed * 1.7, 0))
        v.co += v.normal * amount * (noise.noise(q) + .45 * noise.noise(q * 2.7))
    for layer in obj.data.uv_layers:
        for loop in layer.data:
            loop.uv *= uv
    obj.data.update()
    return obj


def frame_at(direction):
    d = Vector(direction).normalized()
    u = d.cross(Vector((0, 0, 1)) if abs(d.z) < .9 else Vector((1, 0, 0))).normalized()
    return d, u, d.cross(u)


def clamp(at, toward, radius, mat=steel):
    """A worm-drive band round a hose at `at`, its screw housing on top."""
    d, u, v = frame_at(Vector(toward) - Vector(at))
    at = Vector(at)
    tube('hose_clamp', [at - d * .006, at + d * .006], radius + .003, mat, engine, sides=12)
    up = max([u, -u, v, -v], key=lambda w: w.z)
    box('clamp_screw', tuple(at + up * (radius + .008)), (.016, .016, .012), mat, engine, 0)


def ribbed(name, path, radius, rib, count, mat):
    """A tube whose radius rises and falls `count` times: bellows, a rubber boot."""
    n = len(path)
    radii = [radius + rib * (1 if (i * 2 * count // max(1, n - 1)) % 2 else 0) for i in range(n)]
    return tube(name, path, radius, mat, engine, sides=16, radii=radii)


def resample_path(points, count):
    """count points evenly along the polyline points."""
    pts = [Vector(p) for p in points]
    lengths = [0]
    for a, b in zip(pts, pts[1:]):
        lengths.append(lengths[-1] + (b - a).length)
    out = []
    for k in range(count):
        d = lengths[-1] * k / (count - 1)
        i = max(j for j in range(len(lengths)) if lengths[j] <= d + 1e-9)
        i = min(i, len(pts) - 2)
        t = (d - lengths[i]) / max(1e-9, lengths[i + 1] - lengths[i])
        out.append(pts[i].lerp(pts[i + 1], t))
    return out


def duct(name, path, widths, heights, mat, sides=20):
    """A tube of elliptical section along path: a half-width level across it
    and a half-height at right angles, one of each per point."""
    vs, n = [], len(path)
    for i, p in enumerate(path):
        d, u, v = frame_at(path[min(i + 1, n - 1)] - path[max(i - 1, 0)])
        for j in range(sides):
            t = j * 2 * math.pi / sides
            vs.append(tuple(p + widths[i] * math.cos(t) * u + heights[i] * math.sin(t) * v))
    fs = [(i * sides + j, i * sides + (j + 1) % sides, (i + 1) * sides + (j + 1) % sides, (i + 1) * sides + j) for i in range(n - 1) for j in range(sides)]
    return mesh(name, vs, fs, mat, engine, True)


def bent(points, radius=.0058, corner=.016):
    """A rigid steel line through points, each corner bent round."""
    pts = [Vector(p) for p in points]
    path = [pts[0]]
    for a, b, c in zip(pts, pts[1:], pts[2:]):
        r = min(corner, (b - a).length / 2, (c - b).length / 2)
        p0, p1 = b + (a - b).normalized() * r, b + (c - b).normalized() * r
        path += [p0.lerp(b, t).lerp(b.lerp(p1, t), t) for t in (0, .33, .67, 1)]
    path.append(pts[-1])
    return tube('turbo_feed_line', path, radius, steel, engine, sides=6)


# ---- The body round the bay ----

# Fender gutters and inner wings, in body colour, from the hood's shut line
# in the car's frame: a lip just inboard of the shut line, under the hood's
# edge, the gutter, then the inner wing falling into the dark. Across the bay
# (inboard from the shut line, down from it): lip, gutter floor, gutter wall,
# inner wing.
GUTTER = [(.012, -.008), (.018, -.017), (.03, -.026), (.075, -.03), (.092, -.04), (.104, -.085), (.11, -.2), (.12, -.36)]
for sign in [-1, 1]:
    vs, rows = [], 0
    for k in range(14):
        y = lerp(-2.07, -1.03, k / 13)
        edge, top = hood_halfwidth(y), interp(HOOD_EDGE_Z, y)
        # Over the front wheel the wing stops at the wheel well's roof and
        # steps in to its inner wall (x .60), so it never shows in the arch.
        floor = max(top + GUTTER[-1][1], wheel_well_roof(y))
        for inward, down in GUTTER:
            vs.append(tuple(local((sign * (edge - inward), y, max(top + down, floor)))))
        for x, z in [(.59, floor), (.59, min(floor, top + GUTTER[-1][1]))]:
            vs.append(tuple(local((sign * x, y, z))))
        rows += 1
    m = len(GUTTER) + 2
    fs = [(i * m + j, i * m + j + 1, (i + 1) * m + j + 1, (i + 1) * m + j) for i in range(rows - 1) for j in range(m - 1)]
    mesh('fender_gutter', vs, fs if sign < 0 else [f[::-1] for f in fs], paint, engine, True)
    # Ahead of the gutter the wing turns in behind the headlamp.
    a, b = local((sign * (hood_halfwidth(-2.07) - .11), -2.07, .72)), local((sign * .42, -2.16, .72))
    box('wing_front_closure', tuple((a + b) / 2 + Vector((0, 0, -.06))), (abs(a.x - b.x) + .02, .03, .18), paint, engine, .01)
    # The strut dome sits back under the cowl, beside the seal's end.
    cylinder('strut_dome', (sign * .56, .33, -.13), .085, .05, paint, engine, 24)
    cylinder('strut_top_cap', (sign * .56, .33, -.08), .05, .01, black, engine, 16)
# A dark floor under it all, kept inside the body's outline and above its
# bottom so it never shows below the bumper.
box('bay_floor', (0, -.03, -.56), (1.2, .95, .03), shadow, engine, 0)

# The lock carrier across the front: a black plastic top over the radiator,
# the latch in the middle and the headlamps' backs at its ends.
front = local((0, -2.16, .78))
box('lock_carrier_top', tuple(front + Vector((0, .0, -.035))), (.86, .1, .025), plastic, engine, .008)
box('lock_carrier_riser', tuple(front + Vector((0, .055, -.1))), (.8, .02, .13), plastic, engine, .006)
box('bonnet_latch', tuple(front + Vector((0, .005, -.012))), (.07, .045, .028), head, engine, .006)
# Behind it the radiator's top tank and the fan shroud, dark in the gaps
# between the hoses.
box('radiator_top_tank', tuple(front + Vector((0, .12, -.17))), (1.0, .09, .07), plastic, engine, .015)
box('fan_shroud', tuple(front + Vector((0, .2, -.27))), (1.0, .06, .14), black, engine, .01)
for sign in [-1, 1]:
    box('headlamp_back', tuple(front + Vector((sign * .54, .05, -.07))), (.22, .1, .11), black, engine, .025)
    cylinder('headlamp_back_cap', tuple(front + Vector((sign * .56, .09, -.06))), .04, .025, black, engine, 16, 'Y')

# ---- The cowl ----

# The cowl's front edge, where the seal runs: well back in the middle,
# forward at the ends over the strut domes.
seal_y = lambda x: .43 - .17 * min(1, abs(x) / .74) ** 2
seal_z = lambda x: -.05 - .045 * min(1, abs(x) / .78) ** 3
cols = [lerp(-.8, .8, k / 16) for k in range(17)]
rows = [(0, -.004), (.06, .006), (.14, .03), (.2, .045)]   # (back from the seal, up from the seal)
vs = [(x, seal_y(x) + back, seal_z(x) + up + .012) for back, up in rows for x in cols]
fs = [(i * 17 + j, i * 17 + j + 1, (i + 1) * 17 + j + 1, (i + 1) * 17 + j) for i in range(len(rows) - 1) for j in range(16)]
mesh('cowl_panel', vs, fs, cowl_plastic, engine, True)
# A perforated grille each side of the lid, and the washer filler.
for x0, x1 in [(-.7, -.12), (.2, .66)]:
    gv = []
    for back, up in [(.035, .009), (.15, .036)]:
        for x in [x0 + (.04 if back < .1 else 0), x1 - (.03 if back < .1 else 0)]:
            gv.append((x, seal_y(x) + back, seal_z(x) + up + .015))
    mesh('cowl_grille', gv, [(0, 1, 3, 2)], mesh_mat, engine)
box('cowl_lid', (.08, seal_y(.08) + .17, seal_z(.08) + .055), (.17, .07, .012), cowl_plastic, engine, .004)
cylinder('washer_filler_cap', (.53, seal_y(.53) + .16, seal_z(.53) + .036), .03, .014, cap_blue, engine, 24)
seal = [(x, seal_y(x) - .006, seal_z(x)) for x in [lerp(-.8, .8, k / 20) for k in range(21)]]
tube('cowl_seal', seal, .015, hose, engine, sides=10)

# Crinkled foil on the bulkhead under the seal, and the perforated shield
# behind the turbos.
vs = []
for k in range(17):
    x = lerp(-.5, .44, k / 16)
    for down, back in [(.0, -.01), (.06, -.04), (.13, -.05)]:
        vs.append((x, seal_y(x) - .02 + back, seal_z(x) - .01 - down))
fs = [(k * 3 + j, k * 3 + j + 1, (k + 1) * 3 + j + 1, (k + 1) * 3 + j) for k in range(16) for j in range(2)]
crumple(mesh('bulkhead_foil', vs, fs, foil, engine, True, 30), .016, 18, 0, .5)
vs = []
for i in range(11):
    x = -.32 + i * .064
    for z in [-.3, -.15, -.035]:
        vs.append((x, .36 - .07 * (z + .3) / .265 - .03 * (x / .32) ** 2, z + .015 * math.cos(x * 4)))
fs = [(i * 3 + j, (i + 1) * 3 + j, (i + 1) * 3 + j + 1, i * 3 + j + 1) for i in range(10) for j in range(2)]
mesh('turbo_heat_shield', vs, fs, foil, engine, True, 26)

# ---- The block, the banks and the intake manifolds outside them ----

box('engine_block', (0, -.04, -.47), (.46, .56, .12), head, engine, .02)
for sign in [-1, 1]:
    for name, distance, size, mat in [('cylinder_head', .32, (.20, .54, .13), head), ('cam_cover', .41, (.17, .52, .05), black)]:
        obj = box(name, (0, 0, 0), size, mat, engine, .015)
        obj.location = (sign * distance * math.sin(math.pi / 4), -.04, -.57 + distance * math.cos(math.pi / 4))
        obj.rotation_euler = (0, sign * math.pi / 4, 0)
    obj = box('intake_manifold', (0, 0, 0), (.1, .5, .12), plastic, engine, .02)
    obj.location = (sign * .41, -.05, -.26)
    obj.rotation_euler = (0, -sign * .5, 0)
    for k in range(4):
        box('injector_connector', (sign * .35, -.24 + k * .12, -.2), (.03, .025, .02), black, engine, 0)

# ---- The hot V ----

TURBO = {s: Vector((s * .105, .1, -.125)) for s in [-1, 1]}


def shield_height(sign, c, s, t):
    """The gold shield's crown over a turbo at (s across from inboard to
    outboard, t from the compressor's back to the bulkhead), both 0..1: high
    over the turbine, falling away to the bank's ports outboard and behind."""
    return c.z + .118 - .25 * (s - .3) ** 2 - .4 * max(0, s - .6) ** 2 - .07 * (2 * t - .8) ** 2


def shield_point(sign, c, s, t):
    return Vector((lerp(c.x - sign * .04, sign * .275, s), lerp(c.y - .01, c.y + .25, t), shield_height(sign, c, s, t)))


for sign, c in TURBO.items():
    # Gold shields: a dimpled sheet formed over the turbine behind the
    # compressor, its edges rolled under and studded where it bolts down, and
    # the broad shoulder of shield that sweeps from high behind the compressor
    # round its outboard side and down in front of it, over the manifold and
    # the downpipe. The shoulder is what reads in Ali's photo.
    nx, ny = 8, 6
    vs = []
    for j in range(ny + 1):
        for i in range(nx + 1):
            p = shield_point(sign, c, i / nx, j / ny)
            if i == 0 or j in (0, ny):
                p.z -= .028
                p.y += .012 if j == 0 else -.012 if j == ny else 0
                p.x += sign * .012 if i == 0 else 0
            vs.append(tuple(p))
    fs = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
    crumple(mesh('turbo_heat_wrap', vs, fs if sign > 0 else [f[::-1] for f in fs], gold, engine, True, 40), .006, 26, sign)
    sweep = resample_path(smooth_path([(sign * .05, c.y + .15, c.z + .05), (sign * .13, c.y + .13, c.z + .07), (sign * .2, c.y + .07, c.z + .055), (sign * .228, c.y - .01, c.z + .015), (sign * .236, c.y - .08, c.z - .04), (sign * .24, c.y - .14, c.z - .1)], 4), 18)
    widths = [.06 + .02 * math.sin(math.pi * min(1, i / 12)) for i in range(18)]
    heights = [.042 + .006 * math.sin(math.pi * i / 17) for i in range(18)]
    crumple(duct('turbo_heat_wrap', sweep, widths, heights, gold, 14), .006, 24, 2 + sign, .5)
    for s, t in [(.22, .3), (.5, .22), (.3, .72), (.62, .62)]:
        p = shield_point(sign, c, s, t)
        cylinder('shield_stud', tuple(p + Vector((0, 0, -.004))), .009, .012, head, engine, 6)
    # Silver compressor: a rotational cover with a bolted inlet flange, a cast
    # shoulder across its top and the outlet leaving its top on the inboard
    # side; the wastegate actuator's can on the outboard side.
    compressor = lathe('turbo_compressor_housing', [(-.068, .039), (-.066, .045), (-.05, .045), (-.046, .05), (-.034, .066), (-.018, .077), (-.002, .08), (.008, .076), (.014, .056), (.014, .03)], cast, engine, 24, 'Y')
    compressor.location = c
    lathe('compressor_inlet_ring', [(-.066, .046), (-.066, .056), (-.056, .056), (-.056, .046)], dull_cast, engine, 20, 'Y').location = c
    for k in range(6):
        a = k * math.pi / 3 + math.pi / 6
        cylinder('compressor_flange_bolt', tuple(c + Vector((.06 * math.cos(a), -.072, .06 * math.sin(a)))), .006, .008, steel, engine, 6, 'Y')
    shoulder = box('compressor_shoulder', (0, 0, 0), (.075, .06, .03), cast, engine, .01)
    shoulder.location = c + Vector((sign * .032, -.02, .06))
    shoulder.rotation_euler = (0, sign * .45, 0)
    box('compressor_outlet_flange', tuple(c + Vector((-sign * .05, -.03, .095))), (.075, .06, .012), dull_cast, engine, .004)
    neck = [c + Vector((-sign * .045, -.006, .05)), c + Vector((-sign * .052, -.03, .075))]
    tube('turbo_outlet_neck', neck, .037, cast, engine, sides=16)
    cylinder('wastegate_actuator', tuple(c + Vector((sign * .085, -.035, .0))), .027, sign * .032, black, engine, 14, 'X')
    tube('wastegate_rod', [c + Vector((sign * .1, -.035, .0)), c + Vector((sign * .1, .05, .0))], .004, steel, engine, sides=5)
    lathe('turbo_turbine_housing', [(.014, .03), (.014, .045), (.03, .062), (.07, .064), (.09, .05), (.09, .0)], iron, engine, 16, 'Y').location = c
    # The black coupler forward from the outlet onto its throttle adapter.
    top = Vector((sign * .062, -.14, -.128))
    path = smooth_path([neck[1], c + Vector((-sign * .052, -.07, .078)), (sign * .062, -.08, -.08), top], 5)
    tube('charge_pipe_silicone', path, .04, silicone, engine, sides=18)
    clamp(path[2], path[3], .04)
    clamp(path[-3], path[-1], .04)
    # The black adapter under the clamp, upright between the coupler and the
    # passage: a socket for the coupler, a raised ear each side with its
    # bolt, and a body whose face slopes forward and down to the passage
    # with a rib down its middle.
    x = sign * .062
    cylinder('throttle_adapter_socket', (x, -.14, -.152), .046, .024, adapter, engine, 16)
    box('throttle_adapter_ears', (x, -.14, -.138), (.165, .04, .03), adapter, engine, .008)
    for dx in [-.068, .068]:
        cylinder('throttle_bolt', (x + dx, -.14, -.123), .009, .008, steel, engine, 6)
    vs = [(x + a * w, y, z) for y, z, w in [(-.115, -.128, .058), (-.182, -.128, .058), (-.218, -.19, .04), (-.13, -.205, .04)] for a in (-1, 1)]
    mesh('throttle_adapter', vs, [(0, 2, 4, 6), (1, 7, 5, 3), (0, 1, 3, 2), (2, 3, 5, 4), (4, 5, 7, 6), (6, 7, 1, 0)], adapter, engine)
    rib = box('throttle_adapter_rib', (0, 0, 0), (.016, .012, .072), adapter, engine, .003)
    rib.location = (x, -.203, -.16)
    rib.rotation_euler = (-.5, 0, 0)
    # The high-pressure fuel pump on the front of each bank: a big round
    # silver cap tilted up toward the hood on a champagne cast body with its
    # bolted ears, brass fittings and the lines leaving them.
    at = Vector((-.41, -.2, -.15)) if sign < 0 else Vector((.39, -.15, -.155))
    pose = Matrix.Translation(at) @ Matrix.Rotation(.55, 4, 'X') @ Matrix.Rotation(sign * (.3 if sign < 0 else -.15), 4, 'Y')
    inboard = -sign
    fittings = [Vector((inboard * .108, .022, -.045)), Vector((inboard * .108, -.018, -.022))]
    place([box('fuel_pump_body', (inboard * .03, 0, -.052), (.12, .09, .072), pump_cast, engine, .018),
           cylinder('fuel_pump_body', (0, 0, -.03), .04, .03, pump_cast, engine, 16),
           cylinder('fuel_pump_body', (-inboard * .05, .03, -.08), .015, .04, pump_cast, engine, 10),
           cylinder('fuel_pump_body', (-inboard * .05, -.03, -.08), .015, .04, pump_cast, engine, 10),
           cylinder('fuel_pump_bolt', (-inboard * .05, .03, -.042), .009, .007, steel, engine, 6),
           cylinder('fuel_pump_bolt', (-inboard * .05, -.03, -.042), .009, .007, steel, engine, 6),
           lathe('fuel_pump_cap', [(-.002, 0), (-.002, .048), (.028, .048), (.033, .044), (.036, .034), (.037, 0)], pump_cap, engine, 12, 'Z')]
          + [cylinder('fuel_pump_cap_face', (0, 0, .037), .029, .003, pump_cap, engine, 12)]
          + [cylinder('fuel_pump_fitting', tuple(f - Vector((.026 if inboard < 0 else 0, 0, 0))), .012, .026, brass, engine, 6, 'X') for f in fittings], pose)
    for obj in engine.children:
        if obj.name.startswith('fuel_pump_cap'):
            for poly in obj.data.polygons:
                poly.use_smooth = False
    ends = [pose @ (f + Vector((inboard * .028, 0, 0))) for f in fittings]
    tube('fuel_high_pressure_line', smooth_path([ends[0], ends[0] + Vector((inboard * .03, .0, -.04)), (sign * .3, .04, -.22)], 4), .006, steel, engine, sides=6)
    tube('fuel_feed_hose', smooth_path([ends[1], ends[1] + Vector((inboard * .04, -.02, .01)), (sign * .2, -.26, -.19)], 4), .011, hose, engine, sides=8)

# Bent steel lines in a compact raised cluster over the housings: on each
# turbo two arches across it and one up from its bearing housing and back
# over into the shield; two that bridge the turbos across the middle.
for sign, c in TURBO.items():
    bent([(c.x - .05, c.y - .005, c.z + .05), (c.x - .05, c.y - .005, c.z + .105), (c.x + .05, c.y - .005, c.z + .105), (c.x + .05, c.y - .005, c.z + .05)])
    bent([(c.x - .035, c.y + .035, c.z + .06), (c.x - .035, c.y + .035, c.z + .118), (c.x + .035, c.y + .035, c.z + .118), (c.x + .035, c.y + .035, c.z + .06)])
    bent([(c.x - sign * .02, c.y + .015, c.z + .05), (c.x - sign * .02, c.y + .015, c.z + .12), (c.x - sign * .02, c.y + .075, c.z + .12), (c.x - sign * .01, c.y + .1, c.z + .07)])
bent([(-.07, .12, -.075), (-.07, .12, -.025), (.07, .12, -.025), (.07, .12, -.075)])
bent([(-.05, .15, -.09), (-.05, .15, -.04), (.05, .15, -.04), (.05, .16, -.1)])
# The valley between the turbos behind them: the dark castings of the
# turbos' supports and the coolant manifold under the loops.
box('valley_casting', (0, .24, -.19), (.13, .2, .07), head, engine, .012)
tube('valley_coolant_pipe', [(0, .14, -.16), (0, .34, -.15)], .016, dull_cast, engine, sides=8)

# The cooler's silver end face ahead of the throttles: inclined toward the
# hood, screwed round its edge, its labels on top.
cooler = Matrix.Translation((.02, -.31, -.22)) @ Matrix.Rotation(.32, 4, 'X')
parts = [box('front_cast_box', (0, 0, 0), (.34, .17, .1), cast, engine, .012)]
for k in range(5):
    for y in [-.07, .07]:
        parts.append(cylinder('cooler_screw', (-.15 + k * .075, y, .05), .008, .004, steel, engine, 8))
parts.append(mesh('cooler_label', [(-.005, -.065, .0505), (.155, -.065, .0505), (.155, .03, .0505), (-.005, .03, .0505)], [(0, 1, 2, 3)], labels, engine))
parts.append(mesh('cooler_label', [(-.14, .035, .0505), (-.03, .035, .0505), (-.03, .062, .0505), (-.14, .062, .0505)], [(0, 1, 2, 3)], labels, engine))
place(parts, cooler)
for obj, (v0, v1) in zip(parts[-2:], [(.5, 1.), (0., .5)]):
    uv = obj.data.uv_layers.new(name='TileUV')
    for li, corner in zip(range(4), [(0, v0), (1, v0), (1, v1), (0, v1)]):
        uv.data[li].uv = corner
# The throttle assembly between the couplers and the cooler: the silver
# casting with the two throttles on their common shaft, bolted across its
# front; the black transverse passage above the cooler, flanged at each end
# into the recirculation valves, a fitting at its centre; the throttle
# module on the car's left.
box('throttle_casting', (0, -.16, -.19), (.31, .09, .08), dull_cast, engine, .016)
box('throttle_casting_boss', (0, -.15, -.142), (.05, .06, .02), dull_cast, engine, .008)
for x, y, z in [(-.015, -.135, -.132), (.015, -.135, -.132), (-.14, -.13, -.15), (.14, -.13, -.15), (-.14, -.19, -.15), (.14, -.19, -.15)]:
    cylinder('throttle_casting_bolt', (x, y, z), .007, .007, steel, engine, 6)
for sign in [-1, 1]:
    tube('transverse_passage', [(sign * .215, -.215, -.18), (sign * .03, -.215, -.18)], .027, black, engine, sides=14)
    cylinder('transverse_passage_flange', (sign * .215 - (.014 if sign > 0 else 0), -.215, -.18), .036, .014, black, engine, 14, 'X')
    cylinder('recirculation_valve_body', (sign * .245, -.2, -.2), .027, .06, black, engine, 14)
box('transverse_passage_fitting', (0, -.215, -.175), (.06, .05, .062), black, engine, .008)
cylinder('breather_nipple', (0, -.215, -.144), .01, .012, black, engine, 8)
box('throttle_actuator', (.19, -.16, -.15), (.075, .065, .07), dull_cast, engine, .01)
box('throttle_actuator_plug', (.19, -.2, -.14), (.03, .02, .025), black, engine, .003)
# The brown braided breather hose comes in from the right bank, arcs across
# the front of the couplers' adapters and turns down into the fitting.
tube('breather_hose', smooth_path([(-.4, -.13, -.17), (-.27, -.18, -.11), (-.13, -.195, -.098), (-.035, -.197, -.1), (0, -.205, -.115), (0, -.215, -.138)], 5), .017, braid, engine, sides=8)

# ---- The intake: airbox, ducts, bellows and aluminium pipes ----

# One airbox at the car's right front. A low trunk runs back from it under
# the ducts to the fork against the inner wing, where a single moulding
# splits into the two smooth ducts: broad, flattened and pointed where they
# leave the fork, spreading diagonally and tapering round into ribbed
# bellows, then aluminium pipes turning into the compressors (the rear one
# into the right turbo, the front one under the couplers into the left).
box('airbox', (-.5, -.4, -.22), (.26, .24, .17), plastic, engine, .05)
box('airbox_lid_seam', (-.5, -.4, -.18), (.275, .255, .012), plastic, engine, .006)
routes = {
    -1: [(-.645, .075, -.112), (-.6, .1, -.1), (-.53, .125, -.088), (-.47, .132, -.085), (-.3, .12, -.097), (-.22, .07, -.11), (-.14, .0, -.12), (-.105, .02, -.12), (-.105, .045, -.115)],
    1: [(-.645, .05, -.122), (-.6, .03, -.124), (-.53, .008, -.125), (-.47, .0, -.125), (-.3, -.022, -.147), (-.15, -.035, -.18), (.03, -.035, -.2), (.09, -.02, -.165), (.105, .01, -.125), (.105, .045, -.115)],
}
for sign, points in routes.items():
    fork = 4
    branch = resample_path(smooth_path(points[:fork], 6), 12)
    widths = [lerp(.082, .056, (i / 11) ** .8) for i in range(12)]
    heights = [lerp(.036, .056, (i / 11) ** .8) for i in range(12)]
    clear_wheel_well(duct('intake_tract', branch, widths, heights, plastic, 16))
    boot = resample_path([points[fork - 1], points[fork]], 23)
    ribbed('intake_boot_corrugated', boot, .054, .01, 11, plastic)
    pipe = resample_path(smooth_path(points[fork:], 5), 18)
    tube('intake_pipe_aluminium', pipe, .042, alu_pipe, engine, sides=18, radii=[.044 - .006 * i / 17 for i in range(18)])
    for at, toward, radius in [(boot[0], boot[1], .056), (boot[-1], boot[-2], .056), (pipe[-1], pipe[-2], .04)]:
        clamp(at, toward, radius)
    p = pipe[3]
    box('intake_pipe_label', tuple(p + Vector((0, 0, .043))), (.045, .035, .002), paper, engine, 0)
trunk = resample_path(smooth_path([(-.635, .065, -.135), (-.57, .0, -.2), (-.54, -.12, -.235), (-.52, -.27, -.2)], 4), 10)
clear_wheel_well(duct('intake_tract', trunk, [.07, .066, .06, .056, .054, .054, .054, .054, .054, .054], [.04] * 10, plastic, 14))

# ---- The left bank and the car's left ----

# The oil filler: a ribbed black cap with its oil-can mark, on its neck.
vs, ring = [], 32
for z in [-.165, -.115]:
    for i in range(ring):
        t = i * 2 * math.pi / ring
        r = .056 if i % 2 else .052
        vs.append((.29 + r * math.cos(t), -.1 + r * math.sin(t), z))
vs.append((.29, -.1, -.112))
fs = [(i, (i + 1) % ring, ring + (i + 1) % ring, ring + i) for i in range(ring)] + [(ring + i, ring + (i + 1) % ring, 2 * ring) for i in range(ring)]
mesh('oil_filler_cap', vs, fs, black, engine)
box('oil_cap_marking', (.29, -.1, -.111), (.05, .016, .002), orange, engine, 0)
cylinder('oil_filler_neck', (.29, -.1, -.22), .04, .06, black, engine, 16)
cylinder('oil_separator', (.27, .02, -.15), .042, .13, black, engine, 18, 'Y')
for k in range(4):
    cylinder('oil_separator_rib', (.27, .035 + k * .025, -.15), .046, .006, black, engine, 18, 'Y')

# The coolant tank: a moulded reservoir of pale, aged plastic, one closed
# rounded box. It tapers to a shaped lower end, has a seam round it, a
# rounder shoulder on its inboard front corner, and its top steps up at the
# back to the cap, with grooves across and along the front dividing it into
# raised panels. Opaque: the coolant seen through it darkens the body below
# the seam.
TANK = Vector((.565, .01, 0))
TANK_TOP = -.095
TANK_HALF = Vector((.12, .182, (TANK_TOP + .31) / 2))
TANK_MID = TANK_TOP - TANK_HALF.z
SEAM = -1 / 6


def tank_point(p):
    """A point of the cube -1..1 moved onto the tank's moulded surface."""
    k = 4 - 2 * max(0., -p.x) * max(0., -p.y)
    q = p / (abs(p.x) ** k + abs(p.y) ** k + abs(p.z) ** k) ** (1 / k)
    flare = 1 - .22 * max(0., -q.z) ** 2 + .05 * math.exp(-((q.z - SEAM) / .05) ** 2)
    z = TANK_MID + q.z * TANK_HALF.z
    return Vector((TANK.x + q.x * TANK_HALF.x * flare, TANK.y + q.y * TANK_HALF.y * flare, z))


bm = bmesh.new()
bmesh.ops.create_cube(bm, size=2)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=7, use_grid_fill=True)
bm.verts.index_update()
tank_verts = [tank_point(v.co.copy()) for v in bm.verts]
faces = [tuple(v.index for v in f.verts) for f in bm.faces]
bm.free()
shell = clear_wheel_well(mesh('coolant_expansion_tank', [tuple(v) for v in tank_verts], faces, tank, engine, True))
shell.data.materials.append(coolant)
for poly in shell.data.polygons:
    if poly.center.z < TANK_MID + SEAM * TANK_HALF.z:
        poly.material_index = 1


# The moulded top: a raised back tier carrying the cap, ending in a sharp
# step across the tank, and four raised panels ahead of it split by grooves.
box('coolant_expansion_tank', (TANK.x - .004, TANK.y + .1, TANK_TOP + .012), (.21, .15, .044), tank, engine, .02)
for dx in [-.052, .052]:
    for dy, dz in [(-.03, .004), (-.118, -.006)]:
        box('coolant_expansion_tank', (TANK.x + dx, TANK.y + dy, TANK_TOP + dz), (.096, .082, .024), tank, engine, .013)
cap = TANK + Vector((-.045, .1, TANK_TOP + .027))
cylinder('coolant_tank_neck', tuple(cap), .036, .015, tank, engine, 20)
cap.z += .013
lathe('coolant_blue_cap', [(0, 0), (0, .047), (.008, .049), (.022, .046), (.026, .03), (.027, 0)], cap_blue, engine, 24, 'Z').location = cap
box('coolant_cap_grip', tuple(cap + Vector((0, 0, .03))), (.06, .012, .008), cap_blue, engine, .003)
fitting = TANK + Vector((-.098, .0, TANK_TOP + .002))
cylinder('coolant_tank_fitting', tuple(fitting), .011, .018, head, engine, 8)
tube('coolant_tank_hose', smooth_path([fitting + Vector((0, 0, .018)), TANK + Vector((-.04, -.04, TANK_TOP + .035)), TANK + Vector((.07, -.12, TANK_TOP + .028)), TANK + Vector((.12, -.2, -.17))], 4), .006, hose, engine, sides=6)
box('relay_carrier', (.6, -.27, -.2), (.15, .13, .08), black, engine, .01)
for k in range(3):
    box('relay_connector', (.56 + k * .04, -.24, -.155), (.025, .03, .02), head, engine, 0)
# The air-conditioning line comes down off the bulkhead into its block
# fitting behind the tank, then runs out to the left.
tube('ac_hard_line', smooth_path([(.27, .34, -.07), (.28, .27, -.05), (.34, .24, -.06), (.4, .26, -.08)], 4), .011, steel, engine, sides=10)
box('ac_line_block', (.41, .26, -.085), (.05, .035, .03), steel, engine, .005)
tube('ac_hard_line', smooth_path([(.43, .26, -.085), (.55, .27, -.08), (.7, .28, -.1)], 4), .008, steel, engine, sides=8)

# ---- Hoses and harnesses ----

for points, r in [
    # Big coolant hoses across the front, right of the cooler.
    ([(.18, -.4, -.2), (.33, -.41, -.19), (.5, -.39, -.2), (.68, -.37, -.24)], .026),
    ([(.18, -.45, -.23), (.36, -.46, -.215), (.55, -.44, -.23), (.7, -.42, -.27)], .024),
    # Down from the cooler and the hoses to the radiator.
    ([(-.1, -.38, -.24), (-.12, -.45, -.25), (-.08, -.5, -.24)], .024),
    ([(.12, -.4, -.24), (.14, -.47, -.25), (.2, -.5, -.24)], .02),
    # Under the cooler's left edge and round the right pump.
    ([(-.16, -.32, -.2), (-.24, -.36, -.17), (-.32, -.3, -.15), (-.36, -.18, -.16)], .019),
    ([(-.2, -.4, -.24), (-.28, -.42, -.2), (-.34, -.36, -.18)], .017),
    ([(-.28, -.22, -.17), (-.3, -.14, -.15), (-.22, -.12, -.15)], .014),
    # Around the left pump and the oil filler.
    ([(.2, -.2, -.17), (.24, -.25, -.16), (.36, -.27, -.17), (.44, -.3, -.2)], .016),
    ([(.38, -.08, -.16), (.42, -.15, -.13), (.45, -.24, -.17)], .012),
    # Behind the right duct, up to the bulkhead.
    ([(-.3, .24, -.15), (-.4, .2, -.11), (-.5, .22, -.1), (-.6, .25, -.12)], .015),
    ([(-.36, .3, -.12), (-.46, .32, -.09), (-.56, .3, -.1)], .011),
]:
    tube('coolant_hose', smooth_path(points, 3), r, hose, engine, sides=8)
for sign in [-1, 1]:
    tube('bay_wire_harness', smooth_path([(sign * .22, .3, -.17), (sign * .24, .05, -.17), (sign * .25, -.2, -.18), (sign * .32, -.36, -.2)], 4), .01, black, engine, sides=6)
for p in [(-.24, -.06, -.165), (.24, .12, -.16), (-.22, .24, -.15), (.33, -.2, -.155), (-.4, -.14, -.16)]:
    box('sensor_connector', p, (.03, .022, .02), black, engine, 0)

# Join the rigid bay by material so it costs a draw or two per material,
# keeping the photographed primary parts as named nodes.
KEEP = ('turbo_compressor_housing', 'turbo_heat_wrap', 'charge_pipe_silicone', 'front_cast_box', 'coolant_expansion_tank', 'intake_tract', 'turbo_heat_shield')
groups = {}
for obj in list(engine.children):
    if obj.type == 'MESH':
        base = obj.name.split('.')[0]
        key = base if base.startswith(KEEP) else obj.data.materials[0].name
        groups.setdefault(key, []).append(obj)
for key, objects in groups.items():
    join(objects, key if key.startswith(KEEP) else 'bay_' + key.replace('S6_', ''))
