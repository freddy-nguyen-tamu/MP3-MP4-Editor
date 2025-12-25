import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MediaFile } from '../types';
import SplitOverlayDialog, { MergeChoice } from './SplitOverlayDialog';
import './MultiTrackTimeline.css';

export interface TimelineSegment {
  id: string;
  fileId: string;
  startTime: number;
  endTime: number;
  trackPosition: number;
  duration: number;
  file: MediaFile;
  trackIndex?: number;
  isAudioOverlay?: boolean;
}

interface MultiTrackTimelineProps {
  files: MediaFile[];
  segments: TimelineSegment[];
  onSegmentsChange: (segments: TimelineSegment[]) => void;
  onSegmentSelect: (segment: TimelineSegment | null) => void;
  selectedSegment: TimelineSegment | null;
  numTracks?: number;
}

const SEGMENT_COLORS = [
  { bg: '#E53935', dark: '#C62828' },
  { bg: '#1E88E5', dark: '#1565C0' },
  { bg: '#43A047', dark: '#2E7D32' },
  { bg: '#FB8C00', dark: '#EF6C00' },
  { bg: '#8E24AA', dark: '#6A1B9A' },
  { bg: '#00ACC1', dark: '#00838F' },
  { bg: '#F4511E', dark: '#D84315' },
  { bg: '#7CB342', dark: '#558B2F' },
  { bg: '#FFB300', dark: '#FF8F00' },
  { bg: '#5E35B1', dark: '#4527A0' },
];

export default function MultiTrackTimeline({
  files,
  segments,
  onSegmentsChange,
  onSegmentSelect,
  selectedSegment,
  numTracks = 4,
}: MultiTrackTimelineProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedSegmentId, setDraggedSegmentId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartTrack, setDragStartTrack] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(0);

  const timelineRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [showSplitPreview, setShowSplitPreview] = useState(false);
  const [splitPreviewPosition, setSplitPreviewPosition] = useState({ x: 0, track: 0 });
  const [showSplitDialog, setShowSplitDialog] = useState(false);

  const [pendingSplit, setPendingSplit] = useState<{
    targetSegmentId: string;
    droppedSegmentId: string;
    droppedOriginalTrackIndex: number;
    droppedOriginalTrackPosition: number;
    splitTime: number;
  } | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);

  const TRACK_HEIGHT = 120;
  const TRACK_MARGIN = 10;

  const pixelsPerSecond = 50 * zoom;

  // Refs to prevent stale values during drag (fixes drift + glitch)
  const segmentsRef = useRef<TimelineSegment[]>(segments);
  const scrollLeftRef = useRef<number>(0);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  const getScrollLeft = () => timelineRef.current?.scrollLeft ?? scrollLeftRef.current ?? 0;

  const getSegmentColor = (fileId: string) => {
    const fileIndex = files.findIndex((f) => f.id === fileId);
    return SEGMENT_COLORS[fileIndex % SEGMENT_COLORS.length];
  };

  const totalDuration = segments.reduce((max, seg) => {
    return Math.max(max, (seg.trackPosition ?? 0) + (seg.duration ?? 0));
  }, 0);

  const handleSegmentMouseDown = (e: React.MouseEvent, segment: TimelineSegment) => {
    e.preventDefault();
    e.stopPropagation();
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = getScrollLeft();

    // IMPORTANT: clickX must be in CONTENT coordinates (add scrollLeft)
    const clickX = e.clientX - rect.left + scrollLeft;
    const clickY = e.clientY - rect.top;

    const segmentX = (segment.trackPosition ?? 0) * pixelsPerSecond;
    const segmentY = (segment.trackIndex ?? 0) * (TRACK_HEIGHT + TRACK_MARGIN);

    setIsDragging(true);
    setDraggedSegmentId(segment.id);
    setDragStartTrack(segment.trackIndex ?? 0);
    setDragStartPosition(segment.trackPosition ?? 0);
    setDragOffset({ x: clickX - segmentX, y: clickY - segmentY });
    onSegmentSelect(segment);
  };

  const checkForSplit = (draggedSeg: TimelineSegment, mouseXContent: number, mouseY: number) => {
    const timePosition = mouseXContent / pixelsPerSecond;
    const trackIndex = Math.floor(mouseY / (TRACK_HEIGHT + TRACK_MARGIN));

    const curr = segmentsRef.current;

    const targetSegment = curr.find(
      (seg) =>
        seg.id !== draggedSeg.id &&
        (seg.trackIndex ?? 0) === trackIndex &&
        timePosition > (seg.trackPosition ?? 0) &&
        timePosition < (seg.trackPosition ?? 0) + (seg.duration ?? 0)
    );

    return targetSegment ? { segment: targetSegment, splitTime: timePosition, trackIndex } : null;
  };

  useEffect(() => {
    if (!isDragging || !draggedSegmentId || !timelineRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = getScrollLeft();

      // CONTENT coords:
      const xContent = e.clientX - rect.left + scrollLeft - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;

      const newPosition = Math.max(0, xContent / pixelsPerSecond);
      const newTrackIndex = Math.max(
        0,
        Math.min(numTracks - 1, Math.floor(y / (TRACK_HEIGHT + TRACK_MARGIN)))
      );

      const curr = segmentsRef.current;
      const draggedSeg = curr.find((s) => s.id === draggedSegmentId);

      if (draggedSeg) {
        const splitInfo = checkForSplit(draggedSeg, xContent, y);
        if (splitInfo) {
          setShowSplitPreview(true);
          setSplitPreviewPosition({ x: splitInfo.splitTime * pixelsPerSecond, track: splitInfo.trackIndex });
        } else {
          setShowSplitPreview(false);
        }

        const updated = curr.map((seg) =>
          seg.id === draggedSegmentId ? { ...seg, trackPosition: newPosition, trackIndex: newTrackIndex } : seg
        );

        segmentsRef.current = updated;
        onSegmentsChange(updated);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = getScrollLeft();

      const xContent = e.clientX - rect.left + scrollLeft - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;

      const curr = segmentsRef.current;
      const draggedSeg = curr.find((s) => s.id === draggedSegmentId);

      if (draggedSeg) {
        const splitInfo = checkForSplit(draggedSeg, xContent, y);
        if (splitInfo) {
          setPendingSplit({
            targetSegmentId: splitInfo.segment.id,
            droppedSegmentId: draggedSeg.id,
            droppedOriginalTrackIndex: dragStartTrack,
            droppedOriginalTrackPosition: dragStartPosition,
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
  }, [isDragging, draggedSegmentId, dragOffset, pixelsPerSecond, numTracks, dragStartTrack, dragStartPosition]);

  const shiftOnTrackFrom = (
    curr: TimelineSegment[],
    trackIndex: number,
    fromTime: number,
    delta: number,
    excludeIds: string[] = []
  ) => {
    return curr.map((seg) => {
      const segTrack = seg.trackIndex ?? 0;
      if (segTrack !== trackIndex) return seg;
      if (excludeIds.includes(seg.id)) return seg;

      if ((seg.trackPosition ?? 0) >= fromTime) {
        return { ...seg, trackPosition: (seg.trackPosition ?? 0) + delta };
      }
      return seg;
    });
  };

  const moveSegment = (curr: TimelineSegment[], id: string, patch: Partial<TimelineSegment>) =>
    curr.map((seg) => (seg.id === id ? { ...seg, ...patch } : seg));

  const handleSplitChoice = (choice: MergeChoice) => {
    if (!pendingSplit) return;

    const {
      targetSegmentId,
      droppedSegmentId,
      splitTime,
      droppedOriginalTrackIndex,
      droppedOriginalTrackPosition,
    } = pendingSplit;

    const curr = segmentsRef.current;
    const target = curr.find((s) => s.id === targetSegmentId);
    const dropped = curr.find((s) => s.id === droppedSegmentId);

    if (!dropped) {
      setShowSplitDialog(false);
      setPendingSplit(null);
      return;
    }

    if (choice === 'cancel') {
      const next = curr.map((seg) =>
        seg.id === droppedSegmentId
          ? { ...seg, trackIndex: droppedOriginalTrackIndex, trackPosition: droppedOriginalTrackPosition }
          : seg
      );
      segmentsRef.current = next;
      onSegmentsChange(next);
      setShowSplitDialog(false);
      setPendingSplit(null);
      return;
    }

    if (!target) {
      const next = curr.map((seg) =>
        seg.id === droppedSegmentId
          ? { ...seg, trackIndex: droppedOriginalTrackIndex, trackPosition: droppedOriginalTrackPosition }
          : seg
      );
      segmentsRef.current = next;
      onSegmentsChange(next);
      setShowSplitDialog(false);
      setPendingSplit(null);
      return;
    }

    // Insert BEFORE target
    if (choice === 'play-front') {
      const track = target.trackIndex ?? 0;
      const insertAt = target.trackPosition ?? 0;
      const dur = dropped.duration ?? 0;

      let next = shiftOnTrackFrom(curr, track, insertAt, dur, [dropped.id]);
      next = moveSegment(next, dropped.id, { trackIndex: track, trackPosition: insertAt });

      segmentsRef.current = next;
      onSegmentsChange(next);
      setShowSplitDialog(false);
      setPendingSplit(null);
      return;
    }

    // Insert AFTER target
    if (choice === 'play-behind') {
      const track = target.trackIndex ?? 0;
      const insertAt = (target.trackPosition ?? 0) + (target.duration ?? 0);
      const dur = dropped.duration ?? 0;

      let next = shiftOnTrackFrom(curr, track, insertAt, dur, [dropped.id]);
      next = moveSegment(next, dropped.id, { trackIndex: track, trackPosition: insertAt });

      segmentsRef.current = next;
      onSegmentsChange(next);
      setShowSplitDialog(false);
      setPendingSplit(null);
      return;
    }

    // Split & Insert
    if (choice === 'split-insert') {
      const splitPoint = splitTime - (target.trackPosition ?? 0);
      const splitTimeInFile = target.startTime + splitPoint;

      if (splitPoint <= 0.1 || splitPoint >= (target.duration ?? 0) - 0.1) {
        setShowSplitDialog(false);
        setPendingSplit(null);
        return;
      }

      const firstPart: TimelineSegment = {
        id: uuidv4(),
        fileId: target.fileId,
        startTime: target.startTime,
        endTime: splitTimeInFile,
        trackPosition: target.trackPosition,
        trackIndex: target.trackIndex ?? 0,
        duration: splitPoint,
        file: target.file,
      };

      const droppedMoved: TimelineSegment = {
        ...dropped,
        trackPosition: (target.trackPosition ?? 0) + splitPoint,
        trackIndex: target.trackIndex ?? 0,
      };

      const secondPart: TimelineSegment = {
        id: uuidv4(),
        fileId: target.fileId,
        startTime: splitTimeInFile,
        endTime: target.endTime,
        trackPosition: (target.trackPosition ?? 0) + splitPoint + (dropped.duration ?? 0),
        trackIndex: target.trackIndex ?? 0,
        duration: (target.duration ?? 0) - splitPoint,
        file: target.file,
      };

      const next = curr.filter((seg) => seg.id !== target.id && seg.id !== dropped.id).concat([firstPart, droppedMoved, secondPart]);
      segmentsRef.current = next;
      onSegmentsChange(next);
      setShowSplitDialog(false);
      setPendingSplit(null);
      return;
    }

    // Replace Segment
    if (choice === 'replace-segment') {
      const splitPoint = splitTime - (target.trackPosition ?? 0);
      const splitTimeInFile = target.startTime + splitPoint;
      const droppedDuration = dropped.duration ?? 0;

      const needsBefore = splitPoint > 0.1;
      const needsAfter = splitPoint + droppedDuration < (target.duration ?? 0) - 0.1;

      const newSegments: TimelineSegment[] = [];

      if (needsBefore) {
        newSegments.push({
          id: uuidv4(),
          fileId: target.fileId,
          startTime: target.startTime,
          endTime: splitTimeInFile,
          trackPosition: target.trackPosition,
          trackIndex: target.trackIndex ?? 0,
          duration: splitPoint,
          file: target.file,
        });
      }

      newSegments.push({
        ...dropped,
        trackPosition: (target.trackPosition ?? 0) + (needsBefore ? splitPoint : 0),
        trackIndex: target.trackIndex ?? 0,
      });

      if (needsAfter) {
        const afterStartTime = splitTimeInFile + droppedDuration;
        newSegments.push({
          id: uuidv4(),
          fileId: target.fileId,
          startTime: afterStartTime,
          endTime: target.endTime,
          trackPosition: (target.trackPosition ?? 0) + (needsBefore ? splitPoint : 0) + droppedDuration,
          trackIndex: target.trackIndex ?? 0,
          duration: target.endTime - afterStartTime,
          file: target.file,
        });
      }

      const next = curr.filter((seg) => seg.id !== target.id && seg.id !== dropped.id).concat(newSegments);
      segmentsRef.current = next;
      onSegmentsChange(next);
      setShowSplitDialog(false);
      setPendingSplit(null);
      return;
    }

    setShowSplitDialog(false);
    setPendingSplit(null);
  };

  const handleTimelineClick = () => {
    if (isDragging) return;
    onSegmentSelect(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (selectedSegment) {
        const mediaRef = selectedSegment.file.videoCodec ? videoPreviewRef : audioPreviewRef;
        mediaRef.current?.pause();
      }
    } else {
      setIsPlaying(true);
      if (selectedSegment) playSegment(selectedSegment);
    }
  };

  const playSegment = async (segment: TimelineSegment) => {
    try {
      const mediaUrl = `media-file://${encodeURIComponent(segment.file.path)}`;
      const mediaRef = segment.file.videoCodec ? videoPreviewRef : audioPreviewRef;

      if (mediaRef.current) {
        mediaRef.current.src = mediaUrl;
        mediaRef.current.currentTime = segment.startTime;
        await mediaRef.current.play();
      }
    } catch (error) {
      console.error('Failed to play segment:', error);
      setIsPlaying(false);
    }
  };

  return (
    <>
      {showSplitDialog && pendingSplit && (
        <SplitOverlayDialog
          droppedFileName={segments.find((s) => s.id === pendingSplit.droppedSegmentId)?.file.name ?? 'Dropped file'}
          targetFileName={segments.find((s) => s.id === pendingSplit.targetSegmentId)?.file.name ?? 'Target file'}
          onChoice={handleSplitChoice}
        />
      )}

      <div className="multi-track-timeline">
        <div className="multi-track-header">
          <h3>Timeline Arrangement</h3>
          <div className="multi-track-controls">
            <button
              onClick={handlePlayPause}
              className="primary"
              disabled={!selectedSegment}
              title={!selectedSegment ? 'Select a segment to preview' : ''}
            >
              {isPlaying ? 'Pause' : 'Play Selected'}
            </button>
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>Zoom Out</button>
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(3, zoom + 0.25))}>Zoom In</button>
          </div>
        </div>

        <video ref={videoPreviewRef} style={{ display: 'none' }} />
        <audio ref={audioPreviewRef} style={{ display: 'none' }} />

        <div
          ref={timelineRef}
          className="multi-track-container"
          onClick={handleTimelineClick}
          onScroll={(e) => {
            scrollLeftRef.current = e.currentTarget.scrollLeft;
          }}
        >
          <div
            className="multi-track-ruler"
            style={{ width: `${Math.max(totalDuration + 10, 60) * pixelsPerSecond}px` }}
          >
            {Array.from({ length: Math.ceil(totalDuration / 5) + 2 }).map((_, i) => {
              const time = i * 5;
              return (
                <div key={i} className="multi-track-ruler-mark" style={{ left: `${time * pixelsPerSecond}px` }}>
                  <span>{formatTime(time)}</span>
                </div>
              );
            })}
          </div>

          <div
            className="multi-track-tracks"
            style={{
              width: `${Math.max(totalDuration + 10, 60) * pixelsPerSecond}px`,
              height: `${numTracks * (TRACK_HEIGHT + TRACK_MARGIN)}px`,
            }}
          >
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

            {segments.map((segment) => {
              const colors = getSegmentColor(segment.fileId);
              return (
                <div
                  key={segment.id}
                  className={`multi-track-segment ${selectedSegment?.id === segment.id ? 'selected' : ''} ${
                    isDragging && draggedSegmentId === segment.id ? 'dragging' : ''
                  } ${segment.isAudioOverlay ? 'audio-overlay' : ''}`}
                  style={{
                    left: `${(segment.trackPosition ?? 0) * pixelsPerSecond}px`,
                    top: `${(segment.trackIndex ?? 0) * (TRACK_HEIGHT + TRACK_MARGIN)}px`,
                    width: `${Math.max((segment.duration ?? 0) * pixelsPerSecond, 40)}px`,
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
                    <div className="multi-track-segment-duration">Duration: {formatTime(segment.duration)}</div>
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
