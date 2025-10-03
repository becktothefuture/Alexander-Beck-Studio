// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          ROLLUP BUILD CONFIGURATION                          ║
// ║                      Alexander Beck Studio – Bouncy Balls                    ║
// ║                          Modular Architecture (v1)                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import terserPlugin from '@rollup/plugin-terser';

const isProd = process.env.NODE_ENV === 'production';

export default {
  input: 'source/main.js',
  output: {
    file: 'public/js/bouncy-balls-embed.js',
    format: 'iife',
    name: 'BouncyBalls',
    sourcemap: !isProd,
    banner: `/* Alexander Beck Studio – Bouncy Balls | Build: ${new Date().toISOString()} */`
  },
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        __PANEL_INITIALLY_VISIBLE__: isProd ? 'false' : 'true',
        __EXPERIMENTAL_VORTEX__: JSON.stringify(!!process.env.EXPERIMENTAL_VORTEX)
      }
    }),
    nodeResolve({ browser: true }),
    commonjs(),
    json(),
    isProd && terserPlugin({
      compress: { passes: 3, dead_code: true, drop_console: false },
      mangle: { toplevel: true },
      format: { comments: false }
    })
  ]
};


