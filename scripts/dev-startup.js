#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      DEVELOPMENT ENVIRONMENT STARTUP                         ║
// ║                                                                              ║
// ║  Intelligent startup script that:                                           ║
// ║  • Checks project health (dependencies, build status)                       ║
// ║  • Offers dual-server launch (dev + build preview)                          ║
// ║  • Provides clear next steps and port information                           ║
// ║                                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// (Legacy) Asset sync removed: the project no longer depends on external exports.

// ═══════════════════════════════════════════════════════════════════════════════
// ANSI COLORS
// ═══════════════════════════════════════════════════════════════════════════════

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  const line = '═'.repeat(78);
  console.log(`\n${colors.bright}${colors.cyan}${line}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${line}${colors.reset}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT HEALTH CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

function checkNodeModules() {
  return fs.existsSync(path.join(process.cwd(), 'node_modules'));
}

function checkBuildOutput() {
  // Phase 2: Changed from public/js/bouncy-balls-embed.js to dist/js/app.js
  const buildFile = path.join(process.cwd(), 'dist', 'js', 'app.js');
  return fs.existsSync(buildFile);
}

function checkSourceFiles() {
  const mainJs = path.join(process.cwd(), 'source', 'main.js');
  return fs.existsSync(mainJs);
}

function runHealthCheck() {
  header('PROJECT HEALTH CHECK');
  
  const checks = [
    { name: 'Dependencies installed', passed: checkNodeModules(), fix: 'npm install' },
    { name: 'Source files present', passed: checkSourceFiles(), fix: 'Check source/ directory' },
    { name: 'Build output exists', passed: checkBuildOutput(), fix: 'npm run build' },
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    const status = check.passed ? 'PASS' : 'FAIL';
    log(`${icon} ${check.name}: ${status}`, check.passed ? 'green' : 'red');
    
    if (!check.passed) {
      log(`   Fix: ${check.fix}`, 'yellow');
      allPassed = false;
    }
  });
  
  console.log();
  return allPassed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

const servers = [];

function startServer(name, command, port, description) {
  return new Promise((resolve) => {
    log(`🚀 Starting ${name}...`, 'cyan');
    
    // Parse the command - handle npm scripts by extracting the actual command
    let cmd, args, cwd;
    
    if (command === 'npm run start:source') {
      // Run Python HTTP server serving source/ from project root.
      // Important: build/watch can delete/recreate folders; --directory avoids CWD inode issues.
      cmd = 'python3';
      args = ['-m', 'http.server', '8001', '--directory', 'source'];
      cwd = process.cwd();
    } else if (command === 'npm run start') {
      // Run Python HTTP server serving dist/ from project root.
      // Important: build/watch deletes/recreates dist/; --directory keeps serving the new output.
      cmd = 'python3';
      args = ['-m', 'http.server', '8000', '--directory', 'dist'];
      cwd = process.cwd();
    } else {
      // Fallback for other commands
      [cmd, ...args] = command.split(' ');
      cwd = process.cwd();
    }
    
    const server = spawn(cmd, args, {
      cwd: cwd,
      stdio: 'pipe',
      shell: false,
    });
    
    servers.push({ name, process: server, port });
    
    let started = false;
    
    server.stdout.on('data', (data) => {
      if (!started) {
        started = true;
        log(`✅ ${name} running on ${colors.bright}http://localhost:${port}${colors.reset}`, 'green');
        log(`   ${description}`, 'dim');
        resolve();
      }
    });
    
    server.stderr.on('data', (data) => {
      const output = data.toString();
      // Python HTTP server outputs to stderr
      if (!started && output.includes('Serving HTTP')) {
        started = true;
        log(`✅ ${name} running on ${colors.bright}http://localhost:${port}${colors.reset}`, 'green');
        log(`   ${description}`, 'dim');
        resolve();
      }
    });
    
    server.on('error', (err) => {
      log(`❌ Failed to start ${name}: ${err.message}`, 'red');
      resolve();
    });
    
    server.on('exit', (code) => {
      if (code !== null && code !== 0) {
        log(`❌ ${name} exited with code ${code}`, 'red');
      }
    });
    
    // Fallback: resolve after 2 seconds even if we don't get output
    setTimeout(() => {
      if (!started) {
        log(`⚠️  ${name} may be starting (no output received)`, 'yellow');
        resolve();
      }
    }, 2000);
  });
}

function stopAllServers() {
  log('\n🛑 Stopping servers...', 'yellow');
  servers.forEach(({ name, process }) => {
    try {
      process.kill();
      log(`   Stopped ${name}`, 'dim');
    } catch (e) {
      // Already dead
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTIVE MENU
// ═══════════════════════════════════════════════════════════════════════════════

async function showMenu() {
  header('ALEXANDER BECK STUDIO - DEV ENVIRONMENT');
  
  log('Choose your development mode:\n', 'bright');
  
  log('1. 🚀 Quick Dev Mode (RECOMMENDED)', 'bright');
  log('   Port 8001 | Source files | Instant reload', 'dim');
  log('   Best for: Rapid iteration, UI tweaks, logic changes\n', 'dim');
  
  log('2. 📦 Build Preview Mode', 'bright');
  log('   Port 8000 | Bundled/minified | Production-like', 'dim');
  log('   Best for: Final testing before deploy\n', 'dim');
  
  log('3. 🔄 Dual Mode (Dev + Build)', 'bright');
  log('   Ports 8000 & 8001 | Both servers | Side-by-side comparison', 'dim');
  log('   Best for: Comparing dev vs production behavior\n', 'dim');
  
  log('4. 👁️  Watch Mode (Dev + Auto-rebuild)', 'bright');
  log('   Port 8001 + background watcher | Auto-updates build on changes', 'dim');
  log('   Best for: When you need both instant feedback and build preview\n', 'dim');
  
  log('5. 🏗️  Build Only', 'bright');
  log('   Run production build and exit', 'dim');
  log('   Best for: Preparing for deployment\n', 'dim');
  
  log('6. ❌ Exit\n', 'bright');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(colors.bright + 'Select option (1-6): ' + colors.reset, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function runBuild() {
  header('BUILDING PRODUCTION BUNDLE');
  
  return new Promise((resolve) => {
    const build = spawn('npm', ['run', 'build'], {
      stdio: 'inherit',
      shell: true,
    });
    
    build.on('close', (code) => {
      if (code === 0) {
        log('\n✅ Build complete!', 'green');
      } else {
        log('\n❌ Build failed!', 'red');
      }
      resolve(code === 0);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function quickDevMode() {
  header('QUICK DEV MODE');
  log('Starting development server with instant reload...\n', 'cyan');

  // No-op: legacy asset sync removed.
  
  await Promise.all([
    startServer(
      'Dev Server',
      'npm run start:source',
      8001,
      'Edit source files and refresh browser to see changes'
    ),
    startServer(
      'Live Reload Server',
      'node scripts/live-reload-server.js',
      8003,
      'Auto-refreshes the browser on file changes (local-only)'
    ),
    startServer(
      'Config Sync Server',
      'node scripts/config-sync-server.js',
      8002,
      'Syncs config slider changes to source files'
    )
  ]);
  
  console.log();
  log('🎯 READY TO CODE!', 'bright');
  log(`   Open: ${colors.bright}${colors.cyan}http://localhost:8001${colors.reset}`, 'green');
  log('   Look for the 🚀 GREEN badge in the control panel', 'dim');
  log('   Config changes will auto-sync to source files', 'dim');
  log('\n   Press Ctrl+C to stop\n', 'yellow');
}

async function buildPreviewMode() {
  header('BUILD PREVIEW MODE');
  
  if (!checkBuildOutput()) {
    log('⚠️  No build output found. Running build first...\n', 'yellow');
    const success = await runBuild();
    if (!success) {
      log('\n❌ Cannot start preview without successful build', 'red');
      return;
    }
  }
  
  log('\nStarting production build preview...\n', 'cyan');
  
  await startServer(
    'Build Preview',
    'npm run start',
    8000,
    'Serving bundled/minified production code'
  );
  
  console.log();
  log('📦 BUILD PREVIEW READY!', 'bright');
  log(`   Open: ${colors.bright}${colors.cyan}http://localhost:8000${colors.reset}`, 'green');
  log('   Look for the 📦 ORANGE badge in the control panel', 'dim');
  log('\n   To see source changes, run: npm run build', 'yellow');
  log('   Press Ctrl+C to stop\n', 'yellow');
}

async function dualMode() {
  header('DUAL MODE - DEV + BUILD');
  log('Starting both servers for side-by-side comparison...\n', 'cyan');

  // No-op: legacy asset sync removed.
  
  if (!checkBuildOutput()) {
    log('⚠️  No build output found. Running build first...\n', 'yellow');
    const success = await runBuild();
    if (!success) {
      log('\n⚠️  Build failed, starting dev server only...\n', 'yellow');
      await quickDevMode();
      return;
    }
  }
  
  await Promise.all([
    startServer(
      'Dev Server',
      'npm run start:source',
      8001,
      '🚀 GREEN badge - Instant reload'
    ),
    startServer(
      'Build Preview',
      'npm run start',
      8000,
      '📦 ORANGE badge - Production bundle'
    ),
    startServer(
      'Live Reload Server',
      'node scripts/live-reload-server.js',
      8003,
      'Auto-refreshes the browser on file changes (local-only)'
    ),
    startServer(
      'Config Sync Server',
      'node scripts/config-sync-server.js',
      8002,
      'Syncs config slider changes to source files'
    )
  ]);
  
  console.log();
  log('🎯 DUAL MODE READY!', 'bright');
  log(`   Dev:   ${colors.bright}${colors.green}http://localhost:8001${colors.reset} (instant changes)`, 'green');
  log(`   Build: ${colors.bright}${colors.yellow}http://localhost:8000${colors.reset} (requires rebuild)`, 'yellow');
  log('\n   Pro tip: Open both URLs in separate browser tabs', 'dim');
  log('   Press Ctrl+C to stop both servers\n', 'yellow');
}

async function watchMode() {
  header('WATCH MODE - AUTO-REBUILD');
  log('Starting dev server with background auto-rebuild...\n', 'cyan');

  // No-op: legacy asset sync removed.
  
  // Watch Mode should be fully end-to-end: run dev server, build server, and watcher.
  await Promise.all([
    startServer('Dev Server', 'npm run start:source', 8001, '🚀 Instant reload for source changes'),
    startServer('Build Preview', 'npm run start', 8000, '📦 Production preview (refresh to see rebuilds)'),
    startServer('Live Reload Server', 'node scripts/live-reload-server.js', 8003, 'Auto-refreshes the browser on file changes (local-only)'),
    startServer('Config Sync Server', 'node scripts/config-sync-server.js', 8002, 'Syncs config slider changes to source files'),
    (async () => {
      log('👁️  Starting file watcher...', 'cyan');
      const watcher = spawn('npm', ['run', 'watch'], { stdio: 'inherit', shell: true });
      servers.push({ name: 'Watcher', process: watcher, port: null });
      log('✅ File watcher active (rebuilding on save)', 'green');
    })(),
  ]);
  
  console.log();
  log('👁️  WATCH MODE ACTIVE!', 'bright');
  log(`   Dev:   ${colors.bright}${colors.green}http://localhost:8001${colors.reset} (instant changes)`, 'green');
  log(`   Build: ${colors.bright}${colors.yellow}http://localhost:8000${colors.reset} (refresh after rebuild)`, 'yellow');
  log('\n   Press Ctrl+C to stop (dev + build + watcher)\n', 'yellow');
}

async function buildOnlyMode() {
  const success = await runBuild();
  if (success) {
    log('\n💡 To preview build: npm run start (port 8000)', 'cyan');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  // Health check
  const healthy = runHealthCheck();
  
  if (!healthy) {
    log('⚠️  Please fix the issues above before starting dev environment', 'yellow');
    log('   Common fixes:', 'bright');
    log('   • npm install', 'dim');
    log('   • npm run build\n', 'dim');
    process.exit(1);
  }
  
  // Show menu
  const choice = await showMenu();
  
  console.log(); // spacing
  
  // Handle choice
  switch (choice) {
    case '1':
      await quickDevMode();
      break;
    case '2':
      await buildPreviewMode();
      break;
    case '3':
      await dualMode();
      break;
    case '4':
      await watchMode();
      break;
    case '5':
      await buildOnlyMode();
      process.exit(0);
      break;
    case '6':
      log('👋 Goodbye!\n', 'cyan');
      process.exit(0);
      break;
    default:
      log('❌ Invalid option. Please choose 1-6.\n', 'red');
      process.exit(1);
  }
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    stopAllServers();
    log('\n👋 Goodbye!\n', 'cyan');
    process.exit(0);
  });
  
  // Keep process alive
  await new Promise(() => {});
}

// Run
main().catch((err) => {
  log(`\n❌ Fatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});

