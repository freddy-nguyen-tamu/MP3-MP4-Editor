import './Header.css';

interface HeaderProps {
  onExport: () => void;
  onSettings: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasFiles: boolean;
}

export default function Header({
  onExport,
  onSettings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasFiles,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-title">
        <h1>Ultimate MP3/MP4 Editor</h1>
      </div>
      
      <div className="header-actions">
        <button 
          onClick={onUndo} 
          disabled={!canUndo}
          className="tooltip" 
          data-tooltip="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button 
          onClick={onRedo} 
          disabled={!canRedo}
          className="tooltip" 
          data-tooltip="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>
        
        <div className="header-divider" />
        
        <button 
          onClick={onExport}
          disabled={!hasFiles}
          className="tooltip primary"
          data-tooltip="Export to MP3/MP4 (Ctrl+E)"
        >
          Export File
        </button>
        
        <div className="header-divider" />
        
        <button onClick={onSettings} className="tooltip" data-tooltip="Settings">
          Settings
        </button>
      </div>
    </header>
  );
}
