import { useState, useEffect } from 'react';
import { MediaFile, TimelineSegment } from '../types';
import './ExportDialog.css';

interface ExportDialogProps {
  mode: 'cut' | 'merge';
  file: MediaFile | null;
  files: MediaFile[];
  segments?: TimelineSegment[];
  onClose: () => void;
  onExportComplete: (outputPath: string, mode: 'cut' | 'merge') => void;
}

export default function ExportDialog({
  mode,
  file,
  files,
  segments,
  onClose,
  onExportComplete,
}: ExportDialogProps) {
  const [outputFormat, setOutputFormat] = useState('mp3');
  const [keepOriginalQuality, setKeepOriginalQuality] = useState(true);
  const [videoCodec, setVideoCodec] = useState('libx264');
  const [audioCodec, setAudioCodec] = useState('aac');
  const [crf, setCrf] = useState(23);
  const [preset, setPreset] = useState('medium');
  const [normalizeAudio, setNormalizeAudio] = useState(false);
  const [crossfadeDuration, setCrossfadeDuration] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-detect format
    if (mode === 'cut' && file) {
      if (file.videoCodec) {
        setOutputFormat('mp4');
      } else {
        setOutputFormat('mp3');
      }
    } else if (mode === 'merge') {
      const hasVideo = files.some(f => f.videoCodec);
      setOutputFormat(hasVideo ? 'mp4' : 'mp3');
    }

    // Listen for progress
    window.electronAPI.onFFmpegProgress((prog) => {
      setProgress(prog.percent || 0);
    });

    return () => {
      window.electronAPI.removeFFmpegProgressListener();
    };
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      setProgress(0);

      let outputPath: string | null = null;

      if (mode === 'cut' && file) {
        const defaultName = `${file.name.replace(/\.[^.]+$/, '')}_cut.${outputFormat}`;
        outputPath = await window.electronAPI.saveFileDialog(defaultName);
        
        if (!outputPath) {
          setIsExporting(false);
          return;
        }

        const settings = {
          keepOriginalQuality,
          videoCodec: !keepOriginalQuality && outputFormat === 'mp4' ? videoCodec : undefined,
          audioCodec: !keepOriginalQuality ? audioCodec : undefined,
          crf: !keepOriginalQuality && outputFormat === 'mp4' ? crf : undefined,
          preset: !keepOriginalQuality && outputFormat === 'mp4' ? preset : undefined,
        };

        await window.electronAPI.cutMedia({
          inputPath: file.path,
          outputPath,
          startTime: file.startCut,
          endTime: file.endCut,
          settings,
        });
      } else if (mode === 'merge') {
        const defaultName = `merged.${outputFormat}`;
        outputPath = await window.electronAPI.saveFileDialog(defaultName);
        
        if (!outputPath) {
          setIsExporting(false);
          return;
        }

        let inputs;
        
        if (segments && segments.length > 0) {
          // Use timeline segments (multi-track mode)
          inputs = segments
            .sort((a, b) => a.trackPosition - b.trackPosition)
            .map(seg => ({
              path: seg.file.path,
              startTime: seg.startTime,
              endTime: seg.endTime,
            }));
        } else {
          // Use files with their cuts (normal mode)
          inputs = files
            .sort((a, b) => a.order - b.order)
            .map(f => ({
              path: f.path,
              startTime: f.startCut > 0 ? f.startCut : undefined,
              endTime: f.endCut < f.duration ? f.endCut : undefined,
            }));
        }

        const settings = {
          normalizeAudio,
          crossfadeDuration: crossfadeDuration > 0 ? crossfadeDuration : undefined,
          outputFormat,
          keepOriginalQuality,
          videoCodec: !keepOriginalQuality && outputFormat === 'mp4' ? videoCodec : undefined,
          audioCodec: !keepOriginalQuality ? audioCodec : undefined,
        };

        await window.electronAPI.mergeMedia({
          inputs,
          outputPath,
          settings,
        });
      }

      if (outputPath) {
        onExportComplete(outputPath, mode);
      }
    } catch (err: any) {
      setError(err.message || 'Export failed');
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleCancel = () => {
    if (isExporting) {
      window.electronAPI.cancelFFmpeg();
      setIsExporting(false);
    }
    onClose();
  };

  return (
    <div className="export-dialog-overlay" onClick={handleCancel}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="export-dialog-header">
          <h2>{mode === 'cut' ? 'Export Cut' : 'Merge Files'}</h2>
          <button onClick={handleCancel} className="export-dialog-close">×</button>
        </div>

        <div className="export-dialog-content">
          {mode === 'merge' && (
            <div className="export-dialog-section">
              <h3>Files to Merge ({files.length})</h3>
              <div className="export-file-list">
                {files.sort((a, b) => a.order - b.order).map((f, idx) => (
                  <div key={f.id} className="export-file-item">
                    {idx + 1}. {f.name}
                    {(f.startCut > 0 || f.endCut < f.duration) && (
                      <span className="export-file-trim">
                        (trimmed: {formatTime(f.startCut)} - {formatTime(f.endCut)})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="export-dialog-section">
            <h3>Output Format</h3>
            <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
              <option value="mp3">MP3 (Audio)</option>
              <option value="mp4">MP4 (Video/Audio)</option>
              <option value="wav">WAV (Audio)</option>
              <option value="m4a">M4A (Audio)</option>
            </select>
          </div>

          <div className="export-dialog-section">
            <h3>Quality Settings</h3>
            
            <label className="export-checkbox">
              <input
                type="checkbox"
                checked={keepOriginalQuality}
                onChange={(e) => setKeepOriginalQuality(e.target.checked)}
              />
              Keep Original Quality (Fast, Stream Copy)
            </label>

            {!keepOriginalQuality && (
              <>
                {outputFormat === 'mp4' && (
                  <div className="export-dialog-field">
                    <label>Video Codec:</label>
                    <select value={videoCodec} onChange={(e) => setVideoCodec(e.target.value)}>
                      <option value="libx264">H.264 (x264)</option>
                      <option value="libx265">H.265 (HEVC)</option>
                      <option value="copy">Copy (no re-encode)</option>
                    </select>
                  </div>
                )}

                <div className="export-dialog-field">
                  <label>Audio Codec:</label>
                  <select value={audioCodec} onChange={(e) => setAudioCodec(e.target.value)}>
                    <option value="aac">AAC</option>
                    <option value="libmp3lame">MP3</option>
                    <option value="copy">Copy (no re-encode)</option>
                  </select>
                </div>

                {outputFormat === 'mp4' && videoCodec !== 'copy' && (
                  <>
                    <div className="export-dialog-field">
                      <label>Quality (CRF): {crf}</label>
                      <input
                        type="range"
                        min="0"
                        max="51"
                        value={crf}
                        onChange={(e) => setCrf(parseInt(e.target.value))}
                      />
                      <small>Lower = better quality, larger file (23 = default)</small>
                    </div>

                    <div className="export-dialog-field">
                      <label>Encoding Preset:</label>
                      <select value={preset} onChange={(e) => setPreset(e.target.value)}>
                        <option value="ultrafast">Ultra Fast</option>
                        <option value="superfast">Super Fast</option>
                        <option value="veryfast">Very Fast</option>
                        <option value="faster">Faster</option>
                        <option value="fast">Fast</option>
                        <option value="medium">Medium (default)</option>
                        <option value="slow">Slow (better compression)</option>
                        <option value="slower">Slower</option>
                        <option value="veryslow">Very Slow</option>
                      </select>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {mode === 'merge' && (
            <div className="export-dialog-section">
              <h3>Merge Options</h3>
              
              <label className="export-checkbox">
                <input
                  type="checkbox"
                  checked={normalizeAudio}
                  onChange={(e) => setNormalizeAudio(e.target.checked)}
                />
                Normalize Audio Levels
              </label>

              <div className="export-dialog-field">
                <label>Crossfade Duration (seconds): {crossfadeDuration}</label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={crossfadeDuration}
                  onChange={(e) => setCrossfadeDuration(parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="export-dialog-error">
              ERROR: {error}
            </div>
          )}

          {isExporting && (
            <div className="export-dialog-progress">
              <div className="export-dialog-progress-bar">
                <div 
                  className="export-dialog-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="export-dialog-progress-text">
                {progress.toFixed(1)}% - Exporting...
              </div>
            </div>
          )}
        </div>

        <div className="export-dialog-footer">
          <button onClick={handleCancel} disabled={isExporting}>
            Cancel
          </button>
          <button onClick={handleExport} disabled={isExporting} className="primary">
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
