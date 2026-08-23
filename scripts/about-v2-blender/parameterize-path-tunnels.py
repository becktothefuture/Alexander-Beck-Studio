#!/usr/bin/env python3
"""Historical one-time migration from fixed hoop and gate repetitions.

Do not run this over the current cleaned About V2 source file. The live scene now uses
``ABS_PARAMETRIC_RIDE_PATH`` as the authoritative camera-location path and shares one
``ABS_GN_PATH_REPEATER`` group between two thin generator wrappers. The guard in
``main`` prevents this earlier migration from deleting that newer setup.
"""

import math

import bpy
from mathutils import Matrix, Vector


CAMERA_NAME = "ABS_CAMERA"
CAMERA_GUIDE_NAME = "ABS_PARAMETRIC_RIDE_PATH"
HOOP_GENERATOR_NAME = "GN_HOOP_TUNNEL"
GATE_GENERATOR_NAME = "GN_GATE_TUNNEL"
HOOP_GROUP_NAME = "ABS_GN_HOOP_TUNNEL"
GATE_GROUP_NAME = "ABS_GN_GATE_TUNNEL"
SHARED_GROUP_NAME = "ABS_GN_PATH_REPEATER"
MODULE_COLLECTION_NAME = "00_PARAMETRIC_MODULES"
GATE_VARIANT_COLLECTION_NAME = "ABS_GATE_MODULE_VARIANTS"
LEGACY_COLLECTION_NAME = "99_LEGACY_FIXED_TOPOLOGY"
GUIDE_COLLECTION_NAME = "ABS_GUIDES"
HOOP_COLLECTION_NAME = "02_HOOPS"
LOOP_COLLECTION_NAME = "04_LOOP"
SAMPLE_COUNT = 721

HOOP_START_DISTANCE = 44.174
HOOP_END_DISTANCE = 92.476
HOOP_COUNT = 12
GATE_START_DISTANCE = 151.212
GATE_END_DISTANCE = 282.025
# Five of the 22 legacy gate roots contained no mesh bars. Seventeen rendered gates
# retains the pre-existing visible count while exposing a clean, even distribution control.
GATE_COUNT = 17

MATERIAL_VARIANT_NAMES = (
    "ABS_0_ATMOSPHERE",
    "ABS_1_STONE",
    "ABS_2_STEEL",
    "ABS_3_GLASS",
    "ABS_4_SIGNAL",
    "ABS_5_ORGANIC",
)


def scene_root_collection(scene):
    return scene.collection


def get_or_create_collection(name, parent):
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
    if parent is not None and collection.name not in {child.name for child in parent.children}:
        parent.children.link(collection)
    return collection


def delete_object(name):
    obj = bpy.data.objects.get(name)
    if obj is not None:
        bpy.data.objects.remove(obj, do_unlink=True)


def delete_collection_and_contents(name):
    collection = bpy.data.collections.get(name)
    if collection is None:
        return
    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)


def remove_previous_generated_system():
    for name in (HOOP_GENERATOR_NAME, GATE_GENERATOR_NAME, CAMERA_GUIDE_NAME):
        delete_object(name)
    for name in (MODULE_COLLECTION_NAME,):
        delete_collection_and_contents(name)
    for name in (HOOP_GROUP_NAME, GATE_GROUP_NAME):
        group = bpy.data.node_groups.get(name)
        if group is not None:
            bpy.data.node_groups.remove(group)


def move_to_collection(obj, destination):
    if destination not in obj.users_collection:
        destination.objects.link(obj)
    for collection in list(obj.users_collection):
        if collection != destination:
            collection.objects.unlink(obj)


def prepare_legacy_topology(scene):
    legacy = get_or_create_collection(LEGACY_COLLECTION_NAME, scene_root_collection(scene))
    legacy["abs_note"] = (
        "Backup of the fixed hoop and gate topology. It is hidden and excluded from export; "
        "unhide only to compare against the parametric generators."
    )

    hoops = bpy.data.collections.get(HOOP_COLLECTION_NAME)
    loop = bpy.data.collections.get(LOOP_COLLECTION_NAME)
    if hoops is None or loop is None:
        raise RuntimeError("Expected About V2 hoop and loop collections are missing.")

    fixed_hoops = [
        obj for obj in list(hoops.objects)
        if obj.name.startswith("HOOP_") and obj.type == "MESH"
    ]
    fixed_gates = [
        obj for obj in list(loop.objects)
        if obj.name.startswith("GATE_")
    ]
    for obj in fixed_hoops + fixed_gates:
        move_to_collection(obj, legacy)
        obj.hide_render = True
        obj["abs_export"] = False
        obj["abs_legacy_reason"] = "Replaced by documented Geometry Nodes generator."

    legacy.hide_render = True
    legacy.hide_viewport = True
    return legacy


def first_matching_object(collection, prefix, object_type=None):
    candidates = sorted(collection.objects, key=lambda obj: obj.name)
    for obj in candidates:
        if not obj.name.startswith(prefix):
            continue
        if object_type is not None and obj.type != object_type:
            continue
        return obj
    raise RuntimeError(f"No {object_type or 'object'} beginning with {prefix!r} was found.")


def create_hoop_module(legacy, modules):
    source = first_matching_object(legacy, "HOOP_", "MESH")
    mesh = source.data.copy()
    scale = Matrix.Diagonal((*source.scale, 1.0))
    mesh.transform(scale)
    mesh.name = "ABS_HOOP_MODULE_MESH"
    obj = bpy.data.objects.new("ABS_HOOP_MODULE", mesh)
    modules.objects.link(obj)
    obj.matrix_world = Matrix.Identity(4)
    obj.hide_render = True
    obj["abs_export"] = False
    obj["abs_note"] = (
        "Single centred hoop profile used by GN_HOOP_TUNNEL. Local Z is the path direction; "
        "edit this mesh to change every generated hoop."
    )
    return obj


def gate_source_geometry(root):
    vertices = []
    faces = []
    root_inverse = root.matrix_world.inverted_safe()
    for child in sorted(root.children, key=lambda obj: obj.name):
        if child.type != "MESH":
            continue
        local_matrix = root_inverse @ child.matrix_world
        offset = len(vertices)
        vertices.extend(local_matrix @ vertex.co for vertex in child.data.vertices)
        faces.extend([
            [offset + index for index in polygon.vertices]
            for polygon in child.data.polygons
        ])
    if not vertices or not faces:
        raise RuntimeError(f"Gate source {root.name} has no mesh bars.")
    return vertices, faces


def create_gate_variant_modules(legacy, modules):
    variant_collection = get_or_create_collection(GATE_VARIANT_COLLECTION_NAME, modules)
    root = first_matching_object(legacy, "GATE_029", "EMPTY")
    vertices, faces = gate_source_geometry(root)
    variants = []
    for index, material_name in enumerate(MATERIAL_VARIANT_NAMES):
        material = bpy.data.materials.get(material_name)
        if material is None:
            raise RuntimeError(f"Missing expected gate material: {material_name}")
        mesh = bpy.data.meshes.new(f"ABS_GATE_MODULE_{index:02d}_MESH")
        mesh.from_pydata(vertices, [], faces)
        mesh.materials.append(material)
        for polygon in mesh.polygons:
            polygon.material_index = 0
        obj = bpy.data.objects.new(f"ABS_GATE_MODULE_{index:02d}_{material_name[6:]}", mesh)
        variant_collection.objects.link(obj)
        obj.matrix_world = Matrix.Identity(4)
        obj.hide_render = True
        obj["abs_export"] = False
        obj["abs_note"] = (
            "Centred square-frame profile used by GN_GATE_TUNNEL. Each variant has the "
            "same topology and a different existing scene material."
        )
        variants.append(obj)
    variant_collection.hide_render = True
    variant_collection.hide_viewport = True
    return variant_collection, len(variants)


def camera_sample_frames(scene):
    start = scene.frame_start
    span = scene.frame_end - scene.frame_start
    return [start + round(span * index / (SAMPLE_COUNT - 1)) for index in range(SAMPLE_COUNT)]


def signed_angle_around_axis(from_vector, to_vector, axis):
    return math.atan2(
        axis.dot(from_vector.cross(to_vector)),
        max(-1.0, min(1.0, from_vector.dot(to_vector))),
    )


def create_parametric_ride_path(scene, camera, guide_collection):
    frames = camera_sample_frames(scene)
    original_frame = scene.frame_current
    positions = []
    camera_ups = []
    try:
        for frame in frames:
            scene.frame_set(frame)
            evaluated = camera.evaluated_get(bpy.context.evaluated_depsgraph_get())
            matrix = evaluated.matrix_world.copy()
            positions.append(matrix.translation.copy())
            camera_ups.append((matrix.to_3x3() @ Vector((0.0, 1.0, 0.0))).normalized())
    finally:
        scene.frame_set(original_frame)

    curve = bpy.data.curves.new(CAMERA_GUIDE_NAME, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    # The sampled point tilt carries authored banking. Z_UP supplies a stable
    # neutral horizon and avoids Minimum-twist accumulation at the route end.
    curve.twist_mode = "Z_UP"
    curve.twist_smooth = 8
    # Keep this as curve data rather than a beveled mesh. Geometry Nodes must receive
    # one path spline, not the 8-sided viewport bevel profile as repeated instances.
    curve.bevel_depth = 0.0
    curve.bevel_resolution = 0
    spline = curve.splines.new("POLY")
    spline.points.add(len(positions) - 1)
    for index, (point, position, camera_up) in enumerate(zip(spline.points, positions, camera_ups)):
        point.co = (*position, 1.0)
        before = positions[max(0, index - 1)]
        after = positions[min(len(positions) - 1, index + 1)]
        tangent = (after - before).normalized()
        default_rotation = tangent.to_track_quat("Z", "Y")
        default_up = (default_rotation @ Vector((0.0, 1.0, 0.0))).normalized()
        target_up = camera_up - (tangent * camera_up.dot(tangent))
        if target_up.length_squared > 1e-8:
            point.tilt = signed_angle_around_axis(default_up, target_up.normalized(), tangent)
        else:
            point.tilt = 0.0

    guide_material = bpy.data.materials.get("ABS_CAMERA_PATH_GUIDE")
    if guide_material is not None:
        curve.materials.append(guide_material)
    obj = bpy.data.objects.new(CAMERA_GUIDE_NAME, curve)
    guide_collection.objects.link(obj)
    obj.hide_render = True
    obj["abs_export"] = False
    obj["abs_sample_count"] = SAMPLE_COUNT
    obj["abs_note"] = (
        "Generated from ABS_CAMERA location and up direction. Curve tilt carries the camera roll "
        "to Geometry Nodes. Re-run parameterize-path-tunnels.py after editing the camera action."
    )
    return obj


def add_socket(group, name, socket_type, default, description, minimum=None, maximum=None):
    socket = group.interface.new_socket(name=name, in_out="INPUT", socket_type=socket_type)
    socket.default_value = default
    socket.description = description
    if minimum is not None:
        socket.min_value = minimum
    if maximum is not None:
        socket.max_value = maximum
    return socket


def comment_frame(nodes, name, label, color, location):
    frame = nodes.new("NodeFrame")
    frame.name = name
    frame.label = label
    frame.label_size = 28
    frame.use_custom_color = True
    frame.color = color
    frame.location = location
    frame.shrink = True
    return frame


def label(node, text, frame, location):
    node.label = text
    node.parent = frame
    node.location = location
    return node


def build_tunnel_group(
    name,
    effect_label,
    path,
    profile_object=None,
    profile_collection=None,
    variant_count=1,
    defaults=None,
):
    defaults = defaults or {}
    group = bpy.data.node_groups.new(name, "GeometryNodeTree")
    group.description = (
        f"Parametric {effect_label}. Read the labelled frames left-to-right: choose a section of "
        "ABS_PARAMETRIC_RIDE_PATH, distribute instances, then add controlled local spin."
    )
    group["abs_read_me"] = (
        "Use the modifier inputs for the path range, count, scale and spin. The curve is sampled "
        "from ABS_CAMERA and stores camera roll as curve tilt. The final Realize Instances node is "
        "required so the website exporter receives evaluated mesh geometry."
    )
    geometry_output = group.interface.new_socket(
        name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry"
    )
    geometry_output.description = "Generated, realized mesh geometry for rendering and website export."
    path_socket = add_socket(
        group,
        "Path Guide",
        "NodeSocketObject",
        path,
        "Shared camera-aligned curve. Rebuild it from ABS_CAMERA after camera-action edits.",
    )
    if profile_object is not None:
        profile_socket = add_socket(
            group,
            "Profile Object",
            "NodeSocketObject",
            profile_object,
            "Centred mesh to instance. Its local Z axis is the path direction.",
        )
    else:
        profile_socket = add_socket(
            group,
            "Profile Variants",
            "NodeSocketCollection",
            profile_collection,
            "Material variants; instances cycle through their existing scene materials.",
        )
    start_socket = add_socket(
        group,
        "Start Distance (m)",
        "NodeSocketFloat",
        defaults["start"],
        "Distance along the shared guide at which this effect begins.",
        0.0,
        1000.0,
    )
    end_socket = add_socket(
        group,
        "End Distance (m)",
        "NodeSocketFloat",
        defaults["end"],
        "Distance along the shared guide at which this effect ends.",
        0.0,
        1000.0,
    )
    count_socket = add_socket(
        group,
        "Instance Count",
        "NodeSocketInt",
        defaults["count"],
        "Evenly distributed instances, including one at each trimmed path end.",
        1,
        256,
    )
    scale_socket = add_socket(
        group,
        "Uniform Scale",
        "NodeSocketFloat",
        1.0,
        "Uniform scale for every generated instance.",
        0.05,
        8.0,
    )
    base_spin_socket = add_socket(
        group,
        "Base Spin (degrees)",
        "NodeSocketFloat",
        defaults.get("base_spin", 0.0),
        "Rotates every instance around its local path axis. Circular hoops only show this if the profile is asymmetric.",
        -3600.0,
        3600.0,
    )
    per_instance_spin_socket = add_socket(
        group,
        "Spin Per Instance (degrees)",
        "NodeSocketFloat",
        defaults.get("per_instance_spin", 0.0),
        "Adds a progressive local twist from one instance to the next.",
        -720.0,
        720.0,
    )
    random_spin_socket = add_socket(
        group,
        "Random Spin (degrees)",
        "NodeSocketFloat",
        defaults.get("random_spin", 0.0),
        "Maximum deterministic plus-or-minus local spin variation.",
        0.0,
        360.0,
    )
    seed_socket = add_socket(
        group,
        "Random Seed",
        "NodeSocketInt",
        defaults.get("seed", 11),
        "Changes the deterministic rotation variation without changing count or path coverage.",
        0,
        100000,
    )

    nodes = group.nodes
    links = group.links
    group_input = nodes.new("NodeGroupInput")
    group_input.location = (-1000, 0)
    group_output = nodes.new("NodeGroupOutput")
    group_output.location = (940, 0)

    source_frame = comment_frame(
        nodes,
        "READ_ME_SOURCE",
        "1. SOURCE — the shared ride guide and one reusable profile",
        (0.18, 0.35, 0.72),
        (-1060, 180),
    )
    distribution_frame = comment_frame(
        nodes,
        "READ_ME_DISTRIBUTION",
        "2. DISTRIBUTION — trim to a distance range, then place an even count",
        (0.22, 0.60, 0.34),
        (-620, 180),
    )
    motion_frame = comment_frame(
        nodes,
        "READ_ME_ROTATION",
        "3. ROTATION — add a controlled local spin after camera-path alignment",
        (0.72, 0.40, 0.15),
        (0, 180),
    )
    export_frame = comment_frame(
        nodes,
        "READ_ME_EXPORT",
        "4. EXPORT — realize the instances so the website can sample the result",
        (0.65, 0.20, 0.35),
        (640, 180),
    )

    label(group_input, "Modifier controls — edit these first", source_frame, (0, 0))
    path_info = label(nodes.new("GeometryNodeObjectInfo"), "Read the camera-aligned path curve", source_frame, (220, 0))
    path_info.transform_space = "ORIGINAL"
    links.new(group_input.outputs[path_socket.identifier], path_info.inputs["Object"])

    trim = label(nodes.new("GeometryNodeTrimCurve"), "Keep only the chosen start/end distances", distribution_frame, (0, 0))
    trim.mode = "LENGTH"
    links.new(path_info.outputs["Geometry"], trim.inputs["Curve"])
    links.new(group_input.outputs[start_socket.identifier], trim.inputs[4])
    links.new(group_input.outputs[end_socket.identifier], trim.inputs[5])

    curve_to_points = label(nodes.new("GeometryNodeCurveToPoints"), "Create an even instance distribution and path rotation", distribution_frame, (250, 0))
    curve_to_points.mode = "COUNT"
    links.new(trim.outputs["Curve"], curve_to_points.inputs["Curve"])
    links.new(group_input.outputs[count_socket.identifier], curve_to_points.inputs["Count"])

    if profile_object is not None:
        profile_info = label(nodes.new("GeometryNodeObjectInfo"), "Use one reusable hoop profile", source_frame, (220, -220))
        profile_info.transform_space = "ORIGINAL"
        profile_info.inputs["As Instance"].default_value = True
        links.new(group_input.outputs[profile_socket.identifier], profile_info.inputs["Object"])
        profile_geometry = profile_info.outputs["Geometry"]
        profile_index = None
    else:
        profile_info = label(nodes.new("GeometryNodeCollectionInfo"), "Read six material variants as instances", source_frame, (220, -220))
        profile_info.inputs["Separate Children"].default_value = True
        profile_info.inputs["Reset Children"].default_value = True
        links.new(group_input.outputs[profile_socket.identifier], profile_info.inputs["Collection"])
        profile_geometry = profile_info.outputs["Instances"]
        index = label(nodes.new("GeometryNodeInputIndex"), "Instance index", motion_frame, (0, -260))
        modulo = label(nodes.new("ShaderNodeMath"), "Cycle through material variants", motion_frame, (170, -260))
        modulo.operation = "MODULO"
        modulo.inputs[1].default_value = float(variant_count)
        links.new(index.outputs["Index"], modulo.inputs[0])
        profile_index = modulo.outputs["Value"]

    instance = label(nodes.new("GeometryNodeInstanceOnPoints"), "Align the profile to each camera-path frame", motion_frame, (270, 0))
    links.new(curve_to_points.outputs["Points"], instance.inputs["Points"])
    links.new(profile_geometry, instance.inputs["Instance"])
    links.new(curve_to_points.outputs["Rotation"], instance.inputs["Rotation"])
    if profile_index is not None:
        instance.inputs["Pick Instance"].default_value = True
        links.new(profile_index, instance.inputs["Instance Index"])

    scale_vector = label(nodes.new("ShaderNodeCombineXYZ"), "Apply one predictable uniform scale", motion_frame, (270, -220))
    for input_name in ("X", "Y", "Z"):
        links.new(group_input.outputs[scale_socket.identifier], scale_vector.inputs[input_name])
    links.new(scale_vector.outputs["Vector"], instance.inputs["Scale"])

    index_for_spin = label(nodes.new("GeometryNodeInputIndex"), "Stable rotation index", motion_frame, (0, -500))
    progressive_spin = label(nodes.new("ShaderNodeMath"), "Index × spin per instance", motion_frame, (170, -500))
    progressive_spin.operation = "MULTIPLY"
    links.new(index_for_spin.outputs["Index"], progressive_spin.inputs[0])
    links.new(group_input.outputs[per_instance_spin_socket.identifier], progressive_spin.inputs[1])
    add_base_spin = label(nodes.new("ShaderNodeMath"), "Add base spin", motion_frame, (340, -500))
    add_base_spin.operation = "ADD"
    links.new(progressive_spin.outputs["Value"], add_base_spin.inputs[0])
    links.new(group_input.outputs[base_spin_socket.identifier], add_base_spin.inputs[1])
    invert_random = label(nodes.new("ShaderNodeMath"), "Make the random minimum negative", motion_frame, (340, -640))
    invert_random.operation = "MULTIPLY"
    invert_random.inputs[1].default_value = -1.0
    links.new(group_input.outputs[random_spin_socket.identifier], invert_random.inputs[0])
    random_value = label(nodes.new("FunctionNodeRandomValue"), "Deterministic plus-or-minus rotation variation", motion_frame, (510, -500))
    random_value.data_type = "FLOAT"
    links.new(invert_random.outputs["Value"], random_value.inputs[0])
    links.new(group_input.outputs[random_spin_socket.identifier], random_value.inputs[1])
    links.new(index_for_spin.outputs["Index"], random_value.inputs[7])
    links.new(group_input.outputs[seed_socket.identifier], random_value.inputs[8])
    total_spin = label(nodes.new("ShaderNodeMath"), "Add the variation", motion_frame, (680, -500))
    total_spin.operation = "ADD"
    links.new(add_base_spin.outputs["Value"], total_spin.inputs[0])
    links.new(random_value.outputs["Value"], total_spin.inputs[1])
    degrees_to_radians = label(nodes.new("ShaderNodeMath"), "Convert the user-friendly degrees to radians", motion_frame, (850, -500))
    degrees_to_radians.operation = "MULTIPLY"
    degrees_to_radians.inputs[1].default_value = math.pi / 180.0
    links.new(total_spin.outputs["Value"], degrees_to_radians.inputs[0])
    spin_vector = label(nodes.new("ShaderNodeCombineXYZ"), "Spin around the local path Z axis", motion_frame, (1020, -500))
    links.new(degrees_to_radians.outputs["Value"], spin_vector.inputs["Z"])
    rotate = label(nodes.new("GeometryNodeRotateInstances"), "Apply spin without breaking path alignment", motion_frame, (690, 0))
    rotate.inputs["Local Space"].default_value = True
    links.new(instance.outputs["Instances"], rotate.inputs["Instances"])
    links.new(spin_vector.outputs["Vector"], rotate.inputs["Rotation"])

    realize = label(nodes.new("GeometryNodeRealizeInstances"), "Convert instances to evaluated mesh geometry", export_frame, (0, 0))
    links.new(rotate.outputs["Instances"], realize.inputs["Geometry"])
    links.new(realize.outputs["Geometry"], group_output.inputs["Geometry"])
    label(group_output, "Final parametric tunnel geometry", export_frame, (230, 0))

    return group


def create_generator_object(name, collection, group, path, profile_or_variants, is_collection=False):
    mesh = bpy.data.meshes.new(f"{name}_ANCHOR_MESH")
    mesh.from_pydata([(0.0, 0.0, 0.0)], [], [])
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    modifier = obj.modifiers.new("ABS_PARAMETRIC_EFFECT", "NODES")
    modifier.node_group = group
    for socket in group.interface.items_tree:
        if socket.item_type != "SOCKET" or socket.in_out != "INPUT":
            continue
        if socket.name == "Path Guide":
            modifier[socket.identifier] = path
        elif socket.name in {"Profile Object", "Profile Variants"}:
            modifier[socket.identifier] = profile_or_variants
    obj["abs_export"] = True
    obj["abs_role"] = "parametric-path-effect"
    obj["abs_note"] = (
        "Edit the Geometry Nodes modifier inputs. The group contains a four-stage commented flow; "
        "the hidden fixed topology is available in 99_LEGACY_FIXED_TOPOLOGY for comparison."
    )
    return obj


def write_scene_readme():
    name = "PARAMETRIC_PATH_EFFECTS_README"
    existing = bpy.data.texts.get(name)
    if existing is not None:
        bpy.data.texts.remove(existing)
    text = bpy.data.texts.new(name)
    text.write(
        "Parametric path effects\n\n"
        "GN_HOOP_TUNNEL and GN_GATE_TUNNEL replace the old repeated meshes. Select either "
        "generator and edit its Geometry Nodes modifier inputs. Start/End Distance selects the "
        "part of the ride, Instance Count distributes it evenly, and the spin inputs rotate each "
        "instance around the path's local Z axis.\n\n"
        "Both generators read ABS_PARAMETRIC_RIDE_PATH. It is a 721-sample curve rebuilt from the "
        "keyframed ABS_CAMERA; each curve point carries camera roll as tilt. Curve to Points emits "
        "both positions and rotations, so the gates and hoops use the same local path frame.\n\n"
        "ABS_CAMERA remains the website source camera. After changing its keyframes, run "
        "scripts/about-v2-blender/parameterize-path-tunnels.py again to rebuild the guide and keep "
        "the effects aligned. Do not edit the baked guide instead of the camera unless you also intend "
        "to re-author the camera.\n\n"
        "99_LEGACY_FIXED_TOPOLOGY keeps the old objects hidden for comparison. The final Realize "
        "Instances node is intentional: the website exporter samples evaluated mesh geometry.\n"
    )


def main():
    scene = bpy.context.scene
    if (
        bpy.data.node_groups.get(SHARED_GROUP_NAME) is not None
        and bpy.data.collections.get(LEGACY_COLLECTION_NAME) is None
    ):
        raise RuntimeError(
            "The current About V2 scene already uses the authoritative ride path and "
            "shared repeater. Edit ABS_PARAMETRIC_RIDE_PATH and the generator modifiers "
            "directly; do not rerun this historical migration."
        )
    camera = bpy.data.objects.get(CAMERA_NAME)
    if camera is None or camera.type != "CAMERA":
        raise RuntimeError("ABS_CAMERA is required before parameterizing the path effects.")
    if scene.frame_end <= scene.frame_start:
        raise RuntimeError("The scene frame range is invalid.")

    remove_previous_generated_system()
    legacy = prepare_legacy_topology(scene)
    modules = get_or_create_collection(MODULE_COLLECTION_NAME, scene_root_collection(scene))
    modules["abs_note"] = "Hidden reusable meshes and material variants for the parametric tunnel generators."
    modules.hide_render = True
    modules.hide_viewport = True
    guide_collection = get_or_create_collection(GUIDE_COLLECTION_NAME, scene_root_collection(scene))
    path = create_parametric_ride_path(scene, camera, guide_collection)
    hoop_profile = create_hoop_module(legacy, modules)
    gate_variants, gate_variant_count = create_gate_variant_modules(legacy, modules)

    hoop_group = build_tunnel_group(
        HOOP_GROUP_NAME,
        "opening hoop tunnel",
        path,
        profile_object=hoop_profile,
        defaults={
            "start": HOOP_START_DISTANCE,
            "end": HOOP_END_DISTANCE,
            "count": HOOP_COUNT,
            "seed": 29,
        },
    )
    gate_group = build_tunnel_group(
        GATE_GROUP_NAME,
        "square-gate tunnel",
        path,
        profile_collection=gate_variants,
        variant_count=gate_variant_count,
        defaults={
            "start": GATE_START_DISTANCE,
            "end": GATE_END_DISTANCE,
            "count": GATE_COUNT,
            "seed": 41,
        },
    )
    hoop_collection = bpy.data.collections[HOOP_COLLECTION_NAME]
    loop_collection = bpy.data.collections[LOOP_COLLECTION_NAME]
    create_generator_object(HOOP_GENERATOR_NAME, hoop_collection, hoop_group, path, hoop_profile)
    create_generator_object(GATE_GENERATOR_NAME, loop_collection, gate_group, path, gate_variants, True)
    write_scene_readme()

    scene.frame_set(scene.frame_start)
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
    print({
        "status": "ok",
        "cameraGuide": CAMERA_GUIDE_NAME,
        "hoopGenerator": HOOP_GENERATOR_NAME,
        "gateGenerator": GATE_GENERATOR_NAME,
        "legacyCollection": LEGACY_COLLECTION_NAME,
        "hoopDefaults": [HOOP_START_DISTANCE, HOOP_END_DISTANCE, HOOP_COUNT],
        "gateDefaults": [GATE_START_DISTANCE, GATE_END_DISTANCE, GATE_COUNT],
    })


if __name__ == "__main__":
    main()
