"""Export a SAVED editable Blender world; never invokes its authoring builder."""
import argparse
import hashlib
import json
import math
import os
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector
from mathutils.kdtree import KDTree

SITE=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))


def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def atomic(path,data):
    tmp=path.with_suffix(path.suffix+".tmp")
    tmp.write_bytes(data)
    os.replace(tmp,path)


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--source",required=True)
    p.add_argument("--output",required=True)
    p.add_argument("--report")
    p.add_argument("--staging-only",action="store_true",help="Write an isolated proof bundle without publishing it")
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:])
    source=Path(a.source).resolve(); dest=Path(a.output).resolve()
    source_identity=source.relative_to(Path(__file__).resolve().parents[2]).as_posix()
    publisher=Path(__file__).resolve().parents[1]/"lib"/"about-rollercoaster-publish.mjs"
    node=shutil.which("node")
    if not a.staging_only:
        if not node:raise RuntimeError("Project Node runtime is required to validate before publication")
        subprocess.run([node,str(publisher),"--check-contract","about-rollercoaster-world/v1"],check=True)
    before=sha(source)
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if scene.get("about_schema")!="about-rollercoaster-world/v1": raise ValueError("Wrong world schema")
    controls=bpy.data.objects["About World Controls"]
    camera=bpy.data.objects["FlightCamera"]
    rail=bpy.data.objects["FlightRail"]
    if camera.type!="CAMERA" or rail.type!="CURVE": raise ValueError("Missing source camera/rail")
    if scene.camera!=camera or camera.data.type!="PERSP" or camera.data.sensor_fit!="HORIZONTAL" or abs(camera.data.shift_x)+abs(camera.data.shift_y)>1e-7:
        raise ValueError("FlightCamera must be the active fixed horizontal perspective camera without lens shift")
    constraints=[c for c in camera.constraints if c.type=="FOLLOW_PATH" and c.target==rail and c.use_curve_follow]
    if len(constraints)!=1: raise ValueError("Camera must have one live FlightRail constraint")
    controls["referenceMode"]=0.
    controls["ambientSeconds"]=0.
    controls.update_tag();scene.frame_set(1);bpy.context.view_layer.update()
    radius=float(controls["circleRadius"]);spacing=float(controls["circleSpacing"])
    if not 0<radius or spacing<2*radius: raise ValueError("Circle spacing must be at least twice its positive radius")
    if abs(spacing-float(controls.get("sampledSpacing",.23)))>1e-7:
        raise ValueError("Circle spacing changed: resample the authored surfaces before exporting")
    if abs(math.degrees(camera.data.angle_x)-70)>.01: raise ValueError("Expected fixed H70 camera")
    groups=json.loads(scene["motionGroups"])
    motion_owners={}
    if len(groups)>32 or [g["id"] for g in groups]!=list(range(len(groups))) or groups[0]["kind"]!="static": raise ValueError("Invalid motion group identities")
    for g in groups:
        if g.get("clock","ambient")!="ambient":raise ValueError("Only ambient motion is supported")
        if g["kind"]=="rotate":
            owner=next((o for o in scene.objects if o.type=="EMPTY" and o.get("motion_group")==g["id"]),None)
            if owner is None: raise ValueError("Missing rotation controller")
            motion_owners[g["id"]]=owner
            if (owner.parent or owner.rotation_mode!="QUATERNION" or owner.constraints or
                any(abs(v-1)>1e-6 for v in (*owner.scale,*owner.delta_scale)) or
                owner.delta_location.length>1e-6 or Vector(owner.delta_rotation_euler).length>1e-6 or
                abs(owner.delta_rotation_quaternion.w-1)>1e-6 or
                (owner.animation_data and owner.animation_data.action)):
                raise ValueError(f"Unsupported motion parent transform on {owner.name}; apply scale to the child point mesh")
            expected=Quaternion(Vector(g["axis"]),g["phase"] if g["continuous"] else float(owner["amplitude"])*math.sin(float(owner["phase"])))
            actual=owner.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world.to_quaternion()
            if expected.rotation_difference(actual).angle>1e-5:
                raise ValueError(f"Unsupported rest rotation on {owner.name}; retain its authored axis driver")
            for key in ("amplitude","period","phase"):g[key]=float(owner[key])
            g["pivot"]=list(owner.location)
        elif g["kind"] not in ("static","wave"):
            raise ValueError("Unsupported source motion")
        for key in ("axis","pivot","origin","uAxis","vAxis"):
            if key in g:g[key]=list(SITE.to_3x3()@Vector(g[key]))
    rows=[]; point_objects=[]; ranges=[]
    for o in sorted((o for o in scene.objects if o.get("about_points")),key=lambda o:(int(o["motion_group"]),o.name)):
        gid=int(o["motion_group"]);role=int(o["palette_index"])
        if not 0<=gid<len(groups) or not 0<=role<6:raise ValueError("Invalid point material/group")
        if any(abs(v-1)>1e-6 for v in (*o.scale,*o.delta_scale)):
            raise ValueError(f"Point object scale must remain 1 on {o.name}; edit mesh vertices to retain the shared billboard radius")
        if o.constraints or o.animation_data or o.data.shape_keys:
            raise ValueError(f"Unsupported point object constraints, animation or shape keys on {o.name}")
        if any(mod.type!="NODES" or mod.name!="Home camera-facing circle preview" for mod in o.modifiers):
            raise ValueError(f"Unsupported point geometry modifier on {o.name}")
        if groups[gid]["kind"]=="static" and o.parent:
            raise ValueError(f"Static point objects cannot be parented: {o.name}")
        if groups[gid]["kind"]=="rotate" and o.parent!=motion_owners[gid]:
            raise ValueError(f"Point object {o.name} must be parented to its declared motion owner")
        if groups[gid]["kind"]=="wave" and (o.parent or any(abs(o.matrix_world[i][j]-(1 if i==j else 0))>1e-6 for i in range(4) for j in range(4))):
            raise ValueError(f"Wave point object {o.name} must have an identity object transform; edit its mesh vertices instead")
        start=len(rows)
        pivot=Vector(o.parent.location) if o.parent else Vector((0,0,0))
        for v in o.data.vertices:
            # Preserve direct hand edits, including object transforms. Ambient rotation
            # is applied by the shared group equation after these rest positions.
            rest=(o.matrix_local@v.co)+pivot if o.parent else o.matrix_world@v.co
            x,y,z=SITE.to_3x3()@rest
            rows.append((x,y,z,radius,float(role),float(gid)))
        ranges.append(dict(object=o.name,start=start,end=len(rows),motionGroup=gid,paletteIndex=role))
        point_objects.append(o)
    if not rows:raise ValueError("Source has no points")
    samples=[];previous=None
    for i in range(2001):
        progress=i/2000
        controls["progress"]=progress
        controls.update_tag();scene.frame_set(1);bpy.context.view_layer.update()
        mat=SITE@camera.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world
        q=mat.to_quaternion().normalized()
        if previous is not None and previous.dot(q)<0:q.negate()
        previous=q.copy()
        samples.append([progress,*mat.translation,q.x,q.y,q.z,q.w])
    total=sum((Vector(b[1:4])-Vector(a[1:4])).length for a,b in zip(samples,samples[1:]))
    deviations=[]
    for i,s in enumerate(samples[:-1]):
        delta=Vector(samples[i+1][1:4])-Vector(s[1:4])
        if delta.length<1e-6:continue
        forward=Quaternion((s[7],s[4],s[5],s[6]))@Vector((0,0,-1))
        deviations.append((s[0],math.degrees(forward.angle(delta))))
    max_dev=max(d for _,d in deviations)
    if max_dev>8:raise ValueError(f"Camera forward fails: {max_dev}")
    final_deviation=max(d for p,d in deviations if p>=.90)
    if final_deviation>3:raise ValueError(f"Final forward fails: {final_deviation}")
    # Bound every supported ambient phase without depending on a few chosen times.
    max_step=max((Vector(b[1:4])-Vector(a[1:4])).length for a,b in zip(samples,samples[1:]))
    clearance=float("inf")
    for g in groups:
        positions=[Vector(row[:3]) for row in rows if int(row[5])==g["id"]]
        if not positions:continue
        tree=KDTree(len(positions))
        for i,position in enumerate(positions):tree.insert(position,i)
        tree.balance()
        sweep=0.
        if g["kind"]=="rotate":
            axis=Vector(g["axis"]);pivot=Vector(g["pivot"])
            radial=max(((v-pivot)-axis*(v-pivot).dot(axis)).length for v in positions)
            sweep=2*radial*(1 if g["continuous"] else math.sin(min(math.pi,abs(g["amplitude"]))/2))
        elif g["kind"]=="wave":sweep=abs(g["amplitude"])
        clearance=min(clearance,min(tree.find(Vector(s[1:4]))[2] for s in samples)-sweep-radius-max_step/2)
    if clearance<.5:raise ValueError(f"Camera clearance fails the all-phase motion bound: {clearance:.4f} WU")
    # In-memory perturbation proves the rail is live, then restores it without writing source.
    controls["progress"]=.10;controls.update_tag();scene.frame_set(1);bpy.context.view_layer.update()
    baseline=camera.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world.translation.copy()
    pts=rail.data.splines[0].points
    index=round(.10/.97*(len(pts)-1))
    saved=[(j,pts[j].co.copy()) for j in range(max(0,index-5),min(len(pts),index+6))]
    for j,v in saved:pts[j].co.x+=.25
    rail.data.update_tag();bpy.context.view_layer.update()
    changed=camera.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world.translation.copy()
    live_delta=(changed-baseline).length
    for j,v in saved:pts[j].co=v
    rail.data.update_tag();bpy.context.view_layer.update()
    if live_delta<.02:raise ValueError(f"Rail is disconnected: {live_delta}")
    camera_bytes=(json.dumps(dict(samples=samples),separators=(",",":"))+"\n").encode()
    points_bytes=b"".join(struct.pack("<6f",*r) for r in rows)
    final_grid=json.loads(scene["finalGrid"])
    for key in ("origin","normal","uAxis","vAxis"):final_grid[key]=list(SITE.to_3x3()@Vector(final_grid[key]))
    final_grid["pointRanges"]=[dict(start=r["start"],end=r["end"]) for r in ranges if r["motionGroup"]==final_grid["motionGroup"]]
    meta=dict(schema=scene["about_schema"],source=dict(file=source_identity,sha256=before),camera=dict(file="camera.json",horizontalFov=70,portraitVerticalFov=90),cameraSha256=hashlib.sha256(camera_bytes).hexdigest(),points=dict(file="points.bin",count=len(rows),strideFloats=6,sha256=hashlib.sha256(points_bytes).hexdigest()),circleField=dict(radius=radius,spacing=spacing),fog=dict(near=controls["fogNear"],far=controls["fogFar"]),beats=json.loads(scene["beats"]),motionGroups=groups,regions=json.loads(scene["regions"]),finalGrid=final_grid,totalDistanceWU=total,referenceSeconds=controls["referenceSeconds"],controls=json.loads(scene["controlDefinitions"]),materialReference=json.loads(scene["materialReference"]),pointObjects=ranges)
    if scene.get("readingProtection"):meta["readingProtection"]=json.loads(scene["readingProtection"])
    meta["cameraClearance"]=dict(minimumWU=clearance,method="Nearest rest circle minus analytic maximum group displacement, circle radius and half the maximum sampled camera step",samples=len(samples),allAmbientPhases=True)
    if sha(source)!=before:raise ValueError("Source changed during export")
    dest.parent.mkdir(parents=True,exist_ok=True)
    if a.staging_only:
        if dest==(Path(__file__).resolve().parents[2]/"react-app/app/public/models/about-rollercoaster-world").resolve():
            raise ValueError("The public bundle cannot bypass validation")
        dest.mkdir(parents=True,exist_ok=True)
        stage=dest
    else:stage=Path(tempfile.mkdtemp(prefix=".about-rollercoaster-stage-",dir=dest.parent))
    try:
        atomic(stage/"points.bin",points_bytes)
        atomic(stage/"camera.json",camera_bytes)
        atomic(stage/"meta.json",(json.dumps(meta,indent=2)+"\n").encode())
        if not a.staging_only:subprocess.run([node,str(publisher),str(stage),str(dest)],check=True)
    finally:
        if not a.staging_only:shutil.rmtree(stage,ignore_errors=True)
    report=dict(source=str(source),sourceSha256=before,sourceUnchanged=True,pointCount=len(rows),cameraSamples=len(samples),distanceWU=total,maxForwardDeviationDegrees=max_dev,finalForwardDeviationDegrees=final_deviation,conservativeCameraClearanceWU=clearance,liveRailPerturbationWU=live_delta,output=str(dest))
    if a.report:Path(a.report).write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report,indent=2),flush=True)


if __name__=="__main__":main()
