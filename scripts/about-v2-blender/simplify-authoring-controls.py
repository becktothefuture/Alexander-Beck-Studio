#!/usr/bin/env python3
"""Reduce the About scene to one small, useful Blender authoring surface.

Run after the director-cut, retained-scene, passage, palette, and naming scripts.
Every public scene control is placed on ``About Controls``. Geometry objects
retain only semantic palette properties and internal export metadata. The script
preserves evaluated geometry, materials, and export metadata. It does not save
the Blender file.
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
}

CONTROL_SPECS = {
    "camera_horizontal_fov_degrees": ("controls", "01 Camera FOV", "01 Camera FOV", 1.0, 78.0, 10.0, 170.0,
                                      "Horizontal field of view for the website scene camera."),
    "camera_draw_start_wu": ("controls", "02 Fog Start", "02 Fog Start", 1.0, 14.0, 0.0, 1000.0,
                             "Distance from the camera where fog begins."),
    "camera_draw_end_wu": ("controls", "03 Fog End", "03 Fog End", 1.0, 100.0, 1.0, 2000.0,
                           "Distance from the camera where the scene is fully hidden by fog."),
    "camera_fog_curve": ("controls", "04 Fog Curve", "04 Fog Curve", 1.0, 1.0, 0.1, 8.0,
                         "Shape of the fog transition."),
    "opening_start_progress": ("controls", "05 Opening Start (%)", "05 Opening Start (%)", 0.01, 1.661882, 0.0, 100.0,
                               "Near boundary of the Opening Field along the camera path."),
    "opening_end_progress": ("controls", "06 Opening End (%)", "06 Opening End (%)", 0.01, 18.799436, 0.0, 100.0,
                             "Far boundary of the Opening Field along the camera path."),
    "forms_body_count": ("controls", "07 Body Count", "07 Body Count", 1.0, 6, 4, 6,
                         "Number of different solid body shapes repeated in the field."),
    "forms_start_progress": ("controls", "08 Bodies Start (%)", "08 Bodies Start (%)", 0.01, 20.18673, 0.0, 100.0,
                             "Position of the first solid body along the camera path."),
    "forms_end_progress": ("controls", "09 Bodies End (%)", "09 Bodies End (%)", 0.01, 43.442064, 0.0, 100.0,
                           "Position of the last solid body along the camera path."),
    "forms_body_scale": ("controls", "10 Body Size", "10 Body Size", 1.0, 2.0, 0.1, 8.0,
                         "Overall size of every solid body."),
    "forms_lateral_spread": ("controls", "11 Body Spread", "11 Body Spread", 1.0, 1.0, 1.0, 8.0,
                             "Radius of the close solid-body corridor."),
    "forms_vertical_spread": ("controls", "11 Body Spread", "11 Body Spread", 1.0, 1.0, 1.0, 8.0,
                              "Radius of the close solid-body corridor."),
    "forms_rotation_turns": ("controls", "12 Body Rotation", "12 Body Rotation", 1.0, 1.0, -4.0, 4.0,
                             "Total rotation across the solid-body space, in turns."),
    "forms_copies_per_shape": ("controls", "13 Copies Per Shape", "13 Copies Per Shape", 1.0, 4, 1, 6,
                               "Number of collision-safe copies generated for each enabled shape."),
    "forms_random_seed": ("controls", "14 Random Seed", "14 Random Seed", 1.0, 1007, 0, 2147483647,
                          "Seed for deterministic random positions and rotations."),
    "forms_minimum_gap_wu": ("controls", "15 Minimum Gap", "15 Minimum Gap", 1.0, 1.0, 0.1, 100.0,
                             "Minimum empty surface distance between visible bodies."),
    "round_tunnel_start_progress": ("round", "01 Start (%)", "16 Start (%)", 0.01, 28.571429, 0.0, 100.0,
                                    "Start of the round tunnel along the camera path."),
    "round_tunnel_end_progress": ("round", "02 End (%)", "17 End (%)", 0.01, 42.857143, 0.0, 100.0,
                                  "End of the round tunnel along the camera path."),
    "round_tunnel_ring_count": ("round", "03 Ring Count", "18 Ring Count", 1.0, 28, 4, 120,
                                "Number of complete rings generated between Start and End."),
    "round_tunnel_aperture_radius_wu": ("round", "04 Opening Radius", "19 Opening Radius", 1.0, 7.38, 0.5, 60.0,
                                        "Clear radius inside every ring."),
    "round_tunnel_rim_wu": ("round", "05 Ring Thickness", "20 Ring Thickness", 1.0, 0.42, 0.05, 12.0,
                            "Thickness of every ring."),
    "round_tunnel_half_depth_wu": ("round", "06 Ring Depth", "21 Ring Depth", 0.5, 0.44, 0.05, 40.0,
                                   "Full depth of every ring along the path."),
    "terrain_start_progress": ("controls", "22 Landscape Start (%)", "22 Landscape Start (%)", 0.01, 55.097964, 0.0, 100.0,
                               "Near boundary of the Landscape along the camera path."),
    "terrain_end_progress": ("controls", "23 Landscape End (%)", "23 Landscape End (%)", 0.01, 67.000254, 0.0, 100.0,
                             "Far boundary of the Landscape along the camera path."),
    "terrain_mountain_height": ("controls", "24 Mountain Height", "24 Mountain Height", 1.0, 30.0, 0.0, 200.0,
                                "Height of the broad landform around the flight corridor."),
    "terrain_mountain_detail": ("controls", "25 Mountain Detail", "25 Mountain Detail", 1.0, 4.0, 0.0, 8.0,
                                "Amount, scale and complexity of the smaller mountain peaks."),
    "square_gate_start_progress": ("square", "01 Start (%)", "26 Start (%)", 0.01, 57.142857, 0.0, 100.0,
                                   "Start of the square gates along the camera path."),
    "square_gate_end_progress": ("square", "02 End (%)", "27 End (%)", 0.01, 71.428571, 0.0, 100.0,
                                 "End of the square gates along the camera path."),
    "square_gate_count": ("square", "03 Gate Count", "28 Gate Count", 1.0, 16, 4, 96,
                          "Number of complete gates generated between Start and End."),
    "square_gate_half_width_wu": ("square", "04 Opening Size", "29 Opening Size", 0.5, 15.2, 2.0, 120.0,
                                  "Clear width and height inside every square gate."),
    "square_gate_half_height_wu": ("square", "04 Opening Size", "29 Opening Size", 0.5, 15.2, 2.0, 120.0,
                                   "Clear width and height inside every square gate."),
    "square_gate_rim_wu": ("square", "05 Frame Thickness", "30 Frame Thickness", 1.0, 1.1, 0.05, 20.0,
                           "Thickness of every square gate frame."),
    "square_gate_half_depth_wu": ("square", "06 Gate Depth", "31 Gate Depth", 0.5, 1.1, 0.05, 60.0,
                                  "Full depth of every gate along the path."),
    "square_gate_roll_turns": ("square", "07 Twist", "32 Twist", 1.0, 0.075, -4.0, 4.0,
                               "Total twist from the first gate to the last, in turns."),
    "finale_bust_scale": ("controls", "33 Bust Scale", "33 Bust Scale", 1.0, 1.0, 0.2, 5.0,
                          "Overall scale of the bust and its focus height."),
    "finale_orbit_amount": ("controls", "34 Orbit Amount", "34 Orbit Amount", 1.0, 80.0, -720.0, 720.0,
                            "Degrees travelled around the bust during the finale."),
    "finale_orbit_radius": ("controls", "35 Orbit Radius", "35 Orbit Radius", 1.0, 210.0, 40.0, 1200.0,
                            "Distance between the camera and the bust during the orbit."),
    "finale_platform_turn": ("controls", "36 Platform Turn", "36 Platform Turn", 1.0, 18.0, 1.0, 180.0,
                             "Seconds for one complete visible platform rotation. Camera orbit compensation is automatic."),
}

SECTION_LABELS = (
    ("00 — CAMERA + FOG", "View and visibility"),
    ("04 — OPENING FIELD", "Placement and length"),
    ("06 — SOLID BODIES", "Population and corridor"),
    ("15 — ROUND TUNNEL", "Passage shape and placement"),
    ("21 — LANDSCAPE", "Placement and mountain shape"),
    ("25 — SQUARE GATES", "Passage shape and twist"),
    ("32 — BUST FINALE", "Reveal and motion"),
)

LEGACY_FRIENDLY_KEYS = {
    "controls": {
        "Camera FOV": "01 Camera FOV", "Fog Start": "02 Fog Start",
        "Fog End": "03 Fog End", "Fog Curve": "04 Fog Curve",
        "Body Count": "07 Body Count", "Bodies Start (%)": "08 Bodies Start (%)",
        "Bodies End (%)": "09 Bodies End (%)", "Body Size": "10 Body Size",
        "Body Spread": "11 Body Spread", "Body Rotation": "12 Body Rotation",
        "Copies Per Shape": "13 Copies Per Shape", "Random Seed": "14 Random Seed",
        "Minimum Gap": "15 Minimum Gap",
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


def authored_value(objects, controls, semantic_key, source_object_key, source_key,
                   master_key, fallback, inverse_factor, master_is_current):
    """Read a public value before any colliding numbered keys are replaced."""
    source_owner = objects[source_object_key]
    if master_is_current and master_key in controls:
        return controls[master_key]
    if source_key in source_owner:
        return source_owner[source_key]
    for legacy_key, numbered_key in LEGACY_FRIENDLY_KEYS.get(source_object_key, {}).items():
        if numbered_key == source_key and legacy_key in source_owner:
            return source_owner[legacy_key]
    if semantic_key in controls:
        return float(controls[semantic_key]) * inverse_factor
    for owner in (source_owner, controls):
        metadata = internal_data(owner)
        if semantic_key in metadata:
            return float(metadata[semantic_key]) * inverse_factor
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
    current_targets = {
        (controls.as_pointer(), spec[2]) for spec in CONTROL_SPECS.values()
    }
    target_map = {}
    for semantic_key, spec in CONTROL_SPECS.items():
        source_object_key, source_key, master_key, factor, *_ = spec
        source_owner = objects[source_object_key]
        target_map[(source_owner.as_pointer(), source_key)] = (master_key, 1.0)
        target_map[(controls.as_pointer(), semantic_key)] = (master_key, factor)
        for legacy_key, numbered_key in LEGACY_FRIENDLY_KEYS.get(source_object_key, {}).items():
            if numbered_key == source_key:
                target_map[(source_owner.as_pointer(), legacy_key)] = (master_key, 1.0)

    for owner in driver_owners():
        for curve in list(owner.animation_data.drivers):
            if curve.data_path.startswith('["abs_'):
                remove_and_bake_driver(owner, curve)
                baked += 1
                continue
            replacements = []
            for variable in curve.driver.variables:
                for target in variable.targets:
                    match = re.fullmatch(r'\["(.+)"\]', target.data_path)
                    if not match or target.id is None:
                        continue
                    target_key = (target.id.as_pointer(), match.group(1))
                    if target_key in current_targets:
                        continue
                    replacement = target_map.get(target_key)
                    if replacement is not None:
                        replacements.append((variable, target, *replacement))
            if not replacements:
                continue
            expression = curve.driver.expression
            scaled_variables = set()
            for variable, target, master_key, factor in replacements:
                target.id = controls
                target.data_path = f'["{master_key}"]'
                if factor != 1.0:
                    if variable.name in scaled_variables:
                        raise RuntimeError(
                            f"Driver variable {variable.name} requires more than one scale conversion."
                        )
                    scaled = f"({variable.name}*{factor:.9g})"
                    expression = re.sub(rf"\b{re.escape(variable.name)}\b", scaled, expression)
                    scaled_variables.add(variable.name)
                remapped += 1
            curve.driver.expression = expression
    return remapped, baked


def remove_source_controls(objects, controls):
    removed = 0
    for spec in CONTROL_SPECS.values():
        source_object_key, source_key, master_key, *_ = spec
        owner = objects[source_object_key]
        if owner == controls and source_key == master_key:
            continue
        if source_key in owner:
            del owner[source_key]
            removed += 1
    for object_key, aliases in LEGACY_FRIENDLY_KEYS.items():
        owner = objects[object_key]
        for legacy_key in aliases:
            if legacy_key in owner:
                del owner[legacy_key]
                removed += 1
    return removed


def ensure_section_labels(controls):
    for key in list(controls.keys()):
        if "—" in str(key) or str(key).startswith("SECTION "):
            del controls[key]
    for key, value in SECTION_LABELS:
        controls[key] = value
        controls.id_properties_ui(key).update(
            description="Section label only. Controls follow below it.",
        )


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


def evaluated_geometry_signature(scene):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    signature = {}
    for obj in sorted((item for item in scene.objects if item.type == "MESH"), key=lambda item: item.name):
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
            if points:
                bounds = tuple(
                    round(value, 6)
                    for axis in range(3)
                    for value in (
                        min(point[axis] for point in points),
                        max(point[axis] for point in points),
                    )
                )
            else:
                bounds = ()
            signature[obj.name] = (len(mesh.vertices), len(mesh.polygons), bounds)
        finally:
            evaluated.to_mesh_clear()
    return signature


def invalid_driver_count():
    return sum(
        not curve.is_valid
        for owner in driver_owners()
        for curve in owner.animation_data.drivers
    )


def update_guide():
    marker = "SIMPLE SCENE CONTROLS\n"
    summary = marker + (
        "About Controls is the only public scene authoring surface.\n"
        "Its sections are Camera + Fog, Opening Field, Solid Bodies, Round Tunnel, Landscape, "
        "Square Gates, and Bust Finale.\n"
        "Creative ranges are broad. Body Count and Copies Per Shape stop at the real\n"
        "six-family/six-copy geometry limits; path percentages already span 0-100.\n"
        "Geometry objects retain only semantic palette settings and Internal Export Data.\n"
        "Use normal Transform controls only for deliberate spatial fine tuning.\n"
    )
    for name in ("ABOUT_DIRECTOR_CUT_README", "README - About Scene"):
        guide = bpy.data.texts.get(name)
        if guide is None:
            continue
        body = guide.as_string()
        if marker in body:
            body = body.split(marker, 1)[0].rstrip() + "\n\n"
        guide.clear()
        guide.write(body + summary)


def main():
    scene = bpy.context.scene
    objects = {key: find_object(key) for key in OBJECT_NAMES}
    controls = objects["controls"]
    geometry_before = evaluated_geometry_signature(scene)

    controls_metadata = internal_data(controls)
    scene_metadata = internal_data(scene)
    master_is_current = (
        controls_metadata.get("abs_authoring_control_contract") == "master-about-controls/v3"
        or scene_metadata.get("abs_authoring_control_contract") == "master-about-controls/v3"
        or all(key in controls for key in (
            "05 Opening Start (%)", "23 Landscape End (%)", "32 Twist", "36 Platform Turn",
        ))
    )
    authored_values = {}
    for semantic_key, spec in CONTROL_SPECS.items():
        source_object_key, source_key, master_key, factor, fallback, *_ = spec
        authored_values[semantic_key] = authored_value(
            objects, controls, semantic_key, source_object_key, source_key,
            master_key, fallback, 1.0 / factor, master_is_current,
        )

    created = set()
    for semantic_key, spec in CONTROL_SPECS.items():
        _, _, master_key, _, _, minimum, maximum, description = spec
        if master_key in created:
            continue
        ensure_control(
            controls, master_key, authored_values[semantic_key],
            minimum, maximum, description,
        )
        created.add(master_key)
    ensure_section_labels(controls)

    refresh_scene(scene, objects.values())
    remapped, baked = retarget_or_bake_drivers(objects, controls)
    refresh_scene(scene, objects.values())
    removed_source_controls = remove_source_controls(objects, controls)

    keep_on_controls = {spec[2] for spec in CONTROL_SPECS.values()}
    keep_on_controls.update(key for key, _ in SECTION_LABELS)
    removed_controls = remove_old_controls(controls, keep_on_controls)
    moved_metadata = move_internal_properties()
    scene_metadata = internal_data(scene)
    scene_metadata.update({
        "abs_blender_authority": "editable-bezier-path,scene-layout,fov,visibility-distance,camera-fog",
        "abs_authoring_control_contract": "master-about-controls/v3",
        "abs_authoring_control_owner": "about.controls",
    })
    scene[INTERNAL_KEY] = scene_metadata
    controls_metadata = internal_data(controls)
    controls_metadata.update({
        "abs_note": "About Controls is the single public authoring surface for the About scene.",
        "abs_authoring_control_contract": "master-about-controls/v3",
        "abs_authoring_control_count": len(created),
    })
    controls[INTERNAL_KEY] = controls_metadata
    update_guide()
    refresh_scene(scene, objects.values())
    geometry_after = evaluated_geometry_signature(scene)
    if geometry_after != geometry_before:
        changed_objects = sorted(
            name for name in set(geometry_before) | set(geometry_after)
            if geometry_before.get(name) != geometry_after.get(name)
        )
        raise RuntimeError(
            "Consolidating About controls changed evaluated geometry: "
            + ", ".join(changed_objects)
        )
    invalid_drivers = invalid_driver_count()
    if invalid_drivers:
        raise RuntimeError(f"Consolidating About controls left {invalid_drivers} invalid drivers.")

    print(json.dumps({
        "status": "ok",
        "controlCounts": {
            key: len([
                name for name in obj.keys()
                if re.match(r"^\d{2} ", str(name)) and isinstance(obj[name], (int, float))
            ])
            for key, obj in objects.items()
        },
        "remappedDriverVariables": remapped,
        "bakedDrivers": baked,
        "removedLegacyControls": len(removed_controls) + removed_source_controls,
        "movedMetadataProperties": moved_metadata,
        "authoringControlContract": "master-about-controls/v3",
        "geometryPreserved": True,
        "invalidDrivers": invalid_drivers,
        "saved": False,
    }, indent=2))


if __name__ == "__main__":
    main()
