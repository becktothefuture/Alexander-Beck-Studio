"""Negative saved-source proofs. Never modifies the master or public bundle."""
import argparse
import hashlib
import importlib.util
import json
import shutil
import sys
from pathlib import Path

import bpy

p=argparse.ArgumentParser();p.add_argument("--source",required=True);p.add_argument("--output",required=True)
a=p.parse_args(sys.argv[sys.argv.index("--")+1:])
source=Path(a.source).resolve();out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
before=hashlib.sha256(source.read_bytes()).hexdigest()
repo=Path(__file__).resolve().parents[2]
destination=out/"unchanged-bundle";destination.mkdir(exist_ok=True)
for name in ("meta.json","camera.json","points.bin"):
    shutil.copy2(repo/"react-app/app/public/models/about-rollercoaster-world"/name,destination/name)
def pins():return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in destination.iterdir()}
original=pins()
spec=importlib.util.spec_from_file_location("export_world",Path(__file__).with_name("export-world.py"))
exporter=importlib.util.module_from_spec(spec);spec.loader.exec_module(exporter)
cases=[("radius", "spacing must be at least twice"), ("parent-scale", "Unsupported motion parent transform"),
       ("parent-delta", "Unsupported motion parent transform"), ("wave-transform", "must have an identity object transform"),
       ("point-parent", "must be parented to its declared motion owner"), ("static-parent", "Static point objects cannot be parented"),
       ("point-scale", "Point object scale must remain"), ("point-constraint", "Unsupported point object constraints"),
       ("point-animation", "Unsupported point object constraints")]
results=[]
for name,expected in cases:
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if name=="radius":bpy.data.objects["About World Controls"]["circleRadius"]=.2
    elif name.startswith("parent"):
        owner=next(o for o in scene.objects if o.type=="EMPTY" and o.get("motion_group") is not None)
        if name=="parent-scale":owner.scale.x=2
        else:owner.delta_rotation_euler.z=.2
    elif name=="wave-transform":
        groups=json.loads(scene["motionGroups"])
        wave=next(g["id"] for g in groups if g["kind"]=="wave")
        owner=next(o for o in scene.objects if o.get("about_points") and o["motion_group"]==wave)
        owner.location.x=1
    elif name=="point-parent":
        owner=next(o for o in scene.objects if o.get("about_points") and o.parent)
        owner.parent=None
    else:
        owner=next(o for o in scene.objects if o.get("about_points") and o["motion_group"]==0)
        if name=="static-parent":
            parent=bpy.data.objects.new("Invalid parent",None);scene.collection.objects.link(parent)
            parent.rotation_euler.z=.2;owner.parent=parent
        elif name=="point-scale":owner.scale.x=2
        elif name=="point-constraint":
            owner.constraints.new("COPY_LOCATION").target=scene.camera
        elif name=="point-animation":owner.keyframe_insert(data_path="location",frame=1)
    bad=out/f"invalid-{name}.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(bad))
    sys.argv=[__file__,"--","--source",str(bad),"--output",str(destination)]
    try:exporter.main()
    except ValueError as error:
        if expected not in str(error):raise
        results.append(dict(case=name,rejected=True,error=str(error),destinationUnchanged=pins()==original))
    else:raise AssertionError(f"Invalid source {name} was accepted")
    if pins()!=original:raise AssertionError("Failed export changed the destination")
after=hashlib.sha256(source.read_bytes()).hexdigest()
if before!=after:raise AssertionError("Negative proof changed the master")
result=dict(sourceSha256=before,sourceUnchanged=True,cases=results)
(out/"report.json").write_text(json.dumps(result,indent=2)+"\n")
print(json.dumps(result,indent=2),flush=True)
