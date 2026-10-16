"""The S6's engine bay: the 4.0 TFSI hot V. Executed in build_s6.py's context.

Laid out from Ali's photo (`s6-engine-bay.jpg`, taken with the engine cover
off, from the front of the car looking back): the two turbochargers sit in
the V between the banks with their gold heat-wrapped manifolds and a foil
shield behind them; two black silicone charge pipes run forward to the two
throttle bodies; a silver cast box with a yellow warning label sits at the
front of the V; the intake tracts come across from the airbox on the car's
right; a high-pressure fuel pump with a silver cap sits on each bank; the
coolant tank with its blue cap is on the car's left; the cowl with its
honeycomb grilles closes the bay at the back.

Frame: the `engine_bay` empty, +X the car's left, -Y forward, Z up, z = 0 at
the hood's seam, y = 0 at the middle of the bay. The build places the empty
in the body (ENGINE_AT). These are modelled visual approximations; the
engine's internals are not represented.
"""

engine = empty('engine_bay', ENGINE_AT, body)

dimples = lambda tint: pattern('S6_dimpled_' + tint[0], 32, lambda x, y: tuple(
    c * (.72 + .28 * math.cos((x % 8 - 3.5) / 4 * math.pi) * math.cos((y % 8 - 3.5 + 4 * ((x // 8) % 2)) / 4 * math.pi)) for c in tint[1]) + (1,))
gold = textured(material('S6_turbo_heat_wrap', 'b2894c', .85, .42), dimples(('gold', (.42, .27, .09))))
foil = textured(material('S6_heat_shield_foil', 'c9c9c4', .9, .34), dimples(('foil', (.55, .55, .52))))
TILED.update({gold, foil})
cast = material('S6_cast_aluminium', 'a7a9a7', .72, .44)
iron = material('S6_cast_iron_turbine', '4a4440', .6, .62)
head = material('S6_engine_dark_cast', '3b3d3f', .5, .58)
plastic = material('S6_engine_black_plastic', '1c1e20', .02, .68)
silicone = material('S6_black_silicone_hose', '101112', .05, .3, .45)
hose = material('S6_rubber_hose', '17181a', 0, .78)
steel = material('S6_steel_lines', 'c8cbcd', .95, .2)
tank = material('S6_coolant_tank', 'a6aaa4', 0, .42)
cap_blue = material('S6_reservoir_cap_blue', '2a73b6', .03, .45)
label = material('S6_warning_label_yellow', 'e7c21c', 0, .5)
label_ink = material('S6_label_black_ink', '141414', 0, .6)


def at(name, objects):
    for obj in objects:
        obj.parent = engine
    return objects


# Bay shell: floor, inner wings in body colour, the radiator crossmember.
box('bay_floor', (0, -.02, -.56), (1.32, 1.0, .04), plastic, engine, .02)
for sign in [-1, 1]:
    box('inner_wing', (sign * .675, -.03, -.17), (.06, .94, .34), paint, engine, .02)
    box('strut_tower', (sign * .55, .27, -.10), (.2, .24, .16), paint, engine, .03)
    cylinder('strut_top', (sign * .55, .27, -.02), .075, .012, plastic, engine)
box('radiator_crossmember', (0, -.50, -.06), (1.28, .07, .06), plastic, engine, .015)
box('bonnet_latch', (0, -.50, -.025), (.08, .04, .03), head, engine, .006)

# Block and the two banks of the 90 degree V. Each bank is a cylinder head
# under a black cam cover, tilted 45 degrees out from the crank centre.
box('engine_block', (0, -.04, -.47), (.46, .56, .16), head, engine, .03)
for sign in [-1, 1]:
    for name, distance, size, mat in [('cylinder_head', .32, (.20, .54, .13), head), ('cam_cover', .41, (.17, .52, .05), plastic)]:
        obj = box(name, (0, 0, 0), size, mat, engine, .018)
        obj.location = (sign * distance * math.sin(math.pi / 4), -.04, -.55 + distance * math.cos(math.pi / 4))
        obj.rotation_euler = (0, sign * math.pi / 4, 0)
    # A ribbed coil rail along each cover.
    for k in range(4):
        y = -.25 + k * .13
        cylinder('coil_pack', (sign * .29, y, -.255), .016, .05, plastic, engine, 12)

# Twin turbos inside the V: silver compressor housings facing forward, cast
# iron turbine housings behind them, fed by the wrapped manifolds.
TURBO = {s: (s * .1, .09, -.165) for s in [-1, 1]}
for sign, (cx, cy, cz) in TURBO.items():
    compressor = lathe('turbo_compressor_housing', [(-.075, .0), (-.075, .032), (-.06, .034), (-.045, .05), (-.02, .066), (.0, .068), (.012, .062), (.012, .0)], cast, engine, 40, 'Y')
    compressor.location = (cx, cy, cz)
    turbine = lathe('turbo_turbine_housing', [(.012, .0), (.012, .04), (.03, .058), (.07, .06), (.09, .045), (.09, .0)], iron, engine, 32, 'Y')
    turbine.location = (cx, cy, cz)
    # The compressor's outlet leaves the top of the scroll, inboard.
    outlet = (cx - sign * .04, cy - .02, cz + .05)
    tube('turbo_outlet_neck', [(cx - sign * .035, cy - .005, cz + .035), outlet], .026, cast, engine, sides=20)
    # Wrapped exhaust manifold: four ports along the bank's inner side
    # gather into the turbine from behind.
    ports = [(sign * .19, -.27 + k * .14, -.235) for k in range(4)]
    collector = Vector((cx + sign * .01, cy + .19, cz + .025))
    for k, port in enumerate(ports):
        p = Vector(port)
        mid = Vector((sign * .17, max(p.y, cy + .02) + .05, -.17 + .02 * k))
        tube('turbo_heat_wrap', smooth_path([p, mid, collector], 6), .028, gold, engine, sides=14)
    tube('turbo_heat_wrap', smooth_path([collector, (cx, cy + .14, cz + .03), (cx, cy + .075, cz)], 6), .05, gold, engine, sides=18)
    # Black silicone charge pipe to the throttle body, two steel clamps.
    throttle = Vector((sign * .07, -.2, -.135))
    path = smooth_path([outlet, (cx - sign * .045, cy - .07, cz + .065), (sign * .07, -.08, -.1), throttle], 8)
    tube('charge_pipe_silicone', path, .034, silicone, engine, sides=24)
    for point, after in [(path[2], path[3]), (path[-3], path[-2])]:
        d = (Vector(after) - Vector(point)).normalized()
        u = d.cross(Vector((0, 0, 1))).normalized()
        v = d.cross(u)
        tube('hose_clamp', [Vector(point) + .037 * (u * math.cos(i * math.pi / 12) + v * math.sin(i * math.pi / 12)) for i in range(24)], .0035, steel, engine, cyclic=True, sides=5)
    box('throttle_body', (sign * .07, -.235, -.15), (.1, .07, .085), head, engine, .012)
    for dx in [-.035, .035]:
        for dz in [-.03, .03]:
            cylinder('throttle_bolt', (sign * .07 + dx, -.272, -.15 + dz), .006, .006, steel, engine, 8, 'Y')
    # The high-pressure fuel pump on the front of each bank, its silver cap.
    cylinder('fuel_pump_body', (sign * .37, -.24, -.24), .036, .07, cast, engine, 24)
    cylinder('fuel_pump_cap', (sign * .37, -.24, -.17), .041, .02, steel, engine, 28)
    tube('fuel_high_pressure_line', smooth_path([(sign * .34, -.22, -.19), (sign * .3, -.12, -.2), (sign * .26, .0, -.22)]), .0045, steel, engine, sides=6)

# Steel oil and coolant lines climb over the turbos to the bearings.
for sign in [-1, 1]:
    for k, dx in enumerate([-.03, .0, .03]):
        cx, cy, cz = TURBO[sign]
        tube('turbo_feed_line', smooth_path([(cx + dx, cy + .28, -.2), (cx + dx, cy + .2, cz + .1), (cx + dx * .6, cy + .07, cz + .085), (cx + dx * .4, cy + .02, cz + .02)]), .0045, steel, engine, sides=6)

# The heat shield behind the turbos and the foil strip under the cowl's lip.
vs, fs = [], []
for i in range(13):
    x = -.34 + i * .68 / 12
    for z in [-.28, -.05]:
        vs.append((x, .36 - .05 * (z + .28) / .23 - .03 * (x / .34) ** 2, z + .02 * math.cos(x * 4)))
for i in range(12):
    fs.append((i * 2, i * 2 + 2, i * 2 + 3, i * 2 + 1))
mesh('turbo_heat_shield', vs, fs, foil, engine, True, 26)
box('cowl_foil_strip', (0, .41, -.045), (.9, .05, .012), foil, engine, .004)

# The silver cast box at the front of the V with its yellow warning label,
# and the black intake bridge the throttle bodies bolt to.
box('front_cast_box', (0, -.35, -.17), (.34, .19, .09), cast, engine, .014)
box('warning_label', (0, -.355, -.124), (.2, .09, .002), label, engine, .001)
box('label_ink_band', (0, -.33, -.1225), (.17, .008, .0015), label_ink, engine, 0)
for k in range(4):
    box('label_ink_line', (0, -.345 - k * .011, -.1225), (.17 - .02 * (k % 2), .003, .0012), label_ink, engine, 0)
box('label_white_panel', (0, -.39, -.1235), (.2, .018, .002), tank, engine, 0)
tube('intake_bridge', [(-.2, -.27, -.19), (.2, -.27, -.19)], .022, plastic, engine, sides=14)

# Intake: the airbox on the car's right, two black inlet bends, corrugated
# boots, and aluminium pipes into the compressors.
box('airbox', (-.49, -.27, -.2), (.3, .34, .14), plastic, engine, .03)
routes = {
    -1: [(-.47, -.12, -.15), (-.43, .0, -.12), (-.33, .03, -.13), (-.22, .03, -.155), (-.15, .0, -.165), (-.1, .015, -.165)],
    1: [(-.53, -.13, -.17), (-.48, -.04, -.17), (-.34, -.07, -.2), (-.12, -.08, -.21), (.06, -.07, -.2), (.1, -.02, -.175), (.1, .015, -.165)],
}
for sign, points in routes.items():
    path = smooth_path(points, 10)
    n = len(path)
    boot = range(int(n * .25), int(n * .52))
    radii = [.045 if i < boot.start else (.043 + .006 * (i % 2) if i in boot else .035) for i in range(n)]
    tube('intake_tract', path[:boot.start + 1], .045, plastic, engine, sides=20)
    tube('intake_boot_corrugated', path[boot.start:boot.stop + 1], .0, plastic, engine, sides=20, radii=radii[boot.start:boot.stop + 1])
    tube('intake_pipe_aluminium', path[boot.stop:], .035, steel if sign < 0 else cast, engine, sides=20)

# Coolant tank and blue cap on the car's left; the oil filler on the left
# bank; the brake fluid cap under the cowl; hoses and the harness.
box('coolant_expansion_tank', (.52, -.02, -.17), (.25, .32, .15), tank, engine, .045)
cylinder('coolant_blue_cap', (.47, .08, -.095), .046, .022, cap_blue, engine)
box('coolant_cap_grip', (.47, .08, -.07), (.06, .012, .01), cap_blue, engine, .003)
cylinder('oil_filler_cap', (.25, -.17, -.17), .042, .022, plastic, engine)
box('oil_cap_mark', (.25, -.17, -.147), (.03, .012, .001), label, engine, 0)
cylinder('brake_fluid_cap', (.5, .45, -.06), .04, .02, cap_blue, engine)
for points, r in [
    ([(.18, -.42, -.2), (.33, -.44, -.18), (.5, -.4, -.2), (.6, -.33, -.25)], .022),
    ([(.15, -.46, -.23), (.35, -.47, -.21), (.55, -.45, -.24)], .02),
    ([(-.22, -.42, -.22), (-.3, -.33, -.18), (-.36, -.2, -.17)], .018),
    ([(.38, -.12, -.2), (.42, -.2, -.17), (.44, -.3, -.2)], .013),
    ([(-.28, .2, -.18), (-.36, .1, -.15), (-.42, .0, -.14)], .012),
]:
    tube('coolant_hose', smooth_path(points), r, hose, engine, sides=12)
tube('ac_hard_line', smooth_path([(.25, .38, -.07), (.33, .3, -.06), (.42, .28, -.07), (.6, .3, -.1)]), .009, steel, engine, sides=10)
for sign in [-1, 1]:
    tube('bay_wire_harness', smooth_path([(sign * .2, .3, -.19), (sign * .22, .05, -.18), (sign * .23, -.2, -.19), (sign * .3, -.38, -.2)]), .01, plastic, engine, sides=8)

# The cowl panel closes the bay under the windscreen: black plastic with
# two honeycomb grilles and a rubber seal along its front edge.
hexes = pattern('S6_cowl_mesh', 32, lambda x, y: (lambda d: (.008, .008, .009, 1) if d else (.04, .04, .043, 1))(
    ((x + 8 * ((y // 7) % 2)) % 16 in (0, 1)) or (y % 7 == 0)))
mesh_mat = textured(material('S6_cowl_honeycomb_mesh', '1a1a1c', .1, .55), hexes)
TILED.add(mesh_mat)
box('cowl_panel', (0, .52, -.035), (1.3, .2, .02), plastic, engine, .01)
for sign in [-1, 1]:
    box('cowl_grille', (sign * .34, .52, -.023), (.42, .14, .006), mesh_mat, engine, .003)
tube('cowl_seal', smooth_path([(-.64, .44, -.05), (-.3, .42, -.03), (0, .415, -.025), (.3, .42, -.03), (.64, .44, -.05)]), .012, hose, engine, sides=10)

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
