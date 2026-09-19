"""Offline, no-save audit of an already bound About source.

Run Blender --background --enable-autoexec --python this.py -- --candidate FILE.
Only JSON evidence is written. No nodes/modifiers are created. Geometry edits
are in memory and restored in finally blocks; input file hashes are checked.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

REPO = Path(__file__).resolve().parents[2]
DEFAULT_ROOT = REPO/'output/about-bezier-binding-20260919'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def update(progress=0., ambient=0.):
    controls = bpy.data.objects['About World Controls']
    controls['referenceMode'] = 0.
    controls['progress'] = progress
    controls['ambientSeconds'] = ambient
    controls.update_tag()
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()


def meshes():
    return sorted((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o:o.name)


def evaluated(obj):
    value = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = value.to_mesh()
    try:
        return {'vertices': np.array([list(value.matrix_world@v.co) for v in mesh.vertices]),
                'faces': [list(p.vertices) for p in mesh.polygons]}
    finally:
        value.to_mesh_clear()


def snapshot():
    return {obj.name: evaluated(obj) for obj in meshes()}


def identities():
    return {obj.name: {'id': str(obj.get('about_surface_id', obj.name)),
                      'materials': [(slot.material.name, slot.material.get('about_palette_role'))
                                    if slot.material else None for slot in obj.material_slots],
                      'motionGroup': int(obj.get('motion_group', 0)),
                      'baseFaces': [list(face.vertices) for face in obj.data.polygons],
                      'baseVertexCount': len(obj.data.vertices)} for obj in meshes()}


def changes(before, after):
    result = {}
    for name, old in before.items():
        new = after[name]
        assert old['vertices'].shape == new['vertices'].shape, f'{name}: evaluated topology changed'
        assert old['faces'] == new['faces'], f'{name}: face indices changed'
        distances = np.linalg.norm(old['vertices']-new['vertices'], axis=1)
        result[name] = {'maxWU': float(distances.max()), 'rmsWU': float(np.sqrt(np.mean(distances**2)))}
    return result


def camera_pose(progress):
    update(progress)
    matrix = bpy.data.objects['FlightCamera'].evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world
    return np.array(matrix.translation), np.array(matrix.to_quaternion()@Vector((0, 0, -1)))


def camera_audit(count=2001):
    poses = [camera_pose(i/(count-1)) for i in range(count)]
    positions = np.array([p[0] for p in poses]); forward = np.array([p[1] for p in poses])
    delta = np.gradient(positions, axis=0); lengths = np.linalg.norm(delta, axis=1)
    moving = lengths > 1e-6
    angles = np.degrees(np.arccos(np.clip(np.sum(forward[moving]*delta[moving], axis=1)/lengths[moving], -1, 1)))
    assert np.isfinite(positions).all() and float(angles.max()) < 8, 'Camera must face forward travel'
    update()
    return positions, {'samples': count, 'maxForwardErrorDegrees': float(angles.max()),
                       'pathLengthWU': float(np.linalg.norm(np.diff(positions, axis=0), axis=1).sum())}


def bindings():
    result = {}; stations = {}
    rail = bpy.data.objects['FlightRail']
    for obj in meshes():
        if obj.get('about_track_binding') == 'normalized-surface-v1':
            assert obj.get('about_track_reference_length') == 360, obj.name
            modifiers = [m for m in obj.modifiers if m.type == 'NODES' and m.name == 'Follow FlightRail']
            assert len(modifiers) == 1 and modifiers[0].node_group and modifiers[0].show_viewport, obj.name
            assert modifiers[0].node_group.name == 'About · Live Track Surface', obj.name
            xs = [float(v.co.x)/360 for v in obj.data.vertices]
            stations[obj.name] = xs
            result[obj.name] = {'kind': 'normalized-surface-v1', 'minFactor': min(xs), 'maxFactor': max(xs)}
        else:
            parent = obj.parent
            while parent and parent.get('about_track_binding') != 'normalized-anchor-v1': parent = parent.parent
            assert parent is not None, f'{obj.name}: missing rail binding'
            follows = [c for c in parent.constraints if c.type == 'FOLLOW_PATH' and c.target == rail]
            assert len(follows) == 1, parent.name
            c = follows[0]
            assert c.use_fixed_location and c.use_curve_follow and c.forward_axis == 'FORWARD_Y' and c.up_axis == 'UP_Z', parent.name
            assert 0 <= c.offset_factor <= 1, parent.name
            stations[obj.name] = float(c.offset_factor)
            result[obj.name] = {'kind': 'normalized-anchor-v1', 'carrier': parent.name, 'factor': float(c.offset_factor)}
    # Preserve empty authored motion carriers too, even when users removed a child mesh.
    for carrier in bpy.context.scene.objects:
        if carrier.get('about_track_binding') != 'normalized-anchor-v1': continue
        follows = [c for c in carrier.constraints if c.type == 'FOLLOW_PATH' and c.target == rail]
        assert len(follows) == 1, carrier.name
        c = follows[0]
        assert c.use_fixed_location and c.use_curve_follow and c.forward_axis == 'FORWARD_Y' and c.up_axis == 'UP_Z', carrier.name
        assert 0 <= c.offset_factor <= 1, carrier.name
        stations['@carrier/'+carrier.name] = float(c.offset_factor)
    return result, stations


def wall_audit():
    final = json.loads(bpy.context.scene['finalGrid'])
    wall = next(obj for obj in meshes() if str(obj.get('about_surface_id', obj.name)) == final['objectId'])
    assert len(wall.data.vertices) == 4 and len(wall.data.polygons) == 1
    face = list(wall.data.polygons[0].vertices)
    assert len(face) == 4 and set(face) == set(range(4))
    p = [wall.data.vertices[i].co.copy() for i in face]
    u, v = p[1]-p[0], p[3]-p[0]; n = u.cross(v).normalized()
    assert u.length > 1 and v.length > 1
    assert abs((p[2]-p[0]).dot(n)) < 1e-5
    assert abs(u.normalized().dot(v.normalized())) < 1e-5
    assert (p[0]+u+v-p[2]).length < 1e-4
    assert wall.material_slots[0].material.get('about_palette_role') == 6
    return {'object': wall.name, 'completePlanarQuad': True, 'widthWU': u.length, 'heightWU': v.length}


def clearance(geometry, positions):
    vertices = []; polygons = []; owners = []
    for name, value in geometry.items():
        offset = len(vertices); vertices.extend(value['vertices'].tolist())
        polygons.extend([[i+offset for i in face] for face in value['faces']])
        owners.extend([name]*len(value['faces']))
    bvh = BVHTree.FromPolygons(vertices, polygons)
    nearest = [bvh.find_nearest(Vector(p)) for p in positions]
    distances = [float(hit[3]) for hit in nearest]
    minimum_index = int(np.argmin(distances))
    assert all(math.isfinite(d) for d in distances)
    return {'minimumSurfaceDistanceWU': min(distances), 'atProgress': minimum_index/(len(distances)-1),
            'surface': owners[nearest[minimum_index][2]],
            'scope': 'Nearest evaluated surface at ambientSeconds=0; excludes circle radius and moving-phase collision certification.'}


def run(candidate, reference):
    bpy.ops.wm.open_mainfile(filepath=str(reference)); update()
    old_ids, old_geometry = identities(), snapshot()
    source_positions, source_camera = camera_audit()
    source_clearance = clearance(old_geometry, source_positions)
    bpy.ops.wm.open_mainfile(filepath=str(candidate))
    scene = bpy.context.scene; controls = bpy.data.objects['About World Controls']
    frame = (scene.frame_current, scene.frame_subframe)
    saved_controls = {name: controls[name] for name in ('progress', 'referenceMode', 'ambientSeconds')}
    rail = bpy.data.objects['FlightRail']; points = rail.data.splines[0].bezier_points
    saved_points = [(p.co.copy(), p.handle_left.copy(), p.handle_right.copy(), p.tilt) for p in points]
    def restore_rail():
        for p, (co, left, right, tilt) in zip(points, saved_points):
            p.co = co; p.handle_left = left; p.handle_right = right; p.tilt = tilt
        rail.data.update_tag(); update()
    try:
        update()
        assert len(meshes()) == len(old_ids) == 36
        assert identities() == old_ids, 'Mesh names/IDs, material roles, groups or topology changed'
        assert len(rail.data.splines) == 1 and rail.data.splines[0].type == 'BEZIER' and len(points) == 48
        assert all(p.handle_left_type == p.handle_right_type == 'ALIGNED' for p in points)
        assert min((a.co-b.co).length for a,b in zip(points, list(points)[1:])) > 1e-5
        baseline = snapshot(); binding, stations = bindings()
        source_changes = changes(old_geometry, baseline)
        for name, change in source_changes.items():
            assert change['maxWU'] <= .25, f'{name}: source preservation exceeds 0.25 WU Bezier fit allowance'
        positions, camera_report = camera_audit()
        wall = wall_audit()
        middle = min(range(1,len(points)-1), key=lambda i:(rail.matrix_world@points[i].co-Vector(positions[len(positions)//2])).length)
        point_world = np.array(rail.matrix_world@points[middle].co)
        factor = int(np.argmin(np.linalg.norm(positions-point_world, axis=1)))/(len(positions)-1)
        camera_before = camera_pose(factor)[0]
        p = points[middle]; delta = Vector((0,0,3))
        p.co += delta; p.handle_left += delta; p.handle_right += delta
        rail.data.update_tag(); camera_after = camera_pose(factor)[0]; update()
        moved = changes(baseline, snapshot())
        assert np.linalg.norm(camera_after-camera_before) > .1, 'Middle edit did not move camera'
        for name in ('Canopy · left ribbon', 'Canopy · right ribbon'):
            assert binding[name]['kind'] == 'normalized-surface-v1'
            assert moved[name]['maxWU'] > 2., f'{name}: affected static surface did not follow 3 WU middle edit'
        restore_rail(); restored = changes(baseline, snapshot())
        assert max(v['maxWU'] for v in restored.values()) < 1e-5, 'Rail edit did not restore geometry'
        assert np.linalg.norm(camera_pose(factor)[0]-camera_before) < 1e-5
        update()
        endpoint = points[-1]; delta = (endpoint.co-points[-2].co).normalized()*6
        endpoint.co += delta; endpoint.handle_left += delta; endpoint.handle_right += delta
        rail.data.update_tag(); update()
        _, extended_stations = bindings()
        assert extended_stations == stations, 'Length edit changed normalized surface/carrier stations'
        end_after = camera_pose(1)[0]; end_shift = float(np.linalg.norm(end_after-positions[-1]))
        assert end_shift > 5.9, 'Endpoint extension did not move camera'
        update(); extended = changes(baseline, snapshot())
        restore_rail(); assert max(v['maxWU'] for v in changes(baseline,snapshot()).values()) < 1e-5
        motion = {}
        for seconds in (1.25, 3.75):
            update(ambient=seconds)
            motion[str(seconds)] = changes(baseline, snapshot())
        update()
        moving_names = [o.name for o in meshes() if int(o.get('motion_group',0)) != 0]
        for name in moving_names:
            assert any(motion[t][name]['maxWU'] > .001 for t in motion), f'{name}: source-bound motion is frozen'
        return {'passed': True, 'meshCount':36, 'railKnots':48, 'identitiesMaterialsTopologyPreserved':True,
                'baselineVersusSourceAmbient0':source_changes, 'sourcePreservationAllowanceWU':.25, 'bindings':binding,
                'carrierCount':sum(key.startswith('@carrier/') for key in stations),
                'camera':camera_report, 'sourceCamera':source_camera, 'wall':wall,
                'sourceClearanceAmbient0':source_clearance, 'clearanceAmbient0':clearance(baseline,positions),
                'middleEdit':{'control':middle,'progress':factor,'cameraChangeWU':float(np.linalg.norm(camera_after-camera_before)),
                              'surfaceChanges':moved,'restorationMaxWU':max(v['maxWU'] for v in restored.values())},
                'lengthEdit':{'normalizedStationsUnchanged':True,'cameraEndpointChangeWU':end_shift,'surfaceChanges':extended},
                'sourceBoundMotion':motion}
    finally:
        restore_rail()
        for key,value in saved_controls.items(): controls[key] = value
        controls.update_tag(); scene.frame_set(frame[0],subframe=frame[1]); bpy.context.view_layer.update()


def _same_file(a, b):
    return a.resolve() == b.resolve() or (a.exists() and b.exists() and a.samefile(b))


def _report_path(output, candidate, reference):
    output = output.resolve()
    if output.suffix.lower() != '.json':
        raise ValueError('Audit output must be a separate .json report.')
    if any(_same_file(output, source) for source in (candidate, reference)):
        raise ValueError('Audit output must not alias a candidate or reference source.')
    if output.exists() and not output.is_file():
        raise ValueError('Audit output must be a regular JSON file.')
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate',required=True,type=Path)
    parser.add_argument('--reference',type=Path,default=DEFAULT_ROOT/'recovery/live-before.blend')
    parser.add_argument('--output',type=Path,default=DEFAULT_ROOT/'audit/report.json')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    candidate, reference = args.candidate.resolve(), args.reference.resolve()
    if _same_file(candidate, reference):
        raise ValueError('Audit a separate bound candidate, not an alias of the reference.')
    output = _report_path(args.output, candidate, reference)
    hashes = {str(p):sha(p) for p in (candidate,reference)}
    try:
        report = run(candidate,reference)
    except Exception as error:
        report = {'passed':False,'error':str(error)}
        raise
    finally:
        report.update(inputSha256=hashes)
        output.parent.mkdir(parents=True,exist_ok=True)
        _report_path(output, candidate, reference)
        output.write_text(json.dumps(report,indent=2))
        # Verify after report I/O, not only before it.
        unchanged = all(sha(Path(p)) == digest for p,digest in hashes.items())
        report['inputFilesUnchanged'] = unchanged
        _report_path(output, candidate, reference)
        output.write_text(json.dumps(report,indent=2))
        assert all(sha(Path(p)) == digest for p,digest in hashes.items()), 'Input source file changed after report writing'
        print(json.dumps(report,indent=2))
        assert unchanged, 'Input source file changed during offline audit'


if __name__ == '__main__': main()
