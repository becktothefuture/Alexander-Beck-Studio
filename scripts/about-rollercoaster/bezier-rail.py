"""Fit an existing POLY flight rail with a small, editable tangent-continuous Bezier spline.

convert_rail(rail) mutates only that curve's spline after validating the fit.
It does not save, touch preview controls, change frames, replace the object,
or change its data identity, transforms, camera constraints or path duration.
CLI validation runs in an isolated Blender process and saves only --output.
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


def _unit(rows):
    norms = np.linalg.norm(rows, axis=-1, keepdims=True)
    if np.any(norms < 1e-10):
        raise ValueError('The rail contains a zero-length tangent.')
    return rows / norms


def _basis(t):
    return np.column_stack(((1-t)**3, 3*(1-t)**2*t, 3*(1-t)*t*t, t**3))


def _segment(points, distances, directions, tilts, a, b):
    p0, p3 = points[a], points[b]
    length = distances[b] - distances[a]
    t = (distances[a:b+1] - distances[a]) / length
    basis = _basis(t)
    baseline = (basis[:, 0]+basis[:, 1])[:, None]*p0 + (basis[:, 2]+basis[:, 3])[:, None]*p3
    matrix = np.column_stack(((basis[:, 1, None]*directions[a]).reshape(-1),
                              (-basis[:, 2, None]*directions[b]).reshape(-1)))
    lengths = np.linalg.lstsq(matrix, (points[a:b+1]-baseline).reshape(-1), rcond=None)[0]
    # Positive handles keep tangent direction and avoid pathological loops.
    lengths = np.clip(lengths, length*0.025, length*0.8)
    control = np.array((p0, p0+lengths[0]*directions[a], p3-lengths[1]*directions[b], p3))
    fitted = basis@control
    errors = np.linalg.norm(fitted-points[a:b+1], axis=1)
    derivative = 3*((1-t)**2)[:, None]*(control[1]-control[0]) + 6*((1-t)*t)[:, None]*(control[2]-control[1]) + 3*(t*t)[:, None]*(control[3]-control[2])
    angles = np.degrees(np.arccos(np.clip(np.sum(_unit(derivative)*directions[a:b+1], axis=1), -1, 1)))
    # Retain the original EASE bank score only for conservative knot selection.
    # Applied LINEAR bank is measured independently once the shape is fixed.
    bank = tilts[a] + (tilts[b]-tilts[a])*(t*t*(3-2*t))
    bank_errors = np.abs(bank-tilts[a:b+1])
    return {'a': a, 'b': b, 'control': control, 'errors': errors,
            'angles': angles, 'bank_errors': bank_errors, 'lengths': lengths}


def _straight_tail(points, directions):
    axis = _unit((points[-1]-points[-2])[None, :])[0]
    cross = np.linalg.norm(np.cross(points-points[-1], axis), axis=1)
    aligned = np.sum(directions*axis, axis=1) > math.cos(math.radians(0.1))
    index = len(points)-1
    while index > 0 and cross[index-1] < 0.0002 and aligned[index-1]:
        index -= 1
    return index if index < len(points)-2 else None


def convert_rail(rail, max_error=0.12, max_knots=64, initial_knots=20,
                 max_tangent_degrees=3.0, max_bank_degrees=2.0, resolution=64):
    """Return fit evidence; no saves or scene/preview state changes.

    Error units are world units, including the rail object's saved transform.
    Adaptive knots retain actual source positions, not a regenerated template.
    A shared tangent at each knot gives positive ALIGNED handles and geometric tangent continuity.
    """
    if rail.type != 'CURVE' or len(rail.data.splines) != 1:
        raise ValueError('Expected one editable Curve rail spline.')
    spline = rail.data.splines[0]
    if spline.type != 'POLY' or spline.use_cyclic_u:
        raise ValueError('Expected the existing open POLY flight rail.')
    if not (0 < max_error < 10 and 4 <= initial_knots <= max_knots <= 64):
        raise ValueError('Invalid fitting bounds.')
    if max_tangent_degrees <= 0 or max_bank_degrees <= 0:
        raise ValueError('Tangent and bank bounds must be positive.')
    animation = rail.data.animation_data
    channels = list(animation.drivers) if animation else []
    if animation and animation.action:
        channels += list(animation.action.fcurves)
    if any('splines[' in channel.data_path for channel in channels):
        raise ValueError('Animated source control points require an explicit animation migration.')
    local = np.array([tuple(point.co)[:3] for point in spline.points], dtype=float)
    tilts = np.unwrap(np.array([point.tilt for point in spline.points], dtype=float))
    radii = np.array([point.radius for point in spline.points], dtype=float)
    matrix = np.array(rail.matrix_world, dtype=float)
    points = (np.column_stack((local, np.ones(len(local))))@matrix.T)[:, :3]
    if len(points) < 4 or not np.isfinite(points).all() or not np.isfinite(tilts).all():
        raise ValueError('Invalid source rail values.')
    steps = np.linalg.norm(np.diff(points, axis=0), axis=1)
    if np.any(steps < 1e-8):
        raise ValueError('Duplicate source points need explicit cleanup before fitting.')
    distances = np.concatenate(([0.], np.cumsum(steps)))
    directions = _unit(np.gradient(points, distances, axis=0, edge_order=2))
    tail = _straight_tail(points, directions)
    knots = set(np.searchsorted(distances, np.linspace(0, distances[-1], initial_knots)).tolist())
    knots.update((0, len(points)-1))
    if tail is not None:
        knots = {index for index in knots if index <= tail}
        knots.update((tail, len(points)-1))
        directions[tail:] = _unit((points[-1]-points[tail])[None, :])[0]
    bank_bound = math.radians(max_bank_degrees)
    while True:
        ordered = sorted(knots)
        segments = [_segment(points, distances, directions, tilts, a, b)
                    for a, b in zip(ordered, ordered[1:])]
        worst, split = 0., None
        for segment in segments:
            score = np.maximum.reduce((segment['errors']/max_error,
                                       segment['angles']/max_tangent_degrees,
                                       segment['bank_errors']/bank_bound))
            score[0] = score[-1] = 0
            at = int(np.argmax(score))
            if score[at] > worst:
                worst, split = float(score[at]), segment['a']+at
        if worst <= 1:
            break
        if len(knots) >= max_knots or split in knots:
            raise ValueError(f'Cannot meet fit bounds with {max_knots} knots; worst normalized error {worst:.3f}; position {max(float(np.max(s["errors"])) for s in segments):.4f} WU, tangent {max(float(np.max(s["angles"])) for s in segments):.3f} deg, bank {math.degrees(max(float(np.max(s["bank_errors"])) for s in segments)):.3f} deg. Source was not changed.')
        knots.add(split)
    linear_bank_errors = []
    for a, b in zip(ordered, ordered[1:]):
        t = (distances[a:b+1]-distances[a])/(distances[b]-distances[a])
        linear_bank_errors.extend(np.abs(tilts[a]+(tilts[b]-tilts[a])*t-tilts[a:b+1]))
    applied_bank_error = math.degrees(float(max(linear_bank_errors)))
    if applied_bank_error > max_bank_degrees:
        raise ValueError(f'Applied LINEAR bank error {applied_bank_error:.3f} degrees exceeds {max_bank_degrees:.3f}; source was not changed.')
    inverse = np.linalg.inv(matrix)
    to_local = lambda value: tuple((inverse@np.append(value, 1.))[:3])
    # No source mutation happens before a bounded fit is available.
    original_duration = rail.data.path_duration
    original_twist = rail.data.twist_mode
    new = rail.data.splines.new('BEZIER')
    new.bezier_points.add(len(ordered)-1)
    new.resolution_u = resolution
    new.tilt_interpolation = 'LINEAR'
    new.radius_interpolation = spline.radius_interpolation
    for j, (point, index) in enumerate(zip(new.bezier_points, ordered)):
        point.co = local[index]
        point.handle_left_type = 'FREE'
        point.handle_right_type = 'FREE'
        left = segments[j-1]['control'][2] if j else points[index]-directions[index]*segments[0]['lengths'][0]
        right = segments[j]['control'][1] if j < len(segments) else points[index]+directions[index]*segments[-1]['lengths'][1]
        point.handle_left = to_local(left)
        point.handle_right = to_local(right)
        point.handle_left_type = 'ALIGNED'
        point.handle_right_type = 'ALIGNED'
        point.tilt = float(tilts[index])
        point.radius = float(radii[index])
    # Verify Blender's ALIGNED conversion retained the solved geometry.
    assigned_error = 0.
    for j, segment in enumerate(segments):
        a, b = new.bezier_points[j], new.bezier_points[j+1]
        actual = np.array([tuple(a.co), tuple(a.handle_right), tuple(b.handle_left), tuple(b.co)])
        actual = (np.column_stack((actual, np.ones(4)))@matrix.T)[:, :3]
        assigned_error = max(assigned_error, float(np.max(np.linalg.norm(actual-segment['control'], axis=1))))
    if assigned_error > 0.0001:
        rail.data.splines.remove(new)
        raise ValueError('Blender changed the solved ALIGNED handles; source retained.')
    rail.data.splines.remove(spline)
    rail.data.resolution_u = resolution
    rail.data.update_tag()
    assert rail.data.path_duration == original_duration and rail.data.twist_mode == original_twist
    report = {
        'sourcePoints': len(points), 'bezierKnots': len(ordered),
        'assignedHandleMaximumErrorWU': assigned_error,
        'maxPositionErrorWU': max(float(np.max(segment['errors'])) for segment in segments),
        'rmsPositionErrorWU': float(np.sqrt(np.mean(np.concatenate([s['errors'] for s in segments])**2))),
        'maxTangentErrorDegrees': max(float(np.max(segment['angles'])) for segment in segments),
        'maxScalarBankErrorDegrees': applied_bank_error,
        'bankErrorParameterization': 'source arc fraction within each retained segment',
        'selectionEaseBankScoreDegrees': math.degrees(max(float(np.max(s['bank_errors'])) for s in segments)),
        'sourceLengthWU': float(distances[-1]), 'sourceKnotIndices': ordered,
        'sourceKnotDistancesWU': [float(distances[index]) for index in ordered],
        'straightTailStartIndex': tail, 'straightTailLengthWU': float(distances[-1]-distances[tail]) if tail is not None else None,
        'handles': 'ALIGNED', 'tiltInterpolation': 'LINEAR', 'resolution': resolution,
        'pathDuration': original_duration, 'twistMode': original_twist,
        'limits': {'positionWU': max_error, 'tangentDegrees': max_tangent_degrees, 'bankDegrees': max_bank_degrees, 'maxKnots': max_knots},
    }
    return report


def _camera_samples(scene, camera, controls, count=2001):
    frame, subframe = scene.frame_current, scene.frame_subframe
    names = ('progress', 'referenceMode', 'ambientSeconds')
    saved = {name: controls[name] for name in names}
    rows = []
    try:
        controls['referenceMode'] = 0.
        controls['ambientSeconds'] = 0.
        for index in range(count):
            controls['progress'] = index/(count-1)
            controls.update_tag()
            scene.frame_set(1)
            bpy.context.view_layer.update()
            evaluated = camera.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world
            rows.append([index/(count-1), *evaluated.translation, *evaluated.to_quaternion()])
    finally:
        for name, value in saved.items(): controls[name] = value
        controls.update_tag()
        scene.frame_set(frame, subframe=subframe)
        bpy.context.view_layer.update()
    return rows


def _trajectory_report(rows):
    from mathutils import Quaternion
    positions = np.array([row[1:4] for row in rows])
    forward_angles, rolls = [], []
    for index, row in enumerate(rows):
        q = Quaternion(row[4:8])
        forward, right, up = q@Vector((0, 0, -1)), q@Vector((1, 0, 0)), q@Vector((0, 1, 0))
        delta = positions[min(index+1, len(rows)-1)]-positions[max(index-1, 0)]
        if np.linalg.norm(delta) > 1e-8:
            forward_angles.append(math.degrees(math.acos(np.clip(np.dot(forward, delta)/np.linalg.norm(delta), -1, 1))))
        rolls.append(math.degrees(math.atan2(right.z, up.z)))
    return {'maxLookFromTravelDegrees': max(forward_angles),
            'maxAbsoluteRollDegrees': max(abs(value) for value in rolls),
            'rollDegrees': rolls, 'lengthWU': float(np.linalg.norm(np.diff(positions, axis=0), axis=1).sum())}


def _mesh_identity(scene):
    payload = [(obj.name, [list(row) for row in obj.matrix_world],
                [list(vertex.co) for vertex in obj.data.vertices], [list(face.vertices) for face in obj.data.polygons])
               for obj in sorted(scene.objects, key=lambda item: item.name) if obj.type == 'MESH']
    return hashlib.sha256(json.dumps(payload).encode()).hexdigest()


def _cli_output_paths(value, source):
    requested = Path(value).absolute()
    if requested.exists() or requested.is_symlink():
        raise ValueError('Candidate output must be a new file.')
    if 'source-assets' in requested.parts:
        raise ValueError('CLI outputs must remain outside canonical source-assets.')
    output = requested.resolve()
    if output.suffix.lower() != '.blend':
        raise ValueError('The isolated CLI requires a new .blend candidate.')
    targets = (output, output.with_suffix('.report.json'), output.with_suffix('.camera.json'))
    source = source.resolve()
    for target in targets:
        resolved = target.resolve()
        if 'source-assets' in resolved.parts:
            raise ValueError('CLI outputs must remain outside canonical source-assets.')
        if resolved == source or (target.exists() and source.exists() and target.samefile(source)):
            raise ValueError('CLI outputs must not alias the input source.')
        if target.exists() or target.is_symlink():
            raise ValueError('Candidate and sidecar outputs must all be new files: '+str(target))
    if len({target.resolve() for target in targets}) != len(targets):
        raise ValueError('Candidate and sidecar outputs must be separate files.')
    return targets


def main():
    args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--max-error', type=float, default=.12)
    parser.add_argument('--max-knots', type=int, default=64)
    options = parser.parse_args(args)
    output, report_output, camera_output = _cli_output_paths(options.output, Path(bpy.data.filepath))
    scene = bpy.context.scene
    rail, camera, controls = (bpy.data.objects[name] for name in ('FlightRail', 'FlightCamera', 'About World Controls'))
    original_frame = (scene.frame_current, scene.frame_subframe)
    original_controls = dict(controls.items())
    original_matrix = rail.matrix_world.copy()
    identity, data_identity = rail.as_pointer(), rail.data.as_pointer()
    constraints = [(c.as_pointer(), c.target.as_pointer(), c.forward_axis, c.up_axis, c.use_curve_follow) for c in camera.constraints if c.type == 'FOLLOW_PATH']
    mesh_hash = _mesh_identity(scene)
    before = _camera_samples(scene, camera, controls)
    report = convert_rail(rail, max_error=options.max_error, max_knots=options.max_knots)
    assert identity == rail.as_pointer() and data_identity == rail.data.as_pointer()
    assert rail.matrix_world == original_matrix
    assert original_frame == (scene.frame_current, scene.frame_subframe)
    assert original_controls == dict(controls.items())
    assert constraints == [(c.as_pointer(), c.target.as_pointer(), c.forward_axis, c.up_axis, c.use_curve_follow) for c in camera.constraints if c.type == 'FOLLOW_PATH']
    after = _camera_samples(scene, camera, controls)
    assert mesh_hash == _mesh_identity(scene)
    old_report, new_report = _trajectory_report(before), _trajectory_report(after)
    positions = np.linalg.norm(np.array(before)[:, 1:4]-np.array(after)[:, 1:4], axis=1)
    rolls = np.abs(np.array(old_report.pop('rollDegrees'))-np.array(new_report.pop('rollDegrees')))
    report.update({'input': bpy.data.filepath, 'output': str(output), 'cameraSamples': len(after),
                   'cameraBefore': old_report, 'cameraAfter': new_report,
                   'maxCameraPositionChangeWU': float(positions.max()),
                   'maxCameraRollChangeDegrees': float(rolls.max()),
                   'previewStatePreserved': True, 'railAndDataIdentityPreserved': True,
                   'cameraConstraintPreserved': True, 'meshSha256': mesh_hash,
                   'meshCount': sum(obj.type == 'MESH' for obj in scene.objects)})
    assert np.isfinite(np.array(after)).all()
    assert np.linalg.norm(np.array(before[0][1:4])-np.array(after[0][1:4])) < 1e-5
    assert np.linalg.norm(np.array(before[-1][1:4])-np.array(after[-1][1:4])) < 1e-5
    output.parent.mkdir(parents=True, exist_ok=True)
    _cli_output_paths(output, Path(bpy.data.filepath))
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    bpy.ops.wm.open_mainfile(filepath=str(output))
    reopened = _camera_samples(bpy.context.scene, bpy.data.objects['FlightCamera'], bpy.data.objects['About World Controls'])
    report['reopenedCameraMaximumComponentError'] = float(np.max(np.abs(np.array(after)-np.array(reopened))))
    assert report['reopenedCameraMaximumComponentError'] < 1e-6
    assert _mesh_identity(bpy.context.scene) == mesh_hash
    report['savedSourceSha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
    with report_output.open('x') as stream:
        stream.write(json.dumps(report, indent=2))
    with camera_output.open('x') as stream:
        stream.write(json.dumps({'before': before, 'after': after}))
    print(json.dumps(report, indent=2))


if __name__ == '__main__': main()
