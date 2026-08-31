#!/usr/bin/env python3
"""Apply the lens-free, stage-separated About V2 cinematic refinement.

This one-time recovery requires --restore-scene-identity and the hash-verified
pre-cinematic backup. Write a candidate first. Normal authoring edits the saved
canonical Blender scene directly; this script never rebuilds its route or replaces
the original Geometry Nodes systems.
"""

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


REPO_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_BLEND_PATH = (
    REPO_ROOT
    / "source-assets/about-v2-blender-current/about-v2-track-working.blend"
).resolve()
RECOVERY_BASELINE_PATH = (
    CANONICAL_BLEND_PATH.parent / "backups"
    / "about-v2-track-working.pre-cinematic-implementation-20260829-135523.blend"
).resolve()
RECOVERY_BASELINE_SHA256 = "cac7cc413abd481b582c3df5e1c566cb68569b7bd8eb1a778a5aea734f335b8f"

GATE_START_PROGRESS = 0.64
GATE_END_PROGRESS = 0.80
GATE_COUNT = 14
LATTICE_ENTRY_PROGRESS = 0.86
LATTICE_READING_PROGRESS = 0.96
FINALE_DECEL_PROGRESS = 0.975
CAMERA_LOCK_PROGRESS = 0.91
LATTICE_ANCHOR_PROGRESS = 0.99
LATTICE_FORWARD_OFFSET_WU = 50.0
LATTICE_FAR_CORRIDOR_FLARE_WU = 44.0
RECOVERY_LATTICE_FAR_CORRIDOR_FLARE_WU = 0.0
STORY_DURATION_WU = 22.0

# Lift the viewing axis slightly over the landscape so its horizon sits below
# the short title pair. The camera stays on its authored rail; the geometry is
# not displaced beyond the frustum to make room for copy.
CAMERA_COMPOSITION_PROFILE = (
    (0.000, 0.0, 0.0, "opening-centre"),
    (0.280, 0.0, 0.0, "round-centre"),
    (0.300, 0.0, 3.0, "canyon-compose"),
    (0.580, 0.0, 3.0, "canyon-hold"),
    (0.630, 0.0, 0.0, "gate-centre"),
    (1.000, 0.0, 0.0, "terminal-centre"),
)

STAGE_RANGES = {
    "00": [0.000, 0.095],
    "01": [0.075, 0.165],
    "02": [0.180, 0.280],
    "03": [0.310, 0.610],
    "04": [GATE_START_PROGRESS, GATE_END_PROGRESS],
    "05": [LATTICE_ENTRY_PROGRESS, 1.000],
}

MODEL_VISIBILITY_WINDOWS = {
    "GN_SIGNAL_APERTURE": (0.00, 1.96),
    "GN_SIGNAL_FIELD": (0.00, 1.96),
    "GN_NEBULA_FIELD": (1.60, 3.84),
    "GN_ROUND_PORTALS": (3.48, 4.94),
    "GN_RIBBON_CANYON": (4.58, 15.08),
    "GN_SQUARE_LOOP": (14.72, 16.18),
    # A destination, not a glimpse: the two banks stay visible as the camera
    # settles. Their authored nave must keep every closing title clear.
    "GN_RESPONSIVE_LATTICE": (15.82, 27.78),
}

MODEL_VISIBILITY_BINDINGS = {
    "GN_SIGNAL_APERTURE": ("opening", 0.0, "inciting-question", 0.18),
    "GN_SIGNAL_FIELD": ("opening", 0.0, "inciting-question", 0.18),
    "GN_NEBULA_FIELD": (
        "inciting-question", -0.18, "portal-entry", 0.18
    ),
    "GN_ROUND_PORTALS": (
        "portal-entry", -0.18, "portal-exit", 0.18
    ),
    "GN_RIBBON_CANYON": (
        "portal-exit", -0.18, "gate-entry", 0.18
    ),
    "GN_SQUARE_LOOP": (
        "gate-entry", -0.18, "gate-exit", 0.18
    ),
    "GN_RESPONSIVE_LATTICE": (
        "gate-exit", -0.18, "terminal-hold", 1.0
    ),
}

MODEL_VISIBILITY_HANDOFFS = {}

LATTICE_INPUTS = {
    "Lattice Width": 260.0,
    "Lattice Depth": 330.0,
    "Columns Across": 48,
    "Rows Deep": 42,
    "Corridor Width": 80.0,
    "Position Jitter": 0.8,
    "Strand Keep": 0.32,
    "Strand Thickness": 0.20,
    "Height Min": 10.0,
    "Height Max": 26.0,
    "Variation Seed": 47,
    "Wave Amplitude": 2.0,
    "Wave Length": 54.0,
    "Wave Speed": 0.18,
    "Response Delay": 0.12,
}

# Recovery starts from the verified original scene, not from the sparse candidate.
# Keep its height, strand population, width, thickness and sampling priorities.
# Only extend the existing destination ahead of the stopped camera and open the
# approved modest reading corridor. Do not carve a screen-sized density mask.
RECOVERY_LATTICE_INPUTS = {
    "Lattice Depth": 230.0,
    "Corridor Width": 50.0,
    "Wave Amplitude": 3.0,
}

POINT_FIELD_CLEARANCE_INPUTS = {
    "GN_SIGNAL_FIELD": {
        "Field Radius": 70.0,
        "Corridor Radius": 66.0,
        "Vertical Scale": 1.30,
    },
    "GN_NEBULA_FIELD": {
        "Field Radius": 68.0,
        "Corridor Radius": 40.0,
        "Vertical Scale": 1.40,
    },
}

PORTAL_CLEARANCE_INPUTS = {
    "GN_SIGNAL_APERTURE": {"Start Scale": 13.50, "End Scale": 13.50},
    "GN_ROUND_PORTALS": {
        "Instance Count": 8,
        "Start Scale": 1.65,
        "End Scale": 2.05,
    },
    "GN_SQUARE_LOOP": {"Start Scale": 1.55, "End Scale": 1.35},
}

# The camera and the generated forms share one authored rail. Keep threshold
# architecture aligned to that rail so the viewer actually travels through it.
# Copy clearance comes from each form's open centre, authored scale, bounded
# visibility window, and the browser's protected-copy gate—not by displacing an
# entire environment out of the camera frustum.
PORTAL_CLEARANCE_LOCATIONS = {
    "GN_SIGNAL_APERTURE": (0.0, 0.0, 0.0),
    "GN_ROUND_PORTALS": (0.0, 0.0, 0.0),
    "GN_SQUARE_LOOP": (0.0, 0.0, 0.0),
}

CANYON_EDITORIAL_NAVE_INNER_U = 0.30
CANYON_EDITORIAL_NAVE_OUTER_U = 0.55

EMBEDDED_README = """About V2 six-stage cinematic narrative world

This saved .blend is the authority for the website geometry, 17-point camera
route, sparse roll choreography, 65 degree horizontal FOV, semantic stage
boundaries, and export metadata.

The visible sequence is lens-free:
00 signal field and aperture
01 nebula
02 round portals
03 ribbon canyon
04 short 14-gate architectural twist with restrained camera bank
05 split lattice finale

Each GN_ generator carries semantic visibility cue properties. The website
resolves those cues against its responsive text journey. Environments remain
present through their related sections: portals before the personal background,
landscape through the disciplines, gates before the short method titles, and
tall lattice banks through the method and closing invitation. Adjacent stages
share a short handoff, with perspective and fog separating their depth. Do not
restore GN_LENS_CHAMBER or ABOUT_STAGE_06_LENS.

The final camera locks at journey progress 0.91 and remains stationary through
the invitation and terminal hold. Both split-lattice banks remain visible around
the protected central nave. The camera aims toward a fixed point beyond the
final corridor during its descent, rather than looking down the immediate rail
tangent and clipping the lattice into a corner. The original landscape viewing
axis and scene population are preserved. The closing corridor is a modest
44-world-unit opening with full-height banks, not a screen-space eraser.

Normal workflow: edit and save this scene, export a candidate asset set, validate
it in desktop and mobile motion, then export the public meta.json,
camera-track.json, and surfels.bin as one set. The refinement script is a recorded
recovery from the verified pre-cinematic backup, not a blanket edit of this scene.
The old full seven-stage builder is retired because it would recreate the removed
lens direction.
"""


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(
        description="Refine the About V2 gate, lattice, camera tail, and stage visibility.",
    )
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--overwrite-output", action="store_true")
    parser.add_argument("--allow-canonical-output", action="store_true")
    parser.add_argument("--restore-scene-identity", action="store_true")
    return parser.parse_args(argv)


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def resolve_output(args):
    output = Path(args.output_blend).expanduser()
    if not output.is_absolute():
        output = (Path.cwd() / output).resolve()
    else:
        output = output.resolve()
    if output.suffix.lower() != ".blend":
        raise RuntimeError("The refinement output must be a .blend file.")
    if output == RECOVERY_BASELINE_PATH:
        raise RuntimeError("The verified recovery baseline must never be overwritten.")
    if output == CANONICAL_BLEND_PATH and not args.allow_canonical_output:
        raise RuntimeError(
            "Refusing to overwrite the canonical Blender source without "
            "--allow-canonical-output. Validate a candidate first."
        )
    if output.exists() and not args.overwrite_output and output != Path(bpy.data.filepath).resolve():
        raise RuntimeError(f"Output already exists: {output}")
    forbidden = {
        REPO_ROOT,
        (REPO_ROOT / "source-assets").resolve(),
        (REPO_ROOT / "output").resolve(),
    }
    if output in forbidden:
        raise RuntimeError(f"Output path is too broad: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    return output


def require_object(name, object_type=None):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f"Required Blender object is missing: {name}")
    if object_type and obj.type != object_type:
        raise RuntimeError(f"{name} must be {object_type}, found {obj.type}.")
    return obj


def set_modifier_input(modifier, display_name, value):
    group = modifier.node_group
    if group is None:
        raise RuntimeError(f"{modifier.name} has no Geometry Nodes group.")
    for item in group.interface.items_tree:
        if (
            getattr(item, "item_type", None) == "SOCKET"
            and getattr(item, "in_out", None) == "INPUT"
            and item.name == display_name
        ):
            modifier[item.identifier] = value
            return item.identifier
    raise RuntimeError(f"{group.name} has no input {display_name!r}.")


def set_interface_maximum(group, display_name, maximum):
    for item in group.interface.items_tree:
        if (
            getattr(item, "item_type", None) == "SOCKET"
            and getattr(item, "in_out", None) == "INPUT"
            and item.name == display_name
        ):
            item.max_value = maximum
            return
    raise RuntimeError(f"{group.name} has no input {display_name!r}.")


def frame_for_progress(scene, progress):
    return round(scene.frame_start + progress * (scene.frame_end - scene.frame_start))


def timeline_progress_for_path(path_progress):
    """Map authored rail progress to the retimed camera-track timeline."""
    if path_progress <= GATE_END_PROGRESS:
        return path_progress
    final_path_span = 1.0 - GATE_END_PROGRESS
    final_time_span = CAMERA_LOCK_PROGRESS - GATE_END_PROGRESS
    return GATE_END_PROGRESS + (
        ((path_progress - GATE_END_PROGRESS) / final_path_span) * final_time_span
    )


def set_marker(scene, name, progress=None, frame=None):
    resolved_frame = frame if frame is not None else frame_for_progress(scene, progress)
    marker = scene.timeline_markers.get(name)
    if marker is None:
        marker = scene.timeline_markers.new(name, frame=resolved_frame)
    else:
        marker.frame = resolved_frame
    return marker


def remove_marker(scene, name):
    marker = scene.timeline_markers.get(name)
    if marker is not None:
        scene.timeline_markers.remove(marker)


def set_visibility_windows():
    for object_name, (start_wu, end_wu) in MODEL_VISIBILITY_WINDOWS.items():
        obj = require_object(object_name, "MESH")
        start_cue, start_offset_wu, end_cue, end_offset_wu = (
            MODEL_VISIBILITY_BINDINGS[object_name]
        )
        obj["abs_visibility_start_wu"] = float(start_wu)
        obj["abs_visibility_end_wu"] = float(end_wu)
        obj["abs_visibility_handoff_wu"] = MODEL_VISIBILITY_HANDOFFS.get(
            object_name, 0.18
        )
        obj["abs_visibility_start_cue"] = start_cue
        obj["abs_visibility_start_offset_wu"] = float(start_offset_wu)
        obj["abs_visibility_end_cue"] = end_cue
        obj["abs_visibility_end_offset_wu"] = float(end_offset_wu)
        obj["abs_transition_mode"] = "bounded-visibility-handoff"


def ensure_canyon_editorial_nave(canyon):
    modifier = canyon.modifiers.get("ABS_RIBBON_CANYON")
    if modifier is None or modifier.node_group is None:
        raise RuntimeError("GN_RIBBON_CANYON is missing its Geometry Nodes group.")
    group = modifier.node_group
    nodes = group.nodes
    links = group.links
    store = next(
        (node for node in nodes if node.label == "Store website dot density"),
        None,
    )
    u_attribute = next(
        (node for node in nodes if node.label == "Read abs_u"),
        None,
    )
    if store is None or u_attribute is None:
        raise RuntimeError("The canyon density or lateral-coordinate node is missing.")

    lateral_abs = nodes.get("ABS_EDITORIAL_LATERAL_ABS")
    if lateral_abs is None:
        lateral_abs = nodes.new("ShaderNodeMath")
        lateral_abs.name = "ABS_EDITORIAL_LATERAL_ABS"
        lateral_abs.label = "Measure editorial nave distance"
        lateral_abs.operation = "ABSOLUTE"
        lateral_abs.location = (1740, -860)
        links.new(u_attribute.outputs["Attribute"], lateral_abs.inputs[0])

    nave_mask = nodes.get("ABS_EDITORIAL_NAVE_MASK")
    if nave_mask is None:
        nave_mask = nodes.new("ShaderNodeMapRange")
        nave_mask.name = "ABS_EDITORIAL_NAVE_MASK"
        nave_mask.label = "Keep material outside editorial nave"
        nave_mask.clamp = True
        nave_mask.interpolation_type = "SMOOTHERSTEP"
        nave_mask.location = (1940, -760)
        links.new(lateral_abs.outputs[0], nave_mask.inputs["Value"])
    nave_mask.inputs["From Min"].default_value = CANYON_EDITORIAL_NAVE_INNER_U
    nave_mask.inputs["From Max"].default_value = CANYON_EDITORIAL_NAVE_OUTER_U
    nave_mask.inputs["To Min"].default_value = 0.0
    nave_mask.inputs["To Max"].default_value = 1.0

    density_multiply = nodes.get("ABS_EDITORIAL_NAVE_DENSITY")
    if density_multiply is None:
        current_link = store.inputs["Value"].links[0] if store.inputs["Value"].links else None
        if current_link is None:
            raise RuntimeError("The canyon density store has no authored density input.")
        density_source = current_link.from_socket
        links.remove(current_link)
        density_multiply = nodes.new("ShaderNodeMath")
        density_multiply.name = "ABS_EDITORIAL_NAVE_DENSITY"
        density_multiply.label = "Apply editorial nave to website density"
        density_multiply.operation = "MULTIPLY"
        density_multiply.location = (2140, -500)
        links.new(density_source, density_multiply.inputs[0])
        links.new(nave_mask.outputs["Result"], density_multiply.inputs[1])
        links.new(density_multiply.outputs[0], store.inputs["Value"])

    group["abs_editorial_nave_inner_u"] = CANYON_EDITORIAL_NAVE_INNER_U
    group["abs_editorial_nave_outer_u"] = CANYON_EDITORIAL_NAVE_OUTER_U


def refine_editorial_clearance():
    point_field_group = bpy.data.node_groups.get("ABS_GN_NARRATIVE_POINT_FIELD")
    if point_field_group is None:
        raise RuntimeError("ABS_GN_NARRATIVE_POINT_FIELD is missing.")
    set_interface_maximum(point_field_group, "Corridor Radius", 90.0)
    for object_name, inputs in POINT_FIELD_CLEARANCE_INPUTS.items():
        obj = require_object(object_name, "MESH")
        modifier = next((item for item in obj.modifiers if item.type == "NODES"), None)
        if modifier is None:
            raise RuntimeError(f"{object_name} has no Geometry Nodes modifier.")
        for name, value in inputs.items():
            set_modifier_input(modifier, name, value)
        obj["abs_copy_clearance_mode"] = "wide-route-shell"
        obj["abs_copy_clearance_radius_wu"] = inputs["Corridor Radius"]

    for object_name, inputs in PORTAL_CLEARANCE_INPUTS.items():
        obj = require_object(object_name, "MESH")
        modifier = obj.modifiers.get("ABS_PARAMETRIC_EFFECT")
        if modifier is None:
            raise RuntimeError(f"{object_name} is missing ABS_PARAMETRIC_EFFECT.")
        set_interface_maximum(modifier.node_group, "Start Scale", 20.0)
        set_interface_maximum(modifier.node_group, "End Scale", 20.0)
        for name, value in inputs.items():
            set_modifier_input(modifier, name, value)
        if "Instance Count" in inputs:
            obj["abs_instance_count"] = inputs["Instance Count"]
        obj.location = PORTAL_CLEARANCE_LOCATIONS[object_name]
        obj["abs_copy_clearance_mode"] = "camera-aligned-open-form"
        obj["abs_copy_clearance_scale"] = min(inputs.values())
        obj["abs_copy_clearance_location"] = json.dumps(list(obj.location))

    # Enlarging the entry aperture must not consume the shared surfel budget
    # merely because its surface area grew. Keep it a sparse opening frame.
    require_object("GN_SIGNAL_APERTURE", "MESH")["abs_point_density"] = 0.12

    square_controls = require_object("ABS_SQUARE_ROLLERCOASTER_CONTROLS", "EMPTY")
    square_controls["Gate Start Scale"] = PORTAL_CLEARANCE_INPUTS["GN_SQUARE_LOOP"]["Start Scale"]
    square_controls["Gate End Scale"] = PORTAL_CLEARANCE_INPUTS["GN_SQUARE_LOOP"]["End Scale"]

    canyon = require_object("GN_RIBBON_CANYON", "MESH")
    canyon_modifier = canyon.modifiers.get("ABS_RIBBON_CANYON")
    if canyon_modifier is None:
        raise RuntimeError("GN_RIBBON_CANYON is missing ABS_RIBBON_CANYON.")
    set_modifier_input(canyon_modifier, "Protected Corridor", 0.20)
    set_modifier_input(canyon_modifier, "Centre Relief", 0.0)
    ensure_canyon_editorial_nave(canyon)
    canyon["abs_copy_clearance_mode"] = "source-authored-lateral-density-nave"
    canyon["abs_copy_clearance_inner_u"] = CANYON_EDITORIAL_NAVE_INNER_U
    canyon["abs_copy_clearance_outer_u"] = CANYON_EDITORIAL_NAVE_OUTER_U


def author_source_documentation(scene):
    scene["abs_source"] = "About V2 six-stage lens-free cinematic narrative world"
    scene["abs_blender_authority"] = (
        "geometry,camera,roll,fov,semantic-parts,semantic-visibility,stage-boundaries"
    )
    scene["abs_narrative_contract"] = (
        "17-point-route,six-stages,continuous-environments,legible-copy,stationary-terminal-hold"
    )
    text = bpy.data.texts.get("ABOUT_PARAMETRIC_WORLD_README")
    if text is None:
        text = bpy.data.texts.new("ABOUT_PARAMETRIC_WORLD_README")
    text.clear()
    text.write(EMBEDDED_README)


def refine_gate(scene):
    gate = require_object("GN_SQUARE_LOOP", "MESH")
    modifier = gate.modifiers.get("ABS_PARAMETRIC_EFFECT")
    if modifier is None:
        raise RuntimeError("GN_SQUARE_LOOP is missing ABS_PARAMETRIC_EFFECT.")
    roll_per_shape = 360.0 / (GATE_COUNT - 1)
    for name, value in {
        "Start on Path (0-1)": GATE_START_PROGRESS,
        "End on Path (0-1)": GATE_END_PROGRESS,
        "Instance Count": GATE_COUNT,
        "Roll per Shape (degrees)": roll_per_shape,
    }.items():
        set_modifier_input(modifier, name, value)
    gate["abs_instance_count"] = GATE_COUNT
    gate["abs_camera_path_range"] = json.dumps([GATE_START_PROGRESS, GATE_END_PROGRESS])
    gate["abs_gate_clearance_after_progress"] = LATTICE_ENTRY_PROGRESS - GATE_END_PROGRESS
    gate["abs_alignment_policy"] = "short-gate-bank-level-exit"

    controls = require_object("ABS_SQUARE_ROLLERCOASTER_CONTROLS", "EMPTY")
    controls["Gate Count"] = GATE_COUNT
    controls["Gate Twist per Shape"] = roll_per_shape
    controls["abs_note"] = (
        "Short 0.64-0.80 square-gate chapter. Fourteen gates perform one complete "
        "turn and finish level before the split-lattice clearance."
    )

    controller = require_object("ABS_CAMERA_ROLL_DRIVER", "EMPTY")
    action = controller.animation_data.action if controller.animation_data else None
    if action is None:
        raise RuntimeError("ABS_CAMERA_ROLL_DRIVER has no camera action.")
    roll_curve = next(
        (curve for curve in action.fcurves if curve.data_path == '["abs_roll_degrees"]'),
        None,
    )
    if roll_curve is None:
        raise RuntimeError("The camera action has no abs_roll_degrees curve.")
    while roll_curve.keyframe_points:
        roll_curve.keyframe_points.remove(roll_curve.keyframe_points[0])

    round_profile = (
        (0.180, 0.0, "round-entry"),
        (0.214, -8.0, "round-left-bank"),
        (0.248, 8.0, "round-right-bank"),
        (0.280, 0.0, "round-exit"),
    )
    gate_profile = tuple(
        (
            GATE_START_PROGRESS
            + ((GATE_END_PROGRESS - GATE_START_PROGRESS) * factor),
            degrees,
            label,
        )
        for factor, degrees, label in (
            (0.00, 0.0, "square-entry"),
            (0.25, -6.0, "square-bank-left"),
            (0.50, 8.0, "square-bank-right"),
            (0.75, -4.0, "square-bank-settle"),
            (1.00, 0.0, "square-exit"),
        )
    )
    profile = []
    for progress, degrees, label in (*round_profile, *gate_profile):
        frame = frame_for_progress(scene, progress)
        key = roll_curve.keyframe_points.insert(frame, degrees)
        key.interpolation = "BEZIER"
        key.handle_left_type = "AUTO_CLAMPED"
        key.handle_right_type = "AUTO_CLAMPED"
        profile.append({
            "frame": frame,
            "progress": progress,
            "degrees": degrees,
            "label": label,
        })
    controller["abs_roll_profile"] = json.dumps(profile)
    controller["abs_note"] = (
        "Sparse round-bank keys plus a restrained 0.64-0.80 square-gate bank. The "
        "architecture performs the full twist while the camera protects a stable horizon."
    )

    for name in (
        "ABS_ROLL_QUARTER",
        "ABS_ROLL_HALF",
        "ABS_ROLL_THREE_QUARTER",
    ):
        remove_marker(scene, name)
    for name, factor in (
        ("ABS_ROLL_GATE_START", 0.00),
        ("ABS_GATE_BANK_LEFT", 0.25),
        ("ABS_GATE_BANK_RIGHT", 0.50),
        ("ABS_GATE_BANK_SETTLE", 0.75),
        ("ABS_ROLL_GATE_END", 1.00),
    ):
        set_marker(
            scene,
            name,
            GATE_START_PROGRESS
            + ((GATE_END_PROGRESS - GATE_START_PROGRESS) * factor),
        )
    set_marker(scene, "ABS_STAGE_04", GATE_START_PROGRESS)


def author_lattice_corridor_depth(group, depth, flare_width):
    """Open the distant banks without cropping the banks beside the camera.

    This is a real tapered empty corridor in the source mesh, not a screen-space
    mask. Its far opening protects the approach; its narrower near section keeps
    the destination in frame when the camera stops.
    """
    nodes = group.nodes
    links = group.links
    coordinates = next((node for node in nodes
                        if node.label == "Read lateral and longitudinal coordinates"), None)
    clearance = next((node for node in nodes
                      if node.bl_idname == "FunctionNodeCompare"
                      and node.operation == "LESS_THAN"), None)
    if coordinates is None or clearance is None or not clearance.inputs["B"].links:
        raise RuntimeError("The lattice's authored corridor nodes are missing.")
    frame = next((node for node in nodes
                  if node.type == "FRAME" and node.label == "Finale Corridor Depth"), None)
    if frame is None:
        frame = nodes.new("NodeFrame")
        frame.label = "Finale Corridor Depth"
        frame.location = (-140, -700)
    flare = next((node for node in nodes
                  if node.label == "Open the distant reading corridor"), None)
    if flare is None:
        flare = nodes.new("ShaderNodeMapRange")
        flare.label = "Open the distant reading corridor"
        flare.parent = frame
        flare.location = (0, 0)
        links.new(coordinates.outputs["Y"], flare.inputs["Value"])
    flare.clamp = True
    flare.interpolation_type = "LINEAR"
    flare.inputs["From Min"].default_value = -depth * 0.5
    flare.inputs["From Max"].default_value = depth * 0.5
    flare.inputs["To Min"].default_value = 0.0
    flare.inputs["To Max"].default_value = flare_width
    opening = next((node for node in nodes
                    if node.label == "Add depth to the near corridor"), None)
    if opening is None:
        authored_half_width = clearance.inputs["B"].links[0].from_socket
        opening = nodes.new("ShaderNodeMath")
        opening.label = "Add depth to the near corridor"
        opening.operation = "ADD"
        opening.parent = frame
        opening.location = (230, 0)
        links.new(authored_half_width, opening.inputs[0])
    links.new(flare.outputs["Result"], opening.inputs[1])
    links.new(opening.outputs[0], clearance.inputs["B"])
    group["abs_finale_far_corridor_flare_wu"] = flare_width


def refine_lattice(scene, restore_identity=False):
    lattice = require_object("GN_RESPONSIVE_LATTICE", "MESH")
    modifier = lattice.modifiers.get("ABS_RESPONSIVE_LATTICE")
    if modifier is None:
        raise RuntimeError("GN_RESPONSIVE_LATTICE is missing ABS_RESPONSIVE_LATTICE.")
    set_interface_maximum(modifier.node_group, "Lattice Width", 400.0)
    set_interface_maximum(modifier.node_group, "Lattice Depth", 400.0)
    set_interface_maximum(modifier.node_group, "Corridor Width", 180.0)
    inputs = RECOVERY_LATTICE_INPUTS if restore_identity else LATTICE_INPUTS
    for name, value in inputs.items():
        set_modifier_input(modifier, name, value)
    flare_width = (RECOVERY_LATTICE_FAR_CORRIDOR_FLARE_WU if restore_identity
                   else LATTICE_FAR_CORRIDOR_FLARE_WU)
    author_lattice_corridor_depth(modifier.node_group, inputs["Lattice Depth"], flare_width)
    # Keep the existing leading edge, but extend the destination ahead of the
    # locked camera. Widening a short field alone pushes the final banks away.
    lattice.location = (0.0, 0.0 if restore_identity else LATTICE_FORWARD_OFFSET_WU, 0.0)
    lattice["abs_geometry_kind"] = "split-lattice-finale"
    if not restore_identity:
        lattice["abs_point_density"] = 3.4
        lattice["abs_feature_priority"] = 1.0
        lattice["abs_surfel_radius_scale"] = 0.42
    lattice["abs_motion_subgroups"] = 24
    lattice["abs_finale_owner"] = True
    lattice["abs_finale_clear_corridor_wu"] = inputs["Corridor Width"]
    lattice["abs_finale_far_clear_corridor_wu"] = (
        inputs["Corridor Width"]
        + 2.0 * flare_width
    )
    lattice["abs_finale_bank_policy"] = "two-peripheral-banks-central-reading-nave"

    anchor = require_object("ABS_LATTICE_PATH_ANCHOR", "EMPTY")
    follow = anchor.constraints.get("ABS_MASTER_PATH_BINDING")
    if follow is None or follow.type != "FOLLOW_PATH":
        raise RuntimeError("ABS_LATTICE_PATH_ANCHOR is missing its path binding.")
    follow.offset_factor = LATTICE_ANCHOR_PROGRESS
    anchor["abs_path_progress"] = LATTICE_ANCHOR_PROGRESS
    anchor["abs_note"] = (
        "Terminal split-lattice anchor. The extended field surrounds the stopped camera "
        "while preserving the central reading nave."
    )

    split_entry_timeline = timeline_progress_for_path(LATTICE_ENTRY_PROGRESS)
    finale_decel_timeline = timeline_progress_for_path(FINALE_DECEL_PROGRESS)
    set_marker(scene, "ABS_STAGE_05", split_entry_timeline)
    set_marker(scene, "ABS_SPLIT_LATTICE_ENTRY", timeline_progress_for_path(LATTICE_READING_PROGRESS))
    set_marker(scene, "ABS_FINALE_DECEL", finale_decel_timeline)


def author_camera_composition(scene):
    target = require_object("ABS_CAMERA_LOOKAHEAD_TARGET", "EMPTY")
    if target.animation_data is None:
        target.animation_data_create()
    action = target.animation_data.action
    if action is None:
        action = bpy.data.actions.get("ABS_CAMERA_COMPOSITION_ACTION")
        if action is None:
            action = bpy.data.actions.new("ABS_CAMERA_COMPOSITION_ACTION")
        target.animation_data.action = action
    curves = []
    for axis in (0, 1):
        curve = next(
            (
                candidate
                for candidate in action.fcurves
                if candidate.data_path == "location" and candidate.array_index == axis
            ),
            None,
        )
        if curve is None:
            curve = action.fcurves.new(
                data_path="location",
                index=axis,
                action_group="ABS_CAMERA_COMPOSITION",
            )
        while curve.keyframe_points:
            curve.keyframe_points.remove(curve.keyframe_points[0])
        curves.append(curve)

    profile = []
    for progress, lateral, vertical, label in CAMERA_COMPOSITION_PROFILE:
        frame = frame_for_progress(scene, progress)
        for curve, value in zip(curves, (lateral, vertical)):
            key = curve.keyframe_points.insert(frame, value)
            key.interpolation = "BEZIER"
            key.handle_left_type = "AUTO_CLAMPED"
            key.handle_right_type = "AUTO_CLAMPED"
        profile.append({
            "frame": frame,
            "progress": progress,
            "lateral": lateral,
            "vertical": vertical,
            "label": label,
        })
    target.location = (0.0, 0.0, -10.0)
    target["abs_composition_offset_profile"] = json.dumps(profile)
    target["abs_composition_note"] = (
        "A restrained upward landscape aim places the horizon below the reading axis. "
        "Threshold architecture remains centred on the authored rail."
    )


def author_finale_aim(scene):
    """Look through the final corridor while the rail descends toward it."""
    target = require_object("ABS_CAMERA_LOOKAHEAD_TARGET", "EMPTY")
    follower = require_object("ABS_CAMERA_PATH_FOLLOWER", "EMPTY")
    camera = require_object("ABS_CAMERA", "CAMERA")
    constraint = follower.constraints.get("ABS_FINALE_AIM_BLEND")
    if constraint is not None:
        follower.constraints.remove(constraint)

    scene.frame_set(scene.frame_end)
    endpoint = camera.matrix_world.translation.copy()
    forward = camera.matrix_world.to_quaternion() @ Vector((0.0, 0.0, -1.0))
    aim = bpy.data.objects.get("ABS_CAMERA_FINALE_AIM")
    if aim is None:
        aim = bpy.data.objects.new("ABS_CAMERA_FINALE_AIM", None)
        target.users_collection[0].objects.link(aim)
    aim.location = endpoint + forward * 140.0
    aim.empty_display_type = "PLAIN_AXES"
    aim.empty_display_size = 3.0
    aim.hide_render = True
    aim["abs_export"] = False
    aim["abs_note"] = (
        "Fixed vanishing point beyond the final corridor. It keeps both lattice "
        "banks in view while the camera descends from the square gates."
    )

    # Blend viewing directions, not near/far target positions. A location blend
    # gives the distant target excessive leverage in its first few frames and
    # produces a visible snap even with smooth keyframe interpolation.
    constraint = follower.constraints.new("TRACK_TO")
    constraint.name = "ABS_FINALE_AIM_BLEND"
    constraint.target = aim
    constraint.track_axis = "TRACK_NEGATIVE_Z"
    constraint.up_axis = "UP_Y"
    constraint.use_target_z = False
    for progress, influence in (
        (0.0, 0.0),
        (GATE_END_PROGRESS, 0.0),
        (timeline_progress_for_path(LATTICE_ENTRY_PROGRESS), 1.0),
        (1.0, 1.0),
    ):
        constraint.influence = influence
        constraint.keyframe_insert("influence", frame=frame_for_progress(scene, progress))
    for curve in follower.animation_data.action.fcurves:
        if curve.data_path == 'constraints["ABS_FINALE_AIM_BLEND"].influence':
            for key in curve.keyframe_points:
                key.interpolation = "BEZIER"
                key.handle_left_type = "AUTO_CLAMPED"
                key.handle_right_type = "AUTO_CLAMPED"


def remove_lens(scene):
    lens = bpy.data.objects.get("GN_LENS_CHAMBER")
    if lens is not None:
        bpy.data.objects.remove(lens, do_unlink=True)
    anchor = bpy.data.objects.get("ABS_LENS_PATH_ANCHOR")
    if anchor is not None:
        bpy.data.objects.remove(anchor, do_unlink=True)
    collection = bpy.data.collections.get("ABOUT_STAGE_06_LENS")
    if collection is not None:
        if collection.objects:
            raise RuntimeError("ABOUT_STAGE_06_LENS still contains unrelated objects.")
        bpy.data.collections.remove(collection)
    mesh = bpy.data.meshes.get("GN_LENS_CHAMBER_ANCHOR_MESH")
    if mesh is not None and mesh.users == 0:
        bpy.data.meshes.remove(mesh)
    group = bpy.data.node_groups.get("ABS_GN_LENS_CHAMBER")
    if group is not None and group.users == 0:
        bpy.data.node_groups.remove(group)
    for marker_name in (
        "ABS_STAGE_06",
        "ABS_STAGE_06_LENS_CENTRE",
    ):
        remove_marker(scene, marker_name)


def author_terminal_hold(scene):
    controller = require_object("ABS_CAMERA_ROLL_DRIVER", "EMPTY")
    action = controller.animation_data.action if controller.animation_data else None
    if action is None:
        raise RuntimeError("ABS_CAMERA_ROLL_DRIVER has no camera action.")
    progress_curve = next(
        (curve for curve in action.fcurves if curve.data_path == '["abs_path_progress"]'),
        None,
    )
    if progress_curve is None:
        raise RuntimeError("The camera action has no abs_path_progress curve.")
    while progress_curve.keyframe_points:
        progress_curve.keyframe_points.remove(progress_curve.keyframe_points[0])
    lock_frame = frame_for_progress(scene, CAMERA_LOCK_PROGRESS)
    for frame, value in (
        (scene.frame_start, 0.0),
        (frame_for_progress(scene, GATE_END_PROGRESS), GATE_END_PROGRESS),
        (lock_frame, 1.0),
        (scene.frame_end, 1.0),
    ):
        key = progress_curve.keyframe_points.insert(frame, value)
        key.interpolation = "LINEAR"
    controller["abs_camera_lock_progress"] = CAMERA_LOCK_PROGRESS
    controller["abs_camera_tail_fraction"] = 1.0 - CAMERA_LOCK_PROGRESS
    set_marker(scene, "ABS_CAMERA_LOCK", CAMERA_LOCK_PROGRESS)
    set_marker(scene, "ABS_TERMINAL_FRAME", frame=scene.frame_end)


def author_passage_cues(scene):
    """Keep story cuts distinct from the camera's physical set boundaries."""
    for name, path_progress in (
        ("ABS_ROUND_PORTALS_EXIT", 0.285),
        ("ABS_ROUND_PORTALS_CLEAR", 0.3816),
        ("ABS_PERSONAL_ORIGIN", 0.40),
        ("ABS_TERRAIN_THESIS", 0.42),
        ("ABS_CANYON_CLEAR", 0.48),
        ("ABS_GATE_PASSAGE_CLEAR", 0.918),
        ("ABS_METHOD_RELEASE", 0.94),
        ("ABS_LATTICE_APPROACH", 0.95),
    ):
        set_marker(scene, name, timeline_progress_for_path(path_progress))


def validate_scene(scene):
    route = require_object("ABS_PARAMETRIC_RIDE_PATH", "CURVE")
    control_point_count = sum(
        len(spline.bezier_points) if spline.type == "BEZIER" else len(spline.points)
        for spline in route.data.splines
    )
    if control_point_count != 17:
        raise RuntimeError(f"Expected the saved 17-point route, found {control_point_count}.")
    if len(route.data.splines) != 1 or route.data.splines[0].use_cyclic_u:
        raise RuntimeError("The canonical ride path must remain one non-cyclic spline.")
    if any(abs(point.tilt) > 1e-7 for point in route.data.splines[0].bezier_points):
        raise RuntimeError("Ride-path point tilt must remain zero.")
    camera = require_object("ABS_CAMERA", "CAMERA")
    horizontal_fov = math.degrees(camera.data.angle_x)
    if abs(horizontal_fov - 65.0) > 0.001:
        raise RuntimeError(f"Horizontal FOV changed to {horizontal_fov:.6f} degrees.")
    if bpy.data.objects.get("GN_LENS_CHAMBER") is not None:
        raise RuntimeError("GN_LENS_CHAMBER was not removed.")
    if bpy.data.collections.get("ABOUT_STAGE_06_LENS") is not None:
        raise RuntimeError("ABOUT_STAGE_06_LENS was not removed.")
    for object_name in MODEL_VISIBILITY_WINDOWS:
        obj = require_object(object_name, "MESH")
        if not float(obj["abs_visibility_start_wu"]) < float(obj["abs_visibility_end_wu"]):
            raise RuntimeError(f"{object_name} has an invalid visibility window.")
        if not str(obj.get("abs_visibility_start_cue") or ""):
            raise RuntimeError(f"{object_name} has no semantic visibility start cue.")
        if not str(obj.get("abs_visibility_end_cue") or ""):
            raise RuntimeError(f"{object_name} has no semantic visibility end cue.")
    return {
        "routeControlPoints": control_point_count,
        "horizontalFov": round(horizontal_fov, 6),
        "models": len({
            str(obj.get("abs_model_id"))
            for obj in bpy.context.scene.objects
            if obj.type == "MESH" and obj.get("abs_model_id")
        }),
        "exportObjects": sum(
            1
            for obj in bpy.context.scene.objects
            if obj.type == "MESH" and obj.get("abs_model_id")
        ),
        "cameraLockFrame": frame_for_progress(scene, CAMERA_LOCK_PROGRESS),
        "terminalFrame": scene.frame_end,
    }


def main():
    args = parse_args()
    if not args.restore_scene_identity:
        raise RuntimeError(
            "The superseded sparse-scene refinement is retired. For the recorded "
            "recovery use --restore-scene-identity with the verified pre-cinematic "
            "backup. For normal authoring, edit the saved Blender scene and export it."
        )
    source = Path(bpy.data.filepath).resolve()
    expected_source = RECOVERY_BASELINE_PATH if args.restore_scene_identity else CANONICAL_BLEND_PATH
    if source != expected_source:
        raise RuntimeError(
            f"Open the intended saved source before refinement. Expected: {expected_source}; opened: {source}"
        )
    output = resolve_output(args)
    source_hash = sha256_file(source)
    if args.restore_scene_identity and source_hash != RECOVERY_BASELINE_SHA256:
        raise RuntimeError("The recovery baseline no longer matches its recorded source hash.")
    scene = bpy.context.scene

    refine_gate(scene)
    refine_lattice(scene, restore_identity=args.restore_scene_identity)
    if not args.restore_scene_identity:
        refine_editorial_clearance()
        author_camera_composition(scene)
    remove_lens(scene)
    set_visibility_windows()
    author_terminal_hold(scene)
    author_passage_cues(scene)
    author_finale_aim(scene)
    author_source_documentation(scene)

    scene["abs_narrative_world_version"] = 19 if args.restore_scene_identity else 18
    if args.restore_scene_identity:
        scene["abs_recovery_baseline_sha256"] = source_hash
        scene["abs_recovery_contract"] = (
            "original-fields-36-portals-terrain-camera-aim;14-short-gates;"
            "original-tall-lattice-extended-to-held-ending"
        )
    scene["abs_narrative_stage_ranges"] = json.dumps(STAGE_RANGES)
    scene["abs_visibility_windows_owner"] = (
        "Blender object story windows; runtime performs bounded GPU handoffs"
    )
    scene["abs_finale_contract"] = (
        "lens-free-split-lattice-central-reading-nave-stationary-camera-tail"
    )
    scene["abs_choreography"] = (
        "spaced-stages,short-square-gates,restrained-camera-bank,method-release,"
        "clear-handoff,split-lattice-finale,camera-lock"
    )
    scene["abs_copy_clearance_contract"] = (
        "original-spatial-composition,modest-lattice-corridor"
        if args.restore_scene_identity else
        "route-shells,camera-aligned-open-forms,lateral-canyon-nave,split-lattice-nave"
    )
    scene.frame_set(scene.frame_start)
    evidence = validate_scene(scene)
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    saved_hash = sha256_file(output)
    print(json.dumps({
        "status": "ok",
        "source": str(source),
        "sourceSha256": source_hash,
        "output": str(output),
        "outputSha256": saved_hash,
        "restoredSceneIdentity": args.restore_scene_identity,
        "stageRanges": STAGE_RANGES,
        "visibilityWindows": MODEL_VISIBILITY_WINDOWS,
        "visibilityBindings": MODEL_VISIBILITY_BINDINGS,
        "gateCount": GATE_COUNT,
        "latticeInputs": RECOVERY_LATTICE_INPUTS if args.restore_scene_identity else LATTICE_INPUTS,
        "pointFieldClearanceInputs": {} if args.restore_scene_identity else POINT_FIELD_CLEARANCE_INPUTS,
        "portalClearanceInputs": {} if args.restore_scene_identity else PORTAL_CLEARANCE_INPUTS,
        "portalClearanceLocations": {} if args.restore_scene_identity else PORTAL_CLEARANCE_LOCATIONS,
        "canyonEditorialNave": [
            CANYON_EDITORIAL_NAVE_INNER_U,
            CANYON_EDITORIAL_NAVE_OUTER_U,
        ] if not args.restore_scene_identity else None,
        **evidence,
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ABOUT_V2_STAGE_SEPARATION_ERROR={error}", file=sys.stderr)
        raise SystemExit(2) from error
