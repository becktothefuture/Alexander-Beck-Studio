#!/usr/bin/env python3
"""Tune the About landscape through the master About Controls object.

Mountain Height owns the broad landform. Mountain Detail adds progressively
smaller, more numerous erosion peaks through the existing displacement stack.
No second control panel or new modifier is created. This script updates the
open scene only; it never saves the Blender file.
"""

import json

import bpy


LANDSCAPE_NAME = "Landscape"
ABOUT_CONTROLS_NAME = "About Controls"
RESOLUTION_MODIFIER_NAME = "Terrain Resolution"
MOUNTAIN_MODIFIER_NAME = "Mountain Form"
EROSION_MODIFIER_NAME = "Mountain Erosion"
MOUNTAIN_HEIGHT_CONTROL = "24 Mountain Height"
MOUNTAIN_DETAIL_CONTROL = "25 Mountain Detail"
INTERNAL_KEY = "Internal Export Data"
TARGET_MOUNTAIN_HEIGHT = 30.0
TARGET_MOUNTAIN_DETAIL = 4.0
OBSOLETE_LANDSCAPE_CONTROLS = (
    "01 Width Scale",
    "02 Length Scale",
    "03 Vertical Scale",
    "04 Erosion Amount",
    "05 Erosion Scale",
    "06 Erosion Complexity",
    "07 Surface Resolution",
)


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


def set_internal_value(owner, key, value):
    metadata = plain_value(owner.get(INTERNAL_KEY, {}))
    metadata[key] = plain_value(value)
    owner[INTERNAL_KEY] = metadata


def add_driver(owner, data_path, target, property_name, expression="value", index=None,
               extra_variables=()):
    try:
        owner.driver_remove(data_path) if index is None else owner.driver_remove(data_path, index)
    except (TypeError, RuntimeError):
        pass
    curve = owner.driver_add(data_path) if index is None else owner.driver_add(data_path, index)
    variables = (("value", target, property_name), *extra_variables)
    for variable_name, variable_target, variable_property in variables:
        variable = curve.driver.variables.new()
        variable.name = variable_name
        variable.type = "SINGLE_PROP"
        variable.targets[0].id_type = "OBJECT"
        variable.targets[0].id = variable_target
        variable.targets[0].data_path = f'["{variable_property}"]'
    curve.driver.expression = expression
    if not curve.driver.is_valid:
        raise RuntimeError(f"Invalid driver on {owner.name} {data_path}: {expression}")
    return curve


def evaluated_bounds(obj):
    bpy.context.view_layer.update()
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    corners = [evaluated.matrix_world @ type(evaluated.location)(corner) for corner in evaluated.bound_box]
    return {
        "min": [min(corner[axis] for corner in corners) for axis in range(3)],
        "max": [max(corner[axis] for corner in corners) for axis in range(3)],
    }


def refresh_scene(scene, obj):
    obj.update_tag(refresh={"OBJECT"})
    current = scene.frame_current
    adjacent = current + 1 if current < scene.frame_end else current - 1
    scene.frame_set(adjacent)
    scene.frame_set(current)
    bpy.context.view_layer.update()


def update_guide():
    guide = bpy.data.texts.get("README - About Scene")
    if guide is None:
        return
    marker = "LANDSCAPE APPEARANCE\n"
    body = guide.as_string()
    if marker in body:
        body = body.split(marker, 1)[0].rstrip() + "\n\n"
    body += marker + (
        "Select About Controls. Mountain Height sets the broad landform. Mountain\n"
        "Detail simultaneously adds relief, reduces the feature size and increases\n"
        "noise complexity, producing more numerous smaller peaks. Landscape itself\n"
        "has no competing public control panel.\n"
    )
    guide.clear()
    guide.write(body)


def main():
    landscape = bpy.data.objects.get(LANDSCAPE_NAME)
    about_controls = bpy.data.objects.get(ABOUT_CONTROLS_NAME)
    if landscape is None or landscape.type != "MESH":
        raise RuntimeError("The generated Landscape mesh is missing.")
    if about_controls is None:
        raise RuntimeError("About Controls is missing.")
    for control_name in (MOUNTAIN_HEIGHT_CONTROL, MOUNTAIN_DETAIL_CONTROL):
        if control_name not in about_controls:
            raise RuntimeError(f"About Controls has no {control_name} control.")

    resolution = landscape.modifiers.get(RESOLUTION_MODIFIER_NAME)
    mountain = landscape.modifiers.get(MOUNTAIN_MODIFIER_NAME)
    erosion = landscape.modifiers.get(EROSION_MODIFIER_NAME)
    if resolution is None or resolution.type != "SUBSURF":
        raise RuntimeError("Landscape has no Terrain Resolution subdivision modifier.")
    if mountain is None or mountain.type != "DISPLACE":
        raise RuntimeError("Landscape has no Mountain Form displacement modifier.")
    if erosion is None or erosion.type != "DISPLACE" or erosion.texture is None:
        raise RuntimeError("Landscape has no textured Mountain Erosion displacement modifier.")

    before = evaluated_bounds(landscape)
    for property_name in OBSOLETE_LANDSCAPE_CONTROLS:
        if property_name in landscape:
            del landscape[property_name]

    about_controls[MOUNTAIN_HEIGHT_CONTROL] = TARGET_MOUNTAIN_HEIGHT
    about_controls[MOUNTAIN_DETAIL_CONTROL] = TARGET_MOUNTAIN_DETAIL
    add_driver(mountain, "strength", about_controls, MOUNTAIN_HEIGHT_CONTROL)

    add_driver(
        erosion,
        "strength",
        about_controls,
        MOUNTAIN_DETAIL_CONTROL,
        expression="6.0*value",
    )

    erosion_texture = erosion.texture
    if erosion_texture.users > 1:
        erosion_texture = erosion_texture.copy()
        erosion_texture.name = "Landscape Erosion"
        erosion.texture = erosion_texture
    add_driver(
        erosion_texture,
        "noise_scale",
        about_controls,
        MOUNTAIN_DETAIL_CONTROL,
        expression="max(18.0,58.0/(1.0+0.35*value))",
    )
    add_driver(
        erosion_texture,
        "noise_depth",
        about_controls,
        MOUNTAIN_DETAIL_CONTROL,
        expression="min(6.0,max(1.0,1.0+value))",
    )
    resolution.levels = 2
    resolution.render_levels = 2

    set_internal_value(
        landscape,
        "abs_landscape_appearance_contract",
        "master-controls-granular-mountains/v2",
    )
    set_internal_value(
        landscape,
        "abs_landscape_appearance_script",
        "scripts/about-v2-blender/parameterize-landscape-appearance.py",
    )
    set_internal_value(landscape, "abs_control_owner", ABOUT_CONTROLS_NAME)
    update_guide()
    refresh_scene(bpy.context.scene, landscape)
    after = evaluated_bounds(landscape)

    drivers = []
    # Modifier drivers live on the owning Object's animation data. Texture
    # drivers live on the Texture datablock itself.
    for owner in (landscape, erosion_texture):
        if owner.animation_data:
            drivers.extend(
                f"{owner.name}:{curve.data_path}[{curve.array_index}]"
                for curve in owner.animation_data.drivers
            )
    print(json.dumps({
        "status": "ok",
        "object": landscape.name,
        "controls": {
            MOUNTAIN_HEIGHT_CONTROL: about_controls[MOUNTAIN_HEIGHT_CONTROL],
            MOUNTAIN_DETAIL_CONTROL: about_controls[MOUNTAIN_DETAIL_CONTROL],
        },
        "noiseScale": erosion_texture.noise_scale,
        "noiseDepth": erosion_texture.noise_depth,
        "beforeBounds": before,
        "afterBounds": after,
        "driverCount": len(drivers),
        "drivers": sorted(drivers),
        "saved": False,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
