const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let win;

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'dist/main/preload.js'),
    },
  });

  // Set up IPC handler
  ipcMain.handle('dialog:openFiles', async () => {
    console.log('IPC handler called!');
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Media Files', extensions: ['mp3', 'mp4', 'm4a', 'wav', 'aac'] },
      ]
    });
    console.log('Selected files:', result.filePaths);
    return result.filePaths;
  });

  win.loadFile('test-ipc.html');
  win.webContents.openDevTools();
  
  win.webContents.on('did-finish-load', () => {
    console.log('Page loaded');
  });
});
