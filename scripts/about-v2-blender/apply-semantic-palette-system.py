#!/usr/bin/env python3
"""Apply the durable semantic palette contract to the About Blender scene.

Blender owns stable role assignment. Website code owns the current colours.
This script deliberately contains no production RGB values and does not save.
"""

import json
import re
import zlib

import bpy


CONTROLS_SYSTEM_ID = "about.controls"
CORE_MATERIALS = (
    ("atmosphere", "Palette - Atmosphere"),
    ("stone", "Palette - Stone"),
    ("steel", "Palette - Steel"),
    ("glass", "Palette - Glass"),
    ("signal", "Palette - Signal"),
    ("organic", "Palette - Organic"),
)
ROLE_TO_SLOT = {role: slot for slot, (role, _name) in enumerate(CORE_MATERIALS)}
SEMANTIC_NAME = re.compile(r"^ABS_([0-5])_")
PARAMETRIC_KINDS = {
    "parametric-round-tunnel",
    "parametric-square-gate-tunnel",
}
PRESERVE_WEIGHTED_KINDS = {
    "opening-signal-field",
    "opening-star-field",
}
OBSOLETE_MATERIAL_PREFIXES = (
    "ABS_B27_",
    "ABS_FORM_FACE_",
)


def stable_seed(obj):
    key = str(obj.get("abs_object_id") or obj.name).encode("utf-8")
    return zlib.crc32(key) & 0x7FFFFFFF


def semantic_slot(material):
    if material is None:
        return None
    raw_slot = material.get("abs_palette_slot")
    if isinstance(raw_slot, str):
        role = raw_slot.strip().lower()
        if role in ROLE_TO_SLOT:
            return ROLE_TO_SLOT[role]
    try:
        slot = int(raw_slot)
    except (TypeError, ValueError):
        slot = -1
    if 0 <= slot < len(CORE_MATERIALS):
        return slot
    role = str(material.get("abs_material_role") or "").strip().lower()
    if role in ROLE_TO_SLOT:
        return ROLE_TO_SLOT[role]
    match = SEMANTIC_NAME.match(material.name)
    return int(match.group(1)) if match else None


def target_objects(scene):
    targets = []
    for obj in scene.objects:
        if obj.type != "MESH":
            continue
        model_id = str(obj.get("abs_model_id") or "")
        if obj.get("abs_export", True) is False:
            continue
        if model_id.startswith("about.") or obj.get("abs_forms_body_index") is not None:
            targets.append(obj)
    return sorted(targets, key=lambda item: (str(item.get("abs_model_id") or ""), item.name))


def require_core_materials():
    materials = []
    for slot, (role, name) in enumerate(CORE_MATERIALS):
        material = bpy.data.materials.get(name)
        if material is None:
            raise RuntimeError(f"Missing semantic material {name}.")
        material["abs_palette_slot"] = slot
        material["abs_material_role"] = role
        materials.append(material)
    return materials


def capture_polygon_roles(obj):
    roles = []
    for polygon in obj.data.polygons:
        material = (
            obj.data.materials[polygon.material_index]
            if polygon.material_index < len(obj.data.materials)
            else None
        )
        roles.append(semantic_slot(material))
    return roles


def replace_material_slots(obj, core_materials):
    obj.data.materials.clear()
    for material in core_materials:
        obj.data.materials.append(material)


def role_permutation(seed):
    # A fixed coprime stride produces all six roles without random noise.
    offset = seed % len(CORE_MATERIALS)
    return tuple((offset + index * 5) % len(CORE_MATERIALS) for index in range(6))


def polygon_centres(obj):
    centres = []
    for polygon in obj.data.polygons:
        if polygon.vertices:
            count = len(polygon.vertices)
            centres.append(tuple(
                sum(obj.data.vertices[index].co[axis] for index in polygon.vertices) / count
                for axis in range(3)
            ))
        else:
            centres.append((0.0, 0.0, 0.0))
    return centres


def spatial_cell_roles(obj, seed, family_index):
    count = len(obj.data.polygons)
    if not count:
        return []
    permutation = role_permutation(seed)
    if count < 6:
        return [permutation[(family_index + index) % 6] for index in range(count)]

    centres = polygon_centres(obj)
    ranges = []
    for axis in range(3):
        values = [centre[axis] for centre in centres]
        ranges.append((max(values) - min(values), axis, min(values), max(values)))
    widest = sorted(ranges, reverse=True)[:2]
    primary = widest[0]
    secondary = widest[1]

    def normalized(centre, axis_range):
        _span, axis, minimum, maximum = axis_range
        return 0.0 if maximum <= minimum else (centre[axis] - minimum) / (maximum - minimum)

    roles = []
    for centre in centres:
        column = min(2, int(normalized(centre, primary) * 3.0))
        row = min(1, int(normalized(centre, secondary) * 2.0))
        roles.append(permutation[row * 3 + column])

    if set(roles) != set(range(6)):
        # Irregular surfaces use six broad ordered bands on their widest axis.
        order = sorted(range(count), key=lambda index: (centres[index][primary[1]], index))
        roles = [0] * count
        for rank, polygon_index in enumerate(order):
            band = min(5, rank * 6 // count)
            roles[polygon_index] = permutation[band]
    return roles


def assign_object(obj, core_materials, family_index):
    original_roles = capture_polygon_roles(obj)
    replace_material_slots(obj, core_materials)
    seed = stable_seed(obj)
    geometry_kind = str(obj.get("abs_geometry_kind") or "")
    authored_faces = obj.get("abs_forms_body_index") is not None or geometry_kind.startswith(
        "solid-parametric-"
    )
    mode = "authored-faces" if authored_faces else "mixed"
    obj["abs_palette_mode"] = mode
    obj["abs_palette_seed"] = seed
    if "abs_palette_role" in obj:
        del obj["abs_palette_role"]
    obj.id_properties_ui("abs_palette_mode").update(
        description="mixed, single, or authored-faces semantic palette assignment.",
    )
    obj.id_properties_ui("abs_palette_seed").update(
        min=0,
        max=0x7FFFFFFF,
        soft_min=0,
        soft_max=0x7FFFFFFF,
        description="Stable seed for deterministic semantic role assignment.",
    )

    if geometry_kind in PARAMETRIC_KINDS or not obj.data.polygons:
        return mode, []
    if authored_faces or geometry_kind in PRESERVE_WEIGHTED_KINDS:
        roles = [
            role if role is not None else role_permutation(seed)[index % 6]
            for index, role in enumerate(original_roles)
        ]
    else:
        roles = spatial_cell_roles(obj, seed, family_index)
    for polygon, role in zip(obj.data.polygons, roles):
        polygon.material_index = role
    return mode, roles


def update_guide():
    guide = bpy.data.texts.get("README - About Scene")
    if guide is None:
        guide = bpy.data.texts.new("README - About Scene")
    marker = "SEMANTIC PALETTE ASSIGNMENT\n"
    body = guide.as_string()
    if marker in body:
        body = body.split(marker, 1)[0].rstrip() + "\n\n"
    body += marker + (
        "Blender assigns only the six semantic material slots. Website code resolves\n"
        "those slots through the active Home palette without rebuilding points.\n"
        "Use abs_palette_mode=mixed by default. Use single with abs_palette_role only\n"
        "for a deliberate one-role override. Use authored-faces to retain face work.\n"
        "abs_palette_seed keeps mixed assignments stable. Do not add per-circle controls.\n"
    )
    guide.clear()
    guide.write(body)


def main():
    scene = bpy.context.scene
    controls = next((
        obj for obj in scene.objects
        if str(obj.get("abs_system_id") or "") == CONTROLS_SYSTEM_ID
    ), None)
    if controls is None:
        raise RuntimeError(f"Missing {CONTROLS_SYSTEM_ID}.")
    core_materials = require_core_materials()
    targets = target_objects(scene)
    if not targets:
        raise RuntimeError("No About export objects found.")

    model_counts = {}
    role_coverage = {}
    mode_counts = {"mixed": 0, "single": 0, "authored-faces": 0}
    for obj in targets:
        model_id = str(obj.get("abs_model_id") or "about.unknown")
        family_index = model_counts.get(model_id, 0)
        model_counts[model_id] = family_index + 1
        mode, roles = assign_object(obj, core_materials, family_index)
        mode_counts[mode] += 1
        role_coverage.setdefault(model_id, set()).update(roles)

    scene["abs_palette_contract"] = "semantic-slots-v1"
    scene["abs_palette_roles"] = json.dumps([role for role, _name in CORE_MATERIALS])
    scene["abs_palette_assignment_owner"] = "Blender object properties and semantic materials"
    scene["abs_palette_colour_owner"] = "Home simulation palette runtime"
    scene["abs_palette_preview_source"] = (
        "react-app/app/src/palette/simulationPaletteController.js"
    )
    controls["abs_palette_note"] = (
        "Use abs_palette_mode, abs_palette_role for explicit single overrides, and "
        "abs_palette_seed. Materials store semantic roles; website code owns colours."
    )
    update_guide()

    removed = []
    retained = []
    core_names = {name for _role, name in CORE_MATERIALS}
    obsolete_names = [
        material.name for material in bpy.data.materials
        if material.name not in core_names
        and material.name.startswith(OBSOLETE_MATERIAL_PREFIXES)
    ]
    for material_name in obsolete_names:
        material = bpy.data.materials.get(material_name)
        if material is None:
            continue
        if material.users == 0:
            removed.append(material_name)
            bpy.data.materials.remove(material)
        else:
            retained.append({"name": material_name, "users": material.users})

    bpy.context.view_layer.update()
    print(json.dumps({
        "contract": scene["abs_palette_contract"],
        "targets": len(targets),
        "objectsPerModel": model_counts,
        "modeCounts": mode_counts,
        "roleCoverage": {key: sorted(value) for key, value in role_coverage.items()},
        "removedObsoleteMaterials": removed,
        "retainedObsoleteMaterials": retained,
        "objectCount": len(scene.objects),
        "saved": False,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
