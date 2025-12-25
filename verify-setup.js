#!/usr/bin/env node

/**
 * Verification script for Ultimate MP3/MP4 Editor
 * Run: node verify-setup.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[VERIFY] Checking Ultimate MP3/MP4 Editor Setup\n');

let allGood = true;
const checks = [];

// Helper function
function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: '[OK]', message: 'OK' });
  } catch (error) {
    checks.push({ name, status: '[FAIL]', message: error.message });
    allGood = false;
  }
}

// Check 1: Node.js version
check('Node.js version', () => {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  if (major < 18) {
    throw new Error(`Node.js ${major} found, need 18+`);
  }
  checks[checks.length - 1].message = `v${version} (Good)`;
});

// Check 2: npm installed
check('npm available', () => {
  try {
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();
    checks[checks.length - 1].message = `v${version} (Good)`;
  } catch (e) {
    throw new Error('npm not found');
  }
});

// Check 3: FFmpeg installed
check('FFmpeg installed', () => {
  try {
    const version = execSync('ffmpeg -version', { encoding: 'utf8' });
    const match = version.match(/ffmpeg version ([\d.]+)/);
    checks[checks.length - 1].message = match ? `v${match[1]} (Good)` : 'Found';
  } catch (e) {
    throw new Error('FFmpeg not found in PATH. Install: brew install ffmpeg (Mac) or download from ffmpeg.org');
  }
});

// Check 4: FFprobe installed
check('FFprobe installed', () => {
  try {
    execSync('ffprobe -version', { encoding: 'utf8', stdio: 'ignore' });
    checks[checks.length - 1].message = 'Found';
  } catch (e) {
    throw new Error('FFprobe not found (usually comes with FFmpeg)');
  }
});

// Check 5: Required files exist
check('Source files present', () => {
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'src/main/main.ts',
    'src/main/preload.ts',
    'src/renderer/App.tsx',
    'src/renderer/index.html',
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing: ${file}`);
    }
  }
  checks[checks.length - 1].message = `${requiredFiles.length} files OK`;
});

// Check 6: node_modules exists
check('Dependencies installed', () => {
  if (!fs.existsSync('node_modules')) {
    throw new Error('node_modules not found. Run: npm install');
  }
  
  // Check key dependencies
  const keyDeps = ['electron', 'react', 'react-dom', 'fluent-ffmpeg', 'vite'];
  for (const dep of keyDeps) {
    if (!fs.existsSync(path.join('node_modules', dep))) {
      throw new Error(`Missing dependency: ${dep}. Run: npm install`);
    }
  }
  
  checks[checks.length - 1].message = 'All key packages found';
});

// Check 7: TypeScript compiles (main)
check('TypeScript (main) compiles', () => {
  try {
    execSync('npm run build:main', { encoding: 'utf8', stdio: 'ignore' });
    if (!fs.existsSync('dist/main/main.js')) {
      throw new Error('main.js not generated');
    }
    checks[checks.length - 1].message = 'Compiled successfully';
  } catch (e) {
    throw new Error('TypeScript compilation failed. Check for syntax errors.');
  }
});

// Check 8: Port 5173 available
check('Dev port (5173) available', () => {
  const net = require('net');
  const server = net.createServer();
  
  try {
    server.listen(5173, '127.0.0.1');
    server.close();
    checks[checks.length - 1].message = 'Available';
  } catch (e) {
    throw new Error('Port 5173 in use. Kill the process or change port in vite.config.ts');
  }
});

// Display results
console.log('='.repeat(70));
console.log('CHECK RESULTS:');
console.log('='.repeat(70));

for (const check of checks) {
  console.log(`${check.status} ${check.name.padEnd(35)} ${check.message}`);
}

console.log('='.repeat(70));

if (allGood) {
  console.log('\n[SUCCESS] ALL CHECKS PASSED\n');
  console.log('You are ready to run the app:');
  console.log('  npm run dev\n');
  console.log('First-time startup may take 10-20 seconds to compile.\n');
} else {
  console.log('\n[FAILURE] SOME CHECKS FAILED\n');
  console.log('Please fix the issues above before running the app.');
  console.log('Common fixes:');
  console.log('  - Install FFmpeg: brew install ffmpeg (Mac) or download from ffmpeg.org');
  console.log('  - Install dependencies: npm install');
  console.log('  - Update Node.js: https://nodejs.org/\n');
  process.exit(1);
}
