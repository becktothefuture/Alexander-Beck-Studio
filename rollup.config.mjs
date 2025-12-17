// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          ROLLUP BUILD CONFIGURATION                          ║
// ║                      Alexander Beck Studio – Bouncy Balls                    ║
// ║                          Modular Architecture (v2)                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import terserPlugin from '@rollup/plugin-terser';

const isProd = process.env.NODE_ENV === 'production';

// ═══════════════════════════════════════════════════════════════════════════════
// TERSER CONFIGURATION (Production Only)
// Maximum compression for modern browsers (ES2020+)
// ═══════════════════════════════════════════════════════════════════════════════
const terserConfig = {
  ecma: 2020,
  module: true,
  compress: {
    // Multi-pass optimization (4 passes for maximum compression)
    passes: 4,
    dead_code: true,
    drop_debugger: true,
    
    // Core compression
    arguments: true,        // Replace arguments[i] with named params
    booleans_as_integers: false,
    collapse_vars: true,
    comparisons: true,
    computed_props: true,
    conditionals: true,
    defaults: true,         // Optimize default parameter values
    directives: true,       // Remove unnecessary directives ("use strict" dupes)
    evaluate: true,
    expression: true,       // Preserve return value of statement expressions
    hoist_funs: true,
    hoist_props: true,
    hoist_vars: false,
    if_return: true,
    inline: 3,              // Maximum inlining (3 = most aggressive)
    join_vars: true,
    keep_fargs: false,      // Drop unused function arguments
    keep_infinity: false,   // Use 1/0 instead of Infinity (smaller)
    loops: true,
    negate_iife: true,      // Negate IIFEs for smaller output
    properties: true,       // Rewrite property access (a.b → a["b"] when smaller)
    reduce_funcs: true,
    reduce_vars: true,
    sequences: true,
    side_effects: true,
    switches: true,
    toplevel: true,
    typeofs: true,
    unused: true,
    
    // Console policy: Keep (runtime handles verbosity)
    drop_console: false,
    
    // Pure functions (safe to DCE if result unused)
    pure_funcs: [
      'Math.floor', 'Math.ceil', 'Math.round', 'Math.abs',
      'Math.min', 'Math.max', 'Math.sqrt', 'Math.sin', 'Math.cos',
      'Math.atan2', 'Math.pow', 'Math.random', 'Math.hypot', 'Math.sign',
      'Math.trunc', 'Math.exp', 'Math.log', 'Math.log2', 'Math.log10',
      'Object.keys', 'Object.values', 'Object.entries', 'Object.assign',
      'Object.freeze', 'Object.seal', 'Object.create',
      'Array.isArray', 'Array.from', 'Array.of',
      'Number.isFinite', 'Number.isNaN', 'Number.isInteger', 'Number.isSafeInteger',
      'String.fromCharCode', 'String.fromCodePoint',
      'parseFloat', 'parseInt', 'isFinite', 'isNaN',
      'JSON.stringify', 'JSON.parse',
      'encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent',
    ],
    pure_getters: true,
    
    // Unsafe but effective optimizations (tested safe for this codebase)
    unsafe: true,           // Enable all safe-ish optimizations
    unsafe_arrows: true,
    unsafe_comps: true,     // Compress comparisons like a <= b → !(a > b)
    unsafe_Function: false, // Keep Function() constructor safe
    unsafe_math: true,      // Optimize Math (Math.floor(x) → x|0)
    unsafe_symbols: false,  // Keep Symbol() safe
    unsafe_methods: true,
    unsafe_proto: true,
    unsafe_regexp: true,
    unsafe_undefined: true,
  },
  mangle: {
    toplevel: true,
    safari10: true,
    properties: {
      regex: /^_/,
      reserved: ['__DEV__', '__PANEL_INITIALLY_VISIBLE__', '__EXPERIMENTAL_VORTEX__', '__RUNTIME_CONFIG__', '__TEXT__'],
    },
  },
  format: {
    comments: false,
    ecma: 2020,
    wrap_iife: true,
    ascii_only: false,      // Allow Unicode (smaller for emoji/special chars)
    beautify: false,
    indent_level: 0,
    semicolons: true,       // Use semicolons (smaller than ASI in some cases)
    shorthand: true,        // Use shorthand properties {a} instead of {a:a}
  },
};

export default {
  input: 'source/main.js',
  output: {
    file: 'public/js/bouncy-balls-embed.js',
    format: 'iife',
    name: 'BouncyBalls',
    sourcemap: !isProd,
    banner: `/* Alexander Beck Studio | ${new Date().toISOString().split('T')[0]} */`,  // Shorter banner
    compact: isProd,  // Compact output in production
  },
  treeshake: {
    moduleSideEffects: false,  // Assume modules have no side effects
    propertyReadSideEffects: false,  // Assume property reads are pure
    tryCatchDeoptimization: false,   // Don't deoptimize try-catch
  },
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        __DEV__: JSON.stringify(!isProd),
        __PANEL_INITIALLY_VISIBLE__: isProd ? 'false' : 'true',
        __EXPERIMENTAL_VORTEX__: JSON.stringify(!!process.env.EXPERIMENTAL_VORTEX),
        // Dead code elimination helpers
        'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
      }
    }),
    nodeResolve({ browser: true }),
    commonjs(),
    json(),
    isProd && terserPlugin(terserConfig),
  ],
};


