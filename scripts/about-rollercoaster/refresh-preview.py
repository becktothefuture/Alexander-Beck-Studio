"""Refresh packed preview materials only; preserve authored points and camera."""
import argparse
import importlib.util
import json
import sys
from pathlib import Path
import bpy

p=argparse.ArgumentParser()
p.add_argument("--source",required=True);p.add_argument("--materials",required=True)
a=p.parse_args(sys.argv[sys.argv.index("--")+1:])
bpy.ops.wm.open_mainfile(filepath=str(Path(a.source).resolve()))
spec=importlib.util.spec_from_file_location("build_world",Path(__file__).with_name("build-world.py"))
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
controls=bpy.data.objects["About World Controls"]
controls["previewTheme"]=0.
controls["sampledSpacing"]=.23
points={o.name:o for o in bpy.context.scene.objects if o.get("about_points")}
for o in points.values():
    for mod in list(o.modifiers):o.modifiers.remove(mod)
for o in list(bpy.data.objects):
    if o.name.startswith("Home billboard prototype"):bpy.data.objects.remove(o,do_unlink=True)
for mat in list(bpy.data.materials):
    if mat.name.startswith("Home gradient role"):bpy.data.materials.remove(mat,do_unlink=True)
builder.create_preview(points,json.loads(bpy.context.scene["motionGroups"]),controls,bpy.context.scene.camera,Path(a.materials),bpy.data.collections["PreviewGuides"])
bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.source).resolve()))
