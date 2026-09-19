"""Report actual circle intrusion into the source's conservative reading columns."""
import argparse
import json
import math
from pathlib import Path
import numpy as np

p=argparse.ArgumentParser();p.add_argument("--bundle",required=True);p.add_argument("--output",required=True)
a=p.parse_args();root=Path(a.bundle)
meta=json.loads((root/"meta.json").read_text());camera=json.loads((root/"camera.json").read_text())["samples"]
rows=np.fromfile(root/"points.bin",dtype="<f4").reshape(-1,6)
positions=rows[:,:3].astype(float)
results=[]
for time in (0,1.75,7,14):
    world=positions.copy()
    for g in meta["motionGroups"]:
        mask=rows[:,5]==g["id"]
        points=positions[mask]
        if g["kind"]=="rotate":
            axis=np.array(g["axis"]);pivot=np.array(g["pivot"])
            theta=2*math.pi*time/g["period"]+g["phase"]
            angle=theta if g["continuous"] else g["amplitude"]*math.sin(theta)
            v=points-pivot;c=math.cos(angle);s=math.sin(angle)
            world[mask]=pivot+v*c+np.cross(axis,v)*s+np.sum(v*axis,axis=1)[:,None]*axis*(1-c)
        elif g["kind"]=="wave":
            local=points-np.array(g["origin"]);u=np.sum(local*g["uAxis"],axis=1);v=np.sum(local*g["vAxis"],axis=1)
            q=np.clip((np.hypot(u,v)-g["quietRadius"])/g["quietFeather"],0,1);q=q*q*(3-2*q)
            theta=2*math.pi*time/g["period"]+g["phase"]
            wave=g["amplitude"]*q*(np.sin(2*math.pi*u/g["wavelength"]+theta)+.5*np.sin(2*math.pi*.73*v/g["wavelength"]-theta))/1.5
            world[mask]=points+wave[:,None]*g["axis"]
    for beat in meta["beats"]:
        if beat["kind"]!="prose" and beat["id"]!="departure":continue
        hits=[]
        for progress in np.linspace(beat["start"],beat["end"],61):
            sample=camera[round(progress*(len(camera)-1))]
            x,y,z,w=sample[4:8]
            right=np.array([1-2*(y*y+z*z),2*(x*y+w*z),2*(x*z-w*y)])
            up=np.array([2*(x*y-w*z),1-2*(x*x+z*z),2*(y*z+w*x)])
            forward=-np.array([2*(x*z+w*y),2*(y*z-w*x),1-2*(x*x+y*y)])
            delta=world-np.array(sample[1:4]);depth=np.sum(delta*forward,axis=1)
            horizontal=np.abs(np.sum(delta*right,axis=1));vertical=np.abs(np.sum(delta*up,axis=1))
            inside=(depth>.1)&(depth<meta["fog"]["far"])&(horizontal<.50*depth+meta["circleField"]["radius"])&(vertical<depth+meta["circleField"]["radius"])
            indices=np.where(inside)[0]
            if len(indices):
                names=[dict(name=o["object"],count=int(((indices>=o["start"])&(indices<o["end"])).sum())) for o in meta["pointObjects"]]
                hits.append(dict(progress=float(progress),count=len(indices),objects=[n for n in names if n["count"]]))
        results.append(dict(beat=beat["id"],time=time,poses=61,intrusionPoses=len(hits),worst=max((h["count"] for h in hits),default=0),hits=hits))
report=dict(source=meta["source"],method="Full-height central column through the source fog limit; half-width0.50xdepth conservatively includes the measured desktop/portrait columns and24px margin. Conservative portrait vertical extent.",fogFarWU=meta["fog"]["far"],results=results)
Path(a.output).write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps([{k:v for k,v in r.items() if k!="hits"} for r in results],indent=2))
