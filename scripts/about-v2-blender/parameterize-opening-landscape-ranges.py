#!/usr/bin/env python3
"""Add real start/end controls for the About opening and landscape.

The script migrates the master About Controls keys into one continuous,
section-based order. The current evaluated Opening Field and Landscape bounds
become the authored defaults, so running this script does not change the saved
composition. Blender drivers then make each Start/End pair control placement
and occupied path length. The script updates the open scene only and never
saves the Blender file.
"""

import json
import re

import bpy
from mathutils import Vector
from mathutils.geometry import interpolate_bezier


INTERNAL_KEY = "Internal Export Data"
CONTRACT = "master-opening-landscape-ranges/v1"
MINIMUM_SPAN_PERCENT = 0.25
OBSOLETE_CONTROL_KEYS = ("20 Landscape Position (%)",)

CONTROL_SPECS = (
    ("01 Camera FOV", "01 Camera FOV", 10.0, 170.0,
     "Horizontal field of view for the website scene camera."),
    ("02 Fog Start", "02 Fog Start", 0.0, 1000.0,
     "Distance from the camera where fog begins."),
    ("03 Fog End", "03 Fog End", 1.0, 2000.0,
     "Distance from the camera where the scene is fully hidden by fog."),
    ("04 Fog Curve", "04 Fog Curve", 0.1, 8.0,
     "Shape of the fog transition."),
    (None, "05 Opening Start (%)", 0.0, 100.0,
     "Near boundary of the Opening Field along the camera path."),
    (None, "06 Opening End (%)", 0.0, 100.0,
     "Far boundary of the Opening Field along the camera path."),
    ("05 Body Count", "07 Body Count", 4.0, 6.0,
     "Number of different solid body shapes repeated in the field."),
    ("06 Bodies Start (%)", "08 Bodies Start (%)", 0.0, 100.0,
     "Position of the first solid body along the camera path."),
    ("07 Bodies End (%)", "09 Bodies End (%)", 0.0, 100.0,
     "Position of the last solid body along the camera path."),
    ("08 Body Size", "10 Body Size", 0.1, 8.0,
     "Overall size of every solid body."),
    ("09 Body Spread", "11 Body Spread", 1.0, 8.0,
     "Radius of the close solid-body corridor."),
    ("10 Body Rotation", "12 Body Rotation", -4.0, 4.0,
     "Total rotation across the solid-body space, in turns."),
    ("11 Copies Per Shape", "13 Copies Per Shape", 1.0, 6.0,
     "Number of collision-safe copies generated for each enabled shape."),
    ("12 Random Seed", "14 Random Seed", 0.0, 2147483647.0,
     "Seed for deterministic body positions and rotations."),
    ("13 Minimum Gap", "15 Minimum Gap", 0.1, 100.0,
     "Minimum empty surface distance between visible bodies."),
    ("14 Start (%)", "16 Start (%)", 0.0, 100.0,
     "Start of the round tunnel along the camera path."),
    ("15 End (%)", "17 End (%)", 0.0, 100.0,
     "End of the round tunnel along the camera path."),
    ("16 Ring Count", "18 Ring Count", 4.0, 120.0,
     "Number of complete rings generated between Start and End."),
    ("17 Opening Radius", "19 Opening Radius", 0.5, 60.0,
     "Clear radius inside every ring."),
    ("18 Ring Thickness", "20 Ring Thickness", 0.05, 12.0,
     "Thickness of every ring."),
    ("19 Ring Depth", "21 Ring Depth", 0.05, 40.0,
     "Full depth of every ring along the path."),
    (None, "22 Landscape Start (%)", 0.0, 100.0,
     "Near boundary of the Landscape along the camera path."),
    (None, "23 Landscape End (%)", 0.0, 100.0,
     "Far boundary of the Landscape along the camera path."),
    ("21 Mountain Height", "24 Mountain Height", 0.0, 200.0,
     "Height of the broad landform around the flight corridor."),
    ("22 Mountain Detail", "25 Mountain Detail", 0.0, 8.0,
     "Amount, scale and complexity of the smaller mountain peaks."),
    ("23 Start (%)", "26 Start (%)", 0.0, 100.0,
     "Start of the square gates along the camera path."),
    ("24 End (%)", "27 End (%)", 0.0, 100.0,
     "End of the square gates along the camera path."),
    ("25 Gate Count", "28 Gate Count", 4.0, 96.0,
     "Number of complete gates generated between Start and End."),
    ("26 Opening Size", "29 Opening Size", 2.0, 120.0,
     "Clear width and height inside every square gate."),
    ("27 Frame Thickness", "30 Frame Thickness", 0.05, 20.0,
     "Thickness of every square gate frame."),
    ("28 Gate Depth", "31 Gate Depth", 0.05, 60.0,
     "Full depth of every gate along the path."),
    ("29 Twist", "32 Twist", -4.0, 4.0,
     "Total twist from the first gate to the last, in turns."),
    ("30 Bust Scale", "33 Bust Scale", 0.2, 5.0,
     "Overall scale of the bust and its focus height."),
    ("31 Orbit Amount", "34 Orbit Amount", -720.0, 720.0,
     "Degrees travelled around the bust during the finale."),
    ("32 Orbit Radius", "35 Orbit Radius", 40.0, 1200.0,
     "Distance between the camera and the bust during the orbit."),
    ("33 Platform Turn", "36 Platform Turn", 1.0, 180.0,
     "Seconds for one complete visible platform rotation."),
)

SECTION_LABELS = (
    ("00 — CAMERA + FOG", "View and visibility"),
    ("04 — OPENING FIELD", "Placement and length"),
    ("06 — SOLID BODIES", "Population and corridor"),
    ("15 — ROUND TUNNEL", "Passage shape and placement"),
    ("21 — LANDSCAPE", "Placement and mountain shape"),
    ("25 — SQUARE GATES", "Passage shape and twist"),
    ("32 — BUST FINALE", "Reveal and motion"),
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


def internal_data(owner):
    return plain_value(owner.get(INTERNAL_KEY, {}))


def set_internal_values(owner, values):
    metadata = internal_data(owner)
    metadata.update(plain_value(values))
    owner[INTERNAL_KEY] = metadata


def path_polyline(path, samples_per_segment=128):
    spline = path.data.splines[0]
    if spline.type != "BEZIER" or spline.use_cyclic_u:
        raise RuntimeError("Camera Path must remain one open Bezier spline.")
    points = spline.bezier_points
    samples = []
    for index in range(len(points) - 1):
        left = points[index]
        right = points[index + 1]
        segment = list(interpolate_bezier(
            left.co, left.handle_right, right.handle_left, right.co,
            samples_per_segment + 1,
        ))
        if index:
            segment = segment[1:]
        samples.extend(path.matrix_world @ point for point in segment)
    cumulative = [0.0]
    for left, right in zip(samples, samples[1:]):
        cumulative.append(cumulative[-1] + (right - left).length)
    return samples, cumulative


def nearest_fraction(samples, cumulative, target):
    best_distance = float("inf")
    best_fraction = 0.0
    total = cumulative[-1]
    for index, (left, right) in enumerate(zip(samples, samples[1:])):
        vector = right - left
        length = vector.length
        factor = 0.0 if length <= 1e-9 else max(
            0.0, min(1.0, (target - left).dot(vector) / (length * length))
        )
        point = left + vector * factor
        distance = (target - point).length_squared
        if distance < best_distance:
            best_distance = distance
            best_fraction = (cumulative[index] + length * factor) / total
    return best_fraction


def evaluated_world_points(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    finally:
        evaluated.to_mesh_clear()


def range_from_geometry(obj, samples, cumulative):
    fractions = [nearest_fraction(samples, cumulative, point)
                 for point in evaluated_world_points(obj)]
    if not fractions:
        raise RuntimeError(f"{obj.name} has no evaluated points.")
    return min(fractions) * 100.0, max(fractions) * 100.0


def evaluated_bounds(obj):
    points = evaluated_world_points(obj)
    return tuple(
        value
        for axis in range(3)
        for value in (
            min(point[axis] for point in points),
            max(point[axis] for point in points),
        )
    )


def refresh(scene, objects):
    for obj in objects:
        obj.update_tag(refresh={"OBJECT"})
    current = scene.frame_current
    adjacent = current + 1 if current < scene.frame_end else current - 1
    scene.frame_set(adjacent)
    scene.frame_set(current)
    bpy.context.view_layer.update()


def driver_owners():
    seen = set()
    for datablocks in (
        bpy.data.objects, bpy.data.meshes, bpy.data.curves, bpy.data.cameras,
        bpy.data.materials, bpy.data.node_groups, bpy.data.scenes,
    ):
        for owner in datablocks:
            if owner.as_pointer() in seen or owner.animation_data is None:
                continue
            seen.add(owner.as_pointer())
            yield owner


def retarget_control_drivers(controls, renames):
    changed = 0
    for owner in driver_owners():
        for curve in owner.animation_data.drivers:
            curve_changed = False
            for variable in curve.driver.variables:
                for target in variable.targets:
                    if target.id != controls:
                        continue
                    match = re.fullmatch(r'\["(.+)"\]', target.data_path)
                    if match and match.group(1) in renames:
                        target.data_path = f'["{renames[match.group(1)]}"]'
                        changed += 1
                        curve_changed = True
            if curve_changed:
                # Blender can retain a stale invalid state after only a driver
                # target path changes. Reassigning the expression recompiles it.
                curve.driver.expression = str(curve.driver.expression)
    return changed


def add_control(controls, key, value, minimum, maximum, description):
    integer_value = isinstance(value, int) and not isinstance(value, bool)
    if key not in controls:
        controls[key] = int(value) if integer_value else float(value)
    ui_minimum = int(minimum) if integer_value else float(minimum)
    ui_maximum = int(maximum) if integer_value else float(maximum)
    controls.id_properties_ui(key).update(
        min=ui_minimum,
        max=ui_maximum,
        soft_min=ui_minimum,
        soft_max=ui_maximum,
        description=description,
    )


def add_two_value_driver(owner, data_path, index, controls, start_key, end_key, expression):
    try:
        owner.driver_remove(data_path, index)
    except (TypeError, RuntimeError):
        pass
    curve = owner.driver_add(data_path, index)
    for variable_name, property_name in (("start", start_key), ("end", end_key)):
        variable = curve.driver.variables.new()
        variable.name = variable_name
        variable.type = "SINGLE_PROP"
        variable.targets[0].id_type = "OBJECT"
        variable.targets[0].id = controls
        variable.targets[0].data_path = f'["{property_name}"]'
    curve.driver.expression = expression
    return curve


def add_constraint_driver(constraint, controls, start_key, end_key, expression):
    try:
        constraint.driver_remove("offset_factor")
    except (TypeError, RuntimeError):
        pass
    curve = constraint.driver_add("offset_factor")
    for variable_name, property_name in (("start", start_key), ("end", end_key)):
        variable = curve.driver.variables.new()
        variable.name = variable_name
        variable.type = "SINGLE_PROP"
        variable.targets[0].id_type = "OBJECT"
        variable.targets[0].id = controls
        variable.targets[0].data_path = f'["{property_name}"]'
    curve.driver.expression = expression
    return curve


def setup_opening_drivers(controls, rig, calibration):
    start_key = "05 Opening Start (%)"
    end_key = "06 Opening End (%)"
    base_start = calibration["baseStartPercent"] * 0.01
    base_span = calibration["baseSpanPercent"]
    base_scale = calibration["baseRigScaleY"]
    base_offset = calibration["baseConstraintOffset"]
    scale_expression = (
        f"{base_scale:.12g}*max(end-start,{MINIMUM_SPAN_PERCENT:.12g})/"
        f"{base_span:.12g}"
    )
    offset_expression = (
        f"{base_offset:.12g}+(start*0.01)-"
        f"({base_start:.12g}*max(end-start,{MINIMUM_SPAN_PERCENT:.12g})/"
        f"{base_span:.12g})"
    )
    add_two_value_driver(rig, "scale", 1, controls, start_key, end_key, scale_expression)
    constraint = rig.constraints.get("ABS_DC_OPENING_RAIL")
    if constraint is None or constraint.type != "FOLLOW_PATH":
        raise RuntimeError("Opening Position has no camera-path constraint.")
    add_constraint_driver(constraint, controls, start_key, end_key, offset_expression)


def setup_landscape_drivers(controls, landscape, rig, calibration):
    start_key = "22 Landscape Start (%)"
    end_key = "23 Landscape End (%)"
    base_span = calibration["baseSpanPercent"]
    base_scale = calibration["baseObjectScaleY"]
    base_mid = calibration["baseMidPercent"] * 0.01
    base_offset = calibration["baseConstraintOffset"]
    scale_expression = (
        f"{base_scale:.12g}*"
        f"max(end-start,{MINIMUM_SPAN_PERCENT:.12g})/{base_span:.12g}"
    )
    offset_expression = (
        f"{base_offset:.12g}+((start+end)*0.005)-{base_mid:.12g}"
    )
    add_two_value_driver(
        landscape, "scale", 1, controls, start_key, end_key, scale_expression,
    )
    constraint = rig.constraints.get("ABS_DC_TERRAIN_RIG_RAIL")
    if constraint is None or constraint.type != "FOLLOW_PATH":
        raise RuntimeError("Landscape Position has no camera-path constraint.")
    add_constraint_driver(constraint, controls, start_key, end_key, offset_expression)


def replace_section_labels(controls):
    for key in list(controls.keys()):
        if "—" in str(key) or str(key).startswith("SECTION "):
            del controls[key]
    for key, value in SECTION_LABELS:
        controls[key] = value
        controls.id_properties_ui(key).update(
            description="Section label only. Controls follow below it.",
        )


def main():
    scene = bpy.context.scene
    controls = bpy.data.objects.get("About Controls")
    path = bpy.data.objects.get("Camera Path")
    opening = bpy.data.objects.get("Opening Field")
    opening_rig = bpy.data.objects.get("Opening Position")
    landscape = bpy.data.objects.get("Landscape")
    landscape_rig = bpy.data.objects.get("Landscape Position")
    required = (controls, path, opening, opening_rig, landscape, landscape_rig)
    if any(item is None for item in required):
        raise RuntimeError("The current About scene is missing a required control or geometry object.")

    samples, cumulative = path_polyline(path)
    opening_metadata = internal_data(opening_rig)
    landscape_metadata = internal_data(landscape_rig)
    opening_calibration = opening_metadata.get("abs_range_calibration")
    landscape_calibration = landscape_metadata.get("abs_range_calibration")
    if not opening_calibration:
        opening_start, opening_end = range_from_geometry(opening, samples, cumulative)
        opening_constraint = opening_rig.constraints["ABS_DC_OPENING_RAIL"]
        opening_calibration = {
            "baseStartPercent": opening_start,
            "baseEndPercent": opening_end,
            "baseSpanPercent": opening_end - opening_start,
            "baseRigScaleY": float(opening_rig.scale.y),
            "baseConstraintOffset": float(opening_constraint.offset_factor),
        }
    if not landscape_calibration:
        landscape_start, landscape_end = range_from_geometry(landscape, samples, cumulative)
        landscape_constraint = landscape_rig.constraints["ABS_DC_TERRAIN_RIG_RAIL"]
        landscape_calibration = {
            "baseStartPercent": landscape_start,
            "baseEndPercent": landscape_end,
            "baseSpanPercent": landscape_end - landscape_start,
            "baseMidPercent": (landscape_start + landscape_end) * 0.5,
            "baseObjectScaleY": float(landscape.scale.y),
            "baseConstraintOffset": float(landscape_constraint.offset_factor),
        }

    before = {
        "Opening Field": evaluated_bounds(opening),
        "Landscape": evaluated_bounds(landscape),
    }
    renames = {old: new for old, new, *_ in CONTROL_SPECS if old and old != new}
    current_values = {}
    for old_key, new_key, *_ in CONTROL_SPECS:
        if new_key in controls:
            current_values[new_key] = controls[new_key]
        elif old_key and old_key in controls:
            current_values[new_key] = controls[old_key]
    current_values.setdefault(
        "05 Opening Start (%)", opening_calibration["baseStartPercent"],
    )
    current_values.setdefault(
        "06 Opening End (%)", opening_calibration["baseEndPercent"],
    )
    current_values.setdefault(
        "22 Landscape Start (%)", landscape_calibration["baseStartPercent"],
    )
    current_values.setdefault(
        "23 Landscape End (%)", landscape_calibration["baseEndPercent"],
    )

    retargeted = retarget_control_drivers(controls, renames)
    for old_key, new_key, minimum, maximum, description in CONTROL_SPECS:
        if new_key not in current_values:
            raise RuntimeError(f"Cannot recover the current value for {new_key}.")
        add_control(
            controls, new_key, current_values[new_key], minimum, maximum, description,
        )
    for old_key in renames:
        if old_key in controls:
            del controls[old_key]
    for obsolete_key in OBSOLETE_CONTROL_KEYS:
        if obsolete_key in controls:
            del controls[obsolete_key]
    replace_section_labels(controls)

    setup_opening_drivers(controls, opening_rig, opening_calibration)
    setup_landscape_drivers(controls, landscape, landscape_rig, landscape_calibration)
    refresh(scene, (controls, opening, opening_rig, landscape, landscape_rig))

    after = {
        "Opening Field": evaluated_bounds(opening),
        "Landscape": evaluated_bounds(landscape),
    }
    max_baseline_delta = max(
        abs(after[name][index] - before[name][index])
        for name in before
        for index in range(len(before[name]))
    )
    if max_baseline_delta > 0.05:
        raise RuntimeError(
            f"Adding the range controls changed the baseline by {max_baseline_delta:.6f} WU."
        )

    opening_span_before = after["Opening Field"][3] - after["Opening Field"][2]
    landscape_span_before = after["Landscape"][3] - after["Landscape"][2]
    saved_values = {
        key: float(controls[key])
        for key in (
            "05 Opening Start (%)", "06 Opening End (%)",
            "22 Landscape Start (%)", "23 Landscape End (%)",
        )
    }
    try:
        controls["06 Opening End (%)"] = max(
            saved_values["05 Opening Start (%)"] + MINIMUM_SPAN_PERCENT,
            saved_values["06 Opening End (%)"] - 2.0,
        )
        controls["22 Landscape Start (%)"] = saved_values["22 Landscape Start (%)"] + 1.0
        controls["23 Landscape End (%)"] = saved_values["23 Landscape End (%)"] - 1.0
        refresh(scene, (controls, opening, opening_rig, landscape, landscape_rig))
        opening_test = evaluated_bounds(opening)
        landscape_test = evaluated_bounds(landscape)
        opening_span_test = opening_test[3] - opening_test[2]
        landscape_span_test = landscape_test[3] - landscape_test[2]
        if opening_span_test >= opening_span_before:
            raise RuntimeError("Opening End does not shorten the Opening Field.")
        if landscape_span_test >= landscape_span_before:
            raise RuntimeError("Landscape Start/End do not shorten the Landscape.")
    finally:
        for key, value in saved_values.items():
            controls[key] = value
        refresh(scene, (controls, opening, opening_rig, landscape, landscape_rig))

    for owner, calibration in (
        (opening_rig, opening_calibration),
        (landscape_rig, landscape_calibration),
    ):
        set_internal_values(owner, {
            "abs_range_control_contract": CONTRACT,
            "abs_range_calibration": calibration,
        })
    controls_metadata = internal_data(controls)
    controls_metadata.pop("terrain_progress", None)
    controls_metadata.update({
        "abs_authoring_control_contract": "master-about-controls/v3",
        "abs_authoring_control_count": sum(
            1 for _old, _new, _minimum, _maximum, _description in CONTROL_SPECS
        ),
        "opening_start_progress": float(controls["05 Opening Start (%)"]) * 0.01,
        "opening_end_progress": float(controls["06 Opening End (%)"]) * 0.01,
        "terrain_start_progress": float(controls["22 Landscape Start (%)"]) * 0.01,
        "terrain_end_progress": float(controls["23 Landscape End (%)"]) * 0.01,
    })
    controls[INTERNAL_KEY] = controls_metadata
    set_internal_values(scene, {
        "abs_authoring_control_contract": "master-about-controls/v3",
        "abs_opening_landscape_range_contract": CONTRACT,
    })
    set_internal_values(opening, {
        "abs_control_owner": "About Controls",
        "abs_range_control_contract": CONTRACT,
    })
    set_internal_values(landscape, {
        "abs_control_owner": "About Controls",
        "abs_range_control_contract": CONTRACT,
    })

    guide = bpy.data.texts.get("README - About Scene")
    if guide is not None:
        marker = "OPENING + LANDSCAPE RANGES\n"
        body = guide.as_string()
        if marker in body:
            body = body.split(marker, 1)[0].rstrip() + "\n\n"
        guide.clear()
        guide.write(body + marker + (
            "Select About Controls. Opening Field and Landscape each have Start (%)\n"
            "and End (%) controls. Moving both values translates the ecosystem; changing\n"
            "the distance between them changes its occupied camera-path length. Values\n"
            "closer than 0.25% resolve to a safe minimum span.\n"
        ))

    invalid_drivers = sum(
        not curve.is_valid
        for owner in driver_owners()
        for curve in owner.animation_data.drivers
    )
    if invalid_drivers:
        raise RuntimeError(f"The range migration left {invalid_drivers} invalid drivers.")

    print(json.dumps({
        "status": "ok",
        "contract": CONTRACT,
        "retargetedDriverVariables": retargeted,
        "baselinePreserved": True,
        "maxBaselineDeltaWU": round(max_baseline_delta, 6),
        "opening": {
            "startPercent": round(float(controls["05 Opening Start (%)"]), 6),
            "endPercent": round(float(controls["06 Opening End (%)"]), 6),
            "testShortened": True,
        },
        "landscape": {
            "startPercent": round(float(controls["22 Landscape Start (%)"]), 6),
            "endPercent": round(float(controls["23 Landscape End (%)"]), 6),
            "testShortened": True,
        },
        "authoringControlCount": 36,
        "invalidDrivers": invalid_drivers,
        "saved": False,
    }, indent=2))


if __name__ == "__main__":
    main()
