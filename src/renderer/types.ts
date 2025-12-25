export interface MediaFile {
  id: string;
  path: string;
  name: string;
  duration: number;
  codec: string;
  videoCodec?: string;
  audioCodec?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  size: number;
  startCut: number;
  endCut: number;
  order: number;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  defaultOutputFolder: string;
  autoSave: boolean;
  recentProjects: string[];
}

export interface ExportHistoryItem {
  id: string;
  timestamp: number;
  outputPath: string;
  type: 'cut' | 'merge';
}

export interface UndoState {
  type: 'cut' | 'reorder';
  fileId?: string;
  startCut?: number;
  endCut?: number;
  files?: MediaFile[];
}
