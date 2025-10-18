import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { dbStorage } from './db-storage';

const execAsync = promisify(exec);

export interface GitRepositoryInfo {
  id: string;
  projectId: string;
  name: string;
  url?: string;
  branch: string;
}

export class GitManager {
  private getRepoPath(projectId: string): string {
    return path.join(process.cwd(), 'tmp', 'projects', projectId);
  }

  async initRepository(projectId: string): Promise<void> {
    const repoPath = this.getRepoPath(projectId);

    try {
      await execAsync('git init', { cwd: repoPath });
      await execAsync('git config user.name "WebIDE"', { cwd: repoPath });
      await execAsync('git config user.email "webide@localhost"', { cwd: repoPath });
    } catch (error) {
      throw new Error(`Failed to initialize Git repository: ${error}`);
    }
  }

  async addFiles(projectId: string, files: string[] = ['.']): Promise<void> {
    const repoPath = this.getRepoPath(projectId);

    try {
      await execAsync(`git add ${files.join(' ')}`, { cwd: repoPath });
    } catch (error) {
      throw new Error(`Failed to add files: ${error}`);
    }
  }

  async commit(projectId: string, message: string, author?: string): Promise<string> {
    const repoPath = this.getRepoPath(projectId);

    try {
      const authorConfig = author ? `--author="${author}"` : '';
      const { stdout } = await execAsync(`git commit -m "${message}" ${authorConfig}`, { cwd: repoPath });
      return stdout;
    } catch (error) {
      throw new Error(`Failed to commit: ${error}`);
    }
  }

  async getStatus(projectId: string): Promise<string> {
    const repoPath = this.getRepoPath(projectId);

    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: repoPath });
      return stdout;
    } catch (error) {
      throw new Error(`Failed to get status: ${error}`);
    }
  }

  async getLog(projectId: string, limit = 10): Promise<string> {
    const repoPath = this.getRepoPath(projectId);

    try {
      const { stdout } = await execAsync(`git log --oneline -${limit}`, { cwd: repoPath });
      return stdout;
    } catch (error) {
      throw new Error(`Failed to get log: ${error}`);
    }
  }

  async createBranch(projectId: string, branchName: string): Promise<void> {
    const repoPath = this.getRepoPath(projectId);

    try {
      await execAsync(`git checkout -b ${branchName}`, { cwd: repoPath });
    } catch (error) {
      throw new Error(`Failed to create branch: ${error}`);
    }
  }

  async switchBranch(projectId: string, branchName: string): Promise<void> {
    const repoPath = this.getRepoPath(projectId);

    try {
      await execAsync(`git checkout ${branchName}`, { cwd: repoPath });
    } catch (error) {
      throw new Error(`Failed to switch branch: ${error}`);
    }
  }

  async getBranches(projectId: string): Promise<string[]> {
    const repoPath = this.getRepoPath(projectId);

    try {
      const { stdout } = await execAsync('git branch --format="%(refname:short)"', { cwd: repoPath });
      return stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
      throw new Error(`Failed to get branches: ${error}`);
    }
  }

  async push(projectId: string, remote = 'origin', branch?: string): Promise<void> {
    const repoPath = this.getRepoPath(projectId);

    try {
      const branchName = branch || await this.getCurrentBranch(projectId);
      await execAsync(`git push ${remote} ${branchName}`, { cwd: repoPath });
    } catch (error) {
      throw new Error(`Failed to push: ${error}`);
    }
  }

  async pull(projectId: string, remote = 'origin', branch?: string): Promise<void> {
    const repoPath = this.getRepoPath(projectId);

    try {
      const branchName = branch || await this.getCurrentBranch(projectId);
      await execAsync(`git pull ${remote} ${branchName}`, { cwd: repoPath });
    } catch (error) {
      throw new Error(`Failed to pull: ${error}`);
    }
  }

  async addRemote(projectId: string, name: string, url: string): Promise<void> {
    const repoPath = this.getRepoPath(projectId);

    try {
      await execAsync(`git remote add ${name} ${url}`, { cwd: repoPath });
    } catch (error) {
      throw new Error(`Failed to add remote: ${error}`);
    }
  }

  async getCurrentBranch(projectId: string): Promise<string> {
    const repoPath = this.getRepoPath(projectId);

    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: repoPath });
      return stdout.trim();
    } catch (error) {
      return 'main'; // fallback
    }
  }

  async isInitialized(projectId: string): Promise<boolean> {
    const repoPath = this.getRepoPath(projectId);

    try {
      await fs.access(path.join(repoPath, '.git'));
      return true;
    } catch {
      return false;
    }
  }
}

export const gitManager = new GitManager();
