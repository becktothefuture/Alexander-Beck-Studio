#!/usr/bin/env python3
"""Sample the user-edited About V2 Blender scene into website point assets."""

import argparse
import bisect
import hashlib
import json
import math
import random
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector


EXCLUDED_COLLECTIONS = {
    "07_TERMINAL_BUST",
    "07_OCEAN",
    "ABS_CAMERA_RIG",
    "ABS_GUIDES",
    "ABS_PREVIEW_LIGHTS",
}
FINALE_ALIGNMENT_COLLECTIONS = {"06_LIVING"}
OCEAN_MARKER_NAME = "Plane"
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = REPO_ROOT / "react-app/app/public/config/contents-about.json"


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description="Export edited About V2 point assets.")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--slug", default="about-v2-edited-world")
    parser.add_argument("--low", type=int, default=5000)
    parser.add_argument("--medium", type=int, default=12000)
    parser.add_argument("--low-ocean", type=int, default=3000)
    parser.add_argument("--medium-ocean", type=int, default=7000)
    parser.add_argument("--ocean-depth", type=float, default=1800.0)
    parser.add_argument("--ocean-near-offset", type=float, default=2.5)
    parser.add_argument("--ocean-height", type=float, default=-6.2)
    parser.add_argument("--ocean-near-half-width", type=float, default=50.0)
    parser.add_argument("--ocean-far-half-width", type=float, default=4400.0)
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    parser.add_argument("--seed", type=int, default=506832829)
    return parser.parse_args(argv)


def blender_to_site(vector):
    return Vector((vector.x, vector.z, -vector.y))


def eligible_mesh_objects(scene):
    objects = []
    for obj in scene.objects:
        if obj.type != "MESH" or obj.name == OCEAN_MARKER_NAME:
            continue
        if obj.hide_render or obj.get("abs_export") is False:
            continue
        collection_names = {collection.name for collection in obj.users_collection}
        if collection_names & EXCLUDED_COLLECTIONS:
            continue
        objects.append(obj)
    return sorted(objects, key=lambda obj: obj.name)


def collect_triangles(objects, finale_target_y):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    triangles = []
    cumulative_area = []
    total_area = 0.0
    object_stats = []
    finale_min_y = math.inf
    finale_max_y = -math.inf
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=False, depsgraph=depsgraph)
        try:
            mesh.calc_loop_triangles()
            matrix = evaluated.matrix_world
            collection_names = {collection.name for collection in obj.users_collection}
            finale_alignment = bool(collection_names & FINALE_ALIGNMENT_COLLECTIONS)
            object_triangle_count = 0
            object_area = 0.0
            for triangle in mesh.loop_triangles:
                a = blender_to_site(matrix @ mesh.vertices[triangle.vertices[0]].co)
                b = blender_to_site(matrix @ mesh.vertices[triangle.vertices[1]].co)
                c = blender_to_site(matrix @ mesh.vertices[triangle.vertices[2]].co)
                cross = (b - a).cross(c - a)
                area = cross.length * 0.5
                if not math.isfinite(area) or area <= 1e-9:
                    continue
                normal = cross.normalized()
                total_area += area
                object_area += area
                object_triangle_count += 1
                triangles.append((a, b, c, normal, obj.name, finale_alignment))
                cumulative_area.append(total_area)
                if finale_alignment:
                    finale_min_y = min(finale_min_y, a.y, b.y, c.y)
                    finale_max_y = max(finale_max_y, a.y, b.y, c.y)
            object_stats.append({
                "name": obj.name,
                "triangles": object_triangle_count,
                "surfaceArea": round(object_area, 6),
                "collections": sorted(collection_names),
            })
        finally:
            evaluated.to_mesh_clear()
    if not triangles or total_area <= 0:
        raise RuntimeError("The edited Blender scene contains no exportable mesh surface.")
    if not math.isfinite(finale_min_y) or not math.isfinite(finale_max_y):
        raise RuntimeError("The edited Blender scene has no final-stage geometry to align.")
    finale_source_center_y = (finale_min_y + finale_max_y) * 0.5
    finale_offset_y = finale_target_y - finale_source_center_y
    alignment = {
        "collections": sorted(FINALE_ALIGNMENT_COLLECTIONS),
        "sourceMinY": round(finale_min_y, 6),
        "sourceMaxY": round(finale_max_y, 6),
        "sourceCenterY": round(finale_source_center_y, 6),
        "cameraTrackY": round(finale_target_y, 6),
        "offsetY": round(finale_offset_y, 6),
    }
    return triangles, cumulative_area, total_area, object_stats, alignment


def balanced_groups(count, seed):
    groups = [index % 6 for index in range(count)]
    random.Random(seed).shuffle(groups)
    return groups


def sample_environment(
    count,
    triangles,
    cumulative_area,
    total_area,
    finale_offset_y,
    seed,
):
    rng = random.Random(seed)
    groups = balanced_groups(count, seed ^ 0x5F3759DF)
    points = []
    for index in range(count):
        triangle_index = bisect.bisect_left(cumulative_area, rng.random() * total_area)
        a, b, c, normal, _object_name, finale_alignment = triangles[
            min(triangle_index, len(triangles) - 1)
        ]
        u = rng.random()
        v = rng.random()
        if u + v > 1:
            u = 1 - u
            v = 1 - v
        point = a + ((b - a) * u) + ((c - a) * v)
        if finale_alignment:
            point.y += finale_offset_y
        points.append((
            point.x, point.y, point.z,
            normal.x, normal.y, normal.z,
            rng.random(), float(groups[index]),
        ))
    return points


def resolve_website_camera_end(config_path):
    document = json.loads(Path(config_path).read_text(encoding="utf-8"))
    move_keys = document["tracks"]["camera"]["moveKeys"]
    if not move_keys:
        raise RuntimeError("The About V2 camera track has no move keys.")
    final_key = max(move_keys, key=lambda key: float(key["atWU"]))
    position = final_key.get("position")
    if not isinstance(position, list) or len(position) != 3:
        raise RuntimeError("The final About V2 camera key has no valid position.")
    return Vector(tuple(float(value) for value in position))


def sample_ocean(
    count,
    near_z,
    depth,
    base_y,
    near_half_width,
    far_half_width,
    seed,
):
    rng = random.Random(seed)
    groups = balanced_groups(count, seed ^ 0x9E3779B9)
    columns = max(8, math.ceil(math.sqrt(count * 1.7)))
    rows = math.ceil(count / columns)
    points = []
    for index in range(count):
        row = index // columns
        column = index % columns
        row_t = min(1.0, (row + 0.5 + ((rng.random() - 0.5) * 0.32)) / rows)
        column_t = min(1.0, max(
            0.0,
            (column + 0.5 + ((rng.random() - 0.5) * 0.30)) / columns,
        ))
        # Space the camera-facing rows widely, gather most rows through the
        # visible middle distance, then send a smaller tail deep into the fog.
        # These are real world-unit bands rather than percentages so increasing
        # the ocean depth does not starve the visible water of points.
        if row_t < 0.03:
            depth_value = (row_t / 0.03) * 28.0
        elif row_t < 0.86:
            depth_value = 28.0 + (((row_t - 0.03) / 0.83) * 492.0)
        elif row_t < 0.97:
            depth_value = 520.0 + (((row_t - 0.86) / 0.11) * 380.0)
        else:
            depth_value = 900.0 + (((row_t - 0.97) / 0.03) * (depth - 900.0))
        depth_t = min(1.0, depth_value / depth)
        # Widen by physical depth rather than row index. The 2.4+:1 lateral
        # reserve stays beyond a 21:9 camera frustum at every visible depth,
        # so the ocean cannot expose trapezoid edges as the camera advances.
        width_t = depth_t
        half_width = near_half_width + ((far_half_width - near_half_width) * width_t)
        x = ((column_t * 2) - 1) * half_width
        z = near_z - (depth * depth_t)
        # This is only a quiet rest surface. The runtime shader supplies the
        # continuous multi-directional wave field.
        y = base_y + (math.sin((x * 0.11) + (z * 0.035)) * 0.025)
        point_seed = -(0.000001 + rng.random())
        points.append((
            x, y, z,
            0.0, 1.0, 0.0,
            point_seed, float(groups[index]),
        ))
    return points


def point_bounds(points):
    minimum = [math.inf, math.inf, math.inf]
    maximum = [-math.inf, -math.inf, -math.inf]
    for point in points:
        for axis in range(3):
            minimum[axis] = min(minimum[axis], point[axis])
            maximum[axis] = max(maximum[axis], point[axis])
    return {
        "min": [round(value, 6) for value in minimum],
        "max": [round(value, 6) for value in maximum],
    }


def write_binary(path, points):
    with path.open("wb") as output:
        for point in points:
            output.write(struct.pack("<8f", *point))


def material_counts(points):
    counts = [0] * 6
    for point in points:
        counts[max(0, min(5, round(point[7])))] += 1
    return counts


def main():
    args = parse_args()
    if args.low_ocean >= args.low or args.medium_ocean >= args.medium:
        raise ValueError("Each ocean count must leave at least one environment point.")
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    source_blend = Path(bpy.data.filepath).resolve()
    scene = bpy.context.scene
    scene.frame_set(scene.frame_end)
    camera = scene.camera
    if camera is None:
        raise RuntimeError("The edited scene has no active camera.")
    blender_camera_site = blender_to_site(camera.matrix_world.translation)
    website_camera_site = resolve_website_camera_end(args.config)
    ocean_near_z = website_camera_site.z - args.ocean_near_offset
    objects = eligible_mesh_objects(scene)
    triangles, cumulative_area, total_area, object_stats, finale_alignment = collect_triangles(
        objects,
        website_camera_site.y,
    )

    lod_specs = {
        "low": (args.low, args.low_ocean, args.seed ^ 0x13579BDF),
        "medium": (args.medium, args.medium_ocean, args.seed ^ 0x2468ACE0),
    }
    lods = {}
    for quality, (total_count, ocean_count, seed) in lod_specs.items():
        environment_count = total_count - ocean_count
        environment = sample_environment(
            environment_count,
            triangles,
            cumulative_area,
            total_area,
            finale_alignment["offsetY"],
            seed,
        )
        ocean = sample_ocean(
            ocean_count,
            ocean_near_z,
            args.ocean_depth,
            args.ocean_height,
            args.ocean_near_half_width,
            args.ocean_far_half_width,
            seed ^ 0xA5A5A5A5,
        )
        points = environment + ocean
        file_name = f"{args.slug}-points-{quality}.bin"
        output_path = output_dir / file_name
        write_binary(output_path, points)
        lods[quality] = {
            "file": file_name,
            "count": total_count,
            "bytes": output_path.stat().st_size,
            "environmentCount": environment_count,
            "oceanCount": ocean_count,
            "bounds": point_bounds(points),
            "materialCounts": material_counts(points),
        }

    source_hash = hashlib.sha256(source_blend.read_bytes()).hexdigest()
    meta = {
        "version": 1,
        "name": args.slug,
        "title": "About V2 edited Blender world",
        "creator": "Alexander Beck",
        "source": {
            "file": str(source_blend),
            "sha256": source_hash,
            "objects": object_stats,
            "objectCount": len(objects),
            "triangleCount": len(triangles),
            "surfaceArea": round(total_area, 6),
            "oceanMarker": OCEAN_MARKER_NAME if OCEAN_MARKER_NAME in scene.objects else None,
        },
        "coordinateSystem": {
            "source": "Blender right-handed Z-up",
            "runtime": "website right-handed Y-up",
            "mapping": "Blender (x,y,z) -> website (x,z,-y)",
            "units": "metres / website world units",
        },
        "layout": {
            "format": "little-endian float32",
            "strideFloats": 8,
            "strideBytes": 32,
            "attributes": [
                "position.x", "position.y", "position.z",
                "normal.x", "normal.y", "normal.z",
                "seed", "colorGroup",
            ],
            "oceanMarker": "seed < 0",
        },
        "palette": {
            "owner": "Home simulation palette snapshot",
            "groups": 6,
            "policy": "balanced mixed groups; runtime colors only",
        },
        "ocean": {
            "nearZ": round(ocean_near_z, 6),
            "farZ": round(ocean_near_z - args.ocean_depth, 6),
            "baseY": args.ocean_height,
            "nearHalfWidth": args.ocean_near_half_width,
            "farHalfWidth": args.ocean_far_half_width,
            "cameraEnd": [round(value, 6) for value in website_camera_site],
            "blenderCameraEnd": [round(value, 6) for value in blender_camera_site],
            "nearOffset": args.ocean_near_offset,
        },
        "finaleAlignment": finale_alignment,
        "lods": lods,
    }
    meta_path = output_dir / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(output_dir),
        "sourceSha256": source_hash,
        "objects": len(objects),
        "triangles": len(triangles),
        "ocean": meta["ocean"],
        "lods": lods,
    }, indent=2))


main()
