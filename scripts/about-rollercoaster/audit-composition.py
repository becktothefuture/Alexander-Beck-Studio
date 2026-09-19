"""Bounded source-composition evidence; this is not a screenshot or a release gate.

Use the real browser sampler's centers and nominal world radii. This does not
model the Home material's viewport-dependent body size or atlas coverage.
Geometry is used independently for rail distances and future surface encounters.
Inputs are read-only. Reports are written below --output-dir.
"""

import argparse
import csv
import hashlib
import html
import json
import math
import time
from pathlib import Path

import numpy as np


REPO = Path(__file__).resolve().parents[2]
MAX_POINTS = 600_000
MAX_VERTICES = 100_000
MAX_FACES = 50_000
MAX_FRAME_WORK = 650_000_000
MAX_DISTANCE_WORK = 120_000_000
NEAR_CLIP = 0.01
VISIBLE_WEIGHT = 0.05
EMPTY_AREA_PERCENT = 0.25
QUADRATURE_NODES, QUADRATURE_WEIGHTS = np.polynomial.legendre.leggauss(12)
VISIBILITY_KEYS = {
    "nearHidden": "aboutVisibilityNearHiddenWU", "nearClear": "aboutVisibilityNearClearWU",
    "farClear": "aboutVisibilityFarClearWU", "farHidden": "aboutVisibilityFarHiddenWU",
}
VISIBILITY_BOUNDS = {"nearHidden": (0, 8), "nearClear": (.1, 12), "farClear": (3, 60), "farHidden": (4, 120)}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path, maximum=24 * 1024 * 1024):
    require(path.stat().st_size <= maximum, f"Input too large: {path}")
    raw = path.read_bytes()
    return json.loads(raw), raw


def validate_visibility(corridor):
    for key, (minimum, maximum) in VISIBILITY_BOUNDS.items():
        value = corridor.get(key)
        require(isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
                and minimum <= value <= maximum, f"Invalid browser visibility setting: {key}.")
    require(corridor["nearHidden"] < corridor["nearClear"] <= corridor["farClear"] < corridor["farHidden"],
            "Visibility must follow Near hidden < Near clear <= Far clear < Far hidden.")
    return corridor


def load_visibility(path):
    document, raw = read_json(path)
    runtime = document.get("runtime", {})
    require(isinstance(runtime, dict) and all(key in runtime for key in VISIBILITY_KEYS.values()),
            "The canonical design config must contain all four About visibility runtime keys.")
    corridor = validate_visibility({key: runtime[source] for key, source in VISIBILITY_KEYS.items()})
    return corridor, dict(file=str(path), sha256=digest(raw), runtimeKeys=VISIBILITY_KEYS)


def load_inputs(bundle_dir, sampled_dir):
    meta, meta_bytes = read_json(bundle_dir / "meta.json")
    require(meta.get("schema") == "about-rollercoaster-world/v2", "Expected a v2 surface bundle.")
    require("fog" not in meta, "Visibility is browser-owned; regenerate the source bundle without fog metadata.")
    require(meta["camera"]["file"] == "camera.json" and meta["geometry"]["file"] == "geometry.json",
            "Unexpected bundle filenames.")
    camera, camera_bytes = read_json(bundle_dir / "camera.json")
    geometry, geometry_bytes = read_json(bundle_dir / "geometry.json")
    require(digest(camera_bytes) == meta["cameraSha256"], "Camera hash mismatch.")
    require(digest(geometry_bytes) == meta["geometry"]["sha256"], "Geometry hash mismatch.")
    source_path = (REPO / meta["source"]["file"]).resolve()
    require(source_path.is_relative_to(REPO) and source_path.suffix == ".blend", "Invalid source path.")
    require(digest(source_path.read_bytes()) == meta["source"]["sha256"], "Saved source hash mismatch.")
    proof, _ = read_json(sampled_dir / "meta.json")
    require(proof.get("verificationOnly"), "Expected an explicitly marked browser-sampler proof.")
    for actual, expected, label in (
        (proof.get("source"), meta["source"], "source"),
        (proof.get("cameraSha256"), meta["cameraSha256"], "camera"),
        (proof.get("geometry", {}).get("sha256"), meta["geometry"]["sha256"], "geometry"),
        (proof.get("motionGroups"), meta["motionGroups"], "motion"),
    ):
        require(actual == expected, f"Sampled proof {label} identity mismatch; regenerate the proof.")
    require(digest((sampled_dir / "camera.json").read_bytes()) == meta["cameraSha256"],
            "Sampled proof camera bytes mismatch.")
    points_path = sampled_dir / "points.bin"
    point_bytes = points_path.stat().st_size
    require(0 < point_bytes <= MAX_POINTS * 24 and point_bytes % 24 == 0, "Invalid sampled point byte length.")
    raw_points = points_path.read_bytes()
    points = np.frombuffer(raw_points, dtype="<f4").reshape(-1, 6)
    require(np.isfinite(points).all() and (points[:, 3] > 0).all(), "Invalid sampled coordinates/radii.")
    require(((points[:, 4] >= 0) & (points[:, 4] <= 5) & (points[:, 4] == np.floor(points[:, 4]))).all(),
            "Sampled palette slots must be 0–5.")
    groups = meta["motionGroups"]
    require(1 <= len(groups) <= 32 and [g["id"] for g in groups] == list(range(len(groups))),
            "Motion groups must be contiguous and bounded.")
    require(((points[:, 5] >= 0) & (points[:, 5] < len(groups)) &
             (points[:, 5] == np.floor(points[:, 5]))).all(), "Invalid sampled motion group.")
    objects = geometry["objects"]
    require(0 < len(objects) <= 256 and len(objects) == meta["geometry"]["objectCount"], "Invalid object count.")
    require(sum(len(o["positions"]) // 3 for o in objects) <= MAX_VERTICES, "Too many vertices.")
    require(sum(len(o["faces"]) for o in objects) <= MAX_FACES, "Too many faces.")
    by_name = {o["name"]: i for i, o in enumerate(objects)}
    require(len(by_name) == len(objects), "Ambiguous object names.")
    owner = np.empty(len(points), dtype=np.int32)
    ranges = []
    last = 0
    for entry in proof["pointObjects"]:
        start, end = entry["start"], entry["end"]
        require(isinstance(start, int) and isinstance(end, int) and start == last and start <= end <= len(points),
                "Sampled ranges must partition the points.")
        require(entry["object"] in by_name, "Unknown sampled object.")
        index = by_name[entry["object"]]
        require((points[start:end, 5] == objects[index]["motionGroup"]).all(), "Object/group mismatch.")
        owner[start:end] = index
        ranges.append(dict(index=index, start=start, end=end))
        last = end
    require(last == len(points) and len(ranges) == len(objects) and len({r["index"] for r in ranges}) == len(objects),
            "Incomplete sampled ranges.")
    samples = np.asarray(camera["samples"], dtype=float)
    require(samples.ndim == 2 and samples.shape[1] == 8 and 2 <= len(samples) <= 20_001,
            "Invalid camera sample layout.")
    require(np.isfinite(samples).all() and (np.diff(samples[:, 0]) > 0).all() and
            samples[0, 0] == 0 and samples[-1, 0] == 1, "Invalid camera progress.")
    require(np.max(np.abs(np.linalg.norm(samples[:, 4:], axis=1) - 1)) < 0.001,
            "Camera quaternions must be normalized.")
    for obj in objects:
        vertices = np.asarray(obj["positions"], dtype=float)
        require(vertices.size % 3 == 0 and np.isfinite(vertices).all(), "Invalid surface coordinates.")
        for face in obj["faces"]:
            require(len(face) in (3, 4) and all(isinstance(i, int) and 0 <= i < vertices.size // 3 for i in face),
                    "Invalid surface face.")
    identity = dict(source=meta["source"], metaSha256=digest(meta_bytes), cameraSha256=digest(camera_bytes),
                    geometrySha256=digest(geometry_bytes), sampledPointsSha256=digest(raw_points),
                    circleCount=len(points), circleField=proof["circleField"],
                    bundle=str(bundle_dir), sampledProof=str(sampled_dir))
    return meta, samples, objects, points, owner, ranges, identity


def sample_camera(samples, progress):
    index = min(len(samples) - 2, max(0, np.searchsorted(samples[:, 0], progress, side="right") - 1))
    a, b = samples[index:index + 2]
    t = np.clip((progress - a[0]) / (b[0] - a[0]), 0, 1)
    position = a[1:4] + (b[1:4] - a[1:4]) * t
    cosine = np.dot(a[4:], b[4:])
    sign = -1 if cosine < 0 else 1
    cosine = min(1, abs(cosine))
    start, end = 1 - t, t
    if cosine < 0.9995:
        angle = math.acos(cosine)
        start, end = math.sin((1 - t) * angle) / math.sin(angle), math.sin(t * angle) / math.sin(angle)
    quaternion = a[4:] * start + b[4:] * end * sign
    return position, quaternion / np.linalg.norm(quaternion)


def camera_basis(quaternion):
    x, y, z, w = quaternion
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)],
        [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)],
        [-2 * (x * z + w * y), -2 * (y * z - w * x), -(1 - 2 * (x * x + y * y))],
    ])


def animate_positions(positions, group_ids, groups, seconds):
    world = positions.copy()
    for group in groups:
        kind = group["kind"]
        require(kind in ("static", "rotate", "wave") and group.get("clock", "ambient") == "ambient",
                "Unsupported source motion.")
        if kind == "static":
            continue
        mask = group_ids == group["id"]
        source = positions[mask]
        axis = np.asarray(group["axis"])
        theta = 2 * math.pi * ((seconds % group["period"]) / group["period"]) + group["phase"] % (2 * math.pi)
        if kind == "rotate":
            angle = theta if group["continuous"] else group["amplitude"] * math.sin(theta)
            offset = source - group["pivot"]
            cosine, sine = math.cos(angle), math.sin(angle)
            world[mask] = group["pivot"] + offset * cosine + np.cross(axis, offset) * sine + \
                np.sum(offset * axis, axis=1)[:, None] * axis * (1 - cosine)
        else:
            offset = source - group["origin"]
            u = np.sum(offset * group["uAxis"], axis=1)
            v = np.sum(offset * group["vAxis"], axis=1)
            quiet = np.clip((np.hypot(u, v) - group["quietRadius"]) / group["quietFeather"], 0, 1)
            quiet = quiet * quiet * (3 - 2 * quiet)
            displacement = group["amplitude"] * quiet * (
                np.sin(2 * math.pi * u / group["wavelength"] + theta) +
                0.5 * np.sin(2 * math.pi * 0.73 * v / group["wavelength"] - theta)) / 1.5
            world[mask] = source + displacement[:, None] * axis
    return world


def perspective(meta, width, height):
    aspect = width / height
    vertical = min(math.radians(meta["camera"]["portraitVerticalFov"]),
                   2 * math.atan(math.tan(math.radians(meta["camera"]["horizontalFov"]) / 2) / aspect))
    tan_y = math.tan(vertical / 2)
    return tan_y * aspect, tan_y


def regions_for(width, height, prose_margin, reading_width):
    # Use root's measured native DOM column width, with an explicit safety
    # margin; do not substitute the old world-space exclusion cone.
    prose_width = min(width, reading_width + 2 * prose_margin)
    return {
        "full": (0, 0, width, height),
        "left": (0, 0, 0.25 * width, height),
        "right": (0.75 * width, 0, width, height),
        "top": (0, 0, width, 0.25 * height),
        "bottom": (0, 0.75 * height, width, height),
        "center": (0.30 * width, 0.30 * height, 0.70 * width, 0.70 * height),
        "floor": (0, 0.60 * height, width, height),
        "prose": ((width - prose_width) / 2, 0, (width + prose_width) / 2, height),
    }


def disc_rectangle_area(cx, cy, radius, rect):
    """Circle/rectangle intersection and clipped area, without a centre-only test.

    Interior discs are exact. Edge-clipped areas use 12-point Gauss quadrature;
    boolean intersection is exact apart from floating point. The sum is additive
    area, not an occlusion union or a count of material pixels.
    """
    left, top, right, bottom = rect
    dx = cx - np.clip(cx, left, right)
    dy = cy - np.clip(cy, top, bottom)
    intersects = dx * dx + dy * dy < radius * radius
    area = np.zeros(len(cx))
    inside = intersects & (cx - radius >= left) & (cx + radius <= right) & \
        (cy - radius >= top) & (cy + radius <= bottom)
    area[inside] = math.pi * radius[inside] ** 2
    indices = np.flatnonzero(intersects & ~inside)
    if len(indices):
        x, y, r = cx[indices], cy[indices], radius[indices]
        lo, hi = np.maximum(left - x, -r), np.minimum(right - x, r)
        nodes = (lo + hi)[:, None] / 2 + (hi - lo)[:, None] / 2 * QUADRATURE_NODES
        half_height = np.sqrt(np.maximum(0, r[:, None] ** 2 - nodes ** 2))
        clipped_height = np.maximum(0, np.minimum(bottom - y[:, None], half_height) -
                                    np.maximum(top - y[:, None], -half_height))
        area[indices] = np.sum(clipped_height * QUADRATURE_WEIGHTS, axis=1) * (hi - lo) / 2
    return intersects, area


def visibility_weights(depth, corridor):
    near = np.clip((depth-corridor["nearHidden"])/(corridor["nearClear"]-corridor["nearHidden"]), 0, 1)
    far = np.clip((depth-corridor["farClear"])/(corridor["farHidden"]-corridor["farClear"]), 0, 1)
    return near*near*(3-2*near) * (1-far*far*(3-2*far))


def point_polyline_distance(points, track):
    points, track = np.asarray(points, dtype=float), np.asarray(track, dtype=float)
    start = track[:-1]
    segment = np.diff(track, axis=0)
    length_squared = np.sum(segment * segment, axis=1)
    length_squared[length_squared == 0] = 1
    distances = np.empty(len(points))
    # At most 32 * 20,000 segments are live at once; no full world-pair array.
    for offset in range(0, len(points), 32):
        delta = points[offset:offset + 32, None, :] - start[None, :, :]
        t = np.clip(np.sum(delta * segment, axis=2) / length_squared, 0, 1)
        delta -= t[:, :, None] * segment
        distances[offset:offset + 32] = np.sqrt(np.min(np.sum(delta * delta, axis=2), axis=1))
    return distances


def point_triangles_distance(points, triangles):
    """Exact distance from each query to a union of nondegenerate triangles."""
    result = np.full(len(points), np.inf)
    for offset in range(0, len(triangles), 256):
        tri = triangles[offset:offset + 256]
        a, b, c = tri[:, 0], tri[:, 1], tri[:, 2]
        ab, ac = b - a, c - a
        normal = np.cross(ab, ac)
        normal_squared = np.sum(normal * normal, axis=1)
        require((normal_squared > 1e-18).all(), "Degenerate triangle in distance audit.")
        for query_offset in range(0, len(points), 32):
            query = points[query_offset:query_offset + 32, None, :]
            delta = query - a
            d00, d01, d11 = np.sum(ab * ab, axis=1), np.sum(ab * ac, axis=1), np.sum(ac * ac, axis=1)
            d20, d21 = np.sum(delta * ab, axis=2), np.sum(delta * ac, axis=2)
            inverse = 1 / (d00 * d11 - d01 * d01)
            v = (d11 * d20 - d01 * d21) * inverse
            w = (d00 * d21 - d01 * d20) * inverse
            inside = (v >= 0) & (w >= 0) & (v + w <= 1)
            distance_squared = np.where(inside, np.sum(delta * normal, axis=2) ** 2 / normal_squared, np.inf)
            for edge_a, edge_b in ((a, b), (b, c), (c, a)):
                edge = edge_b - edge_a
                edge_squared = np.sum(edge * edge, axis=1)
                offset_from_edge = query - edge_a
                t = np.clip(np.sum(offset_from_edge * edge, axis=2) / edge_squared, 0, 1)
                closest = offset_from_edge - t[:, :, None] * edge
                distance_squared = np.minimum(distance_squared, np.sum(closest * closest, axis=2))
            sl = slice(query_offset, query_offset + len(query))
            result[sl] = np.minimum(result[sl], np.sqrt(np.min(distance_squared, axis=1)))
    return result


def motion_bound(group, vertices):
    if group["kind"] == "wave":
        return abs(group["amplitude"])
    if group["kind"] == "rotate":
        radius = float(np.linalg.norm(vertices - group["pivot"], axis=1).max())
        return 2 * radius if group["continuous"] else 2 * radius * math.sin(min(math.pi, abs(group["amplitude"])) / 2)
    return 0.0


def rail_metrics(objects, samples, progress_values, groups):
    vertex_count = sum(len(o["positions"]) // 3 for o in objects)
    face_count = sum(len(o["faces"]) for o in objects)
    work = (vertex_count + face_count) * (len(samples) - 1) + 2 * face_count * len(samples)
    require(work <= MAX_DISTANCE_WORK, f"Rail-distance workload {work:,} exceeds the bounded audit budget.")
    track = samples[:, 1:4]
    cumulative = np.concatenate(([0], np.cumsum(np.linalg.norm(np.diff(track, axis=0), axis=1))))
    object_distance_to_camera = []
    object_reports = []
    for obj in objects:
        vertices = np.asarray(obj["positions"], dtype=float).reshape(-1, 3)
        triangles = []
        centroids = []
        for face in obj["faces"]:
            centroids.append(np.mean(vertices[face], axis=0))
            triangles.append(vertices[[face[0], face[1], face[2]]])
            if len(face) == 4:
                triangles.append(vertices[[face[0], face[2], face[3]]])
        probes = np.concatenate((vertices, np.asarray(centroids)))
        distances = point_polyline_distance(probes, track)
        surface_distances = point_triangles_distance(track, np.asarray(triangles))
        object_distance_to_camera.append(surface_distances)
        closest = int(np.argmin(surface_distances))
        bound = motion_bound(groups[obj["motionGroup"]], vertices)
        object_reports.append(dict(
            id=obj["id"], name=obj["name"], paletteRole=obj["paletteRole"], motionGroup=obj["motionGroup"],
            vertices=len(vertices), faces=len(obj["faces"]),
            restProbeDistanceToRailWU=dict(min=float(distances.min()), median=float(np.median(distances)),
                                          p95=float(np.quantile(distances, 0.95)), max=float(distances.max())),
            restVertexMaximumDistanceToRailWU=float(distances[:len(vertices)].max()),
            restClosestSurfaceApproachWU=float(surface_distances[closest]), closestProgress=float(samples[closest, 0]),
            motionDisplacementBoundWU=bound,
            animatedVertexMaximumDistanceUpperBoundWU=float(distances[:len(vertices)].max()) + bound,
        ))
    distance_matrix = np.asarray(object_distance_to_camera)
    encounters = []
    for progress in progress_values:
        current_arc = float(np.interp(progress, samples[:, 0], cumulative))
        future = np.flatnonzero((cumulative >= current_arc + 2) & (cumulative <= current_arc + 40) &
                                (samples[:, 0] > progress))
        if not len(future):
            encounters.append(None)
            continue
        object_index, local_index = np.unravel_index(np.argmin(distance_matrix[:, future]), (len(objects), len(future)))
        sample_index = int(future[local_index])
        first_close = np.flatnonzero(np.min(distance_matrix[:, future], axis=0) <= 3)
        first_encounter = None
        if len(first_close):
            first_index = int(future[first_close[0]])
            first_object = int(np.argmin(distance_matrix[:, first_index]))
            first_encounter = dict(objectId=objects[first_object]["id"], progress=float(samples[first_index, 0]),
                                   distanceWU=float(distance_matrix[first_object, first_index]),
                                   travelAheadWU=float(cumulative[first_index] - current_arc))
        encounters.append(dict(objectId=objects[object_index]["id"], object=objects[object_index]["name"],
                               progress=float(samples[sample_index, 0]),
                               distanceWU=float(distance_matrix[object_index, sample_index]),
                               travelAheadWU=float(cumulative[sample_index] - current_arc),
                               firstApproachWithin3WU=first_encounter))
    return object_reports, encounters, float(cumulative[-1])


def beat_at(meta, progress):
    return next((b for b in meta["beats"] if b["start"] <= progress < b["end"]), meta["beats"][-1])


def round_number(value):
    return round(float(value), 6)


def object_contributions(region, region_data, rectangles, owner, selected, significant, weight, objects):
    intersects, area = region_data[region]
    counts = np.bincount(owner[selected[intersects & significant]], minlength=len(objects))
    areas = np.bincount(owner[selected], weights=area * weight, minlength=len(objects))
    center_areas = np.bincount(owner[selected], weights=region_data["center"][1] * weight, minlength=len(objects))
    left, top, right, bottom = rectangles[region]
    c_left, c_top, c_right, c_bottom = rectangles["center"]
    contributions = [dict(
        id=objects[i]["id"], count=int(count), floor="floor" in objects[i]["id"].lower(),
        areaPercent=round_number(areas[i] * 100 / ((right - left) * (bottom - top))),
        centerAreaPercent=round_number(center_areas[i] * 100 / ((c_right - c_left) * (c_bottom - c_top))),
    ) for i, count in enumerate(counts) if count]
    return sorted(contributions, key=lambda item: -item["areaPercent"])[:6]


def frame_metrics(meta, points, owner, objects, samples, progresses, times, viewports, scenarios, prose_margin):
    require(len(points) * len(progresses) * len(times) <= MAX_FRAME_WORK, "Projection workload exceeds audit budget.")
    positions = points[:, :3].astype(float)
    groups = points[:, 5].astype(int)
    largest_far = max(s["farHidden"] for s in scenarios)
    rows = []
    for seconds in times:
        world = animate_positions(positions, groups, meta["motionGroups"], seconds)
        for progress in progresses:
            position, quaternion = sample_camera(samples, progress)
            basis = camera_basis(quaternion)
            delta = world - position
            depth = np.sum(delta * basis[2], axis=1)
            possible = np.flatnonzero((depth > NEAR_CLIP) & (depth < largest_far))
            depth = depth[possible]
            horizontal = np.sum(delta[possible] * basis[0], axis=1)
            vertical = np.sum(delta[possible] * basis[1], axis=1)
            beat = beat_at(meta, progress)
            for viewport_name, width, height, reading_width in viewports:
                tan_x, tan_y = perspective(meta, width, height)
                cx = (horizontal / (depth * tan_x) + 1) * width / 2
                cy = (1 - vertical / (depth * tan_y)) * height / 2
                radii = points[possible, 3] * height / (2 * depth * tan_y)
                # Necessary frustum condition uses radius; a centre outside the
                # frame can still produce a large visible edge circle.
                in_bounds = (cx + radii > 0) & (cx - radii < width) & (cy + radii > 0) & (cy - radii < height)
                cx, cy, radii = cx[in_bounds], cy[in_bounds], radii[in_bounds]
                selected = possible[in_bounds]
                selected_depth = depth[in_bounds]
                rectangles = regions_for(width, height, prose_margin, reading_width)
                region_data = {name: disc_rectangle_area(cx, cy, radii, rect) for name, rect in rectangles.items()}
                weights = np.asarray([visibility_weights(selected_depth, s) for s in scenarios])
                for scenario_index, scenario in enumerate(scenarios):
                    weight = weights[scenario_index]
                    significant = weight >= VISIBLE_WEIGHT
                    metrics = {}
                    for name, (intersects, area) in region_data.items():
                        rect = rectangles[name]
                        region_area = (rect[2] - rect[0]) * (rect[3] - rect[1])
                        metrics[name] = dict(
                            areaPercent=round_number(np.sum(area * weight) / region_area * 100),
                            visibleAreaPercent=round_number(np.sum(area * weight * significant) / region_area * 100),
                            discCount=int(np.count_nonzero(intersects & (weight > 0))),
                            visibleDiscCount=int(np.count_nonzero(intersects & significant)),
                        )
                    full_area = np.sum(region_data["full"][1] * weight)
                    floor_area = np.sum(region_data["floor"][1] * weight)
                    floor_share = float(floor_area / full_area) if full_area else 0
                    left, right = metrics["left"]["areaPercent"], metrics["right"]["areaPercent"]
                    balance = min(left, right) / max(left, right) if max(left, right) else 0
                    rows.append(dict(
                        viewport=viewport_name, width=width, height=height, progress=round_number(progress),
                        ambientSeconds=seconds, beat=beat["id"], kind=beat["kind"], scenario=scenario["id"],
                        regions=metrics, floorShare=round_number(floor_share), bilateralRatio=round_number(balance),
                        floorOnlyCandidate=bool(full_area and floor_share >= 0.85 and
                                                metrics["center"]["areaPercent"] < EMPTY_AREA_PERCENT),
                        lowCoverage=metrics["full"]["areaPercent"] < EMPTY_AREA_PERCENT,
                        noVisibleDiscs=metrics["full"]["visibleDiscCount"] == 0,
                        proseIntrusions=object_contributions("prose", region_data, rectangles, owner, selected,
                                                            significant, weight, objects) if beat["kind"] == "prose" else [],
                        centerContributions=object_contributions("center", region_data, rectangles, owner, selected,
                                                                 significant, weight, objects),
                    ))
        print(f"Projected {len(progresses)} source poses × {len(viewports)} viewports at ambient {seconds:g}s.", flush=True)
    return rows


def summarize_frames(rows):
    result = []
    keys = sorted({(r["viewport"], r["scenario"], r["beat"]) for r in rows})
    for viewport, scenario, beat in keys:
        selected = [r for r in rows if (r["viewport"], r["scenario"], r["beat"]) == (viewport, scenario, beat)]
        coverage = [r["regions"]["full"]["areaPercent"] for r in selected]
        result.append(dict(
            viewport=viewport, scenario=scenario, beat=beat, kind=selected[0]["kind"], frames=len(selected),
            coveragePercent=dict(min=min(coverage), median=round_number(np.median(coverage)), max=max(coverage)),
            lowCoverageFrames=sum(r["lowCoverage"] for r in selected),
            noVisibleDiscFrames=sum(r["noVisibleDiscs"] for r in selected),
            bilateralMedian=round_number(np.median([r["bilateralRatio"] for r in selected])),
            floorOnlyCandidateFrames=sum(r["floorOnlyCandidate"] for r in selected),
            proseFramesWithVisibleIntersections=sum(r["regions"]["prose"]["visibleDiscCount"] > 0 for r in selected)
            if selected[0]["kind"] == "prose" else None,
            maximumProseVisibleIntersections=max(r["regions"]["prose"]["visibleDiscCount"] for r in selected)
            if selected[0]["kind"] == "prose" else None,
            maximumProseAreaPercent=max(r["regions"]["prose"]["areaPercent"] for r in selected)
            if selected[0]["kind"] == "prose" else None,
            maximumProseCenterVisibleAreaPercent=max(r["regions"]["center"]["visibleAreaPercent"] for r in selected)
            if selected[0]["kind"] == "prose" else None,
        ))
    return result


def write_chart(path, rows, meta, viewports, scenario):
    selected_rows = [r for r in rows if r["scenario"] == scenario]
    width, height = 1160, 110 + 235 * len(viewports)
    margin, graph_width = 90, 1030
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
             '<rect width="100%" height="100%" fill="#fafafa"/>',
             '<g font-family="sans-serif" fill="#222">',
             f'<text x="24" y="28" font-size="18">{html.escape(scenario)}: nominal projected circle area along the route</text>',
             '<text x="24" y="48" font-size="12">Additive sampled-radius area. Home body sizing, occlusion and atlas alpha are not modeled.</text>']
    colors = dict(full="#111111", left="#9a3b27", right="#285799", center="#9d347d", bottom="#38734c")
    for row_index, (name, canvas_width, canvas_height, _reading_width) in enumerate(viewports):
        top, graph_height = 92 + row_index * 235, 164
        subset = [r for r in selected_rows if r["viewport"] == name]
        progresses = sorted({r["progress"] for r in subset})
        values = {region: [float(np.median([r["regions"][region]["areaPercent"] for r in subset if r["progress"] == progress]))
                           for progress in progresses] for region in colors}
        maximum = max(2, max(max(v) for v in values.values()))
        parts.append(f'<text x="24" y="{top - 16}" font-size="14">{html.escape(name)} · inner {canvas_width:.2f}×{canvas_height:.2f} · scale 0–{maximum:.1f}%</text>')
        for beat in meta["beats"]:
            x = margin + beat["start"] * graph_width
            w = (beat["end"] - beat["start"]) * graph_width
            if beat["kind"] == "prose":
                parts.append(f'<rect x="{x:.2f}" y="{top}" width="{w:.2f}" height="{graph_height}" fill="#eeeeee"/>')
            parts.append(f'<line x1="{x:.2f}" x2="{x:.2f}" y1="{top}" y2="{top + graph_height}" stroke="#ddd"/>')
        for region, color in colors.items():
            vertices = []
            for progress, value in zip(progresses, values[region]):
                vertices.append(f"{margin + progress * graph_width:.2f},{top + graph_height * (1 - value / maximum):.2f}")
            parts.append(f'<polyline points="{" ".join(vertices)}" fill="none" stroke="{color}" stroke-width="1.5"/>')
        for progress in (0, 0.2, 0.4, 0.6, 0.8, 1):
            parts.append(f'<text x="{margin + progress * graph_width:.1f}" y="{top + graph_height + 18}" font-size="11">{progress:.0%}</text>')
    for i, (region, color) in enumerate(colors.items()):
        parts.append(f'<text x="{90 + i * 170}" y="{height - 14}" fill="{color}" font-size="12">{region}</text>')
    parts.append('</g></svg>')
    path.write_text("\n".join(parts) + "\n")


def write_outputs(output_dir, report):
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "composition.json").write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    columns = ["viewport", "progress", "ambientSeconds", "beat", "kind", "scenario", "fullAreaPercent",
               "leftAreaPercent", "rightAreaPercent", "topAreaPercent", "bottomAreaPercent", "centerAreaPercent",
               "proseAreaPercent", "proseDiscs", "proseVisibleDiscs", "visibleDiscs", "bilateralRatio", "floorShare",
               "lowCoverage", "noVisibleDiscs"]
    with (output_dir / "frames.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        for row in report["frames"]:
            flat = {key: row[key] for key in columns if key in row}
            for region in ("full", "left", "right", "top", "bottom", "center", "prose"):
                flat[region + "AreaPercent"] = row["regions"][region]["areaPercent"]
            flat.update(proseDiscs=row["regions"]["prose"]["discCount"],
                        proseVisibleDiscs=row["regions"]["prose"]["visibleDiscCount"],
                        visibleDiscs=row["regions"]["full"]["visibleDiscCount"])
            writer.writerow(flat)
    focus = report["method"]["chartScenario"]
    corridor = next(item for item in report["method"]["visibilityScenarios"] if item["id"] == focus)
    lines = ["# About composition audit", "", f"Source SHA: `{report['identity']['source']['sha256']}`", "",
             "This is source projection evidence, not a screenshot or a release verdict.", "",
             f"Selected scenario: **{focus}**. Shared near fade {corridor['nearHidden']:g}–{corridor['nearClear']:g} WU; "
             f"shared far fade {corridor['farClear']:g}–{corridor['farHidden']:g} WU, including the final wall.", "",
             f"Saved browser config SHA: `{report['method']['visibilitySource']['sha256']}`.", "",
             "Circle footprints use nominal sampled world radii; they do not certify the Home material's rendered size.", "",
             f"{report['method']['routePoseCount']} poses × {len(report['method']['ambientSeconds'])} ambient phases × "
             f"{len(report['method']['viewports'])} inner-window sizes. {report['identity']['circleCount']:,} actual sampled circles.", "",
             "## Objects furthest from the rail", "",
             "| Object | Rest vertex max WU | Closest surface WU | Motion bound WU |", "|---|---:|---:|---:|"]
    for obj in sorted(report["objects"], key=lambda o: -o["restVertexMaximumDistanceToRailWU"])[:12]:
        lines.append(f"| {obj['name']} | {obj['restVertexMaximumDistanceToRailWU']:.2f} | "
                     f"{obj['restClosestSurfaceApproachWU']:.2f} | {obj['motionDisplacementBoundWU']:.2f} |")
    lines += ["", f"## {focus}: coverage by beat", "",
              "Area is summed nominal circle footprint weighted by the shared visibility corridor. Overlaps are counted more than once.", "",
              "| View | Beat | Area median % | Low-coverage frames | Prose frames with visible discs |",
              "|---|---|---:|---:|---:|"]
    for row in report["summary"]:
        if row["scenario"] == focus:
            prose = "—" if row["proseFramesWithVisibleIntersections"] is None else str(row["proseFramesWithVisibleIntersections"])
            lines.append(f"| {row['viewport']} | {row['beat']} | {row['coveragePercent']['median']:.3f} | "
                         f"{row['lowCoverageFrames']}/{row['frames']} | {prose} |")
    lines += ["", "## Interpretation and limits", ""] + [f"- {item}" for item in report["limits"]]
    (output_dir / "README.md").write_text("\n".join(lines) + "\n")
    write_chart(output_dir / "coverage.svg", report["frames"], report["metaSummary"], report["method"]["viewports"],
                report["method"]["chartScenario"])


def self_test():
    x, y, r = np.array([0.0, 1.1, 0.0]), np.array([0.0, 0.0, 0.0]), np.array([0.5, 0.2, 2.0])
    hits, areas = disc_rectangle_area(x, y, r, (-1, -1, 1, 1))
    require(hits.all(), "Disc centred outside the region must still intersect its edge.")
    require(abs(areas[0] - math.pi * 0.25) < 1e-12 and abs(areas[2] - 4) < 1e-12,
            "Clipped disc area fixtures failed.")
    hits, areas = disc_rectangle_area(np.array([0.0]), np.array([0.0]), np.array([1.0]), (0, -1, 1, 1))
    require(hits[0] and abs(areas[0] - math.pi / 2) < 0.002, "Half-disc area fixture failed.")
    camera = np.array([[0, 0, 0, 0, 0, 0, 0, 1], [1, 2, 0, 0, 0, 0, 0, -1]], dtype=float)
    position, quaternion = sample_camera(camera, 0.5)
    require(np.allclose(position, [1, 0, 0]) and np.allclose(quaternion, [0, 0, 0, 1]), "Camera short-arc fixture failed.")
    require(np.allclose(camera_basis(quaternion)[2], [0, 0, -1]), "Camera forward convention failed.")
    distances = point_polyline_distance(np.array([[1, 3, 0], [-2, 0, 0]]), np.array([[0, 0, 0], [2, 0, 0]]))
    require(np.allclose(distances, [3, 2]), "Polyline fixture failed.")
    distances = point_triangles_distance(np.array([[0.25, 0.25, 2], [2, 0, 0]]),
                                         np.array([[[0, 0, 0], [1, 0, 0], [0, 1, 0]]], dtype=float))
    require(np.allclose(distances, [2, 1]), "Triangle interior/edge fixtures failed.")
    corridor = validate_visibility(dict(nearHidden=1., nearClear=3., farClear=10., farHidden=14.))
    depths = np.array([-1., 1., 2., 3., 10., 12., 14., 20., 12.])
    weights = visibility_weights(depths, corridor)
    require(np.allclose(weights, [0, 0, .5, 1, 1, .5, 0, 0, .5]),
            "Shared near/far visibility boundaries and midpoints failed.")
    require(weights[5] == weights[-1], "Equal camera depths must have equal visibility, including the final wall.")
    try:
        validate_visibility(dict(nearHidden=3., nearClear=3., farClear=10., farHidden=14.))
    except ValueError:
        pass
    else:
        raise ValueError("Zero-width near fade must be rejected.")
    rotation = dict(id=0, kind="rotate", axis=[0, 0, 1], pivot=[0, 0, 0], amplitude=math.pi / 2,
                    period=4, phase=0, continuous=False)
    moved = animate_positions(np.array([[1, 0, 0]], dtype=float), np.array([0]), [rotation], 1)
    repeated = animate_positions(np.array([[1, 0, 0]], dtype=float), np.array([0]), [rotation], 5)
    require(np.allclose(moved, [[0, 1, 0]]) and np.allclose(moved, repeated), "Absolute-time rotation fixture failed.")
    print("Composition audit self-checks passed: disc edges/areas, camera interpolation, geometric distances, shared visibility, absolute motion.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", type=Path)
    parser.add_argument("--sampled", type=Path)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--samples", type=int, default=121)
    parser.add_argument("--times", default="0,1.75,7,14")
    parser.add_argument("--prose-margin", type=float, default=24)
    parser.add_argument("--design-system", type=Path, default=REPO/"react-app/app/public/config/design-system.json")
    parser.add_argument("--viewport", action="append", help="name,innerWidth,innerHeight,measuredReadingWidth; repeatable.")
    parser.add_argument("--visibility", action="append", help="nearHidden,nearClear,farClear,farHidden comparison; repeatable.")
    parser.add_argument("--chart-scenario", default="canonical", help="canonical, or candidate-N from --visibility.")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    require(args.bundle and args.sampled and args.output_dir, "Provide --bundle, --sampled and --output-dir.")
    bundle_dir, sampled_dir, output_dir = args.bundle.resolve(), args.sampled.resolve(), args.output_dir.resolve()
    require(not output_dir.is_relative_to(bundle_dir) and not output_dir.is_relative_to(sampled_dir) and
            not output_dir.is_relative_to(REPO / "source-assets"), "Reports cannot be written into source or bundle directories.")
    require(101 <= args.samples <= 501 and 0 <= args.prose_margin <= 100, "Invalid audit sampling settings.")
    times = [float(t) for t in args.times.split(",")]
    require(1 <= len(times) <= 8 and all(math.isfinite(t) and t >= 0 for t in times), "Invalid ambient phases.")
    canonical_visibility, visibility_source = load_visibility(args.design_system.resolve())
    started = time.monotonic()
    meta, samples, objects, points, owner, ranges, identity = load_inputs(bundle_dir, sampled_dir)
    progresses = sorted(set(round(float(p), 10) for p in np.linspace(0, 1, args.samples)) |
                        {b["start"] for b in meta["beats"]} |
                        {(b["start"] + b["end"]) / 2 for b in meta["beats"]})
    viewports = []
    for specification in args.viewport or ["desktop,1254.65625,619.328125,702.59375", "portrait,365.34375,743.671875,236.140625"]:
        name, width, height, reading_width = specification.split(",")
        width, height, reading_width = float(width), float(height), float(reading_width)
        require(name and all(math.isfinite(v) and 0 < v <= 4096 for v in (width, height, reading_width)) and
                reading_width <= width, "Invalid viewport measurement.")
        viewports.append((name, width, height, reading_width))
    require(1 <= len(viewports) <= 3 and len({v[0] for v in viewports}) == len(viewports), "Use one to three named viewports.")
    scenarios = [dict(id="canonical", **canonical_visibility)]
    require(len(args.visibility or []) <= 24, "Too many comparison corridors.")
    for index, specification in enumerate(args.visibility or []):
        values = [float(value) for value in specification.split(",")]
        require(len(values) == 4, "A visibility corridor needs four values.")
        scenarios.append(dict(id=f"candidate-{index+1}", **validate_visibility(dict(zip(VISIBILITY_KEYS, values)))))
    require(args.chart_scenario in {s["id"] for s in scenarios}, "Unknown chart scenario.")
    object_reports, encounters, track_length = rail_metrics(objects, samples, progresses, meta["motionGroups"])
    print(f"Read {len(objects)} objects / {len(points):,} circles; rail metrics complete.", flush=True)
    frames = frame_metrics(meta, points, owner, objects, samples, progresses, times, viewports, scenarios, args.prose_margin)
    limits = [
        "The default frames use root-measured inner-window sizes (desktop physical1280×720 →1254.65625×619.328125; portrait390×844 →365.34375×743.671875). Shell pixels are excluded. Explicit --viewport measurements override the defaults.",
        "Source camera positions use linear interpolation and quaternion shortest-arc slerp, matching runtime. Footprints use nominal browser-sampler world radii; the actual Home body-sizing helper, mobile size scaling and atlas alpha coverage are not modeled. These area and intrusion counts do not certify rendered material size or text clearance.",
        "Coverage is additive nominal disc area, weighted by smoothstep(nearHidden,nearClear,depth) × (1−smoothstep(farClear,farHidden,depth)). The four values come from the hashed canonical design config and apply equally to all groups and the ending. This is not a raster union, glyph clearance, contrast, or screenshot proof; overlap can exceed100%.",
        "Disc/region intersection includes circles whose centers are outside the region. Edge-clipped areas use12-point quadrature, so tiny slivers have approximate area but still count as intersections.",
        "Visible disc means the shared corridor weight is at least5%. All nonzero-weight intersections are also retained; barely visible and fully hidden points are not treated as equally important.",
        "The prose envelope is full-height only for background, disciplines and method. It uses root-measured DOM column widths (desktop702.59375px; portrait236.140625px) plus the reported horizontal margin. Real glyph rectangles, other font scales and other viewport sizes still need browser inspection.",
        "Title beats have center-region diagnostics, not the prose exclusion rule. Busy central material is intentional below centered titles. A floor-only candidate places≥85% of projected area in the bottom40% with<0.25% central coverage. This describes composition; it is not a title-clearance requirement.",
        "Low coverage means summed visibility-weighted nominal full-frame area<0.25%; it is a proposed review threshold, not an approved aesthetic failure. Bilateral ratio compares equally sized left/right quarter strips. Intentional floor-only passages need not be bilateral.",
        "Rail distance uses every rest vertex and face centroid against the complete source camera polyline. It does not prove a maximum for every point on a large face. The separate nearest-surface metric uses exact point-to-triangle distance at every baked camera sample.",
        "Future flyby means closest rest surface at baked camera poses2–40WU ahead along the rail; firstApproachWithin3WU additionally gives the earliest close encounter within that horizon. Both are independent of camera aim and visibility settings; a nearby surface may be behind or outside the view. The finale hold has no future rail travel.",
        "The reported sampled ambient phases and discrete route poses do not prove all continuous motion extrema. Per-object motion-displacement upper bounds expose unsampled excursions; browser forward/reverse/hold review remains necessary.",
        "Optional --visibility comparisons apply one shared corridor to every group. They are calculations only; the saved design config, camera, surfaces, circle density, motion and runtime are never changed by this audit.",
    ]
    report = dict(
        schema="about-composition-audit/v2", identity=identity,
        method=dict(routePoseCount=len(progresses), routeProgress=progresses, ambientSeconds=times,
                    viewports=viewports, visibilitySource=visibility_source, canonicalVisibility=canonical_visibility,
                    visibilityScenarios=scenarios, radiusModel="nominal-sampled-world-radius",
                    chartScenario=args.chart_scenario,
                    proseHorizontalMarginPx=args.prose_margin, visibleWeight=VISIBLE_WEIGHT,
                    lowCoverageAreaPercent=EMPTY_AREA_PERCENT, trackLengthWU=track_length,
                    regions={name: regions_for(w, h, args.prose_margin, rw) for name, w, h, rw in viewports},
                    perspective={name: dict(tanHalfHorizontal=perspective(meta, w, h)[0],
                                            tanHalfVertical=perspective(meta, w, h)[1]) for name, w, h, _ in viewports}),
        metaSummary=dict(beats=meta["beats"], camera=meta["camera"], finalGrid=meta.get("finalGrid")),
        objects=object_reports, futureEncounters=[dict(progress=p, encounter=e) for p, e in zip(progresses, encounters)],
        summary=summarize_frames(frames), frames=frames, limits=limits,
        elapsedSeconds=round(time.monotonic() - started, 3),
    )
    write_outputs(output_dir, report)
    print(json.dumps(dict(source=identity["source"], poses=len(progresses), circleCount=len(points),
                          projectedFrames=len(progresses) * len(times) * len(viewports),
                          scenarioRows=len(frames), elapsedSeconds=report["elapsedSeconds"],
                          reports=str(output_dir)), indent=2))


if __name__ == "__main__":
    main()
