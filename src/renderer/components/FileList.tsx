import { useState } from 'react';
import { MediaFile } from '../types';
import './FileList.css';

interface FileListProps {
  files: MediaFile[];
  selectedFile: MediaFile | null;
  onFileSelect: (file: MediaFile) => void;
  onFileRemove: (fileId: string) => void;
  onFilesReorder: (files: MediaFile[]) => void;
  onFilesAdded: (filePaths: string[]) => void;
}

export default function FileList({
  files,
  selectedFile,
  onFileSelect,
  onFileRemove,
  onFilesReorder,
  onFilesAdded,
}: FileListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAddFiles = async () => {
    const filePaths = await window.electronAPI.openFilesDialog();
    if (filePaths.length > 0) {
      onFilesAdded(filePaths);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null) {
      // External file drop
      const droppedFiles = Array.from(e.dataTransfer.files).map(f => f.path);
      if (droppedFiles.length > 0) {
        onFilesAdded(droppedFiles);
      }
    } else {
      // Internal reorder
      if (draggedIndex !== dropIndex) {
        const sortedFiles = [...files].sort((a, b) => a.order - b.order);
        const [draggedFile] = sortedFiles.splice(draggedIndex, 1);
        sortedFiles.splice(dropIndex, 0, draggedFile);
        
        const reorderedFiles = sortedFiles.map((f, idx) => ({
          ...f,
          order: idx,
        }));
        
        onFilesReorder(reorderedFiles);
      }
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const sortedFiles = [...files].sort((a, b) => a.order - b.order);

  return (
    <div className="file-list">
      <div className="file-list-header">
        <h2>Files</h2>
        <button onClick={handleAddFiles} className="primary">
          + Add Files
        </button>
      </div>
      
      <div 
        className="file-list-content"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const droppedFiles = Array.from(e.dataTransfer.files).map(f => f.path);
          if (droppedFiles.length > 0) {
            onFilesAdded(droppedFiles);
          }
        }}
      >
        {sortedFiles.length === 0 ? (
          <div className="file-list-empty">
            <p>Drag & drop files here</p>
            <p className="file-list-empty-hint">or click "Add Files"</p>
          </div>
        ) : (
          sortedFiles.map((file, index) => (
            <div
              key={file.id}
              className={`file-item ${selectedFile?.id === file.id ? 'selected' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
              draggable
              onClick={() => onFileSelect(file)}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="file-item-header">
                <div className="file-item-drag-handle">⋮⋮</div>
                <div className="file-item-info">
                  <div className="file-item-name" title={file.name}>
                    {file.name}
                  </div>
                  <div className="file-item-meta">
                    <span>{formatDuration(file.duration)}</span>
                    <span>•</span>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                </div>
                <button
                  className="file-item-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemove(file.id);
                  }}
                >
                  ×
                </button>
              </div>
              
              <div className="file-item-details">
                {file.videoCodec && (
                  <div className="file-item-codec">
                    VIDEO: {file.videoCodec} {file.width && `(${file.width}×${file.height})`}
                  </div>
                )}
                {file.audioCodec && (
                  <div className="file-item-codec">
                    AUDIO: {file.audioCodec}
                  </div>
                )}
                {file.startCut > 0 || file.endCut < file.duration ? (
                  <div className="file-item-trim">
                    TRIMMED: {formatDuration(file.startCut)} - {formatDuration(file.endCut)}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
