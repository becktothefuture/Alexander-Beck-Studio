"""Saved-source integration proof, using only a separate output directory.

Runs the actual exporter and JavaScript contract/sampler/motion evaluator, then
edits a copied Bezier rail. Does not modify the input or canonical bundle.
"""
import argparse
import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
from pathlib import Path

import bpy
from mathutils import Vector

REPO = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("surface_export", Path(__file__).with_name("export-surfaces.py"))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


def source_contract():
    scene = bpy.context.scene
    meshes = sorted((obj for obj in scene.objects if obj.type == "MESH" and not obj.get("about_preview_only")), key=lambda obj: obj.name)
    rows = [dict(name=obj.name, id=obj.get("about_surface_id"),
                 vertices=[list(v.co) for v in obj.data.vertices], faces=[list(p.vertices) for p in obj.data.polygons],
                 materials=[slot.material.name for slot in obj.material_slots], motion=obj.get("motion_group", 0),
                 binding=obj.get("about_track_binding"), reference=obj.get("about_track_reference_length")) for obj in meshes]
    anchors = {obj.name: obj.constraints[0].offset_factor for obj in scene.objects
               if obj.get("about_track_binding") == exporter.ANCHOR_BINDING}
    return dict(meshCount=len(meshes), geometryIdentity=hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest(), stations=anchors)


def station_proof():
    scene = bpy.context.scene
    rail, controls = scene.objects["FlightRail"], scene.objects["About World Controls"]
    exporter.update_scene(scene, controls)
    surfaces = [obj for obj in scene.objects if obj.type == "MESH" and obj.get("about_track_binding") == exporter.SURFACE_BINDING]
    if not surfaces:
        raise AssertionError("The candidate contains no normalized static surfaces")
    helper = bpy.data.objects.new("Isolated normalized-station audit", None)
    scene.collection.objects.link(helper)
    follow = helper.constraints.new("FOLLOW_PATH")
    follow.target = rail
    follow.use_fixed_location = follow.use_curve_follow = True
    follow.forward_axis, follow.up_axis = "FORWARD_Y", "UP_Z"
    rows = []
    try:
        for obj in surfaces:
            local, _, _ = exporter.read_surface(obj, evaluated=True)
            matrix = exporter.evaluated_matrix(obj)
            indices = {0, len(local)-1, len(local)//2,
                       min(range(len(local)), key=lambda i: obj.data.vertices[i].co.x),
                       max(range(len(local)), key=lambda i: obj.data.vertices[i].co.x)}
            maximum = 0.
            worst = None
            for index in indices:
                encoded = obj.data.vertices[index].co
                clamped = min(360., max(0., encoded.x))
                follow.offset_factor = clamped/360.
                bpy.context.view_layer.update()
                frame = exporter.evaluated_matrix(helper)
                expected = frame @ Vector((encoded.y, encoded.x-clamped, encoded.z))
                actual = matrix @ local[index]
                error = (expected-actual).length
                if error >= maximum:
                    maximum = error
                    local_error = frame.to_3x3().transposed() @ (actual-expected)
                    worst = dict(vertex=index, encoded=list(encoded), factor=clamped/360.,
                                 expected=list(expected), actual=list(actual),
                                 frameErrorWU=dict(right=local_error.x, forward=local_error.y, up=local_error.z))
            rows.append(dict(object=obj.name, samples=len(indices), maxStationErrorWU=maximum, worst=worst))
    finally:
        bpy.data.objects.remove(helper, do_unlink=True)
    maximum = max(row["maxStationErrorWU"] for row in rows)
    # Native Follow Path and GN Sample Curve use separate float interpolation
    # paths. This bound is under 0.5% of the browser's 0.23 WU circle spacing.
    return dict(objects=rows, sampleCount=sum(row["samples"] for row in rows), maxStationErrorWU=maximum,
                limitWU=.001, passed=maximum <= .001)


def playback_records(meta, geometry):
    scene = bpy.context.scene
    controls = scene.objects["About World Controls"]
    records = []
    for time in (0., 1.75, 7., 14., .4, 0.):
        exporter.update_scene(scene, controls, time, .37, 121)
        for surface in geometry["objects"]:
            group = meta["motionGroups"][surface["motionGroup"]]
            if group["kind"] == "static":
                continue
            obj = scene.objects[surface["name"]]
            evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
            matrix = exporter.SITE @ evaluated.matrix_world
            if group["kind"] == "rotate":
                for index, vertex in enumerate(obj.data.vertices):
                    records.append(dict(group=group["id"], time=time, rest=surface["positions"][index*3:index*3+3],
                                        actual=list(matrix @ vertex.co)))
            else:
                mesh = evaluated.to_mesh()
                try:
                    axis, origin = Vector(group["axis"]), Vector(group["origin"])
                    for vertex in mesh.vertices:
                        actual = matrix @ vertex.co
                        rest = actual-axis*(actual-origin).dot(axis)
                        records.append(dict(group=group["id"], time=time, rest=list(rest), actual=list(actual)))
                finally:
                    evaluated.to_mesh_clear()
    return records


def runtime_proof(payload, records):
    node = shutil.which("node")
    if not node:
        raise ValueError("Project Node is required for the real browser contract proof")
    route = REPO/"react-app/app/src/routes/about-rollercoaster"
    code = f'''
import {{ createHash }} from 'node:crypto';
import {{ readFileSync }} from 'node:fs';
import {{ validateRollercoasterBundle, ROLLERCOASTER_SOURCE_FILE }} from {json.dumps((route/'rollercoasterContract.js').as_uri())};
import {{ sampleRollercoasterField, preflightRollercoasterField }} from {json.dumps((route/'rollercoasterField.js').as_uri())};
import {{ sampleRollercoasterMotion }} from {json.dumps((route/'rollercoasterMotion.js').as_uri())};
const input = JSON.parse(readFileSync(0, 'utf8'));
const meta = JSON.parse(input.meta);
// An isolated .blend has a different physical path. Only this in-memory
// contract fixture uses the canonical logical path; retained files keep their
// exact source identity and the Python audit verifies the real source hash.
meta.source.file = ROLLERCOASTER_SOURCE_FILE;
const bundle = await validateRollercoasterBundle({{ meta,
  cameraBytes: Buffer.from(input.camera), geometryBytes: Buffer.from(input.geometry),
  digestSha256: bytes => createHash('sha256').update(bytes).digest('hex') }});
const preflight = preflightRollercoasterField(bundle.geometry);
const {{field}} = sampleRollercoasterField(bundle.geometry);
let maxErrorWU = 0;
const output = [0, 0, 0];
for (const record of input.records) {{
  sampleRollercoasterMotion(record.rest, meta.motionGroups[record.group], record.time, output);
  maxErrorWU = Math.max(maxErrorWU, Math.hypot(...output.map((value, i) => value - record.actual[i])));
}}
if (maxErrorWU > {exporter.POINT_TOLERANCE}) throw new Error(`Blender/JS motion mismatch: ${{maxErrorWU}} WU`);
console.log(JSON.stringify({{rawContractPassed:true,preflight,generatedCount:field.count,
  motionVertexTimeChecks:input.records.length,maxMotionErrorWU:maxErrorWU,logicalSourcePathFixtureOnly:true}}));
'''
    data = dict(meta=payload["meta.json"].decode(), camera=payload["camera.json"].decode(),
                geometry=payload["geometry.json"].decode(), records=records)
    result = subprocess.run([node, "--input-type=module", "--eval", code], input=json.dumps(data), text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def prove(source, output):
    payload, report = exporter.export(source)
    meta, geometry = json.loads(payload["meta.json"]), json.loads(payload["geometry.json"])
    identity = source_contract()
    station = station_proof()
    output.mkdir(parents=True, exist_ok=False)
    (output/"station-proof.json").write_text(json.dumps(station, indent=2)+"\n")
    runtime = runtime_proof(payload, playback_records(meta, geometry))
    for name, data in payload.items():
        (output/name).write_bytes(data)
    return dict(export=report, identity=identity, station=station, runtime=runtime,
                geometrySha256=meta["geometry"]["sha256"], totalDistanceWU=meta["totalDistanceWU"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    source, output = Path(args.source).resolve(), Path(args.output).resolve()
    if source.suffix != ".blend" or output.exists() or not output.is_relative_to(REPO/"output"):
        raise ValueError("Read a saved .blend and use a NEW isolated repository output directory")
    original = exporter.sha(source)
    output.mkdir(parents=True)
    baseline = prove(source, output/"baseline-bundle")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    rail = bpy.context.scene.objects["FlightRail"]
    if len(rail.data.splines) != 1 or rail.data.splines[0].type != "BEZIER":
        raise ValueError("The edited-path proof requires the saved Bezier candidate")
    points = rail.data.splines[0].bezier_points
    middle = points[round((len(points)-1)*.35)]
    for point, shift in ((middle, Vector((1.4, .6, 1.1))),
                         (points[-1], (points[-1].co-points[-1].handle_left).normalized()*12)):
        co, left, right = point.co.copy(), point.handle_left.copy(), point.handle_right.copy()
        point.co, point.handle_left, point.handle_right = co+shift, left+shift, right+shift
    middle.tilt += .08
    rail.data.update_tag()
    edited = output/"edited-path.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(edited))
    changed = prove(edited, output/"edited-bundle")
    if baseline["identity"] != changed["identity"]:
        raise AssertionError("Rail edits changed source mesh identity, role, topology, coordinates or fixed stations")
    if (baseline["export"]["cameraSha256"] == changed["export"]["cameraSha256"] or
        baseline["geometrySha256"] == changed["geometrySha256"] or
        abs(baseline["totalDistanceWU"]-changed["totalDistanceWU"]) < 1):
        raise AssertionError("The edited rail did not change both evaluated camera and geometry")
    if exporter.sha(source) != original:
        raise AssertionError("The integration proof changed its input source")
    report = dict(source=str(source), sourceSha256=original, sourceUnchanged=True,
                  baseline=baseline, edited=changed, fixedStationsAndSourceMeshesUnchanged=True)
    (output/"report.json").write_text(json.dumps(report, indent=2)+"\n")
    print(json.dumps({key: report[key] for key in ("source", "sourceSha256", "sourceUnchanged", "fixedStationsAndSourceMeshesUnchanged")}, indent=2))
    for name, value in (("baseline", baseline), ("edited", changed)):
        print(json.dumps(dict(variant=name, generatedCount=value["runtime"]["generatedCount"],
                             maxStationErrorWU=value["station"]["maxStationErrorWU"],
                             maxMotionErrorWU=value["runtime"]["maxMotionErrorWU"],
                             motionVertexTimeChecks=value["runtime"]["motionVertexTimeChecks"],
                             distanceWU=value["totalDistanceWU"]), indent=2))
    if not baseline["station"]["passed"] or not changed["station"]["passed"]:
        raise AssertionError("Native station-frame comparison failed; exact Blender/browser and edit results are retained in report.json")


if __name__ == "__main__":
    main()
