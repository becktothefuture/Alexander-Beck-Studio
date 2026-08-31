"""Build an isolated, recoverable terminal study from the saved About source.

Run in background Blender with the canonical file loaded and --candidate-blend.
Earlier objects, camera animation and source properties are not changed. The
canonical file is never saved. Export separately with fixed baseline allocations.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate-blend", required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    source = Path(bpy.data.filepath).resolve()
    destination = Path(args.candidate_blend).resolve()
    if source == destination or "about-v2-blender-current" in destination.parts:
        raise RuntimeError("The study must not overwrite the canonical Blender source.")
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != "aa2e2bdf55917cc37046ec4a9875cfbf78d4cb3a58746a0a423f746df87859d3":
        raise RuntimeError("The saved source has changed; freeze and review a new baseline first.")

    scene = bpy.context.scene
    scene.frame_set(1)
    lattice = bpy.data.objects["GN_RESPONSIVE_LATTICE"]
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = lattice.evaluated_get(depsgraph)
    old_mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    vertices, faces, material_indices = [], [], []
    materials = list(old_mesh.materials)
    # Keep only complete bank elements before the camera's terminal position.
    # Their finite ends leave the view through forward travel, not a reveal mask.
    remap = {}
    kept_faces = 0
    parents = list(range(len(old_mesh.vertices)))

    def find(index):
        while parents[index] != index:
            parents[index] = parents[parents[index]]
            index = parents[index]
        return index

    for polygon in old_mesh.polygons:
        first = polygon.vertices[0]
        for index in polygon.vertices[1:]:
            left, right = find(first), find(index)
            parents[max(left, right)] = min(left, right)
    component_ends = {}
    for vertex in old_mesh.vertices:
        root = find(vertex.index)
        component_ends[root] = max(
            component_ends.get(root, -math.inf),
            (evaluated.matrix_world @ vertex.co).y,
        )
    for polygon in old_mesh.polygons:
        world_vertices = [evaluated.matrix_world @ old_mesh.vertices[i].co for i in polygon.vertices]
        if component_ends[find(polygon.vertices[0])] > 1076.0:
            continue
        indices = []
        for old_index, world_vertex in zip(polygon.vertices, world_vertices):
            if old_index not in remap:
                remap[old_index] = len(vertices)
                vertices.append(tuple(world_vertex))
            indices.append(remap[old_index])
        faces.append(indices)
        material_indices.append(polygon.material_index)
        kept_faces += 1
    evaluated.to_mesh_clear()

    # The authored edges stay behind the camera, outside the horizontal frustum,
    # or beyond the existing far fog. The scene reads as an expanse, not an island.
    # Positions below use site coordinates; the saved mesh uses Blender Z-up.
    x_steps, z_steps = 160, 176
    landscape_start = len(vertices)
    half_width, near_z, far_z = 420.0, -860.0, -1740.0
    density_weights = [1.0] * landscape_start

    def add_site_vertex(x, y, z):
        vertices.append((x, -z, y))
        return len(vertices) - 1

    def surface_height(x, site_z):
        local_z = site_z + 1160.0
        left = 7.5 * math.exp(-((x + 42.0) / 52.0) ** 2 - ((local_z + 1.0) / 60.0) ** 2)
        right = 10.5 * math.exp(-((x - 40.0) / 65.0) ** 2 - ((local_z - 1.0) / 72.0) ** 2)
        saddle = 2.0 * math.exp(-(x / 90.0) ** 2 - (local_z / 75.0) ** 2)
        # Falling ground keeps the existing contact group above the distant
        # material; this is source geometry, not a projected clearance mask.
        return -16.0 - max(0.0, -local_z) * 0.09 + left + right + saddle

    rows = []
    for z_index in range(z_steps + 1):
        site_z = near_z + (far_z - near_z) * z_index / z_steps
        row = []
        for x_index in range(x_steps + 1):
            x = -half_width + 2.0 * half_width * x_index / x_steps
            row.append(add_site_vertex(x, surface_height(x, site_z), site_z))
            # Retain the fixed point budget while concentrating sample detail
            # in the authored approach/hold region. No screen-space masking.
            density_weights.append(0.04 + 4.0 * math.exp(
                -(x / 150.0) ** 2 - ((site_z + 1190.0) / 215.0) ** 2,
            ))
        rows.append(row)

    # Existing semantic materials are retained; broad fields run across the
    # connected surface instead of assigning one colour to each shoulder.
    def add_face(indices):
        faces.append(indices)
        x = sum(vertices[index][0] for index in indices) / len(indices)
        material_indices.append(min(len(materials) - 1, max(0, int(
            (x + 110.0) / 220.0 * len(materials),
        ))))

    for previous, current in zip(rows, rows[1:]):
        for x_index in range(x_steps):
            add_face([previous[x_index], previous[x_index + 1], current[x_index + 1], current[x_index]])

    candidate_mesh = bpy.data.meshes.new("ABS_TERMINAL_STUDY_SAVED_MESH")
    candidate_mesh.from_pydata(vertices, [], faces)
    for material in materials:
        candidate_mesh.materials.append(material)
    for polygon, material_index in zip(candidate_mesh.polygons, material_indices):
        polygon.material_index = material_index
    density = candidate_mesh.attributes.new(name="terminal_study_density", type="FLOAT", domain="POINT")
    for item, value in zip(density.data, density_weights):
        item.value = value
    candidate_mesh.update()
    lattice.modifiers.clear()
    lattice.constraints.clear()
    lattice.animation_data_clear()
    lattice.parent = None
    lattice.data = candidate_mesh
    lattice.location = (0, 0, 0)
    lattice.rotation_euler = (0, 0, 0)
    lattice.scale = (1, 1, 1)
    lattice["abs_geometry_kind"] = "expansive-connected-landscape-study"
    lattice["abs_sampling_density_attribute"] = "terminal_study_density"
    lattice["abs_finale_bank_policy"] = "finite-banks-end-before-locked-camera"
    scene["abs_terminal_study"] = json.dumps({
        "schema": "about-terminal-study/v1",
        "baselineSourceSha256": source_hash,
        "modelKey": "about.05",
        "periodSeconds": 8.0,
        "amplitudeWU": 3.2,
        "travelXWU": [-60.0, 60.0],
        "landscapeBounds": {
            "min": [-half_width, min(vertex[2] for vertex in vertices[landscape_start:]), far_z],
            "max": [half_width, max(vertex[2] for vertex in vertices[landscape_start:]) + 3.2, near_z],
        },
        "composition": "expansive-full-width-no-visible-perimeter",
        "bankEndSiteZ": -1076.0,
        "cameraPolicy": "unchanged-authored-track",
        "approval": "study-only-not-canonical",
    })
    destination.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(destination))
    print(json.dumps({
        "candidate": str(destination), "baselineSourceSha256": source_hash,
        "keptBankFaces": kept_faces, "landscapeVertices": len(vertices) - landscape_start,
        "cameraSamplesChanged": 0,
    }))


if __name__ == "__main__":
    main()
