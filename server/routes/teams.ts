import { Router } from "express";
import Joi from "joi";
import { requireAuth } from "../auth";
import { dbStorage as storage } from "../db-storage";

const router = Router();

// Input validation schemas
const teamSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
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

// Team routes
router.get("/", requireAuth, async (req, res) => {
  try {
    const teams = await storage.getTeamsByUserId(req.user!.id);
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Team name required" });
    }

    const team = await storage.createTeam({
      name,
      description,
    });

    // Add creator as admin
    await storage.addTeamMember({
      teamId: team.id,
      userId: req.user!.id,
      role: "admin",
    });

    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const team = await storage.getTeam(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Check if user is a member
    const members = await storage.getTeamMembers(team.id);
    const isMember = members.some(m => m.userId === req.user!.id);
    if (!isMember) {
      return res.status(403).json({ error: "Not a team member" });
    }

    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const team = await storage.getTeam(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Check if user is admin
    const members = await storage.getTeamMembers(team.id);
    const member = members.find(m => m.userId === req.user!.id);
    if (!member || member.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const updatedTeam = await storage.updateTeam(req.params.id, req.body);
    res.json(updatedTeam);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const team = await storage.getTeam(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Check if user is admin
    const members = await storage.getTeamMembers(team.id);
    const member = members.find(m => m.userId === req.user!.id);
    if (!member || member.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    await storage.deleteTeam(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Team member routes
router.get("/:id/members", requireAuth, async (req, res) => {
  try {
    const team = await storage.getTeam(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Check if user is a member
    const members = await storage.getTeamMembers(team.id);
    const isMember = members.some(m => m.userId === req.user!.id);
    if (!isMember) {
      return res.status(403).json({ error: "Not a team member" });
    }

    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/members", requireAuth, async (req, res) => {
  try {
    const team = await storage.getTeam(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Check if user is admin
    const members = await storage.getTeamMembers(team.id);
    const member = members.find(m => m.userId === req.user!.id);
    if (!member || member.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { userId, role = "member" } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const newMember = await storage.addTeamMember({
      teamId: req.params.id,
      userId,
      role,
    });

    res.json(newMember);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id/members/:userId", requireAuth, async (req, res) => {
  try {
    const team = await storage.getTeam(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Check if user is admin
    const members = await storage.getTeamMembers(team.id);
    const member = members.find(m => m.userId === req.user!.id);
    if (!member || member.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ error: "Role required" });
    }

    const updatedMember = await storage.updateTeamMember(req.params.id, req.params.userId, role);
    res.json(updatedMember);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id/members/:userId", requireAuth, async (req, res) => {
  try {
    const team = await storage.getTeam(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Check if user is admin
    const members = await storage.getTeamMembers(team.id);
    const member = members.find(m => m.userId === req.user!.id);
    if (!member || member.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    await storage.removeTeamMember(req.params.id, req.params.userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
