"""Convert the current simple surfaces to normalized, live FlightRail coordinates.

Run before replacing the old POLY rail. This file changes only mesh coordinates,
ordinary transforms, native Follow Path constraints and ambient drivers. It never
creates Geometry Nodes or their modifiers. Assign the shared track graph through
the structured Blender tools after conversion, then edit the rail.

Static mesh coordinates: X = whole-rail fraction * 360, Y = right, Z = up.
The shared graph uses Sample Curve Normal for right and Normal cross Tangent for
up. Outside X=0..360, retain the excess as an endpoint-tangent offset in WU.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

REFERENCE_LENGTH = 360.0


def evaluated_matrix(obj):
    bpy.context.view_layer.update()
    return obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world.copy()


def follow_anchor(scene, rail, name, station):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.empty_display_type = 'PLAIN_AXES'
    obj.empty_display_size = .6
    constraint = obj.constraints.new('FOLLOW_PATH')
    constraint.name = 'Fixed normalized FlightRail station'
    constraint.target = rail
    constraint.use_fixed_location = True
    constraint.use_curve_follow = True
    constraint.forward_axis = 'FORWARD_Y'
    constraint.up_axis = 'UP_Z'
    constraint.offset_factor = station
    obj['about_track_binding'] = 'normalized-anchor-v1'
    obj['about_track_station'] = station  # Informational; constraint is authoritative.
    return obj


class OldRailFrames:
    """Capture exact native path frames while the original rail is still present."""
    def __init__(self, scene, rail):
        points = np.asarray([tuple(rail.matrix_world @ Vector(p.co[:3]))
                             for p in rail.data.splines[0].points], dtype=float)
        self.starts = points[:-1]
        self.edges = np.diff(points, axis=0)
        self.lengths = np.linalg.norm(self.edges, axis=1)
        if np.any(self.lengths < 1e-8):
            raise ValueError('Remove duplicate rail points before binding')
        self.cumulative = np.r_[0., np.cumsum(self.lengths)]
        self.total = float(self.cumulative[-1])
        self.helper = follow_anchor(scene, rail, 'Temporary binding frame', 0.)
        self.cache = {}

    def frame(self, station):
        station = float(max(0., min(1., station)))
        key = round(station, 12)
        if key not in self.cache:
            self.helper.constraints[0].offset_factor = station
            self.cache[key] = evaluated_matrix(self.helper)
        return self.cache[key]

    def nearest_station(self, point):
        relative = np.asarray(point) - self.starts
        along = np.clip(np.einsum('ij,ij->i', relative, self.edges) / self.lengths**2, 0., 1.)
        errors = relative - self.edges * along[:, None]
        index = int(np.argmin(np.einsum('ij,ij->i', errors, errors)))
        return float((self.cumulative[index] + along[index]*self.lengths[index]) / self.total)

    def unroll(self, point):
        station = self.nearest_station(point)
        # A POLY constraint interpolates its tangent frame. Solve its normal plane
        # instead of dropping the small longitudinal component at a bent vertex.
        for _ in range(12):
            local = self.frame(station).inverted() @ point
            if abs(local.y) < 2e-5 or (station == 0. and local.y <= 0.) or (station == 1. and local.y >= 0.):
                break
            step = 2e-5
            low, high = max(0., station-step), min(1., station+step)
            derivative = ((self.frame(high).inverted() @ point).y -
                          (self.frame(low).inverted() @ point).y) / (high-low)
            if abs(derivative) < self.total*.05:
                raise ValueError('Ambiguous rail-normal projection; inspect this surface before binding')
            station = max(0., min(1., station - local.y/derivative))
        frame = self.frame(station)
        local = frame.inverted() @ point
        extension = local.y if station in (0., 1.) else 0.
        encoded = Vector((station*REFERENCE_LENGTH+extension, local.x, local.z))
        rebuilt = frame @ Vector((local.x, extension, local.z))
        error = (rebuilt-point).length
        if error > .0002:
            raise ValueError(f'Cannot preserve source vertex in rail coordinates: {error:.6f} WU')
        return encoded, error

    def close(self):
        bpy.data.objects.remove(self.helper, do_unlink=True)


def reset_transform(obj, parent=None):
    obj.parent = parent
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.matrix_basis = Matrix.Identity(4)
    obj.delta_location = (0., 0., 0.)
    obj.delta_rotation_euler = (0., 0., 0.)
    obj.delta_rotation_quaternion = (1., 0., 0., 0.)
    obj.delta_scale = (1., 1., 1.)


def write_vertices(obj, vertices):
    if obj.data.users > 1:
        obj.data = obj.data.copy()
    for vertex, value in zip(obj.data.vertices, vertices):
        vertex.co = value
    obj.data.update()


def bind_track(scene=None, cleanup_helper=True):
    """Convert current objects once, preserving user deletions and material slots.

    The graph assignment and wall-wave LOCAL vector update remain explicit next
    steps for structured Blender tools. This function neither saves nor changes
    the rail/camera. Existing ambient equations retain their controls and timing.
    """
    scene = scene or bpy.context.scene
    rail, controls = (scene.objects[n] for n in ('FlightRail', 'About World Controls'))
    surfaces = [o for o in scene.objects if o.type == 'MESH' and o.get('about_surface_id')]
    if scene.get('about_schema') != 'about-rollercoaster-world/v2' or not surfaces:
        raise ValueError('Expected an authored simple-surface v2 scene')
    if len(rail.data.splines) != 1 or rail.data.splines[0].type != 'POLY':
        raise ValueError('Bind against the original POLY rail before replacing it with Bezier controls')
    if any(o.get('about_track_binding') for o in surfaces):
        raise ValueError('Source surfaces are already bound; do not convert twice')
    groups = json.loads(scene['motionGroups'])
    owners = {g['id']: next(o for o in scene.objects if o.type == 'EMPTY' and o.get('motion_group') == g['id'])
              for g in groups if g['kind'] == 'rotate'}
    for owner in owners.values():
        animation = owner.animation_data
        if (owner.parent or owner.constraints or not animation or animation.action or animation.nla_tracks or
            {(d.data_path, d.array_index) for d in animation.drivers} != {('rotation_quaternion', i) for i in range(4)} or
            any(abs(s-1.) > 1e-6 for s in (*owner.scale, *owner.delta_scale)) or
            any(d.array_index and 'sin(' not in d.driver.expression for d in animation.drivers)):
            raise ValueError(f'Unsupported ambient owner: {owner.name}')
    for obj in surfaces:
        group = groups[int(obj.get('motion_group', 0))]
        if obj.animation_data or obj.constraints or obj.data.shape_keys:
            raise ValueError(f'Apply unsupported direct animation before binding {obj.name}')
        if group['kind'] != 'wave' and obj.modifiers:
            raise ValueError(f'Bind base surfaces before adding modifiers: {obj.name}')
        if group['kind'] == 'rotate' and obj.parent != owners[group['id']]:
            raise ValueError(f'Unexpected ambient parent on {obj.name}')
    names = [f'Track anchor · {o.name}' for o in owners.values()] + ['Track anchor · Final wall']
    if any(name in bpy.data.objects for name in names):
        raise ValueError('Track anchor names already exist; inspect the current binding first')
    state = {key: controls[key] for key in ('progress', 'ambientSeconds', 'referenceMode')}
    frame_state = scene.frame_current, scene.frame_subframe
    frames = None
    try:
        for key in state:
            controls[key] = 0.
        controls.update_tag()
        scene.frame_set(1)
        bpy.context.view_layer.update()
        frames = OldRailFrames(scene, rail)
        world = {}
        for obj in surfaces:
            matrix = evaluated_matrix(obj)
            world[obj.name] = [matrix @ vertex.co for vertex in obj.data.vertices]
        owner_plans, plans, rows = {}, {}, []
        # Prepare and validate every coordinate before changing any real object.
        for gid, owner in owners.items():
            group = groups[gid]
            pivot = evaluated_matrix(owner).translation
            station = frames.nearest_station(pivot)
            carrier = frames.frame(station)
            axis = Vector(group['axis']).normalized()
            local_axis = (carrier.to_quaternion().inverted() @ axis).normalized()
            local_pivot = carrier.inverted() @ pivot
            phase, amplitude = float(owner['phase']), float(owner['amplitude'])
            angle = phase if group['continuous'] else amplitude*math.sin(phase)
            inverse_phase = Quaternion(axis, angle).inverted()
            owner_plans[gid] = dict(station=station, frame=carrier, axis=local_axis, pivot=local_pivot)
            for obj in surfaces:
                if int(obj.get('motion_group', 0)) == gid:
                    plans[obj.name] = [carrier.to_quaternion().inverted() @ (inverse_phase @ (p-pivot)) for p in world[obj.name]]
        wall_group = next(g for g in groups if g['kind'] == 'wave')
        wall = next(o for o in surfaces if int(o.get('motion_group', 0)) == wall_group['id'])
        endpoint = frames.frame(1.)
        plans[wall.name] = [endpoint.inverted() @ p for p in world[wall.name]]
        for obj in surfaces:
            if int(obj.get('motion_group', 0)):
                continue
            pairs = [frames.unroll(point) for point in world[obj.name]]
            plans[obj.name] = [p[0] for p in pairs]
            rows.append(dict(object=obj.name, kind='normalized-surface-v1', vertices=len(pairs),
                             minX=min(p[0].x for p in pairs), maxX=max(p[0].x for p in pairs),
                             maxReconstructionErrorWU=max(p[1] for p in pairs)))
        for gid, owner in owners.items():
            plan = owner_plans[gid]
            anchor = follow_anchor(scene, rail, f'Track anchor · {owner.name}', plan['station'])
            reset_transform(owner, anchor)
            owner.location = plan['pivot']
            owner['motion_axis_local'] = list(plan['axis'])
            owner['about_track_binding'] = 'normalized-rotation-v1'
            owner['motion_axis_space'] = 'ANCHOR_LOCAL'
            for fcurve in owner.animation_data.drivers:
                if fcurve.array_index:
                    expression = fcurve.driver.expression
                    sine = expression.find('sin(')
                    fcurve.driver.expression = f'{plan["axis"][fcurve.array_index-1]:.17g}*' + expression[sine:]
            rows.append(dict(object=owner.name, kind='normalized-anchor-v1', station=plan['station'], axisLocal=list(plan['axis'])))
        wall_anchor = follow_anchor(scene, rail, 'Track anchor · Final wall', 1.)
        for obj in surfaces:
            gid = int(obj.get('motion_group', 0))
            reset_transform(obj, wall_anchor if obj == wall else owners.get(gid))
            write_vertices(obj, plans[obj.name])
            if gid == 0:
                obj['about_track_binding'] = 'normalized-surface-v1'
                obj['about_track_reference_length'] = REFERENCE_LENGTH
            elif obj == wall:
                obj['about_track_binding'] = 'normalized-endpoint-v1'
        for key in ('axis', 'uAxis', 'vAxis'):
            wall_group[key] = list((endpoint.to_quaternion().inverted() @ Vector(wall_group[key])).normalized())
        wall_group['origin'] = list(endpoint.inverted() @ Vector(wall_group['origin']))
        wall_group['space'] = 'LOCAL'
        wall_group['object'] = wall.name
        scene['motionGroups'] = json.dumps(groups)
        scene['about_track_binding'] = 'normalized-world-v1'
        report = dict(meshCount=len(surfaces), meshNames=sorted(o.name for o in surfaces),
                      staticMeshes=len(rows)-len(owners), rotatingOwners=len(owners),
                      originalRailLengthWU=frames.total, referenceLengthWU=REFERENCE_LENGTH,
                      maxStaticReconstructionErrorWU=max(r.get('maxReconstructionErrorWU', 0.) for r in rows),
                      pendingStaticModifier='Follow FlightRail / About · Live Track Surface',
                      pendingWallWave='Update existing wave graph vectors from the LOCAL group, using structured tools',
                      temporaryHelper=None if cleanup_helper else frames.helper.name,
                      waveGroup=wall_group, objects=rows,
                      cameraAndRailUntouched=True, scriptedGeometryNodesChanges=False)
        return report
    finally:
        if frames and cleanup_helper:
            frames.close()
        for key, value in state.items():
            controls[key] = value
        controls.update_tag()
        scene.frame_set(frame_state[0], subframe=frame_state[1])
        bpy.context.view_layer.update()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True)
    parser.add_argument('--candidate', required=True)
    parser.add_argument('--report', required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    source, candidate, report = (Path(p).resolve() for p in (args.source, args.candidate, args.report))
    repo = Path(__file__).resolve().parents[2]
    if (source.suffix != '.blend' or candidate.suffix != '.blend' or report.suffix != '.json' or
        candidate.exists() or report.exists() or candidate == source or report in (source, candidate) or
        candidate.is_relative_to(repo/'source-assets') or report.is_relative_to(repo/'source-assets')):
        raise ValueError('Use a saved source and NEW isolated .blend/.json outputs outside source-assets')
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source))
    result = bind_track()
    candidate.parent.mkdir(parents=True, exist_ok=True)
    report.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(candidate))
    if hashlib.sha256(source.read_bytes()).hexdigest() != before:
        raise ValueError('Input source changed')
    result.update(source=str(source), sourceSha256=before, candidate=str(candidate),
                  candidateSha256=hashlib.sha256(candidate.read_bytes()).hexdigest())
    report.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
