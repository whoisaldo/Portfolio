"""Ali's S6 on the A6 C7 sedan base. Executed in build_s6.py's context.

The body is an adapted A6 C7 sedan model (the 2015 facelift), brought into
the S6's frame by s6_base_import.py and converted here into Ali's 2013
pre-facelift S6:

- the facelift's lamps, grille, intake inserts, fog lamps, badges, plates,
  exhaust outlets and wheels are removed; s6_parts.py supplies the
  pre-facelift lamps, the RS grille, the S6 intakes and blades, the badges,
  the diffuser with the quad oval tips and the wheels;
- the bumper, lamp and diffuser openings are reshaped so those parts sit
  flush (fit_opening());
- the mirrors keep their shape and get aluminium-look caps;
- every surface gets this car's materials (Quartz Gray paint, aluminium
  window trim, black plastics, a black leather cabin), and the dense
  interior and underbody are reduced where the garage cameras cannot see
  the difference.

The base is read from design/audi-s6/base/a6c7-base.blend, which is local
and never committed (see s6_base_import.py).
"""

import copy

BASE_BLEND = ROOT / 'design/audi-s6/base/a6c7-base.blend'


def load_base():
    """Append the base's meshes into the scene: {base_key: object}."""
    if not BASE_BLEND.exists():
        raise FileNotFoundError(f'{BASE_BLEND} is missing: run scripts/blender/s6_base_import.py first.')
    with bpy.data.libraries.load(str(BASE_BLEND), link=False) as (src, dst):
        dst.objects = list(src.objects)
    objs = {}
    for obj in dst.objects:
        scene.collection.objects.link(obj)
        obj.use_fake_user = False
        objs[obj['base_key']] = obj
    return objs


def islands(bm):
    """The mesh's connected pieces, each a list of faces."""
    bm.faces.ensure_lookup_table()
    seen, out = set(), []
    for f in bm.faces:
        if f.index in seen:
            continue
        stack, comp = [f], []
        seen.add(f.index)
        while stack:
            g = stack.pop()
            comp.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen:
                        seen.add(h.index)
                        stack.append(h)
        out.append(comp)
    return out


class Island:
    def __init__(self, key, faces, mats):
        vs = {v for f in faces for v in f.verts}
        self.key, self.faces, self.n = key, faces, len(faces)
        self.lo = Vector([min(v.co[i] for v in vs) for i in range(3)])
        self.hi = Vector([max(v.co[i] for v in vs) for i in range(3)])
        self.c = (self.lo + self.hi) / 2
        self.mat = mats[faces[0].material_index]


def within(isl, lo, hi):
    return all(lo[i] <= isl.lo[i] and isl.hi[i] <= hi[i] for i in range(3))


def mirrored_x(isl):
    """The island's bounds as if on the car's left (+X), for side-symmetric rules."""
    if isl.c.x >= 0:
        return isl
    other = copy.copy(isl)
    other.lo, other.hi = Vector((-isl.hi.x, isl.lo.y, isl.lo.z)), Vector((-isl.lo.x, isl.hi.y, isl.hi.z))
    other.c = (other.lo + other.hi) / 2
    return other


# Whole objects of the base that the S6 replaces: the facelift's lamps, its
# wheels and hubs, and the lamp glass.
DROPPED = ('wheel_', 'hub_', 'headlight_', 'taillight_', 'brakelight_', 'extralight_', 'reversinglight_',
           'indicator_lr', 'indicator_rr', 'indicator_lf.001', 'indicator_rf.001')
GLASS = ('window_', 'windscreen')
# The engine bay under the hood is A2's (s6_engine_bay.py): the base's bay
# floor and plates go, the fenders and their inner returns stay.
BAY = (Vector((-.74, -2.2, .30)), Vector((.74, -.95, .98)))
# The mirror heads, outboard of the front doors' glass.
MIRROR = (Vector((.80, -.64, .93)), Vector((1.07, -.38, 1.14)))


BADGE_SPOTS = []


def role(key, isl):
    """Where an island of the base goes: 'shell', 'hood', 'glass', 'cabin',
    'mirror', 'plate', 'reflector', 'guide_*' or None (removed). Materials are
    the base's own slot names (base_key), so the rules read like the model.
    Guides are the facelift's lamp lenses and grille: surfaces the S6's parts
    are laid on, removed once they are fitted."""
    m = isl.mat
    front = isl.c.y < (-1.6 if isl.c.z < .5 else -1.75) and isl.c.z < .80
    rear = isl.c.y > 1.75 and isl.c.z < 1.0
    if key.startswith(DROPPED):
        return None
    if key == 'misc_a':
        return 'guide_lamps'
    if key.startswith(GLASS):
        return 'glass'
    if key in ('indicator_lf', 'indicator_rf', 'misc_b', 'misc_c'):
        return 'mirror'
    if key == 'steeringwheel':
        return 'cabin'
    if key.startswith('door_'):
        if key.endswith('_f') and within(mirrored_x(isl), *MIRROR):
            return 'mirror'
        outboard = mirrored_x(isl)
        if outboard.lo.x > .88 or (outboard.hi.x > .75 and isl.c.z > .9):
            # The doors' inner belt seals and handle recesses show from outside: black trim.
            return 'shell'
        if m.startswith(('interiordfs', 'carbon', 'patterndfs')) or m in ('black', 'dinghyblack.002', 'dinghyblack.003', 'dinghyblack.004', 'dinghyblack.005', 'dinghyblack.006'):
            return 'cabin'
        return 'shell'
    if key in ('chassis', 'bodyshell') and mirrored_x(isl).lo.x > .6 and 1.0 < abs(isl.c.y) < 1.95 and isl.c.z < .75:
        # The wheel wells' inner walls.
        return 'shell'
    if key == 'chassis':
        return 'cabin'
    if key == 'bodyshell':
        if m in ('far.001', 'capture2'):
            # The facelift's tail lamp interiors; the plates (capture2 carries their
            # text, and the front plate goes: Ali's car has none).
            return 'plate' if m == 'capture2' and rear else None
        if m == 'dinghyblack' and (isl.c.z < .33 or abs(isl.c.x) > .78):
            return 'shell'
        return 'cabin'
    # bodyshell.001: the outer body.
    if m == 'paint' and isl.n <= 60 and isl.c.y > 2.38 and .6 < isl.c.z < .8 and .3 < abs(isl.c.x) < .5 and isl.hi.y - isl.lo.y < .03:
        # The facelift's model and engine letters on the boot lid.
        return None
    if m == 'paint':
        if isl.n > 500 and within(isl, Vector((-.85, -2.32, .69)), Vector((.85, -.88, 1.0))):
            return 'hood'
        return 'shell'
    if m in ('exteriorost', 'capture2', 'whitye', 'black.001'):
        return None
    if m == 'glass.001':
        return 'glass' if isl.c.z > .95 else None
    if key == 'bodyshell.001' and front and abs(isl.c.x) < .45 and .27 < isl.c.z < .74 and isl.c.y < -2.15:
        return 'guide_grille'
    if rear and m == 'black.003' and isl.c.z > .6:
        # The facelift's badges: the S6's go where they were.
        BADGE_SPOTS.append((isl.n, isl.c.copy()))
        return None
    if front or rear:
        # The facelift's grille, intake inserts, fog lamps, lamp interiors,
        # badges and exhaust outlets.
        return None
    if within(isl, *BAY):
        return None
    return 'shell'


# Ali's car: Quartz Gray, aluminium-look window trim (the S6's; his photos do
# not show the sides, so it is provisional), black plastics, black leather.
window_trim = material('S6_window_trim_aluminium', 'aeb2b6', .9, .3, .4)
body_black = material('S6_body_black_plastic', '0d0e0f', 0, .62)
window_glass = glass('S6_window_glass_tint', '101316', .8, .02)
blank_plate = material('S6_blank_plate', 'd9dbdc', 0, .5)
rear_reflector = material('S6_rear_reflector', '6a0408', .2, .25, .5)
INTERIOR = {
    'leather': material('S6_interior_leather_black', '141414', 0, .55),
    'trim': material('S6_interior_trim_black', '0c0c0d', .05, .42),
    'inlay': material('S6_interior_inlay_dark', '2a2c2e', .5, .35),
    'headliner': material('S6_interior_headliner_black', '1b1b1c', 0, .9),
    'carpet': material('S6_interior_carpet_black', '101010', 0, .95),
    'red': material('S6_interior_stitch_red', '5a0d10', 0, .5),
    'glass': material('S6_interior_glass', '202428', .2, .1),
}


def material_for(r, m):
    """This car's material for a base island in role r with base material m."""
    if r in ('shell', 'hood'):
        return paint if m == 'paint' else window_trim if m == 'black.003' else body_black
    if r == 'glass':
        return window_glass
    if r.startswith('guide'):
        return matte_black
    if r == 'plate':
        return blank_plate
    if r == 'reflector':
        return rear_reflector
    if r == 'mirror':
        return aluminium if m == 'paint' else mirror_glass if m.startswith('interiordfs') else amber_lens if m in ('cligno', 'glass.001') else satin_black
    if m.startswith('interiordfs') or m.startswith('dinghyblack.00') and m != 'dinghyblack.001':
        return INTERIOR['leather']
    if m.startswith('carbon'):
        return INTERIOR['inlay']
    if m.startswith('roof_black'):
        return INTERIOR['headliner']
    if m.startswith('carpet'):
        return INTERIOR['carpet']
    if m == 'rouge':
        return INTERIOR['red']
    if m == 'glass':
        return INTERIOR['glass']
    return INTERIOR['trim']


def split_base(objs):
    """Sort every island of the base into this car's pieces: {role: object}."""
    out = {}
    targets = {}
    for key, obj in objs.items():
        mats = [m['base_key'] for m in obj.data.materials]
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        for faces in islands(bm):
            isl = Island(key, faces, mats)
            r = role(key, isl)
            if r == 'shell' and isl.mat == 'paint' and isl.n <= 40 and isl.c.y > 2.3 and abs(isl.c.x) > .7 and isl.c.z < .66:
                r = 'reflector'
            if r is None:
                continue
            if r == 'reflector':
                target = 'shell'
            elif r == 'mirror':
                target = 'mirror_l' if isl.c.x > 0 else 'mirror_r'
            else:
                target = r
            tb, slots = targets.setdefault(target, (bmesh.new(), []))
            mat = material_for(r, isl.mat)
            if mat not in slots:
                slots.append(mat)
            index = slots.index(mat)
            vmap = {}
            for f in faces:
                for v in f.verts:
                    if v not in vmap:
                        vmap[v] = tb.verts.new(v.co)
                try:
                    nf = tb.faces.new([vmap[v] for v in f.verts])
                except ValueError:
                    continue
                nf.material_index = index
                nf.smooth = f.smooth
        bm.free()
        data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.meshes.remove(data)
    for target, (tb, slots) in targets.items():
        data = bpy.data.meshes.new('base_' + target)
        tb.to_mesh(data)
        tb.free()
        for m in slots:
            data.materials.append(m)
        obj = bpy.data.objects.new('base_' + target, data)
        scene.collection.objects.link(obj)
        out[target] = obj
    for m in [m for m in bpy.data.materials if 'base_key' in m and m.users == 0]:
        bpy.data.materials.remove(m)
    return out


# ---- fitting the S6's parts to the base ----

def surface_tree(objs):
    """A BVH of the objects' faces in world space."""
    verts, polys = [], []
    for o in objs:
        world = o.matrix_world
        base = len(verts)
        verts += [world @ v.co for v in o.data.vertices]
        polys += [[base + i for i in p.vertices] for p in o.data.polygons]
    return BVHTree.FromPolygons(verts, polys)


def part_meshes(root):
    return [o for o in root.children_recursive if o.type == 'MESH']


def warp(root, fn):
    """Move every vertex of a part through fn(world point) -> world point."""
    bpy.context.view_layer.update()
    for obj in part_meshes(root):
        world = obj.matrix_world.copy()
        inv = world.inverted()
        for v in obj.data.vertices:
            v.co = inv @ fn(world @ v.co)
        obj.data.update()


def outline_xz(obj):
    """The mesh's largest boundary loop, in world space."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.transform(obj.matrix_world)
    loops, seen = [], set()
    for e in [e for e in bm.edges if len(e.link_faces) == 1]:
        if e.index in seen:
            continue
        loop, v, cur = [e.verts[0]], e.verts[1], e
        seen.add(e.index)
        while v is not loop[0]:
            loop.append(v)
            nxt = next((f for f in v.link_edges if f is not cur and len(f.link_faces) == 1 and f.index not in seen), None)
            if nxt is None:
                break
            seen.add(nxt.index)
            cur, v = nxt, nxt.other_vert(v)
        loops.append([vv.co.copy() for vv in loop])
    bm.free()
    area = lambda loop: abs(sum(a.x * b.z - b.x * a.z for a, b in zip(loop, loop[1:] + loop[:1]))) / 2
    return max(loops, key=area)


def top_edge(points, bins=60):
    """z of the highest point over x, as a smoothed interpolation table on |x|."""
    xs = [abs(p[0]) for p in points]
    x0, x1 = min(xs), max(xs)
    rows = []
    for k in range(bins + 1):
        x = x0 + (x1 - x0) * k / bins
        near = [p[-1] for p in points if abs(abs(p[0]) - x) < (x1 - x0) / bins * 1.5]
        if near:
            rows.append((x, max(near)))
    # A vertex cloud's top is a staircase between its columns of vertices:
    # smooth it, so a lamp sheared onto it does not zigzag.
    n = len(rows)
    return [(rows[i][0], sum(rows[j][1] for j in range(max(0, i - 3), min(n, i + 4))) / (min(n, i + 4) - max(0, i - 3))) for i in range(n)]


def loop_top(loops, n=80):
    """z of the upper edge of ordered closed outlines over |x|, as an interpolation table."""
    loops = [[(abs(p[0]), p[-1]) for p in loop] for loop in loops]
    x0, x1 = min(p[0] for l in loops for p in l), max(p[0] for l in loops for p in l)
    rows = []
    for k in range(n + 1):
        x = x0 + (x1 - x0) * k / n
        zs = [a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]) for pts in loops for a, b in zip(pts, pts[1:] + pts[:1])
              if a[0] != b[0] and min(a[0], b[0]) <= x <= max(a[0], b[0])]
        if zs:
            rows.append((x, max(zs)))
    return rows


def ray_y(tree, x, z, ahead):
    """y where a ray along the car's axis from outside (ahead -1 the nose, +1 the tail) meets the tree."""
    hit = tree.ray_cast(Vector((x, 4 * ahead, z)), Vector((0, -ahead, 0)), 6)[0]
    return hit.y if hit is not None else None


def piece(obj, keep):
    """A copy of the faces of obj whose centres pass keep(centre)."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f.calc_center_median())], context='FACES')
    data = bpy.data.meshes.new(obj.name + '_piece')
    bm.to_mesh(data)
    bm.free()
    out = bpy.data.objects.new(obj.name + '_piece', data)
    scene.collection.objects.link(out)
    return out


def fit_surface(points, nx=4, nz=2):
    """A smooth y(x, z) through points: least squares in powers of |x| and z."""
    import numpy
    terms = [(i, j) for i in range(nx + 1) for j in range(nz + 1)]
    a = numpy.array([[abs(p[0]) ** i * p[2] ** j for i, j in terms] for p in points])
    c = numpy.linalg.lstsq(a, numpy.array([p[1] for p in points]), rcond=None)[0]
    return lambda x, z: float(sum(k * abs(x) ** i * z ** j for k, (i, j) in zip(c, terms)))


def outermost(points, ahead, r=.008, step=.003):
    """The points on a part's outer face: none further out within r across the car."""
    out = []
    for p in points:
        if not any(abs(q.x - p.x) < r and abs(q.z - p.z) < r and (q.y - p.y) * -ahead > step for q in points):
            out.append(p)
    return out


def fit_lamp(root, lenses, guide, design, tuck, seam=None, ahead=-1, lift=0):
    """Lay a pre-facelift lamp into the facelift lamp's place.

    Across the car the lamp is stretched from its inboard end to its outer
    edge onto the guide's (the facelift lens), optionally piecewise so a
    given x of ours lands on a given x of the base (the boot-lid seam); up
    and down it is sheared so its top edge follows the guide's (the hood or
    boot-lid edge, plus tuck), keeping its own height and its traced lower
    edge; along the car every vertex keeps its depth from its own design
    surface, measured instead from a smooth fit of the guide's surface, so
    the lens sits where the facelift's did and follows its wrap.
    """
    loops = [outline_xz(lens) for lens in lenses]
    ours = [p for loop in loops for p in loop]
    gpts = outermost([v.co.copy() for v in guide.data.vertices], -1 if guide.data.vertices[0].co.y < 0 else 1)
    ox0, ox1 = min(abs(p.x) for p in ours), max(abs(p.x) for p in ours)
    gx0, gx1 = min(abs(p.x) for p in gpts), max(abs(p.x) for p in gpts)
    to, tg = loop_top(loops), top_edge([(p.x, p.z) for p in gpts], 30)
    knots = [(ox0, gx0), (ox1, gx1)] if seam is None else [(ox0, gx0), seam, (ox1, gx1)]
    surf = fit_surface(gpts)
    # The facelift's lens sat a little behind the bumper's edge under it; the
    # S6's comes forward by lift at its lower edge (none at its top), so the
    # bumper meets it flush instead of leaving a ledge.
    low = [(x, -z) for x, z in top_edge([(p.x, -p.z) for p in gpts], 30)]

    def fn(p):
        sign = 1 if p.x > 0 else -1
        x = interp(knots, abs(p.x))
        z = p.z + interp(tg, x) - interp(to, abs(p.x)) + tuck
        v = min(1, max(0, (z - interp(low, x)) / max(.02, interp(tg, x) - interp(low, x))))
        return Vector((sign * x, surf(x, z) + p.y - design(p.x, p.z) + ahead * lift * (1 - v), z))
    warp(root, fn)


def cut_opening(obj, loop, margin, ahead):
    """Cut an outline (shrunk by margin) through a shell along Y and remove what is inside.

    ahead is -1 for an opening in the nose, +1 for one in the tail: only the
    faces within the outline's own reach along Y, facing that way, are touched.
    """
    poly = offset(ccw([(p.x, p.z) for p in loop]), margin)
    ys = [p.y for p in loop]
    y0, y1 = min(ys) - .06, max(ys) + .06
    xs, zs = [p[0] for p in poly], [p[1] for p in poly]
    box_ = (min(xs) - .03, max(xs) + .03, min(zs) - .03, max(zs) + .03)
    bm = bmesh.new()
    bm.from_mesh(obj.data)

    def region():
        out = []
        for f in bm.faces:
            c = f.calc_center_median()
            if y0 < c.y < y1 and box_[0] < c.x < box_[1] and box_[2] < c.z < box_[3] and f.normal.y * ahead > -.2:
                out.append(f)
        return out
    for a, b in zip(poly, poly[1:] + poly[:1]):
        faces = [f for f in region() if any(min(a[0], b[0]) - .05 < v.co.x < max(a[0], b[0]) + .05 and
                                            min(a[1], b[1]) - .05 < v.co.z < max(a[1], b[1]) + .05 for v in f.verts)]
        if not faces:
            continue
        geom = list({e for f in faces for e in f.edges}) + faces + list({v for f in faces for v in f.verts})
        normal = Vector((-(b[1] - a[1]), 0, b[0] - a[0])).normalized()
        bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-6, plane_co=(a[0], 0, a[1]), plane_no=normal)
    bm.normal_update()
    bmesh.ops.delete(bm, geom=[f for f in region() if inside(f.calc_center_median().x, f.calc_center_median().z, poly)], context='FACES')
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def hull(points):
    """Convex hull of (x, z) points, counter-clockwise."""
    pts = sorted(set(points))
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def lamp_housing(name, guide, lenses, ahead, grow, parent):
    """A dark housing behind the lamp: a back plate over the lamp and the
    facelift's opening together, grow round them and 6 cm behind the lens
    face, so a gap round the S6 lamp reads as a shut line, never as the
    car's inside."""
    surf = fit_surface(outermost([v.co.copy() for v in guide.data.vertices], ahead))
    pts = [(p.x, p.z) for lens in lenses for p in outline_xz(lens)] + [(v.co.x, v.co.z) for v in guide.data.vertices]
    outline = offset(ccw(hull([(round(x, 4), round(z, 4)) for x, z in pts])), -grow)
    # Never further out than the lamp itself: the lamps wrap round the corners.
    edge = max(abs(x) for x, z in pts) - .015
    top = max(z for x, z in pts) + .015
    outline = [(math.copysign(min(abs(x), edge), x), min(z, top)) for x, z in outline]
    return surface(name, outline, lambda x, z: surf(x, z) - ahead * .06, matte_black, parent, (0, ahead, 0), 2)


def tuck_behind(shell, lenses, ahead):
    """Where the S6 lamp reaches over the facelift's opening, the body's
    surface under it is pushed in 8 mm behind the lens instead of being cut
    away, so the bumper or quarter dives under the lamp's edge without a
    torn edge."""
    tree = surface_tree(lenses)
    polys = [offset(ccw([(p.x, p.z) for p in outline_xz(lens)]), .002) for lens in lenses]
    for v in shell.data.vertices:
        p = v.co
        if p.y * ahead < 1.5 or not any(inside(p.x, p.z, poly) for poly in polys):
            continue
        y = ray_y(tree, p.x, p.z, ahead)
        if y is not None and (p.y - y) * ahead > -.008:
            p.y = y - ahead * .008
    shell.data.update()


def fit_lamps(parts, guides, shell, parent):
    """Fit the four lamps, cut the shell round them and close the openings behind."""
    by_base = {key.split('.')[0]: root for key, root in parts.items()}
    made = []
    # The base splits its tail lamps at the boot lid's shut line; the S6's split goes there too.
    for sign, tag in ((1, 'l'), (-1, 'r')):
        side = lambda ahead: piece(guides, lambda c: c.x * sign > 0 and c.y * ahead > 0)
        head, tail = by_base['headlight_' + tag], by_base['taillight_' + tag]
        for root, prefix, design, ahead, tuck, seam, grow, lift in (
                (head, 'headlamp_lens', head_surface, -1, .004, None, .03, .012),
                (tail, 'taillamp_lens', tail_surface, 1, 0, (TAIL_X[0] + (TAIL_X[1] - TAIL_X[0]) * TAIL_SEAM, None), .09, 0)):
            guide = side(ahead)
            if seam:
                bm = bmesh.new()
                bm.from_mesh(guide.data)
                # The lid's lens and the quarter's are its two largest pieces.
                big = sorted(sorted(islands(bm), key=len)[-2:], key=lambda comp: min(v.co.x * sign for f in comp for v in f.verts))
                big = [[v.co.x * sign for f in comp for v in f.verts] for comp in big]
                bm.free()
                seam = (seam[0], (max(big[0]) + min(big[1])) / 2)
            lenses = [o for o in part_meshes(root) if o.name.startswith(prefix)]
            fit_lamp(root, lenses, guide, design, tuck, seam, ahead, lift)
            tuck_behind(shell, lenses, ahead)
            made.append(lamp_housing(prefix.split('_')[0] + '_housing_back_' + tag, guide, lenses, ahead, grow, parent))
            bpy.data.meshes.remove(guide.data)
    return made


def paint_tree(shell):
    """The shell's BVH and, per face, whether it is painted."""
    me = shell.data
    flags = [me.materials[p.material_index] == paint for p in me.polygons]
    return BVHTree.FromPolygons([v.co for v in me.vertices], [p.vertices[:] for p in me.polygons]), flags


def opening(shell, seed, box, ahead, step=.006, deep=.06):
    """The base's opening round seed (x, z), seen along the car from outside.

    A grid cell is open unless a ray finds paint within deep of the paint
    round it; the open cells joined to the seed inside box (x0, x1, z0, z1)
    give the outline (sorted round their centre: the openings are
    star-shaped) and the painted cells round them a smooth surface y(x, z).
    """
    tree, flags = paint_tree(shell)
    x0, x1, z0, z1 = box
    nx, nz = int((x1 - x0) / step) + 1, int((z1 - z0) / step) + 1
    hits = {}
    for i in range(nx):
        for k in range(nz):
            x, z = x0 + i * step, z0 + k * step
            h, _, f, _ = tree.ray_cast(Vector((x, 4 * ahead, z)), Vector((0, -ahead, 0)), 6)
            hits[i, k] = h if h is not None and flags[f] else None
    # The outer surface round each cell: the paint nearest the outside within
    # a few cells; paint well behind it is the inside of the opening.
    front = {}
    for (i, k) in hits:
        near = [hits[i + a, k + b].y for a in range(-2, 3) for b in range(-4, 5) if hits.get((i + a, k + b)) is not None]
        front[i, k] = (min(near) if ahead < 0 else max(near)) if near else None
    is_open = lambda c: hits[c] is None or abs(hits[c].y - front[c]) > deep
    start = (round((seed[0] - x0) / step), round((seed[1] - z0) / step))
    seen, stack = {start}, [start]
    while stack:
        i, k = stack.pop()
        for c in ((i + 1, k), (i - 1, k), (i, k + 1), (i, k - 1)):
            if c in hits and c not in seen and is_open(c):
                seen.add(c)
                stack.append(c)
    border = [c for c in seen if any((c[0] + a, c[1] + b) not in seen for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    cx = sum(c[0] for c in seen) / len(seen)
    cz = sum(c[1] for c in seen) / len(seen)
    border.sort(key=lambda c: math.atan2(c[1] - cz, c[0] - cx))
    pts = [(x0 + i * step, z0 + k * step) for i, k in border]
    # Smooth the cell staircase and keep every third point.
    n = len(pts)
    pts = [(sum(pts[(j + d) % n][0] for d in range(-3, 4)) / 7, sum(pts[(j + d) % n][1] for d in range(-3, 4)) / 7) for j in range(0, n, 3)]
    ring = [hits[c] for c in hits if hits[c] is not None and c not in seen and
            min(abs(c[0] - b[0]) + abs(c[1] - b[1]) for b in border) <= 8]
    return ccw(pts), fit_surface(ring, 2, 1)


def map_box(src, dst):
    """An (x, z) map taking the box src (x0, x1, z0, z1) onto dst, |x| measured from the centreline when x0 is 0."""
    def fn(x, z):
        sign = 1 if x >= 0 else -1
        u = (abs(x) - src[0]) / (src[1] - src[0])
        v = (z - src[2]) / (src[3] - src[2])
        return sign * (dst[0] + u * (dst[1] - dst[0])), dst[2] + v * (dst[3] - dst[2])
    return fn


def fit_into(root, src, dst, design, surf, rigid=()):
    """Map a part's (x, z) box src onto dst and lay it on surf at its own depth
    from design. Pieces named in rigid keep their shape: only their centre is
    mapped, and they scale evenly with the box's width."""
    f = map_box(src, dst)
    # Rigid pieces scale by the smaller stretch, so they stay inside the part.
    k = min((dst[1] - dst[0]) / (src[1] - src[0]), (dst[3] - dst[2]) / (src[3] - src[2]))
    bpy.context.view_layer.update()
    for obj in part_meshes(root):
        world = obj.matrix_world.copy()
        inv = world.inverted()
        pts = [world @ v.co for v in obj.data.vertices]
        if obj.name.startswith(rigid):
            c = sum(pts, Vector()) / len(pts)
            cx, cz = f(c.x, c.z)
            new = []
            for p in pts:
                x, z = cx + (p.x - c.x) * k, cz + (p.z - c.z) * k
                new.append(Vector((x, surf(x, z) + p.y - design(p.x, p.z), z)))
        else:
            new = []
            for p in pts:
                x, z = f(p.x, p.z)
                new.append(Vector((x, surf(x, z) + p.y - design(p.x, p.z), z)))
        for v, p in zip(obj.data.vertices, new):
            v.co = inv @ p
        obj.data.update()


def bounds_xz(points, half=False):
    xs = [abs(p[0]) for p in points] if half else [p[0] for p in points]
    zs = [p[-1] for p in points]
    return (0 if half else min(xs), max(xs), min(zs), max(zs))


def fit_grille(parts, shell):
    """The RS grille into the base's grille opening: its frame's outer edge
    stretched over the opening (8 mm over its edge, so the frame covers it),
    laid on the bumper's surface round the opening; rings, camera and
    script keep their shape. Then the bumper is cut under the frame."""
    root = {key.split('.')[0]: r for key, r in parts.items()}['RS_honeycomb_grille']
    outline, surf = opening(shell, (0, .5), (-.46, .46, .2, .75), -1)
    frame = next(o for o in part_meshes(root) if o.name.startswith('grille_frame'))
    src = bounds_xz([(p.x, p.z) for p in outline_xz(frame)], True)
    dst = bounds_xz(outline, True)
    dst = (0, dst[1] + .008, dst[2] - .008, dst[3] + .008)
    design = lambda x, z: FRONT + .012 + .3 * x * x + (z - .55) * .26
    # How far each vertex of the script stands proud of the panel it is drawn on.
    script = next(o for o in part_meshes(root) if o.name.startswith('grille_quattro_script'))
    bpy.context.view_layer.update()
    proud = [design(p.x, p.z) + .014 - p.y for p in (script.matrix_world @ v.co for v in script.data.vertices)]
    fit_into(root, src, dst, design, surf, ('grille_ring', 'grille_camera', 'grille_quattro_script'))
    # The panel is one flat face, so the script is laid on it, not on the curved surface.
    panel = surface_tree([o for o in part_meshes(root) if o.name.startswith('grille_quattro_panel')])
    world = script.matrix_world
    inv = world.inverted()
    for v, d in zip(script.data.vertices, proud):
        p = world @ v.co
        y = ray_y(panel, p.x, p.z, -1)
        if y is not None:
            v.co = inv @ Vector((p.x, y - d, p.z))
    script.data.update()
    cut_opening(shell, outline_xz(frame), .012, -1)
    return root



def fit_intakes(parts, shell, parent):
    """The S6's intakes in the base's lower openings: the opening is the pocket
    (Ali's car shows black honeycomb right to its painted edge), lined with a
    recessed black backing and honeycomb; the part's sensor and blade are
    mapped into it and laid on the bumper's surface. The part's own surround,
    backing and mesh, traced for a different opening, are dropped."""
    by_base = {key.split('.')[0]: root for key, root in parts.items()}
    made = []
    for sign, tag in ((1, 'l'), (-1, 'r')):
        root = by_base['lower_intake_' + tag]
        box_ = (.38, .95, .2, .47) if sign > 0 else (-.95, -.38, .2, .47)
        outline, surf = opening(shell, (sign * .6, .33), box_, -1)
        for obj in part_meshes(root):
            if obj.name.startswith(('intake_surround', 'intake_backing', 'intake_honeycomb')):
                bpy.data.objects.remove(obj, do_unlink=True)
        dst = bounds_xz(outline, True)
        dst = (min(abs(x) for x, z in outline), dst[1], dst[2], dst[3])
        fit_into(root, (INTAKE_X[0], INTAKE_X[1], INTAKE_Z[1], INTAKE_Z[0]), dst, intake_surface, surf, ('sensor_',))
        sensor = next(o for o in part_meshes(root) if o.name.startswith('sensor_face'))
        bpy.context.view_layer.update()
        c = sensor.matrix_world @ (sum((v.co for v in sensor.data.vertices), Vector()) / len(sensor.data.vertices))
        grown = offset(outline, -.006)
        made.append(surface('intake_pocket_' + tag, grown, lambda x, z: surf(x, z) + .036, matte_black, parent, (0, -1, 0), 1, 0, -.036))
        made.append(honeycomb('intake_pocket_mesh_' + tag, grown, lambda x, z: surf(x, z) + .02, .056, .021, .018, .0025, .012,
                              satin_black, parent, 0, keep=lambda x, z, c=c: math.hypot(x - c.x, z - c.z) > .056, margin=.008))
    # The base's long narrow opening along the lip under the grille (Ali's car
    # has it too): a recessed black floor behind it.
    outline, surf = opening(shell, (0, .25), (-.46, .46, .2, .3), -1, .004)
    made.append(surface('lower_centre_slot', offset(outline, -.006), lambda x, z: surf(x, z) + .022, matte_black, parent,
                        (0, -1, 0), 1, 0, -.022))
    return made


# The early S6's diffuser opening: a bright surround that rises in a rounded
# arch over each pair of tips and turns down at the ends (Audi's 2012 rear
# view), filled with the diffuser's own grey. Right half (x, z), centre first.
DIFFUSER_TOP = [(0, .385), (.40, .39), (.48, .405), (.56, .428), (.63, .437), (.70, .43), (.77, .408), (.81, .378),
                (.828, .33), (.815, .27), (.785, .222)]


def fit_diffuser(parts, shell, parent):
    """The pre-facelift S6's rear: the facelift's diffuser and outlets are gone,
    leaving the bumper open below z .43. A painted valance fills down to the
    S6's arch, the bumper is cut where the arch rises above its edge, and the
    diffuser, its blade and the quad tips are laid on the bumper's surface."""
    by_base = {key.split('.')[0]: root for key, root in parts.items()}
    tree, flags = paint_tree(shell)

    def row(z):
        out = []
        for i in range(33):
            x = .8 * i / 32
            h, _, f, _ = tree.ray_cast(Vector((x, 4, z)), Vector((0, -1, 0)), 6)
            if h is not None and flags[f]:
                out.append((x, h.y))
        return out
    # The bumper's face just above its lower edge, and how it leans; below the
    # edge the S6's diffuser tucks forward under the car.
    low, high = row(.46), row(.52)
    surf = lambda x, z: interp(low, abs(x)) + (z - .46) * ((interp(high, abs(x)) - interp(low, abs(x))) / .06 if z > .46 else .3)
    design = lambda x, z: REAR - .015 - .14 * (abs(x) / .8) ** 6
    for name in ('rear_diffuser', 'exhaust_tips'):
        warp(by_base[name], lambda p: Vector((p.x, surf(p.x, p.z) + p.y - design(p.x, p.z), p.z)))
    for obj in list(by_base['rear_diffuser'].children):
        if obj.name.startswith('diffuser_aluminium_border'):
            bpy.data.objects.remove(obj, do_unlink=True)
    half = DIFFUSER_TOP + [(.70, .16)]
    arch = ccw(half + [(-x, z) for x, z in reversed(half)][:-1])
    # The facelift's painted lower valance goes between the corners; the S6's
    # valance, diffuser and tips take its place.
    bm = bmesh.new()
    bm.from_mesh(shell.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if shell.data.materials[f.material_index] == paint and
                               f.calc_center_median().y > 1.85 and f.calc_center_median().z < .44 and abs(f.calc_center_median().x) < .79],
                     context='FACES')
    bm.to_mesh(shell.data)
    bm.free()
    # The valance: painted from the arch up behind the bumper's lower edge.
    arch_z = lambda x: interp(DIFFUSER_TOP[:8], abs(x))
    vs, n = [], 48
    for i in range(n + 1):
        x = -.80 + 1.6 * i / n
        for k in range(4):
            z = arch_z(x) + (.46 - arch_z(x)) * k / 3
            vs.append((x, surf(x, z) - .002, z))
    made = [facing(mesh('rear_valance', vs, [(i * 4 + k, i * 4 + k + 1, i * 4 + k + 5, i * 4 + k + 4) for i in range(n) for k in range(3)],
                        paint, parent, True), (0, 1, 0))]
    made.append(surface('diffuser_field', offset(arch, -.004), lambda x, z: surf(x, max(z, .2)) - .03,
                        bpy.data.materials['S6_diffuser_platinum_grey'], parent, (0, 1, 0), 1, 0, -.03))
    rim = [(x, z) for x, z in reversed(DIFFUSER_TOP)][:-1] + [(-x, z) for x, z in DIFFUSER_TOP]
    made.append(tube('diffuser_surround', [Vector((x, surf(x, z) + .002, z)) for x, z in smooth_path(rim, 3)], .005, aluminium, parent, sides=8))
    return made


V8T_Y = -1.0


def place_badges(parts, shell):
    """The S6's black rings and S6 badge where the facelift's rings and model
    badge were on the boot lid; the V8T badges on the wings behind the arches."""
    by_base = {key.split('.')[0]: root for key, root in parts.items()}
    tree = surface_tree([shell])
    rings = max((s for s in BADGE_SPOTS if abs(s[1].x) < .15), key=lambda s: s[0])[1]
    model = max((s for s in BADGE_SPOTS if s[1].x > .3), key=lambda s: s[0])[1]
    bpy.context.view_layer.update()
    for name, spot, proud in (('badge_rings_rear', rings, .004), ('badge_S6_rear', model, .0015)):
        root = by_base[name]
        pts = [o.matrix_world @ v.co for o in part_meshes(root) for v in o.data.vertices]
        c = Vector([(min(p[i] for p in pts) + max(p[i] for p in pts)) / 2 for i in range(3)])
        y = ray_y(tree, spot.x, spot.z, 1)
        root.location += Vector((spot.x - c.x, y + proud - max(p.y for p in pts), spot.z - c.z))
    for sign, tag in ((1, 'l'), (-1, 'r')):
        root = by_base['badge_V8T_fender_' + tag]
        pts = [o.matrix_world @ v.co for o in part_meshes(root) for v in o.data.vertices]
        c = sum(pts, Vector()) / len(pts)
        # On the wing, midway between the wheel arch (to y -1.09) and the door's shut line (-0.90).
        root.location.y += V8T_Y - c.y
        pts = [p + Vector((0, V8T_Y - c.y, 0)) for p in pts]
        hit = tree.ray_cast(Vector((sign * 2, V8T_Y, c.z)), Vector((-sign, 0, 0)), 3)[0]
        root.location.x += hit.x + sign * .0015 - (max(p.x for p in pts) if sign > 0 else min(p.x for p in pts))


def rig_mirrors(base, parts, parent):
    """The base's mirrors on the S6's mirror nodes, their painted shells as the
    aluminium-look caps (check:s6 reads mirror_cap_*). The parts' own mirrors go."""
    by_base = {key.split('.')[0]: root for key, root in parts.items()}
    for side in ('left', 'right'):
        old = by_base['mirror_' + side]
        for obj in [old] + list(old.children_recursive):
            bpy.data.objects.remove(obj, do_unlink=True)
        obj = base.pop('mirror_' + side[0])
        c = sum((v.co for v in obj.data.vertices), Vector()) / len(obj.data.vertices)
        root = empty('mirror_' + side, tuple(c), parent)
        obj.data.transform(Matrix.Translation(-c))
        cap = piece(obj, lambda p, o=obj: False)
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        caps = [f for f in bm.faces if obj.data.materials[f.material_index] == aluminium]
        cb = bmesh.new()
        vmap = {}
        for f in caps:
            nf = cb.faces.new([vmap.setdefault(v, cb.verts.new(v.co)) for v in f.verts])
            nf.smooth = f.smooth
        cb.to_mesh(cap.data)
        cb.free()
        bmesh.ops.delete(bm, geom=caps, context='FACES')
        bm.to_mesh(obj.data)
        bm.free()
        cap.data.materials.clear()
        cap.data.materials.append(aluminium)
        cap_root = empty('mirror_cap_' + side, (0, 0, 0), root)
        cap.name = cap.data.name = 'mirror_cap_shell_' + side
        cap.parent = cap_root
        obj.name = obj.data.name = 'mirror_housing_' + side
        obj.parent = root


def measure_hood(hood):
    """The hood's outline for the engine bay (s6_engine_bay.py): its shut line's
    half-width and height at stations along the car, its rearmost point (at the
    corners: its rear edge bows forward to the middle) and the height there."""
    vs = [v.co for v in hood.data.vertices]
    y0, y1 = min(v.y for v in vs), max(v.y for v in vs)
    edge, edge_z = [], []
    for k in range(25):
        y = y0 + .01 + (y1 - y0 - .02) * k / 24
        near = [v for v in vs if abs(v.y - y) < .012] or [min(vs, key=lambda v: abs(v.y - y))]
        w = max(near, key=lambda v: abs(v.x))
        edge.append((y, abs(w.x)))
        edge_z.append((y, min(v.z for v in near if abs(v.x) > abs(w.x) - .03)))
    return edge, edge_z, y1, max(v.z for v in vs if v.y > y1 - .02)



def split_material(obj, mat, name, parent):
    """Move the faces of obj that use mat into their own object."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    index = list(obj.data.materials).index(mat)
    keep = bmesh.new()
    vmap = {}
    for f in [f for f in bm.faces if f.material_index == index]:
        nf = keep.faces.new([vmap.setdefault(v, keep.verts.new(v.co)) for v in f.verts])
        nf.smooth = f.smooth
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index == index], context='FACES')
    bm.to_mesh(obj.data)
    bm.free()
    data = bpy.data.meshes.new(name)
    keep.to_mesh(data)
    keep.free()
    data.materials.append(mat)
    out = bpy.data.objects.new(name, data)
    scene.collection.objects.link(out)
    out.parent = parent
    return out


# The base's black seals, liners and underbody carry more detail than shows
# at the garage cameras; keep two fifths of it.
TRIM_RATIO = .4
# The base's interior is far denser than the garage cameras resolve through
# tinted glass: keep about an eighth of it.
CABIN_RATIO = .09


def decimate(obj, ratio):
    """Collapse the mesh to about ratio of its faces, keeping its materials."""
    mod = obj.modifiers.new('Reduce for the web', 'DECIMATE')
    mod.ratio = ratio
    mod.use_collapse_triangulate = True
    data = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    obj.modifiers.remove(mod)
    old, obj.data = obj.data, data
    data.name = old.name
    bpy.data.meshes.remove(old)
    return obj


def head_unit_spot(interior):
    """Where the MMI screen rises: on the dash top's centreline, 70 cm ahead of the B-pillars' line."""
    tree = surface_tree([interior])
    hit = tree.ray_cast(Vector((0, -.70, 1.3)), Vector((0, 0, -1)), 1)[0]
    return Vector((0, -.70, hit.z + .072))


def centre(root):
    """The middle of a part's bounds, in the car's frame."""
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ v.co for o in part_meshes(root) for v in o.data.vertices]
    return Vector([(min(p[i] for p in pts) + max(p[i] for p in pts)) / 2 for i in range(3)])


def absorb_hood(shell, hood):
    """The hood is several pieces in the base (its rear strip and a strip by the
    centre are separate from the main panel): every painted piece of the shell
    lying on the main panel's surface, within 15 mm of it, joins the hood."""
    tree = surface_tree([hood])
    bm = bmesh.new()
    bm.from_mesh(shell.data)
    moved = []
    for comp in islands(bm):
        if shell.data.materials[comp[0].material_index] != paint:
            continue
        vs = {v for f in comp for v in f.verts}
        if all(abs(v.co.x) < .86 and -2.32 < v.co.y < -.85 and v.co.z > .68 for v in vs):
            near = [tree.ray_cast(Vector((v.co.x, v.co.y, 2)), Vector((0, 0, -1)), 3)[0] for v in vs]
            if all(h is not None and abs(h.z - v.co.z) < .015 for h, v in zip(near, vs)):
                moved += comp
    hb = bmesh.new()
    hb.from_mesh(hood.data)
    vmap = {}
    for f in moved:
        nf = hb.faces.new([vmap.setdefault(v, hb.verts.new(v.co)) for v in f.verts])
        nf.smooth = f.smooth
    hb.to_mesh(hood.data)
    hb.free()
    bmesh.ops.delete(bm, geom=moved, context='FACES')
    bm.to_mesh(shell.data)
    bm.free()
    return len(moved)


def build_plenum(hood, glass, parent):
    """The plenum cover: black plastic from under the hood's rear edge back to
    the windscreen's foot. The base leaves that gap open (its hood's rear edge
    bows forward to the middle), so without it the bay showed through."""
    hood_tree, glass_tree = surface_tree([hood]), surface_tree([glass])

    def first(tree, x, ys):
        for y in ys:
            hit = tree.ray_cast(Vector((x, y, 2)), Vector((0, 0, -1)), 2)[0]
            if hit is not None:
                return hit
    vs = []
    for k in range(29):
        x = -.74 + 1.48 * k / 28
        h = first(hood_tree, x, [-.85 - i * .004 for i in range(120)])
        g = first(glass_tree, x, [-1.25 + i * .004 for i in range(120)]) or h
        vs += [(x, h.y - .03, h.z - .014), (x, max(g.y, h.y) + .025, g.z - .006)]
    return mesh('plenum_cover', vs, [(2 * k, 2 * k + 2, 2 * k + 3, 2 * k + 1) for k in range(28)], satin_black, parent, True)


def build_closures(parent, glass):
    """Black panels where the base leaves the car's inside open to view:
    across the bay's lower rear, ahead of the footwells (the floor carpet turns
    up the firewall there and showed from low in front through the bay's open
    underside); just inboard of the rear wheel wells' inner walls; behind the
    intakes' corners; across the boot behind the parcel shelf; and a seal
    along the windscreen's top edge, where the glass stops short of the roof."""
    made = [mesh('footwell_closure', [(-.72, -1.118, .17), (.72, -1.118, .17), (.72, -1.118, .56), (-.72, -1.118, .56)],
                 [(0, 1, 2, 3)], body_black, parent)]
    for sign in (1, -1):
        made.append(mesh('rear_well_closure', [(sign * .64, 1.04, .17), (sign * .64, 1.88, .17), (sign * .64, 1.88, .62), (sign * .64, 1.04, .62)],
                         [(0, 1, 2, 3)], body_black, parent))
        # Behind the lower intakes, which wrap round the bumper's corners.
        made.append(mesh('intake_side_closure', [(sign * .70, -2.16, .22), (sign * .70, -1.95, .22), (sign * .70, -1.95, .47), (sign * .70, -2.16, .47)],
                         [(0, 1, 2, 3)], body_black, parent))
    # Across the boot behind the parcel shelf: the tail lamps' gaps open into the boot.
    made.append(mesh('boot_bulkhead', [(-.76, 1.905, .45), (.76, 1.905, .45), (.76, 1.905, 1.09), (-.76, 1.905, 1.09)],
                     [(0, 1, 2, 3)], body_black, parent))
    top = {}
    for v in glass.data.vertices:
        if v.co.y < -.15 and v.co.z > 1.25 and abs(v.co.x) < .7:
            k = round(v.co.x / .05)
            if k not in top or v.co.z > top[k].z:
                top[k] = v.co.copy()
    edge = [top[k] + Vector((0, .006, .001)) for k in sorted(top)]
    made.append(tube('windscreen_top_seal', edge, .009, body_black, parent, sides=6))
    return made


def keep_behind_windscreen(interior, glass):
    """Reducing the interior can pull the headliner's front edge through the
    windscreen's top: put any such vertex back 8 mm behind the glass."""
    tree = surface_tree([glass])
    world = interior.matrix_world
    inv = world.inverted()
    for v in interior.data.vertices:
        p = world @ v.co
        if p.z > 1.0 and p.y < 0:
            hit = tree.ray_cast(Vector((p.x, p.y - 1, p.z)), Vector((0, 1, 0)), 1.2)[0]
            if hit is not None and hit.y > p.y - .004:
                v.co = inv @ Vector((p.x, hit.y + .008, p.z))
