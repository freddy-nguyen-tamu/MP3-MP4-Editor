import { MediaFile } from '../types';
import './Controls.css';

interface ControlsProps {
  file: MediaFile;
  files: MediaFile[];
  onExportCut: () => void;
  onExportMerge: () => void;
}

export default function Controls({
  file,
  files,
  onExportCut,
  onExportMerge,
}: ControlsProps) {
  const selectionDuration = file.endCut - file.startCut;
  const hasMultipleFiles = files.length > 1;

  return (
    <div className="controls">
      <div className="controls-section">
        <h3>Export Options</h3>
        
        <div className="controls-info">
          <div className="controls-info-item">
            <span className="controls-info-label">Selection Duration:</span>
            <span className="controls-info-value">{formatDuration(selectionDuration)}</span>
          </div>
          
          {file.startCut > 0 || file.endCut < file.duration ? (
            <div className="controls-info-item">
              <span className="controls-info-label">Original Duration:</span>
              <span className="controls-info-value">{formatDuration(file.duration)}</span>
            </div>
          ) : null}
        </div>
        
        <div className="controls-actions">
          <button 
            onClick={onExportCut}
            className="primary controls-btn"
          >
            Export Cut Selection
          </button>
          
          {hasMultipleFiles && (
            <button 
              onClick={onExportMerge}
              className="success controls-btn"
            >
              Merge All Files ({files.length})
            </button>
          )}
        </div>
      </div>
      
      <div className="controls-tips">
        <h4>Tips</h4>
        <ul>
          <li>Use the draggable START and END handles on the timeline to set your cut points</li>
          <li>Click "Play Selection" to preview only the selected region</li>
          <li>Press I to set start cut at current playhead position</li>
          <li>Press O to set end cut at current playhead position</li>
          <li>Use arrow keys to seek: ←/→ (0.5s), Shift+←/→ (5s)</li>
          <li>Add multiple files to enable merge functionality</li>
        </ul>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
