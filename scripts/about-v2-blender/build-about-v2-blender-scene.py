#!/usr/bin/env python3
"""Build the current About V2 environment and website camera path in Blender."""

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector


AXIS_CONVERSION = Matrix((
    (1.0, 0.0, 0.0),
    (0.0, 0.0, -1.0),
    (0.0, 1.0, 0.0),
))
BEAT_COLLECTIONS = {
    "signal": "01_SIGNAL",
    "hoops": "02_HOOPS",
    "yard": "03_YARD",
    "loop": "04_LOOP",
    "ignition": "05_IGNITION",
    "living": "06_LIVING",
}
FORBIDDEN_BOTTOM_ROLES = {
    "continuous-deck",
    "continuous-rail",
    "track-ties",
    "signal-conduit",
    "ground-support",
}


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description="Build the About V2 Blender handoff scene.")
    parser.add_argument("--source", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--base-blend")
    parser.add_argument("--blend-file", default="about-v2-track-working.blend")
    parser.add_argument("--glb-file", default="about-v2-track-reference.glb")
    parser.add_argument("--manifest-file", default="about-v2-blender-manifest.json")
    parser.add_argument("--preview", action="store_true")
    return parser.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def site_vector(values):
    return AXIS_CONVERSION @ Vector(values)


def frame_matrix(frame, position=None):
    right = site_vector(frame["right"])
    up = site_vector(frame["up"])
    forward = site_vector(frame["forward"])
    origin = site_vector(position if position is not None else frame["position"])
    return Matrix((
        (right.x, up.x, forward.x, origin.x),
        (right.y, up.y, forward.y, origin.y),
        (right.z, up.z, forward.z, origin.z),
        (0.0, 0.0, 0.0, 1.0),
    ))


def local_to_site_world(frame, local):
    return [
        frame["position"][axis]
        + (frame["right"][axis] * local[0])
        + (frame["up"][axis] * local[1])
        + (frame["forward"][axis] * local[2])
        for axis in range(3)
    ]


def make_collection(name, parent):
    collection = bpy.data.collections.new(name)
    parent.children.link(collection)
    return collection


def get_or_make_collection(name, parent):
    collection = bpy.data.collections.get(name)
    if collection is None:
        return make_collection(name, parent)
    if collection.name not in {child.name for child in parent.children}:
        parent.children.link(collection)
    return collection


def remove_object(name):
    obj = bpy.data.objects.get(name)
    if obj is not None:
        bpy.data.objects.remove(obj, do_unlink=True)


def remove_collection(name):
    collection = bpy.data.collections.get(name)
    if collection is None:
        return
    for obj in list(collection.all_objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)


def link_object(obj, collection):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)


def hex_rgba(value):
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4)) + (1.0,)


def create_material(entry):
    name = f"ABS_{entry['slot']}_{entry['name'].upper()}"
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    color = hex_rgba(entry["color"])
    material.diffuse_color = color
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = color
        principled.inputs["Roughness"].default_value = 0.72
        if "Metallic" in principled.inputs:
            principled.inputs["Metallic"].default_value = 0.0
    material["abs_material_slot"] = entry["slot"]
    material["abs_css_token"] = entry["token"]
    return material


def assign_material(obj, material):
    if obj.type == "MESH":
        obj.data.materials.append(material)


def tag_object(obj, primitive=None, export=True):
    obj["abs_export"] = export
    if primitive:
        obj["abs_role"] = primitive.get("role", "")
        obj["abs_beat"] = primitive.get("beat", "")
        obj["abs_story_wu"] = primitive.get("runtimeWU", primitive.get("baseWU", 0))
        obj["abs_material_slot"] = primitive.get("material", 0)


def cube_mesh(name, dimensions):
    x, y, z = (value * 0.5 for value in dimensions)
    vertices = [
        (-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
        (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z),
    ]
    faces = [
        (0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1),
        (1, 5, 6, 2), (2, 6, 7, 3), (4, 0, 3, 7),
    ]
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    return bpy.data.objects.new(name, mesh)


def add_oriented_box(primitive, collection, materials, index):
    obj = cube_mesh(
        f"BOX_{index:03d}_{primitive['role']}",
        (primitive["sx"], primitive["sy"], primitive["sz"]),
    )
    collection.objects.link(obj)
    obj.matrix_world = frame_matrix({
        "position": primitive["center"],
        "right": primitive["right"],
        "up": primitive["up"],
        "forward": primitive["forward"],
    })
    assign_material(obj, materials[primitive["material"]])
    tag_object(obj, primitive)
    return [obj]


def add_beam(primitive, collection, materials, index):
    start = site_vector(primitive["from"])
    end = site_vector(primitive["to"])
    direction = end - start
    length = max(0.001, direction.length)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=10,
        radius=primitive["thickness"],
        depth=length,
        location=(start + end) * 0.5,
    )
    obj = bpy.context.object
    obj.name = f"BEAM_{index:03d}_{primitive['role']}"
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    link_object(obj, collection)
    assign_material(obj, materials[primitive["material"]])
    tag_object(obj, primitive)
    return [obj]


def add_torus(primitive, collection, materials, index):
    bpy.ops.mesh.primitive_torus_add(
        align="WORLD",
        major_segments=72,
        minor_segments=8,
        major_radius=(primitive["radiusX"] + primitive["radiusY"]) * 0.5,
        minor_radius=primitive["tube"],
    )
    obj = bpy.context.object
    obj.name = f"HOOP_{index:03d}_{primitive['role']}"
    obj.matrix_world = frame_matrix(primitive["frame"])
    link_object(obj, collection)
    cycle = primitive.get("materialCycle") or [primitive["material"]]
    for slot in cycle:
        obj.data.materials.append(materials[slot])
    if len(cycle) > 1:
        for polygon in obj.data.polygons:
            polygon.material_index = (polygon.index // 8) % len(cycle)
    tag_object(obj, primitive)
    return [obj]


def add_gate(primitive, collection, materials, index):
    root = bpy.data.objects.new(f"GATE_{index:03d}_{primitive['role']}", None)
    collection.objects.link(root)
    root.empty_display_type = "CUBE"
    root.empty_display_size = 0.32
    root.matrix_world = frame_matrix(primitive["frame"])
    tag_object(root, primitive)
    bars = [
        ("LEFT", (primitive["barX"], primitive["height"], primitive["depth"]),
         (-primitive["width"] * 0.5, primitive["floorY"] + (primitive["height"] * 0.5), 0)),
        ("RIGHT", (primitive["barX"], primitive["height"], primitive["depth"]),
         (primitive["width"] * 0.5, primitive["floorY"] + (primitive["height"] * 0.5), 0)),
        ("TOP", (primitive["width"], primitive["barY"], primitive["depth"]),
         (0, primitive["floorY"] + primitive["height"], 0)),
    ]
    if primitive.get("includeSill"):
        bars.append((
            "SILL",
            (primitive["width"], primitive["barY"], primitive["depth"]),
            (0, primitive["floorY"], 0),
        ))
    objects = [root]
    for part, dimensions, location in bars:
        obj = cube_mesh(f"{root.name}_{part}", dimensions)
        collection.objects.link(obj)
        obj.parent = root
        obj.location = location
        assign_material(obj, materials[primitive["material"]])
        tag_object(obj, primitive)
        objects.append(obj)
    return objects


def add_sphere(primitive, collection, materials, index):
    center = local_to_site_world(primitive["frame"], primitive["center"])
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1)
    obj = bpy.context.object
    obj.name = f"NODE_{index:03d}_{primitive['role']}"
    obj.matrix_world = frame_matrix(primitive["frame"], center)
    obj.scale = (primitive["rx"], primitive["ry"], primitive["rz"])
    link_object(obj, collection)
    assign_material(obj, materials[primitive["material"]])
    tag_object(obj, primitive)
    return [obj]


def animate_flow_control(control, start, end, frame_start, frame_end):
    control.location = start
    control.keyframe_insert(data_path="location", frame=frame_start)
    control.location = end
    control.keyframe_insert(data_path="location", frame=frame_end)
    set_linear_interpolation(control)


def add_ocean(ocean, collection, controls_collection, materials, timeline):
    columns = int(ocean["gridColumns"])
    rows = int(ocean["gridRows"])
    near_z = float(ocean["nearZ"])
    far_z = float(ocean["farZ"])
    base_y = float(ocean["baseY"])
    near_half_width = float(ocean["nearHalfWidth"])
    far_half_width = float(ocean["farHalfWidth"])
    depth = near_z - far_z
    vertices = []
    for row in range(rows):
        row_t = row / max(1, rows - 1)
        width_t = pow(row_t, 0.72)
        half_width = near_half_width + ((far_half_width - near_half_width) * width_t)
        site_z = near_z - (depth * row_t)
        for column in range(columns):
            column_t = column / max(1, columns - 1)
            site_x = ((column_t * 2.0) - 1.0) * half_width
            quiet_wave = math.sin((site_x * 0.11) + (site_z * 0.035)) * 0.025
            vertices.append(site_vector((site_x, base_y + quiet_wave, site_z)))

    faces = []
    for row in range(rows - 1):
        for column in range(columns - 1):
            near_left = (row * columns) + column
            near_right = near_left + 1
            far_left = near_left + columns
            far_right = far_left + 1
            faces.append((near_left, near_right, far_right, far_left))

    mesh = bpy.data.meshes.new("ABS_OCEAN_SURFACE_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("ABS_OCEAN_SURFACE", mesh)
    collection.objects.link(obj)
    for material in materials:
        mesh.materials.append(material)
    for polygon in mesh.polygons:
        row = polygon.index // max(1, columns - 1)
        column = polygon.index % max(1, columns - 1)
        polygon.material_index = (row * 3 + column * 5 + ((row + column) // 7)) % len(materials)
        polygon.use_smooth = True

    animation = ocean["animation"]
    amplitude = float(animation["amplitude"])
    speed = float(animation["speed"])
    chop = float(animation["chop"])
    flow_specs = [
        ("ABS_OCEAN_FLOW_PRIMARY", (0.0, 0.0, 0.0), (22.0 * speed, 76.0 * speed, 0.0)),
        ("ABS_OCEAN_FLOW_CROSS", (13.0, -7.0, 0.0), (-34.0 * speed, 41.0 * speed, 0.0)),
        ("ABS_OCEAN_FLOW_CHOP", (-9.0, 19.0, 0.0), (46.0 * speed, -29.0 * speed, 0.0)),
    ]
    controls = []
    for name, start, end in flow_specs:
        control = bpy.data.objects.new(name, None)
        controls_collection.objects.link(control)
        control.empty_display_type = "PLAIN_AXES"
        control.empty_display_size = 2.5
        control.hide_render = True
        control["abs_export"] = False
        control["abs_note"] = "Move this Empty to redirect the procedural ocean flow."
        animate_flow_control(
            control,
            start,
            end,
            timeline["frameStart"],
            timeline["frameEnd"],
        )
        controls.append(control)

    texture_specs = [
        ("ABS_OCEAN_SWELL", 13.0, 3, amplitude * 0.72, controls[0], "Z"),
        ("ABS_OCEAN_CROSS_WAVE", 5.2, 2, amplitude * 0.34, controls[1], "Z"),
        ("ABS_OCEAN_HORIZONTAL_CHOP", 8.5, 2, chop, controls[2], "X"),
    ]
    for name, scale, depth_value, strength, control, direction in texture_specs:
        texture = bpy.data.textures.new(name, type="CLOUDS")
        texture.noise_scale = scale
        texture.noise_depth = depth_value
        modifier = obj.modifiers.new(name, type="DISPLACE")
        modifier.texture = texture
        modifier.texture_coords = "OBJECT"
        modifier.texture_coords_object = control
        modifier.direction = direction
        modifier.mid_level = 0.5
        modifier.strength = strength

    ripple_origin = bpy.data.objects.new("ABS_EMAIL_RIPPLE_ORIGIN", None)
    controls_collection.objects.link(ripple_origin)
    ripple_origin.location = site_vector((0.0, base_y, near_z - 6.0))
    ripple_origin.empty_display_type = "CIRCLE"
    ripple_origin.empty_display_size = 5.0
    ripple_origin.hide_render = True
    ripple_origin["abs_export"] = False
    ripple_origin["abs_note"] = "Website email click ripple origin; enable ABS_EMAIL_CLICK_RIPPLE to preview."
    ripple = obj.modifiers.new("ABS_EMAIL_CLICK_RIPPLE", type="WAVE")
    ripple.use_x = True
    ripple.use_y = True
    ripple.use_normal = True
    ripple.height = float(animation["websiteClickImpulseHeight"])
    ripple.width = 9.0
    ripple.narrowness = 3.0
    ripple.speed = 0.38
    ripple.start_position_x = ripple_origin.location.x
    ripple.start_position_y = ripple_origin.location.y
    ripple.time_offset = -timeline["frameEnd"]
    ripple.lifetime = round(float(animation["websiteClickImpulseSeconds"]) * timeline["fps"])
    ripple.show_viewport = False
    ripple.show_render = False

    obj["abs_export"] = True
    obj["abs_role"] = "animated-ocean-reference"
    obj["abs_palette_policy"] = "All six current Home simulation colours; deterministic mixed faces."
    obj["abs_ocean_near_z"] = near_z
    obj["abs_ocean_far_z"] = far_z
    obj["abs_ocean_base_y"] = base_y
    obj["abs_ocean_fog_distance_scale"] = float(animation["fogDistanceScale"])
    obj["abs_ocean_splash_amount"] = float(animation["splashAmount"])
    obj["abs_ocean_splash_height"] = float(animation["splashHeight"])
    obj["abs_note"] = "Editable ocean reference. Runtime WebGL renders this as coloured points emerging from fog."
    return [obj]


def create_camera_path(samples, collection, guide_material):
    curve = bpy.data.curves.new("ABS_CAMERA_PATH", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = 0.035
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(samples) - 1)
    for point, sample in zip(spline.points, samples):
        position = site_vector(sample["position"])
        point.co = (position.x, position.y, position.z, 1.0)
    obj = bpy.data.objects.new("ABS_CAMERA_PATH", curve)
    collection.objects.link(obj)
    curve.materials.append(guide_material)
    obj.hide_render = True
    obj["abs_export"] = False
    obj["abs_note"] = "Invisible website camera choreography path; not bottom-track geometry."
    return obj


def convert_camera_quaternion(values):
    source = Quaternion((values[3], values[0], values[1], values[2]))
    return (AXIS_CONVERSION @ source.to_matrix()).to_quaternion()


def set_linear_interpolation(owner):
    action = owner.animation_data.action if owner.animation_data and owner.animation_data.action else None
    if not action:
        return
    for fcurve in action.fcurves:
        for keyframe in fcurve.keyframe_points:
            keyframe.interpolation = "LINEAR"


def create_camera(source, collection, scene):
    camera_data = bpy.data.cameras.new(source["name"])
    camera_data.sensor_fit = "HORIZONTAL"
    camera_data.sensor_width = 36.0
    camera_data.clip_start = source["clipStart"]
    camera_data.clip_end = source["clipEnd"]
    camera = bpy.data.objects.new(source["name"], camera_data)
    collection.objects.link(camera)
    camera.rotation_mode = "QUATERNION"
    camera["abs_export"] = True
    camera["abs_source"] = "Website About V2 Composer camera"
    camera["story_wu"] = 0.0
    scene.camera = camera
    frame_start = scene.frame_start
    frame_span = scene.frame_end - frame_start
    sample_count = len(source["samples"])
    for index, sample in enumerate(source["samples"]):
        amount = index / max(1, sample_count - 1)
        frame = frame_start + round(frame_span * amount)
        camera.location = site_vector(sample["position"])
        camera.rotation_quaternion = convert_camera_quaternion(sample["quaternion"])
        camera["story_wu"] = sample["storyWU"]
        fov_radians = math.radians(sample["fovDegrees"])
        camera_data.lens = (camera_data.sensor_width * 0.5) / math.tan(fov_radians * 0.5)
        camera.keyframe_insert(data_path="location", frame=frame)
        camera.keyframe_insert(data_path="rotation_quaternion", frame=frame)
        camera.keyframe_insert(data_path='["story_wu"]', frame=frame)
        camera_data.keyframe_insert(data_path="lens", frame=frame)
    set_linear_interpolation(camera)
    set_linear_interpolation(camera_data)
    return camera


def frame_from_wu(story_wu, timeline):
    amount = max(0.0, min(1.0, story_wu / timeline["storyDurationWU"]))
    return timeline["frameStart"] + round(
        (timeline["frameEnd"] - timeline["frameStart"]) * amount
    )


def create_markers(stages, timeline, scene):
    scene.timeline_markers.clear()
    for index, (name, stage) in enumerate(stages.items(), start=1):
        scene.timeline_markers.new(
            f"{index:02d}_{name.upper()}",
            frame=frame_from_wu(stage["startWU"], timeline),
        )


def setup_scene(scene, timeline):
    scene.frame_start = timeline["frameStart"]
    scene.frame_end = timeline["frameEnd"]
    scene.render.fps = timeline["fps"]
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.82, 0.82, 0.82)
    scene["abs_source"] = "About V2 live procedural world"
    scene["abs_duration_seconds"] = timeline["durationSeconds"]
    scene["abs_story_duration_wu"] = timeline["storyDurationWU"]
    scene["abs_axis_conversion"] = "website (x,y,z) -> Blender (x,-z,y)"


def add_lighting(collection):
    remove_object("ABS_PREVIEW_SUN")
    world = bpy.context.scene.world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (0.82, 0.82, 0.82, 1.0)
        background.inputs["Strength"].default_value = 0.8
    light_data = bpy.data.lights.new("ABS_PREVIEW_SUN", "SUN")
    light_data.energy = 1.2
    light_data.angle = math.radians(18)
    light = bpy.data.objects.new("ABS_PREVIEW_SUN", light_data)
    collection.objects.link(light)
    light.rotation_euler = (math.radians(32), math.radians(-18), math.radians(-24))
    light["abs_export"] = False


def object_bounds(objects):
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    for obj in objects:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            for axis in range(3):
                minimum[axis] = min(minimum[axis], point[axis])
                maximum[axis] = max(maximum[axis], point[axis])
    return [list(minimum), list(maximum)]


def export_glb(output_path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        if obj.name in bpy.context.scene.objects:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = next(obj for obj in objects if obj.type == "MESH")
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        use_selection=True,
        export_cameras=True,
        export_lights=False,
        export_animations=True,
        export_apply=True,
    )


def render_previews(output_dir, source, scene):
    preview_dir = output_dir / "previews"
    preview_dir.mkdir(parents=True, exist_ok=True)
    stages = source["world"]["stages"]
    moments = [
        ("01-opening", stages["signal"]["startWU"]),
        ("02-hoops", (stages["hoops"]["startWU"] + stages["hoops"]["endWU"]) * 0.5),
        ("03-loop", (stages["loop"]["startWU"] + stages["loop"]["endWU"]) * 0.5),
        ("04-living", (stages["living"]["startWU"] + stages["living"]["endWU"]) * 0.5),
        ("05-finale", source["timeline"]["storyDurationWU"]),
    ]
    for name, story_wu in moments:
        scene.frame_set(frame_from_wu(story_wu, source["timeline"]))
        scene.render.filepath = str(preview_dir / f"{name}.png")
        bpy.ops.render.render(write_still=True)


def add_scene_notes(source):
    current = bpy.data.texts.get("ABOUT_V2_HANDOFF_README")
    if current is not None:
        bpy.data.texts.remove(current)
    text = bpy.data.texts.new("ABOUT_V2_HANDOFF_README")
    text.write(
        "About V2 Blender handoff\n\n"
        "ABS_CAMERA is the exact resolved desktop website camera, retimed to two minutes.\n"
        "ABS_CAMERA_PATH is a visible editing guide and is excluded from rendering/export.\n"
        "07_OCEAN contains the editable terminal surface and lightweight wave modifiers.\n"
        "Toggle ABS_EMAIL_CLICK_RIPPLE in the ocean modifier stack to preview the contact click wave.\n"
        "There is intentionally no deck, rail, sleeper, conduit, or ground-support geometry.\n"
        "Website XYZ converts to Blender X,-Z,Y. One world unit equals one metre.\n"
        f"Source config SHA-256: {source['source']['configSha256']}\n"
    )


def main():
    args = parse_args()
    source_path = Path(args.source).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    source = json.loads(source_path.read_text(encoding="utf-8"))
    primitives = source["world"]["primitives"]
    if any(
        primitive.get("beat") == "rail" or primitive.get("role") in FORBIDDEN_BOTTOM_ROLES
        for primitive in primitives
    ):
        raise RuntimeError("Source contains removed bottom-track geometry.")

    if args.base_blend:
        base_blend = Path(args.base_blend).resolve()
        if not base_blend.exists():
            raise RuntimeError(f"Base Blend does not exist: {base_blend}")
        bpy.ops.wm.open_mainfile(filepath=str(base_blend))
        remove_collection("07_TERMINAL_BUST")
        remove_collection("07_OCEAN")
        remove_object("Plane")
        remove_object("ABS_CAMERA")
        remove_object("ABS_CAMERA_PATH")
    else:
        clear_scene()
    scene = bpy.context.scene
    setup_scene(scene, source["timeline"])
    root = scene.collection
    environment = get_or_make_collection("ABS_ENVIRONMENT", root)
    collections = {
        beat: get_or_make_collection(name, environment)
        for beat, name in BEAT_COLLECTIONS.items()
    }
    ocean_collection = make_collection("07_OCEAN", environment)
    camera_collection = get_or_make_collection("ABS_CAMERA_RIG", root)
    guide_collection = get_or_make_collection("ABS_GUIDES", root)
    light_collection = get_or_make_collection("ABS_PREVIEW_LIGHTS", root)
    materials = [create_material(entry) for entry in source["palette"]]
    guide_material = bpy.data.materials.new("ABS_CAMERA_PATH_GUIDE")
    guide_material.diffuse_color = (1.0, 0.08, 0.5, 1.0)

    export_objects = []
    builders = {
        "oriented-box": add_oriented_box,
        "beam": add_beam,
        "torus": add_torus,
        "gate": add_gate,
        "sphere": add_sphere,
    }
    if args.base_blend:
        for obj in scene.objects:
            collection_names = {collection.name for collection in obj.users_collection}
            if (
                obj.type == "MESH"
                and not obj.hide_render
                and obj.get("abs_export") is not False
                and not collection_names.intersection({"ABS_GUIDES", "ABS_PREVIEW_LIGHTS"})
            ):
                export_objects.append(obj)
    else:
        for index, primitive in enumerate(primitives):
            builder = builders.get(primitive["kind"])
            if not builder:
                raise RuntimeError(f"Unsupported primitive kind: {primitive['kind']}")
            collection = collections.get(primitive.get("beat"), environment)
            export_objects.extend(builder(primitive, collection, materials, index))

    export_objects.extend(add_ocean(
        source["world"]["ocean"],
        ocean_collection,
        guide_collection,
        materials,
        source["timeline"],
    ))
    create_camera_path(source["camera"]["samples"], guide_collection, guide_material)
    camera = create_camera(source["camera"], camera_collection, scene)
    export_objects.append(camera)
    create_markers(source["world"]["stages"], source["timeline"], scene)
    add_lighting(light_collection)
    add_scene_notes(source)
    bpy.context.view_layer.update()

    glb_path = output_dir / args.glb_file
    blend_path = output_dir / args.blend_file
    export_glb(glb_path, export_objects)
    if args.preview:
        render_previews(output_dir, source, scene)
    scene.frame_set(scene.frame_start)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    mesh_objects = [obj for obj in export_objects if obj.type == "MESH"]
    manifest = {
        "version": 2,
        "source": str(source_path),
        "blendFile": str(blend_path),
        "glbFile": str(glb_path),
        "primitiveCount": len(primitives),
        "meshObjectCount": len(mesh_objects),
        "vertices": sum(len(obj.data.vertices) for obj in mesh_objects),
        "polygons": sum(len(obj.data.polygons) for obj in mesh_objects),
        "cameraSamples": len(source["camera"]["samples"]),
        "frameRange": [scene.frame_start, scene.frame_end],
        "durationSeconds": source["timeline"]["durationSeconds"],
        "baseBlend": str(Path(args.base_blend).resolve()) if args.base_blend else None,
        "preservedAuthoredMeshObjects": len([
            obj for obj in mesh_objects if obj.name != "ABS_OCEAN_SURFACE"
        ]),
        "ocean": {
            "object": "ABS_OCEAN_SURFACE",
            "vertices": len(bpy.data.objects["ABS_OCEAN_SURFACE"].data.vertices),
            "faces": len(bpy.data.objects["ABS_OCEAN_SURFACE"].data.polygons),
            "modifierCount": len(bpy.data.objects["ABS_OCEAN_SURFACE"].modifiers),
            "paletteSlots": len(bpy.data.objects["ABS_OCEAN_SURFACE"].data.materials),
        },
        "bounds": object_bounds(mesh_objects),
        "forbiddenBottomTrackObjects": [
            obj.name for obj in export_objects
            if any(role in obj.name.lower() for role in ("continuous-rail", "track-ties", "ground-support"))
        ],
    }
    manifest_path = output_dir / args.manifest_file
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


main()
