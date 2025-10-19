import { Router } from "express";
import Joi from "joi";
import { requireAuth } from "../auth";
import { dbStorage as storage } from "../db-storage";
import { gitManager } from "../git-manager";

const router = Router();

// Input validation schemas
const gitCommitSchema = Joi.object({
  message: Joi.string().min(1).max(500).required(),
  files: Joi.array().items(Joi.string()).optional(),
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

// Git routes
router.get("/:id/git", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const repos = await storage.getGitRepositoriesByProjectId(req.params.id);
    res.json(repos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/git/init", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await gitManager.initRepository(req.params.id);

    // Create repository record
    const repo = await storage.createGitRepository({
      projectId: req.params.id,
      name: `${project.name}-repo`,
      provider: 'local',
    });

    res.json(repo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/git/commit", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { message, files = ['.'] } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Commit message required" });
    }

    await gitManager.addFiles(req.params.id, files);
    const result = await gitManager.commit(req.params.id, message);

    // Store commit record
    const repos = await storage.getGitRepositoriesByProjectId(req.params.id);
    if (repos.length > 0) {
      await storage.createGitCommit({
        repositoryId: repos[0].id,
        userId: req.user!.id,
        sha: result.split(' ')[0], // Extract commit hash
        message,
        author: req.user!.username,
      });
    }

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/git/status", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const status = await gitManager.getStatus(req.params.id);
    res.json({ status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/git/log", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const log = await gitManager.getLog(req.params.id);
    res.json({ log });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/git/branches", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const branches = await gitManager.getBranches(req.params.id);
    const current = await gitManager.getCurrentBranch(req.params.id);
    res.json({ branches, current });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/git/branch", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Branch name required" });
    }

    await gitManager.createBranch(req.params.id, name);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/git/checkout", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { branch } = req.body;
    if (!branch) {
      return res.status(400).json({ error: "Branch name required" });
    }

    await gitManager.switchBranch(req.params.id, branch);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
