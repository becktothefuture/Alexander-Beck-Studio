"""Author the fresh editable About world. Run with Blender --factory-startup."""
import argparse
import json
import math
import runpy
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

TAU = 2 * math.pi
RADIUS, SPACING, LENGTH = .075, .23, 360.0
BEATS = [("departure", 0, .04, "title"), ("background", .04, .16, "prose"),
         ("curiosity", .16, .20, "title"), ("tunnel-a", .20, .40, "travel"),
         ("release", .40, .44, "title"), ("disciplines", .44, .59, "prose"),
         ("statements", .59, .64, "title"), ("method", .64, .72, "prose"),
         ("tunnel-b", .72, .90, "travel"), ("approach", .90, .97, "travel"),
         ("ending", .97, 1, "ending")]


def args():
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True)
    p.add_argument("--materials", required=True)
    return p.parse_args(sys.argv[sys.argv.index("--") + 1:])


def smooth(t):
    return t * t * (3 - 2 * t)


KNOTS = [(0, 90, 0, 0), (.04, 120, 0, 0), (.16, 210, 0, 0), (.20, 300, 0, 0),
         (.23, 290, -14, 12), (.26, 250, -21, 20), (.30, 210, -4, 16),
         (.34, 265, 20, -18), (.37, 325, 12, -9), (.40, 360, 0, 0),
         (.44, 344, 0, 0), (.59, 296, 0, 0), (.64, 280, 0, 0),
         (.72, 220, 0, 0), (.745, 100, 0, 12), (.775, 140, 20, -20),
         (.815, 180, 27, -22), (.845, 220, 6, -30), (.865, 170, -23, 24),
         (.89, 175, -12, 12), (.90, 180, 0, 0), (1, 180, 0, 0)]


def angles(p):
    for a, b in zip(KNOTS, KNOTS[1:]):
        if p <= b[0]:
            t = smooth(max(0, (p - a[0]) / (b[0] - a[0])))
            return [math.radians(a[i] + t * (b[i] - a[i])) for i in (1, 2, 3)]


def direction(p):
    yaw, pitch, _ = angles(p)
    return Vector((math.cos(yaw) * math.cos(pitch), math.sin(yaw) * math.cos(pitch), math.sin(pitch)))


def collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def mesh_object(name, vertices, faces, col):
    m = bpy.data.meshes.new(name)
    m.from_pydata(vertices, [], faces)
    m.update()
    o = bpy.data.objects.new(name, m)
    col.objects.link(o)
    return o


def property_driver(owner, path, expression, targets, index=None):
    f = owner.driver_add(path) if index is None else owner.driver_add(path, index)
    d = f.driver
    d.type = "SCRIPTED"
    for name, target, data_path in targets:
        v = d.variables.new()
        v.name = name
        v.type = "SINGLE_PROP"
        v.targets[0].id = target
        v.targets[0].data_path = data_path
    d.expression = expression


def main():
    a = args()
    dest = Path(a.source).resolve()
    if dest.exists():
        raise RuntimeError(f"Refusing to replace saved source: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for c in list(bpy.data.collections):
        if not c.objects:
            bpy.data.collections.remove(c)
    cols = {n: collection(n) for n in ("Controls", "Flight", "ReadingZones", "TunnelA", "Gallery", "TunnelB", "FinalGrid", "PreviewGuides")}
    scene = bpy.context.scene
    scene["about_schema"] = "about-rollercoaster-world/v1"
    scene["beats"] = json.dumps([dict(id=i, start=s, end=e, kind=k, scrollScreens=(e-s)*32) for i,s,e,k in BEATS])
    scene.render.fps = 30
    scene.frame_start, scene.frame_end = 1, 5401
    controls = bpy.data.objects.new("About World Controls", None)
    cols["Controls"].objects.link(controls)
    controls["progress"] = 0.0
    controls["ambientSeconds"] = 0.0
    controls["referenceMode"] = 0.0
    controls["referenceSeconds"] = 180.0
    controls["circleRadius"] = RADIUS
    controls["circleSpacing"] = SPACING
    controls["fogNear"], controls["fogFar"] = 20.0, 100.0
    controls["arrivalHoldStart"] = .97
    controls["previewTheme"] = 0.0
    controls["sampledSpacing"] = SPACING
    definitions = []
    for key, label, unit, lo, hi, binding in [
        ("progress", "Journey progress", "fraction", 0, 1, "camera"),
        ("ambientSeconds", "Ambient clock", "seconds", -3600, 3600, "motionGroups"),
        ("referenceMode", "Reference playback", "boolean", 0, 1, "preview"),
        ("referenceSeconds", "Reference duration", "seconds", 30, 600, "referenceSeconds"),
        ("circleRadius", "Shared circle radius", "WU", .01, .2, "circleField.radius"),
        ("circleSpacing", "Shared circle spacing", "WU", .1, .5, "circleField.spacing"),
        ("fogNear", "Fog begins", "WU", 0, 100, "fog.near"),
        ("fogFar", "Fog completes", "WU", 20, 250, "fog.far")]:
        controls.id_properties_ui(key).update(min=lo, max=hi, description=label)
        definitions.append(dict(key=key, label=label, unit=unit, baseline=controls[key], range=[lo,hi], binding=binding))
    scene["controlDefinitions"] = json.dumps(definitions)
    # Polyline points are uniformly spaced. Editing any point updates the live constraint.
    count = 3601
    positions = [Vector((0, 0, 0))]
    for i in range(1, count):
        positions.append(positions[-1] + direction((i-.5)/(count-1)*.97) * (LENGTH/(count-1)))
    raildata = bpy.data.curves.new("FlightRail", "CURVE")
    raildata.dimensions = "3D"
    raildata.twist_mode = "Z_UP"
    raildata.path_duration = 5400
    spline = raildata.splines.new("POLY")
    spline.points.add(count-1)
    for i, pt in enumerate(spline.points):
        pt.co = (*positions[i], 1)
        pt.tilt = angles(i/(count-1)*.97)[2]
    rail = bpy.data.objects.new("FlightRail", raildata)
    cols["Flight"].objects.link(rail)
    rail["edit_note"] = "Live camera source. Edit these control points and tilt; the camera constraint evaluates this curve."
    camdata = bpy.data.cameras.new("FlightCamera")
    camdata.type = "PERSP"
    camdata.sensor_fit = "HORIZONTAL"
    camdata.sensor_width = 36
    camdata.lens = 36/(2*math.tan(math.radians(35)))
    camdata.clip_start, camdata.clip_end = .03, 500
    camera = bpy.data.objects.new("FlightCamera", camdata)
    cols["Flight"].objects.link(camera)
    scene.camera = camera
    follow = camera.constraints.new("FOLLOW_PATH")
    follow.name = "LIVE FlightRail position, tangent and bank"
    follow.target = rail
    follow.use_fixed_location = True
    follow.use_curve_follow = True
    follow.forward_axis, follow.up_axis = "TRACK_NEGATIVE_Z", "UP_Y"
    property_driver(follow, "offset_factor", "min(1,max(0,(p+r*(frame-1)/(30*d))/h))", [
        ("p", controls, '["progress"]'), ("r", controls, '["referenceMode"]'),
        ("d", controls, '["referenceSeconds"]'), ("h", controls, '["arrivalHoldStart"]')])

    def frame_at(p):
        f = min(1, max(0, p/.97)) * (count-1)
        i = min(count-2, int(f))
        center = positions[i].lerp(positions[i+1], f-i)
        forward = direction(min(.97,p))
        right = forward.cross(Vector((0,0,1))).normalized()
        up = right.cross(forward).normalized()
        return center, forward, right, up

    # A physical union of the reading sight volumes shapes whole gallery sections.
    # Geometry never switches visibility; these broad, curved rooms remain present.
    reading_poses=[frame_at(float(p)) for s,e in ((0,.16),(.44,.59),(.64,.72)) for p in np.linspace(s,e,101)]
    read_centers=np.array([list(v[0]) for v in reading_poses])
    read_forward=np.array([list(v[1]) for v in reading_poses])
    read_right=np.array([list(v[2]) for v in reading_poses])

    def side_bay_offset(c,r,side,padding=0):
        for distance in np.arange(7.,100.,.25):
            point=np.array(c)+np.array(r)*side*distance
            delta=point-read_centers
            z=np.sum(delta*read_forward,axis=1)
            x=np.abs(np.sum(delta*read_right,axis=1))
            if not np.any((z>-padding)&(z<102+padding)&(x<.56*np.maximum(z,0)+padding+.4)):
                return float(distance)
        return None

    groups = [dict(id=0, kind="static")]
    group_objects = {}
    point_sets = {}
    occupied = {}
    min_spacing = SPACING * .9998

    def accept(pt):
        key = tuple(math.floor(v/SPACING) for v in pt)
        for dx in (-1,0,1):
            for dy in (-1,0,1):
                for dz in (-1,0,1):
                    for q in occupied.get((key[0]+dx,key[1]+dy,key[2]+dz), ()):
                        if (q-pt).length < min_spacing:
                            return False
        occupied.setdefault(key, []).append(pt.copy())
        return True

    def points(name, candidates, col, group=0, complete_lattice=False):
        accepted = [(Vector(p), int(role)) for p,role in candidates if complete_lattice or accept(Vector(p))]
        for role in range(6):
            verts = [p for p,r in accepted if r == role]
            if not verts:
                continue
            pivot = Vector(groups[group].get("pivot", (0,0,0)))
            o = mesh_object(f"{name} · role {role}", [p-pivot for p in verts], [], col)
            o["about_points"] = True
            o["palette_index"] = role
            o["motion_group"] = group
            o["rest_pivot"] = list(pivot)
            o["source_edit_note"] = "Editable authoritative circle centres. Object transforms and vertex edits export."
            if group in group_objects:
                o.parent = group_objects[group]
            point_sets[o.name] = o
        print(f"POINTS {name}: {len(accepted)}", flush=True)

    def rotation_group(name, axis, pivot, amplitude, period, phase, col, continuous=False):
        gid = len(groups)
        g = dict(id=gid, kind="rotate", axis=list(axis), pivot=list(pivot), amplitude=amplitude, period=period, phase=phase, continuous=continuous)
        groups.append(g)
        o = bpy.data.objects.new(name, None)
        col.objects.link(o)
        o.location = pivot
        o.rotation_mode = "QUATERNION"
        for key in ("amplitude", "period", "phase"):
            o[key] = g[key]
        o["motion_group"] = gid
        o["motion_definition"] = json.dumps(g)
        phase_expr = "(6.283185307179586*(t+r*(frame-1)/30)/p+f)"
        angle = phase_expr if continuous else "a*sin("+phase_expr+")"
        targets = [("t",controls,'["ambientSeconds"]'),("r",controls,'["referenceMode"]'),("p",o,'["period"]'),("f",o,'["phase"]'),("a",o,'["amplitude"]')]
        for index in range(4):
            expression = f"cos(({angle})/2)" if index == 0 else f"{axis[index-1]}*sin(({angle})/2)"
            property_driver(o, "rotation_quaternion", expression, targets, index)
        group_objects[gid] = o
        return gid

    def radial_shape(theta, sides, twist=0):
        if sides == 0:
            return 1
        return 1/math.cos(((theta-twist+math.pi/sides)%(TAU/sides))-math.pi/sides)

    def tunnel(name, p0, p1, col, kind):
        length = (p1-p0)/.97*LENGTH
        rings = math.ceil(length/SPACING)
        surface = []
        proxy_v, proxy_f = [], []
        for j in range(rings+1):
            t=j/rings
            p=p0+(p1-p0)*t
            c,f,r,u=frame_at(p)
            radius=2.65 if kind == "round" else 2.55
            sides=0 if kind == "round" and t<.5 else (6 if kind == "round" else 4)
            twist=(.2*math.sin(t*TAU) if kind=="round" else math.pi/4*math.sin(t*math.pi)**2)
            perimeter=TAU*radius if sides == 0 else 2*sides*radius*math.tan(math.pi/sides)
            n=math.ceil(perimeter/SPACING)
            for k in range(n):
                theta=TAU*k/n
                rr=radius*radial_shape(theta,sides,twist)
                surface.append((c+(r*math.cos(theta)+u*math.sin(theta))*rr, (int(theta/TAU*12)+int(t*7))%6))
            if j%4 == 0 or j == rings:
                row=len(proxy_v)//48
                for k in range(48):
                    theta=TAU*k/48
                    rr=radius*radial_shape(theta,sides,twist)
                    proxy_v.append(c+(r*math.cos(theta)+u*math.sin(theta))*rr)
                if row:
                    proxy_f.extend([(48*(row-1)+k,48*(row-1)+(k+1)%48,48*row+(k+1)%48,48*row+k) for k in range(48)])
        proxy=mesh_object(name+" · editable enclosing surface",proxy_v,proxy_f,col)
        proxy["preview_guide_only"] = True
        proxy["edit_note"] = "Solid enclosure inspection guide. Editable circle-centre meshes are the exported geometry."
        proxy.hide_render=True
        proxy.hide_set(True)
        points(name+" continuous enclosure",surface,col)
        events = [.08,.31,.56,.81]
        for event,t in enumerate(events):
            c,f,r,u=frame_at(p0+(p1-p0)*t)
            gid=rotation_group(f"{name} rotating threshold {event+1}",f,c,.16 if kind=="round" else .22,14+event*3,event*.7,col)
            ring=[]
            sides=6 if kind=="round" else 4
            for depth in (-.23,0,.23):
                for k in range(100):
                    theta=TAU*k/100
                    rr=2.35*radial_shape(theta,sides,0)
                    ring.append((c+f*depth+(r*math.cos(theta)+u*math.sin(theta))*rr, (event+k//17)%6))
            points(f"{name} threshold {event+1}",ring,col,gid)

    # The reading rooms are physical side galleries with an unobstructed central volume.
    def gallery(name,p0,p1,col):
        surface=[]
        span=(p1-p0)/.97*LENGTH
        ns=math.ceil(span/SPACING)
        for j in range(ns+1):
            p=p0+(p1-p0)*j/ns
            c,f,r,u=frame_at(p)
            for side in (-1,1):
                distance=side_bay_offset(c,r,side)
                if distance is None:continue
                for k in range(48):
                    z=-5.5+k*SPACING
                    x=side*distance
                    surface.append((c+r*x+u*z, (j//18+k//10+(0 if side<0 else 2))%6))
                for k in range(18):
                    x=side*(distance+k*SPACING)
                    surface.append((c+r*x+u*7.8, (j//20+k//12+3)%6))
                    surface.append((c+r*x-u*7.8, (j//20+k//12)%6))
        points(name+" side architecture",surface,col)
        for index,p in enumerate((p0+(p1-p0)*.25,p0+(p1-p0)*.65)):
            c,f,r,u=frame_at(p)
            for side in (-1,1):
                distance=side_bay_offset(c,r,side,4)
                if distance is None:continue
                pivot=c+r*(side*distance)+u*4
                gid=rotation_group(f"{name} suspended rib {index}-{side}",f,pivot,.12,18+index*5,index+side*.4,col)
                ring=[]
                for k in range(130):
                    theta=TAU*k/130
                    for depth in (-.23,0,.23):
                        ring.append((pivot+(r*math.cos(theta)+u*math.sin(theta))*3.1+f*depth,(k//22+index)%6))
                points(f"{name} moving rib {index}-{side}",ring,col,gid)

    gallery("Departure gallery",0,.20,cols["ReadingZones"])
    tunnel("Tunnel A",.20,.40,cols["TunnelA"],"round")
    gallery("Canopy gallery",.40,.64,cols["Gallery"])
    gallery("Method gallery",.64,.72,cols["ReadingZones"])
    tunnel("Tunnel B",.745,.90,cols["TunnelB"],"diamond")
    # Low parallel edges establish optic flow on the final straight without obscuring the wall.
    surface=[]
    for j in range(115):
        c,f,r,u=frame_at(.90+.07*j/114)
        for side in (-1,1):
            for k in range(12):
                surface.append((c+r*(side*(6+k*SPACING))-u*3.5,(j//18+k//4)%6))
    points("Final approach edges",surface,cols["FinalGrid"])
    stop,f,r,u=frame_at(.97)
    origin=stop+f*12
    gid=len(groups)
    wave=dict(id=gid,kind="wave",axis=list(-f),uAxis=list(r),vAxis=list(u),origin=list(origin),amplitude=1.2,period=14.,wavelength=11.,phase=0.,quietRadius=5.,quietFeather=8.)
    groups.append(wave)
    nx,ny=210,184
    grid=[]
    for y in range(ny):
        for x in range(nx):
            px=(x-(nx-1)/2)*SPACING
            py=(y-(ny-1)/2)*SPACING
            role=(x//26+y//25)%6
            grid.append((origin+r*px+u*py,role))
    points("Final full colour grid",grid,cols["FinalGrid"],gid,complete_lattice=True)
    scene["motionGroups"] = json.dumps(groups)
    scene["regions"] = json.dumps([
        dict(id="gallery-a",start=0,end=.20,clearWidth=16,events=["departure", "suspended ribs", "curved threshold"]),
        dict(id="tunnel-a",start=.20,end=.40,clearWidth=5.3,events=["descending spiral", "banked hexagon", "low turn", "ascending exit"]),
        dict(id="gallery-b",start=.40,end=.64,clearWidth=16,events=["release", "canopy ribs", "statement chamber"]),
        dict(id="gallery-c",start=.64,end=.72,clearWidth=16,events=["method chamber", "square threshold"]),
        dict(id="tunnel-b",start=.72,end=.90,enclosureStart=.745,enclosureEnd=.90,clearWidth=5.1,events=["side entrance", "climb", "square to diamond", "banked crest", "opposing turn", "release"]),
        dict(id="finale",start=.90,end=1,clearWidth=12,events=["straight approach", "full colour grid", "hold"])])
    scene["finalGrid"] = json.dumps(dict(width=(nx-1)*SPACING,height=(ny-1)*SPACING,origin=list(origin),normal=list(-f),uAxis=list(r),vAxis=list(u),stoppingDistance=12,columns=nx,rows=ny,motionGroup=gid,restShape="single-plane-complete-grid"))
    scene["referenceSeconds"] = 180.0
    scene["readingProtection"] = json.dumps(dict(method="Whole physical side-bay sections outside the union of reading and opening-support sight volumes",progressRanges=[[0,.16],[.44,.59],[.64,.72]],posesPerRange=101,horizontalHalfWidthPerDepth=.56,marginWU=.4,maximumDepthWU=102,animatedRibPaddingWU=4))
    scene["materialReference"] = Path(a.materials,"material-reference.json").read_text()
    create_preview(point_sets, groups, controls, camera, Path(a.materials), cols["PreviewGuides"])
    # Fresh builds use the same bounded geometry refinement as saved-source edits.
    runpy.run_path(str(Path(__file__).with_name("open-gates.py")))["refine_scene"](scene)
    scene.render.engine="CYCLES"
    scene.cycles.samples=8
    scene.cycles.use_denoising=True
    scene.render.resolution_x,scene.render.resolution_y=960,600
    scene.render.resolution_percentage=100
    scene.world.color=(.008,.008,.008)
    scene.world.use_nodes=True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value=(.008,.008,.008,1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value=1
    scene.view_settings.view_transform="Standard"
    scene.render.image_settings.file_format="PNG"
    scene["preview_note"]="Point geometry uses packed Home atlas. Solid enclosure proxies are hidden by default. Camera is driven live by FlightRail."
    bpy.context.view_layer.objects.active=controls
    controls.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(dest))
    print("SAVED_SOURCE "+str(dest),flush=True)


def create_preview(point_sets, groups, controls, camera, material_dir, guide_col):
    images={}
    for theme in ("dark","light"):
        images[theme]=bpy.data.images.load(str(material_dir/f"about-reset-home-atlas-{theme}.png"),check_existing=True)
        images[theme].use_fake_user=True
        images[theme].pack()
    materials=[]
    for role in range(6):
        mat=bpy.data.materials.new(f"Home gradient role {role}")
        mat.use_nodes=True
        mat.surface_render_method="DITHERED"
        n=mat.node_tree.nodes; l=mat.node_tree.links
        n.clear()
        out=n.new("ShaderNodeOutputMaterial")
        emit=n.new("ShaderNodeEmission")
        trans=n.new("ShaderNodeBsdfTransparent")
        mix=n.new("ShaderNodeMixShader")
        tex=n.new("ShaderNodeTexImage"); tex.image=images["dark"]; tex.interpolation="Linear";tex.extension="CLIP"
        light=n.new("ShaderNodeTexImage");light.image=images["light"];light.interpolation="Linear";light.extension="CLIP"
        uv=n.new("ShaderNodeTexCoord")
        scale=n.new("ShaderNodeVectorMath");scale.operation="MULTIPLY";scale.inputs[1].default_value=(24/156,24/26,1)
        offset=n.new("ShaderNodeVectorMath");offset.operation="ADD";offset.inputs[1].default_value=((role*26+1)/156,1/26,0)
        l.new(uv.outputs["UV"],scale.inputs[0]);l.new(scale.outputs[0],offset.inputs[0]);l.new(offset.outputs[0],tex.inputs[0])
        l.new(offset.outputs[0],light.inputs[0])
        theme=n.new("ShaderNodeMixRGB");theme.blend_type="MIX"
        property_driver(theme.inputs[0],"default_value","theme",[("theme",controls,'["previewTheme"]')])
        l.new(tex.outputs["Color"],theme.inputs[1]);l.new(light.outputs["Color"],theme.inputs[2])
        camdepth=n.new("ShaderNodeCameraData")
        fog=n.new("ShaderNodeMapRange");fog.interpolation_type="SMOOTHSTEP";fog.clamp=True
        property_driver(fog.inputs["From Min"],"default_value","near",[("near",controls,'["fogNear"]')])
        property_driver(fog.inputs["From Max"],"default_value","far",[("far",controls,'["fogFar"]')])
        fog.inputs["To Min"].default_value=0;fog.inputs["To Max"].default_value=1
        l.new(camdepth.outputs["View Z Depth"],fog.inputs["Value"])
        fogmix=n.new("ShaderNodeMixRGB");fogmix.blend_type="MIX"
        for index in range(3):property_driver(fogmix.inputs[2],"default_value","0.008+theme*0.902",[("theme",controls,'["previewTheme"]')],index)
        l.new(fog.outputs["Result"],fogmix.inputs[0]);l.new(theme.outputs[0],fogmix.inputs[1]);l.new(fogmix.outputs[0],emit.inputs[0])
        l.new(tex.outputs["Alpha"],mix.inputs[0]);l.new(trans.outputs[0],mix.inputs[1]);l.new(emit.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],out.inputs[0])
        materials.append(mat)
    prototypes=[]
    for role in range(6):
        o=mesh_object(f"Home billboard prototype {role}",[(-1,-1,0),(1,-1,0),(1,1,0),(-1,1,0)],[(0,1,2,3)],guide_col)
        uv=o.data.uv_layers.new(name="UVMap")
        for i,xy in enumerate(((0,0),(1,0),(1,1),(0,1))): uv.data[i].uv=xy
        o.data.materials.append(materials[role])
        o.hide_render=True;o.hide_set(True)
        prototypes.append(o)
    for o in point_sets.values():
        group=groups[o["motion_group"]]
        tree=bpy.data.node_groups.new(o.name+" · actual Home billboards","GeometryNodeTree")
        tree.interface.new_socket(name="Geometry",in_out="INPUT",socket_type="NodeSocketGeometry")
        tree.interface.new_socket(name="Geometry",in_out="OUTPUT",socket_type="NodeSocketGeometry")
        n=tree.nodes;l=tree.links
        inp=n.new("NodeGroupInput");out=n.new("NodeGroupOutput")
        geo=inp.outputs["Geometry"]
        if group["kind"]=="wave": geo=wave_nodes(tree,geo,group,controls)
        inst=n.new("GeometryNodeInstanceOnPoints")
        proto=n.new("GeometryNodeObjectInfo");proto.inputs["Object"].default_value=prototypes[o["palette_index"]]
        proto.transform_space="ORIGINAL"
        l.new(proto.outputs["Geometry"],inst.inputs["Instance"])
        ci=n.new("GeometryNodeObjectInfo");ci.inputs["Object"].default_value=camera;ci.transform_space="RELATIVE"
        l.new(ci.outputs["Rotation"],inst.inputs["Rotation"])
        inst.inputs["Scale"].default_value=(RADIUS,)*3
        for index in range(3): property_driver(inst.inputs["Scale"],"default_value","r",[("r",controls,'["circleRadius"]')],index)
        l.new(geo,inst.inputs["Points"]);l.new(inst.outputs["Instances"],out.inputs["Geometry"])
        mod=o.modifiers.new("Home camera-facing circle preview","NODES");mod.node_group=tree


def wave_nodes(tree,geo,g,controls):
    n,l=tree.nodes,tree.links
    def mathnode(op,a,b=None):
        x=n.new("ShaderNodeMath");x.operation=op
        for i,v in enumerate((a,b)):
            if v is None: continue
            if isinstance(v,(int,float)): x.inputs[i].default_value=v
            else:l.new(v,x.inputs[i])
        return x.outputs[0]
    pos=n.new("GeometryNodeInputPosition")
    sub=n.new("ShaderNodeVectorMath");sub.operation="SUBTRACT";sub.inputs[1].default_value=g["origin"];l.new(pos.outputs[0],sub.inputs[0])
    dots=[]
    for axis in (g["uAxis"],g["vAxis"]):
        d=n.new("ShaderNodeVectorMath");d.operation="DOT_PRODUCT";d.inputs[1].default_value=axis;l.new(sub.outputs[0],d.inputs[0]);dots.append(d.outputs["Value"])
    u,v=dots
    clock=n.new("ShaderNodeValue")
    # These saved group constants use the same bounded algebra as the export.
    property_driver(clock.outputs[0],"default_value",f"6.283185307179586*(t+r*(frame-1)/30)/{g['period']}+{g['phase']}",[("t",controls,'["ambientSeconds"]'),("r",controls,'["referenceMode"]')])
    first=mathnode("SINE",mathnode("ADD",mathnode("MULTIPLY",u,TAU/g["wavelength"]),clock.outputs[0]))
    second=mathnode("SINE",mathnode("SUBTRACT",mathnode("MULTIPLY",v,TAU*.73/g["wavelength"]),clock.outputs[0]))
    radius=mathnode("SQRT",mathnode("ADD",mathnode("MULTIPLY",u,u),mathnode("MULTIPLY",v,v)))
    quiet=n.new("ShaderNodeMapRange");quiet.interpolation_type="SMOOTHSTEP";quiet.clamp=True
    quiet.inputs["From Min"].default_value=g["quietRadius"];quiet.inputs["From Max"].default_value=g["quietRadius"]+g["quietFeather"]
    quiet.inputs["To Min"].default_value=0;quiet.inputs["To Max"].default_value=1;l.new(radius,quiet.inputs["Value"])
    val=mathnode("MULTIPLY",mathnode("MULTIPLY",mathnode("ADD",first,mathnode("MULTIPLY",second,.5)),g["amplitude"]/1.5),quiet.outputs["Result"])
    vec=n.new("ShaderNodeVectorMath");vec.operation="SCALE";vec.inputs[0].default_value=g["axis"];l.new(val,vec.inputs["Scale"])
    setpos=n.new("GeometryNodeSetPosition");l.new(geo,setpos.inputs["Geometry"]);l.new(vec.outputs[0],setpos.inputs["Offset"])
    return setpos.outputs["Geometry"]


if __name__ == "__main__":
    main()
