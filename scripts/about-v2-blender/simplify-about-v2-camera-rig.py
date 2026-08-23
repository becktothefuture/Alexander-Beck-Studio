#!/usr/bin/env python3
"""Replace baked About V2 camera channels with a sparse rail-and-roll rig.

This script is intentionally non-saving. Run it in the open authoritative Blender
scene, review the ride, then save the .blend manually when the rest of the open scene
is ready to be preserved.
"""

import json
import math

import bpy


CAMERA_NAME = "ABS_CAMERA"
ROLL_DRIVER_NAME = "ABS_CAMERA_ROLL_DRIVER"
RIDE_PATH_NAME = "ABS_PARAMETRIC_RIDE_PATH"
GATE_TUNNEL_NAME = "GN_GATE_TUNNEL"
GATE_MODIFIER_NAME = "ABS_PARAMETRIC_EFFECT"
PROGRESS_ACTION_NAME = "ABS_CAMERA_PROGRESS_ACTION"
PROGRESS_PROPERTY = "abs_path_progress"
ROLL_PROPERTY = "abs_roll_degrees"
FOLLOW_CONSTRAINT_NAME = "ABS_FOLLOW_RIDE_PATH"
ROLL_CONSTRAINT_NAME = "ABS_SQUARE_TUNNEL_ROLL"
PROGRESS_GROUP_NAME = "Rail Travel"
ROLL_GROUP_NAME = "Camera Roll"
PROGRESS_BACKUP_NAME = "ABS_BACKUP_CAMERA_PROGRESS_721_KEYS"
CAMERA_ACTION_BACKUP_NAME = "ABS_BACKUP_CAMERA_BAKED_CHANNELS"
CAMERA_DATA_ACTION_BACKUP_NAME = "ABS_BACKUP_CAMERA_LENS_CHANNELS"
STORY_WORLD_UNITS_END = 19.169714
HORIZON_RETURN_PROGRESS = 0.05
RIDE_PATH_TWIST_MODE = "Z_UP"


def require_object(name, object_type=None):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f"Required Blender object is missing: {name}")
    if object_type is not None and obj.type != object_type:
        raise RuntimeError(f"{name} must be a {object_type}, not {obj.type}.")
    return obj


def input_value(modifier, display_name):
    for item in modifier.node_group.interface.items_tree:
        if (
            getattr(item, "item_type", None) == "SOCKET"
            and getattr(item, "in_out", None) == "INPUT"
            and item.name == display_name
        ):
            return modifier[item.identifier]
    raise RuntimeError(
        f"{modifier.node_group.name} has no input named {display_name!r}."
    )


def keep_action_backup(action, backup_name):
    if action is None:
        return None
    existing = bpy.data.actions.get(backup_name)
    if existing is not None:
        return existing
    backup = action.copy()
    backup.name = backup_name
    backup.use_fake_user = True
    return backup


def clear_action(action):
    for curve in list(action.fcurves):
        action.fcurves.remove(curve)
    for group in list(action.groups):
        action.groups.remove(group)


def add_curve(action, data_path, group_name, points, interpolation):
    curve = action.fcurves.new(data_path=data_path, action_group=group_name)
    curve.extrapolation = "CONSTANT"
    for frame, value in points:
        key = curve.keyframe_points.insert(frame=frame, value=value, options={"FAST"})
        key.interpolation = interpolation
        if interpolation == "BEZIER":
            key.handle_left_type = "AUTO_CLAMPED"
            key.handle_right_type = "AUTO_CLAMPED"
    curve.update()
    return curve


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


def set_marker(scene, name, frame):
    marker = scene.timeline_markers.get(name)
    if marker is None:
        marker = scene.timeline_markers.new(name, frame=frame)
    else:
        marker.frame = frame


def main():
    scene = bpy.context.scene
    camera = require_object(CAMERA_NAME, "CAMERA")
    controller = require_object(ROLL_DRIVER_NAME, "EMPTY")
    ride_path = require_object(RIDE_PATH_NAME, "CURVE")
    gate_tunnel = require_object(GATE_TUNNEL_NAME, "MESH")
    gate_modifier = gate_tunnel.modifiers.get(GATE_MODIFIER_NAME)
    if gate_modifier is None or gate_modifier.type != "NODES":
        raise RuntimeError(f"{GATE_TUNNEL_NAME} is missing {GATE_MODIFIER_NAME}.")

    follow = camera.constraints.get(FOLLOW_CONSTRAINT_NAME)
    roll_constraint = camera.constraints.get(ROLL_CONSTRAINT_NAME)
    if follow is None or follow.type != "FOLLOW_PATH" or follow.target != ride_path:
        raise RuntimeError("ABS_CAMERA is not following the authoritative ride path.")
    if (
        roll_constraint is None
        or roll_constraint.type != "COPY_ROTATION"
        or roll_constraint.target != controller
    ):
        raise RuntimeError("ABS_CAMERA is not copying the dedicated roll controller.")

    # MINIMUM parallel-transports the curve frame and accumulated a 24.765-degree
    # bank at the end of this non-planar route. Z_UP keeps the rail's neutral
    # horizon level; the sparse controller remains the explicit roll authority.
    ride_path.data.twist_mode = RIDE_PATH_TWIST_MODE

    frame_start = int(scene.frame_start)
    frame_end = int(scene.frame_end)
    frame_span = frame_end - frame_start
    if frame_span <= 0:
        raise RuntimeError("The scene frame range is invalid.")

    gate_start = float(input_value(gate_modifier, "Start on Path (0-1)"))
    gate_end = float(input_value(gate_modifier, "End on Path (0-1)"))
    gate_count = max(1, int(input_value(gate_modifier, "Instance Count")))
    start_roll = float(input_value(gate_modifier, "Start Roll (degrees)"))
    roll_per_gate = float(input_value(gate_modifier, "Roll per Shape (degrees)"))
    influence = float(gate_tunnel.get("abs_camera_roll_influence", 1.0))
    gate_end_roll = (start_roll + (max(0, gate_count - 1) * roll_per_gate)) * influence
    horizon_progress = min(1.0, gate_end + HORIZON_RETURN_PROGRESS)

    def frame_at_progress(progress):
        return int(round(frame_start + (max(0.0, min(1.0, progress)) * frame_span)))

    roll_points = [
        (frame_at_progress(gate_start), start_roll * influence),
        (frame_at_progress(gate_end), gate_end_roll),
        (frame_at_progress(horizon_progress), 0.0),
    ]

    camera_action = camera.animation_data.action if camera.animation_data else None
    if camera_action is not None:
        keep_action_backup(camera_action, CAMERA_ACTION_BACKUP_NAME)
        camera_action.use_fake_user = True
        camera.animation_data.action = None

    camera_data_action = (
        camera.data.animation_data.action if camera.data.animation_data else None
    )
    if camera_data_action is not None:
        keep_action_backup(camera_data_action, CAMERA_DATA_ACTION_BACKUP_NAME)
        lens_curve = next(
            (curve for curve in camera_data_action.fcurves if curve.data_path == "lens"),
            None,
        )
        if lens_curve is not None:
            camera.data.lens = lens_curve.evaluate(frame_start)
        camera_data_action.use_fake_user = True
        camera.data.animation_data.action = None

    controller.animation_data_create()
    progress_action = controller.animation_data.action
    if progress_action is None or progress_action.name != PROGRESS_ACTION_NAME:
        progress_action = bpy.data.actions.get(PROGRESS_ACTION_NAME)
        if progress_action is None:
            progress_action = bpy.data.actions.new(PROGRESS_ACTION_NAME)
        controller.animation_data.action = progress_action
    keep_action_backup(progress_action, PROGRESS_BACKUP_NAME)
    clear_action(progress_action)

    add_curve(
        progress_action,
        f'["{PROGRESS_PROPERTY}"]',
        PROGRESS_GROUP_NAME,
        ((frame_start, 0.0), (frame_end, 1.0)),
        "LINEAR",
    )
    add_curve(
        progress_action,
        f'["{ROLL_PROPERTY}"]',
        ROLL_GROUP_NAME,
        roll_points,
        "BEZIER",
    )

    controller[PROGRESS_PROPERTY] = 0.0
    controller[ROLL_PROPERTY] = 0.0
    controller.id_properties_ui(PROGRESS_PROPERTY).update(
        min=0.0,
        max=1.0,
        soft_min=0.0,
        soft_max=1.0,
        description="Two-key normalized travel along ABS_PARAMETRIC_RIDE_PATH.",
    )
    controller.id_properties_ui(ROLL_PROPERTY).update(
        min=-180.0,
        max=180.0,
        soft_min=-90.0,
        soft_max=90.0,
        description="Three-key local camera roll aligned to the square-gate tunnel.",
    )
    controller["abs_note"] = (
        "Sparse camera controller: two linear keys drive rail travel and three Bezier "
        "keys drive local roll at the square-gate tunnel."
    )
    ride_path["abs_camera_horizon"] = (
        "Z_UP supplies the neutral horizon. ABS_CAMERA_ROLL_DRIVER adds intentional "
        "local Z roll without endpoint correction keys."
    )
    camera["abs_orientation_source"] = (
        "ABS_PARAMETRIC_RIDE_PATH tangent with Z_UP neutral horizon; "
        "ABS_CAMERA_ROLL_DRIVER adds authored local Z roll"
    )
    controller["abs_roll_profile"] = json.dumps(
        [
            {
                "frame": frame,
                "progress": round((frame - frame_start) / frame_span, 6),
                "degrees": round(degrees, 3),
                "marker": marker,
            }
            for (frame, degrees), marker in zip(
                roll_points,
                ("ABS_ROLL_GATE_START", "ABS_ROLL_GATE_END", "ABS_ROLL_HORIZON"),
            )
        ]
    )

    replace_scalar_driver(
        camera,
        f'constraints["{FOLLOW_CONSTRAINT_NAME}"].offset_factor',
        "progress",
        (("progress", controller, f'["{PROGRESS_PROPERTY}"]'),),
    )
    replace_driver(
        controller,
        "rotation_euler",
        2,
        f"roll_degrees * {math.pi / 180.0!r}",
        (("roll_degrees", controller, f'["{ROLL_PROPERTY}"]'),),
    )
    replace_scalar_driver(
        camera,
        '["story_wu"]',
        f"progress * {STORY_WORLD_UNITS_END!r}",
        (("progress", controller, f'["{PROGRESS_PROPERTY}"]'),),
    )

    set_marker(scene, "ABS_ROLL_GATE_START", roll_points[0][0])
    set_marker(scene, "ABS_ROLL_GATE_END", roll_points[1][0])
    set_marker(scene, "ABS_ROLL_HORIZON", roll_points[2][0])
    level_start = scene.timeline_markers.get("ABS_ROLL_LEVEL_START")
    if level_start is not None:
        level_start.frame = frame_start
    level_end = scene.timeline_markers.get("ABS_ROLL_LEVEL_END")
    if level_end is not None:
        level_end.frame = frame_end

    scene.frame_set(scene.frame_current)
    print(
        "ABS_CAMERA_SPARSE_RIG="
        + json.dumps(
            {
                "saved": False,
                "cameraAction": None,
                "cameraDataAction": None,
                "progressKeys": [[frame_start, 0.0], [frame_end, 1.0]],
                "rollKeys": [[frame, round(value, 3)] for frame, value in roll_points],
                "totalKeyPoints": 5,
                "path": ride_path.name,
                "pathTwistMode": ride_path.data.twist_mode,
                "backups": [
                    CAMERA_ACTION_BACKUP_NAME,
                    CAMERA_DATA_ACTION_BACKUP_NAME,
                    PROGRESS_BACKUP_NAME,
                ],
            },
            separators=(",", ":"),
        )
    )


if __name__ == "__main__":
    main()
