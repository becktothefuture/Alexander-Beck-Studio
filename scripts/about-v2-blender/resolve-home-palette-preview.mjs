#!/usr/bin/env node

import {
  ABOUT_BLENDER_PALETTE_ROLES,
  ABOUT_HOME_ROLE_BY_BLENDER_ROLE,
  resolveAboutSurfelPaletteColors,
} from '../../react-app/app/src/routes/about-narrative-lab/aboutSurfelPalette.js';
import { getSimulationPaletteSnapshot } from '../../react-app/app/src/palette/simulationPaletteController.js';

const snapshot = getSimulationPaletteSnapshot();
const colors = resolveAboutSurfelPaletteColors(snapshot);

process.stdout.write(`${JSON.stringify({
  source: 'react-app/app/src/palette/simulationPaletteController.js',
  paletteId: snapshot.paletteId,
  periodId: snapshot.periodId,
  generation: snapshot.generation,
  roles: ABOUT_BLENDER_PALETTE_ROLES.map((role, index) => ({
    role,
    homeRole: ABOUT_HOME_ROLE_BY_BLENDER_ROLE[role],
    color: colors[index],
  })),
}, null, 2)}\n`);
