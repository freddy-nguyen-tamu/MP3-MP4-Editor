const fs = require('fs');
const path = require('path');

const preloadPath = path.join(__dirname, 'dist/main/preload.js');
console.log('Checking preload script...');
console.log('Path:', preloadPath);
console.log('Exists:', fs.existsSync(preloadPath));

if (fs.existsSync(preloadPath)) {
  const content = fs.readFileSync(preloadPath, 'utf-8');
  console.log('File size:', content.length, 'bytes');
  console.log('Contains contextBridge:', content.includes('contextBridge'));
  console.log('Contains exposeInMainWorld:', content.includes('exposeInMainWorld'));
  console.log('Contains electronAPI:', content.includes('electronAPI'));
  
  // Check if compiled properly
  if (content.includes('electron_1.contextBridge')) {
    console.log('[OK] Preload compiled correctly (CommonJS)');
  } else {
    console.log('[ERROR] Preload may have compilation issues');
  }
}

// Check main.js
const mainPath = path.join(__dirname, 'dist/main/main.js');
console.log('\nChecking main.js...');
console.log('Path:', mainPath);
console.log('Exists:', fs.existsSync(mainPath));

if (fs.existsSync(mainPath)) {
  const content = fs.readFileSync(mainPath, 'utf-8');
  console.log('File size:', content.length, 'bytes');
  console.log('Contains preload:', content.includes('preload.js'));
  console.log('Contains ipcMain:', content.includes('ipcMain'));
  console.log('Contains dialog:openFiles:', content.includes('dialog:openFiles'));
}
