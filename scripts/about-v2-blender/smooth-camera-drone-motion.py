#!/usr/bin/env python3
"""Turn the existing About camera helpers into one smooth drone-style rig.

The camera stays on the authored Camera Path, aims at a point farther along the
same path, banks gently with the square gates, and eases into the bust reveal.
No new objects or public controls are created. The script updates the open scene
only; it never saves the Blender file.
"""

import json
import bpy
import math
from mathutils import Matrix, Quaternion, Vector


PATH_NAME = "Camera Path"
CAMERA_NAME = "Scene Camera"
LOOK_AHEAD_NAME = "Tunnel Camera Path"
AIM_NAME = "Tunnel Camera Aim"
ROLL_NAME = "Tunnel Camera Roll"
BUST_FOCUS_NAME = "Bust Focus"
FINALE_BUST_NAME = "Finale Bust"
FINALE_PLATFORM_NAME = "Finale Platform"
CONTROLS_NAME = "About Controls"
INTERNAL_KEY = "Internal Export Data"
LOOK_AHEAD_FRACTION = 0.08
GATE_TWIST_TURNS = 0.075
FINALE_BUST_SCALE = 0.84
FINALE_ORBIT_DEGREES = 96.0
FINALE_ORBIT_PHASE_DEGREES = -6.0
FINALE_ORBIT_RADIUS_WU = 150.0
FINALE_FOCUS_BASE_WU = 4.0
FINALE_FOCUS_SCALE_WU = 60.0
FINALE_FOCUS_SIDE_WU = 0.0
FINALE_APPROACH_HEIGHT_WU = -80.0
FINALE_TARGET_RISE_WU = 90.0
# The approach still rises from below, then settles at bust eye level. This
# exposes the plinth top and prevents the upright model reading as tilted.
FINALE_ORBIT_RISE_WU = 145.0
FINALE_SCALE_LIFT_WU = 12.0
FINALE_APPROACH_SHARE = 0.20
MAX_RAIL_ANGULAR_STEP_DEGREES = 1.0
CONTRACT = "drone-lookahead-flight/v6-eye-level-finale"


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


def set_internal_value(owner, key, value):
    metadata = plain_value(owner.get(INTERNAL_KEY, {}))
    metadata[key] = plain_value(value)
    owner[INTERNAL_KEY] = metadata


def remove_driver(owner, data_path, index=None):
    try:
        owner.driver_remove(data_path) if index is None else owner.driver_remove(data_path, index)
    except (TypeError, RuntimeError):
        pass


def add_single_property_driver(owner, data_path, target, target_path, expression, index=None):
    remove_driver(owner, data_path, index)
    curve = owner.driver_add(data_path) if index is None else owner.driver_add(data_path, index)
    variable = curve.driver.variables.new()
    variable.name = "progress"
    variable.type = "SINGLE_PROP"
    variable.targets[0].id_type = "OBJECT"
    variable.targets[0].id = target
    variable.targets[0].data_path = target_path
    curve.driver.expression = expression
    if not curve.driver.is_valid:
        raise RuntimeError(f"Invalid driver on {owner.name} {data_path}.")
    return curve


def clear_curve_points(curve):
    while curve.keyframe_points:
        curve.keyframe_points.remove(curve.keyframe_points[0])


def action_curve(action, data_path, index=0, group="Drone camera motion"):
    curve = action.fcurves.find(data_path, index=index)
    return curve or action.fcurves.new(data_path, index=index, action_group=group)


def replace_action_keys(action, data_path, index, keys, group="Drone camera motion"):
    curve = action_curve(action, data_path, index, group)
    clear_curve_points(curve)
    for frame, value, interpolation in keys:
        key = curve.keyframe_points.insert(frame, value, options={"FAST"})
        key.interpolation = interpolation
        if interpolation == "SINE":
            key.easing = "EASE_IN_OUT"
    curve.update()
    return curve


def remove_action_curves(action, paths):
    for curve in list(action.fcurves):
        if curve.data_path in paths:
            action.fcurves.remove(curve)


def marker_frame(scene, name):
    marker = scene.timeline_markers.get(name)
    if marker is None:
        raise RuntimeError(f"Missing camera marker {name}.")
    return int(marker.frame)


def smooth_transition_handles(path):
    spline = path.data.splines[0]
    if spline.type != "BEZIER" or len(spline.bezier_points) < 8:
        raise RuntimeError("Camera Path must retain at least eight Bezier points.")
    point = spline.bezier_points[6]
    point.handle_left_type = "FREE"
    point.handle_right_type = "FREE"
    point.handle_left.x = point.co.x + 5.0
    point.handle_right.x = point.co.x - 5.0
    point = spline.bezier_points[7]
    point.handle_left_type = "FREE"
    point.handle_right_type = "FREE"
    point.handle_left.x = point.co.x - 12.397605
    point.handle_right.x = point.co.x + 3.232396
    point = spline.bezier_points[8]
    direction = point.handle_right - point.co
    if direction.length_squared <= 1e-10:
        raise RuntimeError("Camera Path point 9 has no outgoing transition handle.")
    point.handle_right = point.co + direction.normalized() * 240.0
    point = spline.bezier_points[9]
    direction = point.handle_left - point.co
    if direction.length_squared <= 1e-10:
        raise RuntimeError("Camera Path point 10 has no incoming transition handle.")
    point.handle_left = point.co + direction.normalized() * 240.0
    path.data.update_tag()


def build_look_ahead_rig(path, camera, look_ahead, aim, roll):
    look_constraint = look_ahead.constraints.get("Tunnel Path Follow")
    if look_constraint is None or look_constraint.type != "FOLLOW_PATH":
        raise RuntimeError("Tunnel Camera Path has no Follow Path constraint.")
    look_constraint.target = path
    look_constraint.use_fixed_location = True
    look_constraint.use_curve_follow = False
    look_constraint.forward_axis = "FORWARD_Y"
    look_constraint.up_axis = "UP_Z"
    add_single_property_driver(
        look_ahead,
        'constraints["Tunnel Path Follow"].offset_factor',
        camera,
        '["rail_progress"]',
        f"min(1.0,progress+{LOOK_AHEAD_FRACTION})",
    )

    roll.parent = None
    aim.parent = None
    for constraint in list(aim.constraints):
        aim.constraints.remove(constraint)
    aim.location = (0.0, 0.0, 0.0)
    aim.rotation_euler = (0.0, 0.0, 0.0)

    position = aim.constraints.new("FOLLOW_PATH")
    position.name = "Drone Position"
    position.target = path
    position.use_fixed_location = True
    position.use_curve_follow = False
    position.forward_axis = "FORWARD_Y"
    position.up_axis = "UP_Z"
    add_single_property_driver(
        aim,
        'constraints["Drone Position"].offset_factor',
        camera,
        '["rail_progress"]',
        "progress",
    )

    tracking = aim.constraints.new("DAMPED_TRACK")
    tracking.name = "Drone Look Ahead"
    tracking.target = look_ahead
    tracking.track_axis = "TRACK_NEGATIVE_Z"
    tracking.owner_space = "WORLD"
    tracking.target_space = "WORLD"

    roll.parent = aim
    roll.matrix_parent_inverse = Matrix.Identity(4)
    roll.location = (0.0, 0.0, 0.0)
    roll.rotation_euler = (0.0, 0.0, 0.0)


def configure_gate_bank(roll, controls):
    controls["32 Twist"] = GATE_TWIST_TURNS
    curve = roll.animation_data.drivers.find("rotation_euler", index=2)
    if curve is None:
        raise RuntimeError("Tunnel Camera Roll has no twist driver.")
    curve.driver.expression = (
        "6.283185307179586*twist*(0.5-0.5*cos(pi*max(0,min(1,"
        "(progress-start*0.01)/max(0.0001,(end-start)*0.01)))))"
    )
    if not curve.driver.is_valid:
        raise RuntimeError("The eased square-gate bank driver is invalid.")


def configure_finale_focus(focus, controls):
    """Aim at the fixed portrait centre through the upward reveal and hold."""
    if focus.animation_data is None:
        raise RuntimeError("Bust Focus has no animation data.")
    curve = focus.animation_data.drivers.find("location", index=2)
    if curve is None:
        raise RuntimeError("Bust Focus has no height driver.")
    variable = curve.driver.variables.get("s")
    if variable is None:
        raise RuntimeError("Bust Focus height driver has no scale variable.")
    target = variable.targets[0]
    target.id_type = "OBJECT"
    target.id = controls
    target.data_path = '["33 Bust Scale"]'
    focus.location.y = FINALE_FOCUS_SIDE_WU
    curve.driver.expression = (
        f"{FINALE_FOCUS_BASE_WU:.1f}+{FINALE_FOCUS_SCALE_WU:.1f}*s"
    )


def configure_finale_platform_visibility(platform, bust):
    """Keep the approach platform beneath the bust through the terminal hold."""
    platform_metadata = plain_value(platform.get(INTERNAL_KEY, {}))
    bust_metadata = plain_value(bust.get(INTERNAL_KEY, {}))
    for key in ("abs_visibility_end_cue", "abs_visibility_end_offset_wu",
                "abs_visibility_end_wu", "abs_visibility_handoff_wu"):
        if key not in bust_metadata:
            raise RuntimeError(f"Finale Bust is missing {key}.")
    hold_margin = 2.0 * float(bust_metadata["abs_visibility_handoff_wu"])
    platform_metadata["abs_visibility_end_cue"] = bust_metadata["abs_visibility_end_cue"]
    platform_metadata["abs_visibility_end_offset_wu"] = (
        float(bust_metadata["abs_visibility_end_offset_wu"]) + hold_margin
    )
    platform_metadata["abs_visibility_end_wu"] = (
        float(bust_metadata["abs_visibility_end_wu"]) + hold_margin
    )
    platform[INTERNAL_KEY] = platform_metadata


def refresh_driver_expressions(objects):
    """Refresh cached driver validity after master-control key migrations."""
    for obj in objects:
        if obj.animation_data is None:
            continue
        for curve in obj.animation_data.drivers:
            curve.driver.expression = str(curve.driver.expression)


def configure_finale_flight(scene, camera):
    """Join the upward rail to the orbit with one C1-continuous flight curve."""
    rig = bpy.data.objects.get("Finale Camera Rig")
    if rig is None or rig.animation_data is None or rig.animation_data.action is None:
        raise RuntimeError("Finale Camera Rig has no editable Action.")

    finale_frame = marker_frame(scene, "ABS_STAGE_06")
    lock_frame = marker_frame(scene, "ABS_CAMERA_LOCK")
    approach_end = round(
        finale_frame + (lock_frame - finale_frame) * FINALE_APPROACH_SHARE
    )
    if not finale_frame + 2 < approach_end < lock_frame - 2:
        raise RuntimeError("The finale flight markers leave no room for a smooth orbit.")

    camera_action = camera.animation_data.action
    replace_action_keys(
        camera_action,
        'constraints["ABS_FINALE_CAMERA_POSITION"].influence',
        0,
        ((scene.frame_start, 0.0, "CONSTANT"),
         (finale_frame - 1, 0.0, "CONSTANT"),
         (finale_frame, 1.0, "CONSTANT"),
         (scene.frame_end, 1.0, "CONSTANT")),
        group="Drone camera motion",
    )

    scene.frame_set(finale_frame - 2)
    bpy.context.view_layer.update()
    previous_position = camera.matrix_world.translation.copy()
    scene.frame_set(finale_frame - 1)
    bpy.context.view_layer.update()
    rail_position = camera.matrix_world.translation.copy()
    incoming_velocity = rail_position - previous_position
    approach_start = bpy.data.objects.get("Finale Approach Start")
    finale_position = bpy.data.objects.get("Finale Position")
    if approach_start is None or finale_position is None:
        raise RuntimeError("The finale continuity anchors are missing.")
    predicted_position = rail_position + incoming_velocity
    approach_constraint = approach_start.constraints.get("ABS_FINALE_APPROACH_RAIL")
    if approach_constraint is not None:
        remove_driver(
            approach_start,
            'constraints["ABS_FINALE_APPROACH_RAIL"].offset_factor',
        )
        approach_constraint.influence = 0.0
    approach_start.location = predicted_position
    finale_position.location.z = predicted_position.z + FINALE_TARGET_RISE_WU
    bpy.context.view_layer.update()

    approach_frames = approach_end - finale_frame
    incoming_tangent = incoming_velocity * approach_frames
    h00 = "(2*p*p*p-3*p*p+1)"
    h10 = "(p*p*p-2*p*p+p)"
    h01 = "(-2*p*p*p+3*p*p)"
    eased_orbit = "(q*q*(3.0-2.0*q))"
    theta = f"(({FINALE_ORBIT_PHASE_DEGREES:.1f}+arc*{eased_orbit})*pi/180.0)"
    expressions = (
        f"{h00}*sx+{h10}*({incoming_tangent.x:.12g})+"
        f"{h01}*(cx+r*{eased_orbit}*sin({theta}))",
        f"{h00}*sy+{h10}*({incoming_tangent.y:.12g})+"
        f"{h01}*(cy-r*{eased_orbit}*cos({theta}))",
        f"{h00}*sz+{h10}*({incoming_tangent.z:.12g})+"
        f"{h01}*(cz+{FINALE_APPROACH_HEIGHT_WU:.1f}+"
        f"{FINALE_SCALE_LIFT_WU:.1f}*(s-1.0)+"
        f"{FINALE_ORBIT_RISE_WU:.1f}*{eased_orbit})",
    )
    for index, expression in enumerate(expressions):
        curve = rig.animation_data.drivers.find("location", index=index)
        if curve is None:
            raise RuntimeError(f"Finale Camera Rig is missing location driver {index}.")
        curve.driver.expression = expression
        if not curve.driver.is_valid:
            raise RuntimeError(f"Finale Camera Rig location driver {index} is invalid.")

    action = rig.animation_data.action
    replace_action_keys(
        action,
        '["approach_progress"]',
        0,
        ((finale_frame, 0.0, "LINEAR"),
         (approach_end, 1.0, "CONSTANT"),
         (scene.frame_end, 1.0, "CONSTANT")),
        group="Drone camera motion",
    )
    replace_action_keys(
        action,
        '["orbit_progress"]',
        0,
        ((scene.frame_start, 0.0, "CONSTANT"),
         (finale_frame, 0.0, "LINEAR"),
         (lock_frame, 1.0, "CONSTANT"),
         (scene.frame_end, 1.0, "CONSTANT")),
        group="Drone camera motion",
    )
    return approach_end, incoming_tangent


def stable_rail_orientations(scene, camera, look_ahead, roll, frame_end):
    """Build a continuous camera frame through the rail's vertical turn."""
    original_frame = scene.frame_current
    world_up = Vector((0.0, 0.0, 1.0))
    previous_right = None
    previous_quaternion = None
    samples = []
    for frame in range(int(scene.frame_start), int(frame_end) + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        position = camera.matrix_world.translation
        forward = look_ahead.matrix_world.translation - position
        if forward.length_squared <= 1e-10:
            raise RuntimeError(f"The drone look-ahead collapses at frame {frame}.")
        forward.normalize()
        if previous_right is None:
            right = forward.cross(world_up)
            if right.length_squared <= 1e-10:
                right = forward.cross(Vector((0.0, 1.0, 0.0)))
        else:
            right = previous_right - forward * previous_right.dot(forward)
            if right.length_squared <= 1e-10:
                right = forward.cross(world_up)
        right.normalize()
        transported_right = right.copy()
        bank = float(roll.rotation_euler.z)
        right = Quaternion(forward, -bank) @ right
        right.normalize()
        up = right.cross(forward).normalized()
        matrix = Matrix((
            (right.x, up.x, -forward.x),
            (right.y, up.y, -forward.y),
            (right.z, up.z, -forward.z),
        ))
        quaternion = matrix.to_quaternion().normalized()
        if previous_quaternion is not None and previous_quaternion.dot(quaternion) < 0.0:
            quaternion.negate()
        if previous_quaternion is not None:
            angular_step = previous_quaternion.rotation_difference(quaternion).angle
            maximum_step = math.radians(MAX_RAIL_ANGULAR_STEP_DEGREES)
            interpolation = min(0.2, maximum_step / max(angular_step, 1e-10))
            if interpolation < 1.0:
                quaternion = previous_quaternion.slerp(
                    quaternion, interpolation,
                ).normalized()
        samples.append((frame, quaternion.copy()))
        previous_right = transported_right
        previous_quaternion = quaternion
    scene.frame_set(original_frame)
    bpy.context.view_layer.update()
    return samples


def stable_finale_orientations(
        scene, camera, focus, rail_orientations, transition_start, finale_frame,
        frame_end):
    """Level through the last gates, then turn into the product shot."""
    original_frame = scene.frame_current
    rail_by_frame = dict(rail_orientations)
    start_frame = int(transition_start)
    start_quaternion = rail_by_frame[start_frame].copy()
    handoff_quaternion = rail_by_frame[int(finale_frame)].copy()
    lock_frame = int(frame_end)
    world_up = Vector((0.0, 0.0, 1.0))

    # Resolve the final composition once. Recomputing the desired look frame on
    # every sample can change quaternion hemispheres as the camera passes below
    # the focus, which presents as a violent roll even when positions are smooth.
    scene.frame_set(lock_frame)
    bpy.context.view_layer.update()
    final_forward = focus.matrix_world.translation - camera.matrix_world.translation
    if final_forward.length_squared <= 1e-10:
        raise RuntimeError("The finale aim collapses at the camera lock frame.")
    final_forward.normalize()
    final_right = final_forward.cross(world_up)
    if final_right.length_squared <= 1e-10:
        final_right = start_quaternion @ Vector((1.0, 0.0, 0.0))
        final_right -= final_forward * final_right.dot(final_forward)
    final_right.normalize()
    final_up = final_right.cross(final_forward).normalized()
    final_quaternion = Matrix((
        (final_right.x, final_up.x, -final_forward.x),
        (final_right.y, final_up.y, -final_forward.y),
        (final_right.z, final_up.z, -final_forward.z),
    )).to_quaternion().normalized()
    if start_quaternion.dot(final_quaternion) < 0.0:
        final_quaternion.negate()

    # Parallel-transport the level final frame back to the rail direction at
    # the tunnel exit. The horizon starts settling as the terrain clears, then
    # completes through the widening gates while the lens looks straight on.
    handoff_forward = handoff_quaternion @ Vector((0.0, 0.0, -1.0))
    transport = final_forward.rotation_difference(handoff_forward)
    handoff_right = (transport @ final_right).normalized()
    handoff_up = (transport @ final_up).normalized()
    handoff_level_quaternion = Matrix((
        (handoff_right.x, handoff_up.x, -handoff_forward.x),
        (handoff_right.y, handoff_up.y, -handoff_forward.y),
        (handoff_right.z, handoff_up.z, -handoff_forward.z),
    )).to_quaternion().normalized()
    if start_quaternion.dot(handoff_level_quaternion) < 0.0:
        handoff_level_quaternion.negate()

    target_right_by_frame = {int(finale_frame): handoff_right.copy()}
    transported_right = handoff_right.copy()
    previous_forward = handoff_forward.copy()
    for frame in range(int(finale_frame) - 1, start_frame, -1):
        rail_forward = rail_by_frame[frame] @ Vector((0.0, 0.0, -1.0))
        step_transport = previous_forward.rotation_difference(rail_forward)
        transported_right = step_transport @ transported_right
        transported_right -= rail_forward * transported_right.dot(rail_forward)
        transported_right.normalize()
        target_right_by_frame[frame] = transported_right.copy()
        previous_forward = rail_forward

    samples = []
    level_span = max(1, int(finale_frame) - start_frame)
    previous_roll_delta = None
    previous_quaternion = start_quaternion.copy()
    for frame in range(start_frame + 1, int(finale_frame) + 1):
        progress = (frame - start_frame) / level_span
        blend = progress * progress * (3.0 - 2.0 * progress)
        rail_quaternion = rail_by_frame[frame].copy()
        rail_forward = rail_quaternion @ Vector((0.0, 0.0, -1.0))
        rail_right = rail_quaternion @ Vector((1.0, 0.0, 0.0))
        target_right = target_right_by_frame[frame]
        roll_delta = math.atan2(
            rail_forward.dot(rail_right.cross(target_right)),
            rail_right.dot(target_right),
        )
        if previous_roll_delta is not None:
            while roll_delta - previous_roll_delta > math.pi:
                roll_delta -= 2.0 * math.pi
            while roll_delta - previous_roll_delta < -math.pi:
                roll_delta += 2.0 * math.pi
        previous_roll_delta = roll_delta
        frame_right = (
            Quaternion(rail_forward, roll_delta * blend) @ rail_right
        ).normalized()
        frame_up = frame_right.cross(rail_forward).normalized()
        quaternion = Matrix((
            (frame_right.x, frame_up.x, -rail_forward.x),
            (frame_right.y, frame_up.y, -rail_forward.y),
            (frame_right.z, frame_up.z, -rail_forward.z),
        )).to_quaternion().normalized()
        if previous_quaternion.dot(quaternion) < 0.0:
            quaternion.negate()
        samples.append((frame, quaternion.copy()))
        previous_quaternion = quaternion

    if previous_quaternion.dot(handoff_level_quaternion) < 0.0:
        handoff_level_quaternion.negate()
    if handoff_level_quaternion.dot(final_quaternion) < 0.0:
        final_quaternion.negate()

    # A trapezoidal ease spends most of the short reveal at a calm constant
    # speed, with long enough ramps to keep acceleration and jerk imperceptible.
    turn_span = max(1, lock_frame - int(finale_frame))
    ramp_frames = min(12.0, turn_span * 0.25)
    turn_angle = handoff_level_quaternion.rotation_difference(final_quaternion).angle
    incoming_angle = samples[-2][1].rotation_difference(samples[-1][1]).angle
    initial_speed = min(
        incoming_angle / max(turn_angle, 1e-10),
        0.5 / max(1.0, turn_span - ramp_frames),
    )
    maximum_speed = (
        1.0 - 0.5 * initial_speed * ramp_frames
    ) / max(1.0, turn_span - ramp_frames)
    first_ramp_area = 0.5 * (initial_speed + maximum_speed) * ramp_frames
    for frame in range(int(finale_frame) + 1, lock_frame + 1):
        elapsed = frame - int(finale_frame)
        if elapsed < ramp_frames:
            blend = (
                initial_speed * elapsed
                + 0.5 * (maximum_speed - initial_speed)
                * elapsed * elapsed / ramp_frames
            )
        elif elapsed <= turn_span - ramp_frames:
            blend = first_ramp_area + maximum_speed * (elapsed - ramp_frames)
        else:
            remaining = turn_span - elapsed
            blend = 1.0 - 0.5 * maximum_speed * remaining * remaining / ramp_frames
        quaternion = handoff_level_quaternion.slerp(
            final_quaternion, blend,
        ).normalized()
        if previous_quaternion.dot(quaternion) < 0.0:
            quaternion.negate()
        samples.append((frame, quaternion.copy()))
        previous_quaternion = quaternion
    scene.frame_set(original_frame)
    bpy.context.view_layer.update()
    return samples


def configure_camera(scene, path, camera, look_ahead, roll, focus, action, approach_end):
    rail = camera.constraints.get("ABS_CAMERA_RAIL")
    orientation = camera.constraints.get("ABS_TUNNEL_CAMERA_ORIENTATION")
    if rail is None or orientation is None:
        raise RuntimeError("Scene Camera is missing its rail or orientation constraint.")
    rail.use_curve_follow = False
    orientation.target = roll
    orientation.influence = 1.0
    camera.location = (0.0, 0.0, 0.0)
    camera.rotation_mode = "QUATERNION"
    camera.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)

    remove_action_curves(action, {
        "location",
        "rotation_quaternion",
        'constraints["ABS_CAMERA_RAIL"].use_curve_follow',
        'constraints["ABS_TUNNEL_CAMERA_ORIENTATION"].influence',
    })

    finale_frame = marker_frame(scene, "ABS_STAGE_06")
    gate_transition_frame = marker_frame(scene, "ABS_CANYON_CLEAR")
    # Begin the final look adjustment just before the spatial handoff so the
    # eye-level settle does not create a perceptible rotation step.
    orientation_turn_frame = finale_frame - 10
    rail_orientations = stable_rail_orientations(
        scene, camera, look_ahead, roll, finale_frame,
    )
    orientations = [
        sample for sample in rail_orientations
        if sample[0] <= gate_transition_frame
    ]
    orientations.extend(stable_finale_orientations(
        scene,
        camera,
        focus,
        rail_orientations,
        gate_transition_frame,
        orientation_turn_frame,
        marker_frame(scene, "ABS_CAMERA_LOCK"),
    ))
    held_orientation = orientations[-1][1]
    for index in range(4):
        replace_action_keys(
            action,
            "rotation_quaternion",
            index,
            tuple((frame, quaternion[index], "LINEAR") for frame, quaternion in orientations)
            + ((scene.frame_end, held_orientation[index], "LINEAR"),),
        )
    camera.rotation_quaternion = held_orientation

    replace_action_keys(
        action,
        'constraints["ABS_TUNNEL_CAMERA_ORIENTATION"].influence',
        0,
        ((scene.frame_start, 0.0, "CONSTANT"),
         (scene.frame_end, 0.0, "CONSTANT")),
    )

    aim_start = finale_frame
    aim_end = marker_frame(scene, "ABS_CAMERA_LOCK")
    replace_action_keys(
        action,
        'constraints["ABS_FINALE_BUST_AIM"].influence',
        0,
        ((scene.frame_start, 0.0, "CONSTANT"),
         (scene.frame_end, 0.0, "CONSTANT")),
    )
    return held_orientation, finale_frame, aim_start, aim_end


def update_guide():
    guide = bpy.data.texts.get("README - About Scene")
    if guide is None:
        return
    marker = "CAMERA MOTION\n"
    body = guide.as_string()
    if marker in body:
        body = body.split(marker, 1)[0].rstrip() + "\n\n"
    body += marker + (
        "Scene Camera stays on Camera Path and aims eight percent farther along the\n"
        "same rail. This produces smooth drone-like steering. Square-gate banking\n"
        "eases in and out. A continuous cubic flight joins the upward rail to the\n"
        "final orbit at ABS_STAGE_06 without a direction snap. The camera eases beneath\n"
        "the platform, then rises around its rim to the frontal terminal view while\n"
        "aiming through the bust. The platform shares the bust's terminal visibility\n"
        "end so it remains a visible base. Re-run smooth-camera-drone-motion.py after\n"
        "changing the Camera Path handles.\n"
    )
    guide.clear()
    guide.write(body)


def update_physical_stage_ranges(scene, camera):
    """Store the camera-distance ranges resolved from the equal-time markers."""
    original_frame = scene.frame_current
    start_frame = int(scene.frame_start)
    lock_frame = marker_frame(scene, "ABS_CAMERA_LOCK")
    positions = []
    for frame in range(start_frame, lock_frame + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        positions.append(camera.matrix_world.translation.copy())
    cumulative = [0.0]
    for left, right in zip(positions, positions[1:]):
        cumulative.append(cumulative[-1] + (right - left).length)
    total = cumulative[-1]
    if not math.isfinite(total) or total <= 0.0:
        raise RuntimeError("The camera has no measurable journey before its lock frame.")
    boundaries = [
        cumulative[marker_frame(scene, f"ABS_STAGE_{index:02d}") - start_frame] / total
        for index in range(7)
    ]
    boundaries.append(1.0)
    metadata = plain_value(scene.get(INTERNAL_KEY, {}))
    metadata["abs_narrative_stage_ranges"] = json.dumps({
        f"about.{index:02d}": [
            round(boundaries[index], 9),
            round(boundaries[index + 1], 9),
        ]
        for index in range(7)
    }, separators=(",", ":"))
    metadata["abs_stage_spans_wu"] = json.dumps({
        f"about.{index:02d}": [
            round(total * boundaries[index], 6),
            round(total * boundaries[index + 1], 6),
        ]
        for index in range(7)
    }, separators=(",", ":"))
    metadata["abs_camera_distance_stage_fractions"] = json.dumps(
        [round(value, 9) for value in boundaries], separators=(",", ":")
    )
    metadata["abs_camera_distance_to_lock_wu"] = round(total, 6)
    scene[INTERNAL_KEY] = metadata
    scene.frame_set(original_frame)
    bpy.context.view_layer.update()
    return boundaries, total


def main():
    scene = bpy.context.scene
    objects = {
        name: bpy.data.objects.get(name)
        for name in (
            PATH_NAME, CAMERA_NAME, LOOK_AHEAD_NAME, AIM_NAME, ROLL_NAME,
            BUST_FOCUS_NAME, FINALE_BUST_NAME, FINALE_PLATFORM_NAME,
            CONTROLS_NAME,
        )
    }
    missing = [name for name, obj in objects.items() if obj is None]
    if missing:
        raise RuntimeError(f"Missing camera objects: {', '.join(missing)}")
    path = objects[PATH_NAME]
    camera = objects[CAMERA_NAME]
    look_ahead = objects[LOOK_AHEAD_NAME]
    aim = objects[AIM_NAME]
    roll = objects[ROLL_NAME]
    bust_focus = objects[BUST_FOCUS_NAME]
    finale_bust = objects[FINALE_BUST_NAME]
    finale_platform = objects[FINALE_PLATFORM_NAME]
    controls = objects[CONTROLS_NAME]
    if path.type != "CURVE" or len(path.data.splines) != 1:
        raise RuntimeError("Camera Path must remain one curve spline.")
    if camera.animation_data is None or camera.animation_data.action is None:
        raise RuntimeError("Scene Camera has no editable Action.")

    smooth_transition_handles(path)
    build_look_ahead_rig(path, camera, look_ahead, aim, roll)
    configure_gate_bank(roll, controls)
    configure_finale_focus(bust_focus, controls)
    configure_finale_platform_visibility(finale_platform, finale_bust)
    refresh_driver_expressions((bust_focus, finale_bust, finale_platform))
    controls["33 Bust Scale"] = FINALE_BUST_SCALE
    controls["34 Orbit Amount"] = FINALE_ORBIT_DEGREES
    controls["35 Orbit Radius"] = FINALE_ORBIT_RADIUS_WU
    controls.update_tag(refresh={"OBJECT"})
    scene.frame_set(scene.frame_current + 1)
    scene.frame_set(scene.frame_current - 1)
    bpy.context.view_layer.update()

    approach_end, incoming_tangent = configure_finale_flight(scene, camera)

    held, finale_frame, aim_start, aim_end = configure_camera(
        scene, path, camera, look_ahead, roll, bust_focus,
        camera.animation_data.action, approach_end,
    )
    camera["abs_camera_smoothing_contract"] = CONTRACT
    camera["abs_camera_smoothing_notes"] = (
        "Live look-ahead steering, gentle gate bank, an orbit around the platform, and an eye-level terminal bust view."
    )
    set_internal_value(scene, "abs_camera_smoothing_contract", CONTRACT)
    set_internal_value(
        scene,
        "abs_camera_smoothing_script",
        "scripts/about-v2-blender/smooth-camera-drone-motion.py",
    )
    stage_fractions, camera_distance = update_physical_stage_ranges(scene, camera)
    update_guide()
    scene.frame_set(scene.frame_start - 1)
    bpy.context.view_layer.update()

    print(json.dumps({
        "status": "ok",
        "saved": False,
        "contract": CONTRACT,
        "pathPoints": len(path.data.splines[0].bezier_points),
        "lookAheadFraction": LOOK_AHEAD_FRACTION,
        "gateTwistTurns": float(controls["32 Twist"]),
        "finaleBustScale": float(controls["33 Bust Scale"]),
        "finaleOrbitDegrees": float(controls["34 Orbit Amount"]),
        "finaleFocusHeightWU": round(float(bust_focus.location.z), 6),
        "finaleFrame": finale_frame,
        "finaleApproachEndFrame": approach_end,
        "finaleAimStartFrame": aim_start,
        "finaleAimEndFrame": aim_end,
        "incomingFinaleTangent": [round(value, 8) for value in incoming_tangent],
        "heldQuaternion": [round(value, 8) for value in held],
        "cameraDistanceToLockWU": round(camera_distance, 6),
        "cameraDistanceStageFractions": [round(value, 9) for value in stage_fractions],
    }, sort_keys=True))


if __name__ == "__main__":
    main()
