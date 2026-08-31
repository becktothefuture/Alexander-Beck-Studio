"""Fit the saved rail's open approaches without reshaping either gate passage.

Run with the reviewed source loaded in background Blender. All changes stay in
an explicit candidate. The 17 editable Bezier anchors, existing GN generators,
camera hierarchy, roll keys, gate aperture sizes and FOV remain authoritative.
Only open straight approaches gain distance. Every path binding is remapped to
the same physical place on the extended rail before the candidate is saved.
"""

import argparse
import bisect
import hashlib
import json
import math
import random
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def arc_knots(points, resolution):
    distances = [0.0]
    for first, last in zip(points, points[1:]):
        a, b, c, d = first[0], first[2], last[1], last[0]
        previous, length = a, 0.0
        for index in range(1, resolution + 1):
            t = index / resolution
            position = a * (1-t)**3 + b * (3*(1-t)**2*t) + c * (3*(1-t)*t*t) + d * t**3
            length += (position-previous).length
            previous = position
        distances.append(distances[-1] + length)
    return distances


def set_input(obj, name, value):
    for modifier in obj.modifiers:
        if modifier.type != 'NODES':
            continue
        for socket in modifier.node_group.interface.items_tree:
            if socket.item_type == 'SOCKET' and socket.in_out == 'INPUT' and socket.name == name:
                if isinstance(value, (float, int)):
                    socket.max_value = max(socket.max_value, value)
                modifier[socket.identifier] = value
                return
    raise RuntimeError(f'Missing {obj.name} input {name}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate-blend', required=True)
    parser.add_argument('--baseline-source-sha256', required=True)
    parser.add_argument('--opening-extension', type=float, required=True)
    parser.add_argument('--terrain-extension', type=float, required=True)
    parser.add_argument('--terminal-extension', type=float, required=True)
    parser.add_argument('--allocation-baseline', required=True,
                        help='Reviewed metadata whose object/profile populations stay in the saved source.')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source = Path(bpy.data.filepath).resolve()
    destination = Path(args.candidate_blend).resolve()
    if source == destination or 'about-v2-blender-current' in destination.parts:
        raise RuntimeError('Write a separate reading-space candidate first.')
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != args.baseline_source_sha256:
        raise RuntimeError('The source no longer matches the reviewed baseline.')
    allocation_baseline = json.loads(Path(args.allocation_baseline).read_text())
    if allocation_baseline['source']['sha256'] != source_hash:
        raise RuntimeError('Allocation metadata does not belong to the reviewed source.')
    extensions = [args.opening_extension, args.terrain_extension, args.terminal_extension]
    if not all(0 <= value <= 2000 for value in extensions):
        raise RuntimeError('Each authored extension must remain within 0–2000 WU.')
    scene = bpy.context.scene
    scene.frame_set(1)
    path = bpy.data.objects['ABS_PARAMETRIC_RIDE_PATH']
    spline = path.data.splines[0]
    if spline.type != 'BEZIER' or len(spline.bezier_points) != 17:
        raise RuntimeError('The reviewed 17-anchor source rail is required.')
    original = [(p.co.copy(), p.handle_left.copy(), p.handle_right.copy()) for p in spline.bezier_points]
    old_distances = arc_knots(original, path.data.resolution_u)
    old_length = old_distances[-1]
    opening, terrain, terminal = extensions
    shifts = [0.0] + [opening]*6 + [opening+terrain]*8 + [opening+terrain+terminal*0.5, opening+terrain+terminal]
    # Scale handles along their existing tangents where a straight approach is
    # extended. This retains C1 joins and leaves all gate-segment handles intact.
    for index, point in enumerate(spline.bezier_points):
        co, left, right = original[index]
        point.handle_left_type = 'FREE'
        point.handle_right_type = 'FREE'
        shifted = co + Vector((0, shifts[index], 0))
        point.co = shifted
        for side, neighbour in [('left', index-1), ('right', index+1)]:
            handle = left if side == 'left' else right
            scale = 1.0
            if 0 <= neighbour < len(original):
                delta_y = abs(original[neighbour][0].y - co.y)
                added = abs(shifts[neighbour] - shifts[index])
                if added > 0:
                    if delta_y < 10:
                        raise RuntimeError('Only the reviewed open approaches may gain distance.')
                    scale += added / delta_y
            setattr(point, f'handle_{side}', shifted + (handle-co)*scale)
        point.handle_left_type = 'ALIGNED'
        point.handle_right_type = 'ALIGNED'
    new_points = [(p.co.copy(), p.handle_left.copy(), p.handle_right.copy()) for p in spline.bezier_points]
    new_distances = arc_knots(new_points, path.data.resolution_u)
    new_length = new_distances[-1]

    def remap(progress):
        old_distance = max(0, min(1, float(progress))) * old_length
        index = min(len(old_distances)-2, max(0, bisect.bisect_right(old_distances, old_distance)-1))
        fraction = (old_distance-old_distances[index]) / (old_distances[index+1]-old_distances[index])
        return (new_distances[index] + fraction*(new_distances[index+1]-new_distances[index])) / new_length

    bindings = []
    for obj in scene.objects:
        for modifier in obj.modifiers:
            if modifier.type != 'NODES':
                continue
            for socket in modifier.node_group.interface.items_tree:
                if socket.item_type != 'SOCKET' or socket.in_out != 'INPUT':
                    continue
                if socket.name in ['Start on Path (0-1)', 'End on Path (0-1)']:
                    before = float(modifier[socket.identifier])
                    modifier[socket.identifier] = remap(before)
                    bindings.append([obj.name, socket.name, before, modifier[socket.identifier]])
        if obj.type == 'MESH':
            attribute = obj.data.attributes.get('abs_path')
            if attribute and attribute.domain == 'POINT':
                for item in attribute.data:
                    item.value = remap(item.value)
        if obj.get('abs_camera_path_range'):
            obj['abs_camera_path_range'] = json.dumps([remap(p) for p in json.loads(obj['abs_camera_path_range'])])
        for constraint in obj.constraints:
            if constraint.type != 'FOLLOW_PATH' or constraint.target != path:
                continue
            data_path = constraint.path_from_id('offset_factor')
            driven = obj.animation_data and any(c.data_path == data_path for c in obj.animation_data.drivers)
            if not driven:
                constraint.offset_factor = remap(constraint.offset_factor)
        if obj.get('abs_path_progress') is not None and obj.name != 'ABS_CAMERA_ROLL_DRIVER':
            obj['abs_path_progress'] = remap(obj['abs_path_progress'])

    if scene.get('abs_narrative_stage_ranges'):
        ranges = json.loads(scene['abs_narrative_stage_ranges'])
        scene['abs_narrative_stage_ranges'] = json.dumps({
            key: [remap(value) for value in values] for key, values in ranges.items()
        })

    driver = bpy.data.objects['ABS_CAMERA_ROLL_DRIVER']
    curve = next(c for c in driver.animation_data.action.fcurves if c.data_path == '["abs_path_progress"]')
    times = {float(key.co.x) for key in curve.keyframe_points}
    for distance in old_distances[1:-1]:
        value = distance/old_length
        left, right = float(scene.frame_start), float(scene.frame_end)
        for _ in range(50):
            middle = (left+right)/2
            if curve.evaluate(middle) < value:
                left = middle
            else:
                right = middle
        times.add((left+right)/2)
    keys = [(time, remap(curve.evaluate(time))) for time in sorted(times)]
    curve.keyframe_points.clear()
    for time, value in keys:
        key = curve.keyframe_points.insert(time, value, options={'FAST'})
        key.interpolation = 'LINEAR'
    curve.update()
    lookahead = bpy.data.objects['ABS_CAMERA_LOOKAHEAD_FOLLOWER']
    for c in lookahead.animation_data.drivers:
        if c.data_path.endswith('.offset_factor'):
            # Preserve the baseline's actual look-ahead distance while updating
            # the normalised-path denominator; gate aim has its own live spacing.
            c.driver.expression = f'min(progress + look_ahead / {1450.0*new_length/old_length:.9f}, 1.0)'
    endpoint = spline.bezier_points[-1].co
    bpy.data.objects['ABS_CAMERA_FINALE_AIM'].location = endpoint + Vector((0, 140, 0))

    # Existing authored controls establish a real circulation nave, not a
    # projected mask. Whole populations and semantic palettes remain intact.
    for name, values in {
        'GN_SIGNAL_FIELD': {'Field Radius': 48.0, 'Corridor Radius': 38.0, 'Vertical Scale': 1.3},
        'GN_NEBULA_FIELD': {'Field Radius': 68.0, 'Corridor Radius': 40.0, 'Vertical Scale': 1.4},
        'GN_SIGNAL_APERTURE': {'Start Scale': 13.5, 'End Scale': 13.5},
        'GN_RIBBON_CANYON': {'Protected Corridor': 0.2, 'Centre Relief': 0.0},
        'GN_RESPONSIVE_LATTICE': {'Lattice Depth': 230.0+terminal, 'Corridor Width': 80.0},
    }.items():
        for name_input, value in values.items():
            set_input(bpy.data.objects[name], name_input, value)
    # Give the complete reading column a real deep valley. The broad terrain
    # remains connected and retains its banks; no points are removed by view or
    # text coordinates. This is saved editable geometry, not a runtime mask.
    canyon_group = next(m.node_group for m in bpy.data.objects['GN_RIBBON_CANYON'].modifiers if m.type == 'NODES')
    group_out = next(n for n in canyon_group.nodes if n.type == 'GROUP_OUTPUT')
    upstream = group_out.inputs['Geometry'].links[0].from_socket
    lateral = canyon_group.nodes.new('GeometryNodeInputNamedAttribute')
    lateral.data_type = 'FLOAT'
    lateral.inputs['Name'].default_value = 'abs_u'
    lateral.label = 'Authored lateral terrain coordinate'
    absolute = canyon_group.nodes.new('ShaderNodeMath')
    absolute.operation = 'ABSOLUTE'
    canyon_group.links.new(lateral.outputs['Attribute'], absolute.inputs[0])
    depth = canyon_group.nodes.new('ShaderNodeMapRange')
    depth.label = 'Deep continuous reading valley'
    depth.clamp = True
    depth.interpolation_type = 'SMOOTHERSTEP'
    depth.inputs['From Min'].default_value = 0.23
    depth.inputs['From Max'].default_value = 0.6
    depth.inputs['To Min'].default_value = -280.0
    depth.inputs['To Max'].default_value = 0.0
    canyon_group.links.new(absolute.outputs[0], depth.inputs['Value'])
    offset = canyon_group.nodes.new('ShaderNodeCombineXYZ')
    canyon_group.links.new(depth.outputs['Result'], offset.inputs['Z'])
    valley = canyon_group.nodes.new('GeometryNodeSetPosition')
    valley.label = 'Keep full-height reading clear in physical space'
    canyon_group.links.new(upstream, valley.inputs['Geometry'])
    canyon_group.links.new(offset.outputs[0], valley.inputs['Offset'])
    canyon_group.links.new(valley.outputs['Geometry'], group_out.inputs['Geometry'])
    # Preserve every vertex and the total point budget. Sampling now favours
    # the continuous upper shoulders rather than the hidden deep approach.
    canyon = bpy.data.objects['GN_RIBBON_CANYON']
    sampling = canyon.data.attributes.get('abs_reading_weight') or canyon.data.attributes.new(
        name='abs_reading_weight', type='FLOAT', domain='POINT')
    for item, lateral_value in zip(sampling.data, canyon.data.attributes['abs_u'].data):
        u = abs(lateral_value.value)
        item.value = 0.0001 + math.exp(-((u - 0.54) / 0.055) ** 2)
    old_density = canyon_group.nodes.new('GeometryNodeInputNamedAttribute')
    old_density.data_type = 'FLOAT'
    old_density.inputs['Name'].default_value = 'abs_density_weight'
    reading_density = canyon_group.nodes.new('GeometryNodeInputNamedAttribute')
    reading_density.data_type = 'FLOAT'
    reading_density.inputs['Name'].default_value = 'abs_reading_weight'
    weight = canyon_group.nodes.new('ShaderNodeMath')
    weight.operation = 'MULTIPLY'
    canyon_group.links.new(old_density.outputs['Attribute'], weight.inputs[0])
    canyon_group.links.new(reading_density.outputs['Attribute'], weight.inputs[1])
    density_store = canyon_group.nodes.new('GeometryNodeStoreNamedAttribute')
    density_store.data_type = 'FLOAT'
    density_store.domain = 'POINT'
    density_store.inputs['Name'].default_value = 'abs_density_weight'
    canyon_group.links.new(valley.outputs['Geometry'], density_store.inputs['Geometry'])
    canyon_group.links.new(weight.outputs[0], density_store.inputs['Value'])
    canyon_group.links.new(density_store.outputs['Geometry'], group_out.inputs['Geometry'])
    # Continuous shoulders occupy the sides of the full-height reading column.
    # The floor remains connected below it; no projected masks or point culling.
    shoulder = canyon_group.nodes.new('ShaderNodeMapRange')
    shoulder.label = 'Continuous tall canyon shoulders'
    shoulder.clamp = True
    shoulder.interpolation_type = 'SMOOTHERSTEP'
    for name, value in [('From Min', 0.43), ('From Max', 0.63), ('To Min', 0), ('To Max', 105)]:
        shoulder.inputs[name].default_value = value
    canyon_group.links.new(absolute.outputs[0], shoulder.inputs['Value'])
    elevation = canyon_group.nodes.new('ShaderNodeMath')
    elevation.operation = 'ADD'
    canyon_group.links.new(depth.outputs['Result'], elevation.inputs[0])
    canyon_group.links.new(shoulder.outputs['Result'], elevation.inputs[1])
    canyon_group.links.new(elevation.outputs[0], offset.inputs['Z'])

    position = canyon_group.nodes.new('GeometryNodeInputPosition')
    xyz = canyon_group.nodes.new('ShaderNodeSeparateXYZ')
    canyon_group.links.new(position.outputs[0], xyz.inputs[0])
    absolute_x = canyon_group.nodes.new('ShaderNodeMath')
    absolute_x.operation = 'ABSOLUTE'
    canyon_group.links.new(xyz.outputs['X'], absolute_x.inputs[0])
    sign = canyon_group.nodes.new('ShaderNodeMath')
    sign.operation = 'SIGN'
    canyon_group.links.new(xyz.outputs['X'], sign.inputs[0])
    minimum = canyon_group.nodes.new('ShaderNodeMath')
    minimum.operation = 'MAXIMUM'
    minimum.inputs[1].default_value = 75.0
    canyon_group.links.new(absolute_x.outputs[0], minimum.inputs[0])
    extension = canyon_group.nodes.new('ShaderNodeMath')
    extension.operation = 'SUBTRACT'
    canyon_group.links.new(minimum.outputs[0], extension.inputs[0])
    canyon_group.links.new(absolute_x.outputs[0], extension.inputs[1])
    shoulder_blend = canyon_group.nodes.new('ShaderNodeMapRange')
    shoulder_blend.clamp = True
    shoulder_blend.interpolation_type = 'SMOOTHERSTEP'
    shoulder_blend.inputs['From Min'].default_value = 0.28
    shoulder_blend.inputs['From Max'].default_value = 0.4
    canyon_group.links.new(absolute.outputs[0], shoulder_blend.inputs['Value'])
    blend_extension = canyon_group.nodes.new('ShaderNodeMath')
    blend_extension.operation = 'MULTIPLY'
    canyon_group.links.new(extension.outputs[0], blend_extension.inputs[0])
    canyon_group.links.new(shoulder_blend.outputs['Result'], blend_extension.inputs[1])
    signed_extension = canyon_group.nodes.new('ShaderNodeMath')
    signed_extension.operation = 'MULTIPLY'
    canyon_group.links.new(blend_extension.outputs[0], signed_extension.inputs[0])
    canyon_group.links.new(sign.outputs[0], signed_extension.inputs[1])
    lateral_offset = canyon_group.nodes.new('ShaderNodeCombineXYZ')
    canyon_group.links.new(signed_extension.outputs[0], lateral_offset.inputs['X'])
    spread = canyon_group.nodes.new('GeometryNodeSetPosition')
    spread.label = 'Authored 150 WU clear reading canyon'
    canyon_group.links.new(density_store.outputs['Geometry'], spread.inputs['Geometry'])
    canyon_group.links.new(lateral_offset.outputs[0], spread.inputs['Offset'])
    canyon_group.links.new(spread.outputs['Geometry'], group_out.inputs['Geometry'])
    exit_flare = canyon_group.nodes.new('ShaderNodeMapRange')
    exit_flare.label = 'Wide portal exit settles into reading canyon'
    exit_flare.clamp = True
    exit_flare.interpolation_type = 'SMOOTHERSTEP'
    for name, value in [('From Min', 700), ('From Max', 800), ('To Min', 86), ('To Max', 75)]:
        exit_flare.inputs[name].default_value = value
    canyon_group.links.new(xyz.outputs['Y'], exit_flare.inputs['Value'])
    canyon_group.links.new(exit_flare.outputs['Result'], minimum.inputs[1])

    # Move each field instance at its origin, before instancing. Whole forms
    # retain their shape and population around a static opening aisle.
    for name in ['GN_SIGNAL_FIELD', 'GN_NEBULA_FIELD']:
        obj = bpy.data.objects[name]
        modifier = next(mod for mod in obj.modifiers if mod.type == 'NODES')
        modifier.node_group = modifier.node_group.copy()
        group = modifier.node_group
        instances = next(node for node in group.nodes if node.bl_idname == 'GeometryNodeInstanceOnPoints')
        points = instances.inputs['Points'].links[0].from_socket
        position = group.nodes.new('GeometryNodeInputPosition')
        xyz = group.nodes.new('ShaderNodeSeparateXYZ')
        group.links.new(position.outputs[0], xyz.inputs[0])
        absolute_x = group.nodes.new('ShaderNodeMath')
        absolute_x.operation = 'ABSOLUTE'
        group.links.new(xyz.outputs['X'], absolute_x.inputs[0])
        sign = group.nodes.new('ShaderNodeMath')
        sign.operation = 'SIGN'
        group.links.new(xyz.outputs['X'], sign.inputs[0])
        minimum_x = group.nodes.new('ShaderNodeMath')
        minimum_x.operation = 'MAXIMUM'
        minimum_x.inputs[1].default_value = 72.0
        group.links.new(absolute_x.outputs[0], minimum_x.inputs[0])
        signed_x = group.nodes.new('ShaderNodeMath')
        signed_x.operation = 'MULTIPLY'
        group.links.new(minimum_x.outputs[0], signed_x.inputs[0])
        group.links.new(sign.outputs[0], signed_x.inputs[1])
        position_xyz = group.nodes.new('ShaderNodeCombineXYZ')
        group.links.new(signed_x.outputs[0], position_xyz.inputs['X'])
        group.links.new(xyz.outputs['Y'], position_xyz.inputs['Y'])
        group.links.new(xyz.outputs['Z'], position_xyz.inputs['Z'])
        nave = group.nodes.new('GeometryNodeSetPosition')
        nave.label = 'Whole forms flank a 144 WU opening aisle'
        group.links.new(points, nave.inputs['Geometry'])
        group.links.new(position_xyz.outputs[0], nave.inputs['Position'])
        group.links.new(nave.outputs['Geometry'], instances.inputs['Points'])
        obj['abs_manifestation_spread_scale'] = 0.01
    bpy.data.objects['GN_SIGNAL_APERTURE']['abs_manifestation_spread_scale'] = 0.01
    # The old seed meshes capped Particle Count at 900/2200 before erosion.
    # Rebuild the inputs to the same generators, so the long opening has whole
    # independent forms in depth instead of spending its budget on tiny meshes.
    for name, capacity in [('GN_SIGNAL_FIELD', 2400), ('GN_NEBULA_FIELD', 2800)]:
        obj = bpy.data.objects[name]
        modifier = next(mod for mod in obj.modifiers if mod.type == 'NODES')
        sockets = {socket.name: socket for socket in modifier.node_group.interface.items_tree
                   if socket.item_type == 'SOCKET' and socket.in_out == 'INPUT'}
        start = float(modifier[sockets['Start on Path (0-1)'].identifier])
        end = float(modifier[sockets['End on Path (0-1)'].identifier])
        mesh = bpy.data.meshes.new(name + '_READING_FIELD_SEEDS')
        mesh.from_pydata([(0, 0, 0)] * capacity, [], [])
        rng = random.Random(506832829)
        values = {key: [] for key in ['abs_path', 'abs_angle', 'abs_rand_radius',
                                      'abs_longitudinal', 'abs_noise', 'abs_id', 'abs_palette']}
        for index in range(capacity):
            for key, value in [('abs_path', start + rng.random() * (end - start)),
                               ('abs_angle', rng.random() * math.tau),
                               ('abs_rand_radius', rng.random()),
                               ('abs_longitudinal', rng.random() * 2 - 1),
                               ('abs_noise', rng.random()), ('abs_id', index),
                               ('abs_palette', index % 6)]:
                values[key].append(value)
        for key, data in values.items():
            attribute = mesh.attributes.new(key, 'INT' if key in ['abs_id', 'abs_palette'] else 'FLOAT', 'POINT')
            for item, value in zip(attribute.data, data):
                item.value = value
        for material in obj.data.materials:
            mesh.materials.append(material)
        obj.data = mesh
        set_input(obj, 'Particle Count', capacity)
        set_input(obj, 'Dot Radius', 0.65)
    set_input(canyon, 'End on Path (0-1)', 0.69)
    canyon['abs_manifestation_spread_scale'] = 0.01
    canyon['abs_detail_bias_scale'] = 1.6
    bpy.data.objects['GN_NEBULA_FIELD']['abs_visibility_start_offset_wu'] = -0.28
    path['abs_reading_space_fit'] = json.dumps({
        'schema': 'about-reading-space-fit/v1', 'baselineSourceSha256': source_hash,
        'extensionsWU': extensions, 'oldLengthWU': old_length, 'lengthWU': new_length,
        'oldArcKnots': old_distances, 'arcKnots': new_distances,
        'gateTranslation': [0, opening+terrain, 0],
        'terrainShoulderLiftWU': 105, 'terrainBankMinXWU': 75, 'terrainEndOnPath': 0.69,
    })
    scene['abs_reading_space_fit'] = path['abs_reading_space_fit']
    # Population is an authored decision. Store it with the geometry so a
    # canonical export is reproducible without an ignored candidate manifest.
    allocation = {
        'schema': 'about-surfel-allocation/v1', 'basisSourceSha256': source_hash,
        'objects': {item['objectKey']: {
            'master': item['surfelCount'],
            'weight': item['surfaceArea'] * item['densityFactor']
                * item['featurePriority'] * item['sceneDensityWeight'],
        } for item in allocation_baseline['source']['objects']},
        'profiles': {key: {
            'count': item['surfelCount'], 'models': item['perModelCounts'],
        } for key, item in allocation_baseline['profiles'].items()},
    }
    # Reallocate within the existing 135k/90k/30k limits. Gate populations stay
    # fixed; the opening receives enough samples to preserve its new instances.
    for key, count in {
        'gn.signal.aperture': 1000, 'gn.signal.field': 2500, 'gn.nebula.field': 3000,
        'gn.round.portals': 2427, 'gn.ribbon.canyon': 66723,
        'gn.square.loop': 2553, 'gn.responsive.lattice': 56797,
    }.items():
        allocation['objects'][key]['master'] = count
    for profile, counts in {
        'mobile': [3000, 3000, 527, 12500, 555, 10418],
        'desktop': [3000, 3000, 1614, 43823, 1697, 36866],
        'master': [3500, 3000, 2427, 66723, 2553, 56797],
    }.items():
        if sum(counts) != allocation['profiles'][profile]['count']:
            raise RuntimeError('The authored allocation must retain the reviewed total budget.')
        allocation['profiles'][profile]['models'] = {
            f'about.{index:02}': count for index, count in enumerate(counts)
        }
    scene['abs_surfel_allocation'] = json.dumps(allocation)
    path['abs_curve_length'] = new_length
    scene.frame_set(1)
    bpy.context.view_layer.update()
    destination.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(destination))
    report = {'sourceSha256': source_hash, 'candidate': str(destination),
              'extensionsWU': extensions, 'oldLengthWU': old_length, 'lengthWU': new_length,
              'gateTranslationSiteWU': [0, 0, -(opening+terrain)], 'bindings': bindings,
              'endpointSiteWU': [endpoint.x, endpoint.z, -endpoint.y]}
    destination.with_suffix('.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
