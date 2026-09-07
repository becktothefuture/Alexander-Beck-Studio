#!/usr/bin/env python3
"""Simplify the About opening and leave clear space around the landscape.

The opening becomes one coherent volumetric point field instead of the joined
legacy stars, signal points, depth sheets, and atmosphere patches.
The landscape keeps its width and height but occupies less distance along the
camera path. The square-gate passage begins later. No objects or public custom
properties are added. This script updates the open scene only and never saves.
"""

import json
import math

import bpy
from mathutils import Vector


INTERNAL_KEY = "Internal Export Data"
DENSITY_ATTRIBUTE = "abs_sampling_density"
FIELD_NAME = "Opening Field"
CONTROLS_NAME = "About Controls"
ROUND_NAME = "Round Tunnel"
LANDSCAPE_NAME = "Landscape"
GATES_NAME = "Square Gates"

FIELD_START_Y = 165.0
FIELD_END_Y = 500.0
FIELD_PARTICLE_COUNT = 1200
FIELD_RADIUS_X = 160.0
FIELD_RADIUS_Z = 110.0
FIELD_INNER_RADIUS = 0.22
FIELD_TRIANGLE_RADIUS = 0.45
FIELD_GOLDEN_FRACTION = 0.6180339887498949
FIELD_SQRT_TWO_FRACTION = 0.4142135623730950

LANDSCAPE_LENGTH_SCALE = 0.35
SQUARE_GATE_START_PERCENT = 60.0
MINIMUM_CLEAR_GAP_WU = 100.0


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


def require_object(name, object_type=None):
    obj = bpy.context.scene.objects.get(name)
    if obj is None:
        raise RuntimeError(f"Missing About scene object: {name}.")
    if object_type is not None and obj.type != object_type:
        raise RuntimeError(f"{name} must be a {object_type} object.")
    return obj


def material_contract(field):
    materials = tuple(field.data.materials)
    expected = (
        "Palette - Atmosphere",
        "Palette - Stone",
        "Palette - Steel",
        "Palette - Glass",
        "Palette - Signal",
        "Palette - Organic",
    )
    if tuple(material.name if material else None for material in materials) != expected:
        raise RuntimeError("Opening Field must retain the six semantic palette materials.")


def fractional(value):
    return value - math.floor(value)


def build_volumetric_field(field):
    mesh = field.data
    material_contract(field)
    inverse = field.matrix_world.inverted_safe()
    vertices = []
    faces = []
    material_indices = []
    for particle in range(FIELD_PARTICLE_COUNT):
        progress = (particle + 0.5) / FIELD_PARTICLE_COUNT
        angle_fraction = fractional((particle + 0.5) * FIELD_GOLDEN_FRACTION)
        radial_fraction = fractional((particle + 0.5) * FIELD_SQRT_TWO_FRACTION)
        angle = math.tau * angle_fraction
        radial = math.sqrt(
            FIELD_INNER_RADIUS * FIELD_INNER_RADIUS
            + (1.0 - FIELD_INNER_RADIUS * FIELD_INNER_RADIUS) * radial_fraction
        )
        world_y = FIELD_START_Y + (FIELD_END_Y - FIELD_START_Y) * progress
        centre_x = math.cos(angle) * FIELD_RADIUS_X * radial
        centre_z = math.sin(angle) * FIELD_RADIUS_Z * radial
        size = FIELD_TRIANGLE_RADIUS * (0.75 + 0.5 * fractional(particle * 0.754877666))
        base = len(vertices)
        for offset_x, offset_z in ((-size, -size * 0.58), (size, -size * 0.58), (0.0, size * 1.16)):
            vertices.append(tuple(inverse @ Vector((
                centre_x + offset_x,
                world_y,
                centre_z + offset_z,
            ))))
        faces.append((base, base + 1, base + 2))
        depth_band = min(5, int(progress * 6.0))
        angular_sector = min(5, int(angle_fraction * 6.0))
        material_indices.append((depth_band + angular_sector) % 6)

    attribute = mesh.attributes.get(DENSITY_ATTRIBUTE)
    if attribute is not None:
        mesh.attributes.remove(attribute)
    mesh.clear_geometry()
    mesh.from_pydata(vertices, [], faces)
    mesh.update(calc_edges=True)
    for polygon, material_index in zip(mesh.polygons, material_indices):
        polygon.material_index = material_index
    attribute = mesh.attributes.new(
        name=DENSITY_ATTRIBUTE,
        type="FLOAT",
        domain="POINT",
    )
    attribute.data.foreach_set("value", [1.0] * len(vertices))

    metadata = plain_value(field.get(INTERNAL_KEY, {}))
    metadata.pop("abs_source_layers", None)
    metadata.update({
        "abs_geometry_kind": "opening-field",
        "abs_component_policy": "semantic-material-projected-coverage",
        "abs_sampling_pattern": "surface-blue-noise",
        "abs_sampling_density_attribute": DENSITY_ATTRIBUTE,
        "abs_surfel_radius_scale": 2.5,
        "abs_opening_field_contract": "single-volumetric-field/v1",
        "abs_opening_component_count": FIELD_PARTICLE_COUNT,
    })
    field[INTERNAL_KEY] = metadata
    field.update_tag(refresh={"OBJECT", "DATA"})


def refresh_scene(scene, objects):
    for obj in objects:
        obj.update_tag(refresh={"OBJECT"})
    current = scene.frame_current
    adjacent = current + 1 if current < scene.frame_end else current - 1
    scene.frame_set(adjacent)
    scene.frame_set(current)
    bpy.context.view_layer.update()


def evaluated_bounds(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    try:
        if not mesh.vertices:
            raise RuntimeError(f"{obj.name} evaluated to an empty mesh.")
        points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        return {
            "min": [min(point[axis] for point in points) for axis in range(3)],
            "max": [max(point[axis] for point in points) for axis in range(3)],
            "vertices": len(mesh.vertices),
            "polygons": len(mesh.polygons),
        }
    finally:
        evaluated.to_mesh_clear()


def connected_component_count(mesh):
    adjacency = [set() for _vertex in mesh.vertices]
    for edge in mesh.edges:
        first, second = edge.vertices
        adjacency[first].add(second)
        adjacency[second].add(first)
    seen = set()
    count = 0
    for start in range(len(mesh.vertices)):
        if start in seen:
            continue
        count += 1
        stack = [start]
        seen.add(start)
        while stack:
            current = stack.pop()
            for neighbor in adjacency[current]:
                if neighbor not in seen:
                    seen.add(neighbor)
                    stack.append(neighbor)
    return count


def update_guide():
    guide = bpy.data.texts.get("README - About Scene")
    if guide is None:
        return
    marker = "OPENING + PASSAGE SPACING\n"
    body = guide.as_string()
    if marker in body:
        body = body.split(marker, 1)[0].rstrip() + "\n\n"
    body += marker + (
        "Opening Field is one coherent volumetric field object with no retained\n"
        "star, signal, depth-sheet, or atmosphere-patch layers. The landscape keeps\n"
        "its width but uses 0.35 path-depth scale. Square Gates starts at 60%.\n"
        "The saved layout keeps at least 100 WU clear on both sides of Landscape.\n"
    )
    guide.clear()
    guide.write(body)


def main():
    scene = bpy.context.scene
    field = require_object(FIELD_NAME, "MESH")
    controls = require_object(CONTROLS_NAME, "EMPTY")
    round_tunnel = require_object(ROUND_NAME, "MESH")
    landscape = require_object(LANDSCAPE_NAME, "MESH")
    gates = require_object(GATES_NAME, "MESH")
    if "26 Start (%)" not in controls:
        raise RuntimeError("About Controls has no Square Gates start control.")

    object_count_before = len(scene.objects)
    before = {
        "opening": evaluated_bounds(field),
        "round": evaluated_bounds(round_tunnel),
        "landscape": evaluated_bounds(landscape),
        "gates": evaluated_bounds(gates),
    }

    build_volumetric_field(field)
    landscape.scale.y = LANDSCAPE_LENGTH_SCALE
    controls["26 Start (%)"] = SQUARE_GATE_START_PERCENT
    refresh_scene(scene, (field, controls, landscape, gates, round_tunnel))

    after = {
        "opening": evaluated_bounds(field),
        "round": evaluated_bounds(round_tunnel),
        "landscape": evaluated_bounds(landscape),
        "gates": evaluated_bounds(gates),
    }
    gaps = {
        "roundToLandscape": after["landscape"]["min"][1] - after["round"]["max"][1],
        "landscapeToGates": after["gates"]["min"][1] - after["landscape"]["max"][1],
    }
    if min(gaps.values()) < MINIMUM_CLEAR_GAP_WU:
        raise RuntimeError(
            "Passage spacing is below the required clear gap: "
            + json.dumps(gaps, sort_keys=True)
        )
    components = connected_component_count(field.data)
    if components != FIELD_PARTICLE_COUNT:
        raise RuntimeError(
            f"Opening Field has {components} particles instead of {FIELD_PARTICLE_COUNT}."
        )
    if len(scene.objects) != object_count_before:
        raise RuntimeError("Opening simplification changed the Blender object count.")

    scene_metadata = plain_value(scene.get(INTERNAL_KEY, {}))
    scene_metadata.update({
        "abs_opening_topology": "single-volumetric-field-v3",
        "abs_opening_simplification_script": (
            "scripts/about-v2-blender/simplify-opening-and-separate-passages.py"
        ),
        "abs_ecosystem_spacing_contract": "clear-aabb-gaps-v1",
        "abs_round_landscape_gap_wu": round(gaps["roundToLandscape"], 6),
        "abs_landscape_gates_gap_wu": round(gaps["landscapeToGates"], 6),
    })
    scene[INTERNAL_KEY] = scene_metadata
    update_guide()
    refresh_scene(scene, (field, controls, landscape, gates, round_tunnel))

    print(json.dumps({
        "status": "ok",
        "saved": False,
        "objectCount": len(scene.objects),
        "openingComponents": components,
        "openingVerticesRemoved": before["opening"]["vertices"] - after["opening"]["vertices"],
        "landscapeLengthScale": landscape.scale.y,
        "squareGateStartPercent": controls["26 Start (%)"],
        "clearGapsWU": {key: round(value, 6) for key, value in gaps.items()},
        "before": before,
        "after": after,
    }, indent=2))


if __name__ == "__main__":
    main()
