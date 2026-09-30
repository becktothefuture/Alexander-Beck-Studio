"""Exercise native authoring controls on a disposable copy; never save the source."""
import argparse
import hashlib
import importlib
import json
import sys
import tempfile
import time
from pathlib import Path

import bpy

REPO = Path(__file__).resolve().parents[2]


def authored_snapshot(scene):
    """Exclude preview clocks and selection; include the authored scene contract."""
    rail=scene.objects['FlightRail'].data.splines[0]
    fields=('aperture','thickness','depth','aspect','spacing','orientation','diamond')
    return {
        'rail': [[list(p.co),list(p.handle_left),list(p.handle_right),p.tilt,p.radius,
                  p.handle_left_type,p.handle_right_type] for p in rail.bezier_points],
        'meshes': {o.name:{'vertices':[list(v.co) for v in o.data.vertices],
                          'faces':[list(p.vertices) for p in o.data.polygons],
                          'materials':[m.material.name if m.material else None for m in o.material_slots],
                          'parent':o.parent.name if o.parent else None}
                   for o in scene.objects if o.type=='MESH'},
        'cues':[{k:getattr(c,k) for k in ('name','enabled','chapter','mode','start','peak','end','angle')}
                for c in scene.about_roll_cues],
        'bank':{k:getattr(scene,'about_bank_'+k) for k in ('enabled','max','distance')},
        'steadycam':scene.about_camera_look_ahead,
        'families':[{ 'name':f.name,**{k:getattr(f,k) for k in fields}} for f in scene.about_gate_families],
        'motion':{o.name:{k:float(o[k]) for k in ('amplitude','period','phase')}
                  for o in scene.objects if o.type=='EMPTY' and o.get('motion_group')},
        'world':{k:scene.objects['About World Controls'].get(k) for k in
                 ('referenceSeconds','arrivalHoldStart','wave_amplitude','wave_period','wave_phase')},
    }


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',default=str(REPO/'source-assets/about-surface-world/about-surface-world.blend'))
    parser.add_argument('--report')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    source=Path(args.source).resolve();source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
    sys.path.insert(0,str(Path(__file__).parent))
    import about_director as director
    # Resolve the current implementation before a baseline file's bootstrap can
    # discover the older script preserved next to that baseline.
    bpy.ops.wm.open_mainfile(filepath=str(source),use_scripts=True)
    director.register()
    if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
    scene=bpy.context.scene;wm=bpy.context.window_manager
    original=authored_snapshot(scene)
    originals=original['cues'];checks=[]
    def check(name,condition):
        assert condition,name
        checks.append(name)

    scene.about_camera_look_ahead=3
    bpy.context.view_layer.update()
    check('steady camera control applies live',scene.objects['FlightCamera look ahead'].constraints[0].offset_factor
          > scene.objects['FlightCamera carrier'].constraints[0].offset_factor)
    bpy.ops.about.director_action(action='reset_steadycam')
    check('steady camera reset restores its directed distance',scene.about_camera_look_ahead==4)
    scene.about_camera_look_ahead=original['steadycam']

    for p in (0,.224,.298,.8082,.97,1):
        wm.about_journey_percent=p*100
        check('scrubber and timeline agree at '+str(p),abs(director.journey_progress(scene)-p)<=1/5400)
    cue=scene.about_roll_cues[0]
    cue.mode='recover'
    director.preview_at(scene,.2+.2*.31)
    director.capture_cue_position(scene,cue,'peak')
    check('playhead capture changes the selected timing',abs(cue.peak-31)<.02)
    for p,point in ((.5,'peak'),(.2+.2*.95,'start')):
        director.preview_at(scene,p);before=tuple(getattr(cue,k) for k in ('start','peak','end'))
        try:director.capture_cue_position(scene,cue,point)
        except ValueError:pass
        else:raise AssertionError('Invalid timing was accepted')
        check('invalid capture preserves timing: '+point,before==tuple(getattr(cue,k) for k in ('start','peak','end')))

    cue.peak=originals[0]['peak']
    cue.mode=originals[0]['mode']
    if cue.mode=='hold':
        try:director.capture_cue_position(scene,cue,'peak')
        except ValueError:pass
        else:raise AssertionError('Held cue accepted a hidden peak')
        check('held turns expose only start and finish','peak' not in director.cues(scene)[0])
    before_count=len(scene.about_roll_cues)
    bpy.ops.about.director_action(action='duplicate',index=0)
    cue=scene.about_roll_cues[0]
    duplicate=scene.about_roll_cues[-1]
    check('copy selects an independent cue',len(scene.about_roll_cues)==before_count+1 and wm.about_active_roll_index==before_count)
    check('copy retains timing and angle',all(getattr(duplicate,k)==getattr(cue,k) for k in ('start','peak','end','angle','chapter','enabled')))
    bpy.ops.about.director_action(action='flip',index=before_count)
    check('flip leaves the original cue unchanged',duplicate.angle==-cue.angle and cue.angle==originals[0]['angle'])
    bpy.ops.about.director_action(action='remove',index=before_count)
    check('remove keeps a valid selection',len(scene.about_roll_cues)==before_count and wm.about_active_roll_index<len(scene.about_roll_cues))
    director.preview_at(scene,.8)
    bpy.ops.about.director_action(action='add')
    check('new cue follows the current tunnel',scene.about_roll_cues[-1].chapter=='tunnel-b')
    bpy.ops.about.director_action(action='remove',index=len(scene.about_roll_cues)-1)

    director.preview_at(scene,.5)
    bpy.ops.about.director_action(action='add')
    canopy=scene.about_roll_cues[-1]
    check('new canopy cue uses its complete region and quarter-turn default',canopy.chapter=='gallery-b' and canopy.angle==90)
    director.preview_at(scene,.62)
    director.capture_cue_position(scene,canopy,'end')
    check('canopy capture spans its prose and title chapters',abs(director.cues(scene)[-1]['end']-.62)<1/5400)
    bpy.ops.about.director_action(action='remove',index=len(scene.about_roll_cues)-1)

    roll=director.cues(scene)[0]
    director.loop_interval(scene,roll['start'],roll['end'])
    check('cue loop uses the exact authored range',scene.use_preview_range and scene.frame_preview_start==director.progress_frame(scene,roll['start']) and scene.frame_preview_end==director.progress_frame(scene,roll['end']))
    for start,end in ((.7416,.8766),(.224,.374),(0,1)):
        director.loop_interval(scene,start,end)
        check('loop can move or expand to '+str((start,end)),scene.frame_preview_start==director.progress_frame(scene,start) and scene.frame_preview_end==director.progress_frame(scene,end))
    bpy.ops.about.director_action(action='full_journey')
    check('clear loop restores the complete journey',not scene.use_preview_range and scene.frame_end==director.progress_frame(scene,1))
    scene.about_preview_chapter='tunnel-a'
    bpy.ops.about.director_action(action='next_chapter')
    check('next chapter moves to its first frame',scene.about_preview_chapter=='release' and abs(director.journey_progress(scene)-.4)<1/5400)
    bpy.ops.about.director_action(action='previous_chapter')
    check('previous chapter returns to the tunnel',scene.about_preview_chapter=='tunnel-a' and abs(director.journey_progress(scene)-.2)<1/5400)
    for name,count in (('round',12),('square',12)):
        wm.about_gate_family=name
        bpy.ops.about.director_action(action='family_select')
        selected=list(bpy.context.selected_objects)
        check(name+' selection keeps linked meshes',len(selected)==count and len({o.data.as_pointer() for o in selected})==1)
    check('workflow leaves authored scene unchanged',authored_snapshot(scene)==original)
    director.unregister()
    sys.path.insert(0,str(Path(__file__).parent))
    importlib.reload(director);director.register()
    check('panel reload preserves authored values and mesh identity',authored_snapshot(scene)==original)

    class ExportProcess:
        def __init__(self, result):self.result=result;self.killed=False
        def poll(self):return self.result
        def kill(self):self.killed=True
    process=ExportProcess(None)
    director._export_process=process
    director._export_job={'file':bpy.data.filepath,'started':time.monotonic()}
    check('running export stays bounded to its one job',director.export_status()==.5 and director._export_process is process)
    try:director.unregister()
    except RuntimeError:pass
    else:raise AssertionError('Panel reload interrupted a running export')
    check('running export prevents panel teardown',hasattr(bpy.types.WindowManager,'about_journey_percent'))
    director._export_job['started']-=181
    director.export_status()
    check('stalled export terminates and unlocks the panel',process.killed and director._export_process is None and 'timed out' in wm.about_director_message)
    director.status('Current file status')
    director._export_process=ExportProcess(0)
    director._export_job={'file':'different-file.blend','started':time.monotonic()}
    director.export_status()
    check('finished export cannot overwrite another file status',wm.about_director_message=='Current file status')

    # Prove durable cue data survives a native save/reload, while session state
    # does not create an additional source of authored progress or dimensions.
    with tempfile.TemporaryDirectory(prefix='about-director-audit-') as folder:
        cue=scene.about_roll_cues[0];cue.peak=53.;cue.angle=135.
        scene.about_camera_look_ahead=2.5
        wm.about_active_roll_index=1;wm.about_gate_family='square'
        candidate=Path(folder)/'workflow.blend'
        bpy.ops.wm.save_as_mainfile(filepath=str(candidate),copy=True)
        bpy.ops.wm.open_mainfile(filepath=str(candidate),use_scripts=True)
        scene=bpy.context.scene
        check('cue timing and angle survive native reload',scene.about_roll_cues[0].peak==53 and scene.about_roll_cues[0].angle==135)
        check('a non-default steering distance survives native reload',scene.about_camera_look_ahead==2.5)
        scene.about_camera_look_ahead=original['steadycam']
        check('linked round mesh survives native reload',len({o.data.as_pointer() for o in director.family_objects(scene,scene.about_gate_families[0])})==1)
        for cue,values in zip(scene.about_roll_cues,originals):
            for k,v in values.items():setattr(cue,k,v)
        check('reload preserves the rest of the authored scene',authored_snapshot(scene)==original)

    check('source file was never changed',hashlib.sha256(source.read_bytes()).hexdigest()==source_hash)
    report={'passed':len(checks),'checks':checks,'source':str(source),'sourceSha256':source_hash,'sourceUnchanged':True}
    if args.report:Path(args.report).write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
