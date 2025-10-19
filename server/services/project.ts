import { dbStorage as storage } from "../db-storage";
import { templateConfigs } from "@shared/schema";
import { fileSync } from "../file-sync";

export class ProjectService {
  static async createProject(userId: string, params: { name: string; template: string; teamId?: string; description?: string }): Promise<any> {
    const { name, template, teamId, description } = params;

    const templateConfig = templateConfigs[template as keyof typeof templateConfigs];
    if (!templateConfig) {
      throw new Error("Invalid template");
    }

    // If teamId provided, check if user is a member
    let projectTeamId = null;
    if (teamId) {
      const team = await storage.getTeam(teamId);
      if (!team) {
        throw new Error("Team not found");
      }
      const members = await storage.getTeamMembers(teamId);
      const isMember = members.some(m => m.userId === userId);
      if (!isMember) {
        throw new Error("Not a team member");
      }
      projectTeamId = teamId;
    }

    const project = await storage.createProject({
      userId,
      teamId: projectTeamId,
      name,
      template,
      description: description || templateConfig.description,
    });

    // Create template files in storage and on disk
    for (const [filePath, content] of Object.entries(templateConfig.files)) {
      await storage.createFile({
        projectId: project.id,
        path: filePath,
        content,
      });
      await fileSync.writeFile(project.id, filePath, content);
    }

    return project;
  }

  static async checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await storage.getProject(projectId);
    if (!project) return false;

    // Direct ownership
    if (project.userId === userId) return true;

    // Team membership
    if (project.teamId) {
      const members = await storage.getTeamMembers(project.teamId);
      return members.some(m => m.userId === userId);
    }

    return false;
  }
}
