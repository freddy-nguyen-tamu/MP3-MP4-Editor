import './SplitOverlayDialog.css';

export type MergeChoice = 'play-front' | 'play-behind' | 'split-insert' | 'replace-segment' | 'cancel';

interface SplitOverlayDialogProps {
  droppedFileName: string;
  targetFileName: string;
  onChoice: (choice: MergeChoice) => void;
}

export default function SplitOverlayDialog({
  droppedFileName,
  targetFileName,
  onChoice,
}: SplitOverlayDialogProps) {
  const handleChoice = (choice: MergeChoice, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[DIALOG] Button clicked:', choice);
    onChoice(choice);
  };

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
              className="split-overlay-option play-front"
              onClick={(e) => handleChoice('play-front', e)}
            >
              <div className="split-overlay-option-title">🎬 Play in Front</div>
              <div className="split-overlay-option-description">
                Play the dropped file first, then play the target file
              </div>
              <div className="split-overlay-option-example">
                [{droppedFileName}] → [{targetFileName}]
              </div>
            </button>
            
            <button 
              className="split-overlay-option play-behind"
              onClick={(e) => handleChoice('play-behind', e)}
            >
              <div className="split-overlay-option-title">🎬 Play Behind</div>
              <div className="split-overlay-option-description">
                Play the target file first, then play the dropped file
              </div>
              <div className="split-overlay-option-example">
                [{targetFileName}] → [{droppedFileName}]
              </div>
            </button>
            
            <button 
              className="split-overlay-option split-insert"
              onClick={(e) => handleChoice('split-insert', e)}
            >
              <div className="split-overlay-option-title">✂️ Split and Insert</div>
              <div className="split-overlay-option-description">
                Split the target file at drop point and insert the dropped file in the middle
              </div>
              <div className="split-overlay-option-example">
                [Part 1] → [{droppedFileName}] → [Part 2]
              </div>
            </button>
            
            <button 
              className="split-overlay-option replace-segment"
              onClick={(e) => handleChoice('replace-segment', e)}
            >
              <div className="split-overlay-option-title">🔄 Replace Segment</div>
              <div className="split-overlay-option-description">
                Replace the segment of target file (matching dropped file duration) with the dropped file
              </div>
              <div className="split-overlay-option-example">
                [Before] → [{droppedFileName}] → [After]
              </div>
            </button>
          </div>
        </div>
        
        <div className="split-overlay-dialog-footer">
          <button onClick={(e) => handleChoice('cancel', e)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
