import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Dialog operations
  openFilesDialog: () => ipcRenderer.invoke('dialog:openFiles'),
  saveFileDialog: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  selectDirectoryDialog: () => ipcRenderer.invoke('dialog:selectDirectory'),
  
  // FFmpeg operations
  probeMedia: (filePath: string) => ipcRenderer.invoke('ffmpeg:probe', filePath),
  cutMedia: (options: any) => ipcRenderer.invoke('ffmpeg:cut', options),
  mergeMedia: (options: any) => ipcRenderer.invoke('ffmpeg:merge', options),
  generateWaveform: (filePath: string, width: number, height: number) => 
    ipcRenderer.invoke('ffmpeg:generateWaveform', filePath, width, height),
  cancelFFmpeg: () => ipcRenderer.invoke('ffmpeg:cancel'),
  
  // Progress listener
  onFFmpegProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('ffmpeg:progress', (_event, progress) => callback(progress));
  },
  removeFFmpegProgressListener: () => {
    ipcRenderer.removeAllListeners('ffmpeg:progress');
  },
  
  // Project operations
  saveProject: (projectData: any) => ipcRenderer.invoke('project:save', projectData),
  loadProject: () => ipcRenderer.invoke('project:load'),
  autosaveProject: (projectData: any) => ipcRenderer.invoke('project:autosave', projectData),
  loadAutosave: () => ipcRenderer.invoke('project:loadAutosave'),
  
  // Settings operations
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  
  // File system operations
  fileExists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
  getFileSize: (filePath: string) => ipcRenderer.invoke('fs:getFileSize', filePath),
  getAppPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
});

declare global {
  interface Window {
    electronAPI: {
      openFilesDialog: () => Promise<string[]>;
      saveFileDialog: (defaultName: string) => Promise<string | null>;
      selectDirectoryDialog: () => Promise<string | null>;
      probeMedia: (filePath: string) => Promise<any>;
      cutMedia: (options: any) => Promise<any>;
      mergeMedia: (options: any) => Promise<any>;
      generateWaveform: (filePath: string, width: number, height: number) => Promise<string>;
      cancelFFmpeg: () => Promise<void>;
      onFFmpegProgress: (callback: (progress: any) => void) => void;
      removeFFmpegProgressListener: () => void;
      saveProject: (projectData: any) => Promise<string | null>;
      loadProject: () => Promise<any>;
      autosaveProject: (projectData: any) => Promise<string>;
      loadAutosave: () => Promise<any>;
      getSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<void>;
      fileExists: (filePath: string) => Promise<boolean>;
      getFileSize: (filePath: string) => Promise<number>;
      getAppPath: (name: string) => Promise<string>;
    };
  }
}
