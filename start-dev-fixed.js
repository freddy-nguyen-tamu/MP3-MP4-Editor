#!/usr/bin/env node

/**
 * Development startup script with proper sequencing
 * This ensures Vite dev server is ready before starting Electron
 */

const { spawn } = require('child_process');
const { execSync } = require('child_process');
const http = require('http');

console.log('🚀 Starting Ultimate MP3/MP4 Editor in development mode...\n');

// Step 1: Build main process
console.log('📦 Building main process (TypeScript)...');
try {
  execSync('npm run build:main', { stdio: 'inherit' });
  console.log('✅ Main process built successfully\n');
} catch (error) {
  console.error('❌ Failed to build main process');
  process.exit(1);
}

// Step 2: Start Vite dev server
console.log('🔥 Starting Vite dev server...');
const viteProcess = spawn('npm', ['run', 'dev:renderer'], {
  stdio: 'pipe',
  shell: true
});

viteProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
});

viteProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Step 3: Wait for Vite to be ready
function checkViteReady(retries = 0) {
  const maxRetries = 30;
  
  if (retries >= maxRetries) {
    console.error('❌ Vite dev server failed to start after 30 seconds');
    viteProcess.kill();
    process.exit(1);
  }

  http.get('http://localhost:5173', (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Vite dev server is ready!\n');
      startElectron();
    } else {
      setTimeout(() => checkViteReady(retries + 1), 1000);
    }
  }).on('error', () => {
    setTimeout(() => checkViteReady(retries + 1), 1000);
  });
}

// Wait 2 seconds before first check to let Vite initialize
setTimeout(() => {
  console.log('⏳ Waiting for Vite dev server to be ready...');
  checkViteReady();
}, 2000);

// Step 4: Start Electron
function startElectron() {
  console.log('⚡ Starting Electron...\n');
  const electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true
  });

  electronProcess.on('close', (code) => {
    console.log('\n👋 Electron closed');
    viteProcess.kill();
    process.exit(code);
  });

  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
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
