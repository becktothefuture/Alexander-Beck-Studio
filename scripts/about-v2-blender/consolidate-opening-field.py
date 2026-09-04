#!/usr/bin/env python3
"""Collapse the complete About opening into one readable Blender object.

The opening used to expose stars, a signal field, two depth tiers, and small
atmosphere patches as separate objects. They are one visual ecosystem. This
idempotent migration preserves every mesh component and semantic face material,
adds one point-density attribute, and removes the obsolete layer objects.

Run after ``simplify-scene-names.py``. This script does not save the blend file.
"""

import json
import zlib

import bpy
from mathutils import Matrix


COLLECTION_NAME = "02 OPENING"
FIELD_NAME = "Opening Field"
FIELD_OBJECT_ID = "director.opening-field"
DENSITY_ATTRIBUTE = "abs_sampling_density"
INTERNAL_KEY = "Internal Export Data"

SOURCE_NAMES = (
    "Stars",
    "Signal Field",
    "Depth Field - Shared",
    "Depth Field - Desktop",
    "Atmosphere Patches",
)

LEGACY_GROUPS = (
    {
        "name": "Depth Field - Shared",
        "sources": tuple(f"Depth - Shared {index:02d}" for index in range(1, 6)),
        "object_id": "director.opening-depth-shared",
        "density_weights": (0.4, 1.0, 1.0, 0.8, 0.14),
        "minimum_profile": "mobile",
    },
    {
        "name": "Depth Field - Desktop",
        "sources": tuple(f"Depth - Desktop {index:02d}" for index in range(1, 6)),
        "object_id": "director.opening-depth-desktop",
        "density_weights": (0.4, 1.0, 1.0, 0.8, 0.14),
        "minimum_profile": "desktop",
    },
    {
        "name": "Atmosphere Patches",
        "sources": tuple(f"Atmosphere Patch {index:02d}" for index in range(1, 5)),
        "object_id": "director.opening-atmosphere-patches",
        "density_weights": None,
        "minimum_profile": "mobile",
    },
)

# These values retain the useful relative emphasis of the old layer objects.
# They are normalized into one mesh attribute; they are not user controls.
SOURCE_DENSITY = {
    "Stars": 0.14,
    "Signal Field": 0.20,
    "Depth Field - Shared": 10.0,
    "Depth Field - Desktop": 10.0,
    "Atmosphere Patches": 40.0,
}
FIELD_DENSITY = max(SOURCE_DENSITY.values())
FIELD_POINT_SCALE = 0.28


def plain_value(value):
    if hasattr(value, "to_dict"):
        return {key: plain_value(item) for key, item in value.to_dict().items()}
    if hasattr(value, "to_list"):
        return [plain_value(item) for item in value.to_list()]
    if isinstance(value, dict):
        return {key: plain_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [plain_value(item) for item in value]
    return value


def metadata(obj):
    data = plain_value(obj.get(INTERNAL_KEY, {}))
    for key in obj.keys():
        if str(key).startswith("abs_") or str(key).startswith("_abs_"):
            data[key] = plain_value(obj[key])
    return data


def material_contract(sources):
    materials = tuple(sources[0].data.materials)
    if len(materials) != 6 or any(material is None for material in materials):
        raise RuntimeError("Opening sources must use the six semantic palette materials.")
    if any(tuple(source.data.materials) != materials for source in sources[1:]):
        raise RuntimeError("Opening sources do not share one semantic material-slot order.")
    return materials


def source_density_values(source):
    attribute_name = metadata(source).get("abs_sampling_density_attribute")
    attribute = source.data.attributes.get(attribute_name) if attribute_name else None
    if attribute is not None and (
        attribute.domain != "POINT" or attribute.data_type != "FLOAT"
    ):
        raise RuntimeError(f"{source.name} has an invalid density attribute.")
    scale = SOURCE_DENSITY[source.name] / FIELD_DENSITY
    if attribute is None:
        return [scale] * len(source.data.vertices)
    return [max(0.0, min(1.0, item.value * scale)) for item in attribute.data]


def remove_source_objects(target, sources):
    bpy.ops.object.select_all(action="DESELECT")
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    meshes = [source.data for source in sources]
    for source in sources:
        bpy.data.objects.remove(source, do_unlink=True)
    for mesh in meshes:
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def build_compatibility_layer(collection, parent, spec):
    sources = [bpy.context.scene.objects.get(name) for name in spec["sources"]]
    if any(source is None for source in sources):
        missing = [name for name, source in zip(spec["sources"], sources) if source is None]
        raise RuntimeError(f"Missing legacy opening layers for {spec['name']}: {missing}")
    mesh = bpy.data.meshes.new(f"{spec['name']} Mesh")
    target = bpy.data.objects.new(spec["name"], mesh)
    collection.objects.link(target)
    target.parent = parent
    target.matrix_parent_inverse = Matrix.Identity(4)
    bpy.context.view_layer.update()
    for material in material_contract(sources):
        mesh.materials.append(material)

    vertices = []
    faces = []
    material_indices = []
    density_values = []
    target_inverse = target.matrix_world.inverted_safe()
    for index, source in enumerate(sources):
        relative = target_inverse @ source.matrix_world
        vertex_offset = len(vertices)
        vertices.extend(tuple(relative @ vertex.co) for vertex in source.data.vertices)
        faces.extend(
            tuple(vertex_offset + vertex_index for vertex_index in polygon.vertices)
            for polygon in source.data.polygons
        )
        material_indices.extend(polygon.material_index for polygon in source.data.polygons)
        if spec["density_weights"] is not None:
            density_values.extend([spec["density_weights"][index]] * len(source.data.vertices))
    mesh.from_pydata(vertices, [], faces)
    mesh.update(calc_edges=True)
    for polygon, material_index in zip(mesh.polygons, material_indices):
        polygon.material_index = material_index
    if density_values:
        attribute = mesh.attributes.new(name=DENSITY_ATTRIBUTE, type="FLOAT", domain="POINT")
        attribute.data.foreach_set("value", density_values)

    data = metadata(sources[0])
    data.update({
        "abs_object_id": spec["object_id"],
        "abs_min_profile": spec["minimum_profile"],
        "abs_sampling_density_attribute": DENSITY_ATTRIBUTE if density_values else "",
    })
    target[INTERNAL_KEY] = data
    target["abs_palette_mode"] = "mixed"
    target["abs_palette_seed"] = zlib.crc32(spec["object_id"].encode("utf-8")) & 0x7FFFFFFF
    remove_source_objects(target, sources)
    return target


def build_field(collection, parent, sources):
    mesh = bpy.data.meshes.new(f"{FIELD_NAME} Mesh")
    field = bpy.data.objects.new(FIELD_NAME, mesh)
    collection.objects.link(field)
    field.parent = parent
    field.matrix_parent_inverse = Matrix.Identity(4)
    bpy.context.view_layer.update()

    for material in material_contract(sources):
        mesh.materials.append(material)

    vertices = []
    faces = []
    material_indices = []
    density_values = []
    source_components = []
    target_inverse = field.matrix_world.inverted_safe()
    for source in sources:
        relative = target_inverse @ source.matrix_world
        vertex_offset = len(vertices)
        vertices.extend(tuple(relative @ vertex.co) for vertex in source.data.vertices)
        faces.extend(
            tuple(vertex_offset + vertex_index for vertex_index in polygon.vertices)
            for polygon in source.data.polygons
        )
        material_indices.extend(polygon.material_index for polygon in source.data.polygons)
        density_values.extend(source_density_values(source))
        source_components.append({
            "name": source.name,
            "objectId": metadata(source).get("abs_object_id"),
        })

    mesh.from_pydata(vertices, [], faces)
    mesh.update(calc_edges=True)
    for polygon, material_index in zip(mesh.polygons, material_indices):
        polygon.material_index = material_index
    attribute = mesh.attributes.new(
        name=DENSITY_ATTRIBUTE,
        type="FLOAT",
        domain="POINT",
    )
    attribute.data.foreach_set("value", density_values)

    data = metadata(sources[0])
    data.update({
        "abs_object_id": FIELD_OBJECT_ID,
        "abs_model_id": "about.00",
        "abs_geometry_kind": "opening-field",
        "abs_min_profile": "mobile",
        "abs_component_policy": "semantic-material-projected-coverage",
        "abs_sampling_pattern": "row-column-grid",
        "abs_sampling_density_attribute": DENSITY_ATTRIBUTE,
        "abs_point_density": FIELD_DENSITY,
        "abs_surfel_radius_scale": FIELD_POINT_SCALE,
        "abs_source_layers": json.dumps(source_components, sort_keys=True),
    })
    field[INTERNAL_KEY] = data
    field["abs_palette_mode"] = "mixed"
    field["abs_palette_seed"] = zlib.crc32(FIELD_OBJECT_ID.encode("utf-8")) & 0x7FFFFFFF
    if "abs_palette_role" in field:
        del field["abs_palette_role"]

    # Blender may keep one old layer as the active Outliner object. Move the
    # active selection before deleting it so UI and automation contexts never
    # retain a removed StructRNA reference.
    remove_source_objects(field, sources)
    return field


def main():
    scene = bpy.context.scene
    collection = bpy.data.collections.get(COLLECTION_NAME)
    if collection is None:
        raise RuntimeError(f"Missing {COLLECTION_NAME} collection.")
    parent = scene.objects.get("Opening Position")
    if parent is None or parent.type != "EMPTY":
        raise RuntimeError("Missing Opening Position helper.")

    existing = scene.objects.get(FIELD_NAME)
    if existing is None:
        for spec in LEGACY_GROUPS:
            if scene.objects.get(spec["name"]) is None:
                build_compatibility_layer(collection, parent, spec)
    sources = [scene.objects.get(name) for name in SOURCE_NAMES]
    present_sources = [source for source in sources if source is not None]
    if existing is not None:
        if present_sources:
            raise RuntimeError("Opening Field exists alongside obsolete opening layers.")
        field = existing
        changed = False
    else:
        missing = [name for name, source in zip(SOURCE_NAMES, sources) if source is None]
        if missing:
            raise RuntimeError(f"Missing opening layers: {missing}")
        if any(source.type != "MESH" or source.parent != parent for source in sources):
            raise RuntimeError("Every opening layer must be a mesh parented to Opening Position.")
        field = build_field(collection, parent, sources)
        changed = True

    scene_data = plain_value(scene.get(INTERNAL_KEY, {}))
    scene_data["abs_opening_topology"] = "single-opening-field-v1"
    scene_data["abs_opening_consolidation_script"] = (
        "scripts/about-v2-blender/consolidate-opening-field.py"
    )
    scene[INTERNAL_KEY] = scene_data
    bpy.context.view_layer.update()
    print(json.dumps({
        "status": "ok",
        "changed": changed,
        "openingObjects": sorted(obj.name for obj in collection.objects),
        "field": {
            "name": field.name,
            "vertices": len(field.data.vertices),
            "polygons": len(field.data.polygons),
            "materials": [material.name for material in field.data.materials],
            "densityAttribute": DENSITY_ATTRIBUTE,
        },
        "sceneObjectCount": len(scene.objects),
        "saved": False,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
