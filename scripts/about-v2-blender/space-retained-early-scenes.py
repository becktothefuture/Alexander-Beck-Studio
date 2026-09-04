#!/usr/bin/env python3
"""Space the retained forms and round tunnel on the director-cut camera rail.

Run inside the canonical About Blender file after rebuild-about-director-cut.py.
The script does not save.
"""

import json
import math
import zlib
from pathlib import Path

import bpy
from mathutils import Vector


PATH_NAME = "ABS_PARAMETRIC_RIDE_PATH"
CONTROLS_NAME = "ABS_DIRECTOR_CUT_CONTROLS"
COLLECTION_NAME = "ABS_DIRECTOR_CUT_EARLY_SPACING"
EARLY_VISIBILITY = {
    "about.00": ("opening", 0.0, "inciting-question", 0.3),
    "about.01": ("inciting-question", -0.3, "portal-entry", 0.3),
    "about.02": ("portal-entry", -0.3, "personal-origin", 0.3),
}
EARLY_VISIBILITY_WU = {
    "about.01": (4.7, 10.3),
}
FORM_BODY_COLLECTION = "ABS_STAGE_01_RECOGNISABLE_BODIES"
FORM_BODY_SPECS = (
    ("cube", (8.5, 11.0, 8.5), (-22.0, 8.0), (0.18, 0.00, -0.12)),
    ("pyramid", (10.0, 10.0, 12.0), (19.0, -8.0), (-0.12, 0.20, 0.16)),
    ("octahedron", (9.5, 9.5, 12.0), (-14.0, 15.0), (0.22, -0.15, 0.08)),
    ("triangular-prism", (11.0, 13.0, 9.0), (23.0, 11.0), (-0.18, 0.12, -0.20)),
    ("icosahedron", (9.5, 9.5, 9.5), (2.0, -16.0), (0.12, -0.18, 0.18)),
    ("hexagonal-prism", (10.0, 12.0, 10.0), (-24.0, -12.0), (-0.15, 0.16, 0.22)),
)
FORM_FACE_MATERIALS = (
    ("atmosphere", "ABS_0_ATMOSPHERE"),
    ("stone", "ABS_1_STONE"),
    ("steel", "ABS_2_STEEL"),
    ("glass", "ABS_3_GLASS"),
    ("signal", "ABS_4_SIGNAL"),
    ("organic", "ABS_5_ORGANIC"),
)


def ensure_control(controls, name, value, minimum, maximum, description):
    if name not in controls:
        controls[name] = value
    controls.id_properties_ui(name).update(
        min=minimum,
        max=maximum,
        soft_min=minimum,
        soft_max=maximum,
        description=description,
    )


def add_property_driver(owner, data_path, controls, property_name, index=None, expression="value"):
    try:
        owner.driver_remove(data_path) if index is None else owner.driver_remove(data_path, index)
    except (TypeError, RuntimeError):
        pass
    curve = owner.driver_add(data_path) if index is None else owner.driver_add(data_path, index)
    variable = curve.driver.variables.new()
    variable.name = "value"
    variable.type = "SINGLE_PROP"
    variable.targets[0].id_type = "OBJECT"
    variable.targets[0].id = controls
    variable.targets[0].data_path = f'["{property_name}"]'
    curve.driver.expression = expression
    return curve


def add_range_driver(constraint, controls, start_property, end_property, fraction):
    try:
        constraint.driver_remove("offset_factor")
    except (TypeError, RuntimeError):
        pass
    curve = constraint.driver_add("offset_factor")
    for variable_name, property_name in (("a", start_property), ("b", end_property)):
        variable = curve.driver.variables.new()
        variable.name = variable_name
        variable.type = "SINGLE_PROP"
        variable.targets[0].id_type = "OBJECT"
        variable.targets[0].id = controls
        variable.targets[0].data_path = f'["{property_name}"]'
    curve.driver.expression = f"a+(b-a)*{fraction:.9f}"


def add_scaled_property_driver(obj, property_name, controls, control_name, fallback_base=None):
    base_name = f"abs_control_base_{property_name}"
    if base_name not in obj or (
        fallback_base is not None and float(obj.get(base_name, 0.0)) <= 0.0
    ):
        if fallback_base is not None:
            obj[property_name] = float(fallback_base)
            obj[base_name] = float(fallback_base)
        else:
            obj[base_name] = float(obj.get(property_name, 1.0))
    if base_name not in obj:
        obj[base_name] = float(obj.get(property_name, 1.0))
    add_property_driver(
        obj,
        f'["{property_name}"]',
        controls,
        control_name,
        expression=f'{float(obj[base_name]):.9f}*value',
    )


def exported_model_objects(scene, model_id):
    return sorted(
        (
            obj for obj in scene.objects
            if str(obj.get("abs_model_id") or "") == model_id
            and obj.type == "MESH"
            and not obj.hide_render
            and obj.get("abs_export", True) is not False
        ),
        key=lambda obj: obj.name,
    )


def apply_visibility_metadata(objects, model_id):
    start_cue, start_offset, end_cue, end_offset = EARLY_VISIBILITY[model_id]
    for obj in objects:
        obj["abs_visibility_start_cue"] = start_cue
        obj["abs_visibility_start_offset_wu"] = start_offset
        obj["abs_visibility_end_cue"] = end_cue
        obj["abs_visibility_end_offset_wu"] = end_offset
        if model_id in EARLY_VISIBILITY_WU:
            start_wu, end_wu = EARLY_VISIBILITY_WU[model_id]
            obj["abs_visibility_start_wu"] = start_wu
            obj["abs_visibility_end_wu"] = end_wu


def remove_previous_collection(scene):
    collection = bpy.data.collections.get(COLLECTION_NAME)
    if collection is None:
        return
    for obj in list(collection.objects):
        # The generated collection should contain only disposable follower
        # empties. Preserve any exported meshes that were manually moved into
        # it so rerunning this script never deletes authored ecosystem geometry.
        if obj.type == "MESH" and str(obj.get("abs_model_id") or "").startswith("about."):
            collection.objects.unlink(obj)
            if not obj.users_collection:
                scene.collection.objects.link(obj)
            continue
        for child in list(obj.children):
            child_world = child.matrix_world.copy()
            child.parent = None
            child.matrix_world = child_world
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)


def create_collection(scene):
    collection = bpy.data.collections.new(COLLECTION_NAME)
    scene.collection.children.link(collection)
    return collection


def ensure_opening_rig(scene, path, controls):
    rig = bpy.data.objects.get("ABS_DC_OPENING_RIG")
    if rig is None:
        rig = bpy.data.objects.new("ABS_DC_OPENING_RIG", None)
        scene.collection.objects.link(rig)
        rig.empty_display_type = "SPHERE"
        rig.empty_display_size = 8.0
        rig["abs_export"] = False
        rig["abs_role"] = "opening-ecosystem-geometry-control"
    for constraint in list(rig.constraints):
        rig.constraints.remove(constraint)
    constraint = rig.constraints.new("FOLLOW_PATH")
    constraint.name = "ABS_DC_OPENING_RAIL"
    constraint.target = path
    constraint.use_fixed_location = True
    constraint.use_curve_follow = True
    constraint.forward_axis = "FORWARD_Y"
    constraint.up_axis = "UP_Z"
    constraint.offset_factor = 0.0
    for axis, property_name in enumerate((
        "opening_width_scale", "opening_depth_scale", "opening_height_scale",
    )):
        add_property_driver(rig, "scale", controls, property_name, index=axis)
    return rig


def place_opening(scene, path, controls):
    opening = exported_model_objects(scene, "about.00")
    apply_visibility_metadata(opening, "about.00")
    opening_bases = {
        "ABS_B27_SIGNAL_FIELD": (0.2, 0.68),
        "ABS_STAR_FIELD": (0.14, 0.68),
        "ABS_B27_SIGNAL_APERTURE": (0.16, 1.65),
        "ABS_B27_OPEN_DEPTH_SHARED_0": (4.0, 0.25),
        "ABS_B27_OPEN_DEPTH_SHARED_1": (10.0, 0.25),
        "ABS_B27_OPEN_DEPTH_SHARED_2": (10.0, 0.25),
        "ABS_B27_OPEN_DEPTH_SHARED_3": (8.0, 0.25),
        "ABS_B27_OPEN_DEPTH_SHARED_4": (1.4, 0.25),
        "ABS_B27_OPEN_DEPTH_DESKTOP_0": (4.0, 0.25),
        "ABS_B27_OPEN_DEPTH_DESKTOP_1": (10.0, 0.25),
        "ABS_B27_OPEN_DEPTH_DESKTOP_2": (10.0, 0.25),
        "ABS_B27_OPEN_DEPTH_DESKTOP_3": (8.0, 0.25),
        "ABS_B27_OPEN_DEPTH_DESKTOP_4": (1.4, 0.25),
        "ABS_B27_OPEN_SAFE_0": (40.0, 0.12),
        "ABS_B27_OPEN_SAFE_1": (40.0, 0.12),
        "ABS_B27_OPEN_SAFE_2": (40.0, 0.12),
        "ABS_B27_OPEN_SAFE_3": (40.0, 0.12),
    }
    rig = ensure_opening_rig(scene, path, controls)
    for obj in opening:
        if obj.name == "ABS_B27_NEBULA_FIELD":
            obj.name = "ABS_STAR_FIELD"
            obj["abs_geometry_kind"] = "star-field"
            obj["abs_designer_label"] = "Star field"
        if obj.parent != rig:
            world = obj.matrix_world.copy()
            obj.parent = rig
            obj.matrix_parent_inverse = rig.matrix_world.inverted()
            obj.matrix_world = world
        density_base, point_base = opening_bases.get(obj.name, (1.0, 1.0))
        add_scaled_property_driver(
            obj, "abs_point_density", controls, "opening_density_scale", density_base,
        )
        add_scaled_property_driver(
            obj, "abs_surfel_radius_scale", controls, "opening_point_scale", point_base,
        )
        obj["abs_parameter_owner"] = controls.name
        if obj.name.startswith("ABS_B27_OPEN_DEPTH_") or obj.name.startswith("ABS_B27_OPEN_SAFE_"):
            obj["abs_sampling_pattern"] = "row-column-grid"
        else:
            obj["abs_sampling_pattern"] = "surface-blue-noise"
    return len(opening)


def local_centroid(obj):
    return sum((vertex.co for vertex in obj.data.vertices), Vector()) / len(obj.data.vertices)


def centre_mesh_once(obj):
    current_centre = local_centroid(obj)
    stored_original = Vector(obj.get("abs_director_cut_original_centroid", current_centre))
    shape_keys = obj.data.shape_keys
    if shape_keys and shape_keys.key_blocks:
        basis = shape_keys.key_blocks[0]
        basis_centre = sum((point.co for point in basis.data), Vector()) / len(basis.data)
        if basis_centre.length > 0.0001:
            for key_block in shape_keys.key_blocks:
                for point in key_block.data:
                    point.co -= basis_centre
            shape_keys.update_tag()
    if obj.get("abs_director_cut_mesh_centred"):
        # Earlier interrupted rebuilds could save the marker while retaining
        # world-space mesh coordinates. Repair that state instead of trusting
        # the flag and placing the form hundreds of units ahead of its rig.
        if current_centre.length > 0.0001:
            for vertex in obj.data.vertices:
                vertex.co -= current_centre
            obj.data.update()
        return stored_original
    for vertex in obj.data.vertices:
        vertex.co -= current_centre
    obj.data.update()
    obj["abs_director_cut_mesh_centred"] = True
    obj["abs_director_cut_original_centroid"] = list(current_centre)
    return current_centre


def form_body_geometry(kind):
    if kind == "cube":
        return (
            [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1),
             (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)],
            [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1),
             (1, 5, 6, 2), (2, 6, 7, 3), (4, 0, 3, 7)],
        )
    if kind == "pyramid":
        return (
            [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1), (0, 0, 1.25)],
            [(0, 3, 2, 1), (0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)],
        )
    if kind == "octahedron":
        return (
            [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)],
            [(0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4),
             (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)],
        )
    if kind == "triangular-prism":
        return (
            [(-1, -1, -0.85), (1, -1, -0.85), (0, -1, 1.15),
             (-1, 1, -0.85), (1, 1, -0.85), (0, 1, 1.15)],
            [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)],
        )
    if kind == "icosahedron":
        phi = (1.0 + math.sqrt(5.0)) / 2.0
        return (
            [(-1, phi, 0), (1, phi, 0), (-1, -phi, 0), (1, -phi, 0),
             (0, -1, phi), (0, 1, phi), (0, -1, -phi), (0, 1, -phi),
             (phi, 0, -1), (phi, 0, 1), (-phi, 0, -1), (-phi, 0, 1)],
            [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11),
             (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
             (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9),
             (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)],
        )
    if kind == "hexagonal-prism":
        vertices = []
        for y in (-1.0, 1.0):
            vertices.extend((math.cos(index * math.pi / 3), y, math.sin(index * math.pi / 3))
                            for index in range(6))
        faces = [(5, 4, 3, 2, 1, 0), (6, 7, 8, 9, 10, 11)]
        faces.extend((index, (index + 1) % 6, 6 + (index + 1) % 6, 6 + index)
                     for index in range(6))
        return vertices, faces
    raise RuntimeError(f"Unsupported parametric body kind: {kind}")


def ensure_form_face_materials():
    materials = []
    for slot, (role, name) in enumerate(FORM_FACE_MATERIALS):
        material = bpy.data.materials.get(name)
        if material is None:
            raise RuntimeError(f"Missing semantic material {name}.")
        material["abs_palette_slot"] = slot
        material["abs_material_role"] = role
        materials.append(material)
    return materials


def rebuild_parametric_form_bodies(scene):
    stage = bpy.data.collections.get(FORM_BODY_COLLECTION)
    if stage is None:
        stage = bpy.data.collections.new(FORM_BODY_COLLECTION)
        scene.collection.children.link(stage)
    # Keep Blender and the MCP bridge on a stable object while the former
    # selected form objects are removed.
    controls = bpy.data.objects.get(CONTROLS_NAME)
    for selected in tuple(bpy.context.selected_objects):
        selected.select_set(False)
    if controls is not None:
        controls.select_set(True)
        bpy.context.view_layer.objects.active = controls
    for obj in list(scene.objects):
        if (str(obj.get("abs_model_id") or "") != "about.01"
                and not obj.name.startswith(("ABS_B27_SHAPE_", "ABS_FORM_BODY_"))):
            continue
        mesh = obj.data if obj.type == "MESH" else None
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh is not None and mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    materials = ensure_form_face_materials()
    bodies = []
    for index, (kind, dimensions, offset, rotation) in enumerate(FORM_BODY_SPECS):
        vertices, faces = form_body_geometry(kind)
        vertices = [tuple(coordinate * dimensions[axis] for axis, coordinate in enumerate(vertex))
                    for vertex in vertices]
        mesh = bpy.data.meshes.new(f"ABS_FORM_BODY_{index:02d}_MESH")
        mesh.from_pydata(vertices, [], faces)
        mesh.validate(verbose=False)
        mesh.update()
        obj = bpy.data.objects.new(f"ABS_FORM_BODY_{index:02d}_{kind.upper().replace('-', '_')}", mesh)
        stage.objects.link(obj)
        for material in materials:
            mesh.materials.append(material)
        for polygon in mesh.polygons:
            polygon.material_index = (polygon.index + index * 2) % len(materials)
            polygon.use_smooth = False
        obj.display_type = "TEXTURED"
        obj.show_transparent = False
        obj.color = materials[index % len(materials)].diffuse_color
        obj["abs_export"] = True
        obj["abs_model_id"] = "about.01"
        obj["abs_object_id"] = f"director.form-body.{index:02d}"
        obj["abs_role"] = "narrative-world"
        obj["abs_motion_group"] = "about.01.coherent"
        obj["abs_reveal_group"] = "about.01"
        obj["abs_density_group"] = "about.01"
        obj["abs_component_policy"] = "semantic-material-projected-coverage"
        obj["abs_point_density"] = 1.0
        obj["abs_feature_priority"] = 1.2
        obj["abs_surfel_radius_scale"] = 2.25
        obj["abs_min_profile"] = "mobile"
        obj["abs_sampling_pattern"] = "surface-blue-noise"
        obj["abs_geometry_kind"] = f"solid-parametric-{kind}"
        obj["abs_forms_body_index"] = index
        obj["abs_opaque_body"] = True
        obj["abs_palette_mode"] = "authored-faces"
        obj["abs_palette_seed"] = (
            zlib.crc32(obj["abs_object_id"].encode("utf-8")) & 0x7FFFFFFF
        )
        obj["abs_designer_label"] = f"Parametric solid {index + 1}: {kind}"
        obj["abs_forms_lateral_offset"] = offset[0]
        obj["abs_forms_vertical_offset"] = offset[1]
        obj["abs_forms_rotation_x"] = rotation[0]
        obj["abs_forms_rotation_y"] = rotation[1]
        obj["abs_forms_rotation_z"] = rotation[2]
        bodies.append(obj)
    return bodies


def add_direct_path_constraint(obj, path, name):
    for existing in list(obj.constraints):
        obj.constraints.remove(existing)
    constraint = obj.constraints.new("FOLLOW_PATH")
    constraint.name = name
    constraint.target = path
    constraint.use_fixed_location = True
    constraint.use_curve_follow = True
    constraint.forward_axis = "FORWARD_Y"
    constraint.up_axis = "UP_Z"
    return constraint


def place_forms(scene, collection, path, controls):
    forms = rebuild_parametric_form_bodies(scene)
    apply_visibility_metadata(forms, "about.01")
    visible_count = max(4, min(6, int(round(float(controls["forms_body_count"])))))
    for index, obj in enumerate(forms):
        fraction = index / max(1, len(forms) - 1)
        constraint = add_direct_path_constraint(obj, path, f"ABS_DC_FORM_RAIL_{index:02d}")
        add_range_driver(constraint, controls, "forms_start_progress", "forms_end_progress", fraction)
        obj.parent = None
        lateral = float(obj["abs_forms_lateral_offset"])
        vertical = float(obj["abs_forms_vertical_offset"])
        obj.location = (lateral, 0.0, vertical)
        obj.rotation_euler = (
            float(obj["abs_forms_rotation_x"]),
            float(obj["abs_forms_rotation_y"]),
            float(obj["abs_forms_rotation_z"]),
        )
        add_property_driver(
            obj, "location", controls, "forms_lateral_spread", index=0,
            expression=f"{lateral:.9f}*value",
        )
        add_property_driver(
            obj, "location", controls, "forms_vertical_spread", index=2,
            expression=f"{vertical:.9f}*value",
        )
        rotation_y = float(obj["abs_forms_rotation_y"])
        add_property_driver(
            obj, "rotation_euler", controls, "forms_rotation_turns", index=1,
            expression=f"{rotation_y:.9f}+value*{2.0 * math.pi * fraction:.9f}",
        )
        for axis in range(3):
            add_property_driver(obj, "scale", controls, "forms_body_scale", index=axis)
        add_scaled_property_driver(obj, "abs_point_density", controls, "forms_density_scale", 1.0)
        add_scaled_property_driver(obj, "abs_surfel_radius_scale", controls, "forms_point_scale", 2.25)
        obj.hide_viewport = index >= visible_count
        obj.hide_render = index >= visible_count
        add_property_driver(
            obj, "hide_viewport", controls, "forms_body_count",
            expression=f"value<={index}",
        )
        add_property_driver(
            obj, "hide_render", controls, "forms_body_count",
            expression=f"value<={index}",
        )
        obj["abs_parameter_owner"] = controls.name
    ambient = bpy.data.objects.get("ABS_B27_AMBIENT_01")
    if ambient is not None:
        ambient["abs_export"] = False
    return len(forms)


def place_round_tunnel(scene, collection, path, controls):
    hoops = sorted(
        (obj for obj in scene.objects if str(obj.get("abs_model_id") or "") == "about.02"
         and obj.get("abs_geometry_kind") == "curved-round-tunnel-hoop"
         and obj.get("abs_export", True) is not False),
        key=lambda obj: obj.name,
    )
    apply_visibility_metadata(hoops, "about.02")
    for index, obj in enumerate(hoops):
        centre_mesh_once(obj)
        fraction = index / max(1, len(hoops) - 1)
        constraint = add_direct_path_constraint(obj, path, f"ABS_DC_ROUND_RAIL_{index:02d}")
        add_range_driver(constraint, controls, "round_tunnel_start_progress", "round_tunnel_end_progress", fraction)
        obj.parent = None
        obj.location = (0.0, 0.0, 0.0)
        obj.rotation_euler = (0.0, 0.0, 0.0)
        add_property_driver(obj, "scale", controls, "round_tunnel_radius_scale", index=0)
        add_property_driver(obj, "scale", controls, "round_tunnel_depth_scale", index=1)
        add_property_driver(obj, "scale", controls, "round_tunnel_radius_scale", index=2)
        add_scaled_property_driver(
            obj, "abs_point_density", controls, "round_tunnel_density_scale", 1.55,
        )
        add_scaled_property_driver(
            obj, "abs_surfel_radius_scale", controls, "round_tunnel_point_scale", 1.12,
        )
        for property_name, control_name in (
            ("abs_aperture_radius_wu", "round_tunnel_radius_scale"),
            ("abs_aperture_rim_wu", "round_tunnel_radius_scale"),
            ("abs_aperture_half_depth_wu", "round_tunnel_depth_scale"),
        ):
            if property_name in obj:
                add_scaled_property_driver(obj, property_name, controls, control_name)
        obj["abs_parameter_owner"] = controls.name
    ambient = bpy.data.objects.get("ABS_B27_AMBIENT_02")
    if ambient is not None:
        ambient["abs_export"] = False

    # Keep one authored tunnel silhouette. The rectangular stage-02 corridor
    # used to sit behind the hoops and read as a second, offset passage when
    # several rings were visible at once.
    duplicate_corridor = bpy.data.objects.get("ABS_DC_AMBIENT_CORRIDOR_02")
    if duplicate_corridor is not None:
        duplicate_corridor["abs_export"] = False
    return len(hoops)


def corridor_mesh(name, collection, y_start, y_end, half_width, floor_z, ceiling_z):
    vertices = [
        (-half_width, y_start, floor_z), (-half_width, y_end, floor_z),
        (-half_width, y_end, ceiling_z), (-half_width, y_start, ceiling_z),
        (half_width, y_start, floor_z), (half_width, y_end, floor_z),
        (half_width, y_end, ceiling_z), (half_width, y_start, ceiling_z),
    ]
    faces = [
        (0, 1, 2, 3), (4, 7, 6, 5),
        (0, 4, 5, 1), (3, 2, 6, 7),
    ]
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj


def copy_semantics(source, target, model_id, object_id):
    for key in source.keys():
        if str(key).startswith("abs_"):
            target[key] = source[key]
    target["abs_export"] = True
    target["abs_model_id"] = model_id
    target["abs_object_id"] = object_id
    target["abs_geometry_kind"] = "ambient-depth-corridor"
    target["abs_component_policy"] = "semantic-material-projected-coverage"
    target["abs_point_density"] = 0.42
    target["abs_surfel_radius_scale"] = 0.22
    target["abs_feature_priority"] = 0.6
    target["abs_connected_surface"] = False
    target["abs_ambient_continuity"] = True


def add_early_corridors(scene, collection):
    material = bpy.data.materials.get("ABS_0_ATMOSPHERE")
    specs = (
        ("about.01", "ABS_DC_AMBIENT_CORRIDOR_01", 185.0, 330.0, 78.0, -48.0, 66.0),
    )
    created = []
    for model_id, name, start, end, width, floor, ceiling in specs:
        source = next(
            obj for obj in scene.objects
            if str(obj.get("abs_model_id") or "") == model_id and obj.get("abs_export", True) is not False
        )
        obj = corridor_mesh(name, collection, start, end, width, floor, ceiling)
        if material is not None:
            obj.data.materials.append(material)
        copy_semantics(source, obj, model_id, f"director.ambient-corridor.{model_id}")
        created.append(obj.name)
    return created


def recompile_new_control_drivers(scene, controls):
    # Blender can leave drivers invalid when their target ID properties were
    # created earlier in the same Python evaluation. Reassigning the expression
    # recompiles it without changing the authored formula.
    model_ids = {"about.00", "about.01", "about.02"}
    targets = [
        obj for obj in scene.objects
        if obj.name == "ABS_DC_OPENING_RIG"
        or str(obj.get("abs_model_id") or "") in model_ids
    ]
    for obj in targets:
        driver_sets = []
        if obj.animation_data is not None:
            driver_sets.append(obj.animation_data.drivers)
        if obj.type == "MESH" and obj.data.shape_keys and obj.data.shape_keys.animation_data:
            driver_sets.append(obj.data.shape_keys.animation_data.drivers)
        for drivers in driver_sets:
            for curve in drivers:
                expression = curve.driver.expression
                curve.driver.expression = f"({expression})+0"
                curve.driver.expression = expression
    controls.update_tag(refresh={"OBJECT"})
    current = scene.frame_current
    adjacent = current + 1 if current < scene.frame_end else current - 1
    scene.frame_set(adjacent)
    scene.frame_set(current)
    bpy.context.view_layer.update()


def update_blender_guide():
    guide = bpy.data.texts.get("ABOUT_DIRECTOR_CUT_README")
    if guide is None:
        return
    marker = "PARAMETRIC FORMS\n"
    body = guide.as_string()
    if marker in body:
        body = body.split(marker, 1)[0].rstrip() + "\n\n"
    body += marker + (
        "ABS_FORM_BODY_00 through ABS_FORM_BODY_05 are closed, opaque bodies.\n"
        "Use forms_body_count to show and export 4, 5, or 6 bodies.\n"
        "Use forms_body_scale, forms_lateral_spread, forms_vertical_spread, and\n"
        "forms_rotation_turns to tune the composition. Each polygon uses a semantic\n"
        "face material; website code maps those roles to the Home ball palette.\n"
    )
    guide.clear()
    guide.write(body)


def main():
    scene = bpy.context.scene
    path = bpy.data.objects[PATH_NAME]
    controls = bpy.data.objects[CONTROLS_NAME]
    ensure_control(controls, "opening_width_scale", 1.0, 0.35, 2.5, "Opening field width.")
    ensure_control(controls, "opening_depth_scale", 0.72, 0.2, 1.5, "Opening field depth along the rail.")
    ensure_control(controls, "opening_height_scale", 1.0, 0.35, 2.5, "Opening field vertical span.")
    ensure_control(controls, "opening_density_scale", 1.0, 0.2, 3.0, "Opening export point-density multiplier.")
    ensure_control(controls, "opening_point_scale", 1.0, 0.35, 2.5, "Opening exported point-size multiplier.")
    ensure_control(controls, "forms_start_progress", 0.155, 0.14, 0.22, "Start of the recognisable-forms ecosystem.")
    ensure_control(controls, "forms_end_progress", 0.28, 0.22, 0.285714, "End of the recognisable-forms ecosystem.")
    ensure_control(controls, "forms_body_count", 5, 4, 6, "Number of solid recognisable bodies exported and rendered.")
    ensure_control(controls, "forms_body_scale", 1.0, 0.5, 2.5, "Scale of each recognisable form.")
    ensure_control(controls, "forms_lateral_spread", 1.0, 0.35, 3.0, "Recognisable-form horizontal spread around the rail.")
    ensure_control(controls, "forms_vertical_spread", 1.0, 0.35, 3.0, "Recognisable-form vertical spread around the rail.")
    ensure_control(controls, "forms_rotation_turns", 0.18, -1.0, 1.0, "Total body rotation across the forms passage.")
    if "forms_internal_path_progression" in controls:
        del controls["forms_internal_path_progression"]
    ensure_control(controls, "forms_density_scale", 1.0, 0.2, 3.0, "Recognisable-form export point-density multiplier.")
    ensure_control(controls, "forms_point_scale", 1.0, 0.35, 2.5, "Recognisable-form exported point-size multiplier.")
    ensure_control(controls, "round_tunnel_start_progress", 0.28571429, 0.27, 0.34, "Start of the curved round-tunnel ecosystem.")
    ensure_control(controls, "round_tunnel_end_progress", 0.42857143, 0.38, 0.44, "End of the curved round-tunnel ecosystem.")
    ensure_control(controls, "round_tunnel_ring_count", 28, 8, 40, "Number of generated round tunnel hoops.")
    ensure_control(controls, "round_tunnel_aperture_radius_wu", 7.38, 3.0, 24.0, "Clear radius of every round tunnel opening.")
    ensure_control(controls, "round_tunnel_rim_wu", 0.42, 0.15, 4.0, "Radial thickness of every round tunnel hoop.")
    ensure_control(controls, "round_tunnel_half_depth_wu", 0.22, 0.08, 4.0, "Half-depth of each round tunnel hoop along the rail.")
    ensure_control(controls, "round_tunnel_density_scale", 1.0, 0.2, 3.0, "Round-tunnel export point-density multiplier.")
    ensure_control(controls, "round_tunnel_point_scale", 1.0, 0.35, 2.5, "Round-tunnel exported point-size multiplier.")
    remove_previous_collection(scene)
    opening = place_opening(scene, path, controls)
    forms = place_forms(scene, None, path, controls)
    # The passage parameterizer below owns the complete round-tunnel family.
    # Do not recreate the former one-mesh-per-hoop layer stack here.
    hoops = 0
    # The forms and hoops are legible without an extra rectangular particle
    # corridor behind them.
    corridors = []
    controls["abs_note"] = (
        "Blender owns camera, every visible geometry, stage visibility and draw-distance fog. "
        "Adjust the star field, opening walls, forms, round tunnel, terrain, square gates, "
        "horizon banks and finale here. Website code reads those values and applies the Home palette."
    )
    scene["abs_retained_scene_spacing"] = "separated-seven-ecosystems-on-double-length-camera-rail"
    recompile_new_control_drivers(scene, controls)
    update_blender_guide()
    parameterize_path = str(Path(__file__).with_name("parameterize-passage-families.py"))
    namespace = {"__name__": "__main__", "__file__": parameterize_path}
    with open(parameterize_path, "r", encoding="utf-8") as handle:
        source = handle.read()
    exec(compile(source, parameterize_path, "exec"), namespace)
    palette_path = str(Path(__file__).with_name("apply-semantic-palette-system.py"))
    namespace = {"__name__": "__main__", "__file__": palette_path}
    with open(palette_path, "r", encoding="utf-8") as handle:
        source = handle.read()
    exec(compile(source, palette_path, "exec"), namespace)
    simplify_path = str(Path(__file__).with_name("simplify-authoring-controls.py"))
    namespace = {"__name__": "__main__", "__file__": simplify_path}
    with open(simplify_path, "r", encoding="utf-8") as handle:
        source = handle.read()
    exec(compile(source, simplify_path, "exec"), namespace)
    print(json.dumps({"openingObjects": opening, "forms": forms, "roundHoops": hoops, "corridors": corridors, "saved": False}))


if __name__ == "__main__":
    main()
