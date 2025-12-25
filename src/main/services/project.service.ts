import * as fs from 'fs';

export interface ProjectData {
  version: string;
  files: Array<{
    id: string;
    path: string;
    startCut: number;
    endCut: number;
    order: number;
  }>;
  settings: any;
  exportHistory: Array<{
    timestamp: number;
    outputPath: string;
    type: 'cut' | 'merge';
  }>;
}

export class ProjectService {
  async saveProject(filePath: string, projectData: ProjectData): Promise<void> {
    const data = JSON.stringify(projectData, null, 2);
    fs.writeFileSync(filePath, data, 'utf-8');
  }

  async loadProject(filePath: string): Promise<ProjectData> {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}
