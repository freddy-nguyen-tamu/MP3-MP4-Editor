import './Header.css';

interface HeaderProps {
  onSave: () => void;
  onLoad: () => void;
  onSettings: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function Header({
  onSave,
  onLoad,
  onSettings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-title">
        <h1>Ultimate MP3/MP4 Editor</h1>
      </div>
      
      <div className="header-actions">
        <button onClick={onLoad} className="tooltip" data-tooltip="Open Project (Ctrl+O)">
          📂 Open
        </button>
        <button onClick={onSave} className="tooltip" data-tooltip="Save Project (Ctrl+S)">
          💾 Save
        </button>
        
        <div className="header-divider" />
        
        <button 
          onClick={onUndo} 
          disabled={!canUndo}
          className="tooltip" 
          data-tooltip="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button 
          onClick={onRedo} 
          disabled={!canRedo}
          className="tooltip" 
          data-tooltip="Redo (Ctrl+Shift+Z)"
        >
          ↷
        </button>
        
        <div className="header-divider" />
        
        <button onClick={onSettings} className="tooltip" data-tooltip="Settings">
          ⚙️
        </button>
      </div>
    </header>
  );
}
