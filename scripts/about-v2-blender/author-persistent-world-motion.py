#!/usr/bin/env python3
"""Author continuous world motion for the About point scene.

The Blender file remains the source of truth for motion behaviour. Solid bodies
receive individual rotation axes and periods, the landscape displacement shifts
slowly over time, and the finale bust turns around its vertical axis. The point
exporter carries these properties into the website bundle. This script updates
the open scene only; it never saves the Blender file.
"""

import json
import math

import bpy
from mathutils import Vector


BODY_MODEL_ID = "about.01"
TERRAIN_NAME = "Landscape"
BUST_NAME = "Finale Bust"
MOTION_CONTRACT = "continuous-authored-world-motion/v2-bounded-bust"
BODY_PERIODS_SECONDS = (58.0, 66.0, 74.0, 62.0, 70.0, 78.0)
TERRAIN_PERIOD_SECONDS = 20.0
TERRAIN_AMPLITUDE_WU = 2.4
TERRAIN_WAVELENGTH_WU = 96.0
TERRAIN_SECONDARY_SCALE = 0.46
BUST_PERIOD_SECONDS = 32.0
BUST_AMPLITUDE_RADIANS = math.radians(8.0)


def normalised_axis(index):
    axis = Vector((
        0.38 + 0.42 * math.sin(index * 1.71 + 0.4),
        0.24 + 0.36 * math.cos(index * 1.13 + 0.8),
        0.72 + 0.18 * math.sin(index * 0.79 + 1.6),
    ))
    return axis.normalized()


def model_id(obj):
    direct = obj.get("abs_model_id")
    if direct:
        return str(direct)
    internal = obj.get("Internal Export Data", {})
    return str(internal.get("abs_model_id") or "")


def object_id(obj):
    direct = obj.get("abs_object_id")
    if direct:
        return str(direct)
    internal = obj.get("Internal Export Data", {})
    return str(internal.get("abs_object_id") or obj.name)


def ensure_motion_property(obj, key, value, description):
    obj[key] = value
    try:
        obj.id_properties_ui(key).update(description=description)
    except TypeError:
        pass


def require_driver(obj, data_path, index):
    if obj.animation_data is None:
        raise RuntimeError(f"{obj.name} has no animation data for {data_path}.")
    curve = obj.animation_data.drivers.find(data_path, index=index)
    if curve is None:
        raise RuntimeError(f"{obj.name} has no driver for {data_path}[{index}].")
    return curve


def configure_body_motion(scene):
    bodies = sorted(
        (obj for obj in scene.objects if obj.type == "MESH" and model_id(obj) == BODY_MODEL_ID),
        key=object_id,
    )
    if len(bodies) != 24:
        raise RuntimeError(f"Expected 24 solid bodies, found {len(bodies)}.")
    fps = scene.render.fps / scene.render.fps_base
    for index, body in enumerate(bodies):
        axis = normalised_axis(index)
        period = BODY_PERIODS_SECONDS[index % len(BODY_PERIODS_SECONDS)] + 1.75 * (index // 6)
        speed = 2.0 * math.pi / period
        ensure_motion_property(body, "abs_motion_group", f"about.01.body.{index:02d}",
                               "Website motion: unique rigid group for this solid body.")
        ensure_motion_property(body, "abs_motion_behavior", "continuous-rotation",
                               "Website motion: continuously rotate around this object's origin.")
        ensure_motion_property(body, "abs_motion_axis", list(axis),
                               "Continuous rotation axis in Blender coordinates.")
        ensure_motion_property(body, "abs_motion_speed_radians_per_second", speed,
                               "Continuous rotation speed in radians per second.")
        for component in range(3):
            curve = require_driver(body, "rotation_euler", component)
            base_key = f"abs_motion_base_rotation_expression_{component}"
            if base_key not in body:
                body[base_key] = curve.driver.expression
            base_expression = str(body[base_key])
            radians_per_frame = speed * axis[component] / fps
            curve.driver.expression = (
                f"({base_expression})+(frame-1.0)*{radians_per_frame:.12f}"
            )
            if not curve.driver.is_valid:
                raise RuntimeError(f"Invalid continuous rotation driver on {body.name}.")
    return bodies


def configure_terrain_motion(scene):
    terrain = bpy.data.objects.get(TERRAIN_NAME)
    if terrain is None or terrain.type != "MESH":
        raise RuntimeError("Landscape mesh is missing.")
    erosion = terrain.modifiers.get("Mountain Erosion")
    if erosion is None or erosion.type != "DISPLACE" or erosion.texture is None:
        raise RuntimeError("Landscape has no animated Mountain Erosion displacement.")
    fps = scene.render.fps / scene.render.fps_base
    angular_per_frame = 2.0 * math.pi / (TERRAIN_PERIOD_SECONDS * fps)
    strength_curve = require_driver(terrain, 'modifiers["Mountain Erosion"].strength', 0)
    strength_base_key = "abs_motion_base_erosion_strength_expression"
    if strength_base_key not in terrain:
        terrain[strength_base_key] = strength_curve.driver.expression
    strength_curve.driver.expression = (
        f"({terrain[strength_base_key]})*(1.0+0.07*sin((frame-1.0)*{angular_per_frame:.12f}))"
    )
    texture = erosion.texture
    if texture.animation_data is None:
        raise RuntimeError("Landscape erosion texture has no animation data.")
    scale_curve = texture.animation_data.drivers.find("noise_scale", index=0)
    if scale_curve is None:
        raise RuntimeError("Landscape erosion texture has no noise-scale driver.")
    scale_base_key = "abs_motion_base_noise_scale_expression"
    if scale_base_key not in terrain:
        terrain[scale_base_key] = scale_curve.driver.expression
    scale_curve.driver.expression = (
        f"({terrain[scale_base_key]})*(1.0+0.035*(sin((frame-1.0)*{angular_per_frame:.12f}+1.2)-sin(1.2)))"
    )
    if not strength_curve.driver.is_valid or not scale_curve.driver.is_valid:
        raise RuntimeError("Landscape motion drivers are invalid.")
    ensure_motion_property(terrain, "abs_motion_behavior", "terrain-wave",
                           "Website motion: coherent low-frequency terrain deformation.")
    ensure_motion_property(terrain, "abs_motion_axis", [0.0, 0.0, 1.0],
                           "Terrain displacement axis in Blender coordinates.")
    ensure_motion_property(terrain, "abs_motion_speed_radians_per_second",
                           2.0 * math.pi / TERRAIN_PERIOD_SECONDS,
                           "Terrain deformation speed in radians per second.")
    ensure_motion_property(terrain, "abs_motion_amplitude_wu", TERRAIN_AMPLITUDE_WU,
                           "Terrain deformation amplitude in website world units.")
    ensure_motion_property(terrain, "abs_motion_wavelength_wu", TERRAIN_WAVELENGTH_WU,
                           "Terrain deformation wavelength in website world units.")
    ensure_motion_property(terrain, "abs_motion_secondary_scale", TERRAIN_SECONDARY_SCALE,
                           "Relative strength of the secondary terrain wave.")
    return terrain


def configure_bust_motion(scene):
    bust = bpy.data.objects.get(BUST_NAME)
    if bust is None or bust.type != "MESH":
        raise RuntimeError("Finale Bust mesh is missing.")
    fps = scene.render.fps / scene.render.fps_base
    speed = 2.0 * math.pi / BUST_PERIOD_SECONDS
    ensure_motion_property(bust, "abs_motion_behavior", "bounded-rotation",
                           "Website motion: turn gently either side of the authored front view.")
    ensure_motion_property(bust, "abs_motion_axis", [0.0, 0.0, 1.0],
                           "Continuous rotation axis in Blender coordinates.")
    ensure_motion_property(bust, "abs_motion_speed_radians_per_second", speed,
                           "Bounded rotation cycle speed in radians per second.")
    ensure_motion_property(bust, "abs_motion_amplitude_radians", BUST_AMPLITUDE_RADIANS,
                           "Maximum turn either side of the authored front view, in radians.")
    ensure_motion_property(bust, "abs_motion_period_seconds", BUST_PERIOD_SECONDS,
                           "Duration of one complete side-to-side turn.")
    curve = None
    if bust.animation_data:
        curve = bust.animation_data.drivers.find("rotation_euler", index=2)
    if curve is None:
        curve = bust.driver_add("rotation_euler", 2)
    base_key = "abs_motion_base_rotation_z"
    if base_key not in bust:
        bust[base_key] = float(bust.rotation_euler.z)
    curve.driver.expression = (
        f"{float(bust[base_key]):.12f}+{BUST_AMPLITUDE_RADIANS:.12f}"
        f"*sin((frame-1.0)*{speed / fps:.12f})"
    )
    if not curve.driver.is_valid:
        raise RuntimeError("Finale Bust bounded rotation driver is invalid.")
    return bust


def update_guide():
    guide = bpy.data.texts.get("README - About Scene")
    if guide is None:
        return
    marker = "PERSISTENT WORLD MOTION\n"
    body = guide.as_string()
    if marker in body:
        body = body.split(marker, 1)[0].rstrip() + "\n\n"
    body += marker + (
        "Solid bodies rotate individually around their own origins. Landscape\n"
        "deformation changes continuously. Finale Bust turns eight degrees either\n"
        "side of its front view over 32 seconds, around its grounded vertical axis.\n"
        "These object properties are exported to the website;\n"
        "the browser uses ambient time so motion continues while scrolling stops.\n"
    )
    guide.clear()
    guide.write(body)


def main():
    scene = bpy.context.scene
    bodies = configure_body_motion(scene)
    terrain = configure_terrain_motion(scene)
    bust = configure_bust_motion(scene)
    scene["abs_persistent_motion_contract"] = MOTION_CONTRACT
    scene["abs_persistent_motion_script"] = (
        "scripts/about-v2-blender/author-persistent-world-motion.py"
    )
    update_guide()
    current = scene.frame_current
    scene.frame_set(current + 1 if current < scene.frame_end else current - 1)
    scene.frame_set(current)
    bpy.context.view_layer.update()
    print(json.dumps({
        "status": "ok",
        "contract": MOTION_CONTRACT,
        "solidBodies": len(bodies),
        "solidBodyRadiansPerSecondRange": [
            min(float(obj["abs_motion_speed_radians_per_second"]) for obj in bodies),
            max(float(obj["abs_motion_speed_radians_per_second"]) for obj in bodies),
        ],
        "terrain": terrain.name,
        "terrainPeriodSeconds": TERRAIN_PERIOD_SECONDS,
        "bust": bust.name,
        "bustPeriodSeconds": BUST_PERIOD_SECONDS,
        "saved": False,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
