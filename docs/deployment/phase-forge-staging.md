# Phase Forge Staging

The hidden simulation route is built as:

- `/lab/phase-forge.html`
- SPA alias in dev/build fallback: `/lab/phase-forge`

The simulation registry entry is `phase-forge` with `enabledInRotation: false`, so it is not part of the homepage mode rotation.

## Concept

Phase Forge is a test-only material event for discipline convergence. Palette-driven particles begin as a partly ordered crystalline plate with looser powder around its edge. Pointer movement locally heats and loosens the material; dragging performs the named action `crystallize`, packing nearby particles back into the shared phase. On release, residual crystallisation energy decays rather than throwing particles into runaway motion.

This is intentionally different from Aperture Bloom and Pressure Mosaic: it is not an opening ring or pressure gap. The payoff is phase change, where disorder becomes a solid, emergent material structure.

## Review URL

After build/deploy, review:

```text
https://beck.fyi/lab/phase-forge.html
```

For the local parameter panel, use:

```text
/lab/phase-forge.html?controls=1
```

## Verification focus

- The first frame must read as a designed crystalline material, not a screensaver.
- Hover should visibly loosen and shear the nearby material without clicking.
- Drag should perform `crystallize`: nearby particles should snap into tighter packing.
- Release should continue settling with bounded velocity.
- Mobile should reduce density and DPR while preserving comfortable touch interaction.
