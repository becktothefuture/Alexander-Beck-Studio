#!/usr/bin/env python3
"""Export the authored About Blender world as one progressive surfel scene."""

import argparse
import bisect
import hashlib
import json
import math
import re
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


SCHEMA = "about-point-scene"
SCHEMA_VERSION = 2
SURFEL_STRIDE_BYTES = 32
SURFEL_STRUCT = struct.Struct("<3f2hHHHHI4B")
RADIUS_STEP_WU = 0.0001
BEST_CANDIDATES_PER_SURFEL = 8
SURFEL_RADIUS_TO_SPACING = 0.56
ENVIRONMENT_DENSITY_WEIGHT = 0.10
PORTRAIT_MAX_VERTICAL_FOV_DEGREES = 115
DEFAULT_SURFEL_BUDGETS = {"mobile": 20000, "desktop": 60000, "master": 90000}
EXCLUDED_COLLECTIONS = {
    "07_TERMINAL_BUST", "99_REMOVED_BOTTOM_TRACK_BACKUP", "ABS_CAMERA_RIG",
    "ABS_GUIDES", "ABS_PREVIEW_LIGHTS",
}
REMOVED_GEOMETRY_PATTERN = re.compile(r"(?:^|[_-])(TRACK|RAIL|SLEEPER)(?:$|[_-])", re.I)
ABS_MATERIAL_ROLE_PATTERN = re.compile(r"^ABS_([0-5])_")
SITE_BASIS = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
PALETTE_ROLES = ("atmosphere", "stone", "steel", "glass", "signal", "organic")
ROLE_TO_PALETTE = {role: index for index, role in enumerate(PALETTE_ROLES)}
FALLBACK_ROLE_BY_COLLECTION = {
    "07_FINALE_WORKBENCH": "finale-workbench",
    "02_HOOPS": "path-tunnel",
    "04_LOOP": "path-tunnel",
    "06_LIVING": "parametric-forest",
    "ABS_FLOATING_MODELS": "floating-model",
}
FALLBACK_PALETTE_BY_ROLE = {
    "finale-workbench": 2, "path-tunnel": 4,
    "parametric-forest": 5, "floating-model": 2,
}
COMPONENT_POLICY_RULES = {
    "authored-instance-perimeter": {"mode": "all"},
    "authored-instance-angular-coverage": {"mode": "all"},
    "thin-feature-curvature": {"mode": "all"},
    "rail-cell-instance-coverage": {"mode": "all"},
    "continuous-outline-object-fallback": {"mode": "all"},
    "semantic-material-projected-feature": {
        "mode": "meaningful-area", "relativeFloor": 0.0015,
    },
    "semantic-object-projected-feature": {
        "mode": "meaningful-area", "relativeFloor": 0.0015,
    },
    "semantic-material-projected-coverage": {
        "mode": "meaningful-area", "relativeFloor": 0.0015,
    },
    "explicit-detail-projected-feature": {
        "mode": "meaningful-area", "relativeFloor": 0.0005,
    },
}


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description="Export the About Blender surfel scene.")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--slug", default="about-v2-edited-world")
    parser.add_argument("--low", "--mobile", dest="mobile", type=int)
    parser.add_argument("--medium", "--desktop", dest="desktop", type=int)
    parser.add_argument("--master", type=int)
    parser.add_argument("--seed", type=int, default=506832829)
    return parser.parse_args(argv)


def blender_to_site(vector):
    return Vector((vector.x, vector.z, -vector.y))


def finite_number(value, fallback=None):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return number if math.isfinite(number) else fallback


def resolve_surfel_budgets(scene, args):
    for profile_name, fallback in DEFAULT_SURFEL_BUDGETS.items():
        command_value = getattr(args, profile_name)
        scene_value = finite_number(scene.get(f"abs_surfel_{profile_name}_budget"))
        resolved = command_value if command_value is not None else scene_value
        setattr(args, profile_name, int(resolved if resolved is not None else fallback))


def semantic_string(value, fallback):
    value = str(value or "").strip()
    return value or fallback


def stable_u32(*parts):
    data = "\0".join(str(part) for part in parts).encode("utf-8")
    return int.from_bytes(hashlib.blake2s(data, digest_size=4).digest(), "little")


def stable_phase(*parts):
    return stable_u32(*parts) / 0x100000000


def radical_inverse(index, base):
    result = 0.0
    fraction = 1.0 / base
    while index:
        result += (index % base) * fraction
        index //= base
        fraction /= base
    return result


def portable_source_path(source_path):
    repo_root = Path(__file__).resolve().parents[2]
    try:
        return source_path.relative_to(repo_root).as_posix()
    except ValueError:
        return source_path.name


def eligible_mesh_objects(scene):
    objects = []
    for obj in scene.objects:
        if obj.type != "MESH" or obj.hide_render or obj.get("abs_export") is False:
            continue
        collection_names = {collection.name for collection in obj.users_collection}
        if collection_names & EXCLUDED_COLLECTIONS or REMOVED_GEOMETRY_PATTERN.search(obj.name):
            continue
        objects.append(obj)
    return sorted(objects, key=lambda item: (
        semantic_string(item.get("abs_model_id"), item.get("abs_density_group") or item.name),
        semantic_string(item.get("abs_object_id"), item.name),
    ))


def fallback_role(collection_names):
    for collection_name in sorted(collection_names):
        if collection_name in FALLBACK_ROLE_BY_COLLECTION:
            return FALLBACK_ROLE_BY_COLLECTION[collection_name]
    return "floating-model"


def record_fallback(fallbacks, object_name, field, value):
    fallbacks.append({"object": object_name, "field": field, "value": value})


def object_semantics(obj, collection_names, fallbacks):
    role = str(obj.get("abs_role") or "").strip()
    if not role:
        role = fallback_role(collection_names)
        record_fallback(fallbacks, obj.name, "abs_role", role)
    model_key = str(obj.get("abs_model_id") or "").strip()
    if not model_key:
        model_key = semantic_string(obj.get("abs_density_group"), obj.name)
        record_fallback(fallbacks, obj.name, "abs_model_id", model_key)
    object_key = str(obj.get("abs_object_id") or "").strip()
    if not object_key:
        object_key = obj.name
        record_fallback(fallbacks, obj.name, "abs_object_id", object_key)
    motion_key = str(obj.get("abs_motion_group") or "").strip()
    if not motion_key:
        motion_key = f"{model_key}.rigid"
        record_fallback(fallbacks, obj.name, "abs_motion_group", motion_key)
    reveal_key = str(obj.get("abs_reveal_group") or "").strip()
    if not reveal_key:
        reveal_key = model_key
        record_fallback(fallbacks, obj.name, "abs_reveal_group", reveal_key)
    component_policy = str(obj.get("abs_component_policy") or "").strip()
    if not component_policy:
        raise RuntimeError(f"{obj.name} has no authored abs_component_policy.")
    if component_policy not in COMPONENT_POLICY_RULES:
        raise RuntimeError(
            f'{obj.name} uses unsupported abs_component_policy "{component_policy}".'
        )
    density_factor = finite_number(obj.get("abs_point_density"), 1.0)
    if density_factor is None or density_factor <= 0:
        raise RuntimeError(f"{obj.name} has invalid abs_point_density.")
    feature_priority = finite_number(obj.get("abs_feature_priority"), 1.0)
    if feature_priority is None or feature_priority <= 0:
        raise RuntimeError(f"{obj.name} has invalid abs_feature_priority.")
    return {
        "role": role,
        "modelKey": model_key,
        "objectKey": object_key,
        "motionKey": motion_key,
        "revealKey": reveal_key,
        "componentPolicy": component_policy,
        "densityGroup": semantic_string(obj.get("abs_density_group"), model_key),
        "densityFactor": density_factor,
        "visibilityStartWU": finite_number(obj.get("abs_visibility_start_wu")),
        "visibilityEndWU": finite_number(obj.get("abs_visibility_end_wu")),
        "preserveMinPx": finite_number(obj.get("abs_preserve_min_px")),
        "featurePriority": feature_priority,
    }


def palette_role_from_material(material, fallback, fallbacks, object_name):
    if material:
        slot = material.get("abs_palette_slot")
        if isinstance(slot, str) and slot.strip().lower() in ROLE_TO_PALETTE:
            return ROLE_TO_PALETTE[slot.strip().lower()]
        numeric = finite_number(slot)
        if numeric is not None and 0 <= round(numeric) < len(PALETTE_ROLES):
            return round(numeric)
        role = str(material.get("abs_material_role") or "").strip().lower()
        if role in ROLE_TO_PALETTE:
            return ROLE_TO_PALETTE[role]
        match = ABS_MATERIAL_ROLE_PATTERN.match(material.name)
        if match:
            resolved = int(match.group(1))
            record_fallback(
                fallbacks, object_name,
                f"material:{material.name}.abs_palette_slot", resolved,
            )
            return resolved
    material_name = material.name if material else "<none>"
    record_fallback(
        fallbacks, object_name,
        f"material:{material_name}.abs_palette_slot", fallback,
    )
    return fallback


def feature_classes(mesh, normals):
    edge_faces = {}
    for triangle, normal in zip(mesh.loop_triangles, normals):
        for edge in (
            (triangle.vertices[0], triangle.vertices[1]),
            (triangle.vertices[1], triangle.vertices[2]),
            (triangle.vertices[2], triangle.vertices[0]),
        ):
            edge_faces.setdefault(tuple(sorted(edge)), []).append(normal)
    classes = []
    crease_cosine = math.cos(math.radians(35.0))
    for triangle in mesh.loop_triangles:
        feature_class = 0
        for edge in (
            (triangle.vertices[0], triangle.vertices[1]),
            (triangle.vertices[1], triangle.vertices[2]),
            (triangle.vertices[2], triangle.vertices[0]),
        ):
            edge_normals = edge_faces.get(tuple(sorted(edge)), ())
            if len(edge_normals) == 1:
                feature_class = max(feature_class, 1)
            elif len(edge_normals) > 1 and any(
                left.dot(right) < crease_cosine
                for index, left in enumerate(edge_normals)
                for right in edge_normals[index + 1:]
            ):
                feature_class = max(feature_class, 2)
        classes.append(feature_class)
    return classes


def triangle_component_ids(mesh):
    """Return deterministic connected-component IDs for evaluated triangles."""
    parents = list(range(len(mesh.vertices)))

    def find(vertex):
        while parents[vertex] != vertex:
            parents[vertex] = parents[parents[vertex]]
            vertex = parents[vertex]
        return vertex

    def union(left, right):
        left_root = find(left)
        right_root = find(right)
        if left_root == right_root:
            return
        low, high = sorted((left_root, right_root))
        parents[high] = low

    for triangle in mesh.loop_triangles:
        union(triangle.vertices[0], triangle.vertices[1])
        union(triangle.vertices[1], triangle.vertices[2])
    roots = sorted({find(triangle.vertices[0]) for triangle in mesh.loop_triangles})
    component_by_root = {root: index for index, root in enumerate(roots)}
    return [
        component_by_root[find(triangle.vertices[0])]
        for triangle in mesh.loop_triangles
    ]


def collect_scene_geometry(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    surfaces = []
    fallbacks = []
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=False, depsgraph=depsgraph)
        try:
            mesh.calc_loop_triangles()
            if not mesh.loop_triangles:
                continue
            matrix = evaluated.matrix_world
            collection_names = {collection.name for collection in obj.users_collection}
            semantics = object_semantics(obj, collection_names, fallbacks)
            fallback_palette = FALLBACK_PALETTE_BY_ROLE.get(semantics["role"], 2)
            transformed = []
            normals = []
            for triangle in mesh.loop_triangles:
                vertices = tuple(
                    blender_to_site(matrix @ mesh.vertices[index].co)
                    for index in triangle.vertices
                )
                cross = (vertices[1] - vertices[0]).cross(vertices[2] - vertices[0])
                if not math.isfinite(cross.length) or cross.length <= 2e-9:
                    transformed.append(None)
                    normals.append(Vector((0.0, 1.0, 0.0)))
                else:
                    transformed.append(vertices)
                    normals.append(cross.normalized())
            classes = feature_classes(mesh, normals)
            component_ids = triangle_component_ids(mesh)
            triangles = []
            cumulative_area = []
            component_areas = {}
            surface_area = 0.0
            bounds_min = [math.inf, math.inf, math.inf]
            bounds_max = [-math.inf, -math.inf, -math.inf]
            for triangle_index, triangle in enumerate(mesh.loop_triangles):
                vertices = transformed[triangle_index]
                if vertices is None:
                    continue
                area = (vertices[1] - vertices[0]).cross(vertices[2] - vertices[0]).length * 0.5
                polygon = mesh.polygons[triangle.polygon_index]
                material = (
                    mesh.materials[polygon.material_index]
                    if polygon.material_index < len(mesh.materials)
                    else None
                )
                palette_role = palette_role_from_material(
                    material, fallback_palette, fallbacks, obj.name,
                )
                surface_area += area
                cumulative_area.append(surface_area)
                component_id = component_ids[triangle_index]
                component_areas[component_id] = component_areas.get(component_id, 0.0) + area
                triangles.append({
                    "index": len(triangles),
                    "vertices": vertices,
                    "normal": normals[triangle_index],
                    "area": area,
                    "paletteRole": palette_role,
                    "featureClass": classes[triangle_index],
                    "componentId": component_id,
                })
                for point in vertices:
                    for axis in range(3):
                        bounds_min[axis] = min(bounds_min[axis], point[axis])
                        bounds_max[axis] = max(bounds_max[axis], point[axis])
            if triangles:
                surfaces.append({
                    "name": obj.name,
                    **semantics,
                    "collections": sorted(collection_names),
                    "triangles": triangles,
                    "cumulativeArea": cumulative_area,
                    "surfaceArea": surface_area,
                    "componentAreas": component_areas,
                    "connectedComponentCount": len(component_areas),
                    "triangleCount": len(triangles),
                    "boundsMin": bounds_min,
                    "boundsMax": bounds_max,
                })
        finally:
            evaluated.to_mesh_clear()
    if not surfaces:
        raise RuntimeError("The Blender scene contains no exportable evaluated mesh surface.")
    unique_fallbacks = {json.dumps(item, sort_keys=True): item for item in fallbacks}
    return (
        surfaces,
        sorted(unique_fallbacks.values(), key=lambda item: (item["object"], item["field"])),
    )


def allocate_exact(weights, count, minimums):
    if len(weights) != len(minimums):
        raise RuntimeError("Allocation weights and semantic minimums do not match.")
    if count < sum(minimums):
        raise RuntimeError(f"Budget {count} cannot cover semantic minimum {sum(minimums)}.")
    if not weights or any(weight <= 0 for weight in weights):
        raise RuntimeError("The scene has no positive sampling weight.")
    allocations = list(minimums)
    for _ in range(count - sum(allocations)):
        index = min(
            range(len(weights)),
            key=lambda item: ((allocations[item] + 0.5) / weights[item], item),
        )
        allocations[index] += 1
    return allocations


def allocate_progressive_prefix(capacities, count, minimums):
    if len(capacities) != len(minimums) or any(
        minimum < 0 or minimum > capacity
        for minimum, capacity in zip(minimums, capacities)
    ):
        raise RuntimeError("Progressive profile capacities and minimums do not match.")
    if count < sum(minimums) or count > sum(capacities):
        raise RuntimeError("Progressive profile budget is outside its nested capacity.")
    allocations = list(minimums)
    remaining = count - sum(allocations)
    for _ in range(remaining):
        candidates = [
            index for index, capacity in enumerate(capacities)
            if allocations[index] < capacity
        ]
        index = min(
            candidates,
            key=lambda item: ((allocations[item] + 0.5) / capacities[item], item),
        )
        allocations[index] += 1
    return allocations


def spatial_cell(point, cell_size):
    return tuple(math.floor(point[axis] / cell_size) for axis in range(3))


def nearest_grid_distance_squared(point, grid, cell_size):
    cell = spatial_cell(point, cell_size)
    nearest = math.inf
    for x_offset in (-1, 0, 1):
        for y_offset in (-1, 0, 1):
            for z_offset in (-1, 0, 1):
                neighbour = (cell[0] + x_offset, cell[1] + y_offset, cell[2] + z_offset)
                for other in grid.get(neighbour, ()):
                    nearest = min(nearest, (point - other).length_squared)
    return nearest


def candidate_on_surface(surface, serial, phase):
    progress = (radical_inverse(serial + 1, 2) + phase[0]) % 1.0
    triangle_index = bisect.bisect_left(
        surface["cumulativeArea"], progress * surface["surfaceArea"],
    )
    triangle = surface["triangles"][min(triangle_index, len(surface["triangles"]) - 1)]
    u = (radical_inverse(serial + 1, 3) + phase[1]) % 1.0
    v = (radical_inverse(serial + 1, 5) + phase[2]) % 1.0
    root_u = math.sqrt(u)
    a, b, c = triangle["vertices"]
    return {
        "point": a * (1.0 - root_u) + b * (root_u * (1.0 - v)) + c * (root_u * v),
        "normal": triangle["normal"],
        "paletteRole": triangle["paletteRole"],
        "featureClass": triangle["featureClass"],
        "componentId": triangle["componentId"],
    }


def protected_component_ids(surface, count):
    policy = surface["componentPolicy"]
    rule = COMPONENT_POLICY_RULES.get(policy)
    if rule is None:
        raise RuntimeError(
            f'{surface["objectKey"]} uses unsupported component policy "{policy}".'
        )
    if rule["mode"] == "all":
        return sorted(surface["componentAreas"])
    average_sample_area = surface["surfaceArea"] / max(1, count)
    relative_floor = rule["relativeFloor"]
    minimum_area = max(average_sample_area * 0.3, surface["surfaceArea"] * relative_floor)
    protected = [
        component_id
        for component_id, area in surface["componentAreas"].items()
        if area >= minimum_area
    ]
    if not protected and surface["componentAreas"]:
        protected = [max(surface["componentAreas"], key=surface["componentAreas"].get)]
    return sorted(protected)


def prepare_surface_anchor_plan(surface, reference_count):
    semantic_triangles = {}
    component_triangles = {}
    for triangle in surface["triangles"]:
        existing = semantic_triangles.get(triangle["paletteRole"])
        if existing is None or triangle["area"] > existing["area"]:
            semantic_triangles[triangle["paletteRole"]] = triangle
        existing_component = component_triangles.get(triangle["componentId"])
        if existing_component is None or triangle["area"] > existing_component["area"]:
            component_triangles[triangle["componentId"]] = triangle
    protected_components = protected_component_ids(surface, max(1, reference_count))
    anchor_triangle_ids = {
        triangle["index"] for triangle in semantic_triangles.values()
    }
    anchor_triangle_ids.update(
        component_triangles[component_id]["index"]
        for component_id in protected_components
    )
    surface["protectedComponentIds"] = protected_components
    surface["requiredAnchorCount"] = len(anchor_triangle_ids)


def scene_density_weight(surface):
    return ENVIRONMENT_DENSITY_WEIGHT if surface["role"] == "parametric-forest" else 1.0


def sample_surface_progressively(surface, count, export_seed):
    spacing = math.sqrt(surface["surfaceArea"] / max(1, count))
    cell_size = max(spacing, 1e-6)
    phase = tuple(stable_phase(export_seed, surface["objectKey"], axis) for axis in range(3))
    grid = {}
    samples = []
    serial = 0
    for ordinal in range(count):
        best = None
        best_distance = -1.0
        for _ in range(BEST_CANDIDATES_PER_SURFEL):
            candidate = candidate_on_surface(surface, serial, phase)
            serial += 1
            distance = nearest_grid_distance_squared(candidate["point"], grid, cell_size)
            if distance > best_distance:
                best = candidate
                best_distance = distance
        best["objectOrdinal"] = ordinal
        samples.append(best)
        grid.setdefault(spatial_cell(best["point"], cell_size), []).append(best["point"])
    # Semantic materials and meaningful connected components must survive every
    # profile prefix. Relocate existing surfels; never add a separate detail
    # layer or change the density budget.
    semantic_anchors = {}
    component_anchors = {}
    for triangle in surface["triangles"]:
        existing = semantic_anchors.get(triangle["paletteRole"])
        if existing is None or triangle["area"] > existing["area"]:
            semantic_anchors[triangle["paletteRole"]] = triangle
        existing_component = component_anchors.get(triangle["componentId"])
        if existing_component is None or triangle["area"] > existing_component["area"]:
            component_anchors[triangle["componentId"]] = triangle
    protected_components = surface["protectedComponentIds"]
    anchors_by_triangle = {}
    for palette_role, triangle in semantic_anchors.items():
        anchor = anchors_by_triangle.setdefault(triangle["index"], {
            "triangle": triangle, "paletteRoles": [], "componentIds": [],
        })
        anchor["paletteRoles"].append(palette_role)
    for component_id in protected_components:
        triangle = component_anchors[component_id]
        anchor = anchors_by_triangle.setdefault(triangle["index"], {
            "triangle": triangle, "paletteRoles": [], "componentIds": [],
        })
        anchor["componentIds"].append(component_id)
    anchors = sorted(anchors_by_triangle.values(), key=lambda item: item["triangle"]["index"])
    if len(anchors) > count:
        raise RuntimeError(
            f'{surface["objectKey"]} needs {len(anchors)} protected anchors but has {count} surfels.'
        )
    for sample_index, anchor in enumerate(anchors):
        triangle = anchor["triangle"]
        a, b, c = triangle["vertices"]
        samples[sample_index] = {
            "point": (a + b + c) / 3.0,
            "normal": triangle["normal"],
            "paletteRole": triangle["paletteRole"],
            "featureClass": triangle["featureClass"],
            "componentId": triangle["componentId"],
            "objectOrdinal": sample_index,
            "semanticAnchor": bool(anchor["paletteRoles"]),
            "componentAnchor": bool(anchor["componentIds"]),
        }
    surface["protectedComponentCount"] = len(protected_components)
    return samples, spacing


def interleave_model_samples(model_surfaces):
    """Build one nested, area-weighted stream with a protected anchor prefix."""
    output = []
    segment_starts = [surface["requiredAnchorCount"] for surface in model_surfaces]
    for part_id, surface in enumerate(model_surfaces):
        for ordinal in range(surface["requiredAnchorCount"]):
            output.append((
                ordinal / max(1, surface["requiredAnchorCount"]),
                surface["objectKey"], part_id, surface, surface["samples"][ordinal],
            ))
    output.sort(key=lambda item: (item[0], item[1]))
    remainder = []
    for part_id, surface in enumerate(model_surfaces):
        samples = surface["samples"]
        start = segment_starts[part_id]
        span = max(1, len(samples) - start)
        for ordinal in range(start, len(samples)):
            remainder.append((
                ((ordinal - start) + 0.5) / span,
                surface["objectKey"], part_id, surface, samples[ordinal],
            ))
    remainder.sort(key=lambda item: (item[0], item[1]))
    output.extend(remainder)
    return output


def oct_encode(normal):
    divisor = abs(normal.x) + abs(normal.y) + abs(normal.z)
    if divisor <= 1e-12:
        return 0, 32767
    x, y, z = normal.x / divisor, normal.y / divisor, normal.z / divisor
    if z < 0:
        old_x = x
        x = (1.0 - abs(y)) * (1.0 if old_x >= 0 else -1.0)
        y = (1.0 - abs(old_x)) * (1.0 if y >= 0 else -1.0)
    return (
        max(-32767, min(32767, round(x * 32767))),
        max(-32767, min(32767, round(y * 32767))),
    )


def write_surfel_file(path, records):
    used_stable_ids = set()
    with path.open("wb") as output:
        for record in records:
            normal_x, normal_y = oct_encode(record["normal"])
            radius = max(1, min(65535, round(record["radius"] / RADIUS_STEP_WU)))
            seed = stable_u32(record["stableKey"], "seed") & 0xFFFF
            stable_id = stable_u32(record["stableKey"])
            while stable_id in used_stable_ids:
                stable_id = (stable_id + 1) & 0xFFFFFFFF
            used_stable_ids.add(stable_id)
            output.write(SURFEL_STRUCT.pack(
                record["point"].x, record["point"].y, record["point"].z,
                normal_x, normal_y, radius, seed,
                record["modelId"], record["partId"], stable_id,
                record["paletteRole"], record["motionGroup"],
                record["featureClass"], record["flags"],
            ))


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


def sha256_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def export_camera_track(output_dir, scene, camera):
    frame_start, frame_end = int(scene.frame_start), int(scene.frame_end)
    if frame_end <= frame_start:
        raise RuntimeError("The About camera has an invalid frame range.")
    samples = []
    original_frame, original_subframe = scene.frame_current, scene.frame_subframe
    try:
        for source_frame in range(frame_start, frame_end + 1):
            scene.frame_set(source_frame)
            site_matrix = SITE_BASIS @ camera.matrix_world
            position, rotation = site_matrix.translation, site_matrix.to_quaternion()
            samples.append([
                round(position.x, 6), round(position.y, 6), round(position.z, 6),
                round(rotation.x, 8), round(rotation.y, 8),
                round(rotation.z, 8), round(rotation.w, 8),
            ])
    finally:
        scene.frame_set(original_frame, subframe=original_subframe)
    width = scene.render.resolution_x * scene.render.resolution_percentage / 100.0
    height = scene.render.resolution_y * scene.render.resolution_percentage / 100.0
    aspect = width * scene.render.pixel_aspect_x / max(1.0, height * scene.render.pixel_aspect_y)
    horizontal_fov = math.degrees(camera.data.angle_x)
    projection = {
        "type": "perspective",
        "fovAxis": "horizontal",
        "horizontalFov": round(horizontal_fov, 3),
        "referenceAspect": round(aspect, 6),
        "referenceVerticalFov": round(math.degrees(
            2.0 * math.atan(math.tan(math.radians(horizontal_fov) * 0.5) / aspect)
        ), 3),
        "portraitMaxVerticalFov": PORTRAIT_MAX_VERTICAL_FOV_DEGREES,
        "sensorVerticalFov": round(math.degrees(camera.data.angle_y), 3),
        "sensorFit": camera.data.sensor_fit,
    }
    ride_path = bpy.data.objects.get("ABS_PARAMETRIC_RIDE_PATH")
    orientation = {
        "path": ride_path.name if ride_path else None,
        "pathTwistMode": ride_path.data.twist_mode if ride_path and ride_path.type == "CURVE" else None,
        "neutralHorizon": "Z_UP",
        "rollControl": "ABS_CAMERA_ROLL_DRIVER.abs_roll_degrees",
    }
    roll_control = None
    roll_driver = bpy.data.objects.get("ABS_CAMERA_ROLL_DRIVER")
    if roll_driver and roll_driver.animation_data and roll_driver.animation_data.action:
        action = roll_driver.animation_data.action
        progress_curve = next(
            (curve for curve in action.fcurves if curve.data_path == '["abs_path_progress"]'), None,
        )
        roll_curve = next(
            (curve for curve in action.fcurves if curve.data_path == '["abs_roll_degrees"]'), None,
        )
        if progress_curve and roll_curve:
            roll_control = {
                "object": roll_driver.name,
                "property": "abs_roll_degrees",
                "action": action.name,
                "keyframes": [{
                    "frame": round(point.co.x, 3),
                    "progress": round(progress_curve.evaluate(point.co.x), 6),
                    "degrees": round(point.co.y, 3),
                } for point in roll_curve.keyframe_points],
            }
    track = {
        "schema": "about-camera-track",
        "version": 5,
        "source": camera.name,
        "frameStart": frame_start,
        "frameEnd": frame_end,
        "fps": round(scene.render.fps / scene.render.fps_base, 6),
        "sampleCount": len(samples),
        "projection": projection,
        "orientation": orientation,
        "samples": samples,
        "journeyCues": [{
            "name": marker.name,
            "frame": int(marker.frame),
            "progress": round(
                (int(marker.frame) - frame_start) / max(1, frame_end - frame_start),
                6,
            ),
        } for marker in sorted(scene.timeline_markers, key=lambda item: item.frame)],
    }
    if roll_control:
        track["rollControl"] = roll_control
    path = output_dir / "camera-track.json"
    path.write_text(json.dumps(track, separators=(",", ":")) + "\n", encoding="utf-8")
    return path, track


def build_scene_contract(surfaces, args):
    if not (0 < args.mobile <= args.desktop <= args.master):
        raise RuntimeError("Expected 0 < mobile <= desktop <= master surfel budgets.")
    sampling_weights = [
        surface["surfaceArea"]
        * surface["densityFactor"]
        * surface["featurePriority"]
        * scene_density_weight(surface)
        for surface in surfaces
    ]
    preliminary_allocations = allocate_exact(
        sampling_weights, args.master, [0] * len(surfaces),
    )
    for surface, reference_count in zip(surfaces, preliminary_allocations):
        prepare_surface_anchor_plan(surface, reference_count)
    master_allocations = allocate_exact(
        sampling_weights,
        args.master,
        [surface["requiredAnchorCount"] for surface in surfaces],
    )
    for surface, count in zip(surfaces, master_allocations):
        surface["samples"], surface["spacingTarget"] = sample_surface_progressively(
            surface, count, args.seed,
        )
        surface["surfelCount"] = count
        surface["semanticAnchorCount"] = sum(
            1 for sample in surface["samples"] if sample.get("semanticAnchor")
        )
        surface["componentAnchorCount"] = sum(
            1 for sample in surface["samples"] if sample.get("componentAnchor")
        )
        surface["requiredAnchorCount"] = sum(
            1 for sample in surface["samples"]
            if sample.get("semanticAnchor") or sample.get("componentAnchor")
        )
    models_by_key = {}
    for surface in surfaces:
        models_by_key.setdefault(surface["modelKey"], []).append(surface)
    model_keys = sorted(models_by_key)
    model_master_counts = [
        sum(surface["surfelCount"] for surface in models_by_key[key])
        for key in model_keys
    ]
    mobile_model_minimums = [
        sum(
            surface["requiredAnchorCount"]
            for surface in models_by_key[key]
        )
        for key in model_keys
    ]
    mobile_model_counts = allocate_progressive_prefix(
        model_master_counts, args.mobile, mobile_model_minimums,
    )
    desktop_model_counts = allocate_progressive_prefix(
        model_master_counts,
        args.desktop,
        mobile_model_counts,
    )
    profile_model_counts = {
        "mobile": mobile_model_counts,
        "desktop": desktop_model_counts,
        "master": model_master_counts,
    }
    motion_keys = sorted({surface["motionKey"] for surface in surfaces})
    if len(motion_keys) > 256:
        raise RuntimeError("The packed contract supports at most 256 motion groups.")
    motion_id_by_key = {key: index for index, key in enumerate(motion_keys)}
    records, models = [], []
    profile_object_counts = {name: {} for name in profile_model_counts}
    for model_id, model_key in enumerate(model_keys):
        model_surfaces = sorted(models_by_key[model_key], key=lambda item: item["objectKey"])
        model_records = interleave_model_samples(model_surfaces)
        range_offset = len(records)
        for _progress, _object_key, part_id, surface, sample in model_records:
            records.append({
                **sample,
                "radius": surface["spacingTarget"] * SURFEL_RADIUS_TO_SPACING,
                "modelId": model_id,
                "partId": part_id,
                "stableKey": f'{args.seed}:{surface["objectKey"]}:{sample["objectOrdinal"]}',
                "motionGroup": motion_id_by_key[surface["motionKey"]],
                "flags": (
                    (1 if surface["preserveMinPx"] is not None else 0)
                    | (2 if sample.get("semanticAnchor") else 0)
                    | (4 if sample.get("componentAnchor") else 0)
                ),
            })
        model_profile_counts = {
            name: profile_model_counts[name][model_id] for name in profile_model_counts
        }
        for profile_name, prefix_count in model_profile_counts.items():
            counts = {surface["objectKey"]: 0 for surface in model_surfaces}
            for _progress, object_key, _part_id, _surface, _sample in model_records[:prefix_count]:
                counts[object_key] += 1
            profile_object_counts[profile_name].update(counts)
        models.append({
            "id": model_id,
            "key": model_key,
            "role": model_surfaces[0]["role"],
            "motionGroup": motion_id_by_key[model_surfaces[0]["motionKey"]],
            "motionKey": model_surfaces[0]["motionKey"],
            "revealGroup": model_surfaces[0]["revealKey"],
            "objectKeys": [surface["objectKey"] for surface in model_surfaces],
            "surfelRange": {
                "offset": range_offset,
                "count": len(model_records),
                "byteOffset": range_offset * SURFEL_STRIDE_BYTES,
            },
            "profileCounts": model_profile_counts,
            "visibilityStartWU": next((
                surface["visibilityStartWU"] for surface in model_surfaces
                if surface["visibilityStartWU"] is not None
            ), None),
            "visibilityEndWU": next((
                surface["visibilityEndWU"] for surface in model_surfaces
                if surface["visibilityEndWU"] is not None
            ), None),
        })
    profiles = {}
    for profile_name, model_counts in profile_model_counts.items():
        profiles[profile_name] = {
            "surfelCount": sum(model_counts),
            "perModelCounts": {
                model_key: model_counts[index] for index, model_key in enumerate(model_keys)
            },
            "perObjectCounts": profile_object_counts[profile_name],
            "selection": "nested-per-model-prefix",
        }
    pages = build_camera_pages(models, profiles)
    return records, models, profiles, motion_keys, pages


def build_camera_pages(models, profiles):
    """Build bounded upload pages from authored reveal windows.

    A page references stable contiguous model ranges instead of duplicating
    records. The previous page's last model remains in the following page, so a
    handoff always has byte-identical surfels while fog/reveal culling changes.
    """
    timed_models = [
        model for model in models
        if model["visibilityStartWU"] is not None and model["visibilityEndWU"] is not None
    ]
    untimed_models = [model for model in models if model not in timed_models]
    if not timed_models:
        clusters = [list(models)]
    else:
        ordered = sorted(timed_models, key=lambda model: (
            model["visibilityStartWU"], model["visibilityEndWU"], model["id"],
        ))
        clusters = []
        for model in ordered:
            if (
                not clusters
                or model["visibilityStartWU"]
                    - clusters[-1][-1]["visibilityStartWU"] > 2.5
            ):
                clusters.append([model])
            else:
                clusters[-1].append(model)
        for cluster in clusters:
            cluster.extend(untimed_models)
    pages = []
    previous_anchor = None
    for index, cluster in enumerate(clusters):
        page_models = list(cluster)
        if previous_anchor is not None and previous_anchor not in page_models:
            page_models.append(previous_anchor)
        page_models = sorted(set(model["id"] for model in page_models))
        resolved_models = [models[model_id] for model_id in page_models]
        timed_page_models = [
            model for model in cluster
            if model["visibilityStartWU"] is not None and model["visibilityEndWU"] is not None
        ]
        start_wu = min(
            (model["visibilityStartWU"] for model in timed_page_models),
            default=0.0,
        )
        end_wu = max(
            (model["visibilityEndWU"] for model in timed_page_models),
            default=math.inf,
        )
        ranges = [{
            "modelId": model["id"],
            "offset": model["surfelRange"]["offset"],
            "count": model["surfelRange"]["count"],
            "byteOffset": model["surfelRange"]["byteOffset"],
            "profileCounts": model["profileCounts"],
        } for model in resolved_models]
        page_profile_counts = {
            profile_name: sum(item["profileCounts"][profile_name] for item in ranges)
            for profile_name in profiles
        }
        for profile_name in ("mobile", "desktop"):
            budget = profiles[profile_name]["surfelCount"]
            if page_profile_counts[profile_name] > budget:
                raise RuntimeError(
                    f"Page {index} requires {page_profile_counts[profile_name]} "
                    f"{profile_name} surfels, above the explicit {budget} budget."
                )
        current_ids = set(page_models)
        previous_ids = set(pages[-1]["modelIds"]) if pages else set()
        pages.append({
            "id": f"camera-page-{index + 1:02d}",
            "modelIds": page_models,
            "ranges": ranges,
            "profileCounts": page_profile_counts,
            "activeStartWU": round(start_wu, 6),
            "activeEndWU": round(end_wu, 6) if math.isfinite(end_wu) else None,
            "preloadStartWU": round(max(0.0, start_wu - 0.75), 6),
            "releaseEndWU": round(end_wu + 0.75, 6) if math.isfinite(end_wu) else None,
            "sharedModelIdsWithPrevious": sorted(current_ids & previous_ids),
            "handoff": "byte-identical-model-prefix",
        })
        previous_anchor = max(
            timed_page_models or resolved_models,
            key=lambda model: (
                model["visibilityEndWU"] if model["visibilityEndWU"] is not None else math.inf,
                model["id"],
            ),
        )
    for page in pages[1:]:
        if not page["sharedModelIdsWithPrevious"]:
            raise RuntimeError(f'{page["id"]} has no fog-safe stable handoff samples.')
    for previous, current in zip(pages, pages[1:]):
        if previous["releaseEndWU"] is None:
            continue
        if previous["releaseEndWU"] < current["preloadStartWU"] + 0.25:
            midpoint = (previous["releaseEndWU"] + current["preloadStartWU"]) * 0.5
            previous["releaseEndWU"] = round(midpoint + 0.125, 6)
            current["preloadStartWU"] = round(max(0.0, midpoint - 0.125), 6)
        current["handoffOverlapWU"] = round(
            previous["releaseEndWU"] - current["preloadStartWU"],
            6,
        )
    return pages


def main():
    args = parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    source_blend = Path(bpy.data.filepath).resolve()
    if not source_blend.is_file():
        raise RuntimeError("Save the Blender scene before exporting it.")
    scene = bpy.context.scene
    if scene.camera is None:
        raise RuntimeError("The Blender scene has no active camera.")
    resolve_surfel_budgets(scene, args)
    surfaces, fallbacks = collect_scene_geometry(
        eligible_mesh_objects(scene),
    )
    records, models, profiles, motion_keys, pages = build_scene_contract(surfaces, args)
    surfel_path = output_dir / "surfels.bin"
    camera_path, camera_track = export_camera_track(output_dir, scene, scene.camera)
    write_surfel_file(surfel_path, records)
    for obsolete_name in (
        f"{args.slug}-points-low.bin", f"{args.slug}-points-medium.bin",
        "depth-proxy-positions.bin", "depth-proxy-indices.bin",
    ):
        obsolete_path = output_dir / obsolete_name
        if obsolete_path.exists():
            obsolete_path.unlink()
    source_objects = [{
        "name": surface["name"],
        "objectKey": surface["objectKey"],
        "modelKey": surface["modelKey"],
        "role": surface["role"],
        "motionKey": surface["motionKey"],
        "revealGroup": surface["revealKey"],
        "componentPolicy": surface["componentPolicy"],
        "densityGroup": surface["densityGroup"],
        "densityFactor": round(surface["densityFactor"], 6),
        "featurePriority": round(surface["featurePriority"], 6),
        "sceneDensityWeight": scene_density_weight(surface),
        "preserveMinPx": surface["preserveMinPx"],
        "collections": surface["collections"],
        "triangles": surface["triangleCount"],
        "surfaceArea": round(surface["surfaceArea"], 6),
        "surfelCount": surface["surfelCount"],
        "semanticAnchorCount": surface["semanticAnchorCount"],
        "connectedComponentCount": surface["connectedComponentCount"],
        "protectedComponentCount": surface.get("protectedComponentCount", 0),
        "componentAnchorCount": surface["componentAnchorCount"],
        "requiredAnchorCount": surface["requiredAnchorCount"],
        "spacingTarget": round(surface["spacingTarget"], 6),
        "bounds": {
            "min": [round(value, 6) for value in surface["boundsMin"]],
            "max": [round(value, 6) for value in surface["boundsMax"]],
        },
    } for surface in surfaces]
    source_hash = sha256_file(source_blend)
    meta = {
        "schema": SCHEMA,
        "version": SCHEMA_VERSION,
        "name": args.slug,
        "title": "About V2 authored Blender surfel scene",
        "creator": "Alexander Beck",
        "source": {
            "file": portable_source_path(source_blend),
            "sha256": source_hash,
            "objectCount": len(source_objects),
            "triangleCount": sum(surface["triangleCount"] for surface in surfaces),
            "surfaceArea": round(sum(surface["surfaceArea"] for surface in surfaces), 6),
            "objects": source_objects,
            "semanticFallbacks": fallbacks,
            "samplingPolicy": {
                "type": "progressive-semantic-best-candidate-v3",
                "space": "WORLD",
                "allocation": "role-weighted-world-surface-area-with-anchor-minimum",
                "profileMinimum": "semantic-and-meaningful-component-anchor-union",
                "environmentDensityWeight": ENVIRONMENT_DENSITY_WEIGHT,
                "bestCandidatesPerSurfel": BEST_CANDIDATES_PER_SURFEL,
                "profileSelection": "nested-per-model-prefix",
                "featureConstraint": "relocate-semantic-and-meaningful-component-anchors-never-add",
                "componentPolicies": COMPONENT_POLICY_RULES,
                "densityFactorProperty": "abs_point_density",
                "featurePriorityProperty": "abs_feature_priority",
                "preserveMinimumProperty": "abs_preserve_min_px",
                "fog": "runtime-depth-only",
            },
        },
        "coordinateSystem": {
            "source": "Blender right-handed Z-up",
            "runtime": "website right-handed Y-up",
            "mapping": "Blender (x,y,z) -> website (x,z,-y)",
            "units": "metres / website world units",
        },
        "exportControls": {
            "owner": "Blender scene custom properties with optional command-line overrides",
            "properties": {
                "mobile": "abs_surfel_mobile_budget",
                "desktop": "abs_surfel_desktop_budget",
                "master": "abs_surfel_master_budget",
            },
            "resolvedBudgets": {
                "mobile": args.mobile,
                "desktop": args.desktop,
                "master": args.master,
            },
        },
        "files": {
            "surfels": {
                "file": surfel_path.name, "count": len(records),
                "bytes": surfel_path.stat().st_size, "sha256": sha256_file(surfel_path),
            },
            "cameraTrack": {
                "file": camera_path.name, "bytes": camera_path.stat().st_size,
                "sha256": sha256_file(camera_path),
            },
        },
        "layout": {
            "format": "little-endian-packed", "strideBytes": SURFEL_STRIDE_BYTES,
            "attributes": [
                {"name": "position", "type": "float32x3", "offset": 0},
                {"name": "normalOct", "type": "snorm16x2", "offset": 12},
                {"name": "radius", "type": "unorm16", "offset": 16},
                {"name": "seed", "type": "unorm16", "offset": 18},
                {"name": "modelId", "type": "uint16", "offset": 20},
                {"name": "partId", "type": "uint16", "offset": 22},
                {"name": "stableId", "type": "uint32", "offset": 24},
                {"name": "paletteRole", "type": "uint8", "offset": 28},
                {"name": "motionGroup", "type": "uint8", "offset": 29},
                {"name": "featureClass", "type": "uint8", "offset": 30},
                {"name": "flags", "type": "uint8", "offset": 31},
            ],
        },
        "quantization": {
            "radiusWU": {"min": 0, "max": 6.5535, "step": RADIUS_STEP_WU},
        },
        "bounds": point_bounds([record["point"] for record in records]),
        "palette": {
            "owner": "Blender semantic material roles",
            "roles": list(PALETTE_ROLES),
            "runtimeResolution": "design-system Home palette",
        },
        "motionGroups": [
            {"id": index, "key": key} for index, key in enumerate(motion_keys)
        ],
        "models": models,
        "pages": pages,
        "profiles": profiles,
        "cameraTrack": {
            "file": camera_path.name, "source": camera_track["source"],
            "sampleCount": camera_track["sampleCount"],
            "frameStart": camera_track["frameStart"], "frameEnd": camera_track["frameEnd"],
            "projection": camera_track["projection"],
            "orientation": camera_track["orientation"],
            "rollControl": camera_track.get("rollControl"),
        },
    }
    (output_dir / "meta.json").write_text(
        json.dumps(meta, indent=2) + "\n", encoding="utf-8",
    )
    print(json.dumps({
        "schema": SCHEMA, "version": SCHEMA_VERSION, "output": str(output_dir),
        "sourceSha256": source_hash, "objects": len(source_objects),
        "models": len(models),
        "triangles": sum(surface["triangleCount"] for surface in surfaces),
        "profiles": {name: profile["surfelCount"] for name, profile in profiles.items()},
        "semanticFallbacks": len(fallbacks),
    }, indent=2))


main()
