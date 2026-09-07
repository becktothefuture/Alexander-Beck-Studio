#!/usr/bin/env python3
"""Double the opening and solid-body rail spans without changing later shots.

The first two occupied sections of the About camera rail are stretched on the
forward axis. Everything after the solid-body section is translated by the
same added distance, so the round tunnel, landscape, square gates, and finale
keep their existing local shape. The opening keeps its near face, and the solid
bodies use their start/end controls as real positions on the rail.

Run inside the canonical About Blender file. This script is idempotent and does
not save the file.
"""

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.geometry import interpolate_bezier


INTERNAL_KEY = "Internal Export Data"
CONTRACT = "double-opening-and-solid-body-rail-v1"
PATH_BREAK_INDEX = 5
EARLY_PATH_SCALE = 2.0
OPENING_NEAR_WORLD_Y = 165.0
OPENING_BODY_GAP_WU = 40.0
MINIMUM_BODY_ROUND_GAP_WU = 10.0
BODY_CORRIDOR_SPREAD = 1.0
DOWNSTREAM_CONTROLS = (
    "16 Start (%)",
    "17 End (%)",
    "22 Landscape Start (%)",
    "23 Landscape End (%)",
    "26 Start (%)",
    "27 End (%)",
)


def plain_value(value):
    if hasattr(value, "to_dict"):
        return {str(key): plain_value(item) for key, item in value.to_dict().items()}
    if hasattr(value, "to_list"):
        return [plain_value(item) for item in value.to_list()]
    if isinstance(value, dict):
        return {str(key): plain_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [plain_value(item) for item in value]
    return value


def require_object(name, object_type=None):
    obj = bpy.data.objects.get(name)
    if obj is None or (object_type is not None and obj.type != object_type):
        raise RuntimeError(f"Missing required {object_type or 'scene'} object: {name}.")
    return obj


def evaluated_bounds(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points = []
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        if evaluated.hide_render or evaluated.type != "MESH":
            continue
        points.extend(evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box)
    if not points:
        raise RuntimeError("Cannot measure an empty object set.")
    return {
        "min": [min(point[axis] for point in points) for axis in range(3)],
        "max": [max(point[axis] for point in points) for axis in range(3)],
    }


def collection_meshes(name):
    collection = bpy.data.collections.get(name)
    if collection is None:
        raise RuntimeError(f"Missing collection: {name}.")
    return [obj for obj in collection.all_objects if obj.type == "MESH"]


def path_polyline(path, samples_per_segment=160):
    spline = path.data.splines[0]
    if spline.type != "BEZIER" or spline.use_cyclic_u:
        raise RuntimeError("Camera Path must remain one open Bezier spline.")
    points = spline.bezier_points
    result = []
    for index in range(len(points) - 1):
        left = points[index]
        right = points[index + 1]
        segment = interpolate_bezier(
            left.co,
            left.handle_right,
            right.handle_left,
            right.co,
            samples_per_segment + 1,
        )
        if index:
            segment = segment[1:]
        result.extend(path.matrix_world @ point for point in segment)
    cumulative = [0.0]
    for left, right in zip(result, result[1:]):
        cumulative.append(cumulative[-1] + (right - left).length)
    return result, cumulative


def point_at_fraction(points, cumulative, fraction):
    target = max(0.0, min(1.0, fraction)) * cumulative[-1]
    for index in range(1, len(cumulative)):
        if cumulative[index] < target:
            continue
        span = cumulative[index] - cumulative[index - 1]
        factor = 0.0 if span <= 1e-9 else (target - cumulative[index - 1]) / span
        return points[index - 1].lerp(points[index], factor)
    return points[-1].copy()


def nearest_fraction(points, cumulative, target):
    best_index = min(range(len(points)), key=lambda index: (points[index] - target).length_squared)
    return cumulative[best_index] / cumulative[-1]


def nearest_fraction_for_y(points, cumulative, target_y, maximum_fraction=0.6):
    limit = cumulative[-1] * maximum_fraction
    candidates = [
        index for index, distance in enumerate(cumulative)
        if distance <= limit
    ]
    best_index = min(candidates, key=lambda index: abs(points[index].y - target_y))
    return cumulative[best_index] / cumulative[-1]


def transform_camera_path(path):
    spline = path.data.splines[0]
    points = spline.bezier_points
    if len(points) <= PATH_BREAK_INDEX:
        raise RuntimeError("Camera Path does not have the expected early-section breakpoint.")
    anchor_y = float(points[0].co.y)
    break_y = float(points[PATH_BREAK_INDEX].co.y)
    added_y = (break_y - anchor_y) * (EARLY_PATH_SCALE - 1.0)
    originals = [
        (point.co.copy(), point.handle_left.copy(), point.handle_right.copy())
        for point in points
    ]
    for index, point in enumerate(points):
        original_co, original_left, original_right = originals[index]
        if index < PATH_BREAK_INDEX:
            point.co.y = anchor_y + (float(original_co.y) - anchor_y) * EARLY_PATH_SCALE
            point.handle_left.y = anchor_y + (float(original_left.y) - anchor_y) * EARLY_PATH_SCALE
            point.handle_right.y = anchor_y + (float(original_right.y) - anchor_y) * EARLY_PATH_SCALE
        elif index == PATH_BREAK_INDEX:
            point.co.y = anchor_y + (float(original_co.y) - anchor_y) * EARLY_PATH_SCALE
            point.handle_left.y = anchor_y + (float(original_left.y) - anchor_y) * EARLY_PATH_SCALE
            point.handle_right.y = float(original_right.y) + added_y
        else:
            point.co.y = float(original_co.y) + added_y
            point.handle_left.y = float(original_left.y) + added_y
            point.handle_right.y = float(original_right.y) + added_y
    path.data.update_tag()
    return added_y


def update_opening(opening):
    rig = opening.parent
    if rig is None or rig.name != "Opening Position":
        raise RuntimeError("Opening Field must remain parented to Opening Position.")
    local_min_y = min(float(vertex.co.y) for vertex in opening.data.vertices)
    old_scale = float(rig.scale.y)
    rig.scale.y = old_scale * EARLY_PATH_SCALE
    bpy.context.view_layer.update()
    parent_y = float(rig.matrix_world.translation.y)
    opening.location.y = (
        (OPENING_NEAR_WORLD_Y - parent_y) / float(rig.scale.y)
    ) - local_min_y
    rig.update_tag(refresh={"OBJECT"})
    opening.update_tag(refresh={"OBJECT", "DATA"})
    return old_scale, float(rig.scale.y)


def refresh(scene, objects):
    current = scene.frame_current
    adjacent = current + 1 if current < scene.frame_end else current - 1
    scene.frame_set(adjacent)
    scene.frame_set(current)
    for obj in objects:
        obj.update_tag(refresh={"OBJECT"})
    bpy.context.view_layer.update()


def run_body_parameterizer():
    script_path = Path(__file__).with_name("parameterize-solid-body-field.py")
    namespace = {"__name__": "__main__", "__file__": str(script_path)}
    source = script_path.read_text(encoding="utf-8")
    exec(compile(source, str(script_path), "exec"), namespace)


def retime_camera_progress(scene, path, stage_fractions):
    camera = require_object("Scene Camera", "CAMERA")
    if camera.animation_data is None or camera.animation_data.action is None:
        raise RuntimeError("Scene Camera has no editable Action.")
    action = camera.animation_data.action
    curve = action.fcurves.find('["rail_progress"]', index=0)
    if curve is None:
        raise RuntimeError("Scene Camera has no rail_progress curve.")
    while curve.keyframe_points:
        curve.keyframe_points.remove(curve.keyframe_points[0])
    keys = [(scene.timeline_markers[f"ABS_STAGE_{index:02d}"].frame, value)
            for index, value in enumerate(stage_fractions[:7])]
    keys.extend((
        (scene.timeline_markers["ABS_CAMERA_LOCK"].frame, 1.0),
        (scene.timeline_markers["ABS_TERMINAL_FRAME"].frame, 1.0),
    ))
    for frame, value in keys:
        key = curve.keyframe_points.insert(frame, value, options={"FAST"})
        key.interpolation = "BEZIER"
        key.handle_left_type = "AUTO_CLAMPED"
        key.handle_right_type = "AUTO_CLAMPED"
    curve.update()
    return keys


def update_guide():
    guide = bpy.data.texts.get("README - About Scene")
    if guide is None:
        return
    marker = "OPENING + SOLID-BODY LENGTH\n"
    body = guide.as_string()
    if marker in body:
        body = body.split(marker, 1)[0].rstrip() + "\n\n"
    body += marker + (
        "The opening and solid-body portions of Camera Path are twice their prior\n"
        "forward length. The opening keeps its original near face. Solid bodies\n"
        "advance one-by-one along the rail through a close four-sided corridor\n"
        "around the camera path. About Controls still owns their start, end, size,\n"
        "spread, rotation, copy count, seed, and minimum surface gap. The camera\n"
        "progress curve preserves equal text timing while these two sections cover\n"
        "twice the physical rail distance.\n"
    )
    guide.clear()
    guide.write(body)


def main():
    scene = bpy.context.scene
    path = require_object("Camera Path", "CURVE")
    controls = require_object("About Controls", "EMPTY")
    opening = require_object("Opening Field", "MESH")
    finale = require_object("Finale Position", "EMPTY")
    approach = require_object("Finale Approach Start", "EMPTY")
    if len(path.data.splines) != 1:
        raise RuntimeError("Camera Path must remain one curve spline.")

    metadata = plain_value(scene.get(INTERNAL_KEY, {}))
    already_applied = metadata.get("abs_early_path_length_contract") == CONTRACT
    before_opening = evaluated_bounds([opening])
    before_bodies = evaluated_bounds(collection_meshes("03 SOLID BODIES"))
    before_round = evaluated_bounds(collection_meshes("04 ROUND TUNNEL"))
    object_count_before = len(scene.objects)

    old_points, old_cumulative = path_polyline(path)
    old_length = old_cumulative[-1]
    if already_applied:
        controls["11 Body Spread"] = BODY_CORRIDOR_SPREAD
        run_body_parameterizer()
        refresh(scene, (path, controls, opening, finale, approach))
        current_opening = evaluated_bounds([opening])
        current_bodies = evaluated_bounds(collection_meshes("03 SOLID BODIES"))
        current_round = evaluated_bounds(collection_meshes("04 ROUND TUNNEL"))
        print(json.dumps({
            "status": "ok",
            "saved": False,
            "contract": CONTRACT,
            "alreadyApplied": True,
            "objectCount": len(scene.objects),
            "pathLengthAfterWU": round(old_length, 6),
            "openingLengthAfterWU": round(
                current_opening["max"][1] - current_opening["min"][1], 6
            ),
            "bodyLengthAfterWU": round(
                current_bodies["max"][1] - current_bodies["min"][1], 6
            ),
            "openingBodyGapWU": round(
                current_bodies["min"][1] - current_opening["max"][1], 6
            ),
            "bodyRoundGapWU": round(
                current_round["min"][1] - current_bodies["max"][1], 6
            ),
            "bodyStartPercent": round(float(controls["08 Bodies Start (%)"]), 6),
            "bodyEndPercent": round(float(controls["09 Bodies End (%)"]), 6),
            "bodySpread": round(float(controls["11 Body Spread"]), 6),
        }, sort_keys=True))
        return
    downstream_targets = {
        name: point_at_fraction(old_points, old_cumulative, float(controls[name]) * 0.01)
        for name in DOWNSTREAM_CONTROLS
    }
    approach_constraint = approach.constraints.get("ABS_FINALE_APPROACH_RAIL")
    if approach_constraint is None:
        raise RuntimeError("Finale Approach Start has no camera-rail constraint.")
    approach_target = point_at_fraction(
        old_points,
        old_cumulative,
        float(approach_constraint.offset_factor),
    )

    added_y = transform_camera_path(path)
    opening_scales = update_opening(opening)
    finale.location.y = float(finale.location.y) + added_y

    new_points, new_cumulative = path_polyline(path)
    new_length = new_cumulative[-1]
    shift = Vector((0.0, added_y, 0.0))
    for name, target in downstream_targets.items():
        controls[name] = 100.0 * nearest_fraction(new_points, new_cumulative, target + shift)
    approach_constraint.offset_factor = nearest_fraction(
        new_points,
        new_cumulative,
        approach_target + shift,
    )

    refresh(scene, (path, controls, opening, finale, approach))
    opening_bounds = evaluated_bounds([opening])
    prior_body_length = before_bodies["max"][1] - before_bodies["min"][1]
    body_target_min_y = opening_bounds["max"][1] + OPENING_BODY_GAP_WU
    body_target_max_y = body_target_min_y + prior_body_length * EARLY_PATH_SCALE
    expected_round_min_y = before_round["min"][1] + added_y
    if body_target_max_y > expected_round_min_y - MINIMUM_BODY_ROUND_GAP_WU:
        raise RuntimeError(
            "The doubled body section would crowd the round tunnel: "
            f"body max {body_target_max_y:.3f}, round min {expected_round_min_y:.3f}."
        )
    maximum_half_depth = max(
        (evaluated_bounds([obj])["max"][1] - evaluated_bounds([obj])["min"][1]) * 0.5
        for obj in collection_meshes("03 SOLID BODIES")
        if not obj.hide_render
    )
    body_start_y = body_target_min_y + maximum_half_depth
    body_end_y = body_target_max_y - maximum_half_depth
    controls["08 Bodies Start (%)"] = 100.0 * nearest_fraction_for_y(
        new_points, new_cumulative, body_start_y
    )
    controls["09 Bodies End (%)"] = 100.0 * nearest_fraction_for_y(
        new_points, new_cumulative, body_end_y
    )
    controls["11 Body Spread"] = BODY_CORRIDOR_SPREAD
    run_body_parameterizer()
    refresh(scene, (path, controls, opening, finale, approach))

    # Refine the two rail endpoints against the actual evaluated end bodies so
    # the occupied solid-body distance, not merely the control range, doubles.
    provisional_opening = evaluated_bounds([opening])
    provisional_round = evaluated_bounds(collection_meshes("04 ROUND TUNNEL"))
    desired_body_length = prior_body_length * EARLY_PATH_SCALE
    available_length = provisional_round["min"][1] - provisional_opening["max"][1]
    remaining_gap = available_length - desired_body_length
    if remaining_gap < 2.0 * MINIMUM_BODY_ROUND_GAP_WU:
        raise RuntimeError("There is not enough clear rail for the doubled body section.")
    desired_body_min_y = provisional_opening["max"][1] + remaining_gap * 0.5
    desired_body_max_y = provisional_round["min"][1] - remaining_gap * 0.5
    active_count = int(round(float(controls["07 Body Count"])))
    active_copies = int(round(float(controls["13 Copies Per Shape"])))
    endpoint_objects = {}
    for obj in collection_meshes("03 SOLID BODIES"):
        data = plain_value(obj.get(INTERNAL_KEY, {}))
        key = (
            int(round(float(data.get("abs_forms_body_index", -1)))),
            int(round(float(data.get("abs_forms_copy_index", -1)))),
        )
        endpoint_objects[key] = obj
    first_body = endpoint_objects[(0, 0)]
    last_body = endpoint_objects[(active_count - 1, active_copies - 1)]
    first_bounds = evaluated_bounds([first_body])
    last_bounds = evaluated_bounds([last_body])
    first_inset = float(first_body.matrix_world.translation.y) - first_bounds["min"][1]
    last_inset = last_bounds["max"][1] - float(last_body.matrix_world.translation.y)
    controls["08 Bodies Start (%)"] = 100.0 * nearest_fraction_for_y(
        new_points, new_cumulative, desired_body_min_y + first_inset
    )
    controls["09 Bodies End (%)"] = 100.0 * nearest_fraction_for_y(
        new_points, new_cumulative, desired_body_max_y - last_inset
    )
    run_body_parameterizer()
    refresh(scene, (path, controls, opening, finale, approach))
    tuned_bounds = evaluated_bounds(collection_meshes("03 SOLID BODIES"))
    tuned_length = tuned_bounds["max"][1] - tuned_bounds["min"][1]
    correction = desired_body_length / tuned_length
    midpoint = (
        float(controls["08 Bodies Start (%)"])
        + float(controls["09 Bodies End (%)"])
    ) * 0.5
    span = (
        float(controls["09 Bodies End (%)"])
        - float(controls["08 Bodies Start (%)"])
    ) * correction
    controls["08 Bodies Start (%)"] = midpoint - span * 0.5
    controls["09 Bodies End (%)"] = midpoint + span * 0.5
    run_body_parameterizer()
    refresh(scene, (path, controls, opening, finale, approach))

    after_opening = evaluated_bounds([opening])
    after_bodies = evaluated_bounds(collection_meshes("03 SOLID BODIES"))
    after_round = evaluated_bounds(collection_meshes("04 ROUND TUNNEL"))
    opening_length_before = before_opening["max"][1] - before_opening["min"][1]
    opening_length_after = after_opening["max"][1] - after_opening["min"][1]
    body_length_after = after_bodies["max"][1] - after_bodies["min"][1]
    body_width_before = before_bodies["max"][0] - before_bodies["min"][0]
    body_width_after = after_bodies["max"][0] - after_bodies["min"][0]
    body_height_before = before_bodies["max"][2] - before_bodies["min"][2]
    body_height_after = after_bodies["max"][2] - after_bodies["min"][2]
    body_round_gap = after_round["min"][1] - after_bodies["max"][1]
    opening_body_gap = after_bodies["min"][1] - after_opening["max"][1]

    if not math.isclose(opening_length_after / opening_length_before, EARLY_PATH_SCALE, rel_tol=0.01):
        raise RuntimeError("Opening length did not double.")
    if not math.isclose(body_length_after / prior_body_length, EARLY_PATH_SCALE, rel_tol=0.03):
        raise RuntimeError("Solid-body passage did not double within the required tolerance.")
    width_ratio = body_width_after / body_width_before
    height_ratio = body_height_after / body_height_before
    area_ratio = width_ratio * height_ratio
    if width_ratio > 0.65 or height_ratio > 0.9 or area_ratio > 0.6:
        raise RuntimeError("Solid-body corridor did not become materially narrower.")
    if min(opening_body_gap, body_round_gap) <= 0.0:
        raise RuntimeError("The revised early ecosystems overlap.")
    if len(scene.objects) != object_count_before:
        raise RuntimeError("The revision changed the Blender object count.")

    after_landscape = evaluated_bounds(collection_meshes("05 LANDSCAPE"))
    after_gates = evaluated_bounds(collection_meshes("06 SQUARE GATES"))
    physical_boundaries_y = (
        (after_opening["max"][1] + after_bodies["min"][1]) * 0.5,
        (after_bodies["max"][1] + after_round["min"][1]) * 0.5,
        (after_round["max"][1] + after_landscape["min"][1]) * 0.5,
        (after_landscape["max"][1] + after_gates["min"][1]) * 0.5,
    )
    stage_fractions = [0.0]
    stage_fractions.extend(
        nearest_fraction_for_y(new_points, new_cumulative, boundary, maximum_fraction=0.9)
        for boundary in physical_boundaries_y
    )
    stage_fractions.append(float(approach_constraint.offset_factor))
    stage_fractions.extend(((stage_fractions[-1] + 1.0) * 0.5, 1.0))
    if any(right <= left for left, right in zip(stage_fractions, stage_fractions[1:])):
        raise RuntimeError("The revised physical stage boundaries are not monotonic.")
    camera_progress_keys = retime_camera_progress(scene, path, stage_fractions)

    path_metadata = plain_value(path.get(INTERNAL_KEY, {}))
    path_metadata["abs_path_length_wu"] = round(new_length, 6)
    path_metadata["abs_early_section_contract"] = CONTRACT
    path[INTERNAL_KEY] = path_metadata
    metadata = plain_value(scene.get(INTERNAL_KEY, {}))
    equal_count = int(metadata.get("abs_equal_section_count", 7))
    metadata.pop("abs_equal_section_length_wu", None)
    metadata.update({
        "abs_early_path_length_contract": CONTRACT,
        "abs_early_path_scale": EARLY_PATH_SCALE,
        "abs_early_path_added_forward_wu": round(added_y, 6),
        "abs_opening_length_before_wu": round(opening_length_before, 6),
        "abs_opening_length_wu": round(opening_length_after, 6),
        "abs_solid_body_length_before_wu": round(prior_body_length, 6),
        "abs_solid_body_length_wu": round(body_length_after, 6),
        "abs_opening_body_gap_wu": round(opening_body_gap, 6),
        "abs_body_round_gap_wu": round(body_round_gap, 6),
        "abs_solid_body_corridor_contract": "close-alternating-four-side-corridor/v1",
        "abs_director_cut_path_length_wu": round(new_length, 6),
        "abs_stage_spans_wu": json.dumps({
            f"about.{index:02d}": [
                round(new_length * stage_fractions[index], 6),
                round(new_length * stage_fractions[index + 1], 6),
            ]
            for index in range(equal_count)
        }, separators=(",", ":")),
        "abs_narrative_stage_ranges": json.dumps({
            f"about.{index:02d}": [
                round(stage_fractions[index], 9),
                round(stage_fractions[index + 1], 9),
            ]
            for index in range(equal_count)
        }, separators=(",", ":")),
        "abs_camera_progress_stage_fractions": json.dumps(
            [round(value, 9) for value in stage_fractions], separators=(",", ":")
        ),
        "abs_equal_section_contract": "seven-equal-time-variable-distance-sections/v2",
        "abs_section_timing_owner": "equal-text-stages-piecewise-camera-progress",
        "abs_lengthen_early_sections_script": (
            "scripts/about-v2-blender/lengthen-opening-solid-bodies.py"
        ),
    })
    scene[INTERNAL_KEY] = metadata
    update_guide()
    refresh(scene, (path, controls, opening, finale, approach))

    print(json.dumps({
        "status": "ok",
        "saved": False,
        "contract": CONTRACT,
        "alreadyApplied": already_applied,
        "objectCount": len(scene.objects),
        "pathLengthBeforeWU": round(old_length, 6),
        "pathLengthAfterWU": round(new_length, 6),
        "addedForwardWU": round(added_y, 6),
        "openingLengthBeforeWU": round(opening_length_before, 6),
        "openingLengthAfterWU": round(opening_length_after, 6),
        "bodyLengthBeforeWU": round(prior_body_length, 6),
        "bodyLengthAfterWU": round(body_length_after, 6),
        "bodyWidthBeforeWU": round(body_width_before, 6),
        "bodyWidthAfterWU": round(body_width_after, 6),
        "bodyHeightBeforeWU": round(body_height_before, 6),
        "bodyHeightAfterWU": round(body_height_after, 6),
        "bodyCrossSectionAreaRatio": round(area_ratio, 6),
        "openingBodyGapWU": round(opening_body_gap, 6),
        "bodyRoundGapWU": round(body_round_gap, 6),
        "openingDepthScaleBefore": round(opening_scales[0], 6),
        "openingDepthScaleAfter": round(opening_scales[1], 6),
        "bodyStartPercent": round(float(controls["08 Bodies Start (%)"]), 6),
        "bodyEndPercent": round(float(controls["09 Bodies End (%)"]), 6),
        "bodySpread": round(float(controls["11 Body Spread"]), 6),
        "downstreamControls": {
            name: round(float(controls[name]), 6) for name in DOWNSTREAM_CONTROLS
        },
        "cameraStageFractions": [round(value, 9) for value in stage_fractions],
        "cameraProgressKeys": [
            [int(frame), round(value, 9)] for frame, value in camera_progress_keys
        ],
    }, sort_keys=True))


if __name__ == "__main__":
    main()
