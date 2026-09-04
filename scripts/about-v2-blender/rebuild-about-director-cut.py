#!/usr/bin/env python3
"""Build the editable, Blender-authoritative About director cut.

The opening field, recognisable forms, and round tunnel remain intact. The
later half is replaced by four legible environments: terrain, square gates,
two horizon banks, and one boundless finale plane. A sparse Bezier rail owns
camera position and roll. The website exporter samples the evaluated camera,
so browser scroll follows this Blender scene exactly.

Run inside the canonical About Blender file. The script does not save.
"""

import json
import math
import zlib

import bpy
from mathutils import Vector


VERSION = 4
PATH_LENGTH_SCALE = 2.0
PATH_NAME = "ABS_PARAMETRIC_RIDE_PATH"
CAMERA_NAME = "ABS_CAMERA"
CONTROLS_NAME = "ABS_DIRECTOR_CUT_CONTROLS"
CAMERA_FOLLOWER_NAME = "ABS_CAMERA_PATH_FOLLOWER"
CAMERA_COLLECTION_NAME = "ABS_CAMERA_RIG"
SCENE_COLLECTION_NAME = "ABS_DIRECTOR_CUT_LATER_SCENES"
BACKUP_PATH_NAME = "ABS_PRE_DIRECTOR_CUT_RIDE_PATH"
README_NAME = "ABOUT_DIRECTOR_CUT_README"

BASE_PATH_POINTS = (
    (0.0, 100.0, 2.0),
    (0.0, 155.0, 2.0),
    (-4.0, 210.0, -2.0),
    (-9.0, 260.0, 1.0),
    (0.0, 324.0, 2.0),
    (24.0, 470.0, 5.0),
    (-24.0, 625.0, 12.0),
    (28.0, 780.0, 14.0),
    (12.0, 900.0, 8.0),
    (0.0, 1050.0, 5.0),
)

# Keep the authored starting frame fixed and double the complete three-dimensional
# journey around it. All path-following ecosystems retain their orientation while
# gaining real camera travel between them.
PATH_ANCHOR = Vector(BASE_PATH_POINTS[0])
PATH_POINTS = tuple(
    tuple(PATH_ANCHOR + ((Vector(point) - PATH_ANCHOR) * PATH_LENGTH_SCALE))
    for point in BASE_PATH_POINTS
)

ROLL_DEGREES = (0.0, 0.0, -2.0, -3.0, 0.0, -5.0, 6.0, -4.0, 2.0, 0.0)

STAGE_WINDOWS = {
    "about.03": {
        "stage": "03",
        "start": 14.7,
        "end": 20.3,
        "start_cue": "personal-origin",
        "end_cue": "gate-entry",
        "start_offset": -0.3,
        "end_offset": 0.3,
    },
    "about.04": {
        "stage": "04",
        "start": 19.7,
        "end": 25.3,
        "start_cue": "gate-entry",
        "end_cue": "method",
        "start_offset": -0.3,
        "end_offset": 0.3,
    },
    "about.05": {
        "stage": "05",
        "start": 24.7,
        "end": 30.3,
        "start_cue": "method",
        "end_cue": "split-lattice-entry",
        "start_offset": -0.3,
        "end_offset": 0.3,
    },
    "about.06": {
        "stage": "06",
        "start": 29.7,
        "end": 35.3,
        "start_cue": "split-lattice-entry",
        "end_cue": "terminal-hold",
        "start_offset": -0.3,
        "end_offset": 0.3,
    },
}


def ensure_collection(name, parent):
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
    if parent and collection.name not in {child.name for child in parent.children}:
        parent.children.link(collection)
    return collection


def unlink_and_remove_object(obj):
    if obj is not None:
        bpy.data.objects.remove(obj, do_unlink=True)


def remove_helper_preserving_children(obj):
    if obj is None:
        return
    for child in list(obj.children):
        child_world = child.matrix_world.copy()
        child.parent = None
        child.matrix_world = child_world
    unlink_and_remove_object(obj)


def clear_previous_director_cut(scene):
    collection = bpy.data.collections.get(SCENE_COLLECTION_NAME)
    if collection is not None:
        for obj in list(collection.all_objects):
            unlink_and_remove_object(obj)
        bpy.data.collections.remove(collection)
    disposable_names = {
        CONTROLS_NAME,
        CAMERA_FOLLOWER_NAME,
        "ABS_B27_CONTROLS_INERT_ARCHIVE",
        "ABS_WORLD_CONTROLS",
        "ABS_SQUARE_ROLLERCOASTER_CONTROLS",
        "ABS_LATTICE_PATH_ANCHOR",
        "ABS_CAMERA_FINALE_AIM",
        "ABS_AUTHORING_CONTROLS",
        "ABS_RIG_OPENING_FIELD",
        "ABS_RIG_SHAPE_FIELD",
        "ABS_RIG_CAMERA_AND_ROUND_HOOPS",
        "ABS_RIG_FLOOR_MOUNTAINS",
        "ABS_RIG_METHOD_FIELD",
        "ABS_RIG_FINALE_FIELD",
    }
    disposable_prefixes = (
        "ABS_RIG_ABS_B27_SHAPE_",
        "ABS_RIG_ABS_B27_ROUND_HOOP_",
        "ABS_DC_FORM_FOLLOWER_",
        "ABS_DC_ROUND_FOLLOWER_",
        "ABS_DC_GATE_FOLLOWER_",
        "ABS_TEXT_PROXY_",
    )
    for obj in list(scene.objects):
        if obj.type == "EMPTY" and (
            obj.name in disposable_names or obj.name.startswith(disposable_prefixes)
        ):
            remove_helper_preserving_children(obj)


def move_object_to_collection(obj, collection):
    if collection not in obj.users_collection:
        collection.objects.link(obj)
    for current in list(obj.users_collection):
        if current != collection:
            current.objects.unlink(obj)


def add_control(controls, name, value, minimum, maximum, description):
    controls[name] = value
    ui = controls.id_properties_ui(name)
    ui.update(min=minimum, max=maximum, soft_min=minimum, soft_max=maximum, description=description)


def driver_from_property(owner, data_path, controls, property_name, index=None, expression="value"):
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


def driver_scaled_property(obj, property_name, controls, control_name):
    base_name = f"abs_control_base_{property_name}"
    if base_name not in obj:
        obj[base_name] = float(obj.get(property_name, 1.0))
    base = float(obj[base_name])
    driver_from_property(
        obj,
        f'["{property_name}"]',
        controls,
        control_name,
        expression=f"{base:.9f}*value",
    )


def driver_axis_scale(obj, controls, property_names):
    for axis, property_name in enumerate(property_names):
        driver_from_property(obj, "scale", controls, property_name, index=axis)


def build_controls(collection):
    controls = bpy.data.objects.new(CONTROLS_NAME, None)
    collection.objects.link(controls)
    controls.empty_display_type = "CUBE"
    controls.empty_display_size = 8.0
    controls["abs_export"] = False
    controls["abs_role"] = "about-director-cut-controls"
    controls["abs_version"] = VERSION
    controls["abs_note"] = (
        "Edit the Bezier handles on ABS_PARAMETRIC_RIDE_PATH for camera position. "
        "Use roll_00_degrees through roll_09_degrees for camera bank. Stage progress "
        "moves terrain, gate, bank and finale rigs along that same rail."
    )
    for index, degrees in enumerate(ROLL_DEGREES):
        add_control(
            controls,
            f"roll_{index:02d}_degrees",
            degrees,
            -45.0,
            45.0,
            f"Camera roll at Bezier handle {index:02d}.",
        )
    add_control(controls, "camera_horizontal_fov_degrees", 78.0, 55.0, 100.0, "Exported horizontal camera field of view.")
    add_control(controls, "camera_draw_start_wu", 14.0, 0.0, 40.0, "Clear camera distance before Blender and web fog begins.")
    add_control(controls, "camera_draw_end_wu", 150.0, 20.0, 240.0, "Camera distance where Blender and web geometry is fully hidden.")
    add_control(controls, "camera_fog_curve", 1.2, 0.45, 2.5, "Shared Blender and web distance-fog curve.")
    add_control(controls, "scene_visibility_fade_wu", 0.3, 0.05, 1.0, "Shared fade distance between adjacent ecosystems.")
    add_control(controls, "terrain_progress", 0.5, 0.43, 0.57, "Position of the terrain scene along the camera rail.")
    add_control(controls, "terrain_width_scale", 1.15, 0.5, 3.0, "Terrain width across the camera.")
    add_control(controls, "terrain_depth_scale", 1.0, 0.5, 3.0, "Terrain length along the camera rail.")
    add_control(controls, "terrain_height_scale", 1.1, 0.35, 2.5, "Terrain relief and vertical scale.")
    add_control(controls, "terrain_vertical_offset", 5.0, -30.0, 30.0, "Terrain vertical offset in Blender units.")
    add_control(controls, "terrain_density_scale", 1.0, 0.2, 3.0, "Terrain export point-density multiplier.")
    add_control(controls, "terrain_point_scale", 1.0, 0.35, 2.5, "Terrain exported point-size multiplier.")
    add_control(controls, "square_gate_start_progress", 0.57142857, 0.55, 0.64, "First square gate position on the camera rail.")
    add_control(controls, "square_gate_end_progress", 0.71428571, 0.66, 0.73, "Last square gate position on the camera rail.")
    add_control(controls, "square_gate_count", 16, 8, 24, "Number of generated square gates.")
    add_control(controls, "square_gate_half_width_wu", 7.6, 3.0, 28.0, "Clear half-width of every square gate.")
    add_control(controls, "square_gate_half_height_wu", 7.6, 3.0, 28.0, "Clear half-height of every square gate.")
    add_control(controls, "square_gate_rim_wu", 1.1, 0.2, 5.0, "Thickness of every square gate rim.")
    add_control(controls, "square_gate_half_depth_wu", 0.55, 0.1, 5.0, "Half-depth of every square gate along the rail.")
    add_control(controls, "square_gate_roll_turns", 0.35, -1.0, 1.0, "Total visual gate twist across the passage.")
    add_control(controls, "square_gate_density_scale", 1.0, 0.2, 3.0, "Square-gate export point-density multiplier.")
    add_control(controls, "square_gate_point_scale", 1.0, 0.35, 2.5, "Square-gate exported point-size multiplier.")
    add_control(controls, "horizon_banks_progress", 0.78571429, 0.72, 0.84, "Position of the two horizon banks.")
    add_control(controls, "horizon_banks_width_scale", 0.82, 0.5, 3.0, "Horizon-bank lateral spread.")
    add_control(controls, "horizon_banks_depth_scale", 0.8, 0.4, 3.0, "Horizon-bank length along the rail.")
    add_control(controls, "horizon_banks_height_scale", 1.25, 0.35, 2.5, "Horizon-bank vertical relief.")
    add_control(controls, "horizon_banks_density_scale", 1.0, 0.2, 3.0, "Horizon-bank export point-density multiplier.")
    add_control(controls, "horizon_banks_point_scale", 1.0, 0.35, 2.5, "Horizon-bank exported point-size multiplier.")
    add_control(controls, "finale_progress", 0.92857143, 0.86, 0.98, "Position of the boundless finale surface.")
    add_control(controls, "finale_width_scale", 1.25, 0.6, 3.5, "Finale surface width and viewport overscan.")
    add_control(controls, "finale_depth_scale", 1.0, 0.5, 3.5, "Finale surface length along the rail.")
    add_control(controls, "finale_height_scale", 1.0, 0.35, 2.5, "Finale surface vertical relief.")
    add_control(controls, "finale_vertical_offset", 0.0, -30.0, 30.0, "Finale surface vertical offset in Blender units.")
    add_control(controls, "finale_density_scale", 1.0, 0.2, 3.0, "Finale export point-density multiplier.")
    add_control(controls, "finale_point_scale", 1.0, 0.35, 2.5, "Finale exported point-size multiplier.")
    return controls


def backup_path(path, guide_collection):
    existing = bpy.data.objects.get(BACKUP_PATH_NAME)
    if existing is not None:
        return existing
    backup = path.copy()
    backup.data = path.data.copy()
    backup.name = BACKUP_PATH_NAME
    backup.data.name = f"{BACKUP_PATH_NAME}_CURVE"
    guide_collection.objects.link(backup)
    backup.hide_viewport = True
    backup.hide_render = True
    backup["abs_export"] = False
    backup["abs_role"] = "pre-director-cut-camera-path-backup"
    return backup


def build_authoring_path(path, controls):
    old_data = path.data
    curve = bpy.data.curves.new(f"{PATH_NAME}_CURVE_V{VERSION}", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 32
    curve.render_resolution_u = 32
    curve.twist_mode = "Z_UP"
    curve.twist_smooth = 12
    curve.use_path = True
    curve.path_duration = 100
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(PATH_POINTS) - 1)
    for index, (point, coordinate) in enumerate(zip(spline.bezier_points, PATH_POINTS)):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
        point.radius = 1.0
        point.tilt = math.radians(ROLL_DEGREES[index])
    path.data = curve
    if old_data.users == 0:
        old_data.name = "ABS_PRE_DIRECTOR_CUT_ORIGINAL_CURVE_DATA"
    path.location = (0.0, 0.0, 0.0)
    path.rotation_euler = (0.0, 0.0, 0.0)
    path.scale = (1.0, 1.0, 1.0)
    path.hide_viewport = False
    path.hide_render = True
    path["abs_export"] = False
    path["abs_role"] = "editable-camera-rail"
    path["abs_authoring_contract"] = "sparse-bezier-camera-position-and-tilt"
    path["abs_control_point_count"] = len(PATH_POINTS)
    path["abs_edit_instruction"] = (
        "Edit the ten Bezier handles in Edit Mode. Camera and stage geometry evaluate "
        "from this curve. Camera roll comes from ABS_DIRECTOR_CUT_CONTROLS roll properties."
    )
    for index in range(len(PATH_POINTS)):
        data_path = f"splines[0].bezier_points[{index}].tilt"
        driver_from_property(curve, data_path, controls, f"roll_{index:02d}_degrees", expression="value*pi/180")
    return path


def add_follow_path_constraint(obj, path, name, progress=None):
    constraint = obj.constraints.new("FOLLOW_PATH")
    constraint.name = name
    constraint.target = path
    constraint.use_fixed_location = True
    constraint.use_curve_follow = True
    constraint.forward_axis = "FORWARD_Y"
    constraint.up_axis = "UP_Z"
    if progress is not None:
        constraint.offset_factor = progress
    return constraint


def build_camera_rig(scene, path, controls, camera_collection):
    camera = bpy.data.objects.get(CAMERA_NAME)
    if camera is None or camera.type != "CAMERA":
        raise RuntimeError("ABS_CAMERA is required.")
    old_action = camera.animation_data.action if camera.animation_data else None
    if old_action and not old_action.name.startswith("ABS_PRE_DIRECTOR_CUT_"):
        old_action.name = "ABS_PRE_DIRECTOR_CUT_CAMERA_ACTION"
        old_action.use_fake_user = True
    camera.animation_data_clear()
    for constraint in list(camera.constraints):
        camera.constraints.remove(constraint)
    camera.parent = None
    camera["rail_progress"] = 0.0
    camera.id_properties_ui("rail_progress").update(
        min=0.0,
        max=1.0,
        description="Linear camera travel along the editable Bezier rail.",
    )
    constraint = add_follow_path_constraint(camera, path, "ABS_CAMERA_RAIL")
    driver_from_property(constraint, "offset_factor", camera, "rail_progress")
    for frame, progress in ((1, 0.0), (901, 1.0), (1001, 1.0)):
        camera["rail_progress"] = progress
        camera.keyframe_insert(data_path='["rail_progress"]', frame=frame, group="Exact Blender camera travel")
    action = camera.animation_data.action
    for curve in action.fcurves:
        for keyframe in curve.keyframe_points:
            keyframe.interpolation = "LINEAR"
    camera.parent = None
    camera.location = (0.0, 0.0, 0.0)
    camera.rotation_mode = "XYZ"
    camera.rotation_euler = (math.radians(90.0), 0.0, 0.0)
    camera.scale = (1.0, 1.0, 1.0)
    camera.data.sensor_fit = "HORIZONTAL"
    camera.data.angle = math.radians(float(controls["camera_horizontal_fov_degrees"]))
    lens_curve = driver_from_property(
        camera.data,
        "lens",
        controls,
        "camera_horizontal_fov_degrees",
        expression="36/(2*tan(value*pi/360))",
    )
    scene.camera = camera
    return camera


def disable_old_latter_scenes(scene):
    disabled = []
    for obj in scene.objects:
        model_id = str(obj.get("abs_model_id") or "")
        if model_id not in {"about.03", "about.04", "about.05", "about.06"}:
            continue
        if obj.name.startswith("ABS_DC_"):
            continue
        obj["abs_export"] = False
        obj["abs_replaced_by"] = "about-director-cut-v1"
        obj.hide_render = True
        obj.hide_viewport = True
        if obj.name.startswith("ABS_GATE_"):
            obj.name = obj.name.replace("ABS_GATE_", "ABS_PRE_DC_GATE_", 1)
        disabled.append(obj.name)
    return disabled


def assign_material(obj, material_name):
    material = bpy.data.materials.get(material_name)
    if material is None:
        raise RuntimeError(f"Missing required material {material_name}.")
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.material_index = 0


def assign_accent_faces(obj, material_name, stride):
    material = bpy.data.materials.get(material_name)
    if material is None:
        raise RuntimeError(f"Missing required material {material_name}.")
    obj.data.materials.append(material)
    accent_index = len(obj.data.materials) - 1
    for index, polygon in enumerate(obj.data.polygons):
        if index % stride == 0:
            polygon.material_index = accent_index


def set_semantics(
    obj,
    model_id,
    object_id,
    geometry_kind,
    density,
    radius,
    priority=1.0,
    component_policy="semantic-material-projected-coverage",
    minimum_profile="mobile",
):
    window = STAGE_WINDOWS[model_id]
    values = {
        "abs_export": True,
        "abs_semantic_schema": 2,
        "abs_model_id": model_id,
        "abs_stage_id": window["stage"],
        "abs_density_group": model_id,
        "abs_object_id": object_id,
        "abs_role": "narrative-world",
        "abs_motion_group": f"{model_id}.coherent",
        "abs_reveal_group": model_id,
        "abs_component_policy": component_policy,
        "abs_feature_priority": priority,
        "abs_point_density": density,
        "abs_surfel_radius_scale": radius,
        "abs_sampling_mode": "uniform_surface",
        "abs_sampling_space": "WORLD",
        "abs_visibility_start_wu": window["start"],
        "abs_visibility_end_wu": window["end"],
        "abs_visibility_start_cue": window["start_cue"],
        "abs_visibility_end_cue": window["end_cue"],
        "abs_visibility_start_offset_wu": window["start_offset"],
        "abs_visibility_end_offset_wu": window["end_offset"],
        "abs_visibility_handoff_wu": 0.3,
        "abs_transition_mode": "overlap-fog-handoff",
        "abs_geometry_kind": geometry_kind,
        "abs_min_profile": minimum_profile,
        "abs_parameter_owner": CONTROLS_NAME,
        "abs_palette_mode": "mixed",
        "abs_palette_seed": zlib.crc32(object_id.encode("utf-8")) & 0x7FFFFFFF,
    }
    for key, value in values.items():
        obj[key] = value


def mesh_object(name, vertices, faces, collection):
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj


def create_grid(name, collection, x_extent, y_before, y_after, columns, rows, height_function):
    vertices = []
    faces = []
    for row in range(rows + 1):
        y = -y_before + (y_before + y_after) * row / rows
        for column in range(columns + 1):
            x = -x_extent + x_extent * 2.0 * column / columns
            vertices.append((x, y, height_function(x, y)))
    stride = columns + 1
    for row in range(rows):
        for column in range(columns):
            a = row * stride + column
            faces.append((a, a + 1, a + stride + 1, a + stride))
    return mesh_object(name, vertices, faces, collection)


def create_stage_follower(name, collection, path, controls, property_name, scale_properties):
    follower = bpy.data.objects.new(name, None)
    collection.objects.link(follower)
    follower.empty_display_type = "PLAIN_AXES"
    follower.empty_display_size = 10.0
    follower["abs_export"] = False
    constraint = add_follow_path_constraint(follower, path, f"{name}_RAIL")
    driver_from_property(constraint, "offset_factor", controls, property_name)
    driver_axis_scale(follower, controls, scale_properties)
    return follower


def build_terrain(collection, path, controls):
    follower = create_stage_follower(
        "ABS_DC_TERRAIN_RIG",
        collection,
        path,
        controls,
        "terrain_progress",
        ("terrain_width_scale", "terrain_depth_scale", "terrain_height_scale"),
    )
    terrain = create_grid(
        "ABS_DC_TERRAIN",
        collection,
        x_extent=95.0,
        y_before=90.0,
        y_after=110.0,
        columns=22,
        rows=28,
        height_function=lambda x, y: -31.0 + 0.0009 * x * x + 1.8 * math.sin(y * 0.035) * (0.25 + abs(x) / 95.0),
    )
    terrain.parent = follower
    driver_from_property(terrain, "location", controls, "terrain_vertical_offset", index=2)
    assign_material(terrain, "ABS_1_STONE")
    assign_accent_faces(terrain, "ABS_5_ORGANIC", 9)
    set_semantics(terrain, "about.03", "director.terrain", "single-vast-terrain", 2.4, 0.48, priority=4.0)
    driver_scaled_property(terrain, "abs_point_density", controls, "terrain_density_scale")
    driver_scaled_property(terrain, "abs_surfel_radius_scale", controls, "terrain_point_scale")
    terrain["abs_connected_surface"] = True
    terrain["abs_viewport_span"] = True
    return follower, terrain


def gate_frame_mesh(name, collection, inner=7.6, rim=1.1, half_depth=0.55):
    outer = inner + rim
    rings = []
    for y in (-half_depth, half_depth):
        rings.extend([
            (-outer, y, -outer), (outer, y, -outer), (outer, y, outer), (-outer, y, outer),
            (-inner, y, -inner), (inner, y, -inner), (inner, y, inner), (-inner, y, inner),
        ])
    faces = []
    for base in (0, 8):
        faces.extend([
            (base + 0, base + 1, base + 5, base + 4),
            (base + 1, base + 2, base + 6, base + 5),
            (base + 2, base + 3, base + 7, base + 6),
            (base + 3, base + 0, base + 4, base + 7),
        ])
    for first in range(8):
        second = (first + 1) % 4 if first < 4 else 4 + ((first - 3) % 4)
        faces.append((first, second, second + 8, first + 8))
    return mesh_object(name, rings, faces, collection)


def build_square_gates(collection, path, controls):
    variants = ("ABS_0_ATMOSPHERE", "ABS_4_SIGNAL", "ABS_2_STEEL", "ABS_5_ORGANIC", "ABS_3_GLASS", "ABS_1_STONE")
    gates = []
    gate_count = 16
    for index in range(gate_count):
        gate = gate_frame_mesh(f"ABS_GATE_{index:02d}", collection)
        constraint = add_follow_path_constraint(gate, path, f"ABS_DC_GATE_RAIL_{index:02d}")
        expression = f"start+(end-start)*{index}/{gate_count - 1}"
        curve = constraint.driver_add("offset_factor")
        for variable_name, property_name in (
            ("start", "square_gate_start_progress"),
            ("end", "square_gate_end_progress"),
        ):
            variable = curve.driver.variables.new()
            variable.name = variable_name
            variable.type = "SINGLE_PROP"
            variable.targets[0].id_type = "OBJECT"
            variable.targets[0].id = controls
            variable.targets[0].data_path = f'["{property_name}"]'
        curve.driver.expression = expression
        gate.parent = None
        gate.rotation_mode = "XYZ"
        spin_curve = gate.driver_add("rotation_euler", 1)
        variable = spin_curve.driver.variables.new()
        variable.name = "turns"
        variable.type = "SINGLE_PROP"
        variable.targets[0].id_type = "OBJECT"
        variable.targets[0].id = controls
        variable.targets[0].data_path = '["square_gate_roll_turns"]'
        spin_curve.driver.expression = f"2*pi*turns*{index}/{gate_count - 1}"
        driver_axis_scale(
            gate,
            controls,
            ("square_gate_width_scale", "square_gate_depth_scale", "square_gate_height_scale"),
        )
        assign_material(gate, variants[index % len(variants)])
        set_semantics(
            gate,
            "about.04",
            f"director.square-gate.{index:02d}",
            "square-gate",
            1.7,
            1.0,
            priority=6.0,
            component_policy="authored-instance-perimeter",
        )
        gate["abs_gate_index"] = index
        gate["abs_aperture_half_size"] = [7.6, 7.6]
        gate["abs_aperture_rim_wu"] = 1.1
        gate["abs_half_depth"] = 0.55
        gate["abs_instance_count"] = gate_count
        gate["abs_traversal_mode"] = "same-centreline-reversible"
        driver_scaled_property(gate, "abs_point_density", controls, "square_gate_density_scale")
        driver_scaled_property(gate, "abs_surfel_radius_scale", controls, "square_gate_point_scale")
        gates.append(gate)
    return gates


def build_horizon_banks(collection, path, controls):
    follower = create_stage_follower(
        "ABS_DC_HORIZON_BANKS_RIG",
        collection,
        path,
        controls,
        "horizon_banks_progress",
        ("horizon_banks_width_scale", "horizon_banks_depth_scale", "horizon_banks_height_scale"),
    )
    banks = []
    for side, material_name in ((-1.0, "ABS_2_STEEL"), (1.0, "ABS_3_GLASS")):
        vertices = []
        faces = []
        rows = 28
        for row in range(rows + 1):
            y = -115.0 + 230.0 * row / rows
            wave = 4.5 * math.sin(row / rows * math.pi * 1.5)
            near_x = side * (38.0 + wave)
            far_x = side * (125.0 + wave * 1.8)
            vertices.extend([(near_x, y, -12.0), (far_x, y, 26.0 + 3.0 * math.cos(y * 0.025))])
        for row in range(rows):
            a = row * 2
            faces.append((a, a + 1, a + 3, a + 2))
        bank = mesh_object(f"ABS_DC_HORIZON_BANK_{'L' if side < 0 else 'R'}", vertices, faces, collection)
        bank.parent = follower
        assign_material(bank, material_name)
        set_semantics(bank, "about.05", f"director.horizon-bank.{int(side)}", "paired-horizon-bank", 3.2, 0.42, priority=3.0)
        driver_scaled_property(bank, "abs_point_density", controls, "horizon_banks_density_scale")
        driver_scaled_property(bank, "abs_surfel_radius_scale", controls, "horizon_banks_point_scale")
        bank["abs_connected_surface"] = True
        banks.append(bank)
    return follower, banks


def build_finale(collection, path, controls):
    follower = create_stage_follower(
        "ABS_DC_FINALE_RIG",
        collection,
        path,
        controls,
        "finale_progress",
        ("finale_width_scale", "finale_depth_scale", "finale_height_scale"),
    )
    finale = create_grid(
        "ABS_DC_FINALE_SURFACE",
        collection,
        x_extent=260.0,
        y_before=170.0,
        y_after=290.0,
        columns=30,
        rows=36,
        height_function=lambda x, y: -21.5 + 0.65 * math.sin(x * 0.027) + 0.45 * math.sin(y * 0.021),
    )
    finale.parent = follower
    driver_from_property(finale, "location", controls, "finale_vertical_offset", index=2)
    assign_material(finale, "ABS_0_ATMOSPHERE")
    assign_accent_faces(finale, "ABS_4_SIGNAL", 11)
    set_semantics(finale, "about.06", "director.finale-surface", "boundless-finale-surface", 7.0, 0.52, priority=8.0)
    finale["abs_sampling_pattern"] = "row-column-grid"
    driver_scaled_property(finale, "abs_point_density", controls, "finale_density_scale")
    driver_scaled_property(finale, "abs_surfel_radius_scale", controls, "finale_point_scale")
    finale["abs_connected_surface"] = True
    finale["abs_viewport_span"] = True
    finale["abs_outer_edge_target_ndc"] = 1.15
    return follower, finale



def update_timeline(scene):
    cue_frames = {
        "ABS_STAGE_00": 1,
        "ABS_STAGE_01": 130,
        "ABS_STAGE_02": 258,
        "ABS_ROUND_BANK_START": 263,
        "ABS_ROUND_BANK_LEFT": 284,
        "ABS_ROUND_BANK_RIGHT": 317,
        "ABS_ROUND_BANK_END": 348,
        "ABS_ROUND_PORTALS_EXIT": 387,
        "ABS_ROUND_PORTALS_CLEAR": 387,
        "ABS_STAGE_03": 387,
        "ABS_PERSONAL_ORIGIN": 387,
        "ABS_TERRAIN_THESIS": 429,
        "ABS_CANYON_CLEAR": 502,
        "ABS_STAGE_04": 515,
        "ABS_ROLL_GATE_START": 515,
        "ABS_GATE_BANK_LEFT": 541,
        "ABS_GATE_BANK_RIGHT": 573,
        "ABS_GATE_BANK_SETTLE": 605,
        "ABS_ROLL_GATE_END": 644,
        "ABS_GATE_PASSAGE_CLEAR": 644,
        "ABS_STAGE_05": 644,
        "ABS_METHOD_RELEASE": 644,
        "ABS_LATTICE_APPROACH": 708,
        "ABS_STAGE_06": 772,
        "ABS_SPLIT_LATTICE_ENTRY": 772,
        "ABS_FINALE_DECEL": 811,
        "ABS_INVITATION": 862,
        "ABS_CAMERA_LOCK": 901,
        "ABS_TERMINAL_FRAME": 1001,
    }
    existing = {marker.name: marker for marker in scene.timeline_markers}
    for name, frame in cue_frames.items():
        marker = existing.get(name) or scene.timeline_markers.new(name=name, frame=frame)
        marker.frame = frame
    scene.frame_start = 1
    scene.frame_end = 1001
    scene["abs_narrative_stage_ranges"] = json.dumps({
        f"{index:02d}": [round(index / 7, 6), round((index + 1) / 7, 6)]
        for index in range(7)
    }, separators=(",", ":"))


def bind_visibility_controls(scene, controls):
    fade_wu = float(controls["scene_visibility_fade_wu"])
    for obj in scene.objects:
        model_id = str(obj.get("abs_model_id") or "")
        if obj.type != "MESH" or obj.get("abs_export") is False or model_id not in STAGE_WINDOWS:
            continue
        obj["abs_visibility_handoff_wu"] = fade_wu
        obj["abs_visibility_start_offset_wu"] = 0.0 if model_id == "about.00" else -fade_wu
        obj["abs_visibility_end_offset_wu"] = fade_wu


def configure_camera_fog_preview(scene, controls):
    """Create a render-preview fog driven by the same three exported controls."""
    world = scene.world or bpy.data.worlds.new("ABS_ABOUT_WORLD")
    scene.world = world
    world.mist_settings.use_mist = True
    world.mist_settings.falloff = "LINEAR"

    def driver(target, data_path, expression, variables):
        try:
            target.driver_remove(data_path)
        except (TypeError, RuntimeError):
            pass
        fcurve = target.driver_add(data_path)
        fcurve.driver.type = "SCRIPTED"
        fcurve.driver.expression = expression
        for name, property_name in variables:
            variable = fcurve.driver.variables.new()
            variable.name = name
            variable.type = "SINGLE_PROP"
            variable.targets[0].id = controls
            variable.targets[0].data_path = f'["{property_name}"]'
        return fcurve

    driver(world, "mist_settings.start", "start", [("start", "camera_draw_start_wu")])
    driver(world, "mist_settings.depth", "max(0.1, end-start)", [
        ("start", "camera_draw_start_wu"), ("end", "camera_draw_end_wu"),
    ])
    for view_layer in scene.view_layers:
        view_layer.use_pass_mist = True
    bpy.context.view_layer.update()

    scene.use_nodes = True
    tree = scene.node_tree
    for node in list(tree.nodes):
        if node.name.startswith("ABS_FOG_"):
            tree.nodes.remove(node)
    render_layers = tree.nodes.get("Render Layers") or tree.nodes.new("CompositorNodeRLayers")
    render_layers.scene = scene
    render_layers.layer = scene.view_layers[0].name
    if "Mist" not in render_layers.outputs:
        tree.nodes.remove(render_layers)
        render_layers = tree.nodes.new("CompositorNodeRLayers")
        render_layers.scene = scene
        render_layers.layer = scene.view_layers[0].name
    render_layers.name = "ABS_FOG_RENDER_LAYERS"
    power = tree.nodes.new("CompositorNodeMath")
    power.name = "ABS_FOG_CURVE"
    power.operation = "POWER"
    power.inputs[1].default_value = 1.2
    driver(power.inputs[1], "default_value", "curve", [("curve", "camera_fog_curve")])
    mix = tree.nodes.new("CompositorNodeMixRGB")
    mix.name = "ABS_FOG_TO_BLACK"
    mix.blend_type = "MIX"
    mix.inputs[2].default_value = (0.0, 0.0, 0.0, 1.0)
    composite = tree.nodes.get("Composite") or tree.nodes.new("CompositorNodeComposite")
    composite.name = "ABS_FOG_COMPOSITE"
    mist_output = render_layers.outputs.get("Mist")
    if mist_output is None:
        scene["abs_fog_preview"] = "camera-mist-settings-background-safe"
        return
    tree.links.new(mist_output, power.inputs[0])
    tree.links.new(power.outputs[0], mix.inputs[0])
    tree.links.new(render_layers.outputs["Image"], mix.inputs[1])
    tree.links.new(mix.outputs[0], composite.inputs[0])
    scene["abs_fog_preview"] = "camera-mist-compositor"


def write_readme(scene, path):
    text = bpy.data.texts.get(README_NAME) or bpy.data.texts.new(README_NAME)
    text.clear()
    text.write(
        "ABOUT DIRECTOR CUT — BLENDER IS THE AUTHORITY\n\n"
        "1. Select ABS_PARAMETRIC_RIDE_PATH and enter Edit Mode. Move its ten Bezier "
        "handles to change the 1,950 WU browser camera route.\n"
        "2. Select ABS_DIRECTOR_CUT_CONTROLS. roll_00_degrees through roll_09_degrees "
        "bank the camera at the corresponding path handle.\n"
        "3. Select ABS_DIRECTOR_CUT_CONTROLS to change each ecosystem's position, width, "
        "depth, height, density and point scale. The forms stage uses four to six opaque "
        "multi-colour solid bodies. Opening, forms and round-tunnel controls "
        "are installed by space-retained-early-scenes.py.\n"
        "4. The camera uses one linear rail_progress curve from frame 1 to 901 and "
        "holds from 901 to 1001. The website exporter samples the evaluated camera matrix "
        "at every frame. Browser scroll therefore follows this Blender movement exactly.\n"
        "5. Blender owns geometry, stage visibility and camera draw-distance fog. The "
        "exporter writes these values into meta.json and the browser reads them directly. "
        "Website code owns only the Home ball colour mapping and rendering quality.\n"
        "6. Run export-edited-about-v2-point-world.py after saving. Do not add a browser "
        "camera spline, spring, sway, or roll override.\n"
    )
    scene["abs_blender_authority"] = "editable-bezier-path,camera-roll,stage-distance,geometry,density,point-scale,fov,visibility-distance,camera-fog"
    scene["abs_runtime_authority"] = "design-system-home-ball-palette,rendering-quality"
    scene["abs_camera_motion_contract"] = "camera-direct-one-linear-progress-curve-on-editable-blender-bezier-rail"
    scene["abs_choreography"] = "opening,recognisable-forms,long-round-tunnel,vast-terrain,square-gates,horizon-banks,boundless-finale"
    scene["abs_director_cut_version"] = VERSION
    scene["abs_director_cut_path_length_wu"] = round(sum(spline.calc_length() for spline in path.data.splines), 6)


def main():
    scene = bpy.context.scene
    path = bpy.data.objects.get(PATH_NAME)
    if path is None or path.type != "CURVE":
        raise RuntimeError("The canonical ABS_PARAMETRIC_RIDE_PATH curve is missing.")
    clear_previous_director_cut(scene)
    root = scene.collection
    guide_collection = ensure_collection("ABS_GUIDES", root)
    camera_collection = ensure_collection(CAMERA_COLLECTION_NAME, root)
    later_collection = ensure_collection(SCENE_COLLECTION_NAME, root)
    backup_path(path, guide_collection)
    controls = build_controls(guide_collection)
    build_authoring_path(path, controls)
    camera = build_camera_rig(scene, path, controls, camera_collection)
    disabled = disable_old_latter_scenes(scene)
    terrain_rig, terrain = build_terrain(later_collection, path, controls)
    # space-retained-early-scenes.py installs one Geometry Nodes gate family.
    # Avoid rebuilding the former one-mesh-per-gate layer stack here.
    gates = []
    bank_rig, banks = build_horizon_banks(later_collection, path, controls)
    finale_rig, finale = build_finale(later_collection, path, controls)
    update_timeline(scene)
    bind_visibility_controls(scene, controls)
    configure_camera_fog_preview(scene, controls)
    write_readme(scene, path)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    print(json.dumps({
        "status": "ok",
        "version": VERSION,
        "pathPoints": len(PATH_POINTS),
        "pathLengthWU": scene["abs_director_cut_path_length_wu"],
        "disabledOldLatterObjects": len(disabled),
        "newGeometry": [terrain.name, *[gate.name for gate in gates], *[bank.name for bank in banks], finale.name],
        "cameraFollower": None,
        "camera": camera.name,
        "saved": False,
    }))


if __name__ == "__main__":
    main()
