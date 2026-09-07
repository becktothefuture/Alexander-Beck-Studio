#!/usr/bin/env python3
"""Author the About text/scene score on an open Blender scene.

The operation is deterministic and idempotent. It stores the pre-score camera
rail and finale position in scene metadata, always rebuilds from that baseline,
and never saves or exports the file.
"""

import json
import runpy
from pathlib import Path

import bpy
from mathutils import Vector


INTERNAL_KEY = "Internal Export Data"
CONTRACT = "text-scene-symphony/v1"
PATH_FORWARD_OFFSETS = (0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 350.0, 500.0, 700.0, 700.0)
STAGE_FRAMES = (1, 70, 310, 420, 620, 725, 835)
STAGE_RAIL_PROGRESS = (0.0, 0.03, 0.455, 0.54, 0.73, 0.84, 0.91)
CAMERA_LOCK_FRAME = 901
TERMINAL_FRAME = 1001
FINALE_LATERAL_OFFSET_WU = 0.0

MARKERS = {
    "ABS_STAGE_00": 1,
    "ABS_STAGE_01": 70,
    "ABS_STAGE_02": 310,
    "ABS_ROUND_BANK_START": 314,
    "ABS_ROUND_BANK_LEFT": 334,
    "ABS_ROUND_BANK_RIGHT": 362,
    "ABS_ROUND_BANK_END": 395,
    "ABS_STAGE_03": 420,
    "ABS_ROUND_PORTALS_EXIT": 420,
    "ABS_ROUND_PORTALS_CLEAR": 420,
    "ABS_PERSONAL_ORIGIN": 420,
    "ABS_TERRAIN_THESIS": 486,
    "ABS_CANYON_CLEAR": 600,
    "ABS_STAGE_04": 620,
    "ABS_ROLL_GATE_START": 620,
    "ABS_GATE_BANK_LEFT": 648,
    "ABS_GATE_BANK_RIGHT": 678,
    "ABS_GATE_BANK_SETTLE": 708,
    "ABS_STAGE_05": 725,
    "ABS_METHOD_RELEASE": 760,
    "ABS_LATTICE_APPROACH": 780,
    "ABS_ROLL_GATE_END": 835,
    "ABS_GATE_PASSAGE_CLEAR": 835,
    "ABS_SPLIT_LATTICE_ENTRY": 835,
    "ABS_STAGE_06": 835,
    "ABS_FINALE_DECEL": 855,
    "ABS_INVITATION": 882,
    "ABS_CAMERA_LOCK": CAMERA_LOCK_FRAME,
    "ABS_TERMINAL_FRAME": TERMINAL_FRAME,
}

CONTROL_VALUES = {
    "05 Opening Start (%)": 1.66,
    "06 Opening End (%)": 43.0,
    "08 Bodies Start (%)": 92.0,
    "09 Bodies End (%)": 99.0,
    "10 Body Size": 0.72,
    "16 Start (%)": 45.5,
    "17 End (%)": 54.0,
    "18 Ring Count": 10,
    "19 Opening Radius": 60.0,
    "22 Landscape Start (%)": 56.0,
    "23 Landscape End (%)": 72.5,
    "26 Start (%)": 73.0,
    "27 End (%)": 90.0,
    "28 Gate Count": 26,
    "29 Opening Size": 110.0,
    "35 Orbit Radius": 150.0,
    "37 Gate Growth": 3.2,
}

TECHNICAL_CONTROL_VALUES = {
    "opening_start_progress": 0.0166,
    "opening_end_progress": 0.43,
    "forms_start_progress": 0.92,
    "forms_end_progress": 0.99,
    "forms_body_scale": 0.72,
    "round_tunnel_start_progress": 0.455,
    "round_tunnel_end_progress": 0.54,
    "round_tunnel_ring_count": 10.0,
    "round_tunnel_aperture_radius_wu": 60.0,
    "round_tunnel_density_scale": 0.5,
    "round_tunnel_point_scale": 0.75,
    "terrain_start_progress": 0.56,
    "terrain_end_progress": 0.725,
    "square_gate_start_progress": 0.73,
    "square_gate_end_progress": 0.90,
    "square_gate_count": 26.0,
    "square_gate_half_width_wu": 55.0,
    "square_gate_half_height_wu": 55.0,
    "square_gate_density_scale": 0.65,
    "square_gate_point_scale": 0.85,
    "square_gate_aperture_growth": 3.2,
}

VISIBILITY = {
    "about.00": ("opening", 0.0, 0.0, "portal-entry", 0.3, 10.3),
    "about.01": ("inciting-question", -0.3, 0.7, "portal-entry", 0.3, 10.3),
    "about.02": ("portal-entry", -0.9, 9.1, "personal-origin", 0.3, 15.3),
    "about.03": ("personal-origin", -0.3, 14.7, "gate-entry", 0.3, 20.3),
    "about.04": ("gate-entry", -0.3, 19.7, "split-lattice-entry", 0.3, 30.3),
    "about.05": ("method", -0.3, 26.7, "terminal-hold", 0.9, 35.9),
    "about.06": ("method", -0.3, 26.7, "terminal-hold", 0.3, 35.3),
}


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


def internal_data(owner):
    return plain_value(owner.get(INTERNAL_KEY, {}))


def set_internal_value(owner, key, value):
    metadata = internal_data(owner)
    metadata[key] = plain_value(value)
    owner[INTERNAL_KEY] = metadata


def require_object(name, object_type=None):
    obj = bpy.data.objects.get(name)
    if obj is None or (object_type is not None and obj.type != object_type):
        raise RuntimeError(f"Missing required {object_type or 'scene'} object: {name}.")
    return obj


def path_snapshot(path):
    return [{
        "co": list(point.co),
        "handleLeft": list(point.handle_left),
        "handleRight": list(point.handle_right),
    } for point in path.data.splines[0].bezier_points]


def restore_and_lengthen_path(scene, path):
    metadata = internal_data(scene)
    raw = metadata.get("abs_text_scene_symphony_base_path")
    if raw is None:
        baseline = path_snapshot(path)
        set_internal_value(scene, "abs_text_scene_symphony_base_path", json.dumps(baseline, separators=(",", ":")))
    else:
        baseline = json.loads(str(raw))
    points = path.data.splines[0].bezier_points
    if len(points) != len(PATH_FORWARD_OFFSETS) or len(baseline) != len(points):
        raise RuntimeError("Text-scene score expects the current 11-point camera rail.")
    for index, (point, source, offset) in enumerate(zip(points, baseline, PATH_FORWARD_OFFSETS)):
        point.co = source["co"]
        point.handle_left = source["handleLeft"]
        point.handle_right = source["handleRight"]
        point.co.y += offset
        point.handle_left.y += offset
        point.handle_right.y += offset
    path.data.update_tag()
    return baseline


def move_finale_to_rail(scene, path, finale):
    metadata = internal_data(scene)
    raw = metadata.get("abs_text_scene_symphony_base_finale_location")
    if raw is None:
        baseline = list(finale.location)
        set_internal_value(scene, "abs_text_scene_symphony_base_finale_location", json.dumps(baseline))
    else:
        baseline = json.loads(str(raw))
    finale.location = baseline
    finale.location.x = baseline[0] + FINALE_LATERAL_OFFSET_WU
    finale.location.y = path.data.splines[0].bezier_points[9].co.y


def lower_terrain_for_reading(scene, terrain):
    metadata = internal_data(scene)
    raw = metadata.get("abs_text_scene_symphony_base_terrain_location")
    if raw is None:
        baseline = list(terrain.location)
        set_internal_value(
            scene,
            "abs_text_scene_symphony_base_terrain_location",
            json.dumps(baseline),
        )
    else:
        baseline = json.loads(str(raw))
    terrain.location = baseline
    terrain.location.z -= 72.0


def apply_controls(controls):
    for key, value in CONTROL_VALUES.items():
        controls[key] = value
    for key, value in TECHNICAL_CONTROL_VALUES.items():
        controls[key] = value
    # Preserve the accepted close bust framing.
    controls["33 Bust Scale"] = 0.84
    controls["34 Orbit Amount"] = 96.0
    controls.update_tag(refresh={"OBJECT"})


def update_markers(scene):
    existing = {marker.name: marker for marker in scene.timeline_markers}
    for name, frame in MARKERS.items():
        marker = existing.get(name) or scene.timeline_markers.new(name=name, frame=frame)
        marker.frame = frame
    scene.frame_start = 1
    scene.frame_end = TERMINAL_FRAME


def replace_fcurve_keys(curve, keys):
    while curve.keyframe_points:
        curve.keyframe_points.remove(curve.keyframe_points[0])
    for frame, value in keys:
        point = curve.keyframe_points.insert(frame, value, options={"FAST"})
        point.interpolation = "LINEAR"
        point.handle_left_type = "VECTOR"
        point.handle_right_type = "VECTOR"
    curve.update()


def retime_camera_rail(camera):
    if camera.animation_data is None or camera.animation_data.action is None:
        raise RuntimeError("Scene Camera has no editable Action.")
    curve = camera.animation_data.action.fcurves.find('["rail_progress"]', index=0)
    if curve is None:
        raise RuntimeError("Scene Camera has no rail_progress curve.")
    keys = list(zip(STAGE_FRAMES, STAGE_RAIL_PROGRESS))
    keys.extend(((CAMERA_LOCK_FRAME, STAGE_RAIL_PROGRESS[-1]), (TERMINAL_FRAME, STAGE_RAIL_PROGRESS[-1])))
    replace_fcurve_keys(curve, keys)
    return keys


def apply_visibility(scene):
    counts = {}
    for obj in scene.objects:
        model_id = str(obj.get("abs_model_id") or internal_data(obj).get("abs_model_id") or "")
        if obj.type != "MESH" or model_id not in VISIBILITY:
            continue
        start_cue, start_offset, start_wu, end_cue, end_offset, end_wu = VISIBILITY[model_id]
        values = {
            "abs_visibility_start_cue": start_cue,
            "abs_visibility_start_offset_wu": start_offset,
            "abs_visibility_start_wu": start_wu,
            "abs_visibility_end_cue": end_cue,
            "abs_visibility_end_offset_wu": end_offset,
            "abs_visibility_end_wu": end_wu,
            "abs_visibility_handoff_wu": 0.3,
            "abs_transition_mode": "overlap-fog-handoff",
        }
        metadata = internal_data(obj)
        metadata.update(values)
        obj[INTERNAL_KEY] = metadata
        for key, value in values.items():
            if key in obj:
                obj[key] = value
        counts[model_id] = counts.get(model_id, 0) + 1
    return counts


def calm_finale_platform(platform):
    """Keep the point-cloud plinth visually continuous at every runtime profile."""
    role_by_material_index = {
        index: str(material.get("abs_material_role") or "").strip().lower()
        for index, material in enumerate(platform.data.materials)
    }
    atmosphere_index = next(
        (index for index, role in role_by_material_index.items() if role == "atmosphere"),
        None,
    )
    steel_index = next(
        (index for index, role in role_by_material_index.items() if role == "steel"),
        None,
    )
    if atmosphere_index is None or steel_index is None:
        raise RuntimeError("Finale Platform is missing its atmosphere or steel material role.")
    # The active Steel role is white in several approved palettes and reads as
    # a hole against the page. Keep a five-colour authored mixture on this one
    # plinth so every visible side remains materially present.
    for polygon in platform.data.polygons:
        if polygon.material_index == steel_index:
            polygon.material_index = atmosphere_index
    platform.data.update()
    values = {
        "abs_point_density": 3.0,
        "abs_surfel_radius_scale": 1.6,
        "abs_palette_mode": "authored-faces",
    }
    metadata = internal_data(platform)
    metadata.pop("abs_palette_role", None)
    metadata.update(values)
    platform[INTERNAL_KEY] = metadata
    if "abs_palette_role" in platform:
        del platform["abs_palette_role"]
    for key, value in values.items():
        platform[key] = value


def configure_low_finale(scene, path, camera, controls):
    motion = runpy.run_path(str(Path(__file__).with_name("smooth-camera-drone-motion.py")))
    motion["smooth_transition_handles"](path)
    motion["configure_finale_focus"](require_object("Bust Focus"), controls)
    approach_end, tangent = motion["configure_finale_flight"](scene, camera)
    motion["configure_camera"](
        scene,
        path,
        camera,
        require_object("Tunnel Camera Path"),
        require_object("Tunnel Camera Roll"),
        require_object("Bust Focus"),
        camera.animation_data.action,
        approach_end,
    )
    fractions, distance = motion["update_physical_stage_ranges"](scene, camera)
    return approach_end, tangent, fractions, distance


def refresh(scene, objects):
    current = scene.frame_current
    adjacent = current + 1 if current < scene.frame_end else current - 1
    scene.frame_set(adjacent)
    scene.frame_set(current)
    for obj in objects:
        obj.update_tag(refresh={"OBJECT"})
    bpy.context.view_layer.update()


def main():
    scene = bpy.context.scene
    original_frame = scene.frame_current
    path = require_object("Camera Path", "CURVE")
    camera = require_object("Scene Camera", "CAMERA")
    controls = require_object("About Controls")
    finale = require_object("Finale Position")
    platform = require_object("Finale Platform", "MESH")
    bust = require_object("Finale Bust", "MESH")
    terrain = require_object("Landscape", "MESH")
    if len(path.data.splines) != 1 or path.data.splines[0].type != "BEZIER":
        raise RuntimeError("Text-scene score requires one editable Bezier camera rail.")

    restore_and_lengthen_path(scene, path)
    move_finale_to_rail(scene, path, finale)
    lower_terrain_for_reading(scene, terrain)
    calm_finale_platform(platform)
    apply_controls(controls)
    update_markers(scene)
    rail_keys = retime_camera_rail(camera)
    visibility = apply_visibility(scene)
    refresh(scene, (path, camera, controls, finale, platform, bust, terrain))
    approach_end, tangent, fractions, distance = configure_low_finale(
        scene, path, camera, controls,
    )
    stage_ranges = {
        f"about.{index:02d}": [round(fractions[index], 9), round(fractions[index + 1], 9)]
        for index in range(7)
    }
    stage_spans = {
        f"about.{index:02d}": [round(distance * fractions[index], 6), round(distance * fractions[index + 1], 6)]
        for index in range(7)
    }
    scene["abs_narrative_stage_ranges"] = json.dumps(stage_ranges, separators=(",", ":"))
    scene["abs_stage_spans_wu"] = json.dumps(stage_spans, separators=(",", ":"))
    scene["abs_camera_distance_stage_fractions"] = json.dumps(
        [round(value, 9) for value in fractions], separators=(",", ":")
    )
    scene["abs_camera_distance_to_lock_wu"] = round(distance, 6)
    set_internal_value(scene, "abs_text_scene_symphony_contract", CONTRACT)
    set_internal_value(scene, "abs_choreography", (
        "opener,opening-field-reading,round-title-tunnel,long-terrain-reading,"
        "growing-square-titles,grown-square-prose,restored-bust-finale"
    ))
    set_internal_value(scene, "abs_section_timing_owner", "text-scene-symphony-markers-and-rail")
    set_internal_value(scene, "abs_square_gate_growth_contract", "linear-1x-to-3.2x-v1")
    set_internal_value(scene, "abs_finale_composition_contract", "pre-body-halo-bust-finale-v1")
    scene.frame_set(original_frame)
    bpy.context.view_layer.update()
    print(json.dumps({
        "status": "ok",
        "saved": False,
        "contract": CONTRACT,
        "pathLengthWU": round(sum(s.calc_length() for s in path.data.splines), 6),
        "stageFrames": list(STAGE_FRAMES),
        "stageRailProgress": list(STAGE_RAIL_PROGRESS),
        "railKeys": rail_keys,
        "visibilityObjects": visibility,
        "squareGateCount": int(controls["28 Gate Count"]),
        "squareGateGrowth": float(controls["37 Gate Growth"]),
        "bustScale": float(controls["33 Bust Scale"]),
        "finaleApproachEndFrame": approach_end,
        "incomingFinaleTangent": [round(value, 6) for value in tangent],
        "cameraDistanceToLockWU": round(distance, 6),
        "physicalStageRanges": [round(value, 9) for value in fractions],
    }, sort_keys=True))


if __name__ == "__main__":
    main()
