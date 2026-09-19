"""Independent evaluated source motion, camera, clearance and material evidence."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector
from mathutils.kdtree import KDTree

TAU=2*math.pi


def moved(point,g,time):
    if g["kind"]=="static":return point.copy()
    if g["kind"]=="rotate":
        theta=TAU*time/g["period"]+g["phase"]
        angle=theta if g["continuous"] else g["amplitude"]*math.sin(theta)
        pivot=Vector(g["pivot"])
        return pivot+Quaternion(Vector(g["axis"]),angle)@(point-pivot)
    local=point-Vector(g["origin"])
    u=local.dot(Vector(g["uAxis"]));v=local.dot(Vector(g["vAxis"]))
    q=min(1,max(0,(math.hypot(u,v)-g["quietRadius"])/g["quietFeather"]))
    q=q*q*(3-2*q)
    theta=TAU*time/g["period"]+g["phase"]
    offset=g["amplitude"]*q*(math.sin(TAU*u/g["wavelength"]+theta)+.5*math.sin(TAU*.73*v/g["wavelength"]-theta))/1.5
    return point+Vector(g["axis"])*offset


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--source",required=True);p.add_argument("--output",required=True)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:])
    source=Path(a.source).resolve();before=hashlib.sha256(source.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;controls=bpy.data.objects["About World Controls"]
    controls["referenceMode"]=0.
    groups=json.loads(scene["motionGroups"])
    for g in groups:
        if g["kind"]=="rotate":
            owner=next(o for o in scene.objects if o.type=="EMPTY" and o.get("motion_group")==g["id"])
            for key in ("amplitude","period","phase"):g[key]=float(owner[key])
            g["pivot"]=list(owner.location)
    objects=sorted((o for o in scene.objects if o.get("about_points")),key=lambda o:o.name)
    wave_links=[]
    for o in objects:
        for mod in o.modifiers:
            tree=mod.node_group
            output=next(n for n in tree.nodes if n.type=="GROUP_OUTPUT")
            old=output.inputs["Geometry"].links[0].from_socket
            if groups[o["motion_group"]]["kind"]=="wave":
                wave=next(n for n in tree.nodes if n.type=="SET_POSITION")
                tree.links.new(wave.outputs["Geometry"],output.inputs["Geometry"])
                wave_links.append((tree,old,output.inputs["Geometry"]))
            else:mod.show_viewport=False
    proof=[];maxerror=0.;minclear=1e9;worstclear=None
    for time in (0.,1.75,7.,14.):
        controls["ambientSeconds"]=time;controls["progress"]=.28;controls.update_tag();scene.frame_set(1);bpy.context.view_layer.update()
        dg=bpy.context.evaluated_depsgraph_get()
        cloud=[]
        for o in objects:
            g=groups[o["motion_group"]]
            pivot=Vector(o.parent.location) if o.parent else Vector((0,0,0))
            indices=sorted(set((0,len(o.data.vertices)//3,len(o.data.vertices)//2,len(o.data.vertices)-1)))
            if g["kind"]=="wave":
                evaluated=o.evaluated_get(dg);mesh=evaluated.to_mesh()
                actual=[evaluated.matrix_world@v.co for v in mesh.vertices]
                evaluated.to_mesh_clear()
            else:
                mat=o.evaluated_get(dg).matrix_world
                actual=[mat@v.co for v in o.data.vertices]
            cloud.extend(actual)
            for index in indices:
                rest=(o.matrix_local@o.data.vertices[index].co)+pivot if o.parent else o.matrix_world@o.data.vertices[index].co
                expected=moved(rest,g,time)
                error=(actual[index]-expected).length
                maxerror=max(maxerror,error)
                if g["kind"]!="static":proof.append(dict(object=o.name,index=index,group=g["id"],time=time,rest=list(rest),expected=list(expected),evaluated=list(actual[index]),errorWU=error))
        kd=KDTree(len(cloud))
        for i,pt in enumerate(cloud):kd.insert(pt,i)
        kd.balance()
        for index in range(401):
            controls["progress"]=index/400;controls.update_tag();scene.frame_set(1);bpy.context.view_layer.update()
            center=scene.camera.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world.translation
            _,_,distance=kd.find(center)
            clearance=distance-controls["circleRadius"]
            if clearance<minclear:minclear=clearance;worstclear=dict(progress=index/400,time=time)
    if maxerror>.001*5.1:raise ValueError(f"Motion parity error {maxerror}")
    if minclear<.5:raise ValueError(f"Camera collision {minclear} at {worstclear}")
    after=hashlib.sha256(source.read_bytes()).hexdigest()
    if before!=after:raise ValueError("Verification changed source")
    result=dict(sourceSha256=before,sourceUnchanged=True,motionSamples=proof,maxMotionErrorWU=maxerror,minimumCircleClearanceWU=minclear,worstClearance=worstclear,clearanceProgressSamples=401,ambientTimes=[0,1.75,7,14],packedImages=[dict(name=i.name,packed=bool(i.packed_file),size=list(i.size)) for i in bpy.data.images if "atlas" in i.name],limitations=["Clearance is sampled against actual circle centres/radii, not a continuous swept-triangle proof.","Four ambient phases are measured; conservative bounds and browser projected parity remain separate gates."])
    Path(a.output).write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({k:v for k,v in result.items() if k!="motionSamples"},indent=2),flush=True)


if __name__=="__main__":main()
