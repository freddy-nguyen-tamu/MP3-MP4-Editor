// Debug script to check Electron app setup
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  console.log('App ready!');
  console.log('App path:', app.getAppPath());
  console.log('isPackaged:', app.isPackaged);
  
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'dist/main/preload.js'),
    },
  });

  console.log('Preload path:', path.join(__dirname, 'dist/main/preload.js'));
  console.log('Preload exists:', require('fs').existsSync(path.join(__dirname, 'dist/main/preload.js')));

  win.webContents.on('did-finish-load', () => {
    console.log('Page loaded!');
    win.webContents.executeJavaScript(`
      console.log('electronAPI available:', typeof window.electronAPI !== 'undefined');
      if (window.electronAPI) {
        console.log('API methods:', Object.keys(window.electronAPI));
      }
    `);
  });

  win.loadURL('http://localhost:5173');
  win.webContents.openDevTools();
});
