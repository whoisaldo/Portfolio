"""Photo-based details and hood rig. Executed in build_s4.py's scene context."""

# Preserve the supplied S4 letter shapes, with the owner's red S / black 4.
shell=next(o for o in scene.objects if o.name.startswith('chassis_carpaint'))
if not scene.objects.get('S4_red_S_badge'):
    adjacency={v.index:set() for v in shell.data.vertices}
    for edge in shell.data.edges:
        a,b=edge.vertices;adjacency[a].add(b);adjacency[b].add(a)
    seed=min(shell.data.vertices,key=lambda v:(v.co-Vector((.413,2.315,.721))).length).index
    ids={seed};stack=[seed]
    while stack:
        for index in adjacency[stack.pop()]:
            if index not in ids:ids.add(index);stack.append(index)
    assert len(ids)==62, 'The S4 letter topology changed; inspect before recolouring.'
    vertices=sorted(ids);mapping={old:new for new,old in enumerate(vertices)}
    faces=[tuple(mapping[i] for i in p.vertices) for p in shell.data.polygons if all(i in ids for i in p.vertices)]
    mesh('S4_red_S_badge',[shell.data.vertices[i].co[:] for i in vertices],faces,red,smooth=True)
    remove_faces(shell,lambda f:all(v.index in ids for v in f.verts))

# Refit the custom grille to the measured leading edge of the source hood.
# The upper border previously sat almost 10 cm forward of that edge.
def interpolate(u,stations):
    for (a,b),(c,d) in zip(stations,stations[1:]):
        if u<=c:return b+(d-b)*(u-a)/(c-a)
    return stations[-1][1]

def grille_top(x):
    return interpolate(abs(x),[(0,.687),(.16,.686),(.31,.678),(.33,.675),(.36,.660),(.448,.635)])

def fitted_grille_y(x,z):
    rim=interpolate(abs(x),[(0,-2.174),(.16,-2.171),(.31,-2.166),(.36,-2.17),(.448,-2.15)])
    blend=min(1,max(0,(z-.4)/(grille_top(x)-.4)))**2
    return front_y(x,z)*(1-blend)+rim*blend

for obj in scene.objects:
    if obj.name.startswith(('intake_central','honeycomb_central','intake_surround_central','front_black_Audi_ring')) and not obj.get('hoodFit'):
        for v in obj.data.vertices:
            x,y,z=v.co.copy()
            # Shape the previously flat top to the hood's curved edge.
            if z>.635:
                old_top=.694 if abs(x)<=.36 else interpolate(abs(x),[(.36,.694),(.448,.643),(.47,.562)])
                z+=(grille_top(x)-old_top)*min(1,max(0,(z-.60)/(old_top-.60)))
            v.co=(x,y+fitted_grille_y(x,z)-front_y(x,z),z)
        obj.data.update();obj['hoodFit']=True

# The source hood is connected to the body through the recessed panel seam.
# Flooding the smooth surface stops at the folded seam walls.
hinge=scene.objects.get('hood_hinge')
if not hinge:
    bm=bmesh.new();bm.from_mesh(shell.data);bm.normal_update()
    seed=min((f for f in bm.faces if f.material_index==1),key=lambda f:(f.calc_center_median()-Vector((0,-1.6,.885))).length)
    selected={seed};stack=[seed]
    while stack:
        face=stack.pop()
        for edge in face.edges:
            for other in edge.link_faces:
                if other not in selected and other.material_index==1 and other.normal.angle(face.normal)<math.radians(25):
                    selected.add(other);stack.append(other)
    selected_ids={f.index for f in selected}
    points=[v.co for f in selected for v in f.verts]
    assert 500<len(selected)<700 and max(v.y for v in points)<-.8, 'Hood selection crossed a body seam.'
    bm.free()
    hinge=empty('hood_hinge',(0,-.855,.924),body)
    hinge['openAngle']=-1.10
    hood=bpy.data.objects.new('opening_hood',shell.data.copy());scene.collection.objects.link(hood)
    hood.parent=hinge
    remove_faces(hood,lambda f:f.index not in selected_ids)
    remove_faces(shell,lambda f:f.index in selected_ids)
    for vertex in hood.data.vertices:vertex.co-=hinge.location
    hood.data.update()
    # The acoustic liner sits inside the perimeter of the painted shell.
    insulation=material('S4_hood_acoustic_liner','191b1d',0,.98)
    liner=bpy.data.objects.new('hood_acoustic_liner',hood.data.copy());scene.collection.objects.link(liner);liner.parent=hinge
    liner.data.materials.clear();liner.data.materials.append(insulation)
    for vertex in liner.data.vertices:
        vertex.co.x*=.89;vertex.co.y=(vertex.co.y+.58)*.87-.58;vertex.co.z-=.018
    for polygon in liner.data.polygons:polygon.material_index=0
    bm=bmesh.new();bm.from_mesh(liner.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(liner.data);bm.free()

old_engine=scene.objects.get('engine_bay')
if old_engine:
    for obj in list(old_engine.children_recursive)+[old_engine]:bpy.data.objects.remove(obj,do_unlink=True)
for obj in list(scene.objects):
    if obj.name.startswith('hood_strut_'):bpy.data.objects.remove(obj,do_unlink=True)
engine=empty('engine_bay',parent=body)
engine_plastic=material('S4_engine_textured_plastic','25282a',.05,.72)
engine_metal=material('S4_cast_supercharger_housing','82857f',.60,.57)
coolant=material('S4_coolant_reservoir','777c6e',0,.63)
blue=material('S4_reservoir_cap_blue','28628b',.03,.5)

def deck(name,outline,height,depth,mat,parent=engine):
    zfunc=height if callable(height) else lambda x,y:height
    vertices=[(x,y,zfunc(x,y)+d) for d in [0,-depth] for x,y in outline]
    n=len(outline)
    # Outline is counterclockwise viewed from above.
    faces=[tuple(range(n)),tuple(reversed(range(n,n*2)))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return bevel(mesh(name,vertices,faces,mat,parent),.009,3)

def cylinder(name,location,radius,depth,mat,parent=engine,segments=32):
    vertices=[(radius*math.cos(i*2*math.pi/segments),radius*math.sin(i*2*math.pi/segments),z) for z in [0,depth] for i in range(segments)]
    faces=[tuple(reversed(range(segments))),tuple(range(segments,2*segments))]
    faces.extend((i,(i+1)%segments,(i+1)%segments+segments,i+segments) for i in range(segments))
    obj=mesh(name,vertices,faces,mat,parent,smooth=True);obj.location=location
    return obj

def engine_text(name,word,location,size,mat,rotation=(0,0,0)):
    curve=bpy.data.curves.new(name,'FONT');curve.body=word;curve.align_x='CENTER';curve.align_y='CENTER';curve.size=size;curve.extrude=.0002;curve.resolution_u=4
    obj=bpy.data.objects.new(name,curve);scene.collection.objects.link(obj);obj.parent=engine;obj.location=location;obj.rotation_euler=rotation;curve.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
    return obj

def smooth_path(points):
    points=[Vector(p) for p in points];result=[]
    for i in range(len(points)-1):
        a,b,c,d=points[max(0,i-1)],points[i],points[i+1],points[min(len(points)-1,i+2)]
        for j in range(8):
            t=j/8
            result.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    return result+[points[-1]]

# Inner wings and the radiator support enclose the bay below the real panel edge.
box('engine_bay_floor',(0,-1.51,.385),(1.35,1.13,.06),cavity,engine,.03)
box('engine_bulkhead',(0,-.985,.66),(1.32,.055,.43),engine_plastic,engine,.025)
for sign in [-1,1]:
    outline=[(.63,-2.005),(.73,-2.005),(.73,-.955),(.63,-.955)]
    if sign<0:outline=[(-x,y) for x,y in reversed(outline)]
    deck('inner_wing',outline,lambda x,y:.80+.22*(y+1.13),.30,paint)
    tube('wing_seal',[(sign*.64,-2.025,.648),(sign*.72,-1.72,.76),(sign*.73,-1.27,.846),(sign*.70,-.96,.877)],.013,rubber,engine)
    deck('strut_tower',[(sign*.46,-1.30),(sign*.72,-1.30),(sign*.72,-1.03),(sign*.46,-1.03)] if sign==1 else [(sign*.46,-1.03),(sign*.72,-1.03),(sign*.72,-1.30),(sign*.46,-1.30)],.771,.17,paint)
    cylinder('strut_top',(sign*.592,-1.15,.774),.09,.029,engine_plastic)
    cylinder('strut_top_nut',(sign*.592,-1.15,.804),.031,.01,black)
    for a in [0,2.094,4.189]:cylinder('tower_fastener',(sign*.592+.071*math.cos(a),-1.15+.071*math.sin(a),.799),.008,.008,metal,segments=8)
box('radiator',(0,-2.055,.44),(1.19,.075,.36),engine_plastic,engine,.012)
for i in range(15):box('radiator_fin',(0,-2.098,.285+i*.021),(1.13,.008,.003),metal,engine,.001)
box('radiator_upper_crossmember',(0,-2.038,.633),(1.28,.105,.045),engine_plastic,engine,.013)
for x in [-.56,-.40,0,.40,.56]:
    box('radiator_support_tab',(x,-2.04,.66),(.073,.09,.015),engine_plastic,engine,.004)
    cylinder('radiator_support_bolt',(x,-2.04,.671),.006,.004,metal,segments=8)

# The supercharged V6 cover: exposed cast sides, black centre and front cap.
box('V6_engine_block',(0,-1.51,.51),(.56,.68,.25),engine_metal,engine,.045)
height=lambda x,y:.765+.12*(y+1.5)
outline=[(-.23,-1.88),(.23,-1.88),(.31,-1.73),(.30,-1.36),(.17,-1.27),(.16,-1.10),(-.16,-1.10),(-.17,-1.27),(-.30,-1.36),(-.31,-1.73)]
deck('V6_supercharger_housing',outline,height,.10,engine_metal)
deck('V6_centre_cover',[(-.11,-1.78),(.11,-1.78),(.14,-1.48),(.12,-1.28),(.16,-1.25),(.15,-1.10),(-.15,-1.10),(-.16,-1.25),(-.12,-1.28),(-.14,-1.48)],lambda x,y:height(x,y)+.012,.024,engine_plastic)
deck('V6_front_cover',[(-.245,-1.93),(.245,-1.93),(.29,-1.79),(.23,-1.70),(-.23,-1.70),(-.29,-1.79)],lambda x,y:height(x,y)+.015,.09,engine_plastic)
for sign in [-1,1]:
    for y in [-1.42,-1.52,-1.62]:
        tube('supercharger_cast_rib',[(sign*.14,y,height(0,y)+.007),(sign*.27,y-.025,height(0,y-.025)+.007)],.006,engine_metal,engine,sides=6)
    for y in [-1.40,-1.59,-1.77]:
        box('APR_red_ignition_coil',(sign*.313,y,.65),(.044,.075,.06),red,engine,.011)
        tube('coil_wiring',[(sign*.335,y,.65),(sign*.371,y+.055,.62),(sign*.365,-1.17,.61)],.007,engine_plastic,engine,sides=6)
for x in [-.059,-.0197,.0197,.059]:
    tube('engine_Audi_ring',[(x+.027*math.cos(i*math.pi/20),-1.196+.021*math.sin(i*math.pi/20),height(0,-1.196+.021*math.sin(i*math.pi/20))+.02) for i in range(40)],.0028,chrome,engine,True,6)
engine_text('V6_TFSI_lettering','V6 TFSI',(0,-1.816,height(0,-1.816)+.023),.043,chrome,(math.atan(.12),0,0))

# APR carbon intake, photographed on the passenger side of the engine bay.
airbox=[(-.70,-2.01),(-.27,-2.01),(-.27,-1.84),(-.37,-1.61),(-.65,-1.63),(-.73,-1.85)]
deck('APR_carbon_airbox',airbox,lambda x,y:.694+.035*(y+1.85),.115,carbon)
pipe=[(-.42,-1.78,.62),(-.40,-1.64,.709),(-.44,-1.49,.763),(-.40,-1.33,.792),(-.27,-1.21,.795),(-.15,-1.19,.784)]
tube('APR_carbon_intake_pipe',smooth_path(pipe),.052,carbon,engine,sides=24)
for x,y,z in [pipe[1],pipe[-1]]:
    tube('intake_clamp',[(x+.053*math.cos(i*math.pi/20),y,z+.053*math.sin(i*math.pi/20)) for i in range(40)],.004,metal,engine,True,6)
box('APR_intake_badge',(-.448,-1.957,.700),(.10,.040,.002),black,engine,.003)
engine_text('APR_intake_lettering','APR',(-.454,-1.955,.703),.03,chrome)
box('APR_badge_red_mark',(-.407,-1.956,.704),(.006,.028,.002),red,engine,.001)
for x,y in [(-.67,-1.98),(-.31,-1.99),(-.40,-1.65),(-.67,-1.68)]:cylinder('airbox_fastener',(x,y,.701),.006,.003,black,segments=8)

# Coolant reservoir and blue filler caps, hoses, hard lines and harnesses.
box('coolant_expansion_tank',(.48,-1.40,.698),(.24,.275,.16),coolant,engine,.05)
cylinder('coolant_blue_cap',(.475,-1.43,.781),.044,.025,blue)
box('coolant_cap_grip',(.475,-1.43,.814),(.058,.013,.012),blue,engine,.004)
cylinder('washer_filler_neck',(.65,-.99,.828),.038,.039,engine_plastic)
cylinder('washer_blue_cap',(.65,-.99,.867),.036,.014,blue)
box('ABS_module',(.61,-1.68,.63),(.13,.16,.14),engine_metal,engine,.012)
for i in range(5):
    x=.558+i*.018
    tube('ABS_brake_line',[(x,-1.63,.71),(x,-1.61,.77),(x,-1.40,.78),(.66,-1.28-i*.018,.76)],.0035,metal,engine,sides=6)
tube('coolant_upper_hose',[(.52,-1.49,.78),(.43,-1.55,.74),(.42,-1.8,.59),(.26,-1.96,.58)],.018,rubber,engine,sides=12)
tube('radiator_hose',[(.45,-2.02,.58),(.47,-1.89,.55),(.35,-1.85,.52),(.24,-1.86,.51)],.028,rubber,engine,sides=12)
tube('vacuum_hose',[(-.28,-1.34,.66),(-.35,-1.17,.65),(-.17,-1.05,.70),(.32,-1.05,.73)],.011,rubber,engine,sides=8)
tube('AC_hard_line',[(.33,-1.10,.78),(.42,-1.04,.85),(.56,-1.05,.87),(.65,-1.40,.81)],.009,metal,engine,sides=8)
for sign in [-1,1]:tube('bay_wire_harness',[(sign*.60,-1.04,.74),(sign*.68,-1.39,.69),(sign*.65,-1.89,.56),(sign*.52,-2.02,.57)],.013,engine_plastic,engine,sides=8)

# The gas strut has two telescoping meshes. JS updates their endpoints as the
# hood rotates, so the strut remains attached in every intermediate position.
empty('hood_strut_base',(.59,-1.03,.76),body)
empty('hood_strut_mount',Vector((.59,-1.58,.82))-hinge.location,hinge)
for name,r in [('hood_strut_tube',.011),('hood_strut_rod',.0055)]:
    obj=empty(name,parent=body)
    cylinder(name+'_mesh',(0,0,0),r,1,black if name.endswith('tube') else chrome,obj,20)
    delta=Vector((0,-.55,.06));obj.location=(.59,-1.03,.76)
    obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler();obj.scale.z=delta.length*(.58 if name.endswith('tube') else .55)
    if name.endswith('rod'):obj.location+=delta*.45

# Batch static engine details by material; preserve the descriptive primary
# components and all movable hood parts.
groups={}
for obj in list(scene.objects):
    if obj.parent==engine and obj.type=='MESH' and not obj.name.startswith(('APR_carbon','V6_supercharger','V6_centre','V6_front','V6_TFSI')):
        groups.setdefault(obj.data.materials[0],[]).append(obj)
for objects in groups.values():
    if len(objects)<2:continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True);bpy.context.view_layer.objects.active=obj
        for mod in list(obj.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()

engine_carbon=carbon.copy();engine_carbon.name='S4_engine_carbon'
bsdf=engine_carbon.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Metallic'].default_value=.12;bsdf.inputs['Roughness'].default_value=.46;bsdf.inputs['Coat Weight'].default_value=.3
for obj in engine.children:
    if obj.type=='MESH':
        if obj.name.startswith(('V6_front_cover','V6_supercharger_housing')):
            obj.modifiers[0].width=.025
        for slot in obj.material_slots:
            if slot.material==carbon:slot.material=engine_carbon

# The hood's leading corners sweep back above the lamps. Keep the intake,
# inner wings and crossmember behind that curved boundary when it closes.
bpy.context.view_layer.update()
for obj in engine.children:
    if obj.type!='MESH':continue
    local=obj.matrix_local.copy();inverse=local.inverted()
    for vertex in obj.data.vertices:
        point=local@vertex.co
        if point.y< -1.72:
            factor=1-.45*min(1,max(0,(abs(point.x)-.4)/.33))
            point.y=-1.72+(point.y+1.72)*factor
            vertex.co=inverse@point
    obj.data.update()
