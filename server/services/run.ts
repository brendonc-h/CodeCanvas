import { dbStorage as storage } from "../db-storage";
import { dockerManager } from "../docker-manager";
import { fileSync } from "../file-sync";

export class RunService {
  static async runCommand(userId: string, projectId: string, command: string[]): Promise<{ sandboxId: string; port?: number }> {
    // Check project ownership
    const project = await storage.getProject(projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Forbidden");
    }

    // Kill any existing sandbox for this user (1 per user limit)
    const existingSandbox = await storage.getSandboxByUserId(userId);
    if (existingSandbox && existingSandbox.projectId !== projectId) {
      if (existingSandbox.containerId) {
        await dockerManager.stopContainer(existingSandbox.containerId);
      }
      await storage.deleteSandbox(existingSandbox.id);
    }

    // Check if sandbox exists for this project
    let sandbox = await storage.getSandboxByProjectId(projectId);

    if (!sandbox) {
      // Ensure files are synced to disk
      const files = await storage.getFilesByProjectId(projectId);
      await fileSync.syncAllFiles(projectId, files.map(f => ({ path: f.path, content: f.content })));

      const projectDir = fileSync.getProjectDir(projectId);

      // Create Docker container
      const { containerId, port } = await dockerManager.createSandbox({
        projectId,
        userId,
        workingDir: projectDir,
        // Resource limits are now configured via environment variables
      });

      sandbox = await storage.createSandbox({
        projectId,
        userId,
        containerId,
        status: "running",
        port,
        lastActivity: new Date(),
      });
    }

    // Execute command in container
    if (sandbox.containerId) {
      await dockerManager.execCommand(
        sandbox.containerId,
        command,
        (output) => {
          console.log(output);
        },
        (error) => {
          console.error(error);
        }
      );

      await storage.updateSandbox(sandbox.id, {
        lastActivity: new Date(),
      });
    }

    return { sandboxId: sandbox.id, port: sandbox.port ?? undefined };
  }

  static async getResourceUsage(projectId: string, userId: string): Promise<any> {
    const project = await storage.getProject(projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Forbidden");
    }

    const usage = await storage.getResourceUsageByProjectId(projectId);
    return usage;
  }
}
