import { Router } from "express";
import { requireAuth } from "../auth";
import { backupService } from "../backup";

const router = Router();

// Backup routes
router.post("/", requireAuth, async (req, res) => {
  try {
    const { projectId } = req.body;
    const backupId = await backupService.createBackup(req.user!.id, projectId);
    res.json({ backupId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const backups = await backupService.listBackups(req.user!.id);
    res.json(backups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:backupId/restore", requireAuth, async (req, res) => {
  try {
    if (!req.params.backupId.startsWith(`${req.user!.id}_`)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await backupService.restoreBackup(req.user!.id, req.params.backupId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:backupId", requireAuth, async (req, res) => {
  try {
    if (!req.params.backupId.startsWith(`${req.user!.id}_`)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await backupService.deleteBackup(req.user!.id, req.params.backupId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
