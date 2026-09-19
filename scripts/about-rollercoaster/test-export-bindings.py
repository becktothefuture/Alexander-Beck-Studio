"""Run in a disposable background Blender process; never open or save a master.

blender --background --factory-startup --python-exit-code 1 --python \
  scripts/about-rollercoaster/test-export-bindings.py
"""
import copy
import importlib.util
import json
import math
import sys
import unittest
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

spec = importlib.util.spec_from_file_location("surface_export", Path(__file__).with_name("export-surfaces.py"))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)
preview_spec = importlib.util.spec_from_file_location("surface_preview", Path(__file__).with_name("configure-preview.py"))
preview = importlib.util.module_from_spec(preview_spec)
preview_spec.loader.exec_module(preview)


class BindingExportTests(unittest.TestCase):
    def setUp(self):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.scene = bpy.context.scene
        self.controls = bpy.data.objects.new("About World Controls", None)
        self.scene.collection.objects.link(self.controls)
        for key in ("progress", "ambientSeconds", "referenceMode"):
            self.controls[key] = 0.
        data = bpy.data.curves.new("FlightRail", "CURVE")
        data.dimensions = "3D"
        data.resolution_u = 64
        data.twist_mode = "Z_UP"
        data.use_path = True
        spline = data.splines.new("BEZIER")
        spline.bezier_points.add(3)
        for point, position, bank in zip(spline.bezier_points,
                ((0, 0, 0), (4, 13, 2), (-2, 28, 6), (0, 42, 8)), (0, .3, -.2, .1)):
            point.co = position
            point.handle_left_type = point.handle_right_type = "AUTO"
            point.tilt = bank
            point.radius = 1.
        self.rail = bpy.data.objects.new("FlightRail", data)
        self.scene.collection.objects.link(self.rail)
        self.update()

    def update(self, time=0., progress=0., frame=1):
        self.rail.data.update_tag()
        exporter.update_scene(self.scene, self.controls, time, progress, frame)

    def anchor(self, factor=.43):
        obj = bpy.data.objects.new("Track anchor", None)
        self.scene.collection.objects.link(obj)
        obj["about_track_binding"] = exporter.ANCHOR_BINDING
        follow = obj.constraints.new("FOLLOW_PATH")
        follow.target = self.rail
        follow.use_fixed_location = follow.use_curve_follow = True
        follow.forward_axis = "FORWARD_Y"
        follow.up_axis = "UP_Z"
        follow.offset_factor = factor
        self.update()
        return obj

    def rotation(self, bound=True):
        axis = Vector((.3, .2, .93)).normalized()
        owner = bpy.data.objects.new("Ambient owner", None)
        self.scene.collection.objects.link(owner)
        if bound:
            owner.parent = self.anchor()
            owner.matrix_parent_inverse = Matrix.Identity(4)
            owner["motion_axis_local"] = list(axis)
        owner.location = (1., .4, .7)
        owner.rotation_mode = "QUATERNION"
        owner["motion_group"] = 1
        for key, value in (("amplitude", .7), ("period", 7.3), ("phase", .3)):
            owner[key] = value
        for index in range(4):
            driver = owner.driver_add("rotation_quaternion", index).driver
            driver.type = "SCRIPTED"
            variable = driver.variables.new()
            variable.name = "t"
            variable.targets[0].id = self.controls
            variable.targets[0].data_path = '["ambientSeconds"]'
            angle = ".7*sin(6.283185307179586*t/7.3+.3)"
            driver.expression = f"cos(({angle})/2)" if index == 0 else f"{axis[index-1]}*sin(({angle})/2)"
        group = dict(id=1, kind="rotate", axis=list(axis), pivot=[0, 0, 0],
                     amplitude=.7, period=7.3, phase=.3, continuous=False)
        self.update()
        return owner, group

    def mesh(self, vertices, faces, name="Surface"):
        data = bpy.data.meshes.new(name)
        data.from_pydata(vertices, [], faces)
        material = bpy.data.materials.new("Palette role")
        material["about_palette_role"] = 2
        data.materials.append(material)
        obj = bpy.data.objects.new(name, data)
        self.scene.collection.objects.link(obj)
        return obj

    def assert_rotation_parity(self, owner, group):
        self.update()
        state = exporter.rotation_frame(owner, group, self.rail)
        local_points = [Vector((1, 0, .1)), Vector((2, .3, 1)), Vector((1, 1, -.5))]
        start = exporter.evaluated_matrix(owner)
        rest = [state["inverse"] @ (start @ point) for point in local_points]
        initial = None
        maximum = 0.
        for time in (0., 1.75, 7., 14., .4, 0.):
            self.update(time, .37, 121)
            actual = exporter.evaluated_matrix(owner)
            pivot = Vector(group["pivot"])
            rotation = Quaternion(Vector(group["axis"]), exporter.motion_angle(group, time))
            values = [actual @ point for point in local_points]
            maximum = max(maximum, max((pivot+rotation@(point-pivot)-value).length for point, value in zip(rest, values)))
            if initial is None:
                initial = values
            elif time == 0:
                self.assertLess(max((a-b).length for a, b in zip(initial, values)), 1e-6)
        self.assertLess(maximum, exporter.POINT_TOLERANCE)
        return state["frame"].translation.copy()

    def test_normalized_carrier_and_ambient_parity_after_length_bank_edits(self):
        owner, group = self.rotation()
        before = self.assert_rotation_parity(owner, group)
        factor = owner.parent.constraints[0].offset_factor
        length = self.rail.data.splines[0].calc_length(resolution=128)
        points = self.rail.data.splines[0].bezier_points
        points[1].co += Vector((7, 2, 3))
        points[1].tilt += .35
        points[-1].co += Vector((1, 20, 4))
        self.update()
        after = self.assert_rotation_parity(owner, group)
        self.assertEqual(owner.parent.constraints[0].offset_factor, factor)
        self.assertGreater((after-before).length, 2.)
        self.assertGreater(self.rail.data.splines[0].calc_length(resolution=128)-length, 10.)

    def test_legacy_world_axis_rotation_is_unchanged(self):
        owner, group = self.rotation(bound=False)
        self.assert_rotation_parity(owner, group)

    def test_normalized_world_rejects_ease_bank_but_preserves_legacy(self):
        self.rail.data.splines[0].tilt_interpolation = "LINEAR"
        exporter.validate_track_rail(self.rail, True)
        self.rail.data.splines[0].tilt_interpolation = "EASE"
        with self.assertRaisesRegex(ValueError, "LINEAR tilt"):
            exporter.validate_track_rail(self.rail, True)
        exporter.validate_track_rail(self.rail, False)

    def test_serialized_float32_quad_uses_the_runtime_double_precision_plane(self):
        # Real banked gate: the former mathutils predicate accepted this quad,
        # while the publisher correctly measured more than 1e-5 WU of twist.
        points = [Vector(point) for point in (
            (-4.623716831207275, 2.5361454486846924, 104.82974243164062),
            (-4.739680290222168, 5.853076934814453, 108.70201110839844),
            (-5.5187554359436035, 6.212933540344238, 108.37042999267578),
            (-5.4027910232543945, 2.8960039615631104, 104.4981460571289),
        )]
        self.assertFalse(exporter.planar_convex(points))
        self.assertTrue(exporter.planar_convex(points[:3]))
        self.assertTrue(exporter.planar_convex([points[i] for i in (0, 2, 3)]))
        self.assertTrue(exporter.planar_convex([Vector(p) for p in ((0, 0, 10), (48, 0, 10), (48, 40, 10), (0, 40, 10))]))

    def test_local_axis_json_is_supported_and_wrong_axis_rejected(self):
        owner, group = self.rotation()
        import json
        owner["motion_axis_local"] = json.dumps(list(owner["motion_axis_local"]))
        exporter.rotation_frame(owner, group, self.rail)
        owner["motion_axis_local"] = [1., 0., 0.]
        with self.assertRaisesRegex(ValueError, "local motion axis"):
            exporter.rotation_frame(owner, group, self.rail)

    def test_progress_driven_anchor_is_rejected(self):
        anchor = self.anchor()
        driver = anchor.constraints[0].driver_add("offset_factor").driver
        driver.expression = "frame/100"
        self.update()
        with self.assertRaisesRegex(ValueError, "unanimated"):
            exporter.fixed_anchor(anchor, self.rail)

    def test_wrong_anchor_axis_and_nonrigid_transforms_are_rejected(self):
        anchor = self.anchor()
        anchor.constraints[0].forward_axis = "FORWARD_X"
        with self.assertRaisesRegex(ValueError, "FORWARD_Y"):
            exporter.fixed_anchor(anchor, self.rail)
        owner, group = self.rotation()
        owner.scale.x = 2
        self.update()
        with self.assertRaisesRegex(ValueError, "rigid controller"):
            exporter.rotation_frame(owner, group, self.rail)
        shear = Matrix.Identity(4)
        shear[0][1] = .1
        with self.assertRaisesRegex(ValueError, "shear"):
            exporter.rigid_matrix(shear, "Fixture")

    def test_local_endpoint_wave_uses_translation_and_new_rail_frame(self):
        wall = self.mesh([(-4, 12, -3), (4, 12, -3), (4, 12, 3), (-4, 12, 3)], [(0, 1, 2, 3)], "Final wall")
        wall.parent = self.anchor(1.)
        wave = dict(id=2, kind="wave", space="LOCAL", object=wall.name, origin=[0, 12, 0],
                    axis=[0, 1, 0], uAxis=[1, 0, 0], vAxis=[0, 0, 1],
                    amplitude=2., period=9., phase=.7, wavelength=3., quietRadius=.2, quietFeather=.8)
        origins = []
        for edited in (False, True):
            if edited:
                endpoint = self.rail.data.splines[0].bezier_points[-1]
                endpoint.co += Vector((6, 18, 4))
                endpoint.tilt += .4
            self.update()
            world = copy.deepcopy(wave)
            matrix = exporter.wave_frame(wall, world, self.rail)
            origins.append(Vector(world["origin"]))
            self.assertLess((Vector(world["origin"])-matrix@Vector(wave["origin"])).length, 1e-5)
            self.assertNotIn("space", world)
            for time in (0., 1.75, 7., 14.):
                for point in (Vector((-3, 12, 2)), Vector((2, 12, -1))):
                    actual = matrix @ exporter.wave_point(point, wave, time)
                    exported = exporter.wave_point(matrix@point, world, time)
                    self.assertLess((actual-exported).length, 2e-5)
        self.assertGreater((origins[1]-origins[0]).length, 10.)

    def test_wave_wrong_object_station_or_scale_is_rejected(self):
        wall = self.mesh([(-4, 12, -3), (4, 12, -3), (4, 12, 3), (-4, 12, 3)], [(0, 1, 2, 3)], "Final wall")
        wall.parent = self.anchor(1.)
        group = dict(space="LOCAL", object="wrong", origin=[0, 12, 0], axis=[0, 1, 0], uAxis=[1, 0, 0], vAxis=[0, 0, 1],
                     amplitude=2., period=9., phase=.7, wavelength=3., quietRadius=.2, quietFeather=.8)
        self.update()
        with self.assertRaisesRegex(ValueError, "name its source"):
            exporter.wave_frame(wall, copy.deepcopy(group), self.rail)
        group["object"] = wall.name
        wall.parent.constraints[0].offset_factor = .9
        self.update()
        with self.assertRaisesRegex(ValueError, "station 1"):
            exporter.wave_frame(wall, copy.deepcopy(group), self.rail)
        wall.parent.constraints[0].offset_factor = 1
        wall.scale.x = 2
        self.update()
        with self.assertRaisesRegex(ValueError, "unit-scale"):
            exporter.wave_frame(wall, copy.deepcopy(group), self.rail)

    def test_evaluated_mesh_topology_guard_and_temporary_mesh_cleanup(self):
        obj = self.mesh([(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)], [(0, 1, 2, 3)])
        self.update()
        count = len(bpy.data.meshes)
        for _ in range(3):
            vertices, faces, triangles = exporter.read_surface(obj, evaluated=True)
            self.assertEqual(len(vertices), 4)
            self.assertEqual(faces, [[0, 1, 2, 3]])
            self.assertEqual(len(triangles[0]), 2)
        self.assertEqual(len(bpy.data.meshes), count)
        obj.modifiers.new("Unsupported topology change", "SUBSURF")
        self.update()
        with self.assertRaisesRegex(ValueError, "topology"):
            exporter.read_surface(obj, evaluated=True)
        self.assertEqual(len(bpy.data.meshes), count)

    def test_unmarked_or_generic_curve_modifiers_are_rejected(self):
        obj = self.mesh([(0, 0, 0), (1, 0, 0), (0, 1, 0)], [(0, 1, 2)])
        with self.assertRaisesRegex(ValueError, "binding marker"):
            exporter.track_modifier(obj, self.rail)
        obj["about_track_binding"] = exporter.SURFACE_BINDING
        obj.modifiers.new(exporter.TRACK_MODIFIER, "CURVE").object = self.rail
        with self.assertRaisesRegex(ValueError, "only its enabled"):
            exporter.track_modifier(obj, self.rail)

    def test_export_controls_remove_legacy_visibility_without_reading_or_mutating_values(self):
        retained = [dict(key="progress", binding="progress", baseline=.2),
                    dict(key="waveAmplitude", binding="motionGroups.11.amplitude", baseline=2)]
        retired = [dict(key=key, binding=key, baseline=float("nan")) for key in exporter.RETIRED_VISIBILITY_KEYS]
        retired += [dict(key="oldAlias", binding="fog.near", baseline=6),
                    dict(key="fog.finalWall.far", binding="oldAlias", baseline=48)]
        original = json.dumps(retained+retired)
        self.scene["controlDefinitions"] = original
        self.controls["fogNear"] = 6.
        self.assertEqual(exporter.source_control_definitions(self.scene), retained)
        self.assertEqual(self.scene["controlDefinitions"], original)
        self.assertEqual(self.controls["fogNear"], 6.)

    def test_visibility_cleanup_preserves_geometry_playback_and_other_controls(self):
        obj = self.mesh([(0, 0, 0), (1, 0, 0), (0, 1, 0)], [(0, 1, 2)])
        self.controls["progress"] = .43
        self.controls["ambientSeconds"] = 8.
        self.controls["customOwnerValue"] = 17.
        retained = [dict(key="progress", binding="progress", baseline=.43),
                    dict(key="customOwnerValue", binding="customOwnerValue", baseline=17)]
        retired = []
        for key, value in (("fogNear", 6), ("fogFar", 9), ("finalFogNear", 18), ("finalFogFar", 48)):
            self.controls[key] = value
            retired.append(dict(key=key, binding=key, baseline=value))
        self.scene["controlDefinitions"] = json.dumps(retained+retired)
        self.scene.frame_set(42)
        before = ([tuple(v.co) for v in obj.data.vertices], [tuple(p.vertices) for p in obj.data.polygons],
                  obj.material_slots[0].material, obj.matrix_world.copy(), self.scene.frame_current)
        result = preview.remove_source_visibility(self.scene)
        self.assertEqual(set(result["removedProperties"]), exporter.RETIRED_VISIBILITY_KEYS)
        self.assertEqual(json.loads(self.scene["controlDefinitions"]), retained)
        self.assertTrue(all(key not in self.controls for key in exporter.RETIRED_VISIBILITY_KEYS))
        self.assertEqual((self.controls["progress"], self.controls["ambientSeconds"], self.controls["customOwnerValue"]), (.43, 8., 17.))
        self.assertEqual(before, ([tuple(v.co) for v in obj.data.vertices], [tuple(p.vertices) for p in obj.data.polygons],
                                 obj.material_slots[0].material, obj.matrix_world.copy(), self.scene.frame_current))
        saved = self.scene["controlDefinitions"]
        self.assertEqual(preview.remove_source_visibility(self.scene), dict(removedProperties=[], removedControlDefinitions=[]))
        self.assertEqual(self.scene["controlDefinitions"], saved)

    def test_invalid_control_metadata_cannot_partially_remove_source_properties(self):
        self.scene["controlDefinitions"] = '{}'
        self.controls["fogNear"] = 6.
        with self.assertRaisesRegex(ValueError, "list of definitions"):
            preview.remove_source_visibility(self.scene)
        self.assertEqual(self.controls["fogNear"], 6.)


if __name__ == "__main__":
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(BindingExportTests))
    if not result.wasSuccessful():
        sys.exit(1)
