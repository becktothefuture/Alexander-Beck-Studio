"""Export saved simple meshes and the evaluated live camera; never build circles."""
import argparse
import hashlib
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

REPO = Path(__file__).resolve().parents[2]
SCHEMA = "about-rollercoaster-world/v2"
SITE = Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
FILES = ("geometry.json", "camera.json", "meta.json")
SURFACE_BINDING = "normalized-surface-v1"
ANCHOR_BINDING = "normalized-anchor-v1"
TRACK_MODIFIER = "Follow FlightRail"
TRACK_GROUP = "About · Live Track Surface"
MATRIX_TOLERANCE = 1e-4
POINT_TOLERANCE = 2e-4
RETIRED_VISIBILITY_KEYS = {"fogNear", "fogFar", "finalFogNear", "finalFogFar"}


def source_control_definitions(scene):
    """Old saved files remain readable, but cannot export visibility ownership."""
    definitions = json.loads(scene["controlDefinitions"])
    if not isinstance(definitions, list) or not all(isinstance(item, dict) for item in definitions):
        raise ValueError("Source controls must be a list of definitions")
    def retired(value):
        return isinstance(value, str) and (value in RETIRED_VISIBILITY_KEYS or value == "fog" or value.startswith("fog."))
    return [item for item in definitions if not retired(item.get("key")) and not retired(item.get("binding"))]


def update_scene(scene, controls, time=0., progress=0., frame=1):
    controls["referenceMode"] = 0.
    controls["ambientSeconds"] = time
    controls["progress"] = progress
    controls.update_tag()
    scene.frame_set(frame)
    bpy.context.view_layer.update()


def evaluated_matrix(obj):
    return obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world.copy()


def validate_track_rail(rail, normalized_world):
    if normalized_world and (rail.type != "CURVE" or len(rail.data.splines) != 1 or
                             rail.data.splines[0].use_cyclic_u or rail.data.splines[0].tilt_interpolation != "LINEAR"):
        # Blender's Follow Path and GN Sample Curve disagree on EASE bank
        # interpolation. LINEAR keeps the carrier and surface frames aligned.
        raise ValueError("A normalized world needs one open FlightRail spline with LINEAR tilt interpolation")


def matrix_error(a, b):
    return max(abs(a[i][j]-b[i][j]) for i in range(4) for j in range(4))


def rigid_matrix(matrix, label):
    basis = matrix.to_3x3()
    if (not all(math.isfinite(value) for row in matrix for value in row) or
        abs(basis.determinant()-1) > 1e-5 or
        any(abs(basis.col[i].dot(basis.col[j])-(i == j)) > 1e-5 for i in range(3) for j in range(3))):
        raise ValueError(f"{label} must have a rigid unit-scale transform without shear or reflection")
    return matrix


def unit_vector(value, label):
    if isinstance(value, str):
        value = json.loads(value)
    if value is None or len(value) != 3 or not all(math.isfinite(x) for x in value):
        raise ValueError(f"{label} must be a finite unit vector")
    result = Vector(value)
    if abs(result.length-1) > 1e-5:
        raise ValueError(f"{label} must be a finite unit vector")
    return result.normalized()


def fixed_anchor(anchor, rail):
    """The carrier follows source edits, never either playback clock."""
    if (not anchor or anchor.type != "EMPTY" or anchor.get("about_track_binding") != ANCHOR_BINDING or
        anchor.parent or anchor.animation_data or len(anchor.constraints) != 1 or
        matrix_error(anchor.matrix_basis, Matrix.Identity(4)) > 1e-6):
        raise ValueError("A bound owner needs an unanimated, identity normalized-anchor-v1 carrier")
    constraint = anchor.constraints[0]
    if (constraint.type != "FOLLOW_PATH" or constraint.target != rail or constraint.mute or
        abs(constraint.influence-1) > 1e-6 or not constraint.use_fixed_location or not constraint.use_curve_follow or
        constraint.forward_axis != "FORWARD_Y" or constraint.up_axis != "UP_Z" or
        not math.isfinite(constraint.offset_factor) or not 0 <= constraint.offset_factor <= 1):
        raise ValueError("A normalized anchor needs one fixed FORWARD_Y / UP_Z FlightRail constraint")
    rigid_matrix(evaluated_matrix(anchor), anchor.name)
    return anchor


def track_modifier(obj, rail):
    if obj.get("about_track_binding") != SURFACE_BINDING:
        raise ValueError(f"{obj.name} needs the normalized-surface-v1 binding marker")
    if (len(obj.modifiers) != 1 or obj.modifiers[0].name != TRACK_MODIFIER or obj.modifiers[0].type != "NODES" or
        not obj.modifiers[0].show_viewport or not obj.modifiers[0].show_render):
        raise ValueError("A bound static surface needs only its enabled Follow FlightRail modifier")
    tree = obj.modifiers[0].node_group
    if not tree or tree.name != TRACK_GROUP:
        raise ValueError("The track modifier must use About · Live Track Surface")
    reference = obj.get("about_track_reference_length")
    if not isinstance(reference, (int, float)) or not math.isfinite(reference) or abs(reference-360) > 1e-6:
        raise ValueError("A normalized surface needs the graph's fixed 360 WU reference length")
    # The named contract is a position-only graph. Reject hidden clock/object
    # dependencies rather than baking a world that moves with native scrolling.
    trees, seen = [tree], set()
    while trees:
        current = trees.pop()
        if current.name in seen:
            continue
        seen.add(current.name)
        if current.animation_data:
            raise ValueError("Track binding nodes cannot be animated")
        for node in current.nodes:
            if node.bl_idname == "GeometryNodeInputSceneTime":
                raise ValueError("Track binding nodes cannot read scene time")
            if node.bl_idname == "GeometryNodeObjectInfo" and node.inputs["Object"].default_value != rail:
                raise ValueError("Track binding object input must be FlightRail")
            if node.type == "GROUP" and node.node_tree:
                trees.append(node.node_tree)
    return obj.modifiers[0]


def read_surface(obj, evaluated=False):
    """Copy one mesh consistently, then release Blender's temporary mesh."""
    owner = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()) if evaluated else None
    mesh = owner.to_mesh() if owner else obj.data
    try:
        vertices = [vertex.co.copy() for vertex in mesh.vertices]
        faces = [list(face.vertices) for face in mesh.polygons]
        if (any(face.material_index != 0 for face in mesh.polygons) or
            (evaluated and (len(mesh.materials) != 1 or not mesh.materials[0] or
                           mesh.materials[0].original != obj.material_slots[0].material.original))):
            raise ValueError("Evaluated surfaces must retain their one material role")
        if evaluated and (len(vertices) != len(obj.data.vertices) or faces != [list(face.vertices) for face in obj.data.polygons]):
            raise ValueError("Track binding must preserve the source mesh topology")
        mesh.calc_loop_triangles()
        triangles = {}
        for triangle in mesh.loop_triangles:
            triangles.setdefault(triangle.polygon_index, []).append(list(triangle.vertices))
        return vertices, faces, triangles
    finally:
        if owner:
            owner.to_mesh_clear()


def motion_angle(group, time):
    theta = 2*math.pi*time/group["period"]+group["phase"]
    return theta if group["continuous"] else group["amplitude"]*math.sin(theta)


def rotation_frame(owner, group, rail):
    animation = owner.animation_data
    drivers = list(animation.drivers) if animation else []
    if (not animation or animation.action or animation.nla_tracks or owner.rotation_mode != "QUATERNION" or
        {(d.data_path, d.array_index) for d in drivers} != {("rotation_quaternion", i) for i in range(4)} or
        any(d.mute or not d.is_valid for d in drivers)):
        raise ValueError(f"{owner.name} needs its four active quaternion drivers, with no action or NLA animation")
    if (owner.constraints or any(abs(x-1) > 1e-6 for x in (*owner.scale, *owner.delta_scale)) or
        owner.delta_location.length > 1e-6 or Vector(owner.delta_rotation_euler).length > 1e-6 or
        (Vector(owner.delta_rotation_quaternion)-Vector((1, 0, 0, 0))).length > 1e-6):
        raise ValueError(f"Keep the rigid controller transform on {owner.name}; transform its child surface instead")
    for key in ("amplitude", "period", "phase"):
        group[key] = float(owner[key])
    if (not all(math.isfinite(group[key]) for key in ("amplitude", "period", "phase")) or
        group["amplitude"] < 0 or group["period"] <= 0 or not isinstance(group.get("continuous"), bool)):
        raise ValueError("Invalid saved rotation parameters")
    anchor = fixed_anchor(owner.parent, rail) if owner.parent else None
    axis = unit_vector(owner.get("motion_axis_local") if anchor else group["axis"], "Motion axis")
    actual = rigid_matrix(evaluated_matrix(owner), owner.name)
    rotation = Quaternion(axis, motion_angle(group, 0)).to_matrix().to_4x4()
    if anchor:
        # The local quaternion is the only ambient transform. A saved parent
        # inverse or local offset remains part of the fixed, evaluated frame.
        frame = actual @ rotation.inverted()
        local = owner.evaluated_get(bpy.context.evaluated_depsgraph_get()).rotation_quaternion
        if Quaternion(axis, motion_angle(group, 0)).rotation_difference(local).angle > 1e-4:
            raise ValueError("The saved local motion axis differs from its quaternion drivers")
    else:
        frame = Matrix.Translation(owner.location)
        if matrix_error(frame @ rotation, actual) > MATRIX_TOLERANCE:
            raise ValueError("The saved motion controller no longer matches its declared axis equation")
    rigid_matrix(frame, owner.name)
    world_axis = (frame.to_3x3() @ axis).normalized()
    group["pivot"], group["axis"] = list(frame.translation), list(world_axis)
    world_rotation = Quaternion(world_axis, motion_angle(group, 0)).to_matrix().to_4x4()
    inverse = (Matrix.Translation(frame.translation) @ world_rotation @ Matrix.Translation(-frame.translation)).inverted()
    return dict(owner=owner, anchor=anchor, frame=frame, localAxis=axis, inverse=inverse)


def wave_point(point, group, time):
    local = point-Vector(group["origin"])
    u, v = local.dot(Vector(group["uAxis"])), local.dot(Vector(group["vAxis"]))
    quiet = min(1., max(0., (math.hypot(u, v)-group["quietRadius"])/group["quietFeather"]))
    quiet *= quiet*(3-2*quiet)
    theta = 2*math.pi*time/group["period"]+group["phase"]
    amount = group["amplitude"]*quiet*(math.sin(2*math.pi*u/group["wavelength"]+theta)+.5*math.sin(2*math.pi*.73*v/group["wavelength"]-theta))/1.5
    return point+Vector(group["axis"])*amount


def wave_frame(obj, group, rail):
    if (not all(isinstance(group.get(key), (int, float)) and math.isfinite(group[key])
                for key in ("amplitude", "period", "phase", "wavelength", "quietRadius", "quietFeather")) or
        group["amplitude"] < 0 or group["period"] <= 0 or group["wavelength"] <= 0 or
        group["quietRadius"] < 0 or group["quietFeather"] <= 0):
        raise ValueError("Invalid saved wave parameters")
    matrix = rigid_matrix(evaluated_matrix(obj), obj.name)
    if group.get("space") == "LOCAL":
        if group.get("object") != obj.name:
            raise ValueError("A LOCAL wave must name its source surface")
        anchor = fixed_anchor(obj.parent, rail)
        if abs(anchor.constraints[0].offset_factor-1) > 1e-6:
            raise ValueError("The final wall carrier must stay at normalized station 1")
        origin = Vector(group["origin"])
        group["origin"] = list(matrix @ origin)
        for key in ("axis", "uAxis", "vAxis"):
            group[key] = list((matrix.to_3x3() @ unit_vector(group[key], key)).normalized())
        group.pop("space")
        group.pop("object")
    elif group.get("space") is not None or obj.parent or matrix_error(matrix, Matrix.Identity(4)) > 1e-6:
        raise ValueError("An unbound wave object must retain its identity world transform")
    axis=unit_vector(group["axis"],"Wave axis")
    u=unit_vector(group["uAxis"],"Wave U axis");v=unit_vector(group["vAxis"],"Wave V axis")
    if max(abs(axis.dot(u)),abs(axis.dot(v)),abs(u.dot(v)))>1e-5:
        raise ValueError("Wave vectors must form an orthonormal frame")
    if any(abs((matrix@vertex.co-Vector(group["origin"])).dot(axis))>POINT_TOLERANCE for vertex in obj.data.vertices):
        raise ValueError("The wave origin and base quad must share one rest plane")
    return matrix


def check_wave_preview(obj, group, time):
    """Recover each subdivided rest point from the wave's normal coordinate."""
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    maximum = 0.
    try:
        axis, origin = Vector(group["axis"]), Vector(group["origin"])
        for vertex in mesh.vertices:
            actual = evaluated.matrix_world @ vertex.co
            rest = actual-axis*(actual-origin).dot(axis)
            maximum = max(maximum, (wave_point(rest, group, time)-actual).length)
        if maximum > POINT_TOLERANCE:
            raise ValueError(f"Saved wave preview differs from its ambient equation ({maximum:.6g} WU)")
        return maximum, len(mesh.vertices)
    finally:
        evaluated.to_mesh_clear()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def output_paths(source, output, report, staging_only):
    source, output = Path(source).resolve(), Path(output).resolve()
    report = Path(report).resolve() if report else None
    protected = [source, REPO/"source-assets/about-surface-world/about-surface-world.blend",
                 REPO/"source-assets/about-rollercoaster-reset/about-rollercoaster.blend"]
    if source.suffix != ".blend" or output in protected or (output.exists() and not output.is_dir()):
        raise ValueError("Read a saved .blend and export to a separate directory")
    if staging_only and output.is_relative_to(REPO/"react-app/app/public"):
        raise ValueError("A public bundle must pass the validated publisher")
    protected_files=protected+[output/name for name in FILES]
    if report and (report.suffix != ".json" or report in protected_files or
                   (report.exists() and any(path.exists() and report.samefile(path) for path in protected_files))):
        raise ValueError("Report must be a separate .json file, never a source or bundle alias")
    return source, output, report


def json_bytes(value):
    return (json.dumps(value,separators=(",",":"),allow_nan=False)+"\n").encode()


def planar_convex(points):
    # Use Python doubles on the exact serialized coordinates. mathutils uses
    # Float32 and can accept a slightly twisted quad that the JS reader rejects.
    # Match rollercoasterField.faceSurface, including its strongest fan normal.
    subtract=lambda a,b: tuple(float(a[i])-float(b[i]) for i in range(3))
    dot=lambda a,b: a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
    cross=lambda a,b: (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
    strongest=(0.,0.,0.)
    for index in range(1,len(points)-1):
        candidate=cross(subtract(points[index],points[0]),subtract(points[index+1],points[0]))
        if dot(candidate,candidate)>dot(strongest,strongest): strongest=candidate
    length=math.hypot(*strongest)
    if length<=1e-10: return False
    normal=tuple(value/length for value in strongest);distance=dot(normal,points[0]);winding=0
    for index,point in enumerate(points):
        if abs(dot(normal,point)-distance)>1e-5-1e-12: return False
        edge=subtract(points[(index+1)%len(points)],point)
        following=subtract(points[(index+2)%len(points)],points[(index+1)%len(points)])
        if math.hypot(*edge)<=1e-8: return False
        turn=dot(cross(edge,following),normal)
        if abs(turn)>1e-10:
            sign=1 if turn>0 else -1
            if winding and winding!=sign: return False
            winding=sign
    return True


def export(source):
    before=sha(source); bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if scene.get("about_schema")!=SCHEMA: raise ValueError("Expected the simple-surface v2 source")
    normalized_world=scene.get("about_track_binding")=="normalized-world-v1"
    controls=bpy.data.objects["About World Controls"];camera=bpy.data.objects["FlightCamera"];rail=bpy.data.objects["FlightRail"]
    validate_track_rail(rail,normalized_world)
    if any(key in controls for key in ("circleRadius","circleSpacing","sampledSpacing")):
        raise ValueError("Circle density and radius belong to browser code")
    if (scene.camera!=camera or camera.type!="CAMERA" or camera.data.type!="PERSP" or
        camera.data.sensor_fit!="HORIZONTAL" or abs(math.degrees(camera.data.angle_x)-70)>.01 or
        abs(camera.data.shift_x)+abs(camera.data.shift_y)>1e-7):
        raise ValueError("FlightCamera must retain the active, unshifted H70 perspective lens")
    if len([c for c in camera.constraints if c.type=="FOLLOW_PATH" and c.target==rail and c.use_curve_follow])!=1:
        raise ValueError("FlightCamera must be driven by its live FlightRail")
    update_scene(scene, controls)
    groups=json.loads(scene["motionGroups"]);rotations={};bound_surfaces=[];waves=[];anchors={}
    if [g["id"] for g in groups]!=list(range(len(groups))) or groups[0]["kind"]!="static":
        raise ValueError("Motion identities must be contiguous and start with static")
    for group in groups:
        if group.get("clock","ambient")!="ambient": raise ValueError("Only the shared ambient clock is supported")
        if group["kind"]=="rotate":
            matches=[o for o in scene.objects if o.type=="EMPTY" and o.get("motion_group")==group["id"]]
            if len(matches)!=1: raise ValueError("Each motion group needs one saved motion owner")
            state=rotation_frame(matches[0],group,rail);rotations[group["id"]]=state
            if normalized_world and not state["anchor"]: raise ValueError("Every normalized-world motion owner needs its fixed carrier")
            if state["anchor"]: anchors[state["anchor"]]=evaluated_matrix(state["anchor"])
        elif group["kind"] not in ("static","wave"): raise ValueError("Unsupported surface motion")
    objects=[];ids=set();names=set();dg=bpy.context.evaluated_depsgraph_get()
    for obj in sorted((o for o in scene.objects if o.type=="MESH" and not o.get("about_preview_only")),key=lambda o:o.name):
        if obj.get("about_points") or not obj.data.polygons: raise ValueError("Only faced surfaces may be exported; no point clouds")
        if len(obj.material_slots)!=1 or any(face.material_index!=0 for face in obj.data.polygons):
            raise ValueError(f"{obj.name} must use exactly one material slot for every face")
        material=obj.material_slots[0].material
        role=material.get("about_palette_role") if material else None
        if not isinstance(role,int) or not 0<=role<=6: raise ValueError(f"{obj.name} needs a palette-role material (0–6)")
        gid=int(obj.get("motion_group",0))
        if not 0<=gid<len(groups): raise ValueError("Unknown surface motion group")
        group=groups[gid]
        if obj.constraints or obj.animation_data or obj.data.shape_keys: raise ValueError("Use a supported motion owner; direct animated surface transforms are not exported")
        binding=obj.get("about_track_binding")
        surface_binding=binding==SURFACE_BINDING
        if binding is not None and not surface_binding and not (binding=="normalized-endpoint-v1" and group["kind"]=="wave"):
            raise ValueError("Unsupported surface track binding")
        if normalized_world and group["kind"]=="static" and not surface_binding:
            raise ValueError("Every normalized-world static surface needs its track binding")
        if surface_binding:
            if group["kind"]!="static" or obj.parent: raise ValueError("Only unparented static surfaces may use the track-deformation graph")
            track_modifier(obj,rail)
        elif obj.modifiers and (group["kind"]!="wave" or [(m.name,m.type) for m in obj.modifiers]!=[("Preview subdivision","SUBSURF"),("Preview wave","NODES")]):
            raise ValueError("Apply ordinary modelling modifiers before export; only the marked track binding and wall wave preview are supported")
        matrix=obj.evaluated_get(dg).matrix_world.copy()
        if group["kind"]=="rotate":
            if obj.parent!=rotations[gid]["owner"]: raise ValueError("A moving surface must retain its declared owner")
            matrix=rotations[gid]["inverse"]@matrix
        elif group["kind"]=="wave":
            if any(existing[1]["id"]==gid for existing in waves): raise ValueError("A wave group belongs to one complete wall surface")
            if normalized_world and group.get("space")!="LOCAL": raise ValueError("A normalized-world wall needs its LOCAL wave basis")
            matrix=wave_frame(obj,group,rail)
            if obj.parent: anchors[obj.parent]=evaluated_matrix(obj.parent)
            if (len(obj.modifiers)!=2 or not all(m.show_viewport and m.show_render for m in obj.modifiers) or
                obj.modifiers[0].subdivision_type!="SIMPLE" or obj.modifiers[0].levels!=obj.modifiers[0].render_levels):
                raise ValueError("The wall needs the enabled matching simple subdivision and wave preview")
            waves.append((obj,group))
        elif obj.parent:
            parent=obj.parent
            while parent:
                if parent.animation_data or parent.constraints or parent.get("motion_group",0):
                    raise ValueError("Static surfaces cannot inherit undeclared animation")
                parent=parent.parent
        local_vertices,source_faces,triangles=read_surface(obj,evaluated=surface_binding)
        if surface_binding:
            bound_surfaces.append((obj,[matrix@point for point in local_vertices]))
        vertices=[SITE.to_3x3()@(matrix@point) for point in local_vertices]
        faces=[]
        for face_index,indices in enumerate(source_faces):
            points=[vertices[i] for i in indices]
            faces.extend([indices] if len(indices) in (3,4) and planar_convex(points) else triangles[face_index])
        if set(i for f in faces for i in f)!=set(range(len(vertices))): raise ValueError("Remove loose vertices from the authoring surface")
        if any(not planar_convex([vertices[i] for i in f]) for f in faces): raise ValueError("Degenerate or invalid source face")
        identity=str(obj.get("about_surface_id",obj.name))
        if not identity or identity in ids or obj.name in names: raise ValueError("Surface IDs and names must be unique")
        ids.add(identity);names.add(obj.name)
        objects.append(dict(id=identity,name=obj.name,positions=[x for v in vertices for x in v],faces=faces,paletteRole=role,motionGroup=gid))
    if not objects: raise ValueError("Source contains no surfaces")
    max_motion_error=0.;max_matrix_error=0.;max_wave_error=0.;wave_checks=0;binding_checks=0
    # Progress and native-frame probes catch undeclared playback dependencies in
    # a fixed carrier or a marked deformation graph. Ambient probes also compare
    # the full rigid matrix, so a drifting pivot cannot pass a quaternion check.
    for time,progress,frame in ((0.,0.,1),(1.75,.37,1),(7.,1.,31),(14.,0.,121)):
        update_scene(scene,controls,time,progress,frame)
        for gid,state in rotations.items():
            expected=state["frame"]@Quaternion(state["localAxis"],motion_angle(groups[gid],time)).to_matrix().to_4x4()
            actual=evaluated_matrix(state["owner"])
            error=matrix_error(expected,actual);max_matrix_error=max(max_matrix_error,error)
            max_motion_error=max(max_motion_error,expected.to_quaternion().rotation_difference(actual.to_quaternion()).angle)
            if error>MATRIX_TOLERANCE: raise ValueError("Saved motion drivers differ from the shared ambient equation or move their pivot")
        for anchor,expected in anchors.items():
            if matrix_error(expected,evaluated_matrix(anchor))>MATRIX_TOLERANCE:
                raise ValueError("A normalized carrier must not move with progress, ambient time or scene frame")
        for obj,expected in bound_surfaces:
            local,_,_=read_surface(obj,evaluated=True);matrix=evaluated_matrix(obj)
            if max((matrix@point-rest).length for point,rest in zip(local,expected))>POINT_TOLERANCE:
                raise ValueError("Track-deformed geometry must not move with playback clocks")
            binding_checks+=len(local)
        for obj,group in waves:
            error,count=check_wave_preview(obj,group,time);max_wave_error=max(max_wave_error,error);wave_checks+=count
    update_scene(scene,controls)
    samples=[];previous=None
    for index in range(2001):
        progress=index/2000;controls["progress"]=progress;controls.update_tag();scene.frame_set(1);bpy.context.view_layer.update()
        matrix=SITE@camera.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world
        quat=matrix.to_quaternion().normalized()
        if previous and previous.dot(quat)<0: quat.negate()
        previous=quat.copy();samples.append([progress,*matrix.translation,quat.x,quat.y,quat.z,quat.w])
    max_angle=0.;final_angle=0.;distance=0.
    for current,after in zip(samples,samples[1:]):
        delta=Vector(after[1:4])-Vector(current[1:4]);distance+=delta.length
        if delta.length<1e-6: continue
        forward=Quaternion((current[7],*current[4:7]))@Vector((0,0,-1))
        angle=math.degrees(forward.angle(delta));max_angle=max(max_angle,angle)
        if current[0]>=.90: final_angle=max(final_angle,angle)
    if max_angle>8 or final_angle>3: raise ValueError("Camera no longer faces its forward route")
    final=json.loads(scene["finalGrid"])
    wall=next(o for o in objects if o["id"]==final["objectId"])
    if len(wall["positions"])!=12 or wall["faces"]!=[[0,1,2,3]] or wall["paletteRole"]!=6:
        raise ValueError("Final wall must be one complete four-corner All colours quad")
    points=[Vector(wall["positions"][i:i+3]) for i in range(0,12,3)]
    u,v=points[1]-points[0],points[3]-points[0]
    if abs(u.normalized().dot(v.normalized()))>1e-5 or (points[0]+u+v-points[2]).length>1e-4:
        raise ValueError("The final wall must remain a rectangle")
    final.update(origin=list(sum(points,Vector())/4),uAxis=list(u.normalized()),vAxis=list(v.normalized()),
                 normal=list(u.cross(v).normalized()),width=u.length,height=v.length)
    endpoint=samples[-1]
    forward=Quaternion((endpoint[7],*endpoint[4:7]))@Vector((0,0,-1))
    if abs(Vector(final["normal"]).dot(forward))<1-1e-5:
        raise ValueError("The final wall must face the endpoint camera")
    final["stoppingDistance"]=(Vector(final["origin"])-Vector(endpoint[1:4])).dot(forward)
    if final["stoppingDistance"]<=0: raise ValueError("The final wall must remain ahead of the endpoint camera")
    for group in groups:
        for key in ("axis","pivot","origin","uAxis","vAxis"):
            if key in group: group[key]=list(SITE.to_3x3()@Vector(group[key]))
    geometry_bytes=json_bytes(dict(objects=objects));camera_bytes=json_bytes(dict(samples=samples))
    meta=dict(schema=SCHEMA,source=dict(file=source.relative_to(REPO).as_posix(),sha256=before),
              camera=dict(file="camera.json",horizontalFov=70,portraitVerticalFov=90),cameraSha256=hashlib.sha256(camera_bytes).hexdigest(),
              geometry=dict(file="geometry.json",sha256=hashlib.sha256(geometry_bytes).hexdigest(),objectCount=len(objects)),
              beats=json.loads(scene["beats"]),motionGroups=groups,
              regions=json.loads(scene["regions"]),finalGrid=final,totalDistanceWU=distance,referenceSeconds=controls["referenceSeconds"],
              controls=source_control_definitions(scene))
    if scene.get("readingProtection"): meta["readingProtection"]=json.loads(scene["readingProtection"])
    if sha(source)!=before: raise ValueError("Source changed during export")
    report=dict(source=meta["source"],objects=len(objects),vertices=sum(len(o["positions"])/3 for o in objects),
                faces=sum(len(o["faces"]) for o in objects),materialRoles=sorted({o["paletteRole"] for o in objects}),
                cameraSamples=len(samples),cameraSha256=meta["cameraSha256"],maxForwardDegrees=max_angle,
                finalForwardDegrees=final_angle,sourceUnchanged=True,noAuthoredCircleData=True,
                rotationPhaseChecks=4*len(rotations),maxRotationPhaseErrorRadians=max_motion_error,
                maxRotationMatrixError=max_matrix_error,normalizedSurfaceCount=len(bound_surfaces),
                normalizedAnchorCount=len(anchors),bindingVertexClockChecks=binding_checks,
                waveVertexPhaseChecks=wave_checks,maxWavePhaseErrorWU=max_wave_error)
    return {"geometry.json":geometry_bytes,"camera.json":camera_bytes,"meta.json":json_bytes(meta)},report


def main():
    parser=argparse.ArgumentParser();parser.add_argument("--source",required=True);parser.add_argument("--output",required=True)
    parser.add_argument("--report");parser.add_argument("--staging-only",action="store_true")
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    source,output,report_path=output_paths(args.source,args.output,args.report,args.staging_only)
    publisher=REPO/"scripts/lib/about-rollercoaster-publish.mjs";node=shutil.which("node")
    if not args.staging_only:
        if not node: raise ValueError("Project Node is needed for validated publication")
        subprocess.run([node,str(publisher),"--check-contract",SCHEMA],check=True)
    payload,report=export(source)
    output.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".about-surfaces-",dir=output.parent) as directory:
        stage=Path(directory)
        for name,data in payload.items(): (stage/name).write_bytes(data)
        if args.staging_only:
            output.mkdir(parents=True,exist_ok=True)
            for name in FILES: os.replace(stage/name,output/name)
        else: subprocess.run([node,str(publisher),str(stage),str(output)],check=True)
    if report_path:
        report_path.parent.mkdir(parents=True,exist_ok=True);report_path.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report,indent=2))


if __name__=="__main__":main()
