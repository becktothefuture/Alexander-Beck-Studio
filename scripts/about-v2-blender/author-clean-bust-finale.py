#!/usr/bin/env python3
"""Author and verify a clean, grounded finale in an explicit candidate .blend.

Run against the saved canonical source with Blender in background mode. This
script never overwrites the canonical scene or public website export.
"""

import argparse
import hashlib
import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[2]
INTERNAL_KEY = "Internal Export Data"
EXCLUDED_COLLECTION = "99 EXCLUDED FINALE BODIES"
PROFILE_BY_MODEL = {
    "about.00": "atmosphere",
    "about.02": "solid",
    "about.03": "atmosphere",
    "about.04": "solid",
    "about.05": "solid",
    "about.06": "bust",
}


def module(name):
    path = Path(__file__).with_name(name + ".py")
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), path)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


def author(owner, key, value):
    owner[key] = value
    internal = owner.get(INTERNAL_KEY)
    if internal is not None:
        copied = internal.to_dict()
        copied[key] = value
        owner[INTERNAL_KEY] = copied


def exclude_bodies(scene):
    bodies = [obj for obj in scene.objects if obj.type == "MESH"
              and obj.get("abs_model_id") == "about.01"]
    if len(bodies) != 24:
        raise RuntimeError(f"Expected 24 retained body objects, found {len(bodies)}.")
    collection = bpy.data.collections.get(EXCLUDED_COLLECTION)
    if collection is None:
        collection = bpy.data.collections.new(EXCLUDED_COLLECTION)
        scene.collection.children.link(collection)
    collection.hide_render = True
    collection.hide_viewport = True
    collection["abs_export"] = False
    for obj in bodies:
        if obj.name not in collection.objects:
            collection.objects.link(obj)
        for previous in list(obj.users_collection):
            if previous != collection:
                previous.objects.unlink(obj)
        obj.hide_render = True
        author(obj, "abs_export", False)
    author(scene, "abs_excluded_finale_body_count", len(bodies))
    author(scene, "abs_excluded_finale_collection", EXCLUDED_COLLECTION)
    author(scene, "abs_solid_body_field_contract", "retained-source-excluded-from-active-world/v2")
    return bodies


def reallocate_budgets(scene):
    budgets = json.loads(scene["abs_surfel_budgets"])
    for profile in budgets.values():
        released = profile.pop("about.01", 0)
        # Preserve every quality budget and spend the retired bodies on the
        # closed base and portrait that must remain readable at the ending.
        platform_share = released // 2
        profile["about.05"] += platform_share
        profile["about.06"] += released - platform_share
        if sum(value for key, value in profile.items() if key != "total") != profile["total"]:
            raise RuntimeError("Finale reallocation changed a total quality budget.")
    author(scene, "abs_surfel_budgets", json.dumps(budgets, separators=(",", ":")))
    author(scene, "abs_model_budget_contract_json", json.dumps({
        name: {key: value for key, value in values.items() if key != "total"}
        for name, values in budgets.items()
    }, separators=(",", ":")))
    return budgets


def ground_bust(scene, bust, platform):
    scene.frame_set(scene.timeline_markers["ABS_CAMERA_LOCK"].frame)
    bpy.context.view_layer.update()
    terminal_camera = bpy.data.objects["Scene Camera"].matrix_world.translation.copy()
    scene.frame_set(1)
    bpy.context.view_layer.update()
    # Freeze the base at its authored exported rest orientation. The bust's
    # bounded turn owns ambient movement; its parent must not add a second turn.
    platform_rest = platform.rotation_euler.z
    platform.driver_remove("rotation_euler", 2)
    platform.rotation_euler.z = platform_rest
    # The imported portrait faces local -Y. Resolve its rest yaw from the
    # authored terminal camera instead of inheriting the platform's rotation.
    camera_direction = terminal_camera - platform.matrix_world.translation
    target_yaw = math.atan2(camera_direction.y, camera_direction.x)
    front_rotation = math.atan2(
        math.sin(target_yaw + math.pi / 2 - platform_rest),
        math.cos(target_yaw + math.pi / 2 - platform_rest),
    )
    author(bust, "abs_motion_base_rotation_z", front_rotation)
    minimum_local_z = min(vertex.co.z for vertex in bust.data.vertices)
    if abs(minimum_local_z) > 1e-7:
        bust.data.transform(Matrix.Translation((0, 0, -minimum_local_z)))
        bust.data.update()
    top = max(vertex.co.z for vertex in platform.data.vertices)
    curve = bust.animation_data.drivers.find("location", index=2)
    if curve is None:
        curve = bust.driver_add("location", 2)
    curve.driver.expression = f"{top:.12f}"
    bust.location.x = 0.0
    bust.location.y = 0.0
    author(bust, "abs_alignment_contract", "upright-grounded-base-pivot/v1")
    author(bust, "abs_local_up_axis", [0.0, 0.0, 1.0])
    author(bust, "abs_local_front_axis", [0.0, -1.0, 0.0])
    author(platform, "abs_geometry_kind", "finale-platform")
    bpy.context.view_layer.update()


def configure_bust_palette(bust):
    """Keep facial form readable through one live Home-palette material role."""
    stone_index = next((index for index, material in enumerate(bust.data.materials)
                        if material and material.get("abs_material_role") == "stone"), None)
    if stone_index is None:
        raise RuntimeError("Finale Bust has no authored Stone material slot.")
    for polygon in bust.data.polygons:
        polygon.material_index = stone_index
    bust.data.update()
    author(bust, "abs_palette_mode", "single")
    author(bust, "abs_palette_role", "stone")


def geometric_evidence(scene, bust, platform):
    original = scene.frame_current
    fps = scene.render.fps / scene.render.fps_base
    bust_base = min(vertex.co.z for vertex in bust.data.vertices)
    scene.frame_set(scene.timeline_markers["ABS_CAMERA_LOCK"].frame)
    bpy.context.view_layer.update()
    camera_position = bpy.data.objects["Scene Camera"].matrix_world.translation.copy()
    turns = []
    for fraction in (0.0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0):
        frame = 1.0 + fraction * 32.0 * fps
        scene.frame_set(math.floor(frame), subframe=frame % 1.0)
        bpy.context.view_layer.update()
        platform_top = max((platform.matrix_world @ vertex.co).z for vertex in platform.data.vertices)
        bust_bottom = min((bust.matrix_world @ vertex.co).z for vertex in bust.data.vertices)
        up = (bust.matrix_world.to_3x3() @ Vector((0, 0, 1))).normalized()
        pivot = bust.matrix_world.translation
        front = (bust.matrix_world.to_3x3() @ Vector((0, -1, 0))).normalized()
        to_camera = camera_position - pivot
        to_camera.z = 0
        to_camera.normalize()
        front_alignment = front.dot(to_camera)
        gap = bust_bottom - platform_top
        if abs(gap) > 0.001 or (up - Vector((0, 0, 1))).length > 1e-6:
            raise RuntimeError(f"Bust lost grounded upright contact at cycle fraction {fraction}.")
        if abs(pivot.z - platform_top) > 0.001:
            raise RuntimeError("Bust rotation pivot is not on its physical base.")
        if front_alignment < math.cos(math.radians(8.0)) - 1e-6:
            raise RuntimeError("Bust turns more than eight degrees away from the front camera view.")
        turns.append({
            "cycleFraction": fraction,
            "relativeRotationDegrees": round(math.degrees(
                bust.rotation_euler.z - bust["abs_motion_base_rotation_z"]), 6),
            "contactGapWU": round(gap, 6),
            "siteUpAxis": [round(up.x, 6), round(up.z, 6), round(-up.y, 6)],
            "sitePivotWU": [round(pivot.x, 6), round(pivot.z, 6), round(-pivot.y, 6)],
            "frontCameraAlignment": round(front_alignment, 8),
        })
    edge_use = {}
    for polygon in platform.data.polygons:
        for edge in polygon.edge_keys:
            edge_use[edge] = edge_use.get(edge, 0) + 1
    boundary = sum(count != 2 for count in edge_use.values())
    if boundary:
        raise RuntimeError(f"Finale platform is not closed: {boundary} non-manifold edges.")
    scene.frame_set(original)
    return {
        "platform": {"vertices": len(platform.data.vertices),
                     "faces": len(platform.data.polygons), "nonManifoldEdges": boundary},
        "bustBaseLocalZ": round(bust_base, 8),
        "boundedTurnCycle": turns,
    }


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate-blend", required=True)
    args = parser.parse_args(argv)
    destination = Path(args.candidate_blend).resolve()
    candidate_root = (ROOT / "output/about-v2-candidates").resolve()
    if candidate_root not in destination.parents or destination.suffix != ".blend":
        raise RuntimeError("A .blend beneath output/about-v2-candidates is required.")
    original_path = Path(bpy.data.filepath)
    original_hash = hashlib.sha256(original_path.read_bytes()).hexdigest()
    exporter = module("export-edited-about-v2-point-world")
    exporter.hydrate_internal_properties(bpy.context.scene)
    scene = bpy.context.scene
    bodies = exclude_bodies(scene)
    budgets = reallocate_budgets(scene)
    for obj in exporter.eligible_mesh_objects(scene):
        author(obj, "abs_rendering_profile", PROFILE_BY_MODEL[obj["abs_model_id"]])
    bust = bpy.data.objects["Finale Bust"]
    platform = bpy.data.objects["Finale Platform"]
    ground_bust(scene, bust, platform)
    configure_bust_palette(bust)
    motion = module("author-persistent-world-motion")
    motion.configure_bust_motion(scene)
    motion.configure_terrain_motion(scene)
    author(scene, "abs_persistent_motion_contract", motion.MOTION_CONTRACT)
    motion.update_guide()
    # Keep the validated canonical camera flight. Rebuilding the generic rig
    # would also relocate the platform and redistribute the gate horizon turn.
    # Responsive final-image composition is a runtime projection adjustment.
    author(scene, "abs_finale_composition_contract", "upright-bust-and-solid-platform/v2")
    author(scene, "abs_finale_contract", "grounded-frontal-bust-bounded-turn-stationary-camera-hold")
    author(scene, "abs_active_rendering_profiles", json.dumps(PROFILE_BY_MODEL, sort_keys=True))
    author(scene, "abs_clean_finale_source_sha256", original_hash)
    author(scene, "abs_clean_finale_script", "scripts/about-v2-blender/author-clean-bust-finale.py")
    evidence = geometric_evidence(scene, bust, platform)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    destination.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(destination), compress=True)
    evidence.update({
        "status": "ok", "sourceSha256": original_hash,
        "candidateSha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "candidateBlend": str(destination), "excludedBodyCount": len(bodies),
        "activeModels": PROFILE_BY_MODEL, "budgets": budgets,
    })
    destination.with_suffix(".geometry.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence, sort_keys=True))


if __name__ == "__main__":
    main()
