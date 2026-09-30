"""About Director: native controls over the saved master, never a scene rebuild.

Run register() to load the panel, install() once to adopt the existing gates.
Authored values live only in the .blend. The embedded bootstrap loads this file.
"""
import json
import math
import subprocess
import textwrap
import time
from pathlib import Path

import bpy
from bpy.app.handlers import persistent
from bpy.props import BoolProperty, CollectionProperty, EnumProperty, FloatProperty, IntProperty, StringProperty
from mathutils import Matrix
from director_curve_bank import profile_from_rail, sample_profile

REPO = Path(__file__).resolve().parents[2]
VERSION = 1
_updating = False
_registered = False
_export_process = None
_export_job = None
_chapter_items = []
_motion_items = []
_bank_cache = {}
# Append to preserve the saved numeric values of the existing enum items.
ROLL_SECTIONS = [('tunnel-a', 'Tunnel A · round', ''), ('tunnel-b', 'Tunnel B · square', ''),
                 ('gallery-b', 'Canopy · floor / ceiling', '')]
EXPORT_LOG = REPO/'output/about-director/export.log'
CUE_KEYS = ('name', 'enabled', 'chapter', 'mode', 'start', 'peak', 'end', 'angle')


def chapters(scene):
    return json.loads(scene['beats'])


def roll_sections(scene):
    sections = {b['id']: b for b in chapters(scene)}
    sections.update({r['id']: r for r in json.loads(scene['regions']) if r['id'] == 'gallery-b'})
    return {key: sections[key] for key, _, _ in ROLL_SECTIONS}


def journey_progress(scene):
    controls = scene.objects['About World Controls']
    return max(0., min(1., controls['progress'] + controls['referenceMode'] *
                       (scene.frame_current_final-1)/(30*controls['referenceSeconds'])))


def chapter_at(scene, progress):
    beats = chapters(scene)
    return next((b for b in beats if b['start'] <= progress < b['end']), beats[-1])


def progress_frame(scene, progress):
    return round(1 + max(0., min(1., progress))*30*scene.objects['About World Controls']['referenceSeconds'])


def preview_at(scene, progress):
    controls = scene.objects['About World Controls']
    controls['progress'] = 0.; controls['ambientSeconds'] = 0.; controls['referenceMode'] = 1.
    controls.update_tag()
    scene.frame_set(progress_frame(scene, progress))


def scrub_get(_):
    return journey_progress(bpy.context.scene)*100


def scrub_set(_, value):
    if bpy.context.screen and bpy.context.screen.is_animation_playing:
        bpy.ops.screen.animation_cancel(restore_frame=False)
    preview_at(bpy.context.scene, value/100)


def active_cue(context):
    cues = context.scene.about_roll_cues
    return cues[min(context.window_manager.about_active_roll_index, len(cues)-1)] if cues else None


def cue_issue(scene, cue):
    if not cue.name.strip(): return 'Give this cue a name.'
    beat = roll_sections(scene)[cue.chapter]
    minimum = .004/(beat['end']-beat['start'])*100
    if cue.mode == 'hold':
        return 'Finish must follow Start by at least %.1f%%.' % (minimum*2) if cue.end-cue.start < minimum*2-1e-6 else ''
    if cue.peak-cue.start < minimum-1e-6: return 'Peak must follow Start by at least %.1f%%.' % minimum
    if cue.end-cue.peak < minimum-1e-6: return 'End must follow Peak by at least %.1f%%.' % minimum
    return ''


def capture_cue_position(scene, cue, point):
    if point not in ('start', 'peak', 'end'): raise ValueError('Choose Start, Peak or End.')
    if cue.mode == 'hold' and point == 'peak': raise ValueError('A held turn has Start and Finish timing.')
    beat = roll_sections(scene)[cue.chapter]
    progress = journey_progress(scene)
    if not beat['start'] <= progress <= beat['end']:
        raise ValueError('Move the playhead inside this cue\'s section first.')
    value = (progress-beat['start'])/(beat['end']-beat['start'])*100
    original = getattr(cue, point)
    setattr(cue, point, value)
    issue = cue_issue(scene, cue)
    if issue:
        setattr(cue, point, original)
        raise ValueError(issue)


def loop_interval(scene, start, end):
    first, last = progress_frame(scene, start), progress_frame(scene, end)
    if last <= first: raise ValueError('Choose a preview range with two different frames.')
    scene.use_preview_range = True
    # Enabling a previously unused range initializes Blender's bounds. Set the
    # end before the start so its coupled clamping cannot collapse the interval.
    scene.frame_preview_end = last; scene.frame_preview_start = first
    preview_at(scene, start)


def status(message):
    bpy.context.window_manager.about_director_message = message


def smoother(t):
    t = max(0., min(1., t))
    return t*t*t*(t*(6*t-15)+10)


def cues(scene):
    beats = roll_sections(scene)
    result = []
    for cue in scene.about_roll_cues:
        beat = beats[cue.chapter]
        item = dict(name=cue.name, enabled=cue.enabled, chapter=cue.chapter, mode=cue.mode,
                           start=beat['start']+(beat['end']-beat['start'])*cue.start/100,
                           end=beat['start']+(beat['end']-beat['start'])*cue.end/100,
                           angleDegrees=cue.angle)
        if cue.mode == 'recover': item['peak'] = beat['start']+(beat['end']-beat['start'])*cue.peak/100
        result.append(item)
    return result


def turn_degrees(progress, scene):
    total = 0.
    for cue in cues(scene):
        a, c = cue['start'], cue['end']
        if not cue['enabled']: continue
        if cue['mode'] == 'hold':
            if c > a: total += cue['angleDegrees']*smoother((progress-a)/(c-a))
            continue
        b = cue['peak']
        if a < b < c and a < progress < c:
            t = (progress-a)/(b-a) if progress <= b else (c-progress)/(c-b)
            total += cue['angleDegrees']*smoother(t)
    return total


def bank_profile(scene, force=False):
    rail = scene.objects['FlightRail']
    signature = (scene.about_bank_enabled, scene.about_bank_max, scene.about_bank_distance,
                 float(scene.objects['About World Controls']['arrivalHoldStart']),
                 tuple(v for row in rail.matrix_world for v in row),
                 tuple(v for p in rail.data.splines[0].bezier_points for point in (p.co,p.handle_left,p.handle_right) for v in point))
    key = scene.as_pointer()
    cached = _bank_cache.get(key)
    if force or not cached or cached[0] != signature:
        points = [tuple(tuple(rail.matrix_world @ v) for v in (p.co,p.handle_left,p.handle_right)) for p in rail.data.splines[0].bezier_points]
        samples = profile_from_rail(points,scene.about_bank_max,scene.about_bank_distance,signature[3]) if scene.about_bank_enabled else []
        _bank_cache[key] = (signature, samples)
        carrier = scene.objects.get('FlightCamera carrier')
        if carrier:
            carrier['rail_length_wu'] = max(.001, rail.data.splines[0].calc_length(resolution=64))
    return _bank_cache[key][1]


def bank_degrees(progress, scene):
    cached = _bank_cache.get(scene.as_pointer())
    return sample_profile(cached[1],progress) if scene.about_bank_enabled and cached else 0.


def roll_degrees(progress, scene=None):
    scene = scene or bpy.context.scene
    return turn_degrees(progress,scene)+bank_degrees(progress,scene)


def bank_update(self, context):
    if _updating: return
    bank_profile(context.scene)
    roll_update(self,context)


@persistent
def rail_bank_update(scene, depsgraph):
    if _updating or not scene.get('about_director_version'): return
    rail = scene.objects.get('FlightRail')
    if not rail or not any(u.id.original in (rail,rail.data) for u in depsgraph.updates): return
    before = _bank_cache.get(scene.as_pointer())
    bank_profile(scene)
    if before is not _bank_cache.get(scene.as_pointer()):
        scene['about_roll_revision'] = int(scene.get('about_roll_revision',0))+1
        scene.camera.update_tag()


def roll_update(self, context):
    if _updating: return
    scene = context.scene
    scene['about_roll_revision'] = int(scene.get('about_roll_revision', 0))+1
    scene.camera.update_tag()


class AboutRollCue(bpy.types.PropertyGroup):
    name: StringProperty(name='Name', default='New camera turn')
    enabled: BoolProperty(name='Enabled', default=True, update=roll_update)
    chapter: EnumProperty(name='Section', items=ROLL_SECTIONS, update=roll_update)
    mode: EnumProperty(name='After turn', items=[('recover','Return','Roll to Peak, then return to the incoming orientation'),
                                               ('hold','Hold','Keep this turn after Finish; later turns add to it')], default='recover', update=roll_update)
    start: FloatProperty(name='Start · chapter %', min=0, max=100, default=10, precision=1, update=roll_update)
    peak: FloatProperty(name='Peak · chapter %', min=0, max=100, default=50, precision=1, update=roll_update)
    end: FloatProperty(name='End · chapter %', min=0, max=100, default=90, precision=1, update=roll_update)
    angle: FloatProperty(name='Signed roll · °', min=-720, max=720, default=90, precision=1, update=roll_update,
                         description='Added optical turn on FlightCamera. Positive is clockwise looking forward. Full turns stay unwrapped')


def family_objects(scene, family):
    return [o for o in scene.objects if o.get('about_gate_family') == family.name]


def gate_mesh(family):
    """Four closed strips around an open aperture; 24 facets for a round hoop."""
    n = 24 if family.name == 'round' else 4
    radius = family.aperture/2
    vertices, faces = [], []
    for depth, outer in ((-family.depth/2, False), (-family.depth/2, True),
                         (family.depth/2, False), (family.depth/2, True)):
        r = radius + (family.thickness if outer else 0)
        if n == 24:
            vertices.extend((r*math.cos(i*2*math.pi/n), depth, r*math.sin(i*2*math.pi/n)*family.aspect) for i in range(n))
        else:
            vertices.extend((x*r, depth, z*r*family.aspect) for x, z in ((-1,-1),(1,-1),(1,1),(-1,1)))
    for a, b in ((0,n),(2*n,3*n),(0,2*n),(n,3*n)):
        for i in range(n):
            j = (i+1)%n
            faces.append((a+i,a+j,b+j,b+i))
    return vertices, faces


def family_update(self, context):
    global _updating
    if _updating or not context.scene.get('about_director_version'):
        return
    _updating = True
    try:
        members = family_objects(context.scene, self)
        if not members:
            return
        mesh = members[0].data
        vertices, faces = gate_mesh(self)
        mesh.clear_geometry()
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        center = sum(o['about_gate_station'] for o in members)/len(members)
        for obj in members:
            anchor = obj.parent.parent if obj.get('motion_group', 0) else obj.parent
            anchor.constraints[0].offset_factor = center+(obj['about_gate_station']-center)*self.spacing
            obj.rotation_euler.y = math.radians(self.orientation + (self.diamond if obj.get('about_gate_diamond') else 0))
        status('Gate family updated · save and export when ready')
    finally:
        _updating = False


class AboutGateFamily(bpy.types.PropertyGroup):
    name: StringProperty()
    aperture: FloatProperty(name='Clear aperture · WU', min=4.5, max=9, default=5.3, precision=2, update=family_update)
    thickness: FloatProperty(name='Frame thickness · WU', min=.08, max=.8, default=.18, precision=2, update=family_update)
    depth: FloatProperty(name='Depth · WU', min=.2, max=1.8, default=.92, precision=2, update=family_update)
    aspect: FloatProperty(name='Height / width', min=.9, max=1.25, default=1, precision=2, update=family_update)
    spacing: FloatProperty(name='Spacing · ×', min=.85, max=1.1, default=1, precision=2, update=family_update)
    orientation: FloatProperty(name='Orientation · °', min=-45, max=45, default=0, precision=1, update=family_update)
    diamond: FloatProperty(name='Diamond variation · °', min=0, max=45, default=45, precision=1, update=family_update)


def steadycam_update(self, context):
    scene=context.scene
    scene.update_tag()
    for name in ('FlightCamera', 'FlightCamera carrier', 'FlightCamera look ahead'):
        if scene.objects.get(name): scene.objects[name].update_tag()


def camera_path_driver(constraint, scene, look_ahead=False):
    driver = constraint.driver_add('offset_factor').driver
    driver.type = 'SCRIPTED'
    while driver.variables: driver.variables.remove(driver.variables[0])
    controls = scene.objects['About World Controls']
    bindings = [('p', controls, '["progress"]'), ('r', controls, '["referenceMode"]'),
                ('d', controls, '["referenceSeconds"]'), ('h', controls, '["arrivalHoldStart"]')]
    if look_ahead:
        bindings += [('a', scene, 'about_camera_look_ahead'),
                     ('l', scene.objects['FlightCamera carrier'], '["rail_length_wu"]')]
    for name, owner, path in bindings:
        var = driver.variables.new(); var.name = name; var.type = 'SINGLE_PROP'
        var.targets[0].id_type = 'SCENE' if owner == scene else 'OBJECT'
        var.targets[0].id = owner; var.targets[0].data_path = path
    driver.expression = 'min(1,max(0,(p+r*(frame-1)/(30*d))/h' + ('+a/l' if look_ahead else '') + '))'


def configure_steadycam(scene):
    """Native position carrier + forward target; optical roll stays on camera.

    The chord to a point ahead averages the intervening tangents. It anticipates
    bends without time lag, so stopping and reverse scroll cannot make aim drift.
    """
    camera = scene.camera; rail = scene.objects['FlightRail']
    bpy.app.driver_namespace['about_director_aim_weight'] = lambda p, a, h: (smoother(a/.25)*smoother((h-.01-p)/.04))
    carrier = scene.objects.get('FlightCamera carrier')
    if carrier is None:
        if camera.parent or len(camera.constraints) != 1 or camera.constraints[0].type != 'FOLLOW_PATH':
            raise ValueError('FlightCamera needs its original single rail constraint before adding steady camera.')
        carrier = bpy.data.objects.new('FlightCamera carrier', None)
        camera.users_collection[0].objects.link(carrier)
        carrier.empty_display_size = .5; carrier.hide_render = True
        path = carrier.constraints.new('FOLLOW_PATH'); path.name = 'Rail position and level frame'
        path.target = rail; path.use_fixed_location = True; path.use_curve_follow = True
        path.forward_axis = 'TRACK_NEGATIVE_Z'; path.up_axis = 'UP_Y'
        camera_path_driver(path, scene)
        original = camera.constraints[0]
        original.driver_remove('offset_factor'); camera.constraints.remove(original)
        camera.parent = carrier; camera.matrix_parent_inverse = Matrix.Identity(4)
    if camera.parent != carrier:
        raise ValueError('FlightCamera must stay on its steady camera carrier.')
    carrier['rail_length_wu'] = max(.001, rail.data.splines[0].calc_length(resolution=64))
    camera_path_driver(carrier.constraints[0], scene)
    target = scene.objects.get('FlightCamera look ahead')
    if target is None:
        target = bpy.data.objects.new('FlightCamera look ahead', None)
        camera.users_collection[0].objects.link(target)
        target.empty_display_type = 'PLAIN_AXES'; target.empty_display_size = .35; target.hide_render = True
        path = target.constraints.new('FOLLOW_PATH'); path.name = 'Ahead on the same rail'
        path.target = rail; path.use_fixed_location = True; path.use_curve_follow = False
    camera_path_driver(target.constraints[0], scene, look_ahead=True)
    aim = carrier.constraints.get('Steady sightline')
    if aim is None:
        aim = carrier.constraints.new('TRACK_TO'); aim.name = 'Steady sightline'
        aim.target = target; aim.track_axis = 'TRACK_NEGATIVE_Z'; aim.up_axis = 'UP_Y'
    # RNA properties are registered after file load; rebind to clear invalid paths.
    driver = aim.driver_add('influence').driver
    driver.type = 'SCRIPTED'
    while driver.variables: driver.variables.remove(driver.variables[0])
    controls = scene.objects['About World Controls']
    for name, owner, path in [('p', controls, '["progress"]'), ('r', controls, '["referenceMode"]'),
                              ('d', controls, '["referenceSeconds"]'), ('a', scene, 'about_camera_look_ahead'),
                              ('h', controls, '["arrivalHoldStart"]')]:
        var = driver.variables.new(); var.name = name; var.type = 'SINGLE_PROP'
        var.targets[0].id_type = 'SCENE' if owner == scene else 'OBJECT'
        var.targets[0].id = owner; var.targets[0].data_path = path
    driver.expression = 'about_director_aim_weight(p+r*(frame-1)/(30*d),a,h)'



def configure_camera(scene):
    camera = scene.camera
    configure_steadycam(scene)
    bank_profile(scene,force=True)
    bpy.app.driver_namespace['about_director_roll'] = lambda p: -math.radians(roll_degrees(p))
    driver = camera.driver_add('rotation_euler', 2).driver
    driver.type = 'SCRIPTED'
    while driver.variables:
        driver.variables.remove(driver.variables[0])
    controls = scene.objects['About World Controls']
    for name, owner, path in [('p',controls,'["progress"]'),('r',controls,'["referenceMode"]'),
                              ('d',controls,'["referenceSeconds"]'),('v',scene,'["about_roll_revision"]')]:
        var = driver.variables.new(); var.name = name; var.type = 'SINGLE_PROP'
        var.targets[0].id_type = 'SCENE' if owner == scene else 'OBJECT'
        var.targets[0].id = owner; var.targets[0].data_path = path
    driver.expression = 'about_director_roll(min(1,max(0,p+r*(frame-1)/(30*d))))+v*0'


def configure_environment(scene):
    """Expose existing supported motion. No geometry or node links are rebuilt."""
    wall = scene.objects['Final wall']
    controls=scene.objects['About World Controls']
    wave = next(g for g in json.loads(scene['motionGroups']) if g['kind'] == 'wave')
    for key, low, high in (('amplitude', 0., 3.), ('period', 5., 60.), ('phase', -math.tau, math.tau)):
        prop = 'wave_' + key
        if prop not in controls: controls[prop] = float(wall.get(prop,wave[key]))
        if prop in wall: del wall[prop]
        controls.id_properties_ui(prop).update(min=low, max=high, soft_min=low, soft_max=high)
    tree = wall.modifiers['Preview wave'].node_group
    # Blender MCP has no structured driver-binding operation. These two socket
    # drivers bind the inspected graph to the same values the exporter reads.
    tree.nodes['Math.012'].inputs[1].driver_remove('default_value')
    driver = tree.nodes['Math.012'].inputs[1].driver_add('default_value').driver
    while driver.variables: driver.variables.remove(driver.variables[0])
    var = driver.variables.new(); var.name='a'; var.type='SINGLE_PROP'
    var.targets[0].id=controls; var.targets[0].data_path='["wave_amplitude"]'
    driver.expression='a/1.5'
    tree.nodes['Value'].outputs[0].driver_remove('default_value')
    driver = tree.nodes['Value'].outputs[0].driver_add('default_value').driver
    while driver.variables: driver.variables.remove(driver.variables[0])
    for name,owner,path in [('t',controls,'ambientSeconds'),('r',controls,'referenceMode'),
                            ('d',controls,'wave_period'),('p',controls,'wave_phase')]:
        var=driver.variables.new(); var.name=name; var.type='SINGLE_PROP'
        var.targets[0].id=owner; var.targets[0].data_path='["'+path+'"]'
    driver.expression='6.283185307179586*(t+r*(frame-1)/30)/d+p'
    for obj in scene.objects:
        if obj.type=='EMPTY' and obj.get('motion_group'):
            if 'about_motion_defaults' not in obj:
                obj['about_motion_defaults']=json.dumps({k:float(obj[k]) for k in ('amplitude','period','phase')})
            for key,low,high in (('amplitude',0.,math.pi/2),('period',5.,60.),('phase',-math.tau,math.tau)):
                obj[key]=float(obj[key])
                obj.id_properties_ui(key).update(min=low,max=high,soft_min=low,soft_max=high)
    controls.id_properties_ui('referenceSeconds').update(min=30.,max=600.,soft_min=30.,soft_max=600.)


def export_status():
    global _export_process, _export_job
    if _export_process is None: return None
    result=_export_process.poll()
    if result is None and time.monotonic()-_export_job['started'] < 180: return .5
    if result is None:
        _export_process.kill()
        message='Export timed out · inspect the export log'
    elif result == 0:
        message='Saved snapshot exported · browser updated'
    else:
        message='Export failed · previous browser data retained'
    # A background export must never write status into a different opened file.
    if bpy.data.filepath == _export_job['file']:
        status(message)
    _export_process=None
    _export_job=None
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D': area.tag_redraw()
    return None


def validate(scene):
    errors = []
    if scene.camera.name != 'FlightCamera' or scene.render.fps != 30 or scene.render.fps_base != 1:
        errors.append('Keep FlightCamera active and the reference timeline at 30 fps.')
    carrier=scene.objects.get('FlightCamera carrier'); target=scene.objects.get('FlightCamera look ahead')
    if (not carrier or scene.camera.parent != carrier or scene.camera.constraints or carrier.parent
        or not target or target.parent or len(carrier.constraints) != 2 or len(target.constraints) != 1
        or carrier.constraints[0].type != 'FOLLOW_PATH' or carrier.constraints[0].target != scene.objects['FlightRail']
        or carrier.constraints[1].type != 'TRACK_TO' or carrier.constraints[1].target != target
        or target.constraints[0].type != 'FOLLOW_PATH' or target.constraints[0].target != scene.objects['FlightRail']):
        errors.append('Keep the camera carrier and look-ahead target on FlightRail. Use Steady camera to adjust the sightline.')
    spline = scene.objects['FlightRail'].data.splines[0]
    if any(abs(p.tilt) > 1e-7 for p in spline.bezier_points):
        errors.append('Keep rail tilt at zero. Use Camera roll cues for optical roll.')
    if len(scene.about_roll_cues) > 16:
        errors.append('Use at most 16 roll cues.')
    for cue in scene.about_roll_cues:
        issue=cue_issue(scene,cue)
        if issue: errors.append(cue.name+': '+issue)
    for family in scene.about_gate_families:
        members = family_objects(scene, family)
        if members and len({o.data.as_pointer() for o in members}) != 1:
            errors.append(family.name+': all family members must share one mesh.')
        expected, faces = gate_mesh(family)
        if members:
            mesh = members[0].data
            if len(mesh.vertices) != len(expected) or [list(f.vertices) for f in mesh.polygons] != [list(f) for f in faces]:
                errors.append(family.name+': family topology changed; Reset family or edit family controls.')
            elif max(abs(v.co[a]-p[a]) for v,p in zip(mesh.vertices,expected) for a in range(3)) > 1e-5:
                errors.append(family.name+': edit dimensions in Gate families, not mesh vertices.')
    if errors:
        raise ValueError('\n'.join(errors))
    return {'steadycam': {'lookAheadWU': scene.about_camera_look_ahead, 'positionOwner': 'FlightRail',
                         'aimOwner': 'FlightCamera carrier', 'rollOwner': 'FlightCamera'},
            'rollCues': cues(scene), 'curveBank': {'enabled':scene.about_bank_enabled,'maxDegrees':scene.about_bank_max,
            'smoothingDistanceWU':scene.about_bank_distance,'samples':bank_profile(scene)}, 'gateFamilies': [dict(name=f.name, instances=len(family_objects(scene,f)),
            **{k:getattr(f,k) for k in ('aperture','thickness','depth','aspect','spacing','orientation','diamond')}) for f in scene.about_gate_families]}


def install(scene=None):
    """Adopt only existing gate objects, keep all other user geometry and IDs."""
    global _updating
    scene = scene or bpy.context.scene
    if scene.get('about_director_version'):
        configure_camera(scene)
        return validate(scene)
    register()
    _updating = True
    rail = scene.objects['FlightRail']
    for name, angle in (('round',110),('square',-145)):
        family = scene.about_gate_families.add(); family.name = name
        family.aperture = 5.3 if name == 'round' else 5.1
        family.thickness = .18; family.depth = .92; family.aspect = 1; family.spacing = 1
        family.orientation = 0; family.diamond = 45
        targets = [o for o in scene.objects if o.type == 'MESH' and
                   (('hoop' in o.name) if name == 'round' else ('gate' in o.name and o.name.startswith('B ·')))]
        mesh = bpy.data.meshes.new('About gate family · '+name)
        mesh.from_pydata(*[gate_mesh(family)[0], [], gate_mesh(family)[1]])
        # One placeholder data slot; every instance retains its actual object material.
        mesh.materials.append(targets[0].material_slots[0].material)
        for obj in targets:
            material = obj.material_slots[0].material
            if obj.parent:
                anchor = obj.parent.parent
                station = anchor.constraints[0].offset_factor
                obj.parent.location = (0,0,0)
                # Tunnel ambient rotation stays on its existing owner and clock.
                obj.parent['motion_axis_local'] = [0.,1.,0.]
                for fc in obj.parent.animation_data.drivers:
                    if fc.array_index:
                        fc.driver.expression = str(int(fc.array_index == 2))+'*'+fc.driver.expression[fc.driver.expression.find('sin('):]
            else:
                station = sum(v.co.x for v in obj.data.vertices)/len(obj.data.vertices)/360
                anchor = bpy.data.objects.new('Track anchor · '+obj.name, None)
                scene.collection.objects.link(anchor)
                anchor.empty_display_size = .4
                anchor['about_track_binding'] = 'normalized-anchor-v1'
                constraint = anchor.constraints.new('FOLLOW_PATH')
                constraint.name = 'Fixed normalized FlightRail station'
                constraint.target = rail; constraint.use_fixed_location = True; constraint.use_curve_follow = True
                constraint.forward_axis = 'FORWARD_Y'; constraint.up_axis = 'UP_Z'; constraint.offset_factor = station
                # Only remove this gate's former bending modifier. No graph is edited.
                for modifier in list(obj.modifiers):
                    if modifier.name != 'Follow FlightRail':
                        raise ValueError('Unexpected gate modifier: '+obj.name)
                    obj.modifiers.remove(modifier)
                obj.parent = anchor
                obj['about_track_binding'] = 'normalized-gate-v1'
            obj.matrix_parent_inverse = Matrix.Identity(4); obj.matrix_basis = Matrix.Identity(4)
            obj['about_gate_family'] = name; obj['about_gate_station'] = station
            obj['about_gate_diamond'] = 'diamond' in obj.name
            obj.data = mesh; obj.material_slots[0].link = 'OBJECT'; obj.material_slots[0].material = material
            obj.rotation_euler.y = math.radians(45 if obj['about_gate_diamond'] else 0)
        cue = scene.about_roll_cues.add()
        cue.name = 'Round passage · bank and recover' if name == 'round' else 'Square passage · opposing roll'
        cue.chapter = 'tunnel-a' if name == 'round' else 'tunnel-b'
        cue.start = 12; cue.peak = 49; cue.end = 87; cue.angle = angle; cue.enabled = True
    scene['about_director_version'] = VERSION
    scene['about_roll_revision'] = 0
    scene['about_director_status'] = 'Director ready · Save & export to update the browser'
    _updating = False
    configure_camera(scene)
    # Portable within the repository; the code has one authored source.
    text = bpy.data.texts.get('About Director bootstrap.py') or bpy.data.texts.new('About Director bootstrap.py')
    text.clear()
    text.write("import bpy, sys\nfrom pathlib import Path\np = Path(bpy.data.filepath).resolve()\nroot = next((x for x in p.parents if (x/'scripts/about-rollercoaster/about_director.py').exists()), None)\nif root:\n    sys.path.insert(0, str(root/'scripts/about-rollercoaster'))\n    import about_director\n    about_director.register()\n")
    text.use_module = True
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.show_region_ui = True
    return validate(scene)


class ABOUT_OT_action(bpy.types.Operator):
    bl_idname = 'about.director_action'
    bl_label = 'About Director'
    bl_options = {'REGISTER', 'UNDO'}
    action: StringProperty()
    index: IntProperty(default=0)
    point: StringProperty(default='peak')

    @classmethod
    def description(cls, context, properties):
        return {
            'capture': 'Use the current playhead for '+properties.point.title()+'. Invalid ordering is rejected.',
            'cue_go': 'Preview the selected turn at '+properties.point.title()+'.',
            'loop_cue': 'Loop the selected turn. Press Play to stop.',
            'loop_chapter': 'Loop the selected chapter. Press Play to stop.',
            'full_journey': 'Clear the loop range and use the complete journey.',
            'duplicate': 'Copy the selected cue, including its timing, angle and enabled state.',
            'flip': 'Reverse the selected cue angle without changing its timing.',
            'family_select': 'Select all linked members without making their meshes independent.',
            'export': 'Save the current master, then validate and export its saved snapshot.',
            'open_log': 'Open the latest export log with the system text viewer.',
        }.get(properties.action, 'About Director')

    def execute(self, context):
        global _export_process, _export_job
        scene = context.scene; controls = scene.objects['About World Controls']; wm=context.window_manager
        try:
            if self.action in ('chapter', 'previous_chapter', 'next_chapter', 'loop_chapter'):
                beats=chapters(scene)
                selected=next(i for i,b in enumerate(beats) if b['id']==scene.about_preview_chapter)
                if self.action in ('previous_chapter','next_chapter'):
                    selected=max(0,min(len(beats)-1,selected+(-1 if self.action=='previous_chapter' else 1)))
                    scene.about_preview_chapter=beats[selected]['id']
                beat=beats[selected]
                if self.action == 'loop_chapter':
                    loop_interval(scene,beat['start'],beat['end'])
                    if context.screen and not context.screen.is_animation_playing: bpy.ops.screen.animation_play()
                else: preview_at(scene,beat['start'])
            elif self.action == 'camera':
                if context.object and context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
                context.space_data.region_3d.view_perspective = 'CAMERA'
            elif self.action == 'rail':
                if context.object and context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
                bpy.ops.object.select_all(action='DESELECT')
                rail = scene.objects['FlightRail']; rail.select_set(True); context.view_layer.objects.active = rail
                bpy.ops.object.mode_set(mode='EDIT')
            elif self.action == 'play':
                controls['progress'] = 0.; controls['ambientSeconds'] = 0.; controls['referenceMode'] = 1.
                scene.frame_end = round(1+30*controls['referenceSeconds'])
                bpy.ops.screen.animation_play()
            elif self.action == 'full_journey':
                scene.use_preview_range=False
                scene.frame_start=1;scene.frame_end=progress_frame(scene,1)
            elif self.action == 'add':
                if len(scene.about_roll_cues) >= 16: raise ValueError('Maximum 16 cues')
                sections=roll_sections(scene);progress=journey_progress(scene)
                chapter=next((key for key,section in sections.items() if section['start']<=progress<section['end']),None)
                if chapter is None:
                    chapter=scene.about_preview_chapter if scene.about_preview_chapter in sections else 'tunnel-a'
                count=sum(c.chapter==chapter for c in scene.about_roll_cues)+1
                cue=scene.about_roll_cues.add();cue.chapter=chapter
                cue.name=('Canopy' if chapter=='gallery-b' else chapter.replace('-',' ').title())+' · roll '+str(count)
                cue.start=12;cue.peak=49;cue.end=87;cue.mode='hold';cue.angle=90 if chapter=='gallery-b' else 180
                wm.about_active_roll_index=len(scene.about_roll_cues)-1
                roll_update(None, context)
            elif self.action == 'remove':
                scene.about_roll_cues.remove(self.index)
                wm.about_active_roll_index=max(0,min(self.index,len(scene.about_roll_cues)-1))
                roll_update(None, context)
            elif self.action == 'duplicate':
                if len(scene.about_roll_cues) >= 16: raise ValueError('Maximum 16 cues')
                values={k:getattr(scene.about_roll_cues[self.index],k) for k in CUE_KEYS}
                cue=scene.about_roll_cues.add()
                for k,v in values.items():setattr(cue,k,v)
                cue.name=values['name']+' · copy'
                wm.about_active_roll_index=len(scene.about_roll_cues)-1
            elif self.action == 'flip':
                cue=scene.about_roll_cues[self.index];cue.angle=-cue.angle
            elif self.action == 'reset_cue':
                cue = scene.about_roll_cues[self.index]
                cue.start=12; cue.peak=49; cue.end=87; cue.angle=90 if cue.chapter=='gallery-b' else (180 if cue.mode=='hold' else (110 if cue.chapter=='tunnel-a' else -145)); cue.enabled=True
            elif self.action == 'reset_bank':
                scene.about_bank_max=12;scene.about_bank_distance=20;scene.about_bank_enabled=True
            elif self.action == 'reset_steadycam':
                scene.about_camera_look_ahead=4
            elif self.action in ('peak','cue_go'):
                point='peak' if self.action=='peak' else self.point
                if point not in ('start','peak','end'):raise ValueError('Choose a cue timing point.')
                cue=cues(scene)[self.index]
                preview_at(scene,(cue['start']+cue['end'])/2 if point=='peak' and cue['mode']=='hold' else cue[point])
            elif self.action == 'capture':
                capture_cue_position(scene,scene.about_roll_cues[self.index],self.point)
            elif self.action == 'loop_cue':
                issue=cue_issue(scene,scene.about_roll_cues[self.index])
                if issue:raise ValueError(issue)
                cue=cues(scene)[self.index];loop_interval(scene,cue['start'],cue['end'])
                if context.screen and not context.screen.is_animation_playing:bpy.ops.screen.animation_play()
            elif self.action in ('family_select','family_preview'):
                family=next(f for f in scene.about_gate_families if f.name==wm.about_gate_family)
                if self.action=='family_preview':
                    scene.about_preview_chapter='tunnel-a' if family.name=='round' else 'tunnel-b'
                    beat=next(b for b in chapters(scene) if b['id']==scene.about_preview_chapter)
                    preview_at(scene,beat['start']+(beat['end']-beat['start'])*.25)
                    if context.object and context.object.mode != 'OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
                    context.space_data.region_3d.view_perspective='CAMERA'
                else:
                    if context.object and context.object.mode != 'OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
                    bpy.ops.object.select_all(action='DESELECT')
                    members=family_objects(scene,family)
                    for obj in members:obj.select_set(True)
                    if members:context.view_layer.objects.active=members[0]
            elif self.action == 'reset_family':
                f=scene.about_gate_families[self.index]
                for k,v in dict(aperture=5.3 if f.name=='round' else 5.1,thickness=.18,depth=.92,aspect=1,spacing=1,orientation=0,diamond=45).items(): setattr(f,k,v)
            elif self.action == 'reset_motion':
                obj=scene.objects[scene.about_motion_owner]
                values=({'wave_amplitude':1.2,'wave_period':14.,'wave_phase':0.}
                        if obj.name=='Final wall' else json.loads(obj['about_motion_defaults']))
                if obj.name=='Final wall': obj=controls
                for key,value in values.items(): obj[key]=value
                obj.update_tag()
            elif self.action == 'validate':
                validate(scene); status('Authoring checks passed · ready to export')
            elif self.action == 'export':
                if _export_process is not None: raise ValueError('An export is already running')
                validate(scene)
                master=REPO/'source-assets/about-surface-world/about-surface-world.blend'
                if Path(bpy.data.filepath).resolve()!=master: raise ValueError('Open the canonical master before Save & export')
                if context.object and context.object.mode != 'OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
                bpy.ops.wm.save_as_mainfile(filepath=str(master))
                log=EXPORT_LOG
                log.parent.mkdir(parents=True,exist_ok=True)
                with log.open('w') as stream:
                    _export_process=subprocess.Popen([bpy.app.binary_path,'--background','--factory-startup','--enable-autoexec','--python-exit-code','1','--python',str(REPO/'scripts/about-rollercoaster/export-surfaces.py'),'--','--source',str(master),'--output',str(REPO/'react-app/app/public/models/about-rollercoaster-world'),'--report',str(log.with_suffix('.json'))],stdout=stream,stderr=subprocess.STDOUT)
                _export_job={'started':time.monotonic(),'file':bpy.data.filepath}
                status('Exporting saved snapshot…')
                bpy.app.timers.register(export_status,first_interval=.5)
            elif self.action == 'open_log':
                if not EXPORT_LOG.exists():raise ValueError('No export log yet. Export the master first.')
                bpy.ops.wm.path_open(filepath=str(EXPORT_LOG))
            controls.update_tag(); scene.camera.update_tag()
            return {'FINISHED'}
        except Exception as error:
            self.report({'ERROR'}, str(error)); status(str(error))
            return {'CANCELLED'}


def button(layout, label, action, index=0, icon='NONE', point='peak'):
    op=layout.operator('about.director_action',text=label,icon=icon);op.action=action;op.index=index;op.point=point


def note(layout, message, icon='NONE'):
    column=layout.column(align=True)
    for i,line in enumerate(textwrap.wrap(message,32)[:3]):column.label(text=line,icon=icon if i==0 else 'NONE')


class ABOUT_UL_roll_cues(bpy.types.UIList):
    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        row=layout.row(align=True)
        row.prop(item,'enabled',text='')
        row.label(text=item.name or 'Unnamed roll',icon='DRIVER_ROTATIONAL_DIFFERENCE')


class AboutPanel:
    bl_space_type='VIEW_3D'; bl_region_type='UI'; bl_category='About Director'
    @classmethod
    def poll(cls, context): return bool(context.scene.get('about_director_version'))


class ABOUT_PT_director(AboutPanel, bpy.types.Panel):
    bl_label='About Director'; bl_idname='ABOUT_PT_director'
    def draw(self, context):
        l=self.layout;s=context.scene;p=journey_progress(s)
        l.label(text='Unsaved Blender changes' if bpy.data.is_dirty else 'Master saved',
                icon='FILE_REFRESH' if bpy.data.is_dirty else 'CHECKMARK')
        l.separator(factor=.5)
        l.label(text='Applies to FlightCamera',icon='CAMERA_DATA')
        l.label(text=f"Now: {chapter_at(s,p)['id'].replace('-',' ').title()} · {p*100:.1f}%")
        row=l.row();row.label(text=f'Bank {bank_degrees(p,s):+.1f}°');row.label(text=f'Turn {turn_degrees(p,s):+.1f}°')
        l.label(text=f'Camera now: {roll_degrees(p,s):+.1f}°')
        turn=turn_degrees(p,s)%360
        if abs(turn-180)<.01:l.label(text='Held upside down',icon='DRIVER_ROTATIONAL_DIFFERENCE')
        elif min(abs(turn-90),abs(turn-270))<.01:l.label(text='Held sideways · floor / ceiling',icon='DRIVER_ROTATIONAL_DIFFERENCE')
        elif min(turn,360-turn)<.01:l.label(text='Upright between turns',icon='ORIENTATION_VIEW')


class ABOUT_PT_journey(AboutPanel, bpy.types.Panel):
    bl_label='Journey'; bl_idname='ABOUT_PT_journey'; bl_parent_id='ABOUT_PT_director'
    def draw(self, context):
        l=self.layout; s=context.scene; c=s.objects['About World Controls']
        playing=context.screen.is_animation_playing
        row=l.row(align=True);button(row,'Camera view','camera',icon='CAMERA_DATA');button(row,'Pause' if playing else 'Play','play',icon='PAUSE' if playing else 'PLAY')
        button(l,'Finish rail edit' if context.mode=='EDIT_CURVE' else 'Edit rail controls',
               'camera' if context.mode=='EDIT_CURVE' else 'rail',icon='CURVE_BEZCURVE')
        l.prop(context.window_manager,'about_journey_percent',text='Journey %',slider=True)
        current=chapter_at(s,journey_progress(s))
        l.label(text='Now: '+current['id'].replace('-',' ').title())
        row=l.row(align=True)
        button(row,'','previous_chapter',icon='TRIA_LEFT')
        row.prop(s,'about_preview_chapter',text='')
        button(row,'','next_chapter',icon='TRIA_RIGHT')
        row=l.row(align=True);button(row,'Go to chapter','chapter');button(row,'Loop chapter','loop_chapter')
        if s.use_preview_range:
            row=l.row(align=True);row.label(text=f'Loop: {s.frame_preview_start}–{s.frame_preview_end}');button(row,'Clear loop','full_journey')
        row=l.row(align=True);row.prop(s,'frame_current',text='Frame');row.prop(c,'["referenceSeconds"]',text='Length · s')


class ABOUT_PT_banking(AboutPanel, bpy.types.Panel):
    bl_label='Curve banking'; bl_idname='ABOUT_PT_banking'; bl_parent_id='ABOUT_PT_director'
    def draw_header(self, context):
        self.layout.prop(context.scene,'about_bank_enabled',text='')
    def draw(self, context):
        l=self.layout;s=context.scene
        note(l,'Leans into bends along FlightRail.')
        col=l.column(align=True);col.enabled=s.about_bank_enabled
        col.prop(s,'about_bank_max',text='Maximum lean · °')
        col.prop(s,'about_bank_distance',text='Smoothing · WU')
        button(l,'Reset banking','reset_bank')


class ABOUT_PT_steadycam(AboutPanel, bpy.types.Panel):
    bl_label='Steady camera'; bl_idname='ABOUT_PT_steadycam'; bl_parent_id='ABOUT_PT_director'
    def draw(self, context):
        l=self.layout
        note(l,'Looks ahead into bends. Position stays on FlightRail.')
        l.prop(context.scene,'about_camera_look_ahead',text='Look ahead · WU')
        note(l,'0 follows the tangent exactly. Optical turns stay on FlightCamera.')
        button(l,'Reset steady camera','reset_steadycam')


class ABOUT_PT_turns(AboutPanel, bpy.types.Panel):
    bl_label='Camera turns'; bl_idname='ABOUT_PT_turns'; bl_parent_id='ABOUT_PT_director'
    def draw(self, context):
        l=self.layout;s=context.scene;wm=context.window_manager
        l.template_list('ABOUT_UL_roll_cues','',s,'about_roll_cues',wm,'about_active_roll_index',rows=2,maxrows=4)
        c=active_cue(context);i=min(wm.about_active_roll_index,max(0,len(s.about_roll_cues)-1))
        row=l.row(align=True);add=row.row(align=True);add.enabled=len(s.about_roll_cues)<16;button(add,'Add','add',icon='ADD')
        edit=row.row(align=True);edit.enabled=c is not None
        button(edit,'Copy','duplicate',i,icon='DUPLICATE');button(edit,'','remove',i,icon='REMOVE')
        if c is None:
            note(l,'Add a cue in a tunnel or the canopy.');return
        l.prop(c,'name',text='')
        box=l.column(align=True)
        box.prop(c,'chapter',text='Apply in')
        box.prop(c,'mode',text='After turn')
        box.prop(c,'angle',text='Add turn · °')
        cue=cues(s)[i]
        l.separator(factor=.5)
        l.label(text='Timing within this section')
        points=('start','end') if c.mode=='hold' else ('start','peak','end')
        for point in points:
            row=l.row(align=True)
            row.prop(c,point,text=('Finish' if point=='end' and c.mode=='hold' else point.title())+' %')
            button(row,'','capture',i,icon='KEY_HLT',point=point)
            button(row,'','cue_go',i,icon='PLAY',point=point)
        issue=cue_issue(s,c)
        if issue:
            box=l.box();box.alert=True;note(box,issue,icon='ERROR')
        l.label(text=f"Journey {cue['start']*100:.1f}–{cue['end']*100:.1f}%")
        l.label(text=f"Frames {progress_frame(s,cue['start'])}–{progress_frame(s,cue['end'])}")
        note(l,'Keeps this turn after Finish. Later turns add to it.' if c.mode=='hold' else 'Returns to the incoming angle at End.')
        row=l.row(align=True);row.enabled=not issue
        button(row,'Loop turn','loop_cue',i,icon='FILE_REFRESH');button(row,'Reverse','flip',i)
        button(l,'Reset selected cue','reset_cue',i)


class ABOUT_PT_gates(AboutPanel, bpy.types.Panel):
    bl_label='Gate families'; bl_idname='ABOUT_PT_gates'; bl_parent_id='ABOUT_PT_director'; bl_options={'DEFAULT_CLOSED'}
    def draw(self, context):
        l=self.layout;s=context.scene
        l.prop(context.window_manager,'about_gate_family',text='Family')
        i=next((i for i,f in enumerate(s.about_gate_families) if f.name==context.window_manager.about_gate_family),None)
        if i is None:return
        f=s.about_gate_families[i]
        l.label(text=str(len(family_objects(s,f)))+' gates · one linked mesh')
        row=l.row(align=True);button(row,'Select gates','family_select');button(row,'Preview','family_preview')
        for k,label in (('aperture','Aperture · WU'),('thickness','Thickness · WU'),('depth','Depth · WU'),
                        ('aspect','Height / width'),('spacing','Spacing · ×'),('orientation','Orientation · °')):l.prop(f,k,text=label)
        if f.name=='square':l.prop(f,'diamond',text='Diamond · °')
        button(l,'Reset family','reset_family',i)


class ABOUT_PT_animation(AboutPanel, bpy.types.Panel):
    bl_label='Environment animation'; bl_idname='ABOUT_PT_animation'; bl_parent_id='ABOUT_PT_director'; bl_options={'DEFAULT_CLOSED'}
    def draw(self, context):
        l=self.layout;s=context.scene
        l.prop(s,'about_motion_owner',text='')
        obj=s.objects.get(s.about_motion_owner)
        if obj:
            wave=obj.name=='Final wall'
            if wave: obj=s.objects['About World Controls']
            for k,label in (('amplitude','Wave · WU' if wave else 'Swing · radians'),('period','Period · seconds'),('phase','Phase · radians')):
                l.prop(obj,'["'+('wave_' if wave else '')+k+'"]',text=label)
            button(l,'Reset motion','reset_motion')
        l.label(text='Ambient clock is separate from camera roll')


class ABOUT_PT_export(AboutPanel, bpy.types.Panel):
    bl_label='Validation and export'; bl_idname='ABOUT_PT_export'; bl_parent_id='ABOUT_PT_director'
    def draw(self, context):
        l=self.layout;busy=_export_process is not None
        if context.window_manager.about_director_message:note(l,context.window_manager.about_director_message,icon='INFO')
        column=l.column(align=True);column.enabled=not busy
        button(column,'Validate controls','validate',icon='CHECKMARK')
        button(column,'Exporting…' if busy else 'Save master & export','export',icon='EXPORT')
        row=l.row(align=True);row.enabled=EXPORT_LOG.exists();button(row,'Open export log','open_log',icon='TEXT')
        note(l,'Updates development only.')


CLASSES=(AboutRollCue,AboutGateFamily,ABOUT_OT_action,ABOUT_UL_roll_cues,ABOUT_PT_director,ABOUT_PT_journey,ABOUT_PT_steadycam,ABOUT_PT_banking,ABOUT_PT_turns,ABOUT_PT_gates,ABOUT_PT_animation,ABOUT_PT_export)


@persistent
def load_director(_):
    if bpy.context.scene.get('about_director_version'):
        configure_camera(bpy.context.scene)
        configure_environment(bpy.context.scene)
        status('Ready · export the saved master to update the browser')


def register():
    global _registered
    if not _registered:
        for cls in CLASSES: bpy.utils.register_class(cls)
        bpy.types.Scene.about_roll_cues=CollectionProperty(type=AboutRollCue)
        bpy.types.Scene.about_gate_families=CollectionProperty(type=AboutGateFamily)
        _chapter_items[:]=[(b['id'],b['id'].replace('-',' ').title(),'') for b in json.loads(bpy.context.scene['beats'])]
        _motion_items[:]=[(o.name,o.name,'') for o in bpy.context.scene.objects if o.type=='EMPTY' and o.get('motion_group') and o.children]+[('Final wall','Final wall wave','')]
        bpy.types.Scene.about_preview_chapter=EnumProperty(name='Chapter',items=_chapter_items)
        bpy.types.Scene.about_motion_owner=EnumProperty(name='Environment',items=_motion_items)
        bpy.types.Scene.about_bank_enabled=BoolProperty(name='Bank into curves',default=False,update=bank_update,
            description='Apply curve banking to FlightCamera only. Derived from FlightRail, independent of tunnel turns')
        bpy.types.Scene.about_camera_look_ahead=FloatProperty(name='Look ahead',default=4,min=0,max=4,precision=1,update=steadycam_update,
            description='World units ahead on FlightRail. Anticipates and smooths heading without shifting position. Zero follows the tangent')
        bpy.types.Scene.about_bank_max=FloatProperty(name='Maximum lean',default=12,min=0,max=45,precision=1,update=bank_update,
            description='Maximum curve lean in degrees. Straight sections naturally return to the current held turn')
        bpy.types.Scene.about_bank_distance=FloatProperty(name='Smoothing distance',default=20,min=4,max=24,precision=1,update=bank_update,
            description='Distance along FlightRail used to anticipate and smooth each bend, in world units')
        bpy.types.WindowManager.about_active_roll_index=IntProperty(default=0,min=0,options={'SKIP_SAVE'})
        bpy.types.WindowManager.about_gate_family=EnumProperty(name='Family',items=[('round','Round hoops',''),('square','Square / diamond','')],options={'SKIP_SAVE'})
        bpy.types.WindowManager.about_journey_percent=FloatProperty(name='Journey %',min=0,max=100,precision=2,
            get=scrub_get,set=scrub_set,options={'SKIP_SAVE'},description='Scrub the native camera. This value follows the timeline and is not a second authored path.')
        bpy.types.WindowManager.about_director_message=StringProperty(options={'SKIP_SAVE'})
        _registered = True
    if not any(h.__name__=='load_director' for h in bpy.app.handlers.load_post):bpy.app.handlers.load_post.append(load_director)
    if not any(h.__name__=='rail_bank_update' for h in bpy.app.handlers.depsgraph_update_post):bpy.app.handlers.depsgraph_update_post.append(rail_bank_update)
    load_director(None)


def unregister():
    """Reload the panel without deleting the saved ID-property collections."""
    global _registered
    if _export_process is not None:raise RuntimeError('Wait for the running export before reloading the panel.')
    for handler in list(bpy.app.handlers.load_post):
        if handler.__name__=='load_director':bpy.app.handlers.load_post.remove(handler)
    for handler in list(bpy.app.handlers.depsgraph_update_post):
        if handler.__name__=='rail_bank_update':bpy.app.handlers.depsgraph_update_post.remove(handler)
    for owner,names in (
        (bpy.types.Scene,('about_roll_cues','about_gate_families','about_preview_chapter','about_motion_owner','about_camera_look_ahead','about_bank_enabled','about_bank_max','about_bank_distance')),
        (bpy.types.WindowManager,('about_active_roll_index','about_gate_family','about_journey_percent','about_director_message')),
    ):
        for name in names:
            if hasattr(owner,name):delattr(owner,name)
    for cls in reversed(CLASSES):bpy.utils.unregister_class(cls)
    _registered=False


if __name__=='__main__': register()
