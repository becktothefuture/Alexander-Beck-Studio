#!/usr/bin/env python3
"""Validate default parity and actual behavior of the About V2 live Blender controls."""

import argparse
import hashlib
import json
import math
import re
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector


CONTROL_NAME = "ABS_AUTHORING_CONTROLS"
BASELINE_NAME = "ABS_AUTHORING_BASELINE.json"
GATE_RE = re.compile(r"^ABS_GATE_\d{2}$")
FLOOR_MOUNTAIN_OBJECT_NAMES = (
    "ABS_B27_RIBBON_CANYON",
    "ABS_B27_CONTINUOUS_FLOOR",
    "ABS_B27_MOUNTAIN_RANGE",
)
STORYBOARD_FINAL_CONTROLS = {
    "opening_asymmetry_scale",
    "shape_path_progression",
    "floor_mountain_depth_scale",
    "floor_mountain_density_scale",
    "method_bank_spread",
    "finale_surface_overscan",
}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", required=True)
    return parser.parse_args(argv)


def q(value, digits=6):
    value = round(float(value), digits)
    return 0.0 if value == 0 else value


def export_meshes():
    return sorted(
        (
            obj for obj in bpy.data.objects
            if obj.type == "MESH"
            and not obj.hide_render
            and obj.get("abs_export") is not False
            and str(obj.get("abs_model_id", "")).startswith("about.")
        ),
        key=lambda obj: obj.name,
    )


def evaluated_geometry_sha():
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
                digest.update(struct.pack("<3d", *(q(v) for v in point)))
            for polygon in mesh.polygons:
                digest.update(struct.pack("<II", len(polygon.vertices), polygon.material_index))
                digest.update(struct.pack(f"<{len(polygon.vertices)}I", *polygon.vertices))
        finally:
            evaluated.to_mesh_clear()
    scene.frame_set(old_frame)
    return digest.hexdigest()


def camera_matrices():
    scene = bpy.context.scene
    camera = bpy.data.objects["ABS_CAMERA"]
    old_frame = scene.frame_current
    rows = []
    for frame in range(scene.frame_start, scene.frame_end + 1):
        scene.frame_set(frame)
        rows.append([q(value, 8) for row in camera.matrix_world for value in row])
    scene.frame_set(old_frame)
    return rows


def camera_sha(rows):
    return hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode("utf-8")).hexdigest()


def refresh():
    scene = bpy.context.scene
    control = bpy.data.objects.get(CONTROL_NAME)
    if control is not None:
        control.update_tag(refresh={"OBJECT"})
    current = scene.frame_current
    adjacent = current + 1 if current < scene.frame_end else current - 1
    scene.frame_set(adjacent)
    scene.frame_set(current)
    bpy.context.view_layer.update()


def matrix_snapshot(objects):
    return {obj.name: [q(v, 7) for row in obj.matrix_world for v in row] for obj in objects}


def property_snapshot(objects, prop):
    # Blender evaluates driven ID properties as single-precision values. Six
    # decimals is stricter than the exporter's authored-property precision and
    # avoids reporting a 0.12 -> 0.119999997 round trip as a semantic change.
    return {obj.name: q(obj.get(prop), 6) for obj in objects}


def topology_sha(objects):
    digest = hashlib.sha256()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in sorted(objects, key=lambda item: item.name):
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            digest.update(obj.name.encode("utf-8") + b"\0")
            digest.update(struct.pack("<II", len(mesh.vertices), len(mesh.polygons)))
            for polygon in mesh.polygons:
                digest.update(struct.pack("<I", len(polygon.vertices)))
                digest.update(struct.pack(f"<{len(polygon.vertices)}I", *polygon.vertices))
        finally:
            evaluated.to_mesh_clear()
    return digest.hexdigest()


def evaluated_object_geometry_snapshot(objects):
    """Hash evaluated local geometry per object so shape-key controls are auditable."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    result = {}
    for obj in sorted(objects, key=lambda item: item.name):
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            digest = hashlib.sha256()
            digest.update(struct.pack("<II", len(mesh.vertices), len(mesh.polygons)))
            for vertex in mesh.vertices:
                digest.update(struct.pack("<3d", *(q(value) for value in vertex.co)))
            for polygon in mesh.polygons:
                digest.update(struct.pack("<II", len(polygon.vertices), polygon.material_index))
                digest.update(struct.pack(f"<{len(polygon.vertices)}I", *polygon.vertices))
            result[obj.name] = digest.hexdigest()
        finally:
            evaluated.to_mesh_clear()
    return result


def changed_names(before, after):
    return sorted(name for name in before if before[name] != after[name])


def mutate_transform(control, prop, objects, expected_names=None, value=1.17):
    before = matrix_snapshot(objects)
    control[prop] = value
    refresh()
    after = matrix_snapshot(objects)
    changed = changed_names(before, after)
    control[prop] = 1.0
    refresh()
    restored = matrix_snapshot(objects)
    if not changed:
        raise RuntimeError(f"{prop} is inert.")
    if expected_names is not None and set(changed) != set(expected_names):
        raise RuntimeError(f"{prop} changed unexpected objects: {changed}")
    if restored != before:
        raise RuntimeError(f"{prop} did not restore its default evaluated transforms.")
    return changed


def mutate_property(control, prop, objects, target_prop, value=1.23):
    before = property_snapshot(objects, target_prop)
    control[prop] = value
    refresh()
    after = property_snapshot(objects, target_prop)
    changed = changed_names(before, after)
    control[prop] = 1.0
    refresh()
    restored = property_snapshot(objects, target_prop)
    if set(changed) != {obj.name for obj in objects}:
        raise RuntimeError(f"{prop} did not drive exactly its intended objects: {changed}")
    if restored != before:
        raise RuntimeError(f"{prop} did not restore its default export properties.")
    return changed


def mutate_geometry(control, prop, objects, expected_names, value=0.37):
    before = evaluated_object_geometry_snapshot(objects)
    control[prop] = value
    refresh()
    after = evaluated_object_geometry_snapshot(objects)
    changed = changed_names(before, after)
    control[prop] = 1.0
    refresh()
    restored = evaluated_object_geometry_snapshot(objects)
    if set(changed) != set(expected_names):
        raise RuntimeError(f"{prop} changed unexpected evaluated geometry: {changed}")
    if restored != before:
        raise RuntimeError(f"{prop} did not restore its default evaluated geometry.")
    return changed


def objects_for_model(model):
    return [obj for obj in export_meshes() if obj.get("abs_model_id") == model]


def floor_mountain_objects():
    objects = [bpy.data.objects.get(name) for name in FLOOR_MOUNTAIN_OBJECT_NAMES]
    missing = [name for name, obj in zip(FLOOR_MOUNTAIN_OBJECT_NAMES, objects) if obj is None]
    if missing:
        raise RuntimeError(f"Missing required B41 floor/mountain objects: {missing}")
    return objects


def logo_atmosphere_objects():
    objects = [obj for obj in objects_for_model("about.03") if obj.name.startswith("ABS_B27_LOGO_")]
    if not objects:
        raise RuntimeError("The B41 logo atmosphere/safe surface group is empty.")
    return objects


def validate_collection_contract():
    required = {
        "ABS_AUTHORING_STAGES",
        "ABS_STAGE_00_OPENING",
        "ABS_STAGE_01_SHAPES",
        "ABS_STAGE_02_ROUND_TUNNEL",
        "ABS_STAGE_03_TERRAIN_LOGOS",
        "ABS_STAGE_04_SQUARE_GATES",
        "ABS_STAGE_05_METHOD",
        "ABS_STAGE_06_FINALE",
        "ABS_STAGE_03_FLOOR_MOUNTAINS",
        "ABS_STAGE_03_LOGO_ATMOSPHERE",
    }
    missing = sorted(required - set(bpy.data.collections.keys()))
    if missing:
        raise RuntimeError(f"Missing authoring collections: {missing}")
    for obj in export_meshes():
        if not any(collection.name.startswith("ABS_STAGE_") for collection in obj.users_collection):
            raise RuntimeError(f"{obj.name} is not linked into an authoring stage/substage collection.")


def validate_camera_curve(control):
    scene = bpy.context.scene
    camera = bpy.data.objects["ABS_CAMERA"]
    hoops = sorted((obj for obj in objects_for_model("about.02") if obj.name.startswith("ABS_B27_ROUND_HOOP_")), key=lambda obj: obj.name)
    curve_rig = bpy.data.objects["ABS_RIG_CAMERA_AND_ROUND_HOOPS"]
    if len(hoops) != 28 or camera.parent != curve_rig:
        raise RuntimeError("Camera/round-hoop hierarchy is incomplete.")
    old_frame = scene.frame_current
    frames = [1, 80, 140, 220, 500, 901, 1001]
    baseline_camera = {}
    baseline_centres = {}
    for frame in frames:
        scene.frame_set(frame)
        baseline_camera[frame] = camera.matrix_world.translation.copy()
    for hoop in hoops:
        # Mesh coordinates were authored directly in world space. At defaults
        # the object matrix is identity, so the stored centre is also the local
        # point transformed by the live rig hierarchy.
        baseline_centres[hoop.name] = Vector(hoop["abs_aperture_centre_blender"])

    control["camera_curve_lateral_scale"] = 1.21
    control["camera_curve_vertical_scale"] = 1.16
    refresh()
    for frame in frames:
        scene.frame_set(frame)
        before = baseline_camera[frame]
        after = camera.matrix_world.translation
        expected = Vector((before.x * 1.21, before.y, 2.0 + (before.z - 2.0) * 1.16))
        if (after - expected).length > 2e-5:
            raise RuntimeError(f"Camera curvature transform misaligned at frame {frame}: {(after - expected).length}")
    for hoop in hoops:
        before = baseline_centres[hoop.name]
        after = hoop.matrix_world @ Vector(hoop["abs_aperture_centre_blender"])
        expected = Vector((before.x * 1.21, before.y, 2.0 + (before.z - 2.0) * 1.16))
        if (after - expected).length > 2e-5:
            raise RuntimeError(f"Round hoop {hoop.name} did not follow the camera curvature rig.")

    late_straight_frames = []
    for frame in (500, 901, 1001):
        scene.frame_set(frame)
        before = baseline_camera[frame]
        after = camera.matrix_world.translation
        if abs(before.x) < 1e-6 and abs(before.z - 2.0) < 1e-6:
            if (after - before).length > 2e-5:
                raise RuntimeError(f"Late straight rail moved at frame {frame}.")
            late_straight_frames.append(frame)
    if late_straight_frames != [500, 901, 1001]:
        raise RuntimeError(f"Expected the three late probe frames on the invariant straight rail; got {late_straight_frames}.")
    control["camera_curve_lateral_scale"] = 1.0
    control["camera_curve_vertical_scale"] = 1.0
    scene.frame_set(old_frame)
    refresh()
    return {"roundHoopCount": len(hoops), "probedFrames": frames, "lateStraightFrames": late_straight_frames}


def run():
    args = parse_args()
    report_path = Path(args.report).expanduser().resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)
    control = bpy.data.objects.get(CONTROL_NAME)
    baseline_text = bpy.data.texts.get(BASELINE_NAME)
    guide = bpy.data.texts.get("ABS_AUTHORING_GUIDE")
    if control is None or baseline_text is None or guide is None:
        raise RuntimeError("Live authoring controls, baseline and guide are required.")
    if bpy.data.objects.get("ABS_B27_CONTROLS") is not None:
        raise RuntimeError("Misleading ABS_B27_CONTROLS still exists.")
    baseline = json.loads(baseline_text.as_string())
    missing_storyboard_controls = sorted(STORYBOARD_FINAL_CONTROLS - set(control.keys()))
    if int(bpy.context.scene.get("abs_storyboard_final_version", 0)) > 0 and missing_storyboard_controls:
        raise RuntimeError(f"Storyboard-final controls are missing: {missing_storyboard_controls}")
    default_geometry = evaluated_geometry_sha()
    default_matrices = camera_matrices()
    default_camera = camera_sha(default_matrices)
    if default_geometry != baseline["evaluatedGeometrySha256"]:
        raise RuntimeError("Default evaluated geometry no longer matches the pre-install baseline.")
    if default_camera != baseline["cameraMatricesSha256"]:
        raise RuntimeError("Default camera matrices no longer match the pre-install baseline.")
    validate_collection_contract()

    opening = objects_for_model("about.00")
    shapes = objects_for_model("about.01")
    bodies = [obj for obj in shapes if obj.name.startswith("ABS_B27_SHAPE_")]
    hoops = [obj for obj in objects_for_model("about.02") if obj.name.startswith("ABS_B27_ROUND_HOOP_")]
    floor = floor_mountain_objects()
    logo = logo_atmosphere_objects()
    gates = [obj for obj in objects_for_model("about.04") if GATE_RE.match(obj.name)]
    method = objects_for_model("about.05")
    finale = objects_for_model("about.06")
    all_export = export_meshes()
    storyboard_final = int(bpy.context.scene.get("abs_storyboard_final_version", 0)) > 0

    mutation_results = {}
    mutation_results["opening_width_scale"] = mutate_transform(control, "opening_width_scale", all_export, [obj.name for obj in opening])
    mutation_results["opening_depth_scale"] = mutate_transform(control, "opening_depth_scale", all_export, [obj.name for obj in opening])
    mutation_results["opening_density_scale"] = mutate_property(control, "opening_density_scale", opening, "abs_point_density")
    mutation_results["opening_surfel_scale"] = mutate_property(control, "opening_surfel_scale", opening, "abs_surfel_radius_scale")
    if storyboard_final:
        opening_asymmetry = [
            obj for obj in opening
            if obj.get("abs_storyboard_shape_key") == "ABS_STORYBOARD_OPENING_ASYMMETRY"
        ]
        mutation_results["opening_asymmetry_scale"] = mutate_geometry(
            control,
            "opening_asymmetry_scale",
            all_export,
            [obj.name for obj in opening_asymmetry],
        )
    mutation_results["shape_field_width_scale"] = mutate_transform(control, "shape_field_width_scale", all_export, [obj.name for obj in shapes])
    mutation_results["shape_field_depth_scale"] = mutate_transform(control, "shape_field_depth_scale", all_export, [obj.name for obj in shapes])
    mutation_results["shape_body_scale"] = mutate_transform(control, "shape_body_scale", all_export, [obj.name for obj in bodies])
    if storyboard_final:
        path_bodies = [
            obj for obj in bodies
            if obj.get("abs_storyboard_shape_key") == "ABS_STORYBOARD_SPATIAL_PATH"
        ]
        mutation_results["shape_path_progression"] = mutate_geometry(
            control,
            "shape_path_progression",
            all_export,
            [obj.name for obj in path_bodies],
        )
    mutation_results["round_hoop_radius_scale"] = mutate_transform(control, "round_hoop_radius_scale", all_export, [obj.name for obj in hoops])
    mutation_results["round_hoop_surfel_scale"] = mutate_property(control, "round_hoop_surfel_scale", hoops, "abs_surfel_radius_scale")
    mutation_results["floor_mountain_width_scale"] = mutate_transform(control, "floor_mountain_width_scale", all_export, [obj.name for obj in floor])
    mutation_results["floor_mountain_relief_scale"] = mutate_transform(control, "floor_mountain_relief_scale", all_export, [obj.name for obj in floor])
    if storyboard_final:
        mutation_results["floor_mountain_depth_scale"] = mutate_transform(
            control,
            "floor_mountain_depth_scale",
            all_export,
            [obj.name for obj in floor],
        )
        mutation_results["floor_mountain_density_scale"] = mutate_property(
            control,
            "floor_mountain_density_scale",
            floor,
            "abs_point_density",
        )
    mutation_results["logo_atmosphere_density_scale"] = mutate_property(control, "logo_atmosphere_density_scale", logo, "abs_point_density")
    mutation_results["logo_atmosphere_surfel_scale"] = mutate_property(control, "logo_atmosphere_surfel_scale", logo, "abs_surfel_radius_scale")
    gate_topology_before = topology_sha(gates)
    mutation_results["gate_density_scale"] = mutate_property(control, "gate_density_scale", gates, "abs_point_density")
    mutation_results["gate_surfel_scale"] = mutate_property(control, "gate_surfel_scale", gates, "abs_surfel_radius_scale")
    gate_topology_after = topology_sha(gates)
    if gate_topology_after != gate_topology_before:
        raise RuntimeError("Gate density/surfel controls changed evaluated gate topology.")
    for prop in ("method_width_scale", "method_depth_scale", "method_height_scale"):
        mutation_results[prop] = mutate_transform(control, prop, all_export, [obj.name for obj in method])
    mutation_results["method_density_scale"] = mutate_property(control, "method_density_scale", method, "abs_point_density")
    if storyboard_final:
        method_banks = [
            obj for obj in method
            if obj.get("abs_storyboard_shape_key") == "ABS_STORYBOARD_METHOD_BANKS"
        ]
        mutation_results["method_bank_spread"] = mutate_geometry(
            control,
            "method_bank_spread",
            all_export,
            [obj.name for obj in method_banks],
        )
    for prop in ("finale_width_scale", "finale_depth_scale", "finale_height_scale"):
        mutation_results[prop] = mutate_transform(control, prop, all_export, [obj.name for obj in finale])
    mutation_results["finale_density_scale"] = mutate_property(control, "finale_density_scale", finale, "abs_point_density")
    if storyboard_final:
        finale_surfaces = [
            obj for obj in finale
            if obj.get("abs_storyboard_shape_key") == "ABS_STORYBOARD_FINALE_OVERSCAN"
        ]
        mutation_results["finale_surface_overscan"] = mutate_geometry(
            control,
            "finale_surface_overscan",
            all_export,
            [obj.name for obj in finale_surfaces],
        )
    camera_alignment = validate_camera_curve(control)

    final_geometry = evaluated_geometry_sha()
    final_camera = camera_sha(camera_matrices())
    if final_geometry != default_geometry or final_camera != default_camera:
        raise RuntimeError("Mutation probes did not restore the accepted default scene.")

    report = {
        "task": "B29+B43",
        "status": "PASS",
        "blend": bpy.data.filepath,
        "defaultParity": {
            "evaluatedGeometrySha256": default_geometry,
            "cameraMatricesSha256": default_camera,
            "cameraFrameCount": len(default_matrices),
            "eligibleMeshObjectCount": len(all_export),
        },
        "liveControlCount": len(mutation_results) + 2,
        "storyboardFinalVersion": int(bpy.context.scene.get("abs_storyboard_final_version", 0)),
        "mutations": {name: {"changedObjectCount": len(names), "objects": names} for name, names in mutation_results.items()},
        "cameraAndRoundHoops": camera_alignment,
        "gateTopology": {
            "gateCount": len(gates),
            "evaluatedTopologySha256": gate_topology_before,
            "topologyRegeneration": False,
        },
        "guideTextBlock": "ABS_AUTHORING_GUIDE",
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print("ABS_AUTHORING_CHECK=PASS")
    print("ABS_AUTHORING_REPORT=" + str(report_path))


if __name__ == "__main__":
    run()
