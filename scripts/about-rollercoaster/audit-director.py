"""Read the saved master; probe full turns and frame ownership without saving."""
import hashlib
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector

REPO = Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser()
parser.add_argument('--source',default=str(REPO/'source-assets/about-surface-world/about-surface-world.blend'))
parser.add_argument('--report')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
source = Path(args.source).resolve()
before = hashlib.sha256(source.read_bytes()).hexdigest()
sys.path.insert(0, str(Path(__file__).parent))
import about_director  # noqa: E402
bpy.ops.wm.open_mainfile(filepath=str(source), use_scripts=True)

about_director.register()
scene = bpy.context.scene
report = about_director.validate(scene)
controls = scene.objects['About World Controls']
controls['referenceMode'] = 0.
controls['ambientSeconds'] = 0.
original = [(c.angle, c.enabled) for c in scene.about_roll_cues]
original_bank=scene.about_bank_enabled
gate = about_director.family_objects(scene, scene.about_gate_families[0])[0]
checks = 0
max_tangent_error = 0.
parity=[]

for full_turns in (False, True):
    for i, cue in enumerate(scene.about_roll_cues):
        cue.angle = (720 if i == 0 else -720) if full_turns else original[i][0]
        cue.enabled = True
    for progress in (0., .224, .26, .298, .32, .374, .5, .7416, .78, .8082, .8766, .97, 1.):
        controls['progress'] = progress
        controls.update_tag(); scene.frame_set(1); bpy.context.view_layer.update()
        rolled = scene.camera.matrix_world.copy()
        environment = gate.matrix_world.copy()
        degrees = about_director.roll_degrees(progress)
        if not full_turns:parity.append([progress,about_director.bank_degrees(progress,scene),about_director.turn_degrees(progress,scene),degrees])
        assert abs(scene.camera.rotation_euler.z + math.radians(degrees)) < 1e-5
        for cue in scene.about_roll_cues: cue.enabled = False
        scene.about_bank_enabled=False
        bpy.context.view_layer.update()
        base = scene.camera.matrix_world.copy()
        forward = Vector((0, 0, -1))
        error = ((rolled.to_quaternion() @ forward) - (base.to_quaternion() @ forward)).length
        max_tangent_error = max(max_tangent_error, error)
        assert error < 1e-5 and (rolled.translation-base.translation).length < 1e-6
        expected = base.to_quaternion() @ Quaternion((0, 0, 1), -math.radians(degrees))
        assert abs(abs(expected.dot(rolled.to_quaternion()))-1) < 1e-5
        assert max(abs(environment[i][j]-gate.matrix_world[i][j]) for i in range(4) for j in range(4)) < 1e-8
        for cue in scene.about_roll_cues: cue.enabled = True
        scene.about_bank_enabled=original_bank
        checks += 1

for cue, (angle, enabled) in zip(scene.about_roll_cues, original):
    cue.angle = angle; cue.enabled = enabled
scene.about_bank_enabled=original_bank
# A rail edit must refresh the derived banking without a save or export.
rail=scene.objects['FlightRail'];point=rail.data.splines[0].bezier_points[5]
original_points=[(p.co.copy(),p.handle_left.copy(),p.handle_right.copy()) for p in rail.data.splines[0].bezier_points]
profile_before=about_director.bank_profile(scene)
point.co.x+=2;point.handle_left.x+=2;point.handle_right.x+=2
rail.data.update_tag();bpy.context.view_layer.update();bpy.context.view_layer.update()
assert profile_before != about_director._bank_cache[scene.as_pointer()][1], 'Rail edit did not update banking'
for point,values in zip(rail.data.splines[0].bezier_points,original_points):
    point.co,point.handle_left,point.handle_right=values
rail.data.update_tag();bpy.context.view_layer.update()

from director_curve_bank import profile_from_rail
# Ground-plane handedness is independent of the current authored rail.
right=[((0,0,0),(0,-10,0),(0,10,0)),((10,20,0),(0,20,0),(20,20,0))]
left=[tuple(tuple(-v if i==0 else v for i,v in enumerate(p)) for p in point) for point in right]
right_bank=profile_from_rail(right);left_bank=profile_from_rail(left)
assert max(p[1] for p in right_bank)>10 and min(p[1] for p in right_bank)>=0
assert max(abs(a[1]+b[1]) for a,b in zip(right_bank,left_bank))<1e-10
assert about_director.bank_degrees(0,scene)==about_director.bank_degrees(1,scene)==0
assert hashlib.sha256(source.read_bytes()).hexdigest() == before
report.update(nativePoseChecks=checks, maxTangentError=max_tangent_error,
              opticalRollLeavesEnvironmentFixed=True, fullTurnsVerified=True, sourceUnchanged=True,
              railEditUpdatesBank=True,insideCurveDirectionVerified=True,parity=parity)
if args.report:Path(args.report).write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='curveBank'}, indent=2))
