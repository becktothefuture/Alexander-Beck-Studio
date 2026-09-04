#!/usr/bin/env python3
"""Give the seven About ecosystems equal camera-travel sections.

Run inside the canonical About Blender file after the authoring-control and
passage scripts. The script updates only existing scene controls, position
rigs, timeline cues, and hidden export metadata. It does not save the file.
"""

import json

import bpy


INTERNAL_KEY = "Internal Export Data"
SECTION_COUNT = 7
CAMERA_START_FRAME = 1
CAMERA_END_FRAME = 901
SCENE_END_FRAME = 1001
CONTRACT = "seven-equal-camera-distance-sections/v1"
OPENING_DEPTH_SCALE = 1.8
OPENING_NEAR_WORLD_Y = 174.88

OBJECT_NAMES = {
    "controls": "About Controls",
    "round": "Round Tunnel",
    "square": "Square Gates",
    "landscape": "Landscape Position",
    "horizon": "Horizon Position",
    "finale": "Finale Position",
    "path": "Camera Path",
    "opening": "Opening Field",
}

# Each object family remains editable through the small existing control set.
# These values place its authored centre or passage inside one equal seventh.
CONTROL_VALUES = {
    ("controls", "06 Bodies Start (%)"): 15.5,
    ("controls", "07 Bodies End (%)"): 28.0,
    ("round", "01 Start (%)"): 28.571429,
    ("round", "02 End (%)"): 42.857143,
    ("landscape", "Position (%)"): 50.0,
    ("square", "01 Start (%)"): 57.142857,
    ("square", "02 End (%)"): 71.428571,
    ("horizon", "Position (%)"): 78.571429,
    ("finale", "Position (%)"): 92.857143,
}

VISIBILITY_CUES = {
    "about.00": ("opening", 0.0, "inciting-question", 0.3),
    "about.01": ("inciting-question", -0.3, "portal-entry", 0.3),
    "about.02": ("portal-entry", -0.3, "personal-origin", 0.3),
    "about.03": ("personal-origin", -0.3, "gate-entry", 0.3),
    "about.04": ("gate-entry", -0.3, "method", 0.3),
    "about.05": ("method", -0.3, "split-lattice-entry", 0.3),
    "about.06": ("split-lattice-entry", -0.3, "terminal-hold", 0.3),
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


def equal_stage_ranges():
    return {
        f"{index:02d}": [round(index / SECTION_COUNT, 6), round((index + 1) / SECTION_COUNT, 6)]
        for index in range(SECTION_COUNT)
    }


def frame_at_travel_fraction(fraction):
    span = CAMERA_END_FRAME - CAMERA_START_FRAME
    return round(CAMERA_START_FRAME + (span * fraction))


def cue_frames():
    boundary = [index / SECTION_COUNT for index in range(SECTION_COUNT + 1)]
    within = lambda section, fraction: boundary[section] + (fraction / SECTION_COUNT)
    return {
        "ABS_STAGE_00": frame_at_travel_fraction(boundary[0]),
        "ABS_STAGE_01": frame_at_travel_fraction(boundary[1]),
        "ABS_STAGE_02": frame_at_travel_fraction(boundary[2]),
        "ABS_ROUND_BANK_START": frame_at_travel_fraction(within(2, 0.04)),
        "ABS_ROUND_BANK_LEFT": frame_at_travel_fraction(within(2, 0.20)),
        "ABS_ROUND_BANK_RIGHT": frame_at_travel_fraction(within(2, 0.45)),
        "ABS_ROUND_BANK_END": frame_at_travel_fraction(within(2, 0.70)),
        "ABS_ROUND_PORTALS_EXIT": frame_at_travel_fraction(boundary[3]),
        "ABS_ROUND_PORTALS_CLEAR": frame_at_travel_fraction(boundary[3]),
        "ABS_STAGE_03": frame_at_travel_fraction(boundary[3]),
        "ABS_PERSONAL_ORIGIN": frame_at_travel_fraction(boundary[3]),
        "ABS_TERRAIN_THESIS": frame_at_travel_fraction(within(3, 0.33)),
        "ABS_CANYON_CLEAR": frame_at_travel_fraction(within(3, 0.90)),
        "ABS_STAGE_04": frame_at_travel_fraction(boundary[4]),
        "ABS_ROLL_GATE_START": frame_at_travel_fraction(boundary[4]),
        "ABS_GATE_BANK_LEFT": frame_at_travel_fraction(within(4, 0.20)),
        "ABS_GATE_BANK_RIGHT": frame_at_travel_fraction(within(4, 0.45)),
        "ABS_GATE_BANK_SETTLE": frame_at_travel_fraction(within(4, 0.70)),
        "ABS_ROLL_GATE_END": frame_at_travel_fraction(boundary[5]),
        "ABS_GATE_PASSAGE_CLEAR": frame_at_travel_fraction(boundary[5]),
        "ABS_STAGE_05": frame_at_travel_fraction(boundary[5]),
        "ABS_METHOD_RELEASE": frame_at_travel_fraction(boundary[5]),
        "ABS_LATTICE_APPROACH": frame_at_travel_fraction(within(5, 0.50)),
        "ABS_STAGE_06": frame_at_travel_fraction(boundary[6]),
        "ABS_SPLIT_LATTICE_ENTRY": frame_at_travel_fraction(boundary[6]),
        "ABS_FINALE_DECEL": frame_at_travel_fraction(within(6, 0.30)),
        "ABS_INVITATION": frame_at_travel_fraction(within(6, 0.70)),
        "ABS_CAMERA_LOCK": CAMERA_END_FRAME,
        "ABS_TERMINAL_FRAME": SCENE_END_FRAME,
    }


def set_control_values(objects):
    changed = {}
    for (object_key, property_name), value in CONTROL_VALUES.items():
        owner = objects[object_key]
        if property_name not in owner:
            raise RuntimeError(f"Missing existing control {owner.name} / {property_name}.")
        previous = float(owner[property_name])
        owner[property_name] = value
        changed[f"{owner.name} / {property_name}"] = {
            "before": round(previous, 6),
            "after": round(float(value), 6),
        }
        owner.update_tag(refresh={"OBJECT"})
    return changed


def lengthen_opening(objects):
    """Fill most of section 00 while preserving its readable near face."""
    opening = objects["opening"]
    rig = opening.parent
    if rig is None or rig.name != "Opening Position":
        raise RuntimeError("Opening Field must remain parented to Opening Position.")
    local_y = [float(vertex.co.y) for vertex in opening.data.vertices]
    if not local_y:
        raise RuntimeError("Opening Field cannot be empty.")
    rig.scale.y = OPENING_DEPTH_SCALE
    bpy.context.view_layer.update()
    parent_y = float(rig.matrix_world.translation.y)
    opening.location.y = (
        (OPENING_NEAR_WORLD_Y - parent_y) / OPENING_DEPTH_SCALE
    ) - min(local_y)
    rig.update_tag(refresh={"OBJECT"})
    opening.update_tag(refresh={"OBJECT", "DATA"})
    return {
        "depthScale": OPENING_DEPTH_SCALE,
        "localOffsetY": round(float(opening.location.y), 6),
        "nearWorldY": OPENING_NEAR_WORLD_Y,
    }


def update_cues(scene):
    frames = cue_frames()
    existing = {marker.name: marker for marker in scene.timeline_markers}
    for name, frame in frames.items():
        marker = existing.get(name) or scene.timeline_markers.new(name=name, frame=frame)
        marker.frame = frame
    scene.frame_start = CAMERA_START_FRAME
    scene.frame_end = SCENE_END_FRAME
    return frames


def update_visibility_metadata(scene):
    updated = {}
    for obj in scene.objects:
        metadata = plain_value(obj.get(INTERNAL_KEY, {}))
        model_id = str(obj.get("abs_model_id") or metadata.get("abs_model_id") or "")
        if obj.type != "MESH" or model_id not in VISIBILITY_CUES:
            continue
        start_cue, start_offset, end_cue, end_offset = VISIBILITY_CUES[model_id]
        stage_index = int(model_id.rsplit(".", 1)[1])
        start_wu = max(0.0, stage_index * 5.0 + start_offset)
        end_wu = (stage_index + 1) * 5.0 + end_offset
        metadata.update({
            "abs_visibility_start_wu": start_wu,
            "abs_visibility_end_wu": end_wu,
            "abs_visibility_start_cue": start_cue,
            "abs_visibility_start_offset_wu": start_offset,
            "abs_visibility_end_cue": end_cue,
            "abs_visibility_end_offset_wu": end_offset,
            "abs_visibility_handoff_wu": 0.3,
        })
        obj[INTERNAL_KEY] = metadata
        updated[obj.name] = [start_cue, end_cue, start_wu, end_wu]
    return updated


def update_metadata(scene, path):
    metadata = plain_value(scene.get(INTERNAL_KEY, {}))
    ranges = equal_stage_ranges()
    path_length = sum(float(spline.calc_length()) for spline in path.data.splines)
    section_length = path_length / SECTION_COUNT
    metadata.update({
        "abs_equal_section_contract": CONTRACT,
        "abs_equal_section_count": SECTION_COUNT,
        "abs_equal_section_length_wu": round(section_length, 6),
        "abs_narrative_stage_ranges": json.dumps(ranges, separators=(",", ":")),
        "abs_stage_spans_wu": json.dumps({
            f"about.{index:02d}": [
                round(section_length * index, 6),
                round(section_length * (index + 1), 6),
            ]
            for index in range(SECTION_COUNT)
        }, separators=(",", ":")),
        "abs_section_timing_owner": "camera-path-equal-distance-sevenths",
        "abs_opening_depth_scale": OPENING_DEPTH_SCALE,
        "abs_opening_section_contract": "near-face-fixed-section-fill/v1",
    })
    scene[INTERNAL_KEY] = metadata
    return ranges, section_length


def refresh(scene, objects):
    current = scene.frame_current
    adjacent = current + 1 if current < scene.frame_end else current - 1
    scene.frame_set(adjacent)
    scene.frame_set(current)
    for obj in objects.values():
        obj.update_tag(refresh={"OBJECT"})
    bpy.context.view_layer.update()


def main():
    scene = bpy.context.scene
    objects = {}
    for key, name in OBJECT_NAMES.items():
        obj = bpy.data.objects.get(name)
        if obj is None:
            raise RuntimeError(f"Missing existing About scene object: {name}.")
        objects[key] = obj
    path = objects["path"]
    if path.type != "CURVE" or len(path.data.splines) != 1:
        raise RuntimeError("Camera Path must remain one editable curve spline.")

    changed = set_control_values(objects)
    opening = lengthen_opening(objects)
    frames = update_cues(scene)
    visibility = update_visibility_metadata(scene)
    ranges, section_length = update_metadata(scene, path)
    refresh(scene, objects)

    print(json.dumps({
        "status": "ok",
        "saved": False,
        "contract": CONTRACT,
        "sectionCount": SECTION_COUNT,
        "sectionLengthWU": round(section_length, 6),
        "stageRanges": ranges,
        "stageFrames": [frames[f"ABS_STAGE_{index:02d}"] for index in range(SECTION_COUNT)],
        "cameraEndFrame": frames["ABS_CAMERA_LOCK"],
        "controlChanges": changed,
        "opening": opening,
        "visibility": visibility,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
