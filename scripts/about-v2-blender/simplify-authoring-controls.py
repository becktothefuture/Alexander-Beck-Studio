#!/usr/bin/env python3
"""Reduce the About scene to a small, useful Blender authoring surface.

Run after the director-cut, retained-scene, passage, palette, and naming scripts.
The script preserves evaluated geometry, materials, and export metadata. It does
not save the Blender file.
"""

import json
import re

import bpy


INTERNAL_KEY = "Internal Export Data"
LEGACY_INTERNAL_KEYS = ("ABS Internal Data",)
PALETTE_KEYS = {
    "abs_palette_mode",
    "abs_palette_role",
    "abs_palette_seed",
    "abs_palette_role_weights",
}

OBJECT_NAMES = {
    "controls": ("About Controls", "ABS_DIRECTOR_CUT_CONTROLS"),
    "round": ("Round Tunnel", "ABS_PARAMETRIC_ROUND_TUNNEL"),
    "square": ("Square Gates", "ABS_PARAMETRIC_SQUARE_GATE_TUNNEL"),
    "landscape": ("Landscape Position", "ABS_DC_TERRAIN_RIG"),
    "horizon": ("Horizon Position", "ABS_DC_HORIZON_BANKS_RIG"),
    "finale": ("Finale Position", "ABS_DC_FINALE_RIG"),
}

CONTROL_SPECS = {
    "camera_draw_start_wu": ("controls", "02 Fog Start", 1.0, 14.0, 0.0, 200.0,
                             "Distance from the camera where fog begins."),
    "camera_draw_end_wu": ("controls", "03 Fog End", 1.0, 150.0, 1.0, 400.0,
                           "Distance from the camera where the scene is fully hidden by fog."),
    "camera_fog_curve": ("controls", "04 Fog Curve", 1.0, 1.2, 0.45, 2.5,
                         "Shape of the fog transition."),
    "camera_horizontal_fov_degrees": ("controls", "01 Camera FOV", 1.0, 78.0, 35.0, 120.0,
                                      "Horizontal field of view for the website scene camera."),
    "forms_body_count": ("controls", "05 Body Count", 1.0, 5, 4, 6,
                         "Number of solid bodies shown and exported."),
    "forms_start_progress": ("controls", "06 Bodies Start (%)", 0.01, 15.5, 0.0, 100.0,
                             "Start of the solid-body space along the camera path."),
    "forms_end_progress": ("controls", "07 Bodies End (%)", 0.01, 28.0, 0.0, 100.0,
                           "End of the solid-body space along the camera path."),
    "forms_body_scale": ("controls", "08 Body Size", 1.0, 1.0, 0.5, 2.5,
                         "Overall size of every solid body."),
    "forms_lateral_spread": ("controls", "09 Body Spread", 1.0, 1.0, 0.35, 3.0,
                             "Horizontal and vertical spread of the solid bodies."),
    "forms_vertical_spread": ("controls", "09 Body Spread", 1.0, 1.0, 0.35, 3.0,
                              "Horizontal and vertical spread of the solid bodies."),
    "forms_rotation_turns": ("controls", "10 Body Rotation", 1.0, 0.18, -1.0, 1.0,
                             "Total rotation across the solid-body space, in turns."),
    "round_tunnel_start_progress": ("round", "01 Start (%)", 0.01, 28.571429, 0.0, 100.0,
                                    "Start of the round tunnel along the camera path."),
    "round_tunnel_end_progress": ("round", "02 End (%)", 0.01, 42.857143, 0.0, 100.0,
                                  "End of the round tunnel along the camera path."),
    "round_tunnel_ring_count": ("round", "03 Ring Count", 1.0, 28, 8, 40,
                                "Number of complete rings generated between Start and End."),
    "round_tunnel_aperture_radius_wu": ("round", "04 Opening Radius", 1.0, 7.38, 3.0, 24.0,
                                        "Clear radius inside every ring."),
    "round_tunnel_rim_wu": ("round", "05 Ring Thickness", 1.0, 0.42, 0.15, 4.0,
                            "Thickness of every ring."),
    "round_tunnel_half_depth_wu": ("round", "06 Ring Depth", 0.5, 0.44, 0.16, 8.0,
                                   "Full depth of every ring along the path."),
    "square_gate_start_progress": ("square", "01 Start (%)", 0.01, 57.142857, 0.0, 100.0,
                                   "Start of the square gates along the camera path."),
    "square_gate_end_progress": ("square", "02 End (%)", 0.01, 71.428571, 0.0, 100.0,
                                 "End of the square gates along the camera path."),
    "square_gate_count": ("square", "03 Gate Count", 1.0, 16, 8, 24,
                          "Number of complete gates generated between Start and End."),
    "square_gate_half_width_wu": ("square", "04 Opening Size", 0.5, 15.2, 6.0, 56.0,
                                  "Clear width and height inside every square gate."),
    "square_gate_half_height_wu": ("square", "04 Opening Size", 0.5, 15.2, 6.0, 56.0,
                                   "Clear width and height inside every square gate."),
    "square_gate_rim_wu": ("square", "05 Frame Thickness", 1.0, 1.1, 0.2, 5.0,
                           "Thickness of every square gate frame."),
    "square_gate_half_depth_wu": ("square", "06 Gate Depth", 0.5, 1.1, 0.2, 10.0,
                                  "Full depth of every gate along the path."),
    "square_gate_roll_turns": ("square", "07 Twist", 1.0, 0.12, -1.0, 1.0,
                               "Total twist from the first gate to the last, in turns."),
    "terrain_progress": ("landscape", "Position (%)", 0.01, 50.0, 0.0, 100.0,
                         "Landscape position along the camera path."),
    "horizon_banks_progress": ("horizon", "Position (%)", 0.01, 78.571429, 0.0, 100.0,
                               "Horizon-bank position along the camera path."),
    "finale_progress": ("finale", "Position (%)", 0.01, 92.857143, 0.0, 100.0,
                        "Finale position along the camera path."),
}

LEGACY_FRIENDLY_KEYS = {
    "controls": {
        "Camera FOV": "01 Camera FOV", "Fog Start": "02 Fog Start",
        "Fog End": "03 Fog End", "Fog Curve": "04 Fog Curve",
        "Body Count": "05 Body Count", "Bodies Start (%)": "06 Bodies Start (%)",
        "Bodies End (%)": "07 Bodies End (%)", "Body Size": "08 Body Size",
        "Body Spread": "09 Body Spread", "Body Rotation": "10 Body Rotation",
    },
    "round": {
        "Start (%)": "01 Start (%)", "End (%)": "02 End (%)",
        "Ring Count": "03 Ring Count", "Opening Radius": "04 Opening Radius",
        "Ring Thickness": "05 Ring Thickness", "Ring Depth": "06 Ring Depth",
    },
    "square": {
        "Start (%)": "01 Start (%)", "End (%)": "02 End (%)",
        "Gate Count": "03 Gate Count", "Opening Size": "04 Opening Size",
        "Frame Thickness": "05 Frame Thickness", "Gate Depth": "06 Gate Depth",
        "Twist": "07 Twist",
    },
}


def find_object(key):
    for name in OBJECT_NAMES[key]:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            return obj
    raise RuntimeError(f"Missing About control object: {OBJECT_NAMES[key][0]}")


def plain_value(value):
    if hasattr(value, "to_dict"):
        return {key: plain_value(item) for key, item in value.to_dict().items()}
    if hasattr(value, "to_list"):
        return [plain_value(item) for item in value.to_list()]
    if isinstance(value, dict):
        return {key: plain_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [plain_value(item) for item in value]
    return value


def normalized_metadata(metadata):
    for key in (
        "abs_point_density",
        "abs_surfel_radius_scale",
        "_abs_authoring_base_density",
        "_abs_authoring_base_surfel_scale",
    ):
        if key in metadata:
            metadata[key] = round(float(metadata[key]), 6)
    return metadata


def internal_data(owner):
    metadata = {}
    for key in (*LEGACY_INTERNAL_KEYS, INTERNAL_KEY):
        existing = owner.get(key)
        if existing is not None:
            metadata.update(plain_value(existing))
    return normalized_metadata(metadata)


def authored_value(owner, old_key, fallback, inverse_factor):
    if old_key in owner:
        return float(owner[old_key]) * inverse_factor
    metadata = internal_data(owner)
    if old_key in metadata:
        return float(metadata[old_key]) * inverse_factor
    return fallback


def ensure_control(owner, key, value, minimum, maximum, description):
    if key not in owner:
        owner[key] = int(round(value)) if isinstance(value, int) else float(value)
    owner.id_properties_ui(key).update(
        min=minimum,
        max=maximum,
        soft_min=minimum,
        soft_max=maximum,
        description=description,
    )


def driver_owners():
    seen = set()
    for datablocks in (
        bpy.data.objects,
        bpy.data.curves,
        bpy.data.meshes,
        bpy.data.cameras,
        bpy.data.worlds,
        bpy.data.node_groups,
        bpy.data.materials,
        bpy.data.scenes,
    ):
        for owner in datablocks:
            if owner.as_pointer() in seen or owner.animation_data is None:
                continue
            seen.add(owner.as_pointer())
            yield owner


def resolved_driver_value(owner, curve):
    value = owner.path_resolve(curve.data_path)
    if hasattr(value, "__len__") and not isinstance(value, (str, bytes)):
        return value[curve.array_index]
    return value


def assign_driver_value(owner, data_path, array_index, value):
    target = owner.path_resolve(data_path)
    if hasattr(target, "__len__") and not isinstance(target, (str, bytes)):
        target[array_index] = value
        return
    match = re.fullmatch(r'\["(.+)"\]', data_path)
    if match:
        owner[match.group(1)] = value
        return
    namespace = {"owner": owner, "value": value}
    exec(f"owner.{data_path} = value", {}, namespace)


def remove_and_bake_driver(owner, curve):
    data_path = curve.data_path
    array_index = curve.array_index
    value = resolved_driver_value(owner, curve)
    if curve.data_path in {
        '["abs_point_density"]', '["abs_surfel_radius_scale"]',
        '["_abs_authoring_base_density"]', '["_abs_authoring_base_surfel_scale"]',
    }:
        value = round(float(value), 6)
    try:
        owner.driver_remove(data_path, array_index)
    except (TypeError, RuntimeError):
        owner.driver_remove(data_path)
    assign_driver_value(owner, data_path, array_index, value)


def retarget_or_bake_drivers(objects, controls):
    remapped = 0
    baked = 0
    friendly_control_keys = {
        spec[1] for spec in CONTROL_SPECS.values() if spec[0] == "controls"
    }
    for owner in driver_owners():
        for curve in list(owner.animation_data.drivers):
            if curve.data_path.startswith('["abs_'):
                remove_and_bake_driver(owner, curve)
                baked += 1
                continue
            old_targets = []
            for variable in curve.driver.variables:
                for target in variable.targets:
                    match = re.fullmatch(r'\["(.+)"\]', target.data_path)
                    legacy_keys = next((
                        LEGACY_FRIENDLY_KEYS.get(object_key, {})
                        for object_key, obj in objects.items() if target.id == obj
                    ), {})
                    if match and match.group(1) in legacy_keys:
                        target.data_path = f'["{legacy_keys[match.group(1)]}"]'
                        remapped += 1
                        continue
                    if target.id != controls:
                        continue
                    if match:
                        property_name = match.group(1)
                        if property_name in friendly_control_keys:
                            continue
                        old_targets.append((variable, target, property_name))
            if not old_targets:
                continue
            if any(old_key not in CONTROL_SPECS for _, _, old_key in old_targets):
                remove_and_bake_driver(owner, curve)
                baked += 1
                continue
            expression = curve.driver.expression
            for variable, target, old_key in old_targets:
                object_key, new_key, factor, *_ = CONTROL_SPECS[old_key]
                target.id = objects[object_key]
                target.data_path = f'["{new_key}"]'
                if factor != 1.0:
                    replacement = f"({variable.name}*{factor:.9g})"
                    expression = re.sub(rf"\b{re.escape(variable.name)}\b", replacement, expression)
                remapped += 1
            curve.driver.expression = expression
    return remapped, baked


def remove_legacy_friendly_controls(objects):
    removed = 0
    for object_key, aliases in LEGACY_FRIENDLY_KEYS.items():
        owner = objects[object_key]
        for legacy_key in aliases:
            if legacy_key in owner:
                del owner[legacy_key]
                removed += 1
    return removed


def move_internal_properties():
    moved = 0
    owners = list(bpy.data.objects) + list(bpy.data.scenes)
    for owner in owners:
        metadata = internal_data(owner)
        for legacy_key in LEGACY_INTERNAL_KEYS:
            if legacy_key in owner:
                del owner[legacy_key]
        for key in list(owner.keys()):
            if key == INTERNAL_KEY or key in PALETTE_KEYS:
                continue
            if not (str(key).startswith("abs_") or str(key).startswith("_abs_")):
                continue
            metadata[key] = plain_value(owner[key])
            del owner[key]
            moved += 1
        if metadata:
            owner[INTERNAL_KEY] = metadata
    return moved


def remove_old_controls(controls, keep):
    removed = []
    metadata = internal_data(controls)
    for key in list(controls.keys()):
        if key in keep or key == INTERNAL_KEY or key in LEGACY_INTERNAL_KEYS or str(key).startswith("abs_"):
            continue
        removed.append(key)
        metadata[key] = plain_value(controls[key])
        del controls[key]
    if metadata:
        controls[INTERNAL_KEY] = metadata
    return sorted(removed)


def refresh_scene(scene, control_objects):
    for obj in control_objects:
        obj.update_tag(refresh={"OBJECT"})
    current = scene.frame_current
    adjacent = current + 1 if current < scene.frame_end else current - 1
    scene.frame_set(adjacent)
    scene.frame_set(current)
    bpy.context.view_layer.update()


def update_guide():
    guide = bpy.data.texts.get("ABOUT_DIRECTOR_CUT_README")
    if guide is None:
        return
    marker = "SIMPLE SCENE CONTROLS\n"
    body = guide.as_string()
    if marker in body:
        body = body.split(marker, 1)[0].rstrip() + "\n\n"
    body += marker + (
        "About Controls: camera fog/FOV and the complete solid-body space.\n"
        "Round Tunnel: start, end, count, opening, thickness and depth.\n"
        "Square Gates: start, end, count, opening, frame, depth and twist.\n"
        "Landscape Position, Horizon Position and Finale Position: path position.\n"
        "Use normal Transform scale/location for spatial fine tuning.\n"
        "Internal Export Data is exporter metadata and does not need editing.\n"
    )
    guide.clear()
    guide.write(body)


def main():
    scene = bpy.context.scene
    objects = {key: find_object(key) for key in OBJECT_NAMES}
    controls = objects["controls"]

    created = set()
    for old_key, (object_key, new_key, factor, fallback, minimum, maximum, description) in CONTROL_SPECS.items():
        owner = objects[object_key]
        if new_key in created:
            continue
        inverse_factor = 1.0 / factor
        value = authored_value(controls, old_key, fallback, inverse_factor)
        ensure_control(owner, new_key, value, minimum, maximum, description)
        created.add(new_key if object_key == "controls" else f"{object_key}:{new_key}")

    refresh_scene(scene, objects.values())
    remapped, baked = retarget_or_bake_drivers(objects, controls)
    refresh_scene(scene, objects.values())
    removed_friendly = remove_legacy_friendly_controls(objects)

    keep_on_controls = {
        spec[1] for spec in CONTROL_SPECS.values() if spec[0] == "controls"
    }
    removed_controls = remove_old_controls(controls, keep_on_controls)
    moved_metadata = move_internal_properties()
    scene["abs_blender_authority"] = (
        "editable-bezier-path,scene-layout,fov,visibility-distance,camera-fog"
    )
    scene["abs_authoring_control_contract"] = "simplified-scene-controls/v1"
    move_internal_properties()
    update_guide()
    refresh_scene(scene, objects.values())

    print(json.dumps({
        "status": "ok",
        "controlCounts": {
            key: len([name for name in obj.keys() if name != INTERNAL_KEY and not name.startswith("abs_")])
            for key, obj in objects.items()
        },
        "remappedDriverVariables": remapped,
        "bakedDrivers": baked,
        "removedLegacyControls": len(removed_controls),
        "removedEarlierFriendlyNames": removed_friendly,
        "movedMetadataProperties": moved_metadata,
        "saved": False,
    }, indent=2))


if __name__ == "__main__":
    main()
