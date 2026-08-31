#!/usr/bin/env python3
"""Repair gate framing on the saved About rail without rebuilding any geometry.

Run in Blender against the saved scene, write a candidate, then reopen that saved
candidate in a separate Blender process for export and browser verification.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bpy


REPO_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_BLEND = (
    REPO_ROOT / "source-assets/about-v2-blender-current/about-v2-track-working.blend"
).resolve()
AIM_NAME = "ABS_CAMERA_GATE_AIM"
CONSTRAINT_NAME = "ABS_CAMERA_GATE_AIM_BLEND"
BLEND_PROFILE = ((0.60, 0.0), (0.632, 1.0), (0.81, 1.0), (0.842, 0.0))


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--overwrite-output", action="store_true")
    parser.add_argument("--allow-canonical-output", action="store_true")
    return parser.parse_args(argv)


def require_object(name, kind):
    obj = bpy.data.objects.get(name)
    if obj is None or obj.type != kind:
        raise RuntimeError(f"Expected {kind} {name} in the saved About scene.")
    return obj


def modifier_input_path(obj, input_name):
    modifier = obj.modifiers.get("ABS_PARAMETRIC_EFFECT")
    if modifier is None or modifier.type != "NODES" or modifier.node_group is None:
        raise RuntimeError(f"{obj.name} has no parametric modifier.")
    socket = next((item for item in modifier.node_group.interface.items_tree
                   if item.item_type == "SOCKET" and item.in_out == "INPUT"
                   and item.name == input_name), None)
    if socket is None:
        raise RuntimeError(f"Missing {obj.name} input: {input_name}.")
    return f'{modifier.path_from_id()}["{socket.identifier}"]'


def main():
    args = parse_args()
    output = Path(args.output_blend).expanduser().resolve()
    if output.suffix.lower() != ".blend":
        raise RuntimeError("The output must be a .blend file.")
    if output == CANONICAL_BLEND and not args.allow_canonical_output:
        raise RuntimeError("Write and verify a candidate before allowing canonical output.")
    if output.exists() and not args.overwrite_output:
        raise RuntimeError(f"Refusing to overwrite {output} without --overwrite-output.")
    scene = bpy.context.scene
    path = require_object("ABS_PARAMETRIC_RIDE_PATH", "CURVE")
    follower = require_object("ABS_CAMERA_PATH_FOLLOWER", "EMPTY")
    roll = require_object("ABS_CAMERA_ROLL_DRIVER", "EMPTY")
    controls = require_object("ABS_SQUARE_ROLLERCOASTER_CONTROLS", "EMPTY")
    gate = require_object("GN_SQUARE_LOOP", "MESH")
    camera = require_object("ABS_CAMERA", "CAMERA")
    if camera.parent != roll or roll.parent != follower or scene.camera != camera:
        raise RuntimeError("Unexpected camera hierarchy; no transforms were changed.")
    start_path = modifier_input_path(gate, "Start on Path (0-1)")
    end_path = modifier_input_path(gate, "End on Path (0-1)")
    aim = bpy.data.objects.get(AIM_NAME)
    existing_constraint = follower.constraints.get(CONSTRAINT_NAME)
    if aim is not None and aim.get("abs_gate_camera_schema") != 1:
        raise RuntimeError(f"{AIM_NAME} already exists and is not owned by this rig.")
    if existing_constraint is not None and (
        existing_constraint.type != "TRACK_TO" or existing_constraint.target != aim
    ):
        raise RuntimeError(f"{CONSTRAINT_NAME} is owned by another rig.")

    controls["Camera Lead Gates"] = 1.0 / 3.0
    controls.id_properties_ui("Camera Lead Gates").update(
        min=0.1, max=0.5,
        description="Aim lead as a fraction of one gate spacing; keep the next opening in view.",
    )
    if aim is None:
        aim = bpy.data.objects.new(AIM_NAME, None)
        follower.users_collection[0].objects.link(aim)
    aim.empty_display_type = "ARROWS"
    aim.empty_display_size = 2.0
    aim.location = (0.0, 0.0, 0.0)
    aim.rotation_euler = (0.0, math.pi / 2.0, 0.0)
    aim["abs_export"] = False
    aim["abs_gate_camera_schema"] = 1
    aim["abs_note"] = (
        "Same master rail, position only. Its constant world-X reference supplies "
        "camera right through the aerial loop, avoiding the world-up pole. "
        "The roll child still owns authored bank; no camera lag or second path."
    )
    follow = aim.constraints.get("ABS_GATE_AIM_RAIL_FOLLOW")
    if follow is None:
        follow = aim.constraints.new("FOLLOW_PATH")
        follow.name = "ABS_GATE_AIM_RAIL_FOLLOW"
    follow.target = path
    follow.use_fixed_location = True
    follow.use_curve_follow = False
    follow.driver_remove("offset_factor")
    driver = follow.driver_add("offset_factor").driver
    driver.type = "SCRIPTED"
    for name, obj, data_path in (
        ("progress", roll, '["abs_path_progress"]'),
        ("start", gate, start_path), ("end", gate, end_path),
        ("count", controls, '["Gate Count"]'),
        ("lead", controls, '["Camera Lead Gates"]'),
    ):
        variable = driver.variables.new()
        variable.name = name
        variable.type = "SINGLE_PROP"
        variable.targets[0].id = obj
        variable.targets[0].data_path = data_path
    # Gate-relative lead remains live when the rail, gate spacing or count changes.
    driver.expression = "min(progress + (end - start) * lead / max(count - 1, 1), 1.0)"

    track = existing_constraint or follower.constraints.new("TRACK_TO")
    track.name = CONSTRAINT_NAME
    track.target = aim
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_X"
    track.use_target_z = True
    # This override must follow the existing world-up and finale aim constraints.
    follower.constraints.move(list(follower.constraints).index(track), len(follower.constraints) - 1)
    action = follower.animation_data.action if follower.animation_data else None
    if action is not None:
        for curve in list(action.fcurves):
            if curve.data_path == track.path_from_id("influence"):
                action.fcurves.remove(curve)
    duration = scene.frame_end - scene.frame_start
    profile = [(scene.frame_start, 0.0)] + [
        (round(scene.frame_start + progress * duration), influence)
        for progress, influence in BLEND_PROFILE
    ] + [(scene.frame_end, 0.0)]
    for frame, influence in profile:
        track.influence = influence
        track.keyframe_insert("influence", frame=frame, group="Gate framing")
    for curve in follower.animation_data.action.fcurves:
        if curve.data_path == track.path_from_id("influence"):
            for key in curve.keyframe_points:
                key.interpolation = "BEZIER"
                key.handle_left_type = "AUTO_CLAMPED"
                key.handle_right_type = "AUTO_CLAMPED"
    aim["abs_blend_profile"] = json.dumps(profile)
    controls["abs_note"] = (
        "Fourteen gates share the master rail. Camera Lead Gates sets the close aim; "
        "a continuous world-X camera-right reference avoids the vertical world-up flip. "
        "The original roll keys remain on ABS_CAMERA_ROLL_DRIVER. "
        "The original finale aim is fully restored at timeline progress 0.842."
    )
    readme = bpy.data.texts.get("ABOUT_PARAMETRIC_WORLD_README")
    if readme is not None:
        marker = "\n\nGATE CAMERA FRAMING (31 August 2026)\n"
        original_text = readme.as_string().split(marker)[0]
        readme.clear()
        readme.write(original_text + marker + (
            "ABS_CAMERA_GATE_AIM follows the same rail one third of a gate spacing ahead. "
            "Its world-X reference carries camera right continuously through the aerial loop, "
            "instead of forcing a world-up flip at the vertical tangent. "
            "The gate aim blends in at timeline 0.60-0.632 and out at 0.81-0.842. "
            "Camera position, path handles, gate geometry, nine roll keys and 65-degree FOV are unchanged. "
            "The gate bank appears earlier so its first opening is complete before entry. "
            "Website camera distance follows native scroll directly, including reversal and stops. "
            "Reopen the saved scene for export, then run the gate-aperture and browser checks.\n"
        ))

    # Admit the bank before its first opening, rather than growing that opening
    # into view while the camera is already entering it. Geometry is untouched.
    previous_offset = float(gate["abs_visibility_start_offset_wu"])
    gate["abs_visibility_start_offset_wu"] = -0.55
    gate["abs_visibility_start_wu"] = max(
        0.0, float(gate["abs_visibility_start_wu"]) - 0.55 - previous_offset,
    )
    gate["abs_alignment_policy"] = "same-rail-centred-openings-continuous-right-axis"
    scene.frame_set(scene.frame_start)
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    print(json.dumps({
        "saved": str(output), "gateAim": aim.name, "blendFrames": profile,
        "geometryRebuilt": False, "railReshaped": False,
        "next": "Reopen this saved file in a fresh Blender process, export, then verify all gates.",
    }))


if __name__ == "__main__":
    main()
