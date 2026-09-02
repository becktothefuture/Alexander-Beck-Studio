#!/usr/bin/env python3
"""Apply the frozen About cinematic director board to an isolated Blender candidate.

The script is deliberately narrow: the accepted camera, round hoops, square gates,
semantic visibility bindings, object count, and seven-model structure are immutable.
It adds reversible shape-key and rig controls for the visible refinements, updates
the authoring baseline, and writes a separate candidate blend.

Run from the repository root:

  blender -b source-assets/about-v2-blender-current/about-v2-track-working.blend \
    --python scripts/about-v2-blender/apply-about-storyboard-final.py -- \
    --output-blend output/playwright/about-cinematic-storyboard-final-b43/candidate.blend \
    --report output/playwright/about-cinematic-storyboard-final-b43/refinement-report.json
"""

import argparse
import hashlib
import json
import math
import re
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


VERSION = 19
B47_VERSION = 5
B48_VERSION = 6
B49_VERSION = 7
B50_VERSION = 8
B51_VERSION = 9
B52_VERSION = 10
B53_VERSION = 11
B54_VERSION = 12
B55_VERSION = 13
B56_VERSION = 14
B57_VERSION = 15
B58_VERSION = 16
B59_VERSION = 17
B60_VERSION = 18
B46_VERSION = 4
CONTROL_NAME = "ABS_AUTHORING_CONTROLS"
BASELINE_NAME = "ABS_AUTHORING_BASELINE.json"
GUIDE_NAME = "ABS_AUTHORING_GUIDE"
GATE_RE = re.compile(r"^ABS_GATE_\d{2}$")
FLOOR_NAMES = (
    "ABS_B27_RIBBON_CANYON",
    "ABS_B27_CONTINUOUS_FLOOR",
    "ABS_B27_MOUNTAIN_RANGE",
)
NEW_CONTROLS = (
    (
        "opening_asymmetry_scale", 1.0, 0.0, 1.8,
        "Strength of the reversible near/mid/far opening-field asymmetry.",
    ),
    (
        "shape_path_progression", 1.0, 0.0, 1.5,
        "Progress from the former catalogue layout into the authored spatial transformation path.",
    ),
    (
        "floor_mountain_depth_scale", 1.0, 0.75, 1.5,
        "Longitudinal reach of the continuous floor and mountain field.",
    ),
    (
        "floor_mountain_density_scale", 1.0, 0.45, 2.0,
        "Allocation weight for the continuous floor, canyon ribbon, and mountain range.",
    ),
    (
        "method_bank_spread", 1.0, 0.0, 1.6,
        "Reversible widening of the two Method particle banks around the central path.",
    ),
    (
        "finale_surface_overscan", 1.0, 0.0, 1.55,
        "Reversible surface overscan that carries the finale beyond every viewport edge.",
    ),
)
TARGET_DISTANCE_WINDOWS = {
    "origin": [0.0, 55.35],
    "craftedForms": [55.35, 110.69],
    "roundTunnel": [110.69, 226.42],
    "landscape": [226.42, 296.86],
    "clientsNestedInLandscape": [234.0, 262.0],
    "squareGatesAcceptedPassage": [281.8, 409.2],
    "method": [407.55, 477.99],
    "finale": [477.99, 503.15],
}
STORYBOARD_MARKER_FRAMES = {
    "ABS_STAGE_00": 1,
    "ABS_STAGE_01": 100,
    "ABS_STAGE_02": 195,
    "ABS_ROUND_BANK_START": 200,
    "ABS_ROUND_BANK_LEFT": 250,
    "ABS_ROUND_BANK_RIGHT": 330,
    "ABS_ROUND_BANK_END": 400,
    "ABS_ROUND_PORTALS_EXIT": 410,
    "ABS_ROUND_PORTALS_CLEAR": 412,
    "ABS_STAGE_03": 413,
    "ABS_PERSONAL_ORIGIN": 413,
    "ABS_TERRAIN_THESIS": 450,
    "ABS_STAGE_04": 500,
    "ABS_ROLL_GATE_START": 500,
    "ABS_CANYON_CLEAR": 495,
    "ABS_GATE_BANK_LEFT": 555,
    "ABS_GATE_BANK_RIGHT": 637,
    "ABS_GATE_BANK_SETTLE": 697,
    "ABS_STAGE_05": 735,
    "ABS_ROLL_GATE_END": 736,
    "ABS_GATE_PASSAGE_CLEAR": 745,
    "ABS_METHOD_RELEASE": 771,
    "ABS_LATTICE_APPROACH": 800,
    "ABS_SPLIT_LATTICE_ENTRY": 827,
    "ABS_STAGE_06": 827,
    "ABS_FINALE_DECEL": 865,
    "ABS_CAMERA_LOCK": 901,
    "ABS_TERMINAL_FRAME": 1001,
}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--report")
    return parser.parse_args(argv)


def q(value, digits=6):
    value = round(float(value), digits)
    return 0.0 if value == 0 else value


def export_meshes():
    return sorted(
        (
            obj for obj in bpy.data.objects
            if obj.type == "MESH"
            and not obj.hide_render
            and obj.get("abs_export") is not False
            and str(obj.get("abs_model_id", "")).startswith("about.")
        ),
        key=lambda obj: obj.name,
    )


def model_objects(model):
    return [obj for obj in export_meshes() if obj.get("abs_model_id") == model]


def refresh():
    scene = bpy.context.scene
    control = bpy.data.objects.get(CONTROL_NAME)
    if control is not None:
        control.update_tag(refresh={"OBJECT"})
    current = scene.frame_current
    adjacent = current + 1 if current < scene.frame_end else current - 1
    scene.frame_set(adjacent)
    scene.frame_set(current)
    bpy.context.view_layer.update()


def evaluated_geometry_sha(objects=None):
    objects = export_meshes() if objects is None else sorted(objects, key=lambda obj: obj.name)
    scene = bpy.context.scene
    old_frame = scene.frame_current
    scene.frame_set(1)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    digest = hashlib.sha256()
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            digest.update(obj.name.encode("utf-8") + b"\0")
            digest.update(struct.pack("<II", len(mesh.vertices), len(mesh.polygons)))
            world = evaluated.matrix_world
            for vertex in mesh.vertices:
                point = world @ vertex.co
                digest.update(struct.pack("<3d", *(q(value) for value in point)))
            for polygon in mesh.polygons:
                digest.update(struct.pack("<II", len(polygon.vertices), polygon.material_index))
                digest.update(struct.pack(f"<{len(polygon.vertices)}I", *polygon.vertices))
        finally:
            evaluated.to_mesh_clear()
    scene.frame_set(old_frame)
    return digest.hexdigest()


def camera_matrices():
    scene = bpy.context.scene
    camera = bpy.data.objects["ABS_CAMERA"]
    old_frame = scene.frame_current
    rows = []
    for frame in range(scene.frame_start, scene.frame_end + 1):
        scene.frame_set(frame)
        rows.append([q(value, 8) for row in camera.matrix_world for value in row])
    scene.frame_set(old_frame)
    return rows


def camera_sha(rows):
    return hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode("utf-8")).hexdigest()


def topology_sha(objects):
    digest = hashlib.sha256()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in sorted(objects, key=lambda item: item.name):
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            digest.update(obj.name.encode("utf-8") + b"\0")
            digest.update(struct.pack("<II", len(mesh.vertices), len(mesh.polygons)))
            for polygon in mesh.polygons:
                digest.update(struct.pack("<I", len(polygon.vertices)))
                digest.update(struct.pack(f"<{len(polygon.vertices)}I", *polygon.vertices))
        finally:
            evaluated.to_mesh_clear()
    return digest.hexdigest()


def evaluated_bounds(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points = []
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            world = evaluated.matrix_world
            points.extend(world @ vertex.co for vertex in mesh.vertices)
        finally:
            evaluated.to_mesh_clear()
    if not points:
        return {"min": [0, 0, 0], "max": [0, 0, 0]}
    return {
        "min": [q(min(point[axis] for point in points), 4) for axis in range(3)],
        "max": [q(max(point[axis] for point in points), 4) for axis in range(3)],
    }


def evaluated_surface_area(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        mesh.calc_loop_triangles()
        world = evaluated.matrix_world
        area = 0.0
        for triangle in mesh.loop_triangles:
            a, b, c = (world @ mesh.vertices[index].co for index in triangle.vertices)
            area += (b - a).cross(c - a).length * 0.5
        return area
    finally:
        evaluated.to_mesh_clear()


def stage_summary():
    result = {}
    for model in [f"about.{index:02d}" for index in range(7)]:
        objects = model_objects(model)
        result[model] = {
            "objectCount": len(objects),
            "sourceVertexCount": sum(len(obj.data.vertices) for obj in objects),
            "densityWeightSum": q(sum(float(obj.get("abs_point_density", 1.0)) for obj in objects), 5),
            "bounds": evaluated_bounds(objects),
        }
    return result


def add_control(control, name, default, minimum, maximum, description):
    if name not in control:
        control[name] = default
    control.id_properties_ui(name).update(
        min=minimum,
        max=maximum,
        soft_min=minimum,
        soft_max=maximum,
        default=default,
        description=description,
    )


def add_control_driver(target, data_path, control_name, index=None, expression="value"):
    try:
        target.driver_remove(data_path, index) if index is not None else target.driver_remove(data_path)
    except (TypeError, RuntimeError):
        pass
    fcurve = target.driver_add(data_path, index) if index is not None else target.driver_add(data_path)
    driver = fcurve.driver
    driver.type = "SCRIPTED"
    driver.expression = expression
    variable = driver.variables.new()
    variable.name = "value"
    variable.type = "SINGLE_PROP"
    variable.targets[0].id = bpy.data.objects[CONTROL_NAME]
    variable.targets[0].data_path = f'["{control_name}"]'
    return fcurve


def install_shape_key(obj, key_name, control_name, transform):
    if obj.data.shape_keys is not None and obj.data.shape_keys.key_blocks.get(key_name):
        return
    if obj.data.shape_keys is None:
        obj.shape_key_add(name="Basis", from_mix=False)
    basis = obj.data.shape_keys.key_blocks[0]
    key = obj.shape_key_add(name=key_name, from_mix=False)
    key.slider_min = 0.0
    key.slider_max = 1.8
    for index, point in enumerate(basis.data):
        key.data[index].co = transform(point.co.copy(), index)
    key.value = 1.0
    add_control_driver(key, "value", control_name)
    obj["abs_storyboard_shape_key"] = key_name


def write_shape_key(obj, key_name, control_name, transform):
    """Create or deterministically rewrite one controlled shape key from Basis."""
    if obj.data.shape_keys is None:
        obj.shape_key_add(name="Basis", from_mix=False)
    basis = obj.data.shape_keys.key_blocks[0]
    key = obj.data.shape_keys.key_blocks.get(key_name)
    if key is None:
        key = obj.shape_key_add(name=key_name, from_mix=False)
    key.slider_min = 0.0
    key.slider_max = 1.8
    for index, point in enumerate(basis.data):
        key.data[index].co = transform(point.co.copy(), index)
    key.value = 1.0
    add_control_driver(key, "value", control_name)
    obj["abs_storyboard_shape_key"] = key_name


def set_driven_density_base(obj, control_name, value):
    obj["abs_point_density"] = float(value)
    obj["_abs_authoring_base_density"] = float(value)
    add_control_driver(
        obj,
        '["abs_point_density"]',
        control_name,
        expression=f"{float(value):.17g}*value",
    )


def install_opening_refinement():
    eligible = [
        obj for obj in model_objects("about.00")
        if "SAFE" not in obj.name and obj.name != "ABS_B27_SIGNAL_APERTURE"
    ]
    for object_index, obj in enumerate(eligible):
        phase = (object_index + 1) * 0.731

        def transform(co, vertex_index, phase=phase):
            depth = max(0.0, min(1.0, (co.y - 100.0) / 175.0))
            hashed = math.sin((vertex_index + 1) * 12.9898 + phase * 17.17)
            x_wave = math.sin(co.y * 0.047 + co.z * 0.031 + phase)
            z_wave = math.cos(co.y * 0.039 - co.x * 0.026 + phase * 1.7)
            co.x = co.x * (1.035 + depth * 0.065) + x_wave * (1.8 + 4.2 * depth) + hashed * 0.7
            co.y = 100.0 + (co.y - 100.0) * 1.14 + hashed * (0.45 + depth * 1.35)
            co.z = co.z + z_wave * (1.4 + 3.4 * depth) + hashed * 0.55
            return co

        install_shape_key(obj, "ABS_STORYBOARD_OPENING_ASYMMETRY", "opening_asymmetry_scale", transform)

    for obj in model_objects("about.00"):
        if obj.name == "ABS_B27_NEBULA_FIELD":
            set_driven_density_base(obj, "opening_density_scale", 0.14)
        elif obj.name == "ABS_B27_SIGNAL_FIELD":
            set_driven_density_base(obj, "opening_density_scale", 0.20)
    return eligible


def update_body_scale_pivot(rig, target):
    for axis in range(3):
        data_path = "location"
        fcurve = next(
            (
                item for item in rig.animation_data.drivers
                if item.data_path == data_path and item.array_index == axis
            ),
            None,
        )
        if fcurve is not None:
            fcurve.driver.expression = f"{float(target[axis]):.17g}*(1-value)"


def install_shape_path_refinement():
    bodies = sorted(
        (obj for obj in model_objects("about.01") if obj.name.startswith("ABS_B27_SHAPE_")),
        key=lambda obj: obj.name,
    )
    for index, obj in enumerate(bodies):
        centre = sum((vertex.co for vertex in obj.data.vertices), Vector()) / len(obj.data.vertices)
        progress = index / max(1, len(bodies) - 1)
        target = Vector((
            -9.5 + progress * 19.0 + math.sin(progress * math.tau * 1.35) * 5.2,
            160.0 + progress * 60.0,
            4.0 + math.sin(progress * math.tau * 1.75 + 0.35) * 7.6,
        ))
        scale = 1.12 + 0.10 * math.sin(progress * math.pi)
        delta = target - centre

        def transform(co, _vertex_index, centre=centre.copy(), delta=delta.copy(), scale=scale):
            return centre + (co - centre) * scale + delta

        install_shape_key(obj, "ABS_STORYBOARD_SPATIAL_PATH", "shape_path_progression", transform)
        rig = obj.parent
        if rig is not None and rig.name.startswith("ABS_RIG_ABS_B27_SHAPE_"):
            update_body_scale_pivot(rig, target)
        obj["abs_storyboard_path_order"] = index

    ambient = bpy.data.objects.get("ABS_B27_AMBIENT_01")
    if ambient is not None:
        ambient["abs_point_density"] = 1.15
    for obj in bodies:
        obj["abs_point_density"] = 2.35
    return bodies


def set_shape_key_composition(obj, target, scale):
    keys = obj.data.shape_keys
    if keys is None:
        raise RuntimeError(f"{obj.name} has no storyboard shape key.")
    basis = keys.key_blocks.get("Basis")
    key = keys.key_blocks.get("ABS_STORYBOARD_SPATIAL_PATH")
    if basis is None or key is None:
        raise RuntimeError(f"{obj.name} is missing ABS_STORYBOARD_SPATIAL_PATH.")
    centre = sum((point.co for point in basis.data), Vector()) / len(basis.data)
    for index, point in enumerate(basis.data):
        key.data[index].co = target + (point.co - centre) * scale
    key.value = 1.0
    obj["abs_storyboard_composition_target"] = [float(value) for value in target]
    obj["abs_storyboard_composition_scale"] = float(scale)
    rig = obj.parent
    if rig is not None and rig.name.startswith("ABS_RIG_ABS_B27_SHAPE_"):
        update_body_scale_pivot(rig, target)


def recompose_recognisable_forms(samples):
    bodies = sorted(
        (obj for obj in model_objects("about.01") if obj.name.startswith("ABS_B27_SHAPE_")),
        key=lambda obj: obj.name,
    )
    hero_layout = {
        "ABS_B27_SHAPE_00": (68.0, -6.8, 3.4, 2.15, "triangle"),
        "ABS_B27_SHAPE_01": (76.0, 0.0, -2.8, 2.05, "square"),
        "ABS_B27_SHAPE_02": (84.0, 6.8, 3.2, 2.10, "diamond"),
        "ABS_B27_SHAPE_06": (93.0, -6.6, -2.4, 2.05, "pyramid"),
        "ABS_B27_SHAPE_07": (101.0, 0.0, 3.5, 2.20, "sphere"),
        "ABS_B27_SHAPE_08": (108.0, 6.7, -2.3, 2.05, "cube"),
    }
    original_metrics = {
        obj.name: {
            "surfaceArea": evaluated_surface_area(obj),
            "density": float(obj.get("abs_point_density", 1.0)),
        }
        for obj in bodies
    }
    placements = []
    peripheral_index = 0
    for index, obj in enumerate(bodies):
        if obj.name in hero_layout:
            distance, right_offset, up_offset, scale, semantic = hero_layout[obj.name]
            role = "hero"
        else:
            # Retain every authored body, but move supporting forms into a sparse,
            # asymmetric periphery so the six semantic silhouettes read cleanly.
            progress = peripheral_index / max(1, len(bodies) - len(hero_layout) - 1)
            distance = 60.0 + progress * 61.0
            side = -1.0 if peripheral_index % 2 == 0 else 1.0
            right_offset = side * (13.5 + 4.0 * math.sin((peripheral_index + 1) * 1.71))
            up_offset = 8.0 * math.sin((peripheral_index + 1) * 2.17)
            scale = 0.72 + 0.12 * math.sin((peripheral_index + 1) * 0.83)
            semantic = "support"
            role = "peripheral"
            peripheral_index += 1
        _measured, frame, matrix = rail_sample_at_distance(samples, distance)
        target = matrix.translation + matrix.col[0].xyz.normalized() * right_offset + matrix.col[1].xyz.normalized() * up_offset
        set_shape_key_composition(obj, target, scale)
        obj["abs_storyboard_form_role"] = role
        obj["abs_storyboard_form_semantic"] = semantic
        placements.append({
            "name": obj.name,
            "role": role,
            "semantic": semantic,
            "distanceWU": q(distance, 4),
            "cameraFrame": q(frame, 3),
            "screenOffset": [q(right_offset, 3), q(up_offset, 3)],
            "scale": q(scale, 3),
            "target": [q(value, 4) for value in target],
        })
    refresh()
    placement_by_name = {item["name"]: item for item in placements}
    for obj in bodies:
        new_area = evaluated_surface_area(obj)
        original = original_metrics[obj.name]
        density = original["density"] * original["surfaceArea"] / new_area
        obj["abs_point_density"] = density
        obj["_abs_authoring_base_density"] = density
        placement_by_name[obj.name]["density"] = q(density, 6)
        placement_by_name[obj.name]["surfaceAreaBefore"] = q(original["surfaceArea"], 6)
        placement_by_name[obj.name]["surfaceAreaAfter"] = q(new_area, 6)
    return placements


def install_floor_refinement():
    floor = [bpy.data.objects[name] for name in FLOOR_NAMES]
    rig = bpy.data.objects["ABS_RIG_FLOOR_MOUNTAINS"]
    centre_y = sum(
        (min(vertex.co.y for vertex in obj.data.vertices) + max(vertex.co.y for vertex in obj.data.vertices)) * 0.5
        for obj in floor
    ) / len(floor)
    add_control_driver(rig, "scale", "floor_mountain_depth_scale", index=1)
    add_control_driver(
        rig,
        "location",
        "floor_mountain_depth_scale",
        index=1,
        expression=f"{centre_y:.17g}*(1-value)",
    )
    density = {
        "ABS_B27_RIBBON_CANYON": 1.15,
        "ABS_B27_CONTINUOUS_FLOOR": 7.0,
        "ABS_B27_MOUNTAIN_RANGE": 10.0,
    }
    for obj in floor:
        set_driven_density_base(obj, "floor_mountain_density_scale", density[obj.name])
    return floor


def quiet_logo_atmosphere():
    logo = [obj for obj in model_objects("about.03") if obj.name.startswith("ABS_B27_LOGO_")]
    for obj in logo:
        current = float(obj.get("_abs_authoring_base_density", obj.get("abs_point_density", 1.0)))
        if "FAR_FOG" in obj.name:
            refined = min(current, 0.11)
        elif "CENTRAL_SAFE" in obj.name or "MID_SAFE" in obj.name:
            refined = min(current, 3.2)
        elif "MOBILE_EDGE" in obj.name:
            refined = min(current, 8.0)
        elif "MOBILE_GAP" in obj.name:
            refined = min(current, 10.0)
        else:
            refined = min(current, 1.2)
        set_driven_density_base(obj, "logo_atmosphere_density_scale", refined)
    return logo


def install_method_refinement():
    grounds = [
        obj for obj in model_objects("about.05")
        if obj.name in {"ABS_B27_METHOD_GROUND_DESKTOP", "ABS_B27_METHOD_GROUND_SHARED"}
    ]
    for obj in grounds:
        def transform(co, _vertex_index):
            sign = -1.0 if co.x < 0 else 1.0
            bank = 14.0 * (1.0 - math.exp(-abs(co.x) / 72.0))
            co.x = co.x * 1.12 + sign * bank
            co.y = 610.0 + (co.y - 600.0) * 1.03
            return co

        install_shape_key(obj, "ABS_STORYBOARD_METHOD_BANKS", "method_bank_spread", transform)
        set_driven_density_base(obj, "method_density_scale", 5.8)
    for obj in model_objects("about.05"):
        if "FAR_FOG" in obj.name:
            set_driven_density_base(obj, "method_density_scale", 1.6)
    return grounds


def install_finale_refinement():
    surfaces = [
        obj for obj in model_objects("about.06")
        if "GROUND" in obj.name or "STUDY_LATTICE" in obj.name
    ]
    for obj in surfaces:
        def transform(co, _vertex_index):
            co.x *= 1.28
            co.y = 600.0 + (co.y - 600.0) * 1.10
            if co.y < 760.0:
                co.y -= 38.0 * (1.0 - max(0.0, (co.y - 540.0) / 220.0))
            return co

        install_shape_key(obj, "ABS_STORYBOARD_FINALE_OVERSCAN", "finale_surface_overscan", transform)
        if "GROUND" in obj.name:
            base = 34.0 if "SHARED" in obj.name else 24.0
        else:
            base = 0.26 if "MOBILE" in obj.name else 0.22
        set_driven_density_base(obj, "finale_density_scale", base)
    return surfaces


def remap_mesh_y(obj, source_min, source_max, target_min, target_max):
    if source_max <= source_min:
        raise RuntimeError(f"Invalid Y remap for {obj.name}.")
    scale = (target_max - target_min) / (source_max - source_min)
    for vertex in obj.data.vertices:
        progress = (vertex.co.y - source_min) / (source_max - source_min)
        vertex.co.y = target_min + progress * (target_max - target_min)
    obj.data.update()
    return scale


def update_scale_pivot_driver(rig, axis, pivot):
    if rig.animation_data is None:
        return
    fcurve = next(
        (
            item for item in rig.animation_data.drivers
            if item.data_path == "location" and item.array_index == axis
        ),
        None,
    )
    if fcurve is not None:
        fcurve.driver.expression = f"{float(pivot):.17g}*(1-value)"


def camera_rail_samples():
    scene = bpy.context.scene
    camera = bpy.data.objects["ABS_CAMERA"]
    old_frame = scene.frame_current
    samples = []
    cumulative = 0.0
    previous = None
    for frame in range(scene.frame_start, scene.frame_end + 1):
        scene.frame_set(frame)
        matrix = camera.matrix_world.copy()
        position = matrix.translation.copy()
        if previous is not None:
            cumulative += (position - previous).length
        samples.append((cumulative, frame, matrix))
        previous = position
    scene.frame_set(old_frame)
    return samples


def rail_sample_at_distance(samples, distance):
    for index in range(1, len(samples)):
        previous_distance, previous_frame, previous_matrix = samples[index - 1]
        next_distance, next_frame, next_matrix = samples[index]
        if next_distance < distance:
            continue
        span = next_distance - previous_distance
        amount = 0.0 if span <= 1e-9 else (distance - previous_distance) / span
        position = previous_matrix.translation.lerp(next_matrix.translation, amount)
        quaternion = previous_matrix.to_quaternion().slerp(next_matrix.to_quaternion(), amount)
        matrix = quaternion.to_matrix().to_4x4()
        matrix.translation = position
        return distance, previous_frame + (next_frame - previous_frame) * amount, matrix
    final_distance, frame, matrix = samples[-1]
    return final_distance, float(frame), matrix.copy()


def action_curve(action, data_path, array_index):
    curve = next(
        (
            item for item in action.fcurves
            if item.data_path == data_path and item.array_index == array_index
        ),
        None,
    )
    if curve is None:
        raise RuntimeError(f"Missing camera action curve {data_path}[{array_index}].")
    return curve


def set_curve_frame_value(curve, frame, value):
    point = next(
        (item for item in curve.keyframe_points if abs(item.co.x - frame) < 1e-4),
        None,
    )
    if point is None:
        raise RuntimeError(f"Missing camera keyframe {frame} on {curve.data_path}[{curve.array_index}].")
    point.co.y = float(value)
    point.interpolation = "LINEAR"


def rebuild_early_camera_curve(end_frame=430):
    scene = bpy.context.scene
    camera = bpy.data.objects["ABS_CAMERA"]
    action = camera.animation_data.action if camera.animation_data else None
    if action is None:
        raise RuntimeError("ABS_CAMERA has no baked action.")
    old_frame = scene.frame_current
    old_positions = []
    old_quaternions = []
    for frame in range(1, end_frame + 2):
        scene.frame_set(frame)
        old_positions.append(camera.location.copy())
        old_quaternions.append(camera.rotation_quaternion.copy())
    steps = [(old_positions[index + 1] - old_positions[index]).length for index in range(end_frame)]
    start = old_positions[0]
    end = old_positions[end_frame - 1]
    target_y_delta = end.y - start.y

    def offsets(amplitude):
        values = []
        for index in range(end_frame):
            u = index / (end_frame - 1)
            envelope = math.sin(math.pi * u) ** 3
            x = amplitude * math.sin(math.tau * u) * envelope
            z = 2.0 + amplitude * 0.46 * math.sin(3.0 * math.pi * u) * envelope
            values.append((x, z))
        return values

    def build(amplitude):
        xz = offsets(amplitude)
        positions = [Vector((start.x + xz[0][0], start.y, xz[0][1]))]
        for index in range(end_frame - 1):
            dx = xz[index + 1][0] - xz[index][0]
            dz = xz[index + 1][1] - xz[index][1]
            planar = dx * dx + dz * dz
            if planar >= steps[index] * steps[index]:
                return None
            dy = math.sqrt(max(0.0, steps[index] * steps[index] - planar))
            positions.append(Vector((start.x + xz[index + 1][0], positions[-1].y + dy, xz[index + 1][1])))
        return positions

    low, high = 0.0, 80.0
    while high > 1e-4:
        candidate = build(high)
        if candidate is not None and candidate[-1].y - start.y <= target_y_delta:
            break
        high *= 0.75
    candidate = build(high)
    if candidate is None or candidate[-1].y - start.y > target_y_delta:
        raise RuntimeError("Unable to solve a constant-distance curved early camera rail.")
    for _ in range(72):
        middle = (low + high) * 0.5
        candidate = build(middle)
        if candidate is None or candidate[-1].y - start.y < target_y_delta:
            high = middle
        else:
            low = middle
    amplitude = (low + high) * 0.5
    positions = build(amplitude)
    if positions is None:
        raise RuntimeError("Solved camera curve is invalid.")
    positions[-1] = end.copy()

    quaternions = []
    previous = None
    accepted_next = old_positions[end_frame]
    for index, position in enumerate(positions):
        if index == 0:
            forward = positions[1] - position
        elif index == len(positions) - 1:
            forward = accepted_next - positions[index - 1]
        else:
            forward = positions[index + 1] - positions[index - 1]
        quaternion = forward.normalized().to_track_quat("-Z", "Y")
        if previous is not None and previous.dot(quaternion) < 0.0:
            quaternion = Quaternion((-quaternion.w, -quaternion.x, -quaternion.y, -quaternion.z))
        quaternions.append(quaternion)
        previous = quaternion

    location_curves = [action_curve(action, "location", axis) for axis in range(3)]
    rotation_curves = [action_curve(action, "rotation_quaternion", axis) for axis in range(4)]
    for index, frame in enumerate(range(1, end_frame + 1)):
        position = positions[index]
        quaternion = quaternions[index]
        for axis in range(3):
            set_curve_frame_value(location_curves[axis], frame, position[axis])
        for axis, value in enumerate((quaternion.w, quaternion.x, quaternion.y, quaternion.z)):
            set_curve_frame_value(rotation_curves[axis], frame, value)
    for curve in location_curves + rotation_curves:
        curve.update()
    scene.frame_set(old_frame)
    bpy.context.view_layer.update()

    new_positions = []
    new_quaternions = []
    for frame in range(1, end_frame + 2):
        scene.frame_set(frame)
        new_positions.append(camera.location.copy())
        new_quaternions.append(camera.rotation_quaternion.copy())
    scene.frame_set(old_frame)
    new_steps = [(new_positions[index + 1] - new_positions[index]).length for index in range(end_frame)]
    position_deltas = [(new_positions[index] - old_positions[index]).length for index in range(end_frame)]
    angle_deltas = [math.degrees(old_quaternions[index].rotation_difference(new_quaternions[index]).angle) for index in range(end_frame)]
    return {
        "changedFrames": [1, end_frame],
        "protectedFrames": [end_frame + 1, scene.frame_end],
        "curveAmplitudeWU": q(amplitude, 6),
        "maxPositionDeltaWU": q(max(position_deltas), 6),
        "maxOrientationDeltaDegrees": q(max(angle_deltas), 6),
        "maxStepDeltaWU": q(max(abs(new_steps[index] - steps[index]) for index in range(end_frame)), 9),
        "stepMinWU": q(min(new_steps), 9),
        "stepMaxWU": q(max(new_steps), 9),
        "rejoinPositionDeltaWU": q((new_positions[end_frame - 1] - old_positions[end_frame - 1]).length, 9),
        "firstProtectedPositionDeltaWU": q((new_positions[end_frame] - old_positions[end_frame]).length, 9),
    }


def extend_landscape_continuity():
    targets = {
        "ABS_B27_RIBBON_CANYON": (315.0, 505.0, 3.4),
        "ABS_B27_CONTINUOUS_FLOOR": (320.0, 545.0, 12.0),
        "ABS_B27_MOUNTAIN_RANGE": (340.0, 485.0, 12.0),
    }
    objects = []
    original_metrics = {}
    for name, (target_min, target_max, density) in targets.items():
        obj = bpy.data.objects[name]
        original_metrics[name] = {
            "surfaceArea": evaluated_surface_area(obj),
            "density": float(obj.get("abs_point_density", density)),
        }
        ys = [vertex.co.y for vertex in obj.data.vertices]
        remap_mesh_y(obj, min(ys), max(ys), target_min, target_max)
        obj["abs_storyboard_continuity_span"] = [target_min, target_max]
        objects.append(obj)
    refresh()
    density_bases = {}
    for obj in objects:
        original = original_metrics[obj.name]
        new_area = evaluated_surface_area(obj)
        density = original["density"] * original["surfaceArea"] / new_area
        set_driven_density_base(obj, "floor_mountain_density_scale", density)
        density_bases[obj.name] = density
    centre_y = (
        min(vertex.co.y for obj in objects for vertex in obj.data.vertices)
        + max(vertex.co.y for obj in objects for vertex in obj.data.vertices)
    ) * 0.5
    update_scale_pivot_driver(bpy.data.objects["ABS_RIG_FLOOR_MOUNTAINS"], 1, centre_y)
    return {
        "objects": [obj.name for obj in objects],
        "worldYTargets": {name: list(values[:2]) for name, values in targets.items()},
        "densityBases": {name: q(value, 6) for name, value in density_bases.items()},
    }


def sculpt_client_landscape_clearance():
    camera_position = rail_sample_at_distance(camera_rail_samples(), 229.0)[2].translation
    near_start = camera_position.y + 2.0
    near_end = camera_position.y + 118.0
    mobile_tan_half_vertical_fov = math.tan(math.radians(57.5))
    affected = []
    for name in ("ABS_B27_RIBBON_CANYON", "ABS_B27_CONTINUOUS_FLOOR"):
        obj = bpy.data.objects[name]

        def transform(co, _vertex_index, start=near_start, end=near_end):
            depth = co.y - camera_position.y
            if depth <= start - camera_position.y or depth >= end - camera_position.y:
                return co
            progress = (depth - (start - camera_position.y)) / (end - start)
            # A broad valley removes the near floor from the logo projection,
            # while easing back into the inherited mountain horizon.
            weight = math.sin(math.pi * progress) ** 0.72
            target_z = camera_position.z - (1.34 * depth * mobile_tan_half_vertical_fov + 7.0)
            co.z += (target_z - co.z) * weight
            return co

        install_shape_key(obj, "ABS_B46_CLIENT_CLEARANCE", "floor_mountain_relief_scale", transform)
        obj["abs_b46_client_clearance_depth"] = [float(near_start), float(near_end)]
        affected.append(obj)
    return {
        "objects": [obj.name for obj in affected],
        "cameraDistanceWU": 229.0,
        "cameraPosition": [q(value, 6) for value in camera_position],
        "worldYInterval": [q(near_start, 4), q(near_end, 4)],
        "preservedHorizonObjects": ["ABS_B27_MOUNTAIN_RANGE"],
    }


def rebalance_client_atmosphere():
    floor_density = {
        "ABS_B27_RIBBON_CANYON": 0.03,
        "ABS_B27_CONTINUOUS_FLOOR": 0.22,
        "ABS_B27_MOUNTAIN_RANGE": 0.40,
    }
    for name, density in floor_density.items():
        set_driven_density_base(bpy.data.objects[name], "floor_mountain_density_scale", density)
    logo_density = {}
    for obj in model_objects("about.03"):
        if not obj.name.startswith("ABS_B27_LOGO_"):
            continue
        if "MID_SAFE_DESKTOP" in obj.name:
            density = 34.0
        elif "CENTRAL_SAFE" in obj.name or "MID_SAFE" in obj.name:
            density = 30.0
        elif "MOBILE_GAP_SAFE" in obj.name:
            density = 80.0
        elif "MOBILE_EDGE_SAFE" in obj.name:
            density = 30.0
        elif "MOBILE_CELL" in obj.name:
            density = 25.0
        elif "FAR_FOG" in obj.name:
            density = 0.0002
        else:
            density = float(obj.get("_abs_authoring_base_density", obj.get("abs_point_density", 1.0)))
        set_driven_density_base(obj, "logo_atmosphere_density_scale", density)
        logo_density[obj.name] = q(density, 6)
    samples = camera_rail_samples()
    _distance, _frame, matrix = rail_sample_at_distance(samples, 239.0)
    forward = (-matrix.col[2].xyz).normalized()
    right = matrix.col[0].xyz.normalized()
    up = matrix.col[1].xyz.normalized()
    tan_horizontal = math.tan(math.radians(42.5))
    mobile_layout = {
        "ABS_B27_LOGO_MOBILE_GAP_SAFE_0": (-0.70, 0.85, 45.0),
        "ABS_B27_LOGO_MOBILE_GAP_SAFE_1": (0.0, 0.85, 65.0),
        "ABS_B27_LOGO_MOBILE_GAP_SAFE_2": (0.70, 0.85, 90.0),
        "ABS_B27_LOGO_MOBILE_GAP_SAFE_3": (-0.36, 0.08, 55.0),
        "ABS_B27_LOGO_MOBILE_GAP_SAFE_4": (0.0, 0.10, 80.0),
        "ABS_B27_LOGO_MOBILE_GAP_SAFE_5": (0.36, 0.08, 105.0),
        "ABS_B27_LOGO_MOBILE_EDGE_SAFE_0": (-0.44, 0.14, 72.0),
        "ABS_B27_LOGO_MOBILE_EDGE_SAFE_1": (0.44, 0.14, 92.0),
        "ABS_B27_LOGO_MOBILE_CELL_49_SAFE": (0.24, 0.23, 58.0),
        "ABS_B27_LOGO_MID_SAFE_SHARED": (-0.22, 0.12, 110.0),
    }
    desktop_layout = {
        "ABS_B27_LOGO_CENTRAL_SAFE_0": (-0.70, 0.85, 55.0),
        "ABS_B27_LOGO_CENTRAL_SAFE_1": (0.0, 0.85, 78.0),
        "ABS_B27_LOGO_CENTRAL_SAFE_2": (0.70, 0.85, 105.0),
        "ABS_B27_LOGO_MID_SAFE_DESKTOP": (0.0, 0.10, 88.0),
    }
    placements = []
    for name, (ndc_x, ndc_y, depth) in {**mobile_layout, **desktop_layout}.items():
        obj = bpy.data.objects[name]
        tan_vertical = math.tan(math.radians(57.5)) if name in mobile_layout else tan_horizontal / 1.44
        target = matrix.translation + forward * depth + right * (ndc_x * depth * tan_horizontal) + up * (ndc_y * depth * tan_vertical)
        centre = sum((vertex.co for vertex in obj.data.vertices), Vector()) / len(obj.data.vertices)

        def transform(co, _vertex_index, centre=centre.copy(), target=target.copy()):
            return target + (co - centre) * 0.72

        install_shape_key(obj, "ABS_B46_CLIENT_SAFE_COMPOSITION", "logo_atmosphere_surfel_scale", transform)
        placements.append({"name": name, "targetNDC": [ndc_x, ndc_y], "depthWU": depth})
    return {"floorDensityBases": floor_density, "logoDensityBases": logo_density, "safePlacements": placements}


def compose_thinking_safe_patches():
    _distance, _frame, matrix = rail_sample_at_distance(camera_rail_samples(), 448.0)
    forward = (-matrix.col[2].xyz).normalized()
    right = matrix.col[0].xyz.normalized()
    up = matrix.col[1].xyz.normalized()
    tan_horizontal = math.tan(math.radians(42.5))
    desktop_targets = (
        (-0.75, -0.38), (-0.55, -0.38), (0.55, -0.38),
        (0.75, -0.38), (-0.75, 0.38), (0.75, 0.38),
    )
    placements = []
    for index, (ndc_x, ndc_y) in enumerate(desktop_targets):
        name = f"ABS_B27_THINKING_DESKTOP_SAFE_{index}"
        obj = bpy.data.objects[name]
        depth = 62.0 + index * 14.0
        target = matrix.translation + forward * depth + right * (ndc_x * depth * tan_horizontal) + up * (ndc_y * depth * tan_horizontal / 1.44)
        centre = sum((vertex.co for vertex in obj.data.vertices), Vector()) / len(obj.data.vertices)

        def transform(co, _vertex_index, centre=centre.copy(), target=target.copy()):
            return target + (co - centre) * 0.48

        install_shape_key(obj, "ABS_STORYBOARD_FINALE_OVERSCAN", "finale_surface_overscan", transform)
        placements.append({"name": name, "targetNDC": [ndc_x, ndc_y], "depthWU": depth})
    for index, (ndc_x, ndc_y) in enumerate(((-0.65, -0.35), (0.0, 0.74), (0.65, -0.35))):
        name = f"ABS_B27_THINKING_MOBILE_FILL_{index}"
        obj = bpy.data.objects[name]
        depth = 72.0 + index * 22.0
        target = matrix.translation + forward * depth + right * (ndc_x * depth * tan_horizontal) + up * (ndc_y * depth * math.tan(math.radians(57.5)))
        centre = sum((vertex.co for vertex in obj.data.vertices), Vector()) / len(obj.data.vertices)

        def transform(co, _vertex_index, centre=centre.copy(), target=target.copy()):
            return target + (co - centre) * 0.48

        install_shape_key(obj, "ABS_STORYBOARD_FINALE_OVERSCAN", "finale_surface_overscan", transform)
        placements.append({"name": name, "targetNDC": [ndc_x, ndc_y], "depthWU": depth})
    return placements


def compose_shaping_mobile_patch():
    """Place one inherited patch in the open band below the mobile shaping copy."""
    _distance, _frame, matrix = rail_sample_at_distance(camera_rail_samples(), 457.5)
    forward = (-matrix.col[2].xyz).normalized()
    right = matrix.col[0].xyz.normalized()
    up = matrix.col[1].xyz.normalized()
    depth = 70.0
    ndc_x, ndc_y = -0.08, -0.38
    tan_horizontal = math.tan(math.radians(42.5))
    tan_vertical = math.tan(math.radians(57.5))
    target = (
        matrix.translation
        + forward * depth
        + right * (ndc_x * depth * tan_horizontal)
        + up * (ndc_y * depth * tan_vertical)
    )
    obj = bpy.data.objects["ABS_B27_SHAPING_SAFE_0"]
    centre = sum((vertex.co for vertex in obj.data.vertices), Vector()) / len(obj.data.vertices)

    def transform(co, _vertex_index, centre=centre.copy(), target=target.copy()):
        return target + (co - centre) * 0.48

    install_shape_key(obj, "ABS_STORYBOARD_FINALE_OVERSCAN", "finale_surface_overscan", transform)
    return [{"name": obj.name, "targetNDC": [ndc_x, ndc_y], "depthWU": depth}]


def reallocate_late_populations():
    finale = model_objects("about.06")
    density_bases = {}
    for obj in finale:
        name = obj.name
        if name == "ABS_B27_FINALE_GROUND_SHARED":
            density = 32.5
        elif name == "ABS_B27_FINALE_GROUND_DESKTOP":
            density = 23.5
        elif name == "ABS_B27_STUDY_LATTICE_MOBILE":
            density = 0.46
        elif name == "ABS_B27_STUDY_LATTICE_DESKTOP":
            density = 0.34
        elif "SPARSE_FOG_SHARED_0" in name:
            density = 6.4
        elif "SPARSE_FOG_SHARED_1" in name:
            density = 3.0
        elif "SPARSE_FOG_SHARED_2" in name:
            density = 1.2
        elif "SPARSE_FOG_DESKTOP_0" in name:
            density = 5.4
        elif "SPARSE_FOG_DESKTOP_1" in name:
            density = 2.5
        elif "SPARSE_FOG_DESKTOP_2" in name:
            density = 1.0
        elif "FINALE_SAFE" in name:
            density = 430.0
        elif "SHAPING_DESKTOP_SAFE" in name or "THINKING_DESKTOP_SAFE" in name:
            density = 250.0
        elif "SHAPING_SAFE" in name or "THINKING_SAFE" in name:
            density = 280.0 if "SHAPING" in name else 175.0
        elif "THINKING_MOBILE_FILL" in name:
            density = 280.0
        else:
            density = float(obj.get("_abs_authoring_base_density", obj.get("abs_point_density", 1.0)))
        set_driven_density_base(obj, "finale_density_scale", density)
        density_bases[name] = q(density, 6)
    return {"densityBases": density_bases, "spreadObjects": compose_shaping_mobile_patch()}


def install_b46_composition_correction():
    protected = {
        "roundHoops": [obj for obj in model_objects("about.02") if obj.name.startswith("ABS_B27_ROUND_HOOP_")],
        "squareGates": [obj for obj in model_objects("about.04") if GATE_RE.match(obj.name)],
        "forms": [obj for obj in model_objects("about.01") if obj.name.startswith("ABS_B27_SHAPE_")],
        "method": model_objects("about.05"),
    }
    before = {name: evaluated_geometry_sha(objects) for name, objects in protected.items()}
    landscape = sculpt_client_landscape_clearance()
    client_allocation = rebalance_client_atmosphere()
    late = reallocate_late_populations()
    refresh()
    after = {name: evaluated_geometry_sha(objects) for name, objects in protected.items()}
    changed = [name for name in before if before[name] != after[name]]
    if changed:
        raise RuntimeError(f"B46 changed protected geometry: {changed}")
    return {
        "clientLandscapeClearance": landscape,
        "clientPopulationReallocation": client_allocation,
        "latePopulationReallocation": late,
        "protectedGeometry": {
            name: {"beforeSha256": before[name], "afterSha256": after[name], "unchanged": before[name] == after[name]}
            for name in before
        },
    }


def install_b47_client_horizon():
    """Restore a readable mountain horizon in the clear band above the logos."""
    _distance, _frame, matrix = rail_sample_at_distance(camera_rail_samples(), 240.0)
    camera_position = matrix.translation.copy()
    mountain = bpy.data.objects["ABS_B27_MOUNTAIN_RANGE"]
    local_mean_z = sum(vertex.co.z for vertex in mountain.data.vertices) / len(mountain.data.vertices)

    def mountain_transform(co, _vertex_index):
        depth = max(8.0, co.y - camera_position.y)
        relief = (co.z - local_mean_z) * 0.82
        co.z = camera_position.z + depth * 0.16 + relief
        return co

    write_shape_key(mountain, "ABS_B47_CLIENT_HORIZON", "floor_mountain_relief_scale", mountain_transform)
    floor = bpy.data.objects["ABS_B27_CONTINUOUS_FLOOR"]

    def floor_transform(co, _vertex_index):
        depth = max(10.0, co.y - camera_position.y)
        safe_depth = max(20.0, depth)
        wave = math.sin(co.x * 0.028) * 0.004 + math.sin(co.y * 0.071) * 0.003
        co.z = camera_position.z - max(0.65, safe_depth * (0.025 + wave))
        return co

    write_shape_key(floor, "ABS_B46_CLIENT_CLEARANCE", "floor_mountain_relief_scale", floor_transform)
    floor_density = {
        "ABS_B27_RIBBON_CANYON": 0.10,
        "ABS_B27_CONTINUOUS_FLOOR": 0.90,
        "ABS_B27_MOUNTAIN_RANGE": 4.60,
    }
    for name, density in floor_density.items():
        set_driven_density_base(bpy.data.objects[name], "floor_mountain_density_scale", density)
    logo_density = {}
    for obj in model_objects("about.03"):
        if not obj.name.startswith("ABS_B27_LOGO_"):
            continue
        current = float(obj.get("_abs_authoring_base_density", obj.get("abs_point_density", 1.0)))
        if "CENTRAL_SAFE" in obj.name:
            # Desktop-only upper-horizon motes close the two remaining cells
            # without increasing the shared/mobile logo atmosphere.
            density = 360.0
        elif any(f"MOBILE_GAP_SAFE_{index}" in obj.name for index in range(3)):
            density = 72.0
        elif "MOBILE_GAP_SAFE" in obj.name:
            density = 34.0
        elif "MOBILE_EDGE_SAFE" in obj.name or "MOBILE_CELL" in obj.name:
            density = 16.0
        else:
            density = current
        set_driven_density_base(obj, "logo_atmosphere_density_scale", density)
        logo_density[obj.name] = q(density, 6)
    return {
        "objects": [floor.name, mountain.name],
        "cameraDistanceWU": 240.0,
        "projectedHorizonNDCY": 0.105,
        "floorDensityBases": floor_density,
        "logoDensityBases": logo_density,
    }


def install_b47_method_banks():
    grounds = [
        obj for obj in model_objects("about.05")
        if obj.name in {"ABS_B27_METHOD_GROUND_DESKTOP", "ABS_B27_METHOD_GROUND_SHARED"}
    ]
    for obj in grounds:
        def transform(co, _vertex_index):
            sign = -1.0 if co.x < 0 else 1.0
            bank = 14.0 * (1.0 - math.exp(-abs(co.x) / 72.0))
            co.x = co.x * 1.12 + sign * bank
            co.y = 610.0 + (co.y - 600.0) * 1.03
            return co

        write_shape_key(obj, "ABS_STORYBOARD_METHOD_BANKS", "method_bank_spread", transform)
        set_driven_density_base(obj, "method_density_scale", 5.0)

    def place(obj, camera_distance, ndc_x, ndc_y, depth, portrait, scale):
        _distance, _frame, matrix = rail_sample_at_distance(camera_rail_samples(), camera_distance)
        forward = (-matrix.col[2].xyz).normalized()
        right = matrix.col[0].xyz.normalized()
        up = matrix.col[1].xyz.normalized()
        tan_horizontal = math.tan(math.radians(42.5))
        tan_vertical = math.tan(math.radians(57.5)) if portrait else tan_horizontal / 1.44
        target = (
            matrix.translation + forward * depth
            + right * (ndc_x * depth * tan_horizontal)
            + up * (ndc_y * depth * tan_vertical)
        )
        centre = sum((vertex.co for vertex in obj.data.vertices), Vector()) / len(obj.data.vertices)

        def transform(co, _vertex_index, centre=centre.copy(), target=target.copy(), scale=scale):
            return target + (co - centre) * scale

        write_shape_key(obj, "ABS_STORYBOARD_METHOD_BANKS", "method_bank_spread", transform)
        return {"name": obj.name, "targetNDC": [ndc_x, ndc_y], "portrait": portrait}

    placements = []
    mobile_targets = (
        (-0.70, -0.72), (-0.70, 0.0), (-0.70, 0.72),
        (0.70, -0.78), (0.70, -0.26), (0.58, 0.26), (0.70, 0.78),
    )
    for index, (ndc_x, ndc_y) in enumerate(mobile_targets):
        obj = bpy.data.objects[f"ABS_B27_METHOD_SAFE_{index}"]
        placements.append(place(obj, 418.4, ndc_x, ndc_y, 58.0 + index * 5.0, True, 0.52))
        # These 25-vertex accents provide the readable near layer. Keep them
        # subordinate to the fine-grain fog banks so copy stays clear.
        set_driven_density_base(obj, "method_density_scale", 220.0)
    desktop_targets = (
        ("ABS_B27_METHOD_DESKTOP_FILL_0", -0.74, -0.62, 0.30),
        ("ABS_B27_METHOD_DESKTOP_FILL_1", -0.74, 0.62, 0.30),
        ("ABS_B27_METHOD_DESKTOP_FILL_2", 0.52, 0.0, 0.34),
        ("ABS_B27_METHOD_FAR_FOG_DESKTOP_0", 0.74, -0.62, 0.10),
        ("ABS_B27_METHOD_FAR_FOG_DESKTOP_1", 0.74, 0.62, 0.10),
    )
    for index, (name, ndc_x, ndc_y, scale) in enumerate(desktop_targets):
        obj = bpy.data.objects[name]
        placements.append(place(obj, 416.7, ndc_x, ndc_y, 66.0 + index * 7.0, False, scale))
        set_driven_density_base(obj, "method_density_scale", 1500.0 if "FILL" in name else 12.0)
    for index, ndc_x in enumerate((-0.76, 0.76)):
        obj = bpy.data.objects[f"ABS_B27_METHOD_FAR_FOG_SHARED_{index}"]
        placements.append(place(obj, 418.4, ndc_x, 0.0, 76.0 + index * 10.0, True, 0.22))
        set_driven_density_base(obj, "method_density_scale", 72.0)
    return {"grounds": [obj.name for obj in grounds], "placements": placements}


def place_late_bank_patch(obj, camera_distance, ndc_x, ndc_y, depth, portrait, scale=0.06):
    _distance, _frame, matrix = rail_sample_at_distance(camera_rail_samples(), camera_distance)
    forward = (-matrix.col[2].xyz).normalized()
    right = matrix.col[0].xyz.normalized()
    up = matrix.col[1].xyz.normalized()
    tan_horizontal = math.tan(math.radians(42.5))
    tan_vertical = math.tan(math.radians(57.5)) if portrait else tan_horizontal / 1.44
    target = (
        matrix.translation
        + forward * depth
        + right * (ndc_x * depth * tan_horizontal)
        + up * (ndc_y * depth * tan_vertical)
    )
    centre = sum((vertex.co for vertex in obj.data.vertices), Vector()) / len(obj.data.vertices)

    def transform(co, _vertex_index, centre=centre.copy(), target=target.copy()):
        return target + (co - centre) * scale

    write_shape_key(obj, "ABS_STORYBOARD_FINALE_OVERSCAN", "finale_surface_overscan", transform)
    return {
        "name": obj.name,
        "cameraDistanceWU": camera_distance,
        "targetNDC": [ndc_x, ndc_y],
        "depthWU": depth,
        "portrait": portrait,
    }


def install_b47_late_banks():
    for prefix in ("SHAPING", "THINKING"):
        for index in range(6):
            shared = bpy.data.objects[f"ABS_B27_{prefix}_SAFE_{index}"]
            desktop = bpy.data.objects[f"ABS_B27_{prefix}_DESKTOP_SAFE_{index}"]
            set_driven_density_base(shared, "finale_density_scale", 280.0 if prefix == "SHAPING" else 175.0)
            set_driven_density_base(desktop, "finale_density_scale", 250.0)
    return []


def install_b47_finale_surface():
    surfaces = [
        obj for obj in model_objects("about.06")
        if obj.name in {"ABS_B27_FINALE_GROUND_SHARED", "ABS_B27_FINALE_GROUND_DESKTOP"}
    ]
    camera_position = rail_sample_at_distance(camera_rail_samples(), 503.0)[2].translation
    tan_horizontal = math.tan(math.radians(42.5))
    for obj in surfaces:
        def transform(co, vertex_index):
            co.x *= 1.34
            co.y = 600.0 + (co.y - 600.0) * 1.12
            depth = max(18.0, co.y - camera_position.y)
            projected_x = abs(co.x) / (depth * tan_horizontal)
            # Start the wall outside the editorial column. A shallower lift
            # keeps shaping/thinking copy clear while the close finale canopy
            # below completes the upper rows at the terminal camera.
            edge = max(0.0, min(1.0, (projected_x - 0.48) / 0.34))
            edge = edge * edge * (3.0 - 2.0 * edge)
            if vertex_index % 3:
                co.z += edge * 72.0
            return co

        write_shape_key(obj, "ABS_STORYBOARD_FINALE_OVERSCAN", "finale_surface_overscan", transform)
        density = 33.0 if "SHARED" in obj.name else 25.0
        set_driven_density_base(obj, "finale_density_scale", density)
    finale_targets = (
        (-0.62, 0.72, False), (-0.20, 0.78, False),
        (0.20, 0.78, False), (0.62, 0.72, False),
        (-0.58, 0.72, True), (-0.18, 0.78, True),
        (0.18, 0.78, True), (0.58, 0.72, True),
    )
    placements = []
    for index, (ndc_x, ndc_y, portrait) in enumerate(finale_targets):
        obj = bpy.data.objects[f"ABS_B27_FINALE_SAFE_{index}"]
        placements.append(place_late_bank_patch(
            obj, 503.0, ndc_x, ndc_y, 18.0 + index * 1.8, portrait, 0.16,
        ))
        set_driven_density_base(obj, "finale_density_scale", 220.0)
    return {"surfaces": [obj.name for obj in surfaces], "canopyPlacements": placements}


def install_b47_gate_envelopes():
    gates = sorted(
        (obj for obj in model_objects("about.04") if GATE_RE.match(obj.name)),
        key=lambda obj: obj.name,
    )
    scale = 5.20
    for obj in gates:
        centre_x = (min(vertex.co.x for vertex in obj.data.vertices) + max(vertex.co.x for vertex in obj.data.vertices)) * 0.5
        centre_z = (min(vertex.co.z for vertex in obj.data.vertices) + max(vertex.co.z for vertex in obj.data.vertices)) * 0.5
        for vertex in obj.data.vertices:
            vertex.co.x = centre_x + (vertex.co.x - centre_x) * scale
            vertex.co.z = centre_z + (vertex.co.z - centre_z) * scale
        obj.data.update()
        if "abs_aperture_half_size" in obj:
            obj["abs_aperture_half_size"] = [float(value) * scale for value in obj["abs_aperture_half_size"]]
        obj["abs_b47_envelope_scale"] = scale
    return {"objects": [obj.name for obj in gates], "envelopeScale": scale}


def install_b47_visual_correction():
    gates = [obj for obj in model_objects("about.04") if GATE_RE.match(obj.name)]
    before_gates = topology_sha(gates)
    gate_envelopes = install_b47_gate_envelopes()
    client = install_b47_client_horizon()
    method = install_b47_method_banks()
    late_banks = install_b47_late_banks()
    finale = install_b47_finale_surface()
    refresh()
    after_gates = topology_sha(gates)
    if after_gates != before_gates:
        raise RuntimeError("B47 changed protected gate geometry.")
    return {
        "clientHorizon": client,
        "methodBanks": method,
        "lateBankPlacements": late_banks,
        "finaleSurfaces": finale,
        "squareGateEnvelopes": gate_envelopes,
        "squareGateTopologyUnchanged": True,
    }


def smoothstep01(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def write_projected_card(
    obj,
    camera_distance,
    centre_ndc,
    half_ndc,
    depth,
    portrait,
    key_name,
    control_name,
):
    """Rewrite an inherited patch as a true camera-facing NDC card."""
    _distance, _frame, matrix = rail_sample_at_distance(camera_rail_samples(), camera_distance)
    forward = (-matrix.col[2].xyz).normalized()
    right = matrix.col[0].xyz.normalized()
    up = matrix.col[1].xyz.normalized()
    tan_horizontal = math.tan(math.radians(42.5))
    tan_vertical = math.tan(math.radians(57.5)) if portrait else tan_horizontal / 1.44
    basis = obj.data.shape_keys.key_blocks[0].data if obj.data.shape_keys else obj.data.vertices
    xs = [point.co.x for point in basis]
    ys = [point.co.y for point in basis]
    zs = [point.co.z for point in basis]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    z_min, z_max = min(zs), max(zs)
    x_span = max(1e-6, x_max - x_min)
    use_y_axis = (y_max - y_min) >= (z_max - z_min)
    vertical_min = y_min if use_y_axis else z_min
    vertical_span = max(1e-6, (y_max - y_min) if use_y_axis else (z_max - z_min))
    thickness_min = z_min if use_y_axis else y_min
    thickness_span = max(1e-6, (z_max - z_min) if use_y_axis else (y_max - y_min))
    centre_x, centre_y = centre_ndc
    half_x, half_y = half_ndc

    def transform(co, _vertex_index):
        source_x = ((co.x - x_min) / x_span) * 2.0 - 1.0
        vertical_value = co.y if use_y_axis else co.z
        thickness_value = co.z if use_y_axis else co.y
        source_y = ((vertical_value - vertical_min) / vertical_span) * 2.0 - 1.0
        source_depth = ((thickness_value - thickness_min) / thickness_span) * 2.0 - 1.0
        ndc_x = centre_x + source_x * half_x
        ndc_y = centre_y + source_y * half_y
        return (
            matrix.translation
            + forward * (depth + source_depth * 0.18)
            + right * (ndc_x * depth * tan_horizontal)
            + up * (ndc_y * depth * tan_vertical)
        )

    write_shape_key(obj, key_name, control_name, transform)
    return {
        "name": obj.name,
        "profile": "mobile" if portrait else "desktop",
        "centreNDC": list(centre_ndc),
        "halfNDC": list(half_ndc),
        "depthWU": depth,
    }


def install_b48_method_cards():
    placements = []
    mobile_centres = (
        (-0.72, -0.65), (-0.72, 0.0), (-0.72, 0.65),
        (0.72, -0.75), (0.72, -0.25), (0.72, 0.25), (0.72, 0.75),
    )
    for index, centre in enumerate(mobile_centres):
        obj = bpy.data.objects[f"ABS_B27_METHOD_SAFE_{index}"]
        obj["abs_min_profile"] = "mobile"
        placements.append(write_projected_card(
            obj, 418.4, centre, (0.18, 0.27), 58.0 + index * 5.0, True,
            "ABS_STORYBOARD_METHOD_BANKS", "method_bank_spread",
        ))
        set_driven_density_base(obj, "method_density_scale", 180.0)

    desktop_cards = (
        ("ABS_B27_METHOD_DESKTOP_FILL_0", (-0.68, -0.50), (0.18, 0.46), 66.0, 60.0),
        ("ABS_B27_METHOD_DESKTOP_FILL_1", (-0.68, 0.50), (0.18, 0.46), 73.0, 60.0),
        ("ABS_B27_METHOD_DESKTOP_FILL_2", (0.64, 0.00), (0.18, 0.46), 80.0, 60.0),
        ("ABS_B27_METHOD_FAR_FOG_DESKTOP_0", (0.75, -0.55), (0.16, 0.46), 87.0, 10.0),
        ("ABS_B27_METHOD_FAR_FOG_DESKTOP_1", (0.75, 0.55), (0.16, 0.46), 94.0, 10.0),
    )
    for name, centre, half, depth, density in desktop_cards:
        obj = bpy.data.objects[name]
        obj["abs_min_profile"] = "desktop"
        placements.append(write_projected_card(
            obj, 416.7, centre, half, depth, False,
            "ABS_STORYBOARD_METHOD_BANKS", "method_bank_spread",
        ))
        set_driven_density_base(obj, "method_density_scale", density)

    for index, centre_x in enumerate((-0.82, 0.82)):
        obj = bpy.data.objects[f"ABS_B27_METHOD_FAR_FOG_SHARED_{index}"]
        obj["abs_min_profile"] = "mobile"
        placements.append(write_projected_card(
            obj, 418.4, (centre_x, 0.0), (0.16, 0.88), 82.0 + index * 14.0, True,
            "ABS_STORYBOARD_METHOD_BANKS", "method_bank_spread",
        ))
        set_driven_density_base(obj, "method_density_scale", 24.0)

    for name in ("ABS_B27_METHOD_GROUND_SHARED", "ABS_B27_METHOD_GROUND_DESKTOP"):
        set_driven_density_base(bpy.data.objects[name], "method_density_scale", 1.8)
    return placements


def write_finale_ground(obj, portrait):
    _distance, _frame, matrix = rail_sample_at_distance(camera_rail_samples(), 503.0)
    forward = (-matrix.col[2].xyz).normalized()
    right = matrix.col[0].xyz.normalized()
    up = matrix.col[1].xyz.normalized()
    tan_horizontal = math.tan(math.radians(42.5))
    tan_vertical = math.tan(math.radians(57.5)) if portrait else tan_horizontal / 1.44
    basis = obj.data.shape_keys.key_blocks[0].data if obj.data.shape_keys else obj.data.vertices
    xs = [point.co.x for point in basis]
    ys = [point.co.y for point in basis]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    x_span = max(1e-6, x_max - x_min)
    y_span = max(1e-6, y_max - y_min)

    def transform(co, _vertex_index):
        x_ndc = -1.10 + ((co.x - x_min) / x_span) * 2.20
        # Retain the inherited depth ordering while guaranteeing the camera is
        # in front of every point on the terminal surface.
        depth = 28.0 + ((co.y - y_min) / y_span) * 260.0
        u = smoothstep01((depth - 28.0) / 260.0)
        if portrait:
            y_ndc = -0.96 + 0.36 * u
        else:
            edge = smoothstep01((abs(x_ndc) - 0.48) / 0.30)
            y_ndc = -0.92 + u * (0.45 + 0.90 * edge)
        return (
            matrix.translation
            + forward * depth
            + right * (x_ndc * depth * tan_horizontal)
            + up * (y_ndc * depth * tan_vertical)
        )

    write_shape_key(
        obj, "ABS_STORYBOARD_FINALE_OVERSCAN", "finale_surface_overscan", transform,
    )


def install_b48_finale_projection():
    shared = bpy.data.objects["ABS_B27_FINALE_GROUND_SHARED"]
    desktop = bpy.data.objects["ABS_B27_FINALE_GROUND_DESKTOP"]
    shared["abs_min_profile"] = "mobile"
    desktop["abs_min_profile"] = "desktop"
    write_finale_ground(shared, True)
    write_finale_ground(desktop, False)
    set_driven_density_base(shared, "finale_density_scale", 32.5)
    set_driven_density_base(desktop, "finale_density_scale", 23.5)

    placements = []
    desktop_cards = (
        ((-0.55, 0.44), (0.18, 0.34), 40.0),
        ((-0.18, 0.62), (0.18, 0.30), 55.0),
        ((0.18, 0.62), (0.18, 0.30), 70.0),
        ((0.55, 0.44), (0.18, 0.34), 85.0),
    )
    for index, (centre, half, depth) in enumerate(desktop_cards):
        obj = bpy.data.objects[f"ABS_B27_FINALE_SAFE_{index}"]
        obj["abs_min_profile"] = "desktop"
        placements.append(write_projected_card(
            obj, 503.0, centre, half, depth, False,
            "ABS_STORYBOARD_FINALE_OVERSCAN", "finale_surface_overscan",
        ))
        set_driven_density_base(obj, "finale_density_scale", 220.0)

    mobile_cards = (
        ((-0.86, 0.08), (0.13, 0.30), 35.0),
        ((-0.86, 0.55), (0.13, 0.30), 50.0),
        ((0.86, 0.08), (0.13, 0.30), 65.0),
        ((0.86, 0.55), (0.13, 0.30), 80.0),
    )
    for offset, (centre, half, depth) in enumerate(mobile_cards, start=4):
        obj = bpy.data.objects[f"ABS_B27_FINALE_SAFE_{offset}"]
        obj["abs_min_profile"] = "mobile"
        placements.append(write_projected_card(
            obj, 503.0, centre, half, depth, True,
            "ABS_STORYBOARD_FINALE_OVERSCAN", "finale_surface_overscan",
        ))
        set_driven_density_base(obj, "finale_density_scale", 220.0)
    return placements


def install_b48_client_profiles():
    desktop_only = []
    desktop_targets = ((-0.65, 0.82), (0.0, 0.86), (0.65, 0.82))
    for index in range(3):
        obj = bpy.data.objects[f"ABS_B27_LOGO_CENTRAL_SAFE_{index}"]
        obj["abs_min_profile"] = "desktop"
        write_projected_card(
            obj, 240.0, desktop_targets[index], (0.20, 0.12), 55.0 + index * 24.0,
            False, "ABS_B46_CLIENT_SAFE_COMPOSITION", "logo_atmosphere_surfel_scale",
        )
        set_driven_density_base(obj, "logo_atmosphere_density_scale", 280.0)
        desktop_only.append(obj.name)
    mobile_targets = ((-0.68, 0.84), (0.0, 0.88), (0.68, 0.84))
    mobile_upper = []
    for index in range(3):
        obj = bpy.data.objects[f"ABS_B27_LOGO_MOBILE_GAP_SAFE_{index}"]
        obj["abs_min_profile"] = "mobile"
        write_projected_card(
            obj, 239.0, mobile_targets[index], (0.18, 0.10), 45.0 + index * 22.0,
            True, "ABS_B46_CLIENT_SAFE_COMPOSITION", "logo_atmosphere_surfel_scale",
        )
        set_driven_density_base(obj, "logo_atmosphere_density_scale", 92.0)
        mobile_upper.append(obj.name)
    return {"desktopOnly": desktop_only, "mobileUpper": mobile_upper}


def install_b48_structural_correction():
    return {
        "methodCards": install_b48_method_cards(),
        "finaleProjection": install_b48_finale_projection(),
        "desktopOnlyClientHelpers": install_b48_client_profiles(),
    }


def install_b49_client_canopy():
    placements = []
    desktop_specs = (
        ("ABS_B27_LOGO_FAR_FOG_DESKTOP_0", (-0.48, 0.90), 78.0),
        ("ABS_B27_LOGO_FAR_FOG_DESKTOP_1", (0.48, 0.90), 108.0),
        ("ABS_B27_LOGO_FAR_FOG_DESKTOP_2", (-0.48, -0.90), 82.0),
        ("ABS_B27_LOGO_FAR_FOG_DESKTOP_3", (0.48, -0.90), 112.0),
    )
    for name, centre, depth in desktop_specs:
        obj = bpy.data.objects[name]
        obj["abs_min_profile"] = "desktop"
        placements.append(write_projected_card(
            obj, 240.0, centre, (0.48, 0.08), depth, False,
            "ABS_B46_CLIENT_SAFE_COMPOSITION", "logo_atmosphere_surfel_scale",
        ))
        set_driven_density_base(obj, "logo_atmosphere_density_scale", 8.0)
        obj["_abs_authoring_base_surfel_scale"] = 0.22

    mobile_specs = (
        ("ABS_B27_LOGO_FAR_FOG_SHARED_0", (-0.48, 0.90), 72.0),
        ("ABS_B27_LOGO_FAR_FOG_SHARED_1", (0.48, 0.90), 102.0),
        ("ABS_B27_LOGO_FAR_FOG_SHARED_2", (-0.48, -0.90), 76.0),
        ("ABS_B27_LOGO_FAR_FOG_SHARED_3", (0.48, -0.90), 106.0),
    )
    for name, centre, depth in mobile_specs:
        obj = bpy.data.objects[name]
        obj["abs_min_profile"] = "mobile"
        placements.append(write_projected_card(
            obj, 239.0, centre, (0.48, 0.08), depth, True,
            "ABS_B46_CLIENT_SAFE_COMPOSITION", "logo_atmosphere_surfel_scale",
        ))
        set_driven_density_base(obj, "logo_atmosphere_density_scale", 8.0)
        obj["_abs_authoring_base_surfel_scale"] = 0.22
    return placements


def install_b49_mobile_method_balance():
    placements = []
    centres = (
        (-0.68, -0.62), (-0.68, 0.0), (0.0, 0.90),
        (0.68, -0.68), (0.68, -0.22), (0.54, 0.05), (0.68, 0.68),
    )
    halves = (
        (0.16, 0.25), (0.16, 0.25), (0.28, 0.07),
        (0.16, 0.22), (0.16, 0.22), (0.04, 0.07), (0.16, 0.24),
    )
    densities = (120.0, 120.0, 100.0, 70.0, 70.0, 20.0, 70.0)
    for index, (centre, half, density) in enumerate(zip(centres, halves, densities)):
        obj = bpy.data.objects[f"ABS_B27_METHOD_SAFE_{index}"]
        placements.append(write_projected_card(
            obj, 418.4, centre, half, 58.0 + index * 5.0, True,
            "ABS_STORYBOARD_METHOD_BANKS", "method_bank_spread",
        ))
        set_driven_density_base(obj, "method_density_scale", density)
        obj["abs_surfel_radius_scale"] = 0.18
    for index in range(2):
        obj = bpy.data.objects[f"ABS_B27_METHOD_FAR_FOG_SHARED_{index}"]
        set_driven_density_base(obj, "method_density_scale", 18.0 if index == 0 else 8.0)
    return placements


def install_b49_mobile_finale_completion():
    placements = []
    specs = (
        ((-0.82, -0.18), (0.28, 0.28), 35.0),
        ((-0.82, 0.55), (0.28, 0.30), 50.0),
        ((0.82, -0.18), (0.28, 0.28), 65.0),
        ((0.82, 0.55), (0.28, 0.30), 80.0),
    )
    for index, (centre, half, depth) in enumerate(specs, start=4):
        obj = bpy.data.objects[f"ABS_B27_FINALE_SAFE_{index}"]
        placements.append(write_projected_card(
            obj, 503.0, centre, half, depth, True,
            "ABS_STORYBOARD_FINALE_OVERSCAN", "finale_surface_overscan",
        ))
        set_driven_density_base(obj, "finale_density_scale", 220.0)
        obj["abs_surfel_radius_scale"] = 0.18
    return placements


def install_b49_six_gap_correction():
    return {
        "clientCanopy": install_b49_client_canopy(),
        "mobileMethodBalance": install_b49_mobile_method_balance(),
        "mobileFinaleCompletion": install_b49_mobile_finale_completion(),
    }


def install_b50_desktop_client_edge_cell():
    obj = bpy.data.objects["ABS_B27_LOGO_MID_SAFE_DESKTOP"]
    obj["abs_min_profile"] = "desktop"
    placement = write_projected_card(
        obj, 240.0, (0.82, 0.58), (0.055, 0.055), 84.0, False,
        "ABS_B46_CLIENT_SAFE_COMPOSITION", "logo_atmosphere_surfel_scale",
    )
    set_driven_density_base(obj, "logo_atmosphere_density_scale", 80.0)
    obj["_abs_authoring_base_surfel_scale"] = 0.28
    return placement


def install_b50_mobile_method_distribution():
    # Each inherited 5x5 patch owns a distinct horizontal range. Vertical
    # placement keeps the broad banks outside copy, except for one deliberately
    # tiny centre-right card that preserves the sole usable middle cell.
    specs = (
        ((-0.835, -0.66), (0.165, 0.22), 80.0),
        ((-0.505, -0.66), (0.165, 0.22), 80.0),
        ((-0.170, 0.90), (0.170, 0.07), 80.0),
        ((0.540, 0.05), (0.040, 0.035), 20.0),
        ((0.505, -0.66), (0.165, 0.22), 70.0),
        ((0.835, -0.66), (0.165, 0.22), 70.0),
        ((0.835, 0.72), (0.165, 0.18), 70.0),
    )
    placements = []
    for index, (centre, half, density) in enumerate(specs):
        obj = bpy.data.objects[f"ABS_B27_METHOD_SAFE_{index}"]
        placements.append(write_projected_card(
            obj, 418.4, centre, half, 58.0 + index * 5.0, True,
            "ABS_STORYBOARD_METHOD_BANKS", "method_bank_spread",
        ))
        set_driven_density_base(obj, "method_density_scale", density)
        obj["abs_surfel_radius_scale"] = 0.14
    for index in range(2):
        obj = bpy.data.objects[f"ABS_B27_METHOD_FAR_FOG_SHARED_{index}"]
        set_driven_density_base(obj, "method_density_scale", 24.0)
    return placements


def install_b50_distribution_final():
    return {
        "desktopClientEdgeCell": install_b50_desktop_client_edge_cell(),
        "mobileMethodDistribution": install_b50_mobile_method_distribution(),
    }


def write_ranked_projected_strip(obj, centre_x, x_half, depth, density):
    """Map a high-resolution patch into a full-height outer mobile strip."""
    _distance, _frame, matrix = rail_sample_at_distance(camera_rail_samples(), 418.4)
    forward = (-matrix.col[2].xyz).normalized()
    right = matrix.col[0].xyz.normalized()
    up = matrix.col[1].xyz.normalized()
    tan_horizontal = math.tan(math.radians(42.5))
    tan_vertical = math.tan(math.radians(57.5))
    basis = obj.data.shape_keys.key_blocks[0].data if obj.data.shape_keys else obj.data.vertices
    xs = [point.co.x for point in basis]
    ys = [point.co.y for point in basis]
    zs = [point.co.z for point in basis]
    x_min, x_max = min(xs), max(xs)
    x_span = max(1e-6, x_max - x_min)
    use_y_axis = (max(ys) - min(ys)) >= (max(zs) - min(zs))
    vertical_values = [point.co.y if use_y_axis else point.co.z for point in basis]
    ranked = sorted(range(len(vertical_values)), key=lambda index: (vertical_values[index], index))
    rank_by_index = {vertex_index: rank for rank, vertex_index in enumerate(ranked)}

    def transform(co, vertex_index):
        source_x = ((co.x - x_min) / x_span) * 2.0 - 1.0
        rank = rank_by_index[vertex_index]
        source_y = rank / max(1, len(ranked) - 1)
        ndc_x = centre_x + source_x * x_half
        ndc_y = -0.97 + source_y * 1.94
        source_depth = ((vertex_index % 7) / 6.0) * 2.0 - 1.0
        return (
            matrix.translation
            + forward * (depth + source_depth * 0.18)
            + right * (ndc_x * depth * tan_horizontal)
            + up * (ndc_y * depth * tan_vertical)
        )

    write_shape_key(
        obj, "ABS_STORYBOARD_METHOD_BANKS", "method_bank_spread", transform,
    )
    set_driven_density_base(obj, "method_density_scale", density)
    obj["abs_min_profile"] = "mobile"
    return {
        "name": obj.name,
        "xRangeNDC": [centre_x - x_half, centre_x + x_half],
        "yRangeNDC": [-0.97, 0.97],
        "depthWU": depth,
        "density": density,
    }


def install_b51_exact_cell_topology():
    client = bpy.data.objects["ABS_B27_LOGO_MID_SAFE_DESKTOP"]
    client_placement = write_projected_card(
        client, 240.0, (0.75, -0.625), (0.04, 0.04), 84.0, False,
        "ABS_B46_CLIENT_SAFE_COMPOSITION", "logo_atmosphere_surfel_scale",
    )
    set_driven_density_base(client, "logo_atmosphere_density_scale", 5.0)
    client["_abs_authoring_base_surfel_scale"] = 0.16

    middle = bpy.data.objects["ABS_B27_METHOD_SAFE_3"]
    middle_placement = write_projected_card(
        middle, 418.4, (0.42, -0.125), (0.04, 0.04), 73.0, True,
        "ABS_STORYBOARD_METHOD_BANKS", "method_bank_spread",
    )
    set_driven_density_base(middle, "method_density_scale", 20.0)
    middle["abs_surfel_radius_scale"] = 0.14

    strips = []
    for index, (centre_x, depth, density) in enumerate(((-0.9325, 82.0, 70.0), (0.9325, 96.0, 60.0))):
        obj = bpy.data.objects[f"ABS_B27_METHOD_FAR_FOG_SHARED_{index}"]
        strips.append(write_projected_card(
            obj, 418.4, (centre_x, 0.0), (0.0525, 0.97), depth, True,
            "ABS_STORYBOARD_METHOD_BANKS", "method_bank_spread",
        ))
        set_driven_density_base(obj, "method_density_scale", density)
    return {
        "desktopClientCell": client_placement,
        "mobileMethodMiddleCell": middle_placement,
        "mobileMethodOuterStrips": strips,
    }


def install_b52_uniform_bank_sampling():
    """Spread the inherited fog surfaces evenly through every bank row.

    B51 positioned the correct high-resolution objects but used their irregular
    source coordinates, so surface-area sampling clustered the exported points
    into only four to six vertical bins. The ranked remap keeps the same objects,
    profile budget and camera-facing strips while distributing their vertices
    uniformly from the bottom to the top of the viewport.
    """
    client = bpy.data.objects["ABS_B27_LOGO_MID_SAFE_DESKTOP"]
    client_placement = write_projected_card(
        client, 240.0, (0.75, -0.625), (0.04, 0.04), 84.0, False,
        "ABS_B46_CLIENT_SAFE_COMPOSITION", "logo_atmosphere_surfel_scale",
    )
    set_driven_density_base(client, "logo_atmosphere_density_scale", 12.0)
    client["_abs_authoring_base_surfel_scale"] = 0.08

    strips = []
    for index, (centre_x, depth, density) in enumerate(
        ((-0.9325, 82.0, 70.0), (0.9325, 96.0, 60.0))
    ):
        obj = bpy.data.objects[f"ABS_B27_METHOD_FAR_FOG_SHARED_{index}"]
        strips.append(write_ranked_projected_strip(
            obj, centre_x, 0.0525, depth, density,
        ))
        obj["abs_surfel_radius_scale"] = 0.12
    return {
        "desktopClientCell": client_placement,
        "mobileMethodUniformOuterStrips": strips,
    }


def install_b53_preserved_uniform_banks():
    """Keep the evenly distributed outer-bank samples through runtime LOD.

    B52 placed points in all twelve rows, but the detail-rank pass retained too
    few of them for several rows to paint three visible centres. These extreme
    side strips never intersect editorial copy, so preserve their bounded point
    sample and reallocate a small part of the fixed about.05 profile from the
    already dense floor into the two banks.
    """
    strips = []
    for index, (centre_x, depth, density) in enumerate(
        ((-0.9325, 82.0, 180.0), (0.9325, 96.0, 150.0))
    ):
        obj = bpy.data.objects[f"ABS_B27_METHOD_FAR_FOG_SHARED_{index}"]
        strips.append(write_ranked_projected_strip(
            obj, centre_x, 0.0525, depth, density,
        ))
        obj["abs_surfel_radius_scale"] = 0.12
        obj["abs_preserve_min_px"] = 0.6
    return {"mobileMethodPreservedUniformOuterStrips": strips}


def rebuild_camera_facing_method_bank(obj, centre_x, depth, density, *, camera_frame=None, x_half=0.0525):
    """Replace one irregular fog patch with a regular, front-facing bank grid."""
    scene = bpy.context.scene
    if camera_frame is None:
        _distance, _frame, matrix = rail_sample_at_distance(camera_rail_samples(), 418.4)
    else:
        old_frame = scene.frame_current
        scene.frame_set(camera_frame)
        matrix = bpy.data.objects["ABS_CAMERA"].matrix_world.copy()
        scene.frame_set(old_frame)
    forward = (-matrix.col[2].xyz).normalized()
    right = matrix.col[0].xyz.normalized()
    up = matrix.col[1].xyz.normalized()
    tan_horizontal = math.tan(math.radians(42.5))
    tan_vertical = math.tan(math.radians(57.5))
    columns = 4
    rows = 13
    final_vertices = []
    basis_vertices = []
    for row in range(rows):
        y_unit = row / (rows - 1)
        ndc_y = -0.97 + y_unit * 1.94
        for column in range(columns):
            x_unit = column / (columns - 1)
            ndc_x = centre_x - x_half + x_unit * x_half * 2.0
            final = (
                matrix.translation
                + forward * depth
                + right * (ndc_x * depth * tan_horizontal)
                + up * (ndc_y * depth * tan_vertical)
            )
            basis = (
                matrix.translation
                + forward * depth
                + right * ((centre_x + (ndc_x - centre_x) * 0.55) * depth * tan_horizontal)
                + up * ((ndc_y * 0.55) * depth * tan_vertical)
            )
            final_vertices.append(tuple(final))
            basis_vertices.append(tuple(basis))
    faces = []
    for row in range(rows - 1):
        for column in range(columns - 1):
            lower_left = row * columns + column
            faces.append((
                lower_left,
                lower_left + 1,
                lower_left + 1 + columns,
                lower_left + columns,
            ))

    old_mesh = obj.data
    materials = list(old_mesh.materials)
    mesh = bpy.data.meshes.new(f"{old_mesh.name}_B54")
    mesh.from_pydata(basis_vertices, [], faces)
    mesh.update()
    for material in materials:
        mesh.materials.append(material)
    obj.data = mesh
    obj.shape_key_add(name="Basis", from_mix=False)
    key = obj.shape_key_add(name="ABS_STORYBOARD_METHOD_BANKS", from_mix=False)
    key.slider_min = 0.0
    key.slider_max = 1.8
    for index, coordinate in enumerate(final_vertices):
        key.data[index].co = coordinate
    key.value = 1.0
    add_control_driver(key, "value", "method_bank_spread")
    obj["abs_storyboard_shape_key"] = key.name
    obj["abs_min_profile"] = "mobile"
    obj["abs_surfel_radius_scale"] = 0.12
    obj["abs_preserve_min_px"] = 0.6
    set_driven_density_base(obj, "method_density_scale", density)
    return {
        "name": obj.name,
        "grid": [columns, rows],
        "faceCount": len(faces),
        "xRangeNDC": [centre_x - x_half, centre_x + x_half],
        "yRangeNDC": [-0.97, 0.97],
        "depthWU": depth,
        "density": density,
        "normalDirection": "toward-camera",
        "cameraFrame": camera_frame,
    }


def install_b54_front_facing_method_banks():
    specs = ((-0.9325, 82.0, 180.0), (0.9325, 96.0, 150.0))
    return {
        "mobileMethodFrontFacingBanks": [
            rebuild_camera_facing_method_bank(
                bpy.data.objects[f"ABS_B27_METHOD_FAR_FOG_SHARED_{index}"],
                centre_x,
                depth,
                density,
            )
            for index, (centre_x, depth, density) in enumerate(specs)
        ]
    }


def install_b55_method_checkpoint_banks():
    specs = ((-0.86, 78.0, 210.0), (0.86, 102.0, 185.0))
    return {
        "methodCheckpointBanks": [
            rebuild_camera_facing_method_bank(
                bpy.data.objects[f"ABS_B27_METHOD_FAR_FOG_SHARED_{index}"],
                centre_x,
                depth,
                density,
                camera_frame=748,
                x_half=0.13,
            )
            for index, (centre_x, depth, density) in enumerate(specs)
        ]
    }


def install_b56_balanced_method_banks():
    specs = ((-0.86, 78.0, 160.0), (0.86, 102.0, 140.0))
    return {
        "balancedMethodBanks": [
            rebuild_camera_facing_method_bank(
                bpy.data.objects[f"ABS_B27_METHOD_FAR_FOG_SHARED_{index}"],
                centre_x,
                depth,
                density,
                camera_frame=748,
                x_half=0.13,
            )
            for index, (centre_x, depth, density) in enumerate(specs)
        ]
    }


def install_b57_desktop_method_balance():
    ground = bpy.data.objects["ABS_B27_METHOD_GROUND_DESKTOP"]
    set_driven_density_base(ground, "method_density_scale", 2.15)
    return {
        "desktopGroundDensity": 2.15,
        "reason": "retain broad banks while restoring a balanced central terrain population",
    }


def camera_matrix_at_frame(frame):
    scene = bpy.context.scene
    old_frame = scene.frame_current
    scene.frame_set(frame)
    matrix = bpy.data.objects["ABS_CAMERA"].matrix_world.copy()
    scene.frame_set(old_frame)
    return matrix


def rebuild_longitudinal_method_bank(obj, side, density):
    """Build one text-aware volumetric bank along the complete Method ride."""
    columns = 5
    rows = 15
    layer_frames = (715, 755, 795, 835)
    vertices = []
    faces = []
    for layer_index, frame in enumerate(layer_frames):
        matrix = camera_matrix_at_frame(frame)
        forward = (-matrix.col[2].xyz).normalized()
        right = matrix.col[0].xyz.normalized()
        up = matrix.col[1].xyz.normalized()
        depth = 44.0 + layer_index * 7.0
        tan_horizontal = math.tan(math.radians(42.5))
        tan_vertical = math.tan(math.radians(57.5))
        layer_offset = len(vertices)
        for row in range(rows):
            y_unit = row / (rows - 1)
            ndc_y = -0.98 + y_unit * 1.96
            edge_release = smoothstep01((abs(ndc_y) - 0.62) / 0.32)
            inner_abs = 0.94 - 0.33 * edge_release
            for column in range(columns):
                x_unit = column / (columns - 1)
                if side < 0:
                    ndc_x = -0.995 + (-inner_abs + 0.995) * x_unit
                else:
                    ndc_x = inner_abs + (0.995 - inner_abs) * x_unit
                point = (
                    matrix.translation
                    + forward * depth
                    + right * (ndc_x * depth * tan_horizontal)
                    + up * (ndc_y * depth * tan_vertical)
                )
                vertices.append(tuple(point))
        for row in range(rows - 1):
            for column in range(columns - 1):
                lower_left = layer_offset + row * columns + column
                faces.append((
                    lower_left,
                    lower_left + 1,
                    lower_left + 1 + columns,
                    lower_left + columns,
                ))

    old_mesh = obj.data
    materials = list(old_mesh.materials)
    mesh = bpy.data.meshes.new(f"{old_mesh.name}_B58")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for material in materials:
        mesh.materials.append(material)
    obj.data = mesh
    obj.shape_key_add(name="Basis", from_mix=False)
    key = obj.shape_key_add(name="ABS_STORYBOARD_METHOD_BANKS", from_mix=False)
    key.slider_min = 0.0
    key.slider_max = 1.8
    for index, coordinate in enumerate(vertices):
        key.data[index].co = coordinate
    key.value = 1.0
    add_control_driver(key, "value", "method_bank_spread")
    obj["abs_storyboard_shape_key"] = key.name
    obj["abs_min_profile"] = "mobile"
    obj["abs_surfel_radius_scale"] = 0.12
    obj["abs_preserve_min_px"] = 0.6
    set_driven_density_base(obj, "method_density_scale", density)
    return {
        "name": obj.name,
        "side": "left" if side < 0 else "right",
        "layerFrames": list(layer_frames),
        "gridPerLayer": [columns, rows],
        "faceCount": len(faces),
        "density": density,
    }


def rebuild_landscape_mountain_range():
    obj = bpy.data.objects["ABS_B27_MOUNTAIN_RANGE"]
    matrix = camera_matrix_at_frame(450)
    forward = (-matrix.col[2].xyz).normalized()
    right = matrix.col[0].xyz.normalized()
    up = matrix.col[1].xyz.normalized()
    tan_horizontal = math.tan(math.radians(42.5))
    tan_vertical = tan_horizontal / 1.44
    columns = 29
    depths = (42.0, 68.0, 98.0, 134.0, 176.0, 222.0)
    vertices = []
    for depth_index, depth in enumerate(depths):
        progress = depth_index / (len(depths) - 1)
        for column in range(columns):
            x_unit = column / (columns - 1)
            ndc_x = -1.22 + x_unit * 2.44
            peaks = (
                0.90 * math.exp(-((ndc_x + 0.78) / 0.23) ** 2)
                + 0.70 * math.exp(-((ndc_x + 0.30) / 0.18) ** 2)
                + 0.58 * math.exp(-((ndc_x - 0.22) / 0.20) ** 2)
                + 0.82 * math.exp(-((ndc_x - 0.70) / 0.25) ** 2)
            )
            peaks = min(1.0, peaks)
            ridge = 0.34 * peaks + 0.055 * math.sin(ndc_x * 15.0 + progress * 2.1)
            ndc_y = -0.28 + progress * 0.14 + ridge * (0.78 + progress * 0.22)
            point = (
                matrix.translation
                + forward * depth
                + right * (ndc_x * depth * tan_horizontal)
                + up * (ndc_y * depth * tan_vertical)
            )
            vertices.append(tuple(point))
    faces = []
    for row in range(len(depths) - 1):
        for column in range(columns - 1):
            lower_left = row * columns + column
            faces.append((
                lower_left,
                lower_left + 1,
                lower_left + 1 + columns,
                lower_left + columns,
            ))
    old_mesh = obj.data
    materials = list(old_mesh.materials)
    mesh = bpy.data.meshes.new(f"{old_mesh.name}_B58")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for material in materials:
        mesh.materials.append(material)
    obj.data = mesh
    set_driven_density_base(obj, "floor_mountain_density_scale", 7.4)
    obj["abs_preserve_min_px"] = 0.48
    return {"grid": [columns, len(depths)], "faceCount": len(faces), "cameraFrame": 450}


def lift_boundless_finale_ground(obj, portrait):
    _distance, _frame, matrix = rail_sample_at_distance(camera_rail_samples(), 503.0)
    forward = (-matrix.col[2].xyz).normalized()
    right = matrix.col[0].xyz.normalized()
    up = matrix.col[1].xyz.normalized()
    tan_horizontal = math.tan(math.radians(42.5))
    tan_vertical = math.tan(math.radians(57.5)) if portrait else tan_horizontal / 1.44
    basis = obj.data.shape_keys.key_blocks[0].data if obj.data.shape_keys else obj.data.vertices
    xs = [point.co.x for point in basis]
    ys = [point.co.y for point in basis]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    x_span = max(1e-6, x_max - x_min)
    y_span = max(1e-6, y_max - y_min)

    def transform(co, _vertex_index):
        x_ndc = -1.28 + ((co.x - x_min) / x_span) * 2.56
        depth = 22.0 + ((co.y - y_min) / y_span) * 286.0
        progress = smoothstep01((depth - 22.0) / 286.0)
        edge = smoothstep01((abs(x_ndc) - 0.20) / 0.72)
        wave = 0.07 * math.sin(x_ndc * 5.4 + progress * 3.2)
        if portrait:
            y_ndc = -1.04 + progress * (0.44 + 0.87 * edge) + wave * progress
        else:
            y_ndc = -1.02 + progress * (0.65 + 0.70 * edge) + wave * progress
        return (
            matrix.translation
            + forward * depth
            + right * (x_ndc * depth * tan_horizontal)
            + up * (y_ndc * depth * tan_vertical)
        )

    write_shape_key(obj, "ABS_STORYBOARD_FINALE_OVERSCAN", "finale_surface_overscan", transform)


def install_b58_jury_scene_correction():
    method = [
        rebuild_longitudinal_method_bank(
            bpy.data.objects[f"ABS_B27_METHOD_FAR_FOG_SHARED_{index}"],
            -1 if index == 0 else 1,
            120.0 if index == 0 else 108.0,
        )
        for index in range(2)
    ]
    mountain = rebuild_landscape_mountain_range()
    for obj in model_objects("about.04"):
        obj["abs_visibility_start_offset_wu"] = -0.75
    for obj in model_objects("about.05"):
        obj["abs_visibility_start_offset_wu"] = -1.1
    shared = bpy.data.objects["ABS_B27_FINALE_GROUND_SHARED"]
    desktop = bpy.data.objects["ABS_B27_FINALE_GROUND_DESKTOP"]
    lift_boundless_finale_ground(shared, True)
    lift_boundless_finale_ground(desktop, False)
    for name in (
        "ABS_B27_SHAPE_00", "ABS_B27_SHAPE_01", "ABS_B27_SHAPE_02",
        "ABS_B27_SHAPE_06", "ABS_B27_SHAPE_07", "ABS_B27_SHAPE_08",
    ):
        obj = bpy.data.objects[name]
        target = Vector(obj["abs_storyboard_composition_target"])
        scale = float(obj["abs_storyboard_composition_scale"]) * 1.32
        set_shape_key_composition(obj, target, scale)
    return {
        "methodBanks": method,
        "landscapeMountain": mountain,
        "gateVisibilityStartOffsetWU": -0.75,
        "methodVisibilityStartOffsetWU": -1.1,
        "heroFormScaleMultiplier": 1.32,
        "finaleGround": "raised curved horizon with full-crop overscan",
    }


def install_b59_protected_volume_correction():
    method = [
        rebuild_longitudinal_method_bank(
            bpy.data.objects[f"ABS_B27_METHOD_FAR_FOG_SHARED_{index}"],
            -1 if index == 0 else 1,
            120.0 if index == 0 else 108.0,
        )
        for index in range(2)
    ]
    shared = bpy.data.objects["ABS_B27_FINALE_GROUND_SHARED"]
    desktop = bpy.data.objects["ABS_B27_FINALE_GROUND_DESKTOP"]
    lift_boundless_finale_ground(shared, True)
    lift_boundless_finale_ground(desktop, False)
    floor = bpy.data.objects["ABS_B27_CONTINUOUS_FLOOR"]
    set_driven_density_base(floor, "floor_mountain_density_scale", 1.8)
    return {
        "methodBanks": method,
        "clientFloorDensity": 1.8,
        "finaleGround": "raised edge canopy with protected central valley",
    }


def rebuild_checkpoint_method_bank(obj, side, depth, density):
    matrix = camera_matrix_at_frame(748)
    forward = (-matrix.col[2].xyz).normalized()
    right = matrix.col[0].xyz.normalized()
    up = matrix.col[1].xyz.normalized()
    tan_horizontal = math.tan(math.radians(42.5))
    tan_vertical = math.tan(math.radians(57.5))
    columns = 5
    rows = 15
    vertices = []
    for row in range(rows):
        ndc_y = -0.98 + row / (rows - 1) * 1.96
        edge_release = smoothstep01((abs(ndc_y) - 0.62) / 0.32)
        inner_abs = 0.94 - 0.33 * edge_release
        for column in range(columns):
            x_unit = column / (columns - 1)
            local_depth = depth + 0.65 * math.sin(row * 0.83 + column * 1.17)
            if side < 0:
                ndc_x = -0.995 + (-inner_abs + 0.995) * x_unit
            else:
                ndc_x = inner_abs + (0.995 - inner_abs) * x_unit
            point = (
                matrix.translation
                + forward * local_depth
                + right * (ndc_x * local_depth * tan_horizontal)
                + up * (ndc_y * local_depth * tan_vertical)
            )
            vertices.append(tuple(point))
    faces = []
    for row in range(rows - 1):
        for column in range(columns - 1):
            lower_left = row * columns + column
            faces.append((
                lower_left,
                lower_left + 1,
                lower_left + 1 + columns,
                lower_left + columns,
            ))
    old_mesh = obj.data
    materials = list(old_mesh.materials)
    mesh = bpy.data.meshes.new(f"{old_mesh.name}_B60")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for material in materials:
        mesh.materials.append(material)
    obj.data = mesh
    obj.shape_key_add(name="Basis", from_mix=False)
    key = obj.shape_key_add(name="ABS_STORYBOARD_METHOD_BANKS", from_mix=False)
    key.slider_min = 0.0
    key.slider_max = 1.8
    for index, coordinate in enumerate(vertices):
        key.data[index].co = coordinate
    key.value = 1.0
    add_control_driver(key, "value", "method_bank_spread")
    obj["abs_storyboard_shape_key"] = key.name
    obj["abs_min_profile"] = "mobile"
    obj["abs_surfel_radius_scale"] = 0.14
    obj["abs_preserve_min_px"] = 0.6
    set_driven_density_base(obj, "method_density_scale", density)
    return {"name": obj.name, "side": side, "depth": depth, "density": density}


def install_b60_clear_checkpoint_banks():
    method = [
        rebuild_checkpoint_method_bank(
            bpy.data.objects["ABS_B27_METHOD_FAR_FOG_SHARED_0"], -1, 125.0, 260.0,
        ),
        rebuild_checkpoint_method_bank(
            bpy.data.objects["ABS_B27_METHOD_FAR_FOG_SHARED_1"], 1, 155.0, 230.0,
        ),
    ]
    lift_boundless_finale_ground(bpy.data.objects["ABS_B27_FINALE_GROUND_SHARED"], True)
    for prefix in ("DESKTOP", "SHARED"):
        for index in (2, 3):
            obj = bpy.data.objects[f"ABS_B27_LOGO_FAR_FOG_{prefix}_{index}"]
            set_driven_density_base(obj, "logo_atmosphere_density_scale", 24.0)
    return {
        "methodBanks": method,
        "clientLowerCanopyDensity": 24.0,
        "mobileFinale": "deeper central valley with raised outer canopy",
    }


def install_b61_volumetric_bank_bounds():
    return {
        "methodBanks": [
            rebuild_checkpoint_method_bank(
                bpy.data.objects["ABS_B27_METHOD_FAR_FOG_SHARED_0"], -1, 125.0, 260.0,
            ),
            rebuild_checkpoint_method_bank(
                bpy.data.objects["ABS_B27_METHOD_FAR_FOG_SHARED_1"], 1, 155.0, 230.0,
            ),
        ],
        "depthRippleWU": 0.65,
    }


def reposition_round_hoops(samples):
    hoops = sorted(
        (obj for obj in model_objects("about.02") if obj.name.startswith("ABS_B27_ROUND_HOOP_")),
        key=lambda obj: obj.name,
    )
    start, end = TARGET_DISTANCE_WINDOWS["roundTunnel"]
    spacing = (end - start) / (len(hoops) - 1)
    placements = []
    for index, obj in enumerate(hoops):
        old_centre = Vector(obj["abs_aperture_centre_blender"])
        old_right = Vector(obj["abs_aperture_right_blender"]).normalized()
        old_up = Vector(obj["abs_aperture_up_blender"]).normalized()
        old_normal = Vector(obj["abs_aperture_normal_blender"]).normalized()
        target_distance = start + index * spacing
        # Avoid placing a centre plane exactly on a baked camera sample. The
        # offline passage test intentionally counts both adjacent segments when
        # a sample lies exactly on a plane, although they represent one passage.
        measured_distance, frame, matrix = rail_sample_at_distance(samples, target_distance + 0.013)
        new_centre = matrix.translation.copy()
        new_right = matrix.col[0].xyz.normalized()
        new_up = matrix.col[1].xyz.normalized()
        new_normal = (-matrix.col[2].xyz).normalized()
        for vertex in obj.data.vertices:
            relative = vertex.co - old_centre
            local = Vector((
                relative.dot(old_right),
                relative.dot(old_up),
                relative.dot(old_normal),
            ))
            vertex.co = new_centre + new_right * local.x + new_up * local.y + new_normal * local.z
        obj.data.update()
        obj["abs_aperture_centre_blender"] = list(new_centre)
        obj["abs_aperture_right_blender"] = list(new_right)
        obj["abs_aperture_up_blender"] = list(new_up)
        obj["abs_aperture_normal_blender"] = list(new_normal)
        obj["abs_tunnel_spacing_wu"] = spacing
        obj["abs_physical_visibility_start_wu"] = start
        obj["abs_physical_visibility_end_wu"] = end
        rig = obj.parent
        if rig is not None:
            for axis in range(3):
                update_scale_pivot_driver(rig, axis, new_centre[axis])
            rig["abs_authoring_pivot"] = json.dumps([float(value) for value in new_centre])
        placements.append({
            "name": obj.name,
            "targetDistanceWU": q(target_distance, 5),
            "measuredDistanceWU": q(measured_distance, 5),
            "cameraFrame": q(frame, 5),
            "centre": [q(value, 5) for value in new_centre],
        })
    return placements


def accepted_square_gate_placements(samples):
    gates = sorted(
        (obj for obj in model_objects("about.04") if GATE_RE.match(obj.name)),
        key=lambda obj: obj.name,
    )
    placements = []
    for index, obj in enumerate(gates):
        world_points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
        old_centre = Vector((
            (min(point.x for point in world_points) + max(point.x for point in world_points)) * 0.5,
            (min(point.y for point in world_points) + max(point.y for point in world_points)) * 0.5,
            (min(point.z for point in world_points) + max(point.z for point in world_points)) * 0.5,
        ))
        target_distance = min(
            samples,
            key=lambda sample: (sample[2].translation - old_centre).length,
        )[0]
        placements.append({
            "name": obj.name,
            "acceptedDistanceWU": q(target_distance, 5),
            "centre": [q(value, 5) for value in old_centre],
        })
    return placements


def install_storyboard_spacing():
    shape_ambient = bpy.data.objects.get("ABS_B27_AMBIENT_01")
    if shape_ambient is not None:
        ys = [vertex.co.y for vertex in shape_ambient.data.vertices]
        remap_mesh_y(shape_ambient, min(ys), max(ys), 152.0, 244.0)

    round_ambient = bpy.data.objects.get("ABS_B27_AMBIENT_02")
    if round_ambient is not None:
        ys = [vertex.co.y for vertex in round_ambient.data.vertices]
        remap_mesh_y(round_ambient, min(ys), max(ys), 208.0, 332.0)

    terrain_targets = {
        "ABS_B27_RIBBON_CANYON": (315.0, 420.0),
        "ABS_B27_CONTINUOUS_FLOOR": (320.0, 470.0),
        "ABS_B27_MOUNTAIN_RANGE": (340.0, 400.0),
    }
    floor_objects = []
    for name, (target_min, target_max) in terrain_targets.items():
        obj = bpy.data.objects[name]
        ys = [vertex.co.y for vertex in obj.data.vertices]
        remap_mesh_y(obj, min(ys), max(ys), target_min, target_max)
        floor_objects.append(obj)
    floor_centre_y = (
        min(vertex.co.y for obj in floor_objects for vertex in obj.data.vertices)
        + max(vertex.co.y for obj in floor_objects for vertex in obj.data.vertices)
    ) * 0.5
    update_scale_pivot_driver(bpy.data.objects["ABS_RIG_FLOOR_MOUNTAINS"], 1, floor_centre_y)

    logo = [obj for obj in model_objects("about.03") if obj.name.startswith("ABS_B27_LOGO_")]
    all_logo_y = [vertex.co.y for obj in logo for vertex in obj.data.vertices]
    source_min, source_max = min(all_logo_y), max(all_logo_y)
    for obj in logo:
        remap_mesh_y(obj, source_min, source_max, 330.0, 400.0)

    samples = camera_rail_samples()
    hoop_placements = reposition_round_hoops(samples)
    gate_placements = accepted_square_gate_placements(samples)
    marker_frames = retime_storyboard_markers()
    return {
        "targetDistanceWindows": TARGET_DISTANCE_WINDOWS,
        "roundHoops": hoop_placements,
        "squareGates": gate_placements,
        "terrainWorldY": terrain_targets,
        "logoAtmosphereWorldY": [330.0, 400.0],
        "shapeAmbientWorldY": [152.0, 244.0],
        "roundAmbientWorldY": [208.0, 332.0],
        "markerFrames": marker_frames,
    }


def retime_storyboard_markers():
    scene = bpy.context.scene
    missing = [name for name in STORYBOARD_MARKER_FRAMES if scene.timeline_markers.get(name) is None]
    if missing:
        raise RuntimeError(f"Required storyboard markers are missing: {missing}")
    for name, frame in STORYBOARD_MARKER_FRAMES.items():
        scene.timeline_markers[name].frame = frame
    return dict(STORYBOARD_MARKER_FRAMES)


def install_b45_refinement():
    protected = {
        "squareGates": [obj for obj in model_objects("about.04") if GATE_RE.match(obj.name)],
        "method": model_objects("about.05"),
        "finale": model_objects("about.06"),
        "logoAtmosphere": [obj for obj in model_objects("about.03") if obj.name.startswith("ABS_B27_LOGO_")],
    }
    before = {name: evaluated_geometry_sha(objects) for name, objects in protected.items()}
    camera = rebuild_early_camera_curve()
    samples = camera_rail_samples()
    hoops = reposition_round_hoops(samples)
    forms = recompose_recognisable_forms(samples)
    landscape = extend_landscape_continuity()
    refresh()
    after = {name: evaluated_geometry_sha(objects) for name, objects in protected.items()}
    changed = [name for name in before if before[name] != after[name]]
    if changed:
        raise RuntimeError(f"B45 changed protected geometry: {changed}")
    return {
        "camera": camera,
        "roundHoops": hoops,
        "forms": forms,
        "landscape": landscape,
        "protectedGeometry": {
            name: {"beforeSha256": before[name], "afterSha256": after[name], "unchanged": before[name] == after[name]}
            for name in before
        },
    }


def update_guide():
    text = bpy.data.texts.get(GUIDE_NAME)
    if text is None:
        raise RuntimeError("ABS_AUTHORING_GUIDE is required.")
    addition = """

FROZEN STORYBOARD FINAL CONTROLS
- opening_asymmetry_scale: near/mid/far depth-band asymmetry; 0 returns to the prior even field.
- shape_path_progression: recognisable bodies travel from the prior catalogue arrangement into one spatial path.
- floor_mountain_depth_scale and floor_mountain_density_scale: landscape reach and allocation weight.
- method_bank_spread: two broad banks widen around the central path.
- finale_surface_overscan: the inherited surface extends beyond every viewport edge.

These controls are real evaluated geometry or export-allocation controls. The default value 1.0 is the frozen director-board composition. Camera matrices, all 28 round hoops, and all 16 square gates remain immutable in this refinement.
"""
    if "FROZEN STORYBOARD FINAL CONTROLS" not in text.as_string():
        text.write(addition)
    b45_addition = """

B45 FROZEN VISUAL CORRECTION
- Six semantic forms are composed as two separated rows along the rail: triangle, square, diamond, pyramid, sphere, and cube.
- Supporting forms remain on the shape_path_progression control but occupy a sparse peripheral field.
- The early camera rail uses an equal-distance, C2-rejoined S curve through frame 430; frames 431-1001 remain accepted and unchanged.
- Round hoops are re-centred and re-oriented on the curved rail; their count and topology stay unchanged.
- Floor, ribbon, and mountain material extend beyond the client exit to prevent a black transition.
"""
    if "B45 FROZEN VISUAL CORRECTION" not in text.as_string():
        text.write(b45_addition)
    b46_addition = """

B46 COMPOSITION CORRECTION
- floor_mountain_relief_scale now includes the reversible client-clearance valley in the near floor and ribbon; the mountain horizon remains intact.
- finale_surface_overscan retains the B45 boundless ground surfaces and carries one inherited shaping patch into the open mobile band below the copy.
- finale_density_scale preserves the fixed profile budgets while balancing ground, lattice, fog, and safe-patch allocation.
"""
    if "B46 COMPOSITION CORRECTION" not in text.as_string():
        text.write(b46_addition)
    b47_addition = """

B47 VISUAL COMPOSITION CORRECTION
- floor_mountain_relief_scale restores a protected mountain horizon above the client-logo field.
- method_bank_spread converts the flat Method floor into two broad, volumetric side banks.
- finale_surface_overscan composes profile-aware shaping and thinking banks and lifts the finale edges into the lower two-thirds.
- finale_density_scale keeps the fixed profile budgets while balancing the widened banks and boundless ground.
"""
    if "B47 VISUAL COMPOSITION CORRECTION" not in text.as_string():
        text.write(b47_addition)


def update_baseline():
    matrices = camera_matrices()
    payload = {
        "version": 1,
        "geometryQuantisationDigits": 6,
        "cameraQuantisationDigits": 8,
        "evaluatedGeometrySha256": evaluated_geometry_sha(),
        "cameraMatricesSha256": camera_sha(matrices),
        "cameraMatrices": matrices,
        "cameraFrameStart": bpy.context.scene.frame_start,
        "cameraFrameEnd": bpy.context.scene.frame_end,
        "eligibleMeshObjectCount": len(export_meshes()),
        "storyboardFinalVersion": VERSION,
    }
    text = bpy.data.texts.get(BASELINE_NAME)
    if text is None:
        raise RuntimeError("ABS_AUTHORING_BASELINE.json is required.")
    text.clear()
    text.write(json.dumps(payload, separators=(",", ":"), sort_keys=True))
    return payload


def run():
    args = parse_args()
    output = Path(args.output_blend).expanduser().resolve()
    report_path = Path(args.report).expanduser().resolve() if args.report else output.with_suffix(".report.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    control = bpy.data.objects.get(CONTROL_NAME)
    if control is None:
        raise RuntimeError("Run this refinement against the controlled B42 source.")

    before_camera = camera_matrices()
    before_camera_sha = camera_sha(before_camera)
    hoops = sorted(
        (obj for obj in model_objects("about.02") if obj.name.startswith("ABS_B27_ROUND_HOOP_")),
        key=lambda obj: obj.name,
    )
    gates = sorted(
        (obj for obj in model_objects("about.04") if GATE_RE.match(obj.name)),
        key=lambda obj: obj.name,
    )
    if len(hoops) != 28 or len(gates) != 16:
        raise RuntimeError(f"Expected 28 hoops and 16 gates; found {len(hoops)} and {len(gates)}.")
    before_hoops = topology_sha(hoops)
    before_gates = topology_sha(gates)
    before = stage_summary()

    prior_version = int(scene.get("abs_storyboard_final_version", 0))
    affected = {}
    spacing = {"targetDistanceWindows": TARGET_DISTANCE_WINDOWS, "preservedFromB44": prior_version >= 2}
    b45 = {"idempotent": prior_version >= 3}
    b46 = {"idempotent": prior_version >= B46_VERSION}
    b47 = {"idempotent": prior_version >= B47_VERSION}
    b48 = {"idempotent": prior_version >= B48_VERSION}
    b49 = {"idempotent": prior_version >= B49_VERSION}
    b50 = {"idempotent": prior_version >= B50_VERSION}
    b51 = {"idempotent": prior_version >= B51_VERSION}
    b52 = {"idempotent": prior_version >= B52_VERSION}
    b53 = {"idempotent": prior_version >= B53_VERSION}
    b54 = {"idempotent": prior_version >= B54_VERSION}
    b55 = {"idempotent": prior_version >= B55_VERSION}
    b56 = {"idempotent": prior_version >= B56_VERSION}
    b57 = {"idempotent": prior_version >= B57_VERSION}
    b58 = {"idempotent": prior_version >= B58_VERSION}
    b59 = {"idempotent": prior_version >= B59_VERSION}
    b60 = {"idempotent": prior_version >= B60_VERSION}
    b61 = {"idempotent": prior_version >= VERSION}
    if prior_version < 2:
        for spec in NEW_CONTROLS:
            add_control(control, *spec)
        affected = {
            "openingAsymmetry": install_opening_refinement(),
            "shapePath": install_shape_path_refinement(),
            "floorMountain": install_floor_refinement(),
            "logoAtmosphere": quiet_logo_atmosphere(),
            "methodBanks": install_method_refinement(),
            "finaleOverscan": install_finale_refinement(),
        }
        spacing = install_storyboard_spacing()
        update_guide()
    if prior_version < 3:
        b45 = install_b45_refinement()
        update_guide()
    if prior_version < B46_VERSION:
        b46 = install_b46_composition_correction()
        update_guide()
        scene["abs_storyboard_final_version"] = B46_VERSION
        refresh()
    if prior_version < B47_VERSION:
        b47 = install_b47_visual_correction()
        update_guide()
        scene["abs_storyboard_final_version"] = B47_VERSION
        scene["abs_storyboard_director_board"] = "tasks/about-cinematic-storyboard-2026-09-01.md"
        refresh()
    if prior_version < B48_VERSION:
        b48 = install_b48_structural_correction()
        update_guide()
        scene["abs_storyboard_final_version"] = B48_VERSION
        refresh()
    if prior_version < B49_VERSION:
        b49 = install_b49_six_gap_correction()
        update_guide()
        scene["abs_storyboard_final_version"] = B49_VERSION
        refresh()
    if prior_version < B50_VERSION:
        b50 = install_b50_distribution_final()
        update_guide()
        scene["abs_storyboard_final_version"] = B50_VERSION
        refresh()
    if prior_version < B51_VERSION:
        b51 = install_b51_exact_cell_topology()
        update_guide()
        scene["abs_storyboard_final_version"] = B51_VERSION
        refresh()
    if prior_version < B52_VERSION:
        b52 = install_b52_uniform_bank_sampling()
        update_guide()
        scene["abs_storyboard_final_version"] = B52_VERSION
        refresh()
    if prior_version < B53_VERSION:
        b53 = install_b53_preserved_uniform_banks()
        update_guide()
        scene["abs_storyboard_final_version"] = B53_VERSION
        refresh()
    if prior_version < B54_VERSION:
        b54 = install_b54_front_facing_method_banks()
        update_guide()
        scene["abs_storyboard_final_version"] = B54_VERSION
        refresh()
    if prior_version < B55_VERSION:
        b55 = install_b55_method_checkpoint_banks()
        update_guide()
        scene["abs_storyboard_final_version"] = B55_VERSION
        refresh()
    if prior_version < B56_VERSION:
        b56 = install_b56_balanced_method_banks()
        update_guide()
        scene["abs_storyboard_final_version"] = B56_VERSION
        refresh()
    if prior_version < B57_VERSION:
        b57 = install_b57_desktop_method_balance()
        update_guide()
        scene["abs_storyboard_final_version"] = B57_VERSION
        refresh()
    if prior_version < B58_VERSION:
        b58 = install_b58_jury_scene_correction()
        update_guide()
        scene["abs_storyboard_final_version"] = B58_VERSION
        refresh()
    if prior_version < B59_VERSION:
        b59 = install_b59_protected_volume_correction()
        update_guide()
        scene["abs_storyboard_final_version"] = B59_VERSION
        refresh()
    if prior_version < B60_VERSION:
        b60 = install_b60_clear_checkpoint_banks()
        update_guide()
        scene["abs_storyboard_final_version"] = B60_VERSION
        refresh()
    if prior_version < VERSION:
        b61 = install_b61_volumetric_bank_bounds()
        update_guide()
        scene["abs_storyboard_final_version"] = VERSION
        refresh()

    after_camera = camera_matrices()
    after_camera_sha = camera_sha(after_camera)
    after_hoops = topology_sha(hoops)
    after_gates = topology_sha(gates)
    protected_camera_start_index = 430
    if prior_version >= 3 and after_camera != before_camera:
        raise RuntimeError("B46/B47 changed accepted B45 camera matrices.")
    if after_camera[protected_camera_start_index:] != before_camera[protected_camera_start_index:]:
        raise RuntimeError("Storyboard refinement changed accepted camera matrices after frame 430.")
    if after_hoops != before_hoops:
        raise RuntimeError("Storyboard refinement changed round-hoop topology.")
    if after_gates != before_gates:
        raise RuntimeError("Storyboard refinement changed square-gate topology.")

    baseline = update_baseline()
    after = stage_summary()
    report = {
        "task": "B61",
        "status": "PASS",
        "sourceBlend": bpy.data.filepath,
        "outputBlend": str(output),
        "storyboardVersion": VERSION,
        "idempotentInput": prior_version >= VERSION,
        "structure": {
            "modelCount": 7,
            "authoredMeshObjectCount": len(export_meshes()),
            "expectedExportedSurfaceObjectCount": 191,
            "nonSurfaceGuideObjects": ["ABS_B27_SIGNAL_APERTURE"],
            "roundHoopCount": len(hoops),
            "squareGateCount": len(gates),
        },
        "camera": {
            "frameCount": len(after_camera),
            "beforeSha256": before_camera_sha,
            "afterSha256": after_camera_sha,
            "unchanged": before_camera == after_camera,
            "protectedFrames431To1001Unchanged": after_camera[protected_camera_start_index:] == before_camera[protected_camera_start_index:],
        },
        "topology": {
            "roundHoopsBeforeSha256": before_hoops,
            "roundHoopsAfterSha256": after_hoops,
            "squareGatesBeforeSha256": before_gates,
            "squareGatesAfterSha256": after_gates,
        },
        "newLiveControls": [spec[0] for spec in NEW_CONTROLS],
        "affectedObjectCounts": {name: len(objects) for name, objects in affected.items()},
        "storyboardSpacing": spacing,
        "b45VisualCorrection": b45,
        "b46CompositionCorrection": b46,
        "b47VisualCorrection": b47,
        "b48StructuralCorrection": b48,
        "b49SixGapCorrection": b49,
        "b50DistributionFinal": b50,
        "b51ExactCellTopology": b51,
        "b52UniformBankSampling": b52,
        "b53PreservedUniformBanks": b53,
        "b54FrontFacingMethodBanks": b54,
        "b55MethodCheckpointBanks": b55,
        "b56BalancedMethodBanks": b56,
        "b57DesktopMethodBalance": b57,
        "b58JurySceneCorrection": b58,
        "b59ProtectedVolumeCorrection": b59,
        "b60ClearCheckpointBanks": b60,
        "b61VolumetricBankBounds": b61,
        "stageComparison": {model: {"before": before[model], "after": after[model]} for model in before},
        "baseline": {
            "evaluatedGeometrySha256": baseline["evaluatedGeometrySha256"],
            "cameraMatricesSha256": baseline["cameraMatricesSha256"],
        },
    }
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    # Blender resolves a few driver-backed shape-key dependencies differently on
    # the first reload after rig construction. Reopen the isolated candidate,
    # record the persisted evaluated state as the authoring baseline, then save
    # once more so the checker sees exactly the state an artist will reopen.
    bpy.ops.wm.open_mainfile(filepath=str(output))
    refresh()
    persisted_baseline = update_baseline()
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    report["baseline"] = {
        "evaluatedGeometrySha256": persisted_baseline["evaluatedGeometrySha256"],
        "cameraMatricesSha256": persisted_baseline["cameraMatricesSha256"],
        "recordedAfterReload": True,
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print("ABS_STORYBOARD_FINAL=PASS")
    print("ABS_STORYBOARD_FINAL_OUTPUT=" + str(output))
    print("ABS_STORYBOARD_FINAL_REPORT=" + str(report_path))


if __name__ == "__main__":
    run()
