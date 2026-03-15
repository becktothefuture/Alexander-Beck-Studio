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
  const reactDistIndex = path.join(process.cwd(), 'react-app', 'app', 'dist', 'index.html');
  return fs.existsSync(reactDistIndex);
}

function checkReactPackage() {
  const reactPkg = path.join(process.cwd(), 'react-app', 'app', 'package.json');
  return fs.existsSync(reactPkg);
}

function runHealthCheck() {
  header('PROJECT HEALTH CHECK');
  
  const checks = [
    { name: 'Root dependencies installed', passed: checkNodeModules(), fix: 'npm install' },
    { name: 'React app present', passed: checkReactPackage(), fix: 'Check react-app/app/ directory' },
    { name: 'React build output (optional)', passed: checkBuildOutput(), fix: 'npm run build' },
  ];
  
  let allPassed = true;
  
  checks.forEach((check, i) => {
    const icon = check.passed ? '✅' : '❌';
    const status = check.passed ? 'PASS' : 'FAIL';
    log(`${icon} ${check.name}: ${status}`, check.passed ? 'green' : 'red');
    if (!check.passed) {
      log(`   Fix: ${check.fix}`, 'yellow');
      if (i < 2) allPassed = false;
    }
  });
  
  console.log();
  return allPassed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

const servers = [];
let isShuttingDown = false;

function startServer(name, command, port, description) {
  return new Promise((resolve) => {
    log(`🚀 Starting ${name}...`, 'cyan');
    
    // Parse the command - handle npm scripts by extracting the actual command
    let cmd, args, cwd;
    
    if (command === 'npm run dev' || command === 'npm run dev:react' || command === 'npm run preview') {
      const script = command.replace('npm run ', '');
      cmd = 'npm';
      args = ['run', script];
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
    
    server.on('exit', (code, signal) => {
      // Don't log errors during intentional shutdown
      if (isShuttingDown) return;
      if (signal === 'SIGTERM' || signal === 'SIGINT') {
        // Graceful shutdown - don't log as error
        return;
      }
      if (code !== null && code !== 0) {
        log(`❌ ${name} exited unexpectedly with code ${code}`, 'red');
        log(`   Check if the port is already in use or if there's a startup error`, 'dim');
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
  isShuttingDown = true;  // Suppress exit code errors during shutdown
  log('\n🛑 Stopping servers...', 'yellow');
  servers.forEach(({ name, process }) => {
    try {
      process.kill('SIGTERM');
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
  
  log('1. ⚛️  React dev server', 'bright');
  log('   Port 8012 | Vite HMR | Primary app', 'dim');
  log('   Best for: Daily development\n', 'dim');

  log('2. 📦 Install all', 'bright');
  log('   Install root + react-app/app deps', 'dim');
  log('   Run once after clone or when adding deps\n', 'dim');

  log('3. 🏗️  Build only (React)', 'bright');
  log('   Run production build and exit', 'dim');
  log('   Best for: Preparing for deployment\n', 'dim');

  log('4. ❌ Exit\n', 'bright');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(colors.bright + 'Select option (1-4): ' + colors.reset, (answer) => {
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

async function reactDevMode() {
  header('REACT APP — DEV SERVER');
  log('Starting React app (Vite) on port 8012...\n', 'cyan');

  await startServer(
    'React App',
    'npm run dev:react',
    8012,
    'Vite HMR — edit react-app/app and see changes'
  );

  console.log();
  log('⚛️  REACT APP READY!', 'bright');
  log(`   Open: ${colors.bright}${colors.cyan}http://localhost:8012${colors.reset}`, 'green');
  log('\n   Press Ctrl+C to stop\n', 'yellow');
}

async function installAllMode() {
  header('INSTALL ALL');
  log('Installing root + react-app/app...\n', 'cyan');
  const child = spawn('npm', ['run', 'install:all'], { stdio: 'inherit', shell: true, cwd: process.cwd() });
  child.on('close', (code) => {
    if (code === 0) log('\n✅ Install complete. You can run npm run dev or npm run startup.\n', 'green');
    else log('\n❌ Install failed.\n', 'red');
    process.exit(code === 0 ? 0 : 1);
  });
}

async function buildOnlyMode() {
  const success = await runBuild();
  if (success) {
    log('\n💡 To preview: npm run preview (React app on port 8013)', 'cyan');
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
      await reactDevMode();
      break;
    case '2':
      await installAllMode();
      return;
    case '3':
      await buildOnlyMode();
      process.exit(0);
      break;
    case '4':
      log('👋 Goodbye!\n', 'cyan');
      process.exit(0);
      break;
    default:
      log('❌ Invalid option. Please choose 1-4.\n', 'red');
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
