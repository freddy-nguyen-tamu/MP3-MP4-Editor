import { useState } from 'react';
import { AppSettings, ExportHistoryItem } from '../types';
import './SettingsDialog.css';

interface SettingsDialogProps {
  settings: AppSettings;
  exportHistory: ExportHistoryItem[];
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
}

export default function SettingsDialog({
  settings,
  exportHistory,
  onClose,
  onSave,
}: SettingsDialogProps) {
  const [theme, setTheme] = useState(settings.theme);
  const [defaultOutputFolder, setDefaultOutputFolder] = useState(settings.defaultOutputFolder);
  const [autoSave, setAutoSave] = useState(settings.autoSave);

  const handleSave = () => {
    onSave({
      ...settings,
      theme,
      defaultOutputFolder,
      autoSave,
    });
    onClose();
  };

  const handleSelectFolder = async () => {
    const folder = await window.electronAPI.selectDirectoryDialog();
    if (folder) {
      setDefaultOutputFolder(folder);
    }
  };

  const handleOpenFolder = async (path: string) => {
    const folder = path.substring(0, path.lastIndexOf('/') || path.lastIndexOf('\\'));
    // This would require a new IPC handler to open folders
    console.log('Open folder:', folder);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="settings-dialog-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-dialog-header">
          <h2>Settings</h2>
          <button onClick={onClose} className="settings-dialog-close">×</button>
        </div>

        <div className="settings-dialog-content">
          <div className="settings-section">
            <h3>Appearance</h3>
            
            <div className="settings-field">
              <label>Theme:</label>
              <select value={theme} onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>Export</h3>
            
            <div className="settings-field">
              <label>Default Output Folder:</label>
              <div className="settings-folder-picker">
                <input
                  type="text"
                  value={defaultOutputFolder}
                  placeholder="Not set (will ask each time)"
                  readOnly
                />
                <button onClick={handleSelectFolder}>Browse...</button>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Project</h3>
            
            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
              />
              Auto-save project every 5 seconds
            </label>
          </div>

          {settings.recentProjects.length > 0 && (
            <div className="settings-section">
              <h3>Recent Projects</h3>
              <div className="settings-recent-list">
                {settings.recentProjects.slice(0, 5).map((project, idx) => (
                  <div key={idx} className="settings-recent-item">
                    {project.split(/[\\/]/).pop()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {exportHistory.length > 0 && (
            <div className="settings-section">
              <h3>Export History</h3>
              <div className="settings-history-list">
                {exportHistory.slice(0, 10).map((item) => (
                  <div key={item.id} className="settings-history-item">
                    <div className="settings-history-info">
                      <div className="settings-history-name">
                        {item.outputPath.split(/[\\/]/).pop()}
                      </div>
                      <div className="settings-history-meta">
                        <span className="settings-history-type">
                          {item.type === 'cut' ? 'Cut' : 'Merge'}
                        </span>
                        <span>•</span>
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenFolder(item.outputPath)}
                      className="settings-history-btn"
                      title="Open folder"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="settings-section">
            <h3>About</h3>
            <div className="settings-about">
              <p><strong>Ultimate MP3/MP4 Editor</strong></p>
              <p>Version 1.0.0</p>
              <p>Built with Electron, React, and FFmpeg</p>
              <p className="settings-about-note">
                <strong>FFmpeg License:</strong> This application uses FFmpeg, which is licensed under the LGPL/GPL.
                FFmpeg binaries are not included and must be installed separately or placed in the resources folder.
              </p>
            </div>
          </div>
        </div>

        <div className="settings-dialog-footer">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave} className="primary">Save Settings</button>
        </div>
      </div>
    </div>
  );
}
