#!/usr/bin/env python3
"""
Import a spatial scan into Blender, remove runtime-irrelevant scene data, create a
simple human-height camera route, and export a clean GLB plus camera path JSON.

Example:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/spatial-scan/prepare-blender-spatial-scan.py -- \
    --input /path/to/scene.gltf \
    --output-dir /tmp/spatial-scan \
    --samples 180 \
    --duration 18
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


AXIS_CONVERSION = Matrix((
    (1.0, 0.0, 0.0, 0.0),
    (0.0, 0.0, 1.0, 0.0),
    (0.0, -1.0, 0.0, 0.0),
    (0.0, 0.0, 0.0, 1.0),
))
AXIS_CONVERSION_INV = AXIS_CONVERSION.inverted()


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []

    parser = argparse.ArgumentParser(description="Prepare a glTF/GLB spatial scan for point-cloud baking.")
    parser.add_argument("--input", required=True, help="Source .gltf or .glb scan file.")
    parser.add_argument("--output-dir", default="source-assets/spatial-scan")
    parser.add_argument("--mesh-file", default="spatial-scan-clean.glb")
    parser.add_argument("--camera-file", default="camera-path-source.json")
    parser.add_argument("--blend-file", default="", help="Optional .blend working file to save.")
    parser.add_argument("--samples", type=int, default=180)
    parser.add_argument("--duration", type=float, default=18.0)
    parser.add_argument("--fps", type=int, default=24)
    return parser.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_scan(source_path):
    extension = source_path.suffix.lower()
    if extension not in {".gltf", ".glb"}:
        raise RuntimeError(f"Unsupported scan input '{source_path}'. Export to .gltf or .glb first.")
    bpy.ops.import_scene.gltf(filepath=str(source_path))
    bpy.context.view_layer.update()


def visible_mesh_objects():
    return [
        obj for obj in bpy.context.scene.objects
        if obj.type == "MESH" and obj.visible_get() and not obj.hide_render
    ]


def clean_mesh(mesh):
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    mesh.data.materials.clear()

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.delete_loose()
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")


def scene_bounds(meshes):
    min_corner = Vector((math.inf, math.inf, math.inf))
    max_corner = Vector((-math.inf, -math.inf, -math.inf))
    for mesh in meshes:
        for corner in mesh.bound_box:
            world_corner = mesh.matrix_world @ Vector(corner)
            min_corner.x = min(min_corner.x, world_corner.x)
            min_corner.y = min(min_corner.y, world_corner.y)
            min_corner.z = min(min_corner.z, world_corner.z)
            max_corner.x = max(max_corner.x, world_corner.x)
            max_corner.y = max(max_corner.y, world_corner.y)
            max_corner.z = max(max_corner.z, world_corner.z)
    return min_corner, max_corner


def make_route_points(min_corner, max_corner):
    center = (min_corner + max_corner) * 0.5
    size = max_corner - min_corner
    path_axis = 1 if size.y >= size.x else 0
    cross_axis = 0 if path_axis == 1 else 1
    min_axis = min_corner[path_axis]
    max_axis = max_corner[path_axis]
    cross_size = max(size[cross_axis], 0.001)
    eye_height = min_corner.z + min(max(size.z * 0.54, 1.45), 1.65)

    axis_amounts = [0.12, 0.29, 0.45, 0.61, 0.78, 0.9]
    cross_amounts = [-0.24, -0.1, 0.08, 0.24, 0.06, -0.18]
    points = []
    for axis_amount, cross_amount in zip(axis_amounts, cross_amounts):
        point = Vector((center.x, center.y, eye_height))
        point[path_axis] = min_axis + ((max_axis - min_axis) * axis_amount)
        point[cross_axis] = center[cross_axis] + (cross_amount * cross_size)
        points.append(point)
    return points


def create_path_curve(points):
    curve = bpy.data.curves.new("ABS_CAMERA_PATH", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 18
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for spline_point, point in zip(spline.points, points):
        spline_point.co = (point.x, point.y, point.z, 1.0)

    path = bpy.data.objects.new("ABS_CAMERA_PATH", curve)
    bpy.context.collection.objects.link(path)
    return path


def look_at(camera, target):
    direction = target - camera.location
    if direction.length < 0.001:
        return
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def create_camera_animation(points, duration, fps):
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = max(2, int(round(duration * fps)))
    scene.render.fps = fps

    camera_data = bpy.data.cameras.new("ABS_CAMERA")
    camera_data.angle = math.radians(52.0)
    camera_data.clip_start = 0.03
    camera_data.clip_end = 120.0
    camera = bpy.data.objects.new("ABS_CAMERA", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera

    frame_span = scene.frame_end - scene.frame_start
    for index, point in enumerate(points):
        amount = index / max(1, len(points) - 1)
        frame = scene.frame_start + round(frame_span * amount)
        camera.location = point
        focus = points[min(index + 1, len(points) - 1)]
        if index == len(points) - 1:
            focus = point + (point - points[index - 1])
        look_at(camera, focus)
        camera.keyframe_insert(data_path="location", frame=frame)
        camera.keyframe_insert(data_path="rotation_euler", frame=frame)

    if camera.animation_data and camera.animation_data.action:
        for fcurve in camera.animation_data.action.fcurves:
            for keyframe in fcurve.keyframe_points:
                keyframe.interpolation = "BEZIER"

    return camera


def convert_matrix_to_gltf(matrix):
    return AXIS_CONVERSION @ matrix @ AXIS_CONVERSION_INV


def sample_camera_path(camera, sample_count, duration_seconds):
    scene = bpy.context.scene
    depsgraph = bpy.context.evaluated_depsgraph_get()
    frames = []
    for index in range(max(2, sample_count)):
        amount = index / max(1, sample_count - 1)
        frame = scene.frame_start + ((scene.frame_end - scene.frame_start) * amount)
        scene.frame_set(int(round(frame)))
        evaluated_camera = camera.evaluated_get(depsgraph)
        matrix = convert_matrix_to_gltf(evaluated_camera.matrix_world.copy())
        position = matrix.to_translation()
        quaternion = matrix.to_quaternion()
        frames.append({
            "t": round(amount, 6),
            "position": [position.x, position.y, position.z],
            "quaternion": [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
            "fov": math.degrees(evaluated_camera.data.angle),
        })

    return {
        "version": 1,
        "sourceSpace": "gltf-y-up",
        "durationSeconds": duration_seconds,
        "frames": frames,
    }


def export_clean_mesh(meshes, output_path):
    bpy.ops.object.select_all(action="DESELECT")
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        use_selection=True,
        export_cameras=False,
        export_lights=False,
        export_materials="NONE",
        export_apply=True,
    )


def main():
    args = parse_args()
    source_path = Path(args.input).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    if not source_path.exists():
        raise RuntimeError(f"Input scan was not found: {source_path}")

    clear_scene()
    import_scan(source_path)
    meshes = visible_mesh_objects()
    if not meshes:
        raise RuntimeError("No mesh objects were imported from the scan.")

    for mesh in meshes:
        clean_mesh(mesh)

    min_corner, max_corner = scene_bounds(meshes)
    route_points = make_route_points(min_corner, max_corner)
    create_path_curve(route_points)
    camera = create_camera_animation(route_points, args.duration, args.fps)

    mesh_path = output_dir / args.mesh_file
    camera_path = output_dir / args.camera_file
    export_clean_mesh(meshes, mesh_path)
    camera_path.write_text(json.dumps(sample_camera_path(camera, args.samples, args.duration), indent=2) + "\n", encoding="utf-8")

    if args.blend_file:
        bpy.ops.wm.save_as_mainfile(filepath=str((output_dir / args.blend_file).resolve()))

    bounds_payload = {
        "meshCount": len(meshes),
        "vertices": sum(len(mesh.data.vertices) for mesh in meshes),
        "polygons": sum(len(mesh.data.polygons) for mesh in meshes),
        "bounds": {
            "min": [min_corner.x, min_corner.y, min_corner.z],
            "max": [max_corner.x, max_corner.y, max_corner.z],
        },
        "routePoints": [[point.x, point.y, point.z] for point in route_points],
    }
    print("ABS_SPATIAL_SCAN_PREP=" + json.dumps(bounds_payload))
    print(f"Wrote cleaned scan mesh: {mesh_path}")
    print(f"Wrote camera path: {camera_path}")


if __name__ == "__main__":
    main()
