import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { FFmpegService } from './services/ffmpeg.service';
import { ProjectService } from './services/project.service';

// Disable hardware acceleration for remote desktop compatibility
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;
const ffmpegService = new FFmpegService();
const projectService = new ProjectService();

// Register custom protocol for local media files
app.whenReady().then(() => {
  protocol.registerFileProtocol('media-file', (request, callback) => {
    const url = request.url.replace('media-file://', '');
    const decodedPath = decodeURIComponent(url);
    try {
      return callback(decodedPath);
    } catch (error) {
      console.error('Failed to load media file:', error);
      return callback({ error: -2 }); // FAILED
    }
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Allow loading local files
    },
    backgroundColor: '#1a1a1a',
    show: false,
  });

  // Load the app
  const isDev = !app.isPackaged;
  if (isDev) {
    // Try common Vite dev server ports
    const vitePort = process.env.VITE_DEV_SERVER_PORT || '5173';
    mainWindow.loadURL(`http://localhost:${vitePort}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    console.log('[INFO] Window ready to show');
    mainWindow?.show();
  });

  // Fallback: show window after 3 seconds even if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('[WARNING] Window not showing after 3s, forcing show');
      mainWindow.show();
    }
  }, 3000);

  // Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[INFO] Page finished loading');
  });

  // Log any errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[ERROR] Page failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers

// File operations
ipcMain.handle('dialog:openFiles', async () => {
  if (!mainWindow) return [];
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media Files', extensions: ['mp3', 'mp4', 'm4a', 'wav', 'aac', 'mkv', 'avi', 'mov'] },
      { name: 'Audio', extensions: ['mp3', 'm4a', 'wav', 'aac'] },
      { name: 'Video', extensions: ['mp4', 'mkv', 'avi', 'mov'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  return result.filePaths;
});

ipcMain.handle('dialog:saveFile', async (_event, defaultName: string) => {
  if (!mainWindow) return null;
  
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'MP3 Audio', extensions: ['mp3'] },
      { name: 'MP4 Video', extensions: ['mp4'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  return result.filePath;
});

ipcMain.handle('dialog:selectDirectory', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  return result.filePaths[0] || null;
});

// FFmpeg operations
ipcMain.handle('ffmpeg:probe', async (_event, filePath: string) => {
  try {
    return await ffmpegService.probeMedia(filePath);
  } catch (error: any) {
    throw new Error(`Failed to probe media: ${error.message}`);
  }
});

ipcMain.handle('ffmpeg:cut', async (_event, options: any) => {
  try {
    const result = await ffmpegService.cutMedia(
      options.inputPath,
      options.outputPath,
      options.startTime,
      options.endTime,
      options.settings,
      (progress) => {
        mainWindow?.webContents.send('ffmpeg:progress', progress);
      }
    );
    return result;
  } catch (error: any) {
    throw new Error(`Failed to cut media: ${error.message}`);
  }
});

ipcMain.handle('ffmpeg:merge', async (_event, options: any) => {
  try {
    const result = await ffmpegService.mergeMedia(
      options.inputs,
      options.outputPath,
      options.settings,
      (progress) => {
        mainWindow?.webContents.send('ffmpeg:progress', progress);
      }
    );
    return result;
  } catch (error: any) {
    throw new Error(`Failed to merge media: ${error.message}`);
  }
});

ipcMain.handle('ffmpeg:mergeTimeline', async (_event, options: any) => {
  try {
    const result = await ffmpegService.mergeTimelineSegments(
      options.segments,
      options.outputPath,
      options.settings,
      (progress) => {
        mainWindow?.webContents.send('ffmpeg:progress', progress);
      }
    );
    return result;
  } catch (error: any) {
    throw new Error(`Failed to merge timeline: ${error.message}`);
  }
});

ipcMain.handle('ffmpeg:generateWaveform', async (_event, filePath: string, width: number, height: number) => {
  try {
    return await ffmpegService.generateWaveform(filePath, width, height);
  } catch (error: any) {
    throw new Error(`Failed to generate waveform: ${error.message}`);
  }
});

ipcMain.handle('ffmpeg:cancel', async () => {
  ffmpegService.cancelCurrentOperation();
});

// Project operations
ipcMain.handle('project:save', async (_event, projectData: any) => {
  if (!mainWindow) return null;
  
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'project.umpe',
    filters: [
      { name: 'Ultimate Editor Project', extensions: ['umpe'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (result.filePath) {
    await projectService.saveProject(result.filePath, projectData);
    return result.filePath;
  }
  
  return null;
});

ipcMain.handle('project:load', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Ultimate Editor Project', extensions: ['umpe'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (result.filePaths[0]) {
    return await projectService.loadProject(result.filePaths[0]);
  }
  
  return null;
});

ipcMain.handle('project:autosave', async (_event, projectData: any) => {
  const autosavePath = path.join(app.getPath('userData'), 'autosave.umpe');
  await projectService.saveProject(autosavePath, projectData);
  return autosavePath;
});

ipcMain.handle('project:loadAutosave', async () => {
  const autosavePath = path.join(app.getPath('userData'), 'autosave.umpe');
  if (fs.existsSync(autosavePath)) {
    return await projectService.loadProject(autosavePath);
  }
  return null;
});

// Settings operations
ipcMain.handle('settings:get', async () => {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  if (fs.existsSync(settingsPath)) {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  }
  return null;
});

ipcMain.handle('settings:save', async (_event, settings: any) => {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
});

// File system operations
ipcMain.handle('fs:exists', async (_event, filePath: string) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('fs:getFileSize', async (_event, filePath: string) => {
  const stats = fs.statSync(filePath);
  return stats.size;
});

ipcMain.handle('app:getPath', async (_event, name: string) => {
  return app.getPath(name as any);
});

ipcMain.handle('fs:readMediaFile', async (_event, filePath: string) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    
    // Determine MIME type
    let mimeType = 'application/octet-stream';
    if (['.mp3'].includes(ext)) mimeType = 'audio/mpeg';
    else if (['.mp4'].includes(ext)) mimeType = 'video/mp4';
    else if (['.m4a'].includes(ext)) mimeType = 'audio/mp4';
    else if (['.wav'].includes(ext)) mimeType = 'audio/wav';
    else if (['.aac'].includes(ext)) mimeType = 'audio/aac';
    else if (['.mkv'].includes(ext)) mimeType = 'video/x-matroska';
    else if (['.avi'].includes(ext)) mimeType = 'video/x-msvideo';
    else if (['.mov'].includes(ext)) mimeType = 'video/quicktime';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error: any) {
    throw new Error(`Failed to read media file: ${error.message}`);
  }
});
