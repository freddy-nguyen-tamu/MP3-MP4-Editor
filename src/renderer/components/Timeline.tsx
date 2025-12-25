import { useState, useEffect, useRef, useCallback } from 'react';
import { MediaFile } from '../types';
import './Timeline.css';

interface TimelineProps {
  file: MediaFile;
  onCutChange: (startCut: number, endCut: number) => void;
}

export default function Timeline({ file, onCutChange }: TimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformData, setWaveformData] = useState<string | null>(null);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [startCut, setStartCut] = useState(file.startCut);
  const [endCut, setEndCut] = useState(file.endCut);
  const [playMode, setPlayMode] = useState<'full' | 'selection' | 'fromStart'>('selection');
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const isVideo = !!file.videoCodec;
  const mediaRef = isVideo ? videoRef : audioRef;

  // Set media URL using custom protocol
  useEffect(() => {
    // Use custom protocol for better performance (no base64 encoding)
    const mediaUrl = `media-file://${encodeURIComponent(file.path)}`;
    setMediaDataUrl(mediaUrl);
  }, [file.path]);

  // Load waveform for audio
  useEffect(() => {
    if (!isVideo && file.audioCodec) {
      loadWaveform();
    }
  }, [file.id]);

  // Reset cuts when file changes
  useEffect(() => {
    setStartCut(file.startCut);
    setEndCut(file.endCut);
    setCurrentTime(file.startCut);
    if (mediaRef.current) {
      mediaRef.current.currentTime = file.startCut;
    }
  }, [file.id]);

  const loadWaveform = async () => {
    try {
      const waveform = await window.electronAPI.generateWaveform(file.path, 800, 100);
      setWaveformData(waveform);
    } catch (error) {
      console.error('Failed to generate waveform:', error);
    }
  };

  // Use timeupdate event instead of requestAnimationFrame to reduce glitching
  useEffect(() => {
    if (!mediaRef.current) return;
    
    const handleTimeUpdate = () => {
      if (mediaRef.current) {
        const time = mediaRef.current.currentTime;
        
        // Auto-stop at end cut when playing selection
        if (isPlaying && playMode === 'selection' && time >= endCut) {
          mediaRef.current.pause();
          setIsPlaying(false);
          if (mediaRef.current.currentTime !== startCut) {
            mediaRef.current.currentTime = startCut;
          }
          setCurrentTime(startCut);
          return;
        }
        
        setCurrentTime(time);
      }
    };
    
    mediaRef.current.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      if (mediaRef.current) {
        mediaRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [isPlaying, playMode, endCut, startCut]);

  const handlePlayPause = () => {
    if (!mediaRef.current) return;
    
    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      // Ensure we're at the right position before playing
      if (mediaRef.current.paused) {
        mediaRef.current.play().catch(err => {
          console.error('[ERROR] Playback failed:', err);
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
    }
  };

  const handlePlaySelection = () => {
    if (!mediaRef.current) return;
    
    setPlayMode('selection');
    mediaRef.current.currentTime = startCut;
    setCurrentTime(startCut);
    mediaRef.current.play().catch(err => {
      console.error('[ERROR] Playback failed:', err);
      setIsPlaying(false);
    });
    setIsPlaying(true);
  };

  const handlePlayFromStart = () => {
    if (!mediaRef.current) return;
    
    setPlayMode('fromStart');
    mediaRef.current.currentTime = startCut;
    setCurrentTime(startCut);
    mediaRef.current.play().catch(err => {
      console.error('[ERROR] Playback failed:', err);
      setIsPlaying(false);
    });
    setIsPlaying(true);
  };

  const handlePlayFull = () => {
    if (!mediaRef.current) return;
    
    setPlayMode('full');
    mediaRef.current.currentTime = 0;
    setCurrentTime(0);
    mediaRef.current.play().catch(err => {
      console.error('[ERROR] Playback failed:', err);
      setIsPlaying(false);
    });
    setIsPlaying(true);
  };

  const handleSetStart = () => {
    const newStart = Math.min(currentTime, endCut - 0.1);
    setStartCut(newStart);
    onCutChange(newStart, endCut);
  };

  const handleSetEnd = () => {
    const newEnd = Math.max(currentTime, startCut + 0.1);
    setEndCut(newEnd);
    onCutChange(startCut, newEnd);
  };

  const handleResetCuts = () => {
    setStartCut(0);
    setEndCut(file.duration);
    onCutChange(0, file.duration);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !mediaRef.current) return;
    if (isDraggingStart || isDraggingEnd) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const time = percent * file.duration;
    
    mediaRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleStartDrag = (type: 'start' | 'end' | 'playhead') => (e: React.MouseEvent) => {
    e.preventDefault();
    if (type === 'start') setIsDraggingStart(true);
    else if (type === 'end') setIsDraggingEnd(true);
    else setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      if (!isDraggingStart && !isDraggingEnd && !isDraggingPlayhead) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const time = percent * file.duration;
      
      if (isDraggingStart) {
        const newStart = Math.min(time, endCut - 0.1);
        setStartCut(Math.max(0, newStart));
      } else if (isDraggingEnd) {
        const newEnd = Math.max(time, startCut + 0.1);
        setEndCut(Math.min(file.duration, newEnd));
      } else if (isDraggingPlayhead) {
        if (mediaRef.current) {
          mediaRef.current.currentTime = time;
          setCurrentTime(time);
        }
      }
    };

    const handleMouseUp = () => {
      if (isDraggingStart || isDraggingEnd) {
        onCutChange(startCut, endCut);
      }
      setIsDraggingStart(false);
      setIsDraggingEnd(false);
      setIsDraggingPlayhead(false);
    };

    if (isDraggingStart || isDraggingEnd || isDraggingPlayhead) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingStart, isDraggingEnd, isDraggingPlayhead, startCut, endCut, file.duration]);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const handleStartInputChange = (value: string) => {
    const time = parseTimeString(value);
    if (!isNaN(time) && time >= 0 && time < endCut) {
      setStartCut(time);
      onCutChange(time, endCut);
    }
  };

  const handleEndInputChange = (value: string) => {
    const time = parseTimeString(value);
    if (!isNaN(time) && time > startCut && time <= file.duration) {
      setEndCut(time);
      onCutChange(startCut, time);
    }
  };

  const parseTimeString = (str: string): number => {
    const parts = str.split(':');
    if (parts.length === 3) {
      const [h, m, s] = parts;
      return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
    } else if (parts.length === 2) {
      const [m, s] = parts;
      return parseInt(m) * 60 + parseFloat(s);
    }
    return parseFloat(str);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      
      if (e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === 'i') {
        e.preventDefault();
        handleSetStart();
      } else if (e.key === 'o') {
        e.preventDefault();
        handleSetEnd();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 0.5;
        const newTime = Math.max(0, currentTime - delta);
        if (mediaRef.current) {
          mediaRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 0.5;
        const newTime = Math.min(file.duration, currentTime + delta);
        if (mediaRef.current) {
          mediaRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, file.duration, isPlaying]);

  const startPercent = (startCut / file.duration) * 100;
  const endPercent = (endCut / file.duration) * 100;
  const playheadPercent = (currentTime / file.duration) * 100;

  return (
    <div className="timeline">
      <div className="timeline-preview">
        {isVideo ? (
          <video
            ref={videoRef}
            src={mediaDataUrl || ''}
            className="timeline-video"
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            preload="metadata"
            playsInline
          />
        ) : (
          <>
            <audio
              ref={audioRef}
              src={mediaDataUrl || ''}
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              preload="metadata"
            />
            <div className="timeline-audio-viz">
              {waveformData ? (
                <img src={waveformData} alt="Waveform" className="timeline-waveform" />
              ) : (
                <div className="timeline-audio-placeholder">
                  <p>Audio File</p>
                  <p className="timeline-audio-name">{file.name}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      <div className="timeline-controls">
        <button onClick={handlePlayPause} className="timeline-control-btn primary">
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={handlePlaySelection} className="timeline-control-btn success">
          Play Selection
        </button>
        <button onClick={handlePlayFromStart} className="timeline-control-btn">
          From Start Cut
        </button>
        <button onClick={handlePlayFull} className="timeline-control-btn">
          Full
        </button>
        
        <div className="timeline-control-divider" />
        
        <button onClick={handleSetStart} className="timeline-control-btn" title="Set Start (I)">
          Set Start
        </button>
        <button onClick={handleSetEnd} className="timeline-control-btn" title="Set End (O)">
          Set End
        </button>
        <button onClick={handleResetCuts} className="timeline-control-btn">
          Reset Cuts
        </button>
        
        <div className="timeline-time-display">
          {formatTime(currentTime)} / {formatTime(file.duration)}
        </div>
      </div>
      
      <div className="timeline-track-container">
        <div 
          ref={timelineRef}
          className="timeline-track"
          onClick={handleTimelineClick}
        >
          {/* Waveform background for audio */}
          {!isVideo && waveformData && (
            <div className="timeline-waveform-bg">
              <img src={waveformData} alt="Waveform" />
            </div>
          )}
          
          {/* Selection region */}
          <div 
            className="timeline-selection"
            style={{
              left: `${startPercent}%`,
              width: `${endPercent - startPercent}%`,
            }}
          />
          
          {/* Start handle */}
          <div
            className="timeline-handle timeline-handle-start"
            style={{ left: `${startPercent}%` }}
            onMouseDown={handleStartDrag('start')}
          >
            <div className="timeline-handle-label">START</div>
          </div>
          
          {/* End handle */}
          <div
            className="timeline-handle timeline-handle-end"
            style={{ left: `${endPercent}%` }}
            onMouseDown={handleStartDrag('end')}
          >
            <div className="timeline-handle-label">END</div>
          </div>
          
          {/* Playhead */}
          <div
            className="timeline-playhead"
            style={{ left: `${playheadPercent}%` }}
            onMouseDown={handleStartDrag('playhead')}
          />
        </div>
        
        <div className="timeline-inputs">
          <div className="timeline-input-group">
            <label>Start Cut:</label>
            <input
              type="text"
              value={formatTime(startCut)}
              onChange={(e) => handleStartInputChange(e.target.value)}
              onBlur={(e) => handleStartInputChange(e.target.value)}
            />
          </div>
          
          <div className="timeline-input-group">
            <label>End Cut:</label>
            <input
              type="text"
              value={formatTime(endCut)}
              onChange={(e) => handleEndInputChange(e.target.value)}
              onBlur={(e) => handleEndInputChange(e.target.value)}
            />
          </div>
          
          <div className="timeline-input-group">
            <label>Selection:</label>
            <span className="timeline-duration">{formatTime(endCut - startCut)}</span>
          </div>
        </div>
      </div>
      
      <div className="timeline-shortcuts">
        <span>Space: Play/Pause</span>
        <span>I: Set Start</span>
        <span>O: Set End</span>
        <span>←/→: Seek (±0.5s)</span>
        <span>Shift+←/→: Seek (±5s)</span>
      </div>
    </div>
  );
}
