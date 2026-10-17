"""The parts that make the CC-BY A6 into Ali's S6. Executed in build_s6.py's context.

Each part is built in the car's frame (X left, -Y forward, Z up, metres,
origin on the ground midway between the axles), then gathered under one
empty, its socket, whose origin is the point the assembly step snaps to the
base body (agents/A1/NOTES.md lists them). Until the base arrives the sockets
sit at provisional positions taken from the 2013 US S6 dimensions and Ali's
photos, so the set reads as the car's front, rear and corners in place.

What each part copies: the pre-facelift LED headlamps with the DRL band that
returns diagonally at the grille end, waves along the bottom and runs up the
outer edge (Ali's front photo); the two-piece tail lamps with the lit graphic
traced off his night photo, a double guide sweeping up inboard and parting
into a Y at the outer end, pale regions under it; his gloss black RS-style
honeycomb grille with black rings, a camera dot and the outlined "quattro" low in the frame,
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


def closed_spline(points, steps=4):
    """Catmull-Rom round a closed loop of (x, z) points, so an outline is drawn by its turns."""
    pts = [Vector(p) for p in points]
    n = len(pts)
    out = []
    for i in range(n):
        a, b, c, d = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        for j in range(steps):
            t = j / steps
            q = .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
            out.append((q.x, q.y))
    return out


def rounded(corners, segments=4):
    """A closed (x, z) outline through (x, z, radius) corners, each filleted to its radius."""
    out = []
    n = len(corners)
    for i, (x, z, r) in enumerate(corners):
        p = Vector((x, z))
        a = (Vector(corners[i - 1][:2]) - p).normalized()
        b = (Vector(corners[(i + 1) % n][:2]) - p).normalized()
        if r <= 0 or a.dot(b) < -.9999:
            out.append((x, z))
            continue
        half = math.acos(max(-1, min(1, a.dot(b)))) / 2
        c = p + (a + b).normalized() * (r / math.sin(half))
        s, e = p + a * (r / math.tan(half)) - c, p + b * (r / math.tan(half)) - c
        a0 = math.atan2(s.y, s.x)
        sweep = (math.atan2(e.y, e.x) - a0 + math.pi) % (2 * math.pi) - math.pi
        for k in range(segments + 1):
            t = a0 + sweep * k / segments
            out.append((c.x + r * math.cos(t), c.y + r * math.sin(t)))
    return out


def clip(poly, axis, value, keep_above):
    """Sutherland-Hodgman: the part of a closed polygon on one side of x or z = value."""
    k = 0 if axis == 'x' else 1
    side = lambda p: (p[k] - value) * (1 if keep_above else -1) >= 0
    out = []
    for i in range(len(poly)):
        a, b = poly[i - 1], poly[i]
        if side(b) != side(a):
            t = (value - a[k]) / (b[k] - a[k])
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
        if side(b):
            out.append(b)
    return out


def from_unit(points, x0, x1, z0, z1, sign=1):
    """Map (u, v) traced off a photo (u inboard 0 to outboard 1, v top 0 to bottom 1) into the car frame."""
    return [(sign * (x0 + (x1 - x0) * u), z0 + (z1 - z0) * v) for u, v in points]


def parallel(path, d):
    """A polyline beside path at distance d, to its left in (x, z)."""
    out = []
    for i, p in enumerate(path):
        a, b = Vector(path[max(i - 1, 0)]), Vector(path[min(i + 1, len(path) - 1)])
        t = (b - a).normalized()
        out.append((p[0] - t.y * d, p[1] + t.x * d))
    return out


def ngon(name, outline, yfun, mat, parent, direction):
    """One flat face over an outline; Blender triangulates concave ones correctly."""
    obj = mesh(name, [(x, yfun(x, z), z) for x, z in outline], [tuple(range(len(outline)))], mat, parent)
    return facing(obj, direction)


def rolled_frame(name, outline, yfun, profile, mat, parent):
    """A frame with a rounded section: (inset, setback) rings swept round a CCW outline."""
    n = len(outline)
    vs = []
    for d, back in profile:
        ring = offset(outline, d) if d else outline
        vs.extend((x, yfun(x, z) + back, z) for x, z in ring)
    fs = [(k * n + i, k * n + (i + 1) % n, (k + 1) * n + (i + 1) % n, (k + 1) * n + i)
          for k in range(len(profile) - 1) for i in range(n)]
    obj = mesh(name, vs, fs, mat, parent, True)
    obj.data.set_sharp_from_angle(angle=math.radians(50))
    return facing(obj, (0, -1, 0))


def strip(name, path, yfun, width, thick, setback, mat, parent, toward=-1, widths=None):
    """A flat band along an (x, z) path lying in a surface: its face toward -Y (front) or +Y (rear)."""
    n = len(path)
    vs = []
    for i, (x, z) in enumerate(path):
        a, b = Vector(path[max(i - 1, 0)]), Vector(path[min(i + 1, n - 1)])
        t = (b - a).normalized()
        w = (widths[i] if widths else width) / 2
        for side in (1, -1):
            px, pz = x - t.y * w * side, z + t.x * w * side
            y = yfun(px, pz) - toward * setback
            vs += [(px, y, pz), (px, y - toward * thick, pz)]
    fs = []
    for i in range(n - 1):
        a, b = i * 4, i * 4 + 4
        fs += [(a, a + 2, b + 2, b), (a + 1, b + 1, b + 3, a + 3), (a, b, b + 1, a + 1), (a + 2, a + 3, b + 3, b + 2)]
    fs += [(0, 1, 3, 2), ((n - 1) * 4, (n - 1) * 4 + 2, (n - 1) * 4 + 3, (n - 1) * 4 + 1)]
    obj = mesh(name, vs, fs, mat, parent)
    if obj.data.polygons[0].normal.y * toward < 0:
        obj.data.flip_normals()
    return obj


def honeycomb(name, region, yfun, pitch, flat, height, rib, depth, mat, parent, front=0., keep=None, margin=0., cell=None):
    """Flat-topped elongated hexagons (long horizontal edges, pointed ends) in a tight
    tiling: the next column sits half a pitch across and half a cell up. Cells whose
    outline lies inside region (grown by margin) are kept; ribs are rib wide, the
    openings depth deep.

    cell = (flat, run, end) gives the opening its own shape instead: flats that
    long, diagonals that far across, and short upright ends end tall where they
    meet the next columns' horizontal ribs (then end thick). The tiling hexagon
    round it is solved from the lattice, so the diagonal ribs stay even."""
    w = pitch - flat
    hexagon = [(-w / 2, 0), (-flat / 2, -height / 2), (flat / 2, -height / 2), (w / 2, 0), (flat / 2, height / 2), (-flat / 2, height / 2)]
    opening = offset(hexagon, rib / 2)
    if cell:
        f, run, end = cell
        rise = (height - 2 * end) / 2
        # The tile's diagonal runs midway between this opening's and the next column's.
        tile_flat = f + (pitch / 2 - f - run) - end * run / rise
        tip = (pitch - tile_flat) / 2
        half_w, half_h = f / 2 + run, height / 2 - end / 2
        opening = [(-half_w, end / 2), (-half_w, -end / 2), (-f / 2, -half_h), (f / 2, -half_h),
                   (half_w, -end / 2), (half_w, end / 2), (f / 2, half_h), (-f / 2, half_h)]
        # The tile's points are doubled so its ring pairs vertex for vertex with the opening's.
        hexagon = [(-tip, 0), (-tip, 0), (-tile_flat / 2, -height / 2), (tile_flat / 2, -height / 2),
                   (tip, 0), (tip, 0), (tile_flat / 2, height / 2), (-tile_flat / 2, height / 2)]
    n = len(opening)
    grown = offset(region, -margin) if margin else region
    xs, zs = [p[0] for p in region], [p[1] for p in region]
    vs, fs = [], []
    k = 0
    z = min(zs)
    while z < max(zs) + height:
        # The lattice is symmetric about the centreline, so mirrored parts match.
        x = math.floor(min(xs) / pitch) * pitch - pitch + (pitch / 2) * (k % 2)
        while x < max(xs) + pitch:
            if all(inside(x + dx, z + dz, grown) for dx, dz in hexagon) and (keep is None or keep(x, z)):
                base = len(vs)
                for ring, back in ((hexagon, 0), (opening, 0), (opening, depth)):
                    vs.extend((x + dx, yfun(x + dx, z + dz) + front + back, z + dz) for dx, dz in ring)
                for i in range(n):
                    j = (i + 1) % n
                    if hexagon[i] == hexagon[j]:
                        fs.append((base + i, base + n + j, base + n + i))
                    else:
                        fs.append((base + i, base + j, base + n + j, base + n + i))
                    fs.append((base + n + i, base + n + j, base + 2 * n + j, base + 2 * n + i))
            x += pitch
        z += height / 2
        k += 1
    return facing(mesh(name, vs, fs, mat, parent), (0, -1, 0))


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
# The LED low-beam modules are dark recessed optics with a small lens each;
# in Ali's daylight photo only the DRL band is lit, so lit they glow faintly.
low_beam = emitter('S6_low_beam_LED', 'f4f7ff', .3, '1e2124', .12)
tail_guide = emitter('S6_tail_light_guide', 'ff2a14', 40, '9a0c0c')
# Lit, the red lens glows dimly round the guides, and the pale regions under
# the bar glow warm (night photo); what those regions are is not established.
reflector = emitter('S6_tail_lens_glow', 'ff1a10', .35, '3a0306', .32)
pale_region = emitter('S6_tail_pale_region', 'ffb27a', 1.2, 'd8d2ca', .25)
quattro_edge = material('S6_quattro_outline', '9a9ea2', .6, .35)
sensor_face = material('S6_sensor_face', '1a1c1f', .3, .2, .6)


# ---- 1. headlights: pre-facelift C7 LED ----

# Traced off Ali's daylight photo, both lamps agreeing, as (u, v): u from the
# inboard tip (0) to the outer edge (1), v from the top (0) to the bottom (1).
HEAD_X, HEAD_Z = (.405, .872), (.805, .64)
HEAD_LENS = [(0, .52), (.1, .45), (.3, .34), (.5, .23), (.7, .13), (.85, .05), (.92, .015), (.97, .07), (1, .3), (1, .55),
             (.99, .74), (.965, .87), (.925, .935), (.88, .955), (.84, .96), (.77, .935), (.66, .9), (.58, .915), (.5, .94),
             (.42, .965), (.25, 1), (.19, .95), (.12, .82), (.05, .64)]
# The DRL band, from a brightness scan of the vehicle-right lamp: the diagonal
# return down from the grille end to its lowest point, the rise through the
# middle to a crest about two thirds out, the second dip near the outer third,
# then up round the outer corner and the outer edge. The lens's lower edge
# above follows the same wave.
HEAD_DRL = [(.035, .56), (.09, .625), (.14, .71), (.19, .8), (.23, .865), (.268, .9), (.32, .888), (.4, .866), (.5, .835),
            (.58, .81), (.657, .79), (.7, .797), (.77, .823), (.838, .847), (.885, .835), (.915, .79), (.935, .715),
            (.945, .62), (.945, .52), (.935, .36), (.92, .2), (.895, .07)]


def headlight(sign):
    tag = 'l' if sign > 0 else 'r'
    unit = lambda pts: from_unit(pts, *HEAD_X, *HEAD_Z, sign)
    shape = ccw(closed_spline(unit(HEAD_LENS), 3))
    wrap = [(.40, -2.365), (.55, -2.345), (.70, -2.29), (.80, -2.22), (.86, -2.15), (.875, -2.10)]
    yf = lambda x, z: interp(wrap, abs(x)) + (z - .72) * .35
    parts = [surface('headlamp_lens_' + tag, shape, yf, lens_clear, PARTS_ROOT, (0, -1, 0), 3, .007)]
    parts.append(ribbon('headlamp_bezel_' + tag, shape, offset(shape, .008), lambda x, z: yf(x, z) + .004,
                        gloss_black, PARTS_ROOT, (0, -1, 0), .05, .01))
    parts.append(surface('headlamp_housing_' + tag, offset(shape, .008), lambda x, z: yf(x, z) + .055, dark_chrome, PARTS_ROOT, (0, -1, 0), 1))
    # The DRL: a flat light guide 11 mm wide in a reflector channel twice that.
    band = [tuple(p) for p in smooth_path(unit(HEAD_DRL), 2)]
    parts.append(strip('DRL_light_guide_' + tag, band, yf, .011, .004, .016, drl, PARTS_ROOT))
    parts.append(strip('DRL_reflector_channel_' + tag, band, yf, .024, .006, .021, dark_chrome, PARTS_ROOT))
    # Five recessed LED low-beam optics in a row between the top edge and the
    # band, three smaller ones stacked inside the outer edge, a chrome brow over
    # the row. Each optic is a dished reflector with a small lens in it.
    v_top = lambda u: interp(HEAD_LENS[:6], u)
    v_band = lambda u: interp(HEAD_DRL[4:14], u)

    def optic(name, u, v, w, h):
        (x, z), = unit([(u, v)])
        corners = lambda a, b, r: ccw(rounded([(x - a, z - b, r), (x + a, z - b, r), (x + a, z + b, r), (x - a, z + b, r)], 3))
        parts.append(surface('LED_optic_%s_%s' % (name, tag), corners(w / 2, h / 2, .007), lambda px, pz: yf(px, pz) + .026,
                             dark_chrome, PARTS_ROOT, (0, -1, 0), 2, -.012, .006))
        parts.append(surface('LED_lens_%s_%s' % (name, tag), corners(w * .3, h * .14, .002), lambda px, pz: yf(px, pz) + .031,
                             low_beam, PARTS_ROOT, (0, -1, 0), 0))
    for i in range(5):
        u = .22 + i * .1
        optic('module_%d' % i, u, v_top(u) + .52 * (v_band(u) - v_top(u)), .04, .032)
    for i, (u, v) in enumerate([(.84, .22), (.82, .4), (.80, .58)]):
        optic('cup_%d' % i, u, v, .026, .022)
    brow = [tuple(p) for p in smooth_path(unit([(u, v_top(u) + .07) for u in (.12, .3, .5, .65, .78)]), 3)]
    parts.append(strip('headlamp_brow_' + tag, brow, yf, .004, .003, .02, chrome, PARTS_ROOT))
    return socket('headlight_' + tag, parts)


# ---- 2. taillights: split at the boot seam ----

# Traced off Ali's night photo (the S6, image left; the vehicle-right lamp is
# the sharper one), (u, v) as for the headlamp, u from the inboard end.
TAIL_X, TAIL_Z, TAIL_SEAM = (.356, .838), (.992, .846), .55
TAIL_LENS = [(0, .25), (.14, .13), (.39, .07), (.64, .03), (.85, 0), (.93, .03), (.99, .18), (1, .44), (.99, .76), (.95, .97),
             (.8, 1), (.55, .95), (.31, .91), (.07, .87), (.03, .74), (0, .44)]
# The lit graphic: a double light guide that sweeps up at the inboard end of
# the boot-lid piece, runs across the seam, and at the outer end of the fender
# piece parts into a Y, the upper line up the outer edge, the lower one down.
# The two lines are 10.5 mm guides 17 mm apart on centre, so a dark channel
# about 6.5 mm wide runs between them as in his night photo (TAIL_GUIDE).
TAIL_INNER = [(.03, .30), (.07, .45), (.11, .57), (.16, .635), (.25, .645), (.4, .645), (.546, .645)]
TAIL_UPPER = [(.556, .587), (.7, .587), (.8, .585), (.85, .56), (.872, .48), (.88, .33), (.885, .12)]
TAIL_LOWER = [(.556, .703), (.7, .703), (.8, .705), (.85, .73), (.872, .8), (.885, .87), (.893, .95)]
TAIL_GUIDE = (.0105, .017)   # each guide's width, and their centres apart
# Pale regions under the bar, one in each piece.
TAIL_PALE = [(.33, .53, .72, .88), (.58, .84, .73, .92)]


def taillight(sign):
    tag = 'l' if sign > 0 else 'r'
    unit = lambda pts: from_unit(pts, *TAIL_X, *TAIL_Z, sign)
    wrap = [(.34, 2.445), (.50, 2.437), (.62, 2.415), (.74, 2.375), (.80, 2.33), (.84, 2.27)]
    yf = lambda x, z: interp(wrap, abs(x)) - (z - .92) * .3
    shape = closed_spline(unit(TAIL_LENS), 3)
    seam = sign * (TAIL_X[0] + (TAIL_X[1] - TAIL_X[0]) * TAIL_SEAM)
    pieces = [('inner', ccw(clip(shape, 'x', seam - .003 * sign, sign < 0))),
              ('outer', ccw(clip(shape, 'x', seam + .003 * sign, sign > 0)))]
    parts = []
    for piece, outline in pieces:
        parts.append(surface('taillamp_lens_%s_%s' % (piece, tag), outline, yf, lens_red, PARTS_ROOT, (0, 1, 0), 2, .006))
        parts.append(ribbon('taillamp_bezel_%s_%s' % (piece, tag), outline, offset(outline, .006), lambda x, z: yf(x, z) - .003,
                            gloss_black, PARTS_ROOT, (0, 1, 0), .04, .008))
        parts.append(surface('taillamp_reflector_%s_%s' % (piece, tag), offset(outline, .006), lambda x, z: yf(x, z) - .03,
                             reflector, PARTS_ROOT, (0, 1, 0), 1))
    width, apart = TAIL_GUIDE
    lines = [('inner_a', TAIL_INNER, apart / 2), ('inner_b', TAIL_INNER, -apart / 2), ('outer_upper', TAIL_UPPER, 0), ('outer_lower', TAIL_LOWER, 0)]
    for name, trace, d in lines:
        path = [tuple(p) for p in smooth_path(unit(trace), 3)]
        if d:
            path = parallel(path, d * sign)
        parts.append(strip('tail_light_guide_%s_%s' % (name, tag), path, yf, width, .004, .012, tail_guide, PARTS_ROOT, 1))
    for i, (u0, u1, v0, v1) in enumerate(TAIL_PALE):
        (x0, z0), (x1, z1) = unit([(u0, v0), (u1, v1)])
        box_ = ccw(rounded([(x0, z0, .004), (x1, z0, .004), (x1, z1, .004), (x0, z1, .004)], 2))
        parts.append(surface('tail_pale_region_%s_%s' % (('inner', 'outer')[i], tag), box_, lambda x, z: yf(x, z) - .02,
                             pale_region, PARTS_ROOT, (0, 1, 0), 0))
    return socket('taillight_' + tag, parts)


# ---- 3. the RS-style honeycomb grille ----

# Right half of the frame's outline off Ali's photo, (x, z, corner radius):
# rounded top shoulders, sides that taper in and bend a little more under the
# mesh, big lower corners.
GRILLE_CORNERS = [(0, .792, 0), (.423, .792, .05), (.392, .477, .15), (.352, .322, .06), (0, .322, 0)]
# One opening of his mesh, measured in his photo at about 1.13 mm a pixel:
# (flat, diagonal run, upright end), metres.
GRILLE_CELL = (.029, .0135, .006)
# Audi's outlined quattro as on Ali's grille: each glyph's outline in x-heights,
# (x, z, corner radius), and where the glyph starts along the word.
_T = [(0, 1, 0), (.21, 1, 0), (.21, 1.17, 0), (.53, 1.17, 0), (.53, 1, 0), (1.37, 1, 0), (1.37, .74, 0), (.53, .74, 0), (.53, .29, .05),
      (1.45, .29, 0), (1.45, .47, 0), (1.76, .47, 0), (1.76, 0, .25), (.21, 0, .3), (.21, .74, 0), (0, .74, 0)]
QUATTRO = [
    (0, [[(1.89, 0, 0), (0, 0, .3), (0, 1, .3), (2.56, 1, .22), (2.56, -.35, 0), (2.26, -.35, 0), (2.26, .73, .05), (.3, .73, .05), (.3, .27, .05), (1.89, .27, 0)]]),
    (2.97, [[(0, 1, 0), (0, 0, .22), (2.57, 0, .3), (2.57, 1, 0), (2.27, 1, 0), (2.27, .27, .06), (.3, .27, .06), (.3, 1, 0)]]),
    (5.92, [[(1.89, 0, 0), (0, 0, .3), (0, 1, .3), (2.54, 1, .22), (2.54, -.08, 0), (2.24, -.08, 0), (2.24, .73, .05), (.3, .73, .05), (.3, .27, .05), (1.89, .27, 0)]]),
    (8.92, [_T]),
    (11.03, [_T]),
    (13.21, [[(0, 0, 0), (0, 1, .3), (1.95, 1, .3), (1.95, .32, 0), (1.63, .32, 0), (1.63, .66, .05), (.3, .66, .05), (.3, 0, 0)]]),
    (15.59, [[(0, 0, .42), (2.5, 0, .42), (2.5, 1, .42), (0, 1, .42)], [(.32, .27, .12), (2.18, .27, .12), (2.18, .73, .12), (.32, .73, .12)]]),
]
QUATTRO_LENGTH = 18.16


def quattro_script(baseline, yfun, height=.0275, proud=.0016, line=.0014):
    """The word as shallow letters seated on the panel: black faces, walls down to
    the panel, and a thin pale outline round every edge of each face."""
    vs, fs, mats = [], [], []

    def add(face, mat):
        fs.append(face)
        mats.append(mat)

    def put(ring, back):
        base = len(vs)
        vs.extend((x, yfun(x, z) - back, z) for x, z in ring)
        return base
    for start, contours in QUATTRO:
        rings = [ccw([((start + x - QUATTRO_LENGTH / 2) * height, baseline + z * height) for x, z in rounded(c, 3)]) for c in contours]
        n = len(rings[0])
        for k, ring in enumerate(rings):
            # Walls from the panel up to the face, and the outline: a strip just
            # inside the outer contour, just outside a hole. A hole's faces wind
            # the other way round so they all face out of the letter.
            flip = (lambda f: f) if k == 0 else (lambda f: tuple(reversed(f)))
            b0, b1 = put(ring, 0), put(ring, proud)
            e0, e1 = put(ring, proud + .0002), put(offset(ring, line if k == 0 else -line), proud + .0002)
            for i in range(len(ring)):
                j = (i + 1) % len(ring)
                add(flip((b0 + i, b0 + j, b1 + j, b1 + i)), 0)
                add(flip((e0 + i, e0 + j, e1 + j, e1 + i)), 1)
        face_outer = put(offset(rings[0], line), proud)
        if len(rings) == 1:
            add(tuple(range(face_outer, face_outer + n)), 0)
        else:
            face_inner = put(offset(rings[1], -line), proud)
            for i in range(n):
                j = (i + 1) % n
                add((face_outer + i, face_outer + j, face_inner + j, face_inner + i), 0)
    obj = mesh('grille_quattro_script', vs, fs, gloss_black, PARTS_ROOT)
    obj.data.materials.append(quattro_edge)
    for p, m in zip(obj.data.polygons, mats):
        p.material_index = m
    return obj


def grille():
    full = GRILLE_CORNERS + [(-x, z, r) for x, z, r in reversed(GRILLE_CORNERS[1:-1])]
    shape = ccw(rounded(full, 5))
    yf = lambda x, z: FRONT + .012 + .3 * x * x + (z - .55) * .26
    # The frame's section rolls from the bumper over a rounded lip into the opening.
    frame = [(0, .03), (.002, .009), (.006, .002), (.012, 0), (.018, .001), (.022, .006), (.025, .018), (.026, .045)]
    parts = [rolled_frame('grille_frame', shape, yf, frame, gloss_black, PARTS_ROOT)]
    inner = offset(shape, .026)
    parts.append(ngon('grille_backing', inner, lambda x, z: yf(x, z) + .06, matte_black, PARTS_ROOT, (0, -1, 0)))
    # The quattro panel is the frame's lower band; a rib divides it from the mesh.
    band_top = .445
    band = ccw(clip(inner, 'z', band_top, False))
    parts.append(ngon('grille_quattro_panel', band, lambda x, z: yf(x, z) + .014, gloss_black, PARTS_ROOT, (0, -1, 0)))
    half = max(x for x, z in band) + .004
    rib = [(-half + 2 * half * i / 12, band_top + .003) for i in range(13)]
    parts.append(strip('grille_divider_rib', rib, yf, .008, .012, .006, gloss_black, PARTS_ROOT))
    # The openings as measured on Ali's grille: 56 x 24 mm, flats 29 mm long,
    # shallow diagonals, blunt ends against 6 mm horizontal ribs, thin diagonal
    # ribs; 92 mm across a row, the next column half a pitch over and 15 mm up.
    # The mesh runs on behind the rings.
    region = ccw(clip(inner, 'z', band_top + .008, True))
    parts.append(honeycomb('grille_honeycomb', region, yf, .092, .035, .030, .003, .018, gloss_black, PARTS_ROOT, .02, margin=.012,
                           cell=GRILLE_CELL))
    for i in range(4):
        cx = (i - 1.5) * .0637
        y0 = yf(cx, .692) + (.006 if i % 2 else .002)
        ring = [(cx + .047 * math.sin(t * 2 * math.pi / 40), y0, .692 + .047 * math.cos(t * 2 * math.pi / 40)) for t in range(40)]
        parts.append(tube('grille_ring_%d' % i, ring, .0058, gloss_black, PARTS_ROOT, True, 8))
    parts.append(cylinder('grille_camera', (0, yf(0, .609) + .004, .609), .0065, .02, satin_black, PARTS_ROOT, 12, 'Y'))
    parts.append(cylinder('grille_camera_lens', (0, yf(0, .609) + .001, .609), .004, .004, glass('S6_camera_lens', '202428', .9, .02), PARTS_ROOT, 12, 'Y'))
    parts.append(quattro_script(.376, lambda x, z: yf(x, z) + .014))
    return socket('RS_honeycomb_grille', parts)


# ---- 4. the S6 lower intakes ----

# Traced off Ali's front photo, (u, v) as for the lamps: a rounded opening,
# tall at the outer end round the sensor, tapering in to the grille.
INTAKE_X, INTAKE_Z = (.445, .866), (.432, .236)
INTAKE = [(0, .46), (.15, .4), (.4, .28), (.66, .15), (.85, .05), (.97, 0), (.99, .13), (1, .37), (.98, .6), (.94, .76),
          (.79, .88), (.53, .96), (.34, 1), (.19, .99), (.14, .93), (.1, .81), (.05, .63)]
INTAKE_SENSOR = (.78, .48)
# The blade leaves the sensor bezel low on its inboard side and sweeps down
# and in to a point just outside the opening, 20 mm thinning to a point (m).
INTAKE_BLADE = [(.71, .63), (.6, .65), (.45, .685), (.3, .72), (.15, .765), (.06, .80), (.01, .83)]
INTAKE_BLADE_T = [.02, .017, .014, .011, .008, .005, .001]


def intake(sign):
    tag = 'l' if sign > 0 else 'r'
    unit = lambda pts: from_unit(pts, *INTAKE_X, *INTAKE_Z, sign)
    shape = ccw(closed_spline(unit(INTAKE), 3))
    wrap = [(.44, -2.40), (.60, -2.385), (.75, -2.35), (.80, -2.32), (.87, -2.25)]
    yf = lambda x, z: interp(wrap, abs(x))
    surround = [(0, .02), (.002, .005), (.005, 0), (.009, .001), (.012, .007), (.013, .03)]
    parts = [rolled_frame('intake_surround_' + tag, shape, yf, surround, gloss_black, PARTS_ROOT)]
    opening = offset(shape, .013)
    parts.append(ngon('intake_backing_' + tag, opening, lambda x, z: yf(x, z) + .05, matte_black, PARTS_ROOT, (0, -1, 0)))
    (sx, sz), = unit([INTAKE_SENSOR])
    clear = lambda x, z: math.hypot(x - sx, z - sz) > .056
    parts.append(honeycomb('intake_honeycomb_' + tag, opening, yf, .056, .021, .018, .0025, .012, satin_black, PARTS_ROOT, .022,
                           keep=clear, margin=.008))
    # The round sensor housing (not a fog lamp, never lit): a thick bezel and a domed dark face.
    sy = yf(sx, sz) + .01
    for name, profile, mat in [('sensor_bezel_', [(.02, .05), (-.002, .052), (-.010, .049), (-.014, .044), (-.013, .039), (-.008, .036), (.004, .0355)], gloss_black),
                               ('sensor_face_', [(.004, .036), (-.001, .03), (-.006, .021), (-.009, .011), (-.010, 0)], sensor_face)]:
        part = lathe(name + tag, profile, mat, PARTS_ROOT, 32, 'Y')
        part.location = (sx, sy, sz)
        parts.append(part)
    path = [tuple(p) for p in smooth_path(unit(INTAKE_BLADE), 3)]
    widths = [interp(list(enumerate(INTAKE_BLADE_T)), i / 3) for i in range(len(path))]
    blade = strip('intake_blade_' + tag, path, yf, 0, .035, -.01, gloss_black, PARTS_ROOT, widths=widths)
    parts.append(bevel(blade, .0015, 1))
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
