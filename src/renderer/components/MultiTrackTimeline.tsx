import { useState, useEffect, useRef } from 'react';
import { MediaFile } from '../types';
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
}: MultiTrackTimelineProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedSegmentId, setDraggedSegmentId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  
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
    const segmentX = segment.trackPosition * pixelsPerSecond;
    
    setIsDragging(true);
    setDraggedSegmentId(segment.id);
    setDragOffset({ x: clickX - segmentX, y: 0 });
    onSegmentSelect(segment);
  };

  useEffect(() => {
    if (!isDragging || !draggedSegmentId || !timelineRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x + scrollPosition;
      const newPosition = Math.max(0, x / pixelsPerSecond);
      
      // Update segment position
      const updatedSegments = segments.map(seg => {
        if (seg.id === draggedSegmentId) {
          return { ...seg, trackPosition: newPosition };
        }
        return seg;
      });
      
      onSegmentsChange(updatedSegments);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggedSegmentId(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, draggedSegmentId, dragOffset, pixelsPerSecond, segments, scrollPosition]);

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

        {/* Track area */}
        <div className="multi-track-area" style={{ width: `${Math.max(totalDuration + 10, 60) * pixelsPerSecond}px` }}>
          {segments.map(segment => {
            const colors = getSegmentColor(segment.fileId);
            return (
              <div
                key={segment.id}
                className={`multi-track-segment ${selectedSegment?.id === segment.id ? 'selected' : ''} ${isDragging && draggedSegmentId === segment.id ? 'dragging' : ''}`}
                style={{
                  left: `${segment.trackPosition * pixelsPerSecond}px`,
                  width: `${Math.max(segment.duration * pixelsPerSecond, 40)}px`,
                  minWidth: '40px',
                  background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.dark} 100%)`,
                  borderColor: colors.dark,
                }}
                onMouseDown={(e) => handleSegmentMouseDown(e, segment)}
              >
                <div className="multi-track-segment-content">
                  <div className="multi-track-segment-name">{segment.file.name}</div>
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
  );
}
