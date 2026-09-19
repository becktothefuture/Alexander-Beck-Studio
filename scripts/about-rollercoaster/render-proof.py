"""Render the saved world's real camera and packed Home billboards."""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--source",required=True)
    p.add_argument("--output",required=True)
    p.add_argument("--progress",default=".10,.28,.82,1")
    p.add_argument("--time",type=float,default=3.0)
    p.add_argument("--width",type=int,default=960)
    p.add_argument("--height",type=int,default=600)
    p.add_argument("--theme",choices=("dark","light"),default="dark")
    p.add_argument("--samples",type=int,default=8)
    p.add_argument("--engine",choices=("CYCLES","BLENDER_EEVEE_NEXT"),default="CYCLES")
    p.add_argument("--film",action="store_true")
    p.add_argument("--start",type=float,default=.04)
    p.add_argument("--end",type=float,default=.40)
    p.add_argument("--fps",type=int,default=12)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:])
    bpy.ops.wm.open_mainfile(filepath=str(Path(a.source).resolve()))
    scene=bpy.context.scene
    controls=bpy.data.objects["About World Controls"]
    controls["referenceMode"]=0.
    controls["ambientSeconds"]=a.time
    controls["previewTheme"]=float(a.theme=="light")
    scene.render.resolution_x=a.width;scene.render.resolution_y=a.height
    scene.cycles.samples=a.samples
    scene.eevee.taa_render_samples=a.samples
    scene.render.engine=a.engine
    scene.cycles.transparent_max_bounces=32
    scene.cycles.max_bounces=2
    if a.theme=="light":
        scene.world.node_tree.nodes["Background"].inputs[0].default_value=(.91,.91,.91,1)
    # Match the site's stable horizontal lens with the portrait vertical cap.
    h=math.radians(70)
    if a.height>a.width:
        h=min(h,2*math.atan(a.width/a.height))
    scene.camera.data.lens=36/(2*math.tan(h/2))
    dest=Path(a.output);dest.mkdir(parents=True,exist_ok=True)
    if a.film:
        duration=(a.end-a.start)*controls["referenceSeconds"]
        count=round(duration*a.fps)
        poses=[a.start+(a.end-a.start)*i/count for i in range(count+1)]
    else:poses=list(map(float,a.progress.split(",")))
    for index,progress in enumerate(poses):
        if a.film:controls["ambientSeconds"]=progress*controls["referenceSeconds"]
        controls["progress"]=progress;controls.update_tag();scene.frame_set(1);bpy.context.view_layer.update()
        name=f"frame-{index:05d}.png" if a.film else f"p{progress:.3f}-{a.width}x{a.height}-{a.theme}.png"
        scene.render.filepath=str(dest/name)
        bpy.ops.render.render(write_still=True)
        print("RENDERED "+scene.render.filepath,flush=True)


if __name__=="__main__":main()
