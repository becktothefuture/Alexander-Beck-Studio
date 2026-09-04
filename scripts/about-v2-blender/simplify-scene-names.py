#!/usr/bin/env python3
"""Give the canonical About scene a small, readable Blender hierarchy.

Visible Blender names are for people. Stable abs_system_id and abs_object_id
properties are for code. This script does not save the file.
"""

import json

import bpy


COLLECTION_RENAMES = {
    "ABS_AUTHORING_STAGES": "ABOUT SCENE",
    "ABS_GUIDES": "00 CONTROLS",
    "ABS_CAMERA_RIG": "01 CAMERA",
    "ABS_STAGE_00_OPENING": "02 OPENING",
    "ABS_STAGE_01_SHAPES": "03 SOLID BODIES",
    "ABS_STAGE_00_ATMOSPHERE": "04 ROUND TUNNEL",
    "ABS_DIRECTOR_CUT_LATER_SCENES": "05 LANDSCAPE",
    "ABS_STAGE_00_OPENING_FIELD": "06 SQUARE GATES",
    "ABS_PARAMETRIC_PASSAGES": "07 HORIZON",
    "ABS_STAGE_01_RECOGNISABLE_BODIES": "08 FINALE",
}

OBJECT_RENAMES = {
    "ABS_PARAMETRIC_RIDE_PATH": "Camera Path",
    "ABS_DC_OPENING_RIG": "Opening Position",
    "ABS_CAMERA": "Scene Camera",
    "ABS_DIRECTOR_CUT_CONTROLS": "About Controls",
    "ABS_STAR_FIELD": "Stars",
    "ABS_B27_SIGNAL_FIELD": "Signal Field",
    "ABS_DC_TERRAIN_RIG": "Landscape Position",
    "ABS_DC_TERRAIN": "Landscape",
    "ABS_DC_HORIZON_BANKS_RIG": "Horizon Position",
    "ABS_DC_HORIZON_BANK_L": "Horizon - Left",
    "ABS_DC_HORIZON_BANK_R": "Horizon - Right",
    "ABS_DC_FINALE_RIG": "Finale Position",
    "ABS_DC_FINALE_SURFACE": "Finale Surface",
    "ABS_PARAMETRIC_ROUND_TUNNEL": "Round Tunnel",
    "ABS_PARAMETRIC_SQUARE_GATE_TUNNEL": "Square Gates",
}

for index in range(5):
    OBJECT_RENAMES[f"ABS_B27_OPEN_DEPTH_DESKTOP_{index}"] = f"Depth - Desktop {index + 1:02d}"
    OBJECT_RENAMES[f"ABS_B27_OPEN_DEPTH_SHARED_{index}"] = f"Depth - Shared {index + 1:02d}"
for index in range(4):
    OBJECT_RENAMES[f"ABS_B27_OPEN_SAFE_{index}"] = f"Atmosphere Patch {index + 1:02d}"

FORM_NAMES = (
    "Body 01 - Cube",
    "Body 02 - Pyramid",
    "Body 03 - Octahedron",
    "Body 04 - Triangular Prism",
    "Body 05 - Icosahedron",
    "Body 06 - Hexagonal Prism",
)

SYSTEM_IDS = {
    "Camera Path": "about.camera-path",
    "Scene Camera": "about.camera",
    "About Controls": "about.controls",
    "Opening Position": "about.rig.opening",
    "Landscape Position": "about.rig.landscape",
    "Horizon Position": "about.rig.horizon",
    "Finale Position": "about.rig.finale",
}

CATEGORY_NAMES = (
    "00 CONTROLS",
    "01 CAMERA",
    "02 OPENING",
    "03 SOLID BODIES",
    "04 ROUND TUNNEL",
    "05 LANDSCAPE",
    "06 SQUARE GATES",
    "07 HORIZON",
    "08 FINALE",
)

CORE_MATERIALS = (
    ("atmosphere", "Palette - Atmosphere"),
    ("stone", "Palette - Stone"),
    ("steel", "Palette - Steel"),
    ("glass", "Palette - Glass"),
    ("signal", "Palette - Signal"),
    ("organic", "Palette - Organic"),
)

INTERNAL_KEY = "Internal Export Data"

LEGACY_MATERIAL_NAMES = {
    "atmosphere": "ABS_0_ATMOSPHERE",
    "stone": "ABS_1_STONE",
    "steel": "ABS_2_STEEL",
    "glass": "ABS_3_GLASS",
    "signal": "ABS_4_SIGNAL",
    "organic": "ABS_5_ORGANIC",
}

OBSOLETE_UNLINKED_OBJECTS = {
    "ABS_FOREST_COLUMN_SOURCE.001",
    "ABS_HOOP_MODULE.001",
    "ABS_PARAMETRIC_RIDE_PATH.001",
}

OBSOLETE_BACKUP_MESHES = {
    "ABS_BACKUP_ABS_GATE_MODULE_00_ATMOSPHERE_MESH_PRE_SIMPLIFY",
    "ABS_BACKUP_ABS_GATE_MODULE_01_STONE_MESH_PRE_SIMPLIFY",
    "ABS_BACKUP_ABS_GATE_MODULE_02_STEEL_MESH_PRE_SIMPLIFY",
    "ABS_BACKUP_ABS_GATE_MODULE_03_GLASS_MESH_PRE_SIMPLIFY",
    "ABS_BACKUP_ABS_GATE_MODULE_04_SIGNAL_MESH_PRE_SIMPLIFY",
    "ABS_BACKUP_ABS_GATE_MODULE_05_ORGANIC_MESH_PRE_SIMPLIFY",
    "ABS_BACKUP_ABS_HOOP_MODULE_MESH_PRE_SIMPLIFY",
    "ABS_FINALE_WORKBENCH_LAMP_MESH_PRE_TASK_AIM",
    "ABS_ROLLERCOASTER_TRACK_MESH_PRE_FOREST_EXIT",
    "ABS_ROLLERCOASTER_TRACK_MESH_PRE_WORKBENCH",
}

OBSOLETE_ACTIONS = {
    "ABS_BACKUP_ABS_CAMERA_ACTION_PRE_SHARED_PROGRESS",
    "ABS_BACKUP_CAMERA_BAKED_CHANNELS",
    "ABS_BACKUP_CAMERA_LENS_CHANNELS",
    "ABS_BACKUP_CAMERA_PROGRESS_721_KEYS",
    "ABS_CAMERA.001Action",
    "ABS_CAMERA_PROGRESS_ACTION",
    "ABS_CAMERAAction.002",
    "ABS_CAMERAAction_PRE_PATH_MIGRATION",
    "ABS_PRE_DIRECTOR_CUT_CAMERA_ACTION",
}

OBSOLETE_TEXTS = {
    "ABOUT_PARAMETRIC_WORLD_README",
    "ABOUT_V2_HANDOFF_README",
    "ABS_AUTHORING_BASELINE.json",
    "ABS_AUTHORING_GUIDE",
    "ABSTRACT_FIELD_README",
    "IMPORTED_FLOATING_MODEL_CREDITS",
    "PARAMETRIC_PATH_EFFECTS_README",
}


def semantic_property(obj, property_name):
    if property_name in obj:
        return obj[property_name]
    internal = obj.get(INTERNAL_KEY)
    return internal.get(property_name) if internal is not None else None


def object_by_property(scene, property_name, value):
    matches = [
        obj for obj in scene.objects
        if str(semantic_property(obj, property_name) or "") == value
    ]
    if len(matches) > 1:
        raise RuntimeError(f"More than one object uses {property_name}={value}.")
    return matches[0] if matches else None


def resolve_object(scene, old_name, new_name):
    obj = scene.objects.get(new_name) or scene.objects.get(old_name)
    if obj is not None:
        return obj
    system_id = SYSTEM_IDS.get(new_name)
    return object_by_property(scene, "abs_system_id", system_id) if system_id else None


def rename_collections(scene):
    resolved = {}
    for old_name, new_name in COLLECTION_RENAMES.items():
        collection = bpy.data.collections.get(new_name) or bpy.data.collections.get(old_name)
        if collection is None:
            raise RuntimeError(f"Missing collection {old_name}.")
        collection.name = new_name
        collection.hide_viewport = False
        resolved[new_name] = collection

    root = resolved["ABOUT SCENE"]
    for parent in (scene.collection, *tuple(bpy.data.collections)):
        for child in tuple(parent.children):
            if child == root and parent != scene.collection:
                parent.children.unlink(child)
            elif child in resolved.values() and child != root:
                parent.children.unlink(child)
    if root.name not in scene.collection.children:
        scene.collection.children.link(root)
    for name in CATEGORY_NAMES:
        child = resolved[name]
        if child.name not in root.children:
            root.children.link(child)
    return resolved


def remove_known_orphans():
    removed_objects = []
    removed_data = []
    for name in sorted(OBSOLETE_UNLINKED_OBJECTS):
        obj = bpy.data.objects.get(name)
        if obj is None:
            continue
        if obj.users_collection:
            raise RuntimeError(f"Refusing to remove linked object {name}.")
        data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        removed_objects.append(name)
        if data is not None and data.users == 0:
            data_name = data.name
            if isinstance(data, bpy.types.Mesh):
                bpy.data.meshes.remove(data)
            elif isinstance(data, bpy.types.Curve):
                bpy.data.curves.remove(data)
            removed_data.append(data_name)
    for name in sorted(OBSOLETE_BACKUP_MESHES):
        mesh = bpy.data.meshes.get(name)
        if mesh is None:
            continue
        if mesh.users > int(bool(mesh.use_fake_user)):
            raise RuntimeError(f"Refusing to remove used backup mesh {name}.")
        mesh.use_fake_user = False
        bpy.data.meshes.remove(mesh)
        removed_data.append(name)
    return removed_objects, removed_data


def move_object(obj, target_collection):
    for collection in tuple(obj.users_collection):
        collection.objects.unlink(obj)
    target_collection.objects.link(obj)


def rename_objects(scene, collections):
    resolved = {}
    single_opening = scene.objects.get("Opening Field") is not None
    consolidated_opening = all(scene.objects.get(name) is not None for name in (
        "Depth Field - Shared",
        "Depth Field - Desktop",
        "Atmosphere Patches",
    ))
    for old_name, new_name in OBJECT_RENAMES.items():
        obj = resolve_object(scene, old_name, new_name)
        if obj is None:
            if (single_opening or consolidated_opening) and (
                new_name.startswith("Depth - ")
                or new_name.startswith("Atmosphere Patch ")
            ):
                continue
            if single_opening and new_name in {"Stars", "Signal Field"}:
                continue
            raise RuntimeError(f"Missing object {old_name}.")
        obj.name = new_name
        resolved[new_name] = obj

    forms = sorted(
        (
            obj for obj in scene.objects
            if semantic_property(obj, "abs_forms_body_index") is not None
        ),
        key=lambda obj: int(round(float(semantic_property(obj, "abs_forms_body_index")))),
    )
    if len(forms) != len(FORM_NAMES):
        raise RuntimeError(f"Expected six solid bodies, found {len(forms)}.")
    for form, name in zip(forms, FORM_NAMES):
        form.name = name
        resolved[name] = form

    for name, system_id in SYSTEM_IDS.items():
        obj = resolved[name]
        obj["abs_system_id"] = system_id
        obj.id_properties_ui("abs_system_id").update(
            description="Stable machine identifier. The visible Blender name may change.",
        )

    opening_members = ["Opening Position"]
    if single_opening:
        resolved["Opening Field"] = scene.objects["Opening Field"]
        opening_members.append("Opening Field")
    elif consolidated_opening:
        opening_members.extend(("Stars", "Signal Field"))
        for name in ("Depth Field - Shared", "Depth Field - Desktop", "Atmosphere Patches"):
            resolved[name] = scene.objects[name]
        opening_members.extend((
            "Depth Field - Shared",
            "Depth Field - Desktop",
            "Atmosphere Patches",
        ))
    else:
        opening_members.extend(("Stars", "Signal Field"))
        opening_members.extend((
            *(f"Depth - Desktop {index:02d}" for index in range(1, 6)),
            *(f"Depth - Shared {index:02d}" for index in range(1, 6)),
            *(f"Atmosphere Patch {index:02d}" for index in range(1, 5)),
        ))

    category_members = {
        "00 CONTROLS": ["About Controls"],
        "01 CAMERA": ["Camera Path", "Scene Camera"],
        "02 OPENING": opening_members,
        "03 SOLID BODIES": list(FORM_NAMES),
        "04 ROUND TUNNEL": ["Round Tunnel"],
        "05 LANDSCAPE": ["Landscape Position", "Landscape"],
        "06 SQUARE GATES": ["Square Gates"],
        "07 HORIZON": ["Horizon Position", "Horizon - Left", "Horizon - Right"],
        "08 FINALE": ["Finale Position", "Finale Surface"],
    }
    for collection_name, object_names in category_members.items():
        for object_name in object_names:
            move_object(resolved[object_name], collections[collection_name])

    for obj in scene.objects:
        if len(obj.users_collection) != 1:
            raise RuntimeError(f"{obj.name} must belong to exactly one readable collection.")
    return resolved


def simplify_datablock_names(scene, objects):
    objects["Camera Path"].data.name = "Camera Path Data"
    objects["Scene Camera"].data.name = "Scene Camera Data"
    for obj in scene.objects:
        if obj.type == "MESH" and obj.data is not None:
            obj.data.name = f"{obj.name} Mesh"
    for name, friendly_name in (
        ("ABS_GN_PARAMETRIC_ROUND_TUNNEL", "Round Tunnel Geometry"),
        ("ABS_GN_PARAMETRIC_SQUARE_GATE_TUNNEL", "Square Gates Geometry"),
    ):
        group = bpy.data.node_groups.get(friendly_name) or bpy.data.node_groups.get(name)
        if group is None:
            raise RuntimeError(f"Missing Geometry Nodes group {name}.")
        group.name = friendly_name
    for object_name in ("Round Tunnel", "Square Gates"):
        for modifier in objects[object_name].modifiers:
            if modifier.type == "NODES":
                modifier.name = "Geometry"

    camera_action = (
        objects["Scene Camera"].animation_data.action
        if objects["Scene Camera"].animation_data else None
    )
    if camera_action is not None:
        camera_action.name = "Camera Travel"
    for name in sorted(OBSOLETE_ACTIONS):
        action = bpy.data.actions.get(name)
        if action is None or action == camera_action:
            continue
        if action.users > int(bool(action.use_fake_user)):
            raise RuntimeError(f"Refusing to remove used action {name}.")
        action.use_fake_user = False
        bpy.data.actions.remove(action)


def simplify_materials():
    core = set()
    for slot, (role, friendly_name) in enumerate(CORE_MATERIALS):
        material = bpy.data.materials.get(friendly_name) or bpy.data.materials.get(
            LEGACY_MATERIAL_NAMES[role]
        )
        if material is None:
            raise RuntimeError(f"Missing semantic material for {role}.")
        material.name = friendly_name
        material["abs_palette_slot"] = slot
        material["abs_material_role"] = role
        core.add(material)

    referenced = {
        material
        for mesh in bpy.data.meshes
        for material in mesh.materials
        if material is not None
    }
    for node_group in bpy.data.node_groups:
        for node in node_group.nodes:
            for socket in node.inputs:
                value = getattr(socket, "default_value", None)
                if isinstance(value, bpy.types.Material):
                    referenced.add(value)
    unexpected = sorted(material.name for material in referenced if material not in core)
    if unexpected:
        raise RuntimeError(f"Non-semantic materials are still referenced: {unexpected}")

    removed = []
    for material in tuple(bpy.data.materials):
        if material in core:
            continue
        removed.append(material.name)
        material.use_fake_user = False
        bpy.data.materials.remove(material)
    return removed


def simplify_texts():
    guide = bpy.data.texts.get("README - About Scene") or bpy.data.texts.get(
        "ABOUT_DIRECTOR_CUT_README"
    )
    if guide is None:
        guide = bpy.data.texts.new("README - About Scene")
    guide.name = "README - About Scene"
    guide.clear()
    guide.write(
        "ABOUT SCENE — QUICK GUIDE\n\n"
        "Use the numbered Outliner collections from top to bottom.\n"
        "Select About Controls for all camera, spacing, density and size controls.\n"
        "Edit Camera Path in Edit Mode to change the route.\n"
        "Scene Camera is the website camera. Round Tunnel and Square Gates are live\n"
        "Geometry Nodes systems, so do not create one object per ring or gate.\n"
        "The opening is one Opening Field mesh. Its disconnected components retain\n"
        "the authored depth, atmosphere and signal geometry without extra Outliner\n"
        "layers. Opening Position moves and scales the complete field.\n\n"
        "COLOUR\n"
        "The six Palette materials are semantic slots only. Export objects use\n"
        "abs_palette_mode: mixed by default, single only for an explicit role, or\n"
        "authored-faces for deliberate face work. The website owns the real colours.\n\n"
        "NAMING\n"
        "Visible names are for navigation. Do not replace abs_system_id or\n"
        "abs_object_id: those stable properties connect Blender to the exporter.\n"
    )
    for name in sorted(OBSOLETE_TEXTS):
        text = bpy.data.texts.get(name)
        if text is not None and text != guide:
            bpy.data.texts.remove(text)


def main():
    scene = bpy.context.scene
    removed_objects, removed_data = remove_known_orphans()
    collections = rename_collections(scene)
    objects = rename_objects(scene, collections)
    simplify_datablock_names(scene, objects)
    removed_materials = simplify_materials()
    simplify_texts()
    scene.name = "About Scene"
    if scene.world is not None:
        scene.world.name = "About World"
    scene["abs_naming_contract"] = "friendly-ui-stable-ids-v1"
    scene["abs_naming_script"] = "scripts/about-v2-blender/simplify-scene-names.py"
    bpy.context.view_layer.update()
    print(json.dumps({
        "status": "ok",
        "root": "ABOUT SCENE",
        "collections": list(CATEGORY_NAMES),
        "sceneObjects": len(scene.objects),
        "materials": len(bpy.data.materials),
        "texts": [text.name for text in bpy.data.texts],
        "removedObjects": removed_objects,
        "removedData": removed_data,
        "removedMaterials": removed_materials,
        "saved": False,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
