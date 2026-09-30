"""Verify the saved look-ahead rig, rail edits and exported camera ownership."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

REPO=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser()
parser.add_argument('--report',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
source=REPO/'source-assets/about-surface-world/about-surface-world.blend'
source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
sys.path.insert(0,str(Path(__file__).parent))
import about_director as director
bpy.ops.wm.open_mainfile(filepath=str(source),use_scripts=True)
director.register()
scene=bpy.context.scene;controls=scene.objects['About World Controls']
controls['referenceMode']=0.;controls['ambientSeconds']=0.
original_ahead=scene.about_camera_look_ahead
SITE=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
track=json.loads((REPO/'react-app/app/public/models/about-rollercoaster-world/camera.json').read_text())
meta=json.loads((REPO/'react-app/app/public/models/about-rollercoaster-world/meta.json').read_text())
assert meta['source']['sha256']==source_hash
checks=[];position_error=0.;rotation_error=0.;aim_changes=[]

def update(progress):
    controls['progress']=progress;controls.update_tag();scene.frame_set(1);bpy.context.view_layer.update()
    return scene.camera.matrix_world.copy()

for row in track['samples'][::10]:
    p=row[0];steady=update(p)
    for name in ('FlightCamera','FlightCamera carrier','FlightCamera look ahead'):
        assert all(f.driver.is_valid and not f.mute for f in scene.objects[name].animation_data.drivers)
    exported=SITE@steady
    roll=director.roll_degrees(p,scene)
    expected=Quaternion((row[7],*row[4:7]))@Quaternion((0,0,1),-math.radians(roll))
    position_error=max(position_error,(exported.translation-Vector(row[1:4])).length)
    rotation_error=max(rotation_error,abs(1-abs(exported.to_quaternion().dot(expected))))
    scene.about_camera_look_ahead=0
    tangent=update(p)
    assert (steady.translation-tangent.translation).length<1e-4,'Steering moved the rail position'
    assert abs(director.roll_degrees(p,scene)-roll)<1e-8,'Steering changed optical roll'
    f=Vector((0,0,-1))
    aim_changes.append(math.degrees((steady.to_quaternion()@f).angle(tangent.to_quaternion()@f)))
    scene.about_camera_look_ahead=original_ahead
assert position_error<1e-4 and rotation_error<1e-5
assert 1<max(aim_changes)<8,'Look ahead must visibly anticipate bends within the forward corridor'
assert aim_changes[0]<.05 and aim_changes[-1]<.05,'Bookends must remain straight'
checks += ['201 saved native poses match the browser export','All camera drivers survive a fresh file load',
           'Live steering control preserves rail positions and optical turns','Opening and ending sightlines stay straight']

update(.3)
rail=scene.objects['FlightRail'];point=rail.data.splines[0].bezier_points[5]
old_length=scene.objects['FlightCamera carrier']['rail_length_wu']
old_target=scene.objects['FlightCamera look ahead'].matrix_world.translation.copy()
old_bank=director.bank_profile(scene)
point.co.x+=2;point.handle_left.x+=2;point.handle_right.x+=2
rail.data.update_tag();bpy.context.view_layer.update();bpy.context.view_layer.update();update(.3)
assert abs(scene.objects['FlightCamera carrier']['rail_length_wu']-old_length)>.001
assert (scene.objects['FlightCamera look ahead'].matrix_world.translation-old_target).length>.001
assert director.bank_profile(scene)!=old_bank
checks.append('Rail edit updates sightline distance, target and inward bank live')
assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
checks.append('The audit never changes the saved master')
report=dict(checks=checks,sourceSha256=source_hash,nativePoses=201,maxPositionErrorWU=position_error,
            maxQuaternionDotError=rotation_error,maxAnticipationDegrees=max(aim_changes),sourceUnchanged=True)
Path(args.report).write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
