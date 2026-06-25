#!/usr/bin/env python3
"""
Run inside Blender to export a cleaned scan mesh and a matching camera path.

Example:
  /Applications/Blender.app/Contents/MacOS/Blender apartment.blend --background --python scripts/spatial-scan/export-blender-spatial-scan.py -- \
    --output-dir source-assets/spatial-scan \
    --camera-name ABS_CAMERA \
    --samples 180
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix


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

    parser = argparse.ArgumentParser(description="Export spatial scan GLB and baked camera path from Blender.")
    parser.add_argument("--output-dir", default="source-assets/spatial-scan")
    parser.add_argument("--camera-name", default="")
    parser.add_argument("--samples", type=int, default=180)
    parser.add_argument("--duration", type=float, default=18.0)
    parser.add_argument("--mesh-file", default="spatial-scan-clean.glb")
    parser.add_argument("--camera-file", default="camera-path-source.json")
    return parser.parse_args(argv)


def visible_mesh_objects():
    return [
        obj for obj in bpy.context.scene.objects
        if obj.type == "MESH" and obj.visible_get() and not obj.hide_render
    ]


def resolve_camera(name):
    if name:
        obj = bpy.data.objects.get(name)
        if obj and obj.type == "CAMERA":
            return obj
        raise RuntimeError(f"Camera '{name}' was not found")
    if bpy.context.scene.camera:
        return bpy.context.scene.camera
    cameras = [obj for obj in bpy.context.scene.objects if obj.type == "CAMERA"]
    if cameras:
        return cameras[0]
    raise RuntimeError("No camera found. Create one with a Follow Path setup before exporting.")


def convert_matrix_to_gltf(matrix):
    return AXIS_CONVERSION @ matrix @ AXIS_CONVERSION_INV


def export_mesh(output_path):
    meshes = visible_mesh_objects()
    if not meshes:
        raise RuntimeError("No visible mesh objects found to export")

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
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


def sample_camera_path(camera, sample_count, duration_seconds):
    scene = bpy.context.scene
    frame_start = int(scene.frame_start)
    frame_end = int(scene.frame_end)
    if frame_end <= frame_start:
        frame_end = frame_start + max(1, sample_count - 1)

    depsgraph = bpy.context.evaluated_depsgraph_get()
    frames = []
    for index in range(max(2, sample_count)):
        amount = index / max(1, sample_count - 1)
        frame = frame_start + ((frame_end - frame_start) * amount)
        scene.frame_set(int(round(frame)))
        evaluated_camera = camera.evaluated_get(depsgraph)
        matrix = convert_matrix_to_gltf(evaluated_camera.matrix_world.copy())
        position = matrix.to_translation()
        quaternion = matrix.to_quaternion()
        fov = math.degrees(evaluated_camera.data.angle)
        frames.append({
            "t": round(amount, 6),
            "position": [position.x, position.y, position.z],
            "quaternion": [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
            "fov": fov,
        })

    return {
        "version": 1,
        "sourceSpace": "gltf-y-up",
        "durationSeconds": duration_seconds,
        "frames": frames,
    }


def main():
    args = parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    mesh_path = output_dir / args.mesh_file
    camera_path = output_dir / args.camera_file

    export_mesh(mesh_path)
    camera = resolve_camera(args.camera_name)
    path_payload = sample_camera_path(camera, args.samples, args.duration)
    camera_path.write_text(json.dumps(path_payload, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote cleaned scan mesh: {mesh_path}")
    print(f"Wrote camera path: {camera_path}")


if __name__ == "__main__":
    main()
