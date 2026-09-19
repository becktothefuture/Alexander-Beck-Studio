import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import {
  ROLLERCOASTER_SOURCE_FILE,
  validateRollercoasterBundle,
} from '../../react-app/app/src/routes/about-rollercoaster/rollercoasterContract.js';

// The exporter publishes meta.json last. A completed, verified publication is
// the only signal allowed to reload the browser; partial geometry or camera writes are not.
export function aboutRollercoasterPreviewPlugin(repoRoot) {
  const directory = resolve(repoRoot, 'react-app/app/public/models/about-rollercoaster-world');
  const manifest = resolve(directory, 'meta.json');
  let generation = 0;
  const refresh = async (file, server) => {
      if (file !== manifest) return;
      const current = ++generation;
      try {
        const meta = JSON.parse(await readFile(manifest, 'utf8'));
        const hash = data => createHash('sha256').update(data).digest('hex');
        const [cameraBytes, geometryBytes, sourceBytes] = await Promise.all([
          readFile(resolve(directory, 'camera.json')),
          readFile(resolve(directory, 'geometry.json')),
          readFile(resolve(repoRoot, ROLLERCOASTER_SOURCE_FILE)),
        ]);
        await validateRollercoasterBundle({ meta, cameraBytes, geometryBytes, digestSha256: hash });
        if (hash(sourceBytes) !== meta.source.sha256) throw new Error('Saved source does not match its export.');
        if (current === generation) server.ws.send({ type: 'full-reload', path: '*' });
      } catch (error) {
        server.config.logger.warn(`About export is not ready: ${error.message}`);
      }
  };
  return {
    name: 'about-rollercoaster-source-preview',
    configureServer(server) {
      const onPublication = file => refresh(file, server);
      server.watcher.add(manifest);
      server.watcher.on('add', onPublication);
      server.watcher.on('change', onPublication);
      server.httpServer?.once('close', () => {
        generation += 1;
        server.watcher.off('add', onPublication);
        server.watcher.off('change', onPublication);
      });
    },
    handleHotUpdate({ file }) {
      if (file === manifest) return [];
    },
  };
}
