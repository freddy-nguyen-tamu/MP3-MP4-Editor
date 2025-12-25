import { useState } from 'react';
import './SplitOverlayDialog.css';

interface SplitOverlayDialogProps {
  droppedFileName: string;
  targetFileName: string;
  onChoice: (choice: 'split' | 'overlay' | 'cancel') => void;
}

export default function SplitOverlayDialog({
  droppedFileName,
  targetFileName,
  onChoice,
}: SplitOverlayDialogProps) {
  return (
    <div className="split-overlay-dialog-backdrop" onClick={() => onChoice('cancel')}>
      <div className="split-overlay-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="split-overlay-dialog-header">
          <h2>How to arrange these files?</h2>
        </div>
        
        <div className="split-overlay-dialog-content">
          <p className="split-overlay-dialog-description">
            You dropped <strong>{droppedFileName}</strong> onto <strong>{targetFileName}</strong>
          </p>
          
          <div className="split-overlay-dialog-options">
            <button 
              className="split-overlay-option split"
              onClick={() => onChoice('split')}
            >
              <div className="split-overlay-option-title">Split and Insert</div>
              <div className="split-overlay-option-description">
                Split the target file into two parts and insert the dropped file in the middle
              </div>
              <div className="split-overlay-option-example">
                [Part 1] → [Dropped File] → [Part 2]
              </div>
            </button>
            
            <button 
              className="split-overlay-option overlay"
              onClick={() => onChoice('overlay')}
            >
              <div className="split-overlay-option-title">Play Simultaneously</div>
              <div className="split-overlay-option-description">
                Play both files at the same time during this period (audio overlay/mix)
              </div>
              <div className="split-overlay-option-example">
                Both files play together
              </div>
            </button>
          </div>
        </div>
        
        <div className="split-overlay-dialog-footer">
          <button onClick={() => onChoice('cancel')}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
