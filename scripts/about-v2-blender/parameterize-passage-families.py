#!/usr/bin/env python3
"""Replace repeated tunnel meshes with two live parametric passage objects.

Run after rebuild-about-director-cut.py and space-retained-early-scenes.py.
The script does not save.
"""

import json
import math
import zlib

import bpy


PATH_NAME = "ABS_PARAMETRIC_RIDE_PATH"
CONTROLS_NAME = "ABS_DIRECTOR_CUT_CONTROLS"
COLLECTION_NAME = "ABS_PARAMETRIC_PASSAGES"
ROUND_NAME = "ABS_PARAMETRIC_ROUND_TUNNEL"
SQUARE_NAME = "ABS_PARAMETRIC_SQUARE_GATE_TUNNEL"
ROUND_GROUP_NAME = "ABS_GN_PARAMETRIC_ROUND_TUNNEL"
SQUARE_GROUP_NAME = "ABS_GN_PARAMETRIC_SQUARE_GATE_TUNNEL"
PALETTE_MATERIALS = (
    "ABS_0_ATMOSPHERE",
    "ABS_1_STONE",
    "ABS_2_STEEL",
    "ABS_3_GLASS",
    "ABS_4_SIGNAL",
    "ABS_5_ORGANIC",
)


def ensure_control(controls, name, value, minimum, maximum, description):
    if name not in controls:
        controls[name] = value
    controls.id_properties_ui(name).update(
        min=minimum,
        max=maximum,
        soft_min=minimum,
        soft_max=maximum,
        description=description,
    )


def remove_control(controls, name):
    if name in controls:
        del controls[name]


def driver(owner, data_path, controls, variables, expression, index=None):
    try:
        owner.driver_remove(data_path) if index is None else owner.driver_remove(data_path, index)
    except (TypeError, RuntimeError):
        pass
    curve = owner.driver_add(data_path) if index is None else owner.driver_add(data_path, index)
    curve.driver.type = "SCRIPTED"
    curve.driver.expression = expression
    for variable_name, property_name in variables:
        variable = curve.driver.variables.new()
        variable.name = variable_name
        variable.type = "SINGLE_PROP"
        variable.targets[0].id_type = "OBJECT"
        variable.targets[0].id = controls
        variable.targets[0].data_path = f'["{property_name}"]'
    return curve


def reset_group(name):
    existing = bpy.data.node_groups.get(name)
    if existing is not None:
        bpy.data.node_groups.remove(existing, do_unlink=True)
    group = bpy.data.node_groups.new(name, "GeometryNodeTree")
    group.is_modifier = True
    group.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    output = group.nodes.new("NodeGroupOutput")
    output.name = "OUTPUT"
    return group, output


def remove_previous_passages(scene):
    controls = bpy.data.objects.get(CONTROLS_NAME)
    for selected in tuple(bpy.context.selected_objects):
        selected.select_set(False)
    if controls is not None:
        controls.select_set(True)
        bpy.context.view_layer.objects.active = controls
    for obj in list(scene.objects):
        model_id = str(obj.get("abs_model_id") or "")
        remove = (
            obj.name in {ROUND_NAME, SQUARE_NAME}
            or (model_id == "about.02" and obj.get("abs_geometry_kind") in {
                "curved-round-tunnel-hoop", "parametric-round-tunnel",
            })
            or (model_id == "about.04" and (
                obj.name.startswith("ABS_GATE_")
                or obj.get("abs_geometry_kind") in {"square-gate", "parametric-square-gate-tunnel"}
            ))
        )
        if not remove:
            continue
        data = obj.data if obj.type == "MESH" else None
        bpy.data.objects.remove(obj, do_unlink=True)
        if data is not None and data.users == 0:
            bpy.data.meshes.remove(data)


def ensure_collection(scene):
    collection = bpy.data.collections.get(COLLECTION_NAME)
    if collection is None:
        collection = bpy.data.collections.new(COLLECTION_NAME)
    if collection.name not in {child.name for child in scene.collection.children}:
        scene.collection.children.link(collection)
    return collection


def make_host(name, collection, group):
    mesh = bpy.data.meshes.new(f"{name}_HOST_MESH")
    host = bpy.data.objects.new(name, mesh)
    collection.objects.link(host)
    modifier = host.modifiers.new("Parametric passage geometry", "NODES")
    modifier.node_group = group
    for material_name in PALETTE_MATERIALS:
        material = bpy.data.materials.get(material_name)
        if material is None:
            raise RuntimeError(f"Missing semantic material {material_name}.")
        mesh.materials.append(material)
    return host


def set_semantics(host, model_id, object_id, geometry_kind, density, radius, count):
    windows = {
        "about.02": (3.48, 4.94, "portal-entry", "portal-exit"),
        "about.04": (14.2, 17.0, "gate-entry", "gate-exit"),
    }
    start, end, start_cue, end_cue = windows[model_id]
    values = {
        "abs_export": True,
        "abs_semantic_schema": 2,
        "abs_model_id": model_id,
        "abs_stage_id": model_id[-2:],
        "abs_density_group": model_id,
        "abs_object_id": object_id,
        "abs_role": "path-tunnel",
        "abs_motion_group": f"{model_id}.coherent",
        "abs_reveal_group": model_id,
        "abs_component_policy": "authored-instance-perimeter",
        "abs_feature_priority": 6.0,
        "abs_point_density": density,
        "abs_surfel_radius_scale": radius,
        "abs_sampling_mode": "uniform_surface",
        "abs_sampling_space": "WORLD",
        "abs_sampling_pattern": "surface-blue-noise",
        "abs_visibility_start_wu": start,
        "abs_visibility_end_wu": end,
        "abs_visibility_start_cue": start_cue,
        "abs_visibility_end_cue": end_cue,
        "abs_visibility_start_offset_wu": -0.3,
        "abs_visibility_end_offset_wu": 0.3,
        "abs_visibility_handoff_wu": 0.3,
        "abs_transition_mode": "overlap-fog-handoff",
        "abs_geometry_kind": geometry_kind,
        "abs_min_profile": "mobile",
        "abs_parameter_owner": CONTROLS_NAME,
        "abs_instance_count": count,
        "abs_parametric_family": True,
        "abs_palette_mode": "mixed",
        "abs_palette_seed": zlib.crc32(object_id.encode("utf-8")) & 0x7FFFFFFF,
    }
    for key, value in values.items():
        host[key] = value


def node(group, node_type, name):
    value = group.nodes.new(node_type)
    value.name = name
    value.label = name.replace("_", " ").title()
    return value


def link(group, source, source_socket, target, target_socket):
    group.links.new(source.outputs[source_socket], target.inputs[target_socket])


def add_material_cycle(group, geometry, island_index):
    modulo = node(group, "ShaderNodeMath", "PALETTE_MODULO")
    modulo.operation = "MODULO"
    modulo.inputs[1].default_value = float(len(PALETTE_MATERIALS))
    group.links.new(island_index, modulo.inputs[0])
    current = geometry
    for index, material_name in enumerate(PALETTE_MATERIALS):
        compare = node(group, "ShaderNodeMath", f"PALETTE_IS_{index}")
        compare.operation = "COMPARE"
        compare.inputs[1].default_value = float(index)
        compare.inputs[2].default_value = 0.1
        group.links.new(modulo.outputs[0], compare.inputs[0])
        assign = node(group, "GeometryNodeSetMaterial", f"MATERIAL_{index}")
        assign.inputs["Material"].default_value = bpy.data.materials[material_name]
        group.links.new(current, assign.inputs["Geometry"])
        group.links.new(compare.outputs[0], assign.inputs["Selection"])
        current = assign.outputs["Geometry"]
    return current


def build_path_points(group, path, controls, prefix, start_property, end_property, count_property):
    source = node(group, "GeometryNodeObjectInfo", f"{prefix}_PATH")
    source.transform_space = "ORIGINAL"
    source.inputs["Object"].default_value = path
    trim = node(group, "GeometryNodeTrimCurve", f"{prefix}_RANGE")
    trim.mode = "FACTOR"
    driver(trim.inputs["Start"], "default_value", controls, [("v", start_property)], "v")
    driver(trim.inputs["End"], "default_value", controls, [("v", end_property)], "v")
    points = node(group, "GeometryNodeCurveToPoints", f"{prefix}_POINTS")
    points.mode = "COUNT"
    driver(points.inputs["Count"], "default_value", controls, [("v", count_property)], "v")
    link(group, source, "Geometry", trim, "Curve")
    link(group, trim, "Curve", points, "Curve")
    return points


def build_round_group(path, controls):
    group, output = reset_group(ROUND_GROUP_NAME)
    points = build_path_points(
        group, path, controls, "ROUND",
        "round_tunnel_start_progress", "round_tunnel_end_progress", "round_tunnel_ring_count",
    )
    circle = node(group, "GeometryNodeCurvePrimitiveCircle", "ROUND_APERTURE")
    circle.mode = "RADIUS"
    circle.inputs["Resolution"].default_value = 40
    driver(
        circle.inputs["Radius"], "default_value", controls,
        [("radius", "round_tunnel_aperture_radius_wu"), ("rim", "round_tunnel_rim_wu")],
        "radius+rim*0.5",
    )
    profile = node(group, "GeometryNodeCurvePrimitiveCircle", "ROUND_RIM_PROFILE")
    profile.mode = "RADIUS"
    profile.inputs["Resolution"].default_value = 6
    driver(profile.inputs["Radius"], "default_value", controls, [("rim", "round_tunnel_rim_wu")], "rim*0.5")
    sweep = node(group, "GeometryNodeCurveToMesh", "ROUND_SWEEP")
    instance = node(group, "GeometryNodeInstanceOnPoints", "ROUND_INSTANCES")
    scale = node(group, "GeometryNodeScaleInstances", "ROUND_DEPTH")
    depth_scale = node(group, "ShaderNodeCombineXYZ", "ROUND_DEPTH_VECTOR")
    depth_scale.inputs["X"].default_value = 1.0
    depth_scale.inputs["Y"].default_value = 1.0
    driver(
        depth_scale.inputs["Z"], "default_value", controls,
        [("depth", "round_tunnel_half_depth_wu"), ("rim", "round_tunnel_rim_wu")],
        "max(0.05,depth/max(0.01,rim*0.5))",
    )
    realize = node(group, "GeometryNodeRealizeInstances", "ROUND_REALIZE")
    islands = node(group, "GeometryNodeInputMeshIsland", "ROUND_ISLANDS")
    link(group, circle, "Curve", sweep, "Curve")
    link(group, profile, "Curve", sweep, "Profile Curve")
    link(group, points, "Points", instance, "Points")
    link(group, points, "Rotation", instance, "Rotation")
    link(group, sweep, "Mesh", instance, "Instance")
    link(group, instance, "Instances", scale, "Instances")
    link(group, depth_scale, "Vector", scale, "Scale")
    link(group, scale, "Instances", realize, "Geometry")
    material_geometry = add_material_cycle(group, realize.outputs["Geometry"], islands.outputs["Island Index"])
    group.links.new(material_geometry, output.inputs["Geometry"])
    return group


def build_square_group(path, controls):
    group, output = reset_group(SQUARE_GROUP_NAME)
    points = build_path_points(
        group, path, controls, "SQUARE",
        "square_gate_start_progress", "square_gate_end_progress", "square_gate_count",
    )
    square = node(group, "GeometryNodeCurvePrimitiveQuadrilateral", "SQUARE_APERTURE")
    square.mode = "RECTANGLE"
    driver(
        square.inputs["Width"], "default_value", controls,
        [("half", "square_gate_half_width_wu"), ("rim", "square_gate_rim_wu")],
        "2*(half+rim*0.5)",
    )
    driver(
        square.inputs["Height"], "default_value", controls,
        [("half", "square_gate_half_height_wu"), ("rim", "square_gate_rim_wu")],
        "2*(half+rim*0.5)",
    )
    profile = node(group, "GeometryNodeCurvePrimitiveCircle", "SQUARE_RIM_PROFILE")
    profile.mode = "RADIUS"
    profile.inputs["Resolution"].default_value = 4
    driver(profile.inputs["Radius"], "default_value", controls, [("rim", "square_gate_rim_wu")], "rim*0.5")
    sweep = node(group, "GeometryNodeCurveToMesh", "SQUARE_SWEEP")
    instance = node(group, "GeometryNodeInstanceOnPoints", "SQUARE_INSTANCES")
    rotate = node(group, "GeometryNodeRotateInstances", "SQUARE_ROLL")
    rotate.inputs["Local Space"].default_value = True
    index = node(group, "GeometryNodeInputIndex", "SQUARE_INDEX")
    fraction = node(group, "ShaderNodeMath", "SQUARE_INDEX_FRACTION")
    fraction.operation = "DIVIDE"
    driver(
        fraction.inputs[1], "default_value", controls,
        [("count", "square_gate_count")], "max(1,count-1)",
    )
    angle = node(group, "ShaderNodeMath", "SQUARE_ROLL_ANGLE")
    angle.operation = "MULTIPLY"
    driver(
        angle.inputs[1], "default_value", controls,
        [("turns", "square_gate_roll_turns")], "2*pi*turns",
    )
    rotation = node(group, "ShaderNodeCombineXYZ", "SQUARE_ROLL_VECTOR")
    scale = node(group, "GeometryNodeScaleInstances", "SQUARE_DEPTH")
    depth_scale = node(group, "ShaderNodeCombineXYZ", "SQUARE_DEPTH_VECTOR")
    depth_scale.inputs["X"].default_value = 1.0
    depth_scale.inputs["Y"].default_value = 1.0
    driver(
        depth_scale.inputs["Z"], "default_value", controls,
        [("depth", "square_gate_half_depth_wu"), ("rim", "square_gate_rim_wu")],
        "max(0.05,depth/max(0.01,rim*0.5))",
    )
    realize = node(group, "GeometryNodeRealizeInstances", "SQUARE_REALIZE")
    islands = node(group, "GeometryNodeInputMeshIsland", "SQUARE_ISLANDS")
    link(group, square, "Curve", sweep, "Curve")
    link(group, profile, "Curve", sweep, "Profile Curve")
    link(group, points, "Points", instance, "Points")
    link(group, points, "Rotation", instance, "Rotation")
    link(group, sweep, "Mesh", instance, "Instance")
    link(group, instance, "Instances", rotate, "Instances")
    group.links.new(index.outputs["Index"], fraction.inputs[0])
    group.links.new(fraction.outputs[0], angle.inputs[0])
    group.links.new(angle.outputs[0], rotation.inputs["Z"])
    link(group, rotation, "Vector", rotate, "Rotation")
    link(group, rotate, "Instances", scale, "Instances")
    link(group, depth_scale, "Vector", scale, "Scale")
    link(group, scale, "Instances", realize, "Geometry")
    material_geometry = add_material_cycle(group, realize.outputs["Geometry"], islands.outputs["Island Index"])
    group.links.new(material_geometry, output.inputs["Geometry"])
    return group


def install_controls(controls):
    ensure_control(controls, "round_tunnel_ring_count", 28, 8, 40, "Number of generated round tunnel hoops.")
    ensure_control(controls, "round_tunnel_aperture_radius_wu", 7.38, 3.0, 24.0, "Clear radius of every round tunnel opening.")
    ensure_control(controls, "round_tunnel_rim_wu", 0.42, 0.15, 4.0, "Radial thickness of every round tunnel hoop.")
    ensure_control(controls, "round_tunnel_half_depth_wu", 0.22, 0.08, 4.0, "Half-depth of each round tunnel hoop along the rail.")
    ensure_control(controls, "square_gate_count", 16, 8, 24, "Number of generated square gates.")
    ensure_control(controls, "square_gate_half_width_wu", 7.6, 3.0, 28.0, "Clear half-width of every square gate.")
    ensure_control(controls, "square_gate_half_height_wu", 7.6, 3.0, 28.0, "Clear half-height of every square gate.")
    ensure_control(controls, "square_gate_rim_wu", 1.1, 0.2, 5.0, "Thickness of every square gate rim.")
    ensure_control(controls, "square_gate_half_depth_wu", 0.55, 0.1, 5.0, "Half-depth of every square gate along the rail.")
    for obsolete in (
        "round_tunnel_radius_scale", "round_tunnel_depth_scale",
        "square_gate_width_scale", "square_gate_height_scale", "square_gate_depth_scale",
    ):
        remove_control(controls, obsolete)


def bind_host_controls(host, controls, count_property, density_property, point_property, density, radius):
    driver(host, '["abs_instance_count"]', controls, [("v", count_property)], "v")
    host["abs_control_base_abs_point_density"] = density
    host["abs_control_base_abs_surfel_radius_scale"] = radius
    driver(host, '["abs_point_density"]', controls, [("v", density_property)], f"{density}*v")
    driver(host, '["abs_surfel_radius_scale"]', controls, [("v", point_property)], f"{radius}*v")


def prune_empty_abs_collections():
    removed = []
    changed = True
    while changed:
        changed = False
        for collection in list(bpy.data.collections):
            if not collection.name.startswith("ABS_") or collection.name == COLLECTION_NAME:
                continue
            if len(collection.objects) or len(collection.children):
                continue
            removed.append(collection.name)
            bpy.data.collections.remove(collection)
            changed = True
    return sorted(set(removed))


def update_guide():
    guide = bpy.data.texts.get("ABOUT_DIRECTOR_CUT_README")
    if guide is None:
        return
    marker = "PARAMETRIC PASSAGES\n"
    body = guide.as_string()
    if marker in body:
        body = body.split(marker, 1)[0].rstrip() + "\n\n"
    body += marker + (
        "ABS_PARAMETRIC_ROUND_TUNNEL generates every round hoop from the camera rail.\n"
        "ABS_PARAMETRIC_SQUARE_GATE_TUNNEL generates every square gate from the same rail.\n"
        "Use the round_tunnel_* and square_gate_* controls for count, range, aperture,\n"
        "rim, depth, roll, density and point size. The two Geometry Nodes objects replace\n"
        "44 separate tunnel meshes and update live when a control changes.\n"
    )
    guide.clear()
    guide.write(body)


def main():
    scene = bpy.context.scene
    path = bpy.data.objects.get(PATH_NAME)
    controls = bpy.data.objects.get(CONTROLS_NAME)
    if path is None or path.type != "CURVE" or controls is None:
        raise RuntimeError("The director-cut camera path and controls must exist first.")
    install_controls(controls)
    remove_previous_passages(scene)
    collection = ensure_collection(scene)
    round_group = build_round_group(path, controls)
    round_host = make_host(ROUND_NAME, collection, round_group)
    set_semantics(round_host, "about.02", "director.round-tunnel", "parametric-round-tunnel", 1.55, 1.12, 28)
    round_host["abs_aperture_radius_wu"] = 7.38
    round_host["abs_aperture_rim_wu"] = 0.42
    round_host["abs_aperture_half_depth_wu"] = 0.22
    bind_host_controls(round_host, controls, "round_tunnel_ring_count", "round_tunnel_density_scale", "round_tunnel_point_scale", 1.55, 1.12)

    square_group = build_square_group(path, controls)
    square_host = make_host(SQUARE_NAME, collection, square_group)
    set_semantics(square_host, "about.04", "director.square-gate-tunnel", "parametric-square-gate-tunnel", 1.7, 1.0, 16)
    square_host["abs_aperture_half_size"] = [7.6, 7.6]
    square_host["abs_aperture_rim_wu"] = 1.1
    square_host["abs_half_depth"] = 0.55
    square_host["abs_traversal_mode"] = "same-centreline-reversible"
    bind_host_controls(square_host, controls, "square_gate_count", "square_gate_density_scale", "square_gate_point_scale", 1.7, 1.0)

    removed_collections = prune_empty_abs_collections()
    update_guide()
    scene["abs_parametric_passage_contract"] = "two-live-geometry-node-families-on-camera-rail"
    current_frame = scene.frame_current
    controls.update_tag(refresh={"OBJECT"})
    refresh_frame = current_frame + 1 if current_frame < scene.frame_end else current_frame - 1
    scene.frame_set(refresh_frame)
    scene.frame_set(current_frame)
    bpy.context.view_layer.update()
    print(json.dumps({
        "status": "ok",
        "objects": [round_host.name, square_host.name],
        "roundCount": int(controls["round_tunnel_ring_count"]),
        "squareCount": int(controls["square_gate_count"]),
        "removedEmptyCollections": removed_collections,
        "saved": False,
    }))


if __name__ == "__main__":
    main()
