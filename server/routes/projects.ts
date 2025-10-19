import { Router } from "express";
import Joi from "joi";
import { requireAuth } from "../auth";
import { dbStorage as storage } from "../db-storage";
import { templateConfigs } from "@shared/schema";
import { fileSync } from "../file-sync";

const router = Router();

// Input validation schemas
const projectSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  template: Joi.string().required(),
  teamId: Joi.string().uuid().optional(),
});

// Helper function to check project access (user ownership or team membership)
async function checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
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

// Project routes
router.get("/", requireAuth, async (req, res) => {
  try {
    const projects = await storage.getProjectsByUserId(req.user!.id);
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    // Check ownership
    if (project.userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { error, value } = projectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, template, teamId } = value;

    if (!name || !template) {
      return res.status(400).json({ error: "Name and template required" });
    }

    const templateConfig = templateConfigs[template as keyof typeof templateConfigs];
    if (!templateConfig) {
      return res.status(400).json({ error: "Invalid template" });
    }

    // If teamId provided, check if user is a member
    let projectTeamId = null;
    if (teamId) {
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(400).json({ error: "Team not found" });
      }
      const members = await storage.getTeamMembers(teamId);
      const isMember = members.some(m => m.userId === req.user!.id);
      if (!isMember) {
        return res.status(403).json({ error: "Not a team member" });
      }
      projectTeamId = teamId;
    }

    const project = await storage.createProject({
      userId: req.user!.id,
      teamId: projectTeamId,
      name,
      template,
      description: templateConfig.description,
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

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    // Check ownership
    if (project.userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await storage.deleteProject(req.params.id);
    await fileSync.deleteProject(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/sandbox", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || project.userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const sandbox = await storage.getSandboxByProjectId(req.params.id);
    if (!sandbox) {
      return res.json({ status: "not_running" });
    }

    res.json({
      status: sandbox.status,
      port: sandbox.port,
      containerId: sandbox.containerId,
      lastActivity: sandbox.lastActivity,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
