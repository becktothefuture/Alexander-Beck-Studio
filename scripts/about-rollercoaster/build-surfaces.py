"""Build a separate, simple-surface About source around the saved live camera rail."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def paths(source, output, report):
    source, output, report = (Path(p).resolve() for p in (source, output, report))
    if source.suffix != ".blend" or output.suffix != ".blend" or output.exists() or source == output:
        raise ValueError("Read a .blend source and write a new, separate .blend output")
    if report.suffix != ".json" or report in (source, output) or (report.exists() and report.samefile(source)):
        raise ValueError("Report must be a separate .json file, never a source/output alias")
    return source, output, report


def wave_preview(obj, group, controls):
    """The evaluated preview uses the runtime's exact wave on a subdivided quad."""
    subdiv = obj.modifiers.new("Preview subdivision", "SUBSURF")
    subdiv.subdivision_type = "SIMPLE"; subdiv.levels = 5; subdiv.render_levels = 5
    tree = bpy.data.node_groups.new("Final wall · wave preview only", "GeometryNodeTree")
    tree.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    tree.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    n, links = tree.nodes, tree.links
    inp, out = n.new("NodeGroupInput"), n.new("NodeGroupOutput")

    def calc(operation, a, b=None):
        node = n.new("ShaderNodeMath"); node.operation = operation
        for index, value in enumerate((a, b)):
            if value is None: continue
            if isinstance(value, (int, float)): node.inputs[index].default_value = value
            else: links.new(value, node.inputs[index])
        return node.outputs[0]

    pos = n.new("GeometryNodeInputPosition")
    local = n.new("ShaderNodeVectorMath"); local.operation = "SUBTRACT"
    local.inputs[1].default_value = group["origin"]; links.new(pos.outputs[0], local.inputs[0])
    uv = []
    for axis in (group["uAxis"], group["vAxis"]):
        dot = n.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"
        dot.inputs[1].default_value = axis; links.new(local.outputs[0], dot.inputs[0]); uv.append(dot.outputs["Value"])
    u, v = uv
    clock = n.new("ShaderNodeValue")
    driver = clock.outputs[0].driver_add("default_value").driver
    driver.type = "SCRIPTED"
    for name, key in (("t", "ambientSeconds"), ("r", "referenceMode")):
        variable = driver.variables.new(); variable.name = name; variable.type = "SINGLE_PROP"
        variable.targets[0].id = controls; variable.targets[0].data_path = f'["{key}"]'
    driver.expression = f"6.283185307179586*(t+r*(frame-1)/30)/{group['period']}+{group['phase']}"
    first = calc("SINE", calc("ADD", calc("MULTIPLY", u, 2*math.pi/group["wavelength"]), clock.outputs[0]))
    second = calc("SINE", calc("SUBTRACT", calc("MULTIPLY", v, 2*math.pi*.73/group["wavelength"]), clock.outputs[0]))
    radius = calc("SQRT", calc("ADD", calc("MULTIPLY", u, u), calc("MULTIPLY", v, v)))
    quiet = n.new("ShaderNodeMapRange"); quiet.interpolation_type = "SMOOTHSTEP"; quiet.clamp = True
    quiet.inputs["From Min"].default_value = group["quietRadius"]
    quiet.inputs["From Max"].default_value = group["quietRadius"]+group["quietFeather"]
    quiet.inputs["To Min"].default_value = 0; quiet.inputs["To Max"].default_value = 1
    links.new(radius, quiet.inputs["Value"])
    amount = calc("MULTIPLY", calc("MULTIPLY", calc("ADD", first, calc("MULTIPLY", second, .5)), group["amplitude"]/1.5), quiet.outputs["Result"])
    offset = n.new("ShaderNodeVectorMath"); offset.operation = "SCALE"; offset.inputs[0].default_value = group["axis"]
    links.new(amount, offset.inputs["Scale"])
    move = n.new("GeometryNodeSetPosition")
    links.new(inp.outputs["Geometry"], move.inputs["Geometry"])
    links.new(offset.outputs[0], move.inputs["Offset"]); links.new(move.outputs[0], out.inputs["Geometry"])
    obj.modifiers.new("Preview wave", "NODES").node_group = tree


def clear_ribbon_panels(vertices, faces, reading_frames):
    """Keep complete short faces outside every protected convex sight volume."""
    centers=np.array([list(f[0]) for f in reading_frames])
    forward=np.array([list(f[1]) for f in reading_frames])
    right=np.array([list(f[2]) for f in reading_frames])
    kept_vertices=[];kept_faces=[]
    for face in faces:
        a,b,c,d=[Vector(vertices[i]) for i in face]
        for part in range(6):
            lo,hi=part/6,(part+1)/6
            panel=[a.lerp(d,lo),b.lerp(c,lo),b.lerp(c,hi),a.lerp(d,hi)]
            delta=np.array(panel)[None,:,:]-centers[:,None,:]
            z=np.sum(delta*forward[:,None,:],axis=2)
            x=np.sum(delta*right[:,None,:],axis=2)
            # A whole face must lie outside at least one half-space per pose.
            # Vertex-only membership tests would allow a face to cross the centre.
            outside=(np.all(z<-.5,axis=1)|np.all(z>103,axis=1)|
                     np.all(x>.56*z+1.,axis=1)|np.all(x<-.56*z-1.,axis=1))
            if not np.all(outside):continue
            first=len(kept_vertices);kept_vertices.extend(panel)
            kept_faces.append(tuple(range(first,first+4)))
    if not kept_faces:raise ValueError("Reading ribbon has no safe complete panels")
    return kept_vertices,kept_faces


def build(source, output):
    old_hash = sha(source)
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene = bpy.context.scene
    controls, camera, rail = (bpy.data.objects[n] for n in ("About World Controls", "FlightCamera", "FlightRail"))
    controls["progress"] = 0.; controls["referenceMode"] = 0.; controls["ambientSeconds"] = 0.
    controls.update_tag(); scene.frame_set(1); bpy.context.view_layer.update()
    old_groups = json.loads(scene["motionGroups"])
    selected = [0, 1, 2, 5, 6, 8, 9, 11, 12, 16, 17, 19]
    owners = {int(o["motion_group"]): o for o in scene.objects if o.type == "EMPTY" and "motion_group" in o}
    kept = {controls, camera, rail} | {owners[i] for i in selected if old_groups[i]["kind"] == "rotate"}
    for obj in list(bpy.data.objects):
        if obj not in kept: bpy.data.objects.remove(obj, do_unlink=True)
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)
    collections = {}
    for name in ("Flight & Controls", "Opening", "Tunnel A", "Galleries", "Tunnel B", "Final Wall"):
        collection = bpy.data.collections.new(name); scene.collection.children.link(collection); collections[name] = collection
    for obj in kept: collections["Flight & Controls"].objects.link(obj)
    # Remove orphan point data and circle-preview assets, not merely visible objects.
    for store in (bpy.data.meshes, bpy.data.node_groups, bpy.data.materials, bpy.data.images):
        for block in list(store): store.remove(block, do_unlink=True)
    retained_scene = {key: scene[key] for key in ("beats", "regions", "finalGrid", "readingProtection")}
    for key in list(scene.keys()): del scene[key]
    for key, value in retained_scene.items(): scene[key] = value
    for key in ("circleRadius", "circleSpacing", "sampledSpacing", "previewTheme", "fogNear", "fogFar", "finalFogNear", "finalFogFar"):
        if key in controls: del controls[key]
    definitions = []
    for key, label, unit, limits in [
        ("progress", "Journey progress", "fraction", [0,1]),
        ("ambientSeconds", "Ambient clock", "seconds", [-3600,3600]),
        ("referenceMode", "Reference playback", "boolean", [0,1]),
        ("referenceSeconds", "Reference duration", "seconds", [30,600])]:
        definitions.append(dict(key=key, label=label, unit=unit, baseline=controls[key], range=limits, binding=key))
    scene["controlDefinitions"] = json.dumps(definitions)
    scene["about_schema"] = "about-rollercoaster-world/v2"
    scene["source_note"] = "Simple editable surfaces. Browser code owns circle spacing, radius, palette generation and visibility."
    mapping = {old: new for new, old in enumerate(selected)}
    groups = []
    for old in selected:
        group = old_groups[old].copy(); group["id"] = mapping[old]
        if group["kind"] == "rotate":
            owner = owners[old]; owner["motion_group"] = group["id"]
            for key in ("amplitude", "period", "phase"): group[key] = float(owner[key])
            group["pivot"] = list(owner.location)
            owner["motion_definition"] = json.dumps(group)
        groups.append(group)
    scene["motionGroups"] = json.dumps(groups)
    colours = ["74777a", "008f4d", "ffffff", "1852ff", "a34b43", "bd9530", "e72de4"]
    materials = []
    for role, colour in enumerate(colours):
        material = bpy.data.materials.new("About · All colours" if role == 6 else f"About · Palette role {role+1}")
        material["about_palette_role"] = role
        srgb = [int(colour[i:i+2], 16)/255 for i in (0,2,4)]
        material.diffuse_color = (*[x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4 for x in srgb], 1)
        materials.append(material)

    def frame(progress):
        controls["progress"] = progress; controls.update_tag(); scene.frame_set(1); bpy.context.view_layer.update()
        matrix = camera.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world
        forward = (matrix.to_quaternion() @ Vector((0,0,-1))).normalized()
        right = forward.cross(Vector((0,0,1))).normalized()
        return matrix.translation.copy(), forward, right, right.cross(forward).normalized()

    def surface(name, verts, faces, role, collection, old_group=0):
        mesh = bpy.data.meshes.new(name); mesh.from_pydata(verts, [], faces); mesh.update()
        obj = bpy.data.objects.new(name, mesh); collections[collection].objects.link(obj)
        obj["about_surface_id"] = name.lower().replace(" ", "-")
        obj["motion_group"] = mapping[old_group]
        mesh.materials.append(materials[role])
        if old_groups[old_group]["kind"] == "rotate":
            owner = owners[old_group]; obj.parent = owner
            for vertex in mesh.vertices: vertex.co -= owner.location
        return obj

    def section(progress, sides, radius, twist=0):
        center, forward, right, up = frame(progress)
        ring = []
        for i in range(sides):
            angle = 2*math.pi*i/sides+twist
            ring.append(center+(right*math.cos(angle)+up*math.sin(angle))*radius)
        return ring

    def walls(name, start, end, sides, radius, role, collection, twist=0):
        steps = max(2, math.ceil((end-start)*360/.97/2.5))
        vertices = [v for p in np.linspace(start,end,steps+1) for v in section(float(p), sides, radius, twist)]
        faces = [(j*sides+k, j*sides+(k+1)%sides, (j+1)*sides+(k+1)%sides, (j+1)*sides+k)
                 for j in range(steps) for k in range(sides)]
        return surface(name, vertices, faces, role, collection)

    def gate(name, progress, sides, radius, role, collection, old_group=0, twist=0):
        center, forward, right, up = frame(progress)
        if old_group: center = owners[old_group].location.copy()
        # Four simple loops form a short hollow frame with visible front/back edges.
        vertices = []
        for depth, r in ((-.46,radius),(-.46,radius+.20),(.46,radius),(.46,radius+.20)):
            for index in range(sides):
                angle = 2*math.pi*index/sides+twist
                vertices.append(center+forward*depth+(right*math.cos(angle)+up*math.sin(angle))*r)
        faces = []
        for first, second in ((0,1),(2,3),(0,2),(1,3)):
            faces += [(first*sides+k,first*sides+(k+1)%sides,second*sides+(k+1)%sides,second*sides+k) for k in range(sides)]
        return surface(name, vertices, faces, role, collection, old_group)

    walls("A · enclosed descent", .20,.235,24,2.65,1,"Tunnel A")
    walls("A · enclosed rising exit", .345,.40,12,2.65,3,"Tunnel A")
    for index,(progress,gid) in enumerate(((.242,0),(.262,5),(.286,0),(.312,6),(.336,0))):
        gate(f"A · round hoop {index+1}",progress,32,2.65,index,"Tunnel A",gid)
    walls("B · enclosed climb",.745,.775,4,2.55*math.sqrt(2),5,"Tunnel B",math.pi/4)
    walls("B · enclosed opposing turn",.855,.90,4,2.55*math.sqrt(2),4,"Tunnel B",math.pi/4)
    for index,(progress,gid) in enumerate(((.780,0),(.79305,16),(.811,0),(.8318,17),(.850,0))):
        gate(f"B · {'diamond' if gid else 'square'} gate {index+1}",progress,4,2.55*math.sqrt(2),(index+2)%6,"Tunnel B",gid,0 if gid else math.pi/4)

    reading = [frame(float(p)) for a,b in ((0,.16),(.44,.59),(.64,.72)) for p in np.linspace(a,b,81)]
    read_centers = np.array([list(r[0]) for r in reading]); read_forward = np.array([list(r[1]) for r in reading]); read_right = np.array([list(r[2]) for r in reading])

    def clear_side(point, margin=.4):
        delta = np.array(point)-read_centers
        depth = np.sum(delta*read_forward,axis=1)
        horizontal = np.abs(np.sum(delta*read_right,axis=1))
        return not np.any((depth>-.1)&(depth<102)&(horizontal<.56*np.maximum(depth,0)+margin))

    for name,start,end,role in (("Departure",0,.20,0),("Canopy",.40,.64,1),("Method",.64,.72,4)):
        for side in (-1,1):
            verts=[]
            for progress in np.linspace(start,end,9):
                center,forward,right,up = frame(float(progress))
                distance = next((d for d in np.arange(7,110,.5) if clear_side(center+right*side*d, 3.0)),110.)
                verts += [center+right*side*distance-up*5, center+right*side*distance+up*5]
            faces=[(2*j,2*j+1,2*j+3,2*j+2) for j in range(8)]
            if name=="Departure" and side==1:
                verts,faces=clear_ribbon_panels(verts,faces,reading)
            surface(f"{name} · {'left' if side<0 else 'right'} ribbon",verts,faces,(role+(2 if side>0 else 0))%6,"Galleries")
    # Small opening wings sit just outside the protected column and pass behind
    # the camera before career prose enters. They are ordinary visible surfaces.
    center,forward,right,up=frame(0)
    for side in (-1,1):
        verts=[center+forward*8+right*side*x+up*z for x,z in ((5,-3),(5,3),(6.5,3),(6.5,-3))]
        if not all(clear_side(point,.35) for point in verts):
            raise ValueError("Opening wing intersects the saved reading sight volume")
        surface(f"Opening · {'left' if side<0 else 'right'} wing",verts,[(0,1,2,3)],1 if side<0 else 3,"Opening")
    for name,gid,role in (("Departure left moving ribbon",1,5),("Departure right moving ribbon",2,4),
                          ("Canopy left moving ribbon",8,3),("Canopy right moving ribbon",9,2),
                          ("Method left moving ribbon",11,1),("Method right moving ribbon",12,5)):
        group=old_groups[gid]; pivot=owners[gid].location.copy(); forward=Vector(group["axis"])
        right=forward.cross(Vector((0,0,1))).normalized(); up=right.cross(forward).normalized()
        verts=[pivot+right*x+up*y for x,y in ((-1,-2),(1,-2),(1,2),(-1,2))]
        surface(name,verts,[(0,1,2,3)],role,"Galleries",gid)
    final=json.loads(scene["finalGrid"])
    origin,normal,u,v=(Vector(final[k]) for k in ("origin","normal","uAxis","vAxis"))
    width,height=final["width"],final["height"]
    wall=surface("Final wall",[origin+u*x+v*y for x,y in ((-width/2,-height/2),(width/2,-height/2),(width/2,height/2),(-width/2,height/2))],[(0,1,2,3)],6,"Final Wall",19)
    wave_preview(wall,groups[mapping[19]],controls)
    for key in ("columns","rows","pointRanges","supportBay"): final.pop(key,None)
    final.update(objectId=wall["about_surface_id"],motionGroup=mapping[19])
    scene["finalGrid"]=json.dumps(final)
    controls["progress"]=0.;controls.update_tag();scene.frame_set(1);bpy.context.view_layer.update()
    scene.camera=camera; scene.render.engine="BLENDER_WORKBENCH"
    scene.render.resolution_x=960;scene.render.resolution_y=600;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG";scene.world.color=(.025,.025,.025)
    scene.display.shading.light="STUDIO";scene.display.shading.color_type="MATERIAL"
    scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
    scene.display.shading.background_type="WORLD";scene.view_settings.view_transform="Standard"
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=="VIEW_3D":
                area.spaces.active.shading.type="SOLID";area.spaces.active.shading.color_type="MATERIAL"
                area.spaces.active.region_3d.view_perspective="CAMERA"
    bpy.ops.object.select_all(action="DESELECT")
    wall.select_set(True);bpy.context.view_layer.objects.active=wall
    output.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    bpy.ops.wm.open_mainfile(filepath=str(output))
    assert sha(source)==old_hash
    meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    assert len(bpy.data.meshes)==len(meshes) and all(len(o.data.polygons)>0 for o in meshes)
    assert not any(o.get("about_points") for o in bpy.data.objects)
    assert not any(n.bl_idname=="GeometryNodeInstanceOnPoints" for tree in bpy.data.node_groups for n in tree.nodes)
    assert all(len(o.data.materials)==1 for o in meshes)
    return dict(source=str(output),sourceSha256=sha(output),referenceSourceSha256=old_hash,referenceUnchanged=True,
                savedAndReopened=True,objects=len(meshes),vertices=sum(len(o.data.vertices) for o in meshes),
                faces=sum(len(o.data.polygons) for o in meshes),materialRoles=sorted({int(o.data.materials[0]["about_palette_role"]) for o in meshes}),
                noPointCloudsOrCircleInstances=True,noDensityOrRadiusControls=True,motionGroups=len(groups))


def main():
    parser=argparse.ArgumentParser();parser.add_argument("--source",required=True);parser.add_argument("--output",required=True);parser.add_argument("--report",required=True)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    source,output,report=paths(args.source,args.output,args.report)
    result=build(source,output);report.parent.mkdir(parents=True,exist_ok=True)
    report.write_text(json.dumps(result,indent=2)+"\n");print(json.dumps(result,indent=2))


if __name__=="__main__":main()
