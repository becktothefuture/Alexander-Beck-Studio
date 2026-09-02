#!/usr/bin/env python3
"""Install live, non-destructive authoring controls in the About V2 Blender scene.

Run with Blender, for example:

  blender -b candidate.blend --python scripts/about-v2-blender/install-about-v2-authoring-controls.py -- \
    --output-blend output/playwright/about-cinematic-authoring-controls/controlled.blend

The installer records a world-space evaluated-geometry and camera baseline before it
adds the rig. Default control values must reproduce that baseline. The script is
idempotent for a scene that already contains this version of the rig.
"""

import argparse
import hashlib
import json
import math
import re
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


VERSION = 1
CONTROL_NAME = "ABS_AUTHORING_CONTROLS"
GUIDE_NAME = "ABS_AUTHORING_GUIDE"
BASELINE_NAME = "ABS_AUTHORING_BASELINE.json"
ROOT_COLLECTION = "ABS_AUTHORING_STAGES"
RIG_COLLECTION = "ABS_AUTHORING_RIGS"
GATE_RE = re.compile(r"^ABS_GATE_\d{2}$")
FLOOR_MOUNTAIN_OBJECT_NAMES = (
    "ABS_B27_RIBBON_CANYON",
    "ABS_B27_CONTINUOUS_FLOOR",
    "ABS_B27_MOUNTAIN_RANGE",
)


CONTROL_SCHEMA = (
    ("opening_width_scale", 1.0, 0.65, 1.75, "Opening field width; re-audit desktop and mobile copy clearance."),
    ("opening_depth_scale", 1.0, 0.70, 1.60, "Opening field depth around its authored centre."),
    ("opening_density_scale", 1.0, 0.35, 2.50, "Opening export density multiplier; does not regenerate geometry."),
    ("opening_surfel_scale", 1.0, 0.60, 1.80, "Opening surfel-radius multiplier."),
    ("shape_field_width_scale", 1.0, 0.70, 1.55, "Recognisable-shape field width."),
    ("shape_field_depth_scale", 1.0, 0.75, 1.45, "Recognisable-shape field depth."),
    ("shape_body_scale", 1.0, 0.65, 1.60, "Uniform size of the 42 triangle, square, diamond, pyramid, sphere and cube bodies."),
    ("camera_curve_lateral_scale", 1.0, 0.55, 1.55, "Camera and all 28 round hoops: lateral curve amplitude."),
    ("camera_curve_vertical_scale", 1.0, 0.55, 1.55, "Camera and all 28 round hoops: vertical curve amplitude around Z=2."),
    ("round_hoop_radius_scale", 1.0, 0.78, 1.35, "Uniform hoop aperture/body scale around each authored hoop centre."),
    ("round_hoop_surfel_scale", 1.0, 0.60, 1.80, "Round-hoop surfel-radius multiplier."),
    ("floor_mountain_width_scale", 1.0, 0.70, 1.60, "Restored floor and mountain field width."),
    ("floor_mountain_relief_scale", 1.0, 0.50, 1.75, "Restored floor and mountain relief around Z=-22."),
    ("logo_atmosphere_density_scale", 1.0, 0.35, 2.50, "Logo-atmosphere export density multiplier."),
    ("logo_atmosphere_surfel_scale", 1.0, 0.60, 1.80, "Logo-atmosphere surfel-radius multiplier."),
    ("gate_density_scale", 1.0, 0.50, 2.00, "Sixteen square-gate density multiplier; gate topology/count remain fixed."),
    ("gate_surfel_scale", 1.0, 0.65, 1.65, "Sixteen square-gate surfel-radius multiplier."),
    ("method_width_scale", 1.0, 0.70, 1.55, "Method field width."),
    ("method_depth_scale", 1.0, 0.70, 1.55, "Method field depth."),
    ("method_height_scale", 1.0, 0.60, 1.60, "Method field height around its authored centre."),
    ("method_density_scale", 1.0, 0.35, 2.40, "Method field export density multiplier."),
    ("finale_width_scale", 1.0, 0.75, 1.70, "Finale field width."),
    ("finale_depth_scale", 1.0, 0.70, 1.55, "Finale field depth."),
    ("finale_height_scale", 1.0, 0.55, 1.65, "Finale relief/height around its authored centre."),
    ("finale_density_scale", 1.0, 0.35, 2.40, "Finale export density multiplier."),
)


STAGE_COLLECTIONS = {
    "about.00": ("ABS_STAGE_00_OPENING", "ABS_STAGE_00_OPENING_FIELD"),
    "about.01": ("ABS_STAGE_01_SHAPES", "ABS_STAGE_01_RECOGNISABLE_BODIES"),
    "about.02": ("ABS_STAGE_02_ROUND_TUNNEL", "ABS_STAGE_02_ROUND_HOOPS"),
    "about.03": ("ABS_STAGE_03_TERRAIN_LOGOS", "ABS_STAGE_03_FLOOR_MOUNTAINS"),
    "about.04": ("ABS_STAGE_04_SQUARE_GATES", "ABS_STAGE_04_AUTHORED_GATES"),
    "about.05": ("ABS_STAGE_05_METHOD", "ABS_STAGE_05_METHOD_FIELD"),
    "about.06": ("ABS_STAGE_06_FINALE", "ABS_STAGE_06_FINALE_FIELD"),
}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-blend", required=True)
    return parser.parse_args(argv)


def quantized(value, digits=6):
    value = round(float(value), digits)
    return 0.0 if value == 0 else value


def export_meshes():
    return sorted(
        (
            obj
            for obj in bpy.data.objects
            if obj.type == "MESH"
            and not obj.hide_render
            and obj.get("abs_export") is not False
            and str(obj.get("abs_model_id", "")).startswith("about.")
        ),
        key=lambda obj: obj.name,
    )


def evaluated_geometry_sha():
    """World-space evaluated geometry SHA at 1e-6 quantisation."""
    scene = bpy.context.scene
    old_frame = scene.frame_current
    scene.frame_set(1)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    digest = hashlib.sha256()
    for obj in export_meshes():
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            digest.update(obj.name.encode("utf-8") + b"\0")
            digest.update(struct.pack("<II", len(mesh.vertices), len(mesh.polygons)))
            world = evaluated.matrix_world
            for vertex in mesh.vertices:
                point = world @ vertex.co
                digest.update(struct.pack("<3d", *(quantized(v) for v in point)))
            for polygon in mesh.polygons:
                digest.update(struct.pack("<II", len(polygon.vertices), polygon.material_index))
                digest.update(struct.pack(f"<{len(polygon.vertices)}I", *polygon.vertices))
        finally:
            evaluated.to_mesh_clear()
    scene.frame_set(old_frame)
    return digest.hexdigest()


def camera_matrices():
    scene = bpy.context.scene
    camera = bpy.data.objects.get("ABS_CAMERA")
    if camera is None or camera.type != "CAMERA":
        raise RuntimeError("ABS_CAMERA is required.")
    old_frame = scene.frame_current
    rows = []
    for frame in range(scene.frame_start, scene.frame_end + 1):
        scene.frame_set(frame)
        rows.append([quantized(value, 8) for row in camera.matrix_world for value in row])
    scene.frame_set(old_frame)
    return rows


def camera_sha(matrices):
    return hashlib.sha256(json.dumps(matrices, separators=(",", ":")).encode("utf-8")).hexdigest()


def baseline_payload():
    matrices = camera_matrices()
    return {
        "version": VERSION,
        "geometryQuantisationDigits": 6,
        "cameraQuantisationDigits": 8,
        "evaluatedGeometrySha256": evaluated_geometry_sha(),
        "cameraMatricesSha256": camera_sha(matrices),
        "cameraMatrices": matrices,
        "cameraFrameStart": bpy.context.scene.frame_start,
        "cameraFrameEnd": bpy.context.scene.frame_end,
        "eligibleMeshObjectCount": len(export_meshes()),
    }


def ensure_collection(name, parent):
    collection = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if parent is bpy.context.scene.collection:
        if collection.name not in parent.children:
            parent.children.link(collection)
    elif collection.name not in parent.children:
        parent.children.link(collection)
    return collection


def link_to_collection(obj, collection):
    if obj.name not in collection.objects:
        collection.objects.link(obj)


def add_control_driver(target, data_path, control_name, index=None, expression="value"):
    try:
        target.driver_remove(data_path, index) if index is not None else target.driver_remove(data_path)
    except (TypeError, RuntimeError):
        pass
    fcurve = target.driver_add(data_path, index) if index is not None else target.driver_add(data_path)
    driver = fcurve.driver
    driver.type = "SCRIPTED"
    driver.expression = expression
    variable = driver.variables.new()
    variable.name = "value"
    variable.type = "SINGLE_PROP"
    variable.targets[0].id = bpy.data.objects[CONTROL_NAME]
    variable.targets[0].data_path = f'["{control_name}"]'
    return fcurve


def add_scaled_property_driver(obj, property_name, control, base_property_name):
    base = float(obj[property_name])
    obj[base_property_name] = base
    add_control_driver(obj, f'["{property_name}"]', control, expression=f"{base:.17g}*value")


def parent_keep_world(obj, parent):
    if obj.parent is not None:
        raise RuntimeError(f"{obj.name} already has parent {obj.parent.name}; refusing an ambiguous rig install.")
    obj.parent = parent
    # Every authoring rig is exactly identity at its defaults. Keeping an identity
    # parent inverse therefore preserves the original local and world matrices
    # without a decomposition/recomposition round trip.
    obj.matrix_parent_inverse = Matrix.Identity(4)


def world_bbox_center(objects):
    points = []
    for obj in objects:
        if obj.type == "MESH":
            points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
        else:
            points.append(obj.matrix_world.translation.copy())
    if not points:
        return Vector((0, 0, 0))
    minimum = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    maximum = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return (minimum + maximum) * 0.5


def new_empty(name, collection, location=(0, 0, 0), display="PLAIN_AXES"):
    obj = bpy.data.objects.get(name)
    if obj is not None:
        return obj
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    obj.location = (0, 0, 0)
    obj.empty_display_type = display
    obj.empty_display_size = 3.0
    obj["abs_export"] = False
    obj["abs_authoring_rig_version"] = VERSION
    obj["abs_authoring_pivot"] = json.dumps([float(value) for value in location])
    return obj


def drive_scale(rig, axis, control, pivot=0.0):
    add_control_driver(rig, "scale", control, index=axis)
    if abs(float(pivot)) > 1e-12:
        add_control_driver(
            rig,
            "location",
            control,
            index=axis,
            expression=f"{float(pivot):.17g}*(1-value)",
        )


def stage_objects(model):
    return [obj for obj in export_meshes() if obj.get("abs_model_id") == model]


def floor_mountain_objects():
    objects = [bpy.data.objects.get(name) for name in FLOOR_MOUNTAIN_OBJECT_NAMES]
    missing = [name for name, obj in zip(FLOOR_MOUNTAIN_OBJECT_NAMES, objects) if obj is None]
    if missing:
        raise RuntimeError(f"Missing required B41 floor/mountain objects: {missing}")
    return objects


def logo_atmosphere_objects():
    objects = [obj for obj in stage_objects("about.03") if obj.name.startswith("ABS_B27_LOGO_")]
    if not objects:
        raise RuntimeError("The B41 logo atmosphere/safe surface group is empty.")
    return objects


def install_collections(root):
    stage_map = {}
    for model, (stage_name, default_substage_name) in STAGE_COLLECTIONS.items():
        stage = ensure_collection(stage_name, root)
        default_substage = ensure_collection(default_substage_name, stage)
        stage_map[model] = (stage, default_substage)
    extra_substages = {
        "opening_atmosphere": ensure_collection("ABS_STAGE_00_ATMOSPHERE", stage_map["about.00"][0]),
        "shape_ambience": ensure_collection("ABS_STAGE_01_AMBIENCE", stage_map["about.01"][0]),
        "round_ambience": ensure_collection("ABS_STAGE_02_AMBIENCE", stage_map["about.02"][0]),
        "logo_atmosphere": ensure_collection("ABS_STAGE_03_LOGO_ATMOSPHERE", stage_map["about.03"][0]),
        "gate_legacy": ensure_collection("ABS_STAGE_04_LEGACY_LOOP", stage_map["about.04"][0]),
        "method_atmosphere": ensure_collection("ABS_STAGE_05_ATMOSPHERE", stage_map["about.05"][0]),
        "finale_atmosphere": ensure_collection("ABS_STAGE_06_ATMOSPHERE", stage_map["about.06"][0]),
    }
    for obj in export_meshes():
        model = str(obj.get("abs_model_id"))
        target = stage_map[model][1]
        if model == "about.00" and ("DEPTH" in obj.name or "SAFE" in obj.name):
            target = extra_substages["opening_atmosphere"]
        elif model == "about.01" and "AMBIENT" in obj.name:
            target = extra_substages["shape_ambience"]
        elif model == "about.02" and "AMBIENT" in obj.name:
            target = extra_substages["round_ambience"]
        elif model == "about.03" and "LOGO_" in obj.name:
            target = extra_substages["logo_atmosphere"]
        elif model == "about.04" and not GATE_RE.match(obj.name):
            target = extra_substages["gate_legacy"]
        elif model == "about.05" and "GROUND" not in obj.name:
            target = extra_substages["method_atmosphere"]
        elif model == "about.06" and not ("GROUND" in obj.name or "LATTICE" in obj.name):
            target = extra_substages["finale_atmosphere"]
        link_to_collection(obj, target)


def install_transform_rigs(control, rig_collection):
    opening = stage_objects("about.00")
    opening_centre = world_bbox_center(opening)
    opening_rig = new_empty("ABS_RIG_OPENING_FIELD", rig_collection, opening_centre)
    drive_scale(opening_rig, 0, "opening_width_scale", opening_centre.x)
    drive_scale(opening_rig, 1, "opening_depth_scale", opening_centre.y)
    for obj in opening:
        parent_keep_world(obj, opening_rig)

    shape_field = stage_objects("about.01")
    shape_centre = world_bbox_center(shape_field)
    shape_rig = new_empty("ABS_RIG_SHAPE_FIELD", rig_collection, shape_centre)
    drive_scale(shape_rig, 0, "shape_field_width_scale", shape_centre.x)
    drive_scale(shape_rig, 1, "shape_field_depth_scale", shape_centre.y)
    for obj in shape_field:
        if obj.name.startswith("ABS_B27_SHAPE_"):
            body_centre = world_bbox_center([obj])
            pivot = new_empty(f"ABS_RIG_{obj.name}_SIZE", rig_collection, body_centre)
            for axis in range(3):
                drive_scale(pivot, axis, "shape_body_scale", body_centre[axis])
            parent_keep_world(obj, pivot)
            parent_keep_world(pivot, shape_rig)
        else:
            parent_keep_world(obj, shape_rig)

    camera = bpy.data.objects.get("ABS_CAMERA")
    hoops = sorted((obj for obj in stage_objects("about.02") if obj.name.startswith("ABS_B27_ROUND_HOOP_")), key=lambda obj: obj.name)
    if camera is None or len(hoops) != 28:
        raise RuntimeError(f"Expected ABS_CAMERA and 28 round hoops; found {camera} and {len(hoops)}.")
    curve_rig = new_empty("ABS_RIG_CAMERA_AND_ROUND_HOOPS", rig_collection, (0, 0, 2))
    drive_scale(curve_rig, 0, "camera_curve_lateral_scale", 0.0)
    drive_scale(curve_rig, 2, "camera_curve_vertical_scale", 2.0)
    parent_keep_world(camera, curve_rig)
    for hoop in hoops:
        centre = Vector(hoop.get("abs_aperture_centre_blender", world_bbox_center([hoop])))
        pivot = new_empty(f"ABS_RIG_{hoop.name}_RADIUS", rig_collection, centre)
        for axis in range(3):
            drive_scale(pivot, axis, "round_hoop_radius_scale", centre[axis])
        parent_keep_world(hoop, pivot)
        parent_keep_world(pivot, curve_rig)

    floor_objects = floor_mountain_objects()
    floor_centre = world_bbox_center(floor_objects)
    floor_rig = new_empty("ABS_RIG_FLOOR_MOUNTAINS", rig_collection, (floor_centre.x, floor_centre.y, -22.0))
    drive_scale(floor_rig, 0, "floor_mountain_width_scale", floor_centre.x)
    drive_scale(floor_rig, 2, "floor_mountain_relief_scale", -22.0)
    for obj in floor_objects:
        parent_keep_world(obj, floor_rig)

    method = stage_objects("about.05")
    method_centre = world_bbox_center(method)
    method_rig = new_empty("ABS_RIG_METHOD_FIELD", rig_collection, method_centre)
    drive_scale(method_rig, 0, "method_width_scale", method_centre.x)
    drive_scale(method_rig, 1, "method_depth_scale", method_centre.y)
    drive_scale(method_rig, 2, "method_height_scale", method_centre.z)
    for obj in method:
        parent_keep_world(obj, method_rig)

    finale = stage_objects("about.06")
    finale_centre = world_bbox_center(finale)
    finale_rig = new_empty("ABS_RIG_FINALE_FIELD", rig_collection, finale_centre)
    drive_scale(finale_rig, 0, "finale_width_scale", finale_centre.x)
    drive_scale(finale_rig, 1, "finale_depth_scale", finale_centre.y)
    drive_scale(finale_rig, 2, "finale_height_scale", finale_centre.z)
    for obj in finale:
        parent_keep_world(obj, finale_rig)


def install_export_property_drivers():
    mappings = (
        (stage_objects("about.00"), "abs_point_density", "opening_density_scale", "_abs_authoring_base_density"),
        (stage_objects("about.00"), "abs_surfel_radius_scale", "opening_surfel_scale", "_abs_authoring_base_surfel_scale"),
        ([obj for obj in stage_objects("about.02") if obj.name.startswith("ABS_B27_ROUND_HOOP_")], "abs_surfel_radius_scale", "round_hoop_surfel_scale", "_abs_authoring_base_surfel_scale"),
        (logo_atmosphere_objects(), "abs_point_density", "logo_atmosphere_density_scale", "_abs_authoring_base_density"),
        (logo_atmosphere_objects(), "abs_surfel_radius_scale", "logo_atmosphere_surfel_scale", "_abs_authoring_base_surfel_scale"),
        ([obj for obj in stage_objects("about.04") if GATE_RE.match(obj.name)], "abs_point_density", "gate_density_scale", "_abs_authoring_base_density"),
        ([obj for obj in stage_objects("about.04") if GATE_RE.match(obj.name)], "abs_surfel_radius_scale", "gate_surfel_scale", "_abs_authoring_base_surfel_scale"),
        (stage_objects("about.05"), "abs_point_density", "method_density_scale", "_abs_authoring_base_density"),
        (stage_objects("about.06"), "abs_point_density", "finale_density_scale", "_abs_authoring_base_density"),
    )
    for objects, property_name, control_name, base_name in mappings:
        for obj in objects:
            add_scaled_property_driver(obj, property_name, control_name, base_name)
            obj["abs_parameter_owner"] = CONTROL_NAME


def install_control_object(root):
    control = bpy.data.objects.new(CONTROL_NAME, None)
    root.objects.link(control)
    control.empty_display_type = "CIRCLE"
    control.empty_display_size = 8.0
    control["abs_export"] = False
    control["abs_role"] = "live-authoring-controls"
    control["abs_authoring_controls_version"] = VERSION
    for name, default, minimum, maximum, description in CONTROL_SCHEMA:
        control[name] = default
        control.id_properties_ui(name).update(
            min=minimum,
            max=maximum,
            soft_min=minimum,
            soft_max=maximum,
            default=default,
            description=description,
        )
    return control


def install_guide():
    text = bpy.data.texts.get(GUIDE_NAME) or bpy.data.texts.new(GUIDE_NAME)
    text.clear()
    text.write(
        """ABOUT V2 LIVE AUTHORING GUIDE

Select the ABS_AUTHORING_CONTROLS Empty, then edit its Custom Properties.
Every listed property is live. Defaults (1.0) reproduce the accepted browser composition.

LIVE CONTROL GROUPS
- Opening: footprint width/depth, export density, surfel radius.
- Recognisable shapes: field width/depth and uniform body scale.
- Round tunnel: camera and all 28 hoops share lateral/vertical curve amplitude; hoop radius and surfel radius are independent.
- Restored floor/mountains: width and relief.
- Logo atmosphere: export density and surfel radius.
- Square gates: density and surfel radius on the 16 ABS_GATE_XX objects. Topology and count remain fixed.
- Method and finale: width, depth, height and export density.

CONSTRAINTS AND REQUIRED RE-AUDITS
- camera_curve_* changes require the constant-speed motion audit and proof that all 28 round hoops and all 16 square gates are traversed.
- footprint/width/depth/height/relief changes require dark/light desktop and mobile contact sheets, DOM copy-clearance checks and no-black-frame continuity checks.
- density/surfel changes require deterministic export, the generic edited-world checker, desktop/mobile performance profiling and particle continuity checks.
- No control regenerates mesh topology, changes object counts, or changes the fixed mobile/desktop/master surfel budgets. Density properties only change allocation weights inside those budgets.

EXPORT FROM THE REPOSITORY ROOT
/Applications/Blender.app/Contents/MacOS/Blender -b <controlled.blend> --python scripts/about-v2-blender/export-edited-about-v2-point-world.py -- --candidate-output-dir <candidate-output-dir>

Then run:
node scripts/about-v2-blender/check-about-v2-edited-world.mjs --asset-dir <candidate-output-dir>
"""
    )


def install():
    args = parse_args()
    output = Path(args.output_blend).expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    existing = bpy.data.objects.get(CONTROL_NAME)
    if existing is not None and int(existing.get("abs_authoring_controls_version", 0)) == VERSION:
        install_guide()
        bpy.ops.wm.save_as_mainfile(filepath=str(output))
        print(f"ABS_AUTHORING_INSTALLER_IDEMPOTENT={output}")
        return

    baseline = baseline_payload()
    baseline_text = bpy.data.texts.get(BASELINE_NAME) or bpy.data.texts.new(BASELINE_NAME)
    baseline_text.clear()
    baseline_text.write(json.dumps(baseline, separators=(",", ":"), sort_keys=True))

    inert = bpy.data.objects.get("ABS_B27_CONTROLS")
    if inert is not None:
        inert.name = "ABS_B27_CONTROLS_INERT_ARCHIVE"
        inert["abs_role"] = "archived-inert-parameter-schema"
        inert["abs_replaced_by"] = CONTROL_NAME
        inert.hide_viewport = True
        inert.hide_render = True

    root = ensure_collection(ROOT_COLLECTION, scene.collection)
    rig_collection = ensure_collection(RIG_COLLECTION, root)
    control = install_control_object(root)
    install_collections(root)
    install_transform_rigs(control, rig_collection)
    install_export_property_drivers()
    for obj in export_meshes():
        obj["abs_parameter_owner"] = CONTROL_NAME
    install_guide()
    scene["abs_authoring_controls_version"] = VERSION
    scene["abs_authoring_controls_owner"] = CONTROL_NAME
    scene.frame_set(scene.frame_current)
    bpy.context.view_layer.update()

    installed_geometry_sha = evaluated_geometry_sha()
    installed_camera_matrices = camera_matrices()
    installed_camera_sha = camera_sha(installed_camera_matrices)
    if installed_geometry_sha != baseline["evaluatedGeometrySha256"]:
        raise RuntimeError(
            "Default live-control rig changed evaluated geometry: "
            f"{baseline['evaluatedGeometrySha256']} -> {installed_geometry_sha}"
        )
    if installed_camera_sha != baseline["cameraMatricesSha256"]:
        raise RuntimeError(
            "Default live-control rig changed camera matrices: "
            f"{baseline['cameraMatricesSha256']} -> {installed_camera_sha}"
        )

    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    print("ABS_AUTHORING_GEOMETRY_SHA=" + installed_geometry_sha)
    print("ABS_AUTHORING_CAMERA_SHA=" + installed_camera_sha)
    print("ABS_AUTHORING_CONTROL_COUNT=" + str(len(CONTROL_SCHEMA)))
    print("ABS_AUTHORING_OUTPUT=" + str(output))


if __name__ == "__main__":
    install()
