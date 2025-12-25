import { useState, useEffect, useCallback, useRef } from 'react';
import FileList from './components/FileList';
import Timeline from './components/Timeline';
import Controls from './components/Controls';
import ExportDialog from './components/ExportDialog';
import SettingsDialog from './components/SettingsDialog';
import Header from './components/Header';
import { MediaFile, AppSettings, ExportHistoryItem, UndoState } from './types';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

const defaultSettings: AppSettings = {
  theme: 'dark',
  defaultOutputFolder: '',
  autoSave: true,
  recentProjects: [],
};

function App() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [apiReady, setApiReady] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [exportMode, setExportMode] = useState<'cut' | 'merge'>('cut');
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const [redoStack, setRedoStack] = useState<UndoState[]>([]);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check API availability and load settings on mount
  useEffect(() => {
    console.log('Checking Electron API...');
    console.log('window.electronAPI:', typeof window.electronAPI);
    
    if (window.electronAPI) {
      console.log('[OK] Electron API is available');
      console.log('Available methods:', Object.keys(window.electronAPI));
      setApiReady(true);
      loadSettings();
      loadAutosave();
    } else {
      console.error('[ERROR] Electron API is NOT available.');
      console.error('The preload script did not load correctly.');
      // Only show alert after a longer delay to avoid false positives during hot reload
      setTimeout(() => {
        if (!window.electronAPI) {
          console.error('[CRITICAL] Still no Electron API after 3 seconds');
          alert('CRITICAL ERROR: Electron API not loaded.\n\nPlease close the app and restart with:\nnpm run dev');
        }
      }, 3000);
    }
  }, []);

  // Apply theme
  useEffect(() => {
    if (settings.theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [settings.theme]);

  // Auto-save
  useEffect(() => {
    if (settings.autoSave && files.length > 0) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      autoSaveTimerRef.current = setTimeout(() => {
        saveAutosave();
      }, 5000); // Auto-save every 5 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [files, settings.autoSave]);

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electronAPI.getSettings();
      if (loadedSettings) {
        setSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await window.electronAPI.saveSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const saveAutosave = async () => {
    try {
      const projectData = {
        version: '1.0.0',
        files: files.map(f => ({
          id: f.id,
          path: f.path,
          startCut: f.startCut,
          endCut: f.endCut,
          order: f.order,
        })),
        settings,
        exportHistory,
      };
      
      await window.electronAPI.autosaveProject(projectData);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const loadAutosave = async () => {
    try {
      const projectData = await window.electronAPI.loadAutosave();
      if (projectData && projectData.files.length > 0) {
        // Verify files still exist
        const validFiles: MediaFile[] = [];
        
        for (const fileData of projectData.files) {
          const exists = await window.electronAPI.fileExists(fileData.path);
          if (exists) {
            const mediaInfo = await window.electronAPI.probeMedia(fileData.path);
            validFiles.push({
              id: fileData.id,
              path: fileData.path,
              name: fileData.path.split(/[\\/]/).pop() || '',
              duration: mediaInfo.duration,
              codec: mediaInfo.codec,
              videoCodec: mediaInfo.videoCodec,
              audioCodec: mediaInfo.audioCodec,
              width: mediaInfo.width,
              height: mediaInfo.height,
              frameRate: mediaInfo.frameRate,
              size: mediaInfo.size,
              startCut: fileData.startCut,
              endCut: fileData.endCut,
              order: fileData.order,
            });
          }
        }
        
        if (validFiles.length > 0) {
          setFiles(validFiles);
          setSelectedFile(validFiles[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load autosave:', error);
    }
  };

  const handleFilesAdded = async (filePaths: string[]) => {
    if (!window.electronAPI) {
      console.error('[ERROR] electronAPI not available');
      alert('Error: Electron API not loaded. Please restart the app.');
      return;
    }
    
    console.log('[INFO] Adding files:', filePaths);
    
    const newFiles: MediaFile[] = [];
    const failedFiles: string[] = [];
    const maxOrder = files.length > 0 ? Math.max(...files.map(f => f.order)) : -1;
    
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      
      try {
        console.log('[INFO] Probing media file:', filePath);
        const mediaInfo = await window.electronAPI.probeMedia(filePath);
        console.log('[INFO] Media info received:', mediaInfo);
        
        const fileName = filePath.split(/[\\/]/).pop() || '';
        
        const file: MediaFile = {
          id: uuidv4(),
          path: filePath,
          name: fileName,
          duration: mediaInfo.duration,
          codec: mediaInfo.codec,
          videoCodec: mediaInfo.videoCodec,
          audioCodec: mediaInfo.audioCodec,
          width: mediaInfo.width,
          height: mediaInfo.height,
          frameRate: mediaInfo.frameRate,
          size: mediaInfo.size,
          startCut: 0,
          endCut: mediaInfo.duration,
          order: maxOrder + i + 1,
        };
        
        newFiles.push(file);
        console.log('[OK] File added successfully:', fileName);
      } catch (error: any) {
        console.error('[ERROR] Failed to load file:', filePath);
        console.error('[ERROR] Error details:', error);
        failedFiles.push(filePath);
      }
    }
    
    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      
      if (!selectedFile && newFiles.length > 0) {
        setSelectedFile(newFiles[0]);
      }
      
      console.log('[OK] Added', newFiles.length, 'files successfully');
    }
    
    if (failedFiles.length > 0) {
      const fileNames = failedFiles.map(f => f.split(/[\\/]/).pop()).join('\n');
      alert(`Failed to load ${failedFiles.length} file(s):\n\n${fileNames}\n\nMake sure ffmpeg is installed and the files are valid media files.`);
    }
  };

  const handleFileSelect = (file: MediaFile) => {
    setSelectedFile(file);
  };

  const handleFileRemove = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    
    if (selectedFile?.id === fileId) {
      setSelectedFile(updatedFiles[0] || null);
    }
  };

  const handleFilesReorder = (reorderedFiles: MediaFile[]) => {
    pushUndo({ type: 'reorder', files: [...files] });
    setFiles(reorderedFiles);
  };

  const handleCutChange = (startCut: number, endCut: number) => {
    if (!selectedFile) return;
    
    pushUndo({ 
      type: 'cut', 
      fileId: selectedFile.id,
      startCut: selectedFile.startCut,
      endCut: selectedFile.endCut,
    });
    
    const updatedFiles = files.map(f =>
      f.id === selectedFile.id ? { ...f, startCut, endCut } : f
    );
    
    setFiles(updatedFiles);
    setSelectedFile({ ...selectedFile, startCut, endCut });
  };

  const pushUndo = (state: UndoState) => {
    setUndoStack(prev => [...prev, state]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    const state = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    
    if (state.type === 'cut' && state.fileId) {
      const file = files.find(f => f.id === state.fileId);
      if (file) {
        setRedoStack(prev => [...prev, {
          type: 'cut',
          fileId: file.id,
          startCut: file.startCut,
          endCut: file.endCut,
        }]);
        
        const updatedFiles = files.map(f =>
          f.id === state.fileId ? { ...f, startCut: state.startCut!, endCut: state.endCut! } : f
        );
        setFiles(updatedFiles);
        
        if (selectedFile?.id === state.fileId) {
          setSelectedFile({ ...selectedFile, startCut: state.startCut!, endCut: state.endCut! });
        }
      }
    } else if (state.type === 'reorder' && state.files) {
      setRedoStack(prev => [...prev, { type: 'reorder', files: [...files] }]);
      setFiles(state.files);
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const state = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    
    if (state.type === 'cut' && state.fileId) {
      const file = files.find(f => f.id === state.fileId);
      if (file) {
        setUndoStack(prev => [...prev, {
          type: 'cut',
          fileId: file.id,
          startCut: file.startCut,
          endCut: file.endCut,
        }]);
        
        const updatedFiles = files.map(f =>
          f.id === state.fileId ? { ...f, startCut: state.startCut!, endCut: state.endCut! } : f
        );
        setFiles(updatedFiles);
        
        if (selectedFile?.id === state.fileId) {
          setSelectedFile({ ...selectedFile, startCut: state.startCut!, endCut: state.endCut! });
        }
      }
    } else if (state.type === 'reorder' && state.files) {
      setUndoStack(prev => [...prev, { type: 'reorder', files: [...files] }]);
      setFiles(state.files);
    }
  };

  const handleExportCut = () => {
    setExportMode('cut');
    setShowExportDialog(true);
  };

  const handleExportMerge = () => {
    setExportMode('merge');
    setShowExportDialog(true);
  };

  const handleExportComplete = (outputPath: string, mode: 'cut' | 'merge') => {
    const historyItem: ExportHistoryItem = {
      id: uuidv4(),
      timestamp: Date.now(),
      outputPath,
      type: mode,
    };
    
    setExportHistory(prev => [historyItem, ...prev]);
    setShowExportDialog(false);
  };

  const handleSaveProject = async () => {
    try {
      const projectData = {
        version: '1.0.0',
        files: files.map(f => ({
          id: f.id,
          path: f.path,
          startCut: f.startCut,
          endCut: f.endCut,
          order: f.order,
        })),
        settings,
        exportHistory,
      };
      
      const savedPath = await window.electronAPI.saveProject(projectData);
      if (savedPath) {
        // Add to recent projects
        const recentProjects = [savedPath, ...settings.recentProjects.filter(p => p !== savedPath)].slice(0, 10);
        saveSettings({ ...settings, recentProjects });
      }
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleLoadProject = async () => {
    try {
      const projectData = await window.electronAPI.loadProject();
      if (projectData) {
        // Load files
        const loadedFiles: MediaFile[] = [];
        
        for (const fileData of projectData.files) {
          const exists = await window.electronAPI.fileExists(fileData.path);
          if (exists) {
            const mediaInfo = await window.electronAPI.probeMedia(fileData.path);
            loadedFiles.push({
              id: fileData.id,
              path: fileData.path,
              name: fileData.path.split(/[\\/]/).pop() || '',
              duration: mediaInfo.duration,
              codec: mediaInfo.codec,
              videoCodec: mediaInfo.videoCodec,
              audioCodec: mediaInfo.audioCodec,
              width: mediaInfo.width,
              height: mediaInfo.height,
              frameRate: mediaInfo.frameRate,
              size: mediaInfo.size,
              startCut: fileData.startCut,
              endCut: fileData.endCut,
              order: fileData.order,
            });
          }
        }
        
        setFiles(loadedFiles);
        setSelectedFile(loadedFiles[0] || null);
        
        if (projectData.exportHistory) {
          setExportHistory(projectData.exportHistory);
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      // Export
      else if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        if (files.length > 0) {
          handleExportCut();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, files, selectedFile]);

  if (!apiReady) {
    // Don't show loading screen in browser - only in Electron
    if (typeof window !== 'undefined' && !window.electronAPI) {
      return (
        <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
          <h2>Electron Application Only</h2>
          <p>This application must be run in Electron, not in a web browser.</p>
          <p style={{ fontSize: '12px', color: '#888' }}>Please run: npm run dev</p>
        </div>
      );
    }
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
        <h2>Initializing Application...</h2>
        <p>Loading Electron API and checking dependencies...</p>
        <p style={{ fontSize: '12px', color: '#888' }}>If this persists, check the console for errors and restart the app.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        onExport={handleExportCut}
        onSettings={() => setShowSettingsDialog(true)}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        hasFiles={files.length > 0}
      />
      
      <div className="app-content">
        <div className="left-panel">
          <FileList
            files={files}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            onFilesReorder={handleFilesReorder}
            onFilesAdded={handleFilesAdded}
          />
        </div>
        
        <div className="main-panel">
          {selectedFile ? (
            <Timeline
              file={selectedFile}
              onCutChange={handleCutChange}
            />
          ) : (
            <div className="empty-state">
              <h2>No file selected</h2>
              <p>Add files to get started</p>
            </div>
          )}
        </div>
      </div>
      
      {showExportDialog && (
        <ExportDialog
          mode={exportMode}
          file={selectedFile}
          files={files}
          onClose={() => setShowExportDialog(false)}
          onExportComplete={handleExportComplete}
        />
      )}
      
      {showSettingsDialog && (
        <SettingsDialog
          settings={settings}
          exportHistory={exportHistory}
          onClose={() => setShowSettingsDialog(false)}
          onSave={saveSettings}
        />
      )}
    </div>
  );
}

export default App;
