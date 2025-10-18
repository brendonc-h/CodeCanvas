import * as fs from 'fs/promises';
import * as path from 'path';
import { dbStorage } from './db-storage';
import { fileSync } from './file-sync';

export interface BackupData {
  projects: any[];
  files: any[];
  teams: any[];
  teamMembers: any[];
  gitRepositories: any[];
  gitCommits: any[];
  sharedTemplates: any[];
  templateRatings: any[];
  timestamp: string;
  version: string;
}

export class BackupService {
  private backupDir = path.join(process.cwd(), 'backups');

  async createBackup(userId: string, projectId?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `${userId}_${projectId || 'full'}_${timestamp}`;
    const backupPath = path.join(this.backupDir, `${backupId}.json`);

    // Ensure backup directory exists
    await fs.mkdir(this.backupDir, { recursive: true });

    const backupData: BackupData = {
      timestamp,
      version: '1.0',
      projects: [],
      files: [],
      teams: [],
      teamMembers: [],
      gitRepositories: [],
      gitCommits: [],
      sharedTemplates: [],
      templateRatings: [],
    };

    // Backup projects and related data
    if (projectId) {
      // Single project backup
      const project = await dbStorage.getProject(projectId);
      if (project && project.userId === userId) {
        backupData.projects.push(project);
        backupData.files = await dbStorage.getFilesByProjectId(projectId);
        backupData.gitRepositories = await dbStorage.getGitRepositoriesByProjectId(projectId);
        
        // Get git commits for repositories
        for (const repo of backupData.gitRepositories) {
          const commits = await dbStorage.getGitCommitsByRepositoryId(repo.id);
          backupData.gitCommits.push(...commits);
        }
      }
    } else {
      // Full user backup
      // Get user's projects
      const projects = await dbStorage.getProjectsByUserId(userId);
      backupData.projects = projects;
      
      // Get all files for user's projects
      for (const project of projects) {
        const files = await dbStorage.getFilesByProjectId(project.id);
        backupData.files.push(...files);
        
        const repos = await dbStorage.getGitRepositoriesByProjectId(project.id);
        backupData.gitRepositories.push(...repos);
        
        for (const repo of repos) {
          const commits = await dbStorage.getGitCommitsByRepositoryId(repo.id);
          backupData.gitCommits.push(...commits);
        }
      }

      // Get user's teams
      const teams = await dbStorage.getTeamsByUserId(userId);
      backupData.teams = teams;
      
      // Get team members for user's teams
      for (const team of teams) {
        const members = await dbStorage.getTeamMembers(team.id);
        backupData.teamMembers.push(...members);
      }

      // Get user's shared templates
      const templates = await dbStorage.getUserSettings(userId);
      // Note: We'll need to add a method to get templates by creator
      // For now, this is a placeholder
    }

    // Write backup file
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
    
    return backupId;
  }

  async restoreBackup(userId: string, backupId: string): Promise<void> {
    const backupPath = path.join(this.backupDir, `${backupId}.json`);
    
    // Read backup file
    const backupData: BackupData = JSON.parse(await fs.readFile(backupPath, 'utf-8'));
    
    // Validate backup ownership
    if (backupId.startsWith(`${userId}_`)) {
      throw new Error('Unauthorized to restore this backup');
    }

    // Restore teams first
    for (const team of backupData.teams) {
      try {
        await dbStorage.createTeam({
          name: team.name,
          description: team.description,
        });
      } catch (error) {
        // Team might already exist, skip
      }
    }

    // Restore team members
    for (const member of backupData.teamMembers) {
      try {
        await dbStorage.addTeamMember({
          teamId: member.teamId,
          userId: member.userId,
          role: member.role,
        });
      } catch (error) {
        // Member might already exist, skip
      }
    }

    // Restore projects
    for (const project of backupData.projects) {
      try {
        const restoredProject = await dbStorage.createProject({
          userId: project.userId,
          teamId: project.teamId,
          name: `${project.name} (Restored)`,
          template: project.template,
          description: project.description,
        });

        // Restore files
        for (const file of backupData.files.filter(f => f.projectId === project.id)) {
          await dbStorage.createFile({
            projectId: restoredProject.id,
            path: file.path,
            content: file.content,
          });
          await fileSync.writeFile(restoredProject.id, file.path, file.content);
        }

        // Restore git repositories
        for (const repo of backupData.gitRepositories.filter(r => r.projectId === project.id)) {
          const restoredRepo = await dbStorage.createGitRepository({
            projectId: restoredProject.id,
            name: repo.name,
            url: repo.url,
            provider: repo.provider,
            owner: repo.owner,
            repo: repo.repo,
            branch: repo.branch,
            isConnected: repo.isConnected,
          });

          // Restore git commits
          for (const commit of backupData.gitCommits.filter(c => c.repositoryId === repo.id)) {
            await dbStorage.createGitCommit({
              repositoryId: restoredRepo.id,
              userId: commit.userId,
              sha: commit.sha,
              message: commit.message,
              author: commit.author,
            });
          }
        }
      } catch (error) {
        console.error(`Failed to restore project ${project.name}:`, error);
      }
    }

    // Restore shared templates
    for (const template of backupData.sharedTemplates) {
      try {
        if (template.creatorId === userId) {
          await dbStorage.createSharedTemplate({
            name: template.name,
            description: template.description,
            template: template.template,
            files: template.files,
            creatorId: template.creatorId,
            isPublic: template.isPublic,
            tags: template.tags,
            downloads: template.downloads,
            rating: template.rating,
          });
        }
      } catch (error) {
        // Template might already exist, skip
      }
    }
  }

  async listBackups(userId: string): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter(file => file.startsWith(`${userId}_`))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }

  async deleteBackup(userId: string, backupId: string): Promise<void> {
    if (!backupId.startsWith(`${userId}_`)) {
      throw new Error('Unauthorized to delete this backup');
    }

    const backupPath = path.join(this.backupDir, `${backupId}.json`);
    await fs.unlink(backupPath);
  }

  // Automatic backup scheduler
  async scheduleAutomaticBackups(): Promise<void> {
    // Run daily backups for all users
    setInterval(async () => {
      try {
        // This would be implemented to backup all users periodically
        // For now, just log that it would run
        console.log('Automatic backup would run here');
      } catch (error) {
        console.error('Automatic backup failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }
}

export const backupService = new BackupService();
