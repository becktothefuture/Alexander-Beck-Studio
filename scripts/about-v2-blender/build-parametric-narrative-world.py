#!/usr/bin/env python3
"""Retired seven-stage About V2 builder retained for recovery archaeology.

Do not run this file to rebuild the current scene. Its implementation describes the
removed 29-point, seven-stage lens direction and would reintroduce the cluttered
finale. Use ``refine-about-v2-stage-separation.py`` against the canonical saved
17-point Blender scene and validate a candidate before promotion.
"""

import argparse
import json
import math
import random
import sys
from bisect import bisect_left
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


PATH_NAME = "ABS_PARAMETRIC_RIDE_PATH"
CAMERA_NAME = "ABS_CAMERA"
CAMERA_FOLLOWER_NAME = "ABS_CAMERA_PATH_FOLLOWER"
CAMERA_LOOKAHEAD_FOLLOWER_NAME = "ABS_CAMERA_LOOKAHEAD_FOLLOWER"
CAMERA_LOOKAHEAD_TARGET_NAME = "ABS_CAMERA_LOOKAHEAD_TARGET"
CAMERA_STEADYCAM_CONSTRAINT_NAME = "ABS_CAMERA_STEADYCAM_AIM"
ROLL_DRIVER_NAME = "ABS_CAMERA_ROLL_DRIVER"
ROOT_COLLECTION = "ABS_NARRATIVE_WORLD"
GUIDE_COLLECTION = "ABS_NARRATIVE_GUIDES"
MODULE_COLLECTION = "00_PARAMETRIC_MODULES"
BASE_PATH_TEXT = "ABOUT_BASE_RIDE_PATH_POINTS"
FIELD_GROUP = "ABS_GN_NARRATIVE_POINT_FIELD"
CANYON_GROUP = "ABS_GN_RIBBON_CANYON"
LATTICE_GROUP = "ABS_GN_RESPONSIVE_LATTICE"
LENS_GROUP = "ABS_GN_LENS_CHAMBER"
ROUND_PORTAL_GROUP = "ABS_GN_ROUND_PORTALS_COLOURED"
SQUARE_DEFORM_GROUP = "ABS_GN_SQUARE_ROLLERCOASTER_DEFORM"
SQUARE_CONTROLS_NAME = "ABS_SQUARE_ROLLERCOASTER_CONTROLS"
SQUARE_PATH_MODIFIER = "ABS_SQUARE_ROLLERCOASTER_PATH"
SQUARE_GATE_PATH_NAME = "ABS_SQUARE_ROLLERCOASTER_GATE_PATH"
HORIZONTAL_FOV = 65.0
CAMERA_STEADYCAM_LOOK_AHEAD_METRES = 55.0
CAMERA_STEADYCAM_TARGET_EXTENSION_METRES = 10.0
STORY_RIDE_LENGTH = 1450.0
PATH_CONTROL_RESOLUTION = 128
PATH_EVALUATION_SAMPLES = 721
FIELD_POINT_CAPACITY = 2200
PATH_GRID_SAMPLES = 241
CANYON_COLUMNS_ACROSS = 32
CANYON_GEOMETRY_END = 0.604
STAGE_RANGES = {
    "00": (0.000, 0.095),
    "01": (0.075, 0.165),
    "02": (0.180, 0.280),
    "03": (0.310, 0.610),
    "04": (0.640, 0.900),
    "05": (0.930, 0.980),
    "06": (0.990, 1.000),
}
STAGE_COLLECTIONS = {
    "00": "ABOUT_STAGE_00_SEED",
    "01": "ABOUT_STAGE_01_NEBULA",
    "02": "ABOUT_STAGE_02_ROUND_PORTALS",
    "03": "ABOUT_STAGE_03_RIBBON_CANYON",
    "04": "ABOUT_STAGE_04_SQUARE_LOOP",
    "05": "ABOUT_STAGE_05_RESPONSIVE_LATTICE",
    "06": "ABOUT_STAGE_06_LENS",
}
DEPRECATED_COLLECTIONS = {
    "01_SIGNAL", "02_HOOPS", "03_YARD", "03A_ABSTRACT_FIELD", "04_LOOP",
    "05_IGNITION", "06_LIVING", "ABS_FLOATING_MODELS",
    "99_ABSTRACT_FIELD_REBUILD_BACKUP", "99_FLOATING_CUBE_BACKUP",
    "99_PRE_NARRATIVE_WORLD_BACKUP", "99_REMOVED_BOTTOM_TRACK_BACKUP",
    "99_REPLACED_FLOATING_PROPS_BACKUP",
}
DEPRECATED_OBJECTS = {
    "ABS_CAMERA_PATH", "ABS_BACKUP_RIDE_PATH_PRE_NARRATIVE",
    "GN_PARAMETRIC_FOREST", "ABS_REMOVED_ROLLERCOASTER_TRACK_BACKUP",
    "ABS_REMOVED_FINALE_TRACK_BUFFERS_BACKUP",
}
MATERIAL_NAMES = tuple(f"ABS_{index}_{role}" for index, role in enumerate(
    ("ATMOSPHERE", "STONE", "STEEL", "GLASS", "SIGNAL", "ORGANIC")
))
REPO_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_BLEND_PATH = (
    REPO_ROOT
    / "source-assets/about-v2-blender-current/about-v2-track-working.blend"
).resolve()


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(
        description="Build the About V2 parametric Blender scene without silently overwriting its source.",
    )
    parser.add_argument(
        "--output-blend",
        help="Explicit candidate .blend destination. Relative paths resolve from the current directory.",
    )
    parser.add_argument(
        "--allow-canonical-overwrite",
        action="store_true",
        help="Explicitly permit saving over the canonical working .blend.",
    )
    parser.add_argument(
        "--overwrite-output",
        action="store_true",
        help="Permit replacing an existing non-canonical candidate .blend.",
    )
    parser.add_argument(
        "--validate-output-only",
        action="store_true",
        help="Validate and report the output path without mutating or saving the scene.",
    )
    return parser.parse_args(argv)


def resolve_build_output(args, current_blend):
    current_blend = Path(current_blend).resolve() if current_blend else None
    if args.output_blend:
        output_blend = Path(args.output_blend).expanduser()
        if not output_blend.is_absolute():
            output_blend = Path.cwd() / output_blend
        output_blend = output_blend.resolve()
    elif args.allow_canonical_overwrite:
        output_blend = current_blend
    else:
        raise RuntimeError(
            "Refusing an implicit in-place Blender rebuild. Pass --output-blend for a candidate "
            "file, or pass --allow-canonical-overwrite to opt into replacing the canonical source."
        )
    if output_blend is None:
        raise RuntimeError("Save the input Blender scene before selecting an in-place output.")
    if output_blend.suffix.lower() != ".blend":
        raise RuntimeError(f"Builder output must be a .blend file: {output_blend}")
    if output_blend == CANONICAL_BLEND_PATH and not args.allow_canonical_overwrite:
        raise RuntimeError(
            "Refusing to overwrite the canonical About V2 .blend without "
            "--allow-canonical-overwrite."
        )
    if (output_blend.exists()
            and output_blend != CANONICAL_BLEND_PATH
            and not args.overwrite_output
            and not args.validate_output_only):
        raise RuntimeError(
            f"Candidate output already exists: {output_blend}. "
            "Choose a new path or pass --overwrite-output explicitly."
        )
    return output_blend


def require_object(name, object_type=None):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f"Missing required Blender object: {name}")
    if object_type and obj.type != object_type:
        raise RuntimeError(f"{name} must be {object_type}, not {obj.type}")
    return obj


def ensure_collection(name, parent=None):
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
    parent = parent or bpy.context.scene.collection
    if collection.name not in {child.name for child in parent.children}:
        parent.children.link(collection)
    return collection


def move_to_collection(obj, destination):
    if destination not in obj.users_collection:
        destination.objects.link(obj)
    for collection in list(obj.users_collection):
        if collection != destination:
            collection.objects.unlink(obj)


def remove_object(name):
    obj = bpy.data.objects.get(name)
    if obj is not None:
        bpy.data.objects.remove(obj, do_unlink=True)


def remove_group(name):
    group = bpy.data.node_groups.get(name)
    if group is not None:
        bpy.data.node_groups.remove(group, do_unlink=True)


def material(index):
    material = bpy.data.materials.get(MATERIAL_NAMES[index])
    if material is None:
        raise RuntimeError(f"Missing required material: {MATERIAL_NAMES[index]}")
    material["abs_palette_slot"] = index
    return material


def add_materials(obj):
    obj.data.materials.clear()
    for index in range(6):
        obj.data.materials.append(material(index))


def remove_collection_and_objects(collection_name, keep_names):
    collection = bpy.data.collections.get(collection_name)
    if collection is None:
        return 0
    removed = 0
    for obj in list(collection.all_objects):
        if obj.name in keep_names:
            if obj.name in collection.objects:
                collection.objects.unlink(obj)
            continue
        bpy.data.objects.remove(obj, do_unlink=True)
        removed += 1
    bpy.data.collections.remove(collection)
    return removed


def remove_deprecated_scene_data(keep_names):
    removed_objects = 0
    for collection_name in sorted(DEPRECATED_COLLECTIONS):
        removed_objects += remove_collection_and_objects(collection_name, keep_names)
    for name in sorted(DEPRECATED_OBJECTS):
        obj = bpy.data.objects.get(name)
        if obj is not None and obj.name not in keep_names:
            bpy.data.objects.remove(obj, do_unlink=True)
            removed_objects += 1
    for obj in list(bpy.data.objects):
        if obj.name in keep_names:
            continue
        if obj.name.startswith("ARCHIVED_") or obj.get("abs_archive_reason"):
            bpy.data.objects.remove(obj, do_unlink=True)
            removed_objects += 1
    return removed_objects


def replace_custom_property(obj, name, value, *, minimum=None, maximum=None, description=""):
    obj[name] = value
    settings = {"description": description}
    if minimum is not None:
        settings["min"] = minimum
        settings["soft_min"] = minimum
    if maximum is not None:
        settings["max"] = maximum
        settings["soft_max"] = maximum
    obj.id_properties_ui(name).update(**settings)


def replace_driver(id_block, data_path, array_index, expression, variables):
    try:
        id_block.driver_remove(data_path, array_index)
    except (TypeError, RuntimeError):
        pass
    curve = id_block.driver_add(data_path, array_index)
    driver = curve.driver
    driver.type = "SCRIPTED"
    driver.expression = expression
    while driver.variables:
        driver.variables.remove(driver.variables[0])
    for name, target_id, target_path in variables:
        variable = driver.variables.new()
        variable.name = name
        variable.type = "SINGLE_PROP"
        variable.targets[0].id = target_id
        variable.targets[0].data_path = target_path
    return curve


def replace_scalar_driver(id_block, data_path, expression, variables):
    try:
        id_block.driver_remove(data_path)
    except (TypeError, RuntimeError):
        pass
    curve = id_block.driver_add(data_path)
    driver = curve.driver
    driver.type = "SCRIPTED"
    driver.expression = expression
    while driver.variables:
        driver.variables.remove(driver.variables[0])
    for name, target_id, target_path in variables:
        variable = driver.variables.new()
        variable.name = name
        variable.type = "SINGLE_PROP"
        variable.targets[0].id = target_id
        variable.targets[0].data_path = target_path
    return curve


def ensure_world_controls(guides, camera):
    controls = bpy.data.objects.get("ABS_WORLD_CONTROLS")
    if controls is None:
        controls = bpy.data.objects.new("ABS_WORLD_CONTROLS", None)
    move_to_collection(controls, guides)
    controls.empty_display_type = "CUBE"
    controls.empty_display_size = 2.0
    controls.hide_render = True
    controls["abs_export"] = False
    replace_custom_property(
        controls, "camera_horizontal_fov", HORIZONTAL_FOV,
        minimum=35.0, maximum=100.0,
        description="Constant horizontal camera FOV. Requested narrative default: 65 degrees.",
    )
    replace_custom_property(
        controls, "camera_steadycam_look_ahead_metres", CAMERA_STEADYCAM_LOOK_AHEAD_METRES,
        minimum=12.0, maximum=100.0,
        description=(
            "How far ahead the camera aims along the rail. Higher values soften yaw and pitch "
            "without changing the camera position or authored roll."
        ),
    )
    replace_custom_property(
        controls, "camera_steadycam_target_extension_metres", CAMERA_STEADYCAM_TARGET_EXTENSION_METRES,
        minimum=0.0, maximum=30.0,
        description=(
            "Forward extension beyond the look-ahead point. This keeps the final camera aim "
            "stable when both rail followers reach the route endpoint."
        ),
    )
    controls["abs_note"] = (
        "Start here for the global FOV and steadycam look-ahead. ABS_PARAMETRIC_RIDE_PATH is the master route; "
        "edit its sparse Bezier handles for route shape. ABS_SQUARE_ROLLERCOASTER_CONTROLS "
        "owns portal and camera-roll settings. Select a GN_ stage "
        "generator for its labelled Geometry Nodes controls. Read ABOUT_PARAMETRIC_WORLD_README."
    )
    camera.data.sensor_fit = "HORIZONTAL"
    camera.data.sensor_width = 36.0
    replace_scalar_driver(
        camera.data, "lens",
        f"36.0/(2.0*tan(fov*{math.pi / 360.0!r}))",
        (("fov", controls, '["camera_horizontal_fov"]'),),
    )
    return controls


def ensure_square_rollercoaster_controls(guides):
    """Create one readable control object for portals and camera roll.

    The route itself is intentionally edited as a sparse Bezier curve. Earlier
    shape-key controls layered hidden deformation over the curve and made the
    visible handles an unreliable source of truth.
    """
    controls = bpy.data.objects.get(SQUARE_CONTROLS_NAME)
    if controls is None:
        controls = bpy.data.objects.new(SQUARE_CONTROLS_NAME, None)
    move_to_collection(controls, guides)
    controls.empty_display_type = "CIRCLE"
    controls.empty_display_size = 4.0
    controls.hide_render = True
    controls.hide_set(False)
    controls["abs_export"] = False

    properties = (
        ("Gate Count", 48, 20, 64, "Number of square portals distributed along the longer threaded rail."),
        ("Gate Start Scale", 1.18, 0.5, 2.0, "Square portal scale at the tunnel entrance."),
        ("Gate End Scale", 0.96, 0.5, 2.0, "Square portal scale at the tunnel exit."),
        ("Gate Twist per Shape", 7.659574, -30.0, 30.0, "Rotates the 48 gates through one full turn in step with the camera."),
        ("Roll Turns", 1.0, -2.0, 2.0, "Signed number of complete camera rolls through the square tunnel."),
    )
    for name, value, minimum, maximum, description in properties:
        replace_custom_property(
            controls, name, value,
            minimum=minimum, maximum=maximum,
            description=description,
        )
    active_property_names = {item[0] for item in properties}
    for legacy_name in (
        "Deformation Strength", "Loop Height Scale", "Loop Depth Scale",
        "Loop Lateral Scale", "Wide Bend", "Counter Bend", "Crest Height",
        "First Hill", "Second Hill",
        "Stage Start", "Stage End", "Bend Amount", "Bend Cycles", "Bend Phase",
        "Vertical Wave", "Vertical Cycles", "Vertical Phase", "Transition Softness",
    ):
        if legacy_name not in active_property_names and legacy_name in controls:
            del controls[legacy_name]
    controls["abs_note"] = (
        "Square portal and camera-roll controls. Edit route shape directly on the sparse Bezier "
        "curve ABS_PARAMETRIC_RIDE_PATH; this object controls gate count, gate scale, gate twist, "
        "and signed camera Roll Turns. Save and re-export for website changes."
    )
    return controls


def drive_modifier_input(modifier, display_name, controls, property_name, expression="value"):
    """Bind a Geometry Nodes modifier input to one central custom property."""
    identifier = set_modifier_input(modifier, display_name, controls[property_name])
    owner = modifier.id_data
    data_path = f'modifiers["{modifier.name}"]["{identifier}"]'
    replace_scalar_driver(
        owner, data_path, expression,
        (("value", controls, f'["{property_name}"]'),),
    )
    return identifier


def clear_modifier_input_driver(modifier, display_name, value):
    identifier = set_modifier_input(modifier, display_name, value)
    owner = modifier.id_data
    data_path = f'modifiers["{modifier.name}"]["{identifier}"]'
    try:
        owner.driver_remove(data_path)
    except (TypeError, RuntimeError):
        pass
    return identifier


def configure_square_rollercoaster_path(path, controls):
    """Keep one direct, sparse Bezier rail as the route source of truth."""
    modifier = path.modifiers.get(SQUARE_PATH_MODIFIER)
    if modifier is not None:
        path.modifiers.remove(modifier)
    if path.animation_data:
        prefix = f'modifiers["{SQUARE_PATH_MODIFIER}"]'
        for curve in list(path.animation_data.drivers):
            if curve.data_path.startswith(prefix):
                path.animation_data.drivers.remove(curve)
    remove_group(SQUARE_DEFORM_GROUP)
    stale_gate_path = bpy.data.objects.get(SQUARE_GATE_PATH_NAME)
    if stale_gate_path is not None:
        bpy.data.objects.remove(stale_gate_path, do_unlink=True)
    if path.data.shape_keys is not None:
        path.shape_key_clear()
    path["abs_square_rollercoaster_controller"] = controls.name
    path["abs_square_rollercoaster_mode"] = "sparse-bezier-direct-edit"
    for legacy_property in ("abs_square_rollercoaster_shape_keys",):
        if legacy_property in path:
            del path[legacy_property]
    return []


def bind_square_gate_controls(gate, controls):
    modifier = gate.modifiers["ABS_PARAMETRIC_EFFECT"]
    clear_modifier_input_driver(modifier, "Start on Path (0-1)", STAGE_RANGES["04"][0])
    clear_modifier_input_driver(modifier, "End on Path (0-1)", STAGE_RANGES["04"][1])
    bindings = (
        ("Instance Count", "Gate Count"),
        ("Start Scale", "Gate Start Scale"),
        ("End Scale", "Gate End Scale"),
        ("Roll per Shape (degrees)", "Gate Twist per Shape"),
    )
    for input_name, property_name in bindings:
        drive_modifier_input(modifier, input_name, controls, property_name)
    gate["abs_square_rollercoaster_controller"] = controls.name


def restore_and_expand_path(path):
    """Remove legacy dense-rail state before rebuilding the editable route."""
    if path.data.shape_keys is not None:
        path.shape_key_clear()
    legacy_text = bpy.data.texts.get(BASE_PATH_TEXT)
    if legacy_text is not None:
        bpy.data.texts.remove(legacy_text)
    path.data.dimensions = "3D"
    path.data.resolution_u = PATH_CONTROL_RESOLUTION
    path.data.twist_mode = "Z_UP"
    for legacy_property in ("abs_narrative_length_scale",):
        if legacy_property in path:
            del path[legacy_property]
    path["abs_note"] = (
        "Authoritative sparse Bezier narrative rail. Edit its labelled control anchors and "
        "handles; Blender evaluates a smooth arc-length path for the camera and every stage. "
        "Point tilt stays zero so the dedicated roll curve is the only source of camera bank."
    )


def smootherstep(value):
    value = max(0.0, min(1.0, value))
    return value * value * value * (value * (value * 6.0 - 15.0) + 10.0)


def compose_story_aligned_flight_path(path):
    """Build a sparse Bezier control rail with a smooth arc-length evaluation.

    The previous implementation wrote hundreds of sampled POLY points into the
    editable curve. The same authored silhouette now uses a small set of named
    Bezier anchors and explicit aligned handles. Blender's Follow Path constraint
    evaluates the curve by physical distance, so the camera remains constant-speed
    without exposing the dense evaluation samples as editable anchors.
    """
    if not path.data.splines:
        raise RuntimeError("ABS_PARAMETRIC_RIDE_PATH needs at least two points.")

    matrix_world = path.matrix_world.copy()
    matrix_local = matrix_world.inverted()
    source_spline = path.data.splines[0]
    source_points = source_spline.bezier_points if source_spline.type == "BEZIER" else source_spline.points
    if not source_points:
        raise RuntimeError("ABS_PARAMETRIC_RIDE_PATH contains no points.")
    first_coordinate = source_points[0].co.xyz if hasattr(source_points[0].co, "xyz") else source_points[0].co
    origin = matrix_world @ Vector(first_coordinate)
    tunnel_start, tunnel_end = STAGE_RANGES["02"]
    terrain_start, terrain_end = STAGE_RANGES["03"]
    square_start, square_end = STAGE_RANGES["04"]
    forest_start, forest_end = STAGE_RANGES["05"]

    def straight(t):
        return Vector((0.0, t, 0.0))

    def round_tunnel(t):
        envelope = math.sin(math.pi * t) ** 2
        lateral = 0.13 * envelope * math.sin(math.tau * t)
        return Vector((lateral, t, 0.0))

    def terrain_flight(t):
        climb = smootherstep((t - 0.62) / 0.38)
        return Vector((0.0, t, 0.085 * climb))

    def aerial_handoff(t):
        return Vector((0.0, t, 0.045 * smootherstep(t)))

    def cubic_bezier(first, control_a, control_b, last, factor):
        inverse = 1.0 - factor
        return (
            first * (inverse ** 3)
            + control_a * (3.0 * inverse * inverse * factor)
            + control_b * (3.0 * inverse * factor * factor)
            + last * (factor ** 3)
        )

    def square_threaded_pretzel(t):
        """One non-crossing loop followed by a half-turn through its open centre."""
        loop_end = 0.68
        half_turn_end = 0.82
        align_end = 0.86
        thread_end = 0.94
        exit_turn_end = 0.985
        if t <= loop_end:
            local = t / loop_end
            angle = math.tau * local
            # The lateral pitch separates the rising and falling sides in 3D.
            # They can overlap in a side view, but the rails never occupy the
            # same space or return through the same bottom line.
            return Vector((
                0.80 * local,
                (0.90 * local) + math.sin(angle),
                1.50 * (1.0 - math.cos(angle)),
            ))
        if t <= half_turn_end:
            local = (t - loop_end) / (half_turn_end - loop_end)
            angle = math.pi * (1.0 - local)
            return Vector((
                1.80 + math.cos(angle),
                0.90 + 0.30 * smootherstep(local) + math.sin(angle),
                smootherstep(local),
            ))
        if t <= align_end:
            local = (t - half_turn_end) / (align_end - half_turn_end)
            angle = -0.5 * math.pi * local
            return Vector((
                2.05 + 0.75 * math.cos(angle),
                1.20 + 0.75 * math.sin(angle),
                1.0,
            ))
        if t <= thread_end:
            local = (t - align_end) / (thread_end - align_end)
            # Cross the first loop's empty volume laterally. This is the visual
            # payoff: the camera threads the hole without crossing the rail.
            return Vector((2.05 - (3.05 * local), 0.45, 1.0))
        if t <= exit_turn_end:
            local = (t - thread_end) / (exit_turn_end - thread_end)
            angle = -0.5 * math.pi * (1.0 + local)
            return Vector((
                -1.00 + math.cos(angle),
                1.45 + math.sin(angle),
                1.00 - 0.65 * smootherstep(local),
            ))
        local = (t - exit_turn_end) / (1.0 - exit_turn_end)
        return cubic_bezier(
            Vector((-2.00, 1.45, 0.35)),
            Vector((-2.00, 1.70, 0.20)),
            Vector((-1.20, 2.00, 0.0)),
            Vector((-1.20, 2.80, 0.0)),
            local,
        )

    def forest_handoff(t):
        transition = smootherstep(t)
        return Vector((1.05125 * transition, t, -1.079997 * transition))

    def forest_flight(t):
        return Vector((0.0, t, -0.08 * smootherstep(t)))

    def finale_handoff(t):
        return Vector((0.0, t, -0.02 * smootherstep(t)))

    segment_specs = (
        (0.0, tunnel_start, "straight-star-field-approach", straight),
        (tunnel_start, tunnel_end, "gentle-left-right-round-tunnel", round_tunnel),
        (tunnel_end, terrain_start, "clear-tunnel-field-handoff", straight),
        (terrain_start, terrain_end, "long-low-terrain-aircraft-climb", terrain_flight),
        (terrain_end, square_start, "aerial-loop-climb-handoff", aerial_handoff),
        (square_start, square_end, "threaded-open-square-pretzel-loop", square_threaded_pretzel),
        (square_end, forest_start, "clear-loop-forest-handoff", forest_handoff),
        (forest_start, forest_end, "kinetic-forest-flight", forest_flight),
        (forest_end, STAGE_RANGES["06"][0], "clear-forest-finale-handoff", finale_handoff),
        (STAGE_RANGES["06"][0], 1.0, "level-finale-approach", straight),
    )

    segment_records = []
    cursor = origin.copy()
    for start, end, name, function in segment_specs:
        target_length = STORY_RIDE_LENGTH * (end - start)
        raw_samples = [function(index / 4096.0) for index in range(4097)]
        cumulative_lengths = [0.0]
        for index in range(1, len(raw_samples)):
            cumulative_lengths.append(
                cumulative_lengths[-1]
                + (raw_samples[index] - raw_samples[index - 1]).length
            )
        raw_length = cumulative_lengths[-1]
        scale = target_length / max(1e-9, raw_length)
        segment_records.append({
            "start": start,
            "end": end,
            "name": name,
            "function": function,
            "origin": cursor.copy(),
            "scale": scale,
            "targetLength": target_length,
            "rawSamples": raw_samples,
            "cumulativeLengths": cumulative_lengths,
            "rawLength": raw_length,
        })
        cursor += function(1.0) * scale

    def arc_length_sample(record, factor):
        target = factor * record["rawLength"]
        index = bisect_left(record["cumulativeLengths"], target)
        if index <= 0:
            return record["rawSamples"][0].copy()
        if index >= len(record["rawSamples"]):
            return record["rawSamples"][-1].copy()
        before_length = record["cumulativeLengths"][index - 1]
        after_length = record["cumulativeLengths"][index]
        local = (target - before_length) / max(1e-9, after_length - before_length)
        return record["rawSamples"][index - 1].lerp(record["rawSamples"][index], local)

    def story_world(progress):
        segment = next(
            record for record in segment_records
            if progress <= record["end"] + 1e-9
        )
        span = max(1e-9, segment["end"] - segment["start"])
        factor = max(0.0, min(1.0, (progress - segment["start"]) / span))
        return segment["origin"] + (arc_length_sample(segment, factor) * segment["scale"])

    # Twenty-nine meaningful anchors replace the previous 721 editable points.
    # The loop itself needs only its eighth-turns, offset half-turn, centre pass,
    # and exit. Blender interpolates the intervening ride with cubic handles.
    round_span = tunnel_end - tunnel_start
    square_span = square_end - square_start
    square_record = next(record for record in segment_records if record["start"] == square_start)

    def square_progress(raw_parameter):
        raw_index = round(max(0.0, min(1.0, raw_parameter)) * (len(square_record["rawSamples"]) - 1))
        arc_factor = square_record["cumulativeLengths"][raw_index] / square_record["rawLength"]
        return square_start + square_span * arc_factor

    anchor_specs = (
        (0.000, "ride-start"),
        (0.120, "straight-approach"),
        (tunnel_start, "round-tunnel-entry"),
        (tunnel_start + round_span * 0.25, "round-left-curve"),
        (tunnel_start + round_span * 0.75, "round-right-curve"),
        (tunnel_end, "round-tunnel-exit"),
        (terrain_start, "terrain-entry"),
        (0.500, "terrain-rise"),
        (terrain_end, "terrain-exit"),
        (square_progress(0.000), "aerial-loop-entry"),
        (square_progress(0.085), "loop-eighth"),
        (square_progress(0.170), "loop-quarter"),
        (square_progress(0.255), "loop-three-eighths"),
        (square_progress(0.340), "loop-crest"),
        (square_progress(0.425), "loop-five-eighths"),
        (square_progress(0.510), "loop-three-quarter"),
        (square_progress(0.595), "loop-seven-eighths"),
        (square_progress(0.680), "loop-complete"),
        (square_progress(0.750), "offset-half-turn-midpoint"),
        (square_progress(0.820), "offset-half-turn-apex"),
        (square_progress(0.860), "thread-entry"),
        (square_progress(0.900), "thread-centre"),
        (square_progress(0.940), "thread-exit"),
        (square_progress(0.985), "forest-alignment"),
        (square_progress(1.000), "loop-forest-exit"),
        (forest_start, "forest-entry"),
        (forest_end, "forest-exit"),
        (STAGE_RANGES["06"][0], "finale-entry"),
        (1.000, "ride-end"),
    )
    anchor_world = [story_world(progress) for progress, _label in anchor_specs]
    anchor_progress = [progress for progress, _label in anchor_specs]
    handles_left = []
    handles_right = []
    for index, coordinate in enumerate(anchor_world):
        progress = anchor_progress[index]
        previous_progress = anchor_progress[max(0, index - 1)]
        following_progress = anchor_progress[min(len(anchor_progress) - 1, index + 1)]
        epsilon = min(0.0001, max(1e-6, (following_progress - previous_progress) * 0.01))
        before = story_world(max(0.0, progress - epsilon))
        after = story_world(min(1.0, progress + epsilon))
        tangent = after - before
        if tangent.length_squared < 1e-12:
            tangent = anchor_world[min(len(anchor_world) - 1, index + 1)] - anchor_world[max(0, index - 1)]
        if tangent.length_squared < 1e-12:
            tangent = Vector((0.0, 1.0, 0.0))
        else:
            tangent.normalize()
        previous_span = progress - previous_progress if index else following_progress - progress
        following_span = following_progress - progress if index < len(anchor_world) - 1 else previous_span
        handles_left.append(coordinate - tangent * STORY_RIDE_LENGTH * previous_span / 3.0)
        handles_right.append(coordinate + tangent * STORY_RIDE_LENGTH * following_span / 3.0)

    # Cubic smoothing changes total distance slightly. Scale anchors and handles
    # once around the fixed start so the published ride remains exactly 1450 m.
    dense_preview = []
    for index in range(len(anchor_world) - 1):
        for step in range(PATH_CONTROL_RESOLUTION):
            dense_preview.append(cubic_bezier(
                anchor_world[index], handles_right[index], handles_left[index + 1],
                anchor_world[index + 1], step / PATH_CONTROL_RESOLUTION,
            ))
    dense_preview.append(anchor_world[-1])
    preview_length = sum(
        (dense_preview[index] - dense_preview[index - 1]).length
        for index in range(1, len(dense_preview))
    )
    final_scale = STORY_RIDE_LENGTH / max(1e-9, preview_length)
    anchor_world = [origin + (coordinate - origin) * final_scale for coordinate in anchor_world]
    handles_left = [origin + (coordinate - origin) * final_scale for coordinate in handles_left]
    handles_right = [origin + (coordinate - origin) * final_scale for coordinate in handles_right]

    path.data.splines.clear()
    spline = path.data.splines.new("BEZIER")
    spline.bezier_points.add(len(anchor_specs) - 1)
    spline.use_cyclic_u = False
    for index, point in enumerate(spline.bezier_points):
        point.handle_left_type = "FREE"
        point.handle_right_type = "FREE"
        point.co = matrix_local @ anchor_world[index]
        point.handle_left = matrix_local @ handles_left[index]
        point.handle_right = matrix_local @ handles_right[index]
        point.handle_left_type = "ALIGNED"
        point.handle_right_type = "ALIGNED"
        point.tilt = 0.0
        point.radius = 1.0

    path.data.dimensions = "3D"
    path.data.resolution_u = PATH_CONTROL_RESOLUTION
    path.data.twist_mode = "Z_UP"
    path.data.update_tag()
    evaluated_points = sample_path_world(path, PATH_EVALUATION_SAMPLES)
    evaluated_length = sum(
        (evaluated_points[index] - evaluated_points[index - 1]).length
        for index in range(1, len(evaluated_points))
    )
    serializable_segments = [{
        "name": record["name"],
        "start": record["start"],
        "end": record["end"],
        "targetLength": round(record["targetLength"], 6),
        "scale": round(record["scale"], 6),
        "origin": [round(value, 6) for value in record["origin"]],
    } for record in segment_records]
    path["abs_progress_contract"] = json.dumps({
        "mode": "sparse-bezier-controls-with-arc-length-camera-evaluation",
        "targetLength": round(evaluated_length, 6),
        "controlPointCount": len(anchor_specs),
        "evaluationSamples": PATH_EVALUATION_SAMPLES,
        "curveResolution": PATH_CONTROL_RESOLUTION,
        "segments": serializable_segments,
    }, separators=(",", ":"))
    path["abs_control_anchors"] = json.dumps([
        {"index": index, "progress": round(progress, 6), "label": label}
        for index, (progress, label) in enumerate(anchor_specs)
    ], separators=(",", ":"))
    path["abs_round_tunnel_profile"] = json.dumps({
        "tunnelStart": tunnel_start,
        "tunnelEnd": tunnel_end,
        "lateralAmplitude": "gentle-left-right",
        "bankDegrees": [-8.0, 8.0],
        "mode": "straight-star-approach-gentle-s-curve-level-field-exit",
    }, separators=(",", ":"))
    path["abs_valley_rail_profile"] = json.dumps({
        "terrainStart": terrain_start,
        "terrainEnd": terrain_end,
        "squareStart": square_start,
        "squareEnd": square_end,
        "forestStart": forest_start,
        "forestEnd": forest_end,
        "squareMode": "non-crossing-threaded-pretzel-with-synchronised-architectural-and-camera-roll",
        "mode": "continuous-spaced-story-aligned-flight",
    }, separators=(",", ":"))
    loop_record = square_record
    loop_samples = evaluated_points[
        round(square_start * (len(evaluated_points) - 1)):
        round(square_end * (len(evaluated_points) - 1)) + 1
    ]
    separation_window = max(4, round(len(loop_samples) * 0.10))
    minimum_nonlocal_clearance = min(
        (loop_samples[first] - loop_samples[second]).length
        for first in range(len(loop_samples))
        for second in range(first + separation_window, len(loop_samples))
    )
    loop_min_z = min(point.z for point in loop_samples)
    loop_max_z = max(point.z for point in loop_samples)
    path["abs_open_loop_profile"] = json.dumps({
        "start": square_start,
        "end": square_end,
        "targetLength": round(loop_record["targetLength"], 6),
        "height": round(loop_max_z - loop_min_z, 6),
        "forwardAdvance": round(loop_samples[-1].y - loop_samples[0].y, 6),
        "lateralExitOffset": round(loop_samples[-1].x - loop_samples[0].x, 6),
        "minimumNonlocalRailClearance": round(minimum_nonlocal_clearance, 6),
        "closed": False,
        "revolutions": 1.0,
        "postLoopHalfTurn": True,
        "threadsFirstLoopOpening": True,
        "selfCrossing": False,
    }, separators=(",", ":"))
    path["abs_note"] = (
        "Authoritative 29-anchor Bezier rail. The star fields are straight, the round tunnel "
        "uses one gentle left-right S-curve, the terrain is a long low flight with a late "
        "aircraft climb, and the square gates form a non-crossing aerial pretzel: one loop, "
        "an offset half-turn, then a pass through the first loop's open centre before the forest. "
        "Edit the visible curve handles; point tilt stays zero and sparse roll keys own banking."
    )


def sample_path_world(path, sample_count=PATH_EVALUATION_SAMPLES):
    """Return uniformly spaced world points from the editable curve."""
    spline = path.data.splines[0]
    dense = []
    if spline.type == "BEZIER":
        controls = spline.bezier_points
        segment_count = len(controls) if spline.use_cyclic_u else len(controls) - 1
        steps = max(8, path.data.resolution_u * 2)
        for index in range(segment_count):
            following_index = (index + 1) % len(controls)
            first = controls[index]
            following = controls[following_index]
            for step in range(steps):
                factor = step / steps
                inverse = 1.0 - factor
                local = (
                    first.co * (inverse ** 3)
                    + first.handle_right * (3.0 * inverse * inverse * factor)
                    + following.handle_left * (3.0 * inverse * factor * factor)
                    + following.co * (factor ** 3)
                )
                dense.append(path.matrix_world @ local)
        dense.append(path.matrix_world @ controls[0 if spline.use_cyclic_u else -1].co)
    else:
        for point in spline.points:
            dense.append(path.matrix_world @ point.co.xyz)
    if len(dense) < 2:
        raise RuntimeError(f"{PATH_NAME} cannot be evaluated with fewer than two points.")

    cumulative = [0.0]
    for index in range(1, len(dense)):
        cumulative.append(cumulative[-1] + (dense[index] - dense[index - 1]).length)
    total = cumulative[-1]
    points = []
    for index in range(sample_count):
        distance = total * index / (sample_count - 1)
        upper = bisect_left(cumulative, distance)
        if upper <= 0:
            points.append(dense[0].copy())
            continue
        if upper >= len(dense):
            points.append(dense[-1].copy())
            continue
        lower = upper - 1
        factor = (distance - cumulative[lower]) / max(1e-9, cumulative[upper] - cumulative[lower])
        points.append(dense[lower].lerp(dense[upper], factor))
    return points


def path_points_and_frames(path):
    points = sample_path_world(path)
    frames = []
    world_up = Vector((0.0, 0.0, 1.0))
    previous_right = None
    for index, center in enumerate(points):
        before = points[max(0, index - 1)]
        after = points[min(len(points) - 1, index + 1)]
        tangent = (after - before).normalized()
        if previous_right is None:
            right = tangent.cross(world_up)
            if right.length_squared < 1e-8:
                right = Vector((1.0, 0.0, 0.0))
            else:
                right.normalize()
        else:
            # Parallel transport prevents the frame from snapping when the
            # rollercoaster tangent points vertically through the aerial loop.
            right = previous_right - tangent * tangent.dot(previous_right)
            if right.length_squared < 1e-8:
                right = tangent.cross(world_up)
            right.normalize()
        up = right.cross(tangent).normalized()
        frames.append((center, tangent, right, up))
        previous_right = right
    return frames


def interpolate_frame(frames, progress):
    scaled = max(0.0, min(1.0, progress)) * (len(frames) - 1)
    index = min(len(frames) - 2, int(math.floor(scaled)))
    factor = scaled - index
    first, second = frames[index], frames[index + 1]
    center = first[0].lerp(second[0], factor)
    tangent = first[1].lerp(second[1], factor).normalized()
    right = first[2].lerp(second[2], factor).normalized()
    up = right.cross(tangent).normalized()
    return center, tangent, right, up


def add_attribute(mesh, name, data_type, values):
    attribute = mesh.attributes.get(name) or mesh.attributes.new(
        name=name, type=data_type, domain="POINT"
    )
    field_name = "vector" if data_type == "FLOAT_VECTOR" else "value"
    for item, value in zip(attribute.data, values):
        setattr(item, field_name, value)


def create_field_base(name, frames, capacity=FIELD_POINT_CAPACITY, progress_range=(0.0, 1.0)):
    rng = random.Random(506832829)
    vertices = [(0.0, 0.0, 0.0)] * capacity
    mesh = bpy.data.meshes.new(f"{name}_BASE_MESH")
    mesh.from_pydata(vertices, [], [])
    path_values, centers, directions, forwards = [], [], [], []
    radii, longitudinal, noise_values, ids, palettes, angles = [], [], [], [], [], []
    for index in range(capacity):
        progress = progress_range[0] + (rng.random() * (progress_range[1] - progress_range[0]))
        center, tangent, right, up = interpolate_frame(frames, progress)
        angle = rng.random() * math.tau
        direction = (right * math.cos(angle) + up * math.sin(angle)).normalized()
        path_values.append(progress)
        centers.append(tuple(center))
        directions.append(tuple(direction))
        forwards.append(tuple(tangent))
        radii.append(rng.random())
        longitudinal.append((rng.random() * 2.0) - 1.0)
        noise_values.append(rng.random())
        ids.append(index)
        palettes.append(index % 6)
        angles.append(angle)
    add_attribute(mesh, "abs_path", "FLOAT", path_values)
    add_attribute(mesh, "abs_center", "FLOAT_VECTOR", centers)
    add_attribute(mesh, "abs_offset_dir", "FLOAT_VECTOR", directions)
    add_attribute(mesh, "abs_forward", "FLOAT_VECTOR", forwards)
    add_attribute(mesh, "abs_rand_radius", "FLOAT", radii)
    add_attribute(mesh, "abs_longitudinal", "FLOAT", longitudinal)
    add_attribute(mesh, "abs_noise", "FLOAT", noise_values)
    add_attribute(mesh, "abs_id", "INT", ids)
    add_attribute(mesh, "abs_palette", "INT", palettes)
    add_attribute(mesh, "abs_angle", "FLOAT", angles)
    return mesh


def create_canyon_base(name, frames, rows=PATH_GRID_SAMPLES, columns_across=CANYON_COLUMNS_ACROSS):
    """Create one continuous, world-horizontal terrain sheet around the curved route."""
    vertices, faces, palettes, face_palettes = [], [], [], []
    centers, rights, ups, u_values, path_values = [], [], [], [], []
    stride = columns_across + 1
    terrain_ground_z = interpolate_frame(frames, STAGE_RANGES["03"][0])[0].z
    world_up = Vector((0.0, 0.0, 1.0))
    for row in range(rows):
        progress = row / (rows - 1)
        center, _tangent, right, _up = interpolate_frame(frames, progress)
        center = Vector((center.x, center.y, terrain_ground_z))
        for column in range(stride):
            u = -1.0 + (2.0 * column / columns_across)
            vertices.append(tuple(center))
            centers.append(tuple(center))
            rights.append(tuple(right))
            ups.append(tuple(world_up))
            u_values.append(u)
            path_values.append(progress)
            palettes.append((row // 18 + column // 6) % 6)
    for row in range(rows - 1):
        for column in range(columns_across):
            first = row * stride + column
            faces.append((first, first + 1, first + stride + 1, first + stride))
            territory = (row // 12) + (column // 5) * 2
            meander = ((row // 31) + (column // 9)) % 3
            face_palettes.append((territory + meander) % 6)
    mesh = bpy.data.meshes.new(f"{name}_BASE_MESH")
    mesh.from_pydata(vertices, [], faces)
    for polygon, palette in zip(mesh.polygons, face_palettes):
        polygon.material_index = palette
    add_attribute(mesh, "abs_center", "FLOAT_VECTOR", centers)
    add_attribute(mesh, "abs_right", "FLOAT_VECTOR", rights)
    add_attribute(mesh, "abs_up", "FLOAT_VECTOR", ups)
    add_attribute(mesh, "abs_u", "FLOAT", u_values)
    add_attribute(mesh, "abs_path", "FLOAT", path_values)
    add_attribute(mesh, "abs_palette", "INT", palettes)
    mesh.update()
    return mesh


def group_socket(group, name, socket_type, default, description, minimum=None, maximum=None, parent=None):
    socket = group.interface.new_socket(
        name=name, in_out="INPUT", socket_type=socket_type, parent=parent
    )
    if default is not None:
        socket.default_value = default
    socket.description = description
    if minimum is not None:
        socket.min_value = minimum
    if maximum is not None:
        socket.max_value = maximum
    return socket


def output_geometry(group):
    return group.interface.new_socket(
        name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry"
    )


def input_geometry(group):
    return group.interface.new_socket(
        name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry"
    )


def new_group(name, description):
    remove_group(name)
    group = bpy.data.node_groups.new(name, "GeometryNodeTree")
    group.description = description
    return group


def node(group, node_type, label=None, location=(0, 0)):
    item = group.nodes.new(node_type)
    item.location = location
    if label:
        item.label = label
    return item


def socket(collection, name, index=None):
    result = collection.get(name)
    if result is not None:
        return result
    if index is not None and index < len(collection):
        return collection[index]
    raise RuntimeError(f"Missing node socket {name!r}")


def named_attribute(group, name, data_type, location):
    item = node(group, "GeometryNodeInputNamedAttribute", f"Read {name}", location)
    item.data_type = data_type
    socket(item.inputs, "Name", 0).default_value = name
    return item


def math_node(group, operation, location, value=None):
    item = node(group, "ShaderNodeMath", operation.replace("_", " ").title(), location)
    item.operation = operation
    if value is not None:
        socket(item.inputs, "Value", 1).default_value = value
    return item


def vector_math(group, operation, location):
    item = node(group, "ShaderNodeVectorMath", operation.replace("_", " ").title(), location)
    item.operation = operation
    return item


def compare(group, operation, data_type, location):
    item = node(group, "FunctionNodeCompare", operation.replace("_", " ").title(), location)
    item.data_type = data_type
    item.operation = operation
    return item


def boolean_math(group, operation, location):
    item = node(group, "FunctionNodeBooleanMath", operation.title(), location)
    item.operation = operation
    return item


def build_point_field_group(dot_source):
    group = new_group(FIELD_GROUP, "Master-path-driven multicolour particle field with live density, corridor, clustering, and erosion controls.")
    output_geometry(group)
    input_geometry(group)
    placement = group.interface.new_panel(name="Path and Population")
    form = group.interface.new_panel(name="Field Form")
    path_guide = group_socket(group, "Path Guide", "NodeSocketObject", None, "Authoritative route curve sampled live by every field point.", parent=placement)
    start = group_socket(group, "Start on Path (0-1)", "NodeSocketFloat", 0.0, "Normalized stage start.", 0.0, 1.0, placement)
    end = group_socket(group, "End on Path (0-1)", "NodeSocketFloat", 0.2, "Normalized stage end.", 0.0, 1.0, placement)
    count = group_socket(group, "Particle Count", "NodeSocketInt", 500, "Maximum active low-poly dot bodies.", 1, FIELD_POINT_CAPACITY, placement)
    radius = group_socket(group, "Field Radius", "NodeSocketFloat", 30.0, "Maximum distance from the rail.", 2.0, 100.0, form)
    corridor = group_socket(group, "Corridor Radius", "NodeSocketFloat", 7.0, "Protected camera passage.", 0.5, 30.0, form)
    vertical_scale = group_socket(group, "Vertical Scale", "NodeSocketFloat", 1.0, "Stretches or flattens the field in world Z without changing its protected rail corridor.", 0.25, 2.5, form)
    dot_radius = group_socket(group, "Dot Radius", "NodeSocketFloat", 0.3, "Preview dot body radius.", 0.05, 2.0, form)
    cluster = group_socket(group, "Cluster Strength", "NodeSocketFloat", 0.5, "Biases points into islands.", 0.0, 1.0, form)
    erosion = group_socket(group, "Erosion", "NodeSocketFloat", 0.2, "Removes low-noise points and creates pockets.", 0.0, 0.85, form)
    longitudinal = group_socket(group, "Longitudinal Jitter", "NodeSocketFloat", 4.0, "Offsets points along the path tangent.", 0.0, 20.0, form)

    n = group.nodes
    links = group.links
    group_in = node(group, "NodeGroupInput", "Live stage controls", (-1200, 80))
    group_out = node(group, "NodeGroupOutput", "Realised export geometry", (1160, 80))
    path_attr = named_attribute(group, "abs_path", "FLOAT", (-1180, -260))
    path_info = node(group, "GeometryNodeObjectInfo", "Read the master route", (-1180, 420))
    path_info.transform_space = "RELATIVE"
    links.new(group_in.outputs[path_guide.identifier], path_info.inputs["Object"])
    path_sample = node(group, "GeometryNodeSampleCurve", "Sample the live route frame", (-930, 360))
    path_sample.mode = "FACTOR"
    links.new(path_info.outputs["Geometry"], path_sample.inputs["Curves"])
    links.new(path_attr.outputs["Attribute"], path_sample.inputs["Factor"])
    id_attr = named_attribute(group, "abs_id", "INT", (-1180, -390))
    noise_attr = named_attribute(group, "abs_noise", "FLOAT", (-1180, -520))
    lower = compare(group, "LESS_THAN", "FLOAT", (-920, -220))
    upper = compare(group, "GREATER_THAN", "FLOAT", (-920, -340))
    too_many = compare(group, "GREATER_EQUAL", "INT", (-920, -460))
    eroded = compare(group, "LESS_THAN", "FLOAT", (-920, -580))
    links.new(path_attr.outputs["Attribute"], lower.inputs["A"])
    links.new(group_in.outputs[start.identifier], lower.inputs["B"])
    links.new(path_attr.outputs["Attribute"], upper.inputs["A"])
    links.new(group_in.outputs[end.identifier], upper.inputs["B"])
    links.new(id_attr.outputs["Attribute"], too_many.inputs["A"])
    links.new(group_in.outputs[count.identifier], too_many.inputs["B"])
    links.new(noise_attr.outputs["Attribute"], eroded.inputs["A"])
    links.new(group_in.outputs[erosion.identifier], eroded.inputs["B"])
    or1 = boolean_math(group, "OR", (-680, -300))
    or2 = boolean_math(group, "OR", (-680, -440))
    outside = boolean_math(group, "OR", (-470, -350))
    links.new(lower.outputs["Result"], or1.inputs[0])
    links.new(upper.outputs["Result"], or1.inputs[1])
    links.new(too_many.outputs["Result"], or2.inputs[0])
    links.new(eroded.outputs["Result"], or2.inputs[1])
    links.new(or1.outputs["Boolean"], outside.inputs[0])
    links.new(or2.outputs["Boolean"], outside.inputs[1])
    delete = node(group, "GeometryNodeDeleteGeometry", "Keep the selected stage population", (-220, 80))
    delete.domain = "POINT"
    links.new(group_in.outputs[0], delete.inputs["Geometry"])
    links.new(outside.outputs["Boolean"], delete.inputs["Selection"])

    angle_attr = named_attribute(group, "abs_angle", "FLOAT", (-650, 120))
    angle_cos = math_node(group, "COSINE", (-460, 170))
    angle_sin = math_node(group, "SINE", (-460, 70))
    links.new(angle_attr.outputs["Attribute"], angle_cos.inputs[0])
    links.new(angle_attr.outputs["Attribute"], angle_sin.inputs[0])
    binormal = vector_math(group, "CROSS_PRODUCT", (-650, 330))
    links.new(path_sample.outputs["Tangent"], binormal.inputs[0])
    links.new(path_sample.outputs["Normal"], binormal.inputs[1])
    binormal_scaled = vector_math(group, "SCALE", (-260, 230))
    normal_scaled = vector_math(group, "SCALE", (-260, 120))
    links.new(binormal.outputs[0], binormal_scaled.inputs[0])
    links.new(angle_cos.outputs[0], binormal_scaled.inputs[3])
    links.new(path_sample.outputs["Normal"], normal_scaled.inputs[0])
    links.new(angle_sin.outputs[0], normal_scaled.inputs[3])
    direction = vector_math(group, "ADD", (-70, 210))
    links.new(binormal_scaled.outputs[0], direction.inputs[0])
    links.new(normal_scaled.outputs[0], direction.inputs[1])
    random_radius = named_attribute(group, "abs_rand_radius", "FLOAT", (-650, -140))
    long_attr = named_attribute(group, "abs_longitudinal", "FLOAT", (-650, -270))
    radius_cubed1 = math_node(group, "MULTIPLY", (-420, -110))
    radius_cubed2 = math_node(group, "MULTIPLY", (-240, -110))
    links.new(random_radius.outputs["Attribute"], radius_cubed1.inputs[0])
    links.new(random_radius.outputs["Attribute"], radius_cubed1.inputs[1])
    links.new(radius_cubed1.outputs[0], radius_cubed2.inputs[0])
    links.new(random_radius.outputs["Attribute"], radius_cubed2.inputs[1])
    one_minus = math_node(group, "SUBTRACT", (-420, -250), 1.0)
    one_minus.inputs[0].default_value = 1.0
    links.new(group_in.outputs[cluster.identifier], one_minus.inputs[1])
    weighted_linear = math_node(group, "MULTIPLY", (-220, -240))
    weighted_cluster = math_node(group, "MULTIPLY", (-220, -330))
    links.new(random_radius.outputs["Attribute"], weighted_linear.inputs[0])
    links.new(one_minus.outputs[0], weighted_linear.inputs[1])
    links.new(radius_cubed2.outputs[0], weighted_cluster.inputs[0])
    links.new(group_in.outputs[cluster.identifier], weighted_cluster.inputs[1])
    mixed_radius = math_node(group, "ADD", (-20, -260))
    links.new(weighted_linear.outputs[0], mixed_radius.inputs[0])
    links.new(weighted_cluster.outputs[0], mixed_radius.inputs[1])
    span = math_node(group, "SUBTRACT", (-20, -70))
    links.new(group_in.outputs[radius.identifier], span.inputs[0])
    links.new(group_in.outputs[corridor.identifier], span.inputs[1])
    radial_scaled = math_node(group, "MULTIPLY", (170, -110))
    links.new(mixed_radius.outputs[0], radial_scaled.inputs[0])
    links.new(span.outputs[0], radial_scaled.inputs[1])
    radial_distance = math_node(group, "ADD", (350, -110))
    links.new(radial_scaled.outputs[0], radial_distance.inputs[0])
    links.new(group_in.outputs[corridor.identifier], radial_distance.inputs[1])
    direction_xyz = node(group, "ShaderNodeSeparateXYZ", "Read field direction axes", (170, 300))
    links.new(direction.outputs[0], direction_xyz.inputs["Vector"])
    scaled_z = math_node(group, "MULTIPLY", (350, 300))
    links.new(direction_xyz.outputs["Z"], scaled_z.inputs[0])
    links.new(group_in.outputs[vertical_scale.identifier], scaled_z.inputs[1])
    shaped_direction = node(group, "ShaderNodeCombineXYZ", "Apply vertical field scale", (520, 300))
    links.new(direction_xyz.outputs["X"], shaped_direction.inputs["X"])
    links.new(direction_xyz.outputs["Y"], shaped_direction.inputs["Y"])
    links.new(scaled_z.outputs[0], shaped_direction.inputs["Z"])
    radial_vector = vector_math(group, "SCALE", (700, 180))
    links.new(shaped_direction.outputs["Vector"], radial_vector.inputs[0])
    links.new(radial_distance.outputs[0], radial_vector.inputs[3])
    long_scale = math_node(group, "MULTIPLY", (170, -260))
    links.new(long_attr.outputs["Attribute"], long_scale.inputs[0])
    links.new(group_in.outputs[longitudinal.identifier], long_scale.inputs[1])
    long_vector = vector_math(group, "SCALE", (520, -10))
    links.new(path_sample.outputs["Tangent"], long_vector.inputs[0])
    links.new(long_scale.outputs[0], long_vector.inputs[3])
    add_offset = vector_math(group, "ADD", (880, 100))
    final_position = vector_math(group, "ADD", (1060, 150))
    links.new(radial_vector.outputs[0], add_offset.inputs[0])
    links.new(long_vector.outputs[0], add_offset.inputs[1])
    links.new(path_sample.outputs["Position"], final_position.inputs[0])
    links.new(add_offset.outputs[0], final_position.inputs[1])
    set_position = node(group, "GeometryNodeSetPosition", "Place dots around the rail", (10, 80))
    links.new(delete.outputs["Geometry"], set_position.inputs["Geometry"])
    links.new(final_position.outputs[0], set_position.inputs["Position"])

    source_info = node(group, "GeometryNodeObjectInfo", "Low-poly dot source", (210, 300))
    source_info.transform_space = "ORIGINAL"
    source_info.inputs["Object"].default_value = dot_source
    source_info.inputs["As Instance"].default_value = False
    scale_xyz = node(group, "ShaderNodeCombineXYZ", "Uniform dot radius", (250, -20))
    for axis in ("X", "Y", "Z"):
        links.new(group_in.outputs[dot_radius.identifier], scale_xyz.inputs[axis])
    instances = node(group, "GeometryNodeInstanceOnPoints", "Instance complete dot bodies", (470, 80))
    links.new(set_position.outputs["Geometry"], instances.inputs["Points"])
    links.new(source_info.outputs["Geometry"], instances.inputs["Instance"])
    links.new(scale_xyz.outputs["Vector"], instances.inputs["Scale"])
    realise = node(group, "GeometryNodeRealizeInstances", "Realise for surfel export", (670, 80))
    links.new(instances.outputs["Instances"], realise.inputs["Geometry"])
    palette_attr = named_attribute(group, "abs_palette", "INT", (650, -180))
    set_material_index = node(group, "GeometryNodeSetMaterialIndex", "Restore six palette roles", (880, 80))
    links.new(realise.outputs["Geometry"], set_material_index.inputs["Geometry"])
    links.new(palette_attr.outputs["Attribute"], set_material_index.inputs["Material Index"])
    links.new(set_material_index.outputs["Geometry"], group_out.inputs["Geometry"])
    return group


def build_canyon_group():
    group = new_group(CANYON_GROUP, "One broad master-path-driven terrain surface with a live lowland-to-mountain progression and dot-density envelope.")
    output_geometry(group)
    input_geometry(group)
    footprint = group.interface.new_panel(name="Path and Footprint")
    terrain = group.interface.new_panel(name="Terrain Progression")
    path_guide = group_socket(group, "Path Guide", "NodeSocketObject", None, "Authoritative route curve sampled live by every terrain row.", parent=footprint)
    start = group_socket(group, "Start on Path (0-1)", "NodeSocketFloat", STAGE_RANGES["03"][0], "Canyon start.", 0.0, 1.0, footprint)
    end = group_socket(group, "End on Path (0-1)", "NodeSocketFloat", STAGE_RANGES["03"][1], "Canyon end.", 0.0, 1.0, footprint)
    width = group_socket(group, "Canyon Width", "NodeSocketFloat", 210.0, "Maximum width of the continuous terrain sheet.", 20.0, 260.0, footprint)
    clearance = group_socket(group, "Camera Clearance", "NodeSocketFloat", 5.0, "Nominal rail height above the terrain centre.", 3.0, 30.0, footprint)
    path_height = group_socket(group, "Path Height Influence", "NodeSocketFloat", 0.0, "How much vertical rail editing lifts the terrain. Keep at zero for a level floor while the camera climbs.", 0.0, 1.0, footprint)
    fade_in = group_socket(group, "Density Fade In", "NodeSocketFloat", 0.12, "Stage fraction used to grow website dots from no density to full density across the broad terrain.", 0.02, 0.45, footprint)
    fade_out = group_socket(group, "Density Fade Out", "NodeSocketFloat", 0.12, "Stage fraction used to return website dots from full density to no density across the broad terrain.", 0.02, 0.45, footprint)
    protected_corridor = group_socket(group, "Protected Corridor", "NodeSocketFloat", 0.035, "Normalized half-width with reduced, but non-zero, relief beneath the rail.", 0.01, 0.55, footprint)
    centre_relief = group_socket(group, "Centre Relief", "NodeSocketFloat", 0.82, "Fraction of the terrain relief retained beneath the camera.", 0.0, 1.0, footprint)
    flat_end = group_socket(group, "Flat End", "NodeSocketFloat", 0.14, "Stage-local end of the short, nearly flat introduction.", 0.0, 0.5, terrain)
    hill_height = group_socket(group, "Hill Height", "NodeSocketFloat", 9.0, "Early broad hill amplitude.", 0.0, 32.0, terrain)
    hill_scale = group_socket(group, "Hill Scale", "NodeSocketFloat", 1.15, "Normalized low-frequency terrain scale.", 0.2, 8.0, terrain)
    mountain_start = group_socket(group, "Mountain Start", "NodeSocketFloat", 0.42, "Stage-local onset of the stronger mountain layer.", 0.1, 0.95, terrain)
    mountain_height = group_socket(group, "Mountain Height", "NodeSocketFloat", 24.0, "Late ridged-mountain amplitude.", 0.0, 80.0, terrain)
    mountain_scale = group_socket(group, "Mountain Scale", "NodeSocketFloat", 2.4, "Normalized mountain noise scale.", 0.5, 12.0, terrain)
    wall_lift = group_socket(group, "Wall Lift", "NodeSocketFloat", 9.0, "Raises the outer terrain near the mountain end.", 0.0, 60.0, terrain)
    interaction = group_socket(group, "Interaction", "NodeSocketFloat", 0.4, "Cross-surface wave influence.", 0.0, 1.5, terrain)
    seed = group_socket(group, "Terrain Seed", "NodeSocketFloat", 3117.0, "Noise phase; integer-like values are easiest to compare.", 0.0, 99999.0, terrain)

    links = group.links
    group_in = node(group, "NodeGroupInput", "Live canyon controls", (-1300, 80))
    group_out = node(group, "NodeGroupOutput", "Deformed multicolour terrain", (1220, 80))
    path_attr = named_attribute(group, "abs_path", "FLOAT", (-1280, -280))
    path_info = node(group, "GeometryNodeObjectInfo", "Read the master route", (-1280, 450))
    path_info.transform_space = "RELATIVE"
    links.new(group_in.outputs[path_guide.identifier], path_info.inputs["Object"])
    path_sample = node(group, "GeometryNodeSampleCurve", "Sample the live terrain route", (-1020, 400))
    path_sample.mode = "FACTOR"
    links.new(path_info.outputs["Geometry"], path_sample.inputs["Curves"])
    links.new(path_attr.outputs["Attribute"], path_sample.inputs["Factor"])
    lower = compare(group, "LESS_THAN", "FLOAT", (-1040, -250))
    upper = compare(group, "GREATER_THAN", "FLOAT", (-1040, -380))
    links.new(path_attr.outputs["Attribute"], lower.inputs["A"])
    links.new(group_in.outputs[start.identifier], lower.inputs["B"])
    links.new(path_attr.outputs["Attribute"], upper.inputs["A"])
    links.new(group_in.outputs[end.identifier], upper.inputs["B"])
    outside = boolean_math(group, "OR", (-820, -300))
    links.new(lower.outputs["Result"], outside.inputs[0])
    links.new(upper.outputs["Result"], outside.inputs[1])
    delete = node(group, "GeometryNodeDeleteGeometry", "Trim the full-path ribbon base", (-600, 80))
    delete.domain = "POINT"
    links.new(group_in.outputs[0], delete.inputs["Geometry"])
    links.new(outside.outputs["Boolean"], delete.inputs["Selection"])

    local_factor = node(group, "ShaderNodeMapRange", "Normalize the selected canyon section", (-800, -100))
    local_factor.clamp = True
    local_factor.interpolation_type = "LINEAR"
    links.new(path_attr.outputs["Attribute"], local_factor.inputs["Value"])
    links.new(group_in.outputs[start.identifier], local_factor.inputs["From Min"])
    links.new(group_in.outputs[end.identifier], local_factor.inputs["From Max"])
    local_factor.inputs["To Min"].default_value = 0.0
    local_factor.inputs["To Max"].default_value = 1.0

    baked_center_attr = named_attribute(group, "abs_center", "FLOAT_VECTOR", (-760, 260))
    sampled_xyz = node(group, "ShaderNodeSeparateXYZ", "Read live rail coordinates", (-580, 430))
    baked_xyz = node(group, "ShaderNodeSeparateXYZ", "Read authored terrain level", (-580, 310))
    links.new(path_sample.outputs["Position"], sampled_xyz.inputs["Vector"])
    links.new(baked_center_attr.outputs["Attribute"], baked_xyz.inputs["Vector"])
    one_minus_height = math_node(group, "SUBTRACT", (-380, 330))
    one_minus_height.inputs[0].default_value = 1.0
    links.new(group_in.outputs[path_height.identifier], one_minus_height.inputs[1])
    baked_z_weighted = math_node(group, "MULTIPLY", (-210, 330))
    sampled_z_weighted = math_node(group, "MULTIPLY", (-210, 420))
    links.new(baked_xyz.outputs["Z"], baked_z_weighted.inputs[0])
    links.new(one_minus_height.outputs[0], baked_z_weighted.inputs[1])
    links.new(sampled_xyz.outputs["Z"], sampled_z_weighted.inputs[0])
    links.new(group_in.outputs[path_height.identifier], sampled_z_weighted.inputs[1])
    live_z = math_node(group, "ADD", (-30, 370))
    links.new(baked_z_weighted.outputs[0], live_z.inputs[0])
    links.new(sampled_z_weighted.outputs[0], live_z.inputs[1])
    live_center = node(group, "ShaderNodeCombineXYZ", "Follow rail XY with controlled height", (140, 390))
    links.new(sampled_xyz.outputs["X"], live_center.inputs["X"])
    links.new(sampled_xyz.outputs["Y"], live_center.inputs["Y"])
    links.new(live_z.outputs[0], live_center.inputs["Z"])
    world_up = node(group, "ShaderNodeCombineXYZ", "World-up terrain axis", (-380, 160))
    world_up.inputs["Z"].default_value = 1.0
    right_cross = vector_math(group, "CROSS_PRODUCT", (-190, 210))
    links.new(path_sample.outputs["Tangent"], right_cross.inputs[0])
    links.new(world_up.outputs["Vector"], right_cross.inputs[1])
    live_right = vector_math(group, "NORMALIZE", (0, 210))
    links.new(right_cross.outputs[0], live_right.inputs[0])
    u_attr = named_attribute(group, "abs_u", "FLOAT", (-560, -20))
    half_width = math_node(group, "MULTIPLY", (-360, -20))
    half_width.inputs[1].default_value = 0.5
    links.new(group_in.outputs[width.identifier], half_width.inputs[0])
    fade_in_envelope = node(group, "ShaderNodeMapRange", "Ease terrain density in", (-520, -760))
    fade_in_envelope.clamp = True
    fade_in_envelope.interpolation_type = "SMOOTHERSTEP"
    links.new(local_factor.outputs["Result"], fade_in_envelope.inputs["Value"])
    fade_in_envelope.inputs["From Min"].default_value = 0.0
    links.new(group_in.outputs[fade_in.identifier], fade_in_envelope.inputs["From Max"])
    fade_in_envelope.inputs["To Min"].default_value = 0.0
    fade_in_envelope.inputs["To Max"].default_value = 1.0
    fade_out_start = math_node(group, "SUBTRACT", (-520, -900))
    fade_out_start.inputs[0].default_value = 1.0
    links.new(group_in.outputs[fade_out.identifier], fade_out_start.inputs[1])
    fade_out_envelope = node(group, "ShaderNodeMapRange", "Ease terrain density out", (-300, -900))
    fade_out_envelope.clamp = True
    fade_out_envelope.interpolation_type = "SMOOTHERSTEP"
    links.new(local_factor.outputs["Result"], fade_out_envelope.inputs["Value"])
    links.new(fade_out_start.outputs[0], fade_out_envelope.inputs["From Min"])
    fade_out_envelope.inputs["From Max"].default_value = 1.0
    fade_out_envelope.inputs["To Min"].default_value = 1.0
    fade_out_envelope.inputs["To Max"].default_value = 0.0
    density_envelope = math_node(group, "MULTIPLY", (-80, -820))
    links.new(fade_in_envelope.outputs["Result"], density_envelope.inputs[0])
    links.new(fade_out_envelope.outputs["Result"], density_envelope.inputs[1])
    lateral = math_node(group, "MULTIPLY", (-170, -20))
    links.new(u_attr.outputs["Attribute"], lateral.inputs[0])
    links.new(half_width.outputs[0], lateral.inputs[1])
    side_vector = vector_math(group, "SCALE", (20, 220))
    links.new(live_right.outputs[0], side_vector.inputs[0])
    links.new(lateral.outputs[0], side_vector.inputs[3])
    base_position = vector_math(group, "ADD", (220, 260))
    links.new(live_center.outputs["Vector"], base_position.inputs[0])
    links.new(side_vector.outputs[0], base_position.inputs[1])

    hill_growth = node(group, "ShaderNodeMapRange", "Grow from flat into hills", (-350, -190))
    hill_growth.clamp = True
    hill_growth.interpolation_type = "SMOOTHERSTEP"
    links.new(local_factor.outputs["Result"], hill_growth.inputs["Value"])
    links.new(group_in.outputs[flat_end.identifier], hill_growth.inputs["From Min"])
    links.new(group_in.outputs[mountain_start.identifier], hill_growth.inputs["From Max"])
    hill_growth.inputs["To Min"].default_value = 0.0
    hill_growth.inputs["To Max"].default_value = 1.0
    mountain_growth = node(group, "ShaderNodeMapRange", "Grow the mountainous exit", (-350, -350))
    mountain_growth.clamp = True
    mountain_growth.interpolation_type = "SMOOTHERSTEP"
    links.new(local_factor.outputs["Result"], mountain_growth.inputs["Value"])
    links.new(group_in.outputs[mountain_start.identifier], mountain_growth.inputs["From Min"])
    mountain_growth.inputs["From Max"].default_value = 1.0
    mountain_growth.inputs["To Min"].default_value = 0.0
    mountain_growth.inputs["To Max"].default_value = 1.0

    noise_vector = node(group, "ShaderNodeCombineXYZ", "Stable path-space terrain coordinates", (-100, -520))
    links.new(u_attr.outputs["Attribute"], noise_vector.inputs["X"])
    links.new(local_factor.outputs["Result"], noise_vector.inputs["Y"])
    links.new(group_in.outputs[seed.identifier], noise_vector.inputs["Z"])
    hill_noise = node(group, "ShaderNodeTexNoise", "Broad hill noise", (100, -430))
    hill_noise.noise_dimensions = "3D"
    links.new(noise_vector.outputs["Vector"], hill_noise.inputs["Vector"])
    links.new(group_in.outputs[hill_scale.identifier], hill_noise.inputs["Scale"])
    hill_noise.inputs["Detail"].default_value = 2.0
    hill_noise.inputs["Roughness"].default_value = 0.52
    mountain_noise = node(group, "ShaderNodeTexNoise", "Mountain detail noise", (100, -650))
    mountain_noise.noise_dimensions = "3D"
    links.new(noise_vector.outputs["Vector"], mountain_noise.inputs["Vector"])
    links.new(group_in.outputs[mountain_scale.identifier], mountain_noise.inputs["Scale"])
    mountain_noise.inputs["Detail"].default_value = 5.0
    mountain_noise.inputs["Roughness"].default_value = 0.68

    def centred_noise(noise_node, height_socket, growth_output, x, y):
        centre = math_node(group, "SUBTRACT", (x, y))
        centre.inputs[1].default_value = 0.5
        amplitude = math_node(group, "MULTIPLY", (x + 170, y))
        apply_growth = math_node(group, "MULTIPLY", (x + 340, y))
        links.new(noise_node.outputs["Fac"], centre.inputs[0])
        links.new(centre.outputs[0], amplitude.inputs[0])
        links.new(group_in.outputs[height_socket.identifier], amplitude.inputs[1])
        links.new(amplitude.outputs[0], apply_growth.inputs[0])
        links.new(growth_output, apply_growth.inputs[1])
        return apply_growth.outputs[0]

    hill_value = centred_noise(hill_noise, hill_height, hill_growth.outputs["Result"], 320, -420)
    ridge_center = math_node(group, "SUBTRACT", (320, -690))
    ridge_center.inputs[1].default_value = 0.5
    links.new(mountain_noise.outputs["Fac"], ridge_center.inputs[0])
    ridge_abs = math_node(group, "ABSOLUTE", (490, -690))
    links.new(ridge_center.outputs[0], ridge_abs.inputs[0])
    ridge_double = math_node(group, "MULTIPLY", (660, -690))
    ridge_double.inputs[1].default_value = 2.0
    links.new(ridge_abs.outputs[0], ridge_double.inputs[0])
    ridge_invert = math_node(group, "SUBTRACT", (830, -690))
    ridge_invert.inputs[0].default_value = 1.0
    links.new(ridge_double.outputs[0], ridge_invert.inputs[1])
    ridge_peak = math_node(group, "MULTIPLY", (1000, -690))
    links.new(ridge_invert.outputs[0], ridge_peak.inputs[0])
    links.new(ridge_invert.outputs[0], ridge_peak.inputs[1])
    ridge_baseline = math_node(group, "SUBTRACT", (1170, -690))
    ridge_baseline.inputs[1].default_value = 0.08
    links.new(ridge_peak.outputs[0], ridge_baseline.inputs[0])
    ridge_height = math_node(group, "MULTIPLY", (1340, -690))
    links.new(ridge_baseline.outputs[0], ridge_height.inputs[0])
    links.new(group_in.outputs[mountain_height.identifier], ridge_height.inputs[1])
    ridge_growth = math_node(group, "MULTIPLY", (1510, -690))
    links.new(ridge_height.outputs[0], ridge_growth.inputs[0])
    links.new(mountain_growth.outputs["Result"], ridge_growth.inputs[1])
    mountain_uplift = math_node(group, "MULTIPLY", (1340, -590))
    mountain_uplift.inputs[1].default_value = 10.0
    links.new(mountain_growth.outputs["Result"], mountain_uplift.inputs[0])
    mountain_value = math_node(group, "ADD", (1510, -590))
    links.new(ridge_growth.outputs[0], mountain_value.inputs[0])
    links.new(mountain_uplift.outputs[0], mountain_value.inputs[1])
    sum_terrain = math_node(group, "ADD", (1680, -500))
    links.new(hill_value, sum_terrain.inputs[0])
    links.new(mountain_value.outputs[0], sum_terrain.inputs[1])
    abs_u = math_node(group, "ABSOLUTE", (320, -220))
    wall_power = math_node(group, "MULTIPLY", (500, -220))
    wall_height_node = math_node(group, "MULTIPLY", (680, -220))
    wall_growth_node = math_node(group, "MULTIPLY", (860, -220))
    links.new(u_attr.outputs["Attribute"], abs_u.inputs[0])
    links.new(abs_u.outputs[0], wall_power.inputs[0])
    links.new(abs_u.outputs[0], wall_power.inputs[1])
    links.new(wall_power.outputs[0], wall_height_node.inputs[0])
    links.new(group_in.outputs[wall_lift.identifier], wall_height_node.inputs[1])
    links.new(wall_height_node.outputs[0], wall_growth_node.inputs[0])
    links.new(mountain_growth.outputs["Result"], wall_growth_node.inputs[1])
    wave_phase = math_node(group, "MULTIPLY", (320, -80))
    wave_phase.inputs[1].default_value = math.tau * 2.0
    wave = math_node(group, "SINE", (500, -80))
    wave_amount = math_node(group, "MULTIPLY", (680, -80))
    wave_growth = math_node(group, "MULTIPLY", (860, -80))
    links.new(local_factor.outputs["Result"], wave_phase.inputs[0])
    links.new(wave_phase.outputs[0], wave.inputs[0])
    links.new(wave.outputs[0], wave_amount.inputs[0])
    links.new(group_in.outputs[interaction.identifier], wave_amount.inputs[1])
    links.new(wave_amount.outputs[0], wave_growth.inputs[0])
    links.new(mountain_growth.outputs["Result"], wave_growth.inputs[1])
    add_walls = math_node(group, "ADD", (1030, -350))
    add_wave = math_node(group, "ADD", (1030, -190))
    links.new(sum_terrain.outputs[0], add_walls.inputs[0])
    links.new(wall_growth_node.outputs[0], add_walls.inputs[1])
    links.new(add_walls.outputs[0], add_wave.inputs[0])
    links.new(wave_growth.outputs[0], add_wave.inputs[1])
    corridor_mask = node(group, "ShaderNodeMapRange", "Protect the camera corridor", (1050, -40))
    corridor_mask.clamp = True
    corridor_mask.interpolation_type = "SMOOTHERSTEP"
    links.new(abs_u.outputs[0], corridor_mask.inputs["Value"])
    links.new(group_in.outputs[protected_corridor.identifier], corridor_mask.inputs["From Min"])
    corridor_mask.inputs["From Max"].default_value = 0.78
    links.new(group_in.outputs[centre_relief.identifier], corridor_mask.inputs["To Min"])
    corridor_mask.inputs["To Max"].default_value = 1.0
    protected_height = math_node(group, "MULTIPLY", (1230, -190))
    links.new(add_wave.outputs[0], protected_height.inputs[0])
    links.new(corridor_mask.outputs["Result"], protected_height.inputs[1])
    centre_clearance_cap = math_node(group, "SUBTRACT", (1230, -60))
    centre_clearance_cap.inputs[1].default_value = 2.2
    links.new(group_in.outputs[clearance.identifier], centre_clearance_cap.inputs[0])
    lateral_clearance_cap = node(group, "ShaderNodeMapRange", "Keep a safe low-flight channel", (1400, -60))
    lateral_clearance_cap.clamp = True
    lateral_clearance_cap.interpolation_type = "SMOOTHERSTEP"
    links.new(abs_u.outputs[0], lateral_clearance_cap.inputs["Value"])
    lateral_clearance_cap.inputs["From Min"].default_value = 0.0
    lateral_clearance_cap.inputs["From Max"].default_value = 0.55
    links.new(centre_clearance_cap.outputs[0], lateral_clearance_cap.inputs["To Min"])
    lateral_clearance_cap.inputs["To Max"].default_value = 100.0
    safe_height = math_node(group, "MINIMUM", (1570, -120))
    links.new(protected_height.outputs[0], safe_height.inputs[0])
    links.new(lateral_clearance_cap.outputs["Result"], safe_height.inputs[1])
    negative_clearance = math_node(group, "MULTIPLY", (1050, -520))
    negative_clearance.inputs[1].default_value = -1.0
    links.new(group_in.outputs[clearance.identifier], negative_clearance.inputs[0])
    lower_floor = math_node(group, "ADD", (1400, -190))
    links.new(safe_height.outputs[0], lower_floor.inputs[0])
    links.new(negative_clearance.outputs[0], lower_floor.inputs[1])
    vertical = vector_math(group, "SCALE", (720, 180))
    links.new(world_up.outputs["Vector"], vertical.inputs[0])
    links.new(lower_floor.outputs[0], vertical.inputs[3])
    final_position = vector_math(group, "ADD", (1580, 220))
    links.new(base_position.outputs[0], final_position.inputs[0])
    links.new(vertical.outputs[0], final_position.inputs[1])
    set_position = node(group, "GeometryNodeSetPosition", "Deform the continuous terrain", (1760, 80))
    links.new(delete.outputs["Geometry"], set_position.inputs["Geometry"])
    links.new(final_position.outputs[0], set_position.inputs["Position"])
    store_density = node(group, "GeometryNodeStoreNamedAttribute", "Store website dot density", (1960, 80))
    store_density.domain = "POINT"
    store_density.data_type = "FLOAT"
    store_density.inputs["Name"].default_value = "abs_density_weight"
    links.new(set_position.outputs["Geometry"], store_density.inputs["Geometry"])
    links.new(density_envelope.outputs[0], store_density.inputs["Value"])
    links.new(store_density.outputs["Geometry"], group_out.inputs["Geometry"])
    return group


def create_box_variant_collection(name, prefix, dimensions):
    modules = ensure_collection(MODULE_COLLECTION)
    collection = bpy.data.collections.get(name)
    if collection is not None:
        for obj in list(collection.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
    else:
        collection = ensure_collection(name, modules)
    collection.hide_viewport = True
    collection.hide_render = True
    for index in range(6):
        mesh = bpy.data.meshes.new(f"{prefix}_{index:02d}_MESH")
        x, y, z = (value * 0.5 for value in dimensions)
        vertices = [
            (-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
            (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z),
        ]
        faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (4, 0, 3, 7)]
        mesh.from_pydata(vertices, [], faces)
        mesh.materials.append(material(index))
        obj = bpy.data.objects.new(f"{prefix}_{index:02d}", mesh)
        collection.objects.link(obj)
        obj.hide_render = False
        obj.hide_set(True)
        obj["abs_export"] = False
    return collection


def build_lattice_group(variant_collection):
    group = new_group(LATTICE_GROUP, "Dense responsive multicolour strand field with a protected camera corridor and travelling Blender preview waves.")
    output_geometry(group)
    footprint = group.interface.new_panel(name="Footprint and Density")
    form = group.interface.new_panel(name="Strand Form")
    motion = group.interface.new_panel(name="Motion")
    width = group_socket(group, "Lattice Width", "NodeSocketFloat", 132.0, "Side-to-side field span.", 20.0, 180.0, footprint)
    depth = group_socket(group, "Lattice Depth", "NodeSocketFloat", 115.0, "Longitudinal field span.", 40.0, 320.0, footprint)
    columns = group_socket(group, "Columns Across", "NodeSocketInt", 41, "Cross-route strand density.", 5, 80, footprint)
    rows = group_socket(group, "Rows Deep", "NodeSocketInt", 58, "Longitudinal strand density.", 5, 100, footprint)
    corridor = group_socket(group, "Corridor Width", "NodeSocketFloat", 16.0, "Protected empty passage.", 3.0, 40.0, footprint)
    jitter = group_socket(group, "Position Jitter", "NodeSocketFloat", 1.8, "Seeded XY position variation.", 0.0, 5.0, footprint)
    strand_keep = group_socket(group, "Strand Keep", "NodeSocketFloat", 0.82, "Fraction of strands retained; lower values open deliberate windows through the field.", 0.2, 1.0, footprint)
    thickness = group_socket(group, "Strand Thickness", "NodeSocketFloat", 0.28, "X/Y strand scale.", 0.1, 3.0, form)
    height_min = group_socket(group, "Height Min", "NodeSocketFloat", 15.0, "Minimum strand height.", 2.0, 70.0, form)
    height_max = group_socket(group, "Height Max", "NodeSocketFloat", 40.0, "Maximum strand height.", 3.0, 90.0, form)
    seed = group_socket(group, "Variation Seed", "NodeSocketInt", 47, "Stable height and position pattern.", 0, 99999, form)
    amplitude = group_socket(group, "Wave Amplitude", "NodeSocketFloat", 7.0, "Vertical travelling-wave height.", 0.0, 25.0, motion)
    wavelength = group_socket(group, "Wave Length", "NodeSocketFloat", 38.0, "Distance between crests.", 5.0, 120.0, motion)
    speed = group_socket(group, "Wave Speed", "NodeSocketFloat", 0.24, "Blender preview speed.", 0.0, 2.0, motion)
    delay = group_socket(group, "Response Delay", "NodeSocketFloat", 0.18, "Neighbour response offset.", 0.0, 1.5, motion)

    links = group.links
    group_in = node(group, "NodeGroupInput", "Live lattice controls", (-1200, 80))
    group_out = node(group, "NodeGroupOutput", "Realised six-colour lattice", (1160, 80))
    grid = node(group, "GeometryNodeMeshGrid", "Generate the complete footprint", (-980, 80))
    links.new(group_in.outputs[width.identifier], grid.inputs["Size X"])
    links.new(group_in.outputs[depth.identifier], grid.inputs["Size Y"])
    links.new(group_in.outputs[columns.identifier], grid.inputs["Vertices X"])
    links.new(group_in.outputs[rows.identifier], grid.inputs["Vertices Y"])
    random_position = node(group, "FunctionNodeRandomValue", "Seeded XY jitter", (-980, -180))
    random_position.data_type = "FLOAT_VECTOR"
    random_position.inputs["Min"].default_value = (-1.0, -1.0, 0.0)
    random_position.inputs["Max"].default_value = (1.0, 1.0, 0.0)
    links.new(group_in.outputs[seed.identifier], random_position.inputs["Seed"])
    jitter_scale = vector_math(group, "SCALE", (-760, -150))
    links.new(random_position.outputs["Value"], jitter_scale.inputs[0])
    links.new(group_in.outputs[jitter.identifier], jitter_scale.inputs[3])
    set_position = node(group, "GeometryNodeSetPosition", "Break the grid without moving into the corridor", (-560, 80))
    links.new(grid.outputs["Mesh"], set_position.inputs["Geometry"])
    links.new(jitter_scale.outputs[0], set_position.inputs["Offset"])
    position = node(group, "GeometryNodeInputPosition", "Read scattered positions", (-520, -210))
    separate = node(group, "ShaderNodeSeparateXYZ", "Read lateral and longitudinal coordinates", (-330, -210))
    links.new(position.outputs["Position"], separate.inputs["Vector"])
    abs_x = math_node(group, "ABSOLUTE", (-140, -210))
    half_corridor = math_node(group, "MULTIPLY", (-140, -330))
    half_corridor.inputs[1].default_value = 0.5
    links.new(separate.outputs["X"], abs_x.inputs[0])
    links.new(group_in.outputs[corridor.identifier], half_corridor.inputs[0])
    in_corridor = compare(group, "LESS_THAN", "FLOAT", (50, -220))
    links.new(abs_x.outputs[0], in_corridor.inputs["A"])
    links.new(half_corridor.outputs[0], in_corridor.inputs["B"])
    random_survival = node(group, "FunctionNodeRandomValue", "Seeded strand dropout", (-120, -430))
    random_survival.data_type = "FLOAT"
    random_survival.inputs["Min"].default_value = 0.0
    random_survival.inputs["Max"].default_value = 1.0
    links.new(group_in.outputs[seed.identifier], random_survival.inputs["Seed"])
    dropped = compare(group, "GREATER_THAN", "FLOAT", (60, -430))
    links.new(random_survival.outputs["Value"], dropped.inputs["A"])
    links.new(group_in.outputs[strand_keep.identifier], dropped.inputs["B"])
    remove_point = boolean_math(group, "OR", (230, -260))
    links.new(in_corridor.outputs["Result"], remove_point.inputs[0])
    links.new(dropped.outputs["Result"], remove_point.inputs[1])
    delete = node(group, "GeometryNodeDeleteGeometry", "Keep corridor and breathing windows", (-320, 80))
    delete.domain = "POINT"
    links.new(set_position.outputs["Geometry"], delete.inputs["Geometry"])
    links.new(remove_point.outputs["Boolean"], delete.inputs["Selection"])

    random_height = node(group, "FunctionNodeRandomValue", "Stable base heights", (0, -50))
    random_height.data_type = "FLOAT"
    links.new(group_in.outputs[height_min.identifier], random_height.inputs["Min"])
    links.new(group_in.outputs[height_max.identifier], random_height.inputs["Max"])
    links.new(group_in.outputs[seed.identifier], random_height.inputs["Seed"])
    y_over_wave = math_node(group, "DIVIDE", (40, -250))
    links.new(separate.outputs["Y"], y_over_wave.inputs[0])
    links.new(group_in.outputs[wavelength.identifier], y_over_wave.inputs[1])
    scene_time = node(group, "GeometryNodeInputSceneTime", "Blender preview time", (30, -420))
    time_speed = math_node(group, "MULTIPLY", (220, -410))
    links.new(scene_time.outputs["Seconds"], time_speed.inputs[0])
    links.new(group_in.outputs[speed.identifier], time_speed.inputs[1])
    neighbour_delay = math_node(group, "MULTIPLY", (220, -300))
    links.new(abs_x.outputs[0], neighbour_delay.inputs[0])
    links.new(group_in.outputs[delay.identifier], neighbour_delay.inputs[1])
    phase1 = math_node(group, "ADD", (410, -300))
    phase2 = math_node(group, "ADD", (580, -300))
    wave = math_node(group, "SINE", (750, -300))
    wave_amount = math_node(group, "MULTIPLY", (910, -300))
    links.new(y_over_wave.outputs[0], phase1.inputs[0])
    links.new(neighbour_delay.outputs[0], phase1.inputs[1])
    links.new(phase1.outputs[0], phase2.inputs[0])
    links.new(time_speed.outputs[0], phase2.inputs[1])
    links.new(phase2.outputs[0], wave.inputs[0])
    links.new(wave.outputs[0], wave_amount.inputs[0])
    links.new(group_in.outputs[amplitude.identifier], wave_amount.inputs[1])
    total_height = math_node(group, "ADD", (1080, -180))
    links.new(random_height.outputs["Value"], total_height.inputs[0])
    links.new(wave_amount.outputs[0], total_height.inputs[1])
    scale_xyz = node(group, "ShaderNodeCombineXYZ", "Strand thickness and wave height", (180, 180))
    links.new(group_in.outputs[thickness.identifier], scale_xyz.inputs["X"])
    links.new(group_in.outputs[thickness.identifier], scale_xyz.inputs["Y"])
    links.new(total_height.outputs[0], scale_xyz.inputs["Z"])
    collection_info = node(group, "GeometryNodeCollectionInfo", "Six material variants", (0, 300))
    collection_info.inputs["Collection"].default_value = variant_collection
    collection_info.inputs["Separate Children"].default_value = True
    collection_info.inputs["Reset Children"].default_value = True
    index = node(group, "GeometryNodeInputIndex", "Stable strand index", (150, 10))
    modulo = math_node(group, "MODULO", (340, 10))
    modulo.inputs[1].default_value = 6.0
    links.new(index.outputs["Index"], modulo.inputs[0])
    instances = node(group, "GeometryNodeInstanceOnPoints", "Cycle six colours across strands", (470, 120))
    instances.inputs["Pick Instance"].default_value = True
    links.new(delete.outputs["Geometry"], instances.inputs["Points"])
    links.new(collection_info.outputs["Instances"], instances.inputs["Instance"])
    links.new(modulo.outputs[0], instances.inputs["Instance Index"])
    links.new(scale_xyz.outputs["Vector"], instances.inputs["Scale"])
    realise = node(group, "GeometryNodeRealizeInstances", "Realise for surfel export", (770, 120))
    links.new(instances.outputs["Instances"], realise.inputs["Geometry"])
    links.new(realise.outputs["Geometry"], group_out.inputs["Geometry"])
    return group


def build_lens_group():
    group = new_group(LENS_GROUP, "Shallow elliptical halo that resolves in front of the final camera.")
    output_geometry(group)
    form = group.interface.new_panel(name="Lens Form")
    motion = group.interface.new_panel(name="Motion")
    depth = group_socket(group, "Chamber Depth", "NodeSocketFloat", 18.0, "Shallow depth of the final halo.", 4.0, 80.0, form)
    count = group_socket(group, "Rib Count", "NodeSocketInt", 6, "Number of broad halo ribs; six preserves every palette role.", 3, 12, form)
    centre_radius = group_socket(group, "Centre Radius", "NodeSocketFloat", 24.0, "CTA clearing radius at the halo centre.", 10.0, 60.0, form)
    end_radius = group_socket(group, "End Radius", "NodeSocketFloat", 30.0, "Outer radius at the halo edges.", 10.0, 60.0, form)
    aspect = group_socket(group, "Vertical Aspect", "NodeSocketFloat", 0.82, "Vertical scale of each ellipse.", 0.3, 1.5, form)
    thickness = group_socket(group, "Rib Thickness", "NodeSocketFloat", 0.48, "Curve-profile radius.", 0.1, 2.0, form)
    twist = group_socket(group, "Twist (degrees)", "NodeSocketFloat", 18.0, "Small colour-rib rotation through the halo.", 0.0, 90.0, form)
    ripple = group_socket(group, "Radius Ripple", "NodeSocketFloat", 0.14, "Breaks perfect concentricity while preserving the camera hole.", 0.0, 0.45, form)
    ripple_count = group_socket(group, "Ripple Count", "NodeSocketFloat", 3.0, "Number of broad radius undulations through the chamber.", 0.5, 8.0, form)
    pulse = group_socket(group, "Pulse", "NodeSocketFloat", 0.04, "Restrained breathing amount.", 0.0, 0.3, motion)
    pulse_speed = group_socket(group, "Pulse Speed", "NodeSocketFloat", 0.18, "Blender preview pulse speed.", 0.0, 1.0, motion)

    links = group.links
    group_in = node(group, "NodeGroupInput", "Live lens controls", (-1160, 80))
    group_out = node(group, "NodeGroupOutput", "Realised multicolour lens", (1230, 80))
    count_minus = math_node(group, "SUBTRACT", (-1000, -180))
    count_minus.inputs[1].default_value = 1.0
    links.new(group_in.outputs[count.identifier], count_minus.inputs[0])
    step = math_node(group, "DIVIDE", (-820, -180))
    links.new(group_in.outputs[depth.identifier], step.inputs[0])
    links.new(count_minus.outputs[0], step.inputs[1])
    half_depth = math_node(group, "MULTIPLY", (-1000, -50))
    half_depth.inputs[1].default_value = 0.5
    links.new(group_in.outputs[depth.identifier], half_depth.inputs[0])
    start_xyz = node(group, "ShaderNodeCombineXYZ", "Start behind the camera", (-820, -20))
    links.new(half_depth.outputs[0], start_xyz.inputs["Z"])
    negate_step = math_node(group, "MULTIPLY", (-640, -180))
    negate_step.inputs[1].default_value = -1.0
    links.new(step.outputs[0], negate_step.inputs[0])
    offset_xyz = node(group, "ShaderNodeCombineXYZ", "Advance through the lens", (-450, -180))
    links.new(negate_step.outputs[0], offset_xyz.inputs["Z"])
    line = node(group, "GeometryNodeMeshLine", "Rib centres", (-430, 80))
    line.mode = "OFFSET"
    links.new(group_in.outputs[count.identifier], line.inputs["Count"])
    links.new(start_xyz.outputs["Vector"], line.inputs["Start Location"])
    links.new(offset_xyz.outputs["Vector"], line.inputs["Offset"])
    index = node(group, "GeometryNodeInputIndex", "Stable rib index", (-260, -180))
    factor = math_node(group, "DIVIDE", (-80, -180))
    links.new(index.outputs["Index"], factor.inputs[0])
    links.new(count_minus.outputs[0], factor.inputs[1])
    angle = math_node(group, "MULTIPLY", (100, -180))
    angle.inputs[1].default_value = math.pi
    sine = math_node(group, "SINE", (280, -180))
    links.new(factor.outputs[0], angle.inputs[0])
    links.new(angle.outputs[0], sine.inputs[0])
    radius_span = math_node(group, "SUBTRACT", (100, -330))
    links.new(group_in.outputs[centre_radius.identifier], radius_span.inputs[0])
    links.new(group_in.outputs[end_radius.identifier], radius_span.inputs[1])
    expanded = math_node(group, "MULTIPLY", (460, -240))
    links.new(sine.outputs[0], expanded.inputs[0])
    links.new(radius_span.outputs[0], expanded.inputs[1])
    base_radius = math_node(group, "ADD", (640, -240))
    links.new(expanded.outputs[0], base_radius.inputs[0])
    links.new(group_in.outputs[end_radius.identifier], base_radius.inputs[1])
    scene_time = node(group, "GeometryNodeInputSceneTime", "Preview time", (280, -420))
    time_speed = math_node(group, "MULTIPLY", (460, -420))
    pulse_wave = math_node(group, "SINE", (640, -420))
    pulse_amount = math_node(group, "MULTIPLY", (820, -420))
    links.new(scene_time.outputs["Seconds"], time_speed.inputs[0])
    links.new(group_in.outputs[pulse_speed.identifier], time_speed.inputs[1])
    links.new(time_speed.outputs[0], pulse_wave.inputs[0])
    links.new(pulse_wave.outputs[0], pulse_amount.inputs[0])
    links.new(group_in.outputs[pulse.identifier], pulse_amount.inputs[1])
    ripple_turns = math_node(group, "MULTIPLY", (460, -520))
    ripple_turns.inputs[1].default_value = math.tau
    links.new(group_in.outputs[ripple_count.identifier], ripple_turns.inputs[0])
    ripple_phase = math_node(group, "MULTIPLY", (640, -520))
    links.new(factor.outputs[0], ripple_phase.inputs[0])
    links.new(ripple_turns.outputs[0], ripple_phase.inputs[1])
    ripple_wave = math_node(group, "SINE", (820, -520))
    links.new(ripple_phase.outputs[0], ripple_wave.inputs[0])
    ripple_amount = math_node(group, "MULTIPLY", (1000, -520))
    links.new(ripple_wave.outputs[0], ripple_amount.inputs[0])
    links.new(group_in.outputs[ripple.identifier], ripple_amount.inputs[1])
    ripple_radius = math_node(group, "MULTIPLY", (1000, -430))
    links.new(base_radius.outputs[0], ripple_radius.inputs[0])
    links.new(ripple_amount.outputs[0], ripple_radius.inputs[1])
    shaped_radius = math_node(group, "ADD", (1180, -330))
    links.new(base_radius.outputs[0], shaped_radius.inputs[0])
    links.new(ripple_radius.outputs[0], shaped_radius.inputs[1])
    pulse_radius = math_node(group, "MULTIPLY", (1180, -240))
    final_radius = math_node(group, "ADD", (1360, -240))
    links.new(shaped_radius.outputs[0], pulse_radius.inputs[0])
    links.new(pulse_amount.outputs[0], pulse_radius.inputs[1])
    links.new(shaped_radius.outputs[0], final_radius.inputs[0])
    links.new(pulse_radius.outputs[0], final_radius.inputs[1])
    vertical_radius = math_node(group, "MULTIPLY", (1000, -350))
    links.new(final_radius.outputs[0], vertical_radius.inputs[0])
    links.new(group_in.outputs[aspect.identifier], vertical_radius.inputs[1])
    scale_xyz = node(group, "ShaderNodeCombineXYZ", "Lens radius and aspect", (730, 30))
    links.new(final_radius.outputs[0], scale_xyz.inputs["X"])
    links.new(vertical_radius.outputs[0], scale_xyz.inputs["Y"])
    scale_xyz.inputs["Z"].default_value = 1.0
    twist_radians = math_node(group, "MULTIPLY", (460, -60))
    twist_radians.inputs[1].default_value = math.pi / 180.0
    links.new(group_in.outputs[twist.identifier], twist_radians.inputs[0])
    twist_factor = math_node(group, "MULTIPLY", (640, -60))
    links.new(twist_radians.outputs[0], twist_factor.inputs[0])
    links.new(factor.outputs[0], twist_factor.inputs[1])
    rotation_xyz = node(group, "ShaderNodeCombineXYZ", "Coordinate the coloured ribs", (820, -60))
    links.new(twist_factor.outputs[0], rotation_xyz.inputs["Z"])
    circle = node(group, "GeometryNodeCurvePrimitiveCircle", "Unit rib curve", (120, 180))
    circle.mode = "RADIUS"
    circle.inputs["Resolution"].default_value = 64
    circle.inputs["Radius"].default_value = 1.0
    palette = math_node(group, "MODULO", (120, 20))
    palette.inputs[1].default_value = 6.0
    links.new(index.outputs["Index"], palette.inputs[0])
    store_palette = node(group, "GeometryNodeStoreNamedAttribute", "Store six stable palette roles", (310, 100))
    store_palette.data_type = "INT"
    store_palette.domain = "POINT"
    store_palette.inputs["Name"].default_value = "abs_palette"
    links.new(line.outputs["Mesh"], store_palette.inputs["Geometry"])
    links.new(palette.outputs[0], store_palette.inputs["Value"])
    instances = node(group, "GeometryNodeInstanceOnPoints", "Build the lens ribs", (530, 120))
    links.new(store_palette.outputs["Geometry"], instances.inputs["Points"])
    links.new(circle.outputs["Curve"], instances.inputs["Instance"])
    links.new(scale_xyz.outputs["Vector"], instances.inputs["Scale"])
    links.new(rotation_xyz.outputs["Vector"], instances.inputs["Rotation"])
    realise = node(group, "GeometryNodeRealizeInstances", "Realise rib curves", (760, 120))
    links.new(instances.outputs["Instances"], realise.inputs["Geometry"])
    profile = node(group, "GeometryNodeCurvePrimitiveCircle", "Rib thickness profile", (750, 300))
    profile.mode = "RADIUS"
    profile.inputs["Resolution"].default_value = 8
    links.new(group_in.outputs[thickness.identifier], profile.inputs["Radius"])
    curve_mesh = node(group, "GeometryNodeCurveToMesh", "Create complete rib surfaces", (970, 120))
    links.new(realise.outputs["Geometry"], curve_mesh.inputs["Curve"])
    links.new(profile.outputs["Curve"], curve_mesh.inputs["Profile Curve"])
    palette_attr = named_attribute(group, "abs_palette", "INT", (930, -40))
    previous_geometry = curve_mesh.outputs["Mesh"]
    for material_index in range(6):
        choose = compare(group, "EQUAL", "INT", (1070 + material_index * 170, -60))
        choose.inputs["B"].default_value = material_index
        links.new(palette_attr.outputs["Attribute"], choose.inputs["A"])
        set_material = node(
            group, "GeometryNodeSetMaterial", f"Apply palette role {material_index}",
            (1070 + material_index * 170, 120),
        )
        set_material.inputs["Material"].default_value = material(material_index)
        links.new(previous_geometry, set_material.inputs["Geometry"])
        links.new(choose.outputs["Result"], set_material.inputs["Selection"])
        previous_geometry = set_material.outputs["Geometry"]
    group_out.location = (2200, 80)
    links.new(previous_geometry, group_out.inputs["Geometry"])
    return group


def ensure_dot_source():
    modules = ensure_collection(MODULE_COLLECTION)
    source = bpy.data.objects.get("ABS_NARRATIVE_DOT_SOURCE")
    if source is None:
        mesh = bpy.data.meshes.new("ABS_NARRATIVE_DOT_SOURCE_MESH")
        vertices = [
            (0, 0, 1), (0.8944, 0, 0.4472), (0.2764, 0.8506, 0.4472),
            (-0.7236, 0.5257, 0.4472), (-0.7236, -0.5257, 0.4472),
            (0.2764, -0.8506, 0.4472), (0.7236, 0.5257, -0.4472),
            (-0.2764, 0.8506, -0.4472), (-0.8944, 0, -0.4472),
            (-0.2764, -0.8506, -0.4472), (0.7236, -0.5257, -0.4472), (0, 0, -1),
        ]
        faces = [
            (0,1,2),(0,2,3),(0,3,4),(0,4,5),(0,5,1),
            (1,6,2),(2,6,7),(2,7,3),(3,7,8),(3,8,4),(4,8,9),(4,9,5),(5,9,10),(5,10,1),(1,10,6),
            (11,7,6),(11,8,7),(11,9,8),(11,10,9),(11,6,10),
        ]
        mesh.from_pydata(vertices, [], faces)
        source = bpy.data.objects.new("ABS_NARRATIVE_DOT_SOURCE", mesh)
        modules.objects.link(source)
    source.hide_render = False
    source.hide_set(True)
    source["abs_export"] = False
    add_materials(source)
    return source


def create_hoop_variant_collection(source):
    modules = ensure_collection(MODULE_COLLECTION)
    name = "ABS_HOOP_MODULE_VARIANTS"
    collection = bpy.data.collections.get(name)
    if collection is not None:
        for obj in list(collection.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
    else:
        collection = ensure_collection(name, modules)
    collection.hide_viewport = True
    collection.hide_render = True
    for index in range(6):
        mesh = source.data.copy()
        mesh.name = f"ABS_HOOP_VARIANT_{index:02d}_MESH"
        mesh.materials.clear()
        mesh.materials.append(material(index))
        for polygon in mesh.polygons:
            polygon.material_index = 0
        obj = bpy.data.objects.new(f"ABS_HOOP_VARIANT_{index:02d}", mesh)
        collection.objects.link(obj)
        obj.hide_render = False
        obj.hide_set(True)
        obj["abs_export"] = False
    return collection


def create_coloured_round_portal_group():
    remove_group(ROUND_PORTAL_GROUP)
    source = bpy.data.node_groups.get("ABS_GN_GATE_TUNNEL")
    if source is None:
        raise RuntimeError("ABS_GN_GATE_TUNNEL is required to create the six-colour hoop wrapper.")
    group = source.copy()
    group.name = ROUND_PORTAL_GROUP
    group.description = (
        "Six-colour round-portal wrapper around ABS_GN_PATH_REPEATER. The profile variants "
        "cycle by stable portal index; roll inputs remain zero."
    )
    return group


def create_host(name, mesh, collection, group, modifier_name):
    remove_object(name)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    modifier = obj.modifiers.new(modifier_name, "NODES")
    modifier.node_group = group
    return obj, modifier


def set_modifier_input(modifier, display_name, value):
    for item in modifier.node_group.interface.items_tree:
        if getattr(item, "item_type", None) == "SOCKET" and getattr(item, "in_out", None) == "INPUT" and item.name == display_name:
            modifier[item.identifier] = value
            return item.identifier
    raise RuntimeError(f"{modifier.node_group.name} has no input {display_name!r}")


def apply_semantics(
    obj, stage, role, geometry_kind, *, density=1.0, priority=1.0,
    preserve=0.9, radius_scale=1.0, visibility=None,
):
    values = {
        "abs_export": True,
        "abs_semantic_schema": 2,
        "abs_stage_id": stage,
        "abs_text_binding": f"about-stage-{stage}",
        "abs_palette_mode": "single-colour-unit" if role == "path-tunnel" else "multicolour-field",
        "abs_transition_mode": "inherited-geometry",
        "abs_role": role,
        "abs_model_id": f"about.{stage}",
        "abs_object_id": obj.name.lower().replace("_", "."),
        "abs_density_group": f"about.{stage}",
        "abs_point_density": density,
        "abs_feature_priority": priority,
        "abs_surfel_radius_scale": radius_scale,
        "abs_sampling_mode": "uniform_surface",
        "abs_sampling_space": "WORLD",
        "abs_motion_group": f"about.{stage}.coherent",
        "abs_reveal_group": f"about.{stage}",
        "abs_component_policy": "semantic-material-projected-coverage",
        "abs_preserve_min_px": preserve,
        "abs_geometry_kind": geometry_kind,
    }
    for key, value in values.items():
        obj[key] = value
    obj.id_properties_ui("abs_surfel_radius_scale").update(
        min=0.25, max=2.5, soft_min=0.5, soft_max=1.5,
        description="Website circle radius multiplier baked by the surfel exporter.",
    )
    if visibility is None:
        for key in ("abs_visibility_start_wu", "abs_visibility_end_wu"):
            if key in obj:
                del obj[key]
    else:
        obj["abs_visibility_start_wu"] = visibility[0]
        obj["abs_visibility_end_wu"] = visibility[1]


def bind_stage_object_to_path(
    obj, path, guides, *, anchor_name, progress, forward_axis, up_axis, local_offset=(0.0, 0.0, 0.0),
):
    """Attach a stage-local generator to the live master path.

    The generated geometry remains in simple local coordinates. A constrained anchor
    owns its path position and orientation, so direct master-rail edits cannot leave the
    lattice or finale behind in stale world coordinates.
    """
    anchor = bpy.data.objects.get(anchor_name)
    if anchor is None:
        anchor = bpy.data.objects.new(anchor_name, None)
    move_to_collection(anchor, guides)
    anchor.empty_display_type = "ARROWS"
    anchor.empty_display_size = 3.0
    anchor.hide_render = True
    anchor["abs_export"] = False
    for constraint in list(anchor.constraints):
        anchor.constraints.remove(constraint)
    follow = anchor.constraints.new("FOLLOW_PATH")
    follow.name = "ABS_MASTER_PATH_BINDING"
    follow.target = path
    follow.forward_axis = forward_axis
    follow.up_axis = up_axis
    follow.use_curve_follow = True
    follow.use_curve_radius = False
    follow.use_fixed_location = True
    follow.offset_factor = progress
    anchor["abs_path_progress"] = progress
    anchor["abs_note"] = f"Live stage anchor on {PATH_NAME} at normalized progress {progress:.6f}."

    obj.parent = anchor
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.location = local_offset
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
    obj.scale = (1.0, 1.0, 1.0)
    obj["abs_path_anchor"] = anchor.name
    return anchor


def configure_existing_repeater(
    obj, collection, *, name, stage, start, end, count, start_scale,
    end_scale, gate=False, priority=2.0, radius_scale=1.0, visibility=None,
):
    obj.name = name
    move_to_collection(obj, collection)
    obj.hide_render = False
    obj.hide_set(False)
    modifier = obj.modifiers.get("ABS_PARAMETRIC_EFFECT")
    if modifier is None:
        raise RuntimeError(f"{name} lacks ABS_PARAMETRIC_EFFECT")
    set_modifier_input(modifier, "Start on Path (0-1)", start)
    set_modifier_input(modifier, "End on Path (0-1)", end)
    set_modifier_input(modifier, "Instance Count", count)
    set_modifier_input(modifier, "Start Scale", start_scale)
    set_modifier_input(modifier, "End Scale", end_scale)
    if gate:
        set_modifier_input(modifier, "Start Roll (degrees)", 0.0)
        # Keep the architecture still and let the camera supply the turn. Twisting
        # every square as well as the camera made the 360-degree roll cancel
        # perceptually and produced a noisy starburst instead of a readable tunnel.
        set_modifier_input(modifier, "Roll per Shape (degrees)", 0.0)
        obj["abs_camera_roll_influence"] = 1.0
    apply_semantics(
        obj, stage, "path-tunnel", "square-gates" if gate else "round-portals",
        density=1.2, priority=priority, preserve=1.2,
        radius_scale=radius_scale, visibility=visibility,
    )
    obj["abs_instance_count"] = count
    return obj


def configure_camera_rig(scene, camera, path, controller, guides, square_controls, world_controls):
    """Compose rail position, steadycam orientation, and sparse local roll.

    The position follower stays exactly on the master rail, but it no longer copies
    the rail's instantaneous tangent. A second follower looks ahead and supplies a
    longer-horizon aim target. This reduces angular spikes without cutting corners or
    moving the camera away from the stage geometry. The existing roll pivot remains a
    child, so the restrained banks and full square-tunnel turn still bake explicitly.
    """
    follower = bpy.data.objects.get(CAMERA_FOLLOWER_NAME)
    if follower is None:
        follower = bpy.data.objects.new(CAMERA_FOLLOWER_NAME, None)
        guides.objects.link(follower)
    else:
        move_to_collection(follower, guides)
    follower.empty_display_type = "ARROWS"
    follower.empty_display_size = 2.0

    for constraint in list(follower.constraints):
        follower.constraints.remove(constraint)
    try:
        follower.driver_remove("location")
    except (TypeError, RuntimeError):
        pass
    try:
        follower.driver_remove("rotation_euler")
    except (TypeError, RuntimeError):
        pass
    follower.parent = None
    follower.location = (0.0, 0.0, 0.0)
    follower.rotation_mode = "QUATERNION"
    follower.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
    follower.scale = (1.0, 1.0, 1.0)

    follow = follower.constraints.new("FOLLOW_PATH")
    follow.name = "ABS_CAMERA_RAIL_FOLLOW"
    follow.target = path
    follow.forward_axis = "TRACK_NEGATIVE_Z"
    follow.up_axis = "UP_Y"
    follow.use_curve_follow = False
    follow.use_curve_radius = False
    follow.use_fixed_location = True
    follow.offset = 0.0
    follow.offset_factor = 0.0
    progress_driver = follow.driver_add("offset_factor").driver
    progress_driver.type = "SCRIPTED"
    progress_driver.expression = "progress"
    progress_variable = progress_driver.variables.new()
    progress_variable.name = "progress"
    progress_variable.type = "SINGLE_PROP"
    progress_variable.targets[0].id = controller
    progress_variable.targets[0].data_path = '["abs_path_progress"]'

    lookahead = bpy.data.objects.get(CAMERA_LOOKAHEAD_FOLLOWER_NAME)
    if lookahead is None:
        lookahead = bpy.data.objects.new(CAMERA_LOOKAHEAD_FOLLOWER_NAME, None)
        guides.objects.link(lookahead)
    else:
        move_to_collection(lookahead, guides)
    lookahead.empty_display_type = "ARROWS"
    lookahead.empty_display_size = 1.5
    lookahead.hide_render = True
    lookahead["abs_export"] = False
    for constraint in list(lookahead.constraints):
        lookahead.constraints.remove(constraint)
    lookahead.parent = None
    lookahead.location = (0.0, 0.0, 0.0)
    lookahead.rotation_mode = "QUATERNION"
    lookahead.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
    lookahead.scale = (1.0, 1.0, 1.0)

    lookahead_follow = lookahead.constraints.new("FOLLOW_PATH")
    lookahead_follow.name = "ABS_CAMERA_LOOKAHEAD_RAIL_FOLLOW"
    lookahead_follow.target = path
    lookahead_follow.forward_axis = "TRACK_NEGATIVE_Z"
    lookahead_follow.up_axis = "UP_Y"
    lookahead_follow.use_curve_follow = True
    lookahead_follow.use_curve_radius = False
    lookahead_follow.use_fixed_location = True
    lookahead_follow.offset = 0.0
    lookahead_follow.offset_factor = 0.0
    lookahead_driver = lookahead_follow.driver_add("offset_factor").driver
    lookahead_driver.type = "SCRIPTED"
    lookahead_driver.expression = f"min(progress + look_ahead / {STORY_RIDE_LENGTH!r}, 1.0)"
    lookahead_progress = lookahead_driver.variables.new()
    lookahead_progress.name = "progress"
    lookahead_progress.type = "SINGLE_PROP"
    lookahead_progress.targets[0].id = controller
    lookahead_progress.targets[0].data_path = '["abs_path_progress"]'
    lookahead_distance = lookahead_driver.variables.new()
    lookahead_distance.name = "look_ahead"
    lookahead_distance.type = "SINGLE_PROP"
    lookahead_distance.targets[0].id = world_controls
    lookahead_distance.targets[0].data_path = '["camera_steadycam_look_ahead_metres"]'

    target = bpy.data.objects.get(CAMERA_LOOKAHEAD_TARGET_NAME)
    if target is None:
        target = bpy.data.objects.new(CAMERA_LOOKAHEAD_TARGET_NAME, None)
        guides.objects.link(target)
    else:
        move_to_collection(target, guides)
    for constraint in list(target.constraints):
        target.constraints.remove(constraint)
    try:
        target.driver_remove("location", 2)
    except (TypeError, RuntimeError):
        pass
    target.parent = lookahead
    target.matrix_parent_inverse = Matrix.Identity(4)
    target.location = (0.0, 0.0, -CAMERA_STEADYCAM_TARGET_EXTENSION_METRES)
    target.rotation_mode = "XYZ"
    target.rotation_euler = (0.0, 0.0, 0.0)
    target.scale = (1.0, 1.0, 1.0)
    target.empty_display_type = "PLAIN_AXES"
    target.empty_display_size = 1.0
    target.hide_render = True
    target["abs_export"] = False
    target_extension = target.driver_add("location", 2).driver
    target_extension.type = "SCRIPTED"
    target_extension.expression = "-extension"
    extension_variable = target_extension.variables.new()
    extension_variable.name = "extension"
    extension_variable.type = "SINGLE_PROP"
    extension_variable.targets[0].id = world_controls
    extension_variable.targets[0].data_path = '["camera_steadycam_target_extension_metres"]'

    aim = follower.constraints.new("TRACK_TO")
    aim.name = CAMERA_STEADYCAM_CONSTRAINT_NAME
    aim.target = target
    aim.track_axis = "TRACK_NEGATIVE_Z"
    aim.up_axis = "UP_Y"
    # Keep a neutral world-up base frame. The sparse roll pivot below adds the
    # only intentional bank, so the look-ahead cannot pre-roll the square tunnel.
    aim.use_target_z = False

    controller.parent = follower
    controller.matrix_parent_inverse = Matrix.Identity(4)
    controller.location = (0.0, 0.0, 0.0)
    controller.rotation_mode = "XYZ"
    controller.rotation_euler = (0.0, 0.0, 0.0)
    controller.scale = (1.0, 1.0, 1.0)
    try:
        controller.driver_remove("rotation_euler", 2)
    except (TypeError, RuntimeError):
        pass
    roll_driver = controller.driver_add("rotation_euler", 2).driver
    roll_driver.type = "SCRIPTED"
    roll_driver.expression = "(min(roll,0)+max(roll,0)*turns) * 0.017453292519943295"
    roll_variable = roll_driver.variables.new()
    roll_variable.name = "roll"
    roll_variable.type = "SINGLE_PROP"
    roll_variable.targets[0].id = controller
    roll_variable.targets[0].data_path = '["abs_roll_degrees"]'
    turns_variable = roll_driver.variables.new()
    turns_variable.name = "turns"
    turns_variable.type = "SINGLE_PROP"
    turns_variable.targets[0].id = square_controls
    turns_variable.targets[0].data_path = '["Roll Turns"]'

    if camera.animation_data:
        for driver in list(camera.animation_data.drivers):
            if driver.data_path.startswith('constraints['):
                camera.animation_data.drivers.remove(driver)
    for constraint in list(camera.constraints):
        camera.constraints.remove(constraint)
    try:
        camera.driver_remove("location")
    except (TypeError, RuntimeError):
        pass
    try:
        camera.driver_remove("rotation_euler")
    except (TypeError, RuntimeError):
        pass
    try:
        camera.driver_remove("rotation_quaternion")
    except (TypeError, RuntimeError):
        pass
    camera.parent = controller
    camera.matrix_parent_inverse = Matrix.Identity(4)
    camera.location = (0.0, 0.0, 0.0)
    camera.rotation_mode = "QUATERNION"
    camera.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
    camera.scale = (1.0, 1.0, 1.0)

    follower["abs_role"] = "camera-steadycam-position-follower"
    follower["abs_note"] = (
        "Position follows the master rail exactly. ABS_CAMERA_STEADYCAM_AIM points toward "
        "the independent look-ahead target; the child roll pivot supplies local camera Z roll."
    )
    lookahead["abs_role"] = "camera-steadycam-lookahead-follower"
    lookahead["abs_note"] = (
        "Aims ahead of ABS_CAMERA_PATH_FOLLOWER by ABS_WORLD_CONTROLS.camera_steadycam_look_ahead_metres."
    )
    target["abs_role"] = "camera-steadycam-target"
    target["abs_note"] = (
        "Forward extension keeps the look target ahead when the camera reaches the final rail point."
    )
    controller["abs_role"] = "camera-roll-pivot"
    controller["abs_note"] = (
        "Animate abs_roll_degrees here; do not rotate ABS_CAMERA directly. "
        "ABS_SQUARE_ROLLERCOASTER_CONTROLS.Roll Turns scales only the positive square-stage roll."
    )
    return follower


def configure_camera_roll(scene, controller):
    controller["abs_path_progress"] = float(controller.get("abs_path_progress", 0.0))
    controller["abs_roll_degrees"] = float(controller.get("abs_roll_degrees", 0.0))
    if controller.animation_data is None:
        controller.animation_data_create()
    action = controller.animation_data.action if controller.animation_data else None
    if action is None:
        action = bpy.data.actions.new("ABS_CAMERA_RIG_ACTION")
        controller.animation_data.action = action
    progress_curve = next((curve for curve in action.fcurves if curve.data_path == '["abs_path_progress"]'), None)
    if progress_curve is None:
        progress_curve = action.fcurves.new(data_path='["abs_path_progress"]', action_group="Rail Travel")
    while progress_curve.keyframe_points:
        progress_curve.keyframe_points.remove(progress_curve.keyframe_points[0])
    for frame, value in ((scene.frame_start, 0.0), (scene.frame_end, 1.0)):
        key = progress_curve.keyframe_points.insert(frame, value)
        key.interpolation = "LINEAR"
    roll_curve = next((curve for curve in action.fcurves if curve.data_path == '["abs_roll_degrees"]'), None)
    if roll_curve is None:
        roll_curve = action.fcurves.new(data_path='["abs_roll_degrees"]', action_group="Camera Roll")
    while roll_curve.keyframe_points:
        roll_curve.keyframe_points.remove(roll_curve.keyframe_points[0])
    round_start, round_end = STAGE_RANGES["02"]
    round_span = round_end - round_start
    round_left = round_start + (round_span * 0.34)
    round_right = round_start + (round_span * 0.68)
    gate_start, gate_end = STAGE_RANGES["04"]
    gate_span = gate_end - gate_start
    gate_progress = tuple(gate_start + (gate_span * factor) for factor in (0.0, 0.25, 0.5, 0.75, 1.0))
    key_profile = (
        (round_start, 0.0, "round-entry"),
        (round_left, -8.0, "round-left-bank"),
        (round_right, 8.0, "round-right-bank"),
        (round_end, 0.0, "round-exit"),
        *((progress, degrees, f"square-{quarter}") for progress, degrees, quarter in zip(
            gate_progress,
            (0.0, 90.0, 180.0, 270.0, 360.0),
            ("entry", "quarter", "half", "three-quarter", "exit"),
        )),
    )
    frame_span = scene.frame_end - scene.frame_start
    profile = []
    for progress, value, label in key_profile:
        frame = round(scene.frame_start + progress * frame_span)
        key = roll_curve.keyframe_points.insert(frame, value)
        key.interpolation = "BEZIER"
        key.handle_left_type = "AUTO_CLAMPED"
        key.handle_right_type = "AUTO_CLAMPED"
        profile.append({"frame": frame, "progress": progress, "degrees": value, "label": label})
    controller["abs_roll_profile"] = json.dumps(profile)
    controller["abs_note"] = (
        "Two linear rail keys, four restrained round-tunnel bank keys, and five square-loop "
        "keys. The square tunnel performs one complete 360-degree roll and exits level."
    )
    controller.id_properties_ui("abs_roll_degrees").update(
        min=-720.0, max=720.0, soft_min=-360.0, soft_max=360.0,
        description="Sparse left-right round-tunnel bank plus a five-key 360-degree square-tunnel roll."
    )
    return profile


def set_markers(scene):
    legacy_markers = (
        "01_SIGNAL", "02_HOOPS", "03_YARD", "04_LOOP", "05_IGNITION",
        "06_LIVING", "07_REVEAL", "08_TERMINAL", "ABS_TORUS_PORTAL",
        "ABS_ROLL_HORIZON", "ABS_ROLL_LEVEL_START", "ABS_ROLL_LEVEL_END",
        "ABS_ROUND_BANK_APEX",
    )
    for name in legacy_markers:
        marker = scene.timeline_markers.get(name)
        if marker is not None:
            scene.timeline_markers.remove(marker)
    frame_span = scene.frame_end - scene.frame_start
    for stage, (start, _end) in STAGE_RANGES.items():
        frame = round(scene.frame_start + start * frame_span)
        name = f"ABS_STAGE_{stage}"
        marker = scene.timeline_markers.get(name)
        if marker is None:
            scene.timeline_markers.new(name, frame=frame)
        else:
            marker.frame = frame
    gate_start, gate_end = STAGE_RANGES["04"]
    gate_span = gate_end - gate_start
    for name, factor in (
        ("ABS_ROLL_GATE_START", 0.0),
        ("ABS_ROLL_QUARTER", 0.25),
        ("ABS_ROLL_HALF", 0.5),
        ("ABS_ROLL_THREE_QUARTER", 0.75),
        ("ABS_ROLL_GATE_END", 1.0),
    ):
        progress = gate_start + (gate_span * factor)
        frame = round(scene.frame_start + progress * frame_span)
        marker = scene.timeline_markers.get(name)
        if marker is None:
            scene.timeline_markers.new(name, frame=frame)
        else:
            marker.frame = frame
    round_start, round_end = STAGE_RANGES["02"]
    round_span = round_end - round_start
    for name, progress in (
        ("ABS_ROUND_BANK_START", round_start),
        ("ABS_ROUND_BANK_LEFT", round_start + (round_span * 0.34)),
        ("ABS_ROUND_BANK_RIGHT", round_start + (round_span * 0.68)),
        ("ABS_ROUND_BANK_END", round_end),
    ):
        frame = round(scene.frame_start + progress * frame_span)
        marker = scene.timeline_markers.get(name)
        if marker is None:
            scene.timeline_markers.new(name, frame=frame)
        else:
            marker.frame = frame
    final = scene.timeline_markers.get("ABS_STAGE_06_LENS_CENTRE")
    if final is None:
        scene.timeline_markers.new("ABS_STAGE_06_LENS_CENTRE", frame=scene.frame_end)
    else:
        final.frame = scene.frame_end


def write_readme():
    text = bpy.data.texts.get("ABOUT_PARAMETRIC_WORLD_README")
    if text is None:
        text = bpy.data.texts.new("ABOUT_PARAMETRIC_WORLD_README")
    else:
        text.clear()
    text.use_fake_user = True
    text.write(
        "ABOUT V2 — PARAMETRIC NARRATIVE WORLD\n\n"
        "1. Select ABS_WORLD_CONTROLS for the constant horizontal FOV (65 degrees), camera "
        "Steadycam Look Ahead, and final Target Extension.\n"
        "2. ABS_PARAMETRIC_RIDE_PATH is the master route. It has 29 meaningful Bezier anchors "
        "instead of 721 sampled points. Select it, enter Edit Mode, and move anchors or handles; "
        "the camera, portals, terrain, lattice, and finale follow the smooth curve live.\n"
        "3. The default square route loops once, makes an offset half-turn, threads the first "
        "loop's open centre, and exits without crossing itself. Edit that shape directly on the "
        "Bezier rail. Select ABS_SQUARE_ROLLERCOASTER_CONTROLS for gate count/scales/twist and "
        "signed camera Roll Turns only.\n"
        "4. Keep handles aligned for a gentle ride and keep point tilt at zero. Terrain Path Height "
        "Influence is zero by default, so the ground stays level while the camera climbs.\n"
        "5. Select one GN_ generator and open Modifiers > Geometry Nodes.\n"
        "6. Stage generators: GN_SIGNAL_FIELD, GN_SIGNAL_APERTURE, GN_NEBULA_FIELD, "
        "GN_ROUND_PORTALS, GN_RIBBON_CANYON, GN_SQUARE_LOOP, GN_RESPONSIVE_LATTICE, "
        "GN_LENS_CHAMBER.\n"
        "7. Fields: Particle Count, Radius, Corridor, Vertical Scale, Cluster, Erosion.\n"
        "8. Terrain: Width, Camera Clearance, Path Height Influence, Density Fade In/Out, Centre Relief, "
        "Flat End, Hill Height, Mountain Start/Height, Wall Lift, and Terrain Seed.\n"
        "9. Lattice: Width/Depth, Columns/Rows, Corridor Width, Strand Keep, heights, "
        "jitter, and wave controls. Finale halo: shallow depth, 3-12 ribs, radii, Twist, "
        "Radius Ripple, and Pulse.\n"
        "10. Each exported GN_ object has abs_surfel_radius_scale under Custom Properties; "
        "this bakes that model's website circle size on the next export.\n"
        "11. Use ABS_STAGE_00 through ABS_STAGE_06 timeline markers to review each chapter.\n"
        "12. Camera position uses two rail keys on ABS_CAMERA_ROLL_DRIVER. ABS_CAMERA_PATH_FOLLOWER "
        "stays on the rail while ABS_CAMERA_LOOKAHEAD_FOLLOWER and ABS_CAMERA_LOOKAHEAD_TARGET "
        "supply a longer-horizon steadycam aim. The child hierarchy remains "
        "ABS_CAMERA_PATH_FOLLOWER > ABS_CAMERA_ROLL_DRIVER > ABS_CAMERA. abs_roll_degrees supplies four left-right round-tunnel "
        "bank keys plus five square-loop keys. Do not key ABS_CAMERA transforms, and keep rail point "
        "tilt at zero.\n"
        "13. Save Blender, then run the website surfel exporter. Blender changes are not "
        "visible on the site until export.\n"
    )


def main(output_blend=None):
    raise RuntimeError(
        "This seven-stage/lens builder is retired. Use "
        "scripts/about-v2-blender/refine-about-v2-stage-separation.py against the "
        "canonical 17-point source, validate the candidate, then export it."
    )
    scene = bpy.context.scene
    camera = require_object(CAMERA_NAME, "CAMERA")
    path = require_object(PATH_NAME, "CURVE")
    controller = require_object(ROLL_DRIVER_NAME, "EMPTY")
    hoop = bpy.data.objects.get("GN_ROUND_PORTALS") or require_object("GN_HOOP_TUNNEL", "MESH")
    gate = bpy.data.objects.get("GN_SQUARE_LOOP") or require_object("GN_GATE_TUNNEL", "MESH")

    root = ensure_collection(ROOT_COLLECTION)
    guides = ensure_collection(GUIDE_COLLECTION, root)
    stage_collections = {
        stage: ensure_collection(name, root) for stage, name in STAGE_COLLECTIONS.items()
    }
    restore_and_expand_path(path)
    removed_deprecated_objects = remove_deprecated_scene_data({
        camera.name, path.name, controller.name, hoop.name, gate.name,
    })
    compose_story_aligned_flight_path(path)
    square_controls = ensure_square_rollercoaster_controls(guides)
    configure_square_rollercoaster_path(path, square_controls)
    path.hide_render = True
    path.hide_set(False)
    path.show_in_front = True
    path.color = (1.0, 0.16, 0.03, 1.0)
    path["abs_edit_workflow"] = (
        "Select this curve, enter Edit Mode, and move the 29 labelled Bezier anchors or handles. "
        "Use ABS_SQUARE_ROLLERCOASTER_CONTROLS only for portals and camera Roll Turns. Camera, "
        "tunnels, fields, terrain XY, lattice, and finale evaluate this curve live."
    )
    frames = path_points_and_frames(path)
    controls = ensure_world_controls(guides, camera)
    configure_camera_rig(scene, camera, path, controller, guides, square_controls, controls)
    first_center = interpolate_frame(frames, 0.0)[0]
    controls.location = first_center + Vector((0.0, 0.0, 3.0))
    square_center = interpolate_frame(frames, sum(STAGE_RANGES["04"]) * 0.5)[0]
    square_controls.location = square_center + Vector((0.0, 0.0, 8.0))

    dot_source = ensure_dot_source()
    field_group = build_point_field_group(dot_source)
    signal_mesh = create_field_base(
        "ABS_SIGNAL_FIELD", frames, capacity=900, progress_range=(0.0, 0.125)
    )
    signal, signal_mod = create_host("GN_SIGNAL_FIELD", signal_mesh, stage_collections["00"], field_group, "ABS_SIGNAL_FIELD")
    add_materials(signal)
    set_modifier_input(signal_mod, "Path Guide", path)
    for name, value in {
        "Start on Path (0-1)": STAGE_RANGES["00"][0], "End on Path (0-1)": STAGE_RANGES["00"][1],
        "Particle Count": 420, "Field Radius": 30.0, "Corridor Radius": 6.5,
        "Vertical Scale": 0.82, "Dot Radius": 0.34,
        "Cluster Strength": 0.12, "Erosion": 0.02,
        "Longitudinal Jitter": 8.0,
    }.items(): set_modifier_input(signal_mod, name, value)
    apply_semantics(
        signal, "00", "narrative-field", "quiet-particle-field",
        density=1.3, priority=1.4, radius_scale=1.3,
    )

    nebula_mesh = create_field_base(
        "ABS_NEBULA_FIELD", frames, capacity=2200, progress_range=(0.045, 0.27)
    )
    nebula, nebula_mod = create_host("GN_NEBULA_FIELD", nebula_mesh, stage_collections["01"], field_group, "ABS_NEBULA_FIELD")
    add_materials(nebula)
    set_modifier_input(nebula_mod, "Path Guide", path)
    for name, value in {
        "Start on Path (0-1)": STAGE_RANGES["01"][0], "End on Path (0-1)": STAGE_RANGES["01"][1],
        "Particle Count": 1650, "Field Radius": 52.0, "Corridor Radius": 7.0,
        "Vertical Scale": 1.25, "Dot Radius": 0.34,
        "Cluster Strength": 0.52, "Erosion": 0.18,
        "Longitudinal Jitter": 14.0,
    }.items(): set_modifier_input(nebula_mod, name, value)
    apply_semantics(
        nebula, "01", "narrative-field", "eroded-nebula",
        density=1.45, priority=1.25, radius_scale=1.08,
    )
    hoop_source = require_object("ABS_HOOP_MODULE", "MESH")
    hoop_variants = create_hoop_variant_collection(hoop_source)
    round_group = create_coloured_round_portal_group()
    hoop_modifier = hoop.modifiers.get("ABS_PARAMETRIC_EFFECT")
    hoop_modifier.node_group = round_group
    set_modifier_input(hoop_modifier, "Path Guide", path)
    set_modifier_input(hoop_modifier, "Profile Variants", hoop_variants)
    configure_existing_repeater(
        hoop, stage_collections["02"], name="GN_ROUND_PORTALS", stage="02",
        start=STAGE_RANGES["02"][0], end=STAGE_RANGES["02"][1], count=36,
        start_scale=0.78, end_scale=1.18, priority=2.6, radius_scale=1.08,
        visibility=(4.2, 7.6),
    )
    set_modifier_input(hoop_modifier, "Start Roll (degrees)", 0.0)
    set_modifier_input(hoop_modifier, "Roll per Shape (degrees)", 0.0)
    aperture = bpy.data.objects.get("GN_SIGNAL_APERTURE")
    if aperture is None:
        aperture = hoop.copy()
        aperture.data = hoop.data.copy()
        aperture.name = "GN_SIGNAL_APERTURE"
        stage_collections["00"].objects.link(aperture)
    else:
        move_to_collection(aperture, stage_collections["00"])
        aperture.hide_render = False
        aperture.hide_set(False)
    aperture_mod = aperture.modifiers.get("ABS_PARAMETRIC_EFFECT")
    if aperture_mod is None:
        aperture_mod = aperture.modifiers.new("ABS_PARAMETRIC_EFFECT", "NODES")
    aperture_mod.node_group = round_group
    set_modifier_input(aperture_mod, "Path Guide", path)
    set_modifier_input(aperture_mod, "Profile Variants", hoop_variants)
    aperture_progress = STAGE_RANGES["00"][1] * 0.88
    set_modifier_input(aperture_mod, "Start on Path (0-1)", max(0.0, aperture_progress - 0.001))
    set_modifier_input(aperture_mod, "End on Path (0-1)", min(1.0, aperture_progress + 0.001))
    set_modifier_input(aperture_mod, "Instance Count", 1)
    set_modifier_input(aperture_mod, "Start Scale", 0.90)
    set_modifier_input(aperture_mod, "End Scale", 0.90)
    apply_semantics(
        aperture, "00", "path-tunnel", "signal-aperture",
        density=1.5, priority=3.0, preserve=1.4, radius_scale=1.25,
        visibility=(0.0, 2.0),
    )
    aperture["abs_instance_count"] = 1

    canyon_mesh = create_canyon_base("GN_RIBBON_CANYON", frames)
    canyon_group = build_canyon_group()
    canyon, canyon_mod = create_host("GN_RIBBON_CANYON", canyon_mesh, stage_collections["03"], canyon_group, "ABS_RIBBON_CANYON")
    add_materials(canyon)
    set_modifier_input(canyon_mod, "Path Guide", path)
    for polygon_index, polygon in enumerate(canyon.data.polygons):
        row, column = divmod(polygon_index, CANYON_COLUMNS_ACROSS)
        territory = (row // 12) + (column // 5) * 2
        meander = ((row // 31) + (column // 9)) % 3
        polygon.material_index = (territory + meander) % 6
    for name, value in {
        "Start on Path (0-1)": STAGE_RANGES["03"][0],
        # The 259 m-wide live landscape projects slightly beyond its centreline
        # along the curved exit. Stop at the last full grid row that still leaves
        # a physical gap before the first aerial square gate.
        "End on Path (0-1)": CANYON_GEOMETRY_END,
        "Canyon Width": 210.0,
        "Camera Clearance": 5.0,
        "Path Height Influence": 0.0,
        "Density Fade In": 0.12,
        "Density Fade Out": 0.12,
        "Protected Corridor": 0.035,
        "Centre Relief": 0.82,
        "Flat End": 0.14,
        "Hill Height": 9.0,
        "Hill Scale": 1.15,
        "Mountain Start": 0.42,
        "Mountain Height": 24.0,
        "Mountain Scale": 2.4,
        "Wall Lift": 9.0,
        "Interaction": 0.4,
        "Terrain Seed": 3117.0,
    }.items():
        set_modifier_input(canyon_mod, name, value)
    solidify = canyon.modifiers.new("ABS_RIBBON_THICKNESS", "SOLIDIFY")
    solidify.thickness = 0.12
    solidify.offset = 0.0
    apply_semantics(
        canyon, "03", "narrative-surface", "continuous-mountain-terrain",
        density=0.82, priority=1.12, radius_scale=0.66,
    )
    canyon["abs_sampling_density_attribute"] = "abs_density_weight"
    canyon.id_properties_ui("abs_sampling_density_attribute").update(
        description="Evaluated Geometry Nodes point attribute used to fade website surfel density without narrowing the terrain.",
    )

    configure_existing_repeater(
        gate, stage_collections["04"], name="GN_SQUARE_LOOP", stage="04",
        start=STAGE_RANGES["04"][0], end=STAGE_RANGES["04"][1], count=48,
        start_scale=1.18, end_scale=0.96, gate=True,
        priority=4.2, radius_scale=1.18, visibility=(12.4, 15.9),
    )
    gate_modifier = gate.modifiers["ABS_PARAMETRIC_EFFECT"]
    set_modifier_input(gate_modifier, "Path Guide", path)
    bind_square_gate_controls(gate, square_controls)
    gate["abs_camera_path_range"] = json.dumps(STAGE_RANGES["04"])
    gate["abs_palette_policy"] = "one-colour-per-gate-cycling-six-home-roles"
    gate["abs_alignment_policy"] = "live-rollercoaster-path-camera-roll-optional-gate-twist"

    lattice_variants = create_box_variant_collection("ABS_LATTICE_VARIANTS", "ABS_LATTICE_STRAND", (1.0, 1.0, 1.0))
    lattice_group = build_lattice_group(lattice_variants)
    lattice_mesh = bpy.data.meshes.new("GN_RESPONSIVE_LATTICE_ANCHOR_MESH")
    lattice_mesh.from_pydata([(0.0, 0.0, 0.0)], [], [])
    lattice, lattice_mod = create_host("GN_RESPONSIVE_LATTICE", lattice_mesh, stage_collections["05"], lattice_group, "ABS_RESPONSIVE_LATTICE")
    bind_stage_object_to_path(
        lattice, path, guides,
        anchor_name="ABS_LATTICE_PATH_ANCHOR",
        progress=sum(STAGE_RANGES["05"]) * 0.5,
        forward_axis="FORWARD_Y", up_axis="UP_Z",
    )
    for name, value in {
        "Lattice Width": 132.0, "Lattice Depth": 80.0,
        "Columns Across": 41, "Rows Deep": 58, "Corridor Width": 16.0,
        "Position Jitter": 1.8, "Strand Keep": 0.82,
        "Strand Thickness": 0.28, "Height Min": 15.0, "Height Max": 40.0,
        "Variation Seed": 47, "Wave Amplitude": 7.0, "Wave Length": 38.0,
        "Wave Speed": 0.24, "Response Delay": 0.18,
    }.items():
        set_modifier_input(lattice_mod, name, value)
    apply_semantics(
        lattice, "05", "narrative-lattice", "responsive-lattice",
        density=0.54, priority=1.15, radius_scale=0.48,
    )
    lattice["abs_motion_subgroups"] = 32
    lattice.id_properties_ui("abs_motion_subgroups").update(
        min=1, max=64,
        description="Website-only coherent motion bands used to animate strands without CPU transforms.",
    )

    lens_group = build_lens_group()
    lens_mesh = bpy.data.meshes.new("GN_LENS_CHAMBER_ANCHOR_MESH")
    lens_mesh.from_pydata([(0.0, 0.0, 0.0)], [], [])
    lens, lens_mod = create_host("GN_LENS_CHAMBER", lens_mesh, stage_collections["06"], lens_group, "ABS_LENS_CHAMBER")
    add_materials(lens)
    # Keep the culmination ahead of the stopped camera. The previous chamber was
    # centred on the camera, so twenty deep ribs crossed the CTA and read as a
    # second tunnel instead of a resolved destination.
    bind_stage_object_to_path(
        lens, path, guides,
        anchor_name="ABS_LENS_PATH_ANCHOR",
        progress=1.0,
        forward_axis="TRACK_NEGATIVE_Z", up_axis="UP_Y",
        local_offset=(0.0, 0.0, -33.5),
    )
    for name, value in {
        "Chamber Depth": 18.0, "Rib Count": 6,
        "Centre Radius": 24.0, "End Radius": 30.0, "Vertical Aspect": 0.9,
        "Rib Thickness": 0.34, "Twist (degrees)": 18.0,
        "Radius Ripple": 0.06, "Ripple Count": 2.0,
        "Pulse": 0.065, "Pulse Speed": 0.24,
    }.items():
        set_modifier_input(lens_mod, name, value)
    apply_semantics(
        lens, "06", "narrative-destination", "finale-halo",
        density=0.5, priority=1.45, preserve=1.2, radius_scale=0.72,
    )

    roll_profile = configure_camera_roll(scene, controller)
    set_markers(scene)
    write_readme()
    scene["abs_source"] = "About V2 seven-stage parametric narrative world"
    scene["abs_blender_authority"] = "geometry,camera,roll,fov,semantic-parts,stage-boundaries"
    scene["abs_narrative_world_version"] = 14
    scene["abs_narrative_stage_ranges"] = json.dumps(STAGE_RANGES)
    scene["abs_point_density_contract"] = "uniform-surface-v17-protected-opening-components"
    scene["abs_cleanup_contract"] = "single-live-world-no-archived-scene-objects"
    scene.frame_set(scene.frame_start)
    orphaned = bpy.data.orphans_purge(do_recursive=True)
    # Orphan cleanup can invalidate Python RNA proxies even when a datablock with
    # the same name remains live. Reacquire exact scene owners and resolve scalar
    # evidence before saving so the idempotent builder does not fail after a
    # successful rebuild.
    verified_path = require_object(PATH_NAME, "CURVE")
    verified_camera = require_object(CAMERA_NAME, "CAMERA")
    verified_path_length = sum(item.calc_length() for item in verified_path.data.splines)
    verified_horizontal_fov = math.degrees(verified_camera.data.angle_x)
    route_control_point_count = sum(
        len(spline.bezier_points) if spline.type == "BEZIER" else len(spline.points)
        for spline in verified_path.data.splines
    )
    if output_blend is not None:
        output_blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    result = {
        "saved": output_blend is not None,
        "outputBlend": str(output_blend) if output_blend is not None else None,
        "routeControlPointCount": route_control_point_count,
        "pathLength": round(verified_path_length, 3),
        "horizontalFov": round(verified_horizontal_fov, 3),
        "steadycam": {
            "lookAheadMetres": float(controls["camera_steadycam_look_ahead_metres"]),
            "targetExtensionMetres": float(controls["camera_steadycam_target_extension_metres"]),
        },
        "rollKeys": roll_profile,
        "squareRollercoasterControls": [
            "Gate Count", "Gate Start Scale", "Gate End Scale",
            "Gate Twist per Shape", "Roll Turns",
        ],
        "removedDeprecatedObjects": removed_deprecated_objects,
        "purgedOrphanDataBlocks": int(orphaned),
        "generators": [
            "GN_SIGNAL_FIELD", "GN_SIGNAL_APERTURE", "GN_NEBULA_FIELD",
            "GN_ROUND_PORTALS", "GN_RIBBON_CANYON", "GN_SQUARE_LOOP",
            "GN_RESPONSIVE_LATTICE", "GN_LENS_CHAMBER",
        ],
    }
    print("ABS_PARAMETRIC_NARRATIVE=" + json.dumps(result, separators=(",", ":")))
    return result


if __name__ == "__main__":
    try:
        cli_args = parse_args()
        resolved_output = resolve_build_output(cli_args, bpy.data.filepath)
        if cli_args.validate_output_only:
            print("ABS_PARAMETRIC_OUTPUT=" + json.dumps({
                "status": "ok",
                "inputBlend": str(Path(bpy.data.filepath).resolve()) if bpy.data.filepath else None,
                "outputBlend": str(resolved_output),
                "canonicalOutput": resolved_output == CANONICAL_BLEND_PATH,
            }, separators=(",", ":")))
        else:
            main(output_blend=resolved_output)
    except Exception as error:
        print(f"ABS_PARAMETRIC_ERROR={error}", file=sys.stderr)
        raise SystemExit(2) from error
