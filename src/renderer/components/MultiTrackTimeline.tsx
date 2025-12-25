import { useState, useEffect, useRef } from 'react';
import { MediaFile } from '../types';
import SplitOverlayDialog from './SplitOverlayDialog';
import './MultiTrackTimeline.css';

export interface TimelineSegment {
  id: string;
  fileId: string;
  startTime: number;      // Start time in the segment
  endTime: number;        // End time in the segment
  trackPosition: number;  // Position on timeline (seconds from start)
  duration: number;       // Calculated duration
  file: MediaFile;        // Reference to source file
}

interface MultiTrackTimelineProps {
  files: MediaFile[];
  segments: TimelineSegment[];
  onSegmentsChange: (segments: TimelineSegment[]) => void;
  onSegmentSelect: (segment: TimelineSegment | null) => void;
  selectedSegment: TimelineSegment | null;
  numTracks?: number; // Number of tracks to display
}

// Strong, distinct colors for segments
const SEGMENT_COLORS = [
  { bg: '#E53935', dark: '#C62828' },  // Red
  { bg: '#1E88E5', dark: '#1565C0' },  // Blue
  { bg: '#43A047', dark: '#2E7D32' },  // Green
  { bg: '#FB8C00', dark: '#EF6C00' },  // Orange
  { bg: '#8E24AA', dark: '#6A1B9A' },  // Purple
  { bg: '#00ACC1', dark: '#00838F' },  // Cyan
  { bg: '#F4511E', dark: '#D84315' },  // Deep Orange
  { bg: '#7CB342', dark: '#558B2F' },  // Light Green
  { bg: '#FFB300', dark: '#FF8F00' },  // Amber
  { bg: '#5E35B1', dark: '#4527A0' },  // Deep Purple
];

export default function MultiTrackTimeline({
  files,
  segments,
  onSegmentsChange,
  onSegmentSelect,
  selectedSegment,
  numTracks = 4, // Default 4 tracks
}: MultiTrackTimelineProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedSegmentId, setDraggedSegmentId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartTrack, setDragStartTrack] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showSplitPreview, setShowSplitPreview] = useState(false);
  const [splitPreviewPosition, setSplitPreviewPosition] = useState({ x: 0, track: 0 });
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [pendingSplit, setPendingSplit] = useState<{
    targetSegment: TimelineSegment;
    droppedSegment: TimelineSegment;
    splitTime: number;
  } | null>(null);
  
  const TRACK_HEIGHT = 120;
  const TRACK_MARGIN = 10;
  
  // Assign colors to files
  const getSegmentColor = (fileId: string) => {
    const fileIndex = files.findIndex(f => f.id === fileId);
    return SEGMENT_COLORS[fileIndex % SEGMENT_COLORS.length];
  };

  // Calculate total timeline duration
  const totalDuration = segments.reduce((max, seg) => {
    return Math.max(max, seg.trackPosition + seg.duration);
  }, 0);

  const pixelsPerSecond = 50 * zoom;

  const handleSegmentMouseDown = (e: React.MouseEvent, segment: TimelineSegment) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const segmentX = segment.trackPosition * pixelsPerSecond;
    const segmentY = segment.trackIndex * (TRACK_HEIGHT + TRACK_MARGIN);
    
    setIsDragging(true);
    setDraggedSegmentId(segment.id);
    setDragStartTrack(segment.trackIndex);
    setDragOffset({ x: clickX - segmentX, y: clickY - segmentY });
    onSegmentSelect(segment);
  };

  // Check if dropping on another segment would split it
  const checkForSplit = (draggedSeg: TimelineSegment, mouseX: number, mouseY: number) => {
    const timePosition = mouseX / pixelsPerSecond;
    const trackIndex = Math.floor(mouseY / (TRACK_HEIGHT + TRACK_MARGIN));
    
    // Find segment at this position (can be on ANY track, including same)
    const targetSegment = segments.find(seg => 
      seg.id !== draggedSeg.id &&
      seg.trackIndex === trackIndex &&
      timePosition > seg.trackPosition &&
      timePosition < seg.trackPosition + seg.duration
    );
    
    return targetSegment ? { segment: targetSegment, splitTime: timePosition } : null;
  };

  useEffect(() => {
    if (!isDragging || !draggedSegmentId || !timelineRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x + scrollPosition;
      const y = e.clientY - rect.top - dragOffset.y;
      
      const newPosition = Math.max(0, x / pixelsPerSecond);
      const newTrackIndex = Math.max(0, Math.min(numTracks - 1, Math.floor(y / (TRACK_HEIGHT + TRACK_MARGIN))));
      
      // Check if we're hovering over another segment for potential split
      const draggedSeg = segments.find(s => s.id === draggedSegmentId);
      if (draggedSeg) {
        const splitInfo = checkForSplit(draggedSeg, x, y);
        if (splitInfo) {
          setShowSplitPreview(true);
          setSplitPreviewPosition({ x: splitInfo.splitTime * pixelsPerSecond, track: newTrackIndex });
        } else {
          setShowSplitPreview(false);
        }
      }
      
      // Update segment position and track
      const updatedSegments = segments.map(seg => {
        if (seg.id === draggedSegmentId) {
          return { ...seg, trackPosition: newPosition, trackIndex: newTrackIndex };
        }
        return seg;
      });
      
      onSegmentsChange(updatedSegments);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x + scrollPosition;
      const y = e.clientY - rect.top - dragOffset.y;
      
      const draggedSeg = segments.find(s => s.id === draggedSegmentId);
      if (draggedSeg) {
        const splitInfo = checkForSplit(draggedSeg, x, y);
        
        if (splitInfo) {
          // User dropped on another segment - show dialog to choose split or overlay
          setPendingSplit({
            targetSegment: splitInfo.segment,
            droppedSegment: draggedSeg,
            splitTime: splitInfo.splitTime,
          });
          setShowSplitDialog(true);
        }
      }
      
      setIsDragging(false);
      setDraggedSegmentId(null);
      setShowSplitPreview(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, draggedSegmentId, dragOffset, pixelsPerSecond, segments, scrollPosition, numTracks]);

  // Handle user choice from dialog
  const handleSplitChoice = (choice: 'split' | 'overlay' | 'cancel') => {
    if (!pendingSplit) return;
    
    const { targetSegment, droppedSegment, splitTime } = pendingSplit;
    
    if (choice === 'split') {
      performSplit(targetSegment, splitTime, droppedSegment);
    } else if (choice === 'overlay') {
      performOverlay(targetSegment, droppedSegment, splitTime);
    } else {
      // Cancel - revert dropped segment to original position
      const updatedSegments = segments.map(seg => {
        if (seg.id === droppedSegment.id) {
          return { ...seg, trackIndex: dragStartTrack };
        }
        return seg;
      });
      onSegmentsChange(updatedSegments);
    }
    
    setShowSplitDialog(false);
    setPendingSplit(null);
  };
  
  // Split a segment when another is dropped on it
  const performSplit = (targetSegment: TimelineSegment, splitTime: number, droppedSegment: TimelineSegment) => {
    const { v4: uuidv4 } = require('uuid');
    
    const splitPoint = splitTime - targetSegment.trackPosition;
    const splitTimeInFile = targetSegment.startTime + splitPoint;
    
    if (splitPoint <= 0.1 || splitPoint >= targetSegment.duration - 0.1) {
      // Split point is too close to edge, no split needed
      console.log('[INFO] Split point too close to edge, ignoring');
      return;
    }
    
    console.log('[INFO] Splitting segment:', {
      targetFile: targetSegment.file.name,
      splitTime: splitTime,
      splitPoint: splitPoint,
      splitTimeInFile: splitTimeInFile
    });
    
    // Create two new segments from the split
    const firstPart: TimelineSegment = {
      id: uuidv4(),
      fileId: targetSegment.fileId,
      startTime: targetSegment.startTime,
      endTime: splitTimeInFile,
      trackPosition: targetSegment.trackPosition,
      trackIndex: targetSegment.trackIndex,
      duration: splitPoint,
      file: targetSegment.file,
    };
    
    const secondPart: TimelineSegment = {
      id: uuidv4(),
      fileId: targetSegment.fileId,
      startTime: splitTimeInFile,
      endTime: targetSegment.endTime,
      trackPosition: splitTime + droppedSegment.duration,
      trackIndex: targetSegment.trackIndex,
      duration: targetSegment.duration - splitPoint,
      file: targetSegment.file,
    };
    
    // Update segments: remove original, add two parts
    const updatedSegments = segments
      .filter(seg => seg.id !== targetSegment.id)
      .concat([firstPart, secondPart]);
    
    onSegmentsChange(updatedSegments);
    console.log('[INFO] Segment split complete. Created 2 new segments.');
  };
  
  // Overlay audio/video simultaneously
  const performOverlay = (targetSegment: TimelineSegment, droppedSegment: TimelineSegment, splitTime: number) => {
    // Mark as overlay and position at the same time as target
    const updatedSegments = segments.map(seg => {
      if (seg.id === droppedSegment.id) {
        return { 
          ...seg, 
          isAudioOverlay: true,
          trackPosition: targetSegment.trackPosition, // Align with target start
        };
      }
      return seg;
    });
    onSegmentsChange(updatedSegments);
    console.log('[INFO] Overlay created - files will play simultaneously');
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    onSegmentSelect(null);
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {showSplitDialog && pendingSplit && (
        <SplitOverlayDialog
          droppedFileName={pendingSplit.droppedSegment.file.name}
          targetFileName={pendingSplit.targetSegment.file.name}
          onChoice={handleSplitChoice}
        />
      )}
      
      <div className="multi-track-timeline">
        <div className="multi-track-header">
        <h3>Timeline Arrangement</h3>
        <div className="multi-track-controls">
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>Zoom Out</button>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(3, zoom + 0.25))}>Zoom In</button>
        </div>
      </div>

      <div 
        ref={timelineRef}
        className="multi-track-container"
        onClick={handleTimelineClick}
        onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
      >
        {/* Time ruler */}
        <div className="multi-track-ruler" style={{ width: `${Math.max(totalDuration + 10, 60) * pixelsPerSecond}px` }}>
          {Array.from({ length: Math.ceil(totalDuration / 5) + 2 }).map((_, i) => {
            const time = i * 5;
            return (
              <div
                key={i}
                className="multi-track-ruler-mark"
                style={{ left: `${time * pixelsPerSecond}px` }}
              >
                <span>{formatTime(time)}</span>
              </div>
            );
          })}
        </div>

        {/* Multiple tracks */}
        <div className="multi-track-tracks" style={{ width: `${Math.max(totalDuration + 10, 60) * pixelsPerSecond}px`, height: `${numTracks * (TRACK_HEIGHT + TRACK_MARGIN)}px` }}>
          {/* Track backgrounds */}
          {Array.from({ length: numTracks }).map((_, trackIdx) => (
            <div
              key={`track-${trackIdx}`}
              className="multi-track-track"
              style={{
                top: `${trackIdx * (TRACK_HEIGHT + TRACK_MARGIN)}px`,
                height: `${TRACK_HEIGHT}px`,
              }}
            >
              <div className="multi-track-track-label">Track {trackIdx + 1}</div>
            </div>
          ))}
          
          {/* Split preview line */}
          {showSplitPreview && (
            <div
              className="multi-track-split-preview"
              style={{
                left: `${splitPreviewPosition.x}px`,
                top: `${splitPreviewPosition.track * (TRACK_HEIGHT + TRACK_MARGIN)}px`,
                height: `${TRACK_HEIGHT}px`,
              }}
            />
          )}
          
          {/* Segments */}
          {segments.map(segment => {
            const colors = getSegmentColor(segment.fileId);
            return (
              <div
                key={segment.id}
                className={`multi-track-segment ${selectedSegment?.id === segment.id ? 'selected' : ''} ${isDragging && draggedSegmentId === segment.id ? 'dragging' : ''} ${segment.isAudioOverlay ? 'audio-overlay' : ''}`}
                style={{
                  left: `${segment.trackPosition * pixelsPerSecond}px`,
                  top: `${segment.trackIndex * (TRACK_HEIGHT + TRACK_MARGIN)}px`,
                  width: `${Math.max(segment.duration * pixelsPerSecond, 40)}px`,
                  minWidth: '40px',
                  height: `${TRACK_HEIGHT}px`,
                  background: segment.isAudioOverlay 
                    ? `linear-gradient(135deg, ${colors.bg}CC 0%, ${colors.dark}CC 100%)`
                    : `linear-gradient(135deg, ${colors.bg} 0%, ${colors.dark} 100%)`,
                  borderColor: colors.dark,
                }}
                onMouseDown={(e) => handleSegmentMouseDown(e, segment)}
              >
                <div className="multi-track-segment-content">
                  <div className="multi-track-segment-name">
                    {segment.file.name}
                    {segment.isAudioOverlay && <span className="overlay-badge">AUDIO OVERLAY</span>}
                  </div>
                  <div className="multi-track-segment-time">
                    {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                  </div>
                  <div className="multi-track-segment-duration">
                    Duration: {formatTime(segment.duration)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="multi-track-info">
        <p>Total Duration: {formatTime(totalDuration)}</p>
        <p>Drag segments to rearrange them on the timeline</p>
      </div>
    </div>
    </>
  );
}
