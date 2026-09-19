"""Configure the existing Blender scene for direct timeline camera playback."""
import json
import bpy


def remove_source_visibility(scene=None):
    """Remove retired visibility controls without changing geometry or playback."""
    scene = scene or bpy.context.scene
    controls = scene.objects['About World Controls']
    keys = {'fogNear', 'fogFar', 'finalFogNear', 'finalFogFar'}
    definitions = json.loads(scene.get('controlDefinitions', '[]'))
    if not isinstance(definitions, list) or not all(isinstance(item, dict) for item in definitions):
        raise ValueError('Source controls must be a list of definitions')
    def retired(value):
        return isinstance(value, str) and (value in keys or value == 'fog' or value.startswith('fog.'))
    removed_definitions = [item for item in definitions if retired(item.get('key')) or retired(item.get('binding'))]
    retained = [item for item in definitions if not retired(item.get('key')) and not retired(item.get('binding'))]
    removed_properties = sorted(key for key in keys if key in controls)
    for key in removed_properties:
        del controls[key]
    if removed_definitions:
        scene['controlDefinitions'] = json.dumps(retained)
    if removed_properties:
        controls.update_tag()
    return {'removedProperties': removed_properties,
            'removedControlDefinitions': [item.get('key', item.get('binding')) for item in removed_definitions]}


def configure_preview(scene=None):
    scene = scene or bpy.context.scene
    removed_visibility = remove_source_visibility(scene)
    controls = bpy.data.objects['About World Controls']
    camera = bpy.data.objects['FlightCamera']
    # Camera and ambient drivers share this 30 fps reference clock.
    scene.render.fps = 30
    scene.render.fps_base = 1.0
    scene.frame_start = 1
    scene.frame_end = 1 + round(float(controls['referenceSeconds']) * 30)
    scene.use_preview_range = False
    scene.sync_mode = 'FRAME_DROP'
    scene['preview_note'] = ('Camera view: Space plays or stops the 30 fps timeline; scrub to inspect. '
                             'Named About markers follow the scroll beats. Numpad 0 toggles camera view. '
                             'Solid material colours show editable surfaces; browser code creates the circles and controls visibility.')
    controls['progress'] = 0.0
    controls['ambientSeconds'] = 0.0
    controls['referenceMode'] = 1.0
    controls.update_tag()
    scene.camera = camera
    scene.frame_set(1)
    bpy.context.view_layer.update()
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.region_3d.view_perspective = 'CAMERA'
                space.region_3d.view_camera_zoom = 0
                space.shading.type = 'SOLID'
                space.shading.color_type = 'MATERIAL'
                space.overlay.show_overlays = True
    # Named markers make the source's timing readable while scrubbing.
    definitions = json.loads(scene['controlDefinitions'])
    for definition in definitions:
        if definition['key'] == 'referenceMode':
            definition.update(label='Timeline camera preview', baseline=1.0)
    scene['controlDefinitions'] = json.dumps(definitions)
    for marker in list(scene.timeline_markers):
        if marker.name.startswith('About: '):
            scene.timeline_markers.remove(marker)
    for beat in json.loads(scene['beats']):
        marker = scene.timeline_markers.new('About: ' + beat['id'], frame=1 + round(beat['start'] * (scene.frame_end - 1)))
        if beat['start'] == 0:
            marker.camera = camera
    return {'referenceMode': controls['referenceMode'], 'fps': scene.render.fps,
            'frameRange': [scene.frame_start, scene.frame_end], 'camera': camera.name,
            'retiredVisibility': removed_visibility}
