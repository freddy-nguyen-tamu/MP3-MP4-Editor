#!/usr/bin/env node

/**
 * Development startup script with proper sequencing.
 * Ensures Vite dev server is ready before starting Electron.
 */

const { spawn } = require('child_process');
const { execSync } = require('child_process');
const http = require('http');

console.log('Starting Ultimate MP3/MP4 Editor in development mode.\n');

// Step 1: Build main process
console.log('[1/4] Building main process (TypeScript)...');
try {
  execSync('npm run build:main', { stdio: 'inherit' });
  console.log('[1/4] Main process built successfully.\n');
} catch (error) {
  console.error('[ERROR] Failed to build main process.');
  process.exit(1);
}

// Step 2: Start Vite dev server
console.log('[2/4] Starting Vite dev server...');
const viteProcess = spawn('npm', ['run', 'dev:renderer'], {
  stdio: 'pipe',
  shell: true
});

let vitePort = null;

viteProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(data);
  
  // Detect the actual port Vite is using
  const portMatch = output.match(/Local:.*:(\d+)/);
  if (portMatch && !vitePort) {
    vitePort = parseInt(portMatch[1]);
    console.log(`[INFO] Detected Vite port: ${vitePort}`);
  }
});

viteProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Step 3: Wait for Vite to be ready
function checkViteReady(retries = 0) {
  const maxRetries = 30;
  const port = vitePort || 5173;
  
  if (retries >= maxRetries) {
    console.error(`[ERROR] Vite dev server failed to start after ${maxRetries} seconds.`);
    viteProcess.kill();
    process.exit(1);
  }

  http.get(`http://localhost:${port}`, (res) => {
    if (res.statusCode === 200) {
      console.log(`[2/4] Vite dev server is ready on port ${port}.\n`);
      startElectron();
    } else {
      setTimeout(() => checkViteReady(retries + 1), 1000);
    }
  }).on('error', () => {
    setTimeout(() => checkViteReady(retries + 1), 1000);
  });
}

// Wait 3 seconds before first check to let Vite initialize and detect port
setTimeout(() => {
  console.log('[3/4] Waiting for Vite dev server to be ready...');
  checkViteReady();
}, 3000);

// Step 4: Start Electron
function startElectron() {
  console.log('[4/4] Starting Electron.\n');
  const port = vitePort || 5173;
  const electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_DEV_SERVER_PORT: port.toString() }
  });

  electronProcess.on('close', (code) => {
    console.log('\nElectron closed.');
    viteProcess.kill();
    process.exit(code);
  });

  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    electronProcess.kill();
    viteProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    electronProcess.kill();
    viteProcess.kill();
    process.exit(0);
  });
}
