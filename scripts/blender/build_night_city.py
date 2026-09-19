"""The intro's street, built in Blender metres and rendered with Cycles.

Logical coordinates match the live car: X right, Y up, Z toward the lens.
Blender maps those to X, -Z, Y. The cameras use drift-scene.js's exact lens
and framing. Only the Night_City_Street scene is created or replaced.
Run this through Blender MCP; render_night_city.py produces the plates.
"""
import bpy
import math
import random
from mathutils import Vector
from pathlib import Path
from collections import defaultdict

ROOT = Path('/Users/aldo/Desktop/Portfolio')
OUT = ROOT / 'design/night-city'
OUT.mkdir(parents=True, exist_ok=True)
NAME = 'Night_City_Street'
old = bpy.data.scenes.get(NAME)
if old:
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.scenes.remove(old)
scene = bpy.data.scenes.new(NAME)
bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'
rnd = random.Random(73104)


def linear(v):
    return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4


def color(value):
    return tuple(linear(int(value[i:i + 2], 16) / 255) for i in (0, 2, 4))


def material(name, hex_color, metallic=0, rough=.5, emit=0):
    mat = bpy.data.materials.new('NC_' + name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    rgba = (*color(hex_color), 1)
    shader.inputs['Base Color'].default_value = rgba
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = rough
    if emit:
        shader.inputs['Emission Color'].default_value = rgba
        shader.inputs['Emission Strength'].default_value = emit
    mat.diffuse_color = rgba
    return mat


concrete = material('weathered_concrete', '40494b', .1, .65)
panel = material('graphite_cladding', '202b31', .65, .32)
trim = material('aluminium_edges', '535d60', .8, .28)
black = material('recesses', '0b1018', .1, .7)
glass = material('dark_glass', '1b3a45', .72, .15)
road = material('rain_wet_asphalt', '202a30', .28, .2)
sidewalk = material('poured_sidewalk', '424b51', .13, .58)
paint = material('weathered_road_paint', 'bcba86', .1, .4)
white_paint = material('crossing_paint', '919d9a', .1, .37)
red = material('sign_red', 'f1293d', .1, .25, 5)
cyan = material('electric_ice', '72dfec', .1, .24, 5)
magenta = material('pink_neon', 'ff428f', .1, .25, 7)
amber = material('sodium', 'ffb254', .1, .3, 5)
warm = material('occupied_warm', 'ffcd8f', .1, .35, 2)
cool = material('occupied_cool', '8dafbc', .1, .35, 1.5)
soft = material('occupied_dim', '5a7a85', .15, .3, .45)
white = material('backlit_white', 'cadce7', .1, .3, 3)

# Millimetre aggregate, larger patches of water, and uneven reflections.
nodes = road.node_tree.nodes
links = road.node_tree.links
shader = nodes.get('Principled BSDF')
geo = nodes.new('ShaderNodeNewGeometry')
noise = nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 115
noise.inputs['Detail'].default_value = 3
links.new(geo.outputs['Position'], noise.inputs['Vector'])
bump = nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = .28
bump.inputs['Distance'].default_value = .002
links.new(noise.outputs['Fac'], bump.inputs['Height'])
links.new(bump.outputs['Normal'], shader.inputs['Normal'])
puddles = nodes.new('ShaderNodeTexNoise')
puddles.inputs['Scale'].default_value = .45
puddles.inputs['Detail'].default_value = 4
puddles.inputs['Roughness'].default_value = .7
links.new(geo.outputs['Position'], puddles.inputs['Vector'])
ramp = nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position = .38
ramp.color_ramp.elements[0].color = (.085, .085, .085, 1)
ramp.color_ramp.elements[1].position = .62
ramp.color_ramp.elements[1].color = (.38, .38, .38, 1)
links.new(puddles.outputs['Fac'], ramp.inputs[0])
links.new(ramp.outputs['Color'], shader.inputs['Roughness'])

# A few draw batches instead of thousands of independent window objects.
batches = defaultdict(lambda: ([], []))

def xyz(p):
    return (p[0], -p[2], p[1])


def box(name, pos, size, mat):
    verts, faces = batches[mat]
    base = len(verts)
    x, y, z = pos
    a, b, c = (n / 2 for n in size)
    verts.extend(xyz((x + dx * a, y + dy * b, z + dz * c))
                 for dx, dy, dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
                                    (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)])
    faces.extend(tuple(base + i for i in f) for f in
                 [(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)])


font = bpy.data.fonts.load('/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf')
font_jp = bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Arial Unicode.ttf')


def text(body, pos, size, mat, rotation=0, vertical=False):
    data = bpy.data.curves.new('NC_sign_' + body, 'FONT')
    data.body = '\n'.join(body) if vertical else body
    data.font = font_jp if any(ord(c) > 127 for c in body) else font
    data.size = size
    data.align_x = 'CENTER'
    data.align_y = 'CENTER'
    data.space_character = 1.12
    data.space_line = .87
    data.extrude = .007
    data.bevel_depth = .003
    data.bevel_resolution = 1
    obj = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(obj)
    obj.location = xyz(pos)
    obj.rotation_euler = (math.pi / 2, 0, rotation)
    data.materials.append(mat)
    return obj


def cable(name, points, radius, mat):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 12
    data.bevel_depth = radius
    data.bevel_resolution = 2
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for p, co in zip(spline.bezier_points, points):
        p.co = xyz(co)
        p.handle_left_type = 'AUTO'
        p.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    data.materials.append(mat)
    return obj


def area(name, pos, target, hex_color, power, size, size_y=None):
    data = bpy.data.lights.new('NC_' + name, 'AREA')
    data.color = color(hex_color)
    data.energy = power
    data.shape = 'RECTANGLE'
    data.size = size
    data.size_y = size_y or size
    obj = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(obj)
    obj.location = xyz(pos)
    obj.rotation_euler = (Vector(xyz(target)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    return obj


def building(x, z, w, depth, height, seed, accent=None):
    r = random.Random(seed)
    front = z + depth / 2
    box('tower', (x, height / 2, z), (w, height, depth), panel if seed % 3 else concrete)
    box('cornice', (x, height - .3, z), (w + .6, .6, depth + .6), trim)
    # Setbacks make each roof a silhouette, rather than a box grid.
    box('setback', (x + w * .12, height + height * .11, z - depth * .12),
        (w * .65, height * .22, depth * .66), black)
    for level in range(5, int(height - 1), 3):
        box('floor', (x, level, front + .035), (w + .1, .10, .10), trim)
        box('side_floor', (x - math.copysign(w / 2 + .035, x), level, z),
            (.10, .10, depth + .1), trim)
        for col in range(max(1, int(w / 1.7))):
            xx = x - w / 2 + 1 + col * 1.7
            if xx > x + w / 2 - .45:
                continue
            choice = r.random()
            mat = warm if choice < .05 else cool if choice < .12 else soft if choice < .27 else glass
            box('window', (xx, level + 1.2, front + .06), (1.02, 1.85, .08), mat)
            if choice < .18:
                box('blind', (xx, level + 1.5, front + .115), (1.04, .09, .04), black)
        for col in range(max(1, int(depth / 1.8))):
            zz = front - 1 - col * 1.8
            if zz < z - depth / 2 + .5:
                continue
            choice = r.random()
            mat = warm if choice < .05 else cool if choice < .12 else soft if choice < .26 else glass
            xx = x - math.copysign(w / 2 + .06, x)
            box('side_window', (xx, level + 1.2, zz), (.08, 1.85, 1.1), mat)
    for xx in [x - w / 2 + .1, x + w / 2 - .1]:
        box('riser', (xx, height / 2, front + .14), (.24, height, .34), trim)
    for i in range(3):
        box('rooftop_plant', (x - w * .23 + i * w * .2, height * 1.23 + .4, z),
            (w * .12, .85, depth * .24), trim)
    if accent:
        box('lit_crown', (x, height - .9, front + .2), (w * .85, .14, .2), accent)
        box('corner_light', (x - math.copysign(w * .46, x), height * .57, front + .15),
            (.10, height * .7, .15), accent)


# Japantown's Cherry Blossom Market. Dimensions are estimated from the
# street photographs listed in design/night-city/REFERENCES.md.
# The open foreground reserves the original S4 drift, unchanged.
ochre = material('aged_yellow_panels', '786443', .35, .54)
oxide = material('red_service_panels', '4f232a', .28, .52)
bronze = material('statue_bronze', '506058', .85, .25)
mint = material('market_mint', '78ffd3', .12, .26, 4)
pink = material('sakura_hologram', 'ffb0ec', .1, .22, 4.5)
lantern_mat = material('paper_lantern', 'ff6941', .0, .55, 2)
petal_dim = material('sakura_wire', 'dd639f', .45, .36, .5)

# Weathering belongs to the materials, so it follows every actual surface.
for mat in [concrete, panel, ochre, oxide, sidewalk]:
    n = mat.node_tree.nodes
    l = mat.node_tree.links
    shader = n.get('Principled BSDF')
    base = shader.inputs['Base Color'].default_value[:]
    tex = n.new('ShaderNodeTexNoise')
    tex.inputs['Scale'].default_value = 7
    tex.inputs['Detail'].default_value = 5
    coord = n.new('ShaderNodeNewGeometry')
    l.new(coord.outputs['Position'], tex.inputs['Vector'])
    colors = n.new('ShaderNodeValToRGB')
    colors.color_ramp.elements[0].color = (*(c * .28 for c in base[:3]), 1)
    colors.color_ramp.elements[1].color = base
    l.new(tex.outputs['Fac'], colors.inputs[0])
    l.new(colors.outputs['Color'], shader.inputs['Base Color'])
    bump = n.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .3
    bump.inputs['Distance'].default_value = .035
    l.new(tex.outputs['Fac'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], shader.inputs['Normal'])


def sphere(name, pos, scale, mat, segments=16, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=xyz(pos))
    obj = bpy.context.object
    obj.name = 'NC_' + name
    obj.scale = (scale[0], scale[2], scale[1])
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def cylinder(name, pos, radius, height, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=height, location=xyz(pos))
    obj = bpy.context.object
    obj.name = 'NC_' + name
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new('Rounded rim', 'BEVEL')
    bevel.width = .025
    bevel.segments = 2
    return obj


def petal(pos, length, angle, mat):
    # Faceted, luminous hologram leaves, not a solid pink canopy.
    verts, faces = batches[mat]
    base = len(verts)
    x, y, z = pos
    dx, dy = math.cos(angle)*length, math.sin(angle)*length
    verts.extend(xyz(p) for p in [(x-dx*.5,y-dy*.5,z),
        (x-dy*.2,y+dx*.2,z+.04),(x+dx*.5,y+dy*.5,z),
        (x+dy*.2,y-dx*.2,z+.04),(x,y,z+.12)])
    faces.extend(tuple(base+i for i in f) for f in [(0,1,4),(1,2,4),(2,3,4),(3,0,4),(0,3,2,1)])


box('junction_asphalt', (0,-.08,-50), (210,.15,230), road)
# The street passes in front of the market. No fictitious centre line points
# through the entrance; the departure remains in the near-side traffic lane.
box('market_pavement', (0,.10,-49), (92,.26,34), sidewalk)
box('red_curb', (0,.17,-31.9), (92,.34,.24), oxide)
for x in range(-45,46,3):
    box('pavement_seam',(x,.237,-48),(.016,.007,32),black)
for z in range(-33,-65,-3):
    box('pavement_seam',(0,.237,z),(92,.007,.016),black)
for x in range(-46,48,6):
    box('road_divider',(x,.006,-24),(3.5,.012,.11),paint)
for x in [-16.2,-15.9]:
    box('parking_edge',(x,.005,-4),(.075,.01,37),white_paint)
for x in range(-10,13,2):
    box('crosswalk',(x,.006,-28),(.8,.012,3.3),white_paint)
for x in [-11,3.7,12.3]:
    cylinder('drain', (x,.008,-12 if x<0 else -3), .39, .018, trim)
    for i in range(7):
        box('drain_slots',(x-.27+i*.09,.022,-12 if x<0 else -3),(.035,.014,.51),black)

# Concrete portal, recessed infill, and a visible mezzanine inside it.
front = -37
for x in [-19,-7,6,19]:
    box('portal_pier',(x,4.0,front),(1.05,7.55,1.35),concrete)
    box('pier_foot',(x,.55,front),(1.42,.65,1.7),concrete)
    box('pier_cap',(x,7.58,front),(1.4,.7,1.6),concrete)
box('portal_lintel',(0,7.38,front),(40,.96,1.6),concrete)
box('lintel_top',(0,7.93,front),(40.7,.20,1.85),panel)
box('left_infill',(-13,1.62,front-.16),(10.9,2.8,.46),concrete)
for x in [-16,-12.5,-9]:
    box('service_panel',(x,1.65,front+.1),(3.14,2.2,.10),oxide)
    box('panel_top',(x,2.80,front+.19),(3.24,.14,.17),trim)
    for xx in [-1.2,1.2]:
        box('panel_seam',(x+xx,1.7,front+.17),(.07,2.16,.1),trim)
    box('utility_box',(x,1.15,front+.30),(.53,.90,.24),panel)
    for y in [.9,1.0,1.1,1.2,1.3]:
        box('utility_slot',(x,y,front+.44),(.35,.045,.04),black)
# English above the mint strip; Japanese and flower outline below.
text('Cherry Blossom Market',(-.1,8.53,front+.9),1.11,red)
box('sign_mint_rule',(-.1,7.99,front+.91),(12.8,.055,.045),mint)
text('桜花マーケット',(.45,7.34,front+.9),.87,mint)
for k in range(5):
    a = k*math.tau/5
    pts=[]
    for j in range(25):
        t=j*math.tau/24
        r=.4+.38*math.sin(t/2)
        pts.append((-5.2+math.sin(a)*r+math.cos(a)*.20*math.sin(t),
                    7.33+math.cos(a)*r-math.sin(a)*.20*math.sin(t),front+.93))
    cable('flower_neon',pts,.018,pink)
box('portal_downlight',(0,6.86,front+.06),(12.6,.065,.45),mint)
area('mint_portal',(0,6.65,front+1),(0,0,-26),'67ffd6',1400,11,1.0)

# Covered market and the railings seen through its entrance.
for z in [-43,-49,-56,-63]:
    for x in [-18,-6,6,18]:
        box('interior_columns',(x,5.2,z),(.34,10.0,.34),trim)
    cable('roof_truss',[(-19,8.0,z),(0,12.0,z),(19,8.0,z)],.095,trim)
    cable('truss_bottom',[(-19,8.0,z),(19,8.0,z)],.07,trim)
    for x in range(-16,18,4):
        top=12-abs(x)/19*4
        cable('roof_web',[(x,8,z),(x+2,top-.4,z),(x+4,8,z)],.045,trim)
for x in range(-18,20,3):
    y=12-abs(x)/19*4
    cable('roof_stringer',[(x,y,-38),(x,y,-65)],.055,trim)
    for z in [-42,-48,-54,-60]:
        # Window panels sit on the two slopes of the glass roof.
        verts,faces=batches[glass];b=len(verts)
        verts.extend(xyz((xx,12-abs(xx)/19*4,zz)) for xx,zz in [(x,z),(x+2.9,z),(x+2.9,z-5.8),(x,z-5.8)])
        faces.append((b,b+1,b+2,b+3))
for x in [-13,13]:
    box('mezzanine',(x,4.28,-51),(8,.30,25),concrete)
    for z in range(-40,-64,-2):
        box('balcony_post',(x-math.copysign(3.85,x),4.98,z),(.05,1.2,.05),trim)
    for h in [4.65,5.0,5.52]:
        box('balcony_rail',(x-math.copysign(3.85,x),h,-51),(.06,.055,24),trim)
for x in range(-18,20,2):
    box('front_balcony_post',(x,4.96,-42),(.06,1.2,.06),trim)
for h in [4.55,5.0,5.52]:
    box('front_balcony_rail',(0,h,-42),(38,.06,.06),trim)
box('rear_market_wall',(0,5,-66),(40,10,.45),oxide)

# Suspended lantern strings curve with real catenary-like sag.
for zi,z in enumerate([-39.3,-44.5,-50,-56]):
    cable('lantern_wire',[(-18,6.6,z),(0,5.5,z),(18,6.6,z)],.017,black)
    for i,x in enumerate(range(-17,19,2)):
        y=5.5+1.1*(x/18)**2
        size=.18 if zi>1 else .24
        cable('lantern_drop',[(x,y,z),(x,y-.3,z)],.012,black)
        sphere('lantern',(x,y-.50,z),(size,.29,size),lantern_mat)
        for k in range(8):
            a=k*math.tau/8
            pts=[(x+math.cos(a)*size*math.sin(t*math.pi/12),
                  y-.5+.29*math.cos(t*math.pi/12),
                  z+math.sin(a)*size*math.sin(t*math.pi/12)) for t in range(13)]
            cable('lantern_rib',pts,.008,oxide)
        if i%5==0:
            area('lantern_cast',(x,y-.7,z),(x,0,z),'ff693e',38,1)

# Food counters, hanging boards, vending cabinets, tiny practical lights.
for x in [-14,-9,9,14]:
    for z in [-46,-54,-62]:
        box('stall_back',(x,1.8,z),(3.7,3.2,1),panel)
        box('counter',(x,.82,z+1),(3.8,1.2,.86),oxide)
        box('counter_top',(x,1.5,z+1.1),(4,.12,1),trim)
        box('stall_soffit',(x,3.35,z+1.1),(4.1,.25,1.4),ochre)
        box('menu_light',(x,2.8,z+.6),(3.4,.62,.08),warm)
        text('FOOD  •  24H',(x,2.8,z+.66),.32,black)
        for i in range(4):
            cylinder('counter_can',(x-1.1+i*.7,1.7,z+1.1),.09,.27,trim)
        area('stall_cast',(x,3.1,z+1),(x,0,z+2),'ffa253',85,3,1)
for x in [7.3,8.4,9.5]:
    box('vending_body',(x,1.6,-39),(1,2.6,.8),panel)
    box('vending_screen',(x,2,-38.57),(.8,1.3,.03),cyan if x>8 else magenta)
    box('vending_slot',(x, .65,-38.54),(.6,.3,.045),black)
    for yy in [1.5,1.8,2.1,2.4]:
        for xx in [-.25,0,.25]:
            box('vending_goods',(x+xx,yy,-38.52),(.12,.22,.03),warm)
for x in [-4,-1,2,5]:
    cylinder('bollard',(x,.72,-34),.085,1.1,trim)
    cylinder('bollard_band',(x,1.13,-34),.089,.08,mint)

# Holographic trees on the actual metal projectors.
def sakura(x,z,h,seed):
    r=random.Random(seed)
    cylinder('tree_projector',(x,.42,z),1.0,.55,panel)
    cylinder('projector_rim',(x,.70,z),1.02,.06,mint)
    trunk=[(x,.7,z),(x-.15,h*.22,z),(x+.45,h*.43,z-.15),(x-.2,h*.65,z)]
    cable('tree_trunk',trunk,.16,trim)
    for k in range(11):
        a=k*2.399
        basey=h*(.24+.042*k)
        length=h*r.uniform(.30,.50)
        dx=math.cos(a)*length
        dz=math.sin(a)*length*.56
        end=(x+dx,basey+h*.28,z+dz)
        mid=(x+dx*.45,basey+h*.09,z+dz*.35)
        cable('sakura_branch',[(x,basey,z),mid,end],.04 if k<5 else .028,trim)
        for j in range(5):
            t=.35+j*.14
            bx=x+dx*t;by=basey+h*.28*t;bz=z+dz*t
            tx=bx+r.uniform(-1.2,1.2);ty=by+r.uniform(.6,1.7);tz=bz+r.uniform(-.8,.8)
            cable('sakura_twig',[(bx,by,bz),(tx-.1,ty-.35,tz),(tx,ty,tz)],.014,petal_dim)
            for n in range(5):
                px=tx+r.uniform(-.3,.3);py=ty+r.uniform(-.3,.3);pz=tz+r.uniform(-.24,.24)
                petal((px,py,pz),r.uniform(.18,.38),r.random()*math.tau,pink)
    area('sakura_cast',(x,h*.62,z),(x-3,0,z+8),'ff5da8',1800,h*.8,h*.6)
sakura(12.5,-34.5,12.3,49)
sakura(-18.2,-45,11.1,52)

# Layered building shoulders and giant irregular blocks, following Japantown
# references rather than a repeated generic neon window grid.
for x,z,w,dep,h,seed,accent in [
    (-31,-52,22,26,43,143,None),(31,-51,24,23,48,167,None),
    (-25,-91,20,26,84,191,None),(29,-93,23,25,77,206,None),
    (-4,-119,28,34,116,278,None),(-47,-124,22,34,148,239,None),
    (53,-147,37,30,146,256,None),(-15,-197,28,29,178,361,None),
    (33,-181,24,26,171,371,None)]:
    building(x,z,w,dep,h,seed,accent)
for x,z in [(24,-38),(-27,-44)]:
    for level,w,depth,offset in [(11,14,10,0),(17,17,13,-1),(24,14,12,2),(32,19,17,-2)]:
        box('cantilever_mass',(x+offset,level,z),(w,4.2,depth),ochre if x>0 else concrete)
        box('cantilever_lip',(x+offset,level-2.05,z),(w+.6,.3,depth+.5),panel)
        box('ribbon_glazing',(x+offset,level+.3,z+depth/2+.05),(w-.8,1.1,.08),glass)
        for xx in range(-5,7,2):
            box('ribbon_mullion',(x+offset+xx,level+.3,z+depth/2+.1),(.13,1.2,.13),trim)
box('kendachi_case',(20,6.9,-31.8),(10.8,1.8,.6),panel)
text('KENDACHI',(20,6.95,-31.44),1.12,white)
box('kendachi_redline',(20,6.08,-31.4),(10.5,.055,.05),red)
area('kendachi_cast',(20,6.5,-31),(15,0,-25),'fff0d9',400,7,1)
# Left-hand pagoda eaves and the dark plinth behind the portal.
for y,w in [(9.5,18),(11,14),(12.5,10)]:
    box('pagoda_core',(-14,y-.5,-60),(w-.6,.8,8),oxide)
    cable('pagoda_eave',[(-14-w/2,y+.65,-55),(-14-w*.3,y,-55),(-14,y-.16,-55),(-14+w*.3,y,-55),(-14+w/2,y+.65,-55)],.22,panel)
    for xx in range(int(-w/2),int(w/2)+1):
        cable('roof_rib',[(-14+xx,y-.12,-55),(-14+xx*.8,y+.5,-59)],.05,trim)

# The market's four-armed bronze statue, kept behind the entrance.
# Cloth is a continuous surface with folds, not stacked primitive boxes.
sx,sz=-12,-66
verts=[];faces=[];rings=23;segments=56
for j in range(rings):
    t=j/(rings-1);y=12.5+t*10.0
    radius=2.65-1.2*t+.16*math.sin(t*math.pi)
    for i in range(segments):
        a=i*math.tau/segments
        r=radius+.10*math.cos(a*11+t*2)
        verts.append(xyz((sx+r*math.cos(a),y,sz+r*.59*math.sin(a))))
for j in range(rings-1):
    for i in range(segments):
        n=j*segments+i;m=j*segments+(i+1)%segments
        faces.append((n,m,m+segments,n+segments))
mesh=bpy.data.meshes.new('NC_statue_robes');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('NC_statue_robes',mesh);scene.collection.objects.link(obj);mesh.materials.append(bronze)
for p in mesh.polygons:p.use_smooth=True
sphere('statue_shoulders',(sx,22.2,sz),(2.15,1.3,1.2),bronze,24,16)
sphere('statue_head',(sx,24.3,sz),(1.03,1.35,.92),bronze,24,16)
for y in [23.75,24.1,24.45,24.8]:
    cable('head_bands',[(sx+math.cos(i*math.tau/48)*1.04,y,sz+math.sin(i*math.tau/48)*.92) for i in range(49)],.075,trim)
for side in [-1,1]:
    cable('statue_outer_arm',[(sx+side*1.7,22.5,sz),(sx+side*4.2,21.6,sz+.6),(sx+side*6.8,23.1,sz+.8)],.36,bronze)
    sphere('statue_hand',(sx+side*6.8,23.1,sz+.8),(.55,.18,.42),bronze)
    for i in range(4):
        cable('statue_finger',[(sx+side*6.5+(i-1.5)*.20,23.1,sz+1.0),(sx+side*6.9+(i-1.5)*.20,23.65,sz+1.05)],.095,bronze)
    sphere('statue_orb',(sx+side*6.8,24.6,sz+.8),(.97,.97,.97),petal_dim,24,16)
    cable('statue_inner_arm',[(sx+side*1.7,21.2,sz+.1),(sx+side*2.3,19.8,sz+1.2),(sx+side*.1,20.7,sz+1.6)],.30,bronze)
area('statue_uplight',(-12,10,-58),(-12,22,-65),'50e6cf',3200,10,5)

# Service ducts, cables and advertising attached to architecture.
for x in [-20.2,20.2]:
    for off in [0,.3,.65]:
        cable('riser_duct',[(x+off,.4,-38),(x+off,11,-38),(x+off,12,-42)],.085,trim)
for off in [0,.23,.57]:
    cable('street_service_wire',[(-24,15+off,-25),(-2,12+off,-32),(25,16+off,-37)],.026,black)
for x,z,y,body,mat in [(-21,-57,18,'ホテル',red),(19,-69,20,'カラオケ',mint),(-6,-104,35,'KIROSHI',white)]:
    box('blade_sign',(x,y,z),(2,7.5,.45),black)
    text(body,(x,y,z+.25),.91,mat,vertical=True)
for x,z,y in [(-23,-82,29),(22,-101,35)]:
    box('ad_case',(x,y,z),(6.8,10.6,.5),black)
    box('ad_face',(x,y,z+.27),(6.1,9.9,.05),warm)
    text('NICOLA',(x,y+3.3,z+.34),1.1,oxide)
    text('ニコーラ',(x,y-3.4,z+.34),.66,oxide)
    cylinder('roof_ac',(x,y+6,z),.9,1.0,panel)

# Finish the batched meshes.
for mat,(verts,faces) in batches.items():
    mesh=bpy.data.meshes.new(mat.name+'_geometry')
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(mat.name,mesh)
    scene.collection.objects.link(obj)
    mesh.materials.append(mat)
    if mat in [concrete,panel,trim,sidewalk,ochre,oxide]:
        mod=obj.modifiers.new('Edge catchlights','BEVEL')
        mod.width=.028
        mod.segments=2

world=bpy.data.worlds.new('NC_night_air')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(*color('263c4c'),1)
world.node_tree.nodes['Background'].inputs[1].default_value=.32
scene.world=world
area('blue_city_fill',(0,48,-38),(0,0,-31),'759eac',11000,45,45)
area('junction_softbox',(-4,14,8),(0,0,0),'719aaf',550,13,8)
area('near_pink_bounce',(17,6,-5),(1,0,3),'f64d93',420,7,5)
area('near_mint_bounce',(-14,7,-7),(-2,0,3),'63c9bb',390,7,5)

fog=bpy.data.materials.new('NC_humid_air');fog.use_nodes=True
nodes=fog.node_tree.nodes;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial')
volume=nodes.new('ShaderNodeVolumePrincipled')
volume.inputs['Density'].default_value=.002
volume.inputs['Color'].default_value=(.30,.40,.48,1)
volume.inputs['Anisotropy'].default_value=.3
fog.node_tree.links.new(volume.outputs['Volume'],out.inputs['Volume'])
bpy.ops.mesh.primitive_cube_add(size=1,location=xyz((0,70,-120)))
obj=bpy.context.object;obj.name='NC_atmosphere';obj.scale=(240,320,140);obj.data.materials.append(fog)

# Match drift-scene.js's vertical lens and camera, for both screen shapes.
for label,w,h in [('wide',2400,1500),('portrait',1080,2340)]:
    aspect=w/h
    frac=1.05 if aspect<1 else .82 if aspect<1.3 else .66
    dist=4.6/(2*frac*math.tan(math.radians(15))*aspect)
    data=bpy.data.cameras.new('NC_camera_'+label)
    camera=bpy.data.objects.new('NC_camera_'+label,data);scene.collection.objects.link(camera)
    camera.location=xyz((.6,.8+.12*dist,5.6+dist))
    camera.rotation_euler=(Vector(xyz((-.4,.7,1.8)))-camera.location).to_track_quat('-Z','Y').to_euler()
    data.sensor_fit='VERTICAL';data.sensor_height=24;data.lens=24/(2*math.tan(math.radians(15)));data.clip_end=600
    camera['width']=w;camera['height']=h
scene.camera=bpy.data.objects['NC_camera_wide']
scene.render.engine='CYCLES';scene.cycles.device='GPU';scene.cycles.samples=64
scene.cycles.use_denoising=True;scene.cycles.max_bounces=8;scene.cycles.diffuse_bounces=3
scene.cycles.glossy_bounces=4;scene.cycles.volume_bounces=1;scene.cycles.sample_clamp_indirect=4
scene.render.resolution_x=2400;scene.render.resolution_y=1500;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.1
scene.render.film_transparent=False
for f in [font,font_jp]:f.pack()
bpy.data.libraries.write(str(OUT/'night-city.blend'),{scene},path_remap='RELATIVE_ALL',fake_user=True,compress=True)
print('Cherry Blossom Market built:',len(scene.objects),'objects;',sum(len(o.data.polygons) for o in scene.objects if o.type=='MESH'),'polygons.')
