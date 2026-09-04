#!/usr/bin/env python3
"""Export the authored About Blender world as one progressive surfel scene."""

import argparse
import bisect
import hashlib
import json
import math
import re
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


SCHEMA = "about-point-scene"
SCHEMA_VERSION = 2
SURFEL_STRIDE_BYTES = 32
SURFEL_STRUCT = struct.Struct("<3f2hHHHHI4B")
RADIUS_STEP_WU = 0.0001
BEST_CANDIDATES_PER_SURFEL = 8
SURFEL_RADIUS_TO_SPACING = 0.56
ENVIRONMENT_DENSITY_WEIGHT = 0.10
PORTRAIT_MAX_VERTICAL_FOV_DEGREES = 115
DEFAULT_SURFEL_BUDGETS = {"mobile": 30000, "desktop": 90000, "master": 135000}
PROFILE_ORDER = ("mobile", "desktop", "master")
PROFILE_INDEX = {profile: index for index, profile in enumerate(PROFILE_ORDER)}
EXCLUDED_COLLECTIONS = {
    "00 CONTROLS", "01 CAMERA",
    "ABS_CAMERA_RIG", "ABS_GUIDES", "ABS_NARRATIVE_GUIDES", "ABS_PREVIEW_LIGHTS",
}
DEPRECATED_SCENE_COLLECTIONS = {
    "01_SIGNAL", "02_HOOPS", "03_YARD", "03A_ABSTRACT_FIELD", "04_LOOP",
    "05_IGNITION", "06_LIVING", "ABS_FLOATING_MODELS",
    "99_ABSTRACT_FIELD_REBUILD_BACKUP", "99_FLOATING_CUBE_BACKUP",
    "99_PRE_NARRATIVE_WORLD_BACKUP", "99_REMOVED_BOTTOM_TRACK_BACKUP",
    "99_REPLACED_FLOATING_PROPS_BACKUP",
}
REMOVED_GEOMETRY_PATTERN = re.compile(r"(?:^|[_-])(TRACK|RAIL|SLEEPER)(?:$|[_-])", re.I)
ABS_MATERIAL_ROLE_PATTERN = re.compile(r"^ABS_([0-5])_")
SITE_BASIS = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
PALETTE_ROLES = ("atmosphere", "stone", "steel", "glass", "signal", "organic")
ROLE_TO_PALETTE = {role: index for index, role in enumerate(PALETTE_ROLES)}
PALETTE_MODES = ("mixed", "single", "authored-faces")
INTERNAL_PROPERTY_KEYS = ("ABS Internal Data", "Internal Export Data")
SYSTEM_IDS = {
    "camera": "about.camera",
    "controls": "about.controls",
    "path": "about.camera-path",
}
FALLBACK_ROLE_BY_COLLECTION = {}
FALLBACK_PALETTE_BY_ROLE = {}
COMPONENT_POLICY_RULES = {
    "authored-instance-perimeter": {"mode": "all"},
    "authored-instance-angular-coverage": {"mode": "all"},
    "thin-feature-curvature": {"mode": "all"},
    "rail-cell-instance-coverage": {"mode": "all"},
    "continuous-outline-object-fallback": {"mode": "all"},
    "semantic-material-projected-feature": {
        "mode": "meaningful-area", "relativeFloor": 0.0015,
    },
    "semantic-object-projected-feature": {
        "mode": "meaningful-area", "relativeFloor": 0.0015,
    },
    "semantic-material-projected-coverage": {
        "mode": "meaningful-area", "relativeFloor": 0.0015,
    },
    "explicit-detail-projected-feature": {
        "mode": "meaningful-area", "relativeFloor": 0.0005,
    },
}
REPO_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_ASSET_DIR = (
    REPO_ROOT / "react-app/app/public/models/about-v2-edited-world"
).resolve()
SIMPLIFIED_CONTROL_SOURCES = {
    "camera_draw_start_wu": ("About Controls", "02 Fog Start", 1.0),
    "camera_draw_end_wu": ("About Controls", "03 Fog End", 1.0),
    "camera_fog_curve": ("About Controls", "04 Fog Curve", 1.0),
    "camera_horizontal_fov_degrees": ("About Controls", "01 Camera FOV", 1.0),
    "forms_body_count": ("About Controls", "05 Body Count", 1.0),
    "forms_start_progress": ("About Controls", "06 Bodies Start (%)", 0.01),
    "forms_end_progress": ("About Controls", "07 Bodies End (%)", 0.01),
    "forms_body_scale": ("About Controls", "08 Body Size", 1.0),
    "forms_lateral_spread": ("About Controls", "09 Body Spread", 1.0),
    "forms_vertical_spread": ("About Controls", "09 Body Spread", 1.0),
    "forms_rotation_turns": ("About Controls", "10 Body Rotation", 1.0),
    "round_tunnel_start_progress": ("Round Tunnel", "01 Start (%)", 0.01),
    "round_tunnel_end_progress": ("Round Tunnel", "02 End (%)", 0.01),
    "round_tunnel_ring_count": ("Round Tunnel", "03 Ring Count", 1.0),
    "round_tunnel_aperture_radius_wu": ("Round Tunnel", "04 Opening Radius", 1.0),
    "round_tunnel_rim_wu": ("Round Tunnel", "05 Ring Thickness", 1.0),
    "round_tunnel_half_depth_wu": ("Round Tunnel", "06 Ring Depth", 0.5),
    "square_gate_start_progress": ("Square Gates", "01 Start (%)", 0.01),
    "square_gate_end_progress": ("Square Gates", "02 End (%)", 0.01),
    "square_gate_count": ("Square Gates", "03 Gate Count", 1.0),
    "square_gate_half_width_wu": ("Square Gates", "04 Opening Size", 0.5),
    "square_gate_half_height_wu": ("Square Gates", "04 Opening Size", 0.5),
    "square_gate_rim_wu": ("Square Gates", "05 Frame Thickness", 1.0),
    "square_gate_half_depth_wu": ("Square Gates", "06 Gate Depth", 0.5),
    "square_gate_roll_turns": ("Square Gates", "07 Twist", 1.0),
    "terrain_progress": ("Landscape Position", "Position (%)", 0.01),
    "horizon_banks_progress": ("Horizon Position", "Position (%)", 0.01),
    "finale_progress": ("Finale Position", "Position (%)", 0.01),
}


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description="Export the About Blender surfel scene.")
    output_group = parser.add_mutually_exclusive_group(required=True)
    output_group.add_argument(
        "--output-dir",
        help="Explicit export directory. Canonical output requires --allow-canonical-output.",
    )
    output_group.add_argument(
        "--candidate-output-dir",
        help="Explicit candidate directory for validation before public asset promotion.",
    )
    parser.add_argument(
        "--allow-canonical-output",
        action="store_true",
        help="Explicitly permit writing directly to the canonical public asset directory.",
    )
    parser.add_argument(
        "--validate-output-only",
        action="store_true",
        help="Validate and report the output directory without exporting files.",
    )
    parser.add_argument("--slug", default="about-v2-edited-world")
    parser.add_argument("--low", "--mobile", dest="mobile", type=int)
    parser.add_argument("--medium", "--desktop", dest="desktop", type=int)
    parser.add_argument("--master", type=int)
    parser.add_argument("--seed", type=int, default=506832829)
    parser.add_argument(
        "--preserve-allocations-from",
        help="Candidate-only baseline meta.json whose object and profile budgets must remain fixed.",
    )
    return parser.parse_args(argv)


def hydrate_internal_properties(scene):
    """Expose saved internal metadata only in this unsaved export process."""
    for owner in [scene, *scene.objects]:
        for internal_key in INTERNAL_PROPERTY_KEYS:
            metadata = owner.get(internal_key)
            if metadata is None:
                continue
            for key, value in metadata.items():
                if key not in owner:
                    owner[key] = value

    controls = bpy.data.objects.get("About Controls")
    if controls is None:
        return
    for legacy_key, (owner_name, control_name, factor) in SIMPLIFIED_CONTROL_SOURCES.items():
        owner = bpy.data.objects.get(owner_name)
        if owner is not None and control_name in owner:
            controls[legacy_key] = float(owner[control_name]) * factor


def simplified_authoring_control_values(scene):
    values = {}
    seen = set()
    for owner_name, control_name, _ in SIMPLIFIED_CONTROL_SOURCES.values():
        pair = (owner_name, control_name)
        if pair in seen:
            continue
        seen.add(pair)
        owner = bpy.data.objects.get(owner_name)
        if owner is not None and control_name in owner:
            values[f"{owner_name} / {control_name}"] = round(float(owner[control_name]), 6)
    return dict(sorted(values.items()))


def resolve_export_output_dir(args):
    raw_output = args.candidate_output_dir or args.output_dir
    output_dir = Path(raw_output).expanduser()
    if not output_dir.is_absolute():
        output_dir = Path.cwd() / output_dir
    output_dir = output_dir.resolve()
    study_mode = args.preserve_allocations_from or bpy.context.scene.get("abs_terminal_study")
    if study_mode and (not args.candidate_output_dir or output_dir == CANONICAL_ASSET_DIR):
        raise RuntimeError("A terminal study must use a non-canonical candidate directory.")
    if output_dir == CANONICAL_ASSET_DIR and not args.allow_canonical_output:
        raise RuntimeError(
            "Refusing to overwrite canonical About V2 assets. Export to "
            "--candidate-output-dir first, or pass --allow-canonical-output explicitly."
        )
    forbidden_directories = {
        REPO_ROOT,
        (REPO_ROOT / "react-app/app/public").resolve(),
        (REPO_ROOT / "react-app/app/public/models").resolve(),
        (REPO_ROOT / "source-assets").resolve(),
    }
    if output_dir in forbidden_directories:
        raise RuntimeError(f"Export directory is too broad or source-owned: {output_dir}")
    return output_dir


def blender_to_site(vector):
    return Vector((vector.x, vector.z, -vector.y))


def finite_number(value, fallback=None):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return number if math.isfinite(number) else fallback


def resolve_surfel_budgets(scene, args):
    for profile_name, fallback in DEFAULT_SURFEL_BUDGETS.items():
        command_value = getattr(args, profile_name)
        scene_value = finite_number(scene.get(f"abs_surfel_{profile_name}_budget"))
        resolved = command_value if command_value is not None else scene_value
        setattr(args, profile_name, int(resolved if resolved is not None else fallback))


def resolve_model_budget_contract(scene, surfaces, args):
    raw = scene.get("abs_surfel_budgets")
    if not raw:
        return None
    try:
        contract = json.loads(str(raw))
    except json.JSONDecodeError as error:
        raise RuntimeError("Scene abs_surfel_budgets is invalid JSON.") from error
    model_keys = sorted({surface["modelKey"] for surface in surfaces})
    expected = set(model_keys)
    resolved = {}
    for profile_name in ("mobile", "desktop", "master"):
        profile = contract.get(profile_name)
        if not isinstance(profile, dict):
            raise RuntimeError(f"Missing saved {profile_name} model budgets.")
        counts = {key: profile.get(key) for key in model_keys}
        if (set(profile) - {"total"}) != expected:
            raise RuntimeError(f"Saved {profile_name} model budgets do not match exported models.")
        if any(not isinstance(value, int) or value <= 0 for value in counts.values()):
            raise RuntimeError(f"Saved {profile_name} model budgets must be positive integers.")
        expected_total = getattr(args, profile_name)
        if sum(counts.values()) != expected_total or profile.get("total") != expected_total:
            raise RuntimeError(f"Saved {profile_name} model budgets do not total {expected_total}.")
        resolved[profile_name] = counts
    for key in model_keys:
        if not (resolved["mobile"][key] <= resolved["desktop"][key] <= resolved["master"][key]):
            raise RuntimeError(f"Saved profile budgets for {key} are not nested.")
    return resolved


def semantic_string(value, fallback):
    value = str(value or "").strip()
    return value or fallback


def stable_u32(*parts):
    data = "\0".join(str(part) for part in parts).encode("utf-8")
    return int.from_bytes(hashlib.blake2s(data, digest_size=4).digest(), "little")


def stable_phase(*parts):
    return stable_u32(*parts) / 0x100000000


def radical_inverse(index, base):
    result = 0.0
    fraction = 1.0 / base
    while index:
        result += (index % base) * fraction
        index //= base
        fraction /= base
    return result


def portable_source_path(source_path):
    try:
        return source_path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return source_path.name


def rounded_vector(values):
    return [round(float(value), 6) for value in values]


def object_by_property(scene, property_name, value):
    matches = [obj for obj in scene.objects if str(obj.get(property_name) or "") == value]
    if len(matches) > 1:
        raise RuntimeError(f"More than one object uses {property_name}={value}.")
    return matches[0] if matches else None


def require_system_object(scene, system_key, expected_type=None):
    system_id = SYSTEM_IDS[system_key]
    obj = object_by_property(scene, "abs_system_id", system_id)
    if obj is None or (expected_type is not None and obj.type != expected_type):
        raise RuntimeError(f"The scene has no valid {system_id} object.")
    return obj


def export_object(scene, object_id):
    return object_by_property(scene, "abs_object_id", object_id)


def stable_object_identifier(obj):
    return str(obj.get("abs_system_id") or obj.get("abs_object_id") or obj.name)


def describe_route(scene):
    route = require_system_object(scene, "path", "CURVE")
    splines = []
    control_point_count = 0
    for spline in route.data.splines:
        points = []
        if spline.type == "BEZIER":
            for point in spline.bezier_points:
                points.append({
                    "co": rounded_vector(point.co),
                    "handleLeft": rounded_vector(point.handle_left),
                    "handleRight": rounded_vector(point.handle_right),
                    "tilt": round(float(point.tilt), 6),
                })
        else:
            for point in spline.points:
                points.append({
                    "co": rounded_vector(point.co[:3]),
                    "tilt": round(float(point.tilt), 6),
                })
        control_point_count += len(points)
        splines.append({
            "type": spline.type,
            "cyclic": bool(spline.use_cyclic_u),
            "points": points,
        })
    serialized_shape = json.dumps(splines, sort_keys=True, separators=(",", ":"))
    evaluated_length = sum(float(spline.calc_length()) for spline in route.data.splines)
    stage_ranges = None
    raw_stage_ranges = scene.get("abs_narrative_stage_ranges")
    if raw_stage_ranges:
        try:
            stage_ranges = json.loads(str(raw_stage_ranges))
        except json.JSONDecodeError as error:
            raise RuntimeError("Scene abs_narrative_stage_ranges is invalid JSON.") from error
    return {
        "object": stable_object_identifier(route),
        "displayName": route.name,
        "controlPointCount": control_point_count,
        "evaluatedLength": round(evaluated_length, 6),
        "shapeSha256": hashlib.sha256(serialized_shape.encode("utf-8")).hexdigest(),
        "splineCount": len(splines),
        "stageRanges": stage_ranges,
    }


def eligible_mesh_objects(scene):
    controls = require_system_object(scene, "controls")
    form_body_count = int(round(finite_number(
        controls.get("forms_body_count") if controls else None, 5,
    )))
    if not 4 <= form_body_count <= 6:
        raise RuntimeError("forms_body_count must be an integer from 4 to 6.")
    objects = []
    for obj in scene.objects:
        if obj.type != "MESH" or obj.hide_render or obj.get("abs_export") is False:
            continue
        collection_names = {collection.name for collection in obj.users_collection}
        if collection_names & EXCLUDED_COLLECTIONS or REMOVED_GEOMETRY_PATTERN.search(obj.name):
            continue
        form_index = finite_number(obj.get("abs_forms_body_index"))
        if str(obj.get("abs_model_id") or "") == "about.01" and form_index is not None:
            if int(round(form_index)) >= form_body_count:
                continue
        objects.append(obj)
    return sorted(objects, key=lambda item: (
        semantic_string(item.get("abs_model_id"), item.get("abs_density_group") or item.name),
        semantic_string(item.get("abs_object_id"), item.name),
    ))


def assert_clean_scene(scene):
    deprecated_collections = sorted(
        name for name in DEPRECATED_SCENE_COLLECTIONS if bpy.data.collections.get(name) is not None
    )
    deprecated_objects = sorted(
        obj.name for obj in scene.objects
        if obj.name.startswith("ARCHIVED_")
        or obj.get("abs_archive_reason")
        or obj.name in {"ABS_CAMERA_PATH", "ABS_BACKUP_RIDE_PATH_PRE_NARRATIVE"}
    )
    if deprecated_collections or deprecated_objects:
        raise RuntimeError(
            "The About Blender scene still contains deprecated infrastructure: "
            f"collections={deprecated_collections}, objects={deprecated_objects[:12]}"
        )


def fallback_role(collection_names):
    for collection_name in sorted(collection_names):
        if collection_name in FALLBACK_ROLE_BY_COLLECTION:
            return FALLBACK_ROLE_BY_COLLECTION[collection_name]
    return "floating-model"


def record_fallback(fallbacks, object_name, field, value):
    fallbacks.append({"object": object_name, "field": field, "value": value})


def object_semantics(obj, collection_names, fallbacks):
    role = str(obj.get("abs_role") or "").strip()
    if not role:
        role = fallback_role(collection_names)
        record_fallback(fallbacks, obj.name, "abs_role", role)
    model_key = str(obj.get("abs_model_id") or "").strip()
    if not model_key:
        model_key = semantic_string(obj.get("abs_density_group"), obj.name)
        record_fallback(fallbacks, obj.name, "abs_model_id", model_key)
    controls = require_system_object(bpy.context.scene, "controls")
    fade_wu = finite_number(controls.get("scene_visibility_fade_wu"), 0.3) if controls else 0.3
    if fade_wu is None or not 0.05 <= fade_wu <= 1.0:
        raise RuntimeError("about.controls has an invalid ecosystem visibility fade.")
    visibility_start_offset = finite_number(obj.get("abs_visibility_start_offset_wu"))
    visibility_end_offset = finite_number(obj.get("abs_visibility_end_offset_wu"))
    if visibility_start_offset is None:
        visibility_start_offset = 0.0 if model_key == "about.00" else -fade_wu
    if visibility_end_offset is None:
        visibility_end_offset = fade_wu
    object_key = str(obj.get("abs_object_id") or "").strip()
    if not object_key:
        object_key = obj.name
        record_fallback(fallbacks, obj.name, "abs_object_id", object_key)
    motion_key = str(obj.get("abs_motion_group") or "").strip()
    if not motion_key:
        motion_key = f"{model_key}.rigid"
        record_fallback(fallbacks, obj.name, "abs_motion_group", motion_key)
    motion_subgroups = max(1, int(round(finite_number(obj.get("abs_motion_subgroups"), 1))))
    if motion_subgroups > 64:
        raise RuntimeError(f"{obj.name} requests more than 64 coherent motion subgroups.")
    reveal_key = str(obj.get("abs_reveal_group") or "").strip()
    if not reveal_key:
        reveal_key = model_key
        record_fallback(fallbacks, obj.name, "abs_reveal_group", reveal_key)
    component_policy = str(obj.get("abs_component_policy") or "").strip()
    if not component_policy:
        raise RuntimeError(f"{obj.name} has no authored abs_component_policy.")
    if component_policy not in COMPONENT_POLICY_RULES:
        raise RuntimeError(
            f'{obj.name} uses unsupported abs_component_policy "{component_policy}".'
        )
    density_factor = finite_number(obj.get("abs_point_density"), 1.0)
    if density_factor is None or density_factor <= 0:
        raise RuntimeError(f"{obj.name} has invalid abs_point_density.")
    feature_priority = finite_number(obj.get("abs_feature_priority"), 1.0)
    if feature_priority is None or feature_priority <= 0:
        raise RuntimeError(f"{obj.name} has invalid abs_feature_priority.")
    radius_scale = finite_number(obj.get("abs_surfel_radius_scale"), 1.0)
    if radius_scale is None or radius_scale < 0.12 or radius_scale > 2.5:
        raise RuntimeError(f"{obj.name} has invalid abs_surfel_radius_scale.")
    manifestation_scale = (finite_number(obj['abs_manifestation_spread_scale'])
                           if 'abs_manifestation_spread_scale' in obj else 1.0)
    detail_scale = (finite_number(obj['abs_detail_bias_scale'])
                    if 'abs_detail_bias_scale' in obj else 1.0)
    if manifestation_scale is None or not 0.001 <= manifestation_scale <= 1:
        raise RuntimeError(f'{obj.name} has invalid abs_manifestation_spread_scale.')
    if detail_scale is None or not 0.2 <= detail_scale <= 2:
        raise RuntimeError(f'{obj.name} has invalid abs_detail_bias_scale.')
    minimum_profile = str(obj.get("abs_min_profile") or "mobile").strip().lower()
    if minimum_profile not in PROFILE_INDEX:
        raise RuntimeError(
            f'{obj.name} has unsupported abs_min_profile "{minimum_profile}".'
        )
    sampling_pattern = str(obj.get("abs_sampling_pattern") or "surface-blue-noise").strip()
    if sampling_pattern not in {"surface-blue-noise", "row-column-grid"}:
        raise RuntimeError(
            f'{obj.name} has unsupported abs_sampling_pattern "{sampling_pattern}".'
        )
    instance_count = max(1, int(round(finite_number(obj.get("abs_instance_count"), 1))))
    if controls and obj.get("abs_parametric_family"):
        count_property = {
            "parametric-round-tunnel": "round_tunnel_ring_count",
            "parametric-square-gate-tunnel": "square_gate_count",
        }.get(str(obj.get("abs_geometry_kind") or ""))
        if count_property:
            instance_count = max(1, int(round(finite_number(controls.get(count_property), instance_count))))
    palette_mode = str(obj.get("abs_palette_mode") or "").strip().lower()
    if palette_mode not in PALETTE_MODES:
        raise RuntimeError(
            f'{obj.name} needs abs_palette_mode set to one of {", ".join(PALETTE_MODES)}.'
        )
    palette_role = str(obj.get("abs_palette_role") or "").strip().lower()
    if palette_mode == "single":
        if palette_role not in ROLE_TO_PALETTE:
            raise RuntimeError(
                f'{obj.name} uses single palette mode without a valid abs_palette_role.'
            )
    elif palette_role:
        raise RuntimeError(
            f'{obj.name} has abs_palette_role but its abs_palette_mode is {palette_mode}.'
        )
    palette_seed = finite_number(obj.get("abs_palette_seed"))
    if palette_seed is None or palette_seed != round(palette_seed) \
            or not 0 <= palette_seed <= 0x7FFFFFFF:
        raise RuntimeError(f"{obj.name} needs an integer abs_palette_seed from 0 to 2147483647.")
    return {
        "role": role,
        "modelKey": model_key,
        "objectKey": object_key,
        "motionKey": motion_key,
        "motionSubgroups": motion_subgroups,
        "material": {"manifestationSpreadScale": manifestation_scale, "detailBiasScale": detail_scale},
        "minimumProfile": minimum_profile,
        "revealKey": reveal_key,
        "componentPolicy": component_policy,
        "densityGroup": semantic_string(obj.get("abs_density_group"), model_key),
        "densityFactor": density_factor,
        "samplingDensityAttribute": str(
            obj.get("abs_sampling_density_attribute") or ""
        ).strip() or None,
        "samplingPattern": sampling_pattern,
        "visibilityStartWU": finite_number(obj.get("abs_visibility_start_wu")),
        "visibilityEndWU": finite_number(obj.get("abs_visibility_end_wu")),
        "visibilityHandoffWU": fade_wu,
        "visibilityStartCue": semantic_string(
            obj.get("abs_visibility_start_cue"), ""
        ) or None,
        "visibilityStartOffsetWU": visibility_start_offset,
        "visibilityEndCue": semantic_string(
            obj.get("abs_visibility_end_cue"), ""
        ) or None,
        "visibilityEndOffsetWU": visibility_end_offset,
        "preserveMinPx": finite_number(obj.get("abs_preserve_min_px")),
        "featurePriority": feature_priority,
        "surfelRadiusScale": radius_scale,
        "geometryKind": str(obj.get("abs_geometry_kind") or "").strip() or None,
        "cameraPassFrame": finite_number(obj.get("abs_camera_pass_frame")),
        "cameraClearanceWU": finite_number(obj.get("abs_camera_clearance_wu")),
        "proximityRole": str(obj.get("abs_proximity_role") or "").strip() or None,
        "traversalMode": str(obj.get("abs_traversal_mode") or "").strip() or None,
        "holeRadiusWU": finite_number(obj.get("abs_hole_radius_wu")),
        "viewportSpan": bool(obj.get("abs_viewport_span", False)),
        "spanWU": finite_number(obj.get("abs_span_wu")),
        "instanceCount": instance_count,
        "formsBodyIndex": finite_number(obj.get("abs_forms_body_index")),
        "opaqueBody": bool(obj.get("abs_opaque_body", False)),
        "paletteMode": palette_mode,
        "paletteRole": palette_role or None,
        "paletteRoleIndex": ROLE_TO_PALETTE.get(palette_role),
        "paletteSeed": int(palette_seed),
    }


def palette_role_from_material(material, fallback, fallbacks, object_name):
    if material:
        slot = material.get("abs_palette_slot")
        if isinstance(slot, str) and slot.strip().lower() in ROLE_TO_PALETTE:
            return ROLE_TO_PALETTE[slot.strip().lower()]
        numeric = finite_number(slot)
        if numeric is not None and 0 <= round(numeric) < len(PALETTE_ROLES):
            return round(numeric)
        role = str(material.get("abs_material_role") or "").strip().lower()
        if role in ROLE_TO_PALETTE:
            return ROLE_TO_PALETTE[role]
        match = ABS_MATERIAL_ROLE_PATTERN.match(material.name)
        if match:
            resolved = int(match.group(1))
            record_fallback(
                fallbacks, object_name,
                f"material:{material.name}.abs_palette_slot", resolved,
            )
            return resolved
    material_name = material.name if material else "<none>"
    record_fallback(
        fallbacks, object_name,
        f"material:{material_name}.abs_palette_slot", fallback,
    )
    return fallback


def feature_classes(mesh, normals):
    edge_faces = {}
    for triangle, normal in zip(mesh.loop_triangles, normals):
        for edge in (
            (triangle.vertices[0], triangle.vertices[1]),
            (triangle.vertices[1], triangle.vertices[2]),
            (triangle.vertices[2], triangle.vertices[0]),
        ):
            edge_faces.setdefault(tuple(sorted(edge)), []).append(normal)
    classes = []
    crease_cosine = math.cos(math.radians(35.0))
    for triangle in mesh.loop_triangles:
        feature_class = 0
        for edge in (
            (triangle.vertices[0], triangle.vertices[1]),
            (triangle.vertices[1], triangle.vertices[2]),
            (triangle.vertices[2], triangle.vertices[0]),
        ):
            edge_normals = edge_faces.get(tuple(sorted(edge)), ())
            if len(edge_normals) == 1:
                feature_class = max(feature_class, 1)
            elif len(edge_normals) > 1 and any(
                left.dot(right) < crease_cosine
                for index, left in enumerate(edge_normals)
                for right in edge_normals[index + 1:]
            ):
                feature_class = max(feature_class, 2)
        classes.append(feature_class)
    return classes


def triangle_component_ids(mesh):
    """Return deterministic connected-component IDs for evaluated triangles."""
    parents = list(range(len(mesh.vertices)))

    def find(vertex):
        while parents[vertex] != vertex:
            parents[vertex] = parents[parents[vertex]]
            vertex = parents[vertex]
        return vertex

    def union(left, right):
        left_root = find(left)
        right_root = find(right)
        if left_root == right_root:
            return
        low, high = sorted((left_root, right_root))
        parents[high] = low

    for triangle in mesh.loop_triangles:
        union(triangle.vertices[0], triangle.vertices[1])
        union(triangle.vertices[1], triangle.vertices[2])
    roots = sorted({find(triangle.vertices[0]) for triangle in mesh.loop_triangles})
    component_by_root = {root: index for index, root in enumerate(roots)}
    return [
        component_by_root[find(triangle.vertices[0])]
        for triangle in mesh.loop_triangles
    ]


def collect_scene_geometry(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    surfaces = []
    fallbacks = []
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
        try:
            mesh.calc_loop_triangles()
            if not mesh.loop_triangles:
                continue
            matrix = evaluated.matrix_world
            collection_names = {collection.name for collection in obj.users_collection}
            semantics = object_semantics(obj, collection_names, fallbacks)
            sampling_density_attribute = None
            if semantics["samplingDensityAttribute"]:
                sampling_density_attribute = mesh.attributes.get(
                    semantics["samplingDensityAttribute"]
                )
                if sampling_density_attribute is None:
                    raise RuntimeError(
                        f'{obj.name} is missing authored sampling-density attribute '
                        f'{semantics["samplingDensityAttribute"]}.'
                    )
                if (
                    sampling_density_attribute.domain != "POINT"
                    or sampling_density_attribute.data_type != "FLOAT"
                ):
                    raise RuntimeError(
                        f'{obj.name} sampling-density attribute must be POINT/FLOAT.'
                    )
            fallback_palette = FALLBACK_PALETTE_BY_ROLE.get(semantics["role"], 2)
            transformed = []
            normals = []
            for triangle in mesh.loop_triangles:
                vertices = tuple(
                    blender_to_site(matrix @ mesh.vertices[index].co)
                    for index in triangle.vertices
                )
                cross = (vertices[1] - vertices[0]).cross(vertices[2] - vertices[0])
                if not math.isfinite(cross.length) or cross.length <= 2e-9:
                    transformed.append(None)
                    normals.append(Vector((0.0, 1.0, 0.0)))
                else:
                    transformed.append(vertices)
                    normals.append(cross.normalized())
            classes = feature_classes(mesh, normals)
            component_ids = triangle_component_ids(mesh)
            triangles = []
            sampling_triangles = []
            cumulative_sampling_area = []
            component_areas = {}
            surface_area = 0.0
            sampling_area = 0.0
            bounds_min = [math.inf, math.inf, math.inf]
            bounds_max = [-math.inf, -math.inf, -math.inf]
            for triangle_index, triangle in enumerate(mesh.loop_triangles):
                vertices = transformed[triangle_index]
                if vertices is None:
                    continue
                area = (vertices[1] - vertices[0]).cross(vertices[2] - vertices[0]).length * 0.5
                polygon = mesh.polygons[triangle.polygon_index]
                material = (
                    mesh.materials[polygon.material_index]
                    if polygon.material_index < len(mesh.materials)
                    else None
                )
                authored_palette_role = palette_role_from_material(
                    material, fallback_palette, fallbacks, obj.name,
                )
                palette_role = (
                    semantics["paletteRoleIndex"]
                    if semantics["paletteMode"] == "single"
                    else authored_palette_role
                )
                sampling_weight = 1.0
                if sampling_density_attribute is not None:
                    sampling_weight = sum(
                        sampling_density_attribute.data[index].value
                        for index in triangle.vertices
                    ) / 3.0
                    sampling_weight = max(0.0, min(1.0, sampling_weight))
                weighted_area = area * sampling_weight
                surface_area += area
                component_id = component_ids[triangle_index]
                component_areas[component_id] = component_areas.get(component_id, 0.0) + area
                triangle_record = {
                    "index": len(triangles),
                    "vertices": vertices,
                    "normal": normals[triangle_index],
                    "area": area,
                    "samplingWeight": sampling_weight,
                    "weightedArea": weighted_area,
                    "paletteRole": palette_role,
                    "featureClass": classes[triangle_index],
                    "componentId": component_id,
                }
                triangles.append(triangle_record)
                if weighted_area > 1e-12:
                    sampling_area += weighted_area
                    sampling_triangles.append(triangle_record)
                    cumulative_sampling_area.append(sampling_area)
                for point in vertices:
                    for axis in range(3):
                        bounds_min[axis] = min(bounds_min[axis], point[axis])
                        bounds_max[axis] = max(bounds_max[axis], point[axis])
            if triangles:
                if not sampling_triangles or sampling_area <= 1e-12:
                    raise RuntimeError(f"{obj.name} sampling-density attribute removed its full surface.")
                assigned_roles = {triangle["paletteRole"] for triangle in triangles}
                if semantics["paletteMode"] == "mixed" \
                        and len(triangles) >= len(PALETTE_ROLES) * 2 \
                        and assigned_roles != set(range(len(PALETTE_ROLES))):
                    raise RuntimeError(
                        f'{obj.name} mixed palette mode has enough surface area to use all six '
                        'semantic roles but does not.'
                    )
                if semantics["paletteMode"] == "single" \
                        and assigned_roles != {semantics["paletteRoleIndex"]}:
                    raise RuntimeError(f"{obj.name} single palette assignment is not isolated.")
                if semantics["paletteMode"] == "authored-faces" and len(assigned_roles) < 4:
                    raise RuntimeError(
                        f"{obj.name} authored-faces mode lost its deliberate face-role mixture."
                    )
                if semantics["geometryKind"] in {
                    "parametric-round-tunnel", "parametric-square-gate-tunnel",
                }:
                    roles_by_component = {}
                    for triangle in triangles:
                        roles_by_component.setdefault(triangle["componentId"], set()).add(
                            triangle["paletteRole"]
                        )
                    incoherent = [
                        component_id for component_id, roles in roles_by_component.items()
                        if len(roles) != 1
                    ]
                    if incoherent:
                        raise RuntimeError(
                            f"{obj.name} assigns more than one role inside a complete passage component."
                        )
                surfaces.append({
                    "name": obj.name,
                    **semantics,
                    "worldOrigin": blender_to_site(matrix.translation),
                    "collections": sorted(collection_names),
                    "triangles": triangles,
                    "samplingTriangles": sampling_triangles,
                    "cumulativeSamplingArea": cumulative_sampling_area,
                    "surfaceArea": surface_area,
                    "samplingArea": sampling_area,
                    "componentAreas": component_areas,
                    "connectedComponentCount": len(component_areas),
                    "triangleCount": len(triangles),
                    "boundsMin": bounds_min,
                    "boundsMax": bounds_max,
                })
        finally:
            evaluated.to_mesh_clear()
    if not surfaces:
        raise RuntimeError("The Blender scene contains no exportable evaluated mesh surface.")
    roles_by_model = {}
    modes_by_model = {}
    for surface in surfaces:
        roles_by_model.setdefault(surface["modelKey"], set()).update(
            triangle["paletteRole"] for triangle in surface["triangles"]
        )
        modes_by_model.setdefault(surface["modelKey"], set()).add(surface["paletteMode"])
    for model_key, modes in modes_by_model.items():
        if "mixed" not in modes and "authored-faces" not in modes:
            continue
        if roles_by_model[model_key] != set(range(len(PALETTE_ROLES))):
            raise RuntimeError(
                f"{model_key} must visibly contain all six semantic roles across its ecosystem."
            )
    unique_fallbacks = {json.dumps(item, sort_keys=True): item for item in fallbacks}
    return (
        surfaces,
        sorted(unique_fallbacks.values(), key=lambda item: (item["object"], item["field"])),
    )


def allocate_exact(weights, count, minimums):
    if len(weights) != len(minimums):
        raise RuntimeError("Allocation weights and semantic minimums do not match.")
    if count < sum(minimums):
        raise RuntimeError(f"Budget {count} cannot cover semantic minimum {sum(minimums)}.")
    if not weights or any(weight <= 0 for weight in weights):
        raise RuntimeError("The scene has no positive sampling weight.")
    allocations = list(minimums)
    for _ in range(count - sum(allocations)):
        index = min(
            range(len(weights)),
            key=lambda item: ((allocations[item] + 0.5) / weights[item], item),
        )
        allocations[index] += 1
    return allocations


def allocate_progressive_prefix(capacities, count, minimums):
    if len(capacities) != len(minimums) or any(
        minimum < 0 or minimum > capacity
        for minimum, capacity in zip(minimums, capacities)
    ):
        raise RuntimeError("Progressive profile capacities and minimums do not match.")
    if count < sum(minimums) or count > sum(capacities):
        raise RuntimeError("Progressive profile budget is outside its nested capacity.")
    allocations = list(minimums)
    remaining = count - sum(allocations)
    for _ in range(remaining):
        candidates = [
            index for index, capacity in enumerate(capacities)
            if allocations[index] < capacity
        ]
        index = min(
            candidates,
            key=lambda item: ((allocations[item] + 0.5) / capacities[item], item),
        )
        allocations[index] += 1
    return allocations


def spatial_cell(point, cell_size):
    return tuple(math.floor(point[axis] / cell_size) for axis in range(3))


def nearest_grid_distance_squared(point, grid, cell_size):
    cell = spatial_cell(point, cell_size)
    nearest = math.inf
    for x_offset in (-1, 0, 1):
        for y_offset in (-1, 0, 1):
            for z_offset in (-1, 0, 1):
                neighbour = (cell[0] + x_offset, cell[1] + y_offset, cell[2] + z_offset)
                for other in grid.get(neighbour, ()):
                    nearest = min(nearest, (point - other).length_squared)
    return nearest


def candidate_on_surface(surface, serial, phase):
    progress = (radical_inverse(serial + 1, 2) + phase[0]) % 1.0
    triangle_index = bisect.bisect_left(
        surface["cumulativeSamplingArea"], progress * surface["samplingArea"],
    )
    triangle = surface["samplingTriangles"][
        min(triangle_index, len(surface["samplingTriangles"]) - 1)
    ]
    u = (radical_inverse(serial + 1, 3) + phase[1]) % 1.0
    v = (radical_inverse(serial + 1, 5) + phase[2]) % 1.0
    root_u = math.sqrt(u)
    a, b, c = triangle["vertices"]
    return {
        "point": a * (1.0 - root_u) + b * (root_u * (1.0 - v)) + c * (root_u * v),
        "normal": triangle["normal"],
        "paletteRole": triangle["paletteRole"],
        "featureClass": triangle["featureClass"],
        "componentId": triangle["componentId"],
    }


def protected_component_ids(surface, count):
    policy = surface["componentPolicy"]
    rule = COMPONENT_POLICY_RULES.get(policy)
    if rule is None:
        raise RuntimeError(
            f'{surface["objectKey"]} uses unsupported component policy "{policy}".'
        )
    if rule["mode"] == "all":
        return sorted(surface["componentAreas"])
    average_sample_area = surface["surfaceArea"] / max(1, count)
    relative_floor = rule["relativeFloor"]
    minimum_area = max(average_sample_area * 0.3, surface["surfaceArea"] * relative_floor)
    protected = [
        component_id
        for component_id, area in surface["componentAreas"].items()
        if area >= minimum_area
    ]
    if not protected and surface["componentAreas"]:
        protected = [max(surface["componentAreas"], key=surface["componentAreas"].get)]
    return sorted(protected)


def prepare_surface_anchor_plan(surface, reference_count):
    semantic_triangles = {}
    component_triangles = {}
    for triangle in surface["triangles"]:
        existing = semantic_triangles.get(triangle["paletteRole"])
        if existing is None or triangle["weightedArea"] > existing["weightedArea"]:
            semantic_triangles[triangle["paletteRole"]] = triangle
        existing_component = component_triangles.get(triangle["componentId"])
        if (
            existing_component is None
            or triangle["weightedArea"] > existing_component["weightedArea"]
        ):
            component_triangles[triangle["componentId"]] = triangle
    protected_components = protected_component_ids(surface, max(1, reference_count))
    anchor_triangle_ids = {
        triangle["index"] for triangle in semantic_triangles.values()
    }
    anchor_triangle_ids.update(
        component_triangles[component_id]["index"]
        for component_id in protected_components
    )
    surface["protectedComponentIds"] = protected_components
    surface["requiredAnchorCount"] = len(anchor_triangle_ids)


def scene_density_weight(surface):
    return ENVIRONMENT_DENSITY_WEIGHT if surface["role"] == "parametric-forest" else 1.0


def sample_surface_progressively(surface, count, export_seed):
    spacing = math.sqrt(surface["samplingArea"] / max(1, count))
    cell_size = max(spacing, 1e-6)
    phase = tuple(stable_phase(export_seed, surface["objectKey"], axis) for axis in range(3))
    grid = {}
    samples = []
    serial = 0
    for ordinal in range(count):
        best = None
        best_distance = -1.0
        for _ in range(BEST_CANDIDATES_PER_SURFEL):
            candidate = candidate_on_surface(surface, serial, phase)
            serial += 1
            distance = nearest_grid_distance_squared(candidate["point"], grid, cell_size)
            if distance > best_distance:
                best = candidate
                best_distance = distance
        best["objectOrdinal"] = ordinal
        samples.append(best)
        grid.setdefault(spatial_cell(best["point"], cell_size), []).append(best["point"])
    # Semantic materials and meaningful connected components must survive every
    # profile prefix. Relocate existing surfels; never add a separate detail
    # layer or change the density budget.
    semantic_anchors = {}
    component_anchors = {}
    for triangle in surface["triangles"]:
        existing = semantic_anchors.get(triangle["paletteRole"])
        if existing is None or triangle["weightedArea"] > existing["weightedArea"]:
            semantic_anchors[triangle["paletteRole"]] = triangle
        existing_component = component_anchors.get(triangle["componentId"])
        if (
            existing_component is None
            or triangle["weightedArea"] > existing_component["weightedArea"]
        ):
            component_anchors[triangle["componentId"]] = triangle
    protected_components = surface["protectedComponentIds"]
    anchors_by_triangle = {}
    for palette_role, triangle in semantic_anchors.items():
        anchor = anchors_by_triangle.setdefault(triangle["index"], {
            "triangle": triangle, "paletteRoles": [], "componentIds": [],
        })
        anchor["paletteRoles"].append(palette_role)
    for component_id in protected_components:
        triangle = component_anchors[component_id]
        anchor = anchors_by_triangle.setdefault(triangle["index"], {
            "triangle": triangle, "paletteRoles": [], "componentIds": [],
        })
        anchor["componentIds"].append(component_id)
    anchors = sorted(anchors_by_triangle.values(), key=lambda item: item["triangle"]["index"])
    if len(anchors) > count:
        raise RuntimeError(
            f'{surface["objectKey"]} needs {len(anchors)} protected anchors but has {count} surfels.'
        )
    for sample_index, anchor in enumerate(anchors):
        triangle = anchor["triangle"]
        a, b, c = triangle["vertices"]
        samples[sample_index] = {
            "point": (a + b + c) / 3.0,
            "normal": triangle["normal"],
            "paletteRole": triangle["paletteRole"],
            "featureClass": triangle["featureClass"],
            "componentId": triangle["componentId"],
            "objectOrdinal": sample_index,
            "semanticAnchor": bool(anchor["paletteRoles"]),
            "componentAnchor": bool(anchor["componentIds"]),
        }
    surface["protectedComponentCount"] = len(protected_components)
    if surface["role"] == "narrative-lattice":
        # A low-detail prefix must sample every strand, not just whichever side
        # won the earliest best-candidate rounds. Keep the protected anchors and
        # every point/ordinal intact; only stratify the remaining nested stream.
        strands = {}
        for sample in samples[len(anchors):]:
            strands.setdefault(sample["componentId"], []).append(sample)
        remainder = []
        for component_id, strand in strands.items():
            for index, sample in enumerate(strand):
                remainder.append(((index + 0.5) / len(strand), component_id, sample))
        remainder.sort(key=lambda item: (item[0], item[1]))
        samples = samples[:len(anchors)] + [item[2] for item in remainder]
        surface["profilePrefixOrder"] = "component-stratified-after-protected-anchors"
    return samples, spacing


def barycentric_on_projected_triangle(point, triangle, axes):
    a, b, c = triangle["vertices"]
    ax, ay = a[axes[0]], a[axes[1]]
    bx, by = b[axes[0]], b[axes[1]]
    cx, cy = c[axes[0]], c[axes[1]]
    px, py = point
    denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(denominator) <= 1e-12:
        return None
    wa = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / denominator
    wb = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / denominator
    wc = 1.0 - wa - wb
    if min(wa, wb, wc) < -1e-6:
        return None
    return a * wa + b * wb + c * wc


def sample_surface_as_row_column_grid(surface, count):
    """Sample a planar authored surface as stable rows and columns.

    The source mesh remains the geometry authority. We project a regular grid
    across its two widest world-space axes, then barycentrically lift every dot
    back onto the evaluated Blender surface. Curved and volumetric objects keep
    the existing blue-noise sampler.
    """
    spans = [surface["boundsMax"][axis] - surface["boundsMin"][axis] for axis in range(3)]
    axes = sorted(range(3), key=lambda axis: spans[axis], reverse=True)[:2]
    width, height = spans[axes[0]], spans[axes[1]]
    columns = max(1, round(math.sqrt(max(1, count) * width / max(height, 1e-6))))
    rows = max(1, math.ceil(count / columns))
    slot_count = rows * columns
    slot_ids = [
        round(index * (slot_count - 1) / max(1, count - 1))
        for index in range(count)
    ]
    samples = []
    triangles = surface["samplingTriangles"]
    buckets = {}
    for triangle in triangles:
        projected_vertices = [
            (vertex[axes[0]], vertex[axes[1]]) for vertex in triangle["vertices"]
        ]
        column_start = max(0, min(columns - 1, math.floor(
            (min(point[0] for point in projected_vertices) - surface["boundsMin"][axes[0]])
            / max(width, 1e-6) * columns,
        )))
        column_end = max(0, min(columns - 1, math.floor(
            (max(point[0] for point in projected_vertices) - surface["boundsMin"][axes[0]])
            / max(width, 1e-6) * columns,
        )))
        row_start = max(0, min(rows - 1, math.floor(
            (min(point[1] for point in projected_vertices) - surface["boundsMin"][axes[1]])
            / max(height, 1e-6) * rows,
        )))
        row_end = max(0, min(rows - 1, math.floor(
            (max(point[1] for point in projected_vertices) - surface["boundsMin"][axes[1]])
            / max(height, 1e-6) * rows,
        )))
        for bucket_row in range(row_start, row_end + 1):
            for bucket_column in range(column_start, column_end + 1):
                buckets.setdefault((bucket_row, bucket_column), []).append(triangle)
    for ordinal, slot in enumerate(slot_ids):
        row, column = divmod(slot, columns)
        u = (column + 0.5) / columns
        v = (row + 0.5) / rows
        projected = (
            surface["boundsMin"][axes[0]] + width * u,
            surface["boundsMin"][axes[1]] + height * v,
        )
        match = None
        point = None
        for triangle in buckets.get((row, column), triangles):
            point = barycentric_on_projected_triangle(projected, triangle, axes)
            if point is not None:
                match = triangle
                break
        if match is None:
            # Non-rectangular edges retain a stable surface point instead of
            # inventing geometry outside the Blender mesh.
            fallback = candidate_on_surface(surface, slot, (0.0, 0.0, 0.0))
            point = fallback["point"]
            match = min(
                triangles,
                key=lambda triangle: sum(
                    (sum(vertex[axis] for vertex in triangle["vertices"]) / 3.0 - point[axis]) ** 2
                    for axis in range(3)
                ),
            )
        samples.append({
            "point": point,
            "normal": match["normal"],
            "paletteRole": match["paletteRole"],
            "featureClass": match["featureClass"],
            "componentId": match["componentId"],
            "objectOrdinal": ordinal,
        })
    # Grid objects are broad single-material surfaces. Keep their existing
    # protected-prefix contract without moving dots away from the grid.
    for index in range(min(surface["requiredAnchorCount"], len(samples))):
        samples[index]["semanticAnchor"] = True
        samples[index]["componentAnchor"] = index < len(surface["protectedComponentIds"])
    surface["protectedComponentCount"] = len(surface["protectedComponentIds"])
    surface["profilePrefixOrder"] = "row-major-projected-grid"
    spacing = math.sqrt(surface["samplingArea"] / max(1, count))
    return samples, spacing


def interleave_model_samples(model_surfaces):
    """Build one nested, area-weighted stream with a protected anchor prefix."""
    output = []
    segment_starts = [surface["requiredAnchorCount"] for surface in model_surfaces]
    for part_id, surface in enumerate(model_surfaces):
        for ordinal in range(surface["requiredAnchorCount"]):
            output.append((
                ordinal / max(1, surface["requiredAnchorCount"]),
                surface["objectKey"], part_id, surface, surface["samples"][ordinal],
            ))
    output.sort(key=lambda item: (item[0], item[1]))
    remainder = []
    for part_id, surface in enumerate(model_surfaces):
        samples = surface["samples"]
        start = segment_starts[part_id]
        span = max(1, len(samples) - start)
        for ordinal in range(start, len(samples)):
            remainder.append((
                ((ordinal - start) + 0.5) / span,
                surface["objectKey"], part_id, surface, samples[ordinal],
            ))
    remainder.sort(key=lambda item: (item[0], item[1]))
    output.extend(remainder)
    return output


def interleave_nested_profile_samples(model_surfaces, profile_surface_counts):
    """Order a model so each quality tier is an exact nested prefix.

    A desktop-only surface starts after the mobile prefix. This lets portrait
    and landscape compositions share one binary, one geometry, and two draw
    calls without making mobile decode or render desktop-specific points.
    """
    output = []
    previous_counts = {surface["objectKey"]: 0 for surface in model_surfaces}
    for profile_name in PROFILE_ORDER:
        current_counts = profile_surface_counts[profile_name]
        segment = []
        for part_id, surface in enumerate(model_surfaces):
            object_key = surface["objectKey"]
            start = previous_counts[object_key]
            end = current_counts[object_key]
            if end < start or end > len(surface["samples"]):
                raise RuntimeError(
                    f"{object_key} has a non-nested {profile_name} profile count."
                )
            span = max(1, end - start)
            for ordinal in range(start, end):
                segment.append((
                    ((ordinal - start) + 0.5) / span,
                    object_key,
                    part_id,
                    surface,
                    surface["samples"][ordinal],
                ))
            previous_counts[object_key] = end
        segment.sort(key=lambda item: (item[0], item[1]))
        output.extend(segment)
    expected = sum(surface["surfelCount"] for surface in model_surfaces)
    if len(output) != expected:
        raise RuntimeError("Nested profile ordering omitted model surfels.")
    return output


def oct_encode(normal):
    divisor = abs(normal.x) + abs(normal.y) + abs(normal.z)
    if divisor <= 1e-12:
        return 0, 32767
    x, y, z = normal.x / divisor, normal.y / divisor, normal.z / divisor
    if z < 0:
        old_x = x
        x = (1.0 - abs(y)) * (1.0 if old_x >= 0 else -1.0)
        y = (1.0 - abs(old_x)) * (1.0 if y >= 0 else -1.0)
    return (
        max(-32767, min(32767, round(x * 32767))),
        max(-32767, min(32767, round(y * 32767))),
    )


def write_surfel_file(path, records):
    used_stable_ids = set()
    with path.open("wb") as output:
        for record in records:
            normal_x, normal_y = oct_encode(record["normal"])
            radius = max(1, min(65535, round(record["radius"] / RADIUS_STEP_WU)))
            seed = stable_u32(record["stableKey"], "seed") & 0xFFFF
            stable_id = stable_u32(record["stableKey"])
            while stable_id in used_stable_ids:
                stable_id = (stable_id + 1) & 0xFFFFFFFF
            used_stable_ids.add(stable_id)
            output.write(SURFEL_STRUCT.pack(
                record["point"].x, record["point"].y, record["point"].z,
                normal_x, normal_y, radius, seed,
                record["modelId"], record["partId"], stable_id,
                record["paletteRole"], record["motionGroup"],
                record["featureClass"], record["flags"],
            ))


def point_bounds(points):
    minimum = [math.inf, math.inf, math.inf]
    maximum = [-math.inf, -math.inf, -math.inf]
    for point in points:
        for axis in range(3):
            minimum[axis] = min(minimum[axis], point[axis])
            maximum[axis] = max(maximum[axis], point[axis])
    return {
        "min": [round(value, 6) for value in minimum],
        "max": [round(value, 6) for value in maximum],
    }


def sha256_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parametric_passage_frames(scene, start, end, count, roll_turns=0.0):
    """Evaluate evenly spaced frames on the same Blender curve used by Geometry Nodes."""
    path = require_system_object(scene, "path", "CURVE")
    follower = bpy.data.objects.new("ABS_EXPORT_PASSAGE_FRAME", None)
    scene.collection.objects.link(follower)
    constraint = follower.constraints.new(type="FOLLOW_PATH")
    constraint.target = path
    constraint.use_fixed_location = True
    constraint.use_curve_follow = True
    constraint.forward_axis = "FORWARD_Z"
    constraint.up_axis = "UP_Y"
    depsgraph = bpy.context.evaluated_depsgraph_get()
    frames = []
    try:
        for index in range(count):
            fraction = index / max(1, count - 1)
            constraint.offset_factor = start + (end - start) * fraction
            follower.update_tag(refresh={"OBJECT"})
            bpy.context.view_layer.update()
            matrix = follower.evaluated_get(depsgraph).matrix_world.copy()
            centre = blender_to_site(matrix.translation)
            basis = matrix.to_3x3()
            right = blender_to_site(basis @ Vector((1.0, 0.0, 0.0))).normalized()
            up = blender_to_site(basis @ Vector((0.0, 1.0, 0.0))).normalized()
            normal = blender_to_site(basis @ Vector((0.0, 0.0, 1.0))).normalized()
            angle = 2.0 * math.pi * roll_turns * fraction
            if abs(angle) > 1e-12:
                rotated_right = right * math.cos(angle) + up * math.sin(angle)
                rotated_up = up * math.cos(angle) - right * math.sin(angle)
                right, up = rotated_right.normalized(), rotated_up.normalized()
            if right.cross(up).dot(normal) < 0:
                normal.negate()
            frames.append((centre, right, up, normal))
    finally:
        bpy.data.objects.remove(follower, do_unlink=True)
    return frames


def describe_square_gate_apertures(scene):
    """Export openings from the evaluated mesh, independently of camera samples."""
    host = export_object(scene, "director.square-gate-tunnel")
    controls = require_system_object(scene, "controls")
    if host is not None and controls is not None:
        count = int(round(float(controls["square_gate_count"])))
        half_width = float(controls["square_gate_half_width_wu"])
        half_height = float(controls["square_gate_half_height_wu"])
        rim = float(controls["square_gate_rim_wu"])
        half_depth = float(controls["square_gate_half_depth_wu"])
        frames = parametric_passage_frames(
            scene,
            float(controls["square_gate_start_progress"]),
            float(controls["square_gate_end_progress"]),
            count,
            float(controls["square_gate_roll_turns"]),
        )
        return {
            "schema": "about-square-gate-apertures/v1",
            "source": stable_object_identifier(host),
            "displayName": host.name,
            "coordinateSystem": "website-world",
            "traversal": {
                "forward": True,
                "reverse": True,
                "mode": "same-centreline-reversible",
            },
            "apertures": [{
                "id": index + 1,
                "centre": rounded_vector(centre),
                "right": rounded_vector(right),
                "up": rounded_vector(up),
                "normal": rounded_vector(normal),
                "innerHalfSize": [round(half_width, 6), round(half_height, 6)],
                "outerHalfSize": [round(half_width + rim, 6), round(half_height + rim, 6)],
                "halfDepth": round(half_depth, 6),
            } for index, (centre, right, up, normal) in enumerate(frames)],
        }
    authored_gates = sorted(
        (obj for obj in scene.objects if obj.name.startswith("ABS_GATE_")
         and obj.type == "MESH" and obj.get("abs_gate_index") is not None),
        key=lambda obj: int(obj["abs_gate_index"]),
    )
    if authored_gates:
        apertures = []
        for gate_index, gate in enumerate(authored_gates):
            if int(gate["abs_gate_index"]) != gate_index:
                raise RuntimeError("Individual square gate indices must be contiguous from zero.")
            authored_inner = [float(value) for value in gate["abs_aperture_half_size"]]
            authored_half_depth = float(gate["abs_half_depth"])
            evaluated = gate.evaluated_get(bpy.context.evaluated_depsgraph_get())
            mesh = evaluated.to_mesh()
            try:
                centre_blender = sum(
                    (evaluated.matrix_world @ vertex.co for vertex in mesh.vertices),
                    Vector(),
                ) / len(mesh.vertices)
            finally:
                evaluated.to_mesh_clear()
            centre = blender_to_site(centre_blender)
            # B02 gates are authored in Blender X/Z with their depth along Y.
            basis_right = blender_to_site(gate.matrix_world.to_3x3() @ Vector((1, 0, 0)))
            basis_up = blender_to_site(gate.matrix_world.to_3x3() @ Vector((0, 0, 1)))
            basis_normal = blender_to_site(gate.matrix_world.to_3x3() @ Vector((0, 1, 0)))
            inner = [authored_inner[0] * basis_right.length, authored_inner[1] * basis_up.length]
            half_depth = authored_half_depth * basis_normal.length
            right = basis_right.normalized()
            up = basis_up.normalized()
            normal = basis_normal.normalized()
            authored_rim = float(gate.get("abs_aperture_rim_wu", 1.1))
            thickness = [authored_rim * basis_right.length, authored_rim * basis_up.length]
            apertures.append({
                "id": gate_index + 1,
                "centre": rounded_vector(centre),
                "right": rounded_vector(right),
                "up": rounded_vector(up),
                "normal": rounded_vector(normal),
                "innerHalfSize": [round(value, 6) for value in inner],
                "outerHalfSize": [round(value + thickness[index], 6) for index, value in enumerate(inner)],
                "halfDepth": round(half_depth, 6),
            })
        return {
            "schema": "about-square-gate-apertures/v1",
            "source": "ABS_GATE_00..15",
            "coordinateSystem": "website-world",
            "traversal": {
                "forward": True,
                "reverse": True,
                "mode": "same-centreline-reversible",
            },
            "apertures": apertures,
        }
    gate = scene.objects.get("GN_SQUARE_LOOP")
    if gate is None:
        return None
    evaluated = gate.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    try:
        vertices = [blender_to_site(evaluated.matrix_world @ vertex.co) for vertex in mesh.vertices]
        neighbours = [set() for _ in vertices]
        for edge in mesh.edges:
            first, second = edge.vertices
            neighbours[first].add(second)
            neighbours[second].add(first)
        unseen = set(range(len(vertices)))
        apertures = []
        while unseen:
            pending = [min(unseen)]
            component = set()
            while pending:
                index = pending.pop()
                if index in component:
                    continue
                component.add(index)
                unseen.discard(index)
                pending.extend(neighbours[index] - component)
            if len(component) != 16:
                raise RuntimeError("Square gate aperture verification requires closed 16-vertex annuli.")
            points = [vertices[index] for index in sorted(component)]
            centre = sum(points, Vector()) / len(points)
            edges = [vertices[second] - vertices[first]
                     for first in sorted(component) for second in sorted(neighbours[first])
                     if first < second]
            right = max(edges, key=lambda edge: edge.length_squared).normalized()
            perpendicular = [edge for edge in edges
                             if edge.length > 0.0001 and abs(edge.normalized().dot(right)) < 0.001]
            up = max(perpendicular, key=lambda edge: edge.length_squared).normalized()
            normal = right.cross(up).normalized()
            extents = [[abs((point - centre).dot(axis)) for point in points]
                       for axis in (right, up, normal)]
            inner = [min(values) for values in extents[:2]]
            outer = [max(values) for values in extents[:2]]
            if any(size <= 0 or rim <= size for size, rim in zip(inner, outer)):
                raise RuntimeError("The square gate no longer has an open rectangular aperture.")
            apertures.append({
                "id": len(apertures) + 1,
                "centre": [round(value, 6) for value in centre],
                "right": [round(value, 8) for value in right],
                "up": [round(value, 8) for value in up],
                "normal": [round(value, 8) for value in normal],
                "innerHalfSize": [round(value, 6) for value in inner],
                "outerHalfSize": [round(value, 6) for value in outer],
                "halfDepth": round(max(extents[2]), 6),
            })
        if len(apertures) != int(gate.get("abs_instance_count", 0)):
            raise RuntimeError("Gate aperture count does not match the source instance count.")
        return {
            "schema": "about-square-gate-apertures/v1", "source": gate.name,
            "coordinateSystem": "website-world", "apertures": apertures,
        }
    finally:
        evaluated.to_mesh_clear()


def describe_round_tunnel_apertures(scene):
    """Export authored round-tunnel openings independently of camera samples."""
    host = export_object(scene, "director.round-tunnel")
    controls = require_system_object(scene, "controls")
    if host is not None and controls is not None:
        count = int(round(float(controls["round_tunnel_ring_count"])))
        radius = float(controls["round_tunnel_aperture_radius_wu"])
        rim = float(controls["round_tunnel_rim_wu"])
        half_depth = float(controls["round_tunnel_half_depth_wu"])
        frames = parametric_passage_frames(
            scene,
            float(controls["round_tunnel_start_progress"]),
            float(controls["round_tunnel_end_progress"]),
            count,
        )
        return {
            "schema": "about-round-tunnel-apertures/v1",
            "source": stable_object_identifier(host),
            "displayName": host.name,
            "coordinateSystem": "website-world",
            "traversal": {
                "forward": True,
                "reverse": True,
                "mode": "same-centreline-reversible",
            },
            "apertures": [{
                "id": index + 1,
                "centre": rounded_vector(centre),
                "right": rounded_vector(right),
                "up": rounded_vector(up),
                "normal": rounded_vector(normal),
                "innerRadius": round(radius, 6),
                "outerRadius": round(radius + rim, 6),
                "halfDepth": round(half_depth, 6),
            } for index, (centre, right, up, normal) in enumerate(frames)],
        }
    hoops = sorted(
        (
            obj for obj in scene.objects
            if obj.type == "MESH"
            and obj.get("abs_geometry_kind") == "curved-round-tunnel-hoop"
            and obj.get("abs_tunnel_index") is not None
        ),
        key=lambda obj: int(obj["abs_tunnel_index"]),
    )
    if not hoops:
        return None
    if len(hoops) < 8:
        raise RuntimeError("The curved round tunnel requires at least eight authored apertures.")

    apertures = []
    for index, hoop in enumerate(hoops):
        if int(hoop["abs_tunnel_index"]) != index:
            raise RuntimeError("Round tunnel indices must be contiguous from zero.")

        required = (
            "abs_aperture_centre_blender",
            "abs_aperture_right_blender",
            "abs_aperture_up_blender",
            "abs_aperture_normal_blender",
            "abs_aperture_radius_wu",
            "abs_aperture_half_depth_wu",
        )
        missing = [name for name in required if hoop.get(name) is None]
        if missing:
            raise RuntimeError(
                f"{hoop.name} is missing authored round-aperture properties: {', '.join(missing)}."
            )

        if hoop.get("abs_director_cut_mesh_centred"):
            world_matrix = hoop.matrix_world
            centre_blender = world_matrix.translation
            basis = world_matrix.to_3x3()
            right_blender = (basis @ Vector((1.0, 0.0, 0.0))).normalized()
            up_blender = (basis @ Vector((0.0, 0.0, 1.0))).normalized()
            normal_blender = (basis @ Vector((0.0, 1.0, 0.0))).normalized()
        else:
            centre_blender = Vector(hoop["abs_aperture_centre_blender"])
            right_blender = Vector(hoop["abs_aperture_right_blender"])
            up_blender = Vector(hoop["abs_aperture_up_blender"])
            normal_blender = Vector(hoop["abs_aperture_normal_blender"])
        centre = blender_to_site(centre_blender)
        right = blender_to_site(right_blender).normalized()
        up = blender_to_site(up_blender).normalized()
        normal = blender_to_site(normal_blender).normalized()
        if max(abs(right.dot(up)), abs(right.dot(normal)), abs(up.dot(normal))) > 0.001:
            raise RuntimeError(f"{hoop.name} round-aperture basis is not orthogonal.")
        if right.cross(up).dot(normal) < 0:
            normal.negate()

        inner_radius = float(hoop["abs_aperture_radius_wu"])
        half_depth = float(hoop["abs_aperture_half_depth_wu"])
        rim = float(hoop.get("abs_aperture_rim_wu", half_depth))
        if not all(math.isfinite(value) and value > 0 for value in (
            inner_radius, half_depth, rim,
        )):
            raise RuntimeError(f"{hoop.name} has an invalid round aperture size.")
        apertures.append({
            "id": index + 1,
            "centre": rounded_vector(centre),
            "right": rounded_vector(right),
            "up": rounded_vector(up),
            "normal": rounded_vector(normal),
            "innerRadius": round(inner_radius, 6),
            "outerRadius": round(inner_radius + rim, 6),
            "halfDepth": round(half_depth, 6),
        })

    return {
        "schema": "about-round-tunnel-apertures/v1",
        "source": f"{hoops[0].name}..{hoops[-1].name}",
        "coordinateSystem": "website-world",
        "traversal": {
            "forward": True,
            "reverse": True,
            "mode": "same-centreline-reversible",
        },
        "apertures": apertures,
    }


def export_camera_track(output_dir, scene, camera):
    frame_start, frame_end = int(scene.frame_start), int(scene.frame_end)
    if frame_end <= frame_start:
        raise RuntimeError("The About camera has an invalid frame range.")
    samples = []
    original_frame, original_subframe = scene.frame_current, scene.frame_subframe
    try:
        for source_frame in range(frame_start, frame_end + 1):
            scene.frame_set(source_frame)
            site_matrix = SITE_BASIS @ camera.matrix_world
            position, rotation = site_matrix.translation, site_matrix.to_quaternion()
            samples.append([
                round(position.x, 6), round(position.y, 6), round(position.z, 6),
                round(rotation.x, 8), round(rotation.y, 8),
                round(rotation.z, 8), round(rotation.w, 8),
            ])
    finally:
        scene.frame_set(original_frame, subframe=original_subframe)
    width = scene.render.resolution_x * scene.render.resolution_percentage / 100.0
    height = scene.render.resolution_y * scene.render.resolution_percentage / 100.0
    aspect = width * scene.render.pixel_aspect_x / max(1.0, height * scene.render.pixel_aspect_y)
    horizontal_fov = math.degrees(camera.data.angle_x)
    projection = {
        "type": "perspective",
        "fovAxis": "horizontal",
        "horizontalFov": round(horizontal_fov, 3),
        "referenceAspect": round(aspect, 6),
        "referenceVerticalFov": round(math.degrees(
            2.0 * math.atan(math.tan(math.radians(horizontal_fov) * 0.5) / aspect)
        ), 3),
        "portraitMaxVerticalFov": PORTRAIT_MAX_VERTICAL_FOV_DEGREES,
        "sensorVerticalFov": round(math.degrees(camera.data.angle_y), 3),
        "sensorFit": camera.data.sensor_fit,
    }
    ride_path = require_system_object(scene, "path", "CURVE")
    controls = require_system_object(scene, "controls")
    orientation = {
        "path": stable_object_identifier(ride_path),
        "pathDisplayName": ride_path.name,
        "pathTwistMode": ride_path.data.twist_mode if ride_path and ride_path.type == "CURVE" else None,
        "neutralHorizon": "Z_UP",
        "rollControl": f"{stable_object_identifier(controls)}.roll_00_degrees..roll_09_degrees",
    }
    world_controls = bpy.data.objects.get("ABS_WORLD_CONTROLS")
    lookahead = bpy.data.objects.get("ABS_CAMERA_LOOKAHEAD_FOLLOWER")
    target = bpy.data.objects.get("ABS_CAMERA_LOOKAHEAD_TARGET")
    if world_controls and lookahead and target:
        orientation["steadycam"] = {
            "mode": "rail-position-world-up-look-ahead-aim",
            "positionFollower": "ABS_CAMERA_PATH_FOLLOWER",
            "lookAheadFollower": lookahead.name,
            "target": target.name,
            "lookAheadMetres": round(float(
                world_controls.get("camera_steadycam_look_ahead_metres", 55.0)
            ), 3),
            "targetExtensionMetres": round(float(
                world_controls.get("camera_steadycam_target_extension_metres", 10.0)
            ), 3),
        }
    gate_aim = bpy.data.objects.get("ABS_CAMERA_GATE_AIM")
    gate_controls = bpy.data.objects.get("ABS_SQUARE_ROLLERCOASTER_CONTROLS")
    if gate_aim and gate_controls:
        orientation["gateAim"] = {
            "mode": "same-rail-continuous-right-axis",
            "target": gate_aim.name,
            "path": ride_path.name if ride_path else None,
            "rightReference": "world-X",
            "leadGateSpacings": round(float(gate_controls["Camera Lead Gates"]), 6),
            "blendFrames": json.loads(gate_aim["abs_blend_profile"]),
        }
    roll_control = None
    roll_driver = bpy.data.objects.get("ABS_CAMERA_ROLL_DRIVER")
    if roll_driver and roll_driver.animation_data and roll_driver.animation_data.action:
        action = roll_driver.animation_data.action
        progress_curve = next(
            (curve for curve in action.fcurves if curve.data_path == '["abs_path_progress"]'), None,
        )
        roll_curve = next(
            (curve for curve in action.fcurves if curve.data_path == '["abs_roll_degrees"]'), None,
        )
        if progress_curve and roll_curve:
            roll_control = {
                "object": roll_driver.name,
                "property": "abs_roll_degrees",
                "action": action.name,
                "keyframes": [{
                    "frame": round(point.co.x, 3),
                    "progress": round(progress_curve.evaluate(point.co.x), 6),
                    "degrees": round(point.co.y, 3),
                } for point in roll_curve.keyframe_points],
            }
    track = {
        "schema": "about-camera-track",
        "version": 5,
        "source": stable_object_identifier(camera),
        "displayName": camera.name,
        "frameStart": frame_start,
        "frameEnd": frame_end,
        "fps": round(scene.render.fps / scene.render.fps_base, 6),
        "sampleCount": len(samples),
        "projection": projection,
        "orientation": orientation,
        "samples": samples,
        "journeyCues": [{
            "name": marker.name,
            "frame": int(marker.frame),
            "progress": round(
                (int(marker.frame) - frame_start) / max(1, frame_end - frame_start),
                6,
            ),
        } for marker in sorted(scene.timeline_markers, key=lambda item: item.frame)],
    }
    if roll_control:
        track["rollControl"] = roll_control
    gate_passage = describe_square_gate_apertures(scene)
    if gate_passage:
        track["gatePassage"] = gate_passage
    round_tunnel_passage = describe_round_tunnel_apertures(scene)
    if round_tunnel_passage:
        track["roundTunnelPassage"] = round_tunnel_passage
    path = output_dir / "camera-track.json"
    path.write_text(json.dumps(track, separators=(",", ":")) + "\n", encoding="utf-8")
    return path, track


def build_scene_contract(surfaces, args):
    if not (0 < args.mobile <= args.desktop <= args.master):
        raise RuntimeError("Expected 0 < mobile <= desktop <= master surfel budgets.")
    sampling_weights = [
        surface["surfaceArea"]
        * surface["densityFactor"]
        * surface["featurePriority"]
        * scene_density_weight(surface)
        for surface in surfaces
    ]
    allocation_baseline = None
    model_budget_contract = resolve_model_budget_contract(bpy.context.scene, surfaces, args)
    source_allocation = bpy.context.scene.get('abs_surfel_allocation')
    if source_allocation and not args.preserve_allocations_from:
        allocation = json.loads(source_allocation)
        if allocation.get('schema') != 'about-surfel-allocation/v1':
            raise RuntimeError('Unsupported saved-source allocation contract.')
        objects = allocation.get('objects', {})
        if set(objects) != {surface['objectKey'] for surface in surfaces}:
            raise RuntimeError('Saved allocations must cover exactly the exported objects.')
        for item in objects.values():
            if (not isinstance(item.get('master'), int) or item['master'] <= 0
                    or not isinstance(item.get('weight'), (int, float))
                    or not math.isfinite(item['weight']) or item['weight'] <= 0):
                raise RuntimeError('Saved object allocations must be positive and finite.')
        model_keys = {surface['modelKey'] for surface in surfaces}
        for profile, count in [('mobile', args.mobile), ('desktop', args.desktop), ('master', args.master)]:
            record = allocation.get('profiles', {}).get(profile, {})
            counts = record.get('models', {})
            if (record.get('count') != count or set(counts) != model_keys
                    or any(not isinstance(value, int) or value <= 0 for value in counts.values())
                    or sum(counts.values()) != count):
                raise RuntimeError(f'Invalid saved {profile} model allocations.')
        # Use the same bounded sampler as a study, but obtain every population
        # and weight from the saved .blend, never an external candidate file.
        allocation_baseline = {'profiles': {
            key: {'perModelCounts': value['models']}
            for key, value in allocation['profiles'].items()
        }}
        baseline_objects = {key: {'surfelCount': value['master']} for key, value in objects.items()}
        sampling_weights = [objects[surface['objectKey']]['weight'] for surface in surfaces]
    if args.preserve_allocations_from:
        if not args.candidate_output_dir:
            raise RuntimeError("Fixed baseline allocations are limited to candidate exports.")
        allocation_baseline = json.loads(Path(args.preserve_allocations_from).read_text())
        baseline_objects = {
            item["objectKey"]: item for item in allocation_baseline["source"]["objects"]
        }
        if set(baseline_objects) != {surface["objectKey"] for surface in surfaces}:
            raise RuntimeError("A fixed-allocation candidate must preserve the object keys.")
        sampling_weights = [
            baseline_objects[surface["objectKey"]]["surfaceArea"]
            * baseline_objects[surface["objectKey"]]["densityFactor"]
            * baseline_objects[surface["objectKey"]]["featurePriority"]
            * baseline_objects[surface["objectKey"]]["sceneDensityWeight"]
            for surface in surfaces
        ]
    models_by_key = {}
    for index, surface in enumerate(surfaces):
        models_by_key.setdefault(surface["modelKey"], []).append(index)

    def allocate_by_model(profile_name, minimums):
        allocations = [0] * len(surfaces)
        for model_key, indices in models_by_key.items():
            model_weights = [sampling_weights[index] for index in indices]
            model_minimums = [minimums[index] for index in indices]
            model_total = model_budget_contract[profile_name][model_key]
            model_allocations = allocate_exact(model_weights, model_total, model_minimums)
            for index, count in zip(indices, model_allocations):
                allocations[index] = count
        return allocations

    preliminary_allocations = (
        allocate_by_model("master", [0] * len(surfaces))
        if model_budget_contract
        else allocate_exact(sampling_weights, args.master, [0] * len(surfaces))
    )
    for surface, reference_count in zip(surfaces, preliminary_allocations):
        prepare_surface_anchor_plan(surface, reference_count)
    required_anchor_counts = [surface["requiredAnchorCount"] for surface in surfaces]
    master_allocations = (
        allocate_by_model("master", required_anchor_counts)
        if model_budget_contract
        else allocate_exact(sampling_weights, args.master, required_anchor_counts)
    )
    if allocation_baseline:
        master_allocations = [
            baseline_objects[surface["objectKey"]]["surfelCount"] for surface in surfaces
        ]
        if sum(master_allocations) != args.master:
            raise RuntimeError("The candidate master budget differs from the baseline.")
        for surface, count in zip(surfaces, master_allocations):
            if count < surface["requiredAnchorCount"]:
                raise RuntimeError(f'{surface["objectKey"]} exceeds its preserved allocation.')
    for surface, count in zip(surfaces, master_allocations):
        sampler = (
            sample_surface_as_row_column_grid
            if surface["samplingPattern"] == "row-column-grid"
            else sample_surface_progressively
        )
        sampler_args = (surface, count) if sampler is sample_surface_as_row_column_grid else (
            surface, count, args.seed,
        )
        surface["samples"], surface["spacingTarget"] = sampler(*sampler_args)
        surface["surfelCount"] = count
        surface["semanticAnchorCount"] = sum(
            1 for sample in surface["samples"] if sample.get("semanticAnchor")
        )
        surface["componentAnchorCount"] = sum(
            1 for sample in surface["samples"] if sample.get("componentAnchor")
        )
        surface["requiredAnchorCount"] = sum(
            1 for sample in surface["samples"]
            if sample.get("semanticAnchor") or sample.get("componentAnchor")
        )
    model_surfaces_by_key = {}
    for surface in surfaces:
        model_surfaces_by_key.setdefault(surface["modelKey"], []).append(surface)
    model_keys = sorted(model_surfaces_by_key)
    model_master_counts = [
        sum(surface["surfelCount"] for surface in model_surfaces_by_key[key])
        for key in model_keys
    ]
    if allocation_baseline:
        saved_master_counts = allocation_baseline['profiles']['master']['perModelCounts']
        if saved_master_counts != dict(zip(model_keys, model_master_counts)):
            raise RuntimeError('Saved master model allocations differ from their object populations.')
    mobile_model_minimums = [
        sum(
            surface["requiredAnchorCount"]
            for surface in model_surfaces_by_key[key]
            if surface["minimumProfile"] == "mobile"
        )
        for key in model_keys
    ]
    if model_budget_contract:
        mobile_model_counts = [model_budget_contract["mobile"][key] for key in model_keys]
        desktop_model_counts = [model_budget_contract["desktop"][key] for key in model_keys]
        for minimum, mobile, desktop, master in zip(
            mobile_model_minimums, mobile_model_counts, desktop_model_counts, model_master_counts,
        ):
            if not minimum <= mobile <= desktop <= master:
                raise RuntimeError("Saved profile model budgets cannot contain all required anchors.")
    else:
        mobile_model_counts = allocate_progressive_prefix(
            model_master_counts, args.mobile, mobile_model_minimums,
        )
        desktop_model_counts = allocate_progressive_prefix(
            model_master_counts,
            args.desktop,
            mobile_model_counts,
        )
    if allocation_baseline:
        mobile_model_counts, desktop_model_counts = [
            [allocation_baseline["profiles"][profile]["perModelCounts"][key] for key in model_keys]
            for profile in ("mobile", "desktop")
        ]
        if sum(mobile_model_counts) != args.mobile or sum(desktop_model_counts) != args.desktop:
            raise RuntimeError("The candidate profile budgets differ from the baseline.")
        for minimum, mobile, desktop, master in zip(
            mobile_model_minimums, mobile_model_counts, desktop_model_counts, model_master_counts,
        ):
            if not minimum <= mobile <= desktop <= master:
                raise RuntimeError("Preserved profile allocations cannot contain all required anchors.")
    profile_model_counts = {
        "mobile": mobile_model_counts,
        "desktop": desktop_model_counts,
        "master": model_master_counts,
    }
    motion_keys = set()
    for surface in surfaces:
        motion_keys.add(surface["motionKey"])
        for subgroup in range(surface["motionSubgroups"]):
            if surface["motionSubgroups"] > 1:
                motion_keys.add(f'{surface["motionKey"]}.strand-{subgroup:02d}')
    motion_keys = sorted(motion_keys)
    if len(motion_keys) > 256:
        raise RuntimeError("The packed contract supports at most 256 motion groups.")
    motion_id_by_key = {key: index for index, key in enumerate(motion_keys)}
    records, models = [], []
    profile_object_counts = {name: {} for name in profile_model_counts}
    for model_id, model_key in enumerate(model_keys):
        model_surfaces = sorted(model_surfaces_by_key[model_key], key=lambda item: item["objectKey"])
        model_profile_totals = {
            profile_name: profile_model_counts[profile_name][model_id]
            for profile_name in PROFILE_ORDER
        }
        surface_profile_counts = {profile_name: {} for profile_name in PROFILE_ORDER}
        previous = [0] * len(model_surfaces)
        for profile_name in PROFILE_ORDER:
            eligible_capacities = [
                surface["surfelCount"]
                if PROFILE_INDEX[surface["minimumProfile"]] <= PROFILE_INDEX[profile_name]
                else 0
                for surface in model_surfaces
            ]
            minimums = [
                max(
                    previous[index],
                    surface["requiredAnchorCount"]
                    if PROFILE_INDEX[surface["minimumProfile"]] <= PROFILE_INDEX[profile_name]
                    else 0,
                )
                for index, surface in enumerate(model_surfaces)
            ]
            counts = allocate_progressive_prefix(
                eligible_capacities,
                model_profile_totals[profile_name],
                minimums,
            )
            surface_profile_counts[profile_name] = {
                surface["objectKey"]: count
                for surface, count in zip(model_surfaces, counts)
            }
            previous = counts
        for surface in model_surfaces:
            surface["profilePrefixOrder"] = (
                f'nested-minimum-profile-{surface["minimumProfile"]}'
            )
        model_records = interleave_nested_profile_samples(
            model_surfaces,
            surface_profile_counts,
        )
        range_offset = len(records)
        for _progress, _object_key, part_id, surface, sample in model_records:
            records.append({
                **sample,
                "radius": (
                    surface["spacingTarget"]
                    * SURFEL_RADIUS_TO_SPACING
                    * surface["surfelRadiusScale"]
                ),
                "modelId": model_id,
                "partId": part_id,
                "stableKey": f'{args.seed}:{surface["objectKey"]}:{sample["objectOrdinal"]}',
                "motionGroup": motion_id_by_key[
                    f'{surface["motionKey"]}.strand-{sample["componentId"] % surface["motionSubgroups"]:02d}'
                    if surface["motionSubgroups"] > 1
                    else surface["motionKey"]
                ],
                "flags": (
                    (1 if surface["preserveMinPx"] is not None else 0)
                    | (2 if sample.get("semanticAnchor") else 0)
                    | (4 if sample.get("componentAnchor") else 0)
                ),
            })
        model_profile_counts = {
            name: profile_model_counts[name][model_id] for name in profile_model_counts
        }
        for profile_name in PROFILE_ORDER:
            profile_object_counts[profile_name].update(surface_profile_counts[profile_name])
        def shared_model_value(key):
            values = {
                surface[key] for surface in model_surfaces
                if surface[key] is not None
            }
            if len(values) > 1:
                raise RuntimeError(
                    f"Model {model_key} has conflicting {key} values: {sorted(values)}"
                )
            return next(iter(values), None)

        visibility_start_wu = shared_model_value("visibilityStartWU")
        visibility_end_wu = shared_model_value("visibilityEndWU")
        visibility_handoff_wu = shared_model_value("visibilityHandoffWU")
        visibility_start_cue = shared_model_value("visibilityStartCue")
        visibility_start_offset_wu = shared_model_value("visibilityStartOffsetWU")
        visibility_end_cue = shared_model_value("visibilityEndCue")
        visibility_end_offset_wu = shared_model_value("visibilityEndOffsetWU")
        if (visibility_start_wu is None) != (visibility_end_wu is None):
            raise RuntimeError(
                f"Model {model_key} must author both visibility window bounds or neither."
            )
        if visibility_start_wu is not None:
            if visibility_end_wu <= visibility_start_wu:
                raise RuntimeError(f"Model {model_key} has an empty visibility window.")
            if visibility_handoff_wu is None or visibility_handoff_wu <= 0:
                raise RuntimeError(
                    f"Model {model_key} needs a positive visibility handoff duration."
                )
            if visibility_handoff_wu * 2 >= visibility_end_wu - visibility_start_wu:
                raise RuntimeError(
                    f"Model {model_key}'s visibility handoff consumes its full window."
                )
        if visibility_start_cue is None or visibility_end_cue is None:
            raise RuntimeError(
                f"Model {model_key} must author both semantic visibility cues; authored-WU fallback is unsupported."
            )
        if visibility_start_offset_wu is None or visibility_end_offset_wu is None:
            raise RuntimeError(
                f"Model {model_key} must author finite semantic visibility cue offsets."
            )
        materials = [surface['material'] for surface in model_surfaces]
        if any(material != materials[0] for material in materials):
            raise RuntimeError(f'Model {model_key} has conflicting source material scales.')
        models.append({
            "id": model_id,
            "key": model_key,
            "role": model_surfaces[0]["role"],
            "motionGroup": motion_id_by_key[model_surfaces[0]["motionKey"]],
            "motionKey": model_surfaces[0]["motionKey"],
            "motionSubgroups": max(surface["motionSubgroups"] for surface in model_surfaces),
            "revealGroup": model_surfaces[0]["revealKey"],
            "objectKeys": [surface["objectKey"] for surface in model_surfaces],
            "surfelRange": {
                "offset": range_offset,
                "count": len(model_records),
                "byteOffset": range_offset * SURFEL_STRIDE_BYTES,
            },
            "profileCounts": model_profile_counts,
            "visibilityStartWU": visibility_start_wu,
            "visibilityEndWU": visibility_end_wu,
            "visibilityHandoffWU": visibility_handoff_wu,
            "visibilityStartCue": visibility_start_cue,
            "visibilityStartOffsetWU": visibility_start_offset_wu,
            "visibilityEndCue": visibility_end_cue,
            "visibilityEndOffsetWU": visibility_end_offset_wu,
            **({'material': materials[0]} if materials[0] != {
                'manifestationSpreadScale': 1.0, 'detailBiasScale': 1.0,
            } else {}),
        })
    profiles = {}
    for profile_name, model_counts in profile_model_counts.items():
        profiles[profile_name] = {
            "surfelCount": sum(model_counts),
            "perModelCounts": {
                model_key: model_counts[index] for index, model_key in enumerate(model_keys)
            },
            "perObjectCounts": profile_object_counts[profile_name],
            "selection": "nested-per-model-prefix",
        }
    pages = build_camera_pages(models, profiles)
    return records, models, profiles, motion_keys, pages


def build_camera_pages(models, profiles):
    """Build bounded upload pages from authored reveal windows.

    A page references stable contiguous model ranges instead of duplicating
    records. The previous page's last model remains in the following page, so a
    handoff always has byte-identical surfels while fog/reveal culling changes.
    """
    timed_models = [
        model for model in models
        if model["visibilityStartWU"] is not None and model["visibilityEndWU"] is not None
    ]
    untimed_models = [model for model in models if model not in timed_models]
    if not timed_models:
        clusters = [list(models)]
    else:
        ordered = sorted(timed_models, key=lambda model: (
            model["visibilityStartWU"], model["visibilityEndWU"], model["id"],
        ))
        clusters = []
        for model in ordered:
            if (
                not clusters
                or model["visibilityStartWU"]
                    - clusters[-1][-1]["visibilityStartWU"] > 2.5
            ):
                clusters.append([model])
            else:
                clusters[-1].append(model)
        for cluster in clusters:
            cluster.extend(untimed_models)
    pages = []
    previous_anchor = None
    for index, cluster in enumerate(clusters):
        page_models = list(cluster)
        if previous_anchor is not None and previous_anchor not in page_models:
            page_models.append(previous_anchor)
        page_models = sorted(set(model["id"] for model in page_models))
        resolved_models = [models[model_id] for model_id in page_models]
        timed_page_models = [
            model for model in cluster
            if model["visibilityStartWU"] is not None and model["visibilityEndWU"] is not None
        ]
        start_wu = min(
            (model["visibilityStartWU"] for model in timed_page_models),
            default=0.0,
        )
        end_wu = max(
            (model["visibilityEndWU"] for model in timed_page_models),
            default=math.inf,
        )
        ranges = [{
            "modelId": model["id"],
            "offset": model["surfelRange"]["offset"],
            "count": model["surfelRange"]["count"],
            "byteOffset": model["surfelRange"]["byteOffset"],
            "profileCounts": model["profileCounts"],
        } for model in resolved_models]
        page_profile_counts = {
            profile_name: sum(item["profileCounts"][profile_name] for item in ranges)
            for profile_name in profiles
        }
        for profile_name in ("mobile", "desktop"):
            budget = profiles[profile_name]["surfelCount"]
            if page_profile_counts[profile_name] > budget:
                raise RuntimeError(
                    f"Page {index} requires {page_profile_counts[profile_name]} "
                    f"{profile_name} surfels, above the explicit {budget} budget."
                )
        current_ids = set(page_models)
        previous_ids = set(pages[-1]["modelIds"]) if pages else set()
        pages.append({
            "id": f"camera-page-{index + 1:02d}",
            "modelIds": page_models,
            "ranges": ranges,
            "profileCounts": page_profile_counts,
            "activeStartWU": round(start_wu, 6),
            "activeEndWU": round(end_wu, 6) if math.isfinite(end_wu) else None,
            "preloadStartWU": round(max(0.0, start_wu - 0.75), 6),
            "releaseEndWU": round(end_wu + 0.75, 6) if math.isfinite(end_wu) else None,
            "sharedModelIdsWithPrevious": sorted(current_ids & previous_ids),
            "handoff": "byte-identical-model-prefix",
        })
        previous_anchor = max(
            timed_page_models or resolved_models,
            key=lambda model: (
                model["visibilityEndWU"] if model["visibilityEndWU"] is not None else math.inf,
                model["id"],
            ),
        )
    for page in pages[1:]:
        if not page["sharedModelIdsWithPrevious"]:
            raise RuntimeError(f'{page["id"]} has no fog-safe stable handoff samples.')
    for previous, current in zip(pages, pages[1:]):
        if previous["releaseEndWU"] is None:
            continue
        if previous["releaseEndWU"] < current["preloadStartWU"] + 0.25:
            midpoint = (previous["releaseEndWU"] + current["preloadStartWU"]) * 0.5
            previous["releaseEndWU"] = round(midpoint + 0.125, 6)
            current["preloadStartWU"] = round(max(0.0, midpoint - 0.125), 6)
        current["handoffOverlapWU"] = round(
            previous["releaseEndWU"] - current["preloadStartWU"],
            6,
        )
    return pages


def preflight_source_properties(scene):
    """Reject malformed saved contracts before any bundle file is replaced."""
    properties = {}
    for key in ('abs_surfel_allocation', 'abs_reading_space_fit', 'abs_terminal_study', 'abs_terminal_response'):
        if scene.get(key):
            value = json.loads(scene[key])
            if not isinstance(value, dict):
                raise RuntimeError(f'{key} must be a JSON object.')
            properties[key] = value
    allocation = properties.get('abs_surfel_allocation')
    if allocation is not None and not re.fullmatch(r'[a-fA-F0-9]{64}', str(allocation.get('basisSourceSha256', ''))):
        raise RuntimeError('Saved allocations need a valid basis source SHA-256.')
    response = properties.get('abs_terminal_response')
    if response is not None:
        def bounded(key, low, high):
            value = response.get(key)
            return type(value) in (int, float) and math.isfinite(value) and low <= value <= high
        if (response.get('schema') != 'about-terminal-response/v1'
                or response.get('modelKey') != 'about.05'
                or not bounded('periodSeconds', 6, 20)
                or not bounded('amplitudeWU', 0, 4)
                or not bounded('responseDelaySeconds', 0.5, 4)
                or not bounded('pulseDurationSeconds', 0.5, 3)
                or response['periodSeconds'] <= response['responseDelaySeconds'] + response['pulseDurationSeconds']):
            raise RuntimeError('Unsupported or invalid saved terminal response timing.')
        travel = response.get('travelXWU')
        bounds = response.get('landscapeBounds', {})
        minimum, maximum = bounds.get('min'), bounds.get('max')
        finite_vector = lambda vector, count: (isinstance(vector, list) and len(vector) == count
            and all(type(value) in (int, float) and math.isfinite(value) for value in vector))
        if (not finite_vector(travel, 2) or not 80 <= travel[1] - travel[0] <= 300
                or not finite_vector(minimum, 3) or not finite_vector(maximum, 3)
                or any(high <= low for low, high in zip(minimum, maximum))
                or not bounded('bankEndSiteZ', -1e9, 1e9)):
            raise RuntimeError('Invalid saved terminal landscape bounds.')
    return properties


def main():
    args = parse_args()
    hydrate_internal_properties(bpy.context.scene)
    output_dir = resolve_export_output_dir(args)
    if args.validate_output_only:
        print(json.dumps({
            "status": "ok",
            "output": str(output_dir),
            "canonicalOutput": output_dir == CANONICAL_ASSET_DIR,
            "candidateOutput": output_dir != CANONICAL_ASSET_DIR,
        }, separators=(",", ":")))
        return
    if (args.preserve_allocations_from or bpy.context.scene.get("abs_terminal_study")) and not args.candidate_output_dir:
        raise RuntimeError("Study contracts and fixed allocations require a candidate directory.")
    output_dir.mkdir(parents=True, exist_ok=True)
    source_blend = Path(bpy.data.filepath).resolve()
    if not source_blend.is_file():
        raise RuntimeError("Save the Blender scene before exporting it.")
    scene = bpy.context.scene
    saved_properties = preflight_source_properties(scene)
    if scene.camera is None:
        raise RuntimeError("The Blender scene has no active camera.")
    assert_clean_scene(scene)
    route_contract = describe_route(scene)
    resolve_surfel_budgets(scene, args)
    surfaces, fallbacks = collect_scene_geometry(
        eligible_mesh_objects(scene),
    )
    model_budget_contract = resolve_model_budget_contract(scene, surfaces, args)
    records, models, profiles, motion_keys, pages = build_scene_contract(surfaces, args)
    surfel_path = output_dir / "surfels.bin"
    camera_path, camera_track = export_camera_track(output_dir, scene, scene.camera)
    write_surfel_file(surfel_path, records)
    for obsolete_name in (
        f"{args.slug}-points-low.bin", f"{args.slug}-points-medium.bin",
        "depth-proxy-positions.bin", "depth-proxy-indices.bin",
    ):
        obsolete_path = output_dir / obsolete_name
        if obsolete_path.exists():
            obsolete_path.unlink()
    source_objects = [{
        "name": surface["name"],
        "objectKey": surface["objectKey"],
        "modelKey": surface["modelKey"],
        "role": surface["role"],
        "motionKey": surface["motionKey"],
        "revealGroup": surface["revealKey"],
        "componentPolicy": surface["componentPolicy"],
        "densityGroup": surface["densityGroup"],
        "densityFactor": round(surface["densityFactor"], 6),
        "minimumProfile": surface["minimumProfile"],
        "profilePrefixOrder": surface.get("profilePrefixOrder", "progressive-best-candidate"),
        "samplingDensityAttribute": surface["samplingDensityAttribute"],
        "samplingPattern": surface["samplingPattern"],
        "featurePriority": round(surface["featurePriority"], 6),
        "surfelRadiusScale": round(surface["surfelRadiusScale"], 6),
        "geometryKind": surface["geometryKind"],
        "cameraPassFrame": (
            int(round(surface["cameraPassFrame"]))
            if surface["cameraPassFrame"] is not None else None
        ),
        "cameraClearanceWU": surface["cameraClearanceWU"],
        "proximityRole": surface["proximityRole"],
        "traversalMode": surface["traversalMode"],
        "holeRadiusWU": surface["holeRadiusWU"],
        "viewportSpan": surface["viewportSpan"],
        "spanWU": surface["spanWU"],
        "instanceCount": surface["instanceCount"],
        "formsBodyIndex": (
            int(round(surface["formsBodyIndex"]))
            if surface["formsBodyIndex"] is not None else None
        ),
        "opaqueBody": surface["opaqueBody"],
        "paletteMode": surface["paletteMode"],
        "paletteRole": surface["paletteRole"],
        "paletteSeed": surface["paletteSeed"],
        "paletteRoles": sorted({triangle["paletteRole"] for triangle in surface["triangles"]}),
        "worldOrigin": [round(value, 6) for value in surface["worldOrigin"]],
        "sceneDensityWeight": scene_density_weight(surface),
        "preserveMinPx": surface["preserveMinPx"],
        "collections": surface["collections"],
        "triangles": surface["triangleCount"],
        "surfaceArea": round(surface["surfaceArea"], 6),
        "samplingSurfaceArea": round(surface["samplingArea"], 6),
        "surfelCount": surface["surfelCount"],
        "semanticAnchorCount": surface["semanticAnchorCount"],
        "connectedComponentCount": surface["connectedComponentCount"],
        "protectedComponentCount": surface.get("protectedComponentCount", 0),
        "componentAnchorCount": surface["componentAnchorCount"],
        "requiredAnchorCount": surface["requiredAnchorCount"],
        "spacingTarget": round(surface["spacingTarget"], 6),
        "bounds": {
            "min": [round(value, 6) for value in surface["boundsMin"]],
            "max": [round(value, 6) for value in surface["boundsMax"]],
        },
    } for surface in surfaces]
    source_hash = sha256_file(source_blend)
    topology = {
        "modelCount": len(models),
        "modelKeys": [model["key"] for model in models],
        "objectCount": len(source_objects),
        "objectKeys": [item["objectKey"] for item in source_objects],
        "models": [{
            "key": model["key"],
            "objectKeys": list(model["objectKeys"]),
        } for model in models],
    }
    controls = require_system_object(scene, "controls")
    authoring_control_values = simplified_authoring_control_values(scene)
    if not authoring_control_values and controls:
        authoring_control_values = {
            key: round(float(controls[key]), 6)
            for key in sorted(controls.keys())
            if not str(key).startswith("abs_")
            and key not in INTERNAL_PROPERTY_KEYS
            and isinstance(controls[key], (int, float))
        }
    authoring_controls = sorted(authoring_control_values)
    helper_names = sorted(obj.name for obj in scene.objects if obj.type == "EMPTY")
    fog_start = finite_number(controls.get("camera_draw_start_wu")) if controls else None
    fog_end = finite_number(controls.get("camera_draw_end_wu")) if controls else None
    fog_curve = finite_number(controls.get("camera_fog_curve")) if controls else None
    if fog_start is None or fog_end is None or fog_curve is None \
            or fog_start < 0 or fog_end <= fog_start or not 0.45 <= fog_curve <= 2.5:
        raise RuntimeError("about.controls needs valid camera draw-distance fog values.")
    meta = {
        "schema": SCHEMA,
        "version": SCHEMA_VERSION,
        "name": args.slug,
        "title": "About V2 authored Blender surfel scene",
        "creator": "Alexander Beck",
        "source": {
            "file": portable_source_path(source_blend),
            "sha256": source_hash,
            "route": route_contract,
            "topology": topology,
            "objectCount": len(source_objects),
            "triangleCount": sum(surface["triangleCount"] for surface in surfaces),
            "surfaceArea": round(sum(surface["surfaceArea"] for surface in surfaces), 6),
            "objects": source_objects,
            "authoring": {
                "geometryOwner": stable_object_identifier(controls),
                "geometryOwnerDisplayName": controls.name,
                "blenderAuthority": scene.get("abs_blender_authority"),
                "runtimeAuthority": scene.get("abs_runtime_authority"),
                "controls": authoring_controls,
                "controlValues": authoring_control_values,
                "helperObjects": helper_names,
                "cameraFog": {
                    "startWU": round(fog_start, 6),
                    "endWU": round(fog_end, 6),
                    "curve": round(fog_curve, 6),
                    "source": stable_object_identifier(controls),
                },
            },
            **({"surfelBudgetContract": model_budget_contract} if model_budget_contract else {}),
            "semanticFallbacks": fallbacks,
            "samplingPolicy": {
                "type": "progressive-semantic-best-candidate-v3",
                "space": "WORLD",
                "allocation": (
                    "saved-source-model-profile-budgets"
                    if model_budget_contract
                    else "role-weighted-world-surface-area-with-anchor-minimum"
                ),
                "profileMinimum": "semantic-and-meaningful-component-anchor-union",
                "environmentDensityWeight": ENVIRONMENT_DENSITY_WEIGHT,
                "bestCandidatesPerSurfel": BEST_CANDIDATES_PER_SURFEL,
                "profileSelection": "nested-per-model-prefix",
                "featureConstraint": "relocate-semantic-and-meaningful-component-anchors-never-add",
                "componentPolicies": COMPONENT_POLICY_RULES,
                "densityFactorProperty": "abs_point_density",
                "samplingDensityAttributeProperty": "abs_sampling_density_attribute",
                "featurePriorityProperty": "abs_feature_priority",
                "preserveMinimumProperty": "abs_preserve_min_px",
                "radiusScaleProperty": "abs_surfel_radius_scale",
                "fog": "blender-camera-depth-exported-directly",
            },
        },
        "coordinateSystem": {
            "source": "Blender right-handed Z-up",
            "runtime": "website right-handed Y-up",
            "mapping": "Blender (x,y,z) -> website (x,z,-y)",
            "units": "metres / website world units",
        },
        "exportControls": {
            "owner": "Blender scene custom properties with optional command-line overrides",
            "properties": {
                "mobile": "abs_surfel_mobile_budget",
                "desktop": "abs_surfel_desktop_budget",
                "master": "abs_surfel_master_budget",
            },
            "resolvedBudgets": {
                "mobile": args.mobile,
                "desktop": args.desktop,
                "master": args.master,
            },
        },
        "files": {
            "surfels": {
                "file": surfel_path.name, "count": len(records),
                "bytes": surfel_path.stat().st_size, "sha256": sha256_file(surfel_path),
            },
            "cameraTrack": {
                "file": camera_path.name, "bytes": camera_path.stat().st_size,
                "sha256": sha256_file(camera_path),
            },
        },
        "layout": {
            "format": "little-endian-packed", "strideBytes": SURFEL_STRIDE_BYTES,
            "attributes": [
                {"name": "position", "type": "float32x3", "offset": 0},
                {"name": "normalOct", "type": "snorm16x2", "offset": 12},
                {"name": "radius", "type": "unorm16", "offset": 16},
                {"name": "seed", "type": "unorm16", "offset": 18},
                {"name": "modelId", "type": "uint16", "offset": 20},
                {"name": "partId", "type": "uint16", "offset": 22},
                {"name": "stableId", "type": "uint32", "offset": 24},
                {"name": "paletteRole", "type": "uint8", "offset": 28},
                {"name": "motionGroup", "type": "uint8", "offset": 29},
                {"name": "featureClass", "type": "uint8", "offset": 30},
                {"name": "flags", "type": "uint8", "offset": 31},
            ],
        },
        "quantization": {
            "radiusWU": {"min": 0, "max": 6.5535, "step": RADIUS_STEP_WU},
        },
        "bounds": point_bounds([record["point"] for record in records]),
        "palette": {
            "owner": "website runtime code via Blender semantic roles",
            "roles": list(PALETTE_ROLES),
            "runtimeResolution": "design-system Home palette",
            "assignment": {
                "owner": "Blender object properties and semantic materials",
                "modeProperty": "abs_palette_mode",
                "roleProperty": "abs_palette_role",
                "seedProperty": "abs_palette_seed",
                "defaultMode": "mixed",
                "modes": list(PALETTE_MODES),
                "exportedValue": "stable semantic role identifier",
            },
            "blenderPreview": {
                "source": scene.get("abs_palette_preview_source"),
                "paletteId": scene.get("abs_palette_preview_palette_id"),
                "periodId": scene.get("abs_palette_preview_period_id"),
                "authority": "preview-only; website runtime remains the production colour owner",
            },
        },
        "visibility": {
            "owner": "Blender scene controls",
            "source": stable_object_identifier(controls),
            "resolution": "semantic camera cues plus Blender-authored distance offsets",
        },
        "motionGroups": [
            {"id": index, "key": key} for index, key in enumerate(motion_keys)
        ],
        "models": models,
        "pages": pages,
        "profiles": profiles,
        "cameraTrack": {
            "file": camera_path.name, "source": camera_track["source"],
            "sampleCount": camera_track["sampleCount"],
            "frameStart": camera_track["frameStart"], "frameEnd": camera_track["frameEnd"],
            "projection": camera_track["projection"],
            "orientation": camera_track["orientation"],
            "rollControl": camera_track.get("rollControl"),
        },
    }
    if args.preserve_allocations_from:
        meta["source"]["samplingPolicy"]["allocation"] = "fixed-candidate-baseline"
        meta["source"]["samplingPolicy"]["allocationBaselineSha256"] = sha256_file(
            Path(args.preserve_allocations_from)
        )
    elif scene.get('abs_surfel_allocation'):
        allocation = saved_properties['abs_surfel_allocation']
        meta['source']['samplingPolicy']['allocation'] = 'saved-source-profile-budgets'
        meta['source']['samplingPolicy']['allocationBasisSourceSha256'] = allocation['basisSourceSha256']
        meta['source']['surfelAllocation'] = allocation
    if scene.get('abs_reading_space_fit'):
        meta['source']['readingSpaceFit'] = saved_properties['abs_reading_space_fit']
    study_contract = scene.get("abs_terminal_study")
    if study_contract:
        if not args.candidate_output_dir:
            raise RuntimeError("A terminal study may only be exported to a candidate directory.")
        meta["terminalStudy"] = saved_properties['abs_terminal_study']
    response_contract = scene.get('abs_terminal_response')
    if response_contract:
        meta['terminalResponse'] = saved_properties['abs_terminal_response']
    (output_dir / "meta.json").write_text(
        json.dumps(meta, indent=2) + "\n", encoding="utf-8",
    )
    print(json.dumps({
        "schema": SCHEMA, "version": SCHEMA_VERSION, "output": str(output_dir),
        "sourceSha256": source_hash, "objects": len(source_objects),
        "models": len(models),
        "triangles": sum(surface["triangleCount"] for surface in surfaces),
        "profiles": {name: profile["surfelCount"] for name, profile in profiles.items()},
        "semanticFallbacks": len(fallbacks),
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ABOUT_V2_EXPORT_ERROR={error}", file=sys.stderr)
        raise SystemExit(2) from error
