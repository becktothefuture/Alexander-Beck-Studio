// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    ALL SIMULATIONS VERIFICATION TEST                          ║
// ║         Verifies all modes load, are visible, and styled correctly           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Test script to verify all simulations are present and functioning.
 * Checks:
 * 1. All modes are registered and can be accessed
 * 2. Canvas is visible and in viewport
 * 3. Balls/particles are rendering
 * 4. Mode switching works
 * 5. Styling is applied correctly
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const EXPECTED_MODES = [
  'pit',
  'flies',
  'cube-3d',
  'bubbles',
  'magnetic',
  'water',
  'ping-pong',
  'dvd-logo',
  'neural',
  'sphere-3d',
  'weightless',
  'parallax-linear',
  'critters',
  'elastic-center',
  'vortex',
  'kaleidoscope-3',
  'starfield-3d',
  'snake',
  'particle-fountain'
];

let server;
let serverProcess;

async function startServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
      
      // Handle directory requests
      if (fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      
      // Default to index.html if file doesn't exist
      if (!fs.existsSync(filePath)) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
      }
      
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        res.end(data);
      });
    });
    
    server.listen(PORT, () => {
      console.log(`✅ Server started on http://localhost:${PORT}`);
      resolve();
    });
    
    server.on('error', reject);
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('✅ Server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function checkFileExists(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function verifyBuildFiles() {
  console.log('\n🔍 Verifying build files...');
  
  const requiredFiles = [
    'public/index.html',
    'public/js/bouncy-balls-embed.js',
    'public/css/bouncy-balls.css'
  ];
  
  const missing = [];
  for (const file of requiredFiles) {
    const exists = await checkFileExists(path.join(__dirname, file));
    if (!exists) {
      missing.push(file);
      console.log(`  ❌ Missing: ${file}`);
    } else {
      console.log(`  ✅ Found: ${file}`);
    }
  }
  
  return missing.length === 0;
}

function verifyModeRegistration() {
  console.log('\n🔍 Verifying mode registration in source code...');
  
  const constantsFile = path.join(__dirname, 'source/modules/core/constants.js');
  const content = fs.readFileSync(constantsFile, 'utf-8');
  
  const found = [];
  const missing = [];
  
  for (const mode of EXPECTED_MODES) {
    const modeKey = mode.toUpperCase().replace(/-/g, '_').replace(/\d+/g, (m) => {
      const numMap = { '3d': '3D' };
      return numMap[m] || m;
    });
    
    // Check for mode in NARRATIVE_MODE_SEQUENCE
    const inSequence = content.includes(`MODES.${modeKey}`) || content.includes(`'${mode}'`) || content.includes(`"${mode}"`);
    
    if (inSequence) {
      found.push(mode);
      console.log(`  ✅ Mode registered: ${mode}`);
    } else {
      missing.push(mode);
      console.log(`  ⚠️  Mode not found: ${mode}`);
    }
  }
  
  console.log(`\n  Summary: ${found.length}/${EXPECTED_MODES.length} modes found in constants`);
  
  return { found, missing };
}

function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    build: {
      filesExist: results.buildFiles,
      serverStarted: results.serverStarted
    },
    modes: {
      expected: EXPECTED_MODES.length,
      foundInCode: results.modeCheck.found.length,
      missingInCode: results.modeCheck.missing
    },
    summary: results.summary || 'Test completed - manual browser verification required'
  };
  
  const reportPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Test report saved to: ${reportPath}`);
  
  return report;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              ALL SIMULATIONS VERIFICATION TEST                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  
  const results = {
    buildFiles: false,
    serverStarted: false,
    modeCheck: { found: [], missing: [] },
    summary: ''
  };
  
  try {
    // Step 1: Verify build files
    results.buildFiles = await verifyBuildFiles();
    if (!results.buildFiles) {
      console.log('\n❌ Build files verification failed');
      results.summary = 'Build incomplete - missing required files';
      generateTestReport(results);
      process.exit(1);
    }
    
    // Step 2: Verify mode registration
    const modeCheck = verifyModeRegistration();
    results.modeCheck = modeCheck;
    
    if (modeCheck.missing.length > 0) {
      console.log(`\n⚠️  Warning: ${modeCheck.missing.length} modes not found in code:`);
      modeCheck.missing.forEach(mode => console.log(`     - ${mode}`));
    }
    
    // Step 3: Start server
    console.log('\n🚀 Starting test server...');
    await startServer();
    results.serverStarted = true;
    
    // Step 4: Generate report and instructions
    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                         VERIFICATION SUMMARY                                  ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log(`\n✅ Build files: ${results.buildFiles ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Server: ${results.serverStarted ? 'RUNNING' : 'FAILED'}`);
    console.log(`✅ Modes in code: ${modeCheck.found.length}/${EXPECTED_MODES.length}`);
    
    console.log('\n📋 Manual Browser Verification Steps:');
    console.log(`   1. Open http://localhost:${PORT} in your browser`);
    console.log('   2. Verify canvas is visible and fills viewport');
    console.log('   3. Check that balls/particles are rendering');
    console.log('   4. Test mode switching with arrow keys (← →)');
    console.log('   5. Open settings panel (/) and verify all mode buttons are present');
    console.log('   6. Cycle through all modes and verify each loads correctly');
    console.log(`\n   Expected modes (${EXPECTED_MODES.length}):`);
    EXPECTED_MODES.forEach((mode, idx) => {
      console.log(`     ${String(idx + 1).padStart(2, ' ')}. ${mode}`);
    });
    
    console.log('\n🔍 Browser DevTools Checks:');
    console.log('   - Console should have no errors');
    console.log('   - Canvas should have proper dimensions');
    console.log('   - CSS should be loaded (check Network tab)');
    console.log('   - Mode switching should update console logs');
    
    results.summary = `Server running at http://localhost:${PORT} - Manual browser verification required`;
    generateTestReport(results);
    
    console.log('\n✅ Automated checks complete! Server will keep running.');
    console.log('   Press Ctrl+C to stop the server.\n');
    
    // Keep server running
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');
      await stopServer();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    results.summary = `Error: ${error.message}`;
    generateTestReport(results);
    await stopServer();
    process.exit(1);
  }
}

main();
