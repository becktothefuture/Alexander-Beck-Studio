#!/usr/bin/env python3
"""Build the About solid bodies as a repeatable finale halo.

Run after the scene has readable names and simplified authoring controls. The
script keeps the six authored meshes, creates linked copies, and drives every
placement from ``About Controls``. It does not save the Blender file.
"""

import json
import math
import re
import zlib

import bpy
from mathutils import Matrix


INTERNAL_KEY = "Internal Export Data"
CONTROLS_NAMES = ("About Controls", "ABS_DIRECTOR_CUT_CONTROLS")
PATH_NAMES = ("Camera Path", "ABS_PARAMETRIC_RIDE_PATH")
BODY_COLLECTION_NAMES = ("03 SOLID BODIES", "ABS_STAGE_01_RECOGNISABLE_BODIES")
BODY_NAMES = (
    "Body 01 - Cube",
    "Body 02 - Pyramid",
    "Body 03 - Octahedron",
    "Body 04 - Triangular Prism",
    "Body 05 - Icosahedron",
    "Body 06 - Hexagonal Prism",
)
BODY_KINDS = (
    "cube",
    "pyramid",
    "octahedron",
    "triangular-prism",
    "icosahedron",
    "hexagonal-prism",
)
DEFAULT_COPIES_PER_SHAPE = 6
MAX_COPIES_PER_SHAPE = 6
HALO_BANDS = (
    # start, count, radius, centre height, vertical amplitude, angular phase
    (0, 6, 190.0, 86.0, 44.0, 0.10),
    (6, 10, 250.0, 104.0, 74.0, 0.37),
    (16, 8, 315.0, 122.0, 112.0, 0.73),
)

CONTROL_NAMES = {
    "body_count": "07 Body Count",
    "start": "08 Bodies Start (%)",
    "end": "09 Bodies End (%)",
    "size": "10 Body Size",
    "spread": "11 Body Spread",
    "rotation": "12 Body Rotation",
    "copies": "13 Copies Per Shape",
    "seed": "14 Random Seed",
    "gap": "15 Minimum Gap",
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
    value = owner.get(INTERNAL_KEY)
    return plain_value(value) if value is not None else {}


def semantic_value(owner, key, fallback=None):
    if key in owner:
        return owner[key]
    return internal_data(owner).get(key, fallback)


def set_internal_value(owner, key, value):
    metadata = internal_data(owner)
    metadata[key] = plain_value(value)
    owner[INTERNAL_KEY] = metadata


def find_named(names):
    return next((bpy.data.objects.get(name) for name in names if bpy.data.objects.get(name)), None)


def find_body_collection(scene):
    for name in BODY_COLLECTION_NAMES:
        collection = bpy.data.collections.get(name)
        if collection is not None:
            return collection
    collection = bpy.data.collections.new(BODY_COLLECTION_NAMES[0])
    scene.collection.children.link(collection)
    return collection


def ensure_control(owner, name, value, minimum, maximum, description, integer=False):
    if name not in owner:
        owner[name] = int(value) if integer else float(value)
    elif integer:
        owner[name] = int(round(float(owner[name])))
    else:
        owner[name] = float(owner[name])
    owner.id_properties_ui(name).update(
        min=minimum,
        max=maximum,
        soft_min=minimum,
        soft_max=maximum,
        description=description,
    )


def add_driver(owner, data_path, controls, variables, expression, index=None):
    try:
        owner.driver_remove(data_path) if index is None else owner.driver_remove(data_path, index)
    except (TypeError, RuntimeError):
        pass
    curve = owner.driver_add(data_path) if index is None else owner.driver_add(data_path, index)
    for variable_name, property_name in variables:
        variable = curve.driver.variables.new()
        variable.name = variable_name
        variable.type = "SINGLE_PROP"
        variable.targets[0].id_type = "OBJECT"
        variable.targets[0].id = controls
        variable.targets[0].data_path = f'["{property_name}"]'
    curve.driver.expression = expression
    if not curve.driver.is_valid:
        raise RuntimeError(f"Invalid driver on {owner.name} {data_path}: {expression}")
    return curve


def clear_object_animation(obj):
    obj.animation_data_clear()
    for constraint in list(obj.constraints):
        obj.constraints.remove(constraint)


def body_index(obj):
    value = semantic_value(obj, "abs_forms_body_index")
    if value is not None:
        return int(round(float(value)))
    match = re.match(r"Body (\d{2}) -", obj.name)
    return int(match.group(1)) - 1 if match else None


def copy_index(obj):
    value = semantic_value(obj, "abs_forms_copy_index", 0)
    return int(round(float(value)))


def find_source_bodies(scene):
    by_index = {}
    for obj in scene.objects:
        if obj.type != "MESH" or copy_index(obj) != 0:
            continue
        index = body_index(obj)
        if index is None or not 0 <= index < len(BODY_NAMES):
            continue
        if semantic_value(obj, "abs_model_id") != "about.01":
            continue
        if index in by_index:
            raise RuntimeError(f"More than one source body uses index {index}.")
        by_index[index] = obj
    if set(by_index) != set(range(len(BODY_NAMES))):
        raise RuntimeError("The collision-safe field requires all six authored body sources.")
    return [by_index[index] for index in range(len(BODY_NAMES))]


def local_radius(obj):
    return max((vertex.co.length for vertex in obj.data.vertices), default=0.0)


def field_name(source, shape_index, repeat_index):
    base = BODY_NAMES[shape_index] if source.name.startswith("Body ") else source.name.split(" / Copy ", 1)[0]
    return base if repeat_index == 0 else f"{base} / Copy {repeat_index + 1:02d}"


def stable_seed(object_id):
    return zlib.crc32(object_id.encode("utf-8")) & 0x7FFFFFFF


def configure_metadata(obj, shape_index, repeat_index, feature_priority):
    source_id = f"director.form-body.{shape_index:02d}"
    object_id = source_id if repeat_index == 0 else f"{source_id}.copy.{repeat_index:02d}"
    set_internal_value(obj, "abs_export", True)
    set_internal_value(obj, "abs_model_id", "about.01")
    set_internal_value(obj, "abs_object_id", object_id)
    set_internal_value(obj, "abs_forms_body_index", shape_index)
    set_internal_value(obj, "abs_forms_copy_index", repeat_index)
    set_internal_value(obj, "abs_forms_field_cell", [shape_index, repeat_index, 1.0])
    set_internal_value(obj, "abs_parameter_owner", "About Controls")
    set_internal_value(obj, "abs_feature_priority", round(feature_priority, 6))
    set_internal_value(
        obj,
        "abs_designer_label",
        f"Parametric solid {shape_index + 1}: {BODY_KINDS[shape_index]}, copy {repeat_index + 1}",
    )
    obj["abs_palette_seed"] = stable_seed(object_id)
    obj.id_properties_ui("abs_palette_seed").update(
        min=0,
        max=0x7FFFFFFF,
        description="Stable seed for deterministic semantic role assignment.",
    )


def sync_field_objects(scene, collection, sources, copy_layer_count):
    surface_areas = [sum(polygon.area for polygon in source.data.polygons) for source in sources]
    average_area = sum(surface_areas) / len(surface_areas)
    existing = {}
    for obj in scene.objects:
        if obj.type != "MESH" or semantic_value(obj, "abs_model_id") != "about.01":
            continue
        key = (body_index(obj), copy_index(obj))
        if key in existing:
            raise RuntimeError(f"Duplicate solid-body field slot: {key}.")
        existing[key] = obj
    result = []
    for repeat_index in range(copy_layer_count):
        for shape_index, source in enumerate(sources):
            slot = repeat_index * len(sources) + shape_index
            obj = existing.pop((shape_index, repeat_index), None)
            if obj is None:
                obj = source.copy()
                obj.data = source.data
                collection.objects.link(obj)
            obj.name = field_name(source, shape_index, repeat_index)
            configure_metadata(
                obj,
                shape_index,
                repeat_index,
                1.2 * average_area / max(surface_areas[shape_index], 1e-9),
            )
            result.append((obj, shape_index, repeat_index, slot))
    removed = []
    for (shape_index, repeat_index), obj in existing.items():
        if repeat_index <= 0:
            raise RuntimeError(f"Cannot remove required source body {obj.name}.")
        removed.append(obj.name)
        bpy.data.objects.remove(obj, do_unlink=True)
    return result, removed


def halo_slot(slot):
    for start, count, radius, height, amplitude, phase in HALO_BANDS:
        if start <= slot < start + count:
            return start, count, radius, height, amplitude, phase
    raise RuntimeError(f"No finale halo band owns body slot {slot}.")


def configure_drivers(objects, controls, path, finale_position, maximum_radius):
    path_length = sum(float(spline.calc_length()) for spline in path.data.splines)
    if not math.isfinite(path_length) or path_length <= 0:
        raise RuntimeError("Camera Path has no usable evaluated length.")
    visible_variables = (
        ("count", CONTROL_NAMES["body_count"]),
        ("copies", CONTROL_NAMES["copies"]),
    )
    placement_variables = (
        ("size", CONTROL_NAMES["size"]),
        ("spread", CONTROL_NAMES["spread"]),
        ("seed", CONTROL_NAMES["seed"]),
    )
    for obj, shape_index, repeat_index, slot in objects:
        clear_object_animation(obj)
        obj.parent = finale_position
        obj.matrix_parent_inverse = Matrix.Identity(4)
        band_start, band_count, base_radius, base_height, vertical_amplitude, band_phase = halo_slot(slot)
        band_index = slot - band_start
        angle = band_phase + math.tau * band_index / band_count
        jitter = f"(0.96+0.04*sin(seed*0.019173+{slot * 1.618033989:.9f}))"
        radius = f"{base_radius:.9f}*(0.78+0.22*spread)*{jitter}"
        add_driver(
            obj,
            "location",
            controls,
            placement_variables,
            f"cos({angle:.9f})*{radius}",
            index=0,
        )
        add_driver(
            obj,
            "location",
            controls,
            placement_variables,
            f"sin({angle:.9f})*{radius}",
            index=1,
        )
        add_driver(
            obj,
            "location",
            controls,
            placement_variables,
            (
                f"{base_height:.9f}+{vertical_amplitude:.9f}*"
                f"sin({angle * 1.7 + band_phase:.9f})+"
                f"8.0*sin(seed*0.011731+{slot * 0.7:.9f})"
            ),
            index=2,
        )
        for axis in range(3):
            add_driver(
                obj,
                "scale",
                controls,
                (("size", CONTROL_NAMES["size"]),),
                "size",
                index=axis,
            )
        base_rotations = (
            float(semantic_value(obj, "abs_forms_rotation_x", obj.rotation_euler.x)),
            float(semantic_value(obj, "abs_forms_rotation_y", obj.rotation_euler.y)),
            float(semantic_value(obj, "abs_forms_rotation_z", obj.rotation_euler.z)),
        )
        for axis, base in enumerate(base_rotations):
            salt = 0.913 + slot * (1.371 + axis * 0.217)
            add_driver(
                obj,
                "rotation_euler",
                controls,
                (("turns", CONTROL_NAMES["rotation"]), ("seed", CONTROL_NAMES["seed"])),
                f"{base:.9f}+turns*{2.0 * math.pi * slot / max(1, len(objects) - 1):.9f}+0.22*sin(seed*0.318309886+{salt:.6f})",
                index=axis,
            )
        hidden_expression = f"count<={shape_index} or copies<={repeat_index}"
        add_driver(obj, "hide_viewport", controls, visible_variables, hidden_expression)
        add_driver(obj, "hide_render", controls, visible_variables, hidden_expression)
        set_internal_value(obj, "abs_visibility_start_cue", "split-lattice-entry")
        set_internal_value(obj, "abs_visibility_start_offset_wu", -0.3)
        set_internal_value(obj, "abs_visibility_start_wu", 29.7)
        set_internal_value(obj, "abs_visibility_end_cue", "terminal-hold")
        set_internal_value(obj, "abs_visibility_end_offset_wu", 0.3)
        set_internal_value(obj, "abs_visibility_end_wu", 35.3)
        set_internal_value(obj, "abs_visibility_handoff_wu", 0.3)
        set_internal_value(obj, "abs_forms_halo_band", "near" if slot < 6 else "middle" if slot < 16 else "far")
    return path_length


def refresh_scene(scene, controls):
    controls.update_tag(refresh={"OBJECT"})
    current = scene.frame_current
    adjacent = current + 1 if current < scene.frame_end else current - 1
    scene.frame_set(adjacent)
    scene.frame_set(current)
    bpy.context.view_layer.update()


def verify_clearance(scene, configured, maximum_radius, requested_gap):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    active = []
    for obj, shape_index, repeat_index, _slot in configured:
        evaluated = obj.evaluated_get(depsgraph)
        if evaluated.hide_render:
            continue
        radius = local_radius(obj) * max(abs(value) for value in evaluated.scale)
        active.append((obj.name, evaluated.matrix_world.translation.copy(), radius, shape_index, repeat_index))
    closest = None
    for index, left in enumerate(active):
        for right in active[index + 1:]:
            surface_gap = (left[1] - right[1]).length - left[2] - right[2]
            if closest is None or surface_gap < closest[0]:
                closest = (surface_gap, left[0], right[0])
    minimum_gap = closest[0] if closest is not None else math.inf
    if minimum_gap + 1e-4 < requested_gap:
        raise RuntimeError(
            f"Collision-safe placement failed: {closest[1]} and {closest[2]} "
            f"have {minimum_gap:.6f} WU clearance; expected at least {requested_gap:.6f} WU."
        )
    return active, minimum_gap, closest


def update_guide():
    guide = bpy.data.texts.get("README - About Scene")
    if guide is None:
        return
    marker = "SOLID BODY FIELD\n"
    body = guide.as_string()
    if marker in body:
        body = body.split(marker, 1)[0].rstrip() + "\n\n"
    body += marker + (
        "The 24 linked bodies form three deterministic, peripheral layers around\n"
        "Finale Position: six near, ten middle and eight far. About Controls keeps\n"
        "body size, spread, rotation, count, copies, seed and clearance adjustable.\n"
        "Their stable model, object and motion IDs are preserved for export.\n"
    )
    guide.clear()
    guide.write(body)


def main(copies_per_shape=None):
    scene = bpy.context.scene
    controls = find_named(CONTROLS_NAMES)
    path = find_named(PATH_NAMES)
    finale_position = bpy.data.objects.get("Finale Position")
    if controls is None or path is None or path.type != "CURVE" or finale_position is None:
        raise RuntimeError("Missing About Controls, Camera Path, or Finale Position.")
    collection = find_body_collection(scene)

    ensure_control(
        controls, CONTROL_NAMES["body_count"], 5, 4, 6,
        "Number of different solid body shapes repeated in the field.", integer=True,
    )
    ensure_control(
        controls, CONTROL_NAMES["spread"], 1.0, 1.0, 3.0,
        "Extra horizontal and vertical spacing above the collision-safe minimum.",
    )
    ensure_control(
        controls, CONTROL_NAMES["copies"], DEFAULT_COPIES_PER_SHAPE, 1, MAX_COPIES_PER_SHAPE,
        "Number of collision-safe copies generated for each enabled shape.", integer=True,
    )
    if copies_per_shape is not None:
        requested_copies = int(round(float(copies_per_shape)))
        if not 1 <= requested_copies <= MAX_COPIES_PER_SHAPE:
            raise ValueError(
                f"Copies per shape must be between 1 and {MAX_COPIES_PER_SHAPE}."
            )
        controls[CONTROL_NAMES["copies"]] = requested_copies
    ensure_control(
        controls, CONTROL_NAMES["seed"], 1303, 0, 1000000,
        "Seed for deterministic random positions and rotations.", integer=True,
    )
    ensure_control(
        controls, CONTROL_NAMES["gap"], 4.0, 0.5, 40.0,
        "Minimum empty surface distance between every visible body, in world units.",
    )
    if float(controls[CONTROL_NAMES["spread"]]) < 1.0:
        controls[CONTROL_NAMES["spread"]] = 1.0

    for selected in tuple(bpy.context.selected_objects):
        selected.select_set(False)
    controls.select_set(True)
    bpy.context.view_layer.objects.active = controls
    sources = find_source_bodies(scene)
    maximum_radius = max(local_radius(obj) for obj in sources)
    configured, removed = sync_field_objects(
        scene,
        collection,
        sources,
        int(round(float(controls[CONTROL_NAMES["copies"]]))),
    )
    path_length = configure_drivers(
        configured, controls, path, finale_position, maximum_radius,
    )
    refresh_scene(scene, controls)
    active, minimum_gap, closest = verify_clearance(
        scene,
        configured,
        maximum_radius,
        float(controls[CONTROL_NAMES["gap"]]),
    )
    scene["abs_solid_body_field_contract"] = "layered-peripheral-finale-halo/v1"
    scene["abs_solid_body_field_script"] = "scripts/about-v2-blender/parameterize-solid-body-field.py"
    set_internal_value(scene, "abs_solid_body_field_contract", scene["abs_solid_body_field_contract"])
    set_internal_value(scene, "abs_solid_body_field_script", scene["abs_solid_body_field_script"])
    del scene["abs_solid_body_field_contract"]
    del scene["abs_solid_body_field_script"]
    update_guide()
    refresh_scene(scene, controls)
    print(json.dumps({
        "status": "ok",
        "configuredObjects": len(configured),
        "visibleObjects": len(active),
        "enabledShapes": int(controls[CONTROL_NAMES["body_count"]]),
        "copiesPerShape": int(controls[CONTROL_NAMES["copies"]]),
        "randomSeed": int(controls[CONTROL_NAMES["seed"]]),
        "requestedGapWU": round(float(controls[CONTROL_NAMES["gap"]]), 6),
        "measuredMinimumGapWU": round(minimum_gap, 6),
        "closestPair": list(closest[1:]) if closest else [],
        "maximumSourceRadiusWU": round(maximum_radius, 6),
        "pathLengthWU": round(path_length, 6),
        "removedPriorCopies": removed,
        "saved": False,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
