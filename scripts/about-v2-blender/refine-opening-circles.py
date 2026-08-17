#!/usr/bin/env python3
"""Apply the approved opening-circle refinement to the current About V2 scene."""

import bpy


OPENING_RING_NAME = "HOOP_000_opening-signal-ring"
SECOND_RING_NAME = "HOOP_002_centered-hoop"
OPENING_OUTER_DIAMETER = 8.4


opening_ring = bpy.data.objects.get(OPENING_RING_NAME)
if opening_ring is None or opening_ring.type != "MESH":
    raise RuntimeError(f"Missing mesh object: {OPENING_RING_NAME}")

current_outer_diameter = max(opening_ring.dimensions.x, opening_ring.dimensions.y)
if current_outer_diameter <= 0:
    raise RuntimeError(f"Invalid dimensions on: {OPENING_RING_NAME}")

scale_factor = OPENING_OUTER_DIAMETER / current_outer_diameter
opening_ring.scale = tuple(component * scale_factor for component in opening_ring.scale)

second_ring = bpy.data.objects.get(SECOND_RING_NAME)
if second_ring is not None:
    bpy.data.objects.remove(second_ring, do_unlink=True)

bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)

print({
    "openingRing": OPENING_RING_NAME,
    "openingOuterDiameter": round(max(opening_ring.dimensions.x, opening_ring.dimensions.y), 4),
    "removedRing": SECOND_RING_NAME,
})
