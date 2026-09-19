"""Replace distant gallery faces with simple surfaces beside the saved FlightRail.

The callable changes geometry and the six gallery motion pivots only. It never
saves, exports, changes the camera, or changes playback/fog controls. The CLI
creates a separate candidate for review and refuses either source master.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector


def camera_frames(scene, controls, count=2001):
    """Return evaluated (progress, matrix) pairs, restoring the caller's pose."""
    state = {key: controls[key] for key in ("progress", "referenceMode", "ambientSeconds")}
    frame, subframe = scene.frame_current, scene.frame_subframe
    result = []
    try:
        controls["referenceMode"] = 0.; controls["ambientSeconds"] = 0.
        for index in range(count):
            controls["progress"] = index/(count-1); controls.update_tag()
            scene.frame_set(1); bpy.context.view_layer.update()
            matrix = scene.camera.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world.copy()
            result.append((index/(count-1), matrix))
    finally:
        for key, value in state.items(): controls[key] = value
        controls.update_tag(); scene.frame_set(frame, subframe=subframe); bpy.context.view_layer.update()
    return result


def refine_track_surfaces(scene, frames=None, controls=None, cleanup_unused_meshes=False):
    """Deterministic geometry-only pass suitable for the live saved-source loop.

    `frames` may be the evaluated matrices returned by camera_frames. Gallery
    ribs use a short forward construction in each local camera frame. This
    places both sides in the portrait/desktop peripheral visibility interval.
    Existing camera, rail, tunnel/gate meshes and final wall are untouched.
    Keep unused replaced mesh datablocks by default: live tools may still hold
    their RNA references. The isolated CLI may remove only those orphan meshes.
    """
    if scene.get("about_schema") != "about-rollercoaster-world/v2":
        raise ValueError("Expected the simple-surface v2 world")
    controls = controls or scene.objects.get("About World Controls")
    if not controls or scene.camera != scene.objects.get("FlightCamera"):
        raise ValueError("Missing the saved FlightCamera and About World Controls")
    frames = frames or camera_frames(scene, controls)
    if (len(frames) < 201 or frames[0][0] != 0 or frames[-1][0] != 1 or
        any(abs(progress-index/(len(frames)-1)) > 1e-8 for index,(progress,_) in enumerate(frames))):
        raise ValueError("Provide dense evaluated camera frames covering progress 0–1")
    names = [f"{name} · {side} ribbon" for name in ("Departure", "Canopy", "Method") for side in ("left", "right")]
    names += [f"Opening · {side} wing" for side in ("left", "right")]
    moving = [f"{name} {side} moving ribbon" for name in ("Departure", "Canopy", "Method") for side in ("left", "right")]
    if any(name not in scene.objects for name in names+moving):
        raise ValueError("The known gallery surfaces must exist; no whole-world rebuild is performed")
    if any(len(scene.objects[name].material_slots) != 1 or not scene.objects[name].material_slots[0].material
           for name in names+moving):
        raise ValueError("Every target surface needs its single palette-role material")
    floors = (("Curiosity",.184,.199,1),("Release",.404,.438,3),
              ("Statements",.614,.638,5),("Approach",.902,.966,6))
    hoop_stations = (.252,.270,.278,.2946666667,.3033333333,.320,.328)
    added_names = [f"{label} · floor release" for label,_,_,_ in floors]
    added_names += [f"A · infill hoop {index+1}" for index in range(len(hoop_stations))]
    for name in added_names:
        obj = scene.objects.get(name)
        if obj and obj.get("track_composition") != "near-track-v1":
            raise ValueError(f"Refusing to replace an unrelated object named {obj.name}")
    groups = json.loads(scene["motionGroups"])
    owners = {int(obj["motion_group"]): obj for obj in scene.objects if obj.type == "EMPTY" and "motion_group" in obj}
    for name in moving:
        obj = scene.objects[name]; gid = int(obj["motion_group"])
        if gid not in owners or obj.parent != owners[gid] or groups[gid]["kind"] != "rotate":
            raise ValueError("Keep the supported gallery motion owners and their child surfaces")
    changed = []

    def at(progress):
        position = progress*(len(frames)-1); index = min(int(position), len(frames)-2)
        first, second = frames[index][1], frames[index+1][1]; weight = position-index
        center = first.translation.lerp(second.translation, weight)
        rotation = first.to_quaternion().slerp(second.to_quaternion(), weight)
        return center, rotation @ Vector((1,0,0)), rotation @ Vector((0,1,0)), rotation @ Vector((0,0,-1))

    def replace(obj, vertices, faces, pivot=None):
        # Preserve the effective material, including an Object-linked override.
        if len(obj.material_slots) != 1 or not obj.material_slots[0].material:
            raise ValueError(f"{obj.name} needs its single palette-role material")
        material = obj.material_slots[0].material; old = obj.data
        mesh = bpy.data.meshes.new(f"{obj.name} · track surface")
        mesh.from_pydata([list(v-(pivot or Vector())) for v in vertices], [], faces); mesh.update()
        mesh.materials.append(material); obj.data = mesh
        obj.matrix_parent_inverse = Matrix.Identity(4); obj.matrix_basis = Matrix.Identity(4)
        if cleanup_unused_meshes and old.users == 0: bpy.data.meshes.remove(old)
        obj["track_composition"] = "near-track-v1"; changed.append(obj.name)

    def side_ribs(obj, start, end, side, moving_station=None):
        count = max(2, math.ceil((end-start)*372/1.6))
        vertices = []; faces = []
        for progress in np.linspace(start, end, count+1)[:-1]:
            if moving_station is not None and abs(progress-moving_station)*372 < .85: continue
            center, right, up, forward = at(float(progress)); center += forward*7.7
            first = len(vertices)
            # Each rib is one editable eight-vertex rectangular prism. It is
            # physically present at all times, with open air between neighbours.
            vertices += [center+right*(side*x)+up*y+forward*z
                         for z in (-.15,.15) for x,y in ((3.4,-3.2),(3.9,-3.2),(3.9,3.2),(3.4,3.2))]
            faces += [tuple(first+i for i in face) for face in
                      ((0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0))]
        replace(obj, vertices, faces)

    # Opening wings become the first part of the sustained bilateral gallery.
    for side, label in ((-1,"left"),(1,"right")):
        side_ribs(scene.objects[f"Opening · {label} wing"], 0, .04, side)
        for name, start, end, station in (("Departure",.04,.172,.085),("Canopy",.427,.605,None),("Method",.627,.73,.68)):
            side_ribs(scene.objects[f"{name} · {label} ribbon"], start, end, side, station)

    # Move each paired pivot and its rest-space child together. Axis, drivers,
    # amplitude, phase and period remain authored exactly as in the snapshot.
    for name, station in (("Departure",.085),("Canopy",.515),("Method",.68)):
        center, right, up, forward = at(station); center += forward*7.7
        for side, label in ((-1,"left"),(1,"right")):
            obj = scene.objects[f"{name} {label} moving ribbon"]; gid = int(obj["motion_group"])
            pivot = center+right*(side*3.95); owner = owners[gid]; owner.location = pivot
            groups[gid]["pivot"] = list(pivot); owner["motion_definition"] = json.dumps(groups[gid])
            vertices = [pivot+right*x+up*y for x,y in ((-.15,-3),(.15,-3),(.15,3),(-.15,3))]
            replace(obj, vertices, [(0,1,2,3)], pivot)
    scene["motionGroups"] = json.dumps(groups)
    # Supersede the earlier distant-world claim of full 102 WU clearance.
    # These are physical nearby surfaces; readability is checked in the actual
    # viewport with shared depth fog, not guaranteed by this authoring function.
    scene["readingProtection"] = json.dumps(dict(
        method="Near-track paired ribs and physical floor releases, reviewed with shared depth fog",
        geometryVisibility="All geometry persists; no screen masks or visibility switches",
        validation="Requires current source projection and native browser review; no full-column clearance claim"))

    # Separate ordinary floor strips create open releases between prose spans.
    collection = bpy.data.collections.get("Galleries") or scene.collection
    materials = {int(m["about_palette_role"]): m for m in bpy.data.materials if "about_palette_role" in m}
    # Short static hoops fill the visibility gaps between the retained A gates.
    # At most 4 WU separates consecutive planes; the .4 WU shells leave real air.
    tunnel = bpy.data.collections.get("Tunnel A") or scene.collection
    for index, progress in enumerate(hoop_stations):
        name = f"A · infill hoop {index+1}"; obj = scene.objects.get(name)
        if obj is None:
            mesh = bpy.data.meshes.new(name); mesh.materials.append(materials[(index+5)%6])
            obj = bpy.data.objects.new(name,mesh); tunnel.objects.link(obj)
            obj["about_surface_id"] = name.lower().replace(" ","-"); obj["motion_group"] = 0
        center, right, up, forward = at(progress); vertices = []; faces = []; sides = 32
        for depth, radius in ((-.2,2.65),(-.2,2.9),(.2,2.65),(.2,2.9)):
            vertices += [center+forward*depth+(right*math.cos(2*math.pi*i/sides)+up*math.sin(2*math.pi*i/sides))*radius
                         for i in range(sides)]
        for a,b in ((0,1),(2,3),(0,2),(1,3)):
            faces += [(a*sides+i,a*sides+(i+1)%sides,b*sides+(i+1)%sides,b*sides+i) for i in range(sides)]
        replace(obj,vertices,faces)
    for label, start, end, role in floors:
        name = f"{label} · floor release"; obj = scene.objects.get(name)
        if obj is None:
            mesh = bpy.data.meshes.new(name); mesh.materials.append(materials[role])
            obj = bpy.data.objects.new(name, mesh); collection.objects.link(obj)
            obj["about_surface_id"] = name.lower().replace(" ","-"); obj["motion_group"] = 0
        elif obj.get("track_composition") != "near-track-v1":
            raise ValueError(f"Refusing to replace an unrelated object named {name}")
        vertices = []; steps = max(2, math.ceil((end-start)*372/1.8))
        for progress in np.linspace(start,end,steps+1):
            center, right, up, _ = at(float(progress))
            # Prose-adjacent floors begin beyond its short visibility horizon,
            # then rise physically from a low start into a readable floor pause.
            t = min(1., (progress-start)/.006)
            drop = 6.-4.2*(t*t*(3.-2.*t)) if label in ("Curiosity","Statements") else 1.8
            vertices.extend((center-right*4.8-up*drop, center+right*4.8-up*drop))
        faces = [face for index in range(steps) for face in
                 ((2*index,2*index+1,2*index+3),(2*index,2*index+3,2*index+2))]
        replace(obj, vertices, faces)
    bpy.context.view_layer.update()
    return dict(changedObjects=changed,ribForwardConstructionWU=7.7,ribLateralEdgesWU=[3.4,3.9],
                ribHeightWU=6.4,ribSpacingWU=1.6,pairedRibs=True,
                floorDropWU=[6.,1.8],ordinaryFogAuditRangeWU=[6.,9.],
                canopyStaticBridgeProgress=.516,
                infillHoopStations=list(hoop_stations),infillHoopDepthWU=.4,
                maximumConsecutiveHoopDistanceWU=.01*372,
                floorOnlySpans=[dict(name=n,start=a,end=b) for n,a,b,_ in floors],
                retainedTunnelGateAndWall=True,cameraAndPlaybackUnchanged=True,
                geometryVisibility="persistent; no visibility switches or masks")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def candidate_paths(source, output, report):
    paths = [Path(p).resolve() for p in (source,output,report)]
    source, output, report = paths
    repo = Path(__file__).resolve().parents[2]
    masters = [repo/"source-assets/about-surface-world/about-surface-world.blend",
               repo/"source-assets/about-rollercoaster-reset/about-rollercoaster.blend"]
    if source.suffix != ".blend" or not source.is_file() or output.suffix != ".blend" or output.exists():
        raise ValueError("Read an existing .blend and write a new candidate .blend")
    if output in masters+[source] or not output.is_relative_to(repo/"output"):
        raise ValueError("Candidate output must be isolated under output/, never a source master")
    protected = [source,output,*masters]
    if report.suffix != ".json" or report in protected or (report.exists() and any(p.exists() and report.samefile(p) for p in protected)):
        raise ValueError("Report must be a separate .json, never a source/candidate alias")
    if report.exists(): raise ValueError("Use a new report path; existing evidence is not overwritten")
    return source, output, report


def main():
    parser=argparse.ArgumentParser();parser.add_argument("--source",required=True)
    parser.add_argument("--output",required=True);parser.add_argument("--report",required=True)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    source,output,report=candidate_paths(args.source,args.output,args.report)
    before=digest(source);bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene
    result=refine_track_surfaces(scene, cleanup_unused_meshes=True)
    output.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(output))
    bpy.ops.wm.open_mainfile(filepath=str(output))
    if digest(source)!=before: raise ValueError("The input snapshot changed")
    result.update(source=str(source),sourceSha256=before,candidate=str(output),candidateSha256=digest(output),savedAndReopened=True)
    report.parent.mkdir(parents=True,exist_ok=True);report.write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps(result,indent=2))


if __name__=="__main__": main()
