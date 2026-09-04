#!/usr/bin/env python3
"""Add breathing room to the canonical About journey without adding controls.

The camera rail is stretched only on its forward Y axis. Existing normalized
scene positions, tunnel counts, gate counts, lateral bends, heights, and camera
timing remain unchanged. The opening helper also receives a deeper authored
scale. This script is idempotent and does not save the blend file.
"""

import json

import bpy


FORWARD_SCALE = 1.16
OPENING_DEPTH_SCALE = 0.72
FINALE_DEPTH_SCALE = 1.12
CONTRACT = "forward-spacing-116-opening-depth-072-finale-depth-112-v2"
INTERNAL_KEY = "Internal Export Data"


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


def find_system_object(scene, system_id, names):
    for obj in scene.objects:
        data = plain_value(obj.get(INTERNAL_KEY, {}))
        if obj.get("abs_system_id") == system_id or data.get("abs_system_id") == system_id:
            return obj
    for name in names:
        obj = scene.objects.get(name)
        if obj is not None:
            return obj
    raise RuntimeError(f"Missing Blender system {system_id}.")


def main():
    scene = bpy.context.scene
    scene_data = plain_value(scene.get(INTERNAL_KEY, {}))
    if scene_data.get("abs_scene_spacing_contract") == CONTRACT:
        print(json.dumps({"status": "ok", "changed": False, "contract": CONTRACT, "saved": False}))
        return

    path = find_system_object(
        scene, "about.camera-path", ("Camera Path", "ABS_PARAMETRIC_RIDE_PATH"),
    )
    opening = find_system_object(
        scene, "about.rig.opening", ("Opening Position", "ABS_DC_OPENING_RIG"),
    )
    finale = find_system_object(
        scene, "about.rig.finale", ("Finale Position", "ABS_DC_FINALE_RIG"),
    )
    if path.type != "CURVE" or len(path.data.splines) != 1:
        raise RuntimeError("Camera Path must be one curve spline.")
    spline = path.data.splines[0]
    points = spline.bezier_points if spline.type == "BEZIER" else spline.points
    if len(points) < 4:
        raise RuntimeError("Camera Path needs at least four editable points.")

    path_changed = abs(float(scene_data.get("abs_scene_forward_scale", 0.0)) - FORWARD_SCALE) > 1e-6
    if path_changed:
        anchor_y = float(points[0].co.y)
        for point in points:
            point.co.y = anchor_y + ((float(point.co.y) - anchor_y) * FORWARD_SCALE)
            if spline.type == "BEZIER":
                point.handle_left.y = anchor_y + ((float(point.handle_left.y) - anchor_y) * FORWARD_SCALE)
                point.handle_right.y = anchor_y + ((float(point.handle_right.y) - anchor_y) * FORWARD_SCALE)
    opening.scale.y = OPENING_DEPTH_SCALE
    finale.scale.y = FINALE_DEPTH_SCALE
    path.data.update_tag()
    opening.update_tag(refresh={"OBJECT"})
    bpy.context.view_layer.update()

    scene_data.update({
        "abs_scene_spacing_contract": CONTRACT,
        "abs_scene_forward_scale": FORWARD_SCALE,
        "abs_opening_depth_scale": OPENING_DEPTH_SCALE,
        "abs_finale_depth_scale": FINALE_DEPTH_SCALE,
        "abs_scene_spacing_script": "scripts/about-v2-blender/lengthen-about-scene.py",
    })
    scene[INTERNAL_KEY] = scene_data
    print(json.dumps({
        "status": "ok",
        "changed": True,
        "pathChanged": path_changed,
        "contract": CONTRACT,
        "pathPoints": len(points),
        "pathLengthWU": round(sum(item.calc_length() for item in path.data.splines), 6),
        "openingDepthScale": round(opening.scale.y, 6),
        "finaleDepthScale": round(finale.scale.y, 6),
        "saved": False,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
