"""Open selected saved tunnel stretches; preserve the live rail and other edits."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

REVISION = "open-gates-20260919-v1"
PASSAGES = (
    dict(name="Tunnel A", region="tunnel-a", start=.20, end=.40,
         openStart=.235, openEnd=.345, radius=2.65, sides=0,
         staticGates=[.242, .286, .336], movingGates=[(2, .262), (3, .312)]),
    dict(name="Tunnel B", region="tunnel-b", start=.745, end=.90,
         openStart=.775, openEnd=.855, radius=2.55, sides=4,
         staticGates=[.780, .811, .850], movingGates=[(2, .79305), (3, .8318)]),
)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def geometry_hash(obj):
    return digest([list(v.co) for v in obj.data.vertices])


def rail_hash(rail):
    return digest(dict(matrix=[list(row) for row in rail.matrix_world],
                       splines=[[(list(p.co), p.tilt) for p in s.points] for s in rail.data.splines]))


def rest_point(obj, vertex):
    return ((obj.matrix_local @ vertex.co) + obj.parent.location
            if obj.parent else obj.matrix_world @ vertex.co)


def replace_points(obj, positions):
    inverse = obj.matrix_local.inverted() if obj.parent else obj.matrix_world.inverted()
    pivot = obj.parent.location if obj.parent else Vector((0, 0, 0))
    obj.data.clear_geometry()
    obj.data.from_pydata([inverse @ (p-pivot) for p in positions], [], [])
    obj.data.update()


def refine_scene(scene):
    if scene.get("openGateRevision"):
        raise ValueError("This source already contains the open-gate refinement")
    if scene.get("about_schema") != "about-rollercoaster-world/v1":
        raise ValueError("Expected the saved About rollercoaster world")
    controls = bpy.data.objects["About World Controls"]
    camera, rail = bpy.data.objects["FlightCamera"], bpy.data.objects["FlightRail"]
    original_clock = {k: controls[k] for k in ("progress", "referenceMode", "ambientSeconds")}
    original_frame = scene.frame_current
    before_rail = rail_hash(rail)
    before_beats = scene["beats"]
    before_motion = scene["motionGroups"]
    controls["referenceMode"] = 0.
    controls["ambientSeconds"] = 0.
    controls.update_tag(); scene.frame_set(1); bpy.context.view_layer.update()
    point_objects = [o for o in scene.objects if o.get("about_points")]
    grid_objects = [o for o in point_objects if o.name.startswith("Final full colour grid")]
    target_names = [f"{p['name']} continuous enclosure" for p in PASSAGES]
    target_names += [f"{p['name']} threshold {i}" for p in PASSAGES for i, _ in p["movingGates"]]
    target = [o for o in point_objects if any(o.name.startswith(n + " · role ") for n in target_names)]
    if len(target) != 36 or len(grid_objects) != 6:
        raise ValueError("Saved target mesh identities differ; inspect before refining")
    untouched = {o.name: geometry_hash(o) for o in point_objects if o not in target + grid_objects}
    spacing, radius = float(controls["circleSpacing"]), float(controls["circleRadius"])
    if spacing < 2*radius:
        raise ValueError("The common circle spacing must exceed the diameter")
    report = dict(revision=REVISION, beforePoints=sum(len(o.data.vertices) for o in point_objects),
                  railSha256=before_rail, passages=[])

    # Project every retained lattice cell back to its original plane. Restore the
    # existing six-role mosaic where the previous lower bay forced neutral cells.
    grid = json.loads(scene["finalGrid"])
    origin, normal, u, v = (Vector(grid[k]) for k in ("origin", "normal", "uAxis", "vAxis"))
    planar = [[] for _ in range(6)]
    grid_count = sum(len(o.data.vertices) for o in grid_objects)
    if grid_count != grid["columns"] * grid["rows"]:
        raise ValueError("The saved grid is incomplete")
    for obj in grid_objects:
        for vertex in obj.data.vertices:
            point = rest_point(obj, vertex)
            local = point-origin
            x, y = local.dot(u), local.dot(v)
            col = round(x/spacing + (grid["columns"]-1)/2)
            row = round(y/spacing + (grid["rows"]-1)/2)
            role = (col//26 + row//25) % 6
            planar[role].append(point-normal*local.dot(normal))
    for obj in grid_objects:
        replace_points(obj, planar[int(obj["palette_index"])])
    grid.pop("supportBay", None)
    grid["restShape"] = "single-plane-complete-grid"
    scene["finalGrid"] = json.dumps(grid)

    rail_points = [rail.matrix_world @ Vector(p.co[:3]) for p in rail.data.splines[0].points]
    hold = float(controls["arrivalHoldStart"])
    rail_progress = [i/(len(rail_points)-1)*hold for i in range(len(rail_points))]
    additions = []
    regions = json.loads(scene["regions"])
    for passage in PASSAGES:
        prefix = passage["name"]
        rows = [(i, p) for i, p in enumerate(rail_progress) if passage["start"]-.01 <= p <= passage["end"]+.01]
        tree = KDTree(len(rows))
        for index, (i, _) in enumerate(rows):
            tree.insert(rail_points[i], index)
        tree.balance()

        def progress_of(point):
            return rows[tree.find(point)[1]][1]

        surfaces = [o for o in target if o.name.startswith(prefix+" continuous enclosure")]
        removed = 0
        for obj in surfaces:
            positions = [rest_point(obj, vertex) for vertex in obj.data.vertices]
            keep = [p for p in positions if not passage["openStart"] <= progress_of(p) <= passage["openEnd"]]
            removed += len(positions)-len(keep)
            replace_points(obj, keep)
            obj["source_edit_note"] = "Persistent enclosure ends with discrete open gates between them. Mesh vertices remain authoritative."

        # Do not leave the old solid guide pretending this stretch is enclosed.
        proxy = bpy.data.objects.get(prefix+" · editable enclosing surface")
        if proxy:
            import bmesh
            bm = bmesh.new(); bm.from_mesh(proxy.data)
            cut = [face for face in bm.faces if any(passage["openStart"] <= progress_of(proxy.matrix_world @ vert.co) <= passage["openEnd"] for vert in face.verts)]
            bmesh.ops.delete(bm, geom=cut, context="FACES")
            bm.to_mesh(proxy.data); bm.free(); proxy.data.update()

        gates = [(p, None, 0.) for p in passage["staticGates"]]
        gates += [(p, event, math.pi/4 if passage["sides"] else 0.) for event, p in passage["movingGates"]]
        for progress, event, twist in sorted(gates):
            controls["progress"] = progress; controls.update_tag(); scene.frame_set(1); bpy.context.view_layer.update()
            matrix = camera.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world
            center = matrix.translation
            forward = (matrix.to_quaternion() @ Vector((0, 0, -1))).normalized()
            right = forward.cross(Vector((0, 0, 1))).normalized()
            up = right.cross(forward).normalized()
            owners = ([o for o in target if o.name.startswith(f"{prefix} threshold {event} · role ")]
                      if event else surfaces)
            if event:
                # Keep the same moving assembly and clock, without an inner
                # threshold nested inside an outer shell at this station.
                center = owners[0].parent.location.copy()
                for obj in owners:
                    replace_points(obj, [])
            ring = []
            a = passage["radius"]
            if passage["sides"] == 0:
                count = math.floor(math.pi/math.asin(spacing/(2*a)))
                ring = [(a*math.cos(2*math.pi*k/count), a*math.sin(2*math.pi*k/count)) for k in range(count)]
            else:
                count = math.floor(2*a/spacing)
                corners = [(-a, -a), (a, -a), (a, a), (-a, a)]
                for first, last in zip(corners, corners[1:]+corners[:1]):
                    ring.extend([(first[0]+(last[0]-first[0])*k/count, first[1]+(last[1]-first[1])*k/count) for k in range(count)])
            by_role = {int(o["palette_index"]): o for o in owners}
            for depth in (-2*spacing, -spacing, 0, spacing, 2*spacing):
                for index, (x, y) in enumerate(ring):
                    xx, yy = x*math.cos(twist)-y*math.sin(twist), x*math.sin(twist)+y*math.cos(twist)
                    point = center+right*xx+up*yy+forward*depth
                    role = (int(index/len(ring)*6)+(event or 0)) % 6
                    additions.append((by_role[role], point))
        region = next(r for r in regions if r["id"] == passage["region"])
        open_fraction = (passage["openEnd"]-passage["openStart"])/(passage["end"]-passage["start"])
        region["geometryRuns"] = [dict(kind="enclosed", start=passage["start"], end=passage["openStart"]),
                                  dict(kind="open-gates", start=passage["openStart"], end=passage["openEnd"]),
                                  dict(kind="enclosed", start=passage["openEnd"], end=passage["end"])]
        region["gateStations"] = [dict(progress=p, shape="round" if not passage["sides"] else ("diamond" if event else "square"), animated=bool(event)) for p, event, _ in sorted(gates)]
        region["openFractionOfPassage"] = open_fraction
        region["gateDepthWU"] = 4*spacing
        region["events"] = (["enclosed descent", "open round hoops", "banked open turn", "enclosed ascending exit"]
                            if not passage["sides"] else ["side entrance", "enclosed climb", "open square gates", "moving diamond gates", "enclosed opposing turn", "release"])
        report["passages"].append(dict(name=prefix, removedSurfacePoints=removed, **{k: region[k] for k in ("geometryRuns", "gateStations", "openFractionOfPassage", "gateDepthWU")}))
    scene["regions"] = json.dumps(regions)

    # Respect the common physical spacing against ALL retained geometry. Only new
    # gate candidates are rejected; no unrelated saved point is moved or deleted.
    occupied = {}
    for obj in point_objects:
        for vertex in obj.data.vertices:
            point = rest_point(obj, vertex)
            key = tuple(math.floor(x/spacing) for x in point)
            occupied.setdefault(key, []).append(point)
    new_by_object = {}
    rejected = 0
    for obj, point in additions:
        key = tuple(math.floor(x/spacing) for x in point)
        if any((point-other).length < spacing*.9998 for dx in (-1,0,1) for dy in (-1,0,1) for dz in (-1,0,1)
               for other in occupied.get((key[0]+dx, key[1]+dy, key[2]+dz), ())):
            rejected += 1
            continue
        occupied.setdefault(key, []).append(point)
        new_by_object.setdefault(obj.name, []).append(point)
    for name, positions in new_by_object.items():
        obj = bpy.data.objects[name]
        replace_points(obj, [rest_point(obj, v) for v in obj.data.vertices]+positions)
    for key, value in original_clock.items():
        controls[key] = value
    controls.update_tag(); scene.frame_set(original_frame); bpy.context.view_layer.update()
    if rail_hash(rail) != before_rail or scene["beats"] != before_beats or scene["motionGroups"] != before_motion:
        raise AssertionError("Protected rail, timing or motion definitions changed")
    if any(geometry_hash(bpy.data.objects[name]) != value for name, value in untouched.items()):
        raise AssertionError("Unrelated saved point geometry changed")
    grid_error = max(abs((rest_point(obj, vertex)-origin).dot(normal)) for obj in grid_objects for vertex in obj.data.vertices)
    if grid_error > 2e-5 or sum(len(o.data.vertices) for o in grid_objects) != grid_count:
        raise AssertionError("The complete grid must occupy one rest plane")
    scene["openGateRevision"] = REVISION
    report.update(afterPoints=sum(len(o.data.vertices) for o in point_objects), addedGatePoints=len(additions)-rejected,
                  rejectedGateCandidates=rejected, gridPoints=grid_count, gridMaxPlaneErrorWU=grid_error,
                  untouchedPointObjects=len(untouched), protectedRailTimingMotionUnchanged=True)
    return report


def validate_paths(source, target, report):
    source, target, report = (Path(p).resolve() for p in (source, target, report))
    master = (Path(__file__).resolve().parents[2] / "source-assets/about-rollercoaster-reset/about-rollercoaster.blend").resolve()
    if target.exists() or source == target or target.name == "about-rollercoaster.blend":
        raise ValueError("Write a new named candidate; never overwrite the master in this utility")
    protected = (source, target, master)
    aliases_source = report.exists() and any(p.exists() and report.samefile(p) for p in protected)
    if report.suffix.lower() != ".json" or report in protected or aliases_source:
        raise ValueError("Report must be a separate .json file, never a source, candidate or master alias")
    return source, target, report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--candidate-output", required=True)
    parser.add_argument("--report", required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    source, target, report_path = validate_paths(args.source, args.candidate_output, args.report)
    original_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source))
    report = refine_scene(bpy.context.scene)
    target.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(target))
    bpy.ops.wm.open_mainfile(filepath=str(target))
    if rail_hash(bpy.data.objects["FlightRail"]) != report["railSha256"]:
        raise AssertionError("Rail differs after reopen")
    if hashlib.sha256(source.read_bytes()).hexdigest() != original_hash:
        raise AssertionError("Original source changed")
    report.update(source=str(source), sourceSha256=original_hash, candidate=str(target),
                  candidateSha256=hashlib.sha256(target.read_bytes()).hexdigest(), reopened=True)
    report_path.write_text(json.dumps(report, indent=2)+"\n")
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
