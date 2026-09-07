#!/usr/bin/env python3
"""Lower the finale beside the square exit without changing the placement rail.

Run in the authored scene. Updates the open scene only; does not save or export.
"""
import json
import runpy
from pathlib import Path

import bpy

EXIT_CLEARANCE_WU = 150.0


def world_z_bounds(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    try:
        heights = [(evaluated.matrix_world @ vertex.co).z for vertex in mesh.vertices]
        return min(heights), max(heights)
    finally:
        evaluated.to_mesh_clear()


def main():
    scene = bpy.context.scene
    original_frame = scene.frame_current
    motion = runpy.run_path(str(Path(__file__).with_name('smooth-camera-drone-motion.py')))
    root = bpy.data.objects['Finale Position']
    camera = bpy.data.objects['Scene Camera']
    platform = bpy.data.objects['Finale Platform']
    path = bpy.data.objects['Camera Path']
    previous_z = root.location.z
    gate_top = world_z_bounds(bpy.data.objects['Square Gates'])[1]
    platform_bottom = world_z_bounds(platform)[0]
    root.location.z += gate_top + EXIT_CLEARANCE_WU - platform_bottom
    bpy.context.view_layer.update()

    approach_end, tangent = motion['configure_finale_flight'](scene, camera)
    motion['configure_camera'](
        scene, path, camera, bpy.data.objects['Tunnel Camera Roll'],
        camera.animation_data.action, approach_end,
    )
    fractions, distance = motion['update_physical_stage_ranges'](scene, camera)
    motion['set_internal_value'](scene, 'abs_finale_exit_clearance_wu', EXIT_CLEARANCE_WU)
    scene.frame_set(original_frame)
    bpy.context.view_layer.update()
    clearance = world_z_bounds(platform)[0] - gate_top
    if abs(clearance - EXIT_CLEARANCE_WU) > 0.01:
        raise RuntimeError(f'Finale clearance differs from the authored target: {clearance}')
    print(json.dumps({
        'saved': False, 'previousRootZ': previous_z, 'rootZ': root.location.z,
        'exitTopZ': gate_top, 'platformClearanceWU': clearance,
        'approachEndFrame': approach_end, 'cameraDistanceToLockWU': distance,
        'incomingTangent': list(tangent), 'stageFractions': fractions,
    }))


if __name__ == '__main__':
    main()
