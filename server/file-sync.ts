import * as fs from 'fs/promises';
import * as path from 'path';

const PROJECTS_ROOT = '/tmp/webide-projects';

export class FileSync {
  async ensureProjectDir(projectId: string): Promise<string> {
    const projectDir = path.join(PROJECTS_ROOT, projectId);
    await fs.mkdir(projectDir, { recursive: true });
    return projectDir;
  }

  async writeFile(projectId: string, filePath: string, content: string): Promise<void> {
    const projectDir = await this.ensureProjectDir(projectId);
    const fullPath = path.join(projectDir, filePath);
    
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async deleteFile(projectId: string, filePath: string): Promise<void> {
    const projectDir = path.join(PROJECTS_ROOT, projectId);
    const fullPath = path.join(projectDir, filePath);
    
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  async syncAllFiles(projectId: string, files: Array<{ path: string; content: string }>): Promise<void> {
    const projectDir = await this.ensureProjectDir(projectId);
    
    for (const file of files) {
      const fullPath = path.join(projectDir, file.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, file.content, 'utf-8');
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    const projectDir = path.join(PROJECTS_ROOT, projectId);
    try {
      await fs.rm(projectDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  }

  getProjectDir(projectId: string): string {
    return path.join(PROJECTS_ROOT, projectId);
  }
}

export const fileSync = new FileSync();
