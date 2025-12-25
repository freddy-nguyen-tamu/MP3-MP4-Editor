#!/usr/bin/env node

/**
 * Check if FFmpeg is installed and available
 */

const { execSync } = require('child_process');

console.log('[CHECK] Verifying FFmpeg installation...\n');

let ffmpegInstalled = false;
let ffprobeInstalled = false;

// Check ffmpeg
try {
  const ffmpegVersion = execSync('ffmpeg -version', { encoding: 'utf-8', stdio: 'pipe' });
  if (ffmpegVersion.includes('ffmpeg version')) {
    console.log('[OK] FFmpeg is installed');
    const versionLine = ffmpegVersion.split('\n')[0];
    console.log('     ' + versionLine);
    ffmpegInstalled = true;
  }
} catch (error) {
  console.log('[FAIL] FFmpeg is NOT installed');
}

// Check ffprobe
try {
  const ffprobeVersion = execSync('ffprobe -version', { encoding: 'utf-8', stdio: 'pipe' });
  if (ffprobeVersion.includes('ffprobe version')) {
    console.log('[OK] FFprobe is installed');
    ffprobeInstalled = true;
  }
} catch (error) {
  console.log('[FAIL] FFprobe is NOT installed');
}

console.log('');

if (ffmpegInstalled && ffprobeInstalled) {
  console.log('[SUCCESS] All dependencies are installed');
  console.log('You can now run: npm run dev\n');
  process.exit(0);
} else {
  console.log('[FAILURE] Missing required dependencies');
  console.log('');
  console.log('FFmpeg is required for this application to process media files.');
  console.log('');
  console.log('Installation instructions:');
  console.log('');
  console.log('  Ubuntu/Debian:');
  console.log('    sudo apt update');
  console.log('    sudo apt install ffmpeg');
  console.log('');
  console.log('  macOS:');
  console.log('    brew install ffmpeg');
  console.log('');
  console.log('  Windows:');
  console.log('    Download from https://ffmpeg.org/download.html');
  console.log('    Add to PATH or place in resources/ffmpeg/');
  console.log('');
  console.log('After installation, run this check again:');
  console.log('  node check-ffmpeg.js');
  console.log('');
  process.exit(1);
}
