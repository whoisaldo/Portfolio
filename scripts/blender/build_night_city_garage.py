"""Build the orbitable Night City garage through Blender MCP.

Metres, car facing +Z in the browser. xyz maps that space to Blender.
Only this script's own scene is replaced. The S4 is never edited.
"""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector
from collections import defaultdict

ROOT = Path('/Users/aldo/Desktop/Portfolio')
OUT = ROOT / 'design/night-city-garage'
TEX = OUT / 'textures'
NAME = 'Night_City_Garage'
old = bpy.data.scenes.get(NAME)
if old:
    for o in list(old.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.scenes.remove(old)
scene = bpy.data.scenes.new(NAME)
bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'
rnd = random.Random(2076)

def xyz(p):
    return (p[0], -p[2], p[1])

def rgb(h):
    def linear(v):
        return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
    return tuple(linear(int(h[i:i+2], 16) / 255) for i in (0, 2, 4))

def mat(name, color, metal=0, rough=.5, emission=0):
    m = bpy.data.materials.new('Garage_' + name)
    m.use_nodes = True
    m.diffuse_color = (*rgb(color), 1)
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = m.diffuse_color
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    if emission:
        p.inputs['Emission Color'].default_value = m.diffuse_color
        p.inputs['Emission Strength'].default_value = emission
    return m

def image_mat(name, path, emission=0):
    m = mat(name, 'ffffff', rough=.85)
    n = m.node_tree.nodes.new('ShaderNodeTexImage')
    n.image = bpy.data.images.load(str(path), check_existing=True)
    p = m.node_tree.nodes.get('Principled BSDF')
    m.node_tree.links.new(n.outputs['Color'], p.inputs['Base Color'])
    if emission:
        m.node_tree.links.new(n.outputs['Color'], p.inputs['Emission Color'])
        p.inputs['Emission Strength'].default_value = emission
    return m

concrete = mat('aged_concrete', '777779', .05, .76)
floor = mat('damp_concrete', '636466', .15, .31)
for material in (concrete, floor):
    asset = 'Concrete048' if material == floor else 'Concrete023'
    ns = material.node_tree.nodes
    ls = material.node_tree.links
    p = ns.get('Principled BSDF')
    for kind, socket in [('Color', 'Base Color'), ('NormalGL', 'Normal')]:
        n = ns.new('ShaderNodeTexImage')
        n.image = bpy.data.images.load(str(TEX / (asset + '_1K-JPG_' + kind + '.jpg')), check_existing=True)
        if kind == 'Color':
            ls.new(n.outputs['Color'], p.inputs[socket])
        else:
            n.image.colorspace_settings.name = 'Non-Color'
            normal = ns.new('ShaderNodeNormalMap')
            normal.inputs['Strength'].default_value = .48
            ls.new(n.outputs['Color'], normal.inputs['Color'])
            ls.new(normal.outputs['Normal'], p.inputs[socket])
steel = mat('gunmetal', '29343a', .72, .36)
edge = mat('brushed_steel', '6c747b', .83, .32)
dark = mat('recess_black', '10161a', .2, .82)
rubber = mat('rubber', '141619', 0, .87)
red = mat('oxblood_tools', '602c33', .55, .47)
yellow = mat('industrial_yellow', 'c8a342', .35, .45)
paint = mat('worn_road_paint', 'bfa358', .06, .77)
paper = mat('paper', 'b2ae92', 0, .93)
rust = mat('rust', '644038', .28, .8)
pink = mat('magenta_tube', 'ff249d', .1, .2, 6)
cyan = mat('cyan_tube', '39dcec', .1, .2, 6)
warm = mat('bench_tube', 'ffd971', .1, .2, 4)
white = mat('lift_tube', 'cbddee', .1, .2, 3)
led = mat('indicator', '72f5dc', 0, .3, 2)
jacket = mat('David_yellow_fabric', 'e9bc27', 0, .92)
stripe = mat('reflective_fabric', 'c4cfcd', .3, .46)
teal = mat('Edgerunners_teal', '007f75', .05, .62)
guts = mat('Rebecca_Guts_mint', '42bcab', .4, .46)
guts_pink = mat('Rebecca_Guts_pink', 'cf5590', .3, .48)
skin = mat('Maine_tan_armor', 'a88262', .36, .48)

def mesh(name, verts, faces, material, uvscale=1):
    d = bpy.data.meshes.new(name)
    d.from_pydata([xyz(v) for v in verts], [], faces)
    d.update()
    o = bpy.data.objects.new(name, d)
    scene.collection.objects.link(o)
    d.materials.append(material)
    uv = d.uv_layers.new(name='UVMap')
    for poly in d.polygons:
        normal = poly.normal
        axis = max(range(3), key=lambda k: abs(normal[k]))
        a, b = ((1, 2), (0, 2), (0, 1))[axis]
        for i in poly.loop_indices:
            v = d.vertices[d.loops[i].vertex_index].co
            uv.data[i].uv = (v[a] / uvscale, v[b] / uvscale)
    return o

def box(name, p, size, material, bevel=.015, uvscale=2):
    x, y, z = p
    a, b, c = (v / 2 for v in size)
    verts = [(x+dx*a,y+dy*b,z+dz*c) for dx,dy,dz in
             [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)]
    o = mesh(name, verts, faces, material, uvscale)
    if bevel:
        mod = o.modifiers.new('Caught edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
    return o

def cylinder(name, a, b, radius, material, sides=16, r2=None):
    direction = Vector(xyz(b)) - Vector(xyz(a))
    mid = (Vector(xyz(a)) + Vector(xyz(b))) / 2
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=radius, radius2=r2 if r2 is not None else radius, depth=direction.length, location=mid)
    o = bpy.context.object
    o.name = name
    o.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    o.data.materials.append(material)
    for p in o.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    return o

def tube(name, points, radius, material):
    d = bpy.data.curves.new(name, 'CURVE')
    d.dimensions = '3D'
    d.resolution_u = 6
    d.bevel_depth = radius
    d.bevel_resolution = 2
    sp = d.splines.new('BEZIER')
    sp.bezier_points.add(len(points) - 1)
    for p, co in zip(sp.bezier_points, points):
        p.co = xyz(co)
        p.handle_left_type = p.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name, d)
    scene.collection.objects.link(o)
    d.materials.append(material)
    return o

font = bpy.data.fonts.load('/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf')
def label(text, p, size, material=paper, name=None):
    d = bpy.data.curves.new(name or text, 'FONT')
    d.body = text
    d.font = font
    d.size = size
    d.align_x = 'CENTER'
    d.align_y = 'CENTER'
    d.extrude = .001
    o = bpy.data.objects.new(name or text, d)
    scene.collection.objects.link(o)
    o.location = xyz(p)
    o.rotation_euler = (math.pi / 2, 0, 0)
    d.materials.append(material)
    return o

def quad(name, p, w, h, material):
    x,y,z = p
    o = mesh(name, [(x-w/2,y-h/2,z),(x+w/2,y-h/2,z),(x+w/2,y+h/2,z),(x-w/2,y+h/2,z)], [(0,1,2,3)], material)
    for i, uv in enumerate([(0,0),(1,0),(1,1),(0,1)]):
        o.data.uv_layers.active.data[i].uv = uv
    return o

def tyre(name, p, radius=.36, width=.22, flat=False):
    bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=10, location=xyz(p), major_radius=radius*.76, minor_radius=radius*.24)
    o = bpy.context.object
    o.name = name
    if not flat:
        o.rotation_euler.x = math.pi / 2
    o.data.materials.append(rubber)
    for f in o.data.polygons:
        f.use_smooth = True
    # Fine shoulder ribs catch the strip lights without a texture decal.
    for k in range(24):
        a = k * math.tau / 24
        x,y,z = p
        if flat:
            aa=(x+radius*.95*math.cos(a),y-width*.4,z+radius*.95*math.sin(a))
            bb=(aa[0],y+width*.4,aa[2])
        else:
            aa=(x+radius*.95*math.cos(a),y+radius*.95*math.sin(a),z-width*.4)
            bb=(aa[0],aa[1],z+width*.4)
        cylinder('Tyre tread',aa,bb,.009,dark,6)
    return o

# Scratched red workshop paint, with actual roughness and normal maps.
for kind, socket in [('Color','Base Color'),('NormalGL','Normal'),('Roughness','Roughness')]:
    n=red.node_tree.nodes.new('ShaderNodeTexImage')
    n.image=bpy.data.images.load(str(TEX/('PaintedMetal004_1K-JPG_'+kind+'.jpg')),check_existing=True)
    shader=red.node_tree.nodes.get('Principled BSDF')
    if kind!='Color': n.image.colorspace_settings.name='Non-Color'
    if kind=='NormalGL':
        norm=red.node_tree.nodes.new('ShaderNodeNormalMap')
        norm.inputs['Strength'].default_value=.25
        red.node_tree.links.new(n.outputs['Color'],norm.inputs['Color'])
        red.node_tree.links.new(norm.outputs['Normal'],shader.inputs[socket])
    else:
        red.node_tree.links.new(n.outputs['Color'],shader.inputs[socket])

# Enclosed room. The camera remains inside these walls.
box('Floor', (0,-.16,.5), (14.5,.3,17), floor, .01, 3)
box('Back wall', (0,2.8,-7.15), (14.5,5.6,.3), concrete, .01, 2)
box('Left wall', (-7.15,2.8,.5), (.3,5.6,17), concrete, .01, 2)
box('Right wall', (7.15,2.8,.5), (.3,5.6,17), concrete, .01, 2)
box('Ceiling', (0,5.68,.5), (14.5,.22,17), dark, 0)
box('Front lintel', (0,4.95,8.9), (14.5,1.4,.3), concrete)
box('Entrance left pier', (-5.8,2.1,8.9), (2.8,4.2,.3), concrete)
box('Entrance right pier', (5.8,2.1,8.9), (2.8,4.2,.3), concrete)
box('Roller shutter', (0,2.1,9.0), (8.8,4.2,.15), steel)
for y in range(21):
    box('Shutter ribs', (0,.15+y*.2,8.88), (8.65,.025,.04), edge, 0)
for x in (-6.7,-3.45,0,3.45,6.7):
    box('Back columns',(x,2.8,-6.88),(.22,5.6,.22),steel)
for z in (-5,-1,3,7):
    box('Ceiling beam',(0,5.4,z),(14.2,.3,.23),steel)
    for x in (-6.9,6.9):
        box('Wall column',(x,2.75,z),(.2,5.5,.25),steel)
        box('Impact guard',(x,1.1,z),(.25,2.2,.29),yellow)
        for y in (.5,1.1,1.7):
            box('Impact guard black band',(x,y,z+.155),(.255,.16,.008),dark,0)
for x in (-5.9,5.9):
    cylinder('Ventilation trunk',(x,5.03,-6.5),(x,5.03,8),.27,edge,24)
    for z in range(-6,9):
        cylinder('Ventilation sleeve',(x,5.03,z-.035),(x,5.03,z+.035),.285,steel,24)
for x in (-6.5,-6.25):
    tube('Conduit',[(x,.2,-6.7),(x,4.5,-6.7),(x,4.9,-5.8),(x,4.9,8)],.034,edge)
for y in (1.9,2.04,4.6):
    cylinder('Back wall pipe',(-6.8,y,-6.77),(6.8,y,-6.77),.035,edge)

# Floor cuts, drains and the low service ramp.
for x in range(-6,7,2):
    box('Floor expansion seam',(x,.002,.4),(.012,.006,16.7),dark,0)
for z in range(-6,9,2):
    box('Floor expansion seam',(0,.002,z),(14,.006,.012),dark,0)
for x in (-2.0,2.0):
    box('Drain channel',(x,.004,.3),(.2,.012,8.5),dark,0)
    for k in range(72):
        box('Drain grate',(x,.012,-3.85+k*.116),(.19,.012,.018),edge,.003)
    box('Lift floor border',(x*1.1,.012,.1),(.065,.008,6.5),paint,0)
box('Service plate',(0,.004,.1),(3.8,.008,6.35),floor,0,3)
for z in (-3.08,3.27):
    box('Lift caution edge',(0,.02,z),(4.25,.01,.1),paint,0)
for x in (-1.9,1.9):
    for z in (-2.8,2.9):
        box('Lift foot',(x,.045,z),(.24,.08,.34),steel)
        cylinder('Floor anchor',(x,.086,z),(x,.096,z),.025,edge,8)

# Workbench and tool cabinets along the back wall.
for x in (-4.9,-3.45,-2.0,2.8,4.25,5.7):
    box('Tool cabinet',(x,.66,-6.15),(1.35,1.28,1.35),red if x < -3 else steel,.035)
    for y in (.28,.48,.68,.88,1.08):
        box('Drawer',(x,y,-5.46),(1.24,.17,.04),steel,.006)
        box('Drawer rail',(x,y+.018,-5.42),(1.1,.025,.035),edge,.004)
        for xx in (-.51,.51):
            cylinder('Drawer screw',(x+xx,y,-5.397),(x+xx,y,-5.392),.008,edge,6)
box('Bench top',(.15,1.37,-6.12),(12.7,.15,1.55),edge,.035)
box('Pegboard',(.25,2.32,-6.84),(8.1,1.55,.07),dark,.008)
for x in range(38):
    for y in range(6):
        # Real perforations are represented by dark inset rivets, inexpensive at this scale.
        box('Pegboard hole',(-3.5+x*.2,1.72+y*.2,-6.79),(.019,.022,.008),steel,0)
for i in range(16):
    x = -3.3+i*.43
    y = 2.62+rnd.uniform(-.15,.15)
    length = rnd.uniform(.28,.6)
    cylinder('Hanging wrench',(x,y,-6.70),(x,y-length,-6.70),.022,edge,8)
    cylinder('Wrench head',(x,y+.04,-6.71),(x,y+.04,-6.66),.055,edge,8)
    box('Tool grip',(x,y-length+.06,-6.67),(.066,.12,.04),red if i%3==0 else rubber,.02)
box('Bench light housing',(.1,3.22,-6.55),(8.6,.14,.48),steel)
box('Bench amber diffuser',(.1,3.135,-6.36),(8.2,.045,.13),warm,.01)
for i in range(20):
    x = rnd.uniform(-6,6)
    z = rnd.uniform(-6.6,-5.7)
    h = rnd.uniform(.12,.33)
    cylinder('Bench bottle',(x,1.46,z),(x,1.46+h,z),.055,red if i%4==0 else dark,12)
    cylinder('Bottle cap',(x,1.46+h,z),(x,1.5+h,z),.036,yellow if i%3==0 else edge,10)
    if i%3==0:
        box('Bottle label',(x,1.5+h*.3,z+.053),(.065,.07,.004),paper,0)
for x in (-4.6,5.4):
    box('Shop terminal',(x,1.65,-6.35),(.42,.35,.38),dark,.03)
    for y in range(5):
        box('Terminal ventilation',(x,1.55+y*.035,-6.15),(.28,.01,.012),edge,0)
box('Bench vice',(-2.2,1.55,-5.52),(.45,.2,.4),steel,.03)
for x in (-2.36,-2.06):
    box('Vice jaw',(x,1.73,-5.52),(.09,.16,.36),edge,.01)
cylinder('Vice handle',(-2.21,1.34,-5.27),(-2.21,1.66,-5.27),.017,edge)

# Overhead lift with suspended rectangular light bars and service rails.
for x in (-2.15,2.15):
    box('Overhead gantry rail',(x,5.12,.1),(.18,.32,10),yellow)
    for z in (-2.55,2.85):
        cylinder('Suspension cable',(x,4.04,z),(x,5.35,z),.022,edge,10)
        box('Hoist carriage',(x,4.85,z),(.35,.4,.42),steel)
        box('Lift frame',(x,4.03,.15),(.19,.24,5.8),steel)
        box('Overhead light',(x,3.895,.15),(.1,.045,5.4),white,.009)
for z in (-2.66,2.96):
    box('Cross member',(0,4.03,z),(4.45,.24,.21),steel)
    box('Cross light',(0,3.895,z),(3.95,.045,.1),white,.008)
for x in (-1.45,-.75,0,.75,1.45):
    box('Lift cross grate',(x,4.08,-.25),(.12,.08,4.65),dark)

# Practical neon tubes on each side, plus cables and junction boxes.
for x, material in [(-6.87,pink),(6.87,cyan)]:
    for z in (-4.8,.2,4.3):
        box('Tube backplate',(x,2.9,z),(.13,2.1,.18),steel)
        cylinder('Wall neon',(x+(.1 if x<0 else -.1),2.0,z),(x+(.1 if x<0 else -.1),3.8,z),.032,material)
        tube('Light cable',[(x,2,z),(x,1.7,z+.1),(x,1.4,z+.12),(x,1.25,z+.5)],.018,dark)
        box('Switch enclosure',(x,1.25,z+.5),(.15,.3,.21),edge)
for x, material in [(-5.5,pink),(5.5,cyan)]:
    box('Ceiling neon fixture',(x,5.32,.8),(.17,.12,6.5),steel)
    box('Ceiling neon',(x,5.245,.8),(.055,.02,6.2),material,0)

# Wheel rack, stacked tyres and air compressor.
for x in (4.0,6.5):
    box('Wheel rack post',(x,2.15,-4.65),(.075,2.4,.075),edge)
for y in (1.2,2.2,3.2):
    box('Wheel rack shelf',(5.25,y,-4.8),(2.65,.07,.85),steel)
    for x in (4.45,5.27,6.08):
        tyre('Spare wheel',(x,y+.37,-4.72),.36)
        bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=8,location=xyz((x,y+.37,-4.51)),major_radius=.218,minor_radius=.022)
        rim=bpy.context.object
        rim.name='Open alloy rim'
        rim.rotation_euler.x=math.pi/2
        rim.data.materials.append(edge)
        cylinder('Wheel hub',(x,y+.37,-4.56),(x,y+.37,-4.52),.08,dark,12)
        for k in range(5):
            a=k*math.tau/5
            cylinder('Wheel spoke',(x,y+.37,-4.49),(x+.205*math.cos(a),y+.37+.205*math.sin(a),-4.49),.018,steel,6)
for y in (.22,.5,.78,1.06):
    tyre('Stacked tyre',(-4.8,y,2.4),.55,flat=True)
cylinder('Air tank',(5.85,.57,2.3),(5.85,.57,3.7),.38,red,24)
for z in (2.35,3.6):
    box('Compressor feet',(5.85,.16,z),(.65,.27,.14),steel)
box('Compressor motor',(5.85,1.08,3.0),(.6,.38,.5),steel)
for z in (2.82,2.92,3.02,3.12,3.22):
    box('Cooling fins',(5.85,1.1,z),(.68,.3,.025),edge,0)
tube('Air hose',[(5.85,1.3,2.8),(5.1,.2,2.4),(4.9,.04,3.7),(3.9,.035,4.3),(3.3,.04,4),(3.6,.05,3.2),(4.2,.05,3.6)],.03,rubber)

# Maine's detached arm cannon, mounted horizontally in a service cradle.
for x in (-5.65,-4.75):
    box('Maine arm cradle',(x,1.62,-5.85),(.13,.31,.52),steel)
cylinder('Maine cannon core',(-5.85,1.95,-5.86),(-4.40,1.95,-5.86),.2,dark,16)
cylinder('Maine elbow ring',(-5.88,1.95,-5.86),(-5.65,1.95,-5.86),.275,edge,16)
cylinder('Maine forearm armor',(-5.65,1.95,-5.86),(-4.7,1.95,-5.86),.265,skin,8,r2=.2)
for x in (-5.52,-5.22,-4.9):
    cylinder('Maine armor seam',(x-.022,1.95,-5.86),(x+.022,1.95,-5.86),.27,steel,8)
box('Maine cannon receiver',(-5.16,2.17,-5.86),(.78,.18,.27),skin,.045)
cylinder('Maine launcher',(-4.92,2.18,-5.86),(-4.39,2.18,-5.86),.10,edge,16)
cylinder('Maine cannon bore',(-4.40,2.18,-5.86),(-4.385,2.18,-5.86),.075,dark,16)
box('Maine cybernetic palm',(-4.42,1.9,-5.86),(.26,.18,.32),edge,.04)
for z in (-5.99,-5.90,-5.81,-5.72):
    cylinder('Maine articulated fingers',(-4.35,1.87,z),(-4.17,1.8,z),.038,edge,8)
    cylinder('Maine finger joint',(-4.17,1.8,z),(-4.13,1.71,z),.035,steel,8)
tube('Maine hydraulic line',[(-5.73,1.76,-5.7),(-5.3,1.69,-5.59),(-4.78,1.75,-5.66)],.032,dark)
label('MAINE  /  PROJECTILE LAUNCH SYSTEM',(-5.08,1.42,-5.29),.115,paper)

# Rebecca's Guts on pegs above the bench. Oversize mint and pink receiver.
box('Guts display back',(-.05,3.92,-6.87),(2.6,.8,.06),dark)
box('Rebecca Guts receiver',(-.05,3.92,-6.69),(1.28,.27,.2),guts,.06)
cylinder('Guts barrel',(-.1,3.99,-6.69),(1.15,3.99,-6.69),.075,steel,12)
box('Guts pump',(.55,3.8,-6.67),(.56,.14,.22),guts_pink,.025)
box('Guts stock',(-1.00,3.87,-6.69),(.65,.23,.22),guts_pink,.055)
box('Guts grip',(-.35,3.64,-6.68),(.14,.37,.16),guts_pink,.03)
for x in (-.36,-.06,.24):
    box('Guts decals',(x,3.94,-6.572),(.035,.16,.006),guts_pink,0)
label('GUTS',(-.05,3.94,-6.558),.145,paper)
label('NO REFUNDS',(.05,3.48,-6.77),.10,pink)

# David's jacket is a curved cloth mesh, sleeves and collar draped over a stool.
jx,jz=-3.35,.05
cylinder('Stool post',(jx,.18,jz),(jx,.9,jz),.05,edge)
cylinder('Stool cushion',(jx,.89,jz),(jx,.99,jz),.34,rubber,32)
for k in range(5):
    a=k*math.tau/5
    px,pz=jx+.4*math.cos(a),jz+.4*math.sin(a)
    cylinder('Stool legs',(jx,.25,jz),(px,.14,pz),.033,steel)
    cylinder('Stool castor',(px,.08,pz-.04),(px,.08,pz+.04),.075,rubber,12)
box('Stool back',(jx,1.40,jz-.13),(.59,.83,.1),dark,.06)
verts=[]
faces=[]
cols,rows=24,26
for j in range(rows+1):
    t=j/rows
    for i in range(cols+1):
        u=i/cols*2-1
        width=.36*(1-.16*t)
        x=jx+u*width
        y=1.86-1.2*t+.025*math.sin(u*8+t*7)
        z=jz+.06+.13*math.sin(t*math.pi)+.032*math.sin(u*15+t*3)
        verts.append((x,y,z))
for j in range(rows):
    for i in range(cols):
        a=j*(cols+1)+i
        faces.append((a,a+1,a+cols+2,a+cols+1))
coat=mesh('David jacket draped cloth',verts,faces,jacket)
coat.data.materials.append(stripe)
for poly in coat.data.polygons:
    row=poly.index//cols
    if row in (11,12,20,21):
        poly.material_index=1
    poly.use_smooth=True
solid=coat.modifiers.new('Fabric thickness','SOLIDIFY')
solid.thickness=.014
for side in (-1,1):
    points=[(jx+side*.28,1.79,jz+.01),(jx+side*.47,1.51,jz+.04),(jx+side*.52,1.14,jz+.1),(jx+side*.45,.9,jz+.16)]
    tube('David jacket hanging sleeve',points,.12,jacket)
    cylinder('David jacket sleeve cuff',(jx+side*.46,.94,jz+.14),(jx+side*.44,.86,jz+.17),.1,dark,12)
    cylinder('David jacket sleeve reflective strip',(jx+side*.52,1.2,jz+.09),(jx+side*.52,1.28,jz+.08),.123,stripe,16)
tube('David jacket collar',[(jx-.19,1.83,jz+.02),(jx-.17,1.99,jz-.015),(jx+.15,1.99,jz-.015),(jx+.19,1.83,jz+.02)],.055,jacket)
for path in [[(-.15,.1),(.15,.18),(-.1,.27),(.1,.36)],[(-.08,.39),(.05,.07)]]:
    tube('David Edgerunners emblem',[(jx+x,1.42+y,jz+.14) for x,y in path],.022,teal)

# The monitor and large Smasher print are separate textured meshes.
moon=image_mat('braindance_screen',TEX/'moon.jpg',.85)
box('Braindance monitor housing',(-4.6,3.88,-6.62),(2.63,1.62,.19),dark,.045)
quad('BraindanceScreen',(-4.6,3.92,-6.511),2.43,1.367,moon)
label('BRAINDANCE   /   MOON 02',(-4.6,3.13,-6.498),.12,cyan)
box('BD player',(-5.55,2.9,-6.58),(.56,.21,.33),steel)
label('BD',(-5.55,2.91,-6.4),.13,led)
posterpath=TEX/'adam-smasher.jpg'
if not posterpath.exists():
    posterpath=OUT/'references/smasher.png'
poster=image_mat('Adam_Smasher_poster',posterpath,.13)
box('Smasher poster backing',(3.8,4.05,-6.91),(2.1,2.8,.06),dark)
quad('Adam Smasher poster',(3.8,4.05,-6.869),2.0,2.7,poster)
for x in (2.82,4.78):
    for y in (2.72,5.38):
        box('Poster tape',(x,y,-6.85),(.16,.11,.003),paper,0)

# Left service desk with diagnostics, small technical labels, cans and papers.
box('Side service cabinet',(-5.5,1.0,-2.5),(1.6,1.95,1.15),red)
box('Side bench top',(-5.5,2.015,-2.5),(1.74,.1,1.3),edge)
for y in (.4,.75,1.1,1.45,1.8):
    box('Side drawer',(-5.5,y,-1.91),(1.43,.29,.04),steel)
    box('Side handle',(-5.5,y,-1.865),(1.1,.03,.045),edge,.006)
for x,y in [(-6.0,3.35),(-4.9,3.6)]:
    box('Diagnostic monitor',(x,y,-2.8),(1.02,.72,.12),dark)
    box('Diagnostic glass',(x,y,-2.726),(.93,.62,.015),steel,0)
    for i in range(7):
        box('Diagnostic traces',(x-.12+rnd.random()*.1,y-.24+i*.07,-2.71),(.35+rnd.random()*.35,.011,.006),cyan,0)
    label('S4 / ECU',(x,y+.20,-2.698),.095,cyan)
    cylinder('Monitor stand',(x,2.07,-2.8),(x,y-.36,-2.8),.027,edge)
for i in range(5):
    x=-5.9+i*.18
    cylinder('Bench socket',(x,2.08,-2.04),(x,2.20,-2.04),.036,edge,12)
box('Folded service manual',(-5.38,2.09,-2.33),(.38,.03,.25),paper,.003)
label('AFTERLIFE AUTO',(-.1,4.84,-6.83),.39,cyan)
label('WATSON  /  BAY 01',(-.1,4.46,-6.82),.13,paper)
box('Warning placard',(6.4,1.78,-6.65),(.43,.52,.04),yellow)
label('HIGH\nVOLTAGE',(6.4,1.78,-6.62),.105,dark)

# Real lights for the editable Blender scene and browser lighting reference.
def area(name,p,target,color,power,size,size_y=None):
    d=bpy.data.lights.new(name,'AREA')
    d.energy=power
    d.color=rgb(color)
    d.shape='RECTANGLE'
    d.size=size
    d.size_y=size_y or size
    o=bpy.data.objects.new(name,d)
    scene.collection.objects.link(o)
    o.location=xyz(p)
    o.rotation_euler=(Vector(xyz(target))-o.location).to_track_quat('-Z','Y').to_euler()
    return o
area('Overhead softbox',(0,3.83,.1),(0,0,.1),'c9e3f1',1300,3.7,5.3)
area('Pink wall wash',(-6.65,3,.3),(-1,1,-1),'ff228f',950,3.3,5)
area('Cyan wall wash',(6.65,3,.3),(1,1,-1),'23cfee',1100,3.3,5)
area('Workbench amber',(.1,3.07,-6.36),(.1,1.2,-5.8),'ffd477',700,8,1)
area('Front fill',(0,3.5,8.5),(0,.8,0),'7a9cab',800,7,3)

# Apply bevels and batch static objects by material, keeping named props useful.
bpy.ops.object.select_all(action='DESELECT')
for o in list(scene.objects):
    if o.type in ('MESH','CURVE','FONT'):
        o.select_set(True)
bpy.context.view_layer.objects.active=coat
bpy.ops.object.convert(target='MESH')
buckets=defaultdict(list)
for o in list(scene.objects):
    if o.type != 'MESH' or o.name == 'BraindanceScreen':
        continue
    semantic = next((p for p in ('David','Maine','Rebecca','Adam Smasher') if o.name.startswith(p)), 'Room')
    key=(semantic,tuple(m.name for m in o.data.materials))
    buckets[key].append(o)
for (semantic,mats),objects in buckets.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:
        bpy.ops.object.join()
    objects[0].name=semantic+'_'+mats[0].replace('Garage_','')
    objects[0]['garage_prop']=semantic

world=bpy.data.worlds.new('Garage night')
world.use_nodes=True
world.node_tree.nodes.get('Background').inputs[0].default_value=(.018,.026,.04,1)
world.node_tree.nodes.get('Background').inputs[1].default_value=.28
scene.world=world
camera_data=bpy.data.cameras.new('Garage_camera')
camera=bpy.data.objects.new('Garage_camera',camera_data)
scene.collection.objects.link(camera)
camera.location=xyz((5.5,2.7,7.7))
camera.rotation_euler=(Vector(xyz((0,1.45,-1.4)))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.lens=26
scene.camera=camera
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.cycles.device='GPU'
scene.render.resolution_x=1440
scene.render.resolution_y=960
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUT/'room-preview.png')
for image in bpy.data.images:
    if image.filepath and str(OUT) in bpy.path.abspath(image.filepath):
        image.pack()
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type=='MESH':
        o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'garage-source.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_extras=True,export_lights=False,export_cameras=False)
bpy.data.libraries.write(str(OUT/'night-city-garage.blend'),{scene},path_remap='RELATIVE_ALL',fake_user=True,compress=True)
print({'scene':scene.name,'objects':len(scene.objects),'meshes':len([o for o in scene.objects if o.type=='MESH']),'triangles':sum(len(p.vertices)-2 for o in scene.objects if o.type=='MESH' for p in o.data.polygons)})
