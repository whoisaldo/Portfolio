"""Customize the supplied FBX in Blender. Run through Blender MCP or --python.

Blender coordinates: X left, -Y forward, Z up. glTF converts this to X left,
+Z forward, Y up. All dimensions are metres. See design/audi-s4/README.md.
"""
import bpy
import bmesh
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(globals().get('PROJECT_ROOT', '/Users/aldo/Desktop/Portfolio'))
SOURCE = ROOT / 'design/audi-s4/source'
OUTPUT = ROOT / 'public/models'
LOWERING = 0.034
WHEEL_R = 0.254 + 0.255 * 0.35
SCENE_NAME = 'Ali_S4_Final'

old = bpy.data.scenes.get(SCENE_NAME)
if old:
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.scenes.remove(old)
scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'
bpy.ops.import_scene.fbx(filepath=str(SOURCE / 'FINAL_MODEL_S4.fbx'))
imported = list(scene.objects)
bpy.ops.object.select_all(action='DESELECT')
for obj in imported:
    obj.location *= 100
    obj.scale *= 100
    obj.select_set(True)
bpy.context.view_layer.update()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.select_all(action='DESELECT')


def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


def rgba(hex_color):
    return tuple(linear(int(hex_color[i:i+2], 16) / 255) for i in (0, 2, 4)) + (1,)


def material(name, color, metal=0, rough=.4, coat=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = rgba(color)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = .13
    m.diffuse_color = rgba(color)
    return m


def texture(m, filename, socket='Base Color', noncolor=False):
    image = bpy.data.images.load(str(SOURCE / filename), check_existing=True)
    if noncolor:
        image.colorspace_settings.name = 'Non-Color'
    n = m.node_tree.nodes.new('ShaderNodeTexImage')
    n.image = image
    p = m.node_tree.nodes.get('Principled BSDF')
    if socket == 'Normal':
        normal = m.node_tree.nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value = .4
        m.node_tree.links.new(n.outputs['Color'], normal.inputs['Color'])
        m.node_tree.links.new(normal.outputs['Normal'], p.inputs['Normal'])
    else:
        m.node_tree.links.new(n.outputs['Color'], p.inputs[socket])
    return n


paint = material('S4_metallic_grey', '50575d', .62, .29, .75)
black = material('S4_gloss_black_trim', '101215', .24, .26, .5)
grillemat = material('S4_black_honeycomb', '101216', .05, .48, .12)
rubber = material('S4_tyre_rubber', '242529', 0, .88)
wheelmat = material('S4_R8_satin_graphite', '45484c', .72, .36, .2)
metal = material('S4_brushed_brake_rotors', '9b9fa4', .86, .39)
chrome = material('S4_satin_aluminium', 'b5b9bd', .94, .24)
cavity = material('S4_intake_depth', '050608', 0, .95)
caliper = material('S4_black_brake_calipers', '202225', .38, .34)
red = material('S4_badge_red', 'ca2637', .15, .32)
glass = material('S4_tinted_glass', '10171c', .13, .12, 1)
lens = material('S4_clear_lamp_lenses', 'ccd6dd', .05, .1, 1)
lensp = lens.node_tree.nodes.get('Principled BSDF')
lensp.inputs['Alpha'].default_value = .08
lens.surface_render_method = 'DITHERED'
atlas = material('S4_original_lamps_and_details', 'ffffff', .12, .38)
texture(atlas, 'car_audi_s4_df.png')
texture(atlas, 'car_audi_s4_nm.png', 'Normal', True)
interior = material('S4_charcoal_interior', '16181c', 0, .85)
underbody = material('S4_underbody', 'ffffff', .1, .8)
texture(underbody, 'car_bottom_df.png')
carbon = material('S4_carbon_twill', '24262a', .42, .31, .9)

# A small repeating PBR texture for the visible carbon parts. The UVs are
# assigned in mesh(), so the same weave survives the GLB export.
weave = bpy.data.images.new('S4_carbon_twill', width=64, height=64)
pixels = []
for y in range(64):
    for x in range(64):
        a, b = x // 16, y // 16
        warp = (a - b) % 4 < 2
        strand = (x if warp else y) % 16
        shine = .45 + .55 * math.sin((strand + .5) / 16 * math.pi)
        thread = .82 + .18 * math.cos((x if warp else y) * math.pi)
        v = (.023 if warp else .009) * shine * thread
        pixels.extend((v, v * 1.04, v * 1.09, 1))
weave.pixels[:] = pixels
weave.pack()
n = carbon.node_tree.nodes.new('ShaderNodeTexImage')
n.image = weave
carbon.node_tree.links.new(n.outputs['Color'], carbon.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])


def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.parent = parent
    return obj


car = empty('ali_s4')
car['wheelRadius'] = WHEEL_R
car['wheelbase'] = 2.811
car['forwardAxis'] = '+Z after glTF export'
body = empty('body', parent=car)
body.location.z = -LOWERING


def mesh(name, verts, faces, mat, parent=body, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.parent = parent
    if mat:
        data.materials.append(mat)
    if smooth:
        for p in data.polygons:
            p.use_smooth = True
    if mat == carbon:
        uv = data.uv_layers.new(name='CarbonUV')
        for p in data.polygons:
            normal = p.normal
            axis = max(range(3), key=lambda i: abs(normal[i]))
            axes = [i for i in range(3) if i != axis]
            for li in p.loop_indices:
                co = data.vertices[data.loops[li].vertex_index].co
                uv.data[li].uv = (co[axes[0]] * 42, co[axes[1]] * 42)
    return obj


def bevel(obj, width=.004, segments=2):
    mod = obj.modifiers.new('Rounded manufacturing edges', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    return obj


def box(name, loc, size, mat, parent=body, radius=.004):
    x,y,z = (s/2 for s in size)
    vs = [(a+x0,b+y0,c+z0) for a,b,c in [loc] for x0,y0,z0 in [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]]
    obj = mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat,parent)
    return bevel(obj,radius)


def tube(name, points, radius, mat, parent=body, cyclic=False, sides=8):
    vs, fs = [], []
    points = [Vector(p) for p in points]
    for i,p in enumerate(points):
        direction = (points[(i+1)%len(points)] - points[i-1 if i else (-1 if cyclic else 0)])
        if not cyclic and i == len(points)-1:
            direction = p-points[i-1]
        direction.normalize()
        helper = Vector((0,1,0)) if abs(direction.y)<.9 else Vector((1,0,0))
        u = direction.cross(helper).normalized()
        v = direction.cross(u).normalized()
        for j in range(sides):
            pos=p+radius*(u*math.cos(j*2*math.pi/sides)+v*math.sin(j*2*math.pi/sides))
            vs.append(tuple(pos))
    for i in range(len(points) if cyclic else len(points)-1):
        for j in range(sides):
            fs.append((i*sides+j,i*sides+(j+1)%sides,((i+1)%len(points))*sides+(j+1)%sides,((i+1)%len(points))*sides+j))
    return mesh(name,vs,fs,mat,parent,True)


def lathe_x(name, profile, mat, parent, segments=80):
    vs,fs=[],[]
    for x,r in profile:
        for i in range(segments):
            t=i*2*math.pi/segments
            vs.append((x, math.sin(t)*r, math.cos(t)*r))
    for j in range(len(profile)-1):
        for i in range(segments):
            fs.append((j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i))
    return mesh(name,vs,fs,mat,parent,True)


def remove_faces(obj, predicate):
    bm=bmesh.new();bm.from_mesh(obj.data)
    selected=[f for f in bm.faces if predicate(f)]
    bmesh.ops.delete(bm,geom=selected,context='FACES')
    bm.to_mesh(obj.data);bm.free();obj.data.update()


# Keep the supplied body surfaces, panel seams, cabin and lamp UVs. Replace
# the stock wheels, grille, licence plates, bumpers' lower inserts and glow cards.
for obj in imported:
    name=obj.name
    if name.startswith(('Wheel','bone_caliper')) or (name.startswith('detach_bumper_front') and 'carpaint' not in name) or 'glows' in name or name.startswith('chassis_numberplate') or name.startswith('chassis_Chrome'):
        bpy.data.objects.remove(obj,do_unlink=True)
        continue
    obj.parent=body
    for slot in obj.material_slots:
        name=slot.material.name.split('.')[0]
        slot.material={'CarPaint':paint,'CP':black,'MET':carbon,'Chrome':atlas,'grid':atlas,'interior':interior,'under':underbody,'windwos':glass,'D_Glass':glass,'glass_light':lens}.get(name,black)
    # Delete the factory grille geometry, while keeping the textured lamps.
    if obj.name.startswith('chassis_carpaint'):
        remove_faces(obj,lambda f: f.material_index==0 and all(v.co.y < -2.095 and abs(v.co.x)<.445 and v.co.z<.73 for v in f.verts))
        # Mirror caps have the same grey paint as the real car.
        for p in obj.data.polygons:
            center=p.center
            if p.material_index==0 and abs(center.x)>.815 and -.78<center.y<-.35 and center.z>.98:
                p.material_index=1
    if obj.name.startswith('chassis_rims_chrome'):
        remove_faces(obj,lambda f: all(abs(v.co.x)<.44 and v.co.y < -2.1 for v in f.verts))
    if obj.name.startswith('chassis_grid'):
        remove_faces(obj,lambda f: (all(abs(v.co.x)<.46 and v.co.y < -2.05 for v in f.verts) or all(v.co.y>2.12 and v.co.z<.45 for v in f.verts)))
    if obj.name.startswith('detach_bumper_front'):
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,.445),plane_no=(0,0,1),clear_inner=True)
        bm.to_mesh(obj.data);bm.free();obj.data.update()


def front_y(x,z):
    # Measured from the supplied bumper at the retained upper/lower seam.
    stations=[(0,-2.272),(.4,-2.228),(.45,-2.215),(.5,-2.198),(.6,-2.148),(.7,-2.08),(.8,-1.98),(.85,-1.855),(.88,-1.764),(.91,-1.70)]
    u=abs(x)
    for (a,b),(c,d) in zip(stations,stations[1:]):
        if u<=c:
            return b+(d-b)*(u-a)/(c-a)-.017*max(0,(.445-z)/.3)
    return stations[-1][1]


def profile_surface(name, outer, holes, mat, depth=.02, yfunc=front_y, parent=body):
    curve=bpy.data.curves.new(name,'CURVE')
    curve.dimensions='2D';curve.resolution_u=1;curve.fill_mode='BOTH';curve.extrude=depth/2
    for points in [outer]+holes:
        dense=[]
        for i,(x,z) in enumerate(points):
            a,b=points[(i+1)%len(points)]
            steps=max(1,math.ceil(math.hypot(x-a,z-b)/.038))
            dense.extend([(x+(a-x)*j/steps,z+(b-z)*j/steps) for j in range(steps)])
        points=dense
        spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
        for p,(x,z) in zip(spline.points,points): p.co=(x,z,0,1)
        spline.use_cyclic_u=True
    obj=bpy.data.objects.new(name,curve);scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH')
    for v in obj.data.vertices:
        x,z,d=v.co.copy();v.co=(x,yfunc(x,z)+d,z)
    obj.parent=parent;obj.data.materials.append(mat)
    return bevel(obj,.003,2)


def inside(x,z,polygon):
    yes=False
    for i,(a,b) in enumerate(polygon):
        c,d=polygon[i-1]
        if ((b>z)!=(d>z)) and x<(c-a)*(z-b)/(d-b)+a: yes=not yes
    return yes


def honeycomb(name, polygon, cell=.027):
    vs,fs=[],[]
    x0=min(x for x,z in polygon);x1=max(x for x,z in polygon)
    z0=min(z for x,z in polygon);z1=max(z for x,z in polygon)
    rad=cell/2;wall=.0016
    row=0;z=z0
    while z<z1:
        x=x0+(row%2)*rad*1.5
        while x<x1:
            shape=[(x+rad*math.cos(i*math.pi/3),z+rad*math.sin(i*math.pi/3)) for i in range(6)]
            if all(inside(a,b,polygon) for a,b in shape):
                start=len(vs)
                for depth,r in [(0,rad),(0,rad-wall),(.012,rad-wall),(.012,rad)]:
                    for i in range(6):
                        a=x+r*math.cos(i*math.pi/3);b=z+r*math.sin(i*math.pi/3)
                        vs.append((a,front_y(a,b)+depth,b))
                for ring in range(4):
                    for i in range(6):
                        fs.append((start+ring*6+i,start+ring*6+(i+1)%6,start+((ring+1)%4)*6+(i+1)%6,start+((ring+1)%4)*6+i))
            x+=3*rad
        row+=1;z+=math.sqrt(3)*rad/2
    return mesh(name,vs,fs,grillemat)


# RS4-style front bumper, traced from the current petrol-station photograph.
grille=[(-.325,.139),(.325,.139),(.39,.18),(.466,.562),(.448,.643),(.36,.694),(-.36,.694),(-.448,.643),(-.466,.562),(-.39,.18)]
left=[(.50,.153),(.841,.163),(.847,.288),(.801,.411),(.535,.411),(.49,.30)]
right=[(-x,z) for x,z in reversed(left)]
lower_left=[(.439,.127),(.879,.126),(.882,.445),(.471,.445)]
profile_surface('RS4_front_bumper_left',lower_left,[list(reversed(left))],paint,.021)
profile_surface('RS4_front_bumper_right',[(-x,z) for x,z in reversed(lower_left)],[list(reversed(right))],paint,.021)
profile_surface('RS4_lower_centre',[(-.44,.103),(.44,.103),(.44,.135),(-.44,.135)],[],paint,.025)
for name,poly in [('central',grille),('left',left),('right',right)]:
    profile_surface('intake_'+name,poly,[],cavity,.003,lambda x,z:front_y(x,z)+.037)
    honeycomb('honeycomb_'+name,poly,.028 if name=='central' else .035)
    tube('intake_surround_'+name,[(x,front_y(x,z)-.005,z) for x,z in poly],.008 if name=='central' else .0035,black,cyclic=True)
for sign in [-1,1]:
    # The diagonal painted blade divides the side intake, as in the photo.
    p=[(sign*x,z) for x,z in [(.488,.15),(.527,.15),(.762,.395),(.704,.418),(.659,.36)]]
    profile_surface('RS4_diagonal_blade',p,[],paint,.026,lambda x,z:front_y(x,z)-.007)
    for x in [.475,.792]:
        # Flush parking sensor rings and washer covers.
        pts=[(sign*x+.012*math.cos(t*math.pi/12),front_y(sign*x,.485)-.017,.485+.012*math.sin(t*math.pi/12)) for t in range(24)]
        tube('front_parking_sensor',pts,.001,black,cyclic=True,sides=5)
    profile_surface('headlamp_washer',[(sign*.555,.492),(sign*.653,.492),(sign*.653,.527),(sign*.555,.527)],[],paint,.003,lambda x,z:front_y(x,z)-.013)
splitter=[(-.89,.13),(-.82,.111),(-.47,.10),(0,.108),(.47,.10),(.82,.111),(.89,.13)]
tube('carbon_front_splitter',[(x,front_y(x,z)-.024,z) for x,z in splitter],.012,carbon,sides=8)
for x in [-.21,0,.21]:
    box('lower_bumper_slot',(x,-2.27,.122),(.148,.017,.017),cavity,radius=.007)
for x in [-.105,-.035,.035,.105]:
    tube('front_black_Audi_ring',[(x+.047*math.cos(i*math.pi/32),-2.291,.591+.039*math.sin(i*math.pi/32)) for i in range(64)],.0035,black,cyclic=True,sides=6)


# Five split spokes, with a concave face and the Audi centre caps. The old
# multispoke wheels in the supplied FBX are not used.
for code,y in [('f',-1.39512),('r',1.41623)]:
    for side,sign in [('l',1),('r',-1)]:
        center=(sign*.787,y,WHEEL_R)
        pivot=empty('steer_'+code+side,center,car) if code=='f' else empty('axle_'+code+side,center,car)
        wheel=empty('wheel_'+code+side,parent=pivot)
        # The sign changes axial depth without mirroring the spin hierarchy.
        def signed(profile): return [(sign*x,r) for x,r in profile]
        tyre=lathe_x('performance_tyre_'+code+side,signed([(-.125,.266),(-.1275,.299),(-.12,.329),(-.107,WHEEL_R-.001),(-.082,WHEEL_R),(.082,WHEEL_R),(.107,WHEEL_R-.001),(.12,.329),(.1275,.299),(.125,.266)]),rubber,wheel,112)
        lathe_x('R8_rim_barrel_'+code+side,signed([(-.111,.26),(.115,.26),(.13,.267),(.134,.262),(.13,.253),(.114,.249),(-.111,.249)]),wheelmat,wheel,96)
        lathe_x('R8_hub_'+code+side,signed([(.034,0),(.034,.065),(.05,.066),(.055,.06),(.055,0)]),wheelmat,wheel,64)
        for k in range(5):
            angle=k*2*math.pi/5+.05
            for direction in [-1,1]:
                # Four radial stations control the curved, splitting arms.
                stations=[(.052,.0,.021,.074),(.104,direction*.11,.021,.083),(.192,direction*.22,.019,.114),(.258,direction*.235,.017,.127)]
                vs=[]
                for r,offset,width,axial in stations:
                    t=angle+offset
                    for depth in [axial,axial-.021]:
                        for edge in [-1,1]:
                            vs.append((sign*depth,math.sin(t)*r+math.cos(t)*width*edge,math.cos(t)*r-math.sin(t)*width*edge))
                fs=[(0,2,3,1),(12,13,15,14)]
                for j in range(3):
                    a=j*4;b=a+4
                    fs.extend([(a,b,b+1,a+1),(a+2,a+3,b+3,b+2),(a,a+2,b+2,b),(a+1,b+1,b+3,a+3)])
                bevel(mesh('R8_split_spoke',vs,fs,wheelmat,wheel),.0025,2)
        lathe_x('Audi_centre_cap_'+code+side,signed([(.057,0),(.057,.042),(.061,.043),(.063,.04),(.063,0)]),wheelmat,wheel,48)
        for j in range(5):
            t=j*2*math.pi/5+math.pi/5
            yy=math.sin(t)*.05;zz=math.cos(t)*.05
            tube('wheel_bolt',[(sign*.058,yy+.005*math.cos(i*math.pi/3),zz+.005*math.sin(i*math.pi/3)) for i in range(6)],.0018,black,wheel,True,5)
        for offset in [-.015,-.005,.005,.015]:
            tube('Audi_hub_ring',[(sign*.065,offset+.007*math.cos(i*math.pi/10),.0055*math.sin(i*math.pi/10)) for i in range(20)],.0009,chrome,wheel,True,5)
        # Brake discs rotate with the wheel. Calipers stay on the steering pivot.
        disc_r=.187 if code=='f' else .168
        lathe_x('drilled_brake_disc_'+code+side,signed([(.018,.066),(.018,disc_r),(.036,disc_r),(.037,.066)]),metal,wheel,96)
        lathe_x('brake_hat_'+code+side,signed([(.025,0),(.025,.08),(.046,.08),(.046,0)]),caliper,wheel,64)
        for j in range(18):
            for radius,delta in [(disc_r-.012,0),(disc_r-.031,.09),(disc_r-.051,.16)]:
                t=j*2*math.pi/18+delta
                yy=radius*math.sin(t);zz=radius*math.cos(t)
                vs=[(sign*.0374,yy,zz)]+[(sign*.0375,yy+.0031*math.cos(i*math.pi/4),zz+.0031*math.sin(i*math.pi/4)) for i in range(8)]
                mesh('drilled_recess',vs,[(0,i+1,(i+1)%8+1) for i in range(8)],cavity,wheel)
        box('fixed_brake_caliper_'+code+side,(sign*.032,.142,.017),(.053,.072,.166 if code=='f' else .133),caliper,pivot,.015)
        box('caliper_red_inlay',(sign*.059,.143,.022),(.002,.036,.023),red,pivot,.001)
        # Sidewall ribs and shallow tread grooves read at close orbit distances.
        for j in range(64):
            t=j*2*math.pi/64
            pts=[]
            for k in range(5):
                x=-.095+k*.0475;theta=t+.065*math.sin(k*math.pi/4)
                pts.append((x,math.sin(theta)*(WHEEL_R+.0004),math.cos(theta)*(WHEEL_R+.0004)))
            tube('tyre_tread_groove',pts,.0011,cavity,wheel,sides=4)
        for r in [.29,.313]:
            tube('tyre_sidewall_moulding',[(sign*.125,math.sin(t*math.pi/48)*r,math.cos(t*math.pi/48)*r) for t in range(96)],.0012,rubber,wheel,True,5)


# Rear carbon diffuser, four distinct fins and the AWE quad outlets.
# The retained bumper contains the two factory apertures. Fit the extra
# undertray between them and blend its rear edge into the original carbon face.
vs,fs=[],[]
section=[(2.19,.268),(2.28,.277),(2.407,.323),(2.407,.310),(2.28,.264),(2.19,.255)]
for i in range(25):
    x=-.423+i*.846/24;curve=.049*(x/.423)**2
    for y,z in section:vs.append((x,y-curve,z))
for i in range(24):
    for j in range(6):fs.append((i*6+j,i*6+(j+1)%6,(i+1)*6+(j+1)%6,(i+1)*6+j))
fs.extend([(5,4,3,2,1,0),(144,145,146,147,148,149)])
bevel(mesh('carbon_rear_diffuser',vs,fs,carbon,smooth=True),.003)
for x in [-.37,-.18,.18,.37]:
    rear=2.41-.049*(x/.423)**2
    verts=[(x-.007,2.18,.30),(x-.007,rear,.328),(x-.007,rear+.012,.195),(x-.007,2.22,.23),(x+.007,2.18,.30),(x+.007,rear,.328),(x+.007,rear+.012,.195),(x+.007,2.22,.23)]
    bevel(mesh('carbon_diffuser_fin',verts,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],carbon),.005)
for label,x in [('left_outer',-.603),('left_inner',-.503),('right_inner',.503),('right_outer',.603)]:
    # Measured aperture centres from the supplied rear bumper. The outlets
    # follow its curve, while the pipes continue inward behind the bodywork.
    end=2.393 if abs(x)<.55 else 2.366
    profile=[(2.04,.045),(end-.027,.047),(end-.003,.047),(end,.044),(end-.003,.039),(2.04,.039)]
    vs,fs=[],[]
    for y,r in profile:
        for j in range(48):
            t=j*math.pi/24;vs.append((x+r*math.cos(t),y,.317+r*math.sin(t)))
    for k in range(len(profile)-1):
        for j in range(48): fs.append((k*48+j,(k+1)*48+j,(k+1)*48+(j+1)%48,k*48+(j+1)%48))
    mesh('AWE_exhaust_'+label,vs,fs,black,smooth=True)
    mesh('exhaust_depth_'+label,[(x,2.038,.317)]+[(x+.039*math.cos(j*math.pi/24),2.038,.317+.039*math.sin(j*math.pi/24)) for j in range(48)],[(0,(j+1)%48+1,j+1) for j in range(48)],cavity)

# The raised carbon lip follows the curve across the boot lid.
vs,fs=[],[]
for i in range(41):
    x=-.655+i*1.31/40;t=abs(x)/.655
    # Smooth fit to the trunk surface sampled across the supplied shell.
    z=1.030-.030*t*t-.031*t**6;y=2.303-.16*t*t
    for dy,dz in [(-.066,-.004),(.052,0),(.065,.068-.02*t),(-.063,.006)]:
        vs.append((x,y+dy,z+dz))
for i in range(40):
    for j in range(4): fs.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
fs.extend([(3,2,1,0),(160,161,162,163)])
bevel(mesh('carbon_trunk_spoiler',vs,fs,carbon,smooth=True),.003)

# Low-profile rain guards on all four door windows, with the B-pillar gap.
for sign in [-1,1]:
    front=[(.726,-.685,1.005),(.656,-.548,1.102),(.624,-.393,1.195),(.624,-.036,1.279),(.608,.132,1.306),(.601,.345,1.311)]
    rear=[(.587,.445,1.332),(.593,.658,1.326),(.596,.826,1.311),(.608,.984,1.283),(.625,1.113,1.234),(.644,1.212,1.189)]
    for label,points in [('front',front),('rear',rear)]:
        vs=[]
        for x,y,z in points:
            vs.extend([(sign*(x+.014),y,z+.013),(sign*(x+.019),y,z-.012),(sign*(x+.009),y,z-.014),(sign*(x+.006),y,z+.008)])
        fs=[]
        for i in range(len(points)-1):
            for j in range(4):fs.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
        mesh('smoked_rain_guard_'+label,vs,fs,black,smooth=True)

# Lamps use the source's UV-mapped lenses. A modest emission preserves their
# shape, unlike the oversized glow cards supplied with the game model.
lampmat=material('S4_illuminated_lamp_details','ffffff',.08,.32)
texture(lampmat,'car_audi_s4_df.png')
texture(lampmat,'car_audi_s4_df.png','Emission Color')
lampmat.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.9
for obj in list(scene.objects):
    if obj.name.startswith('chassis_grid'):
        obj.data.materials.append(lampmat)
        for p in obj.data.polygons:
            if p.center.z>.55 and (p.center.y<-1.77 or p.center.y>1.93):
                p.material_index=len(obj.data.materials)-1
headlights=empty('headlights',parent=body)
taillights=empty('taillights',parent=body)
headlights['lampPositions']=[[.65,.615,-2.12],[-.65,.615,-2.12]]

# The owner requested CHOOM in place of the registration in the photos.
plate=material('S4_rear_plate','e5e5dc',.05,.54)
box('rear_plate_frame',(0,2.357,.702),(.324,.018,.166),black,radius=.012)
box('rear_plate',(0,2.369,.702),(.303,.004,.149),plate,radius=.007)
plate_ink=material('S4_plate_lettering','79202a',.02,.55)
state_ink=material('S4_plate_state','223c50',.02,.55)
def plate_text(name,text,z,size,mat):
    data=bpy.data.curves.new(name,'FONT');data.body=text;data.align_x='CENTER';data.align_y='CENTER'
    data.size=size;data.extrude=.0002;data.resolution_u=4
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.parent=body
    obj.location=(0,2.373,z);obj.rotation_euler=(math.pi/2,0,math.pi)
    data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH')
plate_text('CHOOM_plate','CHOOM',.704,.057,plate_ink)
plate_text('plate_state','Massachusetts',.759,.016,state_ink)
plate_text('plate_motto','The Spirit of America',.651,.01,state_ink)

detail_script=ROOT/'scripts/blender/hood_and_details.py'
exec(compile(detail_script.read_text(),str(detail_script),'exec'))

# Consolidate small rigid details by material and parent to keep draw calls
# modest. Preserve the wheel/steering pivots and descriptive large parts.
groups={}
for obj in list(scene.objects):
    if obj.type=='MESH' and obj.name.split('.')[0] in ['drilled_recess','tyre_tread_groove','wheel_bolt','Audi_hub_ring','R8_split_spoke','front_black_Audi_ring']:
        groups.setdefault((obj.parent,obj.data.materials[0]),[]).append(obj)
for (parent,mat),objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    for obj in objects:
        bpy.context.view_layer.objects.active=obj
        for mod in list(obj.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()

# Export the car only. Lights and the review camera belong to the .blend.
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects: obj.select_set(True)
OUTPUT.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'design/audi-s4/ali-s4-source.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_animations=False,export_image_format='AUTO')

scene.render.engine='CYCLES';scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1050
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=True
scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('S4_neutral_studio');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.16,.18,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.55
for name,loc,power,size in [('key',(1,-4,7),1150,5),('rim',(-4,2,4),1450,4),('fill',(5,3,3),850,4)]:
    d=bpy.data.lights.new('studio_'+name,'AREA');d.energy=power;d.shape='DISK';d.size=size
    o=bpy.data.objects.new('studio_'+name,d);scene.collection.objects.link(o);o.location=loc
    o.rotation_euler=(Vector((0,0,.6))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('review_camera');o=bpy.data.objects.new('review_camera',d);scene.collection.objects.link(o)
o.location=(6,-8,3.2);o.rotation_euler=(Vector((0,0,.66))-o.location).to_track_quat('-Z','Y').to_euler()
d.type='ORTHO';d.ortho_scale=6.35;scene.camera=o
for image in bpy.data.images:
    if image.filepath and image.source=='FILE' and str(SOURCE) in bpy.path.abspath(image.filepath): image.pack()
bpy.data.libraries.write(str(ROOT/'design/audi-s4/ali-s4.blend'),{scene},path_remap='RELATIVE_ALL',fake_user=True,compress=True)
scene.render.filepath=str(ROOT/'design/audi-s4/front-review.png')
bpy.ops.render.render(write_still=True)
print('S4 source exported. Run npm run car:assets to publish the optimized asset.')
