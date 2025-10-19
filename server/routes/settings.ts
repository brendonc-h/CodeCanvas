import { Router } from "express";
import { requireAuth } from "../auth";
import { dbStorage as storage } from "../db-storage";

const router = Router();

// User Settings routes
router.get("/", requireAuth, async (req, res) => {
  try {
    const settings = await storage.getUserSettings(req.user!.id);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) {
      return res.status(400).json({ error: "Setting key required" });
    }

    const setting = await storage.setUserSetting(req.user!.id, key, value);
    res.json(setting);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:key", requireAuth, async (req, res) => {
  try {
    await storage.deleteUserSetting(req.user!.id, req.params.key);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
