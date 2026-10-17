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


def grain(x, y):
    """A fixed pseudo-random value in 0..1 for pixel (x, y)."""
    return ((x * 73856093 ^ y * 19349663 ^ (x * y * 83492791)) % 1009) / 1009


dimples = lambda tint: pattern('S6_dimpled_' + tint[0], 32, lambda x, y: tuple(
    c * (.72 + .28 * math.cos((x % 8 - 3.5) / 4 * math.pi) * math.cos((y % 8 - 3.5 + 4 * ((x // 8) % 2)) / 4 * math.pi)) for c in tint[1]) + (1,))
# The gold shields and the bulkhead foil are formed sheet: soft blotches of
# light and dark where it creased (the creases themselves are in the mesh).
crinkle = lambda tint: pattern('S6_crinkled_' + tint[0], 32, lambda x, y: tuple(
    c * (.86 + .1 * math.sin(x * .39 + 2 * math.sin(y * .2)) * math.cos(y * .39 - math.sin(x * .2)) + .04 * grain(x // 4, y // 4)) for c in tint[1]) + (1,))
gold = textured(material('S6_turbo_heat_wrap', 'c4a46c', .95, .26), crinkle(('gold', (.55, .41, .21))))
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
    tube('hose_clamp', [at - d * .006, at + d * .006], radius + .003, mat, engine, sides=14)
    up = max([u, -u, v, -v], key=lambda w: w.z)
    box('clamp_screw', tuple(at + up * (radius + .008)), (.016, .016, .012), mat, engine, 0)


def ribbed(name, path, radius, rib, count, mat):
    """A tube whose radius rises and falls `count` times: bellows, a rubber boot."""
    n = len(path)
    radii = [radius + rib * (1 if (i * 2 * count // max(1, n - 1)) % 2 else 0) for i in range(n)]
    return tube(name, path, radius, mat, engine, sides=18, radii=radii)


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


# ---- The body round the bay ----

# Fender gutters and inner wings, in body colour, from the hood's shut line
# in the car's frame: a lip tucked under the fender's edge, the gutter, then
# the inner wing falling into the dark. Across the bay (inboard from the
# shut line, down from it): lip, gutter floor, gutter wall, inner wing.
GUTTER = [(-.014, -.004), (.004, -.016), (.03, -.026), (.075, -.03), (.092, -.04), (.104, -.085), (.11, -.2), (.12, -.36)]
for sign in [-1, 1]:
    vs, rows = [], 0
    for k in range(14):
        y = lerp(-2.07, -1.03, k / 13)
        edge, top = hood_halfwidth(y), interp(HOOD_EDGE_Z, y)
        for inward, down in GUTTER:
            vs.append(tuple(local((sign * (edge - inward), y, top + down))))
        rows += 1
    m = len(GUTTER)
    fs = [(i * m + j, i * m + j + 1, (i + 1) * m + j + 1, (i + 1) * m + j) for i in range(rows - 1) for j in range(m - 1)]
    mesh('fender_gutter', vs, fs if sign < 0 else [f[::-1] for f in fs], paint, engine, True)
    # Ahead of the gutter the wing turns in behind the headlamp.
    a, b = local((sign * (hood_halfwidth(-2.07) - .11), -2.07, .72)), local((sign * .42, -2.16, .72))
    box('wing_front_closure', tuple((a + b) / 2 + Vector((0, 0, -.06))), (abs(a.x - b.x) + .02, .03, .18), paint, engine, .01)
    # The strut dome sits back under the cowl, beside the seal's end.
    cylinder('strut_dome', (sign * .56, .33, -.13), .085, .05, paint, engine, 24)
    cylinder('strut_top_cap', (sign * .56, .33, -.08), .05, .01, black, engine, 16)
box('bay_floor', (0, -.08, -.62), (1.6, 1.3, .03), shadow, engine, 0)

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
    box('headlamp_back', tuple(front + Vector((sign * .56, .03, -.07))), (.26, .12, .12), black, engine, .025)
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

box('engine_block', (0, -.04, -.5), (.46, .56, .16), head, engine, .02)
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
for sign, c in TURBO.items():
    # Silver compressor: the inlet faces forward, the volute swells behind it,
    # the outlet leaves its top on the inboard side.
    compressor = lathe('turbo_compressor_housing', [(-.068, .039), (-.066, .045), (-.05, .045), (-.046, .05), (-.034, .066), (-.018, .077), (-.002, .08), (.008, .076), (.014, .056), (.014, .03)], cast, engine, 28, 'Y')
    compressor.location = c
    lathe('compressor_inlet_ring', [(-.066, .046), (-.066, .051), (-.056, .051), (-.056, .046)], dull_cast, engine, 24, 'Y').location = c
    neck = [c + Vector((-sign * .045, -.006, .05)), c + Vector((-sign * .052, -.03, .075))]
    tube('turbo_outlet_neck', neck, .037, cast, engine, sides=18)
    lathe('turbo_turbine_housing', [(.014, .03), (.014, .045), (.03, .062), (.07, .064), (.09, .05), (.09, .0)], iron, engine, 20, 'Y').location = c
    # Gold shields formed over the manifold and the turbine: one big lobe
    # from the bank's ports up and in to the turbine, a lower one ahead of it.
    lobe = smooth_path([(sign * .28, c.y + .21, -.26), (sign * .26, c.y + .19, -.13), (sign * .2, c.y + .15, -.075), (c.x + sign * .035, c.y + .085, c.z + .02)], 6)
    radii = [.055 + .03 * math.sin(math.pi * min(1, 1.3 * i / (len(lobe) - 1))) for i in range(len(lobe))]
    crumple(tube('turbo_heat_wrap', lobe, .06, gold, engine, sides=16, radii=radii), .014, 16, sign, .45)
    lobe = smooth_path([(sign * .28, c.y - .05, -.25), (sign * .25, c.y + .01, -.15), (sign * .21, c.y + .08, -.1), (sign * .17, c.y + .13, -.08)], 4)
    crumple(tube('turbo_heat_wrap', lobe, .05, gold, engine, sides=12), .012, 16, 3 + sign, .45)
    # The black coupler forward from the outlet into its throttle housing.
    throttle = Vector((sign * .062, -.135, -.15))
    path = smooth_path([neck[1], c + Vector((-sign * .052, -.07, .078)), (sign * .062, -.07, -.075), throttle], 5)
    tube('charge_pipe_silicone', path, .04, silicone, engine, sides=18)
    clamp(path[2], path[3], .04)
    clamp(path[-3], path[-1], .04)
    # The throttle housing on the cooler: cast, bolted, a black actuator
    # elbow outboard (the recirculation valve).
    box('throttle_housing', (sign * .065, -.16, -.185), (.11, .07, .085), dull_cast, engine, .01)
    for dx in [-.04, .04]:
        for dy in [-.025, .025]:
            cylinder('throttle_bolt', (sign * .065 + dx, -.16 + dy, -.142), .0065, .006, steel, engine, 8)
    tube('recirculation_valve', smooth_path([(sign * .125, -.17, -.17), (sign * .16, -.16, -.16), (sign * .175, -.12, -.15)], 3), .02, black, engine, sides=10)
    cylinder('recirculation_valve_body', (sign * .18, -.11, -.17), .026, .05, black, engine, 14)
    # The high-pressure fuel pump on the front of each bank, its big silver
    # cap tilted up toward the hood.
    pump = Vector((sign * (.44 if sign < 0 else .38), -.24 if sign < 0 else -.15, -.19))
    tilt = Matrix.Translation(pump) @ Matrix.Rotation(.45, 4, 'X') @ Matrix.Rotation(-sign * .3, 4, 'Y')
    place([box('fuel_pump_body', (0, 0, -.035), (.07, .06, .07), pump_cast, engine, .012),
           cylinder('fuel_pump_body', (0, 0, -.01), .033, .04, pump_cast, engine, 18),
           cylinder('fuel_pump_cap', (0, 0, .025), .044, .03, steel, engine, 6),
           cylinder('fuel_pump_cap', (0, 0, .055), .036, .004, steel, engine, 6)], tilt)
    tube('fuel_high_pressure_line', smooth_path([pump + Vector((sign * .03, .03, -.02)), pump + Vector((-sign * .03, .12, -.06)), (sign * .27, .05, -.2)], 4), .005, steel, engine, sides=6)
    tube('fuel_feed_line', smooth_path([pump + Vector((-sign * .04, -.02, -.03)), pump + Vector((-sign * .1, -.06, -.06)), (sign * .2, -.25, -.22)], 4), .006, steel, engine, sides=6)

# Bent steel lines arch over the turbos into the bearing housings, some from
# the bank beside them and some from behind: the oil and coolant lines.
for sign, c in TURBO.items():
    for k in range(4):
        rise, dy = .045 + .01 * (k % 2), .02 * k
        tube('turbo_feed_line', smooth_path([(sign * .24, c.y + .06 + dy, -.14), (sign * .19, c.y + .05 + dy, c.z + rise + .02), (c.x + sign * .02, c.y + .02 + dy * .6, c.z + rise + .03), (c.x - sign * .03, c.y - .01 + dy * .3, c.z + rise), (c.x - sign * .045, c.y - .01, c.z + .05)], 3), .0058, steel, engine, sides=6)
    for k, dx in enumerate([-.02, .02]):
        tube('turbo_feed_line', smooth_path([(c.x + dx, c.y + .27, -.2), (c.x + dx * 1.5, c.y + .18, c.z + .06), (c.x + dx, c.y + .06, c.z + .075), (c.x + dx * .4, c.y + .02, c.z + .04)], 4), .0058, steel, engine, sides=6)
    tube('turbo_feed_line', smooth_path([(sign * .22, c.y + .02, -.13), (sign * .2, c.y + .1, -.04), (sign * .14, c.y + .18, -.06), (sign * .12, c.y + .24, -.12)], 4), .006, steel, engine, sides=6)
    tube('turbo_feed_line', smooth_path([(sign * .03, c.y + .22, -.16), (sign * .035, c.y + .12, -.05), (sign * .07, c.y + .05, -.06), (c.x, c.y - .01, c.z + .06)], 4), .0065, steel, engine, sides=6)

# The cooler's silver end face ahead of the throttles: inclined toward the
# hood, screwed round its edge, its labels on top.
cooler = Matrix.Translation((.02, -.31, -.2)) @ Matrix.Rotation(.32, 4, 'X')
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
tube('intake_bridge', [(-.17, -.215, -.2), (.17, -.215, -.2)], .022, black, engine, sides=12)
tube('throttle_linkage', [(-.06, -.205, -.15), (.06, -.205, -.15)], .006, steel, engine, sides=6)
box('throttle_actuator', (.14, -.2, -.17), (.06, .05, .06), black, engine, .008)
# The brown braided breather hose arcs from the right bank over to the
# throttles, between the couplers.
tube('breather_hose', smooth_path([(-.36, -.1, -.17), (-.25, -.07, -.125), (-.1, -.07, -.105), (-.02, -.085, -.11), (.0, -.12, -.15)], 5), .013, braid, engine, sides=8)

# ---- The intake: airbox, ducts, bellows and aluminium pipes ----

box('airbox', (-.56, -.36, -.22), (.32, .28, .17), plastic, engine, .05)
box('airbox_lid_seam', (-.56, -.36, -.18), (.335, .295, .012), plastic, engine, .006)
routes = {
    # The rear duct into the right turbo, in front of its compressor.
    -1: [(-.64, -.26, -.16), (-.69, -.08, -.1), (-.66, .09, -.075), (-.56, .14, -.08), (-.48, .14, -.085), (-.34, .125, -.095), (-.22, .07, -.11), (-.14, .0, -.12), (-.105, .02, -.12), (-.105, .045, -.115)],
    # The front duct, under the couplers to the left turbo.
    1: [(-.56, -.25, -.17), (-.6, -.1, -.13), (-.57, .0, -.12), (-.5, .01, -.125), (-.42, .0, -.13), (-.3, -.02, -.145), (-.15, -.035, -.18), (.03, -.035, -.2), (.09, -.02, -.165), (.105, .01, -.125), (.105, .045, -.115)],
}
for sign, points in routes.items():
    duct = resample_path(smooth_path(points[:4], 6), 10)
    tube('intake_tract', duct, .056, plastic, engine, sides=18)
    boot = resample_path([points[3], points[4], points[5]], 19)
    ribbed('intake_boot_corrugated', boot, .053, .01, 9, plastic)
    pipe = resample_path(smooth_path(points[5:], 5), 18)
    tube('intake_pipe_aluminium', pipe, .042, alu_pipe, engine, sides=18, radii=[.044 - .006 * i / 17 for i in range(18)])
    for at, toward, radius in [(boot[0], boot[1], .056), (boot[-1], boot[-2], .056), (pipe[-1], pipe[-2], .04)]:
        clamp(at, toward, radius)
    p = pipe[3]
    box('intake_pipe_label', tuple(p + Vector((0, 0, .043))), (.045, .035, .002), paper, engine, 0)

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

# The coolant tank: pale, aged translucent plastic, its body swelling to a
# moulding seam and stepping up at the back to the neck for the blue cap.
TANK = Vector((.565, .01, 0))
levels = [(-.3, .1, .16), (-.23, .114, .178), (-.175, .12, .186), (-.165, .126, .192), (-.155, .12, .186), (-.11, .112, .172), (-.075, .1, .156), (-.055, .086, .14)]
vs = []
for z, hx, hy in levels:
    for i in range(24):
        t = i * 2 * math.pi / 24
        cx, cy = math.cos(t), math.sin(t)
        x = hx * math.copysign(abs(cx) ** .5, cx)
        y = hy * math.copysign(abs(cy) ** .5, cy)
        vs.append((TANK.x + x, TANK.y + y, z + (.03 * max(0, y / hy) if z > -.12 else 0)))
vs.append((TANK.x, TANK.y + .02, levels[-1][0] + .02))
n = len(levels)
fs = [(i * 24 + j, i * 24 + (j + 1) % 24, (i + 1) * 24 + (j + 1) % 24, (i + 1) * 24 + j) for i in range(n - 1) for j in range(24)]
fs += [((n - 1) * 24 + j, (n - 1) * 24 + (j + 1) % 24, n * 24) for j in range(24)]
shell = mesh('coolant_expansion_tank', vs, fs, tank, engine, True)
shell.data.materials.append(coolant)
for poly in shell.data.polygons[:4 * 24]:
    poly.material_index = 1
cap = TANK + Vector((-.025, .12, -.03))
cylinder('coolant_tank_neck', tuple(cap + Vector((0, 0, -.02))), .036, .02, tank, engine, 20)
lathe('coolant_blue_cap', [(0, 0), (0, .047), (.008, .049), (.022, .046), (.026, .03), (.027, 0)], cap_blue, engine, 28, 'Z').location = cap
box('coolant_cap_grip', tuple(cap + Vector((0, 0, .03))), (.06, .012, .008), cap_blue, engine, .003)
tube('coolant_tank_hose', smooth_path([TANK + Vector((-.12, .04, -.06)), TANK + Vector((-.14, -.06, -.04)), TANK + Vector((-.13, -.17, -.09)), TANK + Vector((-.09, -.26, -.17))], 4), .006, hose, engine, sides=6)
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
    tube('coolant_hose', smooth_path(points, 4), r, hose, engine, sides=10)
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
