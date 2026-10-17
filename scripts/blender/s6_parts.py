"""The parts that make the CC-BY A6 into Ali's S6. Executed in build_s6.py's context.

Each part is built in the car's frame (X left, -Y forward, Z up, metres,
origin on the ground midway between the axles), then gathered under one
empty, its socket, whose origin is the point the assembly step snaps to the
base body (agents/A1/NOTES.md lists them). Until the base arrives the sockets
sit at provisional positions taken from the 2013 US S6 dimensions and Ali's
photos, so the set reads as the car's front, rear and corners in place.

What each part copies: the pre-facelift LED headlamps with the DRL band that
runs up the outer edge and steps along the bottom (Ali's front photo); the
pre-facelift two-piece tail lamps with the lower light guide that turns up at
the outer end (his night photo); his gloss black RS-style honeycomb grille
with black rings, a camera dot and the outlined "quattro" low in the frame,
no S6 badge; the S6 lower intakes with dark blades and round sensor housings
(not fog lamps); aluminium-look mirror caps; the black S6 badge and black
rings on his boot lid, V8T on the front fenders (Audi's placement; his photos
do not show them); four oval tips in the early diffuser with its long bright
blade. Lamp emitters use their own materials: emission on is the lit state,
emission strength 0 the unlit one.
"""

from mathutils import Matrix

PARTS_ROOT = globals().get('PARTS_ROOT') or empty('ali_s6_parts')
FRONT = -2.433   # front bumper face: 1.456 to the front axle, 0.977 overhang
REAR = 2.492     # rear bumper face: 1.036 overhang behind the rear axle


def interp(table, x):
    """Piecewise linear lookup in a list of (x, value) pairs."""
    if x <= table[0][0]:
        return table[0][1]
    for (a, va), (b, vb) in zip(table, table[1:]):
        if x <= b:
            return va + (vb - va) * (x - a) / (b - a)
    return table[-1][1]


def offset(poly, d):
    """Move each vertex of a closed polygon d along its bisector (inward for d > 0, CCW)."""
    out = []
    n = len(poly)
    for i in range(n):
        p, a, b = Vector(poly[i]), Vector(poly[i - 1]), Vector(poly[(i + 1) % n])
        e1, e2 = (p - a).normalized(), (b - p).normalized()
        n1, n2 = Vector((-e1.y, e1.x)), Vector((-e2.y, e2.x))
        bis = (n1 + n2).normalized()
        out.append(tuple(p + bis * d / max(.35, bis.dot(n1))))
    return out


def ccw(poly):
    area = sum(poly[i - 1][0] * poly[i][1] - poly[i][0] * poly[i - 1][1] for i in range(len(poly)))
    return poly if area > 0 else list(reversed(poly))


def inside(x, z, poly):
    hit = False
    for (x1, z1), (x2, z2) in zip(poly, poly[1:] + poly[:1]):
        if (z1 > z) != (z2 > z) and x < x1 + (z - z1) * (x2 - x1) / (z2 - z1):
            hit = not hit
    return hit


def facing(obj, direction):
    """Flip an open shell so most of its area faces direction."""
    d = Vector(direction)
    if sum(p.normal.dot(d) * p.area for p in obj.data.polygons) < 0:
        obj.data.flip_normals()
    return obj


def mirrored(poly, sign):
    return [(sign * x, z) for x, z in poly]


def surface(name, outline, yfun, mat, parent, direction, rings=2, bulge=0., depth=0.):
    """A lens or panel over an (x, z) outline at y = yfun(x, z).

    Concentric rings toward the centroid keep a curved face smooth; bulge
    pushes the centre out along direction; depth adds side walls behind it.
    """
    cx = sum(p[0] for p in outline) / len(outline)
    cz = sum(p[1] for p in outline) / len(outline)
    n = len(outline)
    sy = 1 if direction[1] > 0 else -1
    vs, fs = [], []
    for k in range(rings + 1):
        f = 1 - k / (rings + 1)
        for x, z in outline:
            px, pz = cx + (x - cx) * f, cz + (z - cz) * f
            vs.append((px, yfun(px, pz) + sy * bulge * (1 - f * f), pz))
    vs.append((cx, yfun(cx, cz) + sy * bulge, cz))
    for k in range(rings):
        for i in range(n):
            a, b = k * n, (k + 1) * n
            fs.append((a + i, a + (i + 1) % n, b + (i + 1) % n, b + i))
    centre = len(vs) - 1
    for i in range(n):
        fs.append((rings * n + i, rings * n + (i + 1) % n, centre))
    if depth:
        base = len(vs)
        for i in range(n):
            x, y, z = vs[i]
            vs.append((x, y - sy * depth, z))
        for i in range(n):
            fs.append((base + i, base + (i + 1) % n, i + 1 if i + 1 < n else 0, i))
    obj = mesh(name, vs, fs, mat, parent, True)
    return facing(obj, direction)


def ribbon(name, outer, inner, yfun, mat, parent, direction, depth=0., back=None):
    """The ring between two outlines with the same vertex count (a frame or bezel)."""
    n = len(outer)
    sy = 1 if direction[1] > 0 else -1
    vs = [(x, yfun(x, z), z) for x, z in outer] + [(x, yfun(x, z) - sy * (back or 0), z) for x, z in inner]
    fs = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    if depth:
        for ring in (0, 1):
            base = len(vs)
            src = outer if ring == 0 else inner
            off = 0 if ring == 0 else -sy * (back or 0)
            vs.extend((x, yfun(x, z) + off - sy * depth, z) for x, z in src)
            r0 = ring * n
            fs.extend((r0 + i, base + i, base + (i + 1) % n, r0 + (i + 1) % n) for i in range(n))
    obj = mesh(name, vs, fs, mat, parent, True)
    for p in obj.data.polygons:
        p.use_smooth = False
    return facing(obj, direction)


def socket(name, parts, origin=None):
    """Gather built parts under a socket empty at origin (default: their bounding-box centre)."""
    objs = [o for o in parts if o]
    if origin is None:
        lo = Vector((1e9,) * 3)
        hi = Vector((-1e9,) * 3)
        for o in objs:
            if o.type == 'MESH':
                for v in o.data.vertices:
                    co = o.matrix_basis @ v.co
                    lo = Vector(map(min, lo, co))
                    hi = Vector(map(max, hi, co))
        origin = (lo + hi) / 2
    origin = Vector(origin)
    root = empty(name, tuple(origin), PARTS_ROOT)
    for o in objs:
        o.parent = root
        if o.type == 'MESH' and o.location.length == 0 and o.rotation_euler.to_matrix() == Matrix.Identity(3):
            o.data.transform(Matrix.Translation(-origin))
        else:
            o.location -= origin
    root['socket'] = [round(c, 4) for c in origin]
    return root


def emitter(name, color, strength, base=None, rough=.3):
    """A lamp material: emission on is the lit state; strength 0 is unlit."""
    m = material(name, base or color, 0, rough)
    p = bsdf(m)
    p.inputs['Emission Color'].default_value = rgba(color)
    p.inputs['Emission Strength'].default_value = strength
    m['lit_strength'] = strength
    return m


def glass(name, color, alpha, rough=.04):
    m = material(name, color, 0, rough)
    bsdf(m).inputs['Alpha'].default_value = alpha
    m.surface_render_method = 'BLENDED'
    m.use_backface_culling = False
    return m


def set_lamps(lit):
    """Switch every lamp emitter between its lit strength and 0."""
    for m in bpy.data.materials:
        if 'lit_strength' in m:
            bsdf(m).inputs['Emission Strength'].default_value = m['lit_strength'] if lit else 0


# ---- materials ----

def quartz_paint():
    """Quartz Gray metallic (LY7G), provisional: the dossier's starting values,
    tuned against the overcast front photo. Reusable: fake user, one copy."""
    m = bpy.data.materials.get('S6_Quartz_Gray_paint')
    if m:
        return m
    m = bpy.data.materials.new('S6_Quartz_Gray_paint')
    m.use_nodes = True
    p = bsdf(m)
    p.inputs['Base Color'].default_value = (.19, .22, .235, 1)
    p.inputs['Metallic'].default_value = .8
    p.inputs['Roughness'].default_value = .28
    p.inputs['IOR'].default_value = 1.5
    p.inputs['Coat Weight'].default_value = 1.0
    p.inputs['Coat Roughness'].default_value = .1
    p.inputs['Coat IOR'].default_value = 1.5
    m.diffuse_color = (.19, .22, .235, 1)
    m.use_fake_user = True
    return m


paint = quartz_paint()
gloss_black = material('S6_gloss_black_trim', '0b0c0d', .1, .12, 1)
satin_black = material('S6_satin_black_plastic', '141516', .02, .48)
matte_black = material('S6_matte_black_backing', '070708', 0, .8)
dark_chrome = material('S6_lamp_dark_chrome', '464b50', 1, .2)
chrome = material('S6_bright_chrome', 'e6e8ea', 1, .07)
aluminium = material('S6_aluminium_look_mirror_cap', 'c4c7ca', .95, .24, .6)
platinum = material('S6_diffuser_platinum_grey', '3a3d40', .55, .38)
mirror_glass = material('S6_mirror_glass', 'b8bcc0', 1, .02)
red_mark = material('S6_badge_red', 'c0121c', .1, .3, .6)
lens_clear = glass('S6_headlamp_lens', 'f4f6f8', .06, .02)
lens_red = glass('S6_taillamp_lens', '5c040a', .42, .03)
amber_lens = glass('S6_indicator_lens', 'f0f0ee', .35)
drl = emitter('S6_DRL_LED', 'eef4ff', 20, 'e8ecf2', .2)
low_beam = emitter('S6_low_beam_LED', 'f4f7ff', 1.2, 'cfd3d8', .15)
tail_guide = emitter('S6_tail_light_guide', 'ff2a14', 14, '9a0c0c')
tail_led = emitter('S6_tail_LED_row', 'ff2a1c', .6, '7a0a0a')
reverse_strip = material('S6_reverse_strip', 'd8d6d2', 0, .25)
reflector = material('S6_tail_reflector', '3a0306', .3, .32)
hexes = pattern('S6_intake_mesh', 32, lambda x, y: (
    (.004, .004, .005, 1) if ((x + (8 if (y // 8) % 2 else 0)) % 16 < 13 and y % 8 < 6) else (.05, .05, .055, 1)))
intake_mesh = textured(material('S6_intake_honeycomb', '1a1b1c', 0, .55), hexes)
TILED.add(intake_mesh)


# ---- 1. headlights: pre-facelift C7 LED ----

def headlight(sign):
    tag = 'l' if sign > 0 else 'r'
    # Front view, outward x and height, from the inboard tip round the top.
    shape = [(.405, .712), (.44, .742), (.55, .765), (.68, .788), (.80, .804), (.845, .801),
             (.866, .776), (.872, .73), (.866, .684), (.848, .652), (.80, .642), (.72, .640),
             (.655, .646), (.628, .662), (.595, .676), (.53, .682), (.46, .69), (.42, .698)]
    shape = ccw(mirrored(shape, sign))
    wrap = [(.40, -2.365), (.55, -2.345), (.70, -2.29), (.80, -2.22), (.86, -2.15), (.875, -2.10)]
    yf = lambda x, z: interp(wrap, abs(x)) + (z - .72) * .35
    parts = [surface('headlamp_lens_' + tag, shape, yf, lens_clear, PARTS_ROOT, (0, -1, 0), 2, .012)]
    parts.append(ribbon('headlamp_bezel_' + tag, shape, offset(shape, .008), lambda x, z: yf(x, z) + .004,
                        gloss_black, PARTS_ROOT, (0, -1, 0), .05, .01))
    back = lambda x, z: yf(x, z) + .055
    parts.append(surface('headlamp_housing_' + tag, offset(shape, .008), back, dark_chrome, PARTS_ROOT, (0, -1, 0), 1))
    # The DRL light guide: up the outer edge, along the bottom, a step up at
    # about forty percent of the way in, then on to the inboard tip.
    path = [(.852, .79), (.858, .74), (.85, .69), (.825, .662), (.74, .657), (.665, .662),
            (.635, .678), (.60, .692), (.52, .698), (.45, .706), (.425, .716)]
    pts = [(sign * x, yf(sign * x, z) + .018, z) for x, z in path]
    parts.append(tube('DRL_light_guide_' + tag, smooth_path(pts, 4), .0042, drl, PARTS_ROOT, sides=6))
    parts.append(tube('DRL_reflector_channel_' + tag, smooth_path([(x, y + .006, z - .004) for x, y, z in pts], 4),
                      .0065, satin_black, PARTS_ROOT, sides=6))
    # Five LED low-beam modules in a row, three smaller cups above them outboard.
    for i in range(5):
        x, z = .50 + i * .05, .728 + i * .006
        x *= sign
        y = yf(x, z) + .03
        parts.append(box('LED_module_%d_%s' % (i, tag), (x, y, z), (.036, .03, .03), dark_chrome, PARTS_ROOT, .006))
        parts.append(cylinder('LED_emitter_%d_%s' % (i, tag), (x, y - .016, z), .011, -.004, low_beam, PARTS_ROOT, 12, 'Y'))
    for i in range(3):
        x, z = sign * (.79 - i * .012), .705 + i * .028
        parts.append(box('LED_cup_%d_%s' % (i, tag), (x, yf(x, z) + .03, z), (.03, .026, .02), dark_chrome, PARTS_ROOT, .005))
    return socket('headlight_' + tag, parts)


# ---- 2. taillights: pre-facelift, split at the boot seam ----

def taillight(sign):
    tag = 'l' if sign > 0 else 'r'
    wrap = [(.34, 2.445), (.50, 2.437), (.62, 2.415), (.74, 2.375), (.80, 2.33), (.84, 2.27)]
    yf = lambda x, z: interp(wrap, abs(x)) - (z - .92) * .3
    outer = ccw(mirrored([(.612, .99), (.75, .992), (.80, .987), (.83, .97), (.838, .93), (.826, .88),
                          (.80, .848), (.70, .846), (.612, .862)], sign))
    inner = ccw(mirrored([(.356, .972), (.37, .99), (.603, .99), (.603, .866), (.47, .89), (.39, .908), (.36, .93)], sign))
    parts = []
    for piece, shape in [('outer', outer), ('inner', inner)]:
        parts.append(surface('taillamp_lens_%s_%s' % (piece, tag), shape, yf, lens_red, PARTS_ROOT, (0, 1, 0), 2, .006))
        parts.append(ribbon('taillamp_bezel_%s_%s' % (piece, tag), shape, offset(shape, .006), lambda x, z: yf(x, z) - .003,
                            gloss_black, PARTS_ROOT, (0, 1, 0), .04, .008))
        parts.append(surface('taillamp_reflector_%s_%s' % (piece, tag), offset(shape, .006), lambda x, z: yf(x, z) - .03,
                             reflector, PARTS_ROOT, (0, 1, 0), 1))
    y = lambda x, z, d: yf(x, z) - d
    # LED row under the top edge, the pale reverse strip, and the light guide
    # that runs along the bottom of both pieces and turns up at the outer end.
    row = [(.38, .978), (.60, .978), (.76, .978), (.81, .968)]
    parts.append(tube('tail_LED_row_' + tag, smooth_path([(sign * x, y(sign * x, z, .012), z) for x, z in row], 3), .0035, tail_led, PARTS_ROOT, sides=5))
    for piece, (a, b) in [('outer', (.625, .78)), ('inner', (.40, .59))]:
        parts.append(box('reverse_strip_%s_%s' % (piece, tag), (sign * (a + b) / 2, y(sign * (a + b) / 2, .95, .016), .95),
                         (b - a, .006, .014), reverse_strip, PARTS_ROOT, .002))
    guide = [(.385, .92), (.50, .918), (.60, .912), (.70, .906), (.775, .904), (.805, .915), (.818, .94), (.812, .962)]
    parts.append(tube('tail_light_guide_' + tag, smooth_path([(sign * x, y(sign * x, z, .012), z) for x, z in guide], 4), .0075, tail_guide, PARTS_ROOT, sides=6))
    return socket('taillight_' + tag, parts)


# ---- 3. the RS-style honeycomb grille ----

GRILLE_OUTLINE = [(0, .792), (.33, .792), (.385, .784), (.418, .758), (.426, .72), (.412, .58), (.394, .44),
                  (.378, .352), (.36, .322), (.325, .309), (0, .307)]


def grille():
    half = GRILLE_OUTLINE
    shape = ccw([(x, z) for x, z in half] + [(-x, z) for x, z in reversed(half[1:-1])])
    yf = lambda x, z: FRONT + .012 + .3 * x * x + (z - .55) * .26
    inner = offset(shape, .03)
    parts = [ribbon('grille_frame', shape, inner, yf, gloss_black, PARTS_ROOT, (0, -1, 0), .045, .012)]
    parts.append(surface('grille_backing', inner, lambda x, z: yf(x, z) + .06, matte_black, PARTS_ROOT, (0, -1, 0), 1))
    # The quattro panel is the frame's lower band; a rib divides it from the mesh.
    band_top = .432
    band = ccw([(x, z) for x, z in inner if z < band_top] + [(-.36, band_top), (.36, band_top)])
    parts.append(surface('grille_quattro_panel', band, lambda x, z: yf(x, z) + .014, gloss_black, PARTS_ROOT, (0, -1, 0), 1))
    parts.append(box('grille_divider_rib', (0, yf(0, band_top) + .004, band_top + .003), (.76, .016, .009), gloss_black, PARTS_ROOT, .003))
    # The rings sit on a black capsule; the mesh stops around it.
    plate_r, plate_x = .062, .1
    in_plate = lambda x, z: math.hypot(max(0, abs(x) - plate_x), z - .682) < plate_r + .022
    capsule = [(plate_x + plate_r * math.cos(t * math.pi / 10 - math.pi / 2), .682 + plate_r * math.sin(t * math.pi / 10 - math.pi / 2)) for t in range(11)]
    capsule += [(-x, z) for x, z in reversed(capsule)]
    parts.append(surface('grille_ring_plate', ccw(capsule), lambda x, z: yf(x, z) + .024, gloss_black, PARTS_ROOT, (0, -1, 0), 1, 0, .02))
    # Elongated hexagons, wider than tall, alternate rows offset half a cell.
    w, h, rib, deep = .056, .034, .0021, .016
    hexagon = [(0, h / 2), (-w / 2, h / 4), (-w / 2, -h / 4), (0, -h / 2), (w / 2, -h / 4), (w / 2, h / 4)]
    ix, iz = (w / 2 - rib) / (w / 2), (h / 2 - rib * 1.4) / (h / 2)
    vs, fs = [], []
    row = 0
    z = band_top + .016
    while z < .79:
        x0 = (w / 2) * (row % 2)
        k = -12
        while k <= 12:
            cx = x0 + k * w
            if inside(cx, z, inner) and not in_plate(cx, z):
                base = len(vs)
                for dx, dz in hexagon:
                    px, pz = cx + dx, z + dz
                    vs.append((px, yf(px, pz) + .02, pz))
                for dx, dz in hexagon:
                    px, pz = cx + dx * ix, z + dz * iz
                    vs.append((px, yf(px, pz) + .02, pz))
                for dx, dz in hexagon:
                    px, pz = cx + dx * ix, z + dz * iz
                    vs.append((px, yf(px, pz) + .02 + deep, pz))
                for i in range(6):
                    j = (i + 1) % 6
                    fs.append((base + i, base + j, base + 6 + j, base + 6 + i))
                    fs.append((base + 6 + i, base + 6 + j, base + 12 + j, base + 12 + i))
            k += 1
        z += .75 * h
        row += 1
    mesh_obj = mesh('grille_honeycomb', vs, fs, gloss_black, PARTS_ROOT)
    parts.append(facing(mesh_obj, (0, -1, 0)))
    # Behind the rings the mesh is cut; a plain black plate carries them.
    for i in range(4):
        cx = (i - 1.5) * .0637
        y0 = yf(cx, .682) + (.006 if i % 2 else .002)
        ring = [(cx + .047 * math.sin(t * 2 * math.pi / 40), y0, .682 + .047 * math.cos(t * 2 * math.pi / 40)) for t in range(40)]
        parts.append(tube('grille_ring_%d' % i, ring, .0058, gloss_black, PARTS_ROOT, True, 8))
    parts.append(cylinder('grille_camera', (0, yf(0, .609) + .004, .609), .0065, .02, satin_black, PARTS_ROOT, 12, 'Y'))
    parts.append(cylinder('grille_camera_lens', (0, yf(0, .609) + .001, .609), .004, .004, glass('S6_camera_lens', '202428', .9, .02), PARTS_ROOT, 12, 'Y'))
    # quattro: dark letters whose chamfered edges catch the light, as an outline.
    q = text('grille_quattro_script', 'quattro', (0, yf(0, .372) + .0085, .372), .064, gloss_black, PARTS_ROOT, (math.pi / 2 - .26, 0, 0), .0012, spacing=1.3)
    q.scale = (1.8, 1, 1)
    q.data.materials.append(material('S6_quattro_outline_edge', '7a7e82', .3, .45))
    bm = bmesh.new()
    bm.from_mesh(q.data)
    front = [f for f in bm.faces if f.normal.z > .7]
    rim = bmesh.ops.inset_region(bm, faces=front, thickness=.0024, depth=-.0004, use_even_offset=True)['faces']
    for f in bm.faces:
        f.material_index = 1 if f in rim or abs(f.normal.z) < .7 else 0
    bm.to_mesh(q.data)
    bm.free()
    parts.append(q)
    return socket('RS_honeycomb_grille', parts)


# ---- 4. the S6 lower intakes ----

def intake(sign):
    tag = 'l' if sign > 0 else 'r'
    shape = ccw(mirrored([(.445, .37), (.47, .395), (.60, .414), (.75, .428), (.83, .432), (.858, .418), (.866, .36),
                          (.852, .282), (.822, .246), (.70, .236), (.55, .246), (.47, .27), (.445, .31)], sign))
    wrap = [(.44, -2.40), (.60, -2.385), (.75, -2.35), (.80, -2.32), (.87, -2.25)]
    yf = lambda x, z: interp(wrap, abs(x))
    parts = [ribbon('intake_surround_' + tag, shape, offset(shape, .012), yf, gloss_black, PARTS_ROOT, (0, -1, 0), .04, .025)]
    parts.append(surface('intake_mesh_' + tag, offset(shape, .012), lambda x, z: yf(x, z) + .045, intake_mesh, PARTS_ROOT, (0, -1, 0), 1))
    sx, sz = sign * .772, .335
    sy = yf(sx, sz) + .032
    parts.append(lathe('sensor_housing_' + tag, [(0, .044), (-.004, .046), (-.012, .043), (-.014, .036), (-.008, .03), (.02, .03)], satin_black, PARTS_ROOT, 24, 'Y'))
    parts[-1].location = (sx, sy, sz)
    parts.append(lathe('sensor_face_' + tag, [(-.008, 0), (-.0095, .02), (-.008, .031)], gloss_black, PARTS_ROOT, 24, 'Y'))
    parts[-1].location = (sx, sy, sz)
    # One blade from under the sensor inward, falling and thinning to a point.
    stations = [(.83, .302, .02), (.76, .297, .018), (.66, .291, .014), (.56, .286, .009), (.47, .29, .002)]
    vs = []
    for x, z, t in stations:
        x *= sign
        y = yf(x, z) - .002
        vs += [(x, y, z + t / 2), (x, y, z - t / 2), (x, y + .03, z + t / 2), (x, y + .03, z - t / 2)]
    fs = []
    for i in range(len(stations) - 1):
        a, b = i * 4, i * 4 + 4
        fs += [(a, b, b + 1, a + 1), (a, a + 2, b + 2, b), (a + 1, b + 1, b + 3, a + 3)]
    fs.append((0, 1, 3, 2))
    parts.append(facing(bevel(mesh('intake_blade_' + tag, vs, fs, gloss_black, PARTS_ROOT, True), .002, 1), (0, -1, 0)))
    return socket('lower_intake_' + tag, parts)


# ---- 5a. mirrors with aluminium-look caps ----

def mirror(sign):
    side = 'left' if sign > 0 else 'right'
    # Superellipse sections lofted outward from the door; the cap is the
    # front and top, the black housing the lower lip and the arm.
    # (outward, front depth, top, bottom, back depth): a flat top, a lower
    # edge that falls toward the outboard end, a rounded outboard end.
    stations = [(.0, .018, .025, -.02, .03), (.035, .03, .04, -.03, .03), (.06, .045, .062, -.045, .045),
                (.10, .052, .068, -.055, .05), (.15, .053, .07, -.064, .05), (.19, .05, .068, -.068, .048),
                (.215, .042, .06, -.062, .046), (.232, .026, .045, -.045, .04), (.24, .01, .02, -.02, .036)]
    n = 20
    vs, sec = [], []
    for x, ay, top, bottom, ab in stations:
        ring = []
        for i in range(n):
            t = i * 2 * math.pi / n
            c, s = math.cos(t), math.sin(t)
            ey = abs(c) ** .55 * (1 if c >= 0 else -1)
            ez = abs(s) ** .55 * (1 if s >= 0 else -1)
            # Flat glass at the back (+Y), rounded front.
            yy = -ay * ey if ey > 0 else -ab * ey * .25
            ring.append(len(vs))
            vs.append((sign * x, yy, (top + bottom) / 2 + (top - bottom) / 2 * ez))
        sec.append(ring)
    cap_faces, housing_faces = [], []
    for k in range(len(stations) - 1):
        for i in range(n):
            j = (i + 1) % n
            f = (sec[k][i], sec[k][j], sec[k + 1][j], sec[k + 1][i])
            t = (i + .5) * 2 * math.pi / n
            on_cap = k >= 1 and (math.cos(t) > .05 or math.sin(t) > .35) and not (math.sin(t) < -.4)
            (cap_faces if on_cap else housing_faces).append(f)
    tip = len(vs)
    vs.append((sign * .242, .005, 0))
    for i in range(n):
        cap_faces.append((sec[-1][i], sec[-1][(i + 1) % n], tip))
    mount = Vector((sign * .89, -.60, 1.0))
    vs = [tuple(Vector(v) + mount) for v in vs]
    cap = facing(mesh('mirror_cap_shell_' + side, vs, cap_faces, aluminium, PARTS_ROOT, True), (0, -1, .4))
    housing = mesh('mirror_housing_' + side, vs, housing_faces, satin_black, PARTS_ROOT, True)
    if sign < 0:
        housing.data.flip_normals()
    # Glass and the indicator strip under the cap's lower front edge.
    gl = [tuple(Vector((sign * x, .016, z)) + mount) for x, z in [(.065, .05), (.20, .058), (.222, .045), (.225, -.04), (.20, -.058), (.10, -.048), (.062, -.03)]]
    glass_obj = facing(mesh('mirror_glass_' + side, gl, [tuple(range(len(gl)))], mirror_glass, PARTS_ROOT), (0, 1, 0))
    strip = tube('mirror_indicator_' + side, smooth_path([tuple(Vector((sign * x, -.042 + .3 * (x - .14) ** 2, -.03 + .1 * (x - .1))) + mount) for x in (.08, .14, .20, .222)], 3), .0035, amber_lens, PARTS_ROOT, sides=5)
    root = socket('mirror_' + side, [housing, glass_obj, strip], mount)
    cap_root = empty('mirror_cap_' + side, (0, 0, 0), root)
    cap.parent = cap_root
    cap.data.transform(Matrix.Translation(-mount))
    return root


# ---- 5b. badges ----

def badge_text(name, word, loc, size, mat, rot, depth=.0012):
    return text(name, word, loc, size, mat, PARTS_ROOT, rot, depth)


def badges():
    out = []
    # Ali's boot lid (night photo): black rings centred, a black S6 low on the
    # vehicle-left side with the red S accent.
    rings = []
    for i in range(4):
        cx = (i - 1.5) * .049
        pts = [(cx + .034 * math.sin(t * 2 * math.pi / 32), REAR - .028 + (.0015 if i % 2 else 0), .985 + .034 * math.cos(t * 2 * math.pi / 32)) for t in range(32)]
        rings.append(tube('boot_ring_%d' % i, pts, .0042, gloss_black, PARTS_ROOT, True, 6))
    out.append(socket('badge_rings_rear', rings))
    s6 = badge_text('badge_S6_letters', 'S6', (.475, REAR - .018, .815), .034, gloss_black, (math.pi / 2, 0, math.pi))
    s6.scale = (1.2, 1, 1)
    accent = box('badge_S6_red_accent', (.497, REAR - .0185, .826), (.008, .0012, .007), red_mark, PARTS_ROOT, 0)
    out.append(socket('badge_S6_rear', [s6, accent]))
    # V8T behind each front wheel arch (Audi's placement; not in Ali's photos).
    for sign in (1, -1):
        tag = 'l' if sign > 0 else 'r'
        rot = (math.pi / 2, 0, math.pi / 2 * sign)
        v8 = badge_text('badge_V8_' + tag, 'V8', (sign * .93, -.935 - .004 * sign, .705), .022, chrome, rot)
        t = badge_text('badge_T_' + tag, 'T', (sign * .93, -.935 + .0155 * sign, .705), .022, red_mark, rot)
        out.append(socket('badge_V8T_fender_' + tag, [v8, t]))
    return out


# ---- 5c. quad oval tips and the early diffuser insert ----

def exhaust():
    yf = lambda x, z: REAR - .015 - .14 * (abs(x) / .8) ** 6
    shape = ccw([(-.80, .37), (-.62, .355), (0, .352), (.62, .355), (.80, .37), (.815, .32), (.79, .245),
                 (.70, .232), (0, .228), (-.70, .232), (-.79, .245), (-.815, .32)])
    diffuser = [surface('diffuser_insert', shape, yf, platinum, PARTS_ROOT, (0, 1, 0), 1)]
    border = ccw([(-.80, .378), (0, .36), (.80, .378), (.80, .368), (0, .35), (-.80, .368)])
    rim = [(x, yf(x, z) + .004, z) for x, z in [(-.80, .372), (-.4, .356), (0, .354), (.4, .356), (.80, .372)]]
    diffuser.append(tube('diffuser_aluminium_border', smooth_path(rim, 4), .004, aluminium, PARTS_ROOT, sides=6))
    diffuser.append(tube('diffuser_centre_blade', [(-.49, yf(0, .3) + .008, .298), (.49, yf(0, .3) + .008, .298)], .0075, chrome, PARTS_ROOT, sides=10, caps=True))
    tips = []
    for x in (.680, .577, -.577, -.680):
        tag = ('l' if x > 0 else 'r') + ('_outer' if abs(x) > .6 else '_inner')
        a, b, n = .047, .035, 28
        rings = [(1.0, 0), (1.0, .07), (.96, .074), (.93, .07), (.93, .0)]
        vs, fs = [], []
        for s, d in rings:
            for i in range(n):
                t = i * 2 * math.pi / n
                vs.append((x + a * s * math.cos(t), yf(x, .3) + .012 - .08 + d, .30 + b * s * math.sin(t)))
        for k in range(len(rings) - 1):
            for i in range(n):
                j = (i + 1) % n
                fs.append((k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i))
        tip = mesh('exhaust_tip_' + tag, vs, fs, chrome, PARTS_ROOT, True)
        dark = surface('exhaust_tip_bore_' + tag, [(x + .043 * math.cos(t * 2 * math.pi / 16), .30 + .032 * math.sin(t * 2 * math.pi / 16)) for t in range(16)],
                       lambda px, pz: yf(x, .3) - .02, matte_black, PARTS_ROOT, (0, 1, 0), 0)
        tip_root = socket('exhaust_tip_' + tag + '_node', [tip, dark], (x, yf(x, .3) + .012, .30))
        tip_root.name = 'tip_' + tag
        tips.append(tip_root)
    group = socket('exhaust_tips', [], (0, yf(0, .3), .30))
    for t in tips:
        world = t.location.copy()
        t.parent = group
        t.location = world - group.location
    return [socket('rear_diffuser', diffuser), group]


# ---- 6. wheels and calipers on their corners ----

def corners():
    mats = {
        'rubber': material('S6_tyre_rubber', '161718', 0, .86),
        'wheel': material('S6_wheel_silver', 'b9bcc0', .9, .26, .5),
        'wheel_dark': material('S6_wheel_dark_recess', '3c3f43', .6, .45),
        'steel': material('S6_wheel_bolt_steel', 'c2c5c8', 1, .2),
        'disc': material('S6_brake_disc', '6c6e70', 1, .38),
        'caliper': material('S6_caliper_matte_black', '121314', .1, .62),
        'badge_red': red_mark,
        'white': material('S6_caliper_mark_white', 'e8e8e8', 0, .4),
    }
    made = []
    for code in 'fr':
        y = -WHEELBASE / 2 if code == 'f' else WHEELBASE / 2
        for side in 'lr':
            sign = 1 if side == 'l' else -1
            name = ('steer_f' if code == 'f' else 'axle_r') + side
            pivot = empty(name, (sign * TRACK[code] / 2, y, WHEEL_R), PARTS_ROOT)
            build_wheel(code, side, pivot, mats)
            made.append(pivot)
    return made


def build_parts():
    built = {}
    for sign in (1, -1):
        for fn in (headlight, taillight, intake, mirror):
            root = fn(sign)
            built[root.name] = root
    for root in [grille(), *badges(), *exhaust(), *corners()]:
        built[root.name] = root
    return built


PARTS = build_parts()
